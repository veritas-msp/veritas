const EQUIPMENT_COUNT_KEYS = ["Internet", "Firewalls", "Serveurs", "Stockage", "Switch", "BorneWifi", "Alimentation", "Routeur", "TOIP", "Ordinateurs"];
export function getClientDeletionBlockers(client) {
  return client?.deletion_blockers || client?.deletion?.blockers || [];
}
export function sumEquipmentCounts(client) {
  const counts = client?.equipmentCounts;
  if (!counts || typeof counts !== "object") return 0;
  return EQUIPMENT_COUNT_KEYS.reduce((sum, key) => sum + (Number(counts[key]) || 0), 0);
}
export function hasDeletionMetadata(client) {
  if (!client) return false;
  return client.deletion !== undefined || client.deletable !== undefined || Array.isArray(client.deletion_blockers);
}
export function isClientDeletable(client) {
  if (!client) return false;
  const blockers = getClientDeletionBlockers(client);
  if (blockers.length > 0) return false;
  if (client.deletable === false) return false;
  if (sumEquipmentCounts(client) > 0) return false;
  if (hasDeletionMetadata(client)) {
    return client.deletable !== false;
  }
  return false;
}
