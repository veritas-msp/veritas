import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Icon } from "@iconify/react";
import { createPortal } from "react-dom";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import { getIconPath } from "../../../../utils/assetHelper";
const StepTOIP = ({
  form,
  setForm,
  onAdd,
  currentStepData
}) => {
  const bottomRef = useRef(null);
  const [expandedSolutions, setExpandedSolutions] = useState(new Set());
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (onAdd && currentStepData?.key === 'toip') {
      onAdd[currentStepData.key] = () => {
        setShowSolutionModal(true);
      };
    }
  }, [onAdd, currentStepData]);
  if (!form) {
    return <div className={styles.stepContainer}>
        <div className={styles.formSection}>
          <p>Loading...</p>
        </div>
      </div>;
  }
  const getTOIPData = () => {
    const toip = form?.equipements?.TOIP;
    if (Array.isArray(toip) && toip.length > 0 && !toip[0].id) {
      return {
        solutions: [{
          id: Date.now(),
          logiciel: toip[0].logiciel || "",
          version: toip[0].version || "",
          expiration: toip[0].expiration || ""
        }]
      };
    }
    if (!toip || !toip.solutions || !Array.isArray(toip.solutions)) {
      return {
        solutions: []
      };
    }
    return {
      solutions: toip.solutions
    };
  };
  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        TOIP: {
          ...prev.equipements?.TOIP,
          [field]: value
        }
      }
    }));
  };
  const toipData = getTOIPData();
  const solutions = toipData.solutions || [];
  const toggleSolutionExpansion = index => {
    if (!isDragging) {
      const newExpanded = new Set(expandedSolutions);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      setExpandedSolutions(newExpanded);
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
    const currentTOIP = getTOIPData();
    const updated = [...currentTOIP.solutions];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    const newExpanded = new Set();
    expandedSolutions.forEach(oldIndex => {
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
    setExpandedSolutions(newExpanded);
    updateField("solutions", updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };
  const handleDragEnd = e => {
    setIsDragging(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    const card = e.currentTarget.closest(`.${styles.serverCard}`);
    if (card) {
      card.style.opacity = "1";
    }
  };
  const addSolution = solutionName => {
    const currentTOIP = getTOIPData();
    const existingCount = currentTOIP.solutions.filter(s => s.logiciel && s.logiciel.startsWith(solutionName)).length;
    const logicielName = existingCount === 0 ? solutionName : `${solutionName} #${existingCount + 1}`;
    const newSolution = {
      id: Date.now(),
      logiciel: logicielName,
      version: "",
      expiration: ""
    };
    const updatedSolutions = [...currentTOIP.solutions, newSolution];
    updateField("solutions", updatedSolutions);
    setShowSolutionModal(false);
  };
  const removeSolution = index => {
    const currentTOIP = getTOIPData();
    const updatedSolutions = [...currentTOIP.solutions];
    updatedSolutions.splice(index, 1);
    updateField("solutions", updatedSolutions);
    const newExpanded = new Set();
    expandedSolutions.forEach(idx => {
      if (Number(idx) < index) {
        newExpanded.add(idx);
      } else if (Number(idx) > index) {
        newExpanded.add(Number(idx) - 1);
      }
    });
    setExpandedSolutions(newExpanded);
  };
  const updateSolution = (index, field, value) => {
    const currentTOIP = getTOIPData();
    const updatedSolutions = [...currentTOIP.solutions];
    updatedSolutions[index] = {
      ...updatedSolutions[index],
      [field]: value
    };
    updateField("solutions", updatedSolutions);
  };
  const getSolutionIcon = solutionName => {
    if (solutionName && solutionName.startsWith("3CX")) {
      return <img src={getIconPath('3cx.png')} alt="3CX" style={{
        width: '20px',
        height: '20px',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px'
      }} />;
    }
    return null;
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
          {solutions.length === 0 ? <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No VoIP solution configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add a solution" to get started
              </p>
            </div> : solutions.map((solution, i) => <motion.div key={solution.id || i} draggable onDragStart={e => handleDragStart(e, i)} onDragOver={e => {
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
                <div className={`${styles.serverHeader} ${expandedSolutions.has(i) ? styles.serverHeaderExpanded : ''}`} onClick={() => toggleSolutionExpansion(i)} style={{
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
                      {getSolutionIcon(solution.logiciel)}
                      {solution.logiciel || `Solution #${i + 1}`}
                    </h4>
                    <span className={styles.serverType}>
                      {[solution.logiciel, solution.version, solution.expiration && formatDate(solution.expiration)].filter(Boolean).join(' / ')}
                    </span>
                  </div>
                  <div className={styles.serverActions}>
                    <button className={styles.deleteButton} onClick={e => {
                e.stopPropagation();
                removeSolution(i);
              }} title="Delete this solution">
                      ×
                    </button>
                  </div>
                </div>

                {expandedSolutions.has(i) && <motion.div className={styles.serverForm} initial={{
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
                        <label htmlFor={`toip-logiciel-${i}`}>Logiciel</label>
                        <input id={`toip-logiciel-${i}`} value={solution.logiciel || ""} disabled style={{
                  backgroundColor: "#f3f4f6",
                  cursor: "not-allowed",
                  opacity: 0.7
                }} />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`toip-version-${i}`}>Version</label>
                        <input id={`toip-version-${i}`} value={solution.version || ""} onChange={e => updateSolution(i, "version", e.target.value)} placeholder="Ex: 18.0, 2023" />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={`toip-expiration-${i}`}>License expiration</label>
                        <input id={`toip-expiration-${i}`} type="date" value={solution.expiration || ""} onChange={e => updateSolution(i, "expiration", e.target.value)} />
                      </div>
                    </div>
                  </motion.div>}
              </motion.div>)}
          <div ref={bottomRef} />
        </div>
      </div>

      {}
      {showSolutionModal && createPortal(<div className={adminStyles.modalOverlay} onClick={() => setShowSolutionModal(false)}>
          <div className={adminStyles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '500px'
      }}>
            <div className={adminStyles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mdi:phone" className={adminStyles.modalIcon} />
                <h3>Select a VoIP solution</h3>
              </div>
              <button className={adminStyles.closeButton} onClick={() => setShowSolutionModal(false)} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>
            <div className={adminStyles.modalBody}>
              <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: '1.5rem',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
                <button onClick={() => addSolution("3CX")} style={{
              width: '125px',
              height: '125px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }} onMouseEnter={e => {
              e.target.style.borderColor = '#13BA8E';
              e.target.style.backgroundColor = '#f0fdfa';
            }} onMouseLeave={e => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.backgroundColor = '#ffffff';
            }}>
                  <img src={getIconPath('3cx.png')} alt="3CX" style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px'
              }} />
                  <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                textAlign: 'center'
              }}>3CX</div>
                </button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </motion.div>;
};
export default StepTOIP;
