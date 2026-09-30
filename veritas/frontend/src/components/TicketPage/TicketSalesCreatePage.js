import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { createTicket, fetchSalesForms, fetchTickets, addTicketCommentWithAttachments, addLinkedTicket, updateTicket } from "../../api/tickets";
import { resolveMatchingRules, describeMatchingRulesSummary } from "../../utils/salesFormTargetRules";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchActiveUsers } from "../../api/users";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketSalesCreatePageCopy } from "./ticketSalesCreatePageI18n";
import { getEquipmentPickerLabel, getEquipmentSearchText, loadClientEquipments, serializeEquipmentInfo } from "./ticketEquipmentUtils";
import { getTicketLinkLabel, getTicketLinkSearchText } from "./ticketLinkUtils";
import { findFormEquipmentFieldKeys, isFileField } from "../../utils/salesFormFieldTypes";
import { getModalDropdownZIndex } from "../../utils/dropdownPortal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import account from "../Misc/AccountPage/AccountPage.module.css";
import s from "./TicketCreatePage.module.css";
import salesStyles from "./TicketSalesCreatePage.module.css";
import SalesFormFieldsRenderer, { buildDynamicFieldLines, filterVisibleFields, validateDynamicFields } from "./SalesFormFieldsRenderer";
function SectionPanel({
  title,
  description,
  children,
  className,
  allowOverflow = false
}) {
  return <section className={`${account.sectionPanel} ${allowOverflow ? account.sectionPanelOverflow : ""} ${allowOverflow ? s.panelAllowOverflow : ""} ${className || ""}`.trim()} style={allowOverflow ? {
    overflow: "visible"
  } : undefined}>
      {(title || description) && <header className={account.sectionHeader}>
          <div className={s.sectionHeaderMain}>
            {title && <h2 className={account.sectionTitle}>{title}</h2>}
            {description && <p className={account.sectionDesc}>{description}</p>}
          </div>
        </header>}
      <div className={`${account.sectionBody} ${allowOverflow ? s.panelBodyAllowOverflow : ""}`.trim()}>{children}</div>
    </section>;
}
function useFixedAnchorRect(open, anchorRef) {
  const [coords, setCoords] = useState(null);
  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(260, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setCoords({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: openUp ? undefined : rect.bottom - 1,
      bottom: openUp ? window.innerHeight - rect.top + 1 : undefined
    });
  }, [anchorRef]);
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);
  return coords;
}
function portalMenuStyle(coords) {
  if (!coords) return null;
  return {
    position: "fixed",
    top: coords.top,
    bottom: coords.bottom,
    left: coords.left,
    width: coords.width,
    maxHeight: coords.maxHeight,
    zIndex: getModalDropdownZIndex(),
    pointerEvents: "auto"
  };
}
function getUserLabel(user, copy) {
  return user?.ticket_helpdesk_display_name || user?.name || user?.nom || user?.username || user?.email || (user?.id ? copy.formatUserFallback(user.id) : "");
}
function getClientLabel(client) {
  return String(client?.name || client?.nom || "").trim();
}
function getClientSearchText(client) {
  return [client?.name, client?.nom, client?.code, client?.email, client?.ville].filter(Boolean).join(" ").toLowerCase();
}
function SalesCreateRecap({
  kind,
  formLabel,
  subjectLabel,
  contactLabel,
  clientLabel,
  priority,
  fields,
  copy
}) {
  const priorityLabel = copy.priorityOptions.find(p => p.key === priority)?.label || priority;
  const kindLabel = copy.getKindShortLabel(kind);
  return <div className={s.recapBody}>
      <div className={s.recapHero}>
        <div className={s.recapBadges}>
          <span className={`${s.recapBadge} ${s.recapTypeBadge_demande}`}>{kindLabel}</span>
          <span className={`${s.recapBadge} ${s.recapPriorityBadge}`}>{priorityLabel}</span>
        </div>
        <h3 className={s.recapSubject}>{subjectLabel || formLabel}</h3>
      </div>
      <div className={s.recapTable}>
        <div className={s.recapRow}>
          <span className={s.recapRowLabel}>{copy.recap.requester}</span>
          <span className={s.recapRowValue}>{contactLabel || "-"}</span>
        </div>
        <div className={s.recapRow}>
          <span className={s.recapRowLabel}>{copy.recap.client}</span>
          <span className={s.recapRowValue}>{clientLabel || "-"}</span>
        </div>
        {fields.map(row => <div key={row.label} className={s.recapRow}>
            <span className={s.recapRowLabel}>{row.label}</span>
            <span className={s.recapRowValue}>{row.value || "-"}</span>
          </div>)}
      </div>
    </div>;
}
export default function TicketSalesCreatePage({
  onNavigate,
  initialData
}) {
  const {
    user: authUser
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketSalesCreatePageCopy(locale), [locale]);
  const contactDropdownRef = useRef(null);
  const contactListRef = useRef(null);
  const clientDropdownRef = useRef(null);
  const clientListRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const equipmentListRef = useRef(null);
  const assigneeDropdownRef = useRef(null);
  const assigneeListRef = useRef(null);
  const followerDropdownRef = useRef(null);
  const followerListRef = useRef(null);
  const linkedTicketDropdownRef = useRef(null);
  const linkedTicketListRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesForms, setSalesForms] = useState([]);
  const [clientEquipments, setClientEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [clientTickets, setClientTickets] = useState([]);
  const [loadingClientTickets, setLoadingClientTickets] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorPulseTick, setErrorPulseTick] = useState(0);
  const [ticketKind, setTicketKind] = useState(initialData?.kind === "installation" ? "installation" : "prestation");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [dynamicValues, setDynamicValues] = useState({});
  const [requesterUserId, setRequesterUserId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(0);
  const [clientHighlight, setClientHighlight] = useState(0);
  const [equipmentHighlight, setEquipmentHighlight] = useState(0);
  const defaultedRequesterRef = useRef(false);
  const [priority, setPriority] = useState("normal");
  const [fieldErrors, setFieldErrors] = useState({});
  const [preAssigneeUserIds, setPreAssigneeUserIds] = useState([]);
  const [preFollowerUserIds, setPreFollowerUserIds] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [followerSearch, setFollowerSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);
  const [assigneeHighlight, setAssigneeHighlight] = useState(0);
  const [followerHighlight, setFollowerHighlight] = useState(0);
  const [linkedTicketEnabled, setLinkedTicketEnabled] = useState(false);
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [linkedTicketSearch, setLinkedTicketSearch] = useState("");
  const [showLinkedTicketDropdown, setShowLinkedTicketDropdown] = useState(false);
  const [linkedTicketHighlight, setLinkedTicketHighlight] = useState(0);
  const agentLabel = authUser?.username?.trim() || authUser?.email || copy.agentFallback;
  const formsForKind = useMemo(() => salesForms.filter(form => form.kind === ticketKind && form.enabled !== false), [salesForms, ticketKind]);
  const hasSalesForms = formsForKind.length > 0;
  const selectedForm = useMemo(() => {
    if (selectedFormId) {
      return formsForKind.find(form => String(form.id) === String(selectedFormId)) || null;
    }
    return null;
  }, [formsForKind, selectedFormId]);
  const activeFields = useMemo(() => filterVisibleFields((selectedForm?.fields || []).filter(field => field.enabled !== false), dynamicValues), [selectedForm, dynamicValues]);
  const formEquipmentFieldKeys = useMemo(
    () => findFormEquipmentFieldKeys(selectedForm?.fields || []),
    [selectedForm]
  );
  const hasFormEquipmentField = formEquipmentFieldKeys.length > 0;
  const fieldLookups = useMemo(() => ({
    users,
    contacts,
    clients,
    locale
  }), [users, contacts, clients, locale]);
  const formTicketTargets = useMemo(() => selectedForm?.ticketTargets || {}, [selectedForm]);
  const matchingTargetRules = useMemo(() => resolveMatchingRules(formTicketTargets, dynamicValues), [formTicketTargets, dynamicValues]);
  const priorityLocked = matchingTargetRules.length === 1 && Boolean(matchingTargetRules[0]?.targets?.priority);
  useEffect(() => {
    const rulePriority = matchingTargetRules.length === 1 ? matchingTargetRules[0]?.targets?.priority : null;
    setPriority(rulePriority || "normal");
  }, [selectedFormId, matchingTargetRules]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [contactRows, clientRows, userRows, formRows] = await Promise.all([fetchContactsList().catch(() => []), fetchClientsList().catch(() => []), fetchActiveUsers().catch(() => []), fetchSalesForms().catch(() => [])]);
        if (!cancelled) {
          setContacts(Array.isArray(contactRows) ? contactRows : []);
          setClients(Array.isArray(clientRows) ? clientRows : []);
          setUsers(Array.isArray(userRows) ? userRows : []);
          setSalesForms(Array.isArray(formRows) ? formRows : []);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!formsForKind.length) {
      if (selectedFormId) setSelectedFormId("");
      return;
    }
    if (!formsForKind.some(form => String(form.id) === String(selectedFormId))) {
      setSelectedFormId(formsForKind[0].id);
    }
  }, [formsForKind, selectedFormId]);
  useEffect(() => {
    setDynamicValues({});
  }, [selectedFormId]);
  useEffect(() => {
    if (!hasFormEquipmentField) return;
    const equipmentKey = formEquipmentFieldKeys[0];
    const formEquipmentId = dynamicValues?.[equipmentKey];
    if (!formEquipmentId) {
      setSelectedEquipmentId("");
      setEquipmentSearch("");
      return;
    }
    const match = clientEquipments.find(eq => String(eq.id) === String(formEquipmentId));
    if (!match) return;
    setSelectedEquipmentId(String(match.id));
    setEquipmentSearch(getEquipmentPickerLabel(match, { locale }));
  }, [hasFormEquipmentField, formEquipmentFieldKeys, dynamicValues, clientEquipments, locale]);
  useEffect(() => {
    if (defaultedRequesterRef.current || !authUser?.id) return;
    defaultedRequesterRef.current = true;
    setRequesterUserId(String(authUser.id));
    setContactSearch(agentLabel);
  }, [authUser?.id, agentLabel]);
  useEffect(() => {
    if (!initialData?.clientId || clients.length === 0) return;
    const match = clients.find(c => String(c.id) === String(initialData.clientId));
    if (!match) return;
    setSelectedClientId(String(match.id));
    setClientSearch(match.name || match.client_name || "");
  }, [initialData?.clientId, clients]);
  const contactDropdownCoords = useFixedAnchorRect(showContactDropdown, contactDropdownRef);
  const clientDropdownCoords = useFixedAnchorRect(showClientDropdown, clientDropdownRef);
  const equipmentDropdownCoords = useFixedAnchorRect(showEquipmentDropdown, equipmentDropdownRef);
  const assigneeDropdownCoords = useFixedAnchorRect(showAssigneeDropdown, assigneeDropdownRef);
  const followerDropdownCoords = useFixedAnchorRect(showFollowerDropdown, followerDropdownRef);
  const linkedTicketDropdownCoords = useFixedAnchorRect(showLinkedTicketDropdown, linkedTicketDropdownRef);
  useEffect(() => {
    const handleClickOutside = e => {
      if (!contactDropdownRef.current?.contains(e.target) && !contactListRef.current?.contains(e.target)) {
        setShowContactDropdown(false);
      }
      if (!clientDropdownRef.current?.contains(e.target) && !clientListRef.current?.contains(e.target)) {
        setShowClientDropdown(false);
      }
      if (!equipmentDropdownRef.current?.contains(e.target) && !equipmentListRef.current?.contains(e.target)) {
        setShowEquipmentDropdown(false);
      }
      if (!assigneeDropdownRef.current?.contains(e.target) && !assigneeListRef.current?.contains(e.target)) {
        setShowAssigneeDropdown(false);
      }
      if (!followerDropdownRef.current?.contains(e.target) && !followerListRef.current?.contains(e.target)) {
        setShowFollowerDropdown(false);
      }
      if (!linkedTicketDropdownRef.current?.contains(e.target) && !linkedTicketListRef.current?.contains(e.target)) {
        setShowLinkedTicketDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedClientId) {
      setClientEquipments([]);
      setSelectedEquipmentId("");
      setEquipmentSearch("");
      setLoadingEquipments(false);
      return undefined;
    }
    setLoadingEquipments(true);
    loadClientEquipments(selectedClientId)
      .then(rows => {
        if (!cancelled) setClientEquipments(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setClientEquipments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEquipments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClientId]);
  useEffect(() => {
    setLinkedTicketId("");
    setLinkedTicketSearch("");
    setShowLinkedTicketDropdown(false);
    if (!selectedClientId) {
      setClientTickets([]);
      setLoadingClientTickets(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingClientTickets(true);
      try {
        const rows = await fetchTickets({
          clientId: selectedClientId,
          forLinking: true,
          includeClosed: true,
          limit: 200
        });
        if (!cancelled) setClientTickets(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setClientTickets([]);
      } finally {
        if (!cancelled) setLoadingClientTickets(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClientId]);
  useEffect(() => {
    if (!confirmOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmOpen]);
  const selectedRequesterAgent = useMemo(() => users.find(u => String(u.id) === String(requesterUserId)) || null, [users, requesterUserId]);
  const selectedClient = useMemo(() => clients.find(c => String(c.id) === String(selectedClientId)) || null, [clients, selectedClientId]);
  const requesterLabel = useMemo(() => {
    if (selectedRequesterAgent) return getUserLabel(selectedRequesterAgent, copy);
    return "";
  }, [selectedRequesterAgent, copy]);
  const clientLabel = useMemo(() => (selectedClient ? getClientLabel(selectedClient) : ""), [selectedClient]);
  const filteredClientOptions = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const mapped = clients
      .filter(c => c?.id)
      .map(c => ({
        id: String(c.id),
        label: getClientLabel(c),
        searchText: getClientSearchText(c),
        raw: c
      }))
      .filter(opt => opt.label);
    if (!q) return mapped.slice(0, 50);
    return mapped.filter(opt => opt.searchText.includes(q) || opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [clients, clientSearch]);
  const filteredRequesterOptions = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    const agentOpts = users
      .filter(u => u?.id)
      .map(u => ({
        kind: "agent",
        id: String(u.id),
        label: getUserLabel(u, copy),
        searchText: [getUserLabel(u, copy), u.email, u.username].filter(Boolean).join(" ").toLowerCase(),
        meta: u.email || copy.agentFallback,
        raw: u
      }))
      .filter(opt => opt.label);
    if (!q) return agentOpts.slice(0, 50);
    return agentOpts.filter(opt => opt.searchText.includes(q) || opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [users, contactSearch, copy]);
  const selectedEquipment = useMemo(
    () => clientEquipments.find(eq => String(eq.id) === String(selectedEquipmentId)) || null,
    [clientEquipments, selectedEquipmentId]
  );
  const selectedLinkedTicket = useMemo(
    () => clientTickets.find(ticket => String(ticket.id) === String(linkedTicketId)) || null,
    [clientTickets, linkedTicketId]
  );
  const filteredEquipmentOptions = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    const list = clientEquipments.filter(eq => {
      if (!q) return true;
      return getEquipmentSearchText(eq, locale).includes(q);
    });
    if (selectedEquipment && !list.some(eq => String(eq.id) === String(selectedEquipment.id))) {
      return [selectedEquipment, ...list].slice(0, 50);
    }
    return list.slice(0, 50);
  }, [clientEquipments, equipmentSearch, locale, selectedEquipment]);
  const filteredLinkableTickets = useMemo(() => {
    const q = linkedTicketSearch.trim().toLowerCase();
    const base = q ? clientTickets.filter(ticket => getTicketLinkSearchText(ticket).includes(q)) : clientTickets;
    return base.slice(0, 50);
  }, [clientTickets, linkedTicketSearch]);
  const userSearchOptions = useMemo(() => users.map(user => ({
    id: String(user.id),
    label: getUserLabel(user, copy)
  })).filter(opt => opt.label), [users, copy]);
  const filteredAssigneeOptions = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    const available = userSearchOptions.filter(opt => !preAssigneeUserIds.includes(String(opt.id)));
    if (!q) return available.slice(0, 50);
    return available.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [userSearchOptions, assigneeSearch, preAssigneeUserIds]);
  const filteredFollowerOptions = useMemo(() => {
    const q = followerSearch.trim().toLowerCase();
    const available = userSearchOptions.filter(opt => !preFollowerUserIds.includes(String(opt.id)));
    if (!q) return available.slice(0, 50);
    return available.filter(opt => opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [userSearchOptions, followerSearch, preFollowerUserIds]);
  const resolveUserIdLabel = useCallback(userId => {
    const found = users.find(user => String(user.id) === String(userId));
    return found ? getUserLabel(found, copy) : String(userId || "-");
  }, [users, copy]);
  const addPreAssignee = useCallback(userId => {
    const key = String(userId || "").trim();
    if (!key) return;
    setPreAssigneeUserIds(prev => prev.includes(key) ? prev : [...prev, key]);
    setAssigneeSearch("");
    setShowAssigneeDropdown(false);
  }, []);
  const removePreAssignee = useCallback(userId => {
    setPreAssigneeUserIds(prev => prev.filter(id => String(id) !== String(userId)));
  }, []);
  const addPreFollower = useCallback(userId => {
    const key = String(userId || "").trim();
    if (!key) return;
    setPreFollowerUserIds(prev => prev.includes(key) ? prev : [...prev, key]);
    setFollowerSearch("");
    setShowFollowerDropdown(false);
  }, []);
  const removePreFollower = useCallback(userId => {
    setPreFollowerUserIds(prev => prev.filter(id => String(id) !== String(userId)));
  }, []);
  const handleLinkedTicketEnabledChange = useCallback(enabled => {
    setLinkedTicketEnabled(enabled);
    setFieldErrors(prev => ({
      ...prev,
      linkedTicketId: undefined
    }));
    if (!enabled) {
      setLinkedTicketId("");
      setLinkedTicketSearch("");
      setShowLinkedTicketDropdown(false);
    }
  }, []);
  const selectLinkedTicket = useCallback(ticket => {
    setLinkedTicketId(String(ticket.id));
    setLinkedTicketSearch(getTicketLinkLabel(ticket));
    setShowLinkedTicketDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      linkedTicketId: undefined
    }));
  }, []);
  const handleLinkedTicketSearchChange = useCallback(typed => {
    setLinkedTicketSearch(typed);
    setLinkedTicketId("");
    setShowLinkedTicketDropdown(true);
    setLinkedTicketHighlight(0);
    setFieldErrors(prev => ({
      ...prev,
      linkedTicketId: undefined
    }));
  }, []);
  const selectClient = useCallback(client => {
    if (!client?.id) return;
    setSelectedClientId(String(client.id));
    setClientSearch(getClientLabel(client));
    setShowClientDropdown(false);
    setSelectedEquipmentId("");
    setEquipmentSearch("");
    setShowEquipmentDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      client: undefined
    }));
  }, []);
  const selectRequesterAgent = useCallback(user => {
    if (!user?.id) return;
    setRequesterUserId(String(user.id));
    setContactSearch(getUserLabel(user, copy));
    setShowContactDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      requester: undefined
    }));
  }, [copy]);
  const selectRequesterOption = useCallback(option => {
    if (!option?.raw) return;
    selectRequesterAgent(option.raw);
  }, [selectRequesterAgent]);
  const handleKindChange = kind => {
    setTicketKind(kind);
    setSelectedFormId("");
    setDynamicValues({});
    setSelectedEquipmentId("");
    setEquipmentSearch("");
  };
  const generatedTitle = useMemo(() => {
    const formLabel = selectedForm?.label || "";
    const company = clientLabel || copy.defaultClientLabel || "Client";
    if (!formLabel) return company;
    return `${formLabel} - ${company}`;
  }, [selectedForm?.label, clientLabel, copy.defaultClientLabel]);
  const effectiveTitle = generatedTitle;
  const validateForm = () => {
    const errors = {};
    if (!requesterUserId) errors.requester = true;
    if (!selectedClientId) errors.client = true;
    if (!selectedForm) errors.form = true;
    if (selectedForm && !validateDynamicFields(selectedForm.fields || [], dynamicValues)) errors.details = true;
    if (linkedTicketEnabled && !linkedTicketId) errors.linkedTicketId = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorPulseTick(t => t + 1);
      return false;
    }
    return true;
  };
  const handleOpenConfirm = () => {
    if (!validateForm()) return;
    setConfirmOpen(true);
  };
  const handleCreate = async () => {
    if (!validateForm()) return;
    const clientIdNum = Number(selectedClientId);
    const clientId = Number.isFinite(clientIdNum) ? clientIdNum : selectedClientId || null;
    const clientName = clientLabel || "Client";
    const title = effectiveTitle || `${selectedForm.label} - ${clientName}`;
    const kindLabel = copy.getKindShortLabel(selectedForm.kind);
    const dynamicLines = buildDynamicFieldLines(selectedForm.fields || [], dynamicValues, fieldLookups);
    const bodyLines = [`${copy.body.type}: ${kindLabel}`, `${copy.body.form}: ${selectedForm.label}`, `${copy.body.requester}: ${requesterLabel || "-"}`, `${copy.body.company}: ${clientName}`, ...dynamicLines];
    const visibleFields = filterVisibleFields(selectedForm.fields || [], dynamicValues);
    const visibleValues = Object.fromEntries(visibleFields.map(field => {
      const raw = dynamicValues[field.fieldKey];
      if (isFileField(field)) {
        return [field.fieldKey, Array.isArray(raw) ? raw.map(item => ({
          name: item.name || item.fileName || "",
          size: item.size || item.fileSize || 0
        })) : []];
      }
      return [field.fieldKey, raw];
    }));
    const displayValues = Object.fromEntries(visibleFields.map(field => {
      const line = buildDynamicFieldLines([field], dynamicValues, fieldLookups)[0] || "";
      const display = line.includes(": ") ? line.split(": ").slice(1).join(": ") : "";
      return [field.fieldKey, display === "-" ? "" : display];
    }));
    const fieldLabels = Object.fromEntries(
      (selectedForm.fields || [])
        .filter(field => field?.fieldKey)
        .map(field => [field.fieldKey, String(field.label || "").trim() || field.fieldKey])
    );
    const fileFields = visibleFields.filter(field => isFileField(field));
    const collectFilesForUpload = () => {
      const files = [];
      const mapping = [];
      fileFields.forEach(field => {
        const items = Array.isArray(dynamicValues[field.fieldKey]) ? dynamicValues[field.fieldKey] : [];
        items.forEach(item => {
          if (item?.file instanceof File) {
            mapping.push({
              fieldKey: field.fieldKey,
              name: item.name || item.file.name
            });
            files.push(item.file);
          }
        });
      });
      return {
        files,
        mapping
      };
    };
    setSubmitting(true);
    try {
      const salesFormDataBase = {
        formId: selectedForm.id,
        formKey: selectedForm.key,
        formLabel: selectedForm.label,
        kind: selectedForm.kind,
        categorySlug: selectedForm.categorySlug,
        clientName: clientName || null,
        contactName: requesterLabel || null,
        contactEmail: selectedRequesterAgent?.email || null,
        values: visibleValues,
        displayValues,
        fieldLabels
      };
      const equipmentInfo = selectedEquipment
        ? serializeEquipmentInfo({
            concerned: true,
            source: "veritas",
            equipmentId: selectedEquipment.id,
            name: selectedEquipment.name || selectedEquipment.model || "",
            type: selectedEquipment.type || "",
            clientId: clientId || selectedEquipment.clientId || ""
          })
        : undefined;
      const created = await createTicket({
        title,
        description: bodyLines.join("\n"),
        priority: matchingTargetRules.length === 1 && matchingTargetRules[0]?.targets?.priority ? matchingTargetRules[0].targets.priority : priority,
        status: matchingTargetRules.length === 1 && matchingTargetRules[0]?.targets?.status ? matchingTargetRules[0].targets.status : "new",
        type: selectedForm.kind === "installation" ? "installation" : "prestation",
        category: selectedForm.categorySlug,
        channel: "web",
        clientId,
        assignedUserId: preAssigneeUserIds[0] || null,
        requesterUserId: requesterUserId || null,
        requesterContactId: null,
        assigneeUserIds: preAssigneeUserIds,
        watcherUserIds: preFollowerUserIds,
        ...(equipmentInfo ? { equipmentInfo } : {}),
        salesFormData: salesFormDataBase
      });
      const createdTickets = created?.multiple ? Array.isArray(created.tickets) ? created.tickets : [] : created?.id ? [created] : [];
      if (linkedTicketEnabled && selectedLinkedTicket?.id) {
        for (const ticket of createdTickets) {
          if (!ticket?.id) continue;
          try {
            await addLinkedTicket(ticket.id, selectedLinkedTicket.id);
          } catch {}
        }
      }
      const {
        files,
        mapping
      } = collectFilesForUpload();
      if (files.length > 0 && createdTickets.length > 0) {
        for (const ticket of createdTickets) {
          if (!ticket?.id) continue;
          const uploaded = await addTicketCommentWithAttachments(ticket.id, {
            content: "Sales form attachments",
            isInternal: true,
            files
          });
          const attachments = Array.isArray(uploaded?.attachments) ? uploaded.attachments : [];
          const valuesWithFiles = {
            ...visibleValues
          };
          const displayWithFiles = {
            ...displayValues
          };
          fileFields.forEach(field => {
            const fieldAttachments = [];
            mapping.forEach((entry, index) => {
              if (entry.fieldKey !== field.fieldKey) return;
              const attachment = attachments[index];
              if (!attachment) return;
              fieldAttachments.push({
                id: attachment.id,
                fileName: attachment.file_name || entry.name,
                filePath: attachment.file_path,
                mimeType: attachment.mime_type,
                fileSize: attachment.file_size
              });
            });
            valuesWithFiles[field.fieldKey] = fieldAttachments;
            displayWithFiles[field.fieldKey] = fieldAttachments.map(item => item.fileName).join(", ");
          });
          await updateTicket(ticket.id, {
            salesFormData: {
              ...salesFormDataBase,
              values: valuesWithFiles,
              displayValues: displayWithFiles
            }
          }).catch(() => {});
        }
      }
      const ticketCount = created?.multiple ? created.count : 1;
      toast.success(ticketCount > 1 ? copy.formatCreatedMultiple(ticketCount, selectedForm.label) : selectedForm.kind === "installation" ? copy.toasts.createdInstallation : copy.toasts.createdPrestation);
      setConfirmOpen(false);
      if (created?.id) {
        onNavigate?.("TicketSalesDetail", {
          ticketId: created.id,
          ticketNumber: created.ticket_number,
          ticketFamily: "sales",
          fromPage: "TicketSales"
        });
      } else if (created?.tickets?.[0]?.id) {
        onNavigate?.("TicketSalesDetail", {
          ticketId: created.tickets[0].id,
          ticketNumber: created.tickets[0].ticket_number,
          ticketFamily: "sales",
          fromPage: "TicketSales"
        });
      } else {
        onNavigate?.("TicketSales");
      }
    } catch (error) {
      toast.error(error.message || copy.toasts.createError);
    } finally {
      setSubmitting(false);
    }
  };
  const recapFields = activeFields.map(field => ({
    label: field.label,
    value: buildDynamicFieldLines([field], dynamicValues, fieldLookups)[0]?.split(": ").slice(1).join(": ") || "-"
  }));
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero
            eyebrow={copy.eyebrow}
            title={copy.pageTitle}
            subtitle={copy.formatPageSubtitle(agentLabel)}
            icon="mdi:briefcase-edit-outline"
            actions={<>
              <button type="button" className={s.btnSecondary} onClick={() => onNavigate?.("TicketSales")}>
                <Icon icon="mdi:arrow-left" />
                {copy.back}
              </button>
              <button type="button" className={layout.primaryBtn} onClick={handleOpenConfirm} disabled={submitting || loadingData || !selectedForm} title={loadingData ? copy.loadingForms : !selectedForm ? copy.noForms : undefined}>
                <Icon icon="mdi:check" />
                {submitting ? copy.creating : copy.createRequest}
              </button>
            </>}
          />
          <div className={`${mspStyles.mspContent} ${mspStyles.mspContentList} ${salesStyles.salesCreateContent} mspContent`}>
      <div className={layout.shell}>

        <div className={`${s.typeKpiRow} ${salesStyles.kindKpiRow}`}>
          {copy.salesKinds.map(item => <button key={item.key} type="button" className={`${layout.kpiCard} ${ticketKind === item.key ? layout.kpiCardActive : ""}`} onClick={() => handleKindChange(item.key)}>
              <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_blue}`}>
                <Icon icon={item.icon} />
              </div>
              <div className={layout.kpiBody}>
                <span className={layout.kpiValue}>{item.label}</span>
                <span className={layout.kpiLabel}>{item.hint}</span>
              </div>
            </button>)}
        </div>

        <div className={account.contentScroll}>
          <div className={account.contentGridWide}>
            <div className={s.formStack}>
              <SectionPanel title={copy.sections.nature}>
                {!hasSalesForms ? <p className={s.detailsAvailabilityTitle} style={{
                margin: 0
              }}>
                    {loadingData ? copy.loadingForms : copy.noForms}
                  </p> : <div className={`${s.typeGrid} ${salesStyles.formTypeGrid}`}>
                    {formsForKind.map(form => <button key={form.id} type="button" className={`${s.typeCard} ${String(selectedFormId) === String(form.id) ? s.typeCardActive : ""}`} onClick={() => setSelectedFormId(form.id)}>
                        <Icon icon={form.icon || "mdi:file-document-outline"} className={s.typeIcon} aria-hidden />
                        <span className={s.typeLabel}>{form.label}</span>
                      </button>)}
                  </div>}
              </SectionPanel>

              <SectionPanel title={copy.sections.requester} allowOverflow>
                <div className={s.demandeurBlock}>
                  <p className={s.detailsAvailabilityTitle}>{copy.requesterContact}</p>
                  <div className={s.contactSearchRow}>
                    <div className={s.contactPicker} ref={contactDropdownRef}>
                      <div data-pulse={fieldErrors.requester ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showContactDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.requester ? s.contactInputWrapError : ""} ${fieldErrors.requester ? s.fieldErrorPulse : ""}`}>
                        <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                        <input type="text" className={s.contactInput} value={contactSearch} placeholder={copy.searchContact} disabled={loadingData} aria-expanded={showContactDropdown} aria-haspopup="listbox" onChange={e => {
                        setContactSearch(e.target.value);
                        setRequesterUserId("");
                        setShowContactDropdown(true);
                        setContactHighlight(0);
                        setFieldErrors(prev => ({
                          ...prev,
                          requester: undefined
                        }));
                      }} onFocus={() => {
                        setShowContactDropdown(true);
                      }} onKeyDown={e => {
                        if (!showContactDropdown || filteredRequesterOptions.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setContactHighlight(h => Math.min(h + 1, filteredRequesterOptions.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setContactHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredRequesterOptions[contactHighlight];
                          if (picked) selectRequesterOption(picked);
                        } else if (e.key === "Escape") setShowContactDropdown(false);
                      }} />
                      </div>
                      {showContactDropdown && contactDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={contactListRef} className={s.contactDropdownPortal} role="listbox" style={portalMenuStyle(contactDropdownCoords)}>
                          {filteredRequesterOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noContactFound}</div> : filteredRequesterOptions.map((opt, idx) => {
                        return <button key={`${opt.kind}-${opt.id}`} type="button" className={`${s.contactOption} ${idx === contactHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setContactHighlight(idx)} onClick={() => selectRequesterOption(opt)}>
                                  <span className={s.contactOptionName}>{opt.label}</span>
                                  {opt.meta && <span className={s.contactOptionMeta}>{opt.meta}</span>}
                                </button>;
                      })}
                        </div>, document.body) : null}
                    </div>
                  </div>

                  {selectedRequesterAgent && <div className={s.contactSummaryCard}>
                      <div className={s.contactSummaryMain}>
                        <div className={s.clientAvatarSm} aria-hidden>
                          {(getUserLabel(selectedRequesterAgent, copy) || "?").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
                        </div>
                        <div className={s.contactSummaryTop}>
                          <div className={s.contactSummaryIdentity}>
                            <p className={s.contactSummaryName}>{getUserLabel(selectedRequesterAgent, copy)}</p>
                            <p className={s.contactSummaryCompany}>{copy.agentFallback}</p>
                          </div>
                        </div>
                        {selectedRequesterAgent.email && <div className={s.contactSummaryMetaGrid}>
                            <p className={s.contactSummaryMeta}>
                              <Icon icon="mdi:email-outline" aria-hidden />
                              <span>{selectedRequesterAgent.email}</span>
                            </p>
                          </div>}
                      </div>
                    </div>}

                  <p className={s.detailsAvailabilityTitle} style={{ marginTop: "1rem" }}>{copy.companyLabel}</p>
                  <div className={s.contactSearchRow}>
                    <div className={s.contactPicker} ref={clientDropdownRef}>
                      <div data-pulse={fieldErrors.client ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showClientDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.client ? s.contactInputWrapError : ""} ${fieldErrors.client ? s.fieldErrorPulse : ""}`}>
                        <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                        <input type="text" className={s.contactInput} value={clientSearch} placeholder={copy.searchCompany} disabled={loadingData} aria-expanded={showClientDropdown} aria-haspopup="listbox" onChange={e => {
                        setClientSearch(e.target.value);
                        setSelectedClientId("");
                        setSelectedEquipmentId("");
                        setEquipmentSearch("");
                        setShowClientDropdown(true);
                        setClientHighlight(0);
                        setFieldErrors(prev => ({
                          ...prev,
                          client: undefined
                        }));
                      }} onFocus={() => setShowClientDropdown(true)} onKeyDown={e => {
                        if (!showClientDropdown || filteredClientOptions.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setClientHighlight(h => Math.min(h + 1, filteredClientOptions.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setClientHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredClientOptions[clientHighlight];
                          if (picked) selectClient(picked.raw);
                        } else if (e.key === "Escape") setShowClientDropdown(false);
                      }} />
                      </div>
                      {showClientDropdown && clientDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={clientListRef} className={s.contactDropdownPortal} role="listbox" style={portalMenuStyle(clientDropdownCoords)}>
                          {filteredClientOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noCompanyFound}</div> : filteredClientOptions.map((opt, idx) => <button key={opt.id} type="button" className={`${s.contactOption} ${idx === clientHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setClientHighlight(idx)} onClick={() => selectClient(opt.raw)}>
                                  <span className={s.contactOptionName}>{opt.label}</span>
                                </button>)}
                        </div>, document.body) : null}
                    </div>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title={copy.sections.details} allowOverflow>
                {loadingData ? <p className={s.detailsAvailabilityTitle} style={{ margin: 0 }}>
                    {copy.loadingForms}
                  </p> : !selectedForm ? <p className={s.detailsAvailabilityTitle} style={{ margin: 0 }}>
                    {copy.noForms}
                  </p> : activeFields.length > 0 ? <div data-pulse={fieldErrors.details ? errorPulseTick : undefined} className={fieldErrors.details ? s.fieldErrorPulse : undefined}>
                  <SalesFormFieldsRenderer fields={activeFields} values={dynamicValues} users={users} contacts={contacts} clients={clients} equipments={clientEquipments} clientId={selectedClientId} audience="agent" fieldErrors={fieldErrors.details} errorPulseTick={errorPulseTick} onChange={nextValues => {
                  setDynamicValues(nextValues);
                  setFieldErrors(prev => ({
                    ...prev,
                    details: undefined
                  }));
                }} />
                </div> : null}
              </SectionPanel>
            </div>

            <aside className={`${s.formStack} ${s.sideColumn}`}>
              <SectionPanel title={copy.sections.context}>
                <dl className={s.contractFacts}>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:text-short" className={s.contractFactIcon} aria-hidden />
                      {copy.context.subject}
                    </dt>
                    <dd className={s.contractFactCompany} title={effectiveTitle}>
                      {effectiveTitle || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:shape-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.type}
                    </dt>
                    <dd className={s.contractFactCompany}>
                      {copy.salesKinds.find(item => item.key === ticketKind)?.label || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:tag-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.category}
                    </dt>
                    <dd className={selectedForm ? s.contractFactCompany : s.contractFactEmpty}>
                      {selectedForm?.label || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:domain" className={s.contractFactIcon} aria-hidden />
                      {copy.context.company}
                    </dt>
                    <dd className={clientLabel ? s.contractFactCompany : s.contractFactEmpty}>
                      {clientLabel || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:account-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.requester}
                    </dt>
                    <dd className={requesterLabel ? s.contractFactCompany : s.contractFactEmpty}>
                      {requesterLabel || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:desktop-classic" className={s.contractFactIcon} aria-hidden />
                      {copy.context.equipment}
                    </dt>
                    <dd className={selectedEquipment ? s.contractFactCompany : s.contractFactEmpty}>
                      {selectedEquipment ? getEquipmentPickerLabel(selectedEquipment, { locale }) : "-"}
                    </dd>
                  </div>
                </dl>
              </SectionPanel>

              <SectionPanel title={copy.sections.settings} allowOverflow>
                <div className={s.settingsPanel}>
                  <div className={s.equipmentField}>
                    <label className={s.equipmentFieldLabel} htmlFor="sales-create-priority">
                      {copy.priorityLabel}
                    </label>
                    <select id="sales-create-priority" className={s.select} value={priority} disabled={priorityLocked} onChange={e => setPriority(e.target.value)}>
                      {copy.priorityOptions.map(item => <option key={item.key} value={item.key}>
                          {item.label}
                        </option>)}
                    </select>
                    {priorityLocked && <p className={s.detailsAvailabilityTitle} style={{
                    margin: "0.35rem 0 0"
                  }}>
                        {copy.priorityLocked}
                      </p>}
                  </div>

                  <div className={s.equipmentField}>
                      <label className={s.equipmentFieldLabel}>{copy.preAssign}</label>
                      <div className={s.contactPicker} ref={assigneeDropdownRef}>
                        <div className={`${s.contactInputWrap} ${showAssigneeDropdown ? s.contactInputWrapOpen : ""}`}>
                          <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                          <input className={s.contactInput} type="text" value={assigneeSearch} autoComplete="off" onChange={e => {
                          setAssigneeSearch(e.target.value);
                          setShowAssigneeDropdown(true);
                          setAssigneeHighlight(0);
                        }} onFocus={() => setShowAssigneeDropdown(true)} onKeyDown={e => {
                          if (!showAssigneeDropdown || filteredAssigneeOptions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setAssigneeHighlight(h => Math.min(h + 1, filteredAssigneeOptions.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setAssigneeHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredAssigneeOptions[assigneeHighlight];
                            if (picked) addPreAssignee(picked.id);
                          } else if (e.key === "Escape") {
                            setShowAssigneeDropdown(false);
                          }
                        }} placeholder={copy.searchAgent} aria-label={copy.searchAgentAssignAria} aria-expanded={showAssigneeDropdown} aria-haspopup="listbox" disabled={loadingData} />
                        </div>
                        {showAssigneeDropdown && assigneeDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={assigneeListRef} className={s.contactDropdownPortal} role="listbox" aria-label={copy.assignAgentsAria} style={portalMenuStyle(assigneeDropdownCoords)}>
                            {filteredAssigneeOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noAgentFound}</div> : filteredAssigneeOptions.map((opt, idx) => <button key={opt.id} type="button" role="option" aria-selected={false} className={`${s.contactOption} ${assigneeHighlight === idx ? s.contactOptionActive : ""}`} onMouseEnter={() => setAssigneeHighlight(idx)} onClick={() => addPreAssignee(opt.id)}>
                                  <span className={s.contactOptionName}>{opt.label}</span>
                                </button>)}
                          </div>, document.body) : null}
                      </div>
                      <div className={s.chipsWrap}>
                        {preAssigneeUserIds.length === 0 ? <span className={s.emptyChipHint}>{copy.noAssignee}</span> : preAssigneeUserIds.map(userId => <span key={userId} className={s.chip}>
                              {resolveUserIdLabel(userId)}
                              <button type="button" onClick={() => removePreAssignee(userId)} aria-label={copy.formatRemoveAgentAria(resolveUserIdLabel(userId))}>
                                ×
                              </button>
                            </span>)}
                      </div>
                    </div>

                  <div className={s.equipmentField}>
                      <label className={s.equipmentFieldLabel}>{copy.followers}</label>
                      <div className={s.contactPicker} ref={followerDropdownRef}>
                        <div className={`${s.contactInputWrap} ${showFollowerDropdown ? s.contactInputWrapOpen : ""}`}>
                          <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                          <input className={s.contactInput} type="text" value={followerSearch} autoComplete="off" onChange={e => {
                          setFollowerSearch(e.target.value);
                          setShowFollowerDropdown(true);
                          setFollowerHighlight(0);
                        }} onFocus={() => setShowFollowerDropdown(true)} onKeyDown={e => {
                          if (!showFollowerDropdown || filteredFollowerOptions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setFollowerHighlight(h => Math.min(h + 1, filteredFollowerOptions.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setFollowerHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredFollowerOptions[followerHighlight];
                            if (picked) addPreFollower(picked.id);
                          } else if (e.key === "Escape") {
                            setShowFollowerDropdown(false);
                          }
                        }} placeholder={copy.searchAgent} aria-label={copy.searchFollowerAria} aria-expanded={showFollowerDropdown} aria-haspopup="listbox" disabled={loadingData} />
                        </div>
                        {showFollowerDropdown && followerDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={followerListRef} className={s.contactDropdownPortal} role="listbox" aria-label={copy.followerAgentsAria} style={portalMenuStyle(followerDropdownCoords)}>
                            {filteredFollowerOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noAgentFound}</div> : filteredFollowerOptions.map((opt, idx) => <button key={opt.id} type="button" role="option" aria-selected={false} className={`${s.contactOption} ${followerHighlight === idx ? s.contactOptionActive : ""}`} onMouseEnter={() => setFollowerHighlight(idx)} onClick={() => addPreFollower(opt.id)}>
                                  <span className={s.contactOptionName}>{opt.label}</span>
                                </button>)}
                          </div>, document.body) : null}
                      </div>
                      <div className={s.chipsWrap}>
                        {preFollowerUserIds.length === 0 ? <span className={s.emptyChipHint}>{copy.noFollower}</span> : preFollowerUserIds.map(userId => <span key={userId} className={s.chip}>
                              {resolveUserIdLabel(userId)}
                              <button type="button" onClick={() => removePreFollower(userId)} aria-label={copy.formatRemoveAgentAria(resolveUserIdLabel(userId))}>
                                ×
                              </button>
                            </span>)}
                      </div>
                    </div>

                  <div className={s.linkTicketPanel}>
                    <label className={s.equipmentFieldLabel}>{copy.ticketLink}</label>
                    <div className={s.segmentedGroup} role="radiogroup" aria-label={copy.ticketLinkAria}>
                      <button type="button" role="radio" aria-checked={!linkedTicketEnabled} className={`${s.segmentedBtn} ${!linkedTicketEnabled ? s.segmentedBtnActive : ""}`} onClick={() => handleLinkedTicketEnabledChange(false)}>
                        <Icon icon="mdi:link-off" aria-hidden />
                        {copy.linkNone}
                      </button>
                      <button type="button" role="radio" aria-checked={linkedTicketEnabled} className={`${s.segmentedBtn} ${linkedTicketEnabled ? s.segmentedBtnActive : ""}`} onClick={() => handleLinkedTicketEnabledChange(true)}>
                        <Icon icon="mdi:link-variant" aria-hidden />
                        {copy.existingTicket}
                      </button>
                    </div>
                    {linkedTicketEnabled && <div className={s.linkTicketSubPanel}>
                        {!selectedClientId ? <p className={s.equipmentHint}>{copy.selectCompanyFirstForLink}</p> : loadingClientTickets ? <p className={s.equipmentHint}>{copy.loadingClientTickets}</p> : clientTickets.length === 0 ? <p className={s.equipmentHint}>{copy.noClientTickets}</p> : <>
                            <div className={s.equipmentField}>
                              <label className={s.equipmentFieldLabel} htmlFor="sales-create-linked-ticket">
                                {copy.ticketToLink}<span className={s.requiredMark}>*</span>
                              </label>
                              <div className={s.linkTicketPicker} ref={linkedTicketDropdownRef}>
                                <div data-pulse={fieldErrors.linkedTicketId ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showLinkedTicketDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.linkedTicketId ? s.contactInputWrapError : ""} ${fieldErrors.linkedTicketId ? s.fieldErrorPulse : ""}`}>
                                  <Icon icon="mdi:magnify" className={s.contactInputIcon} />
                                  <input id="sales-create-linked-ticket" className={s.contactInput} type="text" value={linkedTicketSearch} onChange={e => handleLinkedTicketSearchChange(e.target.value)} onFocus={() => {
                              if (!linkedTicketId) setShowLinkedTicketDropdown(true);
                            }} onKeyDown={e => {
                              if (!showLinkedTicketDropdown || filteredLinkableTickets.length === 0) return;
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setLinkedTicketHighlight(h => Math.min(h + 1, filteredLinkableTickets.length - 1));
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setLinkedTicketHighlight(h => Math.max(h - 1, 0));
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                const picked = filteredLinkableTickets[linkedTicketHighlight];
                                if (picked) selectLinkedTicket(picked);
                              } else if (e.key === "Escape") setShowLinkedTicketDropdown(false);
                            }} placeholder={copy.searchTicketPlaceholder} disabled={loadingData} aria-expanded={showLinkedTicketDropdown} aria-haspopup="listbox" />
                                </div>
                                {showLinkedTicketDropdown && linkedTicketDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={linkedTicketListRef} className={s.contactDropdownPortal} role="listbox" style={portalMenuStyle(linkedTicketDropdownCoords)}>
                                    {filteredLinkableTickets.length === 0 ? <div className={s.contactEmpty}>{copy.noTicketFound}</div> : filteredLinkableTickets.map((ticket, idx) => <button key={ticket.id} type="button" role="option" aria-selected={idx === linkedTicketHighlight} className={`${s.contactOption} ${idx === linkedTicketHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setLinkedTicketHighlight(idx)} onClick={() => selectLinkedTicket(ticket)}>
                                          <span className={s.contactOptionName}>{getTicketLinkLabel(ticket)}</span>
                                          <span className={s.contactOptionMeta}>
                                            {ticket.status || ""}
                                            {ticket.type ? ` · ${ticket.type}` : ""}
                                          </span>
                                        </button>)}
                                  </div>, document.body) : null}
                              </div>
                            </div>
                            {selectedLinkedTicket ? <div className={s.linkTicketCard}>
                                <div className={s.linkTicketCardIcon} aria-hidden>
                                  <Icon icon="mdi:ticket-confirmation-outline" />
                                </div>
                                <div className={s.linkTicketCardBody}>
                                  <p className={s.linkTicketCardNumber}>
                                    #{selectedLinkedTicket.ticket_number || selectedLinkedTicket.id}
                                  </p>
                                  <p className={s.linkTicketCardTitle}>
                                    {selectedLinkedTicket.title || copy.untitled}
                                  </p>
                                  <p className={s.linkTicketCardMeta}>
                                    {selectedLinkedTicket.status || ""}
                                    {selectedLinkedTicket.type ? ` · ${selectedLinkedTicket.type}` : ""}
                                  </p>
                                </div>
                              </div> : <div className={s.linkTicketEmpty}>
                                <Icon icon="mdi:ticket-search-outline" className={s.linkTicketEmptyIcon} aria-hidden />
                                <p className={s.linkTicketEmptyText}>{copy.selectTicketFromList}</p>
                              </div>}
                          </>}
                      </div>}
                  </div>

                  <div className={s.equipmentField}>
                    <p className={s.detailsAvailabilityTitle} style={{
                    margin: 0
                  }}>
                      {copy.generatedTickets}
                    </p>
                    <p className={s.detailsAvailabilityTitle} style={{
                    margin: "0.35rem 0 0",
                    fontWeight: 400
                  }}>
                      {describeMatchingRulesSummary(matchingTargetRules)}
                    </p>
                    {matchingTargetRules.length > 0 && <ul className={salesStyles.targetRuleList}>
                        {matchingTargetRules.map(rule => {
                      const meta = [rule.targets?.priority ? copy.formatRulePriority(rule.targets.priority) : null, rule.targets?.status ? copy.formatRuleStatus(rule.targets.status) : null, rule.targets?.assigneeUserIds?.length || rule.targets?.assigneeFieldKeys?.length ? copy.formatRuleAssignees((rule.targets?.assigneeUserIds?.length || 0) + (rule.targets?.assigneeFieldKeys?.length || 0)) : null, rule.targets?.teamIds?.length ? copy.formatRuleTeams(rule.targets.teamIds.length) : null].filter(Boolean).join(" · ") || copy.defaultRuleProps;
                      return <li key={rule.id} className={salesStyles.targetRuleItem}>
                              <span className={salesStyles.targetRuleLabel}>{rule.label}</span>
                              <span className={salesStyles.targetRuleMeta}>{meta}</span>
                            </li>;
                    })}
                      </ul>}
                  </div>
                </div>
              </SectionPanel>
            </aside>
          </div>
        </div>
      </div>
          </div>
        </div>
      </div>

      {confirmOpen && selectedForm && createPortal(<div className={s.confirmOverlay} onClick={() => !submitting && setConfirmOpen(false)} role="presentation">
            <div className={s.confirmShell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sales-create-recap-title">
              <div className={s.confirmAccentBar} aria-hidden />
              <div className={s.confirmHeader}>
                <div className={s.confirmHeaderMain}>
                  <div className={s.confirmHeaderIconWrap} aria-hidden>
                    <Icon icon="mdi:clipboard-check-outline" className={s.confirmHeaderIcon} />
                  </div>
                  <div>
                    <h2 id="sales-create-recap-title" className={s.confirmTitle}>
                      {copy.recap.title}
                    </h2>
                    <p className={s.confirmSubtitle}>{copy.recap.subtitle}</p>
                  </div>
                </div>
                <button type="button" className={s.confirmCloseBtn} onClick={() => setConfirmOpen(false)} disabled={submitting} aria-label={copy.recap.close}>
                  <FaTimes />
                </button>
              </div>
              <div className={s.confirmBody}>
                <SalesCreateRecap kind={ticketKind} formLabel={selectedForm.label} subjectLabel={effectiveTitle} contactLabel={requesterLabel || null} clientLabel={clientLabel} priority={priority} fields={recapFields} copy={copy} />
              </div>
              <div className={s.confirmFooter}>
                <button type="button" className={s.recapCancelBtn} onClick={() => setConfirmOpen(false)} disabled={submitting}>
                  {copy.recap.cancel}
                </button>
                <button type="button" className={s.recapConfirmBtn} onClick={handleCreate} disabled={submitting}>
                  <Icon icon={submitting ? "mdi:loading" : "mdi:check-bold"} className={submitting ? s.recapConfirmSpinner : undefined} />
                  {submitting ? copy.creating : copy.recap.confirm}
                </button>
              </div>
            </div>
          </div>, document.body)}
    </div>;
}
