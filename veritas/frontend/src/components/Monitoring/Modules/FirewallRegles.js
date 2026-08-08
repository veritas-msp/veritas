import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTheme } from "../../../hooks/useTheme";
import styles from "./FirewallRegles.module.css";
import { FaUpload, FaFileCsv, FaShieldAlt, FaNetworkWired, FaChevronDown, FaInfoCircle, FaShieldVirus, FaAws, FaExclamationTriangle, FaLock, FaKey } from "react-icons/fa";
import { SiGooglecloud, SiCloudflare, SiAkamai, SiFastly, SiOvh } from "react-icons/si";
import { VscAzure } from "react-icons/vsc";
import { Icon as IconifyIcon } from "@iconify/react";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, scoreToLabel, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
const vendorDefinitions = [{
  id: "microsoft",
  label: "Microsoft Azure / Office 365",
  icon: "azure",
  keywords: ["microsoft", "office", "o365", "azure", "windowsupdate", "sharepoint", "outlook", "microsoftpublicips", "office365", "microsoftteams", "msedge", "office.com", "office365.com"]
}, {
  id: "sfr",
  label: "SFR",
  icon: "sfr",
  keywords: ["sfr", "neufbox", "numericable"]
}, {
  id: "amazon",
  label: "Amazon Web Services",
  icon: "aws",
  keywords: ["aws", "amazon", "cloudfront", "s3", "amazonaws"]
}, {
  id: "google",
  label: "Google Cloud / Google Workspace",
  icon: "google",
  keywords: ["google", "gstatic", "googledrive", "googleapis", "googlepublicips", "gmail", "googlemeet", "googlevoice"]
}, {
  id: "cloudflare",
  label: "Cloudflare",
  icon: "cloudflare",
  keywords: ["cloudflare"]
}, {
  id: "akamai",
  label: "Akamai",
  icon: "akamai",
  keywords: ["akamai"]
}, {
  id: "fastly",
  label: "Fastly / LaunchDarkly",
  icon: "fastly",
  keywords: ["fastly", "launchdarkly"]
}, {
  id: "ovh",
  label: "OVHcloud",
  icon: "ovh",
  keywords: ["ovh", "ovhcloud"]
}];
const vendorIcons = {
  azure: VscAzure,
  aws: FaAws,
  google: SiGooglecloud,
  cloudflare: SiCloudflare,
  akamai: SiAkamai,
  fastly: SiFastly,
  ovh: SiOvh
};
const FirewallRegles = ({
  config,
  data,
  setData,
  onCSVImportReady
}) => {
  const {
    theme
  } = useTheme();
  const [rulesData, setRulesData] = useState(data?.rulesData || null);
  const [objectsData, setObjectsData] = useState(data?.objectsData || null);
  const [editingScore, setEditingScore] = useState(false);
  const [editingScoreValue, setEditingScoreValue] = useState('');
  const [objectLookup, setObjectLookup] = useState(data?.objectLookup || {});
  const [alarmsData, setAlarmsData] = useState(data?.alarmsData || null);
  const [webTrafficData, setWebTrafficData] = useState(data?.webTrafficData || null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [collapsedGroups, setCollapsedGroups] = useState({
    filter: {},
    nat: {}
  });
  const [collapsedObjectGroups, setCollapsedObjectGroups] = useState({});
  const [hoveredAlarmIndex, setHoveredAlarmIndex] = useState(null);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const fileInputRef = useRef(null);
  const onCSVImportReadyRef = useRef(onCSVImportReady);
  const topAlarmEntries = alarmsData?.entries ? alarmsData.entries.slice(0, 5) : [];
  const maxAlarmCount = topAlarmEntries.reduce((max, entry) => Math.max(max, entry.count || 0), 0);
  const totalAlarms = alarmsData?.total || alarmsData?.entries?.reduce((sum, entry) => sum + (entry.count || 0), 0) || 0;
  const topServiceEntries = webTrafficData?.entries ? webTrafficData.entries.slice(0, 5) : [];
  const maxServiceBytes = topServiceEntries.reduce((max, entry) => Math.max(max, entry.totalBytes || 0), 0);
  const totalTrafficBytes = webTrafficData?.entries?.reduce((sum, entry) => sum + (entry.totalBytes || 0), 0) || 0;
  const applyManualScore = scoreValue => {
    const updated = {
      ...data,
      manualHealthScore: scoreValue
    };
    setData(updated);
  };
  const handleManualLetterSelect = letter => {
    const scoreValue = letterToScore(letter);
    if (scoreValue === null) return;
    applyManualScore(scoreValue);
  };
  const startEditScore = currentScore => {
    setEditingScore(true);
    setEditingScoreValue(currentScore || '');
  };
  const saveEditScore = () => {
    if (editingScoreValue !== undefined && editingScoreValue !== null && editingScoreValue !== '') {
      const scoreValue = Math.max(0, Math.min(100, parseInt(editingScoreValue, 10) || 0));
      applyManualScore(scoreValue);
    }
    setEditingScore(false);
    setEditingScoreValue('');
  };
  const cancelEditScore = () => {
    setEditingScore(false);
    setEditingScoreValue('');
  };
  const handleInputFocus = e => {
    e.target.select();
  };
  const formatServiceName = name => {
    if (!name) return "Unknown service";
    const firstSegment = name.split(',')[0].trim();
    if (!firstSegment) return "Unknown service";
    return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
  };
  const getAlarmIcon = label => {
    if (!label) return FaExclamationTriangle;
    const lower = label.toLowerCase();
    if (lower.includes("password")) return FaKey;
    if (lower.includes("ssl") || lower.includes("tls")) return FaLock;
    if (lower.includes("icmp") || lower.includes("http") || lower.includes("protocol")) return FaShieldAlt;
    if (lower.includes("spoof") || lower.includes("ip")) return FaExclamationTriangle;
    return FaExclamationTriangle;
  };
  const alarmDescriptions = {
    "ip address spoofing": "Suspicious traffic using spoofed IP addresses to bypass network controls.",
    "ip address spoofing on bridge": "IP spoofing attempt detected on a bridge interface.",
    "invalid http protocol": "Malformed or non-compliant HTTP request, potentially malicious.",
    "invalid icmp message": "Invalid ICMP frame that may indicate reconnaissance or an attack.",
    "icmp echo payload modified": "ICMP Echo packet with modified payload · sign of interception.",
    "'link local' addresses (rfc 3330)": "Traffic from/to Link-Local IPs forbidden on this segment.",
    "ssl version mismatch": "SSL/TLS negotiation failed due to version mismatch.",
    "bad ldap protocol": "Non-compliant LDAP request that may indicate a scan or attack.",
    "misplaced tcp option": "TCP option out of context, potential sign of manipulation.",
    "admin password:": "System event related to the administrator password (change, attempt, etc.)."
  };
  const getAlarmDescription = label => {
    if (!label) return null;
    const normalizedLabel = label.toLowerCase().trim();
    if (alarmDescriptions[normalizedLabel]) {
      return alarmDescriptions[normalizedLabel];
    }
    for (const [key, desc] of Object.entries(alarmDescriptions)) {
      if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) {
        return desc;
      }
    }
    return null;
  };
  const securityScoreData = useMemo(() => {
    const breakdown = [];
    let earnedPoints = 0;
    let availablePoints = 0;
    const clampRatio = value => Math.max(0, Math.min(1, value));
    const registerCriterion = (applicable, weight, label, value, ratio, percentage = null) => {
      if (!applicable) return;
      availablePoints += weight;
      const normalizedRatio = clampRatio(ratio);
      earnedPoints += normalizedRatio * weight;
      const displayPercentage = percentage !== null ? percentage : Math.round(normalizedRatio * 100);
      breakdown.push({
        label,
        value,
        percentage: displayPercentage,
        ratio: normalizedRatio,
        weight
      });
    };
    const allFilterRules = rulesData?.filterRules?.flatMap(group => group.rules) || [];
    const totalFilterRules = allFilterRules.length;
    if (totalFilterRules > 0) {
      const activeCount = allFilterRules.filter(rule => (rule.state || '').toLowerCase() === 'on').length;
      const activeRatio = totalFilterRules > 0 ? activeCount / totalFilterRules : 0;
      registerCriterion(true, 25, "Active rules", `${Math.round(activeRatio * 100)}% actives`, activeRatio, Math.round(activeRatio * 100));
      const denyKeywords = ['deny', 'drop', 'block', 'reject', 'forbid', 'interdit'];
      const allowKeywords = ['allow', 'pass', 'accept', 'permit'];
      const denyCount = allFilterRules.filter(rule => {
        const action = (rule.action || '').toLowerCase();
        if (!action) return false;
        if (denyKeywords.some(keyword => action.includes(keyword))) return true;
        if (allowKeywords.some(keyword => action.includes(keyword))) return false;
        return false;
      }).length;
      const allowCount = allFilterRules.filter(rule => {
        const action = (rule.action || '').toLowerCase();
        if (!action) return false;
        return allowKeywords.some(keyword => action.includes(keyword));
      }).length;
      const denyRatio = totalFilterRules > 0 ? denyCount / totalFilterRules : 0;
      const hasBothPolicies = denyCount > 0 && allowCount > 0;
      const policyScore = denyRatio * 0.8 + (hasBothPolicies ? 0.2 : 0);
      registerCriterion(true, 20, "Restrictive policy", `${Math.round(denyRatio * 100)}% blocking rules`, Math.min(1, policyScore), Math.round(Math.min(1, policyScore) * 100));
      const inspectedCount = allFilterRules.filter(rule => {
        const inspection = (rule.inspection || '').toLowerCase();
        return inspection && inspection !== 'none' && inspection !== 'off';
      }).length;
      const inspectionRatio = totalFilterRules > 0 ? inspectedCount / totalFilterRules : 0;
      registerCriterion(true, 15, "Advanced inspection", `${Math.round(inspectionRatio * 100)}% of rules inspected`, inspectionRatio, Math.round(inspectionRatio * 100));
    }
    if (totalAlarms > 0) {
      const minThreshold = 10;
      const optimalThreshold = 100;
      let alarmRatio = 1;
      if (totalAlarms < minThreshold) {
        alarmRatio = totalAlarms / minThreshold * 0.5;
      } else if (totalAlarms >= optimalThreshold) {
        alarmRatio = 1;
      } else {
        const range = optimalThreshold - minThreshold;
        alarmRatio = 0.5 + (totalAlarms - minThreshold) / range * 0.5;
      }
      registerCriterion(true, 20, "Threat detection", `${totalAlarms.toLocaleString()} threats detected`, alarmRatio, Math.round(alarmRatio * 100));
    }
    if (objectsData?.total) {
      const objectRatio = clampRatio(objectsData.total / 25);
      registerCriterion(true, 10, "Object coverage", `${objectsData.total.toLocaleString()} objets`, objectRatio, Math.round(objectRatio * 100));
    }
    if (totalTrafficBytes > 0) {
      const trustedTrafficBytes = (webTrafficData?.entries || []).filter(entry => entry.icon).reduce((sum, entry) => sum + (entry.totalBytes || 0), 0);
      const trustedRatio = totalTrafficBytes > 0 ? trustedTrafficBytes / totalTrafficBytes : 0;
      registerCriterion(true, 10, "Identified traffic", `${Math.round(trustedRatio * 100)}% to known services`, trustedRatio, Math.round(trustedRatio * 100));
    }
    if (availablePoints === 0) {
      return null;
    }
    const rawScore = earnedPoints / availablePoints * 100;
    const score = Math.round(rawScore);
    const letter = scoreToLetter(score);
    const scoreColor = scoreToColor(score);
    const scoreLabel = scoreToLabel(score);
    return {
      score,
      color: scoreColor,
      label: scoreLabel,
      letter,
      breakdown
    };
  }, [rulesData, totalAlarms, objectsData, totalTrafficBytes, webTrafficData]);
  const updateData = useCallback(newData => {
    const updated = {
      ...data,
      ...newData
    };
    setData(updated);
  }, [data, setData]);
  const parseCSV = text => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return {
      headers: [],
      rows: []
    };
    const parseLine = line => {
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentValue += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      return values;
    };
    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          let value = values[index] || '';
          value = value.replace(/^"|"$/g, '');
          row[header] = value;
        });
        rows.push(row);
      }
    }
    return {
      headers,
      rows
    };
  };
  const analyzeRules = rows => {
    const filterGroups = [];
    const natGroups = [];
    let currentFilterSeparator = null;
    let currentNatSeparator = null;
    let currentFilterGroup = null;
    let currentNatGroup = null;
    let groupIndex = 0;
    rows.forEach((row, index) => {
      const typeSlot = row['#type_slot'] || '';
      const separatorColor = row['#separator_color'] || '';
      const separatorNbElements = row['#separator_nb_elements'] || '';
      const comment = row['#comment'] || '';
      const ruleName = row['#rule_name'] || '';
      if (separatorColor && separatorNbElements && !ruleName) {
        if (currentFilterGroup && currentFilterGroup.rules.length > 0) {
          filterGroups.push(currentFilterGroup);
        }
        if (currentNatGroup && currentNatGroup.rules.length > 0) {
          natGroups.push(currentNatGroup);
        }
        const separator = {
          color: separatorColor,
          nbElements: separatorNbElements,
          name: comment || 'Unnamed',
          index: groupIndex++
        };
        currentFilterSeparator = separator;
        currentNatSeparator = separator;
        currentFilterGroup = {
          separator: separator,
          rules: []
        };
        currentNatGroup = {
          separator: separator,
          rules: []
        };
      }
      if (typeSlot === 'local_filter_slot' && ruleName) {
        const rule = {
          index: index + 1,
          ruleName: ruleName,
          comment: row['#comment'] || '',
          state: row['#state'] || '',
          action: row['#action'] || '',
          service: row['#service'] || '',
          fromSrc: row['#from_src'] || '',
          toDest: row['#to_dest'] || '',
          toPort: row['#to_port'] || '',
          proto: row['#proto'] || '',
          inspection: row['#inspection'] || '',
          logLevel: row['#log_level'] || '',
          schedule: row['#schedule'] || '',
          route: row['#route'] || '',
          via: row['#via'] || '',
          raw: row
        };
        if (currentFilterGroup) {
          currentFilterGroup.rules.push(rule);
        } else {
          const defaultSeparator = {
            name: 'No group',
            color: '',
            nbElements: '',
            index: groupIndex++
          };
          currentFilterGroup = {
            separator: defaultSeparator,
            rules: [rule]
          };
        }
      }
      if (typeSlot === 'local_nat_slot' && ruleName) {
        const rule = {
          index: index + 1,
          ruleName: ruleName,
          comment: row['#comment'] || '',
          state: row['#state'] || '',
          fromSrc: row['#from_src'] || '',
          toDest: row['#to_dest'] || '',
          natFromTarget: row['#nat_from_target'] || '',
          natToTarget: row['#nat_to_target'] || '',
          natFromPort: row['#nat_from_port'] || '',
          natToPort: row['#nat_to_port'] || '',
          raw: row
        };
        if (currentNatGroup) {
          currentNatGroup.rules.push(rule);
        } else {
          const defaultSeparator = {
            name: 'No group',
            color: '',
            nbElements: '',
            index: groupIndex++
          };
          currentNatGroup = {
            separator: defaultSeparator,
            rules: [rule]
          };
        }
      }
    });
    if (currentFilterGroup && currentFilterGroup.rules.length > 0) {
      filterGroups.push(currentFilterGroup);
    }
    if (currentNatGroup && currentNatGroup.rules.length > 0) {
      natGroups.push(currentNatGroup);
    }
    return {
      filterRules: filterGroups,
      natRules: natGroups,
      totalFilterRules: filterGroups.reduce((sum, g) => sum + g.rules.length, 0),
      totalNatRules: natGroups.reduce((sum, g) => sum + g.rules.length, 0)
    };
  };
  const analyzeObjects = rows => {
    const grouped = {};
    const list = [];
    const lookup = {};
    const columnsByType = {};
    rows.forEach((row, index) => {
      let type = (row['#type'] || 'unknown').toLowerCase();
      if (type === 'router_gw') {
        type = 'router';
      }
      const name = row['#name'] || `Objet ${index + 1}`;
      const common = {
        type,
        name,
        comment: row['#comment'] || '',
        raw: row,
        usage: row['#usage'] || row['#utilisation'] || ''
      };
      const rowColumns = Object.keys(row).filter(key => key && key.toLowerCase() !== '#type');
      if (!columnsByType[type]) {
        columnsByType[type] = [];
      }
      rowColumns.forEach(col => {
        if (!columnsByType[type].includes(col)) {
          columnsByType[type].push(col);
        }
      });
      let details = {};
      const pushObject = () => {
        const object = {
          ...common,
          ...details
        };
        list.push(object);
        lookup[name] = object;
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(object);
      };
      switch (type) {
        case 'host':
          details = {
            ipv4: row['#ip'] || '',
            ipv6: row['#ipv6'] || '',
            mac: row['#mac'] || '',
            resolve: row['#resolve'] || ''
          };
          pushObject();
          break;
        case 'network':
          details = {
            ipv4: row['#ip'] || '',
            mask: row['#mask'] || '',
            prefix: row['#prefixlen'] || row['#prefixlenv6'] || ''
          };
          pushObject();
          break;
        case 'range':
          details = {
            begin: row['#begin'] || '',
            end: row['#end'] || '',
            beginMac: row['#beginmac'] || '',
            endMac: row['#endmac'] || ''
          };
          pushObject();
          break;
        case 'router':
          details = {
            gateway: row['#gwname'] || '',
            routerName: row['#routername'] || '',
            protocol: row['#proto'] || '',
            target: row['#target'] || row['#comment'] || ''
          };
          pushObject();
          break;
        default:
          details = {};
          pushObject();
          break;
      }
    });
    return {
      list,
      grouped,
      lookup,
      total: list.length,
      columnsByType
    };
  };
  const analyzeAlarms = rows => {
    const entries = rows.filter(row => (row.line_type || row['line_type']) === 'data').map(row => {
      const rawLabel = row.value || row['value'] || row.value_type || '';
      let cleanedLabel = rawLabel.replace(/\s*\(profile=\d+\s+class=\w+\s+id=\d+\)\s*/gi, '').replace(/\s*\(profile=\d+\s+class=\w+\)\s*/gi, '').replace(/\s*\(.*?\)\s*/g, '').trim();
      return {
        label: cleanedLabel,
        rawLabel,
        count: Number(row.count || row['count'] || 0),
        position: Number(row.position || row['position'] || 0)
      };
    }).sort((a, b) => b.count - a.count);
    return {
      entries,
      total: entries.reduce((sum, e) => sum + e.count, 0)
    };
  };
  const detectVendorInfo = row => {
    const haystack = [row.dstname, row['dstname'], row.dstportname, row['dstportname'], row.arg, row['arg'], row.msg, row['msg'], row.dstiprep, row['dstiprep'], row.serverappid, row['serverappid'], row.clientappid, row['clientappid']].join(' ').toLowerCase();
    const vendor = vendorDefinitions.find(def => def.keywords.some(keyword => haystack.includes(keyword)));
    if (vendor) {
      return vendor;
    }
    const fallbackLabel = (row.dstiprep || row['dstiprep'] || row.dstname || row['dstname'] || row.dstportname || row['dstportname'] || 'Other').toString();
    return {
      id: fallbackLabel.toLowerCase(),
      label: fallbackLabel,
      icon: null
    };
  };
  const analyzeWebTraffic = rows => {
    const serviceMap = {};
    rows.forEach(row => {
      const vendor = detectVendorInfo(row);
      const bytesIn = Number(row.rcvd || row['rcvd'] || 0);
      const bytesOut = Number(row.sent || row['sent'] || 0);
      const totalBytes = bytesIn + bytesOut;
      const rawServiceName = (row.dstiprep || row['dstiprep'] || row.dstname || row['dstname'] || vendor.label || 'Unknown service').toString();
      const serviceName = formatServiceName(rawServiceName);
      const key = serviceName.toLowerCase();
      if (!serviceMap[key]) {
        serviceMap[key] = {
          service: serviceName,
          icon: vendor?.icon || null,
          totalBytes: 0
        };
      }
      serviceMap[key].totalBytes += totalBytes;
      if (!serviceMap[key].icon && vendor?.icon) {
        serviceMap[key].icon = vendor.icon;
      }
    });
    const entries = Object.values(serviceMap).sort((a, b) => b.totalBytes - a.totalBytes).slice(0, 5);
    return {
      entries,
      sampleNote: "24h statistics from a random day in the monitored period."
    };
  };
  const handleFileUpload = useCallback(async file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const {
          headers,
          rows
        } = parseCSV(text);
        if (!rows || rows.length === 0) {
          toast.error("The CSV file is empty or invalid");
          return;
        }
        const normalizedHeaders = headers.map(h => h.toLowerCase());
        if (normalizedHeaders.includes('#type_slot')) {
          const analyzed = analyzeRules(rows);
          setRulesData(analyzed);
          updateData({
            rulesData: analyzed
          });
          setActiveView('filtrage');
          toast.success(`✅ ${analyzed.totalFilterRules} filtering rules and ${analyzed.totalNatRules} NAT rules imported`);
        } else if (normalizedHeaders.includes('#type') && normalizedHeaders.includes('#name')) {
          const analyzedObjects = analyzeObjects(rows);
          setObjectsData(analyzedObjects);
          setObjectLookup(analyzedObjects.lookup);
          updateData({
            objectsData: analyzedObjects,
            objectLookup: analyzedObjects.lookup
          });
          setActiveView('objets');
          toast.success(`✅ ${analyzedObjects.total} objects imported`);
        } else if (normalizedHeaders.includes('line_type') && normalizedHeaders.includes('value')) {
          const alarmStats = analyzeAlarms(rows);
          setAlarmsData(alarmStats);
          updateData({
            alarmsData: alarmStats
          });
          setActiveView('dashboard');
          toast.success(`✅ ${alarmStats.entries.length} alarm entries imported`);
        } else if (normalizedHeaders.includes('dstname') && normalizedHeaders.includes('dstportname')) {
          const trafficStats = analyzeWebTraffic(rows);
          setWebTrafficData(trafficStats);
          updateData({
            webTrafficData: trafficStats
          });
          setActiveView('dashboard');
          toast.success("✅ Web traffic statistics imported");
        } else {
          toast.error("Unrecognized CSV file type");
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Error importing CSV file");
      }
    };
    reader.readAsText(file, 'UTF-8');
  }, [updateData]);
  const handleDrop = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);
  const handleDragOver = useCallback(e => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleFileSelect = useCallback(e => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);
  useEffect(() => {
    onCSVImportReadyRef.current = onCSVImportReady;
    if (onCSVImportReady && fileInputRef.current) {
      const triggerCSVImport = () => {
        fileInputRef.current?.click();
      };
      onCSVImportReady({
        triggerCSVImport
      });
    }
  }, []);
  const getSeparatorColorStyle = colorHex => {
    if (!colorHex || colorHex.length < 6) return {};
    const r = parseInt(colorHex.substring(0, 2), 16);
    const g = parseInt(colorHex.substring(2, 4), 16);
    const b = parseInt(colorHex.substring(4, 6), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
      borderLeft: `4px solid rgb(${r}, ${g}, ${b})`
    };
  };
  const parseMultipleValues = value => {
    if (!value || value === '-' || value === 'any') return [];
    return value.split(/[,;]/).map(v => v.trim()).filter(v => v && v !== '-' && v !== 'any');
  };
  const getObjectTooltip = value => {
    if (!value || !objectLookup || !objectLookup[value]) return '';
    const obj = objectLookup[value];
    const parts = [obj.type];
    if (obj.ipv4) parts.push(`IPv4: ${obj.ipv4}`);
    if (obj.ipv6) parts.push(`IPv6: ${obj.ipv6}`);
    if (obj.mask) parts.push(`Masque: ${obj.mask}`);
    if (obj.prefix) parts.push(`Prefix: ${obj.prefix}`);
    if (obj.begin && obj.end) parts.push(`Plage: ${obj.begin} - ${obj.end}`);
    if (obj.protocol) parts.push(`Proto: ${obj.protocol}`);
    if (obj.port) parts.push(`Port: ${obj.port}${obj.toPort ? `-${obj.toPort}` : ''}`);
    if (obj.comment) parts.push(obj.comment);
    return parts.filter(Boolean).join(' • ');
  };
  const MultiValueList = ({
    values,
    icon,
    emptyText = '-'
  }) => {
    if (!values || values.length === 0) {
      return <span>{emptyText}</span>;
    }
    if (values.length === 1) {
      return <div className={styles.singleValueCell} title={getObjectTooltip(values[0]) || undefined}>
                    {icon && <span className={styles.valueIcon}>{icon}</span>}
                    <span>{values[0]}</span>
            </div>;
    }
    return <div className={styles.multiValueList}>
                {values.map((val, idx) => <div key={idx} className={styles.multiValueItem}>
                        {icon && <span className={styles.valueIcon}>{icon}</span>}
                        <span title={getObjectTooltip(val) || undefined}>{val}</span>
                    </div>)}
            </div>;
  };
  useEffect(() => {
    if (!rulesData) {
      setCollapsedGroups({
        filter: {},
        nat: {}
      });
      return;
    }
    const buildMap = (groups, prefix) => {
      if (!groups) return {};
      const map = {};
      groups.forEach((group, index) => {
        const id = group.separator?.index ?? `${prefix}-${index}`;
        map[id] = true;
      });
      return map;
    };
    setCollapsedGroups({
      filter: buildMap(rulesData.filterRules, 'filter'),
      nat: buildMap(rulesData.natRules, 'nat')
    });
  }, [rulesData]);
  useEffect(() => {
    if (!objectsData || !objectsData.grouped) {
      setCollapsedObjectGroups({});
      return;
    }
    const collapsed = {};
    Object.keys(objectsData.grouped).forEach(type => {
      collapsed[type] = true;
    });
    setCollapsedObjectGroups(collapsed);
  }, [objectsData]);
  const toggleGroupCollapse = useCallback((type, groupId) => {
    setCollapsedGroups(prev => {
      const currentTypeState = prev[type] || {};
      const updatedTypeState = {
        ...currentTypeState,
        [groupId]: !currentTypeState[groupId]
      };
      return {
        ...prev,
        [type]: updatedTypeState
      };
    });
  }, []);
  const toggleObjectGroup = useCallback(type => {
    setCollapsedObjectGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  }, []);
  const importTooltipLines = ['CSV to retrieve from:', '• CONFIGURATION > SECURITY POLICY > FILTERING and NAT > EXPORT', '• CONFIGURATION > OBJECTS > NETWORK > EXPORT', '• MONITORING > SECURITY > ALARMS > EXPORT (last 30 days)', '• MONITORING > NETWORK TRAFFIC > ACTION > EXPORT'];
  const formatTypeLabel = type => {
    if (!type) return 'Others';
    switch (type.toLowerCase()) {
      case 'host':
        return 'Machines';
      case 'network':
        return 'Networks';
      case 'range':
        return 'Plages d\'adresses';
      case 'service':
        return 'Services';
      case 'servicegroup':
        return 'Groupes de ports';
      case 'group':
        return 'Groupes';
      case 'router':
        return 'Routeurs';
      case 'protocol':
        return 'Protocoles';
      case 'time':
        return 'Objets temps';
      case 'fqdn':
        return 'DNS names (FQDN)';
      default:
        return type;
    }
  };
  const formatObjectValue = obj => {
    if (!obj) return '-';
    if (obj.ipv4 && obj.mask) return `${obj.ipv4} / ${obj.mask}`;
    if (obj.ipv4 && obj.prefix) return `${obj.ipv4}/${obj.prefix}`;
    if (obj.ipv4) return obj.ipv4;
    if (obj.begin && obj.end) {
      const ipRange = `${obj.begin} → ${obj.end}`;
      if (obj.beginMac && obj.endMac) {
        return `${ipRange} (MAC: ${obj.beginMac} → ${obj.endMac})`;
      }
      return ipRange;
    }
    if (obj.beginMac && obj.endMac) return `MAC: ${obj.beginMac} → ${obj.endMac}`;
    if (obj.type === 'router') {
      const parts = [];
      if (obj.gateway) parts.push(`GW: ${obj.gateway}`);
      if (obj.routerName) parts.push(`Routeur: ${obj.routerName}`);
      if (obj.target) parts.push(`Cible: ${obj.target}`);
      return parts.join(' • ') || 'Route';
    }
    if (obj.protocol || obj.port) {
      return `${obj.protocol || ''} ${obj.port || ''}${obj.toPort ? '→' + obj.toPort : ''}`.trim();
    }
    if (obj.ipv6) return obj.ipv6;
    if (obj.comment) return obj.comment;
    return '-';
  };
  return <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
            {}
            {}
            <div className={styles.firewallCard}>
                {}
                <div>
                    {}
                    <div className={styles.cardHeader} style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'nowrap',
          paddingBottom: '1rem'
        }}>
                        <div className={styles.headerLeft} style={{
            zIndex: 1
          }}>
                            <div className={styles.firewallInfo}>
                                <h3 className={styles.firewallName}>
                                    <IconifyIcon icon="mdi:security" style={{
                  fontSize: '1.5rem',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginRight: '0.5rem'
                }} />
                                    <span style={{
                  transform: 'translateY(4px)',
                  display: 'inline-block'
                }}>
                                        Firewall security analysis
                                    </span>
                                </h3>
                                {config?.client?.nom && <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginTop: '0.25rem'
              }}>
                                        {config.client.nom}
                                    </p>}
                            </div>
                        </div>
                        <div className={styles.firewallType} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 1
          }}>
                            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{
              display: 'none'
            }} />
                            
                            {}
                            <button type="button" onClick={() => fileInputRef.current?.click()} title="Import a CSV file" style={{
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
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }} onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }} onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-secondary)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}>
                                <FaUpload style={{
                width: '14px',
                height: '14px'
              }} />
                            </button>

                            

                            {}
                            <button type="button" onClick={() => setShowExportModal(true)} title="How to export the data?" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.35rem',
              background: 'var(--bg-primary)',
              color: '#10b981',
              border: '2px solid #10b981',
              borderRadius: '8px',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }} onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#059669';
              e.currentTarget.style.color = '#059669';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }} onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.color = '#10b981';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}>
                                <FaInfoCircle style={{
                width: '14px',
                height: '14px'
              }} />
                            </button>
                        </div>
                    </div>

                    {}
                    <div style={{
          position: 'absolute',
          left: '50%',
          top: '45px',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 2
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: theme === 'dark' ? '#2d2d4f' : '#f3f4f6',
            padding: '0.5rem',
            borderRadius: '8px',
            border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
            pointerEvents: 'auto'
          }}>
                            <button onClick={() => setActiveView('dashboard')} title="Dashboard" style={{
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              minWidth: '70px',
              width: '70px',
              color: activeView === 'dashboard' || !activeView ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
              background: activeView === 'dashboard' || !activeView ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'dashboard' || !activeView ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              pointerEvents: 'auto'
            }}>
                                <IconifyIcon icon="material-symbols:dashboard-rounded" width={20} height={20} style={{
                pointerEvents: 'none'
              }} />
                                <span style={{
                fontSize: '0.65rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}>
                                    Dashboard
                                </span>
                            </button>
                            <button onClick={() => setActiveView('filtrage')} title="Filtering" style={{
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              minWidth: '70px',
              width: '70px',
              color: activeView === 'filtrage' ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
              background: activeView === 'filtrage' ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'filtrage' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              pointerEvents: 'auto'
            }}>
                                <IconifyIcon icon="mdi:filter-cog" width={20} height={20} style={{
                pointerEvents: 'none'
              }} />
                                <span style={{
                fontSize: '0.65rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}>
                                    Filtering
                                </span>
                            </button>
                            <button onClick={() => setActiveView('nat')} title="NAT" style={{
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              minWidth: '70px',
              width: '70px',
              color: activeView === 'nat' ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
              background: activeView === 'nat' ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'nat' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              pointerEvents: 'auto'
            }}>
                                <IconifyIcon icon="mdi:router-network" width={20} height={20} style={{
                pointerEvents: 'none'
              }} />
                                <span style={{
                fontSize: '0.65rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}>
                                    NAT
                                </span>
                            </button>
                            <button onClick={() => setActiveView('objets')} title="Objets" style={{
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              minWidth: '70px',
              width: '70px',
              color: activeView === 'objets' ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
              background: activeView === 'objets' ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'objets' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              pointerEvents: 'auto'
            }}>
                                <IconifyIcon icon="material-symbols:category-rounded" width={20} height={20} style={{
                pointerEvents: 'none'
              }} />
                                <span style={{
                fontSize: '0.65rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}>
                                    Objets
                                </span>
                            </button>
                        </div>
                    </div>

                    {}
                    <div style={{
          marginTop: '3rem'
        }}>
                    {}
                    {activeView === 'filtrage' && <div>
                            {rulesData && rulesData.filterRules ? <div className={styles.rulesTableContainer}>
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.rulesTableCompact}>
                                    <thead>
                                        <tr>
                                                    <th className={styles.colNumber}>#</th>
                                                    <th className={styles.colStatus}>Status</th>
                                                    <th className={styles.colAction}>Action</th>
                                                    <th className={styles.colSource}>Source</th>
                                                    <th className={styles.colDest}>Destination</th>
                                                    <th className={styles.colService}>Service/Port</th>
                                                    <th className={styles.colInspection}>Inspection</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                                {rulesData.filterRules.map((group, groupIndex) => {
                      const firstRuleIndex = group.rules.length > 0 ? group.rules[0].index : 0;
                      const lastRuleIndex = group.rules.length > 0 ? group.rules[group.rules.length - 1].index : 0;
                      const groupId = group.separator?.index ?? `filter-${groupIndex}`;
                      const isCollapsed = collapsedGroups.filter?.[groupId];
                      return <React.Fragment key={`filter-group-${groupIndex}`}>
                                                            <tr className={styles.groupRow} style={getSeparatorColorStyle(group.separator.color)} onClick={() => toggleGroupCollapse('filter', groupId)}>
                                                                <td colSpan={7}>
                                                                    <div className={styles.groupRowContent}>
                                                                        <span className={`${styles.groupCaret} ${isCollapsed ? styles.groupCollapsed : ''}`}>
                                                                            <FaChevronDown />
                                                                        </span>
                                                                        <div className={styles.groupRowDetails}>
                                                                            <span className={styles.groupRowTitle}>{group.separator.name}</span>
                                                                            <span className={styles.groupRowMeta}>
                                                                                {group.rules.length} rule{group.rules.length !== 1 ? 's' : ''} · #{firstRuleIndex} to #{lastRuleIndex}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {!isCollapsed && group.rules.map((rule, ruleIndex) => <tr key={`filter-rule-${groupIndex}-${ruleIndex}`} className={styles.ruleRow}>
                                                                        <td className={styles.colNumber}>{rule.index}</td>
                                                                        <td className={styles.colStatus}>
                                                                            <div className={styles.statusCell}>
                                                                                <span className={`${styles.statusToggle} ${rule.state && rule.state.toLowerCase() === 'on' ? styles.statusOn : styles.statusOff}`}>
                                                                                    {rule.state && rule.state.toLowerCase() === 'on' ? 'on' : 'off'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className={styles.colAction}>
                                                                            <div className={styles.actionCell}>
                                                                                <span className={`${styles.actionIcon} ${rule.action && (rule.action.toLowerCase().includes('pass') || rule.action.toLowerCase().includes('allow')) ? styles.actionPass : styles.actionBlock}`}>
                                                                                    {rule.action && (rule.action.toLowerCase().includes('pass') || rule.action.toLowerCase().includes('allow')) ? '→' : '✕'}
                                                                                </span>
                                                                                <span className={styles.actionText}>
                                                                                    {rule.action === 'pass' ? 'passer' : rule.action || '-'}
                                                                                </span>
                                                                                {rule.route && <div className={styles.routeInfo}>
                                                                                        Route: {rule.route}
                                                                                        {rule.via && ` via ${rule.via}`}
                                                                                    </div>}
                                                                            </div>
                                                    </td>
                                                                        <td className={styles.colSource}>
                                                                            <MultiValueList values={parseMultipleValues(rule.fromSrc)} icon="▦" emptyText="any" />
                                                                        </td>
                                                                        <td className={styles.colDest}>
                                                                            <MultiValueList values={parseMultipleValues(rule.toDest)} icon="▦" emptyText="any" />
                                                                        </td>
                                                                        <td className={styles.colService}>
                                                                            <MultiValueList values={parseMultipleValues(rule.service || rule.toPort || rule.proto)} icon="⚙" emptyText="any" />
                                                                        </td>
                                                                        <td className={styles.colInspection}>
                                                                            <span className={styles.inspectionBadge}>
                                                                                {rule.inspection ? rule.inspection.toUpperCase() : '-'}
                                                                            </span>
                                                                </td>
                                                </tr>)}
                                                        </React.Fragment>;
                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div> : <div className={styles.emptyState}>
                                    <FaFileCsv className={styles.emptyIcon} />
                                    <p>No filtering rule imported</p>
                                    <p className={styles.emptyHint}>
                                        Import a CSV file to see filtering rules
                                    </p>
                </div>}
                </div>}

                    {}
                    {activeView === 'nat' && <div>
                            {rulesData && rulesData.natRules ? <div className={styles.rulesTableContainer}>
                                <div className={styles.tableWrapper}>
                                        <table className={styles.rulesTableCompact}>
                                        <thead>
                                            <tr>
                                                    <th className={styles.colNumber}>#</th>
                                                    <th className={styles.colStatus}>Status</th>
                                                    <th className={styles.colSource}>Source</th>
                                                    <th className={styles.colDest}>Destination</th>
                                                    <th className={styles.colNat}>NAT Source</th>
                                                    <th className={styles.colNat}>NAT Dest</th>
                                                    <th className={styles.colService}>Ports</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                                {rulesData.natRules.map((group, groupIndex) => {
                      const firstRuleIndex = group.rules.length > 0 ? group.rules[0].index : 0;
                      const lastRuleIndex = group.rules.length > 0 ? group.rules[group.rules.length - 1].index : 0;
                      const groupId = group.separator?.index ?? `nat-${groupIndex}`;
                      const isCollapsed = collapsedGroups.nat?.[groupId];
                      return <React.Fragment key={`nat-group-${groupIndex}`}>
                                                            <tr className={styles.groupRow} style={getSeparatorColorStyle(group.separator.color)} onClick={() => toggleGroupCollapse('nat', groupId)}>
                                                                <td colSpan={7}>
                                                                    <div className={styles.groupRowContent}>
                                                                        <span className={`${styles.groupCaret} ${isCollapsed ? styles.groupCollapsed : ''}`}>
                                                                            <FaChevronDown />
                                                        </span>
                                                                        <div className={styles.groupRowDetails}>
                                                                            <span className={styles.groupRowTitle}>{group.separator.name}</span>
                                                                            <span className={styles.groupRowMeta}>
                                                                                {group.rules.length} rule{group.rules.length !== 1 ? 's' : ''} · #{firstRuleIndex} to #{lastRuleIndex}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                    </td>
                                                            </tr>
                                                            {!isCollapsed && group.rules.map((rule, ruleIndex) => <tr key={`nat-rule-${groupIndex}-${ruleIndex}`} className={styles.ruleRow}>
                                                                        <td className={styles.colNumber}>{rule.index}</td>
                                                                        <td className={styles.colStatus}>
                                                                            <div className={styles.statusCell}>
                                                                                <span className={`${styles.statusToggle} ${rule.state && rule.state.toLowerCase() === 'on' ? styles.statusOn : styles.statusOff}`}>
                                                                                    {rule.state && rule.state.toLowerCase() === 'on' ? 'on' : 'off'}
                                                        </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className={styles.colSource}>
                                                                            <MultiValueList values={parseMultipleValues(rule.fromSrc)} icon="▦" emptyText="any" />
                                                                        </td>
                                                                        <td className={styles.colDest}>
                                                                            <MultiValueList values={parseMultipleValues(rule.toDest)} icon="▦" emptyText="any" />
                                                                        </td>
                                                                        <td className={styles.colNat}>
                                                                            <MultiValueList values={parseMultipleValues(rule.natFromTarget)} emptyText="-" />
                                                                        </td>
                                                                        <td className={styles.colNat}>
                                                                            <MultiValueList values={parseMultipleValues(rule.natToTarget)} emptyText="-" />
                                                                        </td>
                                                                        <td className={styles.colService}>
                                                                            {rule.natFromPort && rule.natToPort ? <div className={styles.natPorts}>
                                                                                    <MultiValueList values={parseMultipleValues(rule.natFromPort)} emptyText="-" />
                                                                                    <span className={styles.arrow}>→</span>
                                                                                    <MultiValueList values={parseMultipleValues(rule.natToPort)} emptyText="-" />
                                                                                </div> : <span>-</span>}
                                                    </td>
                                                </tr>)}
                                                        </React.Fragment>;
                    })}
                                        </tbody>
                                    </table>
                                </div>
                            </div> : <div className={styles.emptyState}>
                                    <FaFileCsv className={styles.emptyIcon} />
                                    <p>No NAT rule imported</p>
                                    <p className={styles.emptyHint}>
                                        Import a CSV file to see NAT rules
                                    </p>
                    </div>}
                </div>}

            {}
            {activeView === 'objets' && <div>
                    {objectsData ? <div className={styles.rulesTableContainer}>
                            {Object.entries(objectsData.grouped).filter(([type]) => !['#type', 'sla', 'time'].includes(type)).map(([type, entries], groupIndex) => {
                const isCollapsed = collapsedObjectGroups[type];
                const columns = objectsData.columnsByType?.[type]?.filter(col => col && col.toLowerCase() !== '#type') || [];
                if (columns.length === 0) return null;
                return <React.Fragment key={`object-group-${type}-${groupIndex}`}>
                                        <div className={styles.groupHeaderBar} onClick={() => toggleObjectGroup(type)} style={getSeparatorColorStyle('#4a9eff')}>
                                            <div className={styles.groupHeaderText}>
                                                <span className={`${styles.groupCaret} ${isCollapsed ? styles.groupCollapsed : ''}`}>
                                                    <FaChevronDown />
                                                </span>
                                                <span className={styles.groupRowTitle}>
                                                    Type : {formatTypeLabel(type)} ({entries.length})
                                                </span>
                                            </div>
                                        </div>
                                        {!isCollapsed && <div className={styles.tableWrapper}>
                                                <table className={styles.rulesTableCompact}>
                                                    <thead>
                                                        <tr>
                                                            {columns.map(col => <th key={`${type}-col-${col}`} className={styles.colObjectDynamic}>
                                                                    {col.startsWith('#') ? col.substring(1) : col}
                                                                </th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {entries.map((obj, objIndex) => <tr key={`object-${type}-${objIndex}`} className={styles.ruleRow}>
                                                                {columns.map(col => <td key={`${type}-${objIndex}-${col}`} className={styles.colObjectDynamic}>
                                                                        {obj.raw && obj.raw[col] ? obj.raw[col] || '-' : '-'}
                                                                    </td>)}
                                                            </tr>)}
                                                    </tbody>
                                                </table>
                                            </div>}
                                    </React.Fragment>;
              })}
                        </div> : <div className={styles.emptyState}>
                            <FaFileCsv className={styles.emptyIcon} />
                            <p>No object imported</p>
                            <p className={styles.emptyHint}>
                                Import a Stormshield objects CSV file to enrich the rules
                            </p>
                        </div>}
                </div>}

                    {}
                    {activeView === 'dashboard' && <div>
                            {(() => {
              const shouldShowNA = !securityScoreData;
              const calculatedScore = shouldShowNA ? null : securityScoreData.score;
              const manualScore = data?.manualHealthScore;
              const healthScore = shouldShowNA ? null : manualScore !== undefined ? manualScore : calculatedScore;
              const scoreColor = shouldShowNA ? '#6b7280' : healthScore !== null ? healthScore !== undefined ? securityScoreData.color : '#6b7280' : '#6b7280';
              const scoreLetter = shouldShowNA ? null : healthScore !== null ? scoreToLetter(healthScore) || null : null;
              const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
              const defaultBreakdown = [{
                label: "Active rules",
                weight: 25
              }, {
                label: "Politique restrictive",
                weight: 20
              }, {
                label: "Threat detection",
                weight: 20
              }, {
                label: "Advanced inspection",
                weight: 15
              }, {
                label: "Object coverage",
                weight: 10
              }, {
                label: "Identified traffic",
                weight: 10
              }];
              const breakdown = shouldShowNA ? defaultBreakdown : securityScoreData.breakdown;
              const getDescription = label => {
                const descriptions = {
                  "Active rules": "Percentage of active filtering rules relative to total configured rules",
                  "Restrictive policy": "Measures the proportion of blocking (deny) rules and the presence of a deny-all policy with selective opening",
                  "Threat detection": "Volume of security alarms and events detected, indicating firewall monitoring activity",
                  "Advanced inspection": "Percentage of rules using deep inspection (IPS, DPI, content analysis)",
                  "Object coverage": "Number of network objects (IPs, services, groups) used in rules, reflecting configuration granularity",
                  "Identified traffic": "Percentage of traffic routed to known and documented services and vendors (cloud, SaaS)"
                };
                return descriptions[label] || "";
              };
              return <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
                border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                minHeight: '140px'
              }}>
                                        <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '120px'
                }}>
                                            <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                                                {editingScore ? <input type="number" min="0" max="100" value={editingScoreValue !== undefined ? editingScoreValue : healthScore} onChange={e => setEditingScoreValue(e.target.value)} onBlur={saveEditScore} onKeyDown={e => {
                      if (e.key === 'Enter') {
                        saveEditScore();
                      } else if (e.key === 'Escape') {
                        cancelEditScore();
                      }
                    }} autoFocus style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: scoreColor,
                      lineHeight: '1',
                      width: '80px',
                      border: `2px solid ${scoreColor}`,
                      borderRadius: '4px',
                      padding: '0.25rem',
                      background: theme === 'dark' ? '#2d2d4f' : '#ffffff',
                      textAlign: 'center'
                    }} onFocus={handleInputFocus} /> : <div role="button" tabIndex={healthScore !== null ? 0 : -1} onKeyDown={e => {
                      if (healthScore !== null && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        startEditScore(healthScore);
                      }
                    }} title={healthScore !== null ? "Click to select a grade, double-click to edit precisely" : ""} style={{
                      cursor: healthScore !== null ? 'pointer' : 'default',
                      outline: 'none'
                    }}>
                                                        <LetterScale activeLetter={scoreLetter} theme={theme} letters={["F", "E", "D", "C", "B", "A"]} size="normal" onSelect={healthScore !== null ? letter => handleManualLetterSelect(letter) : undefined} highlightLetter={manualScoreChanged && calculatedScore !== null && !editingScore ? scoreToLetter(calculatedScore) : null} />
                                                    </div>}
                                                <div className={styles.scoreTooltipContainer}>
                                                    <FaInfoCircle className={styles.scoreTooltipIcon} onMouseEnter={e => {
                        const scoreBreakdown = breakdown.map(item => ({
                          label: item.label,
                          description: getDescription(item.label),
                          weight: item.weight ? `${item.weight} pts` : "N/A"
                        }));
                        setHoveredTooltip({
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                          scoreBreakdown
                        });
                      }} onMouseMove={e => {
                        if (hoveredTooltip) {
                          setHoveredTooltip(prev => ({
                            ...prev,
                            mouseX: e.clientX,
                            mouseY: e.clientY
                          }));
                        }
                      }} onMouseLeave={() => {
                        setHoveredTooltip(null);
                      }} />
                                                </div>
                                            </div>
                                            {calculatedScore !== null && manualScore !== undefined && editingScore && <div style={{
                    fontSize: '0.65rem',
                    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    fontStyle: 'italic',
                    opacity: 0.7,
                    marginTop: '0.5rem'
                  }}>
                                                    Calculated grade: {calculatedScore} ({scoreToLetter(calculatedScore)})
                                                </div>}
                                        </div>
                                        <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem 1rem',
                  flex: 1,
                  maxWidth: '400px'
                }}>
                                            {breakdown.map((item, idx) => {
                    const value = shouldShowNA || item.percentage === undefined ? null : item.percentage;
                    return <div key={`security-breakdown-${idx}`} style={{
                      fontSize: '0.75rem',
                      color: theme === 'dark' ? '#d1d5db' : '#374151',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                                                        <MetricLetter value={value} higherIsBetter theme={theme} showValue={false} />
                                                        <strong>{item.label}</strong>
                                                    </div>;
                  })}
                                        </div>
                                    </div>;
            })()}

                            {rulesData || objectsData || alarmsData ? <div className={styles.metricsRow}>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>Objets</div>
                                        <div className={styles.metricValue}>{objectsData ? objectsData.total.toLocaleString() : '-'}</div>
                                    </div>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>Filtering rules</div>
                                        <div className={styles.metricValue}>{rulesData ? rulesData.totalFilterRules.toLocaleString() : '-'}</div>
                                    </div>
                                    <div className={styles.metricItem}>
                                        <div className={styles.metricLabel}>NAT rules</div>
                                        <div className={styles.metricValue}>{rulesData ? rulesData.totalNatRules.toLocaleString() : '-'}</div>
                                    </div>
                                </div> : <div className={styles.emptyState}>
                                    <FaFileCsv className={styles.emptyIcon} />
                                    <p>No data imported</p>
                                    <p className={styles.emptyHint}>
                                        Import a CSV file to see statistics
                                    </p>
                                </div>}

                            {(topAlarmEntries.length > 0 || topServiceEntries.length > 0) && <div className={styles.chartsGrid}>
                                    {topAlarmEntries.length > 0 && <div className={styles.section}>
                                            <div className={styles.sectionHeader}>
                                                <FaShieldVirus />
                                                <h3>Top security alarms</h3>
                                            </div>
                                            <p className={styles.sectionNote}>Statistics for the last 30 days</p>
                                            <div className={styles.chartList}>
                                                {topAlarmEntries.map((entry, idx) => {
                    const desc = getAlarmDescription(entry.label);
                    const percentage = maxAlarmCount ? entry.count / maxAlarmCount * 100 : 0;
                    const alarmPercentage = totalAlarms > 0 ? entry.count / totalAlarms * 100 : 0;
                    const displayLabel = entry.label.replace(/\s*\(.*?\)\s*/g, '').trim();
                    const showTooltip = hoveredAlarmIndex === idx;
                    const AlarmIcon = getAlarmIcon(entry.label);
                    return <div key={`alarm-${idx}`} className={`${styles.chartRow} ${styles.chartRowAlarm}`} onMouseEnter={() => setHoveredAlarmIndex(idx)} onMouseLeave={() => setHoveredAlarmIndex(null)} style={{
                      position: 'relative',
                      overflow: 'visible'
                    }}>
                                                            <div className={styles.chartRowTop}>
                                                                <div className={styles.chartRowLabel}>
                                                                    <span className={styles.alarmIcon}>
                                                                        <AlarmIcon />
                                                                    </span>
                                                                    <span className={styles.chartPrimary}>{displayLabel}</span>
                                                                </div>
                                                                <div className={styles.chartMetric}>
                                                                    {entry.count.toLocaleString()} alerts ({alarmPercentage.toFixed(1)}%)
                                                                </div>
                                                            </div>
                                                            <div className={styles.chartBarTrack}>
                                                                <div className={`${styles.chartBarFill} ${styles.chartBarAlarm}`} style={{
                          width: `${Math.max(8, percentage)}%`
                        }} />
                                                            </div>
                                                            {showTooltip && desc && <div className={styles.alarmTooltip}>
                                                                    {desc}
                                                                </div>}
                                                        </div>;
                  })}
                                            </div>
                                        </div>}

                                    {topServiceEntries.length > 0 && <div className={styles.section}>
                                            <div className={styles.sectionHeader}>
                                                <FaNetworkWired />
                                                <h3>Top web services used</h3>
                                            </div>
                                            <p className={styles.sectionNote}>{webTrafficData.sampleNote}</p>
                                            <div className={styles.chartList}>
                                                {topServiceEntries.map((entry, idx) => {
                    const IconComp = entry.icon ? vendorIcons[entry.icon] : null;
                    const percentage = maxServiceBytes ? entry.totalBytes / maxServiceBytes * 100 : 0;
                    const servicePercentage = totalTrafficBytes > 0 ? entry.totalBytes / totalTrafficBytes * 100 : 0;
                    const displayService = formatServiceName(entry.service);
                    return <div key={`traffic-${idx}`} className={`${styles.chartRow} ${styles.chartRowTraffic}`}>
                                                            <div className={styles.chartRowTop}>
                                                            <div className={styles.chartRowLabel}>
                                                                    <div className={styles.vendorCell}>
                                                                    <div className={styles.vendorLogo}>
                                                                        {IconComp ? <IconComp className={styles.vendorIcon} /> : <div className={styles.logoPlaceholder}>Logo</div>}
                                                                    </div>
                                                                    <span className={styles.chartPrimary}>{displayService}</span>
                                                                    </div>
                                                                </div>
                                                                <div className={styles.chartMetric}>
                                                                    {(entry.totalBytes / (1024 * 1024)).toFixed(1)} Mo ({servicePercentage.toFixed(1)}%)
                                                                </div>
                                                            </div>
                                                            <div className={styles.chartBarTrack}>
                                                                <div className={`${styles.chartBarFill} ${styles.chartBarTraffic}`} style={{
                          width: `${Math.max(8, percentage)}%`
                        }} />
                                                            </div>
                                                        </div>;
                  })}
                                            </div>
                                        </div>}
                                </div>}
                        </div>}
                    </div>
                </div>
            </div>

            {}
            {showExportModal && <div className={styles.editModalOverlay} onClick={() => setShowExportModal(false)}>
                    <div className={styles.editModalContent} onClick={e => e.stopPropagation()}>
                        {}
                        <div className={styles.editModalHeader}>
                            <h3 className={styles.editModalTitle}>
                                <IconifyIcon icon="material-symbols:info" width={18} height={18} style={{
              color: '#6b7280'
            }} />
                                Instructions d'export Stormshield
                            </h3>
                            <button type="button" className={styles.editModalCloseButton} onClick={() => setShowExportModal(false)} title="Close">
                                <IconifyIcon icon="material-symbols:cancel-rounded" width={20} height={20} />
                            </button>
                        </div>

                        {}
                        <div className={styles.editModalBody}>
                            <div style={{
            padding: '1.25rem',
            fontSize: '0.9375rem',
            lineHeight: '1.6'
          }}>
                                {}
                                <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-secondary)'
            }}>
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
                color: 'var(--text-secondary)'
              }}>
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Configuration</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Objects</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Network</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>Export</span>
                                    </div>
                                </div>

                                {}
                                <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-secondary)'
            }}>
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
                color: 'var(--text-secondary)'
              }}>
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Configuration</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Security Policy</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Filter - NAT</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>Export</span>
                                    </div>
                                </div>

                                {}
                                <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-secondary)'
            }}>
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
                color: 'var(--text-secondary)'
              }}>
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Monitoring</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Audit Logs</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Network Traffic</span>
                                        {' > '}
                                        Choose a date within the report period
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>Export</span>
                                    </div>
                                </div>

                                {}
                                <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-secondary)'
            }}>
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
                color: 'var(--text-secondary)'
              }}>
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Monitoring</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Reports</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Security</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Alarms</span>
                                        {' > '}
                                        <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>Export</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {}
                        <div className={styles.editModalFooter}>
                            <button type="button" className={styles.editModalSaveButton} onClick={() => setShowExportModal(false)}>
                                <IconifyIcon icon="material-symbols:check-circle" width={16} height={16} />
                                J'ai compris
                            </button>
                        </div>
                    </div>
                </div>}

            {}
            {hoveredTooltip && <div style={{
      position: 'fixed',
      left: `${hoveredTooltip.mouseX + 10}px`,
      top: `${hoveredTooltip.mouseY + 10}px`,
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '6px',
      padding: '1rem',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      zIndex: 999999,
      maxWidth: '700px',
      pointerEvents: 'none',
      color: '#111827'
    }}>
                    <div>
                        <div style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          marginBottom: '0.75rem',
          color: '#111827'
        }}>
                            Calcul de la note
                        </div>
                        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem 1rem'
        }}>
                            {(hoveredTooltip.scoreBreakdown || []).map((item, idx) => <div key={`score-breakdown-${idx}`} style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
                                    <div style={{
              flex: 1
            }}>
                                        <div style={{
                fontWeight: '600',
                fontSize: '0.85rem',
                marginBottom: '0.25rem'
              }}>
                                            {item.label}
                                        </div>
                                        <div style={{
                fontSize: '0.8rem',
                color: '#6b7280',
                lineHeight: 1.4
              }}>
                                            {item.description}
                                        </div>
                                    </div>
                                    <div style={{
              fontWeight: '600',
              fontSize: '0.85rem',
              color: '#111827',
              whiteSpace: 'nowrap'
            }}>
                                        {item.weight}
                                    </div>
                                </div>)}
                        </div>
                    </div>
                </div>}
        </div>;
};
export default FirewallRegles;
