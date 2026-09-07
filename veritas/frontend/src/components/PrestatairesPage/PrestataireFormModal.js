import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
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
    let sections = formSections;
    if (hideEnterpriseSection) {
      sections = sections.filter(section => section.id !== "enterprise");
    }
    if (!isEditing) {
      sections = sections.filter(section => section.id !== "status");
    }
    return sections;
  }, [formSections, hideEnterpriseSection, isEditing]);

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
        return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          <div className={styles.fieldGrid2}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="prestataire-form-nom">
                {copy.nameLabel}
              </label>
              <input
                id="prestataire-form-nom"
                type="text"
                className={styles.input}
                value={form.nom || ""}
                onChange={e => patchForm({ nom: e.target.value })}
                placeholder={copy.namePlaceholder}
                autoFocus
                required
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="prestataire-form-type">
                {copy.typeLabel}
              </label>
              <input
                id="prestataire-form-type"
                type="text"
                className={styles.input}
                value={form.type || ""}
                onChange={e => patchForm({ type: e.target.value })}
                placeholder={copy.typePlaceholder}
              />
            </div>
          </div>
        </>;
      case "contacts":
        return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          <p className={styles.hint}>{copy.contactsHint}</p>
          <div className={styles.fieldStack}>
            {(Array.isArray(form.contacts) ? form.contacts : []).length === 0 ? (
              <p className={styles.hint}>{copy.emptyContacts}</p>
            ) : (
              (form.contacts || []).map((contact, index) => (
                <div
                  key={contact._key}
                  className={styles.field}
                  style={{
                    border: "1px solid var(--msp-border, #e2e8f0)",
                    borderRadius: "10px",
                    padding: "0.85rem 0.95rem",
                    background: "var(--msp-surface-2, #f7f9fc)"
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    marginBottom: "0.65rem"
                  }}>
                    <span style={{ fontWeight: 700, fontSize: "0.84rem" }}>
                      {interpolate(copy.contactCardTitle, { index: index + 1 })}
                    </span>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => removeContact(contact._key)}
                      aria-label={copy.removeContactAria}
                      style={{ padding: "0.35rem 0.55rem", minHeight: 0 }}
                    >
                      <FaTimes aria-hidden />
                    </button>
                  </div>
                  <div className={styles.fieldGrid2}>
                    <div className={styles.field}>
                      <label className={styles.label}>{copy.contactFirstName}</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={contact.prenom || ""}
                        onChange={e => patchContact(contact._key, { prenom: e.target.value })}
                        placeholder={copy.contactFirstNamePlaceholder}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>{copy.contactLastName}</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={contact.nom || ""}
                        onChange={e => patchContact(contact._key, { nom: e.target.value })}
                        placeholder={copy.contactLastNamePlaceholder}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>{copy.emailLabel}</label>
                      <input
                        type="email"
                        className={styles.input}
                        value={contact.email || ""}
                        onChange={e => patchContact(contact._key, { email: e.target.value })}
                        placeholder={copy.emailPlaceholder}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>{copy.phoneLabel}</label>
                      <input
                        type="tel"
                        className={styles.input}
                        value={contact.telephone || ""}
                        onChange={e => patchContact(contact._key, { telephone: e.target.value })}
                        placeholder={copy.phonePlaceholder}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            <button type="button" className={styles.ghostBtn} onClick={addContact}>
              <Icon icon="mdi:account-plus-outline" aria-hidden />
              {copy.addContact}
            </button>
          </div>
        </>;
      case "coordinates":
        return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          <div className={styles.fieldGrid2}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="prestataire-form-site">
                {copy.websiteLabel}
              </label>
              <input
                id="prestataire-form-site"
                type="url"
                className={styles.input}
                value={form.site_web || ""}
                onChange={e => patchForm({ site_web: e.target.value })}
                placeholder={copy.websitePlaceholder}
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="prestataire-form-adresse">
                {copy.addressLabel}
              </label>
              <textarea
                id="prestataire-form-adresse"
                className={styles.input}
                rows={2}
                value={form.adresse || ""}
                onChange={e => patchForm({ adresse: e.target.value })}
                placeholder={copy.addressPlaceholder}
              />
            </div>
          </div>
        </>;
      case "enterprise":
        return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          {isEnterpriseLocked ? (
            <p className={styles.hint}>{copy.enterpriseLockedHint}</p>
          ) : (
            <p className={styles.hint}>{copy.enterpriseHint}</p>
          )}
          <div className={styles.fieldStack}>
            {isEnterpriseLocked ? (
              <div className={styles.field}>
                <label className={styles.label}>{copy.companiesLabel}</label>
                <input
                  type="text"
                  className={styles.input}
                  value={getClientLabel(lockedClient, copy) || copy.currentClient}
                  readOnly
                  disabled
                />
              </div>
            ) : (
              <>
                {memberships.length > 0 && (
                  <div className={styles.field}>
                    <label className={styles.label}>{copy.companiesLabel}</label>
                    <div className={styles.fieldStack}>
                      {memberships.map(membership => {
                        const label = membership.name || copy.getClientLabel(membership.client_id);
                        return (
                          <div
                            key={membership.client_id}
                            className={styles.field}
                            style={{
                              border: "1px solid var(--msp-border, #e2e8f0)",
                              borderRadius: "10px",
                              padding: "0.75rem 0.9rem",
                              background: "var(--msp-surface-2, #f7f9fc)"
                            }}
                          >
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.75rem"
                            }}>
                              <span style={{ fontWeight: 600 }}>{label}</span>
                              <button
                                type="button"
                                className={styles.ghostBtn}
                                onClick={() => removeMembership(membership.client_id)}
                                aria-label={interpolate(copy.removeCompanyAria, { name: label })}
                                style={{ padding: "0.35rem 0.55rem", minHeight: 0 }}
                              >
                                <FaTimes aria-hidden />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="prestataire-form-enterprise">
                    {copy.addCompany}
                  </label>
                  <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                    <input
                      id="prestataire-form-enterprise"
                      type="text"
                      className={styles.input}
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
              </>
            )}
          </div>
        </>;
      case "status":
        return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          <div className={styles.modulesGrid}>
            <button
              type="button"
              className={`${styles.moduleTile} ${form.statut === "actif" ? styles.moduleTileActive : ""}`}
              onClick={() => patchForm({ statut: "actif" })}
              aria-pressed={form.statut === "actif"}
            >
              {form.statut === "actif" && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
              <Icon icon="mdi:account-check-outline" className={styles.moduleTileIcon} aria-hidden />
              <span className={styles.moduleTileLabel}>{copy.statutActive}</span>
            </button>
            <button
              type="button"
              className={`${styles.moduleTile} ${form.statut === "inactif" ? styles.moduleTileActive : ""}`}
              onClick={() => patchForm({ statut: "inactif" })}
              aria-pressed={form.statut === "inactif"}
            >
              {form.statut === "inactif" && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
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
              <p className={styles.subtitle}>{copy.modalSubtitle(isEditing)}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label={copy.navAria}>
            {visibleSections.map(section => (
              <button
                key={section.id}
                type="button"
                className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`}
                onClick={() => setActiveSection(section.id)}
                aria-current={activeSection === section.id ? "step" : undefined}
              >
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={`${styles.navItemLabel} ${isSectionIncomplete(section.id) ? styles.navItemLabelRequired : ""}`}>
                    {section.label}
                  </span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {section.id === "identity" && sectionMeta.identity && <span className={styles.navBadge}>✓</span>}
                {section.id === "contacts" && sectionMeta.contacts && <span className={styles.navBadge}>✓</span>}
                {section.id === "enterprise" && sectionMeta.enterprise && <span className={styles.navBadge}>✓</span>}
              </button>
            ))}
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
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {commonCopy.saving}
                </>
              ) : isEditing ? (
                <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {commonCopy.save}
                </>
              ) : (
                <>
                  <Icon icon="mdi:check" aria-hidden />
                  {copy.createPrestataire}
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
