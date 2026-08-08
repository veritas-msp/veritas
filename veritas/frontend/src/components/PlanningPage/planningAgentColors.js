export const PLANNING_AGENT_PALETTE = ["#2563eb", "#7c3aed", "#c026d3", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#0d9488", "#4f46e5", "#9333ea", "#0369a1", "#b45309", "#15803d", "#be123c"];
const UNASSIGNED_COLOR = "#64748b";
function hashUserId(userId) {
  const id = String(userId || "");
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
export function getAgentColor(userId) {
  if (!userId) return UNASSIGNED_COLOR;
  const index = hashUserId(userId) % PLANNING_AGENT_PALETTE.length;
  return PLANNING_AGENT_PALETTE[index];
}
export function getEventPrimaryAgentId(event) {
  if (!event) return null;
  if (Array.isArray(event.assignedUserIds) && event.assignedUserIds.length > 0) {
    return String(event.assignedUserIds[0]);
  }
  if (event.assignedUserId) return String(event.assignedUserId);
  if (event._rawData?.assigned_user_id) return String(event._rawData.assigned_user_id);
  return null;
}
export function getPlanningEventColors(event, agentId = null) {
  const resolvedAgentId = agentId || getEventPrimaryAgentId(event);
  const color = getAgentColor(resolvedAgentId);
  return {
    backgroundColor: color,
    borderColor: color
  };
}
