import React from "react";
import { useTheme } from "../../../hooks/useTheme";
import styles from "./ServersSummary.module.css";
import { FaWindows, FaLinux } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
const defaultServices = ["CPU", "C:/", "RAM", "UPTIME"];
const ServersSummary = ({
  data,
  config
}) => {
  const {
    theme
  } = useTheme();
  const serveurs = config?.client?.equipements?.Serveurs || [];
  const getRoleColor = role => {
    if (!role) return {
      bg: "#9ca3af",
      text: "#ffffff"
    };
    let roleString = role;
    if (Array.isArray(role)) {
      if (role.length === 0) return {
        bg: "#9ca3af",
        text: "#ffffff"
      };
      roleString = role[0];
    }
    if (typeof roleString !== 'string') {
      return {
        bg: "#9ca3af",
        text: "#ffffff"
      };
    }
    const roleColors = {
      "domain controller": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "domain controller": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "ad": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "dc": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "fichiers": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "files": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "nas": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "web": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "www": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "http": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "database": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "database": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "db": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "sql": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "messagerie": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "Mail": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "exchange": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "sauvegarde": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "backup": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "sauve": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "application": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "app": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "monitoring": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "monitor": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "sécurité": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "securite": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "firewall": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "antivirus": {
        bg: "#ef4444",
        text: "#ffffff"
      }
    };
    const roleLower = roleString.toLowerCase();
    if (roleColors[roleLower]) {
      return roleColors[roleLower];
    }
    for (const [key, color] of Object.entries(roleColors)) {
      if (roleLower.includes(key)) {
        return color;
      }
    }
    const hash = roleString.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors = [{
      bg: "#3b82f6",
      text: "#ffffff"
    }, {
      bg: "#10b981",
      text: "#ffffff"
    }, {
      bg: "#f59e0b",
      text: "#ffffff"
    }, {
      bg: "#8b5cf6",
      text: "#ffffff"
    }, {
      bg: "#ec4899",
      text: "#ffffff"
    }, {
      bg: "#06b6d4",
      text: "#ffffff"
    }, {
      bg: "#f97316",
      text: "#ffffff"
    }, {
      bg: "#84cc16",
      text: "#ffffff"
    }];
    return colors[Math.abs(hash) % colors.length];
  };
  const getServerStatus = serverName => {
    const srvData = data?.[serverName];
    if (!srvData) return {
      status: "unknown",
      icon: "●",
      color: "gray"
    };
    let totalCrit = 0;
    let totalWarn = 0;
    let totalOk = 0;
    let serviceCount = 0;
    defaultServices.forEach(service => {
      const serviceData = srvData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      totalCrit += parse(serviceData.crit, 0);
      totalWarn += parse(serviceData.warn, 0);
      totalOk += parse(serviceData.ok, 100);
      serviceCount++;
    });
    const avgCrit = totalCrit / serviceCount;
    const avgWarn = totalWarn / serviceCount;
    const avgOk = totalOk / serviceCount;
    if (avgCrit > 20) {
      return {
        status: "critical",
        icon: "●",
        color: "red"
      };
    } else if (avgCrit > 10 || avgWarn > 30) {
      return {
        status: "warning",
        icon: "●",
        color: "orange"
      };
    } else if (avgOk >= 90) {
      return {
        status: "excellent",
        icon: "●",
        color: "green"
      };
    } else if (avgOk >= 70) {
      return {
        status: "good",
        icon: "●",
        color: "lightgreen"
      };
    } else {
      return {
        status: "poor",
        icon: "●",
        color: "yellow"
      };
    }
  };
  const getVLANColor = vlan => {
    if (!vlan) return {
      bg: "#9ca3af",
      text: "#ffffff"
    };
    const vlanColors = {
      "10": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "20": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "30": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "40": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "50": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "60": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "70": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "80": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "90": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "100": {
        bg: "#6366f1",
        text: "#ffffff"
      }
    };
    return vlanColors[vlan] || {
      bg: "#6b7280",
      text: "#ffffff"
    };
  };
  const getOSIcon = systeme => {
    if (!systeme) return null;
    const systemeLower = systeme.toLowerCase();
    if (systemeLower.includes('windows')) {
      return <FaWindows className={styles.osIcon} />;
    }
    if (systemeLower.includes('linux') || systemeLower.includes('ubuntu') || systemeLower.includes('debian') || systemeLower.includes('centos') || systemeLower.includes('red hat') || systemeLower.includes('suse') || systemeLower.includes('opensuse') || systemeLower.includes('almalinux') || systemeLower.includes('rocky linux') || systemeLower.includes('oracle linux') || systemeLower.includes('fedora') || systemeLower.includes('vmware esxi') || systemeLower.includes('proxmox') || systemeLower.includes('citrix xenserver') || systemeLower.includes('microsoft hyper-v')) {
      return <FaLinux className={styles.osIcon} />;
    }
    return null;
  };
  const getServerInfo = srv => {
    const info = [];
    const physicalInfo = [];
    if (srv.systeme) {
      const osIcon = getOSIcon(srv.systeme);
      if (osIcon) {
        info.push({
          type: 'os',
          content: srv.systeme,
          icon: osIcon
        });
      } else {
        info.push(srv.systeme);
      }
    }
    if (srv.ip) info.push(srv.ip);
    if (srv.type === "physique") {
      if (srv.marque && srv.modele) physicalInfo.push(`${srv.marque} ${srv.modele}`);else if (srv.marque) physicalInfo.push(srv.marque);else if (srv.modele) physicalInfo.push(srv.modele);
      if (srv.numeroSerie) physicalInfo.push(`S/N: ${srv.numeroSerie}`);
      if (srv.processeur) physicalInfo.push(srv.processeur);
      if (srv.stockage) physicalInfo.push(srv.stockage);
      if (srv.expirationGarantie) {
        const expirationDate = new Date(srv.expirationGarantie);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        physicalInfo.push(`Expires on ${expirationDate.toLocaleDateString('en-US')}`);
        if (daysUntilExpiration < 0) {
          physicalInfo.push("Expired");
        } else if (daysUntilExpiration <= 30) {
          physicalInfo.push(`Expires in ${daysUntilExpiration} days`);
        }
      }
    } else {
      if (srv.marque && srv.modele) info.push(`${srv.marque} ${srv.modele}`);else if (srv.marque) info.push(srv.marque);else if (srv.modele) info.push(srv.modele);
      if (srv.numeroSerie) info.push(`S/N: ${srv.numeroSerie}`);
      if (srv.processeur) info.push(srv.processeur);
      if (srv.stockage) info.push(srv.stockage);
      if (srv.expirationGarantie) {
        const expirationDate = new Date(srv.expirationGarantie);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        info.push(`Expires on ${expirationDate.toLocaleDateString('en-US')}`);
        if (daysUntilExpiration < 0) {
          info.push("Expired");
        } else if (daysUntilExpiration <= 30) {
          info.push(`Expires in ${daysUntilExpiration} days`);
        }
      }
    }
    return {
      MaynInfo: info,
      physicalInfo: physicalInfo
    };
  };
  const getHighestValue = (serviceData, service) => {
    const parse = (val, fallback) => {
      if (val === undefined || val === null || val === '') return fallback;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? fallback : parsed;
    };
    const ok = parse(serviceData.ok, 100);
    const warn = parse(serviceData.warn, 0);
    const crit = parse(serviceData.crit, 0);
    const values = [ok, warn, crit];
    const maxValue = Math.max(...values);
    return {
      ok: {
        value: ok,
        isHighest: ok === maxValue
      },
      warn: {
        value: warn,
        isHighest: warn === maxValue
      },
      crit: {
        value: crit,
        isHighest: crit === maxValue
      }
    };
  };
  if (serveurs.length === 0) {
    return <div className={styles.emptyState}>
                <p>No server configured for this client.</p>
            </div>;
  }
  return <div className={`${styles.serversContainer} ${theme === "dark" ? styles.dark : ""}`}>
            {}
            <div className={styles.moduleCard}>
                <div className={styles.moduleHeader}>
                    <div className={styles.moduleIcon}>🖥️</div>
                    <div className={styles.moduleInfo}>
                        <h3 className={styles.moduleTitle}>Servers</h3>
                        <p className={styles.moduleSubtitle}>
                            Surveillance des serveurs physiques et virtuels
                        </p>
                    </div>
                </div>
                <hr className={styles.moduleDivider} />

                {}
                <div className={styles.statsSection}>
                    <div className={styles.statsGrid}>
                        {}
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🖥️</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>Physical servers</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {serveurs.filter(s => s.type === "physique").length}
                                    </span>
                                    <span className={styles.statLabel}>
                                        ({serveurs.length > 0 ? Math.round(serveurs.filter(s => s.type === "physique").length / serveurs.length * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>☁️</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>Virtual servers</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {serveurs.filter(s => s.type === "virtuel").length}
                                    </span>
                                    <span className={styles.statLabel}>
                                        ({serveurs.length > 0 ? Math.round(serveurs.filter(s => s.type === "virtuel").length / serveurs.length * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🔗</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>VLANs used</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {new Set(serveurs.filter(s => s.vlan).map(s => s.vlan)).size}
                                    </span>
                                    <span className={styles.statLabel}>
                                        of {serveurs.filter(s => s.vlan).length} serveurs
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🛡️</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statName}>Garanties actives</div>
                                <div className={styles.statValue}>
                                    <span className={styles.statNumber}>
                                        {serveurs.filter(s => {
                    if (!s.expirationGarantie) return false;
                    const expirationDate = new Date(s.expirationGarantie);
                    const today = new Date();
                    return expirationDate > today;
                  }).length}
                                    </span>
                                    <span className={styles.statLabel}>
                                        of {serveurs.filter(s => s.expirationGarantie).length} garanties
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {}
                    {serveurs.filter(s => s.vlan).length > 0 && <div className={styles.vlanStatsSection}>
                            <h4 className={styles.vlanStatsTitle}>Breakdown by VLAN</h4>
                            <div className={styles.vlanStatsGrid}>
                                {Array.from(new Set(serveurs.filter(s => s.vlan).map(s => s.vlan))).sort((a, b) => parseInt(a) - parseInt(b)).map(vlan => {
              const vlanServers = serveurs.filter(s => s.vlan === vlan);
              const vlanColor = getVLANColor(vlan);
              return <div key={vlan} className={styles.vlanStatItem}>
                                                <span className={styles.vlanBadge} style={{
                  backgroundColor: vlanColor.bg,
                  color: vlanColor.text
                }}>
                                                    VLAN {vlan}
                                                </span>
                                                <span className={styles.vlanCount}>
                                                    {vlanServers.length} serveur{vlanServers.length > 1 ? 's' : ''}
                                                </span>
                                                <span className={styles.vlanPercentage}>
                                                    ({Math.round(vlanServers.length / serveurs.length * 100)}%)
                                                </span>
                                            </div>;
            })}
                            </div>
                        </div>}
                </div>

                {}
                <div className={styles.serversGrid}>
                    {serveurs.sort((a, b) => {
          if (a.type === "physique" && b.type !== "physique") return -1;
          if (a.type !== "physique" && b.type === "physique") return 1;
          return a.nom.localeCompare(b.nom);
        }).map((srv, i) => {
          const serverStatus = getServerStatus(srv.nom);
          const {
            MaynInfo,
            physicalInfo
          } = getServerInfo(srv);
          const roleColor = getRoleColor(srv.role);
          const isMapped = Boolean(srv.checkmk_host_name);
          return <div key={i} className={styles.serverCard}>
                                    {}
                                    <span className={`${styles.mappingBadge} ${isMapped ? styles.mappingSynced : styles.mappingMissing}`} title={isMapped ? "Synced CheckMK" : "Not mapped"}>
                                        <IconifyIcon icon={isMapped ? "simple-icons:checkmk" : "picon:not"} width={16} height={16} color={theme === "dark" ? "#9ca3af" : "#6b7280"} />
                                    </span>
                                    {}
                                    <div className={styles.cardHeader}>
                                        <div className={styles.headerLeft}>
                                            <div className={`${styles.statusDot} ${styles[serverStatus.status]}`}></div>
                                            <div className={styles.serverInfo}>
                                                <h3 className={styles.serverName}>
                                                    {srv.nom}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className={styles.serverType}>
                                            <span className={styles.typeLabel} style={{
                  backgroundColor: "#6b7280",
                  color: "#ffffff"
                }}>
                                                {srv.type === "physique" ? "Physique" : "Virtuel"}
                                            </span>
                                            {srv.role && (Array.isArray(srv.role) ? srv.role.map((role, roleIndex) => {
                  const roleColor = getRoleColor(role);
                  return <span key={roleIndex} className={styles.roleLabel} style={{
                    backgroundColor: roleColor.bg,
                    color: roleColor.text
                  }}>
                                                                {role}
                                                            </span>;
                }) : <span className={styles.roleLabel} style={{
                  backgroundColor: getRoleColor(srv.role).bg,
                  color: getRoleColor(srv.role).text
                }}>
                                                        {srv.role}
                                                    </span>)}
                                            {srv.vlan && <span className={styles.vlanLabel} style={{
                  backgroundColor: getVLANColor(srv.vlan).bg,
                  color: getVLANColor(srv.vlan).text
                }}>
                                                    VLAN {srv.vlan}
                                                </span>}
                                        </div>
                                    </div>

                                    {}
                                    <div className={styles.serverDetailsContainer}>
                                        <p className={styles.serverDetails}>
                                            {MaynInfo.map((item, index) => <React.Fragment key={index}>
                                                    {typeof item === 'string' ? <>
                                                            {item}
                                                            {index < MaynInfo.length - 1 && " • "}
                                                        </> : <>
                                                            <span className={styles.osInfo}>
                                                                {item.icon}
                                                                {item.content}
                                                            </span>
                                                            {index < MaynInfo.length - 1 && " • "}
                                                        </>}
                                                </React.Fragment>)}
                                        </p>
                                        {physicalInfo.length > 0 && <p className={styles.physicalInfo}>
                                                {physicalInfo.join(" • ")}
                                            </p>}
                                    </div>

                                    {}
                                    <div className={styles.metricsTable}>
                                        <table className={styles.serviceTable}>
                                            <thead>
                                                <tr>
                                                    <th scope="col">Service</th>
                                                    <th scope="col">OK</th>
                                                    <th scope="col">WARN</th>
                                                    <th scope="col">CRIT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {defaultServices.map(service => {
                    const serviceData = data?.[srv.nom]?.[service] || {};
                    const values = getHighestValue(serviceData, service);
                    return <tr key={service}>
                                                            <td className={styles.serviceName}>{service}</td>
                                                            <td>
                                                                <span className={`${styles.metricValue} ${values.ok.isHighest ? styles.okValue : styles.metricValueDefault}`}>
                                                                    {values.ok.value}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`${styles.metricValue} ${values.warn.isHighest ? styles.warnValue : styles.metricValueDefault}`}>
                                                                    {values.warn.value}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`${styles.metricValue} ${values.crit.isHighest ? styles.critValue : styles.metricValueDefault}`}>
                                                                    {values.crit.value}%
                                                                </span>
                                                            </td>
                                                        </tr>;
                  })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {}
                                    {data?.[srv.nom]?.comment && <div className={styles.commentSection}>
                                            <textarea value={data[srv.nom].comment} readOnly className={styles.commentInput} rows="2" placeholder="Comment..." />
                                        </div>}
                                </div>;
        })}
                </div>
            </div>
        </div>;
};
export default ServersSummary;
