import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaSync, FaExclamationCircle, FaLink } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Firewalls.module.css";
import SmartTooltip from "../../SmartTooltip";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import CheckMKMappingModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/CheckMKMappingModal";
import { useTheme } from "../../../hooks/useTheme";
const toastOptions = {
  position: "bottom-right",
  autoClose: 3000
};
const defaultServices = ["CPU", "MEMOIRE", "TRAFIC", "UPTIME"];
const availableModules = ["Cloud Backup", "HA Link", "Memory", "Certificats", "Reports", "CPU", "Temperature", "SD-WAN"];
const Firewalls = ({
  config,
  setConfig,
  data,
  setData,
  onSyncAllCheckMKReady
}) => {
  const {
    theme
  } = useTheme();
  const firewallList = config?.client?.equipements?.Firewalls || [];
  const [checkmkMappings, setCheckmkMappings] = useState({});
  const [checkmkData, setCheckmkData] = useState({});
  const [loadingCheckMK, setLoadingCheckMK] = useState({});
  const getCheckMKMapping = useCallback(firewallNameOrId => {
    if (!firewallNameOrId) return null;
    const idKey = String(firewallNameOrId);
    if (checkmkMappings[idKey]) {
      return checkmkMappings[idKey];
    }
    const firewall = firewallList.find(fw => fw.nom === firewallNameOrId);
    if (firewall?.id && checkmkMappings[String(firewall.id)]) {
      return checkmkMappings[String(firewall.id)];
    }
    return null;
  }, [checkmkMappings, firewallList]);
  const [openComments, setOpenComments] = useState({});
  const [syncMode, setSyncMode] = useState({});
  const [eventsCount, setEventsCount] = useState({});
  const [eventsData, setEventsData] = useState({});
  const [availabilityData, setAvailabilityData] = useState({});
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [animatedScore, setAnimatedScore] = useState({});
  const [animatedAvailability, setAnimatedAvailability] = useState({});
  const [animatedServices, setAnimatedServices] = useState({});
  const [animatedEvents, setAnimatedEvents] = useState({});
  const [scoreAnimationComplete, setScoreAnimationComplete] = useState({});
  const [editingScore, setEditingScore] = useState({});
  const [editingScoreValue, setEditingScoreValue] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);
  const [editingFirewall, setEditingFirewall] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({
    isOpen: false,
    firewallId: null
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const dataRef = useRef(data);
  const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
  const syncAllCheckMKRef = useRef(null);
  const animationTimersRef = useRef({});
  const hasRestoredDataRef = useRef(null);
  useEffect(() => {
    if (!data) return;
    setOpenComments(prev => {
      const next = {
        ...prev
      };
      Object.keys(data).forEach(firewallName => {
        const isOpen = data[firewallName]?.isCommentOpen;
        if (typeof isOpen === 'boolean') {
          next[firewallName] = isOpen;
        }
      });
      return next;
    });
  }, [data]);
  const clearAnimationTimers = useCallback(firewallName => {
    if (animationTimersRef.current[firewallName]) {
      const timers = animationTimersRef.current[firewallName];
      if (timers.scoreTimer) clearInterval(timers.scoreTimer);
      if (timers.availabilityTimer) clearInterval(timers.availabilityTimer);
      if (timers.servicesTimer) clearInterval(timers.servicesTimer);
      if (timers.eventsTimer) clearInterval(timers.eventsTimer);
      if (timers.scoreTimeout) clearTimeout(timers.scoreTimeout);
      delete animationTimersRef.current[firewallName];
    }
  }, []);
  const updateValue = (firewallName, service, level, value) => {
    const updated = {
      ...data,
      [firewallName]: {
        ...(data[firewallName] || {}),
        [service]: {
          ...(data[firewallName]?.[service] || {}),
          [level]: value
        }
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const updateComment = (firewallName, comment) => {
    const updated = {
      ...data,
      [firewallName]: {
        ...(data[firewallName] || {}),
        comment
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const toggleCommentVisibility = firewallName => {
    setOpenComments(prev => {
      const nextIsOpen = !prev[firewallName];
      const nextState = {
        ...prev,
        [firewallName]: nextIsOpen
      };
      const currentData = dataRef.current || data || {};
      const updated = {
        ...currentData,
        [firewallName]: {
          ...(currentData[firewallName] || {}),
          isCommentOpen: nextIsOpen
        }
      };
      setData(updated);
      dataRef.current = updated;
      return nextState;
    });
  };
  const startEditScore = (firewallName, currentScore) => {
    setEditingScore(prev => ({
      ...prev,
      [firewallName]: true
    }));
    setEditingScoreValue(prev => ({
      ...prev,
      [firewallName]: currentScore || ''
    }));
  };
  const applyManualScore = useCallback((firewallName, scoreValue) => {
    const currentData = dataRef.current || data || {};
    const updated = {
      ...currentData,
      [firewallName]: {
        ...(currentData[firewallName] || {}),
        manualHealthScore: scoreValue
      }
    };
    setData(updated);
    dataRef.current = updated;
    setEditingScore(prev => ({
      ...prev,
      [firewallName]: false
    }));
    setEditingScoreValue(prev => {
      if (prev?.[firewallName] === undefined) return prev;
      const newValue = {
        ...prev
      };
      delete newValue[firewallName];
      return newValue;
    });
  }, [data, setData]);
  const saveEditScore = firewallName => {
    const manualScore = editingScoreValue[firewallName];
    if (manualScore !== undefined && manualScore !== null && manualScore !== '') {
      const scoreValue = Math.max(0, Math.min(100, parseInt(manualScore, 10) || 0));
      applyManualScore(firewallName, scoreValue);
    } else {
      setEditingScore(prev => ({
        ...prev,
        [firewallName]: false
      }));
      setEditingScoreValue(prev => {
        const newValue = {
          ...prev
        };
        delete newValue[firewallName];
        return newValue;
      });
    }
  };
  const cancelEditScore = firewallName => {
    setEditingScore(prev => ({
      ...prev,
      [firewallName]: false
    }));
    setEditingScoreValue(prev => {
      const newValue = {
        ...prev
      };
      delete newValue[firewallName];
      return newValue;
    });
  };
  const handleManualLetterSelect = (firewallName, letter) => {
    const scoreValue = letterToScore(letter);
    if (scoreValue === null) return;
    applyManualScore(firewallName, scoreValue);
  };
  const handleInputFocus = (e, service, type) => {
    e.target.select();
    setFocusedInput({
      service,
      type
    });
  };
  const handleInputBlur = () => {
    setFocusedInput(null);
  };
  const updateModuleStatus = (firewallName, moduleName, status) => {
    const updated = {
      ...data,
      [firewallName]: {
        ...(data[firewallName] || {}),
        modules: {
          ...(data[firewallName]?.modules || {}),
          [moduleName]: status
        }
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const getTotal = (firewallName, service) => {
    const firewallData = data?.[firewallName]?.[service] || {};
    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
    const ok = firewallData.ok !== undefined ? parse(firewallData.ok, 100) : 100;
    const warn = firewallData.warn !== undefined ? parse(firewallData.warn, 0) : 0;
    const crit = firewallData.crit !== undefined ? parse(firewallData.crit, 0) : 0;
    return ok + warn + crit;
  };
  const hasInvalidLines = firewallName => {
    return defaultServices.some(service => getTotal(firewallName, service) !== 100);
  };
  const getHAInfo = firewall => {
    if (!firewall.modeHA) return null;
    return {
      role: firewall.roleHA
    };
  };
  const getProgressiveColor = value => {
    if (value >= 85) {
      return '#10b981';
    } else if (value >= 70) {
      return '#f59e0b';
    } else if (value >= 50) {
      return '#f97316';
    } else {
      return '#ef4444';
    }
  };
  const getFirewallHealthScore = firewallName => {
    const sourceData = dataRef.current || data || {};
    const rawFirewallData = sourceData?.[firewallName];
    const firewall = firewallList.find(fw => fw.nom === firewallName);
    const isMapped = Boolean(firewall?.id && checkmkMappings[firewall.id]);
    const hasSyncData = Boolean(rawFirewallData?.lastSyncDate);
    if (isMapped && !hasSyncData) {
      return null;
    }
    const firewallData = rawFirewallData || {};
    const serviceAvailabilityWeight = isMapped ? 0.3 : 0.5;
    let totalScore = 0;
    let weightSum = 0;
    let hasCriticalServices = false;
    let hasEvents = false;
    let hasLowAvailability = false;
    let serviceScore = 0;
    let serviceCount = 0;
    let totalCritRatio = 0;
    defaultServices.forEach(service => {
      const serviceData = firewallData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      const ok = parse(serviceData.ok, 100);
      const warn = parse(serviceData.warn, 0);
      const crit = parse(serviceData.crit, 0);
      if (crit > 0) hasCriticalServices = true;
      const serviceTotal = ok + warn + crit;
      if (serviceTotal > 0) {
        const okRatio = ok / serviceTotal;
        const warnRatio = warn / serviceTotal;
        const critRatio = crit / serviceTotal;
        totalCritRatio += critRatio;
        let critScore = 0;
        if (critRatio > 0.1) {
          critScore = 0;
        } else if (critRatio > 0.05) {
          critScore = critRatio * 15;
        } else {
          critScore = critRatio * 30;
        }
        serviceScore += okRatio * 100 + warnRatio * 50 + critScore;
        serviceCount++;
      }
    });
    if (serviceCount > 0) {
      serviceScore = serviceScore / serviceCount;
      totalCritRatio = totalCritRatio / serviceCount;
      totalScore += serviceScore * serviceAvailabilityWeight;
      weightSum += serviceAvailabilityWeight;
    }
    let eventCount = 0;
    if (isMapped) {
      eventCount = eventsCount[firewallName] || 0;
      if (eventCount > 0) {
        hasEvents = true;
      }
      let eventScore = 100;
      if (eventCount === 0) {
        eventScore = 100;
      } else if (eventCount === 1) {
        eventScore = 70;
      } else if (eventCount <= 3) {
        eventScore = 50;
      } else if (eventCount <= 6) {
        eventScore = 30;
      } else {
        eventScore = 15;
      }
      totalScore += eventScore * 0.2;
      weightSum += 0.2;
    }
    let availabilityValue = 100;
    if (isMapped && availabilityData[firewallName]) {
      availabilityValue = parseFloat(availabilityData[firewallName].up || 0);
      if (availabilityValue < 95) {
        hasLowAvailability = true;
      }
      let availabilityScore = availabilityValue;
      if (availabilityValue < 80) {
        availabilityScore = Math.min(availabilityValue, 50);
      } else if (availabilityValue < 95) {
        availabilityScore = Math.min(availabilityValue, 70);
      }
      totalScore += availabilityScore * 0.3;
      weightSum += 0.3;
    }
    let moduleScore = 100;
    let hasDisabledModules = false;
    let hasInactiveModules = false;
    if (firewallData?.modules) {
      let activeCount = 0;
      let inactiveCount = 0;
      let disabledCount = 0;
      let totalModules = 0;
      availableModules.forEach(module => {
        const moduleStatus = firewallData.modules[module] || "active";
        totalModules++;
        if (moduleStatus === "active") {
          activeCount++;
        } else if (moduleStatus === "inactive") {
          inactiveCount++;
          hasInactiveModules = true;
        } else if (moduleStatus === "disabled") {
          disabledCount++;
          hasDisabledModules = true;
        }
      });
      if (totalModules > 0) {
        moduleScore = (activeCount * 100 + inactiveCount * 100 + disabledCount * 0) / totalModules;
      }
    }
    if (isMapped) {
      totalScore += moduleScore * 0.2;
      weightSum += 0.2;
    } else {
      totalScore += moduleScore * 0.5;
      weightSum += 0.5;
    }
    if (weightSum === 0) return null;
    let finalScore = Math.round(totalScore / weightSum);
    if (hasCriticalServices && serviceCount > 0) {
      let critCeiling = 100;
      if (totalCritRatio >= 0.2) {
        critCeiling = 30;
      } else if (totalCritRatio >= 0.1) {
        critCeiling = 50;
      } else if (totalCritRatio >= 0.05) {
        critCeiling = 70;
      } else if (totalCritRatio >= 0.02) {
        critCeiling = 85;
      } else {
        critCeiling = 95;
      }
      if (finalScore > critCeiling) {
        finalScore = Math.min(finalScore, critCeiling);
      }
    }
    if (isMapped && availabilityValue < 80) {
      finalScore = Math.min(finalScore, 50);
    } else if (isMapped && availabilityValue < 95) {
      finalScore = Math.min(finalScore, 70);
    }
    if (isMapped && hasEvents && finalScore > 70) {
      finalScore = Math.min(finalScore, 70);
    }
    if (isMapped && eventCount >= 4 && finalScore > 50) {
      finalScore = Math.min(finalScore, 50);
    }
    if (hasDisabledModules && finalScore > 75) {
      finalScore = Math.min(finalScore, 75);
    }
    return finalScore;
  };
  const getFirewallInfo = firewall => {
    const MaynInfo = [];
    const deviceInfo = [];
    let warrantyInfo = null;
    let MaintenanceInfo = null;
    if (firewall.ip) MaynInfo.push(`IP : ${firewall.ip}`);
    if (firewall.firmware) MaynInfo.push(`FW ${firewall.firmware}`);
    if (firewall.fabricant && firewall.modele) deviceInfo.push(`${firewall.fabricant} ${firewall.modele}`);else if (firewall.fabricant) deviceInfo.push(firewall.fabricant);else if (firewall.modele) deviceInfo.push(firewall.modele);
    if (firewall.numeroSerie) deviceInfo.push(firewall.numeroSerie);
    if (firewall.expirationGarantie) {
      const expirationDate = new Date(firewall.expirationGarantie);
      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      warrantyInfo = {
        date: expirationDate.toLocaleDateString('en-US'),
        expired: daysUntilExpiration < 0,
        daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null
      };
    }
    if (firewall.licences && Array.isArray(firewall.licences)) {
      const MaintenanceLicense = firewall.licences.find(licence => {
        const nom = (licence.nom || '').toLowerCase();
        return nom.includes('Maintenance');
      });
      if (MaintenanceLicense && MaintenanceLicense.expiration) {
        const expirationDate = new Date(MaintenanceLicense.expiration);
        if (!isNaN(expirationDate.getTime())) {
          MaintenanceInfo = {
            date: expirationDate.toLocaleDateString('en-US')
          };
        }
      }
    }
    return {
      MaynInfo,
      deviceInfo,
      warrantyInfo,
      MaintenanceInfo
    };
  };
  const getLicenseStatus = firewall => {
    if (!firewall.expirationGarantie) return {
      status: "unknown",
      color: "gray"
    };
    const expirationDate = new Date(firewall.expirationGarantie);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiration < 0) {
      return {
        status: "expired",
        color: "red"
      };
    } else if (daysUntilExpiration <= 7) {
      return {
        status: "critical",
        color: "red"
      };
    } else if (daysUntilExpiration <= 30) {
      return {
        status: "warning",
        color: "orange"
      };
    } else {
      return {
        status: "valid",
        color: "green"
      };
    }
  };
  const hasWarningOrCritical = firewallName => {
    const firewallData = data?.[firewallName];
    if (!firewallData) return false;
    return defaultServices.some(service => {
      const serviceData = firewallData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      const warn = serviceData.warn !== undefined ? parse(serviceData.warn, 0) : 0;
      const crit = serviceData.crit !== undefined ? parse(serviceData.crit, 0) : 0;
      return warn > 0 || crit > 0;
    });
  };
  const hasProblems = firewallName => {
    if (hasWarningOrCritical(firewallName)) {
      return true;
    }
    const firewallData = data?.[firewallName];
    if (firewallData?.modules) {
      return availableModules.some(module => {
        const moduleStatus = firewallData.modules[module] || "active";
        return moduleStatus === "disabled";
      });
    }
    return false;
  };
  const saveFirewall = async (firewallId, firewallData) => {
    const clientId = config?.client?.id;
    if (!clientId) {
      throw new Error("ID client manquant");
    }
    const {
      id,
      __fromDb,
      __index,
      ...dataForDb
    } = firewallData;
    const body = {
      item_key: firewallData.nom || `firewall-${firewallId}`,
      name: firewallData.nom || `Firewall`,
      data: dataForDb,
      is_active: true
    };
    const method = firewallId ? "PUT" : "POST";
    const url = firewallId ? `${API_BASE_URL}/clients/modules/${clientId}/firewall/${firewallId}` : `${API_BASE_URL}/clients/modules/${clientId}/firewall`;
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`Error while saving (${res.status})`);
    }
    const savedRow = await res.json();
    return savedRow;
  };
  const handleSaveFirewall = async () => {
    if (!editingFirewall || !editForm) return;
    setIsSaving(true);
    try {
      const updatedFirewall = {
        ...editingFirewall,
        nom: editForm.nom,
        ip: editForm.ip,
        firmware: editForm.firmware,
        fabricant: editForm.fabricant,
        modele: editForm.modele,
        numeroSerie: editForm.numeroSerie,
        expirationGarantie: editForm.expirationGarantie,
        site: editForm.site || '',
        vlan: editForm.vlan || '',
        licences: editForm.licences || []
      };
      const oldName = editingFirewall.nom;
      const newName = editForm.nom;
      const savedRow = await saveFirewall(editingFirewall.id, updatedFirewall);
      setConfig(prev => {
        if (!prev?.client?.equipements?.Firewalls) return prev;
        const updatedList = prev.client.equipements.Firewalls.map(fw => {
          if (fw.id === editingFirewall.id) {
            const {
              id: dataId,
              ...dataWithoutId
            } = savedRow.data || {};
            return {
              id: savedRow.id,
              ...dataWithoutId,
              nom: savedRow.data?.nom || savedRow.name || savedRow.item_key || "",
              __fromDb: true
            };
          }
          return fw;
        });
        return {
          ...prev,
          client: {
            ...prev.client,
            equipements: {
              ...prev.client.equipements,
              Firewalls: updatedList
            }
          }
        };
      });
      if (oldName !== newName && checkmkMappings[oldName]) {
        setCheckmkMappings(prev => {
          const updated = {
            ...prev
          };
          updated[newName] = {
            ...updated[oldName],
            equipment_name: newName
          };
          delete updated[oldName];
          return updated;
        });
      }
      if (config?.client?.id) {
        try {
          const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const mappings = await response.json();
            const mappingsMap = {};
            mappings.forEach(m => {
              if (m.equipment_type === 'Firewalls' && m.is_active !== false) {
                mappingsMap[m.equipment_name] = m;
              }
            });
            setCheckmkMappings(mappingsMap);
          }
        } catch (error) {
          console.error('❌ [Firewalls] Error reloading Check MK mappings after save:', error);
        }
      }
      toast.success("Firewall updated", toastOptions);
      setEditingFirewall(null);
      setEditForm(null);
    } catch (error) {
      console.error("Error while saving:", error);
      toast.error("Error while saving", toastOptions);
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    if (!config?.client?.id || !setConfig) return;
    const controller = new AbortController();
    const loadFirewallsFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/firewall`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) return;
        const rows = await res.json();
        const firewallList = (rows || []).map(row => {
          const {
            id: dataId,
            ...dataWithoutId
          } = row.data || {};
          return {
            id: row.id,
            ...dataWithoutId,
            nom: row.data?.nom || row.name || row.item_key || "",
            __fromDb: true
          };
        });
        setConfig(prev => {
          if (!prev?.client) return prev;
          return {
            ...prev,
            client: {
              ...prev.client,
              equipements: {
                ...(prev.client.equipements || {}),
                Firewalls: firewallList
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading firewalls:", err);
      }
    };
    loadFirewallsFromDb();
    return () => controller.abort();
  }, [config?.client?.id, setConfig]);
  useEffect(() => {
    if (!config?.client?.id) return;
    const loadMappings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${config.client.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const mappings = await response.json();
          const mappingsMap = {};
          mappings.forEach(m => {
            const type = (m.equipment_type || "").toLowerCase();
            const isFirewallType = ['firewalls', 'firewall'].includes(type);
            if (isFirewallType && m.is_active !== false && m.equipment_id) {
              mappingsMap[m.equipment_id] = m;
            }
          });
          setCheckmkMappings(mappingsMap);
        }
      } catch (error) {
        console.error('❌ [Firewalls] Error loading Check MK mappings:', error);
      }
    };
    loadMappings();
  }, [config?.client?.id]);
  const getReportPeriod = () => {
    if (config?.client?.checkmkPeriod) {
      return {
        start_time: config.client.checkmkPeriod.start_time,
        end_time: config.client.checkmkPeriod.end_time
      };
    }
    const now = new Date();
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startTime = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0);
    return {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    };
  };
  const loadEventsCount = async (firewallName, checkmkHostName) => {
    if (!checkmkHostName) return;
    const period = getReportPeriod();
    if (!period.start_time || !period.end_time) {
      setEventsCount(prev => ({
        ...prev,
        [firewallName]: 0
      }));
      setEventsData(prev => ({
        ...prev,
        [firewallName]: []
      }));
      if (typeof setData === 'function') {
        const currentData = dataRef.current || {};
        const updated = {
          ...currentData,
          [firewallName]: {
            ...(currentData[firewallName] || {}),
            eventsCount: 0,
            eventsData: []
          }
        };
        setData(updated);
        dataRef.current = updated;
      }
      return;
    }
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
      url.searchParams.append('start_time', period.start_time);
      url.searchParams.append('end_time', period.end_time);
      const mapping = getCheckMKMapping(firewallName);
      if (mapping?.checkmk_site) {
        url.searchParams.append('site', mapping.checkmk_site);
      }
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const eventsCountValue = result.events_count || 0;
        const eventsDataValue = result.events || [];
        setEventsCount(prev => ({
          ...prev,
          [firewallName]: eventsCountValue
        }));
        setEventsData(prev => ({
          ...prev,
          [firewallName]: eventsDataValue
        }));
        if (typeof setData === 'function') {
          const currentData = dataRef.current || {};
          const updated = {
            ...currentData,
            [firewallName]: {
              ...(currentData[firewallName] || {}),
              eventsCount: eventsCountValue,
              eventsData: eventsDataValue
            }
          };
          setData(updated);
          dataRef.current = updated;
        }
      } else {
        setEventsCount(prev => ({
          ...prev,
          [firewallName]: 0
        }));
        setEventsData(prev => ({
          ...prev,
          [firewallName]: []
        }));
        if (typeof setData === 'function') {
          const currentData = dataRef.current || {};
          const updated = {
            ...currentData,
            [firewallName]: {
              ...(currentData[firewallName] || {}),
              eventsCount: 0,
              eventsData: []
            }
          };
          setData(updated);
          dataRef.current = updated;
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEventsCount(prev => ({
        ...prev,
        [firewallName]: 0
      }));
      setEventsData(prev => ({
        ...prev,
        [firewallName]: []
      }));
      if (typeof setData === 'function') {
        const currentData = dataRef.current || {};
        const updated = {
          ...currentData,
          [firewallName]: {
            ...(currentData[firewallName] || {}),
            eventsCount: 0,
            eventsData: []
          }
        };
        setData(updated);
        dataRef.current = updated;
      }
    }
  };
  const loadAvailabilityData = async (firewallName, checkmkHostName) => {
    if (!checkmkHostName) return;
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
      const mapping = getCheckMKMapping(firewallName);
      if (mapping?.checkmk_site) {
        url.searchParams.append('site', mapping.checkmk_site);
      }
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const availabilityValue = result.availability || result;
        setAvailabilityData(prev => ({
          ...prev,
          [firewallName]: availabilityValue
        }));
        if (typeof setData === 'function') {
          const currentData = dataRef.current || {};
          const updated = {
            ...currentData,
            [firewallName]: {
              ...(currentData[firewallName] || {}),
              availabilityData: availabilityValue
            }
          };
          setData(updated);
          dataRef.current = updated;
        }
      } else {
        console.warn(`⚠️ [Availability] Error for ${firewallName}: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };
  const loadCheckMKData = async (firewallName, checkmkHostName, showToast = true) => {
    if (loadingCheckMK[firewallName]) return;
    setSyncMode(prev => ({
      ...prev,
      [firewallName]: 'stats'
    }));
    const currentDataBeforeSync = dataRef.current || {};
    const updatedBeforeSync = {
      ...currentDataBeforeSync,
      [firewallName]: {
        ...(currentDataBeforeSync[firewallName] || {}),
        syncMode: 'stats',
        manualHealthScore: undefined
      }
    };
    setData(updatedBeforeSync);
    dataRef.current = updatedBeforeSync;
    setAnimatedScore(prev => ({
      ...prev,
      [firewallName]: 0
    }));
    setScoreAnimationComplete(prev => ({
      ...prev,
      [firewallName]: false
    }));
    setLoadingCheckMK(prev => ({
      ...prev,
      [firewallName]: true
    }));
    try {
      const period = getReportPeriod();
      const url = new URL(`${API_BASE_URL}/checkmk/services/${encodeURIComponent(checkmkHostName)}`);
      if (period.start_time && period.end_time) {
        url.searchParams.append('start_time', period.start_time);
        url.searchParams.append('end_time', period.end_time);
      }
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const services = result.services || [];
        const checkmkDataValue = {
          services: services,
          serviceInfo: {
            total: services.length
          }
        };
        setCheckmkData(prev => ({
          ...prev,
          [firewallName]: checkmkDataValue
        }));
        const currentData = dataRef.current || {};
        const updated = {
          ...currentData,
          [firewallName]: {
            ...(currentData[firewallName] || {}),
            checkmkData: checkmkDataValue,
            lastSyncDate: new Date().toISOString()
          }
        };
        setData(updated);
        dataRef.current = updated;
        const period = getReportPeriod();
        const mapping = getCheckMKMapping(firewallName);
        if (period?.start_time && period?.end_time) {
          try {
            const reportData = await getCheckMKReportPeriodData(checkmkHostName, period.start_time, period.end_time, mapping?.checkmk_site || null);
            const ev = reportData?.events || {};
            const av = reportData?.availability || {};
            const eventsCountValue = ev.events_count ?? 0;
            const eventsDataValue = ev.events || [];
            const availabilityValue = av.availability || null;
            setEventsCount(prev => ({
              ...prev,
              [firewallName]: eventsCountValue
            }));
            setEventsData(prev => ({
              ...prev,
              [firewallName]: eventsDataValue
            }));
            if (availabilityValue) {
              setAvailabilityData(prev => ({
                ...prev,
                [firewallName]: availabilityValue
              }));
            } else {
              await loadAvailabilityData(firewallName, checkmkHostName);
            }
            if (typeof setData === 'function') {
              const currentData = dataRef.current || {};
              const updated = {
                ...currentData,
                [firewallName]: {
                  ...(currentData[firewallName] || {}),
                  eventsCount: eventsCountValue,
                  eventsData: eventsDataValue,
                  ...(availabilityValue && {
                    availabilityData: availabilityValue
                  })
                }
              };
              setData(updated);
              dataRef.current = updated;
            }
          } catch (e) {
            await Promise.all([loadEventsCount(firewallName, checkmkHostName), loadAvailabilityData(firewallName, checkmkHostName)]);
          }
        } else {
          await Promise.all([loadEventsCount(firewallName, checkmkHostName), loadAvailabilityData(firewallName, checkmkHostName)]);
        }
      } else {}
    } catch (error) {
      console.error('CheckMK sync error:', error);
    } finally {
      setLoadingCheckMK(prev => ({
        ...prev,
        [firewallName]: false
      }));
      clearAnimationTimers(firewallName);
      animationTimersRef.current[firewallName] = {};
      setTimeout(() => {
        const finalScore = getFirewallHealthScore(firewallName);
        if (finalScore !== null) {
          setAnimatedScore(prev => ({
            ...prev,
            [firewallName]: 0
          }));
          setScoreAnimationComplete(prev => ({
            ...prev,
            [firewallName]: false
          }));
          const duration = 3000;
          const steps = 120;
          const increment = finalScore / steps;
          let currentStep = 0;
          const scoreTimer = setInterval(() => {
            currentStep++;
            const newValue = Math.min(increment * currentStep, finalScore);
            setAnimatedScore(prev => ({
              ...prev,
              [firewallName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(scoreTimer);
              setAnimatedScore(prev => ({
                ...prev,
                [firewallName]: finalScore
              }));
              const scoreTimeout = setTimeout(() => {
                setScoreAnimationComplete(prev => ({
                  ...prev,
                  [firewallName]: true
                }));
              }, 100);
              if (animationTimersRef.current[firewallName]) {
                animationTimersRef.current[firewallName].scoreTimeout = scoreTimeout;
              }
            }
          }, duration / steps);
          if (animationTimersRef.current[firewallName]) {
            animationTimersRef.current[firewallName].scoreTimer = scoreTimer;
          }
        }
        const availability = availabilityData[firewallName];
        if (availability && availability.up !== undefined) {
          const finalAvailability = parseFloat(availability.up || 0);
          setAnimatedAvailability(prev => ({
            ...prev,
            [firewallName]: 0
          }));
          const duration = 2000;
          const steps = 100;
          const increment = finalAvailability / steps;
          let currentStep = 0;
          const availabilityTimer = setInterval(() => {
            currentStep++;
            const newValue = Math.min(increment * currentStep, finalAvailability);
            setAnimatedAvailability(prev => ({
              ...prev,
              [firewallName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(availabilityTimer);
              setAnimatedAvailability(prev => ({
                ...prev,
                [firewallName]: finalAvailability
              }));
            }
          }, duration / steps);
          if (animationTimersRef.current[firewallName]) {
            animationTimersRef.current[firewallName].availabilityTimer = availabilityTimer;
          }
        }
        const finalServices = checkmkData[firewallName]?.services?.length || 0;
        if (finalServices > 0) {
          setAnimatedServices(prev => ({
            ...prev,
            [firewallName]: 0
          }));
          const duration = 2000;
          const steps = 100;
          const increment = finalServices / steps;
          let currentStep = 0;
          const servicesTimer = setInterval(() => {
            currentStep++;
            const newValue = Math.min(increment * currentStep, finalServices);
            setAnimatedServices(prev => ({
              ...prev,
              [firewallName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(servicesTimer);
              setAnimatedServices(prev => ({
                ...prev,
                [firewallName]: finalServices
              }));
            }
          }, duration / steps);
          if (animationTimersRef.current[firewallName]) {
            animationTimersRef.current[firewallName].servicesTimer = servicesTimer;
          }
        }
        const eventsArr = dataRef.current?.[firewallName]?.eventsData;
        const finalEvents = Array.isArray(eventsArr) ? eventsArr.filter(e => (e.state ?? e.state_type ?? 0) === 2).length : eventsCount[firewallName];
        if (finalEvents !== undefined) {
          setAnimatedEvents(prev => ({
            ...prev,
            [firewallName]: 0
          }));
          const duration = 2000;
          const steps = 100;
          const increment = finalEvents / steps;
          let currentStep = 0;
          const eventsTimer = setInterval(() => {
            currentStep++;
            const newValue = Math.min(increment * currentStep, finalEvents);
            setAnimatedEvents(prev => ({
              ...prev,
              [firewallName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(eventsTimer);
              setAnimatedEvents(prev => ({
                ...prev,
                [firewallName]: finalEvents
              }));
            }
          }, duration / steps);
          if (animationTimersRef.current[firewallName]) {
            animationTimersRef.current[firewallName].eventsTimer = eventsTimer;
          }
        }
      }, 100);
    }
  };
  const syncAllCheckMK = useCallback(async () => {
    const mappedFirewalls = firewallList.filter(fw => fw.id && checkmkMappings[fw.id]);
    if (mappedFirewalls.length === 0) {
      toast.warning('No firewall mapped with Check MK', toastOptions);
      return;
    }
    const syncPromises = mappedFirewalls.map(fw => loadCheckMKData(fw.nom, checkmkMappings[fw.id].checkmk_host_name, false));
    try {
      await Promise.all(syncPromises);
      toast.success(`Synchronization completed`, toastOptions);
    } catch (error) {
      toast.error(`Error during synchronization`, toastOptions);
    }
  }, [firewallList, checkmkMappings]);
  useEffect(() => {
    syncAllCheckMKRef.current = syncAllCheckMK;
  }, [syncAllCheckMK]);
  useEffect(() => {
    onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
  }, [onSyncAllCheckMKReady]);
  const lastNotifiedRef = useRef({
    hasMappings: null,
    isLoading: null
  });
  useEffect(() => {
    if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
      const hasMappings = firewallList.some(fw => fw.id && checkmkMappings[fw.id]);
      const isLoading = Object.values(loadingCheckMK).some(loading => loading);
      if (lastNotifiedRef.current.hasMappings === hasMappings && lastNotifiedRef.current.isLoading === isLoading) {
        return;
      }
      onSyncAllCheckMKReadyRef.current({
        syncAllCheckMK: syncAllCheckMKRef.current,
        hasCheckMKMappings: hasMappings,
        isLoading
      });
      lastNotifiedRef.current = {
        hasMappings,
        isLoading
      };
    }
  }, [checkmkMappings, loadingCheckMK, firewallList]);
  useEffect(() => {
    if (firewallList.length > 0) {
      setSyncMode(prev => {
        const updated = {
          ...prev
        };
        let hasChanges = false;
        firewallList.forEach(fw => {
          if (updated[fw.nom] === undefined) {
            updated[fw.nom] = 'stats';
            hasChanges = true;
          }
        });
        return hasChanges ? updated : prev;
      });
    }
  }, [firewallList]);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    if (!data || !firewallList.length) return;
    let hasCheckMKData = false;
    const restoredCheckmkData = {};
    const restoredEventsCount = {};
    const restoredEventsData = {};
    const restoredAvailabilityData = {};
    firewallList.forEach(firewall => {
      const firewallData = data[firewall.nom];
      if (!firewallData) return;
      const hasData = firewallData.checkmkData || firewallData.eventsCount !== undefined || firewallData.availabilityData;
      if (!hasData) return;
      hasCheckMKData = true;
      if (firewallData.checkmkData) {
        restoredCheckmkData[firewall.nom] = firewallData.checkmkData;
      }
      if (firewallData.eventsCount !== undefined) {
        restoredEventsCount[firewall.nom] = firewallData.eventsCount;
      }
      if (firewallData.eventsData) {
        restoredEventsData[firewall.nom] = firewallData.eventsData;
      }
      if (firewallData.availabilityData) {
        restoredAvailabilityData[firewall.nom] = firewallData.availabilityData;
      }
    });
    if (!hasCheckMKData) return;
    const key = JSON.stringify(Object.keys(restoredCheckmkData).sort());
    if (hasRestoredDataRef.current === key) return;
    if (Object.keys(restoredCheckmkData).length > 0) {
      setCheckmkData(prev => ({
        ...prev,
        ...restoredCheckmkData
      }));
    }
    if (Object.keys(restoredEventsCount).length > 0) {
      setEventsCount(prev => ({
        ...prev,
        ...restoredEventsCount
      }));
    }
    if (Object.keys(restoredEventsData).length > 0) {
      setEventsData(prev => ({
        ...prev,
        ...restoredEventsData
      }));
    }
    if (Object.keys(restoredAvailabilityData).length > 0) {
      setAvailabilityData(prev => ({
        ...prev,
        ...restoredAvailabilityData
      }));
    }
    hasRestoredDataRef.current = key;
  }, [data, firewallList]);
  useEffect(() => {
    return () => {
      Object.keys(animationTimersRef.current).forEach(firewallName => {
        clearAnimationTimers(firewallName);
      });
    };
  }, [clearAnimationTimers]);
  useEffect(() => {
    if (!firewallList.length || data && Object.keys(data).length > 0) return;
    const initializedData = {};
    firewallList.forEach(firewall => {
      const services = {};
      defaultServices.forEach(service => {
        services[service] = {
          ok: 100,
          warn: 0,
          crit: 0
        };
      });
      const modules = {};
      availableModules.forEach(module => {
        modules[module] = "active";
      });
      initializedData[firewall.nom] = {
        ...services,
        modules: modules,
        comment: ""
      };
    });
    setData(initializedData);
  }, [firewallList, data, setData]);
  const groupedBySite = firewallList.reduce((acc, fw) => {
    const siteName = fw.site || "No site";
    if (!acc[siteName]) {
      acc[siteName] = [];
    }
    acc[siteName].push(fw);
    return acc;
  }, {});
  const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
    if (a === "No site") return 1;
    if (b === "No site") return -1;
    return a.localeCompare(b);
  });
  if (!firewallList || firewallList.length === 0) {
    return <div className={styles.container}>
                <div className={styles.emptyState}>
                    <p>No firewall configured for this client.</p>
                </div>
            </div>;
  }
  return <div className={styles.container}>
            {sortedSites.map(siteName => {
      return <div key={siteName} className={styles.siteGroup} id={`site-${siteName}`} data-site-label={siteName}>
                        <div className={styles.siteSeparator}>
                            <h2 className={styles.siteTitle}>
                                <IconifyIcon icon="mingcute:building-4-fill" width={24} height={24} style={{
              marginRight: '0.75rem',
              flexShrink: 0,
              color: '#4b5563'
            }} />
                                <span>{siteName}</span>
                                {groupedBySite[siteName].length > 0 && <span className={styles.siteCount}>
                                    {groupedBySite[siteName].length} firewall{groupedBySite[siteName].length > 1 ? 's' : ''}
                                  </span>}
                            </h2>
                        </div>
                        <div className={styles.firewallGrid}>
                            {groupedBySite[siteName].sort((a, b) => a.nom.localeCompare(b.nom)).map((firewall, i) => {
            const firewallInfo = getFirewallInfo(firewall);
            const licenseStatus = getLicenseStatus(firewall);
            const haInfo = getHAInfo(firewall);
            const isModulesView = syncMode[firewall.nom] === 'modules';
            const needsSyncWarning = Boolean(firewall.id && checkmkMappings[firewall.id] && !data?.[firewall.nom]?.lastSyncDate && !loadingCheckMK[firewall.nom]);
            return <React.Fragment key={i}>
                            <div className={`${styles.firewallCard} ${styles.withComment} ${styles.firewallCardFlex}`}>
                                {}
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerLeft}>
                                        <div className={styles.firewallInfo}>
                                            <h3 className={styles.firewallName}>
                                                <span className={styles.firewallNameSection}>
                                                    <span className={styles.iconWrapper}>
                                                        <IconifyIcon icon="solar:shield-bold" width={28} height={28} className={styles.iconStyle} />
                                                    </span>
                                                    <span className={styles.firewallNameText}>
                                                        {firewall.nom}
                                                    </span>
                                                    {haInfo && <span className={`${styles.roleLabel} ${styles.roleLabelInline}`}>
                                                            HA {haInfo.role}
                                                        </span>}
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.firewallType}>
                                        {}
                                        <div className={styles.buttonGroup}>
                                            {firewall.id && checkmkMappings[firewall.id] && <SmartTooltip content="Sync with Check MK" as="span" style={{
                        display: 'inline-flex'
                      }}>
                                                <button type="button" className={`${styles.syncButton} ${needsSyncWarning ? styles.syncButtonWarning : ''}`} onClick={() => {
                          if (!loadingCheckMK[firewall.nom]) {
                            loadCheckMKData(firewall.nom, checkmkMappings[firewall.id].checkmk_host_name);
                          }
                        }} title={`Mapped to Check MK: ${checkmkMappings[firewall.id].checkmk_host_name}. Click to sync.`} disabled={loadingCheckMK[firewall.nom]} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.35rem',
                          background: 'var(--bg-primary)',
                          color: '#6b7280',
                          border: '2px solid var(--border-secondary)',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          cursor: loadingCheckMK[firewall.nom] ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: loadingCheckMK[firewall.nom] ? 0.5 : 1,
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }} onMouseEnter={e => {
                          if (!loadingCheckMK[firewall.nom]) {
                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          }
                        }} onMouseLeave={e => {
                          if (!loadingCheckMK[firewall.nom]) {
                            e.currentTarget.style.borderColor = 'var(--border-secondary)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                          }
                        }}>
                                                    <IconifyIcon icon="material-symbols:sync" width={14} height={14} className={loadingCheckMK[firewall.nom] ? styles.loadingIcon : ''} />
                                                </button>
                                                </SmartTooltip>}
                                            <SmartTooltip content="Edit firewall" as="span" style={{
                        display: 'inline-flex'
                      }}>
                                            <button type="button" className={styles.editButton} onClick={() => {
                          setEditingFirewall(firewall);
                          setEditForm({
                            nom: firewall.nom || '',
                            ip: firewall.ip || '',
                            firmware: firewall.firmware || '',
                            fabricant: firewall.fabricant || '',
                            modele: firewall.modele || '',
                            numeroSerie: firewall.numeroSerie || '',
                            expirationGarantie: firewall.expirationGarantie || '',
                            site: firewall.site || '',
                            vlan: firewall.vlan || '',
                            licences: firewall.licences ? [...firewall.licences] : []
                          });
                        }} title="Edit firewall">
                                                <IconifyIcon icon="material-symbols:edit" width={14} height={14} />
                                            </button>
                                            </SmartTooltip>
                                        </div>
                                    </div>
                                </div>
                                {(firewallInfo.MaynInfo.length > 0 || firewallInfo.deviceInfo.length > 0 || firewallInfo.warrantyInfo || firewallInfo.MaintenanceInfo) && <div className={`${styles.firewallMeta} ${styles.firewallMetaFlex}`}>
                                        {}
                                        <span className={styles.flexOne}>
                                            {[firewallInfo.deviceInfo.join(" "), firewallInfo.MaynInfo.join(" • ")].filter(Boolean).join(" • ")}
                                        </span>
                                        {}
                                        {(firewallInfo.warrantyInfo || firewallInfo.MaintenanceInfo) && <div className={styles.licenseInfoRow}>
                                                {firewallInfo.warrantyInfo && <span className={styles.iconTextRow}>
                                                        <IconifyIcon icon="streamline-flex:warranty-badge-highlight-solid" width={12} height={12} className={styles.iconGray} />
                                                        {firewallInfo.warrantyInfo.date}
                                                    </span>}
                                                {firewallInfo.MaintenanceInfo && <>
                                                        {firewallInfo.warrantyInfo && '•'}
                                                        <span className={styles.iconTextRow}>
                                                            <IconifyIcon icon="ix:Maintenance-octagon-filled" width={12} height={12} className={styles.iconGray} />
                                                            {firewallInfo.MaintenanceInfo.date}
                                                        </span>
                                                    </>}
                                            </div>}
                                    </div>}

                                <div className={`${styles.firewallScrollable} ${styles.firewallScrollableDynamic} ${isModulesView ? styles.firewallScrollableHidden : styles.firewallScrollableAuto}`}>
                                <div className={styles.firewallCardContent}>
                                    {}
                                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '140px',
                      height: '140px',
                      boxSizing: 'border-box',
                      width: '100%',
                      padding: '0.75rem 0.5rem'
                    }}>
                                    {}
                                    {syncMode[firewall.nom] === 'modules' && <div className={styles.modulesCompact}>
                                            <div className={styles.modulesGridCompact}>
                                                {availableModules.map(module => {
                            const currentStatus = data?.[firewall.nom]?.modules?.[module] || "active";
                            const getNextStatus = current => {
                              const statusOrder = ["inactive", "active", "disabled"];
                              const currentIndex = statusOrder.indexOf(current);
                              return statusOrder[(currentIndex + 1) % statusOrder.length];
                            };
                            const getStatusClass = status => {
                              switch (status) {
                                case "active":
                                  return "active";
                                case "disabled":
                                  return "disabled";
                                default:
                                  return "inactive";
                              }
                            };
                            const statusClass = getStatusClass(currentStatus);
                            return <button key={module} type="button" className={`${styles.moduleItem} ${styles.moduleCompact} ${styles[statusClass]}`} onClick={() => updateModuleStatus(firewall.nom, module, getNextStatus(currentStatus))}>
                                                            <span className={styles.moduleName}>{module}</span>
                                                        </button>;
                          })}
                                            </div>
                                        </div>}

                                    {}
                                    {(syncMode[firewall.nom] === 'stats' || !syncMode[firewall.nom]) && <div className={styles.statsWrapper}>
                                        {loadingCheckMK[firewall.nom] ? <div className={styles.loadingWrapper}>
                                                <IconifyIcon icon="material-symbols:sync" width={32} height={32} className={styles.loadingIcon} />
                                                <span className={styles.loadingText}>
                                                    Synchronization en cours
                                                </span>
                                            </div> : <>
                                        {}
                                        {(() => {
                            const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                            const isMapped = Boolean(mapping);
                            const hasSyncData = Boolean(data?.[firewall.nom]?.lastSyncDate);
                            const shouldShowNA = isMapped && !hasSyncData;
                            const calculatedScore = shouldShowNA ? null : getFirewallHealthScore(firewall.nom);
                            const manualScore = data?.[firewall.nom]?.manualHealthScore;
                            const healthScore = shouldShowNA ? null : manualScore !== undefined ? manualScore : calculatedScore;
                            const isLoading = false;
                            const isAnimating = animatedScore[firewall.nom] !== undefined && !scoreAnimationComplete[firewall.nom];
                            const isEditing = editingScore[firewall.nom];
                            const serviceAvailabilityWeightPercent = isMapped ? 30 : 50;
                            const scoreBreakdown = [{
                              label: "Events",
                              description: "Alerts reported by CheckMK",
                              weight: isMapped ? "20 pts" : "0 pts"
                            }, {
                              label: "Availability",
                              description: "Monitored firewall availability rate",
                              weight: isMapped ? "30 pts" : "0 pts"
                            }, {
                              label: "Service availability",
                              description: "OK / WARN / CRIT for each monitored service",
                              weight: `${serviceAvailabilityWeightPercent} pts`
                            }, {
                              label: "Modules firewall",
                              description: "Stormshield modules activation (VPN, SD-WAN, etc.)",
                              weight: isMapped ? "20 pts" : "50 pts"
                            }].filter(item => {
                              const weightNum = parseInt(item.weight.replace(' pts', ''));
                              return weightNum > 0;
                            });
                            const placeholderScore = 95;
                            let displayScore = null;
                            if (!isLoading) {
                              if (shouldShowNA) {
                                displayScore = placeholderScore;
                              } else {
                                displayScore = isAnimating ? animatedScore[firewall.nom] : healthScore;
                              }
                            }
                            const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                            const scoreLetter = healthScore !== null ? scoreToLetter(healthScore) : null;
                            const scoreColor = scoreLetter ? scoreToColor(healthScore) : '#9ca3af';
                            const displayColor = shouldShowNA ? '#9ca3af' : displayScore !== null ? scoreToColor(displayScore) : scoreColor;
                            const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
                            return <>
                                                <div className={styles.scoreCardWrapper} onMouseLeave={() => {
                                if (hoveredTooltip?.type === 'score' && hoveredTooltip.firewallName === firewall.nom) {
                                  setHoveredTooltip(null);
                                }
                              }}>
                                                <div className={`${styles.scoreCardLeft} ${isLoading ? styles.statCardDisabled : ''}`}>
                                                    {isLoading && <div className={styles.loadingCenter}>
                                                            <FaSync className={styles.loadingSyncIcon} />
                                                            Synchronization...
                                                        </div>}
                                                    {!isLoading && <div className={styles.scoreInfoIcon}>
                                                            <div className={styles.scoreTooltipContainer}>
                                                                <IconifyIcon icon="material-symbols:info" width={16} height={16} className={styles.scoreTooltipIcon} onMouseEnter={e => {
                                        setHoveredTooltip({
                                          type: 'score',
                                          firewallName: firewall.nom,
                                          mouseX: e.clientX,
                                          mouseY: e.clientY,
                                          scoreBreakdown
                                        });
                                      }} onMouseMove={e => {
                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.firewallName === firewall.nom) {
                                          setHoveredTooltip(prev => ({
                                            ...prev,
                                            mouseX: e.clientX,
                                            mouseY: e.clientY
                                          }));
                                        }
                                      }} onMouseLeave={() => {
                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.firewallName === firewall.nom) {
                                          setHoveredTooltip(null);
                                        }
                                      }} />
                                                            </div>
                                                        </div>}
                                                    {!isLoading && <div className={styles.scoreDisplayWrapper}>
                                                            <div className={styles.scoreInputWrapper}>
                                                                {isEditing ? <input type="number" min="0" max="100" value={editingScoreValue[firewall.nom] !== undefined ? editingScoreValue[firewall.nom] : displayScore} onChange={e => setEditingScoreValue(prev => ({
                                        ...prev,
                                        [firewall.nom]: e.target.value
                                      }))} onBlur={() => saveEditScore(firewall.nom)} onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          saveEditScore(firewall.nom);
                                        } else if (e.key === 'Escape') {
                                          cancelEditScore(firewall.nom);
                                        }
                                      }} autoFocus className={styles.scoreInput} style={{
                                        color: displayColor,
                                        borderColor: displayColor
                                      }} /> : <div role="button" tabIndex={displayScore !== null ? 0 : -1} onKeyDown={e => {
                                        if (displayScore !== null && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
                                          e.preventDefault();
                                          startEditScore(firewall.nom, displayScore);
                                        }
                                      }} title={displayScore !== null ? "Click to select a grade, double-click to edit precisely" : ""} className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}>
                                                                        <LetterScale activeLetter={displayLetter} letters={["F", "E", "D", "C", "B", "A"]} size="normal" onSelect={!isLoading ? letter => handleManualLetterSelect(firewall.nom, letter) : undefined} highlightLetter={!shouldShowNA && manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null} />
                                                                    </div>}
                                                            </div>
                                                            {calculatedScore !== null && manualScore !== undefined && isEditing && <div className={styles.scoreNoteHint}>
                                                                    Calculated grade: {calculatedScore} ({scoreToLetter(calculatedScore)})
                                                                </div>}
                                                        </div>}
                                                </div>

                                                {}
                                                <div className={styles.statsGrid}>
                                            {}
                                            <div className={`${styles.statCard} ${loadingCheckMK[firewall.nom] ? styles.statCardDisabled : checkmkData[firewall.nom] ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                    if (mapping && checkmkData[firewall.nom]) {
                                      setHoveredTooltip({
                                        type: 'services',
                                        firewallName: firewall.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseMove={e => {
                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                    if (mapping && checkmkData[firewall.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.firewallName === firewall.nom) {
                                      setHoveredTooltip({
                                        type: 'services',
                                        firewallName: firewall.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseLeave={() => {
                                    if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.firewallName === firewall.nom) {
                                      setHoveredTooltip(null);
                                    }
                                  }}>
                                                <IconifyIcon icon="material-symbols-light:view-module" width={22} height={22} className={styles.statIcon} />
                                                {!(firewall.id && getCheckMKMapping(firewall.id)) ? <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Not mapped
                                                        </div>
                                                    </div> : loadingCheckMK[firewall.nom] ? <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Loading...
                                                    </div> : <div className={`${styles.statValue} ${checkmkData[firewall.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                        {checkmkData[firewall.nom] ? animatedServices[firewall.nom] !== undefined ? animatedServices[firewall.nom] : checkmkData[firewall.nom]?.services?.length || 0 : 'N/A'}
                                                    </div>}
                                            </div>
                                            
                                            {}
                                            {(() => {
                                    const arr = Array.isArray(eventsData[firewall.nom]) ? eventsData[firewall.nom] : [];
                                    const criticalCount = arr.filter(e => (e.state ?? e.state_type ?? 0) === 2).length;
                                    const hasEventsData = arr.length > 0;
                                    const displayCount = hasEventsData ? criticalCount : eventsCount[firewall.nom] !== undefined ? 0 : undefined;
                                    const showWarning = displayCount !== undefined && displayCount > 0;
                                    return <div className={`${styles.statCard} ${loadingCheckMK[firewall.nom] ? styles.statCardDisabled : displayCount !== undefined ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                                      const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                      if (mapping && hasEventsData) {
                                        setHoveredTooltip({
                                          type: 'events',
                                          firewallName: firewall.nom,
                                          mouseX: e.clientX,
                                          mouseY: e.clientY
                                        });
                                      }
                                    }} onMouseMove={e => {
                                      const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                      if (mapping && hasEventsData && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.firewallName === firewall.nom) {
                                        setHoveredTooltip({
                                          type: 'events',
                                          firewallName: firewall.nom,
                                          mouseX: e.clientX,
                                          mouseY: e.clientY
                                        });
                                      }
                                    }} onMouseLeave={() => {
                                      if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.firewallName === firewall.nom) {
                                        setHoveredTooltip(null);
                                      }
                                    }}>
                                                <IconifyIcon icon="mingcute:alert-fill" width={22} height={22} className={styles.statIcon} />
                                                {!(firewall.id && getCheckMKMapping(firewall.id)) ? <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Not mapped
                                                        </div>
                                                    </div> : loadingCheckMK[firewall.nom] ? <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Loading...
                                                    </div> : <div className={`${styles.statValue} ${displayCount !== undefined ? showWarning ? styles.statValueEventsWarning : styles.statValueEventsNormal : styles.statValueSecondary}`}>
                                                        {displayCount !== undefined ? hasEventsData ? displayCount : animatedEvents[firewall.nom] ?? displayCount : animatedEvents[firewall.nom] ?? 'N/A'}
                                                    </div>}
                                            </div>;
                                  })()}
                                            
                                            {}
                                            <div className={`${styles.statCard} ${loadingCheckMK[firewall.nom] ? styles.statCardDisabled : availabilityData[firewall.nom] ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                    if (mapping && availabilityData[firewall.nom]) {
                                      setHoveredTooltip({
                                        type: 'availability',
                                        firewallName: firewall.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseMove={e => {
                                    const mapping = firewall.id ? getCheckMKMapping(firewall.id) : null;
                                    if (mapping && availabilityData[firewall.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.firewallName === firewall.nom) {
                                      setHoveredTooltip({
                                        type: 'availability',
                                        firewallName: firewall.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseLeave={() => {
                                    if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.firewallName === firewall.nom) {
                                      setHoveredTooltip(null);
                                    }
                                  }}>
                                            <IconifyIcon icon="tabler:gauge" width={22} height={22} className={styles.statIcon} />
                                            {!(firewall.id && getCheckMKMapping(firewall.id)) ? <div className={styles.statCardNotMapped}>
                                                    <div className={styles.statValueNotMapped}>
                                                        N/A
                                                    </div>
                                                    <div className={styles.statLabelNotMapped}>
                                                        Not mapped
                                                    </div>
                                                </div> : loadingCheckMK[firewall.nom] ? <div className={styles.loadingRow}>
                                                    <FaSync className={styles.loadingIconSmall} />
                                                    Loading...
                                                </div> : <div className={styles.statValueAvailability} style={{
                                      color: availabilityData[firewall.nom] && availabilityData[firewall.nom].up !== undefined ? (() => {
                                        const displayValue = animatedAvailability[firewall.nom] !== undefined ? animatedAvailability[firewall.nom] : parseFloat(availabilityData[firewall.nom].up || 0);
                                        return getProgressiveColor(displayValue);
                                      })() : 'var(--text-secondary)'
                                    }}>
                                                    {availabilityData[firewall.nom] && availabilityData[firewall.nom].up !== undefined ? `${animatedAvailability[firewall.nom] !== undefined ? animatedAvailability[firewall.nom] : Math.round(parseFloat(availabilityData[firewall.nom].up || 0))}%` : 'N/A'}
                                                </div>}
                                            </div>
                                        </div>
                                                </div>
                                                </>;
                          })()}
                                        </>}
                                    </div>}

                                    {}
                                    {syncMode[firewall.nom] === 'checkmk' && <div className={styles.metricsTable}>
                                        {hasInvalidLines(firewall.nom) && <div className={styles.metricsTableWarningIcon}>
                                                <IconifyIcon icon="material-symbols:warning" width={20} height={20} />
                                            </div>}
                                        <div className={styles.metricsGrid}>
                                            {defaultServices.map((service, index) => {
                            const firewallData = data?.[firewall.nom]?.[service] || {};
                            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
                            const ok = firewallData.ok !== undefined ? parse(firewallData.ok, 100) : 100;
                            const warn = firewallData.warn !== undefined ? parse(firewallData.warn, 0) : 0;
                            const crit = firewallData.crit !== undefined ? parse(firewallData.crit, 0) : 0;
                            const getServiceIcon = serviceName => {
                              switch (serviceName) {
                                case 'CPU':
                                  return 'lucide:cpu';
                                case 'MEMOIRE':
                                  return 'fa-solid:memory';
                                case 'TRAFIC':
                                  return 'ph:network-bold';
                                case 'UPTIME':
                                  return 'mdi:tool-time';
                                default:
                                  return null;
                              }
                            };
                            const serviceIcon = getServiceIcon(service);
                            const isFirstRow = index < 2;
                            const isOkFocused = focusedInput?.service === service && focusedInput?.type === 'ok';
                            const isWarnFocused = focusedInput?.service === service && focusedInput?.type === 'warn';
                            const isCritFocused = focusedInput?.service === service && focusedInput?.type === 'crit';
                            return <div key={service} className={styles.metricServiceCard}>
                                                            <div className={styles.metricInputsRow}>
                                                                {serviceIcon && <IconifyIcon icon={serviceIcon} width={26} height={26} className={styles.metricServiceIcon} />}
                                                                <input type="number" min="0" max="100" value={ok} onChange={e => updateValue(firewall.nom, service, "ok", e.target.value)} className={`${styles.metricInput} ${ok !== 0 ? styles.okInput : ''} ${isOkFocused ? styles.metricInputFocusedOk : ''}`} aria-label={`OK pour ${service}`} onFocus={e => handleInputFocus(e, service, 'ok')} onBlur={handleInputBlur} />
                                                                <input type="number" min="0" max="100" value={warn} onChange={e => updateValue(firewall.nom, service, "warn", e.target.value)} className={`${styles.metricInput} ${warn !== 0 ? styles.warnInput : ''} ${isWarnFocused ? styles.metricInputFocusedWarn : ''}`} aria-label={`WARN pour ${service}`} onFocus={e => handleInputFocus(e, service, 'warn')} onBlur={handleInputBlur} />
                                                                <input type="number" min="0" max="100" value={crit} onChange={e => updateValue(firewall.nom, service, "crit", e.target.value)} className={`${styles.metricInput} ${crit !== 0 ? styles.critInput : ''} ${isCritFocused ? styles.metricInputFocusedCrit : ''}`} aria-label={`CRIT pour ${service}`} onFocus={e => handleInputFocus(e, service, 'crit')} onBlur={handleInputBlur} />
                                                            </div>
                                                        </div>;
                          })}
                                        </div>
                                    </div>}
                                    </div>
                                </div>
                                </div>

                                {}
                                <div className={styles.firewallCardFooter}>
                                    <div style={{
                    padding: '0.375rem 0.5rem',
                    background: 'transparent',
                    borderRadius: '4px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '0rem'
                  }}>
                                        {}
                                        <div className={styles.viewTabsContainer}>
                                            {hasProblems(firewall.nom) && <FaExclamationCircle style={{
                        fontSize: '0.7rem',
                        color: '#f59e0b',
                        flexShrink: 0,
                        marginRight: '0.25rem',
                        marginLeft: '0.25rem'
                      }} />}
                                            <button onClick={() => {
                        if (!loadingCheckMK[firewall.nom]) {
                          const newMode = 'stats';
                          setSyncMode(prev => ({
                            ...prev,
                            [firewall.nom]: newMode
                          }));
                          const currentData = dataRef.current || {};
                          const updated = {
                            ...currentData,
                            [firewall.nom]: {
                              ...(currentData[firewall.nom] || {}),
                              syncMode: newMode
                            }
                          };
                          setData(updated);
                          dataRef.current = updated;
                        }
                      }} disabled={loadingCheckMK[firewall.nom]} className={`${styles.viewTabButton} ${syncMode[firewall.nom] === 'stats' || !syncMode[firewall.nom] ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}>
                                                <IconifyIcon icon="material-symbols:dashboard-rounded" width={16} height={16} />
                                            </button>
                                            <button onClick={() => {
                        if (!loadingCheckMK[firewall.nom]) {
                          const newMode = 'checkmk';
                          setSyncMode(prev => ({
                            ...prev,
                            [firewall.nom]: newMode
                          }));
                          const currentData = dataRef.current || {};
                          const updated = {
                            ...currentData,
                            [firewall.nom]: {
                              ...(currentData[firewall.nom] || {}),
                              syncMode: newMode
                            }
                          };
                          setData(updated);
                          dataRef.current = updated;
                        }
                      }} disabled={loadingCheckMK[firewall.nom]} className={`${styles.viewTabButton} ${syncMode[firewall.nom] === 'checkmk' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}>
                                                <IconifyIcon icon="material-symbols:query-stats-rounded" width={16} height={16} />
                                            </button>
                                            <button onClick={() => {
                        if (!loadingCheckMK[firewall.nom]) {
                          const newMode = 'modules';
                          setSyncMode(prev => ({
                            ...prev,
                            [firewall.nom]: newMode
                          }));
                          const currentData = dataRef.current || {};
                          const updated = {
                            ...currentData,
                            [firewall.nom]: {
                              ...(currentData[firewall.nom] || {}),
                              syncMode: newMode
                            }
                          };
                          setData(updated);
                          dataRef.current = updated;
                        }
                      }} disabled={loadingCheckMK[firewall.nom]} className={`${styles.viewTabButton} ${syncMode[firewall.nom] === 'modules' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}>
                                                <IconifyIcon icon="streamline-block:programming-modules" width={16} height={16} />
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {}
                                <textarea id={`comment-${firewall.nom}`} className={styles.commentTextarea} value={data?.[firewall.nom]?.comment || ""} onChange={e => updateComment(firewall.nom, e.target.value)} onFocus={e => e.target.select()} placeholder="Comment..." rows="2" />
                            </div>
                            </React.Fragment>;
          })}
                        </div>
                    </div>;
    })}
            
            {}
            {hoveredTooltip && <div style={{
      position: 'fixed',
      left: `${hoveredTooltip.mouseX + 10}px`,
      top: `${hoveredTooltip.mouseY + 10}px`,
      background: hoveredTooltip.type === 'score' ? '#ffffff' : 'var(--bg-primary)',
      border: hoveredTooltip.type === 'score' ? '1px solid rgba(0,0,0,0.08)' : '1px solid var(--border-color)',
      borderRadius: '6px',
      padding: hoveredTooltip.type === 'score' ? '1rem' : '0.75rem',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      zIndex: 999999,
      maxWidth: hoveredTooltip.type === 'services' ? '500px' : hoveredTooltip.type === 'events' ? '600px' : hoveredTooltip.type === 'availability' ? '400px' : hoveredTooltip.type === 'score' ? '700px' : '400px',
      pointerEvents: 'none',
      color: hoveredTooltip.type === 'score' ? '#111827' : 'var(--text-primary)'
    }}>
                    {hoveredTooltip.type === 'score' && <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
                            <div style={{
          fontSize: '0.9rem',
          fontWeight: '700',
          color: '#111827'
        }}>
                                How the grade is calculated
                            </div>
                            <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem 1rem',
          fontSize: '0.82rem',
          color: '#374151'
        }}>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
                                    <span>Services (OK/WARN/CRIT)</span>
                                    <span style={{
              fontWeight: 700
            }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('services'))?.weight || '–'}</span>
                                </div>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
                                    <span>Events (CheckMK)</span>
                                    <span style={{
              fontWeight: 700
            }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('Events'))?.weight || '–'}</span>
                                </div>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
                                    <span>Availability (CheckMK)</span>
                                    <span style={{
              fontWeight: 700
            }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('Availability'))?.weight || '–'}</span>
                                </div>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
                                    <span>Enabled modules</span>
                                    <span style={{
              fontWeight: 700
            }}>{hoveredTooltip.scoreBreakdown?.find(b => b.label.includes('Modules'))?.weight || '–'}</span>
                                </div>
                            </div>
                            <div style={{
          fontSize: '0.76rem',
          color: '#6b7280',
          marginTop: '0.15rem'
        }}>
                                Caps and penalties apply in case of CRIT, events or low availability.
                            </div>
                        </div>}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.firewallName] && <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        fontSize: '0.8rem'
      }}>
                            <div style={{
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
                                Availability
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.25rem'
        }}>
                                UP / DOWN / UNREACH time over the period.
                            </div>
                            {['up', 'down', 'unreach'].map(key => {
          const value = availabilityData[hoveredTooltip.firewallName][key];
          if (value === undefined) return null;
          const labelMap = {
            up: 'UP',
            down: 'DOWN',
            unreach: 'UNREACH'
          };
          const colorMap = {
            up: '#10b981',
            down: '#ef4444',
            unreach: '#dc2626'
          };
          return <div key={key} style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
                                        <span style={{
              color: 'var(--text-secondary)'
            }}>{labelMap[key]}:</span>
                                        <span style={{
              fontWeight: 600,
              color: colorMap[key] || 'var(--text-primary)'
            }}>
                                            {Math.round(parseFloat(value || 0))} %
                                        </span>
                                    </div>;
        })}
                        </div>}
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.firewallName] && <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
                            <div style={{
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
                                Critical events
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.25rem'
        }}>
                                CRITICAL Check MK alerts over the report period.
                            </div>
                            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          maxHeight: '220px',
          overflowY: 'auto',
          width: '100%'
        }}>
                                {(() => {
            const allEvents = Array.isArray(eventsData[hoveredTooltip.firewallName]) ? eventsData[hoveredTooltip.firewallName] : [];
            const events = allEvents.filter(e => {
              const state = e.state ?? e.state_type ?? 0;
              return state === 2;
            });
            if (events.length === 0) {
              return <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                                                No critical event
                                            </div>;
            }
            const stateLabels = {
              0: 'OK',
              1: 'WARNING',
              2: 'CRITICAL',
              3: 'UNKNOWN'
            };
            const stateColors = {
              0: '#10b981',
              1: '#f59e0b',
              2: '#ef4444',
              3: '#6b7280'
            };
            return events.slice(0, 50).map((event, idx) => {
              const raw = event.raw;
              const service = event.service ?? event.service_description ?? event.log_service_description ?? event.service_name ?? event.log_service ?? (Array.isArray(raw) ? raw[4] : null) ?? '';
              const message = event.message ?? event.plugin_output ?? event.log_plugin_output ?? event.event_text ?? event.long_plugin_output ?? event.description ?? (Array.isArray(raw) ? raw[6] : null) ?? '-';
              const time = event.time ?? event.timestamp ?? event.last_state_change ?? event.datetime ?? event.log_time;
              const timeStr = time != null && time !== '' ? (typeof time === 'number' ? new Date(time * (time < 1e12 ? 1000 : 1)) : new Date(time)).toLocaleString('en-US', {
                dateStyle: 'short',
                timeStyle: 'short'
              }) : '';
              const stateNum = event.state ?? event.state_type ?? 0;
              const stateLabel = event.state_info ?? stateLabels[stateNum] ?? String(stateNum);
              const stateColor = stateColors[stateNum] ?? '#6b7280';
              return <div key={event.id ?? event.event_id ?? idx} style={{
                fontSize: '0.72rem',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                borderLeft: `3px solid ${stateColor}`
              }}>
                                                {service && <div style={{
                  fontWeight: 600,
                  marginBottom: '0.2rem',
                  color: 'var(--text-primary)'
                }}>
                                                        {String(service).trim()}
                                                    </div>}
                                                {message && message !== '-' && <div style={{
                  wordBreak: 'break-word',
                  marginBottom: '0.2rem'
                }}>
                                                        {String(message).trim()}
                                                    </div>}
                                                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'center',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)'
                }}>
                                                    <span style={{
                    fontWeight: 600,
                    color: stateColor
                  }}>
                                                        {typeof stateLabel === 'string' ? stateLabel : stateLabels[stateNum] ?? stateNum}
                                                    </span>
                                                    {timeStr && <span>{timeStr}</span>}
                                                </div>
                                            </div>;
            });
          })()}
                            </div>
                            {(() => {
          const allEvents = Array.isArray(eventsData[hoveredTooltip.firewallName]) ? eventsData[hoveredTooltip.firewallName] : [];
          const criticalOnly = allEvents.filter(e => (e.state ?? e.state_type ?? 0) === 2);
          return criticalOnly.length > 50 ? <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic'
          }}>
                                        … and {criticalOnly.length - 50} other critical event(s)
                                    </div> : null;
        })()}
                        </div>}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.firewallName] && <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
                            <div style={{
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
                                Monitored services
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.25rem'
        }}>
                                Services monitored by Check MK for this equipment.
                            </div>
                            <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.3rem',
          maxHeight: '220px',
          overflowY: 'auto',
          width: '100%'
        }}>
                                {(() => {
            const services = checkmkData[hoveredTooltip.firewallName].serviceInfo?.services || checkmkData[hoveredTooltip.firewallName].services || [];
            if (services.length === 0) {
              return <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                width: '100%'
              }}>
                                                No service
                                            </div>;
            }
            const checkmkHostName = checkmkData[hoveredTooltip.firewallName]?.checkmk_host_name;
            return services.map((service, idx) => {
              let serviceName = service.title || service.id || service.name || 'Service';
              if (checkmkHostName && serviceName.includes(checkmkHostName)) {
                serviceName = serviceName.replace(new RegExp(checkmkHostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
              }
              serviceName = serviceName.replace(/\s*on\s+host\s*[^\s]*/gi, '').replace(/\s+on\s+/gi, ' ').replace(/^on\s+/gi, '').replace(/\s+on$/gi, '').trim();
              return <div key={service.id || service.title || idx} style={{
                fontSize: '0.72rem',
                color: 'var(--text-primary)',
                padding: '0.2rem 0.4rem',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                                                {serviceName}
                                            </div>;
            });
          })()}
                            </div>
                        </div>}
                </div>}

            {}
            {editingFirewall && editForm && <div className={styles.editModalOverlay}>
                <div className={`${styles.editModalContent} ${styles.editModalContentLarge}`} onClick={e => e.stopPropagation()}>
                    <div className={styles.editModalHeader}>
                        <h3 className={styles.editModalTitle}>
                            <IconifyIcon icon="material-symbols:edit" width={18} height={18} style={{
              color: '#6b7280'
            }} />
                            Edit firewall
                        </h3>
                        <button type="button" className={styles.editModalCloseButton} onClick={() => {
            setEditingFirewall(null);
            setEditForm(null);
          }} title="Close" disabled={isSaving}>
                            <IconifyIcon icon="material-symbols:cancel-rounded" width={20} height={20} />
                        </button>
                    </div>

                    <div className={styles.editModalBody}>
                        {isSaving ? <div className={styles.editModalLoading}>
                                <IconifyIcon icon="svg-spinners:3-dots-fade" width={48} height={48} style={{
              color: '#6b7280'
            }} />
                            </div> : <div className={styles.editModalForm}>
                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Firewall name *
                                        <input type="text" className={styles.editModalInput} value={editForm.nom} onChange={e => setEditForm(prev => ({
                  ...prev,
                  nom: e.target.value
                }))} placeholder="Ex: FortiGate-60F" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        IP address WAN
                                        <input type="text" className={styles.editModalInput} value={editForm.ip} onChange={e => setEditForm(prev => ({
                  ...prev,
                  ip: e.target.value
                }))} placeholder="Ex: 192.168.1.1" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Firmware version
                                        <input type="text" className={styles.editModalInput} value={editForm.firmware} onChange={e => setEditForm(prev => ({
                  ...prev,
                  firmware: e.target.value
                }))} placeholder="Ex: 7.0.5" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Manufacturer
                                        <input type="text" className={styles.editModalInput} value={editForm.fabricant} onChange={e => setEditForm(prev => ({
                  ...prev,
                  fabricant: e.target.value
                }))} placeholder="Ex: Fortinet, Cisco, Palo Alto" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Site
                                        <select className={styles.editModalSelect} value={editForm.site || ""} onChange={e => setEditForm(prev => ({
                  ...prev,
                  site: e.target.value
                }))}>
                                            <option value="">No site</option>
                                            {(() => {
                    const allSites = new Set();
                    if (config?.client?.equipements) {
                      Object.values(config.client.equipements).forEach(equipmentList => {
                        if (Array.isArray(equipmentList)) {
                          equipmentList.forEach(equipment => {
                            if (equipment.site && equipment.site !== "No site") {
                              allSites.add(equipment.site);
                            }
                          });
                        }
                      });
                    }
                    return Array.from(allSites).sort().map(site => <option key={site} value={site}>
                                                        {site}
                                                    </option>);
                  })()}
                                        </select>
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        VLAN
                                        <input type="text" className={styles.editModalInput} value={editForm.vlan} onChange={e => setEditForm(prev => ({
                  ...prev,
                  vlan: e.target.value
                }))} placeholder="Ex: 10, 20, 30" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Model
                                        <input type="text" className={styles.editModalInput} value={editForm.modele} onChange={e => setEditForm(prev => ({
                  ...prev,
                  modele: e.target.value
                }))} placeholder="Ex: 60F, ASA 5506-X" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Serial number
                                        <input type="text" className={styles.editModalInput} value={editForm.numeroSerie} onChange={e => setEditForm(prev => ({
                  ...prev,
                  numeroSerie: e.target.value
                }))} placeholder="Ex: FG123456789" />
                                    </label>
                                </div>

                                {}
                                <label className={styles.editModalLabel}>
                                    Expiration garantie
                                    <input type="date" className={styles.editModalInput} value={editForm.expirationGarantie} onChange={e => setEditForm(prev => ({
                ...prev,
                expirationGarantie: e.target.value
              }))} />
                                </label>

                                {}
                                <div className={styles.licensesSection}>
                                    <label className={styles.licensesLabel}>
                                        Licenses
                                    </label>
                                    {editForm.licences && editForm.licences.length > 0 ? <div className={styles.licensesList}>
                                            {editForm.licences.map((licence, licenceIndex) => <div key={licenceIndex} className={styles.licenseRow}>
                                                    <label className={styles.licenseLabelSmall}>
                                                        Name/Label
                                                        <input type="text" className={styles.licenseInputSmall} value={licence.nom || ""} onChange={e => {
                      const updatedLicenses = [...editForm.licences];
                      updatedLicenses[licenceIndex] = {
                        ...updatedLicenses[licenceIndex],
                        nom: e.target.value
                      };
                      setEditForm(prev => ({
                        ...prev,
                        licences: updatedLicenses
                      }));
                    }} placeholder="Ex: FortiCare, Security Bundle" />
                                                    </label>
                                                    <label className={styles.licenseLabelSmall}>
                                                        Expiration
                                                        <input type="date" className={styles.licenseInputSmall} value={licence.expiration || ""} onChange={e => {
                      const updatedLicenses = [...editForm.licences];
                      updatedLicenses[licenceIndex] = {
                        ...updatedLicenses[licenceIndex],
                        expiration: e.target.value
                      };
                      setEditForm(prev => ({
                        ...prev,
                        licences: updatedLicenses
                      }));
                    }} />
                                                    </label>
                                                    <button type="button" className={styles.licenseDeleteButton} onClick={() => {
                    const updatedLicenses = editForm.licences.filter((_, idx) => idx !== licenceIndex);
                    setEditForm(prev => ({
                      ...prev,
                      licences: updatedLicenses
                    }));
                  }} title="Delete this license">
                                                        ×
                                                    </button>
                                                </div>)}
                                        </div> : <p className={styles.licenseEmptyText}>
                                            No license configured
                                        </p>}
                                    <button type="button" className={styles.licenseAddButton} onClick={() => {
                setEditForm(prev => ({
                  ...prev,
                  licences: [...(prev.licences || []), {
                    nom: "",
                    expiration: "",
                    type: ""
                  }]
                }));
              }}>
                                        + Add une licence
                                    </button>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel} style={{
                flex: '1 1 100%'
              }}>
                                        Mapping CheckMK
                                        <button type="button" onClick={() => {
                  setCheckmkMappingModal({
                    isOpen: true,
                    firewallId: editingFirewall.id
                  });
                }} style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: '6px',
                  background: editingFirewall.id && getCheckMKMapping(editingFirewall.id) ? '#10b981' : '#ffffff',
                  color: editingFirewall.id && getCheckMKMapping(editingFirewall.id) ? 'white' : '#4b5563',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  const mapping = editingFirewall.id ? getCheckMKMapping(editingFirewall.id) : null;
                  if (!mapping) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }} onMouseLeave={e => {
                  const mapping = editingFirewall.id ? getCheckMKMapping(editingFirewall.id) : null;
                  if (!mapping) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--border-secondary)';
                  }
                }}>
                                            <FaLink size={14} />
                                            {(() => {
                    const mapping = editingFirewall.id ? getCheckMKMapping(editingFirewall.id) : null;
                    return mapping ? `Mapped: ${mapping.checkmk_host_name}` : 'Map with CheckMK';
                  })()}
                                        </button>
                                    </label>
                                </div>
                            </div>}
                    </div>

                    {!isSaving && <div className={styles.editModalFooter}>
                            <button type="button" className={styles.editModalSaveButton} onClick={handleSaveFirewall} disabled={isSaving}>
                                <IconifyIcon icon="material-symbols:save" width={16} height={16} />
                                Save
                            </button>
                        </div>}
                </div>
            </div>}

            {}
            {checkmkMappingModal.isOpen && checkmkMappingModal.firewallId !== null && editingFirewall && <CheckMKMappingModal isOpen={checkmkMappingModal.isOpen} onClose={() => setCheckmkMappingModal({
      isOpen: false,
      firewallId: null
    })} equipmentName={editingFirewall.nom} equipmentType="Firewalls" equipmentId={editingFirewall.id} equipmentIndex={editingFirewall.id} clientId={config?.client?.id} requireService={false} onMappingSaved={mapping => {
      if (mapping) {
        setCheckmkMappings(prev => ({
          ...prev,
          [editingFirewall.nom]: mapping
        }));
        toast.success("Mapping updated", toastOptions);
      } else {
        setCheckmkMappings(prev => {
          const newMappings = {
            ...prev
          };
          delete newMappings[editingFirewall.nom];
          return newMappings;
        });
        toast.success("Mapping deleted", toastOptions);
      }
    }} />}

            {}
            {showExportModal && <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
                    <div style={{
        background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        color: theme === 'dark' ? '#f3f4f6' : '#111827'
      }}>
                        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          fontWeight: '700',
          color: theme === 'dark' ? '#f3f4f6' : '#111827'
        }}>
                            📤 Instructions d'export Stormshield
                        </h3>
                        
                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          fontSize: '0.95rem',
          lineHeight: '1.6'
        }}>
                            {}
                            <div>
                                <div style={{
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#10b981',
              fontSize: '1rem'
            }}>
                                    📋 Object list
                                </div>
                                <div style={{
              paddingLeft: '1rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151'
            }}>
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Configuration</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Objects</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Network</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#10b981' : '#059669',
                fontWeight: '600'
              }}>Export</span>
                                </div>
                            </div>

                            {}
                            <div>
                                <div style={{
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#10b981',
              fontSize: '1rem'
            }}>
                                    🔒 Filtering et NAT
                                </div>
                                <div style={{
              paddingLeft: '1rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151'
            }}>
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Configuration</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Security Policy</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Filter - NAT</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#10b981' : '#059669',
                fontWeight: '600'
              }}>Export</span>
                                </div>
                            </div>

                            {}
                            <div>
                                <div style={{
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#10b981',
              fontSize: '1rem'
            }}>
                                    🌐 Traffic
                                </div>
                                <div style={{
              paddingLeft: '1rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151'
            }}>
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Monitoring</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Audit Logs</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Network Traffic</span>
                                    {' > '}
                                    Choose a date within the report period
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#10b981' : '#059669',
                fontWeight: '600'
              }}>Export</span>
                                </div>
                            </div>

                            {}
                            <div>
                                <div style={{
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#10b981',
              fontSize: '1rem'
            }}>
                                    ⚠️ Alarms
                                </div>
                                <div style={{
              paddingLeft: '1rem',
              color: theme === 'dark' ? '#d1d5db' : '#374151'
            }}>
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Monitoring</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Reports</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Security</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#6ee7b7' : '#047857',
                fontWeight: '500'
              }}>Alarms</span>
                                    {' > '}
                                    <span style={{
                color: theme === 'dark' ? '#10b981' : '#059669',
                fontWeight: '600'
              }}>Export</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setShowExportModal(false)} style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '0.75rem',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} onMouseEnter={e => {
          e.currentTarget.style.background = '#059669';
        }} onMouseLeave={e => {
          e.currentTarget.style.background = '#10b981';
        }}>
                            J'ai compris
                        </button>
                    </div>
                </div>}
        </div>;
};
export default Firewalls;
