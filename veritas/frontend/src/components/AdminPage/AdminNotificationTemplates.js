import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { Btn, BtnIcon, Card } from "./AdminUi";
import NotificationVariablesModal from "./NotificationVariablesModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchTicketAutomationConfig, getTicketAutomationConfig, saveTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { getAdminNotificationCenterCopy } from "./adminNotificationCenterI18n";
import { NOTIFICATION_SOURCE_OPTIONS, getElementOption, getSourceOption } from "./notificationEventConstants";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./NotificationEventFormModal.module.css";

function buildTemplateDraft() {
  return {
    id: `notif-tpl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    subject: "",
    content: "",
    source: "",
    element: ""
  };
}

async function persistTemplates(nextTemplates, currentSettings) {
  const current = getTicketAutomationConfig();
  return saveTicketAutomationConfig({
    ...current,
    notificationSettings: {
      ...(currentSettings || current.notificationSettings || {}),
      templates: nextTemplates
    }
  });
}

export default function AdminNotificationTemplates() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminNotificationCenterCopy(locale), [locale]);
  const [settings, setSettings] = useState(() => getTicketAutomationConfig()?.notificationSettings);
  const [draft, setDraft] = useState(null);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const editorRef = useRef(null);
  const templates = Array.isArray(settings?.templates) ? settings.templates : [];
  useEffect(() => {
    fetchTicketAutomationConfig().then(config => setSettings(config?.notificationSettings));
  }, []);
  useEffect(() => {
    if (!draft || !editorRef.current) return;
    editorRef.current.innerHTML = String(draft.content || "");
  }, [draft?.id]);
  const openCreate = () => {
    setMode("create");
    setDraft(buildTemplateDraft());
  };
  const openEdit = template => {
    setMode("edit");
    setDraft({
      ...template
    });
  };
  const close = () => {
    if (saving) return;
    setDraft(null);
    setVariablesOpen(false);
  };
  const save = async () => {
    if (!draft) return;
    const name = String(draft.name || "").trim();
    if (!name) {
      toast.error(copy.templates.toast.nameRequired);
      return;
    }
    const content = editorRef.current ? String(editorRef.current.innerHTML || "") : String(draft.content || "");
    const payload = {
      id: draft.id,
      name,
      subject: String(draft.subject || "").trim(),
      content,
      source: String(draft.source || "").trim().toLowerCase(),
      element: String(draft.element || "").trim().toLowerCase()
    };
    setSaving(true);
    try {
      const nextTemplates = mode === "create" ? [...templates, payload] : templates.map(item => item.id === payload.id ? payload : item);
      const nextSettings = {
        ...settings,
        templates: nextTemplates
      };
      setSettings(nextSettings);
      await persistTemplates(nextTemplates, nextSettings);
      toast.success(copy.templates.toast.saved);
      close();
    } catch (error) {
      toast.error(error?.message || copy.templates.toast.error);
    } finally {
      setSaving(false);
    }
  };
  const remove = async template => {
    try {
      const nextTemplates = templates.filter(item => item.id !== template.id);
      const nextEvents = (Array.isArray(settings?.notificationEvents) ? settings.notificationEvents : []).map(eventItem => eventItem.templateId === template.id ? {
        ...eventItem,
        useTemplate: false,
        templateId: ""
      } : eventItem);
      const nextSettings = {
        ...settings,
        templates: nextTemplates,
        notificationEvents: nextEvents
      };
      setSettings(nextSettings);
      await persistTemplates(nextTemplates, nextSettings);
      toast.success(copy.templates.toast.deleted);
    } catch (error) {
      toast.error(error?.message || copy.templates.toast.error);
    }
  };
  const eventLabel = template => {
    if (!template.source || !template.element) return copy.templates.anyEvent;
    return `${getSourceOption(template.source).label} · ${getElementOption(template.source, template.element).label}`;
  };
  return <Card title={copy.templates.title} description={copy.templates.description} action={<Btn icon="mdi:plus" onClick={openCreate}>{copy.templates.add}</Btn>}>
      {templates.length === 0 ? <p style={{
      margin: 0,
      color: "var(--msp-muted)",
      fontSize: "0.84rem"
    }}>{copy.templates.empty}</p> : <div className="admin-table-wrap">
          <table style={{
        width: "100%",
        borderCollapse: "collapse"
      }}>
            <thead>
              <tr>
                <th style={{
              textAlign: "left",
              padding: "8px 6px",
              fontSize: "0.72rem",
              color: "var(--msp-muted)"
            }}>{copy.templates.columns.name}</th>
                <th style={{
              textAlign: "left",
              padding: "8px 6px",
              fontSize: "0.72rem",
              color: "var(--msp-muted)"
            }}>{copy.templates.columns.subject}</th>
                <th style={{
              textAlign: "left",
              padding: "8px 6px",
              fontSize: "0.72rem",
              color: "var(--msp-muted)"
            }}>{copy.templates.columns.event}</th>
                <th style={{
              textAlign: "right",
              padding: "8px 6px",
              fontSize: "0.72rem",
              color: "var(--msp-muted)"
            }}>{copy.templates.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => <tr key={template.id}>
                  <td style={{
              padding: "10px 6px"
            }}>{template.name}</td>
                  <td style={{
              padding: "10px 6px",
              color: "var(--msp-muted)"
            }}>{template.subject || "—"}</td>
                  <td style={{
              padding: "10px 6px"
            }}>{eventLabel(template)}</td>
                  <td style={{
              padding: "10px 6px",
              textAlign: "right"
            }}>
                    <BtnIcon icon="mdi:pencil-outline" title={copy.templates.edit} onClick={() => openEdit(template)} />
                    <BtnIcon icon="mdi:delete-outline" title={copy.templates.delete} variant="ghost" onClick={() => remove(template)} />
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>}

      {draft ? createPortal(<div className={layout.overlay} onClick={close} role="presentation">
          <div className={layout.shell} style={{
        maxWidth: "min(860px, 100%)"
      }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className={layout.accentBar} aria-hidden />
            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon="mdi:file-document-edit-outline" />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>Notifications</p>
                  <h2 className={layout.title}>{mode === "create" ? copy.templates.createTitle : copy.templates.editTitle}</h2>
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
              <div className={layout.field}>
                <label className={layout.label}>{copy.templates.nameLabel}</label>
                <input className={layout.input} value={draft.name} onChange={event => setDraft(prev => ({
              ...prev,
              name: event.target.value
            }))} placeholder={copy.templates.namePlaceholder} />
              </div>
              <div className={layout.fieldGrid2} style={{
            marginTop: "12px"
          }}>
                <div className={layout.field}>
                  <label className={layout.label}>Source</label>
                  <select className={layout.input} value={draft.source} onChange={event => {
                const nextSource = event.target.value;
                setDraft(prev => ({
                  ...prev,
                  source: nextSource,
                  element: nextSource ? getSourceOption(nextSource).elements[0]?.key || "" : ""
                }));
              }}>
                    <option value="">{copy.templates.anyEvent}</option>
                    {NOTIFICATION_SOURCE_OPTIONS.map(source => <option key={source.key} value={source.key}>{source.label}</option>)}
                  </select>
                </div>
                <div className={layout.field}>
                  <label className={layout.label}>Action</label>
                  <select className={layout.input} value={draft.element} disabled={!draft.source} onChange={event => setDraft(prev => ({
                ...prev,
                element: event.target.value
              }))}>
                    {(draft.source ? getSourceOption(draft.source).elements : []).map(element => <option key={element.key} value={element.key}>{element.label}</option>)}
                  </select>
                </div>
              </div>
              <div className={layout.field} style={{
            marginTop: "12px"
          }}>
                <label className={layout.label}>{copy.templates.subjectLabel}</label>
                <input className={layout.input} value={draft.subject} onChange={event => setDraft(prev => ({
              ...prev,
              subject: event.target.value
            }))} placeholder={copy.templates.subjectPlaceholder} />
              </div>
              <div className={layout.field} style={{
            marginTop: "12px"
          }}>
                <label className={layout.label}>{copy.templates.bodyLabel}</label>
                <div className={formStyles.toolbar}>
                  <button type="button" className={formStyles.toolBtn} onClick={() => {
                editorRef.current?.focus();
                document.execCommand("bold", false, null);
              }}><strong>B</strong></button>
                  <button type="button" className={formStyles.toolBtn} onClick={() => {
                editorRef.current?.focus();
                document.execCommand("italic", false, null);
              }}><em>I</em></button>
                  <button type="button" className={formStyles.toolBtn} onClick={() => setVariablesOpen(true)}>
                    {copy.templates.variables}
                  </button>
                </div>
                <div ref={editorRef} className={formStyles.editor} contentEditable suppressContentEditableWarning onInput={event => setDraft(prev => ({
              ...prev,
              content: String(event.currentTarget?.innerHTML || "")
            }))} />
              </div>
            </div>
            <footer className={layout.footer}>
              <span className={layout.footerHint} />
              <div className={layout.footerActions}>
                <button type="button" className={layout.ghostBtn} onClick={close} disabled={saving}>{copy.templates.cancel}</button>
                <button type="button" className={layout.primaryBtn} onClick={save} disabled={saving}>
                  {saving ? <Icon icon="mdi:loading" className={layout.spinning} /> : <Icon icon="mdi:content-save-outline" />}
                  {copy.templates.save}
                </button>
              </div>
            </footer>
          </div>
        </div>, document.getElementById("modal-root") || document.body) : null}

      <NotificationVariablesModal open={variablesOpen} source={draft?.source || "tickets"} element={draft?.element || "updated"} title={copy.variables.title} intro={copy.variables.intro} closeLabel={copy.variables.close} onClose={() => setVariablesOpen(false)} onInsert={token => {
      if (document.activeElement?.tagName === "INPUT") {
        const input = document.activeElement;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const next = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
        input.value = next;
        setDraft(prev => ({
          ...prev,
          subject: next
        }));
        setVariablesOpen(false);
        return;
      }
      if (!editorRef.current) return;
      editorRef.current.focus();
      document.execCommand("insertText", false, token);
      setDraft(prev => ({
        ...prev,
        content: String(editorRef.current?.innerHTML || "")
      }));
      setVariablesOpen(false);
    }} />
    </Card>;
}
