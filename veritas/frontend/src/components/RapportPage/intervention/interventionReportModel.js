export function formatClientAddress(client) {
  if (!client || typeof client !== "object") return "";
  if (client.address && String(client.address).trim()) return String(client.address).trim();
  const parts = [
    client.addressStreet || client.adresse_rue,
    [client.addressPostalCode || client.code_postal, client.addressCity || client.ville].filter(Boolean).join(" ")
  ].filter(Boolean);
  return parts.join(", ");
}

export function normalizeOperationStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "ok" || value === "done" || value === "effectue") return "ok";
  if (value === "pending" || value === "attente" || value === "en_attente" || value === "en attente") {
    return "pending";
  }
  if (value === "ko" || value === "pb" || value === "nok" || value === "fail") return "ko";
  return "";
}

export function createOperationItem(description = "", status = "", observations = "") {
  const label = String(description || "").trim();
  return {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: label,
    label,
    status: normalizeOperationStatus(status),
    observations: String(observations || "")
  };
}

export function createTaskItem(label = "") {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: String(label || "").trim() ? String(label) : ""
  };
}

export function createMovementItem({
  qte = "1",
  reference = "",
  serial = "",
  operation = ""
} = {}) {
  return {
    id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    qte: String(qte ?? "1"),
    reference: String(reference || ""),
    serial: String(serial || ""),
    operation: String(operation || "") === "recuperation" ? "recuperation" : String(operation || "") === "depot" ? "depot" : ""
  };
}

export function createPhotoItem(dataUrl = "", name = "") {
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dataUrl: String(dataUrl || ""),
    name: String(name || "")
  };
}

function normalizeTaskList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(item => {
      if (typeof item === "string") {
        const label = item.trim();
        return label ? createTaskItem(label) : null;
      }
      if (!item || typeof item !== "object") return null;
      const label = String(item.label || item.text || "").trim();
      return {
        id: item.id || createTaskItem().id,
        label
      };
    })
    .filter(Boolean);
}

function normalizeOperationList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(item => {
      if (typeof item === "string") {
        const description = item.trim();
        return description ? createOperationItem(description) : null;
      }
      if (!item || typeof item !== "object") return null;
      const description = String(item.description || item.label || item.text || "").trim();
      return {
        id: item.id || createOperationItem().id,
        description,
        label: description,
        status: normalizeOperationStatus(item.status),
        observations: String(item.observations || item.comment || "").trim()
      };
    })
    .filter(Boolean);
}

function normalizeMovementList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const operationRaw = String(item.operation || item.type || "").toLowerCase();
      let operation = "";
      if (operationRaw.includes("recup") || operationRaw.includes("remove") || operationRaw === "retrait") {
        operation = "recuperation";
      } else if (operationRaw.includes("depot") || operationRaw.includes("deposit") || operationRaw === "ajout") {
        operation = "depot";
      }
      return {
        id: item.id || createMovementItem().id,
        qte: String(item.qte ?? item.quantity ?? item.qty ?? "1"),
        reference: String(item.reference || item.ref || item.name || "").trim(),
        serial: String(item.serial || item.numerosSerie || item.sn || "").trim(),
        operation
      };
    })
    .filter(Boolean);
}

function normalizePhotoList(list, legacySingle = "") {
  const fromList = Array.isArray(list)
    ? list
        .map(item => {
          if (typeof item === "string" && item.trim()) {
            return createPhotoItem(item.trim());
          }
          if (!item || typeof item !== "object") return null;
          const dataUrl = String(item.dataUrl || item.src || item.url || "").trim();
          if (!dataUrl) return null;
          return {
            id: item.id || createPhotoItem().id,
            dataUrl,
            name: String(item.name || item.fileName || "").trim()
          };
        })
        .filter(Boolean)
    : [];
  if (fromList.length) return fromList;
  const legacy = String(legacySingle || "").trim();
  return legacy ? [createPhotoItem(legacy)] : [];
}

function migrateLegacyOperations(initial = {}) {
  const existing = normalizeOperationList(initial.operations);
  if (existing.some(op => op.description || op.status || op.observations)) {
    return existing.length ? existing : [createOperationItem()];
  }

  const done = normalizeTaskList(initial.tasksDone);
  const todo = normalizeTaskList(initial.tasksTodo ?? initial.tasksRemaining);
  const migrated = [];

  done.forEach(task => {
    if (!task.label) return;
    migrated.push(createOperationItem(task.label, "ok"));
  });
  todo.forEach(task => {
    if (!task.label) return;
    migrated.push(createOperationItem(task.label, "pending"));
  });

  const legacyTodos = Array.isArray(initial.todos) ? initial.todos : [];
  legacyTodos.forEach(item => {
    const label = typeof item === "string" ? item : item?.text || item?.label || "";
    if (!String(label).trim()) return;
    migrated.push(createOperationItem(label, item?.done === true ? "ok" : "pending"));
  });

  return migrated.length ? migrated : [createOperationItem()];
}

