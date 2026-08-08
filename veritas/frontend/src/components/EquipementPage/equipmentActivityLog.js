import { logEquipmentActivity } from "../../api/equipment";
import { getEquipmentClientId, getEquipmentDbId } from "../../utils/equipmentIdentity";
import { getServerRemoteAccessSolutionDef } from "./constants/serverRemoteAccessUtils";
function getEquipmentLogName(equipment) {
  return equipment?.name || equipment?.rawData?.nom || equipment?.rawData?.name || "";
}
function getEquipmentLogType(equipment) {
  return equipment?.type || equipment?.rawData?.type || "";
}
async function writeEquipmentActivityLog(equipment, action, details) {
  const clientId = getEquipmentClientId(equipment);
  const equipmentId = getEquipmentDbId(equipment);
  const name = getEquipmentLogName(equipment);
  const type = getEquipmentLogType(equipment);
  if (!clientId || !name || !type) return;
  try {
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
  const def = getServerRemoteAccessSolutionDef(solution);
  const solutionLabel = def?.label || solution || "Prise en main";
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
