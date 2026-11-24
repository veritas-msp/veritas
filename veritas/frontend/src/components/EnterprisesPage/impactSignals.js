import { isBackupJobActive, normalizeServeurLieList } from "./backupJobUtils";
import { inventoryKey } from "./impactMapModel";
import { getRmmAgentStatusKey } from "../EquipementPage/rmmMonitoringUtils";

const AGENT_TYPES = new Set(["Servers", "Serveurs", "Ordinateurs"]);

export function isCheckmkMapped(item) {
  const mapping = item?.checkmkMapping || item?.source?.checkmkMapping;
  return Boolean(mapping?.checkmk_host_name && mapping?.is_active !== false);
}

export function summaryLevel(summary) {
  if (!summary) return null;
  const crit = Number(summary.critServices) || 0;
  const warn = Number(summary.warnServices) || 0;
  if (crit > 0) return "critical";
  const status = String(summary.status || "").toLowerCase();
  if (status === "down" || status === "offline" || status === "critical") return "critical";
  if (warn > 0 || status === "warning") return "warning";
  return null;
}

function pickLevel(alertLevel, fromSummary) {
  if (alertLevel === "critical" || fromSummary === "critical") return "critical";
  if (alertLevel === "warning" || fromSummary === "warning") return "warning";
  return "ok";
}

export function indexSupervisionAlerts(alerts) {
  const map = new Map();
  (Array.isArray(alerts) ? alerts : []).forEach(alert => {
    const equipmentId = String(alert?.equipmentId || "").trim();
    if (!equipmentId) return;
    const severity = String(alert?.severity || "").toLowerCase();
    const level = severity === "critical" || severity === "down" || severity === "offline"
      ? "critical"
      : severity === "warning"
        ? "warning"
        : "";
    if (!level) return;
    const prev = map.get(equipmentId);
    if (prev?.level === "critical") return;
    if (prev?.level === "warning" && level !== "critical") return;
    map.set(equipmentId, {
      level,
      alertId: String(alert.queueItemId || alert.id || ""),
      title: String(alert.title || alert.label || "").trim(),
      detail: String(alert.subtitle || alert?.meta?.serviceName || alert?.meta?.pluginOutput || "").trim()
    });
  });
  return map;
}

export function agentStateFor(item) {
  const type = item?.nodeType || item?.type || "";
  if (!AGENT_TYPES.has(type)) return null;
  const key = getRmmAgentStatusKey(item?.source || item);
  if (key === "online" || key === "offline" || key === "unknown") return key;
  return null;
}

export function backupsForItem(jobs, item) {
  const keys = new Set(
    [item?.name, item?.refId, item?.source?.id, item?.source?.dbId, item?.source?.name, item?.source?.nom]
      .filter(Boolean)
      .map(value => String(value).trim().toLowerCase())
  );
  return (Array.isArray(jobs) ? jobs : []).filter(job => {
    if (!isBackupJobActive(job)) return false;
    const links = normalizeServeurLieList(job?.serveurLie || job?.rawData?.serveurLie);
    return links.some(value => keys.has(String(value).trim().toLowerCase()));
  }).map(job => ({
    id: String(job.id || job.nom || job.name || ""),
    name: String(job.nom || job.name || "").trim() || "Sauvegarde"
  }));
}

export function buildSignalIndex(inventory, alerts, summaries, jobs) {
  const alertIndex = indexSupervisionAlerts(alerts);
  const map = new Map();
  (Array.isArray(inventory) ? inventory : []).forEach(item => {
    const refId = String(item?.refId || "");
    const alert = alertIndex.get(refId) || null;
    const fromSummary = summaryLevel(summaries?.[refId]);
    const monitored = Boolean(item?.checkmkMapped || summaries?.[refId]);
    map.set(inventoryKey(item.kind, item.refId), {
      supervision: monitored ? {
        level: pickLevel(alert?.level, fromSummary),
        alertId: alert?.alertId || "",
        title: alert?.title || "",
        detail: alert?.detail || "",
        equipmentName: item.name || ""
      } : null,
      agent: agentStateFor(item),
      backups: backupsForItem(jobs, item)
    });
  });
  return map;
}

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function normIp(value) {
  return norm(value).replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
}

export function suggestImpactLinks(nodes, edges) {
  const list = (Array.isArray(nodes) ? nodes : []).filter(node => !node.hidden && node.data?.kind !== "manual");
  const linked = new Set((Array.isArray(edges) ? edges : []).filter(edge => !edge.hidden).flatMap(edge => [
    `${edge.source}|${edge.target}`,
    `${edge.target}|${edge.source}`
  ]));
  const suggestions = [];
  const seen = new Set();
  const push = (source, target, kind) => {
    if (!source || !target || source.id === target.id) return;
    if (linked.has(`${source.id}|${target.id}`)) return;
    const id = [kind, source.id, target.id].sort().join(":");
    if (seen.has(id)) return;
    seen.add(id);
    suggestions.push({
      id,
      kind,
      sourceId: source.id,
      targetId: target.id,
      sourceLabel: source.data?.label || "—",
      targetLabel: target.data?.label || "—"
    });
  };

  const byPair = new Map();
  list.forEach(node => {
    const key = node.data?.ha?.pairKey;
    if (!key) return;
    const group = byPair.get(key) || [];
    group.push(node);
    byPair.set(key, group);
  });
  byPair.forEach(group => {
    const primary = group.find(node => node.data?.ha?.role !== "Secondary") || group[0];
    group.forEach(node => {
      if (node.id !== primary.id) push(primary, node, "ha");
    });
  });

  const byName = new Map();
  list.forEach(node => {
    const name = norm(node.data?.label);
    if (name) byName.set(name, node);
  });
  list.forEach(node => {
    const hostName = norm(node.data?.hostServerName);
    const host = hostName ? byName.get(hostName) : null;
    if (host && host.id !== node.id) push(host, node, "host");
  });

  list.forEach(node => {
    const gateway = normIp(node.data?.gateway);
    if (!gateway) return;
    const target = list.find(other => other.id !== node.id && normIp(other.data?.subtitle) === gateway);
    if (target) push(node, target, "gateway");
  });

  return suggestions;
}

export function describeImpact(focus, nodes, impactIds) {
  const level = focus?.data?.supervision?.level;
  if (level !== "critical" && level !== "warning") return null;
  const list = Array.isArray(nodes) ? nodes : [];
  const affected = list.filter(node => (
    node.id !== focus.id
    && !node.hidden
    && impactIds?.has(node.id)
    && node.data?.kind !== "manual"
  ));
  const secondaries = list.filter(node => !node.hidden && node.data?.ha?.role === "Secondary");
  let backup = "";
  if (secondaries.some(node => impactIds?.has(node.id))) backup = "hit";
  else if (secondaries.length) backup = "safe";
  return {
    count: affected.length,
    vlan: (focus.data?.vlans || []).join(", "),
    backup
  };
}
