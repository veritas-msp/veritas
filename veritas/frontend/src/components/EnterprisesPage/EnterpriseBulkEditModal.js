import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { bulkUpdateClients } from "../../api/clients";
import { fetchActiveUsers } from "../../api/users";
import MultiSuggestPicker from "../AdminPage/MultiSuggestPicker";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { buildEmptyModulesMap } from "../../constants/contractModules";
import { getLocalizedModuleLabel } from "../../i18n/contractModuleLabels";
import { getEnterprisesPageCopy } from "./enterprisesPageI18n";
import styles from "./EnterpriseBulkEditModal.module.css";

function getCommercialUserLabel(user) {
  if (!user) return "";
  return user.username || user.email || user.name || user.nom || "";
}

function buildInitialForm(moduleDefinitions = []) {
  return {
    enableCommercial: false,
    commercialId: "",
    enableDebut: false,
    contratDebut: "",
    enableExpiration: false,
    contratExpiration: "",
    enableModules: false,
    modules: buildEmptyModulesMap(moduleDefinitions),
    enableStatut: false,
    statut: "actif"
  };
}

export default function EnterpriseBulkEditModal({
  open,
  onClose,
  clientIds = [],
  onSuccess
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const copy = useMemo(() => getEnterprisesPageCopy(locale), [locale]);
  const bulkCopy = copy.bulkModal;
  const {
    modules: contractModules
  } = useContractModuleOptions();
  const [form, setForm] = useState(() => buildInitialForm());
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(contractModules));
    setError("");
    setSaving(false);
  }, [open, clientIds, contractModules]);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadingUsers(true);
    fetchActiveUsers().then(data => {
      if (!cancelled) setUsers(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (!cancelled) setUsers([]);
    }).finally(() => {
      if (!cancelled) setLoadingUsers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const commercialOptions = useMemo(() => users.map(user => ({
    id: user.id,
    label: getCommercialUserLabel(user) || String(user.id),
    hint: user.username && user.email ? `${user.email}${user.profile ? ` · ${user.profile}` : ""}` : user.profile || user.email || ""
  })), [users]);
  const moduleDefs = useMemo(() => (Array.isArray(contractModules) ? contractModules : []).filter(module => module?.enabled !== false), [contractModules]);
  const validateForm = () => {
    const hasField = form.enableCommercial || form.enableDebut || form.enableExpiration || form.enableModules || form.enableStatut;
    if (!hasField) return bulkCopy.validation.noField;
    if (form.enableCommercial && !String(form.commercialId || "").trim()) return bulkCopy.validation.noCommercial;
    return "";
  };
  const buildUpdates = () => {
    const updates = {};
    if (form.enableCommercial) updates.commercialId = String(form.commercialId).trim();
    if (form.enableDebut) updates.contratDebut = form.contratDebut || null;
    if (form.enableExpiration) updates.contratExpiration = form.contratExpiration || null;
    if (form.enableModules) updates.options = {
      ...buildEmptyModulesMap(contractModules),
      ...form.modules
    };
    if (form.enableStatut) updates.statut = form.statut === "inactive" ? "inactive" : "actif";
    return updates;
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
      const result = await bulkUpdateClients({
        clientIds,
        updates: buildUpdates()
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
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="enterprise-bulk-edit-title">
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="enterprise-bulk-edit-title">{bulkCopy.title}</h2>
            <p className={styles.subtitle}>{copy.formatBulkModalSelected(clientIds.length)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableCommercial} onChange={e => setForm(prev => ({
                ...prev,
                enableCommercial: e.target.checked
              }))} />
                {bulkCopy.editCommercial}
              </label>
            </div>
            {form.enableCommercial ? <div className={styles.sectionBody}>
                <MultiSuggestPicker singleSelect maxResults={8} inputId="enterprise-bulk-commercial" placeholder={loadingUsers ? bulkCopy.loadingAgents : bulkCopy.commercialSearchPlaceholder} options={commercialOptions} selectedIds={form.commercialId ? [form.commercialId] : []} emptyHint={bulkCopy.noAgentSelected} emptyResultsHint={bulkCopy.noAgentFound} onChange={ids => setForm(prev => ({
              ...prev,
              commercialId: ids[0] ? String(ids[0]) : ""
            }))} />
              </div> : null}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableDebut} onChange={e => setForm(prev => ({
                ...prev,
                enableDebut: e.target.checked
              }))} />
                {bulkCopy.editDebut}
              </label>
            </div>
            {form.enableDebut ? <div className={styles.sectionBody}>
                <input type="date" className={styles.input} value={form.contratDebut} onChange={e => setForm(prev => ({
              ...prev,
              contratDebut: e.target.value
            }))} />
              </div> : null}
          </section>

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
                <input type="date" className={styles.input} value={form.contratExpiration} onChange={e => setForm(prev => ({
              ...prev,
              contratExpiration: e.target.value
            }))} />
              </div> : null}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableModules} onChange={e => setForm(prev => ({
                ...prev,
                enableModules: e.target.checked
              }))} />
                {bulkCopy.editModules}
              </label>
            </div>
            {form.enableModules ? <div className={styles.sectionBody}>
                <p className={styles.subtitle} style={{
              margin: 0
            }}>{bulkCopy.modulesHint}</p>
                <div className={styles.modulesGrid}>
                  {moduleDefs.map(module => {
                const key = module.moduleKey;
                const active = !!form.modules?.[key];
                return <button key={key} type="button" className={`${styles.moduleTile} ${active ? styles.moduleTileActive : ""}`} onClick={() => setForm(prev => ({
                  ...prev,
                  modules: {
                    ...prev.modules,
                    [key]: !prev.modules?.[key]
                  }
                }))} aria-pressed={active}>
                        <Icon icon={module.icon || "mdi:puzzle-outline"} className={styles.moduleTileIcon} aria-hidden />
                        <span>{getLocalizedModuleLabel(contractModules, key, locale)}</span>
                      </button>;
              })}
                </div>
              </div> : null}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <label>
                <input type="checkbox" checked={form.enableStatut} onChange={e => setForm(prev => ({
                ...prev,
                enableStatut: e.target.checked
              }))} />
                {bulkCopy.editStatut}
              </label>
            </div>
            {form.enableStatut ? <div className={styles.sectionBody}>
                <div className={styles.modulesGrid}>
                  <button type="button" className={`${styles.moduleTile} ${form.statut === "actif" ? styles.moduleTileActive : ""}`} onClick={() => setForm(prev => ({
                ...prev,
                statut: "actif"
              }))} aria-pressed={form.statut === "actif"}>
                    <Icon icon="mdi:domain" className={styles.moduleTileIcon} aria-hidden />
                    <span>{bulkCopy.statutActive}</span>
                  </button>
                  <button type="button" className={`${styles.moduleTile} ${form.statut === "inactive" ? styles.moduleTileActive : ""}`} onClick={() => setForm(prev => ({
                ...prev,
                statut: "inactive"
              }))} aria-pressed={form.statut === "inactive"}>
                    <Icon icon="mdi:domain-off-outline" className={styles.moduleTileIcon} aria-hidden />
                    <span>{bulkCopy.statutInactive}</span>
                  </button>
                </div>
              </div> : null}
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={saving || clientIds.length === 0}>
            {saving ? bulkCopy.saving : bulkCopy.apply}
          </button>
        </div>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
