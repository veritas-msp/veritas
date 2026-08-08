import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { testGlobalMailinblackIntegration } from "../../api/mailinblackIntegration";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getMailinblackIntegrationModalCopy, interpolate } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
const DEFAULT_API_URL = "https://api.mailinblack.com";
const PARTNER_PORTAL_URL = "https://partner.mailinblack.com";
const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};
function MailinblackTestResultModal({
  result,
  error,
  onClose,
  copy
}) {
  const tenant = result?.tenant;
  const isSuccess = Boolean(result?.success && tenant);
  const errorMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  return createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${styles.headerIconBitdefender}`} aria-hidden>
              <Icon icon="mdi:email-secure-outline" />
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

        <div className={formStyles.body}>
          <div className={formStyles.content}>
            <div className={`${styles.resultNotice} ${isSuccess ? styles.resultNoticeSuccess : styles.resultNoticeError}`}>
              <Icon icon={isSuccess ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} className={styles.resultNoticeIcon} aria-hidden />
              <div>
                <strong>{isSuccess ? copy.connectionSuccess : copy.connectionFailed}</strong>
                <p>
                  {isSuccess ? result.message || copy.testApiSuccess : errorMessage || copy.apiUnreachable}
                </p>
              </div>
            </div>

            {isSuccess && tenant ? <>
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiValue}>{tenant.customersCount ?? 0}</div>
                    <div className={styles.kpiLabel}>{copy.protectCustomers}</div>
                  </div>
                </div>
                {tenant.customers?.length ? <div className={styles.tableScroll}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>{copy.name}</th>
                          <th>{copy.domain}</th>
                          <th>{copy.users}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.customers.map(customer => <tr key={customer.id}>
                            <td>{customer.name || "-"}</td>
                            <td>{customer.domain || "-"}</td>
                            <td>{customer.usersCount ?? "-"}</td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div> : null}
              </> : null}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {isSuccess ? copy.testFooterSuccess : copy.checkUrlAndKey}
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
export default function MailinblackIntegrationModal({
  open,
  enabled,
  apiUrl,
  apiKey,
  authClientId,
  onEnabledChange,
  onApiUrlChange,
  onApiKeyChange,
  onAuthClientIdChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getMailinblackIntegrationModalCopy(locale), [locale]);
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
  const resolveCredentials = async () => {
    const url = (apiUrl || "").trim() || DEFAULT_API_URL;
    const key = (apiKey || "").trim();
    if (!key) {
      throw new Error(copy.fillApiKey);
    }
    const data = await testGlobalMailinblackIntegration({
      apiUrl: url,
      apiKey: key,
      authClientId: (authClientId || "").trim() || undefined
    });
    const resolvedClientId = data?.tenant?.authClientId || data?.tenant?.check?.session?.clientId || null;
    if (resolvedClientId) {
      onAuthClientIdChange?.(resolvedClientId);
    }
    return data;
  };
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await resolveCredentials();
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
  const handleSaveClick = async () => {
    let resolvedClientId = (authClientId || "").trim() || null;
    const key = (apiKey || "").trim();
    if (key) {
      setTesting(true);
      try {
        const data = await resolveCredentials();
        resolvedClientId = data?.tenant?.authClientId || data?.tenant?.check?.session?.clientId || resolvedClientId;
      } catch (err) {
        showError(err.message || copy.validateKeyError);
        setTesting(false);
        return;
      }
      setTesting(false);
    }
    onSave?.({
      authClientId: resolvedClientId
    });
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
          <label className={formStyles.label} htmlFor="mib-api-url">
            {copy.apiUrl}
          </label>
          <input id="mib-api-url" type="url" className={formStyles.input} value={apiUrl || ""} placeholder={DEFAULT_API_URL} onChange={e => onApiUrlChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="mib-api-key">
            {copy.apiKey}
          </label>
          <input id="mib-api-key" type="password" className={formStyles.input} value={apiKey || ""} onChange={e => onApiKeyChange(e.target.value)} placeholder={copy.apiKeyPlaceholder} disabled={saving || testing} autoComplete="off" />
          <p className={formStyles.sectionDesc}>{copy.tokenHint}</p>
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToGetKey}
          </button>
        </div>

        {authClientId ? <div className={formStyles.field}>
            <label className={formStyles.label}>{copy.detectedAccount}</label>
            <p className={formStyles.sectionDesc}>
              {interpolate(copy.detectedAccountDesc, {
            clientId: authClientId
          })}
            </p>
          </div> : null}
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
                    {step.desc.split("partner.mailinblack.com")[0]}
                    <a href={PARTNER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                      partner.mailinblack.com
                      <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
                    </a>
                    {step.desc.split("partner.mailinblack.com")[1] || ""}
                  </> : index === 2 ? <>
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
      <ul className={styles.apiList}>
        {copy.infoApis.map(item => <li key={item}>{item}</li>)}
      </ul>
    </>;
  const sectionContent = useMemo(() => {
    if (activeSection === "guide") return renderGuide();
    if (activeSection === "info") return renderInfo();
    return renderConnection();
  }, [activeSection, enabled, apiUrl, apiKey, authClientId, saving, testing, copy]);
  if (!open) return null;
  return <>
      {createPortal(<div className={formStyles.overlay} onClick={saving || testing ? undefined : onClose} role="presentation">
          <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mailinblack-integration-title">
            <div className={formStyles.accentBar} aria-hidden />
            <header className={formStyles.header}>
              <div className={formStyles.headerMain}>
                <div className={`${formStyles.headerIconWrap} ${styles.headerIconBitdefender}`} aria-hidden>
                  <Icon icon="mdi:email-secure-outline" />
                </div>
                <div className={formStyles.headerText}>
                  <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                  <h2 className={formStyles.title} id="mailinblack-integration-title">
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
                {copy.footerHint}
              </span>
              <div className={formStyles.footerActions}>
                <button type="button" className={formStyles.ghostBtn} onClick={handleTest} disabled={saving || testing}>
                  {testing ? copy.testing : copy.testConnection}
                </button>
                <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving || testing}>
                  {copy.cancel}
                </button>
                <button type="button" className={formStyles.primaryBtn} onClick={handleSaveClick} disabled={saving || testing}>
                  {saving ? copy.saving : copy.save}
                </button>
              </div>
            </footer>
          </div>
        </div>, document.getElementById("modal-root") || document.body)}

      {showTestModal ? <MailinblackTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} /> : null}
    </>;
}
