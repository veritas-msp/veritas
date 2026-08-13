import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { fetchSettings } from "../../api/settings";
import { createClientMailinblackTenant, fetchMailinblackCustomers, fetchMailinblackDashboard, getGlobalMailinblackStatus, listClientMailinblackTenants, syncMailinblackCustomer, testClientMailinblackTenant, testMailinblackCredentials, updateClientMailinblackTenant } from "../../api/clientMailinblack";
import { showError, showSuccess } from "../../utils/toast";
import { getIconPath } from "../../utils/assetHelper";
import { integrationIconStyle, isIntegrationProLocked, settingsToMap } from "../AdminPage/integrationsCatalog";
import { notifyProFeature } from "../Misc/ProFeature/proFeatureUtils";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { getAntispamProvider, getAntispamProviderOptions, inferProviderIdFromSolution, resolveProviderGlobalConfigured } from "./antispamFormConfig";
import { getAntispamModalCopy } from "./antispamConfigModalI18n";
import { listConfiguredAntispamSolutions, removeAntispamSolution, syncAndPersistAntispamSolution, formatAntispamSolutionSummary, formatAntispamSyncPayload, isManualAntispamSolution } from "./antispamSolutionUtils";
import formStyles from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import asStyles from "./AntispamConfigModal.module.css";
import MailinblackApiGuide from "./integrationGuides/MailinblackApiGuide";
import integrationStyles from "../AdminPage/BitdefenderIntegrationModal.module.css";
import SolutionProviderIcon from "./SolutionProviderIcon";
const SOLUTION_NAME = "Mailinblack Protect";
const DEFAULT_MAILINBLACK_DEDICATED_API_URL = "https://partner.mailinblack.com";
const STORED_AUTH_KEY_MASK = "••••••••••••••••";
function normalizeMailinblackApiUrl(url) {
  if (!url?.trim()) return DEFAULT_MAILINBLACK_DEDICATED_API_URL;
  return url.trim().replace(/\/+$/, "").replace(/\/(admin|protect|auth)\/api$/i, "").replace(/\/(admin|protect|auth)$/i, "");
}
function createEmptyDedicatedForm() {
  return {
    apiUrl: DEFAULT_MAILINBLACK_DEDICATED_API_URL,
    apiKey: "",
    authClientId: ""
  };
}
function resolveAuthKeyForSubmit(apiKey, hasStoredAuthKey) {
  const trimmed = apiKey?.trim() || "";
  if (!trimmed || hasStoredAuthKey || trimmed === STORED_AUTH_KEY_MASK) {
    return undefined;
  }
  return trimmed;
}
function shouldUseStoredTenantAuthKey(apiKey, hasStoredAuthKey, tenantId) {
  if (!tenantId) return false;
  const trimmed = apiKey?.trim() || "";
  return hasStoredAuthKey || !trimmed || trimmed === STORED_AUTH_KEY_MASK;
}
export default function AntispamConfigModal({
  client,
  onClose,
  onSaved,
  onViewSolution,
  initialSection = "overview",
  initialEditingSolution = null,
  isCommunity = false
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getAntispamModalCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modulesData, setModulesData] = useState(null);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [globalMailinblackConfigured, setGlobalMailinblackConfigured] = useState(false);
  const [dedicatedTenants, setDedicatedTenants] = useState([]);
  const [dedicatedForm, setDedicatedForm] = useState(createEmptyDedicatedForm);
  const [selectedDedicatedTenantId, setSelectedDedicatedTenantId] = useState(null);
  const [hasStoredAuthKey, setHasStoredAuthKey] = useState(false);
  const dedicatedFormInitializedRef = useRef(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [deletingSolutionKey, setDeletingSolutionKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingSolution, setEditingSolution] = useState(null);
  const [solutionTenantMode, setSolutionTenantMode] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [manualForm, setManualForm] = useState({
    solution: "",
    utilisateursProteges: "",
    domainesSurveilles: "",
    expiration: ""
  });
  const registeredSolutions = useMemo(() => listConfiguredAntispamSolutions(client, [], modulesData, dedicatedTenants), [client, modulesData, dedicatedTenants]);
  const antispamProviders = useMemo(() => getAntispamProviderOptions(), []);
  const selectedGlobalConfigured = useMemo(() => resolveProviderGlobalConfigured(selectedProviderId, integrationSettings, {
    mailinblack: globalMailinblackConfigured
  }), [selectedProviderId, integrationSettings, globalMailinblackConfigured]);
  const selectedProvider = useMemo(() => getAntispamProvider(selectedProviderId), [selectedProviderId]);
  const visibleTenantMode = useMemo(() => {
    if (activeSection === "reseller") return "reseller";
    if (activeSection === "dedicated" || activeSection === "guide") return "dedicated";
    if (solutionTenantMode) return solutionTenantMode;
    return null;
  }, [activeSection, solutionTenantMode]);
  const navSections = useMemo(() => copy.navSections({
    selectedProviderId,
    globalConfigured: selectedGlobalConfigured,
    visibleTenantMode
  }), [copy, selectedProviderId, selectedGlobalConfigured, visibleTenantMode]);
  const sectionBadges = useMemo(() => {
    const hasDedicated = registeredSolutions.some(s => (s.providerId === "mailinblack" || !s.providerId) && (s.mappingMode === "dedicated" || s.mailinblackTenantId));
    const hasManual = registeredSolutions.some(s => s.providerId === "manual" || s.mappingMode === "manual" || s.isManual || isManualAntispamSolution(s));
    return {
      overview: registeredSolutions.length > 0,
      solution: Boolean(selectedProviderId),
      dedicated: hasDedicated || dedicatedTenants.length > 0,
      manual: hasManual
    };
  }, [registeredSolutions, dedicatedTenants, selectedProviderId]);
  const loadData = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [modules, globalStatus, tenantsResult, settingsList] = await Promise.all([fetchClientModules(client.id), getGlobalMailinblackStatus().catch(() => ({
        configured: false
      })), listClientMailinblackTenants(client.id).catch(() => ({
        tenants: []
      })), fetchSettings().catch(() => [])]);
      setModulesData(modules);
      setIntegrationSettings(settingsToMap(settingsList));
      setGlobalMailinblackConfigured(Boolean(globalStatus?.configured));
      setDedicatedTenants(tenantsResult?.tenants || []);
    } catch (error) {
      console.error(error);
      showError(copy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [client?.id, copy]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (activeSection !== "reseller" || !client?.id || !selectedGlobalConfigured) {
      setCustomers([]);
      setSelectedCustomerId("");
      return;
    }
    setLoadingCustomers(true);
    fetchMailinblackCustomers({
      clientId: client.id
    }).then(data => {
      const list = Array.isArray(data?.customers) ? data.customers : [];
      setCustomers(list);
    }).catch(error => {
      showError(error.message || copy.toasts.loadCustomersError);
      setCustomers([]);
    }).finally(() => setLoadingCustomers(false));
  }, [activeSection, client?.id, selectedGlobalConfigured, copy]);
  const handleSaveResellerSolution = async () => {
    const customer = customers.find(entry => String(entry.id) === String(selectedCustomerId));
    if (!customer?.id) {
      showError(copy.toasts.selectCustomer);
      return;
    }
    setSaving(true);
    setSyncing(true);
    try {
      await syncAndPersistAntispamSolution(client.id, {
        providerId: "mailinblack",
        mappingMode: "reseller",
        customerId: String(customer.id),
        customerName: customer.name,
        id: editingSolution?.id
      });
      showSuccess(copy.toasts.linkedAndSynced);
      setSelectedCustomerId("");
      setEditingSolution(null);
      await loadData();
      await onSaved?.();
      setActiveSection("overview");
    } catch (error) {
      showError(error.message || copy.toasts.saveError);
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };
  const applyDedicatedFormFromTenant = useCallback((tenant, solution = null) => {
    const storedAuthKey = Boolean(tenant?.hasApiKey);
    if (tenant) {
      setHasStoredAuthKey(storedAuthKey);
      setSelectedDedicatedTenantId(tenant.id);
      setDedicatedForm({
        apiUrl: normalizeMailinblackApiUrl(tenant.apiUrl),
        apiKey: storedAuthKey ? STORED_AUTH_KEY_MASK : "",
        authClientId: tenant.authClientId || solution?.customerId || solution?.syncData?.customer?.id || ""
      });
      return;
    }
    if (solution) {
      setHasStoredAuthKey(false);
      setSelectedDedicatedTenantId(solution.mailinblackTenantId || null);
      setDedicatedForm({
        apiUrl: DEFAULT_MAILINBLACK_DEDICATED_API_URL,
        apiKey: "",
        authClientId: solution.customerId || solution.syncData?.customer?.id || ""
      });
      return;
    }
    setHasStoredAuthKey(false);
    setSelectedDedicatedTenantId(null);
    setDedicatedForm(createEmptyDedicatedForm());
  }, []);
  const startEditingSolution = useCallback(solution => {
    if (!solution) return;
    setEditingSolution(solution);
    dedicatedFormInitializedRef.current = false;
    const providerId = inferProviderIdFromSolution(solution) || "mailinblack";
    setSelectedProviderId(providerId);
    if (providerId === "manual" || isManualAntispamSolution(solution)) {
      setManualForm({
        solution: solution.solution || solution.logiciel || solution.nom || solution.name || "",
        utilisateursProteges: solution.utilisateursProteges != null ? String(solution.utilisateursProteges) : "",
        domainesSurveilles: solution.domainesSurveilles != null ? String(solution.domainesSurveilles) : "",
        expiration: solution.expiration || ""
      });
      setActiveSection("manual");
      return;
    }
    if (providerId === "mailinblack") {
      const mappingMode = solution.mappingMode || (solution.mailinblackTenantId ? "dedicated" : "reseller");
      if (mappingMode === "reseller") {
        setSolutionTenantMode("reseller");
        setSelectedCustomerId(solution.customerId || solution.syncData?.customer?.id || "");
        setActiveSection("reseller");
        return;
      }
      if (solution.mailinblackTenantId) {
        setSelectedDedicatedTenantId(solution.mailinblackTenantId);
      }
      setSolutionTenantMode("dedicated");
      setActiveSection("dedicated");
      return;
    }
    setActiveSection("solution");
  }, []);
  useEffect(() => {
    if (initialEditingSolution) {
      startEditingSolution(initialEditingSolution);
      return;
    }
    setEditingSolution(null);
    setActiveSection(initialSection);
    if (initialSection === "dedicated") {
      setSelectedProviderId("mailinblack");
    } else if (initialSection === "manual") {
      setSelectedProviderId("manual");
    }
  }, [initialSection, initialEditingSolution, client?.id, startEditingSolution]);
  useEffect(() => {
    if (activeSection !== "dedicated") {
      dedicatedFormInitializedRef.current = false;
      return;
    }
    if (loading) return;
    if (dedicatedFormInitializedRef.current) return;
    const tenantFromList = dedicatedTenants.find(tenant => tenant.id === selectedDedicatedTenantId) || dedicatedTenants[0] || null;
    if (tenantFromList || editingSolution?.customerId) {
      applyDedicatedFormFromTenant(tenantFromList, editingSolution);
      dedicatedFormInitializedRef.current = true;
      return;
    }
    if (dedicatedTenants.length === 0) {
      setHasStoredAuthKey(false);
      setSelectedDedicatedTenantId(null);
      setDedicatedForm(createEmptyDedicatedForm());
      dedicatedFormInitializedRef.current = true;
    }
  }, [activeSection, loading, dedicatedTenants, selectedDedicatedTenantId, editingSolution, applyDedicatedFormFromTenant]);
  const handleTestDedicatedCredentials = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      if (!dedicatedForm.authClientId?.trim() && !shouldUseStoredTenantAuthKey(dedicatedForm.apiKey, hasStoredAuthKey, selectedDedicatedTenantId)) {
        throw new Error(copy.toasts.clientIdRequired || "Client ID required.");
      }
      if (shouldUseStoredTenantAuthKey(dedicatedForm.apiKey, hasStoredAuthKey, selectedDedicatedTenantId)) {
        await testClientMailinblackTenant(client.id, selectedDedicatedTenantId);
      } else {
        const result = await testMailinblackCredentials({
          apiUrl: dedicatedForm.apiUrl,
          authKey: dedicatedForm.apiKey,
          authClientId: dedicatedForm.authClientId
        });
        if (result?.authClientId && !dedicatedForm.authClientId?.trim()) {
          setDedicatedForm(prev => ({
            ...prev,
            authClientId: result.authClientId
          }));
        }
      }
      setConnectionStatus("success");
      showSuccess(copy.toasts.connectionSuccess);
    } catch (error) {
      setConnectionStatus("error");
      showError(error.message || copy.toasts.connectionTestFailed);
    } finally {
      setTestingConnection(false);
    }
  };
  const handleSaveDedicatedSolution = async () => {
    const apiUrl = dedicatedForm.apiUrl?.trim();
    const resolvedAuthKey = resolveAuthKeyForSubmit(dedicatedForm.apiKey, hasStoredAuthKey);
    if (!apiUrl) {
      showError(copy.toasts.apiUrlRequired);
      return;
    }
    if (!dedicatedForm.authClientId?.trim()) {
      showError(copy.toasts.clientIdRequired || "Client ID required.");
      return;
    }
    if (!selectedDedicatedTenantId && !resolvedAuthKey) {
      showError(copy.toasts.apiKeyRequired);
      return;
    }
    setSaving(true);
    setSyncing(true);
    try {
      let tenantId = selectedDedicatedTenantId;
      let tenant;
      const tenantPayload = {
        apiUrl,
        authClientId: dedicatedForm.authClientId?.trim() || null
      };
      if (resolvedAuthKey) {
        tenantPayload.authKey = resolvedAuthKey;
      }
      if (tenantId) {
        const result = await updateClientMailinblackTenant(client.id, tenantId, tenantPayload);
        tenant = result.tenant;
      } else {
        const result = await createClientMailinblackTenant(client.id, tenantPayload);
        tenant = result.tenant;
        tenantId = tenant.id;
        setDedicatedTenants(prev => [...prev, tenant]);
        setSelectedDedicatedTenantId(tenantId);
      }
      const customerId = tenant.authClientId || dedicatedForm.authClientId?.trim();
      if (!customerId) {
        throw new Error(copy.toasts.accountNotFound);
      }
      if (customerId !== dedicatedForm.authClientId) {
        setDedicatedForm(prev => ({
          ...prev,
          authClientId: customerId
        }));
      }
      const credentialContext = {
        clientId: client.id,
        mailinblackTenantId: tenantId,
        mappingMode: "dedicated"
      };
      const [syncResult, dashboard] = await Promise.all([syncMailinblackCustomer(customerId, credentialContext), fetchMailinblackDashboard(customerId, credentialContext).catch(() => null)]);
      if (!syncResult.success) {
        throw new Error(syncResult.error || copy.toasts.syncFailed);
      }
      const customer = syncResult.customer || syncResult.data?.syncData?.customer || {
        id: customerId,
        name: syncResult.data?.customerName || copy.solution.defaultCustomerName
      };
      const normalizedCustomer = {
        ...customer,
        id: customer?.id != null ? String(customer.id) : String(customerId)
      };
      const basePayload = formatAntispamSyncPayload(normalizedCustomer, "dedicated", tenantId, "mailinblack");
      const newSolution = {
        ...basePayload,
        syncData: {
          ...basePayload.syncData,
          dashboard: dashboard || syncResult.dashboard || null,
          lastSync: new Date().toISOString()
        }
      };
      const existingEquipements = modulesData?.equipements || {};
      const antispamEquipement = existingEquipements.Antispam || {};
      const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
      const filtered = existingSolutions.filter(s => !((s.providerId === "mailinblack" || s.solution === SOLUTION_NAME) && String(s.customerId) === String(newSolution.customerId) && s.mappingMode === "dedicated" && (s.mailinblackTenantId || null) === (newSolution.mailinblackTenantId || null)));
      const existingMatch = existingSolutions.find(s => (s.providerId === "mailinblack" || s.solution === SOLUTION_NAME) && String(s.customerId) === String(newSolution.customerId) && s.mappingMode === "dedicated" && (s.mailinblackTenantId || null) === (newSolution.mailinblackTenantId || null));
      await saveClientModules(client.id, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antispam: true
        },
        equipements: {
          ...existingEquipements,
          Antispam: {
            ...antispamEquipement,
            solutions: [...filtered, {
              id: existingMatch?.id ?? editingSolution?.id ?? Date.now(),
              ...newSolution
            }]
          }
        }
      });
      showSuccess(existingMatch || editingSolution ? copy.toasts.configUpdated : copy.toasts.savedAndSynced);
      setHasStoredAuthKey(true);
      setDedicatedForm(prev => ({
        ...prev,
        apiKey: STORED_AUTH_KEY_MASK
      }));
      setEditingSolution(null);
      dedicatedFormInitializedRef.current = false;
      await loadData();
      await onSaved?.();
      setActiveSection("overview");
    } catch (error) {
      console.error(error);
      showError(error.message || copy.toasts.saveError);
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };
  const requestDeleteSolution = solution => {
    setDeleteTarget(solution);
  };
  const confirmDeleteSolution = async () => {
    if (!deleteTarget || !client?.id) return;
    const solution = deleteTarget;
    const solutionKey = `${solution.customerId || solution.id}-${solution.mappingMode || "dedicated"}-${solution.mailinblackTenantId || "dedicated"}`;
    setDeletingSolutionKey(solutionKey);
    try {
      await removeAntispamSolution(client.id, solution);
      if (editingSolution && editingSolution.id === solution.id) {
        setEditingSolution(null);
      }
      showSuccess(copy.toasts.associationRemoved);
      setDeleteTarget(null);
      await loadData();
      await onSaved?.();
    } catch (error) {
      showError(error.message || copy.toasts.deleteError);
    } finally {
      setDeletingSolutionKey(null);
    }
  };
  const handleSelectProvider = provider => {
    if (provider.status === "comingSoon") {
      showError(copy.formatComingSoonToast(provider.label));
      return;
    }
    if (isIntegrationProLocked(provider.catalogIntegration, isCommunity)) {
      notifyProFeature(provider.label || copy.proIntegrationFallback);
      return;
    }
    setSelectedProviderId(provider.id);
    if (provider.isManual) {
      setActiveSection("manual");
      return;
    }
    setSolutionTenantMode(null);
    setActiveSection("solution");
  };
  const handleSaveManual = async () => {
    const label = (manualForm.solution || "").trim();
    if (!label) {
      showError(copy.toasts.solutionNameRequired);
      return;
    }
    setSaving(true);
    try {
      const newSolution = {
        providerId: "manual",
        mappingMode: "manual",
        isManual: true,
        solution: label,
        logiciel: label,
        nom: label,
        name: label,
        utilisateursProteges: manualForm.utilisateursProteges.trim(),
        domainesSurveilles: manualForm.domainesSurveilles.trim(),
        expiration: manualForm.expiration || ""
      };
      const existingEquipements = modulesData?.equipements || {};
      const antispamEquipement = existingEquipements.Antispam || {};
      const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
      const isEditingManual = editingSolution && (editingSolution.mappingMode === "manual" || editingSolution.isManual || editingSolution.providerId === "manual" || isManualAntispamSolution(editingSolution));
      const nextSolutions = isEditingManual ? existingSolutions.map(entry => entry.id === editingSolution.id ? {
        ...entry,
        ...newSolution,
        id: entry.id
      } : entry) : [...existingSolutions, {
        id: Date.now(),
        ...newSolution
      }];
      await saveClientModules(client.id, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antispam: true
        },
        equipements: {
          ...existingEquipements,
          Antispam: {
            ...antispamEquipement,
            solutions: nextSolutions
          }
        }
      });
      showSuccess(isEditingManual ? copy.toasts.configUpdated : copy.toasts.manualSaved);
      setManualForm({
        solution: "",
        utilisateursProteges: "",
        domainesSurveilles: "",
        expiration: ""
      });
      setSelectedProviderId("manual");
      setEditingSolution(null);
      await loadData();
      await onSaved?.();
      setActiveSection("overview");
    } catch (error) {
      showError(error.message || copy.toasts.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleReconfigureSolution = solution => {
    startEditingSolution(solution);
  };
  const renderSolutionPicker = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.solutionPicker.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.solutionPicker.description}</p>
      </div>

      <div className={avStyles.providerList}>
        {antispamProviders.map(provider => {
        const isSelected = selectedProviderId === provider.id;
        const isComingSoon = provider.status === "comingSoon";
        const proLocked = isIntegrationProLocked(provider.catalogIntegration, isCommunity);
        const globalAvailable = !provider.isManual && resolveProviderGlobalConfigured(provider.id, integrationSettings, {
          mailinblack: globalMailinblackConfigured
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

      {selectedProvider && selectedProvider.status === "available" && selectedProviderId === "mailinblack" ? <>
          <div className={formStyles.contentDivider} />
          <div className={formStyles.sectionHead}>
            <h3 className={formStyles.sectionTitle}>
              {copy.formatConnectionTitle(selectedProvider.label)}
            </h3>
            <p className={formStyles.sectionDesc}>
              {selectedGlobalConfigured ? copy.solutionPicker.globalDetected : copy.solutionPicker.globalNotActive}
            </p>
          </div>
          <div className={avStyles.modeGrid}>
            <button type="button" className={`${avStyles.modeCard} ${!selectedGlobalConfigured ? avStyles.modeCardDisabled : ""} ${solutionTenantMode === "reseller" ? avStyles.modeCardActive : ""}`} onClick={() => {
          if (!selectedGlobalConfigured) return;
          setSolutionTenantMode("reseller");
          setActiveSection("reseller");
        }} disabled={!selectedGlobalConfigured}>
              <span className={avStyles.modeCardIcon} aria-hidden>
                <Icon icon="mdi:store-cog-outline" />
              </span>
              <span className={avStyles.modeCardTitle}>{copy.solutionPicker.modeGlobal.title}</span>
              <span className={avStyles.modeCardDesc}>
                {selectedGlobalConfigured ? copy.solutionPicker.modeGlobal.descConfigured : copy.solutionPicker.modeGlobal.descNotConfigured}
              </span>
              <span className={avStyles.modeCardAction}>
                {selectedGlobalConfigured ? copy.solutionPicker.modeGlobal.actionConfigured : copy.solutionPicker.modeGlobal.actionNotConfigured}
                <Icon icon="mdi:chevron-right" aria-hidden />
              </span>
            </button>
            <button type="button" className={`${avStyles.modeCard} ${solutionTenantMode === "dedicated" ? avStyles.modeCardActive : ""}`} onClick={() => {
          setSolutionTenantMode("dedicated");
          setActiveSection("dedicated");
        }}>
              <span className={avStyles.modeCardIcon} aria-hidden>
                <Icon icon="mdi:shield-key-outline" />
              </span>
              <span className={avStyles.modeCardTitle}>{copy.solutionPicker.modeDedicated.title}</span>
              <span className={avStyles.modeCardDesc}>
                {copy.solutionPicker.modeDedicated.description}
              </span>
              <span className={avStyles.modeCardAction}>
                {copy.solutionPicker.modeDedicated.action}
                <Icon icon="mdi:chevron-right" aria-hidden />
              </span>
            </button>
          </div>
        </> : null}
    </>;
  const renderOverview = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.overview.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.overview.description}</p>
      </div>

      {registeredSolutions.length === 0 ? <div className={avStyles.emptyState}>{copy.overview.empty}</div> : <div className={avStyles.solutionList}>
          {registeredSolutions.map((solution, index) => {
        const summary = formatAntispamSolutionSummary(solution);
        const solutionKey = `${solution.customerId || solution.id || index}-${solution.mappingMode || "dedicated"}-${solution.mailinblackTenantId || "dedicated"}`;
        const isDeleting = deletingSolutionKey === `${solution.customerId || solution.id}-${solution.mappingMode || "dedicated"}-${solution.mailinblackTenantId || "dedicated"}`;
        return <div key={solutionKey} className={avStyles.solutionCard}>
                <SolutionProviderIcon provider={getAntispamProvider(summary.providerId)} fallbackIcon="mdi:email-secure-outline" />
                <div className={avStyles.solutionCardMain}>
                  <div className={avStyles.solutionName} title={summary.label}>
                    {summary.label}
                  </div>
                  <div className={avStyles.solutionMeta}>
                    {summary.providerName}
                    {" · "}
                    {copy.getModeLabel(solution)}
                    {solution.customerId ? ` · ${solution.customerId}` : ""}
                  </div>
                </div>
                <div className={avStyles.solutionCardButtons}>
                  {(solution.customerId || isManualAntispamSolution(solution)) && onViewSolution ? <button type="button" className={avStyles.solutionIconBtn} onClick={() => onViewSolution(solution)} disabled={Boolean(deletingSolutionKey)} aria-label={copy.formatActionAria(copy.actions.viewAria, summary.label)} title={copy.actions.viewData}>
                      <Icon icon="mdi:eye-outline" aria-hidden />
                    </button> : null}
                  <button type="button" className={avStyles.solutionIconBtn} onClick={() => handleReconfigureSolution(solution)} disabled={Boolean(deletingSolutionKey)} aria-label={copy.formatActionAria(copy.actions.editAria, summary.label)} title={copy.actions.edit}>
                    <Icon icon="mdi:pencil-outline" aria-hidden />
                  </button>
                  <button type="button" className={`${avStyles.solutionIconBtn} ${avStyles.solutionIconBtnDanger}`} onClick={() => requestDeleteSolution(solution)} disabled={Boolean(deletingSolutionKey)} aria-label={copy.formatActionAria(copy.actions.deleteAria, summary.label)} title={copy.actions.delete}>
                    <Icon icon={isDeleting ? "mdi:loading" : "mdi:delete-outline"} className={isDeleting ? formStyles.spinning : ""} aria-hidden />
                  </button>
                </div>
              </div>;
      })}
        </div>}
    </>;
  const renderReseller = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.reseller.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.reseller.description}</p>
      </div>
      {!selectedGlobalConfigured ? <div className={avStyles.emptyState}>{copy.reseller.globalNotActive}</div> : <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="mib-global-customer">
            {copy.reseller.customerLabel}
          </label>
          {loadingCustomers ? <div className={avStyles.companiesLoading} role="status">
              <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
              <div>
                <strong>{copy.reseller.loadingTitle}</strong>
                <span>{copy.reseller.loadingHint}</span>
              </div>
            </div> : <select id="mib-global-customer" className={avStyles.select} value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
              <option value="">{copy.reseller.selectPlaceholder}</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.domain ? ` (${customer.domain})` : ""}
                </option>)}
            </select>}
        </div>}
    </>;
  const renderDedicated = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.dedicated.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.dedicated.description}</p>
      </div>

      <form className={avStyles.dedicatedTenantForm} autoComplete="off" onSubmit={e => e.preventDefault()}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="tenant-api-url">
            {copy.dedicated.apiUrlLabel}
          </label>
          <input id="tenant-api-url" name="mailinblack-tenant-api-url" type="text" inputMode="url" className={formStyles.input} value={dedicatedForm.apiUrl} onChange={e => setDedicatedForm({
          ...dedicatedForm,
          apiUrl: e.target.value
        })} placeholder={DEFAULT_MAILINBLACK_DEDICATED_API_URL} autoComplete="off" data-lpignore="true" data-1p-ignore />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="tenant-client-id">
            {copy.dedicated.clientIdLabel}
          </label>
          <input id="tenant-client-id" name="mailinblack-tenant-client-id" type="text" className={formStyles.input} value={dedicatedForm.authClientId} onChange={e => setDedicatedForm({
          ...dedicatedForm,
          authClientId: e.target.value
        })} placeholder={copy.dedicated.clientIdPlaceholder} autoComplete="off" data-lpignore="true" data-1p-ignore />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="tenant-api-key">
            {copy.dedicated.apiKeyLabel}
          </label>
          <input id="tenant-api-key" name="mailinblack-tenant-api-key" type="password" className={formStyles.input} value={dedicatedForm.apiKey} onChange={e => {
          setHasStoredAuthKey(false);
          setDedicatedForm({
            ...dedicatedForm,
            apiKey: e.target.value
          });
        }} onFocus={() => {
          if (hasStoredAuthKey) {
            setHasStoredAuthKey(false);
            setDedicatedForm(prev => ({
              ...prev,
              apiKey: ""
            }));
          }
        }} placeholder={selectedDedicatedTenantId || hasStoredAuthKey ? copy.dedicated.apiKeyPlaceholderStored : copy.dedicated.apiKeyPlaceholderNew} autoComplete="new-password" data-lpignore="true" data-1p-ignore />
          <p className={formStyles.sectionDesc}>{copy.dedicated.apiKeyHint}</p>
        </div>
        <button type="button" className={integrationStyles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
          <Icon icon="mdi:help-circle-outline" aria-hidden />
          {copy.dedicated.apiKeyGuideLink}
        </button>
      </form>
    </>;
  const renderManual = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.manual.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.manual.description}</p>
      </div>
      <div className={formStyles.field}>
        <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="manual-antispam-name">
          {copy.manual.solutionName}
        </label>
        <input id="manual-antispam-name" type="text" className={formStyles.input} value={manualForm.solution} onChange={e => setManualForm({
        ...manualForm,
        solution: e.target.value
      })} placeholder={copy.manual.solutionNamePlaceholder} autoComplete="off" />
      </div>
      <div className={formStyles.fieldGrid2}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="manual-antispam-users">
            {copy.manual.utilisateursProteges}
          </label>
          <input id="manual-antispam-users" type="text" className={formStyles.input} value={manualForm.utilisateursProteges} onChange={e => setManualForm({
          ...manualForm,
          utilisateursProteges: e.target.value
        })} />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="manual-antispam-domains">
            {copy.manual.domainesSurveilles}
          </label>
          <input id="manual-antispam-domains" type="text" className={formStyles.input} value={manualForm.domainesSurveilles} onChange={e => setManualForm({
          ...manualForm,
          domainesSurveilles: e.target.value
        })} />
        </div>
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="manual-antispam-expiration">
          {copy.manual.expiration}
        </label>
        <input id="manual-antispam-expiration" type="date" className={formStyles.input} value={manualForm.expiration} onChange={e => setManualForm({
        ...manualForm,
        expiration: e.target.value
      })} />
      </div>
    </>;
  const renderSectionContent = () => {
    if (loading) {
      return <div className={avStyles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          {copy.loading}
        </div>;
    }
    if (activeSection === "dedicated" && selectedProviderId && selectedProviderId !== "mailinblack") {
      return <div className={avStyles.emptyState}>
          {copy.formatComingSoonProvider(selectedProvider?.label)}
        </div>;
    }
    switch (activeSection) {
      case "solution":
        return renderSolutionPicker();
      case "reseller":
        return renderReseller();
      case "dedicated":
        return renderDedicated();
      case "guide":
        return <MailinblackApiGuide dedicated />;
      case "manual":
        return renderManual();
      default:
        return renderOverview();
    }
  };
  const footerHint = useMemo(() => {
    if (selectedProvider) {
      return copy.formatFooterSolution(selectedProvider.label);
    }
    if (activeSection === "overview" && registeredSolutions.length > 0) {
      return copy.formatFooterSolutionsCount(registeredSolutions.length);
    }
    return "";
  }, [activeSection, registeredSolutions.length, selectedProvider, copy]);
  const showDedicatedTenantActions = activeSection === "dedicated" && selectedProviderId === "mailinblack";
  const showResellerActions = activeSection === "reseller" && selectedProviderId === "mailinblack" && selectedGlobalConfigured;
  const showManualActions = activeSection === "manual";
  const manualNameFilled = Boolean((manualForm.solution || "").trim());
  if (!client?.id) return null;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={syncing || saving ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="antispam-config-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${asStyles.headerIconAntispam}`} aria-hidden>
              <Icon icon="mdi:email-secure-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="antispam-config-modal-title">
                {copy.title}
              </h2>
              <p className={formStyles.subtitle}>{client.name}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={syncing || saving} aria-label={common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label={copy.navAria}>
            {navSections.map(section => <button key={section.id} type="button" className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""} ${section.disabled ? avStyles.navItemDisabled : ""}`} onClick={() => {
              if (section.disabled) return;
              if (section.id === "reseller" || section.id === "dedicated") {
                if (!selectedProviderId) {
                  setSelectedProviderId("mailinblack");
                }
                setSolutionTenantMode(section.id);
              }
              if (section.id === "solution") {
                setSolutionTenantMode(null);
              }
              if (section.id === "manual") {
                setSelectedProviderId("manual");
              }
              setActiveSection(section.id);
            }} disabled={section.disabled} title={section.disabled ? copy.navDisabledTitle : undefined} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                <span className={formStyles.navItemText}>
                  <span className={formStyles.navItemLabel}>{section.label}</span>
                  <span className={formStyles.navItemHint}>{section.description}</span>
                </span>
                {sectionBadges[section.id] ? <span className={formStyles.navBadge} aria-hidden>
                    ✓
                  </span> : null}
              </button>)}
          </nav>

          <div className={formStyles.content}>{renderSectionContent()}</div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {footerHint}
            {showDedicatedTenantActions && connectionStatus ? <span className={`${avStyles.connectionOk} ${connectionStatus === "error" ? avStyles.connectionError : ""}`}>
                {copy.formatConnectionStatus(connectionStatus)}
              </span> : null}
          </span>
          <div className={formStyles.footerActions}>
            {showResellerActions ? <button type="button" className={formStyles.primaryBtn} onClick={handleSaveResellerSolution} disabled={saving || syncing || !selectedCustomerId}>
                <Icon icon={saving || syncing ? "mdi:loading" : "mdi:check"} className={saving || syncing ? formStyles.spinning : ""} aria-hidden />
                {copy.buttons.associateSync}
              </button> : null}
            {showManualActions ? <button type="button" className={formStyles.primaryBtn} onClick={handleSaveManual} disabled={saving || syncing || !manualNameFilled}>
                <Icon icon={saving || syncing ? "mdi:loading" : "mdi:content-save-outline"} className={saving || syncing ? formStyles.spinning : ""} aria-hidden />
                {saving || syncing ? common.saving : copy.buttons.saveSolution}
              </button> : null}
            {showDedicatedTenantActions ? <>
                <button type="button" className={formStyles.ghostBtn} onClick={handleTestDedicatedCredentials} disabled={testingConnection || saving}>
                  <Icon icon={testingConnection ? "mdi:loading" : "mdi:lan-check"} className={testingConnection ? formStyles.spinning : ""} aria-hidden />
                  {copy.buttons.testConnection}
                </button>
                <button type="button" className={formStyles.primaryBtn} onClick={handleSaveDedicatedSolution} disabled={saving || testingConnection || syncing}>
                  <Icon icon={saving || syncing ? "mdi:loading" : "mdi:content-save-outline"} className={saving || syncing ? formStyles.spinning : ""} aria-hidden />
                  {saving || syncing ? common.saving : copy.buttons.saveSolution}
                </button>
              </> : null}
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.deleteConfiguration.title} message={deleteTarget ? interpolate(configCopy.confirm.deleteConfiguration.message, {
      label: formatAntispamSolutionSummary(deleteTarget).label
    }) : ""} confirmLabel={common.delete} variant="danger" icon="mdi:delete-outline" loading={Boolean(deletingSolutionKey)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDeleteSolution} />
    </>;
}
