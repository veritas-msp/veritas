import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiOfficeBuilding, mdiServerNetwork, mdiCube, mdiCertificate } from "@mdi/js";
import { FaHdd, FaServer, FaCube, FaWindows, FaLinux } from "react-icons/fa";
import { BsCpu } from "react-icons/bs";
import { PiMemory, PiListMagnifyingGlassLight } from "react-icons/pi";
import { TbClockUp } from "react-icons/tb";
import { MdOutlineWifiTetheringError, MdOutlineNetworkCheck } from "react-icons/md";
import { scoreToLetter, scoreToColor } from "../../../utils/gradeUtils";
import styles from "./ServersSummaryCards.module.css";
const SERVICE_MAPPING = {
  CPU: "CPU",
  MEMOIRE: "RAM",
  DISQUE: "C:/",
  UPTIME: "UPTIME"
};
const defaultServices = ["CPU", "MEMOIRE", "DISQUE", "UPTIME"];
const SERVICE_LABELS = {
  CPU: "CPU",
  MEMOIRE: "RAM",
  DISQUE: "C:/",
  UPTIME: "Uptime"
};
const SERVICE_ICONS = {
  CPU: BsCpu,
  MEMOIRE: PiMemory,
  DISQUE: FaHdd,
  UPTIME: TbClockUp
};
const SCORE_LABELS = {
  A: "Excellente",
  B: "Bonne",
  C: "Moyenne",
  D: "Fragile",
  E: "Critical",
  F: "Failed"
};
const LETTERS = ["F", "E", "D", "C", "B", "A"];
const formatExpirationDate = rawDate => {
  if (!rawDate) return null;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
const formatCpuLabel = (rawCpu, isVirtual) => {
  if (!rawCpu) return null;
  const cpuStr = String(rawCpu).trim();
  const vcpuMatch = cpuStr.match(/(\d+)\s*vCPU/i);
  if (vcpuMatch) {
    return `${vcpuMatch[1]} vCPU`;
  }
  if (isVirtual) {
    const digitMatch = cpuStr.match(/(\d+)/);
    if (digitMatch) {
      return `${digitMatch[1]} vCPU`;
    }
    return cpuStr;
  }
  const tokens = cpuStr.split(/\s+/);
  if (tokens.length <= 3) return cpuStr;
  return tokens.slice(0, 3).join(" ");
};
const getOSIcon = systeme => {
  if (!systeme) return null;
  const systemeLower = systeme.toLowerCase();
  if (systemeLower.includes('windows')) {
    return <FaWindows style={{
      fontSize: "0.9rem",
      marginRight: "0.25rem",
      verticalAlign: "middle"
    }} />;
  }
  if (systemeLower.includes('linux') || systemeLower.includes('ubuntu') || systemeLower.includes('debian') || systemeLower.includes('centos') || systemeLower.includes('red hat') || systemeLower.includes('suse') || systemeLower.includes('opensuse') || systemeLower.includes('almalinux') || systemeLower.includes('rocky linux') || systemeLower.includes('oracle linux') || systemeLower.includes('fedora') || systemeLower.includes('vmware esxi') || systemeLower.includes('proxmox') || systemeLower.includes('citrix xenserver') || systemeLower.includes('microsoft hyper-v')) {
    return <FaLinux style={{
      fontSize: "0.9rem",
      marginRight: "0.25rem",
      verticalAlign: "middle"
    }} />;
  }
  return null;
};
const getLetterContext = activeLetter => {
  const index = LETTERS.indexOf(activeLetter);
  if (index === -1) {
    return [null, activeLetter, null];
  }
  const prevLetter = index > 0 ? LETTERS[index - 1] : null;
  const nextLetter = index < LETTERS.length - 1 ? LETTERS[index + 1] : null;
  return [prevLetter, LETTERS[index], nextLetter];
};
const parsePercentValue = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};
const buildServiceMetrics = (serverData = {}) => {
  return defaultServices.map(service => {
    const mappedServiceName = SERVICE_MAPPING[service] || service;
    const serviceData = serverData[mappedServiceName] || serverData[service] || {};
    return {
      service: service,
      label: SERVICE_LABELS[service] || service,
      ok: parsePercentValue(serviceData.ok ?? serviceData.OK, 100),
      warn: parsePercentValue(serviceData.warn ?? serviceData.WARN, 0),
      crit: parsePercentValue(serviceData.crit ?? serviceData.CRIT, 0)
    };
  });
};
const getServicesCount = (serverData = {}, fallback = 0) => {
  const checkmkServicesTotal = serverData?.checkmkData?.serviceInfo?.total;
  if (typeof checkmkServicesTotal === "number" && checkmkServicesTotal >= 0) {
    return checkmkServicesTotal;
  }
  const checkmkServicesList = serverData?.checkmkData?.services;
  if (Array.isArray(checkmkServicesList)) {
    return checkmkServicesList.length;
  }
  const servicesList = serverData?.services;
  if (Array.isArray(servicesList)) {
    return servicesList.length;
  }
  return fallback;
};
const parseServiceValue = (val, fallback) => {
  if (val === undefined || val === null || val === "") return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
};
export const computeServerHealthScore = (serverData = {}, {
  eventsCount = null,
  availabilityValue = null,
  isMapped
}) => {
  if (isMapped && !serverData.lastSyncDate) {
    return null;
  }
  const srvData = serverData || {};
  let hasSlaData = false;
  let slaScore = 0;
  let totalCritRatio = 0;
  let serviceCount = 0;
  let hasCriticalServices = false;
  if (srvData) {
    let totalCrit = 0;
    let totalWarn = 0;
    let totalOk = 0;
    defaultServices.forEach(service => {
      const mappedService = SERVICE_MAPPING[service] || service;
      const serviceData = srvData[mappedService] || srvData[service] || {};
      const parse = (val, fallback) => parseServiceValue(val, fallback);
      const ok = parse(serviceData.ok, 100);
      const warn = parse(serviceData.warn, 0);
      const crit = parse(serviceData.crit, 0);
      if (crit > 0) {
        hasCriticalServices = true;
      }
      const serviceTotal = ok + warn + crit;
      if (serviceTotal > 0) {
        const critRatio = crit / serviceTotal;
        totalCritRatio += critRatio;
      }
      totalCrit += crit;
      totalWarn += warn;
      totalOk += ok;
      serviceCount++;
    });
    if (serviceCount > 0) {
      const avgOk = totalOk / serviceCount;
      const avgWarn = totalWarn / serviceCount;
      const avgCrit = totalCrit / serviceCount;
      totalCritRatio = totalCritRatio / serviceCount;
      let critScore = 0;
      if (avgCrit > 0.1) {
        critScore = 0;
      } else if (avgCrit > 0.05) {
        critScore = avgCrit * 15;
      } else {
        critScore = avgCrit * 30;
      }
      slaScore = avgOk * 1.0 + avgWarn * 0.5 + critScore;
      hasSlaData = true;
    } else {
      slaScore = 100;
    }
  } else {
    slaScore = 100;
  }
  if (!isMapped) {
    if (!hasSlaData) {
      return null;
    }
    return Math.round(slaScore);
  }
  let score = 0;
  let weightSum = 0;
  let hasEvents = false;
  let hasLowAvailability = false;
  const periodEventsCount = eventsCount !== null && eventsCount !== undefined ? eventsCount : undefined;
  if (periodEventsCount !== undefined && periodEventsCount > 0) {
    hasEvents = true;
  }
  let availabilityValueForCalc = 100;
  if (availabilityValue !== null && availabilityValue !== undefined) {
    availabilityValueForCalc = parseFloat(availabilityValue);
    if (availabilityValueForCalc < 95) {
      hasLowAvailability = true;
    }
  }
  const eventsWeight = isMapped ? 0.3 : 0;
  const availabilityWeight = isMapped ? 0.3 : 0;
  const serviceTableWeight = isMapped ? 0.4 : 1;
  let eventsScore = 100;
  if (eventsWeight > 0 && periodEventsCount !== undefined) {
    if (periodEventsCount === 0) {
      eventsScore = 100;
    } else if (periodEventsCount === 1) {
      eventsScore = 70;
    } else if (periodEventsCount <= 3) {
      eventsScore = 50;
    } else if (periodEventsCount <= 6) {
      eventsScore = 30;
    } else {
      eventsScore = 15;
    }
  }
  score += eventsScore * eventsWeight;
  weightSum += eventsWeight;
  let availabilityScore = availabilityValueForCalc;
  if (availabilityValueForCalc < 80) {
    availabilityScore = Math.min(availabilityValueForCalc, 50);
  } else if (availabilityValueForCalc < 95) {
    availabilityScore = Math.min(availabilityValueForCalc, 70);
  }
  score += availabilityScore * availabilityWeight;
  weightSum += availabilityWeight;
  score += slaScore * serviceTableWeight;
  weightSum += serviceTableWeight;
  let finalScore = weightSum > 0 ? score / weightSum : 0;
  if (availabilityValueForCalc < 80) {
    finalScore = Math.min(finalScore, 50);
  } else if (availabilityValueForCalc < 95) {
    finalScore = Math.min(finalScore, 70);
  }
  if (hasEvents && finalScore > 70) {
    finalScore = Math.min(finalScore, 70);
  }
  if (periodEventsCount !== undefined && periodEventsCount >= 4 && finalScore > 50) {
    finalScore = Math.min(finalScore, 50);
  }
  if (hasCriticalServices && serviceCount > 0) {
    let critCeiling = 100;
    if (totalCritRatio >= 0.2) {
      critCeiling = 30;
    } else if (totalCritRatio >= 0.1) {
      critCeiling = 50;
    } else if (totalCritRatio >= 0.05) {
      critCeiling = 70;
    } else if (totalCritRatio >= 0.02) {
      critCeiling = 85;
    } else {
      critCeiling = 95;
    }
    if (finalScore > critCeiling) {
      finalScore = Math.min(finalScore, critCeiling);
    }
  }
  if (!hasSlaData) {
    return null;
  }
  return Math.round(finalScore);
};
const getEventsCountValue = (serverData = {}) => {
  if (typeof serverData.eventsCount === "number") {
    return serverData.eventsCount;
  }
  if (Array.isArray(serverData.eventsData)) {
    return serverData.eventsData.length;
  }
  const checkmkEvents = serverData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }
  return null;
};
const getAvailabilityValue = (serverData = {}) => {
  const raw = serverData?.availabilityData?.up ?? serverData?.availability?.up ?? serverData?.availability;
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : null;
};
const buildBreakdownItems = (servicesCount, eventsCount, availabilityValue, isMapped) => [{
  label: "Services",
  value: servicesCount !== null ? `${servicesCount} ${servicesCount > 1 ? "services" : "service"}` : "Not provided"
}, {
  label: "Events",
  value: eventsCount !== null ? `${eventsCount} ${eventsCount > 1 ? "alerts" : "alert"}` : "Not provided"
}, {
  label: "Availability",
  value: availabilityValue !== null ? `${availabilityValue.toFixed(1)}%` : isMapped ? "Not monitored" : "Not mapped"
}];
const getServerStatus = (serverName, serverData = {}) => {
  if (!serverData) return {
    status: "unknown",
    color: "#6b7280"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  defaultServices.forEach(service => {
    const serviceData = serverData[service] || {};
    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
    totalCrit += parse(serviceData.crit, 0);
    totalWarn += parse(serviceData.warn, 0);
    totalOk += parse(serviceData.ok, 100);
  });
  const avgCrit = totalCrit / defaultServices.length;
  const avgWarn = totalWarn / defaultServices.length;
  const avgOk = totalOk / defaultServices.length;
  if (avgCrit > 20) return {
    status: "critical",
    color: "#ef4444"
  };
  if (avgCrit > 10 || avgWarn > 30) return {
    status: "warning",
    color: "#f59e0b"
  };
  if (avgOk >= 90) return {
    status: "excellent",
    color: "#10b981"
  };
  if (avgOk >= 70) return {
    status: "good",
    color: "#84cc16"
  };
  return {
    status: "poor",
    color: "#eab308"
  };
};
const getServerLetterFromStatus = status => {
  switch (status) {
    case "excellent":
      return "A";
    case "good":
      return "B";
    case "poor":
      return "C";
    case "warning":
      return "D";
    case "critical":
      return "E";
    default:
      return "?";
  }
};
const renderPieChart = (ok, warn, crit, size = 32) => {
  const total = ok + warn + crit;
  if (total === 0) {
    ok = 100;
    warn = 0;
    crit = 0;
  }
  const okPercent = ok / total * 100;
  const warnPercent = warn / total * 100;
  const critPercent = crit / total * 100;
  const radius = size / 2 - 2;
  const center = size / 2;
  const getArcPath = (startPercent, endPercent) => {
    const startAngle = startPercent / 100 * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPercent / 100 * 2 * Math.PI - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };
  const okStart = 0;
  const okEnd = okPercent;
  const warnStart = okEnd;
  const warnEnd = warnStart + warnPercent;
  const critStart = warnEnd;
  const critEnd = critStart + critPercent;
  if (okPercent === 100 && warnPercent === 0 && critPercent === 0) {
    return <svg width={size} height={size} className={styles.pieChart}>
        <circle cx={center} cy={center} r={radius} fill="#10b981" fillOpacity="1" />
      </svg>;
  }
  if (warnPercent === 100 && okPercent === 0 && critPercent === 0) {
    return <svg width={size} height={size} className={styles.pieChart}>
        <circle cx={center} cy={center} r={radius} fill="#f59e0b" />
      </svg>;
  }
  if (critPercent === 100 && okPercent === 0 && warnPercent === 0) {
    return <svg width={size} height={size} className={styles.pieChart}>
        <circle cx={center} cy={center} r={radius} fill="#ef4444" />
      </svg>;
  }
  return <svg width={size} height={size} className={styles.pieChart}>
      {okPercent > 0 && <path d={getArcPath(okStart, okEnd)} fill="#10b981" fillOpacity="1" />}
      {warnPercent > 0 && <path d={getArcPath(warnStart, warnEnd)} fill="#f59e0b" />}
      {critPercent > 0 && <path d={getArcPath(critStart, critEnd)} fill="#ef4444" />}
    </svg>;
};
const ServersSummaryCards = ({
  config,
  data,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const serveurs = config?.client?.equipements?.Serveurs || [];
  const serversData = data?.serveurs || {};
  const filteredServers = useMemo(() => {
    if (selectedSites.length > 0) {
      return serveurs.filter(srv => {
        const equipmentSite = srv?.site ? String(srv.site).trim() : null;
        const siteToCheck = equipmentSite || "No site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return serveurs;
  }, [serveurs, selectedSites]);
  const groupedBySite = useMemo(() => {
    const grouped = filteredServers.reduce((acc, serveur) => {
      const siteName = serveur.site || "No site";
      if (!acc[siteName]) acc[siteName] = [];
      acc[siteName].push(serveur);
      return acc;
    }, {});
    Object.keys(grouped).forEach(siteName => {
      grouped[siteName].sort((a, b) => {
        const aIsVirtual = a.type === "virtuel";
        const bIsVirtual = b.type === "virtuel";
        if (!aIsVirtual && bIsVirtual) return -1;
        if (aIsVirtual && !bIsVirtual) return 1;
        return (a.nom || "").localeCompare(b.nom || "");
      });
    });
    return grouped;
  }, [filteredServers]);
  if (serveurs.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No server configured for this client.</p>
        </div>
      </div>;
  }
  if (Object.keys(groupedBySite).length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No server matches the selected filters.</p>
        </div>
      </div>;
  }
  const siteEntries = Object.entries(groupedBySite).sort(([siteA], [siteB]) => {
    if (siteA === "No site") return 1;
    if (siteB === "No site") return -1;
    return siteA.localeCompare(siteB);
  });
  const siteCount = siteEntries.length;
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.serversGridBySite} style={{
      gridTemplateColumns: `repeat(${siteCount}, minmax(0, 1fr))`
    }}>
        {siteEntries.map(([siteName, siteServers]) => <div key={siteName} className={styles.siteGroup}>
            <div className={styles.siteHeader}>
              <div className={styles.siteHeaderLeft}>
                <Icon path={mdiOfficeBuilding} size="1.1rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                <span className={styles.siteHeaderLabel}>{siteName}</span>
              </div>
            </div>
            <div className={`${styles.siteColumn} ${siteCount === 1 ? styles.siteColumnGrid2x2 : ''}`}>
              {siteServers.map((serveur, idx) => {
            const serverData = serversData?.[serveur.nom] || {};
            const isVirtual = serveur.type === "virtuel";
            const serverIcon = isVirtual ? mdiCube : mdiServerNetwork;
            const eventsCount = getEventsCountValue(serverData);
            const availabilityValue = getAvailabilityValue(serverData);
            const serviceMetrics = buildServiceMetrics(serverData);
            const servicesCount = getServicesCount(serverData, serviceMetrics.length);
            const isMapped = Boolean(serveur.checkmk_host_name);
            const manualScore = serverData.manualHealthScore;
            const calculatedHealthScore = computeServerHealthScore(serverData, {
              eventsCount,
              availabilityValue,
              isMapped
            });
            const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
            const statusFallback = getServerStatus(serveur.nom, serverData);
            const healthLetter = resolvedScore !== undefined && resolvedScore !== null ? scoreToLetter(resolvedScore) : getServerLetterFromStatus(statusFallback.status);
            const healthColor = resolvedScore !== undefined && resolvedScore !== null ? scoreToColor(resolvedScore) : statusFallback.color;
            const breakdownItems = buildBreakdownItems(servicesCount, eventsCount, availabilityValue, isMapped);
            const scoreLabel = SCORE_LABELS[healthLetter] || "Not rated";
            const identityPartsLeft = [serveur.fabricant, serveur.modele, serveur.numeroSerie ? `S/N ${serveur.numeroSerie}` : null].filter(Boolean);
            const identityPartsRight = [serveur.vlan ? `VLAN ${serveur.vlan}` : null, serveur.ip].filter(Boolean);
            const identityLine = identityPartsLeft.length > 0 ? identityPartsLeft.join(" ") : null;
            const vlanIpLine = identityPartsRight.length > 0 ? identityPartsRight.join(" - ") : null;
            let cpuLabel = null;
            if (serveur.processeur) {
              const formattedCpu = formatCpuLabel(serveur.processeur, serveur.type === "virtuel");
              if (formattedCpu) {
                cpuLabel = formattedCpu;
              }
            }
            let ramLabel = null;
            if (serveur.memoire && serveur.memoire !== "" && serveur.memoire !== null && serveur.memoire !== undefined) {
              const memoireStr = String(serveur.memoire).trim();
              const memoireValue = memoireStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
              const memoireNum = parseFloat(memoireValue);
              if (!Number.isNaN(memoireNum) && memoireNum > 0) {
                ramLabel = `${Math.round(memoireNum)} Go`;
              }
            }
            let storageLabel = null;
            if (serveur.stockage && serveur.stockage !== "" && serveur.stockage !== null && serveur.stockage !== undefined) {
              const stockageStr = String(serveur.stockage).trim();
              const stockageValue = stockageStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
              const stockageNum = parseFloat(stockageValue);
              if (!Number.isNaN(stockageNum) && stockageNum > 0) {
                storageLabel = `${Math.round(stockageNum)} Go`;
              }
            }
            const hasSpecsLine = !!(cpuLabel || ramLabel || storageLabel);
            return <article key={idx} className={styles.serverHealthCard}>
                    <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                      <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                    </span>
                    <div className={styles.cardContent}>
                      {}
                      <div className={styles.healthTitleRow}>
                        <div className={styles.serverTitleMayn}>
                          <h3 className={styles.serverName}>
                            {isVirtual ? <FaCube style={{
                        marginRight: "0.5rem",
                        fontSize: "1rem",
                        verticalAlign: "middle",
                        position: "relative",
                        top: "-2px"
                      }} /> : <FaServer style={{
                        marginRight: "0.5rem",
                        fontSize: "1rem",
                        verticalAlign: "middle",
                        position: "relative",
                        top: "-2px"
                      }} />}
                            {serveur.nom}
                          </h3>
                          {serveur.role && <div className={styles.serverRolesInline}>
                              {(Array.isArray(serveur.role) ? serveur.role : [serveur.role]).map((role, roleIndex) => <span key={roleIndex} className={styles.roleBadge}>
                                  {role}
                                </span>)}
                            </div>}
                        </div>
                        {serveur.expirationGarantie && <div className={styles.serverLicenseRow}>
                            <Icon path={mdiCertificate} size="0.85rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                            <span className={styles.serverLicenseText}>
                              {formatExpirationDate(serveur.expirationGarantie)}
                            </span>
                          </div>}
                      </div>
                      
                      {}
                      {(identityLine || serveur.systeme || vlanIpLine || cpuLabel || ramLabel || storageLabel) && <div className={styles.serverMeta}>
                          {}
                          {identityLine && <span className={styles.serverMetaLine}>
                              {identityLine}
                            </span>}

                          {}
                          {(serveur.systeme || vlanIpLine) && <span className={`${styles.serverMetaLine} ${styles.serverMetaOs}`}>
                              {serveur.systeme && <>
                                  {getOSIcon(serveur.systeme)}
                                  {serveur.systeme}
                                </>}
                              {vlanIpLine && <>
                                  {serveur.systeme && <span className={styles.specSeparator}>-</span>}
                                  <span>{vlanIpLine}</span>
                                </>}
                            </span>}

                          {}
                          {hasSpecsLine && <span className={`${styles.serverMetaLine} ${styles.serverMetaSpecsRow}`}>
                              {cpuLabel && <span className={styles.specItemWithIcon}>
                                  <BsCpu className={styles.specInlineIcon} />
                                  <span>{cpuLabel}</span>
                                </span>}
                              {cpuLabel && (ramLabel || storageLabel) && <span className={styles.specSeparator}>•</span>}
                              {ramLabel && <span className={styles.specItemWithIcon}>
                                  <PiMemory className={styles.specInlineIcon} />
                                  <span>{ramLabel}</span>
                                </span>}
                              {ramLabel && storageLabel && <span className={styles.specSeparator}>•</span>}
                              {storageLabel && <span className={styles.specItemWithIcon}>
                                  <FaHdd className={styles.specInlineIcon} />
                                  <span>{storageLabel}</span>
                                </span>}
                            </span>}
                        </div>}
                      
                      {}
                      <div className={styles.healthScoreAndInfos}>
                        <div className={styles.healthScore}>
                          <div className={styles.healthScoreValueContainer}>
                            <span className={styles.healthScoreValue} style={{
                        color: healthLetter === "A" || healthLetter === "B" ? "#10b981" : healthColor
                      }}>
                              {healthLetter && healthLetter !== "?" ? healthLetter : "--"}
                            </span>
                          </div>
                          <span className={styles.healthScoreLabel}>Health</span>
                          <span className={styles.healthScoreLetter} style={{
                      color: healthLetter === "A" || healthLetter === "B" ? "#10b981" : healthColor
                    }}>
                            {scoreLabel}
                          </span>
                        </div>
                        {}
                        <div className={styles.healthInfos}>
                          <div className={styles.statsAndServicesContainer}>
                            {}
                            <div className={styles.compactStatsGrid2x2}>
                              <div className={styles.compactStatCard}>
                                <PiListMagnifyingGlassLight size="1.5rem" color="#6b7280" />
                                <span className={styles.compactStatValueNeutral}>{servicesCount}</span>
                              </div>
                              <div className={styles.compactStatCard}>
                                {eventsCount && eventsCount > 0 ? <div className={styles.eventsBadge}>
                                    <MdOutlineWifiTetheringError size="1.5rem" color="#ef4444" />
                                    <span className={styles.eventsCount}>{eventsCount}</span>
                                  </div> : <div className={styles.eventsBadge}>
                                    <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                    <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>0</span>
                                  </div>}
                              </div>
                              <div className={styles.compactStatCard}>
                                <MdOutlineNetworkCheck size="1.5rem" color="#6b7280" />
                                <span className={availabilityValue !== null && availabilityValue < 99 ? styles.compactStatValueWarnActive : styles.compactStatValueNeutral}>
                                  {availabilityValue !== null ? `${availabilityValue.toFixed(1)}%` : "NS"}
                                </span>
                              </div>
                            </div>

                            {}
                            <div className={styles.modulesSummary}>
                              <div className={styles.modulesSummaryList}>
                                {serviceMetrics.map(service => {
                            const ServiceIcon = SERVICE_ICONS[service.service] || FaServer;
                            return <div key={`${serveur.nom}-${service.label}`} className={styles.serviceStatCard}>
                                      <ServiceIcon size="1.6rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} className={styles.serviceIcon} />
                                      <div className={styles.serviceStatValues}>
                                        {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40)}
                                      </div>
                                    </div>;
                          })}
                              </div>
                            </div>
                          </div>

                          {}
                        </div>
                      </div>
                      
                    </div>

                    {serverData.comment && <div className={styles.commentBubble} style={{
                color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor
              }}>
                        {serverData.comment}
                      </div>}
                  </article>;
          })}
            </div>
          </div>)}
      </div>
    </div>;
};
export default ServersSummaryCards;
