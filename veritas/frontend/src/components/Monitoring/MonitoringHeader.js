import { useEffect, useState } from "react";
import { TbReportAnalytics } from "react-icons/tb";
import { FaSync, FaUpload, FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiWeb, mdiWallFire, mdiWifiMarker, mdiBug } from "@mdi/js";
import SmartTooltip from "../SmartTooltip";
import styles from "./MonitoringHeader.module.css";
const shortenSiteName = siteName => {
  if (!siteName) return siteName;
  return siteName.substring(0, 3).toUpperCase();
};
export default function MonitoringHeader({
  clientName,
  title,
  stepLabel,
  progressPercent,
  reportStartDate = null,
  reportEndDate = null,
  modules = [],
  currentModule,
  currentSite,
  sites = [],
  onSelectSite,
  onSelectModule,
  onPrev,
  onNext,
  onReset,
  onQuit,
  hasPrev,
  hasNext,
  isLastItem,
  isFormValid,
  nextLabel = "Next",
  prevLabel = "Previous",
  resetLabel = "Reset",
  nextDisabled = false,
  checkMKSyncInfo = null,
  summaryActions = null,
  csvImportInfo = null,
  children,
  isFullscreen = true
}) {
  const isBrowser = typeof window !== "undefined";
  const [office365SyncAvailable, setOffice365SyncAvailable] = useState(false);
  const [office365SyncLoading, setOffice365SyncLoading] = useState(false);
  const isOffice365Module = typeof currentModule === "string" && currentModule.toLowerCase().includes("office365");
  const formatReportDate = value => {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };
  const formattedStartDate = formatReportDate(reportStartDate);
  const formattedEndDate = formatReportDate(reportEndDate);
  useEffect(() => {
    if (!isBrowser) return;
    const updateAvailability = () => {
      setOffice365SyncAvailable(!!window.__office365SyncTrigger);
    };
    const updateState = event => {
      if (event?.detail && Object.prototype.hasOwnProperty.call(event.detail, "isSyncing")) {
        setOffice365SyncLoading(!!event.detail.isSyncing);
      } else {
        setOffice365SyncLoading(!!window.__office365SyncIsSyncing);
      }
    };
    updateAvailability();
    setOffice365SyncLoading(!!window.__office365SyncIsSyncing);
    window.addEventListener("office365-sync-available", updateAvailability);
    window.addEventListener("office365-sync-state", updateState);
    return () => {
      window.removeEventListener("office365-sync-available", updateAvailability);
      window.removeEventListener("office365-sync-state", updateState);
    };
  }, [isBrowser]);
  return <>
      {}
      {isFullscreen && hasPrev && currentModule !== "summary" && <div className={styles.leftPanel}>
          <SmartTooltip content={prevLabel} as="span" style={{
        display: 'inline-flex'
      }}>
            <button className={styles.panelButton} onClick={onPrev} title={prevLabel}>
              <IconifyIcon icon="mynaui:chevron-left-solid" width={48} height={48} style={{
            color: "#000000"
          }} />
            </button>
          </SmartTooltip>
        </div>}
      {isFullscreen && hasNext && <div className={styles.rightPanel}>
          <SmartTooltip content={nextDisabled ? "Please fill in the required fields" : isLastItem ? 'Finish' : nextLabel} as="span" style={{
        display: 'inline-flex'
      }}>
            <button className={`${styles.panelButton} ${styles.primary} ${nextDisabled ? styles.disabled : ''}`} onClick={isFormValid ? onNext : undefined} disabled={nextDisabled} title={nextDisabled ? "Please fill in the required fields" : isLastItem ? 'Finish' : nextLabel}>
              {isLastItem ? '✓' : <IconifyIcon icon="mynaui:chevron-right-solid" width={48} height={48} style={{
            color: "#000000"
          }} />}
            </button>
          </SmartTooltip>
        </div>}

      {}
      <header className={styles.headerSection}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeftGroup}>
            <div className={styles.headerInfo}>
              {clientName ? <>
                  <p className={styles.clientName}>{clientName}</p>
                  {(formattedStartDate || formattedEndDate) && <p className={styles.headerSubtitle} style={{
                fontSize: "0.8rem",
                opacity: 0.85
              }}>
                      {formattedStartDate || "-"}
                      {formattedEndDate ? ` to ${formattedEndDate}` : ""}
                    </p>}
                </> : null}
              <h1 className={styles.headerTitle}>{title}</h1>
            </div>
            
            {Array.isArray(modules) && modules.length > 0 && <div className={styles.moduleNavContainer}>
                {(() => {
              const filteredModules = modules.filter(m => !!m);
              const getInfrastructureOrder = moduleName => {
                const key = String(moduleName).toLowerCase();
                if (key.includes('internet')) return 1;
                if (key.includes('firewall') && !key.includes('regle')) return 2;
                if (key.includes('serveur')) return 3;
                if (key.includes('stockage')) return 4;
                if (key.includes('switch')) return 5;
                if (key.includes('wifi') || key.includes('borne')) return 6;
                return 99;
              };
              const infrastructureModules = filteredModules.filter(m => getModuleCategory(m) === 'infrastructure').sort((a, b) => getInfrastructureOrder(a) - getInfrastructureOrder(b));
              const getCybersecuriteOrder = moduleName => {
                const key = String(moduleName).toLowerCase();
                if (key.includes('antivirus')) return 1;
                if (key.includes('antispam')) return 2;
                if (key.includes('firewall') || key.includes('firewallregle')) return 3;
                if (key.includes('sauvegarde')) return 4;
                return 99;
              };
              const cybersecuriteModules = filteredModules.filter(m => getModuleCategory(m) === 'cybersecurite').sort((a, b) => getCybersecuriteOrder(a) - getCybersecuriteOrder(b));
              const servicesModules = filteredModules.filter(m => getModuleCategory(m) === 'services');
              const summaryModule = filteredModules.find(m => getModuleCategory(m) === 'summary');
              return <>
              <nav className={styles.moduleNav}>
                        {infrastructureModules.length > 0 && <div className={`${styles.moduleGroup} ${styles.infrastructureGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.infrastructureLabel}`}>INFRASTRUCTURE</span>
                              <div className={styles.groupLine} style={{
                        borderColor: '#3b82f6'
                      }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              {infrastructureModules.map(m => {
                        const icon = getModuleIcon(m);
                        const isActive = currentModule === m;
                        return <SmartTooltip key={m} content={formatModuleLabel(m)} as="span" style={{
                          display: 'inline-flex'
                        }}>
                                    <button className={`${styles.moduleBtn} ${isActive ? styles.active : ''} ${styles.infrastructure}`} title={formatModuleLabel(m)} onClick={() => onSelectModule && onSelectModule(m)}>
                                      {icon}
                                    </button>
                                  </SmartTooltip>;
                      })}
                            </div>
                          </div>}
                        {cybersecuriteModules.length > 0 && <div className={`${styles.moduleGroup} ${styles.cybersecuriteGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.cybersecuriteLabel}`}>CYBERSECURITY</span>
                              <div className={styles.groupLine} style={{
                        borderColor: '#ef4444'
                      }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              {cybersecuriteModules.map(m => {
                        const icon = getModuleIcon(m);
                        const isActive = currentModule === m;
                        return <SmartTooltip key={m} content={formatModuleLabel(m)} as="span" style={{
                          display: 'inline-flex'
                        }}>
                                    <button className={`${styles.moduleBtn} ${isActive ? styles.active : ''} ${styles.cybersecurite}`} title={formatModuleLabel(m)} onClick={() => onSelectModule && onSelectModule(m)}>
                                      {icon}
                                    </button>
                                  </SmartTooltip>;
                      })}
                            </div>
                          </div>}
                        {servicesModules.length > 0 && <div className={`${styles.moduleGroup} ${styles.servicesGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.servicesLabel}`}>SERVICES</span>
                              <div className={styles.groupLine} style={{
                        borderColor: '#8b5cf6'
                      }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              {servicesModules.map(m => {
                        const icon = getModuleIcon(m);
                        const isActive = currentModule === m;
                        return <SmartTooltip key={m} content={formatModuleLabel(m)} as="span" style={{
                          display: 'inline-flex'
                        }}>
                      <button className={`${styles.moduleBtn} ${isActive ? styles.active : ''} ${styles.services}`} title={formatModuleLabel(m)} onClick={() => onSelectModule && onSelectModule(m)}>
                        {icon}
                      </button>
                    </SmartTooltip>;
                      })}
                            </div>
                          </div>}
                        {summaryModule && <div className={`${styles.moduleGroup} ${styles.summaryGroup}`}>
                            <div className={styles.groupHeader}>
                              <span className={`${styles.groupLabel} ${styles.summaryLabel}`}>SUMMARY</span>
                              <div className={styles.groupLine} style={{
                        borderColor: 'transparent'
                      }}></div>
                            </div>
                            <div className={styles.moduleButtonsRow}>
                              <SmartTooltip content={formatModuleLabel(summaryModule)} as="span" style={{
                        display: 'inline-flex'
                      }}>
                                <button className={`${styles.moduleBtn} ${currentModule === summaryModule ? styles.active : ''} ${styles.summary}`} title={formatModuleLabel(summaryModule)} onClick={() => onSelectModule && onSelectModule(summaryModule)}>
                                  {getModuleIcon(summaryModule)}
                                </button>
                              </SmartTooltip>
                            </div>
                          </div>}
              </nav>
                    </>;
            })()}
                
                {}
                {Array.isArray(sites) && sites.length > 0 && <div className={`${styles.moduleGroup} ${styles.sitesGroup}`}>
                    <div className={styles.groupHeader}>
                      <span className={`${styles.groupLabel} ${styles.sitesLabel}`}>SITES</span>
                      <div className={styles.groupLine} style={{
                  borderColor: '#6b7280'
                }}></div>
                    </div>
                    <div className={styles.moduleButtonsRow}>
                      {sites.map(site => {
                  const isActive = currentSite === site;
                  return <SmartTooltip key={site} content={`Go to site ${site}`} as="span" style={{
                    display: 'inline-flex'
                  }}>
                              <button className={`${styles.sitePill} ${isActive ? styles.active : ''}`} title={`Go to site ${site}`} onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onSelectSite) {
                        onSelectSite(site);
                      }
                    }}>
                                <span style={{
                        color: '#000000'
                      }}>{shortenSiteName(site)}</span>
                              </button>
                            </SmartTooltip>;
                })}
                    </div>
                  </div>}
              </div>}
            
          </div>
          
          <div className={styles.headerRightGroup}>
            {}
            <div className={styles.actionBar}>
              {isOffice365Module && office365SyncAvailable && <SmartTooltip content="Sync Microsoft 365 data" as="div" style={{
              display: 'inline-block'
            }}>
                  <button onClick={() => {
                if (isBrowser && typeof window.__office365SyncTrigger === "function") {
                  window.__office365SyncTrigger();
                }
              }} disabled={office365SyncLoading} className={styles.syncAllButton} title="Sync Microsoft 365">
                    <FaSync style={{
                  animation: office365SyncLoading ? "spin 1s linear infinite" : "none"
                }} />
                  </button>
                </SmartTooltip>}
              {}
            {checkMKSyncInfo && checkMKSyncInfo.hasCheckMKMappings && <SmartTooltip content={String(currentModule).toLowerCase() === 'ndd' ? "Sync all expiration dates with OVH" : "Sync all mapped equipment with Check MK"} as="div" style={{
              display: 'inline-block'
            }}>
                <button onClick={checkMKSyncInfo.syncAllCheckMK} disabled={checkMKSyncInfo.isLoading} className={styles.syncAllButton} title={String(currentModule).toLowerCase() === 'ndd' ? "Sync all expiration dates with OVH" : "Sync all mapped equipment with Check MK"}>
                  <FaSync style={{
                  animation: checkMKSyncInfo.isLoading ? 'spin 1s linear infinite' : 'none'
                }} />
                </button>
              </SmartTooltip>}
              
              {csvImportInfo && csvImportInfo.triggerCSVImport && <SmartTooltip content="Import a CSV file" as="div" style={{
              display: 'inline-block'
            }}>
                  <button onClick={csvImportInfo.triggerCSVImport} className={styles.syncAllButton} title="Import a CSV file">
                    <FaUpload />
                  </button>
                </SmartTooltip>}
              {currentModule === 'summary' && summaryActions && <div className={styles.summaryActions}>
                  <SmartTooltip content="Save the report" as="div" style={{
                display: 'inline-block'
              }}>
                    <button onClick={summaryActions.openSaveModal} className={styles.syncAllButton} title="Save">
                      <IconifyIcon icon="material-symbols:save" width={18} height={18} />
                    </button>
                  </SmartTooltip>
                  <SmartTooltip content="Export the report as HTML (ZIP)" as="div" style={{
                display: 'inline-block'
              }}>
                    <button onClick={summaryActions.exportHTML} className={styles.syncAllButton} title="Export HTML">
                      <IconifyIcon icon="codicon:file-zip" width={18} height={18} />
                    </button>
                  </SmartTooltip>
                </div>}
              {}
          </div>
          </div>
          {}
          <div className={styles.mobileNavButtons}>
            {hasPrev && <SmartTooltip content={prevLabel} as="span" style={{
            display: 'inline-flex'
          }}>
                <button className={styles.mobileNavButton} onClick={onPrev} title={prevLabel}>
                  ‹ Previous
                </button>
              </SmartTooltip>}
            {hasNext && <SmartTooltip content={nextDisabled ? "Please fill in the required fields" : isLastItem ? 'Finish' : nextLabel} as="span" style={{
            display: 'inline-flex'
          }}>
                <button className={`${styles.mobileNavButton} ${styles.primary} ${nextDisabled ? styles.disabled : ''}`} onClick={isFormValid ? onNext : undefined} disabled={nextDisabled} title={nextDisabled ? "Please fill in the required fields" : isLastItem ? 'Finish' : nextLabel}>
                  {isLastItem ? '✓ Finish' : '› Next'}
                </button>
              </SmartTooltip>}
          </div>
        </div>
        {}
        <div className={styles.headerProgressBar}>
          {}
          <div className={styles.headerProgressBarFill} style={{
          width: `${Math.min(Math.max(progressPercent || 0, 0), 100)}%`
        }} />

          {}
          {checkMKSyncInfo && checkMKSyncInfo.isLoading && <div className={styles.syncProgressBar}>
              <div className={styles.syncProgressBarFill} />
            </div>}
        </div>
        {children}
      </header>
    </>;
}
function getModuleIcon(moduleName) {
  const key = String(moduleName || "").toLowerCase();
  const iconColor = "#000000";
  switch (key) {
    case "internet":
      return <span className={styles.moduleBtnIcon}>
          <Icon path={mdiWeb} color={iconColor} />
        </span>;
    case "firewalls":
    case "firewall":
      return <span className={styles.moduleBtnIcon}>
          <Icon path={mdiWallFire} color={iconColor} />
        </span>;
    case "wifi":
      return <span className={styles.moduleBtnIcon}>
          <Icon path={mdiWifiMarker} color={iconColor} />
        </span>;
    case "serveurs":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="mingcute:server-fill" color={iconColor} />
        </span>;
    case "stockage":
      return <span className={styles.moduleBtnIcon}>
          <IoServerSharp color={iconColor} />
        </span>;
    case "switch":
      return <span className={styles.moduleBtnIcon}>
          <FaEthernet color={iconColor} />
        </span>;
    case "antivirus":
      return <span className={styles.moduleBtnIcon}>
          <Icon path={mdiBug} color={iconColor} />
        </span>;
    case "antispam":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="material-symbols:mail-shield-outline" color={iconColor} />
        </span>;
    case "firewallregles":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="iconoir:pc-firewall" color={iconColor} />
        </span>;
    case "sauvegarde":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="material-symbols:backup" color={iconColor} />
        </span>;
    case "office365":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="hugeicons:office-365" color={iconColor} />
        </span>;
    case "ndd":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="stash:domain" color={iconColor} />
        </span>;
    case "summary":
    case "résumé":
      return <span className={styles.moduleBtnIcon}>
          <IconifyIcon icon="mdi:invoice-text" color={iconColor} />
        </span>;
    default:
      return <span className={styles.moduleBtnIcon}>
          <TbReportAnalytics />
        </span>;
  }
}
function formatModuleLabel(m) {
  if (!m) return '';
  const map = {
    internet: 'Internet',
    serveurs: 'Servers',
    stockage: 'Storage',
    firewalls: 'Firewalls',
    firewall: 'Firewalls',
    switch: 'Switches',
    wifi: 'WiFi Access Points',
    sauvegarde: 'Backup',
    antivirus: 'Antivirus',
    antispam: 'Antispam',
    office365: 'Office 365',
    ndd: 'Domain Names',
    firewallregles: "Filtering rules",
    summary: "Summary"
  };
  return map[String(m).toLowerCase()] || m;
}
function getModuleCategory(moduleName) {
  if (!moduleName) return 'infrastructure';
  const key = String(moduleName).toLowerCase();
  const infrastructureModules = ['internet', 'serveurs', 'stockage', 'firewalls', 'firewall', 'switch', 'wifi'];
  const cybersecuriteModules = ['sauvegarde', 'antivirus', 'antispam', 'coffre fort numérique', 'coffrefort', 'firewall regle de filtrage', 'firewallregle', 'firewallregles'];
  const servicesModules = ['ndd', 'office365', 'office 365'];
  if (key === 'summary' || key === 'résumé') {
    return 'summary';
  }
  if (infrastructureModules.includes(key)) {
    return 'infrastructure';
  } else if (cybersecuriteModules.includes(key)) {
    return 'cybersecurite';
  } else if (servicesModules.includes(key)) {
    return 'services';
  }
  return 'infrastructure';
}
