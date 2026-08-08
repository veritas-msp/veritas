import { useRef, useState } from "react";
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
  keyHint,
  onOfflineFile,
  offlineImporting = false,
}) {
  const fileRef = useRef(null);
  const [picking, setPicking] = useState(false);

  if (alreadyActive) {
    return (
      <div className={styles.licenseActiveBanner}>
        <Icon icon="mdi:check-decagram" className={styles.licenseActiveIcon} aria-hidden />
        <p>{labels.alreadyActive}</p>
      </div>
    );
  }

  const busy = disabled || offlineImporting || picking;

  return (
    <form className={styles.inlineForm} onSubmit={(e) => e.preventDefault()}>
      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-license-key">
          {labels.keyLabel}
        </label>
        <input
          id="onboarding-license-key"
          type="text"
          className={styles.inlineFormInput}
          value={licenseKey}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={labels.keyPlaceholder}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        <p className={styles.inlineFormHint}>{keyHint || labels.keyHint}</p>
      </div>

      {typeof onOfflineFile === "function" ? (
        <div className={styles.licenseOfflineBlock}>
          <p className={styles.inlineFormHint}>{labels.offlineImportHint}</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setPicking(true);
              try {
                await onOfflineFile(file);
              } finally {
                setPicking(false);
              }
            }}
          />
          <button
            type="button"
            className={styles.licenseOfflineBtn}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Icon icon="mdi:file-download-outline" aria-hidden />
            {offlineImporting || picking ? labels.offlineImporting : labels.offlineImport}
          </button>
        </div>
      ) : null}

      <div className={styles.licenseLinks}>
        <a className={styles.licenseLink} href={COMMERCIAL_LINKS.pricing} target="_blank" rel="noopener noreferrer">
          <Icon icon="mdi:tag-outline" aria-hidden />
          {labels.pricingLink}
        </a>
        <a
          className={styles.licenseLink}
          href={COMMERCIAL_LINKS.accountRecover}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon icon="mdi:key-outline" aria-hidden />
          {labels.recoverLink}
        </a>
      </div>
    </form>
  );
}
