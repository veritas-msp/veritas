import { DEFAULT_METRICS, METRICS_FIELDS } from "./rmmMetricsStorageUtils";
export const COLLECTOR_GROUPS = {
  system: "System & network",
  hardware: "Hardware",
  monitoring: "Monitoring & security",
  sync: "Full inventory (sync)"
};
export const COLLECTORS = [{
  key: "os",
  group: "system",
  label: "Operating system",
  description: "Version, build, Windows edition, installation and last boot."
}, {
  key: "domain",
  group: "system",
  label: "Domain / workgroup",
  description: "Active Directory domain or workgroup membership."
}, {
  key: "network",
  group: "system",
  label: "Network",
  description: "Active adapters, IP, MAC, gateway and DNS."
}, {
  key: "session",
  group: "system",
  label: "User session",
  description: "Windows account currently logged in on the endpoint."
}, {
  key: "updates",
  group: "system",
  label: "Windows updates",
  description: "Recent hotfixes, pending updates/drivers and reboot required."
}, {
  key: "license",
  group: "system",
  label: "Windows license",
  description: "Windows edition activated on the endpoint."
}, {
  key: "chassis",
  group: "hardware",
  label: "Brand, model & serial number",
  description: "Manufacturer, endpoint model and BIOS serial number."
}, {
  key: "hardware",
  group: "hardware",
  label: "Hardware",
  description: "CPU, RAM, logical/physical disks and GPU."
}, {
  key: "performance",
  group: "monitoring",
  label: "Performance",
  description: "CPU load, RAM used, uptime and active processes."
}, {
  key: "sensors",
  group: "monitoring",
  label: "Sensors",
  description: "WMI temperatures and battery (laptops)."
}, {
  key: "security",
  group: "monitoring",
  label: "Local security",
  description: "Defender, firewall and BitLocker."
}, {
  key: "printers",
  group: "sync",
  label: "Printers",
  description: "Installed printers, driver, port and default printer.",
  syncOnly: true
}, {
  key: "shares",
  group: "sync",
  label: "Shares & mapped drives",
  description: "Mapped network drives and local Windows shares.",
  syncOnly: true
}, {
  key: "services",
  group: "sync",
  label: "Critical services",
  description: "Status of essential services (spooler, Defender, RPC…).",
  syncOnly: true
}, {
  key: "peripherals",
  group: "sync",
  label: "Displays & USB devices",
  description: "Connected monitors and USB/HID devices.",
  syncOnly: true
}, {
  key: "software",
  group: "sync",
  label: "Installed software",
  description: "Programs detected via the registry (150 max.). Collected only during a full sync.",
  syncOnly: true,
  heavy: true
}];
export function buildOverridesFromForm(global, form) {
  const overrides = {};
  if (form.customized.heartbeatIntervalMinutes) {
    overrides.heartbeatIntervalMinutes = form.values.heartbeatIntervalMinutes;
  }
  if (form.customized.offlineThresholdMinutes) {
    overrides.offlineThresholdMinutes = form.values.offlineThresholdMinutes;
  }
  if (form.customized.autoUpdateEnabled) {
    overrides.autoUpdateEnabled = form.values.autoUpdateEnabled !== false;
  }
  const collectors = {};
  for (const collector of COLLECTORS) {
    if (form.customized.collectors?.[collector.key]) {
      collectors[collector.key] = Boolean(form.values.collectors?.[collector.key]);
    }
  }
  if (Object.keys(collectors).length > 0) {
    overrides.collectors = collectors;
  }
  const metrics = {};
  for (const field of METRICS_FIELDS) {
    if (form.customized.metrics?.[field.key]) {
      metrics[field.key] = form.values.metrics?.[field.key];
    }
  }
  if (Object.keys(metrics).length > 0) {
    overrides.metrics = metrics;
  }
  return overrides;
}
export function formStateFromClientSettings(data) {
  const global = data?.global || {};
  const overrides = data?.overrides || {};
  const effective = data?.effective || global;
  const customized = {
    heartbeatIntervalMinutes: overrides.heartbeatIntervalMinutes != null,
    offlineThresholdMinutes: overrides.offlineThresholdMinutes != null,
    autoUpdateEnabled: overrides.autoUpdateEnabled !== undefined && overrides.autoUpdateEnabled !== null,
    collectors: {},
    metrics: {}
  };
  for (const collector of COLLECTORS) {
    customized.collectors[collector.key] = overrides.collectors?.[collector.key] !== undefined && overrides.collectors?.[collector.key] !== null;
  }
  for (const field of METRICS_FIELDS) {
    customized.metrics[field.key] = overrides.metrics?.[field.key] !== undefined && overrides.metrics?.[field.key] !== null;
  }
  return {
    useCustom: Boolean(data?.hasCustomConfig),
    customized,
    values: {
      heartbeatIntervalMinutes: effective.heartbeatIntervalMinutes,
      offlineThresholdMinutes: effective.offlineThresholdMinutes,
      autoUpdateEnabled: effective.autoUpdateEnabled !== false,
      collectors: {
        ...effective.collectors
      },
      metrics: {
        ...(effective.metrics || DEFAULT_METRICS)
      }
    },
    global
  };
}
