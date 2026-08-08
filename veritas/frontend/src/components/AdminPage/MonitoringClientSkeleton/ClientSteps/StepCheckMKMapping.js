import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaCheck, FaTimes, FaSync, FaSearch, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./Form.module.css";
import API_BASE_URL from "../../../../config";
import ConfirmationModal from "../../../Misc/ConfirmationModal/ConfirmationModal";
const StepCheckMKMapping = ({
  form,
  setForm
}) => {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkmkHosts, setCheckmkHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [checkmkConfigured, setCheckmkConfigured] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const getAllEquipments = () => {
    const equipments = [];
    const equipmentTypes = [{
      key: 'Serveurs',
      array: form.equipements?.Serveurs || []
    }, {
      key: 'Firewalls',
      array: form.equipements?.Firewalls || []
    }, {
      key: 'Switch',
      array: form.equipements?.Switch || []
    }, {
      key: 'BorneWifi',
      array: form.equipements?.BorneWifi || []
    }, {
      key: 'NAS',
      array: form.equipements?.NAS || []
    }];
    equipmentTypes.forEach(({
      key,
      array
    }) => {
      if (Array.isArray(array) && array.length > 0) {
        array.forEach(item => {
          const equipmentName = item.nom || item.name || 'Untitled';
          equipments.push({
            type: key,
            name: equipmentName,
            equipment_id: item.id,
            equipment: item
          });
        });
      }
    });
    return equipments;
  };
  useEffect(() => {
    const loadMappings = async () => {
      if (!form.id) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${form.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setMappings(data);
        } else if (response.status === 401) {} else {
          console.error('Erreur chargement mappings:', response.statusText);
        }
      } catch (error) {
        console.error('Erreur chargement mappings:', error);
      } finally {
        setLoading(false);
      }
    };
    const checkConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
          credentials: 'include'
        });
        if (response.ok) {
          setCheckmkConfigured(true);
        }
      } catch (error) {
        setCheckmkConfigured(false);
      }
    };
    loadMappings();
    checkConfig();
  }, [form.id]);
  const loadCheckMKHosts = async () => {
    setLoadingHosts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/hosts`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const hosts = data.value || data.items || data || [];
        setCheckmkHosts(hosts.map(host => host.id || host.name || host.hostname || host));
      } else {
        console.error('Erreur chargement hosts Check MK:', response.statusText);
      }
    } catch (error) {
      console.error('Erreur chargement hosts Check MK:', error);
    } finally {
      setLoadingHosts(false);
    }
  };
  const getMappingForEquipment = (equipmentType, equipmentId) => {
    return mappings.find(m => m.equipment_type === equipmentType && m.equipment_id === equipmentId);
  };
  const saveMapping = async (equipmentType, equipmentId, equipmentName, checkmkHostName, checkmkSite = '') => {
    if (!form.id || !checkmkHostName.trim()) return;
    setSaving(true);
    try {
      const existingMapping = getMappingForEquipment(equipmentType, equipmentId);
      const response = await fetch(`${API_BASE_URL}/checkmk/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          client_id: form.id,
          equipment_type: equipmentType,
          equipment_id: equipmentId,
          equipment_name: equipmentName,
          checkmk_host_name: checkmkHostName.trim(),
          checkmk_site: checkmkSite.trim() || null,
          is_active: true
        })
      });
      if (response.ok) {
        const newMapping = await response.json();
        if (existingMapping) {
          setMappings(mappings.map(m => m.id === existingMapping.id ? newMapping : m));
        } else {
          setMappings([...mappings, newMapping]);
        }
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error || 'Unable to save mapping'}`);
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Error saving mapping');
    } finally {
      setSaving(false);
    }
  };
  const deleteMapping = async mappingId => {
    setConfirmDeleteId(mappingId);
  };
  const confirmDeleteMapping = async () => {
    if (!confirmDeleteId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${confirmDeleteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setMappings(mappings.filter(m => m.id !== confirmDeleteId));
        toast.success('Mapping deleted successfully');
      } else {
        toast.error('Error deleting mapping');
      }
    } catch (error) {
      console.error('Erreur deletion mapping:', error);
      toast.error('Error deleting mapping');
    } finally {
      setConfirmDeleteId(null);
    }
  };
  const toggleExpansion = index => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };
  const equipments = getAllEquipments();
  const filteredEquipments = equipments.filter(eq => eq.name.toLowerCase().includes(searchTerm.toLowerCase()) || eq.type.toLowerCase().includes(searchTerm.toLowerCase()));
  if (!checkmkConfigured) {
    return <div style={{
      padding: '2rem',
      textAlign: 'center'
    }}>
        <FaExclamationTriangle style={{
        fontSize: '3rem',
        color: '#f59e0b',
        marginBottom: '1rem'
      }} />
        <h3 style={{
        marginBottom: '0.5rem'
      }}>Check MK not configured</h3>
        <p style={{
        color: 'var(--text-secondary)'
      }}>
          Please configure Check MK in global settings before creating mappings.
        </p>
      </div>;
  }
  if (equipments.length === 0) {
    return <div style={{
      padding: '2rem',
      textAlign: 'center'
    }}>
        <p style={{
        color: 'var(--text-secondary)'
      }}>
          No devices configured. Configure your devices (Servers, Firewalls, etc.) before creating Check MK mappings.
        </p>
      </div>;
  }
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3
  }} className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Check MK mapping</h2>
        <p className={styles.stepDescription}>
          Map your Veritas devices to Check MK hosts to automatically retrieve monitoring statistics.
        </p>
      </div>

      {}
      <div style={{
      marginBottom: '1.5rem'
    }}>
        <div style={{
        position: 'relative'
      }}>
          <FaSearch style={{
          position: 'absolute',
          left: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-secondary)'
        }} />
          <input type="text" placeholder="Search for a device..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{
          width: '100%',
          padding: '0.75rem 1rem 0.75rem 2.5rem',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }} />
        </div>
      </div>

      {}
      <div style={{
      marginBottom: '1rem',
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center'
    }}>
        <button type="button" onClick={loadCheckMKHosts} disabled={loadingHosts} style={{
        padding: '0.5rem 1rem',
        background: 'var(--accent-primary)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: loadingHosts ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
          <FaSync style={{
          animation: loadingHosts ? 'spin 1s linear infinite' : 'none'
        }} />
          {loadingHosts ? 'Loading...' : 'Load Check MK hosts'}
        </button>
        {checkmkHosts.length > 0 && <span style={{
        color: 'var(--text-secondary)',
        fontSize: '0.875rem'
      }}>
            {checkmkHosts.length} host(s) available
          </span>}
      </div>

      {}
      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
        {loading ? <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--text-secondary)'
      }}>
            Loading mappings...
          </div> : filteredEquipments.length === 0 ? <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--text-secondary)'
      }}>
            No devices found
          </div> : filteredEquipments.map((equipment, index) => {
        const mapping = getMappingForEquipment(equipment.type, equipment.equipment_id);
        const isExpanded = expandedItems.has(index);
        return <motion.div key={`${equipment.type}-${equipment.name}-${index}`} initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.05
        }} style={{
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          overflow: 'hidden'
        }}>
                {}
                <div style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: isExpanded ? 'var(--bg-tertiary)' : 'transparent',
            transition: 'background 0.2s'
          }} onClick={() => toggleExpansion(index)}>
                  <div style={{
              flex: 1
            }}>
                    <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.25rem'
              }}>
                      <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}>
                        {equipment.type}
                      </span>
                      <strong style={{
                  color: 'var(--text-primary)'
                }}>{equipment.name}</strong>
                    </div>
                    {mapping && <div style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem'
              }}>
                        <FaCheck style={{
                  color: '#10b981',
                  marginRight: '0.25rem'
                }} />
                        Mapped to: <strong>{mapping.checkmk_host_name}</strong>
                        {mapping.checkmk_site && ` (Site: ${mapping.checkmk_site})`}
                      </div>}
                  </div>
                  <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
                    {mapping && <button type="button" onClick={e => {
                e.stopPropagation();
                deleteMapping(mapping.id);
              }} style={{
                padding: '0.25rem 0.5rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}>
                        <FaTimes />
                      </button>}
                    <span style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {}
                {isExpanded && <motion.div initial={{
            height: 0,
            opacity: 0
          }} animate={{
            height: 'auto',
            opacity: 1
          }} exit={{
            height: 0,
            opacity: 0
          }} style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-primary)',
            background: 'var(--bg-tertiary)'
          }}>
                    <EquipmentMappingForm equipment={equipment} mapping={mapping} checkmkHosts={checkmkHosts} onSave={saveMapping} saving={saving} />
                  </motion.div>}
              </motion.div>;
      })}
      </div>

      {}
      <ConfirmationModal isOpen={confirmDeleteId !== null} onConfirm={confirmDeleteMapping} onCancel={() => setConfirmDeleteId(null)} title="Confirm deletion" message="Are you sure you want to delete this mapping? This action cannot be undone." confirmLabel="Delete" cancelLabel="Cancel" confirmColor="danger" />
    </motion.div>;
};
const EquipmentMappingForm = ({
  equipment,
  mapping,
  checkmkHosts,
  onSave,
  saving
}) => {
  const [hostName, setHostName] = useState(mapping?.checkmk_host_name || '');
  const [site, setSite] = useState(mapping?.checkmk_site || '');
  const [showHostDropdown, setShowHostDropdown] = useState(false);
  useEffect(() => {
    if (mapping) {
      setHostName(mapping.checkmk_host_name);
      setSite(mapping.checkmk_site || '');
    }
  }, [mapping]);
  const handleSave = () => {
    if (hostName.trim()) {
      onSave(equipment.type, equipment.equipment_id, equipment.name, hostName, site);
    }
  };
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  }}>
      <div>
        <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)'
      }}>
          Check MK host *
        </label>
        <div style={{
        position: 'relative'
      }}>
          <input type="text" value={hostName} onChange={e => setHostName(e.target.value)} onFocus={() => setShowHostDropdown(checkmkHosts.length > 0)} placeholder="Check MK host name" list={`hosts-${equipment.type}-${equipment.name}`} style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid var(--border-primary)',
          borderRadius: '6px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }} />
          {checkmkHosts.length > 0 && <datalist id={`hosts-${equipment.type}-${equipment.name}`}>
              {checkmkHosts.map((host, idx) => <option key={idx} value={host} />)}
            </datalist>}
        </div>
      </div>

      <div>
        <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)'
      }}>
          Check MK site (optional)
        </label>
        <input type="text" value={site} onChange={e => setSite(e.target.value)} placeholder="Check MK site (leave empty for default site)" style={{
        width: '100%',
        padding: '0.75rem',
        border: '1px solid var(--border-primary)',
        borderRadius: '6px',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        fontSize: '0.9rem'
      }} />
      </div>

      <button type="button" onClick={handleSave} disabled={saving || !hostName.trim()} style={{
      padding: '0.75rem 1.5rem',
      background: saving || !hostName.trim() ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
      color: saving || !hostName.trim() ? 'var(--text-secondary)' : 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: saving || !hostName.trim() ? 'not-allowed' : 'pointer',
      fontSize: '0.9rem',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      alignSelf: 'flex-start'
    }}>
        {saving ? <>
            <FaSync style={{
          animation: 'spin 1s linear infinite'
        }} />
            Saving...
          </> : <>
            <FaCheck />
            {mapping ? 'Update' : 'Create mapping'}
          </>}
      </button>
    </div>;
};
export default StepCheckMKMapping;
