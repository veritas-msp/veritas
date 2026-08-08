import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FaTimes, FaSync, FaCheck, FaSearch, FaLightbulb, FaServer, FaShieldAlt, FaNetworkWired, FaWifi, FaHdd } from "react-icons/fa";
import { toast } from "react-toastify";
import { getCheckMKHostsWithDetails, getCheckMKServices, updateEquipmentCheckMKMapping } from "../../api/equipment";
import adminStyles from "../AdminPage/AdminPanel.module.css";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "./EquipmentMappingModal.module.css";
const modalRoot = document.getElementById("modal-root");
const ACCENT = '#15d1a0';
const EQUIPMENT_TYPE_TO_FAMILY = {
  'Servers': 'servers',
  'Storage': 'stockage',
  'NAS': 'stockage',
  'Firewalls': 'firewall',
  'Switch': 'switch',
  'BorneWifi': 'wifi',
  'Alimentation': 'alimentation',
  'Routeur': 'routeur',
  'TOIP': 'toip',
  'Backup': 'save',
  'Internet': 'internet'
};
const CATEGORY_ORDER = ['Servers', 'Firewalls', 'Routeur', 'Switch', 'BorneWifi', 'Alimentation', 'TOIP', 'Storage', 'Autres'];
const CATEGORY_ICONS = {
  Servers: FaServer,
  Firewalls: FaShieldAlt,
  Switch: FaNetworkWired,
  BorneWifi: FaWifi,
  Routeur: FaNetworkWired,
  Alimentation: FaNetworkWired,
  TOIP: FaNetworkWired,
  Storage: FaHdd,
  Autres: FaNetworkWired
};
function scoreSuggestion(host, equipmentName, clientName, clientId) {
  const h = (host.id || host).toLowerCase();
  const eq = (equipmentName || '').toLowerCase();
  const cl = (clientName || '').toLowerCase().replace(/\s+/g, '-');
  const cid = String(clientId || '');
  let score = 0;
  if (cid) {
    if (h.includes(cid)) score += 40;
    if (h.startsWith(`${cid}-`) || h.startsWith(`client-${cid}`) || h.endsWith(`-${cid}`)) score += 35;
  }
  if (cl) {
    const clientWords = cl.split(/[-_\s]/).filter(w => w.length > 2);
    clientWords.forEach(w => {
      if (h.includes(w)) score += 15;
    });
    if (h.includes(cl.replace(/-/g, ''))) score += 25;
  }
  if (eq) {
    const eqWords = eq.split(/\s+/).filter(w => w.length > 2);
    eqWords.forEach(w => {
      if (h.includes(w)) score += 12;
    });
    if (h.includes(eq.replace(/\s+/g, '-'))) score += 30;
  }
  return score;
}
export default function EquipmentMappingModal({
  isOpen,
  onClose,
  equipment,
  onMappingSaved,
  requireService = false
}) {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHost, setSelectedHost] = useState("");
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const equipmentName = equipment?.name || equipment?.nom || '';
  const clientName = equipment?.clientName || '';
  const clientId = equipment?.clientId;
  const equipmentType = equipment?.type || '';
  const currentMapping = equipment?.checkmkMapping;
  const initialHost = currentMapping?.checkmk_host_name || "";
  const initialService = currentMapping?.checkmk_service_name || "";
  const hasUnsavedChanges = useMemo(() => {
    if (selectedHost !== initialHost) return true;
    if (requireService && selectedService !== initialService) return true;
    return false;
  }, [selectedHost, initialHost, selectedService, initialService, requireService]);
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges,
    blocked: saving
  });
  useEffect(() => {
    if (!isOpen) return;
    setSelectedHost(currentMapping?.checkmk_host_name || "");
    setSelectedService(currentMapping?.checkmk_service_name || "");
    setServiceSearchTerm("");
    setServices([]);
    setSearchTerm("");
    setCategoryFilter(null);
    loadHosts();
  }, [isOpen, equipment?.clientId, equipment?.name]);
  useEffect(() => {
    if (!isOpen || !requireService || !selectedHost) return;
    loadServices(selectedHost, currentMapping?.checkmk_service_name || "");
  }, [isOpen, requireService, selectedHost]);
  const loadHosts = async () => {
    setLoading(true);
    try {
      const data = await getCheckMKHostsWithDetails();
      setHosts(data);
    } catch (err) {
      toast.error('Unable to load CheckMK hosts');
      setHosts([]);
    } finally {
      setLoading(false);
    }
  };
  const loadServices = async (hostName, serviceToSelect = "") => {
    if (!hostName || !requireService) return;
    setLoadingServices(true);
    try {
      const data = await getCheckMKServices(hostName);
      const rawServices = data?.services || [];
      const serviceNames = rawServices.map(service => {
        if (typeof service === "string") return service;
        return service.id || service.title || service.name || "";
      }).filter(Boolean);
      setServices(serviceNames);
      if (serviceToSelect && serviceToSelect.trim()) {
        const found = serviceNames.find(s => s.toLowerCase() === serviceToSelect.trim().toLowerCase());
        setSelectedService(found || serviceToSelect.trim());
      } else {
        setSelectedService("");
      }
    } catch (err) {
      console.error("Error chargement services CheckMK:", err);
      toast.error("Unable to load CheckMK services");
      setServices([]);
      setSelectedService("");
    } finally {
      setLoadingServices(false);
    }
  };
  const suggestions = useMemo(() => {
    if (!equipmentName && !clientName && !clientId) return [];
    return [...hosts].map(h => ({
      host: h,
      score: scoreSuggestion(h, equipmentName, clientName, clientId)
    })).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map(s => s.host);
  }, [hosts, equipmentName, clientName, clientId]);
  const hostsByCategory = useMemo(() => {
    const filtered = hosts.filter(h => {
      const matchSearch = !searchTerm || (h.id + ' ' + (h.alias || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !categoryFilter || h.category === categoryFilter;
      return matchSearch && matchCat;
    });
    const byCat = {};
    CATEGORY_ORDER.forEach(cat => byCat[cat] = filtered.filter(h => h.category === cat));
    return byCat;
  }, [hosts, searchTerm, categoryFilter]);
  const handleSave = async () => {
    if (!selectedHost.trim()) {
      toast.error('Please select un host CheckMK');
      return;
    }
    if (!clientId || !equipmentName) {
      toast.error('Missing equipment data (client, name)');
      return;
    }
    if (requireService && !selectedService.trim()) {
      toast.error('Please select a CheckMK service');
      return;
    }
    const family = EQUIPMENT_TYPE_TO_FAMILY[equipmentType] || EQUIPMENT_TYPE_TO_FAMILY[equipmentType === 'NAS' ? 'Storage' : equipmentType];
    if (!family) {
      toast.error(`Unsupported type: ${equipmentType}`);
      return;
    }
    setSaving(true);
    try {
      const mapping = await updateEquipmentCheckMKMapping(clientId, equipmentType, equipmentName, {
        checkmk_host_name: selectedHost.trim(),
        checkmk_site: null,
        checkmk_service_name: requireService ? selectedService.trim() : null
      });
      toast.success('Mapping CheckMK saved');
      onMappingSaved?.(mapping);
      onClose();
    } catch (err) {
      toast.error(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };
  const handleClearMapping = async () => {
    if (!clientId || !equipmentName) return;
    setSaving(true);
    try {
      const family = EQUIPMENT_TYPE_TO_FAMILY[equipmentType] || EQUIPMENT_TYPE_TO_FAMILY[equipmentType === 'NAS' ? 'Storage' : equipmentType];
      if (!family) return;
      await updateEquipmentCheckMKMapping(clientId, equipmentType, equipmentName, {
        checkmk_host_name: null,
        checkmk_site: null,
        checkmk_service_name: null
      });
      toast.success('Mapping deleted');
      onMappingSaved?.(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error deleting');
    } finally {
      setSaving(false);
    }
  };
  const filteredServices = useMemo(() => {
    const q = serviceSearchTerm.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => s.toLowerCase().includes(q));
  }, [services, serviceSearchTerm]);
  if (!isOpen || !modalRoot) return null;
  return createPortal(<>
    <div className={styles.overlay} onClick={requestClose}>
      <motion.div initial={{
        opacity: 0,
        scale: 0.98
      }} animate={{
        opacity: 1,
        scale: 1
      }} transition={{
        duration: 0.2
      }} className={styles.panel} onClick={e => e.stopPropagation()}>
        {}
        <div className={`${adminStyles.modalHeader} ${styles.panelHeader}`}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#1a1a1a'
            }}>
              Mapping CheckMK
            </h3>
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <strong>{equipmentName}</strong> ({equipmentType}) · Client: {clientName}
              {clientId && <span style={{
                marginLeft: 8,
                opacity: 0.8
              }}>#{clientId}</span>}
            </p>
          </div>
          <button onClick={requestClose} className={adminStyles.closeButton} title="Close">
            <FaTimes />
          </button>
        </div>

        {}
        <div className={styles.body}>

          {}
          {suggestions.length > 0 && <div style={{
            padding: '16px 16px 12px',
            background: 'linear-gradient(135deg, rgba(21, 209, 160, 0.08) 0%, rgba(21, 209, 160, 0.03) 100%)',
            borderRadius: 10,
            border: '1px solid rgba(21, 209, 160, 0.25)'
          }}>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#0d9488'
            }}>
                <FaLightbulb size={14} />
                Suggestions (client name, client no., equipment)
              </div>
              <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8
            }}>
                {suggestions.map((h, idx) => {
                const hostId = typeof h === 'string' ? h : h.id;
                const isSelected = selectedHost === hostId;
                return <button key={idx} type="button" onClick={() => setSelectedHost(hostId)} style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  border: isSelected ? `2px solid ${ACCENT}` : '1px solid #d1d5db',
                  borderRadius: 8,
                  background: isSelected ? ACCENT : '#fff',
                  color: isSelected ? '#fff' : '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                      {hostId}
                      {h.ip && <span style={{
                    fontSize: '0.7rem',
                    opacity: 0.85
                  }}>({h.ip})</span>}
                    </button>;
              })}
              </div>
            </div>}

          {}
          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1,
              minWidth: 200,
              position: 'relative'
            }}>
              <FaSearch style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                fontSize: 12
              }} />
              <input type="text" placeholder="Search un host..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#111827'
              }} />
            </div>
            <div style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap'
            }}>
              {CATEGORY_ORDER.map(cat => {
                const IconComp = CATEGORY_ICONS[cat];
                const count = hostsByCategory[cat]?.length || 0;
                const active = categoryFilter === cat;
                return <button key={cat} type="button" onClick={() => setCategoryFilter(active ? null : cat)} style={{
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  border: active ? `2px solid ${ACCENT}` : '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: active ? 'rgba(21, 209, 160, 0.12)' : '#fff',
                  color: active ? '#0d9488' : '#4b5563',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                    {IconComp && <IconComp size={14} />}
                    {cat}
                    {count > 0 && <span style={{
                    fontSize: '0.7rem',
                    opacity: 0.7
                  }}>({count})</span>}
                  </button>;
              })}
            </div>
          </div>

          <div className={`${styles.contentGrid} ${requireService && selectedHost ? styles.contentGridDouble : styles.contentGridSingle}`}>
            {}
            <div className={styles.hostsList}>
              {loading ? <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                  <FaSync style={{
                  animation: 'spin 1s linear infinite',
                  marginBottom: 8
                }} />
                  <p>Loading hosts...</p>
                </div> : CATEGORY_ORDER.map(cat => {
                const list = hostsByCategory[cat] || [];
                if (list.length === 0) return null;
                const IconComp = CATEGORY_ICONS[cat];
                return <div key={cat} style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                      <div style={{
                    padding: '8px 14px',
                    background: '#f3f4f6',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                        {IconComp && <IconComp size={14} />}
                        {cat} · {list.length} host{list.length > 1 ? 's' : ''}
                      </div>
                      {list.map((h, idx) => {
                    const isSelected = selectedHost === h.id;
                    return <div key={`${h.id}-${idx}`} onClick={() => {
                      setSelectedHost(h.id);
                      if (!requireService) return;
                      if (selectedHost !== h.id) {
                        setSelectedService("");
                        setServiceSearchTerm("");
                      }
                    }} style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      borderBottom: idx < list.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: isSelected ? ACCENT : 'transparent',
                      color: isSelected ? '#fff' : '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }} onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                    }} onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}>
                            <div style={{
                        flex: 1,
                        minWidth: 0
                      }}>
                              <div style={{
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '0.875rem'
                        }}>{h.id}</div>
                              {(h.alias || h.ip) && <div style={{
                          fontSize: '0.75rem',
                          opacity: isSelected ? 0.9 : 0.65,
                          marginTop: 2
                        }}>
                                  {h.alias && <span>{h.alias}</span>}
                                  {h.alias && h.ip && ' · '}
                                  {h.ip && <span style={{
                            fontFamily: 'monospace'
                          }}>{h.ip}</span>}
                                </div>}
                            </div>
                            {isSelected && <FaCheck size={14} />}
                          </div>;
                  })}
                    </div>;
              })}
              {!loading && Object.values(hostsByCategory).every(arr => !arr?.length) && <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                  {searchTerm ? 'No host found' : 'No host available'}
                </div>}
            </div>

            {requireService && selectedHost && <div className={styles.servicesPanel}>
                <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f3f4f6',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                  Services CheckMK · {selectedHost}
                </div>
                <div style={{
                padding: 10
              }}>
                  <div style={{
                  position: 'relative',
                  marginBottom: 8
                }}>
                    <FaSearch style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: 12
                  }} />
                    <input type="text" placeholder="Search for a service..." value={serviceSearchTerm} onChange={e => setServiceSearchTerm(e.target.value)} style={{
                    width: '100%',
                    padding: '8px 10px 8px 28px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    backgroundColor: '#ffffff',
                    color: '#111827'
                  }} />
                  </div>
                  <div style={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff'
                }}>
                    {loadingServices ? <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                        <FaSync style={{
                      animation: 'spin 1s linear infinite'
                    }} /> Loading...
                      </div> : filteredServices.length === 0 ? <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                        {serviceSearchTerm ? "No service found" : "No service available"}
                      </div> : filteredServices.map(service => {
                    const isSelected = selectedService === service;
                    return <div key={service} onClick={() => setSelectedService(service)} style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: isSelected ? ACCENT : 'transparent',
                      color: isSelected ? '#fff' : '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem'
                    }}>
                            <span>{service}</span>
                            {isSelected && <FaCheck size={12} />}
                          </div>;
                  })}
                  </div>
                </div>
              </div>}
          </div>

        </div>

        {}
        <div className={`${adminStyles.modalActions} ${styles.footer}`}>
          {currentMapping?.checkmk_host_name && <button onClick={handleClearMapping} disabled={saving} style={{
            padding: '10px 16px',
            border: '1px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            borderRadius: 8,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem'
          }}>
              Delete mapping
            </button>}
          <button onClick={handleSave} disabled={saving || !selectedHost.trim() || requireService && !selectedService.trim()} className={adminStyles.primaryButton} style={{
            padding: '10px 24px'
          }}>
            {saving ? <FaSync style={{
              animation: 'spin 1s linear infinite'
            }} /> : <FaCheck />}
          </button>
        </div>
      </motion.div>
    </div>
    <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, modalRoot);
}
