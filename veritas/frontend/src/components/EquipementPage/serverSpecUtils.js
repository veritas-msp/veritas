export const MEMORY_UNITS = [{
  value: "Go",
  label: "Go"
}, {
  value: "To",
  label: "To"
}];
export const STORAGE_MEDIA_TYPES = [{
  value: "SSD",
  label: "SSD"
}, {
  value: "HDD",
  label: "HDD"
}, {
  value: "NVMe",
  label: "NVMe"
}];
export const CPU_MODEL_PRESETS = ["Intel Xeon Silver 4314", "Intel Xeon Silver 4410Y", "Intel Xeon Gold 5318Y", "Intel Xeon Gold 6338", "Intel Xeon Gold 6430", "AMD EPYC 7543", "AMD EPYC 9354", "AMD EPYC 9654"];
export const MEMORY_PRESETS = [{
  amount: "8",
  unit: "Go"
}, {
  amount: "16",
  unit: "Go"
}, {
  amount: "32",
  unit: "Go"
}, {
  amount: "64",
  unit: "Go"
}, {
  amount: "128",
  unit: "Go"
}, {
  amount: "256",
  unit: "Go"
}, {
  amount: "512",
  unit: "Go"
}];
export const VCPU_PRESETS = ["2", "4", "8", "12", "16", "24", "32"];
export const STORAGE_CAPACITY_PRESETS = [{
  capacity: "120",
  unit: "Go"
}, {
  capacity: "240",
  unit: "Go"
}, {
  capacity: "480",
  unit: "Go"
}, {
  capacity: "960",
  unit: "Go"
}, {
  capacity: "1,92",
  unit: "To"
}, {
  capacity: "3,84",
  unit: "To"
}, {
  capacity: "7,68",
  unit: "To"
}];
const EMPTY_STORAGE_VOLUME = () => ({
  count: "1",
  capacity: "",
  unit: "Go",
  media: "SSD"
});
function sanitizeCount(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}
export function sanitizeDecimalInput(value) {
  const raw = String(value ?? "").replace(/[^\d.,]/g, "");
  if (!raw) return "";
  const separatorIndex = raw.search(/[.,]/);
  if (separatorIndex === -1) return raw;
  const head = raw.slice(0, separatorIndex + 1);
  const tail = raw.slice(separatorIndex + 1).replace(/[.,]/g, "");
  return `${head}${tail}`;
}
function normalizeUnit(raw, fallback = "Go") {
  const unit = String(raw || "").trim().toUpperCase();
  if (unit === "TB" || unit === "TO") return "To";
  if (unit === "GB" || unit === "GO") return "Go";
  if (unit === "MB" || unit === "MO") return "Mo";
  return fallback;
}
function formatDecimalFr(value) {
  const sanitized = sanitizeDecimalInput(value);
  if (!sanitized) return "";
  return sanitized.replace(".", ",");
}
function parseDecimal(value) {
  const normalized = String(value || "").trim().replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
export function parseMemory(value) {
  const raw = String(value || "").trim();
  if (!raw) return {
    amount: "",
    unit: "Go"
  };
  const match = raw.match(/^([\d.,]+)\s*(Go|GB|To|TB|Mo|MB)?$/i);
  if (!match) return {
    amount: raw,
    unit: "Go"
  };
  return {
    amount: formatDecimalFr(match[1]),
    unit: normalizeUnit(match[2], "Go")
  };
}
export function formatMemory({
  amount,
  unit
}) {
  const formattedAmount = formatDecimalFr(amount);
  if (!formattedAmount) return "";
  return `${formattedAmount} ${unit || "Go"}`;
}
export function parseCpu(value, {
  isVirtual = false
} = {}) {
  const raw = String(value || "").trim();
  if (!raw) return {
    count: isVirtual ? "" : "1",
    model: ""
  };
  if (isVirtual) {
    const match = raw.match(/^(\d+)\s*vCPU/i);
    return {
      count: match?.[1] || sanitizeCount(raw),
      model: ""
    };
  }
  const structured = raw.match(/^(\d+)\s*[×xX*]\s*(.+)$/);
  if (structured) {
    return {
      count: structured[1] || "1",
      model: structured[2].trim()
    };
  }
  if (/^\d+$/.test(raw)) {
    return {
      count: raw,
      model: ""
    };
  }
  return {
    count: "1",
    model: raw
  };
}
export function formatCpu({
  count,
  model
}, {
  isVirtual = false
} = {}) {
  if (isVirtual) {
    const vcpu = sanitizeCount(count);
    return vcpu ? `${vcpu} vCPU` : "";
  }
  const modelLabel = String(model || "").trim();
  if (!modelLabel) return "";
  const cpuCount = sanitizeCount(count) || "1";
  const numericCount = parseInt(cpuCount, 10) || 1;
  return numericCount > 1 ? `${numericCount} × ${modelLabel}` : modelLabel;
}
export function parseStorageVolumes(value) {
  const raw = String(value || "").trim();
  if (!raw) return [EMPTY_STORAGE_VOLUME()];
  const parts = raw.split(/\s*\+\s*/).map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return [EMPTY_STORAGE_VOLUME()];
  return parts.map(part => {
    const match = part.match(/^(\d+)\s*[×xX*]\s*([\d.,]+)\s*(Go|GB|To|TB|Mo|MB)?\s*(SSD|HDD|NVMe)?$/i);
    if (match) {
      return {
        count: match[1] || "1",
        capacity: formatDecimalFr(match[2]),
        unit: normalizeUnit(match[3], "Go"),
        media: String(match[4] || "SSD").toUpperCase() === "HDD" ? "HDD" : String(match[4] || "SSD").toUpperCase() === "NVME" ? "NVMe" : "SSD"
      };
    }
    const simple = part.match(/^([\d.,]+)\s*(Go|GB|To|TB|Mo|MB)?\s*(SSD|HDD|NVMe)?$/i);
    if (simple) {
      return {
        count: "1",
        capacity: formatDecimalFr(simple[1]),
        unit: normalizeUnit(simple[2], "Go"),
        media: String(simple[3] || "SSD").toUpperCase() === "HDD" ? "HDD" : String(simple[3] || "SSD").toUpperCase() === "NVME" ? "NVMe" : "SSD"
      };
    }
    return {
      count: "1",
      capacity: "",
      unit: "Go",
      media: "SSD",
      legacyText: part
    };
  });
}
export function formatStorageVolumes(volumes) {
  const formatted = (Array.isArray(volumes) ? volumes : []).map(volume => {
    const capacity = formatDecimalFr(volume?.capacity);
    if (!capacity) return "";
    const unit = volume?.unit || "Go";
    const media = volume?.media ? ` ${volume.media}` : "";
    const count = parseInt(sanitizeCount(volume?.count), 10) || 1;
    const label = `${capacity} ${unit}${media}`;
    return count > 1 ? `${count} × ${label}` : label;
  }).filter(Boolean);
  return formatted.join(" + ");
}
export function formatStorageHint(volumes) {
  const parsed = (Array.isArray(volumes) ? volumes : []).map(volume => {
    const capacity = parseDecimal(volume?.capacity);
    if (!capacity) return 0;
    const unit = volume?.unit || "Go";
    const count = parseInt(sanitizeCount(volume?.count), 10) || 1;
    const goValue = unit === "To" ? capacity * 1024 : capacity;
    return goValue * count;
  });
  const totalGo = parsed.reduce((sum, value) => sum + value, 0);
  if (!totalGo) return "";
  if (totalGo >= 1024) {
    const to = totalGo / 1024;
    return to % 1 === 0 ? `${to} To` : `${to.toFixed(1).replace(".", ",")} To`;
  }
  return `${Math.round(totalGo)} Go`;
}
