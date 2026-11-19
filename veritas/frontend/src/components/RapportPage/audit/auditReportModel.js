import {
  AUDIT_BUILDER_STEP_KEYS,
  AUDIT_FINDING_SEVERITIES,
  AUDIT_SECTION_SUBSECTION_KEYS,
  AUDIT_SUBSECTION_STATUSES,
  AUDIT_SUBTYPE_IDS,
  AUDIT_SUBTYPE_SECTION_KEYS
} from "./auditReportConstants";
import { serializeInterventionClient } from "../intervention/interventionReportModel";

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_SECTION_IMAGES = 8;

export function formatClientAddress(client) {
  if (!client || typeof client !== "object") return "";
  if (client.address && String(client.address).trim()) return String(client.address).trim();
  const parts = [
    client.addressStreet || client.adresse_rue,
    [client.addressPostalCode || client.code_postal, client.addressCity || client.ville].filter(Boolean).join(" ")
  ].filter(Boolean);
  return parts.join(", ");
}

export function createFinding({ title = "", severity = "info", detail = "" } = {}) {
  const safeSeverity = AUDIT_FINDING_SEVERITIES.includes(severity) ? severity : "info";
  return {
    id: uid("finding"),
    title,
    severity: safeSeverity,
    detail
  };
}

export function createSectionImage({ dataUrl = "", name = "", caption = "" } = {}) {
  return {
    id: uid("img"),
    dataUrl,
    name,
    caption
  };
}

export function createSubsection({
  key = "",
  title = "",
  content = "",
  status = "",
  images = []
} = {}) {
  const safeStatus = AUDIT_SUBSECTION_STATUSES.includes(status) ? status : "";
  return {
    id: uid("sub"),
    key: key || "",
    title,
    content,
    status: safeStatus,
    images: normalizeImages(images)
  };
}

export function createActionItem({ title = "", priority = "medium", owner = "", dueDate = "", detail = "" } = {}) {
  return {
    id: uid("action"),
    title,
    priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
    owner,
    dueDate,
    detail
  };
}

function defaultSubsectionsForSection(sectionKey, copy) {
  const keys = AUDIT_SECTION_SUBSECTION_KEYS[sectionKey];
  const titles = copy?.subsectionTitles || {};
  if (Array.isArray(keys) && keys.length) {
    return keys.map(key =>
      createSubsection({
        key,
        title: titles[key] || key
      })
    );
  }
  return [
    createSubsection({
      key: "overview",
      title: copy?.fields?.subsectionDefaultTitle || "Détail"
    })
  ];
}

export function createSection(key, title = "", copy = null) {
  return {
    key,
    title,
    content: "",
    subsections: defaultSubsectionsForSection(key, copy),
    findings: []
  };
}

export function getAuditBuilderSteps(subtypeId, copy) {
  const labels = copy?.steps || {};
  return [
    { key: AUDIT_BUILDER_STEP_KEYS.COVER, label: labels.cover || "Couverture" },
    { key: AUDIT_BUILDER_STEP_KEYS.CLIENT, label: labels.client || "Client & mission" },
    { key: AUDIT_BUILDER_STEP_KEYS.OBJECT, label: labels.object || "Objet" },
    { key: AUDIT_BUILDER_STEP_KEYS.SECTIONS, label: labels.sections || "Constats" },
    { key: AUDIT_BUILDER_STEP_KEYS.SYNTHESIS, label: labels.synthesis || "Synthèse" },
    { key: AUDIT_BUILDER_STEP_KEYS.ACTION_PLAN, label: labels.actionPlan || "Plan d'action" },
    { key: AUDIT_BUILDER_STEP_KEYS.VALIDATION, label: labels.validation || "Validation" }
  ];
}

export function buildSectionsForSubtype(subtypeId, copy) {
  const keys = AUDIT_SUBTYPE_SECTION_KEYS[subtypeId] || AUDIT_SUBTYPE_SECTION_KEYS[AUDIT_SUBTYPE_IDS.INFRASTRUCTURE];
  const titles = copy?.sectionTitles || {};
  return keys.map(key => createSection(key, titles[key] || key, copy));
}

export function buildDefaultAuditData({
  client,
  subtypeId = AUDIT_SUBTYPE_IDS.INFRASTRUCTURE,
  organizationName = "",
  organizationAddress = "",
  authorName = "",
  copy = null
} = {}) {
  const today = new Date().toISOString().split("T")[0];
  const clientName = client?.name || client?.nom || "";
  const firstSite = Array.isArray(client?.sites) ? client.sites[0] : null;
  const subtypeLabels = copy?.subtypes?.[subtypeId] || {};
  return {
    subtypeId,
    documentTitle: subtypeLabels.title || copy?.defaultDocumentTitle || "Rapport d'audit",
    diffusion: copy?.defaults?.diffusion || "Confidentielle",
    createdAt: today,
    authorName: authorName || "",
    authorRole: copy?.defaults?.authorRole || "",
    reviewers: "",
    confidentialityNote: copy?.defaults?.confidentialityNote || "",
    clientName,
    clientSiteName: firstSite?.name || firstSite?.nom || clientName,
    clientAddress: formatClientAddress(client) || formatClientAddress(firstSite) || "",
    clientNumber: client?.client_number || client?.clientNumber || "",
    contractNumber: client?.contract_number || client?.contractNumber || "",
    contractStart: "",
    contractEnd: "",
    missionStart: today,
    missionEnd: today,
    technicians: authorName || "",
    technicianRole: "",
    clientApprover: "",
    clientApproverRole: "",
    commercialReferent: "",
    objectText: copy?.defaults?.objectText || "",
    contextText: "",
    sections: buildSectionsForSubtype(subtypeId, copy),
    synthesis: "",
    questionsAnswers: "",
    actionPlan: [createActionItem()],
    companyName: organizationName || "",
    companyAddress: organizationAddress || ""
  };
}

