import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { FaTimes, FaPlus } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { Calendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import "moment/locale/fr";
import "moment/locale/en-gb";
import "moment/locale/de";
import "moment/locale/it";
import "moment/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./planningDragFeedback.css";
import styles from "./PlanningPage.module.css";
import PlanningEventFormModal from "./PlanningEventFormModal";
import PlanningEventHoverCard from "./PlanningEventHoverCard";
import PlanningWeekResourceView from "./PlanningWeekResourceView";
import PlanningMultiMonthView from "./PlanningMultiMonthView";
import PlanningMonthEventBar from "./PlanningMonthEventBar";
import PlanningAgendaView from "./PlanningAgendaView";
import { planningEventStyleGetter } from "./planningEventStyles";
import { getAgentColor, getPlanningEventColors, getEventPrimaryAgentId } from "./planningAgentColors";
import { getPlanningEventTypeIcon } from "./planningEventTypes";
import { applyLocalEventMove, buildEventMovePayload, computeMovedAllDayRange, computeMovedTimedRange, computeMonthDropRange, getPlanningEventId, isPlanningEventDraggable } from "./planningEventMove";
import { resolvePlanningEventClientId } from "../../utils/ticketReminderEvent";
import { formatPlanningDateTime, parsePlanningDateTime, planningMoment } from "../../utils/planningDateTime";
import SmartTooltip from "../SmartTooltip";
import { createEvent, fetchEvents, updateEvent, deleteEvent } from "../../api/events";
import { getAllCampaigns } from "../../api/campaigns";
import { fetchClientsList, fetchClientModules } from "../../api/clients";
import { fetchUsers } from "../../api/users";
import { getUserSetting, saveUserSetting } from "../../api/userSettings";
import { fetchTeamsForPlanning } from "../../api/teams";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppGeneralSettings, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getPlanningPageCopy } from "./planningPageI18n";
import { getPlanningEventFormCopy } from "./planningEventFormI18n";
import { getPlanningEventHoverCardCopy } from "./planningEventHoverCardI18n";
import { usePlanningEventTypes } from "./usePlanningEventTypes";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
const PLANNING_CLIENTS_CACHE_KEY = "planning_clients_list_cache_v1";
const PLANNING_CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const PLANNING_CLIENT_MODULES_CACHE_KEY = "planning_client_modules_cache_v1";
const PLANNING_CLIENT_MODULES_CACHE_TTL_MS = 5 * 60 * 1000;
const PLANNING_PREFERENCES_SETTING = "planning_pinned_agents";
const PLANNING_VIEWS = new Set(["month", "week", "day", "agenda"]);
const MONTH_VIEW_HEIGHTS = {
  1: 820,
  2: 700,
  3: 640
};
function getMonthViewHeight(monthsShown) {
  return MONTH_VIEW_HEIGHTS[monthsShown] || MONTH_VIEW_HEIGHTS[1];
}
function normalizePinnedAgentIds(value, fallbackUserId) {
  const raw = Array.isArray(value) ? value : Array.isArray(value?.agentIds) ? value.agentIds : [];
  const ids = raw.map(String).filter(Boolean);
  if (ids.length > 0) return ids;
  return fallbackUserId ? [String(fallbackUserId)] : [];
}
function normalizePlanningPreferences(value, fallbackUserId) {
  const agentIds = normalizePinnedAgentIds(value, fallbackUserId);
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const selectedRaw = Array.isArray(raw.selectedAgentIds) ? raw.selectedAgentIds : agentIds;
  const selectedAgentIds = selectedRaw.map(String).filter(Boolean);
  const view = PLANNING_VIEWS.has(raw.view) ? raw.view : "month";
  const monthsNum = Number(raw.monthsShown);
  const monthsShown = [1, 2, 3].includes(monthsNum) ? monthsNum : 3;
  return {
    agentIds,
    selectedAgentIds: selectedAgentIds.length > 0 ? selectedAgentIds : agentIds,
    view,
    monthsShown
  };
}
const EVENT_META_MARKER = "<!--VERITAS_EVENT_META:";
const planningClientModulesMemoryCache = new Map();
function safeEncodeMeta(obj) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return null;
  }
}
function safeDecodeMeta(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}
function parseEventDescription(rawDescription) {
  const raw = (rawDescription || "").toString();
  const markerIndex = raw.indexOf(EVENT_META_MARKER);
  let text = raw;
  let meta = null;
  if (markerIndex !== -1) {
    const endIndex = raw.indexOf("-->", markerIndex);
    if (endIndex !== -1) {
      const encoded = raw.slice(markerIndex + EVENT_META_MARKER.length, endIndex).trim();
      meta = safeDecodeMeta(encoded);
      text = raw.slice(0, markerIndex).trimEnd();
      meta = meta && typeof meta === "object" ? meta : null;
    }
  }
  // Plain-text sales-task ticket sentinel (survives HTML-comment stripping)
  if (/VERITAS_TICKET:/i.test(raw)) {
    const match = raw.match(/VERITAS_TICKET:([0-9a-fA-F-]{36})(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?(?:\|([^|\s\n]*))?/);
    if (match) {
      meta = {
        ...(meta || {}),
        salesPmTask: true,
        ticketId: match[1] || meta?.ticketId || null,
        ticketNumber: match[2] || meta?.ticketNumber || null,
        kind: match[3] || meta?.kind || null,
        pmTaskId: match[4] || meta?.pmTaskId || null
      };
    }
  }
  // Never expose machine sentinels in user-facing description text
  text = text
    .replace(/VERITAS_TICKET:[^\n]*/gi, "")
    .replace(/<!--VERITAS_EVENT_META:[\s\S]*?-->/g, "")
    .trim();
  return {
    text,
    meta
  };
}
function serializeEventDescription(text, meta) {
  const cleanText = (text || "").trim();
  const hasMeta =
    (Array.isArray(meta?.linkedItems) && meta.linkedItems.length > 0) ||
    (Array.isArray(meta?.todos) && meta.todos.length > 0) ||
    meta?.schedule?.allDay === true ||
    meta?.schedule?.businessDaysOnly === false ||
    (Array.isArray(meta?.assignedUserIds) && meta.assignedUserIds.length > 0) ||
    meta?.ticketReminder === true ||
    meta?.salesPmTask === true ||
    Boolean(meta?.ticketId) ||
    Boolean(meta?.pmTaskId);
  if (!hasMeta) return cleanText || null;
  const encoded = safeEncodeMeta(meta);
  if (!encoded) return cleanText || null;
  return `${cleanText}\n\n${EVENT_META_MARKER}${encoded}-->`;
}
function isBusinessDay(dayMoment) {
  const day = dayMoment.day();
  return day !== 0 && day !== 6;
}
function getBusinessEndDate(startDate, durationDays) {
  const safeDuration = Math.max(1, Number(durationDays) || 1);
  const cursor = moment(startDate).startOf("day");
  let counted = 0;
  while (counted < safeDuration) {
    if (isBusinessDay(cursor)) {
      counted += 1;
      if (counted === safeDuration) break;
    }
    cursor.add(1, "day");
  }
  return cursor;
}
function getBusinessDaysCountInclusive(startDate, endDate) {
  const start = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 1;
  let count = 0;
  const cursor = start.clone();
  while (cursor.isSameOrBefore(end, "day")) {
    if (isBusinessDay(cursor)) count += 1;
    cursor.add(1, "day");
  }
  return Math.max(1, count);
}
function getCalendarEndDate(startDate, durationDays) {
  const safeDuration = Math.max(1, Number(durationDays) || 1);
  return moment(startDate).startOf("day").add(safeDuration - 1, "days");
}
function getCalendarDaysCountInclusive(startDate, endDate) {
  const start = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 1;
  return Math.max(1, end.diff(start, "days") + 1);
}
function normalizeClientListRow(client) {
  let modulesSnapshot = client.modules;
  if (typeof modulesSnapshot === "string") {
    try {
      modulesSnapshot = JSON.parse(modulesSnapshot);
    } catch {
      modulesSnapshot = {};
    }
  }
  if (!modulesSnapshot || typeof modulesSnapshot !== "object") {
    modulesSnapshot = {};
  }
  return {
    ...client,
    modules_monitoring: modulesSnapshot
  };
}
async function loadPlanningClientsListCached({
  force = false,
  signal
} = {}) {
  if (!force) {
    try {
      const raw = sessionStorage.getItem(PLANNING_CLIENTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isFresh = parsed?.savedAt && Array.isArray(parsed?.data) && Date.now() - parsed.savedAt < PLANNING_CLIENTS_CACHE_TTL_MS;
        if (isFresh) {
          return parsed.data.map(normalizeClientListRow);
        }
      }
    } catch {}
  }
  const clientsData = await fetchClientsList({
    signal
  });
  if (signal?.aborted) return [];
  const normalized = (Array.isArray(clientsData) ? clientsData : []).map(normalizeClientListRow);
  try {
    sessionStorage.setItem(PLANNING_CLIENTS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: normalized
    }));
  } catch {}
  return normalized;
}
function getPlanningClientModulesSessionCache() {
  try {
    const raw = sessionStorage.getItem(PLANNING_CLIENT_MODULES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function setPlanningClientModulesSessionCache(cacheObj) {
  try {
    sessionStorage.setItem(PLANNING_CLIENT_MODULES_CACHE_KEY, JSON.stringify(cacheObj));
  } catch {}
}
async function loadClientModulesCached(clientId, {
  force = false,
  signal
} = {}) {
  const idStr = String(clientId || "").trim();
  if (!idStr) return null;
  const now = Date.now();
  if (!force) {
    const mem = planningClientModulesMemoryCache.get(idStr);
    if (mem?.savedAt && mem?.data && now - mem.savedAt < PLANNING_CLIENT_MODULES_CACHE_TTL_MS) {
      return mem.data;
    }
    const sessionCache = getPlanningClientModulesSessionCache();
    const entry = sessionCache[idStr];
    if (entry?.savedAt && entry?.data && now - entry.savedAt < PLANNING_CLIENT_MODULES_CACHE_TTL_MS) {
      planningClientModulesMemoryCache.set(idStr, entry);
      return entry.data;
    }
  }
  const mod = await fetchClientModules(idStr, {
    signal
  });
  if (signal?.aborted || !mod) return mod;
  const newEntry = {
    savedAt: now,
    data: mod
  };
  planningClientModulesMemoryCache.set(idStr, newEntry);
  const sessionCache = getPlanningClientModulesSessionCache();
  sessionCache[idStr] = newEntry;
  setPlanningClientModulesSessionCache(sessionCache);
  return mod;
}
async function hydrateClientsEquipements(clientIds, clientsBase, signal) {
  const need = [...new Set(clientIds.map(String).filter(Boolean))];
  if (need.length === 0) {
    return clientsBase.map(c => ({
      ...c
    }));
  }
  const byId = new Map(clientsBase.map(c => [String(c.id), {
    ...c
  }]));
  await Promise.all(need.map(async idStr => {
    if (signal?.aborted) return;
    try {
      const mod = await loadClientModulesCached(idStr, {
        signal
      });
      if (signal?.aborted || !mod) return;
      const c = byId.get(idStr);
      if (!c) return;
      byId.set(idStr, {
        ...c,
        equipements: mod.equipements || {},
        modules_monitoring: mod.modules_monitoring || c.modules_monitoring
      });
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      console.error("Planning: chargement modules client", idStr, e);
    }
  }));
  return clientsBase.map(c => byId.get(String(c.id)) || {
    ...c
  });
}
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);
function capitalizeLabel(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function formatTimezoneLabel(timezone) {
  return String(timezone || "Europe/Paris").split("/").pop().replace(/_/g, " ");
}
function momentLocaleCode(locale) {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  if (code === "en") return "en-gb";
  return code;
}
export default function PlanningPage({
  onNavigate,
  planningParams
}) {
  const {
    user
  } = useAuthContext();
  const {
    can
  } = usePermissions();
  const canCreateEvent = can("planning.create");
  const canClickCreate = can("planning.click_create");
  const canEditEvent = can("planning.edit");
  const {
    settings
  } = useAppGeneralSettings();
  const locale = useAppLocale();
  const catalogTypes = usePlanningEventTypes();
  const eventFormCopy = useMemo(() => getPlanningEventFormCopy(locale, catalogTypes), [locale, catalogTypes]);
  const planningCopy = useMemo(() => getPlanningPageCopy(locale, eventFormCopy.eventTypes, catalogTypes), [locale, eventFormCopy, catalogTypes]);
  const hoverCardCopy = useMemo(() => getPlanningEventHoverCardCopy(locale), [locale]);
  useEffect(() => {
    moment.locale(momentLocaleCode(locale));
  }, [locale]);
  const appTimezone = settings?.app_timezone || "Europe/Paris";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [monthsShown, setMonthsShown] = useState(3);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [peripherals, setPeripherals] = useState([]);
  const [cybersecurities, setCybersecurities] = useState([]);
  const [services, setServices] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientAutocompleteRef = useRef(null);
  const [selectedLinkedItems, setSelectedLinkedItems] = useState([]);
  const [linkedSearch, setLinkedSearch] = useState("");
  const [linkedTypeFilter, setLinkedTypeFilter] = useState("all");
  const [loadingLinkedItems, setLoadingLinkedItems] = useState(false);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState(user?.id ? [String(user.id)] : []);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeSelectRef = useRef(null);
  const [todoItems, setTodoItems] = useState([]);
  const [todoDraft, setTodoDraft] = useState("");
  const [todoDraftColor, setTodoDraftColor] = useState("#15d1a0");
  const [draggingTodoId, setDraggingTodoId] = useState(null);
  const [dragOverTodoId, setDragOverTodoId] = useState(null);
  const [equipmentMappings, setEquipmentMappings] = useState({});
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [pinnedAgentIds, setPinnedAgentIds] = useState([]);
  const [planningPreferencesLoaded, setPlanningPreferencesLoaded] = useState(false);
  const [agentFilterSearch, setAgentFilterSearch] = useState("");
  const [agentAddMode, setAgentAddMode] = useState(null);
  const [planningTeams, setPlanningTeams] = useState([]);
  const [loadingPlanningTeams, setLoadingPlanningTeams] = useState(false);
  const agentFilterAddRef = useRef(null);
  const [selectedClientsFilter, setSelectedClientsFilter] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    if (!planningParams) return;
    const {
      focusDate,
      clientId
    } = planningParams;
    if (focusDate) {
      const parsed = new Date(focusDate);
      if (!Number.isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
    if (clientId) {
      setSelectedClientsFilter(new Set([String(clientId)]));
    }
  }, [planningParams]);
  const [daySlotAction, setDaySlotAction] = useState(null);
  const suppressSlotSelectUntilRef = useRef(0);
  const markSuppressSlotSelect = useCallback((durationMs = 450) => {
    suppressSlotSelectUntilRef.current = Date.now() + durationMs;
  }, []);
  const shouldSuppressSlotSelect = useCallback(() => Date.now() < suppressSlotSelectUntilRef.current, []);
  const [eventForm, setEventForm] = useState({
    title: "",
    type: "intervention",
    startDate: moment().format("YYYY-MM-DD"),
    startTime: "09:00",
    endDate: moment().format("YYYY-MM-DD"),
    endTime: "12:00",
    allDay: false,
    businessDaysOnly: true,
    durationDays: 1,
    description: "",
    clientId: null,
    equipmentId: null,
    assignedUserId: user?.id || null
  });
  const planningLoadAbortRef = useRef(null);
  const planningEquipmentFetchedRef = useRef(new Set());
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersList = await fetchUsers();
        setUsers(usersList);
      } catch (error) {
        console.error("Error while loading des utilisateurs:", error);
      }
    };
    loadUsers();
  }, []);
  useEffect(() => {
    if (!user?.id) {
      setPinnedAgentIds([]);
      setSelectedUsers(new Set());
      setPlanningPreferencesLoaded(false);
      return;
    }
    let cancelled = false;
    setPlanningPreferencesLoaded(false);
    (async () => {
      try {
        const {
          value
        } = await getUserSetting(PLANNING_PREFERENCES_SETTING);
        if (cancelled) return;
        const prefs = normalizePlanningPreferences(value, user.id);
        setPinnedAgentIds(prefs.agentIds);
        setSelectedUsers(new Set(prefs.selectedAgentIds));
        setView(prefs.view);
        setMonthsShown(prefs.monthsShown);
      } catch (error) {
        console.error("Error chargement préférences planning:", error);
        if (!cancelled) {
          const prefs = normalizePlanningPreferences(null, user.id);
          setPinnedAgentIds(prefs.agentIds);
          setSelectedUsers(new Set(prefs.selectedAgentIds));
          setView(prefs.view);
          setMonthsShown(prefs.monthsShown);
        }
      } finally {
        if (!cancelled) setPlanningPreferencesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id || !planningPreferencesLoaded) return undefined;
    const timer = setTimeout(() => {
      saveUserSetting(PLANNING_PREFERENCES_SETTING, {
        agentIds: pinnedAgentIds.map(String),
        selectedAgentIds: [...selectedUsers].map(String),
        view,
        monthsShown
      }).catch(error => {
        console.error("Error sauvegarde préférences planning:", error);
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [pinnedAgentIds, selectedUsers, view, monthsShown, user?.id, planningPreferencesLoaded]);
  useEffect(() => {
    if (!users.length || !planningPreferencesLoaded) return;
    setPinnedAgentIds(prev => {
      if (!prev.length) return prev;
      const validIds = new Set(users.map(u => String(u.id)));
      const cleaned = prev.filter(id => validIds.has(String(id)));
      return cleaned.length === prev.length ? prev : cleaned;
    });
    setSelectedUsers(prev => {
      if (!prev.size) return prev;
      const validIds = new Set(users.map(u => String(u.id)));
      const cleaned = [...prev].filter(id => validIds.has(String(id)));
      return cleaned.length === prev.size ? prev : new Set(cleaned);
    });
  }, [users, planningPreferencesLoaded]);
  const formatEventsWithEnrichedData = (eventsList, clientsList, usersList) => {
    return eventsList.map(event => {
      const parsedDescription = parseEventDescription(event.description);
      const eventMeta = parsedDescription.meta || {};
      const linkedItemsMeta = Array.isArray(eventMeta.linkedItems) ? eventMeta.linkedItems : [];
      const assignedUserIdsMeta = Array.isArray(eventMeta.assignedUserIds) ? eventMeta.assignedUserIds.map(id => String(id)).filter(Boolean) : [];
      const resolvedClientId = resolvePlanningEventClientId(event);
      const client = clientsList.find(c => String(c.id) === String(resolvedClientId));
      const assignedUser = usersList.find(u => String(u.id) === String(event.assigned_user_id));
      const creatorUser = usersList.find(u => String(u.id) === String(event.user_id));
      const assignedUserNames = assignedUserIdsMeta.map(uid => usersList.find(u => String(u.id) === String(uid))).filter(Boolean).map(u => u?.name || u?.nom || u?.username).filter(Boolean);
      let equipmentName = null;
      let serviceName = null;
      if (client && client.equipements) {
        if (event.equipment_id) {
          Object.keys(client.equipements).forEach(type => {
            if (infrastructureTypes.includes(type)) {
              const equipmentsOfType = Array.isArray(client.equipements[type]) ? client.equipements[type] : client.equipements[type] ? [client.equipements[type]] : [];
              equipmentsOfType.forEach(eq => {
                if (eq) {
                  const eqId = eq.id;
                  const eqName = eq.name || eq.nom || planningCopy.defaults.noName;
                  const generatedId = `${type}-${eqName}`;
                  if (eqId === event.equipment_id || String(eqId) === String(event.equipment_id) || generatedId === event.equipment_id || String(generatedId) === String(event.equipment_id)) {
                    equipmentName = eqName;
                  }
                }
              });
            }
          });
        }
        if (event.equipment_id && !equipmentName) {
          Object.keys(client.equipements).forEach(type => {
            if (serviceTypes.includes(type)) {
              const servicesOfType = Array.isArray(client.equipements[type]) ? client.equipements[type] : client.equipements[type] ? [client.equipements[type]] : [];
              servicesOfType.forEach(svc => {
                if (svc) {
                  const svcId = svc.id;
                  const svcName = svc.name || svc.nom || type;
                  if (String(svcId) === String(event.equipment_id)) {
                    serviceName = svcName;
                  }
                }
              });
            } else if (cybersecurityTypes.includes(type)) {
              const cybersOfType = client.equipements[type];
              if (type === 'Backup' && cybersOfType && typeof cybersOfType === 'object') {
                if (cybersOfType.instances && Array.isArray(cybersOfType.instances)) {
                  cybersOfType.instances.forEach((instance, index) => {
                    const instanceLogiciel = instance.logiciel || instance.nom || instance.name || 'instance';
                    const instanceName = instance.logiciel || instance.nom || instance.name || 'Instance de sauvegarde';
                    const generatedId = `${type}-${instanceLogiciel}-${index}`;
                    if (generatedId === event.equipment_id || String(generatedId) === String(event.equipment_id) || `${type}-${instanceLogiciel}-${cybersOfType.instances.indexOf(instance)}` === event.equipment_id || String(`${type}-${instanceLogiciel}-${cybersOfType.instances.indexOf(instance)}`) === String(event.equipment_id)) {
                      serviceName = instanceName;
                    }
                  });
                }
              } else if (type === 'Antivirus' && cybersOfType && typeof cybersOfType === 'object') {
                if (cybersOfType.solutions && Array.isArray(cybersOfType.solutions)) {
                  cybersOfType.solutions.forEach((solution, index) => {
                    const solutionLogiciel = solution.logiciel || solution.companyName || 'solution';
                    const solutionName = solution.logiciel || solution.solution || solution.companyName || 'Antivirus';
                    const generatedId = `${type}-${solutionLogiciel}-${index}`;
                    if (generatedId === event.equipment_id || String(generatedId) === String(event.equipment_id) || `${type}-${solutionLogiciel}-${cybersOfType.solutions.indexOf(solution)}` === event.equipment_id || String(`${type}-${solutionLogiciel}-${cybersOfType.solutions.indexOf(solution)}`) === String(event.equipment_id)) {
                      serviceName = solutionName;
                    }
                  });
                }
              } else if (type === 'Antispam' && cybersOfType && typeof cybersOfType === 'object') {
                if (cybersOfType.solutions && Array.isArray(cybersOfType.solutions)) {
                  cybersOfType.solutions.forEach((solution, index) => {
                    const solutionLogiciel = solution.logiciel || 'solution';
                    const solutionName = solution.logiciel || solution.solution || 'Antispam';
                    const generatedId = `${type}-${solutionLogiciel}-${index}`;
                    if (generatedId === event.equipment_id || String(generatedId) === String(event.equipment_id) || `${type}-${solutionLogiciel}-${cybersOfType.solutions.indexOf(solution)}` === event.equipment_id || String(`${type}-${solutionLogiciel}-${cybersOfType.solutions.indexOf(solution)}`) === String(event.equipment_id)) {
                      serviceName = solutionName;
                    }
                  });
                }
              } else if (Array.isArray(cybersOfType)) {
                cybersOfType.forEach((cyber, index) => {
                  if (cyber && typeof cyber === 'object') {
                    const cyberName = cyber.logiciel || cyber.solution || cyber.companyName || cyber.name || cyber.nom || type;
                    const cyberId = cyber.id || `${type}-${cyberName}-${index}`;
                    if (cyberId === event.equipment_id || String(cyberId) === String(event.equipment_id)) {
                      serviceName = cyberName;
                    }
                  }
                });
              }
            }
          });
        }
      }
      if (linkedItemsMeta.length > 0) {
        const linkedLabels = linkedItemsMeta.map(item => item?.label).filter(Boolean);
        if (linkedLabels.length > 0) {
          equipmentName = linkedLabels.slice(0, 2).join(", ");
          serviceName = linkedLabels.length > 2 ? `+${linkedLabels.length - 2} autre(s)` : null;
        }
      }
      return {
        id: event.id,
        title: event.title,
        start: parsePlanningDateTime(event.start),
        end: parsePlanningDateTime(event.end),
        resource: event.type || "other",
        description: parsedDescription.text || "",
        clientId: resolvedClientId,
        equipmentId: event.equipment_id,
        assignedUserId: event.assigned_user_id,
        assignedUserIds: assignedUserIdsMeta.length > 0 ? assignedUserIdsMeta : event.assigned_user_id ? [String(event.assigned_user_id)] : [],
        clientName: client?.name || client?.nom || null,
        assignedUserName: assignedUserNames.length > 0 ? assignedUserNames.join(", ") : assignedUser?.name || assignedUser?.nom || assignedUser?.username || null,
        creatorUserName: creatorUser?.name || creatorUser?.nom || creatorUser?.username || null,
        ticketId: event.ticket_id || eventMeta.ticketId || null,
        ticketNumber: event.ticket_number || eventMeta.ticketNumber || null,
        ticketType: event.ticket_type || eventMeta.ticketType || null,
        isTicketReminder: Boolean(event.ticket_id || eventMeta.ticketReminder),
        isSalesPmTask: Boolean(eventMeta.salesPmTask),
        salesKind: eventMeta.kind || null,
        pmTaskId: eventMeta.pmTaskId || null,
        createdAt: event.created_at || null,
        updatedAt: event.updated_at || null,
        equipmentName: equipmentName,
        serviceName: serviceName,
        linkedItems: linkedItemsMeta,
        todos: Array.isArray(eventMeta.todos) ? eventMeta.todos : [],
        notes: Array.isArray(eventMeta.notes) ? eventMeta.notes : [],
        schedule: eventMeta.schedule && typeof eventMeta.schedule === "object" ? eventMeta.schedule : null,
        _rawData: event
      };
    });
  };
  useEffect(() => {
    planningLoadAbortRef.current?.abort();
    const controller = new AbortController();
    planningLoadAbortRef.current = controller;
    const {
      signal
    } = controller;
    const loadEvents = async () => {
      setLoading(true);
      try {
        const [eventsList, campaignsList, clientsList, usersList] = await Promise.all([fetchEvents(), getAllCampaigns().catch(() => []), loadPlanningClientsListCached({
          signal
        }), fetchUsers().catch(() => [])]);
        if (signal.aborted) return;
        const eventClientIds = [...new Set((Array.isArray(eventsList) ? eventsList : []).map(e => resolvePlanningEventClientId(e)).filter(Boolean))];
        const hydratedClients = await hydrateClientsEquipements(eventClientIds, clientsList, signal);
        if (signal.aborted) return;
        const formattedEvents = formatEventsWithEnrichedData(eventsList, hydratedClients, usersList);
        setClients(hydratedClients);
        setEvents(formattedEvents);
        setCampaigns(Array.isArray(campaignsList) ? campaignsList : []);
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Error while loading des événements:", error);
        setEvents([]);
        setCampaigns([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    loadEvents();
    return () => controller.abort();
  }, []);
  const infrastructureTypes = ['Serveurs', 'NAS', 'SAN', 'Firewalls', 'Internet', 'Switch', 'BorneWifi'];
  const cybersecurityTypes = ['Antispam', 'Antivirus', 'Backup'];
  const serviceTypes = ['Office365', 'NDD'];
  useEffect(() => {
    if (!eventModalOpen || !selectedClient) return;
    const idStr = String(selectedClient);
    const client = clients.find(c => String(c.id) === idStr);
    if (!client) return;
    const eq = client.equipements;
    if (eq && typeof eq === "object" && Object.keys(eq).length > 0) return;
    if (planningEquipmentFetchedRef.current.has(idStr)) return;
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        const mod = await loadClientModulesCached(client.id, {
          signal: ac.signal
        });
        if (cancelled) return;
        planningEquipmentFetchedRef.current.add(idStr);
        if (!mod) return;
        setClients(prev => prev.map(c => String(c.id) === String(client.id) ? {
          ...c,
          equipements: mod.equipements || {},
          modules_monitoring: mod.modules_monitoring || c.modules_monitoring
        } : c));
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.error("Planning: modules pour client sélectionné", e);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedClient, clients, eventModalOpen]);
  useEffect(() => {
    if (selectedClient) {
      const client = clients.find(c => String(c.id) === String(selectedClient));
      if (client) {
        const loadMappings = async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${client.id}`, {
              credentials: 'include'
            });
            if (response.ok) {
              const mappings = await response.json();
              const mappingsMap = {};
              mappings.forEach(m => {
                const key = `${m.equipment_type}-${m.equipment_name}`;
                mappingsMap[key] = m;
              });
              setEquipmentMappings(mappingsMap);
            }
          } catch (error) {
            console.error("Error while loading des mappings:", error);
            setEquipmentMappings({});
          }
        };
        loadMappings();
      }
    } else {
      setEquipmentMappings({});
    }
  }, [selectedClient, clients]);
  useEffect(() => {
    if (selectedClient) {
      const client = clients.find(c => String(c.id) === String(selectedClient));
      if (client) {
        const peripheralsList = [];
        if (client.equipements) {
          Object.keys(client.equipements).forEach(type => {
            if (infrastructureTypes.includes(type)) {
              const equipmentsOfType = client.equipements[type] || [];
              equipmentsOfType.forEach(eq => {
                const equipmentName = eq.name || eq.nom || planningCopy.defaults.noName;
                const mappingKey = `${type}-${equipmentName}`;
                const mapping = equipmentMappings[mappingKey];
                const isMapped = mapping && mapping.checkmk_host_name && mapping.is_active !== false;
                const equipmentIP = eq.ip || eq.adresseIP || eq.adresse_ip || null;
                peripheralsList.push({
                  id: eq.id || `${type}-${equipmentName}`,
                  name: equipmentName,
                  type: type,
                  isMapped: isMapped,
                  mapping: mapping,
                  ip: equipmentIP
                });
              });
            }
          });
        }
        setPeripherals(peripheralsList);
        const cybersecuritiesList = [];
        if (client.equipements) {
          Object.keys(client.equipements).forEach(type => {
            if (cybersecurityTypes.includes(type)) {
              const cybersecOfType = client.equipements[type];
              if (type === 'Backup' && cybersecOfType && typeof cybersecOfType === 'object') {
                if (cybersecOfType.instances && Array.isArray(cybersecOfType.instances)) {
                  cybersecOfType.instances.forEach(instance => {
                    const instanceName = instance.logiciel || instance.nom || instance.name || 'Instance de sauvegarde';
                    cybersecuritiesList.push({
                      id: `${type}-${instance.logiciel || instance.nom || instance.name || 'instance'}-${cybersecOfType.instances.indexOf(instance)}`,
                      name: instanceName,
                      type: type
                    });
                  });
                }
              } else if (type === 'Antivirus' && cybersecOfType && typeof cybersecOfType === 'object') {
                if (cybersecOfType.solutions && Array.isArray(cybersecOfType.solutions)) {
                  cybersecOfType.solutions.forEach(solution => {
                    const solutionName = solution.logiciel || solution.solution || solution.companyName || 'Antivirus';
                    cybersecuritiesList.push({
                      id: `${type}-${solution.logiciel || solution.companyName || 'solution'}-${cybersecOfType.solutions.indexOf(solution)}`,
                      name: solutionName,
                      type: type
                    });
                  });
                }
              } else if (type === 'Antispam' && cybersecOfType && typeof cybersecOfType === 'object') {
                if (cybersecOfType.solutions && Array.isArray(cybersecOfType.solutions)) {
                  cybersecOfType.solutions.forEach(solution => {
                    const solutionName = solution.logiciel || solution.solution || 'Antispam';
                    cybersecuritiesList.push({
                      id: `${type}-${solution.logiciel || 'solution'}-${cybersecOfType.solutions.indexOf(solution)}`,
                      name: solutionName,
                      type: type
                    });
                  });
                }
              } else if (Array.isArray(cybersecOfType)) {
                cybersecOfType.forEach((cyber, index) => {
                  if (cyber && typeof cyber === 'object') {
                    let displayName = cyber.logiciel || cyber.solution || cyber.companyName || cyber.name || cyber.nom || type;
                    cybersecuritiesList.push({
                      id: cyber.id || `${type}-${displayName}-${index}`,
                      name: displayName,
                      type: type
                    });
                  }
                });
              }
            }
          });
        }
        setCybersecurities(cybersecuritiesList);
        const servicesList = [];
        if (client.equipements) {
          Object.keys(client.equipements).forEach(type => {
            if (serviceTypes.includes(type)) {
              const servicesOfType = client.equipements[type] || [];
              if (Array.isArray(servicesOfType)) {
                servicesOfType.forEach(svc => {
                  if (svc && typeof svc === 'object') {
                    const serviceId = svc.id;
                    if (serviceId) {
                      servicesList.push({
                        id: serviceId,
                        name: svc.name || svc.nom || type,
                        type: type
                      });
                    }
                  }
                });
              } else if (servicesOfType && typeof servicesOfType === 'object') {
                const serviceId = servicesOfType.id;
                if (serviceId) {
                  servicesList.push({
                    id: serviceId,
                    name: servicesOfType.name || servicesOfType.nom || 'Office 365',
                    type: type
                  });
                }
              }
            }
          });
        }
        setServices(servicesList);
      } else {
        setPeripherals([]);
        setCybersecurities([]);
        setServices([]);
      }
    } else {
      setPeripherals([]);
      setCybersecurities([]);
      setServices([]);
    }
  }, [selectedClient, clients, equipmentMappings]);
  useEffect(() => {
    if (!eventModalOpen) {
      setLoadingLinkedItems(false);
      return;
    }
    if (!selectedClient) {
      setLoadingLinkedItems(false);
      return;
    }
    const client = clients.find(c => String(c.id) === String(selectedClient));
    if (!client) {
      setLoadingLinkedItems(true);
      return;
    }
    const eq = client.equipements;
    const hasEquipments = eq && typeof eq === "object" && Object.keys(eq).length > 0;
    setLoadingLinkedItems(!hasEquipments);
  }, [selectedClient, clients, eventModalOpen]);
  useEffect(() => {
    const handleClickOutside = e => {
      const inClientPortal = e.target.closest("[data-planning-client-dropdown]");
      if (clientAutocompleteRef.current && !clientAutocompleteRef.current.contains(e.target) && !inClientPortal) {
        setClientDropdownOpen(false);
      }
      const inAssigneePortal = e.target.closest("[data-planning-assignee-dropdown]");
      if (assigneeSelectRef.current && !assigneeSelectRef.current.contains(e.target) && !inAssigneePortal) {
        setAssigneeDropdownOpen(false);
      }
      if (agentFilterAddRef.current && !agentFilterAddRef.current.contains(e.target)) {
        setAgentAddMode(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (!selectedClient) return;
    const client = clients.find(c => String(c.id) === String(selectedClient));
    if (client) {
      setClientSearch(client.name || client.nom || "");
    }
  }, [selectedClient, clients]);
  const campaignEvents = useMemo(() => {
    if (!campaigns.length) return [];
    return campaigns.filter(c => c.start_date || c.end_date).map(c => {
      const startDate = c.start_date || c.end_date;
      const endDate = c.end_date || c.start_date;
      const start = moment(startDate).startOf("day").add(9, "hours").toDate();
      const end = moment(endDate).endOf("day").toDate();
      const clientName = c.client_name || (clients.find(cl => String(cl.id) === String(c.client_id))?.name ?? (c.client_id ? `Client ${c.client_id}` : ""));
      return {
        id: `campaign-${c.id}`,
        title: c.name || planningCopy.defaults.cyberCampaign,
        start,
        end,
        resource: "campagne",
        description: c.description || null,
        clientId: c.client_id || null,
        clientName: clientName || null,
        assignedUserId: null,
        assignedUserName: null,
        equipmentName: null,
        serviceName: null,
        _isCampaign: true,
        _campaignData: c
      };
    });
  }, [campaigns, clients]);
  const allEvents = useMemo(() => [...events, ...campaignEvents], [events, campaignEvents]);
  const displayEvents = useMemo(() => {
    let filtered = [...allEvents];
    if (selectedTypes.size > 0) {
      filtered = filtered.filter(event => selectedTypes.has(event.resource));
    }
    if (selectedUsers.size === 0) {
      return [];
    }
    filtered = filtered.filter(event => {
      const eventAssignedIds = Array.isArray(event.assignedUserIds) && event.assignedUserIds.length > 0 ? event.assignedUserIds.map(id => String(id)) : event.assignedUserId || event._rawData?.assigned_user_id ? [String(event.assignedUserId || event._rawData?.assigned_user_id)] : [];
      return eventAssignedIds.some(id => selectedUsers.has(String(id)));
    });
    if (selectedClientsFilter.size > 0) {
      filtered = filtered.filter(event => {
        const clientId = event.clientId || event._rawData?.client_id;
        return clientId && selectedClientsFilter.has(String(clientId));
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
        const title = (event.title || "").toLowerCase();
        const description = (event.description || "").toLowerCase();
        const clientName = (event.clientName || "").toLowerCase();
        const assignedUserName = (event.assignedUserName || "").toLowerCase();
        const equipmentName = (event.equipmentName || "").toLowerCase();
        const serviceName = (event.serviceName || "").toLowerCase();
        return title.includes(query) || description.includes(query) || clientName.includes(query) || assignedUserName.includes(query) || equipmentName.includes(query) || serviceName.includes(query);
      });
    }
    return filtered;
  }, [allEvents, selectedTypes, selectedUsers, selectedClientsFilter, searchQuery]);
  const weekAgents = useMemo(() => pinnedAgentIds.filter(id => selectedUsers.has(String(id))).map(id => users.find(user => String(user.id) === String(id))).filter(Boolean).map(user => ({
    id: String(user.id),
    name: user.name || user.nom || user.username || planningCopy.defaults.agent
  })), [pinnedAgentIds, selectedUsers, users]);
  const toggleType = type => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };
  const toggleUser = userId => {
    const newSelected = new Set(selectedUsers);
    const userIdStr = String(userId);
    if (newSelected.has(userIdStr)) {
      newSelected.delete(userIdStr);
    } else {
      newSelected.add(userIdStr);
    }
    setSelectedUsers(newSelected);
  };
  const addPinnedAgents = userIds => {
    const ids = (Array.isArray(userIds) ? userIds : [userIds]).map(String).filter(Boolean);
    if (!ids.length) return;
    setPinnedAgentIds(prev => {
      const merged = new Set(prev.map(String));
      ids.forEach(id => merged.add(id));
      return [...merged];
    });
    setSelectedUsers(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    setAgentAddMode(null);
    setAgentFilterSearch("");
  };
  const addPinnedAgent = userId => {
    addPinnedAgents([userId]);
  };
  const loadPlanningTeams = async () => {
    if (loadingPlanningTeams) return;
    setLoadingPlanningTeams(true);
    try {
      const rows = await fetchTeamsForPlanning();
      setPlanningTeams(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Error chargement équipes planning:", error);
      setPlanningTeams([]);
      toast.error(planningCopy.toasts.teamsLoadError);
    } finally {
      setLoadingPlanningTeams(false);
    }
  };
  const openAgentAddMode = mode => {
    setAgentAddMode(prev => prev === mode ? null : mode);
    setAgentFilterSearch("");
    if (mode === "team" && planningTeams.length === 0) {
      loadPlanningTeams();
    }
  };
  const addTeamToPinned = team => {
    const memberIds = (team?.memberUserIds || []).map(String).filter(Boolean);
    if (!memberIds.length) {
      toast.info(planningCopy.formatTeamNoMembers(team?.name || planningCopy.defaults.team));
      return;
    }
    addPinnedAgents(memberIds);
    toast.success(planningCopy.formatTeamMembersAdded(memberIds.length, team.name));
  };
  const removePinnedAgent = userId => {
    const userIdStr = String(userId);
    setPinnedAgentIds(prev => prev.filter(id => id !== userIdStr));
    setSelectedUsers(prev => {
      const next = new Set(prev);
      next.delete(userIdStr);
      return next;
    });
  };
  const selectAllPinnedAgents = () => {
    setSelectedUsers(new Set(pinnedAgentIds.map(String)));
  };
  const pinnedAgents = useMemo(() => {
    const byId = new Map(users.map(u => [String(u.id), u]));
    return pinnedAgentIds.map(id => byId.get(String(id))).filter(Boolean);
  }, [pinnedAgentIds, users]);
  const availableAgentsToAdd = useMemo(() => {
    const pinned = new Set(pinnedAgentIds.map(String));
    const query = agentFilterSearch.trim().toLowerCase();
    return users.filter(u => {
      if (pinned.has(String(u.id))) return false;
      if (!query) return true;
      const name = (u.name || u.nom || u.username || u.email || "").toLowerCase();
      return name.includes(query);
    });
  }, [users, pinnedAgentIds, agentFilterSearch]);
  const availableTeamsToAdd = useMemo(() => {
    const query = agentFilterSearch.trim().toLowerCase();
    return planningTeams.filter(team => {
      if (!query) return true;
      const haystack = `${team.name || ""} ${team.description || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [planningTeams, agentFilterSearch]);
  const toggleClient = clientId => {
    const newSelected = new Set(selectedClientsFilter);
    const clientIdStr = String(clientId);
    if (newSelected.has(clientIdStr)) {
      newSelected.delete(clientIdStr);
    } else {
      newSelected.add(clientIdStr);
    }
    setSelectedClientsFilter(newSelected);
  };
  const clearFilters = () => {
    setSelectedTypes(new Set());
    setSelectedUsers(new Set());
    setSelectedClientsFilter(new Set());
    setSearchQuery("");
  };
  const activeFiltersCount = (searchQuery.trim() !== "" ? 1 : 0) + selectedTypes.size + selectedUsers.size + selectedClientsFilter.size;
  const hasActiveFilters = activeFiltersCount > 0;
  const handleTotalCardClick = () => {
    clearFilters();
  };
  const handleTypeCardClick = typeValue => {
    setSelectedTypes(new Set([typeValue]));
  };
  const eventTypes = useMemo(() => {
    const types = new Set();
    allEvents.forEach(event => {
      if (event.resource) types.add(event.resource);
    });
    return Array.from(types);
  }, [allEvents]);
  const typeCounts = useMemo(() => {
    const counts = {};
    allEvents.forEach(event => {
      const type = event.resource || "other";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allEvents]);
  const userCounts = useMemo(() => {
    const counts = {};
    allEvents.forEach(event => {
      const eventAssignedIds = Array.isArray(event.assignedUserIds) && event.assignedUserIds.length > 0 ? event.assignedUserIds.map(id => String(id)) : event.assignedUserId || event._rawData?.assigned_user_id ? [String(event.assignedUserId || event._rawData?.assigned_user_id)] : [];
      eventAssignedIds.forEach(userIdStr => {
        counts[userIdStr] = (counts[userIdStr] || 0) + 1;
      });
    });
    return counts;
  }, [allEvents]);
  const clientCounts = useMemo(() => {
    const counts = {};
    allEvents.forEach(event => {
      const clientId = event.clientId || event._rawData?.client_id;
      if (clientId) {
        const clientIdStr = String(clientId);
        counts[clientIdStr] = (counts[clientIdStr] || 0) + 1;
      }
    });
    return counts;
  }, [allEvents]);
  const handleNavigate = newDate => {
    setCurrentDate(newDate);
  };
  const getSlotDefaultTimes = slotDate => {
    const base = moment(slotDate);
    if (!base.isValid()) {
      const fallback = moment();
      return {
        startTime: "09:00",
        endTime: "12:00",
        endDate: fallback.format("YYYY-MM-DD")
      };
    }
    const isStartOfDay = base.hour() === 0 && base.minute() === 0 && base.second() === 0;
    if (isStartOfDay) {
      return {
        startTime: "09:00",
        endTime: "12:00",
        endDate: base.format("YYYY-MM-DD")
      };
    }
    const end = base.clone().add(1, "hour");
    return {
      startTime: base.format("HH:mm"),
      endTime: end.format("HH:mm"),
      endDate: end.format("YYYY-MM-DD")
    };
  };
  const handlePlanningSelectSlot = ({
    start,
    agentId = null
  }) => {
    if (!canClickCreate) return;
    if (!start || shouldSuppressSlotSelect()) return;
    const canGoToDay = view !== "day";
    if (!canCreateEvent && !canGoToDay) return;
    setDaySlotAction({
      date: new Date(start),
      slotKind: view,
      agentId: agentId || null
    });
  };
  const handleSelectSlot = ({
    start
  }) => {
    handlePlanningSelectSlot({
      start
    });
  };
  useEffect(() => {
    setDaySlotAction(null);
    markSuppressSlotSelect(350);
  }, [view, monthsShown, markSuppressSlotSelect]);
  const handleGoToSelectedDay = () => {
    if (!daySlotAction?.date) return;
    setCurrentDate(new Date(daySlotAction.date));
    setView("day");
    setDaySlotAction(null);
  };
  const openCreateEventModal = (slotDate = null, {
    agentId = null
  } = {}) => {
    if (!canCreateEvent) return;
    const base = slotDate instanceof Date && !Number.isNaN(slotDate.getTime()) ? moment(slotDate) : moment();
    const {
      startTime,
      endTime,
      endDate
    } = getSlotDefaultTimes(slotDate instanceof Date ? slotDate : base.toDate());
    const dateStr = base.format("YYYY-MM-DD");
    setEditingEvent(null);
    setEventForm({
      title: "",
      type: "intervention",
      startDate: dateStr,
      startTime,
      endDate,
      endTime,
      allDay: false,
      businessDaysOnly: true,
      durationDays: 1,
      description: "",
      clientId: null,
      equipmentId: null,
      assignedUserId: agentId || user?.id || null
    });
    setSelectedClient("");
    setSelectedAssignedUsers(agentId ? [String(agentId)] : user?.id ? [String(user.id)] : []);
    setClientSearch("");
    setSelectedLinkedItems([]);
    setTodoItems([]);
    setTodoDraft("");
    setTodoDraftColor("#15d1a0");
    setLinkedSearch("");
    setLinkedTypeFilter("all");
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
    setEventModalOpen(true);
  };
  const handleCreateEventOnSelectedDay = () => {
    if (!daySlotAction?.date) return;
    const selectedDate = new Date(daySlotAction.date);
    const agentId = daySlotAction.agentId || null;
    setDaySlotAction(null);
    openCreateEventModal(selectedDate, {
      agentId
    });
  };
  const formatDaySlotActionTitle = action => {
    const slotMoment = moment(action.date);
    const isMidnight = slotMoment.hour() === 0 && slotMoment.minute() === 0;
    const showTime = (action.slotKind === "week" || action.slotKind === "day") && !isMidnight;
    if (showTime) {
      return capitalizeLabel(slotMoment.format("dddd D MMMM YYYY · HH:mm"));
    }
    return capitalizeLabel(slotMoment.format("dddd D MMMM YYYY"));
  };
  const handleViewChange = newView => {
    setView(newView);
  };
  const handleNavigateMulti = action => {
    if (action === "TODAY") {
      setCurrentDate(moment().toDate());
      return;
    }
    const next = moment(currentDate);
    const unit = view === "week" || view === "agenda" ? "week" : view === "day" ? "day" : "month";
    if (action === "PREV") next.subtract(1, unit);else if (action === "NEXT") next.add(1, unit);
    setCurrentDate(next.toDate());
  };
  const PlanningToolbar = toolbarProps => {
    const nav = toolbarProps?.onNavigate || handleNavigateMulti;
    const activeView = toolbarProps?.view ?? view;
    const activeDate = toolbarProps?.date ?? currentDate;
    const activeMonthsShown = activeView === "month" && view === "month" ? monthsShown : 1;
    const toolbarLabel = capitalizeLabel(planningCopy.formatToolbarLabel(activeView, activeDate, activeMonthsShown));
    return <div className={styles.planningToolbar}>
        <div className={styles.toolbarNav}>
          <button type="button" onClick={() => nav("PREV")} className={`${styles.toolbarBtn} ${styles.toolbarBtnIcon}`} aria-label={planningCopy.toolbar.prevPeriod}>
            <Icon icon="mdi:chevron-left" aria-hidden />
          </button>
          <span className={styles.toolbarLabel}>{toolbarLabel}</span>
          <button type="button" onClick={() => nav("NEXT")} className={`${styles.toolbarBtn} ${styles.toolbarBtnIcon}`} aria-label={planningCopy.toolbar.nextPeriod}>
            <Icon icon="mdi:chevron-right" aria-hidden />
          </button>
        </div>
        <span className={styles.toolbarBtnGroup}>
          <SmartTooltip content={planningCopy.formatTimezoneTooltip(appTimezone)}>
            <span className={styles.toolbarTimezone}>{formatTimezoneLabel(appTimezone)}</span>
          </SmartTooltip>
          <button type="button" onClick={() => nav("TODAY")} className={styles.toolbarBtn}>
            {planningCopy.toolbar.today}
          </button>
          {[1, 2, 3].map(n => <button key={n} type="button" className={`${styles.toolbarBtn} ${view === "month" && monthsShown === n ? styles.toolbarBtnActive : ""}`} onClick={() => {
          markSuppressSlotSelect(500);
          setDaySlotAction(null);
          setView("month");
          setMonthsShown(n);
        }}>
              {planningCopy.formatMonthsButton(n)}
            </button>)}
          {["week", "day", "agenda"].map(v => <button key={v} type="button" className={`${styles.toolbarBtn} ${view === v ? styles.toolbarBtnActive : ""}`} onClick={() => {
          markSuppressSlotSelect(500);
          setDaySlotAction(null);
          setView(v);
        }}>
              {planningCopy.toolbar[v]}
            </button>)}
        </span>
      </div>;
  };
  const handleInputChange = (field, value) => {
    setEventForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleClientChange = clientId => {
    setSelectedClient(clientId);
    setEventForm(prev => ({
      ...prev,
      clientId: clientId ? parseInt(clientId) : null,
      equipmentId: null
    }));
    setSelectedLinkedItems([]);
  };
  const filteredClientOptions = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(c => (c.name || c.nom || "").toLowerCase().includes(query));
  }, [clients, clientSearch]);
  const filteredAssigneeOptions = useMemo(() => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter(u => {
      const label = (u.name || u.nom || u.username || u.email || "").toLowerCase();
      return label.includes(query);
    });
  }, [users, assigneeSearch]);
  const linkableItems = useMemo(() => {
    const byId = new Map();
    const pushUnique = item => {
      if (!item?.id) return;
      const key = `${item.group}:${String(item.id)}`;
      if (byId.has(key)) return;
      byId.set(key, item);
    };
    peripherals.forEach(p => {
      pushUnique({
        id: String(p.id),
        label: p.name,
        type: p.type,
        group: planningCopy.linkedGroups.infrastructure
      });
    });
    cybersecurities.forEach(c => {
      pushUnique({
        id: String(c.id),
        label: c.name,
        type: c.type,
        group: c.type === "Antivirus" || c.type === "Antispam" ? c.type : planningCopy.linkedGroups.cybersecurity
      });
    });
    services.forEach(s => {
      pushUnique({
        id: String(s.id),
        label: s.name,
        type: s.type,
        group: s.type === "Office365" ? planningCopy.linkedGroups.tenant : planningCopy.linkedGroups.ndd
      });
    });
    return Array.from(byId.values());
  }, [peripherals, cybersecurities, services, planningCopy]);
  const getLinkedTypeOrderIndex = itemOrType => {
    const typeValue = typeof itemOrType === "string" ? itemOrType : itemOrType?.type || itemOrType?.group || "";
    const type = String(typeValue).toLowerCase();
    if (type.includes("internet")) return 0;
    if (type.includes("firewall")) return 1;
    if (type.includes("serveur")) return 2;
    if (type.includes("stock")) return 3;
    if (type.includes("switch")) return 4;
    if (type.includes("borne") || type.includes("wifi")) return 5;
    if (type.includes("camera") || type.includes("cam")) return 6;
    if (type.includes("antivirus")) return 7;
    if (type.includes("antispam")) return 8;
    if (type.includes("sauveg")) return 9;
    if (type.includes("office365") || type.includes("tenant")) return 10;
    if (type.includes("ndd") || type.includes("domaine")) return 11;
    return 99;
  };
  const getLinkedTypeLabel = eventFormCopy.getLinkedTypeLabel;
  const linkedTypeOptions = useMemo(() => {
    const set = new Set(linkableItems.map(item => item.type).filter(Boolean));
    return Array.from(set).sort((a, b) => {
      const orderDiff = getLinkedTypeOrderIndex(a) - getLinkedTypeOrderIndex(b);
      if (orderDiff !== 0) return orderDiff;
      return String(a).localeCompare(String(b), locale);
    });
  }, [linkableItems, locale]);
  const linkedTypeButtons = useMemo(() => eventFormCopy.linkedTypeButtons(linkedTypeOptions), [eventFormCopy, linkedTypeOptions]);
  const linkableItemsByGroup = useMemo(() => {
    const grouped = {};
    const query = linkedSearch.trim().toLowerCase();
    linkableItems.filter(item => {
      if (linkedTypeFilter !== "all" && item.type !== linkedTypeFilter) return false;
      if (!query) return true;
      return (item.label || "").toLowerCase().includes(query) || (item.type || "").toLowerCase().includes(query) || (item.group || "").toLowerCase().includes(query);
    }).sort((a, b) => {
      const typeCmp = getLinkedTypeOrderIndex(a) - getLinkedTypeOrderIndex(b);
      if (typeCmp !== 0) return typeCmp;
      return String(a.label || "").localeCompare(String(b.label || ""), locale);
    }).forEach(item => {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    });
    return grouped;
  }, [linkableItems, linkedSearch, linkedTypeFilter]);
  const toggleLinkedItem = itemId => {
    setSelectedLinkedItems(prev => {
      const exists = prev.includes(itemId);
      if (exists) return prev.filter(id => id !== itemId);
      return [...prev, itemId];
    });
  };
  const addTodoItem = () => {
    const text = todoDraft.trim();
    if (!text) return;
    setTodoItems(prev => [...prev, {
      id: `todo-${Date.now()}`,
      text,
      done: false,
      color: todoDraftColor || "#15d1a0"
    }]);
    setTodoDraft("");
  };
  const moveTodoItemById = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setTodoItems(prev => {
      const fromIndex = prev.findIndex(item => item.id === sourceId);
      const toIndex = prev.findIndex(item => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };
  const persistEventAssignee = useCallback(async (calendarEvent, assignedUserId) => {
    const eventId = getPlanningEventId(calendarEvent);
    if (!eventId || calendarEvent._isCampaign || !assignedUserId) return null;
    if (String(assignedUserId) === String(getEventPrimaryAgentId(calendarEvent))) {
      return null;
    }
    const newStart = new Date(calendarEvent.start);
    const newEnd = new Date(calendarEvent.end);
    const payload = buildEventMovePayload(calendarEvent, newStart, newEnd, {
      assignedUserId
    });
    const assignee = users.find(u => String(u.id) === String(assignedUserId));
    const assignedUserName = assignee?.name || assignee?.nom || assignee?.username || null;
    let rollback = null;
    setEvents(prev => {
      rollback = prev;
      return applyLocalEventMove(prev, eventId, {
        start: newStart,
        end: newEnd,
        assignedUserId,
        users
      });
    });
    try {
      await updateEvent(eventId, payload);
      toast.success(planningCopy.toasts.assigneeUpdated);
      return {
        assignedUserId: String(assignedUserId),
        assignedUserName
      };
    } catch (error) {
      if (rollback) setEvents(rollback);
      toast.error(error.message || planningCopy.toasts.assigneeUpdateError);
      throw error;
    }
  }, [users, planningCopy]);
  const handleAssignAgentFromTooltip = useCallback((calendarEvent, assignedUserId) => persistEventAssignee(calendarEvent, assignedUserId), [persistEventAssignee]);
  const persistEventMove = useCallback(async (calendarEvent, newStart, newEnd, {
    assignedUserId
  } = {}) => {
    if (!isPlanningEventDraggable(calendarEvent)) return;
    const eventId = getPlanningEventId(calendarEvent);
    if (!eventId) return;
    const payload = buildEventMovePayload(calendarEvent, newStart, newEnd, {
      assignedUserId
    });
    let rollback = null;
    setEvents(prev => {
      rollback = prev;
      return applyLocalEventMove(prev, eventId, {
        start: newStart,
        end: newEnd,
        assignedUserId,
        users
      });
    });
    try {
      await updateEvent(eventId, payload);
    } catch (error) {
      if (rollback) setEvents(rollback);
      toast.error(error.message || planningCopy.toasts.moveError);
    }
  }, [users, planningCopy]);
  const handleCalendarEventDrop = useCallback(({
    event,
    start,
    end
  }) => {
    if (!isPlanningEventDraggable(event)) return;
    markSuppressSlotSelect();
    setDaySlotAction(null);
    persistEventMove(event, start, end);
  }, [markSuppressSlotSelect, persistEventMove]);
  const handleCalendarEventResize = useCallback(({
    event,
    start,
    end
  }) => {
    if (!isPlanningEventDraggable(event)) return;
    markSuppressSlotSelect();
    setDaySlotAction(null);
    persistEventMove(event, start, end);
  }, [markSuppressSlotSelect, persistEventMove]);
  const handleMonthEventDrop = useCallback((eventId, targetDate) => {
    const calendarEvent = displayEvents.find(item => String(getPlanningEventId(item)) === String(eventId));
    if (!calendarEvent || !isPlanningEventDraggable(calendarEvent)) return;
    markSuppressSlotSelect();
    setDaySlotAction(null);
    const {
      start,
      end
    } = computeMonthDropRange(calendarEvent, targetDate);
    persistEventMove(calendarEvent, start, end);
  }, [displayEvents, markSuppressSlotSelect, persistEventMove]);
  const handleWeekEventMove = useCallback(({
    event,
    start,
    agentId,
    allDay = false,
    preserveSchedule = false
  }) => {
    if (!isPlanningEventDraggable(event)) return;
    markSuppressSlotSelect();
    setDaySlotAction(null);
    if (preserveSchedule && agentId) {
      persistEventMove(event, new Date(event.start), new Date(event.end), {
        assignedUserId: agentId
      });
      return;
    }
    if (allDay) {
      const {
        start: nextStart,
        end: nextEnd
      } = computeMovedAllDayRange(event, moment(start));
      persistEventMove(event, nextStart, nextEnd, {
        assignedUserId: agentId
      });
      return;
    }
    const slotStart = moment(start);
    const {
      start: nextStart,
      end: nextEnd
    } = computeMovedTimedRange(event, slotStart.toDate());
    persistEventMove(event, nextStart, nextEnd, {
      assignedUserId: agentId
    });
  }, [markSuppressSlotSelect, persistEventMove]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      toast.error(eventFormCopy.toasts.titleRequired);
      return;
    }
    if (!Array.isArray(selectedAssignedUsers) || selectedAssignedUsers.length === 0) {
      toast.error(eventFormCopy.toasts.assigneeRequired);
      return;
    }
    if (!eventForm.startDate || !eventForm.endDate) {
      toast.error(eventFormCopy.toasts.datesRequired);
      return;
    }
    const isAllDay = !!eventForm.allDay;
    const safeDurationDays = Math.max(1, Number(eventForm.durationDays) || 1);
    const startMomentValue = isAllDay ? moment(eventForm.startDate).startOf("day") : moment(`${eventForm.startDate} ${eventForm.startTime}`, "YYYY-MM-DD HH:mm");
    const endMomentValue = isAllDay ? (eventForm.businessDaysOnly ? getBusinessEndDate(eventForm.startDate, safeDurationDays) : getCalendarEndDate(eventForm.startDate, safeDurationDays)).endOf("day") : moment(`${eventForm.endDate} ${eventForm.endTime}`, "YYYY-MM-DD HH:mm");
    if (!startMomentValue.isValid() || !endMomentValue.isValid()) {
      toast.error(eventFormCopy.toasts.invalidDates);
      return;
    }
    if (!endMomentValue.isAfter(startMomentValue)) {
      toast.error(eventFormCopy.toasts.endBeforeStart);
      return;
    }
    setSaving(true);
    try {
      const linkedItemsPayload = selectedLinkedItems.map(id => linkableItems.find(item => String(item.id) === String(id))).filter(Boolean);
      const primaryEquipmentId = selectedLinkedItems.length > 0 ? String(selectedLinkedItems[0]) : eventForm.equipmentId && String(eventForm.equipmentId).trim() !== "" ? String(eventForm.equipmentId).trim() : null;
      const existingMeta = parseEventDescription(editingEvent?._rawData?.description || editingEvent?.description || "").meta || {};
      const descriptionValue = serializeEventDescription(eventForm.description, {
        ...existingMeta,
        linkedItems: linkedItemsPayload,
        assignedUserIds: selectedAssignedUsers,
        schedule: {
          allDay: isAllDay,
          businessDaysOnly: !!eventForm.businessDaysOnly,
          durationDays: safeDurationDays
        },
        todos: todoItems.map(todo => ({
          ...todo,
          text: (todo.text || "").trim(),
          color: todo.color || "#15d1a0"
        })).filter(todo => todo.text)
      });
      const eventData = {
        title: eventForm.title.trim(),
        type: eventForm.type,
        start: formatPlanningDateTime(startMomentValue),
        end: formatPlanningDateTime(endMomentValue),
        description: descriptionValue,
        clientId: eventForm.clientId || null,
        equipmentId: primaryEquipmentId,
        assignedUserId: selectedAssignedUsers.length > 0 ? selectedAssignedUsers[0] : eventForm.assignedUserId || null
      };
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        const eventsList = await fetchEvents();
        const usersList = await fetchUsers().catch(() => []);
        const clientsList = await loadPlanningClientsListCached({
          force: true
        });
        const eventClientIds = [...new Set((Array.isArray(eventsList) ? eventsList : []).map(e => resolvePlanningEventClientId(e)).filter(Boolean))];
        const hydratedClients = await hydrateClientsEquipements(eventClientIds, clientsList);
        setClients(hydratedClients);
        const formattedEvents = formatEventsWithEnrichedData(eventsList, hydratedClients, usersList);
        setEvents(formattedEvents);
        toast.success(eventFormCopy.toasts.updated);
      } else {
        await createEvent(eventData);
        const eventsList = await fetchEvents();
        const usersList = await fetchUsers().catch(() => []);
        const clientsList = await loadPlanningClientsListCached({
          force: true
        });
        const eventClientIds = [...new Set((Array.isArray(eventsList) ? eventsList : []).map(e => resolvePlanningEventClientId(e)).filter(Boolean))];
        const hydratedClients = await hydrateClientsEquipements(eventClientIds, clientsList);
        setClients(hydratedClients);
        const formattedEvents = formatEventsWithEnrichedData(eventsList, hydratedClients, usersList);
        setEvents(formattedEvents);
        toast.success(eventFormCopy.toasts.created);
      }
      setEventForm({
        title: "",
        type: "intervention",
        startDate: moment().format("YYYY-MM-DD"),
        startTime: "09:00",
        endDate: moment().format("YYYY-MM-DD"),
        endTime: "12:00",
        allDay: false,
        businessDaysOnly: true,
        durationDays: 1,
        description: "",
        clientId: null,
        equipmentId: null,
        assignedUserId: user?.id || null
      });
      setSelectedClient("");
      setSelectedAssignedUsers(user?.id ? [String(user.id)] : []);
      setSelectedLinkedItems([]);
      setTodoItems([]);
      setTodoDraft("");
      setTodoDraftColor("#15d1a0");
      setClientSearch("");
      setLinkedSearch("");
      setLinkedTypeFilter("all");
      setAssigneeSearch("");
      setAssigneeDropdownOpen(false);
      setEditingEvent(null);
      setEventModalOpen(false);
    } catch (error) {
      console.error(`Error lors de ${editingEvent ? 'la mise à jour' : 'la création'} de l'événement:`, error);
      toast.error(error.message || (editingEvent ? eventFormCopy.toasts.updateError : eventFormCopy.toasts.createError));
    } finally {
      setSaving(false);
    }
  };
  const handleSelectEvent = event => {
    if (event._isCampaign && event._campaignData && onNavigate) {
      onNavigate("CampaignDetail", {
        campaign: event._campaignData
      });
      return;
    }
    if (!canEditEvent) return;
    const rawEvent = event._rawData || event;
    const startMoment = planningMoment(rawEvent.start || event.start);
    const endMoment = planningMoment(rawEvent.end || event.end);
    const parsedDescription = parseEventDescription(rawEvent.description || event.description || "");
    const parsedMeta = parsedDescription.meta || {};
    const linkedItemsMeta = Array.isArray(parsedMeta.linkedItems) ? parsedMeta.linkedItems : [];
    const todosMeta = Array.isArray(parsedMeta.todos) ? parsedMeta.todos : [];
    const scheduleMeta = parsedMeta.schedule && typeof parsedMeta.schedule === "object" ? parsedMeta.schedule : null;
    const assignedUserIdsMeta = Array.isArray(parsedMeta.assignedUserIds) ? parsedMeta.assignedUserIds.map(id => String(id)).filter(Boolean) : [];
    const inferredAllDay = startMoment.format("HH:mm") === "00:00" && endMoment.format("HH:mm") === "23:59";
    const allDayValue = typeof scheduleMeta?.allDay === "boolean" ? scheduleMeta.allDay : inferredAllDay;
    const businessDaysOnlyValue = typeof scheduleMeta?.businessDaysOnly === "boolean" ? scheduleMeta.businessDaysOnly : true;
    const durationValue = Number(scheduleMeta?.durationDays) > 0 ? Math.floor(Number(scheduleMeta.durationDays)) : businessDaysOnlyValue ? getBusinessDaysCountInclusive(startMoment, endMoment) : getCalendarDaysCountInclusive(startMoment, endMoment);
    setEventForm({
      title: rawEvent.title || event.title || "",
      type: rawEvent.type || event.resource || "intervention",
      startDate: startMoment.format("YYYY-MM-DD"),
      startTime: startMoment.format("HH:mm"),
      endDate: endMoment.format("YYYY-MM-DD"),
      endTime: endMoment.format("HH:mm"),
      allDay: allDayValue,
      businessDaysOnly: businessDaysOnlyValue,
      durationDays: durationValue,
      description: parsedDescription.text || "",
      clientId: rawEvent.client_id || event.clientId || null,
      equipmentId: rawEvent.equipment_id || event.equipmentId || null,
      assignedUserId: rawEvent.assigned_user_id || event.assignedUserId || user?.id || null
    });
    setSelectedAssignedUsers(assignedUserIdsMeta.length > 0 ? assignedUserIdsMeta : rawEvent.assigned_user_id || event.assignedUserId ? [String(rawEvent.assigned_user_id || event.assignedUserId)] : user?.id ? [String(user.id)] : []);
    setEditingEvent({
      id: rawEvent.id || event.id,
      ...rawEvent
    });
    const linkedFallback = rawEvent.equipment_id ? [String(rawEvent.equipment_id)] : [];
    setSelectedLinkedItems(linkedItemsMeta.length > 0 ? linkedItemsMeta.map(item => String(item.id)).filter(Boolean) : linkedFallback);
    setTodoItems(todosMeta.map(todo => ({
      id: todo.id || `todo-${Date.now()}-${Math.random()}`,
      text: todo.text || "",
      done: !!todo.done,
      color: todo.color || "#15d1a0"
    })));
    setTodoDraft("");
    setTodoDraftColor("#15d1a0");
    setLinkedSearch("");
    setLinkedTypeFilter("all");
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
    const clientId = rawEvent.client_id || event.clientId;
    if (clientId) {
      setSelectedClient(String(clientId));
      const client = clients.find(c => String(c.id) === String(clientId));
      setClientSearch(client?.name || client?.nom || "");
    } else {
      setSelectedClient("");
      setClientSearch("");
    }
    setEventModalOpen(true);
  };
  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!window.confirm(eventFormCopy.deleteEvent.confirm)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteEvent(editingEvent.id);
      setEvents(prev => prev.filter(event => event.id !== editingEvent.id));
      toast.success(eventFormCopy.deleteEvent.success);
      handleCloseModal();
    } catch (error) {
      console.error("Error while deleting de l'événement:", error);
      toast.error(error.message || eventFormCopy.deleteEvent.error);
    } finally {
      setDeleting(false);
    }
  };
  const handleCloseModal = () => {
    setEventModalOpen(false);
    setEditingEvent(null);
    setEventForm({
      title: "",
      type: "intervention",
      startDate: moment().format("YYYY-MM-DD"),
      startTime: "09:00",
      endDate: moment().format("YYYY-MM-DD"),
      endTime: "12:00",
      allDay: false,
      durationDays: 1,
      description: "",
      clientId: null,
      equipmentId: null,
      assignedUserId: user?.id || null
    });
    setSelectedClient("");
    setSelectedAssignedUsers(user?.id ? [String(user.id)] : []);
    setSelectedLinkedItems([]);
    setTodoItems([]);
    setTodoDraft("");
    setTodoDraftColor("#15d1a0");
    setClientSearch("");
    setClientDropdownOpen(false);
    setLinkedSearch("");
    setLinkedTypeFilter("all");
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
  };
  const renderEventPreviewCard = event => ({
    close
  }) => {
    const canEditThisEvent = Boolean(event?._isCampaign) || canEditEvent;
    return <PlanningEventHoverCard event={event} users={users} onNavigate={onNavigate} onClose={close} onAssignAgent={handleAssignAgentFromTooltip} copy={hoverCardCopy} onEdit={canEditThisEvent ? () => {
      close();
      handleSelectEvent(event);
    } : undefined} />;
  };
  const EventComponent = props => {
    const {
      nativeMonthDrag = false,
      continuesPrior,
      continuesAfter,
      onMonthEventResize
    } = props;
    const event = props.event || {};
    if (nativeMonthDrag) {
      return <PlanningMonthEventBar event={event} continuesPrior={continuesPrior} continuesAfter={continuesAfter} renderPreview={renderEventPreviewCard} onMonthEventResize={onMonthEventResize} eventFallbackTitle={planningCopy.defaults.event} />;
    }
    const title = event.title || planningCopy.defaults.event;
    const timeStr = event.start ? moment(event.start).format("HH:mm") : "";
    const typeIcon = getPlanningEventTypeIcon(event);
    return <SmartTooltip trigger="click-contextmenu" interactive clickSuppressOnDrag content={renderEventPreviewCard(event)} tooltipClassName={styles.eventHoverPortal} data-tooltip-position="planning-popover" as="span" className={styles.eventBarWrapper}>
        <span className={styles.eventBarContent}>
          <Icon icon={typeIcon} className={styles.eventTypeIcon} aria-hidden />
          {timeStr ? <span className={styles.eventBarTime}>{timeStr}</span> : null}
          <span className={styles.eventBarTitle}>{title}</span>
        </span>
      </SmartTooltip>;
  };
  const renderWeekEvent = event => {
    const title = event.title || planningCopy.defaults.event;
    const timeStr = event.start ? moment(event.start).format("HH:mm") : "";
    const typeIcon = getPlanningEventTypeIcon(event);
    return <SmartTooltip trigger="click-contextmenu" interactive clickSuppressOnDrag content={renderEventPreviewCard(event)} tooltipClassName={styles.eventHoverPortal} data-tooltip-position="planning-popover" as="span" className={styles.weekEventTooltipWrap}>
        <span className={styles.weekEventLabel}>
          <Icon icon={typeIcon} className={styles.eventTypeIcon} aria-hidden />
          {timeStr ? `${timeStr} ` : ""}
          {title}
        </span>
      </SmartTooltip>;
  };
  const eventStyleGetter = planningEventStyleGetter;
  const planningTypes = eventFormCopy.planningTypes;
  const portfolioTotal = allEvents.length;
  const renderFilterItem = (key, label, count, active, onClick, icon) => <button key={key} type="button" className={`${styles.filterItem} ${active ? styles.filterItemActive : ""} ${count === 0 ? styles.filterItemDisabled : ""}`} onClick={onClick} disabled={count === 0}>
      <span className={styles.filterItemMain}>
        <span className={styles.filterItemCount}>{count}</span>
        {icon ? <Icon icon={icon} className={styles.filterItemIcon} aria-hidden /> : null}
        <span className={styles.filterItemLabel}>{label}</span>
      </span>
    </button>;
  const renderAgentFilterRow = userItem => {
    const userIdStr = String(userItem.id);
    const count = userCounts[userIdStr] || 0;
    const userName = userItem.name || userItem.nom || userItem.username || planningCopy.defaults.user;
    const active = selectedUsers.has(userIdStr);
    const isMe = String(userItem.id) === String(user?.id);
    return <div key={userItem.id} className={`${styles.agentFilterRow} ${active ? styles.agentFilterRowActive : ""}`}>
        <button type="button" className={styles.agentFilterToggle} onClick={() => toggleUser(userItem.id)} aria-pressed={active} title={active ? planningCopy.formatHideAgentPlanning(userName) : planningCopy.formatShowAgentPlanning(userName)}>
          <span className={`${styles.agentFilterCheck} ${active ? styles.agentFilterCheckActive : ""}`} aria-hidden>
            {active ? <Icon icon="mdi:check" /> : null}
          </span>
          <span className={styles.agentColorDot} style={{
          backgroundColor: getAgentColor(userItem.id)
        }} aria-hidden />
          <span className={styles.filterItemCount}>{count}</span>
          <Icon icon="mdi:account-outline" className={styles.filterItemIcon} aria-hidden />
          <span className={styles.filterItemLabel}>
            {userName}
            {isMe ? ` ${planningCopy.filters.meSuffix}` : ""}
          </span>
        </button>
        <button type="button" className={styles.agentFilterRemove} onClick={() => removePinnedAgent(userItem.id)} aria-label={planningCopy.formatRemoveAgentFromList(userName)} title={planningCopy.filters.removeFromList}>
          <FaTimes />
        </button>
      </div>;
  };
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={planningCopy.eyebrow} title={planningCopy.title} subtitle={loading ? planningCopy.loading : planningCopy.formatEventsSubtitle(displayEvents.length, portfolioTotal)} icon="mdi:calendar-clock-outline" actions={canCreateEvent ? <button type="button" className={`${layout.primaryBtn} ${layout.primaryBtnIconOnly}`} onClick={() => openCreateEventModal()} aria-label={planningCopy.newEvent}>
                <FaPlus />
              </button> : null} />

          <main className={`${mspStyles.mspContent} ${mspStyles.mspContentList}`}>
            <div className={`${layout.shell} ${layout.shellWide} ${layout.shellFull} ${styles.planningShell}`}>
        {!loading && <div className={styles.kpiRowPlanning}>
            <button type="button" className={`${layout.kpiCard} ${!hasActiveFilters ? layout.kpiCardActive : ""}`} onClick={handleTotalCardClick}>
              <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_blue}`}>
                <Icon icon="mdi:calendar-month" />
              </div>
              <div className={layout.kpiBody}>
                <span className={layout.kpiValue}>{events.length}</span>
                <span className={layout.kpiLabel}>{planningCopy.kpi.total}</span>
              </div>
            </button>
            {planningTypes.map(type => {
                const count = typeCounts[type.value] || 0;
                const active = selectedTypes.has(type.value) && selectedTypes.size === 1;
                return <button key={type.value} type="button" className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""} ${count === 0 ? layout.kpiCardDisabled : ""}`} onClick={() => handleTypeCardClick(type.value)} disabled={count === 0}>
                  <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${type.kpiTone}`] || layout.kpiIcon_blue}`}>
                    <Icon icon={type.icon} />
                  </div>
                  <div className={layout.kpiBody}>
                    <span className={layout.kpiValue}>{count}</span>
                    <span className={layout.kpiLabel}>{type.label}</span>
                  </div>
                </button>;
              })}
          </div>}

        <div className={styles.viewsLayout}>
          <aside className={styles.filtersPane} aria-label={planningCopy.filters.aria}>
            <div className={`${styles.filtersPaneSection} ${styles.filtersPaneSectionAgents}`}>
              <div className={styles.filtersPaneHeader}>
                <span className={styles.filtersPaneTitle}>{planningCopy.filters.agents}</span>
                <div className={styles.filtersPaneHeaderActions}>
                  {pinnedAgentIds.length > 1 && selectedUsers.size < pinnedAgentIds.length && <button type="button" className={styles.filtersPaneAction} onClick={selectAllPinnedAgents}>
                      {planningCopy.filters.all}
                    </button>}
                  {selectedUsers.size > 0 && <button type="button" className={styles.filtersPaneAction} onClick={() => setSelectedUsers(new Set())}>
                      {planningCopy.filters.none}
                    </button>}
                </div>
              </div>
              <div className={styles.agentAddRow} ref={agentFilterAddRef}>
                <div className={styles.agentAddBtnGroup}>
                  <button type="button" className={`${styles.agentAddBtn} ${agentAddMode === "agent" ? styles.agentAddBtnActive : ""}`} onClick={() => openAgentAddMode("agent")} aria-expanded={agentAddMode === "agent"}>
                    <FaPlus aria-hidden />
                    {planningCopy.filters.agent}
                  </button>
                  <button type="button" className={`${styles.agentAddBtn} ${styles.agentAddBtnTeam} ${agentAddMode === "team" ? styles.agentAddBtnActive : ""}`} onClick={() => openAgentAddMode("team")} aria-expanded={agentAddMode === "team"}>
                    <Icon icon="mdi:account-group-outline" aria-hidden />
                    {planningCopy.filters.team}
                  </button>
                </div>
                {agentAddMode && <div className={styles.agentAddDropdown}>
                    <input type="text" className={styles.agentAddSearch} value={agentFilterSearch} onChange={e => setAgentFilterSearch(e.target.value)} placeholder={agentAddMode === "team" ? planningCopy.filters.searchTeam : planningCopy.filters.searchAgent} autoComplete="off" autoFocus />
                    <div className={styles.agentAddList}>
                      {agentAddMode === "agent" ? availableAgentsToAdd.length === 0 ? <p className={styles.agentAddEmpty}>
                            {agentFilterSearch.trim() ? planningCopy.filters.noAgentFound : planningCopy.filters.allAgentsPinned}
                          </p> : availableAgentsToAdd.map(userItem => {
                          const userName = userItem.name || userItem.nom || userItem.username || userItem.email || planningCopy.defaults.user;
                          const isMe = String(userItem.id) === String(user?.id);
                          return <button key={userItem.id} type="button" className={styles.agentAddOption} onClick={() => addPinnedAgent(userItem.id)}>
                                <Icon icon="mdi:account-outline" aria-hidden />
                                <span>
                                  {userName}
                                  {isMe ? ` ${planningCopy.filters.meSuffix}` : ""}
                                </span>
                              </button>;
                        }) : loadingPlanningTeams ? <p className={styles.agentAddEmpty}>{planningCopy.filters.loadingTeams}</p> : availableTeamsToAdd.length === 0 ? <p className={styles.agentAddEmpty}>
                          {agentFilterSearch.trim() ? planningCopy.filters.noTeamFound : planningCopy.filters.noActiveTeams}
                        </p> : availableTeamsToAdd.map(team => <button key={team.id} type="button" className={styles.teamAddOption} onClick={() => addTeamToPinned(team)} style={team.color ? {
                          "--team-color": team.color
                        } : undefined}>
                            <span className={styles.teamAddIcon} style={team.color ? {
                            backgroundColor: `${team.color}22`,
                            color: team.color
                          } : undefined}>
                              <Icon icon={team.icon || "mdi:account-group-outline"} aria-hidden />
                            </span>
                            <span className={styles.teamAddBody}>
                              <span className={styles.teamAddName}>{team.name}</span>
                              <span className={styles.teamAddMeta}>
                                {planningCopy.formatTeamMemberCount(team.memberCount || 0)}
                                {team.description ? ` · ${team.description}` : ""}
                              </span>
                            </span>
                          </button>)}
                    </div>
                  </div>}
              </div>
              <div className={styles.agentsFiltersList}>
                {pinnedAgents.length === 0 ? <p className={styles.agentFilterHint}>
                    {planningCopy.filters.addAgentsHint}
                  </p> : pinnedAgents.map(userItem => renderAgentFilterRow(userItem))}
              </div>
              {selectedUsers.size > 1 && <p className={styles.agentFilterMeta}>
                  {planningCopy.formatAgentsSelected(selectedUsers.size)}
                </p>}
            </div>

            <div className={`${styles.filtersPaneSection} ${styles.filtersPaneSectionClients}`}>
              <div className={styles.filtersPaneHeader}>
                <span className={styles.filtersPaneTitle}>{planningCopy.filters.clients}</span>
                {selectedClientsFilter.size > 0 && <button type="button" className={styles.filtersPaneAction} onClick={() => setSelectedClientsFilter(new Set())}>
                    {planningCopy.filters.clear}
                  </button>}
              </div>
              <div className={styles.filtersList}>
                {clients.map(client => {
                      const clientIdStr = String(client.id);
                      const count = clientCounts[clientIdStr] || 0;
                      const clientName = client.name || client.nom || planningCopy.defaults.client;
                      return renderFilterItem(client.id, clientName, count, selectedClientsFilter.has(clientIdStr), () => toggleClient(client.id), "mdi:office-building-outline");
                    })}
              </div>
            </div>
          </aside>

          <div className={styles.mainColumn}>
            <div className={`${layout.toolbar} ${styles.toolbarGrow}`}>
              <div className={`${layout.searchWrap} ${styles.searchWrapFull}`}>
                <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                <input type="text" inputMode="search" enterKeyHint="search" placeholder={planningCopy.search.placeholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={layout.searchInput} aria-label={planningCopy.search.aria} />
                {searchQuery && <button type="button" className={layout.clearButton} onClick={() => setSearchQuery("")} aria-label={planningCopy.search.clear}>
                    <FaTimes />
                  </button>}
              </div>
              <span className={layout.toolbarMeta}>{displayEvents.length}</span>
              {hasActiveFilters && <SmartTooltip content={planningCopy.search.clearFilters}>
                  <button type="button" className={`${layout.chip} ${layout.chipReset} ${layout.chipIconOnly}`} onClick={clearFilters} aria-label={planningCopy.search.clearFilters}>
                    <Icon icon="mdi:filter-off" className={layout.chipIcon} />
                  </button>
                </SmartTooltip>}
            </div>

            {loading ? <div className={layout.stateBox}>
                <Icon icon="mdi:loading" className={layout.spinning} />
                <span>{planningCopy.loading}</span>
              </div> : <div className={styles.calendarPanel}>
                <div className={`${styles.calendarBody} ${view === "month" ? styles.calendarBodyMonth : ""} ${view === "month" && monthsShown === 1 ? styles.calendarBodyMonthSingle : ""} ${view === "week" ? styles.calendarBodyWeek : ""} ${view === "day" ? styles.calendarBodyDay : ""} ${view === "agenda" ? styles.calendarBodyAgenda : ""}`}>
                {view === "month" ? <>
                    <PlanningToolbar />
                    <PlanningMultiMonthView currentDate={currentDate} monthsShown={monthsShown} events={displayEvents} localizer={localizer} calendarHeight={getMonthViewHeight(monthsShown)} EventComponent={EventComponent} eventPropGetter={eventStyleGetter} onSelectSlot={canClickCreate ? handleSelectSlot : undefined} onNavigate={handleNavigate} onMonthEventDrop={handleMonthEventDrop} onMonthEventResize={handleCalendarEventResize} calendarMessages={planningCopy.calendarMessages} culture={locale} />
                  </> : view === "week" ? <>
                    <PlanningToolbar />
                    <PlanningWeekResourceView currentDate={currentDate} events={displayEvents} agents={weekAgents} renderEvent={renderWeekEvent} onSelectSlot={canClickCreate ? handlePlanningSelectSlot : undefined} onEventMove={handleWeekEventMove} onEventResize={handleCalendarEventResize} isEventDraggable={isPlanningEventDraggable} getEventColors={(event, agentId) => getPlanningEventColors(event, agentId)} onDragInteractionEnd={() => markSuppressSlotSelect(500)} weekCopy={hoverCardCopy} />
                  </> : view === "agenda" ? <>
                    <PlanningToolbar />
                    <PlanningAgendaView currentDate={currentDate} events={displayEvents} renderEventPreview={renderEventPreviewCard} copy={planningCopy} />
                  </> : view === "day" ? <>
                    <PlanningToolbar />
                    <div className={styles.calendarDayWrapper}>
                      <DragAndDropCalendar localizer={localizer} events={displayEvents} startAccessor="start" endAccessor="end" view="day" date={currentDate} toolbar={false} selectable={canClickCreate} draggableAccessor={isPlanningEventDraggable} resizableAccessor={isPlanningEventDraggable} resizable onEventDrop={handleCalendarEventDrop} onEventResize={handleCalendarEventResize} onNavigate={handleNavigate} onSelectSlot={canClickCreate ? handleSelectSlot : undefined} tooltipAccessor={() => ""} style={{
                          height: "100%"
                        }} eventPropGetter={eventStyleGetter} components={{
                          event: EventComponent,
                          toolbar: () => null
                        }} messages={planningCopy.calendarMessages} culture={locale} />
                    </div>
                  </> : null}
                </div>
                <div className={styles.legendBar}>
                  {planningCopy.legendItems.map(item => <div key={item.value} className={styles.legendItem}>
                      <Icon icon={item.icon} className={styles.legendIcon} aria-hidden />
                      <span>{item.label}</span>
                    </div>)}
                </div>
              </div>}
          </div>
        </div>
            </div>
          </main>
        </div>
      </div>

      {daySlotAction?.date && <div className={styles.dayActionOverlay} onClick={() => setDaySlotAction(null)} role="presentation">
          <div className={styles.dayActionCard} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="planning-day-action-title">
            <div className={styles.dayActionHeader}>
              <h3 id="planning-day-action-title" className={styles.dayActionTitle}>
                {formatDaySlotActionTitle(daySlotAction)}
              </h3>
              <button type="button" className={styles.dayActionClose} onClick={() => setDaySlotAction(null)} aria-label={planningCopy.dayAction.close}>
                <FaTimes />
              </button>
            </div>
            <p className={styles.dayActionHint}>{planningCopy.dayAction.hint}</p>
            <div className={styles.dayActionButtons}>
              {canCreateEvent ? <button type="button" className={styles.dayActionBtnPrimary} onClick={handleCreateEventOnSelectedDay}>
                <Icon icon="mdi:calendar-plus" aria-hidden />
                {planningCopy.dayAction.createEvent}
              </button> : null}
              {view !== "day" ? <button type="button" className={canCreateEvent ? styles.dayActionBtnSecondary : styles.dayActionBtnPrimary} onClick={handleGoToSelectedDay}>
                  <Icon icon="mdi:calendar-arrow-right" aria-hidden />
                  {planningCopy.dayAction.goToDate}
                </button> : null}
            </div>
          </div>
        </div>}

      <PlanningEventFormModal open={eventModalOpen} editingEvent={editingEvent} copy={eventFormCopy} saving={saving} deleting={deleting} onClose={handleCloseModal} onSubmit={handleSubmit} onDelete={handleDelete} eventForm={eventForm} onInputChange={handleInputChange} planningTypes={planningTypes} clientSearch={clientSearch} setClientSearch={setClientSearch} clientDropdownOpen={clientDropdownOpen} setClientDropdownOpen={setClientDropdownOpen} clientAutocompleteRef={clientAutocompleteRef} filteredClientOptions={filteredClientOptions} selectedClient={selectedClient} onClientChange={handleClientChange} users={users} currentUser={user} selectedAssignedUsers={selectedAssignedUsers} setSelectedAssignedUsers={setSelectedAssignedUsers} assigneeSearch={assigneeSearch} setAssigneeSearch={setAssigneeSearch} assigneeDropdownOpen={assigneeDropdownOpen} setAssigneeDropdownOpen={setAssigneeDropdownOpen} assigneeSelectRef={assigneeSelectRef} filteredAssigneeOptions={filteredAssigneeOptions} selectedLinkedItems={selectedLinkedItems} toggleLinkedItem={toggleLinkedItem} linkableItems={linkableItems} linkableItemsByGroup={linkableItemsByGroup} linkedSearch={linkedSearch} setLinkedSearch={setLinkedSearch} linkedTypeFilter={linkedTypeFilter} setLinkedTypeFilter={setLinkedTypeFilter} linkedTypeButtons={linkedTypeButtons} loadingLinkedItems={loadingLinkedItems} todoItems={todoItems} setTodoItems={setTodoItems} todoDraft={todoDraft} setTodoDraft={setTodoDraft} todoDraftColor={todoDraftColor} setTodoDraftColor={setTodoDraftColor} addTodoItem={addTodoItem} moveTodoItemById={moveTodoItemById} draggingTodoId={draggingTodoId} setDraggingTodoId={setDraggingTodoId} dragOverTodoId={dragOverTodoId} setDragOverTodoId={setDragOverTodoId} getBusinessEndDate={getBusinessEndDate} getCalendarEndDate={getCalendarEndDate} />
    </div>;
}
