import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaWifi } from "react-icons/fa";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import ImportEquipmentsModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/ImportEquipmentsModal";
import { GripVertical } from "lucide-react";
import { WIFI_AP_CATALOG } from "../constants/equipmentCatalog";
import BrandModelFields from "../constants/BrandModelFields";
const StepBorneWifi = ({
  form,
  setForm,
  onAdd,
  currentStepData,
  onImport,
  onRemoveAll
}) => {
  const bornes = form.equipements?.BorneWifi || [];
  const ssids = (form.ssids || []).map((ssid, index) => {
    if (typeof ssid === 'string') {
      return {
        id: `legacy-${index}-${ssid}`,
        nom: ssid
      };
    }
    if (!ssid.id) {
      return {
        ...ssid,
        id: `ssid-${Date.now()}-${index}`
      };
    }
    return ssid;
  });
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSSIDSection, setShowSSIDSection] = useState(false);
  React.useEffect(() => {
    if (form.ssids && form.ssids.length > 0) {
      const normalized = form.ssids.map((ssid, index) => {
        if (typeof ssid === 'string') {
          return {
            id: `legacy-${index}-${ssid}`,
            nom: ssid
          };
        }
        if (!ssid.id) {
          return {
            ...ssid,
            id: `ssid-${Date.now()}-${index}`
          };
        }
        return ssid;
      });
      const needsUpdate = normalized.some((ssid, i) => {
        const original = form.ssids[i];
        return typeof original === 'string' || !original.id;
      });
      if (needsUpdate) {
        setForm(prev => ({
          ...prev,
          ssids: normalized
        }));
      }
    }
  }, []);
  React.useEffect(() => {
    if (onImport && currentStepData?.key) {
      onImport[currentStepData.key] = setShowImportModal;
    }
  }, [onImport, currentStepData]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const toggleItemExpansion = index => {
    const next = new Set(expandedItems);
    if (next.has(index)) next.delete(index);else next.add(index);
    setExpandedItems(next);
  };
  const handleDragStart = (e, index) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) card.style.opacity = '0.5';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSite(null);
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };
  const handleDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverIndex(null);
  };
  const handleSiteDragOver = (e, siteName) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const draggedItem = bornes[draggedIndex];
    const currentSite = draggedItem.site || 'No site';
    const targetSiteNormalized = siteName === 'No site' ? 'No site' : siteName;
    if (currentSite === targetSiteNormalized) {
      e.dataTransfer.dropEffect = 'none';
      setDragOverSite(null);
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverSite(siteName);
    setDragOverIndex(null);
  };
  const handleSiteDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSite(null);
  };
  const handleSiteDrop = (e, targetSite) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const updated = [...bornes];
    const draggedItem = updated[draggedIndex];
    const newSite = targetSite === 'No site' ? '' : targetSite;
    const currentSite = draggedItem.site || 'No site';
    const targetSiteNormalized = targetSite === 'No site' ? 'No site' : targetSite;
    if (currentSite === targetSiteNormalized) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    draggedItem.site = newSite;
    const newExpanded = new Set(expandedItems);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updated
      }
    }));
    setExpandedItems(newExpanded);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverSite !== null) return;
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    const updated = [...bornes];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || 'No site';
    const dropSite = dropItem.site || 'No site';
    if (draggedSite !== dropSite) {
      draggedItem.site = dropSite === 'No site' ? '' : dropSite;
    }
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    const newExpanded = new Set();
    expandedItems.forEach(oldIndex => {
      if (oldIndex === draggedIndex) newExpanded.add(dropIndex);else if (oldIndex < draggedIndex && oldIndex >= dropIndex) newExpanded.add(oldIndex + 1);else if (oldIndex > draggedIndex && oldIndex <= dropIndex) newExpanded.add(oldIndex - 1);else newExpanded.add(oldIndex);
    });
    setExpandedItems(newExpanded);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updated
      }
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };
  const handleDragEnd = e => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) card.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setTimeout(() => setIsDragging(false), 100);
  };
  const clientSites = form.sites || [];
  const wifiSites = bornes.map(ap => ap.site).filter(site => site && site.trim() !== '').filter((site, idx, self) => self.indexOf(site) === idx);
  const allAvailableSites = [...new Set([...clientSites, ...wifiSites])].sort((a, b) => a.localeCompare(b));
  const groupedBySite = bornes.reduce((acc, ap, index) => {
    const site = ap.site || 'No site';
    if (!acc[site]) acc[site] = [];
    acc[site].push({
      ...ap,
      originalIndex: index
    });
    return acc;
  }, {});
  const allSitesWithGroups = {};
  allAvailableSites.forEach(site => {
    allSitesWithGroups[site] = groupedBySite[site] || [];
  });
  if (groupedBySite['No site']) allSitesWithGroups['No site'] = groupedBySite['No site'];
  const sortedSites = Object.keys(allSitesWithGroups).sort((a, b) => {
    if (a === 'No site') return -1;
    if (b === 'No site') return 1;
    return a.localeCompare(b);
  });
  const visibleSites = sortedSites.filter(site => !(site === "No site" && (allSitesWithGroups[site] || []).length === 0));
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true;
    return !bornes.some((borne, idx) => idx !== currentIndex && borne.nom?.trim() === name.trim());
  };
  const update = async (index, field, value) => {
    const updated = [...bornes];
    const oldValue = updated[index][field];
    updated[index][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updated
      }
    }));
  };
  const updateWifiBrand = (index, brand) => {
    const updated = [...bornes];
    updated[index] = {
      ...updated[index],
      fabricant: brand,
      modele: ""
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updated
      }
    }));
  };
  const cleanBorneData = borne => {
    const cleaned = {
      ...borne
    };
    if (!cleaned.controleur || cleaned.controleur.trim() === '') delete cleaned.controleur;
    if (!cleaned.emplacement || cleaned.emplacement.trim() === '') delete cleaned.emplacement;
    if (!cleaned.expirationGarantie || cleaned.expirationGarantie.trim() === '') delete cleaned.expirationGarantie;
    if (cleaned.supportsWifi6 === false || cleaned.supportsWifi6 === null) delete cleaned.supportsWifi6;
    if (cleaned.bandes) {
      const hasActiveBande = Object.values(cleaned.bandes).some(v => v === true);
      if (!hasActiveBande) delete cleaned.bandes;
    }
    if (Array.isArray(cleaned.ssids)) {
      cleaned.ssids = cleaned.ssids.filter(ssid => ssid && (typeof ssid === 'string' ? ssid.trim() !== '' : ssid.nom?.trim() !== ''));
    }
    return cleaned;
  };
  const addSSID = () => {
    const newSSID = {
      id: Date.now().toString(),
      nom: "",
      type: "prive",
      portailCaptif: null
    };
    setForm(prev => ({
      ...prev,
      ssids: [...(prev.ssids || []), newSSID]
    }));
  };
  const removeSSID = ssidId => {
    const updatedSSIDs = ssids.filter(ssid => ssid.id !== ssidId);
    setForm(prev => ({
      ...prev,
      ssids: updatedSSIDs
    }));
    const updatedBornes = bornes.map(borne => ({
      ...borne,
      ssids: (borne.ssids || []).filter(ssid => {
        if (typeof ssid === 'string') return ssid !== ssidId;
        return ssid.id !== ssidId;
      })
    }));
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updatedBornes
      }
    }));
  };
  const updateSSID = (ssidId, field, value) => {
    const updatedSSIDs = ssids.map(ssid => ssid.id === ssidId ? {
      ...ssid,
      [field]: value
    } : ssid);
    setForm(prev => ({
      ...prev,
      ssids: updatedSSIDs
    }));
  };
  const toggleSSIDOnBorne = (borneIndex, ssidId) => {
    const updated = [...bornes];
    if (!updated[borneIndex].ssids) {
      updated[borneIndex].ssids = [];
    }
    const ssidIndex = updated[borneIndex].ssids.findIndex(ssid => {
      if (typeof ssid === 'string') return ssid === ssidId;
      return ssid.id === ssidId;
    });
    if (ssidIndex >= 0) {
      updated[borneIndex].ssids.splice(ssidIndex, 1);
    } else {
      updated[borneIndex].ssids.push(ssidId);
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updated
      }
    }));
  };
  const isSSIDAssignedToBorne = (borneIndex, ssidId) => {
    const borne = bornes[borneIndex];
    if (!borne || !borne.ssids) return false;
    return borne.ssids.some(ssid => {
      if (typeof ssid === 'string') return ssid === ssidId;
      return ssid.id === ssidId;
    });
  };
  const remove = index => {
    const updated = [...bornes];
    updated.splice(index, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: updated
      }
    }));
  };
  const removeAll = () => {
    if (!bornes.length) return;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: []
      }
    }));
  };
  React.useEffect(() => {
    if (onRemoveAll && currentStepData?.key) {
      onRemoveAll[currentStepData.key] = removeAll;
    }
  }, [onRemoveAll, currentStepData, removeAll]);
  const add = () => {
    const newItem = {
      id: `wifi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nom: "",
      fabricant: "",
      modele: "",
      ip: "",
      vlan: "",
      firmware: "",
      adresseMac: "",
      numeroSerie: "",
      ssids: [],
      site: ""
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        BorneWifi: [...bornes, newItem]
      }
    }));
  };
  React.useEffect(() => {
    if (onAdd && currentStepData?.key) {
      onAdd[currentStepData.key] = add;
    }
  }, [onAdd, currentStepData, add]);
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
      {}
      <div style={{
      marginBottom: '1.5rem',
      padding: '0.75rem',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    }}>
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
          <div onClick={() => setShowSSIDSection(!showSSIDSection)} style={{
          flex: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'opacity 0.2s ease'
        }} onMouseEnter={e => {
          e.currentTarget.style.opacity = '0.7';
        }} onMouseLeave={e => {
          e.currentTarget.style.opacity = '1';
        }}>
            <h3 style={{
            margin: 0,
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#1a1a1a'
          }}>Available SSIDs</h3>
            <Icon icon={showSSIDSection ? "mdi:chevron-up" : "mdi:chevron-down"} style={{
            fontSize: '18px',
            color: '#6b7280'
          }} />
          </div>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
            <button type="button" onClick={e => {
            e.stopPropagation();
            addSSID();
          }} title="Add an SSID" style={{
            background: 'transparent',
            color: '#6b7280',
            border: '1px dashed #e5e7eb',
            borderRadius: '8px',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '32px',
            height: '32px'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = '#f0fdfa';
            e.currentTarget.style.borderColor = '#15d1a0';
            e.currentTarget.style.color = '#15d1a0';
          }} onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.color = '#6b7280';
          }}>
              <Icon icon="mdi:plus" style={{
              fontSize: '18px'
            }} />
            </button>
          </div>
        </div>
        {showSSIDSection && <div>
            {ssids.length > 0 ? <div style={{
          overflowX: 'auto',
          marginBottom: '0.75rem'
        }}>
                <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0
          }}>
                  <thead>
                    <tr style={{
                background: '#f9fafb'
              }}>
                      <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                        SSID name
                      </th>
                      <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                        VLAN
                      </th>
                      <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                        Type
                      </th>
                      <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                        Captive portal
                      </th>
                      <th style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  borderBottom: '2px solid #e5e7eb',
                  width: '60px'
                }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ssids.map(ssid => <tr key={ssid.id} style={{
                background: '#ffffff',
                borderBottom: '1px solid #e5e7eb',
                transition: 'background 0.2s ease'
              }} onMouseEnter={e => {
                e.currentTarget.style.background = '#f9fafb';
              }} onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff';
              }}>
                        <td style={{
                  padding: '0.75rem'
                }}>
                          <input type="text" value={ssid.nom || ''} onChange={e => updateSSID(ssid.id, 'nom', e.target.value)} placeholder="SSID name" style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    transition: 'border-color 0.2s ease'
                  }} onFocus={e => {
                    e.target.style.borderColor = '#15d1a0';
                    e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                  }} onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }} />
                        </td>
                        <td style={{
                  padding: '0.75rem'
                }}>
                          <input type="text" value={ssid.vlan || ''} onChange={e => updateSSID(ssid.id, 'vlan', e.target.value)} placeholder="Ex: 10, 20, 30" style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    transition: 'border-color 0.2s ease'
                  }} onFocus={e => {
                    e.target.style.borderColor = '#15d1a0';
                    e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                  }} onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }} />
                        </td>
                        <td style={{
                  padding: '0.75rem'
                }}>
                          <select value={ssid.type || 'prive'} onChange={e => {
                    const newType = e.target.value;
                    updateSSID(ssid.id, 'type', newType);
                    if (newType === 'prive') {
                      updateSSID(ssid.id, 'portailCaptif', false);
                    }
                  }} style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    transition: 'border-color 0.2s ease',
                    cursor: 'pointer'
                  }} onFocus={e => {
                    e.target.style.borderColor = '#15d1a0';
                    e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
                  }} onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}>
                            <option value="prive">Private</option>
                            <option value="public">Public</option>
                          </select>
                        </td>
                        <td style={{
                  padding: '0.75rem'
                }}>
                          <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: (ssid.type || 'prive') === 'public' ? 'pointer' : 'not-allowed',
                    opacity: (ssid.type || 'prive') === 'public' ? 1 : 0.6
                  }}>
                            <input type="checkbox" checked={ssid.portailCaptif === true} onChange={e => updateSSID(ssid.id, 'portailCaptif', e.target.checked)} disabled={(ssid.type || 'prive') !== 'public'} style={{
                      width: '18px',
                      height: '18px',
                      cursor: (ssid.type || 'prive') === 'public' ? 'pointer' : 'not-allowed',
                      accentColor: '#15d1a0',
                      margin: 0
                    }} />
                            <span style={{
                      fontSize: '0.875rem',
                      color: '#1a1a1a',
                      userSelect: 'none'
                    }}>
                              {ssid.portailCaptif === true ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </td>
                        <td style={{
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                          <button type="button" onClick={() => removeSSID(ssid.id)} title="Delete this SSID" style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s ease',
                    width: '32px',
                    height: '32px',
                    margin: '0 auto'
                  }} onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <Icon icon="mdi:delete" width={14} height={14} />
                          </button>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div> : <p style={{
          marginBottom: '0.75rem',
          color: '#6b7280',
          fontSize: '0.875rem'
        }}>No SSID created</p>}
          </div>}
      </div>

      <div className={styles.formSection}>
        <div className={styles.scrollable}>
          {visibleSites.length === 0 ? <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No WiFi AP configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add a WiFi AP" to get started
              </p>
            </div> : visibleSites.map(siteName => {
          const siteAps = allSitesWithGroups[siteName] || [];
          return <div key={siteName} className={styles.siteGroup}>
                  <div className={`${styles.siteHeader} ${dragOverSite === siteName ? styles.siteDragOver : ''}`} onDragOver={e => handleSiteDragOver(e, siteName)} onDragLeave={handleSiteDragLeave} onDrop={e => handleSiteDrop(e, siteName)}>
                    <h3 className={styles.siteTitle}>{siteName}</h3>
                    <span className={styles.siteCount}>{siteAps.length} borne{siteAps.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className={styles.siteConnections} onDragOver={e => {
              if (e.target.closest(`.${styles.serverCard}`)) return;
              e.preventDefault();
              e.stopPropagation();
              if (draggedIndex !== null) {
                const draggedItem = bornes[draggedIndex];
                const currentSite = draggedItem.site || 'No site';
                const targetSiteNormalized = siteName === 'No site' ? 'No site' : siteName;
                if (currentSite === targetSiteNormalized) {
                  e.dataTransfer.dropEffect = 'none';
                  setDragOverSite(null);
                  return;
                }
              }
              e.dataTransfer.dropEffect = 'move';
              setDragOverSite(siteName);
              setDragOverIndex(null);
            }} onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSite(null);
            }} onDrop={e => {
              if (e.target.closest(`.${styles.serverCard}`)) return;
              e.preventDefault();
              e.stopPropagation();
              if (draggedIndex !== null) handleSiteDrop(e, siteName);
            }}>
                    {siteAps.length === 0 && <div className={styles.emptySiteMessage}>No WiFi AP on this site. Drag and drop an AP here to assign it.</div>}
                    {siteAps.map((ap, siteIndex) => {
                const i = ap.originalIndex;
                return <motion.div key={i} draggable onDragStart={e => {
                  e.stopPropagation();
                  handleDragStart(e, i);
                }} onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverSite(null);
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverIndex(i);
                }} onDragLeave={handleDragLeave} onDrop={e => {
                  e.stopPropagation();
                  handleDrop(e, i);
                }} onDragEnd={e => {
                  e.stopPropagation();
                  handleDragEnd(e);
                }} className={`${styles.serverCard} ${draggedIndex === i ? styles.dragging : ''} ${dragOverIndex === i ? styles.dragOver : ''}`} initial={{
                  opacity: 0,
                  scale: 0.98
                }} animate={{
                  opacity: 1,
                  scale: 1
                }} transition={{
                  duration: 0.3
                }} style={{
                  cursor: 'grab',
                  background: '#ffffff',
                  border: `2px solid ${dragOverIndex === i ? '#15d1a0' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: draggedIndex === i ? '0 8px 20px rgba(0,0,0,0.04)' : 'none'
                }}>
                          <div className={`${styles.serverHeader} ${expandedItems.has(i) ? styles.serverHeaderExpanded : ''}`} onClick={e => {
                    if (!isDragging) toggleItemExpansion(i);
                  }} style={{
                    cursor: 'pointer',
                    background: expandedItems.has(i) ? '#f9fafb' : 'transparent',
                    padding: expandedItems.has(i) ? '0.75rem 1rem' : 0,
                    margin: expandedItems.has(i) ? '-0.75rem -1rem' : 0,
                    borderRadius: '8px',
                    transition: 'background 0.2s ease'
                  }}>
                            <div className={styles.dragHandle} title="Drag to reorder" onClick={e => {
                      e.stopPropagation();
                    }} onMouseDown={e => {
                      e.stopPropagation();
                    }} style={{
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
                            <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                              <FaWifi size={18} color="#1a1a1a" style={{
                        position: 'relative',
                        top: '-1px'
                      }} />
                              <div style={{
                        flex: 1
                      }}>
                                <div style={{
                          fontWeight: '600',
                          color: '#1a1a1a',
                          fontSize: '0.95rem',
                          marginBottom: '0.25rem'
                        }}>
                                  {ap.nom || `Borne WiFi #${i + 1}`}
                                </div>
                                <div style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                                  {[ap.modele || 'Model?', ap.ip].filter(Boolean).map((item, idx) => <span key={idx}>{item}</span>)}
                                </div>
                              </div>
                            </div>
                            <div className={styles.serverActions}>
                              <button onClick={e => {
                        e.stopPropagation();
                        remove(i);
                      }} title="Delete this WiFi AP" style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s ease'
                      }} onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <Icon icon="mdi:delete" width={14} height={14} />
                              </button>
                            </div>
                          </div>

                          {expandedItems.has(i) && <motion.div className={styles.serverForm} style={{
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
                              {}
                              <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr 1fr'
                    }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-nom-${i}`}>NetBIOS</label>
                                  <input id={`ap-nom-${i}`} value={ap.nom} onChange={e => update(i, "nom", e.target.value)} style={{
                          borderColor: !isNameUnique(ap.nom, i) ? '#ef4444' : undefined,
                          borderWidth: !isNameUnique(ap.nom, i) ? '2px' : '1px',
                          fontSize: !isNameUnique(ap.nom, i) ? '1rem' : '0.9rem',
                          fontWeight: !isNameUnique(ap.nom, i) ? 'bold' : 'normal'
                        }} />
                                  {!isNameUnique(ap.nom, i) && <div style={{
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          marginTop: '0.25rem'
                        }}>
                                      ⚠️ This name already exists!
                                    </div>}
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-ip-${i}`}>IP address</label>
                                  <input id={`ap-ip-${i}`} value={ap.ip} onChange={e => update(i, "ip", e.target.value)} />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-vlan-${i}`}>VLAN</label>
                                  <input id={`ap-vlan-${i}`} value={ap.vlan || ""} onChange={e => update(i, "vlan", e.target.value)} />
                                </div>
                              </div>

                              {}
                              <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr 1fr'
                    }}>
                                <BrandModelFields catalog={WIFI_AP_CATALOG} manufacturer={ap.fabricant} model={ap.modele} manufacturerId={`ap-fabricant-${i}`} modelId={`ap-modele-${i}`} fieldClassName={styles.formField} onManufacturerChange={value => updateWifiBrand(i, value)} onModelChange={value => update(i, "modele", value)} />
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-serie-${i}`}>Serial number</label>
                                  <input id={`ap-serie-${i}`} value={ap.numeroSerie || ""} onChange={e => update(i, "numeroSerie", e.target.value)} />
                                </div>
                              </div>

                              {}
                              <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-mac-${i}`}>MAC address</label>
                                  <input id={`ap-mac-${i}`} value={ap.adresseMac || ""} onChange={e => update(i, "adresseMac", e.target.value)} />
                                </div>
                                <div className={styles.formField}>
                                  <label htmlFor={`ap-firmware-${i}`}>Firmware version</label>
                                  <input id={`ap-firmware-${i}`} value={ap.firmware} onChange={e => update(i, "firmware", e.target.value)} />
                                </div>
                              </div>

                              {}
                              {ssids.length > 0 && <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                                  <label style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#1a1a1a',
                        marginBottom: '0.75rem',
                        display: 'block'
                      }}>
                                    SSIDs broadcast by this AP
                                  </label>
                                  <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.5rem'
                      }}>
                                    {ssids.map(ssid => {
                          const ssidName = ssid.nom?.trim() || 'Unnamed SSID';
                          const isAssigned = isSSIDAssignedToBorne(i, ssid.id);
                          return <label key={ssid.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: isAssigned ? '#f0fdfa' : '#ffffff',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: `1px solid ${isAssigned ? '#15d1a0' : '#e5e7eb'}`,
                            transition: 'all 0.2s ease'
                          }} onMouseEnter={e => {
                            if (!isAssigned) {
                              e.currentTarget.style.borderColor = '#15d1a0';
                              e.currentTarget.style.background = '#f9fafb';
                            }
                          }} onMouseLeave={e => {
                            if (!isAssigned) {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.background = '#ffffff';
                            }
                          }}>
                                          <input type="checkbox" checked={isAssigned} onChange={() => toggleSSIDOnBorne(i, ssid.id)} style={{
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
                                            {ssidName}
                                          </span>
                                        </label>;
                        })}
                                  </div>
                                  {ssids.length === 0 && <div style={{
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        padding: '0.5rem'
                      }}>
                                      Create SSIDs in the section above first
                                    </div>}
                                </div>}
                            </motion.div>}
                        </motion.div>;
              })}
                </div>
              </div>;
        })}
                <div ref={bottomRef} />
        </div>
              </div>

              <ImportEquipmentsModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} equipmentType="wifi" onImport={importedDevices => {
      setForm(prev => ({
        ...prev,
        equipements: {
          ...prev.equipements,
          BorneWifi: [...bornes, ...importedDevices]
        }
      }));
    }} />

            </motion.div>;
};
export default StepBorneWifi;
