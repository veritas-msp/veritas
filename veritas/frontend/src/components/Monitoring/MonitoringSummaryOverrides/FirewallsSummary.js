import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { mdiOfficeBuilding, mdiCertificate } from "@mdi/js";
import { Icon as IconifyIcon } from "@iconify/react";
import { BsCpu } from "react-icons/bs";
import { PiMemory, PiListMagnifyingGlassLight } from "react-icons/pi";
import { TbClockUp } from "react-icons/tb";
import { MdOutlineWifiTetheringError, MdOutlineNetworkCheck } from "react-icons/md";
import { FaNetworkWired } from "react-icons/fa";
import { scoreToLetter, scoreToColor } from "../../../utils/gradeUtils";
import styles from "./ServersSummaryCards.module.css";
const defaultServices = ["CPU", "MEMOIRE", "TRAFIC", "UPTIME"];
const availableModules = ["Cloud Backup", "HA Link", "Memory", "Certificats", "Reports", "CPU", "Temperature", "SD-WAN"];
const SERVICE_LABELS = {
  CPU: "CPU",
  MEMOIRE: "RAM",
  TRAFIC: "Trafic",
  UPTIME: "Uptime"
};
const SERVICE_ICONS = {
  CPU: BsCpu,
  MEMOIRE: PiMemory,
  TRAFIC: FaNetworkWired,
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
const getEventsCountValue = (firewallData = {}) => {
  if (typeof firewallData.eventsCount === "number") {
    return firewallData.eventsCount;
  }
  if (Array.isArray(firewallData.eventsData)) {
    return firewallData.eventsData.length;
  }
  const checkmkEvents = firewallData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }
  return null;
};
const getAvailabilityValue = (firewallData = {}) => {
  const raw = firewallData?.availabilityData?.up ?? firewallData?.availability?.up ?? firewallData?.availability;
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : null;
};
const getServicesCount = (firewallData = {}, fallback = 0) => {
  const checkmkServicesTotal = firewallData?.checkmkData?.serviceInfo?.total;
  if (typeof checkmkServicesTotal === "number" && checkmkServicesTotal >= 0) {
    return checkmkServicesTotal;
  }
  const checkmkServicesList = firewallData?.checkmkData?.services;
  if (Array.isArray(checkmkServicesList)) {
    return checkmkServicesList.length;
  }
  const servicesList = firewallData?.services;
  if (Array.isArray(servicesList)) {
    return servicesList.length;
  }
  return fallback;
};
const buildServiceMetrics = (firewallData = {}) => {
  return defaultServices.map(service => {
    const serviceData = firewallData[service] || {};
    const parse = (val, fallback) => {
      if (val === undefined || val === null || val === "") return fallback;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? fallback : parsed;
    };
    return {
      service: service,
      label: SERVICE_LABELS[service] || service,
      ok: parse(serviceData.ok, 100),
      warn: parse(serviceData.warn, 0),
      crit: parse(serviceData.crit, 0)
    };
  });
};
const getModuleStats = (firewallData = {}) => {
  if (!firewallData?.modules) {
    return {
      active: 0,
      inactive: 0,
      disabled: 0,
      total: 0
    };
  }
  let activeCount = 0;
  let inactiveCount = 0;
  let disabledCount = 0;
  let totalModules = 0;
  availableModules.forEach(module => {
    const moduleStatus = firewallData.modules[module] || "active";
    totalModules++;
    if (moduleStatus === "active") {
      activeCount++;
    } else if (moduleStatus === "inactive") {
      inactiveCount++;
    } else if (moduleStatus === "disabled") {
      disabledCount++;
    }
  });
  return {
    active: activeCount,
    inactive: inactiveCount,
    disabled: disabledCount,
    total: totalModules
  };
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
const getFirewallStatus = (firewallName, firewallData = {}) => {
  if (!firewallData) return {
    status: "unknown",
    color: "#6b7280"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  defaultServices.forEach(service => {
    const serviceData = firewallData[service] || {};
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
const getFirewallLetterFromStatus = status => {
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
export const computeFirewallHealthScore = (firewallData = {}, {
  eventsCount = null,
  availabilityValue = null,
  moduleStats = {
    active: 0,
    inactive: 0,
    disabled: 0,
    total: 0
  },
  isMapped = false
}) => {
  if (isMapped && !firewallData.lastSyncDate) {
    return null;
  }
  const serviceAvailabilityWeight = isMapped ? 0.3 : 0.5;
  let totalScore = 0;
  let weightSum = 0;
  let hasCriticalServices = false;
  let hasEvents = false;
  let hasLowAvailability = false;
  let serviceScore = 0;
  let serviceCount = 0;
  let totalCritRatio = 0;
  defaultServices.forEach(service => {
    const serviceData = firewallData[service] || {};
    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
    const ok = parse(serviceData.ok, 100);
    const warn = parse(serviceData.warn, 0);
    const crit = parse(serviceData.crit, 0);
    if (crit > 0) hasCriticalServices = true;
    const serviceTotal = ok + warn + crit;
    if (serviceTotal > 0) {
      const okRatio = ok / serviceTotal;
      const warnRatio = warn / serviceTotal;
      const critRatio = crit / serviceTotal;
      totalCritRatio += critRatio;
      let critScore = 0;
      if (critRatio > 0.1) {
        critScore = 0;
      } else if (critRatio > 0.05) {
        critScore = critRatio * 15;
      } else {
        critScore = critRatio * 30;
      }
      serviceScore += okRatio * 100 + warnRatio * 50 + critScore;
      serviceCount++;
    }
  });
  if (serviceCount > 0) {
    serviceScore = serviceScore / serviceCount;
    totalCritRatio = totalCritRatio / serviceCount;
    totalScore += serviceScore * serviceAvailabilityWeight;
    weightSum += serviceAvailabilityWeight;
  }
  let eventCount = 0;
  if (isMapped) {
    eventCount = eventsCount !== null && eventsCount !== undefined ? eventsCount : 0;
    if (eventCount > 0) {
      hasEvents = true;
    }
    let eventScore = 100;
    if (eventCount === 0) {
      eventScore = 100;
    } else if (eventCount === 1) {
      eventScore = 70;
    } else if (eventCount <= 3) {
      eventScore = 50;
    } else if (eventCount <= 6) {
      eventScore = 30;
    } else {
      eventScore = 15;
    }
    totalScore += eventScore * 0.2;
    weightSum += 0.2;
  }
  let availabilityValueForCalc = 100;
  if (isMapped && availabilityValue !== null && availabilityValue !== undefined) {
    availabilityValueForCalc = parseFloat(availabilityValue);
    if (availabilityValueForCalc < 95) {
      hasLowAvailability = true;
    }
    let availabilityScore = availabilityValueForCalc;
    if (availabilityValueForCalc < 80) {
      availabilityScore = Math.min(availabilityValueForCalc, 50);
    } else if (availabilityValueForCalc < 95) {
      availabilityScore = Math.min(availabilityValueForCalc, 70);
    }
    totalScore += availabilityScore * 0.3;
    weightSum += 0.3;
  }
  let moduleScore = 100;
  let hasDisabledModules = false;
  if (moduleStats && moduleStats.total > 0) {
    const activeCount = moduleStats.active || 0;
    const inactiveCount = moduleStats.inactive || 0;
    const disabledCount = moduleStats.disabled || 0;
    const totalModules = moduleStats.total;
    if (disabledCount > 0) {
      hasDisabledModules = true;
    }
    moduleScore = (activeCount * 100 + inactiveCount * 100 + disabledCount * 0) / totalModules;
  }
  if (isMapped) {
    totalScore += moduleScore * 0.2;
    weightSum += 0.2;
  } else {
    totalScore += moduleScore * 0.5;
    weightSum += 0.5;
  }
  if (weightSum === 0) return null;
  let finalScore = Math.round(totalScore / weightSum);
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
  if (isMapped && availabilityValueForCalc < 80) {
    finalScore = Math.min(finalScore, 50);
  } else if (isMapped && availabilityValueForCalc < 95) {
    finalScore = Math.min(finalScore, 70);
  }
  if (isMapped && hasEvents && finalScore > 70) {
    finalScore = Math.min(finalScore, 70);
  }
  if (isMapped && eventCount >= 4 && finalScore > 50) {
    finalScore = Math.min(finalScore, 50);
  }
  if (hasDisabledModules && finalScore > 75) {
    finalScore = Math.min(finalScore, 75);
  }
  return finalScore;
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
const FirewallsSummary = ({
  data,
  config,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const firewalls = config?.client?.equipements?.Firewalls || [];
  const firewallsData = data || {};
  const filteredFirewalls = useMemo(() => {
    if (selectedSites && selectedSites.length > 0) {
      return firewalls.filter(fw => {
        const equipmentSite = fw?.site ? String(fw.site).trim() : null;
        const siteToCheck = equipmentSite || "No site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return firewalls;
  }, [firewalls, selectedSites]);
  const groupedBySite = useMemo(() => {
    const grouped = filteredFirewalls.reduce((acc, firewall) => {
      const siteName = firewall.site || "No site";
      if (!acc[siteName]) acc[siteName] = [];
      acc[siteName].push(firewall);
      return acc;
    }, {});
    return grouped;
  }, [filteredFirewalls]);
  if (firewalls.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No firewall configured for this client.</p>
        </div>
      </div>;
  }
  if (Object.keys(groupedBySite).length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No firewall matches the selected filters.</p>
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
        {siteEntries.map(([siteName, siteFirewalls]) => <div key={siteName} className={styles.siteGroup}>
            <div className={styles.siteHeader}>
              <div className={styles.siteHeaderLeft}>
                <Icon path={mdiOfficeBuilding} size="1.1rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                <span className={styles.siteHeaderLabel}>{siteName}</span>
              </div>
            </div>
            <div className={`${styles.siteColumn} ${siteCount === 1 ? styles.siteColumnGrid2x2 : ''}`}>
              {[...siteFirewalls].sort((a, b) => {
            const aIsPrimary = a.roleHA === "Primary";
            const bIsPrimary = b.roleHA === "Primary";
            if (aIsPrimary && !bIsPrimary) return -1;
            if (!aIsPrimary && bIsPrimary) return 1;
            return (a.nom || "").localeCompare(b.nom || "");
          }).map((firewall, idx) => {
            const firewallData = firewallsData?.[firewall.nom] || {};
            const eventsCount = getEventsCountValue(firewallData);
            const availabilityValue = getAvailabilityValue(firewallData);
            const moduleStats = getModuleStats(firewallData);
            const serviceMetrics = buildServiceMetrics(firewallData);
            const servicesCount = getServicesCount(firewallData, serviceMetrics.length);
            const isMapped = Boolean(firewall.checkmk_host_name);
            const manualScore = firewallData.manualHealthScore;
            const calculatedHealthScore = computeFirewallHealthScore(firewallData, {
              eventsCount,
              availabilityValue,
              moduleStats,
              isMapped
            });
            const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
            const statusFallback = getFirewallStatus(firewall.nom, firewallData);
            const healthLetter = resolvedScore !== undefined && resolvedScore !== null ? scoreToLetter(resolvedScore) : getFirewallLetterFromStatus(statusFallback.status);
            const healthColor = resolvedScore !== undefined && resolvedScore !== null ? scoreToColor(resolvedScore) : statusFallback.color;
            const breakdownItems = buildBreakdownItems(servicesCount, eventsCount, availabilityValue, isMapped);
            const scoreLabel = SCORE_LABELS[healthLetter] || "Not rated";
            const identityPartsLeft = [firewall.fabricant || firewall.marque, firewall.modele, firewall.numeroSerie ? `S/N ${firewall.numeroSerie}` : null].filter(Boolean);
            const identityPartsRight = [firewall.vlan ? `VLAN ${firewall.vlan}` : null, firewall.ip].filter(Boolean);
            const identityLine = identityPartsLeft.length > 0 ? identityPartsLeft.join(" ") : null;
            const vlanIpLine = identityPartsRight.length > 0 ? identityPartsRight.join(" - ") : null;
            const haInfo = firewall.modeHA ? {
              role: firewall.roleHA
            } : null;
            return <article key={idx} className={styles.serverHealthCard}>
                    <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                      <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                    </span>
                    <div className={styles.cardContent}>
                      {}
                      <div className={styles.healthTitleRow}>
                        <div className={styles.serverTitleMayn}>
                          <h3 className={styles.serverName}>
                            <IconifyIcon icon="solar:shield-bold" width={20} height={20} style={{
                        marginRight: "0.5rem",
                        verticalAlign: "middle",
                        position: "relative",
                        top: "-2px"
                      }} />
                            {firewall.nom}
                          </h3>
                          {haInfo && <div className={styles.serverRolesInline}>
                              <span className={styles.roleBadge}>
                                HA {haInfo.role}
                              </span>
                            </div>}
                        </div>
                        {firewall.expirationGarantie && <div className={styles.serverLicenseRow}>
                            <Icon path={mdiCertificate} size="0.85rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                            <span className={styles.serverLicenseText}>
                              {formatExpirationDate(firewall.expirationGarantie)}
                            </span>
                          </div>}
                      </div>
                      
                      {}
                      {(identityLine || firewall.firmware || vlanIpLine) && <div className={styles.serverMeta}>
                          {}
                          {identityLine && <span className={styles.serverMetaLine}>
                              {identityLine}
                            </span>}

                          {}
                          {(firewall.firmware || vlanIpLine) && <span className={`${styles.serverMetaLine} ${styles.serverMetaOs}`}>
                              {firewall.firmware && <>
                                  <span>FW {firewall.firmware}</span>
                                </>}
                              {vlanIpLine && <>
                                  {firewall.firmware && <span className={styles.specSeparator}>-</span>}
                                  <span>{vlanIpLine}</span>
                                </>}
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
                            const ServiceIcon = SERVICE_ICONS[service.service] || BsCpu;
                            return <div key={`${firewall.nom}-${service.label}`} className={styles.serviceStatCard}>
                                      <ServiceIcon size="1.6rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} className={styles.serviceIcon} />
                                      <div className={styles.serviceStatValues}>
                                        {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40)}
                                      </div>
                                    </div>;
                          })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                    </div>

                    {firewallData.comment && <div className={styles.commentBubble} style={{
                color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor
              }}>
                        {firewallData.comment}
                      </div>}
                  </article>;
          })}
            </div>
          </div>)}
      </div>
    </div>;
};
export default FirewallsSummary;
