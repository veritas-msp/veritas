import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaWindows, FaLinux, FaSync, FaExclamationCircle, FaServer, FaCube, FaLink } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Serveurs.module.css";
import commonStyles from "./ModuleCommon.module.css";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import CheckMKMappingModal from "../../AdminPage/MonitoringClientSkeleton/ClientSteps/CheckMKMappingModal";
import { SERVER_ROLE_OPTIONS } from "../../EquipementPage/constants/serverRoleOptions";
const toastOptions = {
  position: "bottom-right",
  autoClose: 3000
};
const defaultServices = ["CPU", "RAM", "C:/", "UPTIME"];
const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const toggleDropdown = () => setIsOpen(!isOpen);
  const handleOptionClick = option => {
    const newSelected = selectedValues.includes(option) ? selectedValues.filter(val => val !== option) : [...selectedValues, option];
    onChange(newSelected);
  };
  const removeTag = tagToRemove => {
    const newSelected = selectedValues.filter(tag => tag !== tagToRemove);
    onChange(newSelected);
  };
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const filteredOptions = options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
  return <div ref={dropdownRef} style={{
    position: 'relative',
    width: '100%'
  }}>
      {}
      <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.35rem',
      minHeight: '2.5rem',
      padding: '0.5rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      background: '#ffffff',
      cursor: 'text',
      alignItems: 'center'
    }} onClick={e => {
      if (e.target === e.currentTarget || e.target.tagName === 'INPUT' && e.target.type === 'text') {
        const input = e.currentTarget.querySelector('input[type="text"]');
        if (input) {
          input.focus();
          setIsOpen(true);
        }
      }
    }}>
        {selectedValues.map((tag, index) => <span key={index} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        padding: '0.25rem 0.5rem',
        background: '#3b82f6',
        color: 'white',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        cursor: 'default'
      }} onClick={e => e.stopPropagation()}>
            {tag}
            <button type="button" style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '0.75rem',
          lineHeight: '1',
          padding: '0.1rem 0.2rem',
          marginLeft: '0.2rem',
          borderRadius: '3px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '14px',
          minHeight: '14px'
        }} onClick={e => {
          e.stopPropagation();
          removeTag(tag);
        }} onMouseEnter={e => {
          e.target.style.background = 'rgba(255, 255, 255, 0.3)';
        }} onMouseLeave={e => {
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
        }}>
              ×
            </button>
          </span>)}
        
        {}
        <input type="text" style={{
        flex: 1,
        minWidth: '120px',
        padding: '0.25rem 0.5rem',
        border: 'none',
        background: 'transparent',
        color: '#1a1a1a',
        fontSize: '0.9rem',
        outline: 'none',
        cursor: 'text'
      }} placeholder={selectedValues.length === 0 ? placeholder : "Add a role..."} value={searchTerm} onChange={e => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
      }} onFocus={() => setIsOpen(true)} onClick={e => {
        e.stopPropagation();
        setIsOpen(true);
      }} />
      </div>
      
      {}
      {isOpen && <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 1000,
      background: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginTop: '0.25rem',
      maxHeight: '200px',
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
          {filteredOptions.map(option => {
        const isSelected = selectedValues.includes(option);
        return <div key={option} style={{
          width: '100%',
          minHeight: '36px',
          padding: '0.5rem 0.75rem',
          cursor: 'pointer',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isSelected ? '#3b82f6' : 'transparent',
          color: isSelected ? 'white' : '#1a1a1a',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }} onClick={() => handleOptionClick(option)} onMouseEnter={e => {
          if (!isSelected) {
            e.target.style.background = '#f9fafb';
          }
        }} onMouseLeave={e => {
          if (!isSelected) {
            e.target.style.background = 'transparent';
          }
        }}>
                <input type="checkbox" checked={isSelected} readOnly style={{
            margin: 0,
            accentColor: isSelected ? 'white' : '#3b82f6',
            cursor: 'pointer',
            flexShrink: 0,
            width: '16px',
            height: '16px'
          }} />
                <span style={{
            cursor: 'pointer',
            flex: 1,
            textAlign: 'left',
            fontSize: '0.9rem'
          }}>
                  {option}
                </span>
              </div>;
      })}
        </div>}
    </div>;
};
const Servers = ({
  config,
  setConfig,
  data,
  setData,
  onSyncAllCheckMKReady
}) => {
  const serveurs = config?.client?.equipements?.Serveurs || [];
  const roleOptions = SERVER_ROLE_OPTIONS;
  const [checkmkMappings, setCheckmkMappings] = useState({});
  const [checkmkData, setCheckmkData] = useState({});
  const [loadingCheckMK, setLoadingCheckMK] = useState({});
  const getCheckMKMapping = useCallback(serverNameOrId => {
    if (!serverNameOrId) return null;
    const idKey = String(serverNameOrId);
    if (checkmkMappings[idKey]) {
      return checkmkMappings[idKey];
    }
    const server = serveurs.find(srv => srv.nom === serverNameOrId);
    if (server?.id && checkmkMappings[String(server.id)]) {
      return checkmkMappings[String(server.id)];
    }
    return null;
  }, [checkmkMappings, serveurs]);
  const [openComments, setOpenComments] = useState({});
  const [syncMode, setSyncMode] = useState({});
  const [editingServer, setEditingServer] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [checkmkMappingModal, setCheckmkMappingModal] = useState({
    isOpen: false,
    serverId: null
  });
  const [eventsCount, setEventsCount] = useState({});
  const [totalEventsCount, setTotalEventsCount] = useState({});
  const [lastEventDate, setLastEventDate] = useState({});
  const [eventsData, setEventsData] = useState({});
  const [availabilityData, setAvailabilityData] = useState({});
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [hoveredLabelsTooltip, setHoveredLabelsTooltip] = useState(null);
  const [animatedScore, setAnimatedScore] = useState({});
  const [animatedAvailability, setAnimatedAvailability] = useState({});
  const [animatedServices, setAnimatedServices] = useState({});
  const [animatedEvents, setAnimatedEvents] = useState({});
  const [scoreAnimationComplete, setScoreAnimationComplete] = useState({});
  const [editingScore, setEditingScore] = useState({});
  const [editingScoreValue, setEditingScoreValue] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);
  const hasRestoredDataRef = useRef(false);
  const dataRef = useRef(data);
  const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
  useEffect(() => {
    if (!data) return;
    setOpenComments(prev => {
      const next = {
        ...prev
      };
      Object.keys(data).forEach(serverName => {
        const isOpen = data[serverName]?.isCommentOpen;
        if (typeof isOpen === 'boolean') {
          next[serverName] = isOpen;
        }
      });
      return next;
    });
  }, [data]);
  const syncAllCheckMKRef = useRef(null);
  const lastNotifiedSyncInfoRef = useRef({
    hasMappings: null,
    isLoading: null
  });
  const getRoleColor = role => {
    if (!role) return {
      bg: "#9ca3af",
      text: "#ffffff"
    };
    let roleString = role;
    if (Array.isArray(role)) {
      if (role.length === 0) return {
        bg: "#9ca3af",
        text: "#ffffff"
      };
      roleString = role[0];
    }
    if (typeof roleString !== 'string') {
      return {
        bg: "#9ca3af",
        text: "#ffffff"
      };
    }
    const roleColors = {
      "domain controller": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "domain controller": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "ad": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "dc": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "fichiers": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "files": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "nas": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "web": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "www": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "http": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "database": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "database": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "db": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "sql": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "messagerie": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "Mail": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "exchange": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "sauvegarde": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "backup": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "sauve": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "application": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "app": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "monitoring": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "monitor": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "sécurité": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "securite": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "firewall": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "antivirus": {
        bg: "#ef4444",
        text: "#ffffff"
      }
    };
    const roleLower = roleString.toLowerCase();
    if (roleColors[roleLower]) {
      return roleColors[roleLower];
    }
    for (const [key, color] of Object.entries(roleColors)) {
      if (roleLower.includes(key)) {
        return color;
      }
    }
    const hash = roleString.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors = [{
      bg: "#3b82f6",
      text: "#ffffff"
    }, {
      bg: "#10b981",
      text: "#ffffff"
    }, {
      bg: "#f59e0b",
      text: "#ffffff"
    }, {
      bg: "#8b5cf6",
      text: "#ffffff"
    }, {
      bg: "#ec4899",
      text: "#ffffff"
    }, {
      bg: "#06b6d4",
      text: "#ffffff"
    }, {
      bg: "#f97316",
      text: "#ffffff"
    }, {
      bg: "#84cc16",
      text: "#ffffff"
    }];
    return colors[Math.abs(hash) % colors.length];
  };
  const updateValue = (serverName, service, level, value) => {
    const updated = {
      ...data,
      [serverName]: {
        ...(data[serverName] || {}),
        [service]: {
          ...(data[serverName]?.[service] || {}),
          [level]: value
        }
      }
    };
    setData(updated);
  };
  const updateComment = (serverName, comment) => {
    const updated = {
      ...data,
      [serverName]: {
        ...(data[serverName] || {}),
        comment
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const toggleCommentVisibility = serverName => {
    setOpenComments(prev => ({
      ...prev,
      [serverName]: !prev[serverName]
    }));
    setData(prevData => {
      const currentData = prevData || {};
      const prevIsOpen = !!currentData[serverName]?.isCommentOpen;
      const nextIsOpen = !prevIsOpen;
      const updated = {
        ...currentData,
        [serverName]: {
          ...(currentData[serverName] || {}),
          isCommentOpen: nextIsOpen
        }
      };
      dataRef.current = updated;
      return updated;
    });
  };
  const applyManualScore = (serverName, scoreValue) => {
    const updated = {
      ...data,
      [serverName]: {
        ...(data[serverName] || {}),
        manualHealthScore: scoreValue
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const handleManualLetterSelect = (serverName, letter) => {
    const scoreValue = letterToScore(letter);
    if (scoreValue === null) return;
    applyManualScore(serverName, scoreValue);
  };
  const startEditScore = (serverName, currentScore) => {
    setEditingScore(prev => ({
      ...prev,
      [serverName]: true
    }));
    setEditingScoreValue(prev => ({
      ...prev,
      [serverName]: currentScore || ''
    }));
  };
  const saveEditScore = serverName => {
    const manualScore = editingScoreValue[serverName];
    if (manualScore !== undefined && manualScore !== null && manualScore !== '') {
      const scoreValue = Math.max(0, Math.min(100, parseInt(manualScore, 10) || 0));
      const updated = {
        ...data,
        [serverName]: {
          ...(data[serverName] || {}),
          manualHealthScore: scoreValue
        }
      };
      setData(updated);
      dataRef.current = updated;
    }
    setEditingScore(prev => ({
      ...prev,
      [serverName]: false
    }));
    setEditingScoreValue(prev => {
      const newValue = {
        ...prev
      };
      delete newValue[serverName];
      return newValue;
    });
  };
  const cancelEditScore = serverName => {
    setEditingScore(prev => ({
      ...prev,
      [serverName]: false
    }));
    setEditingScoreValue(prev => {
      const newValue = {
        ...prev
      };
      delete newValue[serverName];
      return newValue;
    });
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
  const getTotal = (serverName, service) => {
    const srvData = data?.[serverName]?.[service] || {};
    const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
    const ok = srvData.ok !== undefined ? parse(srvData.ok, 100) : 100;
    const warn = srvData.warn !== undefined ? parse(srvData.warn, 0) : 0;
    const crit = srvData.crit !== undefined ? parse(srvData.crit, 0) : 0;
    return ok + warn + crit;
  };
  const parsePercentageValue = value => {
    if (value === undefined || value === null || value === "") return null;
    const numericValue = typeof value === "string" ? value.replace(",", ".") : value;
    const parsed = parseFloat(numericValue);
    if (Number.isNaN(parsed)) return null;
    return Math.min(100, Math.max(0, parseFloat(parsed.toFixed(1))));
  };
  const hasInvalidLines = serverName => {
    return defaultServices.some(service => getTotal(serverName, service) !== 100);
  };
  const hasWarningOrCritical = serverName => {
    const srvData = data?.[serverName];
    if (!srvData) return false;
    return defaultServices.some(service => {
      const serviceData = srvData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      const warn = serviceData.warn !== undefined ? parse(serviceData.warn, 0) : 0;
      const crit = serviceData.crit !== undefined ? parse(serviceData.crit, 0) : 0;
      return warn > 0 || crit > 0;
    });
  };
  const getProgressiveColor = value => {
    if (value < 50) {
      return '#ef4444';
    } else if (value < 85) {
      return '#f59e0b';
    } else {
      return '#10b981';
    }
  };
  const getGlobalScore = serverName => {
    const sourceData = dataRef.current || data || {};
    const rawSrvData = sourceData?.[serverName];
    const server = serveurs.find(srv => srv.nom === serverName);
    const isMapped = Boolean(server?.id && checkmkMappings[server.id]);
    const hasSyncData = Boolean(rawSrvData?.lastSyncDate);
    if (isMapped && !hasSyncData) {
      return null;
    }
    const srvData = rawSrvData || {};
    let hasSlaData = false;
    let slaScore = 0;
    let totalCritRatio = 0;
    let serviceCount = 0;
    if (srvData) {
      let totalCrit = 0;
      let totalWarn = 0;
      let totalOk = 0;
      defaultServices.forEach(service => {
        const serviceData = srvData[service] || {};
        const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
        const ok = parse(serviceData.ok, 100);
        const warn = parse(serviceData.warn, 0);
        const crit = parse(serviceData.crit, 0);
        const serviceTotal = ok + warn + crit;
        if (serviceTotal > 0) {
          const critRatio = crit / serviceTotal;
          totalCritRatio += critRatio;
        }
        totalCrit += crit;
        totalWarn += warn;
        totalOk += ok;
        serviceCount++;
      });
      if (serviceCount > 0) {
        const avgOk = totalOk / serviceCount;
        const avgWarn = totalWarn / serviceCount;
        const avgCrit = totalCrit / serviceCount;
        totalCritRatio = totalCritRatio / serviceCount;
        let critScore = 0;
        if (avgCrit > 0.1) {
          critScore = 0;
        } else if (avgCrit > 0.05) {
          critScore = avgCrit * 15;
        } else {
          critScore = avgCrit * 30;
        }
        slaScore = avgOk * 1.0 + avgWarn * 0.5 + critScore;
        hasSlaData = true;
      } else {
        slaScore = 100;
      }
    } else {
      slaScore = 100;
    }
    if (!isMapped) {
      if (!hasSlaData) {
        return null;
      }
      return Math.round(slaScore);
    }
    let score = 0;
    let weightSum = 0;
    let hasCriticalServices = false;
    let hasEvents = false;
    let hasLowAvailability = false;
    if (srvData) {
      defaultServices.forEach(service => {
        const serviceData = srvData[service] || {};
        const critCount = parseInt(serviceData.crit, 10) || 0;
        if (critCount > 0) {
          hasCriticalServices = true;
        }
      });
    }
    const periodEventsCount = eventsCount[serverName];
    if (periodEventsCount !== undefined && periodEventsCount > 0) {
      hasEvents = true;
    }
    let availabilityValue = 100;
    if (availabilityData[serverName] && availabilityData[serverName].up !== undefined) {
      availabilityValue = parseFloat(availabilityData[serverName].up || 0);
      if (availabilityValue < 95) {
        hasLowAvailability = true;
      }
    }
    const eventsWeight = isMapped ? 0.3 : 0;
    const availabilityWeight = isMapped ? 0.3 : 0;
    const serviceTableWeight = isMapped ? 0.4 : 1;
    let eventsScore = 100;
    if (eventsWeight > 0 && periodEventsCount !== undefined) {
      if (periodEventsCount === 0) {
        eventsScore = 100;
      } else if (periodEventsCount === 1) {
        eventsScore = 70;
      } else if (periodEventsCount <= 3) {
        eventsScore = 50;
      } else if (periodEventsCount <= 6) {
        eventsScore = 30;
      } else {
        eventsScore = 15;
      }
    }
    score += eventsScore * eventsWeight;
    weightSum += eventsWeight;
    let availabilityScore = availabilityValue;
    if (availabilityValue < 80) {
      availabilityScore = Math.min(availabilityValue, 50);
    } else if (availabilityValue < 95) {
      availabilityScore = Math.min(availabilityValue, 70);
    }
    score += availabilityScore * availabilityWeight;
    weightSum += availabilityWeight;
    score += slaScore * serviceTableWeight;
    weightSum += serviceTableWeight;
    let finalScore = weightSum > 0 ? score / weightSum : 0;
    if (availabilityValue < 80) {
      finalScore = Math.min(finalScore, 50);
    } else if (availabilityValue < 95) {
      finalScore = Math.min(finalScore, 70);
    }
    if (hasEvents && finalScore > 70) {
      finalScore = Math.min(finalScore, 70);
    }
    if (periodEventsCount !== undefined && periodEventsCount >= 4 && finalScore > 50) {
      finalScore = Math.min(finalScore, 50);
    }
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
    if (!hasSlaData) {
      return null;
    }
    return Math.round(finalScore);
  };
  const getServerStatus = serverName => {
    const srvData = data?.[serverName];
    if (!srvData) return {
      status: "unknown",
      icon: "●",
      color: "gray"
    };
    let totalCrit = 0;
    let totalWarn = 0;
    let totalOk = 0;
    let serviceCount = 0;
    defaultServices.forEach(service => {
      const serviceData = srvData[service] || {};
      const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
      totalCrit += parse(serviceData.crit, 0);
      totalWarn += parse(serviceData.warn, 0);
      totalOk += parse(serviceData.ok, 100);
      serviceCount++;
    });
    const avgCrit = totalCrit / serviceCount;
    const avgWarn = totalWarn / serviceCount;
    const avgOk = totalOk / serviceCount;
    if (avgCrit > 20) {
      return {
        status: "critical",
        icon: "●",
        color: "red"
      };
    } else if (avgCrit > 10 || avgWarn > 30) {
      return {
        status: "warning",
        icon: "●",
        color: "orange"
      };
    } else if (avgOk >= 90) {
      return {
        status: "excellent",
        icon: "●",
        color: "green"
      };
    } else if (avgOk >= 70) {
      return {
        status: "good",
        icon: "●",
        color: "lightgreen"
      };
    } else {
      return {
        status: "poor",
        icon: "●",
        color: "yellow"
      };
    }
  };
  const getVLANColor = vlan => {
    if (!vlan) return {
      bg: "#9ca3af",
      text: "#ffffff"
    };
    const vlanColors = {
      "10": {
        bg: "#3b82f6",
        text: "#ffffff"
      },
      "20": {
        bg: "#10b981",
        text: "#ffffff"
      },
      "30": {
        bg: "#f59e0b",
        text: "#ffffff"
      },
      "40": {
        bg: "#8b5cf6",
        text: "#ffffff"
      },
      "50": {
        bg: "#ec4899",
        text: "#ffffff"
      },
      "60": {
        bg: "#06b6d4",
        text: "#ffffff"
      },
      "70": {
        bg: "#f97316",
        text: "#ffffff"
      },
      "80": {
        bg: "#84cc16",
        text: "#ffffff"
      },
      "90": {
        bg: "#ef4444",
        text: "#ffffff"
      },
      "100": {
        bg: "#6366f1",
        text: "#ffffff"
      }
    };
    return vlanColors[vlan] || {
      bg: "#6b7280",
      text: "#ffffff"
    };
  };
  const getOSIcon = systeme => {
    if (!systeme) return null;
    const systemeLower = systeme.toLowerCase();
    if (systemeLower.includes('windows')) {
      return <FaWindows className={styles.osIcon} />;
    }
    if (systemeLower.includes('linux') || systemeLower.includes('ubuntu') || systemeLower.includes('debian') || systemeLower.includes('centos') || systemeLower.includes('red hat') || systemeLower.includes('suse') || systemeLower.includes('opensuse') || systemeLower.includes('almalinux') || systemeLower.includes('rocky linux') || systemeLower.includes('oracle linux') || systemeLower.includes('fedora') || systemeLower.includes('vmware esxi') || systemeLower.includes('proxmox') || systemeLower.includes('citrix xenserver') || systemeLower.includes('microsoft hyper-v')) {
      return <FaLinux className={styles.osIcon} />;
    }
    return null;
  };
  const getServerInfo = srv => {
    const line1Info = [];
    const line2Info = [];
    let warrantyInfo = null;
    if (srv.systeme) {
      line1Info.push(srv.systeme);
    }
    if (srv.ip) line1Info.push(srv.ip);
    if (srv.vlan) line1Info.push(`VLAN ${srv.vlan}`);
    if (srv.type === "physique") {
      if (srv.marque && srv.modele) {
        line2Info.push({
          type: 'left',
          content: `${srv.marque} ${srv.modele}`
        });
      } else if (srv.marque) {
        line2Info.push({
          type: 'left',
          content: `${srv.marque} N/A`
        });
      } else if (srv.modele) {
        line2Info.push({
          type: 'left',
          content: `N/A ${srv.modele}`
        });
      } else {
        line2Info.push({
          type: 'left',
          content: "N/A N/A"
        });
      }
      if (srv.numeroSerie) {
        line2Info.push({
          type: 'left',
          content: `S/N: ${srv.numeroSerie}`
        });
      } else {
        line2Info.push({
          type: 'left',
          content: "S/N: N/A"
        });
      }
    }
    if (srv.type === "physique") {
      if (srv.processeur) {
        line2Info.push({
          type: 'right',
          content: srv.processeur
        });
      } else {
        line2Info.push({
          type: 'right',
          content: "N/A"
        });
      }
      if (srv.memoire && srv.memoire !== "" && srv.memoire !== null && srv.memoire !== undefined) {
        const memoireStr = String(srv.memoire).trim();
        const memoireValue = memoireStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
        const memoireNum = parseFloat(memoireValue);
        if (!isNaN(memoireNum) && memoireNum > 0) {
          line2Info.push({
            type: 'right',
            content: `${Math.round(memoireNum)} Go RAM`
          });
        } else {
          line2Info.push({
            type: 'right',
            content: "N/A Go RAM"
          });
        }
      } else {
        line2Info.push({
          type: 'right',
          content: "N/A Go RAM"
        });
      }
    } else {
      if (srv.processeur) {
        line2Info.push({
          type: 'right',
          content: `${srv.processeur} vCPU`
        });
      } else {
        line2Info.push({
          type: 'right',
          content: "N/A vCPU"
        });
      }
      if (srv.memoire && srv.memoire !== "" && srv.memoire !== null && srv.memoire !== undefined) {
        const memoireStr = String(srv.memoire).trim();
        const memoireValue = memoireStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
        const memoireNum = parseFloat(memoireValue);
        if (!isNaN(memoireNum) && memoireNum > 0) {
          line2Info.push({
            type: 'right',
            content: `${Math.round(memoireNum)} vRAM`
          });
        } else {
          line2Info.push({
            type: 'right',
            content: "N/A vRAM"
          });
        }
      } else {
        line2Info.push({
          type: 'right',
          content: "N/A vRAM"
        });
      }
    }
    if (srv.stockage && srv.stockage !== "" && srv.stockage !== null && srv.stockage !== undefined) {
      const stockageStr = String(srv.stockage).trim();
      const stockageValue = stockageStr.replace(/[^\d.,]/gi, '').replace(',', '.').trim();
      const stockageNum = parseFloat(stockageValue);
      if (!isNaN(stockageNum) && stockageNum > 0) {
        line2Info.push({
          type: 'right',
          content: `${Math.round(stockageNum)} Go`
        });
      } else {
        line2Info.push({
          type: 'right',
          content: "N/A Go"
        });
      }
    } else {
      line2Info.push({
        type: 'right',
        content: "N/A Go"
      });
    }
    if (srv.type === "physique" && srv.expirationGarantie) {
      const expirationDate = new Date(srv.expirationGarantie);
      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      warrantyInfo = {
        date: expirationDate.toLocaleDateString('en-US'),
        expired: daysUntilExpiration < 0,
        daysLeft: daysUntilExpiration >= 0 ? daysUntilExpiration : null
      };
    }
    return {
      line1Info,
      line2Info,
      warrantyInfo
    };
  };
  const saveServer = async (serverId, serverData) => {
    const clientId = config?.client?.id;
    if (!clientId) {
      throw new Error("ID client manquant");
    }
    const {
      id,
      __fromDb,
      __index,
      ...dataForDb
    } = serverData;
    const method = serverId ? "PUT" : "POST";
    const url = serverId ? `${API_BASE_URL}/clients/modules/${clientId}/server/${serverId}` : `${API_BASE_URL}/clients/modules/${clientId}/server`;
    const body = {
      item_key: serverData.nom || `server-${serverId}`,
      name: serverData.nom || `Serveur`,
      famille: "Servers",
      data: dataForDb,
      is_active: true
    };
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
  const handleSaveServer = async () => {
    if (!editingServer || !editForm) return;
    setIsSaving(true);
    try {
      const updatedServer = {
        ...editingServer,
        nom: editForm.nom,
        ip: editForm.ip || '',
        systeme: editForm.systeme || '',
        type: editForm.type || 'physique',
        site: editForm.site || '',
        vlan: editForm.vlan || '',
        marque: editForm.marque || '',
        modele: editForm.modele || '',
        numeroSerie: editForm.numeroSerie || '',
        processeur: editForm.processeur || '',
        memoire: editForm.memoire || '',
        stockage: editForm.stockage || '',
        expirationGarantie: editForm.expirationGarantie || '',
        role: editForm.role || [],
        modeHA: editForm.modeHA || false,
        roleHA: editForm.roleHA || '',
        serverHA: editForm.serverHA || 0,
        serverHAName: editForm.serverHAName || '',
        checkmk_site: editForm.checkmk_site || null,
        checkmk_host_name: editForm.checkmk_host_name || ''
      };
      const oldName = editingServer.nom;
      const newName = editForm.nom;
      const savedRow = await saveServer(editingServer.id, updatedServer);
      setConfig(prev => {
        if (!prev?.client?.equipements?.Serveurs) return prev;
        const updatedList = prev.client.equipements.Serveurs.map(srv => {
          if (srv.id === editingServer.id) {
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
          return srv;
        });
        return {
          ...prev,
          client: {
            ...prev.client,
            equipements: {
              ...prev.client.equipements,
              Servers: updatedList
            }
          }
        };
      });
      if (oldName !== newName && checkmkMappings[oldName]) {
        setCheckmkMappings(prev => {
          const newMappings = {
            ...prev
          };
          newMappings[newName] = newMappings[oldName];
          delete newMappings[oldName];
          return newMappings;
        });
      }
      toast.success("Server updated", toastOptions);
      setEditingServer(null);
      setEditForm(null);
    } catch (error) {
      console.error("Error while saving:", error);
      toast.error("Error while saving", toastOptions);
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
  }, [onSyncAllCheckMKReady]);
  useEffect(() => {
    hasRestoredDataRef.current = null;
  }, []);
  useEffect(() => {
    if (!data || Object.keys(data).length === 0 || serveurs.length === 0) return;
    let hasCheckMKData = false;
    const checkMKDataByServer = {};
    serveurs.forEach(srv => {
      const serverData = data[srv.nom];
      if (serverData) {
        const hasData = serverData.checkmkData || serverData.eventsCount !== undefined || serverData.availabilityData;
        if (hasData) {
          hasCheckMKData = true;
          checkMKDataByServer[srv.nom] = {
            checkmkData: serverData.checkmkData,
            eventsCount: serverData.eventsCount,
            totalEventsCount: serverData.totalEventsCount,
            lastEventDate: serverData.lastEventDate,
            eventsData: serverData.eventsData,
            availabilityData: serverData.availabilityData
          };
        }
      }
    });
    if (!hasCheckMKData) return;
    const dataKey = JSON.stringify(Object.keys(checkMKDataByServer).sort());
    if (hasRestoredDataRef.current === dataKey) return;
    const restoredCheckmkData = {};
    const restoredEventsCount = {};
    const restoredTotalEventsCount = {};
    const restoredLastEventDate = {};
    const restoredEventsData = {};
    const restoredAvailabilityData = {};
    serveurs.forEach(srv => {
      const serverData = data[srv.nom];
      if (serverData) {
        if (serverData.checkmkData) {
          restoredCheckmkData[srv.nom] = serverData.checkmkData;
        }
        if (serverData.eventsCount !== undefined) {
          restoredEventsCount[srv.nom] = serverData.eventsCount;
        }
        if (serverData.totalEventsCount !== undefined) {
          restoredTotalEventsCount[srv.nom] = serverData.totalEventsCount;
        }
        if (serverData.lastEventDate) {
          restoredLastEventDate[srv.nom] = new Date(serverData.lastEventDate);
        }
        if (serverData.eventsData) {
          restoredEventsData[srv.nom] = serverData.eventsData;
        }
        if (serverData.availabilityData) {
          restoredAvailabilityData[srv.nom] = serverData.availabilityData;
        }
      }
    });
    if (Object.keys(restoredCheckmkData).length > 0) {
      setCheckmkData(restoredCheckmkData);
    }
    if (Object.keys(restoredEventsCount).length > 0) {
      setEventsCount(restoredEventsCount);
    }
    if (Object.keys(restoredTotalEventsCount).length > 0) {
      setTotalEventsCount(restoredTotalEventsCount);
    }
    if (Object.keys(restoredLastEventDate).length > 0) {
      setLastEventDate(restoredLastEventDate);
    }
    if (Object.keys(restoredEventsData).length > 0) {
      setEventsData(restoredEventsData);
    }
    if (Object.keys(restoredAvailabilityData).length > 0) {
      setAvailabilityData(restoredAvailabilityData);
    }
    hasRestoredDataRef.current = dataKey;
  }, [data, serveurs]);
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
            const isServerType = ['serveurs', 'serveur', 'server', 'servers'].includes(type);
            if (isServerType && m.is_active !== false && m.equipment_id) {
              mappingsMap[m.equipment_id] = m;
            }
          });
          setCheckmkMappings(mappingsMap);
        } else {
          setCheckmkMappings({});
        }
      } catch (error) {
        console.error('Error loading Check MK mappings:', error);
        setCheckmkMappings({});
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
  const mapCheckMKServicesToDefaults = (checkmkServices, serviceName) => {
    if (!checkmkServices || !Array.isArray(checkmkServices)) return null;
    const patterns = {
      'CPU': ['cpu', 'utilization', 'processor', 'load'],
      'C:/': ['c:', 'c:/', 'filesystem c:', 'filesystem c:/', 'disk c:', 'disk c:/'],
      'RAM': ['memory', 'ram', 'mem', 'swap'],
      'UPTIME': ['uptime', 'up time', 'system uptime']
    };
    const patternsForService = patterns[serviceName] || [];
    for (const service of checkmkServices) {
      const serviceTitle = (service.title || service.id || '').toLowerCase();
      const serviceId = (service.id || '').toLowerCase();
      for (const pattern of patternsForService) {
        if (serviceTitle.includes(pattern) || serviceId.includes(pattern)) {
          const state = service.state;
          let ok = 100,
            warn = 0,
            crit = 0;
          if (state === 0) {
            ok = 100;
            warn = 0;
            crit = 0;
          } else if (state === 1) {
            ok = 0;
            warn = 100;
            crit = 0;
          } else if (state === 2) {
            ok = 0;
            warn = 0;
            crit = 100;
          } else {
            ok = 50;
            warn = 30;
            crit = 20;
          }
          return {
            ok,
            warn,
            crit
          };
        }
      }
    }
    return null;
  };
  const loadEventsCount = async (serverName, checkmkHostName) => {
    if (!checkmkHostName) {
      return;
    }
    const period = getReportPeriod();
    if (!period.start_time || !period.end_time) {
      console.warn(`⚠️ [Events] ${serverName}: Period not defined, unable to fetch events`);
      setEventsCount(prev => ({
        ...prev,
        [serverName]: 0
      }));
      setTotalEventsCount(prev => ({
        ...prev,
        [serverName]: 0
      }));
      setLastEventDate(prev => ({
        ...prev,
        [serverName]: null
      }));
      return;
    }
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
      url.searchParams.append('start_time', period.start_time);
      url.searchParams.append('end_time', period.end_time);
      const mapping = getCheckMKMapping(serverName);
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
        const totalEventsCountValue = result.total_events_count || 0;
        const eventsDataValue = result.events || [];
        setEventsCount(prev => ({
          ...prev,
          [serverName]: eventsCountValue
        }));
        setTotalEventsCount(prev => ({
          ...prev,
          [serverName]: totalEventsCountValue
        }));
        setEventsData(prev => ({
          ...prev,
          [serverName]: eventsDataValue
        }));
        if (typeof setData === 'function') {
          const currentData = dataRef.current || {};
          const updatedServers = {
            ...currentData,
            [serverName]: {
              ...(currentData[serverName] || {}),
              eventsCount: eventsCountValue,
              totalEventsCount: totalEventsCountValue,
              eventsData: eventsDataValue
            }
          };
          setData(updatedServers);
          dataRef.current = updatedServers;
        }
        let lastDate = null;
        if (result.events && Array.isArray(result.events) && result.events.length > 0) {
          const sortedEvents = [...result.events].sort((a, b) => {
            let dateA, dateB;
            if (Array.isArray(a)) {
              dateA = a[1];
            } else {
              dateA = a.time || a.first_occurrence || a.last_occurrence || a.date || a.timestamp || a.log_time || 0;
            }
            if (Array.isArray(b)) {
              dateB = b[1];
            } else {
              dateB = b.time || b.first_occurrence || b.last_occurrence || b.date || b.timestamp || b.log_time || 0;
            }
            let timeA, timeB;
            if (typeof dateA === 'number') {
              timeA = dateA < 10000000000 ? dateA * 1000 : dateA;
            } else if (typeof dateA === 'string') {
              timeA = new Date(dateA.replace(' ', 'T')).getTime();
            } else {
              timeA = 0;
            }
            if (typeof dateB === 'number') {
              timeB = dateB < 10000000000 ? dateB * 1000 : dateB;
            } else if (typeof dateB === 'string') {
              timeB = new Date(dateB.replace(' ', 'T')).getTime();
            } else {
              timeB = 0;
            }
            return timeB - timeA;
          });
          const lastEvent = sortedEvents[0];
          let eventDate;
          if (Array.isArray(lastEvent)) {
            eventDate = lastEvent[1];
          } else {
            eventDate = lastEvent.time || lastEvent.first_occurrence || lastEvent.last_occurrence || lastEvent.date || lastEvent.timestamp || lastEvent.log_time;
          }
          if (eventDate) {
            if (typeof eventDate === 'number') {
              lastDate = new Date(eventDate < 10000000000 ? eventDate * 1000 : eventDate);
            } else if (typeof eventDate === 'string') {
              lastDate = new Date(eventDate.replace(' ', 'T'));
            }
          }
        }
        setLastEventDate(prev => ({
          ...prev,
          [serverName]: lastDate
        }));
        if (lastDate) {
          const currentData = dataRef.current || {};
          const updatedServers = {
            ...currentData,
            [serverName]: {
              ...(currentData[serverName] || {}),
              lastEventDate: lastDate.toISOString()
            }
          };
          setData(updatedServers);
          dataRef.current = updatedServers;
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ [Events] Sync failed for ${serverName} (${response.status})`);
        setEventsCount(prev => ({
          ...prev,
          [serverName]: 0
        }));
        setTotalEventsCount(prev => ({
          ...prev,
          [serverName]: 0
        }));
        setLastEventDate(prev => ({
          ...prev,
          [serverName]: null
        }));
        const currentData = dataRef.current || {};
        const updatedServers = {
          ...currentData,
          [serverName]: {
            ...(currentData[serverName] || {}),
            eventsCount: 0,
            totalEventsCount: 0,
            lastEventDate: null,
            eventsData: []
          }
        };
        setData(updatedServers);
        dataRef.current = updatedServers;
      }
    } catch (error) {
      console.error(`❌ [Events] Sync failed for ${serverName}:`, error.message);
      setEventsCount(prev => ({
        ...prev,
        [serverName]: 0
      }));
      setTotalEventsCount(prev => ({
        ...prev,
        [serverName]: 0
      }));
      setLastEventDate(prev => ({
        ...prev,
        [serverName]: null
      }));
      const updatedServers = {
        ...data,
        [serverName]: {
          ...(data[serverName] || {}),
          eventsCount: 0,
          totalEventsCount: 0,
          lastEventDate: null,
          eventsData: []
        }
      };
      setData(updatedServers);
    }
  };
  const loadAvailabilityData = async (serverName, checkmkHostName) => {
    if (!checkmkHostName) {
      return;
    }
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
      const mapping = getCheckMKMapping(serverName);
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
        const availabilityValue = result.availability;
        setAvailabilityData(prev => ({
          ...prev,
          [serverName]: availabilityValue
        }));
        const currentData = dataRef.current || {};
        const updatedServers = {
          ...currentData,
          [serverName]: {
            ...(currentData[serverName] || {}),
            availabilityData: availabilityValue
          }
        };
        setData(updatedServers);
        dataRef.current = updatedServers;
      } else {
        console.warn(`⚠️ [Availability] Error for ${serverName}: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ [Availability] Error fetching availability for ${serverName}:`, error);
    }
  };
  const loadCheckMKData = async (serverName, checkmkHostName, showToasts = true) => {
    if (!checkmkHostName || loadingCheckMK[serverName]) return;
    setSyncMode(prev => ({
      ...prev,
      [serverName]: 'manual'
    }));
    const currentDataBeforeSync = dataRef.current || {};
    const updatedBeforeSync = {
      ...currentDataBeforeSync,
      [serverName]: {
        ...(currentDataBeforeSync[serverName] || {}),
        manualHealthScore: undefined
      }
    };
    setData(updatedBeforeSync);
    dataRef.current = updatedBeforeSync;
    setAnimatedScore(prev => ({
      ...prev,
      [serverName]: 0
    }));
    setScoreAnimationComplete(prev => ({
      ...prev,
      [serverName]: false
    }));
    setLoadingCheckMK(prev => ({
      ...prev,
      [serverName]: true
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
          [serverName]: checkmkDataValue
        }));
        const currentData = dataRef.current || {};
        const updatedServers = {
          ...currentData,
          [serverName]: {
            ...(currentData[serverName] || {}),
            checkmkData: checkmkDataValue
          }
        };
        setData(updatedServers);
        dataRef.current = updatedServers;
        const syncDate = new Date().toISOString();
        const updatedServersWithSyncDate = {
          ...updatedServers,
          [serverName]: {
            ...updatedServers[serverName],
            lastSyncDate: syncDate
          }
        };
        setData(updatedServersWithSyncDate);
        dataRef.current = updatedServersWithSyncDate;
        const period = getReportPeriod();
        const mapping = getCheckMKMapping(serverName);
        if (period?.start_time && period?.end_time) {
          try {
            const reportData = await getCheckMKReportPeriodData(checkmkHostName, period.start_time, period.end_time, mapping?.checkmk_site || null);
            const ev = reportData?.events || {};
            const av = reportData?.availability || {};
            setEventsCount(prev => ({
              ...prev,
              [serverName]: ev.events_count || 0
            }));
            setEventsData(prev => ({
              ...prev,
              [serverName]: ev.events || []
            }));
            if (av.availability) {
              setAvailabilityData(prev => ({
                ...prev,
                [serverName]: av.availability
              }));
            } else {
              await loadAvailabilityData(serverName, checkmkHostName);
            }
          } catch (e) {
            await Promise.all([loadEventsCount(serverName, checkmkHostName), loadAvailabilityData(serverName, checkmkHostName)]);
          }
        } else {
          await Promise.all([loadEventsCount(serverName, checkmkHostName), loadAvailabilityData(serverName, checkmkHostName)]);
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Error fetching Check MK services:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching Check MK services:', error);
    } finally {
      setLoadingCheckMK(prev => ({
        ...prev,
        [serverName]: false
      }));
      setTimeout(() => {
        const finalScore = getGlobalScore(serverName);
        if (finalScore !== null) {
          setAnimatedScore(prev => ({
            ...prev,
            [serverName]: 0
          }));
          setScoreAnimationComplete(prev => ({
            ...prev,
            [serverName]: false
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
              [serverName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(scoreTimer);
              setAnimatedScore(prev => ({
                ...prev,
                [serverName]: finalScore
              }));
              setTimeout(() => {
                setScoreAnimationComplete(prev => ({
                  ...prev,
                  [serverName]: true
                }));
              }, 100);
            }
          }, duration / steps);
        }
        const availability = availabilityData[serverName];
        if (availability && availability.up !== undefined) {
          const finalAvailability = parseFloat(availability.up || 0);
          setAnimatedAvailability(prev => ({
            ...prev,
            [serverName]: 0
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
              [serverName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(availabilityTimer);
              setAnimatedAvailability(prev => ({
                ...prev,
                [serverName]: finalAvailability
              }));
            }
          }, duration / steps);
        }
        const servicesData = checkmkData[serverName];
        if (servicesData) {
          const finalServices = servicesData.statistics?.totalServices || servicesData.serviceInfo?.total || servicesData.services?.length || 0;
          setAnimatedServices(prev => ({
            ...prev,
            [serverName]: 0
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
              [serverName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(servicesTimer);
              setAnimatedServices(prev => ({
                ...prev,
                [serverName]: finalServices
              }));
            }
          }, duration / steps);
        }
        const finalEvents = eventsCount[serverName];
        if (finalEvents !== undefined) {
          setAnimatedEvents(prev => ({
            ...prev,
            [serverName]: 0
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
              [serverName]: Math.round(newValue)
            }));
            if (currentStep >= steps) {
              clearInterval(eventsTimer);
              setAnimatedEvents(prev => ({
                ...prev,
                [serverName]: finalEvents
              }));
            }
          }, duration / steps);
        }
      }, 100);
    }
  };
  const syncAllCheckMK = useCallback(async () => {
    const mappedServers = serveurs.filter(srv => srv.id && checkmkMappings[srv.id]);
    if (mappedServers.length === 0) {
      toast.warning('No server mapped with Check MK', toastOptions);
      return;
    }
    const syncPromises = mappedServers.map(srv => loadCheckMKData(srv.nom, checkmkMappings[srv.id].checkmk_host_name, false));
    try {
      await Promise.all(syncPromises);
      toast.success(`Synchronization completed`, toastOptions);
    } catch (error) {
      toast.error(`Error during synchronization`, toastOptions);
    }
  }, [serveurs, checkmkMappings]);
  useEffect(() => {
    syncAllCheckMKRef.current = syncAllCheckMK;
  }, [syncAllCheckMK]);
  useEffect(() => {
    if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
      const hasMappings = serveurs.some(srv => srv.id && checkmkMappings[srv.id]);
      const isLoading = Object.values(loadingCheckMK).some(loading => loading);
      if (lastNotifiedSyncInfoRef.current.hasMappings === hasMappings && lastNotifiedSyncInfoRef.current.isLoading === isLoading) {
        return;
      }
      onSyncAllCheckMKReadyRef.current({
        syncAllCheckMK: syncAllCheckMKRef.current,
        hasCheckMKMappings: hasMappings,
        isLoading
      });
      lastNotifiedSyncInfoRef.current = {
        hasMappings,
        isLoading
      };
    }
  }, [checkmkMappings, loadingCheckMK, serveurs, syncAllCheckMK]);
  useEffect(() => {
    if (!serveurs.length) return;
    if (data && Object.keys(data).length > 0) {
      let hasRealData = false;
      serveurs.forEach(srv => {
        const serverData = data[srv.nom];
        if (serverData && Object.keys(serverData).length > 0) {
          hasRealData = true;
        }
      });
      if (hasRealData) return;
    }
    const initializedData = {};
    serveurs.forEach(srv => {
      const existingData = data[srv.nom] || {};
      const services = {};
      defaultServices.forEach(service => {
        const existingService = existingData[service];
        services[service] = existingService || {
          ok: 100,
          warn: 0,
          crit: 0
        };
      });
      initializedData[srv.nom] = {
        ...services,
        comment: existingData.comment || "",
        ...Object.keys(existingData).reduce((acc, key) => {
          if (!defaultServices.includes(key) && key !== 'comment') {
            acc[key] = existingData[key];
          }
          return acc;
        }, {})
      };
    });
    setData(initializedData);
  }, [serveurs, data, setData]);
  const groupedBySite = serveurs.reduce((acc, srv) => {
    const siteName = srv.site || "No site";
    if (!acc[siteName]) {
      acc[siteName] = [];
    }
    acc[siteName].push(srv);
    return acc;
  }, {});
  const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
    if (a === "No site") return 1;
    if (b === "No site") return -1;
    return a.localeCompare(b);
  });
  useEffect(() => {
    if (!config?.client?.id || !setConfig) return;
    const controller = new AbortController();
    const loadServersFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/servers`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) return;
        const rows = await res.json();
        const serveursList = (rows || []).map(row => {
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
                Servers: serveursList
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading servers:", err);
      }
    };
    loadServersFromDb();
    return () => controller.abort();
  }, [config?.client?.id]);
  useEffect(() => {
    if (serveurs.length > 0) {
      setSyncMode(prev => {
        const updated = {
          ...prev
        };
        let hasChanges = false;
        serveurs.forEach(srv => {
          if (updated[srv.nom] === undefined) {
            updated[srv.nom] = 'manual';
            hasChanges = true;
          }
        });
        return hasChanges ? updated : prev;
      });
    }
  }, [serveurs]);
  if (serveurs.length === 0) {
    return <div className={commonStyles.container}>
                <div className={commonStyles.emptyState}>
                    <p>No server configured for this client.</p>
                </div>
            </div>;
  }
  return <div className={styles.container}>
            {sortedSites.map(siteName => {
      const siteServers = groupedBySite[siteName];
      const physicalServers = siteServers.filter(s => s.type === "physique");
      const virtualServers = siteServers.filter(s => s.type !== "physique");
      const physicalCount = physicalServers.length;
      const virtualCount = virtualServers.length;
      let hasRenderedPhysical = false;
      let hasRenderedVirtual = false;
      return <div key={siteName} className={styles.siteGroup} id={`site-${siteName}`} data-site-label={siteName}>
                    <div className={styles.siteSeparator}>
                        <h2 className={styles.siteTitle}>
                            <IconifyIcon icon="mingcute:building-4-fill" width={24} height={24} className={styles.siteIcon} />
                            <span>{siteName}</span>
                            {siteServers.length > 0 && <span className={styles.siteCount}>
                                    {siteServers.length} serveur{siteServers.length > 1 ? 's' : ''}
                                </span>}
                        </h2>
                    </div>
                    <div className={styles.serverGrid}>
                        {groupedBySite[siteName].sort((a, b) => {
            const aIsPhysical = a.type !== "virtuel";
            const bIsPhysical = b.type !== "virtuel";
            if (aIsPhysical && !bIsPhysical) return -1;
            if (!aIsPhysical && bIsPhysical) return 1;
            return a.nom.localeCompare(b.nom);
          }).map((srv, i) => {
            const isPhysical = srv.type !== "virtuel";
            const shouldShowCategoryTitle = isPhysical && !hasRenderedPhysical || !isPhysical && !hasRenderedVirtual;
            if (isPhysical) {
              hasRenderedPhysical = true;
            } else {
              hasRenderedVirtual = true;
            }
            const serverStatus = getServerStatus(srv.nom);
            const {
              line1Info,
              line2Info,
              warrantyInfo
            } = getServerInfo(srv);
            const roleColor = getRoleColor(srv.role);
            const needsSyncWarning = Boolean(srv.id && checkmkMappings[srv.id] && !data?.[srv.nom]?.lastSyncDate && !loadingCheckMK[srv.nom]);
            return <React.Fragment key={`${srv.nom}-${i}`}>
                                    {shouldShowCategoryTitle && <div className={styles.categorySeparator}>
                                            <h3 className={styles.categoryTitle}>{isPhysical ? "Physique" : "Virtuel"}</h3>
                                        </div>}
                                    <div className={`${styles.serverCard} ${styles.withComment}`}>
                                {}
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerLeft}>
                                        <div className={styles.serverInfo}>
                                            <h3 className={styles.serverName}>
                                                <span className={styles.serverNameSection}>
                                                    <span className={styles.iconWrapper}>
                                                        {isPhysical ? <FaServer className={`${styles.osIcon} ${styles.serverIconPhysical}`} /> : <FaCube className={`${styles.osIcon} ${styles.serverIconVirtual}`} />}
                                                    </span>
                                                    {getOSIcon(srv.systeme) && <span className={styles.osIconWrapper}>
                                                            {getOSIcon(srv.systeme)}
                                                        </span>}
                                                    <span className={styles.serverNameText}>
                                                        {srv.nom}
                                                    </span>
                                                    {}
                                                    {(() => {
                            const roles = Array.isArray(srv.role) ? srv.role : srv.role ? [srv.role] : [];
                            return roles.map((role, roleIndex) => <span key={roleIndex} className={`${styles.roleLabel} ${styles.roleLabelInline}`}>
                                                                {role}
                                                            </span>);
                          })()}
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.serverType}>
                                        {}
                                        <div className={styles.buttonGroup}>
                                            {srv.id && checkmkMappings[srv.id] && <button type="button" className={`${styles.syncButton} ${needsSyncWarning ? styles.syncButtonWarning : ''}`} onClick={() => {
                        if (!loadingCheckMK[srv.nom]) {
                          loadCheckMKData(srv.nom, checkmkMappings[srv.id].checkmk_host_name);
                        }
                      }} title={`Mapped to Check MK: ${checkmkMappings[srv.id].checkmk_host_name}. Click to sync.`} disabled={loadingCheckMK[srv.nom]}>
                                                    <IconifyIcon icon="material-symbols:sync" width={14} height={14} className={loadingCheckMK[srv.nom] ? styles.loadingIcon : ''} />
                                                </button>}
                                            <div className={styles.flexAuto}>
                                            </div>
                                            <button type="button" className={commonStyles.editButton} onClick={() => {
                        console.log('[Servers] Server object when editing:', {
                          nom: srv.nom,
                          id: srv.id,
                          allKeys: Object.keys(srv)
                        });
                        setEditingServer(srv);
                        setEditForm({
                          nom: srv.nom || '',
                          ip: srv.ip || '',
                          systeme: srv.systeme || '',
                          type: srv.type || 'physique',
                          site: srv.site || '',
                          vlan: srv.vlan || '',
                          marque: srv.marque || '',
                          modele: srv.modele || '',
                          numeroSerie: srv.numeroSerie || '',
                          processeur: srv.processeur || '',
                          memoire: srv.memoire || '',
                          stockage: srv.stockage || '',
                          expirationGarantie: srv.expirationGarantie || '',
                          role: Array.isArray(srv.role) ? [...srv.role] : srv.role ? [srv.role] : [],
                          modeHA: srv.modeHA || false,
                          roleHA: srv.roleHA || '',
                          serverHA: srv.serverHA || 0,
                          serverHAName: srv.serverHAName || '',
                          checkmk_site: srv.checkmk_site || null,
                          checkmk_host_name: srv.checkmk_host_name || ''
                        });
                      }} title="Edit server">
                                                <IconifyIcon icon="material-symbols:edit" width={14} height={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {(line1Info.length > 0 || line2Info.length > 0 || warrantyInfo) && <div className={`${commonStyles.moduleMeta} ${styles.serverMetaFlex}`}>
                                        {}
                                        <span className={styles.flexOne}>
                                            <div className={styles.serverMetaLines}>
                                                {}
                                                {line1Info.length > 0 && <div className={styles.serverMetaLine}>
                                                        {line1Info.map((item, index) => <React.Fragment key={index}>
                                                                <span>{item}</span>
                                                                {index < line1Info.length - 1 && <span>•</span>}
                                                            </React.Fragment>)}
                                                    </div>}
                                                {}
                                                {line2Info.length > 0 && <div className={styles.serverMetaLine}>
                                                        {}
                                                        {line2Info.filter(item => item.type === 'left').map((item, index, array) => <React.Fragment key={index}>
                                                                    <span>{item.content}</span>
                                                                    {index < array.length - 1 && <span>•</span>}
                                                                </React.Fragment>)}
                                                        {}
                                                        {line2Info.some(item => item.type === 'left') && line2Info.some(item => item.type === 'right') && <span>•</span>}
                                                        {}
                                                        {line2Info.filter(item => item.type === 'right').map((item, index, array) => <React.Fragment key={index}>
                                                                    <span>{item.content}</span>
                                                                    {index < array.length - 1 && <span>•</span>}
                                                                </React.Fragment>)}
                                                    </div>}
                                            </div>
                                        </span>
                                        {}
                                        {warrantyInfo && <div className={styles.licenseInfoRow}>
                                                <span className={styles.iconTextRow}>
                                                    <IconifyIcon icon="streamline-flex:warranty-badge-highlight-solid" width={12} height={12} className={styles.iconGray} />
                                                    {warrantyInfo.date}
                                                </span>
                                            </div>}
                                    </div>}

                                <div className={`${styles.serverScrollable} ${styles.serverScrollableDynamic} ${syncMode[srv.nom] === 'checkmk' ? styles.serverScrollableHidden : styles.serverScrollableAuto}`}>
                                <div className={styles.serverCardContent}>
                                    {}
                                    <div className={styles.metricsWrapper}>
                                    {}
                                    {(syncMode[srv.nom] === 'manual' || !syncMode[srv.nom]) && <div className={styles.statsWrapper}>
                                        {loadingCheckMK[srv.nom] ? <div className={styles.loadingWrapper}>
                                                <IconifyIcon icon="material-symbols:sync" width={32} height={32} className={styles.loadingIcon} />
                                                <span className={styles.loadingText}>
                                                    Synchronization en cours
                                                </span>
                                            </div> : <>
                                        {}
                                        {(() => {
                            const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                            const isMapped = Boolean(mapping);
                            const hasSyncData = Boolean(data?.[srv.nom]?.lastSyncDate);
                            const shouldShowNA = isMapped && !hasSyncData;
                            const calculatedScore = shouldShowNA ? null : getGlobalScore(srv.nom);
                            const manualScore = data?.[srv.nom]?.manualHealthScore;
                            const healthScore = shouldShowNA ? null : manualScore !== undefined ? manualScore : calculatedScore;
                            const isLoading = false;
                            const isAnimating = animatedScore[srv.nom] !== undefined && !scoreAnimationComplete[srv.nom];
                            const isEditing = editingScore[srv.nom];
                            const serviceAvailabilityWeightPercent = isMapped ? 30 : 50;
                            const scoreBreakdown = mapping ? [{
                              label: "Events",
                              description: "Alerts detected over the period",
                              weight: "30 pts"
                            }, {
                              label: "Availability",
                              description: "Availability rate reported by CheckMK",
                              weight: "30 pts"
                            }, {
                              label: "Service availability",
                              description: "OK / WARN / CRIT for each monitored service",
                              weight: "40 pts"
                            }] : [{
                              label: "Service availability",
                              description: "OK / WARN / CRIT over the monitored period",
                              weight: "100 pts"
                            }];
                            const placeholderScore = 95;
                            let displayScore = null;
                            if (!isLoading) {
                              if (shouldShowNA) {
                                displayScore = placeholderScore;
                              } else {
                                displayScore = isAnimating ? animatedScore[srv.nom] : healthScore;
                              }
                            }
                            const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                            const scoreLetter = healthScore !== null ? scoreToLetter(healthScore) : null;
                            const scoreColor = scoreLetter ? scoreToColor(healthScore) : '#9ca3af';
                            const displayColor = shouldShowNA ? '#9ca3af' : displayScore !== null ? scoreToColor(displayScore) : scoreColor;
                            const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
                            return <>
                                                <div className={styles.scoreCardWrapper} onMouseLeave={() => {
                                if (hoveredTooltip?.type === 'score' && hoveredTooltip.serverName === srv.nom) {
                                  setHoveredTooltip(null);
                                }
                              }}>
                                                <div className={`${styles.scoreCardLeft} ${isLoading ? styles.statCardDisabled : ''}`}>
                                                    {isLoading && <div className={styles.loadingCenter}>
                                                            <FaSync className={styles.loadingSyncIcon} />
                                                            Synchronization...
                                                        </div>}
                                                    {!isLoading && <div className={styles.scoreInfoIcon}>
                                                            <div className={commonStyles.scoreTooltipContainer}>
                                                                <IconifyIcon icon="material-symbols:info" width={16} height={16} className={commonStyles.scoreTooltipIcon} onMouseEnter={e => {
                                        setHoveredTooltip({
                                          type: 'score',
                                          serverName: srv.nom,
                                          mouseX: e.clientX,
                                          mouseY: e.clientY,
                                          scoreBreakdown
                                        });
                                      }} onMouseMove={e => {
                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.serverName === srv.nom) {
                                          setHoveredTooltip(prev => ({
                                            ...prev,
                                            mouseX: e.clientX,
                                            mouseY: e.clientY
                                          }));
                                        }
                                      }} onMouseLeave={() => {
                                        if (hoveredTooltip?.type === 'score' && hoveredTooltip.serverName === srv.nom) {
                                          setHoveredTooltip(null);
                                        }
                                      }} />
                                                            </div>
                                                        </div>}
                                                    {!isLoading && <div className={styles.scoreDisplayWrapper}>
                                                            <div className={styles.scoreInputWrapper}>
                                                                {isEditing ? <input type="number" min="0" max="100" value={editingScoreValue[srv.nom] !== undefined ? editingScoreValue[srv.nom] : displayScore} onChange={e => setEditingScoreValue(prev => ({
                                        ...prev,
                                        [srv.nom]: e.target.value
                                      }))} onBlur={() => saveEditScore(srv.nom)} onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          saveEditScore(srv.nom);
                                        } else if (e.key === 'Escape') {
                                          cancelEditScore(srv.nom);
                                        }
                                      }} autoFocus className={styles.scoreInput} style={{
                                        color: displayColor,
                                        borderColor: displayColor
                                      }} /> : <div role="button" tabIndex={displayScore !== null ? 0 : -1} onKeyDown={e => {
                                        if (displayScore !== null && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
                                          e.preventDefault();
                                          startEditScore(srv.nom, displayScore);
                                        }
                                      }} title={displayScore !== null ? "Click to select a grade, double-click to edit precisely" : ""} className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}>
                                                                        <LetterScale activeLetter={displayLetter} letters={["F", "E", "D", "C", "B", "A"]} size="normal" onSelect={!isLoading ? letter => handleManualLetterSelect(srv.nom, letter) : undefined} highlightLetter={!shouldShowNA && manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null} />
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
                                            <div className={`${styles.statCard} ${loadingCheckMK[srv.nom] ? styles.statCardDisabled : checkmkData[srv.nom] ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                    if (mapping && checkmkData[srv.nom]) {
                                      setHoveredTooltip({
                                        type: 'services',
                                        serverName: srv.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseMove={e => {
                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                    if (mapping && checkmkData[srv.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.serverName === srv.nom) {
                                      setHoveredTooltip({
                                        type: 'services',
                                        serverName: srv.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseLeave={() => {
                                    if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.serverName === srv.nom) {
                                      setHoveredTooltip(null);
                                    }
                                  }}>
                                                <IconifyIcon icon="material-symbols-light:view-module" width={22} height={22} className={styles.statIcon} />
                                                {!(srv.id && getCheckMKMapping(srv.id)) ? <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Not mapped
                                                        </div>
                                                    </div> : loadingCheckMK[srv.nom] ? <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Loading...
                                                    </div> : <div className={`${styles.statValue} ${checkmkData[srv.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                        {checkmkData[srv.nom] ? animatedServices[srv.nom] !== undefined ? animatedServices[srv.nom] : checkmkData[srv.nom]?.services?.length || 0 : 'N/A'}
                                                    </div>}
                                            </div>
                                            
                                            {}
                                            <div className={`${styles.statCard} ${loadingCheckMK[srv.nom] ? styles.statCardDisabled : eventsCount[srv.nom] !== undefined ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                    if (mapping && eventsData[srv.nom] && eventsData[srv.nom].length > 0) {
                                      setHoveredTooltip({
                                        type: 'events',
                                        serverName: srv.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseMove={e => {
                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                    if (mapping && eventsData[srv.nom] && eventsData[srv.nom].length > 0 && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.serverName === srv.nom) {
                                      setHoveredTooltip({
                                        type: 'events',
                                        serverName: srv.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseLeave={() => {
                                    if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.serverName === srv.nom) {
                                      setHoveredTooltip(null);
                                    }
                                  }}>
                                                <IconifyIcon icon="mingcute:alert-fill" width={22} height={22} className={styles.statIcon} />
                                                {!(srv.id && getCheckMKMapping(srv.id)) ? <div className={styles.statCardNotMapped}>
                                                        <div className={styles.statValueNotMapped}>
                                                            N/A
                                                        </div>
                                                        <div className={styles.statLabelNotMapped}>
                                                            Not mapped
                                                        </div>
                                                    </div> : loadingCheckMK[srv.nom] ? <div className={styles.loadingRow}>
                                                        <FaSync className={styles.loadingIconSmall} />
                                                        Loading...
                                                    </div> : <div className={`${styles.statValue} ${eventsCount[srv.nom] !== undefined ? eventsCount[srv.nom] > 0 ? styles.statValueEventsWarning : styles.statValueEventsNormal : styles.statValueSecondary}`}>
                                                        {eventsCount[srv.nom] !== undefined ? animatedEvents[srv.nom] !== undefined ? animatedEvents[srv.nom] : eventsCount[srv.nom] : 'N/A'}
                                                    </div>}
                                            </div>
                                            
                                            {}
                                            <div className={`${styles.statCard} ${loadingCheckMK[srv.nom] ? styles.statCardDisabled : availabilityData[srv.nom] ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                    if (mapping && availabilityData[srv.nom]) {
                                      setHoveredTooltip({
                                        type: 'availability',
                                        serverName: srv.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseMove={e => {
                                    const mapping = srv.id ? getCheckMKMapping(srv.id) : null;
                                    if (mapping && availabilityData[srv.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.serverName === srv.nom) {
                                      setHoveredTooltip({
                                        type: 'availability',
                                        serverName: srv.nom,
                                        mouseX: e.clientX,
                                        mouseY: e.clientY
                                      });
                                    }
                                  }} onMouseLeave={() => {
                                    if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.serverName === srv.nom) {
                                      setHoveredTooltip(null);
                                    }
                                  }}>
                                            <IconifyIcon icon="tabler:gauge" width={22} height={22} className={styles.statIcon} />
                                            {!(srv.id && getCheckMKMapping(srv.id)) ? <div className={styles.statCardNotMapped}>
                                                    <div className={styles.statValueNotMapped}>
                                                        N/A
                                                    </div>
                                                    <div className={styles.statLabelNotMapped}>
                                                        Not mapped
                                                    </div>
                                                </div> : loadingCheckMK[srv.nom] ? <div className={styles.loadingRow}>
                                                    <FaSync className={styles.loadingIconSmall} />
                                                    Loading...
                                                </div> : <div className={styles.statValueAvailability} style={{
                                      color: availabilityData[srv.nom] && availabilityData[srv.nom].up !== undefined ? (() => {
                                        const displayValue = animatedAvailability[srv.nom] !== undefined ? animatedAvailability[srv.nom] : parseFloat(availabilityData[srv.nom].up || 0);
                                        return getProgressiveColor(displayValue);
                                      })() : 'var(--text-secondary)'
                                    }}>
                                                    {availabilityData[srv.nom] && availabilityData[srv.nom].up !== undefined ? `${animatedAvailability[srv.nom] !== undefined ? animatedAvailability[srv.nom] : Math.round(parseFloat(availabilityData[srv.nom].up || 0))}%` : 'N/A'}
                                                </div>}
                                            </div>
                                        </div>
                                                </div>
                                                </>;
                          })()}
                                        </>}
                                    </div>}

                                    {}
                                    {syncMode[srv.nom] === 'checkmk' && <div className={styles.metricsTable}>
                                        {hasInvalidLines(srv.nom) && <div className={styles.metricsTableWarningIcon}>
                                                <IconifyIcon icon="material-symbols:warning" width={20} height={20} />
                                            </div>}
                                        <div className={styles.metricsGrid}>
                                            {defaultServices.map((service, index) => {
                            const srvData = data?.[srv.nom]?.[service] || {};
                            const parse = (val, fallback) => isNaN(parseInt(val, 10)) ? fallback : parseInt(val, 10);
                            const ok = srvData.ok !== undefined ? parse(srvData.ok, 100) : 100;
                            const warn = srvData.warn !== undefined ? parse(srvData.warn, 0) : 0;
                            const crit = srvData.crit !== undefined ? parse(srvData.crit, 0) : 0;
                            const getServiceIcon = serviceName => {
                              switch (serviceName) {
                                case 'CPU':
                                  return 'lucide:cpu';
                                case 'RAM':
                                  return 'fa-solid:memory';
                                case 'C:/':
                                  return 'ph:hard-drive';
                                case 'UPTIME':
                                  return 'mdi:tool-time';
                                default:
                                  return null;
                              }
                            };
                            const serviceIcon = getServiceIcon(service);
                            const isOkFocused = focusedInput?.service === service && focusedInput?.type === 'ok';
                            const isWarnFocused = focusedInput?.service === service && focusedInput?.type === 'warn';
                            const isCritFocused = focusedInput?.service === service && focusedInput?.type === 'crit';
                            return <div key={service} className={styles.metricServiceCard}>
                                                            <div className={styles.metricInputsRow}>
                                                                {serviceIcon && <IconifyIcon icon={serviceIcon} width={26} height={26} className={styles.metricServiceIcon} />}
                                                                <input type="number" min="0" max="100" value={ok} onChange={e => updateValue(srv.nom, service, "ok", e.target.value)} className={`${commonStyles.metricInput} ${ok !== 0 ? commonStyles.okInput : ''} ${isOkFocused ? styles.metricInputFocusedOk : ''}`} aria-label={`OK pour ${service}`} onFocus={e => handleInputFocus(e, service, 'ok')} onBlur={handleInputBlur} />
                                                                <input type="number" min="0" max="100" value={warn} onChange={e => updateValue(srv.nom, service, "warn", e.target.value)} className={`${commonStyles.metricInput} ${warn !== 0 ? commonStyles.warnInput : ''} ${isWarnFocused ? styles.metricInputFocusedWarn : ''}`} aria-label={`WARN pour ${service}`} onFocus={e => handleInputFocus(e, service, 'warn')} onBlur={handleInputBlur} />
                                                                <input type="number" min="0" max="100" value={crit} onChange={e => updateValue(srv.nom, service, "crit", e.target.value)} className={`${commonStyles.metricInput} ${crit !== 0 ? commonStyles.critInput : ''} ${isCritFocused ? styles.metricInputFocusedCrit : ''}`} aria-label={`CRIT pour ${service}`} onFocus={e => handleInputFocus(e, service, 'crit')} onBlur={handleInputBlur} />
                                                            </div>
                                                        </div>;
                          })}
                                        </div>
                                    </div>}
                                    </div>
                                </div>
                                </div>

                                {}
                                <div className={styles.serverCardFooter}>
                                    <div className={styles.footerButtonsContainer}>
                                        {}
                                        <div className={styles.viewTabsContainer}>
                                            {hasWarningOrCritical(srv.nom) && <FaExclamationCircle className={styles.problemIcon} />}
                                            <button onClick={() => {
                        if (!loadingCheckMK[srv.nom]) {
                          const newMode = 'manual';
                          setSyncMode(prev => ({
                            ...prev,
                            [srv.nom]: newMode
                          }));
                          const currentData = dataRef.current || {};
                          const updated = {
                            ...currentData,
                            [srv.nom]: {
                              ...(currentData[srv.nom] || {}),
                              syncMode: newMode
                            }
                          };
                          setData(updated);
                          dataRef.current = updated;
                        }
                      }} disabled={loadingCheckMK[srv.nom]} className={`${styles.viewTabButton} ${syncMode[srv.nom] === 'manual' || !syncMode[srv.nom] ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}>
                                                <IconifyIcon icon="material-symbols:dashboard-rounded" width={16} height={16} />
                                            </button>
                                            <button onClick={() => {
                        if (!loadingCheckMK[srv.nom]) {
                          const newMode = 'checkmk';
                          setSyncMode(prev => ({
                            ...prev,
                            [srv.nom]: newMode
                          }));
                          const currentData = dataRef.current || {};
                          const updated = {
                            ...currentData,
                            [srv.nom]: {
                              ...(currentData[srv.nom] || {}),
                              syncMode: newMode
                            }
                          };
                          setData(updated);
                          dataRef.current = updated;
                        }
                      }} disabled={loadingCheckMK[srv.nom]} className={`${styles.viewTabButton} ${syncMode[srv.nom] === 'checkmk' ? styles.viewTabButtonActive : styles.viewTabButtonInactive}`}>
                                                <IconifyIcon icon="material-symbols:query-stats-rounded" width={16} height={16} />
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {}
                                <textarea id={`comment-${srv.nom}`} className={styles.commentTextarea} value={data?.[srv.nom]?.comment || ""} onChange={e => updateComment(srv.nom, e.target.value)} onFocus={e => e.target.select()} placeholder="Comment..." rows="2" />
                                    </div>
                                </React.Fragment>;
          })}
                    </div>
                </div>;
    })}

            {}
            {hoveredTooltip && <div className={`${styles.tooltipContainer} ${hoveredTooltip.type === 'score' ? styles.tooltipScore : styles.tooltipOther}`} style={{
      left: `${hoveredTooltip.mouseX + 10}px`,
      top: `${hoveredTooltip.mouseY + 10}px`,
      maxWidth: hoveredTooltip.type === 'services' ? '500px' : hoveredTooltip.type === 'events' ? '600px' : hoveredTooltip.type === 'availability' ? '400px' : hoveredTooltip.type === 'score' ? '700px' : '400px'
    }}>
                    {hoveredTooltip.type === 'score' && <div>
                            <div className={styles.tooltipTitle}>
                                Calcul de la note
                            </div>
                            <div className={styles.tooltipGrid}>
                                {(hoveredTooltip.scoreBreakdown || []).map((item, idx) => <div key={`score-breakdown-${idx}`} className={styles.tooltipGridItem}>
                                        <div className={styles.tooltipGridItemContent}>
                                            <div className={styles.tooltipGridLabel}>
                                                {item.label}
                                            </div>
                                            <div className={styles.tooltipGridDescription}>
                                                {item.description}
                                            </div>
                                        </div>
                                        <div className={styles.tooltipGridWeight}>
                                            {item.weight}
                                        </div>
                                    </div>)}
                            </div>
                        </div>}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.serverName] && <div className={styles.tooltipSection}>
                            <div className={styles.tooltipSectionTitle}>
                                Availability
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
                                UP / DOWN / UNREACH time over the period.
                            </div>
                            {availabilityData[hoveredTooltip.serverName].up !== undefined && <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>UP:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueGreen}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].up || 0))} %
                                    </span>
                                </div>}
                            {availabilityData[hoveredTooltip.serverName].down !== undefined && <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>DOWN:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueRed}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].down || 0))} %
                                    </span>
                                </div>}
                            {availabilityData[hoveredTooltip.serverName].unreach !== undefined && <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>UNREACH:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueRedDark}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].unreach || 0))} %
                                    </span>
                                </div>}
                            {availabilityData[hoveredTooltip.serverName].flapping !== undefined && <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>Flapping:</span>
                                    <span className={`${styles.tooltipValue} ${styles.tooltipValueOrange}`}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].flapping || 0))} %
                                    </span>
                                </div>}
                            {availabilityData[hoveredTooltip.serverName].downtime !== undefined && <div className={styles.tooltipDowntimeRow}>
                                    <span className={styles.tooltipLabel}>Downtime:</span>
                                    <span className={styles.tooltipValue}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].downtime || 0))} %
                                    </span>
                                </div>}
                            {availabilityData[hoveredTooltip.serverName].n_a !== undefined && <div className={styles.tooltipAvailabilityRow}>
                                    <span className={styles.tooltipLabel}>N/A:</span>
                                    <span className={styles.tooltipValue}>
                                        {Math.round(parseFloat(availabilityData[hoveredTooltip.serverName].n_a || 0))} %
                                    </span>
                                </div>}
                        </div>}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.serverName] && <div className={styles.tooltipServicesContainer}>
                            <div className={styles.tooltipServicesTitle}>
                                Monitored services
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
                                Services monitored by Check MK for this equipment.
                            </div>
                            <div className={styles.tooltipServicesList}>
                                {(() => {
            const services = checkmkData[hoveredTooltip.serverName].serviceInfo?.services || checkmkData[hoveredTooltip.serverName].services || [];
            if (services.length === 0) {
              return <div className={styles.tooltipEmpty}>
                                                No service
                                            </div>;
            }
            const checkmkHostName = checkmkData[hoveredTooltip.serverName]?.checkmk_host_name;
            return services.map((service, idx) => {
              let serviceName = service.title || service.id || service.name || 'Service';
              if (checkmkHostName && serviceName.includes(checkmkHostName)) {
                serviceName = serviceName.replace(new RegExp(checkmkHostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
              }
              serviceName = serviceName.replace(/\s*on\s+host\s*[^\s]*/gi, '').replace(/\s+on\s+/gi, ' ').replace(/^on\s+/gi, '').replace(/\s+on$/gi, '').trim();
              return <div key={service.id || service.title || idx} className={styles.tooltipServiceItem}>
                                                {serviceName}
                                            </div>;
            });
          })()}
                            </div>
                        </div>}
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.serverName] && eventsData[hoveredTooltip.serverName].length > 0 && <div className={styles.tooltipSection}>
                            <div className={styles.tooltipSectionTitle}>
                                Events et notifications
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
                                {eventsCount[hoveredTooltip.serverName] || 0} event(s) over the period.
                            </div>
                            <div className={styles.tooltipEventsContainer}>
                                {eventsData[hoveredTooltip.serverName].map((event, idx) => {
            let eventTime, eventType, host, service, state, message;
            if (Array.isArray(event)) {
              eventTime = event[1];
              eventType = event[2];
              host = event[3];
              service = event[4];
              state = event[5];
              message = event[6];
            } else if (typeof event === 'object') {
              eventTime = event.log_time || event.time || event.timestamp;
              eventType = event.log_type || event.type;
              host = event.host || event.host_name;
              service = event.service_description || event.service;
              state = event.log_state_info || event.state;
              message = event.log_plugin_output || event.message || event.plugin_output;
            }
            let formattedDate = eventTime;
            if (eventTime && typeof eventTime === 'string') {
              try {
                const date = new Date(eventTime.replace(' ', 'T'));
                if (!isNaN(date.getTime())) {
                  formattedDate = date.toLocaleString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                }
              } catch (e) {}
            }
            let stateColor = 'var(--text-primary)';
            if (state) {
              const stateLower = state.toLowerCase();
              if (stateLower.includes('critical') || stateLower.includes('crit')) {
                stateColor = '#ef4444';
              } else if (stateLower.includes('warning') || stateLower.includes('warn')) {
                stateColor = '#f59e0b';
              } else if (stateLower.includes('down') || stateLower.includes('unreachable')) {
                stateColor = '#dc2626';
              }
            }
            return <div key={idx} className={styles.tooltipEventItem}>
                                            <div className={styles.tooltipEventHeader}>
                                                <div className={styles.tooltipEventDate}>
                                                    {formattedDate}
                                                </div>
                                                {state && <div style={{
                  color: stateColor,
                  fontWeight: '600',
                  fontSize: '0.7rem'
                }}>
                                                        {state}
                                                    </div>}
                                            </div>
                                            {eventType && <div className={styles.tooltipEventType}>
                                                    {eventType}
                                                </div>}
                                            {service && <div className={styles.tooltipEventService}>
                                                    {service}
                                                </div>}
                                            {message && <div className={styles.tooltipEventMessage}>
                                                    {message}
                                                </div>}
                                        </div>;
          })}
                            </div>
                        </div>}
                </div>}

            {}
            {hoveredLabelsTooltip && (() => {
      const server = serveurs?.find(s => s.nom === hoveredLabelsTooltip.serverName);
      if (!server) return null;
      const roles = Array.isArray(server.role) ? server.role : server.role ? [server.role] : [];
      const allLabels = [...roles, ...(server.vlan ? [`VLAN ${server.vlan}`] : [])];
      return <div className={styles.tooltipContainer} style={{
        left: `${hoveredLabelsTooltip.mouseX}px`,
        top: `${hoveredLabelsTooltip.mouseY}px`,
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap'
      }}>
                        <div className={styles.tooltipLabelsTitle}>
                            Tags
                        </div>
                        <div className={styles.tooltipLabelsContainer}>
                            {allLabels.map((label, idx) => <div key={idx} className={styles.tooltipLabelItem}>
                                    {label}
                                </div>)}
                        </div>
                    </div>;
    })()}

            {}
            {editingServer && editForm && <div className={styles.editModalOverlay}>
                <div className={`${styles.editModalContent} ${styles.editModalContentLarge}`} onClick={e => e.stopPropagation()}>
                    <div className={styles.editModalHeader}>
                        <h3 className={styles.editModalTitle}>
                            <IconifyIcon icon="material-symbols:edit" width={18} height={18} style={{
              color: '#6b7280'
            }} />
                            Edit server
                        </h3>
                        <button type="button" className={styles.editModalCloseButton} onClick={() => {
            setEditingServer(null);
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
                                        Server name *
                                        <input type="text" className={styles.editModalInput} value={editForm.nom} onChange={e => setEditForm(prev => ({
                  ...prev,
                  nom: e.target.value
                }))} placeholder="Ex: SRV-01" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        IP address
                                        <input type="text" className={styles.editModalInput} value={editForm.ip} onChange={e => setEditForm(prev => ({
                  ...prev,
                  ip: e.target.value
                }))} placeholder="Ex: 192.168.1.10" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Operating system
                                        <input type="text" className={styles.editModalInput} value={editForm.systeme} onChange={e => setEditForm(prev => ({
                  ...prev,
                  systeme: e.target.value
                }))} placeholder="Ex: Windows Server 2019" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Type
                                        <input type="text" className={styles.editModalInput} value={editForm.type === "physique" ? "Physique" : "Virtuel"} disabled style={{
                  backgroundColor: '#f3f4f6',
                  cursor: 'not-allowed',
                  color: '#6b7280'
                }} />
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
                }))} placeholder="Ex: 10" />
                                    </label>
                                </div>

                                {}
                                {editForm.type === "physique" && <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Brand
                                        <input type="text" className={styles.editModalInput} value={editForm.marque} onChange={e => setEditForm(prev => ({
                  ...prev,
                  marque: e.target.value
                }))} placeholder="Ex: Dell, HP" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Model
                                        <input type="text" className={styles.editModalInput} value={editForm.modele} onChange={e => setEditForm(prev => ({
                  ...prev,
                  modele: e.target.value
                }))} placeholder="Ex: PowerEdge R740" />
                                    </label>
                                </div>}

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Processeur
                                        <input type="text" className={styles.editModalInput} value={editForm.processeur} onChange={e => setEditForm(prev => ({
                  ...prev,
                  processeur: e.target.value
                }))} placeholder="Ex: Intel Xeon E5-2620" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Memory
                                        <input type="text" className={styles.editModalInput} value={editForm.memoire} onChange={e => setEditForm(prev => ({
                  ...prev,
                  memoire: e.target.value
                }))} placeholder="Ex: 32 Go" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Storage
                                        <input type="text" className={styles.editModalInput} value={editForm.stockage} onChange={e => setEditForm(prev => ({
                  ...prev,
                  stockage: e.target.value
                }))} placeholder="Ex: 500 Go" />
                                    </label>
                                    {editForm.type === "physique" && <label className={styles.editModalLabel}>
                                        Serial number
                                        <input type="text" className={styles.editModalInput} value={editForm.numeroSerie} onChange={e => setEditForm(prev => ({
                  ...prev,
                  numeroSerie: e.target.value
                }))} placeholder="Ex: ABC123456" />
                                    </label>}
                                </div>

                                {}
                                {editForm.type === "physique" && <label className={styles.editModalLabel}>
                                    Expiration garantie
                                    <input type="date" className={styles.editModalInput} value={editForm.expirationGarantie} onChange={e => setEditForm(prev => ({
                ...prev,
                expirationGarantie: e.target.value
              }))} />
                                </label>}

                                {}
                                <label className={styles.editModalLabel}>
                                    Roles
                                    <MultiSelectDropdown options={roleOptions} selectedValues={Array.isArray(editForm.role) ? editForm.role : editForm.role ? [editForm.role] : []} onChange={selected => {
                setEditForm(prev => ({
                  ...prev,
                  role: selected
                }));
              }} placeholder="Select roles" />
                                </label>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel} style={{
                flex: '1 1 100%'
              }}>
                                        Mapping CheckMK
                                        <button type="button" onClick={() => {
                  setCheckmkMappingModal({
                    isOpen: true,
                    serverId: editingServer.id
                  });
                }} style={{
                  width: '100%',
                  marginTop: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: '6px',
                  background: editingServer.id && getCheckMKMapping(editingServer.id) ? '#10b981' : '#ffffff',
                  color: editingServer.id && getCheckMKMapping(editingServer.id) ? 'white' : '#4b5563',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  const mapping = editingServer.id ? getCheckMKMapping(editingServer.id) : null;
                  if (!mapping) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }} onMouseLeave={e => {
                  const mapping = editingServer.id ? getCheckMKMapping(editingServer.id) : null;
                  if (!mapping) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--border-secondary)';
                  }
                }}>
                                            <FaLink size={14} />
                                            {(() => {
                    const mapping = editingServer.id ? getCheckMKMapping(editingServer.id) : null;
                    return mapping ? `Mapped: ${mapping.checkmk_host_name}` : 'Map with CheckMK';
                  })()}
                                        </button>
                                    </label>
                                </div>
                            </div>}
                    </div>

                    {!isSaving && <div className={styles.editModalFooter}>
                            <button type="button" className={styles.editModalSaveButton} onClick={handleSaveServer} disabled={isSaving}>
                                <IconifyIcon icon="material-symbols:save" width={16} height={16} />
                                Save
                            </button>
                        </div>}
                </div>
            </div>}

            {}
            {checkmkMappingModal.isOpen && checkmkMappingModal.serverId !== null && editingServer && <CheckMKMappingModal isOpen={checkmkMappingModal.isOpen} onClose={() => setCheckmkMappingModal({
      isOpen: false,
      serverId: null
    })} equipmentName={editingServer.nom} equipmentType="Servers" equipmentId={editingServer.id} equipmentIndex={editingServer.id} clientId={config?.client?.id} requireService={false} onMappingSaved={mapping => {
      if (mapping) {
        setCheckmkMappings(prev => ({
          ...prev,
          [editingServer.nom]: mapping
        }));
        setEditForm(prev => ({
          ...prev,
          checkmk_site: mapping.checkmk_site || null,
          checkmk_host_name: mapping.checkmk_host_name || ''
        }));
        toast.success("Mapping updated", toastOptions);
      } else {
        setCheckmkMappings(prev => {
          const newMappings = {
            ...prev
          };
          delete newMappings[editingServer.nom];
          return newMappings;
        });
        setEditForm(prev => ({
          ...prev,
          checkmk_site: null,
          checkmk_host_name: ''
        }));
        toast.success("Mapping deleted", toastOptions);
      }
    }} />}
        </div>;
};
export default Servers;
