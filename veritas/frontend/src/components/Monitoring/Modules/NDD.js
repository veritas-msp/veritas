import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { FaSync, FaGlobe } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "./NDD.module.css";
import commonStyles from "./ModuleCommon.module.css";
import API_BASE_URL from "../../../config";
const toastOptions = {
  position: "bottom-right",
  autoClose: 3000
};
const NDD = ({
  config,
  setConfig,
  data,
  setData,
  onSyncAllCheckMKReady
}) => {
  const {
    theme
  } = useTheme();
  const currentClientId = config?.client?.id;
  const [domainesFromDb, setDomainesFromDb] = useState([]);
  const [loadingSync, setLoadingSync] = useState({});
  const syncAllOvhRef = useRef(null);
  const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
  const lastNotifiedRef = useRef({
    domainesLength: 0,
    isLoading: false
  });
  useEffect(() => {
    if (!currentClientId || !setConfig) return;
    const controller = new AbortController();
    const loadNDDFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${currentClientId}/ndd`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) {
          console.warn(`Error loading domains: ${res.status}`);
          setDomainesFromDb([]);
          return;
        }
        const rows = await res.json();
        const nddList = (rows || []).map(row => {
          const {
            id: dataId,
            ...dataWithoutId
          } = row.data || {};
          return {
            id: row.id,
            ...dataWithoutId,
            nom: row.data?.nom || row.name || row.item_key || "",
            __fromDb: true
          };
        });
        const filteredNddList = nddList.filter(ndd => {
          if (ndd.client_id !== undefined && ndd.client_id !== null) {
            return String(ndd.client_id) === String(currentClientId);
          }
          return true;
        });
        setDomainesFromDb(filteredNddList);
        setConfig(prev => {
          if (!prev?.client) return prev;
          return {
            ...prev,
            client: {
              ...prev.client,
              equipements: {
                ...(prev.client.equipements || {}),
                NDD: filteredNddList
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading domain names:", err);
        setDomainesFromDb([]);
      }
    };
    loadNDDFromDb();
    return () => controller.abort();
  }, [currentClientId]);
  const domaines = domainesFromDb.length > 0 ? domainesFromDb : config?.client?.equipements?.NDD || [];
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
  const isExpiringSoon = dateStr => {
    if (!dateStr) return false;
    const now = new Date();
    const expiration = new Date(dateStr);
    const inThreeMonths = new Date();
    inThreeMonths.setMonth(now.getMonth() + 3);
    return expiration < inThreeMonths;
  };
  const isExpired = dateStr => {
    if (!dateStr) return false;
    const now = new Date();
    const expiration = new Date(dateStr);
    return expiration < now;
  };
  const getDomainStatus = domain => {
    if (isExpired(domain.expiration)) return "critical";
    if (isExpiringSoon(domain.expiration)) return "warning";
    return "good";
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
  const handleCommentChange = (domainNom, comment) => {
    if (setData && typeof setData === 'function') {
      const updated = {
        ...data,
        [domainNom]: {
          ...(data?.[domainNom] || {}),
          comment: comment
        }
      };
      setData(updated);
    } else {
      console.warn('setData function is not available');
    }
  };
  const syncDomainExpiration = useCallback(async domainNom => {
    setLoadingSync(prev => ({
      ...prev,
      [domainNom]: true
    }));
    try {
      const response = await fetch(`${API_BASE_URL}/ovh/domain/${encodeURIComponent(domainNom)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return;
      }
      const result = await response.json();
      if (result.success && result.domain) {
        if (result.domain.expiration) {
          setData(prev => ({
            ...prev,
            [domainNom]: {
              ...(prev?.[domainNom] || {}),
              expiration: result.domain.expiration
            }
          }));
        }
      } else {}
    } catch (err) {
      console.error('Error syncing OVH domain:', err);
    } finally {
      setLoadingSync(prev => ({
        ...prev,
        [domainNom]: false
      }));
    }
  }, [setData]);
  const syncAllOvh = useCallback(async () => {
    if (domaines.length === 0) {
      toast.warning('No domain to sync', toastOptions);
      return;
    }
    const syncPromises = domaines.map(domaine => syncDomainExpiration(domaine.nom));
    try {
      await Promise.all(syncPromises);
      toast.success(`Synchronization completed`, toastOptions);
    } catch (error) {
      toast.error(`Error during synchronization`, toastOptions);
    }
  }, [domaines, syncDomainExpiration]);
  useEffect(() => {
    syncAllOvhRef.current = syncAllOvh;
  }, [syncAllOvh]);
  useEffect(() => {
    onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
  }, [onSyncAllCheckMKReady]);
  const isLoading = Object.values(loadingSync).some(loading => loading);
  useEffect(() => {
    if (onSyncAllCheckMKReadyRef.current) {
      const syncFunction = syncAllOvhRef.current;
      if (syncFunction) {
        const currentDomainesLength = (domaines || []).length;
        const lastNotified = lastNotifiedRef.current;
        if (lastNotified.domainesLength === currentDomainesLength && lastNotified.isLoading === isLoading) {
          return;
        }
        onSyncAllCheckMKReadyRef.current({
          syncAllCheckMK: syncFunction,
          hasCheckMKMappings: currentDomainesLength > 0,
          isLoading: isLoading
        });
        lastNotifiedRef.current = {
          domainesLength: currentDomainesLength,
          isLoading: isLoading
        };
      }
    }
  }, [domaines?.length, isLoading]);
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
      if (!domaine?.expiration) {
        groups.unknown.push(domaine);
        return;
      }
      const expirationDate = new Date(domaine.expiration);
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
      const aTime = a?.expiration ? new Date(a.expiration).getTime() : Infinity;
      const bTime = b?.expiration ? new Date(b.expiration).getTime() : Infinity;
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
  }, [domaines]);
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
          const status = getDomainStatus(domainWithUpdatedExpiration);
          const domainInfo = getDomainInfo(domainWithUpdatedExpiration);
          const roleColor = getRoleColor(domaine.role);
          const hasExpiration = !!(data?.[domaine.nom]?.expiration || domaine.expiration);
          const needsSyncWarning = !hasExpiration && !loadingSync[domaine.nom];
          return <div key={index} className={styles.nddCard} style={{
            opacity: loadingSync[domaine.nom] ? 0.6 : 1,
            position: 'relative'
          }}>
              {loadingSync[domaine.nom] && <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              zIndex: 10,
              background: 'var(--bg-primary)',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}>
                  <FaSync style={{
                animation: 'spin 1s linear infinite',
                fontSize: '0.75rem'
              }} />
                  Synchronization...
                </div>}
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
                <div className={styles.headerRight} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                  {}
                  {}
                  <button type="button" className={`${commonStyles.syncButton} ${needsSyncWarning ? commonStyles.syncButtonWarning : ''}`} onClick={() => syncDomainExpiration(domaine.nom)} title="Sync expiration date from OVH" disabled={loadingSync[domaine.nom]}>
                    <IconifyIcon icon="material-symbols:sync" width={14} height={14} className={loadingSync[domaine.nom] ? styles.loadingIcon : ''} />
                  </button>
                  {}
                  <div style={{
                  flex: '0 0 auto'
                }}>
                    
                  </div>
                </div>
              </div>

              {}
              <textarea id={`comment-${domaine.nom}`} className={styles.commentTextarea} value={data?.[domaine.nom]?.comment || ""} onChange={e => handleCommentChange(domaine.nom, e.target.value)} onFocus={e => e.target.select()} placeholder="Comment..." disabled={!setData} rows="2" />
            </div>;
        })}
          </div>
        </div>)}
    </div>;
};
export default NDD;
