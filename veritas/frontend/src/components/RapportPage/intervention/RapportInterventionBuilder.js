import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import { fetchClientGeneral } from "../../../api/clients";
import { getDownloadUrl } from "../../../api/clientFiles";
import {
  fetchMonitoringDocuments,
  isMonitoringDocumentNameTaken,
  saveMonitoringDocument,
  updateMonitoringDocument
} from "../../../api/monitoringDocuments";
import { addTicketComment, fetchTickets } from "../../../api/tickets";
import { useAppGeneralSettings, useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { interpolate } from "../../../i18n/translate";
import { getModalDropdownZIndex } from "../../../utils/dropdownPortal";
import { REPORT_TYPE_IDS } from "../reportTypeConstants";
import ConfirmModal from "../../Misc/ConfirmModal/ConfirmModal";
import { getTicketLinkLabel, getTicketLinkSearchText } from "../../TicketPage/ticketLinkUtils";
import {
  getEquipmentPickerLabel,
  getEquipmentSearchText,
  loadClientEquipments
} from "../../TicketPage/ticketEquipmentUtils";
import InterventionSaveModal from "./InterventionSaveModal";
import { uploadInterventionHtmlToClientVault } from "../../../utils/uploadReportToClientVault";
import { exportBrandedReportHtmlFromElement } from "../exportBrandedReportHtmlFromElement";
import cyberStyles from "../../CybersecuritePage/CybersecuritePage.module.css";
import shellStyles from "../RapportBuilderPlaceholder.module.css";
import formStyles from "../reportBuilderForm.module.css";
import ReportValidationLayout, {
  ReportPreviewBlock,
  reportValidationStyles as valStyles
} from "../ReportValidationLayout";
import styles from "./RapportInterventionBuilder.module.css";
import { getInterventionReportCopy } from "./interventionReportI18n";
import {
  buildDefaultInterventionData,
  buildDefaultSaveName,
  buildInterventionReportPeriod,
  createTaskItem,
  deriveMaterielFieldsFromEquipments,
  isDuplicateMonitoringSaveResult,
  mergeInterventionData,
  getInterventionStepValidationAlert,
  normalizeLinkedEquipments,
  serializeInterventionSavePayload,
  validateInterventionStep
} from "./interventionReportModel";
const TICKET_DROPDOWN_MAX_HEIGHT = 240;
const TICKET_SUGGESTION_LIMIT = 40;
const EQUIPMENT_SUGGESTION_LIMIT = 40;

function normalizeTicketList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function resolveAbsoluteUrl(pathOrUrl) {
  const value = String(pathOrUrl || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === "undefined") return value;
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function Field({ label, hint, children, full = false, required = false }) {
  return (
    <label className={`${formStyles.field} ${full ? formStyles.formGridFull : ""}`.trim()}>
      <span className={formStyles.fieldLabel}>
        {label}
        {required ? <span className={formStyles.requiredMark} aria-hidden>*</span> : null}
      </span>
      {children}
      {hint ? <span className={formStyles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

export default function ReportInterventionBuilder({
  copy: pageCopy,
  reportType,
  client,
  onBack,
  onSaved,
  initialData = null,
  documentId = null,
  documentName = ""
}) {
  const locale = useAppLocale();
  const { settings } = useAppGeneralSettings();
  const interventionCopy = useMemo(
    () => getInterventionReportCopy(pageCopy?.localeCode || locale),
    [pageCopy?.localeCode, locale]
  );
  const steps = useMemo(() => reportType?.steps || [], [reportType?.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState(() =>
    mergeInterventionData(
      buildDefaultInterventionData({
        client,
        organizationName: settings?.app_organization_name || "",
        organizationAddress: settings?.app_organization_address || "",
        copy: interventionCopy
      }),
      initialData
    )
  );
  const [saveName, setSaveName] = useState(documentName || "");
  const [saving, setSaving] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(false);
  const [clientTickets, setClientTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSearch, setTicketSearch] = useState(() => String(initialData?.numeroTicket || "").trim());
  const [ticketMenuOpen, setTicketMenuOpen] = useState(false);
  const [ticketHighlight, setTicketHighlight] = useState(0);
  const [ticketMenuStyle, setTicketMenuStyle] = useState(null);
  const [clientEquipments, setClientEquipments] = useState([]);
  const [equipmentsLoading, setEquipmentsLoading] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentMenuOpen, setEquipmentMenuOpen] = useState(false);
  const [equipmentHighlight, setEquipmentHighlight] = useState(0);
  const [equipmentMenuStyle, setEquipmentMenuStyle] = useState(null);
  const prestataireRef = useRef(null);
  const clientSignRef = useRef(null);
  const previewDocRef = useRef(null);
  const photoInputRef = useRef(null);
  const ticketPickerRef = useRef(null);
  const ticketAnchorRef = useRef(null);
  const ticketMenuRef = useRef(null);
  const equipmentPickerRef = useRef(null);
  const equipmentAnchorRef = useRef(null);
  const equipmentMenuRef = useRef(null);
  const saveNameTouchedRef = useRef(Boolean(documentName?.trim()));
  const saveNameInitializedRef = useRef(Boolean(documentName?.trim()));
  const clientLabel =
    client?.name || client?.nom || (client?.id ? pageCopy.create.getClientLabel(client.id) : "-");

  useEffect(() => {
    let cancelled = false;
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) return undefined;
    fetchClientGeneral(clientId)
      .then(generalData => {
        if (cancelled) return;
        setFormData(prev => {
          const next = { ...prev };
          if (!String(next.adresse || "").trim() && generalData?.address) {
            next.adresse = generalData.address;
          }
          const firstSite = Array.isArray(generalData?.sites) ? generalData.sites[0] : null;
          if (!String(next.adresse || "").trim() && firstSite?.address) {
            next.adresse = firstSite.address;
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) {
      setClientTickets([]);
      setTicketsLoading(false);
      return undefined;
    }
    setTicketsLoading(true);
    fetchTickets({ clientId, limit: 200, includeClosed: true, forLinking: true })
      .then(payload => {
        if (cancelled) return;
        setClientTickets(normalizeTicketList(payload));
      })
      .catch(() => {
        if (!cancelled) setClientTickets([]);
      })
      .finally(() => {
        if (!cancelled) setTicketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) {
      setClientEquipments([]);
      setEquipmentsLoading(false);
      return undefined;
    }
    setEquipmentsLoading(true);
    loadClientEquipments(clientId)
      .then(rows => {
        if (!cancelled) setClientEquipments(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setClientEquipments([]);
      })
      .finally(() => {
        if (!cancelled) setEquipmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (documentName?.trim()) {
      setSaveName(documentName);
      saveNameTouchedRef.current = true;
      saveNameInitializedRef.current = true;
      return;
    }
    if (stepIndex === 3 && !saveNameInitializedRef.current && !documentId) {
      saveNameInitializedRef.current = true;
      setSaveName(
        buildDefaultSaveName(clientLabel, interventionCopy, {
          withRandom: true
        })
      );
    }
  }, [stepIndex, clientLabel, documentName, documentId, interventionCopy]);

  useEffect(() => {
    if (stepIndex !== 2 && stepIndex !== 3) return;
    setFormData(prev => ({
      ...prev,
      signatureDate: prev.signatureDate || new Date().toISOString().split("T")[0],
      signatureLieu: prev.signatureLieu || prev.adresse || ""
    }));
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex !== 3) return undefined;
    let cancelled = false;
    fetchMonitoringDocuments()
      .then(docs => {
        if (!cancelled) setSavedDocuments(Array.isArray(docs) ? docs : []);
      })
      .catch(() => {
        if (!cancelled) setSavedDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stepIndex]);

  const nameConflict = useMemo(() => {
    if (!saveName.trim()) return false;
    return isMonitoringDocumentNameTaken(saveName, {
      excludeId: documentId,
      documents: savedDocuments
    });
  }, [saveName, savedDocuments, documentId]);

  const updateField = patch => {
    setFormData(prev => ({
      ...prev,
      ...patch
    }));
  };

  const handleChange = event => {
    const { name, value } = event.target;
    updateField({ [name]: value });
  };

  const updateTaskList = (listKey, updater) => {
    setFormData(prev => {
      const current = Array.isArray(prev[listKey]) ? prev[listKey] : [];
      const next = updater(current);
      return { ...prev, [listKey]: next };
    });
  };

  const handleTaskChange = (listKey, index, value) => {
    updateTaskList(listKey, list =>
      list.map((task, i) => (i === index ? { ...task, label: value } : task))
    );
  };

  const addTask = listKey => {
    updateTaskList(listKey, list => [...list, createTaskItem("")]);
  };

  const removeTask = (listKey, index) => {
    updateTaskList(listKey, list => {
      const next = list.filter((_, i) => i !== index);
      return next.length ? next : [createTaskItem("")];
    });
  };

  const renderTaskSection = ({
    listKey,
    title,
    hint,
    addLabel,
    placeholder,
    emptyLabel,
    removeLabel,
    required = false
  }) => {
    const tasks = Array.isArray(formData[listKey]) ? formData[listKey] : [];
    return (
      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <div className={formStyles.sectionHeadRow}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 className={formStyles.sectionTitle}>
                {title}
                {required ? <span className={formStyles.requiredMark} aria-hidden>*</span> : null}
              </h3>
              {hint ? <p className={formStyles.sectionHint}>{hint}</p> : null}
            </div>
            <button type="button" className={formStyles.addBtn} onClick={() => addTask(listKey)}>
              <Icon icon="mdi:plus" aria-hidden />
              {addLabel}
            </button>
          </div>
        </header>
        <div className={styles.taskList}>
          {tasks.length === 0 ? (
            <p className={formStyles.sectionHint}>{emptyLabel}</p>
          ) : (
            tasks.map((task, index) => (
              <div key={task.id || `${listKey}-${index}`} className={styles.taskRow}>
                <span className={styles.taskIndex} aria-hidden>
                  {index + 1}
                </span>
                <input
                  className={styles.taskInput}
                  value={task.label || ""}
                  onChange={e => handleTaskChange(listKey, index, e.target.value)}
                  placeholder={placeholder}
                  aria-label={`${placeholder} ${index + 1}`}
                />
                <button
                  type="button"
                  className={styles.taskRemove}
                  onClick={() => removeTask(listKey, index)}
                  aria-label={removeLabel}
                >
                  <Icon icon="mdi:close" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    );
  };

  const handlePhotoSelect = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      toast.error(interventionCopy.alerts.photoInvalid);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(interventionCopy.alerts.photoTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField({ photoInstallation: String(reader.result || "") });
    };
    reader.onerror = () => toast.error(interventionCopy.alerts.photoInvalid);
    reader.readAsDataURL(file);
  };

  const getSignatureDataUrl = ref => {
    const pad = ref?.current;
    if (!pad) return "";
    try {
      if (typeof pad.isEmpty === "function" && pad.isEmpty()) return "";
      if (typeof pad.toDataURL === "function") return pad.toDataURL("image/png") || "";
      const canvas = typeof pad.getCanvas === "function" ? pad.getCanvas() : null;
      return canvas?.toDataURL?.("image/png") || "";
    } catch {
      return "";
    }
  };

  const captureSignatures = () => ({
    ...formData,
    signaturePrestataire: getSignatureDataUrl(prestataireRef) || formData.signaturePrestataire,
    signatureClient: getSignatureDataUrl(clientSignRef) || formData.signatureClient,
    documentSigne: true,
    requireSignature: true
  });

  const syncSignatureToForm = () => {
    setFormData(prev => ({
      ...prev,
      signaturePrestataire: getSignatureDataUrl(prestataireRef) || prev.signaturePrestataire,
      signatureClient: getSignatureDataUrl(clientSignRef) || prev.signatureClient
    }));
  };

  const getStepAlert = (index, data = formData) =>
    getInterventionStepValidationAlert(index, data, interventionCopy.alerts) ||
    interventionCopy.alerts.stepReport;

  const goNext = () => {
    const payload = stepIndex === 2 ? captureSignatures() : formData;
    if (stepIndex === 2) setFormData(payload);
    if (!validateInterventionStep(stepIndex, payload)) {
      toast.error(getStepAlert(stepIndex, payload));
      return;
    }
    setStepIndex(value => Math.min(steps.length - 1, value + 1));
  };

  const goBack = () => setStepIndex(value => Math.max(0, value - 1));

  const linkedTicket = useMemo(() => {
    const linkedId = formData.linkedTicketId;
    if (linkedId == null || linkedId === "") return null;
    return (
      clientTickets.find(t => String(t.id) === String(linkedId)) || {
        id: linkedId,
        ticket_number: formData.numeroTicket || linkedId,
        title: ""
      }
    );
  }, [clientTickets, formData.linkedTicketId, formData.numeroTicket]);

  useEffect(() => {
    if (!linkedTicket) return;
    setTicketSearch(getTicketLinkLabel(linkedTicket));
  }, [linkedTicket]);

  const filteredTickets = useMemo(() => {
    const isLinkedLabel =
      linkedTicket && ticketSearch.trim() === getTicketLinkLabel(linkedTicket).trim();
    const q = isLinkedLabel ? "" : ticketSearch.trim().toLowerCase();
    const base = q
      ? clientTickets.filter(ticket => getTicketLinkSearchText(ticket).includes(q))
      : clientTickets;
    return base.slice(0, TICKET_SUGGESTION_LIMIT);
  }, [clientTickets, linkedTicket, ticketSearch]);

  const updateTicketMenuPosition = useCallback(() => {
    const anchor = ticketAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(TICKET_DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setTicketMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp
        ? { top: rect.top - 4, transform: "translateY(-100%)" }
        : { top: rect.bottom - 1 })
    });
  }, []);

  useLayoutEffect(() => {
    if (!ticketMenuOpen) {
      setTicketMenuStyle(null);
      return undefined;
    }
    updateTicketMenuPosition();
    return undefined;
  }, [ticketMenuOpen, updateTicketMenuPosition, filteredTickets.length]);

  useEffect(() => {
    if (!ticketMenuOpen) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (ticketPickerRef.current?.contains(target) || ticketMenuRef.current?.contains(target)) return;
      setTicketMenuOpen(false);
    };
    const onReposition = () => updateTicketMenuPosition();
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [ticketMenuOpen, updateTicketMenuPosition]);

  useEffect(() => {
    setTicketHighlight(0);
  }, [ticketSearch, ticketMenuOpen]);

  const resolveLinkedTicket = payload => {
    if (payload?.linkedTicketId != null && payload.linkedTicketId !== "") {
      const byId = clientTickets.find(t => String(t.id) === String(payload.linkedTicketId));
      if (byId) return byId;
      return {
        id: payload.linkedTicketId,
        ticket_number: payload.numeroTicket || payload.linkedTicketId,
        title: ""
      };
    }
    const number = String(payload?.numeroTicket || "").trim().replace(/^#/, "");
    if (!number) return null;
    return (
      clientTickets.find(t => {
        const candidates = [t.ticket_number, t.ticketNumber, t.reference, t.ref, t.id]
          .filter(Boolean)
          .map(v => String(v).replace(/^#/, ""));
        return candidates.includes(number);
      }) || null
    );
  };

  const selectTicketSuggestion = ticket => {
    if (!ticket) return;
    const number = String(ticket.ticket_number || ticket.ticketNumber || ticket.id || "");
    setTicketSearch(getTicketLinkLabel(ticket));
    setTicketMenuOpen(false);
    updateField({
      linkedTicketId: ticket.id,
      numeroTicket: number,
      postTicketFollowUp: formData.postTicketFollowUp !== false
    });
  };

  const handleTicketSearchChange = value => {
    setTicketSearch(value);
    setTicketMenuOpen(true);
    setTicketHighlight(0);
    const exact = clientTickets.find(t => {
      const number = String(t.ticket_number || t.ticketNumber || "").replace(/^#/, "");
      const typed = value.trim().replace(/^#/, "");
      return number && typed && number.toLowerCase() === typed.toLowerCase();
    });
    if (exact) {
      updateField({
        linkedTicketId: exact.id,
        numeroTicket: String(exact.ticket_number || exact.ticketNumber || exact.id || ""),
        postTicketFollowUp: formData.postTicketFollowUp !== false
      });
      return;
    }
    updateField({
      linkedTicketId: null,
      numeroTicket: value.trim()
    });
  };

  const clearTicketSelection = () => {
    setTicketSearch("");
    setTicketMenuOpen(false);
    updateField({ linkedTicketId: null, numeroTicket: "" });
  };

  const handleTicketSearchKeyDown = event => {
    if (!ticketMenuOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setTicketMenuOpen(true);
      return;
    }
    if (!ticketMenuOpen || filteredTickets.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTicketHighlight(h => Math.min(h + 1, filteredTickets.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setTicketHighlight(h => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectTicketSuggestion(filteredTickets[ticketHighlight]);
    } else if (event.key === "Escape") {
      setTicketMenuOpen(false);
    }
  };

  const linkedEquipmentIds = useMemo(
    () => new Set(normalizeLinkedEquipments(formData.linkedEquipments).map(item => String(item.id))),
    [formData.linkedEquipments]
  );

  const filteredEquipments = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    const available = clientEquipments.filter(eq => !linkedEquipmentIds.has(String(eq.id)));
    const base = q
      ? available.filter(eq => getEquipmentSearchText(eq, locale).includes(q))
      : available;
    return base.slice(0, EQUIPMENT_SUGGESTION_LIMIT);
  }, [clientEquipments, equipmentSearch, linkedEquipmentIds, locale]);

  const updateEquipmentMenuPosition = useCallback(() => {
    const anchor = equipmentAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(TICKET_DROPDOWN_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setEquipmentMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: getModalDropdownZIndex(),
      maxHeight,
      pointerEvents: "auto",
      ...(openUp
        ? { top: rect.top - 4, transform: "translateY(-100%)" }
        : { top: rect.bottom - 1 })
    });
  }, []);

  useLayoutEffect(() => {
    if (!equipmentMenuOpen) {
      setEquipmentMenuStyle(null);
      return undefined;
    }
    updateEquipmentMenuPosition();
    return undefined;
  }, [equipmentMenuOpen, updateEquipmentMenuPosition, filteredEquipments.length]);

  useEffect(() => {
    if (!equipmentMenuOpen) return undefined;
    const handleClickOutside = event => {
      const target = event.target;
      if (equipmentPickerRef.current?.contains(target) || equipmentMenuRef.current?.contains(target)) return;
      setEquipmentMenuOpen(false);
    };
    const onReposition = () => updateEquipmentMenuPosition();
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [equipmentMenuOpen, updateEquipmentMenuPosition]);

  useEffect(() => {
    setEquipmentHighlight(0);
  }, [equipmentSearch, equipmentMenuOpen]);

  const applyLinkedEquipments = nextList => {
    const linkedEquipments = normalizeLinkedEquipments(nextList);
    updateField({
      linkedEquipments,
      ...deriveMaterielFieldsFromEquipments(linkedEquipments)
    });
  };

  const addLinkedEquipment = equipment => {
    if (!equipment) return;
    const id = String(equipment.id);
    if (linkedEquipmentIds.has(id)) return;
    const row = {
      id,
      name: String(equipment.name || equipment.model || "").trim(),
      type: String(equipment.type || "").trim(),
      serial: String(equipment.serial || "").trim(),
      manufacturer: String(equipment.manufacturer || "").trim(),
      model: String(equipment.model || "").trim(),
      label: getEquipmentPickerLabel(equipment, { locale })
    };
    applyLinkedEquipments([...(formData.linkedEquipments || []), row]);
    setEquipmentSearch("");
    setEquipmentMenuOpen(false);
  };

  const removeLinkedEquipment = equipmentId => {
    applyLinkedEquipments(
      (formData.linkedEquipments || []).filter(item => String(item.id) !== String(equipmentId))
    );
  };

  const handleEquipmentSearchKeyDown = event => {
    if (!equipmentMenuOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setEquipmentMenuOpen(true);
      return;
    }
    if (!equipmentMenuOpen || filteredEquipments.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setEquipmentHighlight(h => Math.min(h + 1, filteredEquipments.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setEquipmentHighlight(h => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      addLinkedEquipment(filteredEquipments[equipmentHighlight]);
    } else if (event.key === "Escape") {
      setEquipmentMenuOpen(false);
    }
  };

  const interventionTypeOptions = useMemo(() => {
    const fromCopy = Array.isArray(interventionCopy?.context?.interventionTypes)
      ? interventionCopy.context.interventionTypes
      : [];
    const current = String(formData.typeIntervention || "").trim();
    if (current && !fromCopy.includes(current)) return [...fromCopy, current];
    return fromCopy;
  }, [interventionCopy?.context?.interventionTypes, formData.typeIntervention]);

  const buildInterventionHtmlBlob = async (_payload, docName) => {
    const fileName = `${docName}.html`;
    if (!previewDocRef.current) {
      throw new Error("Aperçu du rapport indisponible pour l'export HTML");
    }
    const blob = await exportBrandedReportHtmlFromElement(previewDocRef.current, {
      asBlob: true,
      fileName,
      documentTitle: docName
    });
    if (!blob) throw new Error("HTML generation failed");
    return blob;
  };

  const archiveInterventionToClientVault = async ({
    visibleToClient,
    documentName: docName,
    reportPeriod,
    payload
  }) => {
    const clientId = client?.id ?? client?.uuid;
    if (!clientId) return { skipped: true };
    try {
      const blob = await buildInterventionHtmlBlob(payload, docName);
      if (!blob) throw new Error("HTML generation failed");
      const uploaded = await uploadInterventionHtmlToClientVault({
        blob,
        fileName: docName,
        clientId,
        clientName: client?.name || client?.nom || "",
        description: reportPeriod || "",
        visibleToClient
      });
      return { success: true, file: uploaded };
    } catch (err) {
      console.error("Archivage coffre intervention:", err);
      return { success: false, error: err.message };
    }
  };

  const postTicketFollowUpComment = async ({ ticket, documentName: docName, file }) => {
    if (!ticket?.id || !file?.id) return { skipped: true };
    const downloadPath = getDownloadUrl(file.id);
    const url = resolveAbsoluteUrl(downloadPath);
    const number = String(ticket.ticket_number || ticket.ticketNumber || ticket.id || "").replace(/^#/, "");
    const htmlTemplate =
      interventionCopy.ticketFollowUp?.commentHtml ||
      "<p><strong>Rapport d'intervention généré</strong></p><p><a href=\"{url}\">{name}</a></p>";
    const content = interpolate(htmlTemplate, {
      url,
      name: docName,
      number
    });
    try {
      await addTicketComment(ticket.id, content, false);
      return { success: true, number };
    } catch (err) {
      console.error("Suivi ticket rapport intervention:", err);
      return { success: false, error: err?.message, number };
    }
  };

  const handleDownloadHtml = async () => {
    const payload = captureSignatures();
    if (!validateInterventionStep(2, payload)) {
      toast.error(getStepAlert(2, payload));
      return;
    }
    if (!previewDocRef.current) {
      toast.error("Aperçu du rapport indisponible pour l'export HTML");
      return;
    }
    const safeName = (saveName.trim() || "rapport-intervention").replace(/[^\w\- ]+/g, "");
    const fileName = `${safeName}.html`;
    try {
      await exportBrandedReportHtmlFromElement(previewDocRef.current, {
        fileName,
        documentTitle: safeName
      });
    } catch (err) {
      console.warn("HTML preview export failed:", err);
      toast.error(err?.message || "Impossible de générer le HTML à partir de l'aperçu");
    }
  };

  const handleSave = async (forceOverwrite = false) => {
    const payload = captureSignatures();
    setSaving(true);
    try {
      const { config, data } = serializeInterventionSavePayload(
        client,
        payload,
        REPORT_TYPE_IDS.INTERVENTION
      );
      const clientName = client?.name || client?.nom || "CLIENT";
      const reportPeriod = buildInterventionReportPeriod(payload);
      const result = documentId
        ? await updateMonitoringDocument(documentId, {
            name: saveName.trim(),
            client_name: clientName,
            report_period: reportPeriod,
            config,
            data
          })
        : await saveMonitoringDocument({
            name: saveName.trim(),
            client_name: clientName,
            report_period: reportPeriod,
            config,
            data,
            overwrite: forceOverwrite
          });
      if (result?.success) {
        const vaultResult = await archiveInterventionToClientVault({
          visibleToClient: saveVisibleToClient,
          documentName: saveName.trim(),
          reportPeriod,
          payload
        });
        if (vaultResult.success) {
          toast.success(
            saveVisibleToClient
              ? interventionCopy.alerts.saveSuccessVisible
              : interventionCopy.alerts.saveSuccessInternal
          );
        } else if (!vaultResult.skipped) {
          toast.warn(interventionCopy.alerts.saveVaultError);
        } else {
          toast.success(interventionCopy.alerts.saveSuccess);
        }

        const wantFollowUp = payload.postTicketFollowUp !== false;
        const ticketForFollowUp = wantFollowUp ? resolveLinkedTicket(payload) : null;
        if (wantFollowUp && ticketForFollowUp?.id && vaultResult.success && vaultResult.file?.id) {
          const followUp = await postTicketFollowUpComment({
            ticket: ticketForFollowUp,
            documentName: saveName.trim(),
            file: vaultResult.file
          });
          if (followUp.success) {
            toast.success(
              interpolate(interventionCopy.alerts.ticketFollowUpOk || "#{number}", {
                number: followUp.number
              })
            );
          } else if (!followUp.skipped) {
            toast.warn(interventionCopy.alerts.ticketFollowUpError);
          }
        }

        onSaved?.();
        onBack?.();
        return;
      }
      if (!documentId && !forceOverwrite && isDuplicateMonitoringSaveResult(result)) {
        toast.warning(interventionCopy.validation.nameExists);
        setShowOverwriteConfirm(true);
        return;
      }
      toast.error(result?.error || result?.message || interventionCopy.alerts.saveError);
    } catch (err) {
      toast.error(err?.message || interventionCopy.alerts.saveError);
    } finally {
      setSaving(false);
    }
  };

  const openSaveModal = () => {
    if (!saveName.trim()) {
      toast.error(interventionCopy.alerts.saveName);
      return;
    }
    const payload = captureSignatures();
    if (!validateInterventionStep(2, payload)) {
      toast.error(getStepAlert(2, payload));
      return;
    }
    setSaveVisibleToClient(false);
    if (payload.linkedTicketId || String(payload.numeroTicket || "").trim()) {
      updateField({ postTicketFollowUp: payload.postTicketFollowUp !== false });
    }
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    setShowSaveModal(false);
    if (!documentId && nameConflict) {
      setShowOverwriteConfirm(true);
      return;
    }
    handleSave(false);
  };

  const currentStep = steps[stepIndex] || steps[0] || pageCopy.wizard.stepBuild;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= steps.length - 1;
  const ctx = interventionCopy.context;
  const opsCopy = interventionCopy.operations;
  const rem = interventionCopy.remarks;
  const val = interventionCopy.validation;
  const orgLabel = formData.companyName || rem.providerFallback;

  const renderContextStep = () => (
    <div className={formStyles.formStack}>
      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{ctx.sectionClient}</h3>
        </header>
        <div className={formStyles.formGrid}>
          <Field label={ctx.client} required>
            <input
              className={formStyles.fieldInput}
              name="client"
              value={formData.client || ""}
              onChange={handleChange}
            />
          </Field>
          <Field label={ctx.adresse} required>
            <input
              className={formStyles.fieldInput}
              name="adresse"
              value={formData.adresse || ""}
              onChange={handleChange}
            />
          </Field>
          <Field label={ctx.numeroTicket} hint={ctx.ticketPickerHint} full>
            <div className={formStyles.ticketPickWrap} ref={ticketPickerRef}>
              <div
                ref={ticketAnchorRef}
                className={`${formStyles.ticketSearchWrap} ${ticketMenuOpen ? formStyles.ticketSearchWrapOpen : ""}`.trim()}
              >
                <Icon icon="mdi:magnify" className={formStyles.ticketSearchIcon} aria-hidden />
                <input
                  id="intervention-ticket-search"
                  className={formStyles.ticketSearchInput}
                  type="text"
                  value={ticketSearch}
                  onChange={e => handleTicketSearchChange(e.target.value)}
                  onFocus={() => !ticketsLoading && setTicketMenuOpen(true)}
                  onKeyDown={handleTicketSearchKeyDown}
                  placeholder={ticketsLoading ? ctx.ticketLoading : ctx.ticketSearchPlaceholder}
                  disabled={ticketsLoading}
                  autoComplete="off"
                  aria-label={ctx.numeroTicket}
                  aria-expanded={ticketMenuOpen}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                />
                {ticketSearch ? (
                  <button
                    type="button"
                    className={formStyles.ticketSearchClear}
                    onClick={clearTicketSelection}
                    aria-label={ctx.ticketClear}
                  >
                    <Icon icon="mdi:close" aria-hidden />
                  </button>
                ) : null}
              </div>
              {ticketMenuOpen && ticketMenuStyle && typeof document !== "undefined"
                ? createPortal(
                    <div
                      ref={ticketMenuRef}
                      className={formStyles.ticketDropdown}
                      style={ticketMenuStyle}
                      role="listbox"
                      aria-label={ctx.numeroTicket}
                    >
                      {filteredTickets.length === 0 ? (
                        <div className={formStyles.ticketDropdownEmpty}>
                          {ticketsLoading
                            ? ctx.ticketLoading
                            : !clientTickets.length
                              ? ctx.ticketEmpty
                              : ctx.ticketNoMatch}
                        </div>
                      ) : (
                        filteredTickets.map((ticket, idx) => (
                          <button
                            key={ticket.id}
                            type="button"
                            role="option"
                            aria-selected={
                              String(formData.linkedTicketId) === String(ticket.id) ||
                              idx === ticketHighlight
                            }
                            className={`${formStyles.ticketOption} ${
                              idx === ticketHighlight ? formStyles.ticketOptionActive : ""
                            } ${
                              String(formData.linkedTicketId) === String(ticket.id)
                                ? formStyles.ticketOptionSelected
                                : ""
                            }`.trim()}
                            onMouseEnter={() => setTicketHighlight(idx)}
                            onClick={() => selectTicketSuggestion(ticket)}
                          >
                            <span className={formStyles.ticketOptionLabel}>
                              {getTicketLinkLabel(ticket)}
                            </span>
                            {ticket.status ? (
                              <span className={formStyles.ticketOptionMeta}>{ticket.status}</span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>,
                    document.body
                  )
                : null}
            </div>
          </Field>
          <Field label={ctx.typeIntervention} required>
            <select
              className={formStyles.fieldSelect}
              name="typeIntervention"
              value={formData.typeIntervention || ""}
              onChange={handleChange}
            >
              <option value="">{ctx.typeInterventionPlaceholder}</option>
              {interventionTypeOptions.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{ctx.sectionEquipment}</h3>
          {ctx.sectionEquipmentHint ? (
            <p className={formStyles.sectionHint}>{ctx.sectionEquipmentHint}</p>
          ) : null}
        </header>
        <div className={formStyles.ticketPickWrap} ref={equipmentPickerRef}>
          <div
            ref={equipmentAnchorRef}
            className={`${formStyles.ticketSearchWrap} ${equipmentMenuOpen ? formStyles.ticketSearchWrapOpen : ""}`.trim()}
          >
            <Icon icon="mdi:magnify" className={formStyles.ticketSearchIcon} aria-hidden />
            <input
              id="intervention-equipment-search"
              className={formStyles.ticketSearchInput}
              type="text"
              value={equipmentSearch}
              onChange={e => {
                setEquipmentSearch(e.target.value);
                setEquipmentMenuOpen(true);
              }}
              onFocus={() => !equipmentsLoading && setEquipmentMenuOpen(true)}
              onKeyDown={handleEquipmentSearchKeyDown}
              placeholder={equipmentsLoading ? ctx.equipmentLoading : ctx.equipmentSearchPlaceholder}
              disabled={equipmentsLoading}
              autoComplete="off"
              aria-label={ctx.sectionEquipment}
              aria-expanded={equipmentMenuOpen}
              aria-haspopup="listbox"
              aria-autocomplete="list"
            />
            {equipmentSearch ? (
              <button
                type="button"
                className={formStyles.ticketSearchClear}
                onClick={() => {
                  setEquipmentSearch("");
                  setEquipmentMenuOpen(false);
                }}
                aria-label={ctx.equipmentClear}
              >
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
          {equipmentMenuOpen && equipmentMenuStyle && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={equipmentMenuRef}
                  className={formStyles.ticketDropdown}
                  style={equipmentMenuStyle}
                  role="listbox"
                  aria-label={ctx.sectionEquipment}
                >
                  {filteredEquipments.length === 0 ? (
                    <div className={formStyles.ticketDropdownEmpty}>
                      {equipmentsLoading
                        ? ctx.equipmentLoading
                        : !clientEquipments.length
                          ? ctx.equipmentEmpty
                          : ctx.equipmentNoMatch}
                    </div>
                  ) : (
                    filteredEquipments.map((equipment, idx) => (
                      <button
                        key={equipment.id}
                        type="button"
                        role="option"
                        aria-selected={idx === equipmentHighlight}
                        className={`${formStyles.ticketOption} ${
                          idx === equipmentHighlight ? formStyles.ticketOptionActive : ""
                        }`.trim()}
                        onMouseEnter={() => setEquipmentHighlight(idx)}
                        onClick={() => addLinkedEquipment(equipment)}
                      >
                        <span className={formStyles.ticketOptionLabel}>
                          {getEquipmentPickerLabel(equipment, { locale })}
                        </span>
                        {equipment.serial ? (
                          <span className={formStyles.ticketOptionMeta}>
                            {ctx.equipmentSerial}: {equipment.serial}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>,
                document.body
              )
            : null}
        </div>
        <div className={`${formStyles.listStack} ${formStyles.equipmentLinkedList}`.trim()}>
          {(formData.linkedEquipments || []).length === 0 ? (
            <p className={formStyles.sectionHint}>{ctx.equipmentLinkedEmpty}</p>
          ) : (
            (formData.linkedEquipments || []).map(item => (
              <div key={item.id} className={formStyles.equipmentLinkRow}>
                <div className={formStyles.equipmentLinkBody}>
                  <span className={formStyles.equipmentLinkLabel}>
                    {item.label || [item.type, item.name].filter(Boolean).join(" · ") || item.id}
                  </span>
                  {item.serial ? (
                    <span className={formStyles.equipmentLinkMeta}>
                      {ctx.equipmentSerial}: {item.serial}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={formStyles.iconBtn}
                  onClick={() => removeLinkedEquipment(item.id)}
                  aria-label={ctx.equipmentClear}
                  title={ctx.equipmentClear}
                >
                  <Icon icon="mdi:close" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{ctx.sectionTech}</h3>
        </header>
        <div className={formStyles.formGrid}>
          <Field label={ctx.salle}>
            <input
              className={formStyles.fieldInput}
              name="salle"
              value={formData.salle || ""}
              onChange={handleChange}
            />
          </Field>
        </div>

        <div className={formStyles.photoBlock}>
          <div className={formStyles.photoHead}>
            <span className={formStyles.fieldLabel}>{ctx.photoLabel}</span>
            <div className={formStyles.photoActions}>
              <button
                type="button"
                className={formStyles.addBtn}
                onClick={() => photoInputRef.current?.click()}
              >
                <Icon icon="mdi:camera-outline" aria-hidden />
                {formData.photoInstallation ? ctx.photoChange : ctx.photoAdd}
              </button>
              {formData.photoInstallation ? (
                <button
                  type="button"
                  className={formStyles.linkBtn}
                  onClick={() => updateField({ photoInstallation: "" })}
                >
                  {ctx.photoRemove}
                </button>
              ) : null}
            </div>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className={formStyles.srOnly}
            onChange={handlePhotoSelect}
          />
          <div className={formStyles.photoPreview}>
            {formData.photoInstallation ? (
              <img src={formData.photoInstallation} alt={ctx.photoLabel} />
            ) : (
              <span>{ctx.photoMissing}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  const renderOperationsStep = () => (
    <div className={formStyles.formStack}>
      <p className={formStyles.sectionHint}>{opsCopy.hint}</p>
      {renderTaskSection({
        listKey: "tasksDone",
        title: opsCopy.doneTitle,
        hint: opsCopy.doneHint,
        addLabel: opsCopy.addDone,
        placeholder: opsCopy.placeholderDone,
        emptyLabel: opsCopy.emptyDone,
        removeLabel: opsCopy.remove,
        required: true
      })}
      {renderTaskSection({
        listKey: "tasksTodo",
        title: opsCopy.todoTitle,
        hint: opsCopy.todoHint,
        addLabel: opsCopy.addTodo,
        placeholder: opsCopy.placeholderTodo,
        emptyLabel: opsCopy.emptyTodo,
        removeLabel: opsCopy.remove
      })}
      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{opsCopy.commentLabel}</h3>
        </header>
        <textarea
          className={formStyles.fieldTextarea}
          name="operationsComment"
          value={formData.operationsComment || ""}
          onChange={handleChange}
          placeholder={opsCopy.commentPlaceholder}
          rows={5}
          aria-label={opsCopy.commentLabel}
        />
      </section>
    </div>
  );

  const renderRemarksStep = () => (
    <div className={formStyles.formStack}>
      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{rem.title}</h3>
        </header>
        <Field label={rem.reservesClient}>
          <textarea
            className={formStyles.fieldTextarea}
            name="reservesClient"
            value={formData.reservesClient || ""}
            onChange={handleChange}
            placeholder={rem.reservesPlaceholder}
          />
        </Field>

        <div className={formStyles.softPanel}>
          <div className={formStyles.formGrid}>
            <Field label={rem.signataireNom} required>
              <input
                className={formStyles.fieldInput}
                name="signataireNom"
                value={formData.signataireNom || ""}
                onChange={handleChange}
              />
            </Field>
            <Field label={rem.signataireFonction}>
              <input
                className={formStyles.fieldInput}
                name="signataireFonction"
                value={formData.signataireFonction || ""}
                onChange={handleChange}
              />
            </Field>
          </div>
          <p className={formStyles.softPanelHint}>{rem.certifyHint}</p>
        </div>

        <div className={formStyles.formGrid}>
          <Field label={rem.place} required>
            <input
              className={formStyles.fieldInput}
              name="signatureLieu"
              value={formData.signatureLieu || ""}
              onChange={handleChange}
            />
          </Field>
          <Field label={rem.date} required>
            <input
              type="date"
              className={formStyles.fieldInput}
              name="signatureDate"
              value={formData.signatureDate || ""}
              onChange={handleChange}
            />
          </Field>
        </div>

        <div className={styles.signatureGrid}>
          <div className={styles.signaturePad}>
            <span className={formStyles.fieldLabel}>
              {rem.clientSignTitle}
              <span className={formStyles.requiredMark} aria-hidden>*</span>
            </span>
            <span className={styles.signatureSub}>{rem.nameAndSignature}</span>
            <SignatureCanvas
              ref={clientSignRef}
              penColor="currentColor"
              canvasProps={{ className: styles.signatureCanvas }}
              onEnd={syncSignatureToForm}
            />
            <button
              type="button"
              className={formStyles.linkBtn}
              onClick={() => {
                clientSignRef.current?.clear();
                updateField({ signatureClient: "" });
              }}
            >
              {rem.clear}
            </button>
          </div>
          <div className={styles.signaturePad}>
            <span className={formStyles.fieldLabel}>
              {rem.providerSignTitle.replace("{org}", orgLabel)}
            </span>
            <span className={styles.signatureSub}>{rem.nameAndSignature}</span>
            <SignatureCanvas
              ref={prestataireRef}
              penColor="currentColor"
              canvasProps={{ className: styles.signatureCanvas }}
              onEnd={syncSignatureToForm}
            />
            <button
              type="button"
              className={formStyles.linkBtn}
              onClick={() => {
                prestataireRef.current?.clear();
                updateField({ signaturePrestataire: "" });
              }}
            >
              {rem.clear}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderValidationStep = () => {
    const previewData = captureSignatures();
    const visibleDone = (previewData.tasksDone || []).filter(task => String(task?.label || "").trim());
    const visibleTodo = (previewData.tasksTodo || []).filter(task => String(task?.label || "").trim());
    return (
      <ReportValidationLayout
        previewRef={previewDocRef}
        clientName={previewData.client || clientLabel}
        periodLabel={buildInterventionReportPeriod(previewData)}
        reportType="intervention"
        reportLabel={val.title}
        actionsTitle={val.previewTitle}
        saveNameLabel={val.saveNameLabel}
        saveName={saveName}
        onSaveNameChange={value => {
          saveNameTouchedRef.current = true;
          setSaveName(value);
        }}
        nameConflict={nameConflict}
        nameConflictMessage={val.nameExists}
        downloadLabel={val.downloadHtml}
        saveLabel={val.saveLibrary}
        modifyLabel={val.modify}
        saving={saving}
        onDownload={handleDownloadHtml}
        onSave={openSaveModal}
        onModify={() => setStepIndex(0)}
      >
        <ReportPreviewBlock title={ctx.sectionClient}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{ctx.client}</strong> : {previewData.client || "-"}
            </div>
            <div>
              <strong>{ctx.adresse}</strong> : {previewData.adresse || "-"}
            </div>
            <div>
              <strong>{ctx.numeroTicket}</strong> : {previewData.numeroTicket || "-"}
            </div>
            <div>
              <strong>{ctx.typeIntervention}</strong> : {previewData.typeIntervention || "-"}
            </div>
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={ctx.sectionEquipment}>
          <div className={valStyles.previewBox}>
            {(previewData.linkedEquipments || []).length ? (
              (previewData.linkedEquipments || []).map(item => (
                <div key={item.id}>
                  {item.label || [item.type, item.name].filter(Boolean).join(" · ") || item.id}
                  {item.serial ? ` · ${ctx.equipmentSerial}: ${item.serial}` : ""}
                </div>
              ))
            ) : (
              <div>{ctx.equipmentLinkedEmpty}</div>
            )}
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={ctx.sectionTech}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{ctx.salle}</strong> : {previewData.salle || "-"}
            </div>
          </div>
          {previewData.photoInstallation ? (
            <img src={previewData.photoInstallation} alt={ctx.photoLabel} className={valStyles.previewPhoto} />
          ) : null}
        </ReportPreviewBlock>

        <ReportPreviewBlock title={val.operations}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{opsCopy.doneTitle}</strong>
              {visibleDone.length ? (
                <ul className={valStyles.previewTaskList}>
                  {visibleDone.map((task, index) => (
                    <li key={task.id || `done-${index}`}>{task.label}</li>
                  ))}
                </ul>
              ) : (
                <p className={valStyles.previewText}>{opsCopy.emptyDone}</p>
              )}
            </div>
            <div>
              <strong>{opsCopy.todoTitle}</strong>
              {visibleTodo.length ? (
                <ul className={valStyles.previewTaskList}>
                  {visibleTodo.map((task, index) => (
                    <li key={task.id || `todo-${index}`}>{task.label}</li>
                  ))}
                </ul>
              ) : (
                <p className={valStyles.previewText}>{opsCopy.emptyTodo}</p>
              )}
            </div>
            {previewData.operationsComment ? (
              <div>
                <strong>{opsCopy.commentLabel}</strong>
                <p className={valStyles.previewText}>{previewData.operationsComment}</p>
              </div>
            ) : null}
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={val.remarks}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{rem.reservesClient}</strong> {previewData.reservesClient || "-"}
            </div>
            <div>
              <strong>{rem.signataireNom}</strong> : {previewData.signataireNom || "-"}
              {previewData.signataireFonction ? ` · ${previewData.signataireFonction}` : ""}
            </div>
            <div>
              <strong>{rem.place}</strong> : {previewData.signatureLieu || "-"} · <strong>{rem.date}</strong> :{" "}
              {previewData.signatureDate || "-"}
            </div>
          </div>
          <div className={valStyles.previewSignatureGrid}>
            <div className={valStyles.previewSignatureBox}>
              <span className={valStyles.fieldLabel}>{rem.clientSignTitle}</span>
              {previewData.signatureClient ? (
                <img
                  src={previewData.signatureClient}
                  alt={rem.clientSignTitle}
                  className={valStyles.previewSignatureImage}
                />
              ) : (
                <div className={valStyles.previewSignatureEmpty}>-</div>
              )}
            </div>
            <div className={valStyles.previewSignatureBox}>
              <span className={valStyles.fieldLabel}>{rem.providerSignTitle.replace("{org}", orgLabel)}</span>
              {previewData.signaturePrestataire ? (
                <img
                  src={previewData.signaturePrestataire}
                  alt={orgLabel}
                  className={valStyles.previewSignatureImage}
                />
              ) : (
                <div className={valStyles.previewSignatureEmpty}>-</div>
              )}
            </div>
          </div>
        </ReportPreviewBlock>
      </ReportValidationLayout>
    );
  };

  const renderStepContent = () => {
    if (stepIndex === 0) return renderContextStep();
    if (stepIndex === 1) return renderOperationsStep();
    if (stepIndex === 2) return renderRemarksStep();
    return renderValidationStep();
  };

  return (
    <div className={cyberStyles.mspLayout}>
      <div className={`${cyberStyles.mspMain} ${styles.builderMain}`}>
        <div className={shellStyles.shell}>
          <div className={shellStyles.builderToolbar} data-guide="report-intervention-hero">
            <div className={shellStyles.builderToolbarMeta}>
              <h1 className={shellStyles.builderToolbarTitle}>{reportType?.title || val.title}</h1>
              <p className={shellStyles.builderToolbarSubtitle}>
                {[clientLabel, reportType?.description].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className={shellStyles.heroActions}>
              <button type="button" className={shellStyles.heroBtn} onClick={onBack}>
                <Icon icon="mdi:arrow-left" aria-hidden />
                {pageCopy.wizard.backToSelection}
              </button>
            </div>
          </div>

          <div className={shellStyles.layout}>
            <aside className={shellStyles.stepNav} aria-label={pageCopy.wizard.stepNavAria}>
              {steps.map((label, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;
                const canJump =
                  index < stepIndex ||
                  (index > stepIndex &&
                    Array.from({ length: index }).every((_, i) =>
                      validateInterventionStep(i, formData)
                    ));
                return (
                  <button
                    key={label}
                    type="button"
                    className={`${shellStyles.stepNavItem} ${isActive ? shellStyles.stepNavItemActive : ""} ${isDone ? shellStyles.stepNavItemDone : ""}`}
                    onClick={() => {
                      if (canJump || index <= stepIndex) setStepIndex(index);
                    }}
                    disabled={index > stepIndex && !canJump}
                  >
                    <span className={shellStyles.stepNavIndex}>{index + 1}</span>
                    <span className={shellStyles.stepNavLabel}>{label}</span>
                  </button>
                );
              })}
            </aside>

            <section className={shellStyles.stepPanel}>
              <div className={shellStyles.stepPanelHead}>
                <h2 className={shellStyles.stepPanelTitle}>{currentStep}</h2>
                <span className={shellStyles.stepPanelMeta}>
                  {pageCopy.wizard.formatStepOf(stepIndex + 1, steps.length)}
                </span>
              </div>

              <div className={styles.formBody}>{renderStepContent()}</div>

              {stepIndex < 3 ? (
                <div className={shellStyles.stepActions}>
                  <button
                    type="button"
                    className={shellStyles.secondaryBtn}
                    disabled={isFirst}
                    onClick={goBack}
                  >
                    <Icon icon="mdi:arrow-left" aria-hidden />
                    {pageCopy.wizard.back}
                  </button>
                  <button type="button" className={shellStyles.primaryBtn} onClick={goNext}>
                    {isLast ? val.finish : pageCopy.wizard.continue}
                    <Icon icon="mdi:arrow-right" aria-hidden />
                  </button>
                </div>
              ) : (
                <div className={shellStyles.stepActions}>
                  <button type="button" className={shellStyles.secondaryBtn} onClick={onBack}>
                    {val.finish}
                  </button>
                </div>
              )}
            </section>
          </div>

          <ConfirmModal
            open={showOverwriteConfirm}
            title={interventionCopy.alerts.overwriteTitle}
            message={interventionCopy.alerts.overwriteMessage}
            confirmLabel={interventionCopy.alerts.overwriteConfirm}
            cancelLabel={interventionCopy.alerts.overwriteCancel}
            variant="danger"
            loading={saving}
            onConfirm={() => {
              setShowOverwriteConfirm(false);
              handleSave(true);
            }}
            onClose={() => {
              if (!saving) setShowOverwriteConfirm(false);
            }}
          />

          <InterventionSaveModal
            open={showSaveModal}
            copy={interventionCopy.saveModal}
            clientLabel={clientLabel}
            documentName={saveName}
            visibleToClient={saveVisibleToClient}
            onVisibleToClientChange={setSaveVisibleToClient}
            linkedTicket={linkedTicket}
            postTicketFollowUp={formData.postTicketFollowUp !== false}
            onPostTicketFollowUpChange={value => updateField({ postTicketFollowUp: Boolean(value) })}
            saving={saving}
            onClose={() => !saving && setShowSaveModal(false)}
            onConfirm={confirmSave}
          />
        </div>
      </div>
    </div>
  );
}
