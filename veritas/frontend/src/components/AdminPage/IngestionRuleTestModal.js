import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { getRuleActionLabel, interpolate } from "./adminMailCollectI18n";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./IngestionRuleTestModal.module.css";
const EMPTY_SAMPLE = {
  subject: "",
  body: "",
  fromAddress: "",
  fromName: ""
};
export default function IngestionRuleTestModal({
  open,
  copy,
  sample,
  onSampleChange,
  mailCollectors = [],
  result,
  testing = false,
  onClose,
  onRunTest
}) {
  const irt = copy.ingestionRuleTest;
  if (!open) return null;
  const draft = sample || EMPTY_SAMPLE;
  const matches = Array.isArray(result?.matches) ? result.matches : [];
  const hasMatch = Boolean(result?.firstMatchName);
  const patchSample = patch => onSampleChange({
    ...draft,
    ...patch
  });
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(820px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ingestion-rule-test-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:flask-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{irt.eyebrow}</p>
              <h2 className={layout.title} id="ingestion-rule-test-title">
                {irt.title}
              </h2>
              <p className={layout.subtitle}>{irt.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={testing} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div style={{
        overflowY: "auto",
        padding: "1.25rem 1.5rem 1.35rem"
      }}>
          <div className={layout.field} style={{
          marginBottom: "1rem"
        }}>
            <label className={layout.label} htmlFor="rule-test-collector">
              {irt.collectorLabel}
            </label>
            <select id="rule-test-collector" className={layout.input} value={draft.collectorId || ""} onChange={e => patchSample({
            collectorId: e.target.value
          })}>
              <option value="">{irt.collectorAll}</option>
              {(Array.isArray(mailCollectors) ? mailCollectors : []).map(collector => <option key={collector.id} value={collector.id}>
                  {collector.name || collector.username || collector.server || copy.common.collectorFallback}
                </option>)}
            </select>
          </div>
          <div className={layout.fieldGrid2}>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="rule-test-from">
                {irt.fromLabel}
              </label>
              <input id="rule-test-from" type="email" className={layout.input} value={draft.fromAddress || ""} onChange={e => patchSample({
              fromAddress: e.target.value
            })} placeholder={irt.fromPlaceholder} />
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="rule-test-from-name">
                {irt.fromNameLabel}
              </label>
              <input id="rule-test-from-name" type="text" className={layout.input} value={draft.fromName || ""} onChange={e => patchSample({
              fromName: e.target.value
            })} placeholder={irt.fromNamePlaceholder} />
            </div>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={layout.label} htmlFor="rule-test-subject">
                {irt.subjectLabel}
              </label>
              <input id="rule-test-subject" type="text" className={layout.input} value={draft.subject || ""} onChange={e => patchSample({
              subject: e.target.value
            })} placeholder={irt.subjectPlaceholder} />
            </div>
            <div className={`${layout.field} ${layout.fieldFull}`}>
              <label className={layout.label} htmlFor="rule-test-body">
                {irt.bodyLabel}
              </label>
              <textarea id="rule-test-body" className={`${layout.input} ${styles.textarea}`} value={draft.body || ""} onChange={e => patchSample({
              body: e.target.value
            })} placeholder={irt.bodyPlaceholder} />
            </div>
          </div>

          {result && <div className={styles.resultPanel}>
              <div className={`${styles.resultHeadline} ${hasMatch ? styles.resultHeadline_match : styles.resultHeadline_none}`}>
                <Icon icon={hasMatch ? "mdi:check-decagram-outline" : "mdi:close-circle-outline"} className={`${styles.resultIcon} ${hasMatch ? styles.resultIcon_match : styles.resultIcon_none}`} aria-hidden />
                <div>
                  <p className={styles.resultTitle}>
                    {hasMatch ? interpolate(irt.matchTitle, {
                  name: result.firstMatchName
                }) : irt.noMatchTitle}
                  </p>
                  <p className={styles.resultSub}>
                    {hasMatch ? interpolate(irt.matchSub, {
                  count: matches.length
                }) : irt.noMatchSub}
                  </p>
                </div>
              </div>

              {matches.length > 0 && <div className={styles.matchList}>
                  {matches.map(rule => <div key={rule.id} className={styles.matchItem}>
                      <span className={styles.matchName}>
                        {rule.name || copy.common.ruleUntitled}
                      </span>
                      <span className={styles.matchAction}>
                        {getRuleActionLabel(rule.action, copy) || rule.action || "-"}
                      </span>
                    </div>)}
                </div>}
            </div>}
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {result ? irt.footerResult : irt.footerNoTest}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={testing}>
              {copy.common.close}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onRunTest} disabled={testing}>
              {testing ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {irt.testing}
                </> : <>
                  <Icon icon="mdi:play-outline" aria-hidden />
                  {irt.runTest}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
