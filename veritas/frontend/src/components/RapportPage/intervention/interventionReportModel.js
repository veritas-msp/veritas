export function formatClientAddress(client) {
  if (!client || typeof client !== "object") return "";
  if (client.address && String(client.address).trim()) return String(client.address).trim();
  const parts = [
    client.addressStreet || client.adresse_rue,
    [client.addressPostalCode || client.code_postal, client.addressCity || client.ville].filter(Boolean).join(" ")
  ].filter(Boolean);
  return parts.join(", ");
}

export function createOperationItem(label = "", status = "") {
  return {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    status: status === "ok" || status === "pb" ? status : ""
  };
}

export function createTaskItem(label = "") {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: String(label || "").trim() ? String(label) : ""
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

function migrateLegacyTasks(initial = {}) {
  const done = normalizeTaskList(initial.tasksDone);
  const todo = normalizeTaskList(initial.tasksTodo ?? initial.tasksRemaining);
  if (done.length || todo.length) {
    return { tasksDone: done, tasksTodo: todo };
  }

  const legacyOps = Array.isArray(initial.operations) ? initial.operations : [];
  const migratedDone = [];
  const migratedTodo = [];
  legacyOps.forEach(op => {
    const label = typeof op === "string" ? op : op?.label || op?.text || "";
    if (!String(label).trim()) return;
    const status = String(op?.status || "").toLowerCase();
    if (status === "pb" || op?.done === false) migratedTodo.push(createTaskItem(label));
    else migratedDone.push(createTaskItem(label));
  });

  const legacyTodos = Array.isArray(initial.todos) ? initial.todos : [];
  legacyTodos.forEach(item => {
    const label = typeof item === "string" ? item : item?.text || item?.label || "";
    if (!String(label).trim()) return;
    if (item?.done === true) migratedDone.push(createTaskItem(label));
    else migratedTodo.push(createTaskItem(label));
  });

  return {
    tasksDone: migratedDone.length ? migratedDone : [createTaskItem("")],
    tasksTodo: migratedTodo.length ? migratedTodo : [createTaskItem("")]
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

export function buildDefaultInterventionData({
  client,
  organizationName = "",
  organizationAddress = "",
  copy = null
} = {}) {
  const clientName = client?.name || client?.nom || "";
  const today = new Date().toISOString().split("T")[0];
  const firstSite = Array.isArray(client?.sites) ? client.sites[0] : null;
  return {
    companyName: organizationName || "",
    companyAddress: organizationAddress || "",
    client: clientName,
    adresse: formatClientAddress(client) || formatClientAddress(firstSite) || "",
    typeIntervention: "",
    numeroTicket: "",
    linkedTicketId: null,
    postTicketFollowUp: true,
    salle: "",
    linkedEquipments: [],
    materiels: "",
    numerosSerie: "",
    photoInstallation: "",
    tasksDone: [createTaskItem("")],
    tasksTodo: [createTaskItem("")],
    operationsComment: "",
    // Legacy mirror for older readers
    operations: [],
    reservesClient: "",
    signataireNom: "",
    signataireFonction: "",
    signatureLieu: "",
    signatureDate: today,
    signaturePrestataire: "",
    signatureClient: "",
    // Legacy fields kept for older saved documents
    companyTaxId: "",
    contactSite: "",
    dateIntervention: today,
    dureeIntervention: "",
    numeroIntervention: "",
    descriptionDemande: "",
    compteRendu: "",
    todos: [],
    mouvements: [],
    requireSignature: true,
    signatureMotif: "",
    signatureNom: "",
    signatureReserve: "",
    signatureAccord: false,
    documentSigne: false
  };
}

function tasksToLegacyOperations(tasksDone, tasksTodo) {
  return [
    ...normalizeTaskList(tasksDone).map(task => ({
      id: task.id,
      label: task.label,
      status: "ok"
    })),
    ...normalizeTaskList(tasksTodo).map(task => ({
      id: task.id,
      label: task.label,
      status: "pb"
    }))
  ];
}

export function mergeInterventionData(defaults, initial) {
  if (!initial || typeof initial !== "object") return defaults;
  const linkedEquipments = normalizeLinkedEquipments(
    initial.linkedEquipments ?? initial.equipments ?? defaults.linkedEquipments
  );
  const derivedMateriel = linkedEquipments.length
    ? deriveMaterielFieldsFromEquipments(linkedEquipments)
    : null;
  const migratedTasks = migrateLegacyTasks(initial);
  const merged = {
    ...defaults,
    ...initial,
    linkedEquipments,
    materiels: derivedMateriel?.materiels || initial.materiels || defaults.materiels,
    numerosSerie: derivedMateriel?.numerosSerie || initial.numerosSerie || defaults.numerosSerie,
    tasksDone: migratedTasks.tasksDone,
    tasksTodo: migratedTasks.tasksTodo,
    operationsComment: String(initial.operationsComment ?? initial.compteRendu ?? defaults.operationsComment ?? ""),
    operations: tasksToLegacyOperations(migratedTasks.tasksDone, migratedTasks.tasksTodo),
    mouvements: Array.isArray(initial.mouvements) ? initial.mouvements : defaults.mouvements,
    todos: Array.isArray(initial.todos) ? initial.todos : defaults.todos
  };
  // Map legacy signature fields
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
        String(data.adresse || "").trim() &&
        String(data.typeIntervention || "").trim()
      );
    case 1: {
      const done = Array.isArray(data.tasksDone) ? data.tasksDone : [];
      return done.some(task => String(task?.label || "").trim());
    }
    case 2:
      return (
        String(data.signataireNom || "").trim() &&
        String(data.signatureLieu || "").trim() &&
        String(data.signatureDate || "").trim() &&
        String(data.signatureClient || "").trim()
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
    if (!String(data.signataireNom || "").trim()) return alerts.signatureNom;
    if (!String(data.signatureLieu || "").trim()) return alerts.signatureLieu;
    if (!String(data.signatureDate || "").trim()) return alerts.signatureDate;
    if (!String(data.signatureClient || "").trim()) return alerts.signatureClientRequired;
    return alerts.signatureFields;
  }
  return alerts.stepReport;
}

export function buildInterventionReportPeriod(data) {
  const date = data?.signatureDate || data?.dateIntervention;
  const ticket = String(data?.numeroTicket || data?.numeroIntervention || "").trim();
  if (ticket && date) return `Intervention ${ticket} · ${date}`;
  if (date) return `Intervention du ${date}`;
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
  return {
    companyName: payload.companyName ?? "",
    companyAddress: payload.companyAddress ?? "",
    client: payload.client ?? "",
    adresse: payload.adresse ?? "",
    typeIntervention: payload.typeIntervention ?? "",
    numeroTicket: payload.numeroTicket ?? "",
    linkedTicketId: payload.linkedTicketId ?? null,
    postTicketFollowUp: payload.postTicketFollowUp !== false,
    salle: payload.salle ?? "",
    linkedEquipments: normalizeLinkedEquipments(payload.linkedEquipments),
    materiels: payload.materiels ?? "",
    numerosSerie: payload.numerosSerie ?? "",
    photoInstallation: payload.photoInstallation ?? "",
    tasksDone: normalizeTaskList(payload.tasksDone),
    tasksTodo: normalizeTaskList(payload.tasksTodo ?? payload.tasksRemaining),
    operationsComment: payload.operationsComment ?? "",
    operations: tasksToLegacyOperations(payload.tasksDone, payload.tasksTodo ?? payload.tasksRemaining),
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
