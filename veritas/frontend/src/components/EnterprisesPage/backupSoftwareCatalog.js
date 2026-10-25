/**
 * Catalogue marques / produits de sauvegarde (style matériel : marque → modèle).
 * L’id produit est stocké sur l’instance comme `logiciel` (rétrocompat).
 */

export const BACKUP_BRAND_OTHER = "__other__";
export const BACKUP_PRODUCT_OTHER = "__other_product__";

/** Marques : privilégier `iconify` (fiable). `icon` PNG optionnel pour les cartes produit. */
export const BACKUP_BRANDS = [
  { id: "veeam", label: "Veeam", icon: "veeam.png", iconify: "simple-icons:veeam" },
  { id: "hycu", label: "HYCU", icon: "hycu.png", iconify: "mdi:cloud-sync-outline" },
  { id: "synology", label: "Synology", icon: "hyperbackup.png", iconify: "simple-icons:synology" },
  { id: "acronis", label: "Acronis", icon: null, iconify: "mdi:shield-lock-outline" },
  { id: "commvault", label: "Commvault", icon: null, iconify: "mdi:database-outline" },
  { id: "nakivo", label: "Nakivo", icon: null, iconify: "mdi:backup-restore" },
  { id: "datto", label: "Datto", icon: null, iconify: "mdi:shield-check-outline" },
  { id: "aws", label: "AWS", icon: null, iconify: "simple-icons:amazonaws" },
  { id: "azure", label: "Azure", icon: "azure.png", iconify: "simple-icons:microsoftazure" },
  { id: "google", label: "Google Cloud", icon: null, iconify: "simple-icons:googlecloud" },
  { id: "backblaze", label: "Backblaze", icon: null, iconify: "mdi:fire" },
  { id: "wasabi", label: "Wasabi", icon: null, iconify: "mdi:leaf" },
  { id: "ovh", label: "OVHcloud", icon: "ovh.png", iconify: "simple-icons:ovh" },
];

/**
 * @typedef {"expiration"|"server"|"hycuServer"|"hyperbackup"|"activeBackup"|"license"|"cloudRegion"|"cloudBucket"} BackupField
 * @typedef {{
 *   id: string,
 *   brandId: string,
 *   icon?: string|null,
 *   iconify?: string,
 *   supportsJobs?: boolean,
 *   seedDefaultJob?: boolean,
 *   fields?: BackupField[],
 * }} BackupProduct
 */

/** @type {BackupProduct[]} */
export const BACKUP_PRODUCTS = [
  {
    id: "Veeam",
    brandId: "veeam",
    icon: "veeam.png",
    iconify: "simple-icons:veeam",
    supportsJobs: true,
    fields: ["expiration", "server", "license"],
  },
  {
    id: "Veeam Agent",
    brandId: "veeam",
    icon: "veeam.png",
    iconify: "simple-icons:veeam",
    supportsJobs: true,
    fields: ["expiration", "server"],
  },
  {
    id: "Veeam Backup for Microsoft 365",
    brandId: "veeam",
    icon: "veeam.png",
    iconify: "simple-icons:veeam",
    supportsJobs: true,
    fields: ["expiration", "server", "activeBackup"],
  },
  {
    id: "HYCU Backup",
    brandId: "hycu",
    icon: "hycu.png",
    iconify: "mdi:cloud-sync-outline",
    supportsJobs: true,
    seedDefaultJob: true,
    fields: ["hycuServer"],
  },
  {
    id: "HyperBackup",
    brandId: "synology",
    icon: "hyperbackup.png",
    iconify: "mdi:nas",
    supportsJobs: true,
    fields: ["hyperbackup"],
  },
  {
    id: "Active Backup for Business",
    brandId: "synology",
    icon: "active-backup.png",
    iconify: "mdi:briefcase-check-outline",
    supportsJobs: true,
    fields: ["server", "hyperbackup"],
  },
  {
    id: "Active Backup for Microsoft 365",
    brandId: "synology",
    icon: "active-backup.png",
    iconify: "mdi:microsoft-office",
    supportsJobs: true,
    fields: ["activeBackup"],
  },
  {
    id: "Acronis Cyber Protect",
    brandId: "acronis",
    icon: null,
    iconify: "mdi:shield-lock-outline",
    supportsJobs: true,
    fields: ["expiration", "server", "license"],
  },
  {
    id: "Acronis Cyber Protect Cloud",
    brandId: "acronis",
    icon: null,
    iconify: "mdi:cloud-lock-outline",
    supportsJobs: true,
    fields: ["expiration", "license", "cloudRegion"],
  },
  {
    id: "Commvault Complete",
    brandId: "commvault",
    icon: null,
    iconify: "mdi:database-outline",
    supportsJobs: true,
    fields: ["expiration", "server", "license"],
  },
  {
    id: "Commvault Metallic",
    brandId: "commvault",
    icon: null,
    iconify: "mdi:cloud-outline",
    supportsJobs: true,
    fields: ["expiration", "license", "cloudRegion"],
  },
  {
    id: "Nakivo Backup & Replication",
    brandId: "nakivo",
    icon: null,
    iconify: "mdi:backup-restore",
    supportsJobs: true,
    fields: ["expiration", "server"],
  },
  {
    id: "Datto SIRIS",
    brandId: "datto",
    icon: null,
    iconify: "mdi:shield-check-outline",
    supportsJobs: true,
    fields: ["expiration", "server"],
  },
  {
    id: "Datto SaaS Protection",
    brandId: "datto",
    icon: null,
    iconify: "mdi:cloud-check-outline",
    supportsJobs: true,
    fields: ["expiration", "activeBackup"],
  },
  {
    id: "AWS Backup",
    brandId: "aws",
    icon: null,
    iconify: "simple-icons:amazonaws",
    supportsJobs: true,
    fields: ["cloudRegion", "expiration"],
  },
  {
    id: "Amazon S3 / Glacier",
    brandId: "aws",
    icon: null,
    iconify: "mdi:aws",
    supportsJobs: true,
    fields: ["cloudRegion", "cloudBucket"],
  },
  {
    id: "Azure Backup",
    brandId: "azure",
    icon: "azure.png",
    iconify: "simple-icons:microsoftazure",
    supportsJobs: true,
    fields: ["cloudRegion", "expiration"],
  },
  {
    id: "Azure Blob Storage",
    brandId: "azure",
    icon: "azure.png",
    iconify: "mdi:microsoft-azure",
    supportsJobs: true,
    fields: ["cloudRegion", "cloudBucket"],
  },
  {
    id: "Microsoft 365 Backup",
    brandId: "azure",
    icon: "office365.png",
    iconify: "mdi:microsoft-office",
    supportsJobs: true,
    fields: ["expiration", "activeBackup"],
  },
  {
    id: "Google Cloud Backup",
    brandId: "google",
    icon: null,
    iconify: "simple-icons:googlecloud",
    supportsJobs: true,
    fields: ["cloudRegion", "expiration"],
  },
  {
    id: "Google Cloud Storage",
    brandId: "google",
    icon: null,
    iconify: "mdi:google-cloud",
    supportsJobs: true,
    fields: ["cloudRegion", "cloudBucket"],
  },
  {
    id: "Backblaze B2",
    brandId: "backblaze",
    icon: null,
    iconify: "mdi:fire",
    supportsJobs: true,
    fields: ["cloudRegion", "cloudBucket"],
  },
  {
    id: "Backblaze Computer Backup",
    brandId: "backblaze",
    icon: null,
    iconify: "mdi:laptop",
    supportsJobs: true,
    fields: ["expiration"],
  },
  {
    id: "Wasabi Hot Cloud Storage",
    brandId: "wasabi",
    icon: null,
    iconify: "mdi:leaf",
    supportsJobs: true,
    fields: ["cloudRegion", "cloudBucket"],
  },
  {
    id: "OVHcloud Backup",
    brandId: "ovh",
    icon: "ovh.png",
    iconify: "simple-icons:ovh",
    supportsJobs: true,
    fields: ["cloudRegion", "expiration"],
  },
  {
    id: "OVHcloud Object Storage",
    brandId: "ovh",
    icon: "ovh.png",
    iconify: "mdi:cloud-outline",
    supportsJobs: true,
    fields: ["cloudRegion", "cloudBucket"],
  },
];

