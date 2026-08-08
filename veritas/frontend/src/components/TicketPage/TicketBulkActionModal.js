import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { bulkUpdateTickets } from "../../api/tickets";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getTicketPageCopy } from "./ticketPageI18n";
import { interpolate } from "../../i18n/translate";
import styles from "./TicketBulkActionModal.module.css";
function resolveUserLabel(user, fallbackLabel) {
  return user?.ticket_helpdesk_display_name || user?.name || user?.nom || user?.username || user?.email || fallbackLabel;
}
function resolveContactLabel(contact, fallbackTemplate) {
  const fullName = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
  if (fullName) return fullName;
  if (contact?.email) return contact.email;
  return contact?.id ? interpolate(fallbackTemplate, {
    id: String(contact.id)
  }) : "";
}
function buildInitialForm() {
  return {
    enableStatus: false,
    status: "in_progress",
    enablePriority: false,
    priority: "normal",
    enableType: false,
    type: "incident",
    enableRequester: false,
    requesterKind: "contact",
    requesterContactId: "",
    requesterUserId: "",
    enableAssignees: false,
    assigneeMode: "replace",
    assigneeUserIds: [],
    enableWatchers: false,
    watcherMode: "add",
    watcherUserIds: []
  };
}
export default function TicketBulkActionModal({
  open,
  onClose,
  ticketIds = [],
  users = [],
  contacts = [],
  onSuccess
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const pageCopy = useMemo(() => getTicketPageCopy(locale), [locale]);
  const [form, setForm] = useState(buildInitialForm);
  const [userSearch, setUserSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [watcherSearch, setWatcherSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm());
    setUserSearch("");
    setContactSearch("");
    setAssigneeSearch("");
    setWatcherSearch("");
    setError("");
    setSaving(false);
  }, [open, ticketIds]);
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    const rows = Array.isArray(contacts) ? contacts : [];
    if (!q) return rows.slice(0, 80);
    return rows.filter(contact => {
      const label = resolveContactLabel(contact, pageCopy.bulkModal.contactFallback).toLowerCase();
      const email = String(contact?.email || "").toLowerCase();
      return label.includes(q) || email.includes(q);
    }).slice(0, 80);
  }, [contacts, contactSearch]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const rows = Array.isArray(users) ? users : [];
    if (!q) return rows.slice(0, 80);
    return rows.filter(user => resolveUserLabel(user, pageCopy.bulkModal.userFallback).toLowerCase().includes(q)).slice(0, 80);
  }, [users, userSearch]);
  const filteredAssigneeUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    const rows = Array.isArray(users) ? users : [];
    if (!q) return rows.slice(0, 80);
    return rows.filter(user => resolveUserLabel(user, pageCopy.bulkModal.userFallback).toLowerCase().includes(q)).slice(0, 80);
  }, [users, assigneeSearch]);
  const filteredWatcherUsers = useMemo(() => {
    const q = watcherSearch.trim().toLowerCase();
    const rows = Array.isArray(users) ? users : [];
    if (!q) return rows.slice(0, 80);
    return rows.filter(user => resolveUserLabel(user, pageCopy.bulkModal.userFallback).toLowerCase().includes(q)).slice(0, 80);
  }, [users, watcherSearch]);
  const toggleUserId = (field, userId) => {
    const key = String(userId);
    setForm(prev => {
      const current = prev[field] || [];
      const next = current.includes(key) ? current.filter(id => id !== key) : [...current, key];
      return {
        ...prev,
        [field]: next
      };
    });
  };
  const buildPayload = () => {
    const updates = {};
    if (form.enableStatus) updates.status = form.status;
    if (form.enablePriority) updates.priority = form.priority;
    if (form.enableType) updates.type = form.type;
    if (form.enableRequester) {
      if (form.requesterKind === "contact") {
        updates.requesterContactId = form.requesterContactId ? Number(form.requesterContactId) : null;
        updates.requesterUserId = null;
      } else {
        updates.requesterUserId = form.requesterUserId || null;
        updates.requesterContactId = null;
      }
    }
    const payload = {
      ticketIds,
      action: "update",
      updates
    };
    if (form.enableAssignees) {
      payload.assignees = {
        mode: form.assigneeMode,
        userIds: form.assigneeUserIds
      };
    }
    if (form.enableWatchers) {
      payload.watchers = {
        mode: form.watcherMode,
        userIds: form.watcherUserIds
      };
    }
    return payload;
  };
  const validateForm = () => {
    const hasFieldUpdate = form.enableStatus || form.enablePriority || form.enableType || form.enableRequester || form.enableAssignees || form.enableWatchers;
    if (!hasFieldUpdate) {
      return pageCopy.bulkModal.validation.noField;
    }
    if (form.enableRequester) {
      if (form.requesterKind === "contact" && !form.requesterContactId) {
        return pageCopy.bulkModal.validation.noContact;
      }
      if (form.requesterKind === "user" && !form.requesterUserId) {
        return pageCopy.bulkModal.validation.noUser;
      }
    }
    if (form.enableAssignees) {
      if (form.assigneeMode !== "replace" && form.assigneeUserIds.length === 0) {
        return pageCopy.bulkModal.validation.noAssignee;
      }
    }
    if (form.enableWatchers) {
      if (form.watcherMode !== "replace" && form.watcherUserIds.length === 0) {
        return pageCopy.bulkModal.validation.noWatcher;
      }
    }
    return "";
  };
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await bulkUpdateTickets(buildPayload());
      onSuccess?.(result);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || pageCopy.bulkModal.submitError);
    } finally {
      setSaving(false);
    }
  };
  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={onClose}>
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{pageCopy.bulkModal.title}</h2>
            <p className={styles.subtitle}>{pageCopy.formatBulkModalSelected(ticketIds.length)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableStatus} onChange={e => setForm(prev => ({
                ...prev,
                enableStatus: e.target.checked
              }))} />
                {pageCopy.bulkModal.editStatus}
              </label>
            </div>
            {form.enableStatus && <div className={styles.sectionBody}>
                <select className={styles.select} value={form.status} onChange={e => setForm(prev => ({
              ...prev,
              status: e.target.value
            }))}>
                  {pageCopy.statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enablePriority} onChange={e => setForm(prev => ({
                ...prev,
                enablePriority: e.target.checked
              }))} />
                {pageCopy.bulkModal.editPriority}
              </label>
            </div>
            {form.enablePriority && <div className={styles.sectionBody}>
                <select className={styles.select} value={form.priority} onChange={e => setForm(prev => ({
              ...prev,
              priority: e.target.value
            }))}>
                  {pageCopy.priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableType} onChange={e => setForm(prev => ({
                ...prev,
                enableType: e.target.checked
              }))} />
                {pageCopy.bulkModal.editType}
              </label>
            </div>
            {form.enableType && <div className={styles.sectionBody}>
                <select className={styles.select} value={form.type} onChange={e => setForm(prev => ({
              ...prev,
              type: e.target.value
            }))}>
                  {pageCopy.ticketTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableRequester} onChange={e => setForm(prev => ({
                ...prev,
                enableRequester: e.target.checked
              }))} />
                {pageCopy.bulkModal.editRequester}
              </label>
            </div>
            {form.enableRequester && <div className={styles.sectionBody}>
                <select className={styles.select} value={form.requesterKind} onChange={e => setForm(prev => ({
              ...prev,
              requesterKind: e.target.value
            }))}>
                  <option value="contact">{pageCopy.bulkModal.requesterContact}</option>
                  <option value="user">{pageCopy.bulkModal.requesterUser}</option>
                </select>
                {form.requesterKind === "contact" ? <>
                    <input className={styles.searchInput} value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder={pageCopy.bulkModal.searchContact} />
                    <select className={styles.select} value={form.requesterContactId} onChange={e => setForm(prev => ({
                ...prev,
                requesterContactId: e.target.value
              }))}>
                      <option value="">{pageCopy.bulkModal.chooseContact}</option>
                      {filteredContacts.map(contact => <option key={contact.id} value={contact.id}>
                          {resolveContactLabel(contact, pageCopy.bulkModal.contactFallback)}
                        </option>)}
                    </select>
                  </> : <>
                    <input className={styles.searchInput} value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder={pageCopy.bulkModal.searchUser} />
                    <select className={styles.select} value={form.requesterUserId} onChange={e => setForm(prev => ({
                ...prev,
                requesterUserId: e.target.value
              }))}>
                      <option value="">{pageCopy.bulkModal.chooseUser}</option>
                      {filteredUsers.map(user => <option key={user.id} value={user.id}>
                          {resolveUserLabel(user, pageCopy.bulkModal.userFallback)}
                        </option>)}
                    </select>
                  </>}
              </div>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableAssignees} onChange={e => setForm(prev => ({
                ...prev,
                enableAssignees: e.target.checked
              }))} />
                {pageCopy.bulkModal.editAssignees}
              </label>
            </div>
            {form.enableAssignees && <div className={styles.sectionBody}>
                <select className={styles.select} value={form.assigneeMode} onChange={e => setForm(prev => ({
              ...prev,
              assigneeMode: e.target.value
            }))}>
                  {pageCopy.assigneeModes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input className={styles.searchInput} value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder={pageCopy.bulkModal.searchUser} />
                <div className={styles.userList}>
                  {filteredAssigneeUsers.map(user => <label key={user.id} className={styles.userOption}>
                      <input type="checkbox" checked={form.assigneeUserIds.includes(String(user.id))} onChange={() => toggleUserId("assigneeUserIds", user.id)} />
                      <span>{resolveUserLabel(user, pageCopy.bulkModal.userFallback)}</span>
                    </label>)}
                </div>
                {form.assigneeUserIds.length > 0 && <div className={styles.chips}>
                    {form.assigneeUserIds.map(userId => {
                const user = users.find(row => String(row.id) === String(userId));
                return <span key={userId} className={styles.chip}>
                          {resolveUserLabel(user, pageCopy.bulkModal.userFallback)}
                          <button type="button" onClick={() => toggleUserId("assigneeUserIds", userId)} aria-label={commonCopy.remove}>
                            ×
                          </button>
                        </span>;
              })}
                  </div>}
                {form.assigneeMode === "replace" && <p className={styles.hint}>{pageCopy.bulkModal.assigneeReplaceHint}</p>}
              </div>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableWatchers} onChange={e => setForm(prev => ({
                ...prev,
                enableWatchers: e.target.checked
              }))} />
                {pageCopy.bulkModal.editWatchers}
              </label>
            </div>
            {form.enableWatchers && <div className={styles.sectionBody}>
                <select className={styles.select} value={form.watcherMode} onChange={e => setForm(prev => ({
              ...prev,
              watcherMode: e.target.value
            }))}>
                  {pageCopy.watcherModes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input className={styles.searchInput} value={watcherSearch} onChange={e => setWatcherSearch(e.target.value)} placeholder={pageCopy.bulkModal.searchUser} />
                <div className={styles.userList}>
                  {filteredWatcherUsers.map(user => <label key={user.id} className={styles.userOption}>
                      <input type="checkbox" checked={form.watcherUserIds.includes(String(user.id))} onChange={() => toggleUserId("watcherUserIds", user.id)} />
                      <span>{resolveUserLabel(user, pageCopy.bulkModal.userFallback)}</span>
                    </label>)}
                </div>
                {form.watcherUserIds.length > 0 && <div className={styles.chips}>
                    {form.watcherUserIds.map(userId => {
                const user = users.find(row => String(row.id) === String(userId));
                return <span key={userId} className={styles.chip}>
                          {resolveUserLabel(user, pageCopy.bulkModal.userFallback)}
                          <button type="button" onClick={() => toggleUserId("watcherUserIds", userId)} aria-label={commonCopy.remove}>
                            ×
                          </button>
                        </span>;
              })}
                  </div>}
                {form.watcherMode === "replace" && <p className={styles.hint}>{pageCopy.bulkModal.watcherReplaceHint}</p>}
              </div>}
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving}>
            {saving ? commonCopy.applying : commonCopy.apply}
          </button>
        </div>
      </div>
    </div>, document.body);
}
