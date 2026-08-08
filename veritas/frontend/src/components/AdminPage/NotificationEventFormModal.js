import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { Switch } from "./AdminUi";
import { NOTIFICATION_CHANNEL_OPTIONS, NOTIFICATION_EVENT_FORM_SECTIONS, NOTIFICATION_SOURCE_OPTIONS, TEAMS_THEME_COLOR_PRESETS, WEBHOOK_CHANNEL_ICON_BY_KEY, getSourceOption, isSoonElementKey, parseEmailTags } from "./notificationEventConstants";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
import styles from "./NotificationEventFormModal.module.css";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
function EmailChipField({
  emails,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder
}) {
  return <div className={styles.emailChipField}>
      {emails.map(email => <span key={email} className={styles.emailChip}>
          {email}
          <button type="button" className={styles.emailChipRemove} onClick={() => onRemove(email)} title="Remove">
            <Icon icon="mdi:close" />
          </button>
        </span>)}
      <input className={styles.emailChipInput} value={inputValue} onChange={e => onInputChange(e.target.value)} onKeyDown={e => {
      if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
        e.preventDefault();
        onAdd(inputValue);
        onInputChange("");
      }
      if (e.key === "Backspace" && !inputValue.trim() && emails.length > 0) {
        onRemove(emails[emails.length - 1]);
      }
    }} onBlur={() => {
      onAdd(inputValue);
      onInputChange("");
    }} placeholder={emails.length ? "" : placeholder} />
    </div>;
}
export default function NotificationEventFormModal({
  open,
  mode = "create",
  draft,
  setDraft,
  saving = false,
  availableClients = [],
  webhooks = [],
  commentTemplates = [],
  editorRef,
  onClose,
  onSave,
  onOpenVariables
}) {
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("trigger");
  const [emailToInput, setEmailToInput] = useState("");
  const [emailCcInput, setEmailCcInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [webhookSelectOpen, setWebhookSelectOpen] = useState(false);
  const webhookSelectRef = useRef(null);
  const internalEditorRef = useRef(null);
  const resolvedEditorRef = editorRef || internalEditorRef;
  useEffect(() => {
    if (!open) return;
    setActiveSection("trigger");
    setEmailToInput("");
    setEmailCcInput("");
    setShowPreview(false);
    setWebhookSelectOpen(false);
  }, [open]);
  useEffect(() => {
    if (!open || !resolvedEditorRef?.current) return;
    if (draft?.useTemplate) return;
    resolvedEditorRef.current.innerHTML = String(draft?.customMessage || "");
  }, [open, draft?.useTemplate, draft?.id, resolvedEditorRef]);
  useEffect(() => {
    if (!open) return;
    const handleDocumentClick = event => {
      if (!webhookSelectRef.current) return;
      if (!webhookSelectRef.current.contains(event.target)) {
        setWebhookSelectOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [open]);
  const selectedWebhook = useMemo(() => webhooks.find(webhook => String(webhook?.id || "") === String(draft?.webhookId || "")), [webhooks, draft?.webhookId]);
  const isTeamsWebhook = (draft?.channel || "webhook") === "webhook" && String(selectedWebhook?.channel || "").toLowerCase() === "teams";
  const sectionMeta = useMemo(() => {
    const channel = draft?.channel || "webhook";
    const channelOk = channel === "mail" ? parseEmailTags(draft?.emailTo).length > 0 : channel === "webhook" ? Boolean(String(draft?.webhookId || "").trim()) : false;
    const contentOk = draft?.useTemplate ? Boolean(String(draft?.templateId || "").trim()) : Boolean(String(draft?.customMessage || "").trim());
    return {
      trigger: Boolean(draft?.source && draft?.element),
      target: draft?.scopeType !== "enterprise" || Boolean(String(draft?.enterpriseId || "").trim()),
      channel: channelOk,
      content: contentOk
    };
  }, [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const addEmailChip = (field, rawValue) => {
    const candidate = String(rawValue || "").trim().replace(/,$/, "");
    if (!candidate) return;
    setDraft(prev => {
      const current = parseEmailTags(prev?.[field] || "");
      const exists = current.some(email => email.toLowerCase() === candidate.toLowerCase());
      if (exists) return prev;
      return {
        ...prev,
        [field]: [...current, candidate].join(", ")
      };
    });
  };
  const removeEmailChip = (field, valueToRemove) => {
    setDraft(prev => {
      const nextList = parseEmailTags(prev?.[field] || "").filter(email => email.toLowerCase() !== String(valueToRemove || "").toLowerCase());
      return {
        ...prev,
        [field]: nextList.join(", ")
      };
    });
  };
  const execEditorCommand = (command, value = null) => {
    if (!resolvedEditorRef.current) return;
    resolvedEditorRef.current.focus();
    document.execCommand(command, false, value);
    patchDraft({
      customMessage: String(resolvedEditorRef.current?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
    });
  };
  const insertImageUrl = () => {
    const rawUrl = window.prompt("Public image URL (https://...)", "https://");
    if (!rawUrl) return;
    const url = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Invalid image URL. Use a public http(s) URL.");
      return;
    }
    execEditorCommand("insertImage", url);
  };
  const modalTitle = isCreate ? "New notification event" : "Edit event";
  const modalSubtitle = isCreate ? "Trigger an automatic notification on a business event." : "Adjust the trigger, target and delivered content.";
  const renderWebhookSelect = () => {
    const disabled = (draft.channel || "webhook") !== "webhook";
    const selectedIcon = WEBHOOK_CHANNEL_ICON_BY_KEY[String(selectedWebhook?.channel || "").toLowerCase()] || "mingcute:link-2-fill";
    return <div className={styles.webhookSelectWrap} ref={webhookSelectRef}>
        <button type="button" className={`${layout.input} ${styles.webhookSelectBtn}`} disabled={disabled} onClick={() => setWebhookSelectOpen(prev => !prev)}>
          <span className={styles.webhookSelectLabel}>
            <Icon icon={selectedWebhook ? selectedIcon : "mingcute:link-2-fill"} aria-hidden />
            <span className={styles.webhookSelectText}>
              {selectedWebhook ? selectedWebhook.name || selectedWebhook.url : "Select a webhook"}
            </span>
          </span>
          <Icon icon={webhookSelectOpen ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
        </button>
        {webhookSelectOpen && !disabled && <div className={styles.webhookDropdown}>
            {webhooks.length === 0 && <div className={styles.webhookEmpty}>No webhooks available.</div>}
            {webhooks.map(webhook => {
          const iconName = WEBHOOK_CHANNEL_ICON_BY_KEY[String(webhook?.channel || "").toLowerCase()] || "mingcute:link-2-fill";
          const selected = String(draft.webhookId || "") === String(webhook.id || "");
          return <button key={webhook.id} type="button" className={`${styles.webhookOption} ${selected ? styles.webhookOptionSelected : ""}`} onClick={() => {
            patchDraft({
              webhookId: String(webhook.id || "")
            });
            setWebhookSelectOpen(false);
          }}>
                  <Icon icon={iconName} aria-hidden />
                  <span className={styles.webhookSelectText}>{webhook.name || webhook.url}</span>
                </button>;
        })}
          </div>}
      </div>;
  };
  const renderSectionContent = () => {
    switch (activeSection) {
      case "trigger":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Trigger</h3>
              <p className={layout.sectionDesc}>
                Choose the business source and event that will trigger the notification.
              </p>
            </div>

            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>Active event</div>
                <p className={formStyles.statusHint}>
                  Inactive events do not trigger any notification.
                </p>
              </div>
              <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
              enabled: on
            })} label={draft.enabled ? "Active" : "Inactive"} />
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-source">Source</label>
                <select id="notif-source" className={layout.input} value={draft.source || "tickets"} onChange={e => {
                const nextSource = e.target.value;
                const firstElement = getSourceOption(nextSource).elements[0];
                patchDraft({
                  source: nextSource,
                  element: firstElement?.key || ""
                });
              }}>
                  {NOTIFICATION_SOURCE_OPTIONS.map(sourceItem => <option key={sourceItem.key} value={sourceItem.key}>
                      {sourceItem.label}
                    </option>)}
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-element">Element</label>
                <select id="notif-element" className={layout.input} value={draft.element || getSourceOption(draft.source || "tickets").elements[0]?.key} onChange={e => patchDraft({
                element: e.target.value
              })}>
                  {getSourceOption(draft.source || "tickets").elements.map(elementItem => <option key={elementItem.key} value={elementItem.key}>
                      {elementItem.label}
                    </option>)}
                </select>
              </div>
              {isSoonElementKey(draft.element) && <div className={layout.field}>
                  <label className={layout.label} htmlFor="notif-days-before">
                    Notify how many days before?
                  </label>
                  <input id="notif-days-before" type="number" min="1" className={layout.input} value={Number(draft.daysBefore ?? 30)} onChange={e => patchDraft({
                daysBefore: Number(e.target.value || 1)
              })} />
                </div>}
            </div>
          </>;
      case "target":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Cible</h3>
              <p className={layout.sectionDesc}>
                Limit the notification to one company or apply it globally.
              </p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-scope">Scope</label>
                <select id="notif-scope" className={layout.input} value={draft.scopeType || "all"} onChange={e => patchDraft({
                scopeType: e.target.value,
                enterpriseId: e.target.value === "enterprise" ? draft.enterpriseId : ""
              })}>
                  <option value="all">All companies</option>
                  <option value="enterprise">Specific company</option>
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-enterprise">Company</label>
                <select id="notif-enterprise" className={layout.input} value={draft.enterpriseId || ""} onChange={e => patchDraft({
                enterpriseId: e.target.value
              })} disabled={(draft.scopeType || "all") !== "enterprise"}>
                  <option value="">Select a company</option>
                  {availableClients.map(client => <option key={String(client?.id)} value={String(client?.id)}>
                      {client?.name || client?.nom || `Company ${client?.id}`}
                    </option>)}
                </select>
              </div>
            </div>
          </>;
      case "channel":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Canal</h3>
              <p className={layout.sectionDesc}>
                Select the delivery channel and its recipients.
              </p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="notif-channel">Notification channel</label>
                <select id="notif-channel" className={layout.input} value={draft.channel || "webhook"} onChange={e => patchDraft({
                channel: e.target.value,
                webhookId: e.target.value === "webhook" ? draft.webhookId : ""
              })}>
                  {NOTIFICATION_CHANNEL_OPTIONS.map(channelItem => <option key={channelItem.key} value={channelItem.key} disabled={Boolean(channelItem.comingSoon)}>
                      {channelItem.label}
                      {channelItem.comingSoon ? " (coming soon)" : ""}
                    </option>)}
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label}>
                  {(draft.channel || "webhook") === "mail" ? "Destinataires" : "Webhook"}
                </label>
                {(draft.channel || "webhook") === "mail" ? <EmailChipField emails={parseEmailTags(draft.emailTo)} inputValue={emailToInput} onInputChange={setEmailToInput} onAdd={value => addEmailChip("emailTo", value)} onRemove={email => removeEmailChip("emailTo", email)} placeholder="Add a recipient" /> : renderWebhookSelect()}
              </div>
            </div>
            {(draft.channel || "webhook") === "mail" && <div className={`${layout.field} ${layout.fieldFull}`} style={{
            marginTop: "0.75rem"
          }}>
                <label className={layout.label}>Copie (CC)</label>
                <EmailChipField emails={parseEmailTags(draft.emailCc)} inputValue={emailCcInput} onInputChange={setEmailCcInput} onAdd={value => addEmailChip("emailCc", value)} onRemove={email => removeEmailChip("emailCc", email)} placeholder="Add a CC recipient" />
              </div>}
          </>;
      case "content":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>Contenu</h3>
              <p className={layout.sectionDesc}>
                Use an existing template or write a custom message.
              </p>
            </div>

            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>Use a template</div>
                <p className={formStyles.statusHint}>
                  Reuses an already configured comment template.
                </p>
              </div>
              <Switch checked={Boolean(draft.useTemplate)} onChange={on => patchDraft({
              useTemplate: on,
              templateId: on ? draft.templateId : ""
            })} label={draft.useTemplate ? "Enabled" : "Disabled"} />
            </div>

            {draft.useTemplate ? <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="notif-template">Selected template</label>
                <select id="notif-template" className={layout.input} value={draft.templateId || ""} onChange={e => patchDraft({
              templateId: e.target.value
            })}>
                  <option value="">Select a template</option>
                  {commentTemplates.map(template => <option key={template.id} value={template.id}>
                      {template.name || "Unnamed template"}
                    </option>)}
                </select>
              </div> : <>
                <div className={styles.toolbar}>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("bold")}>
                    <strong>B</strong>
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("italic")}>
                    <em>I</em>
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("underline")}>
                    <u>U</u>
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => execEditorCommand("insertUnorderedList")}>
                    • List
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={() => {
                const url = window.prompt("Link URL", "https://");
                if (url) execEditorCommand("createLink", url);
              }}>
                    Link
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={onOpenVariables}>
                    Variables
                  </button>
                  <button type="button" className={styles.toolBtn} onClick={insertImageUrl}>
                    <Icon icon="mdi:image-outline" aria-hidden />
                    Image URL
                  </button>
                  <input type="color" className={styles.colorInput} onChange={e => execEditorCommand("foreColor", e.target.value)} title="Text color" />
                  <button type="button" className={styles.toolBtn} onClick={() => setShowPreview(prev => !prev)} disabled={!isTeamsWebhook}>
                    <Icon icon={showPreview ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
                    Teams preview
                  </button>
                </div>

                {isTeamsWebhook && <div style={{
              marginBottom: "0.75rem"
            }}>
                    <label className={layout.label}>Teams accent color</label>
                    <div className={styles.colorSwatches}>
                      {TEAMS_THEME_COLOR_PRESETS.map(color => {
                  const selected = String(draft.teamsThemeColor || "").toLowerCase() === String(color).toLowerCase();
                  return <button key={color} type="button" title={color} className={`${styles.colorSwatch} ${selected ? styles.colorSwatchSelected : ""}`} style={{
                    background: color
                  }} onClick={() => patchDraft({
                    teamsThemeColor: color
                  })} />;
                })}
                      <div className={styles.customColorRow}>
                        <span className={styles.customColorLabel}>Custom</span>
                        <input type="color" className={styles.colorInput} value={String(draft.teamsThemeColor || "#13BA8E")} onChange={e => patchDraft({
                    teamsThemeColor: e.target.value
                  })} title="Custom color" />
                      </div>
                    </div>
                  </div>}

                <div ref={resolvedEditorRef} className={styles.editor} contentEditable suppressContentEditableWarning onInput={e => patchDraft({
              customMessage: String(e.currentTarget?.innerHTML || "").replace(/\soutline:\s*[^;"']+;?/gi, "")
            })} />

                {showPreview && isTeamsWebhook && <div className={styles.previewWrap}>
                    <div className={styles.previewLabel}>Teams preview</div>
                    <div className={styles.previewCard} style={{
                borderTop: `4px solid ${String(draft.teamsThemeColor || "#13BA8E")}`
              }}>
                      <div className={styles.previewTitle}>Veritas - Notification</div>
                      <div className={styles.previewBody} dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(String(resolvedEditorRef.current?.innerHTML || draft.customMessage || "").trim() || "<em>No custom message entered</em>")
                }} />
                    </div>
                  </div>}

                {!isTeamsWebhook && <p className={styles.hintText}>
                    Teams preview is only available with a Teams-type Webhook channel.
                  </p>}
              </>}
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(920px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="notification-event-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:bell-plus-outline" : "mdi:bell-edit-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Notifications</p>
              <h2 className={layout.title} id="notification-event-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label="Notification sections">
            {NOTIFICATION_EVENT_FORM_SECTIONS.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {getSourceOption(draft.source).label} · {draft.channel === "mail" ? "Email" : "Webhook"}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  Saving…
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  Create event
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  Save
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
