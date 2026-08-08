import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { mdiOfficeBuilding } from "@mdi/js";
import { HardDrive } from "lucide-react";
import { scoreToLetter, letterToBackground } from "../../../utils/gradeUtils";
import styles from "./TopologyCommon.module.css";
const DEFAULT_SERVICES = ["CPU", "MEMOIRE", "DISQUE", "UPTIME"];
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
    const expectedServices = DEFAULT_SERVICES.length || 1;
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
  const totalSpace = (() => {
    if (!storageConfig?.capacite) return 0;
    const capacityStr = String(storageConfig.capacite).toUpperCase();
    if (capacityStr.includes("TB")) {
      return Math.round(parseFloat(capacityStr.replace("TB", "")) * 1024);
    }
    if (capacityStr.includes("GB") || capacityStr.includes("GO")) {
      return Math.round(parseFloat(capacityStr.replace(/GB|GO/, "")));
    }
    if (capacityStr.includes("MB")) {
      return Math.round(parseFloat(capacityStr.replace("MB", "")) / 1024);
    }
    const n = parseFloat(capacityStr);
    return Number.isNaN(n) ? 0 : Math.round(n);
  })();
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
    DEFAULT_SERVICES.forEach(service => {
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
const getStorageStatusFallback = (storageData = {}) => {
  if (!storageData) return {
    status: "unknown"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  DEFAULT_SERVICES.forEach(service => {
    const svc = storageData[service] || {};
    const parse = (val, fallback) => {
      const parsed = parseInt(val, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    };
    totalCrit += parse(svc.crit, 0);
    totalWarn += parse(svc.warn, 0);
    totalOk += parse(svc.ok, 100);
  });
  const avgCrit = totalCrit / DEFAULT_SERVICES.length;
  const avgWarn = totalWarn / DEFAULT_SERVICES.length;
  const avgOk = totalOk / DEFAULT_SERVICES.length;
  if (avgCrit > 20) return {
    status: "critical"
  };
  if (avgCrit > 10 || avgWarn > 30) return {
    status: "warning"
  };
  if (avgOk >= 90) return {
    status: "excellent"
  };
  if (avgOk >= 70) return {
    status: "good"
  };
  return {
    status: "poor"
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
      return null;
  }
};
const StorageTopology = ({
  config,
  data,
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
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: 1400,
    height: 600
  });
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxWidth = 1368;
        const containerWidth = Math.min(maxWidth, rect.width - 64);
        setDimensions({
          width: containerWidth,
          height: 600
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  const filteredStorages = useMemo(() => {
    if (selectedSites.length > 0) {
      return rawStorages.filter(stg => {
        const equipmentSite = stg?.site ? String(stg.site).trim() : null;
        const siteToCheck = equipmentSite || "No site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return rawStorages;
  }, [rawStorages, selectedSites]);
  const groupedBySiteAndType = useMemo(() => {
    return filteredStorages.reduce((acc, stockage) => {
      const siteName = stockage.site || "No site";
      let type = stockage.type;
      if (!type) {
        if (stockage.nbDisquesActuels && stockage.nbDisquesActuels > 0) {
          type = "SAN";
        } else {
          type = "NAS";
        }
      }
      const finalType = type;
      if (!acc[siteName]) {
        acc[siteName] = {};
      }
      if (!acc[siteName][finalType]) {
        acc[siteName][finalType] = [];
      }
      acc[siteName][finalType].push(stockage);
      return acc;
    }, {});
  }, [filteredStorages]);
  const sortTypes = (a, b) => {
    const typeOrder = {
      SAN: 1,
      NAS: 2
    };
    const orderA = typeOrder[a] || (a === "No type" ? 99 : 3);
    const orderB = typeOrder[b] || (b === "No type" ? 99 : 3);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  };
  const sites = Object.keys(groupedBySiteAndType).sort();
  const maxSitesPerRow = 2;
  const numRows = Math.ceil(sites.length / maxSitesPerRow);
  const buildingY = 50;
  const storagesStartY = 150;
  const storageSpacingX = 80;
  const storageSpacingY = 100;
  const maxStoragesPerLine = 4;
  const siteWidth = dimensions.width / 2;
  const rowHeight = 600;
  const totalHeight = useMemo(() => {
    const paddingTop = 50;
    const paddingBottom = 100;
    const baseRowGap = rowHeight;
    let maxBottom = 0;
    sites.forEach((siteName, siteIndex) => {
      const rowIndex = Math.floor(siteIndex / maxSitesPerRow);
      const siteStartY = buildingY + rowIndex * baseRowGap;
      const types = Object.keys(groupedBySiteAndType[siteName] || {}).sort(sortTypes);
      let currentY = siteStartY + storagesStartY;
      let siteMinY = Infinity;
      let siteMaxY = -Infinity;
      types.forEach(type => {
        const storages = groupedBySiteAndType[siteName][type] || [];
        const totalLines = Math.ceil(storages.length / maxStoragesPerLine);
        const typeStartY = currentY;
        currentY += totalLines * storageSpacingY + 10;
        siteMinY = Math.min(siteMinY, typeStartY);
        storages.forEach((_, idx) => {
          const lineIndex = Math.floor(idx / maxStoragesPerLine);
          const storageY = typeStartY + lineIndex * storageSpacingY;
          siteMinY = Math.min(siteMinY, storageY);
          siteMaxY = Math.max(siteMaxY, storageY);
        });
      });
      if (Number.isFinite(siteMinY) && Number.isFinite(siteMaxY)) {
        const boxY = siteMinY - paddingTop;
        const boxHeight = siteMaxY - siteMinY + paddingTop + paddingBottom;
        const siteBottom = boxY + boxHeight;
        maxBottom = Math.max(maxBottom, siteBottom);
      }
    });
    return maxBottom > 0 ? maxBottom + 20 : 200;
  }, [sites, groupedBySiteAndType, maxSitesPerRow, buildingY, storagesStartY, storageSpacingY, maxStoragesPerLine, rowHeight]);
  if (rawStorages.length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No storage configured for this client.</p>
        </div>
      </div>;
  }
  if (Object.keys(groupedBySiteAndType).length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No storage matches the selected filters.</p>
        </div>
      </div>;
  }
  const truncateStorageName = (name, maxLength = 10) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };
  return <div ref={containerRef} className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.serversTopologyViewport}>
        <svg ref={svgRef} width={dimensions.width} height={totalHeight} className={styles.topologySvg}>
          {}
          {sites.map((siteName, siteIndex) => {
          const rowIndex = Math.floor(siteIndex / maxSitesPerRow);
          const positionInRow = siteIndex % maxSitesPerRow;
          const buildingX = positionInRow === 0 ? siteWidth / 2 : siteWidth + siteWidth / 2;
          const siteStartY = buildingY + rowIndex * rowHeight;
          const types = Object.keys(groupedBySiteAndType[siteName]).sort(sortTypes);
          let currentY = siteStartY + storagesStartY;
          let siteMinX = Infinity;
          let siteMaxX = -Infinity;
          let siteMinY = Infinity;
          let siteMaxY = -Infinity;
          return <g key={`site-${siteName}`}>
                {}
                {types.map(type => {
              const sortedStorages = groupedBySiteAndType[siteName][type];
              const totalLines = Math.ceil(sortedStorages.length / maxStoragesPerLine);
              const typeLabelX = positionInRow === 0 ? 50 : siteWidth + 50;
              const typeStartY = currentY;
              const storagesStartX = typeLabelX + 180;
              const storagesPerLine = Math.min(sortedStorages.length, maxStoragesPerLine);
              currentY += totalLines * storageSpacingY + 10;
              siteMinX = Math.min(siteMinX, typeLabelX);
              siteMinY = Math.min(siteMinY, typeStartY);
              const storagePositions = sortedStorages.map((storage, idx) => {
                const lineIndex = Math.floor(idx / maxStoragesPerLine);
                const colIndex = idx % maxStoragesPerLine;
                const storageX = storagesStartX + colIndex * storageSpacingX;
                const storageY = typeStartY + lineIndex * storageSpacingY;
                siteMinX = Math.min(siteMinX, storageX);
                siteMaxX = Math.max(siteMaxX, storageX);
                siteMinY = Math.min(siteMinY, storageY);
                siteMaxY = Math.max(siteMaxY, storageY);
                return {
                  storage,
                  x: storageX,
                  y: storageY,
                  idx
                };
              });
              return <g key={`type-${siteName}-${type}`}>
                      {}
                      <foreignObject x={typeLabelX} y={typeStartY - 10} width="160" height="20">
                        <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%'
                  }}>
                          {type}
                        </div>
                      </foreignObject>
                      
                      {}
                      {storagePositions.map(storagePos => {
                  const {
                    storage,
                    x: storageX,
                    y: storageY,
                    idx
                  } = storagePos;
                  const iconColor = theme === 'dark' ? '#111827' : '#1f2937';
                  const stgData = storageData?.[storage.nom] || {};
                  const isMapped = Boolean(storage.checkmk_host_name);
                  const manualScore = stgData.manualHealthScore;
                  const calculatedHealthScore = computeStorageHealthScore(storage.nom, storage, stgData);
                  const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
                  let healthLetter = null;
                  if (resolvedScore !== undefined && resolvedScore !== null) {
                    healthLetter = scoreToLetter(resolvedScore);
                  } else {
                    const statusFallback = getStorageStatusFallback(stgData);
                    healthLetter = getStorageLetterFromStatus(statusFallback.status);
                  }
                  const nodeFill = healthLetter ? letterToBackground(healthLetter) : theme === 'dark' ? '#1e1e3f' : '#ffffff';
                  return <g key={`storage-${storage.nom}-${idx}`}>
                            {}
                            <rect x={storageX - 20} y={storageY - 20} width="40" height="40" rx="8" fill={nodeFill} stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'} strokeWidth="2" />
                            
                            {}
                            <foreignObject x={storageX - 12} y={storageY - 12} width="24" height="24">
                              <div className={styles.connectionIconWrapper} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}>
                                <HardDrive size={20} color={iconColor} />
                              </div>
                            </foreignObject>
                            
                            {}
                            {storage.nom && storage.nom.length > 10 ? <foreignObject x={storageX - 40} y={storageY + 33} width="80" height="15">
                                <div className={styles.scrollingServerName}>
                                  <span>{storage.nom}</span>
                                </div>
                              </foreignObject> : <text x={storageX} y={storageY + 45} textAnchor="middle" fill={theme === 'dark' ? '#e5e7eb' : '#111827'} fontWeight="600" fontSize="11">
                                {storage.nom || ''}
                              </text>}
                            
                            {}
                            <text x={storageX} y={storageY + 60} textAnchor="middle" fill={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontWeight="400" fontSize="10">
                              {storage.ip || 'N/A'}
                            </text>
                          </g>;
                })}
                    </g>;
            })}
                {}
                {Number.isFinite(siteMinY) && Number.isFinite(siteMaxY) && (() => {
              const paddingTop = 50;
              const paddingBottom = 100;
              const gap = 48;
              const boxWidth = (dimensions.width - gap) / 2;
              const boxX = positionInRow === 0 ? 0 : boxWidth + gap;
              const boxY = siteMinY - paddingTop;
              const boxHeight = siteMaxY - siteMinY + paddingTop + paddingBottom;
              return <>
                      {}
                      <foreignObject x={boxX - 3} y={boxY - 48} width={boxWidth - 16} height="24">
                        <div className={styles.siteHeaderLeft}>
                          <Icon path={mdiOfficeBuilding} size="1.1rem" color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                          <span className={styles.siteHeaderLabel}>
                            {siteName}
                          </span>
                        </div>
                      </foreignObject>
                      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} rx="16" fill="none" stroke={theme === 'dark' ? '#4b5563' : '#cbd5e1'} strokeWidth="2" strokeDasharray="6 6" />
                    </>;
            })()}
              </g>;
        })}
        </svg>
      </div>
    </div>;
};
export default StorageTopology;
