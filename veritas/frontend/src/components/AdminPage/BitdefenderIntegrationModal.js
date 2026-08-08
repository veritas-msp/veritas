import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { testGlobalBitdefenderIntegration } from "../../api/bitdefenderIntegration";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatCountLabel, getBitdefenderIntegrationModalCopy, interpolate } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
const DEFAULT_API_URL = "https://cloudgz.gravityzone.bitdefender.com/api";
const GRAVITYZONE_ACCOUNT_URL = "https://cloudgz.gravityzone.bitdefender.com/#!/my-account";
const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};
function formatTestDate(iso, locale) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-US");
  } catch {
    return iso;
  }
}
function BitdefenderTestResultModal({
  result,
  error,
  onClose,
  copy,
  locale
}) {
  const tenant = result?.tenant;
  const isSuccess = Boolean(result?.success && tenant);
  const errorMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  const errorDetails = (typeof error === "object" ? error?.details : null) || result?.details || null;
  const [activeSection, setActiveSection] = useState("summary");
  const navSections = useMemo(() => {
    const items = [{
      id: "summary",
      label: copy.summary,
      description: copy.summaryDesc,
      icon: "mdi:chart-box-outline"
    }];
    if (isSuccess && tenant?.companies?.length) {
      items.push({
        id: "companies",
        label: copy.companies,
        description: formatCountLabel(locale, tenant.companies.length, "companySingular", "companyPlural"),
        icon: "mdi:office-building-outline"
      });
    }
    if (isSuccess && tenant?.accounts?.length) {
      items.push({
        id: "accounts",
        label: copy.accounts,
        description: formatCountLabel(locale, tenant.accounts.length, "accountSingular", "accountPlural"),
        icon: "mdi:account-group-outline"
      });
    }
    return items;
  }, [isSuccess, tenant, copy, locale]);
  useEffect(() => {
    setActiveSection("summary");
  }, [result, error]);
  const renderSummary = () => <>
      <div className={`${styles.resultNotice} ${isSuccess ? styles.resultNoticeSuccess : styles.resultNoticeError}`}>
        <Icon icon={isSuccess ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} className={styles.resultNoticeIcon} aria-hidden />
        <div>
          <strong>{isSuccess ? copy.connectionSuccess : copy.connectionFailed}</strong>
          <p>
            {isSuccess ? result.message || copy.testApiSuccess : errorMessage || copy.apiUnreachable}
          </p>
          {errorDetails ? <pre className={styles.errorDetails}>{errorDetails}</pre> : null}
        </div>
      </div>

      {isSuccess ? <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{tenant.companiesCount ?? 0}</div>
              <div className={styles.kpiLabel}>{copy.companies}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{tenant.accountsCount ?? 0}</div>
              <div className={styles.kpiLabel}>{copy.accounts}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                {tenant.license?.used != null && tenant.license?.total != null ? `${tenant.license.used}/${tenant.license.total}` : "-"}
              </div>
              <div className={styles.kpiLabel}>{copy.licensesFirstCompany}</div>
            </div>
          </div>

          <div className={formStyles.sectionHead}>
            <h3 className={formStyles.sectionTitle}>{copy.connectionDetails}</h3>
          </div>
          <dl className={styles.metaList}>
            <div className={styles.metaRow}>
              <dt>{copy.apiUrl}</dt>
              <dd className={styles.mono}>{tenant.apiUrl}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{copy.apiKey}</dt>
              <dd className={styles.mono}>{tenant.apiKeyPreview}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>{copy.testedAt}</dt>
              <dd>{formatTestDate(tenant.testedAt, locale)}</dd>
            </div>
            {tenant.license?.companyName ? <div className={styles.metaRow}>
                <dt>{copy.licenseLabel} · {tenant.license.companyName}</dt>
                <dd>
                  {tenant.license.expirationDate ? interpolate(copy.licenseExpiration, {
              date: formatTestDate(tenant.license.expirationDate, locale)
            }) : copy.partialDetails}
                </dd>
              </div> : null}
          </dl>
        </> : null}
    </>;
  const renderCompanies = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>
          {interpolate(copy.companiesDetected, {
          count: tenant.companies.length
        })}
        </h3>
        <p className={formStyles.sectionDesc}>{copy.companiesDetectedDesc}</p>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>{copy.name}</th>
              <th>{copy.identifier}</th>
              <th>{copy.country}</th>
            </tr>
          </thead>
          <tbody>
            {tenant.companies.map(company => <tr key={company.id}>
                <td>{company.name || "-"}</td>
                <td className={styles.mono}>{company.id}</td>
                <td>{company.country || "-"}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </>;
  const renderAccounts = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>
          {copy.accounts} ({tenant.accounts.length}
          {tenant.accountsCount > tenant.accounts.length ? interpolate(copy.on, {
          count: tenant.accountsCount
        }) : ""}
          )
        </h3>
        <p className={formStyles.sectionDesc}>{copy.accountsDesc}</p>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>{copy.email}</th>
              <th>{copy.company}</th>
              <th>{copy.role}</th>
            </tr>
          </thead>
          <tbody>
            {tenant.accounts.map((account, index) => <tr key={`${account.email || "acc"}-${index}`}>
                <td>{account.email || "-"}</td>
                <td>{account.companyName || account.companyId || "-"}</td>
                <td>{account.role || "-"}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </>;
  const renderContent = () => {
    if (activeSection === "companies" && isSuccess) return renderCompanies();
    if (activeSection === "accounts" && isSuccess) return renderAccounts();
    return renderSummary();
  };
  return createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="bitdefender-test-result-title">
        <div className={`${formStyles.accentBar} ${styles.accentBarBitdefender}`} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${styles.headerIconBitdefender}`} aria-hidden>
              <Icon icon="simple-icons:bitdefender" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="bitdefender-test-result-title">
                {copy.testResultTitle}
              </h2>
              <p className={formStyles.subtitle}>
                {isSuccess ? copy.testSubtitleSuccess : copy.testSubtitleFail}
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label={copy.testNavAria}>
            {navSections.map(section => <button key={section.id} type="button" className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                <span className={formStyles.navItemText}>
                  <span className={formStyles.navItemLabel}>{section.label}</span>
                  <span className={formStyles.navItemHint}>{section.description}</span>
                </span>
              </button>)}
          </nav>

          <div className={formStyles.content}>{renderContent()}</div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {isSuccess ? copy.testSuccessShort : copy.checkUrlAndKey}
          </span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.primaryBtn} onClick={onClose}>
              {copy.close}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
export default function BitdefenderIntegrationModal({
  open,
  enabled,
  apiUrl,
  apiKey,
  onEnabledChange,
  onApiUrlChange,
  onApiKeyChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getBitdefenderIntegrationModalCopy(locale), [locale]);
  const sections = useMemo(() => ["connection", "guide", "info"].map(id => ({
    id,
    label: copy.sections[id].label,
    description: copy.sections[id].description,
    icon: SECTION_ICONS[id]
  })), [copy]);
  const [activeSection, setActiveSection] = useState("connection");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  useEffect(() => {
    if (open) {
      setActiveSection("connection");
      setTestResult(null);
      setTestError(null);
      setShowTestModal(false);
    }
  }, [open]);
  const handleTest = async () => {
    const url = (apiUrl || "").trim() || DEFAULT_API_URL;
    const key = (apiKey || "").trim();
    if (!key) {
      showError(copy.fillApiKeyBeforeTest);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await testGlobalBitdefenderIntegration({
        apiUrl: url,
        apiKey: key
      });
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestError({
        message: err.message,
        details: err.details || null
      });
      setTestResult({
        success: false,
        error: err.message,
        details: err.details
      });
      setShowTestModal(true);
    } finally {
      setTesting(false);
    }
  };
  const renderConnection = () => <>
      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>
          {enabled ? copy.integrationActive : copy.integrationInactive}
        </span>
        <label className={formStyles.switchWrap}>
          <input type="checkbox" className={formStyles.switchInput} checked={enabled} onChange={e => onEnabledChange(e.target.checked)} disabled={saving || testing} />
          <span className={formStyles.switchTrack} aria-hidden>
            <span className={formStyles.switchThumb} />
          </span>
        </label>
      </div>

      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.apiCredentials}</h3>
        <p className={formStyles.sectionDesc}>{copy.connectionDesc}</p>
      </div>

      <div className={formStyles.fieldStack}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="bd-api-url">
            {copy.apiUrl}
          </label>
          <input id="bd-api-url" type="url" className={formStyles.input} value={apiUrl || ""} placeholder={DEFAULT_API_URL} onChange={e => onApiUrlChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="bd-api-key">
            {copy.apiKey}
          </label>
          <input id="bd-api-key" type="password" className={formStyles.input} value={apiKey || ""} onChange={e => onApiKeyChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToGetCredentials}
          </button>
        </div>
      </div>
    </>;
  const renderGuide = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.guideTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.guideDesc}</p>
      </div>

      <ol className={styles.guideSteps}>
        {copy.guideSteps.map((step, index) => <li key={step.title} className={styles.guideStep}>
            <span className={styles.guideStepNum} aria-hidden>
              {index + 1}
            </span>
            <div className={styles.guideStepBody}>
              <p className={styles.guideStepTitle}>{step.title}</p>
              <p className={styles.guideStepDesc}>
                {index === 0 ? <>
                    {step.desc.split("cloudgz.gravityzone.bitdefender.com")[0]}
                    <a href={GRAVITYZONE_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                      cloudgz.gravityzone.bitdefender.com
                      <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
                    </a>
                    {step.desc.split("cloudgz.gravityzone.bitdefender.com")[1] || ""}
                  </> : index === 3 ? <>
                    {step.desc.split(DEFAULT_API_URL)[0]}
                    <code className={styles.guideCode}>{DEFAULT_API_URL}</code>
                    {step.desc.split(DEFAULT_API_URL)[1] || ""}
                  </> : step.desc}
              </p>
            </div>
          </li>)}
      </ol>
    </>;
  const renderInfo = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.infoTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.infoDesc}</p>
      </div>

      <div className={formStyles.field}>
        <p className={formStyles.sectionDesc}>
          <strong>{copy.infoApisTitle}</strong>
        </p>
        <ul className={styles.apiList}>
          {copy.infoApis.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className={formStyles.field}>
        <p className={formStyles.sectionDesc}>{copy.infoFooter}</p>
      </div>
    </>;
  if (!open) return null;
  return createPortal(<>
      <div className={formStyles.overlay} onClick={saving || testing ? undefined : onClose} role="presentation">
        <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="bitdefender-integration-modal-title">
          <div className={`${formStyles.accentBar} ${styles.accentBarBitdefender}`} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={`${formStyles.headerIconWrap} ${styles.headerIconBitdefender}`} aria-hidden>
                <Icon icon="simple-icons:bitdefender" />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="bitdefender-integration-modal-title">
                  {copy.title}
                </h2>
                <p className={formStyles.subtitle}>{copy.subtitle}</p>
              </div>
            </div>
            <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving || testing} aria-label={copy.closeAria}>
              <FaTimes />
            </button>
          </header>

          <div className={formStyles.body}>
            <nav className={formStyles.nav} aria-label={copy.configNavAria}>
              {sections.map(section => <button key={section.id} type="button" className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                  <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                  <span className={formStyles.navItemText}>
                    <span className={formStyles.navItemLabel}>{section.label}</span>
                    <span className={formStyles.navItemHint}>{section.description}</span>
                  </span>
                </button>)}
            </nav>

            <div className={formStyles.content}>
              {activeSection === "guide" ? renderGuide() : activeSection === "info" ? renderInfo() : renderConnection()}
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>
              {enabled ? copy.footerActive : copy.footerInactive}
            </span>
            <div className={formStyles.footerActions}>
              <button type="button" className={formStyles.ghostBtn} onClick={handleTest} disabled={saving || testing}>
                <Icon icon={testing ? "mdi:loading" : "mdi:connection"} className={testing ? formStyles.spinning : ""} aria-hidden />
                {testing ? copy.testing : copy.testConnection}
              </button>
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving || testing}>
                {copy.cancel}
              </button>
              <button type="button" className={formStyles.primaryBtn} onClick={onSave} disabled={saving || testing}>
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {showTestModal ? <BitdefenderTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} locale={locale} /> : null}
    </>, document.getElementById("modal-root") || document.body);
}
