import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { FaLink } from "react-icons/fa";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import CheckMKMappingModal from "./CheckMKMappingModal";
import API_BASE_URL from "../../../../config";
import { getIconPath } from "../../../../utils/assetHelper";
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
};
const StepSauvegarde = ({
  form,
  setForm,
  onAdd,
  currentStepData
}) => {
  const bottomRef = useRef(null);
  const [expandedJobs, setExpandedJobs] = useState(new Set());
  const [expandedInstances, setExpandedInstances] = useState(new Set());
  const [showInstanceTypeModal, setShowInstanceTypeModal] = useState(false);
  const [draggedJobIndex, setDraggedJobIndex] = useState(null);
  const [dragOverJobIndex, setDragOverJobIndex] = useState(null);
  const [isDraggingJob, setIsDraggingJob] = useState(false);
  const [draggedInstanceIndex, setDraggedInstanceIndex] = useState(null);
  const [dragOverInstanceIndex, setDragOverInstanceIndex] = useState(null);
  const [isDraggingInstance, setIsDraggingInstance] = useState(false);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({
    isOpen: false,
    instanceIndex: null,
    jobIndex: null
  });
  const [checkmkMappings, setCheckmkMappings] = useState({});
  React.useEffect(() => {
    if (!form?.id) return;
    const loadMappings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${form.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const mappings = await response.json();
          const mappingsMap = {};
          mappings.forEach(m => {
            if (m.equipment_type === 'Sauvegarde') {
              mappingsMap[m.equipment_id] = m;
            }
          });
          setCheckmkMappings(mappingsMap);
        }
      } catch (error) {
        console.error('Erreur chargement mappings Check MK:', error);
      }
    };
    loadMappings();
  }, [form?.id]);
  useEffect(() => {
    if (onAdd && currentStepData?.key === 'sauvegarde') {
      onAdd[currentStepData.key] = () => {
        setShowInstanceTypeModal(true);
      };
    }
  }, [onAdd, currentStepData]);
  React.useEffect(() => {
    if (form?.equipements?.Sauvegarde?.instances) {
      const instances = form.equipements.Sauvegarde.instances;
    }
  }, [form?.equipements?.Sauvegarde?.instances]);
  if (!form) {
    return <div className={styles.stepContainer}>
        <div className={styles.formSection}>
          <p>Loading...</p>
        </div>
      </div>;
  }
  const getSauvegardeData = () => {
    const sauvegarde = form?.equipements?.Sauvegarde;
    if (!sauvegarde || !sauvegarde.instances || !Array.isArray(sauvegarde.instances)) {
      return {
        instances: []
      };
    }
    return {
      ...sauvegarde,
      instances: sauvegarde.instances.map(instance => ({
        ...instance,
        jobs: Array.isArray(instance.jobs) ? instance.jobs : []
      }))
    };
  };
  const toggleJobExpansion = (instanceIndex, jobIndex) => {
    const key = `${instanceIndex}-${jobIndex}`;
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedJobs(newExpanded);
  };
  const toggleInstanceExpansion = instanceIndex => {
    const newExpanded = new Set(expandedInstances);
    if (newExpanded.has(instanceIndex)) {
      newExpanded.delete(instanceIndex);
    } else {
      newExpanded.add(instanceIndex);
    }
    setExpandedInstances(newExpanded);
  };
  const getInstanceIcon = logiciel => {
    if (logiciel === "Veeam") {
      return <img src={getIconPath('veeam.png')} alt="Veeam" style={{
        width: '20px',
        height: '20px',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px'
      }} />;
    } else if (logiciel === "HYCU Backup") {
      return <img src={getIconPath('hycu.png')} alt="HYCU Backup" style={{
        width: '20px',
        height: '20px',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px'
      }} />;
    } else if (logiciel === "HyperBackup") {
      return <img src={getIconPath('hyperbackup.png')} alt="HyperBackup" style={{
        width: '20px',
        height: '20px',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px'
      }} />;
    } else if (logiciel === "Active Backup for Microsoft 365") {
      return <img src={getIconPath('active-backup.png')} alt="Active Backup for Microsoft 365" style={{
        width: '20px',
        height: '20px',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px'
      }} />;
    }
    return null;
  };
  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Sauvegarde: {
          ...prev.equipements?.Sauvegarde,
          [field]: value
        }
      }
    }));
  };
  const updateInstance = (instanceIndex, field, value) => {
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    if (!updatedInstances[instanceIndex].jobs) {
      updatedInstances[instanceIndex].jobs = [];
    }
    updatedInstances[instanceIndex][field] = value;
    updateField("instances", updatedInstances);
  };
  const updateJob = async (instanceIndex, jobIndex, field, value) => {
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    if (!updatedInstances[instanceIndex].jobs) {
      updatedInstances[instanceIndex].jobs = [];
    }
    const updatedJobs = [...updatedInstances[instanceIndex].jobs];
    const oldValue = updatedJobs[jobIndex][field];
    updatedJobs[jobIndex][field] = value;
    updatedInstances[instanceIndex].jobs = updatedJobs;
    updateField("instances", updatedInstances);
  };
  const removeInstance = instanceIndex => {
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    updatedInstances.splice(instanceIndex, 1);
    updateField("instances", updatedInstances);
  };
  const removeJob = (instanceIndex, jobIndex) => {
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    const instance = updatedInstances[instanceIndex];
    if (!instance.jobs) {
      instance.jobs = [];
      return;
    }
    const jobToRemove = instance.jobs[jobIndex];
    const isDefaultJob = instance.logiciel === "HYCU Backup" && (jobToRemove?.isDefault || instance.jobs.length === 1);
    if (isDefaultJob) {
      return;
    }
    const updatedJobs = [...instance.jobs];
    updatedJobs.splice(jobIndex, 1);
    updatedInstances[instanceIndex].jobs = updatedJobs;
    updateField("instances", updatedInstances);
  };
  const handleJobDragStart = (e, instanceIndex, jobIndex) => {
    const target = e.target;
    const isFormElement = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('input, select, textarea, button');
    if (isFormElement) {
      e.preventDefault();
      return;
    }
    setIsDraggingJob(true);
    setDraggedJobIndex({
      instanceIndex,
      jobIndex
    });
    setDragOverJobIndex(null);
    e.dataTransfer.effectAllowed = "move";
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "0.5";
    }
  };
  const handleJobDragOver = (e, instanceIndex, jobIndex) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverJobIndex({
      instanceIndex,
      jobIndex
    });
  };
  const handleJobDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverJobIndex(null);
    }
  };
  const handleJobDrop = (e, instanceIndex, dropJobIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedJobIndex === null || draggedJobIndex.instanceIndex !== instanceIndex || draggedJobIndex.jobIndex === dropJobIndex) {
      setDraggedJobIndex(null);
      setDragOverJobIndex(null);
      setIsDraggingJob(false);
      return;
    }
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    const updatedJobs = [...updatedInstances[instanceIndex].jobs];
    const draggedItem = updatedJobs[draggedJobIndex.jobIndex];
    updatedJobs.splice(draggedJobIndex.jobIndex, 1);
    updatedJobs.splice(dropJobIndex, 0, draggedItem);
    updatedInstances[instanceIndex].jobs = updatedJobs;
    updateField("instances", updatedInstances);
    const newExpanded = new Set();
    expandedJobs.forEach(key => {
      const [instIdx, jobIdx] = key.split('-').map(Number);
      if (instIdx === instanceIndex) {
        if (jobIdx === draggedJobIndex.jobIndex) {
          newExpanded.add(`${instanceIndex}-${dropJobIndex}`);
        } else if (jobIdx < draggedJobIndex.jobIndex && jobIdx >= dropJobIndex) {
          newExpanded.add(`${instanceIndex}-${jobIdx + 1}`);
        } else if (jobIdx > draggedJobIndex.jobIndex && jobIdx <= dropJobIndex) {
          newExpanded.add(`${instanceIndex}-${jobIdx - 1}`);
        } else {
          newExpanded.add(key);
        }
      } else {
        newExpanded.add(key);
      }
    });
    setExpandedJobs(newExpanded);
    setDraggedJobIndex(null);
    setDragOverJobIndex(null);
    setIsDraggingJob(false);
  };
  const handleJobDragEnd = e => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
    setDraggedJobIndex(null);
    setDragOverJobIndex(null);
    setTimeout(() => {
      setIsDraggingJob(false);
    }, 100);
  };
  const handleInstanceDragStart = (e, instanceIndex) => {
    const target = e.target;
    const isFormElement = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('input, select, textarea, button');
    if (isFormElement) {
      e.preventDefault();
      return;
    }
    setIsDraggingInstance(true);
    setDraggedInstanceIndex(instanceIndex);
    e.dataTransfer.effectAllowed = "move";
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "0.5";
    }
  };
  const handleInstanceDragOver = (e, instanceIndex) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverInstanceIndex(instanceIndex);
  };
  const handleInstanceDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverInstanceIndex(null);
    }
  };
  const handleInstanceDrop = (e, dropInstanceIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedInstanceIndex === null || draggedInstanceIndex === dropInstanceIndex) {
      setDraggedInstanceIndex(null);
      setDragOverInstanceIndex(null);
      setIsDraggingInstance(false);
      return;
    }
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    const draggedItem = updatedInstances[draggedInstanceIndex];
    updatedInstances.splice(draggedInstanceIndex, 1);
    updatedInstances.splice(dropInstanceIndex, 0, draggedItem);
    updateField("instances", updatedInstances);
    const newExpanded = new Set();
    expandedInstances.forEach(idx => {
      const instIdx = Number(idx);
      if (instIdx === draggedInstanceIndex) {
        newExpanded.add(dropInstanceIndex);
      } else if (instIdx < draggedInstanceIndex && instIdx >= dropInstanceIndex) {
        newExpanded.add(instIdx + 1);
      } else if (instIdx > draggedInstanceIndex && instIdx <= dropInstanceIndex) {
        newExpanded.add(instIdx - 1);
      } else {
        newExpanded.add(instIdx);
      }
    });
    setExpandedInstances(newExpanded);
    setDraggedInstanceIndex(null);
    setDragOverInstanceIndex(null);
    setIsDraggingInstance(false);
  };
  const handleInstanceDragEnd = e => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
    setDraggedInstanceIndex(null);
    setDragOverInstanceIndex(null);
    setTimeout(() => {
      setIsDraggingInstance(false);
    }, 100);
  };
  const addInstance = type => {
    const currentSauvegarde = getSauvegardeData();
    const tempInstanceId = generateUUID();
    const tempJobId = generateUUID();
    const newInstance = {
      id: tempInstanceId,
      logiciel: type,
      expiration: type === "Veeam" ? "" : undefined,
      server: type === "HYCU Backup" ? "Datacenter PSI" : "",
      hyperbackupSource: type === "HyperBackup" ? "" : undefined,
      hyperbackupDestination: type === "HyperBackup" ? "" : undefined,
      jobs: type === "HyperBackup" ? [] : type === "HYCU Backup" ? [{
        id: tempJobId,
        nom: "",
        regularite: "",
        horaire: "",
        type: "",
        retention: "",
        destination: "",
        serveurLie: "",
        stockageLie: "",
        replicationVers: "",
        isDefault: true
      }] : [],
      activeBackupModules: type === "Active Backup for Microsoft 365" ? {
        oneDrive: false,
        sharePoint: false,
        exchange: false,
        teams: false,
        calendar: false,
        contacts: false
      } : undefined,
      activeBackupStorage: type === "Active Backup for Microsoft 365" ? "" : undefined
    };
    const updatedInstances = [...currentSauvegarde.instances, newInstance];
    updateField("instances", updatedInstances);
    setShowInstanceTypeModal(false);
    setExpandedInstances(new Set([...expandedInstances, updatedInstances.length - 1]));
  };
  const addJob = instanceIndex => {
    const currentSauvegarde = getSauvegardeData();
    const updatedInstances = [...currentSauvegarde.instances];
    if (!updatedInstances[instanceIndex].jobs) {
      updatedInstances[instanceIndex].jobs = [];
    }
    const tempId = generateUUID();
    updatedInstances[instanceIndex].jobs.push({
      id: tempId,
      nom: "",
      regularite: "",
      horaire: "",
      type: "",
      retention: "",
      destination: "",
      serveurLie: "",
      stockageLie: "",
      replicationVers: ""
    });
    updateField("instances", updatedInstances);
  };
  const getStockageOptions = () => {
    const stockageOptions = [];
    if (form?.equipements?.NAS) {
      form.equipements.NAS.forEach((item, index) => {
        if (item.type === 'External hard drive') {
          stockageOptions.push({
            value: `DISQUE-${item.nom}`,
            label: `${item.nom} (External hard drive)${item.numeroDisque ? ` - N°${item.numeroDisque}` : ''}`,
            type: 'External hard drive',
            equipement: item
          });
        } else if (item.type === 'NAS') {
          stockageOptions.push({
            value: `NAS-${item.nom}`,
            label: `${item.nom} (NAS) - ${item.fabricant || ''} ${item.modele || ''}`,
            type: 'NAS',
            equipement: item
          });
          if (item.luns && Array.isArray(item.luns)) {
            item.luns.forEach((lun, lunIndex) => {
              const lunName = lun.nom || lun.iqn || `LUN ${lunIndex + 1}`;
              stockageOptions.push({
                value: `LUN-${item.nom}-${lunName}`,
                label: `${lunName} (LUN of ${item.nom})${lun.capacite ? ` - ${lun.capacite}` : ''}`,
                type: 'LUN',
                equipement: item,
                lun: lun
              });
            });
          }
        }
      });
    }
    if (form?.equipements?.SAN) {
      form.equipements.SAN.forEach((san, index) => {
        stockageOptions.push({
          value: `SAN-${san.nom}`,
          label: `${san.nom} (SAN) - ${san.fabricant || ''} ${san.modele || ''}`,
          type: 'SAN',
          equipement: san
        });
        if (san.luns && Array.isArray(san.luns)) {
          san.luns.forEach((lun, lunIndex) => {
            const lunName = lun.nom || lun.iqn || `LUN ${lunIndex + 1}`;
            stockageOptions.push({
              value: `LUN-${san.nom}-${lunName}`,
              label: `${lunName} (LUN of ${san.nom})${lun.capacite ? ` - ${lun.capacite}` : ''}`,
              type: 'LUN',
              equipement: san,
              lun: lun
            });
          });
        }
      });
    }
    return stockageOptions;
  };
  const sauvegardeData = getSauvegardeData();
  const instances = sauvegardeData?.instances || [];
  return <motion.div className={styles.stepContainer} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: "circOut"
  }}>
      <div className={styles.formSection}>
        <div className={styles.scrollable}>
          {instances.length === 0 ? <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No backups configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add an instance" to get started
              </p>
            </div> : instances.map((instance, i) => {
          if (!instance.jobs) {
            instance.jobs = [];
          }
          const isDragged = draggedInstanceIndex === i;
          const isDragOver = dragOverInstanceIndex === i;
          return <motion.div key={i} draggable onDragStart={e => {
            e.stopPropagation();
            handleInstanceDragStart(e, i);
          }} onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            handleInstanceDragOver(e, i);
          }} onDragLeave={handleInstanceDragLeave} onDrop={e => {
            e.stopPropagation();
            handleInstanceDrop(e, i);
          }} onDragEnd={e => {
            e.stopPropagation();
            handleInstanceDragEnd(e);
          }} className={`${styles.serverCard} ${isDragged ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`} initial={{
            opacity: 0,
            scale: 0.98
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            duration: 0.3
          }} style={{
            cursor: 'grab'
          }}>
                <div className={`${styles.serverHeader} ${expandedInstances.has(i) ? styles.serverHeaderExpanded : ''}`} onClick={e => {
              if (!isDraggingInstance) {
                toggleInstanceExpansion(i);
              }
            }} style={{
              cursor: 'pointer'
            }}>
                  <div className={styles.dragHandle} title="Drag to reorder" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} style={{
                opacity: 0.3,
                transition: 'opacity 0.2s ease',
                cursor: 'grab'
              }} onMouseEnter={e => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }} onMouseLeave={e => {
                e.currentTarget.style.opacity = '0.3';
                e.currentTarget.style.color = 'inherit';
              }}>
                    <GripVertical size={18} />
                  </div>
                  <div className={styles.serverTitle} style={{
                flex: 1
              }}>
                    <h4 style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                      {getInstanceIcon(instance.logiciel)}
                      Instance {instance.logiciel} #{i + 1}
                    </h4>
                    <span className={styles.serverType}>
                      {instance.logiciel === "HyperBackup" ? instance.hyperbackupSource && instance.hyperbackupDestination ? `${instance.hyperbackupSource.replace(/^(NAS|SAN)-/, '')} to ${instance.hyperbackupDestination.replace(/^(NAS|SAN|DISQUE)-/, '').replace(/-\d+$/, '')}` : [instance.hyperbackupSource && instance.hyperbackupSource.replace(/^(NAS|SAN)-/, ''), instance.hyperbackupDestination && instance.hyperbackupDestination.replace(/^(NAS|SAN|DISQUE)-/, '').replace(/-\d+$/, '')].filter(Boolean).join(' / ') : instance.logiciel === "HYCU Backup" ? [instance.logiciel, instance.server].filter(Boolean).join(' / ') : instance.logiciel === "Active Backup for Microsoft 365" ? [instance.activeBackupModules && Object.entries(instance.activeBackupModules).filter(([_, active]) => active).map(([key, _]) => {
                    const labels = {
                      oneDrive: 'OneDrive',
                      sharePoint: 'SharePoint',
                      exchange: 'Exchange',
                      teams: 'Teams',
                      calendar: 'Calendar',
                      contacts: 'Contacts'
                    };
                    return labels[key];
                  }).join(', ') || 'No modules enabled', instance.activeBackupStorage && `→ ${instance.activeBackupStorage}`].filter(Boolean).join(' • ') : [instance.logiciel === "Veeam" && instance.expiration, instance.server, `${(instance.jobs || []).length} job${(instance.jobs || []).length > 1 ? 's' : ''}`].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                  <div className={styles.serverActions}>
                    {(instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && <button className={styles.addButtonDiscret} onClick={e => {
                  e.stopPropagation();
                  addJob(i);
                }} title="Add a job" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  marginRight: '0.5rem',
                  fontSize: '18px',
                  color: '#13BA8E',
                  background: 'transparent',
                  border: '1px solid #13BA8E',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }} onMouseEnter={e => {
                  e.target.style.backgroundColor = '#13BA8E';
                  e.target.style.color = 'white';
                }} onMouseLeave={e => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#13BA8E';
                }}>
                        +
                      </button>}
                    <button className={styles.deleteButton} onClick={e => {
                  e.stopPropagation();
                  removeInstance(i);
                }} title="Delete this instance">
                      ×
                    </button>
                  </div>
                </div>

                {}
                {expandedInstances.has(i) && <motion.div className={styles.serverForm} style={{
              background: 'transparent',
              boxShadow: 'none',
              border: 'none'
            }} initial={{
              opacity: 0,
              height: 0
            }} animate={{
              opacity: 1,
              height: "auto"
            }} exit={{
              opacity: 0,
              height: 0
            }} transition={{
              duration: 0.3
            }}>
                    {instance.logiciel === "Veeam" ? <div className={styles.formGrid} style={{
                gridTemplateColumns: '1fr 1fr'
              }}>
                        <div className={styles.formField}>
                          <label htmlFor={`instance-expiration-${i}`}>License expiration</label>
                          <input id={`instance-expiration-${i}`} type="date" value={instance.expiration} onChange={e => updateInstance(i, "expiration", e.target.value)} />
                        </div>
                        <div className={styles.formField}>
                          <label htmlFor={`instance-server-${i}`}>Backup server</label>
                          <select id={`instance-server-${i}`} value={instance.server || ""} onChange={e => updateInstance(i, "server", e.target.value)}>
                            <option value="">No backup server</option>
                            {form?.equipements?.Serveurs && form.equipements.Serveurs.map((serveur, index) => <option key={index} value={serveur.nom}>
                                {serveur.nom} - {Array.isArray(serveur.role) ? serveur.role.join(', ') : serveur.role} ({serveur.ip})
                              </option>)}
                          </select>
                        </div>
                      </div> : instance.logiciel === "Active Backup for Microsoft 365" ? <div>
                        <div style={{
                  marginBottom: '1rem'
                }}>
                          <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: '#1a1a1a'
                  }}>
                            Enabled modules
                          </label>
                          <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem'
                  }}>
                            {[{
                      key: 'oneDrive',
                      label: 'OneDrive'
                    }, {
                      key: 'sharePoint',
                      label: 'SharePoint'
                    }, {
                      key: 'exchange',
                      label: 'Exchange'
                    }, {
                      key: 'teams',
                      label: 'Teams'
                    }, {
                      key: 'calendar',
                      label: 'Calendar'
                    }, {
                      key: 'contacts',
                      label: 'Contacts'
                    }].map(({
                      key,
                      label
                    }) => <label key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      background: instance.activeBackupModules?.[key] ? '#f0fdfa' : '#ffffff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${instance.activeBackupModules?.[key] ? '#15d1a0' : '#e5e7eb'}`,
                      transition: 'all 0.2s ease'
                    }} onMouseEnter={e => {
                      if (!instance.activeBackupModules?.[key]) {
                        e.currentTarget.style.borderColor = '#15d1a0';
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }} onMouseLeave={e => {
                      if (!instance.activeBackupModules?.[key]) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}>
                                <input type="checkbox" checked={instance.activeBackupModules?.[key] || false} onChange={e => {
                        const updatedModules = {
                          ...(instance.activeBackupModules || {
                            oneDrive: false,
                            sharePoint: false,
                            exchange: false,
                            teams: false,
                            calendar: false,
                            contacts: false
                          }),
                          [key]: e.target.checked
                        };
                        updateInstance(i, "activeBackupModules", updatedModules);
                      }} style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#15d1a0'
                      }} />
                                <span style={{
                        flex: 1,
                        fontSize: '0.875rem',
                        color: '#1a1a1a'
                      }}>
                                  {label}
                                </span>
                              </label>)}
                          </div>
                        </div>
                        <div className={styles.formField}>
                          <label htmlFor={`active-backup-storage-${i}`}>Destination</label>
                          <select id={`active-backup-storage-${i}`} value={instance.activeBackupStorage || ""} onChange={e => updateInstance(i, "activeBackupStorage", e.target.value)}>
                            <option value="">Select a destination</option>
                            {form?.equipements?.NAS && form.equipements.NAS.filter(eq => eq.type === 'NAS' || eq.type === 'SAN').map((eq, index) => <option key={index} value={eq.nom}>
                                  {eq.nom} {eq.modele ? `(${eq.modele})` : ''} {eq.ip ? `- ${eq.ip}` : ''} {eq.type ? `[${eq.type}]` : ''}
                                </option>)}
                          </select>
                        </div>
                      </div> : instance.logiciel === "HYCU Backup" ? null : null}

                  {}
                  {(instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && <>
                      <div className={styles.scrollable}>
                        {(instance.jobs || []).map((job, j) => {
                    const isDragged = draggedJobIndex?.instanceIndex === i && draggedJobIndex?.jobIndex === j;
                    const isDragOver = dragOverJobIndex?.instanceIndex === i && dragOverJobIndex?.jobIndex === j;
                    const isDefaultJob = instance.logiciel === "HYCU Backup" && (job.isDefault || (instance.jobs || []).length === 1 && j === 0);
                    return <motion.div key={j} draggable={!isDefaultJob} onDragStart={e => {
                      e.stopPropagation();
                      handleJobDragStart(e, i, j);
                    }} onDragOver={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleJobDragOver(e, i, j);
                    }} onDragLeave={handleJobDragLeave} onDrop={e => {
                      e.stopPropagation();
                      handleJobDrop(e, i, j);
                    }} onDragEnd={e => {
                      e.stopPropagation();
                      handleJobDragEnd(e);
                    }} className={`${styles.serverCard} ${isDragged ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`} initial={{
                      opacity: 0,
                      scale: 0.98
                    }} animate={{
                      opacity: 1,
                      scale: 1
                    }} transition={{
                      duration: 0.3
                    }} style={{
                      cursor: 'grab'
                    }}>
                            <div className={`${styles.serverHeader} ${expandedJobs.has(`${i}-${j}`) ? styles.serverHeaderExpanded : ''}`} onClick={e => {
                        if (!isDraggingJob) {
                          toggleJobExpansion(i, j);
                        }
                      }} style={{
                        cursor: 'pointer'
                      }}>
                              <div className={styles.dragHandle} title="Drag to reorder" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} style={{
                          opacity: 0.3,
                          transition: 'opacity 0.2s ease',
                          cursor: 'grab'
                        }} onMouseEnter={e => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.color = 'var(--accent-primary)';
                        }} onMouseLeave={e => {
                          e.currentTarget.style.opacity = '0.3';
                          e.currentTarget.style.color = 'inherit';
                        }}>
                                <GripVertical size={18} />
                              </div>
                              <div className={styles.serverTitle} style={{
                          flex: 1
                        }}>
                                <h4>{job.nom || `Job #${j + 1}`}</h4>
                                <span className={styles.serverType}>
                                  {[job.regularite, job.horaire, job.retention].filter(Boolean).join(' • ')}
                                </span>
                              </div>
                              <div className={styles.serverActions}>
                                {instance.logiciel === "Veeam" && job.nom && <button onClick={e => {
                            e.stopPropagation();
                            setCheckmkMappingModal({
                              isOpen: true,
                              instanceIndex: i,
                              jobIndex: j
                            });
                          }} disabled={!job.id} title={!job.id ? "Job without valid ID" : checkmkMappings[job.id] ? `Mapped to: ${checkmkMappings[job.id].checkmk_host_name} / ${checkmkMappings[job.id].checkmk_service_name}` : "Map with Check MK"} style={{
                            padding: '0.5rem',
                            background: !job.id ? '#d1d5db' : checkmkMappings[job.id] ? '#10b981' : '#9ca3af',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: !job.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '0.5rem',
                            transition: 'all 0.2s ease',
                            boxShadow: !job.id ? '0 2px 4px rgba(0, 0, 0, 0.1)' : checkmkMappings[job.id] ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)',
                            opacity: !job.id ? 0.6 : 1
                          }} onMouseEnter={e => {
                            if (job.id) {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = checkmkMappings[job.id] ? '0 4px 8px rgba(16, 185, 129, 0.4)' : '0 4px 8px rgba(156, 163, 175, 0.35)';
                            }
                          }} onMouseLeave={e => {
                            if (job.id) {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = checkmkMappings[job.id] ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)';
                            }
                          }}>
                                    <FaLink />
                                  </button>}
                                {!isDefaultJob && <button className={styles.deleteButton} onClick={e => {
                            e.stopPropagation();
                            removeJob(i, j);
                          }} title="Delete this job">
                                    ×
                                  </button>}
                              </div>
                            </div>

                          {}
                          {expandedJobs.has(`${i}-${j}`) && <motion.div className={styles.serverForm} style={{
                        background: 'transparent',
                        boxShadow: 'none',
                        border: 'none'
                      }} initial={{
                        opacity: 0,
                        height: 0
                      }} animate={{
                        opacity: 1,
                        height: "auto"
                      }} exit={{
                        opacity: 0,
                        height: 0
                      }} transition={{
                        duration: 0.3
                      }}>
                              {instance.logiciel === "Veeam" ? <>
                                  {}
                                  <div className={styles.formGrid}>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-nom-${i}-${j}`}>Job name *</label>
                                      <input id={`job-nom-${i}-${j}`} value={job.nom} onChange={e => updateJob(i, j, "nom", e.target.value)} required />
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-serveur-${i}-${j}`}>Target</label>
                                      <select id={`job-serveur-${i}-${j}`} value={job.serveurLie || ""} onChange={e => updateJob(i, j, "serveurLie", e.target.value)}>
                                        <option value="">No target</option>
                                        {form?.equipements?.Serveurs && form.equipements.Serveurs.map((serveur, index) => <option key={index} value={serveur.nom}>
                                            {serveur.nom} - {Array.isArray(serveur.role) ? serveur.role.join(', ') : serveur.role} ({serveur.ip})
                                          </option>)}
                                      </select>
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-stockage-${i}-${j}`}>Destination</label>
                                      <select id={`job-stockage-${i}-${j}`} value={job.stockageLie || ""} onChange={e => updateJob(i, j, "stockageLie", e.target.value)}>
                                        <option value="">No destination</option>
                                        {getStockageOptions().map((option, index) => <option key={index} value={option.value}>
                                            {option.label}
                                          </option>)}
                                      </select>
                                    </div>
                                  </div>

                                  {}
                                  <div className={styles.formGrid} style={{
                            gridTemplateColumns: '1fr 1fr 1fr 1fr'
                          }}>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-type-${i}-${j}`}>Backup type</label>
                                      <select id={`job-type-${i}-${j}`} value={job.type} onChange={e => updateJob(i, j, "type", e.target.value)}>
                                        <option value="">Select a type</option>
                                        <option value="Full">Full</option>
                                        <option value="Incremental">Incremental</option>
                                        <option value="Differential">Differential</option>
                                        <option value="Synthetic">Synthetic</option>
                                      </select>
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-regularite-${i}-${j}`}>Frequency</label>
                                      <select id={`job-regularite-${i}-${j}`} value={job.regularite} onChange={e => updateJob(i, j, "regularite", e.target.value)}>
                                        <option value="">Select a frequency</option>
                                        <option value="Daily">Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                      </select>
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-horaire-${i}-${j}`}>Schedule</label>
                                      <input id={`job-horaire-${i}-${j}`} type="time" value={job.horaire} onChange={e => updateJob(i, j, "horaire", e.target.value)} />
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-retention-${i}-${j}`}>Retention</label>
                                      <select id={`job-retention-${i}-${j}`} value={job.retention} onChange={e => updateJob(i, j, "retention", e.target.value)}>
                                        <option value="">Select a retention</option>
                                        <option value="7 days">7 days</option>
                                        <option value="14 days">14 days</option>
                                        <option value="30 days">30 days</option>
                                        <option value="60 days">60 days</option>
                                        <option value="90 days">90 days</option>
                                        <option value="6 months">6 months</option>
                                      </select>
                                    </div>
                                  </div>
                                </> : <>
                                  {}
                                  {}
                                  <div className={styles.formGrid}>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-nom-${i}-${j}`}>Job name *</label>
                                      <input id={`job-nom-${i}-${j}`} value={job.nom} onChange={e => updateJob(i, j, "nom", e.target.value)} required />
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-serveur-${i}-${j}`}>Target</label>
                                      <select id={`job-serveur-${i}-${j}`} value={job.serveurLie || ""} onChange={e => updateJob(i, j, "serveurLie", e.target.value)}>
                                        <option value="">No target</option>
                                        {form?.equipements?.Serveurs && form.equipements.Serveurs.map((serveur, index) => <option key={index} value={serveur.nom}>
                                            {serveur.nom} - {Array.isArray(serveur.role) ? serveur.role.join(', ') : serveur.role} ({serveur.ip})
                                          </option>)}
                                      </select>
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-stockage-${i}-${j}`}>Destination</label>
                                      <input id={`job-stockage-${i}-${j}`} value="Datacenter PSI" disabled style={{
                                backgroundColor: "#f3f4f6",
                                cursor: "not-allowed",
                                opacity: 0.7
                              }} />
                                    </div>
                                  </div>

                                  {}
                                  <div className={styles.formGrid} style={{
                            gridTemplateColumns: '1fr 1fr 1fr 1fr'
                          }}>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-type-${i}-${j}`}>Backup type</label>
                                      <select id={`job-type-${i}-${j}`} value={job.type} onChange={e => updateJob(i, j, "type", e.target.value)}>
                                        <option value="">Select a type</option>
                                        <option value="Full">Full</option>
                                        <option value="Incremental">Incremental</option>
                                        <option value="Differential">Differential</option>
                                        <option value="Synthetic">Synthetic</option>
                                      </select>
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-regularite-${i}-${j}`}>Frequency</label>
                                      <select id={`job-regularite-${i}-${j}`} value={job.regularite} onChange={e => updateJob(i, j, "regularite", e.target.value)}>
                                        <option value="">Select a frequency</option>
                                        <option value="Daily">Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                      </select>
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-horaire-${i}-${j}`}>Schedule</label>
                                      <input id={`job-horaire-${i}-${j}`} type="time" value={job.horaire} onChange={e => updateJob(i, j, "horaire", e.target.value)} />
                                    </div>
                                    <div className={styles.formField}>
                                      <label htmlFor={`job-retention-${i}-${j}`}>Retention</label>
                                      <select id={`job-retention-${i}-${j}`} value={job.retention} onChange={e => updateJob(i, j, "retention", e.target.value)}>
                                        <option value="">Select a retention</option>
                                        <option value="7 days">7 days</option>
                                        <option value="14 days">14 days</option>
                                        <option value="30 days">30 days</option>
                                        <option value="60 days">60 days</option>
                                        <option value="90 days">90 days</option>
                                        <option value="6 months">6 months</option>
                                      </select>
                                    </div>
                                  </div>
                                </>}


                            </motion.div>}
                        </motion.div>;
                  })}
                      </div>
                    </>}

                  {}
                  {instance.logiciel === "HyperBackup" && <div className={styles.formGrid} style={{
                gridTemplateColumns: '1fr 1fr'
              }}>
                      <div className={styles.formField}>
                        <label htmlFor={`hyperbackup-source-${i}`}>Source</label>
                        <select id={`hyperbackup-source-${i}`} value={instance.hyperbackupSource || ""} onChange={e => updateInstance(i, "hyperbackupSource", e.target.value)}>
                          <option value="">Select a source Synology NAS</option>
                          {form?.equipements?.NAS && form.equipements.NAS.filter(nas => nas.fabricant?.toLowerCase().includes('synology') || nas.nom?.toLowerCase().includes('synology')).map((nas, index) => <option key={index} value={`NAS-${nas.nom}`}>
                                {nas.nom} (NAS) - {nas.fabricant || ''} {nas.modele || ''}
                              </option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`hyperbackup-destination-${i}`}>Destination</label>
                        <select id={`hyperbackup-destination-${i}`} value={instance.hyperbackupDestination || ""} onChange={e => updateInstance(i, "hyperbackupDestination", e.target.value)}>
                          <option value="">Select a destination</option>
                          {}
                          {form?.equipements?.NAS && form.equipements.NAS.filter(nas => {
                      const sourceValue = instance.hyperbackupSource || "";
                      const nasValue = `NAS-${nas.nom}`;
                      return nasValue !== sourceValue && (nas.fabricant?.toLowerCase().includes('synology') || nas.nom?.toLowerCase().includes('synology'));
                    }).map((nas, index) => <option key={`nas-${index}`} value={`NAS-${nas.nom}`}>
                                {nas.nom} (NAS) - {nas.fabricant || ''} {nas.modele || ''}
                              </option>)}
                          {}
                          {form?.equipements?.NAS && form.equipements.NAS.filter(item => item.type === 'External hard drive').map((disque, index) => <option key={`disque-${index}`} value={`DISQUE-${disque.nom}${disque.numeroDisque ? `-${disque.numeroDisque}` : ''}`}>
                                {disque.nom} (External hard drive){disque.numeroDisque ? ` - N°${disque.numeroDisque}` : ''}
                              </option>)}
                        </select>
                      </div>
                    </div>}
                </motion.div>}
              </motion.div>;
        })}
          <div ref={bottomRef} />
        </div>
      </div>

      {}
      {showInstanceTypeModal && <div className={adminStyles.modalOverlay} onClick={() => setShowInstanceTypeModal(false)}>
          <div className={adminStyles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '800px',
        maxHeight: '90vh',
        padding: 0,
        overflowY: 'auto'
      }}>
            <div style={{
          padding: '1.5rem 1.75rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                  <Icon icon="material-symbols:backup" style={{
                width: '24px',
                height: '24px',
                color: '#13BA8E'
              }} />
                </div>
                <div>
                  <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#111827'
              }}>
                    Add a backup solution
                  </h3>
                  <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                    Select the backup solution type to configure
                  </p>
                </div>
              </div>
              <button className={adminStyles.closeButton} onClick={() => setShowInstanceTypeModal(false)} title="Close" style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#6b7280',
            transition: 'all 0.2s ease'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#111827';
          }} onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}>
                <Icon icon="mdi:close" width={20} height={20} />
              </button>
            </div>
            <div style={{
          padding: '1.5rem 1.75rem',
          background: '#f9fafb'
        }}>
              <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
                {[{
              type: "Veeam",
              label: "Veeam Backup & Replication",
              description: "Backup and replication solution for virtualized environments",
              icon: getIconPath('veeam.png'),
              features: ["VM backup", "Replication", "Job management"]
            }, {
              type: "HYCU Backup",
              label: "HYCU Backup",
              description: "Cloud-native backup solution for Nutanix and VMware",
              icon: getIconPath('hycu.png'),
              features: ["Cloud backup", "Datacenter PSI", "Job management"]
            }, {
              type: "HyperBackup",
              label: "Synology HyperBackup",
              description: "NAS-to-NAS or external hard drive replication solution",
              icon: getIconPath('hyperbackup.png'),
              features: ["Replication NAS", "External backup", "Simple setup"]
            }, {
              type: "Active Backup for Microsoft 365",
              label: "Active Backup for Microsoft 365",
              description: "Synology backup solution for Microsoft 365 (Exchange, OneDrive, SharePoint, Teams)",
              icon: getIconPath('active-backup.png'),
              features: ["Office 365 backup", "Exchange Online", "OneDrive", "SharePoint", "Teams"]
            }].map(({
              type,
              label,
              description,
              icon,
              iconType = undefined,
              features
            }) => <motion.button key={type} onClick={() => addInstance(type)} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.3
            }} style={{
              width: '100%',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.25rem',
              background: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }} onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(19, 186, 142, 0.05)';
              e.currentTarget.style.borderColor = '#13BA8E';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 186, 142, 0.15)';
            }} onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}>
                    <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                background: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                      {iconType === 'iconify' ? <Icon icon={icon} style={{
                  width: '48px',
                  height: '48px',
                  color: '#13BA8E'
                }} /> : <img src={icon} alt={label} style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: '8px'
                }} />}
                    </div>
                    <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                flex: 1
              }}>
                      <div>
                        <span style={{
                    fontWeight: 700,
                    color: '#111827',
                    fontSize: '1rem',
                    display: 'block',
                    marginBottom: '0.25rem'
                  }}>
                          {label}
                        </span>
                        <span style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    display: 'block'
                  }}>
                          {description}
                        </span>
                      </div>
                      <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                        {features.map((feature, idx) => <span key={idx} style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    fontWeight: 500
                  }}>
                            {feature}
                          </span>)}
                      </div>
                    </div>
                    <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#13BA8E',
                transition: 'transform 0.2s ease'
              }} onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateX(4px)';
              }} onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}>
                      <Icon icon="mdi:chevron-right" width={24} height={24} />
                    </div>
                  </motion.button>)}
              </div>
            </div>
          </div>
        </div>}

      {}
      {checkmkMappingModal.isOpen && checkmkMappingModal.instanceIndex !== null && checkmkMappingModal.jobIndex !== null && instances[checkmkMappingModal.instanceIndex] && instances[checkmkMappingModal.instanceIndex].jobs && instances[checkmkMappingModal.instanceIndex].jobs[checkmkMappingModal.jobIndex] && <CheckMKMappingModal isOpen={checkmkMappingModal.isOpen} onClose={() => setCheckmkMappingModal({
      isOpen: false,
      instanceIndex: null,
      jobIndex: null
    })} equipmentName={instances[checkmkMappingModal.instanceIndex].jobs[checkmkMappingModal.jobIndex].nom || `Job #${checkmkMappingModal.jobIndex + 1}`} equipmentType="Sauvegarde" equipmentIndex={`${checkmkMappingModal.instanceIndex}-${checkmkMappingModal.jobIndex}`} equipmentId={instances[checkmkMappingModal.instanceIndex].jobs[checkmkMappingModal.jobIndex].id} clientId={form.id} requireService={true} onMappingSaved={mapping => {
      const job = instances[checkmkMappingModal.instanceIndex].jobs[checkmkMappingModal.jobIndex];
      if (mapping) {
        setCheckmkMappings(prev => ({
          ...prev,
          [job.id]: mapping
        }));
      } else {
        setCheckmkMappings(prev => {
          const newMappings = {
            ...prev
          };
          delete newMappings[job.id];
          return newMappings;
        });
      }
    }} />}
    </motion.div>;
};
export default StepSauvegarde;
