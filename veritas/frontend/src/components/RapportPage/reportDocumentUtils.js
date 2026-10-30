import { REPORT_TYPE_IDS } from "./reportTypeConstants";

const EMPTY_SYNTHESIS = {
  supervision: null,
  sauvegarde: null,
  microsoft: null,
  antispam: null,
  antivirus: null,
  domains: null
};

export function emptyCustomSynthesis() {
  return { ...EMPTY_SYNTHESIS };
}

export function normalizeCustomSynthesis(raw) {
  if (!raw || typeof raw !== "object") return emptyCustomSynthesis();
  return {
    supervision: raw.supervision ?? null,
    sauvegarde: raw.sauvegarde ?? null,
    microsoft: raw.microsoft ?? null,
    antispam: raw.antispam ?? null,
    antivirus: raw.antivirus ?? null,
    domains: raw.domains ?? null
  };
}

/** Resolve report type id from a v_b_d_monitoring row. */
export function resolveReportTypeIdFromDocument(doc) {
  const config = doc?.config || {};
  const data = doc?.data || {};
  const raw = String(
    data.reportType
    || config.reportType
    || (data.intervention ? REPORT_TYPE_IDS.INTERVENTION : "")
    || (data.audit ? REPORT_TYPE_IDS.AUDIT : "")
    || ""
  ).trim().toLowerCase();

  if (raw === REPORT_TYPE_IDS.INTERVENTION || raw.includes("intervention")) {
    return REPORT_TYPE_IDS.INTERVENTION;
  }
  if (raw === REPORT_TYPE_IDS.AUDIT || raw.includes("audit")) {
    return REPORT_TYPE_IDS.AUDIT;
  }
  if (
    raw === REPORT_TYPE_IDS.SUPERVISION_ETAT
    || raw === "monitoring"
    || raw.includes("supervision")
    || raw.includes("monitoring")
    || data.checkMK
    || data.reportComments
  ) {
    return REPORT_TYPE_IDS.SUPERVISION_ETAT;
  }
  return REPORT_TYPE_IDS.SUPERVISION_ETAT;
}

export function getDocumentClientId(doc) {
  const config = doc?.config || {};
  const client = config.client || {};
  return client.id ?? client.uuid ?? null;
}

export function buildSupervisionBuilderStatePayload({
  equipmentCheckMKData = {},
  equipmentMonitoringStatus = {},
  equipmentAlertCounts = {},
  equipmentTicketInsightCounts = {},
  equipmentTicketsByKey = {},
  customSynthesis = null,
  savedAt = null
} = {}) {
  return {
    version: 1,
    savedAt: savedAt || new Date().toISOString(),
    equipmentCheckMKData,
    equipmentMonitoringStatus,
    equipmentAlertCounts,
    equipmentTicketInsightCounts,
    equipmentTicketsByKey,
    customSynthesis: normalizeCustomSynthesis(customSynthesis)
  };
}
