import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import equipmentModalStyles from "./EquipmentStepsModal.module.css";
import { STORAGE_CATALOG } from "../constants/equipmentCatalog";
import BrandModelFields from "../constants/BrandModelFields";
import { isSynologyBrand } from "../synologyEquipmentUtils";
import StorageDiskBayPicker from "../StorageDiskBayPicker";
import CapacityInput from "../CapacityInput";
const StepStorage = ({
  form,
  setForm,
  showTypeModal,
  setShowTypeModal: setShowTypeModalProp
}) => {
  const [localShowTypeModal, setLocalShowTypeModal] = useState(false);
  const showTypeModalState = showTypeModal !== undefined ? showTypeModal : localShowTypeModal;
  const setShowTypeModalState = setShowTypeModalProp || setLocalShowTypeModal;
  const NAS = form.equipements.NAS || [];
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const roleOptions = ["Storage de sauvegarde", "Storage de fichiers communs", "Storage principal", "Storage d'archivage", "Storage de réplication", "Autre"];
  const raidOptions = ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "RAID 10", "RAID 50", "RAID 60", "SHR (Synology)", "SHR-2 (Synology)", "Qtier (QNAP)", "RAID-TP (QNAP)", "RAID-Z (ZFS)", "RAID-Z2 (ZFS)", "RAID-Z3 (ZFS)", "Autre"];
  const capaciteOptions = ["1 TB", "2 TB", "4 TB", "6 TB", "8 TB", "10 TB", "12 TB", "16 TB", "20 TB", "24 TB", "32 TB", "40 TB", "48 TB", "64 TB", "80 TB", "100 TB", "Autre"];
  const disqueOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50"];
  const toggleItemExpansion = index => {
    if (!isDragging) {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedItems(newExpanded);
    }
  };
  const handleDragStart = (e, index) => {
    const target = e.target;
    const isFormElement = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('input, select, textarea, button');
    if (isFormElement) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    setDraggedIndex(index);
    setDragOverSite(null);
    setDragOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.5";
    }
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverSite(null);
    setDragOverIndex(index);
  };
  const handleDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };
  const handleSiteDragOver = (e, siteName) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null) {
      const draggedItem = NAS[draggedIndex];
      const currentSite = draggedItem.site || "No site";
      const targetSiteNormalized = siteName === "No site" ? "No site" : siteName;
      if (currentSite === targetSiteNormalized) {
        e.dataTransfer.dropEffect = "none";
        setDragOverSite(null);
        return;
      }
    }
    e.dataTransfer.dropEffect = "move";
    setDragOverSite(siteName);
    setDragOverIndex(null);
  };
  const handleSiteDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSite(null);
    }
  };
  const handleSiteDrop = (e, targetSite) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const updated = [...NAS];
    const draggedItem = updated[draggedIndex];
    const newSite = targetSite === "No site" ? "" : targetSite;
    const currentSite = draggedItem.site || "No site";
    const targetSiteNormalized = targetSite === "No site" ? "No site" : targetSite;
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
        NAS: updated
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
    if (dragOverSite !== null) {
      return;
    }
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragOverSite(null);
      setIsDragging(false);
      return;
    }
    const updated = [...NAS];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || "No site";
    const dropSite = dropItem.site || "No site";
    if (draggedSite !== dropSite) {
      draggedItem.site = dropSite === "No site" ? "" : dropSite;
    }
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    const newExpanded = new Set();
    expandedItems.forEach(oldIndex => {
      if (oldIndex === draggedIndex) {
        newExpanded.add(dropIndex);
      } else if (oldIndex < draggedIndex && oldIndex >= dropIndex) {
        newExpanded.add(oldIndex + 1);
      } else if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
        newExpanded.add(oldIndex - 1);
      } else {
        newExpanded.add(oldIndex);
      }
    });
    setExpandedItems(newExpanded);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };
  const handleDragEnd = e => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };
  const clientSites = form.sites || [];
  const equipmentSites = NAS.map(nas => nas.site).filter(site => site && site.trim() !== "").filter((site, index, self) => self.indexOf(site) === index);
  const allAvailableSites = [...new Set([...clientSites, ...equipmentSites])].sort((a, b) => a.localeCompare(b));
  const groupedBySite = NAS.reduce((acc, nas, index) => {
    const site = nas.site || "No site";
    if (!acc[site]) {
      acc[site] = [];
    }
    acc[site].push({
      ...nas,
      originalIndex: index
    });
    return acc;
  }, {});
  let sortedSites = ["No site", ...allAvailableSites].filter((site, index, self) => self.indexOf(site) === index).sort((a, b) => {
    if (a === "No site") return -1;
    if (b === "No site") return 1;
    return a.localeCompare(b);
  });
  sortedSites.forEach(site => {
    if (!groupedBySite[site]) groupedBySite[site] = [];
  });
  if ((groupedBySite["No site"] || []).length === 0) {
    sortedSites = sortedSites.filter(site => site !== "No site");
  }
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true;
    return !NAS.some((nas, idx) => idx !== currentIndex && nas.nom?.trim() === name.trim());
  };
  const update = async (index, field, value) => {
    const updated = [...NAS];
    if (field === "capacite" || field === "nbDisquesActuels" || field === "nbDisquesMax") {
      const numericValue = value.replace(/[^0-9]/g, '');
      updated[index][field] = numericValue;
    } else if (field === "diskBays") {
      updated[index] = {
        ...updated[index],
        nbDisquesActuels: value.nbDisquesActuels,
        nbDisquesMax: value.nbDisquesMax,
        disques: value.disques,
        capacite: value.capacite
      };
    } else {
      updated[index][field] = value;
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const updateStorageBrand = (index, brand) => {
    const updated = [...NAS];
    updated[index] = {
      ...updated[index],
      fabricant: brand,
      modele: "",
      ...(!isSynologyBrand(brand) ? {
        quickConnect: ""
      } : {})
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const remove = index => {
    const updated = [...NAS];
    updated.splice(index, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const add = type => {
    const newNAS = {
      id: `nas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nom: "",
      role: "",
      nbDisquesActuels: "",
      nbDisquesMax: "",
      disques: [],
      raid: "",
      type: type,
      capacite: "",
      fabricant: "",
      modele: "",
      ip: "",
      numeroSerie: "",
      expirationGarantie: "",
      numeroDisque: "",
      cassettesRDX: [],
      luns: []
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: [...NAS, newNAS]
      }
    }));
    setShowTypeModalState(false);
    setTimeout(() => {
      setExpandedItems(new Set([...expandedItems, NAS.length]));
    }, 100);
  };
  const getStorageIconName = type => {
    const t = (type || "").toLowerCase();
    if (t.includes("san")) return "mdi:server-network-outline";
    if (t.includes("robot")) return "mdi:vhs";
    if (t.includes("disque")) return "mdi:harddisk";
    return "mdi:nas";
  };
  const addCassetteRDX = index => {
    const updated = [...NAS];
    if (!updated[index].cassettesRDX) {
      updated[index].cassettesRDX = [];
    }
    updated[index].cassettesRDX.push({
      numero: "",
      capacite: ""
    });
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const removeCassetteRDX = (index, cassetteIndex) => {
    const updated = [...NAS];
    updated[index].cassettesRDX.splice(cassetteIndex, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const updateCassetteRDX = (index, cassetteIndex, field, value) => {
    const updated = [...NAS];
    updated[index].cassettesRDX[cassetteIndex][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const addLUN = index => {
    const updated = [...NAS];
    if (!updated[index].luns) updated[index].luns = [];
    updated[index].luns.push({
      nom: "",
      iqn: "",
      capacite: "",
      role: "stockage"
    });
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const updateLUN = (index, lunIndex, field, value) => {
    const updated = [...NAS];
    if (!updated[index].luns) updated[index].luns = [];
    updated[index].luns[lunIndex] = {
      ...updated[index].luns[lunIndex],
      [field]: value
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
  const removeLUN = (index, lunIndex) => {
    const updated = [...NAS];
    if (!updated[index].luns) return;
    updated[index].luns.splice(lunIndex, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NAS: updated
      }
    }));
  };
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
          {sortedSites.length === 0 ? <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No site or storage equipment</p>
              <p className={styles.emptyStateDescription}>
                Add a site or equipment to get started.
              </p>
            </div> : sortedSites.map(siteName => {
          const siteEquipments = groupedBySite[siteName] || [];
          return <div key={siteName} className={styles.siteGroup} style={{
            marginBottom: '0.5rem'
          }}>
                  <div style={{
              background: '#ffffff',
              border: `1px solid ${dragOverSite === siteName ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '0.75rem',
              transition: 'all 0.2s ease'
            }} onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
              handleSiteDragOver(e, siteName);
            }} onDragLeave={handleSiteDragLeave} onDrop={e => handleSiteDrop(e, siteName)}>
                    <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                      <h3 style={{
                  margin: 0,
                  color: '#1a1a1a',
                  fontSize: '0.95rem',
                  fontWeight: '700'
                }}>
                        {siteName}
                      </h3>
                      <span style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                        {siteEquipments.length} item{siteEquipments.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
                    {siteEquipments.length === 0 && <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#f9fafb',
                border: '2px dashed #d1d5db',
                borderRadius: '10px',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                        Drag and drop equipment here.
                      </div>}
                    {siteEquipments.map((equipment, siteIndex) => {
                const i = equipment.originalIndex;
                return <motion.div key={i} draggable onDragStart={e => {
                  e.stopPropagation();
                  handleDragStart(e, i);
                }} onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverSite(null);
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIndex(i);
                }} onDragLeave={handleDragLeave} onDrop={e => {
                  e.stopPropagation();
                  handleDrop(e, i);
                }} onDragEnd={e => {
                  e.stopPropagation();
                  handleDragEnd(e);
                }} initial={{
                  opacity: 0,
                  scale: 0.98
                }} animate={{
                  opacity: 1,
                  scale: 1
                }} transition={{
                  duration: 0.3
                }} style={{
                  background: '#ffffff',
                  border: `2px solid ${dragOverIndex === i ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: draggedIndex === i ? 0.5 : 1,
                  marginBottom: '0.75rem'
                }}>
              <div onClick={e => {
                    if (!isDragging) {
                      toggleItemExpansion(i);
                    }
                  }} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    background: expandedItems.has(i) ? '#f9fafb' : 'transparent',
                    transition: 'background 0.2s ease'
                  }}>
                <div style={{
                      color: '#9ca3af',
                      cursor: 'grab'
                    }}>
                  <GripVertical size={18} />
                </div>
                <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                  <Icon icon={getStorageIconName(equipment.type)} width={24} height={24} color="#1a1a1a" />
                  <div style={{
                        flex: 1
                      }}>
                    <div style={{
                          fontWeight: '600',
                          color: '#1a1a1a',
                          fontSize: '0.95rem',
                          marginBottom: '0.25rem'
                        }}>
                      {equipment.nom || `Equipment ${i + 1}`}
                    </div>
                    <div style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                      {(equipment.type === 'Disque dur externe' ? [equipment.capacite && `${equipment.capacite} GB`, equipment.numeroDisque && `N° ${equipment.numeroDisque}`].filter(Boolean) : equipment.type === 'Robot de sauvegarde' ? [equipment.modele, equipment.numeroSerie, equipment.capacite && `${equipment.capacite} GB`, equipment.ip, equipment.cassettesRDX && equipment.cassettesRDX.length > 0 && `${equipment.cassettesRDX.length} cassette${equipment.cassettesRDX.length > 1 ? 's' : ''}`].filter(Boolean) : [equipment.modele, equipment.numeroSerie, equipment.capacite && `${equipment.capacite} GB`, equipment.ip].filter(Boolean)).map((item, idx) => <span key={idx}>{item}</span>)}
                    </div>
                  </div>
                </div>
                <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                  
                  <button onClick={e => {
                        e.stopPropagation();
                        remove(i);
                      }} title="Delete this equipment" style={{
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
                    <Icon icon="mdi:delete" width={20} height={20} />
                  </button>
                </div>
              </div>

              {}
              {expandedItems.has(i) && <div style={{
                    padding: '1rem',
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                  {}
                  <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                    <div className={styles.formField}>
                      <label htmlFor={`nas-nom-${i}`}>
                        {equipment.type === 'Disque dur externe' ? 'Device name' : 'NetBIOS'} <span style={{
                            color: 'red'
                          }}>*</span>
                      </label>
                      <input id={`nas-nom-${i}`} value={equipment.nom} onChange={e => update(i, "nom", e.target.value)} required style={{
                          borderColor: !isNameUnique(equipment.nom, i) ? '#ef4444' : !equipment.nom || !equipment.nom.trim() ? 'red' : undefined,
                          borderWidth: !isNameUnique(equipment.nom, i) ? '2px' : '1px',
                          fontSize: !isNameUnique(equipment.nom, i) ? '1rem' : '0.9rem',
                          fontWeight: !isNameUnique(equipment.nom, i) ? 'bold' : 'normal'
                        }} />
                      {!isNameUnique(equipment.nom, i) && <div style={{
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          marginTop: '0.25rem'
                        }}>
                          ⚠️ This name already exists!
                        </div>}
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`nas-role-${i}`}>Role <span style={{
                            color: 'red'
                          }}>*</span></label>
                      <select id={`nas-role-${i}`} value={equipment.role} onChange={e => update(i, "role", e.target.value)} required style={{
                          borderColor: !equipment.role || typeof equipment.role === 'string' && !equipment.role.trim() ? 'red' : undefined
                        }}>
                        <option value="">Select a role</option>
                        {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>
                  </div>

                  {}
                  {equipment.type !== 'Disque dur externe' && <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr 1fr 1fr'
                    }}>
                      <BrandModelFields catalog={STORAGE_CATALOG} manufacturer={equipment.fabricant} model={equipment.modele} manufacturerId={`nas-fabricant-${i}`} modelId={`nas-modele-${i}`} fieldClassName={styles.formField} onManufacturerChange={value => updateStorageBrand(i, value)} onModelChange={value => update(i, "modele", value)} />
                      <div className={styles.formField}>
                        <label htmlFor={`nas-serie-${i}`}>Serial number</label>
                        <input id={`nas-serie-${i}`} value={equipment.numeroSerie} onChange={e => update(i, "numeroSerie", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-garantie-${i}`}>Warranty (end date)</label>
                        <input id={`nas-garantie-${i}`} type="date" value={equipment.expirationGarantie} onChange={e => update(i, "expirationGarantie", e.target.value)} />
                      </div>
                    </div>}

                  {equipment.type !== 'Disque dur externe' && isSynologyBrand(equipment.fabricant) && <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr'
                    }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-quickconnect-${i}`}>QuickConnect</label>
                        <input id={`nas-quickconnect-${i}`} value={equipment.quickConnect || ""} onChange={e => update(i, "quickConnect", e.target.value)} placeholder="monnas.quickconnect.to" />
                      </div>
                    </div>}

                  {}
                  {equipment.type !== 'Disque dur externe' && <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-ip-${i}`}>IP address</label>
                        <input id={`nas-ip-${i}`} value={equipment.ip} onChange={e => update(i, "ip", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-vlan-${i}`}>VLAN</label>
                        <input id={`nas-vlan-${i}`} value={equipment.vlan || ""} onChange={e => update(i, "vlan", e.target.value)} />
                      </div>
                    </div>}

                  {}
                  {equipment.type !== 'Robot de sauvegarde' && equipment.type !== 'Disque dur externe' && <div style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      <StorageDiskBayPicker idPrefix={`nas-disk-bay-${i}`} nbDisquesActuels={equipment.nbDisquesActuels} nbDisquesMax={equipment.nbDisquesMax} disques={equipment.disques} capacite={equipment.capacite} onChange={value => update(i, "diskBays", value)} />
                      <div className={styles.formGrid} style={{
                        gridTemplateColumns: '1fr 1fr'
                      }}>
                        <div className={styles.formField}>
                          <CapacityInput id={`nas-capacite-${i}`} label="Total capacity" value={equipment.capacite} onChange={value => update(i, "capacite", value)} placeholder="16000" />
                        </div>
                        <div className={styles.formField}>
                          <label htmlFor={`nas-capacite-utilisee-${i}`}>Used space (GB)</label>
                          <input id={`nas-capacite-utilisee-${i}`} type="text" inputMode="numeric" pattern="[0-9]*" value={equipment.capaciteUtilisee || ""} onChange={e => update(i, "capaciteUtilisee", e.target.value)} onKeyPress={e => {
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }} />
                        </div>
                      </div>
                    </div>}

                  {}
                  {equipment.type !== 'Robot de sauvegarde' && equipment.type !== 'Disque dur externe' && <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-raid-${i}`}>RAID configuration</label>
                        <select id={`nas-raid-${i}`} value={equipment.raid} onChange={e => update(i, "raid", e.target.value)}>
                          <option value="">Select a configuration</option>
                          {raidOptions.map(raid => <option key={raid} value={raid}>{raid}</option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-etat-disques-${i}`}>Disk health status</label>
                        <input id={`nas-etat-disques-${i}`} placeholder="OK / Degraded / Failed (or detail by disk)" value={equipment.etatDisques || ""} onChange={e => update(i, "etatDisques", e.target.value)} />
                      </div>
                    </div>}

                  {}
                  {(equipment.type === 'NAS' || equipment.type === 'SAN') && <div className={styles.formField} style={{
                      gridColumn: '1 / -1'
                    }}>
                      <label>LUNs</label>
                      {(equipment.luns || []).length === 0 && <p className={styles.noLicenses} style={{
                        margin: '0.5rem 0'
                      }}>No LUN configured</p>}
                      {(equipment.luns || []).map((lun, lunIndex) => <div key={lunIndex} className={styles.licenceItem} style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'stretch',
                        padding: '8px 12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 6,
                        marginBottom: 8
                      }}>
                          <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1.6,
                          gap: 4
                        }}>
                            <label style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                          }}>Name</label>
                            <input value={lun.iqn || ""} onChange={e => updateLUN(i, lunIndex, "iqn", e.target.value)} placeholder="" />
                          </div>
                          <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          gap: 4
                        }}>
                            <label style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                          }}>Capacity (GB)</label>
                            <input value={lun.capacite || ""} onChange={e => updateLUN(i, lunIndex, "capacite", e.target.value)} placeholder="" inputMode="numeric" />
                          </div>
                          <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          minWidth: 160,
                          gap: 4
                        }}>
                            <label style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                          }}>Role</label>
                            <select value={lun.role || "stockage"} onChange={e => updateLUN(i, lunIndex, "role", e.target.value)}>
                              <option value="stockage">Storage</option>
                              <option value="exploitation">Operations</option>
                            </select>
                          </div>
                          <button type="button" onClick={() => removeLUN(i, lunIndex)} className={styles.deleteButton} title="Delete this LUN" style={{
                          minWidth: 32,
                          alignSelf: 'center'
                        }}>
                          <Icon icon="mdi:delete" width={20} height={20} />
                          </button>
                        </div>)}
                      <button type="button" onClick={() => addLUN(i)} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        background: 'transparent',
                        border: '1px dashed #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#6b7280',
                        transition: 'all 0.2s ease',
                        fontSize: '1.25rem',
                        fontWeight: '600'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#15d1a0';
                        e.currentTarget.style.color = '#15d1a0';
                        e.currentTarget.style.background = '#f0fdfa';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.color = '#6b7280';
                        e.currentTarget.style.background = 'transparent';
                      }} title="Add a LUN">
                        <Icon icon="mdi:plus" width={20} height={20} />
                      </button>
                    </div>}

                  {equipment.type === 'Robot de sauvegarde' && <div className={styles.formGrid}>
                      <div className={styles.formField} style={{
                        gridColumn: '1 / -1'
                      }}>
                        <label>RDX cassette set</label>
                        <div>
                          {(equipment.cassettesRDX || []).length === 0 && <p className={styles.noLicenses} style={{
                            margin: '0.5rem 0'
                          }}>No cassette configured</p>}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: 10
                          }}>
                            {(equipment.cassettesRDX || []).map((cassette, cassetteIndex) => <div key={cassetteIndex} className={styles.licenceItem} style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "stretch",
                              padding: "8px 12px",
                              background: "var(--bg-tertiary)",
                              borderRadius: 6
                            }}>
                                <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                gap: 4
                              }}>
                                  <label style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)'
                                }}>Cassette number</label>
                                  <input value={cassette.numero || ""} onChange={e => updateCassetteRDX(i, cassetteIndex, "numero", e.target.value)} />
                                </div>
                                <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                gap: 4
                              }}>
                                  <label style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)'
                                }}>Capacity (GB)</label>
                                  <input value={cassette.capacite || ""} onChange={e => updateCassetteRDX(i, cassetteIndex, "capacite", e.target.value)} />
                                </div>
                                <button type="button" onClick={() => removeCassetteRDX(i, cassetteIndex)} className={styles.deleteButton} title="Delete this cassette" style={{
                                minWidth: 24,
                                alignSelf: 'center'
                              }}>
                                  <Icon icon="mdi:delete" width={20} height={20} />
                                </button>
                              </div>)}
                          </div>
                          <button type="button" onClick={() => addCassetteRDX(i)} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            background: 'transparent',
                            border: '1px dashed #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            transition: 'all 0.2s ease',
                            fontSize: '1.25rem',
                            fontWeight: '600'
                          }} onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#15d1a0';
                            e.currentTarget.style.color = '#15d1a0';
                            e.currentTarget.style.background = '#f0fdfa';
                          }} onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.color = '#6b7280';
                            e.currentTarget.style.background = 'transparent';
                          }} title="Add an RDX cassette">
                            <Icon icon="mdi:plus" width={20} height={20} />
                          </button>
                        </div>
                      </div>
                    </div>}

                  {equipment.type === 'Disque dur externe' && <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                      <div className={styles.formField}>
                        <CapacityInput id={`nas-capacite-${i}`} label="Total capacity" value={equipment.capacite} onChange={value => update(i, "capacite", value)} placeholder="2000" />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`nas-numero-disque-${i}`}>Disk number (rotation)</label>
                        <input id={`nas-numero-disque-${i}`} value={equipment.numeroDisque} onChange={e => update(i, "numeroDisque", e.target.value)} />
                      </div>
                    </div>}
                </div>}
            </motion.div>;
              })}
                  </div>
                </div>;
        })}
          <div ref={bottomRef} />
        </div>
      </div>

      {}
      {showTypeModalState && createPortal(<div className={equipmentModalStyles.modalOverlay} onClick={() => setShowTypeModalState(false)}>
          <div className={equipmentModalStyles.modalContent} style={{
        maxWidth: '640px'
      }} onClick={e => e.stopPropagation()}>
            <div className={equipmentModalStyles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mdi:harddisk" className={equipmentModalStyles.modalIcon} style={{
              color: '#3b82f6'
            }} />
                <h3 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1a1a1a'
            }}>
                  Add storage equipment
                </h3>
              </div>
              <button className={equipmentModalStyles.closeButton} onClick={() => setShowTypeModalState(false)} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={equipmentModalStyles.modalBody} style={{
          padding: '1.5rem'
        }}>
              <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
                {[{
              label: "NAS",
              icon: "mdi:nas",
              type: "NAS"
            }, {
              label: "SAN",
              icon: "mdi:server-network-outline",
              type: "SAN"
            }, {
              label: "Backup robot",
              icon: "mdi:vhs",
              type: "Robot de sauvegarde"
            }, {
              label: "External hard drive",
              icon: "mdi:harddisk",
              type: "Disque dur externe"
            }].map(({
              label,
              icon,
              type
            }) => <button key={label} onClick={() => add(type)} style={{
              width: '100%',
              border: '1px solid #e0e0e0',
              borderRadius: '10px',
              padding: '1rem',
              background: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.2s ease'
            }} onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }} onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
                    <Icon icon={icon} width={40} height={40} color="#1a1a1a" />
                    <span style={{
                fontWeight: 600,
                color: '#1a1a1a',
                fontSize: '0.9rem'
              }}>{label}</span>
                  </button>)}
              </div>
            </div>
          </div>
        </div>, document.body)}

    </motion.div>;
};
export default StepStorage;
