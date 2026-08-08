import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchClientsList, fetchClientGeneral, fetchClientModules } from "../../api/clients";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { EQUIPMENT_MODULE_ICONS, getEquipmentAddFlowSections, getEquipmentModalsCopy, getEquipmentModuleLabels, interpolate } from "./equipmentModalsI18n";
import { normalizeClientSites } from "../../utils/clientSites";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
export const EQUIPMENT_ADD_CATEGORIES = [...HARDWARE_TYPE_ORDER];
function getClientLabel(client, clientPrefix = "Client #") {
  if (!client) return "";
  return client.name || `${clientPrefix}${client.id}`;
}
async function enrichClientForEquipmentForm(clientId, baseClient = {}) {
  const [clientGeneral, modulesData] = await Promise.all([fetchClientGeneral(clientId), fetchClientModules(clientId).catch(() => null)]);
  return {
    ...baseClient,
    ...clientGeneral,
    id: clientGeneral?.id ?? baseClient.id ?? clientId,
    name: clientGeneral?.name ?? baseClient.name ?? "",
    sites: normalizeClientSites(clientGeneral?.sites ?? baseClient.sites),
    equipements: modulesData?.equipements ?? baseClient.equipements
  };
}
export default function EquipmentAddFlowModal({
  open,
  prefilledClient = null,
  customFamilies = [],
  onClose,
  onReady,
  onCustomFamilySelect
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const t = copy.addFlow;
  const moduleLabels = useMemo(() => getEquipmentModuleLabels(locale), [locale]);
  const [activeSection, setActiveSection] = useState("category");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);
  const showClientSection = !prefilledClient;
  const sections = useMemo(() => {
    const flowSections = getEquipmentAddFlowSections(locale);
    return showClientSection ? flowSections : flowSections.filter(s => s.id === "category");
  }, [locale, showClientSection]);
  useEffect(() => {
    if (!open) {
      setActiveSection("category");
      setSelectedCategory(null);
      setSelectedClient(null);
      setEnterpriseSearch("");
      setEnterpriseDropdownOpen(false);
      setSubmitting(false);
    }
  }, [open]);
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
  useEffect(() => {
    if (!open || !showClientSection || activeSection !== "client") return;
    const controller = new AbortController();
    setLoadingClients(true);
    fetchClientsList({
      signal: controller.signal
    }).then(all => {
      setClients(Array.isArray(all) ? all : []);
    }).catch(err => {
      if (err?.name !== "AbortError") {
        console.error("Error chargement clients:", err);
        setClients([]);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingClients(false);
    });
    return () => controller.abort();
  }, [open, showClientSection, activeSection]);
  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 15);
    return clients.filter(c => getClientLabel(c, copy.clientPrefix).toLowerCase().includes(query)).slice(0, 15);
  }, [clients, enterpriseSearch, copy.clientPrefix]);
  const sectionMeta = useMemo(() => ({
    category: Boolean(selectedCategory),
    client: Boolean(prefilledClient || selectedClient?.id)
  }), [selectedCategory, prefilledClient, selectedClient]);
  const categoryOptions = useMemo(() => {
    const standard = EQUIPMENT_ADD_CATEGORIES.map(catId => ({
      id: catId,
      label: moduleLabels[catId] || catId,
      icon: EQUIPMENT_MODULE_ICONS[catId] || "mdi:cube-outline"
    }));
    const custom = (Array.isArray(customFamilies) ? customFamilies : []).filter(family => family.displayMode !== "brick").map(family => ({
      id: `Custom:${family.familyKey}`,
      label: family.label,
      icon: family.icon || "mdi:devices"
    }));
    return [...standard, ...custom];
  }, [customFamilies, moduleLabels]);
  const handleCategorySelect = async categoryId => {
    if (String(categoryId).startsWith("Custom:")) {
      const familyKey = categoryId.slice("Custom:".length);
      const family = (Array.isArray(customFamilies) ? customFamilies : []).find(entry => entry.familyKey === familyKey);
      if (family && onCustomFamilySelect) {
        onCustomFamilySelect(family);
        onClose();
      }
      return;
    }
    setSelectedCategory(categoryId);
    if (prefilledClient) {
      setSubmitting(true);
      try {
        onReady(categoryId, prefilledClient);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setActiveSection("client");
  };
  const handleClientContinue = async () => {
    if (!selectedClient?.id || !selectedCategory || submitting) return;
    setSubmitting(true);
    try {
      const enrichedClient = await enrichClientForEquipmentForm(selectedClient.id, selectedClient);
      onReady(selectedCategory, enrichedClient);
    } catch (err) {
      console.error("Chargement client pour ajout matériel:", err);
      toast.error(t.loadSitesError);
      onReady(selectedCategory, selectedClient);
    } finally {
      setSubmitting(false);
    }
  };
  const hasUnsavedChanges = Boolean(selectedCategory || selectedClient || enterpriseSearch.trim());
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open,
    onClose,
    hasUnsavedChanges,
    blocked: submitting
  });
  const handleOverlayClose = requestClose;
  if (!open) return null;
  const categoryLabel = moduleLabels[selectedCategory] || selectedCategory || "";
  const renderSectionContent = () => {
    const section = sections.find(s => s.id === activeSection);
    if (activeSection === "category") {
      return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          <p className={styles.hint}>
            {t.categoryHint}
          </p>
          <div className={styles.modulesGrid}>
            {categoryOptions.map(category => <button key={category.id} type="button" className={`${styles.moduleTile} ${selectedCategory === category.id ? styles.moduleTileActive : ""}`} onClick={() => handleCategorySelect(category.id)} disabled={submitting} aria-pressed={selectedCategory === category.id}>
                {selectedCategory === category.id && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                <Icon icon={category.icon || "mdi:cube-outline"} className={styles.moduleTileIcon} aria-hidden />
                <span className={styles.moduleTileLabel}>
                  {category.label}
                </span>
              </button>)}
          </div>
        </>;
    }
    if (activeSection === "client") {
      return <>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>{section?.label}</h3>
            <p className={styles.sectionDesc}>{section?.description}</p>
          </div>
          <p className={styles.hint}>
            {categoryLabel ? interpolate(t.clientHint, {
            category: categoryLabel
          }) : t.clientHintGeneric}
          </p>
          {loadingClients ? <p className={styles.hint}>{t.loadingClients}</p> : clients.length === 0 ? <p className={styles.hint}>
              {t.noClients}
            </p> : <div className={styles.field}>
              <label className={styles.label} htmlFor="equipment-add-enterprise">
                {t.enterpriseLabel}
              </label>
              <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                <input id="equipment-add-enterprise" type="text" className={styles.input} placeholder={t.searchEnterprise} value={enterpriseSearch} onChange={e => {
              setEnterpriseSearch(e.target.value);
              setSelectedClient(null);
              setEnterpriseDropdownOpen(true);
            }} onFocus={() => setEnterpriseDropdownOpen(true)} disabled={submitting} autoComplete="off" />
                {enterpriseDropdownOpen && <div className={styles.dropdown}>
                    {filteredClients.length === 0 ? <div className={styles.dropdownEmpty}>{t.noEnterprise}</div> : filteredClients.map(client => <button key={client.id} type="button" className={`${styles.dropdownOption} ${String(selectedClient?.id) === String(client.id) ? styles.dropdownOptionSelected : ""}`} onClick={() => {
                setSelectedClient(client);
                setEnterpriseSearch(getClientLabel(client, copy.clientPrefix));
                setEnterpriseDropdownOpen(false);
              }}>
                          {getClientLabel(client, copy.clientPrefix)}
                        </button>)}
                  </div>}
              </div>
            </div>}
        </>;
    }
    return null;
  };
  return createPortal(<>
    <div className={styles.overlay} onClick={handleOverlayClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="equipment-add-flow-title">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:plus-circle-outline" />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{t.eyebrow}</p>
              <h2 className={styles.title} id="equipment-add-flow-title">
                {t.title}
              </h2>
              <p className={styles.subtitle}>
                {t.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={handleOverlayClose} disabled={submitting} aria-label={t.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label={t.navAria}>
            {sections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => {
              if (section.id === "client" && !selectedCategory) return;
              setActiveSection(section.id);
            }} disabled={section.id === "client" && !selectedCategory} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={styles.navItemLabel}>{section.label}</span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={styles.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={styles.content}>{renderSectionContent()}</div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {activeSection === "category" ? t.footerCategory : submitting ? t.footerOpening : t.footerClient}
          </span>
          <div className={styles.footerActions}>
            {activeSection === "client" && <button type="button" className={styles.ghostBtn} onClick={() => setActiveSection("category")} disabled={submitting}>
                {t.back}
              </button>}
            <button type="button" className={styles.ghostBtn} onClick={handleOverlayClose} disabled={submitting}>
              {t.cancel}
            </button>
            {activeSection === "client" && <button type="button" className={styles.primaryBtn} onClick={handleClientContinue} disabled={!selectedClient || !selectedCategory || submitting}>
                {submitting ? <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {t.loading}
                  </> : <>
                    <Icon icon="mdi:arrow-right" aria-hidden />
                    {t.continue}
                  </>}
              </button>}
          </div>
        </footer>
      </div>
    </div>
    <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, document.getElementById("modal-root") || document.body);
}
