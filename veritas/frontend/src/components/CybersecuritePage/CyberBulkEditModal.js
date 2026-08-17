import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import styles from "../EnterprisesPage/EnterpriseBulkEditModal.module.css";

function buildInitialForm(kind) {
  if (kind === "campaigns") {
    return {
      enableStatus: false,
      status: "active",
      enableStartDate: false,
      start_date: "",
      enableEndDate: false,
      end_date: ""
    };
  }
  return {
    enableExpiration: false,
    expiration: "",
    enableLicenses: false,
    licencesTotales: "",
    enableUsers: false,
    utilisateursProteges: "",
    enableDomains: false,
    domainesSurveilles: ""
  };
}

export default function CyberBulkEditModal({
  open,
  kind = "antivirus",
  items = [],
  copy,
  campaignStatuses = [],
  onClose,
  onSubmit
}) {
  const commonCopy = useCommonCopy();
  const bulkCopy = copy?.bulk?.modal || {};
  const [form, setForm] = useState(() => buildInitialForm(kind));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(kind));
    setError("");
    setSaving(false);
  }, [open, kind, items]);
  const title = kind === "antispam" ? bulkCopy.titleAntispam : kind === "campaigns" ? bulkCopy.titleCampaigns : bulkCopy.titleAntivirus;
  const hasField = useMemo(() => {
    if (kind === "campaigns") return form.enableStatus || form.enableStartDate || form.enableEndDate;
    return form.enableExpiration || form.enableLicenses || form.enableUsers || form.enableDomains;
  }, [form, kind]);
  const buildFields = () => {
    const fields = {};
    if (kind === "campaigns") {
      if (form.enableStatus) fields.status = form.status;
      if (form.enableStartDate) fields.start_date = form.start_date || "";
      if (form.enableEndDate) fields.end_date = form.end_date || "";
      return fields;
    }
    if (form.enableExpiration) fields.expiration = form.expiration || "";
    if (form.enableLicenses) fields.licencesTotales = form.licencesTotales.trim();
    if (kind === "antispam") {
      if (form.enableUsers) fields.utilisateursProteges = form.utilisateursProteges.trim();
      if (form.enableDomains) fields.domainesSurveilles = form.domainesSurveilles.trim();
    }
    return fields;
  };
  const handleSubmit = async () => {
    if (!hasField) {
      setError(bulkCopy.noField);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit?.(buildFields());
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || bulkCopy.submitError);
    } finally {
      setSaving(false);
    }
  };
  if (!open) return null;
  return createPortal(<div className={styles.overlay} onClick={saving ? undefined : onClose}>
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cyber-bulk-edit-title">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="cyber-bulk-edit-title">{title}</h2>
            <p className={styles.subtitle}>{copy?.formatBulkModalSelected?.(items.length)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.body}>
          {kind === "campaigns" ? <>
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <label>
                    <input type="checkbox" checked={form.enableStatus} onChange={e => setForm(prev => ({
                    ...prev,
                    enableStatus: e.target.checked
                  }))} />
                    {bulkCopy.editStatus}
                  </label>
                </div>
                {form.enableStatus ? <div className={styles.sectionBody}>
                    <select className={styles.input} value={form.status} onChange={e => setForm(prev => ({
                    ...prev,
                    status: e.target.value
                  }))} aria-label={bulkCopy.editStatus}>
                      {campaignStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </div> : null}
              </section>
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <label>
                    <input type="checkbox" checked={form.enableStartDate} onChange={e => setForm(prev => ({
                    ...prev,
                    enableStartDate: e.target.checked
                  }))} />
                    {bulkCopy.editStartDate}
                  </label>
                </div>
                {form.enableStartDate ? <div className={styles.sectionBody}>
                    <input type="date" className={styles.input} value={form.start_date} onChange={e => setForm(prev => ({
                    ...prev,
                    start_date: e.target.value
                  }))} />
                  </div> : null}
              </section>
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <label>
                    <input type="checkbox" checked={form.enableEndDate} onChange={e => setForm(prev => ({
                    ...prev,
                    enableEndDate: e.target.checked
                  }))} />
                    {bulkCopy.editEndDate}
                  </label>
                </div>
                {form.enableEndDate ? <div className={styles.sectionBody}>
                    <input type="date" className={styles.input} value={form.end_date} onChange={e => setForm(prev => ({
                    ...prev,
                    end_date: e.target.value
                  }))} />
                  </div> : null}
              </section>
            </> : <>
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <label>
                    <input type="checkbox" checked={form.enableExpiration} onChange={e => setForm(prev => ({
                    ...prev,
                    enableExpiration: e.target.checked
                  }))} />
                    {bulkCopy.editExpiration}
                  </label>
                </div>
                {form.enableExpiration ? <div className={styles.sectionBody}>
                    <input type="date" className={styles.input} value={form.expiration} onChange={e => setForm(prev => ({
                    ...prev,
                    expiration: e.target.value
                  }))} />
                  </div> : null}
              </section>
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <label>
                    <input type="checkbox" checked={form.enableLicenses} onChange={e => setForm(prev => ({
                    ...prev,
                    enableLicenses: e.target.checked
                  }))} />
                    {bulkCopy.editLicenses}
                  </label>
                </div>
                {form.enableLicenses ? <div className={styles.sectionBody}>
                    <input type="number" min="0" className={styles.input} value={form.licencesTotales} onChange={e => setForm(prev => ({
                    ...prev,
                    licencesTotales: e.target.value
                  }))} placeholder={bulkCopy.licensesPlaceholder} />
                  </div> : null}
              </section>
              {kind === "antispam" ? <>
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <label>
                        <input type="checkbox" checked={form.enableUsers} onChange={e => setForm(prev => ({
                        ...prev,
                        enableUsers: e.target.checked
                      }))} />
                        {bulkCopy.editUsers}
                      </label>
                    </div>
                    {form.enableUsers ? <div className={styles.sectionBody}>
                        <input type="number" min="0" className={styles.input} value={form.utilisateursProteges} onChange={e => setForm(prev => ({
                        ...prev,
                        utilisateursProteges: e.target.value
                      }))} placeholder={bulkCopy.usersPlaceholder} />
                      </div> : null}
                  </section>
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <label>
                        <input type="checkbox" checked={form.enableDomains} onChange={e => setForm(prev => ({
                        ...prev,
                        enableDomains: e.target.checked
                      }))} />
                        {bulkCopy.editDomains}
                      </label>
                    </div>
                    {form.enableDomains ? <div className={styles.sectionBody}>
                        <input type="number" min="0" className={styles.input} value={form.domainesSurveilles} onChange={e => setForm(prev => ({
                        ...prev,
                        domainesSurveilles: e.target.value
                      }))} placeholder={bulkCopy.domainsPlaceholder} />
                      </div> : null}
                  </section>
                </> : null}
              <p className={styles.subtitle} style={{
              margin: 0
            }}>{bulkCopy.apiHint}</p>
            </>}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || items.length === 0}>
            {saving ? bulkCopy.saving : bulkCopy.apply}
          </button>
        </div>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
