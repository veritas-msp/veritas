import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiOfficeBuilding, mdiCertificate } from "@mdi/js";
import { FaNetworkWired } from "react-icons/fa";
import { BsCpu } from "react-icons/bs";
import { PiMemory, PiListMagnifyingGlassLight } from "react-icons/pi";
import { TbClockUp } from "react-icons/tb";
import { MdOutlineWifiTetheringError, MdOutlineNetworkCheck, MdOutlineRouter } from "react-icons/md";
import { scoreToLetter, scoreToColor } from "../../../utils/gradeUtils";
import styles from "./ServersSummaryCards.module.css";
const SERVICE_MAPPING = {
  CPU: "CPU",
  RAM: "RAM",
  TRAFIC: "TRAFIC",
  UPTIME: "UPTIME"
};
const defaultServices = ["CPU", "RAM", "TRAFIC", "UPTIME"];
const SERVICE_LABELS = {
  CPU: "CPU",
  RAM: "RAM",
  TRAFIC: "Trafic",
  UPTIME: "Uptime"
};
const SERVICE_ICONS = {
  CPU: BsCpu,
  RAM: PiMemory,
  TRAFIC: MdOutlineRouter,
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
const buildServiceMetrics = (switchData = {}) => {
  return defaultServices.map(service => {
    const mappedServiceName = SERVICE_MAPPING[service] || service;
    const serviceData = switchData[mappedServiceName] || switchData[service] || {};
    return {
      service: service,
      label: SERVICE_LABELS[service] || service,
      ok: parsePercentValue(serviceData.ok ?? serviceData.OK, 100),
      warn: parsePercentValue(serviceData.warn ?? serviceData.WARN, 0),
      crit: parsePercentValue(serviceData.crit ?? serviceData.CRIT, 0)
    };
  });
};
const getServicesCount = (switchData = {}, fallback = 0) => {
  const checkmkServicesTotal = switchData?.checkmkData?.serviceInfo?.total;
  if (typeof checkmkServicesTotal === "number" && checkmkServicesTotal >= 0) {
    return checkmkServicesTotal;
  }
  const checkmkServicesList = switchData?.checkmkData?.services;
  if (Array.isArray(checkmkServicesList)) {
    return checkmkServicesList.length;
  }
  const servicesList = switchData?.services;
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
export const computeSwitchHealthScore = (serverData = {}, {
  eventsCount = null,
  availabilityValue = null,
  isMapped
}) => {
  if (isMapped && !serverData.lastSyncDate) {
    return null;
  }
  const switchData = serverData || {};
  let hasCriticalServices = false;
  if (switchData) {
    defaultServices.forEach(service => {
      const mappedService = SERVICE_MAPPING[service] || service;
      const serviceData = switchData[mappedService] || switchData[service] || {};
      const crit = parseServiceValue(serviceData.crit, 0);
      if (crit > 0) {
        hasCriticalServices = true;
      }
    });
  }
  if (!isMapped) {
    return null;
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
  const eventsWeight = 0.5;
  const availabilityWeight = 0.5;
  let availabilityScore = availabilityValueForCalc;
  if (availabilityValueForCalc < 80) {
    availabilityScore = Math.min(availabilityValueForCalc, 50);
  } else if (availabilityValueForCalc < 95) {
    availabilityScore = Math.min(availabilityValueForCalc, 70);
  }
  score += availabilityScore * availabilityWeight;
  weightSum += availabilityWeight;
  let eventsScore = 100;
  if (periodEventsCount !== undefined) {
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
  if (hasCriticalServices && finalScore > 50) {
    finalScore = Math.min(finalScore, 50);
  }
  return Math.round(finalScore);
};
const getEventsCountValue = (switchData = {}) => {
  if (typeof switchData.eventsCount === "number") {
    return switchData.eventsCount;
  }
  if (Array.isArray(switchData.eventsData)) {
    return switchData.eventsData.length;
  }
  const checkmkEvents = switchData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }
  return null;
};
const getAvailabilityValue = (switchData = {}) => {
  const raw = switchData?.availabilityData?.up ?? switchData?.availability?.up ?? switchData?.availability;
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
const getSwitchStatus = (switchName, switchData = {}) => {
  if (!switchData) return {
    status: "unknown",
    color: "#6b7280"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  defaultServices.forEach(service => {
    const mappedService = SERVICE_MAPPING[service] || service;
    const serviceData = switchData[mappedService] || switchData[service] || {};
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
const getSwitchLetterFromStatus = status => {
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
const renderPieChart = (ok, warn, crit, size = 32, isGreyed = false) => {
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
  const okColor = isGreyed ? "#9ca3af" : "#10b981";
  const warnColor = isGreyed ? "#6b7280" : "#f59e0b";
  const critColor = isGreyed ? "#4b5563" : "#ef4444";
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
        <circle cx={center} cy={center} r={radius} fill={okColor} fillOpacity="1" />
      </svg>;
  }
  if (warnPercent === 100 && okPercent === 0 && critPercent === 0) {
    return <svg width={size} height={size} className={styles.pieChart}>
        <circle cx={center} cy={center} r={radius} fill={warnColor} />
      </svg>;
  }
  if (critPercent === 100 && okPercent === 0 && warnPercent === 0) {
    return <svg width={size} height={size} className={styles.pieChart}>
        <circle cx={center} cy={center} r={radius} fill={critColor} />
      </svg>;
  }
  return <svg width={size} height={size} className={styles.pieChart}>
      {okPercent > 0 && <path d={getArcPath(okStart, okEnd)} fill={okColor} fillOpacity="1" />}
      {warnPercent > 0 && <path d={getArcPath(warnStart, warnEnd)} fill={warnColor} />}
      {critPercent > 0 && <path d={getArcPath(critStart, critEnd)} fill={critColor} />}
    </svg>;
};
const SwitchesSummaryCards = ({
  config,
  data,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const switches = config?.client?.equipements?.Switch || [];
  const switchesData = data || {};
  const filteredSwitches = useMemo(() => {
    if (selectedSites.length > 0) {
      return switches.filter(sw => {
        const equipmentSite = sw?.site ? String(sw.site).trim() : null;
        const siteToCheck = equipmentSite || "No site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return switches;
  }, [switches, selectedSites]);
  const groupedBySite = useMemo(() => {
    const grouped = filteredSwitches.reduce((acc, sw) => {
      const siteName = sw.site || "No site";
      if (!acc[siteName]) acc[siteName] = [];
      acc[siteName].push(sw);
      return acc;
    }, {});
    return grouped;
  }, [filteredSwitches]);
  if (switches.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No switch configured for this client.</p>
        </div>
      </div>;
  }
  if (Object.keys(groupedBySite).length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No switch matches the selected filters.</p>
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
        {siteEntries.map(([siteName, siteSwitches]) => <div key={siteName} className={styles.siteGroup}>
            <div className={styles.siteHeader}>
              <div className={styles.siteHeaderLeft}>
                <Icon path={mdiOfficeBuilding} size="1.1rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                <span className={styles.siteHeaderLabel}>{siteName}</span>
              </div>
            </div>
            <div className={styles.switchesSiteColumn}>
              {siteSwitches.map((sw, idx) => {
            const switchName = sw.nom || sw.netbios || `switch-${idx}`;
            const switchData = switchesData?.[switchName] || {};
            const eventsCount = getEventsCountValue(switchData);
            const availabilityValue = getAvailabilityValue(switchData);
            const serviceMetrics = buildServiceMetrics(switchData);
            const servicesCount = getServicesCount(switchData, serviceMetrics.length);
            const isMapped = Boolean(sw.checkmk_host_name);
            const manualScore = switchData.manualHealthScore;
            const calculatedHealthScore = computeSwitchHealthScore(switchData, {
              eventsCount,
              availabilityValue,
              isMapped
            });
            const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
            const statusFallback = getSwitchStatus(switchName, switchData);
            const healthLetter = resolvedScore !== undefined && resolvedScore !== null ? scoreToLetter(resolvedScore) : getSwitchLetterFromStatus(statusFallback.status);
            const healthColor = resolvedScore !== undefined && resolvedScore !== null ? scoreToColor(resolvedScore) : statusFallback.color;
            const breakdownItems = buildBreakdownItems(servicesCount, eventsCount, availabilityValue, isMapped);
            const scoreLabel = SCORE_LABELS[healthLetter] || "Not rated";
            const identityPartsLeft = [sw.marque || sw.fabricant, sw.modele, sw.sn || sw.numeroSerie ? `S/N ${sw.sn || sw.numeroSerie}` : null].filter(Boolean);
            const identityPartsRight = [sw.ip || sw.general?.ip].filter(Boolean);
            const identityLine = identityPartsLeft.length > 0 ? identityPartsLeft.join(" ") : null;
            const ipLine = identityPartsRight.length > 0 ? identityPartsRight.join(" - ") : null;
            return <article key={idx} className={styles.serverHealthCard} style={isMapped ? {
              gridColumn: 'span 2'
            } : {}}>
                    <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                      <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                    </span>
                    <div className={styles.cardContent}>
                      {}
                      <div className={styles.healthTitleRow}>
                        <div className={styles.serverTitleMayn}>
                          <h3 className={styles.serverName}>
                            <FaNetworkWired style={{
                        marginRight: "0.5rem",
                        fontSize: "1rem",
                        verticalAlign: "middle",
                        position: "relative",
                        top: "-2px"
                      }} />
                            {switchName}
                          </h3>
                        </div>
                        {sw.garantie && <div className={styles.serverLicenseRow}>
                            <Icon path={mdiCertificate} size="0.85rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                            <span className={styles.serverLicenseText}>
                              {formatExpirationDate(sw.garantie)}
                            </span>
                          </div>}
                      </div>
                      
                      {}
                      {(identityLine || ipLine) && <div className={styles.serverMeta}>
                          {}
                          {identityLine && <span className={styles.serverMetaLine}>
                              {identityLine}
                            </span>}

                          {}
                          {ipLine && <span className={styles.serverMetaLine}>
                              {ipLine}
                            </span>}
                        </div>}
                      
                      {}
                      {isMapped && <div className={styles.healthScoreAndInfos}>
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
                                  <span className={styles.compactStatValueNeutral}>
                                    {servicesCount}
                                  </span>
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
                            const ServiceIcon = SERVICE_ICONS[service.service] || FaNetworkWired;
                            return <div key={`${switchName}-${service.label}`} className={styles.serviceStatCard}>
                                        <ServiceIcon size="1.6rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} className={styles.serviceIcon} />
                                        <div className={styles.serviceStatValues}>
                                          {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40, false)}
                                        </div>
                                      </div>;
                          })}
                                </div>
                              </div>
                            </div>

                            {}
                          </div>
                        </div>}
                      
                    </div>

                    {switchData.comment && <div className={styles.commentBubble} style={{
                color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor
              }}>
                        {switchData.comment}
                      </div>}
                  </article>;
          })}
            </div>
          </div>)}
      </div>
    </div>;
};
export default SwitchesSummaryCards;
