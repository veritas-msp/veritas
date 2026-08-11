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
import styles from "./ClientDashboard.module.css";

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
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);

  const reloadPortal = async () => {
    const [dashboard, companyPayload] = await Promise.all([
      fetchPortalDashboard(),
      fetchPortalCompanies().catch(() => ({ companies: [], activeClientId: null }))
    ]);
    setData(dashboard);
    setCompanies(Array.isArray(companyPayload?.companies) ? companyPayload.companies : []);
    setActiveClientId(companyPayload?.activeClientId ?? dashboard?.client?.id ?? null);
  };

  useEffect(() => {
    reloadPortal().catch(() => showError(t.loadError)).finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>;
  }

  const client = data?.client;
  const stats = data?.stats || {
    totalEquipment: 0,
    activeEquipment: 0,
    openTickets: 0
  };
  const actionRequiredCount = stats.actionRequiredCount ?? stats.pendingValidationCount ?? 0;

  const handleSwitchCompany = async nextClientId => {
    if (!nextClientId || String(nextClientId) === String(activeClientId)) return;
    setSwitching(true);
    try {
      const result = await switchPortalCompany(nextClientId);
      patchUser?.({
        client_id: result.client_id
      });
      setActiveClientId(result.client_id);
      setCompanies(Array.isArray(result.companies) ? result.companies : companies);
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
      <ClientPortalSidebar copy={copy} user={user} clientName={client?.name} actionRequiredCount={actionRequiredCount} onLogout={handleLogout} />

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
        {companies.length > 1 ? <div className={styles.companySwitcherBar}>
            <label className={styles.companySwitcherLabel} htmlFor="portal-company-switch">
              <Icon icon="mdi:office-building-outline" aria-hidden />
              {t.switchCompanyLabel || "Entreprise"}
            </label>
            <select id="portal-company-switch" className={styles.companySwitcherSelect} value={String(activeClientId || "")} disabled={switching} onChange={e => handleSwitchCompany(e.target.value)}>
              {companies.map(company => <option key={company.client_id || company.id} value={String(company.client_id || company.id)}>
                  {company.name || `Entreprise #${company.client_id || company.id}`}
                </option>)}
            </select>
          </div> : null}
        <div className={styles.mainScroll}>
          <Outlet context={{
          dashboard: data,
          companies,
          activeClientId,
          reloadPortal
        }} />
        </div>
      </div>
    </div>;
}
