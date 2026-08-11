import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { bulkUpdateContacts } from "../../api/clients";
import MultiSuggestPicker from "../AdminPage/MultiSuggestPicker";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getContactPageCopy } from "./contactPageI18n";
import styles from "../EnterprisesPage/EnterpriseBulkEditModal.module.css";

function buildInitialForm() {
  return {
    enableCompany: true,
    clientId: "",
    membershipMode: "replace"
  };
}

export default function ContactBulkEditModal({
  open,
  onClose,
  contactIds = [],
  clients = [],
  onSuccess
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const pageCopy = useMemo(() => getContactPageCopy(locale), [locale]);
  const bulkCopy = pageCopy.bulkModal;
  const [form, setForm] = useState(buildInitialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm());
    setError("");
    setSaving(false);
  }, [open, contactIds]);
  const clientOptions = useMemo(() => (Array.isArray(clients) ? clients : []).map(client => ({
    id: client.id,
    label: client.name || client.nom || pageCopy.getClientLabel(client.id, client.name),
    hint: client.client_number || client.clientNumber || ""
  })), [clients, pageCopy]);
  const validateForm = () => {
    if (!form.enableCompany) return bulkCopy.validation.noField;
    if (!String(form.clientId || "").trim()) return bulkCopy.validation.noCompany;
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
      const result = await bulkUpdateContacts({
        contactIds,
        action: "update",
        updates: {
          clientId: Number(form.clientId),
          membershipMode: form.membershipMode
        }
      });
      onSuccess?.(result);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || bulkCopy.submitError);
    } finally {
      setSaving(false);
    }
  };
  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={onClose}>
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="contact-bulk-edit-title">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="contact-bulk-edit-title">{bulkCopy.title}</h2>
            <p className={styles.subtitle}>{pageCopy.formatBulkModalSelected(contactIds.length)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableCompany} onChange={e => setForm(prev => ({
                ...prev,
                enableCompany: e.target.checked
              }))} />
                {bulkCopy.editCompany}
              </label>
            </div>
            {form.enableCompany ? <div className={styles.sectionBody}>
                <p className={styles.subtitle} style={{
              margin: 0
            }}>{bulkCopy.companyHint}</p>
                <MultiSuggestPicker singleSelect maxResults={8} inputId="contact-bulk-company" placeholder={bulkCopy.companySearchPlaceholder} options={clientOptions} selectedIds={form.clientId ? [form.clientId] : []} emptyHint={bulkCopy.noCompanySelected} emptyResultsHint={bulkCopy.noCompanyFound} onChange={ids => setForm(prev => ({
              ...prev,
              clientId: ids[0] ? String(ids[0]) : ""
            }))} />
                <label className={styles.sectionHead} style={{
              marginTop: "0.35rem"
            }}>
                  <input type="radio" name="contact-bulk-membership-mode" checked={form.membershipMode === "replace"} onChange={() => setForm(prev => ({
                ...prev,
                membershipMode: "replace"
              }))} />
                  {bulkCopy.modeReplace}
                </label>
                <label className={styles.sectionHead}>
                  <input type="radio" name="contact-bulk-membership-mode" checked={form.membershipMode === "add"} onChange={() => setForm(prev => ({
                ...prev,
                membershipMode: "add"
              }))} />
                  {bulkCopy.modeAdd}
                </label>
              </div> : null}
          </section>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || contactIds.length === 0}>
            {saving ? bulkCopy.saving : bulkCopy.apply}
          </button>
        </div>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
