import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import styles from "./MonitoringClientModal.module.css";
import adminStyles from "../AdminPanel.module.css";
import { updateClient, fetchClientModules, saveClientModules } from "../../../api/clients";
import { deleteClientOffice365Credentials, saveClientOffice365Credentials } from "../../../api/clientOffice365";
import { showError, showSuccess } from "../../../utils/toast";
import { getIconPath } from "../../../utils/assetHelper";
import StepModules from "./ClientSteps/StepModules";
import StepServeurs from "./ClientSteps/StepServeurs";
import StepStockage from "./ClientSteps/StepStockage";
import StepFirewalls from "./ClientSteps/StepFirewalls";
import StepSauvegarde from "./ClientSteps/StepSauvegarde";
import StepAntivirus from "./ClientSteps/StepAntivirus";
import StepAntispam from "./ClientSteps/StepAntispam";
import StepNDD from "./ClientSteps/StepNDD";
import StepOffice365 from "./ClientSteps/StepOffice365";
import StepInternet from "./ClientSteps/StepInternet";
import StepTOIP from "./ClientSteps/StepTOIP";
import StepSwitch from "./ClientSteps/StepSwitch";
import StepBorneWifi from "./ClientSteps/StepBorneWifi";
import ConfirmationModal from "../../Misc/ConfirmationModal/ConfirmationModal";
const MODULE_TO_MONITORING_KEY = {
  Internet: "Internet",
  Firewalls: "Firewall",
  Serveurs: "Servers",
  Stockage: "Storage",
  Switch: "Switch",
  BorneWifi: "BorneWifi"
};
export default function MonitoringClientModal({
  initialClient,
  onClose,
  onBack,
  initialStepKey,
  forceModule
}) {
  const isEditing = true;
  const monitoringKey = forceModule ? MODULE_TO_MONITORING_KEY[forceModule] : null;
  const [form, setForm] = useState(() => {
    const baseModules = {
      ...initialClient.modules_monitoring,
      Serveurs: initialClient.modules_monitoring?.Serveurs ?? false,
      Stockage: initialClient.modules_monitoring?.Stockage ?? false,
      Firewall: initialClient.modules_monitoring?.Firewall ?? false,
      Sauvegarde: initialClient.modules_monitoring?.Sauvegarde ?? false,
      Antivirus: initialClient.modules_monitoring?.Antivirus ?? false,
      Antispam: initialClient.modules_monitoring?.Antispam ?? false,
      Office365: initialClient.modules_monitoring?.Office365 ?? false,
      NDD: initialClient.modules_monitoring?.NDD ?? false,
      CertificatsSSL: initialClient.modules_monitoring?.CertificatsSSL ?? false,
      Internet: initialClient.modules_monitoring?.Internet ?? false,
      TOIP: initialClient.modules_monitoring?.TOIP ?? false,
      Switch: initialClient.modules_monitoring?.Switch ?? false,
      BorneWifi: initialClient.modules_monitoring?.BorneWifi ?? false
    };
    if (monitoringKey) {
      baseModules[monitoringKey] = true;
    }
    return {
      id: initialClient.id,
      name: initialClient.name,
      modules: initialClient.modules || {
        Monitoring: true,
        Preventif: false
      },
      modules_monitoring: baseModules,
      equipements: {
        ...initialClient.equipements,
        Serveurs: initialClient.equipements?.Serveurs || [],
        NAS: initialClient.equipements?.NAS || [],
        Firewalls: initialClient.equipements?.Firewalls || [],
        Sauvegarde: initialClient.equipements?.Sauvegarde || {
          instances: []
        },
        Antivirus: initialClient.equipements?.Antivirus || {
          solutions: []
        },
        Antispam: initialClient.equipements?.Antispam || {
          logiciel: "MailInBlack",
          expiration: "",
          usersProteges: 0,
          domainsSurveilles: 0
        },
        NDD: initialClient.equipements?.NDD || [],
        CertificatsSSL: initialClient.equipements?.CertificatsSSL || [],
        Office365: initialClient.equipements?.Office365 || {
          licences: []
        },
        Internet: initialClient.equipements?.Internet || [],
        TOIP: initialClient.equipements?.TOIP || [],
        Switch: initialClient.equipements?.Switch || [],
        BorneWifi: initialClient.equipements?.BorneWifi || []
      },
      office365_data: initialClient.office365_data || null,
      report_frequency: initialClient.report_frequency || "Mensuel",
      contrat: initialClient.contrat || {},
      sites: initialClient.sites || [],
      ssids: initialClient.ssids || []
    };
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showTypeModals, setShowTypeModals] = useState({});
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [saving, setSaving] = useState(false);
  const stepOffice365Ref = useRef();
  const stepAddRef = useRef({});
  const stepImportRef = useRef({});
  const stepRemoveAllRef = useRef({});
  const initialStepAppliedRef = useRef(false);
  useEffect(() => {
    const loadModules = async () => {
      try {
        setIsLoadingModules(true);
        const modulesData = await fetchClientModules(initialClient.id);
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
      } catch (error) {
        console.error("Erreur lors du chargement des modules:", error);
      } finally {
        setIsLoadingModules(false);
      }
    };
    if (initialClient?.id) {
      loadModules();
    } else {
      setIsLoadingModules(false);
    }
  }, [initialClient?.id]);
  useEffect(() => {
    if (!initialStepKey || isLoadingModules || initialStepAppliedRef.current) return;
    initialStepAppliedRef.current = true;
    setCurrentStep(0);
  }, [initialStepKey, isLoadingModules]);
  const setShowTypeModal = (stepKey, value) => {
    setShowTypeModals(prev => ({
      ...prev,
      [stepKey]: value
    }));
  };
  const getShowTypeModal = stepKey => {
    return showTypeModals[stepKey] || false;
  };
  const handleAdd = stepKey => {
    if (stepAddRef.current[stepKey] && typeof stepAddRef.current[stepKey] === 'function') {
      stepAddRef.current[stepKey]();
    } else {
      setShowTypeModal(stepKey, true);
    }
  };
  const handleImport = stepKey => {
    if (stepImportRef.current[stepKey] && typeof stepImportRef.current[stepKey] === 'function') {
      stepImportRef.current[stepKey](true);
    }
  };
  const handleRemoveAll = stepKey => {
    if (stepRemoveAllRef.current[stepKey] && typeof stepRemoveAllRef.current[stepKey] === 'function') {
      stepRemoveAllRef.current[stepKey]();
    }
  };
  if (!form) {
    onClose();
    return null;
  }
  const isSingleStepMode = Boolean(initialStepKey);
  const STEP_CONFIGS = [{
    label: "Internet",
    component: StepInternet,
    key: "internet",
    icon: getIconPath('internet.png')
  }, {
    label: "Servers",
    component: StepServeurs,
    key: "serveurs",
    icon: getIconPath('serveurs.png')
  }, {
    label: "Storage",
    component: StepStockage,
    key: "stockage",
    icon: getIconPath('stockage.png')
  }, {
    label: "Firewalls",
    component: StepFirewalls,
    key: "firewall",
    icon: getIconPath('firewall.png')
  }, {
    label: "Switch",
    component: StepSwitch,
    key: "switch",
    icon: getIconPath('switch.png')
  }, {
    label: "WiFi AP",
    component: StepBorneWifi,
    key: "bornewifi",
    icon: getIconPath('wifi.png')
  }, {
    label: "Backup",
    component: StepSauvegarde,
    key: "sauvegarde",
    icon: getIconPath('sauvegarde.png')
  }, {
    label: "Antivirus",
    component: StepAntivirus,
    key: "antivirus",
    icon: getIconPath('antivirus.png')
  }, {
    label: "Antispam",
    component: StepAntispam,
    key: "antispam",
    icon: getIconPath('antispam.png')
  }, {
    label: "Domain names",
    component: StepNDD,
    key: "ndd",
    icon: getIconPath('ndd.png')
  }, {
    label: "TOIP",
    component: StepTOIP,
    key: "toip",
    icon: getIconPath('toip.png')
  }, {
    label: "Microsoft Entra",
    component: StepOffice365,
    key: "office365"
  }];
  const steps = isSingleStepMode ? STEP_CONFIGS.filter(s => s.key === initialStepKey) : [{
    label: "Configuration wizard",
    component: StepModules,
    key: "modules"
  }, ...(form.modules_monitoring.Internet ? [STEP_CONFIGS.find(s => s.key === "internet")] : []).filter(Boolean), ...(form.modules_monitoring.Serveurs ? [STEP_CONFIGS.find(s => s.key === "serveurs")] : []).filter(Boolean), ...(form.modules_monitoring.Stockage ? [STEP_CONFIGS.find(s => s.key === "stockage")] : []).filter(Boolean), ...(form.modules_monitoring.Firewall ? [STEP_CONFIGS.find(s => s.key === "firewall")] : []).filter(Boolean), ...(form.modules_monitoring.Switch ? [STEP_CONFIGS.find(s => s.key === "switch")] : []).filter(Boolean), ...(form.modules_monitoring.BorneWifi ? [STEP_CONFIGS.find(s => s.key === "bornewifi")] : []).filter(Boolean), ...(form.modules_monitoring.Sauvegarde ? [STEP_CONFIGS.find(s => s.key === "sauvegarde")] : []).filter(Boolean), ...(form.modules_monitoring.Antivirus ? [STEP_CONFIGS.find(s => s.key === "antivirus")] : []).filter(Boolean), ...(form.modules_monitoring.Antispam ? [STEP_CONFIGS.find(s => s.key === "antispam")] : []).filter(Boolean), ...(form.modules_monitoring.NDD ? [STEP_CONFIGS.find(s => s.key === "ndd")] : []).filter(Boolean), ...(form.modules_monitoring.TOIP ? [STEP_CONFIGS.find(s => s.key === "toip")] : []).filter(Boolean), ...(form.modules_monitoring.Office365 ? [STEP_CONFIGS.find(s => s.key === "office365")] : []).filter(Boolean)];
  const currentStepData = steps[currentStep];
  const CurrentStepComponent = currentStepData?.component;
  const progress = steps.length > 0 ? (currentStep + 1) / steps.length * 100 : 0;
  const validateStep = () => {
    const step = steps[currentStep];
    if (!step) return true;
    switch (step.key) {
      case "modules":
        const atLeastOne = Object.values(form.modules_monitoring).some(Boolean);
        if (!atLeastOne) {
          showError("Please enable at least one monitoring module.");
          return false;
        }
        if (!form.report_frequency || !form.report_frequency.trim()) {
          showError("Please select a report frequency.");
          return false;
        }
        break;
      case "internet":
        if (!form.equipements.Internet || form.equipements.Internet.length === 0) {
          showError("Please add at least one Internet connection.");
          return false;
        }
        for (let i = 0; i < form.equipements.Internet.length; i++) {
          const connection = form.equipements.Internet[i];
          if (!connection.fournisseur || !connection.fournisseur.trim()) {
            showError(`Connection ${i + 1} must have a provider.`);
            return false;
          }
        }
        break;
      case "serveurs":
        if (!form.equipements.Serveurs || form.equipements.Serveurs.length === 0) {
          showError("Please add at least one server.");
          return false;
        }
        for (let i = 0; i < form.equipements.Serveurs.length; i++) {
          const serveur = form.equipements.Serveurs[i];
          if (!serveur.nom || !serveur.nom.trim()) {
            showError(`Server ${i + 1} must have a name.`);
            return false;
          }
          if (!serveur.role || !Array.isArray(serveur.role) || serveur.role.length === 0) {
            showError(`Server ${serveur.nom} must have at least one role/function.`);
            return false;
          }
          if (!serveur.systeme || !serveur.systeme.trim()) {
            showError(`Server ${serveur.nom} must have an operating system.`);
            return false;
          }
          if (!serveur.ip || !serveur.ip.trim()) {
            showError(`Server ${serveur.nom} must have an IP address.`);
            return false;
          }
        }
        break;
      case "stockage":
        if (!form.equipements.NAS || form.equipements.NAS.length === 0) {
          showError("Please add at least one storage device.");
          return false;
        }
        for (let i = 0; i < form.equipements.NAS.length; i++) {
          const nas = form.equipements.NAS[i];
          if (!nas.nom || !nas.nom.trim()) {
            showError(`Storage device ${i + 1} must have a name.`);
            return false;
          }
          const roleValue = typeof nas.role === 'string' ? nas.role.trim() : Array.isArray(nas.role) ? nas.role.join('') : '';
          if (!roleValue) {
            showError(`Storage device ${nas.nom || i + 1} must have a role.`);
            return false;
          }
        }
        break;
      case "firewall":
        if (!form.equipements.Firewalls || form.equipements.Firewalls.length === 0) {
          showError("Please add at least one firewall.");
          return false;
        }
        for (let i = 0; i < form.equipements.Firewalls.length; i++) {
          const firewall = form.equipements.Firewalls[i];
          if (!firewall.nom || !firewall.nom.trim()) {
            showError(`Firewall ${i + 1} must have a name.`);
            return false;
          }
        }
        break;
      case "switch":
        if (!form.equipements.Switch || form.equipements.Switch.length === 0) {
          showError("Please add at least one switch.");
          return false;
        }
        for (let i = 0; i < form.equipements.Switch.length; i++) {
          const sw = form.equipements.Switch[i];
          if (!sw.nom || !sw.nom.trim()) {
            showError(`Switch ${i + 1} must have a name.`);
            return false;
          }
        }
        break;
      case "bornewifi":
        if (!form.equipements.BorneWifi || form.equipements.BorneWifi.length === 0) {
          showError("Please add at least one WiFi access point.");
          return false;
        }
        for (let i = 0; i < form.equipements.BorneWifi.length; i++) {
          const ap = form.equipements.BorneWifi[i];
          if (!ap.nom || !ap.nom.trim()) {
            showError(`WiFi access point ${i + 1} must have a name.`);
            return false;
          }
        }
        break;
      case "sauvegarde":
        if (!form.equipements.Sauvegarde || !form.equipements.Sauvegarde.instances || !Array.isArray(form.equipements.Sauvegarde.instances) || form.equipements.Sauvegarde.instances.length === 0) {
          showError("Please add at least one backup instance.");
          return false;
        }
        for (let i = 0; i < form.equipements.Sauvegarde.instances.length; i++) {
          const instance = form.equipements.Sauvegarde.instances[i];
          if (!instance.logiciel || !instance.logiciel.trim()) {
            showError(`Backup instance ${i + 1} must have software specified.`);
            return false;
          }
          if ((instance.logiciel === "Veeam" || instance.logiciel === "HYCU Backup") && instance.jobs && Array.isArray(instance.jobs) && instance.jobs.length > 0) {
            for (let j = 0; j < instance.jobs.length; j++) {
              const job = instance.jobs[j];
              if (!job.nom || !job.nom.trim()) {
                showError(`Backup job ${j + 1} of instance ${instance.logiciel} ${i + 1} must have a name.`);
                return false;
              }
            }
          }
          if (instance.logiciel === "HyperBackup") {
            if (!instance.hyperbackupSource || !instance.hyperbackupSource.trim()) {
              showError(`HyperBackup instance ${i + 1} must have a source NAS defined.`);
              return false;
            }
            if (!instance.hyperbackupDestination || !instance.hyperbackupDestination.trim()) {
              showError(`HyperBackup instance ${i + 1} must have a destination defined.`);
              return false;
            }
          }
        }
        break;
      case "antivirus":
        const antivirus = form.equipements.Antivirus;
        if (!antivirus.solutions || !Array.isArray(antivirus.solutions) || antivirus.solutions.length === 0) {
          showError("Please add at least one antivirus solution.");
          return false;
        }
        break;
      case "antispam":
        const antispam = form.equipements.Antispam;
        if (!antispam.solutions || !Array.isArray(antispam.solutions) || antispam.solutions.length === 0) {
          showError("Please add at least one antispam solution.");
          return false;
        }
        break;
      case "ndd":
        if (!form.equipements.NDD || form.equipements.NDD.length === 0) {
          showError("Please add at least one domain name.");
          return false;
        }
        for (let i = 0; i < form.equipements.NDD.length; i++) {
          const ndd = form.equipements.NDD[i];
          if (!ndd.nom || !ndd.nom.trim()) {
            showError(`Domain name ${i + 1} must have a name.`);
            return false;
          }
        }
        break;
      case "office365":
        break;
      case "toip":
        if (!form.equipements.TOIP || form.equipements.TOIP.length === 0) {
          showError("Please configure the VoIP solution.");
          return false;
        }
        const toip = form.equipements.TOIP[0];
        if (!toip.logiciel || !toip.logiciel.trim()) {
          showError("The VoIP solution must have a software name.");
          return false;
        }
        break;
    }
    return true;
  };
  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        submitClient();
      }
    }
  };
  const prevStep = () => {
    const currentStepKey = steps[currentStep]?.key;
    if (onBack && currentStepKey === initialStepKey) {
      onBack();
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  const submitClient = async () => {
    try {
      setSaving(true);
      const modulesMonitoring = {
        ...form.modules_monitoring
      };
      const hasNAS = Array.isArray(form.equipements?.NAS) && form.equipements.NAS.length > 0;
      if (modulesMonitoring.Stockage !== false && hasNAS) {
        modulesMonitoring.Stockage = true;
      }
      const hasBackupData = () => {
        const b = form.equipements?.Sauvegarde || {};
        if (Array.isArray(b.instances)) {
          return b.instances.some(inst => {
            if (!inst) return false;
            const versionOk = typeof inst.version === 'string' && inst.version.trim() !== '';
            const expirationOk = typeof inst.expiration === 'string' && inst.expiration.trim() !== '';
            const jobsOk = Array.isArray(inst.jobs) && inst.jobs.length > 0;
            const nameOk = typeof inst.server === 'string' && inst.server.trim() !== '';
            return versionOk || expirationOk || jobsOk || nameOk;
          });
        }
        const versionOk = typeof b.version === 'string' && b.version.trim() !== '';
        const expirationOk = typeof b.expiration === 'string' && b.expiration.trim() !== '';
        const jobsOk = Array.isArray(b.jobs) && b.jobs.length > 0;
        return versionOk || expirationOk || jobsOk;
      };
      if (modulesMonitoring.Sauvegarde !== false && hasBackupData()) {
        modulesMonitoring.Sauvegarde = true;
      }
      const safeEquipements = {
        ...form.equipements
      };
      if (!modulesMonitoring.Office365) {
        try {
          await deleteClientOffice365Credentials(form.id);
          console.log('Credentials Office365 supprimés');
        } catch (error) {
          console.warn('Error deleting des credentials Office365:', error);
        }
        delete safeEquipements.O365;
        delete safeEquipements.Office365;
      }
      const moduleToEquipmentMap = {
        Internet: 'Internet',
        Serveurs: 'Serveurs',
        Stockage: 'NAS',
        Firewall: 'Firewall',
        Switch: 'Switch',
        BorneWifi: 'BorneWifi',
        Sauvegarde: 'Sauvegarde',
        Antivirus: 'Antivirus',
        Antispam: 'Antispam',
        NDD: 'NDD',
        CertificatsSSL: 'CertificatsSSL',
        TOIP: 'TOIP'
      };
      Object.entries(moduleToEquipmentMap).forEach(([moduleKey, equipmentKey]) => {
        if (!modulesMonitoring[moduleKey]) {
          delete safeEquipements[equipmentKey];
        }
      });
      if (!hasBackupData()) delete safeEquipements.Sauvegarde;
      if (!hasBackupData()) delete safeEquipements.Sauvegarde;
      const updateData = {
        name: initialClient.name,
        report_frequency: form.report_frequency,
        contrat: form.contrat || {},
        ssid: form.ssids || []
      };
      await updateClient(form.id, updateData);
      if (form.modules_monitoring.Office365 && form.office365_data) {
        try {
          const credentialsToSave = {
            tenantId: form.office365_data.tenantId || '',
            clientIdAzure: form.office365_data.clientIdAzure || '',
            clientSecret: form.office365_data.clientSecret || '',
            secretKeyId: form.office365_data.secretKeyId || null
          };
          if (credentialsToSave.tenantId || credentialsToSave.clientIdAzure || credentialsToSave.clientSecret) {
            await saveClientOffice365Credentials(form.id, credentialsToSave);
          }
        } catch (error) {
          console.warn('Erreur lors de la sauvegarde des credentials Office365:', error);
        }
      }
      await saveClientModules(form.id, {
        modules: form.modules,
        modules_monitoring: modulesMonitoring,
        equipements: safeEquipements
      });
      try {
        const freshModulesData = await fetchClientModules(form.id);
        if (freshModulesData) {}
      } catch (error) {
        console.warn('Avertissement: Impossible de recharger les données après sauvegarde:', error);
      }
      showSuccess("Client updated successfully!");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      showError("Error saving client.");
    } finally {
      setSaving(false);
    }
  };
  const handleConfirmExit = () => {
    setShowConfirmExit(false);
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };
  return <>
      <div className={styles.modalStepsWrapper} onClick={() => setShowConfirmExit(true)}>
        <div className={adminStyles.modalContent} style={{
        maxWidth: '800px',
        width: '90%',
        height: '90vh',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'contain'
      }} onClick={e => e.stopPropagation()}>
          {}
          <div className={adminStyles.modalHeader}>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
              {currentStepData?.key === 'internet' ? <Icon icon="mdi:web" className={adminStyles.modalIcon} style={{
              color: '#3b82f6',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'serveurs' ? <Icon icon="mingcute:server-fill" className={adminStyles.modalIcon} style={{
              width: '32px',
              height: '32px',
              color: '#3b82f6'
            }} /> : currentStepData?.key === 'stockage' ? <Icon icon="mdi:harddisk" className={adminStyles.modalIcon} style={{
              color: '#3b82f6',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'firewall' ? <Icon icon="mdi:firewall" className={adminStyles.modalIcon} style={{
              color: '#3b82f6',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'switch' ? <Icon icon="mdi:ethernet" className={adminStyles.modalIcon} style={{
              color: '#2563eb',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'bornewifi' ? <Icon icon="mdi:wifi" className={adminStyles.modalIcon} style={{
              color: '#2563eb',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'sauvegarde' ? <Icon icon="material-symbols:backup" className={adminStyles.modalIcon} style={{
              width: '32px',
              height: '32px',
              color: '#ef4444'
            }} /> : currentStepData?.key === 'antivirus' ? <Icon icon="mdi:shield-check" className={adminStyles.modalIcon} style={{
              color: '#ef4444',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'antispam' ? <Icon icon="mdi:email-secure" className={adminStyles.modalIcon} style={{
              color: '#ef4444',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'ndd' ? <Icon icon="mdi:domain" className={adminStyles.modalIcon} style={{
              color: '#8b5cf6',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'office365' ? <Icon icon="hugeicons:office-365" className={adminStyles.modalIcon} style={{
              color: '#8b5cf6',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.key === 'toip' ? <Icon icon="mdi:phone" className={adminStyles.modalIcon} style={{
              color: '#3b82f6',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} /> : currentStepData?.icon ? <img src={currentStepData.icon} alt="" style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain'
            }} /> : <Icon icon="mdi:monitor-dashboard" className={adminStyles.modalIcon} style={{
              color: '#2563eb',
              fontSize: '32px',
              width: '32px',
              height: '32px'
            }} />}
              <h3>{currentStepData?.label || "Enabled Monitoring Modules"}</h3>
            </div>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
              {(currentStepData?.key === 'internet' || currentStepData?.key === 'serveurs' || currentStepData?.key === 'stockage' || currentStepData?.key === 'firewall' || currentStepData?.key === 'switch' || currentStepData?.key === 'bornewifi' || currentStepData?.key === 'ndd' || currentStepData?.key === 'toip' || currentStepData?.key === 'sauvegarde' || currentStepData?.key === 'antivirus' || currentStepData?.key === 'antispam') && <button className={adminStyles.actionButton} onClick={() => handleAdd(currentStepData.key)} title="Add" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0
            }}>
                  <Icon icon="mdi:plus" style={{
                fontSize: '16px',
                color: '#15d1a0'
              }} />
                </button>}
              {(currentStepData?.key === 'switch' || currentStepData?.key === 'bornewifi') && <>
                  <button className={adminStyles.actionButton} onClick={() => handleImport(currentStepData.key)} title="Import" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0
              }}>
                    <Icon icon="mdi:download" style={{
                  fontSize: '16px',
                  color: '#15d1a0'
                }} />
                  </button>
                  <button className={`${adminStyles.actionButton} ${adminStyles.danger}`} onClick={() => handleRemoveAll(currentStepData.key)} title="Delete all" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                backgroundColor: '#ef4444',
                border: 'none',
                color: 'white'
              }}>
                    <Icon icon="mdi:delete" style={{
                  fontSize: '16px',
                  color: '#ffffff'
                }} />
                  </button>
                </>}
              {currentStepData?.key === 'ndd' && <button className={adminStyles.actionButton} onClick={() => handleImport(currentStepData.key)} title="Import OVH domains" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0
            }}>
                  <Icon icon="mdi:cloud-download" style={{
                fontSize: '16px',
                color: '#15d1a0'
              }} />
                </button>}
            </div>
          </div>

          {}
          <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          scrollbarGutter: 'stable',
          overscrollBehavior: 'contain',
          padding: '1.5rem'
        }}>
            {CurrentStepComponent && <CurrentStepComponent form={form} setForm={setForm} isEditing={isEditing} initialClient={initialClient} showTypeModal={currentStepData?.key ? getShowTypeModal(currentStepData.key) : undefined} setShowTypeModal={currentStepData?.key ? value => setShowTypeModal(currentStepData.key, value) : undefined} onAdd={currentStepData?.key && ['firewall', 'switch', 'bornewifi', 'ndd', 'toip', 'sauvegarde', 'antivirus', 'antispam'].includes(currentStepData.key) ? stepAddRef.current : undefined} onImport={currentStepData?.key && ['switch', 'bornewifi', 'ndd'].includes(currentStepData.key) ? stepImportRef.current : undefined} onRemoveAll={currentStepData?.key && ['switch', 'bornewifi'].includes(currentStepData.key) ? stepRemoveAllRef.current : undefined} currentStepData={currentStepData} />}
          </div>

          {}
          <div className={adminStyles.modalActions} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
            {}
            {!isSingleStepMode && <div style={{
            width: '100%'
          }}>
              <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '0',
              overflow: 'hidden'
            }}>
                <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #15d1a0 0%, #13ba8e 100%)',
                transition: 'width 0.3s ease'
              }} />
              </div>
            </div>}
            
            {}
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
              {(currentStep > 0 || isSingleStepMode && onBack) && <button className={adminStyles.actionButton} onClick={prevStep} title={onBack && steps[currentStep]?.key === initialStepKey ? "Back to add equipment" : "Previous"} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0
            }}>
                  <Icon icon="mdi:chevron-left" style={{
                fontSize: '16px',
                color: '#15d1a0'
              }} />
                </button>}
              <div style={{
              flex: 1
            }} />
              <button className={adminStyles.primaryButton} onClick={nextStep} disabled={saving} title={currentStep === steps.length - 1 ? "Finish" : "Next"} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0
            }}>
                {currentStep === steps.length - 1 ? saving ? <Icon icon="mdi:loading" className={adminStyles.loading} style={{
                fontSize: '16px'
              }} /> : <Icon icon="mdi:check" style={{
                fontSize: '16px'
              }} /> : <Icon icon="mdi:chevron-right" style={{
                fontSize: '16px'
              }} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      <ConfirmationModal isOpen={showConfirmExit} onConfirm={handleConfirmExit} onCancel={() => setShowConfirmExit(false)} title="Leave without saving" message="Are you sure you want to leave? All unsaved changes will be lost." confirmLabel="Leave" cancelLabel="Continue" confirmColor="warning" />
    </>;
}
