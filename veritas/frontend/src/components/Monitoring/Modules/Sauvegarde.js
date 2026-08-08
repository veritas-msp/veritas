import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaInfoCircle, FaServer, FaCube, FaCheckCircle, FaExclamationCircle, FaTimesCircle, FaQuestionCircle, FaSync } from "react-icons/fa";
import Icon from "@mdi/react";
import { mdiNas, mdiServerNetworkOutline, mdiHarddisk, mdiVhs } from "@mdi/js";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Sauvegarde.module.css";
import { useTheme } from "../../../hooks/useTheme";
import API_BASE_URL from "../../../config";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, scoreToLabel, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
import { getIconPath } from "../../../utils/assetHelper";
const toastOptions = {
  position: "bottom-right",
  autoClose: 3000
};
const Backup = ({
  config,
  setConfig,
  data,
  setData,
  onSyncAllCheckMKReady
}) => {
  const {
    theme
  } = useTheme();
  const sauvegarde = config?.client?.equipements?.Sauvegarde;
  const instances = sauvegarde?.instances || [];
  const [checkmkMappings, setCheckmkMappings] = useState({});
  const [checkmkData, setCheckmkData] = useState({});
  const [checkmkEvents, setCheckmkEvents] = useState({});
  const [checkmkEventsDetails, setCheckmkEventsDetails] = useState({});
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [loadingCheckMK, setLoadingCheckMK] = useState({});
  const [animatedDuration, setAnimatedDuration] = useState({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const [animatedHealthScore, setAnimatedHealthScore] = useState(null);
  const [animatedSuccessRate, setAnimatedSuccessRate] = useState(null);
  const [animatedSyncRate, setAnimatedSyncRate] = useState(null);
  const [animatedFailRate, setAnimatedFailRate] = useState(null);
  const [animatedWarningRate, setAnimatedWarningRate] = useState(null);
  const [editingScore, setEditingScore] = useState(false);
  const [editingScoreValue, setEditingScoreValue] = useState('');
  const [hoveredScoreTooltip, setHoveredScoreTooltip] = useState(null);
  const [jobsPagination, setJobsPagination] = useState({});
  const [, setOpenInstanceComments] = useState({});
  const dataRef = useRef(data);
  const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
  const syncAllCheckMKRef = useRef(null);
  const lastNotifiedSyncInfoRef = useRef({
    hasMappings: null,
    isLoading: null
  });
  const hasRestoredDataRef = useRef(false);
  useEffect(() => {
    if (!config?.client?.id || !setConfig) return;
    const controller = new AbortController();
    const loadBackupFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/save`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) return;
        const rows = await res.json();
        const realItems = (rows || []).filter(row => {
          if (!row.data || typeof row.data !== 'object') return false;
          const dataKeys = Object.keys(row.data);
          if (dataKeys.length === 1 && row.data.enabled === true) return false;
          if (row.item_key && row.item_key.startsWith('job-')) {
            return true;
          }
          return row.data.logiciel || row.data.instances && Array.isArray(row.data.instances);
        });
        let sauvegardeData = {
          instances: []
        };
        if (realItems.length > 0) {
          const firstItem = realItems[0];
          if (firstItem.data.instances && Array.isArray(firstItem.data.instances) && realItems.length === 1) {
            sauvegardeData = firstItem.data;
          } else {
            const instanceItems = realItems.filter(item => {
              if (item.item_key && item.item_key.startsWith('job-')) return false;
              if (item.data && item.data.type === 'instance') return true;
              if (item.data && item.data.type === 'job') return false;
              return item.data && item.data.logiciel;
            });
            const jobItems = realItems.filter(item => {
              return item.item_key && item.item_key.startsWith('job-') || item.data && item.data.type === 'job';
            });
            const instances = instanceItems.map(instanceItem => {
              const instanceData = {
                id: instanceItem.id,
                ...instanceItem.data
              };
              const instanceFrontendId = instanceData.instanceId || instanceItem.id;
              const instanceJobs = jobItems.filter(jobItem => {
                const jobItemKey = jobItem.item_key || '';
                if (jobItemKey.startsWith('job-')) {
                  const jobInstanceId = jobItemKey.substring(4);
                  return jobInstanceId === instanceFrontendId;
                }
                return false;
              }).map(jobItem => {
                return {
                  id: jobItem.id,
                  ...jobItem.data
                };
              });
              instanceData.jobs = instanceJobs;
              return instanceData;
            });
            sauvegardeData = {
              instances
            };
          }
        }
        setConfig(prev => {
          if (!prev?.client) return prev;
          return {
            ...prev,
            client: {
              ...prev.client,
              equipements: {
                ...(prev.client.equipements || {}),
                Backup: sauvegardeData
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading backup:", err);
      }
    };
    loadBackupFromDb();
    return () => controller.abort();
  }, [config?.client?.id]);
  const handleInputFocus = e => {
    e.target.select();
  };
  const applyManualScore = scoreValue => {
    const updated = {
      ...data,
      manualHealthScore: scoreValue
    };
    setData(updated);
    dataRef.current = updated;
  };
  const handleManualLetterSelect = letter => {
    const scoreValue = letterToScore(letter);
    if (scoreValue === null) return;
    applyManualScore(scoreValue);
  };
  const startEditScore = currentScore => {
    setEditingScore(true);
    setEditingScoreValue(currentScore || '');
  };
  const saveEditScore = () => {
    if (editingScoreValue !== undefined && editingScoreValue !== null && editingScoreValue !== '') {
      const scoreValue = Math.max(0, Math.min(100, parseInt(editingScoreValue, 10) || 0));
      applyManualScore(scoreValue);
    }
    setEditingScore(false);
    setEditingScoreValue('');
  };
  const cancelEditScore = () => {
    setEditingScore(false);
    setEditingScoreValue('');
  };
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
  const updateJob = (instanceIndex, jobIndex, key, value) => {
    const updated = {
      ...data
    };
    if (!updated[instanceIndex]) updated[instanceIndex] = {};
    if (!updated[instanceIndex][jobIndex]) updated[instanceIndex][jobIndex] = {};
    updated[instanceIndex][jobIndex][key] = value;
    setData(updated);
  };
  const updateInstance = (instanceIndex, key, value) => {
    const updated = {
      ...data
    };
    if (!updated[instanceIndex]) updated[instanceIndex] = {};
    updated[instanceIndex][key] = value;
    setData(updated);
  };
  const getInstanceStatus = instanceIndex => {
    const instanceData = data?.[instanceIndex];
    if (!instanceData) return {
      status: "unknown",
      icon: "●",
      color: "gray"
    };
    let totalJobs = 0;
    let successJobs = 0;
    let failedJobs = 0;
    Object.keys(instanceData).forEach(jobIndex => {
      if (jobIndex !== 'comment') {
        totalJobs++;
        const jobData = instanceData[jobIndex];
        if (jobData?.lastStatus === "SUCCESS") {
          successJobs++;
        } else if (jobData?.lastStatus === "FAIL") {
          failedJobs++;
        }
      }
    });
    if (totalJobs === 0) return {
      status: "unknown",
      icon: "●",
      color: "gray"
    };
    const successRate = successJobs / totalJobs * 100;
    if (failedJobs > 0) {
      return {
        status: "critical",
        icon: "●",
        color: "red"
      };
    } else if (successRate < 80) {
      return {
        status: "warning",
        icon: "●",
        color: "orange"
      };
    } else if (successRate >= 95) {
      return {
        status: "excellent",
        icon: "●",
        color: "green"
      };
    } else {
      return {
        status: "good",
        icon: "●",
        color: "lightgreen"
      };
    }
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
  const calculateGlobalBackupHealthScore = () => {
    if (!data || instances.length === 0) return null;
    let totalJobs = 0;
    let successJobs = 0;
    let failedJobs = 0;
    let warningJobs = 0;
    let syncedJobs = 0;
    let totalSyncedJobs = 0;
    instances.forEach((instance, instanceIndex) => {
      const instanceData = data?.[instanceIndex];
      if (!instanceData) return;
      Object.keys(instanceData).forEach(jobIndex => {
        if (jobIndex !== 'comment') {
          totalJobs++;
          const jobData = instanceData[jobIndex];
          if (instance.logiciel === "Veeam") {
            const job = instance.jobs?.[parseInt(jobIndex)];
            if (job && job.id && checkmkMappings[job.id] && checkmkMappings[job.id].checkmk_service_name) {
              totalSyncedJobs++;
              if (checkmkData[job.nom]) {
                syncedJobs++;
              }
            }
          }
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
    const hasVeeamInstances = instances.some(inst => inst.logiciel === "Veeam");
    if (hasVeeamInstances && totalSyncedJobs > 0) {
      const syncRate = syncedJobs / totalSyncedJobs * 100;
      const syncScore = syncRate / 100 * 30;
      score -= 30 - syncScore;
      factors.push({
        name: 'CheckMK synchronization',
        value: syncRate,
        weight: 30
      });
    } else if (hasVeeamInstances) {
      score -= 15;
      factors.push({
        name: 'CheckMK synchronization',
        value: 0,
        weight: 30
      });
    }
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
      warningJobs,
      syncedJobs,
      totalSyncedJobs
    };
  };
  const checkGlobal321Rule = () => {
    if (!instances || instances.length === 0) {
      return {
        copies: 0,
        locations: 0,
        physicalOffsite: false,
        compliant: false
      };
    }
    const allCopies = new Set();
    const allLocations = new Set();
    const physicalLocations = new Set();
    const sourceServers = new Set();
    instances.forEach(instance => {
      if (instance.jobs && instance.jobs.length > 0) {
        instance.jobs.forEach(job => {
          if (job.serveurLie) {
            allCopies.add(`source:${job.serveurLie}`);
            allLocations.add(job.serveurLie);
            sourceServers.add(job.serveurLie);
            const serverDetails = getServerDetails(job.serveurLie);
            if (serverDetails && serverDetails.type === 'physique') {
              physicalLocations.add(job.serveurLie);
            }
          }
          if (job.stockageLie) {
            allCopies.add(`storage:${job.stockageLie}`);
            allLocations.add(job.stockageLie);
            const storageDetails = getStorageDetails(job.stockageLie);
            if (storageDetails) {
              physicalLocations.add(job.stockageLie);
            }
          } else if (job.destination) {
            allCopies.add(`destination:${job.destination}`);
            allLocations.add(job.destination);
            physicalLocations.add(job.destination);
          }
          if (job.replicationVers) {
            allCopies.add(`replication:${job.replicationVers}`);
            allLocations.add(job.replicationVers);
            const replicationDetails = getStorageDetails(job.replicationVers);
            if (replicationDetails) {
              physicalLocations.add(job.replicationVers);
            }
          }
          if (instance.logiciel === "HYCU Backup") {
            allCopies.add('datacenter:PSI Bouillac');
            allCopies.add('datacenter:PSI Bruges');
            allLocations.add('PSI Bouillac');
            allLocations.add('PSI Bruges');
            physicalLocations.add('PSI Bouillac');
            physicalLocations.add('PSI Bruges');
          }
        });
      }
      if (instance.logiciel === "HyperBackup") {
        if (instance.hyperbackupSource) {
          allCopies.add(`source:${instance.hyperbackupSource}`);
          allLocations.add(instance.hyperbackupSource);
          const sourceDetails = getStorageDetails(instance.hyperbackupSource);
          if (sourceDetails) {
            physicalLocations.add(instance.hyperbackupSource);
          }
        }
        if (instance.hyperbackupDestination) {
          allCopies.add(`destination:${instance.hyperbackupDestination}`);
          allLocations.add(instance.hyperbackupDestination);
          const destDetails = getStorageDetails(instance.hyperbackupDestination);
          if (destDetails) {
            physicalLocations.add(instance.hyperbackupDestination);
          }
        }
      }
    });
    const copiesCount = allCopies.size;
    const locationsCount = allLocations.size;
    let physicalOffsite = false;
    if (physicalLocations.size > 0) {
      const physicalOffsiteLocations = Array.from(physicalLocations).filter(loc => {
        return !sourceServers.has(loc);
      });
      physicalOffsite = physicalOffsiteLocations.length > 0;
    }
    const compliant = copiesCount >= 3 && locationsCount >= 2 && physicalOffsite;
    return {
      copies: copiesCount,
      locations: locationsCount,
      physicalOffsite,
      compliant
    };
  };
  const getHealthScoreColor = score => scoreToColor(score);
  const getHealthScoreLabel = score => scoreToLabel(score);
  const isFactorHigherBetter = name => {
    if (!name) return true;
    const lowerBetter = ["failure", "échec", "avertissement", "warning", "Failure rate", "Failure rate"];
    return !lowerBetter.some(keyword => name.toLowerCase().includes(keyword));
  };
  const getFactorDescription = name => {
    const descriptions = {
      "Success rate": "Share of jobs successfully executed across all backups",
      "CheckMK synchronization": "Veeam jobs synced with CheckMK supervision (mapped and reported)",
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
      parts.push(`Backup ${job.type} ${job.regularite} at ${job.horaire}`);
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
        color: 'var(--text-secondary)',
        verticalAlign: 'middle'
      }} />;
    } else {
      return <FaCube style={{
        fontSize: '1.25rem',
        color: 'var(--text-secondary)',
        verticalAlign: 'middle'
      }} />;
    }
  };
  const getStorageIcon = (storageName, size = "1.25rem", color = 'var(--text-secondary)') => {
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
    const iconStyle = {
      color: color,
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
  useEffect(() => {
    if (!config?.client?.id) return;
    const loadMappings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const mappings = await response.json();
          const mappingsMap = {};
          mappings.forEach(m => {
            const type = (m.equipment_type || "").toLowerCase();
            const isBackupType = ['sauvegarde', 'backup'].includes(type);
            if (isBackupType && m.equipment_id) {
              mappingsMap[m.equipment_id] = m;
            }
          });
          setCheckmkMappings(mappingsMap);
        }
      } catch (error) {}
    };
    loadMappings();
  }, [config?.client?.id]);
  const getJobStats = jobName => {
    const jobCheckmkData = checkmkData[jobName];
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
    if (!result) return 'var(--text-secondary)';
    const resultLower = result.toLowerCase();
    if (resultLower.includes('success') || resultLower.includes('succès')) {
      return '#10b981';
    } else if (resultLower.includes('fail') || resultLower.includes('échec') || resultLower.includes('error') || resultLower.includes('failure')) {
      return '#ef4444';
    } else if (resultLower.includes('warning') || resultLower.includes('avertissement')) {
      return '#f59e0b';
    }
    return 'var(--text-primary)';
  };
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    hasRestoredDataRef.current = null;
  }, []);
  useEffect(() => {
    if (!data || Object.keys(data).length === 0 || instances.length === 0) return;
    let hasCheckMKData = false;
    const checkMKDataByJob = {};
    instances.forEach((instance, instanceIndex) => {
      (instance.jobs || []).forEach((job, jobIndex) => {
        const jobData = data[instanceIndex]?.[jobIndex];
        if (jobData && jobData.checkmkData) {
          hasCheckMKData = true;
          checkMKDataByJob[job.nom] = {
            checkmkData: jobData.checkmkData,
            lastSyncDate: jobData.lastSyncDate
          };
        }
      });
    });
    if (!hasCheckMKData) return;
    const dataKey = JSON.stringify(Object.keys(checkMKDataByJob).sort());
    if (hasRestoredDataRef.current === dataKey) return;
    const restoredCheckmkData = {};
    instances.forEach((instance, instanceIndex) => {
      (instance.jobs || []).forEach((job, jobIndex) => {
        const jobData = data[instanceIndex]?.[jobIndex];
        if (jobData && jobData.checkmkData) {
          restoredCheckmkData[job.nom] = jobData.checkmkData;
        }
      });
    });
    if (Object.keys(restoredCheckmkData).length > 0) {
      setCheckmkData(restoredCheckmkData);
      instances.forEach(instance => {
        if (instance.logiciel === "Veeam") {
          (instance.jobs || []).forEach(job => {
            if (job.id && checkmkMappings[job.id] && restoredCheckmkData[job.nom]) {
              const mapping = checkmkMappings[job.id];
              if (mapping.checkmk_host_name) {
                loadCheckMKEvents(job.nom, mapping.checkmk_host_name);
              }
            }
          });
        }
      });
    }
    hasRestoredDataRef.current = dataKey;
  }, [data, instances, checkmkMappings]);
  useEffect(() => {
    onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
  }, [onSyncAllCheckMKReady]);
  const loadCheckMKEvents = useCallback(async (jobName, checkmkHostName) => {
    if (!checkmkHostName) return;
    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/events/${encodeURIComponent(checkmkHostName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const eventsData = await response.json();
        const eventsCount = eventsData.events_count || 0;
        const eventsList = eventsData.events || [];
        setCheckmkEvents(prev => ({
          ...prev,
          [jobName]: eventsCount
        }));
        setCheckmkEventsDetails(prev => ({
          ...prev,
          [jobName]: eventsList
        }));
        const currentData = dataRef.current || {};
        let found = false;
        instances.forEach((instance, instanceIndex) => {
          if (found) return;
          (instance.jobs || []).forEach((job, jobIndex) => {
            if (found) return;
            if (job.nom === jobName) {
              const updated = {
                ...currentData,
                [instanceIndex]: {
                  ...(currentData[instanceIndex] || {}),
                  [jobIndex]: {
                    ...(currentData[instanceIndex]?.[jobIndex] || {}),
                    eventsCount: eventsCount,
                    checkmkEventsDetails: eventsList
                  }
                }
              };
              setData(updated);
              dataRef.current = updated;
              found = true;
            }
          });
        });
      } else {
        setCheckmkEvents(prev => ({
          ...prev,
          [jobName]: 0
        }));
        setCheckmkEventsDetails(prev => ({
          ...prev,
          [jobName]: []
        }));
      }
    } catch (error) {
      setCheckmkEvents(prev => ({
        ...prev,
        [jobName]: 0
      }));
      setCheckmkEventsDetails(prev => ({
        ...prev,
        [jobName]: []
      }));
    }
  }, [instances, setData]);
  useEffect(() => {
    if (!instances.length || Object.keys(checkmkMappings).length === 0) return;
    instances.forEach(instance => {
      if (instance.logiciel === "Veeam") {
        (instance.jobs || []).forEach(job => {
          if (job.id && checkmkMappings[job.id] && checkmkMappings[job.id].checkmk_host_name) {
            const mapping = checkmkMappings[job.id];
            if (checkmkEvents[job.nom] === undefined) {
              loadCheckMKEvents(job.nom, mapping.checkmk_host_name);
            }
          }
        });
      }
    });
  }, [instances, checkmkMappings]);
  const loadCheckMKDataMemo = useCallback(async (jobName, checkmkHostName, checkmkServiceName, showToasts = true) => {
    if (!checkmkHostName || !checkmkServiceName) {
      return;
    }
    setLoadingCheckMK(prev => ({
      ...prev,
      [jobName]: true
    }));
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/service-data/${encodeURIComponent(checkmkHostName)}/${encodeURIComponent(checkmkServiceName)}`);
      const job = instances.flatMap(inst => (inst.jobs || []).map(j => ({
        ...j,
        instance: inst
      }))).find(j => j.nom === jobName);
      if (job?.id && checkmkMappings[job.id]?.checkmk_site) {
        url.searchParams.append('site', checkmkMappings[job.id].checkmk_site);
      }
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const serviceData = await response.json();
        setCheckmkData(prev => ({
          ...prev,
          [jobName]: serviceData
        }));
        loadCheckMKEvents(jobName, checkmkHostName);
        const currentData = dataRef.current || {};
        let found = false;
        instances.forEach((instance, instanceIndex) => {
          if (found) return;
          (instance.jobs || []).forEach((job, jobIndex) => {
            if (found) return;
            if (job.nom === jobName) {
              const updated = {
                ...currentData,
                [instanceIndex]: {
                  ...(currentData[instanceIndex] || {}),
                  [jobIndex]: {
                    ...(currentData[instanceIndex]?.[jobIndex] || {}),
                    checkmkData: serviceData,
                    lastSyncDate: new Date().toISOString()
                  }
                }
              };
              setData(updated);
              dataRef.current = updated;
              found = true;
            }
          });
        });
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
      }
    } catch (error) {} finally {
      setLoadingCheckMK(prev => ({
        ...prev,
        [jobName]: false
      }));
    }
  }, [instances, checkmkMappings, setData, loadCheckMKEvents]);
  const syncAllCheckMK = useCallback(async () => {
    const currentInstances = instances;
    const currentMappings = checkmkMappings;
    const currentLoadCheckMK = loadCheckMKDataMemo;
    const mappedJobs = [];
    currentInstances.forEach(instance => {
      if (instance.logiciel === "Veeam") {
        (instance.jobs || []).forEach(job => {
          if (job.id && currentMappings[job.id] && currentMappings[job.id].checkmk_service_name) {
            mappedJobs.push({
              jobName: job.nom,
              mapping: currentMappings[job.id]
            });
          }
        });
      }
    });
    if (mappedJobs.length === 0) {
      toast.warning('No Veeam job mapped with Check MK', toastOptions);
      return;
    }
    const syncPromises = mappedJobs.map(({
      jobName,
      mapping
    }) => {
      return currentLoadCheckMK(jobName, mapping.checkmk_host_name, mapping.checkmk_service_name, false);
    });
    try {
      await Promise.all(syncPromises);
      toast.success(`Synchronization completed`, toastOptions);
    } catch (error) {
      toast.error(`Error during synchronization`, toastOptions);
    }
    setTimeout(() => {
      const healthScore = calculateGlobalBackupHealthScore();
      if (healthScore && healthScore.score !== undefined) {
        const totalJobs = healthScore.totalJobs || 0;
        const successJobs = healthScore.successJobs || 0;
        const failedJobs = healthScore.failedJobs || 0;
        const warningJobs = healthScore.warningJobs || 0;
        const syncedJobs = healthScore.syncedJobs || 0;
        const totalSyncedJobs = healthScore.totalSyncedJobs || 0;
        const successRate = totalJobs > 0 ? successJobs / totalJobs * 100 : 0;
        const syncRate = totalSyncedJobs > 0 ? syncedJobs / totalSyncedJobs * 100 : null;
        const failRate = totalJobs > 0 ? failedJobs / totalJobs * 100 : 0;
        const warningRate = totalJobs > 0 ? warningJobs / totalJobs * 100 : 0;
        setAnimatedHealthScore(0);
        const duration = 3000;
        const steps = 120;
        const increment = healthScore.score / steps;
        let currentStep = 0;
        const scoreTimer = setInterval(() => {
          currentStep++;
          const newValue = Math.min(increment * currentStep, healthScore.score);
          setAnimatedHealthScore(Math.round(newValue));
          if (currentStep >= steps) {
            clearInterval(scoreTimer);
            setAnimatedHealthScore(healthScore.score);
          }
        }, duration / steps);
        setAnimatedSuccessRate(0);
        const successDuration = 2000;
        const successSteps = 100;
        const successIncrement = successRate / successSteps;
        let successStep = 0;
        const successTimer = setInterval(() => {
          successStep++;
          const newValue = Math.min(successIncrement * successStep, successRate);
          setAnimatedSuccessRate(newValue.toFixed(1));
          if (successStep >= successSteps) {
            clearInterval(successTimer);
            setAnimatedSuccessRate(successRate.toFixed(1));
          }
        }, successDuration / successSteps);
        if (syncRate !== null) {
          setAnimatedSyncRate(0);
          const syncDuration = 2000;
          const syncSteps = 100;
          const syncIncrement = syncRate / syncSteps;
          let syncStep = 0;
          const syncTimer = setInterval(() => {
            syncStep++;
            const newValue = Math.min(syncIncrement * syncStep, syncRate);
            setAnimatedSyncRate(newValue.toFixed(1));
            if (syncStep >= syncSteps) {
              clearInterval(syncTimer);
              setAnimatedSyncRate(syncRate.toFixed(1));
            }
          }, syncDuration / syncSteps);
        }
        setAnimatedFailRate(0);
        const failDuration = 2000;
        const failSteps = 100;
        const failIncrement = failRate / failSteps;
        let failStep = 0;
        const failTimer = setInterval(() => {
          failStep++;
          const newValue = Math.min(failIncrement * failStep, failRate);
          setAnimatedFailRate(newValue.toFixed(1));
          if (failStep >= failSteps) {
            clearInterval(failTimer);
            setAnimatedFailRate(failRate.toFixed(1));
          }
        }, failDuration / failSteps);
        setAnimatedWarningRate(0);
        const warningDuration = 2000;
        const warningSteps = 100;
        const warningIncrement = warningRate / warningSteps;
        let warningStep = 0;
        const warningTimer = setInterval(() => {
          warningStep++;
          const newValue = Math.min(warningIncrement * warningStep, warningRate);
          setAnimatedWarningRate(newValue.toFixed(1));
          if (warningStep >= warningSteps) {
            clearInterval(warningTimer);
            setAnimatedWarningRate(warningRate.toFixed(1));
          }
        }, warningDuration / warningSteps);
      }
    }, 200);
  }, [instances, checkmkMappings, loadCheckMKDataMemo]);
  useEffect(() => {
    syncAllCheckMKRef.current = syncAllCheckMK;
  }, [syncAllCheckMK]);
  useEffect(() => {
    if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
      const hasMappings = Object.keys(checkmkMappings).length > 0;
      const isLoading = Object.values(loadingCheckMK).some(loading => loading);
      if (lastNotifiedSyncInfoRef.current.hasMappings === hasMappings && lastNotifiedSyncInfoRef.current.isLoading === isLoading) {
        return;
      }
      onSyncAllCheckMKReadyRef.current({
        syncAllCheckMK: syncAllCheckMKRef.current,
        hasCheckMKMappings: hasMappings,
        isLoading
      });
      lastNotifiedSyncInfoRef.current = {
        hasMappings,
        isLoading
      };
    }
  }, [checkmkMappings, loadingCheckMK]);
  useEffect(() => {
    if (!instances.length || data && Object.keys(data).length > 0) return;
    const initializedData = {};
    instances.forEach((instance, instanceIndex) => {
      initializedData[instanceIndex] = {};
      (instance.jobs || []).forEach((job, jobIndex) => {
        initializedData[instanceIndex][jobIndex] = {
          taux: 100,
          lastStatus: "SUCCESS",
          comment: ""
        };
      });
    });
    setData(initializedData);
  }, [instances, data]);
  useEffect(() => {
    if (activeTab === "dashboard") return;
    const instanceIndex = parseInt(activeTab.replace("instance-", ""), 10);
    if (Number.isNaN(instanceIndex) || !instances[instanceIndex]) {
      setActiveTab("dashboard");
    }
  }, [activeTab, instances]);
  const parseRateValue = useCallback(value => {
    if (value === null || value === undefined || value === 'N/A') return null;
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isNaN(numeric) ? null : numeric;
  }, []);
  const renderSyncOverlay = useCallback(() => {
    const isSyncing = Object.values(loadingCheckMK).some(loading => loading);
    if (!isSyncing) return null;
    return <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
      fontSize: '0.75rem',
      zIndex: 10,
      backgroundColor: theme === 'dark' ? 'rgba(30, 30, 63, 0.95)' : 'rgba(255, 255, 255, 0.9)',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      boxShadow: theme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
      border: theme === 'dark' ? '1px solid #4a4a6a' : 'none'
    }}>
                <FaSync style={{
        animation: 'spin 1s linear infinite',
        fontSize: '0.75rem'
      }} />
                Synchronization...
            </div>;
  }, [loadingCheckMK, theme]);
  const renderDashboard = () => {
    const healthScore = calculateGlobalBackupHealthScore();
    const totalJobs = healthScore?.totalJobs || 0;
    const successJobs = healthScore?.successJobs || 0;
    const failedJobs = healthScore?.failedJobs || 0;
    const warningJobs = healthScore?.warningJobs || 0;
    const syncedJobs = healthScore?.syncedJobs || 0;
    const totalSyncedJobs = healthScore?.totalSyncedJobs || 0;
    const successRate = totalJobs > 0 ? successJobs / totalJobs * 100 : 0;
    const failRate = totalJobs > 0 ? failedJobs / totalJobs * 100 : 0;
    const warningRate = totalJobs > 0 ? warningJobs / totalJobs * 100 : 0;
    const syncRate = totalSyncedJobs > 0 ? syncedJobs / totalSyncedJobs * 100 : null;
    const totalJobsByType = {
      Veeam: 0,
      "HYCU Backup": 0,
      HyperBackup: 0,
      "Active Backup for Microsoft 365": 0
    };
    instances.forEach((instance, instanceIndex) => {
      const instanceData = data?.[instanceIndex];
      if (!instanceData) return;
      Object.keys(instanceData).forEach(jobIndex => {
        if (jobIndex !== 'comment' && instance.logiciel) {
          totalJobsByType[instance.logiciel] = (totalJobsByType[instance.logiciel] || 0) + 1;
        }
      });
    });
    const instancesByType = {
      Veeam: instances.filter(i => i.logiciel === "Veeam").length,
      "HYCU Backup": instances.filter(i => i.logiciel === "HYCU Backup").length,
      HyperBackup: instances.filter(i => i.logiciel === "HyperBackup").length,
      "Active Backup for Microsoft 365": instances.filter(i => i.logiciel === "Active Backup for Microsoft 365").length
    };
    const hasMappedJobs = checkmkMappings && Object.keys(checkmkMappings).length > 0;
    const hasSyncedCheckMKData = Object.keys(checkmkData || {}).length > 0;
    const shouldShowNA = hasMappedJobs && !hasSyncedCheckMKData;
    const calculatedScore = shouldShowNA ? null : healthScore?.score;
    const manualScore = data?.manualHealthScore;
    const healthScoreValue = shouldShowNA ? null : manualScore !== undefined ? manualScore : calculatedScore;
    const animatedScoreValue = shouldShowNA ? null : animatedHealthScore !== null ? animatedHealthScore : healthScoreValue;
    const successRateValue = shouldShowNA ? null : animatedSuccessRate !== null ? parseRateValue(animatedSuccessRate) : successRate;
    const syncRateValue = shouldShowNA ? null : animatedSyncRate !== null ? parseRateValue(animatedSyncRate) : syncRate;
    const failRateValue = shouldShowNA ? null : animatedFailRate !== null ? parseRateValue(animatedFailRate) : failRate;
    const warningRateValue = shouldShowNA ? null : animatedWarningRate !== null ? parseRateValue(animatedWarningRate) : warningRate;
    const scoreColor = shouldShowNA ? '#6b7280' : animatedScoreValue !== null ? getHealthScoreColor(animatedScoreValue) : healthScoreValue !== null ? getHealthScoreColor(healthScoreValue) : '#6b7280';
    const animatedScoreLetter = shouldShowNA ? null : animatedScoreValue !== null ? scoreToLetter(animatedScoreValue) || null : healthScoreValue !== null ? scoreToLetter(healthScoreValue) || null : null;
    const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
    const defaultFactors = [{
      name: 'Success rate',
      value: 'N/A',
      weight: 50
    }, {
      name: 'CheckMK synchronization',
      value: 'N/A',
      weight: 30
    }, {
      name: 'Failure rate',
      value: 'N/A',
      weight: 20
    }];
    const factors = shouldShowNA ? defaultFactors : healthScore?.factors || [];
    return <div className={styles.dashboardSection}>
                {}
                <div style={{
        marginBottom: '0rem',
        padding: '1rem',
        borderRadius: '12px',
        background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
        border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        minHeight: '140px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: '120px'
        }}>
                        {editingScore ? <input type="number" min="0" max="100" value={editingScoreValue !== undefined ? editingScoreValue : animatedScoreValue} onChange={e => setEditingScoreValue(e.target.value)} onBlur={saveEditScore} onKeyDown={e => {
            if (e.key === 'Enter') {
              saveEditScore();
            } else if (e.key === 'Escape') {
              cancelEditScore();
            }
          }} autoFocus style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: scoreColor,
            lineHeight: '1',
            width: '80px',
            border: `2px solid ${scoreColor}`,
            borderRadius: '4px',
            padding: '0.25rem',
            background: theme === 'dark' ? '#2d2d4f' : '#ffffff',
            textAlign: 'center'
          }} onFocus={handleInputFocus} /> : <div role="button" tabIndex={animatedScoreValue !== null ? 0 : -1} onKeyDown={e => {
            if (animatedScoreValue !== null && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              startEditScore(animatedScoreValue);
            }
          }} title={animatedScoreValue !== null ? "Click to select a grade, double-click to edit precisely" : ""} style={{
            cursor: animatedScoreValue !== null ? 'pointer' : 'default',
            outline: 'none'
          }}>
                                <LetterScale activeLetter={animatedScoreLetter} theme={theme} letters={["F", "E", "D", "C", "B", "A"]} size="normal" onSelect={animatedScoreValue !== null ? letter => handleManualLetterSelect(letter) : undefined} highlightLetter={manualScoreChanged && calculatedScore !== null && !editingScore ? scoreToLetter(calculatedScore) : null} />
                            </div>}
                        {calculatedScore !== null && manualScore !== undefined && editingScore && <div style={{
            fontSize: '0.65rem',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            fontStyle: 'italic',
            opacity: 0.7,
            marginTop: '0.5rem',
            position: 'absolute',
            bottom: '-1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap'
          }}>
                                Calculated grade: {calculatedScore} ({scoreToLetter(calculatedScore)})
                            </div>}
                        <div className={styles.scoreTooltipContainer}>
                            <FaInfoCircle className={styles.scoreTooltipIcon} onMouseEnter={e => {
              const scoreBreakdown = factors.map(factor => ({
                label: factor.name,
                description: getFactorDescription(factor.name),
                weight: `${factor.weight} pts`
              }));
              setHoveredScoreTooltip({
                mouseX: e.clientX,
                mouseY: e.clientY,
                scoreBreakdown
              });
            }} onMouseMove={e => {
              if (hoveredScoreTooltip) {
                setHoveredScoreTooltip(prev => ({
                  ...prev,
                  mouseX: e.clientX,
                  mouseY: e.clientY
                }));
              }
            }} onMouseLeave={() => {
              setHoveredScoreTooltip(null);
            }} />
                        </div>
                    </div>
                    <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem 1rem',
          flex: 1,
          maxWidth: '400px'
        }}>
                        {factors.map((factor, idx) => {
            let displayValue = null;
            if (factor.name === 'Success rate') {
              displayValue = successRateValue;
            } else if (factor.name === 'CheckMK synchronization') {
              displayValue = syncRateValue;
            } else if (factor.name === 'Failure rate') {
              displayValue = failRateValue;
            } else if (factor.name === 'Warnings') {
              displayValue = warningRateValue;
            } else {
              displayValue = typeof factor.value === 'number' ? factor.value : null;
            }
            return <div key={`factor-display-${idx}`} style={{
              fontSize: '0.75rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
                                    <MetricLetter value={displayValue} higherIsBetter={isFactorHigherBetter(factor.name)} theme={theme} showValue={false} />
                                    <strong>{factor.name}</strong>
                                </div>;
          })}
                    </div>
                </div>

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
            </div>;
  };
  if (!instances || instances.length === 0) {
    return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
                <div className={styles.emptyState}>
                    <p>No backup instance configured for this client.</p>
                    <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
                        <strong>🔍 Debug - Equipment in database:</strong>
                        <pre style={{
            marginTop: '0.5rem',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
                            {JSON.stringify({
              clientId: config?.client?.id,
              clientName: config?.client?.name,
              equipementsBackup: config?.client?.equipements?.Sauvegarde || {},
              instances: instances || [],
              nombreInstances: instances?.length || 0,
              modules_monitoring_Backup: config?.client?.modules_monitoring?.Sauvegarde,
              tousEquipements: config?.client?.equipements
            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>;
  }
  const tabs = [{
    id: "dashboard",
    label: "Dashboard"
  }, ...instances.map((instance, index) => ({
    id: `instance-${index}`,
    label: instance.nom || `${instance.logiciel} #${index + 1}`
  }))];
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
            {}
            <div className={styles.backupCard}>
                {}
                <div>
                                {}
                                <div className={styles.cardHeader} style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'nowrap',
          paddingBottom: '1rem'
        }}>
                                    <div className={styles.headerLeft} style={{
            zIndex: 1
          }}>
                                        <div className={styles.backupInfo}>
                                <h3 className={styles.backupName}>
                                    <IconifyIcon icon="mdi:database-export" style={{
                  fontSize: '1.5rem',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginRight: '0.5rem'
                }} />
                                    <span style={{
                  transform: 'translateY(4px)',
                  display: 'inline-block'
                }}>
                                        Backups
                                    </span>
                                            </h3>
                                {config?.client?.nom && <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem'
              }}>
                                        {config.client.nom}
                                    </p>}
                                        </div>
                                    </div>
                        <div className={styles.headerRight} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 1
          }}>
                            {}
                            {activeTab !== "dashboard" && (() => {
              const instanceIndex = parseInt(activeTab.replace("instance-", ""), 10);
              const currentInstance = instances[instanceIndex];
              if (currentInstance && currentInstance.logiciel === "Veeam" && Object.keys(checkmkMappings).length > 0) {
                const needsSyncWarning = instances.some((instance, instIndex) => {
                  if (instance.logiciel !== "Veeam") return false;
                  return (instance.jobs || []).some((job, jobIndex) => {
                    return job.id && checkmkMappings[job.id] && checkmkMappings[job.id].checkmk_service_name && !data?.[instIndex]?.[jobIndex]?.lastSyncDate && !loadingCheckMK[job.nom];
                  });
                });
                const isLoading = Object.values(loadingCheckMK).some(loading => loading);
                return <button className={`${styles.syncButton} ${needsSyncWarning ? styles.syncButtonWarning : ''}`} onClick={() => {
                  if (syncAllCheckMKRef.current && !isLoading) {
                    syncAllCheckMKRef.current();
                  }
                }} disabled={isLoading} title="Sync all Veeam jobs with Check MK">
                                            <IconifyIcon icon="material-symbols:sync" width={14} height={14} className={isLoading ? styles.loadingIcon : ''} />
                                        </button>;
              }
              return null;
            })()}
                                    </div>
                                </div>

                    {}
                    <div style={{
          position: 'absolute',
          left: '50%',
          top: '45px',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 2
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
            padding: '0.25rem',
            borderRadius: '8px',
            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
            pointerEvents: 'auto',
            flexWrap: 'wrap'
          }}>
                            <button onClick={() => setActiveTab("dashboard")} title="Dashboard" style={{
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              minWidth: '70px',
              width: '70px',
              color: activeTab === "dashboard" || !activeTab ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
              background: activeTab === "dashboard" || !activeTab ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === "dashboard" || !activeTab ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              pointerEvents: 'auto'
            }}>
                                <IconifyIcon icon="material-symbols:dashboard-rounded" width={20} height={20} style={{
                pointerEvents: 'none'
              }} />
                                <span style={{
                fontSize: '0.65rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}>
                                    Dashboard
                                </span>
                            </button>
                            {instances.map((instance, index) => {
              let logoPath = getIconPath('veeam.png');
              if (instance.logiciel === "Veeam") {
                logoPath = getIconPath('veeam.png');
              } else if (instance.logiciel === "HYCU Backup") {
                logoPath = getIconPath('hycu.png');
              } else if (instance.logiciel === "HyperBackup") {
                logoPath = getIconPath('hyperbackup.png');
              } else if (instance.logiciel === "Active Backup for Microsoft 365") {
                logoPath = getIconPath('active-backup.png');
              }
              return <button key={`instance-${index}`} onClick={() => setActiveTab(`instance-${index}`)} title={instance.nom || `${instance.logiciel} #${index + 1}`} style={{
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                minWidth: '70px',
                width: '70px',
                color: activeTab === `instance-${index}` ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                background: activeTab === `instance-${index}` ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === `instance-${index}` ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                pointerEvents: 'auto'
              }}>
                                        <img src={logoPath} alt={instance.logiciel} style={{
                  width: '20px',
                  height: '20px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  display: 'block'
                }} />
                                        <span style={{
                  fontSize: '0.65rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                                            {instance.nom || instance.logiciel || `#${index + 1}`}
                                        </span>
                                    </button>;
            })}
                        </div>
                    </div>

                    {}
                    <div style={{
          position: 'relative',
          minHeight: '400px',
          marginTop: '3rem'
        }}>
                        {renderSyncOverlay()}
                        <div style={{
            opacity: Object.values(loadingCheckMK).some(loading => loading) ? 0.5 : 1,
            transition: 'opacity 0.2s ease'
          }}>
                            {activeTab === "dashboard" ? renderDashboard() : <>
                                    {instances.map((instance, instanceIndex) => {
                if (activeTab !== `instance-${instanceIndex}`) return null;
                const instanceStatus = getInstanceStatus(instanceIndex);
                const instanceInfo = getInstanceInfo(instance);
                const instanceData = data?.[instanceIndex] || {};
                return <div key={`instance-content-${instanceIndex}`}>
                                        {}
                                        <div style={{
                    marginBottom: '1.5rem'
                  }}>
                                            <h4 className={styles.sectionTitle} style={{
                      marginBottom: '0.5rem'
                    }}>
                                                {getInstanceIcon(instance.logiciel)}
                                                Instance #{instanceIndex + 1} - {instance.logiciel}
                                            </h4>
                                            {instanceInfo.length > 0 && <p className={styles.backupDetails} style={{
                      margin: 0,
                      marginBottom: '1rem'
                    }}>
                                                    {instanceInfo.map((info, idx) => <React.Fragment key={`info-${idx}`}>
                                                            {info}
                                                            {idx < instanceInfo.length - 1 && " • "}
                                                        </React.Fragment>)}
                                                </p>}
                                        </div>
                                        
                                        {}
                                        {instance.logiciel === "HyperBackup" && <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: theme === 'dark' ? '#2a2a4a' : '#f9fafb',
                    borderRadius: '8px'
                  }}>
                                                HyperBackup is a built-in Synology backup solution that backs up data from a Synology NAS to another Synology NAS or an external drive.
                                    </p>}

                                {}
                                {instance.logiciel === "Active Backup for Microsoft 365" && instance.activeBackupModules && instance.activeBackupStorage && <div className={styles.flowInfo} style={{
                    marginTop: '2rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                                        <div className={styles.flowInline} style={{
                      gap: '2rem'
                    }}>
                                            {}
                                            <div className={styles.flowSource} style={{
                        minWidth: '350px',
                        maxWidth: '400px',
                        padding: '1.5rem'
                      }}>
                                                <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '0.75rem'
                        }}>
                                                    {(() => {
                            const moduleLabels = {
                              exchange: 'Exchange Online',
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
                                padding: '0.75rem',
                                background: 'transparent',
                                borderRadius: '8px',
                                border: isActive ? `2px solid #10b981` : `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                                transition: 'all 0.3s ease',
                                opacity: isActive ? 1 : 0.5
                              }}>
                                                                    {}
                                                                    <div style={{
                                  position: 'absolute',
                                  top: '0.35rem',
                                  right: '0.35rem',
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isActive ? '#10b981' : '#6b7280',
                                  boxShadow: isActive ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none'
                                }} />
                                                                    
                                                                    <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.5rem',
                                  alignItems: 'center',
                                  textAlign: 'center'
                                }}>
                                                                        <IconifyIcon icon={moduleIcons[key] || 'mdi:microsoft-office'} style={{
                                    fontSize: '1.75rem',
                                    color: isActive ? '#10b981' : '#6b7280'
                                  }} />
                                                                        <div>
                                                                            <div style={{
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      color: 'var(--text-primary)',
                                      marginBottom: '0.15rem'
                                    }}>
                                                                                {moduleLabels[key] || key}
                                                                            </div>
                                                                            <div style={{
                                      fontSize: '0.65rem',
                                      fontWeight: '500',
                                      color: isActive ? '#10b981' : '#6b7280'
                                    }}>
                                                                                {isActive ? 'Active' : 'Inactive'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>;
                            });
                          })()}
                                                </div>
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
                            color: 'var(--text-secondary)',
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
                                {(instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && (instance.jobs || []).length > 0 && <div className={styles.jobsListSection}>
                                        <div className={styles.jobsListTable}>
                                            <div className={styles.jobsListHeader}>
                                                <div className={styles.jobsListCell} style={{
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>Name</div>
                                                <div className={styles.jobsListCell} style={{
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>Type</div>
                                                <div className={styles.jobsListCell} style={{
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>Schedule</div>
                                                <div className={styles.jobsListCell} style={{
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>Horaire</div>
                                                <div className={styles.jobsListCell} style={{
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>Retention</div>
                                            </div>
                                            <div className={styles.jobsListTableContent}>
                                                {(instance.jobs || []).map((job, jobIndex) => <div key={`job-list-${instanceIndex}-${jobIndex}`} className={styles.jobsListRow}>
                                                        <div className={styles.jobsListCell} style={{
                            fontWeight: '500',
                            color: 'var(--text-primary)'
                          }}>
                                                            {job.nom || `Job #${jobIndex + 1}`}
                                                        </div>
                                                        <div className={styles.jobsListCell} style={{
                            color: 'var(--text-secondary)'
                          }}>
                                                            {job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : ''}
                                                        </div>
                                                        <div className={styles.jobsListCell} style={{
                            color: 'var(--text-secondary)'
                          }}>
                                                            {job.regularite || ''}
                                                        </div>
                                                        <div className={styles.jobsListCell} style={{
                            color: 'var(--text-secondary)'
                          }}>
                                                            {job.horaire || ''}
                                                        </div>
                                                        <div className={styles.jobsListCell} style={{
                            color: 'var(--text-secondary)'
                          }}>
                                                            {job.retention || ''}
                                                        </div>
                                                    </div>)}
                                            </div>
                                        </div>
                                    </div>}
                                {}
                                {instance.logiciel !== "Veeam" && instance.logiciel !== "HYCU Backup" && instance.logiciel !== "HyperBackup" && instance.logiciel !== "Active Backup for Microsoft 365" && <div className={styles.jobsCountSection}>
                                    <div className={styles.jobsCount}>
                                            <span className={styles.jobsNumber}>{(instance.jobs || []).length}</span>
                                        <span className={styles.jobsLabel}>
                                                {(instance.jobs || []).length === 1 ? 'Job' : 'Jobs'}
                                        </span>
                                    </div>
                                </div>}
                                {}
                                {instance.logiciel === "HyperBackup" && instance.hyperbackupSource && instance.hyperbackupDestination && <div className={styles.flowInfo} style={{
                    marginTop: '2rem',
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
                            color: 'var(--text-secondary)',
                            verticalAlign: 'middle',
                            display: 'inline-block'
                          }} />}
                                                </span>
                                                <span className={styles.flowText} style={{
                          fontSize: '1rem'
                        }}>
                                                    {instance.hyperbackupSource.replace(/^(NAS|SAN|DISQUE)-/, '')}
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
                            color: 'var(--text-secondary)',
                            verticalAlign: 'middle',
                            display: 'inline-block'
                          }} />}
                                                </span>
                                                <span className={styles.flowText} style={{
                          fontSize: '1rem'
                        }}>
                                                    {instance.hyperbackupDestination.replace(/^(NAS|SAN|DISQUE)-/, '')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>}

                                {}
                                {(instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup" || instance.logiciel === "HyperBackup" || instance.logiciel === "Active Backup for Microsoft 365") && <textarea id={`comment-instance-${instanceIndex}`} className={styles.commentTextarea} value={instanceData.comment || ""} onChange={e => updateInstance(instanceIndex, "comment", e.target.value)} onFocus={handleInputFocus} placeholder="Comment..." rows="2" />}
                                
                                {}
                                {instance.logiciel !== "Veeam" && instance.logiciel !== "HYCU Backup" && instance.logiciel !== "HyperBackup" && instance.logiciel !== "Active Backup for Microsoft 365" && <>
                                        <div style={{
                      padding: '0.375rem 0.5rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '0.5rem',
                      marginTop: 'auto'
                    }}>
                                            <div style={{
                        flex: '0 0 auto'
                      }}>
                                                
                                            </div>
                                        </div>

                                        {}
                                        <div style={{
                      marginTop: 'auto',
                      paddingTop: '0rem',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                                            <textarea id={`comment-instance-${instanceIndex}`} value={instanceData.comment || ""} onChange={e => updateInstance(instanceIndex, "comment", e.target.value)} onFocus={handleInputFocus} placeholder="Comment..." style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '2px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        resize: 'none',
                        minHeight: '45px',
                        maxHeight: '100px',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s ease'
                      }} rows="2" />
                                </div>
                                    </>}

                                        {}
                                        {(instance.jobs || []).length > 0 && (() => {
                    const jobsPerPage = 5;
                    const currentPage = jobsPagination[instanceIndex] || 1;
                    const totalJobs = (instance.jobs || []).length;
                    const totalPages = Math.ceil(totalJobs / jobsPerPage);
                    const startIndex = (currentPage - 1) * jobsPerPage;
                    const endIndex = startIndex + jobsPerPage;
                    const paginatedJobs = instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup" ? (instance.jobs || []).slice(startIndex, endIndex) : instance.jobs || [];
                    return <div style={{
                      marginTop: '1.5rem'
                    }}>
                                                <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                                                    <h4 className={styles.sectionTitle} style={{
                          marginBottom: '0'
                        }}>
                                                        Jobs ({totalJobs})
                                                    </h4>
                                                    {(instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && totalPages > 1 && <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                                                            <button onClick={() => setJobsPagination(prev => ({
                            ...prev,
                            [instanceIndex]: Math.max(1, currentPage - 1)
                          }))} disabled={currentPage === 1} style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                            background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
                            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                            borderRadius: '6px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1,
                            transition: 'all 0.2s ease'
                          }}>
                                                                Previous
                                                            </button>
                                                            <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            fontWeight: '500'
                          }}>
                                                                Page {currentPage} of {totalPages}
                                                            </span>
                                                            <button onClick={() => setJobsPagination(prev => ({
                            ...prev,
                            [instanceIndex]: Math.min(totalPages, currentPage + 1)
                          }))} disabled={currentPage === totalPages} style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
                            background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
                            border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                            borderRadius: '6px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1,
                            transition: 'all 0.2s ease'
                          }}>
                                                                Next
                                                            </button>
                                                        </div>}
                                                </div>
                                                <div style={{
                        display: instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup" || instance.logiciel === "Active Backup for Microsoft 365" ? 'grid' : 'flex',
                        gridTemplateColumns: instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup" || instance.logiciel === "Active Backup for Microsoft 365" ? 'repeat(2, 1fr)' : undefined,
                        flexDirection: instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup" || instance.logiciel === "Active Backup for Microsoft 365" ? undefined : 'column',
                        gap: '1rem'
                      }}>
                            {paginatedJobs.map((job, paginatedIndex) => {
                          const jobIndex = instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup" ? startIndex + paginatedIndex : paginatedIndex;
                          const jobData = data?.[instanceIndex]?.[jobIndex] || {};
                          const jobStatus = getJobStatus(jobData);
                          const isVeeamMapped = instance.logiciel === "Veeam" && job.id && checkmkMappings[job.id] && checkmkMappings[job.id].checkmk_service_name;
                          return <div key={`job-${instanceIndex}-${jobIndex}`} className={styles.jobCard} style={instance.logiciel === "HyperBackup" ? {
                            minHeight: '400px'
                          } : instance.logiciel === "Active Backup for Microsoft 365" ? {
                            minHeight: '400px'
                          } : {}}>
                                                                {}
                                                                <div className={styles.cardHeader}>
                                                                    <div className={styles.headerLeft}>
                                                        {instance.logiciel !== "HYCU Backup" && instance.logiciel !== "Active Backup for Microsoft 365" && instance.logiciel !== "Veeam" && (() => {
                                  const StatusIcon = jobStatus.icon;
                                  return <StatusIcon style={{
                                    fontSize: '1rem',
                                    color: jobStatus.color,
                                    flexShrink: 0
                                  }} />;
                                })()}
                                                                        <h5 style={{
                                  margin: 0,
                                  fontSize: '1.125rem',
                                  fontWeight: '700',
                                  color: theme === 'dark' ? '#f9fafb' : '#111827',
                                  lineHeight: '1.2',
                                  letterSpacing: '-0.025em'
                                }}>
                                                        {job.nom || `Job #${jobIndex + 1}`}
                                                                        </h5>
                                                                    </div>
                                                                    <div className={styles.headerRight} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                            {}
                                            {instance.logiciel === "Veeam" && job.id && checkmkMappings[job.id] && checkmkMappings[job.id].checkmk_service_name && (() => {
                                  const needsSync = !data?.[instanceIndex]?.[jobIndex]?.lastSyncDate && !loadingCheckMK[job.nom];
                                  return <button className={`${styles.syncButton} ${needsSync ? styles.syncButtonWarning : ''}`} onClick={() => {
                                    if (!loadingCheckMK[job.nom]) {
                                      const mapping = checkmkMappings[job.id];
                                      loadCheckMKDataMemo(job.nom, mapping.checkmk_host_name, mapping.checkmk_service_name);
                                    }
                                  }} title={`Mapped to Check MK: ${checkmkMappings[job.id].checkmk_host_name} / ${checkmkMappings[job.id].checkmk_service_name}. Click to sync.`} disabled={loadingCheckMK[job.nom]}>
                                                        <IconifyIcon icon="material-symbols:sync" width={14} height={14} className={loadingCheckMK[job.nom] ? styles.loadingIcon : ''} />
                                                    </button>;
                                })()}
                                            <div style={{
                                  flex: '0 0 auto'
                                }}>
                                                                        
                                            </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {}
                                                                {getJobInfo(job) && <p className={styles.backupDetails} style={{
                              margin: 0,
                              marginBottom: '0.75rem'
                            }}>
                                                                        {getJobInfo(job)}
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
                                      color: 'var(--text-secondary)',
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
                                                            {getStorageIcon(job.stockageLie || job.destination) || <Icon path={mdiNas} size="1.25rem" style={{
                                      color: 'var(--text-secondary)',
                                      verticalAlign: 'middle',
                                      display: 'inline-block'
                                    }} />}
                                                        </span>
                                                        <span className={styles.flowText}>
                                                            {job.stockageLie ? job.stockageLie.replace(/^(NAS|SAN|DISQUE)-/, '') : job.destination}
                                                        </span>
                                                                </div>
                                                    {}
                                                    {job.stockageLie && job.replicationVers && <>
                                                            <div className={styles.flowTransfer}>
                                                                <span className={styles.flowArrow}></span>
                                                            </div>
                                                            <div className={styles.flowDestination}>
                                                                <span className={styles.flowIcon}>
                                                                    {getStorageIcon(job.replicationVers) || <Icon path={mdiNas} size="1.25rem" style={{
                                        color: 'var(--text-secondary)',
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
                                      color: 'var(--text-secondary)',
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
                                      color: 'var(--text-secondary)',
                                      verticalAlign: 'middle'
                                    }} />
                                                        </span>
                                                        <span className={styles.flowText}>
                                                            Datacenter PSI Bouillac
                                                        </span>
                                                    </div>
                                                    <div className={styles.flowTransfer}>
                                                        <span className={`${styles.flowArrow} ${styles.flowArrowGray}`}></span>
                                                    </div>
                                                    <div className={styles.flowDestination}>
                                                        <span className={styles.flowIcon}>
                                                            <FaServer style={{
                                      fontSize: '1.25rem',
                                      color: 'var(--text-secondary)',
                                      verticalAlign: 'middle'
                                    }} />
                                                        </span>
                                                        <span className={styles.flowText}>
                                                            Datacenter PSI Bruges
                                                        </span>
                                                    </div>
                                                </div>
                                        </div>}

                                                                {}
                                        {instance.logiciel === "Veeam" && job.id && checkmkMappings[job.id] && (() => {
                              const jobStats = getJobStats(job.nom);
                              const isLoading = loadingCheckMK[job.nom];
                              const hasCheckMKData = !!checkmkData[job.nom];
                              const eventsCount = checkmkEvents[job.nom] !== undefined ? checkmkEvents[job.nom] : null;
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
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'stretch',
                                gap: '0.5rem',
                                marginTop: '0.75rem',
                                flexWrap: 'wrap'
                              }}>
                                                    {}
                                                    <div style={{
                                  flex: '1 1 0',
                                  minWidth: '120px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  padding: '0.5rem',
                                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                                  opacity: isLoading ? 0.6 : 1
                                }}>
                                                        <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '500'
                                  }}>
                                                            Duration
                                                            </div>
                                                        {isLoading ? <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.7rem'
                                  }}>
                                                                <FaSync style={{
                                      animation: 'spin 1s linear infinite',
                                      fontSize: '0.7rem'
                                    }} />
                                                                Loading...
                                                </div> : <>
                                                                <div style={{
                                      fontSize: '1.25rem',
                                      fontWeight: '700',
                                      color: jobStats?.duration ? 'var(--text-primary)' : 'var(--text-secondary)'
                                    }}>
                                                                    {jobStats?.duration || 'N/A'}
                                                                    </div>
                                                                {!jobStats?.duration && hasCheckMKData && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not available
                                                                </div>}
                                                                {!hasCheckMKData && !isLoading && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not synced
                                                        </div>}
                                                            </>}
                                                                    </div>
                                                    
                                                    {}
                                                    <div style={{
                                  flex: '1 1 0',
                                  minWidth: '120px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  padding: '0.5rem',
                                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                                  opacity: isLoading ? 0.6 : 1
                                }}>
                                                        <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '500'
                                  }}>
                                                            Status
                                                                </div>
                                                        {isLoading ? <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.7rem'
                                  }}>
                                                                <FaSync style={{
                                      animation: 'spin 1s linear infinite',
                                      fontSize: '0.7rem'
                                    }} />
                                                                Loading...
                                                        </div> : <>
                                                                <div style={{
                                      fontSize: '1.25rem',
                                      fontWeight: '700',
                                      color: jobStats?.result ? getResultColor(jobStats.result) : 'var(--text-secondary)'
                                    }}>
                                                                    {jobStats?.result || 'N/A'}
                                                                    </div>
                                                                {!jobStats?.result && hasCheckMKData && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not available
                                                                </div>}
                                                                {!hasCheckMKData && !isLoading && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not synced
                                                        </div>}
                                                </>}
                                        </div>

                                                    {}
                                                    <div style={{
                                  flex: '1 1 0',
                                  minWidth: '120px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  padding: '0.5rem',
                                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                                  opacity: isLoading ? 0.6 : 1,
                                  cursor: eventsCount !== null && eventsCount > 0 ? 'pointer' : 'default'
                                }} onMouseEnter={e => {
                                  if (eventsCount !== null && eventsCount > 0 && checkmkEventsDetails[job.nom] && checkmkEventsDetails[job.nom].length > 0) {
                                    setHoveredTooltip({
                                      jobName: job.nom,
                                      mouseX: e.clientX,
                                      mouseY: e.clientY
                                    });
                                  }
                                }} onMouseMove={e => {
                                  if (hoveredTooltip && hoveredTooltip.jobName === job.nom) {
                                    setHoveredTooltip({
                                      ...hoveredTooltip,
                                      mouseX: e.clientX,
                                      mouseY: e.clientY
                                    });
                                  }
                                }} onMouseLeave={() => {
                                  setHoveredTooltip(null);
                                }}>
                                                        <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '500'
                                  }}>
                                                            Events
                                                        </div>
                                                        {isLoading ? <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.7rem'
                                  }}>
                                                                <FaSync style={{
                                      animation: 'spin 1s linear infinite',
                                      fontSize: '0.7rem'
                                    }} />
                                                                Loading...
                                                            </div> : <>
                                                                <div style={{
                                      fontSize: '1.25rem',
                                      fontWeight: '700',
                                      color: eventsCount !== null ? eventsCount === 0 ? '#10b981' : eventsCount <= 3 ? '#f59e0b' : '#ef4444' : 'var(--text-secondary)'
                                    }}>
                                                                    {eventsCount !== null ? eventsCount : 'N/A'}
                                                                </div>
                                                                {eventsCount === null && hasCheckMKData && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not available
                                                                    </div>}
                                                                {eventsCount === null && !hasCheckMKData && !isLoading && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not synced
                                                                    </div>}
                                                            </>}
                                                    </div>

                                                    {}
                                                    <div style={{
                                  flex: '1 1 0',
                                  minWidth: '120px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.25rem',
                                  padding: '0.5rem',
                                  background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                  borderRadius: '6px',
                                  border: `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
                                  opacity: isLoading ? 0.6 : 1
                                }}>
                                                        <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '500'
                                  }}>
                                                            Date
                                                        </div>
                                                        {isLoading ? <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.7rem'
                                  }}>
                                                                <FaSync style={{
                                      animation: 'spin 1s linear infinite',
                                      fontSize: '0.7rem'
                                    }} />
                                                                Loading...
                                                            </div> : <>
                                                                <div style={{
                                      fontSize: '1rem',
                                      fontWeight: '700',
                                      color: jobStats?.endTime || jobStats?.creationTime ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      textAlign: 'center',
                                      lineHeight: '1.2'
                                    }}>
                                                                    {jobStats?.endTime ? formatDate(jobStats.endTime) : jobStats?.creationTime ? formatDate(jobStats.creationTime) : 'N/A'}
                                                                </div>
                                                                {!(jobStats?.endTime || jobStats?.creationTime) && hasCheckMKData && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not available
                                                                    </div>}
                                                                {!hasCheckMKData && !isLoading && <div style={{
                                      fontSize: '0.6rem',
                                      color: 'var(--text-secondary)',
                                      fontStyle: 'italic',
                                      marginTop: '0.1rem'
                                    }}>
                                                                        Not synced
                                                    </div>}
                                                            </>}
                                                </div>
                                                </div>;
                            })()}

                                        {}
                                        {instance.logiciel !== "Veeam" && instance.logiciel !== "HYCU Backup" && instance.logiciel !== "Active Backup for Microsoft 365" && <div style={{
                              marginTop: '0.75rem',
                              padding: '0.75rem',
                              background: jobStatus.status === 'critical' ? theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' : jobStatus.status === 'warning' ? theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)' : theme === 'dark' ? '#2a2a4a' : '#f9fafb',
                              borderRadius: '6px',
                              border: `1px solid ${jobStatus.status === 'critical' ? '#ef4444' : jobStatus.status === 'warning' ? '#f59e0b' : theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
                            }}>
                                                <label style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: theme === 'dark' ? '#e5e7eb' : '#374151',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                              }}>
                                                    {(() => {
                                  const StatusIcon = jobStatus.icon;
                                  return <StatusIcon style={{
                                    fontSize: '0.875rem',
                                    color: jobStatus.color
                                  }} />;
                                })()}
                                                    Last backup status
                                                </label>
                                                    <select value={jobData.lastStatus || ""} onChange={e => updateJob(instanceIndex, jobIndex, "lastStatus", e.target.value)} style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: `2px solid ${theme === 'dark' ? '#4a4a6a' : '#d1d5db'}`,
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                color: theme === 'dark' ? '#e5e7eb' : '#111827',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                              }}>
                                                        <option value="">Select</option>
                                                        <option value="SUCCESS">✅ Success</option>
                                                        <option value="FAIL">❌ Failure</option>
                                                        <option value="WARNING">⚠️ Warning</option>
                                                        <option value="UNKNOWN">❓ Unknown</option>
                                                    </select>
                                                </div>}

                                        {}
                                            <div style={{
                              marginTop: 'auto',
                              paddingTop: instance.logiciel === "HYCU Backup" || instance.logiciel === "Veeam" ? '0rem' : '0.75rem',
                              borderTop: instance.logiciel === "HYCU Backup" || instance.logiciel === "Veeam" ? 'none' : `1px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`
                            }}>
                                                <textarea id={`comment-job-${instanceIndex}-${jobIndex}`} value={jobData.comment || ""} onChange={e => updateJob(instanceIndex, jobIndex, "comment", e.target.value)} onFocus={handleInputFocus} placeholder="Comment..." style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: `2px solid ${theme === 'dark' ? '#4a4a6a' : '#d1d5db'}`,
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontFamily: 'inherit',
                                resize: 'none',
                                minHeight: '45px',
                                maxHeight: '100px',
                                background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                                color: theme === 'dark' ? '#f9fafb' : '#374151',
                                transition: 'all 0.2s ease'
                              }} rows="2" />
                                            </div>
                                    </div>;
                        })}
                                                </div>
                                            </div>;
                  })()}
                                    </div>;
              })}
                                </>}
                        </div>
                    </div>
                </div>
            </div>

            {}
            {hoveredTooltip && checkmkEventsDetails[hoveredTooltip.jobName] && checkmkEventsDetails[hoveredTooltip.jobName].length > 0 && <div style={{
      position: 'fixed',
      left: `${hoveredTooltip.mouseX + 10}px`,
      top: `${hoveredTooltip.mouseY + 10}px`,
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-color)',
      borderRadius: '6px',
      padding: '0.75rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 99999,
      maxWidth: '600px',
      pointerEvents: 'none'
    }}>
                    <div>
                        <div style={{
          fontSize: '0.9rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '0.5rem'
        }}>
                            Events ({checkmkEvents[hoveredTooltip.jobName] || 0})
                        </div>
                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '400px',
          overflowY: 'auto',
          width: '100%'
        }}>
                            {checkmkEventsDetails[hoveredTooltip.jobName].slice(0, 10).map((event, idx) => {
            const eventText = event.text || event.message || event.title || event.name || 'Event';
            const eventState = event.state || event.state_type || event.state_num || 'UNKNOWN';
            const eventTime = event.time || event.timestamp || event.date || '';
            let stateColor = '#6b7280';
            if (eventState === 1 || eventState === '1' || eventState === 'WARN') {
              stateColor = '#f59e0b';
            } else if (eventState === 2 || eventState === '2' || eventState === 'CRIT') {
              stateColor = '#ef4444';
            } else if (eventState === 3 || eventState === '3' || eventState === 'UNKNOWN') {
              stateColor = '#9ca3af';
            }
            return <div key={idx} style={{
              padding: '0.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '4px',
              borderLeft: `3px solid ${stateColor}`
            }}>
                                        <div style={{
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: eventTime ? '0.25rem' : '0'
              }}>
                                            {eventText}
                                        </div>
                                        {eventTime && <div style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontStyle: 'italic'
              }}>
                                                {typeof eventTime === 'number' ? new Date(eventTime * 1000).toLocaleString('en-US') : eventTime}
                                            </div>}
                                    </div>;
          })}
                            {checkmkEventsDetails[hoveredTooltip.jobName].length > 10 && <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontStyle: 'italic',
            padding: '0.25rem'
          }}>
                                    ... et {checkmkEventsDetails[hoveredTooltip.jobName].length - 10} autre(s)
                                </div>}
                        </div>
                    </div>
                </div>}

            {}
            {hoveredScoreTooltip && <div style={{
      position: 'fixed',
      left: `${hoveredScoreTooltip.mouseX + 10}px`,
      top: `${hoveredScoreTooltip.mouseY + 10}px`,
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '6px',
      padding: '1rem',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      zIndex: 999999,
      maxWidth: '700px',
      pointerEvents: 'none',
      color: '#111827'
    }}>
                    <div>
                        <div style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          marginBottom: '0.75rem',
          color: '#111827'
        }}>
                            Calcul de la note
                        </div>
                        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem 1rem'
        }}>
                            {(hoveredScoreTooltip.scoreBreakdown || []).map((item, idx) => <div key={`score-breakdown-${idx}`} style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
                                    <div style={{
              flex: 1
            }}>
                                        <div style={{
                fontWeight: '600',
                fontSize: '0.85rem',
                marginBottom: '0.25rem'
              }}>
                                            {item.label}
                                        </div>
                                        <div style={{
                fontSize: '0.8rem',
                color: '#6b7280',
                lineHeight: 1.4
              }}>
                                            {item.description}
                                        </div>
                                    </div>
                                    <div style={{
              fontWeight: '600',
              fontSize: '0.85rem',
              color: '#111827',
              whiteSpace: 'nowrap'
            }}>
                                        {item.weight}
                                    </div>
                                </div>)}
                        </div>
                    </div>
                </div>}
        </div>;
};
export default Backup;
