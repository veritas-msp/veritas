import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getAllCampaigns, createClientCampaign, updateClientCampaign } from "../../api/campaigns";
import { fetchClientsList } from "../../api/clients";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { createTrackedAbortController } from "../../utils/pageLoadAbort";
import CampaignsMspDashboard from "../CybersecuritePage/CampaignsMspDashboard";
import CampaignFormModal from "../CybersecuritePage/CampaignFormModal";
import { getCybersecuritePageCopy } from "../CybersecuritePage/cybersecuritePageI18n";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import styles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import {
  invalidateCampaignsPageCache,
  readCampaignsPageCache,
  writeCampaignsPageCache
} from "./campaignsPageCache";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getOneMonthLater() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split("T")[0];
}

function emptyForm(clientId = "") {
  return {
    client_id: clientId || "",
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
  };
}

function formatClientDisplay(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/\s*-\s*/g, " ");
}

export default function CampaignsPage({ onNavigate, pageParams }) {
  const locale = useAppLocale();
  const { isCommunity, loaded: editionLoaded } = useVeritasEdition();
  const pageCopy = useMemo(() => getCybersecuritePageCopy(locale), [locale]);
  const campaignsCopy = pageCopy.campaigns;

  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState(() => emptyForm());
  const [campaignProPromoOpen, setCampaignProPromoOpen] = useState(false);

  const campaignsRequestRef = useRef(null);
  const campaignsControllerRef = useRef(null);
  const clientsControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const lastRefreshTokenRef = useRef(null);

  const loadCampaignsDataset = useCallback(async ({ skipCache = false } = {}) => {
    if (!skipCache) {
      const cached = readCampaignsPageCache();
      if (Array.isArray(cached)) return cached;
    }
    if (!skipCache && campaignsRequestRef.current) {
      return await campaignsRequestRef.current;
    }
    campaignsControllerRef.current?.abort();
    campaignsRequestRef.current = null;
    const controller = createTrackedAbortController();
    campaignsControllerRef.current = controller;
    const request = getAllCampaigns({}, { signal: controller.signal })
      .then(data => {
        const normalized = Array.isArray(data) ? data : [];
        writeCampaignsPageCache(normalized);
        return normalized;
      })
      .catch(error => {
        if (error?.name !== "AbortError") {
          invalidateCampaignsPageCache();
        }
        throw error;
      })
      .finally(() => {
        if (campaignsRequestRef.current === request) {
          campaignsRequestRef.current = null;
        }
      });
    campaignsRequestRef.current = request;
    return await request;
  }, []);

  const loadCampaigns = useCallback(async (options = {}) => {
    const { skipCache = false, soft = false } = options;
    try {
      if (!soft) setLoadingCampaigns(true);
      const data = await loadCampaignsDataset({ skipCache });
      if (mountedRef.current) setCampaigns(data || []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error while loading campaigns:", error);
      if (mountedRef.current) {
        if (!soft) setCampaigns([]);
        toast.error(campaignsCopy?.toasts?.loadError || "Impossible de charger les campagnes");
      }
    } finally {
      if (mountedRef.current) setLoadingCampaigns(false);
    }
  }, [campaignsCopy?.toasts?.loadError, loadCampaignsDataset]);

  const loadClients = useCallback(async () => {
    try {
      clientsControllerRef.current?.abort();
      const controller = createTrackedAbortController();
      clientsControllerRef.current = controller;
      const data = await fetchClientsList({ signal: controller.signal });
      if (mountedRef.current) setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Error loading clients:", error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (isCommunity) {
      if (editionLoaded) setCampaignProPromoOpen(true);
      setLoadingCampaigns(false);
      return () => {
        mountedRef.current = false;
      };
    }
    const cached = readCampaignsPageCache();
    if (Array.isArray(cached) && cached.length >= 0) {
      setCampaigns(cached);
      setLoadingCampaigns(false);
    }
    (async () => {
      await Promise.all([
        loadCampaigns({ skipCache: true, soft: Array.isArray(cached) }),
        loadClients()
      ]);
    })();
    return () => {
      mountedRef.current = false;
      campaignsControllerRef.current?.abort();
      clientsControllerRef.current?.abort();
    };
  }, [editionLoaded, isCommunity, loadCampaigns, loadClients]);

  useEffect(() => {
    if (isCommunity) return;
    const refreshToken = pageParams?.refresh;
    if (refreshToken == null || refreshToken === lastRefreshTokenRef.current) return;
    lastRefreshTokenRef.current = refreshToken;
    invalidateCampaignsPageCache();
    void loadCampaigns({ skipCache: true });
  }, [isCommunity, loadCampaigns, pageParams?.refresh]);

  const openAddCampaign = useCallback((clientId = "") => {
    if (isCommunity) {
      setCampaignProPromoOpen(true);
      return;
    }
    setEditingCampaign(null);
    setFormData(emptyForm(clientId || pageParams?.clientId || ""));
    setShowModal(true);
  }, [isCommunity, pageParams?.clientId]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.client_id || !formData.name || !formData.type) {
      toast.error(campaignsCopy.toasts.requiredFields);
      return;
    }
    if (!editingCampaign && formData.type === "microsoft_security" && (!formData.tenant_id || !formData.azure_credential_id)) {
      toast.error(campaignsCopy.toasts.needMicrosoftTenant);
      return;
    }
    try {
      if (editingCampaign) {
        await updateClientCampaign(formData.client_id, editingCampaign.id, formData);
        toast.success(campaignsCopy.toasts.updated);
        invalidateCampaignsPageCache();
        await loadCampaigns({ skipCache: true });
        setShowModal(false);
        setEditingCampaign(null);
        setFormData(emptyForm());
      } else {
        const newCampaign = await createClientCampaign(formData.client_id, {
          ...formData,
          locale
        });
        toast.success(campaignsCopy.toasts.created);
        setShowModal(false);
        setEditingCampaign(null);
        setFormData(emptyForm());
        invalidateCampaignsPageCache();
        await loadCampaigns({ skipCache: true });
        if (onNavigate && newCampaign) {
          onNavigate("CampaignDetail", {
            ...newCampaign,
            client_id: formData.client_id,
            client_name: clients.find(c => c.id === formData.client_id)?.name || `Client ${formData.client_id}`
          });
        }
      }
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error(campaignsCopy.toasts.saveError);
    }
  };

  const buildCampaignDataForNavigate = campaign => {
    if (!campaign) return campaign;
    const clientName =
      campaign.client_name ||
      campaign.clientName ||
      formatClientDisplay(campaign.client_name || `Client ${campaign.client_id}`);
    return {
      ...campaign,
      clientName,
      client_name: campaign.client_name || clientName,
      campaignId: campaign.id || campaign.campaignId
    };
  };

  const handleViewCampaign = (campaign, options = {}) => {
    if (!onNavigate) return;
    onNavigate("CampaignDetail", buildCampaignDataForNavigate(campaign), options);
  };

  if (isCommunity && editionLoaded) {
    return (
      <div className={`${styles.mspPage} ${layout.page} msp-page-grid`}>
        <ProFeaturePromoModal
          open={campaignProPromoOpen}
          featureKey={pageCopy.proFeatureKey}
          onClose={() => setCampaignProPromoOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={styles.mspLayout}>
        <div className={styles.mspMain}>
          <main className={`${styles.mspContent} ${styles.mspContentList} ${layout.contentNoHero}`}>
            <h1 className={layout.srOnly}>{campaignsCopy?.sectionTitle || pageCopy.tabs?.campaigns || "Campagnes"}</h1>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull}`}>
              <div className={styles.tabContent} data-guide="campaigns-dashboard">
                <CampaignsMspDashboard
                  copy={pageCopy}
                  campaigns={campaigns}
                  loading={loadingCampaigns}
                  onViewCampaign={handleViewCampaign}
                  onAddCampaign={() => openAddCampaign()}
                  onCampaignsChanged={async () => {
                    invalidateCampaignsPageCache();
                    await loadCampaigns({ skipCache: true });
                  }}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <CampaignFormModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCampaign(null);
        }}
        clients={clients}
        formData={formData}
        onFormDataChange={setFormData}
        editingCampaign={editingCampaign}
        onSubmit={handleSubmit}
        copy={campaignsCopy}
        getCampaignTypeLabel={pageCopy.getCampaignTypeLabel}
        lockClient={false}
      />

      <ProFeaturePromoModal
        open={campaignProPromoOpen}
        featureKey={pageCopy.proFeatureKey}
        onClose={() => setCampaignProPromoOpen(false)}
      />
    </div>
  );
}
