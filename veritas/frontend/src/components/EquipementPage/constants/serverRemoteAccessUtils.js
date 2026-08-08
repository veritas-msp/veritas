import { EQUIPMENT_REMOTE_ACTION_ICON } from "../equipmentRemoteAccessUtils";
import { logEquipmentRemoteAccessAttempt } from "../equipmentActivityLog";
export const SERVER_REMOTE_ACCESS_LABEL = "Prise en main";
export const SERVER_REMOTE_ACCESS_SOLUTIONS = [{
  value: "anydesk",
  label: "AnyDesk",
  icon: "simple-icons:anydesk",
  description: "AnyDesk client installed on the server",
  placeholder: "123 456 789",
  idLabel: "ID AnyDesk",
  supportsLaunch: true
}, {
  value: "teamviewer",
  label: "TeamViewer",
  icon: "simple-icons:teamviewer",
  description: "TeamViewer numeric ID",
  placeholder: "123 456 789",
  idLabel: "ID TeamViewer",
  supportsLaunch: true
}, {
  value: "rustdesk",
  label: "RustDesk",
  icon: "simple-icons:rustdesk",
  description: "ID RustDesk ou code de connexion",
  placeholder: "123456789",
  idLabel: "ID RustDesk",
  supportsLaunch: true
}, {
  value: "splashtop",
  label: "Splashtop",
  icon: "mdi:monitor-arrow-down",
  description: "Code session ou identifiant Splashtop",
  placeholder: "Code session",
  idLabel: "Identifiant Splashtop",
  supportsLaunch: false
}, {
  value: "rdp",
  label: "Remote desktop (RDP)",
  icon: "mdi:microsoft-windows",
  description: "IP address or Windows hostname",
  placeholder: "192.168.1.10 ou SRV-DC01",
  idLabel: "RDP host",
  supportsLaunch: true
}, {
  value: "other",
  label: "Other",
  icon: "mdi:dots-horizontal",
  description: "Other tool (free-form ID)",
  placeholder: "Reference or ID",
  idLabel: "Identifiant",
  supportsLaunch: false
}];
const SOLUTION_ALIASES = {
  anydesk: "anydesk",
  teamviewer: "teamviewer",
  team: "teamviewer",
  rustdesk: "rustdesk",
  rust: "rustdesk",
  splashtop: "splashtop",
  rdp: "rdp",
  "bureau a distance": "rdp",
  "remote desktop": "rdp",
  mstsc: "rdp",
  autre: "other",
  other: "other"
};
export function normalizeRemoteAccessSolution(value) {
  const normalized = String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return "";
  return SOLUTION_ALIASES[normalized] || normalized;
}
export function normalizeRemoteAccessId(value) {
  return String(value || "").trim();
}
export function getServerRemoteAccessSolutionDef(solution) {
  const key = normalizeRemoteAccessSolution(solution);
  return SERVER_REMOTE_ACCESS_SOLUTIONS.find(item => item.value === key) || null;
}
function readLayers(equipment) {
  return [equipment, equipment?.data, equipment?.rawData, equipment?.rawData?.data].filter(layer => layer && typeof layer === "object");
}
export function readServerRemoteAccess(equipment) {
  let solution = "";
  let id = "";
  for (const layer of readLayers(equipment)) {
    if (!solution && layer.remoteAccessSolution) {
      solution = normalizeRemoteAccessSolution(layer.remoteAccessSolution);
    }
    if (!id && layer.remoteAccessId) {
      id = normalizeRemoteAccessId(layer.remoteAccessId);
    }
  }
  if (!id) {
    for (const layer of readLayers(equipment)) {
      if (layer.anydeskId) {
        id = normalizeRemoteAccessId(layer.anydeskId);
        break;
      }
    }
  }
  if (!solution && id) {
    solution = "anydesk";
  }
  return {
    solution,
    id
  };
}
export function readServerRemoteAccessFromForm(formData) {
  const id = normalizeRemoteAccessId(formData?.remoteAccessId ?? formData?.anydeskId);
  let solution = normalizeRemoteAccessSolution(formData?.remoteAccessSolution);
  if (!solution && id) solution = "anydesk";
  return {
    solution,
    id
  };
}
export function hasServerRemoteAccessConfigured(equipment) {
  const {
    solution,
    id
  } = readServerRemoteAccess(equipment);
  return Boolean(solution && id);
}
export function buildServerRemoteAccessLaunchTargets(solution, rawId) {
  const id = normalizeRemoteAccessId(rawId);
  const key = normalizeRemoteAccessSolution(solution);
  if (!id || !key) return [];
  const compact = id.replace(/\s+/g, "");
  switch (key) {
    case "anydesk":
      return [{
        url: `anydesk://${compact}`
      }, {
        url: `https://anydesk.com/${encodeURIComponent(compact)}`
      }];
    case "teamviewer":
      return [{
        url: `teamviewer10://control?device=${encodeURIComponent(compact)}`
      }];
    case "rustdesk":
      return [{
        url: `rustdesk://${encodeURIComponent(compact)}`
      }];
    case "rdp":
      {
        const host = id.replace(/^https?:\/\//i, "").split(/[/:]/)[0].trim();
        if (!host) return [];
        return [{
          url: `ms-rd:subscribe?url=${encodeURIComponent(`full address=s:${host}`)}`
        }, {
          url: `rdp://${host}`
        }];
      }
    default:
      return [];
  }
}
export function getServerRemoteAccessTooltip(equipment) {
  const {
    solution,
    id
  } = readServerRemoteAccess(equipment);
  if (!id) return "Prise en main non configurede";
  const def = getServerRemoteAccessSolutionDef(solution);
  const label = def?.label || SERVER_REMOTE_ACCESS_LABEL;
  return `${label} · ${id}`;
}
export function openServerRemoteAccess(equipment) {
  const {
    solution,
    id
  } = readServerRemoteAccess(equipment);
  if (!id) {
    void logEquipmentRemoteAccessAttempt(equipment, {
      solution,
      id,
      ok: false,
      reason: "missing"
    });
    return {
      ok: false,
      reason: "missing"
    };
  }
  const targets = buildServerRemoteAccessLaunchTargets(solution, id);
  if (targets.length === 0) {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(id);
      void logEquipmentRemoteAccessAttempt(equipment, {
        solution,
        id,
        ok: true,
        reason: "copied"
      });
      return {
        ok: true,
        reason: "copied"
      };
    }
    void logEquipmentRemoteAccessAttempt(equipment, {
      solution,
      id,
      ok: false,
      reason: "unsupported"
    });
    return {
      ok: false,
      reason: "unsupported"
    };
  }
  for (const target of targets) {
    try {
      window.open(target.url, "_blank", "noopener,noreferrer");
      void logEquipmentRemoteAccessAttempt(equipment, {
        solution,
        id,
        ok: true,
        reason: "opened"
      });
      return {
        ok: true,
        reason: "opened"
      };
    } catch {}
  }
  void logEquipmentRemoteAccessAttempt(equipment, {
    solution,
    id,
    ok: false,
    reason: "failed"
  });
  return {
    ok: false,
    reason: "failed"
  };
}
export function buildServerRemoteAccessApiFields(formData) {
  const {
    solution,
    id
  } = readServerRemoteAccessFromForm(formData);
  return {
    remoteAccessSolution: solution,
    remoteAccessId: id,
    anydeskId: solution === "anydesk" ? id : ""
  };
}
export function getServerRemoteAccessIcon(equipment) {
  const {
    solution
  } = readServerRemoteAccess(equipment);
  return getServerRemoteAccessSolutionDef(solution)?.icon || EQUIPMENT_REMOTE_ACTION_ICON;
}
export function getServerRemoteAccessActionIcon() {
  return EQUIPMENT_REMOTE_ACTION_ICON;
}
