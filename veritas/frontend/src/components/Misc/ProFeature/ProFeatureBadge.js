import { useMemo } from "react";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getEditionBadgesCopy } from "./editionBadgesI18n";
import styles from "./ProFeatureBadge.module.css";
export default function ProFeatureBadge({
  variant = "default",
  className = ""
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEditionBadgesCopy(locale), [locale]);
  return <span className={`${styles.badge} ${variant === "inline" ? styles.inline : ""} ${className}`.trim()} data-pro-badge-root aria-hidden="true">
      {copy.pro}
    </span>;
}
