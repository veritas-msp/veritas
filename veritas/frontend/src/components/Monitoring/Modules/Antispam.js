import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaInfoCircle, FaUpload } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import styles from "./Antispam.module.css";
import { useTheme } from "../../../hooks/useTheme";
import API_BASE_URL from "../../../config";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, scoreToLabel, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
import MetricLetter from "../common/MetricLetter";
import { getIconPath } from "../../../utils/assetHelper";
const Antispam = ({
  config,
  setConfig,
  data,
  setData,
  onCSVImportReady
}) => {
  const {
    theme
  } = useTheme();
  const staticData = config?.client?.equipements?.Antispam || {};
  const antispam = data || {};
  const [viewMode, setViewMode] = useState("dashboard");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const usersData = antispam.usersData || null;
  const statsData = antispam.statsData || null;
  const [userSearch, setUserSearch] = useState("");
  const [usersPagination, setUsersPagination] = useState(1);
  const [statsPagination, setStatsPagination] = useState(1);
  const [statsViewMode, setStatsViewMode] = useState("week");
  const [editingScore, setEditingScore] = useState(false);
  const [editingScoreValue, setEditingScoreValue] = useState('');
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [openComment, setOpenComment] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  useEffect(() => {
    if (typeof antispam?.isCommentOpen === "boolean") {
      setOpenComment(antispam.isCommentOpen);
    }
  }, [antispam?.isCommentOpen]);
  useEffect(() => {
    if (!config?.client?.id || !setConfig) return;
    const controller = new AbortController();
    const loadAntispamFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/antispam`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) return;
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const antispamData = rows[0].data || {};
          setConfig(prev => {
            if (!prev?.client) return prev;
            return {
              ...prev,
              client: {
                ...prev.client,
                equipements: {
                  ...(prev.client.equipements || {}),
                  Antispam: antispamData
                }
              }
            };
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading antispam:", err);
      }
    };
    loadAntispamFromDb();
    return () => controller.abort();
  }, [config?.client?.id, setConfig]);
  useEffect(() => {
    if (!staticData || Object.keys(staticData).length === 0 || Object.keys(antispam).length > 0) return;
    const initializedData = {
      routés: 0,
      quarantaine: 0,
      supprimés: 0,
      threats: [],
      comment: ""
    };
    setData(initializedData);
  }, [staticData, antispam]);
  const handleChange = (key, value) => {
    setData({
      ...antispam,
      [key]: value
    });
  };
  const toggleCommentVisibility = () => {
    setOpenComment(prev => {
      const nextIsOpen = !prev;
      const updated = {
        ...antispam,
        isCommentOpen: nextIsOpen
      };
      setData(updated);
      return nextIsOpen;
    });
  };
  const applyManualScore = scoreValue => {
    const updated = {
      ...antispam,
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
  const handleThreatChange = (index, key, value) => {
    const updated = [...(antispam.threats || [])];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setData({
      ...antispam,
      threats: updated
    });
  };
  const addThreat = () => {
    const updated = [...(antispam.threats || []), {
      type: "",
      count: 0
    }];
    setData({
      ...antispam,
      threats: updated
    });
  };
  const removeThreat = index => {
    const updated = [...(antispam.threats || [])];
    updated.splice(index, 1);
    setData({
      ...antispam,
      threats: updated
    });
  };
  const getTotalmails = () => {
    return (parseInt(antispam.routés) || 0) + (parseInt(antispam.quarantaine) || 0) + (parseInt(antispam.supprimés) || 0);
  };
  const getAntispamStatus = () => {
    const totalmails = getTotalmails();
    if (totalmails === 0) {
      return {
        status: "unknown",
        icon: "●",
        color: "gray"
      };
    }
    const spamRate = totalmails > 0 ? ((parseInt(antispam.quarantaine) || 0) + (parseInt(antispam.supprimés) || 0)) / totalmails : 0;
    if (spamRate > 0.3) {
      return {
        status: "critical",
        icon: "●",
        color: "red"
      };
    } else if (spamRate > 0.1) {
      return {
        status: "warning",
        icon: "●",
        color: "orange"
      };
    } else {
      return {
        status: "excellent",
        icon: "●",
        color: "green"
      };
    }
  };
  const getReportPeriod = () => {
    if (config?.client?.checkmkPeriod) {
      return {
        start_time: config.client.checkmkPeriod.start_time,
        end_time: config.client.checkmkPeriod.end_time
      };
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    return {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    };
  };
  const filterStatsByReportPeriod = stats => {
    if (!stats || stats.length === 0) return [];
    const reportPeriod = getReportPeriod();
    if (!reportPeriod.start_time || !reportPeriod.end_time) return stats;
    const startDate = new Date(reportPeriod.start_time);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportPeriod.end_time);
    endDate.setHours(23, 59, 59, 999);
    return stats.filter(stat => {
      const dateParts = stat.period.split('/');
      if (dateParts.length !== 3) return false;
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      const statDate = new Date(year, month, day);
      statDate.setHours(0, 0, 0, 0);
      return statDate >= startDate && statDate <= endDate;
    });
  };
  const calculateGlobalScore = () => {
    const defaultFactors = [{
      label: 'Valid emails',
      description: 'Percentage of valid emails among all processed emails',
      weight: '40 pts'
    }, {
      label: 'Blocked threats',
      description: 'Percentage of threats (spam, infected, banned) blocked by antispam',
      weight: '30 pts'
    }, {
      label: 'Critical threats',
      description: 'Percentage of critical threats (infected + spearphishing) detected',
      weight: '20 pts'
    }, {
      label: 'Spearphishing',
      description: 'Percentage of spearphishing emails detected',
      weight: '10 pts'
    }];
    const filteredStats = filterStatsByReportPeriod(statsData);
    const totalmails = getTotalmails();
    if ((!filteredStats || filteredStats.length === 0) && totalmails > 0) {
      const routés = parseInt(antispam.routés, 10) || 0;
      const quarantaine = parseInt(antispam.quarantaine, 10) || 0;
      const supprimés = parseInt(antispam.supprimés, 10) || 0;
      const validRate = routés / totalmails * 100;
      const threatRate = (quarantaine + supprimés) / totalmails * 100;
      const criticalThreatRate = threatRate * 0.5;
      const spearphishingRate = threatRate * 0.1;
      const validScore = Math.min(100, validRate * 1.0) * 0.4;
      const threatScore = Math.max(0, 100 - threatRate * 2) * 0.3;
      const criticalThreatScore = Math.max(0, 100 - criticalThreatRate * 5) * 0.2;
      const spearphishingScore = Math.max(0, 100 - spearphishingRate * 10) * 0.1;
      let finalScore = validScore + threatScore + criticalThreatScore + spearphishingScore;
      finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));
      const color = scoreToColor(finalScore);
      const label = scoreToLabel(finalScore);
      const factors = [{
        label: 'Valid emails',
        description: defaultFactors[0].description,
        weight: '40 pts',
        score: Math.round(validScore),
        value: validRate
      }, {
        label: 'Blocked threats',
        description: defaultFactors[1].description,
        weight: '30 pts',
        score: Math.round(threatScore),
        value: threatRate
      }, {
        label: 'Critical threats',
        description: defaultFactors[2].description,
        weight: '20 pts',
        score: Math.round(criticalThreatScore),
        value: criticalThreatRate
      }, {
        label: 'Spearphishing',
        description: defaultFactors[3].description,
        weight: '10 pts',
        score: Math.round(spearphishingScore),
        value: spearphishingRate
      }];
      return {
        score: finalScore,
        color,
        label,
        factors,
        validRate,
        threatRate,
        criticalThreatRate,
        spearphishingRate
      };
    }
    if (!filteredStats || filteredStats.length === 0) {
      return {
        score: null,
        color: '#6b7280',
        label: 'N/A',
        factors: defaultFactors,
        validRate: null,
        threatRate: null,
        criticalThreatRate: null,
        spearphishingRate: null
      };
    }
    const totals = filteredStats.reduce((acc, stat) => ({
      valid: acc.valid + (stat.valid || 0),
      infected: acc.infected + (stat.infected || 0),
      spam: acc.spam + (stat.spam || 0),
      banned: acc.banned + (stat.banned || 0),
      spearphishing: acc.spearphishing + (stat.spearphishing || 0),
      pending: acc.pending + (stat.pending || 0),
      total: acc.total + (stat.total || 0)
    }), {
      valid: 0,
      infected: 0,
      spam: 0,
      banned: 0,
      spearphishing: 0,
      pending: 0,
      total: 0
    });
    if (totals.total === 0) {
      return {
        score: null,
        color: '#6b7280',
        label: 'N/A',
        factors: defaultFactors,
        validRate: null,
        threatRate: null,
        criticalThreatRate: null,
        spearphishingRate: null
      };
    }
    const validRate = totals.valid / totals.total * 100;
    const threatRate = (totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total * 100;
    const spearphishingRate = totals.spearphishing / totals.total * 100;
    const criticalThreatRate = (totals.infected + totals.spearphishing) / totals.total * 100;
    const validScore = Math.min(100, validRate * 1.0) * 0.4;
    const threatScore = Math.max(0, 100 - threatRate * 2) * 0.3;
    const criticalThreatScore = Math.max(0, 100 - criticalThreatRate * 5) * 0.2;
    const spearphishingScore = Math.max(0, 100 - spearphishingRate * 10) * 0.1;
    let finalScore = validScore + threatScore + criticalThreatScore + spearphishingScore;
    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));
    const color = scoreToColor(finalScore);
    const label = scoreToLabel(finalScore);
    const factors = [{
      label: 'Valid emails',
      description: 'Percentage of valid emails among all processed emails',
      weight: '40 pts',
      score: Math.round(validScore),
      value: validRate
    }, {
      label: 'Blocked threats',
      description: 'Percentage of threats (spam, infected, banned) blocked by antispam',
      weight: '30 pts',
      score: Math.round(threatScore),
      value: threatRate
    }, {
      label: 'Critical threats',
      description: 'Percentage of critical threats (infected + spearphishing) detected',
      weight: '20 pts',
      score: Math.round(criticalThreatScore),
      value: criticalThreatRate
    }, {
      label: 'Spearphishing',
      description: 'Percentage of spearphishing emails detected',
      weight: '10 pts',
      score: Math.round(spearphishingScore),
      value: spearphishingRate
    }];
    return {
      score: finalScore,
      color,
      label,
      factors,
      validRate,
      threatRate,
      criticalThreatRate,
      spearphishingRate
    };
  };
  const groupStatsByWeek = () => {
    const allStats = statsData;
    if (!allStats || allStats.length === 0) return [];
    const weekMap = new Map();
    allStats.forEach(stat => {
      const dateParts = stat.period.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const weekLabel = `Week of ${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}/${monday.getFullYear()}`;
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            period: weekLabel,
            weekStart: monday,
            valid: 0,
            infected: 0,
            spam: 0,
            banned: 0,
            spearphishing: 0,
            pending: 0,
            total: 0
          });
        }
        const weekStat = weekMap.get(weekKey);
        weekStat.valid += stat.valid || 0;
        weekStat.infected += stat.infected || 0;
        weekStat.spam += stat.spam || 0;
        weekStat.banned += stat.banned || 0;
        weekStat.spearphishing += stat.spearphishing || 0;
        weekStat.pending += stat.pending || 0;
        weekStat.total += stat.total || 0;
      }
    });
    return Array.from(weekMap.values()).sort((a, b) => {
      return b.weekStart - a.weekStart;
    });
  };
  const getAntispamInfo = () => {
    const info = [];
    if (staticData.version) info.push(`Version ${staticData.version}`);
    if (staticData.expiration) info.push(`Expires on ${staticData.expiration}`);
    const totalUsers = (staticData.utilisateursProteges || 0) + (staticData.domainesSurveilles || 0);
    if (totalUsers > 0) info.push(`${totalUsers} protected items`);
    return info;
  };
  const renderMetricRow = (label, value, higherIsBetter = true) => <div style={{
    fontSize: '0.75rem',
    color: '#374151',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem'
  }}>
      <MetricLetter value={value} higherIsBetter={higherIsBetter} showValue={false} />
      <strong>{label}</strong>
    </div>;
  const cleanText = text => {
    if (!text) return '';
    text = text.replace(/^\uFEFF/, '');
    let hasNullChars = false;
    let nullCharCount = 0;
    for (let i = 0; i < Math.min(200, text.length); i += 2) {
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 0) {
        nullCharCount++;
      }
    }
    hasNullChars = nullCharCount > Math.min(200, text.length) * 0.3;
    if (hasNullChars) {
      let cleaned = '';
      for (let i = 0; i < text.length; i += 2) {
        if (i < text.length) {
          const char = text[i];
          const code = text.charCodeAt(i);
          if (code >= 32 || code === 9 || code === 10 || code === 13) {
            cleaned += char;
          }
        }
      }
      text = cleaned;
    } else {
      let controlCharCount = 0;
      for (let i = 0; i < Math.min(200, text.length); i++) {
        const code = text.charCodeAt(i);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          controlCharCount++;
        }
      }
      const hasControlChars = controlCharCount > text.length * 0.2;
      if (hasControlChars) {
        let cleaned = '';
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          if (code >= 32 || code === 9 || code === 10 || code === 13) {
            cleaned += text[i];
          }
        }
        text = cleaned;
      }
    }
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    text = text.replace(/\0/g, '');
    return text;
  };
  const cleanString = str => {
    if (!str) return '';
    let cleaned = '';
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = str.charCodeAt(i);
      if (code !== 0) {
        cleaned += char;
      }
    }
    cleaned = cleaned.trim();
    return cleaned;
  };
  const parseCSV = text => {
    text = cleanText(text);
    const lines = text.split(/\r?\n/).filter(line => line.trim());
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
        } else if (char === ';' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      return values;
    };
    const headers = parseLine(lines[0]).map((h, index) => {
      let cleaned = h.replace(/^"|"$/g, '');
      cleaned = cleanString(cleaned);
      return cleaned || `Column${index + 1}`;
    });
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const maxCols = Math.max(headers.length, values.length);
      if (maxCols > 0) {
        const row = {};
        headers.forEach((header, index) => {
          let value = values[index] || '';
          value = value.replace(/^"|"$/g, '');
          value = cleanString(value);
          row[header] = value;
        });
        for (let j = headers.length; j < values.length; j++) {
          let value = values[j].replace(/^"|"$/g, '');
          value = cleanString(value);
          if (value) {
            row[`Column${j + 1}`] = value;
          }
        }
        if (Object.values(row).some(v => v && v.toString().trim())) {
          rows.push(row);
        }
      }
    }
    return {
      headers,
      rows
    };
  };
  const parseUsersCSV = rows => {
    return rows.map(row => {
      const getValue = possibleKeys => {
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return String(row[key]).trim();
          }
        }
        return '';
      };
      const aliases = [];
      for (let i = 1; i <= 10; i++) {
        const alias = getValue([`Email Alias ${i}`, `EmailAlias${i}`, `email alias ${i}`, `emailalias${i}`]);
        if (alias && alias.trim()) {
          aliases.push(alias.trim());
        }
      }
      return {
        lastName: getValue(['Last Name', 'LastName', 'last name', 'lastname', 'Nom']),
        firstName: getValue(['First Name', 'FirstName', 'first name', 'firstname', 'First name']),
        MaynEmail: getValue(['Mayn Email', 'MaynEmail', 'Mayn email', 'Maynemail', 'Email principal']),
        protectionStatus: getValue(['Protection Status', 'ProtectionStatus', 'protection status', 'protectionstatus', 'Status']),
        origin: getValue(['Origin', 'origin', 'Origine']),
        aliases: aliases
      };
    }).filter(user => user.MaynEmail && user.MaynEmail.trim());
  };
  const parseStatsCSV = (rows, headers) => {
    const getColumnIndex = possibleNames => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => {
          if (!h) return false;
          const headerLower = h.toLowerCase().trim();
          const nameLower = name.toLowerCase();
          return headerLower === nameLower || headerLower.includes(nameLower);
        });
        if (index !== -1) return index;
      }
      return -1;
    };
    const periodIndex = getColumnIndex(['period']);
    const validIndex = getColumnIndex(['valid']);
    const infectedIndex = getColumnIndex(['infected', 'infecté', 'infected']);
    const spamIndex = getColumnIndex(['spam']);
    const bannedIndex = getColumnIndex(['banned', 'banni']);
    const spearphishingIndex = getColumnIndex(['spearphishing', 'spear phishing', 'spear-phishing']);
    const pendingIndex = getColumnIndex(['pending', 'pending']);
    const totalIndex = getColumnIndex(['total']);
    console.log('Column indices found:', {
      period: periodIndex,
      valid: validIndex,
      infected: infectedIndex,
      spam: spamIndex,
      banned: bannedIndex,
      spearphishing: spearphishingIndex,
      pending: pendingIndex,
      total: totalIndex
    });
    console.log('Cleaned headers:', headers);
    return rows.map((row, rowIndex) => {
      const extractNumericValue = cellValue => {
        if (cellValue === undefined || cellValue === null || cellValue === '') return 0;
        const strValue = cellValue.toString().trim();
        if (!strValue) return 0;
        const numericPart = strValue.replace(/[^\d]/g, '');
        const numValue = parseInt(numericPart, 10);
        return isNaN(numValue) ? 0 : numValue;
      };
      const getValueByIndex = index => {
        if (index === -1) return 0;
        if (Array.isArray(row)) {
          return extractNumericValue(row[index]);
        } else {
          const headerName = headers[index];
          return extractNumericValue(row[headerName]);
        }
      };
      const getValueByName = possibleNames => {
        for (const name of possibleNames) {
          const value = row[name];
          if (value !== undefined && value !== null && value !== '') {
            return extractNumericValue(value);
          }
        }
        return 0;
      };
      let period, valid, infected, spam, banned, spearphishing, pending, total;
      if (Array.isArray(row)) {
        period = (row[periodIndex] || '').toString().trim();
        valid = getValueByIndex(validIndex);
        infected = getValueByIndex(infectedIndex);
        spam = getValueByIndex(spamIndex);
        banned = getValueByIndex(bannedIndex);
        spearphishing = getValueByIndex(spearphishingIndex);
        pending = getValueByIndex(pendingIndex);
        total = getValueByIndex(totalIndex);
      } else {
        period = (row['Period'] || row['period'] || '').toString().trim();
        valid = getValueByName(['Valid', 'valid']);
        infected = getValueByName(['Infected', 'infected', 'Infected']);
        spam = getValueByName(['Spam', 'spam']);
        banned = getValueByName(['Banned', 'banned', 'Banni']);
        spearphishing = getValueByName(['Spearphishing', 'spearphishing', 'Spear phishing']);
        pending = getValueByName(['Pending', 'pending', 'Pending']);
        total = getValueByName(['Total', 'total']);
      }
      if (rowIndex === 0) {
        console.log('First extracted row:', {
          period,
          valid,
          infected,
          spam,
          banned,
          spearphishing,
          pending,
          total
        });
      }
      const cleanPeriod = period.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      return {
        period: cleanPeriod,
        valid,
        infected,
        spam,
        banned,
        spearphishing,
        pending,
        total
      };
    }).filter(stat => stat.period && stat.period.trim());
  };
  const handleFileUpload = useCallback(async file => {
    if (!file) return;
    const arrayBufferReader = new FileReader();
    arrayBufferReader.onload = e => {
      try {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        let text = '';
        let decoder;
        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
          decoder = new TextDecoder('utf-16le');
          text = decoder.decode(uint8Array.slice(2));
        } else if (uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
          decoder = new TextDecoder('utf-16be');
          text = decoder.decode(uint8Array.slice(2));
        } else if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
          decoder = new TextDecoder('utf-8');
          text = decoder.decode(uint8Array.slice(3));
        } else if (uint8Array.length > 2 && uint8Array[1] === 0 && uint8Array[3] === 0) {
          decoder = new TextDecoder('utf-16le');
          text = decoder.decode(uint8Array);
        } else {
          decoder = new TextDecoder('utf-8');
          text = decoder.decode(uint8Array);
        }
        text = cleanText(text);
        const {
          headers,
          rows
        } = parseCSV(text);
        if (!rows || rows.length === 0) {
          toast.error("The CSV file is empty or invalid");
          return;
        }
        const cleanedHeaders = headers.map(h => cleanString(h));
        const normalizedHeaders = cleanedHeaders.map(h => {
          const cleaned = cleanString(h).toLowerCase().trim().replace(/\s+/g, ' ');
          return cleaned;
        });
        const headerMatches = (header, patterns) => {
          const cleaned = cleanString(header).toLowerCase().replace(/\s+/g, ' ');
          return patterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            return cleaned.includes(patternLower) || cleaned === patternLower;
          });
        };
        const hasLastName = cleanedHeaders.some(h => headerMatches(h, ['Last Name', 'LastName', 'last name', 'lastname']) || cleanString(h).toLowerCase().startsWith('last'));
        const hasMaynEmail = cleanedHeaders.some(h => headerMatches(h, ['Mayn Email', 'MaynEmail', 'Mayn email', 'Maynemail']) || cleanString(h).toLowerCase().includes('email') && cleanString(h).toLowerCase().includes('Mayn'));
        const hasPeriod = cleanedHeaders.some(h => headerMatches(h, ['Period', 'period']));
        const hasValid = cleanedHeaders.some(h => headerMatches(h, ['Valid', 'valid']));
        const originalHasLastName = normalizedHeaders.some(h => h.includes('last name') || h.includes('lastname') || h.startsWith('last'));
        const originalHasMaynEmail = normalizedHeaders.some(h => h.includes('Mayn email') || h.includes('Maynemail') || h.includes('email') && h.includes('Mayn'));
        const originalHasPeriod = normalizedHeaders.some(h => h.includes('period'));
        const originalHasValid = normalizedHeaders.some(h => h.includes('valid'));
        if ((hasLastName || originalHasLastName) && (hasMaynEmail || originalHasMaynEmail)) {
          const users = parseUsersCSV(rows);
          const updated = {
            ...antispam,
            usersData: users
          };
          setData(updated);
          setViewMode('utilisateurs');
          toast.success(`✅ ${users.length} users imported`);
        } else if ((hasPeriod || originalHasPeriod) && (hasValid || originalHasValid)) {
          const stats = parseStatsCSV(rows, headers);
          const updated = {
            ...antispam,
            statsData: stats
          };
          setData(updated);
          setViewMode('dashboard');
          toast.success(`✅ ${stats.length} statistics periods imported`);
        } else {
          console.log("Detected headers (raw):", headers);
          console.log("Cleaned headers:", cleanedHeaders);
          console.log("Normalized headers:", normalizedHeaders);
          const displayHeaders = cleanedHeaders.slice(0, 5).filter(h => h).join(', ') || 'No valid header';
          toast.error(`Unrecognized CSV file type. Detected headers: ${displayHeaders}...`);
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Error importing CSV file");
      }
    };
    arrayBufferReader.readAsArrayBuffer(file);
  }, [antispam, setData]);
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
    if (onCSVImportReady && fileInputRef.current) {
      const triggerCSVImport = () => {
        fileInputRef.current?.click();
      };
      onCSVImportReady({
        triggerCSVImport
      });
    }
  }, []);
  if (!staticData || Object.keys(staticData).length === 0) {
    return <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No antispam configured for this client.</p>
        </div>
      </div>;
  }
  const antispamStatus = getAntispamStatus();
  const antispamInfo = getAntispamInfo();
  const totalmails = getTotalmails();
  return <div className={styles.container}>
      <div className={styles.antispamCard}>
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
          {}
          <div className={styles.headerLeft} style={{
            zIndex: 1
          }}>
            <div className={styles.antispamInfo}>
              <h3 className={styles.antispamName}>
                <img src={getIconPath('mailinblack.png')} alt="Mail in Black" style={{
                  width: '20px',
                  height: '20px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  marginRight: '0.5rem',
                  borderRadius: '4px'
                }} />
                <a href="https://partner.mailinblack.com/" target="_blank" rel="noopener noreferrer" style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  transition: 'opacity 0.2s ease',
                  transform: 'translateY(4px)',
                  display: 'inline-block'
                }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'} title="Open Mail In Black Partner">
                  {staticData.logiciel}
                </a>
              </h3>
            </div>
          </div>

          {}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            marginTop: '1rem'
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
              <button onClick={() => setViewMode('dashboard')} title="Dashboard" style={{
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                minWidth: '70px',
                width: '70px',
                color: viewMode === 'dashboard' || !viewMode ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                background: viewMode === 'dashboard' || !viewMode ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'dashboard' || !viewMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
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
            <button onClick={() => {
                setViewMode('utilisateurs');
                setUsersPagination(1);
              }} title="Users" style={{
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                minWidth: '70px',
                width: '70px',
                color: viewMode === 'utilisateurs' ? theme === 'dark' ? '#f9fafb' : '#111827' : theme === 'dark' ? '#9ca3af' : '#6b7280',
                background: viewMode === 'utilisateurs' ? theme === 'dark' ? '#1e1e3f' : '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'utilisateurs' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                pointerEvents: 'auto'
              }}>
              <IconifyIcon icon="mdi:account-multiple" width={20} height={20} style={{
                  pointerEvents: 'none'
                }} />
              <span style={{
                  fontSize: '0.65rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}>
                Users
              </span>
            </button>
            </div>
          </div>

          {}
          <div className={styles.headerRight} style={{
            zIndex: 1
          }}>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{
              display: 'none'
            }} />
            
            {}
            {}
            <button type="button" className={styles.syncButton} onClick={() => fileInputRef.current?.click()} title="Import a CSV file">
              <FaUpload style={{
                width: '14px',
                height: '14px'
              }} />
            </button>
            
            {}
            <div className={styles.flexAuto}>
              
            </div>
            
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
        {(!viewMode || viewMode === 'dashboard') && <div style={{
          marginTop: '1.5rem'
        }}>
                {}
                {(() => {
            const globalScore = calculateGlobalScore();
            const calculatedScore = globalScore.score;
            const manualScore = antispam.manualHealthScore;
            const healthScore = manualScore !== undefined ? manualScore : calculatedScore;
            const scoreColor = healthScore !== null ? healthScore !== undefined ? globalScore.color : '#6b7280' : '#6b7280';
            const activeLetter = healthScore !== null ? scoreToLetter(healthScore) : null;
            const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
            return <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
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
                    background: '#ffffff',
                    textAlign: 'center'
                  }} onFocus={handleInputFocus} /> : <div role="button" tabIndex={0} onDoubleClick={() => startEditScore(healthScore ?? calculatedScore ?? '')} onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startEditScore(healthScore ?? calculatedScore ?? '');
                    }
                  }} title="Click a letter to choose the grade, double-click or Enter to edit the exact value" style={{
                    cursor: 'pointer',
                    outline: 'none'
                  }}>
                              <LetterScale activeLetter={activeLetter} letters={["F", "E", "D", "C", "B", "A"]} size="normal" onSelect={letter => handleManualLetterSelect(letter)} highlightLetter={manualScoreChanged && calculatedScore !== null && !editingScore ? scoreToLetter(calculatedScore) : null} />
                            </div>}
                          <div className={styles.scoreTooltipContainer}>
                            <FaInfoCircle className={styles.scoreTooltipIcon} onMouseEnter={e => {
                      const scoreBreakdown = globalScore.factors.map(factor => ({
                        label: factor.label,
                        description: factor.description,
                        weight: factor.weight
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
                  color: '#6b7280',
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
                        {renderMetricRow('Valid emails', globalScore.validRate, true)}
                        {renderMetricRow('Blocked threats', globalScore.threatRate, false)}
                        {renderMetricRow('Critical threats', globalScore.criticalThreatRate, false)}
                        {renderMetricRow('Spearphishing', globalScore.spearphishingRate, false)}
                      </div>
                    </div>;
          })()}


                {statsData && statsData.length > 0 ? <div>
                    {}
                    {(() => {
              const allStats = statsData;
              const totals = allStats.reduce((acc, stat) => ({
                valid: acc.valid + (stat.valid || 0),
                infected: acc.infected + (stat.infected || 0),
                spam: acc.spam + (stat.spam || 0),
                banned: acc.banned + (stat.banned || 0),
                spearphishing: acc.spearphishing + (stat.spearphishing || 0),
                pending: acc.pending + (stat.pending || 0),
                total: acc.total + (stat.total || 0)
              }), {
                valid: 0,
                infected: 0,
                spam: 0,
                banned: 0,
                spearphishing: 0,
                pending: 0,
                total: 0
              });
              const threatRate = totals.total > 0 ? ((totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total * 100).toFixed(2) : 0;
              const validRate = totals.total > 0 ? (totals.valid / totals.total * 100).toFixed(2) : 0;
              return <div className={styles.metricsRow}>
                          <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Total emails</div>
                            <div className={styles.metricValue}>
                              {totals.total.toLocaleString()}
                            </div>
                          </div>
                          <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Valid emails</div>
                            <div className={styles.metricValue} style={{
                    color: '#10b981'
                  }}>
                              {totals.valid.toLocaleString()}
                            </div>
                            <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem'
                  }}>
                              {validRate}%
                            </div>
                          </div>
                          <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Blocked threats</div>
                            <div className={styles.metricValue} style={{
                    color: '#ef4444'
                  }}>
                              {(totals.infected + totals.spam + totals.banned + totals.spearphishing).toLocaleString()}
                            </div>
                            <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem'
                  }}>
                              {threatRate}%
                            </div>
                          </div>
                          <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Spam</div>
                            <div className={styles.metricValue} style={{
                    color: '#f59e0b'
                  }}>
                              {totals.spam.toLocaleString()}
                            </div>
                          </div>
                          <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Infected</div>
                            <div className={styles.metricValue} style={{
                    color: '#ef4444'
                  }}>
                              {totals.infected.toLocaleString()}
                            </div>
                          </div>
                          <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Spearphishing</div>
                            <div className={styles.metricValue} style={{
                    color: '#dc2626'
                  }}>
                              {totals.spearphishing.toLocaleString()}
                            </div>
                          </div>
                        </div>;
            })()}
                    
                    <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
                      <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                        <h4 className={styles.sectionTitle} style={{
                  margin: 0
                }}>
                          Detailed statistics
                        </h4>
                        <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                          Showing all imported data ({statsData.length} periods)
                        </div>
                      </div>
                      <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                flexShrink: 0,
                background: '#f3f4f6',
                padding: '0.125rem',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                        <button onClick={() => {
                  setStatsViewMode('day');
                  setStatsPagination(1);
                }} style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: '500',
                  color: statsViewMode === 'day' ? '#111827' : '#6b7280',
                  background: statsViewMode === 'day' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: statsViewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}>
                          Per day
                        </button>
                        <button onClick={() => {
                  setStatsViewMode('week');
                  setStatsPagination(1);
                }} style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: '500',
                  color: statsViewMode === 'week' ? '#111827' : '#6b7280',
                  background: statsViewMode === 'week' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: statsViewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}>
                          Par semaine
                        </button>
                      </div>
                    </div>
                    {(() => {
              const allStats = statsData || [];
              const weekData = statsViewMode === 'week' ? groupStatsByWeek().reverse() : null;
              const dayData = statsViewMode === 'day' ? allStats.slice().sort((a, b) => {
                const dateA = new Date(a.period);
                const dateB = new Date(b.period);
                return dateA - dateB;
              }) : null;
              const allDisplayData = statsViewMode === 'week' ? weekData : dayData;
              const STATS_PER_PAGE = 10;
              const currentPage = statsPagination;
              const totalPages = Math.ceil(allDisplayData.length / STATS_PER_PAGE);
              const startIndex = (currentPage - 1) * STATS_PER_PAGE;
              const endIndex = startIndex + STATS_PER_PAGE;
              const paginatedDisplayData = allDisplayData.slice(startIndex, endIndex);
              const chartData = allDisplayData.map(stat => ({
                period: statsViewMode === 'week' ? stat.period.replace('Week of ', '') : stat.period,
                Valid: stat.valid || 0,
                Infected: stat.infected || 0,
                Spam: stat.spam || 0,
                Bannis: stat.banned || 0,
                Spearphishing: stat.spearphishing || 0,
                'Pending': stat.pending || 0,
                Total: stat.total || 0
              }));
              return <div>
                          {}
                          <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb'
                }}>
                            <ResponsiveContainer width="100%" height={400}>
                              <BarChart data={chartData} margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60
                    }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} tick={{
                        fill: '#374151',
                        fontSize: 12
                      }} />
                                <YAxis tick={{
                        fill: '#374151',
                        fontSize: 12
                      }} />
                                <Tooltip contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827'
                      }} />
                                <Legend wrapperStyle={{
                        paddingTop: '20px'
                      }} iconType="square" />
                                <Bar dataKey="Valid" fill="#10b981" />
                                <Bar dataKey="Infected" fill="#ef4444" />
                                <Bar dataKey="Spam" fill="#f59e0b" />
                                <Bar dataKey="Bannis" fill="#ef4444" />
                                <Bar dataKey="Spearphishing" fill="#dc2626" />
                                <Bar dataKey="Pending" fill="#6b7280" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {}
                          <div style={{
                  overflowX: 'auto',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                            <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem'
                  }}>
                              <thead style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                                <tr style={{
                        background: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'left',
                          fontWeight: '600'
                        }}>
                                    {statsViewMode === 'week' ? 'Week' : 'Period'}
                                  </th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Valid</th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Infected</th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Spam</th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Bannis</th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Spearphishing</th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Pending</th>
                                  <th style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedDisplayData.length > 0 ? paginatedDisplayData.map((stat, index) => <tr key={index} style={{
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                                      <td style={{
                          padding: '0.75rem'
                        }}>
                                        {statsViewMode === 'week' ? stat.period : stat.period}
                                      </td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#10b981'
                        }}>{stat.valid.toLocaleString()}</td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#ef4444'
                        }}>{stat.infected.toLocaleString()}</td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#f59e0b'
                        }}>{stat.spam.toLocaleString()}</td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#ef4444'
                        }}>{stat.banned.toLocaleString()}</td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#dc2626'
                        }}>{stat.spearphishing.toLocaleString()}</td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#6b7280'
                        }}>{stat.pending.toLocaleString()}</td>
                                      <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: '600'
                        }}>{stat.total.toLocaleString()}</td>
                                    </tr>) : <tr>
                                    <td colSpan="8" style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}>
                                      No data to display
                                    </td>
                                  </tr>}
                              </tbody>
                            </table>
                          </div>
                          
                          {}
                          {totalPages > 1 && <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}>
                              <button onClick={() => setStatsPagination(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#111827',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }} onMouseEnter={e => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }} onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}>
                                ← Previous
                              </button>
                              <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                                Page {currentPage} of {totalPages}
                              </span>
                              <button onClick={() => setStatsPagination(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#111827',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }} onMouseEnter={e => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }} onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}>
                                Next →
                              </button>
                            </div>}
                        </div>;
            })()}
                  </div> : <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
                    <p>No statistics imported. Import the file <strong>exported-protect-stats.csv</strong> to see the statistics.</p>
                  </div>}
              </div>}

        {}
        {viewMode === 'utilisateurs' && <div style={{
          marginTop: '1.5rem'
        }}>
            {usersData && usersData.length > 0 ? <div>
                    <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
                      <h4 className={styles.sectionTitle} style={{
                margin: 0
              }}>
                        Protected users ({usersData.length})
                      </h4>
                      <input type="text" placeholder="Search..." value={userSearch} onChange={e => {
                setUserSearch(e.target.value);
                setUsersPagination(1);
              }} style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
                background: theme === 'dark' ? '#1e1e3f' : '#ffffff',
                color: theme === 'dark' ? '#f9fafb' : '#111827',
                fontSize: '0.875rem',
                minWidth: '200px'
              }} />
                    </div>
                    {(() => {
              const filteredUsers = usersData.filter(user => {
                const matchesSearch = !userSearch || `${user.firstName} ${user.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) || user.MaynEmail.toLowerCase().includes(userSearch.toLowerCase());
                return matchesSearch;
              });
              const ITEMS_PER_PAGE = 10;
              const currentPage = usersPagination;
              const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
              const endIndex = startIndex + ITEMS_PER_PAGE;
              const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
              return <div>
                          {filteredUsers.length > 0 ? <>
                            <div style={{
                    borderRadius: '8px',
                    border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb'
                  }}>
                              <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}>
                                <thead style={{
                        background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
                        borderBottom: theme === 'dark' ? '2px solid #4a4a6a' : '2px solid #e5e7eb'
                      }}>
                                  <tr>
                                    <th style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: theme === 'dark' ? '#f9fafb' : '#111827'
                          }}>Name</th>
                                    <th style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: theme === 'dark' ? '#f9fafb' : '#111827'
                          }}>Primary email</th>
                                    <th style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: theme === 'dark' ? '#f9fafb' : '#111827'
                          }}>Status</th>
                                    <th style={{
                            padding: '0.75rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: theme === 'dark' ? '#f9fafb' : '#111827'
                          }}>Alias</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedUsers.map((user, index) => <tr key={index} style={{
                          borderBottom: theme === 'dark' ? '1px solid #3a3a5a' : '1px solid #f3f4f6'
                        }}>
                                      <td style={{
                            padding: '0.75rem',
                            color: theme === 'dark' ? '#d1d5db' : '#111827'
                          }}>
                                        {user.firstName} {user.lastName}
                                      </td>
                                      <td style={{
                            padding: '0.75rem',
                            color: theme === 'dark' ? '#d1d5db' : '#111827'
                          }}>{user.MaynEmail}</td>
                                      <td style={{
                            padding: '0.75rem'
                          }}>
                                        <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: user.protectionStatus === 'Protected' ? '#10b98115' : '#ef444415',
                              color: user.protectionStatus === 'Protected' ? '#10b981' : '#ef4444'
                            }}>
                                          {user.protectionStatus}
                                        </span>
                                      </td>
                                      <td style={{
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                          }}>
                                        {user.aliases.length > 0 ? `${user.aliases.length} alias` : 'None'}
                                      </td>
                                    </tr>)}
                                </tbody>
                              </table>
                            </div>
                            {totalPages > 1 && <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem'
                  }}>
                                <button onClick={() => setUsersPagination(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }} onMouseEnter={e => {
                      if (currentPage !== 1) {
                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                      }
                    }} onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-secondary)';
                    }}>
                                  ← Previous
                                </button>
                                <span style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      fontWeight: '500'
                    }}>
                                  Page {currentPage} of {totalPages}
                                </span>
                                <button onClick={() => setUsersPagination(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }} onMouseEnter={e => {
                      if (currentPage !== totalPages) {
                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                      }
                    }} onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-secondary)';
                    }}>
                                  Next →
                                </button>
                              </div>}
                            </> : <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  fontSize: '0.875rem'
                }}>
                              <p>No user matches the search criteria.</p>
                            </div>}
                        </div>;
            })()}
                  </div> : <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            fontSize: '0.875rem'
          }}>
                    <p>No user imported. Import the file <strong>exported-users.csv</strong> to see the users.</p>
                  </div>}
          </div>}

        </div>

        {}
        {}
          <textarea id="comment-antispam" className={styles.commentTextarea} value={antispam.comment || ""} onChange={e => handleChange("comment", e.target.value)} onFocus={e => e.target.select()} placeholder="Comment..." rows="2" />
      </div>

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

      {}
      {showExportModal && <div className={styles.editModalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.editModalContent} onClick={e => e.stopPropagation()}>
            {}
            <div className={styles.editModalHeader}>
              <h3 className={styles.editModalTitle}>
                <IconifyIcon icon="material-symbols:info" width={18} height={18} style={{
              color: '#6b7280'
            }} />
                How to export the data?
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
                    📊 Statistics (daily aggregation)
                  </div>
                  <div style={{
                paddingLeft: '1rem',
                color: 'var(--text-secondary)'
              }}>
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Module Protect</span>
                    {' > '}
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Home</span>
                    {' > '}
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>Export as daily aggregation</span>
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
                    👥 User list (Option 1)
                  </div>
                  <div style={{
                paddingLeft: '1rem',
                color: 'var(--text-secondary)'
              }}>
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Module Protect</span>
                    {' > '}
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Home</span>
                    {' > '}
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}>Export users</span>
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
                    👥 User list (Option 2)
                  </div>
                  <div style={{
                paddingLeft: '1rem',
                color: 'var(--text-secondary)'
              }}>
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Module Management</span>
                    {' > '}
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>Users</span>
                    {' > '}
                    <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500'
                }}>User list</span>
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
    </div>;
};
export default Antispam;
