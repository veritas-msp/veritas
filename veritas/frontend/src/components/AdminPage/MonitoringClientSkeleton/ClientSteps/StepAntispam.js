import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import { getIconPath } from "../../../../utils/assetHelper";
const StepAntispam = ({
  form,
  setForm,
  onAdd,
  currentStepData
}) => {
  const bottomRef = useRef(null);
  const [expandedSolutions, setExpandedSolutions] = useState(new Set());
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  useEffect(() => {
    if (onAdd && currentStepData?.key === 'antispam') {
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
  const getAntispamData = () => {
    const antispam = form?.equipements?.Antispam;
    if (!antispam || !antispam.solutions || !Array.isArray(antispam.solutions)) {
      return {
        solutions: []
      };
    }
    return {
      solutions: antispam.solutions
    };
  };
  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Antispam: {
          ...prev.equipements?.Antispam,
          [field]: value
        }
      }
    }));
  };
  const antispamData = getAntispamData();
  const solutions = antispamData.solutions || [];
  const toggleSolutionExpansion = index => {
    const newExpanded = new Set(expandedSolutions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSolutions(newExpanded);
  };
  const addSolution = solutionName => {
    const currentAntispam = getAntispamData();
    const newSolution = {
      id: Date.now(),
      logiciel: solutionName,
      expiration: "",
      usersProteges: 0,
      domainsSurveilles: 0
    };
    const updatedSolutions = [...currentAntispam.solutions, newSolution];
    updateField("solutions", updatedSolutions);
    setShowSolutionModal(false);
  };
  const removeSolution = index => {
    const currentAntispam = getAntispamData();
    const updatedSolutions = [...currentAntispam.solutions];
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
    const currentAntispam = getAntispamData();
    const updatedSolutions = [...currentAntispam.solutions];
    updatedSolutions[index] = {
      ...updatedSolutions[index],
      [field]: value
    };
    updateField("solutions", updatedSolutions);
  };
  const updateSolutionNumber = (index, field, value) => {
    const number = parseInt(value, 10) || 0;
    updateSolution(index, field, number);
  };
  const getSolutionIcon = solutionName => {
    if (solutionName === "Mail In Black") {
      return <img src={getIconPath('mailinblack.png')} alt="Mail In Black" style={{
        width: '20px',
        height: '20px',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px'
      }} />;
    } else if (solutionName === "Vade Secure") {
      return <img src={getIconPath('vade.png')} alt="Vade Secure" style={{
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
              <p className={styles.emptyStateTitle}>No antispam solution configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add a solution" to get started
              </p>
            </div> : solutions.map((solution, i) => {
          const totalUtilisation = (solution.utilisateursProteges || 0) + (solution.domainesSurveilles || 0);
          return <motion.div key={i} className={styles.serverCard} initial={{
            opacity: 0,
            scale: 0.98
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            duration: 0.3
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
                    {[solution.logiciel, solution.expiration && formatDate(solution.expiration), solution.domainesSurveilles > 0 && `${solution.domainesSurveilles} domain${solution.domainesSurveilles > 1 ? 's' : ''}`, solution.utilisateursProteges > 0 && `${solution.utilisateursProteges} user${solution.utilisateursProteges > 1 ? 's' : ''}`].filter(Boolean).join(' • ')}
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

              {}
              {expandedSolutions.has(i) && <motion.div className={styles.serverForm} style={{
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
                  <div className={styles.formGrid} style={{
                gridTemplateColumns: '1fr 1fr 1fr'
              }}>
                    <div className={styles.formField}>
                      <label htmlFor={`solution-expiration-${i}`}>License expiration</label>
                      <input id={`solution-expiration-${i}`} type="date" value={solution.expiration || ""} onChange={e => updateSolution(i, "expiration", e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`solution-users-${i}`}>Protected users</label>
                      <input id={`solution-users-${i}`} type="number" min="0" value={solution.utilisateursProteges || ""} onChange={e => updateSolutionNumber(i, "utilisateursProteges", e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={`solution-domains-${i}`}>Monitored domains</label>
                      <input id={`solution-domains-${i}`} type="number" min="0" value={solution.domainesSurveilles || ""} onChange={e => updateSolutionNumber(i, "domainesSurveilles", e.target.value)} />
                    </div>
                  </div>
                </motion.div>}
            </motion.div>;
        })}
          <div ref={bottomRef} />
        </div>
      </div>

      {}
      {showSolutionModal && <div className={adminStyles.modalOverlay} onClick={() => setShowSolutionModal(false)}>
          <div className={adminStyles.modalContent} onClick={e => e.stopPropagation()} style={{
        maxWidth: '800px',
        padding: 0
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
                  <Icon icon="mdi:email-secure" style={{
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
                    Add an antispam solution
                  </h3>
                  <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                    Select the antispam solution type to configure
                  </p>
                </div>
              </div>
              <button className={adminStyles.closeButton} onClick={() => setShowSolutionModal(false)} title="Close" style={{
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
              type: "Mail In Black",
              label: "Mail In Black",
              description: "Professional antispam solution with advanced email threat protection",
              icon: getIconPath('mailinblack.png'),
              features: ["Email protection", "Advanced filtering", "Domain management"]
            }, {
              type: "Vade Secure",
              label: "Vade Secure",
              description: "Cloud-native antispam solution with AI and proactive protection",
              icon: getIconPath('vade.png'),
              features: ["Advanced AI", "Cloud protection", "Behavioral analysis"]
            }].map(({
              type,
              label,
              description,
              icon,
              features
            }) => <motion.button key={type} onClick={() => addSolution(type)} initial={{
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
                      <img src={icon} alt={label} style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: '8px'
                }} />
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
    </motion.div>;
};
export default StepAntispam;
