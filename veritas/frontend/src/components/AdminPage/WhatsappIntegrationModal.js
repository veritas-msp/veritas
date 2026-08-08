import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import API_BASE_URL from "../../config";
import { testWhatsappConnection } from "../../api/integrationConnectionTests";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getWhatsappIntegrationModalCopy } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
import waStyles from "./WhatsappIntegrationModal.module.css";

const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};

function WhatsappTestResultModal({
  result,
  error,
  onClose,
  copy
}) {
  const isSuccess = Boolean(result?.success);
  const errorMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  const errorDetails = (typeof error === "object" ? error?.details : null) || result?.details || null;
  const info = result?.info || {};
  return createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`${formStyles.accentBar} ${waStyles.accentBarWhatsapp}`} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${waStyles.headerIconWhatsapp}`} aria-hidden>
              <Icon icon="mdi:whatsapp" />
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
            {isSuccess ? <dl className={styles.metaList}>
                {info.verifiedName ? <div className={styles.metaRow}>
                    <dt>{copy.accountName}</dt>
                    <dd>{info.verifiedName}</dd>
                  </div> : null}
                {info.displayPhoneNumber ? <div className={styles.metaRow}>
                    <dt>{copy.phoneNumber}</dt>
                    <dd className={styles.mono}>{info.displayPhoneNumber}</dd>
                  </div> : null}
                {info.qualityRating ? <div className={styles.metaRow}>
                    <dt>{copy.quality}</dt>
                    <dd>{info.qualityRating}</dd>
                  </div> : null}
              </dl> : null}
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

export default function WhatsappIntegrationModal({
  open,
  enabled,
  phoneNumberId,
  accessToken,
  appSecret,
  verifyToken,
  businessAccountId,
  apiVersion,
  onEnabledChange,
  onPhoneNumberIdChange,
  onAccessTokenChange,
  onAppSecretChange,
  onVerifyTokenChange,
  onBusinessAccountIdChange,
  onApiVersionChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getWhatsappIntegrationModalCopy(locale), [locale]);
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
  const webhookUrl = `${API_BASE_URL.replace(/\/api\/?$/, "")}/api/whatsapp/webhook`;

  useEffect(() => {
    if (open) {
      setActiveSection("connection");
      setTestResult(null);
      setTestError(null);
      setShowTestModal(false);
    }
  }, [open]);

  const handleTest = async () => {
    if (!(phoneNumberId || "").trim() || !(accessToken || "").trim()) {
      showError(copy.fillCredentialsBeforeTest);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await testWhatsappConnection();
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
          <label className={formStyles.label} htmlFor="wa-phone-id">{copy.phoneNumberId}</label>
          <input id="wa-phone-id" type="text" className={formStyles.input} value={phoneNumberId || ""} onChange={e => onPhoneNumberIdChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="wa-access-token">{copy.accessToken}</label>
          <input id="wa-access-token" type="password" className={formStyles.input} value={accessToken || ""} onChange={e => onAccessTokenChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="wa-app-secret">{copy.appSecret}</label>
          <input id="wa-app-secret" type="password" className={formStyles.input} value={appSecret || ""} onChange={e => onAppSecretChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="wa-verify-token">{copy.verifyToken}</label>
          <input id="wa-verify-token" type="password" className={formStyles.input} value={verifyToken || ""} onChange={e => onVerifyTokenChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToGetCredentials}
          </button>
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="wa-business-id">{copy.businessAccountId}</label>
          <input id="wa-business-id" type="text" className={formStyles.input} value={businessAccountId || ""} onChange={e => onBusinessAccountIdChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="wa-api-version">{copy.apiVersion}</label>
          <input id="wa-api-version" type="text" className={formStyles.input} value={apiVersion || ""} placeholder="v21.0" onChange={e => onApiVersionChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
        </div>
      </div>

      <div className={waStyles.webhookBox}>
        <p className={waStyles.webhookLabel}>{copy.webhookUrl}</p>
        <code className={waStyles.webhookCode}>{webhookUrl}</code>
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
        <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="whatsapp-integration-modal-title">
          <div className={waStyles.accentBarWhatsapp} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={`${formStyles.headerIconWrap} ${waStyles.headerIconWhatsapp}`} aria-hidden>
                <Icon icon="mdi:whatsapp" />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="whatsapp-integration-modal-title">{copy.title}</h2>
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
      {showTestModal ? <WhatsappTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} /> : null}
    </>, document.getElementById("modal-root") || document.body);
}
