export const licenseNameMapping = {
  'ENTERPRISEPACK': 'Microsoft 365 E3',
  'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
  'STANDARDWOFFPACK_FACULTY': 'Office 365 Education (Faculty)',
  'STANDARDWOFFPACK_STUDENT': 'Office 365 Education (Students)',
  'O365_BUSINESS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
  'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
  'TEAMS1': 'Microsoft Teams (Essential)',
  'FLOW_FREE': 'Power Automate (Free)'
};
const FREE_LICENSE_PATTERNS = ['FLOW_FREE', 'STORE', 'WINDOWS_STORE', 'EXPLORATORY', 'TRIAL', 'POWER_BI_STANDALONE', 'FREE', 'GRATUIT'];
export function isFreeLicense(lic) {
  const raw = (lic && (lic.nom || lic.displayName) || '').toUpperCase().trim();
  if (!raw) return false;
  return FREE_LICENSE_PATTERNS.some(pattern => raw.includes(pattern.toUpperCase()));
}
export const getLicenseDisplayName = licenseId => {
  if (!licenseId) return 'Unknown license';
  const normalizedId = licenseId.toUpperCase().trim();
  if (licenseNameMapping[normalizedId]) {
    return licenseNameMapping[normalizedId];
  }
  for (const [key, value] of Object.entries(licenseNameMapping)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return value;
    }
  }
  const formatted = licenseId.replace(/_/g, ' ').replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
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
