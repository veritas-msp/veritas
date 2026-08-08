import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { FaLink } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Form.module.css";
import CheckMKMappingModal from "./CheckMKMappingModal";
import API_BASE_URL from "../../../../config";
const StepFirewalls = ({
  form,
  setForm,
  onAdd,
  currentStepData
}) => {
  const firewalls = form.equipements.Firewalls || [];
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [haLinkSource, setHaLinkSource] = useState(null);
  const findLinkedIndex = (firewall, excludeIndex = null) => {
    const byIndex = firewall.firewallHA;
    if (byIndex !== null && byIndex !== undefined && firewalls[byIndex] && byIndex !== excludeIndex) {
      return byIndex;
    }
    if (firewall.firewallHAName) {
      const found = firewalls.findIndex((fw, idx) => idx !== excludeIndex && fw.nom && fw.nom === firewall.firewallHAName);
      if (found !== -1) return found;
    }
    return null;
  };
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({
    isOpen: false,
    firewallIndex: null
  });
  const [checkmkMappings, setCheckmkMappings] = useState({});
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
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true;
    return !firewalls.some((fw, idx) => idx !== currentIndex && fw.nom?.trim() === name.trim());
  };
  const update = async (index, field, value) => {
    const updated = [...firewalls];
    const oldValue = updated[index][field];
    updated[index][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
    if (field === 'nom' && checkmkMappings[index] && oldValue !== value) {
      const newNameIsUnique = !firewalls.some((fw, idx) => idx !== index && fw.nom?.trim() === value?.trim());
      if (newNameIsUnique) {
        try {
          const oldMapping = checkmkMappings[index];
          const deleteResponse = await fetch(`${API_BASE_URL}/checkmk/mapping/${oldMapping.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (deleteResponse.ok) {
            setCheckmkMappings(prev => {
              const newMappings = {
                ...prev
              };
              delete newMappings[index];
              return newMappings;
            });
          } else {
            console.error('Error deleting mapping CheckMK:', await deleteResponse.text());
          }
        } catch (error) {
          console.error('Error deleting mapping CheckMK:', error);
        }
      }
    }
  };
  React.useEffect(() => {
    if (!form.id) return;
    const loadMappings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${form.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const mappings = await response.json();
          const byIndex = {};
          (form.equipements?.Firewalls || []).forEach((fw, idx) => {
            const matchingMapping = mappings.find(m => m.equipment_type === 'Firewalls' && m.equipment_id === fw.id);
            if (matchingMapping) {
              byIndex[idx] = matchingMapping;
            }
          });
          setCheckmkMappings(byIndex);
        }
      } catch (error) {
        console.error('Erreur chargement mappings Check MK:', error);
      }
    };
    loadMappings();
  }, [form.id, firewalls.length]);
  const remove = index => {
    const updated = [...firewalls];
    const removed = updated[index];
    if (removed && removed.modeHA) {
      const linkedIndex = findLinkedIndex(removed, index);
      if (linkedIndex !== null && updated[linkedIndex]) {
        updated[linkedIndex] = {
          ...updated[linkedIndex],
          modeHA: false,
          firewallHA: null,
          firewallHAName: "",
          roleHA: ""
        };
      }
    }
    updated.splice(index, 1);
    if (haLinkSource === index) {
      setHaLinkSource(null);
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
  };
  const addLicence = firewallIndex => {
    const updated = [...firewalls];
    if (!updated[firewallIndex].licences) {
      updated[firewallIndex].licences = [];
    }
    updated[firewallIndex].licences.push({
      nom: "",
      expiration: "",
      type: ""
    });
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
  };
  const removeLicence = (firewallIndex, licenceIndex) => {
    const updated = [...firewalls];
    updated[firewallIndex].licences.splice(licenceIndex, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
  };
  const updateLicence = (firewallIndex, licenceIndex, field, value) => {
    const updated = [...firewalls];
    updated[firewallIndex].licences[licenceIndex][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
  };
  const add = () => {
    const newFirewall = {
      id: `firewall-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nom: "",
      licences: [],
      firmware: "",
      fabricant: "",
      modele: "",
      ip: "",
      vlan: "",
      numeroSerie: "",
      expirationWarranty: "",
      modeHA: false,
      firewallHA: null,
      firewallHAName: "",
      roleHA: "",
      site: ""
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: [...firewalls, newFirewall]
      }
    }));
  };
  React.useEffect(() => {
    if (onAdd && currentStepData?.key) {
      onAdd[currentStepData.key] = add;
    }
  }, [onAdd, currentStepData, add]);
  const getFirewallHAName = firewallIndex => {
    const firewall = firewalls[firewallIndex];
    if (firewall.firewallHA !== null && firewall.firewallHA !== undefined) {
      const linkedFirewall = firewalls[firewall.firewallHA];
      return linkedFirewall ? linkedFirewall.nom : 'Unknown firewall';
    }
    return null;
  };
  const getAvailableFirewallsForHA = currentIndex => {
    return firewalls.filter((fw, idx) => idx !== currentIndex && !fw.modeHA && fw.nom.trim() !== "" && fw.nom.trim() !== firewalls[currentIndex].nom.trim());
  };
  const activateHAMode = (firewallIndex, targetIndex) => {
    const updated = [...firewalls];
    updated[firewallIndex].modeHA = true;
    updated[firewallIndex].firewallHA = targetIndex;
    updated[firewallIndex].firewallHAName = updated[targetIndex].nom || "";
    updated[firewallIndex].roleHA = "Primary";
    updated[targetIndex].modeHA = true;
    updated[targetIndex].firewallHA = firewallIndex;
    updated[targetIndex].firewallHAName = updated[firewallIndex].nom || "";
    updated[targetIndex].roleHA = "Secondary";
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
    setHaLinkSource(null);
  };
  const deactivateHAMode = firewallIndex => {
    const updated = [...firewalls];
    const currentFirewall = updated[firewallIndex];
    const linkedIndex = findLinkedIndex(currentFirewall, firewallIndex);
    currentFirewall.modeHA = false;
    currentFirewall.firewallHA = null;
    currentFirewall.firewallHAName = "";
    currentFirewall.roleHA = "";
    if (linkedIndex !== null && updated[linkedIndex]) {
      updated[linkedIndex].modeHA = false;
      updated[linkedIndex].firewallHA = null;
      updated[linkedIndex].firewallHAName = "";
      updated[linkedIndex].roleHA = "";
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
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
    if (card) {
      card.style.opacity = "0.5";
    }
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSite(null);
    e.dataTransfer.dropEffect = "move";
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
    if (draggedIndex === null) return;
    const draggedItem = firewalls[draggedIndex];
    const currentSite = draggedItem.site || "No site";
    const targetSiteNormalized = siteName === "No site" ? "No site" : siteName;
    if (currentSite === targetSiteNormalized) {
      e.dataTransfer.dropEffect = "none";
      setDragOverSite(null);
      return;
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
    const updated = [...firewalls];
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
        Firewalls: updated
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
    const updated = [...firewalls];
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
    const newMappings = {};
    Object.keys(checkmkMappings).forEach(oldIndexStr => {
      const oldIndex = parseInt(oldIndexStr, 10);
      let newIndex;
      if (oldIndex === draggedIndex) {
        newIndex = dropIndex;
      } else if (oldIndex < draggedIndex && oldIndex >= dropIndex) {
        newIndex = oldIndex + 1;
      } else if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
        newIndex = oldIndex - 1;
      } else {
        newIndex = oldIndex;
      }
      newMappings[newIndex] = checkmkMappings[oldIndex];
    });
    setCheckmkMappings(newMappings);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Firewalls: updated
      }
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };
  const handleDragEnd = e => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };
  const clientSites = form.sites || [];
  const firewallSites = firewalls.map(fw => fw.site).filter(site => site && site.trim() !== "").filter((site, index, self) => self.indexOf(site) === index);
  const allAvailableSites = [...new Set([...clientSites, ...firewallSites])].sort((a, b) => a.localeCompare(b));
  const groupedBySite = firewalls.reduce((acc, fw, index) => {
    const site = fw.site || "No site";
    if (!acc[site]) {
      acc[site] = [];
    }
    acc[site].push({
      ...fw,
      originalIndex: index
    });
    return acc;
  }, {});
  const allSitesWithGroups = {};
  allAvailableSites.forEach(site => {
    allSitesWithGroups[site] = groupedBySite[site] || [];
  });
  if (groupedBySite["No site"]) {
    allSitesWithGroups["No site"] = groupedBySite["No site"];
  }
  const sortedSites = Object.keys(allSitesWithGroups).sort((a, b) => {
    if (a === "No site") return -1;
    if (b === "No site") return 1;
    return a.localeCompare(b);
  });
  const hasVisibleSites = sortedSites.some(siteName => !(siteName === "No site" && (allSitesWithGroups[siteName] || []).length === 0));
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
          {hasVisibleSites ? sortedSites.map(siteName => {
          const siteFirewalls = allSitesWithGroups[siteName] || [];
          if (siteName === "No site" && siteFirewalls.length === 0) {
            return null;
          }
          return <div key={siteName} className={styles.siteGroup} style={{
            marginBottom: '0.5rem'
          }}>
                  <div style={{
              background: '#ffffff',
              border: `1px solid ${dragOverSite === siteName ? '#15d1a0' : '#e5e7eb'}`,
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '0.75rem',
              transition: 'all 0.2s ease'
            }} onDragOver={e => handleSiteDragOver(e, siteName)} onDragLeave={handleSiteDragLeave} onDrop={e => handleSiteDrop(e, siteName)}>
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
                        {siteFirewalls.length} firewall{siteFirewalls.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className={styles.siteConnections} onDragOver={e => {
              if (e.target.closest(`.${styles.serverCard}`)) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              if (draggedIndex !== null) {
                const draggedItem = firewalls[draggedIndex];
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
            }} onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setDragOverSite(null);
              }
            }} onDrop={e => {
              if (e.target.closest(`.${styles.serverCard}`)) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              if (draggedIndex !== null) {
                handleSiteDrop(e, siteName);
              }
            }}>
                    {siteFirewalls.length === 0 && <div className={styles.emptySiteMessage}>
                        No firewalls in this site. Drag and drop a firewall here to assign it to this site.
                      </div>}
                    {siteFirewalls.map((firewall, siteIndex) => {
                const i = firewall.originalIndex;
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
                  marginBottom: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  border: `2px solid ${dragOverIndex === i ? '#15d1a0' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  transition: 'all 0.2s ease',
                  boxShadow: draggedIndex === i ? '0 8px 20px rgba(0,0,0,0.04)' : 'none'
                }}>
                          <div className={`${styles.serverHeader} ${expandedItems.has(i) ? styles.serverHeaderExpanded : ''}`} onClick={e => {
                    if (isDragging) return;
                    if (haLinkSource !== null) {
                      if (haLinkSource !== i) {
                        const sourceFw = firewalls[haLinkSource];
                        const targetFw = firewalls[i];
                        const canLink = sourceFw && targetFw && sourceFw.nom.trim() && targetFw.nom.trim() && !sourceFw.modeHA && !targetFw.modeHA;
                        if (canLink) {
                          activateHAMode(haLinkSource, i);
                        } else {
                          setHaLinkSource(null);
                        }
                      } else {
                        setHaLinkSource(null);
                      }
                      return;
                    }
                    toggleItemExpansion(i);
                  }} style={{
                    cursor: 'pointer',
                    background: expandedItems.has(i) ? '#f9fafb' : 'transparent',
                    padding: '0.75rem 1rem',
                    margin: '-0.75rem -1rem -0.75rem -1rem',
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
                              <IconifyIcon icon="solar:shield-bold" width={20} height={20} color="#1a1a1a" style={{
                        position: 'relative',
                        top: '0px'
                      }} />
                              <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                      }}>
                                <div style={{
                          fontWeight: '600',
                          color: '#1a1a1a',
                          fontSize: '0.95rem',
                          marginBottom: '0'
                        }}>
                                  {firewall.nom || `Firewall #${i + 1}`}
                                </div>
                                <div style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          display: 'flex',
                          gap: '0.35rem',
                          flexWrap: 'wrap'
                        }}>
                                  {[firewall.modele, firewall.ip, firewall.numeroSerie].filter(Boolean).map((item, idx) => <span key={idx}>{item}</span>)}
                                </div>
                              </div>
                            </div>
                            <div className={styles.serverActions}>
                                <button onClick={e => {
                        e.stopPropagation();
                        if (firewall.modeHA) {
                          deactivateHAMode(i);
                          setHaLinkSource(null);
                          return;
                        }
                        if (!firewall.nom.trim()) {
                          return;
                        }
                        if (haLinkSource === i) {
                          setHaLinkSource(null);
                          return;
                        }
                        setHaLinkSource(i);
                      }} title={firewall.modeHA ? "Disable HA" : haLinkSource === i ? "Select another firewall to link" : "Enable HA: then select the firewall to link"} style={{
                        padding: '0.5rem',
                        background: firewall.modeHA ? '#10b981' : haLinkSource === i ? '#0ea5e9' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: firewall.modeHA || haLinkSource === i ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)'
                      }} onMouseEnter={e => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = firewall.modeHA || haLinkSource === i ? '0 4px 8px rgba(16, 185, 129, 0.4)' : '0 4px 8px rgba(156, 163, 175, 0.35)';
                      }} onMouseLeave={e => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = firewall.modeHA || haLinkSource === i ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)';
                      }}>
                                  <IconifyIcon icon={firewall.modeHA ? "mdi:lan-check" : haLinkSource === i ? "mdi:lan-pending" : "mdi:lan-connect"} width={14} height={14} />
                                </button>
                                <button onClick={e => {
                        e.stopPropagation();
                        setCheckmkMappingModal({
                          isOpen: true,
                          firewallIndex: i
                        });
                      }} title={checkmkMappings[i] ? `Mapped to: ${checkmkMappings[i].checkmk_host_name}` : "Map with Check MK"} style={{
                        padding: '0.5rem',
                        background: checkmkMappings[i] ? '#10b981' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: checkmkMappings[i] ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)'
                      }} onMouseEnter={e => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = checkmkMappings[i] ? '0 4px 8px rgba(16, 185, 129, 0.4)' : '0 4px 8px rgba(156, 163, 175, 0.35)';
                      }} onMouseLeave={e => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = checkmkMappings[i] ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)';
                      }}>
                                  <FaLink size={14} />
                                </button>
                                <button onClick={e => {
                        e.stopPropagation();
                        remove(i);
                      }} title="Delete this firewall" style={{
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
                                  <IconifyIcon icon="mdi:delete" width={14} height={14} />
                                </button>
                            </div>
                          </div>

                          {}
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
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-nom-${i}`}>NetBIOS <span style={{
                            color: 'red'
                          }}>*</span></label>
                      <input id={`fw-nom-${i}`} value={firewall.nom} onChange={e => update(i, "nom", e.target.value)} required style={{
                          borderColor: !isNameUnique(firewall.nom, i) ? '#ef4444' : undefined,
                          borderWidth: !isNameUnique(firewall.nom, i) ? '2px' : '1px',
                          fontSize: !isNameUnique(firewall.nom, i) ? '1rem' : '0.9rem',
                          fontWeight: !isNameUnique(firewall.nom, i) ? 'bold' : 'normal'
                        }} />
                      {!isNameUnique(firewall.nom, i) && <div style={{
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          marginTop: '0.25rem'
                        }}>
                          ⚠️ This name already exists!
                        </div>}
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-firmware-${i}`}>Firmware</label>
                      <input id={`fw-firmware-${i}`} value={firewall.firmware} onChange={e => update(i, "firmware", e.target.value)} />
                    </div>
                  </div>

                  {}
                  <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr'
                    }}>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-ip-${i}`}>IP address</label>
                      <input id={`fw-ip-${i}`} value={firewall.ip} onChange={e => update(i, "ip", e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-vlan-${i}`}>VLAN</label>
                      <input id={`fw-vlan-${i}`} value={firewall.vlan || ""} onChange={e => update(i, "vlan", e.target.value)} />
                    </div>
                  </div>

                  {}
                  <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr 1fr 1fr'
                    }}>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-fabricant-${i}`}>Brand</label>
                      <input id={`fw-fabricant-${i}`} value={firewall.fabricant} onChange={e => update(i, "fabricant", e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-modele-${i}`}>Model</label>
                      <input id={`fw-modele-${i}`} value={firewall.modele} onChange={e => update(i, "modele", e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-serie-${i}`}>Serial No.</label>
                      <input id={`fw-serie-${i}`} value={firewall.numeroSerie} onChange={e => update(i, "numeroSerie", e.target.value)} />
                    </div>
                  </div>

                  {}
                  <div className={styles.formGrid} style={{
                      gridTemplateColumns: '1fr'
                    }}>
                    <div className={styles.formField}>
                      <label htmlFor={`fw-garantie-${i}`}>Warranty (expiration)</label>
                      <input id={`fw-garantie-${i}`} type="date" value={firewall.expirationWarranty} onChange={e => update(i, "expirationWarranty", e.target.value)} />
                    </div>
                  </div>

                  <div className={styles.formField} style={{
                      gridColumn: '1 / -1'
                    }}>
                    <label>Licenses</label>
                    {firewall.licences && firewall.licences.length > 0 ? <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 10
                      }}>
                        {firewall.licences.map((licence, licenceIndex) => <div key={licenceIndex} className={styles.licenceItem} style={{
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
                            }}>Name/Label</label>
                              <input id={`fw-licence-nom-${i}-${licenceIndex}`} value={licence.nom} onChange={e => updateLicence(i, licenceIndex, "nom", e.target.value)} />
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
                            }}>Expiration</label>
                              <input id={`fw-licence-expiration-${i}-${licenceIndex}`} type="date" value={licence.expiration} onChange={e => updateLicence(i, licenceIndex, "expiration", e.target.value)} />
                            </div>
                            <button type="button" className={styles.deleteButton} title="Delete this license" onClick={() => removeLicence(i, licenceIndex)} style={{
                            minWidth: 24,
                            alignSelf: 'center'
                          }}>
                              ×
                            </button>
                          </div>)}
                      </div> : <p className={styles.noLicences}>No licenses configured</p>}
                    <button type="button" className={styles.addLicenceButton} onClick={() => addLicence(i)}>
                      +
                    </button>
                  </div>
                          </motion.div>}
                        </motion.div>;
              })}
                  </div>
                </div>;
        }) : <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No firewalls configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add a firewall" to get started
              </p>
            </div>}
          <div ref={bottomRef} />
        </div>
      </div>

      {}
      {checkmkMappingModal.isOpen && checkmkMappingModal.firewallIndex !== null && firewalls[checkmkMappingModal.firewallIndex] && <CheckMKMappingModal isOpen={checkmkMappingModal.isOpen} onClose={() => setCheckmkMappingModal({
      isOpen: false,
      firewallIndex: null
    })} equipmentName={firewalls[checkmkMappingModal.firewallIndex].nom} equipmentType="Firewalls" equipmentIndex={checkmkMappingModal.firewallIndex} equipmentId={firewalls[checkmkMappingModal.firewallIndex].id} clientId={form.id} requireService={false} onMappingSaved={mapping => {
      if (mapping) {
        setCheckmkMappings(prev => ({
          ...prev,
          [checkmkMappingModal.firewallIndex]: mapping
        }));
      } else {
        setCheckmkMappings(prev => {
          const newMappings = {
            ...prev
          };
          delete newMappings[checkmkMappingModal.firewallIndex];
          return newMappings;
        });
      }
    }} />}
    </motion.div>;
};
export default StepFirewalls;
