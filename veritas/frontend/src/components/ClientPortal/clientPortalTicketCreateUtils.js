import { mapClientHardwareEquipment } from "../../api/equipment";
export function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
export function buildAvailabilityContactSlots({
  mode,
  date,
  startTime,
  endTime,
  note
}) {
  if (mode === "none") return [];
  const slotDate = String(date || "").trim();
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();
  const slotNote = String(note || "").trim();
  if (mode === "from") {
    if (!slotDate && !start && !slotNote) return [];
    return [{
      date: slotDate,
      startTime: start,
      endTime: "",
      note: slotNote,
      mode: "from"
    }];
  }
  if (!slotDate && !start && !end && !slotNote) return [];
  return [{
    date: slotDate,
    startTime: start,
    endTime: end,
    note: slotNote,
    mode: "range"
  }];
}
export function serializeContactSlots(slots) {
  return slots.map(({
    date,
    startTime,
    endTime,
    note
  }) => ({
    date: String(date || "").trim(),
    startTime: String(startTime || "").trim(),
    endTime: String(endTime || "").trim(),
    note: String(note || "").trim()
  })).filter(slot => slot.date || slot.startTime || slot.endTime || slot.note);
}
export function formatContactSlotLabel(slot, copy) {
  if (copy?.formatContactSlotLabel) return copy.formatContactSlotLabel(slot);
  const slotDate = slot?.date || "-";
  const noteSuffix = slot?.note ? ` · ${slot.note}` : "";
  if (slot?.mode === "from" || !slot?.endTime && slot?.startTime) {
    return `${slotDate} ${slot.startTime || "-"}${noteSuffix}`;
  }
  return `${slotDate} · ${slot.startTime || "-"} – ${slot.endTime || "-"}${noteSuffix}`;
}
export function buildPortalClientEquipments(dashboard) {
  if (!dashboard?.client?.id) return [];
  const clientId = String(dashboard.client.id);
  const items = [];
  const seen = new Set();
  const pushItem = entry => {
    const id = String(entry?.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    items.push({
      id,
      clientId,
      type: String(entry.type || "").trim(),
      name: String(entry.name || "").trim(),
      serial: String(entry.serial || "").trim()
    });
  };
  if (Array.isArray(dashboard.computers) && dashboard.computers.length > 0) {
    mapClientHardwareEquipment({
      id: clientId,
      equipements: {
        Ordinateurs: dashboard.computers
      }
    }).forEach(eq => pushItem({
      id: eq.id,
      type: eq.type || "Ordinateur",
      name: eq.name || eq.model,
      serial: eq.serial
    }));
  }
  const groups = [...(Array.isArray(dashboard.infrastructure) ? dashboard.infrastructure : []), ...(Array.isArray(dashboard.cloudServices) ? dashboard.cloudServices : [])];
  groups.forEach(group => {
    const groupLabel = group?.label || group?.type || "Equipment";
    (group?.items || []).forEach(item => {
      if (item?.active === false) return;
      pushItem({
        id: item.id,
        type: groupLabel,
        name: item.name || item.label || groupLabel,
        serial: item.serial || item.serial_number || ""
      });
    });
  });
  return items;
}
export function getEquipmentTypeLabel(type, copy) {
  if (type === "Ordinateur") return copy?.fleet?.chartLabels?.computer ?? type;
  if (type === "Equipment") return copy?.fleet?.chartLabels?.equipment ?? type;
  return type;
}
export function getEquipmentLinkLabel(equipment, copy) {
  if (!equipment) return "";
  const serialPrefix = copy?.ticket?.create?.serialPrefix ?? "SN";
  const typeLabel = getEquipmentTypeLabel(equipment.type, copy);
  const serial = equipment.serial ? ` (${serialPrefix}: ${equipment.serial})` : "";
  return `${typeLabel} · ${equipment.name}${serial}`;
}
export function getEquipmentLinkSearchText(equipment) {
  return [equipment?.type, equipment?.name, equipment?.serial, equipment?.id].filter(Boolean).join(" ").toLowerCase();
}
