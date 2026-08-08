import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend } from "recharts";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../../config";
import { getIconPath } from "../../../../utils/assetHelper";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import AntispamSolutionModal from "../../../CybersecuritePage/AntispamSolutionModal";
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
function formatExpiration(sol) {
  const raw = sol.expiration ?? sol.expirityDate ?? null;
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? `${raw}` : d.toLocaleDateString("en-US");
  } catch {
    return `${raw}`;
  }
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
    onRefreshClient,
    onOpenComments,
    onTicketCreatedForEquipment,
    commentCounts = {},
    ticketCounts = {},
    highlightedEquipmentKey,
    reportPeriod
  } = props || {};
  const [isImporting, setIsImporting] = useState(false);
  const [targetSolution, setTargetSolution] = useState(null);
  const [editAntispamModal, setEditAntispamModal] = useState({
    open: false,
    solution: null
  });
  const [importedDataBySolutionId, setImportedDataBySolutionId] = useState({});
  const [usersSortBySolutionId, setUsersSortBySolutionId] = useState({});
  const [statsSortBySolutionId, setStatsSortBySolutionId] = useState({});
  const [usersSearchBySolutionId, setUsersSearchBySolutionId] = useState({});
  const fileInputRef = useRef(null);
  const helpPopoverRef = useRef(null);
  const [helpPopoverOpen, setHelpPopoverOpen] = useState(false);
  const rawAntispam = client?.equipements?.Antispam;
  let solutions = [];
  if (Array.isArray(rawAntispam)) {
    solutions = rawAntispam;
  } else if (rawAntispam && Array.isArray(rawAntispam.solutions)) {
    solutions = rawAntispam.solutions;
  }
  const antispamList = solutions.map(normalizeAntispam);
  useEffect(() => {
    if (!helpPopoverOpen) return;
    const onPointerDown = e => {
      if (helpPopoverRef.current && !helpPopoverRef.current.contains(e.target)) {
        setHelpPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [helpPopoverOpen]);
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
  const columns = [{
    id: "solution",
    label: "Solution",
    render: sol => <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem"
    }}>
          <img src={getIconPath("mailinblack.png")} alt="Mail In Black" style={{
        width: 18,
        height: 18,
        objectFit: "contain",
        borderRadius: 4
      }} />
          {sol.nom || sol.logiciel || sol.solution || "-"}
        </span>
  }, {
    id: "company",
    label: "Company",
    render: () => client?.name || client?.nom || "-"
  }, {
    id: "utilisateurs",
    label: "Protected users",
    render: sol => sol.utilisateursProteges ?? sol.utilisateurs ?? sol.nombre_utilisateurs ?? "-"
  }, {
    id: "domaines",
    label: "Monitored domains",
    render: sol => {
      const raw = sol.domainesSurveilles ?? sol.domaines ?? sol.licences ?? sol.nombre_licences;
      return raw ?? "-";
    }
  }, {
    id: "expiration",
    label: "Expiration",
    render: sol => formatExpiration(sol)
  }];
  const getSolutionData = useCallback(solution => importedDataBySolutionId[solution?.id] || solution?.data || solution || {}, [importedDataBySolutionId]);
  return <>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileSelect} style={{
      display: "none"
    }} />
      <InfrastructureEquipmentTable title="Antispam" moduleKey="Antispam" equipments={antispamList} columns={columns} onOpenComments={typeof onOpenComments === "function" ? onOpenComments : undefined} onCreateTicket={typeof onTicketCreatedForEquipment === "function" ? onTicketCreatedForEquipment : undefined} onEditEquipment={item => setEditAntispamModal({
      open: true,
      solution: item
    })} clientId={client?.id ?? client?.uuid} commentCounts={commentCounts} ticketCounts={ticketCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} headerActions={<>
            <MonitoringStepToolbarButton icon="mdi:upload" label="Import a CSV" onClick={() => {
        if (antispamList.length === 1) {
          openImportForSolution(antispamList[0]);
        } else if (antispamList.length > 1) {
          toast.info("Select a solution in the table, then use the import icon in the Actions column.");
        } else {
          toast.info("No Antispam solution configured for this client.");
        }
      }} title="Import un fichier CSV Antispam" />
            <div className={styles.firewallHelpWrap} ref={helpPopoverRef}>
              <button type="button" className={styles.infraIconButton} aria-expanded={helpPopoverOpen} aria-haspopup="dialog" title="Aide export CSV Mail In Black" onClick={e => {
          e.stopPropagation();
          setHelpPopoverOpen(v => !v);
        }}>
                <Icon icon="mdi:help-circle-outline" />
              </button>
              {helpPopoverOpen ? <div className={styles.firewallHelpPopover} role="dialog" aria-label="Export CSV from Mail In Black">
                  <p className={styles.firewallHelpPopoverTitle}>Export CSV (Mail In Black)</p>
                  <ol className={styles.firewallHelpPopoverList}>
                    <li>Connectez-vous au portail d&apos;administration.</li>
                    <li>Go to the Reports / Statistics or Users menu.</li>
                    <li>Filter the desired period and/or domain.</li>
                    <li>Use the CSV export button (Export / Download).</li>
                    <li>Importez ensuite le fichier ici dans Veritas.</li>
                  </ol>
                </div> : null}
            </div>
          </>} renderExtraActions={null} externalLink={{
      url: "https://partner.mailinblack.com/login",
      title: "Open Mail In Black"
    }} />

      {editAntispamModal.open && editAntispamModal.solution && client && <AntispamSolutionModal mode="edit" client={client} initialSolution={editAntispamModal.solution} onClose={() => setEditAntispamModal({
      open: false,
      solution: null
    })} onSaved={() => {
      if (typeof onRefreshClient === "function") onRefreshClient();
      setEditAntispamModal({
        open: false,
        solution: null
      });
    }} />}

      {antispamList.map(solution => {
      const solutionKey = String(solution.id || solution.item_key || solution.nom || "antispam");
      const solutionData = getSolutionData(solution);
      const usersData = Array.isArray(solutionData?.usersData) ? solutionData.usersData : [];
      const statsData = Array.isArray(solutionData?.statsData) ? solutionData.statsData : [];
      if (usersData.length === 0 && statsData.length === 0) return null;
      const usersSort = usersSortBySolutionId[solutionKey] || {
        column: null,
        direction: "asc"
      };
      const statsSort = statsSortBySolutionId[solutionKey] || {
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
      const sortedStats = (() => {
        if (!statsSort.column) return statsData;
        const getValue = s => {
          switch (statsSort.column) {
            case "period":
              return String(s.period || "").toLowerCase();
            case "valid":
              return Number(s.valid || 0);
            case "infected":
              return Number(s.infected || 0);
            case "spam":
              return Number(s.spam || 0);
            case "banned":
              return Number(s.banned || 0);
            case "spearphishing":
              return Number(s.spearphishing || 0);
            case "pending":
              return Number(s.pending || 0);
            case "total":
              return Number(s.total || 0);
            default:
              return "";
          }
        };
        return [...statsData].sort((a, b) => {
          const va = getValue(a);
          const vb = getValue(b);
          if (typeof va === "number" && typeof vb === "number") {
            return statsSort.direction === "asc" ? va - vb : vb - va;
          }
          const cmp = String(va).localeCompare(String(vb), "fr");
          return statsSort.direction === "asc" ? cmp : -cmp;
        });
      })();
      const aggregatedStats = statsData.reduce((acc, s) => ({
        valid: acc.valid + (s.valid ?? 0),
        infected: acc.infected + (s.infected ?? 0),
        spam: acc.spam + (s.spam ?? 0),
        banned: acc.banned + (s.banned ?? 0),
        spearphishing: acc.spearphishing + (s.spearphishing ?? 0),
        pending: acc.pending + (s.pending ?? 0),
        total: acc.total + (s.total ?? 0)
      }), {
        valid: 0,
        infected: 0,
        spam: 0,
        banned: 0,
        spearphishing: 0,
        pending: 0,
        total: 0
      });
      return <MonitoringStepShell key={`imports-${solutionKey}`} className={styles.antivirusSolutionSections}>
            {usersData.length > 0 && <div style={{
          marginBottom: "1rem"
        }}>
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
              </div>}

            {statsData.length > 0 && <div style={{
          marginBottom: "1rem"
        }}>
                <h5 className={styles.stepSectionTitle}>
                  Statistics ({statsData.length} periods)
                </h5>

                <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "stretch",
            marginTop: "0.5rem",
            marginBottom: "1rem"
          }}>
                  {[{
              icon: "mdi:email",
              label: "Total emails",
              value: aggregatedStats.total
            }, {
              icon: "mdi:check-circle",
              label: "Emails valides",
              value: aggregatedStats.valid
            }, {
              icon: "mdi:email-alert",
              label: "Spam",
              value: aggregatedStats.spam
            }, {
              icon: "mdi:shield-lock",
              label: "Blocked (banned)",
              value: aggregatedStats.banned
            }, {
              icon: "mdi:target-account",
              label: "Spearphishing",
              value: aggregatedStats.spearphishing
            }, {
              icon: "mdi:timer-sand",
              label: "Pending",
              value: aggregatedStats.pending
            }].map((card, idx) => <div key={idx} style={{
              flex: "1 1 220px",
              minWidth: 0,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "#ffffff"
            }}>
                      <div style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f3f4f6",
                color: "#4b5563",
                flexShrink: 0
              }}>
                        <Icon icon={card.icon} width={18} height={18} />
                      </div>
                      <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
                minWidth: 0
              }}>
                        <div style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#111827"
                }}>
                          {typeof card.value === "number" ? card.value.toLocaleString() : "N/A"}
                        </div>
                        <div style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#6b7280"
                }}>
                          {card.label}
                        </div>
                      </div>
                    </div>)}
                </div>

                {sortedStats.length > 0 && <div style={{
            marginTop: "0.5rem"
          }}>
                    <h5 className={styles.antivirusModalSubtitle}>
                      Trend by period
                    </h5>
                    <div style={{
              background: "#ffffff",
              borderRadius: 10,
              border: "1px solid var(--border-primary, #e5e7eb)",
              padding: "0.75rem 1rem",
              height: 280
            }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sortedStats.map(s => ({
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
                  </div>}
              </div>}
          </MonitoringStepShell>;
    })}
    </>;
}
