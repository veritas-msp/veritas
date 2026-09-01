import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaArrowLeft, FaEdit, FaTimes, FaRocket, FaFlagCheckered, FaSpinner, FaSync, FaUndo, FaPause, FaPlay, FaDownload, FaFolderOpen } from "react-icons/fa";
import { toast } from 'react-toastify';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllCampaigns, updateClientCampaign, deleteCampaign, launchCampaign, finishCampaign, resetCampaign, pauseCampaign, resumeCampaign, getCampaignStats, downloadCampaignReport, publishCampaignReport } from "../../api/campaigns";
import { fetchClientsList } from "../../api/clients";
import { getClientOffice365Credentials, getClientMfaDetails } from "../../api/clientOffice365";
import CampaignSteps from "./CampaignSteps";
import CampaignFormModal from "./CampaignFormModal";
import CampaignReportPublishModal from "./CampaignReportPublishModal";
import MicrosoftSecurityStats from "./MicrosoftSecurityStats";
import CampaignAdoptionStats from "./CampaignAdoptionStats";
import ReportSyncProgressModal from "../RapportPage/monitoring/ReportSyncProgressModal";
import { runSupervisionSyncJobs, syncOffice365ForClient, fillSyncCopy } from "../RapportPage/monitoring/supervisionReportSync";
import API_BASE_URL from "../../config.js";
import styles from "./CampaignDetailPage.module.css";
import enterpriseStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import SmartTooltip from "../SmartTooltip";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useRegisterPageGuide } from "../../hooks/useRegisterPageGuide";
import { getCyberModalsCopy } from "./cyberModalsI18n";
import { getCybersecuritePageCopy } from "./cybersecuritePageI18n";
import { getCampaignDetailCopy, formatCampaignDetail, formatMicrosoftSyncError } from "./campaignDetailI18n";
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
  const autoSyncTriggeredRef = useRef(false);
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
    autoSyncTriggeredRef.current = false;
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
  const handleMicrosoftSync = async (options = {}) => {
    const autoStarted = options?.autoStarted === true;
    if (!campaign || !campaign.client_id || campaign.type !== 'microsoft_security') return;
    if (syncInFlightRef.current || syncLoading || syncProgress.open) return;
    if (!office365Credentials) {
      if (!autoStarted) {
        toast.error(detailCopy.actions.needEntra);
      }
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
    if (autoStarted) {
      autoSyncTriggeredRef.current = true;
    }
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
        onProgress: event => {
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
        phase: cancelled ? "cancelled" : "done",
        etaMs: 0,
        items: prev.items.map(item => item.state === "running" ? {
          ...item,
          state: "pending"
        } : item)
      }));
      if (cancelled) {
        toast.info(syncCopy.cancelledToast || syncCopy.cancelled);
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
    syncProgressCancelRef.current = true;
    try {
      syncProgressAbortRef.current?.abort();
      syncAbortControllerRef.current?.abort();
    } catch {
      // ignore
    }
  };
  const closeSyncProgressModal = () => {
    setSyncProgress(prev => ({
      ...prev,
      open: false
    }));
  };
  useEffect(() => {
    if (campaign?.type !== 'microsoft_security' || !campaign?.client_id) return;
    if (!initialFetchDone || checkingCredentials) return;
    if (office365Credentials === null) return;
    if (autoSyncTriggeredRef.current || syncInFlightRef.current || syncLoading || syncProgress.open) return;
    const lastSyncValue = campaignStats?.lastSync || lastSyncO365;
    const needsSync = !lastSyncValue || Date.now() - new Date(lastSyncValue).getTime() > RECENT_SYNC_MAX_AGE_MS;
    if (needsSync) {
      void handleMicrosoftSync({
        autoStarted: true
      });
    }
  }, [campaign?.id, campaign?.type, campaign?.client_id, initialFetchDone, checkingCredentials, office365Credentials, campaignStats?.lastSync, lastSyncO365, syncLoading, syncProgress.open]);
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
      onNavigate('Cybersecurite', {
        activeTab: 'campaigns',
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
  if (loading) {
    return <div className={`${enterpriseStyles.contratDetailPage} ${enterpriseStyles.enterpriseDetailPage} ${styles.campaignDetailPage} msp-page-grid`}>
        <div className={styles.loading}>{detailCopy.loading}</div>
      </div>;
  }
  if (error || !campaign) {
    return <div className={`${enterpriseStyles.contratDetailPage} ${enterpriseStyles.enterpriseDetailPage} ${styles.campaignDetailPage} msp-page-grid`}>
        <div className={styles.error}>
          {error || detailCopy.notFound}
          <button type="button" onClick={() => onNavigate('Cybersecurite', {
          activeTab: 'campaigns'
        })}>
            <FaArrowLeft /> {detailCopy.back}
          </button>
        </div>
      </div>;
  }
  const statusInfo = getStatusInfo(campaign.status);
  const typeInfo = getTypeInfo(campaign.type);
  const client = clients.find(c => c.id === campaign.client_id);
  const statusBadgeClass = {
    active: enterpriseStyles.contractBadge_active,
    en_preparation: enterpriseStyles.contractBadge_expiring,
    suspendue: enterpriseStyles.contractBadge_suspended,
    inactive: enterpriseStyles.contractBadge_unknown
  }[campaign.status] || enterpriseStyles.contractBadge_unknown;
  const clientLabel = client?.name || campaign.client_name || (campaign.client_id ? formatCampaignDetail(detailCopy.clientFallback, {
    id: campaign.client_id
  }) : null);
  const isActive = campaign.status === 'active';
  const isPaused = campaign.status === 'suspendue';
  const isFinished = campaign.status === 'inactive';
  const isPreparing = campaign.status === 'en_preparation';
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
  return <div className={`${enterpriseStyles.contratDetailPage} ${enterpriseStyles.enterpriseDetailPage} ${styles.campaignDetailPage} msp-page-grid`}>
      <header className={enterpriseStyles.pageHero}>
        <div className={enterpriseStyles.heroRow}>
          <button type="button" className={enterpriseStyles.backBtn} onClick={() => onNavigate('Cybersecurite', {
          activeTab: 'campaigns'
        })} aria-label={detailCopy.back}>
            <FaArrowLeft />
          </button>
          <div className={enterpriseStyles.heroMain}>
            <div className={enterpriseStyles.heroAvatar}>
              <Icon icon="mdi:shield-lock" aria-hidden />
            </div>
            <div className={enterpriseStyles.heroText}>
              <h1 className={enterpriseStyles.heroTitle}>
                {campaign.name || typeInfo?.label || campaignsCopy?.types?.microsoft_security || detailCopy.fallbackName}
              </h1>
              <div className={enterpriseStyles.heroMeta}>
                <span className={`${enterpriseStyles.contractBadge} ${statusBadgeClass}`}>
                  {statusInfo.label}
                </span>
                {typeInfo?.label && <span className={enterpriseStyles.heroMetaItem}>
                    <Icon icon="mdi:shield-check-outline" aria-hidden />
                    {typeInfo.label}
                  </span>}
                {clientLabel && (onNavigate && campaign?.client_id ? <button type="button" className={`${enterpriseStyles.heroMetaItem} ${enterpriseStyles.heroMetaLink}`} onClick={() => onNavigate("ContratDetail", {
                clientId: campaign.client_id,
                name: clientLabel
              })}>
                      <Icon icon="mdi:domain" aria-hidden />
                      {clientLabel}
                    </button> : <span className={enterpriseStyles.heroMetaItem}>
                      <Icon icon="mdi:domain" aria-hidden />
                      {clientLabel}
                    </span>)}
                {campaign.created_at && <span className={enterpriseStyles.heroMetaItem}>
                    <Icon icon="mdi:calendar-outline" aria-hidden />
                    {new Date(campaign.created_at).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
                  </span>}
              </div>
            </div>
          </div>
          <div className={enterpriseStyles.heroActions}>
            {campaign.type === 'microsoft_security' && <>
                <SmartTooltip as="span" content={syncLoading ? detailCopy.actions.syncing : detailCopy.actions.sync}>
                  <button type="button" className={styles.heroActionBtn} onClick={() => { void handleMicrosoftSync(); }} disabled={syncLoading || syncProgress.open} aria-label={detailCopy.actions.sync}>
                    {syncLoading ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaSync className={styles.heroActionIcon} />}
                  </button>
                </SmartTooltip>
                <div className={styles.heroActionSep} />
              </>}
            {showLaunchButton && <SmartTooltip as="span" content={launchTooltipMessage}>
                <button type="button" className={styles.lifecycleBtn} onClick={handleLaunchCampaign} disabled={actionLoading || !canLaunchCampaign} aria-label={detailCopy.actions.launchTooltip}>
                  {actionLoading ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaRocket className={styles.heroActionIcon} />}
                  <span>{detailCopy.actions.launch}</span>
                </button>
              </SmartTooltip>}
            {showResumeButton && <SmartTooltip as="span" content={detailCopy.actions.resumeTooltip}>
                <button type="button" className={styles.lifecycleBtn} onClick={handleResumeCampaign} disabled={actionLoading} aria-label={detailCopy.actions.resumeTooltip}>
                  {actionLoading ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaPlay className={styles.heroActionIcon} />}
                  <span>{detailCopy.actions.resume}</span>
                </button>
              </SmartTooltip>}
            {showPauseButton && <SmartTooltip as="span" content={detailCopy.actions.pauseTooltip}>
                <button type="button" className={styles.lifecycleBtnSecondary} onClick={handlePauseCampaign} disabled={actionLoading} aria-label={detailCopy.actions.pauseTooltip}>
                  {actionLoading ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaPause className={styles.heroActionIcon} />}
                  <span>{detailCopy.actions.pause}</span>
                </button>
              </SmartTooltip>}
            {showFinishButton && <SmartTooltip as="span" content={detailCopy.actions.finishTooltip}>
                <button type="button" className={styles.lifecycleBtn} onClick={handleFinishCampaign} disabled={actionLoading} aria-label={detailCopy.actions.finishTooltip}>
                  {actionLoading ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaFlagCheckered className={styles.heroActionIcon} />}
                  <span>{detailCopy.actions.finish}</span>
                </button>
              </SmartTooltip>}
            {showResetButton && <SmartTooltip as="span" content={detailCopy.actions.reset}>
                <button type="button" className={styles.heroActionBtn} onClick={handleResetCampaign} disabled={actionLoading} aria-label={detailCopy.actions.resetAria}>
                  {actionLoading ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaUndo className={styles.heroActionIcon} />}
                </button>
              </SmartTooltip>}
            {showReportActions && <>
                <div className={styles.heroActionSep} />
                <SmartTooltip as="span" content={detailCopy.actions.downloadReport}>
                  <button type="button" className={styles.lifecycleBtnSecondary} onClick={handleDownloadReport} disabled={downloadingReport || publishingReport} aria-label={detailCopy.actions.downloadReport}>
                    {downloadingReport ? <FaSpinner className={`${styles.heroActionIcon} ${styles.spinner}`} /> : <FaDownload className={styles.heroActionIcon} />}
                    <span>{detailCopy.report.download}</span>
                  </button>
                </SmartTooltip>
                <SmartTooltip as="span" content={detailCopy.actions.publishReport}>
                  <button type="button" className={styles.lifecycleBtn} onClick={openPublishReportModal} disabled={downloadingReport || publishingReport} aria-label={detailCopy.actions.publishReport}>
                    <FaFolderOpen className={styles.heroActionIcon} />
                    <span>{detailCopy.report.publish}</span>
                  </button>
                </SmartTooltip>
              </>}
            <div className={styles.heroActionSep} />
            <SmartTooltip as="span" content={detailCopy.actions.edit}>
              <button type="button" className={styles.heroActionBtn} onClick={openCampaignEditModal} aria-label={detailCopy.actions.edit}>
                <FaEdit className={styles.heroActionIcon} />
              </button>
            </SmartTooltip>
          </div>
        </div>
      </header>

      <div className={`${enterpriseStyles.pageBody} ${styles.pageBodyFull}`}>
        <div className={campaign.type === 'microsoft_security' ? styles.pageGridFull : styles.pageGridTwoCol}>
          {campaign.type === 'microsoft_security' && <div className={styles.colMicrosoft}>
              <section className={enterpriseStyles.panel}>
                <div className={enterpriseStyles.panelHeader}>
                  <h2 className={enterpriseStyles.panelTitle}>{detailCopy.microsoftSecurity}</h2>
                  <span className={styles.lastSyncMeta}>
                    {displayLastSync ? formatCampaignDetail(detailCopy.updatedAt, {
                  date: new Date(displayLastSync).toLocaleDateString(locale),
                  time: new Date(displayLastSync).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }) : detailCopy.updatedNever}
                  </span>
                </div>
                <div className={enterpriseStyles.panelBody}>
                  <MicrosoftSecurityStats campaign={campaign} clientId={campaign.client_id} stats={campaignStats} onCampaignUpdate={() => loadCampaignDetails({
                refreshStats: false,
                skipCache: true
              })} onStatsUpdate={() => loadCampaignStats({
                skipCache: true
              })} refreshTrigger={syncTrigger} isSyncing={syncLoading} copy={detailCopy} />
                </div>
              </section>
            </div>}

          <div className={campaign.type === 'microsoft_security' ? styles.colCenter : styles.colMain}>
            {campaign.type === 'microsoft_security' && <section className={enterpriseStyles.panel}>
                <div className={enterpriseStyles.panelHeader}>
                  <h2 className={enterpriseStyles.panelTitle}>{detailCopy.adoptionPanel}</h2>
                </div>
                <div className={enterpriseStyles.panelBody}>
                  <CampaignAdoptionStats campaign={campaign} clientId={campaign.client_id} stats={campaignStats} onCampaignUpdate={() => loadCampaignDetails({
                refreshStats: false,
                skipCache: true
              })} onStatsUpdate={() => loadCampaignStats({
                skipCache: true
              })} hideTitle copy={detailCopy} />
                </div>
              </section>}

            <section className={enterpriseStyles.panel}>
              <div className={enterpriseStyles.panelBody}>
                <CampaignSteps campaign={campaign} clientId={campaign.client_id} onCampaignUpdate={() => loadCampaignDetails({
                refreshStats: false,
                skipCache: true
              })} onStepsCountUpdate={handleStepsCountUpdate} embedded={false} copy={detailCopy} />
              </div>
            </section>
          </div>

          <aside className={`${enterpriseStyles.asidePanel} ${styles.asideFull} ${styles.colAside}`}>
            <div className={enterpriseStyles.rightSidebarContent}>
              <section className={enterpriseStyles.sidebarSection}>
                <div className={enterpriseStyles.sidebarInfoHeader}>
                  <span className={enterpriseStyles.sidebarInfoTitle}>{detailCopy.sidebar.general}</span>
                </div>
                <div className={enterpriseStyles.sidebarSummaryList}>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.type}</span>
                    <span className={enterpriseStyles.sidebarSummaryValue}>
                      {typeInfo?.label || campaign.type || '-'}
                    </span>
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.provider}</span>
                    <span className={enterpriseStyles.sidebarSummaryValue}>
                      {campaign.provider === 'microsoft' || campaign.type === 'microsoft_security' ? 'Microsoft' : campaign.provider || '-'}
                    </span>
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.tenant}</span>
                    {campaign.tenant_id ? <span className={enterpriseStyles.sidebarSummaryValue} title={campaign.tenant_id}>
                        {`${String(campaign.tenant_id).slice(0, 8)}…${String(campaign.tenant_id).slice(-4)}`}
                      </span> : <span className={enterpriseStyles.sidebarSummaryValueEmpty}>-</span>}
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.status}</span>
                    <span className={enterpriseStyles.sidebarSummaryValue}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.startDate}</span>
                    {campaign.start_date ? <span className={enterpriseStyles.sidebarSummaryValue}>
                        {new Date(campaign.start_date).toLocaleDateString(locale)}
                      </span> : <span className={enterpriseStyles.sidebarSummaryValueEmpty}>-</span>}
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.endDate}</span>
                    {campaign.end_date ? <span className={enterpriseStyles.sidebarSummaryValue}>
                        {new Date(campaign.end_date).toLocaleDateString(locale)}
                      </span> : <span className={enterpriseStyles.sidebarSummaryValueEmpty}>-</span>}
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.adoptionGoal}</span>
                    <span className={enterpriseStyles.sidebarSummaryValue}>
                      {typeof campaign.objectif_adoption === 'number' && !isNaN(campaign.objectif_adoption) ? `${campaign.objectif_adoption} %` : Number(campaign.objectif_adoption) === 0 ? '0 %' : '-'}
                    </span>
                  </div>
                  <div className={enterpriseStyles.sidebarSummaryItem}>
                    <span className={enterpriseStyles.sidebarSummaryLabel}>{detailCopy.sidebar.description}</span>
                    {campaign.description ? <span className={enterpriseStyles.sidebarSummaryValue}>
                        {campaign.description}
                      </span> : <span className={enterpriseStyles.sidebarSummaryValueEmpty}>{detailCopy.sidebar.noDescription}</span>}
                  </div>
                </div>
              </section>

              <section className={enterpriseStyles.sidebarSection}>
                <div className={enterpriseStyles.sidebarInfoHeader}>
                  <span className={enterpriseStyles.sidebarInfoTitle}>{detailCopy.sidebar.progress}</span>
                </div>
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{
                    width: `${Math.min(100, Math.max(0, campaign.global_progress ?? 0))}%`
                  }} />
                  </div>
                  <span className={styles.progressText}>
                    {formatCampaignDetail(detailCopy.sidebar.stepProgress, {
                    current: campaignStepsCount > 0 ? Math.min(campaignStepsCount, Math.round((campaign.global_progress ?? 0) / 100 * campaignStepsCount) || 0) : 0,
                    total: campaignStepsCount
                  })}
                  </span>
                </div>
              </section>

              <section className={enterpriseStyles.sidebarSection}>
                <div className={enterpriseStyles.sidebarInfoHeader}>
                  <span className={enterpriseStyles.sidebarInfoTitle}>{detailCopy.sidebar.shortcuts}</span>
                </div>
                <div className={styles.portalLinks}>
                  <a href="https://entra.microsoft.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview" target="_blank" rel="noreferrer" className={styles.portalLink}>
                    <Icon icon="mdi:shield-account" className={styles.portalLinkIcon} />
                    <div className={styles.portalLinkContent}>
                      <span className={styles.portalLinkTitle}>{detailCopy.portals.entraTitle}</span>
                      <span className={styles.portalLinkSubtitle}>{detailCopy.portals.entraSubtitle}</span>
                    </div>
                  </a>
                  <a href="https://security.microsoft.com/" target="_blank" rel="noreferrer" className={styles.portalLink}>
                    <Icon icon="mdi:shield-lock" className={styles.portalLinkIcon} />
                    <div className={styles.portalLinkContent}>
                      <span className={styles.portalLinkTitle}>{detailCopy.portals.defenderTitle}</span>
                      <span className={styles.portalLinkSubtitle}>{detailCopy.portals.defenderSubtitle}</span>
                    </div>
                  </a>
                  <a href="https://admin.microsoft.com/" target="_blank" rel="noreferrer" className={styles.portalLink}>
                    <Icon icon="mdi:microsoft" className={styles.portalLinkIcon} />
                    <div className={styles.portalLinkContent}>
                      <span className={styles.portalLinkTitle}>{detailCopy.portals.m365Title}</span>
                      <span className={styles.portalLinkSubtitle}>{detailCopy.portals.m365Subtitle}</span>
                    </div>
                  </a>
                  <a href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview" target="_blank" rel="noreferrer" className={styles.portalLink}>
                    <Icon icon="mdi:microsoft-azure" className={styles.portalLinkIcon} />
                    <div className={styles.portalLinkContent}>
                      <span className={styles.portalLinkTitle}>{detailCopy.portals.azureTitle}</span>
                      <span className={styles.portalLinkSubtitle}>{detailCopy.portals.azureSubtitle}</span>
                    </div>
                  </a>
                </div>
              </section>
            </div>
          </aside>
        </div>
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
