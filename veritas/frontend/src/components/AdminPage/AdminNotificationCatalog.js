import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Btn, BtnIcon, Card, Switch } from "./AdminUi";
import NotificationEventFormModal from "./NotificationEventFormModal";
import NotificationVariablesModal from "./NotificationVariablesModal";
import styles from "./AdminNotificationCatalog.module.css";
import { fetchClientsList } from "../../api/clients";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { DEFAULT_IN_APP_SETTINGS, IN_APP_EVENT_OPTIONS, normalizeInAppSettings } from "../../utils/inAppNotificationSettings";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { getAdminNotificationCenterCopy, interpolate } from "./adminNotificationCenterI18n";
import { NOTIFICATION_SOURCE_OPTIONS, buildDefaultNotificationEvent, getElementOption, getInAppEventKey, getSourceOption, isDispatchWiredEvent, isInAppOnlyEvent, isSoonElementKey, normalizeNotificationEventChannels, parseEmailTags } from "./notificationEventConstants";

function newEventId() {
  return `notif-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function stripInAppChannels(channels = []) {
  return normalizeNotificationEventChannels({
    channels
  }).filter(key => key !== "inapp" && key !== "browser" && key !== "sms");
}

async function persistNotificationSettings(nextSettings) {
  const current = getTicketAutomationConfig();
  return saveTicketAutomationConfig({
    ...current,
    notificationSettings: nextSettings
  });
}

function catalogChannelsFor(source, element) {
  if (isInAppOnlyEvent(source, element)) return ["inapp"];
  const channels = ["mail", "webhook"];
  if (getInAppEventKey(source, element)) channels.unshift("inapp");
  return channels;
}

export default function AdminNotificationCatalog() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminNotificationCenterCopy(locale), [locale]);
  const [settings, setSettings] = useState(() => getTicketAutomationConfig()?.notificationSettings);
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null);
  const [inAppDraft, setInAppDraft] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const editorRef = useRef(null);
  useEffect(() => {
    fetchTicketAutomationConfig().then(config => {
      setSettings(config?.notificationSettings);
    });
    fetchClientsList().then(rows => setClients(Array.isArray(rows) ? rows : [])).catch(() => setClients([]));
  }, []);
  const inAppSettings = useMemo(() => normalizeInAppSettings(settings?.inAppSettings), [settings]);
  const events = Array.isArray(settings?.notificationEvents) ? settings.notificationEvents : [];
  const templates = Array.isArray(settings?.templates) ? settings.templates : [];
  const webhooks = Array.isArray(settings?.webhooks) ? settings.webhooks : [];
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return NOTIFICATION_SOURCE_OPTIONS.map(source => {
      const elements = source.elements.filter(element => {
        if (!needle) return true;
        return `${source.label} ${element.label} ${source.key} ${element.key}`.toLowerCase().includes(needle);
      });
      return {
        ...source,
        elements
      };
    }).filter(source => source.elements.length > 0);
  }, [query]);
  const describeRow = (source, element) => {
    const inAppKey = getInAppEventKey(source.key, element.key);
    const matching = events.filter(item => item.source === source.key && item.element === element.key);
    const globalRule = matching.find(item => item.scopeType !== "enterprise") || null;
    const overrides = matching.filter(item => item.scopeType === "enterprise");
    const ruleChannels = stripInAppChannels(globalRule?.channels || globalRule || []);
    const inAppOn = Boolean(inAppKey) && inAppSettings.enabled !== false && inAppSettings.events[inAppKey]?.enabled !== false;
    const mailOn = Boolean(globalRule?.enabled !== false && ruleChannels.includes("mail"));
    const webhookOn = Boolean(globalRule?.enabled !== false && ruleChannels.includes("webhook"));
    const active = inAppOn || mailOn || webhookOn;
    return {
      inAppKey,
      globalRule,
      overrides,
      inAppOn,
      mailOn,
      webhookOn,
      active,
      available: catalogChannelsFor(source.key, element.key)
    };
  };
  const openEditor = (source, element, existingRule = null, mode = "edit") => {
    const base = existingRule || {
      ...buildDefaultNotificationEvent(),
      id: newEventId(),
      source: source.key,
      element: element.key,
      channels: isInAppOnlyEvent(source.key, element.key) ? [] : ["mail"],
      channel: isInAppOnlyEvent(source.key, element.key) ? "" : "mail",
      enabled: true
    };
    const inAppKey = getInAppEventKey(source.key, element.key);
    setModalMode(existingRule ? mode : "create");
    const includeInApp = Boolean(inAppKey) && base.scopeType !== "enterprise" && (existingRule ? normalizeInAppSettings(settings?.inAppSettings).events[inAppKey]?.enabled !== false : true);
    setDraft({
      ...base,
      channels: [...(includeInApp ? ["inapp"] : []), ...stripInAppChannels(base)]
    });
    setInAppDraft(inAppKey ? {
      ...(DEFAULT_IN_APP_SETTINGS.events[inAppKey] || {}),
      ...(inAppSettings.events[inAppKey] || {})
    } : null);
  };
  const closeEditor = () => {
    if (saving) return;
    setDraft(null);
    setInAppDraft(null);
    setVariablesOpen(false);
  };
  const saveEditor = async () => {
    if (!draft) return;
    const source = getSourceOption(draft.source);
    const element = getElementOption(source.key, draft.element);
    const selected = normalizeNotificationEventChannels(draft);
    const wantsInApp = selected.includes("inapp") || selected.includes("browser");
    const ruleChannels = stripInAppChannels(selected);
    const inAppKey = getInAppEventKey(source.key, element.key);
    const requiresWebhook = ruleChannels.includes("webhook");
    const requiresEmail = ruleChannels.includes("mail");
    if (requiresWebhook && !String(draft.webhookId || "").trim()) {
      toast.error("Sélectionnez un connecteur.");
      return;
    }
    if (requiresEmail && parseEmailTags(draft.emailTo).length === 0) {
      toast.error("Indiquez au moins un destinataire email.");
      return;
    }
    if (draft.scopeType === "enterprise" && !String(draft.enterpriseId || "").trim()) {
      toast.error("Sélectionnez une entreprise.");
      return;
    }
    if (draft.useTemplate && !String(draft.templateId || "").trim()) {
      toast.error("Sélectionnez un template.");
      return;
    }
    const customMessage = editorRef.current ? String(editorRef.current.innerHTML || "") : String(draft.customMessage || "");
    const payload = {
      id: draft.id || newEventId(),
      source: source.key,
      element: element.key,
      scopeType: draft.scopeType === "enterprise" ? "enterprise" : "all",
      enterpriseId: draft.scopeType === "enterprise" ? String(draft.enterpriseId || "").trim() : "",
      daysBefore: isSoonElementKey(element.key) ? Number(draft.daysBefore || 30) : 30,
      channels: ruleChannels,
      channel: ruleChannels[0] || "",
      webhookId: requiresWebhook ? String(draft.webhookId || "").trim() : "",
      emailTo: requiresEmail ? String(draft.emailTo || "").trim() : "",
      emailCc: requiresEmail ? String(draft.emailCc || "").trim() : "",
      emailSubject: requiresEmail ? String(draft.emailSubject || "").trim() : "",
      useTemplate: draft.useTemplate === true,
      templateId: draft.useTemplate === true ? String(draft.templateId || "").trim() : "",
      customMessage: draft.useTemplate === true ? "" : customMessage.replace(/\soutline:\s*[^;"']+;?/gi, ""),
      teamsThemeColor: String(draft.teamsThemeColor || "#13BA8E"),
      enabled: draft.enabled !== false && ruleChannels.length > 0
    };
    setSaving(true);
    try {
      const currentEvents = Array.isArray(settings?.notificationEvents) ? settings.notificationEvents : [];
      let nextEvents = currentEvents;
      if (ruleChannels.length > 0) {
        const exists = currentEvents.some(item => String(item.id) === String(payload.id));
        nextEvents = exists ? currentEvents.map(item => String(item.id) === String(payload.id) ? payload : item) : [...currentEvents, payload];
      } else {
        nextEvents = currentEvents.filter(item => String(item.id) !== String(payload.id));
      }
      let nextInApp = inAppSettings;
      if (inAppKey && payload.scopeType !== "enterprise") {
        nextInApp = {
          ...inAppSettings,
          enabled: wantsInApp ? true : inAppSettings.enabled,
          events: {
            ...inAppSettings.events,
            [inAppKey]: {
              ...(inAppSettings.events[inAppKey] || DEFAULT_IN_APP_SETTINGS.events[inAppKey] || {}),
              ...(inAppDraft || {}),
              enabled: wantsInApp
            }
          }
        };
      }
      const nextSettings = {
        ...settings,
        notificationEvents: nextEvents,
        inAppSettings: nextInApp
      };
      setSettings(nextSettings);
      await persistNotificationSettings(nextSettings);
      toast.success(copy.catalog.toast.saved);
      closeEditor();
    } catch (error) {
      toast.error(error?.message || copy.catalog.toast.error);
    } finally {
      setSaving(false);
    }
  };
  const deleteRule = async ruleId => {
    const nextEvents = events.filter(item => String(item.id) !== String(ruleId));
    const nextSettings = {
      ...settings,
      notificationEvents: nextEvents
    };
    const previous = settings;
    setSettings(nextSettings);
    try {
      await persistNotificationSettings(nextSettings);
      toast.success(copy.catalog.toast.deleted);
    } catch (error) {
      setSettings(previous);
      toast.error(error?.message || copy.catalog.toast.error);
    }
  };
  const toggleRow = async (source, element, enabled) => {
    const state = describeRow(source, element);
    if (enabled && !state.globalRule && !state.inAppKey) {
      openEditor(source, element, null);
      return;
    }
    const nextInApp = state.inAppKey ? {
      ...inAppSettings,
      enabled: enabled ? true : inAppSettings.enabled,
      events: {
        ...inAppSettings.events,
        [state.inAppKey]: {
          ...(inAppSettings.events[state.inAppKey] || DEFAULT_IN_APP_SETTINGS.events[state.inAppKey] || {}),
          enabled
        }
      }
    } : inAppSettings;
    const nextEvents = events.map(item => item.source === source.key && item.element === element.key && item.scopeType !== "enterprise" ? {
      ...item,
      enabled
    } : item);
    const nextSettings = {
      ...settings,
      notificationEvents: nextEvents,
      inAppSettings: nextInApp
    };
    const previous = settings;
    setSettings(nextSettings);
    try {
      await persistNotificationSettings(nextSettings);
      toast.success(copy.catalog.toast.toggled);
    } catch (error) {
      setSettings(previous);
      toast.error(error?.message || copy.catalog.toast.error);
    }
  };
  const inAppEventOption = draft ? IN_APP_EVENT_OPTIONS.find(item => item.key === getInAppEventKey(draft.source, draft.element)) : null;
  return <div className={styles.layout}>
      <Card title={copy.catalog.title} description={copy.catalog.description} fill>
        <div className={styles.searchRow}>
          <input className={styles.search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.catalog.searchPlaceholder} />
        </div>
        {groups.length === 0 ? <p className={styles.empty}>{interpolate(copy.catalog.emptySearch, {
        query
      })}</p> : <div className={styles.groups}>
            {groups.map(source => <section key={source.key}>
                <header className={styles.groupHeader}>
                  <h3 className={styles.groupTitle}>{source.label}</h3>
                </header>
                <div className={styles.rows}>
                  {source.elements.map(element => {
            const state = describeRow(source, element);
            return <div key={`${source.key}.${element.key}`}>
                      <article className={`${styles.row} ${state.active ? "" : styles.rowOff}`}>
                        <div className={styles.rowMain}>
                          <p className={styles.rowTitle}>{element.label}</p>
                          <div className={styles.rowMeta}>
                            {state.available.map(channel => {
                  const on = channel === "inapp" ? state.inAppOn : channel === "mail" ? state.mailOn : state.webhookOn;
                  return <span key={channel} className={`${styles.chip} ${on ? styles.chipOn : ""}`} title={copy.catalog.channelHints[channel]}>
                                  {copy.catalog.channels[channel]}
                                </span>;
                })}
                            {!state.globalRule && !state.inAppKey ? <span className={styles.badge}>{copy.catalog.noRule}</span> : null}
                            {isInAppOnlyEvent(source.key, element.key) ? <span className={styles.badge}>{copy.catalog.inAppOnly}</span> : null}
                            {!isDispatchWiredEvent(source.key, element.key) && !isInAppOnlyEvent(source.key, element.key) ? <span className={styles.badge}>{copy.catalog.unwired}</span> : null}
                            {state.overrides.length > 0 ? <span className={styles.badge}>{interpolate(copy.catalog.overrideCount, {
                    count: state.overrides.length
                  })}</span> : null}
                          </div>
                        </div>
                        <Switch checked={state.active} onChange={value => toggleRow(source, element, value)} label={state.active ? copy.catalog.masterOn : copy.catalog.masterOff} />
                        <div className={styles.rowActions}>
                          <Btn size="sm" variant="secondary" icon="mdi:pencil-outline" onClick={() => openEditor(source, element, state.globalRule)}>
                            {copy.catalog.edit}
                          </Btn>
                          {!isInAppOnlyEvent(source.key, element.key) ? <BtnIcon icon="mdi:office-building-plus-outline" title={copy.catalog.addOverride} onClick={() => openEditor(source, element, {
                    ...buildDefaultNotificationEvent(),
                    id: newEventId(),
                    source: source.key,
                    element: element.key,
                    scopeType: "enterprise",
                    channels: ["mail"],
                    channel: "mail"
                  }, "create")} /> : null}
                        </div>
                      </article>
                      {state.overrides.map(override => {
                const company = clients.find(client => String(client?.id) === String(override.enterpriseId));
                return <article key={override.id} className={`${styles.row} ${override.enabled === false ? styles.rowOff : ""}`} style={{
                  marginLeft: 18,
                  marginTop: 6
                }}>
                          <div className={styles.rowMain}>
                            <p className={styles.rowTitle}>{company?.name || override.enterpriseId || "Entreprise"}</p>
                            <div className={styles.rowMeta}>
                              {normalizeNotificationEventChannels(override).map(channel => <span key={channel} className={`${styles.chip} ${styles.chipOn}`}>{copy.catalog.channels[channel] || channel}</span>)}
                            </div>
                          </div>
                          <div />
                          <div className={styles.rowActions}>
                            <Btn size="sm" variant="secondary" icon="mdi:pencil-outline" onClick={() => openEditor(source, element, override)}>
                              {copy.catalog.edit}
                            </Btn>
                            <BtnIcon icon="mdi:delete-outline" title={copy.templates.delete} onClick={() => deleteRule(override.id)} />
                          </div>
                        </article>;
              })}
                    </div>;
          })}
                </div>
              </section>)}
          </div>}
      </Card>

      <NotificationEventFormModal open={Boolean(draft)} mode={modalMode} draft={draft} setDraft={setDraft} saving={saving} availableClients={clients} webhooks={webhooks} notificationTemplates={templates} availableChannels={draft ? catalogChannelsFor(draft.source, draft.element).filter(channel => draft.scopeType !== "enterprise" || channel !== "inapp") : ["mail", "webhook"]} inAppEventOption={inAppEventOption} inAppEventSettings={inAppDraft} onInAppEventSettingsChange={setInAppDraft} formCopy={copy.form} editorRef={editorRef} onClose={closeEditor} onSave={saveEditor} onOpenVariables={() => setVariablesOpen(true)} />
      <NotificationVariablesModal open={variablesOpen} source={draft?.source} element={draft?.element} title={copy.variables.title} intro={copy.variables.intro} closeLabel={copy.variables.close} onClose={() => setVariablesOpen(false)} onInsert={token => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand("insertText", false, token);
      setDraft(prev => prev ? {
        ...prev,
        customMessage: String(editorRef.current?.innerHTML || "")
      } : prev);
      setVariablesOpen(false);
    }} />
    </div>;
}
