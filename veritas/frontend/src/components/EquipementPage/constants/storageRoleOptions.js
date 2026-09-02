export const STORAGE_ROLE_GROUPS = [{
  label: "Usage",
  options: ["Sauvegarde", "Fichiers partagés", "Principal", "Archivage", "Réplication"]
}, {
  label: "Virtualisation & cloud",
  options: ["VM / vSAN", "Cloud / tiering"]
}, {
  label: "Autre",
  options: ["Autre"]
}];

export const STORAGE_ROLE_OPTIONS = STORAGE_ROLE_GROUPS.flatMap(group => group.options);

export const STORAGE_ROLE_VALUE_ALIASES = {
  "Storage de sauvegarde": "Sauvegarde",
  "Stockage de sauvegarde": "Sauvegarde",
  "Backup storage": "Sauvegarde",
  "Storage de fichiers communs": "Fichiers partagés",
  "Stockage de fichiers communs": "Fichiers partagés",
  "Shared file storage": "Fichiers partagés",
  "Storage principal": "Principal",
  "Stockage principal": "Principal",
  "Primary storage": "Principal",
  "Storage d'archivage": "Archivage",
  "Stockage d'archivage": "Archivage",
  "Archive storage": "Archivage",
  "Storage de réplication": "Réplication",
  "Stockage de réplication": "Réplication",
  "Replication storage": "Réplication",
  "Storage VM / vSAN": "VM / vSAN",
  "Stockage VM / vSAN": "VM / vSAN",
  "Storage cloud / tiering": "Cloud / tiering",
  "Stockage cloud / tiering": "Cloud / tiering",
  Other: "Autre"
};

export function canonicalizeStorageRole(role) {
  const raw = String(role || "").trim();
  if (!raw) return "";
  return STORAGE_ROLE_VALUE_ALIASES[raw] || raw;
}

const STORAGE_ROLE_LOOKUP = new Set(STORAGE_ROLE_OPTIONS.map(role => role.trim().toLowerCase()));

export function isKnownStorageRole(role) {
  const canonical = canonicalizeStorageRole(role);
  return STORAGE_ROLE_LOOKUP.has(canonical.toLowerCase()) || STORAGE_ROLE_LOOKUP.has(String(role || "").trim().toLowerCase());
}

export function normalizeStorageRoles(roles) {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  const seen = new Set();
  const normalized = [];
  list.forEach(role => {
    const canonical = canonicalizeStorageRole(role);
    if (!canonical) return;
    const key = canonical.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(canonical);
  });
  return normalized;
}

export function hasStorageRoles(roles) {
  return normalizeStorageRoles(roles).length > 0;
}
