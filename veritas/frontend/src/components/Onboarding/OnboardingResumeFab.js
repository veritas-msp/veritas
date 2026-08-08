import { Icon } from "@iconify/react";
import { useMemo } from "react";
import { getOnboardingUiStrings } from "./onboardingTranslations";
import { useOnboardingLocale } from "../../hooks/useOnboardingLocale";
import styles from "./OnboardingResumeFab.module.css";
export default function OnboardingResumeFab({
  onClick
}) {
  const locale = useOnboardingLocale();
  const ui = useMemo(() => getOnboardingUiStrings(locale), [locale]);
  return <button type="button" className={styles.fab} onClick={onClick} aria-label={ui.resumeFabAria}>
      <Icon icon="mdi:map-marker-path" className={styles.icon} aria-hidden />
      <span>{ui.resumeFab}</span>
    </button>;
}
