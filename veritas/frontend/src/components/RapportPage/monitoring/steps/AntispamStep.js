import React, { useCallback, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend } from "recharts";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../../config";
import { AntispamOverviewPanel } from "../../../EnterprisesPage/AntispamOverviewModal";
import SolutionDetailPageLayout from "../../../EnterprisesPage/SolutionDetailPageLayout";
import { isManualAntispamSolution, normalizeAntispamItem } from "../../../EnterprisesPage/antispamSolutionUtils";
import styles from "../RapportMonitoringBuilder.module.css";
import { MonitoringStepShell, MonitoringStepSubsectionHeader, MonitoringStepToolbarButton } from "../MonitoringStepLayout";
function normalizeAntispam(sol) {
  if (!sol) return sol;
  const name = sol.logiciel || sol.solution || sol.nom || sol.name || "Solution antispam";
  return {
    ...sol,
    nom: name,
    name
  };
}
function getAuthHeaders() {
  return {};
}
function cleanText(text) {
  if (!text) return "";
  return text.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\0/g, "");
}
function cleanString(str) {
  if (!str) return "";
  return String(str).replace(/\0/g, "").trim();
}
function parseCSV(text) {
  const cleaned = cleanText(text);
  const lines = cleaned.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return {
    headers: [],
    rows: []
  };
  const parseLine = line => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === "\"") {
        if (inQuotes && next === "\"") {
          current += "\"";
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ";" && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  };
  const headers = parseLine(lines[0]).map((h, index) => {
    const v = cleanString(h.replace(/^"|"$/g, ""));
    return v || `Column${index + 1}`;
  });
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      const v = cleanString((values[index] || "").replace(/^"|"$/g, ""));
      row[header] = v;
    });
    if (Object.values(row).some(v => String(v || "").trim() !== "")) {
      rows.push(row);
    }
  }
  return {
    headers,
    rows
  };
}
function parseUsersCSV(rows) {
  const getValue = (row, keys) => {
    for (const key of keys) {
      const val = row[key];
      if (val != null && String(val).trim() !== "") return String(val).trim();
    }
    return "";
  };
  return rows.map(row => {
    const aliases = [];
    for (let i = 1; i <= 10; i++) {
      const alias = getValue(row, [`Email Alias ${i}`, `EmailAlias${i}`]);
      if (alias) aliases.push(alias);
    }
    return {
      lastName: getValue(row, ["Last Name", "LastName", "Nom"]),
      firstName: getValue(row, ["First Name", "FirstName", "Prénom"]),
      mainEmail: getValue(row, ["Main Email", "MainEmail", "Email principal"]),
      protectionStatus: getValue(row, ["Protection Status", "ProtectionStatus", "Status"]),
      origin: getValue(row, ["Origin", "Origine"]),
      aliases
    };
  }).filter(u => u.mainEmail);
}
function parseStatsCSV(rows) {
  const toInt = v => {
    const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const getValue = (row, keys) => {
    for (const key of keys) {
      if (row[key] != null && String(row[key]).trim() !== "") return row[key];
    }
    return "";
  };
  return rows.map(row => ({
    period: cleanString(getValue(row, ["Period", "period"])),
    valid: toInt(getValue(row, ["Valid", "valid"])),
    infected: toInt(getValue(row, ["Infected", "infected", "Infecté"])),
    spam: toInt(getValue(row, ["Spam", "spam"])),
    banned: toInt(getValue(row, ["Banned", "banned", "Banni"])),
    spearphishing: toInt(getValue(row, ["Spearphishing", "spearphishing", "Spear phishing"])),
    pending: toInt(getValue(row, ["Pending", "pending", "Pending"])),
    total: toInt(getValue(row, ["Total", "total"]))
  })).filter(s => s.period);
}
export default function AntispamStep(props) {
  const {
    client,
    onRefreshClient
  } = props || {};
  const [isImporting, setIsImporting] = useState(false);
  const [targetSolution, setTargetSolution] = useState(null);
  const [importedDataBySolutionId, setImportedDataBySolutionId] = useState({});
  const [usersSortBySolutionId, setUsersSortBySolutionId] = useState({});
  const [usersSearchBySolutionId, setUsersSearchBySolutionId] = useState({});
  const [manualSectionById, setManualSectionById] = useState({});
  const fileInputRef = useRef(null);
  const rawAntispam = client?.equipements?.Antispam;
  let solutions = [];
  if (Array.isArray(rawAntispam)) {
    solutions = rawAntispam;
  } else if (rawAntispam && Array.isArray(rawAntispam.solutions)) {
    solutions = rawAntispam.solutions;
  }
  const antispamList = solutions.map(sol => normalizeAntispamItem(normalizeAntispam(sol)) || normalizeAntispam(sol));
  const handleImportedDataSave = useCallback(async (solution, file) => {
    if (!solution?.id) {
      toast.error("Cannot import: antispam ID not found.");
      return;
    }
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) {
      toast.error("Client not found.");
      return;
    }
    setIsImporting(true);
    try {
      const text = await file.text();
      const {
        headers,
        rows
      } = parseCSV(text);
      if (!rows.length) {
        toast.error("CSV is empty or invalid.");
        return;
      }
      const normalizedHeaders = headers.map(h => cleanString(h).toLowerCase());
      const isUsersCsv = normalizedHeaders.some(h => h.includes("last name") || h.includes("lastname")) && normalizedHeaders.some(h => h.includes("main email") || h.includes("mainemail"));
      const isStatsCsv = normalizedHeaders.some(h => h.includes("period")) && normalizedHeaders.some(h => h.includes("valid"));
      const baseData = solution?.data && typeof solution.data === "object" ? solution.data : {
        ...solution
      };
      let nextData = baseData;
      if (isUsersCsv) {
        const users = parseUsersCSV(rows);
        const protectedCount = users.length;
        nextData = {
          ...baseData,
          usersData: users,
          utilisateursProteges: protectedCount,
          utilisateurs: protectedCount,
          nombre_utilisateurs: protectedCount
        };
        toast.success(`${users.length} users imported.`);
      } else if (isStatsCsv) {
        const stats = parseStatsCSV(rows);
        nextData = {
          ...baseData,
          statsData: stats
        };
        toast.success(`${stats.length} periods imported.`);
      } else {
        toast.error("Unrecognized CSV type (users or stats).");
        return;
      }
      const response = await fetch(`${API_BASE_URL}/clients/modules/${clientId}/antispam/${solution.id}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          item_key: solution.item_key || solution.nom || solution.logiciel || "antispam",
          name: solution.name || solution.nom || solution.logiciel || "Antispam",
          data: nextData,
          is_active: solution.is_active !== false
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Error saving the import.");
      }
      setImportedDataBySolutionId(prev => ({
        ...prev,
        [solution.id]: nextData
      }));
      if (typeof onRefreshClient === "function") {
        await onRefreshClient();
      }
    } catch (error) {
      console.error("Import antispam:", error);
      toast.error(error?.message || "Error during CSV import.");
    } finally {
      setIsImporting(false);
      setTargetSolution(null);
    }
  }, [client?.id, client?.uuid, onRefreshClient]);
  const openImportForSolution = useCallback(solution => {
    setTargetSolution(solution);
    fileInputRef.current?.click();
  }, []);
  const handleFileSelect = useCallback(async e => {
    const file = e.target.files?.[0];
    if (!file || !targetSolution) return;
    await handleImportedDataSave(targetSolution, file);
    e.target.value = "";
  }, [targetSolution, handleImportedDataSave]);
  const getSolutionData = useCallback(solution => importedDataBySolutionId[solution?.id] || solution?.data || solution || {}, [importedDataBySolutionId]);
  const linkedSolutions = antispamList.filter(sol => {
    const item = normalizeAntispamItem(sol) || sol;
    return Boolean(item?.customerId) && !isManualAntispamSolution(item);
  });
  const manualSolutions = antispamList.filter(sol => {
    const item = normalizeAntispamItem(sol) || sol;
    return !item?.customerId || isManualAntispamSolution(item);
  });
  if (antispamList.length === 0) {
    return <MonitoringStepShell>
        <div className={styles.antivirusModalNoData}>Aucune solution antispam configurée.</div>
      </MonitoringStepShell>;
  }
  return <MonitoringStepShell>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileSelect} style={{
      display: "none"
    }} />

      {linkedSolutions.map(solution => {
      const item = normalizeAntispamItem(solution) || solution;
      return <div key={String(item.customerId)} className={styles.solutionOverviewEmbed}>
            <AntispamOverviewPanel active embedded client={{
          id: client?.id ?? client?.uuid,
          name: client?.name || client?.nom
        }} antispamItem={item} onSynced={typeof onRefreshClient === "function" ? onRefreshClient : undefined} />
          </div>;
    })}

      {manualSolutions.map(solution => {
      const item = normalizeAntispamItem(solution) || solution;
      const solutionKey = String(solution.id || solution.item_key || solution.nom || "antispam");
      const solutionData = getSolutionData(solution);
      const usersData = Array.isArray(solutionData?.usersData) ? solutionData.usersData : [];
      const statsData = Array.isArray(solutionData?.statsData) ? solutionData.statsData : [];
      const usersSort = usersSortBySolutionId[solutionKey] || {
        column: null,
        direction: "asc"
      };
      const usersSearch = usersSearchBySolutionId[solutionKey] || "";
      const filteredUsers = (() => {
        const q = usersSearch.trim().toLowerCase();
        if (!q) return usersData;
        return usersData.filter(u => {
          const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
          const email = String(u.mainEmail || "").toLowerCase();
          const status = String(u.protectionStatus || "").toLowerCase();
          const aliases = Array.isArray(u.aliases) ? u.aliases.join(" ").toLowerCase() : "";
          return name.includes(q) || email.includes(q) || status.includes(q) || aliases.includes(q);
        });
      })();
      const sortedUsers = (() => {
        if (!usersSort.column) return filteredUsers;
        const getValue = u => {
          switch (usersSort.column) {
            case "name":
              return `${u.firstName || ""} ${u.lastName || ""}`.trim().toLowerCase();
            case "email":
              return String(u.mainEmail || "").toLowerCase();
            case "status":
              return String(u.protectionStatus || "").toLowerCase();
            case "aliases":
              return Array.isArray(u.aliases) ? u.aliases.length : 0;
            default:
              return "";
          }
        };
        return [...filteredUsers].sort((a, b) => {
          const va = getValue(a);
          const vb = getValue(b);
          if (typeof va === "number" && typeof vb === "number") {
            return usersSort.direction === "asc" ? va - vb : vb - va;
          }
          const cmp = String(va).localeCompare(String(vb), "fr");
          return usersSort.direction === "asc" ? cmp : -cmp;
        });
      })();
      const navEntries = [{
        type: "section",
        key: "users",
        section: {
          id: "users",
          icon: "mdi:account-group-outline",
          label: "Utilisateurs"
        }
      }, {
        type: "section",
        key: "stats",
        section: {
          id: "stats",
          icon: "mdi:chart-line",
          label: "Statistiques"
        }
      }];
      const section = navEntries.some(entry => entry.section.id === manualSectionById[solutionKey]) ? manualSectionById[solutionKey] : navEntries[0]?.section.id || "users";
      return <div key={`imports-${solutionKey}`} className={styles.solutionOverviewEmbed}>
            <SolutionDetailPageLayout embedded accent="mailinblack" title={item.nom || item.logiciel || "Antispam"} titleIcon="mdi:email-secure-outline" navEntries={navEntries} activeSection={section} onSectionChange={next => setManualSectionById(prev => ({
          ...prev,
          [solutionKey]: next
        }))} navAriaLabel="Sections" extraActions={<MonitoringStepToolbarButton icon={isImporting ? "mdi:loading" : "mdi:upload"} label="Importer un CSV" onClick={() => openImportForSolution(solution)} title="Importer un fichier CSV Antispam" disabled={isImporting} />}>
            {section === "users" ? usersData.length > 0 ? <div>
                <MonitoringStepSubsectionHeader title={`Users (${sortedUsers.length}${usersData.length !== sortedUsers.length ? ` / ${usersData.length}` : ""})`} searchValue={usersSearch} onSearchChange={value => setUsersSearchBySolutionId(prev => ({
            ...prev,
            [solutionKey]: value
          }))} onSearchClear={() => setUsersSearchBySolutionId(prev => ({
            ...prev,
            [solutionKey]: ""
          }))} searchPlaceholder="Search (name, email, status, alias)..." />
                <div className={styles.antivirusModalEndpointsScroll}>
                  <table className={styles.antivirusModalTable}>
                    <thead>
                      <tr>
                        {[{
                    key: "name",
                    label: "Name"
                  }, {
                    key: "email",
                    label: "Email principal"
                  }, {
                    key: "status",
                    label: "Status"
                  }, {
                    key: "aliases",
                    label: "Alias"
                  }].map(({
                    key,
                    label
                  }) => <th key={key} className={`${styles.antivirusStickyTh} ${styles.antivirusModalThSortable}`} onClick={() => setUsersSortBySolutionId(prev => ({
                    ...prev,
                    [solutionKey]: {
                      column: key,
                      direction: prev[solutionKey]?.column === key && prev[solutionKey]?.direction === "asc" ? "desc" : "asc"
                    }
                  }))} title={`Trier par ${label}`}>
                            <span>{label}</span>
                            {usersSort.column === key && <Icon icon={usersSort.direction === "asc" ? "mdi:chevron-up" : "mdi:chevron-down"} width={16} height={16} className={styles.antivirusModalSortIcon} />}
                          </th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((u, idx) => <tr key={`${u.mainEmail || idx}`}>
                          <td>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || "-"}</td>
                          <td>{u.mainEmail || "-"}</td>
                          <td>{u.protectionStatus || "-"}</td>
                          <td>{Array.isArray(u.aliases) ? u.aliases.length : 0}</td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </div> : <div className={styles.antivirusModalNoData}>Aucun utilisateur importé. Importez un CSV pour afficher la liste.</div> : null}

            {section === "stats" ? statsData.length > 0 ? <div>
                    <div style={{
              background: "#ffffff",
              borderRadius: 10,
              border: "1px solid var(--border-primary, #e5e7eb)",
              padding: "0.75rem 1rem",
              height: 280
            }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={statsData.map(s => ({
                  periode: s.period || "",
                  valides: s.valid ?? 0,
                  infectes: s.infected ?? 0,
                  spam: s.spam ?? 0,
                  bannis: s.banned ?? 0,
                  total: s.total ?? 0
                }))} margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0
                }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="periode" tick={{
                    fontSize: 11
                  }} />
                          <YAxis tick={{
                    fontSize: 11
                  }} />
                          <RechartsTooltip contentStyle={{
                    fontSize: 12
                  }} formatter={value => typeof value === "number" ? value.toLocaleString() : value} />
                          <RechartsLegend wrapperStyle={{
                    fontSize: 11
                  }} />
                          <Line type="monotone" dataKey="total" name="Total" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="valides" name="Valides" stroke="#22c55e" strokeWidth={1.8} dot={false} />
                          <Line type="monotone" dataKey="spam" name="Spam" stroke="#f97316" strokeWidth={1.8} dot={false} />
                          <Line type="monotone" dataKey="infectes" name="Infected" stroke="#ef4444" strokeWidth={1.8} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
              </div> : <div className={styles.antivirusModalNoData}>Aucune statistique importée. Importez un CSV pour afficher le graphique.</div> : null}
          </SolutionDetailPageLayout>
          </div>;
    })}
    </MonitoringStepShell>;
}
