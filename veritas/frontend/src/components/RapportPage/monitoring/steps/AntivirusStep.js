import React, { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import styles from "../RapportMonitoringBuilder.module.css";
import { AntivirusOverviewPanel } from "../../../EnterprisesPage/AntivirusOverviewModal";
import SolutionDetailPageLayout from "../../../EnterprisesPage/SolutionDetailPageLayout";
import { normalizeAntivirusItem } from "../../../EnterprisesPage/antivirusSolutionUtils";
import { MonitoringStepShell, MonitoringStepSubsectionHeader } from "../MonitoringStepLayout";
function normalizeAntivirus(sol) {
  if (!sol) return sol;
  const name = sol.solution || sol.logiciel || sol.nom || sol.name || "Solution antivirus";
  return {
    ...sol,
    nom: name,
    name
  };
}
function getSolutionName(sol) {
  return sol.solution || sol.logiciel || sol.nom || sol.name || "Solution antivirus";
}
function getEndpointTypeIcon(type) {
  const t = (type ?? "").toLowerCase();
  if (t === "virtuel" || t === "virtual") return "mdi:cube-outline";
  if (t === "physique" || t === "physical") return "mdi:desktop-classic";
  return "mdi:monitor";
}
function getEndpointOsIcon(os) {
  if (!os || typeof os !== "string") return null;
  const s = os.toLowerCase();
  if (s.includes("windows") || s.includes("microsoft")) return "mdi:windows";
  if (s.includes("linux") || s.includes("ubuntu") || s.includes("debian") || s.includes("centos") || s.includes("rhel") || s.includes("red hat")) return "mdi:linux";
  if (s.includes("mac") || s.includes("darwin")) return "mdi:apple";
  return null;
}
const MS_24H = 24 * 60 * 60 * 1000;
function parseLastSeen(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return raw < 1e12 ? new Date(raw * 1000) : new Date(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) {
        return n < 1e12 ? new Date(n * 1000) : new Date(n);
      }
    }
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}
function formatLastSeen(raw) {
  const d = parseLastSeen(raw);
  return d ? d.toLocaleString("en-US") : "-";
}
function isLastSeenOver24h(raw) {
  const d = parseLastSeen(raw);
  if (!d) return true;
  return Date.now() - d.getTime() > MS_24H;
}
function formatPolicyDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("en-US");
  } catch {
    return String(dateStr);
  }
}
function extractPoliciesList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.policies)) return raw.policies;
  return [];
}
function buildPolicyTableRows(policiesList, enrichedEndpoints) {
  const policyUsage = new Map();
  const endpointOnlyNames = new Map();
  enrichedEndpoints.forEach(ep => {
    const policyId = ep.policy?.id;
    if (policyId != null) {
      const key = String(policyId);
      const current = policyUsage.get(key) || {
        count: 0,
        applied: 0
      };
      current.count += 1;
      if (ep.policy?.applied) current.applied += 1;
      policyUsage.set(key, current);
      return;
    }
    const name = ep.policy?.name || ep.policyName || "Sans politique";
    endpointOnlyNames.set(name, (endpointOnlyNames.get(name) || 0) + 1);
  });
  const allPolicies = extractPoliciesList(policiesList);
  if (allPolicies.length > 0) {
    const usedIds = new Set(policyUsage.keys());
    const visiblePolicies = usedIds.size > 0 ? allPolicies.filter(p => p?.id != null && usedIds.has(String(p.id))) : allPolicies;
    return visiblePolicies.map(policy => {
      const usage = policyUsage.get(String(policy.id)) || {
        count: 0,
        applied: 0
      };
      const endpoints = usage.count > 0 ? usage.count : policy.endpointsCount ?? 0;
      return {
        key: String(policy.id),
        name: policy.name || policy.policyName || "Sans nom",
        type: policy.type || policy.policyType || "-",
        endpoints,
        applied: usage.applied,
        totalForApplied: usage.count || endpoints,
        createdAt: policy.details?.createDate,
        modifiedAt: policy.details?.lastModifyDate,
        createdBy: policy.details?.createdBy
      };
    });
  }
  if (endpointOnlyNames.size > 0) {
    return Array.from(endpointOnlyNames.entries()).map(([name, count]) => ({
      key: name,
      name,
      type: "-",
      endpoints: count,
      applied: null,
      totalForApplied: count,
      createdAt: null,
      modifiedAt: null,
      createdBy: null
    }));
  }
  return [];
}
const ANTIVIRUS_POLICY_COLUMNS = [{
  id: "name",
  label: "Politique",
  render: row => <div className={equipmentStyles.nameCell}>
        <Icon icon="mdi:shield-account-outline" width={16} height={16} />
        <span className={equipmentStyles.internetCellBold}>{row.name}</span>
      </div>
}, {
  id: "type",
  label: "Type",
  render: row => row.type || "-"
}, {
  id: "endpoints",
  label: "Endpoints",
  render: row => row.endpoints ?? "-"
}, {
  id: "applied",
  label: "Applied",
  render: row => row.applied == null ? "-" : <span style={{
    padding: "0.2rem 0.45rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    backgroundColor: row.applied > 0 ? "#d1fae5" : "#f3f4f6",
    color: row.applied > 0 ? "#059669" : "#6b7280",
    fontWeight: 500
  }}>
          {row.applied} / {row.totalForApplied}
        </span>
}, {
  id: "createdAt",
  label: "Created on",
  render: row => formatPolicyDate(row.createdAt)
}, {
  id: "modifiedAt",
  label: "Modified on",
  render: row => formatPolicyDate(row.modifiedAt)
}, {
  id: "createdBy",
  label: "Created by",
  render: row => row.createdBy || "-"
}];
function SolutionDetailBlock({
  solution,
  enrichedEndpoints,
  policiesList,
  endpointSearch,
  setEndpointSearch,
  endpointSort,
  setEndpointSort,
  section = "endpoints"
}) {
  const endpointList = useMemo(() => {
    const raw = solution.syncData?.endpoints?.list ?? solution.endpoints ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [solution]);
  const filteredEndpoints = useMemo(() => {
    const q = endpointSearch.trim().toLowerCase();
    if (!q) return endpointList;
    return endpointList.filter(ep => {
      const name = (ep.name ?? "").toLowerCase();
      const fqdn = (ep.fqdn ?? "").toLowerCase();
      const ip = (ep.ip ?? "").toLowerCase();
      const os = (ep.operatingSystem ?? "").toLowerCase();
      const type = (ep.type ?? "").toLowerCase();
      return name.includes(q) || fqdn.includes(q) || ip.includes(q) || os.includes(q) || type.includes(q);
    });
  }, [endpointList, endpointSearch]);
  const sortedEndpoints = useMemo(() => {
    const {
      column: sortCol,
      direction: sortDir
    } = endpointSort;
    if (!sortCol) return filteredEndpoints;
    return [...filteredEndpoints].sort((a, b) => {
      if (sortCol === "managed") {
        const va = a.isManaged === true ? 1 : a.isManaged === false ? 0 : -1;
        const vb = b.isManaged === true ? 1 : b.isManaged === false ? 0 : -1;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortCol === "status") {
        const getStatus = ep => {
          const enriched = enrichedEndpoints.find(e => e.id === ep.id || String(e.id) === String(ep.id) || (e.name ?? "") === (ep.name ?? "") && (e.ip ?? "") === (ep.ip ?? "") && (e.fqdn ?? "") === (ep.fqdn ?? ""));
          const state = enriched?.endpointState ?? ep.endpointState;
          if (state === 1 || ep.isManaged) return 2;
          if (state === 2) return 1;
          return 0;
        };
        const va = getStatus(a);
        const vb = getStatus(b);
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortCol === "lastSeen") {
        const findEnriched = ep => enrichedEndpoints.find(e => e.id === ep.id || String(e.id) === String(ep.id) || (e.name ?? "") === (ep.name ?? "") && (e.ip ?? "") === (ep.ip ?? "") && (e.fqdn ?? "") === (ep.fqdn ?? ""));
        const getTs = ep => {
          const enriched = findEnriched(ep);
          const d = parseLastSeen(enriched?.lastSeen);
          return d ? d.getTime() : 0;
        };
        return sortDir === "asc" ? getTs(a) - getTs(b) : getTs(b) - getTs(a);
      }
      const getStr = ep => {
        switch (sortCol) {
          case "name":
            return (ep.name ?? "").toLowerCase();
          case "ip":
            return (ep.ip ?? "").toLowerCase();
          case "fqdn":
            return (ep.fqdn ?? "").toLowerCase();
          case "os":
            return (ep.operatingSystem ?? "").toLowerCase();
          default:
            return "";
        }
      };
      const cmp = String(getStr(a)).localeCompare(String(getStr(b)));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredEndpoints, endpointSort, enrichedEndpoints]);
  const policyTableRows = useMemo(() => buildPolicyTableRows(policiesList, enrichedEndpoints), [policiesList, enrichedEndpoints]);
  const policyEquipments = useMemo(() => policyTableRows.map((row, index) => ({
    ...row,
    id: `${row.key}-${index}`,
    nom: row.name,
    name: row.name
  })), [policyTableRows]);
  const enrichedMapById = useMemo(() => {
    const map = new Map();
    enrichedEndpoints.forEach(ep => {
      if (ep.id != null) {
        map.set(ep.id, ep);
        map.set(String(ep.id), ep);
      }
      const key = `${ep.name ?? ""}|${ep.ip ?? ""}|${ep.fqdn ?? ""}`.trim();
      if (key && key !== "||") map.set(key, ep);
    });
    return map;
  }, [enrichedEndpoints]);
  const getEndpointModules = (ep, enriched) => {
    const modules = enriched?.modules ?? ep.modules ?? [];
    let list = [];
    if (Array.isArray(modules)) {
      list = modules;
    } else if (modules && typeof modules === "object") {
      list = Object.keys(modules).filter(k => modules[k] === true);
    }
    const moduleNames = {
      advancedThreatControl: "Advanced threat control",
      antimalware: "Antimalware",
      contentControl: "Content control",
      deviceControl: "Device control",
      firewall: "Firewalls",
      powerUser: "Power user"
    };
    const abbreviations = {
      advancedThreatControl: "ATC",
      antimalware: "AM",
      antiphishing: "AP",
      antitampering: "AT",
      contentControl: "CC",
      deviceControl: "DC",
      firewall: "FW",
      powerUser: "PU"
    };
    const seen = new Set();
    return list.reduce((acc, moduleKey) => {
      const key = String(moduleKey);
      if (seen.has(key)) return acc;
      seen.add(key);
      const abbr = abbreviations[key] || key.substring(0, 3).toUpperCase();
      const fullName = moduleNames[key] || key;
      acc.push({
        abbr,
        fullName,
        moduleKey: key
      });
      return acc;
    }, []);
  };
  const getEndpointPolicyName = (ep, enriched) => {
    if (enriched?.policy && (enriched.policy.name || enriched.policy.id)) {
      return enriched.policy.name || `ID ${enriched.policy.id}`;
    }
    if (ep.policy && (ep.policy.name || ep.policy.id)) {
      return ep.policy.name || `ID ${ep.policy.id}`;
    }
    return ep.policyName || null;
  };
  const isEndpointInfected = (ep, enriched) => enriched?.isInfected === true || ep.isInfected === true || enriched?.malwareDetected === true || ep.malwareDetected === true;
  if (section === "policies") {
    if (policyEquipments.length === 0) {
      return <div className={styles.antivirusModalNoData}>Aucune politique à afficher.</div>;
    }
    return <div className={equipmentStyles.hardwarePageEmbedded}>
            <div className={`${equipmentStyles.tableWrapperEmbedded} ${styles.antivirusEndpointsTableWrapper}`}>
              <table className={equipmentStyles.equipmentTableEmbedded}>
                <thead>
                  <tr>
                    {ANTIVIRUS_POLICY_COLUMNS.map(col => <th key={col.id}>
                        <span className={equipmentStyles.thContent}>{col.label}</span>
                      </th>)}
                  </tr>
                </thead>
                <tbody>
                  {policyEquipments.map(row => <tr key={row.id}>
                      {ANTIVIRUS_POLICY_COLUMNS.map(col => <td key={col.id}>{col.render(row)}</td>)}
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>;
  }
  if (endpointList.length === 0) {
    return <div className={styles.antivirusModalNoData}>Aucun endpoint à afficher.</div>;
  }
  return <section className={styles.antivirusEndpointsSection}>
          <MonitoringStepSubsectionHeader title={`Endpoints (${sortedEndpoints.length}${endpointList.length !== sortedEndpoints.length ? ` / ${endpointList.length}` : ""})`} searchValue={endpointSearch} onSearchChange={setEndpointSearch} onSearchClear={() => setEndpointSearch("")} searchPlaceholder="Search (name, FQDN, IP, OS, type)..." />
          <div className={equipmentStyles.hardwarePageEmbedded}>
            <div className={`${equipmentStyles.tableWrapperEmbedded} ${styles.antivirusEndpointsTableWrapper}`}>
            <table className={equipmentStyles.equipmentTableEmbedded}>
              <thead>
                <tr>
                  {[{
                  key: "name",
                  label: "Name"
                }, {
                  key: "fqdn",
                  label: "FQDN"
                }, {
                  key: "status",
                  label: "Status"
                }, {
                  key: "managed",
                  label: "Managed"
                }, {
                  key: "ip",
                  label: "IP"
                }, {
                  key: "os",
                  label: "OS"
                }, {
                  key: "lastSeen",
                  label: "Last connection"
                }].map(({
                  key,
                  label
                }) => <th key={key} className={equipmentStyles.sortableTh} onClick={() => setEndpointSort(prev => ({
                  column: key,
                  direction: prev.column === key && prev.direction === "asc" ? "desc" : "asc"
                }))} title={`Trier par ${label}`}>
                      <span>{label}</span>
                      {endpointSort.column === key && <Icon icon={endpointSort.direction === "asc" ? "mdi:chevron-up" : "mdi:chevron-down"} width={16} height={16} className={styles.antivirusModalSortIcon} />}
                    </th>)}
                  <th>
                    <span className={equipmentStyles.thContent}>Modules</span>
                  </th>
                  <th>
                    <span className={equipmentStyles.thContent}>Politique</span>
                  </th>
                  <th>
                    <span className={equipmentStyles.thContent}>Infected</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEndpoints.map((ep, idx) => {
                const typeIcon = getEndpointTypeIcon(ep.type);
                const osIcon = getEndpointOsIcon(ep.operatingSystem);
                const fallbackKey = `${ep.name ?? ""}|${ep.ip ?? ""}|${ep.fqdn ?? ""}`.trim();
                const enriched = enrichedMapById.get(ep.id) ?? enrichedMapById.get(String(ep.id)) ?? (fallbackKey ? enrichedMapById.get(fallbackKey) : null);
                const lastSeen = enriched?.lastSeen ?? ep.lastSeen ?? ep.lastSuccessfulScan?.date ?? ep.lastSuccessfulScanDate ?? null;
                const over24h = isLastSeenOver24h(lastSeen);
                const modules = getEndpointModules(ep, enriched);
                const policyName = getEndpointPolicyName(ep, enriched);
                const infected = isEndpointInfected(ep, enriched);
                const endpointState = enriched?.endpointState ?? ep.endpointState;
                const statusLabel = endpointState === 1 || ep.isManaged ? "Active" : "Inactive";
                return <tr key={`${String(ep.id ?? "ep")}-${idx}-${ep.fqdn ?? ep.name ?? ""}`} className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded}`}>
                      <td>
                        <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}>
                          {typeIcon && <Icon icon={typeIcon} width={18} height={18} title={ep.type ?? "Type"} />}
                          {ep.name ?? "-"}
                        </span>
                      </td>
                      <td>{ep.fqdn ?? "-"}</td>
                      <td>
                        <span style={{
                      padding: "0.15rem 0.45rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      backgroundColor: statusLabel === "Active" ? "#d1fae5" : statusLabel === "Inactive" ? "#fee2e2" : "#e5e7eb",
                      color: statusLabel === "Active" ? "#16a34a" : statusLabel === "Inactive" ? "#dc2626" : "#4b5563",
                      fontWeight: 500
                    }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        {ep.isManaged === true ? "Yes" : ep.isManaged === false ? "No" : "-"}
                      </td>
                      <td>{ep.ip ?? "-"}</td>
                      <td>
                        <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}>
                          {osIcon && <Icon icon={osIcon} width={18} height={18} title={ep.operatingSystem ?? "OS"} />}
                          {ep.operatingSystem ?? "-"}
                        </span>
                      </td>
                      <td>
                        {lastSeen ? <div style={{
                      fontSize: "0.75rem"
                    }}>
                            <div style={{
                        color: over24h ? "#dc2626" : "#16a34a",
                        fontWeight: 500,
                        marginBottom: "0.15rem"
                      }}>
                              {over24h ? "> 24h" : "< 24h"}
                            </div>
                            <div style={{
                        color: "#6b7280",
                        fontSize: "0.7rem"
                      }}>
                              {formatLastSeen(lastSeen)}
                            </div>
                          </div> : <span style={{
                      color: "#6b7280",
                      fontSize: "0.75rem"
                    }}>
                            N/A
                          </span>}
                      </td>
                      <td>
                        {modules.length > 0 ? <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.25rem",
                      maxWidth: "140px"
                    }}>
                            {modules.map((m, modIdx) => <span key={`${String(ep.id ?? idx)}-${m.moduleKey}-${modIdx}`} style={{
                        padding: "0.1rem 0.35rem",
                        borderRadius: "4px",
                        fontSize: "0.65rem",
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        fontWeight: 600
                      }} title={m.fullName}>
                                {m.abbr}
                              </span>)}
                          </div> : <span style={{
                      color: "#6b7280",
                      fontSize: "0.75rem"
                    }}>
                            N/A
                          </span>}
                      </td>
                      <td>
                        {policyName ? <span style={{
                      fontSize: "0.8rem",
                      color: "#374151",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "inline-block"
                    }} title={policyName}>
                            {policyName}
                          </span> : <span style={{
                      color: "#6b7280",
                      fontSize: "0.75rem"
                    }}>
                            N/A
                          </span>}
                      </td>
                      <td>
                        <span style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      backgroundColor: infected ? "#fee2e2" : "#d1fae5",
                      color: infected ? "#dc2626" : "#059669",
                      fontWeight: 500
                    }}>
                          {infected ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>;
              })}
              </tbody>
            </table>
            </div>
          </div>
        </section>;
}

const ANTIVIRUS_FALLBACK_NAV = [{
  type: "section",
  key: "policies",
  section: {
    id: "policies",
    icon: "mdi:shield-account-outline",
    label: "Politiques"
  }
}, {
  type: "section",
  key: "endpoints",
  section: {
    id: "endpoints",
    icon: "mdi:monitor",
    label: "Endpoints"
  }
}];

function AntivirusFallbackPanel({
  solution,
  endpointSearch,
  setEndpointSearch,
  endpointSort,
  setEndpointSort
}) {
  const [section, setSection] = useState("endpoints");
  const enrichedEndpointsSource = Array.isArray(solution.syncData?.endpoints?.list) && solution.syncData.endpoints.list || Array.isArray(solution.syncData?.endpoints) && solution.syncData.endpoints || Array.isArray(solution.endpoints) && solution.endpoints || [];
  const policiesList = solution.syncData?.policies || solution.data?.policies || solution.policies || [];
  const hasPolicies = extractPoliciesList(policiesList).length > 0;
  const hasEndpoints = enrichedEndpointsSource.length > 0;
  if (!hasPolicies && !hasEndpoints) return null;
  const navEntries = ANTIVIRUS_FALLBACK_NAV.filter(entry => entry.key === "policies" ? hasPolicies : hasEndpoints);
  const activeSection = navEntries.some(entry => entry.section.id === section) ? section : navEntries[0]?.section.id || "endpoints";
  return <div className={styles.solutionOverviewEmbed}>
      <SolutionDetailPageLayout embedded accent="gravityzone" title={getSolutionName(solution)} titleIcon="simple-icons:bitdefender" navEntries={navEntries} activeSection={activeSection} onSectionChange={setSection} navAriaLabel="Sections">
        <SolutionDetailBlock solution={solution} enrichedEndpoints={enrichedEndpointsSource} policiesList={policiesList} endpointSearch={endpointSearch} setEndpointSearch={setEndpointSearch} endpointSort={endpointSort} setEndpointSort={setEndpointSort} section={activeSection} />
      </SolutionDetailPageLayout>
    </div>;
}

export default function AntivirusStep({
  client,
  onRefreshClient
}) {
  const rawAntivirus = client?.equipements?.Antivirus;
  const [endpointSearch, setEndpointSearch] = useState("");
  const [endpointSort, setEndpointSort] = useState({
    column: null,
    direction: "asc"
  });
  let solutions = [];
  if (Array.isArray(rawAntivirus)) {
    solutions = rawAntivirus;
  } else if (rawAntivirus && Array.isArray(rawAntivirus.solutions)) {
    solutions = rawAntivirus.solutions;
  }
  const antivirusList = solutions.map(sol => normalizeAntivirusItem(normalizeAntivirus(sol)) || normalizeAntivirus(sol));
  const solutionsWithCompany = useMemo(() => antivirusList.filter(s => s.companyId), [antivirusList]);
  const localSolutions = useMemo(() => antivirusList.filter(sol => !sol.companyId), [antivirusList]);
  if (antivirusList.length === 0) {
    return <MonitoringStepShell>
        <div className={styles.antivirusModalNoData}>Aucune solution antivirus configurée.</div>
      </MonitoringStepShell>;
  }
  return <MonitoringStepShell>
      {solutionsWithCompany.map(solution => {
      const item = normalizeAntivirusItem(solution) || solution;
      const companyId = item.companyId;
      return <div key={companyId || getSolutionName(solution)} className={styles.solutionOverviewEmbed}>
            <AntivirusOverviewPanel active embedded client={{
          id: client?.id ?? client?.uuid,
          name: client?.name || client?.nom
        }} antivirusItem={item} onSynced={typeof onRefreshClient === "function" ? onRefreshClient : undefined} />
          </div>;
    })}
      {localSolutions.map(solution => <AntivirusFallbackPanel key={getSolutionName(solution)} solution={solution} endpointSearch={endpointSearch} setEndpointSearch={setEndpointSearch} endpointSort={endpointSort} setEndpointSort={setEndpointSort} />)}
    </MonitoringStepShell>;
}
