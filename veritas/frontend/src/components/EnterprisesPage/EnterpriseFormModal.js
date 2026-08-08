import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import ActivitySectorSelect from "../Misc/ActivitySectorSelect";
import SiretInput from "../Misc/SiretInput";
import { fetchActiveUsers, createUser } from "../../api/users";
import { fetchContactsList, addContact, updateContact } from "../../api/clients";
import API_BASE_URL from "../../config";
import AgentFormModal from "../AdminPage/AgentFormModal";
import SmartTooltip from "../SmartTooltip";
import { buildDefaultAgentDraft, resolveAgentProfileName } from "../AdminPage/adminOrgFormConstants";
import { getEnterpriseFormModalCopy } from "./enterpriseFormModalI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { localizeContractModules } from "../../i18n/contractModuleLabels";
import SitesModal from "./SitesModal";
import SiteMapPreview from "./SiteMapPreview";
import { buildSiteAddress, getSiteDisplayName, getSiteId, normalizeClientSites } from "../../utils/clientSites";
import { createDefaultClientSla } from "../../utils/ticketSlaUtils";
import ContactFormModal from "../ContactsPage/ContactFormModal";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { getPrimaryCommunicationValue, normalizeContactCommunications, primaryContactToFormInitial, buildContactApiPayload } from "../../utils/contactCommunications";
import { emptyPrimaryContact, formatPrimaryContactLabel, getContactSearchText, mapContactToPrimary } from "./enterpriseFormUtils";
import styles from "./EnterpriseFormModal.module.css";
function getCommercialUserLabel(user) {
  if (!user) return "";
  return user.username || user.email || "";
}
function getCommercialId(form) {
  return form?.commercialId || form?.commercial || "";
}
export default function EnterpriseFormModal({
  open,
  mode = "edit",
  form: formProp,
  formData,
  setForm,
  updateFormData,
  updateContratField,
  handleModuleToggle,
  onOpenSitesModal,
  users: usersProp,
  loadingUsers: loadingUsersProp = false,
  enabledModules = [],
  isCommunity = false,
  saving = false,
  hasChanges = true,
  onClose,
  onSubmit,
  onSave,
  onUserCreated,
  onDeleteEnterprise,
  deleteBlockedTooltip = "",
  deleteDisabled = false,
  deleteLoading = false,
  deletionBlocked = false,
  loadingDeletionCheck = false,
  title,
  subtitle
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEnterpriseFormModalCopy(locale), [locale]);
  const localizedEnabledModules = useMemo(() => localizeContractModules(enabledModules, locale), [enabledModules, locale]);
  const isCreate = mode === "create";
  const form = formProp ?? formData;
  const [activeSection, setActiveSection] = useState("identity");
  const [usersLocal, setUsersLocal] = useState([]);
  const [loadingUsersLocal, setLoadingUsersLocal] = useState(false);
  const [commercialSearch, setCommercialSearch] = useState("");
  const [commercialDropdownOpen, setCommercialDropdownOpen] = useState(false);
  const [internalSitesModalOpen, setInternalSitesModalOpen] = useState(false);
  const [usersExtra, setUsersExtra] = useState([]);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentDraft, setAgentDraft] = useState(() => buildDefaultAgentDraft());
  const [agentProfiles, setAgentProfiles] = useState([]);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [loadingAgentProfiles, setLoadingAgentProfiles] = useState(false);
  const [primaryContactModalOpen, setPrimaryContactModalOpen] = useState(false);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const [contactsCatalog, setContactsCatalog] = useState([]);
  const [loadingContactsCatalog, setLoadingContactsCatalog] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(0);
  const commercialAutocompleteRef = useRef(null);
  const contactAutocompleteRef = useRef(null);
  const users = useMemo(() => {
    const base = usersProp ?? usersLocal;
    const byId = new Map(base.map(user => [user.id, user]));
    usersExtra.forEach(user => byId.set(user.id, user));
    return Array.from(byId.values());
  }, [usersProp, usersLocal, usersExtra]);
  const loadingUsers = usersProp ? loadingUsersProp : loadingUsersLocal;
  const visibleSections = useMemo(() => {
    let sections = copy.sections;
    if (isCreate || isCommunity) {
      sections = sections.filter(section => section.id !== "support");
    }
    return sections;
  }, [copy.sections, isCommunity, isCreate]);
  const isSlaCommunityLocked = isCommunity && isCreate;
  useEffect(() => {
    if (!visibleSections.some(section => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id || "identity");
    }
  }, [activeSection, visibleSections]);
  useEffect(() => {
    if (!open) return;
    setActiveSection("identity");
    setInternalSitesModalOpen(false);
    setAgentModalOpen(false);
    setUsersExtra([]);
    setPrimaryContactModalOpen(false);
    setProPromoFeature(null);
    setContactDropdownOpen(false);
    setContactSearch("");
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const loadContacts = async () => {
      setLoadingContactsCatalog(true);
      try {
        const data = await fetchContactsList();
        if (!cancelled) {
          setContactsCatalog(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error chargement contacts:", error);
        if (!cancelled) setContactsCatalog([]);
      } finally {
        if (!cancelled) setLoadingContactsCatalog(false);
      }
    };
    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const primary = form?.primaryContact;
    if (primary?.nom?.trim()) {
      setContactSearch(formatPrimaryContactLabel(primary));
    }
  }, [open, form?.primaryContact?.id, form?.primaryContact?.nom, form?.primaryContact?.prenom, form?.primaryContact?.email, form?.primaryContact?.telephone]);
  useEffect(() => {
    if (!open || !isCreate || usersProp) return;
    let cancelled = false;
    const loadUsers = async () => {
      setLoadingUsersLocal(true);
      try {
        const data = await fetchActiveUsers();
        if (!cancelled) setUsersLocal(data);
      } catch (error) {
        console.error("Error chargement utilisateurs:", error);
      } finally {
        if (!cancelled) setLoadingUsersLocal(false);
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [open, isCreate, usersProp]);
  useEffect(() => {
    if (!open || !form) return;
    const commercialId = getCommercialId(form);
    const user = users.find(u => u.id === commercialId);
    setCommercialSearch(user ? getCommercialUserLabel(user) : "");
    setCommercialDropdownOpen(false);
  }, [open, form, users]);
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = e => {
      if (commercialAutocompleteRef.current && !commercialAutocompleteRef.current.contains(e.target)) {
        setCommercialDropdownOpen(false);
      }
      if (contactAutocompleteRef.current && !contactAutocompleteRef.current.contains(e.target)) {
        setContactDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  const patchForm = useCallback(patch => {
    if (setForm) {
      setForm(prev => ({
        ...prev,
        ...patch
      }));
    } else if (updateFormData) {
      updateFormData({
        ...form,
        ...patch
      });
    }
  }, [setForm, updateFormData, form]);
  const patchContrat = useCallback((field, value) => {
    if (updateContratField) {
      updateContratField(field, value);
    } else if (setForm) {
      setForm(prev => ({
        ...prev,
        contrat: {
          ...prev.contrat,
          [field]: value
        }
      }));
    } else if (updateFormData) {
      updateFormData({
        ...form,
        contrat: {
          ...form.contrat,
          [field]: value
        }
      });
    }
  }, [updateContratField, setForm, updateFormData, form]);
  const toggleModule = useCallback(moduleKey => {
    if (handleModuleToggle) {
      handleModuleToggle(moduleKey);
    } else if (setForm) {
      setForm(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [moduleKey]: !prev.modules?.[moduleKey]
        }
      }));
    } else if (updateFormData) {
      updateFormData({
        ...form,
        modules: {
          ...form.modules,
          [moduleKey]: !form.modules?.[moduleKey]
        }
      });
    }
  }, [handleModuleToggle, setForm, updateFormData, form]);
  const clientSites = useMemo(() => normalizeClientSites(form?.sites), [form?.sites]);
  const openSitesManager = useCallback(() => {
    if (onOpenSitesModal) {
      onOpenSitesModal();
      return;
    }
    setInternalSitesModalOpen(true);
  }, [onOpenSitesModal]);
  const handleInternalSitesSave = useCallback(sites => {
    const normalized = normalizeClientSites(sites);
    if (setForm) {
      setForm(prev => ({
        ...prev,
        sites: normalized
      }));
    } else if (updateFormData) {
      updateFormData({
        ...form,
        sites: normalized
      });
    }
  }, [setForm, updateFormData, form]);
  const handlePrimaryContactDraftSave = useCallback(async draft => {
    const contactId = form?.primaryContact?.id ?? null;
    const contactPayload = buildContactApiPayload({
      nom: draft.nom.trim(),
      prenom: draft.prenom?.trim() || null,
      sexe: draft.sexe?.trim() || null,
      email: draft.email?.trim() || null,
      telephone: draft.telephone?.trim() || null,
      communications: draft.communications,
      poste: draft.poste?.trim() || null,
      statut: draft.statut || "actif",
      client_id: form?.primaryContact?.client_id ?? null
    });
    const saved = contactId ? await updateContact(contactId, contactPayload) : await addContact(contactPayload);
    const primary = mapContactToPrimary(saved);
    if (setForm) {
      setForm(prev => ({
        ...prev,
        primaryContact: primary
      }));
    } else if (updateFormData) {
      updateFormData({
        ...form,
        primaryContact: primary
      });
    }
    setContactsCatalog(prev => {
      const next = prev.filter(row => String(row.id) !== String(saved.id));
      return [saved, ...next];
    });
    setContactSearch(formatPrimaryContactLabel(primary));
    setPrimaryContactModalOpen(false);
    setContactDropdownOpen(false);
    window.dispatchEvent(new Event("refreshContacts"));
  }, [setForm, updateFormData, form]);
  const setPrimaryContact = useCallback(primary => {
    if (setForm) {
      setForm(prev => ({
        ...prev,
        primaryContact: primary
      }));
    } else if (updateFormData) {
      updateFormData({
        ...form,
        primaryContact: primary
      });
    }
  }, [setForm, updateFormData, form]);
  const openPrimaryContactCreateModal = useCallback(() => {
    setPrimaryContactModalOpen(true);
    setContactDropdownOpen(false);
  }, []);
  const selectExistingContact = useCallback(row => {
    const primary = mapContactToPrimary(row);
    setPrimaryContact(primary);
    setContactSearch(formatPrimaryContactLabel(primary));
    setContactDropdownOpen(false);
  }, [setPrimaryContact]);
  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contactsCatalog.slice(0, 50);
    return contactsCatalog.filter(row => getContactSearchText(row).includes(query)).slice(0, 50);
  }, [contactsCatalog, contactSearch]);
  const setCommercialId = useCallback(userId => {
    if (setForm) {
      setForm(prev => ({
        ...prev,
        commercial: userId,
        commercialId: userId
      }));
    } else {
      patchForm({
        commercialId: userId,
        commercial: userId
      });
    }
  }, [setForm, patchForm]);
  const loadAgentProfiles = useCallback(async () => {
    if (agentProfiles.length > 0) return agentProfiles;
    setLoadingAgentProfiles(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profiles`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("profiles");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.profiles || [];
      setAgentProfiles(list);
      return list;
    } catch {
      toast.error(copy.toasts.agentProfilesLoadError);
      return [];
    } finally {
      setLoadingAgentProfiles(false);
    }
  }, [agentProfiles.length, copy.toasts.agentProfilesLoadError]);
  const openCreateAgentModal = useCallback(async () => {
    const profiles = await loadAgentProfiles();
    const defaultProfile = resolveAgentProfileName(profiles);
    const search = commercialSearch.trim();
    const draft = buildDefaultAgentDraft(defaultProfile);
    if (search.includes("@")) {
      draft.email = search;
    } else if (search) {
      draft.username = search;
    }
    setAgentDraft(draft);
    setAgentModalOpen(true);
    setCommercialDropdownOpen(false);
  }, [commercialSearch, loadAgentProfiles]);
  const closeCreateAgentModal = useCallback(() => {
    if (creatingAgent) return;
    setAgentModalOpen(false);
    setAgentDraft(buildDefaultAgentDraft(resolveAgentProfileName(agentProfiles)));
  }, [creatingAgent, agentProfiles]);
  const handleCreateAgent = useCallback(async () => {
    if (!agentDraft.email || !agentDraft.email.includes("@")) {
      toast.error(copy.toasts.invalidEmail);
      return;
    }
    if (agentDraft.password.length < 6) {
      toast.error(copy.toasts.passwordTooShort);
      return;
    }
    if (agentDraft.password !== agentDraft.password2) {
      toast.error(copy.toasts.passwordMismatch);
      return;
    }
    setCreatingAgent(true);
    try {
      const profiles = agentProfiles.length ? agentProfiles : await loadAgentProfiles();
      const profile = agentDraft.profile || resolveAgentProfileName(profiles);
      const created = await createUser({
        email: agentDraft.email.trim(),
        username: agentDraft.username?.trim() || undefined,
        password: agentDraft.password,
        profile,
        is_active: true
      });
      const newUser = {
        id: created.id,
        email: agentDraft.email.trim(),
        username: agentDraft.username?.trim() || "",
        profile,
        is_active: true
      };
      setUsersExtra(prev => [...prev.filter(user => user.id !== newUser.id), newUser]);
      setCommercialSearch(getCommercialUserLabel(newUser));
      setCommercialId(newUser.id);
      onUserCreated?.(newUser);
      toast.success(copy.toasts.agentCreated);
      setAgentModalOpen(false);
      setAgentDraft(buildDefaultAgentDraft(resolveAgentProfileName(profiles)));
    } catch (error) {
      toast.error(error.message || copy.toasts.agentCreateFailed);
    } finally {
      setCreatingAgent(false);
    }
  }, [agentDraft, agentProfiles, loadAgentProfiles, onUserCreated, setCommercialId, copy]);
  const filteredCommercialUsers = useMemo(() => {
    const query = commercialSearch.trim().toLowerCase();
    if (!query) return users.slice(0, 12);
    return users.filter(user => {
      const label = `${user.username || ""} ${user.email || ""}`.toLowerCase();
      return label.includes(query);
    }).slice(0, 12);
  }, [commercialSearch, users]);
  const activeModulesCount = useMemo(() => Object.values(form?.modules || {}).filter(Boolean).length, [form?.modules]);
  const sectionMeta = useMemo(() => {
    const contact = form?.primaryContact || {};
    return {
      identity: Boolean(form?.name?.trim()),
      location: false,
      contact: Boolean(contact.nom?.trim()),
      contract: false,
      modules: activeModulesCount > 0,
      support: Boolean(form?.contrat?.sla?.enabled)
    };
  }, [form, activeModulesCount]);
  const isRequiredSectionIncomplete = sectionId => (sectionId === "identity" || sectionId === "contact") && !sectionMeta[sectionId];
  const patchSlaField = useCallback(updater => {
    const apply = prev => {
      const baseSla = prev.contrat?.sla || createDefaultClientSla();
      const nextSla = typeof updater === "function" ? updater(baseSla) : {
        ...baseSla,
        ...updater
      };
      return {
        ...prev,
        contrat: {
          ...prev.contrat,
          sla: nextSla
        }
      };
    };
    if (setForm) {
      setForm(apply);
    } else if (updateFormData) {
      updateFormData(apply(form));
    }
  }, [setForm, updateFormData, form]);
  if (!open || !form) return null;
  const contact = form.primaryContact || {};
  const commercialId = getCommercialId(form);
  const handlePrimaryAction = onSubmit || onSave;
  const requiredFieldsValid = Boolean(form.name?.trim()) && Boolean(form.primaryContact?.nom?.trim());
  const submitDisabled = saving || !requiredFieldsValid || !isCreate && !hasChanges;
  const deleteButtonDisabled = deleteDisabled || deleteLoading || loadingDeletionCheck || deletionBlocked;
  const deleteTooltip = loadingDeletionCheck ? copy.checkingLinked : deletionBlocked && deleteBlockedTooltip ? deleteBlockedTooltip : null;
  const deleteButton = <button type="button" className={`${styles.ghostBtn} ${styles.footerDeleteBtn} ${deleteButtonDisabled ? styles.footerDeleteBtnDisabled : ""}`} onClick={onDeleteEnterprise} disabled={deleteButtonDisabled}>
      <Icon icon="mdi:delete-outline" aria-hidden />
      {deleteLoading ? copy.deleting : loadingDeletionCheck ? copy.checking : copy.delete}
    </button>;
  const footerHint = !requiredFieldsValid ? copy.footer.requiredHint : activeSection === "contact" && isCreate ? copy.footer.contactAttachHint : activeSection === "support" && isSlaCommunityLocked ? copy.footer.proSlaHint : !isCreate ? hasChanges ? copy.footer.unsavedChanges : copy.footer.noChanges : "";
  const modalTitle = title || copy.formatTitle(isCreate, form.name);
  const modalSubtitle = subtitle || (isCreate ? copy.subtitleCreate : copy.subtitleEdit);
  const f = copy.fields;
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
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-client-number">
                  {f.clientNumber}
                </label>
                <input id="enterprise-form-client-number" type="text" className={styles.input} value={form.clientNumber || ""} onChange={e => patchForm({
                clientNumber: e.target.value.trim()
              })} placeholder={f.clientNumberPlaceholder} inputMode="numeric" />
              </div>
              <div className={styles.field}>
                <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="enterprise-form-name">
                  {f.name}
                </label>
                <input id="enterprise-form-name" type="text" className={styles.input} value={form.name || ""} onChange={e => patchForm({
                name: e.target.value
              })} placeholder={f.namePlaceholder} autoFocus={isCreate} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-siret">
                  {copy.legalIdentifier}
                </label>
                <SiretInput id="enterprise-form-siret" className={styles.input} value={form.siret || ""} onChange={value => patchForm({
                siret: value
              })} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-secteur">
                  {f.sector}
                </label>
                <ActivitySectorSelect id="enterprise-form-secteur" className={styles.input} value={form.secteur || ""} onChange={e => patchForm({
                secteur: e.target.value
              })} />
              </div>
            </div>
          </>;
      case "location":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <div className={styles.fieldGrid3}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-street">
                  {f.address}
                </label>
                <input id="enterprise-form-street" type="text" className={styles.input} value={form.addressStreet || ""} onChange={e => patchForm({
                addressStreet: e.target.value
              })} placeholder={f.addressPlaceholder} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-postal">
                  {f.postalCode}
                </label>
                <input id="enterprise-form-postal" type="text" inputMode="numeric" className={styles.input} value={form.addressPostalCode || ""} onChange={e => patchForm({
                addressPostalCode: e.target.value
              })} placeholder={f.postalPlaceholder} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-city">
                  {f.city}
                </label>
                <input id="enterprise-form-city" type="text" className={styles.input} value={form.addressCity || ""} onChange={e => patchForm({
                addressCity: e.target.value
              })} placeholder={f.cityPlaceholder} />
              </div>
            </div>
            <div className={styles.sitesBlock}>
              <div className={styles.sitesBlockHead}>
                <p className={styles.sitesLabel}>{f.sitesLabel}</p>
                <button type="button" className={styles.manageSitesBtn} onClick={openSitesManager}>
                  <Icon icon="mdi:map-marker-radius" aria-hidden />
                  {copy.formatManageSites(clientSites.length)}
                </button>
              </div>
              {clientSites.length === 0 ? <span className={styles.sectionDesc}>{f.noSites}</span> : <div className={styles.siteSummaryList}>
                  {clientSites.map(site => {
                const address = buildSiteAddress(site);
                return <div key={getSiteId(site)} className={styles.siteSummaryCard}>
                        <div className={styles.siteSummaryText}>
                          <div className={styles.siteSummaryHead}>
                            <strong>{getSiteDisplayName(site)}</strong>
                            {site.isPrimary ? <span className={styles.sitePrimaryBadge}>{f.sitePrimary}</span> : null}
                          </div>
                          {address ? <span>{address}</span> : null}
                        </div>
                        <div className={styles.siteSummaryMap}>
                          <SiteMapPreview latitude={site.latitude} longitude={site.longitude} label={getSiteDisplayName(site)} address={address} compact />
                        </div>
                      </div>;
              })}
                </div>}
            </div>
          </>;
      case "contact":
        {
          const contactComms = normalizeContactCommunications(contact);
          const primaryEmail = getPrimaryCommunicationValue(contactComms, "email") || contact.email || "";
          const primaryPhone = getPrimaryCommunicationValue(contactComms, "telephone") || contact.telephone || "";
          const contactDisplayName = [contact.prenom, contact.nom].filter(Boolean).join(" ");
          return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <p className={styles.hint}>{f.contactHint}</p>
            <div className={styles.fieldStack}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-contact-search">
                  {f.primaryContact}
                </label>
                <div className={styles.autocomplete} ref={contactAutocompleteRef}>
                  <input id="enterprise-form-contact-search" type="text" className={styles.input} placeholder={f.contactSearchPlaceholder} value={contactSearch} disabled={loadingContactsCatalog} autoComplete="off" aria-expanded={contactDropdownOpen} aria-haspopup="listbox" onChange={e => {
                    setContactSearch(e.target.value);
                    setContactDropdownOpen(true);
                    setContactHighlight(0);
                    setPrimaryContact(emptyPrimaryContact());
                  }} onFocus={() => setContactDropdownOpen(true)} onKeyDown={e => {
                    if (!contactDropdownOpen || filteredContacts.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setContactHighlight(index => Math.min(index + 1, filteredContacts.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setContactHighlight(index => Math.max(index - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const picked = filteredContacts[contactHighlight];
                      if (picked) selectExistingContact(picked);
                    } else if (e.key === "Escape") {
                      setContactDropdownOpen(false);
                    }
                  }} />
                  {contactDropdownOpen && <div className={styles.dropdown} role="listbox">
                      {filteredContacts.length === 0 ? <div className={styles.dropdownEmpty}>
                          {loadingContactsCatalog ? f.loadingContacts : f.noContactFound}
                        </div> : filteredContacts.map((row, index) => {
                      const name = [row.prenom, row.nom].filter(Boolean).join(" ") || row.nom;
                      const company = row.client_name || "";
                      return <button key={row.id} type="button" role="option" aria-selected={index === contactHighlight} className={`${styles.dropdownOption} ${index === contactHighlight ? styles.dropdownOptionSelected : ""}`} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setContactHighlight(index)} onClick={() => selectExistingContact(row)}>
                              <span>{name}</span>
                              {company ? <span className={styles.contactOptionMeta}> · {company}</span> : null}
                              {row.email ? <span className={styles.contactOptionMeta}> · {row.email}</span> : null}
                            </button>;
                    })}
                      <button type="button" className={styles.dropdownCreate} onClick={openPrimaryContactCreateModal}>
                        <Icon icon="mdi:account-plus-outline" aria-hidden />
                        {f.createContact}
                      </button>
                    </div>}
                </div>
              </div>

              {contact.nom?.trim() ? <div className={styles.contactSummaryCard}>
                  <strong>{contactDisplayName || contact.nom}</strong>
                  {contact.poste ? <span className={styles.contactSummaryMeta}>{contact.poste}</span> : null}
                  {primaryEmail ? <span className={styles.contactSummaryMeta}>{primaryEmail}</span> : null}
                  {primaryPhone ? <span className={styles.contactSummaryMeta}>{primaryPhone}</span> : null}
                  <button type="button" className={styles.contactSummaryEditBtn} onClick={openPrimaryContactCreateModal}>
                    <Icon icon="mdi:account-edit-outline" aria-hidden />
                    {f.editContact}
                  </button>
                </div> : null}
            </div>
          </>;
        }
      case "contract":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <div className={styles.fieldGrid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-debut">
                  {f.contractStart}
                </label>
                <input id="enterprise-form-debut" type="date" className={styles.input} value={form.contrat?.debut || ""} onChange={e => patchContrat("debut", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="enterprise-form-expiration">
                  {f.contractEnd}
                </label>
                <input id="enterprise-form-expiration" type="date" className={styles.input} value={form.contrat?.expiration || ""} onChange={e => patchContrat("expiration", e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="enterprise-form-commercial">
                {f.commercial}
              </label>
              <div className={styles.autocomplete} ref={commercialAutocompleteRef}>
                  <input id="enterprise-form-commercial" type="text" className={styles.input} placeholder={f.commercialSearchPlaceholder} value={commercialSearch} onChange={e => {
                setCommercialSearch(e.target.value);
                setCommercialDropdownOpen(true);
                setCommercialId("");
              }} onFocus={() => setCommercialDropdownOpen(true)} disabled={loadingUsers} autoComplete="off" />
                  {commercialDropdownOpen && <div className={styles.dropdown}>
                      {filteredCommercialUsers.length === 0 ? <div className={styles.dropdownEmpty}>{f.noAgentFound}</div> : filteredCommercialUsers.map(user => <button key={user.id} type="button" className={`${styles.dropdownOption} ${commercialId === user.id ? styles.dropdownOptionSelected : ""}`} onClick={() => {
                  setCommercialSearch(getCommercialUserLabel(user));
                  setCommercialId(user.id);
                  setCommercialDropdownOpen(false);
                }}>
                            {getCommercialUserLabel(user)}
                            {user.email ? ` · ${user.email}` : ""}
                          </button>)}
                      <button type="button" className={styles.dropdownCreate} onClick={openCreateAgentModal} disabled={loadingAgentProfiles || creatingAgent}>
                        <Icon icon="mdi:account-plus-outline" aria-hidden />
                        {f.createAgent}
                      </button>
                    </div>}
                </div>
            </div>
          </>;
      case "modules":
        return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <div className={styles.modulesGrid}>
              {localizedEnabledModules.map(mod => {
              const key = mod.moduleKey;
              const active = !!form.modules?.[key];
              return <button key={key} type="button" className={`${styles.moduleTile} ${active ? styles.moduleTileActive : ""}`} onClick={() => toggleModule(key)} aria-pressed={active}>
                    {active && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={mod.icon || "mdi:puzzle-outline"} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{mod.label}</span>
                  </button>;
            })}
              {isCommunity ? <button type="button" className={`${styles.moduleTile} ${styles.moduleTileProAdd}`} onClick={() => setProPromoFeature("customContractModules")} aria-label={copy.modules.proAria}>
                  <span className={styles.moduleTileProBadge}>Pro</span>
                  <Icon icon="mdi:plus" className={styles.moduleTileProAddIcon} aria-hidden />
                  <span className={styles.moduleTileLabel}>{copy.modules.proNewService}</span>
                  <span className={styles.moduleTileProHint}>{copy.modules.proCustomServices}</span>
                </button> : null}
            </div>
            <p className={styles.modulesSummary}>
              {copy.formatModulesSummary(activeModulesCount, localizedEnabledModules.length)}
            </p>
          </>;
      case "support":
        {
          const sla = form.contrat?.sla || createDefaultClientSla();
          const previewSla = createDefaultClientSla();
          if (isSlaCommunityLocked) {
            return <>
              <div className={styles.sectionHead}>
                <div className={styles.sectionHeadRow}>
                  <h3 className={styles.sectionTitle}>{section?.label}</h3>
                  <span className={styles.navProBadge}>Pro</span>
                </div>
                <p className={styles.sectionDesc}>{section?.description}</p>
              </div>

              <div className={styles.slaToggleLocked} aria-disabled="true">
                <span className={styles.slaToggleLabel}>{copy.sla.enable}</span>
                <span className={`${styles.switchWrap} ${styles.switchWrapLocked}`} aria-hidden="true">
                  <span className={styles.switchTrack}>
                    <span className={styles.switchThumb} />
                  </span>
                </span>
              </div>

              <div className={styles.slaTableWrap}>
                <table className={`${styles.slaTable} ${styles.slaTablePreview}`}>
                  <thead>
                    <tr>
                      <th>{copy.sla.priority}</th>
                      <th>{copy.sla.firstResponse}</th>
                      <th>{copy.sla.resolution}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copy.slaPriorityEntries.map(([priorityKey, priorityLabel]) => <tr key={priorityKey}>
                        <td>{priorityLabel}</td>
                        <td>{previewSla.byPriority[priorityKey]?.firstResponseHours}</td>
                        <td>{previewSla.byPriority[priorityKey]?.resolutionHours}</td>
                      </tr>)}
                  </tbody>
                </table>
                <p className={styles.slaHint}>{copy.sla.previewHint}</p>
              </div>
            </>;
          }
          return <>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{section?.label}</h3>
              <p className={styles.sectionDesc}>{section?.description}</p>
            </div>
            <label className={styles.slaToggle}>
              <span className={styles.slaToggleLabel}>{copy.sla.enable}</span>
              <span className={styles.switchWrap}>
                <input type="checkbox" className={styles.switchInput} checked={Boolean(sla.enabled)} onChange={e => patchSlaField({
                  enabled: e.target.checked
                })} role="switch" aria-checked={Boolean(sla.enabled)} />
                <span className={styles.switchTrack} aria-hidden="true">
                  <span className={styles.switchThumb} />
                </span>
              </span>
            </label>
            {sla.enabled && <div className={styles.slaTableWrap}>
                <table className={styles.slaTable}>
                  <thead>
                    <tr>
                      <th>{copy.sla.priority}</th>
                      <th>{copy.sla.firstResponse}</th>
                      <th>{copy.sla.resolution}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copy.slaPriorityEntries.map(([priorityKey, priorityLabel]) => <tr key={priorityKey}>
                        <td>{priorityLabel}</td>
                        <td>
                          <input type="number" min="0.25" step="0.25" className={styles.input} value={sla.byPriority?.[priorityKey]?.firstResponseHours ?? ""} onChange={e => patchSlaField(current => ({
                        ...current,
                        byPriority: {
                          ...current.byPriority,
                          [priorityKey]: {
                            ...current.byPriority[priorityKey],
                            firstResponseHours: Number(e.target.value)
                          }
                        }
                      }))} />
                        </td>
                        <td>
                          <input type="number" min="0.25" step="0.25" className={styles.input} value={sla.byPriority?.[priorityKey]?.resolutionHours ?? ""} onChange={e => patchSlaField(current => ({
                        ...current,
                        byPriority: {
                          ...current.byPriority,
                          [priorityKey]: {
                            ...current.byPriority[priorityKey],
                            resolutionHours: Number(e.target.value)
                          }
                        }
                      }))} />
                        </td>
                      </tr>)}
                  </tbody>
                </table>
                <p className={styles.slaHint}>{copy.sla.editHint}</p>
              </div>}
          </>;
        }
      default:
        return null;
    }
  };
  return <>
      {createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="enterprise-form-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:office-building-plus-outline" : "mdi:domain"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={styles.title} id="enterprise-form-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label={copy.navAria}>
            {visibleSections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={`${styles.navItemLabel} ${isRequiredSectionIncomplete(section.id) ? styles.navItemLabelRequired : ""}`}>
                    {section.label}
                  </span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {section.id === "location" && clientSites.length > 0 && <span className={styles.navBadge}>{clientSites.length}</span>}
                {section.id === "modules" && activeModulesCount > 0 && <span className={styles.navBadge}>{activeModulesCount}</span>}
                {section.id === "support" && isSlaCommunityLocked ? <span className={styles.navProBadge}>Pro</span> : null}
                {section.id !== "location" && section.id !== "modules" && section.id !== "support" && sectionMeta[section.id] && <span className={styles.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={styles.content}>{renderSectionContent()}</div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>{footerHint}</span>
          <div className={styles.footerActions}>
            {!isCreate && onDeleteEnterprise ? deleteTooltip ? <SmartTooltip as="span" content={deleteTooltip} className={styles.footerDeleteWrap}>
                  {deleteButton}
                </SmartTooltip> : deleteButton : null}
            <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving || deleteLoading}>
              {copy.cancel}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handlePrimaryAction} disabled={submitDisabled || deleteLoading}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {copy.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {copy.create}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {copy.save}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      {internalSitesModalOpen && !onOpenSitesModal ? <SitesModal sites={clientSites} onSave={handleInternalSitesSave} onClose={() => setInternalSitesModalOpen(false)} /> : null}
      <AgentFormModal open={agentModalOpen} draft={agentDraft} setDraft={setAgentDraft} saving={creatingAgent} profiles={agentProfiles} stacked onClose={closeCreateAgentModal} onSave={handleCreateAgent} />
      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} stacked onClose={() => setProPromoFeature(null)} />
      <ContactFormModal open={primaryContactModalOpen} draftMode hideEnterpriseSection lockedEnterpriseLabel={form?.name?.trim() || ""} fixedClientId={!isCreate && form?.id ? form.id : null} clients={!isCreate && form?.id ? [{
      id: form.id,
      name: form.name || copy.formatTitle(false, form.name)
    }] : []} stacked initialContact={primaryContactToFormInitial(contact)} onClose={() => setPrimaryContactModalOpen(false)} onDraftSave={handlePrimaryContactDraftSave} />
    </>;
}
