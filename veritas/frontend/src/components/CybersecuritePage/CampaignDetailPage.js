import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaArrowLeft, FaTimes, FaFlagCheckered, FaSpinner, FaUndo, FaPause, FaPlay, FaDownload, FaFolderOpen } from "react-icons/fa";
import { toast } from 'react-toastify';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllCampaigns, updateClientCampaign, deleteCampaign, launchCampaign, finishCampaign, resetCampaign, pauseCampaign, resumeCampaign, getCampaignStats, downloadCampaignReport, publishCampaignReport } from "../../api/campaigns";
import { fetchClientsList } from "../../api/clients";
import { getClientOffice365Credentials, getClientMfaDetails } from "../../api/clientOffice365";
import CampaignFormModal from "./CampaignFormModal";
import CampaignReportPublishModal from "./CampaignReportPublishModal";
import MicrosoftSecurityStats from "./MicrosoftSecurityStats";
import CampaignAdoptionStats from "./CampaignAdoptionStats";
import CampaignManagementPanel from "./CampaignManagementPanel";
import EnterpriseVaultPanel from "../EnterprisesPage/EnterpriseVaultPanel";
import { getEnterpriseVaultCopy } from "../EnterprisesPage/enterpriseVaultI18n";
import ReportSyncProgressModal from "../RapportPage/monitoring/ReportSyncProgressModal";
import { runSupervisionSyncJobs, syncOffice365ForClient, fillSyncCopy } from "../RapportPage/monitoring/supervisionReportSync";
import API_BASE_URL from "../../config.js";
import styles from "./CampaignDetailPage.module.css";
import enterpriseStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import ticketStyles from "../TicketPage/TicketDetailPage.module.css";
import ticketFs from "../TicketPage/TicketCreatePage.module.css";
import StatusDot from "../shared/StatusDot/StatusDot";
import SmartTooltip from "../SmartTooltip";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { getCyberModalsCopy } from "./cyberModalsI18n";
import { getCybersecuritePageCopy } from "./cybersecuritePageI18n";
import { getCampaignDetailCopy, formatCampaignDetail, formatMicrosoftSyncError } from "./campaignDetailI18n";
import { recordCampaignDailyAdoption } from "./campaignAdoptionDaily";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
const CAMPAIGN_TYPES = [{
  value: 'microsoft_security',
  label: 'Microsoft Security'
}, {
  value: 'cybersecurity_training',
  label: 'Cybersecurity training'
}, {
  value: 'rgpd_audit',
  label: 'GDPR compliance audit'
}, {
  value: 'penetration_test',
  label: 'Penetration test'
}, {
  value: 'phishing_simulation',
  label: 'Phishing simulation'
}, {
  value: 'vulnerability_scan',
  label: 'Vulnerability scan'
}, {
  value: 'incident_response',
  label: 'Incident response'
}, {
  value: 'compliance_audit',
  label: 'Compliance audit'
}];
const RECENT_SYNC_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CAMPAIGN_STATUSES = [{
  value: 'en_preparation',
  label: 'In preparation',
  color: '#fbbf24'
}, {
  value: 'active',
  label: 'Active',
  color: '#10b981'
}, {
  value: 'suspendue',
  label: 'Paused',
  color: '#f59e0b'
}, {
  value: 'inactive',
  label: 'Completed',
  color: '#6b7280'
}];
export default function CampaignDetailPage({
  onNavigate,
  campaignData
}) {
  const locale = useAppLocale();
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const pageCopy = useMemo(() => getCybersecuritePageCopy(locale), [locale]);
  const campaignsCopy = pageCopy.campaigns;
  const detailCopy = useMemo(() => getCampaignDetailCopy(locale), [locale]);
  const vaultCopy = useMemo(() => getEnterpriseVaultCopy(locale), [locale]);
  const CAMPAIGN_DETAIL_CLIENTS_CACHE_KEY = "campaign_detail_clients_list_cache_v1";
  const CAMPAIGN_DETAIL_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
  const CAMPAIGN_DETAIL_STATS_CACHE_TTL_MS = 2 * 60 * 1000;
  const CAMPAIGN_DETAIL_O365_CACHE_TTL_MS = 2 * 60 * 1000;
  const CAMPAIGN_DETAIL_CAMPAIGN_CACHE_TTL_MS = 30 * 1000;
  const initialCampaign = campaignData?.campaign || campaignData || null;
  const [campaign, setCampaign] = useState(initialCampaign ? {
    ...initialCampaign,
    objectif_adoption: initialCampaign.objectif_adoption !== undefined && initialCampaign.objectif_adoption !== null && initialCampaign.objectif_adoption !== '' ? Number(initialCampaign.objectif_adoption) : ''
  } : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [campaignStats, setCampaignStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [syncProgress, setSyncProgress] = useState({
    open: false,
    phase: "running",
    items: [],
    currentIndex: 0,
    etaMs: null
  });
  const syncAbortControllerRef = useRef(null);
  const syncProgressCancelRef = useRef(false);
  const syncProgressAbortRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const clientsControllerRef = useRef(null);
  const campaignControllerRef = useRef(null);
  const statsControllerRef = useRef(null);
  const o365ControllerRef = useRef(null);
  const currentSyncClientIdRef = useRef(initialCampaign?.client_id || null);
  const [lastSyncO365, setLastSyncO365] = useState(null);
  const [office365Credentials, setOffice365Credentials] = useState(null);
  const [checkingCredentials, setCheckingCredentials] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [campaignStepsCount, setCampaignStepsCount] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const openPageGuide = useCallback(() => setShowHelpModal(true), []);
  useRegisterPageGuide(openPageGuide);
  const [showPublishReportModal, setShowPublishReportModal] = useState(false);
  const [publishVisibleToClient, setPublishVisibleToClient] = useState(false);
  const [publishingReport, setPublishingReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [dailyAdoptionTrend, setDailyAdoptionTrend] = useState({ today: null, previousDay: null, delta: null });
  const initialData = campaignData?.campaign || campaignData || {};
  const [editForm, setEditForm] = useState({
    client_id: initialData?.client_id || '',
    name: initialData?.name || '',
    type: initialData?.type || '',
    provider: initialData?.provider || 'microsoft',
    tenant_id: initialData?.tenant_id || '',
    azure_credential_id: initialData?.azure_credential_id || '',
    status: initialData?.status || '',
    start_date: initialData?.start_date ? initialData.start_date.split('T')[0] : '',
    end_date: initialData?.end_date ? initialData.end_date.split('T')[0] : '',
    global_progress: initialData?.global_progress || 0,
    description: initialData?.description || '',
    objectif_adoption: initialData?.objectif_adoption !== undefined && initialData?.objectif_adoption !== null && initialData?.objectif_adoption !== '' ? Number(initialData?.objectif_adoption) : ''
  });
  useEffect(() => {
    const dataToUse = campaignData?.campaign || campaignData;
    if (dataToUse) {
      setCampaign(dataToUse ? {
        ...dataToUse,
        objectif_adoption: dataToUse.objectif_adoption !== undefined && dataToUse.objectif_adoption !== null && dataToUse.objectif_adoption !== '' ? Number(dataToUse.objectif_adoption) : ''
      } : null);
      setEditForm({
        client_id: dataToUse.client_id || '',
        name: dataToUse.name || '',
        type: dataToUse.type || '',
        provider: dataToUse.provider || 'microsoft',
        tenant_id: dataToUse.tenant_id || '',
        azure_credential_id: dataToUse.azure_credential_id || '',
        status: dataToUse.status || '',
        start_date: dataToUse.start_date ? dataToUse.start_date.split('T')[0] : '',
        end_date: dataToUse.end_date ? dataToUse.end_date.split('T')[0] : '',
        global_progress: dataToUse.global_progress || 0,
        description: dataToUse.description || '',
        objectif_adoption: dataToUse.objectif_adoption !== undefined && dataToUse.objectif_adoption !== null && dataToUse.objectif_adoption !== '' ? Number(dataToUse.objectif_adoption) : ''
      });
      loadClients();
      if (dataToUse.type === 'microsoft_security' && dataToUse.client_id) {
        setInitialFetchDone(false);
        checkOffice365Credentials();
        Promise.all([loadCampaignStats(), loadO365LastSync(dataToUse.client_id)]).finally(() => {
          setInitialFetchDone(true);
        });
      } else {
        setInitialFetchDone(true);
      }
    } else {
      setError(detailCopy.noCampaignData);
    }
  }, [campaignData, detailCopy.noCampaignData]);
  useEffect(() => {
    return () => {
      syncAbortControllerRef.current?.abort();
      clientsControllerRef.current?.abort();
      campaignControllerRef.current?.abort();
      statsControllerRef.current?.abort();
      o365ControllerRef.current?.abort();
    };
  }, []);
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
  useEffect(() => {
    currentSyncClientIdRef.current = campaign?.client_id || null;
  }, [campaign?.client_id, campaign?.id]);
  const loadCampaignDetails = async (options = {}) => {
    const refreshStats = options?.refreshStats !== false;
    const skipCache = options?.skipCache === true;
    try {
      if (!campaign?.id || !campaign?.client_id) return;
      const campaignCacheKey = `campaign_detail_item_cache_v1:${campaign.client_id}`;
      let allCampaigns = null;
      if (!skipCache) {
        allCampaigns = readCache(campaignCacheKey, CAMPAIGN_DETAIL_CAMPAIGN_CACHE_TTL_MS);
      }
      if (!Array.isArray(allCampaigns)) {
        campaignControllerRef.current?.abort();
        const controller = createTrackedAbortController();
        campaignControllerRef.current = controller;
        allCampaigns = await getAllCampaigns({
          client_id: campaign.client_id
        }, {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        writeCache(campaignCacheKey, Array.isArray(allCampaigns) ? allCampaigns : []);
      }
      const updatedCampaign = allCampaigns.find(c => c.id === campaign.id);
      if (updatedCampaign) {
        setCampaign(updatedCampaign ? {
          ...updatedCampaign,
          objectif_adoption: updatedCampaign.objectif_adoption !== undefined && updatedCampaign.objectif_adoption !== null && updatedCampaign.objectif_adoption !== '' ? Number(updatedCampaign.objectif_adoption) : ''
        } : null);
        setEditForm({
          client_id: updatedCampaign.client_id || '',
          name: updatedCampaign.name || '',
          type: updatedCampaign.type || '',
          provider: updatedCampaign.provider || 'microsoft',
          tenant_id: updatedCampaign.tenant_id || '',
          azure_credential_id: updatedCampaign.azure_credential_id || '',
          status: updatedCampaign.status || '',
          start_date: updatedCampaign.start_date ? updatedCampaign.start_date.split('T')[0] : '',
          end_date: updatedCampaign.end_date ? updatedCampaign.end_date.split('T')[0] : '',
          global_progress: updatedCampaign.global_progress || 0,
          description: updatedCampaign.description || '',
          objectif_adoption: updatedCampaign.objectif_adoption !== undefined && updatedCampaign.objectif_adoption !== null && updatedCampaign.objectif_adoption !== '' ? Number(updatedCampaign.objectif_adoption) : ''
        });
      }
      if (refreshStats && campaign.type === 'microsoft_security' && campaign.client_id) {
        await loadCampaignStats();
        await loadO365LastSync(campaign.client_id);
      }
    } catch (error) {
      console.error('❌ CampaignDetailPage - Error while loading:', error);
      setError(detailCopy.loadError);
    }
  };
  const loadClients = async () => {
    try {
      try {
        const raw = sessionStorage.getItem(CAMPAIGN_DETAIL_CLIENTS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < CAMPAIGN_DETAIL_CLIENTS_CACHE_TTL_MS;
          if (isFresh) {
            setClients(parsed.data);
            return;
          }
        }
      } catch {}
      clientsControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      clientsControllerRef.current = controller;
      const clientsData = await fetchClientsList({
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      const normalized = Array.isArray(clientsData) ? clientsData : [];
      setClients(normalized);
      try {
        sessionStorage.setItem(CAMPAIGN_DETAIL_CLIENTS_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: normalized
        }));
      } catch {}
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error loading clients:', error);
    }
  };
  const checkOffice365Credentials = async () => {
    const dataToUse = campaignData?.campaign || campaignData || campaign;
    if (!dataToUse?.client_id) return;
    try {
      setCheckingCredentials(true);
      const result = await getClientOffice365Credentials(dataToUse.client_id);
      setOffice365Credentials(result.success && result.credentials ? result.credentials : null);
    } catch (error) {
      console.error('Error verifying credentials Office365:', error);
      setOffice365Credentials(null);
    } finally {
      setCheckingCredentials(false);
    }
  };
  const handleStepsCountUpdate = count => {
    setCampaignStepsCount(count);
  };
  const loadCampaignStats = async (options = {}) => {
    const skipCache = options?.skipCache === true;
    try {
      const campaignToUse = campaign || campaignData;
      if (campaignToUse && campaignToUse.client_id && campaignToUse.type === 'microsoft_security') {
        const statsCacheKey = `campaign_detail_stats_cache_v1:${campaignToUse.client_id}:${campaignToUse.id}`;
        if (!skipCache) {
          const cached = readCache(statsCacheKey, CAMPAIGN_DETAIL_STATS_CACHE_TTL_MS);
          if (cached) {
            setCampaignStats(cached);
            return;
          }
        }
        statsControllerRef.current?.abort();
        const controller = createTrackedAbortController();
        statsControllerRef.current = controller;
        const statsData = await getCampaignStats(campaignToUse.client_id, campaignToUse.id, {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setCampaignStats(statsData);
        writeCache(statsCacheKey, statsData);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error while loading des statistiques:', error);
      setCampaignStats(null);
    }
  };
  const loadO365LastSync = async (clientId, options = {}) => {
    const skipCache = options?.skipCache === true;
    if (!clientId) return;
    try {
      const o365CacheKey = `campaign_detail_o365_sync_cache_v1:${clientId}`;
      if (!skipCache) {
        const cached = readCache(o365CacheKey, CAMPAIGN_DETAIL_O365_CACHE_TTL_MS);
        if (cached !== null) {
          setLastSyncO365(cached);
          return;
        }
      }
      o365ControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      o365ControllerRef.current = controller;
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
        credentials: 'include',
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && result.data?.length > 0) {
        const record = result.data[0];
        const lastUpdate = record.data?.lastUpdate || record.updated_at || null;
        setLastSyncO365(lastUpdate);
        writeCache(o365CacheKey, lastUpdate);
      } else {
        setLastSyncO365(null);
        writeCache(o365CacheKey, null);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error('Error while loading de la date de synchro O365:', error);
      setLastSyncO365(null);
    }
  };
  const handleMicrosoftSync = async () => {
    if (!campaign || !campaign.client_id || campaign.type !== 'microsoft_security') return;
    if (syncInFlightRef.current || syncLoading || syncProgress.open) return;
    if (!office365Credentials) {
      toast.error(detailCopy.actions.needEntra);
      return;
    }
    const targetClientId = campaign.client_id;
    const syncCopy = detailCopy.syncProgress || {};
    if (syncAbortControllerRef.current) {
      syncAbortControllerRef.current.abort();
    }
    const abortController = createTrackedAbortController();
    syncAbortControllerRef.current = abortController;
    syncProgressAbortRef.current = abortController;
    syncProgressCancelRef.current = false;
    syncInFlightRef.current = true;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const jobs = [{
      id: "office365",
      group: "office365",
      label: syncCopy.office365 || "Microsoft 365",
      estimatedMs: 45000,
      run: async () => {
        if (typeof window !== 'undefined' && typeof window.__office365SyncTrigger === 'function') {
          try {
            window.__office365SyncTrigger();
          } catch (e) {
            console.error('Error syncing via the O365 module:', e);
          }
        }
        const result = await syncOffice365ForClient(targetClientId, startDate, endDate, {
          signal: abortController.signal
        }).catch(err => {
          throw new Error(formatMicrosoftSyncError({
            error: err?.message
          }, detailCopy));
        });
        if (currentSyncClientIdRef.current !== targetClientId) {
          return;
        }
        let expectedTenantId = null;
        try {
          const credResponse = await fetch(`${API_BASE_URL}/client-office365/${targetClientId}`, {
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            signal: abortController.signal
          });
          if (credResponse.ok) {
            const credResult = await credResponse.json();
            expectedTenantId = credResult?.credentials?.tenantId || null;
          }
        } catch (credErr) {
          if (credErr.name === 'AbortError') {
            throw credErr;
          }
        }
        if (expectedTenantId && result.data?.tenantId && result.data.tenantId !== expectedTenantId) {
          throw new Error(`Synced data does not match client ${targetClientId}. Expected TenantId: ${expectedTenantId}, received: ${result.data.tenantId}`);
        }
        if (result.lastUpdate) {
          setLastSyncO365(result.lastUpdate);
        }
        return result;
      }
    }, {
      id: "refresh-stats",
      group: "refresh",
      label: syncCopy.refreshStats || "Actualisation des statistiques",
      estimatedMs: 8000,
      run: async () => {
        if (currentSyncClientIdRef.current !== targetClientId) {
          return;
        }
        await loadO365LastSync(targetClientId, {
          skipCache: true
        });
        await loadCampaignStats({
          skipCache: true
        });
        await loadCampaignDetails({
          refreshStats: false,
          skipCache: true
        });
        const campaignToUse = campaign || campaignData;
        if (campaignToUse?.client_id && campaignToUse?.id) {
          try {
            sessionStorage.removeItem(`campaign_detail_stats_cache_v1:${campaignToUse.client_id}:${campaignToUse.id}`);
          } catch {
            // ignore
          }
        }
        try {
          sessionStorage.removeItem(`campaign_detail_o365_sync_cache_v1:${targetClientId}`);
        } catch {
          // ignore
        }
        try {
          await getClientMfaDetails(targetClientId);
        } catch (mfaErr) {
          console.error('Error while loading MFA details after sync:', mfaErr);
        }
        setSyncTrigger(t => t + 1);
      }
    }];
    const initialEta = jobs.reduce((sum, job) => sum + (job.estimatedMs || 5000), 0);
    setSyncLoading(true);
    setSyncProgress({
      open: true,
      phase: "running",
      items: jobs.map(job => ({
        id: job.id,
        label: job.label,
        state: "pending",
        error: null
      })),
      currentIndex: 0,
      etaMs: initialEta
    });
    const patchItem = (index, patch) => {
      setSyncProgress(prev => {
        const items = prev.items.map((item, itemIndex) => itemIndex === index ? {
          ...item,
          ...patch
        } : item);
        return {
          ...prev,
          items,
          currentIndex: index
        };
      });
    };
    try {
      const result = await runSupervisionSyncJobs(jobs, {
        isCancelled: () => syncProgressCancelRef.current || abortController.signal.aborted || currentSyncClientIdRef.current !== targetClientId,
        signal: abortController.signal,
        onProgress: event => {
          if (syncProgressCancelRef.current || abortController.signal.aborted) return;
          if (event.type === "item") {
            patchItem(event.index, {
              state: event.state,
              error: event.error || null
            });
            return;
          }
          if (event.type === "tick" || event.type === "start") {
            setSyncProgress(prev => ({
              ...prev,
              etaMs: event.etaMs,
              currentIndex: event.completed != null ? Math.min(event.completed, jobs.length - 1) : prev.currentIndex
            }));
          }
        }
      });
      if (currentSyncClientIdRef.current !== targetClientId) {
        return;
      }
      const cancelled = result.cancelled || syncProgressCancelRef.current;
      setSyncProgress(prev => ({
        ...prev,
        phase: cancelled || prev.phase === "cancelled" ? "cancelled" : "done",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? {
          ...item,
          state: "pending"
        } : item)
      }));
      if (cancelled) {
        return;
      } else if (result.fail === 0) {
        toast.success(fillSyncCopy(syncCopy.successToast, {
          ok: result.ok,
          total: jobs.length
        }) || detailCopy.toasts.syncOk);
      } else if (result.ok > 0) {
        toast.warning(fillSyncCopy(syncCopy.partialToast, {
          ok: result.ok,
          fail: result.fail
        }));
      } else {
        toast.error(syncCopy.failToast || detailCopy.toasts.syncError);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error during sync:', error);
      if (currentSyncClientIdRef.current === targetClientId) {
        setSyncProgress(prev => ({
          ...prev,
          phase: "done",
          etaMs: 0,
          items: prev.items.map(item => item.state === "running" ? {
            ...item,
            state: "error",
            error: error?.message || null
          } : item)
        }));
        toast.error(error.message || detailCopy.toasts.syncError);
      }
    } finally {
      if (syncAbortControllerRef.current === abortController) {
        syncAbortControllerRef.current = null;
      }
      if (syncProgressAbortRef.current === abortController) {
        syncProgressAbortRef.current = null;
      }
      syncInFlightRef.current = false;
      if (currentSyncClientIdRef.current === targetClientId) {
        setSyncLoading(false);
      }
    }
  };
  const cancelSyncProgress = () => {
    if (syncProgressCancelRef.current) return;
    syncProgressCancelRef.current = true;
    try {
      syncProgressAbortRef.current?.abort();
      syncAbortControllerRef.current?.abort();
    } catch {
      // ignore
    }
    setSyncProgress(prev => {
      if (!prev.open || prev.phase !== "running") return prev;
      return {
        ...prev,
        phase: "cancelled",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? {
          ...item,
          state: "pending"
        } : item)
      };
    });
    const syncCopy = detailCopy.syncProgress || {};
    toast.info(syncCopy.cancelledToast || syncCopy.cancelled);
  };
  const closeSyncProgressModal = () => {
    setSyncProgress(prev => ({
      ...prev,
      open: false
    }));
  };
  const handleLaunchCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      if (campaign.type === 'microsoft_security') {
        await launchCampaign(campaign.client_id, campaign.id);
        toast.success(detailCopy.toasts.launched);
      } else {
        await updateClientCampaign(campaign.client_id, campaign.id, {
          status: 'active'
        });
        toast.success(detailCopy.toasts.launched);
      }
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({
          skipCache: true
        });
      }
    } catch (error) {
      console.error('Error lors du lancement:', error);
      toast.error(error.message || detailCopy.toasts.launchError);
    } finally {
      setActionLoading(false);
    }
  };
  const handlePauseCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      if (campaign.type === 'microsoft_security') {
        await pauseCampaign(campaign.client_id, campaign.id);
      } else {
        await updateClientCampaign(campaign.client_id, campaign.id, {
          status: 'suspendue'
        });
      }
      toast.success(detailCopy.toasts.paused);
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({
          skipCache: true
        });
      }
    } catch (error) {
      console.error('Error lors de la mise en pause:', error);
      toast.error(error.message || detailCopy.toasts.pauseError);
    } finally {
      setActionLoading(false);
    }
  };
  const handleResumeCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      if (campaign.type === 'microsoft_security') {
        await resumeCampaign(campaign.client_id, campaign.id);
      } else {
        await updateClientCampaign(campaign.client_id, campaign.id, {
          status: 'active'
        });
      }
      toast.success(detailCopy.toasts.resumed);
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({
          skipCache: true
        });
      }
    } catch (error) {
      console.error('Error lors de la reprise:', error);
      toast.error(error.message || detailCopy.toasts.resumeError);
    } finally {
      setActionLoading(false);
    }
  };
  const patchCampaignFields = async (patch, successMessage) => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      const updated = await updateClientCampaign(campaign.client_id, campaign.id, patch);
      const next = updated && typeof updated === "object" ? { ...campaign, ...updated, ...patch } : { ...campaign, ...patch };
      setCampaign(next);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      console.error("Error updating campaign fields:", error);
      toast.error(error.message || detailCopy.toasts.updateError || detailCopy.toasts.launchError);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async nextStatus => {
    if (!campaign || !nextStatus || nextStatus === campaign.status) return;
    if (campaign.status === "en_preparation" && nextStatus === "active") {
      await handleLaunchCampaign();
      return;
    }
    if (campaign.status === "active" && nextStatus === "suspendue") {
      await handlePauseCampaign();
      return;
    }
    if (campaign.status === "suspendue" && nextStatus === "active") {
      await handleResumeCampaign();
      return;
    }
    if ((campaign.status === "active" || campaign.status === "suspendue") && nextStatus === "inactive") {
      await handleFinishCampaign();
      return;
    }
    await patchCampaignFields({ status: nextStatus }, detailCopy.toasts.statusUpdated || detailCopy.toasts.updated);
    await loadCampaignDetails({ refreshStats: false, skipCache: true });
  };

  const handleDateFieldChange = async (field, value) => {
    if (!campaign) return;
    const current = campaign[field] ? String(campaign[field]).slice(0, 10) : "";
    const next = value || "";
    if (current === next) return;
    await patchCampaignFields(
      { [field]: next || null },
      detailCopy.toasts.updated
    );
  };

  const handleFinishCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      if (campaign.type === 'microsoft_security') {
        await finishCampaign(campaign.client_id, campaign.id);
        toast.success(detailCopy.toasts.finished);
        setPublishVisibleToClient(false);
        setShowPublishReportModal(true);
      } else {
        await updateClientCampaign(campaign.client_id, campaign.id, {
          status: 'inactive'
        });
        toast.success(detailCopy.toasts.finished);
      }
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({
          skipCache: true
        });
      }
    } catch (error) {
      console.error('Error lors de la fin:', error);
      toast.error(error.message || detailCopy.toasts.finishError);
    } finally {
      setActionLoading(false);
    }
  };
  const handleDownloadReport = async () => {
    if (!campaign?.client_id || !campaign?.id) return;
    try {
      setDownloadingReport(true);
      const safeName = String(campaign.name || campaign.id).replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, "_");
      await downloadCampaignReport(campaign.client_id, campaign.id, `Campaign_report_${safeName}.pdf`);
      toast.success(detailCopy.toasts.reportDownloaded);
    } catch (error) {
      console.error("Error téléchargement rapport:", error);
      toast.error(error.message || detailCopy.toasts.reportDownloadError);
    } finally {
      setDownloadingReport(false);
    }
  };
  const openPublishReportModal = () => {
    setPublishVisibleToClient(false);
    setShowPublishReportModal(true);
  };
  const handlePublishReport = async () => {
    if (!campaign?.client_id || !campaign?.id) return;
    try {
      setPublishingReport(true);
      const result = await publishCampaignReport(campaign.client_id, campaign.id, {
        visibleToClient: publishVisibleToClient,
        description: `PDF report for campaign « ${campaign.name || campaign.id} »`
      });
      setShowPublishReportModal(false);
      toast.success(result?.visibleToClient ? detailCopy.toasts.reportPublishedPortal : detailCopy.toasts.reportPublishedInternal);
    } catch (error) {
      console.error("Error publication rapport:", error);
      toast.error(error.message || detailCopy.toasts.reportPublishError);
    } finally {
      setPublishingReport(false);
    }
  };
  const handleResetCampaign = async () => {
    if (!campaign) return;
    if (!window.confirm(cyberCopy.resetCampaign)) return;
    try {
      setActionLoading(true);
      await resetCampaign(campaign.client_id, campaign.id);
      toast.success(detailCopy.toasts.resetOk);
      await loadCampaignDetails();
      if (campaign.type === 'microsoft_security') {
        await loadCampaignStats({
          skipCache: true
        });
      }
    } catch (error) {
      console.error('Error lors de la remise à zéro:', error);
      toast.error(error.message || detailCopy.toasts.resetError);
    } finally {
      setActionLoading(false);
    }
  };
  const getTypeInfo = type => {
    const label = campaignsCopy?.types?.[type] || CAMPAIGN_TYPES.find(t => t.value === type)?.label || type;
    return {
      value: type,
      label
    };
  };
  const getStatusInfo = status => {
    const base = CAMPAIGN_STATUSES.find(s => s.value === status) || CAMPAIGN_STATUSES[0];
    return {
      ...base,
      label: campaignsCopy?.statuses?.[status] || base.label
    };
  };
  const openCampaignEditModal = () => {
    if (!campaign) return;
    setEditForm({
      client_id: campaign.client_id || '',
      name: campaign.name || '',
      type: campaign.type || 'microsoft_security',
      provider: campaign.provider || 'microsoft',
      tenant_id: campaign.tenant_id || '',
      azure_credential_id: campaign.azure_credential_id || '',
      status: campaign.status || '',
      start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
      end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
      global_progress: campaign.global_progress || 0,
      description: campaign.description || '',
      objectif_adoption: campaign.objectif_adoption !== undefined && campaign.objectif_adoption !== null && campaign.objectif_adoption !== '' ? Number(campaign.objectif_adoption) : ''
    });
    setCampaignModalOpen(true);
  };
  const handleSave = async () => {
    if (!campaign) return;
    try {
      setSaving(true);
      await updateClientCampaign(campaign.client_id, campaign.id, editForm);
      toast.success(detailCopy.toasts.updated);
      setCampaign({
        ...campaign,
        ...editForm
      });
      setCampaignModalOpen(false);
      await loadCampaignDetails({
        refreshStats: false,
        skipCache: true
      });
    } catch (error) {
      console.error('Error lors de la mise à jour:', error);
      toast.error(detailCopy.toasts.updateError);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!campaign || confirmText !== detailCopy.delete.confirmWord) return;
    try {
      await deleteCampaign(campaign.id);
      toast.success(detailCopy.toasts.deleted);
      onNavigate('Campaigns', {
        refresh: Date.now()
      }, {
        closeCurrent: true
      });
    } catch (error) {
      console.error('Error during deletion:', error);
      toast.error(detailCopy.toasts.deleteError);
    } finally {
      setConfirmDeleteId(null);
      setConfirmText('');
    }
  };
  const currentMfaRate = useMemo(() => {
    const raw =
      campaignStats?.current?.mfaPercentage ??
      campaignStats?.current?.userMfaPercentage ??
      campaignStats?.end?.mfaPercentage ??
      null;
    return raw == null || Number.isNaN(Number(raw)) ? null : Number(raw);
  }, [campaignStats]);

  useEffect(() => {
    if (!campaign?.id || campaign.type !== "microsoft_security" || currentMfaRate == null) {
      setDailyAdoptionTrend({ today: null, previousDay: null, delta: null });
      return;
    }
    setDailyAdoptionTrend(recordCampaignDailyAdoption(campaign.id, currentMfaRate));
  }, [campaign?.id, campaign?.type, currentMfaRate]);

  useEffect(() => {
    if (activeSection === "context") setActiveSection("overview");
    if (activeSection === "phases") setActiveSection("management");
  }, [activeSection]);

  if (loading) {
    return <div className={`${enterpriseStyles.contratDetailPage} ${enterpriseStyles.enterpriseDetailPage} ${styles.campaignDetailPage} msp-page-grid`}>
        <div className={styles.loading}>{detailCopy.loading}</div>
      </div>;
  }
  if (error || !campaign) {
    return <div className={`${enterpriseStyles.contratDetailPage} ${enterpriseStyles.enterpriseDetailPage} ${styles.campaignDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          {error || detailCopy.notFound}
          <button type="button" onClick={() => onNavigate('Campaigns')}>
            <FaArrowLeft /> {detailCopy.back}
          </button>
        </div>
      </div>;
  }
  const statusInfo = getStatusInfo(campaign.status);
  const typeInfo = getTypeInfo(campaign.type);
  const client = clients.find(c => c.id === campaign.client_id);
  const clientLabel = client?.name || campaign.client_name || (campaign.client_id ? formatCampaignDetail(detailCopy.clientFallback, {
    id: campaign.client_id
  }) : null);
  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'suspendue';
  const isFinished = campaign.status === 'inactive';
  const isPreparing = campaign.status === 'en_preparation';
  const statusIsActive = isActive;
  const showLaunchButton = isPreparing;
  const showResumeButton = isPaused;
  const showPauseButton = isActive;
  const showFinishButton = isActive || isPaused;
  const showReportActions = campaign.type === 'microsoft_security' && isFinished;
  const showResetButton = campaign.type === 'microsoft_security' && (isActive || isPaused || isFinished || campaignStats?.hasSnapshots);
  const displayLastSync = campaignStats?.lastSync || lastSyncO365;
  const lastSync = displayLastSync ? new Date(displayLastSync) : null;
  const canLaunchBecauseOfSync = campaign.type !== 'microsoft_security' || lastSync && Date.now() - lastSync.getTime() <= RECENT_SYNC_MAX_AGE_MS;
  const canLaunchCampaign = campaignStepsCount > 0 && (campaign.type !== 'microsoft_security' || office365Credentials !== null) && canLaunchBecauseOfSync;
  const launchTooltipMessage = !canLaunchBecauseOfSync && campaign.type === 'microsoft_security' ? lastSync ? detailCopy.actions.syncTooOld : detailCopy.actions.syncMissing : !canLaunchCampaign ? campaignStepsCount === 0 ? detailCopy.actions.needSteps : detailCopy.actions.needEntra : detailCopy.actions.launchTooltip;
  const isMicrosoftSecurity = campaign.type === "microsoft_security";
  const campaignTitle = campaign.name || typeInfo?.label || campaignsCopy?.types?.microsoft_security || detailCopy.fallbackName;

  return <div className={`${enterpriseStyles.contratDetailPage} ${enterpriseStyles.enterpriseDetailPage} ${styles.campaignDetailPage} ${styles.campaignShell} msp-page-grid`}>
      <header className={enterpriseStyles.pageHero} data-guide="campaign-hero">
        <div className={enterpriseStyles.heroTop}>
          <div className={enterpriseStyles.heroIdentityBlock}>
            <div className={enterpriseStyles.heroCover} aria-hidden />
            <div className={enterpriseStyles.heroIdentityRow}>
              <div className={enterpriseStyles.heroMain}>
                <span className={enterpriseStyles.heroBrandIcon} aria-hidden>
                  <Icon icon="mdi:shield-lock" width={30} height={30} />
                </span>
                <div className={enterpriseStyles.heroText}>
                  <h1 className={enterpriseStyles.heroTitle}>
                    <span className={enterpriseStyles.heroTitleName}>{campaignTitle}</span>
                    <span className={`${enterpriseStyles.heroStatusBadge} ${statusIsActive ? "" : enterpriseStyles.heroStatusBadgeInactive}`.trim()}>
                      <StatusDot active={statusIsActive} label="" className={enterpriseStyles.heroTitleStatus} />
                      {statusInfo.label}
                    </span>
                  </h1>
                  <div className={enterpriseStyles.heroMeta} aria-label={detailCopy.sidebar?.general || detailCopy.microsoftSecurity}>
                    {typeInfo?.label ? (
                      <span className={enterpriseStyles.heroMetaItem}>
                        <Icon icon="mdi:shield-check-outline" aria-hidden />
                        {typeInfo.label}
                      </span>
                    ) : null}
                    {clientLabel ? (
                      onNavigate && campaign?.client_id ? (
                        <button
                          type="button"
                          className={`${enterpriseStyles.heroMetaItem} ${enterpriseStyles.heroMetaLink}`}
                          onClick={() => onNavigate("ContratDetail", {
                            clientId: campaign.client_id,
                            name: clientLabel
                          })}
                        >
                          <Icon icon="mdi:domain" aria-hidden />
                          {clientLabel}
                        </button>
                      ) : (
                        <span className={enterpriseStyles.heroMetaItem}>
                          <Icon icon="mdi:domain" aria-hidden />
                          {clientLabel}
                        </span>
                      )
                    ) : null}
                    {campaign.tenant_id ? (
                      <span
                        className={enterpriseStyles.heroMetaItem}
                        title={String(campaign.tenant_id)}
                      >
                        <Icon icon="mdi:identifier" aria-hidden />
                        {`${String(campaign.tenant_id).slice(0, 8)}…${String(campaign.tenant_id).slice(-4)}`}
                      </span>
                    ) : null}
                    {campaign.created_at ? (
                      <span className={enterpriseStyles.heroMetaItem}>
                        <Icon icon="mdi:calendar-outline" aria-hidden />
                        {new Date(campaign.created_at).toLocaleDateString(locale, {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      <div className={`${enterpriseStyles.pageBody} ${enterpriseStyles.pageBodyFill} ${styles.pageBodyFill}`.trim()}>
        {(() => {
          const sectionCopy = detailCopy.sections || {};
          const overviewCopy = detailCopy.overviewKpis || {};
          const portalLinks = isMicrosoftSecurity
            ? [
                {
                  href: "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview",
                  icon: "mdi:shield-account",
                  title: detailCopy.portals.entraTitle
                },
                {
                  href: "https://security.microsoft.com/",
                  icon: "mdi:shield-lock",
                  title: detailCopy.portals.defenderTitle
                },
                {
                  href: "https://admin.microsoft.com/",
                  icon: "mdi:microsoft",
                  title: detailCopy.portals.m365Title
                },
                {
                  href: "https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview",
                  icon: "mdi:microsoft-azure",
                  title: detailCopy.portals.azureTitle
                }
              ]
            : [];
          const sectionItems = [
            { id: "overview", icon: "mdi:view-dashboard-outline", label: sectionCopy.overview || "Vue d'ensemble" },
            ...(isMicrosoftSecurity
              ? [
                  { id: "users", icon: "mdi:account-group-outline", label: sectionCopy.users || "Utilisateurs" },
                  { id: "adoption", icon: "mdi:chart-line", label: sectionCopy.adoption || detailCopy.adoptionPanel || "Adoption" }
                ]
              : []),
            { id: "management", icon: "mdi:clipboard-text-clock-outline", label: sectionCopy.management || detailCopy.tabs?.management || "Gestion" },
            { id: "documents", icon: "mdi:folder-eye-outline", label: sectionCopy.documents || detailCopy.management?.docsTitle || "Documents" }
          ];
          const safeSection = sectionItems.some(item => item.id === activeSection) ? activeSection : "overview";
          const progressPct = Math.min(100, Math.max(0, Number(campaign.global_progress) || 0));
          const progressCurrent =
            campaignStepsCount > 0
              ? Math.min(
                  campaignStepsCount,
                  Math.round((progressPct / 100) * campaignStepsCount) || 0
                )
              : 0;
          const adoptionGoal =
            typeof campaign.objectif_adoption === "number" && !Number.isNaN(campaign.objectif_adoption)
              ? campaign.objectif_adoption
              : Number(campaign.objectif_adoption) === 0
                ? 0
                : null;
          const currentRateRaw = currentMfaRate;
          const startRate =
            campaignStats?.start?.mfaPercentage != null ? Number(campaignStats.start.mfaPercentage) : null;
          const dailyTrend = dailyAdoptionTrend;
          const vsStart =
            currentRateRaw != null && startRate != null
              ? Math.round((Number(currentRateRaw) - startRate) * 100) / 100
              : null;
          const gapToGoal =
            currentRateRaw != null && adoptionGoal != null
              ? Math.round((adoptionGoal - Number(currentRateRaw)) * 100) / 100
              : null;
          const lastSyncLabel = displayLastSync
            ? formatCampaignDetail(detailCopy.updatedAt, {
                date: new Date(displayLastSync).toLocaleDateString(locale),
                time: new Date(displayLastSync).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              })
            : detailCopy.updatedNever;

          const formatPct = value => (value == null || Number.isNaN(Number(value)) ? "—" : `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)} %`);
          const formatDelta = value => {
            if (value == null || Number.isNaN(Number(value))) return null;
            const n = Number(value);
            const sign = n > 0 ? "+" : "";
            return `${sign}${n.toFixed(n % 1 === 0 ? 0 : 1)} pt`;
          };

          const overviewKpis = [
            {
              key: "progress",
              icon: "mdi:progress-check",
              tone: "blue",
              label: overviewCopy.progress || "Progression globale",
              value: formatPct(progressPct),
              sub: formatCampaignDetail(detailCopy.sidebar.stepProgress, {
                current: progressCurrent,
                total: campaignStepsCount
              })
            },
            {
              key: "goal",
              icon: "mdi:flag-checkered",
              tone: "violet",
              label: overviewCopy.goal || "Objectif d'adoption",
              value: adoptionGoal != null ? formatPct(adoptionGoal) : "—",
              sub:
                gapToGoal == null
                  ? overviewCopy.goalHint || "Définir un objectif"
                  : gapToGoal <= 0
                    ? overviewCopy.goalReached || "Objectif atteint"
                    : formatCampaignDetail(overviewCopy.goalRemaining || "Reste {n}", { n: formatPct(gapToGoal) })
            },
            ...(isMicrosoftSecurity
              ? [
                  {
                    key: "current",
                    icon: "mdi:shield-key-outline",
                    tone: "green",
                    label: overviewCopy.currentRate || "Taux MFA actuel",
                    value: formatPct(currentRateRaw),
                    sub:
                      campaignStats?.current?.mfaEnabledCount != null
                        ? formatCampaignDetail(overviewCopy.enrolled || "{count} enrôlés", {
                            count: campaignStats.current.mfaEnabledCount
                          })
                        : lastSyncLabel
                  },
                  {
                    key: "trend",
                    icon:
                      dailyTrend.delta == null
                        ? "mdi:minus"
                        : dailyTrend.delta > 0
                          ? "mdi:trending-up"
                          : dailyTrend.delta < 0
                            ? "mdi:trending-down"
                            : "mdi:minus",
                    tone:
                      dailyTrend.delta == null
                        ? "amber"
                        : dailyTrend.delta > 0
                          ? "green"
                          : dailyTrend.delta < 0
                            ? "red"
                            : "amber",
                    label: overviewCopy.trendDay || "Tendance j-1",
                    value: formatDelta(dailyTrend.delta) || "—",
                    sub:
                      dailyTrend.previousDay != null
                        ? formatCampaignDetail(overviewCopy.yesterday || "Hier : {rate}", {
                            rate: formatPct(dailyTrend.previousDay)
                          })
                        : overviewCopy.trendPending || "Pas encore de donnée j-1"
                  },
                  {
                    key: "vsStart",
                    icon: "mdi:compare-horizontal",
                    tone: vsStart == null ? "teal" : vsStart >= 0 ? "teal" : "coral",
                    label: overviewCopy.vsStart || "Vs début campagne",
                    value: formatDelta(vsStart) || "—",
                    sub:
                      startRate != null
                        ? formatCampaignDetail(overviewCopy.startRate || "Début : {rate}", {
                            rate: formatPct(startRate)
                          })
                        : overviewCopy.noStart || "Snapshot de début requis"
                  }
                ]
              : [])
          ];

          const leftPaneCopy = detailCopy.leftPane || {};
          const startDateValue = campaign.start_date ? String(campaign.start_date).slice(0, 10) : "";
          const endDateValue = campaign.end_date ? String(campaign.end_date).slice(0, 10) : "";

          return (
            <div className={styles.workspace}>
              <aside
                className={`${ticketStyles.leftPane} ${enterpriseStyles.rightSidebarContent} ${styles.leftPane}`.trim()}
                aria-label={leftPaneCopy.properties || "Propriétés"}
              >
                <section className={`${enterpriseStyles.sidebarSection} ${ticketStyles.paneSectionOverflow}`.trim()}>
                  <div className={enterpriseStyles.sidebarInfoHeader}>
                    <span className={enterpriseStyles.sidebarInfoTitle} id="campaign-detail-properties-label">
                      {leftPaneCopy.properties || "Propriétés"}
                    </span>
                  </div>
                  <div
                    className={`${enterpriseStyles.sidebarBody} ${ticketStyles.rightPaneSectionBody} ${ticketStyles.leftPanePropertiesBody} ${ticketFs.settingsPanel}`.trim()}
                  >
                    <div className={ticketFs.equipmentField}>
                      <label className={ticketFs.equipmentFieldLabel} htmlFor="campaign-left-status">
                        {leftPaneCopy.status || detailCopy.sidebar.status}
                      </label>
                      <select
                        id="campaign-left-status"
                        className={ticketFs.select}
                        value={campaign.status || "en_preparation"}
                        disabled={actionLoading}
                        onChange={e => {
                          void handleStatusChange(e.target.value);
                        }}
                      >
                        {CAMPAIGN_STATUSES.map(item => (
                          <option key={item.value} value={item.value}>
                            {campaignsCopy?.statuses?.[item.value] || item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={ticketFs.equipmentField}>
                      <label className={ticketFs.equipmentFieldLabel}>
                        {leftPaneCopy.progress || detailCopy.sidebar.progress}
                      </label>
                      <div className={styles.leftProgressCard}>
                        <div className={styles.leftProgressTop}>
                          <strong>{formatPct(progressPct)}</strong>
                          <span>
                            {formatCampaignDetail(detailCopy.sidebar.stepProgress, {
                              current: progressCurrent,
                              total: campaignStepsCount
                            })}
                          </span>
                        </div>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className={ticketFs.equipmentField}>
                      <label className={ticketFs.equipmentFieldLabel} htmlFor="campaign-left-start">
                        {leftPaneCopy.startDate || detailCopy.sidebar.startDate}
                      </label>
                      <input
                        id="campaign-left-start"
                        type="date"
                        className={ticketFs.input}
                        value={startDateValue}
                        disabled={actionLoading}
                        onChange={e => {
                          void handleDateFieldChange("start_date", e.target.value);
                        }}
                      />
                    </div>

                    <div className={ticketFs.equipmentField}>
                      <label className={ticketFs.equipmentFieldLabel} htmlFor="campaign-left-end">
                        {leftPaneCopy.endDate || detailCopy.sidebar.endDate}
                      </label>
                      <input
                        id="campaign-left-end"
                        type="date"
                        className={ticketFs.input}
                        value={endDateValue}
                        disabled={actionLoading}
                        min={startDateValue || undefined}
                        onChange={e => {
                          void handleDateFieldChange("end_date", e.target.value);
                        }}
                      />
                    </div>

                    <div className={ticketFs.equipmentField}>
                      <label className={ticketFs.equipmentFieldLabel} htmlFor="campaign-left-type">
                        {leftPaneCopy.type || detailCopy.sidebar.type}
                      </label>
                      <input
                        id="campaign-left-type"
                        type="text"
                        className={ticketFs.input}
                        value={typeInfo?.label || campaign.type || "—"}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className={ticketFs.equipmentField}>
                      <label className={ticketFs.equipmentFieldLabel} htmlFor="campaign-left-goal">
                        {leftPaneCopy.adoptionGoal || detailCopy.sidebar.adoptionGoal}
                      </label>
                      <input
                        id="campaign-left-goal"
                        type="text"
                        className={ticketFs.input}
                        value={adoptionGoal != null ? formatPct(adoptionGoal) : "—"}
                        disabled
                        readOnly
                      />
                    </div>

                    {showResumeButton || showPauseButton || showFinishButton || showReportActions || showResetButton ? (
                      <>
                        <hr className={ticketStyles.paneSectionDivider} aria-hidden />
                        <div className={styles.leftActions}>
                          <span className={ticketFs.equipmentFieldLabel}>{leftPaneCopy.actions || "Actions"}</span>
                          {showResumeButton ? (
                            <SmartTooltip content={detailCopy.actions.resumeTooltip}>
                              <button
                                type="button"
                                className={styles.leftActionPrimary}
                                onClick={handleResumeCampaign}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <FaSpinner className={styles.spinner} /> : <FaPlay />}
                                <span>{detailCopy.actions.resume}</span>
                              </button>
                            </SmartTooltip>
                          ) : null}
                          {showPauseButton ? (
                            <SmartTooltip content={detailCopy.actions.pauseTooltip}>
                              <button
                                type="button"
                                className={styles.leftActionSecondary}
                                onClick={handlePauseCampaign}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <FaSpinner className={styles.spinner} /> : <FaPause />}
                                <span>{detailCopy.actions.pause}</span>
                              </button>
                            </SmartTooltip>
                          ) : null}
                          {showFinishButton ? (
                            <SmartTooltip content={detailCopy.actions.finishTooltip}>
                              <button
                                type="button"
                                className={styles.leftActionPrimary}
                                onClick={handleFinishCampaign}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <FaSpinner className={styles.spinner} /> : <FaFlagCheckered />}
                                <span>{detailCopy.actions.finish}</span>
                              </button>
                            </SmartTooltip>
                          ) : null}
                          {showReportActions ? (
                            <>
                              <button
                                type="button"
                                className={styles.leftActionSecondary}
                                onClick={handleDownloadReport}
                                disabled={downloadingReport || publishingReport}
                              >
                                {downloadingReport ? <FaSpinner className={styles.spinner} /> : <FaDownload />}
                                <span>{detailCopy.report.download}</span>
                              </button>
                              <button
                                type="button"
                                className={styles.leftActionPrimary}
                                onClick={openPublishReportModal}
                                disabled={downloadingReport || publishingReport}
                              >
                                <FaFolderOpen />
                                <span>{detailCopy.report.publish}</span>
                              </button>
                            </>
                          ) : null}
                          {showResetButton ? (
                            <SmartTooltip content={detailCopy.actions.reset}>
                              <button
                                type="button"
                                className={styles.leftActionSecondary}
                                onClick={handleResetCampaign}
                                disabled={actionLoading}
                                aria-label={detailCopy.actions.resetAria}
                              >
                                {actionLoading ? <FaSpinner className={styles.spinner} /> : <FaUndo />}
                                <span>{detailCopy.actions.resetShort || detailCopy.actions.resetAria}</span>
                              </button>
                            </SmartTooltip>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                </section>
              </aside>

              <div className={styles.mainColumn}>
                <nav
                  className={`${enterpriseStyles.heroTabBar} ${styles.campaignTabBar}`.trim()}
                  role="tablist"
                  aria-label={sectionCopy.aria || detailCopy.tabs?.aria || "Sections"}
                >
                  {sectionItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={safeSection === item.id}
                      className={`${enterpriseStyles.heroTab} ${safeSection === item.id ? enterpriseStyles.heroTabActive : ""}`.trim()}
                      onClick={() => setActiveSection(item.id)}
                    >
                      <Icon icon={item.icon} className={enterpriseStyles.heroTabIcon} aria-hidden />
                      <span className={enterpriseStyles.heroTabLabel}>{item.label}</span>
                    </button>
                  ))}
                </nav>

                <div className={styles.sectionMain}>
                  {safeSection === "overview" ? (
                    <div className={`${styles.overviewStack} ${styles.sectionFill}`.trim()}>
                      <section className={`${enterpriseStyles.panel} ${styles.sectionPanel} ${styles.overviewTopPanel}`.trim()}>
                        <div className={enterpriseStyles.panelHeader}>
                          <div className={enterpriseStyles.panelHeaderMain}>
                            <h2 className={enterpriseStyles.panelTitle}>{sectionCopy.overview || "Vue d'ensemble"}</h2>
                            <p className={styles.sectionHint}>
                              {statusInfo.label}
                              {clientLabel ? ` · ${clientLabel}` : ""}
                              {isMicrosoftSecurity ? ` · ${lastSyncLabel}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className={`${enterpriseStyles.panelBody} ${styles.overviewPanelBody}`.trim()}>
                          <div className={styles.overviewKpiGrid} role="list">
                            {overviewKpis.map(kpi => (
                              <div
                                key={kpi.key}
                                role="listitem"
                                className={`${styles.overviewKpiCard} ${styles[`kpiTone_${kpi.tone}`] || ""}`.trim()}
                              >
                                <div className={styles.overviewKpiTop}>
                                  <span className={styles.overviewKpiIcon} aria-hidden>
                                    <Icon icon={kpi.icon} />
                                  </span>
                                </div>
                                <span className={styles.overviewKpiValue}>{kpi.value}</span>
                                <span className={styles.overviewKpiLabel}>{kpi.label}</span>
                                {kpi.sub ? <span className={styles.overviewKpiSub}>{kpi.sub}</span> : null}
                              </div>
                            ))}
                          </div>
                          <div className={styles.progressBlock}>
                            <div className={styles.progressBlockHead}>
                              <span className={styles.denseBlockTitle}>{detailCopy.sidebar.progress}</span>
                              <span className={styles.progressText}>
                                {formatCampaignDetail(detailCopy.sidebar.stepProgress, {
                                  current: progressCurrent,
                                  total: campaignStepsCount
                                })}
                              </span>
                            </div>
                            <div className={styles.progressBar}>
                              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        </div>
                      </section>

                      {isMicrosoftSecurity ? (
                        <section className={`${enterpriseStyles.panel} ${styles.sectionPanel} ${styles.sectionPanelFill}`.trim()}>
                          <div className={enterpriseStyles.panelHeader}>
                            <div className={enterpriseStyles.panelHeaderMain}>
                              <h2 className={enterpriseStyles.panelTitle}>{detailCopy.microsoftSecurity}</h2>
                            </div>
                            <button type="button" className={styles.textLinkBtn} onClick={() => setActiveSection("users")}>
                              {sectionCopy.openUsers || "Voir le détail"}
                            </button>
                          </div>
                          <div className={`${enterpriseStyles.panelBody} ${styles.sectionPanelBodyFill}`.trim()}>
                            <MicrosoftSecurityStats
                              campaign={campaign}
                              clientId={campaign.client_id}
                              stats={campaignStats}
                              compact
                              kpisOnly
                              onOpenUsers={() => setActiveSection("users")}
                              onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                              onStatsUpdate={() => loadCampaignStats({ skipCache: true })}
                              refreshTrigger={syncTrigger}
                              isSyncing={syncLoading}
                              copy={detailCopy}
                            />
                          </div>
                        </section>
                      ) : null}
                    </div>
                  ) : null}

                  {safeSection === "users" && isMicrosoftSecurity ? (
                    <section className={`${enterpriseStyles.panel} ${styles.sectionPanel} ${styles.sectionPanelFill}`.trim()}>
                      <div className={enterpriseStyles.panelHeader}>
                        <div className={enterpriseStyles.panelHeaderMain}>
                          <h2 className={enterpriseStyles.panelTitle}>{detailCopy.microsoftSecurity}</h2>
                          <p className={styles.sectionHint}>{lastSyncLabel}</p>
                        </div>
                      </div>
                      <div className={`${enterpriseStyles.panelBody} ${styles.sectionPanelBodyFill}`.trim()}>
                        <MicrosoftSecurityStats
                          campaign={campaign}
                          clientId={campaign.client_id}
                          stats={campaignStats}
                          compact
                          fill
                          onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                          onStatsUpdate={() => loadCampaignStats({ skipCache: true })}
                          refreshTrigger={syncTrigger}
                          isSyncing={syncLoading}
                          copy={detailCopy}
                        />
                      </div>
                    </section>
                  ) : null}

                  {safeSection === "adoption" && isMicrosoftSecurity ? (
                    <section className={`${enterpriseStyles.panel} ${styles.sectionPanel} ${styles.sectionPanelFill}`.trim()}>
                      <div className={enterpriseStyles.panelHeader}>
                        <div className={enterpriseStyles.panelHeaderMain}>
                          <h2 className={enterpriseStyles.panelTitle}>{detailCopy.adoptionPanel}</h2>
                        </div>
                      </div>
                      <div className={`${enterpriseStyles.panelBody} ${styles.sectionPanelBodyFill}`.trim()}>
                        <CampaignAdoptionStats
                          campaign={campaign}
                          clientId={campaign.client_id}
                          stats={campaignStats}
                          onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                          onStatsUpdate={() => loadCampaignStats({ skipCache: true })}
                          hideTitle
                          compact
                          copy={detailCopy}
                        />
                      </div>
                    </section>
                  ) : null}

                  {safeSection === "management" ? (
                    <section className={`${enterpriseStyles.panel} ${styles.sectionPanel} ${styles.sectionPanelFill} ${styles.managementSection}`.trim()}>
                      <div className={`${enterpriseStyles.panelBody} ${styles.sectionPanelBodyFill}`.trim()}>
                        <CampaignManagementPanel
                          campaign={campaign}
                          clientId={campaign.client_id}
                          copy={detailCopy}
                          onCampaignUpdate={() => loadCampaignDetails({ refreshStats: false, skipCache: true })}
                          onStepsCountUpdate={handleStepsCountUpdate}
                        />
                      </div>
                    </section>
                  ) : null}

                  {safeSection === "documents" ? (
                    <section className={`${enterpriseStyles.panel} ${styles.sectionPanel} ${styles.sectionPanelFill}`.trim()}>
                      <div className={enterpriseStyles.panelHeader}>
                        <div className={enterpriseStyles.panelHeaderMain}>
                          <h2 className={enterpriseStyles.panelTitle}>
                            {detailCopy.management?.docsTitle || sectionCopy.documents || "Documents"}
                          </h2>
                          <p className={styles.sectionHint}>
                            {detailCopy.management?.docsHint || ""}
                          </p>
                        </div>
                      </div>
                      <div className={`${enterpriseStyles.panelBody} ${styles.sectionPanelBodyFill}`.trim()}>
                        {campaign.client_id ? (
                          <EnterpriseVaultPanel
                            copy={vaultCopy}
                            clientId={campaign.client_id}
                            clientName={clientLabel || ""}
                          />
                        ) : (
                          <p className={styles.sectionHint}>
                            {detailCopy.management?.docsNoClient || "Aucun client lié à cette campagne."}
                          </p>
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>

              <div className={`${enterpriseStyles.asideStack} ${styles.asideStack}`.trim()}>
                <section
                  className={`${enterpriseStyles.quickActionsCard} ${styles.quickActionsCardFill}`.trim()}
                  aria-label={detailCopy.sidebar.quickActions || "Actions rapides"}
                >
                  <h3 className={enterpriseStyles.quickActionsTitle}>
                    {detailCopy.sidebar.quickActions || "Actions rapides"}
                  </h3>
                  <ul className={enterpriseStyles.quickActionsList}>
                    {isMicrosoftSecurity ? (
                      <li>
                        <button
                          type="button"
                          className={enterpriseStyles.quickActionItem}
                          onClick={() => { void handleMicrosoftSync(); }}
                          disabled={syncLoading || syncProgress.open}
                        >
                          <span className={enterpriseStyles.quickActionIcon} aria-hidden>
                            {syncLoading || syncProgress.open
                              ? <Icon icon="mdi:loading" className={styles.spinner} />
                              : <Icon icon="mdi:sync" />}
                          </span>
                          <span className={enterpriseStyles.quickActionLabel}>
                            {syncLoading || syncProgress.open
                              ? (detailCopy.actions.syncing || "Synchronisation…")
                              : (detailCopy.actions.syncShort || detailCopy.actions.sync || "Synchroniser")}
                          </span>
                          <Icon icon="mdi:chevron-right" className={enterpriseStyles.quickActionChevron} aria-hidden />
                        </button>
                      </li>
                    ) : null}
                    {showLaunchButton ? (
                      <li>
                        <SmartTooltip as="div" className={styles.quickActionTooltipWrap} content={launchTooltipMessage}>
                          <button
                            type="button"
                            className={enterpriseStyles.quickActionItem}
                            onClick={handleLaunchCampaign}
                            disabled={actionLoading || !canLaunchCampaign}
                          >
                            <span className={enterpriseStyles.quickActionIcon} aria-hidden>
                              {actionLoading
                                ? <Icon icon="mdi:loading" className={styles.spinner} />
                                : <Icon icon="mdi:rocket-launch-outline" />}
                            </span>
                            <span className={enterpriseStyles.quickActionLabel}>{detailCopy.actions.launch}</span>
                            <Icon icon="mdi:chevron-right" className={enterpriseStyles.quickActionChevron} aria-hidden />
                          </button>
                        </SmartTooltip>
                      </li>
                    ) : null}
                    <li>
                      <button
                        type="button"
                        className={enterpriseStyles.quickActionItem}
                        onClick={openCampaignEditModal}
                      >
                        <span className={enterpriseStyles.quickActionIcon} aria-hidden>
                          <Icon icon="mdi:pencil-outline" />
                        </span>
                        <span className={enterpriseStyles.quickActionLabel}>
                          {detailCopy.actions.editShort || detailCopy.actions.edit || "Éditer"}
                        </span>
                        <Icon icon="mdi:chevron-right" className={enterpriseStyles.quickActionChevron} aria-hidden />
                      </button>
                    </li>
                  </ul>
                  {portalLinks.length > 0 ? (
                    <div className={styles.quickActionsShortcuts}>
                      <h4 className={`${enterpriseStyles.sidebarInfoTitle} ${styles.quickActionsSectionTitle}`.trim()}>
                        {detailCopy.sidebar.shortcuts || "Raccourcis"}
                      </h4>
                      <ul className={enterpriseStyles.quickActionsList}>
                        {portalLinks.map(item => (
                          <li key={item.href}>
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className={`${enterpriseStyles.quickActionItem} ${styles.quickActionLink}`.trim()}
                            >
                              <span className={enterpriseStyles.quickActionIcon} aria-hidden>
                                <Icon icon={item.icon} />
                              </span>
                              <span className={enterpriseStyles.quickActionLabel}>{item.title}</span>
                              <Icon icon="mdi:chevron-right" className={enterpriseStyles.quickActionChevron} aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          );
        })()}
      </div>

      {}
      <CampaignFormModal open={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} clients={clients} formData={editForm} onFormDataChange={setEditForm} editingCampaign={campaign} onSubmit={async e => {
      e?.preventDefault?.();
      await handleSave();
    }} saving={saving} copy={campaignsCopy} getCampaignTypeLabel={type => campaignsCopy?.types?.[type] || type} lockClient onDeleteCampaign={() => {
      setCampaignModalOpen(false);
      setConfirmDeleteId(campaign.id);
      setConfirmText('');
    }} statusOptions={CAMPAIGN_STATUSES.map(s => ({
      value: s.value,
      label: campaignsCopy?.statuses?.[s.value] || s.label
    }))} />

      {}
      {confirmDeleteId && <div className={styles.modalOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{detailCopy.delete.title}</h3>
              <button className={styles.closeButton} onClick={() => setConfirmDeleteId(null)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>{detailCopy.delete.message}</p>
              <div>
                <label className={styles.confirmLabel}>
                  {formatCampaignDetail(detailCopy.delete.confirmLabel, {
                word: detailCopy.delete.confirmWord
              })}
                </label>
                <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={detailCopy.delete.confirmPlaceholder} className={styles.confirmInput} autoFocus />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setConfirmDeleteId(null)}>
                {detailCopy.delete.cancel}
              </button>
              <button className={styles.primaryButton} onClick={handleDelete} disabled={confirmText !== detailCopy.delete.confirmWord}>
                {detailCopy.delete.confirm}
              </button>
            </div>
          </div>
        </div>}

      {}
      {ReactDOM.createPortal(<AnimatePresence>
          {showHelpModal && <motion.div className={styles.fullScreenModalOverlay} initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.3
      }} onClick={() => setShowHelpModal(false)}>
              <motion.div className={styles.helpModalContent} initial={{
          scale: 0.9,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.9,
          opacity: 0
        }} transition={{
          duration: 0.3,
          ease: 'easeOut'
        }} onClick={e => e.stopPropagation()}>
                <div className={styles.helpModalHeader}>
                  <div className={styles.helpModalTitle}>
                    <Icon icon="mdi:school" className={styles.helpIcon} />
                    {detailCopy.help.title}
                  </div>
                  <button className={styles.helpModalClose} onClick={() => setShowHelpModal(false)} title={detailCopy.help.closeTitle}>
                    <FaTimes />
                  </button>
                </div>

                <div className={styles.helpModalBody}>
          <div className={styles.helpContent}>
            {}
            <div className={styles.mainSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Icon icon="mdi:shield-lock" />
                </div>
                <h2>{detailCopy.help.whatTitle}</h2>
              </div>
              <div className={styles.sectionContent}>
                <p className={styles.mainText}>
                  {detailCopy.help.whatText}
                </p>
                <div className={styles.benefits}>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:security" />
                    <span>{detailCopy.help.benefitSecurity}</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:account-group" />
                    <span>{detailCopy.help.benefitAdoption}</span>
                  </div>
                  <div className={styles.benefit}>
                    <Icon icon="mdi:chart-line" />
                    <span>{detailCopy.help.benefitTracking}</span>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className={styles.horizontalSections}>
              {}
              <div className={styles.mainSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Icon icon="mdi:cog" />
                  </div>
                  <h2>{detailCopy.help.howTitle}</h2>
                </div>
                <div className={styles.stepsGrid}>
                  <div className={styles.step}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                      <h4>{detailCopy.help.step1Title}</h4>
                      <p>{detailCopy.help.step1Text}</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                      <h4>{detailCopy.help.step2Title}</h4>
                      <p>{detailCopy.help.step2Text}</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                      <h4>{detailCopy.help.step3Title}</h4>
                      <p>{detailCopy.help.step3Text}</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>4</div>
                    <div className={styles.stepContent}>
                      <h4>{detailCopy.help.step4Title}</h4>
                      <p>{detailCopy.help.step4Text}</p>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className={styles.mainSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <Icon icon="mdi:star" />
                  </div>
                  <h2>{detailCopy.help.whyTitle}</h2>
                </div>
                <div className={styles.advantages}>
                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:account-supervisor" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>{detailCopy.help.adv1Title}</h4>
                      <p>{detailCopy.help.adv1Text}</p>
                    </div>
                  </div>

                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:email" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>{detailCopy.help.adv2Title}</h4>
                      <p>{detailCopy.help.adv2Text}</p>
                    </div>
                  </div>

                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:chart-bar" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>{detailCopy.help.adv3Title}</h4>
                      <p>{detailCopy.help.adv3Text}</p>
                    </div>
                  </div>

                  <div className={styles.advantage}>
                    <div className={styles.advIcon}>
                      <Icon icon="mdi:shield-check" />
                    </div>
                    <div className={styles.advContent}>
                      <h4>{detailCopy.help.adv4Title}</h4>
                      <p>{detailCopy.help.adv4Text}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className={styles.statsSection}>
              <h3>{detailCopy.help.resultsTitle}</h3>
              <div className={styles.statsContainer}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>95%</div>
                  <div className={styles.statLabel}>{detailCopy.help.resultAdoption}</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>30j</div>
                  <div className={styles.statLabel}>{detailCopy.help.resultDuration}</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>0</div>
                  <div className={styles.statLabel}>{detailCopy.help.resultInterruptions}</div>
                </div>
              </div>
            </div>
          </div> {}
        </div>   {}

        <div className={styles.helpModalFooter}>
                  <button className={styles.helpModalCloseBtn} onClick={() => setShowHelpModal(false)}>
                    {detailCopy.help.close}
                  </button>
        </div>
      </motion.div>
    </motion.div>}
</AnimatePresence>, document.getElementById('modal-root') || document.body)}
      <CampaignReportPublishModal open={showPublishReportModal} copy={detailCopy.report} clientLabel={campaign?.client_name || formatCampaignDetail(detailCopy.clientFallback, {
      id: campaign?.client_id || "—"
    })} documentName={`Campaign_report_${String(campaign?.name || campaign?.id || "report").replace(/\s+/g, "_")}.pdf`} visibleToClient={publishVisibleToClient} onVisibleToClientChange={setPublishVisibleToClient} publishing={publishingReport} onClose={() => {
      if (!publishingReport) setShowPublishReportModal(false);
    }} onConfirm={handlePublishReport} />
      <ReportSyncProgressModal open={syncProgress.open} copy={detailCopy.syncProgress || {}} items={syncProgress.items} currentIndex={syncProgress.currentIndex} etaMs={syncProgress.etaMs} phase={syncProgress.phase} onCancel={cancelSyncProgress} onClose={closeSyncProgressModal} />
    </div>;
}
