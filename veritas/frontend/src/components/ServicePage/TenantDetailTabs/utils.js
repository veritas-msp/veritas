export const licenseNameMapping = {
  'SPB': 'Microsoft 365 Business Premium',
  'SPE_E3': 'Microsoft 365 E3',
  'SPE_E5': 'Microsoft 365 E5',
  'SPE_F1': 'Microsoft 365 F1',
  'Microsoft_365_Business_Premium': 'Microsoft 365 Business Premium',
  'Microsoft_365_Business_Standard': 'Microsoft 365 Business Standard',
  'Microsoft_365_Business_Basic': 'Microsoft 365 Business Basic',
  'Microsoft_365_E3': 'Microsoft 365 E3',
  'Microsoft_365_E5': 'Microsoft 365 E5',
  'Microsoft_365_F3': 'Microsoft 365 F3',
  'ENTERPRISEPACK': 'Office 365 E3',
  'ENTERPRISEPREMIUM': 'Office 365 E5',
  'ENTERPRISEWITHSCAL': 'Office 365 E3 with telephony',
  'M365EDU_A3_FACULTY': 'Microsoft 365 A3 (Faculty)',
  'M365EDU_A3_STUDENT': 'Microsoft 365 A3 (Students)',
  'M365EDU_A5_FACULTY': 'Microsoft 365 A5 (Faculty)',
  'M365EDU_A5_STUDENT': 'Microsoft 365 A5 (Students)',
  'STANDARDWOFFPACK_FACULTY': 'Office 365 Education (Faculty)',
  'STANDARDWOFFPACK_STUDENT': 'Office 365 Education (Students)',
  'O365_BUSINESS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'SMB_BUSINESS': 'Microsoft 365 Business Standard',
  'SMB_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'SMB_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'EXCHANGEARCHIVE_ADDON': 'Exchange Online Archiving',
  'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
  'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
  'TEAMS1': 'Microsoft Teams (Essential)',
  'EMS': 'Enterprise Mobility + Security E3',
  'EMSPREMIUM': 'Enterprise Mobility + Security E5',
  'AAD_PREMIUM': 'Microsoft Entra ID P1',
  'AAD_PREMIUM_P2': 'Microsoft Entra ID P2',
  'INTUNE_A': 'Microsoft Intune',
  'OFFICESUBSCRIPTION': 'Microsoft 365 Apps for enterprise',
  'POWER_BI_PRO': 'Power BI Pro',
  'POWER_BI_STANDARD': 'Power BI Free',
  'FLOW_FREE': 'Power Automate (Free)',
  'DESKLESSPACK': 'Office 365 F3',
  'ATP_ENTERPRISE': 'Microsoft Defender for Office 365'
};
const FREE_LICENSE_PATTERNS = ['FLOW_FREE', 'STORE', 'WINDOWS_STORE', 'EXPLORATORY', 'TRIAL', 'POWER_BI_STANDALONE', 'FREE', 'GRATUIT'];
export function isFreeLicense(lic) {
  const raw = (lic && (lic.nom || lic.displayName) || '').toUpperCase().trim();
  if (!raw) return false;
  return FREE_LICENSE_PATTERNS.some(pattern => raw.includes(pattern.toUpperCase()));
}
export const getLicenseDisplayName = licenseId => {
  if (!licenseId) return 'Unknown license';
  const trimmed = String(licenseId).trim();
  if (/[a-z]/.test(trimmed) && /\s/.test(trimmed)) return trimmed;
  const normalizedId = trimmed.toUpperCase();
  if (licenseNameMapping[normalizedId] || licenseNameMapping[trimmed]) {
    return licenseNameMapping[normalizedId] || licenseNameMapping[trimmed];
  }
  for (const [key, value] of Object.entries(licenseNameMapping)) {
    const keyNorm = key.toUpperCase();
    if (normalizedId === keyNorm || normalizedId.startsWith(`${keyNorm}_`)) {
      return value;
    }
  }
  const formatted = trimmed.replace(/_/g, ' ').replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  return formatted;
};
export const priorityLevelLabelMap = {
  3: "High",
  2: "Medium",
  1: "Low",
  0: "Unclassified"
};
export const priorityColorMap = {
  "High": "#ef4444",
  "Medium": "#f59e0b",
  "Low": "#6b7280",
  "Unclassified": "#9ca3af"
};
export const computePriorityLevel = rec => {
  const rank = typeof rec?.rank === 'number' ? rec.rank : null;
  const maxScore = typeof rec?.maxScore === 'number' ? rec.maxScore : 0;
  if (rec?.priorityLevel !== undefined && rec.priorityLevel !== null) {
    return rec.priorityLevel;
  }
  if (rank !== null) {
    if (rank <= 20) return 3;
    if (rank <= 60) return 2;
    if (rank > 0) return 1;
  }
  if (maxScore >= 15) return 3;
  if (maxScore >= 8) return 2;
  if (maxScore > 0) return 1;
  return 0;
};
export const getPriorityLabelFromLevel = level => {
  return priorityLevelLabelMap[level] || "Unclassified";
};
export const getPriorityColorValue = label => {
  return priorityColorMap[label] || priorityColorMap["Unclassified"];
};
export const getPriorityLabel = rec => {
  if (rec?.priorityLabel) return rec.priorityLabel;
  return getPriorityLabelFromLevel(computePriorityLevel(rec));
};
