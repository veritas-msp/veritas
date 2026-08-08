import React, { useMemo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import Icon from "@mdi/react";
import { IoServerSharp } from "react-icons/io5";
import { FaEthernet } from "react-icons/fa";
import { mdiWifiMarker } from "@mdi/js";
import styles from "./ReportSummaryInfrastructure.module.css";
import { REPORT_INFRA_MODULES, sumEquipmentCountsForModules } from "./reportCategoryCounts";
const HEALTH_COLORS = {
  ok: "#10b981",
  warn: "#f59e0b",
  critical: "#ef4444",
  unsynced: "#9ca3af"
};
const HEALTH_LABELS = {
  ok: "Sain",
  warn: "A surveiller",
  critical: "Critical",
  unsynced: "Not synchronized"
};
function formatDateFr(value) {
  if (!value) return "-";
  try {
    const iso = String(value).trim();
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(value);
  }
}
function scrollToReportComments() {
  if (typeof document === "undefined") return;
  const commentsSection = document.querySelector('[data-export-comments="true"]');
  if (!commentsSection || typeof commentsSection.scrollIntoView !== "function") return;
  commentsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
function computeHealth(raw = null) {
  if (!raw) {
    return {
      status: "unsynced",
      label: HEALTH_LABELS.unsynced,
      color: HEALTH_COLORS.unsynced,
      servicesCount: 0,
      eventsCount: 0,
      availabilityUp: null
    };
  }
  const services = Array.isArray(raw.services) ? raw.services : [];
  const events = Array.isArray(raw.events) ? raw.events : [];
  const availability = raw.availability || raw.availabilityData || {};
  const up = typeof availability.up === "number" ? availability.up : null;
  const eventsCount = events.length;
  let status = "ok";
  if (up == null && eventsCount === 0 && services.length === 0) {
    status = "unsynced";
  } else if (up != null && up < 95 || eventsCount >= 5) {
    status = "critical";
  } else if (up != null && up < 99 || eventsCount > 0) {
    status = "warn";
  }
  return {
    status,
    label: HEALTH_LABELS[status] || status,
    color: HEALTH_COLORS[status] || HEALTH_COLORS.unsynced,
    servicesCount: services.length,
    eventsCount,
    availabilityUp: up
  };
}
function normalizeEquipments(list, typeKey, equipmentCheckMKData = {}) {
  if (!Array.isArray(list)) return [];
  return list.map((item, index) => {
    const id = item.id != null ? String(item.id) : `${typeKey}-${index}`;
    const name = item.nom || item.name || `${typeKey} sans nom`;
    const site = item.site || "Sans site";
    const ip = item.ip || item.fqdn || item.ipNonFixe || item.ip_wan || item.ip_lan || "-";
    const rawHealth = equipmentCheckMKData[id] || null;
    const health = computeHealth(rawHealth);
    return {
      id,
      typeKey,
      name,
      site,
      ip,
      health,
      raw: item
    };
  });
}
function groupBySite(equipments) {
  return equipments.reduce((acc, eq) => {
    const site = eq.site || "Sans site";
    if (!acc[site]) acc[site] = [];
    acc[site].push(eq);
    return acc;
  }, {});
}
function getConnectionIcon(raw = {}) {
  const t = ((raw.type || raw.categorie || "") + "").toLowerCase();
  if (t.includes("fibre") || t.includes("fiber")) {
    return "streamline-ultimate:fiber-access-1";
  }
  if (t.includes("5g")) {
    return "material-symbols:5g-mobiledata-badge";
  }
  if (t.includes("4g") || t.includes("lte")) {
    return "material-symbols:4g-mobiledata-badge";
  }
  if (t.includes("adsl") || t.includes("dsl") || t.includes("câble") || t.includes("cable")) {
    return "mdi:ethernet-cable";
  }
  if (t.includes("sat") || t.includes("satellite")) {
    return "tabler:satellite";
  }
  if (t.includes("liaison")) {
    return "mdi:lan";
  }
  return "mdi:router-wireless";
}
function getConnectionOperator(raw = {}) {
  return raw.operateurInternet || raw.operateur || raw.fournisseur || raw.provider || null;
}
function getOperatorIcon(operatorRaw = "") {
  const op = (operatorRaw || "").toLowerCase();
  if (!op) return "carbon:kubernetes-operator";
  if (op.includes("orange")) return "simple-icons:orange";
  if (op.includes("sfr")) return "carbon:kubernetes-operator";
  if (op.includes("free")) return "simple-icons:free";
  if (op.includes("bouygues")) return "simple-icons:bouyguestelecom";
  if (op.includes("ovh")) return "simple-icons:ovh";
  if (op.includes("numericable")) return "simple-icons:numericable";
  if (op.includes("sosh")) return "simple-icons:sosh";
  return "carbon:kubernetes-operator";
}
function getOsIcon(raw = {}) {
  const osRaw = (raw.systeme || raw.os || "").toLowerCase();
  if (!osRaw) return null;
  if (osRaw.includes("windows")) return "mdi:microsoft-windows";
  if (osRaw.includes("debian")) return "logos:debian";
  if (osRaw.includes("ubuntu")) return "logos:ubuntu";
  if (osRaw.includes("centos")) return "logos:centos";
  if (osRaw.includes("red hat") || osRaw.includes("rhel")) return "logos:redhat-icon";
  if (osRaw.includes("suse")) return "logos:suse";
  if (osRaw.includes("proxmox")) return "logos:proxmox";
  if (osRaw.includes("esxi") || osRaw.includes("vmware")) return "logos:vmware";
  if (osRaw.includes("linux")) return "logos:linux-tux";
  return "mdi:server";
}
function getServerIcon(raw = {}) {
  const typeRaw = (raw.type || "").toLowerCase();
  if (typeRaw === "virtuel") {
    return "fa-solid:cube";
  }
  if (typeRaw === "physique") {
    return "fa-solid:server";
  }
  return "fa-solid:server";
}
function getServerRolesList(roles) {
  if (Array.isArray(roles)) {
    return roles.map(role => role == null ? "" : String(role).trim()).filter(Boolean);
  }
  if (typeof roles === "string" && roles.trim()) {
    return roles.split(/[;,]+/).map(role => role.trim()).filter(Boolean);
  }
  return [];
}
function abbreviateServerRole(roleRaw = "") {
  const role = String(roleRaw || "").trim();
  if (!role) return "";
  const normalized = role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const roleMap = {
    "active directory": "AD",
    "controleur de domaine": "AD",
    "controleur domaine": "AD",
    "domain controller": "AD",
    application: "APP",
    "serveur application": "APP",
    "applicatif metier": "APP",
    sql: "SQL",
    "serveur sql": "SQL",
    "base de donnees": "DB",
    "base de donnee": "DB",
    database: "DB",
    "serveur de fichiers": "FICHIERS",
    fichiers: "FICHIERS",
    file: "FICHIERS",
    print: "PRINT",
    impression: "PRINT",
    backup: "BACKUP",
    sauvegarde: "BACKUP",
    "bureau a distance": "RDS",
    "remote desktop": "RDS",
    rds: "RDS",
    web: "WEB",
    "serveur web": "WEB",
    proxy: "PROXY"
  };
  if (roleMap[normalized]) return roleMap[normalized];
  return role.toUpperCase().slice(0, 8);
}
function normalizeStorageRoleLabel(roleRaw = "") {
  const role = String(roleRaw || "").trim();
  if (!role) return "";
  const normalized = role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("partag")) return "Partage";
  if (normalized.includes("fichier")) return "File";
  if (normalized.includes("principal") || normalized.includes("primaire") || normalized.includes("primary")) {
    return "Principal";
  }
  if (normalized.includes("backup") || normalized.includes("secours") || normalized.includes("secondaire")) {
    return "Secondaire";
  }
  if (normalized.includes("sauvegarde") || normalized.includes("backup")) return "Backup";
  if (normalized.includes("archive")) return "Archive";
  if (normalized.includes("nas")) return "NAS";
  if (normalized.includes("san")) return "SAN";
  const clean = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  return clean;
}
function getStorageRolesList(raw = {}, data = {}) {
  const candidates = [raw.role, data.role, raw.roles, data.roles, raw.categorie, data.categorie, raw.type, data.type, raw.fonction, data.fonction];
  const extracted = [];
  candidates.forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v != null && String(v).trim()) extracted.push(String(v).trim());
      });
      return;
    }
    if (typeof value === "string" && value.trim()) {
      value.split(/[;,/|]+/).map(s => s.trim()).filter(Boolean).forEach(s => extracted.push(s));
    }
  });
  const labels = extracted.map(r => normalizeStorageRoleLabel(r)).filter(Boolean);
  return Array.from(new Set(labels));
}
function getServerDisplayOrder(raw = {}) {
  const typeRaw = String(raw.type || "").toLowerCase();
  if (typeRaw === "physique" || typeRaw === "physical") return 0;
  if (typeRaw === "virtuel" || typeRaw === "virtual") return 1;
  return 2;
}
function getSerialNumber(raw = {}) {
  const serial = raw.numeroSerie || raw.serialNumber || raw.serial || raw.sn || raw.noSerie || null;
  if (serial == null) return null;
  const text = String(serial).trim();
  return text || null;
}
function getEquipmentKey(rawItem = {}, typeKey) {
  const name = rawItem.nom || rawItem.name || rawItem.solution || rawItem.logiciel || "";
  const base = rawItem.commentKey || rawItem.id || rawItem.uuid || rawItem.glpi_id || (typeKey && name ? `${typeKey}:${name}` : name);
  return base != null ? String(base) : "";
}
function getStorageDiskStates(raw = {}) {
  const source = raw.data && typeof raw.data === "object" ? raw.data : raw;
  const max = parseInt(source.nbDisquesMax ?? source.disquesMax ?? source.nbDisquesTotal ?? source.nbDisquesActuels ?? (Array.isArray(source.disques) ? source.disques.length : 0), 10) || 0;
  if (!max || max <= 0) return [];
  let states = source.etatDisques;
  if (!Array.isArray(states)) {
    if (typeof states === "string" && states.trim()) {
      states = states.split(/[;,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    } else {
      states = [];
    }
  }
  const usedCount = parseInt(source.nbDisquesActuels ?? (Array.isArray(source.disques) ? source.disques.length : 0), 10) || 0;
  const normalized = [];
  for (let i = 0; i < max; i += 1) {
    if (i < usedCount) {
      normalized.push(states[i] || "ok");
    } else {
      normalized.push("unused");
    }
  }
  return normalized;
}
function parseDateSafe(value) {
  if (!value) return null;
  const d = new Date(String(value).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}
function isWarrantyExpired(value) {
  const d = parseDateSafe(value);
  if (!d) return false;
  const today = new Date();
  const nowDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const warrantyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return warrantyDate < nowDate;
}
function getWarrantyDateColor(value) {
  const d = parseDateSafe(value);
  if (!d) return null;
  const today = new Date();
  const nowDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const warrantyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const msInDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((warrantyDate - nowDate) / msInDay);
  if (diffDays < 0) return "#ef4444";
  if (diffDays <= 60) return "#f97316";
  return null;
}
function getWarrantyEntries(raw = {}) {
  const entries = [];
  const pushEntry = (nameRaw, dateRaw) => {
    const name = nameRaw != null ? String(nameRaw).trim() : "";
    const dateLabel = formatDateFr(dateRaw);
    if (!name && dateLabel === "-") return;
    if (name && dateLabel !== "-") {
      entries.push({
        name,
        dateLabel,
        dateRaw
      });
      return;
    }
    entries.push({
      name: name || null,
      dateLabel: dateLabel !== "-" ? dateLabel : null,
      dateRaw
    });
  };
  const list = raw.licences || raw.licenses || raw.garanties || raw.garantieList || raw.warranties || null;
  if (Array.isArray(list)) {
    list.forEach(item => {
      if (typeof item === "string") {
        pushEntry(item, null);
        return;
      }
      if (item && typeof item === "object") {
        pushEntry(item.nom || item.name || item.libelle || item.label || item.type || item.garantie, item.expirationGarantie || item.expiration || item.dateFin || item.endDate);
      }
    });
  }
  const namesRaw = raw.garantieNoms || raw.garantiesNoms || raw.nomsGarantie || raw.nomGarantie || raw.garantieNom || null;
  if (Array.isArray(namesRaw)) {
    namesRaw.forEach(n => pushEntry(n, null));
  } else if (typeof namesRaw === "string" && namesRaw.trim()) {
    namesRaw.split(/[;,]+/).map(s => s.trim()).filter(Boolean).forEach(n => pushEntry(n, null));
  }
  const uniqueMap = new Map();
  entries.forEach(entry => {
    const key = `${entry.name || ""}|${entry.dateLabel || ""}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, entry);
  });
  return Array.from(uniqueMap.values());
}
function NotificationLegend({
  commentTotal = 0,
  ticketTotal = 0
}) {
  return <div className={styles.notificationLegend}>
      <span className={styles.notificationLegendText}>
        Notification badges:
      </span>
      <span className={styles.notificationLegendItem}>
        <span className={`${styles.notificationDot} ${styles.notificationDotComment}`}>
          {commentTotal}
        </span>
        Comments
      </span>
      <span className={styles.notificationLegendItem}>
        <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`}>
          {ticketTotal}
        </span>
        Tickets created
      </span>
    </div>;
}
function InfraTopologySection({
  internet = [],
  firewalls = []
}) {
  const internetWithRole = internet.map((conn, index) => {
    const raw = conn.raw || {};
    const category = (raw.categorie || "").toLowerCase();
    const isPrimary = category.includes("principal") || category.includes("primaire") || category.includes("primary") || index === 0;
    const isBackup = category.includes("backup") || category.includes("secours") || category.includes("secondaire");
    return {
      ...conn,
      role: isPrimary ? "primaire" : isBackup ? "backup" : null
    };
  });
  const firewallsWithFlags = firewalls.map(fw => {
    const raw = fw.raw || {};
    const roleHA = (raw.roleHA || "").toLowerCase();
    const isHA = roleHA.includes("ha") || roleHA.includes("actif/passif") || roleHA.includes("cluster");
    const isPrimary = roleHA.includes("primaire") || roleHA.includes("master");
    const isSecondary = roleHA.includes("secondaire") || roleHA.includes("esclave") || roleHA.includes("slave");
    return {
      ...fw,
      roleHA: raw.roleHA || null,
      flags: {
        isHA,
        isPrimary,
        isSecondary
      }
    };
  });
  if (!internetWithRole.length && !firewallsWithFlags.length) return null;
  const sites = Array.from(new Set([...internetWithRole, ...firewallsWithFlags].map(e => e.site || "Sans site")));
  const bySiteInternet = groupBySite(internetWithRole);
  const bySiteFirewalls = groupBySite(firewallsWithFlags);
  return <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrapper}>
          <span className={styles.sectionIcon}>
            <IconifyIcon icon="mdi:web" width={34} height={34} color="#0ea5e9" />
          </span>
          <div>
            <h4 className={styles.sectionTitle}>
              Login internet et protection des pare-feu physiques
            </h4>
            <div className={styles.sectionSubtitle}>
              Event listing and availability rate
            </div>
          </div>
        </div>
      </div>
      <div className={styles.sectionTitleSeparator} />

      <div className={styles.topologyRoot}>
        <div className={styles.topologySitesRow}>
          {sites.map(site => {
          const siteInternet = bySiteInternet[site] || [];
          const siteFirewalls = bySiteFirewalls[site] || [];
          return <div key={site} className={styles.topologySiteColumn}>
                <div className={styles.topologySiteHeader}>
                  <span className={styles.topologySiteIcon}>
                    <IconifyIcon icon="mdi:office-building-outline" width={16} height={16} />
                  </span>
                  <span>{site}</span>
                </div>

                {}
                {!!siteInternet.length && <div className={styles.topologyLinksRow}>
                    {siteInternet.map(conn => {
                const raw = conn.raw || {};
                const icon = getConnectionIcon(raw);
                const operator = getConnectionOperator(raw);
                const isPrimary = conn.role === "primaire";
                const roleTitle = isPrimary ? "Login primaire" : "Login backup";
                const connectionInfoLine = [operator || null, raw.debit || null, conn.ip && conn.ip !== "-" ? conn.ip : null].filter(Boolean).join(" - ");
                return <div key={conn.id} className={`${styles.topologyLinkChip} ${conn.role === "primaire" ? styles.topologyLinkPrimary : conn.role === "backup" ? styles.topologyLinkBackup : ""}`} title={conn.name}>
                          {conn.activity && (conn.activity.hasComment || conn.activity.hasTicket) && <div className={styles.notificationIconContainer} role="button" tabIndex={0} onClick={scrollToReportComments} onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      scrollToReportComments();
                    }
                  }} title="Go to report comments">
                                {conn.activity.hasComment && <span className={`${styles.notificationDot} ${styles.notificationDotComment}`} title="Comments for this link">
                                    {conn.activity.commentCount}
                                  </span>}
                                {conn.activity.hasTicket && <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`} title="Ticket pour ce lien">
                                    {conn.activity.ticketCount}
                                  </span>}
                              </div>}
                          <div className={styles.topologyLinkText}>
                            <div className={styles.topologyLinkHeaderRow}>
                              <span className={styles.topologyLinkTypeIcon}>
                                <IconifyIcon icon={icon} width={20} height={20} />
                              </span>
                              <span className={styles.topologyLinkName}>
                                {raw.type || conn.name}
                              </span>
                            </div>
                            {connectionInfoLine && <span className={styles.topologyLinkIp}>
                                {connectionInfoLine}
                              </span>}
                            {conn.role && <span className={styles.topologyLinkRoleText} title={roleTitle}>
                                {isPrimary ? "Login primaire" : "Login backup"}
                              </span>}
                          </div>
                        </div>;
              })}
                  </div>}

                {}
                {!!siteFirewalls.length && <div className={styles.topologyFirewallsRow}>
                    {siteFirewalls.map(fw => {
                const rawFw = fw.raw || {};
                const firewallSerialLabel = getSerialNumber(rawFw);
                const warrantyRaw = rawFw.expirationGarantie || rawFw.garantie;
                const warrantyLabel = formatDateFr(warrantyRaw);
                const warrantyDateColor = getWarrantyDateColor(warrantyRaw);
                const warrantyEntries = getWarrantyEntries(rawFw);
                const brandModelDetails = [rawFw.fabricant || rawFw.marque || null, rawFw.modele || rawFw.model || null].filter(Boolean).join(" ");
                const details = brandModelDetails || null;
                const firewallIp = rawFw.ip || fw.ip || null;
                const up = fw.health.availabilityUp;
                const events = fw.health.eventsCount;
                let availabilityColor = "#6b7280";
                let eventsColor = "#6b7280";
                if (typeof up === "number") {
                  if (up < 80) {
                    availabilityColor = "#ef4444";
                  } else if (up <= 97) {
                    availabilityColor = "#f97316";
                  } else {
                    availabilityColor = "#16a34a";
                  }
                }
                if (typeof events === "number") {
                  if (events === 0) {
                    eventsColor = "#16a34a";
                  } else if (events <= 3) {
                    eventsColor = "#f97316";
                  } else {
                    eventsColor = "#ef4444";
                  }
                }
                return <div key={fw.id} className={styles.topologyFirewallChip} title={fw.name}>
                          {fw.activity && (fw.activity.hasComment || fw.activity.hasTicket) && <div className={styles.notificationIconContainer} role="button" tabIndex={0} onClick={scrollToReportComments} onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      scrollToReportComments();
                    }
                  }} title="Go to report comments">
                                {fw.activity.hasComment && <span className={`${styles.notificationDot} ${styles.notificationDotComment}`} title="Comments for this firewall">
                                    {fw.activity.commentCount}
                                  </span>}
                                {fw.activity.hasTicket && <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`} title="Ticket pour ce firewall">
                                    {fw.activity.ticketCount}
                                  </span>}
                              </div>}
                          <div className={styles.topologyFirewallText}>
                            <div className={styles.topologyFirewallHeader}>
                              <span className={styles.topologyFirewallHeaderMain}>
                                <span className={styles.topologyFirewallIcon}>
                                  <IconifyIcon icon="mdi:firewall" width={20} height={20} />
                                </span>
                                <span className={styles.topologyFirewallName}>
                                  {fw.name}
                                </span>
                              </span>
                              <div>
                                {fw.flags?.isHA && <span className={`${styles.topologyBadge} ${styles.topologyBadgeHA}`}>
                                    HA
                                  </span>}
                                {fw.flags?.isPrimary && !fw.flags?.isHA && <span className={`${styles.topologyBadge} ${styles.topologyBadgePrimary}`}>
                                    Primaire
                                  </span>}
                                {fw.flags?.isSecondary && !fw.flags?.isHA && <span className={`${styles.topologyBadge} ${styles.topologyBadgeBackup}`}>
                                    Secondaire
                                  </span>}
                              </div>
                            </div>

                            {details && <div className={styles.topologyFirewallIdentity}>
                                {details}
                              </div>}
                            {firewallSerialLabel && <div className={styles.topologyFirewallDetails}>
                                SN: {firewallSerialLabel}
                              </div>}
                            {firewallIp && <div className={styles.topologyFirewallIp}>
                                IP: {firewallIp}
                              </div>}
                            {warrantyLabel !== "-" && <div className={styles.topologyFirewallLicenseItem}>
                                Garantie:{" "}
                                <span style={warrantyDateColor ? {
                        color: warrantyDateColor,
                        fontWeight: 600
                      } : undefined}>
                                  {warrantyLabel}
                                </span>
                              </div>}
                            {warrantyEntries.length > 0 && <div className={styles.topologyFirewallLicenses}>
                                {warrantyEntries.map((entry, idx) => <div key={`${fw.id}-warranty-${idx}`} className={styles.topologyFirewallLicenseItem}>
                                    {entry.name || "License"}
                                    {entry.dateLabel ? <>
                                        {" : "}
                                        <span style={getWarrantyDateColor(entry.dateRaw) ? {
                            color: getWarrantyDateColor(entry.dateRaw),
                            fontWeight: 600
                          } : undefined}>
                                          {entry.dateLabel}
                                        </span>
                                      </> : ""}
                                  </div>)}
                              </div>}

                            <div className={styles.topologyFirewallMeta}>
                              <span className={styles.monitoringStatusIcon}>
                                <IconifyIcon icon="simple-icons:checkmk" width={14} height={14} color={fw.health.status === "unsynced" ? "#9ca3af" : "#16a34a"} />
                              </span>
                              {fw.health.status === "unsynced" ? <span className={styles.topologyFirewallUnsynced}>
                                  Unsupervised
                                </span> : <>
                                  <span style={{
                          color: eventsColor,
                          fontWeight: 600
                        }}>
                                    {fw.health.eventsCount} event
                                    {fw.health.eventsCount > 1 ? "s" : ""}
                                  </span>
                                  {typeof fw.health.availabilityUp === "number" && <span style={{
                          color: availabilityColor,
                          fontWeight: 600
                        }}>
                                      Availability: {fw.health.availabilityUp.toFixed(1)}%
                                    </span>}
                                </>}
                            </div>
                          </div>
                        </div>;
              })}
                  </div>}
              </div>;
        })}
        </div>
      </div>
    </section>;
}
function HeatmapSection({
  title,
  icon,
  equipments
}) {
  if (!equipments.length) return null;
  const bySite = groupBySite(equipments);
  return <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrapper}>
          {icon && <span className={styles.sectionIcon}>
              <IconifyIcon icon={icon} width={34} height={34} color="#f97316" />
            </span>}
          <h4 className={styles.sectionTitle}>{title}</h4>
        </div>
        <span className={styles.sectionSubtitle}>Heatmap par site</span>
      </div>
      <div className={styles.sectionTitleSeparator} />

      <div className={styles.heatmapGrid}>
        {Object.entries(bySite).map(([site, siteEquipments]) => <div key={site} className={styles.heatmapSiteBlock}>
            <div className={styles.heatmapSiteHeader}>{site}</div>
            <div className={styles.heatmapDotsRow}>
              {siteEquipments.map(eq => <div key={eq.id} className={styles.heatmapDotWrapper} title={`${eq.name} • ${eq.health.label}`}>
                  <span className={styles.heatmapDot} style={{
              backgroundColor: eq.health.color
            }} />
                </div>)}
            </div>
          </div>)}
      </div>
    </section>;
}
function ServersTopologySection({
  equipments
}) {
  if (!equipments.length) return null;
  const bySite = groupBySite(equipments);
  return <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrapper}>
          <span className={styles.sectionIcon}>
            <IconifyIcon icon="mdi:server" width={34} height={34} color="#6366f1" />
          </span>
          <div>
            <h4 className={styles.sectionTitle}>
              Physical and virtual servers
            </h4>
            <div className={styles.sectionSubtitle}>
              Event listing and availability rate
            </div>
          </div>
        </div>
      </div>
      <div className={styles.sectionTitleSeparator} />

      <div className={styles.topologyRoot}>
        <div className={styles.topologySitesRow}>
          {Object.entries(bySite).map(([site, siteEquipments]) => {
          const sortedSiteEquipments = [...siteEquipments].sort((a, b) => {
            const typeDiff = getServerDisplayOrder(a.raw || {}) - getServerDisplayOrder(b.raw || {});
            if (typeDiff !== 0) return typeDiff;
            return String(a.name || "").localeCompare(String(b.name || ""));
          });
          return <div key={site} className={styles.topologySiteColumn}>
              <div className={styles.topologySiteHeader}>
                <span className={styles.topologySiteIcon}>
                  <IconifyIcon icon="mdi:office-building-outline" width={16} height={16} />
                </span>
                <span>{site}</span>
              </div>

              <div className={styles.topologyServersRow}>
                {sortedSiteEquipments.map(eq => {
                const raw = eq.raw || {};
                const icon = getServerIcon(raw);
                const osLabel = raw.systeme || raw.os || null;
                const rolesList = getServerRolesList(raw.role);
                const warrantyRaw = raw.expirationGarantie || raw.garantie;
                const warrantyLabel = formatDateFr(warrantyRaw);
                const warrantyDateColor = getWarrantyDateColor(warrantyRaw);
                const serialLabel = getSerialNumber(raw);
                const isPhysicalServer = String(raw.type || "").toLowerCase() === "physique" || String(raw.type || "").toLowerCase() === "physical";
                const serverBrand = raw.fabricant || raw.marque || raw.vendor || null;
                const serverModel = raw.modele || raw.model || null;
                const brandModelLabel = [serverBrand, serverModel].filter(Boolean).join(" ") || null;
                const hasServerIp = eq.ip && eq.ip !== "-";
                const serverVlanLabel = raw.vlan || raw.VLAN || null;
                const serverContentLine = [isPhysicalServer ? brandModelLabel : null].filter(Boolean).join(" - ");
                const serverSerialLine = isPhysicalServer && serialLabel ? `SN: ${serialLabel}` : null;
                const isVirtualServer = String(raw.type || "").toLowerCase() === "virtuel" || String(raw.type || "").toLowerCase() === "virtual";
                const isPhysicalServerType = String(raw.type || "").toLowerCase() === "physique" || String(raw.type || "").toLowerCase() === "physical";
                const vcpuLabel = raw.processeur || raw.vcpu || raw.vCpu || null;
                const ramLabel = raw.memoire || raw.ram || null;
                const storageLabel = raw.stockage || null;
                const osIcon = getOsIcon(raw);
                const up = eq.health.availabilityUp;
                const events = eq.health.eventsCount;
                let availabilityColor = "#6b7280";
                let eventsColor = "#6b7280";
                if (typeof up === "number") {
                  if (up < 80) {
                    availabilityColor = "#ef4444";
                  } else if (up <= 97) {
                    availabilityColor = "#f97316";
                  } else {
                    availabilityColor = "#16a34a";
                  }
                }
                if (typeof events === "number") {
                  if (events === 0) {
                    eventsColor = "#16a34a";
                  } else if (events <= 3) {
                    eventsColor = "#f97316";
                  } else {
                    eventsColor = "#ef4444";
                  }
                }
                return <div key={eq.id} className={styles.topologyServerChip} title={eq.name}>
                      {eq.activity && (eq.activity.hasComment || eq.activity.hasTicket) && <div className={styles.notificationIconContainer} role="button" tabIndex={0} onClick={scrollToReportComments} onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      scrollToReportComments();
                    }
                  }} title="Go to report comments">
                            {eq.activity.hasComment && <span className={`${styles.notificationDot} ${styles.notificationDotComment}`} title="Comments for this server">
                                {eq.activity.commentCount}
                              </span>}
                            {eq.activity.hasTicket && <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`} title="Ticket pour ce serveur">
                                {eq.activity.ticketCount}
                              </span>}
                          </div>}
                      <div className={styles.topologyServerText}>
                        <div className={styles.topologyServerHeaderRow}>
                          <span className={styles.topologyServerTitleMain}>
                            <span className={styles.topologyServerTypeIcon}>
                              <IconifyIcon icon={icon} width={20} height={20} />
                            </span>
                            <span className={styles.topologyServerName}>
                              {eq.name}
                            </span>
                          </span>
                          {!!rolesList.length && <div className={styles.topologyRoleTags}>
                              {rolesList.map(role => <span key={role} className={styles.topologyRoleTag}>
                                  {abbreviateServerRole(role)}
                                </span>)}
                            </div>}
                        </div>
                        {!!serverContentLine && <span className={styles.topologyServerOs}>
                            {serverContentLine}
                          </span>}
                        {!!serverSerialLine && <span className={styles.topologyServerOs}>
                            {serverSerialLine}
                          </span>}
                        {isVirtualServer && vcpuLabel && <span className={styles.topologyServerOs}>
                            vCPU: {vcpuLabel}
                          </span>}
                        {isVirtualServer && ramLabel && <span className={styles.topologyServerOs}>
                            RAM: {ramLabel}
                          </span>}
                        {isVirtualServer && storageLabel && <span className={styles.topologyServerOs}>
                            Storage: {storageLabel}
                          </span>}
                        {isPhysicalServerType && vcpuLabel && <span className={styles.topologyServerOs}>
                            vCPU: {vcpuLabel}
                          </span>}
                        {isPhysicalServerType && ramLabel && <span className={styles.topologyServerOs}>
                            RAM: {ramLabel}
                          </span>}
                        {isPhysicalServerType && storageLabel && <span className={styles.topologyServerOs}>
                            Storage: {storageLabel}
                          </span>}
                        {hasServerIp && <span className={styles.topologyServerIp}>
                            IP: {eq.ip}
                          </span>}
                        {serverVlanLabel && <span className={styles.topologyServerOs}>
                            VLAN: {serverVlanLabel}
                          </span>}
                        {warrantyLabel !== "-" && <span className={styles.topologyServerOs}>
                            Garantie:{" "}
                            <span style={warrantyDateColor ? {
                        color: warrantyDateColor,
                        fontWeight: 600
                      } : undefined}>
                              {warrantyLabel}
                            </span>
                          </span>}
                        <div className={styles.topologyServerMeta}>
                          <span className={styles.monitoringStatusIcon}>
                            <IconifyIcon icon="simple-icons:checkmk" width={14} height={14} color={eq.health.status === "unsynced" ? "#9ca3af" : "#16a34a"} />
                          </span>
                          {eq.health.status === "unsynced" ? <span className={styles.topologyFirewallUnsynced}>
                              Unsupervised
                            </span> : <>
                              <span style={{
                          color: eventsColor,
                          fontWeight: 600
                        }}>
                                {events} event{events > 1 ? "s" : ""}
                              </span>
                              {typeof up === "number" && <span style={{
                          color: availabilityColor,
                          fontWeight: 600
                        }}>
                                  Availability: {up.toFixed(1)}%
                                </span>}
                            </>}
                        </div>
                      </div>
                    </div>;
              })}
              </div>
            </div>;
        })}
        </div>
      </div>
    </section>;
}
function CardsSection({
  title,
  icon,
  equipments,
  stockageReportState = null
}) {
  if (!equipments.length) return null;
  const kind = equipments[0]?.typeKey || "";
  const bySite = groupBySite(equipments);
  const usageOverrides = kind === "Storage" && stockageReportState?.usage ? stockageReportState.usage : {};
  const diskOverrides = kind === "Storage" && stockageReportState?.diskStates ? stockageReportState.diskStates : {};
  const getStorageKey = (raw, fallbackId) => String(raw.id ?? raw.uuid ?? raw.nom ?? raw.name ?? raw.numeroSerie ?? fallbackId ?? "");
  const buildRows = eq => {
    const r = eq.raw || {};
    switch (kind) {
      case "Internet":
        return [{
          label: "Type de lien",
          value: r.type || r.categorie || "-"
        }, {
          label: "Fournisseur",
          value: r.fournisseur || r.operateur || "-"
        }, {
          label: "Bandwidth",
          value: r.debit || r.bandwidth || "-"
        }];
      case "Firewall":
        return [{
          label: "Brand / Model",
          value: [r.fabricant || r.marque, r.modele].filter(Boolean).join(" ") || "-"
        }, {
          label: "HA role",
          value: r.roleHA || "-"
        }, {
          label: "Warranty expiration",
          value: formatDateFr(r.expirationGarantie || r.garantie)
        }];
      case "Servers":
        return [{
          label: "OS",
          value: r.systeme || r.os || "-"
        }, {
          label: "vCPU",
          value: r.processeur || r.vcpu || r.vCpu || "-"
        }, {
          label: "RAM",
          value: r.memoire || r.ram || "-"
        }, {
          label: "Storage",
          value: r.stockage || "-"
        }];
      case "Storage":
        return [{
          label: "Type",
          value: r.type || "-"
        }, {
          label: "Capacity",
          value: r.capacite || r.capacity || "-"
        }, {
          label: "Number of disks",
          value: r.nbDisquesActuels != null ? String(r.nbDisquesActuels) : r.disques ? String(r.disques.length) : "-"
        }];
      case "Switch":
        return [];
      case "BorneWifi":
        return [];
      default:
        return [];
    }
  };
  let headerTitle = title;
  let headerSubtitle = "Health detail per equipment";
  let headerIconColor = undefined;
  let headerIconNode = null;
  if (kind === "Storage") {
    headerTitle = "NAS and SAN storage space";
    headerSubtitle = "Event listing and availability rate";
    headerIconNode = <IoServerSharp size={34} color="#22c55e" />;
  } else if (kind === "Switch") {
    headerTitle = "Switch";
    headerSubtitle = "Event listing and availability rate";
    headerIconNode = <FaEthernet size={34} color="#f97316" />;
  } else if (kind === "BorneWifi") {
    headerTitle = "Borne Wi-Fi";
    headerSubtitle = "Event listing and availability rate";
    headerIconNode = <Icon path={mdiWifiMarker} size={1.4} color="#eab308" />;
  }
  return <section className={styles.section}>
      {kind === "Storage" || kind === "Switch" || kind === "BorneWifi" ? <>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrapper}>
              <span className={styles.sectionIcon}>
                {headerIconNode}
              </span>
              <div>
                <h4 className={styles.sectionTitle}>
                  {headerTitle}
                </h4>
                <div className={styles.sectionSubtitle}>
                  {headerSubtitle}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.sectionTitleSeparator} />
        </> : <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            {icon && <span className={styles.sectionIcon}>
                <IconifyIcon icon={icon} width={34} height={34} color={headerIconColor} />
              </span>}
            <h4 className={styles.sectionTitle}>{headerTitle}</h4>
          </div>
          <span className={styles.sectionSubtitle}>
            {headerSubtitle}
          </span>
        </div>}
      {Object.entries(bySite).map(([site, siteEquipments]) => <div key={site} style={{
      marginTop: "0.75rem"
    }}>
          <div className={styles.topologySiteHeader}>
            <span className={styles.topologySiteIcon}>
              <IconifyIcon icon="mdi:office-building-outline" width={16} height={16} />
            </span>
            <span>{site}</span>
          </div>

          {kind === "Storage" ? <div className={styles.topologyStorageRow}>
              {siteEquipments.map(eq => {
          const raw = eq.raw || {};
          const data = raw.data && typeof raw.data === "object" ? raw.data : {};
          const warrantyRaw = raw.expirationGarantie || raw.garantie;
          const warrantyLabel = formatDateFr(warrantyRaw);
          const warrantyExpired = isWarrantyExpired(warrantyRaw);
          const serialLabel = getSerialNumber(raw) || getSerialNumber(data);
          const key = getStorageKey(raw, eq.id);
          const overrideUsage = usageOverrides[key];
          const overrideDiskStates = diskOverrides[key];
          const up = eq.health.availabilityUp;
          const events = eq.health.eventsCount;
          const capacityLabel = raw.capacite || raw.capacity || data.capacite || data.capacity || null;
          const raidLabel = raw.raid || raw.niveauRaid || raw.raidLevel || data.raid || data.niveauRaid || data.raidLevel || null;
          const brandModel = [raw.fabricant || raw.marque || data.fabricant || data.marque, raw.modele || data.modele].filter(Boolean).join(" ") || null;
          const storageRoleList = getStorageRolesList(raw, data);
          const storageHardwareLine = [brandModel].filter(Boolean).join(" - ");
          const storageIpLine = eq.ip && eq.ip !== "-" ? `IP: ${eq.ip}` : null;
          const storageVlanLine = raw.vlan || data.vlan ? `VLAN: ${raw.vlan || data.vlan}` : null;
          const disksCount = raw.nbDisquesActuels != null ? raw.nbDisquesActuels : data.nbDisquesActuels != null ? data.nbDisquesActuels : Array.isArray(raw.disques) ? raw.disques.length : Array.isArray(data.disques) ? data.disques.length : null;
          const disksTotal = raw.nbDisquesMax != null ? raw.nbDisquesMax : raw.nbDisquesTotal != null ? raw.nbDisquesTotal : data.nbDisquesMax != null ? data.nbDisquesMax : data.nbDisquesTotal != null ? data.nbDisquesTotal : null;
          const diskStates = Array.isArray(overrideDiskStates) && overrideDiskStates.length ? overrideDiskStates : getStorageDiskStates(raw);
          const usedCapacityBaseLabel = raw.capaciteUtilisee || raw.espaceUtilise || raw.capacityUsed || data.capaciteUtilisee || data.espaceUtilise || data.capacityUsed || null;
          const usedCapacityLabel = overrideUsage != null && overrideUsage !== "" ? overrideUsage : usedCapacityBaseLabel;
          const totalCapacityRaw = raw.capacite ?? raw.capacity ?? data.capacite ?? data.capacity ?? null;
          const usedCapacityRaw = overrideUsage ?? raw.capaciteUtilisee ?? raw.capacityUsed ?? data.capaciteUtilisee ?? data.capacityUsed ?? null;
          const totalCapacityNumeric = totalCapacityRaw != null && totalCapacityRaw !== "" ? Number(totalCapacityRaw) : null;
          const usedCapacityNumeric = usedCapacityRaw != null && usedCapacityRaw !== "" ? Number(usedCapacityRaw) : null;
          let usagePercent = null;
          if (typeof totalCapacityNumeric === "number" && !Number.isNaN(totalCapacityNumeric) && totalCapacityNumeric > 0 && typeof usedCapacityNumeric === "number" && !Number.isNaN(usedCapacityNumeric)) {
            usagePercent = usedCapacityNumeric / totalCapacityNumeric * 100;
          } else if (typeof raw.tauxOccupation === "number") {
            usagePercent = raw.tauxOccupation;
          } else if (typeof raw.usagePercent === "number") {
            usagePercent = raw.usagePercent;
          } else if (typeof data.tauxOccupation === "number") {
            usagePercent = data.tauxOccupation;
          } else if (typeof data.usagePercent === "number") {
            usagePercent = data.usagePercent;
          }
          let availabilityColor = "#6b7280";
          let eventsColor = "#6b7280";
          if (typeof up === "number") {
            if (up < 80) {
              availabilityColor = "#ef4444";
            } else if (up <= 97) {
              availabilityColor = "#f97316";
            } else {
              availabilityColor = "#16a34a";
            }
          }
          if (typeof events === "number") {
            if (events === 0) {
              eventsColor = "#16a34a";
            } else if (events <= 3) {
              eventsColor = "#f97316";
            } else {
              eventsColor = "#ef4444";
            }
          }
          const percentDisplay = usagePercent != null ? `${Math.round(Math.max(0, Math.min(100, usagePercent)))}%` : null;
          const hasCapacityBar = usedCapacityLabel != null || capacityLabel != null || usedCapacityNumeric != null || totalCapacityNumeric != null || usagePercent != null;
          return <div key={eq.id} className={styles.topologyStorageChip} title={eq.name}>
                    {eq.activity && (eq.activity.hasComment || eq.activity.hasTicket) && <div className={styles.notificationIconContainer} role="button" tabIndex={0} onClick={scrollToReportComments} onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToReportComments();
              }
            }} title="Go to report comments">
                          {eq.activity.hasComment && <span className={`${styles.notificationDot} ${styles.notificationDotComment}`} title="Comments for this storage">
                              {eq.activity.commentCount}
                            </span>}
                          {eq.activity.hasTicket && <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`} title="Ticket for this storage">
                              {eq.activity.ticketCount}
                            </span>}
                        </div>}
                    <div className={styles.topologyStorageText}>
                      <div className={styles.topologyStorageHeaderRow}>
                        <span className={styles.topologyStorageTitleMain}>
                          <span className={styles.topologyStorageTypeIcon}>
                            <IconifyIcon icon="mdi:harddisk" width={20} height={20} />
                          </span>
                          <span className={styles.topologyStorageName}>
                            {eq.name}
                          </span>
                        </span>
                        {!!storageRoleList.length && <div className={styles.topologyStorageRoleTags}>
                            {storageRoleList.map(role => <span key={role} className={styles.topologyRoleTag}>
                                {role}
                              </span>)}
                          </div>}
                      </div>
                      {!!storageHardwareLine && <span className={styles.topologyStorageUniformText}>
                          {storageHardwareLine}
                        </span>}
                      {serialLabel && <span className={styles.topologyStorageUniformText}>
                          SN: {serialLabel}
                        </span>}
                      {!!storageIpLine && <span className={styles.topologyStorageIp}>
                          {storageIpLine}
                        </span>}
                      {!!storageVlanLine && <span className={styles.topologyStorageUniformText}>
                          {storageVlanLine}
                        </span>}
                      {raidLabel && <span className={styles.topologyStorageUniformText}>
                          Redondance : {raidLabel}
                        </span>}
                      {warrantyLabel !== "-" && <span className={styles.topologyStorageUniformText} style={warrantyExpired ? {
                color: "#ef4444",
                fontWeight: 600
              } : undefined}>
                          Garantie: {warrantyLabel}
                        </span>}
                      <div className={styles.topologyStorageInfoRow}>
                        {diskStates.length > 0 && <span className={styles.topologyStorageInfo}>
                            Etat des disques :{" "}
                            <span style={{
                    display: "inline-flex",
                    flexDirection: "row",
                    gap: 4,
                    alignItems: "center",
                    marginTop: 2
                  }}>
                              {diskStates.map((state, idx) => {
                      let bg = "#9ca3af";
                      switch (state) {
                        case "ok":
                          bg = "#16a34a";
                          break;
                        case "warn":
                        case "degrade":
                        case "dégradé":
                          bg = "#f97316";
                          break;
                        case "critical":
                        case "hs":
                          bg = "#ef4444";
                          break;
                        default:
                          bg = "#9ca3af";
                      }
                      return (<span key={idx} style={{
                          width: 9,
                          height: 9,
                          borderRadius: "999px",
                          backgroundColor: bg,
                          border: "1px solid #e5e7eb"
                        }} title={`Disque ${idx + 1}`} />
                      );
                    })}
                            </span>
                          </span>}
                      </div>
                      {hasCapacityBar && <div className={styles.topologyStorageCapacityRow}>
                          <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                            <div className={styles.topologyStorageCapacityBar} style={{
                    position: "relative"
                  }}>
                          {(() => {
                      let barColor = "linear-gradient(90deg, #22c55e, #16a34a)";
                      if (usagePercent != null) {
                        const clamped = Math.max(0, Math.min(100, usagePercent));
                        if (clamped >= 90) {
                          barColor = "linear-gradient(90deg, #ef4444, #b91c1c)";
                        } else if (clamped >= 75) {
                          barColor = "linear-gradient(90deg, #f97316, #c2410c)";
                        }
                      }
                      return <div className={styles.topologyStorageCapacityFill} style={{
                        width: `${usagePercent != null ? Math.max(0, Math.min(100, usagePercent)) : 100}%`,
                        background: barColor
                      }} />;
                    })()}
                              <span className={styles.topologyStorageCapacityLabel} style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      whiteSpace: "nowrap",
                      color: "#ffffff",
                      fontWeight: 500,
                      textShadow: "0 0 1px #000, 0 0 1px #000, 0 0 1px #000"
                    }}>
                            {(() => {
                        let text = usedCapacityLabel && capacityLabel ? `${usedCapacityLabel} / ${capacityLabel}` : !usedCapacityLabel && capacityLabel ? `? / ${capacityLabel}` : usedCapacityLabel || capacityLabel || (typeof usedCapacityNumeric === "number" && typeof totalCapacityNumeric === "number" ? `${usedCapacityNumeric} / ${totalCapacityNumeric}` : "");
                        if (text && /^[0-9?\s/.,]+$/.test(String(text))) {
                          return `${text} Go`;
                        }
                        return text;
                      })()}
                              </span>
                            </div>
                            {percentDisplay && <span className={styles.topologyStorageCapacityLabel} style={{
                    minWidth: 38,
                    textAlign: "right"
                  }}>
                                {percentDisplay}
                              </span>}
                          </div>
                        </div>}
                      <div className={styles.topologyStorageMeta}>
                          <span className={styles.monitoringStatusIcon}>
                            <IconifyIcon icon="simple-icons:checkmk" width={14} height={14} color={eq.health.status === "unsynced" ? "#9ca3af" : "#16a34a"} />
                          </span>
                          {eq.health.status === "unsynced" ? <span className={styles.topologyFirewallUnsynced}>
                              Unsupervised
                            </span> : <>
                            <span style={{
                    color: eventsColor,
                    fontWeight: 600
                  }}>
                              {events} event
                              {events > 1 ? "s" : ""}
                            </span>
                            {typeof up === "number" && <span style={{
                    color: availabilityColor,
                    fontWeight: 600
                  }}>
                                Availability: {up.toFixed(1)}%
                              </span>}
                          </>}
                      </div>
                    </div>
                  </div>;
        })}
            </div> : kind === "Switch" || kind === "BorneWifi" ? <div className={styles.topologyServersRow}>
              {siteEquipments.map(eq => {
          const raw = eq.raw || {};
          const rows = buildRows(eq);
          const warrantyRaw = raw.expirationGarantie || raw.garantie;
          const warrantyLabel = formatDateFr(warrantyRaw);
          const warrantyExpired = isWarrantyExpired(warrantyRaw);
          const up = eq.health.availabilityUp;
          const events = eq.health.eventsCount;
          let secondaryLine = null;
          let switchBrandModel = null;
          let switchMac = null;
          let switchIp = null;
          let switchFirmware = null;
          let wifiBrandModel = null;
          let wifiMac = null;
          let wifiIp = null;
          let wifiVlan = null;
          let wifiFirmware = null;
          if (kind === "Switch") {
            const brand = raw.fabricant || raw.marque || raw.vendor || null;
            const model = raw.modele || raw.model || null;
            const brandModel = [brand, model].filter(Boolean).join(" ") || model || brand;
            switchBrandModel = brandModel || null;
            switchMac = raw.adresseMac || raw.mac || raw.macAddress || null;
            switchIp = eq.ip && eq.ip !== "-" ? eq.ip : null;
            switchFirmware = raw.firmware || raw.versionFirmware || raw.version || null;
          } else if (kind === "BorneWifi") {
            const brand = raw.fabricant || raw.marque || raw.vendor || null;
            const model = raw.modele || raw.model || null;
            wifiBrandModel = [brand, model].filter(Boolean).join(" ") || model || brand || null;
            wifiMac = raw.adresseMac || raw.mac || raw.macAddress || null;
            wifiIp = eq.ip && eq.ip !== "-" ? eq.ip : null;
            wifiVlan = raw.vlan || raw.VLAN || null;
            wifiFirmware = raw.firmware || raw.versionFirmware || raw.version || null;
          }
          let availabilityColor = "#6b7280";
          let eventsColor = "#6b7280";
          if (typeof up === "number") {
            if (up < 80) {
              availabilityColor = "#ef4444";
            } else if (up <= 97) {
              availabilityColor = "#f97316";
            } else {
              availabilityColor = "#16a34a";
            }
          }
          if (typeof events === "number") {
            if (events === 0) {
              eventsColor = "#16a34a";
            } else if (events <= 3) {
              eventsColor = "#f97316";
            } else {
              eventsColor = "#ef4444";
            }
          }
          return <div key={eq.id} className={styles.topologyServerChip} title={eq.name}>
                    {eq.activity && (eq.activity.hasComment || eq.activity.hasTicket) && <div className={styles.notificationIconContainer} role="button" tabIndex={0} onClick={scrollToReportComments} onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToReportComments();
              }
            }} title="Go to report comments">
                          {eq.activity.hasComment && <span className={`${styles.notificationDot} ${styles.notificationDotComment}`} title="Comments for this equipment">
                              {eq.activity.commentCount}
                            </span>}
                          {eq.activity.hasTicket && <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`} title="Ticket for this equipment">
                              {eq.activity.ticketCount}
                            </span>}
                        </div>}
                    <div className={styles.topologyServerText}>
                      <div className={styles.topologyServerHeaderRow}>
                        <span className={styles.topologyServerTypeIcon}>
                          <IconifyIcon icon={icon} width={20} height={20} />
                        </span>
                        <span className={styles.topologyServerName}>
                          {eq.name}
                        </span>
                      </div>
                      {kind === "Switch" ? <>
                          {switchBrandModel && <span className={styles.topologyServerOs}>
                              {switchBrandModel}
                            </span>}
                          {switchMac && <span className={styles.topologyServerOs}>
                              Adresse MAC : {switchMac}
                            </span>}
                          {switchIp && <span className={styles.topologyServerIp}>
                              IP : {switchIp}
                            </span>}
                          {switchFirmware && <span className={styles.topologyServerOs}>
                              Firmware : {switchFirmware}
                            </span>}
                        </> : kind === "BorneWifi" ? <>
                          {wifiBrandModel && <span className={styles.topologyServerOs}>
                              {wifiBrandModel}
                            </span>}
                          {wifiMac && <span className={styles.topologyServerOs}>
                              Adresse MAC : {wifiMac}
                            </span>}
                          {wifiIp && <span className={styles.topologyServerIp}>
                              IP : {wifiIp}
                            </span>}
                          {wifiVlan && <span className={styles.topologyServerOs}>
                              VLAN : {wifiVlan}
                            </span>}
                          {wifiFirmware && <span className={styles.topologyServerOs}>
                              Firmware : {wifiFirmware}
                            </span>}
                        </> : <>
                          {eq.ip && eq.ip !== "-" && <span className={styles.topologyServerIp}>
                              {eq.ip}
                              {secondaryLine ? ` • ${secondaryLine}` : ""}
                            </span>}
                        </>}
                      {warrantyLabel !== "-" && <span className={styles.topologyServerOs} style={warrantyExpired ? {
                color: "#ef4444",
                fontWeight: 600
              } : undefined}>
                          Garantie: {warrantyLabel}
                        </span>}
                      <div className={styles.topologyServerMeta}>
                        <span className={styles.monitoringStatusIcon}>
                          <IconifyIcon icon="simple-icons:checkmk" width={14} height={14} color={eq.health.status === "unsynced" ? "#9ca3af" : "#16a34a"} />
                        </span>
                        {eq.health.status === "unsynced" ? <span className={styles.topologyFirewallUnsynced}>
                            Unsupervised
                          </span> : <>
                            <span style={{
                    color: eventsColor,
                    fontWeight: 600
                  }}>
                              {events} event{events > 1 ? "s" : ""}
                            </span>
                            {typeof up === "number" && <span style={{
                    color: availabilityColor,
                    fontWeight: 600
                  }}>
                                Availability: {up.toFixed(1)}%
                              </span>}
                          </>}
                      </div>
                      {rows.map((row, idx) => <div key={idx} style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                display: "flex",
                gap: 4
              }}>
                          <span style={{
                  fontWeight: 500
                }}>{row.label}:</span>
                          <span>{row.value}</span>
                        </div>)}
                    </div>
                  </div>;
        })}
            </div> : <div className={styles.cardsGrid}>
              {siteEquipments.map(eq => {
          const rows = buildRows(eq);
          const osIcon = kind === "Servers" ? getOsIcon(eq.raw || {}) : null;
          const up = eq.health.availabilityUp;
          const events = eq.health.eventsCount;
          let availabilityColor = "#6b7280";
          let eventsColor = "#6b7280";
          if (typeof up === "number") {
            if (up < 80) {
              availabilityColor = "#ef4444";
            } else if (up <= 97) {
              availabilityColor = "#f97316";
            } else {
              availabilityColor = "#16a34a";
            }
          }
          if (typeof events === "number") {
            if (events === 0) {
              eventsColor = "#16a34a";
            } else if (events <= 3) {
              eventsColor = "#f97316";
            } else {
              eventsColor = "#ef4444";
            }
          }
          return <article key={eq.id} className={styles.card}>
                    {eq.activity && (eq.activity.hasComment || eq.activity.hasTicket) && <div className={styles.notificationIconContainer} role="button" tabIndex={0} onClick={scrollToReportComments} onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToReportComments();
              }
            }} title="Go to report comments">
                          {eq.activity.hasComment && <span className={`${styles.notificationDot} ${styles.notificationDotComment}`} title="Comments for this equipment">
                              {eq.activity.commentCount}
                            </span>}
                          {eq.activity.hasTicket && <span className={`${styles.notificationDot} ${styles.notificationDotTicket}`} title="Ticket for this equipment">
                              {eq.activity.ticketCount}
                            </span>}
                        </div>}
                    <header className={styles.cardHeader}>
                      <div className={styles.cardTitleBlock}>
                        <div className={styles.cardTitleRow}>
                          {osIcon && <IconifyIcon icon={osIcon} width={18} height={18} className={styles.cardOsIcon} />}
                          <div className={styles.cardTitle}>{eq.name}</div>
                        </div>
                      </div>
                      <div className={styles.cardStatusPill}>
                        <span className={styles.cardStatusDot} style={{
                  backgroundColor: eq.health.color
                }} />
                        <span className={styles.cardStatusText}>
                          {eq.health.label}
                        </span>
                      </div>
                    </header>

                    <div className={styles.cardBody}>
                      <div className={styles.cardRow}>
                        <span className={styles.cardLabel}>IP / FQDN</span>
                        <span className={styles.cardValue}>{eq.ip}</span>
                      </div>
                      {kind === "Servers" ? <>
                          <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>
                              Incidents raised by supervision
                            </span>
                            <span className={styles.cardValue} style={{
                    color: eventsColor,
                    fontWeight: 600
                  }}>
                              {eq.health.eventsCount}
                            </span>
                          </div>
                          <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>
                              Observed availability (CheckMK)
                            </span>
                            <span className={styles.cardValue} style={{
                    color: availabilityColor,
                    fontWeight: 600
                  }}>
                              {eq.health.availabilityUp != null ? `${eq.health.availabilityUp.toFixed(2)} %` : "Not available"}
                            </span>
                          </div>
                        </> : <>
                          <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>
                              Observed availability (CheckMK)
                            </span>
                            <span className={styles.cardValue}>
                              {eq.health.availabilityUp != null ? `${eq.health.availabilityUp.toFixed(2)} %` : "Not available"}
                            </span>
                          </div>
                          <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>
                              Monitored checkpoints
                            </span>
                            <span className={styles.cardValue}>
                              {eq.health.servicesCount}
                            </span>
                          </div>
                          <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>
                              Incidents raised by supervision
                            </span>
                            <span className={styles.cardValue}>
                              {eq.health.eventsCount}
                            </span>
                          </div>
                        </>}
                      {rows.map((row, idx) => <div key={idx} className={styles.cardRow}>
                          <span className={styles.cardLabel}>{row.label}</span>
                          <span className={styles.cardValue}>{row.value}</span>
                        </div>)}
                    </div>
                  </article>;
        })}
            </div>}
        </div>)}
    </section>;
}
export default function ReportSummaryInfrastructure({
  client,
  equipmentCheckMKData = {},
  equipmentComments = {},
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  stockageReportState = null
}) {
  const equipmentsByType = useMemo(() => {
    const eq = client?.equipements || {};
    const usageOverrides = stockageReportState && stockageReportState.usage || {};
    const diskStateOverrides = stockageReportState && stockageReportState.diskStates || {};
    const nas = eq.NAS || [];
    const san = eq.SAN || [];
    const mergedNasSan = [...nas, ...san].map(item => {
      const key = String(item.id ?? item.uuid ?? item.nom ?? item.name ?? item.numeroSerie ?? "");
      const overrideUsage = usageOverrides[key];
      const overrideDiskStates = diskStateOverrides[key];
      if (!overrideUsage && !overrideDiskStates) return item;
      const next = {
        ...item,
        data: {
          ...(item.data || {})
        }
      };
      if (overrideUsage !== undefined) {
        next.data = {
          ...next.data,
          capaciteUtilisee: overrideUsage
        };
        next.capaciteUtilisee = overrideUsage;
      }
      if (overrideDiskStates) {
        next.data = {
          ...next.data,
          etatDisques: overrideDiskStates
        };
        next.etatDisques = overrideDiskStates;
      }
      return next;
    });
    const attachActivity = (list, typeKey) => normalizeEquipments(list || [], typeKey, equipmentCheckMKData).map(item => {
      const key = getEquipmentKey(item.raw || {}, typeKey);
      const comments = Number(equipmentCommentCounts[key] || 0);
      const tickets = Number(equipmentTicketCounts[key] || 0);
      return {
        ...item,
        activity: {
          hasComment: comments > 0,
          hasTicket: tickets > 0,
          commentCount: comments,
          ticketCount: tickets
        }
      };
    });
    return {
      Internet: attachActivity(eq.Internet || [], "Internet"),
      Firewall: attachActivity(eq.Firewalls || [], "Firewall"),
      Servers: attachActivity(eq.Servers || [], "Servers"),
      Storage: attachActivity(mergedNasSan, "Storage"),
      Switch: attachActivity(eq.Switch || [], "Switch"),
      BorneWifi: attachActivity(eq.BorneWifi || [], "BorneWifi")
    };
  }, [client, equipmentCheckMKData, equipmentCommentCounts, equipmentTicketCounts, stockageReportState]);
  const infraLegendCounts = useMemo(() => ({
    commentTotal: sumEquipmentCountsForModules(equipmentCommentCounts, REPORT_INFRA_MODULES, equipmentComments),
    ticketTotal: sumEquipmentCountsForModules(equipmentTicketCounts, REPORT_INFRA_MODULES, equipmentComments)
  }), [equipmentCommentCounts, equipmentTicketCounts, equipmentComments]);
  if (!client) {
    return null;
  }
  const modules = client.modules_monitoring || {};
  return <div className={styles.root}>
      <div className={styles.overviewContainer}>
        <NotificationLegend commentTotal={infraLegendCounts.commentTotal} ticketTotal={infraLegendCounts.ticketTotal} />
      </div>
      {}
      {modules.Internet && <InfraTopologySection internet={equipmentsByType.Internet} firewalls={modules.Firewall ? equipmentsByType.Firewall : []} />}

      {}
      {modules.Servers && equipmentsByType.Servers.length > 0 && <ServersTopologySection equipments={equipmentsByType.Servers} />}

      {}
      {modules.Storage && equipmentsByType.Storage.length > 0 && <CardsSection title="Storage topology" icon="mdi:harddisk" equipments={equipmentsByType.Storage} stockageReportState={stockageReportState} />}

      {}
      {modules.Switch && equipmentsByType.Switch.length > 0 && <CardsSection title="Switch health" icon="mdi:switch" equipments={equipmentsByType.Switch} />}

      {}
      {modules.BorneWifi && equipmentsByType.BorneWifi.length > 0 && <CardsSection title="Wi-Fi AP health" icon="mdi:access-point" equipments={equipmentsByType.BorneWifi} />}
    </div>;
}
