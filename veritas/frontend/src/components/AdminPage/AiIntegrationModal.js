import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { testAiConnection } from "../../api/ai";
import { showError } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAiIntegrationModalCopy } from "./adminIntegrationModalsI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./BitdefenderIntegrationModal.module.css";
import aiStyles from "./AiIntegrationModal.module.css";

const AI_PROVIDERS = [{
  id: "openai",
  defaultModel: "gpt-4o-mini"
}, {
  id: "anthropic",
  defaultModel: "claude-3-5-haiku-latest"
}, {
  id: "mammouth",
  defaultModel: "mammouth-recommended"
}];

const SECTION_ICONS = {
  connection: "mdi:key-variant",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};

function normalizeProvider(raw) {
  const value = String(raw || "").toLowerCase().trim();
  if (value === "anthropic") return "anthropic";
  if (value === "mammouth" || value === "mamouth") return "mammouth";
  return "openai";
}

function defaultModelFor(provider) {
  return AI_PROVIDERS.find(item => item.id === provider)?.defaultModel || "gpt-4o-mini";
}

function AiTestResultModal({
  result,
  error,
  onClose,
  copy
}) {
  const isSuccess = Boolean(result?.success);
  const errorMessage = (typeof error === "string" ? error : error?.message) || result?.error || null;
  return createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${styles.testResultShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`${formStyles.accentBar} ${aiStyles.accentBarAi}`} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${aiStyles.headerIconAi}`} aria-hidden>
              <Icon icon="mdi:robot-outline" />
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
            {isSuccess ? <dl className={styles.metaList}>
                <div className={styles.metaRow}>
                  <dt>{copy.provider}</dt>
                  <dd className={styles.mono}>{result.provider}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>{copy.model}</dt>
                  <dd className={styles.mono}>{result.model}</dd>
                </div>
              </dl> : null}
          </div>
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

export default function AiIntegrationModal({
  open,
  enabled,
  provider,
  apiKey,
  model,
  onEnabledChange,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAiIntegrationModalCopy(locale), [locale]);
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
  const normalizedProvider = normalizeProvider(provider);

  useEffect(() => {
    if (open) {
      setActiveSection("connection");
      setTestResult(null);
      setTestError(null);
      setShowTestModal(false);
    }
  }, [open]);

  const handleProviderChange = value => {
    const next = normalizeProvider(value);
    onProviderChange(next);
    const currentModel = String(model || "").trim();
    const previousDefault = defaultModelFor(normalizedProvider);
    if (!currentModel || currentModel === previousDefault) {
      onModelChange(defaultModelFor(next));
    }
  };

  const handleTest = async () => {
    const key = String(apiKey || "").trim();
    if (!key) {
      showError(copy.fillApiKeyBeforeTest);
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const data = await testAiConnection({
        provider: normalizedProvider,
        apiKey: key,
        model: String(model || "").trim() || defaultModelFor(normalizedProvider)
      });
      setTestResult(data);
      setShowTestModal(true);
    } catch (err) {
      setTestError({
        message: err.message
      });
      setTestResult({
        success: false,
        error: err.message
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
          <label className={formStyles.label} htmlFor="ai-provider">
            {copy.provider}
          </label>
          <select id="ai-provider" className={formStyles.input} value={normalizedProvider} onChange={e => handleProviderChange(e.target.value)} disabled={saving || testing}>
            {AI_PROVIDERS.map(item => <option key={item.id} value={item.id}>
                {copy.providers[item.id] || item.id}
              </option>)}
          </select>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ai-api-key">
            {copy.apiKey}
          </label>
          <input id="ai-api-key" type="password" className={formStyles.input} value={apiKey || ""} onChange={e => onApiKeyChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
          <button type="button" className={styles.guideLinkBtn} onClick={() => setActiveSection("guide")}>
            <Icon icon="mdi:help-circle-outline" aria-hidden />
            {copy.howToGetCredentials}
          </button>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="ai-model">
            {copy.model}
          </label>
          <input id="ai-model" type="text" className={formStyles.input} value={model || ""} placeholder={defaultModelFor(normalizedProvider)} onChange={e => onModelChange(e.target.value)} disabled={saving || testing} autoComplete="off" />
          <p className={formStyles.sectionDesc}>{copy.modelHint}</p>
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
        <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ai-integration-modal-title">
          <div className={aiStyles.accentBarAi} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={`${formStyles.headerIconWrap} ${aiStyles.headerIconAi}`} aria-hidden>
                <Icon icon="mdi:robot-outline" />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="ai-integration-modal-title">
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

      {showTestModal ? <AiTestResultModal result={testResult} error={testError} onClose={() => setShowTestModal(false)} copy={copy} /> : null}
    </>, document.getElementById("modal-root") || document.body);
}
