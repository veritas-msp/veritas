import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import Icon from "@mdi/react";
import { mdiOfficeBuilding } from "@mdi/js";
import { FaServer, FaCube } from "react-icons/fa";
import { scoreToLetter, letterToBackground } from "../../../utils/gradeUtils";
import { computeServerHealthScore } from "./ServersSummaryCards";
import styles from "./TopologyCommon.module.css";
const DEFAULT_SERVICES = ["CPU", "MEMOIRE", "DISQUE", "UPTIME"];
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
const getServerStatusFallback = (serverData = {}) => {
  if (!serverData) return {
    status: "unknown"
  };
  let totalCrit = 0;
  let totalWarn = 0;
  let totalOk = 0;
  DEFAULT_SERVICES.forEach(service => {
    const svc = serverData[service] || {};
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
      return null;
  }
};
const ServersTopology = ({
  config,
  data,
  selectedSites = []
}) => {
  const {
    theme
  } = useTheme();
  const serveurs = config?.client?.equipements?.Serveurs || [];
  const serversData = data?.serveurs || {};
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
  const groupedBySiteAndVLAN = useMemo(() => {
    return filteredServers.reduce((acc, serveur) => {
      const siteName = serveur.site || "No site";
      const vlan = serveur.vlan || "No VLAN";
      if (!acc[siteName]) {
        acc[siteName] = {};
      }
      if (!acc[siteName][vlan]) {
        acc[siteName][vlan] = [];
      }
      acc[siteName][vlan].push(serveur);
      return acc;
    }, {});
  }, [filteredServers]);
  const sortServers = servers => {
    return [...servers].sort((a, b) => {
      const aIsVirtual = a.type === "virtuel";
      const bIsVirtual = b.type === "virtuel";
      if (aIsVirtual && !bIsVirtual) return 1;
      if (!aIsVirtual && bIsVirtual) return -1;
      return 0;
    });
  };
  const sites = Object.keys(groupedBySiteAndVLAN).sort();
  const maxSitesPerRow = 2;
  const numRows = Math.ceil(sites.length / maxSitesPerRow);
  const buildingY = 50;
  const serversStartY = 150;
  const serverSpacingX = 80;
  const serverSpacingY = 100;
  const maxServersPerLine = 4;
  const siteWidth = dimensions.width / 2;
  const totalHeight = useMemo(() => {
    let totalHeight = 0;
    sites.forEach(siteName => {
      const vlans = Object.keys(groupedBySiteAndVLAN[siteName] || {});
      vlans.forEach(vlan => {
        const servers = groupedBySiteAndVLAN[siteName][vlan] || [];
        const totalLines = Math.ceil(servers.length / maxServersPerLine);
        totalHeight += 120;
        if (totalLines > 1) {
          totalHeight += (totalLines - 1) * 50;
        }
      });
    });
    return totalHeight || 200;
  }, [sites, groupedBySiteAndVLAN, maxServersPerLine]);
  if (serveurs.length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No server configured for this client.</p>
                </div>
            </div>;
  }
  if (Object.keys(groupedBySiteAndVLAN).length === 0) {
    return <div className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No server matches the selected filters.</p>
                </div>
            </div>;
  }
  const truncateServerName = (name, maxLength = 10) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };
  return <div ref={containerRef} className={`${styles.topologyContainer} ${theme === "dark" ? styles.dark : ""}`}>
            {}
            <div className={styles.serversTopologyViewport}>
                <svg ref={svgRef} width={dimensions.width} height={totalHeight} className={styles.topologySvg}>
                    {}
                    {sites.map((siteName, siteIndex) => {
          const rowIndex = Math.floor(siteIndex / maxSitesPerRow);
          const positionInRow = siteIndex % maxSitesPerRow;
          const buildingX = positionInRow === 0 ? siteWidth / 2 : siteWidth + siteWidth / 2;
          const siteStartY = buildingY + rowIndex * 400;
          const vlans = Object.keys(groupedBySiteAndVLAN[siteName]);
          let currentY = siteStartY + serversStartY;
          let siteMinX = Infinity;
          let siteMaxX = -Infinity;
          let siteMinY = Infinity;
          let siteMaxY = -Infinity;
          return <g key={`site-${siteName}`}>
                                {}
                                {vlans.map(vlan => {
              const sortedServers = sortServers(groupedBySiteAndVLAN[siteName][vlan]);
              const totalLines = Math.ceil(sortedServers.length / maxServersPerLine);
              const vlanLabelX = positionInRow === 0 ? 50 : siteWidth + 50;
              const vlanStartY = currentY;
              const serversStartX = vlanLabelX + 120;
              const serversPerLine = Math.min(sortedServers.length, maxServersPerLine);
              currentY += totalLines * serverSpacingY + 10;
              siteMinX = Math.min(siteMinX, vlanLabelX);
              siteMinY = Math.min(siteMinY, vlanStartY);
              const serverPositions = sortedServers.map((server, idx) => {
                const lineIndex = Math.floor(idx / maxServersPerLine);
                const colIndex = idx % maxServersPerLine;
                const serverX = serversStartX + colIndex * serverSpacingX;
                const serverY = vlanStartY + lineIndex * serverSpacingY;
                siteMinX = Math.min(siteMinX, serverX);
                siteMaxX = Math.max(siteMaxX, serverX);
                siteMinY = Math.min(siteMinY, serverY);
                siteMaxY = Math.max(siteMaxY, serverY);
                return {
                  server,
                  x: serverX,
                  y: serverY,
                  idx
                };
              });
              return <g key={`vlan-${siteName}-${vlan}`}>
                                            {}
                                            <text x={vlanLabelX} y={vlanStartY + 5} textAnchor="start" fill={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontWeight="700" fontSize="14">
                                                {vlan === "No VLAN" ? "No VLAN" : `VLAN ${vlan}`}
                                            </text>
                                            {}
                                            {serverPositions.map(serverPos => {
                  const {
                    server,
                    x: serverX,
                    y: serverY,
                    idx
                  } = serverPos;
                  const ServerIcon = server.type === "virtuel" ? FaCube : FaServer;
                  const iconColor = theme === 'dark' ? '#111827' : '#1f2937';
                  const serverData = serversData?.[server.nom] || {};
                  const eventsCount = getEventsCountValue(serverData);
                  const availabilityValue = getAvailabilityValue(serverData);
                  const isMapped = Boolean(serverData.lastSyncDate);
                  const manualScore = serverData.manualHealthScore;
                  const calculatedHealthScore = computeServerHealthScore(serverData, {
                    eventsCount,
                    availabilityValue,
                    isMapped
                  });
                  const resolvedScore = manualScore !== undefined && manualScore !== null ? manualScore : calculatedHealthScore;
                  let healthLetter = null;
                  if (resolvedScore !== undefined && resolvedScore !== null) {
                    healthLetter = scoreToLetter(resolvedScore);
                  } else {
                    const statusFallback = getServerStatusFallback(serverData);
                    healthLetter = getServerLetterFromStatus(statusFallback.status);
                  }
                  const nodeFill = healthLetter ? letterToBackground(healthLetter) : theme === 'dark' ? '#1e1e3f' : '#ffffff';
                  return <g key={`server-${server.nom}-${idx}`}>
                                                        {}
                                                        <rect x={serverX - 20} y={serverY - 20} width="40" height="40" rx="8" fill={nodeFill} stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'} strokeWidth="2" />
                                                        
                                                        {}
                                                        <foreignObject x={serverX - 12} y={serverY - 12} width="24" height="24">
                                                            <div className={styles.connectionIconWrapper} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}>
                                                                <ServerIcon style={{
                          fontSize: '1.2rem',
                          color: iconColor
                        }} />
                                                            </div>
                                                        </foreignObject>
                                                        
                                                        {}
                                                        {server.nom && server.nom.length > 10 ? <foreignObject x={serverX - 40} y={serverY + 33} width="80" height="15">
                                                                <div className={styles.scrollingServerName}>
                                                                    <span>{server.nom}</span>
                                                                </div>
                                                            </foreignObject> : <text x={serverX} y={serverY + 45} textAnchor="middle" fill={theme === 'dark' ? '#e5e7eb' : '#111827'} fontWeight="600" fontSize="11">
                                                                {server.nom || ''}
                                                            </text>}
                                                        
                                                        {}
                                                        <text x={serverX} y={serverY + 60} textAnchor="middle" fill={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontWeight="400" fontSize="10">
                                                            {server.ip || 'N/A'}
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
export default ServersTopology;
