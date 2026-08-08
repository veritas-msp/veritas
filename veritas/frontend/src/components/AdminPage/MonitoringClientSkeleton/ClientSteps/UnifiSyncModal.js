import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Form.module.css";
import API_BASE_URL from "../../../../config";
import { toast } from "react-toastify";
const UnifiSyncModal = ({
  isOpen,
  onClose,
  onSync,
  equipmentType = 'switch',
  siteId = null
}) => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [siteName, setSiteName] = useState("");
  useEffect(() => {
    if (isOpen && siteId) {
      setDevices([]);
      loadDevices(siteId);
    } else if (isOpen && !siteId) {
      toast.error("No UniFi site linked to this client. Please configure a site in the module configuration step.");
      onClose();
    }
  }, [isOpen, siteId]);
  const loadDevices = async siteIdToLoad => {
    if (!siteIdToLoad) {
      toast.error("No UniFi site configured");
      return;
    }
    setLoading(true);
    setDevices([]);
    setSiteName("");
    try {
      console.log('📡 Chargement des devices pour siteId:', siteIdToLoad, 'type:', equipmentType);
      const response = await fetch(`${API_BASE_URL}/unifi/devices/${siteIdToLoad}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      console.log('📦 Réponse API:', response.status, response.statusText);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur HTTP:', errorData);
        toast.error(`Error: ${errorData.error || `HTTP ${response.status}`}`);
        return;
      }
      const data = await response.json();
      console.log('✅ Données reçues:', data);
      console.log('📊 Switches:', data.switches?.length || 0);
      console.log('📊 Access Points:', data.accessPoints?.length || 0);
      console.log('📊 Tous les devices:', data.devices?.length || 0);
      if (data.success) {
        const allDevices = data.devices || [];
        console.log('🔍 Tous les devices:', allDevices.length, allDevices);
        console.log('📊 Switches trouvés:', data.switches?.length || 0);
        console.log('📊 Access Points trouvés:', data.accessPoints?.length || 0);
        const filteredDevices = data.switches && data.switches.length > 0 || data.accessPoints && data.accessPoints.length > 0 ? equipmentType === 'switch' ? data.switches || [] : data.accessPoints || [] : allDevices;
        console.log('🔍 Devices à afficher:', filteredDevices.length, filteredDevices);
        setDevices(filteredDevices);
        setSelectedDevices(new Set());
        if (data.siteName) {
          setSiteName(data.siteName);
        }
        if (filteredDevices.length === 0) {
          console.warn('⚠️ No devices found');
          toast.info(`No devices found for this site`);
        } else {
          toast.success(`${filteredDevices.length} device(s) loaded`);
        }
      } else {
        console.error('❌ Réponse non réussie:', data);
        toast.error(`Error: ${data.error || 'Unable to load devices'}`);
      }
    } catch (err) {
      console.error('❌ Erreur chargement devices:', err);
      toast.error("Error loading devices");
    } finally {
      setLoading(false);
    }
  };
  const toggleDeviceSelection = deviceId => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };
  const handleSync = () => {
    if (selectedDevices.size === 0) {
      toast.error("Please select at least one device");
      return;
    }
    const mappedDevices = devices.filter(device => {
      const deviceId = device.id || device.device_id || device.mac;
      return selectedDevices.has(deviceId);
    }).map(device => {
      if (equipmentType === 'switch') {
        return {
          nom: device.name || `Switch-${device.mac?.slice(-4) || 'unknown'}`,
          fabricant: "Ubiquiti",
          modele: device.model || '',
          ip: device.ip || '',
          manageable: device.manageable !== undefined ? device.manageable : true,
          nombrePorts: device.nombrePorts || '',
          poeSupport: device.poeSupport || false,
          empilage: false,
          firmware: device.version || '',
          numeroSerie: device.serial || '',
          expirationWarranty: '',
          emplacement: '',
          unifiId: device.id,
          unifiMac: device.mac
        };
      } else {
        return {
          nom: device.name || `AP-${device.mac?.slice(-4) || 'unknown'}`,
          fabricant: "Ubiquiti",
          modele: device.model || '',
          ip: device.ip || '',
          firmware: device.version || '',
          numeroSerie: device.serial || '',
          expirationWarranty: '',
          emplacement: '',
          supportsWifi6: device.supportsWifi6 || false,
          bandes: device.bandes || {
            "2.4GHz": true,
            "5GHz": true,
            "6GHz": false
          },
          ssids: [],
          controleur: '',
          unifiId: device.id,
          unifiMac: device.mac
        };
      }
    });
    onSync(mappedDevices);
    onClose();
    toast.success(`${mappedDevices.length} device(s) synced successfully`);
  };
  if (!isOpen) return null;
  return <AnimatePresence>
      <motion.div className={styles.modalOverlay} initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} onClick={onClose}>
        <motion.div className={styles.modalContent} initial={{
        scale: 0.95,
        opacity: 0
      }} animate={{
        scale: 1,
        opacity: 1
      }} exit={{
        scale: 0.95,
        opacity: 0
      }} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 style={{
            margin: 0
          }}>🔌 Sync with UniFi</h3>
            <button className={styles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>

          <div className={styles.modalBody}>
            {siteName && <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px'
          }}>
                <strong>UniFi site:</strong> {siteName}
              </div>}
            
            {loading && <div style={{
            textAlign: 'center',
            padding: '2rem'
          }}>
                <p>Loading devices...</p>
              </div>}

            {devices.length > 0 && <div className={styles.devicesList}>
                <h4 style={{
              marginBottom: "0.75rem"
            }}>
                  {devices.length} device(s) found - {selectedDevices.size} selected
                </h4>
                <div className={styles.devicesScrollable}>
                  {devices.map((device, index) => {
                const deviceId = device.id || device.device_id || device.mac || index;
                const isSelected = selectedDevices.has(deviceId);
                return <div key={deviceId} className={`${styles.deviceItem} ${isSelected ? styles.deviceItemSelected : ''}`} onClick={() => toggleDeviceSelection(deviceId)} style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                  marginBottom: '0.5rem'
                }}>
                        <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleDeviceSelection(deviceId)} onClick={e => e.stopPropagation()} style={{
                      cursor: 'pointer',
                      width: '18px',
                      height: '18px'
                    }} />
                          <div style={{
                      flex: 1
                    }}>
                            <strong>{device.name || device.ip || 'Untitled'}</strong>
                            <p style={{
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        margin: "0.25rem 0"
                      }}>
                              Type: {device.type || 'unknown'} • IP: {device.ip || 'Not configured'}
                              {device.model && ` • Model: ${device.model}`}
                              {device.serial && ` • S/N: ${device.serial}`}
                            </p>
                          </div>
                        </div>
                      </div>;
              })}
                </div>
              </div>}
          </div>

          <div className={styles.modalActions}>
            <button className={styles.modalButtonCancel} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.modalButtonConfirm} onClick={handleSync} disabled={selectedDevices.size === 0}>
              Sync ({selectedDevices.size})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>;
};
export default UnifiSyncModal;
