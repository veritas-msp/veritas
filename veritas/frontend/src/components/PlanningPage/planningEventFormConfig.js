export const EVENT_FORM_SECTIONS = [{
  id: "general",
  label: "General",
  description: "Title, type, and client",
  icon: "mdi:calendar-text-outline"
}, {
  id: "schedule",
  label: "Dates",
  description: "Time slot and assignees",
  icon: "mdi:clock-outline"
}, {
  id: "objects",
  label: "Objects",
  description: "Linked equipment",
  icon: "mdi:cube-outline"
}];
export function getLinkedItemIcon(item) {
  const type = (item?.type || "").toLowerCase();
  const group = (item?.group || "").toLowerCase();
  if (type.includes("serveur")) return "mdi:server";
  if (type.includes("nas") || type.includes("san") || type.includes("stock")) return "mdi:harddisk";
  if (type.includes("firewall")) return "mdi:shield-outline";
  if (type.includes("switch")) return "mdi:lan";
  if (type.includes("wifi") || type.includes("borne")) return "mdi:wifi";
  if (type.includes("camera") || type.includes("cam")) return "mdi:cctv";
  if (type.includes("internet")) return "mdi:web";
  if (type.includes("office365") || group.includes("tenant")) return "mdi:microsoft-office";
  if (type.includes("antivirus")) return "mdi:shield-check";
  if (type.includes("antispam")) return "mdi:email-lock";
  if (type.includes("sauveg")) return "mdi:content-save-outline";
  if (type.includes("ndd")) return "mdi:domain";
  return "mdi:cube-outline";
}
