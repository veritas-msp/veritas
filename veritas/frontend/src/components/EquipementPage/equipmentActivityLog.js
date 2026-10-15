import { getEquipmentClientId, getEquipmentDbId } from "../../utils/equipmentIdentity";

// Keep this module free of static imports from api/equipment and serverRemoteAccessUtils
// to avoid circular TDZ crashes (api/equipment → equipmentFormConfig → serverRemoteAccessUtils).
const REMOTE_ACCESS_LABELS = {
  anydesk: "AnyDesk",
  teamviewer: "TeamViewer",
  rustdesk: "RustDesk",
  splashtop: "Splashtop",
  rdp: "Remote desktop (RDP)",
  other: "Other"
};

function getEquipmentLogName(equipment) {
  return equipment?.name || equipment?.rawData?.nom || equipment?.rawData?.name || "";
}

function getEquipmentLogType(equipment) {
  return equipment?.type || equipment?.rawData?.type || "";
}

function resolveRemoteAccessSolutionLabel(solution) {
  const key = String(solution || "").trim().toLowerCase();
  return REMOTE_ACCESS_LABELS[key] || solution || "Prise en main";
}

async function writeEquipmentActivityLog(equipment, action, details) {
  const clientId = getEquipmentClientId(equipment);
  const equipmentId = getEquipmentDbId(equipment);
  const name = getEquipmentLogName(equipment);
  const type = getEquipmentLogType(equipment);
  if (!clientId || !name || !type) return;
  try {
    const { logEquipmentActivity } = await import("../../api/equipment");
    await logEquipmentActivity({
      clientId,
      type,
      name,
      equipmentId,
      action,
      details
    });
  } catch (error) {
    console.warn("Journal hardware:", error);
  }
}

function buildRemoteAccessOutcomeLabel(reason, ok) {
  if (ok && reason === "opened") return "Client distant ouvert";
  if (ok && reason === "copied") return "ID copied to clipboard";
  if (reason === "missing") return "Configuration absente";
  if (reason === "unsupported") return "Solution not supported for automatic opening";
  if (reason === "failed") return "Failed to open";
  return ok ? "Attempt succeeded" : "Attempt failed";
}

export async function logEquipmentRemoteAccessAttempt(equipment, {
  solution,
  id,
  ok,
  reason
}) {
  const solutionLabel = resolveRemoteAccessSolutionLabel(solution);
  const success = Boolean(ok);
  const action = success ? `Login distante · ${solutionLabel}` : `Tentative connexion distante · ${solutionLabel}`;
  await writeEquipmentActivityLog(equipment, action, {
    kind: "remote_access",
    solution: solution || null,
    solutionLabel,
    targetId: id || null,
    outcome: reason || null,
    outcomeLabel: buildRemoteAccessOutcomeLabel(reason, success),
    success
  });
}

export async function logEquipmentQuickConnectAttempt(equipment, {
  url,
  ok,
  reason
}) {
  const action = ok ? "Login distante · QuickConnect" : "Tentative connexion distante · QuickConnect";
  await writeEquipmentActivityLog(equipment, action, {
    kind: "quick_connect",
    url: url || null,
    outcome: reason || null,
    success: Boolean(ok)
  });
}
