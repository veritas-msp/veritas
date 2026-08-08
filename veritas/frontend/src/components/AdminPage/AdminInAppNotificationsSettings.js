import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Btn, Card, FieldRow, Switch } from "./AdminUi";
import styles from "./AdminInAppNotificationsSettings.module.css";
import { sendTestNotification } from "../../api/notifications";
import { emitNotificationsUpdated } from "../../hooks/useNotifications";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { DEFAULT_IN_APP_SETTINGS, normalizeInAppSettings } from "../../utils/inAppNotificationSettings";
import { formatInAppActiveEventsDescription, getAdminInAppNotificationsCopy, getLocalizedAdminInAppEventOptions, getLocalizedInAppEventGroups, getLocalizedInAppTestTypeOptions } from "./adminInAppNotificationsI18n";
export default function AdminInAppNotificationsSettings() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminInAppNotificationsCopy(locale), [locale]);
  const eventOptions = useMemo(() => getLocalizedAdminInAppEventOptions(locale), [locale]);
  const eventGroups = useMemo(() => getLocalizedInAppEventGroups(locale), [locale]);
  const testTypeOptions = useMemo(() => getLocalizedInAppTestTypeOptions(locale), [locale]);
  const eventOptionByKey = useMemo(() => Object.fromEntries(eventOptions.map(item => [item.key, item])), [eventOptions]);
  const [settings, setSettings] = useState(() => normalizeInAppSettings(getTicketAutomationConfig()?.notificationSettings?.inAppSettings));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testType, setTestType] = useState("ticket_commented");
  useEffect(() => {
    fetchTicketAutomationConfig().then(config => {
      setSettings(normalizeInAppSettings(config?.notificationSettings?.inAppSettings));
    });
  }, []);
  const activeEventsCount = useMemo(() => {
    if (!settings.enabled) return 0;
    return eventOptions.filter(option => settings.events[option.key]?.enabled !== false).length;
  }, [settings, eventOptions]);
  const updateEventField = (eventKey, field, value) => {
    setSettings(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [eventKey]: {
          ...prev.events[eventKey],
          [field]: value
        }
      }
    }));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      const current = getTicketAutomationConfig();
      const nextSettings = {
        ...(current?.notificationSettings || {}),
        inAppSettings: normalizeInAppSettings(settings)
      };
      await saveTicketAutomationConfig({
        ...current,
        notificationSettings: nextSettings
      });
      toast.success(copy.toast.saveSuccess);
    } catch (error) {
      toast.error(error?.message || copy.toast.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleSendTest = async () => {
    setTesting(true);
    try {
      await sendTestNotification(testType, locale);
      emitNotificationsUpdated();
      toast.success(copy.toast.testSuccess);
    } catch (error) {
      toast.error(error?.message || copy.toast.testError);
    } finally {
      setTesting(false);
    }
  };
  const renderEventCard = eventKey => {
    const eventOption = eventOptionByKey[eventKey];
    if (!eventOption) return null;
    const eventSettings = settings.events[eventKey] || DEFAULT_IN_APP_SETTINGS.events[eventKey];
    const isEventEnabled = eventSettings.enabled !== false;
    const isDisabled = !settings.enabled;
    return <article key={eventKey} className={`${styles.eventCard} ${isDisabled ? styles.eventCardDisabled : ""}`}>
        <FieldRow icon={eventOption.icon} label={eventOption.label} hint={eventOption.description} className={styles.compactRow}>
          <Switch checked={isEventEnabled} disabled={isDisabled} onChange={value => updateEventField(eventKey, "enabled", value)} />
        </FieldRow>

        {isEventEnabled && eventOption.fields.length > 0 && !isDisabled ? <div className={styles.eventOptions}>
            {eventOption.fields.map(field => <FieldRow key={`${eventKey}-${field.key}`} label={field.label} hint={field.hint} className={`${styles.compactRow} ${styles.compactSubRow}`}>
                <Switch checked={eventSettings[field.key] === true} onChange={value => updateEventField(eventKey, field.key, value)} />
              </FieldRow>)}
          </div> : null}
      </article>;
  };
  return <div className={styles.layout}>
      <Card title={copy.mainCard.title} description={copy.mainCard.description}>
        <FieldRow icon="mdi:bell-ring-outline" label={copy.enable.label} hint={copy.enable.hint} className={styles.compactRow}>
          <Switch checked={settings.enabled} onChange={value => setSettings(prev => ({
          ...prev,
          enabled: value
        }))} label={settings.enabled ? copy.status.enabled : copy.status.disabled} />
        </FieldRow>
      </Card>

      <Card title={copy.eventsCard.title} description={settings.enabled ? formatInAppActiveEventsDescription(locale, activeEventsCount, eventOptions.length) : copy.eventsCard.disabledHint}>
        <div className={`${styles.groups} ${!settings.enabled ? styles.groupsDisabled : ""}`}>
          {eventGroups.map(group => <section key={group.id} className={styles.group}>
              <header className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                <p className={styles.groupDesc}>{group.description}</p>
              </header>
              <div className={styles.groupEvents}>{group.eventKeys.map(renderEventCard)}</div>
            </section>)}
        </div>
      </Card>

      <div className={styles.footerBar}>
        <p className={styles.footerHint}>{copy.footer.hint}</p>
        <div className={styles.footerActions}>
          <label className={styles.testField}>
            <span className={styles.testLabel}>{copy.test.label}</span>
            <select className={styles.testSelect} value={testType} onChange={event => setTestType(event.target.value)} aria-label={copy.test.ariaLabel}>
              {testTypeOptions.map(option => <option key={option.value} value={option.value}>
                  {option.label}
                </option>)}
            </select>
          </label>
          <Btn variant="secondary" icon="mdi:bell-ring-outline" onClick={handleSendTest} disabled={testing}>
            {testing ? copy.test.sending : copy.test.button}
          </Btn>
          <Btn icon="mdi:content-save-outline" onClick={handleSave} disabled={saving}>
            {saving ? copy.save.saving : copy.save.button}
          </Btn>
        </div>
      </div>
    </div>;
}
