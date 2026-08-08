import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiOfficeBuilding, mdiCertificate, mdiNas, mdiServerNetworkOutline, mdiHarddisk, mdiVhs } from "@mdi/js";
import { FaHdd } from "react-icons/fa";
import { BsCpu } from "react-icons/bs";
import { PiMemory, PiListMagnifyingGlassLight } from "react-icons/pi";
import { TbClockUp } from "react-icons/tb";
import { MdOutlineWifiTetheringError, MdOutlineNetworkCheck } from "react-icons/md";
import { scoreToLetter, scoreToColor } from "../../../utils/gradeUtils";
import styles from "./ServersSummaryCards.module.css";
const defaultServices = ["CPU", "MEMOIRE", "DISQUE", "UPTIME"];
const SERVICE_LABELS = {
  CPU: "CPU",
  MEMOIRE: "RAM",
  DISQUE: "STOCKAGE",
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
const convertCapacityToGo = capacity => {
  if (!capacity) return 0;
  const capacityStr = capacity.toString().toUpperCase();
  if (capacityStr.includes("TB")) {
    const value = parseFloat(capacityStr.replace("TB", ""));
    return Math.round(value * 1024);
  }
  if (capacityStr.includes("GB") || capacityStr.includes("GO")) {
    const value = parseFloat(capacityStr.replace(/GB|GO/, ""));
    return Math.round(value);
  }
  if (capacityStr.includes("MB")) {
    const value = parseFloat(capacityStr.replace("MB", ""));
    return Math.round(value / 1024);
  }
  const n = parseFloat(capacityStr);
  return Number.isNaN(n) ? 0 : Math.round(n);
};
const formatCapacity = goValue => {
  if (!goValue || goValue === 0) return {
    value: 0,
    unit: "Go",
    display: "0 Go"
  };
  if (goValue >= 1024) {
    const toValue = (goValue / 1024).toFixed(2);
    return {
      value: goValue,
      unit: "To",
      display: `${parseFloat(toValue)} To`
    };
  }
  return {
    value: goValue,
    unit: "Go",
    display: `${goValue} Go`
  };
};
const parsePercentValue = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};
const buildServiceMetrics = (storageData = {}) => {
  return defaultServices.map(service => {
    const serviceData = storageData[service] || {};
    return {
      service: service,
      label: SERVICE_LABELS[service] || service,
      ok: parsePercentValue(serviceData.ok ?? serviceData.OK, 100),
      warn: parsePercentValue(serviceData.warn ?? serviceData.WARN, 0),
      crit: parsePercentValue(serviceData.crit ?? serviceData.CRIT, 0)
    };
  });
};
const getServicesCount = (storageData = {}, fallback = 0) => {
  const checkmkServicesTotal = storageData?.checkmkData?.serviceInfo?.total;
  if (typeof checkmkServicesTotal === "number" && checkmkServicesTotal >= 0) {
    return checkmkServicesTotal;
  }
  const checkmkServicesList = storageData?.checkmkData?.services;
  if (Array.isArray(checkmkServicesList)) {
    return checkmkServicesList.length;
  }
  const servicesList = storageData?.services;
  if (Array.isArray(servicesList)) {
    return servicesList.length;
  }
  return fallback;
};
const getEventsCountValue = (storageData = {}) => {
  if (typeof storageData.eventsCount === "number") {
    return storageData.eventsCount;
  }
  if (Array.isArray(storageData.eventsData)) {
    return storageData.eventsData.length;
  }
  const checkmkEvents = storageData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }
  return null;
};
const getAvailabilityValue = (storageData = {}) => {
  const raw = storageData?.availabilityData?.up ?? storageData?.availability?.up ?? storageData?.availability;
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : null;
};
const computeStorageHealthScore = (storageName, storageConfig, storageData = {}) => {
  const isMapped = Boolean(storageConfig?.checkmk_host_name);
  const hasSyncData = Boolean(storageData?.lastSyncDate);
  if (isMapped && !hasSyncData) {
    return null;
  }
  if (!storageData) return null;
  const servicesCoverageWeight = isMapped ? 0.15 : 0;
  const eventsWeight = isMapped ? 0.15 : 0;
  const availabilityWeight = isMapped ? 0.15 : 0;
  const diskWeight = isMapped ? 0.25 : 0.4;
  const spaceWeight = isMapped ? 0.15 : 0.3;
  const serviceTableWeight = isMapped ? 0.15 : 0.3;
  let totalScore = 0;
  let weightSum = 0;
  if (servicesCoverageWeight > 0) {
    let servicesCoverageScore = 100;
    const checkmkData = storageData?.checkmkData;
    const servicesInfo = checkmkData?.serviceInfo;
    const totalServices = servicesInfo?.total ?? checkmkData?.services?.length ?? 0;
    const expectedServices = defaultServices.length || 1;
    if (totalServices > 0) {
      const ratio = Math.min(1, totalServices / expectedServices);
      servicesCoverageScore = Math.round(ratio * 100);
    } else if (checkmkData) {
      servicesCoverageScore = 30;
    }
    totalScore += servicesCoverageScore * servicesCoverageWeight;
    weightSum += servicesCoverageWeight;
  }
  const diskStates = storageData.diskStates || {};
  const currentDisks = parseInt(storageConfig?.nbDisquesActuels) || 0;
  let okCount = 0;
  let warnCount = 0;
  let critCount = 0;
  if (currentDisks > 0 && diskWeight > 0) {
    for (let i = 0; i < currentDisks; i++) {
      const state = diskStates[i] || 'ok';
      if (state === 'ok') okCount++;else if (state === 'warn') warnCount++;else if (state === 'crit') critCount++;
    }
    const okRatio = okCount / currentDisks;
    const warnRatio = warnCount / currentDisks;
    const critRatio = critCount / currentDisks;
    let diskScore = okRatio * 100 + warnRatio * 40 + critRatio * 0;
    if (critRatio > 0) {
      diskScore = Math.min(diskScore, 30);
    } else if (warnRatio > 0) {
      diskScore = Math.min(diskScore, 60);
    }
    totalScore += diskScore * diskWeight;
    weightSum += diskWeight;
  }
  const usedSpace = parseInt(storageData.espaceUtiliseGo) || 0;
  const totalSpace = convertCapacityToGo(storageConfig?.capacite);
  if (totalSpace > 0 && usedSpace >= 0 && spaceWeight > 0) {
    const usagePercentage = usedSpace / totalSpace * 100;
    let spaceScore = 100;
    if (usagePercentage >= 90) {
      spaceScore = 0;
    } else if (usagePercentage >= 75) {
      spaceScore = 50;
    } else if (usagePercentage >= 50) {
      spaceScore = 75;
    } else {
      spaceScore = 100;
    }
    totalScore += spaceScore * spaceWeight;
    weightSum += spaceWeight;
  }
  let hasEvents = false;
  let eventCount = 0;
  if (eventsWeight > 0) {
    eventCount = storageData.eventsCount || 0;
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
    totalScore += eventScore * eventsWeight;
    weightSum += eventsWeight;
  }
  let availabilityValue = 100;
  let hasLowAvailability = false;
  if (availabilityWeight > 0) {
    const availabilityData = storageData?.availabilityData;
    if (availabilityData) {
      availabilityValue = parseFloat(availabilityData.up || 0);
      if (availabilityValue < 95) {
        hasLowAvailability = true;
      }
    }
    let availabilityScore = availabilityValue;
    if (availabilityValue < 80) {
      availabilityScore = Math.min(availabilityValue, 50);
    } else if (availabilityValue < 95) {
      availabilityScore = Math.min(availabilityValue, 70);
    }
    totalScore += availabilityScore * availabilityWeight;
    weightSum += availabilityWeight;
  }
  if (serviceTableWeight > 0) {
    let serviceTableScore = 0;
    let serviceTableCount = 0;
    defaultServices.forEach(service => {
      const serviceData = storageData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      const ok = parse(serviceData.ok, 100);
      const warn = parse(serviceData.warn, 0);
      const crit = parse(serviceData.crit, 0);
      const serviceTotal = ok + warn + crit;
      if (serviceTotal > 0) {
        const okRatio = ok / serviceTotal;
        const warnRatio = warn / serviceTotal;
        const critRatio = crit / serviceTotal;
        let critScore = 0;
        if (critRatio > 0.1) {
          critScore = 0;
        } else if (critRatio > 0.05) {
          critScore = critRatio * 15;
        } else {
          critScore = critRatio * 30;
        }
        serviceTableScore += okRatio * 100 + warnRatio * 50 + critScore;
        serviceTableCount++;
      }
    });
    if (serviceTableCount > 0) {
      serviceTableScore = serviceTableScore / serviceTableCount;
    } else {
      serviceTableScore = 100;
    }
    totalScore += serviceTableScore * serviceTableWeight;
    weightSum += serviceTableWeight;
  }
  if (weightSum === 0) return null;
  let finalScore = Math.round(totalScore / weightSum);
  if (critCount > 0) {
    finalScore = Math.min(finalScore, 30);
  } else if (warnCount > 0) {
    finalScore = Math.min(finalScore, 60);
  }
  if (isMapped && availabilityValue < 80) {
    finalScore = Math.min(finalScore, 50);
  } else if (isMapped && availabilityValue < 95) {
    finalScore = Math.min(finalScore, 70);
  }
  if (isMapped && hasEvents && finalScore > 70) {
    finalScore = Math.min(finalScore, 70);
  }
  if (isMapped && eventCount >= 4 && finalScore > 50) {
    finalScore = Math.min(finalScore, 50);
  }
  return finalScore;
};
const getStorageStatus = (storageName, storageData = {}) => {
  if (!storageData) return {
    status: "unknown",
    color: "#6b7280"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  defaultServices.forEach(service => {
    const serviceData = storageData[service] || {};
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
const getStorageLetterFromStatus = status => {
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
const DiskVisual = ({
  current,
  max,
  diskStates = {}
}) => {
  const circles = [];
  for (let i = 0; i < max; i++) {
    const isFilled = i < current;
    const diskState = diskStates[i] || 'ok';
    let diskColor = '#9ca3af';
    if (isFilled) {
      if (diskState === 'crit') {
        diskColor = '#ef4444';
      } else if (diskState === 'warn') {
        diskColor = '#f59e0b';
      } else {
        diskColor = '#10b981';
      }
    }
    circles.push(<div key={i} style={{
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: diskColor,
      border: isFilled ? 'none' : '1px solid #d1d5db',
      display: 'inline-block',
      marginRight: '4px'
    }} title={`Disk ${i + 1} ${isFilled ? `(${diskState.toUpperCase()})` : '(empty)'}`} />);
  }
  return <div style={{
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
    paddingTop: '3px'
  }}>
            {circles}
        </div>;
};
const StorageProgress = ({
  used,
  total,
  unit = "Go"
}) => {
  const percentage = total > 0 ? Math.round(used / total * 100) : 0;
  const reMayning = total - used;
  let progressColor = "#10b981";
  if (percentage >= 90) {
    progressColor = "#ef4444";
  } else if (percentage >= 75) {
    progressColor = "#f59e0b";
  } else if (percentage >= 50) {
    progressColor = "#eab308";
  }
  return <div style={{
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  }}>
      <div style={{
      width: '100%',
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative'
    }}>
        <div style={{
        width: `${percentage}%`,
        height: '100%',
        backgroundColor: progressColor,
        transition: 'width 0.3s ease'
      }} />
            </div>
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.7rem',
      color: '#6b7280'
    }}>
        <span>{reMayning} {unit} disponible</span>
        <span style={{
        fontWeight: '600'
      }}>{percentage}%</span>
            </div>
        </div>;
};
const getStorageTypeIcon = storageType => {
  switch (storageType) {
    case 'NAS':
      return mdiNas;
    case 'SAN':
      return mdiServerNetworkOutline;
    case 'DISQUE':
    case 'Disk dur externe':
      return mdiHarddisk;
    case 'RDX':
    case 'Backup robot':
      return mdiVhs;
    default:
      return mdiNas;
  }
};
const StorageSummary = ({
  data = {},
  config,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const rawStorages = useMemo(() => {
    const list1 = config?.client?.equipements?.Storage || [];
    const nasList = config?.client?.equipements?.NAS || [];
    const sanList = config?.client?.equipements?.SAN || [];
    return [...list1, ...nasList, ...sanList].filter(Boolean);
  }, [config]);
  const storageData = data || {};
  const filteredStorages = useMemo(() => {
    if (selectedSites && selectedSites.length > 0) {
      return rawStorages.filter(stg => {
        const equipmentSite = stg?.site ? String(stg.site).trim() : null;
        const siteToCheck = equipmentSite || "No site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return rawStorages;
  }, [rawStorages, selectedSites]);
  const groupedBySite = useMemo(() => {
    const grouped = filteredStorages.reduce((acc, storage) => {
      const siteName = storage.site || "No site";
      if (!acc[siteName]) acc[siteName] = [];
      acc[siteName].push(storage);
      return acc;
    }, {});
    Object.keys(grouped).forEach(siteName => {
      grouped[siteName].sort((a, b) => {
        const getTypeOrder = type => {
          if (type === 'SAN') return 1;
          if (type === 'NAS') return 2;
          if (type === 'Disk dur externe' || type === 'DISQUE') return 3;
          if (type === 'Backup robot' || type === 'RDX') return 4;
          return 99;
        };
        const getStorageType = storage => {
          let type = storage.type;
          if (!type) {
            if (storage.nbDisquesActuels && storage.nbDisquesActuels > 0) {
              type = "SAN";
            } else {
              type = "NAS";
            }
          }
          return type;
        };
        const typeA = getStorageType(a);
        const typeB = getStorageType(b);
        const orderA = getTypeOrder(typeA);
        const orderB = getTypeOrder(typeB);
        if (orderA !== orderB) return orderA - orderB;
        return (a.nom || "").localeCompare(b.nom || "");
      });
    });
    return grouped;
  }, [filteredStorages]);
  if (rawStorages.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No storage configured for this client.</p>
        </div>
      </div>;
  }
  if (Object.keys(groupedBySite).length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
          <p>No storage matches the selected filters.</p>
                </div>
            </div>;
  }
  const siteEntries = Object.entries(groupedBySite).sort(([siteA], [siteB]) => {
    if (siteA === "No site") return 1;
    if (siteB === "No site") return -1;
    const clientSites = config?.client?.sites || [];
    const indexA = clientSites.indexOf(siteA);
    const indexB = clientSites.indexOf(siteB);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return siteA.localeCompare(siteB);
  });
  const siteCount = siteEntries.length;
  const isSingleSite = siteCount === 1;
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.serversGridBySite} style={{
      gridTemplateColumns: `repeat(${siteCount}, minmax(0, 1fr))`
    }}>
        {siteEntries.map(([siteName, siteStorages]) => <div key={siteName} className={styles.siteGroup}>
            <div className={styles.siteHeader}>
              <div className={styles.siteHeaderLeft}>
                <Icon path={mdiOfficeBuilding} size="1.1rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                <span className={styles.siteHeaderLabel}>{siteName}</span>
                    </div>
                </div>
            <div className={styles.siteColumn} style={isSingleSite ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1rem'
        } : undefined}>
              {(() => {
            const getStorageType = storage => {
              let type = storage.type;
              if (!type) {
                if (storage.nbDisquesActuels && storage.nbDisquesActuels > 0) {
                  type = "SAN";
                } else {
                  type = "NAS";
                }
              }
              return type;
            };
            const sanStorages = siteStorages.filter(s => getStorageType(s) === 'SAN');
            const nasStorages = siteStorages.filter(s => getStorageType(s) === 'NAS');
            const disquesExternes = siteStorages.filter(s => {
              const type = getStorageType(s);
              return type === 'Disk dur externe' || type === 'DISQUE';
            });
            const robotsBackup = siteStorages.filter(s => {
              const type = getStorageType(s);
              return type === 'Backup robot' || type === 'RDX';
            });
            const renderDisqueExterne = (storage, idx) => {
              const stgData = storageData?.[storage.nom] || {};
              const totalSpace = convertCapacityToGo(storage.capacite);
              const isMapped = Boolean(storage.checkmk_host_name);
              const subtitleParts = [storage.fabricant, storage.modele, storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null].filter(Boolean);
              const subtitleLine = subtitleParts.length > 0 ? [subtitleParts.join(" "), storage.raid ? `RAID ${storage.raid}` : null, storage.ip].filter(Boolean).join(" - ") : null;
              return <article key={idx} className={styles.serverHealthCard}>
                      <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                        <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                      </span>
                      <div className={styles.cardContent}>
                        {}
                        <div className={styles.healthTitleRow}>
                          <div className={styles.serverTitleMayn}>
                            <h3 className={styles.serverName}>
                              <Icon path={mdiHarddisk} size="1rem" style={{
                          marginRight: "0.5rem",
                          verticalAlign: "middle",
                          position: "relative",
                          top: "-2px"
                        }} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                              {storage.nom}
                            </h3>
                          </div>
                        </div>

                        {}
                        {subtitleLine && <div className={styles.serverMeta}>
                            <span className={styles.serverMetaLine}>
                              {subtitleLine}
                            </span>
                          </div>}

                        {}
                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem 1rem',
                    gap: '1rem'
                  }}>
                          <Icon path={mdiHarddisk} size="4rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                          
                          {}
                          {totalSpace > 0 && (() => {
                      const totalFormatted = formatCapacity(totalSpace);
                      return <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: theme === "dark" ? "#9ca3af" : "#6b7280",
                        textAlign: 'center'
                      }}>
                                {totalFormatted.display}
                              </div>;
                    })()}
                        </div>
                      </div>

                      {}
                      {stgData.comment && <div className={styles.commentBubble} style={{
                  marginTop: '1rem'
                }}>
                          {stgData.comment}
                        </div>}
                    </article>;
            };
            return <>
                    {}
                    {sanStorages.map((storage, idx) => {
                const stgData = storageData?.[storage.nom] || {};
                const storageType = storage.type || "NAS";
                const storageIcon = getStorageTypeIcon(storageType);
                const eventsCount = getEventsCountValue(stgData);
                const availabilityValue = getAvailabilityValue(stgData);
                const serviceMetrics = buildServiceMetrics(stgData);
                const servicesCount = getServicesCount(stgData, serviceMetrics.length);
                const isMapped = Boolean(storage.checkmk_host_name);
                const manualScore = stgData.manualHealthScore;
                const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
                const statusFallback = getStorageStatus(storage.nom, stgData);
                const healthLetter = resolvedScore !== undefined && resolvedScore !== null ? scoreToLetter(resolvedScore) : getStorageLetterFromStatus(statusFallback.status);
                const healthColor = resolvedScore !== undefined && resolvedScore !== null ? scoreToColor(resolvedScore) : statusFallback.color;
                const scoreLabel = SCORE_LABELS[healthLetter] || "Not rated";
                const subtitleParts = [storage.fabricant, storage.modele, storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null].filter(Boolean);
                const subtitleLine = subtitleParts.length > 0 ? [subtitleParts.join(" "), storage.raid ? `RAID ${storage.raid}` : null, storage.ip].filter(Boolean).join(" - ") : null;
                const totalSpace = convertCapacityToGo(storage.capacite);
                const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                const diskStates = stgData?.diskStates || {};
                const usedSpace = parseInt(stgData?.espaceUtiliseGo) || 0;
                return <article key={`san-${idx}`} className={styles.serverHealthCard}>
                          <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                            <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                          </span>
                          <div className={styles.cardContent}>
                            {}
                            <div className={styles.healthTitleRow}>
                              <div className={styles.serverTitleMayn}>
                                <h3 className={styles.serverName}>
                                  <Icon path={storageIcon} size="1rem" style={{
                            marginRight: "0.5rem",
                            verticalAlign: "middle",
                            position: "relative",
                            top: "-2px"
                          }} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                                  {storage.nom}
                                </h3>
                                {storage.role && <div className={styles.serverRolesInline}>
                                    {(Array.isArray(storage.role) ? storage.role : [storage.role]).map((role, roleIndex) => <span key={roleIndex} className={styles.roleBadge}>
                                        {role}
                                      </span>)}
                                  </div>}
                              </div>
                              {storage.expirationGarantie && <div className={styles.serverLicenseRow}>
                                  <Icon path={mdiCertificate} size="0.85rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                                  <span className={styles.serverLicenseText}>
                                    {formatExpirationDate(storage.expirationGarantie)}
                                  </span>
                                </div>}
                            </div>

                            {}
                            {subtitleLine && <div className={styles.serverMeta}>
                                <span className={styles.serverMetaLine}>
                                  {subtitleLine}
                                </span>
                              </div>}

                            {}
                            {maxDisks > 0 && <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      marginTop: '0.25rem',
                      marginBottom: '0.5rem'
                    }}>
                                <span style={{
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                                  Disk status
                                </span>
                                <DiskVisual current={currentDisks} max={maxDisks} diskStates={diskStates} />
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
                                      <span className={styles.compactStatValueNeutral}>
                                        {isMapped ? servicesCount : "N/A"}
                                      </span>
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      {!isMapped ? <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>N/A</span>
                                        </div> : eventsCount && eventsCount > 0 ? <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#ef4444" />
                                          <span className={styles.eventsCount}>{eventsCount}</span>
                                        </div> : <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>0</span>
                                        </div>}
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      <MdOutlineNetworkCheck size="1.5rem" color="#6b7280" />
                                      <span className={!isMapped ? styles.compactStatValueNeutral : availabilityValue !== null && availabilityValue < 99 ? styles.compactStatValueWarnActive : styles.compactStatValueNeutral}>
                                        {!isMapped ? "N/A" : availabilityValue !== null ? `${availabilityValue.toFixed(1)}%` : "NS"}
                                      </span>
                                    </div>
                                  </div>

                                  {}
                                  <div className={styles.modulesSummary}>
                                    <div className={styles.modulesSummaryList}>
                                      {serviceMetrics.map(service => {
                                const ServiceIcon = SERVICE_ICONS[service.service] || FaHdd;
                                const hasData = Number(service.ok) + Number(service.warn) + Number(service.crit) > 0;
                                const shouldGrey = !isMapped && !hasData;
                                return <div key={`${storage.nom}-${service.label}`} className={styles.serviceStatCard}>
                                            <ServiceIcon size="1.6rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} className={styles.serviceIcon} />
                                            <div className={styles.serviceStatValues}>
                                              {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40, shouldGrey)}
                                            </div>
                                          </div>;
                              })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {stgData.comment && <div className={styles.commentBubble} style={{
                    color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor
                  }}>
                              {stgData.comment}
                            </div>}
                        </article>;
              })}

                    {}
                    {nasStorages.map((storage, idx) => {
                const stgData = storageData?.[storage.nom] || {};
                const storageType = storage.type || "NAS";
                const storageIcon = getStorageTypeIcon(storageType);
                const eventsCount = getEventsCountValue(stgData);
                const availabilityValue = getAvailabilityValue(stgData);
                const serviceMetrics = buildServiceMetrics(stgData);
                const servicesCount = getServicesCount(stgData, serviceMetrics.length);
                const isMapped = Boolean(storage.checkmk_host_name);
                const manualScore = stgData.manualHealthScore;
                const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
                const statusFallback = getStorageStatus(storage.nom, stgData);
                const healthLetter = resolvedScore !== undefined && resolvedScore !== null ? scoreToLetter(resolvedScore) : getStorageLetterFromStatus(statusFallback.status);
                const healthColor = resolvedScore !== undefined && resolvedScore !== null ? scoreToColor(resolvedScore) : statusFallback.color;
                const scoreLabel = SCORE_LABELS[healthLetter] || "Not rated";
                const subtitleParts = [storage.fabricant, storage.modele, storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null].filter(Boolean);
                const subtitleLine = subtitleParts.length > 0 ? [subtitleParts.join(" "), storage.raid ? `RAID ${storage.raid}` : null, storage.ip].filter(Boolean).join(" - ") : null;
                const totalSpace = convertCapacityToGo(storage.capacite);
                const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                const diskStates = stgData?.diskStates || {};
                const usedSpace = parseInt(stgData?.espaceUtiliseGo) || 0;
                return <article key={`nas-${idx}`} className={styles.serverHealthCard}>
                          <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                            <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                          </span>
                          <div className={styles.cardContent}>
                            {}
                            <div className={styles.healthTitleRow}>
                              <div className={styles.serverTitleMayn}>
                                <h3 className={styles.serverName}>
                                  <Icon path={storageIcon} size="1rem" style={{
                            marginRight: "0.5rem",
                            verticalAlign: "middle",
                            position: "relative",
                            top: "-2px"
                          }} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                                  {storage.nom}
                                </h3>
                                {storage.role && <div className={styles.serverRolesInline}>
                                    {(Array.isArray(storage.role) ? storage.role : [storage.role]).map((role, roleIndex) => <span key={roleIndex} className={styles.roleBadge}>
                                        {role}
                                      </span>)}
                                  </div>}
                              </div>
                              {storage.expirationGarantie && <div className={styles.serverLicenseRow}>
                                  <Icon path={mdiCertificate} size="0.85rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                                  <span className={styles.serverLicenseText}>
                                    {formatExpirationDate(storage.expirationGarantie)}
                                  </span>
                                </div>}
                            </div>

                            {}
                            {subtitleLine && <div className={styles.serverMeta}>
                                <span className={styles.serverMetaLine}>
                                  {subtitleLine}
                                </span>
                              </div>}

                            {}
                            <div style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '1rem',
                      marginTop: '0.25rem',
                      marginBottom: '0.5rem',
                      alignItems: 'flex-start'
                    }}>
                              {}
                              {maxDisks > 0 && <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        flex: '0 0 auto'
                      }}>
                                  <span style={{
                          fontSize: '0.7rem',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                                    Disk status
                                  </span>
                                  <DiskVisual current={currentDisks} max={maxDisks} diskStates={diskStates} />
                                </div>}
                              
                              {}
                              {totalSpace > 0 && (() => {
                        const percentage = Math.round(usedSpace / totalSpace * 100);
                        const usedFormatted = formatCapacity(usedSpace);
                        const totalFormatted = formatCapacity(totalSpace);
                        const progressColor = percentage >= 90 ? '#ef4444' : percentage >= 75 ? '#f59e0b' : percentage >= 50 ? '#eab308' : '#10b981';
                        return <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          flex: '1 1 auto',
                          minWidth: '200px'
                        }}>
                                    <span style={{
                            fontSize: '0.7rem',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                                      Storage
                                    </span>
                                    <div style={{
                            width: '100%',
                            height: '20px',
                            backgroundColor: theme === 'dark' ? '#3a3a5a' : '#e5e7eb',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                                      {}
                                      <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              backgroundColor: progressColor,
                              transition: 'width 0.3s ease'
                            }} />
                                      
                                      {}
                                      <div style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: theme === 'dark' ? '#e5e7eb' : '#111827',
                              whiteSpace: 'nowrap',
                              zIndex: 1
                            }}>
                                        {usedFormatted.value} / {totalFormatted.value} {totalFormatted.unit}
                                      </div>
                                      
                                      {}
                                      <div style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: progressColor,
                              whiteSpace: 'nowrap',
                              zIndex: 1
                            }}>
                                        {percentage}%
                                      </div>
                                    </div>
                                  </div>;
                      })()}
                            </div>
                            
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
                                      <span className={styles.compactStatValueNeutral}>
                                        {isMapped ? servicesCount : "N/A"}
                                      </span>
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      {!isMapped ? <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>N/A</span>
                                        </div> : eventsCount && eventsCount > 0 ? <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#ef4444" />
                                          <span className={styles.eventsCount}>{eventsCount}</span>
                                        </div> : <div className={styles.eventsBadge}>
                                          <MdOutlineWifiTetheringError size="1.5rem" color="#6b7280" />
                                          <span className={`${styles.eventsCount} ${styles.eventsCountZero}`}>0</span>
                                        </div>}
                                    </div>
                                    <div className={styles.compactStatCard}>
                                      <MdOutlineNetworkCheck size="1.5rem" color="#6b7280" />
                                      <span className={!isMapped ? styles.compactStatValueNeutral : availabilityValue !== null && availabilityValue < 99 ? styles.compactStatValueWarnActive : styles.compactStatValueNeutral}>
                                        {!isMapped ? "N/A" : availabilityValue !== null ? `${availabilityValue.toFixed(1)}%` : "NS"}
                                      </span>
                                    </div>
                                  </div>

                                  {}
                                  <div className={styles.modulesSummary}>
                                    <div className={styles.modulesSummaryList}>
                                      {serviceMetrics.map(service => {
                                const ServiceIcon = SERVICE_ICONS[service.service] || FaHdd;
                                const hasData = Number(service.ok) + Number(service.warn) + Number(service.crit) > 0;
                                const shouldGrey = !isMapped && !hasData;
                                return <div key={`${storage.nom}-${service.label}`} className={styles.serviceStatCard}>
                                            <ServiceIcon size="1.6rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} className={styles.serviceIcon} />
                                            <div className={styles.serviceStatValues}>
                                              {renderPieChart(Number(service.ok), Number(service.warn), Number(service.crit), 40, shouldGrey)}
                                            </div>
                                          </div>;
                              })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {stgData.comment && <div className={styles.commentBubble} style={{
                    color: healthLetter === "A" || healthLetter === "B" ? undefined : healthColor
                  }}>
                              {stgData.comment}
                            </div>}
                        </article>;
              })}

                    {}
                    {disquesExternes.length > 0 && <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(disquesExternes.length, 3)}, 1fr)`,
                gap: '0.75rem',
                marginBottom: robotsBackup.length > 0 ? '0.75rem' : '0'
              }}>
                        {disquesExternes.map((storage, idx) => renderDisqueExterne(storage, idx))}
                      </div>}

                    {}
                    {robotsBackup.map((storage, idx) => {
                const stgData = storageData?.[storage.nom] || {};
                const storageType = storage.type || "NAS";
                const storageIcon = getStorageTypeIcon(storageType);
                const eventsCount = getEventsCountValue(stgData);
                const availabilityValue = getAvailabilityValue(stgData);
                const serviceMetrics = buildServiceMetrics(stgData);
                const servicesCount = getServicesCount(stgData, serviceMetrics.length);
                const isMapped = Boolean(storage.checkmk_host_name);
                const manualScore = stgData.manualHealthScore;
                const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
                const statusFallback = getStorageStatus(storage.nom, stgData);
                const healthLetter = resolvedScore !== undefined && resolvedScore !== null ? scoreToLetter(resolvedScore) : getStorageLetterFromStatus(statusFallback.status);
                const healthColor = resolvedScore !== undefined && resolvedScore !== null ? scoreToColor(resolvedScore) : statusFallback.color;
                const scoreLabel = SCORE_LABELS[healthLetter] || "Not rated";
                const subtitleParts = [storage.fabricant, storage.modele, storage.numeroSerie ? `S/N ${storage.numeroSerie}` : null].filter(Boolean);
                const subtitleLine = subtitleParts.length > 0 ? [subtitleParts.join(" "), storage.raid ? `RAID ${storage.raid}` : null, storage.ip].filter(Boolean).join(" - ") : null;
                const totalSpace = convertCapacityToGo(storage.capacite);
                const capacityLabel = totalSpace > 0 ? formatCapacity(totalSpace).display : null;
                const currentDisks = parseInt(storage.nbDisquesActuels) || 0;
                const maxDisks = parseInt(storage.nbDisquesMax) || 0;
                const diskStates = stgData?.diskStates || {};
                const disksLabel = maxDisks > 0 ? `${currentDisks}/${maxDisks} disques` : null;
                const usedSpace = parseInt(stgData?.espaceUtiliseGo) || 0;
                const rdxCassettes = storage.cassettesRDX || [];
                return <article key={`rdx-${idx}`} className={styles.serverHealthCard}>
                          <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                            <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                          </span>
                          <div className={styles.cardContent}>
                            {}
                            <div className={styles.healthTitleRow}>
                              <div className={styles.serverTitleMayn}>
                                <h3 className={styles.serverName}>
                                  <Icon path={mdiVhs} size="1rem" style={{
                            marginRight: "0.5rem",
                            verticalAlign: "middle",
                            position: "relative",
                            top: "-2px"
                          }} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                                  {storage.nom}
                                </h3>
                              </div>
                            </div>

                            {}
                            {subtitleLine && <div className={styles.serverMeta}>
                                <span className={styles.serverMetaLine}>
                                  {subtitleLine}
                                </span>
                              </div>}

                            {}
                            {rdxCassettes && rdxCassettes.length > 0 && <div style={{
                      marginTop: '1rem',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                                <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                                  Cassettes ({rdxCassettes.length})
                                </div>
                                <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                                  {rdxCassettes.map((cassette, cassetteIndex) => <div key={cassetteIndex} style={{
                          minWidth: '100px',
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-primary)',
                          borderRadius: '4px',
                          border: '2px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                                      <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            textAlign: 'center'
                          }}>
                                        #{cassetteIndex + 1}
                                      </div>
                                      {cassette.numero && <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}>
                                          {cassette.numero}
                                        </div>}
                                      {cassette.capacite && <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                            fontWeight: '500',
                            textAlign: 'center'
                          }}>
                                          {cassette.capacite.toString().includes('Go') || cassette.capacite.toString().includes('GB') || cassette.capacite.toString().includes('TB') || cassette.capacite.toString().includes('Mo') || cassette.capacite.toString().includes('MB') ? cassette.capacite : `${cassette.capacite} GB`}
                                        </div>}
                                    </div>)}
                                </div>
                              </div>}
                          </div>

                          {}
                          {stgData.comment && <div className={styles.commentBubble} style={{
                    marginTop: '1rem'
                  }}>
                              {stgData.comment}
                            </div>}
                        </article>;
              })}
                  </>;
          })()}
            </div>
          </div>)}
            </div>
        </div>;
};
export default StorageSummary;
