import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getClientOffice365Credentials } from "../../api/clientOffice365";
import { getIconPath } from "../../utils/assetHelper";
import { formatMicrosoftTenantSummary, normalizeMicrosoftTenantCredentials } from "../EnterprisesPage/microsoftTenantSolutionUtils";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import localStyles from "./CampaignFormModal.module.css";
function getClientLabel(client) {
  if (!client) return "";
  return client.name || client.nom || `Client #${client.id}`;
}
function stripRequiredMark(label) {
  return String(label || "").replace(/\s*\*$/, "");
}
const CAMPAIGN_PROVIDERS = [{
  id: "microsoft",
  labelKey: "providerMicrosoft",
  status: "available",
  icon: "mdi:microsoft",
  image: "office365.png"
}, {
  id: "google_workspace",
  labelKey: "providerGoogle",
  status: "comingSoon",
  icon: "mdi:google"
}, {
  id: "okta",
  labelKey: "providerOkta",
  status: "comingSoon",
  icon: "simple-icons:okta"
}];
export default function CampaignFormModal({
  open,
  onClose,
  clients = [],
  formData,
  onFormDataChange,
  editingCampaign = null,
  onSubmit,
  saving = false,
  copy,
  getCampaignTypeLabel,
  lockClient = false,
  onDeleteCampaign = null,
  deleteLoading = false,
  statusOptions = []
}) {
  const commonCopy = useCommonCopy();
  const isEditing = Boolean(editingCampaign?.id);
  const [activeSection, setActiveSection] = useState("general");
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [msCredentials, setMsCredentials] = useState(null);
  const [msCredentialsLoading, setMsCredentialsLoading] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);
  const credentialsRequestRef = useRef(0);
  const clientList = useMemo(() => Array.isArray(clients) ? clients : [], [clients]);
  const modalCopy = copy?.modal || {};
  const sections = useMemo(() => [{
    id: "general",
    label: modalCopy.sections?.general?.navLabel || modalCopy.sectionTitle,
    description: modalCopy.sections?.general?.navHint || "",
    icon: "mdi:shield-lock-outline"
  }, {
    id: "dates",
    label: modalCopy.sections?.dates?.navLabel || modalCopy.startDate,
    description: modalCopy.sections?.dates?.navHint || "",
    icon: "mdi:calendar-range"
  }, {
    id: "details",
    label: modalCopy.sections?.details?.navLabel || modalCopy.specificity,
    description: modalCopy.sections?.details?.navHint || "",
    icon: "mdi:text-box-outline"
  }], [modalCopy]);
  const selectedClient = useMemo(() => {
    if (!formData?.client_id) return null;
    return clientList.find(c => String(c.id) === String(formData.client_id)) || null;
  }, [clientList, formData?.client_id]);
  const lockedClientLabel = useMemo(() => {
    if (!lockClient) return "";
    return getClientLabel(selectedClient) || getClientLabel(clientList[0]) || "";
  }, [lockClient, selectedClient, clientList]);
  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    if (!query) return clientList.slice(0, 12);
    return clientList.filter(c => getClientLabel(c).toLowerCase().includes(query)).slice(0, 12);
  }, [clientList, enterpriseSearch]);
  const selectedProvider = formData?.provider || "microsoft";
  const msSummary = useMemo(() => {
    if (!msCredentials) return null;
    return formatMicrosoftTenantSummary(msCredentials, selectedClient);
  }, [msCredentials, selectedClient]);
  const hasMicrosoftTenant = Boolean(msCredentials?.tenantId && msCredentials?.id);
  const microsoftReady = selectedProvider === "microsoft" && hasMicrosoftTenant && String(formData?.tenant_id || "") === String(msCredentials?.tenantId || "") && String(formData?.azure_credential_id || "") === String(msCredentials?.id || "");
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
    if (selectedClient) {
      setEnterpriseSearch(getClientLabel(selectedClient));
    } else {
      setEnterpriseSearch("");
    }
    setEnterpriseDropdownOpen(false);
  }, [open, selectedClient]);
  useEffect(() => {
    if (!open || lockClient) return;
    const handleClickOutside = e => {
      if (enterpriseAutocompleteRef.current && !enterpriseAutocompleteRef.current.contains(e.target)) {
        setEnterpriseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, lockClient]);
  useEffect(() => {
    if (!open) {
      setMsCredentials(null);
      setMsCredentialsLoading(false);
      return;
    }
    const clientId = formData?.client_id;
    if (!clientId) {
      setMsCredentials(null);
      setMsCredentialsLoading(false);
      return;
    }
    const requestId = ++credentialsRequestRef.current;
    let cancelled = false;
    setMsCredentialsLoading(true);
    (async () => {
      try {
        const response = await getClientOffice365Credentials(clientId);
        if (cancelled || requestId !== credentialsRequestRef.current) return;
        const raw = response?.credentials || null;
        const normalized = normalizeMicrosoftTenantCredentials(raw);
        const credentials = raw && normalized?.tenantId ? {
          id: raw.id,
          ...normalized
        } : null;
        setMsCredentials(credentials);
        if (!isEditing && credentials?.id && credentials?.tenantId) {
          onFormDataChange?.(prev => {
            if (String(prev?.client_id) !== String(clientId)) return prev;
            if (String(prev?.azure_credential_id || "") === String(credentials.id) && String(prev?.tenant_id || "") === String(credentials.tenantId) && (prev?.provider || "microsoft") === "microsoft") {
              return prev;
            }
            return {
              ...prev,
              provider: "microsoft",
              azure_credential_id: credentials.id,
              tenant_id: credentials.tenantId,
              type: "microsoft_security"
            };
          });
        } else if (!isEditing && !credentials) {
          onFormDataChange?.(prev => {
            if (String(prev?.client_id) !== String(clientId)) return prev;
            if (!prev?.azure_credential_id && !prev?.tenant_id) return prev;
            return {
              ...prev,
              azure_credential_id: "",
              tenant_id: ""
            };
          });
        }
      } catch (error) {
        if (cancelled || requestId !== credentialsRequestRef.current) return;
        console.error("Error chargement tenant Microsoft:", error);
        setMsCredentials(null);
      } finally {
        if (!cancelled && requestId === credentialsRequestRef.current) {
          setMsCredentialsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, formData?.client_id, isEditing, onFormDataChange]);
  const patchForm = patch => {
    onFormDataChange?.(prev => ({
      ...prev,
      ...patch
    }));
  };
  const selectClient = client => {
    patchForm({
      client_id: client.id,
      provider: "microsoft",
      azure_credential_id: "",
      tenant_id: "",
      type: "microsoft_security"
    });
    setEnterpriseSearch(getClientLabel(client));
    setEnterpriseDropdownOpen(false);
  };
  const handleSelectProvider = provider => {
    if (isEditing) return;
    if (provider.status === "comingSoon") {
      toast.info(modalCopy.providerComingSoon || "Coming soon");
      return;
    }
    if (provider.id === "microsoft") {
      patchForm({
        provider: "microsoft",
        type: "microsoft_security",
        ...(msCredentials?.id && msCredentials?.tenantId ? {
          azure_credential_id: msCredentials.id,
          tenant_id: msCredentials.tenantId
        } : {
          azure_credential_id: "",
          tenant_id: ""
        })
      });
    }
  };
  const selectMicrosoftTenant = () => {
    if (isEditing || !msCredentials?.id || !msCredentials?.tenantId) return;
    patchForm({
      provider: "microsoft",
      type: "microsoft_security",
      azure_credential_id: msCredentials.id,
      tenant_id: msCredentials.tenantId
    });
  };
  const sectionMeta = useMemo(() => {
    const generalDone = Boolean(formData?.client_id && String(formData?.name || "").trim() && formData?.type && (isEditing || microsoftReady));
    const datesDone = Boolean(formData?.start_date || formData?.end_date);
    const detailsDone = Boolean(String(formData?.description || "").trim());
    return {
      general: generalDone,
      dates: datesDone,
      details: detailsDone
    };
  }, [formData, isEditing, microsoftReady]);
  const formValid = Boolean(formData?.client_id && String(formData?.name || "").trim() && formData?.type && (isEditing || microsoftReady));
  if (!open) return null;
  const modalTitle = isEditing ? modalCopy.editTitle : modalCopy.createTitle;
  const modalSubtitle = isEditing ? modalCopy.editSubtitle : modalCopy.createSubtitle;
  const typeLabel = getCampaignTypeLabel ? getCampaignTypeLabel(formData?.type || "microsoft_security") : formData?.type;
  const handleSubmit = e => {
    e?.preventDefault?.();
    if (!formValid) {
      setActiveSection("general");
      if (!isEditing && formData?.client_id && !hasMicrosoftTenant) {
        toast.error(modalCopy.needMicrosoftTenant || copy?.toasts?.needMicrosoftTenant);
      }
      return;
    }
    onSubmit?.(e);
  };
  const displayTenantSummary = msSummary || (formData?.tenant_id ? {
    label: modalCopy.tenantFallbackLabel || "Tenant Microsoft",
    tenantId: formData.tenant_id,
    shortTenantId: `${String(formData.tenant_id).slice(0, 8)}…${String(formData.tenant_id).slice(-4)}`,
    providerName: "Microsoft Entra ID"
  } : null);
  return createPortal(<div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="campaign-form-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:shield-lock-outline" />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={styles.title} id="campaign-form-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <form className={localStyles.form} onSubmit={handleSubmit}>
          <div className={styles.body}>
            <nav className={styles.nav} aria-label={modalCopy.sectionsNavAria}>
              {sections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                  <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                  <span className={styles.navItemText}>
                    <span className={styles.navItemLabel}>{section.label}</span>
                    {section.description ? <span className={styles.navItemHint}>{section.description}</span> : null}
                  </span>
                  {sectionMeta[section.id] ? <span className={styles.navBadge}>✓</span> : null}
                </button>)}
            </nav>

            <div className={styles.content}>
              {activeSection === "general" ? <>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>
                      {modalCopy.sections?.general?.title || modalCopy.sectionTitle}
                    </h3>
                    <p className={styles.sectionDesc}>
                      {modalCopy.sections?.general?.desc || modalCopy.sectionDesc}
                    </p>
                  </div>

                  <div className={styles.fieldStack}>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="campaign-form-enterprise">
                        {stripRequiredMark(modalCopy.enterprise)}
                      </label>
                      {lockClient ? <input id="campaign-form-enterprise" type="text" className={styles.input} value={lockedClientLabel} readOnly disabled required /> : <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                          <input id="campaign-form-enterprise" type="text" className={styles.input} placeholder={modalCopy.enterpriseSearch} value={enterpriseSearch} onChange={e => {
                      setEnterpriseSearch(e.target.value);
                      patchForm({
                        client_id: "",
                        azure_credential_id: "",
                        tenant_id: ""
                      });
                      setEnterpriseDropdownOpen(true);
                    }} onFocus={() => setEnterpriseDropdownOpen(true)} autoComplete="off" required />
                          {enterpriseDropdownOpen ? <div className={styles.dropdown}>
                              {filteredClients.length === 0 ? <div className={styles.dropdownEmpty}>{modalCopy.noEnterprise}</div> : filteredClients.map(client => <button key={client.id} type="button" className={`${styles.dropdownOption} ${String(formData.client_id) === String(client.id) ? styles.dropdownOptionSelected : ""}`} onClick={() => selectClient(client)}>
                                    {getClientLabel(client)}
                                  </button>)}
                            </div> : null}
                        </div>}
                    </div>

                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={`${styles.label} ${styles.labelRequired}`}>
                        {stripRequiredMark(modalCopy.provider || "Provider *")}
                      </span>
                      <div className={localStyles.providerList} role="listbox" aria-label={modalCopy.provider}>
                        {CAMPAIGN_PROVIDERS.map(provider => {
                      const isSelected = selectedProvider === provider.id;
                      const isComingSoon = provider.status === "comingSoon";
                      return <button key={provider.id} type="button" role="option" aria-selected={isSelected} className={`${localStyles.providerCard} ${isSelected ? localStyles.providerCardSelected : ""} ${isComingSoon || isEditing ? localStyles.providerCardDisabled : ""}`} onClick={() => handleSelectProvider(provider)} disabled={isComingSoon || isEditing} title={isComingSoon ? modalCopy.providerComingSoon : modalCopy[provider.labelKey] || provider.id}>
                              <span className={localStyles.providerCardIcon} aria-hidden>
                                {provider.image ? <img src={getIconPath(provider.image)} alt="" /> : <Icon icon={provider.icon} />}
                              </span>
                              <span className={localStyles.providerCardLabel}>
                                {modalCopy[provider.labelKey] || provider.id}
                              </span>
                              {isComingSoon ? <span className={localStyles.providerBadgeSoon}>
                                  {modalCopy.badgeSoon || "Soon"}
                                </span> : null}
                            </button>;
                    })}
                      </div>
                    </div>

                    {formData?.client_id && selectedProvider === "microsoft" ? <div className={`${styles.field} ${styles.fieldFull}`}>
                        <span className={`${styles.label} ${styles.labelRequired}`}>
                          {stripRequiredMark(modalCopy.tenant || "Tenant *")}
                        </span>
                        {msCredentialsLoading ? <p className={localStyles.tenantHint}>{modalCopy.tenantLoading}</p> : hasMicrosoftTenant && displayTenantSummary ? <button type="button" className={`${localStyles.tenantCard} ${microsoftReady || isEditing ? localStyles.tenantCardSelected : ""}`} onClick={selectMicrosoftTenant} disabled={isEditing}>
                            <span className={localStyles.tenantCardIcon} aria-hidden>
                              <Icon icon="mdi:microsoft-azure" />
                            </span>
                            <span className={localStyles.tenantCardMain}>
                              <p className={localStyles.tenantCardTitle}>{displayTenantSummary.label}</p>
                              <p className={localStyles.tenantCardMeta}>
                                {displayTenantSummary.providerName} · {displayTenantSummary.tenantId}
                              </p>
                            </span>
                          </button> : <p className={localStyles.tenantWarning}>
                            {modalCopy.needMicrosoftTenant}
                          </p>}
                      </div> : null}

                    <div className={styles.fieldGrid2}>
                      <div className={styles.field}>
                        <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="campaign-form-name">
                          {stripRequiredMark(modalCopy.name)}
                        </label>
                        <input id="campaign-form-name" type="text" className={styles.input} value={formData.name || ""} onChange={e => patchForm({
                      name: e.target.value
                    })} placeholder={modalCopy.namePlaceholder} required />
                      </div>

                      <div className={styles.field}>
                        <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="campaign-form-type">
                          {stripRequiredMark(modalCopy.type)}
                        </label>
                        <select id="campaign-form-type" className={styles.input} value={formData.type || "microsoft_security"} onChange={e => patchForm({
                      type: e.target.value
                    })} required disabled>
                          <option value="microsoft_security">{typeLabel}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </> : null}

              {activeSection === "dates" ? <>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>
                      {modalCopy.sections?.dates?.title || modalCopy.startDate}
                    </h3>
                    <p className={styles.sectionDesc}>
                      {modalCopy.sections?.dates?.desc || ""}
                    </p>
                  </div>
                  <div className={styles.fieldGrid2}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="campaign-form-start">
                        {modalCopy.startDate}
                      </label>
                      <input id="campaign-form-start" type="date" className={styles.input} value={formData.start_date || ""} onChange={e => patchForm({
                    start_date: e.target.value
                  })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="campaign-form-end">
                        {modalCopy.endDate}
                      </label>
                      <input id="campaign-form-end" type="date" className={styles.input} value={formData.end_date || ""} onChange={e => patchForm({
                    end_date: e.target.value
                  })} />
                    </div>
                  </div>
                </> : null}

              {activeSection === "details" ? <>
                  <div className={styles.sectionHead}>
                    <h3 className={styles.sectionTitle}>
                      {modalCopy.sections?.details?.title || modalCopy.specificity}
                    </h3>
                    <p className={styles.sectionDesc}>
                      {modalCopy.sections?.details?.desc || ""}
                    </p>
                  </div>
                  {isEditing && statusOptions?.length ? <div className={styles.fieldGrid2}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="campaign-form-status">
                          {modalCopy.status}
                        </label>
                        <select id="campaign-form-status" className={styles.input} value={formData.status || ""} onChange={e => patchForm({
                    status: e.target.value
                  })}>
                          {statusOptions.map(opt => <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>)}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="campaign-form-goal">
                          {modalCopy.adoptionGoal}
                        </label>
                        <input id="campaign-form-goal" type="number" min="0" max="100" className={styles.input} value={formData.objectif_adoption ?? ""} onChange={e => patchForm({
                    objectif_adoption: e.target.value
                  })} placeholder={modalCopy.adoptionGoalPlaceholder} />
                      </div>
                    </div> : null}
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.label} htmlFor="campaign-form-description">
                      {modalCopy.specificity}
                    </label>
                    <textarea id="campaign-form-description" className={styles.textarea} rows={6} value={formData.description || ""} onChange={e => patchForm({
                  description: e.target.value
                })} placeholder={modalCopy.specificityPlaceholder} />
                  </div>
                </> : null}
            </div>
          </div>

          <footer className={styles.footer}>
            <span className={styles.footerHint}>{modalCopy.footerHint}</span>
            <div className={styles.footerActions}>
              {isEditing && onDeleteCampaign ? <button type="button" className={`${styles.ghostBtn} ${styles.footerDeleteBtn}`} onClick={onDeleteCampaign} disabled={saving || deleteLoading}>
                  <Icon icon="mdi:delete-outline" aria-hidden />
                  {deleteLoading ? modalCopy.deleting || copy?.delete?.title || "…" : modalCopy.delete || copy?.delete?.title || "Delete"}
                </button> : null}
              <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving || deleteLoading}>
                {commonCopy.cancel}
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={saving || deleteLoading || !formValid}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {commonCopy.saving}
                  </> : isEditing ? <>
                    <Icon icon="mdi:content-save-outline" aria-hidden />
                    {modalCopy.saveEdit}
                  </> : <>
                    <Icon icon="mdi:check" aria-hidden />
                    {modalCopy.saveCreate}
                  </>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}
