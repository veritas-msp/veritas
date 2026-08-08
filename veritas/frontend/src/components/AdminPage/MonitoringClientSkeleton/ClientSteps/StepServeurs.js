import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { FaLink, FaServer, FaCube } from "react-icons/fa";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import React from "react";
import CheckMKMappingModal from "./CheckMKMappingModal";
import API_BASE_URL from "../../../../config";
import { SERVER_ROLE_OPTIONS } from "../../../EquipementPage/constants/serverRoleOptions";
const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const toggleDropdown = () => setIsOpen(!isOpen);
  const handleOptionClick = option => {
    const newSelected = selectedValues.includes(option) ? selectedValues.filter(val => val !== option) : [...selectedValues, option];
    onChange(newSelected);
  };
  const removeTag = tagToRemove => {
    const newSelected = selectedValues.filter(tag => tag !== tagToRemove);
    onChange(newSelected);
  };
  React.useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const filteredOptions = options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
  return <div ref={dropdownRef} style={{
    position: 'relative',
    width: '100%'
  }}>
      {}
      <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.35rem',
      minHeight: '2.5rem',
      padding: '0.5rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      background: '#ffffff',
      cursor: 'text',
      alignItems: 'center'
    }} onClick={e => {
      if (e.target === e.currentTarget || e.target.tagName === 'INPUT' && e.target.type === 'text') {
        const input = e.currentTarget.querySelector('input[type="text"]');
        if (input) {
          input.focus();
          setIsOpen(true);
        }
      }
    }}>
        {selectedValues.map((tag, index) => <span key={index} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        padding: '0.25rem 0.5rem',
        background: '#3b82f6',
        color: 'white',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        cursor: 'default'
      }} onClick={e => e.stopPropagation()}>
            {tag}
            <button type="button" style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.75rem',
          lineHeight: '1',
          padding: '0.1rem 0.2rem',
          marginLeft: '0.2rem',
          borderRadius: '3px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '14px',
          minHeight: '14px'
        }} onClick={e => {
          e.stopPropagation();
          removeTag(tag);
        }} onMouseEnter={e => {
          e.target.style.background = 'rgba(255, 255, 255, 0.3)';
        }} onMouseLeave={e => {
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
        }}>
              ×
            </button>
          </span>)}
        
        {}
        <input type="text" style={{
        flex: 1,
        minWidth: '120px',
        padding: '0.25rem 0.5rem',
        border: 'none',
        background: 'transparent',
        color: '#1a1a1a',
        fontSize: '0.9rem',
        outline: 'none',
        cursor: 'text'
      }} placeholder={selectedValues.length === 0 ? placeholder : "Add a role..."} value={searchTerm} onChange={e => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
      }} onFocus={() => setIsOpen(true)} onClick={e => {
        e.stopPropagation();
        setIsOpen(true);
      }} />
      </div>
      
      {}
      {isOpen && <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 1000,
      background: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginTop: '0.25rem',
      maxHeight: '200px',
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
          {filteredOptions.map(option => {
        const isSelected = selectedValues.includes(option);
        return <div key={option} style={{
          width: '100%',
          minHeight: '36px',
          padding: '0.5rem 0.75rem',
          cursor: 'pointer',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isSelected ? '#3b82f6' : 'transparent',
          color: isSelected ? 'white' : '#1a1a1a',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }} onClick={() => handleOptionClick(option)} onMouseEnter={e => {
          if (!isSelected) {
            e.target.style.background = '#f9fafb';
          }
        }} onMouseLeave={e => {
          if (!isSelected) {
            e.target.style.background = 'transparent';
          }
        }}>
                <input type="checkbox" checked={isSelected} readOnly style={{
            margin: 0,
            accentColor: isSelected ? 'white' : '#3b82f6',
            cursor: 'pointer',
            flexShrink: 0,
            width: '16px',
            height: '16px'
          }} />
                <span style={{
            cursor: 'pointer',
            flex: 1,
            textAlign: 'left',
            fontSize: '0.9rem'
          }}>
                  {option}
                </span>
              </div>;
      })}
        </div>}
    </div>;
};
const StepServeurs = ({
  form,
  setForm,
  showTypeModal,
  setShowTypeModal: setShowTypeModalProp
}) => {
  const [localShowTypeModal, setLocalShowTypeModal] = useState(false);
  const showTypeModalState = showTypeModal !== undefined ? showTypeModal : localShowTypeModal;
  const setShowTypeModalState = setShowTypeModalProp || setLocalShowTypeModal;
  const serveurs = form.equipements.Serveurs || [];
  const bottomRef = useRef(null);
  const [expandedServers, setExpandedServers] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({
    isOpen: false,
    serverIndex: null
  });
  const [checkmkMappings, setCheckmkMappings] = useState({});
  const [haLinkSource, setHaLinkSource] = useState(null);
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
          (form.equipements?.Serveurs || []).forEach((srv, idx) => {
            const matchingMapping = mappings.find(m => m.equipment_type === 'Serveurs' && m.equipment_id === srv.id);
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
  }, [form.id, form.equipements?.Serveurs]);
  React.useEffect(() => {
    const needsMigration = serveurs.some(srv => typeof srv.role === 'string');
    if (needsMigration) {
      const updatedServeurs = serveurs.map(srv => {
        if (typeof srv.role === 'string') {
          return {
            ...srv,
            role: srv.role.trim() ? [srv.role] : []
          };
        }
        return srv;
      });
      setForm(prev => ({
        ...prev,
        equipements: {
          ...prev.equipements,
          Serveurs: updatedServeurs
        }
      }));
    }
  }, []);
  const roleOptions = SERVER_ROLE_OPTIONS;
  const osOptions = ["Windows Server 2012 R2 Standard", "Windows Server 2012 R2 Datacenter", "Windows Server 2016 Standard", "Windows Server 2016 Datacenter", "Windows Server 2019 Standard", "Windows Server 2019 Datacenter", "Windows Server 2022 Standard", "Windows Server 2022 Datacenter", "Windows Server 2025 Standard", "Windows Server 2025 Datacenter", "Windows 10 Pro", "Windows 10 Enterprise", "Windows 11 Pro", "Windows 11 Enterprise", "Ubuntu Server 18.04 LTS", "Ubuntu Server 20.04 LTS", "Ubuntu Server 22.04 LTS", "Ubuntu Server 24.04 LTS", "Ubuntu Desktop 20.04 LTS", "Ubuntu Desktop 22.04 LTS", "Ubuntu Desktop 24.04 LTS", "Debian 10 (Buster)", "Debian 11 (Bullseye)", "Debian 12 (Bookworm)", "Debian 13 (Trixie)", "CentOS 6", "CentOS 7", "CentOS 8", "CentOS Stream 8", "CentOS Stream 9", "CentOS Stream 10", "Red Hat Enterprise Linux 6", "Red Hat Enterprise Linux 7", "Red Hat Enterprise Linux 8", "Red Hat Enterprise Linux 9", "Red Hat Enterprise Linux 10", "SUSE Linux Enterprise Server 12", "SUSE Linux Enterprise Server 15", "SUSE Linux Enterprise Server 16", "openSUSE Leap 15", "openSUSE Leap 16", "openSUSE Tumbleweed", "VMware ESXi 6.5", "VMware ESXi 6.7", "VMware ESXi 7.0", "VMware ESXi 8.0", "VMware ESXi 8.1", "VMware ESXi 8.2", "VMware vCenter Server 6.7", "VMware vCenter Server 7.0", "VMware vCenter Server 8.0", "Proxmox VE 6.x", "Proxmox VE 7.x", "Proxmox VE 8.x", "AlmaLinux 8", "AlmaLinux 9", "Rocky Linux 8", "Rocky Linux 9", "Oracle Linux 7", "Oracle Linux 8", "Oracle Linux 9", "Fedora Server 37", "Fedora Server 38", "Fedora Server 39", "Fedora Server 40", "FreeBSD 12", "FreeBSD 13", "FreeBSD 14", "TrueNAS Core", "TrueNAS Scale", "Citrix XenServer 7.1", "Citrix XenServer 8.0", "Citrix XenServer 8.2", "Microsoft Hyper-V Server 2019", "Microsoft Hyper-V Server 2022", "Other"];
  const toggleServerExpansion = index => {
    if (!isDragging) {
      const newExpanded = new Set(expandedServers);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedServers(newExpanded);
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
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "0.5";
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
      const draggedItem = serveurs[draggedIndex];
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
    const updated = [...serveurs];
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
    const newExpanded = new Set(expandedServers);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated
      }
    }));
    setExpandedServers(newExpanded);
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
    const updated = [...serveurs];
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
    expandedServers.forEach(oldIndex => {
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
    setExpandedServers(newExpanded);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated
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
  const isNameUnique = (name, currentIndex) => {
    if (!name || !name.trim()) return true;
    return !serveurs.some((srv, idx) => idx !== currentIndex && srv.nom?.trim() === name.trim());
  };
  const updateServeur = async (index, field, value) => {
    const updated = [...serveurs];
    const oldValue = updated[index][field];
    updated[index][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated
      }
    }));
    if (field === 'nom' && checkmkMappings[index] && oldValue !== value) {
      const newNameIsUnique = !serveurs.some((srv, idx) => idx !== index && srv.nom?.trim() === value?.trim());
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
  const findLinkedIndex = (server, excludeIndex = null) => {
    const byIndex = server.serverHA;
    if (byIndex !== null && byIndex !== undefined && serveurs[byIndex] && byIndex !== excludeIndex) {
      return byIndex;
    }
    if (server.serverHAName) {
      const found = serveurs.findIndex((srv, idx) => idx !== excludeIndex && srv.nom && srv.nom === server.serverHAName);
      if (found !== -1) return found;
    }
    return null;
  };
  const activateHAMode = (serverIndex, targetIndex) => {
    const updated = [...serveurs];
    const source = updated[serverIndex];
    const target = updated[targetIndex];
    if (!source || !target || source.type !== "physique" || target.type !== "physique" || !source.nom?.trim() || !target.nom?.trim() || source.modeHA || target.modeHA) {
      setHaLinkSource(null);
      return;
    }
    source.modeHA = true;
    source.serverHA = targetIndex;
    source.serverHAName = target.nom || "";
    source.roleHA = "Primary";
    target.modeHA = true;
    target.serverHA = serverIndex;
    target.serverHAName = source.nom || "";
    target.roleHA = "Secondary";
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated
      }
    }));
    setHaLinkSource(null);
  };
  const deactivateHAMode = serverIndex => {
    const updated = [...serveurs];
    const current = updated[serverIndex];
    if (!current) return;
    const linkedIndex = findLinkedIndex(current, serverIndex);
    current.modeHA = false;
    current.serverHA = null;
    current.serverHAName = "";
    current.roleHA = "";
    if (linkedIndex !== null && updated[linkedIndex]) {
      updated[linkedIndex].modeHA = false;
      updated[linkedIndex].serverHA = null;
      updated[linkedIndex].serverHAName = "";
      updated[linkedIndex].roleHA = "";
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated
      }
    }));
    setHaLinkSource(null);
  };
  const toggleRole = (index, role) => {
    const updated = [...serveurs];
    const currentRoles = updated[index].role || [];
    if (currentRoles.includes(role)) {
      updated[index].role = currentRoles.filter(r => r !== role);
    } else {
      updated[index].role = [...currentRoles, role];
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: updated
      }
    }));
  };
  const removeServeur = index => {
    const updated = [...serveurs];
    const removed = updated[index];
    if (removed && removed.modeHA) {
      const linkedIndex = findLinkedIndex(removed, index);
      if (linkedIndex !== null && updated[linkedIndex]) {
        updated[linkedIndex] = {
          ...updated[linkedIndex],
          modeHA: false,
          serverHA: null,
          serverHAName: "",
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
        Serveurs: updated
      }
    }));
  };
  const addServeur = type => {
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Serveurs: [...serveurs, {
          id: `serveur-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nom: "",
          role: [],
          type: type,
          systeme: "",
          ip: "",
          vlan: "",
          processeur: "",
          stockage: "",
          memoire: "",
          marque: "",
          modele: "",
          numeroSerie: "",
          expirationWarranty: "",
          modeHA: false,
          serverHA: null,
          serverHAName: "",
          roleHA: ""
        }]
      }
    }));
    setShowTypeModalState(false);
    setTimeout(() => {
      setExpandedServers(new Set([...expandedServers, serveurs.length]));
    }, 100);
  };
  const countPhysicals = serveurs.filter(s => s.type === "physique").length;
  const countVirtuals = serveurs.filter(s => s.type === "virtuel").length;
  const formatRoles = roles => {
    if (!Array.isArray(roles)) {
      if (typeof roles === 'string' && roles.trim()) {
        return roles;
      }
      return 'No roles defined';
    }
    if (roles.length === 0) return 'No roles defined';
    if (roles.length === 1) return roles[0];
    if (roles.length === 2) return roles.join(' & ');
    return roles.slice(0, -1).join(', ') + ' & ' + roles[roles.length - 1];
  };
  const clientSites = form.sites || [];
  const serverSites = serveurs.map(srv => srv.site).filter(site => site && site.trim() !== "").filter((site, index, self) => self.indexOf(site) === index);
  const allAvailableSites = [...new Set([...clientSites, ...serverSites])];
  const groupedBySite = serveurs.reduce((acc, srv, index) => {
    const site = srv.site || "No site";
    if (!acc[site]) {
      acc[site] = [];
    }
    acc[site].push({
      ...srv,
      originalIndex: index
    });
    return acc;
  }, {});
  let sortedSites = ["No site", ...allAvailableSites].filter((site, index, self) => self.indexOf(site) === index).sort((a, b) => {
    if (a === "No site") return -1;
    if (b === "No site") return 1;
    return a.localeCompare(b);
  });
  if ((groupedBySite["No site"] || []).length === 0) {
    sortedSites = sortedSites.filter(site => site !== "No site");
  }
  return <motion.div className={styles.stepContainer} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: "circOut"
  }} style={{
    display: "flex",
    flexDirection: "column",
    width: "100%"
  }}>
      <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
      flex: 1,
      minHeight: 0
    }}>
          {sortedSites.length === 0 ? <div style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        background: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '12px',
        color: '#6b7280'
      }}>
              <Icon icon="mingcute:server-fill" width={48} height={48} color="#9ca3af" style={{
          marginBottom: '1rem'
        }} />
              <p style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 600,
          color: '#1a1a1a'
        }}>
                No servers configured
              </p>
              <p style={{
          margin: '0.5rem 0 0 0',
          fontSize: '0.875rem'
        }}>
                Add a server to get started.
              </p>
            </div> : sortedSites.map(siteName => {
        const siteServers = groupedBySite[siteName] || [];
        return <div key={siteName} style={{
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
          }} onDrop={e => handleSiteDrop(e, siteName)}>
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
                        {siteServers.length} server{siteServers.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
                    {siteServers.length === 0 && <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: '#f9fafb',
              border: '2px dashed #d1d5db',
              borderRadius: '10px',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
                        No servers in this site. Drag and drop a server here.
                      </div>}
                    {siteServers.map((server, siteIndex) => {
              const i = server.originalIndex;
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
              <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  background: expandedServers.has(i) ? '#f9fafb' : 'transparent',
                  transition: 'background 0.2s ease'
                }} onClick={e => {
                  if (isDragging) return;
                  if (haLinkSource !== null) {
                    if (haLinkSource !== i) {
                      const sourceSrv = serveurs[haLinkSource];
                      const targetSrv = serveurs[i];
                      const canLink = sourceSrv && targetSrv && sourceSrv.type === "physique" && targetSrv.type === "physique" && sourceSrv.nom?.trim() && targetSrv.nom?.trim() && !sourceSrv.modeHA && !targetSrv.modeHA;
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
                  toggleServerExpansion(i);
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
                  {server.type === 'physique' ? <FaServer size={24} color="#1a1a1a" /> : <FaCube size={24} color="#1a1a1a" />}
                  <div style={{
                      flex: 1
                    }}>
                    <div style={{
                        fontWeight: '600',
                        color: '#1a1a1a',
                        fontSize: '0.95rem',
                        marginBottom: '0.25rem'
                      }}>
                      {server.nom || `Server ${i + 1}`}
                    </div>
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                      {[formatRoles(server.role) !== 'No roles defined' && formatRoles(server.role), server.ip, server.systeme].filter(Boolean).map((item, idx) => <span key={idx}>{item}</span>)}
                    </div>
                  </div>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                  {server.type === 'physique' && <button onClick={e => {
                      e.stopPropagation();
                      if (server.modeHA) {
                        deactivateHAMode(i);
                        return;
                      }
                      if (!server.nom?.trim()) return;
                      if (haLinkSource === i) {
                        setHaLinkSource(null);
                        return;
                      }
                      setHaLinkSource(i);
                    }} title={server.modeHA ? "Disable HA" : haLinkSource === i ? "Click another physical server to link it" : "Enable HA: then click another physical server"} style={{
                      padding: '0.5rem',
                      background: server.modeHA ? '#10b981' : haLinkSource === i ? '#0ea5e9' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <Icon icon={server.modeHA ? "mdi:lan-check" : haLinkSource === i ? "mdi:lan-pending" : "mdi:lan-connect"} width={14} height={14} />
                    </button>}
                  <button onClick={e => {
                      e.stopPropagation();
                      setCheckmkMappingModal({
                        isOpen: true,
                        serverIndex: i
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
                      transition: 'all 0.2s ease'
                    }}>
                    <FaLink size={14} />
                  </button>
                  <button onClick={e => {
                      e.stopPropagation();
                      removeServeur(i);
                    }} style={{
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
                    }} onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Delete">
                    <Icon icon="mdi:delete" width={20} height={20} />
                  </button>
                </div>
              </div>
              

              {expandedServers.has(i) && <div style={{
                  padding: '1rem',
                  background: '#ffffff',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        NetBIOS <span style={{
                          color: '#ef4444'
                        }}>*</span>
                      </label>
                      <input type="text" value={server.nom || ""} onChange={e => updateServeur(i, "nom", e.target.value)} required style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: `2px solid ${!isNameUnique(server.nom, i) ? '#ef4444' : !server.nom || !server.nom.trim() ? '#ef4444' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: !isNameUnique(server.nom, i) ? '1rem' : '0.9rem',
                        fontWeight: !isNameUnique(server.nom, i) ? 'bold' : 'normal'
                      }} />
                      {!isNameUnique(server.nom, i) && <div style={{
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        marginTop: '0.25rem'
                      }}>
                          ⚠️ This name already exists!
                        </div>}
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        Operating system <span style={{
                          color: '#ef4444'
                        }}>*</span>
                      </label>
                      <select value={server.systeme || ""} onChange={e => updateServeur(i, "systeme", e.target.value)} required style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: `1px solid ${!server.systeme || !server.systeme.trim() ? '#ef4444' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }}>
                        <option value="">Select an OS</option>
                        {osOptions.map(os => <option key={os} value={os}>
                            {os}
                          </option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        Roles <span style={{
                          color: '#ef4444'
                        }}>*</span>
                      </label>
                      <MultiSelectDropdown options={roleOptions} selectedValues={Array.isArray(server.role) ? server.role : []} onChange={selected => updateServeur(i, "role", selected)} placeholder="Select roles" />
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        IP address <span style={{
                          color: '#ef4444'
                        }}>*</span>
                      </label>
                      <input type="text" value={server.ip || ""} onChange={e => updateServeur(i, "ip", e.target.value)} required style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: `1px solid ${!server.ip || !server.ip.trim() ? '#ef4444' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        VLAN
                      </label>
                      <input type="text" value={server.vlan || ""} onChange={e => updateServeur(i, "vlan", e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }} />
                    </div>
                  </div>

                  {server.type === 'physique' && <>
                      <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                        <div>
                          <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#1a1a1a'
                        }}>
                            Brand
                          </label>
                          <input type="text" value={server.marque || ""} onChange={e => updateServeur(i, "marque", e.target.value)} style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }} />
                        </div>

                        <div>
                          <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#1a1a1a'
                        }}>
                            Model
                          </label>
                          <input type="text" value={server.modele || ""} onChange={e => updateServeur(i, "modele", e.target.value)} style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }} />
                        </div>

                        <div>
                          <label style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#1a1a1a'
                        }}>
                            Serial No.
                          </label>
                          <input type="text" value={server.numeroSerie || ""} onChange={e => updateServeur(i, "numeroSerie", e.target.value)} style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }} />
                        </div>
                      </div>

                      <div style={{
                      marginBottom: '1rem'
                    }}>
                        <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                          Warranty (expiration)
                        </label>
                        <input type="date" value={server.expirationWarranty || ""} onChange={e => updateServeur(i, "expirationWarranty", e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }} />
                      </div>
                    </>}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1a1a1a'
                      }}>
                        {server.type === 'virtuel' ? 'VCPU' : 'CPU'}
                      </label>
                      <input type="text" value={server.processeur || ""} onChange={e => updateServeur(i, "processeur", e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        RAM (GB)
                      </label>
                      <input type="number" value={server.memoire || ""} onChange={e => updateServeur(i, "memoire", e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }} />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Storage (GB)
                      </label>
                      <input type="number" value={server.stockage || ""} onChange={e => updateServeur(i, "stockage", e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }} />
                    </div>
                  </div>
                </div>}
            </motion.div>;
            })}
                  </div>
                </div>;
      })}
      </div>

      {}
      {showTypeModalState && <div className={adminStyles.modalOverlay} onClick={() => setShowTypeModalState(false)}>
          <div className={adminStyles.modalContent} style={{
        maxWidth: '600px'
      }} onClick={e => e.stopPropagation()}>
            <div className={adminStyles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mingcute:server-fill" className={adminStyles.modalIcon} style={{
              width: '24px',
              height: '24px',
              color: '#3b82f6'
            }} />
                <h3>Add a server</h3>
              </div>
              <button className={adminStyles.closeButton} onClick={() => setShowTypeModalState(false)} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={adminStyles.modalBody}>
              <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem'
          }}>
                {[{
              label: "Physical",
              icon: <FaServer size={40} color="#1a1a1a" />,
              type: "physique"
            }, {
              label: "Virtual",
              icon: <FaCube size={40} color="#1a1a1a" />,
              type: "virtuel"
            }].map(({
              label,
              icon,
              type
            }) => <button key={label} onClick={() => addServeur(type)} style={{
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
                    {icon}
                    <span style={{
                fontWeight: 600,
                color: '#1a1a1a',
                fontSize: '0.9rem'
              }}>{label}</span>
                  </button>)}
              </div>
            </div>
          </div>
        </div>}

      {}
      {checkmkMappingModal.isOpen && checkmkMappingModal.serverIndex !== null && serveurs[checkmkMappingModal.serverIndex] && <CheckMKMappingModal isOpen={checkmkMappingModal.isOpen} onClose={() => setCheckmkMappingModal({
      isOpen: false,
      serverIndex: null
    })} equipmentName={serveurs[checkmkMappingModal.serverIndex].nom} equipmentType="Serveurs" equipmentIndex={checkmkMappingModal.serverIndex} equipmentId={serveurs[checkmkMappingModal.serverIndex].id} clientId={form.id} requireService={false} onMappingSaved={mapping => {
      if (mapping) {
        setCheckmkMappings(prev => ({
          ...prev,
          [checkmkMappingModal.serverIndex]: mapping
        }));
      } else {
        setCheckmkMappings(prev => {
          const newMappings = {
            ...prev
          };
          delete newMappings[checkmkMappingModal.serverIndex];
          return newMappings;
        });
      }
    }} />}
    </motion.div>;
};
export default StepServeurs;
