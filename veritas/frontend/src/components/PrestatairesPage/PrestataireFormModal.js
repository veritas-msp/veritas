import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { addPrestataire, updatePrestataire } from "../../api/prestataires";
import { showError, showSuccess } from "../../utils/toast";
import {
  buildPrestataireFormFromInitial,
  clonePrestataireFormSnapshot,
  createEmptyPrestataireContact,
  prestataireFormsEqual
} from "./prestataireFormConfig";
import {
  getPrestataireFormSections,
  getPrestataireFormModalCopy,
  interpolate
} from "./prestataireFormModalI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import {
  UiKitButton,
  UiKitField,
  UiKitInput,
  UiKitTextarea,
  uiKitLayoutsStyles as kit,
  useFinderNavIndicator
} from "../UiKit";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";

const ENTERPRISE_DROPDOWN_MAX_HEIGHT = 220;

function getClientLabel(client, copy) {
  if (!client) return "";
  return client.name || copy.getClientLabel(client.id);
}

function membershipClientId(row) {
  return row?.client_id ?? row?.id ?? null;
}

function buildMembershipsFromInitial(initialPrestataire, fixedClientId, clientList) {
  const fromClients = Array.isArray(initialPrestataire?.clients) ? initialPrestataire.clients : [];
  let memberships = fromClients.map(row => {
    const clientId = membershipClientId(row);
    if (!clientId) return null;
    const listed = clientList.find(c => String(c.id) === String(clientId));
    return {
      client_id: clientId,
      name: row.name || row.client_name || listed?.name || ""
    };
  }).filter(Boolean);

  if (memberships.length === 0 && fixedClientId) {
    const listed = clientList.find(c => String(c.id) === String(fixedClientId));
    memberships = [{
      client_id: fixedClientId,
      name: listed?.name || ""
    }];
  }

  if (fixedClientId && !memberships.some(m => String(m.client_id) === String(fixedClientId))) {
    const listed = clientList.find(c => String(c.id) === String(fixedClientId));
    memberships = [...memberships, {
      client_id: fixedClientId,
      name: listed?.name || ""
    }];
  }

  return memberships;
}

function serializeMemberships(list) {
  return (Array.isArray(list) ? list : [])
    .map(m => String(m.client_id))
    .sort()
    .join("|");
}

