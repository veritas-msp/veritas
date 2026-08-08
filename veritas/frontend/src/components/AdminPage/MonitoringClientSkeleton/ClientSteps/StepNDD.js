import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { FaGlobe } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../../config";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import { mapOvhApiDomainToMonitored } from "../../../EnterprisesPage/domainSolutionUtils";
const StepNDD = ({
  form,
  setForm,
  onAdd,
  onImport,
  currentStepData
}) => {
  const domains = form.equipements.NDD || [];
  const bottomRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showOvhModal, setShowOvhModal] = useState(false);
  const [ovhDomains, setOvhDomains] = useState([]);
  const [loadingOvhDomains, setLoadingOvhDomains] = useState(false);
  const [selectedOvhDomains, setSelectedOvhDomains] = useState(new Set());
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
    setDragOverIndex(index);
  };
  const handleDragLeave = e => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
      return;
    }
    const updated = [...domaines];
    const draggedItem = updated[draggedIndex];
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
        NDD: updated
      }
    }));
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };
  const handleDragEnd = e => {
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };
  const formatDate = dateString => {
    if (!dateString) return "";
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}-${month}-${year}`;
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };
  const update = (index, field, value) => {
    const updated = [...domaines];
    updated[index][field] = value;
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NDD: updated
      }
    }));
  };
  const remove = index => {
    const updated = [...domaines];
    updated.splice(index, 1);
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NDD: updated
      }
    }));
  };
  const add = () => {
    const newEntry = {
      nom: "",
      expiration: "",
      registrar: ""
    };
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NDD: [...domaines, newEntry]
      }
    }));
  };
  useEffect(() => {
    if (onAdd && currentStepData?.key === 'ndd') {
      onAdd[currentStepData.key] = () => {
        add();
      };
    }
    if (onImport && currentStepData?.key === 'ndd') {
      onImport[currentStepData.key] = () => {
        handleOpenOvhModal();
      };
    }
  }, [onAdd, onImport, currentStepData]);
  const loadOvhDomains = async () => {
    setLoadingOvhDomains(true);
    setOvhDomains([]);
    setSelectedOvhDomains(new Set());
    try {
      const response = await fetch(`${API_BASE_URL}/ovh/domains`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Error: ${errorData.error || `HTTP ${response.status}`}`);
        return;
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.domains)) {
        setOvhDomains(data.domains);
        if (data.domains.length === 0) {
          toast.info("No domains found in your OVH account");
        } else {
          toast.success(`${data.domains.length} domain(s) loaded`);
        }
      } else {
        toast.error(data.error || 'Unable to load OVH domains');
      }
    } catch (err) {
      console.error('Erreur chargement domains OVH:', err);
      toast.error("Error loading OVH domains");
    } finally {
      setLoadingOvhDomains(false);
    }
  };
  const handleOpenOvhModal = () => {
    setShowOvhModal(true);
    loadOvhDomains();
  };
  const handleCloseOvhModal = () => {
    setShowOvhModal(false);
    setOvhDomains([]);
    setSelectedOvhDomains(new Set());
  };
  const toggleDomainSelection = domainName => {
    setSelectedOvhDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainName)) {
        next.delete(domainName);
      } else {
        next.add(domainName);
      }
      return next;
    });
  };
  const handleImportOvhDomains = () => {
    if (selectedOvhDomains.size === 0) {
      toast.error("Please select at least one domain");
      return;
    }
    const existingDomains = new Set(domaines.map(d => d.nom?.toLowerCase()));
    const domainsToImport = ovhDomains.filter(domain => {
      const domainName = domain.domain || domain.name || domain;
      return selectedOvhDomains.has(domainName) && !existingDomains.has(domainName.toLowerCase());
    }).map(domain => mapOvhApiDomainToMonitored(domain));
    if (domainsToImport.length === 0) {
      toast.info("All selected domains are already in the list");
      return;
    }
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        NDD: [...domaines, ...domainsToImport]
      }
    }));
    toast.success(`${domainsToImport.length} domain(s) imported successfully`);
    handleCloseOvhModal();
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
          {domaines.length === 0 ? <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No domain names configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add a domain" to get started
              </p>
            </div> : domains.map((domaine, i) => <motion.div key={i} draggable onDragStart={e => handleDragStart(e, i)} onDragOver={e => {
          e.preventDefault();
          handleDragOver(e, i);
        }} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, i)} onDragEnd={handleDragEnd} className={`${styles.serverCard} ${draggedIndex === i ? styles.dragging : ''} ${dragOverIndex === i ? styles.dragOver : ''}`} initial={{
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
              <div className={`${styles.serverHeader} ${expandedItems.has(i) ? styles.serverHeaderExpanded : ''}`} onClick={() => toggleItemExpansion(i)} style={{
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
                    <FaGlobe style={{
                  fontSize: '1rem',
                  color: '#13BA8E'
                }} />
                    {domaine.nom || `Domain #${i + 1}`}
                  </h4>
                  <span className={styles.serverType}>
                    {[domaine.nom, domain.registrar, domain.expiration && formatDate(domaine.expiration)].filter(Boolean).join(' / ')}
                  </span>
                </div>
                <div className={styles.serverActions}>
                  <button className={styles.deleteButton} onClick={e => {
                e.stopPropagation();
                remove(i);
              }} title="Delete this domain">
                    ×
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
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label htmlFor={`ndd-nom-${i}`}>Domain name *</label>
                      <input id={`ndd-nom-${i}`} value={domaine.nom} onChange={e => update(i, "nom", e.target.value)} required />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`ndd-registrar-${i}`}>Registrar</label>
                      <input id={`ndd-registrar-${i}`} value={domaine.registrar || ""} onChange={e => update(i, "registrar", e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`ndd-expiration-${i}`}>Expiration date</label>
                      <input id={`ndd-expiration-${i}`} type="date" value={domaine.expiration} onChange={e => update(i, "expiration", e.target.value)} />
                    </div>
                  </div>
                </motion.div>}
            </motion.div>)}
          <div ref={bottomRef} />
        </div>
      </div>

      {}
      {showOvhModal && <div className={adminStyles.modalOverlay} onClick={handleCloseOvhModal}>
          <div className={adminStyles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '800px',
        padding: 0
      }}>
            <div style={{
          padding: '1rem 1.25rem',
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
                <Icon icon="mdi:cloud-download" style={{
              fontSize: '24px',
              color: '#15d1a0'
            }} />
                <div>
                  <h3 style={{
                margin: 0,
                fontSize: '1.08rem',
                fontWeight: 700,
                color: '#1a1a1a',
                textAlign: 'left'
              }}>
                    Import OVH domains
                  </h3>
                  <span style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'left'
              }}>
                    Select domains to import
                  </span>
                </div>
              </div>
              <button className={adminStyles.closeButton} onClick={handleCloseOvhModal} title="Close" style={{
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
          padding: '1rem 1.25rem',
          background: '#ffffff',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
              {loadingOvhDomains ? <div style={{
            textAlign: 'center',
            padding: '2rem'
          }}>
                  <Icon icon="mdi:loading" className={styles.loading} style={{
              fontSize: '2rem',
              color: '#15d1a0',
              marginBottom: '1rem'
            }} />
                  <p style={{
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>Loading domains...</p>
                </div> : ovhDomains.length === 0 ? <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
                  <Icon icon="mdi:cloud-off-outline" style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              opacity: 0.5
            }} />
                  <p style={{
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: 600,
              color: '#1a1a1a'
            }}>No domains found</p>
                  <p style={{
              fontSize: '0.875rem',
              opacity: 0.7
            }}>
                    Check your OVH credentials in settings.
                  </p>
                </div> : <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem'
          }}>
                  {ovhDomains.map((domain, index) => {
              const domainName = domain.domain || domain.name || domain;
              const domainKey = typeof domain === 'string' ? domain : domainName;
              const isSelected = selectedOvhDomains.has(domainName);
              const expiration = domain.expiration || domain.expirationDate || '';
              const registrar = domain.registrar || 'OVH';
              return <motion.button key={domainKey || index} onClick={() => toggleDomainSelection(domainName)} initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.2
              }} style={{
                border: isSelected ? '2px solid #15d1a0' : '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.75rem',
                background: isSelected ? '#f0fdfa' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                width: '100%'
              }} onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0fdfa';
                e.currentTarget.style.borderColor = '#15d1a0';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(21, 209, 160, 0.15)';
              }} onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = isSelected ? '#f0fdfa' : '#ffffff';
                e.currentTarget.style.borderColor = isSelected ? '#15d1a0' : '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                        <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                          <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                            <span style={{
                      fontWeight: 600,
                      color: '#1a1a1a',
                      fontSize: '0.875rem',
                      wordBreak: 'break-word'
                    }}>
                              {domainName}
                            </span>
                            {isSelected && <Icon icon="mdi:check-circle" style={{
                      fontSize: '18px',
                      color: '#15d1a0',
                      flexShrink: 0
                    }} />}
                          </div>
                          <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    fontSize: '0.7rem',
                    color: '#6b7280'
                  }}>
                            <span>{registrar}</span>
                            {expiration && <span>• Expires on {formatDate(expiration)}</span>}
                          </div>
                        </div>
                      </motion.button>;
            })}
                </div>}
            </div>
            {!loadingOvhDomains && ovhDomains.length > 0 && <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid #e5e7eb',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
                <span style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
                  {selectedOvhDomains.size} domain(s) selected
                </span>
                <div style={{
            display: 'flex',
            gap: '0.75rem'
          }}>
                  <button onClick={handleCloseOvhModal} style={{
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#1a1a1a',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }} onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#9ca3af';
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }} onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}>
                    Cancel
                  </button>
                  <button onClick={handleImportOvhDomains} disabled={selectedOvhDomains.size === 0 || loadingOvhDomains} style={{
              background: selectedOvhDomains.size === 0 || loadingOvhDomains ? '#9CA3AF' : '#15d1a0',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              border: 'none',
              cursor: selectedOvhDomains.size === 0 || loadingOvhDomains ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }} onMouseEnter={e => {
              if (selectedOvhDomains.size > 0 && !loadingOvhDomains) {
                e.currentTarget.style.backgroundColor = '#13ba8e';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(21, 209, 160, 0.3)';
              }
            }} onMouseLeave={e => {
              if (selectedOvhDomains.size > 0 && !loadingOvhDomains) {
                e.currentTarget.style.backgroundColor = '#15d1a0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}>
                    <Icon icon="mdi:download" width={16} height={16} />
                    Import ({selectedOvhDomains.size})
                  </button>
                </div>
              </div>}
          </div>
        </div>}
    </motion.div>;
};
export default StepNDD;
