import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import { fetchClients } from "../../api/clientsMonitoring";
import { useMonitoringContext } from "../../contexts/MonitoringContext";
import MonitoringSummary from "./MonitoringSummary/MonitoringSummary";
import MonitoringHome from "./MonitoringHome/MonitoringHome";
import MonitoringHeader from "./MonitoringHeader";
import MonitoringFullscreenWrapper from "./MonitoringFullscreenWrapper";
import MonitoringModuleInternet from "./Modules/Internet";
import MonitoringModuleServers from "./Modules/Serveurs";
import MonitoringModuleStorage from "./Modules/Stockage";
import MonitoringModuleFirewalls from "./Modules/Firewalls";
import MonitoringModuleSwitch from "./Modules/Switch";
import MonitoringModuleWifi from "./Modules/Wifi";
import MonitoringModuleBackup from "./Modules/Sauvegarde";
import MonitoringModuleAntivirus from "./Modules/Antivirus";
import MonitoringModuleAntispam from "./Modules/Antispam";
import MonitoringModuleNDD from "./Modules/NDD";
import MonitoringModuleO365 from "./Modules/O365";
import MonitoringModuleFirewallRegles from "./Modules/FirewallRegles";
import ConfirmationModal from "../Misc/ConfirmationModal/ConfirmationModal";
import styles from "./MonitoringRenderContent.module.css";
const MonitoringRenderContent = ({
  onNavigate,
  initialConfig = null,
  initialData = null,
  initialGatePassed = false,
  initialGoToSummary = false,
  initialScrollY = 0,
  initialStep = 0,
  isFullscreen = true,
  forceNewOnMount = false,
  onStateChange = null,
  onMonitoringReportGuardChange = null
}) => {
  const {
    monitoringConfig,
    setMonitoringConfig,
    monitoringData,
    setMonitoringData,
    refreshDraftStatus
  } = useMonitoringContext();
  const config = monitoringConfig;
  const setConfig = setMonitoringConfig;
  const data = monitoringData;
  const setData = setMonitoringData;
  const {
    resetComplet
  } = useMonitoringContext();
  const [step, setStep] = useState(initialStep ?? 0);
  const stepByReportKeyRef = useRef({});
  const [scrollY, setScrollY] = useState(initialScrollY ?? 0);
  const hasRestoredScrollRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const [clients, setClients] = useState([]);
  const [checkMKSyncInfo, setCheckMKSyncInfo] = useState(null);
  const [csvImportInfo, setCsvImportInfo] = useState(null);
  const [gatePassed, setGatePassed] = useState(() => {
    const editData = localStorage.getItem('editDocumentData');
    if (initialGatePassed !== undefined) {
      return initialGatePassed;
    }
    return !!editData;
  });
  useEffect(() => {
    const active = gatePassed && !!monitoringConfig;
    onMonitoringReportGuardChange?.(active);
    return () => onMonitoringReportGuardChange?.(false);
  }, [gatePassed, monitoringConfig, onMonitoringReportGuardChange]);
  useEffect(() => {
    const loadClients = async () => {
      try {
        const fetched = await fetchClients();
        setClients(fetched);
      } catch (err) {
        toast.error("❌ Unable to load monitoring clients");
      }
    };
    loadClients();
  }, []);
  const lastReportKeyRef = useRef(null);
  const hasForcedNewOnMountRef = useRef(false);
  useEffect(() => {
    if (forceNewOnMount) {
      if (!hasForcedNewOnMountRef.current) {
        setConfig(null);
        setData({});
        setGatePassed(false);
        lastReportKeyRef.current = null;
        hasForcedNewOnMountRef.current = true;
      }
      return;
    }
    if (!initialConfig) return;
    const clientId = initialConfig?.client?.id || initialConfig?.clientId || null;
    const docName = initialConfig?.documentName || null;
    const reportKey = clientId ? `${clientId}-${docName || "default"}` : docName || "default";
    if (reportKey && lastReportKeyRef.current === reportKey) {
      return;
    }
    setConfig(initialConfig);
    setData(initialData || {});
    if (initialGatePassed) {
      setGatePassed(true);
    }
    if (initialGoToSummary) {
      setGoToSummaryDirectly(true);
    }
    lastReportKeyRef.current = reportKey;
  }, [initialConfig, initialData, initialGatePassed, initialGoToSummary, forceNewOnMount, setConfig, setData]);
  const currentReportKey = useMemo(() => {
    if (!config || !config.client) return null;
    const clientId = config.client.id || config.clientId;
    const docName = config.documentName || null;
    if (!clientId) return null;
    return `${clientId}-${docName || "default"}`;
  }, [config]);
  const updateStep = useCallback(updater => {
    setStep(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (currentReportKey) {
        stepByReportKeyRef.current[currentReportKey] = next;
        try {
          const raw = localStorage.getItem("monitoring_steps");
          const map = raw ? JSON.parse(raw) : {};
          map[currentReportKey] = next;
          localStorage.setItem("monitoring_steps", JSON.stringify(map));
        } catch (e) {}
      }
      return next;
    });
  }, [currentReportKey]);
  useEffect(() => {
    if (!config || !currentReportKey) return;
    let persistedStep = null;
    try {
      const raw = localStorage.getItem("monitoring_steps");
      if (raw) {
        const map = JSON.parse(raw);
        if (Object.prototype.hasOwnProperty.call(map, currentReportKey)) {
          const val = map[currentReportKey];
          if (typeof val === "number") {
            persistedStep = val;
          }
        }
      }
    } catch (e) {}
    if (stepByReportKeyRef.current[currentReportKey] == null) {
      const initial = typeof persistedStep === "number" ? persistedStep : typeof initialStep === "number" ? initialStep : 0;
      stepByReportKeyRef.current[currentReportKey] = initial;
      setStep(initial);
      return;
    }
    const savedStep = stepByReportKeyRef.current[currentReportKey];
    if (typeof savedStep === "number" && savedStep !== step) {
      setStep(savedStep);
    }
  }, [config, currentReportKey, initialStep, step]);
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      setScrollY(currentScroll);
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  useEffect(() => {
    if (typeof onStateChangeRef.current === 'function' && config && config.client) {
      onStateChangeRef.current({
        client: config.client,
        documentName: config.documentName,
        data,
        gatePassed,
        step,
        scrollY
      });
    }
  }, [config, data, gatePassed, step, scrollY]);
  useEffect(() => {
    const editData = localStorage.getItem('editDocumentData');
    if (editData) {
      try {
        const parsedData = JSON.parse(editData);
        if (parsedData.config && parsedData.data) {
          setConfig(parsedData.config);
          setData(parsedData.data);
        } else if (parsedData.data) {
          setData(parsedData.data);
          if (parsedData.data.config) {
            setConfig(parsedData.data.config);
          }
        }
        setGatePassed(true);
        localStorage.removeItem('editDocumentData');
      } catch (error) {
        console.error('Error parsing edit data:', error);
        localStorage.removeItem('editDocumentData');
      }
    }
  }, []);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [goToSummaryDirectly, setGoToSummaryDirectly] = useState(false);
  const [currentSite, setCurrentSite] = useState(null);
  const [sites, setSites] = useState([]);
  const [summaryHeaderActions, setSummaryHeaderActions] = useState(null);
  const siteObserversRef = useRef([]);
  useEffect(() => {
    if (goToSummaryDirectly && config && config.client) {
      updateStep(999);
      setGoToSummaryDirectly(false);
    }
  }, [goToSummaryDirectly, config, updateStep]);
  useEffect(() => {
    if (!config || !config.client) {
      setCurrentSite(null);
      setSites([]);
      return;
    }
    const client = config.client;
    const moduleToEquipments = {
      internet: () => client?.equipements?.Internet || [],
      serveurs: () => client?.equipements?.Serveurs || [],
      stockage: () => {
        const nasList = client?.equipements?.NAS || [];
        const sanList = client?.equipements?.SAN || [];
        const allStorage = [...nasList, ...sanList];
        return allStorage.filter(eq => eq != null);
      },
      firewalls: () => client?.equipements?.Firewalls || [],
      switch: () => client?.equipements?.Switch || [],
      wifi: () => client?.equipements?.BorneWifi || []
    };
    const sortSites = list => list.sort((a, b) => {
      if (a === "No site") return 1;
      if (b === "No site") return -1;
      return a.localeCompare(b);
    });
    const sitesSet = new Set();
    let hasNoSiteGlobal = false;
    Object.values(moduleToEquipments).forEach(getEquipments => {
      if (!getEquipments) return;
      const equipments = getEquipments();
      if (!Array.isArray(equipments) || equipments.length === 0) return;
      equipments.forEach(equipment => {
        const site = equipment?.site ? String(equipment.site).trim() : null;
        if (site && site.length > 0) {
          sitesSet.add(site);
        } else {
          hasNoSiteGlobal = true;
        }
      });
    });
    if (hasNoSiteGlobal) {
      sitesSet.add("No site");
    }
    const allSitesList = sortSites(Array.from(sitesSet));
    if (allSitesList.length === 0) {
      setCurrentSite(null);
      setSites([]);
      return;
    }
    setSites(allSitesList);
    setCurrentSite(null);
    const getRenderedSites = () => {
      const siteElements = Array.from(document.querySelectorAll('[data-site-label]'));
      return siteElements.filter(el => {
        const card = el.querySelector('[class*="Card"]');
        return Boolean(card);
      }).map(el => el.getAttribute('data-site-label')).filter(site => typeof site === 'string' && site.trim().length > 0);
    };
    const initializeObservers = sitesList => {
      if (!sitesList || sitesList.length === 0) {
        setCurrentSite(null);
        return;
      }
      siteObserversRef.current.forEach(io => {
        if (io && typeof io.disconnect === 'function') {
          io.disconnect();
        }
      });
      siteObserversRef.current = [];
      let lastActiveSite = null;
      const updateCurrentSite = () => {
        const header = document.querySelector('[class*="headerSection"]');
        const headerHeight = header ? header.offsetHeight : 120;
        const triggerPoint = headerHeight + 50;
        let activeSite = null;
        let bestScore = -Infinity;
        sitesList.forEach(site => {
          const siteId = `site-${site}`;
          const el = document.getElementById(siteId);
          if (!el) return;
          const siteTitle = el.querySelector('h2');
          if (!siteTitle) return;
          const rect = siteTitle.getBoundingClientRect();
          const titleTop = rect.top;
          const titleBottom = rect.bottom;
          const titleCenter = (titleTop + titleBottom) / 2;
          if (titleBottom > 0 && titleTop < window.innerHeight) {
            let score = 0;
            if (titleTop <= triggerPoint) {
              score = triggerPoint - titleTop;
            } else {
              score = -(titleTop - triggerPoint) * 0.5;
            }
            if (Math.abs(titleCenter - triggerPoint) < 50) {
              score += 100;
            }
            if (score > bestScore) {
              bestScore = score;
              activeSite = site;
            }
          }
        });
        if (!activeSite && sitesList.length > 0) {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          if (scrollTop < 100) {
            activeSite = sitesList[0];
          } else {
            sitesList.forEach(site => {
              if (!activeSite) {
                const siteId = `site-${site}`;
                const el = document.getElementById(siteId);
                if (!el) return;
                const siteTitle = el.querySelector('h2');
                if (!siteTitle) return;
                const rect = siteTitle.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                  activeSite = site;
                }
              }
            });
          }
        }
        if (activeSite && activeSite !== lastActiveSite) {
          lastActiveSite = activeSite;
          setCurrentSite(activeSite);
        }
      };
      const header = document.querySelector('[class*="headerSection"]');
      const headerHeight = header ? header.offsetHeight : 120;
      const handleScroll = () => {
        if (siteObserversRef.current._scrollTimeout) {
          clearTimeout(siteObserversRef.current._scrollTimeout);
        }
        siteObserversRef.current._scrollTimeout = setTimeout(() => {
          updateCurrentSite();
        }, 200);
      };
      const handleIntersection = () => {
        if (siteObserversRef.current._observerTimeout) {
          clearTimeout(siteObserversRef.current._observerTimeout);
        }
        siteObserversRef.current._observerTimeout = setTimeout(() => {
          updateCurrentSite();
        }, 150);
      };
      window.addEventListener('scroll', handleScroll, {
        passive: true
      });
      window.addEventListener('resize', handleScroll, {
        passive: true
      });
      updateCurrentSite();
      sitesList.forEach(site => {
        const siteId = `site-${site}`;
        const el = document.getElementById(siteId);
        if (!el) return;
        const siteTitle = el.querySelector('h2');
        if (!siteTitle) return;
        const io = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              handleIntersection();
            }
          });
        }, {
          root: null,
          rootMargin: `-${headerHeight + 50}px 0px -50% 0px`,
          threshold: [0, 0.1, 0.5, 1]
        });
        io.observe(siteTitle);
        siteObserversRef.current.push(io);
      });
      siteObserversRef.current._scrollHandler = handleScroll;
      siteObserversRef.current._resizeHandler = handleScroll;
    };
    const timeoutId = setTimeout(() => {
      const domSites = getRenderedSites();
      const domSitesSet = new Set(domSites);
      let visibleSites = allSitesList.filter(site => domSitesSet.has(site));
      if (visibleSites.length === 0 && domSites.length > 0) {
        visibleSites = sortSites(Array.from(new Set(domSites)));
      }
      initializeObservers(visibleSites);
    }, 200);
    return () => {
      clearTimeout(timeoutId);
      if (siteObserversRef.current._scrollTimeout) {
        clearTimeout(siteObserversRef.current._scrollTimeout);
      }
      if (siteObserversRef.current._observerTimeout) {
        clearTimeout(siteObserversRef.current._observerTimeout);
      }
      siteObserversRef.current.forEach(io => {
        if (io && typeof io.disconnect === 'function') {
          io.disconnect();
        }
      });
      if (siteObserversRef.current._scrollHandler) {
        window.removeEventListener('scroll', siteObserversRef.current._scrollHandler);
      }
      if (siteObserversRef.current._resizeHandler) {
        window.removeEventListener('resize', siteObserversRef.current._resizeHandler);
      }
      siteObserversRef.current = [];
    };
  }, [config, step]);
  useEffect(() => {
    if (!config) return;
    const client = config.client;
    if (!client) return;
    setCsvImportInfo(null);
    const moduleOrder = ["Servers", "Storage", "Firewall", "Switch", "BorneWifi", "Backup", "Antivirus", "Antispam", "Office365", "NDD"];
    const moduleMap = {
      Servers: "serveurs",
      Storage: "stockage",
      Firewall: "firewalls",
      Switch: "switch",
      BorneWifi: "wifi",
      Backup: "sauvegarde",
      Antivirus: "antivirus",
      Antispam: "antispam",
      Office365: "office365",
      NDD: "ndd"
    };
    const activeModules = moduleOrder.filter(moduleName => client?.modules_monitoring?.[moduleName] === true);
    const steps = activeModules.map(moduleName => moduleMap[moduleName]);
    if (client?.modules_monitoring?.Firewall === true) {
      const antispamIndex = steps.indexOf("antispam");
      if (antispamIndex !== -1) {
        steps.splice(antispamIndex + 1, 0, "firewallregles");
      } else {
        const sauvegardeIndex = steps.indexOf("sauvegarde");
        const antivirusIndex = steps.indexOf("antivirus");
        const insertIndex = antivirusIndex !== -1 ? antivirusIndex + 1 : sauvegardeIndex !== -1 ? sauvegardeIndex + 1 : steps.length;
        steps.splice(insertIndex, 0, "firewallregles");
      }
    }
    steps.push("summary");
    const actualStep = step === 999 ? steps.length - 1 : step;
    const currentModule = steps[actualStep];
    if (currentModule !== 'serveurs' && currentModule !== 'stockage' && currentModule !== 'firewalls' && currentModule !== 'switch' && currentModule !== 'wifi' && currentModule !== 'sauvegarde' && currentModule !== 'antivirus' && currentModule !== 'ndd') {
      setCheckMKSyncInfo(null);
    }
  }, [config, step]);
  useEffect(() => {
    if (!config || !config.client) {
      document.body.classList.remove('monitoring-active', 'monitoring-summary-active');
      document.documentElement.classList.remove('monitoring-active', 'monitoring-summary-active');
      return;
    }
    const client = config.client;
    const moduleOrder = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "Antivirus", "Antispam", "Backup", "Office365", "NDD"];
    const moduleMap = {
      Internet: "internet",
      Servers: "serveurs",
      Storage: "stockage",
      Firewall: "firewalls",
      Switch: "switch",
      BorneWifi: "wifi",
      Backup: "sauvegarde",
      Antivirus: "antivirus",
      Antispam: "antispam",
      Office365: "office365",
      NDD: "ndd"
    };
    const activeModules = moduleOrder.filter(moduleName => client?.modules_monitoring?.[moduleName] === true);
    const calculatedSteps = activeModules.map(moduleName => moduleMap[moduleName]);
    if (client?.modules_monitoring?.Firewall === true) {
      const antispamIndex = calculatedSteps.indexOf("antispam");
      if (antispamIndex !== -1) {
        calculatedSteps.splice(antispamIndex + 1, 0, "firewallregles");
      } else {
        const sauvegardeIndex = calculatedSteps.indexOf("sauvegarde");
        const antivirusIndex = calculatedSteps.indexOf("antivirus");
        const insertIndex = antivirusIndex !== -1 ? antivirusIndex + 1 : sauvegardeIndex !== -1 ? sauvegardeIndex + 1 : calculatedSteps.length;
        calculatedSteps.splice(insertIndex, 0, "firewallregles");
      }
    }
    calculatedSteps.push("summary");
    let calculatedActualStep = 0;
    if (step === 999) {
      calculatedActualStep = calculatedSteps.length - 1;
    } else if (typeof step === 'number' && step >= 0 && step < calculatedSteps.length) {
      calculatedActualStep = step;
    } else {
      calculatedActualStep = 0;
    }
    const currentModule = calculatedSteps[calculatedActualStep] || calculatedSteps[0] || 'summary';
    const isSummary = currentModule === 'summary';
    if (isSummary) {
      document.body.classList.remove('monitoring-active');
      document.body.classList.add('monitoring-summary-active');
      document.documentElement.classList.remove('monitoring-active');
      document.documentElement.classList.add('monitoring-summary-active');
    } else {
      document.body.classList.remove('monitoring-summary-active');
      document.body.classList.add('monitoring-active');
      document.documentElement.classList.remove('monitoring-summary-active');
      document.documentElement.classList.add('monitoring-active');
    }
    return () => {
      document.body.classList.remove('monitoring-active', 'monitoring-summary-active');
      document.documentElement.classList.remove('monitoring-active', 'monitoring-summary-active');
    };
  }, [config, step]);
  useEffect(() => {
    if (config && config.client && step !== undefined) {
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }
  }, [step, config]);
  useEffect(() => {
    if (isFullscreen) return;
    if (hasRestoredScrollRef.current) return;
    const y = typeof initialScrollY === "number" && initialScrollY > 0 ? initialScrollY : 0;
    if (y === 0) {
      hasRestoredScrollRef.current = true;
      return;
    }
    const applyScroll = () => {
      window.scrollTo({
        top: y,
        left: 0,
        behavior: "auto"
      });
      setScrollY(y);
    };
    applyScroll();
    const timeoutId = setTimeout(() => {
      applyScroll();
      hasRestoredScrollRef.current = true;
    }, 150);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [initialScrollY, isFullscreen]);
  if (!gatePassed) {
    const extractDocData = doc => {
      let docConfig = null;
      let docData = {};
      if (doc.data && doc.data.config && doc.data.data) {
        docConfig = doc.data.config;
        docData = doc.data.data;
      } else if (doc.data && doc.data.data) {
        docData = doc.data.data;
        if (doc.data.data.config) {
          docConfig = doc.data.data.config;
        }
      } else if (doc.config && doc.data) {
        docConfig = doc.config;
        docData = doc.data;
      }
      return {
        docConfig,
        docData
      };
    };
    return <MonitoringHome clients={clients} onNewDocument={cfg => {
      try {
        const clientId = cfg?.client?.id || cfg?.clientId || null;
        const docName = cfg?.documentName || null;
        const reportKey = clientId ? `${clientId}-${docName || "default"}` : docName || "default";
        const rawSteps = localStorage.getItem("monitoring_steps");
        if (rawSteps && reportKey) {
          const map = JSON.parse(rawSteps);
          if (map && Object.prototype.hasOwnProperty.call(map, reportKey)) {
            delete map[reportKey];
            localStorage.setItem("monitoring_steps", JSON.stringify(map));
          }
        }
      } catch (e) {}
      if (onNavigate) {
        onNavigate("MonitoringDetail", {
          client: cfg.client,
          documentName: cfg.documentName,
          reportPeriod: cfg.client?.reportPeriod,
          data: {},
          gatePassed: true
        });
      } else {
        setConfig(cfg);
        setData({});
        setGatePassed(true);
      }
    }} onEditDocument={doc => {
      const {
        docConfig,
        docData
      } = extractDocData(doc);
      if (!docConfig) {
        toast.error("❌ This document does not contain valid data.");
        return;
      }
      if (onNavigate) {
        onNavigate("MonitoringDetail", {
          client: docConfig.client,
          documentName: docConfig.documentName || doc.name,
          reportPeriod: docConfig.client?.reportPeriod || doc.report_period,
          data: docData,
          gatePassed: true
        });
      } else {
        setConfig(docConfig);
        setData(docData);
        setGatePassed(true);
      }
    }} onViewSummary={doc => {
      const {
        docConfig,
        docData
      } = extractDocData(doc);
      if (!docConfig) {
        toast.error("❌ This document does not contain valid data.");
        return;
      }
      if (onNavigate) {
        onNavigate("MonitoringDetail", {
          client: docConfig.client,
          documentName: docConfig.documentName || doc.name,
          reportPeriod: docConfig.client?.reportPeriod || doc.report_period,
          data: docData,
          gatePassed: true,
          goToSummary: true
        });
      } else {
        setConfig(docConfig);
        setData(docData);
        setGatePassed(true);
        setGoToSummaryDirectly(true);
      }
    }} />;
  }
  if (!config) {
    return null;
  }
  const {
    client
  } = config;
  const moduleMap = {
    Internet: "internet",
    Servers: "serveurs",
    Storage: "stockage",
    Firewall: "firewalls",
    Switch: "switch",
    BorneWifi: "wifi",
    Backup: "sauvegarde",
    Antivirus: "antivirus",
    Antispam: "antispam",
    Office365: "office365",
    NDD: "ndd"
  };
  const moduleOrder = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "Antivirus", "Antispam", "Backup", "Office365", "NDD"];
  const activeModules = moduleOrder.filter(moduleName => client?.modules_monitoring?.[moduleName] === true);
  const steps = activeModules.map(moduleName => moduleMap[moduleName]);
  if (client?.modules_monitoring?.Firewall === true) {
    const antispamIndex = steps.indexOf("antispam");
    if (antispamIndex !== -1) {
      steps.splice(antispamIndex + 1, 0, "firewallregles");
    } else {
      const antivirusIndex = steps.indexOf("antivirus");
      const sauvegardeIndex = steps.indexOf("sauvegarde");
      if (antivirusIndex !== -1) {
        steps.splice(antivirusIndex + 1, 0, "firewallregles");
      } else if (sauvegardeIndex !== -1) {
        steps.splice(sauvegardeIndex, 0, "firewallregles");
      } else {
        steps.push("firewallregles");
      }
    }
  }
  steps.push("summary");
  const actualStep = step === 999 ? steps.length - 1 : step;
  const currentModule = steps[actualStep];
  const keyForMotion = currentModule || "module";
  const goTo = dir => {
    const next = actualStep + dir;
    if (next >= 0 && next < steps.length) updateStep(next);
  };
  const handleBack = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
    if (actualStep === 0) {
      setConfig(null);
      setData({});
      setGatePassed(false);
    } else {
      goTo(-1);
    }
  };
  const handleNext = async () => {
    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
    if (currentModule === "serveurs") {
      const serveurs = client?.equipements?.Serveurs || [];
      const isInvalid = serveurs.some(srv => ["CPU", "C:/", "RAM", "UPTIME"].some(service => {
        const entry = data.serveurs?.[srv.nom]?.[service] || {};
        const total = parse(entry.ok, 100) + parse(entry.warn, 0) + parse(entry.crit, 0);
        return total !== 100;
      }));
      if (isInvalid) {
        toast.error("❗ One or more server rows do not total 100%");
        return;
      }
    }
    if (currentModule === "stockage") {
      const stockages = client?.equipements?.NAS || [];
      const isInvalid = stockages.some(nas => ["CPU", "STOCKAGE", "RAM", "UPTIME"].some(service => {
        const entry = data.stockage?.[nas.nom]?.[service] || {};
        const total = parse(entry.ok, 100) + parse(entry.warn, 0) + parse(entry.crit, 0);
        return total !== 100;
      }));
      if (isInvalid) {
        toast.error("❗ One or more storage rows do not total 100%");
        return;
      }
    }
    if (currentModule === "firewalls") {
      const firewalls = client?.equipements?.Firewalls || client?.equipements?.firewalls || [];
      const isInvalid = firewalls.some(fw => ["CPU", "RAM", "UPTIME", "TEMP"].some(service => {
        const entry = data.firewalls?.[fw.nom]?.[service] || {};
        const total = parse(entry.ok, 100) + parse(entry.warn, 0) + parse(entry.crit, 0);
        return total !== 100;
      }));
      if (isInvalid) {
        toast.error("❗ One or more firewall rows do not total 100%");
        return;
      }
    }
    if (currentModule === "switch") {
      const switches = client?.equipements?.Switch || [];
      const isInvalid = switches.some(sw => ["CPU", "RAM", "TRAFIC", "UPTIME"].some(service => {
        const entry = data.switch?.[sw.nom]?.[service] || {};
        const total = parse(entry.ok, 100) + parse(entry.warn, 0) + parse(entry.crit, 0);
        return total !== 100;
      }));
      if (isInvalid) {
        toast.error("❗ One or more switch rows do not total 100%");
        return;
      }
    }
    if (currentModule === "wifi") {
      const wifis = client?.equipements?.BorneWifi || [];
      const isInvalid = wifis.some(ap => ["CPU", "RAM", "TRAFIC", "UPTIME"].some(service => {
        const entry = data.wifi?.[ap.nom]?.[service] || {};
        const total = parse(entry.ok, 100) + parse(entry.warn, 0) + parse(entry.crit, 0);
        return total !== 100;
      }));
      if (isInvalid) {
        toast.error("❗ One or more WiFi rows do not total 100%");
        return;
      }
    }
    if (currentModule === "antivirus") {}
    if (currentModule === "antispam") {
      const antispamData = data.antispam || {};
      const requiredFields = ["routés", "quarantaine", "supprimés"];
      const parse = val => val === "" || val === undefined || isNaN(Number(val));
      const missingCoreField = requiredFields.some(field => parse(antispamData[field]));
      if (missingCoreField) {
        toast.error("❗ Please fill in the quantities for routed, quarantined and deleted mails.");
        return;
      }
      const customTypes = antispamData.types || [];
      const hasInvalidType = customTypes.some(type => !type.label?.trim() || parse(type.count));
      if (hasInvalidType) {
        toast.error("❗ Please complete all custom mail types added (label and quantity).");
        return;
      }
    }
    if (currentModule === "office365") {}
    goTo(1);
  };
  const handleReset = () => {
    setShowResetModal(true);
  };
  const handleQuit = () => {
    setShowQuitModal(true);
  };
  const confirmQuit = () => {
    setShowQuitModal(false);
    setConfig(null);
    setData({});
    setGatePassed(false);
    setStep(0);
  };
  const confirmReset = async () => {
    setShowResetModal(false);
    await resetComplet();
    setGatePassed(false);
  };
  const getModuleTitle = moduleKey => {
    const titles = {
      internet: "Internet",
      serveurs: "Servers",
      stockage: "Storage",
      firewalls: "Firewalls",
      switch: "Switches",
      wifi: "WiFi Access Points",
      sauvegarde: "Backup",
      antivirus: "Antivirus",
      antispam: "Antispam",
      office365: "Office 365",
      ndd: "Domain Names",
      firewallregles: "Filtering rules",
      summary: "Summary"
    };
    return titles[moduleKey] || moduleKey;
  };
  const getProgressPercent = () => {
    return Math.round((actualStep + 1) / steps.length * 100);
  };
  const isModuleValid = () => {
    return true;
  };
  const MaynContent = <div className={styles.renderContainer}>
        {}
        <MonitoringHeader clientName={config?.client?.name || config?.client?.nom || ''} title={getModuleTitle(currentModule)} stepLabel={`Step ${actualStep + 1} of ${steps.length}`} progressPercent={getProgressPercent()} reportStartDate={config?.client?.checkmkPeriod?.start_time || config?.client?.reportStartDate || null} reportEndDate={config?.client?.checkmkPeriod?.end_time || config?.client?.reportEndDate || null} modules={steps} currentModule={currentModule} currentSite={currentModule === 'ndd' ? null : currentSite} sites={currentModule === 'ndd' ? [] : sites} summaryActions={currentModule === 'summary' ? summaryHeaderActions : null} checkMKSyncInfo={currentModule === 'serveurs' || currentModule === 'stockage' || currentModule === 'firewalls' || currentModule === 'switch' || currentModule === 'wifi' || currentModule === 'sauvegarde' || currentModule === 'antivirus' || currentModule === 'ndd' ? checkMKSyncInfo : null} csvImportInfo={currentModule === 'antispam' || currentModule === 'firewallregles' ? csvImportInfo : null} isFullscreen={isFullscreen} onSelectSite={site => {
      const scrollToSite = () => {
        const siteId = `site-${site}`;
        let el = document.getElementById(siteId);
        if (!el) {
          el = document.querySelector(`[id="${siteId}"]`);
        }
        if (!el) {
          const allH2s = document.querySelectorAll('h2');
          for (const h2 of allH2s) {
            if (h2.textContent && h2.textContent.includes(site)) {
              el = h2.closest('[id^="site-"]');
              if (el) break;
            }
          }
        }
        if (!el) {
          return false;
        }
        const siteTitle = el.querySelector('h2');
        if (!siteTitle) {
          return false;
        }
        const scrollContainer = document.querySelector('[class*="fullscreenWrapper"]') || window;
        const header = document.querySelector('[class*="headerSection"]');
        const headerHeight = header ? header.offsetHeight : 120;
        const offset = headerHeight + 40;
        const rect = siteTitle.getBoundingClientRect();
        let currentScroll = 0;
        if (scrollContainer === window) {
          currentScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
        } else {
          currentScroll = scrollContainer.scrollTop || 0;
        }
        let titleTop = 0;
        if (scrollContainer === window) {
          titleTop = rect.top + currentScroll;
        } else {
          const containerRect = scrollContainer.getBoundingClientRect();
          titleTop = rect.top - containerRect.top + currentScroll;
        }
        const targetScroll = Math.max(0, titleTop - offset);
        if (scrollContainer === window) {
          window.scrollTo({
            top: targetScroll,
            behavior: "smooth"
          });
        } else {
          scrollContainer.scrollTo({
            top: targetScroll,
            behavior: "smooth"
          });
        }
        return true;
      };
      if (!scrollToSite()) {
        setTimeout(() => {
          scrollToSite();
        }, 200);
      }
    }} onSelectModule={moduleName => {
      const index = steps.indexOf(moduleName);
      if (index !== -1) {
        updateStep(index);
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }} onPrev={handleBack} onNext={handleNext} onReset={handleReset} onQuit={handleQuit} hasPrev={actualStep > 0} hasNext={actualStep < steps.length - 1} isLastItem={actualStep === steps.length - 1} isFormValid={isModuleValid()} nextLabel={actualStep === steps.length - 1 ? 'Finish' : 'Next'} prevLabel="Previous" resetLabel="Reset" nextDisabled={!isModuleValid()} />

      {currentModule === "summary" ? <div>
          <MonitoringSummary config={config} data={data} onBack={handleBack} onActionsReady={setSummaryHeaderActions} resetFormData={() => {
        setConfig(null);
        setData({});
        if (refreshDraftStatus) refreshDraftStatus();
      }} />
        </div> : <div className={styles.moduleScrollContainer}>
          {currentModule === "internet" && <div>
              <MonitoringModuleInternet config={config} setConfig={setConfig} data={data.internet || {}} setData={newData => setData(prev => ({
          ...prev,
          internet: newData
        }))} />
            </div>}

          {currentModule === "serveurs" && <div>
              <MonitoringModuleServers config={config} setConfig={setConfig} data={data.serveurs || {}} setData={newData => setData(prev => ({
          ...prev,
          serveurs: newData
        }))} onSyncAllCheckMKReady={info => setCheckMKSyncInfo(info)} />
            </div>}

          {currentModule === "stockage" && <div>
              <MonitoringModuleStorage config={config} setConfig={setConfig} data={data.stockage || {}} setData={newData => setData(prev => ({
          ...prev,
          stockage: newData
        }))} onSyncAllCheckMKReady={info => {
          if (currentModule === 'stockage') {
            setCheckMKSyncInfo(info);
          }
        }} />
            </div>}

          {currentModule === "firewalls" && <div>
              <MonitoringModuleFirewalls config={config} setConfig={setMonitoringConfig} data={data.firewalls || {}} setData={newData => setData(prev => ({
          ...prev,
          firewalls: newData
        }))} onSyncAllCheckMKReady={info => setCheckMKSyncInfo(info)} />
            </div>}

          {currentModule === "switch" && <div>
              <MonitoringModuleSwitch config={config} setConfig={setConfig} data={data.switch || {}} setData={newData => setData(prev => ({
          ...prev,
          switch: newData
        }))} onSyncAllCheckMKReady={info => {
          if (currentModule === 'switch') {
            setCheckMKSyncInfo(info);
          }
        }} />
            </div>}

          {currentModule === "wifi" && <div>
              <MonitoringModuleWifi config={config} setConfig={setConfig} data={data.wifi || {}} setData={newData => setData(prev => ({
          ...prev,
          wifi: newData
        }))} onSyncAllCheckMKReady={info => {
          if (currentModule === 'wifi') {
            setCheckMKSyncInfo(info);
          }
        }} />
            </div>}

          {currentModule === "sauvegarde" && <div>
              <MonitoringModuleBackup config={config} setConfig={setConfig} data={data.sauvegarde || []} setData={newData => setData(prev => ({
          ...prev,
          sauvegarde: newData
        }))} onSyncAllCheckMKReady={info => {
          if (info) {
            setCheckMKSyncInfo(info);
          }
        }} />
            </div>}

          {currentModule === "antivirus" && <div>
              <MonitoringModuleAntivirus config={config} setConfig={setMonitoringConfig} data={data.antivirus || {}} setData={newData => setData(prev => ({
          ...prev,
          antivirus: newData
        }))} onSyncAllCheckMKReady={info => {
          if (info) {
            setCheckMKSyncInfo(info);
          }
        }} />
            </div>}

          {currentModule === "antispam" && <div>
              <MonitoringModuleAntispam config={config} setConfig={setMonitoringConfig} data={data.antispam || {}} setData={newData => setData(prev => ({
          ...prev,
          antispam: newData
        }))} onCSVImportReady={info => {
          if (currentModule === 'antispam') {
            setCsvImportInfo(info);
          }
        }} />
            </div>}

          {currentModule === "firewallregles" && <div>
              <MonitoringModuleFirewallRegles config={config} data={data.firewallregles || {}} setData={newData => setData(prev => ({
          ...prev,
          firewallregles: newData
        }))} onCSVImportReady={info => {
          if (currentModule === 'firewallregles') {
            setCsvImportInfo(info);
          }
        }} />
            </div>}

          {currentModule === "ndd" && <div>
              <MonitoringModuleNDD config={config} setConfig={setConfig} data={data.ndd || {}} setData={newData => setData(prev => ({
          ...prev,
          ndd: newData
        }))} onSyncAllCheckMKReady={info => {
          if (currentModule === 'ndd') {
            setCheckMKSyncInfo(info);
          }
        }} />
            </div>}

          {currentModule === "office365" && <div>
              <MonitoringModuleO365 config={config} data={data.office365 || {}} setData={newData => setData(prev => ({
          ...prev,
          office365: newData
        }))} onUpdateConfig={updatedConfig => {
          setConfig(updatedConfig);
          setData(prev => ({
            ...prev,
            office365: updatedConfig.client.equipements?.Office365 || {}
          }));
        }} />
            </div>}
        </div>}

      {}
      <ConfirmationModal isOpen={showQuitModal} onConfirm={confirmQuit} onCancel={() => setShowQuitModal(false)} title="Leave the report?" message="Warning! If you leave now, all unsaved changes will be lost. Are you sure you want to leave?" confirmLabel="Yes, leave" cancelLabel="Cancel" confirmColor="danger" />

      {showResetModal && <div className={styles.modalOverlay}>
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3>⚠️ Reset the report?</h3>
              <p>This action will delete all data from the current report.</p>
              <div className={styles.modalActions}>
                <button className={styles.cancel} onClick={() => setShowResetModal(false)}>
                  Cancel
                </button>
                <button className={styles.confirm} onClick={confirmReset}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>}

      </div>;
  if (isFullscreen) {
    return <MonitoringFullscreenWrapper onExit={() => {
      setConfig(null);
      setData({});
      setGatePassed(false);
    }}>
        {MaynContent}
      </MonitoringFullscreenWrapper>;
  }
  return MaynContent;
};
export default MonitoringRenderContent;
