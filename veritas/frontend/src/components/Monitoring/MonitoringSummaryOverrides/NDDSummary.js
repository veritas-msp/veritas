import React, { useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { FaGlobe } from "react-icons/fa";
import styles from "./NDDSummary.module.css";
const NDDSummary = ({
  data,
  config
}) => {
  const {
    theme
  } = useTheme();
  const domaines = config?.client?.equipements?.NDD || [];
  const getRoleColor = role => {
    if (!role) return {
      bg: "#9ca3af",
      text: "#ffffff"
    };
    const roleColors = {
      "principal": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "priMayre": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "Mayn": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "redirection": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "redirect": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "alias": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "test": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "staging": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "dev": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "backup": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "sauvegarde": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "mirror": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "marketing": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "promo": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "campaign": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "api": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "rest": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "service": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "admin": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "management": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "control": {
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
      "stats": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "security": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "securite": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "ssl": {
        bg: "#ef4444",
        text: "#ffffff"
      }
    };
    const roleLower = role.toLowerCase();
    if (roleColors[roleLower]) {
      return roleColors[roleLower];
    }
    for (const [key, color] of Object.entries(roleColors)) {
      if (roleLower.includes(key)) {
        return color;
      }
    }
    const hash = role.split('').reduce((a, b) => {
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
  const getDomainInfo = domain => {
    const info = [];
    if (domain.expiration) {
      info.push(`Expires on ${domain.expiration}`);
      const daysUntilExpiration = Math.ceil((new Date(domain.expiration) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiration > 0) {
        info.push(`${daysUntilExpiration} days remaining`);
      } else if (daysUntilExpiration < 0) {
        info.push(`Expired for ${Math.abs(daysUntilExpiration)} days`);
      } else {
        info.push("Expires today");
      }
    }
    return info.join(" • ");
  };
  const expirationGroups = useMemo(() => {
    if (!domaines || domaines.length === 0) {
      return [];
    }
    const groups = {
      expired: [],
      less7: [],
      less30: [],
      less365: [],
      more365: [],
      unknown: []
    };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 1000 * 60 * 60 * 24;
    domaines.forEach(domaine => {
      const expiration = data?.[domaine.nom]?.expiration || domaine.expiration;
      if (!expiration) {
        groups.unknown.push(domaine);
        return;
      }
      const expirationDate = new Date(expiration);
      if (Number.isNaN(expirationDate.getTime())) {
        groups.unknown.push(domaine);
        return;
      }
      const diffDays = Math.ceil((expirationDate - startOfToday) / dayMs);
      if (diffDays < 0) {
        groups.expired.push(domaine);
      } else if (diffDays <= 7) {
        groups.less7.push(domaine);
      } else if (diffDays <= 30) {
        groups.less30.push(domaine);
      } else if (diffDays <= 365) {
        groups.less365.push(domaine);
      } else {
        groups.more365.push(domaine);
      }
    });
    const sortByExpiration = list => list.slice().sort((a, b) => {
      const aExpiration = data?.[a.nom]?.expiration || a.expiration;
      const bExpiration = data?.[b.nom]?.expiration || b.expiration;
      const aTime = aExpiration ? new Date(aExpiration).getTime() : Infinity;
      const bTime = bExpiration ? new Date(bExpiration).getTime() : Infinity;
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return (a?.nom || "").localeCompare(b?.nom || "");
      }
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return aTime - bTime;
    });
    const sections = [{
      key: "expired",
      label: "Expired"
    }, {
      key: "less7",
      label: "In less than 7 days"
    }, {
      key: "less30",
      label: "In less than a month"
    }, {
      key: "less365",
      label: "In less than a year"
    }, {
      key: "more365",
      label: "In more than a year"
    }, {
      key: "unknown",
      label: "No expiration date"
    }];
    return sections.map(section => ({
      ...section,
      domaines: section.key === "unknown" ? groups[section.key].slice().sort((a, b) => (a?.nom || "").localeCompare(b?.nom || "")) : sortByExpiration(groups[section.key])
    })).filter(section => section.domaines.length > 0);
  }, [domaines, data]);
  if (domaines.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No domain name configured for this client.</p>
                </div>
            </div>;
  }
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
            {expirationGroups.map(group => <div key={group.key} className={styles.sectionGroup} id={`expiration-${group.key}`}>
                    <div className={styles.sectionSeparator}>
                        <h2 className={styles.sectionTitle}>
                            {group.label}
                            <span className={styles.sectionCount}>
                                {group.domaines.length} domain{group.domaines.length > 1 ? "s" : ""}
                            </span>
                        </h2>
                    </div>
                    <div className={styles.nddGrid}>
                        {group.domaines.map((domaine, index) => {
          const domainWithUpdatedExpiration = {
            ...domaine,
            expiration: data?.[domaine.nom]?.expiration || domaine.expiration
          };
          const domainInfo = getDomainInfo(domainWithUpdatedExpiration);
          const roleColor = getRoleColor(domaine.role);
          return <div key={index} className={styles.nddCard}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.headerLeft}>
                                            <div className={styles.nddInfo}>
                                                <h3 className={styles.nddName}>
                                                    <span className={styles.nddNameSection}>
                                                        <span style={{
                        marginRight: '0.5rem'
                      }}>
                                                            <FaGlobe style={{
                          fontSize: '1.75rem',
                          color: theme === 'dark' ? '#d1d5db' : '#000000',
                          verticalAlign: 'middle',
                          display: 'inline-block'
                        }} />
                                                        </span>
                                                        <span className={styles.nddNameText}>
                                                            {domaine.nom}
                                                        </span>
                                                    </span>
                                                    {domainInfo && <span className={styles.connectionMeta}>
                                                            {domainInfo}
                                                        </span>}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {}
                                    {data?.[domaine.nom]?.comment && <div className={styles.commentInfo}>
                                            💬 {data[domaine.nom].comment}
                                        </div>}
                                </div>;
        })}
                    </div>
                </div>)}
        </div>;
};
export default NDDSummary;
