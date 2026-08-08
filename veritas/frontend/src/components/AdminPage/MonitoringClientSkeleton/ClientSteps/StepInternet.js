import React, { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
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
  const toggleConnectionExpansion = index => {
    const newExpanded = new Set(expandedConnections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConnections(newExpanded);
  };
  const updateConnection = (index, field, value) => {
    const updated = [...connections];
    updated[index][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Internet: updated
      }
    }));
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
  const addConnection = type => {
    const newConnection = {
      type,
      fournisseur: "",
      debit: "",
      ip: "",
      ipNoFixe: false,
      categorie: "Principale",
      site: ""
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Internet: [...connections, newConnection]
      }
    }));
    setShowTypeModalState(false);
    setTimeout(() => {
      setExpandedConnections(new Set([...expandedConnections, connections.length]));
    }, 100);
  };
  const connectionTypes = ["Fiber", "ADSL", "Cable", "4G", "5G", "Satellite", "Dedicated link", "Other"];
  const categorieOptions = ["Principale", "Backup"];
  const debitOptions = ["10 Mbps", "25 Mbps", "50 Mbps", "100 Mbps", "200 Mbps", "500 Mbps", "1 Gbps", "2 Gbps", "5 Gbps", "10 Gbps", "25 Gbps", "50 Gbps", "100 Gbps"];
  const getConnectionIcon = type => {
    const size = 24;
    const color = "#1a1a1a";
    const t = (type || "").toLowerCase();
    if (t.includes("fibre") || t.includes("fiber")) {
      return <Icon icon="streamline-ultimate:fiber-access-1" width={size} height={size} color={color} />;
    }
    if (t.includes("5g")) {
      return <Icon icon="material-symbols:5g-mobiledata-badge" width={size} height={size} color={color} />;
    }
    if (t.includes("4g") || t.includes("lte")) {
      return <Icon icon="material-symbols:4g-mobiledata-badge" width={size} height={size} color={color} />;
    }
    if (t.includes("adsl") || t.includes("dsl") || t.includes("cable") || t.includes("cable")) {
      return <Icon icon="mdi:ethernet-cable" width={size} height={size} color={color} />;
    }
    if (t.includes("satellite")) {
      return <Icon icon="tabler:satellite" width={size} height={size} color={color} />;
    }
    if (t.includes("liaison")) {
      return <Icon icon="mdi:lan" width={size} height={size} color={color} />;
    }
    return <Icon icon="mdi:router-wireless" width={size} height={size} color={color} />;
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
              No connections configured
            </p>
            <p style={{
          margin: '0.5rem 0 0 0',
          fontSize: '0.875rem'
        }}>
              Add an Internet connection to get started.
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
                      No connections in this site. Drag and drop a connection here.
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
                                  {connection.debit && <span>• {connection.debit}</span>}
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
                  padding: '1rem',
                  background: '#ffffff',
                  borderTop: '1px solid #e5e7eb'
                }}>
                              <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
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
                                    Category
                                  </label>
                                  <select value={connection.categorie} onChange={e => updateConnection(i, 'categorie', e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }}>
                                    {categorieOptions.map(categorie => <option key={categorie} value={categorie}>{categorie}</option>)}
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
                                    Provider <span style={{
                          color: '#ef4444'
                        }}>*</span>
                                  </label>
                                  <input type="text" value={connection.fournisseur} onChange={e => updateConnection(i, 'fournisseur', e.target.value)} placeholder="Ex: Orange, SFR..." style={{
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
                                    Theoretical bandwidth
                                  </label>
                                  <select value={connection.debit} onChange={e => updateConnection(i, 'debit', e.target.value)} style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#1a1a1a',
                        fontSize: '0.9rem'
                      }}>
                                    <option value="">Select bandwidth</option>
                                    {debitOptions.map(debit => <option key={debit} value={debit}>{debit}</option>)}
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
                                    Public IP
                                  </label>
                                  <div style={{
                        display: 'flex',
                        gap: '0.5rem'
                      }}>
                                    <input type="text" value={connection.ip} onChange={e => updateConnection(i, 'ip', e.target.value)} placeholder="Ex: 192.168.1.1" disabled={connection.ipNoFixe} style={{
                          flex: 1,
                          padding: '0.6rem 0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          background: connection.ipNoFixe ? '#f3f4f6' : '#ffffff',
                          color: connection.ipNoFixe ? '#6b7280' : '#1a1a1a',
                          fontSize: '0.9rem',
                          opacity: connection.ipNoFixe ? 0.7 : 1
                        }} />
                                    <button type="button" onClick={() => {
                          const newValue = !connection.ipNoFixe;
                          const lastFixedIp = connection._lastFixedIp ?? connection.ip ?? '';
                          updateConnection(i, '_lastFixedIp', lastFixedIp);
                          updateConnection(i, 'ipNoFixe', newValue);
                          updateConnection(i, 'ip', newValue ? 'Non-fixed' : lastFixedIp);
                        }} style={{
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          border: `1px solid ${connection.ipNoFixe ? '#3b82f6' : '#e0e0e0'}`,
                          background: connection.ipNoFixe ? '#3b82f6' : '#ffffff',
                          color: connection.ipNoFixe ? '#ffffff' : '#1a1a1a',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease'
                        }}>
                                      Non-fixed IP
                                    </button>
                                  </div>
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
                <Icon icon="mdi:web" className={adminStyles.modalIcon} style={{
              color: '#3b82f6'
            }} />
                <h3>Add an Internet connection</h3>
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
              label: "Fiber",
              icon: "streamline-ultimate:fiber-access-1"
            }, {
              label: "ADSL",
              icon: "mdi:ethernet-cable"
            }, {
              label: "4G",
              icon: "material-symbols:4g-mobiledata-badge"
            }, {
              label: "5G",
              icon: "material-symbols:5g-mobiledata-badge"
            }, {
              label: "Satellite",
              icon: "tabler:satellite"
            }].map(({
              label,
              icon
            }) => <button key={label} onClick={() => addConnection(label)} style={{
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
        </div>}
    </motion.div>;
};
export default StepInternet;
