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
