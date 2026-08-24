import { useState, useEffect, useMemo, useRef } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { getAllCampaigns, createClientCampaign, updateClientCampaign, deleteCampaign } from "../../api/campaigns";
import { fetchCyberPageData, fetchClientsList } from "../../api/clients";
import { fetchUsers } from "../../api/users";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCommonCopy } from "../../i18n/commonI18n";
import styles from "./CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import SupportOrbitalBackground from "../Misc/ReportBugForm/SupportOrbitalBackground";
import AntivirusMspDashboard from "./AntivirusMspDashboard";
import AntispamMspDashboard from "./AntispamMspDashboard";
import CampaignsMspDashboard from "./CampaignsMspDashboard";
import CampaignFormModal from "./CampaignFormModal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import SmartTooltip from "../SmartTooltip";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { buildAntivirusFleetFromClients } from "./antivirusMspUtils";
import { buildAntispamFleetFromClients, buildAntispamDetailNavigationPayload, syncAndPersistAntispamSolution } from "../EnterprisesPage/antispamSolutionUtils";
import { buildAntivirusDetailNavigationPayload, syncAndPersistAntivirusSolution } from "../EnterprisesPage/antivirusSolutionUtils";
import { getCybersecuritePageCopy } from "./cybersecuritePageI18n";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const MODULE_TABS = ["antivirus", "antispam", "campaigns"];
export default function CybersecuritePage({
  onNavigate,
  cybersecuriteParams
}) {
  const {
    isCommunity,
    loaded: editionLoaded
  } = useVeritasEdition();
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getCybersecuritePageCopy(locale), [locale]);
  const commonCopy = useMemo(() => getCommonCopy(locale), [locale]);
  const campaignsCopy = pageCopy.campaigns;
  const [campaignProPromoOpen, setCampaignProPromoOpen] = useState(false);
  const CYBER_PAGE_DATA_CACHE_KEY = "cyber_page_data_cache_v2";
  const CYBER_PAGE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
  const CYBER_CAMPAIGNS_CACHE_KEY = "cyber_campaigns_cache_v1";
  const CYBER_CAMPAIGNS_CACHE_TTL_MS = 3 * 60 * 1000;
  const [activeTab, setActiveTab] = useState("antivirus");
  const [campaigns, setCampaigns] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const clientsWithModulesLoadedRef = useRef(false);
  const loadingClientsRef = useRef(false);
  const clientsLoadPromiseRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const campaignsRequestRef = useRef(null);
  const campaignsControllerRef = useRef(null);
  const fleetSyncControllerRef = useRef(null);
  const fleetSyncCancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const skipInitialTabFetchRef = useRef(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingCyberData, setLoadingCyberData] = useState(false);
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
  const [antivirusPageSize, setAntivirusPageSize] = useState(10);
  const selectTab = tabKey => {
    if (tabKey === "campaigns" && isCommunity) {
      if (editionLoaded) setCampaignProPromoOpen(true);
      return;
    }
    if (!MODULE_TABS.includes(tabKey)) return;
    setActiveTab(tabKey);
  };
  useEffect(() => {
    if (!cybersecuriteParams?.activeTab) return;
    const requested = cybersecuriteParams.activeTab;
    if (requested === "campaigns" && isCommunity) {
      if (editionLoaded) setCampaignProPromoOpen(true);
      setActiveTab("antivirus");
      return;
    }
    if (requested === "overview" || !MODULE_TABS.includes(requested)) {
      setActiveTab("antivirus");
      return;
    }
    setActiveTab(requested);
  }, [cybersecuriteParams, editionLoaded, isCommunity]);
  useEffect(() => {
    if (!editionLoaded) return;
    if (!isCommunity) {
      setCampaignProPromoOpen(false);
      return;
    }
    if (activeTab === "campaigns") {
      setCampaignProPromoOpen(true);
      setActiveTab("antivirus");
    }
  }, [editionLoaded, isCommunity, activeTab]);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const abortInFlightTabFetches = () => {
    clientsControllerRef.current?.abort();
    campaignsControllerRef.current?.abort();
  };
  const abortFleetSync = () => {
    fleetSyncCancelledRef.current = true;
    fleetSyncControllerRef.current?.abort();
  };
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const getOneMonthLater = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    type: 'microsoft_security',
    provider: 'microsoft',
    tenant_id: '',
    azure_credential_id: '',
    status: 'en_preparation',
    start_date: getTodayDate(),
    end_date: getOneMonthLater(),
    global_progress: 0,
    description: ''
  });
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      loadUsers();
      await loadClients({
        withModules: true
      });
      if (!isCommunity) {
        await Promise.all([loadCampaigns(), loadAllCampaignsForStats()]);
      }
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
    let cancelled = false;
    (async () => {
      if (activeTab === "campaigns") {
        await Promise.all([loadCampaigns(), loadAllCampaignsForStats()]);
        return;
      }
      if (!activeTab || ["antivirus", "antispam"].includes(activeTab)) {
        await loadClients({
          withModules: true
        });
      }
    })();
    return () => {
      cancelled = true;
      abortInFlightTabFetches();
    };
  }, [activeTab]);
  const readCache = (key, ttlMs) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const isFresh = parsed?.savedAt && Date.now() - parsed.savedAt < ttlMs;
      return isFresh ? parsed.data : null;
    } catch {
      return null;
    }
  };
  const writeCache = (key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        savedAt: Date.now(),
        data
      }));
    } catch {}
  };
  const invalidateCampaignsCache = () => {
    try {
      sessionStorage.removeItem(CYBER_CAMPAIGNS_CACHE_KEY);
    } catch {}
  };
  const loadCampaignsDataset = async ({
    skipCache = false
  } = {}) => {
    if (!skipCache) {
      const cached = readCache(CYBER_CAMPAIGNS_CACHE_KEY, CYBER_CAMPAIGNS_CACHE_TTL_MS);
      if (Array.isArray(cached)) return cached;
    }
    if (campaignsRequestRef.current) {
      return await campaignsRequestRef.current;
    }
    campaignsControllerRef.current?.abort();
    const controller = createTrackedAbortController();
    campaignsControllerRef.current = controller;
    const request = getAllCampaigns({}, {
      signal: controller.signal
    }).then(data => {
      const normalized = Array.isArray(data) ? data : [];
      writeCache(CYBER_CAMPAIGNS_CACHE_KEY, normalized);
      return normalized;
    }).finally(() => {
      campaignsRequestRef.current = null;
    });
    campaignsRequestRef.current = request;
    return await request;
  };
  const loadAllCampaignsForStats = async () => {
    try {
      const allCampaignsData = await loadCampaignsDataset();
      setAllCampaigns(allCampaignsData || []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error while loading des campagnes pour stats:', error);
      setAllCampaigns([]);
    }
  };
  const loadCampaigns = async (options = {}) => {
    try {
      setLoadingCampaigns(true);
      const campaignsData = await loadCampaignsDataset(options);
      setCampaigns(campaignsData || []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error while loading des campagnes:', error);
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };
  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error while loading des utilisateurs:', error);
    }
  };
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
                  if (Array.isArray(parsed.data.campaigns)) {
                    setCampaigns(parsed.data.campaigns);
                    setAllCampaigns(parsed.data.campaigns);
                    writeCache(CYBER_CAMPAIGNS_CACHE_KEY, parsed.data.campaigns);
                  }
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
          const campaignsPayload = Array.isArray(payload?.campaigns) ? payload.campaigns : [];
          setClients(clientsData);
          setCampaigns(campaignsPayload);
          setAllCampaigns(campaignsPayload);
          writeCache(CYBER_CAMPAIGNS_CACHE_KEY, campaignsPayload);
          clientsWithModulesLoadedRef.current = true;
          try {
            sessionStorage.setItem(CYBER_PAGE_DATA_CACHE_KEY, JSON.stringify({
              savedAt: Date.now(),
              data: {
                clients: clientsData,
                campaigns: campaignsPayload
              }
            }));
          } catch {}
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
  const antivirusSyncTargets = useMemo(() => antivirusData.filter(row => row.providerId === "bitdefender" && row.companyId && row.raw), [antivirusData]);
  const antispamSyncTargets = useMemo(() => antispamData.filter(row => row.providerId === "mailinblack" && row.customerId && row.raw), [antispamData]);
  const syncAllFleet = async () => {
    if (syncingFleet) return;
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
  const formatClientDisplay = value => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value).replace(/\s*-\s*/g, ' ');
  };
  const resetForm = () => {
    setFormData({
      client_id: '',
      name: '',
      type: 'microsoft_security',
      provider: 'microsoft',
      tenant_id: '',
      azure_credential_id: '',
      status: 'en_preparation',
      start_date: getTodayDate(),
      end_date: getOneMonthLater(),
      global_progress: 0,
      description: ''
    });
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.client_id || !formData.name || !formData.type) {
      toast.error(campaignsCopy.toasts.requiredFields);
      return;
    }
    if (!editingCampaign && formData.type === 'microsoft_security' && (!formData.tenant_id || !formData.azure_credential_id)) {
      toast.error(campaignsCopy.toasts.needMicrosoftTenant);
      return;
    }
    try {
      if (editingCampaign) {
        await updateClientCampaign(formData.client_id, editingCampaign.id, formData);
        toast.success(campaignsCopy.toasts.updated);
        invalidateCampaignsCache();
        await loadCampaigns({
          skipCache: true
        });
        await loadAllCampaignsForStats();
        setShowModal(false);
        setEditingCampaign(null);
        resetForm();
      } else {
        const newCampaign = await createClientCampaign(formData.client_id, {
          ...formData,
          locale
        });
        toast.success(campaignsCopy.toasts.created);
        setShowModal(false);
        setEditingCampaign(null);
        resetForm();
        invalidateCampaignsCache();
        await loadCampaigns({
          skipCache: true
        });
        await loadAllCampaignsForStats();
        if (onNavigate && newCampaign) {
          const campaignData = {
            ...newCampaign,
            client_id: formData.client_id,
            client_name: clients.find(c => c.id === formData.client_id)?.name || `Client ${formData.client_id}`
          };
          onNavigate('CampaignDetail', campaignData);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(campaignsCopy.toasts.saveError);
    }
  };
  const handleDelete = async () => {
    if (confirmText !== campaignsCopy.delete.confirmWord) {
      toast.error(campaignsCopy.toasts.confirmDelete);
      return;
    }
    try {
      await deleteCampaign(confirmDeleteId);
      toast.success(campaignsCopy.toasts.deleted);
      invalidateCampaignsCache();
      await loadCampaigns({
        skipCache: true
      });
      await loadAllCampaignsForStats();
    } catch (error) {
      console.error('Error during deletion:', error);
      toast.error(campaignsCopy.toasts.deleteError);
    } finally {
      setConfirmDeleteId(null);
      setConfirmText('');
    }
  };
  const handleOpenCampaignClient = ({
    clientId,
    name
  }) => {
    if (!onNavigate || !clientId) return;
    onNavigate("ContratDetail", {
      clientId,
      name
    });
  };
  const buildCampaignDataForNavigate = campaign => {
    if (!campaign) return campaign;
    const clientName = campaign.client_name || campaign.clientName || formatClientDisplay(campaign.client_name || `Client ${campaign.client_id}`);
    return {
      ...campaign,
      clientName,
      client_name: campaign.client_name || clientName,
      campaignId: campaign.id || campaign.campaignId
    };
  };
  const handleViewCampaign = (campaign, options = {}) => {
    if (onNavigate) {
      const campaignData = buildCampaignDataForNavigate(campaign);
      onNavigate('CampaignDetail', campaignData, options);
    }
  };
  const antivirusStats = useMemo(() => {
    const total = antivirusData.length;
    const active = antivirusData.filter(item => item.status === 'actif').length;
    const expired = antivirusData.filter(item => item.status === 'inactif').length;
    const expiring = antivirusData.filter(item => item.status === 'expire_bientot').length;
    const itemsWithUsage = antivirusData.filter(item => item.usedLicenses !== null && item.totalLicenses !== null && item.totalLicenses > 0);
    const avgUsagePercent = itemsWithUsage.length > 0 ? itemsWithUsage.reduce((sum, item) => sum + item.usedLicenses / item.totalLicenses, 0) / itemsWithUsage.length : 0;
    return {
      total,
      active,
      expired,
      expiringSoon: expiring,
      avgUsagePercent: Math.round(avgUsagePercent * 100)
    };
  }, [antivirusData]);
  const handleViewAntivirusSolution = (row, options = {}) => {
    if (!onNavigate || !row) return;
    const payload = buildAntivirusDetailNavigationPayload({
      id: row.clientId,
      name: row.clientName
    }, {
      ...(row.raw || {}),
      ...row
    });
    if (!payload) return;
    onNavigate("AntivirusDetail", payload, options);
  };
  const handleViewAntispamSolution = (row, options = {}) => {
    if (!onNavigate || !row) return;
    const payload = buildAntispamDetailNavigationPayload({
      id: row.clientId,
      name: row.clientName
    }, {
      ...(row.raw || {}),
      ...row
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
  const openAddCampaign = () => {
    if (isCommunity) {
      setCampaignProPromoOpen(true);
      return;
    }
    setEditingCampaign(null);
    setFormData({
      client_id: cybersecuriteParams?.clientId || "",
      name: "",
      type: "microsoft_security",
      provider: "microsoft",
      tenant_id: "",
      azure_credential_id: "",
      status: "en_preparation",
      start_date: getTodayDate(),
      end_date: getOneMonthLater(),
      global_progress: 0,
      description: ""
    });
    setShowModal(true);
  };
  const avIssues = antivirusData.filter(row => row.status === "inactif" || row.status === "expire_bientot").length;
  const asIssues = antispamData.filter(row => row.status === "inactif" || row.status === "expire_bientot").length;
  const campaignIssues = isCommunity ? 0 : campaigns.filter(campaign => campaign.status === "suspendue").length;
  const heroSubtitle = syncingFleet && syncStatus ? syncStatus : loadingCyberData && clients.length === 0 ? pageCopy.heroRefreshing : activeTab === "antivirus" ? avIssues > 0 ? pageCopy.formatHeroIssues("antivirus", avIssues) : pageCopy.msp?.antivirus?.heroDescOk : activeTab === "antispam" ? asIssues > 0 ? pageCopy.formatHeroIssues("antispam", asIssues) : pageCopy.msp?.antispam?.heroDescOk : activeTab === "campaigns" ? campaignIssues > 0 ? pageCopy.formatCampaignHeroIssues(campaignIssues) : pageCopy.campaigns?.heroDescOk : pageCopy.subtitle;
  const heroActionsCopy = pageCopy.heroActions || {};
  const showFleetSync = activeTab === "antivirus" || activeTab === "antispam";
  const syncTooltip = syncingFleet && syncStatus ? syncStatus : activeTab === "antispam" ? heroActionsCopy.syncAntispam : heroActionsCopy.syncAntivirus;
  const moduleTabs = (pageCopy.tabs || []).filter(tab => MODULE_TABS.includes(tab.key));
  return <div className={`${styles.mspPage} ${styles.mspPageOrbital}`}>
      <SupportOrbitalBackground variant="page" />
      <div className={styles.mspLayout}>
      <div className={styles.mspMain}>
        <MspPageHero eyebrow={pageCopy.eyebrow} title={pageCopy.pageTitle} subtitle={heroSubtitle} icon="mdi:shield-lock" actions={<>
              <nav className={styles.mspTabBar} role="tablist" aria-label={pageCopy.tabSectionsAria}>
                {moduleTabs.map(tab => {
              const locked = tab.proOnly && isCommunity;
              return <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} className={`${styles.mspTab} ${activeTab === tab.key ? styles.mspTabActive : ""} ${locked ? styles.mspTabProLocked : ""}`} onClick={() => selectTab(tab.key)} title={locked ? `${tab.label}${pageCopy.proTabSuffix || ""}` : tab.label}>
                      <Icon icon={tab.icon} className={styles.mspTabIcon} aria-hidden />
                      <span className={styles.mspTabLabelRow}>
                        <span>{tab.label}</span>
                        {locked ? <ProFeatureBadge variant="inline" className={styles.mspTabProBadge} /> : null}
                      </span>
                    </button>;
            })}
              </nav>
              {showFleetSync ? <SmartTooltip content={syncTooltip}>
                <button type="button" className={layout.iconBtn} onClick={syncAllFleet} disabled={syncingFleet} aria-label={activeTab === "antispam" ? heroActionsCopy.syncAntispamAria : heroActionsCopy.syncAntivirusAria}>
                  <Icon icon="mdi:cloud-sync-outline" className={syncingFleet ? styles.spinning : undefined} aria-hidden />
                </button>
              </SmartTooltip> : null}
            </>} />

        <main className={`${styles.mspContent} ${styles.mspContentList}`}>
          <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
          <div className={styles.tabContent}>
                {activeTab === "antivirus" ? <AntivirusMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenSolution={handleViewAntivirusSolution} onOpenClient={handleOpenAntivirusClient} onSolutionsChanged={() => loadClients({
                  withModules: true,
                  force: true,
                  skipCache: true
                })} /> : null}
                {activeTab === "antispam" ? <AntispamMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenSolution={handleViewAntispamSolution} onOpenClient={handleOpenAntivirusClient} onSolutionsChanged={() => loadClients({
                  withModules: true,
                  force: true,
                  skipCache: true
                })} /> : null}
                {activeTab === "campaigns" ? <CampaignsMspDashboard copy={pageCopy} campaigns={campaigns} loading={loadingCampaigns} onViewCampaign={handleViewCampaign} onOpenClient={handleOpenCampaignClient} onAddCampaign={openAddCampaign} onCampaignsChanged={async () => {
                  invalidateCampaignsCache();
                  await Promise.all([loadCampaigns({
                    skipCache: true
                  }), loadAllCampaignsForStats()]);
                }} /> : null}
          </div>
          </div>
        </main>
      </div>
      </div>

        <CampaignFormModal open={showModal} onClose={() => {
      setShowModal(false);
      setEditingCampaign(null);
    }} clients={clients} formData={formData} onFormDataChange={setFormData} editingCampaign={editingCampaign} onSubmit={handleSubmit} copy={campaignsCopy} getCampaignTypeLabel={pageCopy.getCampaignTypeLabel} lockClient={false} />

        {}
        {confirmDeleteId && <div className={styles.modalOverlay} onClick={() => setConfirmDeleteId(null)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{campaignsCopy.delete.title}</h3>
                <button className={styles.closeButton} onClick={() => setConfirmDeleteId(null)}>
                  ×
                </button>
              </div>

              <div className={styles.modalBody}>
                <p>{campaignsCopy.delete.message}</p>
                <div style={{
            marginTop: '1rem'
          }}>
                  <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
                    {campaignsCopy.delete.confirmLabel}
                  </label>
                  <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={campaignsCopy.delete.confirmPlaceholder} style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem'
            }} autoFocus />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} onClick={() => setConfirmDeleteId(null)}>
                  {commonCopy.cancel}
                </button>
                <button className={styles.primaryButton} onClick={handleDelete} disabled={confirmText !== campaignsCopy.delete.confirmWord} style={{
            backgroundColor: confirmText === campaignsCopy.delete.confirmWord ? '#dc2626' : '#9ca3af',
            cursor: confirmText === campaignsCopy.delete.confirmWord ? 'pointer' : 'not-allowed'
          }}>
                  {commonCopy.delete}
                </button>
              </div>
            </div>
          </div>}
      <ProFeaturePromoModal open={campaignProPromoOpen} featureKey={pageCopy.proFeatureKey} onClose={() => setCampaignProPromoOpen(false)} />
    </div>;
}
