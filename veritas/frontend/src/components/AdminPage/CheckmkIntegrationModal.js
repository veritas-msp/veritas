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
  monitoring: "mdi:timer-sync-outline",
  guide: "mdi:book-open-outline",
  info: "mdi:information-outline"
};

const SYNC_INTERVAL_PRESETS = [5, 15, 30, 60, 120, 360, 720, 1440];

function parseSyncIntervalMinutes(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(10080, Math.max(5, n));
}

function isSettingTrue(value) {
  return `${value ?? ""}`.toLowerCase() === "true";
}

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

        <div className={formStyles.bodySingle}>
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
  syncIntervalMinutes = "30",
  syncSuspended = false,
  surveillanceSuspended = false,
  onEnabledChange,
  onApiUrlChange,
  onUsernameChange,
  onPasswordChange,
  onSiteChange,
  onSyncIntervalChange,
  onSyncSuspendedChange,
  onSurveillanceSuspendedChange,
  onClose,
  onSave,
  saving = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCheckmkIntegrationModalCopy(locale), [locale]);
  const sections = useMemo(() => ["connection", "monitoring", "guide", "info"].map(id => ({
    id,
    label: copy.sections[id]?.label || copy.sections[id]?.description || id,
    description: copy.sections[id]?.description,
    icon: SECTION_ICONS[id]
  })), [copy]);
  const [activeSection, setActiveSection] = useState("connection");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const intervalValue = parseSyncIntervalMinutes(syncIntervalMinutes);
  const intervalPresets = copy.syncIntervalPresets || SYNC_INTERVAL_PRESETS.map(value => ({
    value,
    label: `${value} min`
  }));

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
      const data = await testCheckmkConnection({
        apiUrl: (apiUrl || "").trim(),
        username: (username || "").trim(),
        password: password || "",
        site: (site || "").trim()
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
      <p className={formStyles.sectionDesc}>{copy.testUsesFormHint}</p>
    </>;

  const bumpInterval = delta => {
    onSyncIntervalChange?.(String(parseSyncIntervalMinutes(intervalValue + delta)));
  };

  const renderMonitoring = () => <>
      <div className={`${formStyles.sectionHead} ${checkmkStyles.sectionHead}`}>
        <h3 className={checkmkStyles.sectionTitle}>{copy.monitoringTitle}</h3>
        <p className={checkmkStyles.sectionSubtitle}>{copy.monitoringDesc}</p>
      </div>

      <div className={`${formStyles.fieldStack} ${checkmkStyles.monitoringStack}`}>
        <div className={`${formStyles.field} ${checkmkStyles.intervalField}`}>
          <label className={formStyles.label} htmlFor="checkmk-sync-interval">{copy.syncInterval}</label>
          <div className={checkmkStyles.intervalRow}>
            <div className={checkmkStyles.intervalStepper} role="group" aria-label={copy.syncInterval}>
              <div className={checkmkStyles.intervalCenter}>
                <input
                  id="checkmk-sync-interval"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={checkmkStyles.intervalInput}
                  value={intervalValue}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw === "") return;
                    onSyncIntervalChange?.(String(parseSyncIntervalMinutes(raw)));
                  }}
                  disabled={saving || testing}
                />
                <span className={checkmkStyles.intervalUnit}>{copy.syncIntervalUnit}</span>
              </div>
              <div className={checkmkStyles.intervalBtns}>
                <button
                  type="button"
                  className={checkmkStyles.intervalBtn}
                  onClick={() => bumpInterval(1)}
                  disabled={saving || testing || intervalValue >= 10080}
                  aria-label="+"
                >
                  <Icon icon="mdi:chevron-up" aria-hidden />
                </button>
                <button
                  type="button"
                  className={checkmkStyles.intervalBtn}
                  onClick={() => bumpInterval(-1)}
                  disabled={saving || testing || intervalValue <= 5}
                  aria-label="-"
                >
                  <Icon icon="mdi:chevron-down" aria-hidden />
                </button>
              </div>
            </div>
          </div>
          <div className={checkmkStyles.presetRow} role="group" aria-label={copy.syncInterval}>
            {intervalPresets.map(preset => <button
              key={preset.value}
              type="button"
              className={`${checkmkStyles.presetChip} ${intervalValue === preset.value ? checkmkStyles.presetChipActive : ""}`}
              onClick={() => onSyncIntervalChange?.(String(preset.value))}
              disabled={saving || testing}
            >
              {preset.label}
            </button>)}
          </div>
        </div>

        <div className={checkmkStyles.toggleRow}>
          <div className={checkmkStyles.toggleCopy}>
            <span className={checkmkStyles.toggleTitle}>{copy.syncSuspended}</span>
            <p className={checkmkStyles.toggleHint}>{copy.syncSuspendedHint}</p>
          </div>
          <label className={formStyles.switchWrap}>
            <input type="checkbox" className={formStyles.switchInput} checked={isSettingTrue(syncSuspended) || syncSuspended === true} onChange={e => onSyncSuspendedChange?.(e.target.checked)} disabled={saving || testing} />
            <span className={formStyles.switchTrack} aria-hidden>
              <span className={formStyles.switchThumb} />
            </span>
          </label>
        </div>

        <div className={checkmkStyles.toggleRow}>
          <div className={checkmkStyles.toggleCopy}>
            <span className={checkmkStyles.toggleTitle}>{copy.surveillanceSuspended}</span>
            <p className={checkmkStyles.toggleHint}>{copy.surveillanceSuspendedHint}</p>
          </div>
          <label className={formStyles.switchWrap}>
            <input type="checkbox" className={formStyles.switchInput} checked={isSettingTrue(surveillanceSuspended) || surveillanceSuspended === true} onChange={e => onSurveillanceSuspendedChange?.(e.target.checked)} disabled={saving || testing} />
            <span className={formStyles.switchTrack} aria-hidden>
              <span className={formStyles.switchThumb} />
            </span>
          </label>
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
              {activeSection === "guide" ? renderGuide() : activeSection === "info" ? renderInfo() : activeSection === "monitoring" ? renderMonitoring() : renderConnection()}
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
