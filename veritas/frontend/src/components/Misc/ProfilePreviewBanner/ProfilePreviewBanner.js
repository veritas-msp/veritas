import { useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { usePermissions } from "../../../contexts/PermissionsContext";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getLocalizedProfileName, getAdminPermissionsCopy } from "../../AdminPage/adminPermissionsI18n";
import styles from "./ProfilePreviewBanner.module.css";

const BANNER_HEIGHT_PX = 40;

/**
 * Sticky banner while an admin previews the UI as another profile.
 */
export default function ProfilePreviewBanner({
  onReturnToPermissions
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminPermissionsCopy(locale), [locale]);
  const {
    isPreviewing,
    previewProfile,
    previewLoading,
    stopProfilePreview
  } = usePermissions();

  useEffect(() => {
    const root = document.documentElement;
    if (isPreviewing && previewProfile) {
      root.dataset.profilePreview = "1";
      root.style.setProperty("--profile-preview-banner-height", `${BANNER_HEIGHT_PX}px`);
    } else {
      delete root.dataset.profilePreview;
      root.style.removeProperty("--profile-preview-banner-height");
    }
    return () => {
      delete root.dataset.profilePreview;
      root.style.removeProperty("--profile-preview-banner-height");
    };
  }, [isPreviewing, previewProfile]);

  if (!isPreviewing || !previewProfile) return null;

  const label = getLocalizedProfileName(previewProfile, copy) || previewProfile;

  return <div className={styles.banner} role="status" style={{
    height: BANNER_HEIGHT_PX
  }}>
      <div className={styles.text}>
        <Icon icon="mdi:eye-outline" className={styles.icon} aria-hidden />
        <span>
          {copy.previewBannerPrefix}{" "}
          <strong>{label}</strong>
          {previewLoading ? ` — ${copy.previewLoading}` : null}
        </span>
      </div>
      <div className={styles.actions}>
        {typeof onReturnToPermissions === "function" ? <button type="button" className={styles.returnBtn} onClick={onReturnToPermissions} title={copy.previewReturnTitle} aria-label={copy.previewReturnTitle}>
            <Icon icon="mdi:shield-key-outline" aria-hidden />
            {copy.previewReturn}
          </button> : null}
        <button type="button" className={styles.exitBtn} onClick={stopProfilePreview}>
          <Icon icon="mdi:close" aria-hidden />
          {copy.previewExit}
        </button>
      </div>
    </div>;
}
