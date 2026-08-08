import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { toast } from 'react-toastify';
import { getAllCampaigns, createClientCampaign, updateClientCampaign, deleteCampaign } from "../../api/campaigns";
import { fetchCyberPageData, fetchClientsList } from "../../api/clients";
import { fetchUsers } from "../../api/users";
import API_BASE_URL from "../../config";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCommonCopy } from "../../i18n/commonI18n";
import styles from "./CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import supervisionStyles from "../EquipementPage/SupervisionCenterPage.module.css";
import SupportOrbitalBackground from "../Misc/ReportBugForm/SupportOrbitalBackground";
import AntivirusMspDashboard from "./AntivirusMspDashboard";
import AntispamMspDashboard from "./AntispamMspDashboard";
import CampaignsMspDashboard from "./CampaignsMspDashboard";
import CampaignFormModal from "./CampaignFormModal";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import SecurityOverviewPanel, { computeSecurityOverviewStats } from "./SecurityOverviewPanel";
import { buildAntivirusFleetFromClients } from "./antivirusMspUtils";
import { buildAntispamFleetFromClients, buildAntispamDetailNavigationPayload } from "../EnterprisesPage/antispamSolutionUtils";
import { buildAntivirusDetailNavigationPayload } from "../EnterprisesPage/antivirusSolutionUtils";
import { getCybersecuritePageCopy } from "./cybersecuritePageI18n";
const COMMUNITY_DEFAULT_TAB = "overview";
export default function CybersecuritePage({
  onNavigate,
  cybersecuriteParams
}) {
  const {
    isCommunity
  } = useVeritasEdition();
  const locale = useAppLocale();
  const pageCopy = useMemo(() => getCybersecuritePageCopy(locale), [locale]);
  const commonCopy = useMemo(() => getCommonCopy(locale), [locale]);
  const campaignsCopy = pageCopy.campaigns;
  const [campaignProPromoOpen, setCampaignProPromoOpen] = useState(false);
  const CYBER_PAGE_DATA_CACHE_KEY = "cyber_page_data_cache_v1";
  const CYBER_PAGE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
  const CYBER_CAMPAIGNS_CACHE_KEY = "cyber_campaigns_cache_v1";
  const CYBER_CAMPAIGNS_CACHE_TTL_MS = 3 * 60 * 1000;
  const [activeTab, setActiveTab] = useState("overview");
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
  const skipInitialTabFetchRef = useRef(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingCyberData, setLoadingCyberData] = useState(false);
  const [syncingBitdefender, setSyncingBitdefender] = useState(false);
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
  useEffect(() => {
    if (!cybersecuriteParams?.activeTab) return;
    if (cybersecuriteParams.activeTab === "campaigns" && isCommunity) {
      setCampaignProPromoOpen(true);
      setActiveTab(COMMUNITY_DEFAULT_TAB);
      return;
    }
    setActiveTab(cybersecuriteParams.activeTab);
  }, [cybersecuriteParams, isCommunity]);
  useEffect(() => {
    if (!isCommunity) return;
    if (activeTab === "campaigns") {
      setCampaignProPromoOpen(true);
      setActiveTab(COMMUNITY_DEFAULT_TAB);
    }
  }, [isCommunity, activeTab]);
  const goToTab = useCallback(tabKey => {
    const tab = pageCopy.tabs.find(item => item.key === tabKey);
    if (tab?.proOnly && isCommunity) {
      setCampaignProPromoOpen(true);
      return;
    }
    setActiveTab(tabKey);
  }, [pageCopy.tabs, isCommunity]);
  const handleTabSelect = tab => {
    goToTab(tab.key);
  };
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const abortInFlightTabFetches = () => {
    clientsControllerRef.current?.abort();
    campaignsControllerRef.current?.abort();
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
    (async () => {
      loadUsers();
      await loadClients({
        withModules: true
      });
    })();
    return () => {
      abortInFlightTabFetches();
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
      if (["antivirus", "antispam", "overview"].includes(activeTab)) {
        await loadClients({
          withModules: true
        });
        return;
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
    const controller = new AbortController();
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
        const controller = new AbortController();
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
        if (withModules) setLoadingCyberData(false);
      }
    })();
    clientsLoadPromiseRef.current = request;
    const data = await request;
    clientsLoadPromiseRef.current = null;
    return data;
  };
  const getAuthHeaders = () => ({});
  const saveBitdefenderSync = async ({
    clientId,
    solutionName,
    companyId,
    companyName,
    syncData
  }) => {
    try {
      const license = syncData?.license || null;
      const total = license?.totalLicenses ?? license?.raw?.totalSlots ?? license?.raw?.total ?? null;
      const used = license?.usedLicenses ?? license?.raw?.usedSlots ?? license?.raw?.used ?? null;
      const expirationDate = license?.expirationDate ?? license?.raw?.expiryDate ?? license?.raw?.expirationDate ?? null;
      const expiration = expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : '';
      const endpointsList = syncData?.endpoints?.list || syncData?.endpoints || [];
      const response = await fetch(`${API_BASE_URL}/bitdefender/antivirus/${clientId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          item_key: `solution-${solutionName}-${companyId}`,
          name: `${solutionName} #1`,
          data: {
            solution: solutionName,
            companyId: companyId,
            companyName: companyName,
            licencesTotales: total !== null && total !== undefined ? String(total) : '',
            licencesUtilisees: used !== null && used !== undefined ? String(used) : '',
            expiration: expiration,
            endpoints: Array.isArray(endpointsList) ? endpointsList : [],
            syncData: {
              company: syncData?.company || null,
              license: syncData?.license || null,
              endpoints: syncData?.endpoints || null,
              lastSync: new Date().toISOString()
            }
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const result = await response.json();
      return result?.success === true;
    } catch (error) {
      console.error('❌ Error sauvegarde Bitdefender:', error);
      return false;
    }
  };
  const syncAllBitdefenderLicenses = async () => {
    if (syncingBitdefender) return;
    setSyncingBitdefender(true);
    setSyncProgress(0);
    setSyncStatus(pageCopy.sync.preparing);
    let successCount = 0;
    let errorCount = 0;
    try {
      const targets = [];
      clients.forEach(client => {
        const antivirus = client.equipements?.Antivirus;
        if (antivirus && antivirus.solutions && Array.isArray(antivirus.solutions)) {
          antivirus.solutions.forEach(solution => {
            if (solution.solution === "GravityZone BitDefender" && solution.companyId) {
              targets.push({
                client,
                solution
              });
            }
          });
        }
      });
      if (targets.length === 0) {
        toast.info(pageCopy.sync.none);
        return;
      }
      let processed = 0;
      for (const target of targets) {
        const {
          client,
          solution
        } = target;
        try {
          setSyncStatus(pageCopy.formatSyncProgress(processed + 1, targets.length, client.name));
          console.log(`Synchronization Bitdefender pour ${client.name} (Company ID: ${solution.companyId})`);
          const response = await fetch(`${API_BASE_URL}/bitdefender/sync/${solution.companyId}`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error: ${response.status}`);
          }
          const result = await response.json();
          if (!result?.success || !result?.data) {
            throw new Error(result?.error || 'Error during sync');
          }
          const syncData = result.data;
          const solutionName = solution.solution || 'GravityZone BitDefender';
          const companyName = solution.companyName || syncData.company?.name || client.name;
          const saved = await saveBitdefenderSync({
            clientId: client.id,
            solutionName,
            companyId: solution.companyId,
            companyName,
            syncData
          });
          if (saved) {
            successCount++;
            console.log(`✅ Synchronization + sauvegarde réussie pour ${client.name}`);
          } else {
            throw new Error('Error saving');
          }
        } catch (error) {
          console.error(`❌ Error synchronisation pour ${client.name}:`, error);
          errorCount++;
        } finally {
          processed += 1;
          const percent = Math.round(processed / targets.length * 100);
          setSyncProgress(percent);
        }
      }
      await loadClients({
        withModules: true,
        force: true,
        skipCache: true
      });
      if (successCount > 0) {
        toast.success(pageCopy.formatSyncSuccess(successCount, errorCount));
      } else if (errorCount > 0) {
        toast.error(pageCopy.formatSyncFailed(errorCount));
      }
    } catch (error) {
      console.error('Error générale lors de la synchronisation:', error);
      toast.error(pageCopy.sync.error);
    } finally {
      setSyncingBitdefender(false);
      setSyncProgress(100);
      setSyncStatus(pageCopy.sync.done);
      setTimeout(() => {
        setSyncProgress(0);
        setSyncStatus('');
      }, 1200);
    }
  };
  const antivirusData = useMemo(() => buildAntivirusFleetFromClients(clients), [clients]);
  const antispamData = useMemo(() => buildAntispamFleetFromClients(clients), [clients]);
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
  const securityOverviewStats = useMemo(() => computeSecurityOverviewStats(antivirusData, antispamData, campaigns, isCommunity), [antivirusData, antispamData, campaigns, isCommunity]);
  const tabBadges = useMemo(() => ({
    overview: securityOverviewStats.total,
    antivirus: antivirusData.length,
    antispam: antispamData.length,
    campaigns: isCommunity ? 0 : campaigns.length
  }), [securityOverviewStats, antivirusData, antispamData, campaigns, isCommunity]);
  const handleOpenAntivirusClient = row => {
    if (!onNavigate || !row?.clientId) return;
    onNavigate("ContratDetail", {
      clientId: row.clientId,
      name: row.clientName
    });
  };
  return <div className={`${styles.mspPage} ${styles.mspPageOrbital}`}>
      <SupportOrbitalBackground variant="page" />
      <div className={styles.mspLayout}>
      <div className={styles.mspMain}>
        <header className={styles.mspHero}>
          <div className={styles.mspHeroMain}>
            <div className={styles.mspBrandMark}>
              <Icon icon="mdi:shield-lock" className={styles.mspBrandMarkIcon} />
            </div>
            <div className={styles.mspHeroCopy}>
              <span className={styles.mspEyebrow}>{pageCopy.eyebrow}</span>
              <h1 className={styles.mspTitle}>{pageCopy.pageTitle}</h1>
              <p className={styles.mspSubtitle}>{pageCopy.subtitle}</p>
            </div>
          </div>
          <div className={styles.mspTabBar} role="tablist" aria-label={pageCopy.tabSectionsAria}>
            {pageCopy.tabs.map(tab => {
              const badge = tabBadges[tab.key] || 0;
              const showBadge = tab.key === "overview" ? badge > 0 : tab.key === "antivirus" || tab.key === "antispam" || tab.key === "campaigns";
              return <button key={tab.key} type="button" className={[styles.mspTab, activeTab === tab.key ? styles.mspTabActive : "", tab.proOnly && isCommunity ? styles.mspTabProLocked : ""].filter(Boolean).join(" ")} onClick={() => handleTabSelect(tab)} title={tab.proOnly && isCommunity ? `${tab.label}${pageCopy.proTabSuffix}` : tab.label} aria-disabled={tab.proOnly && isCommunity ? true : undefined}>
                <Icon icon={tab.icon} className={styles.mspTabIcon} />
                <span className={styles.mspTabLabelRow}>
                  <span>{tab.label}</span>
                  {showBadge ? <span className={`${supervisionStyles.tabCount} ${badge === 0 ? supervisionStyles.tabCountMuted : ""}`}>
                      {badge}
                    </span> : null}
                  {tab.proOnly && isCommunity ? <ProFeatureBadge variant="inline" className={styles.mspTabProBadge} /> : null}
                </span>
              </button>;
            })}
          </div>
        </header>

        <main className={styles.mspContent}>
          <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
          <div className={styles.tabContent}>
            {activeTab === "overview" && <SecurityOverviewPanel copy={pageCopy} antivirusData={antivirusData} antispamData={antispamData} campaigns={campaigns} loading={loadingCyberData} isCommunity={isCommunity} onGoTab={goToTab} onOpenAntivirus={handleViewAntivirusSolution} onOpenAntispam={handleViewAntispamSolution} onOpenClient={handleOpenAntivirusClient} />}

            {activeTab === "antivirus" && <AntivirusMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenSolution={handleViewAntivirusSolution} onOpenClient={handleOpenAntivirusClient} />}

            {activeTab === "antispam" && <AntispamMspDashboard copy={pageCopy} clients={clients} loading={loadingCyberData} onOpenSolution={handleViewAntispamSolution} onOpenClient={handleOpenAntivirusClient} />}

            {activeTab === "campaigns" && <CampaignsMspDashboard copy={pageCopy} campaigns={campaigns} loading={loadingCampaigns} onViewCampaign={handleViewCampaign} onOpenClient={handleOpenCampaignClient} onAddCampaign={() => {
                setEditingCampaign(null);
                const prefClientId = cybersecuriteParams?.clientId || "";
                setFormData({
                  client_id: prefClientId,
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
              }} />}


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
