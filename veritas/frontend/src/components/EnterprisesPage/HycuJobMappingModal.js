import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import API_BASE_URL from "../../config";
import { updateEquipmentHycuMapping } from "../../api/equipment";
import { showError, showSuccess } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import formStyles from "./EnterpriseFormModal.module.css";
import modalStyles from "./BackupConfigModal.module.css";

async function fetchHycuJobs(search = "") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", "200");
  const res = await fetch(`${API_BASE_URL}/hycu/jobs?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return Array.isArray(data) ? data : [];
}

const COPY = {
  fr: {
    title: "Mapping HYCU",
    subtitle: "Associer un job Veritas à un job / backup HYCU",
    search: "Rechercher un job HYCU…",
    loading: "Chargement des jobs HYCU…",
    empty: "Aucun job trouvé",
    current: "Mapping actuel",
    none: "Aucun",
    save: "Enregistrer",
    saving: "Enregistrement…",
    clear: "Retirer le mapping",
    cancel: "Annuler",
    closeAria: "Fermer",
    replaceTitle: "Remplacer le mapping CheckMK ?",
    replaceMessage: "Ce job a déjà un mapping CheckMK. Le mapping HYCU le remplacera et CheckMK ne sera plus utilisé pour ce job.",
    replaceConfirm: "Remplacer",
    saved: "Mapping HYCU enregistré",
    cleared: "Mapping HYCU retiré",
    saveError: "Impossible d’enregistrer le mapping HYCU",
    loadError: "Impossible de charger les jobs HYCU",
    pickJob: "Sélectionnez un job HYCU"
  },
  en: {
    title: "HYCU mapping",
    subtitle: "Link a Veritas job to a HYCU job / backup",
    search: "Search a HYCU job…",
    loading: "Loading HYCU jobs…",
    empty: "No job found",
    current: "Current mapping",
    none: "None",
    save: "Save",
    saving: "Saving…",
    clear: "Clear mapping",
    cancel: "Cancel",
    closeAria: "Close",
    replaceTitle: "Replace CheckMK mapping?",
    replaceMessage: "This job already has a CheckMK mapping. HYCU mapping will replace it and CheckMK will no longer be used for this job.",
    replaceConfirm: "Replace",
    saved: "HYCU mapping saved",
    cleared: "HYCU mapping cleared",
    saveError: "Unable to save HYCU mapping",
    loadError: "Unable to load HYCU jobs",
    pickJob: "Select a HYCU job"
  }
};

function getCopy(locale) {
  const lang = String(locale || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
  return COPY[lang];
}

export default function HycuJobMappingModal({
  open,
  onClose,
  stacked = false,
  clientId,
  job,
  hasCheckmkMapping = false,
  onMappingSaved
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const currentUuid = job?.hycu_job_uuid || job?.hycuMapping?.hycu_job_uuid || "";
  const currentName = job?.hycu_job_name || job?.hycuMapping?.hycu_job_name || "";

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedUuid(currentUuid || "");
    setConfirmReplace(false);
  }, [open, currentUuid]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchHycuJobs(search);
        if (!cancelled) setJobs(rows);
      } catch (err) {
        if (!cancelled) {
          setJobs([]);
          showError(err.message || copy.loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(load, search ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, search, copy.loadError]);

  const selectedJob = useMemo(
    () => jobs.find(row => String(row.uuid) === String(selectedUuid)) || null,
    [jobs, selectedUuid]
  );

  const persist = useCallback(async (uuid, name) => {
    if (!clientId || !job?.id) return;
    setSaving(true);
    try {
      const mapping = await updateEquipmentHycuMapping(clientId, job.id, job.nom || job.name, {
        hycu_job_uuid: uuid || null,
        hycu_job_name: name || null
      });
      showSuccess(uuid ? copy.saved : copy.cleared);
      onMappingSaved?.(mapping);
      onClose?.();
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setSaving(false);
      setConfirmReplace(false);
    }
  }, [clientId, job, copy, onMappingSaved, onClose]);

  const handleSave = () => {
    if (!selectedUuid) {
      showError(copy.pickJob);
      return;
    }
    if (hasCheckmkMapping && String(selectedUuid) !== String(currentUuid || "")) {
      setConfirmReplace(true);
      return;
    }
    void persist(selectedUuid, selectedJob?.name || currentName || selectedUuid);
  };

  const handleClear = () => {
    void persist(null, null);
  };

  if (!open) return null;

  return createPortal(<>
      <div className={`${formStyles.overlay} ${stacked ? formStyles.overlayStacked : ""}`} onClick={saving ? undefined : onClose} role="presentation">
        <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className={formStyles.accentBar} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={formStyles.headerIconWrap} aria-hidden>
                <Icon icon="mdi:cloud-sync-outline" />
              </div>
              <div className={formStyles.headerText}>
                <h2 className={formStyles.title}>{copy.title}</h2>
                <p className={formStyles.subtitle}>{copy.subtitle}</p>
              </div>
            </div>
            <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
              <FaTimes />
            </button>
          </header>
          <div className={formStyles.bodySingle}>
            <div className={formStyles.content}>
              <p className={formStyles.hint}>
                <strong>{copy.current} :</strong> {currentName || currentUuid || copy.none}
              </p>
              <div className={formStyles.field}>
                <input
                  type="search"
                  className={formStyles.input}
                  placeholder={copy.search}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div className={modalStyles.jobsList} role="listbox" style={{ maxHeight: 320, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {loading ? <div className={formStyles.hint}>{copy.loading}</div> : null}
                {!loading && jobs.length === 0 ? <div className={formStyles.hint}>{copy.empty}</div> : null}
                {!loading ? jobs.map(row => {
                  const active = String(row.uuid) === String(selectedUuid);
                  return <button
                    key={row.uuid}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${formStyles.ghostBtn} ${active ? formStyles.primaryBtn : ""}`}
                    style={{ justifyContent: "flex-start", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}
                    onClick={() => setSelectedUuid(row.uuid)}
                    disabled={saving}
                  >
                    <strong>{row.name || row.uuid}</strong>
                    <span className={formStyles.hint}>{[row.status, row.uuid].filter(Boolean).join(" · ")}</span>
                  </button>;
                }) : null}
              </div>
            </div>
          </div>
          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{selectedJob?.name || selectedUuid || ""}</span>
            <div className={formStyles.footerActions}>
              {currentUuid ? <button type="button" className={formStyles.ghostBtn} onClick={handleClear} disabled={saving}>{copy.clear}</button> : null}
              <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>{copy.cancel}</button>
              <button type="button" className={formStyles.primaryBtn} onClick={handleSave} disabled={saving || !selectedUuid}>
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {confirmReplace ? createPortal(<div className={`${formStyles.overlay} ${formStyles.overlayStacked}`} onClick={() => !saving && setConfirmReplace(false)} role="presentation">
          <div className={formStyles.shell} style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className={formStyles.header}>
              <div className={formStyles.headerMain}>
                <div className={formStyles.headerIconWrap} aria-hidden>
                  <Icon icon="mdi:alert-outline" />
                </div>
                <div className={formStyles.headerText}>
                  <h2 className={formStyles.title}>{copy.replaceTitle}</h2>
                  <p className={formStyles.subtitle}>{copy.replaceMessage}</p>
                </div>
              </div>
            </header>
            <footer className={formStyles.footer}>
              <div className={formStyles.footerActions}>
                <button type="button" className={formStyles.ghostBtn} onClick={() => setConfirmReplace(false)} disabled={saving}>{copy.cancel}</button>
                <button type="button" className={formStyles.primaryBtn} onClick={() => persist(selectedUuid, selectedJob?.name || selectedUuid)} disabled={saving}>
                  {saving ? copy.saving : copy.replaceConfirm}
                </button>
              </div>
            </footer>
          </div>
        </div>, document.getElementById("modal-root") || document.body) : null}
    </>, document.getElementById("modal-root") || document.body);
}
