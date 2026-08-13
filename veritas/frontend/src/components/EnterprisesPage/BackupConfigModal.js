import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { getIconPath } from "../../utils/assetHelper";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./BackupConfigModal.module.css";
import { getBackupModalCopy, supportsJobs, ACTIVE_BACKUP_MODULE_KEYS } from "./backupConfigModalI18n";
import { coerceStoredOption, formatServeurLieLabel, normalizeServeurLieList } from "./backupJobUtils";
import MultiSuggestPicker from "../AdminPage/MultiSuggestPicker";
const EMPTY_JOB = {
  nom: "",
  regularite: "",
  horaire: "",
  type: "",
  retention: "",
  destination: "",
  serveurLie: [],
  stockageLie: "",
  replicationVers: ""
};
const EMPTY_ACTIVE_MODULES = {
  oneDrive: false,
  sharePoint: false,
  exchange: false,
  teams: false,
  calendar: false,
  contacts: false
};
function renderSelectOptions(options) {
  if (!Array.isArray(options)) return null;
  return options.map(opt => {
    const value = typeof opt === "string" ? opt : opt?.value;
    const label = typeof opt === "string" ? opt : opt?.label ?? opt?.value;
    if (value == null) return null;
    return <option key={String(value)} value={String(value)}>
        {String(label ?? value)}
      </option>;
  });
}
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}
function normalizeInstances(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(instance => ({
    ...instance,
    jobs: Array.isArray(instance.jobs) ? instance.jobs.map(job => ({
      ...job,
      nom: coerceStoredOption(job.nom),
      type: coerceStoredOption(job.type),
      regularite: coerceStoredOption(job.regularite),
      retention: coerceStoredOption(job.retention),
      horaire: coerceStoredOption(job.horaire),
      serveurLie: normalizeServeurLieList(job.serveurLie),
      stockageLie: coerceStoredOption(job.stockageLie),
      destination: coerceStoredOption(job.destination),
      replicationVers: coerceStoredOption(job.replicationVers)
    })) : []
  }));
}
function buildEmptyInstance(type) {
  const id = generateUUID();
  const jobId = generateUUID();
  return {
    id,
    logiciel: type,
    expiration: type === "Veeam" ? "" : undefined,
    server: type === "HYCU Backup" ? "Datacenter PSI" : "",
    hyperbackupSource: type === "HyperBackup" ? "" : undefined,
    hyperbackupDestination: type === "HyperBackup" ? "" : undefined,
    jobs: type === "HYCU Backup" ? [{
      id: jobId,
      ...EMPTY_JOB,
      isDefault: true
    }] : [],
    activeBackupModules: type === "Active Backup for Microsoft 365" ? {
      ...EMPTY_ACTIVE_MODULES
    } : undefined,
    activeBackupStorage: type === "Active Backup for Microsoft 365" ? "" : undefined
  };
}
function getServerOptions(equipements) {
  // Prefer Serveurs; fall back to Servers. Do not concat both — mirrored keys
  // would otherwise list the same hostname twice in the target picker.
  const servers = Array.isArray(equipements?.Serveurs) && equipements.Serveurs.length > 0 ? equipements.Serveurs : Array.isArray(equipements?.Servers) ? equipements.Servers : [];
  if (!servers.length) return [];
  const seen = new Set();
  return servers.map(s => s?.nom || s?.name).filter(Boolean).filter(nom => {
    if (seen.has(nom)) return false;
    seen.add(nom);
    return true;
  }).map(nom => {
    const server = servers.find(s => (s.nom || s.name) === nom);
    const role = Array.isArray(server?.role) ? server.role.join(", ") : server?.role;
    const hint = [role, server?.ip].filter(Boolean).join(" · ");
    return {
      value: nom,
      label: nom,
      hint: hint || undefined
    };
  });
}
function getStorageOptions(equipements, copy) {
  const options = [];
  const eq = copy?.equipment || {};
  const nasList = equipements?.NAS || equipements?.Storage || [];
  if (Array.isArray(nasList)) {
    nasList.forEach(item => {
      if (!item?.nom) return;
      if (item.type === "Disque dur externe") {
        const diskNum = item.numeroDisque ? ` — ${copy.formatDiskNumber(item.numeroDisque)}` : "";
        options.push({
          value: `DISQUE-${item.nom}`,
          label: `${item.nom} (${eq.externalDisk || "External"})${diskNum}`
        });
      } else if (item.type === "NAS" || !item.type) {
        options.push({
          value: `NAS-${item.nom}`,
          label: `${item.nom} (${eq.nas || "NAS"})${item.fabricant || item.modele ? ` — ${[item.fabricant, item.modele].filter(Boolean).join(" ")}` : ""}`
        });
        (item.luns || []).forEach((lun, idx) => {
          const lunName = lun.nom || lun.iqn || `LUN ${idx + 1}`;
          options.push({
            value: `LUN-${item.nom}-${lunName}`,
            label: `${lunName} (${copy.formatLunOn(item.nom)})${lun.capacite ? ` — ${lun.capacite}` : ""}`
          });
        });
      }
    });
  }
  const sanList = equipements?.SAN || [];
  if (Array.isArray(sanList)) {
    sanList.forEach(san => {
      if (!san?.nom) return;
      options.push({
        value: `SAN-${san.nom}`,
        label: `${san.nom} (${eq.san || "SAN"})${san.fabricant || san.modele ? ` — ${[san.fabricant, san.modele].filter(Boolean).join(" ")}` : ""}`
      });
      (san.luns || []).forEach((lun, idx) => {
        const lunName = lun.nom || lun.iqn || `LUN ${idx + 1}`;
        options.push({
          value: `LUN-${san.nom}-${lunName}`,
          label: `${lunName} (${copy.formatLunOn(san.nom)})${lun.capacite ? ` — ${lun.capacite}` : ""}`
        });
      });
    });
  }
  return options;
}
function getNasNameOptions(equipements) {
  const list = [...(Array.isArray(equipements?.NAS) ? equipements.NAS : []), ...(Array.isArray(equipements?.Storage) ? equipements.Storage : []), ...(Array.isArray(equipements?.SAN) ? equipements.SAN : [])];
  return list.filter(eq => eq?.nom && (eq.type === "NAS" || eq.type === "SAN" || !eq.type)).map(eq => ({
    value: eq.nom,
    label: `${eq.nom}${eq.modele ? ` (${eq.modele})` : ""}${eq.ip ? ` — ${eq.ip}` : ""}`
  }));
}
function InstanceCard({
  instance,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onOpenJobs,
  deleting,
  copy,
  logoSrc
}) {
  const jobsCount = Array.isArray(instance.jobs) ? instance.jobs.length : 0;
  const softwareLabel = copy.software[instance.logiciel]?.label || instance.logiciel;
  return <article className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
      <div className={styles.cardMain} onClick={onSelect} role="presentation">
        <div className={styles.cardHead}>
          <div className={styles.cardTitleWrap}>
            {logoSrc ? <img src={logoSrc} alt="" className={styles.cardLogo} /> : <Icon icon="mdi:backup-restore" className={styles.cardLogo} aria-hidden />}
            <strong className={styles.cardTitle}>{softwareLabel}</strong>
          </div>
          {supportsJobs(instance.logiciel) ? <span className={styles.cardBadge}>
              <Icon icon="mdi:briefcase-outline" aria-hidden />
              {copy.formatJobCount(jobsCount)}
            </span> : null}
        </div>
        <div className={styles.cardMeta}>
          <div>
            <span className={styles.metaLabel}>{copy.meta.logiciel}</span>
            <span className={styles.metaValue}>{instance.logiciel || "—"}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.meta.server}</span>
            <span className={styles.metaValue}>
              {instance.server || instance.activeBackupStorage || instance.hyperbackupDestination || "—"}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.cardActions}>
        {supportsJobs(instance.logiciel) ? <button type="button" className={styles.iconBtn} onClick={onOpenJobs} aria-label={copy.actions.openJobs} title={copy.actions.openJobs}>
            <Icon icon="mdi:briefcase-outline" />
          </button> : null}
        <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label={copy.actions.edit}>
          <Icon icon="mdi:pencil-outline" />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={onDelete} disabled={deleting} aria-label={copy.actions.delete}>
          <Icon icon="mdi:trash-can-outline" />
        </button>
      </div>
    </article>;
}
function JobCard({
  job,
  onEdit,
  onDelete,
  deleting,
  copy,
  isDefault
}) {
  const typeLabel = copy.resolveOptionLabel(copy.jobTypeOptions, job.type);
  const regularityLabel = copy.resolveOptionLabel(copy.regularityOptions, job.regularite, "");
  const retentionLabel = copy.resolveOptionLabel(copy.retentionOptions, job.retention);
  const scheduleParts = [regularityLabel, job.horaire].filter(Boolean);
  const scheduleLabel = scheduleParts.length > 0 ? scheduleParts.join(" · ") : "—";
  const targetsLabel = formatServeurLieLabel(job.serveurLie, copy.form.jobTargetNone);
  return <article className={styles.card}>
      <div className={styles.cardMain}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitleWrap}>
            <Icon icon="mdi:briefcase-check-outline" aria-hidden />
            <strong className={styles.cardTitle}>
              {typeof job.nom === "string" || typeof job.nom === "number" ? job.nom : "—"}
            </strong>
          </div>
          {isDefault ? <span className={styles.cardBadge}>{copy.jobs.defaultJob}</span> : null}
        </div>
        <div className={styles.cardMeta}>
          <div>
            <span className={styles.metaLabel}>{copy.meta.type}</span>
            <span className={styles.metaValue}>{typeLabel}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.form.jobTarget}</span>
            <span className={styles.metaValue}>{targetsLabel}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.meta.schedule}</span>
            <span className={styles.metaValue}>{scheduleLabel}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.meta.retention}</span>
            <span className={styles.metaValue}>{retentionLabel}</span>
          </div>
        </div>
      </div>
      <div className={styles.cardActions}>
        <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label={copy.actions.edit}>
          <Icon icon="mdi:pencil-outline" />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={onDelete} disabled={deleting || isDefault} aria-label={copy.actions.delete} title={isDefault ? copy.toasts.cannotDeleteDefaultJob : copy.actions.delete}>
          <Icon icon="mdi:trash-can-outline" />
        </button>
      </div>
    </article>;
}
export default function BackupConfigModal({
  client,
  onClose,
  onSaved,
  initialSection = "overview"
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getBackupModalCopy(locale), [locale]);
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [editingInstanceId, setEditingInstanceId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [instanceDraft, setInstanceDraft] = useState(null);
  const [jobDraft, setJobDraft] = useState(EMPTY_JOB);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const selectedInstance = useMemo(() => instances.find(i => i.id === selectedInstanceId) || null, [instances, selectedInstanceId]);
  const totalJobs = useMemo(() => instances.reduce((sum, i) => sum + (Array.isArray(i.jobs) ? i.jobs.length : 0), 0), [instances]);
  const showJobsNav = Boolean(selectedInstance && supportsJobs(selectedInstance.logiciel));
  const navSections = useMemo(() => copy.navSections({
    editingInstance: Boolean(editingInstanceId),
    editingJob: Boolean(editingJobId),
    selectedInstance,
    showJobs: showJobsNav
  }), [copy, editingInstanceId, editingJobId, selectedInstance, showJobsNav]);
  const serverOptions = useMemo(() => getServerOptions(client?.equipements), [client?.equipements]);
  const stockageOptions = useMemo(() => getStorageOptions(client?.equipements, copy), [client?.equipements, copy]);
  const nasOptions = useMemo(() => getNasNameOptions(client?.equipements), [client?.equipements]);
  const persistInstances = useCallback(async nextInstances => {
    if (!client?.id) return;
    const modulesData = await fetchClientModules(client.id);
    await saveClientModules(client.id, {
      modules: modulesData?.modules || {
        Monitoring: true
      },
      modules_monitoring: {
        ...(modulesData?.modules_monitoring || {}),
        Sauvegarde: nextInstances.length > 0
      },
      equipements: {
        ...(modulesData?.equipements || {}),
        Sauvegarde: {
          instances: nextInstances
        }
      }
    });
    setInstances(normalizeInstances(nextInstances));
    await onSaved?.();
  }, [client?.id, onSaved]);
  const loadData = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    setError(null);
    try {
      const modulesData = await fetchClientModules(client.id);
      const raw = modulesData?.equipements?.Sauvegarde?.instances;
      setInstances(normalizeInstances(raw));
    } catch (err) {
      console.error(err);
      setError(err.message || copy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [client?.id, copy.toasts.loadError]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (!instances.length) {
      if (selectedInstanceId != null) setSelectedInstanceId(null);
      return;
    }
    const stillSelected = instances.some(instance => instance.id === selectedInstanceId);
    if (!stillSelected) setSelectedInstanceId(instances[0].id);
  }, [instances, selectedInstanceId]);
  const resetInstanceForm = () => {
    setEditingInstanceId(null);
    setInstanceDraft(null);
  };
  const resetJobForm = () => {
    setEditingJobId(null);
    setJobDraft({
      ...EMPTY_JOB
    });
  };
  const openAddInstance = () => {
    resetInstanceForm();
    setActiveSection("add-instance");
  };
  const selectSoftwareType = type => {
    setInstanceDraft(buildEmptyInstance(type));
    setEditingInstanceId(null);
  };
  const openEditInstance = instance => {
    setEditingInstanceId(instance.id);
    setInstanceDraft({
      ...instance,
      jobs: Array.isArray(instance.jobs) ? instance.jobs : [],
      activeBackupModules: instance.activeBackupModules ? {
        ...EMPTY_ACTIVE_MODULES,
        ...instance.activeBackupModules
      } : undefined
    });
    setActiveSection("edit-instance");
  };
  const openJobsForInstance = instance => {
    setSelectedInstanceId(instance.id);
    resetJobForm();
    setActiveSection("jobs");
  };
  const openAddJob = () => {
    if (!selectedInstance || !supportsJobs(selectedInstance.logiciel)) return;
    resetJobForm();
    setJobDraft({
      ...EMPTY_JOB,
      stockageLie: selectedInstance.logiciel === "HYCU Backup" ? "Datacenter PSI" : ""
    });
    setActiveSection("add-job");
  };
  const openEditJob = job => {
    setEditingJobId(job.id);
    setJobDraft({
      ...EMPTY_JOB,
      ...job,
      serveurLie: normalizeServeurLieList(job.serveurLie),
      stockageLie: selectedInstance?.logiciel === "HYCU Backup" ? "Datacenter PSI" : job.stockageLie || ""
    });
    setActiveSection("edit-job");
  };
  const handleSubmitInstance = async () => {
    if (!instanceDraft?.logiciel) return;
    setSaving(true);
    setError(null);
    try {
      let next;
      if (editingInstanceId) {
        next = instances.map(inst => inst.id === editingInstanceId ? {
          ...instanceDraft,
          id: editingInstanceId,
          jobs: inst.jobs || []
        } : inst);
      } else {
        next = [...instances, instanceDraft];
      }
      await persistInstances(next);
      toast.success(editingInstanceId ? copy.toasts.instanceUpdated : copy.toasts.instanceAdded);
      setSelectedInstanceId(instanceDraft.id);
      resetInstanceForm();
      setActiveSection("instances");
    } catch (err) {
      const message = err.message || copy.toasts.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  const handleSubmitJob = async () => {
    if (!selectedInstanceId) return;
    const nom = (jobDraft.nom || "").trim();
    if (!nom) {
      setError(copy.toasts.jobNameRequired);
      toast.warning(copy.toasts.jobNameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = instances.map(inst => {
        if (inst.id !== selectedInstanceId) return inst;
        const jobs = Array.isArray(inst.jobs) ? [...inst.jobs] : [];
        if (editingJobId) {
          return {
            ...inst,
            jobs: jobs.map(j => j.id === editingJobId ? {
              ...j,
              ...jobDraft,
              id: editingJobId,
              nom,
              serveurLie: normalizeServeurLieList(jobDraft.serveurLie),
              stockageLie: inst.logiciel === "HYCU Backup" ? "Datacenter PSI" : jobDraft.stockageLie
            } : j)
          };
        }
        return {
          ...inst,
          jobs: [...jobs, {
            id: generateUUID(),
            ...jobDraft,
            nom,
            serveurLie: normalizeServeurLieList(jobDraft.serveurLie),
            stockageLie: inst.logiciel === "HYCU Backup" ? "Datacenter PSI" : jobDraft.stockageLie
          }]
        };
      });
      await persistInstances(next);
      toast.success(editingJobId ? copy.toasts.jobUpdated : copy.toasts.jobAdded);
      resetJobForm();
      setActiveSection("jobs");
    } catch (err) {
      const message = err.message || copy.toasts.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  const requestDeleteInstance = instance => {
    setDeleteTarget({
      kind: "instance",
      item: instance
    });
  };
  const requestDeleteJob = job => {
    if (job.isDefault) {
      toast.warning(copy.toasts.cannotDeleteDefaultJob);
      return;
    }
    setDeleteTarget({
      kind: "job",
      item: job
    });
  };
  const confirmDelete = async () => {
    if (!deleteTarget?.item?.id) return;
    setDeletingId(deleteTarget.item.id);
    setError(null);
    try {
      let next;
      if (deleteTarget.kind === "instance") {
        next = instances.filter(i => i.id !== deleteTarget.item.id);
        if (editingInstanceId === deleteTarget.item.id) resetInstanceForm();
      } else {
        next = instances.map(inst => {
          if (inst.id !== selectedInstanceId) return inst;
          return {
            ...inst,
            jobs: (inst.jobs || []).filter(j => j.id !== deleteTarget.item.id)
          };
        });
        if (editingJobId === deleteTarget.item.id) resetJobForm();
      }
      await persistInstances(next);
      toast.success(deleteTarget.kind === "instance" ? copy.toasts.instanceDeleted : copy.toasts.jobDeleted);
      setDeleteTarget(null);
      setActiveSection(deleteTarget.kind === "instance" ? "instances" : "jobs");
    } catch (err) {
      const message = err.message || copy.toasts.deleteError;
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };
  const isInstanceForm = activeSection === "add-instance" || activeSection === "edit-instance";
  const isJobForm = activeSection === "add-job" || activeSection === "edit-job";
  const isFormSection = isInstanceForm || isJobForm;
  const primaryDisabled = (() => {
    if (!isFormSection || saving) return true;
    if (isInstanceForm) return !instanceDraft?.logiciel;
    if (isJobForm) return !(jobDraft.nom || "").trim();
    return true;
  })();
  const primaryLabel = (() => {
    if (!isFormSection) return null;
    if (saving) return common.saving;
    if (isJobForm) return editingJobId ? copy.primary.update : copy.primary.add;
    if (editingInstanceId) return copy.primary.saveInstance;
    return copy.primary.createInstance;
  })();
  const deleteLabel = deleteTarget?.kind === "instance" ? copy.software[deleteTarget.item?.logiciel]?.label || deleteTarget.item?.logiciel || copy.deleteFallback.instance : deleteTarget?.item?.nom || copy.deleteFallback.job;
  const renderOverview = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.overview.title}</h3>
        <p className={layout.sectionDesc}>{copy.overview.description}</p>
      </div>
      <div className={styles.kpiRow}>
        <button type="button" className={styles.kpiCard} onClick={() => setActiveSection("instances")}>
          <div className={`${styles.kpiIconWrap} ${styles.kpiIcon_blue}`}>
            <Icon icon="mdi:server-outline" aria-hidden />
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{instances.length}</span>
            <span className={styles.kpiLabel}>{copy.kpi.instances}</span>
          </div>
        </button>
        <button type="button" className={styles.kpiCard} onClick={() => {
        if (selectedInstance && supportsJobs(selectedInstance.logiciel)) {
          setActiveSection("jobs");
        } else {
          setActiveSection("instances");
        }
      }}>
          <div className={`${styles.kpiIconWrap} ${styles.kpiIcon_green}`}>
            <Icon icon="mdi:briefcase-outline" aria-hidden />
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{totalJobs}</span>
            <span className={styles.kpiLabel}>{copy.kpi.jobs}</span>
          </div>
        </button>
      </div>
      <div className={styles.overviewActions}>
        <button type="button" className={layout.ghostBtn} onClick={openAddInstance}>
          <Icon icon="mdi:plus-circle-outline" aria-hidden />
          {copy.overview.addBtn}
        </button>
        <button type="button" className={layout.ghostBtn} onClick={() => setActiveSection("instances")} disabled={instances.length === 0}>
          <Icon icon="mdi:format-list-bulleted" aria-hidden />
          {copy.overview.viewInstances}
        </button>
      </div>
    </>;
  const renderInstances = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.instances.title}</h3>
        <p className={layout.sectionDesc}>{copy.instances.description}</p>
      </div>
      <div className={styles.listToolbar}>
        <p className={styles.listCount}>{copy.formatInstanceCount(instances.length)}</p>
        {instances.length > 0 ? <button type="button" className={layout.ghostBtn} onClick={openAddInstance}>
            <Icon icon="mdi:plus" aria-hidden />
            {copy.instances.addBtn}
          </button> : null}
      </div>
      {instances.length === 0 ? <div className={styles.emptyState}>
          <Icon icon="mdi:backup-restore" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyText}>{copy.empty.noInstances}</p>
          <button type="button" className={layout.primaryBtn} onClick={openAddInstance}>
            {copy.empty.addInstance}
          </button>
        </div> : <div className={styles.list}>
          {instances.map(instance => {
        const iconFile = copy.softwareIcons[instance.logiciel];
        return <InstanceCard key={instance.id} instance={instance} selected={instance.id === selectedInstanceId} logoSrc={iconFile ? getIconPath(iconFile) : null} copy={copy} deleting={deletingId === instance.id} onSelect={() => setSelectedInstanceId(instance.id)} onEdit={() => openEditInstance(instance)} onDelete={() => requestDeleteInstance(instance)} onOpenJobs={() => openJobsForInstance(instance)} />;
      })}
        </div>}
    </>;
  const renderInstanceForm = () => {
    const isEdit = activeSection === "edit-instance";
    const sectionCopy = isEdit ? copy.editInstance : copy.addInstance;
    const showTypePicker = !isEdit && !instanceDraft;
    return <>
        <div className={layout.sectionHead}>
          <h3 className={layout.sectionTitle}>{sectionCopy.title}</h3>
          <p className={layout.sectionDesc}>{sectionCopy.description}</p>
        </div>

        {showTypePicker ? <>
            <p className={styles.hintBanner}>{copy.addInstance.pickType}</p>
            <div className={styles.typeGrid}>
              {copy.softwareTypes.map(type => {
            const info = copy.software[type];
            const iconFile = copy.softwareIcons[type];
            return <button key={type} type="button" className={styles.typeCard} onClick={() => selectSoftwareType(type)}>
                    {iconFile ? <img src={getIconPath(iconFile)} alt="" className={styles.typeLogo} /> : null}
                    <span className={styles.typeBody}>
                      <span className={styles.typeLabel}>{info?.label || type}</span>
                      <span className={styles.typeDesc}>{info?.description}</span>
                    </span>
                  </button>;
          })}
            </div>
          </> : instanceDraft ? <>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label}>{copy.form.logiciel}</label>
                <input className={layout.input} value={copy.software[instanceDraft.logiciel]?.label || instanceDraft.logiciel} disabled />
              </div>

              {instanceDraft.logiciel === "Veeam" ? <>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="backup-expiration">
                      {copy.form.expiration}
                    </label>
                    <input id="backup-expiration" type="date" className={layout.input} value={instanceDraft.expiration || ""} onChange={e => setInstanceDraft(prev => ({
                ...prev,
                expiration: e.target.value
              }))} />
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="backup-server">
                      {copy.form.server}
                    </label>
                    <select id="backup-server" className={layout.input} value={instanceDraft.server || ""} onChange={e => setInstanceDraft(prev => ({
                ...prev,
                server: e.target.value
              }))}>
                      <option value="">{copy.form.serverNone}</option>
                      {renderSelectOptions(serverOptions)}
                    </select>
                  </div>
                </> : null}

              {instanceDraft.logiciel === "HyperBackup" ? <>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="hb-source">
                      {copy.form.hyperbackupSource}
                    </label>
                    <select id="hb-source" className={layout.input} value={instanceDraft.hyperbackupSource || ""} onChange={e => setInstanceDraft(prev => ({
                ...prev,
                hyperbackupSource: e.target.value
              }))}>
                      <option value="">{copy.form.storageNone}</option>
                      {renderSelectOptions(nasOptions)}
                    </select>
                  </div>
                  <div className={layout.field}>
                    <label className={layout.label} htmlFor="hb-dest">
                      {copy.form.hyperbackupDestination}
                    </label>
                    <select id="hb-dest" className={layout.input} value={instanceDraft.hyperbackupDestination || ""} onChange={e => setInstanceDraft(prev => ({
                ...prev,
                hyperbackupDestination: e.target.value
              }))}>
                      <option value="">{copy.form.storageNone}</option>
                      {renderSelectOptions(nasOptions)}
                    </select>
                  </div>
                </> : null}

              {instanceDraft.logiciel === "Active Backup for Microsoft 365" ? <>
                  <div className={`${layout.field} ${layout.fieldFull}`}>
                    <label className={layout.label}>{copy.form.activeBackupModules}</label>
                    <div className={styles.modulesGrid}>
                      {ACTIVE_BACKUP_MODULE_KEYS.map(key => {
                  const checked = Boolean(instanceDraft.activeBackupModules?.[key]);
                  return <label key={key} className={`${styles.moduleChip} ${checked ? styles.moduleChipActive : ""}`}>
                            <input type="checkbox" checked={checked} onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      activeBackupModules: {
                        ...EMPTY_ACTIVE_MODULES,
                        ...(prev.activeBackupModules || {}),
                        [key]: e.target.checked
                      }
                    }))} />
                            {copy.form.modules[key]}
                          </label>;
                })}
                    </div>
                  </div>
                  <div className={`${layout.field} ${layout.fieldFull}`}>
                    <label className={layout.label} htmlFor="ab-storage">
                      {copy.form.activeBackupStorage}
                    </label>
                    <select id="ab-storage" className={layout.input} value={instanceDraft.activeBackupStorage || ""} onChange={e => setInstanceDraft(prev => ({
                ...prev,
                activeBackupStorage: e.target.value
              }))}>
                      <option value="">{copy.form.storageNone}</option>
                      {renderSelectOptions(nasOptions)}
                    </select>
                  </div>
                </> : null}

              {instanceDraft.logiciel === "HYCU Backup" ? <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label}>{copy.form.server}</label>
                  <input className={layout.input} value="Datacenter PSI" disabled />
                </div> : null}
            </div>

            <div className={styles.formCancelRow}>
              <button type="button" className={layout.ghostBtn} onClick={() => {
            resetInstanceForm();
            setActiveSection(isEdit ? "instances" : "add-instance");
          }}>
                {copy.form.cancel}
              </button>
            </div>
          </> : null}
      </>;
  };
  const renderJobs = () => {
    if (!selectedInstance) {
      return <div className={styles.emptyState}>
          <Icon icon="mdi:information-outline" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyText}>{copy.jobs.selectInstance}</p>
          <button type="button" className={layout.ghostBtn} onClick={() => setActiveSection("instances")}>
            {copy.overview.viewInstances}
          </button>
        </div>;
    }
    if (!supportsJobs(selectedInstance.logiciel)) {
      return <div className={styles.emptyState}>
          <Icon icon="mdi:briefcase-off-outline" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyText}>{copy.jobs.noJobsSupport}</p>
        </div>;
    }
    const jobs = selectedInstance.jobs || [];
    const softwareLabel = copy.software[selectedInstance.logiciel]?.label || selectedInstance.logiciel;
    return <>
        <div className={layout.sectionHead}>
          <h3 className={layout.sectionTitle}>{copy.jobs.title}</h3>
          <p className={layout.sectionDesc}>
            {copy.jobs.description} — {softwareLabel}
          </p>
        </div>
        <div className={styles.listToolbar}>
          <p className={styles.listCount}>{copy.formatJobCount(jobs.length)}</p>
          {jobs.length > 0 ? <button type="button" className={layout.ghostBtn} onClick={openAddJob}>
              <Icon icon="mdi:plus" aria-hidden />
              {copy.jobs.addBtn}
            </button> : null}
        </div>
        {jobs.length === 0 ? <div className={styles.emptyState}>
            <Icon icon="mdi:briefcase-plus-outline" className={styles.emptyIcon} aria-hidden />
            <p className={styles.emptyText}>{copy.empty.noJobs}</p>
            <button type="button" className={layout.primaryBtn} onClick={openAddJob}>
              {copy.empty.addJob}
            </button>
          </div> : <div className={styles.list}>
            {jobs.map((job, idx) => {
          const isDefault = selectedInstance.logiciel === "HYCU Backup" && (job.isDefault || jobs.length === 1 && idx === 0);
          return <JobCard key={job.id || idx} job={job} copy={copy} isDefault={isDefault} deleting={deletingId === job.id} onEdit={() => openEditJob(job)} onDelete={() => requestDeleteJob(job)} />;
        })}
          </div>}
      </>;
  };
  const renderJobForm = () => {
    const isEdit = activeSection === "edit-job";
    const sectionCopy = isEdit ? copy.editJob : copy.addJob;
    const isHycu = selectedInstance?.logiciel === "HYCU Backup";
    return <>
        <div className={layout.sectionHead}>
          <h3 className={layout.sectionTitle}>{sectionCopy.title}</h3>
          <p className={layout.sectionDesc}>{sectionCopy.description}</p>
        </div>
        <div className={layout.fieldGrid2}>
          <div className={`${layout.field} ${layout.fieldFull}`}>
            <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="job-nom">
              {copy.form.jobName}
            </label>
            <input id="job-nom" type="text" className={layout.input} value={jobDraft.nom} onChange={e => setJobDraft(prev => ({
            ...prev,
            nom: e.target.value
          }))} placeholder={copy.form.jobNamePlaceholder} />
          </div>
          <div className={`${layout.field} ${layout.fieldFull}`}>
            <label className={layout.label} htmlFor="job-target-search">
              {copy.form.jobTarget}
            </label>
            {serverOptions.length === 0 ? <p className={layout.sectionDesc}>{copy.form.jobTargetEmpty}</p> : <MultiSuggestPicker inputId="job-target-search" placeholder={copy.form.jobTargetSearch} emptyHint={copy.form.selectedTargetsNone} emptyResultsHint={copy.form.jobTargetEmptyResults} options={serverOptions.map(option => ({
            id: option.value,
            label: option.label,
            hint: option.hint
          }))} selectedIds={normalizeServeurLieList(jobDraft.serveurLie)} onChange={next => setJobDraft(prev => ({
            ...prev,
            serveurLie: normalizeServeurLieList(next)
          }))} />}
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-dest">
              {copy.form.jobDestination}
            </label>
            {isHycu ? <input id="job-dest" className={layout.input} value="Datacenter PSI" disabled /> : <select id="job-dest" className={layout.input} value={jobDraft.stockageLie || ""} onChange={e => setJobDraft(prev => ({
            ...prev,
            stockageLie: e.target.value
          }))}>
                <option value="">{copy.form.jobDestinationNone}</option>
                {renderSelectOptions(stockageOptions)}
              </select>}
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-type">
              {copy.form.jobType}
            </label>
            <select id="job-type" className={layout.input} value={jobDraft.type || ""} onChange={e => setJobDraft(prev => ({
            ...prev,
            type: e.target.value
          }))}>
              <option value="">{copy.form.jobTypeNone}</option>
              {renderSelectOptions(copy.jobTypeOptions)}
            </select>
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-reg">
              {copy.form.jobRegularity}
            </label>
            <select id="job-reg" className={layout.input} value={jobDraft.regularite || ""} onChange={e => setJobDraft(prev => ({
            ...prev,
            regularite: e.target.value
          }))}>
              <option value="">{copy.form.jobRegularityNone}</option>
              {renderSelectOptions(copy.regularityOptions)}
            </select>
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-horaire">
              {copy.form.jobSchedule}
            </label>
            <input id="job-horaire" type="time" className={layout.input} value={jobDraft.horaire || ""} onChange={e => setJobDraft(prev => ({
            ...prev,
            horaire: e.target.value
          }))} />
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-ret">
              {copy.form.jobRetention}
            </label>
            <select id="job-ret" className={layout.input} value={jobDraft.retention || ""} onChange={e => setJobDraft(prev => ({
            ...prev,
            retention: e.target.value
          }))}>
              <option value="">{copy.form.jobRetentionNone}</option>
              {renderSelectOptions(copy.retentionOptions)}
            </select>
          </div>
        </div>
        <div className={styles.formCancelRow}>
          <button type="button" className={layout.ghostBtn} onClick={() => {
          resetJobForm();
          setActiveSection("jobs");
        }}>
            {copy.form.cancel}
          </button>
        </div>
      </>;
  };
  const handlePrimary = () => {
    if (isInstanceForm) handleSubmitInstance();else if (isJobForm) handleSubmitJob();
  };
  return <>
      {createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
          <div className={layout.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="backup-modal-title">
            <div className={layout.accentBar} aria-hidden />

            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon="mdi:backup-restore" />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>{copy.eyebrow}</p>
                  <h2 id="backup-modal-title" className={layout.title}>
                    {copy.title}
                  </h2>
                  <p className={layout.subtitle}>{copy.subtitle}</p>
                </div>
              </div>
              <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={common.close}>
                <FaTimes />
              </button>
            </header>

            <div className={layout.body}>
              <nav className={layout.nav} aria-label={copy.navAria}>
                {navSections.map(section => {
              let badge = null;
              if (section.id === "instances") badge = instances.length;
              if (section.id === "jobs" && selectedInstance) {
                badge = (selectedInstance.jobs || []).length;
              }
              const isActive = activeSection === section.id || section.id === "instances" && activeSection === "add-instance" || section.id === "jobs" && activeSection === "add-job";
              return <button key={section.id} type="button" className={`${layout.navItem} ${isActive ? layout.navItemActive : ""}`} onClick={() => {
                if (section.id === "instances" && (activeSection === "add-instance" || activeSection === "edit-instance")) {
                  resetInstanceForm();
                }
                if (section.id === "jobs" && (activeSection === "add-job" || activeSection === "edit-job")) {
                  resetJobForm();
                }
                setActiveSection(section.id);
              }} aria-current={isActive ? "step" : undefined}>
                      <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                      <span className={layout.navItemText}>
                        <span className={layout.navItemLabel}>{section.label}</span>
                        <span className={layout.navItemHint}>{section.description}</span>
                      </span>
                      {badge != null && badge !== 0 ? <span className={layout.navBadge}>{badge}</span> : null}
                    </button>;
            })}
              </nav>

              <div className={layout.content}>
                {error ? <div className={styles.errorBanner} role="alert">
                    {error}
                  </div> : null}
                {loading ? <div className={styles.loadingWrap}>
                    <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                    {copy.loading}
                  </div> : <>
                    {activeSection === "overview" && renderOverview()}
                    {activeSection === "instances" && renderInstances()}
                    {(activeSection === "add-instance" || activeSection === "edit-instance") && renderInstanceForm()}
                    {activeSection === "jobs" && renderJobs()}
                    {(activeSection === "add-job" || activeSection === "edit-job") && renderJobForm()}
                  </>}
              </div>
            </div>

            {isFormSection && (instanceDraft || isJobForm) ? <footer className={layout.footer}>
                <span className={layout.footerHint}>
                  {isJobForm ? copy.footer.nameRequired : !instanceDraft ? copy.footer.pickSoftware : ""}
                </span>
                <div className={layout.footerActions}>
                  <button type="button" className={layout.primaryBtn} onClick={handlePrimary} disabled={primaryDisabled}>
                    <Icon icon={saving ? "mdi:loading" : isJobForm || editingInstanceId ? "mdi:content-save-outline" : "mdi:plus"} className={saving ? layout.spinning : undefined} aria-hidden />
                    {primaryLabel}
                  </button>
                </div>
              </footer> : null}
          </div>
        </div>, document.getElementById("modal-root") || document.body)}

      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.deleteEntry.title} message={interpolate(configCopy.confirm.deleteEntry.message, {
      label: deleteLabel
    })} confirmLabel={common.delete} variant="danger" icon="mdi:delete-alert-outline" loading={Boolean(deletingId)} onClose={() => {
      if (!deletingId) setDeleteTarget(null);
    }} onConfirm={confirmDelete} />
    </>;
}
