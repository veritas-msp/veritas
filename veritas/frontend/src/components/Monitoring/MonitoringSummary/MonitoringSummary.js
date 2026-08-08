import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import styles from "./MonitoringSummary.module.css";
import { showError, showSuccess } from "../../../utils/toast";
import { useMonitoringContext } from "../../../contexts/MonitoringContext";
import { useTheme } from "../../../hooks/useTheme";
import API_BASE_URL from "../../../config";
import { getLogoPath } from "../../../utils/assetHelper";
import { safeJsonClone } from "../../../utils/safeJson";
import BackupSummary from "../MonitoringSummaryOverrides/SauvegardeSummary";
import StorageSummary from "../MonitoringSummaryOverrides/StockageSummary";
import StorageTopology from "../MonitoringSummaryOverrides/StockageTopology";
import FirewallsSummary from "../MonitoringSummaryOverrides/FirewallsSummary";
import FirewallReglesSummary from "../MonitoringSummaryOverrides/FirewallReglesSummary";
import AntivirusSummary from "../MonitoringSummaryOverrides/AntivirusSummary";
import AntispamSummary from "../MonitoringSummaryOverrides/AntispamSummary";
import O365Summary from "../MonitoringSummaryOverrides/O365Summary";
import NDDSummary from "../MonitoringSummaryOverrides/NDDSummary";
import InfrastructureTopology from "../MonitoringSummaryOverrides/InfrastructureTopology";
import ServersTopology from "../MonitoringSummaryOverrides/ServersTopology";
import ServersSummaryCards from "../MonitoringSummaryOverrides/ServersSummaryCards";
import SwitchesTopology from "../MonitoringSummaryOverrides/SwitchesTopology";
import SwitchesSummaryCards from "../MonitoringSummaryOverrides/SwitchesSummaryCards";
import WifiTopology from "../MonitoringSummaryOverrides/WifiTopology";
import WifiSummaryCards from "../MonitoringSummaryOverrides/WifiSummaryCards";
import { saveMonitoringDocument, fetchMonitoringDocuments, deleteMonitoringDocument } from "../../../api/monitoringDocuments";
import { toast } from "react-toastify";
import { exportMonitoringAsZIP, generateZIPBlob } from "./exportMonitoringUtils";
import { uploadReportArchiveToClientVault } from "../../../utils/uploadReportToClientVault";
import ReportSaveVisibilitySwitch from "../../shared/ReportSaveVisibilitySwitch";
import { REPORT_OPTIONS, fallbackModulesByReport, reportTitleMap, reportDescriptionMap } from "./monitoringConstants";
import { getModuleIcon, formatModuleLabel, getModuleCategory, normalizeModuleName, getModuleId } from "./monitoringUtils";
import InternetTitle from "./TitleComponents/InternetTitle";
import FirewallTitle from "./TitleComponents/FirewallTitle";
import ServerTitle from "./TitleComponents/ServerTitle";
import StorageTitle from "./TitleComponents/StorageTitle";
import SwitchTitle from "./TitleComponents/SwitchTitle";
import WifiTitle from "./TitleComponents/WifiTitle";
import AntivirusTitle from "./TitleComponents/AntivirusTitle";
import AntispamTitle from "./TitleComponents/AntispamTitle";
import FirewallReglesTitle from "./TitleComponents/FirewallReglesTitle";
import BackupTitle from "./TitleComponents/SauvegardeTitle";
import Office365Title from "./TitleComponents/Office365Title";
import NDDTitle from "./TitleComponents/NDDTitle";
function MonitoringSummary({
  config,
  data,
  onBack,
  resetFormData,
  onActionsReady = null
}) {
  const {
    theme
  } = useTheme();
  const {
    setMonitoringConfig
  } = useMonitoringContext();
  const [previewUrl, setPreviewUrl] = useState(null);
  const summaryRef = useRef(null);
  const [showInfos, setShowInfos] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const {
    resetComplet
  } = useMonitoringContext();
  const hasSavedRef = useRef(false);
  const [selectedReport, setSelectedReport] = useState("infrastructure");
  const [selectedModule, setSelectedModule] = useState('internet');
  const [selectedSites, setSelectedSites] = useState([]);
  const [sites, setSites] = useState([]);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});
  useEffect(() => {
    if (!config?.client?.id || !setMonitoringConfig) return;
    const controller = new AbortController();
    const loadAllEquipements = async () => {
      try {
        const clientId = config.client.id;
        const equipementsToLoad = [{
          family: 'servers',
          key: 'Serveurs'
        }, {
          family: 'stockage',
          key: 'NAS',
          key2: 'SAN'
        }, {
          family: 'switch',
          key: 'Switches'
        }, {
          family: 'wifi',
          key: 'BorneWifi'
        }, {
          family: 'firewall',
          key: 'Firewalls'
        }, {
          family: 'ndd',
          key: 'NDD'
        }, {
          family: 'antivirus',
          key: 'Antivirus',
          isObject: true
        }, {
          family: 'antispam',
          key: 'Antispam',
          isObject: true
        }, {
          family: 'save',
          key: 'Sauvegarde',
          isObject: true
        }, {
          family: 'o365',
          key: 'Office365',
          isObject: true
        }];
        const loadPromises = equipementsToLoad.map(async ({
          family,
          key,
          key2,
          isObject
        }) => {
          try {
            const res = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/${family}`, {
              credentials: "include",
              signal: controller.signal
            });
            if (!res.ok) return null;
            const rows = await res.json();
            if (family === 'stockage') {
              const nasList = (rows || []).filter(row => {
                if (!row.data || typeof row.data !== 'object') return false;
                return row.data.type !== 'SAN';
              }).map(row => {
                const {
                  id: dataId,
                  ...dataWithoutId
                } = row.data || {};
                return {
                  id: row.id,
                  ...dataWithoutId,
                  nom: row.data?.nom || row.name || row.item_key || "",
                  __fromDb: true
                };
              });
              const sanList = (rows || []).filter(row => {
                if (!row.data || typeof row.data !== 'object') return false;
                return row.data.type === 'SAN';
              }).map(row => {
                const {
                  id: dataId,
                  ...dataWithoutId
                } = row.data || {};
                return {
                  id: row.id,
                  ...dataWithoutId,
                  nom: row.data?.nom || row.name || row.item_key || "",
                  __fromDb: true
                };
              });
              return {
                NAS: nasList,
                SAN: sanList
              };
            } else if (isObject) {
              if (family === 'save') {
                const realItems = (rows || []).filter(row => {
                  if (!row.data || typeof row.data !== 'object') return false;
                  const dataKeys = Object.keys(row.data);
                  if (dataKeys.length === 1 && row.data.enabled === true) return false;
                  if (row.item_key && row.item_key.startsWith('job-')) {
                    return true;
                  }
                  return row.data.logiciel || row.data.instances && Array.isArray(row.data.instances);
                });
                let sauvegardeData = {
                  instances: []
                };
                if (realItems.length > 0) {
                  const firstItem = realItems[0];
                  if (firstItem.data.instances && Array.isArray(firstItem.data.instances) && realItems.length === 1) {
                    sauvegardeData = firstItem.data;
                  } else {
                    const instanceItems = realItems.filter(item => {
                      if (item.item_key && item.item_key.startsWith('job-')) return false;
                      if (item.data && item.data.type === 'job') return false;
                      if (item.data && item.data.type === 'instance') return true;
                      return item.data && item.data.logiciel;
                    });
                    const jobItems = realItems.filter(item => {
                      return item.item_key && item.item_key.startsWith('job-') || item.data && item.data.type === 'job';
                    });
                    const instances = instanceItems.map(instanceItem => {
                      const instanceData = {
                        ...instanceItem.data
                      };
                      delete instanceData.type;
                      const instanceFrontendId = instanceData.instanceId || instanceItem.id;
                      const instanceJobs = jobItems.filter(jobItem => {
                        const jobItemKey = jobItem.item_key || '';
                        if (jobItemKey.startsWith('job-')) {
                          const jobInstanceId = jobItemKey.substring(4);
                          return jobInstanceId === instanceFrontendId;
                        }
                        return false;
                      }).map(jobItem => {
                        const jobData = {
                          ...jobItem.data
                        };
                        delete jobData.type;
                        return {
                          id: jobItem.id,
                          ...jobData
                        };
                      });
                      return {
                        id: instanceFrontendId,
                        ...instanceData,
                        jobs: instanceJobs
                      };
                    });
                    sauvegardeData = {
                      instances
                    };
                  }
                }
                return {
                  [key]: sauvegardeData
                };
              } else {
                if (rows && rows.length > 0) {
                  const itemData = rows[0].data || {};
                  if (family === 'o365') {
                    const dataKeys = Object.keys(itemData);
                    if (dataKeys.length === 0 || dataKeys.length === 1 && itemData.enabled === true) {
                      return null;
                    }
                  }
                  return {
                    [key]: itemData
                  };
                }
                return null;
              }
            } else {
              const list = (rows || []).map(row => {
                const {
                  id: dataId,
                  ...dataWithoutId
                } = row.data || {};
                return {
                  id: row.id,
                  ...dataWithoutId,
                  nom: row.data?.nom || row.name || row.item_key || "",
                  __fromDb: true
                };
              });
              return {
                [key]: list
              };
            }
          } catch (err) {
            if (controller.signal.aborted) return null;
            console.error(`Error loading ${family}:`, err);
            return null;
          }
        });
        const results = await Promise.all(loadPromises);
        const allEquipements = results.reduce((acc, result) => {
          if (result) {
            Object.assign(acc, result);
          }
          return acc;
        }, {});
        if (Object.keys(allEquipements).length > 0) {
          setMonitoringConfig(prev => {
            if (!prev?.client) return prev;
            return {
              ...prev,
              client: {
                ...prev.client,
                equipements: {
                  ...(prev.client.equipements || {}),
                  ...allEquipements
                }
              }
            };
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading equipment:", err);
      }
    };
    loadAllEquipements();
    return () => controller.abort();
  }, [config?.client?.id]);
  useEffect(() => {
    document.body.classList.add('summary-page-active');
    return () => {
      document.body.classList.remove('summary-page-active');
    };
  }, []);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [docsPerPage] = useState(5);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const hasExternalHeaderActions = typeof onActionsReady === 'function';
  const performExportHTML = useCallback(async () => {
    console.log('🔵 performExportHTML called');
    try {
      console.log('📋 Checking references...');
      console.log('summaryRef:', summaryRef);
      console.log('summaryRef.current:', summaryRef?.current);
      console.log('config:', config);
      if (!summaryRef || !summaryRef.current) {
        const errorMsg = 'Error: Summary reference not available';
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }
      if (!config) {
        const errorMsg = 'Error: Configuration not available';
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }
      console.log('✅ References OK, starting exportMonitoringAsZIP...');
      await exportMonitoringAsZIP(summaryRef, config, {
        hasInfraContent,
        hasCyberContent,
        hasServicesContent
      });
      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('❌ Error during HTML export:', error);
      alert(`Error during HTML export: ${error.message || 'Unknown error'}`);
    }
  }, [config, summaryRef]);
  const handleExportHTML = useCallback(() => {
    console.log('🔵 handleExportHTML called, theme:', theme);
    if (theme === "dark") {
      console.log('⚠️ Dark mode detected, showing warning');
      setShowExportWarning(true);
      return;
    }
    console.log('✅ Light mode, starting export...');
    performExportHTML();
  }, [theme, performExportHTML]);
  useEffect(() => {
    if (onActionsReady) {
      onActionsReady({
        openSaveModal: () => setShowSaveModal(true),
        exportHTML: handleExportHTML
      });
    }
  }, [onActionsReady, handleExportHTML]);
  useEffect(() => {
    if (showSaveModal) {
      fetchMonitoringDocuments().then(docs => {
        const activeDocs = docs.filter(doc => !doc.is_trashed);
        setRecentDocs(activeDocs);
        setCurrentPage(1);
      }).catch(err => {
        console.error("Error retrieving documents:", err);
        setRecentDocs([]);
      });
    }
  }, [showSaveModal]);
  useEffect(() => {
    if (!selectedModule || !config?.client) {
      setSelectedSites([]);
      setSites([]);
      return;
    }
    const moduleToEquipments = {
      internet: () => config?.client?.equipements?.Internet || [],
      serveurs: () => config?.client?.equipements?.Serveurs || [],
      stockage: () => {
        const nasList = config?.client?.equipements?.NAS || [];
        const sanList = config?.client?.equipements?.SAN || [];
        const allStorage = [...nasList, ...sanList];
        return allStorage.filter(eq => eq != null);
      },
      firewall: () => config?.client?.equipements?.Firewalls || [],
      switch: () => config?.client?.equipements?.Switch || [],
      wifi: () => config?.client?.equipements?.BorneWifi || []
    };
    const modulesWithSites = new Set(['internet', 'serveurs', 'stockage', 'firewall', 'switch', 'wifi']);
    if (!modulesWithSites.has(selectedModule)) {
      setSelectedSites([]);
      setSites([]);
      return;
    }
    const getEquipments = moduleToEquipments[selectedModule];
    if (!getEquipments) {
      setSelectedSites([]);
      setSites([]);
      return;
    }
    const equipments = getEquipments();
    if (!Array.isArray(equipments) || equipments.length === 0) {
      setSelectedSites([]);
      setSites([]);
      return;
    }
    const sortSites = list => list.sort((a, b) => {
      if (a === "No site") return 1;
      if (b === "No site") return -1;
      return a.localeCompare(b);
    });
    const sitesSet = new Set();
    let hasNoSite = false;
    equipments.forEach(equipment => {
      const site = equipment?.site ? String(equipment.site).trim() : null;
      if (site && site.length > 0) {
        sitesSet.add(site);
      } else {
        hasNoSite = true;
      }
    });
    if (hasNoSite) {
      sitesSet.add("No site");
    }
    const rawSitesList = sortSites(Array.from(sitesSet));
    if (rawSitesList.length === 0) {
      setSelectedSites([]);
      setSites([]);
      return;
    }
    setSites(rawSitesList);
    setSelectedSites(rawSitesList);
  }, [selectedModule, config]);
  const refreshRecentDocs = () => {
    fetchMonitoringDocuments().then(docs => {
      const activeDocs = docs.filter(doc => !doc.is_trashed);
      setRecentDocs(activeDocs);
    }).catch(err => {
      console.error("Error retrieving documents:", err);
      setRecentDocs([]);
    });
  };
  const handleDeleteClick = (docId, docName, e) => {
    e.stopPropagation();
    setDocToDelete({
      id: docId,
      name: docName
    });
    setShowDeleteConfirm(true);
  };
  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    setDeletingDocId(docToDelete.id);
    try {
      const result = await deleteMonitoringDocument(docToDelete.id);
      if (result.success) {
        showSuccess("Document deleted successfully!");
        const newDocs = await fetchMonitoringDocuments();
        const activeDocs = newDocs.filter(doc => !doc.is_trashed);
        setRecentDocs(activeDocs);
        const totalPages = Math.ceil((newDocs.length - 1) / docsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
        }
        setShowDeleteConfirm(false);
        setDocToDelete(null);
      } else {
        showError(result.error || "Error deleting document.");
      }
    } catch (error) {
      showError(error.message || "Error deleting document.");
    } finally {
      setDeletingDocId(null);
    }
  };
  const handleLoadDocument = doc => {
    setSaveName(doc.name);
    const clientName = config?.client?.name || 'Anonymous';
    const reportPeriod = config?.client?.reportPeriod || null;
    const dataCopy = safeJsonClone(data);
    const configCopy = safeJsonClone(config);
    setPendingSave({
      name: doc.name,
      client_name: clientName,
      report_period: reportPeriod,
      config: configCopy,
      data: dataCopy
    });
    setShowOverwriteConfirm(true);
  };
  const handleSendEmail = async html => {
    const emails = emailInput.split(",").map(e => e.trim()).filter(e => e);
    if (!emails.length) {
      showError("Enter at least one address.");
      return;
    }
    const infos = {
      client: config.client.name,
      frequency: config.client.report_frequency,
      period: config.client.reportPeriod,
      modules: Object.entries(config.client.modules).filter(([_, val]) => val).map(([key]) => key.replace(/^cyber/i, "").replace(/^./, c => c.toUpperCase())).join(", ")
    };
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/email/send-monitoring-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          emails,
          html,
          infos
        })
      });
      if (res.ok) {
        showSuccess("📧 Report sent successfully!");
      } else {
        showError("Error sending the email.");
      }
    } catch (error) {
      showError("Error sending the email.");
      console.error(error);
    }
  };
  function ModuleTitle({
    title
  }) {
    return <div className={styles.moduleTitleBlock}>
        <h3 className={styles.moduleTitle}>{title}</h3>
        <hr className={styles.moduleDivider} />
      </div>;
  }
  const forceLightMode = useCallback(() => {
    localStorage.setItem("theme", "light");
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    const lightVariables = {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f9fafb',
      '--bg-tertiary': '#f3f4f6',
      '--bg-sidebar': '#ffffff',
      '--text-primary': '#000000',
      '--text-secondary': '#000000',
      '--text-muted': '#6b7280',
      '--text-inverted': '#ffffff',
      '--border-primary': '#e5e7eb',
      '--border-secondary': '#d1d5db',
      '--accent-primary': '#4f46e5',
      '--accent-secondary': '#6366f1',
      '--shadow-color': 'rgba(0, 0, 0, 0.1)'
    };
    Object.entries(lightVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#ffffff');
    }
    setTimeout(() => {
      performExportHTML();
    }, 200);
  }, [performExportHTML]);
  const {
    infrastructureModules,
    cybersecuriteModules,
    servicesModules
  } = useMemo(() => {
    const modulesSet = new Set();
    const normalizedModules = [];
    const addModule = moduleName => {
      if (!moduleName) return;
      const normalized = normalizeModuleName(moduleName);
      if (!modulesSet.has(normalized)) {
        modulesSet.add(normalized);
        normalizedModules.push(normalized);
      }
    };
    Object.keys(config?.client?.modules_monitoring || {}).forEach(key => {
      if (config?.client?.modules_monitoring?.[key]) {
        addModule(key);
      }
    });
    const addIf = (moduleName, condition) => {
      if (condition) {
        addModule(moduleName);
      }
    };
    addIf("internet", config?.client?.modules_monitoring?.Internet && (config?.client?.equipements?.Internet || []).length > 0);
    addIf("firewall", config?.client?.modules_monitoring?.Firewall && (config?.client?.equipements?.Firewalls || []).length > 0 && !!data?.firewalls);
    addIf("serveurs", (config?.client?.equipements?.Serveurs || []).length > 0 && !!data?.serveurs);
    addIf("stockage", ((config?.client?.equipements?.NAS || []).length > 0 || (config?.client?.equipements?.SAN || []).length > 0) && !!data?.stockage);
    addIf("switch", (config?.client?.equipements?.Switch || []).length > 0 && config?.client?.modules_monitoring?.Switch);
    addIf("wifi", (config?.client?.equipements?.BorneWifi || []).length > 0 && config?.client?.modules_monitoring?.Wifi);
    addIf("sauvegarde", !!config?.client?.modules_monitoring?.Sauvegarde);
    addIf("antivirus", !!config?.client?.modules_monitoring?.Antivirus);
    addIf("antispam", !!config?.client?.modules_monitoring?.Antispam);
    addIf("firewallregles", !!config?.client?.modules_monitoring?.FirewallRegles || !!config?.client?.modules_monitoring?.Firewall);
    addIf("ndd", (config?.client?.equipements?.NDD || []).length > 0);
    addIf("office365", !!config?.client?.modules_monitoring?.Office365 || !!data?.office365);
    const getInfrastructureOrder = moduleName => {
      const key = String(moduleName).toLowerCase();
      if (key.includes("internet")) return 1;
      if (key.includes("firewall") && !key.includes("regle")) return 2;
      if (key.includes("serveur")) return 3;
      if (key.includes("stockage")) return 4;
      if (key.includes("switch")) return 5;
      if (key.includes("wifi") || key.includes("borne")) return 6;
      return 99;
    };
    const getCybersecuriteOrder = moduleName => {
      const key = String(moduleName).toLowerCase();
      if (key.includes("antivirus")) return 1;
      if (key.includes("antispam")) return 2;
      if (key.includes("firewall") || key.includes("firewallregle")) return 3;
      if (key.includes("sauvegarde")) return 4;
      return 99;
    };
    const getServicesOrder = moduleName => {
      const key = String(moduleName).toLowerCase();
      if (key.includes("office365") || key.includes("o365")) return 1;
      if (key.includes("ndd")) return 2;
      return 99;
    };
    const infrastructureModules = normalizedModules.filter(m => getModuleCategory(m) === "infrastructure").sort((a, b) => getInfrastructureOrder(a) - getInfrastructureOrder(b));
    const cybersecuriteModules = normalizedModules.filter(m => getModuleCategory(m) === "cybersecurite").sort((a, b) => getCybersecuriteOrder(a) - getCybersecuriteOrder(b));
    const servicesModules = normalizedModules.filter(m => getModuleCategory(m) === "services").sort((a, b) => getServicesOrder(a) - getServicesOrder(b));
    return {
      infrastructureModules,
      cybersecuriteModules,
      servicesModules
    };
  }, [config, data]);
  const modulesForSelectedReport = useMemo(() => {
    if (selectedReport === "cybersecurite") return cybersecuriteModules;
    if (selectedReport === "services") return servicesModules;
    return infrastructureModules;
  }, [selectedReport, infrastructureModules, cybersecuriteModules, servicesModules]);
  const moduleNavList = modulesForSelectedReport.length > 0 ? modulesForSelectedReport : fallbackModulesByReport[selectedReport] || [];
  const hasInfraContent = Boolean(infrastructureModules.length > 0);
  const hasCyberContent = Boolean(cybersecuriteModules.length > 0);
  const hasServicesContent = Boolean(servicesModules.length > 0);
  const archiveReportToClientVault = async ({
    visibleToClient,
    documentName,
    reportPeriod
  }) => {
    if (!config?.client?.id || !summaryRef?.current) return {
      skipped: true
    };
    try {
      const zipBlob = await generateZIPBlob(summaryRef, config, {
        hasInfraContent,
        hasCyberContent,
        hasServicesContent
      });
      if (!zipBlob) throw new Error("ZIP generation failed");
      await uploadReportArchiveToClientVault({
        blob: zipBlob,
        fileName: documentName ? `${documentName}.zip` : undefined,
        clientId: config.client.id,
        clientName: config.client.name || "",
        description: reportPeriod || "",
        visibleToClient
      });
      return {
        success: true
      };
    } catch (err) {
      console.error("Vault archiving error:", err);
      return {
        success: false,
        error: err.message
      };
    }
  };
  const handleSave = async (forceOverwrite = false) => {
    if (!saveName.trim()) return null;
    setSaving(true);
    try {
      const dataCopy = safeJsonClone(data);
      const configCopy = safeJsonClone(config);
      const clientName = config?.client?.name || "CLIENT";
      const reportPeriod = config?.client?.reportPeriod || null;
      const result = await saveMonitoringDocument({
        name: saveName,
        client_name: clientName,
        report_period: reportPeriod,
        config: configCopy,
        data: dataCopy,
        overwrite: forceOverwrite
      });
      if (result.success) {
        const vaultResult = await archiveReportToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod
        });
        setSaveSuccessVisible(true);
        setSaveName("");
        refreshRecentDocs();
        setTimeout(() => setSaveSuccessVisible(false), 3000);
        if (vaultResult.success) {
          toast.success(saveVisibleToClient ? "Report saved and shared with the company." : "Report saved (internal agents only).");
        } else if (!vaultResult.skipped) {
          toast.warn("Report saved, but the document archiving failed.");
        } else {
          toast.success("Report saved.");
        }
        return result;
      }
      if (result.message && result.message.includes("Document already saved")) {
        setPendingSave({
          name: saveName,
          client_name: clientName,
          report_period: reportPeriod,
          config: configCopy,
          data: dataCopy,
          visibleToClient: saveVisibleToClient
        });
        setShowOverwriteConfirm(true);
        return null;
      }
      const errorMessage = result.error || result.message || "Error while saving.";
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(errorMessage);
      return result;
    } catch (error) {
      setSaveErrorVisible(true);
      setTimeout(() => setSaveErrorVisible(false), 3000);
      toast.error(error.message || "Error while saving.");
      return {
        success: false,
        error: error.message
      };
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    const observers = [];
    const sectionElements = document.querySelectorAll(`.${styles.scrollSection}`);
    sectionElements.forEach(section => {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      });
      observer.observe(section);
      observers.push(observer);
    });
    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [config, data]);
  useEffect(() => {
    const hasContent = {
      infrastructure: infrastructureModules.length > 0,
      cybersecurite: cybersecuriteModules.length > 0,
      services: servicesModules.length > 0
    };
    if (!hasContent[selectedReport]) {
      if (hasContent.infrastructure) setSelectedReport('infrastructure');else if (hasContent.cybersecurite) setSelectedReport('cybersecurite');else if (hasContent.services) setSelectedReport('services');
    }
    const reportModules = moduleNavList;
    if (reportModules.length === 0) {
      setSelectedModule(null);
      return;
    }
    if (!reportModules.includes(selectedModule)) {
      setSelectedModule(reportModules[0]);
    }
  }, [selectedReport, moduleNavList, selectedModule, infrastructureModules, cybersecuriteModules, servicesModules]);
  const handleModuleNavigation = moduleName => {
    setSelectedModule(moduleName);
    const targetId = getModuleId(moduleName);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  return <div className={`${styles.summaryPage} ${theme === "dark" ? styles.dark : ""}`} ref={summaryRef}>
      {}
      <div className={styles.clientNameTitleContainer}>
        <div className={styles.clientNameTitleWrapper}>
          <div>
            <h1 className={styles.clientNameTitle}>
              {config?.client?.name || 'CLIENT'}
            </h1>
            <p className={styles.clientNameSubtitle}>
              {config?.client?.reportPeriod || 'Period not specified'}
            </p>
          </div>
          <div className={styles.reportSelector}>
            {REPORT_OPTIONS.map(option => {
            const hasContent = {
              infrastructure: infrastructureModules.length > 0,
              cybersecurite: cybersecuriteModules.length > 0,
              services: servicesModules.length > 0
            }[option.id];
            return <button key={option.id} data-variant={option.id} className={`${styles.reportPill} ${selectedReport === option.id ? styles.reportPillActive : ''} ${!hasContent ? styles.reportPillDisabled : ''}`} onClick={() => hasContent && setSelectedReport(option.id)} disabled={!hasContent} title={!hasContent ? `No ${option.label.toLowerCase()} module available` : ''}>
                  {option.label}
                </button>;
          })}
          </div>
        </div>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.leftContent}>
          <div className={styles.reportSummary}>
            <div className={styles.headerStack}>
              <div className={styles.reportHero}>
                <h2 className={`${styles.reportHeroTitle} ${selectedReport === "cybersecurite" ? styles.reportHeroTitleCyber : selectedReport === "services" ? styles.reportHeroTitleServices : styles.reportHeroTitleInfra}`}>
                  {reportTitleMap[selectedReport]?.toUpperCase()}
                </h2>
                <p className={styles.reportHeroSubtitle}>
                  {reportDescriptionMap[selectedReport]}
                </p>
              </div>
            </div>
          </div>

          {}
          <div className={styles.modulesSection}>
              {moduleNavList.length > 0 && <div className={styles.moduleNavCluster}>
                  <div className={styles.modulesDivider} style={{
              borderColor: selectedReport === "cybersecurite" ? "#ef4444" : selectedReport === "services" ? "#8b5cf6" : "#3b82f6"
            }}></div>
                  <nav className={styles.moduleNav}>
                    <div className={styles.moduleButtonsWrapper}>
                      <div className={styles.moduleButtonsRow}>
                        {moduleNavList.map(m => {
                    const icon = getModuleIcon(m);
                    if (!icon) return null;
                    const isActive = selectedModule === m;
                    return <button key={m} data-report={selectedReport} className={`${styles.moduleBtn} ${isActive ? styles.active : ''}`} title={formatModuleLabel(m)} onClick={() => handleModuleNavigation(m)}>
                              {icon}
                            </button>;
                  })}
                      </div>
                    </div>
                  </nav>
                </div>}
              <div className={styles.internetPinned} style={{
            display: selectedReport === "infrastructure" ? '' : 'none'
          }}>
                  {}
                  {config?.client?.modules_monitoring?.Internet && <>
                      <div id="internet-section" className={styles.internetSection}>
                        <InternetTitle />
                      </div>
                      {}
                      <div className={styles.topologyWrapper}>
                        <h3 className={styles.sectionSubtitle}>Internet connection topology</h3>
                        <InfrastructureTopology config={config} data={data} selectedSites={[]} />
                        <hr className={styles.moduleSeparator} />
                      </div>
                    </>}
                  {}
                  {config?.client?.modules_monitoring?.Firewall && data?.firewalls && <>
                      <div className={styles.firewallsSection}>
                        <div id="firewalls-section" className={styles.firewallTitleWrapper}>
                          <FirewallTitle />
                        </div>
                        <h3 className={styles.sectionSubtitle}>Firewall health status</h3>
                        <FirewallsSummary data={data.firewalls} config={config} selectedSites={[]} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}
                  {}
                  {data?.serveurs && <>
                      {}
                      <ServerTitle />
                      {}
                      <div className={styles.serversTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Server heatmap</h3>
                        <ServersTopology config={config} data={data} selectedSites={[]} />
                      </div>
                    </>}

                  {}
                  {data?.serveurs && <>
                      <div className={styles.serversCardsSection}>
                        <h3 className={styles.sectionSubtitle}>Server health status</h3>
                        <ServersSummaryCards config={config} data={data} selectedSites={[]} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {data?.stockage && <>
                      {}
                      <StorageTitle />

                      {}
                      <div className={styles.storageTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Storage heatmap</h3>
                        <StorageTopology config={config} data={data?.stockage || data || {}} selectedSites={[]} />
                      </div>

                      {}
                      <div className={styles.storageCardsSection}>
                        <h3 className={styles.sectionSubtitle}>Storage health status</h3>
                        <StorageSummary data={data?.stockage || data || {}} config={config} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {config?.client?.equipements?.Switch && config.client.equipements.Switch.length > 0 && <>
                      {}
                      <SwitchTitle />
                      {}
                      <div className={styles.switchesTopologySection}>
                        <h3 className={styles.sectionSubtitle}>Switch heatmap</h3>
                        <SwitchesTopology config={config} data={data} selectedSites={[]} />
                      </div>
                    </>}

                  {}
                  {config?.client?.equipements?.Switch && config.client.equipements.Switch.length > 0 && <>
                      <div className={styles.switchesCardsSection}>
                        <h3 className={styles.sectionSubtitle}>Switch health status</h3>
                        <SwitchesSummaryCards config={config} data={data?.switches || data || {}} selectedSites={[]} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {config?.client?.equipements?.BorneWifi && config.client.equipements.BorneWifi.length > 0 && <>
                      {}
                      <WifiTitle />
                      {}
                      {config?.client?.ssids && config.client.ssids.length > 0 && <div className={styles.wifiSsidSection}>
                          <h3 className={styles.sectionSubtitle}>SSID</h3>
                          <div className={styles.ssidCardsContainer}>
                            {config.client.ssids.map((ssid, idx) => {
                    const ssidId = typeof ssid === 'string' ? ssid : ssid.id || `SSID-${idx + 1}`;
                    const ssidNom = typeof ssid === 'string' ? ssid : ssid.nom || 'Unnamed SSID';
                    return <div key={ssidId || idx} className={styles.ssidCard}>
                                  <span className={styles.ssidCardName}>{ssidNom}</span>
                                </div>;
                  })}
                          </div>
                        </div>}
                      {}
                      <div className={styles.wifiTopologySection}>
                        <h3 className={styles.sectionSubtitle}>WiFi access point heatmap</h3>
                        <WifiTopology config={config} data={data} selectedSites={[]} />
                      </div>
                    </>}

                  {}
                  {config?.client?.equipements?.BorneWifi && config.client.equipements.BorneWifi.length > 0 && <div className={styles.wifiCardsSection}>
                      <h3 className={styles.sectionSubtitle}>WiFi access point health status</h3>
                      <WifiSummaryCards config={config} data={data?.wifi || data || {}} selectedSites={[]} />
                    </div>}
                </div>
              <div className={styles.cybersecuritePinned} style={{
            display: selectedReport === "cybersecurite" ? '' : 'none'
          }}>
                  {}
                  {config?.client?.modules_monitoring?.Antivirus && <>
                      <div id="antivirus-section" className={styles.cyberModuleSection}>
                        <AntivirusTitle data={data?.antivirus} config={config} />
                        <AntivirusSummary data={data?.antivirus || {}} config={config} selectedSites={selectedSites} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {config?.client?.modules_monitoring?.Antispam && <>
                      <div id="antispam-section" className={styles.cyberModuleSection}>
                        <AntispamTitle data={data?.antispam} config={config} />
                        <AntispamSummary data={data?.antispam || {}} config={config} selectedSites={selectedSites} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {(config?.client?.modules_monitoring?.FirewallRegles || config?.client?.modules_monitoring?.Firewall) && <>
                      <div id="firewallregles-section" className={styles.cyberModuleSection}>
                        <FirewallReglesTitle data={data?.firewallregles} config={config} />
                        <FirewallReglesSummary data={data?.firewallregles || {}} config={config} selectedSites={selectedSites} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {config?.client?.modules_monitoring?.Sauvegarde && <div id="sauvegarde-section" className={styles.cyberModuleSection}>
                      <BackupTitle data={data?.sauvegarde} config={config} />
                      <BackupSummary data={data?.sauvegarde || {}} config={config} selectedSites={selectedSites} />
                    </div>}
                </div>
              <div className={styles.servicesPinned} style={{
            display: selectedReport === "services" ? '' : 'none'
          }}>
                  {}
                  {(data?.office365 || config?.client?.equipements?.Office365 && config.client.equipements.Office365 && typeof config.client.equipements.Office365 === 'object' && Object.keys(config.client.equipements.Office365).length > 0 && !(Object.keys(config.client.equipements.Office365).length === 1 && config.client.equipements.Office365.enabled === true)) && <>
                      <div id="office365-section" className={styles.serviceModuleSection}>
                        <Office365Title data={data?.office365} config={config} />
                        <O365Summary data={data?.office365 || {}} config={config} selectedSites={selectedSites} />
                      </div>
                      <hr className={styles.moduleSeparator} />
                    </>}

                  {}
                  {config?.client?.equipements?.NDD && config.client.equipements.NDD.length > 0 && <>
                      <div id="ndd-section" className={styles.serviceModuleSection}>
                        <NDDTitle />
                        <NDDSummary data={data} config={config} selectedSites={selectedSites} />
                      </div>
                    </>}
                </div>
          </div>
        </div>
      </div>

      {}
      <footer className={styles.summaryFooter}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogos}>
            <img src={getLogoPath('logo-psi.png')} alt="PSI" className={styles.footerLogoPSI} />
            <div className={styles.footerLogosSeparator}></div>
            <div className={styles.footerLogoWrapper}>
              <Icon icon="simple-icons:v" className={styles.footerLogoIcon} />
              <span className={styles.footerLogoText}>ERITAS</span>
            </div>
          </div>
          <div className={styles.footerText}>
            <p className={styles.footerMessage}>
              Need assistance or additional information?
            </p>
            <p className={styles.footerSubMessage}>
              Our team is available to answer all your questions.
            </p>
          </div>
          <div className={styles.footerContact}>
            <a href="mailto:support@psi.fr" className={styles.contactLink}>
              <span className={styles.contactIcon}>✉</span>
              support@psi.fr
            </a>
            <a href="tel:+33971007878" className={styles.contactLink}>
              <span className={styles.contactIcon}>📞</span>
              09 71 00 78 78
            </a>
          </div>
        </div>
      </footer>

      {}
      {showSaveModal && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) {
        setShowSaveModal(false);
      }
    }}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mdi:content-save" className={styles.modalIcon} />
                <h3>Save monitoring report</h3>
              </div>
              <button className={styles.closeButton} onClick={() => setShowSaveModal(false)} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.saveInputSection}>
                <label className={styles.saveInputLabel}>
                  Document name
                </label>
                <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="E.g.: Monitoring Report - Client Alpha" className={styles.saveInput} />
              </div>

              <ReportSaveVisibilitySwitch visibleToClient={saveVisibleToClient} onChange={setSaveVisibleToClient} disabled={saving} />

              {}
              {recentDocs.length > 0 && (() => {
            const totalPages = Math.ceil(recentDocs.length / docsPerPage);
            const startIndex = (currentPage - 1) * docsPerPage;
            const endIndex = startIndex + docsPerPage;
            const currentDocs = recentDocs.slice(startIndex, endIndex);
            return <div className={styles.recentDocs}>
                    <h4 className={styles.recentDocsTitle}>
                      <Icon icon="mdi:file-document-multiple" style={{
                  fontSize: '1.1rem',
                  marginRight: '0.5rem'
                }} />
                      My documents ({recentDocs.length})
                    </h4>
                    <div className={styles.docsTableContainer}>
                      <table className={styles.docsTable}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Client</th>
                            <th>Period</th>
                            <th>Creation date</th>
                            <th>Last modified</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDocs.map(doc => {
                      const isDeleting = deletingDocId === doc.id;
                      return <tr key={doc.id} className={styles.docTableRow} onClick={() => handleLoadDocument(doc)} title="Click to load this document">
                                <td className={styles.docNameCell}>
                                  <span className={styles.docName}>{doc.name}</span>
                                </td>
                                <td className={styles.docCell}>{doc.client_name || '-'}</td>
                                <td className={styles.docCell}>{doc.report_period || '-'}</td>
                                <td className={styles.docCell}>
                                  {new Date(doc.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                                </td>
                                <td className={styles.docCell}>
                                  {new Date(doc.updated_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                                </td>
                                <td className={styles.docActionsCell}>
                                  <button className={styles.deleteDocButton} onClick={e => handleDeleteClick(doc.id, doc.name, e)} disabled={isDeleting} title="Delete this document">
                                    {isDeleting ? <Icon icon="mdi:loading" style={{
                              fontSize: '1rem',
                              animation: 'spin 1s linear infinite'
                            }} /> : <Icon icon="mdi:delete-outline" style={{
                              fontSize: '1.1rem'
                            }} />}
                                  </button>
                                </td>
                              </tr>;
                    })}
                        </tbody>
                      </table>
                    </div>
                    {}
                    {totalPages > 1 && <div className={styles.pagination}>
                        <button className={styles.paginationButton} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} title="Previous page">
                          <Icon icon="mdi:chevron-left" />
                        </button>
                        <span className={styles.paginationInfo}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button className={styles.paginationButton} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} title="Next page">
                          <Icon icon="mdi:chevron-right" />
                        </button>
                      </div>}
                  </div>;
          })()}
              {recentDocs.length === 0 && <div className={styles.emptyDocs}>
                  <Icon icon="mdi:file-document-outline" style={{
              fontSize: '3rem',
              color: '#9ca3af',
              marginBottom: '1rem'
            }} />
                  <p style={{
              color: '#6b7280',
              fontSize: '0.95rem'
            }}>No saved documents</p>
                </div>}
            </div>

            <div className={styles.modalActions} style={{
          justifyContent: 'flex-end'
        }}>
              <button onClick={() => handleSave()} className={styles.primaryButton} disabled={saving || !saveName.trim()} title="Save">
                {saving ? <Icon icon="mdi:loading" style={{
              fontSize: '1.1rem',
              animation: 'spin 1s linear infinite'
            }} /> : <Icon icon="mdi:content-save" style={{
              fontSize: '1.1rem'
            }} />}
              </button>
            </div>
          </div>
        </div>}

      {}
      {showOverwriteConfirm && pendingSave && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) {
        setShowOverwriteConfirm(false);
        setPendingSave(null);
      }
    }}>
          <div className={`${styles.modalContent} ${styles.overwriteModalContent}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mdi:alert" className={styles.modalIcon} />
                <h3>Existing document</h3>
              </div>
              <button className={styles.closeButton} onClick={() => {
            setShowOverwriteConfirm(false);
            setPendingSave(null);
          }} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{
            margin: 0,
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: '#1a1a1a'
          }}>
                A document named "{saveName}" already exists. Do you want to overwrite it?
              </p>
            </div>

            <div className={styles.modalActions} style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
              <button onClick={async () => {
            setSaving(true);
            try {
              const result = await saveMonitoringDocument({
                name: pendingSave.name,
                client_name: pendingSave.client_name,
                report_period: pendingSave.report_period,
                config: pendingSave.config,
                data: pendingSave.data,
                overwrite: true
              });
              if (result.success) {
                const vaultResult = await archiveReportToClientVault({
                  visibleToClient: pendingSave.visibleToClient ?? saveVisibleToClient,
                  documentName: pendingSave.name,
                  reportPeriod: pendingSave.report_period
                });
                setSaveSuccessVisible(true);
                setSaveName("");
                setPendingSave(null);
                setShowOverwriteConfirm(false);
                refreshRecentDocs();
                setTimeout(() => setSaveSuccessVisible(false), 3000);
                if (vaultResult.success) {
                  toast.success(pendingSave.visibleToClient ?? saveVisibleToClient ? "Report saved and shared with the company." : "Report saved (internal agents only).");
                } else if (!vaultResult.skipped) {
                  toast.warn("Report saved, but the document archiving failed.");
                }
              } else {
                setSaveErrorVisible(true);
                setTimeout(() => setSaveErrorVisible(false), 3000);
              }
            } catch (error) {
              setSaveErrorVisible(true);
              setTimeout(() => setSaveErrorVisible(false), 3000);
            } finally {
              setSaving(false);
            }
          }} disabled={saving} className={styles.primaryButton} style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            boxShadow: '0 10px 20px rgba(220, 38, 38, 0.35)'
          }}>
                <Icon icon="mdi:check" />
                {saving ? "Saving..." : "Yes, overwrite"}
              </button>
            </div>
          </div>
        </div>}

      {}
      {showDeleteConfirm && docToDelete && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) {
        setShowDeleteConfirm(false);
        setDocToDelete(null);
      }
    }}>
          <div className={`${styles.modalContent} ${styles.overwriteModalContent}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mdi:alert-circle-outline" className={styles.modalIcon} style={{
              color: '#ef4444'
                }} />
                <h3>Delete document</h3>
              </div>
              <button className={styles.closeButton} onClick={() => {
            setShowDeleteConfirm(false);
            setDocToDelete(null);
          }} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{
            margin: 0,
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: '#1a1a1a'
          }}>
                Are you sure you want to delete the document <strong>"{docToDelete.name}"</strong>? This action is irreversible.
              </p>
            </div>

            <div className={styles.modalActions} style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
              <button onClick={() => {
            setShowDeleteConfirm(false);
            setDocToDelete(null);
          }} className={styles.secondaryButton} disabled={deletingDocId === docToDelete.id}>
                Cancel
              </button>
              <button onClick={handleDeleteDocument} className={styles.dangerButton} disabled={deletingDocId === docToDelete.id}>
                {deletingDocId === docToDelete.id ? <>
                    <Icon icon="mdi:loading" style={{
                fontSize: '1rem',
                animation: 'spin 1s linear infinite'
              }} />
                    Deleting...
                  </> : <>
                    <Icon icon="mdi:delete" style={{
                fontSize: '1rem'
              }} />
                    Delete
                  </>}
              </button>
            </div>
          </div>
        </div>}

    </div>;
}
;
export default MonitoringSummary;
