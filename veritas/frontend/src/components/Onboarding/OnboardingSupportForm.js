import { getTimezoneOptions } from "../../i18n/timezoneOptions";
import styles from "./OnboardingWizard.module.css";
export default function OnboardingSupportForm({
  labels,
  general,
  onChange,
  disabled
}) {
  const {
    groups: timezoneGroups
  } = getTimezoneOptions(general.app_timezone);
  return <form className={styles.inlineForm} onSubmit={e => e.preventDefault()}>
      <div className={styles.inlineFormRow}>
        <div className={styles.inlineFormField}>
          <label className={styles.inlineFormLabel} htmlFor="onboarding-org-email">
            {labels.supportEmail}
          </label>
          <input id="onboarding-org-email" type="email" className={styles.inlineFormInput} value={general.app_support_email} onChange={e => onChange({
          app_support_email: e.target.value
        })} placeholder={labels.supportEmailPlaceholder} disabled={disabled} />
        </div>

        <div className={styles.inlineFormField}>
          <label className={styles.inlineFormLabel} htmlFor="onboarding-org-phone">
            {labels.supportPhone}
          </label>
          <input id="onboarding-org-phone" type="tel" className={styles.inlineFormInput} value={general.app_support_phone} onChange={e => onChange({
          app_support_phone: e.target.value
        })} placeholder={labels.supportPhonePlaceholder} maxLength={40} disabled={disabled} />
        </div>
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-org-timezone">
          {labels.timezone}
        </label>
        <select id="onboarding-org-timezone" className={styles.inlineFormSelect} value={general.app_timezone} onChange={e => onChange({
        app_timezone: e.target.value
      })} disabled={disabled}>
          {timezoneGroups.map(group => <optgroup key={group.offsetLabel} label={group.offsetLabel}>
              {group.options.map(({
            value,
            label
          }) => <option key={value} value={value}>
                  {label}
                </option>)}
            </optgroup>)}
        </select>
      </div>
    </form>;
}
