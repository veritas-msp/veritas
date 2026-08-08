import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { mdiOfficeBuilding } from "@mdi/js";
import { FaWifi } from "react-icons/fa";
import { scoreToLetter, letterToBackground } from "../../../utils/gradeUtils";
import { computeWifiHealthScore } from "./WifiSummaryCards";
import styles from "./TopologyCommon.module.css";
const DEFAULT_SERVICES = ["CPU", "RAM", "TRAFIC", "UPTIME"];
const getEventsCountValue = (wifiData = {}) => {
  if (typeof wifiData.eventsCount === "number") {
    return wifiData.eventsCount;
  }
  if (Array.isArray(wifiData.eventsData)) {
    return wifiData.eventsData.length;
  }
  const checkmkEvents = wifiData?.checkmkData?.events;
  if (Array.isArray(checkmkEvents)) {
    return checkmkEvents.length;
  }
  return null;
};
const getAvailabilityValue = (wifiData = {}) => {
  const raw = wifiData?.availabilityData?.up ?? wifiData?.availability?.up ?? wifiData?.availability;
  if (raw === null || raw === undefined) return null;
  const numeric = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : null;
};
const getWifiStatusFallback = (wifiData = {}) => {
  if (!wifiData) return {
    status: "unknown"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  DEFAULT_SERVICES.forEach(service => {
    const svc = wifiData[service] || {};
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
const getWifiLetterFromStatus = status => {
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
const WifiTopology = ({
  config,
  data,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const wifis = config?.client?.equipements?.BorneWifi || [];
  const wifisData = data?.wifis || data?.wifi || {};
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
  const filteredWifis = useMemo(() => {
    if (selectedSites.length > 0) {
      return wifis.filter(wf => {
        const equipmentSite = wf?.site ? String(wf.site).trim() : null;
        const siteToCheck = equipmentSite || "No site";
        return selectedSites.includes(siteToCheck);
      });
    }
    return wifis;
  }, [wifis, selectedSites]);
  const groupedBySite = useMemo(() => {
    return filteredWifis.reduce((acc, wf) => {
      const siteName = wf.site || "No site";
      if (!acc[siteName]) {
        acc[siteName] = [];
      }
      acc[siteName].push(wf);
      return acc;
    }, {});
  }, [filteredWifis]);
  const sites = Object.keys(groupedBySite).sort();
  const maxWifisPerLine = 6;
  const totalHeight = useMemo(() => {
    let totalLines = 0;
    sites.forEach(siteName => {
      const siteWifis = groupedBySite[siteName] || [];
      const siteLines = Math.ceil(siteWifis.length / maxWifisPerLine);
      totalLines += siteLines;
    });
    return totalLines * 100 || 200;
  }, [sites, groupedBySite, maxWifisPerLine]);
  if (wifis.length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No WiFi access point configured for this client.</p>
                </div>
            </div>;
  }
  if (Object.keys(groupedBySite).length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No WiFi access point matches the selected filters.</p>
                </div>
            </div>;
  }
  const maxSitesPerRow = 2;
  const numRows = Math.ceil(sites.length / maxSitesPerRow);
  const buildingY = 50;
  const wifisStartY = 150;
  const wifiSpacingX = 80;
  const wifiSpacingY = 100;
  const lineStartOffset = 30;
  const siteWidth = dimensions.width / 2;
  const truncateWifiName = (name, maxLength = 10) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };
  return <div ref={containerRef} className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
            {}
            <div className={styles.serversTopologyViewport}>
                <svg ref={svgRef} width={dimensions.width} height={totalHeight} className={styles.topologySvg}>
                    <defs>
                    </defs>
                    {}
                    {sites.map((siteName, siteIndex) => {
          const rowIndex = Math.floor(siteIndex / maxSitesPerRow);
          const positionInRow = siteIndex % maxSitesPerRow;
          const buildingX = positionInRow === 0 ? siteWidth / 2 : siteWidth + siteWidth / 2;
          const siteStartY = buildingY + rowIndex * 600;
          const siteWifis = groupedBySite[siteName];
          let currentY = siteStartY + wifisStartY;
          let siteMinX = Infinity;
          let siteMaxX = -Infinity;
          let siteMinY = Infinity;
          let siteMaxY = -Infinity;
          const wifisStartX = positionInRow === 0 ? 50 : siteWidth + 50;
          const wifisPerLine = Math.min(siteWifis.length, maxWifisPerLine);
          const totalLines = Math.ceil(siteWifis.length / maxWifisPerLine);
          const wifiPositions = siteWifis.map((wf, idx) => {
            const lineIndex = Math.floor(idx / maxWifisPerLine);
            const colIndex = idx % maxWifisPerLine;
            const wifiX = wifisStartX + lineStartOffset + colIndex * wifiSpacingX;
            const wifiY = currentY + lineIndex * wifiSpacingY;
            siteMinX = Math.min(siteMinX, wifiX);
            siteMaxX = Math.max(siteMaxX, wifiX);
            siteMinY = Math.min(siteMinY, wifiY);
            siteMaxY = Math.max(siteMaxY, wifiY);
            return {
              wifi: wf,
              x: wifiX,
              y: wifiY,
              idx
            };
          });
          currentY += totalLines * wifiSpacingY + 10;
          return <g key={`site-${siteName}`}>
                                {}
                                {wifiPositions.map(wifiPos => {
              const {
                wifi: wf,
                x: wifiX,
                y: wifiY,
                idx
              } = wifiPos;
              const iconColor = theme === 'dark' ? '#111827' : '#1f2937';
              const wifiName = wf.nom || wf.netbios || `wifi-${idx}`;
              const wifiData = wifisData?.[wifiName] || {};
              const eventsCount = getEventsCountValue(wifiData);
              const availabilityValue = getAvailabilityValue(wifiData);
              const isMapped = Boolean(wf.checkmk_host_name);
              const manualScore = wifiData.manualHealthScore;
              const calculatedHealthScore = computeWifiHealthScore(wifiData, {
                eventsCount,
                availabilityValue,
                isMapped
              });
              const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
              let healthLetter = null;
              if (resolvedScore !== undefined && resolvedScore !== null) {
                healthLetter = scoreToLetter(resolvedScore);
              } else {
                const statusFallback = getWifiStatusFallback(wifiData);
                healthLetter = getWifiLetterFromStatus(statusFallback.status);
              }
              const nodeFill = !isMapped ? theme === 'dark' ? '#6b7280' : '#d1d5db' : healthLetter ? letterToBackground(healthLetter) : theme === 'dark' ? '#1e1e3f' : '#ffffff';
              return <g key={`wifi-${wifiName}-${idx}`}>
                                            {}
                                            <rect x={wifiX - 20} y={wifiY - 20} width="40" height="40" rx="8" fill={nodeFill} stroke={!isMapped ? theme === 'dark' ? '#6b7280' : '#d1d5db' : theme === 'dark' ? '#4b5563' : '#9ca3af'} strokeWidth="2" />
                                            
                                            {}
                                            <foreignObject x={wifiX - 12} y={wifiY - 12} width="24" height="24">
                                                <div className={styles.connectionIconWrapper} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                  }}>
                                                    <FaWifi style={{
                      fontSize: '1.2rem',
                      color: !isMapped ? theme === 'dark' ? '#9ca3af' : '#6b7280' : iconColor
                    }} />
                                                </div>
                                            </foreignObject>
                                            
                                            {}
                                            {wifiName && wifiName.length > 10 ? <foreignObject x={wifiX - 40} y={wifiY + 33} width="80" height="15">
                                                    <div className={styles.scrollingServerName}>
                                                        <span>{wifiName}</span>
                                                    </div>
                                                </foreignObject> : <text x={wifiX} y={wifiY + 45} textAnchor="middle" fill={theme === 'dark' ? '#e5e7eb' : '#111827'} fontWeight="600" fontSize="11">
                                                    {wifiName || ''}
                                                </text>}
                                            
                                            {}
                                            <text x={wifiX} y={wifiY + 60} textAnchor="middle" fill={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontWeight="400" fontSize="10">
                                                {wf.ip || wf.general?.ip || 'N/A'}
                                            </text>
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
export default WifiTopology;
