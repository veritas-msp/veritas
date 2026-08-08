import { useEffect, useMemo, useState } from "react";
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
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminUsersCopy(locale).impersonation, [locale]);
  const {
    user,
    userRole,
    impersonating
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
      window.location.href = "/admin/users";
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