function operationsToLegacyTasks(operations) {
  const rows = normalizeOperationList(operations);
  const tasksDone = [];
  const tasksTodo = [];
  rows.forEach(op => {
    if (!op.description) return;
    if (op.status === "ok") tasksDone.push(createTaskItem(op.description));
    else tasksTodo.push(createTaskItem(op.description));
  });
  return {
    tasksDone: tasksDone.length ? tasksDone : [createTaskItem("")],
    tasksTodo: tasksTodo.length ? tasksTodo : [createTaskItem("")]
  };
}

export function normalizeLinkedEquipments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const id = item.id != null ? String(item.id) : item.equipment_id != null ? String(item.equipment_id) : "";
      if (!id) return null;
      return {
        id,
        name: String(item.name || item.model || "").trim(),
        type: String(item.type || "").trim(),
        serial: String(item.serial || item.numerosSerie || "").trim(),
        manufacturer: String(item.manufacturer || "").trim(),
        model: String(item.model || "").trim(),
        label: String(item.label || "").trim()
      };
    })
    .filter(Boolean);
}

export function deriveMaterielFieldsFromEquipments(equipments) {
  const rows = normalizeLinkedEquipments(equipments);
  return {
    materiels: rows.map(row => row.label || [row.type, row.name].filter(Boolean).join(" · ") || row.id).join(", "),
    numerosSerie: rows.map(row => row.serial).filter(Boolean).join(", ")
  };
}

export function deriveSousContratFromClient(client) {
  if (!client || typeof client !== "object") return null;
  if (client.contrat?.suspendu === true || client.contract_suspended === true) return false;
  const expiration = client.contrat?.expiration || client.contract_expiration || client.contractExpiration;
  if (expiration) {
    const exp = new Date(expiration);
    if (!Number.isNaN(exp.getTime())) return exp >= new Date();
  }
  const modules = client.contrat?.modules || client.options;
  if (modules && typeof modules === "object") {
    return Object.values(modules).some(Boolean);
  }
  if (typeof client.sous_contrat === "boolean") return client.sous_contrat;
  if (typeof client.sousContrat === "boolean") return client.sousContrat;
  return null;
}

export function resolveTechnicianName(user) {
  if (!user || typeof user !== "object") return "";
  return (
    String(user.username || "").trim() ||
    String(user.profile?.display_name || user.profile?.displayName || "").trim() ||
    String(user.email || "").trim() ||
    ""
  );
}

export function buildDefaultInterventionData({
  client,
  organizationName = "",
  organizationAddress = "",
  technicianName = "",
  copy = null
} = {}) {
  const clientName = client?.name || client?.nom || "";
  const today = new Date().toISOString().split("T")[0];
  const firstSite = Array.isArray(client?.sites) ? client.sites[0] : null;
  const sousContrat = deriveSousContratFromClient(client);
  return {
    companyName: organizationName || "",
    companyAddress: organizationAddress || "",
    numeroClient: client?.client_number || client?.clientNumber || "",
    client: clientName,
    adresse: formatClientAddress(client) || formatClientAddress(firstSite) || "",
    typeIntervention: "",
    technicien: technicianName || "",
    numeroTicket: "",
    linkedTicketId: null,
    postTicketFollowUp: true,
    dateDebut: today,
    dateFin: today,
    sousContrat,
    salle: "",
    linkedEquipments: [],
    materiels: "",
    numerosSerie: "",
    photoInstallation: "",
    photos: [],
    operations: [createOperationItem()],
    mouvements: [createMovementItem()],
    tasksDone: [createTaskItem("")],
    tasksTodo: [createTaskItem("")],
    operationsComment: "",
    reservesClient: "",
    signataireNom: "",
    signataireFonction: "",
    signatureLieu: "",
    signatureDate: today,
    signaturePrestataire: "",
    signatureClient: "",
    companyTaxId: "",
    contactSite: "",
    dateIntervention: today,
    dureeIntervention: "",
    numeroIntervention: "",
    descriptionDemande: "",
    compteRendu: "",
    todos: [],
    requireSignature: true,
    signatureMotif: "",
    signatureNom: "",
    signatureReserve: "",
    signatureAccord: false,
    documentSigne: false
  };
}

