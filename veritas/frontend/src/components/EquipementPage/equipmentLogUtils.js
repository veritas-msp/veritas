function parseLogDetailsRaw(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}
export function parseLogDetails(logOrRaw) {
  if (logOrRaw && typeof logOrRaw === "object" && "details" in logOrRaw) {
    return parseLogDetailsRaw(logOrRaw.details);
  }
  return parseLogDetailsRaw(logOrRaw);
}
export function formatLogDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
export function getLogActionDetails(log) {
  const action = log.action || "unknown";
  const actionLower = action.toLowerCase();
  const details = parseLogDetails(log);
  if (details?.kind === "equipment_created" || actionLower.includes("equipment created") || actionLower.includes("équipement créé")) {
    return {
      icon: "mdi:plus-circle",
      color: "#2b5fab",
      label: "Création"
    };
  }
  if (details?.kind === "equipment_deleted" || actionLower.includes("equipment deleted") || actionLower.includes("équipement supprimé")) {
    return {
      icon: "mdi:delete-circle",
      color: "#5c6b82",
      label: "Suppression"
    };
  }
  if (details?.kind === "field_update" || details?.kind === "field_set" || actionLower.startsWith("field update:") || actionLower.startsWith("field set:") || actionLower.startsWith("modification du champ") || actionLower.startsWith("field modified")) {
    return {
      icon: "mdi:pencil-circle",
      color: "#2b5fab",
      label: details?.fieldLabel ? `Modification · ${details.fieldLabel}` : action
    };
  }
  if (actionLower.includes("connexion distante") || details?.kind === "remote_access" || details?.kind === "quick_connect") {
    const success = details?.success !== false;
    return {
      icon: "mdi:remote-desktop",
      color: success ? "#2b5fab" : "#5c6b82",
      label: success ? "Remote connection" : "Tentative connexion distante"
    };
  }
  if (details?.kind === "rmm_agent_update" || details?.kind === "rmm_agent_update_request" || details?.kind === "rmm_agent_update_cancel") {
    return {
      icon: details?.kind === "rmm_agent_update_cancel" ? "mdi:cloud-download-off-outline" : "mdi:update",
      color: details?.kind === "rmm_agent_update_cancel" ? "#5c6b82" : "#2b5fab",
      label: "Agent RMM"
    };
  }
  if (details?.kind === "rmm_full_sync") {
    return {
      icon: "mdi:sync",
      color: "#2b5fab",
      label: "Sync complet RMM"
    };
  }
  if (details?.kind === "rmm_heartbeat") {
    const count = Number(details?.heartbeatCount) || 1;
    return {
      icon: "mdi:heart-pulse",
      color: "#2b5fab",
      label: count > 1 ? `RMM presence (${count}/h)` : "Heartbeat RMM"
    };
  }
  if (actionLower === "client update" || actionLower === "contact update") {
    return {
      icon: "mdi:pencil-circle",
      color: "#2b5fab",
      label: actionLower.startsWith("client") ? "Modification entreprise" : "Modification contact"
    };
  }
  if (actionLower === "link_client") {
    return { icon: "mdi:link-variant", color: "#2b5fab", label: "Liaison entreprise" };
  }
  if (actionLower === "unlink_client") {
    return { icon: "mdi:link-variant-off", color: "#5c6b82", label: "Déliaison entreprise" };
  }
  if (actionLower === "set_primary") {
    return { icon: "mdi:star-circle", color: "#2b5fab", label: "Contact principal" };
  }
  if (actionLower.startsWith("portal_")) {
    return {
      icon: "mdi:web",
      color: actionLower.includes("delete") ? "#5c6b82" : "#2b5fab",
      label: actionLower.replace("portal_", "Portail · ")
    };
  }
  if (actionLower === "purge_logs") {
    return { icon: "mdi:delete-sweep", color: "#5c6b82", label: "Purge journal" };
  }
  const actionMap = {
    create: {
      icon: "mdi:plus-circle",
      color: "#2b5fab",
      label: "Created"
    },
    update: {
      icon: "mdi:pencil-circle",
      color: "#2b5fab",
      label: "Modified"
    },
    delete: {
      icon: "mdi:delete-circle",
      color: "#5c6b82",
      label: "Deleted"
    },
    read: {
      icon: "mdi:eye-circle",
      color: "#5c6b82",
      label: "Viewed"
    },
    view: {
      icon: "mdi:eye-circle",
      color: "#5c6b82",
      label: "Viewed"
    },
    download: {
      icon: "mdi:download-circle",
      color: "#2b5fab",
      label: "Downloaded"
    },
    upload: {
      icon: "mdi:upload-circle",
      color: "#2b5fab",
      label: "Uploaded"
    }
  };
  for (const [key, meta] of Object.entries(actionMap)) {
    if (actionLower.includes(key)) {
      return meta;
    }
  }
  return {
    icon: "mdi:information-circle",
    color: "#6B7280",
    label: action
  };
}
function detailRow(label, value, options = {}) {
  if (value == null || value === "") return null;
  return {
    label,
    value: String(value),
    fullWidth: Boolean(options.fullWidth)
  };
}
function humanizeKey(key) {
  return String(key).replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, char => char.toUpperCase()).trim();
}
function formatReadableValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map(item => formatReadableValue(item)).join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v != null && v !== "");
    if (!entries.length) return "—";
    // Pair old/new classique
    if (("old" in value || "oldValue" in value || "before" in value) && ("new" in value || "newValue" in value || "after" in value)) {
      const oldVal = value.old ?? value.oldValue ?? value.before;
      const newVal = value.new ?? value.newValue ?? value.after;
      return `${formatReadableValue(oldVal)} → ${formatReadableValue(newVal)}`;
    }
    return entries.map(([k, v]) => `${humanizeKey(k)} : ${formatReadableValue(v)}`).join(" · ");
  }
  const text = String(value).trim();
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return formatReadableValue(JSON.parse(text));
    } catch {
      /* keep plain text */
    }
  }
  return text.replace(/\s+/g, " ");
}
function flattenObjectRows(obj, prefix = "", skipKeys = new Set(["kind"])) {
  if (obj == null) return [];
  if (typeof obj !== "object" || Array.isArray(obj)) {
    const label = prefix || "Valeur";
    return [detailRow(label, formatReadableValue(obj))].filter(Boolean);
  }
  const rows = [];
  for (const [key, value] of Object.entries(obj)) {
    if (skipKeys.has(key) || value == null || value === "") continue;
    const label = prefix ? `${prefix} · ${humanizeKey(key)}` : humanizeKey(key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (("old" in value || "oldValue" in value || "before" in value) && ("new" in value || "newValue" in value || "after" in value)) {
        rows.push(detailRow(label, formatReadableValue(value), { fullWidth: true }));
        continue;
      }
      const nested = flattenObjectRows(value, label, skipKeys);
      if (nested.length) {
        rows.push(...nested);
        continue;
      }
    }
    rows.push(detailRow(label, formatReadableValue(value), {
      fullWidth: String(formatReadableValue(value)).length > 48
    }));
  }
  return rows.filter(Boolean);
}
export function buildLogDetailRows(parsed, rawDetails) {
  if (!parsed) {
    if (rawDetails == null || rawDetails === "") return [];
    return null;
  }
  const {
    kind
  } = parsed;
  if (kind === "field_update" || kind === "field_set") {
    return [detailRow("Champ", parsed.fieldLabel || parsed.field), detailRow("Ancienne valeur", formatReadableValue(parsed.oldValue), {
      fullWidth: true
    }), detailRow("Nouvelle valeur", formatReadableValue(parsed.newValue), {
      fullWidth: true
    })].filter(Boolean);
  }
  if (kind === "equipment_created") {
    const fields = parsed.fields && typeof parsed.fields === "object" ? parsed.fields : null;
    if (!fields || !Object.keys(fields).length) return [detailRow("Événement", "Équipement créé")].filter(Boolean);
    return flattenObjectRows(fields);
  }
  if (kind === "equipment_deleted") {
    return [detailRow("Événement", "Équipement supprimé")].filter(Boolean);
  }
  if (kind === "remote_access" || kind === "quick_connect") {
    return [detailRow("Solution", parsed.solutionLabel), detailRow("Identifiant", parsed.targetId), detailRow("URL", parsed.url, {
      fullWidth: true
    }), detailRow("Résultat", parsed.outcomeLabel)].filter(Boolean);
  }
  if (kind === "rmm_agent_update" || kind === "rmm_agent_update_request" || kind === "rmm_agent_update_cancel") {
    const eventLabel = parsed.event === "install" ? "Installation" : parsed.event === "re_enroll" ? "Ré-enrôlement" : parsed.event === "request" ? "Mise à jour demandée" : parsed.event === "cancel" ? "Mise à jour annulée" : parsed.event === "update" ? "Mise à jour" : parsed.event;
    return [detailRow("Version précédente", parsed.previousVersion), detailRow("Nouvelle version", parsed.newVersion), detailRow("Événement", eventLabel), detailRow("Source", parsed.source), detailRow("Poste", parsed.hostname), detailRow("Demandé le", parsed.requestedAt ? formatLogDateTime(parsed.requestedAt) : null)].filter(Boolean);
  }
  if (kind === "rmm_heartbeat" || kind === "rmm_full_sync") {
    const rows = [];
    if (parsed.heartbeatCount != null && parsed.heartbeatCount > 1) {
      rows.push(detailRow("Signaux sur 1 h", parsed.heartbeatCount));
    }
    if (parsed.lastHeartbeatAt) {
      rows.push(detailRow("Dernier signal", formatLogDateTime(parsed.lastHeartbeatAt)));
    }
    if (parsed.mode) {
      rows.push(detailRow("Mode", parsed.mode === "full" ? "Sync complet" : "Heartbeat léger"));
    }
    if (parsed.agentVersion) rows.push(detailRow("Version agent", parsed.agentVersion));
    if (parsed.collectedAt) {
      rows.push(detailRow("Collecte", formatLogDateTime(parsed.collectedAt)));
    }
    if (parsed.syncRequested) rows.push(detailRow("Déclenché par le serveur", "Oui"));
    if (parsed.cpuUsagePct != null) rows.push(detailRow("CPU", `${parsed.cpuUsagePct}%`));
    if (parsed.ramUsagePct != null) rows.push(detailRow("RAM", `${parsed.ramUsagePct}%`));
    if (parsed.loggedUser) rows.push(detailRow("Session utilisateur", parsed.loggedUser));
    if (parsed.osEdition) rows.push(detailRow("Édition Windows", parsed.osEdition));
    if (parsed.osDisplayVersion) rows.push(detailRow("Version Windows", parsed.osDisplayVersion));
    if (parsed.osBuild) rows.push(detailRow("Build", parsed.osBuild));
    if (parsed.licenseActivated != null) {
      rows.push(detailRow("Licence activée", parsed.licenseActivated ? "Oui" : "Non"));
    }
    if (kind === "rmm_full_sync" && parsed.pendingCount != null) {
      rows.push(detailRow("Mises à jour en attente", parsed.pendingCount));
    }
    if (parsed.rebootRequired) rows.push(detailRow("Redémarrage requis", "Oui"));
    return rows.filter(Boolean);
  }
  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    const rows = flattenObjectRows(parsed);
    if (rows.length > 0) return rows;
  }
  return null;
}
/** Libellé du champ / modification pour affichage tableau. */
export function getLogModificationField(log) {
  const parsed = parseLogDetails(log);
  if (!parsed || typeof parsed !== "object") {
    const action = String(log?.action || "").trim();
    return action || "";
  }
  if (parsed.fieldLabel) return String(parsed.fieldLabel);
  if (parsed.field) return humanizeKey(parsed.field);

  if (Array.isArray(parsed.modifiedFields) && parsed.modifiedFields.length) {
    return parsed.modifiedFields.map(humanizeKey).join(", ");
  }

  if (Array.isArray(parsed.changes) && parsed.changes.length) {
    const labels = parsed.changes
      .map(change => change?.label || change?.fieldLabel || (change?.field ? humanizeKey(change.field) : ""))
      .filter(Boolean);
    if (labels.length) return labels.join(", ");
  }

  if (parsed.changes && typeof parsed.changes === "object" && !Array.isArray(parsed.changes)) {
    const keys = Object.keys(parsed.changes).filter(Boolean);
    if (keys.length) return keys.map(humanizeKey).join(", ");
  }

  // Fallback : premiers champs utiles hors métadonnées
  const skip = new Set(["kind", "success", "source", "event", "mode"]);
  const keys = Object.keys(parsed).filter(key => !skip.has(key) && parsed[key] != null && parsed[key] !== "");
  if (keys.length === 1 && (keys[0] === "description" || keys[0] === "message")) {
    return formatReadableValue(parsed[keys[0]]);
  }
  if (keys.length && keys.length <= 4) {
    return keys.map(humanizeKey).join(", ");
  }
  return "";
}

export function getLogDetailsFallbackText(rawDetails) {
  if (rawDetails == null || rawDetails === "") return "";
  let parsed = rawDetails;
  if (typeof rawDetails === "string") {
    try {
      parsed = JSON.parse(rawDetails);
    } catch {
      return rawDetails;
    }
  }
  if (parsed && typeof parsed === "object") {
    return flattenObjectRows(parsed)
      .map(row => `${row.label} : ${row.value}`)
      .join("\n");
  }
  return String(parsed);
}
