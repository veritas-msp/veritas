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
import { sendNotificationEmailPreview, uploadNotificationEmailAsset } from "../../api/notificationEmailPreview";
import { DEFAULT_IN_APP_SETTINGS, normalizeInAppSettings } from "../../utils/inAppNotificationSettings";
import { SYSTEM_NOTIFICATION_DEFS, SYSTEM_NOTIFICATION_GROUPS, normalizeSystemNotifications } from "../../utils/systemNotificationCatalog";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { toRichPreviewHtml } from "../../utils/sanitizeHtml";
import { renderNotificationTemplate, wrapVeritasEmailPreview } from "../../utils/notificationEmailPreview";
import { getAdminNotificationCenterCopy, interpolate } from "./adminNotificationCenterI18n";

function persist(nextSettings) {
  const current = getTicketAutomationConfig();
  return saveTicketAutomationConfig({
    ...current,
    notificationSettings: nextSettings
  });
}

function syncEditorBody(editorRef, setDraft) {
  setDraft(prev => ({
    ...prev,
    body: String(editorRef.current?.innerHTML || prev?.body || "")
  }));
}

function insertVariable(variable, editorRef, setDraft) {
  const token = `{{${variable}}}`;
  if (document.activeElement?.tagName === "INPUT") {
    const input = document.activeElement;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || start;
    const next = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
    setDraft(prev => ({
      ...prev,
      subject: next
    }));
    return;
  }
  editorRef.current?.focus();
  document.execCommand("insertText", false, token);
  syncEditorBody(editorRef, setDraft);
}