export function mergeInterventionData(defaults, initial) {
  if (!initial || typeof initial !== "object") return defaults;
  const linkedEquipments = normalizeLinkedEquipments(
    initial.linkedEquipments ?? initial.equipments ?? defaults.linkedEquipments
  );
  const derivedMateriel = linkedEquipments.length
    ? deriveMaterielFieldsFromEquipments(linkedEquipments)
    : null;
  const operations = migrateLegacyOperations(initial);
  const legacyTasks = operationsToLegacyTasks(operations);
  const photos = normalizePhotoList(initial.photos, initial.photoInstallation || defaults.photoInstallation);
  const mouvements = normalizeMovementList(initial.mouvements);
  const sousContrat =
    typeof initial.sousContrat === "boolean"
      ? initial.sousContrat
      : initial.sousContrat === "oui" || initial.sousContrat === "yes"
        ? true
        : initial.sousContrat === "non" || initial.sousContrat === "no"
          ? false
          : defaults.sousContrat;

  const merged = {
    ...defaults,
    ...initial,
    numeroClient: String(initial.numeroClient ?? initial.clientNumber ?? defaults.numeroClient ?? ""),
    technicien: String(initial.technicien ?? initial.technician ?? defaults.technicien ?? ""),
    dateDebut: String(initial.dateDebut ?? initial.dateIntervention ?? defaults.dateDebut ?? ""),
    dateFin: String(initial.dateFin ?? initial.dateIntervention ?? defaults.dateFin ?? ""),
    sousContrat,
    linkedEquipments,
    materiels: derivedMateriel?.materiels || initial.materiels || defaults.materiels,
    numerosSerie: derivedMateriel?.numerosSerie || initial.numerosSerie || defaults.numerosSerie,
    operations,
    mouvements: mouvements.length ? mouvements : defaults.mouvements,
    photos,
    photoInstallation: photos[0]?.dataUrl || "",
    tasksDone: legacyTasks.tasksDone,
    tasksTodo: legacyTasks.tasksTodo,
    operationsComment: String(initial.operationsComment ?? initial.compteRendu ?? defaults.operationsComment ?? ""),
    todos: Array.isArray(initial.todos) ? initial.todos : defaults.todos
  };

  if (!merged.signataireNom && merged.signatureNom) merged.signataireNom = merged.signatureNom;
  if (!merged.reservesClient && merged.signatureReserve) merged.reservesClient = merged.signatureReserve;
  if (!merged.numeroTicket && merged.numeroIntervention) merged.numeroTicket = merged.numeroIntervention;
  if (!merged.typeIntervention && merged.descriptionDemande) merged.typeIntervention = merged.descriptionDemande;
  return merged;
}

export function createTodoItem(text = "") {
  return {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    done: false,
    plannedFor: ""
  };
}

export function hasInterventionSignatureDrawn(data) {
  return Boolean(String(data?.signaturePrestataire || "").trim() || String(data?.signatureClient || "").trim());
}

export function validateInterventionStep(stepIndex, data) {
  if (!data || typeof data !== "object") return false;
  switch (stepIndex) {
    case 0:
      return (
        String(data.client || "").trim() &&
        String(data.typeIntervention || "").trim() &&
        String(data.technicien || "").trim() &&
        String(data.dateDebut || "").trim() &&
        String(data.dateFin || "").trim()
      );
    case 1: {
      const operations = Array.isArray(data.operations) ? data.operations : [];
      return operations.some(op => String(op?.description || op?.label || "").trim());
    }
    case 2:
      return (
        String(data.signatureClient || "").trim() &&
        String(data.signaturePrestataire || "").trim()
      );
    case 3:
      return true;
    default:
      return true;
  }
}

export function getInterventionStepValidationAlert(stepIndex, data, alerts) {
  if (validateInterventionStep(stepIndex, data)) return null;
  if (stepIndex === 0) return alerts.stepContext;
  if (stepIndex === 1) return alerts.stepOperations;
  if (stepIndex === 2) {
    if (!String(data.signaturePrestataire || "").trim()) return alerts.signatureTechRequired;
    if (!String(data.signatureClient || "").trim()) return alerts.signatureClientRequired;
    return alerts.signatureFields;
  }
  return alerts.stepReport;
}

