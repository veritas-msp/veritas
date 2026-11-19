import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import { fetchClientGeneral } from "../../../api/clients";
import { deleteClientFile, getDownloadUrl } from "../../../api/clientFiles";
import {
  fetchMonitoringDocuments,
  isMonitoringDocumentNameTaken,
  saveMonitoringDocument,
  updateMonitoringDocument
} from "../../../api/monitoringDocuments";
import { addTicketComment, fetchTickets } from "../../../api/tickets";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useAppGeneralSettings, useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { interpolate } from "../../../i18n/translate";
import { getModalDropdownZIndex } from "../../../utils/dropdownPortal";
import { uploadReportPdfToClientVault } from "../../../utils/uploadReportToClientVault";
import { REPORT_TYPE_IDS } from "../reportTypeConstants";
import ConfirmModal from "../../Misc/ConfirmModal/ConfirmModal";
import { getTicketLinkLabel, getTicketLinkSearchText } from "../../TicketPage/ticketLinkUtils";
import InterventionSaveModal from "./InterventionSaveModal";
import { exportInterventionPdfFromElement } from "./exportInterventionPdf";
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
  createMovementItem,
  createOperationItem,
  createPhotoItem,
  deriveSousContratFromClient,
  isDuplicateMonitoringSaveResult,
  mergeInterventionData,
  getInterventionStepValidationAlert,
  resolveTechnicianName,
  serializeInterventionSavePayload,
  validateInterventionStep
} from "./interventionReportModel";

const TICKET_DROPDOWN_MAX_HEIGHT = 240;
const TICKET_SUGGESTION_LIMIT = 40;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_PHOTOS = 8;

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

function operationStatusLabel(status, opsCopy) {
  if (status === "ok") return opsCopy.statusOk;
  if (status === "pending") return opsCopy.statusPending;
  if (status === "ko") return opsCopy.statusKo;
  return "—";
}

function movementOperationLabel(operation, matCopy) {
  if (operation === "depot") return matCopy.depot;
  if (operation === "recuperation") return matCopy.recuperation;
  return "—";
}

