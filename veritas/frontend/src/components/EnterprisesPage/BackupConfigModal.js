import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { getClientHardwareEquipment } from "../../api/equipment";
import { getIconPath } from "../../utils/assetHelper";
import { UiKitButton, UiKitModalNavSectionButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./BackupConfigModal.module.css";
import { getBackupModalCopy, supportsJobs, ACTIVE_BACKUP_MODULE_KEYS } from "./backupConfigModalI18n";
import { coerceStoredOption, formatServeurLieLabel, isBackupJobActive, normalizeServeurLieList, pickBackupJobType } from "./backupJobUtils";
import {
  getBackupProduct,
  productHasField,
  productSeedDefaultJob,
  resolveBrandIdForProduct,
} from "./backupSoftwareCatalog";
import {
  getStorageTypeLabel,
  normalizeStorageType
} from "../EquipementPage/equipmentFormConfig";
import BackupSoftwarePicker from "./BackupSoftwarePicker";
import MultiSuggestPicker from "../AdminPage/MultiSuggestPicker";
import EquipmentMappingModal from "../EquipementPage/EquipmentMappingModal";
import HycuJobMappingModal from "./HycuJobMappingModal";

const STORAGE_DEST_PREFIX = {
  nas: "NAS",
  san: "SAN",
  externe: "DISQUE",
  cloud: "CLOUD",
  virtuel: "VIRT",
  robot: "ROBOT"
};
const EMPTY_JOB = {
  nom: "",
  regularite: "",
  horaire: "",
  type: "",
  retention: "",
  destination: "",
  serveurLie: [],
  stockageLie: "",
  replicationVers: "",
  actif: true
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
      type: pickBackupJobType(job),
      typeBackup: pickBackupJobType(job),
      regularite: coerceStoredOption(job.regularite),
      retention: coerceStoredOption(job.retention),
      horaire: coerceStoredOption(job.horaire),
      serveurLie: normalizeServeurLieList(job.serveurLie),
      stockageLie: coerceStoredOption(job.stockageLie),
      destination: coerceStoredOption(job.destination),
      replicationVers: coerceStoredOption(job.replicationVers),
      actif: isBackupJobActive(job)
    })) : []
  }));
}
function buildEmptyInstance(type, meta = {}) {
  const id = generateUUID();
  const jobId = generateUUID();
  const hasExpiration = productHasField(type, "expiration");
  const hasServer = productHasField(type, "server");
  const hasHycu = productHasField(type, "hycuServer");
  const hasHyper = productHasField(type, "hyperbackup");
  const hasActive = productHasField(type, "activeBackup");
  const hasLicense = productHasField(type, "license");
  const hasCloudRegion = productHasField(type, "cloudRegion");
  const hasCloudBucket = productHasField(type, "cloudBucket");
  const seedJob = productSeedDefaultJob(type);
  return {
    id,
    logiciel: type,
    brandId: meta.brandId || resolveBrandIdForProduct(type),
    customBrand: meta.customBrand || undefined,
    expiration: hasExpiration ? "" : undefined,
    licenseKey: hasLicense ? "" : undefined,
    cloudRegion: hasCloudRegion ? "" : undefined,
    cloudBucket: hasCloudBucket ? "" : undefined,
    server: hasHycu || hasServer ? "" : "",
    hyperbackupSource: hasHyper ? "" : undefined,
    hyperbackupDestination: hasHyper ? "" : undefined,
    jobs: seedJob ? [{
      id: jobId,
      ...EMPTY_JOB,
      isDefault: true
    }] : [],
    activeBackupModules: hasActive ? {
      ...EMPTY_ACTIVE_MODULES
    } : undefined,
    activeBackupStorage: hasActive ? "" : undefined
  };
}
const SERVER_TYPES = new Set(["Servers", "Serveurs", "Server", "Serveur"]);
const STORAGE_TYPES = new Set(["NAS", "Storage", "Stockage", "SAN"]);
function mergeNamedEquipment(primary, fallback) {
  const seen = new Set();
  const out = [];
  [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(fallback) ? fallback : [])].forEach(item => {
    const key = String(item?.nom || item?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}
function hardwareToLegacyServer(eq) {
  return {
    nom: eq?.name || eq?.nom || "",
    name: eq?.name || eq?.nom || "",
    role: eq?.role,
    ip: eq?.ip
  };
}
function hardwareToLegacyStorage(eq) {
  const raw = eq?.rawData && typeof eq.rawData === "object" ? eq.rawData : {};
  const storageType =
    eq?.storageType ||
    eq?.typeServer ||
    raw.type ||
    raw.storageType ||
    (eq?.type === "SAN" ? "SAN" : "NAS");
  return {
    nom: eq?.name || eq?.nom || raw.nom || "",
    type: storageType,
    fabricant: eq?.manufacturer || raw.fabricant,
    modele: eq?.model || raw.modele,
    ip: eq?.ip || raw.ip,
    luns: raw.luns || eq?.luns || [],
    numeroDisque: raw.numeroDisque || raw.numero_disque
  };
}
function isSanStorageItem(item) {
  return normalizeStorageType(item?.type || item?.storageType) === "san";
}
function mergeBackupEquipements(legacy, hardwareList) {
  const hardware = Array.isArray(hardwareList) ? hardwareList : [];
  const hwServers = hardware.filter(eq => SERVER_TYPES.has(eq?.type)).map(hardwareToLegacyServer);
  const hwStorage = hardware.filter(eq => STORAGE_TYPES.has(eq?.type)).map(hardwareToLegacyStorage);
  const legacyServers = Array.isArray(legacy?.Serveurs) && legacy.Serveurs.length > 0 ? legacy.Serveurs : Array.isArray(legacy?.Servers) ? legacy.Servers : [];
  const legacyStorage = [...(legacy?.NAS || []), ...(legacy?.Storage || [])];
  return {
    ...legacy,
    Serveurs: mergeNamedEquipment(hwServers, legacyServers),
    NAS: mergeNamedEquipment(
      hwStorage.filter(item => !isSanStorageItem(item)),
      legacyStorage
    ),
    SAN: mergeNamedEquipment(
      hwStorage.filter(item => isSanStorageItem(item)),
      legacy?.SAN || []
    )
  };
}
function listClientStorageItems(equipements) {
  return [
    ...(Array.isArray(equipements?.NAS) ? equipements.NAS : []),
    ...(Array.isArray(equipements?.Storage) ? equipements.Storage : []),
    ...(Array.isArray(equipements?.SAN) ? equipements.SAN : [])
  ];
}
function resolveStorageTypeLabel(typeKey, copy) {
  const eq = copy?.equipment || {};
  if (typeKey === "nas") return eq.nas || getStorageTypeLabel("nas") || "NAS";
  if (typeKey === "san") return eq.san || getStorageTypeLabel("san") || "SAN";
  if (typeKey === "externe") return eq.externalDisk || getStorageTypeLabel("externe") || "Disque externe";
  if (typeKey === "cloud") return eq.cloud || getStorageTypeLabel("cloud") || "Cloud";
  if (typeKey === "virtuel") return eq.virtual || getStorageTypeLabel("virtuel") || "Virtuel";
  if (typeKey === "robot") return eq.robot || getStorageTypeLabel("robot") || "Robot";
  return getStorageTypeLabel(typeKey) || typeKey || "Stockage";
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
  const seen = new Set();
  listClientStorageItems(equipements).forEach(item => {
    const nom = String(item?.nom || item?.name || "").trim();
    if (!nom) return;
    const typeKey = normalizeStorageType(item.type || item.storageType) || "nas";
    const prefix = STORAGE_DEST_PREFIX[typeKey] || "STOR";
    const value = `${prefix}-${nom}`;
    if (seen.has(value)) return;
    seen.add(value);

    const typeLabel = resolveStorageTypeLabel(typeKey, copy);
    const diskNum =
      typeKey === "externe" && item.numeroDisque && typeof copy?.formatDiskNumber === "function"
        ? ` — ${copy.formatDiskNumber(item.numeroDisque)}`
        : typeKey === "externe" && item.numeroDisque
          ? ` — #${item.numeroDisque}`
          : "";
    const meta = [item.fabricant, item.modele].filter(Boolean).join(" ");
    options.push({
      value,
      label: `${nom} (${typeLabel})${diskNum}${meta ? ` — ${meta}` : ""}`
    });

    if (typeKey === "nas" || typeKey === "san") {
      (item.luns || []).forEach((lun, idx) => {
        const lunName = lun.nom || lun.iqn || `LUN ${idx + 1}`;
        const lunValue = `LUN-${nom}-${lunName}`;
        if (seen.has(lunValue)) return;
        seen.add(lunValue);
        options.push({
          value: lunValue,
          label: `${lunName} (${
            typeof copy?.formatLunOn === "function" ? copy.formatLunOn(nom) : `LUN · ${nom}`
          })${lun.capacite ? ` — ${lun.capacite}` : ""}`
        });
      });
    }
  });
  return options;
}
function getNasNameOptions(equipements) {
  const seen = new Set();
  return listClientStorageItems(equipements)
    .map(eq => {
      const nom = String(eq?.nom || eq?.name || "").trim();
      if (!nom || seen.has(nom.toLowerCase())) return null;
      seen.add(nom.toLowerCase());
      const typeKey = normalizeStorageType(eq.type || eq.storageType);
      const typeHint = typeKey ? getStorageTypeLabel(typeKey) : "";
      return {
        value: nom,
        label: `${nom}${typeHint ? ` (${typeHint})` : ""}${eq.modele ? ` · ${eq.modele}` : ""}${
          eq.ip ? ` — ${eq.ip}` : ""
        }`
      };
    })
    .filter(Boolean);
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
  const productMeta = getBackupProduct(instance.logiciel);
  const fallbackIcon = productMeta?.iconify || "mdi:backup-restore";
  return <article className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
      <div className={styles.cardMain} onClick={onSelect} role="presentation">
        <div className={styles.cardHead}>
          <div className={styles.cardTitleWrap}>
            {logoSrc ? <img src={logoSrc} alt="" className={styles.cardLogo} /> : <Icon icon={fallbackIcon} className={styles.cardLogo} aria-hidden />}
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
              {instance.server || instance.cloudBucket || instance.cloudRegion || instance.activeBackupStorage || instance.hyperbackupDestination || "—"}
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
function isHycuLogiciel(logiciel) {
  return /hycu/i.test(String(logiciel || "").trim());
}
function isJobCheckmkMapped(job) {
  return Boolean(String(job?.checkmk_host_name || job?.checkmkMapping?.checkmk_host_name || "").trim());
}
function isJobHycuMapped(job) {
  return Boolean(String(job?.hycu_job_uuid || job?.hycuMapping?.hycu_job_uuid || "").trim());
}
function jobCheckmkLabel(job) {
  const host = String(job?.checkmk_host_name || job?.checkmkMapping?.checkmk_host_name || "").trim();
  const service = String(job?.checkmk_service_name || job?.checkmkMapping?.checkmk_service_name || "").trim();
  return [host, service].filter(Boolean).join(" · ");
}
function jobHycuLabel(job) {
  const name = String(job?.hycu_job_name || job?.hycuMapping?.hycu_job_name || "").trim();
  const uuid = String(job?.hycu_job_uuid || job?.hycuMapping?.hycu_job_uuid || "").trim();
  return name || uuid;
}
function JobCard({
  job,
  onEdit,
  onDelete,
  onMap,
  deleting,
  copy,
  isDefault,
  canMapCheckmk,
  canMapHycu
}) {
  const typeLabel = copy.resolveOptionLabel(copy.jobTypeOptions, pickBackupJobType(job));
  const regularityLabel = copy.resolveOptionLabel(copy.regularityOptions, job.regularite, "");
  const retentionLabel = copy.resolveOptionLabel(copy.retentionOptions, job.retention);
  const scheduleParts = [regularityLabel, job.horaire].filter(Boolean);
  const scheduleLabel = scheduleParts.length > 0 ? scheduleParts.join(" · ") : "—";
  const targetsLabel = formatServeurLieLabel(job.serveurLie, copy.form.jobTargetNone);
  const jobActive = isBackupJobActive(job);
  const mappedCheckmk = isJobCheckmkMapped(job);
  const mappedHycu = isJobHycuMapped(job);
  const checkmkLabel = jobCheckmkLabel(job);
  const hycuLabel = jobHycuLabel(job);
  const canMap = canMapCheckmk || canMapHycu;
  return <article className={`${styles.card} ${jobActive ? "" : styles.cardInactive}`}>
      <div className={styles.cardMain}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitleWrap}>
            <Icon icon="mdi:briefcase-check-outline" aria-hidden />
            <strong className={styles.cardTitle}>
              {typeof job.nom === "string" || typeof job.nom === "number" ? job.nom : "—"}
            </strong>
          </div>
          <div className={styles.cardBadges}>
            {isDefault ? <span className={styles.cardBadge}>{copy.jobs.defaultJob}</span> : null}
            <span className={`${styles.cardBadge} ${jobActive ? styles.cardBadgeActive : styles.cardBadgeInactive}`}>
              {jobActive ? copy.form.jobActive : copy.form.jobInactive}
            </span>
          </div>
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
          {mappedCheckmk ? <div>
              <span className={styles.metaLabel}>{copy.meta.checkmk}</span>
              <span className={styles.metaValue}>{checkmkLabel || "—"}</span>
            </div> : null}
          {mappedHycu ? <div>
              <span className={styles.metaLabel}>{copy.meta.hycu || "HYCU"}</span>
              <span className={styles.metaValue}>{hycuLabel || "—"}</span>
            </div> : null}
        </div>
      </div>
      <div className={styles.cardActions}>
        {canMap ? <button type="button" className={`${styles.iconBtn} ${mappedCheckmk || mappedHycu ? styles.iconBtnCheckmkActive : ""}`} onClick={onMap} disabled={!job?.id} aria-label={canMapHycu ? mappedHycu ? copy.actions.editHycu || copy.actions.editCheckmk : copy.actions.mapHycu || copy.actions.mapCheckmk : mappedCheckmk ? copy.actions.editCheckmk : copy.actions.mapCheckmk} title={!job?.id ? copy.actions.mapCheckmkDisabled : canMapHycu ? hycuLabel || (mappedHycu ? copy.actions.editHycu : copy.actions.mapHycu) : checkmkLabel || (mappedCheckmk ? copy.actions.editCheckmk : copy.actions.mapCheckmk)}>
            <Icon icon={canMapHycu ? "mdi:cloud-sync-outline" : "simple-icons:checkmk"} width={16} height={16} />
          </button> : null}
        <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label={copy.actions.edit}>
          <Icon icon="mdi:pencil-outline" />
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={onDelete} disabled={deleting || isDefault} aria-label={copy.actions.delete} title={isDefault ? copy.toasts.cannotDeleteDefaultJob : copy.actions.delete}>
          <Icon icon="mdi:trash-can-outline" />
        </button>
      </div>
    </article>;
}
const FOCUSED_SECTIONS = new Set(["add-instance", "edit-instance", "add-job", "edit-job"]);
const JOB_FORM_SECTION_IDS = ["general", "target", "schedule"];
const JOB_FORM_SECTION_ICONS = {
  general: "mdi:form-select",
  target: "mdi:server-network",
  schedule: "mdi:calendar-clock"
};

function matchInstanceByRef(instances, target) {
  if (!target || !Array.isArray(instances)) return null;
  if (target.id != null && target.id !== "") {
    const byId = instances.find(item => String(item.id) === String(target.id));
    if (byId) return byId;
  }
  return instances.find(item =>
    String(item.logiciel || "") === String(target.logiciel || "")
    && String(item.server || item.hyperbackupSource || item.activeBackupStorage || "")
      === String(target.server || target.hyperbackupSource || target.activeBackupStorage || "")
  ) || null;
}

export default function BackupConfigModal({
  client,
  onClose,
  onSaved,
  initialSection = "overview",
  initialInstance = null,
  initialJob = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getBackupModalCopy(locale), [locale]);
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const focusedMode = FOCUSED_SECTIONS.has(initialSection);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [editingInstanceId, setEditingInstanceId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [instanceDraft, setInstanceDraft] = useState(null);
  const [jobDraft, setJobDraft] = useState(null);
  const [jobFormSection, setJobFormSection] = useState("general");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [hardwareList, setHardwareList] = useState([]);
  const [mappingJob, setMappingJob] = useState(null);
  const selectedInstance = useMemo(() => instances.find(i => i.id === selectedInstanceId) || null, [instances, selectedInstanceId]);
  const totalJobs = useMemo(() => instances.reduce((sum, i) => sum + (Array.isArray(i.jobs) ? i.jobs.length : 0), 0), [instances]);
  const showJobsNav = Boolean(selectedInstance && supportsJobs(selectedInstance.logiciel));
  const navSections = useMemo(() => copy.navSections({
    editingInstance: Boolean(editingInstanceId),
    editingJob: Boolean(editingJobId),
    selectedInstance,
    showJobs: showJobsNav
  }), [copy, editingInstanceId, editingJobId, selectedInstance, showJobsNav]);
  const backupEquipements = useMemo(() => mergeBackupEquipements(client?.equipements, hardwareList), [client?.equipements, hardwareList]);
  const serverOptions = useMemo(() => getServerOptions(backupEquipements), [backupEquipements]);
  const stockageOptions = useMemo(() => getStorageOptions(backupEquipements, copy), [backupEquipements, copy]);
  const nasOptions = useMemo(() => getNasNameOptions(backupEquipements), [backupEquipements]);
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
    try {
      const refreshed = await fetchClientModules(client.id);
      setInstances(normalizeInstances(refreshed?.equipements?.Sauvegarde?.instances));
    } catch {
      setInstances(normalizeInstances(nextInstances));
    }
    await onSaved?.();
  }, [client?.id, onSaved]);
  const loadData = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [modulesData, hardware] = await Promise.all([fetchClientModules(client.id), getClientHardwareEquipment(client.id).catch(() => [])]);
      setHardwareList(Array.isArray(hardware) ? hardware : []);
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
  const initialFocusRef = useRef(false);
  useEffect(() => {
    if (loading || initialFocusRef.current) return;
    if (initialSection === "add-instance" && !initialInstance && !initialJob) {
      initialFocusRef.current = true;
      setEditingInstanceId(null);
      setInstanceDraft(null);
      setActiveSection("add-instance");
      return;
    }
    if (initialSection === "add-job" && !initialJob) {
      if (!instances.length) {
        initialFocusRef.current = true;
        setActiveSection(focusedMode ? "add-instance" : "overview");
        return;
      }
      const preferred = matchInstanceByRef(instances, initialInstance);
      const hasJobCapable = instances.some(item => supportsJobs(item.logiciel));
      initialFocusRef.current = true;
      if (!hasJobCapable) {
        if (preferred) setSelectedInstanceId(preferred.id);
        setActiveSection(focusedMode ? "add-instance" : "jobs");
        return;
      }
      setEditingJobId(null);
      setJobDraft(null);
      if (preferred && supportsJobs(preferred.logiciel)) {
        setSelectedInstanceId(preferred.id);
      }
      setActiveSection("add-job");
      return;
    }
    if (!instances.length) return;
    const instance = matchInstanceByRef(instances, initialInstance)
      || matchInstanceByRef(instances, initialJob?._instance)
      || (initialJob?.instanceId != null
        ? instances.find(item => String(item.id) === String(initialJob.instanceId))
        : null);
    if (!instance) return;
    initialFocusRef.current = true;
    setSelectedInstanceId(instance.id);
    if (initialJob || initialSection === "edit-job") {
      const jobs = Array.isArray(instance.jobs) ? instance.jobs : [];
      const job = jobs.find(item =>
        initialJob?.id != null && String(item.id) === String(initialJob.id)
        || initialJob?.nom && item.nom === initialJob.nom
      );
      if (job) {
        setEditingJobId(job.id);
        setJobDraft({
          ...EMPTY_JOB,
          ...job,
          type: pickBackupJobType(job),
          typeBackup: pickBackupJobType(job),
          serveurLie: normalizeServeurLieList(job.serveurLie),
          stockageLie: job.stockageLie || "",
          actif: isBackupJobActive(job)
        });
        setActiveSection("edit-job");
        return;
      }
      if (initialSection === "edit-job") return;
    }
    if (initialSection === "edit-instance" || initialInstance) {
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
    }
  }, [loading, instances, initialInstance, initialJob, initialSection, focusedMode]);
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
    setJobDraft(null);
  };
  const openAddInstance = () => {
    resetInstanceForm();
    setActiveSection("add-instance");
  };
  const selectSoftwareType = (type, meta = {}) => {
    setInstanceDraft(buildEmptyInstance(type, meta));
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
  const jobCapableInstances = useMemo(
    () => instances.filter(item => supportsJobs(item.logiciel)),
    [instances]
  );
  const openAddJob = () => {
    if (!instances.length) {
      toast.info(copy.jobs.needInstanceFirst || copy.jobs.selectInstance);
      setActiveSection("add-instance");
      return;
    }
    if (!jobCapableInstances.length) {
      toast.info(copy.jobs.noJobsSupport);
      setActiveSection("instances");
      return;
    }
    setEditingJobId(null);
    setJobDraft(null);
    setJobFormSection("general");
    setActiveSection("add-job");
  };
  const selectJobInstance = instance => {
    if (!instance || !supportsJobs(instance.logiciel)) return;
    setSelectedInstanceId(instance.id);
    setEditingJobId(null);
    setJobFormSection("general");
    setJobDraft({
      ...EMPTY_JOB,
      stockageLie: ""
    });
  };
  const openEditJob = job => {
    setEditingJobId(job.id);
    setJobFormSection("general");
    setJobDraft({
      ...EMPTY_JOB,
      ...job,
      type: pickBackupJobType(job),
      typeBackup: pickBackupJobType(job),
      serveurLie: normalizeServeurLieList(job.serveurLie),
      stockageLie: job.stockageLie || "",
      actif: isBackupJobActive(job)
    });
    setActiveSection("edit-job");
  };
  const isSelectedHycu = Boolean(selectedInstance && isHycuLogiciel(selectedInstance.logiciel));
  const canMapCheckmkJobs = Boolean(selectedInstance && !isSelectedHycu);
  const canMapHycuJobs = Boolean(selectedInstance && isSelectedHycu);
  const openJobMapping = job => {
    if ((!canMapCheckmkJobs && !canMapHycuJobs) || !job?.id) return;
    setMappingJob(job);
  };
  const handleMappingSaved = mapping => {
    if (!mappingJob?.id) {
      setMappingJob(null);
      return;
    }
    const isHycuSave = Boolean(mapping && ("hycu_job_uuid" in mapping || mapping.hycuMapping));
    const nextHost = mapping?.checkmk_host_name ? String(mapping.checkmk_host_name).trim() : "";
    const nextHycuUuid = mapping?.hycu_job_uuid ? String(mapping.hycu_job_uuid).trim() : "";
    setInstances(prev => prev.map(inst => ({
      ...inst,
      jobs: (inst.jobs || []).map(j => {
        if (String(j.id) !== String(mappingJob.id)) return j;
        if (isHycuSave) {
          return {
            ...j,
            checkmk_host_name: null,
            checkmk_site: null,
            checkmk_service_name: null,
            checkmkMapping: null,
            hycu_job_uuid: nextHycuUuid || null,
            hycu_job_name: mapping?.hycu_job_name || null,
            hycuMapping: mapping?.hycuMapping || (nextHycuUuid ? {
              is_active: true,
              hycu_job_uuid: nextHycuUuid,
              hycu_job_name: mapping?.hycu_job_name || null
            } : null)
          };
        }
        return {
          ...j,
          checkmk_host_name: nextHost || null,
          checkmk_site: mapping?.checkmk_site ?? null,
          checkmk_service_name: mapping?.checkmk_service_name ?? null,
          checkmkMapping: nextHost ? {
            is_active: true,
            checkmk_host_name: nextHost,
            checkmk_site: mapping?.checkmk_site ?? null,
            checkmk_service_name: mapping?.checkmk_service_name ?? null
          } : null,
          hycu_job_uuid: null,
          hycu_job_name: null,
          hycuMapping: null
        };
      })
    })));
    setMappingJob(null);
    onSaved?.();
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
      if (focusedMode) {
        onClose?.();
        return;
      }
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
    if (!selectedInstanceId || !jobDraft) return;
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
              type: jobDraft.type || "",
              typeBackup: jobDraft.type || "",
              serveurLie: normalizeServeurLieList(jobDraft.serveurLie),
              stockageLie: jobDraft.stockageLie || "",
              destination: jobDraft.stockageLie || "",
              actif: jobDraft.actif !== false
            } : j)
          };
        }
        return {
          ...inst,
          jobs: [...jobs, {
            id: generateUUID(),
            ...jobDraft,
            nom,
            type: jobDraft.type || "",
            typeBackup: jobDraft.type || "",
            serveurLie: normalizeServeurLieList(jobDraft.serveurLie),
            stockageLie: jobDraft.stockageLie || "",
            destination: jobDraft.stockageLie || "",
            actif: jobDraft.actif !== false
          }]
        };
      });
      await persistInstances(next);
      toast.success(editingJobId ? copy.toasts.jobUpdated : copy.toasts.jobAdded);
      if (focusedMode) {
        onClose?.();
        return;
      }
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
  const useJobSectionNav = focusedMode && isJobForm && Boolean(jobDraft);
  const jobSectionLabels = useMemo(() => {
    const sectionCopy = activeSection === "edit-job" ? copy.editJob : copy.addJob;
    return sectionCopy.sections || copy.addJob.sections || {};
  }, [activeSection, copy]);
  const jobNavSections = useMemo(
    () =>
      JOB_FORM_SECTION_IDS.map(id => ({
        id,
        label: jobSectionLabels[id] || id,
        icon: JOB_FORM_SECTION_ICONS[id]
      })),
    [jobSectionLabels]
  );
  const { trackRef: jobNavTrackRef, indicator: jobNavIndicator } = useFinderNavIndicator([
    jobFormSection,
    useJobSectionNav,
    jobNavSections.length
  ]);
  const isFormSection = isInstanceForm || isJobForm;
  const primaryDisabled = (() => {
    if (!isFormSection || saving) return true;
    if (isInstanceForm) return !instanceDraft?.logiciel;
    if (isJobForm) return !jobDraft || !(jobDraft.nom || "").trim();
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
        } else if (jobCapableInstances[0]) {
          setSelectedInstanceId(jobCapableInstances[0].id);
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
        <UiKitButton type="button" variant="primary" icon="mdi:plus" onClick={openAddInstance}>
          {copy.overview.addBtn}
        </UiKitButton>
        <UiKitButton
          type="button"
          variant="primary"
          icon="mdi:plus"
          onClick={openAddJob}
          disabled={instances.length === 0}
          title={instances.length === 0 ? (copy.jobs.needInstanceFirst || copy.jobs.selectInstance) : undefined}
        >
          {copy.overview.addJobBtn || copy.jobs.addBtn}
        </UiKitButton>
      </div>
    </>;
  const renderInstances = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{copy.instances.title}</h3>
      </div>
        <div className={styles.listToolbar}>
        <p className={styles.listCount}>{copy.formatInstanceCount(instances.length)}</p>
        <UiKitButton type="button" variant="secondary" icon="mdi:plus" onClick={openAddInstance}>
          {copy.instances.addBtn}
        </UiKitButton>
      </div>
      {instances.length === 0 ? <div className={styles.emptyState}>
          <Icon icon="mdi:backup-restore" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyText}>{copy.empty.noInstances}</p>
          <UiKitButton type="button" variant="primary" icon="mdi:plus" onClick={openAddInstance}>
            {copy.empty.addInstance}
          </UiKitButton>
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
    const logiciel = instanceDraft?.logiciel || "";
    const showExpiration = productHasField(logiciel, "expiration");
    const showServer = productHasField(logiciel, "server");
    const showHycu = productHasField(logiciel, "hycuServer");
    const showHyper = productHasField(logiciel, "hyperbackup");
    const showActive = productHasField(logiciel, "activeBackup");
    const showLicense = productHasField(logiciel, "license");
    const showCloudRegion = productHasField(logiciel, "cloudRegion");
    const showCloudBucket = productHasField(logiciel, "cloudBucket");
    return (
      <div className={`${layout.sectionFill} ${showTypePicker ? styles.pickerFill : ""}`.trim()}>
        {focusedMode ? null : (
          <div className={layout.sectionHead}>
            <h3 className={layout.sectionTitle}>{sectionCopy.title}</h3>
          </div>
        )}

        <div className={showTypePicker ? styles.pickerBody : layout.sectionScroll}>
        {showTypePicker ? (
          <BackupSoftwarePicker
            softwareCopy={copy.software}
            labels={{
              brand: copy.addInstance.pickBrand,
              product: copy.addInstance.pickProduct,
              otherBrand: copy.addInstance.otherBrand,
              otherBrandName: copy.addInstance.otherBrandName,
              otherProduct: copy.addInstance.otherProduct,
              otherProductName: copy.addInstance.otherProductName,
              otherProductDesc: copy.addInstance.otherProductDesc,
            }}
            onSelect={selectSoftwareType}
          />
        ) : instanceDraft ? <>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <div className={styles.softwareSelectedRow}>
                  <div className={styles.softwareSelectedMain}>
                    <label className={layout.label}>{copy.form.logiciel}</label>
                    <input
                      className={layout.input}
                      value={copy.software[instanceDraft.logiciel]?.label || instanceDraft.logiciel}
                      disabled
                    />
                  </div>
                  {!isEdit ? (
                    <UiKitButton
                      type="button"
                      variant="secondary"
                      icon="mdi:swap-horizontal"
                      onClick={() => {
                        resetInstanceForm();
                        setActiveSection("add-instance");
                      }}
                    >
                      {copy.addInstance.changeSoftware}
                    </UiKitButton>
                  ) : null}
                </div>
              </div>

              {showExpiration ? (
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="backup-expiration">
                    {copy.form.expiration}
                  </label>
                  <input
                    id="backup-expiration"
                    type="date"
                    className={layout.input}
                    value={instanceDraft.expiration || ""}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      expiration: e.target.value
                    }))}
                  />
                </div>
              ) : null}

              {showLicense ? (
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="backup-license">
                    {copy.form.license}
                  </label>
                  <input
                    id="backup-license"
                    type="text"
                    className={layout.input}
                    value={instanceDraft.licenseKey || ""}
                    placeholder={copy.form.licensePlaceholder}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      licenseKey: e.target.value
                    }))}
                  />
                </div>
              ) : null}

              {showCloudRegion ? (
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="backup-cloud-region">
                    {copy.form.cloudRegion}
                  </label>
                  <input
                    id="backup-cloud-region"
                    type="text"
                    className={layout.input}
                    value={instanceDraft.cloudRegion || ""}
                    placeholder={copy.form.cloudRegionPlaceholder}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      cloudRegion: e.target.value
                    }))}
                  />
                </div>
              ) : null}

              {showCloudBucket ? (
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="backup-cloud-bucket">
                    {copy.form.cloudBucket}
                  </label>
                  <input
                    id="backup-cloud-bucket"
                    type="text"
                    className={layout.input}
                    value={instanceDraft.cloudBucket || ""}
                    placeholder={copy.form.cloudBucketPlaceholder}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      cloudBucket: e.target.value
                    }))}
                  />
                </div>
              ) : null}

              {showServer ? (
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="backup-server">
                    {copy.form.server}
                  </label>
                  <select
                    id="backup-server"
                    className={layout.input}
                    value={instanceDraft.server || ""}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      server: e.target.value
                    }))}
                  >
                    <option value="">{copy.form.serverNone}</option>
                    {renderSelectOptions(serverOptions)}
                  </select>
                </div>
              ) : null}

              {showHyper ? <>
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="hb-source">
                    {copy.form.hyperbackupSource}
                  </label>
                  <select
                    id="hb-source"
                    className={layout.input}
                    value={instanceDraft.hyperbackupSource || ""}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      hyperbackupSource: e.target.value
                    }))}
                  >
                    <option value="">{copy.form.storageNone}</option>
                    {renderSelectOptions(nasOptions)}
                  </select>
                </div>
                <div className={layout.field}>
                  <label className={layout.label} htmlFor="hb-dest">
                    {copy.form.hyperbackupDestination}
                  </label>
                  <select
                    id="hb-dest"
                    className={layout.input}
                    value={instanceDraft.hyperbackupDestination || ""}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      hyperbackupDestination: e.target.value
                    }))}
                  >
                    <option value="">{copy.form.storageNone}</option>
                    {renderSelectOptions(nasOptions)}
                  </select>
                </div>
              </> : null}

              {showActive ? <>
                <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label}>{copy.form.activeBackupModules}</label>
                  <div className={styles.modulesGrid}>
                    {ACTIVE_BACKUP_MODULE_KEYS.map(key => {
                      const checked = Boolean(instanceDraft.activeBackupModules?.[key]);
                      return (
                        <label key={key} className={`${styles.moduleChip} ${checked ? styles.moduleChipActive : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => setInstanceDraft(prev => ({
                              ...prev,
                              activeBackupModules: {
                                ...EMPTY_ACTIVE_MODULES,
                                ...(prev.activeBackupModules || {}),
                                [key]: e.target.checked
                              }
                            }))}
                          />
                          {copy.form.modules[key]}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label} htmlFor="ab-storage">
                    {copy.form.activeBackupStorage}
                  </label>
                  <select
                    id="ab-storage"
                    className={layout.input}
                    value={instanceDraft.activeBackupStorage || ""}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      activeBackupStorage: e.target.value
                    }))}
                  >
                    <option value="">{copy.form.storageNone}</option>
                    {renderSelectOptions(nasOptions)}
                  </select>
                </div>
              </> : null}

              {showHycu ? (
                <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label} htmlFor="backup-hycu-server">
                    {copy.form.server}
                  </label>
                  <input
                    id="backup-hycu-server"
                    type="text"
                    className={layout.input}
                    value={instanceDraft.server || ""}
                    placeholder={copy.form.serverPlaceholder || ""}
                    onChange={e => setInstanceDraft(prev => ({
                      ...prev,
                      server: e.target.value
                    }))}
                  />
                </div>
              ) : null}
            </div>

            {focusedMode ? null : (
              <div className={styles.formCancelRow}>
                <UiKitButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetInstanceForm();
                    setActiveSection(isEdit ? "instances" : "add-instance");
                  }}
                >
                  {copy.form.cancel}
                </UiKitButton>
              </div>
            )}
          </> : null}
        </div>
      </div>
    );
  };
  const renderJobs = () => {
    if (!selectedInstance) {
      return <div className={styles.emptyState}>
          <Icon icon="mdi:information-outline" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyText}>{copy.jobs.selectInstance}</p>
          <UiKitButton type="button" variant="secondary" onClick={() => setActiveSection("instances")}>
            {copy.overview.viewInstances}
          </UiKitButton>
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
          <h3 className={layout.sectionTitle}>
            {copy.jobs.title}
            {softwareLabel ? ` · ${softwareLabel}` : ""}
          </h3>
        </div>
        <div className={styles.listToolbar}>
          <p className={styles.listCount}>{copy.formatJobCount(jobs.length)}</p>
          <UiKitButton type="button" variant="secondary" icon="mdi:plus" onClick={openAddJob}>
            {copy.jobs.addBtn}
          </UiKitButton>
        </div>
        {jobs.length === 0 ? <div className={styles.emptyState}>
            <Icon icon="mdi:briefcase-plus-outline" className={styles.emptyIcon} aria-hidden />
            <p className={styles.emptyText}>{copy.empty.noJobs}</p>
            <UiKitButton type="button" variant="primary" icon="mdi:plus" onClick={openAddJob}>
              {copy.empty.addJob}
            </UiKitButton>
          </div> : <div className={styles.list}>
            {jobs.map((job, idx) => {
          const isDefault = selectedInstance.logiciel === "HYCU Backup" && (job.isDefault || jobs.length === 1 && idx === 0);
          return <JobCard key={job.id || idx} job={job} copy={copy} isDefault={isDefault} deleting={deletingId === job.id} canMapCheckmk={canMapCheckmkJobs} canMapHycu={canMapHycuJobs} onMap={() => openJobMapping(job)} onEdit={() => openEditJob(job)} onDelete={() => requestDeleteJob(job)} />;
        })}
          </div>}
      </>;
  };
  const renderJobFormFields = sectionId => {
    if (!jobDraft) return null;
    const isEdit = activeSection === "edit-job";
    const isHycu = selectedInstance?.logiciel === "HYCU Backup";
    const selectedInstanceLabel = selectedInstance
      ? `${copy.software[selectedInstance.logiciel]?.label || selectedInstance.logiciel}${selectedInstance.server ? ` — ${selectedInstance.server}` : ""}`
      : "";
    const sectionCopy = isEdit ? copy.editJob : copy.addJob;
    const jobSections = sectionCopy.sections || copy.addJob.sections || {};
    const showHeading = !useJobSectionNav;

    if (sectionId === "general") {
      return (
        <div className={layout.fieldGroupBlock}>
          {showHeading ? <h4 className={layout.fieldGroupTitle}>{jobSections.general || "Général"}</h4> : null}
          <div className={layout.fieldStack}>
            {selectedInstance ? (
              <div className={layout.field}>
                <label className={layout.label} htmlFor="job-instance">
                  {copy.form.jobInstance || "Instance"}
                </label>
                {isEdit ? (
                  <input id="job-instance" className={layout.input} value={selectedInstanceLabel} disabled />
                ) : (
                  <div className={styles.selectedInstanceRow}>
                    <input id="job-instance" className={layout.input} value={selectedInstanceLabel} disabled />
                    <UiKitButton type="button" variant="secondary" onClick={() => setJobDraft(null)}>
                      {copy.addJob.changeInstance || copy.form.cancel}
                    </UiKitButton>
                  </div>
                )}
              </div>
            ) : null}
            <div className={layout.field}>
              <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="job-nom">
                {copy.form.jobName}
              </label>
              <input
                id="job-nom"
                type="text"
                className={layout.input}
                value={jobDraft.nom || ""}
                onChange={e => setJobDraft(prev => ({
                  ...prev,
                  nom: e.target.value
                }))}
                placeholder={copy.form.jobNamePlaceholder}
              />
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="job-type">
                {copy.form.jobType}
              </label>
              <select
                id="job-type"
                className={layout.input}
                value={jobDraft.type || ""}
                onChange={e => setJobDraft(prev => ({
                  ...prev,
                  type: e.target.value
                }))}
              >
                <option value="">{copy.form.jobTypeNone}</option>
                {renderSelectOptions(copy.jobTypeOptions)}
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (sectionId === "target") {
      return (
        <div className={layout.fieldGroupBlock}>
          {showHeading ? <h4 className={layout.fieldGroupTitle}>{jobSections.target || "Cible et destination"}</h4> : null}
          <div className={layout.fieldStack}>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="job-target-search">
                {copy.form.jobTarget}
              </label>
              {serverOptions.length === 0 ? (
                <p className={layout.sectionDesc}>{copy.form.jobTargetEmpty}</p>
              ) : (
                <MultiSuggestPicker
                  inputId="job-target-search"
                  placeholder={copy.form.jobTargetSearch}
                  emptyHint={copy.form.selectedTargetsNone}
                  emptyResultsHint={copy.form.jobTargetEmptyResults}
                  options={serverOptions.map(option => ({
                    id: option.value,
                    label: option.label,
                    hint: option.hint
                  }))}
                  selectedIds={normalizeServeurLieList(jobDraft.serveurLie)}
                  onChange={next => setJobDraft(prev => ({
                    ...prev,
                    serveurLie: normalizeServeurLieList(next)
                  }))}
                />
              )}
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="job-dest">
                {copy.form.jobDestination}
              </label>
              {isHycu ? (
                <input
                  id="job-dest"
                  type="text"
                  className={layout.input}
                  value={jobDraft.stockageLie || ""}
                  placeholder={copy.form.jobDestination || copy.form.server}
                  onChange={e => setJobDraft(prev => ({
                    ...prev,
                    stockageLie: e.target.value
                  }))}
                />
              ) : (
                <select
                  id="job-dest"
                  className={layout.input}
                  value={jobDraft.stockageLie || ""}
                  onChange={e => setJobDraft(prev => ({
                    ...prev,
                    stockageLie: e.target.value
                  }))}
                >
                  <option value="">{copy.form.jobDestinationNone}</option>
                  {renderSelectOptions(stockageOptions)}
                </select>
              )}
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="job-replication">
                {copy.form.jobReplication}
              </label>
              <select
                id="job-replication"
                className={layout.input}
                value={jobDraft.replicationVers || ""}
                onChange={e => setJobDraft(prev => ({
                  ...prev,
                  replicationVers: e.target.value
                }))}
              >
                <option value="">{copy.form.jobDestinationNone}</option>
                {renderSelectOptions(stockageOptions)}
              </select>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={layout.fieldGroupBlock}>
        {showHeading ? <h4 className={layout.fieldGroupTitle}>{jobSections.schedule || "Planification"}</h4> : null}
        <div className={layout.fieldStack}>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-reg">
              {copy.form.jobRegularity}
            </label>
            <select
              id="job-reg"
              className={layout.input}
              value={jobDraft.regularite || ""}
              onChange={e => setJobDraft(prev => ({
                ...prev,
                regularite: e.target.value
              }))}
            >
              <option value="">{copy.form.jobRegularityNone}</option>
              {renderSelectOptions(copy.regularityOptions)}
            </select>
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-horaire">
              {copy.form.jobSchedule}
            </label>
            <input
              id="job-horaire"
              type="time"
              className={layout.input}
              value={jobDraft.horaire || ""}
              onChange={e => setJobDraft(prev => ({
                ...prev,
                horaire: e.target.value
              }))}
            />
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="job-ret">
              {copy.form.jobRetention}
            </label>
            <select
              id="job-ret"
              className={layout.input}
              value={jobDraft.retention || ""}
              onChange={e => setJobDraft(prev => ({
                ...prev,
                retention: e.target.value
              }))}
            >
              <option value="">{copy.form.jobRetentionNone}</option>
              {renderSelectOptions(copy.retentionOptions)}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderJobForm = () => {
    const isEdit = activeSection === "edit-job";
    const sectionCopy = isEdit ? copy.editJob : copy.addJob;
    const showInstancePicker = !isEdit && !jobDraft;
    if (showInstancePicker) {
      return (
        <div className={layout.sectionFill}>
          {focusedMode ? null : (
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{sectionCopy.title}</h3>
            </div>
          )}
          <div className={layout.sectionScroll}>
            <div className={layout.fieldStack}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <span className={`${layout.label} ${layout.labelRequired}`}>
                  {copy.addJob.pickInstance || copy.form.jobInstance || "Instance"}
                </span>
                {jobCapableInstances.length === 0 ? (
                  <p className={layout.hint}>{copy.jobs.noJobsSupport}</p>
                ) : (
                  <div className={styles.typeGrid} role="listbox" aria-label={copy.addJob.pickInstance || copy.form.jobInstance}>
                    {jobCapableInstances.map(item => {
                      const info = copy.software[item.logiciel];
                      const iconFile = copy.softwareIcons[item.logiciel];
                      const productMeta = getBackupProduct(item.logiciel);
                      const meta = [item.server, item.cloudBucket, item.cloudRegion, item.activeBackupStorage, item.hyperbackupDestination].filter(Boolean)[0];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          className={`${styles.typeCard} ${String(selectedInstanceId) === String(item.id) ? styles.typeCardActive : ""}`}
                          onClick={() => selectJobInstance(item)}
                        >
                          {iconFile ? (
                            <img src={getIconPath(iconFile)} alt="" className={`${styles.typeLogo} ${styles.typeLogoImg}`} />
                          ) : (
                            <Icon icon={productMeta?.iconify || "mdi:backup-restore"} className={styles.typeLogo} aria-hidden />
                          )}
                          <span className={styles.typeBody}>
                            <span className={styles.typeLabel}>{info?.label || item.logiciel}</span>
                            <span className={styles.typeDesc}>
                              {meta || info?.description || item.logiciel}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (!jobDraft) return null;
    if (useJobSectionNav) {
      return (
        <div className={layout.sectionFill}>
          <div className={layout.sectionScroll}>
            {renderJobFormFields(jobFormSection)}
          </div>
        </div>
      );
    }
    return (
      <div className={layout.sectionFill}>
        <div className={layout.sectionHead}>
          <h3 className={layout.sectionTitle}>{sectionCopy.title}</h3>
        </div>
        <div className={layout.sectionScroll}>
          {renderJobFormFields("general")}
          {renderJobFormFields("target")}
          {renderJobFormFields("schedule")}
          <div className={styles.formCancelRow}>
            <UiKitButton
              type="button"
              variant="secondary"
              onClick={() => {
                resetJobForm();
                setActiveSection("jobs");
              }}
            >
              {copy.form.cancel}
            </UiKitButton>
          </div>
        </div>
      </div>
    );
  };
  const handlePrimary = () => {
    if (isInstanceForm) handleSubmitInstance();else if (isJobForm) handleSubmitJob();
  };
  const focusedTitle = activeSection === "edit-instance"
    ? copy.editInstance.title
    : activeSection === "add-instance"
      ? copy.addInstance.title
      : activeSection === "edit-job"
        ? copy.editJob.title
        : activeSection === "add-job"
          ? copy.addJob.title
          : copy.title;
  const focusedSubtitle = activeSection === "edit-instance"
    ? copy.editInstance.description
    : activeSection === "add-instance"
      ? copy.addInstance.description
      : activeSection === "edit-job"
        ? copy.editJob.description
        : activeSection === "add-job"
          ? (!jobDraft ? (copy.addJob.pickDescription || copy.addJob.description) : copy.addJob.description)
          : copy.subtitle;
  const focusedIcon = isJobForm || activeSection === "jobs"
    ? "mdi:briefcase-plus-outline"
    : "mdi:server-plus-outline";
  return <>
      {createPortal(<div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
          <div className={`${layout.shell} ${focusedMode ? layout.shellBackup : ""}`.trim()} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="backup-modal-title">
            <div className={layout.accentBar} aria-hidden />

            <header className={layout.header}>
              <div className={layout.headerMain}>
                <div className={layout.headerIconWrap} aria-hidden>
                  <Icon icon={focusedMode ? focusedIcon : "mdi:backup-restore"} />
                </div>
                <div className={layout.headerText}>
                  <p className={layout.eyebrow}>{copy.eyebrow}</p>
                  <h2 id="backup-modal-title" className={layout.title}>
                    {focusedMode ? focusedTitle : copy.title}
                  </h2>
                  <p className={layout.subtitle}>{focusedMode ? focusedSubtitle : copy.subtitle}</p>
                </div>
              </div>
              <div className={layout.headerTrailing}>
                {isJobForm && jobDraft ? (
                  <label className={layout.headerStatusToggle}>
                    <span className={layout.headerStatusLabel}>
                      {jobDraft.actif !== false
                        ? (copy.form.jobActive || "Actif")
                        : (copy.form.jobInactive || "Inactif")}
                    </span>
                    <span className={layout.switchWrap}>
                      <input
                        type="checkbox"
                        className={layout.switchInput}
                        checked={jobDraft.actif !== false}
                        onChange={e => setJobDraft(prev => ({
                          ...prev,
                          actif: e.target.checked
                        }))}
                        role="switch"
                        aria-checked={jobDraft.actif !== false}
                        disabled={saving}
                      />
                      <span className={layout.switchTrack} aria-hidden="true">
                        <span className={layout.switchThumb} />
                      </span>
                    </span>
                  </label>
                ) : null}
                <UiKitButton
                  type="button"
                  square
                  variant="secondary"
                  className={layout.closeBtn}
                  onClick={onClose}
                  disabled={saving}
                  aria-label={common.close}
                  icon="mdi:close"
                />
              </div>
            </header>

            <div className={useJobSectionNav || !focusedMode ? layout.body : layout.bodySingle}>
              {useJobSectionNav ? (
                <aside className={`${kit.finderSidebar} ${layout.modalNav}`} aria-label={copy.navAria}>
                  <nav
                    ref={jobNavTrackRef}
                    className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${layout.modalNavTrack}`}
                  >
                    <div
                      className={kit.finderNavIndicator}
                      style={{
                        transform: `translate3d(0, ${jobNavIndicator.top}px, 0)`,
                        height: jobNavIndicator.height,
                        opacity: jobNavIndicator.ready ? 1 : 0
                      }}
                      aria-hidden
                    />
                    {jobNavSections.map(section => (
                      <UiKitModalNavSectionButton
                        key={section.id}
                        section={section}
                        active={jobFormSection === section.id}
                        onSelect={() => setJobFormSection(section.id)}
                        finderItemClass={kit.finderItem}
                        finderItemActiveClass={kit.finderItemActive}
                        finderItemIconClass={kit.finderItemIcon}
                        finderItemLabelClass={kit.finderItemLabel}
                        navBadgeClass={layout.navBadge}
                        navBadgeSlotClass={layout.navBadgeSlot}
                      />
                    ))}
                  </nav>
                </aside>
              ) : focusedMode ? null : (
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
              )}

              <div className={layout.content} key={useJobSectionNav ? jobFormSection : activeSection}>
                <div className={kit.contentFadeUp}>
                  {error ? <div className={styles.errorBanner} role="alert">
                      {error}
                    </div> : null}
                  {loading ? (
                    <div className={styles.loadingWrap} role="status" aria-live="polite">
                      <span className={styles.loadingWrapIcon} aria-hidden>
                        <Icon icon="mdi:loading" className={layout.spinning} />
                      </span>
                      <p style={{ margin: 0 }}>{copy.loading}</p>
                    </div>
                  ) : focusedMode ? <>
                      {(activeSection === "add-instance" || activeSection === "edit-instance") && renderInstanceForm()}
                      {(activeSection === "add-job" || activeSection === "edit-job") && renderJobForm()}
                    </> : <>
                      {activeSection === "overview" && renderOverview()}
                      {activeSection === "instances" && renderInstances()}
                      {(activeSection === "add-instance" || activeSection === "edit-instance") && renderInstanceForm()}
                      {activeSection === "jobs" && renderJobs()}
                      {(activeSection === "add-job" || activeSection === "edit-job") && renderJobForm()}
                    </>}
                </div>
              </div>
            </div>

            {isFormSection && (instanceDraft || isJobForm || (focusedMode && activeSection === "add-instance" && !instanceDraft) || (focusedMode && activeSection === "add-job" && !jobDraft)) ? (
              <footer className={layout.footer}>
                <span className={layout.footerHint}>
                  {isJobForm
                    ? (!jobDraft ? (copy.footer.pickInstance || copy.footer.pickSoftware) : copy.footer.nameRequired)
                    : (!instanceDraft ? copy.footer.pickSoftware : "")}
                </span>
                <div className={layout.footerActions}>
                  {focusedMode ? (
                    <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
                      {copy.form.cancel}
                    </UiKitButton>
                  ) : null}
                  <UiKitButton
                    type="button"
                    variant="primary"
                    onClick={handlePrimary}
                    disabled={primaryDisabled || (focusedMode && activeSection === "add-instance" && !instanceDraft) || (focusedMode && activeSection === "add-job" && !jobDraft) || saving}
                    icon={saving ? undefined : isJobForm || editingInstanceId ? "mdi:content-save-outline" : "mdi:plus"}
                  >
                    {saving ? (
                      <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {common.saving}
                      </>
                    ) : (
                      primaryLabel || (editingInstanceId || editingJobId ? copy.primary.saveInstance : copy.primary.createInstance)
                    )}
                  </UiKitButton>
                </div>
              </footer>
            ) : null}
          </div>
        </div>, document.getElementById("modal-root") || document.body)}

      <ConfirmModal open={Boolean(deleteTarget)} title={configCopy.confirm.deleteEntry.title} message={interpolate(configCopy.confirm.deleteEntry.message, {
      label: deleteLabel
    })} confirmLabel={common.delete} variant="danger" icon="mdi:delete-alert-outline" loading={Boolean(deletingId)} onClose={() => {
      if (!deletingId) setDeleteTarget(null);
    }} onConfirm={confirmDelete} />

      {mappingJob && canMapCheckmkJobs ? <EquipmentMappingModal isOpen={Boolean(mappingJob)} onClose={() => setMappingJob(null)} stacked requireService equipment={{
      id: mappingJob.id,
      name: mappingJob.nom,
      nom: mappingJob.nom,
      type: "Sauvegarde",
      clientId: client?.id,
      clientName: client?.name || client?.nom || "",
      checkmkMapping: mappingJob.checkmk_host_name || mappingJob.checkmkMapping ? {
        checkmk_host_name: mappingJob.checkmk_host_name || mappingJob.checkmkMapping?.checkmk_host_name || null,
        checkmk_site: mappingJob.checkmk_site || mappingJob.checkmkMapping?.checkmk_site || null,
        checkmk_service_name: mappingJob.checkmk_service_name || mappingJob.checkmkMapping?.checkmk_service_name || null,
        is_active: true
      } : null
    }} onMappingSaved={handleMappingSaved} /> : null}
      {mappingJob && canMapHycuJobs ? <HycuJobMappingModal open={Boolean(mappingJob)} onClose={() => setMappingJob(null)} stacked clientId={client?.id} job={mappingJob} hasCheckmkMapping={isJobCheckmkMapped(mappingJob)} onMappingSaved={handleMappingSaved} /> : null}
    </>;
}