export function buildInterventionReportPeriod(data) {
  const start = data?.dateDebut || data?.signatureDate || data?.dateIntervention;
  const end = data?.dateFin || start;
  const ticket = String(data?.numeroTicket || data?.numeroIntervention || "").trim();
  const range = start && end && start !== end ? `${start} → ${end}` : start || end || "";
  if (ticket && range) return `Intervention ${ticket} · ${range}`;
  if (range) return `Intervention du ${range}`;
  if (ticket) return `Intervention ${ticket}`;
  return "Rapport d'intervention";
}

export function buildInterventionSaveRandomSuffix() {
  return Math.floor(1000 + Math.random() * 9000);
}

export function buildDefaultSaveName(clientLabel, copy, { withRandom = true } = {}) {
  const template = copy?.validation?.saveNamePlaceholder || "Report · {client}";
  const base = template.replace("{client}", clientLabel || "client");
  if (!withRandom) return base;
  return `${base} ${buildInterventionSaveRandomSuffix()}`;
}

export function serializeInterventionClient(client) {
  if (!client || typeof client !== "object") return null;
  return {
    id: client.id ?? client.uuid ?? null,
    uuid: client.uuid ?? client.id ?? null,
    name: client.name ?? client.nom ?? null,
    nom: client.nom ?? client.name ?? null,
    client_number: client.client_number ?? client.clientNumber ?? null,
    clientNumber: client.clientNumber ?? client.client_number ?? null,
    sites: Array.isArray(client.sites)
      ? client.sites.map(site => ({
          id: site?.id ?? site?.uuid ?? null,
          name: site?.name ?? site?.nom ?? null,
          address: site?.address ?? null,
          contact: site?.contact ?? site?.contact_name ?? null,
          contact_name: site?.contact_name ?? site?.contact ?? null
        }))
      : []
  };
}

function serializeInterventionFormPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  const operations = normalizeOperationList(payload.operations);
  const legacyTasks = operationsToLegacyTasks(operations);
  const photos = normalizePhotoList(payload.photos, payload.photoInstallation);
  const mouvements = normalizeMovementList(payload.mouvements);
  return {
    companyName: payload.companyName ?? "",
    companyAddress: payload.companyAddress ?? "",
    numeroClient: payload.numeroClient ?? "",
    client: payload.client ?? "",
    adresse: payload.adresse ?? "",
    typeIntervention: payload.typeIntervention ?? "",
    technicien: payload.technicien ?? "",
    numeroTicket: payload.numeroTicket ?? "",
    linkedTicketId: payload.linkedTicketId ?? null,
    postTicketFollowUp: payload.postTicketFollowUp !== false,
    dateDebut: payload.dateDebut ?? "",
    dateFin: payload.dateFin ?? "",
    sousContrat: typeof payload.sousContrat === "boolean" ? payload.sousContrat : null,
    salle: payload.salle ?? "",
    linkedEquipments: normalizeLinkedEquipments(payload.linkedEquipments),
    materiels: payload.materiels ?? "",
    numerosSerie: payload.numerosSerie ?? "",
    photoInstallation: photos[0]?.dataUrl || "",
    photos,
    operations,
    mouvements,
    tasksDone: legacyTasks.tasksDone,
    tasksTodo: legacyTasks.tasksTodo,
    operationsComment: payload.operationsComment ?? "",
    reservesClient: payload.reservesClient ?? "",
    signataireNom: payload.signataireNom ?? "",
    signataireFonction: payload.signataireFonction ?? "",
    signatureLieu: payload.signatureLieu ?? "",
    signatureDate: payload.signatureDate ?? "",
    signaturePrestataire: payload.signaturePrestataire ?? "",
    signatureClient: payload.signatureClient ?? "",
    requireSignature: true,
    documentSigne: Boolean(payload.signatureClient || payload.signaturePrestataire)
  };
}

export function serializeInterventionSavePayload(client, payload, reportType = "intervention") {
  return {
    config: {
      reportType,
      client: serializeInterventionClient(client)
    },
    data: {
      intervention: serializeInterventionFormPayload(payload)
    }
  };
}

export function isDuplicateMonitoringSaveResult(result) {
  if (!result || result.success !== false) return false;
  const message = String(result.message || result.error || "").toLowerCase();
  return (
    message.includes("déjà enregistré") ||
    message.includes("already exists") ||
    message.includes("existiert bereits") ||
    message.includes("esiste già") ||
    message.includes("ya existe")
  );
}
