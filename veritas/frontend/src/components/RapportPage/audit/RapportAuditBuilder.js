import { useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  saveMonitoringDocument,
  updateMonitoringDocument
} from "../../../api/monitoringDocuments";
import { useAppGeneralSettings, useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { replaceOrUploadReportHtmlToClientVault } from "../../../utils/uploadReportToClientVault";
import { exportBrandedReportHtmlFromElement } from "../exportBrandedReportHtmlFromElement";
import { REPORT_TYPE_IDS } from "../reportTypeConstants";
import ConfirmModal from "../../Misc/ConfirmModal/ConfirmModal";
import cyberStyles from "../../CybersecuritePage/CybersecuritePage.module.css";
import shellStyles from "../RapportBuilderPlaceholder.module.css";
import formStyles from "../reportBuilderForm.module.css";
import ReportValidationLayout, {
  ReportPreviewBlock,
  reportValidationStyles as valStyles
} from "../ReportValidationLayout";
import InterventionSaveModal from "../intervention/InterventionSaveModal";
import { getAuditReportCopy } from "./auditReportI18n";
import {
  AUDIT_BUILDER_STEP_KEYS,
  AUDIT_FINDING_SEVERITIES,
  AUDIT_SUBSECTION_STATUSES
} from "./auditReportConstants";
import {
  buildAuditReportPeriod,
  buildDefaultAuditData,
  buildDefaultAuditSaveName,
  createActionItem,
  createFinding,
  createSectionImage,
  createSubsection,
  getAuditBuilderSteps,
  isDuplicateMonitoringSaveResult,
  mergeAuditData,
  serializeAuditSavePayload,
  validateAuditStep
} from "./auditReportModel";
import styles from "./RapportAuditBuilder.module.css";

const MAX_SUBSECTION_IMAGES = 8;
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

function Field({ label, children, full = false, required = false, hint = null }) {
  return (
    <label className={`${formStyles.field} ${full ? formStyles.formGridFull : ""}`.trim()}>
      <span className={formStyles.fieldLabel}>
        {label}
        {required ? <span className={formStyles.requiredMark} aria-hidden>*</span> : null}
      </span>
      {hint ? <span className={formStyles.fieldHint}>{hint}</span> : null}
      {children}
    </label>
  );
}

function Section({ title, hint, children, actions = null }) {
  return (
    <section className={formStyles.sectionCard}>
      <header className={formStyles.sectionHead}>
        <div className={actions ? formStyles.sectionHeadRow : undefined}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 className={formStyles.sectionTitle}>{title}</h3>
            {hint ? <p className={formStyles.sectionHint}>{hint}</p> : null}
          </div>
          {actions}
        </div>
      </header>
      {children}
    </section>
  );
}

export default function RapportAuditBuilder({
  copy: pageCopy,
  reportType,
  client,
  onBack,
  onChangeSubtype,
  subtypeId,
  initialData = null,
  documentId = null,
  documentName = "",
  initialVaultFileId = null,
  initialVisibleToClient = false
}) {
  const locale = useAppLocale();
  const { settings } = useAppGeneralSettings();
  const auditCopy = useMemo(
    () => getAuditReportCopy(pageCopy?.localeCode || locale),
    [pageCopy?.localeCode, locale]
  );
  const steps = useMemo(() => getAuditBuilderSteps(subtypeId, auditCopy), [subtypeId, auditCopy]);
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState(() => {
    const defaults = buildDefaultAuditData({
      client,
      subtypeId,
      organizationName: settings?.app_organization_name || "",
      organizationAddress: settings?.app_organization_address || "",
      authorName: settings?.app_default_author || "",
      copy: auditCopy
    });
    return mergeAuditData(defaults, initialData, auditCopy);
  });
  const [saveName, setSaveName] = useState(documentName || "");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(Boolean(initialVisibleToClient));
  const [vaultFileId, setVaultFileId] = useState(initialVaultFileId || null);
  const previewDocRef = useRef(null);

  const currentStep = steps[stepIndex] || steps[0];
  const isFirst = stepIndex <= 0;
  const isValidationStep = currentStep?.key === AUDIT_BUILDER_STEP_KEYS.VALIDATION;
  const clientLabel = client?.name || client?.nom || "client";
  const subtypeTitle = auditCopy.subtypes?.[formData.subtypeId || subtypeId]?.title || reportType?.title;
  const valCopy = auditCopy.validation || {};

  const severityLabel = severity =>
    severity === "info"
      ? auditCopy.severityInfo
      : severity === "watch"
        ? auditCopy.severityWatch
        : auditCopy.severityCritical;

  const priorityLabel = priority =>
    priority === "high"
      ? auditCopy.priorityHigh
      : priority === "low"
        ? auditCopy.priorityLow
        : auditCopy.priorityMedium;

  const patch = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const patchSection = (sectionKey, updater) => {
    setFormData(prev => ({
      ...prev,
      sections: (prev.sections || []).map(section =>
        section.key === sectionKey ? updater(section) : section
      )
    }));
  };

  const patchSubsection = (sectionKey, subsectionId, updater) => {
    patchSection(sectionKey, current => ({
      ...current,
      subsections: (current.subsections || []).map(sub =>
        sub.id === subsectionId ? updater(sub) : sub
      )
    }));
  };

  const statusLabel = status => {
    if (status === "ok") return auditCopy.statusOk;
    if (status === "watch") return auditCopy.statusWatch;
    if (status === "critical") return auditCopy.statusCritical;
    if (status === "na") return auditCopy.statusNa;
    return "";
  };

  const readFilesAsImages = files =>
    Promise.all(
      Array.from(files || []).map(
        file =>
          new Promise(resolve => {
            if (!file?.type?.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onload = () =>
              resolve(
                createSectionImage({
                  dataUrl: String(reader.result || ""),
                  name: file.name || ""
                })
              );
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then(list => list.filter(Boolean));

  const goNext = () => {
    if (!validateAuditStep(currentStep.key, formData)) {
      toast.error(auditCopy.alerts.stepInvalid);
      return;
    }
    setStepIndex(value => Math.min(steps.length - 1, value + 1));
  };

  const handleDownloadHtml = async () => {
    if (!validateAuditStep(AUDIT_BUILDER_STEP_KEYS.ACTION_PLAN, formData)) {
      toast.error(auditCopy.alerts.stepInvalid);
      return;
    }
    const resolvedName =
      saveName.trim() || buildDefaultAuditSaveName(clientLabel, subtypeTitle, auditCopy);
    if (!saveName.trim()) setSaveName(resolvedName);
    const fileName = `${resolvedName.replace(/[^\w\- ]+/g, "") || "rapport-audit"}.html`;
    try {
      if (!previewDocRef.current) throw new Error("preview missing");
      await exportBrandedReportHtmlFromElement(previewDocRef.current, {
        fileName,
        documentTitle: resolvedName
      });
    } catch (err) {
      console.warn("Audit HTML export failed:", err);
      toast.error(err?.message || auditCopy.alerts.htmlError || auditCopy.alerts.pdfError);
    }
  };

  const archiveAuditHtmlToVault = async ({ docName, reportPeriod }) => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId || !previewDocRef.current) return { skipped: true };
    try {
      const blob = await exportBrandedReportHtmlFromElement(previewDocRef.current, {
        asBlob: true,
        fileName: `${docName}.html`,
        documentTitle: docName
      });
      if (!blob) throw new Error("HTML generation failed");
      const uploaded = await replaceOrUploadReportHtmlToClientVault({
        existingFileId: vaultFileId,
        blob,
        fileName: docName,
        clientId,
        clientName: clientLabel,
        description: reportPeriod || "",
        visibleToClient: saveVisibleToClient
      });
      return { success: true, file: uploaded };
    } catch (err) {
      console.error("Archivage coffre audit:", err);
      return { success: false, error: err?.message };
    }
  };

  const openSaveModal = () => {
    if (!validateAuditStep(AUDIT_BUILDER_STEP_KEYS.ACTION_PLAN, formData)) {
      toast.error(auditCopy.alerts.stepInvalid);
      return;
    }
    const resolvedName =
      saveName.trim() || buildDefaultAuditSaveName(clientLabel, subtypeTitle, auditCopy);
    if (!saveName.trim()) setSaveName(resolvedName);
    if (!resolvedName.trim()) {
      toast.error(auditCopy.alerts.saveNameRequired);
      return;
    }
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    setShowSaveModal(false);
    handleSave(false);
  };

  const handleSave = async (forceOverwrite = false) => {
    const name = saveName.trim();
    if (!name) {
      toast.error(auditCopy.alerts.saveNameRequired);
      return;
    }
    setSaving(true);
    try {
      const { config, data } = serializeAuditSavePayload(client, formData, REPORT_TYPE_IDS.AUDIT);
      const configWithVault = {
        ...config,
        vaultFileId: vaultFileId || null,
        visibleToClient: Boolean(saveVisibleToClient)
      };
      const reportPeriod = buildAuditReportPeriod(formData);
      const result = documentId
        ? await updateMonitoringDocument(documentId, {
            name,
            client_name: clientLabel,
            report_period: reportPeriod,
            config: configWithVault,
            data
          })
        : await saveMonitoringDocument({
            name,
            client_name: clientLabel,
            report_period: reportPeriod,
            config: configWithVault,
            data,
            overwrite: forceOverwrite
          });
      if (result?.success) {
        const vault = await archiveAuditHtmlToVault({ docName: name, reportPeriod });
        if (vault?.success && vault.file?.id) {
          setVaultFileId(vault.file.id);
          const nextDocId = documentId || result.id;
          if (nextDocId) {
            await updateMonitoringDocument(nextDocId, {
              name,
              client_name: clientLabel,
              report_period: reportPeriod,
              config: {
                ...configWithVault,
                vaultFileId: vault.file.id
              },
              data
            });
          }
        }
        if (vault?.success === false) {
          toast.warning(auditCopy.alerts.vaultError);
        } else {
          toast.success(auditCopy.alerts.saveSuccess);
        }
        setShowSaveModal(false);
        setShowOverwriteConfirm(false);
        if (typeof onBack === "function") onBack();
      } else if (!documentId && !forceOverwrite && isDuplicateMonitoringSaveResult(result)) {
        setShowOverwriteConfirm(true);
      } else {
        toast.error(result?.message || result?.error || auditCopy.alerts.saveError);
      }
    } catch (err) {
      toast.error(err?.message || auditCopy.alerts.saveError);
    } finally {
      setSaving(false);
    }
  };

  const renderCover = () => (
    <Section title={auditCopy.steps?.cover || auditCopy.fields.documentTitle}>
      <div className={formStyles.formGrid}>
        <Field label={auditCopy.fields.documentTitle} required>
          <input className={formStyles.fieldInput} value={formData.documentTitle} onChange={e => patch("documentTitle", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.diffusion}>
          <input className={formStyles.fieldInput} value={formData.diffusion} onChange={e => patch("diffusion", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.createdAt} required>
          <input type="date" className={formStyles.fieldInput} value={formData.createdAt} onChange={e => patch("createdAt", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.authorName}>
          <input className={formStyles.fieldInput} value={formData.authorName} onChange={e => patch("authorName", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.authorRole}>
          <input className={formStyles.fieldInput} value={formData.authorRole} onChange={e => patch("authorRole", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.reviewers}>
          <input className={formStyles.fieldInput} value={formData.reviewers} onChange={e => patch("reviewers", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.companyName}>
          <input className={formStyles.fieldInput} value={formData.companyName} onChange={e => patch("companyName", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.companyAddress}>
          <input className={formStyles.fieldInput} value={formData.companyAddress} onChange={e => patch("companyAddress", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.confidentialityNote} full>
          <textarea className={formStyles.fieldTextarea} value={formData.confidentialityNote} onChange={e => patch("confidentialityNote", e.target.value)} />
        </Field>
      </div>
    </Section>
  );

  const renderClient = () => (
    <Section title={auditCopy.steps?.client || auditCopy.fields.clientName}>
      <div className={formStyles.formGrid}>
        <Field label={auditCopy.fields.clientName} required>
          <input className={formStyles.fieldInput} value={formData.clientName} onChange={e => patch("clientName", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.clientSiteName}>
          <input className={formStyles.fieldInput} value={formData.clientSiteName} onChange={e => patch("clientSiteName", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.clientAddress}>
          <input className={formStyles.fieldInput} value={formData.clientAddress} onChange={e => patch("clientAddress", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.clientNumber}>
          <input className={formStyles.fieldInput} value={formData.clientNumber} onChange={e => patch("clientNumber", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.contractNumber}>
          <input className={formStyles.fieldInput} value={formData.contractNumber} onChange={e => patch("contractNumber", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.contractStart}>
          <input type="date" className={formStyles.fieldInput} value={formData.contractStart} onChange={e => patch("contractStart", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.contractEnd}>
          <input type="date" className={formStyles.fieldInput} value={formData.contractEnd} onChange={e => patch("contractEnd", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.missionStart} required>
          <input type="date" className={formStyles.fieldInput} value={formData.missionStart} onChange={e => patch("missionStart", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.missionEnd}>
          <input type="date" className={formStyles.fieldInput} value={formData.missionEnd} onChange={e => patch("missionEnd", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.technicians}>
          <input className={formStyles.fieldInput} value={formData.technicians} onChange={e => patch("technicians", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.technicianRole}>
          <input className={formStyles.fieldInput} value={formData.technicianRole} onChange={e => patch("technicianRole", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.clientApprover}>
          <input className={formStyles.fieldInput} value={formData.clientApprover} onChange={e => patch("clientApprover", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.clientApproverRole}>
          <input className={formStyles.fieldInput} value={formData.clientApproverRole} onChange={e => patch("clientApproverRole", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.commercialReferent}>
          <input className={formStyles.fieldInput} value={formData.commercialReferent} onChange={e => patch("commercialReferent", e.target.value)} />
        </Field>
      </div>
    </Section>
  );

  const renderObject = () => (
    <Section title={auditCopy.steps?.object || auditCopy.fields.objectText}>
      <div className={formStyles.formGridSingle}>
        <Field label={auditCopy.fields.objectText} required>
          <textarea className={formStyles.fieldTextarea} rows={8} value={formData.objectText} onChange={e => patch("objectText", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.contextText}>
          <textarea className={formStyles.fieldTextarea} rows={6} value={formData.contextText} onChange={e => patch("contextText", e.target.value)} />
        </Field>
      </div>
    </Section>
  );

  const renderSections = () => (
    <div className={formStyles.formStack}>
      {(formData.sections || []).map(section => {
        const sectionTitle =
          section.title || auditCopy.sectionTitles?.[section.key] || section.key;
        const subsections = Array.isArray(section.subsections) ? section.subsections : [];
        return (
          <Section
            key={section.key}
            title={sectionTitle}
            hint={auditCopy.subsectionsHint}
            actions={
              <button
                type="button"
                className={formStyles.addBtn}
                onClick={() =>
                  patchSection(section.key, current => ({
                    ...current,
                    subsections: [
                      ...(current.subsections || []),
                      createSubsection({
                        title: auditCopy.fields.subsectionCustomTitle
                      })
                    ]
                  }))
                }
              >
                <Icon icon="mdi:plus" aria-hidden />
                {auditCopy.addSubsection}
              </button>
            }
          >
            <Field label={auditCopy.fields.sectionContent} hint={auditCopy.fields.sectionContentHint}>
              <textarea
                className={`${formStyles.fieldTextarea} ${styles.sectionOverview}`}
                rows={3}
                value={section.content}
                onChange={e =>
                  patchSection(section.key, current => ({ ...current, content: e.target.value }))
                }
              />
            </Field>

            <div className={styles.subsectionStack}>
              {subsections.map((sub, subIndex) => {
                const subTitle =
                  sub.title ||
                  auditCopy.subsectionTitles?.[sub.key] ||
                  `${auditCopy.fields.subsectionTitle} ${subIndex + 1}`;
                const images = Array.isArray(sub.images) ? sub.images : [];
                return (
                  <div key={sub.id} className={styles.subsectionBlock}>
                    <div className={styles.subsectionHead}>
                      <input
                        className={`${formStyles.fieldInput} ${styles.subsectionTitleInput}`}
                        value={sub.title}
                        onChange={e =>
                          patchSubsection(section.key, sub.id, current => ({
                            ...current,
                            title: e.target.value
                          }))
                        }
                        placeholder={subTitle}
                        aria-label={auditCopy.fields.subsectionTitle}
                      />
                      <div className={styles.statusToggle} role="group" aria-label={auditCopy.fields.subsectionStatus}>
                        {AUDIT_SUBSECTION_STATUSES.map(status => (
                          <button
                            key={status}
                            type="button"
                            className={`${styles.statusChip} ${
                              sub.status === status ? styles[`statusChip_${status}`] : ""
                            }`.trim()}
                            aria-pressed={sub.status === status}
                            onClick={() =>
                              patchSubsection(section.key, sub.id, current => ({
                                ...current,
                                status: current.status === status ? "" : status
                              }))
                            }
                          >
                            {statusLabel(status)}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={formStyles.iconBtn}
                        title={auditCopy.remove}
                        aria-label={auditCopy.remove}
                        onClick={() =>
                          patchSection(section.key, current => ({
                            ...current,
                            subsections: (current.subsections || []).filter(item => item.id !== sub.id)
                          }))
                        }
                      >
                        <Icon icon="mdi:close" aria-hidden />
                      </button>
                    </div>

                    <textarea
                      className={`${formStyles.fieldTextarea} ${styles.subsectionTextarea}`}
                      rows={5}
                      value={sub.content}
                      placeholder={auditCopy.fields.subsectionContent}
                      aria-label={auditCopy.fields.subsectionContent}
                      onChange={e =>
                        patchSubsection(section.key, sub.id, current => ({
                          ...current,
                          content: e.target.value
                        }))
                      }
                    />

                    <div className={styles.photoBlock}>
                      <div className={styles.photoBlockHead}>
                        <span className={formStyles.fieldLabel}>{auditCopy.fields.subsectionPhotos}</span>
                        <label className={formStyles.addBtn}>
                          <Icon icon="mdi:camera-outline" aria-hidden />
                          {auditCopy.addPhoto}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className={formStyles.srOnly}
                            disabled={images.length >= MAX_SUBSECTION_IMAGES}
                            onChange={async e => {
                              const files = e.target.files;
                              e.target.value = "";
                              const nextImages = await readFilesAsImages(files);
                              if (!nextImages.length) return;
                              patchSubsection(section.key, sub.id, current => ({
                                ...current,
                                images: [...(current.images || []), ...nextImages].slice(
                                  0,
                                  MAX_SUBSECTION_IMAGES
                                )
                              }));
                            }}
                          />
                        </label>
                      </div>
                      {images.length ? (
                        <div className={styles.photoGrid}>
                          {images.map(photo => (
                            <div key={photo.id} className={styles.photoTile}>
                              <img src={photo.dataUrl} alt={photo.caption || photo.name || subTitle} />
                              <input
                                className={styles.photoCaption}
                                value={photo.caption || ""}
                                placeholder={auditCopy.fields.photoCaption}
                                aria-label={auditCopy.fields.photoCaption}
                                onChange={e =>
                                  patchSubsection(section.key, sub.id, current => ({
                                    ...current,
                                    images: (current.images || []).map(item =>
                                      item.id === photo.id
                                        ? { ...item, caption: e.target.value }
                                        : item
                                    )
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className={styles.photoRemove}
                                aria-label={auditCopy.removePhoto}
                                onClick={() =>
                                  patchSubsection(section.key, sub.id, current => ({
                                    ...current,
                                    images: (current.images || []).filter(item => item.id !== photo.id)
                                  }))
                                }
                              >
                                <Icon icon="mdi:close" aria-hidden />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.findingsBlock}>
              <div className={styles.findingsHead}>
                <h4 className={styles.findingsTitle}>{auditCopy.findingsHeading}</h4>
                <button
                  type="button"
                  className={formStyles.addBtn}
                  onClick={() =>
                    patchSection(section.key, current => ({
                      ...current,
                      findings: [...(current.findings || []), createFinding()]
                    }))
                  }
                >
                  <Icon icon="mdi:plus" aria-hidden />
                  {auditCopy.addFinding}
                </button>
              </div>
              <div className={formStyles.listStack}>
                {(section.findings || []).map((finding, findingIndex) => (
                  <div key={finding.id} className={styles.findingCard}>
                    <div className={styles.findingCardTop}>
                      <input
                        className={formStyles.fieldInput}
                        placeholder={auditCopy.fields.findingTitle}
                        value={finding.title}
                        onChange={e =>
                          patchSection(section.key, current => ({
                            ...current,
                            findings: current.findings.map((item, index) =>
                              index === findingIndex ? { ...item, title: e.target.value } : item
                            )
                          }))
                        }
                      />
                      <select
                        className={formStyles.fieldSelect}
                        value={finding.severity}
                        aria-label={auditCopy.fields.findingSeverity}
                        onChange={e =>
                          patchSection(section.key, current => ({
                            ...current,
                            findings: current.findings.map((item, index) =>
                              index === findingIndex ? { ...item, severity: e.target.value } : item
                            )
                          }))
                        }
                      >
                        {AUDIT_FINDING_SEVERITIES.map(severity => (
                          <option key={severity} value={severity}>
                            {severity === "info"
                              ? auditCopy.severityInfo
                              : severity === "watch"
                                ? auditCopy.severityWatch
                                : auditCopy.severityCritical}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={formStyles.iconBtn}
                        title={auditCopy.remove}
                        onClick={() =>
                          patchSection(section.key, current => ({
                            ...current,
                            findings: current.findings.filter((_, index) => index !== findingIndex)
                          }))
                        }
                      >
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                    <textarea
                      className={formStyles.fieldTextarea}
                      placeholder={auditCopy.fields.findingDetail}
                      rows={3}
                      value={finding.detail}
                      onChange={e =>
                        patchSection(section.key, current => ({
                          ...current,
                          findings: current.findings.map((item, index) =>
                            index === findingIndex ? { ...item, detail: e.target.value } : item
                          )
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        );
      })}
    </div>
  );

  const renderSynthesis = () => (
    <Section title={auditCopy.steps?.synthesis || auditCopy.fields.synthesis}>
      <div className={formStyles.formGridSingle}>
        <Field label={auditCopy.fields.synthesis} required>
          <textarea className={formStyles.fieldTextarea} rows={8} value={formData.synthesis} onChange={e => patch("synthesis", e.target.value)} />
        </Field>
        <Field label={auditCopy.fields.questionsAnswers}>
          <textarea className={formStyles.fieldTextarea} rows={6} value={formData.questionsAnswers} onChange={e => patch("questionsAnswers", e.target.value)} />
        </Field>
      </div>
    </Section>
  );

  const renderActionPlan = () => (
    <Section
      title={
        <>
          {auditCopy.steps?.actionPlan || auditCopy.fields.actionTitle}
          <span className={formStyles.requiredMark} aria-hidden>*</span>
        </>
      }
      actions={
        <button
          type="button"
          className={formStyles.addBtn}
          onClick={() => setFormData(prev => ({ ...prev, actionPlan: [...(prev.actionPlan || []), createActionItem()] }))}
        >
          <Icon icon="mdi:plus" aria-hidden />
          {auditCopy.addAction}
        </button>
      }
    >
      <div className={formStyles.listStack}>
        {(formData.actionPlan || []).map((item, index) => (
          <div key={item.id} className={formStyles.actionRow}>
            <input
              className={formStyles.fieldInput}
              placeholder={`${auditCopy.fields.actionTitle} *`}
              aria-label={`${auditCopy.fields.actionTitle} *`}
              value={item.title}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  actionPlan: prev.actionPlan.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, title: e.target.value } : row
                  )
                }))
              }
            />
            <select
              className={formStyles.fieldSelect}
              value={item.priority}
              aria-label={auditCopy.fields.actionPriority}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  actionPlan: prev.actionPlan.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, priority: e.target.value } : row
                  )
                }))
              }
            >
              <option value="low">{auditCopy.priorityLow}</option>
              <option value="medium">{auditCopy.priorityMedium}</option>
              <option value="high">{auditCopy.priorityHigh}</option>
            </select>
            <input
              className={formStyles.fieldInput}
              placeholder={auditCopy.fields.actionOwner}
              value={item.owner}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  actionPlan: prev.actionPlan.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, owner: e.target.value } : row
                  )
                }))
              }
            />
            <input
              type="date"
              className={formStyles.fieldInput}
              value={item.dueDate}
              aria-label={auditCopy.fields.actionDue}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  actionPlan: prev.actionPlan.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, dueDate: e.target.value } : row
                  )
                }))
              }
            />
            <button
              type="button"
              className={formStyles.iconBtn}
              title={auditCopy.remove}
              onClick={() =>
                setFormData(prev => ({
                  ...prev,
                  actionPlan: prev.actionPlan.filter((_, rowIndex) => rowIndex !== index)
                }))
              }
            >
              <Icon icon="mdi:delete-outline" />
            </button>
            <textarea
              className={`${formStyles.fieldTextarea} ${formStyles.rowDetail}`}
              placeholder={auditCopy.fields.actionDetail}
              rows={2}
              value={item.detail}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  actionPlan: prev.actionPlan.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, detail: e.target.value } : row
                  )
                }))
              }
            />
          </div>
        ))}
      </div>
    </Section>
  );

  const renderValidation = () => {
    const actions = (formData.actionPlan || []).filter(item => String(item?.title || "").trim());
    return (
      <ReportValidationLayout
        previewRef={previewDocRef}
        clientName={formData.clientName || clientLabel}
        periodLabel={buildAuditReportPeriod(formData)}
        reportType="audit"
        reportLabel={valCopy.reportLabel || subtypeTitle}
        actionsTitle={valCopy.previewTitle}
        saveNameLabel={valCopy.saveNameLabel}
        saveName={saveName}
        onSaveNameChange={setSaveName}
        downloadLabel={valCopy.downloadHtml}
        saveLabel={valCopy.saveLibrary}
        modifyLabel={valCopy.modify}
        saving={saving}
        onDownload={handleDownloadHtml}
        onSave={openSaveModal}
        onModify={() => setStepIndex(0)}
      >
        <ReportPreviewBlock title={auditCopy.steps.cover}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{auditCopy.fields.documentTitle}</strong> : {formData.documentTitle || "-"}
            </div>
            <div>
              <strong>{auditCopy.fields.diffusion}</strong> : {formData.diffusion || "-"}
            </div>
            <div>
              <strong>{auditCopy.fields.createdAt}</strong> : {formData.createdAt || "-"}
            </div>
            <div>
              <strong>{auditCopy.fields.authorName}</strong> : {formData.authorName || "-"}
              {formData.authorRole ? ` · ${formData.authorRole}` : ""}
            </div>
            <div>
              <strong>{auditCopy.fields.companyName}</strong> : {formData.companyName || "-"}
            </div>
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={auditCopy.steps.client}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{auditCopy.fields.clientName}</strong> : {formData.clientName || "-"}
            </div>
            <div>
              <strong>{auditCopy.fields.clientSiteName}</strong> : {formData.clientSiteName || "-"}
            </div>
            <div>
              <strong>{auditCopy.fields.clientAddress}</strong> : {formData.clientAddress || "-"}
            </div>
            <div>
              <strong>{auditCopy.fields.missionStart}</strong> : {formData.missionStart || "-"}
              {formData.missionEnd ? ` → ${formData.missionEnd}` : ""}
            </div>
            <div>
              <strong>{auditCopy.fields.technicians}</strong> : {formData.technicians || "-"}
            </div>
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={auditCopy.steps.object}>
          <div className={valStyles.previewBox}>
            <p className={valStyles.previewText}>{formData.objectText || "-"}</p>
            {formData.contextText ? <p className={valStyles.previewText}>{formData.contextText}</p> : null}
          </div>
        </ReportPreviewBlock>

        {(formData.sections || []).map(section => {
          const findings = (section.findings || []).filter(f => String(f?.title || "").trim());
          const subsections = (section.subsections || []).filter(
            sub =>
              String(sub?.content || "").trim() ||
              String(sub?.title || "").trim() ||
              (Array.isArray(sub?.images) && sub.images.length > 0)
          );
          if (!String(section.content || "").trim() && !findings.length && !subsections.length) {
            return null;
          }
          return (
            <ReportPreviewBlock key={section.key} title={section.title}>
              <div className={valStyles.previewBox}>
                {section.content ? <p className={valStyles.previewText}>{section.content}</p> : null}
                {subsections.map(sub => (
                  <div key={sub.id} className={styles.previewSubsection}>
                    <div className={styles.previewSubsectionTitle}>
                      <strong>
                        {sub.title || auditCopy.subsectionTitles?.[sub.key] || auditCopy.fields.subsectionTitle}
                      </strong>
                      {sub.status ? (
                        <span className={valStyles.severity}> · {statusLabel(sub.status)}</span>
                      ) : null}
                    </div>
                    {sub.content ? <p className={valStyles.previewText}>{sub.content}</p> : null}
                    {Array.isArray(sub.images) && sub.images.length ? (
                      <div className={styles.previewPhotoGrid}>
                        {sub.images.map(photo => (
                          <figure key={photo.id} className={styles.previewPhotoFigure}>
                            <img
                              src={photo.dataUrl}
                              alt={photo.caption || photo.name || ""}
                              className={valStyles.previewPhoto}
                            />
                            {photo.caption ? (
                              <figcaption className={styles.previewPhotoCaption}>{photo.caption}</figcaption>
                            ) : null}
                          </figure>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {findings.map(finding => (
                  <div key={finding.id} className={valStyles.findingRow}>
                    <div>
                      <strong>{finding.title}</strong>
                      <span className={valStyles.severity}> · {severityLabel(finding.severity)}</span>
                    </div>
                    {finding.detail ? <p className={valStyles.previewText}>{finding.detail}</p> : null}
                  </div>
                ))}
              </div>
            </ReportPreviewBlock>
          );
        })}

        <ReportPreviewBlock title={auditCopy.steps.synthesis}>
          <div className={valStyles.previewBox}>
            <p className={valStyles.previewText}>{formData.synthesis || "-"}</p>
            {formData.questionsAnswers ? (
              <>
                <strong>{auditCopy.fields.questionsAnswers}</strong>
                <p className={valStyles.previewText}>{formData.questionsAnswers}</p>
              </>
            ) : null}
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={auditCopy.steps.actionPlan}>
          <div className={valStyles.previewBox}>
            {actions.length ? (
              <ul className={valStyles.previewList}>
                {actions.map(item => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    {` · ${priorityLabel(item.priority)}`}
                    {item.owner ? ` · ${item.owner}` : ""}
                    {item.dueDate ? ` · ${item.dueDate}` : ""}
                    {item.detail ? (
                      <p className={valStyles.previewText}>{item.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={valStyles.previewText}>-</p>
            )}
          </div>
        </ReportPreviewBlock>
      </ReportValidationLayout>
    );
  };

  const renderStep = () => {
    switch (currentStep.key) {
      case AUDIT_BUILDER_STEP_KEYS.COVER:
        return renderCover();
      case AUDIT_BUILDER_STEP_KEYS.CLIENT:
        return renderClient();
      case AUDIT_BUILDER_STEP_KEYS.OBJECT:
        return renderObject();
      case AUDIT_BUILDER_STEP_KEYS.SECTIONS:
        return renderSections();
      case AUDIT_BUILDER_STEP_KEYS.SYNTHESIS:
        return renderSynthesis();
      case AUDIT_BUILDER_STEP_KEYS.ACTION_PLAN:
        return renderActionPlan();
      case AUDIT_BUILDER_STEP_KEYS.VALIDATION:
        return renderValidation();
      default:
        return null;
    }
  };

  return (
    <div className={cyberStyles.mspLayout}>
      <div className={`${cyberStyles.mspMain} ${styles.builderMain}`}>
        <div className={shellStyles.shell}>
          <div className={shellStyles.builderToolbar}>
            <div className={shellStyles.builderToolbarMeta}>
              <h1 className={shellStyles.builderToolbarTitle}>{subtypeTitle}</h1>
              <p className={shellStyles.builderToolbarSubtitle}>
                {[clientLabel, reportType?.description].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className={shellStyles.heroActions}>
              <button type="button" className={shellStyles.heroBtn} onClick={onBack}>
                <Icon icon="mdi:arrow-left" aria-hidden />
                {auditCopy.backToSelection}
              </button>
              {typeof onChangeSubtype === "function" ? (
                <button type="button" className={shellStyles.heroBtn} onClick={onChangeSubtype}>
                  <Icon icon="mdi:tune-variant" aria-hidden />
                  {auditCopy.changeSubtype}
                </button>
              ) : null}
            </div>
          </div>

          <div className={shellStyles.layout}>
            <aside className={shellStyles.stepNav} aria-label={pageCopy?.wizard?.stepNavAria || "Étapes"}>
              {steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;
                return (
                  <button
                    key={step.key}
                    type="button"
                    className={`${shellStyles.stepNavItem} ${isActive ? shellStyles.stepNavItemActive : ""} ${isDone ? shellStyles.stepNavItemDone : ""}`}
                    onClick={() => setStepIndex(index)}
                  >
                    <span className={shellStyles.stepNavIndex}>{index + 1}</span>
                    <span className={shellStyles.stepNavLabel}>{step.label}</span>
                  </button>
                );
              })}
            </aside>

            <section className={shellStyles.stepPanel}>
              <div className={shellStyles.stepPanelHead}>
                <h2 className={shellStyles.stepPanelTitle}>{currentStep.label}</h2>
                <span className={shellStyles.stepPanelMeta}>
                  {pageCopy?.wizard?.formatStepOf?.(stepIndex + 1, steps.length) || `${stepIndex + 1}/${steps.length}`}
                </span>
              </div>

              <div className={isValidationStep ? styles.validationBody : styles.formBody}>{renderStep()}</div>

              {isValidationStep ? (
                <div className={shellStyles.stepActions}>
                  <button type="button" className={shellStyles.secondaryBtn} onClick={onBack}>
                    {auditCopy.finish}
                  </button>
                </div>
              ) : (
                <div className={shellStyles.stepActions}>
                  <button
                    type="button"
                    className={shellStyles.secondaryBtn}
                    disabled={isFirst}
                    onClick={() => setStepIndex(value => Math.max(0, value - 1))}
                  >
                    <Icon icon="mdi:arrow-left" aria-hidden />
                    {auditCopy.back}
                  </button>
                  <button type="button" className={shellStyles.primaryBtn} onClick={goNext}>
                    {auditCopy.continue}
                    <Icon icon="mdi:arrow-right" aria-hidden />
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <InterventionSaveModal
        open={showSaveModal}
        copy={auditCopy.saveModal}
        clientLabel={clientLabel}
        documentName={saveName}
        visibleToClient={saveVisibleToClient}
        onVisibleToClientChange={setSaveVisibleToClient}
        showTicketFollowUp={false}
        saving={saving}
        onClose={() => !saving && setShowSaveModal(false)}
        onConfirm={confirmSave}
      />

      <ConfirmModal
        open={showOverwriteConfirm}
        title={auditCopy.alerts.overwriteTitle || auditCopy.alerts.duplicateName}
        message={auditCopy.alerts.overwriteMessage || auditCopy.alerts.duplicateName}
        confirmLabel={auditCopy.alerts.overwriteConfirm || auditCopy.saveModal.confirm}
        cancelLabel={auditCopy.alerts.overwriteCancel || auditCopy.saveModal.cancel}
        icon="mdi:content-save-alert-outline"
        variant="danger"
        loading={saving}
        onClose={() => {
          if (!saving) setShowOverwriteConfirm(false);
        }}
        onConfirm={() => {
          setShowOverwriteConfirm(false);
          handleSave(true);
        }}
      />
    </div>
  );
}
