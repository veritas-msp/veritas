function coerceStoredOption(raw) {
  if (raw == null) return "";
  if (typeof raw === "object") {
    if (typeof raw.value === "string" || typeof raw.value === "number") return String(raw.value);
    if (typeof raw.label === "string") return raw.label;
    if (typeof raw.nom === "string") return raw.nom;
    if (typeof raw.name === "string") return raw.name;
    return "";
  }
  return String(raw).trim();
}

/** Normalize legacy string or array serveurLie into a unique string[]. */
export function normalizeServeurLieList(raw) {
  if (raw == null || raw === "") return [];
  const values = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const list = [];
  values.forEach(entry => {
    const value = coerceStoredOption(entry);
    if (!value || seen.has(value)) return;
    seen.add(value);
    list.push(value);
  });
  return list;
}

export function formatServeurLieLabel(raw, empty = "—") {
  const list = normalizeServeurLieList(raw);
  return list.length ? list.join(", ") : empty;
}

/** Backup kind (full / incremental / …), ignoring the `type: "job"` discriminator. */
export function pickBackupJobType(job) {
  if (!job || typeof job !== "object") return "";
  const sources = [job, job.rawData].filter(src => src && typeof src === "object");
  for (const src of sources) {
    const candidates = [src.typeBackup, src.jobType, src.type];
    for (const raw of candidates) {
      const value = coerceStoredOption(raw);
      if (!value || value.toLowerCase() === "job") continue;
      return value;
    }
  }
  return "";
}

const HYCU_DESTINATION = "DataCenter PSI";

function isHycuBackupLogiciel(value) {
  return String(value || "").trim() === "HYCU Backup";
}

/** Storage destination (NAS / Datacenter), never the backup target (cible). */
export function pickBackupJobDestination(job, instance = {}, empty = "") {
  if (!job || typeof job !== "object") return empty;
  const logiciel = instance.logiciel || job.instanceLogiciel || job._instanceLogiciel || job._instance?.logiciel || "";
  if (isHycuBackupLogiciel(logiciel)) return HYCU_DESTINATION;
  const sources = [job, job.rawData, instance].filter(src => src && typeof src === "object");
  const targets = new Set(
    normalizeServeurLieList(job.serveurLie || job.source || job.rawData?.serveurLie)
      .map(value => value.toLowerCase())
  );
  for (const src of sources) {
    const candidates = [src.stockageLie, src.destination, src.activeBackupStorage, src.hyperbackupDestination];
    for (const raw of candidates) {
      const value = coerceStoredOption(raw);
      if (!value) continue;
      if (targets.has(value.toLowerCase())) continue;
      return value;
    }
  }
  return empty;
}

export function jobHasServeurLie(raw) {
  return normalizeServeurLieList(raw).length > 0;
}

/** Existing jobs without the field stay active. */
export function isBackupJobActive(job) {
  if (!job || typeof job !== "object") return true;
  const sources = [job, job.rawData].filter(src => src && typeof src === "object");
  for (const src of sources) {
    if (src.actif === false || src.active === false || src.enabled === false) return false;
    const statut = String(src.statut ?? "").trim().toLowerCase();
    if (statut === "inactif" || statut === "inactive" || statut === "disabled") return false;
  }
  return true;
}

export { coerceStoredOption };
