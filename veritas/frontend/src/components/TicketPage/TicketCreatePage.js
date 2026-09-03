import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { createTicket, fetchTicketCategories, addTicketComment, fetchTickets, addTicketAssignee, addTicketWatcher, addTicketCommentWithAttachments } from "../../api/tickets";
import { fetchClientsList, fetchContactsList, fetchClientSupportCredits } from "../../api/clients";
import { fetchUsers } from "../../api/users";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { getTicketCreateCopy } from "./ticketCreatePageI18n";
import { buildLinkedEquipmentComment, getEquipmentPickerLabel, getEquipmentSearchText, loadClientEquipments, serializeEquipmentInfo } from "./ticketEquipmentUtils";
import { buildClientContractSummary, computeSupportCreditTotals } from "./ticketClientSummaryUtils";
import { buildLinkedTicketComment, getTicketLinkLabel, getTicketLinkSearchText } from "./ticketLinkUtils";
import { formatClientSlaRows, parseClientSla } from "../../utils/ticketSlaUtils";
import ContactFormModal from "../ContactsPage/ContactFormModal";
import SmartTooltip from "../SmartTooltip";
import TicketKnowledgeSuggestions from "./TicketKnowledgeSuggestions";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import account from "../Misc/AccountPage/AccountPage.module.css";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import mspStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import s from "./TicketCreatePage.module.css";
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 10;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".csv", ".xls", ".xlsx", ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"]);
const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xls,.xlsx,.mp4,.3gp,.mp3,.mpeg,.ogg,.aac,.amr,.m4a";
function mergeAttachmentFiles(currentFiles = [], nextFiles = []) {
  const merged = [...currentFiles];
  const existingKeys = new Set(currentFiles.map(file => `${file.name}-${file.size}-${file.lastModified || 0}`));
  nextFiles.forEach(file => {
    const key = `${file.name}-${file.size}-${file.lastModified || 0}`;
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      merged.push(file);
    }
  });
  return merged.slice(0, MAX_ATTACHMENT_FILES);
}
function TicketCreateTipsTooltip({
  copy
}) {
  return <div className={s.tipsTooltip}>
      <p className={s.tipsTooltipTitle}>{copy.tipsTitle}</p>
      <ul className={s.tipList}>
        {copy.tips.map(tip => <li key={tip.icon} className={s.tipItem}>
            <Icon icon={tip.icon} className={s.tipIcon} aria-hidden />
            <span>{tip.text}</span>
          </li>)}
      </ul>
    </div>;
}
function SectionPanel({
  title,
  description,
  children,
  className,
  headerExtra
}) {
  return <section className={`${account.sectionPanel} ${className || ""}`.trim()}>
      {(title || description || headerExtra) && <header className={`${account.sectionHeader} ${headerExtra ? s.sectionHeaderInline : ""}`.trim()}>
          <div className={s.sectionHeaderMain}>
            {title && <h2 className={account.sectionTitle}>{title}</h2>}
            {description && <p className={account.sectionDesc}>{description}</p>}
          </div>
          {headerExtra}
        </header>}
      <div className={account.sectionBody}>{children}</div>
    </section>;
}
function getUserLabel(user, fallback = "") {
  if (!user) return fallback || "-";
  if (typeof user === "string") return user;
  return user.ticket_helpdesk_display_name || user.name || user.nom || user.username || user.email || fallback || "";
}
function getContactInitials(contact) {
  const first = contact?.prenom?.trim()?.[0] || "";
  const last = contact?.nom?.trim()?.[0] || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return (contact?.email?.[0] || "?").toUpperCase();
}
function getContactDisplayName(contact, copy) {
  const fullName = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
  return fullName || contact?.email || copy.formatContactFallback(contact?.id);
}
function getContactLabel(contact, copy) {
  const fullName = `${contact?.prenom || ""} ${contact?.nom || ""}`.trim();
  const base = fullName || contact?.email || copy.formatContactFallback(contact?.id);
  if (contact?.email && fullName) return `${fullName} · ${contact.email}`;
  return base;
}
function getContactClientOptions(contact, clients = []) {
  const linked = Array.isArray(contact?.clients) ? contact.clients : [];
  if (linked.length > 0) {
    return linked.map(row => {
      const id = row.id ?? row.client_id;
      const listed = clients.find(c => String(c.id) === String(id));
      return {
        id,
        name: row.name || row.client_name || listed?.name || listed?.nom || (id != null ? `Client #${id}` : "")
      };
    }).filter(row => row.id != null);
  }
  if (contact?.client_id) {
    const listed = clients.find(c => String(c.id) === String(contact.client_id));
    return [{
      id: contact.client_id,
      name: contact.client_name || contact.entreprise || listed?.name || listed?.nom || `Client #${contact.client_id}`
    }];
  }
  return [];
}
function contactBelongsToClient(contact, clientId) {
  if (!contact || clientId == null || clientId === "") return false;
  const cid = String(clientId);
  if (String(contact.client_id) === cid) return true;
  const memberships = Array.isArray(contact.clients) ? contact.clients : [];
  return memberships.some(m => String(m.client_id ?? m.id) === cid);
}
function findPrimaryContactForClient(contacts = [], clientId) {
  if (clientId == null || clientId === "") return null;
  const cid = String(clientId);
  const forClient = (Array.isArray(contacts) ? contacts : []).filter(c => contactBelongsToClient(c, cid));
  if (forClient.length === 0) return null;
  const byMembershipPrimary = forClient.find(c => (Array.isArray(c.clients) ? c.clients : []).some(m => String(m.client_id ?? m.id) === cid && m.is_primary === true));
  if (byMembershipPrimary) return byMembershipPrimary;
  const byPoste = forClient.find(c => String(c.poste || "").toLowerCase().includes("principal"));
  if (byPoste) return byPoste;
  const byActive = forClient.find(c => {
    const status = String(c.statut || "").toLowerCase();
    return status.includes("actif") && !status.includes("inactif");
  });
  if (byActive) return byActive;
  return forClient[0];
}
function findCategoryByHint(categories = [], hint) {
  const needle = String(hint || "").trim().toLowerCase();
  if (!needle) return null;
  const enabled = (Array.isArray(categories) ? categories : []).filter(item => item?.enabled !== false);
  const exact = enabled.find(item => {
    const name = String(item?.name || "").trim().toLowerCase();
    const id = String(item?.id || "").trim().toLowerCase();
    return name === needle || id === needle;
  });
  if (exact) return exact;
  const partial = enabled.find(item => {
    const name = String(item?.name || "").trim().toLowerCase();
    const id = String(item?.id || "").trim().toLowerCase();
    return id.includes(needle) || name.includes(needle);
  });
  if (partial) return partial;
  if (needle === "monitoring" || needle.includes("monitor") || needle.includes("supervision")) {
    return enabled.find(item => {
      const name = String(item?.name || "").toLowerCase();
      const id = String(item?.id || "").toLowerCase();
      return id.includes("monitoring") || name.includes("monitoring") || name.includes("supervision") || name.includes("alerting");
    }) || null;
  }
  return null;
}
function normalizeTicketStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "open" ? "new" : normalized;
}
function isTicketOpenStatus(status) {
  const normalized = normalizeTicketStatus(status);
  return normalized !== "resolved" && normalized !== "closed";
}
function getTicketCreatedDate(ticket) {
  const raw = ticket?.created_at || ticket?.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function buildAvailabilityContactSlots({
  mode,
  date,
  startTime,
  endTime,
  note
}) {
  if (mode === "none") return [];
  const slotDate = String(date || "").trim();
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();
  const slotNote = String(note || "").trim();
  if (mode === "from") {
    if (!slotDate && !start && !slotNote) return [];
    return [{
      date: slotDate,
      startTime: start,
      endTime: "",
      note: slotNote,
      mode: "from"
    }];
  }
  if (!slotDate && !start && !end && !slotNote) return [];
  return [{
    date: slotDate,
    startTime: start,
    endTime: end,
    note: slotNote,
    mode: "range"
  }];
}
function serializeContactSlots(slots) {
  return slots.map(({
    date,
    startTime,
    endTime,
    note
  }) => ({
    date: String(date || "").trim(),
    startTime: String(startTime || "").trim(),
    endTime: String(endTime || "").trim(),
    note: String(note || "").trim()
  })).filter(slot => slot.date || slot.startTime || slot.endTime || slot.note);
}
function buildRequesterTicketStats(tickets) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  let openCount = 0;
  let monthCount = 0;
  let yearCount = 0;
  let lastCreatedAt = null;
  for (const ticket of tickets) {
    if (isTicketOpenStatus(ticket?.status)) openCount += 1;
    const createdAt = getTicketCreatedDate(ticket);
    if (!createdAt) continue;
    if (createdAt >= monthStart) monthCount += 1;
    if (createdAt >= yearStart) yearCount += 1;
    if (!lastCreatedAt || createdAt > lastCreatedAt) lastCreatedAt = createdAt;
  }
  return {
    openCount,
    monthCount,
    yearCount,
    lastCreatedAt,
    total: tickets.length
  };
}
function RequesterOpenTicketsStat({
  tickets,
  openCount,
  onNavigate,
  copy
}) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const openTickets = useMemo(() => (Array.isArray(tickets) ? tickets : []).filter(ticket => isTicketOpenStatus(ticket?.status)).sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()).slice(0, 8), [tickets]);
  const hasPreview = openCount > 0 && openTickets.length > 0;
  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 300;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setCoords({
      top: rect.bottom + 6,
      left,
      width
    });
  }, []);
  useLayoutEffect(() => {
    if (!open || !hasPreview) {
      setCoords(null);
      return undefined;
    }
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, hasPreview, updatePosition, openTickets.length]);
  const popover = open && coords && hasPreview ? createPortal(<div className={s.requesterOpenTicketsPopover} style={{
    position: "fixed",
    top: coords.top,
    left: coords.left,
    width: coords.width,
    zIndex: 1200
  }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <p className={s.requesterOpenTicketsPopoverTitle}>
              {copy.formatOpenTicketsTitle(openCount)}
            </p>
            <ul className={s.requesterOpenTicketsList}>
              {openTickets.map(ticket => {
        const statusKey = normalizeTicketStatus(ticket.status);
        return <li key={ticket.id}>
                    <button type="button" className={s.requesterOpenTicketItem} onClick={() => onNavigate?.("TicketDetail", {
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            title: ticket.title
          })}>
                      <span className={`${s.requesterOpenTicketStatus} ${s[`requesterOpenTicketStatus_${statusKey}`] || ""}`}>
                        {copy.getStatusShort(statusKey)}
                      </span>
                      <span className={s.requesterOpenTicketBody}>
                        <span className={s.requesterOpenTicketTitle}>
                          #{ticket.ticket_number || ticket.id} · {ticket.title || copy.untitled}
                        </span>
                        <span className={s.requesterOpenTicketMeta}>
                          {copy.getStatusLabel(ticket.status)}
                          {copy.updatedPrefix}
                          {copy.formatRelativeDate((() => {
                  const raw = ticket.updated_at || ticket.created_at;
                  if (!raw) return null;
                  const date = new Date(raw);
                  return Number.isNaN(date.getTime()) ? null : date;
                })())}
                        </span>
                      </span>
                      <Icon icon="mdi:open-in-new" className={s.requesterOpenTicketIcon} aria-hidden />
                    </button>
                  </li>;
      })}
            </ul>
          </div>, document.body) : null;
  return <>
      <div ref={anchorRef} className={`${s.requesterTicketStat} ${openCount > 0 ? s.requesterTicketStatWarn : ""} ${hasPreview ? s.requesterTicketStatHoverable : ""}`} onMouseEnter={() => hasPreview && setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => hasPreview && setOpen(true)} onBlur={e => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    }} tabIndex={hasPreview ? 0 : undefined} role={hasPreview ? "button" : undefined} aria-expanded={hasPreview ? open : undefined} aria-label={hasPreview ? copy.formatViewOpenTicketsAria(openCount) : undefined}>
        <span className={s.requesterTicketStatValue}>{openCount}</span>
        <span className={s.requesterTicketStatLabel}>{copy.openTickets}</span>
      </div>
      {popover}
    </>;
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
  }, []);
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
function getContactSearchText(contact) {
  return [contact?.prenom, contact?.nom, contact?.email, contact?.client_name, contact?.entreprise].filter(Boolean).join(" ").toLowerCase();
}
function openNativePickerFromEvent(event) {
  const target = event.currentTarget;
  const input = target instanceof HTMLInputElement ? target : target.querySelector?.("input[type='date'], input[type='time']");
  if (!input || typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch (_) {
    /* picker already open or not allowed */
  }
}
function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function RecapRow({
  label,
  value,
  muted
}) {
  return <div className={s.recapRow}>
      <span className={s.recapRowLabel}>{label}</span>
      <span className={[s.recapRowValue, muted ? s.recapRowValueMuted : ""].filter(Boolean).join(" ")}>
        {value || "-"}
      </span>
    </div>;
}
function TicketCreateRecap({
  title,
  description,
  type,
  isMajorIncident,
  priority,
  channel,
  category,
  selectedContact,
  clientLabel,
  agentLabel,
  filledContactSlots,
  equipmentSummary,
  linkedTicketSummary,
  preAssigneesSummary,
  preFollowersSummary,
  attachmentsSummary,
  copy
}) {
  const typeMeta = copy.ticketTypes.find(t => t.key === type);
  const priorityMeta = copy.priorityOptions.find(p => p.key === priority);
  const channelMeta = copy.channelOptions.find(c => c.key === channel);
  const typeLabel = typeMeta?.label || type;
  const priorityLabel = priorityMeta?.label || priority;
  const channelLabel = channelMeta?.label || channel;
  const demandeurDisplay = selectedContact ? getContactLabel(selectedContact, copy) : null;
  const isEmptyValue = val => !val || val === "-" || val === copy.none;
  const callbackSummary = filledContactSlots.length > 0 ? filledContactSlots.map(slot => copy.formatRecapCallbackSlot?.(slot) || copy.formatContactSlotLabel(slot)).join(" · ") : "";
  const rows = [{
    label: copy.recapType,
    value: typeLabel
  }, {
    label: copy.recapPriority,
    value: priorityLabel
  }, type === "incident" && isMajorIncident ? {
    label: copy.recapMajorIncident,
    value: copy.recapMajorYes
  } : null, {
    label: copy.recapRequester,
    value: demandeurDisplay,
    muted: !demandeurDisplay
  }, {
    label: copy.recapClient,
    value: clientLabel
  }, {
    label: copy.recapChannel,
    value: channelLabel
  }, {
    label: copy.recapCategory,
    value: category,
    muted: isEmptyValue(category)
  }, {
    label: copy.recapEquipment,
    value: equipmentSummary
  }, {
    label: copy.recapLinkedTicket,
    value: linkedTicketSummary
  }, {
    label: copy.recapPreAssign,
    value: preAssigneesSummary
  }, {
    label: copy.followers,
    value: preFollowersSummary
  }, {
    label: copy.recapDocuments,
    value: attachmentsSummary
  }, callbackSummary ? {
    label: copy.recapCallbackSlot,
    value: callbackSummary
  } : null].filter(row => row && !isEmptyValue(row.value));
  const createdParts = copy.recapCreatedBy.split("{agent}");
  return <div className={s.recapBody}>
      <div className={s.recapHero}>
        <h3 className={s.recapSubject}>{title.trim() || "-"}</h3>
        {description.trim() ? <p className={s.recapDescText}>{description.trim()}</p> : null}
      </div>

      <div className={s.recapTable}>
        {rows.map(row => <RecapRow key={row.label} label={row.label} value={row.value} muted={row.muted} />)}
      </div>

      <p className={s.recapAgentNote}>
        {createdParts[0]}
        <strong>{agentLabel}</strong>
        {createdParts[1]}
      </p>
    </div>;
}
export default function TicketCreatePage({
  onNavigate,
  initialData
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketCreateCopy(locale), [locale]);
  const {
    user: authUser
  } = useAuthContext();
  const {
    modules: contractModuleDefs
  } = useContractModuleOptions();
  const contactDropdownRef = useRef(null);
  const contactListRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const categoryListRef = useRef(null);
  const assigneeDropdownRef = useRef(null);
  const assigneeListRef = useRef(null);
  const followerDropdownRef = useRef(null);
  const followerListRef = useRef(null);
  const equipmentDropdownRef = useRef(null);
  const equipmentListRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [type, setType] = useState("incident");
  const [isMajorIncident, setIsMajorIncident] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState("normal");
  const [channel, setChannel] = useState("phone");
  const [category, setCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
  const [availabilityMode, setAvailabilityMode] = useState("none");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState("09:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("17:00");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [equipmentConcerned, setEquipmentConcerned] = useState(false);
  const [equipmentSource, setEquipmentSource] = useState("veritas");
  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [equipmentHighlight, setEquipmentHighlight] = useState(0);
  const [equipmentBrand, setEquipmentBrand] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [equipmentSerial, setEquipmentSerial] = useState("");
  const [clientEquipments, setClientEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [linkedTicketEnabled, setLinkedTicketEnabled] = useState(false);
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [linkedTicketSearch, setLinkedTicketSearch] = useState("");
  const [showLinkedTicketDropdown, setShowLinkedTicketDropdown] = useState(false);
  const [linkedTicketHighlight, setLinkedTicketHighlight] = useState(0);
  const linkedTicketDropdownRef = useRef(null);
  const linkedTicketListRef = useRef(null);
  const [clientTickets, setClientTickets] = useState([]);
  const [loadingClientTickets, setLoadingClientTickets] = useState(false);
  const [requesterContactId, setRequesterContactId] = useState(initialData?.contactId || "");
  const [ticketClientId, setTicketClientId] = useState(initialData?.clientId || "");
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(0);
  const contactDropdownCoords = useFixedAnchorRect(showContactDropdown, contactDropdownRef);
  const categoryDropdownCoords = useFixedAnchorRect(showCategoryDropdown, categoryDropdownRef);
  const equipmentDropdownCoords = useFixedAnchorRect(showEquipmentDropdown, equipmentDropdownRef);
  const linkedTicketDropdownCoords = useFixedAnchorRect(showLinkedTicketDropdown, linkedTicketDropdownRef);
  const [preAssigneeUserIds, setPreAssigneeUserIds] = useState([]);
  const [preFollowerUserIds, setPreFollowerUserIds] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [followerSearch, setFollowerSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showFollowerDropdown, setShowFollowerDropdown] = useState(false);
  const [assigneeHighlight, setAssigneeHighlight] = useState(0);
  const [followerHighlight, setFollowerHighlight] = useState(0);
  const assigneeDropdownCoords = useFixedAnchorRect(showAssigneeDropdown, assigneeDropdownRef);
  const followerDropdownCoords = useFixedAnchorRect(showFollowerDropdown, followerDropdownRef);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalInitial, setContactModalInitial] = useState(null);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [isAttachmentDragOver, setIsAttachmentDragOver] = useState(false);
  const attachmentInputRef = useRef(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorPulseTick, setErrorPulseTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [supportCreditBalance, setSupportCreditBalance] = useState(null);
  const [supportCreditPacks, setSupportCreditPacks] = useState([]);
  const [loadingCredits, setLoadingCredits] = useState(false);
  useEffect(() => {
    if (!confirmModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmModalOpen]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [contactRows, clientRows, categoryRows, userRows] = await Promise.all([fetchContactsList().catch(() => []), fetchClientsList().catch(() => []), fetchTicketCategories().catch(() => []), fetchUsers().catch(() => [])]);
        if (cancelled) return;
        setContacts(Array.isArray(contactRows) ? contactRows : []);
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setCategories(Array.isArray(categoryRows) ? categoryRows : []);
        setUsers(Array.isArray(userRows) ? userRows : []);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!initialData?.contactId || contacts.length === 0) return;
    const contact = contacts.find(c => String(c.id) === String(initialData.contactId));
    if (contact) {
      setRequesterContactId(String(contact.id));
      setContactSearch(getContactLabel(contact, copy));
    }
  }, [initialData?.contactId, contacts, copy]);
  useEffect(() => {
    if (initialData?.contactId || !initialData?.clientId || contacts.length === 0) return;
    if (requesterContactId) return;
    const primary = findPrimaryContactForClient(contacts, initialData.clientId);
    if (!primary) return;
    setRequesterContactId(String(primary.id));
    setContactSearch(getContactLabel(primary, copy));
  }, [initialData?.contactId, initialData?.clientId, contacts, copy, requesterContactId]);
  useEffect(() => {
    if (initialData?.title) setTitle(String(initialData.title));
    if (initialData?.description) setDescription(String(initialData.description));
  }, [initialData?.title, initialData?.description]);
  useEffect(() => {
    if (!initialData?.category || categories.length === 0) return;
    if (category) return;
    const match = findCategoryByHint(categories, initialData.category);
    if (!match?.name) return;
    setCategory(String(match.name));
    setCategorySearch(String(match.name));
  }, [initialData?.category, categories, category]);
  useEffect(() => {
    if (!initialData?.equipmentId || clientEquipments.length === 0) return;
    const wanted = String(initialData.equipmentId);
    const match = clientEquipments.find(eq => String(eq.id) === wanted || String(eq.dbId || "") === wanted || String(eq.name) === wanted);
    if (!match) return;
    setEquipmentConcerned(true);
    setEquipmentId(String(match.id));
  }, [initialData?.equipmentId, clientEquipments]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (!contactDropdownRef.current?.contains(e.target) && !contactListRef.current?.contains(e.target)) {
        setShowContactDropdown(false);
      }
      if (!linkedTicketDropdownRef.current?.contains(e.target) && !linkedTicketListRef.current?.contains(e.target)) {
        setShowLinkedTicketDropdown(false);
      }
      if (!categoryDropdownRef.current?.contains(e.target) && !categoryListRef.current?.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (!assigneeDropdownRef.current?.contains(e.target) && !assigneeListRef.current?.contains(e.target)) {
        setShowAssigneeDropdown(false);
      }
      if (!followerDropdownRef.current?.contains(e.target) && !followerListRef.current?.contains(e.target)) {
        setShowFollowerDropdown(false);
      }
      if (!equipmentDropdownRef.current?.contains(e.target) && !equipmentListRef.current?.contains(e.target)) {
        setShowEquipmentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const selectedContact = useMemo(() => contacts.find(c => String(c.id) === String(requesterContactId)) || null, [contacts, requesterContactId]);
  const contactClientOptions = useMemo(() => getContactClientOptions(selectedContact, clients), [selectedContact, clients]);
  const requiresCompanySelect = contactClientOptions.length > 1;
  useEffect(() => {
    if (!selectedContact) {
      if (!initialData?.clientId) setTicketClientId("");
      return;
    }
    if (contactClientOptions.length === 1) {
      setTicketClientId(String(contactClientOptions[0].id));
      return;
    }
    if (contactClientOptions.length > 1) {
      setTicketClientId(prev => {
        if (prev && contactClientOptions.some(opt => String(opt.id) === String(prev))) return prev;
        if (initialData?.clientId && contactClientOptions.some(opt => String(opt.id) === String(initialData.clientId))) {
          return String(initialData.clientId);
        }
        return "";
      });
      return;
    }
    setTicketClientId(selectedContact.client_id ? String(selectedContact.client_id) : "");
  }, [selectedContact, contactClientOptions, initialData?.clientId]);
  const resolvedTicketClientId = ticketClientId || (contactClientOptions.length === 1 ? contactClientOptions[0].id : null) || selectedContact?.client_id || initialData?.clientId || null;
  const clientLabel = useMemo(() => {
    if (!selectedContact) return "";
    const selectedOption = contactClientOptions.find(opt => String(opt.id) === String(resolvedTicketClientId));
    if (selectedOption?.name) return selectedOption.name;
    if (contactClientOptions.length === 1) return contactClientOptions[0].name;
    if (contactClientOptions.length > 1) return contactClientOptions.map(opt => opt.name).filter(Boolean).join(", ");
    const direct = selectedContact.client_name || selectedContact.entreprise;
    if (direct) return direct;
    const client = clients.find(c => String(c.id) === String(selectedContact.client_id));
    return client?.name || client?.nom || "";
  }, [selectedContact, clients, contactClientOptions, resolvedTicketClientId]);
  const selectedClient = useMemo(() => clients.find(c => String(c.id) === String(resolvedTicketClientId)) || null, [clients, resolvedTicketClientId]);
  const clientContractSummary = useMemo(() => buildClientContractSummary(selectedClient), [selectedClient]);
  const activeContractOptionLabels = useMemo(() => {
    if (!clientContractSummary) return [];
    return contractModuleDefs.filter(mod => mod.enabled !== false && clientContractSummary.activeOptionKeys.includes(mod.moduleKey)).map(mod => copy.getContractModuleLabel(mod.moduleKey, mod.label));
  }, [clientContractSummary, contractModuleDefs, copy]);
  const clientSlaRows = useMemo(() => {
    const client = clients.find(c => String(c.id) === String(resolvedTicketClientId));
    const sla = parseClientSla(client?.contrat);
    if (!sla.enabled) return [];
    return formatClientSlaRows(client?.contrat);
  }, [clients, resolvedTicketClientId]);
  useEffect(() => {
    const clientId = resolvedTicketClientId;
    if (!clientId) {
      setSupportCreditBalance(null);
      setSupportCreditPacks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingCredits(true);
      try {
        const data = await fetchClientSupportCredits(clientId);
        if (!cancelled) {
          setSupportCreditBalance(Number(data?.balance ?? 0));
          setSupportCreditPacks(Array.isArray(data?.packs) ? data.packs : []);
        }
      } catch {
        if (!cancelled) {
          setSupportCreditBalance(null);
          setSupportCreditPacks([]);
        }
      } finally {
        if (!cancelled) setLoadingCredits(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedTicketClientId]);
  useEffect(() => {
    const clientId = resolvedTicketClientId;
    if (!clientId) {
      setClientEquipments([]);
      setEquipmentId("");
      setEquipmentSearch("");
      setShowEquipmentDropdown(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingEquipments(true);
      try {
        const rows = await loadClientEquipments(clientId);
        if (!cancelled) setClientEquipments(rows);
      } catch {
        if (!cancelled) setClientEquipments([]);
      } finally {
        if (!cancelled) setLoadingEquipments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedTicketClientId]);
  useEffect(() => {
    const contactId = selectedContact?.id;
    setLinkedTicketId("");
    setLinkedTicketSearch("");
    setShowLinkedTicketDropdown(false);
    if (!contactId) {
      setClientTickets([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingClientTickets(true);
      try {
        const rows = await fetchTickets({
          requesterContactId: contactId,
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
  }, [selectedContact?.id]);
  const requesterTicketStats = useMemo(() => buildRequesterTicketStats(clientTickets), [clientTickets]);
  const selectedEquipment = useMemo(() => clientEquipments.find(eq => String(eq.id) === String(equipmentId)) || null, [clientEquipments, equipmentId]);
  const selectedLinkedTicket = useMemo(() => clientTickets.find(ticket => String(ticket.id) === String(linkedTicketId)) || null, [clientTickets, linkedTicketId]);
  const filteredEquipments = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    const base = q ? clientEquipments.filter(eq => getEquipmentSearchText(eq, locale).includes(q)) : clientEquipments;
    return base.slice(0, 50);
  }, [clientEquipments, equipmentSearch, locale]);
  const filteredLinkableTickets = useMemo(() => {
    const q = linkedTicketSearch.trim().toLowerCase();
    const base = q ? clientTickets.filter(ticket => getTicketLinkSearchText(ticket).includes(q)) : clientTickets;
    return base.slice(0, 50);
  }, [clientTickets, linkedTicketSearch]);
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts.slice(0, 50);
    return contacts.filter(c => getContactSearchText(c).includes(q)).slice(0, 50);
  }, [contacts, contactSearch]);
  const enabledCategories = useMemo(() => (Array.isArray(categories) ? categories : []).filter(item => item?.enabled !== false), [categories]);
  const filteredCategoryOptions = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    const rows = !q ? enabledCategories : enabledCategories.filter(item => {
      const name = String(item?.name || "").toLowerCase();
      const section = String(item?.section || "").toLowerCase();
      return name.includes(q) || section.includes(q);
    });
    return rows.slice(0, 80);
  }, [enabledCategories, categorySearch]);
  const filteredCategoryGroups = useMemo(() => Object.entries(filteredCategoryOptions.reduce((acc, item) => {
    const section = String(item?.section || copy.uncategorized).trim() || copy.uncategorized;
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {})), [filteredCategoryOptions, copy.uncategorized]);
  const agentLabel = authUser?.username?.trim() || authUser?.email || copy.agentFallback;
  const creditsBlocked = supportCreditBalance !== null && supportCreditBalance <= 0;
  const supportCreditTotals = useMemo(() => computeSupportCreditTotals(supportCreditBalance, supportCreditPacks), [supportCreditBalance, supportCreditPacks]);
  const contractFactLabel = useMemo(() => {
    if (!selectedContact || !clientContractSummary) return copy.noContract;
    return copy.getContractFactLabel(clientContractSummary.validity, {
      startDate: clientContractSummary.startDate,
      expirationDate: clientContractSummary.expirationDate
    });
  }, [selectedContact, clientContractSummary, copy]);
  const contractOptionsLabel = useMemo(() => {
    if (!selectedContact) return copy.noOption;
    if (activeContractOptionLabels.length === 0) return copy.noOption;
    return activeContractOptionLabels.join(" / ");
  }, [selectedContact, activeContractOptionLabels, copy]);
  const contractCreditsLabel = useMemo(() => {
    if (!selectedContact) return copy.noCredit;
    if (loadingCredits) return copy.loading;
    if (supportCreditBalance === null) return copy.noCredit;
    const {
      remaining,
      total
    } = supportCreditTotals;
    if (total <= 0 && remaining <= 0) return copy.noCredit;
    return `${remaining} / ${total}`;
  }, [selectedContact, loadingCredits, supportCreditBalance, supportCreditTotals, copy]);
  const contractCreditsEmpty = useMemo(() => {
    if (!selectedContact || loadingCredits) return false;
    if (supportCreditBalance === null) return true;
    return supportCreditTotals.total <= 0 && supportCreditTotals.remaining <= 0;
  }, [selectedContact, loadingCredits, supportCreditBalance, supportCreditTotals]);
  const contractSlaLabel = useMemo(() => {
    if (!selectedContact || clientSlaRows.length === 0) return copy.noSla;
    const slaRow = clientSlaRows.find(r => r.key === priority) || clientSlaRows.find(r => r.key === "normal");
    if (!slaRow) return copy.noSla;
    return copy.formatSlaLabel(slaRow.firstResponseHours, slaRow.resolutionHours);
  }, [selectedContact, clientSlaRows, priority, copy]);
  const contractSlaEmpty = !selectedContact || clientSlaRows.length === 0;
  const contractOptionsEmpty = !selectedContact || activeContractOptionLabels.length === 0;
  const contractFactEmpty = !selectedContact || !clientContractSummary || clientContractSummary.validity?.status === "unknown";
  const availabilitySlots = useMemo(() => buildAvailabilityContactSlots({
    mode: availabilityMode,
    date: availabilityDate,
    startTime: availabilityStart,
    endTime: availabilityEnd,
    note: availabilityNote
  }), [availabilityMode, availabilityDate, availabilityStart, availabilityEnd, availabilityNote]);
  const filledContactSlots = availabilitySlots;
  const selectContact = useCallback(contact => {
    setRequesterContactId(String(contact.id));
    setContactSearch(getContactLabel(contact, copy));
    setShowContactDropdown(false);
    const options = getContactClientOptions(contact, clients);
    if (options.length === 1) {
      setTicketClientId(String(options[0].id));
    } else if (options.length > 1) {
      const preferred = initialData?.clientId && options.some(opt => String(opt.id) === String(initialData.clientId)) ? String(initialData.clientId) : "";
      setTicketClientId(preferred);
    } else {
      setTicketClientId(contact?.client_id ? String(contact.client_id) : "");
    }
    setFieldErrors(prev => ({
      ...prev,
      requester: undefined,
      company: undefined
    }));
  }, [copy, clients, initialData?.clientId]);
  const selectCategory = useCallback(item => {
    const name = String(item?.name || "").trim();
    if (!name) return;
    setCategory(name);
    setCategorySearch(name);
    setShowCategoryDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      category: undefined
    }));
  }, []);
  const applySelectedAttachments = useCallback((selectedFiles = []) => {
    if (selectedFiles.length === 0) return;
    copy.validateAttachmentFiles(selectedFiles);
    setAttachmentFiles(prev => {
      const merged = mergeAttachmentFiles(prev, selectedFiles);
      if (merged.length >= MAX_ATTACHMENT_FILES && prev.length + selectedFiles.length > MAX_ATTACHMENT_FILES) {
        toast.warning(copy.formatMaxFilesWarning(MAX_ATTACHMENT_FILES));
      }
      return merged;
    });
    setFieldErrors(prev => ({
      ...prev,
      attachments: undefined
    }));
  }, [copy]);
  const removeAttachmentFile = useCallback(fileKey => {
    setAttachmentFiles(prev => prev.filter(file => `${file.name}-${file.size}-${file.lastModified || 0}` !== fileKey));
  }, []);
  const hasFileDrag = useCallback(event => {
    const types = Array.from(event.dataTransfer?.types || []);
    return types.includes("Files");
  }, []);
  const resetPageDragState = useCallback(() => {
    setIsAttachmentDragOver(false);
  }, []);
  const handlePageDragEnter = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    setIsAttachmentDragOver(true);
  }, [hasFileDrag]);
  const handlePageDragLeave = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    resetPageDragState();
  }, [hasFileDrag, resetPageDragState]);
  const handlePageDragOver = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [hasFileDrag]);
  const handlePageDrop = useCallback(event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    resetPageDragState();
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    if (droppedFiles.length === 0) return;
    try {
      applySelectedAttachments(droppedFiles);
    } catch (error) {
      toast.error(error.message || copy.attachmentInvalid);
    }
  }, [applySelectedAttachments, hasFileDrag, resetPageDragState]);
  useEffect(() => {
    window.addEventListener("dragend", resetPageDragState);
    return () => window.removeEventListener("dragend", resetPageDragState);
  }, [resetPageDragState]);
  const enrichContactRow = useCallback(contact => {
    if (!contact) return null;
    const client = clients.find(cl => String(cl.id) === String(contact.client_id));
    return {
      ...contact,
      client_name: contact.client_name || contact.entreprise || client?.name || client?.nom || ""
    };
  }, [clients]);
  const reloadContacts = useCallback(async () => {
    const contactRows = await fetchContactsList(null, {
      bypassCache: true
    }).catch(() => []);
    const nextContacts = Array.isArray(contactRows) ? contactRows.map(row => enrichContactRow(row) || row) : [];
    setContacts(nextContacts);
    return nextContacts;
  }, [enrichContactRow]);
  const handleContactSaved = useCallback(async savedContact => {
    const enriched = enrichContactRow(savedContact);
    if (enriched?.id) {
      setContacts(prev => {
        const without = prev.filter(row => String(row.id) !== String(enriched.id));
        return [enriched, ...without];
      });
      selectContact(enriched);
    }
    setContactModalOpen(false);
    setContactModalInitial(null);
    const rows = await reloadContacts();
    const contact = rows.find(row => String(row.id) === String(savedContact?.id)) || enriched;
    if (contact) selectContact(contact);
  }, [reloadContacts, enrichContactRow, selectContact]);
  const contactCreateDefaultClientId = useMemo(() => {
    if (resolvedTicketClientId) return resolvedTicketClientId;
    if (selectedContact?.client_id) return selectedContact.client_id;
    if (initialData?.clientId) return initialData.clientId;
    return null;
  }, [resolvedTicketClientId, selectedContact?.client_id, initialData?.clientId]);
  const openContactCreateModal = useCallback(() => {
    setShowContactDropdown(false);
    setContactModalInitial(null);
    setContactModalOpen(true);
  }, []);
  const openContactEditModal = useCallback(() => {
    if (!selectedContact) return;
    setShowContactDropdown(false);
    setContactModalInitial(selectedContact);
    setContactModalOpen(true);
  }, [selectedContact]);
  const closeContactModal = useCallback(() => {
    setContactModalOpen(false);
    setContactModalInitial(null);
  }, []);
  const handleAvailabilityModeChange = useCallback(mode => {
    setAvailabilityMode(mode);
    setFieldErrors(prev => ({
      ...prev,
      contactSlots: undefined
    }));
    if (mode !== "none" && !availabilityDate) {
      setAvailabilityDate(getTodayDateString());
    }
  }, [availabilityDate]);
  const handleTypeChange = useCallback(nextType => {
    setType(nextType);
    if (nextType !== "incident") setIsMajorIncident(false);
  }, []);
  const handleMajorIncidentChange = useCallback(checked => {
    setIsMajorIncident(checked);
    if (checked) setPriority("urgent");
  }, []);
  const handlePriorityChange = useCallback(nextPriority => {
    if (isMajorIncident && nextPriority !== "urgent") return;
    setPriority(nextPriority);
  }, [isMajorIncident]);
  const handleEquipmentConcernedChange = useCallback(concerned => {
    setEquipmentConcerned(concerned);
    setFieldErrors(prev => ({
      ...prev,
      equipmentId: undefined,
      equipmentBrand: undefined,
      equipmentModel: undefined,
      equipmentSerial: undefined
    }));
    if (!concerned) {
      setEquipmentId("");
      setEquipmentSearch("");
      setShowEquipmentDropdown(false);
      setEquipmentBrand("");
      setEquipmentModel("");
      setEquipmentSerial("");
    }
  }, []);
  const selectEquipment = useCallback(equipment => {
    if (!equipment?.id) return;
    setEquipmentId(String(equipment.id));
    setEquipmentSearch(getEquipmentPickerLabel(equipment, {
      serialPrefix: copy.serialPrefix,
      locale
    }));
    setShowEquipmentDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      equipmentId: undefined
    }));
  }, [copy.serialPrefix, locale]);
  const handleEquipmentSearchChange = useCallback(typed => {
    setEquipmentSearch(typed);
    setEquipmentId("");
    setShowEquipmentDropdown(true);
    setEquipmentHighlight(0);
    setFieldErrors(prev => ({
      ...prev,
      equipmentId: undefined
    }));
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
  const validate = () => {
    const errors = {};
    if (!requesterContactId) errors.requester = true;
    if (requiresCompanySelect && !ticketClientId) errors.company = true;
    if (!category.trim()) errors.category = true;
    if (title.trim().length < 3) errors.title = true;
    if (description.trim().length < 10) errors.description = true;
    if (availabilityMode === "from") {
      if (!availabilityDate || !availabilityStart) {
        errors.contactSlots = true;
      }
    } else if (availabilityMode === "range") {
      if (!availabilityDate || !availabilityStart || !availabilityEnd) {
        errors.contactSlots = true;
      } else if (availabilityStart >= availabilityEnd) {
        errors.contactSlots = true;
      }
    }
    if (equipmentConcerned) {
      if (equipmentSource === "veritas") {
        if (!equipmentId) errors.equipmentId = true;
      } else {
        if (!equipmentBrand.trim()) errors.equipmentBrand = true;
        if (!equipmentModel.trim()) errors.equipmentModel = true;
        if (!equipmentSerial.trim()) errors.equipmentSerial = true;
      }
    }
    if (linkedTicketEnabled && !linkedTicketId) {
      errors.linkedTicketId = true;
    }
    if (type === "incident" && isMajorIncident && priority !== "urgent") {
      errors.priority = true;
    }
    try {
      copy.validateAttachmentFiles(attachmentFiles);
    } catch {
      errors.attachments = true;
    }
    return errors;
  };
  const scrollToFirstFieldError = useCallback(() => {
    requestAnimationFrame(() => {
      const errorClassNames = [s.inputError, s.contactInputWrapError, s.fieldShellError, s.attachmentDropZoneError, s.availabilitySlotBarError].filter(Boolean);
      if (errorClassNames.length === 0) return;
      const selector = errorClassNames.map(cls => `.${CSS.escape(cls)}`).join(", ");
      const invalidField = document.querySelector(selector);
      invalidField?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }, [s.inputError, s.contactInputWrapError, s.fieldShellError, s.attachmentDropZoneError, s.availabilitySlotBarError]);
  const handleOpenConfirm = () => {
    try {
      setFormError("");
      const errors = validate();
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setErrorPulseTick(tick => tick + 1);
        scrollToFirstFieldError();
        return;
      }
      setConfirmModalOpen(true);
    } catch (err) {
      const message = err?.message || copy.openRecapError;
      setFormError(message);
      toast.error(message);
    }
  };
  const handleCloseConfirm = () => {
    if (submitting) return;
    setConfirmModalOpen(false);
  };
  const handleConfirmCreate = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      const equipmentInfo = serializeEquipmentInfo({
        concerned: equipmentConcerned,
        source: equipmentSource,
        equipmentId,
        name: selectedEquipment?.name,
        type: selectedEquipment?.type,
        clientId: resolvedTicketClientId,
        brand: equipmentBrand,
        model: equipmentModel,
        serial: equipmentSerial
      });
      const created = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority: type === "incident" && isMajorIncident ? "urgent" : priority,
        status: "new",
        type,
        category: category.trim(),
        channel,
        clientId: resolvedTicketClientId || null,
        assignedUserId: preAssigneeUserIds[0] || null,
        requesterUserId: null,
        requesterContactId,
        isMajorIncident: type === "incident" && isMajorIncident,
        contactSlots: serializeContactSlots(availabilitySlots),
        equipmentInfo,
        assigneeUserIds: preAssigneeUserIds,
        watcherUserIds: preFollowerUserIds
      });
      for (const userId of preAssigneeUserIds) {
        try {
          await addTicketAssignee(created.id, userId);
        } catch {}
      }
      for (const userId of preFollowerUserIds) {
        try {
          await addTicketWatcher(created.id, userId);
        } catch {}
      }
      if (equipmentConcerned && equipmentSource === "veritas" && selectedEquipment) {
        try {
          await addTicketComment(created.id, buildLinkedEquipmentComment(selectedEquipment, resolvedTicketClientId), true);
        } catch {}
      }
      if (linkedTicketEnabled && selectedLinkedTicket) {
        try {
          await addTicketComment(created.id, buildLinkedTicketComment(selectedLinkedTicket), true);
        } catch {}
      }
      if (attachmentFiles.length > 0) {
        try {
          await addTicketCommentWithAttachments(created.id, {
            content: "",
            isInternal: true,
            files: attachmentFiles
          });
        } catch {
          toast.warning(copy.attachmentsUploadWarning);
        }
      }
      setConfirmModalOpen(false);
      setCreatedTicket(created);
      toast.success(copy.createSuccess);
    } catch (err) {
      const message = err.message || copy.createError;
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };
  const resetForm = () => {
    setType("incident");
    setIsMajorIncident(false);
    setTitle("");
    setDescription("");
    setPriority("normal");
    setChannel("phone");
    setCategory("");
    setCategorySearch("");
    setShowCategoryDropdown(false);
    setAvailabilityMode("none");
    setAvailabilityDate("");
    setAvailabilityStart("09:00");
    setAvailabilityEnd("17:00");
    setAvailabilityNote("");
    setEquipmentConcerned(false);
    setEquipmentSource("veritas");
    setEquipmentId("");
    setEquipmentSearch("");
    setShowEquipmentDropdown(false);
    setEquipmentBrand("");
    setEquipmentModel("");
    setEquipmentSerial("");
    setClientEquipments([]);
    setLinkedTicketEnabled(false);
    setLinkedTicketId("");
    setLinkedTicketSearch("");
    setClientTickets([]);
    setRequesterContactId("");
    setContactSearch("");
    setPreAssigneeUserIds([]);
    setPreFollowerUserIds([]);
    setAssigneeSearch("");
    setFollowerSearch("");
    setShowAssigneeDropdown(false);
    setShowFollowerDropdown(false);
    setAttachmentFiles([]);
    setIsAttachmentDragOver(false);
    setFormError("");
    setFieldErrors({});
    setCreatedTicket(null);
    setSupportCreditBalance(null);
    setSupportCreditPacks([]);
  };
  const equipmentSummary = useMemo(() => {
    if (!equipmentConcerned) return copy.none;
    if (equipmentSource === "veritas") {
      return selectedEquipment ? getEquipmentPickerLabel(selectedEquipment, {
        serialPrefix: copy.serialPrefix,
        locale
      }) : copy.veritasEquipment;
    }
    return [equipmentBrand, equipmentModel, equipmentSerial].filter(Boolean).join(" · ") || copy.externalEquipment;
  }, [equipmentConcerned, equipmentSource, selectedEquipment, equipmentBrand, equipmentModel, equipmentSerial, locale, copy]);
  const linkedTicketSummary = useMemo(() => {
    if (!linkedTicketEnabled) return copy.none;
    return selectedLinkedTicket ? getTicketLinkLabel(selectedLinkedTicket) : "-";
  }, [linkedTicketEnabled, selectedLinkedTicket, copy]);
  const attachmentsSummary = useMemo(() => {
    if (attachmentFiles.length === 0) return copy.none;
    return attachmentFiles.map(file => file.name).join(", ");
  }, [attachmentFiles, copy]);
  const userSearchOptions = useMemo(() => users.map(user => ({
    id: String(user.id),
    label: getUserLabel(user, copy.agentFallback)
  })), [users, copy.agentFallback]);
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
    return found ? getUserLabel(found, copy.agentFallback) : String(userId || "-");
  }, [users, copy.agentFallback]);
  const preAssigneesSummary = useMemo(() => {
    if (preAssigneeUserIds.length === 0) return "-";
    return preAssigneeUserIds.map(userId => resolveUserIdLabel(userId)).join(", ");
  }, [preAssigneeUserIds, resolveUserIdLabel]);
  const preFollowersSummary = useMemo(() => {
    if (preFollowerUserIds.length === 0) return "-";
    return preFollowerUserIds.map(userId => resolveUserIdLabel(userId)).join(", ");
  }, [preFollowerUserIds, resolveUserIdLabel]);
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
  if (createdTicket) {
    return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`}>
        <div className={mspStyles.mspLayout}>
          <div className={mspStyles.mspMain}>
            <MspPageHero eyebrow={copy.eyebrow} title={copy.successTitle} subtitle={copy.formatSuccessSubtitle(clientLabel)} icon="mdi:message-processing-outline" />
            <div className={`${mspStyles.mspContent} ${mspStyles.mspContentList} mspContent`}>
              <div className={`${layout.shell} ${s.successShell}`}>
                <section className={s.successCard}>
                  <div className={s.successPanel}>
                    <div className={s.successMarkWrap} aria-hidden>
                      <span className={s.successMarkRing} />
                      <span className={`${s.successMarkRing} ${s.successMarkRingDelay}`} />
                      <svg className={s.successMark} viewBox="0 0 72 72">
                        <circle className={s.successMarkDisc} cx="36" cy="36" r="36" />
                        <path className={s.successMarkCheck} d="M22 37.5 L31.5 47 L51 26.5" />
                      </svg>
                    </div>
                    <div className={s.successCopy}>
                      <h2 className={s.successTitle}>
                        {copy.formatSuccessRegistered(createdTicket.ticket_number || "-")}
                      </h2>
                      <p className={s.successText}>
                        {copy.formatSuccessCreatedFor(selectedContact ? getContactLabel(selectedContact, copy) : "-", clientLabel)}
                      </p>
                      {createdTicket.ticket_number ? <span className={s.reference}>
                          <Icon icon="mdi:pound" />
                          {createdTicket.ticket_number}
                        </span> : null}
                    </div>
                    <div className={s.successActions}>
                      <button type="button" className={layout.primaryBtn} onClick={() => onNavigate?.("TicketDetail", {
                      ticketId: createdTicket.id,
                      ticketNumber: createdTicket.ticket_number,
                      title: createdTicket.title
                    })}>
                        <Icon icon="mdi:eye-outline" />
                        {copy.viewTicket}
                      </button>
                      <button type="button" className={s.btnSecondary} onClick={resetForm}>
                        <Icon icon="mdi:plus" />
                        {copy.createAnother}
                      </button>
                      <button type="button" className={s.btnSecondary} onClick={() => onNavigate?.("Ticket")}>
                        <Icon icon="mdi:arrow-left" />
                        {copy.ticketList}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div className={`${mspStyles.mspPage} ${layout.page} msp-page-grid`} onDragEnter={handlePageDragEnter} onDragLeave={handlePageDragLeave} onDragOver={handlePageDragOver} onDrop={handlePageDrop}>
      {isAttachmentDragOver && <div className={s.pageDropOverlay} aria-hidden>
          <Icon icon="mdi:upload-outline" className={s.pageDropOverlayIcon} />
          <p className={s.pageDropOverlayTitle}>{copy.dropOverlayTitle}</p>
          <p className={s.pageDropOverlayHint}>{copy.formatDropOverlayHint(MAX_ATTACHMENT_FILES)}</p>
        </div>}
      <div className={mspStyles.mspLayout}>
        <div className={mspStyles.mspMain}>
          <MspPageHero eyebrow={copy.eyebrow} title={copy.pageTitle} subtitle={copy.formatPageSubtitle(agentLabel)} icon="mdi:message-processing-outline" actions={<>
            <button type="button" className={s.btnSecondary} onClick={() => onNavigate?.("Ticket")}>
              <Icon icon="mdi:arrow-left" />
              {copy.back}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleOpenConfirm} disabled={submitting || loadingData} title={loadingData ? copy.loadingData : undefined}>
              <Icon icon="mdi:check" />
              {submitting ? copy.creating : copy.createTicket}
            </button>
          </>} />
          <div className={`${mspStyles.mspContent} ${mspStyles.mspContentList} mspContent`}>
      <div className={layout.shell}>

        <div className={s.typeKpiRow}>
          {copy.ticketTypes.map(item => <button key={item.key} type="button" className={`${layout.kpiCard} ${type === item.key ? layout.kpiCardActive : ""}`} onClick={() => handleTypeChange(item.key)}>
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
              <SectionPanel title={copy.sections.requester} className={s.panelAllowOverflow}>
                <div className={s.demandeurBlock}>
                  <p className={s.detailsAvailabilityTitle}>{copy.requesterContact}</p>
                  <div className={s.contactSearchRow}>
                  <div className={s.contactPicker} ref={contactDropdownRef}>
                  <div data-pulse={fieldErrors.requester ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showContactDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.requester ? s.contactInputWrapError : ""} ${fieldErrors.requester ? s.fieldErrorPulse : ""}`}>
                    <Icon icon="mdi:magnify" className={s.contactInputIcon} />
                    <input type="text" className={s.contactInput} value={contactSearch} placeholder={copy.searchContact} aria-label={copy.searchContactAria} aria-expanded={showContactDropdown} aria-haspopup="listbox" disabled={loadingData} onChange={e => {
                        setContactSearch(e.target.value);
                        setRequesterContactId("");
                        setTicketClientId("");
                        setShowContactDropdown(true);
                        setContactHighlight(0);
                        setFieldErrors(prev => ({
                          ...prev,
                          requester: undefined,
                          company: undefined
                        }));
                      }} onFocus={() => {
                        if (requesterContactId) return;
                        setShowContactDropdown(true);
                      }} onKeyDown={e => {
                        if (!showContactDropdown || filteredContacts.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setContactHighlight(h => Math.min(h + 1, filteredContacts.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setContactHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredContacts[contactHighlight];
                          if (picked) selectContact(picked);
                        } else if (e.key === "Escape") setShowContactDropdown(false);
                      }} />
                  </div>
                  {showContactDropdown && contactDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={contactListRef} className={s.contactDropdownPortal} role="listbox" style={{
                      top: contactDropdownCoords.top,
                      bottom: contactDropdownCoords.bottom,
                      left: contactDropdownCoords.left,
                      width: contactDropdownCoords.width,
                      maxHeight: contactDropdownCoords.maxHeight
                    }}>
                      {filteredContacts.length === 0 ? <div className={s.contactEmpty}>
                          <span>{copy.noContactFound}</span>
                          <button type="button" className={s.contactEmptyAction} onClick={openContactCreateModal}>
                            {copy.createContact}
                          </button>
                        </div> : filteredContacts.map((c, idx) => {
                        const companyOptions = getContactClientOptions(c, clients);
                        const company = companyOptions.map(opt => opt.name).filter(Boolean).join(", ") || c.client_name || c.entreprise || clients.find(cl => String(cl.id) === String(c.client_id))?.name || clients.find(cl => String(cl.id) === String(c.client_id))?.nom || "";
                        return <button key={c.id} type="button" className={`${s.contactOption} ${idx === contactHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setContactHighlight(idx)} onClick={() => selectContact(c)}>
                              <span className={s.contactOptionName}>{getContactLabel(c, copy)}</span>
                              {company && <span className={s.contactOptionMeta}>{company}</span>}
                            </button>;
                      })}
                    </div>, document.body) : null}
                </div>
                  <button type="button" className={s.contactCreateBtn} onClick={openContactCreateModal} disabled={loadingData}>
                    <Icon icon="mdi:account-plus-outline" aria-hidden />
                    {copy.newContact}
                  </button>
                </div>

                  {selectedContact && requiresCompanySelect ? <div className={s.fieldBlock} style={{
                  marginTop: "0.85rem"
                }}>
                      <label className={s.fieldLabel} htmlFor="ticket-create-company">
                        {copy.selectCompany || copy.enterprise}<span className={s.requiredMark}>*</span>
                      </label>
                      <select id="ticket-create-company" className={`${s.input} ${fieldErrors.company ? s.inputError : ""}`.trim()} value={ticketClientId || ""} onChange={e => {
                  setTicketClientId(e.target.value);
                  setFieldErrors(prev => ({
                    ...prev,
                    company: undefined
                  }));
                }} data-pulse={fieldErrors.company ? errorPulseTick : undefined} required>
                        <option value="">{copy.selectCompany || copy.enterprise}</option>
                        {contactClientOptions.map(opt => <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>)}
                      </select>
                      {fieldErrors.company ? <p className={s.equipmentHint}>{copy.companyRequired}</p> : null}
                    </div> : null}

                  {selectedContact && <div className={s.contactSummaryCard}>
                      <div className={s.contactSummaryMain}>
                        <div className={s.clientAvatarSm} aria-hidden>
                          {getContactInitials(selectedContact)}
                        </div>
                        <div className={s.contactSummaryTop}>
                          <div className={s.contactSummaryIdentity}>
                            <p className={s.contactSummaryName}>{getContactDisplayName(selectedContact, copy)}</p>
                            {clientLabel && <p className={s.contactSummaryCompany}>{clientLabel}</p>}
                          </div>
                          <button type="button" className={s.contactEditBtn} onClick={openContactEditModal} aria-label={copy.editContactAria}>
                            <Icon icon="mdi:pencil-outline" aria-hidden />
                          </button>
                        </div>
                        {(selectedContact.poste || selectedContact.telephone || selectedContact.email) && <div className={s.contactSummaryMetaGrid}>
                            {selectedContact.poste && <p className={s.contactSummaryMeta} title={selectedContact.poste}>
                                <Icon icon="mdi:briefcase-outline" aria-hidden />
                                <span>{selectedContact.poste}</span>
                              </p>}
                            {selectedContact.telephone && <p className={s.contactSummaryMeta} title={selectedContact.telephone}>
                                <Icon icon="mdi:phone-outline" aria-hidden />
                                <span>{selectedContact.telephone}</span>
                              </p>}
                            {selectedContact.email && <p className={s.contactSummaryMeta} title={selectedContact.email}>
                                <Icon icon="mdi:email-outline" aria-hidden />
                                <span>{selectedContact.email}</span>
                              </p>}
                          </div>}
                      </div>
                      <div className={s.requesterTicketStats} aria-live="polite">
                        <p className={s.requesterTicketStatsTitle}>
                          <Icon icon="mdi:ticket-outline" aria-hidden />
                          {copy.ticketHistory}
                        </p>
                        {loadingClientTickets ? <p className={s.requesterTicketStatsLoading}>{copy.loading}</p> : <>
                            <div className={s.requesterTicketStatsGrid}>
                              <RequesterOpenTicketsStat tickets={clientTickets} openCount={requesterTicketStats.openCount} onNavigate={onNavigate} copy={copy} />
                              <div className={s.requesterTicketStat}>
                                <span className={s.requesterTicketStatValue}>{requesterTicketStats.monthCount}</span>
                                <span className={s.requesterTicketStatLabel}>{copy.thisMonth}</span>
                              </div>
                              <div className={s.requesterTicketStat}>
                                <span className={s.requesterTicketStatValue}>{requesterTicketStats.yearCount}</span>
                                <span className={s.requesterTicketStatLabel}>{copy.thisYear}</span>
                              </div>
                            </div>
                            <p className={s.requesterTicketStatsFoot}>
                              {requesterTicketStats.lastCreatedAt ? <>
                                  {copy.lastTicket}{" "}
                                  <strong>{copy.formatRelativeDate(requesterTicketStats.lastCreatedAt)}</strong>
                                </> : copy.noTicketForContact}
                            </p>
                          </>}
                      </div>
                    </div>}
                </div>

                <div className={`${s.demandeurBlock} ${s.demandeurBlockDivider}`}>
                  <p className={s.detailsAvailabilityTitle}>{copy.contactSlot}</p>
                  <div className={s.availabilityComposer}>
                    <div className={s.availabilityModeChips} role="radiogroup" aria-label={copy.availabilityAria}>
                      <button type="button" role="radio" aria-checked={availabilityMode === "none"} className={`${s.availabilityModeChip} ${availabilityMode === "none" ? s.availabilityModeChipActive : ""}`} onClick={() => handleAvailabilityModeChange("none")}>
                        <Icon icon="mdi:calendar-remove-outline" aria-hidden />
                        {copy.slotNone}
                      </button>
                      <button type="button" role="radio" aria-checked={availabilityMode === "from"} className={`${s.availabilityModeChip} ${availabilityMode === "from" ? s.availabilityModeChipActive : ""}`} onClick={() => handleAvailabilityModeChange("from")}>
                        <Icon icon="mdi:clock-time-four-outline" aria-hidden />
                        {copy.slotFrom}
                      </button>
                      <button type="button" role="radio" aria-checked={availabilityMode === "range"} className={`${s.availabilityModeChip} ${availabilityMode === "range" ? s.availabilityModeChipActive : ""}`} onClick={() => handleAvailabilityModeChange("range")}>
                        <Icon icon="mdi:calendar-clock-outline" aria-hidden />
                        {copy.slotRange}
                      </button>
                    </div>

                    {availabilityMode !== "none" && <div data-pulse={fieldErrors.contactSlots ? errorPulseTick : undefined} className={`${s.availabilitySlotBar} ${fieldErrors.contactSlots ? s.availabilitySlotBarError : ""} ${fieldErrors.contactSlots ? s.fieldErrorPulse : ""}`}>
                        <label className={s.slotField} onClick={openNativePickerFromEvent}>
                          <Icon icon="mdi:calendar-outline" className={s.slotFieldIcon} aria-hidden />
                          <input type="date" className={s.slotInput} value={availabilityDate} onClick={openNativePickerFromEvent} onChange={e => {
                        setAvailabilityDate(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={copy.dateAria} />
                        </label>
                        {availabilityMode === "from" ? <label className={s.slotField} onClick={openNativePickerFromEvent}>
                            <Icon icon="mdi:clock-outline" className={s.slotFieldIcon} aria-hidden />
                            <input type="time" className={s.slotInput} value={availabilityStart} onClick={openNativePickerFromEvent} onChange={e => {
                        setAvailabilityStart(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={copy.timeAria} />
                          </label> : <div className={`${s.slotField} ${s.slotFieldTimeRange}`} role="group" aria-label={copy.timeRangeAria} onClick={e => {
                            if (e.target.closest("input")) return;
                            openNativePickerFromEvent(e);
                          }}>
                            <Icon icon="mdi:clock-outline" className={s.slotFieldIcon} aria-hidden />
                            <input type="time" className={s.slotInput} value={availabilityStart} onClick={openNativePickerFromEvent} onChange={e => {
                        setAvailabilityStart(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={copy.startTimeAria} />
                            <span className={s.slotSep} aria-hidden>
                              →
                            </span>
                            <input type="time" className={s.slotInput} value={availabilityEnd} onClick={openNativePickerFromEvent} onChange={e => {
                        setAvailabilityEnd(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} aria-label={copy.endTimeAria} />
                          </div>}
                        <label className={`${s.slotField} ${s.slotFieldNote}`}>
                          <Icon icon="mdi:note-text-outline" className={s.slotFieldIcon} aria-hidden />
                          <input type="text" className={s.slotInput} value={availabilityNote} placeholder={copy.notePlaceholder} onChange={e => {
                        setAvailabilityNote(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          contactSlots: undefined
                        }));
                      }} />
                        </label>
                      </div>}
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title={copy.sections.ticketDetails} headerExtra={<SmartTooltip content={<TicketCreateTipsTooltip copy={copy} />} tooltipClassName={s.tipsPortalTooltip} trigger="click" as="button" type="button" className={s.tipsHelpBtn} aria-label={copy.showTipsAria}>
                    <Icon icon="mdi:lightbulb-outline" aria-hidden />
                  </SmartTooltip>}>
                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel}>{copy.subject}<span className={s.requiredMark}>*</span></label>
                  <div data-pulse={fieldErrors.title ? errorPulseTick : undefined} className={`${s.fieldShell} ${fieldErrors.title ? s.fieldShellError : ""} ${fieldErrors.title ? s.fieldErrorPulse : ""}`}>
                    <input type="text" className={s.fieldShellControl} value={title} onChange={e => {
                    setTitle(e.target.value);
                    setFieldErrors(prev => ({
                      ...prev,
                      title: undefined
                    }));
                  }} placeholder={copy.getTitlePlaceholder(type)} maxLength={200} />
                  </div>
                  <span className={s.charCount}>{title.length}/200</span>
                  <TicketKnowledgeSuggestions
                    query={title}
                    copy={copy}
                    onOpen={article => onNavigate?.("KnowledgeBaseArticle", { articleId: article.id, mode: "read", title: article.title })}
                  />
                </div>

                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel}>{copy.detailedDescription}<span className={s.requiredMark}>*</span></label>
                  <div data-pulse={fieldErrors.description ? errorPulseTick : undefined} className={`${s.fieldShell} ${s.fieldShellMultiline} ${fieldErrors.description ? s.fieldShellError : ""} ${fieldErrors.description ? s.fieldErrorPulse : ""}`}>
                    <textarea className={`${s.fieldShellControl} ${s.fieldShellTextarea}`} value={description} onChange={e => {
                    setDescription(e.target.value);
                    setFieldErrors(prev => ({
                      ...prev,
                      description: undefined
                    }));
                  }} placeholder={copy.getDescriptionPlaceholder(type)} rows={8} maxLength={5000} />
                  </div>
                  <span className={s.charCount}>{description.length}/5000</span>
                </div>

                <div className={s.fieldBlock}>
                  <label className={s.fieldLabel} id="ticket-create-attachments-label">
                    {copy.documents}
                  </label>
                  <div data-pulse={fieldErrors.attachments ? errorPulseTick : undefined} className={`${s.attachmentDropZone} ${isAttachmentDragOver ? s.attachmentDropZoneActive : ""} ${fieldErrors.attachments ? s.attachmentDropZoneError : ""} ${fieldErrors.attachments ? s.fieldErrorPulse : ""}`}>
                    <Icon icon="mdi:paperclip" className={s.attachmentDropIcon} aria-hidden />
                    <p className={s.attachmentDropTitle}>{copy.dragFiles}</p>
                    <p className={s.attachmentDropHint}>{copy.formatAttachmentHint(MAX_ATTACHMENT_FILES)}</p>
                    <label className={s.attachmentUploadBtn}>
                      <Icon icon="mdi:upload-outline" aria-hidden />
                      {copy.addFiles}
                      <input ref={attachmentInputRef} type="file" multiple accept={ATTACHMENT_ACCEPT} aria-labelledby="ticket-create-attachments-label" onChange={e => {
                      const selectedFiles = Array.from(e.target.files || []);
                      try {
                        applySelectedAttachments(selectedFiles);
                      } catch (error) {
                        toast.error(error.message || copy.attachmentInvalid);
                      } finally {
                        e.target.value = "";
                      }
                    }} disabled={loadingData || attachmentFiles.length >= MAX_ATTACHMENT_FILES} />
                    </label>
                  </div>
                  {attachmentFiles.length > 0 && <ul className={s.attachmentFileList}>
                      {attachmentFiles.map(file => {
                    const fileKey = `${file.name}-${file.size}-${file.lastModified || 0}`;
                    return <li key={fileKey} className={s.attachmentFileItem}>
                            <Icon icon="mdi:file-document-outline" className={s.attachmentFileIcon} aria-hidden />
                            <span className={s.attachmentFileName} title={file.name}>
                              {file.name}
                            </span>
                            <span className={s.attachmentFileSize}>{copy.formatAttachmentSize(file.size)}</span>
                            <button type="button" className={s.attachmentFileRemove} onClick={() => removeAttachmentFile(fileKey)} aria-label={copy.formatRemoveFileAria(file.name)}>
                              <Icon icon="mdi:close" aria-hidden />
                            </button>
                          </li>;
                  })}
                    </ul>}
                </div>

                {formError && <div className={s.errorBox} role="alert">
                    <Icon icon="mdi:alert-circle-outline" className={s.errorIcon} />
                    <span>{formError}</span>
                  </div>}
              </SectionPanel>
            </div>

            <aside className={`${s.formStack} ${s.sideColumn}`}>
              <SectionPanel title={copy.sections.contract}>
                <dl className={s.contractFacts}>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:domain" className={s.contractFactIcon} aria-hidden />
                      {copy.enterprise}
                    </dt>
                    <dd className={selectedContact ? s.contractFactCompany : s.contractFactEmpty}>
                      {clientLabel || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:file-document-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.contract}
                    </dt>
                    <dd className={contractFactEmpty ? s.contractFactEmpty : clientContractSummary ? s[`contractFact_${clientContractSummary.validity.status}`] || "" : s.contractFactEmpty}>
                      {contractFactLabel}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:puzzle-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.options}
                    </dt>
                    <dd className={contractOptionsEmpty ? s.contractFactEmpty : ""} title={contractOptionsEmpty ? undefined : contractOptionsLabel}>
                      {contractOptionsLabel}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:ticket-percent-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.credits}
                    </dt>
                    <dd className={contractCreditsEmpty ? s.contractFactEmpty : creditsBlocked ? s.contractFactWarn : ""}>
                      {contractCreditsLabel}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:clock-check-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.sla}
                    </dt>
                    <dd className={contractSlaEmpty ? s.contractFactEmpty : ""}>{contractSlaLabel}</dd>
                  </div>
                </dl>
              </SectionPanel>

              <SectionPanel title={copy.sections.settings} className={s.panelAllowOverflow}>
                <div className={s.settingsPanel}>
                  {type === "incident" && <div className={s.settingsMajorTop}>
                      <div className={s.majorSwitchRow}>
                        <div className={s.majorSwitchText}>
                          <span className={s.majorSwitchLabel}>
                            <Icon icon="mdi:alert-octagon" className={s.majorSwitchIcon} />
                            {copy.majorIncident}
                          </span>
                        </div>
                        <label className={s.switch}>
                          <input type="checkbox" className={s.switchInput} checked={isMajorIncident} onChange={e => handleMajorIncidentChange(e.target.checked)} />
                          <span className={s.switchTrack} aria-hidden />
                        </label>
                      </div>
                    </div>}

                  <div className={s.settingsFieldRow}>
                    <div className={s.equipmentField}>
                      <label className={s.equipmentFieldLabel} id="ticket-create-category-label">
                        {copy.itilCategory}<span className={s.requiredMark}>*</span>
                      </label>
                      <div className={s.contactPicker} ref={categoryDropdownRef}>
                        <div data-pulse={fieldErrors.category ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showCategoryDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.category ? s.contactInputWrapError : ""} ${fieldErrors.category ? s.fieldErrorPulse : ""}`}>
                          <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                          <input type="text" className={s.contactInput} value={categorySearch} placeholder={copy.searchCategory} aria-labelledby="ticket-create-category-label" aria-expanded={showCategoryDropdown} aria-haspopup="listbox" aria-autocomplete="list" disabled={loadingData} onChange={e => {
                          const typed = e.target.value;
                          setCategorySearch(typed);
                          if (typed.trim() !== category) setCategory("");
                          setShowCategoryDropdown(true);
                          setCategoryHighlight(0);
                          setFieldErrors(prev => ({
                            ...prev,
                            category: undefined
                          }));
                        }} onFocus={() => setShowCategoryDropdown(true)} onKeyDown={e => {
                          if (!showCategoryDropdown || filteredCategoryOptions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setCategoryHighlight(h => Math.min(h + 1, filteredCategoryOptions.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setCategoryHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredCategoryOptions[categoryHighlight];
                            if (picked) selectCategory(picked);
                          } else if (e.key === "Escape") {
                            setShowCategoryDropdown(false);
                          }
                        }} />
                        </div>
                        {showCategoryDropdown && categoryDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={categoryListRef} className={s.contactDropdownPortal} role="listbox" aria-labelledby="ticket-create-category-label" style={{
                            top: categoryDropdownCoords.top,
                            bottom: categoryDropdownCoords.bottom,
                            left: categoryDropdownCoords.left,
                            width: categoryDropdownCoords.width,
                            maxHeight: categoryDropdownCoords.maxHeight
                          }}>
                            {filteredCategoryOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noCategoryFound}</div> : (() => {
                          let optionIndex = -1;
                          return filteredCategoryGroups.map(([section, items]) => <div key={section}>
                                    <div className={s.categoryDropdownSection}>{section}</div>
                                    {items.map(item => {
                              optionIndex += 1;
                              const idx = optionIndex;
                              return <button key={String(item.id)} type="button" role="option" aria-selected={category === String(item.name || "")} className={`${s.contactOption} ${categoryHighlight === idx ? s.contactOptionActive : ""}`} onMouseEnter={() => setCategoryHighlight(idx)} onClick={() => selectCategory(item)}>
                                          <span className={s.contactOptionName}>{String(item.name || "")}</span>
                                        </button>;
                            })}
                                  </div>);
                        })()}
                          </div>, document.body) : null}
                      </div>
                    </div>

                    <div className={s.equipmentField}>
                      <label className={s.equipmentFieldLabel} htmlFor="ticket-create-priority">
                        {copy.priorityLabel}<span className={s.requiredMark}>*</span>
                      </label>
                      <select data-pulse={fieldErrors.priority ? errorPulseTick : undefined} id="ticket-create-priority" className={`${s.select} ${fieldErrors.priority ? s.inputError : ""} ${fieldErrors.priority ? s.fieldErrorPulse : ""}`} value={priority} disabled={isMajorIncident} onChange={e => handlePriorityChange(e.target.value)}>
                        {copy.priorityOptions.map(item => <option key={item.key} value={item.key}>
                            {item.label}
                          </option>)}
                      </select>
                    </div>
                  </div>

                  <div className={s.equipmentField}>
                    <label className={s.equipmentFieldLabel} id="ticket-create-channel-label">
                      {copy.channelLabel}
                    </label>
                    <div className={s.channelIconBar} role="radiogroup" aria-labelledby="ticket-create-channel-label">
                      {copy.channelOptions.map(item => {
                      const channelDisabled = item.key === "whatsapp";
                      return <button key={item.key} type="button" role="radio" aria-checked={channel === item.key} aria-label={item.label} aria-disabled={channelDisabled} title={channelDisabled ? copy.channelWhatsappDisabled : item.hint || item.label} className={`${s.channelIconBtn} ${channel === item.key ? s.channelIconBtnActive : ""} ${channelDisabled ? s.channelIconBtnDisabled : ""}`} disabled={channelDisabled} onClick={() => {
                        if (channelDisabled) return;
                        setChannel(item.key);
                      }}>
                          <Icon icon={item.icon} aria-hidden />
                        </button>;
                    })}
                    </div>
                  </div>

                  <div className={s.settingsFieldRow}>
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
                        {showAssigneeDropdown && assigneeDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={assigneeListRef} className={s.contactDropdownPortal} role="listbox" aria-label={copy.assignAgentsAria} style={{
                            top: assigneeDropdownCoords.top,
                            bottom: assigneeDropdownCoords.bottom,
                            left: assigneeDropdownCoords.left,
                            width: assigneeDropdownCoords.width,
                            maxHeight: assigneeDropdownCoords.maxHeight
                          }}>
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
                        {showFollowerDropdown && followerDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={followerListRef} className={s.contactDropdownPortal} role="listbox" aria-label={copy.followerAgentsAria} style={{
                            top: followerDropdownCoords.top,
                            bottom: followerDropdownCoords.bottom,
                            left: followerDropdownCoords.left,
                            width: followerDropdownCoords.width,
                            maxHeight: followerDropdownCoords.maxHeight
                          }}>
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
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title={copy.sections.equipment} className={s.panelAllowOverflow}>
                <div className={s.equipmentPanel}>
                  <div className={s.segmentedGroup} role="radiogroup" aria-label={copy.equipmentConcernedAria}>
                    <button type="button" role="radio" aria-checked={!equipmentConcerned} className={`${s.segmentedBtn} ${!equipmentConcerned ? s.segmentedBtnActive : ""}`} onClick={() => handleEquipmentConcernedChange(false)}>
                      <Icon icon="mdi:close-circle-outline" />
                      {copy.no}
                    </button>
                    <button type="button" role="radio" aria-checked={equipmentConcerned} className={`${s.segmentedBtn} ${equipmentConcerned ? s.segmentedBtnActive : ""}`} onClick={() => handleEquipmentConcernedChange(true)}>
                      <Icon icon="mdi:desktop-classic" />
                      {copy.yes}
                    </button>
                  </div>

                  {equipmentConcerned && <div className={s.equipmentSubPanel}>
                      <div className={s.segmentedGroup} role="radiogroup" aria-label={copy.equipmentSourceAria}>
                        <button type="button" role="radio" aria-checked={equipmentSource === "veritas"} className={`${s.segmentedBtn} ${equipmentSource === "veritas" ? s.segmentedBtnActive : ""}`} onClick={() => {
                      setEquipmentSource("veritas");
                      setEquipmentBrand("");
                      setEquipmentModel("");
                      setEquipmentSerial("");
                      setFieldErrors(prev => ({
                        ...prev,
                        equipmentBrand: undefined,
                        equipmentModel: undefined,
                        equipmentSerial: undefined
                      }));
                    }}>
                          <Icon icon="mdi:database-check-outline" />
                          {copy.equipmentVeritas}
                        </button>
                        <button type="button" role="radio" aria-checked={equipmentSource === "external"} className={`${s.segmentedBtn} ${equipmentSource === "external" ? s.segmentedBtnActive : ""}`} onClick={() => {
                      setEquipmentSource("external");
                      setEquipmentId("");
                      setEquipmentSearch("");
                      setShowEquipmentDropdown(false);
                      setFieldErrors(prev => ({
                        ...prev,
                        equipmentId: undefined
                      }));
                    }}>
                          <Icon icon="mdi:package-variant-closed" />
                          {copy.equipmentExternal}
                        </button>
                      </div>

                      {equipmentSource === "veritas" ? <div className={s.equipmentField}>
                          <label className={s.equipmentFieldLabel}>
                            {copy.equipment}<span className={s.requiredMark}>*</span>
                          </label>
                          {!resolvedTicketClientId ? <p className={s.equipmentHint}>{copy.selectRequesterFirst}</p> : loadingEquipments ? <p className={s.equipmentHint}>{copy.loadingFleet}</p> : clientEquipments.length === 0 ? <p className={s.equipmentHint}>{copy.noFleetEquipment}</p> : <div className={s.linkTicketPicker} ref={equipmentDropdownRef}>
                              <div data-pulse={fieldErrors.equipmentId ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showEquipmentDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.equipmentId ? s.contactInputWrapError : ""} ${fieldErrors.equipmentId ? s.fieldErrorPulse : ""}`}>
                                <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                                <input type="text" className={s.contactInput} value={equipmentSearch} autoComplete="off" placeholder={copy.searchEquipment} aria-label={copy.equipment} aria-expanded={showEquipmentDropdown} aria-haspopup="listbox" disabled={loadingData} onChange={e => handleEquipmentSearchChange(e.target.value)} onFocus={() => {
                          if (!equipmentId) setShowEquipmentDropdown(true);
                        }} onKeyDown={e => {
                          if (!showEquipmentDropdown || filteredEquipments.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setEquipmentHighlight(h => Math.min(h + 1, filteredEquipments.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setEquipmentHighlight(h => Math.max(h - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const picked = filteredEquipments[equipmentHighlight];
                            if (picked) selectEquipment(picked);
                          } else if (e.key === "Escape") {
                            setShowEquipmentDropdown(false);
                          }
                        }} />
                              </div>
                              {showEquipmentDropdown && equipmentDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={equipmentListRef} className={s.contactDropdownPortal} role="listbox" aria-label={copy.equipment} style={{
                                  top: equipmentDropdownCoords.top,
                                  bottom: equipmentDropdownCoords.bottom,
                                  left: equipmentDropdownCoords.left,
                                  width: equipmentDropdownCoords.width,
                                  maxHeight: equipmentDropdownCoords.maxHeight
                                }}>
                                  {filteredEquipments.length === 0 ? <div className={s.contactEmpty}>{copy.noEquipmentFound}</div> : filteredEquipments.map((eq, idx) => <button key={eq.id} type="button" role="option" aria-selected={idx === equipmentHighlight} className={`${s.contactOption} ${idx === equipmentHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setEquipmentHighlight(idx)} onClick={() => selectEquipment(eq)}>
                                        <span className={s.contactOptionName}>
                                          {getEquipmentPickerLabel(eq, {
                              serialPrefix: copy.serialPrefix,
                              locale
                            })}
                                        </span>
                                      </button>)}
                                </div>, document.body) : null}
                            </div>}
                        </div> : <div className={s.equipmentExternalGrid}>
                          <div className={s.equipmentField}>
                            <label className={s.equipmentFieldLabel}>
                              {copy.brand}<span className={s.requiredMark}>*</span>
                            </label>
                            <input data-pulse={fieldErrors.equipmentBrand ? errorPulseTick : undefined} type="text" className={`${s.input} ${fieldErrors.equipmentBrand ? s.inputError : ""} ${fieldErrors.equipmentBrand ? s.fieldErrorPulse : ""}`} value={equipmentBrand} placeholder={copy.brandPlaceholder} onChange={e => {
                        setEquipmentBrand(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          equipmentBrand: undefined
                        }));
                      }} />
                          </div>
                          <div className={s.equipmentField}>
                            <label className={s.equipmentFieldLabel}>
                              {copy.model}<span className={s.requiredMark}>*</span>
                            </label>
                            <input data-pulse={fieldErrors.equipmentModel ? errorPulseTick : undefined} type="text" className={`${s.input} ${fieldErrors.equipmentModel ? s.inputError : ""} ${fieldErrors.equipmentModel ? s.fieldErrorPulse : ""}`} value={equipmentModel} placeholder={copy.modelPlaceholder} onChange={e => {
                        setEquipmentModel(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          equipmentModel: undefined
                        }));
                      }} />
                          </div>
                          <div className={`${s.equipmentField} ${s.equipmentExternalFull}`}>
                            <label className={s.equipmentFieldLabel}>
                              {copy.serialNumber}<span className={s.requiredMark}>*</span>
                            </label>
                            <input data-pulse={fieldErrors.equipmentSerial ? errorPulseTick : undefined} type="text" className={`${s.input} ${fieldErrors.equipmentSerial ? s.inputError : ""} ${fieldErrors.equipmentSerial ? s.fieldErrorPulse : ""}`} value={equipmentSerial} placeholder={copy.serialPlaceholder} onChange={e => {
                        setEquipmentSerial(e.target.value);
                        setFieldErrors(prev => ({
                          ...prev,
                          equipmentSerial: undefined
                        }));
                      }} />
                          </div>
                        </div>}
                    </div>}
                </div>
              </SectionPanel>

              <SectionPanel title={copy.sections.ticketLink} className={s.panelAllowOverflow}>
                <div className={s.linkTicketPanel}>
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
                      {!selectedContact ? <p className={s.equipmentHint}>{copy.selectRequesterFirst}</p> : loadingClientTickets ? <p className={s.equipmentHint}>{copy.loadingRequesterTickets}</p> : clientTickets.length === 0 ? <p className={s.equipmentHint}>{copy.noRequesterTickets}</p> : <>
                          <div className={s.equipmentField}>
                            <label className={s.equipmentFieldLabel} htmlFor="ticket-create-linked-ticket">
                              {copy.ticketToLink}<span className={s.requiredMark}>*</span>
                            </label>
                            <div className={s.linkTicketPicker} ref={linkedTicketDropdownRef}>
                              <div data-pulse={fieldErrors.linkedTicketId ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showLinkedTicketDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.linkedTicketId ? s.contactInputWrapError : ""} ${fieldErrors.linkedTicketId ? s.fieldErrorPulse : ""}`}>
                                <Icon icon="mdi:magnify" className={s.contactInputIcon} />
                                <input id="ticket-create-linked-ticket" className={s.contactInput} type="text" value={linkedTicketSearch} onChange={e => handleLinkedTicketSearchChange(e.target.value)} onFocus={() => {
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
                              {showLinkedTicketDropdown && linkedTicketDropdownCoords && typeof document !== "undefined" ? createPortal(<div ref={linkedTicketListRef} className={s.contactDropdownPortal} role="listbox" style={{
                                  top: linkedTicketDropdownCoords.top,
                                  bottom: linkedTicketDropdownCoords.bottom,
                                  left: linkedTicketDropdownCoords.left,
                                  width: linkedTicketDropdownCoords.width,
                                  maxHeight: linkedTicketDropdownCoords.maxHeight
                                }}>
                                  {filteredLinkableTickets.length === 0 ? <div className={s.contactEmpty}>{copy.noTicketFound}</div> : filteredLinkableTickets.map((ticket, idx) => <button key={ticket.id} type="button" role="option" aria-selected={idx === linkedTicketHighlight} className={`${s.contactOption} ${idx === linkedTicketHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setLinkedTicketHighlight(idx)} onClick={() => selectLinkedTicket(ticket)}>
                                        <span className={s.contactOptionName}>{getTicketLinkLabel(ticket)}</span>
                                        <span className={s.contactOptionMeta}>
                                          {copy.getStatusLabel(ticket.status)}
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
                                  {copy.getStatusLabel(selectedLinkedTicket.status)}
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
              </SectionPanel>
            </aside>
          </div>
        </div>
      </div>
          </div>

      {confirmModalOpen && createPortal(<div className={s.confirmOverlay} onClick={handleCloseConfirm} role="presentation">
            <div className={s.confirmShell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-create-recap-title">
              <div className={s.confirmAccentBar} aria-hidden />
              <div className={s.confirmHeader}>
                <div className={s.confirmHeaderMain}>
                  <div className={s.confirmHeaderIconWrap} aria-hidden>
                    <Icon icon="mdi:clipboard-check-outline" className={s.confirmHeaderIcon} />
                  </div>
                  <div>
                    <h2 id="ticket-create-recap-title" className={s.confirmTitle}>
                      {copy.recapTitle}
                    </h2>
                    <p className={s.confirmSubtitle}>
                      {copy.recapSubtitle}
                    </p>
                  </div>
                </div>
                <button type="button" className={s.confirmCloseBtn} onClick={handleCloseConfirm} disabled={submitting} aria-label={copy.close}>
                  <FaTimes />
                </button>
              </div>

              <div className={s.confirmBody}>
                <TicketCreateRecap title={title} description={description} type={type} isMajorIncident={isMajorIncident} priority={priority} channel={channel} category={category} selectedContact={selectedContact} clientLabel={clientLabel} agentLabel={agentLabel} filledContactSlots={filledContactSlots} equipmentSummary={equipmentSummary} linkedTicketSummary={linkedTicketSummary} preAssigneesSummary={preAssigneesSummary} preFollowersSummary={preFollowersSummary} attachmentsSummary={attachmentsSummary} copy={copy} />

                {formError && <div className={s.errorBox} role="alert">
                    <Icon icon="mdi:alert-circle-outline" className={s.errorIcon} />
                    <span>{formError}</span>
                  </div>}
              </div>

              <div className={s.confirmFooter}>
                <button type="button" className={s.recapCancelBtn} onClick={handleCloseConfirm} disabled={submitting}>
                  {copy.cancel}
                </button>
                <button type="button" className={s.recapConfirmBtn} onClick={handleConfirmCreate} disabled={submitting}>
                  <Icon icon={submitting ? "mdi:loading" : "mdi:check-bold"} className={submitting ? s.recapConfirmSpinner : undefined} />
                  {submitting ? copy.creating : copy.confirmCreate}
                </button>
              </div>
            </div>
          </div>, document.body)}

      <ContactFormModal open={contactModalOpen} initialContact={contactModalInitial} clients={clients} defaultClientId={contactModalInitial ? null : contactCreateDefaultClientId} onClose={closeContactModal} onSuccess={handleContactSaved} />
        </div>
      </div>
    </div>;
}