export default function AdminSystemNotifications() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminNotificationCenterCopy(locale), [locale]);
  const [settings, setSettings] = useState(() => getTicketAutomationConfig()?.notificationSettings);
  const [draftKey, setDraftKey] = useState("");
  const [draft, setDraft] = useState(null);
  const [activeSection, setActiveSection] = useState("channels");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [sendingPreview, setSendingPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const system = useMemo(() => normalizeSystemNotifications(settings?.systemNotifications), [settings]);

  useEffect(() => {
    fetchTicketAutomationConfig().then(config => setSettings(config?.notificationSettings));
  }, []);

  useEffect(() => {
    if (!draft || !editorRef.current) return;
    editorRef.current.innerHTML = String(draft.body || "");
  }, [draftKey]);

  const def = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === draftKey);

  const sections = useMemo(() => {
    if (!def) return [];
    const list = [{
      id: "channels",
      label: copy.system.sections?.channels?.label || "Activation",
      description: copy.system.sections?.channels?.description || "",
      icon: "mdi:toggle-switch-outline"
    }];
    if (def.channels.includes("email")) {
      list.push({
        id: "email",
        label: copy.system.sections?.email?.label || "Email",
        description: copy.system.sections?.email?.description || "",
        icon: "mdi:email-outline"
      });
    }
    if (def.channels.includes("inapp")) {
      list.push({
        id: "inapp",
        label: copy.system.sections?.inapp?.label || "Centre de notifications",
        description: copy.system.sections?.inapp?.description || "",
        icon: "mdi:bell-outline"
      });
    }
    return list;
  }, [def, copy]);

  useEffect(() => {
    if (!sections.length) return;
    if (!sections.some(section => section.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  const openEdit = key => {
    const itemDef = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === key);
    const inApp = normalizeInAppSettings(settings?.inAppSettings);
    const event = itemDef?.inAppKey ? inApp.events[itemDef.inAppKey] || DEFAULT_IN_APP_SETTINGS.events[itemDef.inAppKey] || {} : {};
    setDraftKey(key);
    setActiveSection("channels");
    setShowEmailPreview(false);
    setDraft({
      ...system[key],
      notifyAssignees: event.notifyAssignees !== false,
      notifyWatchers: event.notifyWatchers === true,
      excludeInternalComments: event.excludeInternalComments === true
    });
  };

  const close = () => {
    if (saving || sendingPreview) return;
    setDraftKey("");
    setDraft(null);
    setActiveSection("channels");
    setShowEmailPreview(false);
  };

  const saveDraft = async () => {
    if (!draft || !draftKey) return;
    const itemDef = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === draftKey);
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
    if (itemDef?.inAppKey) {
      const currentEvent = nextInApp.events[itemDef.inAppKey] || DEFAULT_IN_APP_SETTINGS.events[itemDef.inAppKey] || {};
      const fields = itemDef.inAppFields || [];
      nextInApp = {
        ...nextInApp,
        enabled: nextItem.inAppEnabled ? true : nextInApp.enabled,
        events: {
          ...nextInApp.events,
          [itemDef.inAppKey]: {
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
    const itemDef = SYSTEM_NOTIFICATION_DEFS.find(item => item.key === key);
    const nextSystem = {
      ...system,
      [key]: {
        ...system[key],
        enabled
      }
    };
    let nextInApp = normalizeInAppSettings(settings?.inAppSettings);
    if (itemDef?.inAppKey) {
      const inAppOn = enabled && nextSystem[key].inAppEnabled;
      nextInApp = {
        ...nextInApp,
        enabled: inAppOn ? true : nextInApp.enabled,
        events: {
          ...nextInApp.events,
          [itemDef.inAppKey]: {
            ...(nextInApp.events[itemDef.inAppKey] || {}),
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

  const inAppFields = def?.inAppFields || [];

  const execEditorCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    syncEditorBody(editorRef, setDraft);
  };

  const insertImageUrl = () => {
    const rawUrl = window.prompt(copy.system.fields.imageUrlPrompt || "https://", "https://");
    if (!rawUrl) return;
    const url = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error(copy.system.fields.imageUrlInvalid);
      return;
    }
    execEditorCommand("insertImage", url);
  };

  const onPickImageFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploaded = await uploadNotificationEmailAsset(file);
      const url = String(uploaded?.url || "").trim();
      if (!url) throw new Error(copy.system.fields.imageUploadError);
      execEditorCommand("insertImage", url);
    } catch (error) {
      toast.error(error?.message || copy.system.fields.imageUploadError);
    } finally {
      setUploadingImage(false);
    }
  };

  const currentBodyHtml = () => {
    if (editorRef.current) return String(editorRef.current.innerHTML || "");
    return String(draft?.body || "");
  };

  const previewHtmlDoc = useMemo(() => {
    if (!draft || !showEmailPreview) return "";
    const renderedBody = renderNotificationTemplate(String(draft.body || ""));
    const renderedTitle = renderNotificationTemplate(String(draft.title || draft.subject || "Notification"));
    return wrapVeritasEmailPreview({
      title: renderedTitle,
      content: toRichPreviewHtml(renderedBody)
    });
  }, [draft, showEmailPreview]);

  const toggleEmailPreview = () => {
    syncEditorBody(editorRef, setDraft);
    setShowEmailPreview(prev => !prev);
  };

  const sendPreviewEmail = async () => {
    if (!draft) return;
    syncEditorBody(editorRef, setDraft);
    const htmlContent = currentBodyHtml();
    setSendingPreview(true);
    try {
      const result = await sendNotificationEmailPreview({
        subject: draft.subject || "",
        title: draft.title || draft.subject || "",
        htmlContent
      });
      const email = result?.to || "";
      if (result?.skipped) {
        toast.info(interpolate(copy.system.fields.previewSkipped, {
          email
        }));
      } else {
        toast.success(interpolate(copy.system.fields.previewSent, {
          email
        }));
      }
    } catch (error) {
      toast.error(error?.message || copy.system.fields.previewError);
    } finally {
      setSendingPreview(false);
    }
  };

  const renderSectionContent = () => {
    if (!draft || !def) return null;
    switch (activeSection) {
      case "channels":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{copy.system.sections?.channels?.title || "Activation"}</h3>
              <p className={layout.sectionDesc}>{copy.system.sections?.channels?.desc || ""}</p>
            </div>
            <div className={layout.fieldGroupBlock}>
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
            </div>
            {inAppFields.length ? <div className={layout.fieldGroupBlock}>
                <h4 className={layout.fieldGroupTitle}>{copy.system.sections?.channels?.recipientsTitle || "Destinataires"}</h4>
                {inAppFields.includes("notifyAssignees") ? <div className={formStyles.statusRow}>
                    <div>
                      <div className={formStyles.statusLabel}>{copy.system.fields.notifyAssignees}</div>
                      <p className={formStyles.statusHint}>{copy.system.fields.notifyAssigneesHint}</p>
                    </div>
                    <Switch checked={draft.notifyAssignees !== false} onChange={on => setDraft(prev => ({
                ...prev,
                notifyAssignees: on
              }))} />
                  </div> : null}
                {inAppFields.includes("notifyWatchers") ? <div className={formStyles.statusRow}>
                    <div>
                      <div className={formStyles.statusLabel}>{copy.system.fields.notifyWatchers}</div>
                      <p className={formStyles.statusHint}>{copy.system.fields.notifyWatchersHint}</p>
                    </div>
                    <Switch checked={draft.notifyWatchers === true} onChange={on => setDraft(prev => ({
                ...prev,
                notifyWatchers: on
              }))} />
                  </div> : null}
                {inAppFields.includes("excludeInternalComments") ? <div className={formStyles.statusRow}>
                    <div>
                      <div className={formStyles.statusLabel}>{copy.system.fields.excludeInternal}</div>
                      <p className={formStyles.statusHint}>{copy.system.fields.excludeInternalHint}</p>
                    </div>
                    <Switch checked={draft.excludeInternalComments === true} onChange={on => setDraft(prev => ({
                ...prev,
                excludeInternalComments: on
              }))} />
                  </div> : null}
              </div> : null}
          </>;
      case "email":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{copy.system.sections?.email?.title || "Email"}</h3>
              <p className={layout.sectionDesc}>{copy.system.sections?.email?.desc || ""}</p>
            </div>
            <div className={layout.fieldGroupBlock}>
              <div className={layout.field}>
                <label className={layout.label}>{copy.system.fields.subject}</label>
                <input className={layout.input} value={draft.subject || ""} onChange={event => setDraft(prev => ({
                ...prev,
                subject: event.target.value
              }))} />
              </div>
            </div>
            <div className={layout.fieldGroupBlock}>
              <div className={layout.field}>
                <label className={layout.label}>{copy.system.fields.body}</label>
                <div className={formStyles.toolbar}>
                  <button type="button" className={formStyles.toolBtn} title="Bold" onClick={() => execEditorCommand("bold")}><strong>B</strong></button>
                  <button type="button" className={formStyles.toolBtn} title="Italic" onClick={() => execEditorCommand("italic")}><em>I</em></button>
                  <button type="button" className={formStyles.toolBtn} title="Underline" onClick={() => execEditorCommand("underline")}><u>U</u></button>
                  <span className={formStyles.toolbarDivider} aria-hidden />
                  <button type="button" className={formStyles.toolBtn} onClick={() => execEditorCommand("insertUnorderedList")}>
                    <Icon icon="mdi:format-list-bulleted" aria-hidden />
                    {copy.system.fields.toolbarList}
                  </button>
                  <button type="button" className={formStyles.toolBtn} onClick={() => {
                  const url = window.prompt(copy.system.fields.toolbarLink, "https://");
                  if (url) execEditorCommand("createLink", url);
                }}>
                    <Icon icon="mdi:link-variant" aria-hidden />
                    {copy.system.fields.toolbarLink}
                  </button>
                  <span className={formStyles.toolbarDivider} aria-hidden />
                  <button type="button" className={formStyles.toolBtn} onClick={insertImageUrl}>
                    <Icon icon="mdi:link-box-outline" aria-hidden />
                    {copy.system.fields.toolbarImageUrl}
                  </button>
                  <button type="button" className={formStyles.toolBtn} disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
                    <Icon icon={uploadingImage ? "mdi:loading" : "mdi:image-outline"} className={uploadingImage ? layout.spinning : undefined} aria-hidden />
                    {copy.system.fields.toolbarImageUpload}
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onPickImageFile} />
                  <input type="color" className={formStyles.colorInput} onChange={e => execEditorCommand("foreColor", e.target.value)} title="Text color" />
                  <span className={formStyles.toolbarDivider} aria-hidden />
                  <button type="button" className={formStyles.toolBtn} onClick={toggleEmailPreview}>
                    <Icon icon={showEmailPreview ? "mdi:eye-off-outline" : "mdi:eye-outline"} aria-hidden />
                    {showEmailPreview ? copy.system.fields.toolbarHidePreview : copy.system.fields.toolbarPreview}
                  </button>
                </div>
                <div ref={editorRef} className={formStyles.editor} contentEditable suppressContentEditableWarning onInput={event => setDraft(prev => ({
                ...prev,
                body: String(event.currentTarget?.innerHTML || "")
              }))} />
                <p className={formStyles.hintText}>{copy.system.fields.variablesHint}</p>
                <div className={formStyles.variableChips}>
                  {def.variables.map(variable => <button key={variable} type="button" className={formStyles.toolBtn} onClick={() => insertVariable(variable, editorRef, setDraft)}>
                      {`{{${variable}}}`}
                    </button>)}
                </div>
                <div className={formStyles.emailPreviewActions}>
                  <button type="button" className={layout.ghostBtn} onClick={sendPreviewEmail} disabled={sendingPreview || saving}>
                    {sendingPreview ? <Icon icon="mdi:loading" className={layout.spinning} /> : <Icon icon="mdi:email-fast-outline" />}
                    {sendingPreview ? copy.system.fields.sendingPreview : copy.system.fields.sendPreview}
                  </button>
                </div>
                {showEmailPreview ? <div className={formStyles.emailPreviewWrap}>
                    <div className={formStyles.emailPreviewHeader}>
                      <span className={formStyles.emailPreviewLabel}>{copy.system.fields.previewLabel}</span>
                      <span className={formStyles.emailPreviewLabel}>
                        {copy.system.fields.previewSubject} : {renderNotificationTemplate(String(draft.subject || ""))}
                      </span>
                    </div>
                    <iframe className={formStyles.emailPreviewFrame} title="email-preview" sandbox="" srcDoc={previewHtmlDoc} />
                  </div> : null}
              </div>
            </div>
          </>;
      case "inapp":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{copy.system.sections?.inapp?.title || "Centre de notifications"}</h3>
              <p className={layout.sectionDesc}>{copy.system.sections?.inapp?.desc || ""}</p>
            </div>
            <div className={layout.fieldGroupBlock}>
              <div className={layout.field}>
                <label className={layout.label}>{copy.system.fields.inAppTitle}</label>
                <input className={layout.input} value={draft.inAppTitle || ""} onChange={event => setDraft(prev => ({
                ...prev,
                inAppTitle: event.target.value
              }))} />
              </div>
            </div>
            <div className={layout.fieldGroupBlock}>
              <div className={layout.field}>
                <label className={layout.label}>{copy.system.fields.inAppBody}</label>
                <textarea className={layout.input} rows={4} value={draft.inAppBody || ""} onChange={event => setDraft(prev => ({
                ...prev,
                inAppBody: event.target.value
              }))} />
              </div>
            </div>
          </>;
      default:
        return null;
    }
  };

  return <div className={catalogStyles.layout}>
      <Card title={copy.system.title} description={copy.system.description} fill>
        <div className={catalogStyles.groups}>
          {SYSTEM_NOTIFICATION_GROUPS.map(group => <section key={group.id} className={catalogStyles.group}>
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
        maxWidth: "min(920px, 100%)"
      }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="system-notification-form-title">
            <div className={layout.accentBar} aria-hidden />
            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon="mdi:email-edit-outline" />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>Notifications</p>
                  <h2 className={layout.title} id="system-notification-form-title">{copy.system.items[def.key]?.label || def.key}</h2>
                  <p className={layout.subtitle}>{copy.system.items[def.key]?.hint || def.recipients}</p>
                </div>
              </div>
              <button type="button" className={layout.closeBtn} onClick={close} aria-label={copy.variables.close} disabled={saving}>
                <FaTimes />
              </button>
            </header>

            <div className={layout.body}>
              <nav className={layout.nav} aria-label="Notification sections">
                {sections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                    <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                    <span className={layout.navItemText}>
                      <span className={layout.navItemLabel}>{section.label}</span>
                      <span className={layout.navItemHint}>{section.description}</span>
                    </span>
                  </button>)}
              </nav>
              <div className={layout.content}>{renderSectionContent()}</div>
            </div>

            <footer className={layout.footer}>
              <span className={layout.footerHint}>{copy.system.items[def.key]?.recipients || def.recipients}</span>
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
