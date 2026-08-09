import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { stopUserImpersonation } from "../../../api/users";
import { getAdminUsersCopy } from "../../AdminPage/adminUsersI18n";
import styles from "./AgentImpersonationBanner.module.css";

const BANNER_HEIGHT_PX = 40;

/**
 * Sticky banner while a Super Admin is impersonating another agent.
 * Hidden for client-portal impersonation (handled in ClientPortalLayout).
 */
export default function AgentImpersonationBanner() {
  const navigate = useNavigate();
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminUsersCopy(locale).impersonation, [locale]);
  const {
    user,
    userRole,
    impersonating,
    refreshSession
  } = useAuthContext();
  const [stopping, setStopping] = useState(false);

  const isAgentImpersonation = Boolean(impersonating && String(userRole || "").toLowerCase() !== "client");

  useEffect(() => {
    const root = document.documentElement;
    if (isAgentImpersonation) {
      root.dataset.agentImpersonation = "1";
      // Reuse the profile-preview offset so sidebar / content shift correctly.
      root.style.setProperty("--profile-preview-banner-height", `${BANNER_HEIGHT_PX}px`);
    } else if (!root.dataset.profilePreview) {
      delete root.dataset.agentImpersonation;
      root.style.removeProperty("--profile-preview-banner-height");
    } else {
      delete root.dataset.agentImpersonation;
    }
    return () => {
      delete root.dataset.agentImpersonation;
      if (!root.dataset.profilePreview) {
        root.style.removeProperty("--profile-preview-banner-height");
      }
    };
  }, [isAgentImpersonation]);

  if (!isAgentImpersonation) return null;

  const label = user?.username || user?.email || copy.fallback;

  const handleStop = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      await stopUserImpersonation();
      await refreshSession();
      try {
        sessionStorage.setItem("veritas_admin_nav", JSON.stringify({
          tab: "users"
        }));
      } catch {}
      // In-app navigation keeps the SPA shell (full reload to /admin/users can yield a blank page).
      navigate("/admin/users", {
        replace: true
      });
      window.dispatchEvent(new Event("refreshProfileAccess"));
      if (typeof window.refreshProfile === "function") {
        window.refreshProfile();
      }
      toast.success(copy.stopped);
    } catch (err) {
      toast.error(err?.message || copy.stopError);
      setStopping(false);
    }
  };

  return <div className={styles.banner} role="status" style={{
    height: BANNER_HEIGHT_PX
  }}>
      <div className={styles.text}>
        <Icon icon="mdi:account-switch-outline" className={styles.icon} aria-hidden />
        <span>
          {copy.bannerPrefix}{" "}
          <strong>{label}</strong>
        </span>
      </div>
      <button type="button" className={styles.exitBtn} onClick={handleStop} disabled={stopping}>
        <Icon icon="mdi:close" aria-hidden />
        {stopping ? copy.stopping : copy.stop}
      </button>
    </div>;
}
