import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchClientModules } from "../../api/clients";
import { fetchSettings } from "../../api/settings";
import { fetchOvhDomains, getGlobalOvhStatus } from "../../api/clientOvh";
import { showError, showSuccess } from "../../utils/toast";
import { getIconPath } from "../../utils/assetHelper";
import { integrationIconStyle, isIntegrationProLocked, settingsToMap } from "../AdminPage/integrationsCatalog";
import { notifyProFeature } from "../Misc/ProFeature/proFeatureUtils";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { getDomainsModalCopy } from "./domainsConfigModalI18n";
import { interpolate } from "../../i18n/translate";
import { getDnsProvider, getDnsProviderOptions, resolveProviderGlobalConfigured } from "./dnsFormConfig";
import { extractDomainsFromModules, formatDomainSummary, importOvhDomainsForClient, isManualDomain, mapOvhApiDomainToMonitored, normalizeDomainItem, removeMonitoredDomain, saveMonitoredDomains } from "./domainSolutionUtils";
import formStyles from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import dnsStyles from "./DomainsConfigModal.module.css";
import OvhApiGuide from "./integrationGuides/OvhApiGuide";
import SolutionProviderIcon from "./SolutionProviderIcon";
export default function DomainsConfigModal({
  client,
  onClose,
  onSaved,
  initialSection = "overview",
  initialProviderId = null,
  isCommunity = false
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getDomainsModalCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modulesData, setModulesData] = useState(null);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [globalOvhConfigured, setGlobalOvhConfigured] = useState(false);
  const [deletingDomainKey, setDeletingDomainKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ovhDomains, setOvhDomains] = useState([]);
  const [loadingOvhDomains, setLoadingOvhDomains] = useState(false);
  const [selectedOvhDomains, setSelectedOvhDomains] = useState(new Set());
  const [ovhSearch, setOvhSearch] = useState("");
  const [manualForm, setManualForm] = useState({
    nom: "",
    registrar: "",
    expiration: ""
  });
  const [editingDomain, setEditingDomain] = useState(null);
  const domains = useMemo(() => extractDomainsFromModules(modulesData), [modulesData]);
  const dnsProviders = useMemo(() => getDnsProviderOptions(), []);
  const selectedGlobalConfigured = useMemo(() => resolveProviderGlobalConfigured(selectedProviderId, integrationSettings, {
    ovh: globalOvhConfigured
  }), [selectedProviderId, integrationSettings, globalOvhConfigured]);
  const selectedProvider = useMemo(() => getDnsProvider(selectedProviderId), [selectedProviderId]);
  const showProviderGuide = selectedProviderId === "ovh" && !selectedGlobalConfigured;
  const navSections = useMemo(() => copy.navSections({
    selectedProviderId,
    globalConfigured: globalOvhConfigured,
    showProviderGuide
  }), [copy, selectedProviderId, globalOvhConfigured, showProviderGuide]);
  const sectionBadges = useMemo(() => ({
    overview: domains.length > 0,
    provider: Boolean(selectedProviderId),
    import: selectedOvhDomains.size > 0,
    manual: domains.some(domain => isManualDomain(domain))
  }), [domains, selectedProviderId, selectedOvhDomains.size]);
  const filteredOvhDomains = useMemo(() => {
    const q = ovhSearch.trim().toLowerCase();
    if (!q) return ovhDomains;
    return ovhDomains.filter(domain => {
      const name = (domain.domain || domain.name || domain.nom || "").toLowerCase();
      return name.includes(q);
    });
  }, [ovhDomains, ovhSearch]);
  const linkedDomainKeys = useMemo(() => new Set(domains.map(d => (d.nom || "").toLowerCase()).filter(Boolean)), [domains]);
  const selectableOvhDomains = useMemo(() => filteredOvhDomains.filter(domain => {
    const name = (domain.domain || domain.name || domain.nom || "").toLowerCase();
    return name && !linkedDomainKeys.has(name);
  }), [filteredOvhDomains, linkedDomainKeys]);
  const handleSelectAllOvh = () => {
    setSelectedOvhDomains(new Set(selectableOvhDomains.map(d => d.domain || d.name || d.nom)));
  };
  const handleClearOvhSelection = () => {
    setSelectedOvhDomains(new Set());
  };
  const loadData = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [modules, globalStatus, settingsList] = await Promise.all([fetchClientModules(client.id), getGlobalOvhStatus().catch(() => ({
        configured: false
      })), fetchSettings().catch(() => [])]);
      setModulesData(modules);
      setIntegrationSettings(settingsToMap(settingsList));
      setGlobalOvhConfigured(Boolean(globalStatus?.configured));
    } catch (error) {
      console.error(error);
      showError(copy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [client?.id, copy.toasts.loadError]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    setActiveSection(initialSection);
    if (initialSection === "manual") {
      setSelectedProviderId("manual");
    }
  }, [initialSection, client?.id]);
  useEffect(() => {
    if (initialProviderId) {
      setSelectedProviderId(initialProviderId);
    }
  }, [initialProviderId, client?.id]);
  const loadOvhDomains = useCallback(async ({
    refresh = false
  } = {}) => {
    setLoadingOvhDomains(true);
    if (refresh) {
      setOvhDomains([]);
      setSelectedOvhDomains(new Set());
    }
    try {
      const data = await fetchOvhDomains({
        light: true,
        refresh
      });
      const list = Array.isArray(data.domains) ? data.domains : [];
      setOvhDomains(list);
    } catch (error) {
      showError(error.message || copy.toasts.ovhLoadError);
      setOvhDomains([]);
    } finally {
      setLoadingOvhDomains(false);
    }
  }, [copy.toasts.ovhLoadError]);
  useEffect(() => {
    if (activeSection !== "import" || selectedProviderId !== "ovh" || !globalOvhConfigured) return;
    loadOvhDomains();
  }, [activeSection, selectedProviderId, globalOvhConfigured, loadOvhDomains]);
  const handleSelectProvider = provider => {
    if (provider.status === "comingSoon") {
      showError(copy.formatComingSoon(provider.label));
      return;
    }
    if (isIntegrationProLocked(provider.catalogIntegration, isCommunity)) {
      notifyProFeature(provider.label || copy.proFallback);
      return;
    }
    setSelectedProviderId(provider.id);
    if (provider.isManual) {
      setActiveSection("manual");
      return;
    }
    setActiveSection("provider");
  };
  const startEditingDomain = domain => {
    const normalized = normalizeDomainItem(domain);
    if (!normalized) return;
    setEditingDomain(normalized);
    setSelectedProviderId("manual");
    setManualForm({
      nom: normalized.nom || "",
      registrar: normalized.registrar && normalized.registrar !== copy.manualProvider.label ? normalized.registrar : "",
      expiration: normalized.expiration || ""
    });
    setActiveSection("manual");
  };
  const handleSaveManual = async () => {
    const nom = manualForm.nom.trim();
    if (!nom) {
      showError(copy.toasts.domainNameRequired || copy.toasts.domainNotFound);
      return;
    }
    const duplicate = domains.some(entry => (entry.nom || "").trim().toLowerCase() === nom.toLowerCase() && (!editingDomain || (entry.nom || "").trim().toLowerCase() !== (editingDomain.nom || "").trim().toLowerCase()));
    if (duplicate) {
      showError(copy.toasts.domainDuplicate || copy.toasts.importError);
      return;
    }
    setSaving(true);
    try {
      const newDomain = normalizeDomainItem({
        ...(editingDomain || {}),
        providerId: "manual",
        isManual: true,
        nom,
        registrar: manualForm.registrar.trim() || copy.manualProvider.label,
        expiration: manualForm.expiration || ""
      });
      const nextDomains = editingDomain ? domains.map(entry => (entry.nom || "").trim().toLowerCase() === (editingDomain.nom || "").trim().toLowerCase() ? {
        ...entry,
        ...newDomain,
        nom: newDomain.nom
      } : entry) : [...domains, newDomain];
      await saveMonitoredDomains(client.id, nextDomains);
      showSuccess(copy.toasts.manualSaved);
      setManualForm({
        nom: "",
        registrar: "",
        expiration: ""
      });
      setEditingDomain(null);
      setSelectedProviderId("manual");
      await loadData();
      await onSaved?.();
      setActiveSection("overview");
    } catch (error) {
      showError(error.message || copy.toasts.importError);
    } finally {
      setSaving(false);
    }
  };
  const toggleOvhDomainSelection = domainName => {
    setSelectedOvhDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainName)) next.delete(domainName);else next.add(domainName);
      return next;
    });
  };
  const handleImportOvhDomains = async () => {
    if (!client?.id || selectedOvhDomains.size === 0) return;
    setSaving(true);
    try {
      const selected = ovhDomains.filter(domain => {
        const name = domain.domain || domain.name || domain.nom;
        return selectedOvhDomains.has(name);
      });
      await importOvhDomainsForClient(client.id, selected, domains);
      showSuccess(copy.formatImportSuccess(selected.length));
      setSelectedOvhDomains(new Set());
      await loadData();
      await onSaved?.();
      setActiveSection("overview");
    } catch (error) {
      showError(error.message || copy.toasts.importError);
    } finally {
      setSaving(false);
    }
  };
  const requestRemoveDomain = domain => {
    setDeleteTarget(domain);
  };
  const confirmRemoveDomain = async () => {
    if (!deleteTarget || !client?.id) return;
    const domain = deleteTarget;
    const key = (domain.nom || "").toLowerCase();
    setDeletingDomainKey(key);
    try {
      await removeMonitoredDomain(client.id, domain);
      showSuccess(copy.toasts.removed);
      setDeleteTarget(null);
      await loadData();
      await onSaved?.();
    } catch (error) {
      showError(error.message || copy.toasts.deleteError);
    } finally {
      setDeletingDomainKey(null);
    }
  };
  const renderProviderPicker = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.provider.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.provider.description}</p>
      </div>

      <div className={avStyles.providerList}>
        {dnsProviders.map(provider => {
        const isSelected = selectedProviderId === provider.id;
        const isComingSoon = provider.status === "comingSoon";
        const proLocked = isIntegrationProLocked(provider.catalogIntegration, isCommunity);
        const globalAvailable = !provider.isManual && resolveProviderGlobalConfigured(provider.id, integrationSettings, {
          ovh: globalOvhConfigured
        });
        return <button key={provider.id} type="button" className={`${avStyles.providerCard} ${isSelected ? avStyles.providerCardSelected : ""} ${isComingSoon || proLocked ? avStyles.providerCardDisabled : ""}`} onClick={() => handleSelectProvider(provider)} disabled={isComingSoon} title={provider.description}>
              <span className={avStyles.providerCardIcon} style={integrationIconStyle(provider.iconColor)} aria-hidden>
                {provider.image ? <img src={getIconPath(provider.image)} alt="" /> : <Icon icon={provider.icon} />}
              </span>
              <span className={avStyles.providerCardLabel}>{provider.label}</span>
              {isComingSoon || proLocked || globalAvailable ? <span className={avStyles.providerCardBadges}>
                  {isComingSoon ? <span className={avStyles.providerBadgeSoon}>{copy.badges.soon}</span> : null}
                  {proLocked ? <span className={avStyles.providerBadgeSoon}>{copy.badges.pro}</span> : null}
                  {globalAvailable ? <span className={avStyles.providerBadgeGlobal}>{copy.badges.global}</span> : null}
                </span> : null}
            </button>;
      })}
      </div>

      {selectedProviderId === "ovh" ? <>
          <div className={formStyles.contentDivider} />
          <div className={formStyles.sectionHead}>
            <h3 className={formStyles.sectionTitle}>
              {copy.formatConnectionTitle(selectedProvider?.label || "OVH")}
            </h3>
            <p className={formStyles.sectionDesc}>
              {globalOvhConfigured ? copy.provider.globalDetected : copy.provider.globalNotActive}
            </p>
          </div>
          <div className={avStyles.modeGrid}>
            <button type="button" className={`${avStyles.modeCard} ${!globalOvhConfigured ? avStyles.modeCardDisabled : ""}`} onClick={() => {
          if (!globalOvhConfigured) return;
          setActiveSection("import");
        }} disabled={!globalOvhConfigured}>
              <span className={avStyles.modeCardIcon} aria-hidden>
                <Icon icon="mdi:store-cog-outline" />
              </span>
              <span className={avStyles.modeCardTitle}>{copy.provider.globalAccountTitle}</span>
              <span className={avStyles.modeCardDesc}>
                {globalOvhConfigured ? copy.provider.globalAccountDescActive : copy.provider.globalAccountDescInactive}
              </span>
              <span className={avStyles.modeCardAction}>
                {globalOvhConfigured ? copy.provider.importAction : copy.provider.activateInAdmin}
                <Icon icon="mdi:chevron-right" aria-hidden />
              </span>
            </button>
            {!globalOvhConfigured ? <button type="button" className={avStyles.modeCard} onClick={() => setActiveSection("guide")}>
                <span className={avStyles.modeCardIcon} aria-hidden>
                  <Icon icon="mdi:book-open-outline" />
                </span>
                <span className={avStyles.modeCardTitle}>{copy.provider.guideTitle}</span>
                <span className={avStyles.modeCardDesc}>{copy.provider.guideDesc}</span>
                <span className={avStyles.modeCardAction}>
                  {copy.provider.consult}
                  <Icon icon="mdi:chevron-right" aria-hidden />
                </span>
              </button> : null}
          </div>
        </> : null}
    </>;
  const renderOverview = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.overview.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.overview.description}</p>
      </div>

      {domains.length === 0 ? <div className={avStyles.emptyState}>
          {copy.overview.empty}
          {globalOvhConfigured ? <>
              {" "}
              {copy.overview.emptyHintPrefix}{" "}
              <strong>{copy.overview.emptyHintTab}</strong>{" "}
              {copy.overview.emptyHintSuffix}
            </> : null}
        </div> : <div className={avStyles.solutionList}>
          {domains.map((domain, index) => {
        const summary = formatDomainSummary(domain);
        const normalized = normalizeDomainItem(domain);
        const domainKey = `${normalized.nom}-${index}`;
        const isDeleting = deletingDomainKey === (normalized.nom || "").toLowerCase();
        return <div key={domainKey} className={avStyles.solutionCard}>
                <SolutionProviderIcon provider={getDnsProvider(summary.providerId)} fallbackIcon="stash:domain" />
                <div className={avStyles.solutionCardMain}>
                  <div className={avStyles.solutionName} title={summary.label}>
                    {summary.label}
                  </div>
                  <div className={avStyles.solutionMeta}>{summary.meta}</div>
                  {normalized.renewalMode ? <div className={avStyles.solutionMeta}>
                      {copy.formatModeLabel(normalized.renewalMode)}
                      {normalized.deleteAtExpiration ? copy.overview.deleteAtExpiration : ""}
                    </div> : null}
                </div>
                <div className={avStyles.solutionCardButtons}>
                  {isManualDomain(domain) ? <button type="button" className={avStyles.solutionIconBtn} onClick={() => startEditingDomain(domain)} disabled={Boolean(deletingDomainKey)} aria-label={copy.formatEditAria(summary.label)} title={copy.overview.editTitle}>
                      <Icon icon="mdi:pencil-outline" aria-hidden />
                    </button> : null}
                  <button type="button" className={`${avStyles.solutionIconBtn} ${avStyles.solutionIconBtnDanger}`} onClick={() => requestRemoveDomain(domain)} disabled={Boolean(deletingDomainKey)} aria-label={copy.formatRemoveAria(summary.label)} title={copy.overview.removeTitle}>
                    <Icon icon={isDeleting ? "mdi:loading" : "mdi:delete-outline"} className={isDeleting ? formStyles.spinning : ""} aria-hidden />
                  </button>
                </div>
              </div>;
      })}
        </div>}
    </>;
  const renderManual = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.manual.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.manual.description}</p>
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="manual-domain-name">
          {copy.manual.domainName}
        </label>
        <input id="manual-domain-name" type="text" className={formStyles.input} value={manualForm.nom} onChange={e => setManualForm({
        ...manualForm,
        nom: e.target.value
      })} placeholder="exemple.fr" />
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="manual-domain-registrar">
          {copy.manual.registrar}
        </label>
        <input id="manual-domain-registrar" type="text" className={formStyles.input} value={manualForm.registrar} onChange={e => setManualForm({
        ...manualForm,
        registrar: e.target.value
      })} placeholder={copy.manual.registrarPlaceholder} />
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="manual-domain-expiration">
          {copy.manual.expiration}
        </label>
        <input id="manual-domain-expiration" type="date" className={formStyles.input} value={manualForm.expiration} onChange={e => setManualForm({
        ...manualForm,
        expiration: e.target.value
      })} />
      </div>
    </>;
  const renderImport = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.import.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.import.description}</p>
      </div>

      <p className={dnsStyles.importHint}>{copy.import.hint}</p>

      <div className={dnsStyles.importToolbar}>
        <div className={dnsStyles.importSearchWrap}>
          <input id="ovh-domain-search" className={formStyles.input} value={ovhSearch} onChange={e => setOvhSearch(e.target.value)} placeholder={copy.import.searchPlaceholder} disabled={loadingOvhDomains} />
        </div>
        <div className={dnsStyles.importToolbarActions}>
          <button type="button" className={formStyles.ghostBtn} onClick={() => loadOvhDomains({
          refresh: true
        })} disabled={loadingOvhDomains || saving}>
            <Icon icon={loadingOvhDomains ? "mdi:loading" : "mdi:refresh"} className={loadingOvhDomains ? formStyles.spinning : ""} aria-hidden />
            {copy.import.refresh}
          </button>
          <button type="button" className={formStyles.ghostBtn} onClick={handleSelectAllOvh} disabled={loadingOvhDomains || selectableOvhDomains.length === 0}>
            {copy.import.selectAll}
          </button>
          <button type="button" className={formStyles.ghostBtn} onClick={handleClearOvhSelection} disabled={loadingOvhDomains || selectedOvhDomains.size === 0}>
            {copy.import.clear}
          </button>
        </div>
      </div>

      {loadingOvhDomains ? <div className={avStyles.emptyState}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          {" "}{copy.import.loading}
        </div> : filteredOvhDomains.length === 0 ? <div className={avStyles.emptyState}>
          {copy.import.empty}
        </div> : <div className={dnsStyles.importTableWrap}>
          <table className={dnsStyles.importTable}>
            <thead>
              <tr>
                <th scope="col" style={{
              width: "2.5rem"
            }} aria-label={copy.table.selectionAria} />
                <th scope="col">{copy.table.domain}</th>
                <th scope="col">{copy.table.expiration}</th>
                <th scope="col">{copy.table.renewal}</th>
                <th scope="col">{copy.table.state}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOvhDomains.map(domain => {
            const mapped = mapOvhApiDomainToMonitored(domain);
            const domainName = mapped.nom;
            const isSelected = selectedOvhDomains.has(domainName);
            const alreadyLinked = linkedDomainKeys.has(domainName.toLowerCase());
            return <tr key={domainName} className={`${dnsStyles.importTableRow} ${isSelected ? dnsStyles.importTableRowSelected : ""} ${alreadyLinked ? dnsStyles.importTableRowDisabled : ""}`} onClick={() => !alreadyLinked && toggleOvhDomainSelection(domainName)}>
                    <td>
                      <input type="checkbox" checked={isSelected} disabled={alreadyLinked} onChange={() => toggleOvhDomainSelection(domainName)} onClick={e => e.stopPropagation()} aria-label={copy.formatSelectAria(domainName)} />
                    </td>
                    <td>
                      <div className={dnsStyles.importDomainName}>{domainName}</div>
                    </td>
                    <td>
                      {mapped.expiration ? new Date(mapped.expiration).toLocaleDateString(copy.bcp47) : copy.emDash}
                    </td>
                    <td>
                      {mapped.autoRenew == null ? copy.emDash : mapped.autoRenew ? copy.renewal.automatic : copy.renewal.manual}
                    </td>
                    <td>
                      {alreadyLinked ? <span className={dnsStyles.domainBadge}>{copy.badges.alreadyLinked}</span> : isSelected ? <span className={`${dnsStyles.domainBadge} ${dnsStyles.domainBadgeOk}`}>
                          {copy.badges.selected}
                        </span> : mapped.hasDnsZone ? <span className={`${dnsStyles.domainBadge} ${dnsStyles.domainBadgeOk}`}>
                          {copy.badges.dnsZone}
                        </span> : <span className={dnsStyles.domainBadge}>{copy.badges.available}</span>}
                    </td>
                  </tr>;
          })}
            </tbody>
          </table>
        </div>}

      {ovhDomains.length > 0 ? <p className={dnsStyles.importSelectionSummary}>
          {copy.formatImportSummary(ovhDomains.length, selectedOvhDomains.size)}
        </p> : null}
    </>;
  const renderContent = () => {
    if (loading) {
      return <div className={avStyles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          {" "}{copy.loading}
        </div>;
    }
    if (activeSection === "provider") return renderProviderPicker();
    if (activeSection === "import") return renderImport();
    if (activeSection === "guide") return <OvhApiGuide />;
    if (activeSection === "manual") return renderManual();
    return renderOverview();
  };
  const footerHint = useMemo(() => {
    if (selectedProvider) {
      return copy.formatRegistrarFooter(selectedProvider.label);
    }
    if (activeSection === "overview" && domains.length > 0) {
      return copy.formatMonitoredCount(domains.length);
    }
    if (activeSection === "import" && selectedOvhDomains.size > 0) {
      return copy.formatSelectedCount(selectedOvhDomains.size);
    }
    return "";
  }, [activeSection, selectedProvider, domains.length, selectedOvhDomains.size, copy]);
  const showImportActions = activeSection === "import";
  const showManualActions = activeSection === "manual";
  if (!client?.id) return null;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="domains-config-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${dnsStyles.headerIconDns}`} aria-hidden>
              <Icon icon="stash:domain" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="domains-config-title">
                {copy.title}
              </h2>
              <p className={formStyles.subtitle}>{client?.name || copy.defaultClientName}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label={copy.navAria}>
            {navSections.map(section => {
              const isActive = activeSection === section.id;
              const hasBadge = sectionBadges[section.id];
              return <button key={section.id} type="button" className={`${formStyles.navItem} ${isActive ? formStyles.navItemActive : ""} ${section.disabled ? avStyles.navItemDisabled : ""}`} onClick={() => {
                if (section.disabled) return;
                if (section.id === "import" && selectedProviderId !== "ovh") {
                  setActiveSection("provider");
                  return;
                }
                if (section.id === "manual") {
                  setSelectedProviderId("manual");
                }
                setActiveSection(section.id);
              }} disabled={section.disabled} aria-current={isActive ? "step" : undefined}>
                  <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                  <span className={formStyles.navItemText}>
                    <span className={formStyles.navItemLabel}>{section.label}</span>
                    <span className={formStyles.navItemHint}>{section.description}</span>
                  </span>
                  {hasBadge ? <span className={formStyles.navBadge} aria-hidden>
                      ✓
                    </span> : null}
                </button>;
            })}
          </nav>

          <div className={formStyles.content}>{renderContent()}</div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{footerHint}</span>
          <div className={formStyles.footerActions}>
            {showManualActions ? <button type="button" className={formStyles.primaryBtn} onClick={handleSaveManual} disabled={saving || !manualForm.nom.trim()}>
                <Icon icon={saving ? "mdi:loading" : "mdi:content-save-outline"} className={saving ? formStyles.spinning : ""} aria-hidden />
                {saving ? copy.actions.attaching : copy.actions.saveManual}
              </button> : null}
            {showImportActions ? <>
                <button type="button" className={formStyles.ghostBtn} onClick={() => setActiveSection("provider")} disabled={saving}>
                  {copy.actions.back}
                </button>
                <button type="button" className={formStyles.primaryBtn} onClick={handleImportOvhDomains} disabled={saving || selectedOvhDomains.size === 0 || loadingOvhDomains}>
                  <Icon icon={saving ? "mdi:loading" : "mdi:download"} className={saving ? formStyles.spinning : ""} aria-hidden />
                  {saving ? copy.actions.attaching : copy.formatAttachAction(selectedOvhDomains.size)}
                </button>
              </> : null}
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.removeMonitoring.title} message={deleteTarget ? interpolate(configCopy.confirm.removeMonitoring.message, {
      label: formatDomainSummary(deleteTarget).label
    }) : ""} confirmLabel={common.remove} variant="danger" icon="mdi:delete-outline" loading={Boolean(deletingDomainKey)} onClose={() => setDeleteTarget(null)} onConfirm={confirmRemoveDomain} />
    </>;
}