export default function PrestataireFormModal({
  open = true,
  initialPrestataire = null,
  clients = [],
  fixedClientId = null,
  hideEnterpriseSection = false,
  onClose,
  onSuccess
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const copy = useMemo(() => getPrestataireFormModalCopy(locale), [locale]);
  const formSections = useMemo(() => getPrestataireFormSections(locale), [locale]);
  const isEditing = Boolean(initialPrestataire?.id);
  const lockedClientId = fixedClientId ?? null;
  const isEnterpriseLocked = Boolean(lockedClientId || hideEnterpriseSection);
  const clientList = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);

  const [form, setForm] = useState(() => buildPrestataireFormFromInitial(initialPrestataire));
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    clonePrestataireFormSnapshot(buildPrestataireFormFromInitial(initialPrestataire))
  );
  const [memberships, setMemberships] = useState(() =>
    buildMembershipsFromInitial(initialPrestataire, lockedClientId, clientList)
  );
  const [initialMembershipsSnapshot, setInitialMembershipsSnapshot] = useState(() =>
    serializeMemberships(buildMembershipsFromInitial(initialPrestataire, lockedClientId, clientList))
  );
  const [activeSection, setActiveSection] = useState("identity");
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, open]);
  const [saving, setSaving] = useState(false);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [enterpriseDropdownStyle, setEnterpriseDropdownStyle] = useState(null);
  const enterpriseAutocompleteRef = useRef(null);
  const enterpriseDropdownRef = useRef(null);

  const formSessionKey = `${initialPrestataire?.id ?? "new"}|${lockedClientId ?? ""}`;
  const lastFormSessionKeyRef = useRef(null);

  const hasChanges = useMemo(() => {
    const formChanged = !prestataireFormsEqual(form, initialSnapshot);
    const membershipsChanged = serializeMemberships(memberships) !== initialMembershipsSnapshot;
    return formChanged || membershipsChanged;
  }, [form, initialSnapshot, memberships, initialMembershipsSnapshot]);

  useEffect(() => {
    if (!open) {
      lastFormSessionKeyRef.current = null;
      return;
    }
    if (lastFormSessionKeyRef.current === formSessionKey) return;
    lastFormSessionKeyRef.current = formSessionKey;
    const nextForm = buildPrestataireFormFromInitial(initialPrestataire);
    const nextMemberships = buildMembershipsFromInitial(initialPrestataire, lockedClientId, clientList);
    setForm(nextForm);
    setInitialSnapshot(clonePrestataireFormSnapshot(nextForm));
    setMemberships(nextMemberships);
    setInitialMembershipsSnapshot(serializeMemberships(nextMemberships));
    setActiveSection("identity");
    setEnterpriseDropdownOpen(false);
    setEnterpriseSearch("");
  }, [open, formSessionKey, initialPrestataire, lockedClientId, clientList]);

  useEffect(() => {
    if (!open || clientList.length === 0) return;
    setMemberships(prev => {
      let changed = false;
      const next = prev.map(m => {
        if (m.name) return m;
        const listed = clientList.find(c => String(c.id) === String(m.client_id));
        if (!listed?.name) return m;
        changed = true;
        return { ...m, name: listed.name };
      });
      return changed ? next : prev;
    });
  }, [open, clientList]);

  useEffect(() => {
    if (!open || !enterpriseDropdownOpen) return undefined;
    const handleClickOutside = e => {
      const target = e.target;
      if (enterpriseAutocompleteRef.current?.contains(target) || enterpriseDropdownRef.current?.contains(target)) {
        return;
      }
      setEnterpriseDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, enterpriseDropdownOpen]);

  const updateEnterpriseDropdownPosition = useCallback(() => {
    const anchor = enterpriseAutocompleteRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(ENTERPRISE_DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setEnterpriseDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp
        ? { top: rect.top - 4, transform: "translateY(-100%)" }
        : { top: rect.bottom + 4 })
    });
  }, []);

  useLayoutEffect(() => {
    if (!enterpriseDropdownOpen) {
      setEnterpriseDropdownStyle(null);
      return undefined;
    }
    updateEnterpriseDropdownPosition();
    return undefined;
  }, [enterpriseDropdownOpen, updateEnterpriseDropdownPosition]);

  useEffect(() => {
    if (!enterpriseDropdownOpen) return undefined;
    const onReposition = () => updateEnterpriseDropdownPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [enterpriseDropdownOpen, updateEnterpriseDropdownPosition]);

  const visibleSections = useMemo(() => {
    let sections = formSections.filter(section => section.id !== "status");
    if (hideEnterpriseSection) {
      sections = sections.filter(section => section.id !== "enterprise");
    }
    return sections;
  }, [formSections, hideEnterpriseSection]);

  useEffect(() => {
    if (!visibleSections.some(section => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id || "identity");
    }
  }, [activeSection, visibleSections]);

  const patchForm = useCallback(patch => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  const selectedClientIds = useMemo(
    () => new Set(memberships.map(m => String(m.client_id))),
    [memberships]
  );

  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    const available = clientList.filter(c => !selectedClientIds.has(String(c.id)));
    if (!query) return available.slice(0, 12);
    return available
      .filter(c => getClientLabel(c, copy).toLowerCase().includes(query))
      .slice(0, 12);
  }, [clientList, enterpriseSearch, copy, selectedClientIds]);

  const lockedClient = useMemo(() => {
    if (!lockedClientId) return null;
    return clientList.find(c => String(c.id) === String(lockedClientId)) || null;
  }, [clientList, lockedClientId]);

  const sectionMeta = useMemo(() => ({
    identity: Boolean(form.nom?.trim()),
    contacts: Array.isArray(form.contacts) && form.contacts.length > 0,
    coordinates: false,
    enterprise: memberships.length > 0 || Boolean(lockedClientId),
    status: false
  }), [form.nom, form.contacts, memberships.length, lockedClientId]);

  const isSectionIncomplete = sectionId => {
    if (sectionId === "identity" && !sectionMeta.identity) return true;
    return false;
  };

  const addContact = useCallback(() => {
    setForm(prev => ({
      ...prev,
      contacts: [...(Array.isArray(prev.contacts) ? prev.contacts : []), createEmptyPrestataireContact()]
    }));
  }, []);

  const patchContact = useCallback((key, patch) => {
    setForm(prev => ({
      ...prev,
      contacts: (Array.isArray(prev.contacts) ? prev.contacts : []).map(contact =>
        contact._key === key ? { ...contact, ...patch } : contact
      )
    }));
  }, []);

  const removeContact = useCallback(key => {
    setForm(prev => ({
      ...prev,
      contacts: (Array.isArray(prev.contacts) ? prev.contacts : []).filter(contact => contact._key !== key)
    }));
  }, []);

  const addMembership = useCallback(client => {
    if (!client?.id) return;
    setMemberships(prev => {
      if (prev.some(m => String(m.client_id) === String(client.id))) return prev;
      return [...prev, {
        client_id: client.id,
        name: getClientLabel(client, copy)
      }];
    });
    setEnterpriseSearch("");
    setEnterpriseDropdownOpen(false);
  }, [copy]);

  const removeMembership = useCallback(clientId => {
    if (lockedClientId && String(clientId) === String(lockedClientId)) return;
    setMemberships(prev => prev.filter(m => String(m.client_id) !== String(clientId)));
  }, [lockedClientId]);

  const validateForm = () => {
    if (!form.nom?.trim()) {
      showError(copy.validation.nameRequired);
      setActiveSection("identity");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    let nextMemberships = memberships.map(m => ({ client_id: m.client_id }));
    if (lockedClientId && !nextMemberships.some(m => String(m.client_id) === String(lockedClientId))) {
      nextMemberships = [...nextMemberships, { client_id: lockedClientId }];
    }
    const contacts = (Array.isArray(form.contacts) ? form.contacts : [])
      .map(contact => ({
        nom: contact.nom?.trim() || null,
        prenom: contact.prenom?.trim() || null,
        email: contact.email?.trim() || null,
        telephone: contact.telephone?.trim() || null
      }))
      .filter(contact => contact.nom || contact.prenom || contact.email || contact.telephone);
    const payload = {
      nom: form.nom.trim(),
      type: form.type?.trim() || null,
      site_web: form.site_web?.trim() || null,
      adresse: form.adresse?.trim() || null,
      statut: form.statut || "actif",
      contacts,
      memberships: nextMemberships
    };
    try {
      setSaving(true);
      if (isEditing) {
        const updated = await updatePrestataire(form.id, payload);
        showSuccess(copy.successUpdate);
        onSuccess?.(updated);
        window.dispatchEvent(new Event("refreshPrestataires"));
      } else {
        const created = await addPrestataire(payload);
        showSuccess(copy.successCreate);
        onSuccess?.(created);
        window.dispatchEvent(new Event("refreshPrestataires"));
      }
      onClose?.();
    } catch (error) {
      showError(error.message || copy.errorSave);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const formValid = Boolean(form.nom?.trim());
  const submitDisabled = saving || !formValid || (isEditing && !hasChanges);

  const renderSectionContent = () => {
    const section = visibleSections.find(s => s.id === activeSection);
    switch (activeSection) {
      case "identity":
        return <div className={styles.sectionFill}>
          <div className={`${styles.sectionHead} ${styles.sectionPinned}`}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
          </div>
          <div className={styles.sectionScroll}>
            <div className={styles.fieldGrid2}>
              <UiKitField label={copy.nameLabel} htmlFor="prestataire-form-nom" required full className={styles.fieldFull}>
                <UiKitInput
                  id="prestataire-form-nom"
                  type="text"
                  value={form.nom || ""}
                  onChange={e => patchForm({ nom: e.target.value })}
                  placeholder={copy.namePlaceholder}
                  autoFocus
                  required
                />
              </UiKitField>
              <UiKitField label={copy.typeLabel} htmlFor="prestataire-form-type" full className={styles.fieldFull}>
                <UiKitInput
                  id="prestataire-form-type"
                  type="text"
                  value={form.type || ""}
                  onChange={e => patchForm({ type: e.target.value })}
                  placeholder={copy.typePlaceholder}
                />
              </UiKitField>
            </div>
          </div>
        </div>;
      case "contacts":
        return <div className={styles.sectionFill}>
          <div className={`${styles.sectionHead} ${styles.sectionPinned}`}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
          </div>
          <div className={styles.sectionPinned}>
            <UiKitButton type="button" variant="secondary" onClick={addContact} icon="mdi:account-plus-outline">
              {copy.addContact}
            </UiKitButton>
          </div>
          <div className={styles.sectionScroll}>
            {(Array.isArray(form.contacts) ? form.contacts : []).length === 0 ? (
              <p className={styles.hint}>{copy.emptyContacts}</p>
            ) : (
              (form.contacts || []).map((contact, index) => (
                <div key={contact._key} className={styles.membershipRow}>
                  <div className={styles.membershipRowMain}>
                    <span className={styles.membershipRowName}>
                      {interpolate(copy.contactCardTitle, { index: index + 1 })}
                    </span>
                    <UiKitButton
                      type="button"
                      square
                      variant="secondary"
                      onClick={() => removeContact(contact._key)}
                      aria-label={copy.removeContactAria}
                      icon="mdi:close"
                    />
                  </div>
                  <div className={styles.fieldGrid2} style={{ marginTop: "0.65rem" }}>
                    <UiKitField label={copy.contactFirstName}>
                      <UiKitInput
                        type="text"
                        value={contact.prenom || ""}
                        onChange={e => patchContact(contact._key, { prenom: e.target.value })}
                        placeholder={copy.contactFirstNamePlaceholder}
                      />
                    </UiKitField>
                    <UiKitField label={copy.contactLastName}>
                      <UiKitInput
                        type="text"
                        value={contact.nom || ""}
                        onChange={e => patchContact(contact._key, { nom: e.target.value })}
                        placeholder={copy.contactLastNamePlaceholder}
                      />
                    </UiKitField>
                    <UiKitField label={copy.emailLabel}>
                      <UiKitInput
                        type="email"
                        value={contact.email || ""}
                        onChange={e => patchContact(contact._key, { email: e.target.value })}
                        placeholder={copy.emailPlaceholder}
                      />
                    </UiKitField>
                    <UiKitField label={copy.phoneLabel}>
                      <UiKitInput
                        type="tel"
                        value={contact.telephone || ""}
                        onChange={e => patchContact(contact._key, { telephone: e.target.value })}
                        placeholder={copy.phonePlaceholder}
                      />
                    </UiKitField>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>;
      case "coordinates":
        return <div className={styles.sectionFill}>
          <div className={`${styles.sectionHead} ${styles.sectionPinned}`}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
          </div>
          <div className={styles.sectionScroll}>
            <div className={styles.fieldGrid2}>
              <UiKitField label={copy.websiteLabel} htmlFor="prestataire-form-site" full className={styles.fieldFull}>
                <UiKitInput
                  id="prestataire-form-site"
                  type="url"
                  value={form.site_web || ""}
                  onChange={e => patchForm({ site_web: e.target.value })}
                  placeholder={copy.websitePlaceholder}
                />
              </UiKitField>
              <UiKitField label={copy.addressLabel} htmlFor="prestataire-form-adresse" full className={styles.fieldFull}>
                <UiKitTextarea
                  id="prestataire-form-adresse"
                  rows={3}
                  value={form.adresse || ""}
                  onChange={e => patchForm({ adresse: e.target.value })}
                  placeholder={copy.addressPlaceholder}
                />
              </UiKitField>
            </div>
          </div>
        </div>;
      case "enterprise":
        return <div className={styles.sectionFill}>
          <div className={`${styles.sectionHead} ${styles.sectionPinned}`}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
          </div>
          {isEnterpriseLocked ? (
            <div className={styles.sectionPinned}>
              <UiKitField label={copy.companiesLabel}>
                <UiKitInput
                  type="text"
                  value={getClientLabel(lockedClient, copy) || copy.currentClient}
                  readOnly
                  disabled
                />
              </UiKitField>
            </div>
          ) : (
            <>
              <div className={styles.sectionPinned}>
                <UiKitField label={copy.addCompany} htmlFor="prestataire-form-enterprise">
                  <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                    <UiKitInput
                      id="prestataire-form-enterprise"
                      type="text"
                      placeholder={copy.searchEnterprise}
                      value={enterpriseSearch}
                      onChange={e => {
                        setEnterpriseSearch(e.target.value);
                        setEnterpriseDropdownOpen(true);
                      }}
                      onFocus={() => setEnterpriseDropdownOpen(true)}
                      autoComplete="off"
                    />
                  </div>
                </UiKitField>
                {enterpriseDropdownOpen
                  ? createPortal(
                    <div
                      ref={enterpriseDropdownRef}
                      className={styles.dropdownPortal}
                      style={enterpriseDropdownStyle || {
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: 280,
                        visibility: "hidden",
                        pointerEvents: "none",
                        zIndex: getModalDropdownZIndex()
                      }}
                      role="listbox"
                    >
                      {filteredClients.length === 0 ? (
                        <div className={styles.dropdownEmpty}>{copy.noEnterprise}</div>
                      ) : (
                        filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            className={styles.dropdownOption}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => addMembership(client)}
                          >
                            {getClientLabel(client, copy)}
                          </button>
                        ))
                      )}
                    </div>,
                    document.body
                  )
                  : null}
              </div>
              <div className={styles.sectionScroll}>
                {memberships.length > 0 ? (
                  <div className={styles.membershipList}>
                    {memberships.map(membership => {
                      const label = membership.name || copy.getClientLabel(membership.client_id);
                      return (
                        <div key={membership.client_id} className={styles.membershipRow}>
                          <div className={styles.membershipRowMain}>
                            <span className={styles.membershipRowName}>{label}</span>
                            <button
                              type="button"
                              className={styles.membershipRemoveBtn}
                              onClick={() => removeMembership(membership.client_id)}
                              aria-label={interpolate(copy.removeCompanyAria, { name: label })}
                            >
                              <Icon icon="mdi:close" aria-hidden />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.hint}>{copy.noEnterprise}</p>
                )}
              </div>
            </>
          )}
        </div>;
      default:
        return null;
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="prestataire-form-modal-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon={isEditing ? "mdi:handshake" : "mdi:handshake-outline"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={styles.title} id="prestataire-form-modal-title">
                {copy.modalTitle(isEditing)}
              </h2>
            </div>
          </div>
          <div className={styles.headerTrailing}>
            <label className={styles.headerStatusToggle}>
              <span className={styles.headerStatusLabel}>
                {form.statut === "inactif" || form.statut === "inactive"
                  ? copy.statutInactive
                  : copy.statutActive}
              </span>
              <span className={styles.switchWrap}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={!(form.statut === "inactif" || form.statut === "inactive")}
                  onChange={e => patchForm({
                    statut: e.target.checked ? "actif" : "inactif"
                  })}
                  role="switch"
                  aria-checked={!(form.statut === "inactif" || form.statut === "inactive")}
                  disabled={saving}
                />
                <span className={styles.switchTrack} aria-hidden="true">
                  <span className={styles.switchThumb} />
                </span>
              </span>
            </label>
            <UiKitButton
              type="button"
              square
              variant="secondary"
              className={styles.closeBtn}
              onClick={onClose}
              disabled={saving}
              aria-label={copy.close}
              icon="mdi:close"
            />
          </div>
        </header>

        <div className={styles.body}>
          <aside className={`${kit.finderSidebar} ${styles.modalNav}`} aria-label={copy.navAria}>
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
              {visibleSections.map(section => {
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`${kit.finderItem} ${active ? kit.finderItemActive : ""}`}
                    onClick={() => setActiveSection(section.id)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon icon={section.icon} className={kit.finderItemIcon} aria-hidden />
                    <span className={`${kit.finderItemLabel} ${isSectionIncomplete(section.id) ? styles.navItemLabelRequired : ""}`}>
                      {section.label}
                    </span>
                    {section.id === "identity" && sectionMeta.identity ? <span className={styles.navBadge}>✓</span> : null}
                    {section.id === "contacts" && sectionMeta.contacts ? <span className={styles.navBadge}>✓</span> : null}
                    {section.id === "enterprise" && sectionMeta.enterprise ? <span className={styles.navBadge}>✓</span> : null}
                  </button>
                );
              })}
            </nav>
          </aside>
          <div className={styles.content} key={activeSection}>
            <div className={kit.contentFadeUp}>{renderSectionContent()}</div>
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {isEditing && (hasChanges ? copy.footerUnsaved : copy.footerNoChanges)}
          </span>
          <div className={styles.footerActions}>
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={submitDisabled}
              icon={saving ? undefined : isEditing ? "mdi:content-save-outline" : "mdi:check"}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {commonCopy.saving}
                </>
              ) : isEditing ? (
                commonCopy.save
              ) : (
                copy.createPrestataire
              )}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
