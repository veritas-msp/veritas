import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { createPortal } from "react-dom";
import overlayStyles from "./AddEquipmentModal.module.css";
import styles from "./AddEquipmentStepModal.module.css";
import { updateClient, fetchClientModules, saveClientModules } from "../../api/clients";
import { showError, showSuccess } from "../../utils/toast";
import { StepServers, StepInternet, StepFirewalls, StepStorage, StepSwitch, StepBorneWifi } from "./EquipmentSteps";
const CATEGORY_TO_STEP = {
  Internet: {
    key: "internet",
    label: "Internet",
    component: StepInternet,
    icon: "mdi:web"
  },
  Firewalls: {
    key: "firewall",
    label: "Firewalls",
    component: StepFirewalls,
    icon: "mdi:firewall"
  },
  Servers: {
    key: "serveurs",
    label: "Servers",
    component: StepServers,
    icon: "mingcute:server-fill"
  },
  Storage: {
    key: "stockage",
    label: "Storage",
    component: StepStorage,
    icon: "mdi:harddisk"
  },
  Switch: {
    key: "switch",
    label: "Switch",
    component: StepSwitch,
    icon: "mdi:ethernet"
  },
  BorneWifi: {
    key: "bornewifi",
    label: "Borne WiFi",
    component: StepBorneWifi,
    icon: "mdi:wifi"
  }
};
const CATEGORY_TO_MONITORING_KEY = {
  Internet: "Internet",
  Firewalls: "Firewall",
  Servers: "Servers",
  Storage: "Storage",
  Switch: "Switch",
  BorneWifi: "BorneWifi"
};
export default function AddEquipmentStepModal({
  client,
  category,
  onBack,
  onSuccess
}) {
  const stepConfig = CATEGORY_TO_STEP[category?.id];
  const monitoringKey = CATEGORY_TO_MONITORING_KEY[category?.id] || category?.id;
  const [form, setForm] = useState(() => {
    const baseModules = {
      ...client.modules_monitoring,
      Servers: client.modules_monitoring?.Serveurs ?? false,
      Storage: client.modules_monitoring?.Storage ?? false,
      Firewall: client.modules_monitoring?.Firewall ?? false,
      Internet: client.modules_monitoring?.Internet ?? false,
      Switch: client.modules_monitoring?.Switch ?? false,
      BorneWifi: client.modules_monitoring?.BorneWifi ?? false
    };
    if (monitoringKey) baseModules[monitoringKey] = true;
    return {
      id: client.id,
      name: client.name,
      modules: client.modules || {
        Monitoring: true,
        Preventif: false
      },
      modules_monitoring: baseModules,
      equipements: {
        ...client.equipements,
        Servers: client.equipements?.Serveurs || [],
        NAS: client.equipements?.NAS || [],
        Firewalls: client.equipements?.Firewalls || [],
        Internet: client.equipements?.Internet || [],
        Switch: client.equipements?.Switch || [],
        BorneWifi: client.equipements?.BorneWifi || []
      },
      report_frequency: client.report_frequency || "Mensuel",
      contrat: client.contrat || {},
      sites: client.sites || [],
      ssids: client.ssids || []
    };
  });
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTypeModals, setShowTypeModals] = useState({});
  const stepAddRef = useRef({});
  const stepImportRef = useRef({});
  const stepRemoveAllRef = useRef({});
  useEffect(() => {
    const loadModules = async () => {
      try {
        setIsLoadingModules(true);
        const modulesData = await fetchClientModules(client.id);
        if (modulesData) {
          setForm(prev => {
            const merged = {
              ...prev.modules_monitoring,
              ...modulesData.modules_monitoring
            };
            if (monitoringKey) merged[monitoringKey] = true;
            return {
              ...prev,
              modules: modulesData.modules || prev.modules || {
                Monitoring: true,
                Preventif: false
              },
              modules_monitoring: merged,
              equipements: {
                ...prev.equipements,
                ...modulesData.equipements
              }
            };
          });
        }
      } catch (err) {
        console.error("Error chargement modules:", err);
      } finally {
        setIsLoadingModules(false);
      }
    };
    if (client?.id) loadModules();else setIsLoadingModules(false);
  }, [client?.id]);
  const validateStep = () => {
    const key = stepConfig?.key;
    if (!key) return true;
    switch (key) {
      case "internet":
        if (!form.equipements.Internet?.length) {
          showError("Please add at least one Internet connection.");
          return false;
        }
        for (let i = 0; i < form.equipements.Internet.length; i++) {
          if (!form.equipements.Internet[i].fournisseur?.trim()) {
            showError(`La connexion ${i + 1} doit avoir un fournisseur.`);
            return false;
          }
        }
        break;
      case "serveurs":
        if (!form.equipements.Serveurs?.length) {
          showError("Please add at least one server.");
          return false;
        }
        for (let i = 0; i < form.equipements.Serveurs.length; i++) {
          const s = form.equipements.Serveurs[i];
          if (!s.nom?.trim()) {
            showError(`Le serveur ${i + 1} doit avoir un nom.`);
            return false;
          }
          if (!s.role?.length) {
            showError(`Server ${s.nom} must have at least one role.`);
            return false;
          }
          if (!s.systeme?.trim()) {
            showError(`Server ${s.nom} must have an operating system.`);
            return false;
          }
          if (!s.ip?.trim()) {
            showError(`Le serveur ${s.nom} doit avoir une adresse IP.`);
            return false;
          }
        }
        break;
      case "stockage":
        if (!form.equipements.NAS?.length) {
          showError("Please add at least one storage device.");
          return false;
        }
        for (let i = 0; i < form.equipements.NAS.length; i++) {
          const nas = form.equipements.NAS[i];
          if (!nas.nom?.trim()) {
            showError(`Storage device ${i + 1} must have a name.`);
            return false;
          }
          const roleVal = typeof nas.role === 'string' ? nas.role.trim() : Array.isArray(nas.role) ? nas.role.join('') : '';
          if (!roleVal) {
            showError(`Storage device ${nas.nom || i + 1} must have a role.`);
            return false;
          }
        }
        break;
      case "firewall":
        if (!form.equipements.Firewalls?.length) {
          showError("Please add at least one firewall.");
          return false;
        }
        for (let i = 0; i < form.equipements.Firewalls.length; i++) {
          if (!form.equipements.Firewalls[i].nom?.trim()) {
            showError(`Le firewall ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
      case "switch":
        if (!form.equipements.Switch?.length) {
          showError("Please add at least one switch.");
          return false;
        }
        for (let i = 0; i < form.equipements.Switch.length; i++) {
          if (!form.equipements.Switch[i].nom?.trim()) {
            showError(`Le switch ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
      case "bornewifi":
        if (!form.equipements.BorneWifi?.length) {
          showError("Please add at least one WiFi access point.");
          return false;
        }
        for (let i = 0; i < form.equipements.BorneWifi.length; i++) {
          if (!form.equipements.BorneWifi[i].nom?.trim()) {
            showError(`La borne WiFi ${i + 1} doit avoir un nom.`);
            return false;
          }
        }
        break;
    }
    return true;
  };
  const submitClient = async () => {
    try {
      setSaving(true);
      const modulesMonitoring = {
        ...form.modules_monitoring
      };
      const hasNAS = Array.isArray(form.equipements?.NAS) && form.equipements.NAS.length > 0;
      if (modulesMonitoring.Storage !== false && hasNAS) modulesMonitoring.Storage = true;
      const safeEquipements = {
        ...form.equipements
      };
      const moduleToEquipment = {
        Internet: "Internet",
        Servers: "Servers",
        Storage: "NAS",
        Firewall: "Firewalls",
        Switch: "Switch",
        BorneWifi: "BorneWifi"
      };
      Object.entries(moduleToEquipment).forEach(([moduleKey, equipmentKey]) => {
        if (!modulesMonitoring[moduleKey]) delete safeEquipements[equipmentKey];
      });
      await updateClient(form.id, {
        name: client.name,
        report_frequency: form.report_frequency,
        contrat: form.contrat || {},
        ssid: form.ssids || []
      });
      await saveClientModules(form.id, {
        modules: form.modules,
        modules_monitoring: modulesMonitoring,
        equipements: safeEquipements
      });
      showSuccess("Client updated successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Error sauvegarde:", err);
      showError("Error while saving.");
    } finally {
      setSaving(false);
    }
  };
  const handleSave = () => {
    if (!validateStep()) return;
    submitClient();
  };
  const handleAdd = () => {
    const key = stepConfig?.key;
    if (stepAddRef.current[key] && typeof stepAddRef.current[key] === 'function') {
      stepAddRef.current[key]();
    } else {
      setShowTypeModals(prev => ({
        ...prev,
        [key]: true
      }));
    }
  };
  const handleImport = () => {
    const key = stepConfig?.key;
    if (stepImportRef.current[key] && typeof stepImportRef.current[key] === 'function') {
      stepImportRef.current[key](true);
    }
  };
  const handleRemoveAll = () => {
    const key = stepConfig?.key;
    if (stepRemoveAllRef.current[key] && typeof stepRemoveAllRef.current[key] === 'function') {
      stepRemoveAllRef.current[key]();
    }
  };
  const setShowTypeModal = (stepKey, value) => {
    setShowTypeModals(prev => ({
      ...prev,
      [stepKey]: value
    }));
  };
  const getShowTypeModal = stepKey => showTypeModals[stepKey] || false;
  const currentStepData = {
    key: stepConfig?.key,
    label: stepConfig?.label
  };
  const CurrentStepComponent = stepConfig?.component;
  if (!stepConfig || !form) return null;
  const showAddButton = ["internet", "serveurs", "stockage", "firewall", "switch", "bornewifi"].includes(stepConfig.key);
  const showImportButton = ["switch", "bornewifi"].includes(stepConfig.key);
  const showRemoveAllButton = ["switch", "bornewifi"].includes(stepConfig.key);
  const modalContent = <div className={overlayStyles.overlay} onClick={onBack}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
            <Icon icon={stepConfig.icon} className={styles.modalIcon} style={{
            color: '#3b82f6',
            fontSize: '32px'
          }} />
            <h3>{stepConfig.label}</h3>
          </div>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
            {showAddButton && <button className={styles.actionButton} onClick={handleAdd} title="Add">
                <Icon icon="mdi:plus" style={{
              fontSize: '16px'
            }} />
              </button>}
            {showImportButton && <button className={styles.actionButton} onClick={handleImport} title="Import">
                <Icon icon="mdi:download" style={{
              fontSize: '16px'
            }} />
              </button>}
            {showRemoveAllButton && <button className={styles.actionButton} onClick={handleRemoveAll} title="Delete all" style={{
            color: '#ef4444',
            borderColor: '#ef4444'
          }}>
                <Icon icon="mdi:delete" style={{
              fontSize: '16px'
            }} />
              </button>}
          </div>
        </div>

        <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        padding: '1.5rem'
      }}>
          {isLoadingModules ? <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>Loading...</div> : CurrentStepComponent ? <CurrentStepComponent form={form} setForm={setForm} isEditing={true} initialClient={client} showTypeModal={getShowTypeModal(stepConfig.key)} setShowTypeModal={value => setShowTypeModal(stepConfig.key, value)} onAdd={stepAddRef.current} onImport={stepImportRef.current} onRemoveAll={stepRemoveAllRef.current} currentStepData={currentStepData} /> : null}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.actionButton} onClick={onBack} title="Back">
            <Icon icon="mdi:chevron-left" style={{
            fontSize: '16px'
          }} />
          </button>
          <button className={styles.primaryButton} onClick={handleSave} disabled={saving} title="Save">
            {saving ? <Icon icon="mdi:loading" className={styles.loadingIcon} style={{
            fontSize: '16px'
          }} /> : <Icon icon="mdi:check" style={{
            fontSize: '16px'
          }} />}
          </button>
        </div>
      </div>
    </div>;
  return createPortal(modalContent, document.body);
}
