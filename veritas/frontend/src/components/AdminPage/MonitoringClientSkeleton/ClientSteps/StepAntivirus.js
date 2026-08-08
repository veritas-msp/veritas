import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import styles from "./Form.module.css";
import adminStyles from "../../AdminPanel.module.css";
import API_BASE_URL from "../../../../config";
import { getIconPath } from "../../../../utils/assetHelper";
const StepAntivirus = ({
  form,
  setForm,
  onAdd,
  currentStepData
}) => {
  const bottomRef = useRef(null);
  const [expandedSolutions, setExpandedSolutions] = useState(new Set());
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [syncingSolutions, setSyncingSolutions] = useState(new Set());
  const [showCompanySelectionModal, setShowCompanySelectionModal] = useState(false);
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  useEffect(() => {
    if (onAdd && currentStepData?.key === 'antivirus') {
      onAdd[currentStepData.key] = () => {
        setShowSolutionModal(true);
      };
    }
  }, [onAdd, currentStepData]);
  const getAuthHeaders = () => ({});
  if (!form) {
    return <div className={styles.stepContainer}>
        <div className={styles.formSection}>
          <p>Loading...</p>
        </div>
      </div>;
  }
  const getAntivirusData = () => {
    const antivirus = form?.equipements?.Antivirus;
    if (!antivirus || !antivirus.solutions || !Array.isArray(antivirus.solutions)) {
      return {
        solutions: []
      };
    }
    return {
      solutions: antivirus.solutions
    };
  };
  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      equipements: {
        ...prev.equipements,
        Antivirus: {
          ...prev.equipements?.Antivirus,
          [field]: value
        }
      }
    }));
  };
  const antivirusData = getAntivirusData();
  const solutions = antivirusData.solutions || [];
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
    const currentAntivirus = getAntivirusData();
    const newSolution = {
      id: Date.now(),
      solution: solutionName,
      licencesTotales: "",
      licencesUtilisees: "",
      expiration: "",
      companyId: ""
    };
    const updatedSolutions = [...currentAntivirus.solutions, newSolution];
    updateField("solutions", updatedSolutions);
    setShowSolutionModal(false);
  };
  const removeSolution = index => {
    const currentAntivirus = getAntivirusData();
    const updatedSolutions = [...currentAntivirus.solutions];
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
    const currentAntivirus = getAntivirusData();
    const updatedSolutions = [...currentAntivirus.solutions];
    updatedSolutions[index] = {
      ...updatedSolutions[index],
      [field]: value
    };
    updateField("solutions", updatedSolutions);
  };
  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bitdefender/companies`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.companies) {
        console.log('🔍 Entreprises reçues de l\'API:', data.companies.length);
        console.log('📋 Détails des companies:', data.companies.map(c => ({
          id: c.id || c._id,
          name: c.name || c.companyName,
          hasId: !!(c.id || c._id)
        })));
        const uniqueCompanies = [];
        const seenIds = new Set();
        const skippedCompanies = [];
        data.companies.forEach((company, index) => {
          const companyId = company.id || company._id;
          const companyName = company.name || company.companyName || 'Unnamed company';
          if (companyId && !seenIds.has(companyId)) {
            seenIds.add(companyId);
            uniqueCompanies.push(company);
            console.log(`✅ Entreprise ajoutée: ${companyName} (ID: ${companyId})`);
          } else if (companyId && seenIds.has(companyId)) {
            console.log(`⚠️ Entreprise ignorée (doublon): ${companyName} (ID: ${companyId})`);
            skippedCompanies.push(company);
          } else if (!companyId) {
            const nameKey = companyName.toLowerCase().trim();
            if (!seenIds.has(nameKey)) {
              seenIds.add(nameKey);
              uniqueCompanies.push(company);
              console.log(`✅ Entreprise ajoutée (sans ID): ${companyName}`);
            } else {
              console.log(`⚠️ Entreprise ignorée (nom doublon): ${companyName}`);
              skippedCompanies.push(company);
            }
          }
        });
        console.log(`📊 Résultat: ${uniqueCompanies.length} companies uniques of ${data.companies.length} received`);
        if (skippedCompanies.length > 0) {
          console.log(`🚫 ${skippedCompanies.length} companies ignorées:`, skippedCompanies.map(c => c.name || c.companyName || 'Untitled'));
        }
        setCompanies(uniqueCompanies);
      } else {
        throw new Error(data.error || 'Error retrieving companies');
      }
    } catch (error) {
      console.error('❌ Erreur chargement companies BitDefender:', error);
      alert(`Error loading companies: ${error.message}`);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };
  const openCompanySelection = index => {
    setSelectedSolutionIndex(index);
    setShowCompanySelectionModal(true);
    loadCompanies();
  };
  const selectCompanyAndSync = async (companyId, companyName) => {
    if (selectedSolutionIndex === null) return;
    const currentAntivirus = getAntivirusData();
    const solution = currentAntivirus.solutions[selectedSolutionIndex];
    const updatedSolutions = [...currentAntivirus.solutions];
    updatedSolutions[selectedSolutionIndex] = {
      ...updatedSolutions[selectedSolutionIndex],
      companyId: companyId,
      companyName: companyName
    };
    updateField("solutions", updatedSolutions);
    setShowCompanySelectionModal(false);
    setSelectedSolutionIndex(null);
    await syncBitdefenderSolution(selectedSolutionIndex, companyId, companyName);
  };
  const syncBitdefenderSolution = async (index, companyIdOverride = null, companyNameOverride = null) => {
    const currentAntivirus = getAntivirusData();
    const solution = currentAntivirus.solutions[index];
    const companyId = companyIdOverride || solution.companyId;
    const existingCompanyName = companyNameOverride || solution.companyName || "";
    if (!companyId || companyId.trim() === "") {
      alert("Please enter the BitDefender company ID before syncing.");
      return;
    }
    setSyncingSolutions(new Set([...syncingSolutions, index]));
    try {
      const response = await fetch(`${API_BASE_URL}/bitdefender/sync/${companyId}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        const updatedSolutions = [...currentAntivirus.solutions];
        const endpointsList = data.data.endpoints?.list || [];
        let licencesTotales = "";
        let licencesUtilisees = "";
        let expirationDate = "";
        if (data.data.license) {
          const license = data.data.license;
          if (license.totalLicenses !== null && license.totalLicenses !== undefined) {
            licencesTotales = String(license.totalLicenses);
          }
          if (license.usedLicenses !== null && license.usedLicenses !== undefined) {
            licencesUtilisees = String(license.usedLicenses);
          }
          if ((!licencesTotales || !licencesUtilisees) && license.raw) {
            const raw = license.raw;
            if (!licencesTotales) {
              if (raw.totalSlots !== null && raw.totalSlots !== undefined) {
                licencesTotales = String(raw.totalSlots);
              } else if (raw.slots && typeof raw.slots === 'object' && raw.slots.total !== undefined) {
                licencesTotales = String(raw.slots.total);
              }
            }
            if (!licencesUtilisees) {
              if (raw.usedSlots !== null && raw.usedSlots !== undefined) {
                licencesUtilisees = String(raw.usedSlots);
              } else if (raw.slots && typeof raw.slots === 'object' && raw.slots.used !== undefined) {
                licencesUtilisees = String(raw.slots.used);
              }
            }
          }
          const rawDate = license.expirationDate;
          if (rawDate) {
            if (typeof rawDate === 'number') {
              const expDate = new Date(rawDate > 1000000000000 ? rawDate : rawDate * 1000);
              if (!isNaN(expDate.getTime())) {
                expirationDate = expDate.toISOString().split('T')[0];
              }
            } else {
              const dateStr = String(rawDate);
              const expDate = new Date(dateStr);
              if (!isNaN(expDate.getTime())) {
                expirationDate = expDate.toISOString().split('T')[0];
              } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                expirationDate = dateStr.split('T')[0].split(' ')[0];
              }
            }
          } else {
            if (license.raw) {
              const rawLicense = license.raw;
              const possibleDateFields = ['expiration', 'expirationDate', 'expiryDate', 'expires', 'validUntil', 'endDate', 'validUntilDate'];
              for (const field of possibleDateFields) {
                if (rawLicense[field]) {
                  const rawDateValue = rawLicense[field];
                  const expDate = new Date(rawDateValue);
                  if (!isNaN(expDate.getTime())) {
                    expirationDate = expDate.toISOString().split('T')[0];
                    break;
                  }
                }
              }
            }
          }
        }
        let companyName = existingCompanyName || solution.companyName || "";
        if (data.data && data.data.company) {
          const apiCompanyName = data.data.company.name || data.data.company.companyName || data.data.company.company || null;
          if (apiCompanyName) {
            companyName = apiCompanyName;
          }
        }
        updatedSolutions[index] = {
          ...updatedSolutions[index],
          companyId: companyId,
          companyName: companyName,
          licencesTotales: licencesTotales || solution.licencesTotales || "",
          licencesUtilisees: licencesUtilisees || solution.licencesUtilisees || "",
          expiration: expirationDate || solution.expiration || "",
          endpoints: endpointsList.map(ep => ({
            id: ep.id,
            name: ep.name || 'Untitled',
            ip: ep.ip || '',
            type: ep.type || 'autre',
            machineType: ep.machineType,
            operatingSystem: ep.operatingSystem || '',
            fqdn: ep.fqdn || '',
            isManaged: ep.isManaged || false
          })),
          syncData: {
            license: data.data.license || null,
            endpoints: data.data.endpoints || null,
            company: data.data.company || null,
            monthlyUsage: data.data.monthlyUsage || null,
            physicalEndpoints: data.data.endpoints?.physical || 0,
            virtualEndpoints: data.data.endpoints?.virtual || 0,
            totalEndpoints: data.data.endpoints?.total || 0,
            lastSync: new Date().toISOString()
          }
        };
        updateField("solutions", updatedSolutions);
        toast.success(`✅ Sync successful for ${solution.companyName || solution.solution}: ${endpointsList.length} endpoint(s) retrieved`);
      } else {
        throw new Error(data.error || 'Error during sync');
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation BitDefender:', error);
      toast.error(`❌ Error during sync: ${error.message}`);
    } finally {
      const newSyncing = new Set(syncingSolutions);
      newSyncing.delete(index);
      setSyncingSolutions(newSyncing);
    }
  };
  const getSolutionIcon = solutionName => {
    if (solutionName === "GravityZone BitDefender") {
      return <img src={getIconPath('bitdefender.png')} alt="BitDefender" style={{
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
              <p className={styles.emptyStateTitle}>No antivirus solution configured</p>
              <p className={styles.emptyStateDescription}>
                Click "Add a solution" to get started
              </p>
            </div> : solutions.map((solution, i) => <motion.div key={i} className={styles.serverCard} initial={{
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
                    {getSolutionIcon(solution.solution)}
                    {solution.solution || `Solution #${i + 1}`}
                  </h4>
                  <span className={styles.serverType}>
                    {[solution.solution, solution.licencesTotales && `${solution.licencesTotales} licence${solution.licencesTotales > 1 ? 's' : ''}`, solution.expiration && formatDate(solution.expiration), solution.companyId && `Company ID: ${solution.companyId}`].filter(Boolean).join(' • ')}
                  </span>
          </div>
                <div className={styles.serverActions}>
                  {solution.solution === "GravityZone BitDefender" && <>
                      {solution.companyId ? <button className={styles.addButtonDiscret} onClick={e => {
                  e.stopPropagation();
                  syncBitdefenderSolution(i);
                }} disabled={syncingSolutions.has(i)} title={syncingSolutions.has(i) ? 'Sync in progress' : 'Re-sync'} style={{
                  opacity: syncingSolutions.has(i) ? 0.6 : 1,
                  cursor: syncingSolutions.has(i) ? 'wait' : 'pointer',
                  marginRight: '0.5rem',
                  padding: '0.5rem',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed transparent',
                  borderRadius: '6px',
                  background: 'transparent',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  if (!syncingSolutions.has(i)) {
                    e.currentTarget.style.borderColor = '#15d1a0';
                    e.currentTarget.style.borderStyle = 'dashed';
                  }
                }} onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.borderStyle = 'dashed';
                }}>
                          {syncingSolutions.has(i) ? <Icon icon="mdi:loading" className={styles.loading} style={{
                    color: '#15d1a0'
                  }} /> : <Icon icon="mdi:cloud-sync" style={{
                    color: '#6b7280',
                    fontSize: '20px'
                  }} />}
                        </button> : <button className={styles.addButtonDiscret} onClick={e => {
                  e.stopPropagation();
                  openCompanySelection(i);
                }} disabled={syncingSolutions.has(i)} title={syncingSolutions.has(i) ? 'Sync in progress' : 'Sync'} style={{
                  opacity: syncingSolutions.has(i) ? 0.6 : 1,
                  cursor: syncingSolutions.has(i) ? 'wait' : 'pointer',
                  marginRight: '0.5rem',
                  padding: '0.5rem',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed transparent',
                  borderRadius: '6px',
                  background: 'transparent',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  if (!syncingSolutions.has(i)) {
                    e.currentTarget.style.borderColor = '#15d1a0';
                    e.currentTarget.style.borderStyle = 'dashed';
                  }
                }} onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.borderStyle = 'dashed';
                }}>
                          {syncingSolutions.has(i) ? <Icon icon="mdi:loading" className={styles.loading} style={{
                    color: '#15d1a0'
                  }} /> : <Icon icon="mdi:cloud-sync" style={{
                    color: '#6b7280',
                    fontSize: '20px'
                  }} />}
                        </button>}
                    </>}
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
              gridTemplateColumns: '1fr 1fr'
            }}>
          <div className={styles.formField}>
            <label htmlFor={`solution-company-name-${i}`}>Company name</label>
            <input id={`solution-company-name-${i}`} type="text" value={solution.companyName || ""} disabled style={{
                  backgroundColor: "#f3f4f6",
                  cursor: "not-allowed",
                  opacity: 0.7
                }} />
          </div>
          <div className={styles.formField}>
            <label htmlFor={`solution-company-id-${i}`}>Company ID</label>
            <input id={`solution-company-id-${i}`} type="text" value={solution.companyId || ""} disabled style={{
                  backgroundColor: "#f3f4f6",
                  cursor: "not-allowed",
                  opacity: 0.7
                }} />
          </div>
        </div>
        <div className={styles.formGrid} style={{
              gridTemplateColumns: '1fr 1fr 1fr'
            }}>
          <div className={styles.formField}>
            <label htmlFor={`solution-licences-totales-${i}`}>Total licenses</label>
            <input id={`solution-licences-totales-${i}`} type="number" min="0" value={solution.licencesTotales || ""} onChange={e => updateSolution(i, "licencesTotales", e.target.value)} />
          </div>
          <div className={styles.formField}>
            <label htmlFor={`solution-licences-utilisees-${i}`}>Used licenses</label>
            <input id={`solution-licences-utilisees-${i}`} type="number" min="0" value={solution.licencesUtilisees || ""} onChange={e => updateSolution(i, "licencesUtilisees", e.target.value)} />
          </div>
          <div className={styles.formField}>
            <label htmlFor={`solution-expiration-${i}`}>License expiration</label>
            <input id={`solution-expiration-${i}`} type="date" value={solution.expiration || ""} onChange={e => updateSolution(i, "expiration", e.target.value)} />
          </div>
        </div>
                </motion.div>}
            </motion.div>)}
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
                  <Icon icon="mdi:shield-check" style={{
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
                    Add an antivirus solution
                  </h3>
                  <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                    Select the antivirus solution type to configure
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
              type: "GravityZone BitDefender",
              label: "GravityZone BitDefender",
              description: "Enterprise antivirus solution with centralized management and automatic sync",
              icon: getIconPath('bitdefender.png'),
              features: ["Centralized management", "API sync", "License tracking"]
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

      {}
      {showCompanySelectionModal && <div className={adminStyles.modalOverlay} onClick={() => {
      setShowCompanySelectionModal(false);
      setSelectedSolutionIndex(null);
    }}>
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
                <Icon icon="mdi:office-building" style={{
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
                    Select a BitDefender company
                  </h3>
                  <span style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'left'
              }}>
                    Choose the company to link
                  </span>
                </div>
              </div>
              <button className={adminStyles.closeButton} onClick={() => {
            setShowCompanySelectionModal(false);
            setSelectedSolutionIndex(null);
          }} title="Close" style={{
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
              {loadingCompanies ? <div style={{
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
            }}>Loading companies...</p>
                </div> : companies.length === 0 ? <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
                  <Icon icon="mdi:office-building-outline" style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              opacity: 0.5
            }} />
                  <p style={{
              fontSize: '1rem',
              marginBottom: '0.5rem',
              fontWeight: 600,
              color: '#1a1a1a'
            }}>No companies found</p>
                  <p style={{
              fontSize: '0.875rem',
              opacity: 0.7
            }}>
                    Check your BitDefender API configuration.
                  </p>
                </div> : <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem'
          }}>
                  {companies.map(company => {
              const companyId = company.id || company._id;
              const companyName = company.name || company.companyName || 'Unnamed company';
              const companyEmail = company.email || company.contactEmail || null;
              const companyPhone = company.phone || company.contactPhone || null;
              const companyCountry = company.country || company.countryCode || null;
              const companyStatus = company.status || company.activeStatus || null;
              return <motion.button key={companyId} onClick={() => selectCompanyAndSync(companyId, companyName)} initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.2
              }} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.75rem',
                background: '#ffffff',
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
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
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
                              {companyName}
                            </span>
                            {companyStatus && <span style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      background: companyStatus === 'active' || companyStatus === 1 ? '#f0fdfa' : '#fef2f2',
                      color: companyStatus === 'active' || companyStatus === 1 ? '#15d1a0' : '#ef4444',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}>
                                {companyStatus === 'active' || companyStatus === 1 ? 'Active' : 'Inactive'}
                              </span>}
                          </div>
                          <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    fontSize: '0.7rem',
                    color: '#6b7280'
                  }}>
                            <span style={{
                      fontFamily: 'monospace'
                    }}>{companyId}</span>
                            {companyEmail && <span>• {companyEmail}</span>}
                            {companyPhone && <span>• {companyPhone}</span>}
                            {companyCountry && <span>• {companyCountry}</span>}
                          </div>
                        </div>
                        <Icon icon="mdi:chevron-right" style={{
                  fontSize: '18px',
                  color: '#9ca3af',
                  flexShrink: 0
                }} />
                      </motion.button>;
            })}
                </div>}
            </div>
          </div>
        </div>}
    </motion.div>;
};
export default StepAntivirus;
