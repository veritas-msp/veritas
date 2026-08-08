import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import equipmentModalStyles from "./EquipmentStepsModal.module.css";
import InternetConnectionFields from "../InternetConnectionFields";
import InternetTypePicker from "../InternetTypePicker";
import formStyles from "../../EnterprisesPage/EnterpriseFormModal.module.css";
import internetFormStyles from "../InternetConnectionForm.module.css";
import { INTERNET_DRAFT_FORM_SECTIONS } from "../equipmentFormConfig";
import { createEmptyInternetConnection, formatInternetDebitDisplay, syncInternetLegacyDebit, buildInternetSectionNavMeta, getInternetConnectionTypeDef } from "../internetConnectionUtils";
import { showError } from "../../utils/toast";
const StepInternet = ({
  form,
  setForm,
  showTypeModal,
  setShowTypeModal: setShowTypeModalProp
}) => {
  const [localShowTypeModal, setLocalShowTypeModal] = useState(false);
  const showTypeModalState = showTypeModal !== undefined ? showTypeModal : localShowTypeModal;
  const setShowTypeModalState = setShowTypeModalProp || setLocalShowTypeModal;
  const connections = form.equipements?.Internet || [];
  const [expandedConnections, setExpandedConnections] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverSite, setDragOverSite] = useState(null);
  const [draftConnection, setDraftConnection] = useState(() => createEmptyInternetConnection());
  const [activeDraftSection, setActiveDraftSection] = useState("internetType");
  useEffect(() => {
    if (!showTypeModalState) {
      setDraftConnection(createEmptyInternetConnection());
      setActiveDraftSection("internetType");
    }
  }, [showTypeModalState]);
  const draftSectionNav = useMemo(() => buildInternetSectionNavMeta(draftConnection, {
    isAddMode: true,
    includeIdentity: false
  }), [draftConnection]);
  const toggleConnectionExpansion = index => {
    const newExpanded = new Set(expandedConnections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConnections(newExpanded);
  };
  const removeConnection = index => {
    const updated = [...connections];
    updated.splice(index, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Internet: updated
      }
    }));
  };
  const submitDraftConnection = () => {
    if (!draftConnection.type) {
      showError("Select a connection type.");
      return;
    }
    if (!draftConnection.fournisseur?.trim()) {
      showError("The provider is required.");
      return;
    }
    const payload = syncInternetLegacyDebit({
      ...draftConnection,
      fournisseur: draftConnection.fournisseur.trim()
    });
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Internet: [...connections, payload]
      }
    }));
    setShowTypeModalState(false);
    setTimeout(() => {
      setExpandedConnections(new Set([...expandedConnections, connections.length]));
    }, 100);
  };
  const getConnectionIcon = type => {
    const size = 24;
    const color = "#1a1a1a";
    const typeDef = getInternetConnectionTypeDef(type);
    return <Icon icon={typeDef.icon} width={size} height={size} color={color} />;
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
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverSite(null);
    setDragOverIndex(index);
  };
  const handleSiteDragOver = (e, siteName) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null) {
      const draggedItem = connections[draggedIndex];
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
  const handleSiteDrop = (e, targetSite) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    const updated = [...connections];
    const draggedItem = updated[draggedIndex];
    const newSite = targetSite === "No site" ? "" : targetSite;
    draggedItem.site = newSite;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Internet: updated
      }
    }));
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
    const updated = [...connections];
    const draggedItem = updated[draggedIndex];
    const dropItem = updated[dropIndex];
    const draggedSite = draggedItem.site || "No site";
    const dropSite = dropItem.site || "No site";
    if (draggedSite !== dropSite) {
      draggedItem.site = dropSite === "No site" ? "" : dropSite;
    }
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Internet: updated
      }
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setIsDragging(false);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverSite(null);
    setTimeout(() => setIsDragging(false), 100);
  };
  const clientSites = form.sites || [];
  const connectionSites = connections.map(conn => conn.site).filter(site => site && site.trim() !== "").filter((site, index, self) => self.indexOf(site) === index);
  const allAvailableSites = [...new Set([...clientSites, ...connectionSites])].sort((a, b) => a.localeCompare(b));
  const groupedBySite = connections.reduce((acc, conn, index) => {
    const site = conn.site || "No site";
    if (!acc[site]) {
      acc[site] = [];
    }
    acc[site].push({
      ...conn,
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
            <Icon icon="mdi:web-off" width={48} height={48} color="#9ca3af" style={{
          marginBottom: '1rem'
        }} />
            <p style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 600,
          color: '#1a1a1a'
        }}>
              No connection configured
            </p>
            <p style={{
          margin: '0.5rem 0 0 0',
          fontSize: '0.875rem'
        }}>
              Add an internet connection to get started.
            </p>
          </div> : sortedSites.map(siteName => {
        const siteConnections = allSitesWithGroups[siteName] || [];
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
          }} onDragOver={e => handleSiteDragOver(e, siteName)} onDrop={e => handleSiteDrop(e, siteName)}>
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
                      {siteConnections.length} connection{siteConnections.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
                  {siteConnections.length === 0 ? <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: '#f9fafb',
              border: '2px dashed #d1d5db',
              borderRadius: '10px',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
                      No connection on this site. Drag and drop a connection here.
                    </div> : siteConnections.map((connection, siteIndex) => {
              const i = connection.originalIndex;
              const isExpanded = expandedConnections.has(i);
              return <motion.div key={i} draggable onDragStart={e => handleDragStart(e, i)} onDragOver={e => handleDragOver(e, i)} onDrop={e => handleDrop(e, i)} onDragEnd={handleDragEnd} initial={{
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
                opacity: draggedIndex === i ? 0.5 : 1
              }}>
                          <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  background: isExpanded ? '#f9fafb' : 'transparent',
                  transition: 'background 0.2s ease'
                }} onClick={() => !isDragging && toggleConnectionExpansion(i)}>
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
                              {getConnectionIcon(connection.type)}
                              <div style={{
                      flex: 1
                    }}>
                                <div style={{
                        fontWeight: '600',
                        color: '#1a1a1a',
                        fontSize: '0.95rem',
                        marginBottom: '0.25rem'
                      }}>
                                  {connection.type} - {connection.fournisseur || `Connection ${i + 1}`}
                                </div>
                                <div style={{
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                                  {connection.categorie && <span>{connection.categorie}</span>}
                                  {formatInternetDebitDisplay(connection) && <span>• {formatInternetDebitDisplay(connection)}</span>}
                                  {connection.ip && <span>• {connection.ip}</span>}
                                </div>
                              </div>
                            </div>
                            <button onClick={e => {
                    e.stopPropagation();
                    removeConnection(i);
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

                          {isExpanded && <div style={{
                  padding: "1rem",
                  background: "#ffffff",
                  borderTop: "1px solid #e5e7eb"
                }}>
                              <InternetConnectionFields values={connection} onChange={nextValues => {
                    const updated = [...connections];
                    updated[i] = syncInternetLegacyDebit(nextValues);
                    setForm(prev => ({
                      ...prev,
                      equipements: {
                        ...prev.equipements,
                        Internet: updated
                      }
                    }));
                  }} idPrefix={`internet-edit-${i}`} showSite sites={allAvailableSites.filter(site => site !== "No site")} />
                            </div>}
                        </motion.div>;
            })}
                </div>
              </div>;
      })}
      </div>

      {}
      {showTypeModalState && <div className={equipmentModalStyles.modalOverlay} onClick={() => setShowTypeModalState(false)}>
          <div className={internetFormStyles.internetFormShell} onClick={e => e.stopPropagation()}>
            <div className={equipmentModalStyles.modalHeader}>
              <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
                <Icon icon="mdi:web" className={equipmentModalStyles.modalIcon} style={{
              color: "#3b82f6"
            }} />
                <h3 style={{
              margin: 0
            }}>Add an internet connection</h3>
              </div>
              <button className={equipmentModalStyles.closeButton} onClick={() => setShowTypeModalState(false)} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            <div className={internetFormStyles.internetFormBody}>
              <nav className={internetFormStyles.internetFormNav} aria-label="Form sections">
                {INTERNET_DRAFT_FORM_SECTIONS.map(section => <button key={section.id} type="button" className={`${formStyles.navItem} ${activeDraftSection === section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveDraftSection(section.id)} aria-current={activeDraftSection === section.id ? "step" : undefined}>
                    <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                    <span className={formStyles.navItemText}>
                      <span className={`${formStyles.navItemLabel} ${draftSectionNav.requiredIncomplete[section.id] ? formStyles.navItemLabelRequired : ""}`}>
                        {section.label}
                      </span>
                      <span className={formStyles.navItemHint}>{section.description}</span>
                    </span>
                    {draftSectionNav.complete[section.id] ? <span className={formStyles.navBadge}>✓</span> : null}
                  </button>)}
              </nav>

              <div className={internetFormStyles.internetFormContent}>
                {INTERNET_DRAFT_FORM_SECTIONS.filter(s => s.id === activeDraftSection).map(section => <div key={section.id}>
                    <div className={formStyles.sectionHead}>
                      <h3 className={formStyles.sectionTitle}>{section.label}</h3>
                      <p className={formStyles.sectionDesc}>{section.description}</p>
                    </div>
                    {section.id === "internetType" ? <InternetTypePicker value={draftConnection.type ?? ""} onChange={nextType => setDraftConnection(prev => ({
                ...prev,
                type: nextType
              }))} /> : <InternetConnectionFields values={draftConnection} onChange={setDraftConnection} idPrefix="internet-draft" section={section.id} showSite={section.id === "internetLink"} sites={Array.isArray(form.sites) ? form.sites : []} />}
                  </div>)}
              </div>
            </div>

            <div className={equipmentModalStyles.modalFooter}>
              <button type="button" className={equipmentModalStyles.secondaryButton} onClick={() => setShowTypeModalState(false)}>
                Cancel
              </button>
              <button type="button" className={equipmentModalStyles.primaryButton} onClick={submitDraftConnection}>
                Add connection
              </button>
            </div>
          </div>
        </div>}
    </motion.div>;
};
export default StepInternet;
