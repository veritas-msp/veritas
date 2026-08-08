import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaWifi, FaSync } from "react-icons/fa";
import { Icon as IconifyIcon } from "@iconify/react";
import styles from "./Wifi.module.css";
import commonStyles from "./ModuleCommon.module.css";
import API_BASE_URL from "../../../config";
import { getCheckMKReportPeriodData } from "../../../api/checkmkReportPeriod";
import { toast } from "react-toastify";
import { scoreToLetter, scoreToColor, letterToScore } from "../../../utils/gradeUtils";
import LetterScale from "../common/LetterScale";
const toastOptions = {
  position: "bottom-right",
  autoClose: 3000
};
const defaultServices = ["CPU", "RAM", "TRAFIC", "UPTIME"];
const Wifi = ({
  config,
  setConfig,
  data,
  setData,
  onSyncAllCheckMKReady
}) => {
  const wifiList = config?.client?.equipements?.BorneWifi || [];
  const [checkmkMappings, setCheckmkMappings] = useState({});
  const [checkmkData, setCheckmkData] = useState({});
  const [loadingCheckMK, setLoadingCheckMK] = useState({});
  const getCheckMKMapping = useCallback(wifiNameOrId => {
    if (wifiNameOrId && checkmkMappings[wifiNameOrId]) {
      return checkmkMappings[wifiNameOrId];
    }
    const ap = wifiList.find(a => a.nom === wifiNameOrId);
    if (ap?.id && checkmkMappings[ap.id]) {
      return checkmkMappings[ap.id];
    }
    return null;
  }, [checkmkMappings, wifiList]);
  const [eventsCount, setEventsCount] = useState({});
  const [eventsData, setEventsData] = useState({});
  const [availabilityData, setAvailabilityData] = useState({});
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [animatedServices, setAnimatedServices] = useState({});
  const [animatedEvents, setAnimatedEvents] = useState({});
  const [animatedAvailability, setAnimatedAvailability] = useState({});
  const [animatedScore, setAnimatedScore] = useState({});
  const [scoreAnimationComplete, setScoreAnimationComplete] = useState({});
  const [editingScore, setEditingScore] = useState({});
  const [editingScoreValue, setEditingScoreValue] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [editingWifi, setEditingWifi] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const dataRef = useRef(data);
  useEffect(() => {
    if (!data) return;
    setOpenComments(prev => {
      const next = {
        ...prev
      };
      Object.keys(data).forEach(wifiName => {
        const isOpen = data[wifiName]?.isCommentOpen;
        if (typeof isOpen === 'boolean') {
          next[wifiName] = isOpen;
        }
      });
      return next;
    });
  }, [data]);
  const onSyncAllCheckMKReadyRef = useRef(onSyncAllCheckMKReady);
  const lastNotifiedSyncInfoRef = useRef({
    hasMappings: null,
    isLoading: null
  });
  const syncAllCheckMKRef = useRef(null);
  useEffect(() => {
    if (!config?.client?.id || !setConfig) return;
    const controller = new AbortController();
    const loadWifiFromDb = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clients/modules/${config.client.id}/wifi`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!res.ok) return;
        const rows = await res.json();
        const wifiList = (rows || []).map(row => {
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
                BorneWifi: wifiList
              }
            }
          };
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading WiFi access points:", err);
      }
    };
    loadWifiFromDb();
    return () => controller.abort();
  }, [config?.client?.id]);
  const updateComment = (wifiName, comment) => {
    const updated = {
      ...data,
      [wifiName]: {
        ...(data[wifiName] || {}),
        comment
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const toggleCommentVisibility = wifiName => {
    setOpenComments(prev => {
      const nextIsOpen = !prev[wifiName];
      const nextState = {
        ...prev,
        [wifiName]: nextIsOpen
      };
      const currentData = dataRef.current || data || {};
      const updated = {
        ...currentData,
        [wifiName]: {
          ...(currentData[wifiName] || {}),
          isCommentOpen: nextIsOpen
        }
      };
      setData(updated);
      dataRef.current = updated;
      return nextState;
    });
  };
  const applyManualScore = (wifiName, scoreValue) => {
    const updated = {
      ...data,
      [wifiName]: {
        ...(data[wifiName] || {}),
        manualHealthScore: scoreValue
      }
    };
    setData(updated);
    dataRef.current = updated;
  };
  const handleManualLetterSelect = (wifiName, letter) => {
    const scoreValue = letterToScore(letter);
    if (scoreValue === null) return;
    applyManualScore(wifiName, scoreValue);
  };
  const saveEditScore = wifiName => {
    const scoreValue = parseInt(editingScoreValue[wifiName], 10);
    if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
      const updated = {
        ...data,
        [wifiName]: {
          ...(data[wifiName] || {}),
          manualHealthScore: scoreValue
        }
      };
      setData(updated);
      dataRef.current = updated;
    }
    setEditingScore(prev => {
      const next = {
        ...prev
      };
      delete next[wifiName];
      return next;
    });
    setEditingScoreValue(prev => {
      const next = {
        ...prev
      };
      delete next[wifiName];
      return next;
    });
  };
  const cancelEditScore = wifiName => {
    setEditingScore(prev => {
      const next = {
        ...prev
      };
      delete next[wifiName];
      return next;
    });
    setEditingScoreValue(prev => {
      const next = {
        ...prev
      };
      delete next[wifiName];
      return next;
    });
  };
  const handleInputFocus = e => {
    e.target.select();
  };
  const getWifiInfo = ap => {
    const info = [];
    if (ap.fabricant && ap.modele) {
      info.push(`${ap.fabricant} ${ap.modele}`);
    } else if (ap.fabricant) {
      info.push(ap.fabricant);
    } else if (ap.modele) {
      info.push(ap.modele);
    }
    if (ap.numeroSerie) {
      info.push(`S/N: ${ap.numeroSerie}`);
    }
    if (ap.ip) {
      info.push(ap.ip);
    }
    if (ap.firmware) {
      info.push(`FW ${ap.firmware}`);
    }
    return {
      info
    };
  };
  const saveWifi = async (wifiId, wifiData) => {
    const clientId = config?.client?.id;
    if (!clientId) {
      throw new Error("ID client manquant");
    }
    const {
      id,
      __fromDb,
      __index,
      ...dataForDb
    } = wifiData;
    const body = {
      item_key: wifiData.nom || `wifi-${wifiId}`,
      name: wifiData.nom || `WiFi Access Point`,
      data: dataForDb,
      is_active: true
    };
    const method = wifiId ? "PUT" : "POST";
    const url = wifiId ? `${API_BASE_URL}/clients/modules/${clientId}/bornes-wifi/${wifiId}` : `${API_BASE_URL}/clients/modules/${clientId}/bornes-wifi`;
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
  const handleSaveWifi = async () => {
    if (!editingWifi || !editForm) return;
    setIsSaving(true);
    try {
      const updatedWifi = {
        ...editingWifi,
        nom: editForm.nom,
        ip: editForm.ip || '',
        site: editForm.site || '',
        fabricant: editForm.fabricant || '',
        modele: editForm.modele || '',
        firmware: editForm.firmware || '',
        numeroSerie: editForm.numeroSerie || '',
        adresseMac: editForm.adresseMac || '',
        vlan: editForm.vlan || '',
        ssids: editForm.ssids || [],
        bandes: editForm.bandes || {}
      };
      const savedRow = await saveWifi(editingWifi.id, updatedWifi);
      setConfig(prev => {
        if (!prev?.client?.equipements?.BorneWifi) return prev;
        const updatedList = prev.client.equipements.BorneWifi.map(wifi => {
          if (wifi.id === editingWifi.id) {
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
          return wifi;
        });
        return {
          ...prev,
          client: {
            ...prev.client,
            equipements: {
              ...prev.client.equipements,
              BorneWifi: updatedList
            }
          }
        };
      });
      toast.success("WiFi access point updated", toastOptions);
      setEditingWifi(null);
      setEditForm(null);
    } catch (error) {
      console.error("Error while saving:", error);
      toast.error("Error while saving", toastOptions);
    } finally {
      setIsSaving(false);
    }
  };
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
            const isWifiType = ['bornewifi', 'borne wifi', 'wifi'].includes(type);
            if (isWifiType && m.is_active !== false && m.equipment_id) {
              mappingsMap[m.equipment_id] = m;
            }
          });
          setCheckmkMappings(mappingsMap);
        }
      } catch (error) {
        console.error('Error loading Check MK mappings:', error);
      }
    };
    loadMappings();
  }, [config?.client?.id]);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    if (!wifiList.length || !data) return;
    wifiList.forEach(ap => {
      const wifiData = data[ap.nom];
      if (wifiData) {
        if (wifiData.checkmkData) {
          setCheckmkData(prev => ({
            ...prev,
            [ap.nom]: wifiData.checkmkData
          }));
        }
        if (wifiData.eventsCount !== undefined) {
          setEventsCount(prev => ({
            ...prev,
            [ap.nom]: wifiData.eventsCount
          }));
        }
        if (wifiData.eventsData) {
          setEventsData(prev => ({
            ...prev,
            [ap.nom]: wifiData.eventsData
          }));
        }
        if (wifiData.availabilityData) {
          setAvailabilityData(prev => ({
            ...prev,
            [ap.nom]: wifiData.availabilityData
          }));
        }
      }
    });
  }, [wifiList, data]);
  const loadEventsCount = async (wifiName, checkmkHostName) => {
    if (!checkmkHostName) return;
    const period = getReportPeriod();
    if (!period.start_time || !period.end_time) {
      setEventsCount(prev => ({
        ...prev,
        [wifiName]: 0
      }));
      return;
    }
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/events-period/${encodeURIComponent(checkmkHostName)}`);
      url.searchParams.append('start_time', period.start_time);
      url.searchParams.append('end_time', period.end_time);
      const mapping = getCheckMKMapping(wifiName);
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
          [wifiName]: eventsCountValue
        }));
        setEventsData(prev => ({
          ...prev,
          [wifiName]: eventsDataValue
        }));
        const currentData = dataRef.current || {};
        const updated = {
          ...currentData,
          [wifiName]: {
            ...(currentData[wifiName] || {}),
            eventsCount: eventsCountValue,
            eventsData: eventsDataValue
          }
        };
        setData(updated);
        dataRef.current = updated;
      } else {
        setEventsCount(prev => ({
          ...prev,
          [wifiName]: 0
        }));
      }
    } catch (error) {
      console.error(`Error fetching events for ${wifiName}:`, error);
      setEventsCount(prev => ({
        ...prev,
        [wifiName]: 0
      }));
    }
  };
  const loadAvailabilityData = async (wifiName, checkmkHostName) => {
    if (!checkmkHostName) return;
    try {
      const url = new URL(`${API_BASE_URL}/checkmk/availability-table/${encodeURIComponent(checkmkHostName)}`);
      const mapping = getCheckMKMapping(wifiName);
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
          [wifiName]: availabilityValue
        }));
        const currentData = dataRef.current || {};
        const updated = {
          ...currentData,
          [wifiName]: {
            ...(currentData[wifiName] || {}),
            availabilityData: availabilityValue
          }
        };
        setData(updated);
        dataRef.current = updated;
      }
    } catch (error) {
      console.error(`Error fetching availability for ${wifiName}:`, error);
    }
  };
  const loadCheckMKData = async (wifiName, checkmkHostName, showToasts = true) => {
    if (!checkmkHostName || loadingCheckMK[wifiName]) return;
    const currentDataBeforeSync = dataRef.current || {};
    const updatedBeforeSync = {
      ...currentDataBeforeSync,
      [wifiName]: {
        ...(currentDataBeforeSync[wifiName] || {}),
        manualHealthScore: undefined
      }
    };
    setData(updatedBeforeSync);
    dataRef.current = updatedBeforeSync;
    setAnimatedScore(prev => ({
      ...prev,
      [wifiName]: 0
    }));
    setScoreAnimationComplete(prev => ({
      ...prev,
      [wifiName]: false
    }));
    setLoadingCheckMK(prev => ({
      ...prev,
      [wifiName]: true
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
          [wifiName]: checkmkDataValue
        }));
        const currentData = dataRef.current || {};
        const updated = {
          ...currentData,
          [wifiName]: {
            ...(currentData[wifiName] || {}),
            checkmkData: checkmkDataValue,
            lastSyncDate: new Date().toISOString()
          }
        };
        setData(updated);
        dataRef.current = updated;
        const periodReport = getReportPeriod();
        const mapping = getCheckMKMapping(wifiName);
        if (periodReport?.start_time && periodReport?.end_time) {
          try {
            const reportData = await getCheckMKReportPeriodData(checkmkHostName, periodReport.start_time, periodReport.end_time, mapping?.checkmk_site || null);
            const ev = reportData?.events || {};
            const av = reportData?.availability || {};
            setEventsCount(prev => ({
              ...prev,
              [wifiName]: ev.events_count || 0
            }));
            setEventsData(prev => ({
              ...prev,
              [wifiName]: ev.events || []
            }));
            if (av.availability) {
              setAvailabilityData(prev => ({
                ...prev,
                [wifiName]: av.availability
              }));
            } else {
              await loadAvailabilityData(wifiName, checkmkHostName);
            }
          } catch (e) {
            await Promise.all([loadEventsCount(wifiName, checkmkHostName), loadAvailabilityData(wifiName, checkmkHostName)]);
          }
        } else {
          await Promise.all([loadEventsCount(wifiName, checkmkHostName), loadAvailabilityData(wifiName, checkmkHostName)]);
        }
        setTimeout(() => {
          const finalScore = getWifiHealthScore(wifiName);
          if (finalScore !== null) {
            setAnimatedScore(prev => ({
              ...prev,
              [wifiName]: 0
            }));
            setScoreAnimationComplete(prev => ({
              ...prev,
              [wifiName]: false
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
                [wifiName]: Math.round(newValue)
              }));
              if (currentStep >= steps) {
                clearInterval(scoreTimer);
                setAnimatedScore(prev => ({
                  ...prev,
                  [wifiName]: finalScore
                }));
                setTimeout(() => {
                  setScoreAnimationComplete(prev => ({
                    ...prev,
                    [wifiName]: true
                  }));
                }, 100);
              }
            }, duration / steps);
          }
          const finalServices = services.length;
          if (finalServices > 0) {
            setAnimatedServices(prev => ({
              ...prev,
              [wifiName]: 0
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
                [wifiName]: Math.round(newValue)
              }));
              if (currentStep >= steps) {
                clearInterval(servicesTimer);
                setAnimatedServices(prev => ({
                  ...prev,
                  [wifiName]: finalServices
                }));
              }
            }, duration / steps);
          }
          const finalEvents = eventsCount[wifiName];
          if (finalEvents !== undefined) {
            setAnimatedEvents(prev => ({
              ...prev,
              [wifiName]: 0
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
                [wifiName]: Math.round(newValue)
              }));
              if (currentStep >= steps) {
                clearInterval(eventsTimer);
                setAnimatedEvents(prev => ({
                  ...prev,
                  [wifiName]: finalEvents
                }));
              }
            }, duration / steps);
          }
          const availability = availabilityData[wifiName];
          if (availability && availability.up !== undefined) {
            const finalAvailability = parseFloat(availability.up || 0);
            setAnimatedAvailability(prev => ({
              ...prev,
              [wifiName]: 0
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
                [wifiName]: Math.round(newValue)
              }));
              if (currentStep >= steps) {
                clearInterval(availabilityTimer);
                setAnimatedAvailability(prev => ({
                  ...prev,
                  [wifiName]: finalAvailability
                }));
              }
            }, duration / steps);
          }
        }, 100);
      } else {}
    } catch (error) {
      console.error('Error fetching Check MK services:', error);
    } finally {
      setLoadingCheckMK(prev => ({
        ...prev,
        [wifiName]: false
      }));
    }
  };
  const syncAllCheckMK = useCallback(async () => {
    const mappedWifis = wifiList.filter(ap => ap.id && checkmkMappings[ap.id]);
    if (mappedWifis.length === 0) {
      toast.warning('No WiFi access point mapped with Check MK', toastOptions);
      return;
    }
    const syncPromises = mappedWifis.map(ap => loadCheckMKData(ap.nom, checkmkMappings[ap.id].checkmk_host_name, false));
    try {
      await Promise.all(syncPromises);
      toast.success(`Synchronization completed`, toastOptions);
    } catch (error) {
      toast.error(`Error during synchronization`, toastOptions);
    }
  }, [wifiList, checkmkMappings]);
  useEffect(() => {
    syncAllCheckMKRef.current = syncAllCheckMK;
  }, [syncAllCheckMK]);
  useEffect(() => {
    onSyncAllCheckMKReadyRef.current = onSyncAllCheckMKReady;
  }, [onSyncAllCheckMKReady]);
  useEffect(() => {
    if (onSyncAllCheckMKReadyRef.current && syncAllCheckMKRef.current) {
      const hasMappings = wifiList.some(ap => ap.id && checkmkMappings[ap.id]);
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
  }, [checkmkMappings, loadingCheckMK, wifiList]);
  const getProgressiveColor = value => {
    if (value >= 99) return '#10b981';
    if (value >= 95) return '#22c55e';
    if (value >= 80) return '#f59e0b';
    return '#ef4444';
  };
  const getWifiHealthScore = wifiName => {
    const wifiData = data?.[wifiName];
    const mapping = getCheckMKMapping(wifiName);
    if (!mapping) {
      return null;
    }
    let score = 0;
    let weightSum = 0;
    let hasEvents = false;
    const periodEventsCount = eventsCount[wifiName];
    if (periodEventsCount !== undefined && periodEventsCount > 0) {
      hasEvents = true;
    }
    let availabilityValue = 100;
    if (availabilityData[wifiName] && availabilityData[wifiName].up !== undefined) {
      availabilityValue = parseFloat(availabilityData[wifiName].up || 0);
    }
    let availabilityScore = availabilityValue;
    if (availabilityValue < 80) {
      availabilityScore = Math.min(availabilityValue, 50);
    } else if (availabilityValue < 95) {
      availabilityScore = Math.min(availabilityValue, 70);
    }
    score += availabilityScore * 0.5;
    weightSum += 0.5;
    let eventsScore = 100;
    if (periodEventsCount !== undefined) {
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
    score += eventsScore * 0.5;
    weightSum += 0.5;
    let finalScore = weightSum > 0 ? score / weightSum : 100;
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
    return Math.round(finalScore);
  };
  useEffect(() => {
    if (!wifiList.length || data && Object.keys(data).length > 0) return;
    const initializedData = {};
    wifiList.forEach(ap => {
      initializedData[ap.nom] = {
        comment: ""
      };
    });
    setData(initializedData);
  }, [wifiList, data, setData]);
  if (!wifiList || wifiList.length === 0) {
    return <div className={styles.container}>
                <div className={styles.emptyState}>
                    <p>No WiFi access point configured for this client.</p>
                    <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
                        <strong>🔍 Debug - Equipment in database:</strong>
                        <pre style={{
            marginTop: '0.5rem',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
                            {JSON.stringify({
              clientId: config?.client?.id,
              clientName: config?.client?.name,
              equipementsBorneWifi: config?.client?.equipements?.BorneWifi || [],
              nombreWifi: config?.client?.equipements?.BorneWifi?.length || 0,
              modules_monitoring_BorneWifi: config?.client?.modules_monitoring?.BorneWifi,
              tousEquipements: config?.client?.equipements
            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>;
  }
  const groupedBySite = wifiList.reduce((acc, ap) => {
    const siteName = ap.site || "No site";
    if (!acc[siteName]) {
      acc[siteName] = [];
    }
    acc[siteName].push(ap);
    return acc;
  }, {});
  const sortedSites = Object.keys(groupedBySite).sort((a, b) => {
    if (a === "No site") return 1;
    if (b === "No site") return -1;
    return a.localeCompare(b);
  });
  return <div className={styles.container}>
            {sortedSites.map(siteName => {
      const siteWifis = groupedBySite[siteName];
      return <div key={siteName} style={{
        marginBottom: '2rem'
      }} id={`site-${siteName}`} data-site-label={siteName}>
                        <div style={{
          marginBottom: '1rem'
        }}>
                            <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            paddingBottom: '0.5rem',
            borderBottom: '3px solid var(--border-primary)',
            display: 'inline-block',
            minWidth: '120px'
          }}>
                                {siteName}
                                {siteWifis.length > 0 && <span style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginLeft: '1rem'
            }}>
                                        {siteWifis.length} borne{siteWifis.length > 1 ? 's' : ''} WiFi
                                    </span>}
                            </h2>
            </div>
            <div className={styles.wifiGrid}>
                            {siteWifis.sort((a, b) => a.nom.localeCompare(b.nom)).map((ap, i) => {
            const needsSyncWarning = Boolean(ap.id && checkmkMappings[ap.id] && !data?.[ap.nom]?.lastSyncDate && !loadingCheckMK[ap.nom]);
            return <div key={i} className={`${styles.wifiCard} ${styles.withComment}`}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerLeft}>
                                        <div className={styles.wifiInfo}>
                                            <h3 className={styles.wifiName}>
                                                <FaWifi style={{
                        marginRight: '0.5rem',
                        fontSize: '1.2rem',
                        color: 'var(--text-secondary)',
                        verticalAlign: 'middle'
                      }} />
                                                {ap.nom}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className={styles.wifiType}>
                                        {}
                                        <div className={styles.buttonGroup}>
                                            {ap.id && checkmkMappings[ap.id] && <button type="button" className={`${styles.syncButton} ${needsSyncWarning ? styles.syncButtonWarning : ''}`} onClick={() => {
                      if (!loadingCheckMK[ap.nom]) {
                        loadCheckMKData(ap.nom, checkmkMappings[ap.id].checkmk_host_name);
                      }
                    }} title={`Mapped to Check MK: ${checkmkMappings[ap.id].checkmk_host_name}. Click to sync.`} disabled={loadingCheckMK[ap.nom]} style={{
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
                      cursor: loadingCheckMK[ap.nom] ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: loadingCheckMK[ap.nom] ? 0.5 : 1,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }} onMouseEnter={e => {
                      if (!loadingCheckMK[ap.nom]) {
                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }
                    }} onMouseLeave={e => {
                      if (!loadingCheckMK[ap.nom]) {
                        e.currentTarget.style.borderColor = 'var(--border-secondary)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }
                    }}>
                                                    <IconifyIcon icon="material-symbols:sync" width={14} height={14} className={loadingCheckMK[ap.nom] ? styles.loadingIcon : ''} />
                                                </button>}
                                            <button type="button" className={commonStyles.editButton} onClick={() => {
                      setEditingWifi(ap);
                      setEditForm({
                        nom: ap.nom || '',
                        ip: ap.ip || '',
                        site: ap.site || '',
                        fabricant: ap.fabricant || '',
                        modele: ap.modele || '',
                        firmware: ap.firmware || '',
                        numeroSerie: ap.numeroSerie || '',
                        adresseMac: ap.adresseMac || '',
                        vlan: ap.vlan || '',
                        ssids: ap.ssids || [],
                        bandes: ap.bandes || {}
                      });
                    }} title="Edit WiFi access point">
                                                <IconifyIcon icon="material-symbols:edit" width={14} height={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                const {
                  info
                } = getWifiInfo(ap);
                return info.length > 0 && <div className={`${commonStyles.moduleMeta} ${styles.wifiMetaFlex}`}>
                                            <span style={{
                    flex: 1
                  }}>
                                                {info.join(" • ")}
                                            </span>
                                        </div>;
              })()}

                                {}
                                {ap.id && getCheckMKMapping(ap.id) && <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '0.5rem',
                alignItems: 'stretch',
                marginBottom: '0.5rem'
              }}>
                                {loadingCheckMK[ap.nom] ? <div className={styles.loadingWrapper}>
                                        <IconifyIcon icon="material-symbols:sync" width={32} height={32} className={styles.loadingIcon} />
                                        <span className={styles.loadingText}>
                                            Synchronization en cours
                                        </span>
                                    </div> : <>
                                {}
                                {(() => {
                    const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                    const isMapped = Boolean(mapping);
                    const hasSyncData = Boolean(data?.[ap.nom]?.lastSyncDate);
                    const shouldShowNA = isMapped && !hasSyncData;
                    const calculatedScore = shouldShowNA ? null : getWifiHealthScore(ap.nom);
                    const manualScore = data?.[ap.nom]?.manualHealthScore;
                    const globalScore = shouldShowNA ? null : manualScore !== undefined ? manualScore : calculatedScore;
                    const isLoading = loadingCheckMK[ap.nom];
                    const isAnimating = animatedScore[ap.nom] !== undefined && !scoreAnimationComplete[ap.nom];
                    const isEditing = editingScore[ap.nom];
                    const scoreBreakdown = mapping ? [{
                      label: "Availability",
                      description: "UP rate monitored by CheckMK",
                      weight: "50 pts"
                    }, {
                      label: "Events",
                      description: "Alerts detected over the period",
                      weight: "50 pts"
                    }] : [];
                    const placeholderScore = 95;
                    let displayScore = null;
                    if (!isLoading) {
                      if (shouldShowNA) {
                        displayScore = placeholderScore;
                      } else {
                        displayScore = isAnimating ? animatedScore[ap.nom] : globalScore;
                      }
                    }
                    const displayLetter = displayScore !== null ? scoreToLetter(displayScore) : null;
                    const scoreLetter = globalScore !== null ? scoreToLetter(globalScore) : null;
                    const scoreColor = scoreLetter ? scoreToColor(globalScore) : '#9ca3af';
                    const displayColor = shouldShowNA ? '#9ca3af' : displayScore !== null ? scoreToColor(displayScore) : scoreColor;
                    if (globalScore === null && !isLoading && !shouldShowNA) {
                      return null;
                    }
                    const manualScoreChanged = manualScore !== undefined && calculatedScore !== null && manualScore !== calculatedScore;
                    return <div className={styles.scoreCardLeft} style={{
                      opacity: isLoading ? 0.6 : 1
                    }}>
                                            {!isLoading && displayScore !== null && <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}>
                                                    {isEditing ? <input type="number" min="0" max="100" value={editingScoreValue[ap.nom] !== undefined ? editingScoreValue[ap.nom] : displayScore} onChange={e => setEditingScoreValue(prev => ({
                          ...prev,
                          [ap.nom]: e.target.value
                        }))} onBlur={() => saveEditScore(ap.nom)} onKeyDown={e => {
                          if (e.key === 'Enter') {
                            saveEditScore(ap.nom);
                          } else if (e.key === 'Escape') {
                            cancelEditScore(ap.nom);
                          }
                        }} autoFocus style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: scoreColor,
                          lineHeight: '1',
                          width: '60px',
                          border: `2px solid ${scoreColor}`,
                          borderRadius: '4px',
                          padding: '0.25rem',
                          background: 'var(--bg-primary)',
                          textAlign: 'center'
                        }} /> : <div role="button" tabIndex={displayScore !== null ? 0 : -1} onKeyDown={e => {
                          if (displayScore !== null && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setEditingScore(prev => ({
                              ...prev,
                              [ap.nom]: true
                            }));
                            setEditingScoreValue(prev => ({
                              ...prev,
                              [ap.nom]: displayScore
                            }));
                          }
                        }} title={displayScore !== null ? "Click to select a grade, double-click to edit precisely" : ""} className={`${displayScore !== null ? styles.scoreLetterWrapper : styles.scoreLetterWrapperDisabled} ${shouldShowNA ? styles.scoreLetterWrapperGrayscale : ''}`}>
                                                            <LetterScale activeLetter={displayLetter} letters={["F", "E", "D", "C", "B", "A"]} size="compact" onSelect={!isLoading ? letter => handleManualLetterSelect(ap.nom, letter) : undefined} highlightLetter={!shouldShowNA && manualScoreChanged && calculatedScore !== null && !isEditing ? scoreToLetter(calculatedScore) : null} />
                                                        </div>}
                                                </div>}
                                        </div>;
                  })()}

                                {}
                                <div className={styles.statsGrid}>
                                    {}
                                    <div className={`${styles.statCard} ${loadingCheckMK[ap.nom] ? styles.statCardDisabled : checkmkData[ap.nom] ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                      const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                      if (mapping && checkmkData[ap.nom]) {
                        setHoveredTooltip({
                          type: 'services',
                          wifiName: ap.nom,
                          mouseX: e.clientX,
                          mouseY: e.clientY
                        });
                      }
                    }} onMouseMove={e => {
                      const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                      if (mapping && checkmkData[ap.nom] && hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.wifiName === ap.nom) {
                        setHoveredTooltip({
                          type: 'services',
                          wifiName: ap.nom,
                          mouseX: e.clientX,
                          mouseY: e.clientY
                        });
                      }
                    }} onMouseLeave={() => {
                      if (hoveredTooltip && hoveredTooltip.type === 'services' && hoveredTooltip.wifiName === ap.nom) {
                        setHoveredTooltip(null);
                      }
                    }}>
                                        <IconifyIcon icon="material-symbols-light:view-module" width={22} height={22} className={styles.statIcon} />
                                        {!(ap.id && getCheckMKMapping(ap.id)) ? <div className={styles.statCardNotMapped}>
                                                <div className={styles.statValueNotMapped}>
                                                    N/A
                                                </div>
                                                <div className={styles.statLabelNotMapped}>
                                                    Not mapped
                                                </div>
                                            </div> : loadingCheckMK[ap.nom] ? <div className={styles.loadingRow}>
                                                <FaSync className={styles.loadingIconSmall} />
                                                Loading...
                                            </div> : <div className={`${styles.statValue} ${checkmkData[ap.nom] ? styles.statValuePrimary : styles.statValueSecondary}`}>
                                                {checkmkData[ap.nom] ? animatedServices[ap.nom] !== undefined ? animatedServices[ap.nom] : checkmkData[ap.nom].services?.length || 0 : 'N/A'}
                                            </div>}
                                    </div>
                                    
                                    {}
                                    <div className={`${styles.statCard} ${loadingCheckMK[ap.nom] ? styles.statCardDisabled : eventsCount[ap.nom] !== undefined ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                      const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                      if (mapping && eventsData[ap.nom] && eventsData[ap.nom].length > 0) {
                        setHoveredTooltip({
                          type: 'events',
                          wifiName: ap.nom,
                          mouseX: e.clientX,
                          mouseY: e.clientY
                        });
                      }
                    }} onMouseMove={e => {
                      const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                      if (mapping && eventsData[ap.nom] && eventsData[ap.nom].length > 0 && hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.wifiName === ap.nom) {
                        setHoveredTooltip({
                          type: 'events',
                          wifiName: ap.nom,
                          mouseX: e.clientX,
                          mouseY: e.clientY
                        });
                      }
                    }} onMouseLeave={() => {
                      if (hoveredTooltip && hoveredTooltip.type === 'events' && hoveredTooltip.wifiName === ap.nom) {
                        setHoveredTooltip(null);
                      }
                    }}>
                                        <IconifyIcon icon="mingcute:alert-fill" width={22} height={22} className={styles.statIcon} />
                                        {!(ap.id && getCheckMKMapping(ap.id)) ? <div className={styles.statCardNotMapped}>
                                                <div className={styles.statValueNotMapped}>
                                                    N/A
                                                </div>
                                                <div className={styles.statLabelNotMapped}>
                                                    Not mapped
                                                </div>
                                            </div> : loadingCheckMK[ap.nom] ? <div className={styles.loadingRow}>
                                                <FaSync className={styles.loadingIconSmall} />
                                                Loading...
                                            </div> : <div className={`${styles.statValue} ${eventsCount[ap.nom] !== undefined ? eventsCount[ap.nom] > 0 ? styles.statValueEventsWarning : styles.statValueEventsNormal : styles.statValueSecondary}`}>
                                                {eventsCount[ap.nom] !== undefined ? animatedEvents[ap.nom] !== undefined ? animatedEvents[ap.nom] : eventsCount[ap.nom] : 'N/A'}
                                            </div>}
                                    </div>
                                    
                                    {}
                                    <div className={`${styles.statCard} ${loadingCheckMK[ap.nom] ? styles.statCardDisabled : availabilityData[ap.nom] ? styles.statCardEnabled : styles.statCardDefault}`} onMouseEnter={e => {
                      const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                      if (mapping && availabilityData[ap.nom]) {
                        setHoveredTooltip({
                          type: 'availability',
                          wifiName: ap.nom,
                          mouseX: e.clientX,
                          mouseY: e.clientY
                        });
                      }
                    }} onMouseMove={e => {
                      const mapping = ap.id ? getCheckMKMapping(ap.id) : null;
                      if (mapping && availabilityData[ap.nom] && hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.wifiName === ap.nom) {
                        setHoveredTooltip({
                          type: 'availability',
                          wifiName: ap.nom,
                          mouseX: e.clientX,
                          mouseY: e.clientY
                        });
                      }
                    }} onMouseLeave={() => {
                      if (hoveredTooltip && hoveredTooltip.type === 'availability' && hoveredTooltip.wifiName === ap.nom) {
                        setHoveredTooltip(null);
                      }
                    }}>
                                        <IconifyIcon icon="tabler:gauge" width={22} height={22} className={styles.statIcon} />
                                        {!(ap.id && getCheckMKMapping(ap.id)) ? <div className={styles.statCardNotMapped}>
                                                <div className={styles.statValueNotMapped}>
                                                    N/A
                                                </div>
                                                <div className={styles.statLabelNotMapped}>
                                                    Not mapped
                                                </div>
                                            </div> : loadingCheckMK[ap.nom] ? <div className={styles.loadingRow}>
                                                <FaSync className={styles.loadingIconSmall} />
                                                Loading...
                                            </div> : <div className={styles.statValueAvailability} style={{
                        color: availabilityData[ap.nom] && availabilityData[ap.nom].up !== undefined ? (() => {
                          const displayValue = animatedAvailability[ap.nom] !== undefined ? animatedAvailability[ap.nom] : parseFloat(availabilityData[ap.nom].up || 0);
                          return getProgressiveColor(displayValue);
                        })() : 'var(--text-secondary)'
                      }}>
                                                {availabilityData[ap.nom] && availabilityData[ap.nom].up !== undefined ? `${animatedAvailability[ap.nom] !== undefined ? animatedAvailability[ap.nom] : Math.round(parseFloat(availabilityData[ap.nom].up || 0))}%` : 'N/A'}
                                            </div>}
                                    </div>
                                </div>
                                </>}
                                </div>}

                                {}
                                <textarea id={`comment-${ap.nom}`} value={data?.[ap.nom]?.comment || ""} onChange={e => updateComment(ap.nom, e.target.value)} onFocus={e => e.target.select()} placeholder="Comment..." style={{
                width: '100%',
                padding: '6px 8px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'inherit',
                resize: 'none',
                minHeight: '45px',
                maxHeight: '100px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
                marginTop: '0.5rem'
              }} rows="2" />
                            </div>;
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
                    {hoveredTooltip.type === 'score' && <div>
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
                        </div>}
                    {hoveredTooltip.type === 'availability' && availabilityData[hoveredTooltip.wifiName] && <div>
                            <div style={{
          fontSize: '0.9rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem'
        }}>
                                Availability
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
                                UP / DOWN time over the period.
                            </div>
                            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          fontSize: '0.8rem'
        }}>
                                {availabilityData[hoveredTooltip.wifiName].up !== undefined && <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '2rem'
          }}>
                                        <span style={{
              color: 'var(--text-secondary)'
            }}>UP:</span>
                                        <span style={{
              fontWeight: '600',
              color: '#10b981'
            }}>
                                            {Math.round(parseFloat(availabilityData[hoveredTooltip.wifiName].up || 0))} %
                                        </span>
                                    </div>}
                                {availabilityData[hoveredTooltip.wifiName].down !== undefined && <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '2rem'
          }}>
                                        <span style={{
              color: 'var(--text-secondary)'
            }}>DOWN:</span>
                                        <span style={{
              fontWeight: '600',
              color: '#ef4444'
            }}>
                                            {Math.round(parseFloat(availabilityData[hoveredTooltip.wifiName].down || 0))} %
                                        </span>
                                    </div>}
                            </div>
                        </div>}
                    {hoveredTooltip.type === 'services' && checkmkData[hoveredTooltip.wifiName] && <div>
                            <div style={{
          fontSize: '0.9rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem'
        }}>
                                Monitored services
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
                                Services monitored by Check MK for this equipment.
                            </div>
                            <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.375rem',
          maxHeight: '300px',
          overflowY: 'auto',
          width: '100%'
        }}>
                                {(() => {
            const services = checkmkData[hoveredTooltip.wifiName].serviceInfo?.services || checkmkData[hoveredTooltip.wifiName].services || [];
            if (services.length === 0) {
              return <div style={{
                color: 'var(--text-secondary)',
                fontSize: '0.8rem'
              }}>No service</div>;
            }
            return services.map((service, idx) => {
              const serviceName = service.title || service.id || service.name || `Service ${idx + 1}`;
              return <span key={idx} style={{
                padding: '0.25rem 0.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: 'var(--text-primary)'
              }}>
                                                {serviceName}
                                            </span>;
            });
          })()}
                            </div>
                        </div>}
                    {hoveredTooltip.type === 'events' && eventsData[hoveredTooltip.wifiName] && eventsData[hoveredTooltip.wifiName].length > 0 && <div>
                            <div style={{
          fontSize: '0.9rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '0.25rem'
        }}>
                                Events et notifications
                            </div>
                            <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem'
        }}>
                                {eventsCount[hoveredTooltip.wifiName] || 0} event(s) over the period.
                            </div>
                            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '0.8rem'
        }}>
                                {eventsData[hoveredTooltip.wifiName].slice(0, 10).map((event, idx) => {
            let eventText = '';
            if (Array.isArray(event)) {
              eventText = event[2] || event[1] || 'Event';
            } else {
              eventText = event.message || event.text || event.title || 'Event';
            }
            return <div key={idx} style={{
              padding: '0.375rem',
              background: 'var(--bg-secondary)',
              borderRadius: '4px',
              color: 'var(--text-primary)'
            }}>
                                            {eventText}
                                        </div>;
          })}
                                {eventsData[hoveredTooltip.wifiName].length > 10 && <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            fontStyle: 'italic'
          }}>
                                        ... et {eventsData[hoveredTooltip.wifiName].length - 10} autre(s)
                                    </div>}
                            </div>
                        </div>}
                </div>}

            {}
            {editingWifi && editForm && <div className={styles.editModalOverlay}>
                <div className={`${styles.editModalContent} ${styles.editModalContentLarge}`} onClick={e => e.stopPropagation()}>
                    <div className={styles.editModalHeader}>
                        <h3 className={styles.editModalTitle}>
                            <IconifyIcon icon="material-symbols:edit" width={18} height={18} style={{
              color: '#6b7280'
            }} />
                            Edit WiFi access point
                        </h3>
                        <button type="button" className={styles.editModalCloseButton} onClick={() => {
            setEditingWifi(null);
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
                                        Name *
                                        <input type="text" className={styles.editModalInput} value={editForm.nom} onChange={e => setEditForm(prev => ({
                  ...prev,
                  nom: e.target.value
                }))} placeholder="Ex: AP-01" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        IP address
                                        <input type="text" className={styles.editModalInput} value={editForm.ip} onChange={e => setEditForm(prev => ({
                  ...prev,
                  ip: e.target.value
                }))} placeholder="Ex: 192.168.1.1" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Manufacturer
                                        <input type="text" className={styles.editModalInput} value={editForm.fabricant} onChange={e => setEditForm(prev => ({
                  ...prev,
                  fabricant: e.target.value
                }))} placeholder="Ex: Ubiquiti, Cisco" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        Model
                                        <input type="text" className={styles.editModalInput} value={editForm.modele} onChange={e => setEditForm(prev => ({
                  ...prev,
                  modele: e.target.value
                }))} placeholder="Ex: UAP-AC-PRO" />
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
                                        Firmware
                                        <input type="text" className={styles.editModalInput} value={editForm.firmware} onChange={e => setEditForm(prev => ({
                  ...prev,
                  firmware: e.target.value
                }))} placeholder="Ex: 5.43.35" />
                                    </label>
                                </div>

                                {}
                                <div className={styles.editModalFormRow}>
                                    <label className={styles.editModalLabel}>
                                        Serial number
                                        <input type="text" className={styles.editModalInput} value={editForm.numeroSerie} onChange={e => setEditForm(prev => ({
                  ...prev,
                  numeroSerie: e.target.value
                }))} placeholder="Ex: ABC123456789" />
                                    </label>
                                    <label className={styles.editModalLabel}>
                                        MAC address
                                        <input type="text" className={styles.editModalInput} value={editForm.adresseMac} onChange={e => setEditForm(prev => ({
                  ...prev,
                  adresseMac: e.target.value
                }))} placeholder="Ex: 00:1A:2B:3C:4D:5E" />
                                    </label>
                                </div>

                                {}
                                <label className={styles.editModalLabel}>
                                    VLAN
                                    <input type="text" className={styles.editModalInput} value={editForm.vlan} onChange={e => setEditForm(prev => ({
                ...prev,
                vlan: e.target.value
              }))} placeholder="Ex: 10, 20, 30" />
                                </label>

                                {}
                                {(() => {
              const globalSSIDs = config?.client?.ssids || [];
              if (globalSSIDs.length > 0) {
                return <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                                                <label style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: '#1a1a1a',
                    marginBottom: '0.75rem',
                    display: 'block'
                  }}>
                                                    SSIDs broadcast by this access point
                                                </label>
                                                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem'
                  }}>
                                                    {globalSSIDs.map(ssid => {
                      const ssidId = typeof ssid === 'string' ? ssid : ssid.id;
                      const ssidNom = typeof ssid === 'string' ? ssid : ssid.nom || 'Unnamed SSID';
                      const isAssigned = editForm.ssids.some(id => {
                        if (typeof id === 'string') return id === ssidId;
                        return id === ssidId || id.id === ssidId;
                      });
                      return <label key={ssidId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        background: isAssigned ? '#f0fdfa' : '#ffffff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: `1px solid ${isAssigned ? '#15d1a0' : '#e5e7eb'}`,
                        transition: 'all 0.2s ease'
                      }}>
                                                                <input type="checkbox" checked={isAssigned} onChange={e => {
                          setEditForm(prev => {
                            let newSsids;
                            if (e.target.checked) {
                              newSsids = [...prev.ssids, ssidId];
                            } else {
                              newSsids = prev.ssids.filter(id => {
                                if (typeof id === 'string') return id !== ssidId;
                                return id !== ssidId && id.id !== ssidId;
                              });
                            }
                            return {
                              ...prev,
                              ssids: newSsids
                            };
                          });
                        }} style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#15d1a0'
                        }} />
                                                                <span style={{
                          flex: 1,
                          fontSize: '0.85rem',
                          color: '#1a1a1a'
                        }}>
                                                                    {ssidNom}
                                                                </span>
                                                            </label>;
                    })}
                                                </div>
                                            </div>;
              }
              return null;
            })()}
                            </div>}
                    </div>

                    {!isSaving && <div className={styles.editModalFooter}>
                            <button type="button" className={styles.editModalSaveButton} onClick={handleSaveWifi} disabled={isSaving}>
                                <IconifyIcon icon="material-symbols:save" width={16} height={16} />
                                Save
                            </button>
                        </div>}
                </div>
            </div>}
        </div>;
};
export default Wifi;
