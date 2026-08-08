import { toast } from "react-toastify";
import { PRO_FEATURE_PROMOS } from "./proFeaturePromos";
export const PRO_FEATURE_PROMO_KEYS = {
  "Carnets de crédits support": "credits",
  "Support credit packs": "credits",
  "SLA support": "sla",
  "Support SLA": "sla",
  "Planning entreprise": "planning",
  "Folder de réversibilité": "reversibility",
  "Demandes de prestations": "prestations",
  "Ticket de Prestations / Services": "prestations",
  "Tickets Prestations / Services": "prestations",
  "Services / delivery tickets": "prestations",
  "Prestations": "prestations",
  Campagne: "cyberCampaigns",
  "Campagnes cybersécurité": "cyberCampaigns",
  "Cybersecurity campaigns": "cyberCampaigns",
  "Vault documentaire": "vault",
  "Document vault": "vault",
  "Microsoft tenant": "Tenant Microsoft",
  "Google Workspace": "Google Workspace",
  Backup: "backup",
  Backup: "backup",
  "Partage d'accès": "sharedAccess",
  "Access sharing": "sharedAccess",
  "New service": "customContractModules",
  "Custom services": "customContractModules",
  "New service": "customContractModules",
  "Services personnalisés": "customContractModules",
  "Tenant Microsoft": "Tenant Microsoft",
  TenantMicrosoft: "Tenant Microsoft",
  "Google Workspace": "Google Workspace",
  GoogleWorkspace: "Google Workspace"
};
let proFeaturePromoHandler = null;
export function setProFeaturePromoHandler(handler) {
  proFeaturePromoHandler = typeof handler === "function" ? handler : null;
}
export function notifyProFeature(featureLabel, featureKey) {
  const label = String(featureLabel || "This feature").trim();
  const keyFromArg = featureKey && PRO_FEATURE_PROMOS[featureKey] ? featureKey : null;
  const mappedKey = keyFromArg || PRO_FEATURE_PROMO_KEYS[label];
  if (proFeaturePromoHandler) {
    if (mappedKey) {
      proFeaturePromoHandler(mappedKey);
      return;
    }
    if (PRO_FEATURE_PROMOS[label]) {
      proFeaturePromoHandler(label);
      return;
    }
  }
  toast.info(`${label} · available with Veritas Pro`);
}
