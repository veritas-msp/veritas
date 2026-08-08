export function aggregateAntivirusEquipementFromRows(rows = []) {
  const items = (Array.isArray(rows) ? rows : []).map(row => {
    let data = row?.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    } else if (!data || typeof data !== "object") {
      data = {};
    }
    return {
      ...row,
      data
    };
  }).filter(item => {
    if (!item.data || typeof item.data !== "object") return false;
    const dataKeys = Object.keys(item.data);
    if (dataKeys.length === 1 && item.data.enabled === true) return false;
    if (item.item_key && String(item.item_key).startsWith("solution-")) return true;
    const hasSolutions = Array.isArray(item.data.solutions) && item.data.solutions.length > 0;
    const hasSolution = typeof item.data.solution === "string" && item.data.solution.trim() !== "";
    const hasLogiciel = typeof item.data.logiciel === "string" && item.data.logiciel.trim() !== "";
    if (hasSolutions || hasSolution || hasLogiciel) return true;
    if (dataKeys.length > 0 && !(dataKeys.length === 1 && dataKeys[0] === "enabled")) {
      return true;
    }
    return false;
  });
  if (items.length === 0) return {
    solutions: []
  };
  const firstItem = items[0];
  if (Array.isArray(firstItem.data.solutions) && firstItem.data.solutions.length > 0 && items.length === 1) {
    return firstItem.data;
  }
  const sortedItems = [...items].sort((a, b) => {
    const nameA = a.name || a.item_key || "";
    const nameB = b.name || b.item_key || "";
    return nameA.localeCompare(nameB);
  });
  return {
    solutions: sortedItems.map(item => ({
      id: item.id,
      ...item.data
    }))
  };
}
