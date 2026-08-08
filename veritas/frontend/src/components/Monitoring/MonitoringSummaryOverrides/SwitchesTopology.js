import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { mdiOfficeBuilding } from "@mdi/js";
import { FaNetworkWired } from "react-icons/fa";
import { scoreToLetter, letterToBackground } from "../../../utils/gradeUtils";
import { computeSwitchHealthScore } from "./SwitchesSummaryCards";
import styles from "./TopologyCommon.module.css";
const DEFAULT_SERVICES = ["CPU", "RAM", "TRAFIC", "UPTIME"];
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
const getSwitchStatusFallback = (switchData = {}) => {
  if (!switchData) return {
    status: "unknown"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  DEFAULT_SERVICES.forEach(service => {
    const svc = switchData[service] || {};
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
      return null;
  }
};
const SwitchesTopology = ({
  config,
  data,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const switches = config?.client?.equipements?.Switch || [];
  const switchesData = data?.switchs || data?.switches || {};
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
    return filteredSwitches.reduce((acc, sw) => {
      const siteName = sw.site || "No site";
      if (!acc[siteName]) {
        acc[siteName] = [];
      }
      acc[siteName].push(sw);
      return acc;
    }, {});
  }, [filteredSwitches]);
  const sites = Object.keys(groupedBySite).sort();
  const maxSwitchesPerLine = 6;
  const totalHeight = useMemo(() => {
    let totalLines = 0;
    sites.forEach(siteName => {
      const siteSwitches = groupedBySite[siteName] || [];
      const siteLines = Math.ceil(siteSwitches.length / maxSwitchesPerLine);
      totalLines += siteLines;
    });
    return totalLines * 160 || 200;
  }, [sites, groupedBySite, maxSwitchesPerLine]);
  if (switches.length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No switch configured for this client.</p>
                </div>
            </div>;
  }
  if (Object.keys(groupedBySite).length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No switch matches the selected filters.</p>
                </div>
            </div>;
  }
  const maxSitesPerRow = 2;
  const numRows = Math.ceil(sites.length / maxSitesPerRow);
  const buildingY = 50;
  const switchesStartY = 150;
  const switchSpacingX = 80;
  const switchSpacingY = 100;
  const lineStartOffset = 30;
  const siteWidth = dimensions.width / 2;
  const truncateSwitchName = (name, maxLength = 10) => {
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
          const siteSwitches = groupedBySite[siteName];
          let currentY = siteStartY + switchesStartY;
          let siteMinX = Infinity;
          let siteMaxX = -Infinity;
          let siteMinY = Infinity;
          let siteMaxY = -Infinity;
          const switchesStartX = positionInRow === 0 ? 50 : siteWidth + 50;
          const switchesPerLine = Math.min(siteSwitches.length, maxSwitchesPerLine);
          const totalLines = Math.ceil(siteSwitches.length / maxSwitchesPerLine);
          const switchPositions = siteSwitches.map((sw, idx) => {
            const lineIndex = Math.floor(idx / maxSwitchesPerLine);
            const colIndex = idx % maxSwitchesPerLine;
            const switchX = switchesStartX + lineStartOffset + colIndex * switchSpacingX;
            const switchY = currentY + lineIndex * switchSpacingY;
            siteMinX = Math.min(siteMinX, switchX);
            siteMaxX = Math.max(siteMaxX, switchX);
            siteMinY = Math.min(siteMinY, switchY);
            siteMaxY = Math.max(siteMaxY, switchY);
            return {
              switch: sw,
              x: switchX,
              y: switchY,
              idx
            };
          });
          currentY += totalLines * switchSpacingY + 10;
          return <g key={`site-${siteName}`}>
                                {}
                                {switchPositions.map(switchPos => {
              const {
                switch: sw,
                x: switchX,
                y: switchY,
                idx
              } = switchPos;
              const iconColor = theme === 'dark' ? '#111827' : '#1f2937';
              const switchName = sw.nom || sw.netbios || `switch-${idx}`;
              const switchData = switchesData?.[switchName] || {};
              const eventsCount = getEventsCountValue(switchData);
              const availabilityValue = getAvailabilityValue(switchData);
              const isMapped = Boolean(sw.checkmk_host_name);
              const manualScore = switchData.manualHealthScore;
              const calculatedHealthScore = computeSwitchHealthScore(switchData, {
                eventsCount,
                availabilityValue,
                isMapped
              });
              const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
              let healthLetter = null;
              if (resolvedScore !== undefined && resolvedScore !== null) {
                healthLetter = scoreToLetter(resolvedScore);
              } else {
                const statusFallback = getSwitchStatusFallback(switchData);
                healthLetter = getSwitchLetterFromStatus(statusFallback.status);
              }
              const nodeFill = !isMapped ? theme === 'dark' ? '#6b7280' : '#d1d5db' : healthLetter ? letterToBackground(healthLetter) : theme === 'dark' ? '#1e1e3f' : '#ffffff';
              return <g key={`switch-${switchName}-${idx}`}>
                                            {}
                                            <rect x={switchX - 20} y={switchY - 20} width="40" height="40" rx="8" fill={nodeFill} stroke={!isMapped ? theme === 'dark' ? '#6b7280' : '#d1d5db' : theme === 'dark' ? '#4b5563' : '#9ca3af'} strokeWidth="2" />
                                            
                                            {}
                                            <foreignObject x={switchX - 12} y={switchY - 12} width="24" height="24">
                                                <div className={styles.connectionIconWrapper} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                  }}>
                                                    <FaNetworkWired style={{
                      fontSize: '1.2rem',
                      color: !isMapped ? theme === 'dark' ? '#9ca3af' : '#6b7280' : iconColor
                    }} />
                                                </div>
                                            </foreignObject>
                                            
                                            {}
                                            {switchName && switchName.length > 10 ? <foreignObject x={switchX - 40} y={switchY + 33} width="80" height="15">
                                                    <div className={styles.scrollingServerName}>
                                                        <span>{switchName}</span>
                                                    </div>
                                                </foreignObject> : <text x={switchX} y={switchY + 45} textAnchor="middle" fill={theme === 'dark' ? '#e5e7eb' : '#111827'} fontWeight="600" fontSize="11">
                                                    {switchName || ''}
                                                </text>}
                                            
                                            {}
                                            <text x={switchX} y={switchY + 60} textAnchor="middle" fill={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontWeight="400" fontSize="10">
                                                {sw.ip || sw.general?.ip || 'N/A'}
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
export default SwitchesTopology;
