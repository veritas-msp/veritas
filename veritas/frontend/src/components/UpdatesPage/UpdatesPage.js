import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";
import {
  applyPlatformUpdate,
  checkForUpdates,
  fetchUpdateJob,
  fetchUpdateStatus,
  runUpdatePrecheck
} from "../../api/platformUpdates";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { isSuperAdminProtectedProfile } from "../../utils/profileProtection";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import account from "../Misc/AccountPage/AccountPage.module.css";
import { getUpdatesPageCopy } from "./updatesPageI18n";
import styles from "./UpdatesPage.module.css";

function SectionPanel({ title, description, children, full }) {
  return (
    <section className={`${account.sectionPanel} ${full ? account.sectionPanelFull : ""}`}>
      <header className={account.sectionHeader}>
        <h2 className={account.sectionTitle}>{title}</h2>
        {description ? <p className={account.sectionDesc}>{description}</p> : null}
      </header>
      <div className={account.sectionBody}>{children}</div>
    </section>
  );
}

function lightMarkdownToHtml(raw) {
  const escaped = String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withCode = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  const withBold = withCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const withLinks = withBold.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  const withHeadings = withLinks.replace(/^### (.+)$/gm, "<h4>$1</h4>").replace(/^## (.+)$/gm, "<h3>$1</h3>");
  const withLists = withHeadings.replace(/^- (.+)$/gm, "<li>$1</li>");
  return withLists
    .split(/\n{2,}/)
    .map((block) => {
      if (block.includes("<h3>") || block.includes("<h4>")) return block;
      if (block.includes("<li>")) return `<ul>${block.replace(/\n/g, "")}</ul>`;
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

function formatDate(value, locale) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale || undefined);
}

export default function UpdatesPage({ profile }) {
  const locale = useAppLocale();
  const t = useMemo(() => getUpdatesPageCopy(locale), [locale]);
  const isSuperAdmin = isSuperAdminProtectedProfile(profile);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [precheck, setPrecheck] = useState(null);
  const [prechecking, setPrechecking] = useState(false);
  const [ackPrecautions, setAckPrecautions] = useState(false);
  const [applying, setApplying] = useState(false);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchUpdateStatus();
      setStatus(data);
      if (data.activeJob) setJob(data.activeJob);
    } catch {
      toast.error(t.toastLoadError);
    } finally {
      setLoading(false);
    }
  }, [t.toastLoadError]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    loadStatus();
  }, [isSuperAdmin, loadStatus]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startJobPolling = useCallback(
    (jobId) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const data = await fetchUpdateJob(jobId);
          setJob(data.job);
          if (data.job?.status === "success") {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setApplying(false);
            toast.success(t.toastApplySuccess);
            loadStatus();
          } else if (data.job?.status === "failed") {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setApplying(false);
            toast.error(data.job.error || t.toastApplyFail);
          }
        } catch {
          /* keep polling briefly */
        }
      }, 2000);
    },
    [loadStatus, t.toastApplyFail, t.toastApplySuccess]
  );

  useEffect(() => {
    if (job && ["pending", "running"].includes(job.status)) {
      setApplying(true);
      startJobPolling(job.id);
    }
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isSuperAdmin) {
    return (
      <div className={`${layout.page} ${styles.page}`}>
        <div className={styles.denied}>
          <Icon icon="mdi:shield-lock" className={styles.deniedIcon} />
          <h1>{t.accessDeniedTitle}</h1>
          <p>{t.accessDeniedText}</p>
        </div>
      </div>
    );
  }

  const notesHtml = status?.latest?.body
    ? DOMPurify.sanitize(lightMarkdownToHtml(status.latest.body))
    : "";

  const canApplyWizard =
    Boolean(status?.updateAvailable) &&
    Boolean(status?.canApply) &&
    Boolean(precheck?.ok) &&
    ackPrecautions &&
    !applying;

  const applyDisabledReason = (() => {
    if (applying) return null;
    if (!status?.updateAvailable) return t.applyDisabledNoUpdate;
    if (!status?.canApply) return t.applyDisabledCannotApply;
    if (!precheck?.ok || !ackPrecautions) return t.applyDisabledHint;
    return null;
  })();

  const handleCheck = async () => {
    setChecking(true);
    try {
      const data = await checkForUpdates();
      setStatus(data);
      if (data.updateAvailable) {
        toast.info(interpolate(t.toastUpdateFound, { version: data.latest?.version }));
      } else {
        toast.success(t.toastUpToDate);
      }
    } catch (err) {
      toast.error(err.message || t.toastLoadError);
    } finally {
      setChecking(false);
    }
  };

  const handlePrecheck = async () => {
    setPrechecking(true);
    try {
      const data = await runUpdatePrecheck();
      setPrecheck(data);
      if (data.ok) toast.success(t.toastPrecheckOk);
      else toast.warning(t.toastPrecheckFail);
    } catch (err) {
      toast.error(err.message || t.toastPrecheckFail);
    } finally {
      setPrechecking(false);
    }
  };

  const handleApply = async () => {
    if (!canApplyWizard) return;
    setApplying(true);
    try {
      const data = await applyPlatformUpdate({
        targetTag: status?.latest?.tag || status?.latest?.version,
        skipBackup: true,
        acknowledgeManualBackup: true
      });
      setJob(data.job);
      toast.info(t.toastApplyStarted);
      startJobPolling(data.job.id);
    } catch (err) {
      setApplying(false);
      toast.error(err.message || t.toastApplyFail);
    }
  };

  return (
    <div className={`${layout.page} ${styles.page}`}>
      <div className={`${layout.shell} ${layout.shellFluid}`}>
        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:update" aria-hidden />
              Veritas
            </p>
            <h1 className={layout.pageTitle}>{t.title}</h1>
            <p className={layout.pageSubtitle}>{t.subtitle}</p>
          </div>
          <div className={layout.heroActions}>
            <button type="button" className={styles.primaryBtn} onClick={handleCheck} disabled={checking || loading}>
              <Icon icon="mdi:cloud-refresh" />
              {checking ? t.checking : t.checkButton}
            </button>
          </div>
        </header>

      <div className={`${account.contentScroll} ${styles.scroll}`}>
        {loading ? (
          <div className={styles.loading}>…</div>
        ) : (
          <div className={account.contentGridWide}>
            <SectionPanel
              title={status?.updateAvailable ? t.updateAvailable : t.upToDate}
              description={
                status?.checkedAt
                  ? `${t.lastChecked}: ${formatDate(status.checkedAt, locale)}`
                  : t.neverChecked
              }
            >
              <div className={styles.versionRow}>
                <div className={styles.versionCard}>
                  <span className={styles.versionLabel}>{t.currentVersion}</span>
                  <strong className={styles.versionValue}>v{status?.currentVersion || "—"}</strong>
                </div>
                <Icon icon="mdi:arrow-right" className={styles.versionArrow} />
                <div className={`${styles.versionCard} ${status?.updateAvailable ? styles.versionCardAccent : ""}`}>
                  <span className={styles.versionLabel}>{t.availableVersion}</span>
                  <strong className={styles.versionValue}>
                    {status?.latest?.version ? `v${status.latest.version}` : "—"}
                  </strong>
                </div>
              </div>
              <div className={styles.metaRow}>
                <span>
                  {t.mode}:{" "}
                  <strong>{status?.mode === "docker" ? t.modeDocker : t.modeSource}</strong>
                </span>
                <span className={status?.canApply ? styles.ok : styles.warn}>
                  {status?.canApply ? t.canApply : t.cannotApply}
                </span>
              </div>
              {status?.precheckHint ? <p className={styles.hint}>{status.precheckHint}</p> : null}
              {status?.checkError ? <p className={styles.error}>{status.checkError}</p> : null}
              {status?.host ? (
                <p className={styles.hostLine}>
                  {t.host}: {status.host.hostname} · {status.host.platform}/{status.host.arch} · Node{" "}
                  {status.host.node}
                </p>
              ) : null}
            </SectionPanel>

            <SectionPanel title={t.releaseNotes} description={status?.latest?.name || undefined}>
              {notesHtml ? (
                <div className={styles.notes} dangerouslySetInnerHTML={{ __html: notesHtml }} />
              ) : (
                <p className={styles.muted}>{t.noNotes}</p>
              )}
              {status?.latest?.htmlUrl ? (
                <a className={styles.link} href={status.latest.htmlUrl} target="_blank" rel="noopener noreferrer">
                  <Icon icon="mdi:github" /> {t.openOnGithub}
                </a>
              ) : null}
            </SectionPanel>

            <SectionPanel title={t.wizardTitle} full>
              <div className={styles.wizard}>
                <div className={styles.wizardStep}>
                  <h3>{t.stepPrecheck}</h3>
                  <button type="button" className={styles.secondaryBtn} onClick={handlePrecheck} disabled={prechecking}>
                    {prechecking ? t.runningPrecheck : t.runPrecheck}
                  </button>
                  {precheck ? (
                    <ul className={styles.checkList}>
                      {precheck.checks.map((c) => (
                        <li key={c.key} className={c.ok ? styles.checkOk : styles.checkFail}>
                          <Icon icon={c.ok ? "mdi:check-circle" : "mdi:alert-circle"} />
                          <span>{c.detail}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className={styles.wizardStep}>
                  <h3>{t.stepBackup}</h3>
                  <p className={styles.precautionsText}>{t.precautionsText}</p>
                  <label className={styles.ackLabel}>
                    <input
                      type="checkbox"
                      checked={ackPrecautions}
                      onChange={(e) => setAckPrecautions(e.target.checked)}
                    />
                    <span>{t.ackPrecautions}</span>
                  </label>
                </div>

                <div className={styles.wizardStep}>
                  <h3>{t.stepApply}</h3>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleApply}
                    disabled={!canApplyWizard}
                    title={applyDisabledReason || undefined}
                  >
                    <Icon icon="mdi:rocket-launch" />
                    {applying ? t.applying : t.applyButton}
                  </button>
                  {applyDisabledReason ? <p className={styles.hint}>{applyDisabledReason}</p> : null}
                </div>
              </div>

              {job ? (
                <div className={styles.jobBox}>
                  <h3>
                    {t.jobLog} · {job.status} · {job.targetVersion ? `v${job.targetVersion}` : ""}
                  </h3>
                  <ol className={styles.jobSteps}>
                    {(job.steps || []).map((s) => (
                      <li key={s.key} className={styles[`step_${s.status}`] || undefined}>
                        <Icon
                          icon={
                            s.status === "success"
                              ? "mdi:check-circle"
                              : s.status === "running"
                                ? "mdi:loading"
                                : s.status === "failed"
                                  ? "mdi:close-circle"
                                  : "mdi:circle-outline"
                          }
                        />
                        <span>
                          {s.label}
                          {s.message ? ` — ${s.message}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <pre className={styles.jobLogs}>
                    {(job.logs || []).map((l) => `[${formatDate(l.at, locale)}] ${l.message}`).join("\n")}
                  </pre>
                </div>
              ) : null}
            </SectionPanel>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
