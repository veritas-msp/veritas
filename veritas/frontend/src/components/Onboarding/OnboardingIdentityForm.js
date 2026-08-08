import styles from "./OnboardingWizard.module.css";
export default function OnboardingIdentityForm({
  labels,
  general,
  employeeRangeOptions = [],
  onChange,
  disabled
}) {
  return <form className={styles.inlineForm} onSubmit={e => e.preventDefault()}>
      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-org-name">
          {labels.organizationName}
        </label>
        <input id="onboarding-org-name" type="text" className={styles.inlineFormInput} value={general.app_organization_name} onChange={e => onChange({
        app_organization_name: e.target.value
      })} placeholder={labels.organizationNamePlaceholder} maxLength={120} disabled={disabled} />
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-org-size">
          {labels.employeeRange}
        </label>
        <select id="onboarding-org-size" className={styles.inlineFormSelect} value={general.app_organization_employee_range || ""} onChange={e => onChange({
        app_organization_employee_range: e.target.value
      })} disabled={disabled}>
          <option value="">{labels.employeeRangePlaceholder}</option>
          {employeeRangeOptions.map(({
          value,
          label
        }) => <option key={value} value={value}>
              {label}
            </option>)}
        </select>
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-org-address">
          {labels.address}
        </label>
        <input id="onboarding-org-address" type="text" className={styles.inlineFormInput} value={general.app_organization_address} onChange={e => onChange({
        app_organization_address: e.target.value
      })} placeholder={labels.addressPlaceholder} maxLength={300} disabled={disabled} />
      </div>

      <div className={styles.inlineFormField}>
        <label className={styles.inlineFormLabel} htmlFor="onboarding-org-website">
          {labels.website}
        </label>
        <input id="onboarding-org-website" type="url" className={styles.inlineFormInput} value={general.app_organization_website} onChange={e => onChange({
        app_organization_website: e.target.value
      })} placeholder={labels.websitePlaceholder} maxLength={200} disabled={disabled} />
      </div>
    </form>;
}
