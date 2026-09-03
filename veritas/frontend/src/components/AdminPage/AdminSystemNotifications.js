import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { Btn, Card, Switch } from "./AdminUi";
import catalogStyles from "./AdminNotificationCatalog.module.css";
import formStyles from "./NotificationEventFormModal.module.css";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { DEFAULT_IN_APP_SETTINGS, normalizeInAppSettings } from "../../utils/inAppNotificationSettings";
import { SYSTEM_NOTIFICATION_DEFS, SYSTEM_NOTIFICATION_GROUPS, normalizeSystemNotifications } from "../../utils/systemNotificationCatalog";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { getAdminNotificationCenterCopy } from "./adminNotificationCenterI18n";

function persist(nextSettings) {
  const current = getTicketAutomationConfig();
  return saveTicketAutomationConfig({
    ...current,
    notificationSettings: nextSettings
  });
}

export default function AdminSystemNotifications() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminNotificationCenterCopy(locale), [locale]);
  const [settings, setSettings] = useState(() => getTicketAutomationConfig()?.notificationSettings);
  const [draftKey, setDraftKey] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);
  const system = useMemo(() => normalizeSystemNotifications(settings?.systemNotifications), [settings]);
  useEffect(() => {
    fetchTicketAutomationConfig().then(config => setSettings(config?.notificationSettings));
  }, []);
  useEffect(() => {
    if (!draft || !editorRef.current) return;
    editorRef.current.innerHTML = String(draft.body || "");
  }, [draftKey]);
  const openEdit = key => {
    const def = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === key);
    const inApp = normalizeInAppSettings(settings?.inAppSettings);
    const event = def?.inAppKey ? inApp.events[def.inAppKey] || DEFAULT_IN_APP_SETTINGS.events[def.inAppKey] || {} : {};
    setDraftKey(key);
    setDraft({
      ...system[key],
      notifyAssignees: event.notifyAssignees !== false,
      notifyWatchers: event.notifyWatchers === true,
      excludeInternalComments: event.excludeInternalComments === true
    });
  };
  const close = () => {
    if (saving) return;
    setDraftKey("");
    setDraft(null);
  };
  const saveDraft = async () => {
    if (!draft || !draftKey) return;
    const def = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === draftKey);
    const body = editorRef.current ? String(editorRef.current.innerHTML || "") : String(draft.body || "");
    const nextItem = {
      ...draft,
      body
    };
    const nextSystem = {
      ...system,
      [draftKey]: nextItem
    };
    let nextInApp = normalizeInAppSettings(settings?.inAppSettings);
    if (def?.inAppKey) {
      const currentEvent = nextInApp.events[def.inAppKey] || DEFAULT_IN_APP_SETTINGS.events[def.inAppKey] || {};
      const fields = def.inAppFields || [];
      nextInApp = {
        ...nextInApp,
        enabled: nextItem.inAppEnabled ? true : nextInApp.enabled,
        events: {
          ...nextInApp.events,
          [def.inAppKey]: {
            ...currentEvent,
            enabled: nextItem.enabled && nextItem.inAppEnabled,
            ...(fields.includes("notifyAssignees") ? {
              notifyAssignees: nextItem.notifyAssignees !== false
            } : {}),
            ...(fields.includes("notifyWatchers") ? {
              notifyWatchers: nextItem.notifyWatchers === true
            } : {}),
            ...(fields.includes("excludeInternalComments") ? {
              excludeInternalComments: nextItem.excludeInternalComments === true
            } : {})
          }
        }
      };
    }
    const nextSettings = {
      ...settings,
      systemNotifications: nextSystem,
      inAppSettings: nextInApp
    };
    setSaving(true);
    try {
      setSettings(nextSettings);
      await persist(nextSettings);
      toast.success(copy.system.toast.saved);
      close();
    } catch (error) {
      toast.error(error?.message || copy.system.toast.error);
    } finally {
      setSaving(false);
    }
  };
  const toggleEnabled = async (key, enabled) => {
    const def = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === key);
    const nextSystem = {
      ...system,
      [key]: {
        ...system[key],
        enabled
      }
    };
    let nextInApp = normalizeInAppSettings(settings?.inAppSettings);
    if (def?.inAppKey) {
      const inAppOn = enabled && nextSystem[key].inAppEnabled;
      nextInApp = {
        ...nextInApp,
        enabled: inAppOn ? true : nextInApp.enabled,
        events: {
          ...nextInApp.events,
          [def.inAppKey]: {
            ...(nextInApp.events[def.inAppKey] || {}),
            enabled: inAppOn
          }
        }
      };
    }
    const nextSettings = {
      ...settings,
      systemNotifications: nextSystem,
      inAppSettings: nextInApp
    };
    const previous = settings;
    setSettings(nextSettings);
    try {
      await persist(nextSettings);
    } catch (error) {
      setSettings(previous);
      toast.error(error?.message || copy.system.toast.error);
    }
  };
  const def = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === draftKey);
  return <div className={catalogStyles.layout}>
      <Card title={copy.system.title} description={copy.system.description} fill>
        <div className={catalogStyles.groups}>
          {SYSTEM_NOTIFICATION_GROUPS.map(group => <section key={group.id}>
              <header className={catalogStyles.groupHeader}>
                <h3 className={catalogStyles.groupTitle}>{copy.system.groups[group.id] || group.title}</h3>
              </header>
              <div className={catalogStyles.rowsGrid}>
                {SYSTEM_NOTIFICATION_DEFS.filter(item => item.group === group.id).map(item => {
            const state = system[item.key];
            const active = state.enabled !== false;
            return <article key={item.key} className={`${catalogStyles.rowCard} ${active ? "" : catalogStyles.rowOff}`}>
                    <div className={catalogStyles.rowMain}>
                      <p className={catalogStyles.rowTitle}>{copy.system.items[item.key]?.label || item.key}</p>
                      <div className={catalogStyles.rowMeta}>
                        {item.channels.includes("email") ? <span className={`${catalogStyles.chip} ${state.emailEnabled && active ? catalogStyles.chipOn : ""}`}>{copy.catalog.channels.mail}</span> : null}
                        {item.channels.includes("inapp") ? <span className={`${catalogStyles.chip} ${state.inAppEnabled && active ? catalogStyles.chipOn : ""}`}>{copy.system.fields.center || copy.catalog.channels.inapp}</span> : null}
                        <span className={catalogStyles.badge}>{copy.system.items[item.key]?.recipients || item.recipients}</span>
                      </div>
                    </div>
                    <div className={catalogStyles.rowCardFooter}>
                      <Switch checked={active} onChange={value => toggleEnabled(item.key, value)} label={active ? copy.catalog.masterOn : copy.catalog.masterOff} />
                      <div className={catalogStyles.rowActions}>
                        <Btn size="sm" variant="secondary" icon="mdi:pencil-outline" onClick={() => openEdit(item.key)}>
                          {copy.catalog.edit}
                        </Btn>
                      </div>
                    </div>
                  </article>;
          })}
              </div>
            </section>)}
        </div>
      </Card>

      {draft && def ? createPortal(<div className={layout.overlay} onClick={close} role="presentation">
          <div className={layout.shell} style={{
        maxWidth: "min(860px, 100%)"
      }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className={layout.accentBar} aria-hidden />
            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon="mdi:email-edit-outline" />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>Notifications</p>
                  <h2 className={layout.title}>{copy.system.items[def.key]?.label || def.key}</h2>
                  <p className={layout.subtitle}>{copy.system.items[def.key]?.hint || def.recipients}</p>
                </div>
              </div>
              <button type="button" className={layout.closeBtn} onClick={close} aria-label={copy.variables.close}>
                <FaTimes />
              </button>
            </header>
            <div className={layout.body} style={{
          display: "block",
          padding: "16px 20px",
          overflow: "auto"
        }}>
              <div className={formStyles.statusRow}>
                <div>
                  <div className={formStyles.statusLabel}>{copy.system.fields.enabled}</div>
                  <p className={formStyles.statusHint}>{copy.system.fields.enabledHint}</p>
                </div>
                <Switch checked={draft.enabled !== false} onChange={on => setDraft(prev => ({
              ...prev,
              enabled: on
            }))} />
              </div>
              {def.channels.includes("email") ? <div className={formStyles.statusRow}>
                  <div>
                    <div className={formStyles.statusLabel}>{copy.catalog.channels.mail}</div>
                    <p className={formStyles.statusHint}>{copy.system.fields.emailHint}</p>
                  </div>
                  <Switch checked={draft.emailEnabled === true} onChange={on => setDraft(prev => ({
              ...prev,
              emailEnabled: on
            }))} />
                </div> : null}
              {def.channels.includes("inapp") ? <div className={formStyles.statusRow}>
                  <div>
                    <div className={formStyles.statusLabel}>{copy.system.fields.center || copy.catalog.channels.inapp}</div>
                    <p className={formStyles.statusHint}>{copy.system.fields.inAppHint}</p>
                  </div>
                  <Switch checked={draft.inAppEnabled === true} onChange={on => setDraft(prev => ({
              ...prev,
              inAppEnabled: on
            }))} />
                </div> : null}
              {(def.inAppFields || []).includes("notifyAssignees") ? <div className={formStyles.statusRow}>
                  <div>
                    <div className={formStyles.statusLabel}>{copy.system.fields.notifyAssignees}</div>
                    <p className={formStyles.statusHint}>{copy.system.fields.notifyAssigneesHint}</p>
                  </div>
                  <Switch checked={draft.notifyAssignees !== false} onChange={on => setDraft(prev => ({
              ...prev,
              notifyAssignees: on
            }))} />
                </div> : null}
              {(def.inAppFields || []).includes("notifyWatchers") ? <div className={formStyles.statusRow}>
                  <div>
                    <div className={formStyles.statusLabel}>{copy.system.fields.notifyWatchers}</div>
                    <p className={formStyles.statusHint}>{copy.system.fields.notifyWatchersHint}</p>
                  </div>
                  <Switch checked={draft.notifyWatchers === true} onChange={on => setDraft(prev => ({
              ...prev,
              notifyWatchers: on
            }))} />
                </div> : null}
              {(def.inAppFields || []).includes("excludeInternalComments") ? <div className={formStyles.statusRow}>
                  <div>
                    <div className={formStyles.statusLabel}>{copy.system.fields.excludeInternal}</div>
                    <p className={formStyles.statusHint}>{copy.system.fields.excludeInternalHint}</p>
                  </div>
                  <Switch checked={draft.excludeInternalComments === true} onChange={on => setDraft(prev => ({
              ...prev,
              excludeInternalComments: on
            }))} />
                </div> : null}

              <div className={layout.field} style={{
            marginTop: "12px"
          }}>
                <label className={layout.label}>{copy.system.fields.subject}</label>
                <input className={layout.input} value={draft.subject || ""} onChange={event => setDraft(prev => ({
              ...prev,
              subject: event.target.value
            }))} />
              </div>
              <div className={layout.field} style={{
            marginTop: "12px"
          }}>
                <label className={layout.label}>{copy.system.fields.body}</label>
                <div className={formStyles.toolbar}>
                  <button type="button" className={formStyles.toolBtn} onClick={() => {
                editorRef.current?.focus();
                document.execCommand("bold", false, null);
              }}><strong>B</strong></button>
                  <button type="button" className={formStyles.toolBtn} onClick={() => {
                editorRef.current?.focus();
                document.execCommand("italic", false, null);
              }}><em>I</em></button>
                </div>
                <div ref={editorRef} className={formStyles.editor} contentEditable suppressContentEditableWarning onInput={event => setDraft(prev => ({
              ...prev,
              body: String(event.currentTarget?.innerHTML || "")
            }))} />
                <p className={formStyles.hintText} style={{
              marginTop: "8px"
            }}>{copy.system.fields.variablesHint}</p>
                <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px"
            }}>
                  {def.variables.map(variable => <button key={variable} type="button" className={formStyles.toolBtn} onClick={() => {
                const token = `{{${variable}}}`;
                if (document.activeElement?.tagName === "INPUT") {
                  const input = document.activeElement;
                  const start = input.selectionStart || 0;
                  const next = `${input.value.slice(0, start)}${token}${input.value.slice(input.selectionEnd || start)}`;
                  setDraft(prev => ({
                    ...prev,
                    subject: next
                  }));
                  return;
                }
                editorRef.current?.focus();
                document.execCommand("insertText", false, token);
                setDraft(prev => ({
                  ...prev,
                  body: String(editorRef.current?.innerHTML || "")
                }));
              }}>
                      {`{{${variable}}}`}
                    </button>)}
                </div>
              </div>
              {def.channels.includes("inapp") ? <>
                  <div className={layout.field} style={{
              marginTop: "12px"
            }}>
                    <label className={layout.label}>{copy.system.fields.inAppTitle}</label>
                    <input className={layout.input} value={draft.inAppTitle || ""} onChange={event => setDraft(prev => ({
                ...prev,
                inAppTitle: event.target.value
              }))} />
                  </div>
                  <div className={layout.field} style={{
              marginTop: "12px"
            }}>
                    <label className={layout.label}>{copy.system.fields.inAppBody}</label>
                    <textarea className={layout.input} rows={3} value={draft.inAppBody || ""} onChange={event => setDraft(prev => ({
                ...prev,
                inAppBody: event.target.value
              }))} />
                  </div>
                </> : null}
            </div>
            <footer className={layout.footer}>
              <span className={layout.footerHint}>{def.recipients}</span>
              <div className={layout.footerActions}>
                <button type="button" className={layout.ghostBtn} onClick={close} disabled={saving}>{copy.templates.cancel}</button>
                <button type="button" className={layout.primaryBtn} onClick={saveDraft} disabled={saving}>
                  {saving ? <Icon icon="mdi:loading" className={layout.spinning} /> : <Icon icon="mdi:content-save-outline" />}
                  {copy.templates.save}
                </button>
              </div>
            </footer>
          </div>
        </div>, document.getElementById("modal-root") || document.body) : null}
    </div>;
}
