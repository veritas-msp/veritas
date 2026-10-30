import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { getCybersecuriteGuide } from "../PageGuide/cybersecuriteGuideSteps";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import React from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { fetchCyberPageData, fetchClientsList } from "../../api/clients";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import AntivirusMspDashboard from "./AntivirusMspDashboard";
import AntispamMspDashboard from "./AntispamMspDashboard";
import BackupMspDashboard from "./BackupMspDashboard";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { buildAntivirusFleetFromClients } from "./antivirusMspUtils";
import { buildAntispamFleetFromClients, buildAntispamDetailNavigationPayload, syncAndPersistAntispamSolution } from "../EnterprisesPage/antispamSolutionUtils";
import { buildAntivirusDetailNavigationPayload, syncAndPersistAntivirusSolution } from "../EnterprisesPage/antivirusSolutionUtils";
import { buildBackupFleetFromClients, buildBackupInstanceDetailPayload } from "../EquipementPage/backupMspUtils";
import { getCybersecuritePageCopy } from "./cybersecuritePageI18n";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import API_BASE_URL from "../../config";
import { uiKitLayoutsStyles as finderKit, useFinderNavIndicator } from "../UiKit";
const MODULE_TABS = ["antivirus", "antispam", "backup"];
export default function CybersecuritePage({
  onNavigate,
  cybersecuriteParams
}) {
  const {
    isCommunity
  } = useVeritasEdition();
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getCybersecuritePageCopy(locale), [locale]);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const openPageGuide = useCallback(() => setPageGuideOpen(true), []);
  useRegisterPageGuide(openPageGuide);
  const cyberGuide = useMemo(() => getCybersecuriteGuide(locale, {
    showAntivirus: () => setActiveTab("antivirus")
  }), [locale]);
  const CYBER_PAGE_DATA_CACHE_KEY = "cyber_page_data_cache_v2";
  const CYBER_PAGE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
  const [activeTab, setActiveTab] = useState("antivirus");
  const [tabContentEnter, setTabContentEnter] = useState(true);
  const { trackRef: finderPrimaryTrackRef, indicator: finderPrimaryIndicator } = useFinderNavIndicator([
    activeTab
  ]);
  useLayoutEffect(() => {
    setTabContentEnter(false);
  }, [activeTab]);
  useEffect(() => {
    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        if (cancelled) return;
        setTabContentEnter(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [activeTab]);
  const [clients, setClients] = useState([]);
  const clientsWithModulesLoadedRef = useRef(false);
  const loadingClientsRef = useRef(false);
  const clientsLoadPromiseRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const fleetSyncControllerRef = useRef(null);
  const fleetSyncCancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const skipInitialTabFetchRef = useRef(true);
  const [loadingCyberData, setLoadingCyberData] = useState(true);
  const [syncingFleet, setSyncingFleet] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [selectedPaymentPlans, setSelectedPaymentPlans] = useState(new Set());
  const [antivirusSortBy, setAntivirusSortBy] = useState('expirationDate');
  const [antivirusSortOrder, setAntivirusSortOrder] = useState('asc');
  const [antivirusCurrentPage, setAntivirusCurrentPage] = useState(1);
  const [antivirusPageSize, setAntivirusPageSize] = useState(50);
  const selectTab = tabKey => {
    if (!MODULE_TABS.includes(tabKey) || tabKey === activeTab) return;
    setSearchQuery("");
    setActiveTab(tabKey);
  };
  useEffect(() => {
    if (!cybersecuriteParams?.activeTab && !cybersecuriteParams?.tab) return;
    const requested = cybersecuriteParams.activeTab || cybersecuriteParams.tab;
    if (requested === "campaigns") {
      onNavigate?.("Campaigns", cybersecuriteParams?.clientId ? { clientId: cybersecuriteParams.clientId } : null);
      return;
    }
    if (requested === "overview" || !MODULE_TABS.includes(requested)) {
      setActiveTab("antivirus");
      return;
    }
    setActiveTab(requested);
  }, [cybersecuriteParams, onNavigate]);
  const abortInFlightTabFetches = () => {
    clientsControllerRef.current?.abort();
  };
  const abortFleetSync = () => {
    fleetSyncCancelledRef.current = true;
    fleetSyncControllerRef.current?.abort();
  };
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await loadClients({
        withModules: true
      });
    })();
    return () => {
      mountedRef.current = false;
      abortInFlightTabFetches();
      abortFleetSync();
    };
  }, []);
  useEffect(() => {
    if (skipInitialTabFetchRef.current) {
      skipInitialTabFetchRef.current = false;
      return;
    }
    (async () => {
      if (!activeTab || ["antivirus", "antispam", "backup"].includes(activeTab)) {
        await loadClients({
          withModules: true
        });
      }
    })();
    return () => {
      abortInFlightTabFetches();
    };
  }, [activeTab]);
  const loadClients = async ({
    withModules = true,
    force = false,
    skipCache = false
  } = {}) => {
    if (clientsLoadPromiseRef.current) {
      return await clientsLoadPromiseRef.current;
    }
    if (withModules && clientsWithModulesLoadedRef.current && !force) return clients;
    const request = (async () => {
      try {
        loadingClientsRef.current = true;
        if (withModules) setLoadingCyberData(true);
        clientsControllerRef.current?.abort();
        const controller = createTrackedAbortController();
        clientsControllerRef.current = controller;
        if (withModules) {
          if (!skipCache) {
            try {
              const raw = sessionStorage.getItem(CYBER_PAGE_DATA_CACHE_KEY);
              if (raw) {
                const parsed = JSON.parse(raw);
                const isFresh = parsed?.savedAt && parsed?.data && Array.isArray(parsed.data.clients) && Date.now() - parsed.savedAt < CYBER_PAGE_DATA_CACHE_TTL_MS;
                if (isFresh) {
                  setClients(parsed.data.clients);
                  clientsWithModulesLoadedRef.current = true;
                  return parsed.data.clients;
                }
              }
            } catch {}
          }
          const payload = await fetchCyberPageData({
            signal: controller.signal
          });
          if (controller.signal.aborted) return;
          const clientsData = Array.isArray(payload?.clients) ? payload.clients : [];
          setClients(clientsData);
          clientsWithModulesLoadedRef.current = true;
          // Persist off the critical path — payload can be large.
          const cachePayload = clientsData;
          const persist = () => {
            try {
              sessionStorage.setItem(CYBER_PAGE_DATA_CACHE_KEY, JSON.stringify({
                savedAt: Date.now(),
                data: {
                  clients: cachePayload
                }
              }));
            } catch {}
          };
          if (typeof requestIdleCallback === "function") {
            requestIdleCallback(persist, { timeout: 800 });
          } else {
            setTimeout(persist, 0);
          }
          return clientsData;
        } else {
          const clientsData = await fetchClientsList({
            signal: controller.signal
          });
          if (controller.signal.aborted) return;
          const normalizedClients = Array.isArray(clientsData) ? clientsData : [];
          setClients(normalizedClients);
          return normalizedClients;
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error('Error loading clients:', error);
        return null;
      } finally {
        loadingClientsRef.current = false;
        if (withModules && mountedRef.current) setLoadingCyberData(false);
      }
    })();
    clientsLoadPromiseRef.current = request;
    const data = await request;
    clientsLoadPromiseRef.current = null;
    return data;
  };
  const antivirusData = useMemo(() => buildAntivirusFleetFromClients(clients), [clients]);
  const antispamData = useMemo(() => buildAntispamFleetFromClients(clients), [clients]);
  const backupData = useMemo(() => buildBackupFleetFromClients(clients), [clients]);
  const antivirusSyncTargets = useMemo(() => antivirusData.filter(row => row.providerId === "bitdefender" && row.companyId && row.raw), [antivirusData]);
  const antispamSyncTargets = useMemo(() => antispamData.filter(row => row.providerId === "mailinblack" && row.customerId && row.raw), [antispamData]);
  const syncAllFleet = async () => {
    if (syncingFleet) return;
    if (activeTab === "backup") {
      setSyncingFleet(true);
      setSyncProgress(0);
      setSyncStatus(pageCopy.sync.preparing);
      try {
        const res = await fetch(`${API_BASE_URL}/checkmk/save-jobs/sync`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || pageCopy.sync.errorBackup);
        }
        setSyncStatus(pageCopy.sync.done);
        toast.success(
          data.message && data.updated != null
            ? `${data.message} (${data.updated})`
            : pageCopy.msp?.backup?.syncDone || pageCopy.sync.done
        );
        await loadClients({
          withModules: true,
          force: true,
          skipCache: true
        });
      } catch (error) {
        console.error("Error during backup fleet sync:", error);
        if (mountedRef.current) {
          toast.error(error?.message || pageCopy.sync.errorBackup);
        }
      } finally {
        if (mountedRef.current) {
          setSyncingFleet(false);
          setSyncProgress(100);
          setSyncStatus(pageCopy.sync.done);
          setTimeout(() => {
            if (!mountedRef.current) return;
            setSyncProgress(0);
            setSyncStatus("");
          }, 1200);
        }
      }
      return;
    }
    const kind = activeTab === "antispam" ? "antispam" : "antivirus";
    const targets = kind === "antispam" ? antispamSyncTargets : antivirusSyncTargets;
    if (activeTab !== "antivirus" && activeTab !== "antispam") return;
    if (targets.length === 0) {
      toast.info(kind === "antispam" ? pageCopy.sync.noneAntispam : pageCopy.sync.noneAntivirus);
      return;
    }
    fleetSyncCancelledRef.current = false;
    const controller = createTrackedAbortController();
    fleetSyncControllerRef.current = controller;
    setSyncingFleet(true);
    setSyncProgress(0);
    setSyncStatus(pageCopy.sync.preparing);
    let successCount = 0;
    let errorCount = 0;
    try {
      let processed = 0;
      for (const row of targets) {
        if (fleetSyncCancelledRef.current || controller.signal.aborted) break;
        try {
          if (mountedRef.current) {
            setSyncStatus(pageCopy.formatSyncProgress(processed + 1, targets.length, row.clientName));
          }
          if (kind === "antispam") {
            const mappingMode = row.raw.mappingMode === "dedicated" || row.raw.mailinblackTenantId ? "dedicated" : "reseller";
            await syncAndPersistAntispamSolution(row.clientId, {
              ...row.raw,
              mappingMode,
              mailinblackTenantId: mappingMode === "dedicated" ? row.raw.mailinblackTenantId : null
            }, {
              signal: controller.signal
            });
          } else {
            const mappingMode = row.raw.mappingMode === "dedicated" || row.raw.bitdefenderTenantId ? "dedicated" : "reseller";
            await syncAndPersistAntivirusSolution(row.clientId, {
              ...row.raw,
              mappingMode,
              bitdefenderTenantId: mappingMode === "dedicated" ? row.raw.bitdefenderTenantId : null
            }, {
              signal: controller.signal
            });
          }
          successCount += 1;
        } catch (error) {
          if (error?.name === "AbortError") break;
          console.error(`Error syncing ${kind} for ${row.clientName}:`, error);
          errorCount += 1;
        } finally {
          processed += 1;
          if (mountedRef.current) {
            setSyncProgress(Math.round(processed / targets.length * 100));
          }
        }
      }
      if (fleetSyncCancelledRef.current || controller.signal.aborted) return;
      await loadClients({
        withModules: true,
        force: true,
        skipCache: true
      });
      if (!mountedRef.current) return;
      if (successCount > 0) {
        toast.success(pageCopy.formatSyncSuccess(successCount, errorCount));
      } else if (errorCount > 0) {
        toast.error(pageCopy.formatSyncFailed(errorCount));
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error during fleet sync:", error);
      if (mountedRef.current) {
        toast.error(kind === "antispam" ? pageCopy.sync.errorAntispam : pageCopy.sync.errorAntivirus);
      }
    } finally {
      if (fleetSyncControllerRef.current === controller) {
        fleetSyncControllerRef.current = null;
      }
      if (mountedRef.current) {
        setSyncingFleet(false);
        setSyncProgress(100);
        setSyncStatus(pageCopy.sync.done);
        setTimeout(() => {
          if (!mountedRef.current) return;
          setSyncProgress(0);
          setSyncStatus("");
        }, 1200);
      }
    }
  };
  const filteredAntivirusData = useMemo(() => {
    let filtered = [...antivirusData];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.clientName.toLowerCase().includes(query) || item.productName.toLowerCase().includes(query) || item.licenseKey && item.licenseKey.toLowerCase().includes(query) || item.companyName && item.companyName.toLowerCase().includes(query) || item.providerName && item.providerName.toLowerCase().includes(query) || item.paymentPlan && item.paymentPlan.toLowerCase().includes(query));
    }
    if (selectedClients.size > 0) {
      filtered = filtered.filter(item => selectedClients.has(item.clientName));
    }
    if (selectedStatuses.size > 0) {
      filtered = filtered.filter(item => selectedStatuses.has(item.status));
    }
    if (selectedPaymentPlans.size > 0) {
      filtered = filtered.filter(item => selectedPaymentPlans.has(item.paymentPlan));
    }
    return filtered;
  }, [antivirusData, searchQuery, selectedClients, selectedStatuses, selectedPaymentPlans]);
  const getClientNameForSort = value => (value || "").toString().trim().replace(/^\d+\s*[-\s]*\s*/, "").toLowerCase();
  const sortedAntivirusData = useMemo(() => {
    const sorted = [...filteredAntivirusData];
    const key = antivirusSortBy;
    const order = antivirusSortOrder === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      if (key === 'expirationDate' || key === 'lastSync') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
        return (aVal - bVal) * order;
      }
      if (key === 'usedLicenses') {
        aVal = a.usedLicenses != null ? Number(a.usedLicenses) : -1;
        bVal = b.usedLicenses != null ? Number(b.usedLicenses) : -1;
        return (aVal - bVal) * order;
      }
      if (key === 'endpointsCount') {
        aVal = Array.isArray(a.endpoints) ? a.endpoints.length : a.usedLicenses != null ? Number(a.usedLicenses) : -1;
        bVal = Array.isArray(b.endpoints) ? b.endpoints.length : b.usedLicenses != null ? Number(b.usedLicenses) : -1;
        return (aVal - bVal) * order;
      }
      if (key === 'totalLicenses') {
        aVal = a.totalLicenses != null ? Number(a.totalLicenses) : -1;
        bVal = b.totalLicenses != null ? Number(b.totalLicenses) : -1;
        return (aVal - bVal) * order;
      }
      if (key === 'clientName') {
        aVal = getClientNameForSort(aVal);
        bVal = getClientNameForSort(bVal);
        return aVal.localeCompare(bVal) * order;
      }
      aVal = (aVal ?? '').toString().toLowerCase();
      bVal = (bVal ?? '').toString().toLowerCase();
      return aVal.localeCompare(bVal) * order;
    });
    return sorted;
  }, [filteredAntivirusData, antivirusSortBy, antivirusSortOrder]);
  const antivirusTotalPages = Math.max(1, Math.ceil(sortedAntivirusData.length / antivirusPageSize));
  const paginatedAntivirusData = useMemo(() => {
    const start = (antivirusCurrentPage - 1) * antivirusPageSize;
    return sortedAntivirusData.slice(start, start + antivirusPageSize);
  }, [sortedAntivirusData, antivirusCurrentPage, antivirusPageSize]);
  useEffect(() => {
    setAntivirusCurrentPage(1);
  }, [searchQuery, selectedClients, selectedStatuses, selectedPaymentPlans, antivirusSortBy, antivirusSortOrder, antivirusPageSize]);
  useEffect(() => {
    if (antivirusCurrentPage > antivirusTotalPages) setAntivirusCurrentPage(antivirusTotalPages);
  }, [antivirusCurrentPage, antivirusTotalPages]);
  const antivirusStatusCounts = useMemo(() => {
    const counts = {
      actif: 0,
      expire_bientot: 0,
      inactif: 0
    };
    antivirusData.forEach(item => {
      if (counts[item.status] !== undefined) counts[item.status]++;
    });
    return counts;
  }, [antivirusData]);
  const handleAntivirusStatCardClick = status => {
    setSelectedStatuses(new Set([status]));
  };
  const handleAntivirusTotalCardClick = () => {
    setSelectedStatuses(new Set());
  };
  const handleViewBackupInstance = (rowOrPayload, options = {}) => {
    if (!onNavigate || !rowOrPayload) return;
    const payload = buildBackupInstanceDetailPayload(rowOrPayload);
    if (!payload.instanceId && !payload.clientId) return;
    onNavigate("InstanceDetail", payload, options);
  };
  const handleViewAntivirusSolution = (row, options = {}) => {
    if (!onNavigate || !row) return;
    const raw = row.raw || {};
    const payload = buildAntivirusDetailNavigationPayload({
      id: row.clientId,
      name: row.clientName
    }, {
      ...raw,
      clientId: row.clientId,
      clientName: row.clientName,
      companyId: raw.companyId || row.companyId,
      companyName: raw.companyName || row.companyName,
      bitdefenderTenantId: raw.bitdefenderTenantId || null,
      mappingMode: raw.mappingMode || row.mappingMode,
      providerId: raw.providerId || row.providerId
    });
    if (!payload) return;
    onNavigate("AntivirusDetail", payload, options);
  };
  const handleViewAntispamSolution = (row, options = {}) => {
    if (!onNavigate || !row) return;
    const raw = row.raw || {};
    const payload = buildAntispamDetailNavigationPayload({
      id: row.clientId,
      name: row.clientName
    }, {
      ...raw,
      clientId: row.clientId,
      clientName: row.clientName,
      customerId: raw.customerId || row.customerId,
      customerName: raw.customerName || row.customerName,
      mailinblackTenantId: raw.mailinblackTenantId || null,
      mappingMode: raw.mappingMode || row.mappingMode,
      providerId: raw.providerId || row.providerId
    });
    if (!payload) return;
    onNavigate("AntispamDetail", payload, options);
  };
  const handleOpenAntivirusClient = row => {
    if (!onNavigate || !row?.clientId) return;
    onNavigate("ContratDetail", {
      clientId: row.clientId,
      name: row.clientName
    });
  };
  const moduleTabs = (pageCopy.tabs || []).filter(tab => MODULE_TABS.includes(tab.key));
  const tabPanelClass = `${styles.mspTabPanel} ${
    tabContentEnter ? styles.mspTabPanelFadeIn : styles.mspTabPanelFadePending
  }`;
  return <div className={`${styles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={styles.mspLayout}>
      <div className={styles.mspMain}>
        <main className={`${styles.mspContent} ${styles.mspContentList} ${layout.contentNoHero}`}>
          <h1 className={layout.srOnly}>{pageCopy.pageTitle}</h1>
          <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
            <div className={`${finderKit.finderLayout} ${styles.mspFinderLayout}`}>
              <aside className={finderKit.finderSidebar} aria-label={pageCopy.tabSectionsAria} data-guide="cyber-tabs">
                <nav
                  ref={finderPrimaryTrackRef}
                  className={`${finderKit.finderPrimary} ${finderKit.finderPrimaryAnimated}`}
                  role="tablist"
                  aria-orientation="vertical"
                >
                  {finderPrimaryIndicator.ready ? (
                    <div
                      className={finderKit.finderNavIndicator}
                      style={{
                        transform: `translate3d(0, ${finderPrimaryIndicator.top}px, 0)`,
                        height: finderPrimaryIndicator.height
                      }}
                      aria-hidden
                    />
                  ) : null}
                  <div className={finderKit.finderNavGroup}>
                    {moduleTabs.map(tab => {
                      const locked = tab.proOnly && isCommunity;
                      const active = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-current={active ? "page" : undefined}
                          className={`${finderKit.finderItem} ${active ? finderKit.finderItemActive : ""} ${locked ? styles.moduleRailBtnLocked : ""}`}
                          onClick={() => selectTab(tab.key)}
                          title={locked ? `${tab.label}${pageCopy.proTabSuffix || ""}` : tab.label}
                        >
                          <span className={finderKit.finderItemIcon} aria-hidden>
                            <Icon icon={tab.icon} width={18} height={18} />
                          </span>
                          <span className={finderKit.finderItemLabel}>{tab.label}</span>
                          {locked ? <ProFeatureBadge variant="inline" className={styles.moduleRailProBadge} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </aside>

              <div className={styles.mspFinderContent} data-guide="cyber-dashboard">
                <div key={activeTab} className={tabPanelClass}>
                  {activeTab === "antivirus" ? <AntivirusMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenSolution={handleViewAntivirusSolution} onOpenClient={handleOpenAntivirusClient} onSync={syncAllFleet} syncing={syncingFleet} onSolutionsChanged={() => loadClients({
                    withModules: true,
                    force: true,
                    skipCache: true
                  })} /> : null}
                  {activeTab === "antispam" ? <AntispamMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenSolution={handleViewAntispamSolution} onOpenClient={handleOpenAntivirusClient} onSync={syncAllFleet} syncing={syncingFleet} onSolutionsChanged={() => loadClients({
                    withModules: true,
                    force: true,
                    skipCache: true
                  })} /> : null}
                  {activeTab === "backup" ? <BackupMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenClient={handleOpenAntivirusClient} onOpenInstance={handleViewBackupInstance} onSync={syncAllFleet} syncing={syncingFleet} onRefresh={() => loadClients({
                    withModules: true,
                    force: true,
                    skipCache: true
                  })} /> : null}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
      <PageGuideTour open={pageGuideOpen} steps={cyberGuide.steps} title={cyberGuide.tourTitle} locale={locale} onClose={() => setPageGuideOpen(false)} />
    </div>;
}