export default function ReportInterventionBuilder({
  copy: pageCopy,
  reportType,
  client,
  onBack,
  onSaved,
  initialData = null,
  documentId = null,
  documentName = "",
  initialVaultFileId = null,
  initialVisibleToClient = false
}) {
  const locale = useAppLocale();
  const { settings } = useAppGeneralSettings();
  const { user } = useAuthContext() || {};
  const technicianName = useMemo(() => resolveTechnicianName(user), [user]);
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
        technicianName,
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
  const [saveVisibleToClient, setSaveVisibleToClient] = useState(Boolean(initialVisibleToClient));
  const [vaultFileId, setVaultFileId] = useState(initialVaultFileId || null);
  const [clientTickets, setClientTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSearch, setTicketSearch] = useState(() => String(initialData?.numeroTicket || "").trim());
  const [ticketMenuOpen, setTicketMenuOpen] = useState(false);
  const [ticketHighlight, setTicketHighlight] = useState(0);
  const [ticketMenuStyle, setTicketMenuStyle] = useState(null);
  const prestataireRef = useRef(null);
  const clientSignRef = useRef(null);
  const previewDocRef = useRef(null);
  const photoInputRef = useRef(null);
  const ticketPickerRef = useRef(null);
  const ticketAnchorRef = useRef(null);
  const ticketMenuRef = useRef(null);
  const saveNameTouchedRef = useRef(Boolean(documentName?.trim()));
  const saveNameInitializedRef = useRef(Boolean(documentName?.trim()));
  const clientLabel =
    client?.name || client?.nom || (client?.id ? pageCopy.create.getClientLabel(client.id) : "-");

  useEffect(() => {
    if (!technicianName) return;
    setFormData(prev => {
      if (String(prev.technicien || "").trim()) return prev;
      return { ...prev, technicien: technicianName };
    });
  }, [technicianName]);

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
          if (typeof next.sousContrat !== "boolean") {
            const derived = deriveSousContratFromClient({ ...client, ...generalData });
            if (typeof derived === "boolean") next.sousContrat = derived;
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

  const updateList = (listKey, updater) => {
    setFormData(prev => {
      const current = Array.isArray(prev[listKey]) ? prev[listKey] : [];
      return { ...prev, [listKey]: updater(current) };
    });
  };

  const handleOperationChange = (index, patch) => {
    updateList("operations", list =>
      list.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.description != null) {
          next.label = String(patch.description);
        }
        return next;
      })
    );
  };

  const addOperation = () => {
    updateList("operations", list => [...list, createOperationItem()]);
  };

  const removeOperation = index => {
    updateList("operations", list => {
      const next = list.filter((_, i) => i !== index);
      return next.length ? next : [createOperationItem()];
    });
  };

  const handleMovementChange = (index, patch) => {
    updateList("mouvements", list =>
      list.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const addMovement = () => {
    updateList("mouvements", list => [...list, createMovementItem()]);
  };

  const removeMovement = index => {
    updateList("mouvements", list => {
      const next = list.filter((_, i) => i !== index);
      return next.length ? next : [createMovementItem()];
    });
  };

  const handlePhotoSelect = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const current = Array.isArray(formData.photos) ? formData.photos : [];
    const remaining = MAX_PHOTOS - current.length;
    if (remaining <= 0) {
      toast.error(interventionCopy.alerts.photoLimit);
      return;
    }

    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(interventionCopy.alerts.photoLimit);
    }

    const readers = accepted.map(
      file =>
        new Promise(resolve => {
          if (!String(file.type || "").startsWith("image/")) {
            toast.error(interventionCopy.alerts.photoInvalid);
            resolve(null);
            return;
          }
          if (file.size > MAX_PHOTO_BYTES) {
            toast.error(interventionCopy.alerts.photoTooLarge);
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            resolve(createPhotoItem(String(reader.result || ""), file.name || ""));
          };
          reader.onerror = () => {
            toast.error(interventionCopy.alerts.photoInvalid);
            resolve(null);
          };
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then(items => {
      const valid = items.filter(Boolean);
      if (!valid.length) return;
      setFormData(prev => {
        const photos = [...(Array.isArray(prev.photos) ? prev.photos : []), ...valid].slice(
          0,
          MAX_PHOTOS
        );
        return {
          ...prev,
          photos,
          photoInstallation: photos[0]?.dataUrl || ""
        };
      });
    });
  };

  const removePhoto = photoId => {
    setFormData(prev => {
      const photos = (Array.isArray(prev.photos) ? prev.photos : []).filter(
        item => String(item.id) !== String(photoId)
      );
      return {
        ...prev,
        photos,
        photoInstallation: photos[0]?.dataUrl || ""
      };
    });
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

  const interventionTypeOptions = useMemo(() => {
    const fromCopy = Array.isArray(interventionCopy?.context?.interventionTypes)
      ? interventionCopy.context.interventionTypes
      : [];
    const current = String(formData.typeIntervention || "").trim();
    if (current && !fromCopy.includes(current)) return [...fromCopy, current];
    return fromCopy;
  }, [interventionCopy?.context?.interventionTypes, formData.typeIntervention]);

  const buildInterventionPdfBlob = async (_payload, docName) => {
    const fileName = `${docName}.pdf`;
    if (!previewDocRef.current) {
      throw new Error("Aperçu du rapport indisponible pour l'export PDF");
    }
    const blob = await exportInterventionPdfFromElement(previewDocRef.current, {
      asBlob: true,
      fileName,
      documentTitle: docName
    });
    if (!blob) throw new Error("PDF generation failed");
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
      const blob = await buildInterventionPdfBlob(payload, docName);
      if (!blob) throw new Error("PDF generation failed");
      if (vaultFileId) {
        try {
          await deleteClientFile(vaultFileId);
        } catch (err) {
          console.warn("Impossible de supprimer l'ancien PDF coffre:", err);
        }
      }
      const uploaded = await uploadReportPdfToClientVault({
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

  const handleDownloadPdf = async () => {
    const payload = captureSignatures();
    if (!validateInterventionStep(2, payload)) {
      toast.error(getStepAlert(2, payload));
      return;
    }
    if (!previewDocRef.current) {
      toast.error("Aperçu du rapport indisponible pour l'export PDF");
      return;
    }
    const safeName = (saveName.trim() || "rapport-intervention").replace(/[^\w\- ]+/g, "");
    const fileName = `${safeName}.pdf`;
    try {
      await exportInterventionPdfFromElement(previewDocRef.current, {
        fileName,
        documentTitle: safeName
      });
    } catch (err) {
      console.warn("PDF preview export failed:", err);
      toast.error(err?.message || "Impossible de générer le PDF à partir de l'aperçu");
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
      const configWithVault = {
        ...config,
        vaultFileId: vaultFileId || null,
        visibleToClient: Boolean(saveVisibleToClient)
      };
      const clientName = client?.name || client?.nom || "CLIENT";
      const reportPeriod = buildInterventionReportPeriod(payload);
      const result = documentId
        ? await updateMonitoringDocument(documentId, {
            name: saveName.trim(),
            client_name: clientName,
            report_period: reportPeriod,
            config: configWithVault,
            data
          })
        : await saveMonitoringDocument({
            name: saveName.trim(),
            client_name: clientName,
            report_period: reportPeriod,
            config: configWithVault,
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
        if (vaultResult.success && vaultResult.file?.id) {
          setVaultFileId(vaultResult.file.id);
          const nextDocId = documentId || result.id;
          if (nextDocId) {
            await updateMonitoringDocument(nextDocId, {
              name: saveName.trim(),
              client_name: clientName,
              report_period: reportPeriod,
              config: {
                ...configWithVault,
                vaultFileId: vaultResult.file.id
              },
              data
            });
          }
        }
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
  const matCopy = interventionCopy.material;
  const photosCopy = interventionCopy.photos;
  const rem = interventionCopy.remarks;
  const val = interventionCopy.validation;
  const photos = Array.isArray(formData.photos) ? formData.photos : [];
  const operations = Array.isArray(formData.operations) ? formData.operations : [];
  const mouvements = Array.isArray(formData.mouvements) ? formData.mouvements : [];

  const renderContextStep = () => (
    <div className={formStyles.formStack}>
      <section className={`${formStyles.sectionCard} ${formStyles.sectionCardFill}`.trim()}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{ctx.sectionClient}</h3>
        </header>
        <div className={formStyles.formGrid}>
          <Field label={ctx.numeroClient}>
            <input
              className={formStyles.fieldInput}
              name="numeroClient"
              value={formData.numeroClient || ""}
              onChange={handleChange}
            />
          </Field>
          <Field label={ctx.client} required>
            <input
              className={formStyles.fieldInput}
              name="client"
              value={formData.client || ""}
              onChange={handleChange}
            />
          </Field>
          <Field label={ctx.typeIntervention} required full>
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

      <section className={`${formStyles.sectionCard} ${formStyles.sectionCardFill}`.trim()}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{ctx.sectionDetails}</h3>
        </header>
        <div className={formStyles.formGrid}>
          <Field label={ctx.technicien} required>
            <input
              className={formStyles.fieldInput}
              name="technicien"
              value={formData.technicien || ""}
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
        </div>

        <div className={styles.dateRangeRow}>
          <Field label={ctx.dateFrom} required>
            <input
              type="date"
              className={formStyles.fieldInput}
              name="dateDebut"
              value={formData.dateDebut || ""}
              onChange={handleChange}
            />
          </Field>
          <Field label={ctx.dateTo} required>
            <input
              type="date"
              className={formStyles.fieldInput}
              name="dateFin"
              value={formData.dateFin || ""}
              onChange={handleChange}
            />
          </Field>
        </div>

        <div className={styles.contractToggle} role="group" aria-label={ctx.sousContrat}>
          <span className={formStyles.fieldLabel}>{ctx.sousContrat}</span>
          <div className={styles.contractToggleButtons}>
            <button
              type="button"
              className={`${styles.contractToggleBtn} ${
                formData.sousContrat === true ? styles.contractToggleBtnActive : ""
              }`.trim()}
              aria-pressed={formData.sousContrat === true}
              onClick={() => updateField({ sousContrat: true })}
            >
              {ctx.sousContratOui}
            </button>
            <button
              type="button"
              className={`${styles.contractToggleBtn} ${
                formData.sousContrat === false ? styles.contractToggleBtnActive : ""
              }`.trim()}
              aria-pressed={formData.sousContrat === false}
              onClick={() => updateField({ sousContrat: false })}
            >
              {ctx.sousContratNon}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderOperationsStep = () => (
    <div className={formStyles.formStack}>
      <div className={styles.opsMatColumns}>
        <section className={`${formStyles.sectionCard} ${formStyles.sectionCardFill} ${styles.opsMatPanel}`.trim()}>
          <header className={formStyles.sectionHead}>
            <div className={formStyles.sectionHeadRow}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className={formStyles.sectionTitle}>
                  {opsCopy.title}
                  <span className={formStyles.requiredMark} aria-hidden>
                    *
                  </span>
                </h3>
                {opsCopy.hint ? <p className={formStyles.sectionHint}>{opsCopy.hint}</p> : null}
              </div>
              <button type="button" className={formStyles.addBtn} onClick={addOperation}>
                <Icon icon="mdi:plus" aria-hidden />
                {opsCopy.add}
              </button>
            </div>
          </header>
          <div className={styles.tableScroll}>
            <div className={styles.operationsTable} role="table" aria-label={opsCopy.title}>
              <div className={styles.operationsHead} role="row">
                <span className={styles.operationsHeadLabel} role="columnheader">
                  {opsCopy.description}
                </span>
                <span className={styles.operationsHeadLabel} role="columnheader">
                  {opsCopy.observations}
                </span>
                <span className={`${styles.operationsHeadStatus} ${styles.statusOk}`} role="columnheader" title={opsCopy.statusOk}>
                  {opsCopy.statusOk}
                </span>
                <span className={styles.operationsHeadStatus} role="columnheader" title={opsCopy.statusPending}>
                  Att.
                </span>
                <span className={`${styles.operationsHeadStatus} ${styles.statusPb}`} role="columnheader" title={opsCopy.statusKo}>
                  {opsCopy.statusKo}
                </span>
                <span className={styles.operationsHeadStatus} role="columnheader" aria-hidden>
                  {" "}
                </span>
              </div>
              {operations.length === 0 ? (
                <p className={styles.tableEmpty}>{opsCopy.empty}</p>
              ) : (
                operations.map((op, index) => (
                  <div key={op.id || `op-${index}`} className={styles.operationsRow} role="row">
                    <input
                      className={styles.movementCellInput}
                      value={op.description || ""}
                      onChange={e => handleOperationChange(index, { description: e.target.value })}
                      placeholder={opsCopy.descriptionPlaceholder}
                      aria-label={`${opsCopy.description} ${index + 1}`}
                    />
                    <input
                      className={styles.movementCellInput}
                      value={op.observations || ""}
                      onChange={e => handleOperationChange(index, { observations: e.target.value })}
                      placeholder={opsCopy.observationsPlaceholder}
                      aria-label={`${opsCopy.observations} ${index + 1}`}
                    />
                    {[
                      { value: "ok", activeClass: styles.statusBtnActiveOk },
                      { value: "pending", activeClass: styles.statusBtnActivePending },
                      { value: "ko", activeClass: styles.statusBtnActivePb }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.statusBtn} ${
                          op.status === option.value ? option.activeClass : ""
                        }`.trim()}
                        aria-pressed={op.status === option.value}
                        aria-label={
                          option.value === "ok"
                            ? opsCopy.statusOk
                            : option.value === "pending"
                              ? opsCopy.statusPending
                              : opsCopy.statusKo
                        }
                        onClick={() =>
                          handleOperationChange(index, {
                            status: op.status === option.value ? "" : option.value
                          })
                        }
                      >
                        {option.value === "ok" ? "OK" : option.value === "pending" ? "Att." : "KO"}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={styles.movementRowRemove}
                      onClick={() => removeOperation(index)}
                      aria-label={opsCopy.remove}
                    >
                      <Icon icon="mdi:close" aria-hidden />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className={`${formStyles.sectionCard} ${formStyles.sectionCardFill} ${styles.opsMatPanel}`.trim()}>
          <header className={formStyles.sectionHead}>
            <div className={formStyles.sectionHeadRow}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className={formStyles.sectionTitle}>{matCopy.title}</h3>
                {matCopy.hint ? <p className={formStyles.sectionHint}>{matCopy.hint}</p> : null}
              </div>
              <button type="button" className={formStyles.addBtn} onClick={addMovement}>
                <Icon icon="mdi:plus" aria-hidden />
                {matCopy.add}
              </button>
            </div>
          </header>
          <div className={styles.tableScroll}>
            <div className={`${styles.movementTable} ${styles.materialTable}`} role="table" aria-label={matCopy.title}>
              <div className={styles.materialTableHead} role="row">
                <span role="columnheader">{matCopy.qte}</span>
                <span role="columnheader">{matCopy.reference}</span>
                <span role="columnheader">{matCopy.serial}</span>
                <span role="columnheader">{matCopy.depot}</span>
                <span role="columnheader">{matCopy.recuperation}</span>
                <span role="columnheader" aria-hidden>
                  {" "}
                </span>
              </div>
              {mouvements.length === 0 ? (
                <p className={styles.tableEmpty}>{matCopy.empty}</p>
              ) : (
                mouvements.map((mov, index) => (
                  <div key={mov.id || `mov-${index}`} className={styles.materialRow} role="row">
                    <input
                      className={styles.movementCellInput}
                      inputMode="numeric"
                      value={mov.qte || ""}
                      onChange={e => handleMovementChange(index, { qte: e.target.value })}
                      aria-label={`${matCopy.qte} ${index + 1}`}
                    />
                    <input
                      className={styles.movementCellInput}
                      value={mov.reference || ""}
                      onChange={e => handleMovementChange(index, { reference: e.target.value })}
                      aria-label={`${matCopy.reference} ${index + 1}`}
                    />
                    <input
                      className={styles.movementCellInput}
                      value={mov.serial || ""}
                      onChange={e => handleMovementChange(index, { serial: e.target.value })}
                      aria-label={`${matCopy.serial} ${index + 1}`}
                    />
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${
                        mov.operation === "depot" ? styles.statusBtnActiveOk : ""
                      }`.trim()}
                      aria-pressed={mov.operation === "depot"}
                      onClick={() =>
                        handleMovementChange(index, {
                          operation: mov.operation === "depot" ? "" : "depot"
                        })
                      }
                    >
                      {matCopy.depot}
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${
                        mov.operation === "recuperation" ? styles.statusBtnActivePb : ""
                      }`.trim()}
                      aria-pressed={mov.operation === "recuperation"}
                      onClick={() =>
                        handleMovementChange(index, {
                          operation: mov.operation === "recuperation" ? "" : "recuperation"
                        })
                      }
                    >
                      {matCopy.recuperation}
                    </button>
                    <button
                      type="button"
                      className={styles.movementRowRemove}
                      onClick={() => removeMovement(index)}
                      aria-label={matCopy.remove}
                    >
                      <Icon icon="mdi:close" aria-hidden />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section className={formStyles.sectionCard}>
        <header className={formStyles.sectionHead}>
          <div className={formStyles.sectionHeadRow}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 className={formStyles.sectionTitle}>{photosCopy.title}</h3>
              {photosCopy.hint ? <p className={formStyles.sectionHint}>{photosCopy.hint}</p> : null}
            </div>
            <button
              type="button"
              className={formStyles.addBtn}
              onClick={() => photoInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
            >
              <Icon icon="mdi:camera-outline" aria-hidden />
              {photosCopy.add}
            </button>
          </div>
        </header>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className={formStyles.srOnly}
          onChange={handlePhotoSelect}
        />
        {photos.length === 0 ? (
          <p className={formStyles.sectionHint}>{photosCopy.missing}</p>
        ) : (
          <>
            <p className={formStyles.sectionHint}>
              {interpolate(photosCopy.count || "{count}", { count: photos.length })}
            </p>
            <div className={styles.photoGrid}>
              {photos.map(photo => (
                <div key={photo.id} className={styles.photoTile}>
                  <img src={photo.dataUrl} alt={photo.name || photosCopy.title} />
                  <button
                    type="button"
                    className={styles.photoRemove}
                    onClick={() => removePhoto(photo.id)}
                    aria-label={photosCopy.remove}
                  >
                    <Icon icon="mdi:close" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );

  const renderRemarksStep = () => (
    <div className={formStyles.formStack}>
      <section className={`${formStyles.sectionCard} ${formStyles.sectionCardFill} ${styles.remarksFill}`.trim()}>
        <header className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{rem.title}</h3>
        </header>
        <Field label={rem.reservesClient}>
          <textarea
            className={`${formStyles.fieldTextarea} ${styles.remarksTextarea}`.trim()}
            name="reservesClient"
            value={formData.reservesClient || ""}
            onChange={handleChange}
            placeholder={rem.reservesPlaceholder}
          />
        </Field>

        <div className={formStyles.softPanel}>
          <p className={formStyles.softPanelHint}>{rem.certifyHint}</p>
        </div>

        <div className={styles.signatureGrid}>
          <div className={styles.signaturePad}>
            <span className={formStyles.fieldLabel}>
              {rem.providerSignTitle}
              <span className={formStyles.requiredMark} aria-hidden>
                *
              </span>
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
          <div className={styles.signaturePad}>
            <span className={formStyles.fieldLabel}>
              {rem.clientSignTitle}
              <span className={formStyles.requiredMark} aria-hidden>
                *
              </span>
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
        </div>
      </section>
    </div>
  );

  const renderValidationStep = () => {
    const previewData = captureSignatures();
    const previewOps = (previewData.operations || []).filter(op =>
      String(op?.description || op?.label || "").trim()
    );
    const previewMovements = (previewData.mouvements || []).filter(
      mov =>
        String(mov?.reference || "").trim() ||
        String(mov?.serial || "").trim() ||
        mov?.operation
    );
    const previewPhotos = Array.isArray(previewData.photos) ? previewData.photos : [];
    const previewSousContrat =
      previewData.sousContrat === true
        ? ctx.sousContratOui
        : previewData.sousContrat === false
          ? ctx.sousContratNon
          : ctx.sousContratUnknown;

    return (
      <ReportValidationLayout
        previewRef={previewDocRef}
        previewClassName={styles.previewLandscape}
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
        downloadLabel={val.downloadPdf || val.downloadHtml}
        saveLabel={val.saveLibrary}
        modifyLabel={val.modify}
        saving={saving}
        onDownload={handleDownloadPdf}
        onSave={openSaveModal}
        onModify={() => setStepIndex(0)}
      >
        <ReportPreviewBlock title={val.details || ctx.sectionDetails}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{ctx.numeroClient}</strong> : {previewData.numeroClient || "—"}
            </div>
            <div>
              <strong>{ctx.client}</strong> : {previewData.client || "—"}
            </div>
            <div>
              <strong>{ctx.typeIntervention}</strong> : {previewData.typeIntervention || "—"}
            </div>
            <div>
              <strong>{ctx.technicien}</strong> : {previewData.technicien || "—"}
            </div>
            <div>
              <strong>{ctx.numeroTicket}</strong> : {previewData.numeroTicket || "—"}
            </div>
            <div>
              <strong>{ctx.dateRange}</strong> :{" "}
              {previewData.dateDebut || "—"}
              {previewData.dateFin && previewData.dateFin !== previewData.dateDebut
                ? ` → ${previewData.dateFin}`
                : ""}
            </div>
            <div>
              <strong>{ctx.sousContrat}</strong> : {previewSousContrat}
            </div>
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={val.operations}>
          <div className={valStyles.previewBox}>
            {previewOps.length ? (
              <ul className={valStyles.previewTaskList}>
                {previewOps.map((op, index) => (
                  <li key={op.id || `preview-op-${index}`}>
                    <strong>{op.description || op.label}</strong>
                    {op.status ? ` · ${operationStatusLabel(op.status, opsCopy)}` : ""}
                    {op.observations ? ` — ${op.observations}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={valStyles.previewText}>{opsCopy.empty}</p>
            )}
          </div>
        </ReportPreviewBlock>

        <ReportPreviewBlock title={val.material}>
          <div className={valStyles.previewBox}>
            {previewMovements.length ? (
              <ul className={valStyles.previewTaskList}>
                {previewMovements.map((mov, index) => (
                  <li key={mov.id || `preview-mov-${index}`}>
                    {[
                      mov.qte ? `${matCopy.qte}: ${mov.qte}` : null,
                      mov.reference || null,
                      mov.serial ? `${matCopy.serial}: ${mov.serial}` : null,
                      movementOperationLabel(mov.operation, matCopy)
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={valStyles.previewText}>{matCopy.empty}</p>
            )}
          </div>
        </ReportPreviewBlock>

        {previewPhotos.length ? (
          <ReportPreviewBlock title={val.photos}>
            <div className={styles.previewPhotoGrid}>
              {previewPhotos.map(photo => (
                <img
                  key={photo.id}
                  src={photo.dataUrl}
                  alt={photo.name || val.photos}
                  className={valStyles.previewPhoto}
                />
              ))}
            </div>
          </ReportPreviewBlock>
        ) : null}

        <ReportPreviewBlock title={val.remarks}>
          <div className={valStyles.previewBox}>
            <div>
              <strong>{rem.reservesClient}</strong> {previewData.reservesClient || "—"}
            </div>
            <p className={valStyles.previewText}>{rem.certifyHint}</p>
          </div>
          <div className={valStyles.previewSignatureGrid}>
            <div className={valStyles.previewSignatureBox}>
              <span className={valStyles.fieldLabel}>{rem.providerSignTitle}</span>
              {previewData.signaturePrestataire ? (
                <img
                  src={previewData.signaturePrestataire}
                  alt={rem.providerSignTitle}
                  className={valStyles.previewSignatureImage}
                />
              ) : (
                <div className={valStyles.previewSignatureEmpty}>—</div>
              )}
            </div>
            <div className={valStyles.previewSignatureBox}>
              <span className={valStyles.fieldLabel}>{rem.clientSignTitle}</span>
              {previewData.signatureClient ? (
                <img
                  src={previewData.signatureClient}
                  alt={rem.clientSignTitle}
                  className={valStyles.previewSignatureImage}
                />
              ) : (
                <div className={valStyles.previewSignatureEmpty}>—</div>
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
