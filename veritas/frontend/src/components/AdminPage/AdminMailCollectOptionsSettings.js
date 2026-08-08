import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { DEFAULT_MAIL_COLLECT_SETTINGS, normalizeMailCollectSettings } from "../../utils/mailCollectSettingsConstants";
import { Card, Field, Btn, Switch, ChoiceGroup, FieldRow, NumberStepper, FormGrid } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import styles from "./AdminMailCollectOptionsSettings.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminMailCollectCopy, getLocalizedOrphanReplyOptions } from "./adminMailCollectI18n";
export default function AdminMailCollectOptionsSettings() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminMailCollectCopy(locale), [locale]);
  const opt = copy.options;
  const orphanOptions = useMemo(() => getLocalizedOrphanReplyOptions(copy), [copy]);
  const orphanSegmentOptions = useMemo(() => orphanOptions.map(({
    value,
    label
  }) => ({
    value,
    label
  })), [orphanOptions]);
  const [form, setForm] = useState(() => normalizeMailCollectSettings(DEFAULT_MAIL_COLLECT_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const orphanHint = useMemo(() => orphanOptions.find(item => item.value === form.orphanReplyBehavior)?.subtitle || opt.orphanReply.hintFallback, [form.orphanReplyBehavior, orphanOptions, opt.orphanReply.hintFallback]);
  useEffect(() => {
    const cached = getTicketAutomationConfig();
    if (cached?.mailCollectSettings) {
      setForm(normalizeMailCollectSettings(cached.mailCollectSettings));
    }
    fetchTicketAutomationConfig().then(config => {
      setForm(normalizeMailCollectSettings(config?.mailCollectSettings));
    }).catch(() => toast.error(copy.toast.loadError)).finally(() => setLoading(false));
  }, [copy.toast.loadError]);
  const patch = partial => setForm(prev => ({
    ...prev,
    ...partial
  }));
  const save = async () => {
    setSaving(true);
    try {
      const current = getTicketAutomationConfig();
      const normalized = normalizeMailCollectSettings(form);
      await saveTicketAutomationConfig({
        ...current,
        mailCollectSettings: normalized
      });
      setForm(normalized);
      toast.success(copy.toast.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.toast.saveError);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <p className={adminUi.adminMutedText}>{opt.loading}</p>;
  }
  return <div className={styles.layout}>
      <Card title={opt.cardTitle} description={opt.cardDescription}>
        <div className={styles.groups}>
          <section className={styles.group}>
            <header className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>{opt.groups.thread.title}</h3>
              <p className={styles.groupDesc}>{opt.groups.thread.description}</p>
            </header>

            <FormGrid cols={2}>
              <FieldRow icon="mdi:email-sync-outline" label={opt.threadReplies.label} hint={opt.threadReplies.hint} className={styles.compactRow}>
                <Switch checked={form.threadRepliesEnabled} onChange={on => patch({
                threadRepliesEnabled: on
              })} />
              </FieldRow>

              <FieldRow icon="mdi:identifier" label={opt.deduplicate.label} hint={opt.deduplicate.hint} className={styles.compactRow}>
                <Switch checked={form.deduplicateByMessageId} onChange={on => patch({
                deduplicateByMessageId: on
              })} />
              </FieldRow>
            </FormGrid>

            {form.threadRepliesEnabled ? <div className={styles.subOption}>
                <Field label={opt.orphanReply.label} hint={orphanHint || opt.orphanReply.hintFallback}>
                  <ChoiceGroup variant="segment" ariaLabel={opt.orphanReply.ariaLabel} value={form.orphanReplyBehavior} options={orphanSegmentOptions} onChange={value => patch({
                orphanReplyBehavior: value
              })} />
                </Field>
              </div> : null}
          </section>

          <section className={styles.group}>
            <header className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>{opt.groups.logs.title}</h3>
              <p className={styles.groupDesc}>{opt.groups.logs.description}</p>
            </header>

            <Field label={opt.maxLogEntries.label} hint={opt.maxLogEntries.hint}>
              <div className={styles.stepperWrap}>
                <NumberStepper min={50} max={2000} value={form.maxLogEntriesPerCollector} onChange={value => patch({
                maxLogEntriesPerCollector: value
              })} ariaLabel={opt.maxLogEntries.ariaLabel} />
              </div>
            </Field>
          </section>
        </div>
      </Card>

      <div className={styles.footerBar}>
        <p className={styles.footerHint}>{opt.footerHint}</p>
        <div className={styles.footerActions}>
          <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
            {saving ? copy.common.saving : copy.common.save}
          </Btn>
        </div>
      </div>
    </div>;
}
