import { EQUIPMENT_REMOTE_ACTION_ICON } from "../equipmentRemoteAccessUtils";
import {
  SERVER_REMOTE_ACCESS_LABEL,
  SERVER_REMOTE_ACCESS_SOLUTIONS,
  normalizeRemoteAccessSolution,
  normalizeRemoteAccessId,
  getServerRemoteAccessSolutionDef,
  readServerRemoteAccess,
  readServerRemoteAccessFromForm,
  hasServerRemoteAccessConfigured,
  buildServerRemoteAccessLaunchTargets,
  buildServerRemoteAccessApiFields,
  getServerRemoteAccessTooltip
} from "./serverRemoteAccessCore";

export {
  SERVER_REMOTE_ACCESS_LABEL,
  SERVER_REMOTE_ACCESS_SOLUTIONS,
  normalizeRemoteAccessSolution,
  normalizeRemoteAccessId,
  getServerRemoteAccessSolutionDef,
  readServerRemoteAccess,
  readServerRemoteAccessFromForm,
  hasServerRemoteAccessConfigured,
  buildServerRemoteAccessLaunchTargets,
  buildServerRemoteAccessApiFields,
  getServerRemoteAccessTooltip
};

function logRemoteAccessAttempt(equipment, payload) {
  void import("../equipmentActivityLog")
    .then(mod => mod.logEquipmentRemoteAccessAttempt?.(equipment, payload))
    .catch(() => {});
}

export function openServerRemoteAccess(equipment) {
  const {
    solution,
    id
  } = readServerRemoteAccess(equipment);
  if (!id) {
    void logRemoteAccessAttempt(equipment, {
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
      void logRemoteAccessAttempt(equipment, {
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
    void logRemoteAccessAttempt(equipment, {
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
      void logRemoteAccessAttempt(equipment, {
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
  void logRemoteAccessAttempt(equipment, {
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

export function getServerRemoteAccessIcon(equipment) {
  const {
    solution
  } = readServerRemoteAccess(equipment);
  return getServerRemoteAccessSolutionDef(solution)?.icon || EQUIPMENT_REMOTE_ACTION_ICON;
}

export function getServerRemoteAccessActionIcon() {
  return EQUIPMENT_REMOTE_ACTION_ICON;
}
