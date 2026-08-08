export const licenseNameMapping = {
  'ENTERPRISEPACK': 'Microsoft 365 E3',
  'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
  'ENTERPRISEWITHSCAL': 'Microsoft 365 E3 with telephony',
  'M365EDU_A3_FACULTY': 'Microsoft 365 A3 (Enseignants)',
  'M365EDU_A3_STUDENT': 'Microsoft 365 A3 (Students)',
  'M365EDU_A5_FACULTY': 'Microsoft 365 A5 (Enseignants)',
  'M365EDU_A5_STUDENT': 'Microsoft 365 A5 (Students)',
  'O365_BUSINESS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'SMB_BUSINESS': 'Microsoft 365 Business Standard',
  'SMB_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Essentials',
  'SMB_BUSINESS_PREMIUM': 'Microsoft 365 Business Premium',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'EXCHANGEARCHIVE_ADDON': 'Exchange Online Archiving',
  'EXCHANGEDESKLESS': 'Exchange Online Kiosk',
  'SHAREPOINTSTANDARD': 'SharePoint Online Plan 1',
  'SHAREPOINTENTERPRISE': 'SharePoint Online Plan 2',
  'SHAREPOINTWAC': 'Office for the web',
  'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory',
  'TEAMS1': 'Microsoft Teams (Essentiel)',
  'TEAMS_COMMERCIAL': 'Microsoft Teams Commercial',
  'TEAMS_EDU': 'Microsoft Teams for Education',
  'AAD_PREMIUM': 'Azure AD Premium P1',
  'AAD_PREMIUM_P2': 'Azure AD Premium P2',
  'AAD_BASIC': 'Azure AD Basic',
  'OFFICESUBSCRIPTION': 'Microsoft 365 Apps for enterprise',
  'OFFICE_PRO_PLUS_SUBSCRIPTION_SMBIZ': 'Office 365 ProPlus',
  'OFFICE365_MIDSIZE_BUSINESS': 'Office 365 Midsize Business',
  'RMS_S_ENTERPRISE': 'Azure Rights Management',
  'RMS_S_PREMIUM': 'Azure Information Protection Premium P1',
  'RMS_S_PREMIUM2': 'Azure Information Protection Premium P2',
  'INTUNE_A': 'Microsoft Intune',
  'INTUNE_A_VL': 'Microsoft Intune (Volume)',
  'VISIOCLIENT': 'Visio Plan 1',
  'VISIOONLINE_PLAN1': 'Visio Plan 1',
  'VISIOONLINE_PLAN2': 'Visio Plan 2',
  'PROJECTPROFESSIONAL': 'Project Plan 3',
  'PROJECTONLINE_PLAN_1': 'Project Plan 1',
  'PROJECTONLINE_PLAN_2': 'Project Plan 2',
  'PROJECTPREMIUM': 'Project Plan 5',
  'POWER_BI_STANDARD': 'Power BI (Gratuit)',
  'POWER_BI_PRO': 'Power BI Pro',
  'POWER_BI_PREMIUM': 'Power BI Premium',
  'FLOW_FREE': 'Power Automate (Gratuit)',
  'POWERAPPS_VIRAL': 'Power Apps (Gratuit)',
  'POWERAPPS_PER_USER': 'Power Apps per user',
  'STREAM': 'Microsoft Stream',
  'YAMMER_ENTERPRISE': 'Yammer Enterprise',
  'YAMMER_MIDSIZE': 'Yammer',
  'ENTERPRISEPACK_GOV': 'Microsoft 365 E3 (Gouvernement)',
  'ENTERPRISEPREMIUM_GOV': 'Microsoft 365 E5 (Gouvernement)',
  'STANDARDWOFFPACK_STUDENT': 'Office 365 Education (Students)',
  'STANDARDWOFFPACK_FACULTY': 'Office 365 Education (Faculty)',
  'STANDARDWOFFPACK_IW_FACULTY': 'Office 365 Education Plus (Faculty)',
  'STANDARDWOFFPACK_IW_STUDENT': 'Office 365 Education Plus (Students)',
  'DESKLESSPACK': 'Office 365 Kiosk',
  'DESKLESSWOFFPACK': 'Office 365 Kiosk',
  'WACSHAREPOINTSTD': 'Office for the web with SharePoint',
  'WACSHAREPOINTENT': 'Office for the web with SharePoint (Enterprise)'
};
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
export const recommendationStateLabels = {
  terminé: "Completed",
  resolved: "Completed",
  completed: "Completed",
  "en cours": "In progress",
  inprogress: "In progress",
  "in-progress": "In progress",
  actif: "Active",
  active: "Active",
  acknowledged: "Reconnu",
  todo: "To process",
  notstarted: "To process",
  unknown: "Unknown",
  unknown: "Unknown"
};
export const priorityLevelLabelMap = {
  3: "High",
  2: "Moyenne",
  1: "Faible",
  0: "Unclassified"
};
export const priorityColorMap = {
  "High": "#ef4444",
  "Moyenne": "#f59e0b",
  "Faible": "#6b7280",
  "Unclassified": "#9ca3af"
};
export const stateBadgeStyles = {
  "Completed": {
    background: "#dcfce7",
    color: "#166534"
  },
  "In progress": {
    background: "#fef3c7",
    color: "#92400e"
  },
  "Active": {
    background: "#dbeafe",
    color: "#1e40af"
  },
  "Reconnu": {
    background: "#e0e7ff",
    color: "#3730a3"
  },
  "To process": {
    background: "#fee2e2",
    color: "#991b1b"
  },
  "Unknown": {
    background: "#e5e7eb",
    color: "#374151"
  }
};
export const translateRecommendationStateLabel = state => {
  if (!state) return "Unknown";
  const normalized = state.toString().toLowerCase();
  return recommendationStateLabels[normalized] || "Unknown";
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
export const getStateBadgeStyle = label => {
  return stateBadgeStyles[label] || stateBadgeStyles["Unknown"];
};
export const getPriorityLabel = rec => {
  if (rec?.priorityLabel) return rec.priorityLabel;
  return getPriorityLabelFromLevel(computePriorityLevel(rec));
};
export const getStateLabel = rec => {
  return rec?.stateLabel || translateRecommendationStateLabel(rec?.state);
};
export const formatDate = dateString => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};
export const formatDateTime = dateString => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};
export const formatBytes = bytes => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};
export const getSortedUsers = (users, sortColumn, sortDirection) => {
  if (!sortColumn) return users;
  const sorted = [...users].sort((a, b) => {
    let aValue, bValue;
    switch (sortColumn) {
      case 'nom':
        aValue = (a.name || a.displayName || '').toLowerCase();
        bValue = (b.name || b.displayName || '').toLowerCase();
        break;
      case 'email':
        aValue = (a.email || a.userPrincipalName || '').toLowerCase();
        bValue = (b.email || b.userPrincipalName || '').toLowerCase();
        break;
      case 'dateCreation':
        aValue = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        bValue = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        break;
      case 'derniereLogin':
        aValue = a.lastLoginDate ? new Date(a.lastLoginDate).getTime() : 0;
        bValue = b.lastLoginDate ? new Date(b.lastLoginDate).getTime() : 0;
        break;
      case 'statut':
        const getStatusValue = user => {
          if (user.accountEnabled === false) return 0;
          const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
          const period90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          const isInactive = !lastLogin || lastLogin < period90Days;
          const period30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const isActive30 = lastLogin && lastLogin >= period30Days;
          if (isActive30) return 3;
          if (isInactive) return 1;
          return 2;
        };
        aValue = getStatusValue(a);
        bValue = getStatusValue(b);
        break;
      case 'licence':
        aValue = (a.licenses || 'None').toLowerCase();
        bValue = (b.licenses || 'None').toLowerCase();
        break;
      default:
        return 0;
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
};
