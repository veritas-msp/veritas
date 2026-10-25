import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getClientOffice365Credentials, unwrapOffice365CredentialsList } from "../../api/clientOffice365";
import { formatMicrosoftTenantSummary, normalizeMicrosoftTenantCredentials } from "../EnterprisesPage/microsoftTenantSolutionUtils";
import { UiKitButton, UiKitModalNavSectionButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
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
  icon: "mdi:microsoft-office"
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
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
  }, [open]);
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
    icon: "mdi:text-box-outline"
  }, {
    id: "dates",
    label: modalCopy.sections?.dates?.navLabel || modalCopy.startDate,
    description: modalCopy.sections?.dates?.navHint || "",
    icon: "mdi:calendar-range"
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
        const list = unwrapOffice365CredentialsList(response).map(raw => {
          const normalized = normalizeMicrosoftTenantCredentials(raw);
          if (!normalized?.tenantId) return null;
          return {
            id: raw.id || normalized.id,
            ...normalized
          };
        }).filter(Boolean);
        const preferredId = formData?.azure_credential_id;
        const preferredTenant = formData?.tenant_id;
        const credentials = list.find(item => preferredId && String(item.id) === String(preferredId))
          || list.find(item => preferredTenant && item.tenantId === preferredTenant)
          || list[0]
          || null;
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
    return {
      general: generalDone,
      dates: datesDone
    };
  }, [formData, isEditing, microsoftReady]);
  const formValid = Boolean(formData?.client_id && String(formData?.name || "").trim() && formData?.type && (isEditing || microsoftReady));
  if (!open) return null;
  const modalTitle = isEditing ? modalCopy.editTitle : modalCopy.createTitle;
  const modalSubtitle = isEditing ? modalCopy.editSubtitle : modalCopy.createSubtitle;
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
  const renderSectionHead = sectionId => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return null;
    const title =
      sectionId === "general"
        ? modalCopy.sections?.general?.title || modalCopy.sectionTitle
        : modalCopy.sections?.dates?.title || modalCopy.startDate;
    const desc =
      sectionId === "general"
        ? modalCopy.sections?.general?.desc || modalCopy.sectionDesc
        : modalCopy.sections?.dates?.desc || "";
    return (
      <div className={`${styles.sectionHead} ${styles.sectionPinned}`}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <p className={styles.sectionDesc}>{desc}</p>
      </div>
    );
  };
  const renderSectionContent = () => {
    switch (activeSection) {
      case "dates":
        return (
          <div className={styles.sectionFill}>
            {renderSectionHead("dates")}
            <div className={styles.sectionScroll}>
              <div className={styles.fieldGrid2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="campaign-form-start">
                    {modalCopy.startDate}
                  </label>
                  <input
                    id="campaign-form-start"
                    type="date"
                    className={styles.input}
                    value={formData.start_date || ""}
                    onChange={e => patchForm({ start_date: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="campaign-form-end">
                    {modalCopy.endDate}
                  </label>
                  <input
                    id="campaign-form-end"
                    type="date"
                    className={styles.input}
                    value={formData.end_date || ""}
                    onChange={e => patchForm({ end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case "general":
      default:
        return (
          <div className={styles.sectionFill}>
            {renderSectionHead("general")}
            <div className={styles.sectionScroll}>
              <div className={styles.fieldStack}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="campaign-form-enterprise">
                    {stripRequiredMark(modalCopy.enterprise)}
                  </label>
                  {lockClient ? (
                    <input id="campaign-form-enterprise" type="text" className={styles.input} value={lockedClientLabel} readOnly disabled required />
                  ) : (
                    <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                      <input
                        id="campaign-form-enterprise"
                        type="text"
                        className={styles.input}
                        placeholder={modalCopy.enterpriseSearch}
                        value={enterpriseSearch}
                        onChange={e => {
                          setEnterpriseSearch(e.target.value);
                          patchForm({
                            client_id: "",
                            azure_credential_id: "",
                            tenant_id: ""
                          });
                          setEnterpriseDropdownOpen(true);
                        }}
                        onFocus={() => setEnterpriseDropdownOpen(true)}
                        autoComplete="off"
                        required
                      />
                      {enterpriseDropdownOpen ? (
                        <div className={styles.dropdown}>
                          {filteredClients.length === 0 ? (
                            <div className={styles.dropdownEmpty}>{modalCopy.noEnterprise}</div>
                          ) : (
                            filteredClients.map(client => (
                              <button
                                key={client.id}
                                type="button"
                                className={`${styles.dropdownOption} ${String(formData.client_id) === String(client.id) ? styles.dropdownOptionSelected : ""}`}
                                onClick={() => selectClient(client)}
                              >
                                {getClientLabel(client)}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={`${styles.label} ${styles.labelRequired}`}>
                    {stripRequiredMark(modalCopy.provider || modalCopy.type || "Type")}
                  </span>
                  <div className={localStyles.providerList} role="listbox" aria-label={modalCopy.provider || modalCopy.type}>
                    {CAMPAIGN_PROVIDERS.map(provider => {
                      const isSelected = selectedProvider === provider.id;
                      const isComingSoon = provider.status === "comingSoon";
                      return (
                        <button
                          key={provider.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`${localStyles.providerCard} ${isSelected ? localStyles.providerCardSelected : ""} ${isComingSoon || isEditing ? localStyles.providerCardDisabled : ""}`}
                          onClick={() => handleSelectProvider(provider)}
                          disabled={isComingSoon || isEditing}
                          title={isComingSoon ? modalCopy.providerComingSoon : modalCopy[provider.labelKey] || provider.id}
                        >
                          <span className={localStyles.providerCardIcon} aria-hidden>
                            <Icon icon={provider.icon} />
                          </span>
                          <span className={localStyles.providerCardLabel}>
                            {modalCopy[provider.labelKey] || provider.id}
                          </span>
                          {isComingSoon ? (
                            <span className={localStyles.providerBadgeSoon}>
                              {modalCopy.badgeSoon || "Soon"}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formData?.client_id && selectedProvider === "microsoft" ? (
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={`${styles.label} ${styles.labelRequired}`}>
                      {stripRequiredMark(modalCopy.tenant || "Tenant *")}
                    </span>
                    {msCredentialsLoading ? (
                      <p className={localStyles.tenantHint}>{modalCopy.tenantLoading}</p>
                    ) : hasMicrosoftTenant && displayTenantSummary ? (
                      <button
                        type="button"
                        className={`${localStyles.tenantCard} ${microsoftReady || isEditing ? localStyles.tenantCardSelected : ""}`}
                        onClick={selectMicrosoftTenant}
                        disabled={isEditing}
                      >
                        <span className={localStyles.tenantCardIcon} aria-hidden>
                          <Icon icon="mdi:microsoft-azure" />
                        </span>
                        <span className={localStyles.tenantCardMain}>
                          <p className={localStyles.tenantCardTitle}>{displayTenantSummary.label}</p>
                          <p className={localStyles.tenantCardMeta}>
                            {displayTenantSummary.providerName} · {displayTenantSummary.tenantId}
                          </p>
                        </span>
                      </button>
                    ) : (
                      <p className={localStyles.tenantWarning}>
                        {modalCopy.needMicrosoftTenant}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="campaign-form-name">
                    {stripRequiredMark(modalCopy.name)}
                  </label>
                  <input
                    id="campaign-form-name"
                    type="text"
                    className={styles.input}
                    value={formData.name || ""}
                    onChange={e => patchForm({ name: e.target.value })}
                    placeholder={modalCopy.namePlaceholder}
                    required
                  />
                </div>

                {isEditing && statusOptions?.length ? (
                  <div className={styles.fieldGrid2}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="campaign-form-status">
                        {modalCopy.status}
                      </label>
                      <select
                        id="campaign-form-status"
                        className={styles.input}
                        value={formData.status || ""}
                        onChange={e => patchForm({ status: e.target.value })}
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="campaign-form-goal">
                        {modalCopy.adoptionGoal}
                      </label>
                      <input
                        id="campaign-form-goal"
                        type="number"
                        min="0"
                        max="100"
                        className={styles.input}
                        value={formData.objectif_adoption ?? ""}
                        onChange={e => patchForm({ objectif_adoption: e.target.value })}
                        placeholder={modalCopy.adoptionGoalPlaceholder}
                      />
                    </div>
                  </div>
                ) : null}

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor="campaign-form-description">
                    {modalCopy.specificity}
                  </label>
                  <textarea
                    id="campaign-form-description"
                    className={`${styles.input} ${localStyles.textarea}`}
                    rows={5}
                    value={formData.description || ""}
                    onChange={e => patchForm({ description: e.target.value })}
                    placeholder={modalCopy.specificityPlaceholder}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };
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
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={modalCopy.close}
            icon="mdi:close"
          />
        </header>

        <form className={localStyles.form} onSubmit={handleSubmit}>
          <div className={styles.body}>
            <aside className={`${kit.finderSidebar} ${styles.modalNav}`} aria-label={modalCopy.sectionsNavAria}>
              <nav
                ref={navTrackRef}
                className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${styles.modalNavTrack}`}
              >
                {navIndicator.ready ? (
                  <div
                    className={kit.finderNavIndicator}
                    style={{
                      transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                      height: navIndicator.height
                    }}
                    aria-hidden
                  />
                ) : null}
                {sections.map(section => (
                  <UiKitModalNavSectionButton
                    key={section.id}
                    section={section}
                    active={activeSection === section.id}
                    badge={sectionMeta[section.id] ? "✓" : null}
                    onSelect={() => setActiveSection(section.id)}
                    finderItemClass={kit.finderItem}
                    finderItemActiveClass={kit.finderItemActive}
                    finderItemIconClass={kit.finderItemIcon}
                    finderItemLabelClass={kit.finderItemLabel}
                    navBadgeClass={styles.navBadge}
                    navBadgeSlotClass={styles.navBadgeSlot}
                  />
                ))}
              </nav>
            </aside>

            <div className={styles.content}>
              <div className={kit.contentFadeUp} key={activeSection}>
                {renderSectionContent()}
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <span className={styles.footerHint}>{modalCopy.footerHint}</span>
            <div className={styles.footerActions}>
              {isEditing && onDeleteCampaign ? (
                <UiKitButton
                  type="button"
                  variant="ghost"
                  className={styles.footerDeleteBtn}
                  onClick={onDeleteCampaign}
                  disabled={saving || deleteLoading}
                  icon="mdi:delete-outline"
                >
                  {deleteLoading ? modalCopy.deleting || copy?.delete?.title || "…" : modalCopy.delete || copy?.delete?.title || "Delete"}
                </UiKitButton>
              ) : null}
              <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving || deleteLoading}>
                {commonCopy.cancel}
              </UiKitButton>
              <UiKitButton
                type="submit"
                variant="primary"
                disabled={saving || deleteLoading || !formValid}
                icon={saving ? undefined : isEditing ? "mdi:content-save-outline" : "mdi:check"}
              >
                {saving ? (
                  <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {commonCopy.saving}
                  </>
                ) : isEditing ? (
                  modalCopy.saveEdit
                ) : (
                  modalCopy.saveCreate
                )}
              </UiKitButton>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
