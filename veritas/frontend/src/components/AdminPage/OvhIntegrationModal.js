import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { testOvhConnection } from "../../api/clientOvh";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getOvhIntegrationModalCopy } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
import ovhStyles from "./OvhIntegrationModal.module.css";
import OvhApiGuide, { OVH_TOKEN_URL_ALL, OVH_TOKEN_URL_DOMAIN } from "../EnterprisesPage/integrationGuides/OvhApiGuide";
const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};
function normalizeOvhTestError(errorMessage, errorDetails, permissionPattern) {
  const message = (errorMessage || "").trim();
  const details = (errorDetails || "").trim();
  if (!details || details === message) {
    return {
      message,
      details: null,
      isPermissionError: permissionPattern.test(message)
    };
  }
  if (message && details.startsWith(message)) {
    const remainder = details.slice(message.length).trim();
    return {
      message,
      details: remainder || null,
      isPermissionError: permissionPattern.test(message + remainder)
    };
  }
  return {
    message,
    details,
    isPermissionError: permissionPattern.test(`${message} ${details}`)
  };
}
function OvhPermissionHelp({
  copy
}) {
  return <div className={ovhStyles.permissionHelp}>
      <p className={ovhStyles.permissionHelpTitle}>{copy.permissionTitle}</p>
      <ul className={ovhStyles.permissionHelpList}>
        <li>
          <strong>{copy.permissionRecommended}</strong>{" "}
          <a href={OVH_TOKEN_URL_DOMAIN} target="_blank" rel="noopener noreferrer">
            GET /domain/*
          </a>
        </li>
        <li>
          <strong>{copy.permissionAlternative}</strong>{" "}
          <a href={OVH_TOKEN_URL_ALL} target="_blank" rel="noopener noreferrer">
            {copy.permissionAllGet}
          </a>
        </li>
      </ul>
      <p style={{
      margin: "0.65rem 0 0"
    }}>{copy.permissionValidate}</p>
    </div>;
}
function OvhTestResultModal({
  result,
  error,
  onClose,
  copy
}) {
  const tenant = result?.tenant;
  const isSuccess = Boolean(result?.success && tenant);
  const rawMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  const rawDetails = (typeof error === "object" ? error?.details : null) || result?.details || null;
  const {
    message: errorMessage,
    details: errorDetails,
    isPermissionError
  } = normalizeOvhTestError(rawMessage, rawDetails, copy.permissionInsufficient);
  return createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`${formStyles.accentBar} ${ovhStyles.accentBarOvh}`} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${ovhStyles.headerIconOvh}`} aria-hidden>
              <Icon icon="simple-icons:ovh" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title}>{copy.testResultTitle}</h2>
              <p className={formStyles.subtitle}>
                {isSuccess ? copy.testSubtitleSuccess : copy.testSubtitleFail}
              </p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={ovhStyles.testResultBody}>
          <div className={ovhStyles.testResultContent}>
            <div className={`${styles.resultNotice} ${ovhStyles.testResultNotice} ${isSuccess ? styles.resultNoticeSuccess : styles.resultNoticeError}`}>
              <Icon icon={isSuccess ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} className={styles.resultNoticeIcon} aria-hidden />
              <div className={ovhStyles.testResultNoticeBody}>
                <strong>{isSuccess ? copy.connectionSuccess : copy.connectionFailed}</strong>
                <p>
                  {isSuccess ? result.message || copy.testApiSuccess : errorMessage || copy.apiUnreachable}
                </p>
                {!isSuccess && isPermissionError ? <OvhPermissionHelp copy={copy} /> : null}
                {errorDetails && !isPermissionError ? <div className={ovhStyles.errorDetailsCompact}>{errorDetails}</div> : null}
              </div>
            </div>

            {isSuccess && tenant ? <>
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{tenant.domainsCount ?? 0}</div>
                    <div className={styles.kpiLabel}>{copy.domains}</div>
                  </div>
                </div>
                {tenant.domains?.length ? <div className={styles.tableScroll}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{copy.domainName}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.domains.map(domain => <tr key={domain}>
                            <td>{domain}</td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div> : null}
              </> : null}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {isSuccess ? copy.testFooterSuccess : copy.testFooterFail}
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
export default function OvhIntegrationModal({
  open,
  enabled,
  applicationKey,
  applicationSecret,
  consumerKey,
  onEnabledChange,
  onApplicationKeyChange,
  onApplicationSecretChange,
  onConsumerKeyChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getOvhIntegrationModalCopy(locale), [locale]);
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
    const key = (applicationKey || "").trim();
    const secret = (applicationSecret || "").trim();
    const consumer = (consumerKey || "").trim();
    if (!key || !secret || !consumer) {
      showError(copy.fillKeysBeforeTest);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await testOvhConnection({
        applicationKey: key,
        applicationSecret: secret,
        consumerKey: consumer
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
        <h3 className={formStyles.sectionTitle}>{copy.connectionTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.connectionDesc}</p>
      </div>

      <div className={formStyles.fieldStack}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ovh-application-key">
            Application Key
          </label>
          <input id="ovh-application-key" type="text" className={formStyles.input} value={applicationKey || ""} onChange={e => onApplicationKeyChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ovh-application-secret">
            Application Secret
          </label>
          <input id="ovh-application-secret" type="password" className={formStyles.input} value={applicationSecret || ""} onChange={e => onApplicationSecretChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ovh-consumer-key">
            Consumer Key
          </label>
          <input id="ovh-consumer-key" type="password" className={formStyles.input} value={consumerKey || ""} onChange={e => onConsumerKeyChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToCreateKeys}
          </button>
        </div>
      </div>
    </>;
  const renderGuide = () => <OvhApiGuide variant="admin" locale={locale} />;
  const renderInfo = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.infoTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.infoDesc}</p>
      </div>
      <ul className={styles.apiList}>
        {copy.infoApis.map(item => <li key={item}>{item}</li>)}
      </ul>
    </>;
  const sectionContent = useMemo(() => {
    if (activeSection === "guide") return renderGuide();
    if (activeSection === "info") return renderInfo();
    return renderConnection();
  }, [activeSection, enabled, applicationKey, applicationSecret, consumerKey, saving, testing, copy, locale]);
  if (!open) return null;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={saving || testing ? undefined : onClose} role="presentation">
          <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ovh-integration-title">
            <div className={`${formStyles.accentBar} ${ovhStyles.accentBarOvh}`} aria-hidden />
            <header className={formStyles.header}>
              <div className={formStyles.headerMain}>
                <div className={`${formStyles.headerIconWrap} ${ovhStyles.headerIconOvh}`} aria-hidden>
                  <Icon icon="simple-icons:ovh" />
                </div>
                <div className={formStyles.headerText}>
                  <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                  <h2 className={formStyles.title} id="ovh-integration-title">
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

              <div className={formStyles.content}>{sectionContent}</div>
            </div>

            <footer className={formStyles.footer}>
              <span className={formStyles.footerHint}>
                {enabled ? copy.footerActive : copy.footerInactive}
              </span>
              <div className={formStyles.footerActions}>
                <button type="button" className={formStyles.ghostBtn} onClick={handleTest} disabled={saving || testing}>
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
        </div>, document.getElementById("modal-root") || document.body)}

      {showTestModal ? <OvhTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} /> : null}
    </>;
}
