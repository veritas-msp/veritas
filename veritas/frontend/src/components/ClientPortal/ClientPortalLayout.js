import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalCompanies, fetchPortalDashboard, switchPortalCompany } from "../../api/clientPortalTickets";
import { stopPortalImpersonation } from "../../api/contactPortal";
import { showError } from "../../utils/toast";
import ClientPortalSidebar from "./ClientPortalSidebar";
import { getClientPortalCopy } from "./clientPortalI18n";
import {
  filterPortalDashboardBySite,
  getPortalSites,
  getSiteLocationValue,
  readStoredPortalSite,
  writeStoredPortalSite
} from "./portalSiteFilter";
import styles from "./ClientDashboard.module.css";

function companyKey(company) {
  const id = company?.client_id ?? company?.id;
  return id == null ? null : String(id);
}

function mergeCompanyOptions(companies, dashboardClient, activeClientId) {
  const list = [];
  const seen = new Set();
  const add = company => {
    const key = companyKey(company);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push({
      client_id: company.client_id ?? company.id,
      name: company.name || company.client_name || null
    });
  };
  (Array.isArray(companies) ? companies : []).forEach(add);
  if (dashboardClient?.id) {
    add({
      client_id: dashboardClient.id,
      name: dashboardClient.name
    });
  }
  if (activeClientId) {
    add({
      client_id: activeClientId,
      name: dashboardClient?.name || null
    });
  }
  return list;
}

export default function ClientPortalLayout() {
  const {
    user,
    impersonating,
    handleLogout,
    patchUser
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.layout;
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [siteFilter, setSiteFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);

  const reloadPortal = async () => {
    const dashboard = await fetchPortalDashboard();
    let companyPayload = {
      companies: [],
      activeClientId: dashboard?.client?.id ?? null
    };
    try {
      companyPayload = await fetchPortalCompanies();
    } catch (err) {
      console.error("fetchPortalCompanies", err);
    }
    setData(dashboard);
    setCompanies(Array.isArray(companyPayload?.companies) ? companyPayload.companies : []);
    setActiveClientId(companyPayload?.activeClientId ?? dashboard?.client?.id ?? null);
  };

  useEffect(() => {
    reloadPortal().catch(() => showError(t.loadError)).finally(() => setLoading(false));
  }, []);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(companies, data?.client, activeClientId),
    [companies, data?.client, activeClientId]
  );
  const sites = useMemo(() => getPortalSites(data), [data]);

  useEffect(() => {
    const clientId = data?.client?.id;
    if (!clientId) {
      setSiteFilter(null);
      return;
    }
    const stored = readStoredPortalSite(clientId);
    const valid = stored && sites.some(site => getSiteLocationValue(site) === stored);
    setSiteFilter(valid ? stored : null);
  }, [data?.client?.id, sites]);

  const handleSiteFilterChange = nextSite => {
    const resolved = nextSite || null;
    setSiteFilter(resolved);
    writeStoredPortalSite(data?.client?.id || activeClientId, resolved);
  };

  const scopedDashboard = useMemo(
    () => filterPortalDashboardBySite(data, siteFilter),
    [data, siteFilter]
  );

  if (loading && !data) {
    return <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>;
  }

  const client = data?.client;
  const stats = scopedDashboard?.stats || data?.stats || {
    totalEquipment: 0,
    activeEquipment: 0,
    openTickets: 0
  };
  const actionRequiredCount = stats.actionRequiredCount ?? stats.pendingValidationCount ?? 0;
  const portalScopeKey = String(data?.client?.id || activeClientId || "");

  const handleSwitchCompany = async nextClientId => {
    if (!nextClientId || String(nextClientId) === String(activeClientId)) return;
    setSwitching(true);
    try {
      const result = await switchPortalCompany(nextClientId);
      patchUser?.({
        client_id: result.client_id
      });
      setCompanies(Array.isArray(result.companies) ? result.companies : companies);
      setActiveClientId(result.client_id);
      setSiteFilter(null);
      await reloadPortal();
      toast.success(t.switchCompanySuccess || "Entreprise changée");
    } catch (err) {
      toast.error(err.message || t.switchCompanyError || "Impossible de changer d'entreprise");
    } finally {
      setSwitching(false);
    }
  };

  const handleStopImpersonation = async () => {
    setStoppingImpersonation(true);
    try {
      await stopPortalImpersonation();
      try {
        sessionStorage.removeItem("veritas_impersonation_return");
      } catch {}
      toast.success(t.stopImpersonationSuccess);
      window.location.href = "/";
    } catch (err) {
      toast.error(err.message || t.stopImpersonationError);
    } finally {
      setStoppingImpersonation(false);
    }
  };

  return <div className={styles.layout}>
      <ClientPortalSidebar
        copy={copy}
        user={user}
        clientName={client?.name}
        companies={companyOptions}
        activeClientId={activeClientId || client?.id}
        sites={sites}
        siteFilter={siteFilter}
        onSwitchSite={handleSiteFilterChange}
        switching={switching}
        onSwitchCompany={handleSwitchCompany}
        actionRequiredCount={actionRequiredCount}
        onLogout={handleLogout}
      />

      <div className={styles.main}>
        {impersonating ? <div className={styles.impersonationBanner} role="status">
            <div className={styles.impersonationBannerText}>
              <Icon icon="mdi:incognito" aria-hidden />
              <span>
                {t.impersonationPrefix}{" "}
                <strong>{user?.username || user?.email || t.impersonationFallback}</strong>
              </span>
            </div>
            <button type="button" className={styles.impersonationBannerBtn} onClick={handleStopImpersonation} disabled={stoppingImpersonation}>
              <Icon icon="mdi:exit-run" aria-hidden />
              {t.stopImpersonation}
            </button>
          </div> : null}
        <div className={styles.mainScroll}>
          {switching ? <div className={styles.loadingInline}>
              <span className={styles.spinner} />
              <span>{t.switchingCompany || copy.common.loading}</span>
            </div> : <Outlet key={portalScopeKey} context={{
          dashboard: data,
          scopedDashboard,
          companies: companyOptions,
          sites,
          siteFilter,
          setSiteFilter: handleSiteFilterChange,
          activeClientId: activeClientId || client?.id,
          reloadPortal
        }} />}
        </div>
      </div>
    </div>;
}
