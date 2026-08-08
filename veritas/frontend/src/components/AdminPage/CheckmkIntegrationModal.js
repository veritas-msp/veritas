import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { testCheckmkConnection } from "../../api/integrationConnectionTests";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCheckmkIntegrationModalCopy } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
import checkmkStyles from "./CheckmkIntegrationModal.module.css";

const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};

function CheckmkTestResultModal({
  result,
  error,
  onClose,
  copy
}) {
  const isSuccess = Boolean(result?.success);
  const errorMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  const errorDetails = (typeof error === "object" ? error?.details : null) || result?.details || null;
  return createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`${formStyles.accentBar} ${checkmkStyles.accentBarCheckmk}`} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${checkmkStyles.headerIconCheckmk}`} aria-hidden>
              <Icon icon="simple-icons:checkmk" />
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
                {errorDetails ? <pre className={styles.errorDetails}>{errorDetails}</pre> : null}
              </div>
            </div>
            {isSuccess ? <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiValue}>{result.hostsCount ?? 0}</div>
                  <div className={styles.kpiLabel}>{copy.hosts}</div>
                </div>
              </div> : null}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>
            {isSuccess ? copy.testSuccessShort : copy.checkCredentials}
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

export default function CheckmkIntegrationModal({
  open,
  enabled,
  apiUrl,
  username,
  password,
  site,
  onEnabledChange,
  onApiUrlChange,
  onUsernameChange,
  onPasswordChange,
  onSiteChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCheckmkIntegrationModalCopy(locale), [locale]);
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
    if (!(apiUrl || "").trim() || !(username || "").trim() || !(password || "").trim()) {
      showError(copy.fillCredentialsBeforeTest);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await testCheckmkConnection();
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
          <label className={formStyles.label} htmlFor="checkmk-api-url">{copy.apiUrl}</label>
          <input id="checkmk-api-url" type="url" className={formStyles.input} value={apiUrl || ""} placeholder="https://checkmk.example.com/site/check_mk/api/1.0" onChange={e => onApiUrlChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="checkmk-username">{copy.username}</label>
          <input id="checkmk-username" type="text" className={formStyles.input} value={username || ""} onChange={e => onUsernameChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="checkmk-password">{copy.password}</label>
          <input id="checkmk-password" type="password" className={formStyles.input} value={password || ""} onChange={e => onPasswordChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToGetCredentials}
          </button>
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="checkmk-site">{copy.site}</label>
          <input id="checkmk-site" type="text" className={formStyles.input} value={site || ""} placeholder={copy.sitePlaceholder} onChange={e => onSiteChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
      </div>
      <p className={formStyles.sectionDesc}>{copy.testUsesSavedHint}</p>
    </>;

  const renderGuide = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.guideTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.guideDesc}</p>
      </div>
      <ol className={styles.guideSteps}>
        {copy.guideSteps.map((step, index) => <li key={step.title} className={styles.guideStep}>
            <span className={styles.guideStepNum} aria-hidden>{index + 1}</span>
            <div className={styles.guideStepBody}>
              <p className={styles.guideStepTitle}>{step.title}</p>
              <p className={styles.guideStepDesc}>{step.desc}</p>
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
      <p className={formStyles.sectionDesc}>{copy.infoFooter}</p>
    </>;

  if (!open) return null;

  return createPortal(<>
      <div className={formStyles.overlay} onClick={saving || testing ? undefined : onClose} role="presentation">
        <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="checkmk-integration-modal-title">
          <div className={checkmkStyles.accentBarCheckmk} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={`${formStyles.headerIconWrap} ${checkmkStyles.headerIconCheckmk}`} aria-hidden>
                <Icon icon="simple-icons:checkmk" />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="checkmk-integration-modal-title">{copy.title}</h2>
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
      {showTestModal ? <CheckmkTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} /> : null}
    </>, document.getElementById("modal-root") || document.body);
}
