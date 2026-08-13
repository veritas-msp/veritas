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

export { coerceStoredOption };
