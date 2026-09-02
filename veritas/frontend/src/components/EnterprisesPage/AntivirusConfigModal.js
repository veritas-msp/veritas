import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { fetchSettings } from "../../api/settings";
import { createClientBitdefenderTenant, fetchBitdefenderCompanies, getGlobalBitdefenderStatus, listClientBitdefenderTenants, syncBitdefenderCompany, testBitdefenderCredentials, testClientBitdefenderTenant } from "../../api/clientBitdefender";
import { showError, showSuccess } from "../../utils/toast";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";
import { getIconPath } from "../../utils/assetHelper";
import { integrationIconStyle, isIntegrationProLocked, settingsToMap } from "../AdminPage/integrationsCatalog";
import { notifyProFeature } from "../Misc/ProFeature/proFeatureUtils";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { getAntivirusModalCopy } from "./antivirusConfigModalI18n";
import { interpolate } from "../../i18n/translate";
import { getAntivirusProvider, getAntivirusProviderOptions, inferProviderIdFromSolution, resolveProviderGlobalConfigured } from "./antivirusFormConfig";
import { removeAntivirusSolution, formatAntivirusSolutionSummary, formatAntivirusSyncPayload, fetchFullAntivirusSyncExtra, createAntivirusSolutionId } from "./antivirusSolutionUtils";
import formStyles from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import BitdefenderApiGuide from "./integrationGuides/BitdefenderApiGuide";
import integrationStyles from "../AdminPage/BitdefenderIntegrationModal.module.css";
import SolutionProviderIcon from "./SolutionProviderIcon";
const SOLUTION_NAME = "GravityZone BitDefender";
export default function AntivirusConfigModal({
  client,
  onClose,
  onSaved,
  initialSection = "overview",
  initialEditingSolution = null,
  onViewSolution,
  isCommunity = false
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getAntivirusModalCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [manualForm, setManualForm] = useState({
    solution: "",
    licencesTotales: "",
    licencesUtilisees: "",
    expiration: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modulesData, setModulesData] = useState(null);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [globalBitdefenderConfigured, setGlobalBitdefenderConfigured] = useState(false);
  const [dedicatedTenants, setDedicatedTenants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companyDropdownStyle, setCompanyDropdownStyle] = useState(null);
  const companyAutocompleteRef = useRef(null);
  const companyInputRef = useRef(null);
  const companyDropdownRef = useRef(null);
  const [dedicatedForm, setDedicatedForm] = useState({
    apiUrl: "",
    apiKey: ""
  });
  const [selectedDedicatedTenantId, setSelectedDedicatedTenantId] = useState(null);
  const [creatingDedicatedTenant, setCreatingDedicatedTenant] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [deletingSolutionKey, setDeletingSolutionKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingSolution, setEditingSolution] = useState(null);
  const [solutionTenantMode, setSolutionTenantMode] = useState(null);
  const solutions = useMemo(() => {
    const list = modulesData?.equipements?.Antivirus?.solutions;
    return Array.isArray(list) ? list : [];
  }, [modulesData]);
  const antivirusProviders = useMemo(() => getAntivirusProviderOptions(), []);
  const selectedGlobalConfigured = useMemo(() => resolveProviderGlobalConfigured(selectedProviderId, integrationSettings, {
    bitdefender: globalBitdefenderConfigured
  }), [selectedProviderId, integrationSettings, globalBitdefenderConfigured]);
  const selectedProvider = useMemo(() => getAntivirusProvider(selectedProviderId), [selectedProviderId]);
  const visibleTenantMode = useMemo(() => {
    if (activeSection === "reseller") return "reseller";
    if (activeSection === "dedicated" || activeSection === "guide") return "dedicated";
    return null;
  }, [activeSection]);
  const navSections = useMemo(() => copy.navSections({
    selectedProviderId,
    globalConfigured: selectedGlobalConfigured,
    visibleTenantMode
  }), [copy, selectedProviderId, selectedGlobalConfigured, visibleTenantMode]);
  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    const list = q ? companies.filter(c => (c.name || "").toLowerCase().includes(q) || String(c.id || "").toLowerCase().includes(q)) : companies;
    return list.slice(0, 15);
  }, [companies, companySearch]);
  const updateCompanyDropdownPosition = useCallback(() => {
    const input = companyInputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setCompanyDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex()
    });
  }, []);
  useEffect(() => {
    if (!companyDropdownOpen) return undefined;
    updateCompanyDropdownPosition();
    const handleReposition = () => updateCompanyDropdownPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [companyDropdownOpen, updateCompanyDropdownPosition, filteredCompanies.length]);
  useEffect(() => {
    const handleClickOutside = e => {
      const inField = companyAutocompleteRef.current?.contains(e.target);
      const inDropdown = companyDropdownRef.current?.contains(e.target);
      if (!inField && !inDropdown) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const sectionBadges = useMemo(() => {
    const hasReseller = solutions.some(s => (s.providerId === "bitdefender" || !s.providerId) && (s.mappingMode || "reseller") === "reseller" && s.companyId);
    const hasDedicated = solutions.some(s => (s.providerId === "bitdefender" || !s.providerId) && s.mappingMode === "dedicated" && s.companyId);
    const hasManual = solutions.some(s => s.providerId === "manual" || s.mappingMode === "manual" || !s.companyId && s.solution);
    return {
      overview: solutions.length > 0,
      solution: Boolean(selectedProviderId),
      reseller: hasReseller,
      dedicated: hasDedicated || dedicatedTenants.length > 0,
      manual: hasManual
    };
  }, [solutions, dedicatedTenants, selectedProviderId]);
  const loadData = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [modules, globalStatus, tenantsResult, settingsList] = await Promise.all([fetchClientModules(client.id), getGlobalBitdefenderStatus().catch(() => ({
        configured: false
      })), listClientBitdefenderTenants(client.id).catch(() => ({
        tenants: []
      })), fetchSettings().catch(() => [])]);
      setModulesData(modules);
      setIntegrationSettings(settingsToMap(settingsList));
      setGlobalBitdefenderConfigured(Boolean(globalStatus?.configured));
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
  const loadCompanies = useCallback(async credentialContext => {
    setLoadingCompanies(true);
    try {
      const data = await fetchBitdefenderCompanies(credentialContext);
      const unique = [];
      const seen = new Set();
      (data.companies || []).forEach(company => {
        const id = company.id || company._id;
        const name = company.name || company.companyName || copy.solutionFallbackLabels.unnamedCompany;
        if (id && !seen.has(id)) {
          seen.add(id);
          unique.push({
            id,
            name
          });
        }
      });
      setCompanies(unique);
      return unique;
    } catch (error) {
      showError(error.message || copy.toasts.loadCompaniesError);
      setCompanies([]);
      return [];
    } finally {
      setLoadingCompanies(false);
    }
  }, [copy]);
  const syncCompanyFieldFromSolution = useCallback((solution, companyList = []) => {
    if (!solution?.companyId) return;
    const companyName = solution.companyName || solution.syncData?.company?.name || String(solution.companyId);
    const match = companyList.find(c => String(c.id) === String(solution.companyId));
    const company = match || {
      id: solution.companyId,
      name: companyName
    };
    setSelectedCompany(company);
    setCompanySearch(company.name);
  }, []);
  const isEditingSolutionForMapping = useCallback(mappingMode => {
    if (!editingSolution?.companyId) return false;
    if ((editingSolution.mappingMode || "reseller") !== mappingMode) return false;
    if (mappingMode === "dedicated") {
      return editingSolution.bitdefenderTenantId != null && Number(editingSolution.bitdefenderTenantId) === Number(selectedDedicatedTenantId);
    }
    return true;
  }, [editingSolution, selectedDedicatedTenantId]);
  const startEditingSolution = useCallback(solution => {
    if (!solution) return;
    setEditingSolution(solution);
    const providerId = inferProviderIdFromSolution(solution);
    setSelectedProviderId(providerId);
    if (providerId === "bitdefender") {
      if (solution.mappingMode === "dedicated" && solution.bitdefenderTenantId) {
        setSelectedDedicatedTenantId(solution.bitdefenderTenantId);
      }
      if (solution.companyId) {
        syncCompanyFieldFromSolution(solution);
      } else {
        setSelectedCompany(null);
        setCompanySearch("");
      }
      setActiveSection(solution.mappingMode === "dedicated" ? "dedicated" : "reseller");
      setSolutionTenantMode(solution.mappingMode === "dedicated" ? "dedicated" : "reseller");
      return;
    }
    setManualForm({
      solution: solution.solution || solution.nom || "",
      licencesTotales: solution.licencesTotales || "",
      licencesUtilisees: solution.licencesUtilisees || "",
      expiration: solution.expiration || ""
    });
    setActiveSection("manual");
  }, [syncCompanyFieldFromSolution]);
  useEffect(() => {
    if (initialEditingSolution) {
      startEditingSolution(initialEditingSolution);
      return;
    }
    setEditingSolution(null);
    setSolutionTenantMode(null);
    setActiveSection(initialSection);
    if (initialSection === "reseller" || initialSection === "dedicated") {
      setSelectedProviderId("bitdefender");
    } else if (initialSection === "manual") {
      setSelectedProviderId("manual");
    }
  }, [initialSection, initialEditingSolution, client?.id, startEditingSolution]);
  useEffect(() => {
    if (activeSection !== "reseller" || !client?.id || selectedProviderId !== "bitdefender") return;
    if (!selectedGlobalConfigured) {
      setCompanies([]);
      return;
    }
    if (!isEditingSolutionForMapping("reseller")) {
      setSelectedCompany(null);
      setCompanySearch("");
    }
    const editing = editingSolution;
    const preserveSelection = editing?.companyId && (editing.mappingMode || "reseller") === "reseller";
    loadCompanies({
      clientId: client.id,
      mappingMode: "reseller"
    }).then(loaded => {
      if (preserveSelection && editing) {
        syncCompanyFieldFromSolution(editing, loaded);
      }
    });
  }, [activeSection, client?.id, selectedGlobalConfigured, selectedProviderId, loadCompanies, isEditingSolutionForMapping, editingSolution, syncCompanyFieldFromSolution]);
  useEffect(() => {
    if (activeSection !== "dedicated" || !client?.id) return;
    if (dedicatedTenants.length === 1 && !selectedDedicatedTenantId) {
      setSelectedDedicatedTenantId(dedicatedTenants[0].id);
      setCreatingDedicatedTenant(false);
    } else if (dedicatedTenants.length === 0) {
      setCreatingDedicatedTenant(true);
      setSelectedDedicatedTenantId(null);
      setCompanies([]);
    }
  }, [activeSection, client?.id, dedicatedTenants, selectedDedicatedTenantId]);
  useEffect(() => {
    if (activeSection !== "dedicated" || !selectedDedicatedTenantId || !client?.id) return;
    if (!isEditingSolutionForMapping("dedicated")) {
      setSelectedCompany(null);
      setCompanySearch("");
    }
    const editing = editingSolution;
    const preserveSelection = editing?.companyId && editing.mappingMode === "dedicated" && Number(editing.bitdefenderTenantId) === Number(selectedDedicatedTenantId);
    loadCompanies({
      clientId: client.id,
      bitdefenderTenantId: selectedDedicatedTenantId,
      mappingMode: "dedicated"
    }).then(loaded => {
      if (preserveSelection && editing) {
        syncCompanyFieldFromSolution(editing, loaded);
      }
    });
  }, [activeSection, selectedDedicatedTenantId, client?.id, loadCompanies, isEditingSolutionForMapping, editingSolution, syncCompanyFieldFromSolution]);
  const handleDedicatedTenantSelect = tenantId => {
    if (tenantId === "new") {
      setCreatingDedicatedTenant(true);
      setSelectedDedicatedTenantId(null);
      setCompanies([]);
      setSelectedCompany(null);
      return;
    }
    setSelectedDedicatedTenantId(Number(tenantId));
    setCreatingDedicatedTenant(false);
  };
  const handleTestDedicatedCredentials = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      if (selectedDedicatedTenantId && !creatingDedicatedTenant) {
        await testClientBitdefenderTenant(client.id, selectedDedicatedTenantId);
      } else {
        await testBitdefenderCredentials({
          apiUrl: dedicatedForm.apiUrl,
          apiKey: dedicatedForm.apiKey
        });
      }
      setConnectionStatus("success");
      showSuccess(copy.toasts.testConnectionSuccess);
    } catch (error) {
      setConnectionStatus("error");
      showError(error.message || copy.toasts.testConnectionError);
    } finally {
      setTestingConnection(false);
    }
  };
  const handleCreateDedicatedTenant = async () => {
    if (!dedicatedForm.apiUrl?.trim() || !dedicatedForm.apiKey?.trim()) {
      showError(copy.toasts.apiCredentialsRequired);
      return;
    }
    setSaving(true);
    try {
      const result = await createClientBitdefenderTenant(client.id, {
        apiUrl: dedicatedForm.apiUrl.trim(),
        apiKey: dedicatedForm.apiKey.trim()
      });
      const tenant = result.tenant;
      setDedicatedTenants(prev => [...prev, tenant]);
      setSelectedDedicatedTenantId(tenant.id);
      setCreatingDedicatedTenant(false);
      setDedicatedForm({
        apiUrl: "",
        apiKey: ""
      });
      showSuccess(copy.toasts.tenantSaved);
    } catch (error) {
      showError(error.message || copy.toasts.tenantCreateError);
    } finally {
      setSaving(false);
    }
  };
  const handleSaveMapping = async mappingMode => {
    if (!selectedCompany?.id) {
      showError(copy.toasts.selectCompany);
      return;
    }
    if (mappingMode === "dedicated" && !selectedDedicatedTenantId) {
      showError(copy.toasts.selectOrCreateTenant);
      return;
    }
    const credentialContext = mappingMode === "dedicated" ? {
      clientId: client.id,
      bitdefenderTenantId: selectedDedicatedTenantId,
      mappingMode: "dedicated"
    } : {
      clientId: client.id,
      mappingMode: "reseller"
    };
    setSyncing(true);
    try {
      const [syncResult, syncExtra] = await Promise.all([syncBitdefenderCompany(selectedCompany.id, credentialContext), fetchFullAntivirusSyncExtra(selectedCompany.id, credentialContext)]);
      if (!syncResult.success) {
        throw new Error(syncResult.error || copy.toasts.syncFailed);
      }
      const newSolution = formatAntivirusSyncPayload(syncResult.data, selectedCompany.id, selectedCompany.name, mappingMode, selectedDedicatedTenantId, "bitdefender", syncExtra);
      const existingEquipements = modulesData?.equipements || {};
      const antivirusEquipement = existingEquipements.Antivirus || {};
      const existingSolutions = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
      const filtered = existingSolutions.filter(s => !(s.solution === SOLUTION_NAME && s.companyId === newSolution.companyId && (s.mappingMode || "reseller") === mappingMode && (s.bitdefenderTenantId || null) === (newSolution.bitdefenderTenantId || null)));
      const existingMatch = existingSolutions.find(s => s.solution === SOLUTION_NAME && s.companyId === newSolution.companyId && (s.mappingMode || "reseller") === mappingMode && (s.bitdefenderTenantId || null) === (newSolution.bitdefenderTenantId || null));
      await saveClientModules(client.id, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antivirus: true
        },
        equipements: {
          ...existingEquipements,
          Antivirus: {
            ...antivirusEquipement,
            solutions: [...filtered, {
              id: existingMatch?.id ?? editingSolution?.id ?? createAntivirusSolutionId(),
              ...newSolution
            }]
          }
        }
      });
      showSuccess(existingMatch || editingSolution ? copy.toasts.configUpdated : copy.toasts.solutionLinked);
      setSelectedCompany(null);
      setCompanySearch("");
      setCompanyDropdownOpen(false);
      setSelectedProviderId("bitdefender");
      setEditingSolution(null);
      await loadData();
      await onSaved?.();
      setActiveSection("overview");
    } catch (error) {
      console.error(error);
      showError(error.message || copy.toasts.saveError);
    } finally {
      setSyncing(false);
    }
  };
  const requestDeleteSolution = solution => {
    setDeleteTarget(solution);
  };
  const confirmDeleteSolution = async () => {
    if (!deleteTarget || !client?.id) return;
    const solution = deleteTarget;
    const solutionKey = `${solution.companyId}-${solution.mappingMode || "reseller"}-${solution.bitdefenderTenantId || "global"}`;
    setDeletingSolutionKey(solutionKey);
    try {
      await removeAntivirusSolution(client.id, solution);
      if (editingSolution && editingSolution.id === solution.id) {
        setEditingSolution(null);
      }
      showSuccess(copy.toasts.associationDeleted);
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
      showError(copy.formatProviderComingSoonToast(provider.label));
      return;
    }
    if (isIntegrationProLocked(provider.catalogIntegration, isCommunity)) {
      notifyProFeature(provider.label || copy.toasts.proFeatureFallback);
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
  const handleReconfigureSolution = solution => {
    startEditingSolution(solution);
  };
  const handleSaveManual = async () => {
    const solutionName = (manualForm.solution || "").trim();
    if (!solutionName) {
      showError(copy.toasts.solutionNameRequired);
      return;
    }
    setSaving(true);
    try {
      const newSolution = {
        providerId: "manual",
        mappingMode: "manual",
        isManual: true,
        solution: solutionName,
        nom: solutionName,
        name: solutionName,
        licencesTotales: manualForm.licencesTotales.trim(),
        licencesUtilisees: manualForm.licencesUtilisees.trim(),
        expiration: manualForm.expiration || ""
      };
      const existingEquipements = modulesData?.equipements || {};
      const antivirusEquipement = existingEquipements.Antivirus || {};
      const existingSolutions = Array.isArray(antivirusEquipement.solutions) ? antivirusEquipement.solutions : [];
      const isEditingManual = editingSolution && (editingSolution.mappingMode === "manual" || editingSolution.isManual || editingSolution.providerId === "manual");
      const nextSolutions = isEditingManual ? existingSolutions.map(entry => entry.id === editingSolution.id ? {
        ...entry,
        ...newSolution,
        id: entry.id
      } : entry) : [...existingSolutions, {
        id: createAntivirusSolutionId(),
        ...newSolution
      }];
      await saveClientModules(client.id, {
        modules: modulesData?.modules || {
          Monitoring: true
        },
        modules_monitoring: {
          ...(modulesData?.modules_monitoring || {}),
          Antivirus: true
        },
        equipements: {
          ...existingEquipements,
          Antivirus: {
            ...antivirusEquipement,
            solutions: nextSolutions
          }
        }
      });
      showSuccess(isEditingManual ? copy.toasts.configUpdated : copy.toasts.manualSaved);
      setManualForm({
        solution: "",
        licencesTotales: "",
        licencesUtilisees: "",
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
  const renderSolutionPicker = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.solutionPicker.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.solutionPicker.description}</p>
      </div>

      <div className={avStyles.providerList}>
        {antivirusProviders.map(provider => {
        const isSelected = selectedProviderId === provider.id;
        const isComingSoon = provider.status === "comingSoon";
        const proLocked = isIntegrationProLocked(provider.catalogIntegration, isCommunity);
        const globalAvailable = !provider.isManual && resolveProviderGlobalConfigured(provider.id, integrationSettings, {
          bitdefender: globalBitdefenderConfigured
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

      {selectedProvider && !selectedProvider.isManual && selectedProvider.status === "available" && selectedProviderId === "bitdefender" ? <>
          <div className={formStyles.contentDivider} />
          <div className={formStyles.sectionHead}>
            <h3 className={formStyles.sectionTitle}>
              {copy.formatConnectionTitle(selectedProvider.label)}
            </h3>
            <p className={formStyles.sectionDesc}>
              {selectedGlobalConfigured ? copy.solutionPicker.globalIntegrationDetected : copy.solutionPicker.noGlobalIntegration}
            </p>
          </div>
          <div className={avStyles.modeGrid}>
            {(!solutionTenantMode || solutionTenantMode === "reseller") && <button type="button" className={`${avStyles.modeCard} ${!selectedGlobalConfigured ? avStyles.modeCardDisabled : ""} ${solutionTenantMode === "reseller" ? avStyles.modeCardActive : ""}`} onClick={() => {
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
            </button>}
            {(!solutionTenantMode || solutionTenantMode === "dedicated") && <button type="button" className={`${avStyles.modeCard} ${solutionTenantMode === "dedicated" ? avStyles.modeCardActive : ""}`} onClick={() => {
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
            </button>}
          </div>
        </> : null}
    </>;
  const renderManual = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.manual.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.manual.description}</p>
      </div>
      <div className={formStyles.field}>
        <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="manual-solution-name">
          {copy.manual.solutionName}
        </label>
        <input id="manual-solution-name" type="text" className={formStyles.input} value={manualForm.solution} onChange={e => setManualForm({
        ...manualForm,
        solution: e.target.value
      })} placeholder={copy.manual.solutionNamePlaceholder} autoComplete="off" />
      </div>
      <div className={formStyles.fieldGrid2}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="manual-licences-total">
            {copy.manual.licencesTotales}
          </label>
          <input id="manual-licences-total" type="text" className={formStyles.input} value={manualForm.licencesTotales} onChange={e => setManualForm({
          ...manualForm,
          licencesTotales: e.target.value
        })} />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="manual-licences-used">
            {copy.manual.licencesUtilisees}
          </label>
          <input id="manual-licences-used" type="text" className={formStyles.input} value={manualForm.licencesUtilisees} onChange={e => setManualForm({
          ...manualForm,
          licencesUtilisees: e.target.value
        })} />
        </div>
      </div>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="manual-expiration">
          {copy.manual.expiration}
        </label>
        <input id="manual-expiration" type="date" className={formStyles.input} value={manualForm.expiration} onChange={e => setManualForm({
        ...manualForm,
        expiration: e.target.value
      })} />
      </div>
    </>;
  const renderOverview = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.overview.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.overview.description}</p>
      </div>

      {solutions.length === 0 ? <div className={avStyles.emptyState}>{copy.overview.empty}</div> : <div className={avStyles.solutionList}>
          {solutions.map((solution, index) => {
        const summary = formatAntivirusSolutionSummary(solution);
        const solutionKey = `${solution.companyId || index}-${solution.mappingMode || "reseller"}-${solution.bitdefenderTenantId || "global"}`;
        const isDeleting = deletingSolutionKey === `${solution.companyId}-${solution.mappingMode || "reseller"}-${solution.bitdefenderTenantId || "global"}`;
        return <div key={solutionKey} className={avStyles.solutionCard}>
              <SolutionProviderIcon provider={getAntivirusProvider(summary.providerId)} fallbackIcon="mdi:shield-bug-outline" />
              <div className={avStyles.solutionCardMain}>
                <div className={avStyles.solutionName} title={summary.label}>
                  {summary.label}
                </div>
                <div className={avStyles.solutionMeta}>
                  {summary.providerName}
                  {" · "}
                  {copy.getAntivirusSolutionModeLabel(solution)}
                  {solution.companyId ? ` · ${solution.companyId}` : ""}
                </div>
              </div>
              <div className={avStyles.solutionCardButtons}>
                {solution.companyId && onViewSolution ? <button type="button" className={avStyles.solutionIconBtn} onClick={() => onViewSolution(solution)} disabled={Boolean(deletingSolutionKey)} aria-label={copy.formatViewDataAria(summary.label)} title={copy.overview.viewData}>
                    <Icon icon="mdi:chart-box-outline" aria-hidden />
                  </button> : null}
                <button type="button" className={avStyles.solutionIconBtn} onClick={() => handleReconfigureSolution(solution)} disabled={Boolean(deletingSolutionKey)} aria-label={copy.formatEditAria(summary.label)} title={copy.overview.edit}>
                  <Icon icon="mdi:pencil-outline" aria-hidden />
                </button>
                <button type="button" className={`${avStyles.solutionIconBtn} ${avStyles.solutionIconBtnDanger}`} onClick={() => requestDeleteSolution(solution)} disabled={Boolean(deletingSolutionKey)} aria-label={copy.formatDeleteAria(summary.label)} title={common.delete}>
                  <Icon icon={isDeleting ? "mdi:loading" : "mdi:delete-outline"} className={isDeleting ? formStyles.spinning : ""} aria-hidden />
                </button>
              </div>
            </div>;
      })}
        </div>}
    </>;
  const renderCompanyPicker = () => {
    const showCompaniesLoadingState = loadingCompanies && !companySearch.trim() && !selectedCompany;
    return <div className={formStyles.field}>
      <label className={formStyles.label} htmlFor="gz-company-search">
        {copy.companyPicker.label}
      </label>
      {showCompaniesLoadingState ? <div className={avStyles.companiesLoading} role="status" aria-live="polite">
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          <div>
            <strong>{copy.companyPicker.loadingTitle}</strong>
            <span>{copy.companyPicker.loadingDesc}</span>
          </div>
        </div> : <>
          <div className={formStyles.autocomplete} ref={companyAutocompleteRef}>
            <input ref={companyInputRef} id="gz-company-search" type="text" className={formStyles.input} value={companySearch} onChange={e => {
            const value = e.target.value;
            setCompanySearch(value);
            setCompanyDropdownOpen(true);
            if (selectedCompany && value !== selectedCompany.name) {
              setSelectedCompany(null);
            }
          }} onFocus={() => {
            setCompanyDropdownOpen(true);
            updateCompanyDropdownPosition();
          }} placeholder={copy.companyPicker.placeholder} autoComplete="off" aria-expanded={companyDropdownOpen} aria-haspopup="listbox" aria-controls="gz-company-dropdown" />
          </div>
          {companyDropdownOpen && companyDropdownStyle ? createPortal(<div ref={companyDropdownRef} id="gz-company-dropdown" className={`${formStyles.dropdown} ${avStyles.companyDropdownPortal}`} style={companyDropdownStyle} role="listbox">
                  {filteredCompanies.length === 0 ? <div className={formStyles.dropdownEmpty}>
                      {companySearch.trim() ? copy.companyPicker.emptySearch : copy.companyPicker.emptyList}
                    </div> : filteredCompanies.map(company => <button key={company.id} type="button" role="option" aria-selected={selectedCompany?.id === company.id} className={`${formStyles.dropdownOption} ${avStyles.dropdownOptionCompany} ${selectedCompany?.id === company.id ? formStyles.dropdownOptionSelected : ""}`} onClick={() => {
            setSelectedCompany(company);
            setCompanySearch(company.name);
            setCompanyDropdownOpen(false);
          }}>
                        <span className={avStyles.dropdownOptionName}>{company.name}</span>
                        <span className={avStyles.dropdownOptionId}>{company.id}</span>
                      </button>)}
                </div>, document.body) : null}
          {selectedCompany ? <p className={avStyles.selectedCompanyHint}>
              <Icon icon="mdi:check-circle-outline" aria-hidden />
              {copy.companyPicker.selectedPrefix} <strong>{selectedCompany.name}</strong>
            </p> : <p className={formStyles.hint}>{copy.companyPicker.hint}</p>}
        </>}
      {loadingCompanies && (companySearch.trim() || selectedCompany) ? <p className={formStyles.hint} style={{
        marginTop: "0.35rem"
      }}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          {" "}
          {copy.companyPicker.refreshing}
        </p> : null}
    </div>;
  };
  const renderReseller = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.reseller.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.reseller.description}</p>
      </div>
      {!selectedGlobalConfigured ? <div className={avStyles.emptyState}>
          {copy.formatResellerNotConfigured(selectedProvider?.label)}
        </div> : renderCompanyPicker()}
    </>;
  const renderDedicated = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.dedicated.title}</h3>
        <p className={formStyles.sectionDesc}>{copy.dedicated.description}</p>
      </div>

      {dedicatedTenants.length > 0 && !creatingDedicatedTenant && <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="dedicated-tenant-select">
            {copy.dedicated.existingTenant}
          </label>
          <select id="dedicated-tenant-select" className={avStyles.select} value={selectedDedicatedTenantId || ""} onChange={e => handleDedicatedTenantSelect(e.target.value)}>
            <option value="">{copy.dedicated.selectPlaceholder}</option>
            {dedicatedTenants.map(t => <option key={t.id} value={t.id}>
                {t.apiUrl || copy.formatDedicatedTenantLabel(t.id)}
              </option>)}
            <option value="new">{copy.dedicated.newTenant}</option>
          </select>
        </div>}

      {(creatingDedicatedTenant || dedicatedTenants.length === 0) && <form className={avStyles.dedicatedTenantForm} autoComplete="off" onSubmit={e => e.preventDefault()}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="tenant-api-url">
              {copy.dedicated.apiUrl}
            </label>
            <input id="tenant-api-url" name="bitdefender-tenant-api-url" type="text" inputMode="url" className={formStyles.input} value={dedicatedForm.apiUrl} onChange={e => setDedicatedForm({
          ...dedicatedForm,
          apiUrl: e.target.value
        })} placeholder={copy.dedicated.apiUrlPlaceholder} autoComplete="off" data-lpignore="true" data-1p-ignore />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="tenant-api-key">
              {copy.dedicated.apiKey}
            </label>
            <input id="tenant-api-key" name="bitdefender-tenant-api-key" type="password" className={formStyles.input} value={dedicatedForm.apiKey} onChange={e => setDedicatedForm({
          ...dedicatedForm,
          apiKey: e.target.value
        })} placeholder={copy.dedicated.apiKeyPlaceholder} autoComplete="new-password" data-lpignore="true" data-1p-ignore />
            <button type="button" className={integrationStyles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
              <Icon icon="mdi:help-circle-outline" aria-hidden />
              {copy.dedicated.apiGuideLink}
            </button>
          </div>
        </form>}

      {selectedDedicatedTenantId && !creatingDedicatedTenant && <>
          <div className={formStyles.contentDivider} />
          {renderCompanyPicker()}
        </>}
    </>;
  const renderSectionContent = () => {
    if (loading) {
      return <div className={avStyles.loadingBlock}>
          <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
          {copy.loading}
        </div>;
    }
    if ((activeSection === "reseller" || activeSection === "dedicated") && selectedProviderId && selectedProviderId !== "bitdefender" && selectedProviderId !== "manual") {
      return <div className={avStyles.emptyState}>
          {copy.formatComingSoonConfig(selectedProvider?.label)}
        </div>;
    }
    switch (activeSection) {
      case "solution":
        return renderSolutionPicker();
      case "manual":
        return renderManual();
      case "reseller":
        return renderReseller();
      case "dedicated":
        return renderDedicated();
      case "guide":
        return <BitdefenderApiGuide dedicated />;
      default:
        return renderOverview();
    }
  };
  const footerHint = useMemo(() => {
    if (selectedProvider) {
      return copy.formatFooterSolution(selectedProvider.label);
    }
    if (activeSection === "reseller" && selectedCompany) {
      return copy.formatFooterSelection(selectedCompany.name);
    }
    if (activeSection === "dedicated" && selectedCompany) {
      return copy.formatFooterSelection(selectedCompany.name);
    }
    if (activeSection === "overview" && solutions.length > 0) {
      return copy.formatFooterConfiguredCount(solutions.length);
    }
    return "";
  }, [activeSection, selectedCompany, solutions.length, selectedProvider, copy]);
  const canSaveMapping = selectedProviderId === "bitdefender" && (activeSection === "reseller" && selectedGlobalConfigured && selectedCompany || activeSection === "dedicated" && selectedDedicatedTenantId && selectedCompany);
  const canSaveManual = activeSection === "manual";
  const manualNameFilled = Boolean((manualForm.solution || "").trim());
  const showDedicatedTenantFormActions = activeSection === "dedicated" && selectedProviderId === "bitdefender" && (creatingDedicatedTenant || dedicatedTenants.length === 0);
  if (!client?.id) return null;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={syncing || saving || testingConnection ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="antivirus-config-modal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${avStyles.headerIconAntivirus}`} aria-hidden>
              <Icon icon="mdi:shield-bug-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="antivirus-config-modal-title">
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
                if (!selectedProviderId || selectedProviderId === "manual") {
                  setSelectedProviderId("bitdefender");
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
            }} disabled={section.disabled} title={section.disabled ? copy.nav.disabledTitle : undefined} aria-current={activeSection === section.id ? "step" : undefined}>
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
            {showDedicatedTenantFormActions && connectionStatus ? <span className={`${avStyles.connectionOk} ${connectionStatus === "error" ? avStyles.connectionError : ""}`}>
                {connectionStatus === "success" ? copy.footer.connected : copy.footer.connectionError}
              </span> : null}
          </span>
          <div className={formStyles.footerActions}>
            {showDedicatedTenantFormActions ? <>
                <button type="button" className={formStyles.ghostBtn} onClick={handleTestDedicatedCredentials} disabled={testingConnection || saving}>
                  <Icon icon={testingConnection ? "mdi:loading" : "mdi:lan-check"} className={testingConnection ? formStyles.spinning : ""} aria-hidden />
                  {copy.actions.testConnection}
                </button>
                <button type="button" className={formStyles.primaryBtn} onClick={handleCreateDedicatedTenant} disabled={saving || testingConnection}>
                  <Icon icon={saving ? "mdi:loading" : "mdi:content-save-outline"} className={saving ? formStyles.spinning : ""} aria-hidden />
                  {copy.actions.saveTenant}
                </button>
              </> : null}
            {canSaveManual ? <button type="button" className={formStyles.primaryBtn} onClick={handleSaveManual} disabled={saving || syncing || !manualNameFilled}>
                <Icon icon={saving ? "mdi:loading" : "mdi:content-save-outline"} className={saving ? formStyles.spinning : ""} aria-hidden />
                {saving ? common.saving : copy.actions.saveManual}
              </button> : null}
            {canSaveMapping ? <button type="button" className={formStyles.primaryBtn} onClick={() => handleSaveMapping(activeSection === "dedicated" ? "dedicated" : "reseller")} disabled={syncing || saving}>
                <Icon icon={syncing ? "mdi:loading" : "mdi:check"} className={syncing ? formStyles.spinning : ""} aria-hidden />
                {syncing ? copy.actions.syncing : copy.actions.linkAndSync}
              </button> : null}
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body)}
      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.deleteConfiguration.title} message={deleteTarget ? interpolate(configCopy.confirm.deleteConfiguration.message, {
      label: formatAntivirusSolutionSummary(deleteTarget).label
    }) : ""} confirmLabel={common.delete} variant="danger" icon="mdi:delete-outline" loading={Boolean(deletingSolutionKey)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDeleteSolution} />
    </>;
}
