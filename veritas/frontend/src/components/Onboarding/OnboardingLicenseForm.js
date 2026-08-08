import { Icon } from "@iconify/react";
import { getVeritasCommercialLinks } from "../../config/commercial";
import styles from "./OnboardingWizard.module.css";
const COMMERCIAL_LINKS = getVeritasCommercialLinks();
export default function OnboardingLicenseForm({
  labels,
  licenseKey,
  onChange,
  disabled,
  alreadyActive,
  keyHint
}) {
  if (alreadyActive) {
    return <div className={styles.licenseActiveBanner}>
        <Icon icon="mdi:check-decagram" className={styles.licenseActiveIcon} aria-hidden />
        <p>{labels.alreadyActive}</p>
      </div>;
  }
  return <form className={styles.inlineForm} onSubmit={e => e.preventDefault()}>
      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-license-key">
          {labels.keyLabel}
        </label>
        <input id="onboarding-license-key" type="text" className={styles.inlineFormInput} value={licenseKey} onChange={e => onChange(e.target.value.toUpperCase())} placeholder={labels.keyPlaceholder} autoComplete="off" spellCheck={false} disabled={disabled} />
        <p className={styles.inlineFormHint}>{keyHint || labels.keyHint}</p>
      </div>

      <div className={styles.licenseLinks}>
        <a className={styles.licenseLink} href={COMMERCIAL_LINKS.pricing} target="_blank" rel="noopener noreferrer">
          <Icon icon="mdi:tag-outline" aria-hidden />
          {labels.pricingLink}
        </a>
        <a className={styles.licenseLink} href={COMMERCIAL_LINKS.accountRecover} target="_blank" rel="noopener noreferrer">
          <Icon icon="mdi:key-outline" aria-hidden />
          {labels.recoverLink}
        </a>
      </div>
    </form>;
}
