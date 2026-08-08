import React, { useMemo } from "react";
import { useTheme } from '../../../hooks/useTheme';
import styles from "./SauvegardeSummary.module.css";
import { FaServer, FaCube, FaCheckCircle, FaExclamationCircle, FaTimesCircle, FaQuestionCircle } from "react-icons/fa";
import Icon from "@mdi/react";
import { mdiNas, mdiServerNetworkOutline, mdiHarddisk, mdiVhs } from "@mdi/js";
import { Icon as IconifyIcon } from "@iconify/react";
import { scoreToColor } from "../../../utils/gradeUtils";
import { getIconPath } from "../../../utils/assetHelper";
const BackupSummary = ({
  data,
  config
}) => {
  const {
    theme
  } = useTheme();
  const sauvegarde = config?.client?.equipements?.Sauvegarde;
  const instances = sauvegarde?.instances || [];
  const getInstanceIcon = logiciel => {
    if (logiciel === "Veeam") {
      return <img src={getIconPath('veeam.png')} alt="Veeam" style={{
        width: '1.2rem',
        height: '1.2rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px',
        marginRight: '0.5rem'
      }} />;
    } else if (logiciel === "HYCU Backup") {
      return <img src={getIconPath('hycu.png')} alt="HYCU Backup" style={{
        width: '1.2rem',
        height: '1.2rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px',
        marginRight: '0.5rem'
      }} />;
    } else if (logiciel === "HyperBackup") {
      return <img src={getIconPath('hyperbackup.png')} alt="HyperBackup" style={{
        width: '1.2rem',
        height: '1.2rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px',
        marginRight: '0.5rem'
      }} />;
    } else if (logiciel === "Active Backup for Microsoft 365") {
      return <img src={getIconPath('active-backup.png')} alt="Active Backup for Microsoft 365" style={{
        width: '1.2rem',
        height: '1.2rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px',
        marginRight: '0.5rem'
      }} />;
    }
    return null;
  };
  const getJobStatus = jobData => {
    if (!jobData) return {
      status: "unknown",
      icon: FaQuestionCircle,
      color: "#9ca3af"
    };
    const lastStatus = jobData.lastStatus || "UNKNOWN";
    switch (lastStatus) {
      case "SUCCESS":
        return {
          status: "success",
          icon: FaCheckCircle,
          color: "#10b981"
        };
      case "FAIL":
        return {
          status: "critical",
          icon: FaTimesCircle,
          color: "#ef4444"
        };
      case "WARNING":
        return {
          status: "warning",
          icon: FaExclamationCircle,
          color: "#f59e0b"
        };
      case "UNKNOWN":
      default:
        return {
          status: "unknown",
          icon: FaQuestionCircle,
          color: "#9ca3af"
        };
    }
  };
  const getJobStats = jobCheckmkData => {
    if (!jobCheckmkData) {
      return null;
    }
    let state = null;
    let result = null;
    let creationTime = null;
    let endTime = null;
    let type = null;
    if (jobCheckmkData.state !== undefined) state = jobCheckmkData.state;
    if (jobCheckmkData.result !== undefined) result = jobCheckmkData.result;
    if (jobCheckmkData.creation_time !== undefined) creationTime = jobCheckmkData.creation_time;
    if (jobCheckmkData.end_time !== undefined) endTime = jobCheckmkData.end_time;
    if (jobCheckmkData.type !== undefined) type = jobCheckmkData.type;
    if (jobCheckmkData.metrics && Array.isArray(jobCheckmkData.metrics)) {
      jobCheckmkData.metrics.forEach(metric => {
        if (metric.name === 'State' || metric.name === 'state') state = metric.value;
        if (metric.name === 'Result' || metric.name === 'result') result = metric.value;
        if (metric.name === 'Creation time' || metric.name === 'creation_time') creationTime = metric.value;
        if (metric.name === 'End time' || metric.name === 'end_time') endTime = metric.value;
        if (metric.name === 'Type' || metric.name === 'type') type = metric.value;
      });
    }
    if (jobCheckmkData.service_info) {
      if (jobCheckmkData.service_info.state) state = jobCheckmkData.service_info.state;
      if (jobCheckmkData.service_info.result) result = jobCheckmkData.service_info.result;
      if (jobCheckmkData.service_info.creation_time) creationTime = jobCheckmkData.service_info.creation_time;
      if (jobCheckmkData.service_info.end_time) endTime = jobCheckmkData.service_info.end_time;
      if (jobCheckmkData.service_info.type) type = jobCheckmkData.service_info.type;
    }
    const output = jobCheckmkData.output || jobCheckmkData.plugin_output || jobCheckmkData.service_output || '';
    if (output && typeof output === 'string') {
      const stateMatch = output.match(/State:\s*([^,]+)/i);
      const resultMatch = output.match(/Result:\s*([^,]+)/i);
      const creationMatch = output.match(/Creation time:\s*([^,]+)/i);
      const endMatch = output.match(/End time:\s*([^,]+)/i);
      const typeMatch = output.match(/Type:\s*([^,]+)/i);
      if (stateMatch) state = stateMatch[1].trim();
      if (resultMatch) result = resultMatch[1].trim();
      if (creationMatch) creationTime = creationMatch[1].trim();
      if (endMatch) endTime = endMatch[1].trim();
      if (typeMatch) type = typeMatch[1].trim();
    }
    if (jobCheckmkData.details) {
      if (jobCheckmkData.details.state) state = jobCheckmkData.details.state;
      if (jobCheckmkData.details.result) result = jobCheckmkData.details.result;
      if (jobCheckmkData.details.creation_time) creationTime = jobCheckmkData.details.creation_time;
      if (jobCheckmkData.details.end_time) endTime = jobCheckmkData.details.end_time;
      if (jobCheckmkData.details.type) type = jobCheckmkData.details.type;
    }
    let duration = null;
    if (creationTime && endTime) {
      try {
        const parseDate = dateStr => {
          const parts = dateStr.trim().split(' ');
          if (parts.length === 2) {
            const [datePart, timePart] = parts;
            const [day, month, year] = datePart.split('.');
            const [hour, minute, second] = timePart.split(':');
            return new Date(year, month - 1, day, hour, minute, second || 0);
          }
          return new Date(dateStr);
        };
        const start = parseDate(creationTime);
        const end = parseDate(endTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffMs = end - start;
          const diffMinutes = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMinutes / 60);
          const reMayningMinutes = diffMinutes % 60;
          if (diffHours > 0) {
            duration = `${diffHours}h ${reMayningMinutes}min`;
          } else {
            duration = `${diffMinutes}min`;
          }
        }
      } catch (e) {}
    }
    return {
      state,
      result,
      creationTime,
      endTime,
      type,
      duration
    };
  };
  const getResultColor = result => {
    if (!result) return theme === 'dark' ? '#9ca3af' : '#6b7280';
    const resultLower = result.toLowerCase();
    if (resultLower.includes('success') || resultLower.includes('succès')) {
      return '#10b981';
    } else if (resultLower.includes('fail') || resultLower.includes('échec') || resultLower.includes('error') || resultLower.includes('failure')) {
      return '#ef4444';
    } else if (resultLower.includes('warning') || resultLower.includes('avertissement')) {
      return '#f59e0b';
    }
    return theme === 'dark' ? '#e5e7eb' : '#111827';
  };
  const calculateGlobalBackupHealthScore = () => {
    if (!data || instances.length === 0) return null;
    let totalJobs = 0;
    let successJobs = 0;
    let failedJobs = 0;
    let warningJobs = 0;
    instances.forEach((instance, instanceIndex) => {
      const instanceData = data?.[instanceIndex];
      if (!instanceData) return;
      Object.keys(instanceData).forEach(jobIndex => {
        if (jobIndex !== 'comment') {
          totalJobs++;
          const jobData = instanceData[jobIndex];
          if (jobData?.lastStatus === "SUCCESS") {
            successJobs++;
          } else if (jobData?.lastStatus === "FAIL") {
            failedJobs++;
          } else if (jobData?.lastStatus === "WARNING") {
            warningJobs++;
          }
        }
      });
    });
    if (totalJobs === 0) return null;
    let score = 100;
    const factors = [];
    const successRate = successJobs / totalJobs * 100;
    const successScore = successRate / 100 * 50;
    score -= 50 - successScore;
    factors.push({
      name: 'Success rate',
      value: successRate,
      weight: 50
    });
    const failRate = failedJobs / totalJobs * 100;
    const failPenalty = Math.min(failRate * 0.2, 20);
    score -= failPenalty;
    factors.push({
      name: 'Failure rate',
      value: failRate,
      weight: 20
    });
    const warningRate = warningJobs / totalJobs * 100;
    const warningPenalty = Math.min(warningRate * 0.1, 10);
    score -= warningPenalty;
    factors.push({
      name: 'Warnings',
      value: warningRate,
      weight: 10
    });
    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      score,
      factors,
      totalJobs,
      successJobs,
      failedJobs,
      warningJobs
    };
  };
  const getHealthScoreColor = score => scoreToColor(score);
  const isFactorHigherBetter = name => {
    if (!name) return true;
    const lowerBetter = ["failure", "échec", "avertissement", "warning", "Failure rate", "Failure rate"];
    return !lowerBetter.some(keyword => name.toLowerCase().includes(keyword));
  };
  const getFactorDescription = name => {
    const descriptions = {
      "Success rate": "Share of jobs successfully executed across all backups",
      "Failure rate": "Percentage of jobs that ended in error over the observed period",
      "Warnings": "Jobs completed with Warning status (incomplete, atypical duration, etc.)"
    };
    return descriptions[name] || "";
  };
  const getInstanceInfo = instance => {
    const info = [];
    if (instance.version) info.push(`Version ${instance.version}`);
    if (instance.server) info.push(`Serveur: ${instance.server}`);
    if (instance.logiciel === "Veeam" && instance.expiration) {
      const expirationDate = new Date(instance.expiration);
      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiration < 0) {
        info.push(`License expired (${expirationDate.toLocaleDateString('en-US')})`);
      } else if (daysUntilExpiration <= 30) {
        info.push(`License expires in ${daysUntilExpiration} days (${expirationDate.toLocaleDateString('en-US')})`);
      } else {
        info.push(`License until ${expirationDate.toLocaleDateString('en-US')}`);
      }
    } else if (instance.expiration) {
      const expirationDate = new Date(instance.expiration);
      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiration < 0) {
        info.push("License expired");
      } else if (daysUntilExpiration <= 30) {
        info.push(`License expires in ${daysUntilExpiration} days`);
      } else {
        info.push(`License until ${expirationDate.toLocaleDateString('en-US')}`);
      }
    }
    return info;
  };
  const getJobInfo = job => {
    const parts = [];
    if (job.type && job.regularite && job.horaire) {
      const backupType = job.type.toLowerCase() !== 'job' ? job.type : null;
      if (backupType) {
        parts.push(`Backup ${backupType} ${job.regularite} at ${job.horaire}`);
      } else {
        parts.push(`Backup ${job.regularite} at ${job.horaire}`);
      }
    } else {
      if (job.type && job.type.toLowerCase() !== 'job') parts.push(job.type);
      if (job.regularite) parts.push(job.regularite);
      if (job.horaire) parts.push(`at ${job.horaire}`);
    }
    if (job.retention) {
      parts.push(`Retention: ${job.retention}`);
    }
    return parts.length > 0 ? parts.join(" - ") : null;
  };
  const getServerDetails = serverName => {
    if (!serverName || !config?.client?.equipements?.Serveurs) return null;
    const server = config.client.equipements.Serveurs.find(srv => srv.nom === serverName);
    if (!server) return null;
    return {
      nom: server.nom,
      type: server.type || 'Not defined',
      role: server.role || 'Not defined',
      systeme: server.systeme || 'Not defined',
      ip: server.ip || 'Not defined',
      vlan: server.vlan || 'Not defined'
    };
  };
  const getStorageDetails = storageName => {
    if (!storageName) return null;
    const cleanName = storageName.replace(/^(NAS|SAN|DISQUE)-/, '');
    if (config?.client?.equipements?.NAS) {
      const nasStorage = config.client.equipements.NAS.find(nas => nas.nom === cleanName);
      if (nasStorage) {
        return {
          nom: nasStorage.nom,
          type: nasStorage.type || 'Not defined',
          role: nasStorage.role || 'Not defined',
          systeme: nasStorage.systeme || 'Not defined',
          ip: nasStorage.ip || 'Not defined',
          vlan: nasStorage.vlan || 'Not defined',
          capacite: nasStorage.capacite || 'Not defined',
          raid: nasStorage.raid || 'Not defined'
        };
      }
    }
    if (config?.client?.equipements?.SAN) {
      const sanStorage = config.client.equipements.SAN.find(san => san.nom === cleanName);
      if (sanStorage) {
        return {
          nom: sanStorage.nom,
          type: 'SAN',
          role: sanStorage.role || 'Not defined',
          systeme: sanStorage.systeme || 'Not defined',
          ip: sanStorage.ip || 'Not defined',
          vlan: sanStorage.vlan || 'Not defined',
          capacite: sanStorage.capacite || 'Not defined',
          raid: sanStorage.raid || 'Not defined'
        };
      }
    }
    return null;
  };
  const getServerIcon = serverName => {
    const serverDetails = getServerDetails(serverName);
    if (!serverDetails) return null;
    if (serverDetails.type === "physique") {
      return <FaServer style={{
        fontSize: '1.25rem',
        color: theme === 'dark' ? '#d1d5db' : '#374151',
        verticalAlign: 'middle'
      }} />;
    } else {
      return <FaCube style={{
        fontSize: '1.25rem',
        color: theme === 'dark' ? '#d1d5db' : '#374151',
        verticalAlign: 'middle'
      }} />;
    }
  };
  const getStorageIcon = (storageName, size = "1.25rem", color = null) => {
    if (!storageName) return null;
    let storageType = 'NAS';
    if (storageName.startsWith('NAS-')) {
      storageType = 'NAS';
    } else if (storageName.startsWith('SAN-')) {
      storageType = 'SAN';
    } else if (storageName.startsWith('DISQUE-')) {
      storageType = 'DISQUE';
    } else {
      const storageDetails = getStorageDetails(storageName);
      if (storageDetails) {
        if (storageDetails.type === 'Disk dur externe') {
          storageType = 'DISQUE';
        } else if (storageDetails.type === 'Backup robot') {
          storageType = 'RDX';
        } else if (storageDetails.type === 'SAN') {
          storageType = 'SAN';
        }
      }
    }
    const iconColor = color || (theme === 'dark' ? '#d1d5db' : '#374151');
    const iconStyle = {
      color: iconColor,
      verticalAlign: 'middle',
      display: 'inline-block'
    };
    switch (storageType) {
      case 'NAS':
        return <Icon path={mdiNas} size={size} style={iconStyle} />;
      case 'SAN':
        return <Icon path={mdiServerNetworkOutline} size={size} style={iconStyle} />;
      case 'DISQUE':
        return <Icon path={mdiHarddisk} size={size} style={iconStyle} />;
      case 'RDX':
        return <Icon path={mdiVhs} size={size} style={iconStyle} />;
      default:
        return <Icon path={mdiNas} size={size} style={iconStyle} />;
    }
  };
  const healthScore = useMemo(() => calculateGlobalBackupHealthScore(), [data, instances]);
  const totalJobs = healthScore?.totalJobs || 0;
  const successJobs = healthScore?.successJobs || 0;
  const failedJobs = healthScore?.failedJobs || 0;
  const warningJobs = healthScore?.warningJobs || 0;
  const successRate = totalJobs > 0 ? successJobs / totalJobs * 100 : 0;
  const failRate = totalJobs > 0 ? failedJobs / totalJobs * 100 : 0;
  const warningRate = totalJobs > 0 ? warningJobs / totalJobs * 100 : 0;
  if (!instances || instances.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.emptyState}>
          <p>No backup instance configured for this client.</p>
        </div>
      </div>;
  }
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
        {}
        <div className={styles.metricsRow}>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Instances suivies</div>
            <div className={styles.metricValue}>{instances.length}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Total jobs</div>
            <div className={styles.metricValue}>{totalJobs}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Jobs en success</div>
            <div className={styles.metricValue} style={{
          color: "#10b981"
        }}>{successJobs}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Failed jobs</div>
            <div className={styles.metricValue} style={{
          color: "#ef4444"
        }}>{failedJobs}</div>
          </div>
          <div className={styles.metricItem}>
            <div className={styles.metricLabel}>Jobs en warning</div>
            <div className={styles.metricValue} style={{
          color: "#f59e0b"
        }}>{warningJobs}</div>
          </div>
        </div>

        {}
        <div style={{
      marginTop: '2rem'
    }}>
          <h4 className={styles.sectionTitle} style={{
        marginBottom: '1rem'
      }}>
            Instances de sauvegarde
          </h4>
          <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
            {instances.map((instance, instanceIndex) => {
          const instanceInfo = getInstanceInfo(instance);
          const instanceData = data?.[instanceIndex] || {};
          return <div key={`instance-${instanceIndex}`} className={styles.instanceCard}>
                  {}
                  <div className={styles.cardHeader}>
                    <div className={styles.headerLeft}>
                      {getInstanceIcon(instance.logiciel)}
                      <div className={styles.instanceInfo}>
                        <h3 className={styles.instanceName}>
                          {instance.logiciel}
                        </h3>
                        {instanceInfo.length > 0 && <p className={styles.instanceDetails}>
                            {instanceInfo.join(" • ")}
                          </p>}
                      </div>
                    </div>
                  </div>

                  {}
                  {instance.logiciel === "HyperBackup" && instance.hyperbackupSource && instance.hyperbackupDestination && <div className={styles.flowInfo} style={{
              marginTop: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
                      <div className={styles.flowInline} style={{
                gap: '2rem'
              }}>
                        <div className={styles.flowSource} style={{
                  minWidth: '180px',
                  maxWidth: '220px',
                  padding: '1.5rem'
                }}>
                          <span className={styles.flowIcon}>
                            {getStorageIcon(instance.hyperbackupSource, "2.5rem") || <Icon path={mdiNas} size="2.5rem" style={{
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      verticalAlign: 'middle',
                      display: 'inline-block'
                    }} />}
                          </span>
                          <span className={styles.flowText} style={{
                    fontSize: '1rem'
                  }}>
                            {instance.hyperbackupSource.replace(/^NAS-/, '')}
                          </span>
                        </div>
                        <div className={styles.flowTransfer}>
                          <span className={`${styles.flowArrow} ${styles.flowArrowBlue}`}></span>
                        </div>
                        <div className={styles.flowDestination} style={{
                  minWidth: '180px',
                  maxWidth: '220px',
                  padding: '1.5rem'
                }}>
                          <span className={styles.flowIcon}>
                            {getStorageIcon(instance.hyperbackupDestination, "2.5rem") || <Icon path={mdiNas} size="2.5rem" style={{
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      verticalAlign: 'middle',
                      display: 'inline-block'
                    }} />}
                          </span>
                          <span className={styles.flowText} style={{
                    fontSize: '1rem'
                  }}>
                            {instance.hyperbackupDestination.replace(/^NAS-/, '')}
                          </span>
                        </div>
                      </div>
                    </div>}

                  {}
                  {instance.logiciel === "Active Backup for Microsoft 365" && instance.activeBackupModules && instance.activeBackupStorage && <div style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              padding: '2rem',
              background: 'transparent',
              borderRadius: '16px',
              border: 'none',
              boxShadow: 'none'
            }}>
                      <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '2rem',
                flexWrap: 'wrap'
              }}>
                        {}
                        <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.875rem',
                  flex: '1 1 auto',
                  minWidth: '400px'
                }}>
                          {(() => {
                    const moduleLabels = {
                      exchange: 'Exchange',
                      oneDrive: 'OneDrive',
                      sharePoint: 'SharePoint',
                      teams: 'Teams',
                      calendar: 'Calendar',
                      contacts: 'Contacts'
                    };
                    const moduleIcons = {
                      exchange: 'simple-icons:microsoftexchange',
                      oneDrive: 'entypo-social:onedrive',
                      sharePoint: 'mdi:microsoft-sharepoint',
                      teams: 'simple-icons:microsoftteams',
                      calendar: 'mdi:calendar',
                      contacts: 'mdi:contacts'
                    };
                    return Object.entries(instance.activeBackupModules || {}).map(([key, enabled]) => {
                      const isActive = enabled === true;
                      return <div key={key} style={{
                        position: 'relative',
                        padding: '1rem 0.75rem',
                        background: isActive ? theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        borderRadius: '12px',
                        border: isActive ? `1.5px solid #10b981` : `1px solid ${theme === 'dark' ? '#3a3a5a' : '#e2e8f0'}`,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                                  <IconifyIcon icon={moduleIcons[key] || 'mdi:microsoft-office'} style={{
                          fontSize: '1.75rem',
                          color: isActive ? '#10b981' : theme === 'dark' ? '#6b7280' : '#9ca3af'
                        }} />
                                  <div style={{
                          fontSize: '0.65rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                          textAlign: 'center',
                          lineHeight: '1.2'
                        }}>
                                    {moduleLabels[key] || key}
                                  </div>
                                </div>;
                    });
                  })()}
                        </div>
                        
                        {}
                        <div className={styles.flowTransfer}>
                          <span className={`${styles.flowArrow} ${styles.flowArrowBlue}`}></span>
                        </div>
                        
                        {}
                        <div className={styles.flowDestination} style={{
                  minWidth: '180px',
                  maxWidth: '220px',
                  padding: '1.5rem'
                }}>
                          <span className={styles.flowIcon}>
                            {getStorageIcon(instance.activeBackupStorage, "2.5rem") || <Icon path={mdiNas} size="2.5rem" style={{
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      verticalAlign: 'middle',
                      display: 'inline-block'
                    }} />}
                          </span>
                          <span className={styles.flowText} style={{
                    fontSize: '1rem'
                  }}>
                            {instance.activeBackupStorage}
                          </span>
                        </div>
                      </div>
                    </div>}

                  {}
                  {(instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && (instance.jobs || []).length > 0 && <>
                      {}
                      <div className={styles.jobsListSection} style={{
                marginTop: '1rem'
              }}>
                        <div className={styles.jobsListTable}>
                          <div className={styles.jobsListHeader}>
                            <div className={styles.jobsListCell} style={{
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Name</div>
                            {(instance.logiciel === "HYCU Backup" || instance.logiciel === "Veeam") && <>
                                <div className={styles.jobsListCell} style={{
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>Cible</div>
                                <div className={styles.jobsListCell} style={{
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>Destination</div>
                              </>}
                            <div className={styles.jobsListCell} style={{
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Type</div>
                            <div className={styles.jobsListCell} style={{
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Schedule</div>
                            <div className={styles.jobsListCell} style={{
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Horaire</div>
                            <div className={styles.jobsListCell} style={{
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Retention</div>
                          </div>
                          <div className={styles.jobsListTableContent}>
                            {(instance.jobs || []).map((job, jobIndex) => <div key={`job-list-${instanceIndex}-${jobIndex}`} className={styles.jobsListRow}>
                                <div className={styles.jobsListCell} style={{
                        fontWeight: '500',
                        color: theme === 'dark' ? '#f9fafb' : '#111827'
                      }}>
                                  {job.nom || `Job #${jobIndex + 1}`}
                                </div>
                                {instance.logiciel === "HYCU Backup" && <>
                                    <div className={styles.jobsListCell} style={{
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                        }}>
                                      {job.serveurLie || 'N/A'}
                                    </div>
                                    <div className={styles.jobsListCell} style={{
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                        }}>
                                      {(job.destination || 'DC PSI Bouillac / DC PSI Bruges').replace(/Datacenter/gi, 'DC')}
                                    </div>
                                  </>}
                                {instance.logiciel === "Veeam" && <>
                                    <div className={styles.jobsListCell} style={{
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                        }}>
                                      {job.serveurLie || 'N/A'}
                                    </div>
                                    <div className={styles.jobsListCell} style={{
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                        }}>
                                      {job.stockageLie ? job.stockageLie.replace(/^(NAS|SAN|DISQUE)-/, '') : job.destination || 'N/A'}
                                    </div>
                                  </>}
                                <div className={styles.jobsListCell} style={{
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                      }}>
                                  {job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : ''}
                                </div>
                                <div className={styles.jobsListCell} style={{
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                      }}>
                                  {job.regularite || ''}
                                </div>
                                <div className={styles.jobsListCell} style={{
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                      }}>
                                  {job.horaire || ''}
                                </div>
                                <div className={styles.jobsListCell} style={{
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                      }}>
                                  {job.retention || ''}
                                </div>
                              </div>)}
                          </div>
                        </div>
                      </div>

                      {}
                      <div style={{
                marginTop: '2rem'
              }}>
                        <h5 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                  marginBottom: '1.25rem',
                  letterSpacing: '-0.01em'
                }}>
                          Job details ({(instance.jobs || []).length})
                        </h5>
                        <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1.25rem'
                }}>
                        {(instance.jobs || []).map((job, jobIndex) => {
                    const jobData = instanceData[jobIndex] || {};
                    const jobStatus = getJobStatus(jobData);
                    const jobInfo = getJobInfo(job);
                    return <div key={`job-${instanceIndex}-${jobIndex}`} style={{
                      padding: '1.5rem',
                      background: theme === 'dark' ? 'linear-gradient(135deg, #1e1e3f 0%, #252547 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      borderRadius: '16px',
                      border: `1px solid ${theme === 'dark' ? '#3a3a5a' : '#e2e8f0'}`,
                      boxShadow: theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.2s ease'
                    }}>
                              {}
                              <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: `1px solid ${theme === 'dark' ? '#3a3a5a' : '#e2e8f0'}`
                      }}>
                                <div style={{
                          flex: 1,
                          minWidth: 0
                        }}>
                                  <h6 style={{
                            margin: 0,
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: theme === 'dark' ? '#f9fafb' : '#111827',
                            lineHeight: '1.3',
                            letterSpacing: '-0.02em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                                    {job.nom || `Job #${jobIndex + 1}`}
                                  </h6>
                                  {jobInfo && <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.8125rem',
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                            lineHeight: '1.4'
                          }}>
                                      {jobInfo}
                                    </p>}
                                </div>
                              </div>

                              {}
                              {instance.logiciel === "Veeam" && job.serveurLie && (job.stockageLie || job.destination) && <div className={styles.flowInfo} style={{
                        marginTop: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                                  <div className={styles.flowInline}>
                                    <div className={styles.flowSource}>
                                      <span className={styles.flowIcon}>
                                        {getServerIcon(job.serveurLie) || <FaServer style={{
                                fontSize: '1.25rem',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                verticalAlign: 'middle'
                              }} />}
                                      </span>
                                      <span className={styles.flowText}>{job.serveurLie}</span>
                                    </div>
                                    <div className={styles.flowTransfer}>
                                      <span className={styles.flowArrow}></span>
                                    </div>
                                    <div className={styles.flowDestination}>
                                      <span className={styles.flowIcon}>
                                        {getStorageIcon(job.stockageLie || job.destination, "1.25rem") || <Icon path={mdiNas} size="1.25rem" style={{
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                verticalAlign: 'middle',
                                display: 'inline-block'
                              }} />}
                                      </span>
                                      <span className={styles.flowText}>
                                        {job.stockageLie ? job.stockageLie.replace(/^(NAS|SAN|DISQUE)-/, '') : job.destination}
                                      </span>
                                    </div>
                                    {job.stockageLie && job.replicationVers && <>
                                        <div className={styles.flowTransfer}>
                                          <span className={styles.flowArrow}></span>
                                        </div>
                                        <div className={styles.flowDestination}>
                                          <span className={styles.flowIcon}>
                                            {getStorageIcon(job.replicationVers, "1.25rem") || <Icon path={mdiNas} size="1.25rem" style={{
                                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                  verticalAlign: 'middle',
                                  display: 'inline-block'
                                }} />}
                                          </span>
                                          <span className={styles.flowText}>
                                            {job.replicationVers.replace(/^(NAS|SAN|DISQUE)-/, '')}
                                          </span>
                                        </div>
                                      </>}
                                  </div>
                                </div>}

                              {}
                              {instance.logiciel === "HYCU Backup" && job.serveurLie && <div className={styles.flowInfo} style={{
                        marginTop: '0.75rem',
                        marginBottom: '0.75rem',
                        maxWidth: '550px',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                      }}>
                                  <div className={styles.flowInline}>
                                    <div className={styles.flowSource}>
                                      <span className={styles.flowIcon}>
                                        {getServerIcon(job.serveurLie) || <FaServer style={{
                                fontSize: '1.25rem',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                verticalAlign: 'middle'
                              }} />}
                                      </span>
                                      <span className={styles.flowText}>{job.serveurLie}</span>
                                    </div>
                                    <div className={styles.flowTransfer}>
                                      <span className={`${styles.flowArrow} ${styles.flowArrowPurple}`}></span>
                                    </div>
                                    <div className={styles.flowDestination}>
                                      <span className={styles.flowIcon}>
                                        <FaServer style={{
                                fontSize: '1.25rem',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                verticalAlign: 'middle'
                              }} />
                                      </span>
                                      <span className={styles.flowText}>
                                        DC PSI Bouillac
                                      </span>
                                    </div>
                                    <div className={styles.flowTransfer}>
                                      <span className={`${styles.flowArrow} ${styles.flowArrowGray}`}></span>
                                    </div>
                                    <div className={styles.flowDestination}>
                                      <span className={styles.flowIcon}>
                                        <FaServer style={{
                                fontSize: '1.25rem',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                verticalAlign: 'middle'
                              }} />
                                      </span>
                                      <span className={styles.flowText}>
                                        DC PSI Bruges
                                      </span>
                                    </div>
                                  </div>
                                </div>}

                              {}
                              {instance.logiciel === "Veeam" && job.nom && (() => {
                        const jobCheckmkData = jobData?.checkmkData;
                        const jobStats = jobCheckmkData ? getJobStats(jobCheckmkData) : null;
                        const hasCheckMKData = !!jobCheckmkData;
                        const formatDate = dateStr => {
                          if (!dateStr) return null;
                          try {
                            const parts = dateStr.trim().split(' ');
                            if (parts.length === 2) {
                              const [datePart, timePart] = parts;
                              const [day, month, year] = datePart.split('.');
                              const [hour, minute] = timePart.split(':');
                              return `${day}/${month}/${year} ${hour}:${minute}`;
                            }
                            return dateStr;
                          } catch (e) {
                            return dateStr;
                          }
                        };
                        return <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '0.75rem',
                          marginTop: '1rem'
                        }}>
                                    {}
                                    <div style={{
                            padding: '0.875rem',
                            background: theme === 'dark' ? '#2a2a4a' : '#f9fafb',
                            borderRadius: '10px',
                            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e2e8f0'}`,
                            textAlign: 'center'
                          }}>
                                      <div style={{
                              fontSize: '0.6875rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '0.5rem'
                            }}>
                                        Duration
                                      </div>
                                      <div style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: jobStats?.duration ? theme === 'dark' ? '#e5e7eb' : '#1f2937' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                              marginBottom: jobStats?.duration ? '0' : '0.25rem'
                            }}>
                                        {jobStats?.duration || 'N/A'}
                                      </div>
                                      {!jobStats?.duration && hasCheckMKData && <div style={{
                              fontSize: '0.625rem',
                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                                          Not available
                                        </div>}
                                      {!hasCheckMKData && <div style={{
                              fontSize: '0.625rem',
                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                                          Not synced
                                        </div>}
                                    </div>

                                    {}
                                    <div style={{
                            padding: '0.875rem',
                            background: theme === 'dark' ? '#2a2a4a' : '#f9fafb',
                            borderRadius: '10px',
                            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e2e8f0'}`,
                            textAlign: 'center'
                          }}>
                                      <div style={{
                              fontSize: '0.6875rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '0.5rem'
                            }}>
                                        Status
                                      </div>
                                      <div style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: jobStats?.result ? getResultColor(jobStats.result) : theme === 'dark' ? '#9ca3af' : '#6b7280',
                              marginBottom: jobStats?.result ? '0' : '0.25rem'
                            }}>
                                        {jobStats?.result || 'N/A'}
                                      </div>
                                      {!jobStats?.result && hasCheckMKData && <div style={{
                              fontSize: '0.625rem',
                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                                          Not available
                                        </div>}
                                      {!hasCheckMKData && <div style={{
                              fontSize: '0.625rem',
                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                                          Not synced
                                        </div>}
                                    </div>

                                    {}
                                    {(() => {
                            let eventsCount = null;
                            if (jobData?.eventsCount !== undefined && jobData.eventsCount !== null) {
                              eventsCount = typeof jobData.eventsCount === 'number' ? jobData.eventsCount : parseInt(jobData.eventsCount, 10);
                            } else if (jobData?.checkmkEvents !== undefined && jobData.checkmkEvents !== null) {
                              eventsCount = typeof jobData.checkmkEvents === 'number' ? jobData.checkmkEvents : parseInt(jobData.checkmkEvents, 10);
                            } else if (Array.isArray(jobData?.checkmkEventsDetails) && jobData.checkmkEventsDetails.length >= 0) {
                              eventsCount = jobData.checkmkEventsDetails.length;
                            } else if (Array.isArray(jobCheckmkData?.events) && jobCheckmkData.events.length >= 0) {
                              eventsCount = jobCheckmkData.events.length;
                            } else if (jobCheckmkData?.events_count !== undefined && jobCheckmkData.events_count !== null) {
                              eventsCount = typeof jobCheckmkData.events_count === 'number' ? jobCheckmkData.events_count : parseInt(jobCheckmkData.events_count, 10);
                            }
                            const hasEventsData = eventsCount !== null && eventsCount !== undefined;
                            return <div style={{
                              padding: '0.875rem',
                              background: theme === 'dark' ? '#2a2a4a' : '#f9fafb',
                              borderRadius: '10px',
                              border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e2e8f0'}`,
                              textAlign: 'center'
                            }}>
                                          <div style={{
                                fontSize: '0.6875rem',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '0.5rem'
                              }}>
                                            Events
                                          </div>
                                          <div style={{
                                fontSize: '1rem',
                                fontWeight: '700',
                                color: hasEventsData ? eventsCount === 0 ? '#10b981' : eventsCount <= 3 ? '#f59e0b' : '#ef4444' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                                marginBottom: hasEventsData ? '0' : '0.25rem'
                              }}>
                                            {hasEventsData ? eventsCount : 'N/A'}
                                          </div>
                                          {!hasEventsData && hasCheckMKData && <div style={{
                                fontSize: '0.625rem',
                                color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                                fontStyle: 'italic'
                              }}>
                                              Not available
                                            </div>}
                                          {!hasEventsData && !hasCheckMKData && <div style={{
                                fontSize: '0.625rem',
                                color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                                fontStyle: 'italic'
                              }}>
                                              Not synced
                                            </div>}
                                        </div>;
                          })()}

                                    {}
                                    <div style={{
                            padding: '0.875rem',
                            background: theme === 'dark' ? '#2a2a4a' : '#f9fafb',
                            borderRadius: '10px',
                            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e2e8f0'}`,
                            textAlign: 'center'
                          }}>
                                      <div style={{
                              fontSize: '0.6875rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '0.5rem'
                            }}>
                                        Date
                                      </div>
                                      <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '700',
                              color: jobStats?.endTime || jobStats?.creationTime ? theme === 'dark' ? '#e5e7eb' : '#1f2937' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                              marginBottom: jobStats?.endTime || jobStats?.creationTime ? '0' : '0.25rem',
                              lineHeight: '1.2'
                            }}>
                                        {jobStats?.endTime ? formatDate(jobStats.endTime) : jobStats?.creationTime ? formatDate(jobStats.creationTime) : 'N/A'}
                                      </div>
                                      {!(jobStats?.endTime || jobStats?.creationTime) && hasCheckMKData && <div style={{
                              fontSize: '0.625rem',
                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                                          Not available
                                        </div>}
                                      {!hasCheckMKData && <div style={{
                              fontSize: '0.625rem',
                              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                              fontStyle: 'italic'
                            }}>
                                          Not synced
                                        </div>}
                                    </div>
                                  </div>;
                      })()}
                            </div>;
                  })}
                        </div>
                      </div>
                    </>}

                  {}
                  {instance.logiciel !== "Veeam" && instance.logiciel !== "HYCU Backup" && (instance.jobs || []).length > 0 && <div style={{
              marginTop: '1rem'
            }}>
                      <h5 className={styles.jobsTitle}>
                        Jobs ({(instance.jobs || []).length})
                      </h5>
                      <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
                marginTop: '0.75rem'
              }}>
                        {(instance.jobs || []).map((job, jobIndex) => {
                  const jobData = instanceData[jobIndex] || {};
                  const jobStatus = getJobStatus(jobData);
                  const StatusIcon = jobStatus.icon;
                  const jobInfo = getJobInfo(job);
                  return <div key={`job-${instanceIndex}-${jobIndex}`} className={styles.jobCard}>
                              <div className={styles.jobHeader}>
                                <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                                  {getInstanceIcon(instance.logiciel) && <img src={instance.logiciel === "Veeam" ? getIconPath('veeam.png') : instance.logiciel === "HYCU Backup" ? getIconPath('hycu.png') : instance.logiciel === "HyperBackup" ? getIconPath('hyperbackup.png') : instance.logiciel === "Active Backup for Microsoft 365" ? getIconPath('active-backup.png') : ""} alt={instance.logiciel} style={{
                          width: '1rem',
                          height: '1rem',
                          borderRadius: '4px'
                        }} />}
                                  {!getInstanceIcon(instance.logiciel) && <StatusIcon style={{
                          fontSize: '0.875rem',
                          color: jobStatus.color
                        }} />}
                                  <h6 style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: theme === 'dark' ? '#f9fafb' : '#111827'
                        }}>
                                    {job.nom || `Job #${jobIndex + 1}`}
                                  </h6>
                                </div>
                              </div>
                              
                              {jobInfo && <p style={{
                      margin: '0.5rem 0',
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                    }}>
                                  {jobInfo}
                                </p>}

                              {}
                              {instance.logiciel === "Veeam" && job.serveurLie && (job.stockageLie || job.destination) && <div className={styles.flowInfo} style={{
                      marginTop: '0.75rem',
                      marginBottom: '0.75rem'
                    }}>
                                  <div className={styles.flowInline}>
                                    <div className={styles.flowSource}>
                                      <span className={styles.flowIcon}>
                                        {getServerIcon(job.serveurLie) || <FaServer style={{
                              fontSize: '1.25rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              verticalAlign: 'middle'
                            }} />}
                                      </span>
                                      <span className={styles.flowText}>{job.serveurLie}</span>
                                    </div>
                                    <div className={styles.flowTransfer}>
                                      <span className={styles.flowArrow}></span>
                                    </div>
                                    <div className={styles.flowDestination}>
                                      <span className={styles.flowIcon}>
                                        {getStorageIcon(job.stockageLie || job.destination, "1.25rem") || <Icon path={mdiNas} size="1.25rem" style={{
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              verticalAlign: 'middle',
                              display: 'inline-block'
                            }} />}
                                      </span>
                                      <span className={styles.flowText}>
                                        {job.stockageLie ? job.stockageLie.replace(/^(NAS|SAN|DISQUE)-/, '') : job.destination}
                                      </span>
                                    </div>
                                    {job.stockageLie && job.replicationVers && <>
                                        <div className={styles.flowTransfer}>
                                          <span className={styles.flowArrow}></span>
                                        </div>
                                        <div className={styles.flowDestination}>
                                          <span className={styles.flowIcon}>
                                            {getStorageIcon(job.replicationVers, "1.25rem") || <Icon path={mdiNas} size="1.25rem" style={{
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                verticalAlign: 'middle',
                                display: 'inline-block'
                              }} />}
                                          </span>
                                          <span className={styles.flowText}>
                                            {job.replicationVers.replace(/^(NAS|SAN|DISQUE)-/, '')}
                                          </span>
                                        </div>
                                      </>}
                                  </div>
                                </div>}

                              {}
                              {instance.logiciel === "HYCU Backup" && job.serveurLie && <div className={styles.flowInfo} style={{
                      marginTop: '0.75rem',
                      marginBottom: '0.75rem',
                      maxWidth: '550px',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }}>
                                  <div className={styles.flowInline}>
                                    <div className={styles.flowSource}>
                                      <span className={styles.flowIcon}>
                                        {getServerIcon(job.serveurLie) || <FaServer style={{
                              fontSize: '1.25rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              verticalAlign: 'middle'
                            }} />}
                                      </span>
                                      <span className={styles.flowText}>{job.serveurLie}</span>
                                    </div>
                                    <div className={styles.flowTransfer}>
                                      <span className={`${styles.flowArrow} ${styles.flowArrowPurple}`}></span>
                                    </div>
                                    <div className={styles.flowDestination}>
                                      <span className={styles.flowIcon}>
                                        <FaServer style={{
                              fontSize: '1.25rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              verticalAlign: 'middle'
                            }} />
                                      </span>
                                      <span className={styles.flowText}>
                                        DC PSI Bouillac
                                      </span>
                                    </div>
                                    <div className={styles.flowTransfer}>
                                      <span className={`${styles.flowArrow} ${styles.flowArrowGray}`}></span>
                                    </div>
                                    <div className={styles.flowDestination}>
                                      <span className={styles.flowIcon}>
                                        <FaServer style={{
                              fontSize: '1.25rem',
                              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                              verticalAlign: 'middle'
                            }} />
                                      </span>
                                      <span className={styles.flowText}>
                                        DC PSI Bruges
                                      </span>
                                    </div>
                                  </div>
                                </div>}

                              {}
                              {instance.logiciel === "Active Backup for Microsoft 365" && (!instance.activeBackupModules || !instance.activeBackupStorage) && <div style={{
                      marginTop: '0.75rem'
                    }}>
                                  {job.type && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Type: {job.type}
                                  </div>}
                                  {job.regularite && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Schedule: {job.regularite}
                                </div>}
                                  {job.horaire && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Horaire: {job.horaire}
                                  </div>}
                                  {job.retention && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Retention: {job.retention}
                              </div>}
                                </div>}

                              {}
                              {instance.logiciel === "HyperBackup" && <div style={{
                      marginTop: '0.75rem'
                    }}>
                                  {job.type && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Type: {job.type}
                                    </div>}
                                  {job.regularite && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Schedule: {job.regularite}
                                </div>}
                                  {job.horaire && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Horaire: {job.horaire}
                                  </div>}
                                  {job.retention && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Retention: {job.retention}
                              </div>}
                                  {job.destination && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Destination: {job.destination}
                                    </div>}
                                  {job.serveurLie && <div style={{
                        fontSize: '0.75rem',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                                      Serveur: {job.serveurLie}
                                    </div>}
                                </div>}

                            </div>;
                })}
                      </div>
                    </div>}
                </div>;
        })}
        </div>
      </div>
    </div>;
};
export default BackupSummary;
