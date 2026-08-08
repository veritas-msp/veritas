import { useMemo } from "react";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getEditionBadgesCopy } from "./editionBadgesI18n";
import styles from "./CommunityFeatureBadge.module.css";
export default function CommunityFeatureBadge({
  variant = "default",
  className = ""
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEditionBadgesCopy(locale), [locale]);
  return <span className={`${styles.badge} ${variant === "inline" ? styles.inline : ""} ${className}`.trim()} data-community-badge-root aria-hidden="true">
      {copy.community}
    </span>;
}