const PRODUCT_BY_ID = new Map(BACKUP_PRODUCTS.map(p => [p.id, p]));
const BRAND_BY_ID = new Map(BACKUP_BRANDS.map(b => [b.id, b]));

export function getBackupBrand(brandId) {
  return BRAND_BY_ID.get(brandId) || null;
}

export function getBackupProduct(productId) {
  if (!productId) return null;
  return PRODUCT_BY_ID.get(String(productId)) || null;
}

export function getProductsForBrand(brandId) {
  if (!brandId || brandId === BACKUP_BRAND_OTHER) return [];
  return BACKUP_PRODUCTS.filter(p => p.brandId === brandId);
}

export function resolveBrandIdForProduct(productId) {
  const product = getBackupProduct(productId);
  if (product) return product.brandId;
  const raw = String(productId || "");
  if (/hycu/i.test(raw)) return "hycu";
  if (/veeam/i.test(raw)) return "veeam";
  if (/hyperbackup|active backup|synology/i.test(raw)) return "synology";
  if (/acronis/i.test(raw)) return "acronis";
  if (/commvault|metallic/i.test(raw)) return "commvault";
  if (/nakivo/i.test(raw)) return "nakivo";
  if (/datto/i.test(raw)) return "datto";
  if (/aws|amazon s3|glacier/i.test(raw)) return "aws";
  if (/azure|microsoft 365 backup/i.test(raw)) return "azure";
  if (/google cloud|gcp/i.test(raw)) return "google";
  if (/backblaze/i.test(raw)) return "backblaze";
  if (/wasabi/i.test(raw)) return "wasabi";
  if (/ovh/i.test(raw)) return "ovh";
  return BACKUP_BRAND_OTHER;
}

export function productSupportsJobs(productId) {
  const product = getBackupProduct(productId);
  if (product) return product.supportsJobs !== false;
  return Boolean(String(productId || "").trim());
}

export function productSeedDefaultJob(productId) {
  return Boolean(getBackupProduct(productId)?.seedDefaultJob);
}

export function productFields(productId) {
  const product = getBackupProduct(productId);
  if (product?.fields?.length) return product.fields;
  return ["expiration", "server"];
}

export function productHasField(productId, field) {
  return productFields(productId).includes(field);
}

export function buildSoftwareIconsMap() {
  const map = {};
  BACKUP_PRODUCTS.forEach(p => {
    if (p.icon) map[p.id] = p.icon;
  });
  return map;
}

export function listSoftwareTypeIds() {
  return BACKUP_PRODUCTS.map(p => p.id);
}

export function buildBrandTiles(otherLabel = "Autre") {
  return [
    ...BACKUP_BRANDS.map(b => ({ id: b.id, label: b.label, icon: b.icon, iconify: b.iconify })),
    { id: BACKUP_BRAND_OTHER, label: otherBrandLabelSafe(otherLabel), icon: null, iconify: "mdi:dots-horizontal" },
  ];
}

function otherBrandLabelSafe(label) {
  return label || "Autre";
}
