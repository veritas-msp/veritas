import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { addContact, updateContact } from "../../api/clients";
import { showError, showSuccess } from "../../utils/toast";
import { buildContactFormFromInitial, cloneContactFormSnapshot, contactFormsEqual } from "./contactFormConfig";
import { getContactFormSections, getContactFormModalCopy, getContactCivilityCards, validateContactCommunicationsLocalized } from "./contactFormModalI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { enforcePrimaryCommunications, syncLegacyContactFields, hasIncompleteCommunications, normalizeContactCommunications, getPrimaryCommunicationValue } from "../../utils/contactCommunications";
import { getPortalStatusFromContact } from "../../api/contactPortal";
import ContactCommunicationsEditor from "./ContactCommunicationsEditor";
import ContactPortalEmailChangeModal from "./ContactPortalEmailChangeModal";
function resolvePrimaryEmail(source) {
  const list = normalizeContactCommunications(source || {});
  return getPrimaryCommunicationValue(list, "email") || String(source?.email || "").trim();
}
function getClientLabel(client, copy) {
  if (!client) return "";
  return client.name || copy.getClientLabel(client.id);
}
export default function ContactFormModal({
  open = true,
  initialContact = null,
  clients = [],
  defaultClientId = null,
  fixedClientId = null,
  lockedEnterpriseLabel = "",
  draftMode = false,
  hideEnterpriseSection = false,
  stacked = false,
  onClose,
  onSuccess,
  onDraftSave
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const copy = useMemo(() => getContactFormModalCopy(locale), [locale]);
  const formSections = useMemo(() => getContactFormSections(locale), [locale]);
  const civilityCards = useMemo(() => getContactCivilityCards(locale), [locale]);
  const isEditing = Boolean(initialContact?.id);
  const [form, setForm] = useState(() => buildContactFormFromInitial(initialContact, fixedClientId ?? defaultClientId));
  const [initialSnapshot, setInitialSnapshot] = useState(() => cloneContactFormSnapshot(buildContactFormFromInitial(initialContact, fixedClientId ?? defaultClientId)));
  const [activeSection, setActiveSection] = useState("identity");
  const [saving, setSaving] = useState(false);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [portalEmailConfirm, setPortalEmailConfirm] = useState(null);
  const enterpriseAutocompleteRef = useRef(null);
  const lockedClientId = fixedClientId ?? null;
  const isEnterpriseLocked = Boolean(lockedClientId || lockedEnterpriseLabel || hideEnterpriseSection);
  const clientList = useMemo(() => Array.isArray(clients) ? clients : [], [clients]);
  const selectedClient = useMemo(() => {
    const id = lockedClientId ?? form.client_id;
    if (!id) return null;
    return clientList.find(c => String(c.id) === String(id)) || null;
  }, [clientList, form.client_id, lockedClientId]);
  const hasChanges = useMemo(() => !contactFormsEqual(form, initialSnapshot), [form, initialSnapshot]);
  useEffect(() => {
    if (!open) return;
    const nextForm = buildContactFormFromInitial(initialContact, lockedClientId ?? defaultClientId);
    setForm(nextForm);
    setInitialSnapshot(cloneContactFormSnapshot(nextForm));
    setActiveSection("identity");
    setEnterpriseDropdownOpen(false);
    setPortalEmailConfirm(null);
  }, [open, initialContact, lockedClientId, defaultClientId]);
  useEffect(() => {
    if (!open) return;
    if (selectedClient) {
      setEnterpriseSearch(getClientLabel(selectedClient, copy));
    } else if (!isEditing) {
      setEnterpriseSearch("");
    }
  }, [open, selectedClient, isEditing]);
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = e => {
      if (enterpriseAutocompleteRef.current && !enterpriseAutocompleteRef.current.contains(e.target)) {
        setEnterpriseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  const visibleSections = useMemo(() => {
    const sections = isEditing ? formSections : formSections.filter(section => section.id !== "status");
    return sections;
  }, [isEditing, formSections]);
  useEffect(() => {
    if (!visibleSections.some(section => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id || "identity");
    }
  }, [activeSection, visibleSections]);
  const patchForm = useCallback(patch => {
    setForm(prev => ({
      ...prev,
      ...patch
    }));
  }, []);
  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    if (!query) return clientList.slice(0, 12);
    return clientList.filter(c => getClientLabel(c, copy).toLowerCase().includes(query)).slice(0, 12);
  }, [clientList, enterpriseSearch, copy]);
  const resolvedClientId = lockedClientId ?? form.client_id ?? null;
  const hasEnterprise = Boolean(resolvedClientId || isEnterpriseLocked);
  const hasEmptyCommunicationDrafts = hasIncompleteCommunications(form.communications);
  const sectionMeta = useMemo(() => ({
    identity: Boolean(form.nom?.trim()),
    coordinates: false,
    enterprise: hasEnterprise,
    status: false
  }), [form.nom, hasEnterprise]);
  const isSectionIncomplete = sectionId => {
    if (sectionId === "identity" && !sectionMeta.identity) return true;
    if (sectionId === "enterprise" && !isEnterpriseLocked && !sectionMeta.enterprise) return true;
    if (sectionId === "coordinates" && hasEmptyCommunicationDrafts) return true;
    return false;
  };
  const validateForm = () => {
    if (!form.nom?.trim()) {
      showError(copy.validation.nameRequired);
      setActiveSection("identity");
      return false;
    }
    if (!hasEnterprise && !draftMode) {
      showError(copy.validation.enterpriseRequired);
      setActiveSection("enterprise");
      return false;
    }
    const commError = validateContactCommunicationsLocalized(form.communications, locale);
    if (commError) {
      showError(commError);
      setActiveSection("coordinates");
      return false;
    }
    return true;
  };
  const performSave = async (payload, primaryEmailChanged) => {
    try {
      setSaving(true);
      if (draftMode) {
        await Promise.resolve(onDraftSave?.(payload));
        showSuccess(copy.successMessage(Boolean(form.id)));
        setPortalEmailConfirm(null);
        onClose?.();
        return;
      }
      if (isEditing) {
        const updated = await updateContact(form.id, payload);
        showSuccess(primaryEmailChanged ? copy.portalEmailSuccess : copy.successUpdate);
        onSuccess?.(updated);
        window.dispatchEvent(new Event("refreshContacts"));
      } else {
        const created = await addContact(payload);
        showSuccess(copy.successCreate);
        onSuccess?.(created);
        window.dispatchEvent(new Event("refreshContacts"));
      }
      setPortalEmailConfirm(null);
      onClose?.();
    } catch (error) {
      showError(error.message || copy.errorSave);
    } finally {
      setSaving(false);
    }
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;
    const preparedCommunications = enforcePrimaryCommunications((form.communications || []).filter(entry => String(entry.value ?? "").trim()));
    const synced = syncLegacyContactFields(preparedCommunications);
    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom?.trim() || null,
      sexe: form.sexe?.trim() || null,
      email: synced.email,
      telephone: synced.telephone,
      communications: synced.communications,
      poste: form.poste?.trim() || null,
      statut: form.statut || "actif",
      client_id: resolvedClientId
    };
    const previousPrimaryEmail = resolvePrimaryEmail(initialSnapshot);
    const nextPrimaryEmail = String(synced.email || "").trim();
    const hasPortalAccount = getPortalStatusFromContact(initialContact) !== "none";
    const primaryEmailChanged = hasPortalAccount && previousPrimaryEmail && nextPrimaryEmail && previousPrimaryEmail.toLowerCase() !== nextPrimaryEmail.toLowerCase();
    if (primaryEmailChanged) {
      setPortalEmailConfirm({
        payload,
        previousPrimaryEmail,
        nextPrimaryEmail
      });
      return;
    }
    await performSave(payload, false);
  };
  const handlePortalEmailConfirm = async () => {
    if (!portalEmailConfirm) return;
    await performSave(portalEmailConfirm.payload, true);
  };
  if (!open) return null;
  const displayName = [form.prenom, form.nom].filter(Boolean).join(" ").trim();
  const modalTitle = draftMode ? copy.draftPrimaryTitle : copy.modalTitle(isEditing);
  const modalSubtitle = draftMode ? copy.draftPrimarySubtitle : copy.modalSubtitle(isEditing);
  const formValid = Boolean(form.nom?.trim()) && (draftMode || hasEnterprise) && !hasEmptyCommunicationDrafts;
  const submitDisabled = saving || !formValid || isEditing && !hasChanges && !draftMode;
  const renderSectionContent = () => {
    const section = visibleSections.find(s => s.id === activeSection);
    switch (activeSection) {
      case "identity":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <div className={styles.fieldGrid2}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label} id="contact-form-sexe-label">
                  {copy.civility}
                </span>
                <div className={styles.modulesGrid} role="group" aria-labelledby="contact-form-sexe-label">
                  {civilityCards.map(option => {
                  const isActive = form.sexe === option.value;
                  return <button key={option.value} type="button" className={`${styles.moduleTile} ${isActive ? styles.moduleTileActive : ""}`} onClick={() => patchForm({
                    sexe: isActive ? "" : option.value
                  })} aria-pressed={isActive}>
                        {isActive && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                        <Icon icon={option.icon} className={styles.moduleTileIcon} aria-hidden />
                        <span className={styles.moduleTileLabel}>{option.label}</span>
                      </button>;
                })}
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="contact-form-prenom">
                  {copy.firstName}
                </label>
                <input id="contact-form-prenom" type="text" className={styles.input} value={form.prenom || ""} onChange={e => patchForm({
                prenom: e.target.value
              })} placeholder={copy.firstNamePlaceholder} autoFocus={!isEditing} />
              </div>
              <div className={styles.field}>
                <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="contact-form-nom">
                  {copy.lastName}
                </label>
                <input id="contact-form-nom" type="text" className={styles.input} value={form.nom || ""} onChange={e => patchForm({
                nom: e.target.value
              })} placeholder={copy.lastNamePlaceholder} autoFocus={isEditing} required />
              </div>
            </div>
          </>;
      case "coordinates":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <ContactCommunicationsEditor communications={form.communications || []} onChange={communications => patchForm({
            communications
          })} />
          </>;
      case "enterprise":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            {isEnterpriseLocked ? <p className={styles.hint}>{copy.enterpriseLockedHint}</p> : <p className={styles.hint}>{copy.enterpriseHint}</p>}
            <div className={styles.fieldStack}>
              <div className={styles.field}>
                {isEnterpriseLocked ? <>
                    <label className={styles.label}>{copy.enterpriseLabel}</label>
                    <input type="text" className={styles.input} value={lockedClientId ? getClientLabel(selectedClient, copy) || copy.currentClient : lockedEnterpriseLabel || copy.enterprisePendingName} readOnly disabled />
                  </> : <>
                    <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="contact-form-enterprise">
                      {copy.enterpriseLabel}
                    </label>
                    <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                      <input id="contact-form-enterprise" type="text" className={styles.input} placeholder={copy.searchEnterprise} value={enterpriseSearch} onChange={e => {
                    setEnterpriseSearch(e.target.value);
                    patchForm({
                      client_id: null
                    });
                    setEnterpriseDropdownOpen(true);
                  }} onFocus={() => setEnterpriseDropdownOpen(true)} autoComplete="off" />
                      {enterpriseDropdownOpen && <div className={styles.dropdown}>
                          {filteredClients.length === 0 ? <div className={styles.dropdownEmpty}>
                              {copy.noEnterprise}
                            </div> : filteredClients.map(client => <button key={client.id} type="button" className={`${styles.dropdownOption} ${String(form.client_id) === String(client.id) ? styles.dropdownOptionSelected : ""}`} onClick={() => {
                      patchForm({
                        client_id: client.id
                      });
                      setEnterpriseSearch(getClientLabel(client, copy));
                      setEnterpriseDropdownOpen(false);
                    }}>
                                {getClientLabel(client)}
                              </button>)}
                        </div>}
                    </div>
                  </>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="contact-form-poste">
                  {copy.posteLabel}
                </label>
                <input id="contact-form-poste" type="text" className={styles.input} value={form.poste || ""} onChange={e => patchForm({
                poste: e.target.value
              })} placeholder={copy.postePlaceholder} />
              </div>
            </div>
          </>;
      case "status":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <div className={styles.modulesGrid}>
              <button type="button" className={`${styles.moduleTile} ${form.statut === "actif" ? styles.moduleTileActive : ""}`} onClick={() => patchForm({
              statut: "actif"
            })} aria-pressed={form.statut === "actif"}>
                {form.statut === "actif" && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                <Icon icon="mdi:account-check-outline" className={styles.moduleTileIcon} aria-hidden />
                <span className={styles.moduleTileLabel}>{copy.statutActive}</span>
              </button>
              <button type="button" className={`${styles.moduleTile} ${form.status === "inactif" ? styles.moduleTileActive : ""}`} onClick={() => patchForm({
              statut: "inactive"
            })} aria-pressed={form.statut === "inactive"}>
                {form.statut === "inactive" && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                <Icon icon="mdi:account-off-outline" className={styles.moduleTileIcon} aria-hidden />
                <span className={styles.moduleTileLabel}>{copy.statutInactive}</span>
              </button>
            </div>
            <p className={styles.modulesSummary}>{copy.statusInactiveHint}</p>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={`${styles.overlay} ${stacked ? styles.overlayStacked : ""}`} onClick={portalEmailConfirm || saving ? undefined : onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="contact-form-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon={isEditing ? "mdi:account-edit-outline" : "mdi:account-plus-outline"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={styles.title} id="contact-form-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving || Boolean(portalEmailConfirm)} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label={copy.navAria}>
            {visibleSections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={`${styles.navItemLabel} ${isSectionIncomplete(section.id) ? styles.navItemLabelRequired : ""}`}>
                    {section.label}
                  </span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {section.id === "identity" && sectionMeta.identity && <span className={styles.navBadge}>✓</span>}
                {section.id === "enterprise" && sectionMeta.enterprise && <span className={styles.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={styles.content}>{renderSectionContent()}</div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {isEditing && (hasChanges ? copy.footerUnsaved : copy.footerNoChanges)}
          </span>
          <div className={styles.footerActions}>
            <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleSubmit} disabled={submitDisabled}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {commonCopy.saving}
                </> : isEditing ? <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {commonCopy.save}
                </> : draftMode ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {copy.validateContact}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {copy.createContact}
                </>}
            </button>
          </div>
        </footer>
        <ContactPortalEmailChangeModal embedded open={Boolean(portalEmailConfirm)} previousEmail={portalEmailConfirm?.previousPrimaryEmail || ""} nextEmail={portalEmailConfirm?.nextPrimaryEmail || ""} saving={saving} onClose={() => {
        if (saving) return;
        setPortalEmailConfirm(null);
      }} onConfirm={handlePortalEmailConfirm} />
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
