import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import styles from "./Form.module.css";
import { toast } from "react-toastify";
const ImportEquipmentsModal = ({
  isOpen,
  onClose,
  onImport,
  equipmentType = 'switch'
}) => {
  const [pastedText, setPastedText] = useState("");
  const [parsedDevices, setParsedDevices] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const parseSwitches = text => {
    const devices = [];
    const seenMacs = new Set();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^(USW\s+(Pro|Aggregation|\d+)[^]*)|(UDM(\s+Pro)?\b.*)/i.test(line)) {
        const modelParts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
        const currentModel = modelParts[0]?.trim() || '';
        let deviceName = '';
        let isNewSwitch = false;
        const isValidName = name => {
          if (!name || name.length < 2 || name.length > 60) return false;
          if (/^\d+\.\d+\.\d+$/.test(name)) return false;
          if (/^\d+$/.test(name)) return false;
          if (/^(USW|UDM)\b/i.test(name)) {
            if (/(Pro|\d)/i.test(name)) return false;
          }
          if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(name)) return false;
          if (/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(name)) return false;
          if (/^Port\s+\d+/i.test(name)) return false;
          if (/^SFP/i.test(name)) return false;
          if (/GbE/i.test(name)) return false;
          if (/^Network$|^Click to Update$|^Up to date$|^Online$|^Offline$|^Locate$|^Restart$/i.test(name)) return false;
          const hasLetters = /[a-zA-Z]/.test(name);
          const hasNamePattern = /^\d+[-_]\w+/.test(name) || /^\d+\s+\w+/.test(name);
          return hasLetters || hasNamePattern;
        };
        if (modelParts.length > 1) {
          const potentialName = modelParts[1].replace(/Network|Click to Update|Up to date|Online|Offline|Locate|Restart/gi, '').trim();
          if (isValidName(potentialName)) {
            deviceName = potentialName;
            isNewSwitch = true;
          }
        }
        if (!isNewSwitch && i + 1 < lines.length) {
          const nextLine = lines[i + 1].replace(/Network|Click to Update|Up to date|Online|Offline|Locate|Restart/gi, '').trim();
          if (isValidName(nextLine)) {
            deviceName = nextLine;
            isNewSwitch = true;
          }
        }
        if (isNewSwitch && currentModel) {
          let device = {
            nom: deviceName || currentModel,
            fabricant: 'Ubiquiti',
            modele: currentModel,
            ip: '',
            firmware: '',
            adresseMac: ''
          };
          let blockEnd = i + 25;
          const looksLikeName = s => {
            if (!s) return false;
            const t = s.trim();
            if (t.length < 2 || t.length > 60) return false;
            if (/^USW|^UDM/i.test(t)) return false;
            if (/^\d+\.\d+\.\d+$/.test(t)) return false;
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) return false;
            if (/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(t)) return false;
            return /[a-zA-Z]/.test(t);
          };
          for (let j = i + 2; j < Math.min(i + 25, lines.length); j++) {
            if (/^USW|^UDM/i.test(lines[j])) {
              const maybeName = j + 1 < lines.length ? lines[j + 1] : '';
              if (looksLikeName(maybeName)) {
                blockEnd = j;
                break;
              }
            }
          }
          const block = lines.slice(i, blockEnd).join(' ');
          const blockLines = lines.slice(i, blockEnd);
          const macMatch = block.match(/([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/i);
          if (macMatch) {
            device.adresseMac = macMatch[1];
            const macIndex = blockLines.findIndex(l => l.includes(macMatch[1]));
            if (macIndex >= 0) {
              for (let k = macIndex + 1; k < blockLines.length && k <= macIndex + 15; k++) {
                const currentLine = blockLines[k].trim();
                if (!device.firmware) {
                  const firmwareMatch = currentLine.match(/(\d+\.\d+\.\d+)/);
                  if (firmwareMatch && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentLine)) {
                    device.firmware = firmwareMatch[1];
                  }
                }
                if (!device.ip) {
                  const ipMatch = currentLine.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                  if (ipMatch) {
                    device.ip = ipMatch[1];
                  }
                }
                if (device.firmware && device.ip) {
                  break;
                }
              }
            }
          }
          if (!device.firmware) {
            for (let j = 0; j < blockLines.length; j++) {
              const line = blockLines[j].trim();
              const firmwareMatch = line.match(/(\d+\.\d+\.\d+)/);
              if (firmwareMatch && !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line)) {
                device.firmware = firmwareMatch[1];
                break;
              }
            }
          }
          if (!device.ip) {
            const allIpMatches = block.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
            if (allIpMatches && allIpMatches.length > 0) {
              for (const ip of allIpMatches) {
                const segments = ip.split('.');
                if (segments.every(s => parseInt(s) <= 255)) {
                  device.ip = ip;
                  break;
                }
              }
            }
          }
          const macKey = device.adresseMac;
          if (!macKey || seenMacs.has(macKey)) {} else {
            devices.push(device);
            seenMacs.add(macKey);
          }
        }
      }
      i++;
    }
    const macRegex = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i;
    const versionRegex = /^\d+\.\d+\.\d+$/;
    const ipRegex = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    for (let idx = 0; idx < lines.length; idx++) {
      const curr = lines[idx];
      if (macRegex.test(curr)) {
        const mac = curr.toLowerCase();
        if (seenMacs.has(mac)) continue;
        let name = '';
        for (let back = idx - 1; back >= 0 && back >= idx - 2; back--) {
          const candidate = lines[back];
          if (!candidate || macRegex.test(candidate) || versionRegex.test(candidate) || ipRegex.test(candidate)) continue;
          name = candidate;
          break;
        }
        let model = '';
        let firmware = '';
        let ip = '';
        let uptime = '';
        for (let fwd = idx + 1; fwd < Math.min(lines.length, idx + 10); fwd++) {
          const next = lines[fwd];
          if (!model && /^(USW|UDM)/i.test(next)) {
            model = next;
            continue;
          }
          if (!firmware && versionRegex.test(next)) {
            firmware = next;
            continue;
          }
          if (!ip && ipRegex.test(next)) {
            ip = next;
            continue;
          }
          if (!uptime) {
            if (/^\d+d\s+\d+h\s+\d+m\s+\d+s$/i.test(next)) {
              uptime = next;
              continue;
            }
            if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)$/i.test(next)) {
              uptime = next;
              continue;
            }
          }
        }
        if (!model) continue;
        const device = {
          nom: name || model,
          fabricant: 'Ubiquiti',
          modele: model,
          ip,
          firmware,
          adresseMac: mac
        };
        devices.push(device);
        seenMacs.add(mac);
      }
    }
    return devices;
  };
  const parseWifiAccessPoints = text => {
    const devicesMap = new Map();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/U\d+|UAP/i.test(line)) {
        let device = {
          nom: '',
          fabricant: 'Ubiquiti',
          modele: '',
          ip: '',
          firmware: '',
          numeroSerie: '',
          expirationWarranty: '',
          emplacement: '',
          supportsWifi6: false,
          bandes: {
            "2.4GHz": true,
            "5GHz": true,
            "6GHz": false
          },
          ssids: [],
          controleur: ''
        };
        const modelParts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
        if (modelParts.length > 0) {
          const firstPart = modelParts[0].trim();
          if (firstPart.includes('(')) {
            const baseModel = firstPart.split('(')[0].trim();
            device.modele = baseModel || firstPart;
            device.nom = firstPart;
          } else {
            device.modele = firstPart;
          }
          if (/U[67]|UAP-.*-6/i.test(device.modele)) {
            device.supportsWifi6 = true;
          }
          const sanitize = s => s.replace(/Network|Click to Update|Up to date|Online|Offline/gi, '').trim();
          const isUptime = s => {
            if (!s) return false;
            const t = s.trim();
            return /^\d+d(\s+\d+h)?(\s+\d+m)?(\s+\d+s)?$/i.test(t);
          };
          const isValidCandidate = s => {
            if (!s) return false;
            if (s === device.modele) return false;
            if (/^\d+\.\d+\.\d+$/.test(s)) return false;
            if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return false;
            if (/^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(s)) return false;
            if (/^Port\s+\d+/i.test(s)) return false;
            if (/^SFP/i.test(s)) return false;
            if (/GbE/i.test(s)) return false;
            if (/^\d+\s*\(\s*\d+\s*MHz\s*\)/i.test(s)) return false;
            if (/^Excellent$|^No\s+Clients$|^Good$/i.test(s)) return false;
            if (isUptime(s)) return false;
            return s.length >= 2 && s.length <= 60;
          };
          const isBoundary = raw => {
            const t = raw.trim();
            if (/^(Up to date|Click to Update|Online|Offline)$/i.test(t)) return true;
            if (/^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(t)) return true;
            if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(t)) return true;
            if (/^\d+\.\d+\.\d+$/.test(t)) return true;
            if (isUptime(t)) return true;
            return false;
          };
          let candidate = modelParts.length > 1 ? sanitize(modelParts[1]) : '';
          if (!isValidCandidate(candidate)) {
            for (let lookahead = 1; lookahead <= 12; lookahead++) {
              if (i + lookahead >= lines.length) break;
              const raw = lines[i + lookahead].trim();
              if (isBoundary(raw)) break;
              if (/^(U\d+\b|UAP\b)/i.test(raw)) continue;
              const c = sanitize(raw);
              if (isValidCandidate(c)) {
                candidate = c;
                break;
              }
            }
          }
          if (isValidCandidate(candidate)) {
            device.nom = candidate;
          }
        }
        const blockEnd = Math.min(i + 20, lines.length);
        const block = lines.slice(i, blockEnd).join(' ');
        const blockLines = lines.slice(i, blockEnd);
        const macMatch = block.match(/([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})/i);
        if (macMatch) {
          device.numeroSerie = macMatch[1];
          device.adresseMac = macMatch[1];
          const macIndex = blockLines.findIndex(l => l.includes(macMatch[1]));
          if (macIndex >= 0) {
            for (let k = macIndex + 1; k < blockLines.length && k <= macIndex + 15; k++) {
              const currentLine = blockLines[k].trim();
              if (!device.firmware) {
                const firmwareMatch = currentLine.match(/(\d+\.\d+\.\d+)/);
                if (firmwareMatch && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentLine)) {
                  device.firmware = firmwareMatch[1];
                }
              }
              if (!device.ip) {
                const ipMatch = currentLine.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                if (ipMatch) {
                  device.ip = ipMatch[1];
                }
              }
              if (device.firmware && device.ip) {
                break;
              }
            }
          }
        }
        if (!device.firmware) {
          for (let j = 0; j < blockLines.length; j++) {
            const line = blockLines[j].trim();
            const firmwareMatch = line.match(/(\d+\.\d+\.\d+)/);
            if (firmwareMatch && !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line)) {
              device.firmware = firmwareMatch[1];
              break;
            }
          }
        }
        if (!device.ip) {
          const allIpMatches = block.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
          if (allIpMatches && allIpMatches.length > 0) {
            for (const ip of allIpMatches) {
              const segments = ip.split('.');
              if (segments.every(s => parseInt(s) <= 255)) {
                device.ip = ip;
                break;
              }
            }
          }
        }
        const bandes24Match = block.match(/2\.4|24\s*GHz|\(20\s*MHz\)|\(40\s*MHz\)/i);
        const bandes5Match = block.match(/5\s*GHz|\(40\s*MHz\)|\(80\s*MHz\)|\(160\s*MHz\)|48\s*\(/i);
        const bandes6Match = block.match(/6\s*GHz|6E|\(6\s*\(/i);
        device.bandes = {
          "2.4GHz": !!bandes24Match || true,
          "5GHz": !!bandes5Match || true,
          "6GHz": !!bandes6Match || device.supportsWifi6 && block.match(/160\s*MHz/)
        };
        if (!device.nom && device.modele) {
          device.nom = device.modele;
        }
        if (device.modele && device.numeroSerie) {
          const key = device.numeroSerie;
          if (!devicesMap.has(key)) {
            devicesMap.set(key, device);
          } else {
            const existing = devicesMap.get(key);
            if (!existing.nom && device.nom) existing.nom = device.nom;
            if (!existing.ip && device.ip) existing.ip = device.ip;
            if (!existing.firmware && device.firmware) existing.firmware = device.firmware;
            if (!existing.modele && device.modele) existing.modele = device.modele;
            if (!existing.numeroSerie && device.numeroSerie) existing.numeroSerie = device.numeroSerie;
          }
        }
      }
      i++;
    }
    const macRegex = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i;
    const versionRegex = /^\d+\.\d+\.\d+$/;
    const ipRegex = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    const isStatus = s => /^(Up to date|Click to Update|Online|Offline|Locate|Restart)$/i.test(s);
    const isModel = s => /^(U\d+\b|UAP\b|U7\s+Outdoor\b)/i.test(s);
    const isPureModel = s => isModel(s) && !/[()]/.test(s);
    const isUptime = s => {
      if (!s) return false;
      const t = s.trim();
      return /^\d+d(\s+\d+h)?(\s+\d+m)?(\s+\d+s)?$/i.test(t);
    };
    for (let idx = 0; idx < lines.length; idx++) {
      const curr = lines[idx];
      if (macRegex.test(curr)) {
        const mac = curr;
        let name = '';
        for (let back = idx - 1; back >= 0 && back >= idx - 3; back--) {
          const candidate = lines[back];
          if (!candidate || isStatus(candidate) || isPureModel(candidate) || versionRegex.test(candidate) || ipRegex.test(candidate) || macRegex.test(candidate) || isUptime(candidate)) continue;
          name = candidate;
          break;
        }
        let model = '';
        let firmware = '';
        let ip = '';
        for (let fwd = idx + 1; fwd < Math.min(lines.length, idx + 6); fwd++) {
          const next = lines[fwd];
          if (!model && isModel(next)) {
            model = next;
            continue;
          }
          if (!firmware && versionRegex.test(next)) {
            firmware = next;
            continue;
          }
          if (!ip && ipRegex.test(next)) {
            ip = next;
            continue;
          }
        }
        if (!model) continue;
        const key = mac;
        const device = {
          nom: name,
          fabricant: 'Ubiquiti',
          modele: model,
          ip,
          firmware,
          numeroSerie: mac,
          adresseMac: mac,
          expirationWarranty: '',
          emplacement: '',
          supportsWifi6: /U[67]|UAP-.*-6/i.test(model),
          bandes: {
            '2.4GHz': true,
            '5GHz': true,
            '6GHz': false
          },
          ssids: [],
          controleur: ''
        };
        if (!devicesMap.has(key)) {
          devicesMap.set(key, device);
        } else {
          const existing = devicesMap.get(key);
          if (device.nom) existing.nom = device.nom;
          if (device.modele) existing.modele = device.modele || existing.modele;
          if (device.firmware) existing.firmware = device.firmware || existing.firmware;
          if (device.ip) existing.ip = device.ip || existing.ip;
          if (device.adresseMac) existing.adresseMac = device.adresseMac;
          if (device.numeroSerie) existing.numeroSerie = device.numeroSerie;
        }
      }
    }
    return Array.from(devicesMap.values());
  };
  const handleParse = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste text to import");
      return;
    }
    try {
      const devices = equipmentType === 'switch' ? parseSwitches(pastedText) : parseWifiAccessPoints(pastedText);
      if (devices.length === 0) {
        toast.error("No devices detected in the text. Check the format.");
        return;
      }
      setParsedDevices(devices);
      setSelectedDevices(new Set(devices.map((_, index) => index)));
      setPreviewMode(true);
      toast.success(`${devices.length} device(s) detected`);
    } catch (err) {
      console.error('Erreur parsing:', err);
      toast.error("Error parsing text");
    }
  };
  const handleImport = () => {
    if (selectedDevices.size === 0) {
      toast.error("Please select at least one device to import");
      return;
    }
    const devicesToImport = parsedDevices.filter((_, index) => selectedDevices.has(index));
    onImport(devicesToImport);
    toast.success(`${devicesToImport.length} device(s) imported successfully`);
    handleReset();
    onClose();
  };
  const handleReset = () => {
    setPastedText("");
    setParsedDevices([]);
    setSelectedDevices(new Set());
    setPreviewMode(false);
  };
  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);
  const toggleDeviceSelection = index => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDevices(newSelected);
  };
  const toggleAllSelection = () => {
    if (selectedDevices.size === parsedDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(parsedDevices.map((_, index) => index)));
    }
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
        scale: 0.97,
        opacity: 0
      }} animate={{
        scale: 1,
        opacity: 1
      }} exit={{
        scale: 0.97,
        opacity: 0
      }} onClick={e => e.stopPropagation()} style={{
        maxWidth: 860,
        width: '95%',
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
        background: '#f9fafb',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)'
      }}>
          <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          background: '#ffffff'
        }}>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1
          }}>
              <Icon icon="mdi:database-import" style={{
              fontSize: '24px',
              color: '#15d1a0'
            }} />
              <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.1rem'
            }}>
                <h3 style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 650,
                color: '#111827',
                textAlign: 'left'
              }}>
                  Import {equipmentType === 'switch' ? 'switches' : 'WiFi access points'}
                </h3>
                <span style={{
                fontSize: '0.85rem',
                color: '#6b7280',
                textAlign: 'left'
              }}>
                  Paste UniFi data, review, then import.
                </span>
              </div>
            </div>
            <button className={styles.closeButton} onClick={onClose} title="Close" style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            color: '#4b5563',
            transition: 'all 0.2s ease'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#d1d5db';
          }} onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}>
              <Icon icon="mdi:close" style={{
              fontSize: '18px'
            }} />
            </button>
          </div>

          <div style={{
          padding: '1.25rem 1.5rem 1.25rem 1.5rem',
          background: '#f9fafb'
        }}>
            {!previewMode ? <>
                <div style={{
              marginBottom: '0.85rem',
              color: '#6b7280',
              fontSize: '0.85rem',
              lineHeight: 1.5
            }}>
                  1) In UniFi Devices, filter {equipmentType === 'switch' ? 'switches' : 'APs'} (Name, MAC, Model, Version, IP, Uptime).<br />
                  2) Copy/paste the resulting table here. We will automatically detect devices.
                </div>
                <textarea value={pastedText} onChange={e => setPastedText(e.target.value)} placeholder={`Paste ${equipmentType === 'switch' ? 'switch' : 'WiFi access point'} text from UniFi here...`} style={{
              width: '100%',
              minHeight: '260px',
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#1a1a1a',
              fontSize: '0.875rem',
              fontFamily: 'SFMono-Regular, Consolas, Menlo, monospace',
              resize: 'vertical',
              transition: 'border-color 0.2s ease'
            }} onFocus={e => {
              e.target.style.borderColor = '#15d1a0';
              e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
            }} onBlur={e => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }} />
                <div style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
                  <button onClick={handleParse} disabled={!pastedText.trim()} title="Analyze" style={{
                padding: '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#15d1a0',
                color: 'white',
                cursor: pastedText.trim() ? 'pointer' : 'not-allowed',
                opacity: pastedText.trim() ? 1 : 0.5,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px'
              }} onMouseEnter={e => {
                if (pastedText.trim()) {
                  e.currentTarget.style.background = '#13ba8e';
                }
              }} onMouseLeave={e => {
                if (pastedText.trim()) {
                  e.currentTarget.style.background = '#15d1a0';
                }
              }}>
                    <Icon icon="mdi:magnify" style={{
                  fontSize: '18px'
                }} />
                  </button>
                </div>
              </> : <>
                <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
                  <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexWrap: 'wrap'
              }}>
                    <span style={{
                  fontWeight: 700,
                  color: '#1a1a1a'
                }}>{parsedDevices.length}</span>
                    <span style={{
                  color: '#6b7280'
                }}>device(s) detected</span>
                    <span style={{
                  color: '#d1d5db'
                }}>•</span>
                    <span style={{
                  fontWeight: 700,
                  color: '#1a1a1a'
                }}>{selectedDevices.size}</span>
                    <span style={{
                  color: '#6b7280'
                }}>selected</span>
                  </div>
                  <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                    <button onClick={handleReset} style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }} onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}>
                      Back
                    </button>
                    <button onClick={toggleAllSelection} style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #15d1a0',
                  background: selectedDevices.size === parsedDevices.length ? '#15d1a0' : 'transparent',
                  color: selectedDevices.size === parsedDevices.length ? 'white' : '#15d1a0',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  if (selectedDevices.size === parsedDevices.length) {
                    e.currentTarget.style.background = '#13ba8e';
                  } else {
                    e.currentTarget.style.background = '#f0fdfa';
                  }
                }} onMouseLeave={e => {
                  if (selectedDevices.size === parsedDevices.length) {
                    e.currentTarget.style.background = '#15d1a0';
                  } else {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}>
                      {selectedDevices.size === parsedDevices.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                </div>

                <div className={styles.devicesScrollable} style={{
              maxHeight: '420px',
              paddingRight: '0.25rem'
            }}>
                  {parsedDevices.map((device, index) => {
                const isSelected = selectedDevices.has(index);
                return <div key={index} onClick={() => toggleDeviceSelection(index)} style={{
                  marginBottom: '0.5rem',
                  cursor: 'pointer'
                }}>
                        <div className={styles.serverCard}>
                          <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleDeviceSelection(index)} onClick={e => e.stopPropagation()} style={{
                        cursor: 'pointer',
                        width: '18px',
                        height: '18px',
                        marginTop: '2px',
                        flexShrink: 0
                      }} />
                            <div className={styles.serverTitle}>
                              <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          flexWrap: 'wrap'
                        }}>
                                <span style={{
                            fontWeight: 600,
                            color: '#111827',
                            fontSize: '0.95rem'
                          }}>
                                  {device.nom || device.modele || `Device ${index + 1}`}
                                </span>
                                {device.modele && device.modele !== device.nom && <span style={{
                            color: '#6b7280',
                            fontSize: '0.8rem'
                          }}>{device.modele}</span>}
                              </div>
                              <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          fontSize: '0.8rem'
                        }}>
                                {device.ip && <span style={{
                            color: '#374151'
                          }}>
                                    <span style={{
                              color: '#9ca3af',
                              marginRight: 4
                            }}>IP</span>
                                    {device.ip}
                                  </span>}
                                {device.adresseMac && <span style={{
                            color: '#374151'
                          }}>
                                    <span style={{
                              color: '#9ca3af',
                              marginRight: 4
                            }}>MAC</span>
                                    {device.adresseMac}
                                  </span>}
                                {device.firmware && <span style={{
                            color: '#374151'
                          }}>
                                    <span style={{
                              color: '#9ca3af',
                              marginRight: 4
                            }}>FW</span>
                                    {device.firmware}
                                  </span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>;
              })}
                </div>

                <div style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
                  <button onClick={handleImport} disabled={selectedDevices.size === 0} style={{
                padding: '0.55rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: '#15d1a0',
                color: 'white',
                fontWeight: 700,
                cursor: selectedDevices.size === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedDevices.size === 0 ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }} onMouseEnter={e => {
                if (selectedDevices.size > 0) {
                  e.currentTarget.style.background = '#13ba8e';
                }
              }} onMouseLeave={e => {
                if (selectedDevices.size > 0) {
                  e.currentTarget.style.background = '#15d1a0';
                }
              }}>
                    Import ({selectedDevices.size})
                  </button>
                </div>
              </>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>;
};
export default ImportEquipmentsModal;
