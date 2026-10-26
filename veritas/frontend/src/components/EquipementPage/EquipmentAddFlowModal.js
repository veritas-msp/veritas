import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { fetchClientsList, fetchClientGeneral, fetchClientModules } from "../../api/clients";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { EQUIPMENT_MODULE_ICONS, getEquipmentModalsCopy, getEquipmentModuleLabels, interpolate } from "./equipmentModalsI18n";
import { normalizeClientSites } from "../../utils/clientSites";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import flowStyles from "./EquipmentAddFlowModal.module.css";
import EquipmentCategoryTile from "./EquipmentCategoryTile";
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
  const categoryOptions = useMemo(() => {
    const standard = EQUIPMENT_ADD_CATEGORIES.map(catId => ({
      id: catId,
      label: moduleLabels[catId] || catId,
      icon: EQUIPMENT_MODULE_ICONS[catId] || "mdi:cube-outline"
    }));
    const custom = (Array.isArray(customFamilies) ? customFamilies : []).map(family => ({
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
    if (activeSection === "category") {
      return (
        <div className={`${styles.sectionFill} ${flowStyles.categoryStage}`.trim()}>
          <div className={flowStyles.categoryGrid} role="listbox" aria-label={t.categoryHint || t.title}>
            {categoryOptions.map((category, index) => (
              <EquipmentCategoryTile
                key={category.id}
                category={category}
                index={index}
                selected={selectedCategory === category.id}
                disabled={submitting}
                onSelect={handleCategorySelect}
              />
            ))}
          </div>
        </div>
      );
    }
    if (activeSection === "client") {
      return (
        <div className={styles.sectionFill}>
          <div className={styles.sectionScroll}>
            <p className={styles.hint}>
              {categoryLabel
                ? interpolate(t.clientHint, { category: categoryLabel })
                : t.clientHintGeneric}
            </p>
            {loadingClients ? (
              <p className={styles.hint}>{t.loadingClients}</p>
            ) : clients.length === 0 ? (
              <p className={styles.hint}>{t.noClients}</p>
            ) : (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-add-enterprise">
                  {t.enterpriseLabel}
                </label>
                <div className={styles.autocomplete} ref={enterpriseAutocompleteRef}>
                  <input
                    id="equipment-add-enterprise"
                    type="text"
                    className={styles.input}
                    placeholder={t.searchEnterprise}
                    value={enterpriseSearch}
                    onChange={e => {
                      setEnterpriseSearch(e.target.value);
                      setSelectedClient(null);
                      setEnterpriseDropdownOpen(true);
                    }}
                    onFocus={() => setEnterpriseDropdownOpen(true)}
                    disabled={submitting}
                    autoComplete="off"
                  />
                  {enterpriseDropdownOpen ? (
                    <div className={styles.dropdown}>
                      {filteredClients.length === 0 ? (
                        <div className={styles.dropdownEmpty}>{t.noEnterprise}</div>
                      ) : (
                        filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            className={`${styles.dropdownOption} ${String(selectedClient?.id) === String(client.id) ? styles.dropdownOptionSelected : ""}`}
                            onClick={() => {
                              setSelectedClient(client);
                              setEnterpriseSearch(getClientLabel(client, copy.clientPrefix));
                              setEnterpriseDropdownOpen(false);
                            }}
                          >
                            {getClientLabel(client, copy.clientPrefix)}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  return createPortal(<>
    <div className={styles.overlay} onClick={handleOverlayClose} role="presentation">
      <div className={`${styles.shell} ${styles.shellBackup}`.trim()} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="equipment-add-flow-title">
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
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={styles.closeBtn}
            onClick={handleOverlayClose}
            disabled={submitting}
            aria-label={t.close}
            icon="mdi:close"
          />
        </header>

        <div className={`${styles.bodySingle}${activeSection === "category" ? ` ${flowStyles.bodyCategoryPick}` : ""}`}>
          <div
            className={`${styles.content}${activeSection === "category" ? ` ${flowStyles.contentCategoryPick}` : ""}`}
            key={activeSection}
          >
            <div className={kit.contentFadeUp}>{renderSectionContent()}</div>
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {activeSection === "category" ? t.footerCategory : submitting ? t.footerOpening : t.footerClient}
          </span>
          <div className={styles.footerActions}>
            {activeSection === "client" ? (
              <UiKitButton type="button" variant="secondary" onClick={() => setActiveSection("category")} disabled={submitting}>
                {t.back}
              </UiKitButton>
            ) : null}
            <UiKitButton type="button" variant="secondary" onClick={handleOverlayClose} disabled={submitting}>
              {t.cancel}
            </UiKitButton>
            {activeSection === "client" ? (
              <UiKitButton
                type="button"
                variant="primary"
                onClick={handleClientContinue}
                disabled={!selectedClient || !selectedCategory || submitting}
                icon={submitting ? undefined : "mdi:arrow-right"}
              >
                {submitting ? (
                  <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {t.loading}
                  </>
                ) : (
                  t.continue
                )}
              </UiKitButton>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
    <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, document.getElementById("modal-root") || document.body);
}
