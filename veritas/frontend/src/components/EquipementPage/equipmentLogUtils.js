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
export function buildLogDetailRows(parsed, rawDetails) {
  if (!parsed) {
    if (rawDetails == null || rawDetails === "") return [];
    return null;
  }
  const {
    kind
  } = parsed;
  if (kind === "field_update" || kind === "field_set") {
    const formatValue = value => {
      if (value == null || value === "") return "—";
      if (typeof value === "boolean") return value ? "Oui" : "Non";
      if (typeof value === "object") return JSON.stringify(value, null, 2);
      return String(value);
    };
    return [detailRow("Champ", parsed.fieldLabel || parsed.field), detailRow("Ancienne valeur", formatValue(parsed.oldValue), {
      fullWidth: true
    }), detailRow("Nouvelle valeur", formatValue(parsed.newValue), {
      fullWidth: true
    })].filter(Boolean);
  }
  if (kind === "equipment_created") {
    const fields = parsed.fields && typeof parsed.fields === "object" ? Object.entries(parsed.fields) : [];
    if (!fields.length) return [detailRow("Événement", "Équipement créé")].filter(Boolean);
    return fields.map(([key, value]) => {
      const displayValue = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
      return detailRow(humanizeKey(key), displayValue, {
        fullWidth: typeof value === "object"
      });
    }).filter(Boolean);
  }
  if (kind === "equipment_deleted") {
    return [detailRow("Événement", "Équipement supprimé")].filter(Boolean);
  }
  if (kind === "remote_access" || kind === "quick_connect") {
    return [detailRow("Solution", parsed.solutionLabel), detailRow("Identifiant", parsed.targetId), detailRow("URL", parsed.url, {
      fullWidth: true
    }), detailRow("Result", parsed.outcomeLabel)].filter(Boolean);
  }
  if (kind === "rmm_agent_update" || kind === "rmm_agent_update_request" || kind === "rmm_agent_update_cancel") {
    const eventLabel = parsed.event === "install" ? "Installation" : parsed.event === "re_enroll" ? "Re-enrollment" : parsed.event === "request" ? "Update requested" : parsed.event === "cancel" ? "Update cancelled" : parsed.event === "update" ? "Update" : parsed.event;
    return [detailRow("Previous version", parsed.previousVersion), detailRow("Target / new version", parsed.newVersion), detailRow("Event", eventLabel), detailRow("Source", parsed.source), detailRow("Poste", parsed.hostname), detailRow("Requested at", parsed.requestedAt ? formatLogDateTime(parsed.requestedAt) : null)].filter(Boolean);
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
      rows.push(detailRow("Mode", parsed.mode === "full" ? "Sync complet" : "Lightweight heartbeat"));
    }
    if (parsed.agentVersion) rows.push(detailRow("Version agent", parsed.agentVersion));
    if (parsed.collectedAt) {
      rows.push(detailRow("Collecte", formatLogDateTime(parsed.collectedAt)));
    }
    if (parsed.syncRequested) rows.push(detailRow("Triggered by the server", "Yes"));
    if (parsed.cpuUsagePct != null) rows.push(detailRow("CPU", `${parsed.cpuUsagePct}%`));
    if (parsed.ramUsagePct != null) rows.push(detailRow("RAM", `${parsed.ramUsagePct}%`));
    if (parsed.loggedUser) rows.push(detailRow("User session", parsed.loggedUser));
    if (parsed.osEdition) rows.push(detailRow("Windows edition", parsed.osEdition));
    if (parsed.osDisplayVersion) rows.push(detailRow("Version Windows", parsed.osDisplayVersion));
    if (parsed.osBuild) rows.push(detailRow("Build", parsed.osBuild));
    if (parsed.licenseActivated != null) {
      rows.push(detailRow("License activated", parsed.licenseActivated ? "Yes" : "No"));
    }
    if (kind === "rmm_full_sync" && parsed.pendingCount != null) {
      rows.push(detailRow("Pending updates", parsed.pendingCount));
    }
    if (parsed.rebootRequired) rows.push(detailRow("Restart required", "Yes"));
    return rows.filter(Boolean);
  }
  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    const skipKeys = new Set(["kind"]);
    const entries = Object.entries(parsed).filter(([key, value]) => !skipKeys.has(key) && value != null && value !== "");
    if (entries.length > 0) {
      return entries.map(([key, value]) => {
        const displayValue = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
        return detailRow(humanizeKey(key), displayValue, {
          fullWidth: displayValue.length > 48
        });
      }).filter(Boolean);
    }
  }
  return null;
}
export function getLogDetailsFallbackText(rawDetails) {
  if (rawDetails == null || rawDetails === "") return "";
  if (typeof rawDetails === "string") {
    try {
      return JSON.stringify(JSON.parse(rawDetails), null, 2);
    } catch {
      return rawDetails;
    }
  }
  return JSON.stringify(rawDetails, null, 2);
}
