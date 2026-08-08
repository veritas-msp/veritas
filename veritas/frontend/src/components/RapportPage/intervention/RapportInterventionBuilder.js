import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import { fetchClientGeneral } from "../../../api/clients";
import { fetchMonitoringDocuments, isMonitoringDocumentNameTaken, saveMonitoringDocument, updateMonitoringDocument } from "../../../api/monitoringDocuments";
import { useAppGeneralSettings, useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { REPORT_TYPE_IDS } from "../reportTypeConstants";
import ConfirmModal from "../../Misc/ConfirmModal/ConfirmModal";
import InterventionSaveModal from "./InterventionSaveModal";
import { uploadInterventionPdfToClientVault } from "../../../utils/uploadReportToClientVault";
import shellStyles from "../RapportBuilderPlaceholder.module.css";
import styles from "./RapportInterventionBuilder.module.css";
import { getInterventionReportCopy } from "./interventionReportI18n";
import { buildDefaultInterventionData, buildDefaultSaveName, buildInterventionReportPeriod, createTodoItem, isDuplicateMonitoringSaveResult, mergeInterventionData, getInterventionStepValidationAlert, serializeInterventionSavePayload, validateInterventionStep } from "./interventionReportModel";
import { buildInterventionPdfLabels, exportInterventionPdf } from "./exportInterventionPdf";
import { ModernToggle, MovementTypePicker, NumberStepper } from "./InterventionFormControls";
function PreviewBlock({
  title,
  children
}) {
  return <section className={styles.previewSection}>
      <h3 className={styles.previewSectionTitle}>{title}</h3>
      {children}
    </section>;
}
export default function ReportInterventionBuilder({
  copy: pageCopy,
  reportType,
  client,
  onBack,
  onSaved,
  initialData = null,
  documentId = null,
  documentName = ""
}) {
  const locale = useAppLocale();
  const {
    settings
  } = useAppGeneralSettings();
  const interventionCopy = useMemo(() => getInterventionReportCopy(pageCopy?.localeCode || locale), [pageCopy?.localeCode, locale]);
  const steps = useMemo(() => reportType?.steps || [], [reportType?.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState(() => mergeInterventionData(buildDefaultInterventionData({
    client,
    organizationName: settings?.app_organization_name || "",
    organizationAddress: settings?.app_organization_address || ""
  }), initialData));
  const [saveName, setSaveName] = useState(documentName || "");
  const [saving, setSaving] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const prestataireRef = useRef(null);
  const clientSignRef = useRef(null);
  const saveNameTouchedRef = useRef(Boolean(documentName?.trim()));
  const saveNameInitializedRef = useRef(Boolean(documentName?.trim()));
  const clientLabel = client?.name || client?.nom || (client?.id ? pageCopy.create.getClientLabel(client.id) : "-");
  useEffect(() => {
    let cancelled = false;
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) return undefined;
    fetchClientGeneral(clientId).then(generalData => {
      if (cancelled) return;
      setFormData(prev => {
        const next = {
          ...prev
        };
        if (!String(next.adresse || "").trim() && generalData?.address) {
          next.adresse = generalData.address;
        }
        const firstSite = Array.isArray(generalData?.sites) ? generalData.sites[0] : null;
        if (!String(next.contactSite || "").trim() && firstSite) {
          next.contactSite = firstSite.contact || firstSite.contact_name || next.contactSite;
        }
        if (!String(next.adresse || "").trim() && firstSite?.address) {
          next.adresse = firstSite.address;
        }
        return next;
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [client]);
  useEffect(() => {
    if (documentName?.trim()) {
      setSaveName(documentName);
      saveNameTouchedRef.current = true;
      saveNameInitializedRef.current = true;
      return;
    }
    if (stepIndex === 3 && !saveNameInitializedRef.current && !documentId) {
      saveNameInitializedRef.current = true;
      setSaveName(buildDefaultSaveName(clientLabel, interventionCopy, {
        withRandom: true
      }));
    }
  }, [stepIndex, clientLabel, documentName, documentId, interventionCopy]);
  useEffect(() => {
    if (stepIndex !== 3) return;
    setFormData(prev => ({
      ...prev,
      signatureDate: prev.signatureDate || prev.dateIntervention || "",
      signatureLieu: prev.signatureLieu || prev.adresse || ""
    }));
  }, [stepIndex]);
  useEffect(() => {
    if (stepIndex !== 3) return undefined;
    let cancelled = false;
    fetchMonitoringDocuments().then(docs => {
      if (!cancelled) setSavedDocuments(Array.isArray(docs) ? docs : []);
    }).catch(() => {
      if (!cancelled) setSavedDocuments([]);
    });
    return () => {
      cancelled = true;
    };
  }, [stepIndex]);
  const nameConflict = useMemo(() => {
    if (!saveName.trim()) return false;
    return isMonitoringDocumentNameTaken(saveName, {
      excludeId: documentId,
      documents: savedDocuments
    });
  }, [saveName, savedDocuments, documentId]);
  const updateField = patch => {
    setFormData(prev => ({
      ...prev,
      ...patch
    }));
  };
  const handleChange = event => {
    const {
      name,
      value,
      type,
      checked
    } = event.target;
    updateField({
      [name]: type === "checkbox" ? checked : value
    });
  };
  const handleMouvementChange = (index, field, value) => {
    setFormData(prev => {
      const mouvements = [...(prev.mouvements || [])];
      mouvements[index] = {
        ...mouvements[index],
        [field]: value
      };
      return {
        ...prev,
        mouvements
      };
    });
  };
  const addMouvement = () => {
    setFormData(prev => ({
      ...prev,
      mouvements: [...(prev.mouvements || []), {
        designation: "",
        quantite: "",
        type: "déposé",
        commentaire: ""
      }]
    }));
  };
  const removeMouvement = index => {
    setFormData(prev => ({
      ...prev,
      mouvements: (prev.mouvements || []).filter((_, i) => i !== index)
    }));
  };
  const getSignatureDataUrl = ref => {
    const pad = ref?.current;
    if (!pad) return "";
    try {
      if (typeof pad.isEmpty === "function" && pad.isEmpty()) return "";
      if (typeof pad.toDataURL === "function") {
        return pad.toDataURL("image/png") || "";
      }
      const canvas = typeof pad.getCanvas === "function" ? pad.getCanvas() : null;
      return canvas?.toDataURL?.("image/png") || "";
    } catch {
      return "";
    }
  };
  const captureSignatures = () => ({
    ...formData,
    signaturePrestataire: getSignatureDataUrl(prestataireRef) || formData.signaturePrestataire,
    signatureClient: getSignatureDataUrl(clientSignRef) || formData.signatureClient,
    documentSigne: formData.requireSignature ? true : formData.documentSigne
  });
  const syncSignatureToForm = () => {
    setFormData(prev => ({
      ...prev,
      signaturePrestataire: getSignatureDataUrl(prestataireRef) || prev.signaturePrestataire,
      signatureClient: getSignatureDataUrl(clientSignRef) || prev.signatureClient
    }));
  };
  const getStepAlert = (index, data = formData) => getInterventionStepValidationAlert(index, data, interventionCopy.alerts) || interventionCopy.alerts.stepReport;
  const getValidationPayload = () => captureSignatures();
  const goNext = () => {
    const payload = stepIndex === 3 ? getValidationPayload() : formData;
    if (!validateInterventionStep(stepIndex, payload)) {
      toast.error(getStepAlert(stepIndex, payload));
      return;
    }
    setStepIndex(value => Math.min(steps.length - 1, value + 1));
  };
  const goBack = () => {
    setStepIndex(value => Math.max(0, value - 1));
  };
  const pdfLabels = useMemo(() => buildInterventionPdfLabels(interventionCopy), [interventionCopy]);
  const archiveInterventionToClientVault = async ({
    visibleToClient,
    documentName,
    reportPeriod,
    payload
  }) => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) return {
      skipped: true
    };
    try {
      const blob = exportInterventionPdf(payload, pdfLabels, {
        asBlob: true,
        fileName: `${documentName}.pdf`
      });
      if (!blob) throw new Error("PDF generation failed");
      await uploadInterventionPdfToClientVault({
        blob,
        fileName: documentName,
        clientId,
        clientName: client?.name || client?.nom || "",
        description: reportPeriod || "",
        visibleToClient
      });
      return {
        success: true
      };
    } catch (err) {
      console.error("Archivage coffre intervention:", err);
      return {
        success: false,
        error: err.message
      };
    }
  };
  const handleDownloadPdf = () => {
    const payload = getValidationPayload();
    if (!validateInterventionStep(3, payload)) {
      toast.error(getStepAlert(3, payload));
      return;
    }
    const safeName = (saveName.trim() || "rapport-intervention").replace(/[^\w\- ]+/g, "");
    exportInterventionPdf(payload, pdfLabels, {
      fileName: `${safeName}.pdf`
    });
  };
  const handleSave = async (forceOverwrite = false) => {
    const payload = getValidationPayload();
    setSaving(true);
    try {
      const {
        config,
        data
      } = serializeInterventionSavePayload(client, payload, REPORT_TYPE_IDS.INTERVENTION);
      const clientName = client?.name || client?.nom || "CLIENT";
      const reportPeriod = buildInterventionReportPeriod(payload);
      const result = documentId ? await updateMonitoringDocument(documentId, {
        name: saveName.trim(),
        client_name: clientName,
        report_period: reportPeriod,
        config,
        data
      }) : await saveMonitoringDocument({
        name: saveName.trim(),
        client_name: clientName,
        report_period: reportPeriod,
        config,
        data,
        overwrite: forceOverwrite
      });
      if (result?.success) {
        const vaultResult = await archiveInterventionToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod,
          payload
        });
        if (vaultResult.success) {
          toast.success(saveVisibleToClient ? interventionCopy.alerts.saveSuccessVisible : interventionCopy.alerts.saveSuccessInternal);
        } else if (!vaultResult.skipped) {
          toast.warn(interventionCopy.alerts.saveVaultError);
        } else {
          toast.success(interventionCopy.alerts.saveSuccess);
        }
        onSaved?.();
        onBack?.();
        return;
      }
      if (!documentId && !forceOverwrite && isDuplicateMonitoringSaveResult(result)) {
        toast.warning(interventionCopy.validation.nameExists);
        setShowOverwriteConfirm(true);
        return;
      }
      toast.error(result?.error || result?.message || interventionCopy.alerts.saveError);
    } catch (err) {
      toast.error(err?.message || interventionCopy.alerts.saveError);
    } finally {
      setSaving(false);
    }
  };
  const openSaveModal = () => {
    if (!saveName.trim()) {
      toast.error(interventionCopy.alerts.saveName);
      return;
    }
    const payload = getValidationPayload();
    if (!validateInterventionStep(3, payload)) {
      toast.error(getStepAlert(3, payload));
      return;
    }
    setSaveVisibleToClient(false);
    setShowSaveModal(true);
  };
  const confirmSave = () => {
    setShowSaveModal(false);
    if (!documentId && nameConflict) {
      setShowOverwriteConfirm(true);
      return;
    }
    handleSave(false);
  };
  const currentStep = steps[stepIndex] || steps[0] || pageCopy.wizard.stepBuild;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= steps.length - 1;
  const ctx = interventionCopy.context;
  const inter = interventionCopy.interventions;
  const rep = interventionCopy.report;
  const todosCopy = interventionCopy.todos;
  const val = interventionCopy.validation;
  const movementOptions = useMemo(() => [{
    value: "déposé",
    label: inter.depose,
    icon: "mdi:package-down",
    tone: "deposit"
  }, {
    value: "enlevé",
    label: inter.enleve,
    icon: "mdi:package-up",
    tone: "remove"
  }, {
    value: "réparé",
    label: inter.repare,
    icon: "mdi:wrench-outline",
    tone: "repair"
  }], [inter.depose, inter.enleve, inter.repare]);
  const handleTodoChange = (index, field, value) => {
    setFormData(prev => {
      const todos = [...(prev.todos || [])];
      todos[index] = {
        ...todos[index],
        [field]: value
      };
      return {
        ...prev,
        todos
      };
    });
  };
  const addTodo = () => {
    setFormData(prev => ({
      ...prev,
      todos: [...(prev.todos || []), createTodoItem("")]
    }));
  };
  const removeTodo = index => {
    setFormData(prev => ({
      ...prev,
      todos: (prev.todos || []).filter((_, i) => i !== index)
    }));
  };
  const renderContextStep = () => <div className={styles.formGrid}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetLegend}>{ctx.intervenant}</legend>
        <div className={styles.formGridSingle}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{ctx.companyName} *</span>
            <input className={styles.fieldInput} name="companyName" value={formData.companyName || ""} onChange={handleChange} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{ctx.companyAddress} *</span>
            <input className={styles.fieldInput} name="companyAddress" value={formData.companyAddress || ""} onChange={handleChange} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{ctx.companyTaxId}</span>
            <input className={styles.fieldInput} name="companyTaxId" value={formData.companyTaxId || ""} onChange={handleChange} />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldsetLegend}>{ctx.beneficiaire}</legend>
        <div className={styles.formGridSingle}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{ctx.client} *</span>
            <input className={styles.fieldInput} name="client" value={formData.client || ""} onChange={handleChange} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{ctx.adresse} *</span>
            <input className={styles.fieldInput} name="adresse" value={formData.adresse || ""} onChange={handleChange} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{ctx.contactSite}</span>
            <input className={styles.fieldInput} name="contactSite" value={formData.contactSite || ""} onChange={handleChange} />
          </label>
        </div>
      </fieldset>
    </div>;
  const renderInterventionsStep = () => <div className={styles.formGridSingle}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{inter.dateIntervention} *</span>
          <input type="date" className={styles.fieldInput} name="dateIntervention" value={formData.dateIntervention || ""} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{inter.duree} *</span>
          <NumberStepper value={formData.dureeIntervention || ""} onChange={value => updateField({
          dureeIntervention: value
        })} min={0} step={0.5} decimals={1} ariaLabel={inter.duree} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{inter.numero}</span>
          <input className={styles.fieldInput} name="numeroIntervention" value={formData.numeroIntervention || ""} onChange={handleChange} placeholder="456789" />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{inter.descriptionDemande} *</span>
        <textarea className={styles.fieldTextarea} name="descriptionDemande" value={formData.descriptionDemande || ""} onChange={handleChange} placeholder={inter.descriptionDemande} />
      </label>

      <div className={styles.materialBlock}>
        <div className={styles.materialHead}>
          <h3 className={styles.materialTitle}>{inter.materielTitle}</h3>
          <button type="button" className={styles.addMovementBtn} onClick={addMouvement}>
            <Icon icon="mdi:plus" aria-hidden />
            {inter.addLine}
          </button>
        </div>

        {(formData.mouvements || []).length === 0 ? <p className={styles.emptyMovements}>{inter.emptyMovements}</p> : <div className={styles.movementTableWrap}>
            <div className={styles.movementTable} role="table">
              <div className={styles.movementTableHead} role="row">
                <span role="columnheader" aria-hidden />
                <span role="columnheader">{inter.designation}</span>
                <span role="columnheader">{inter.quantite}</span>
                <span role="columnheader">{inter.mouvement}</span>
                <span role="columnheader">{inter.commentaire}</span>
                <span role="columnheader" aria-hidden />
              </div>
              {(formData.mouvements || []).map((row, index) => <div key={index} className={styles.movementRow} role="row">
                  <span className={styles.movementRowIndex} role="cell">
                    {index + 1}
                  </span>
                  <input role="cell" className={styles.movementCellInput} value={row.designation || ""} onChange={e => handleMouvementChange(index, "designation", e.target.value)} placeholder={inter.designation} aria-label={`${inter.designation} ${index + 1}`} />
                  <div role="cell">
                    <NumberStepper compact value={row.quantite || ""} onChange={value => handleMouvementChange(index, "quantite", value)} min={0} step={1} ariaLabel={`${inter.quantite} ${index + 1}`} />
                  </div>
                  <div role="cell">
                    <MovementTypePicker compact value={row.type || "déposé"} options={movementOptions} onChange={value => handleMouvementChange(index, "type", value)} />
                  </div>
                  <input role="cell" className={styles.movementCellInput} value={row.commentaire || ""} onChange={e => handleMouvementChange(index, "commentaire", e.target.value)} placeholder={inter.commentaire} aria-label={`${inter.commentaire} ${index + 1}`} />
                  <button type="button" role="cell" className={styles.movementRowRemove} onClick={() => removeMouvement(index)} aria-label={inter.removeLine}>
                    <Icon icon="mdi:close" aria-hidden />
                  </button>
                </div>)}
            </div>
          </div>}
      </div>
    </div>;
  const renderReportStep = () => <div className={styles.formGridSingle}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{rep.compteRendu}</span>
        <textarea className={styles.fieldTextarea} name="compteRendu" value={formData.compteRendu || ""} onChange={handleChange} style={{
        minHeight: "8rem"
      }} placeholder={rep.compteRendu} />
      </label>

      <section className={styles.todosBlock}>
        <div className={styles.todosHead}>
          <div>
            <h3 className={styles.materialTitle}>{todosCopy.title}</h3>
            <p className={styles.materialHint}>{todosCopy.hint}</p>
          </div>
          <button type="button" className={styles.addMovementBtn} onClick={addTodo}>
            <Icon icon="mdi:plus" aria-hidden />
            {todosCopy.add}
          </button>
        </div>

        {(formData.todos || []).map((todo, index) => <article key={todo.id || index} className={`${styles.todoCard} ${todo.done ? styles.todoCardDone : ""}`}>
            <label className={styles.todoCheck}>
              <input type="checkbox" checked={Boolean(todo.done)} onChange={event => handleTodoChange(index, "done", event.target.checked)} />
              <span className={styles.todoCheckBox} aria-hidden />
              <span className={styles.srOnly}>{todo.done ? todosCopy.done : todosCopy.pending}</span>
            </label>

            <div className={styles.todoFields}>
              <input className={styles.fieldInput} value={todo.text || ""} onChange={event => handleTodoChange(index, "text", event.target.value)} placeholder={todosCopy.placeholder} />
              {!todo.done ? <label className={styles.todoPlanned}>
                  <span className={styles.fieldLabel}>{todosCopy.plannedFor}</span>
                  <input type="date" className={styles.fieldInput} value={todo.plannedFor || ""} onChange={event => handleTodoChange(index, "plannedFor", event.target.value)} />
                </label> : null}
            </div>

            <button type="button" className={styles.movementRemoveBtn} onClick={() => removeTodo(index)} aria-label={todosCopy.remove}>
              <Icon icon="mdi:close" aria-hidden />
            </button>
          </article>)}
      </section>
    </div>;
  const renderSignatureForm = () => <div className={styles.signatureForm}>
      <div className={styles.signatureToggleRow}>
        <span className={styles.fieldLabel}>{rep.requireSignature}</span>
        <ModernToggle checked={Boolean(formData.requireSignature)} onChange={value => updateField({
        requireSignature: value,
        ...(value ? {
          signatureDate: formData.signatureDate || formData.dateIntervention || "",
          signatureLieu: formData.signatureLieu || formData.adresse || ""
        } : {})
      })} labelOn={rep.yes} labelOff={rep.no} />
      </div>

      {!formData.requireSignature ? null : <>
          <div className={styles.formGridSingle}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{rep.nom} *</span>
              <input className={styles.fieldInput} name="signatureNom" value={formData.signatureNom || ""} onChange={handleChange} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{rep.lieu} *</span>
              <input className={styles.fieldInput} name="signatureLieu" value={formData.signatureLieu || ""} onChange={handleChange} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{rep.date} *</span>
              <input type="date" className={styles.fieldInput} name="signatureDate" value={formData.signatureDate || ""} onChange={handleChange} />
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{rep.reserve}</span>
            <textarea className={styles.fieldTextarea} name="signatureReserve" value={formData.signatureReserve || ""} onChange={handleChange} />
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" name="signatureAccord" checked={Boolean(formData.signatureAccord)} onChange={handleChange} />
            <span>{rep.accord}</span>
          </label>

          <div className={styles.signatureGrid}>
            <div className={styles.signaturePad}>
              <span className={styles.fieldLabel}>{rep.prestataire}</span>
              <SignatureCanvas ref={prestataireRef} penColor="#0f1c2e" canvasProps={{
            className: styles.signatureCanvas
          }} onEnd={syncSignatureToForm} />
              <button type="button" className={styles.linkBtn} onClick={() => {
            prestataireRef.current?.clear();
            updateField({
              signaturePrestataire: ""
            });
          }}>
                {rep.clear}
              </button>
            </div>
            <div className={styles.signaturePad}>
              <span className={styles.fieldLabel}>{rep.clientSign}</span>
              <SignatureCanvas ref={clientSignRef} penColor="#0f1c2e" canvasProps={{
            className: styles.signatureCanvas
          }} onEnd={syncSignatureToForm} />
              <button type="button" className={styles.linkBtn} onClick={() => {
            clientSignRef.current?.clear();
            updateField({
              signatureClient: ""
            });
          }}>
                {rep.clear}
              </button>
            </div>
          </div>
        </>}
    </div>;
  const renderValidationStep = () => {
    const previewData = captureSignatures();
    const visibleTodos = (previewData.todos || []).filter(item => String(item?.text || "").trim());
    return <div className={styles.validationLayout}>
        <div className={styles.previewPanel}>
          <article className={styles.previewDoc}>
            <h2 className={styles.previewTitle}>{val.title}</h2>
            <PreviewBlock title={ctx.intervenant}>
              <div className={styles.previewGrid}>
                <div className={styles.previewBox}>
                  <div>
                    <strong>{ctx.companyName}</strong> : {previewData.companyName || "-"}
                  </div>
                  <div>
                    <strong>{ctx.companyAddress}</strong> : {previewData.companyAddress || "-"}
                  </div>
                  <div>
                    <strong>{ctx.companyTaxId}</strong> : {previewData.companyTaxId || "-"}
                  </div>
                </div>
                <div className={styles.previewBox}>
                  <div>
                    <strong>{ctx.client}</strong> : {previewData.client || "-"}
                  </div>
                  <div>
                    <strong>{ctx.adresse}</strong> : {previewData.adresse || "-"}
                  </div>
                  <div>
                    <strong>{ctx.contactSite}</strong> : {previewData.contactSite || "-"}
                  </div>
                </div>
              </div>
            </PreviewBlock>

            <PreviewBlock title={inter.dateIntervention}>
              <div className={styles.previewBox}>
                <div>
                  <strong>{inter.numero}</strong> : {previewData.numeroIntervention || "-"}
                </div>
                <div>
                  <strong>{inter.dateIntervention}</strong> :{" "}
                  {previewData.dateIntervention || "-"}
                </div>
                <div>
                  <strong>{inter.duree}</strong> : {previewData.dureeIntervention || "-"}{" "}
                  {val.heures}
                </div>
              </div>
            </PreviewBlock>

            <PreviewBlock title={val.demande}>
              <p className={styles.previewText}>{previewData.descriptionDemande || "-"}</p>
            </PreviewBlock>

            {String(previewData.compteRendu || "").trim() ? <PreviewBlock title={val.compteRendu}>
                <p className={styles.previewText}>{previewData.compteRendu}</p>
              </PreviewBlock> : null}

            {visibleTodos.length > 0 ? <PreviewBlock title={val.todos}>
                <ul className={styles.previewTodoList}>
                  {visibleTodos.map((todo, index) => <li key={todo.id || index} className={todo.done ? styles.previewTodoDone : styles.previewTodoPending}>
                      <Icon icon={todo.done ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline"} aria-hidden />
                      <span>{todo.text}</span>
                      {!todo.done && todo.plannedFor ? <span className={styles.previewTodoPlanned}>
                          {todosCopy.plannedFor} : {todo.plannedFor}
                        </span> : null}
                    </li>)}
                </ul>
              </PreviewBlock> : null}

            {(previewData.mouvements || []).length > 0 ? <PreviewBlock title={val.materiel}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>{inter.designation}</th>
                      <th>{inter.quantite}</th>
                      <th>{inter.mouvement}</th>
                      <th>{inter.commentaire}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.mouvements.map((row, index) => <tr key={index}>
                        <td>{row.designation}</td>
                        <td>{row.quantite}</td>
                        <td>{row.type}</td>
                        <td>{row.commentaire}</td>
                      </tr>)}
                  </tbody>
                </table>
              </PreviewBlock> : null}

            <PreviewBlock title={val.signatures}>
              {previewData.requireSignature ? <>
                  <div className={styles.previewBox}>
                    <div>
                      <strong>{val.recipientName}</strong> : {previewData.signatureNom || "-"}
                    </div>
                    <div>
                      <strong>{val.place}</strong> : {previewData.signatureLieu || "-"}
                    </div>
                    <div>
                      <strong>{val.date}</strong> : {previewData.signatureDate || "-"}
                    </div>
                    {previewData.signatureReserve ? <div>
                        <strong>{val.reserve}</strong> : {previewData.signatureReserve}
                      </div> : null}
                  </div>
                  <div className={styles.previewSignatureGrid}>
                    <div className={styles.previewSignatureBox}>
                      <span className={styles.fieldLabel}>{rep.prestataire}</span>
                      {previewData.signaturePrestataire ? <img src={previewData.signaturePrestataire} alt={rep.prestataire} className={styles.previewSignatureImage} /> : <div className={styles.previewSignatureEmpty}>-</div>}
                    </div>
                    <div className={styles.previewSignatureBox}>
                      <span className={styles.fieldLabel}>{rep.clientSign}</span>
                      {previewData.signatureClient ? <img src={previewData.signatureClient} alt={rep.clientSign} className={styles.previewSignatureImage} /> : <div className={styles.previewSignatureEmpty}>-</div>}
                    </div>
                  </div>
                </> : <p className={styles.previewText}>{val.noSignatureRequired}</p>}
            </PreviewBlock>
          </article>
        </div>

        <aside className={styles.actionsPanel}>
          <h3 className={styles.materialTitle}>{val.previewTitle}</h3>
          {renderSignatureForm()}
          <label className={styles.saveField}>
            <span className={styles.fieldLabel}>{val.saveNameLabel}</span>
            <input className={`${styles.fieldInput} ${nameConflict ? styles.fieldInputConflict : ""}`} value={saveName} onChange={e => {
            saveNameTouchedRef.current = true;
            setSaveName(e.target.value);
          }} />
            {nameConflict ? <span className={styles.saveNameWarning} role="alert">
                <Icon icon="mdi:alert-circle-outline" aria-hidden />
                {val.nameExists}
              </span> : null}
          </label>
          <button type="button" className={shellStyles.primaryBtn} onClick={handleDownloadPdf}>
            <Icon icon="mdi:file-pdf-box" aria-hidden />
            {val.downloadPdf}
          </button>
          <button type="button" className={shellStyles.primaryBtn} disabled={saving} onClick={openSaveModal}>
            <Icon icon="mdi:content-save-outline" aria-hidden />
            {saving ? "…" : val.saveLibrary}
          </button>
          <button type="button" className={shellStyles.secondaryBtn} onClick={() => setStepIndex(0)}>
            <Icon icon="mdi:pencil-outline" aria-hidden />
            {val.modify}
          </button>
        </aside>
      </div>;
  };
  const renderStepContent = () => {
    if (stepIndex === 0) return renderContextStep();
    if (stepIndex === 1) return renderInterventionsStep();
    if (stepIndex === 2) return renderReportStep();
    return renderValidationStep();
  };
  return <div className={shellStyles.shell}>
      <header className={shellStyles.header}>
        <button type="button" className={shellStyles.backBtn} onClick={onBack}>
          <Icon icon="mdi:arrow-left" aria-hidden />
          {pageCopy.wizard.backToSelection}
        </button>

        <div className={shellStyles.headerMain}>
          <div className={shellStyles.headerIcon}>
            <Icon icon={reportType?.icon || "mdi:toolbox-outline"} aria-hidden />
          </div>
          <div className={shellStyles.headerCopy}>
            <span className={shellStyles.headerEyebrow}>{clientLabel}</span>
            <h1 className={shellStyles.headerTitle}>{reportType?.title}</h1>
            <p className={shellStyles.headerSubtitle}>{reportType?.description}</p>
          </div>
        </div>
      </header>

      <div className={shellStyles.layout}>
        <aside className={shellStyles.stepNav} aria-label={pageCopy.wizard.stepNavAria}>
          {steps.map((label, index) => {
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;
          const canJump = index < stepIndex || index > stepIndex && Array.from({
            length: index
          }).every((_, i) => validateInterventionStep(i, formData));
          return <button key={label} type="button" className={`${shellStyles.stepNavItem} ${isActive ? shellStyles.stepNavItemActive : ""} ${isDone ? shellStyles.stepNavItemDone : ""}`} onClick={() => {
            if (canJump || index <= stepIndex) setStepIndex(index);
          }} disabled={index > stepIndex && !canJump}>
                <span className={shellStyles.stepNavIndex}>{index + 1}</span>
                <span className={shellStyles.stepNavLabel}>{label}</span>
              </button>;
        })}
        </aside>

        <section className={shellStyles.stepPanel}>
          <div className={shellStyles.stepPanelHead}>
            <h2 className={shellStyles.stepPanelTitle}>{currentStep}</h2>
            <span className={shellStyles.stepPanelMeta}>
              {pageCopy.wizard.formatStepOf(stepIndex + 1, steps.length)}
            </span>
          </div>

          <div className={stepIndex === 3 ? styles.formBody : styles.formBody}>
            {renderStepContent()}
          </div>

          {stepIndex < 3 ? <div className={shellStyles.stepActions}>
              <button type="button" className={shellStyles.secondaryBtn} disabled={isFirst} onClick={goBack}>
                <Icon icon="mdi:arrow-left" aria-hidden />
                {pageCopy.wizard.back}
              </button>
              <button type="button" className={shellStyles.primaryBtn} onClick={goNext}>
                {isLast ? val.finish : pageCopy.wizard.continue}
                <Icon icon="mdi:arrow-right" aria-hidden />
              </button>
            </div> : <div className={shellStyles.stepActions}>
              <button type="button" className={shellStyles.secondaryBtn} onClick={onBack}>
                {val.finish}
              </button>
            </div>}
        </section>
      </div>

      <ConfirmModal open={showOverwriteConfirm} title={interventionCopy.alerts.overwriteTitle} message={interventionCopy.alerts.overwriteMessage} confirmLabel={interventionCopy.alerts.overwriteConfirm} cancelLabel={interventionCopy.alerts.overwriteCancel} variant="danger" loading={saving} onConfirm={() => {
      setShowOverwriteConfirm(false);
      handleSave(true);
    }} onClose={() => {
      if (!saving) setShowOverwriteConfirm(false);
    }} />

      <InterventionSaveModal open={showSaveModal} copy={interventionCopy.saveModal} clientLabel={clientLabel} documentName={saveName} visibleToClient={saveVisibleToClient} onVisibleToClientChange={setSaveVisibleToClient} saving={saving} onClose={() => !saving && setShowSaveModal(false)} onConfirm={confirmSave} />
    </div>;
}