function normalizeFindings(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => createFinding({
    title: item?.title || "",
    severity: item?.severity,
    detail: item?.detail || ""
  })).map((finding, index) => ({
    ...finding,
    id: list[index]?.id || finding.id
  }));
}

function normalizeImages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && String(item.dataUrl || "").trim())
    .slice(0, MAX_SECTION_IMAGES)
    .map((item, index) => ({
      ...createSectionImage({
        dataUrl: item.dataUrl || "",
        name: item.name || "",
        caption: item.caption || ""
      }),
      id: item.id || uid("img")
    }));
}

function normalizeSubsections(list, sectionKey, copy) {
  const defaults = defaultSubsectionsForSection(sectionKey, copy);
  if (!Array.isArray(list) || !list.length) {
    // Migration : ancienne section avec seulement `content` → première sous-section
    return defaults;
  }
  const byKey = new Map(
    list.filter(item => item?.key).map(item => [item.key, item])
  );
  const merged = defaults.map(def => {
    const existing = byKey.get(def.key);
    if (!existing) return def;
    return {
      ...createSubsection({
        key: def.key,
        title: existing.title || def.title,
        content: existing.content || "",
        status: existing.status || "",
        images: existing.images
      }),
      id: existing.id || def.id
    };
  });
  list.forEach(item => {
    if (!item) return;
    if (item.key && defaults.some(def => def.key === item.key)) return;
    merged.push({
      ...createSubsection({
        key: item.key || "",
        title: item.title || copy?.fields?.subsectionCustomTitle || "Sous-section",
        content: item.content || "",
        status: item.status || "",
        images: item.images
      }),
      id: item.id || uid("sub")
    });
  });
  return merged;
}

function migrateLegacySectionContent(section, subsections) {
  const legacy = String(section?.content || "").trim();
  if (!legacy) return subsections;
  const first = subsections[0];
  if (!first) return subsections;
  if (String(first.content || "").trim()) return subsections;
  return subsections.map((sub, index) =>
    index === 0 ? { ...sub, content: legacy } : sub
  );
}

function normalizeActionPlan(list) {
  if (!Array.isArray(list) || !list.length) return [createActionItem()];
  return list.map(item => ({
    ...createActionItem({
      title: item?.title || "",
      priority: item?.priority,
      owner: item?.owner || "",
      dueDate: item?.dueDate || "",
      detail: item?.detail || ""
    }),
    id: item?.id || uid("action")
  }));
}

function normalizeSections(list, subtypeId, copy) {
  const defaults = buildSectionsForSubtype(subtypeId, copy);
  if (!Array.isArray(list) || !list.length) return defaults;
  const byKey = new Map(list.map(section => [section?.key, section]));
  const merged = defaults.map(def => {
    const existing = byKey.get(def.key);
    if (!existing) return def;
    const subsections = migrateLegacySectionContent(
      existing,
      normalizeSubsections(existing.subsections, def.key, copy)
    );
    return {
      ...def,
      title: existing.title || def.title,
      content: existing.content || "",
      subsections,
      findings: normalizeFindings(existing.findings)
    };
  });
  list.forEach(section => {
    if (!section?.key || defaults.some(def => def.key === section.key)) return;
    merged.push({
      key: section.key,
      title: section.title || section.key,
      content: section.content || "",
      subsections: migrateLegacySectionContent(
        section,
        normalizeSubsections(section.subsections, section.key, copy)
      ),
      findings: normalizeFindings(section.findings)
    });
  });
  return merged;
}

export function mergeAuditData(defaults, initial, copy = null) {
  if (!initial || typeof initial !== "object") return defaults;
  const subtypeId = initial.subtypeId || defaults.subtypeId;
  return {
    ...defaults,
    ...initial,
    subtypeId,
    sections: normalizeSections(initial.sections, subtypeId, copy),
    actionPlan: normalizeActionPlan(initial.actionPlan)
  };
}

