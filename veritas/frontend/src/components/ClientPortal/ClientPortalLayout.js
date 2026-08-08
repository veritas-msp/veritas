import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalDashboard } from "../../api/clientPortalTickets";
import { stopPortalImpersonation } from "../../api/contactPortal";
import { showError } from "../../utils/toast";
import ClientPortalSidebar from "./ClientPortalSidebar";
import { getClientPortalCopy } from "./clientPortalI18n";
import styles from "./ClientDashboard.module.css";
export default function ClientPortalLayout() {
  const {
    user,
    impersonating,
    handleLogout
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.layout;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);
  useEffect(() => {
    fetchPortalDashboard().then(setData).catch(() => showError(t.loadError)).finally(() => setLoading(false));
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
        <div className={styles.mainScroll}>
          <Outlet context={{
          dashboard: data
        }} />
        </div>
      </div>
    </div>;
}