export function rebuildSectionsKeepingContent(data, subtypeId, copy) {
  const nextDefaults = buildSectionsForSubtype(subtypeId, copy);
  const previous = Array.isArray(data?.sections) ? data.sections : [];
  const byKey = new Map(previous.map(section => [section.key, section]));
  return nextDefaults.map(def => {
    const existing = byKey.get(def.key);
    if (!existing) return def;
    return {
      ...def,
      content: existing.content || "",
      subsections: migrateLegacySectionContent(
        existing,
        normalizeSubsections(existing.subsections, def.key, copy)
      ),
      findings: normalizeFindings(existing.findings)
    };
  });
}

export function validateAuditStep(stepKey, data) {
  if (!data) return false;
  switch (stepKey) {
    case AUDIT_BUILDER_STEP_KEYS.COVER:
      return Boolean(String(data.documentTitle || "").trim() && String(data.createdAt || "").trim());
    case AUDIT_BUILDER_STEP_KEYS.CLIENT:
      return Boolean(String(data.clientName || "").trim() && String(data.missionStart || "").trim());
    case AUDIT_BUILDER_STEP_KEYS.OBJECT:
      return Boolean(String(data.objectText || "").trim());
    case AUDIT_BUILDER_STEP_KEYS.SECTIONS:
      return (
        Array.isArray(data.sections) &&
        data.sections.some(section => {
          const hasContent = String(section?.content || "").trim();
          const hasSub = (section?.subsections || []).some(
            sub =>
              String(sub?.content || "").trim() ||
              (Array.isArray(sub?.images) && sub.images.length > 0)
          );
          const hasFinding = (section?.findings || []).some(f => String(f?.title || "").trim());
          return hasContent || hasSub || hasFinding;
        })
      );
    case AUDIT_BUILDER_STEP_KEYS.SYNTHESIS:
      return Boolean(String(data.synthesis || "").trim());
    case AUDIT_BUILDER_STEP_KEYS.ACTION_PLAN:
      return Array.isArray(data.actionPlan) && data.actionPlan.some(item => String(item?.title || "").trim());
    case AUDIT_BUILDER_STEP_KEYS.VALIDATION:
      return true;
    default:
      return true;
  }
}

export function buildAuditReportPeriod(data) {
  const subtype = data?.documentTitle || "Audit";
  const start = data?.missionStart || "";
  const end = data?.missionEnd || "";
  if (start && end && start !== end) return `${subtype} · ${start} → ${end}`;
  if (start) return `${subtype} · ${start}`;
  return subtype;
}

export function buildDefaultAuditSaveName(clientLabel, subtypeTitle, copy) {
  const template = copy?.saveNamePlaceholder || "Audit · {subtype} · {client}";
  const base = template
    .replace("{subtype}", subtypeTitle || "Audit")
    .replace("{client}", clientLabel || "client");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base} ${suffix}`;
}

function serializeAuditPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  return {
    subtypeId: payload.subtypeId || AUDIT_SUBTYPE_IDS.INFRASTRUCTURE,
    documentTitle: payload.documentTitle || "",
    diffusion: payload.diffusion || "",
    createdAt: payload.createdAt || "",
    authorName: payload.authorName || "",
    authorRole: payload.authorRole || "",
    reviewers: payload.reviewers || "",
    confidentialityNote: payload.confidentialityNote || "",
    clientName: payload.clientName || "",
    clientSiteName: payload.clientSiteName || "",
    clientAddress: payload.clientAddress || "",
    clientNumber: payload.clientNumber || "",
    contractNumber: payload.contractNumber || "",
    contractStart: payload.contractStart || "",
    contractEnd: payload.contractEnd || "",
    missionStart: payload.missionStart || "",
    missionEnd: payload.missionEnd || "",
    technicians: payload.technicians || "",
    technicianRole: payload.technicianRole || "",
    clientApprover: payload.clientApprover || "",
    clientApproverRole: payload.clientApproverRole || "",
    commercialReferent: payload.commercialReferent || "",
    objectText: payload.objectText || "",
    contextText: payload.contextText || "",
    sections: Array.isArray(payload.sections)
      ? payload.sections.map(section => ({
          key: section.key,
          title: section.title || "",
          content: section.content || "",
          subsections: (Array.isArray(section.subsections) ? section.subsections : []).map(sub => ({
            id: sub.id || uid("sub"),
            key: sub.key || "",
            title: sub.title || "",
            content: sub.content || "",
            status: AUDIT_SUBSECTION_STATUSES.includes(sub.status) ? sub.status : "",
            images: normalizeImages(sub.images)
          })),
          findings: normalizeFindings(section.findings)
        }))
      : [],
    synthesis: payload.synthesis || "",
    questionsAnswers: payload.questionsAnswers || "",
    actionPlan: normalizeActionPlan(payload.actionPlan),
    companyName: payload.companyName || "",
    companyAddress: payload.companyAddress || ""
  };
}

export function serializeAuditSavePayload(client, payload, reportType = "audit") {
  return {
    config: {
      reportType,
      auditSubtype: payload?.subtypeId || AUDIT_SUBTYPE_IDS.INFRASTRUCTURE,
      client: serializeInterventionClient(client)
    },
    data: {
      audit: serializeAuditPayload(payload)
    }
  };
}

export { isDuplicateMonitoringSaveResult } from "../intervention/interventionReportModel";
