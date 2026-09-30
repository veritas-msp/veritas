import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import { buildMetricSnapshot, formatPct, formatStorageGB, resolveInstantDiskDrives } from "./rmmMetricDashboardUtils";
import {
  buildRmmAgentRowFromEquipment,
  getRmmChassisInfo,
  getRmmInventoryFromEquipment,
  getRmmNetbiosName,
  getPerformanceSummary,
  getRmmOsEditionInfo,
  getSensorSummary,
  resolveRmmUptimeLabel
} from "./rmmMonitoringUtils";
import styles from "./RmmHardwareOverview.module.css";

function toneForPct(pct, warn = 70, critical = 90) {
  if (pct == null) return "neutral";
  if (pct >= critical) return "critical";
  if (pct >= warn) return "warn";
  return "good";
}

function KvList({ items }) {
  const visible = items.filter(item => item?.value != null && item.value !== "");
  if (!visible.length) return null;
  return (
    <ul className={styles.kvList}>
      {visible.map(item => (
        <li key={`${item.label}-${item.value}`}>
          <span className={styles.kvLabel}>{item.label}</span>
          <span className={styles.kvValue} title={String(item.value)}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

function ResourceCell({ icon, label, value, sub, meterPct, meterTone, trailing = null, accent = "cpu" }) {
  return (
    <div className={`${styles.resourceCell} ${styles[`resourceCell_${accent}`] || ""}`}>
      <div className={`${styles.resourceIcon} ${styles[`resourceIcon_${accent}`] || ""}`} aria-hidden>
        <Icon icon={icon} width={26} height={26} />
      </div>
      <div className={styles.resourceBody}>
        <p className={styles.resourceLabel}>{label}</p>
        <div className={styles.resourceValueRow}>
          <p className={styles.resourceValue}>{value}</p>
          {trailing}
        </div>
        {meterPct != null && Number.isFinite(Number(meterPct)) ? (
          <div className={styles.meter} aria-hidden>
            <div
              className={`${styles.meterFill} ${styles[`meter_${meterTone}`] || ""}`}
              style={{ width: `${Math.max(0, Math.min(100, Number(meterPct)))}%` }}
            />
          </div>
        ) : null}
        {sub ? <p className={styles.resourceSub} title={sub}>{sub}</p> : null}
      </div>
    </div>
  );
}

function InfoCell({ icon, label, headline, items }) {
  return (
    <div className={styles.infoCell}>
      <div className={styles.infoCellHead}>
        <Icon icon={icon} className={styles.infoCellIcon} aria-hidden />
        <p className={styles.infoCellLabel}>{label}</p>
      </div>
      {headline != null && headline !== "" ? (
        <p className={styles.infoCellHeadline} title={String(headline)}>{headline}</p>
      ) : null}
      <KvList items={items} />
    </div>
  );
}

function RamSlotsInline({ modules = [], slotCount, copy }) {
  const used = modules.length;
  const slots = Math.max(Number(slotCount) || 0, used);
  if (!slots && !used) return null;
  const total = Math.max(slots, used, 1);
  return (
    <span className={styles.ramSlotsInline} role="list" aria-label={copy.ramSlotsAria} title={`${used} / ${total} ${copy.ramSlotsUsed}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          role="listitem"
          className={`${styles.ramDot} ${index < used ? "" : styles.ramDotEmpty}`}
        />
      ))}
    </span>
  );
}

function detectDiskKind(disk) {
  const hay = `${disk?.model || ""} ${disk?.interface || ""}`.toLowerCase();
  if (hay.includes("nvme") || hay.includes("ssd") || hay.includes("solid")) return "ssd";
  if (hay.includes("usb") || hay.includes("external")) return "external";
  return "hdd";
}

export default function RmmHardwareOverview({ equipment, variant = "full" }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const ov = copy.rmm.overview;
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const metricAgent = useMemo(() => buildRmmAgentRowFromEquipment(equipment), [equipment]);
  const snapshot = useMemo(() => buildMetricSnapshot(metricAgent), [metricAgent]);
  const drives = useMemo(() => resolveInstantDiskDrives(snapshot), [snapshot]);
  const perf = useMemo(() => getPerformanceSummary(inventory), [inventory]);
  const sensor = useMemo(() => getSensorSummary(inventory), [inventory]);
  const osEdition = useMemo(() => getRmmOsEditionInfo(inventory, equipment), [inventory, equipment]);
  const chassis = getRmmChassisInfo(inventory);
  const hardware = inventory.hardware || {};
  const network = inventory.network || {};
  const domain = inventory.domain || {};
  const gpus = Array.isArray(hardware.gpus) ? hardware.gpus : [];
  const physicalDisks = Array.isArray(hardware.physicalDisks) ? hardware.physicalDisks : [];
  const uptimeLabel = useMemo(() => resolveRmmUptimeLabel(inventory), [inventory]);
  const ip = equipment?.ip || network.ip || inventory.ip || null;
  const mac = equipment?.mac || network.mac || inventory.mac || null;
  const domainLabel =
    equipment?.domaine ||
    inventory.domaine ||
    (domain.joined ? domain.name : domain.workgroup || domain.name) ||
    null;
  const totalStorageGB = drives.reduce((sum, d) => sum + (Number(d.sizeGB) || 0), 0);
  const usedStorageGB = drives.reduce((sum, d) => sum + (Number(d.usedGB) || 0), 0);
  const storagePct = totalStorageGB > 0 ? Math.round((usedStorageGB / totalStorageGB) * 100) : snapshot.diskPct;
  const primaryGpu = gpus[0] || null;
  const ramModules = Array.isArray(hardware.ramModules)
    ? hardware.ramModules
        .map(module => ({
          ...module,
          capacityGB: module?.capacityGB ?? module?.capacityGb ?? null
        }))
        .filter(module => module.capacityGB != null && Number(module.capacityGB) > 0)
    : [];
  const ramSlotCount = Number(hardware.ramSlotCount) > 0 ? Number(hardware.ramSlotCount) : ramModules.length || null;
  const diskKinds = physicalDisks.length ? physicalDisks.map(detectDiskKind) : ["hdd"];
  const hasSsd = diskKinds.includes("ssd");
  const hasHdd = diskKinds.includes("hdd") || diskKinds.includes("external");
  const storageIcon = hasSsd && !hasHdd ? "mdi:harddisk-plus" : "mdi:harddisk";
  const cpuIcon = "mdi:cpu-64-bit";
  const ramIcon = "mdi:memory";
  const cpuName = hardware.cpu || inventory.processeur || ov.unknown;
  const ramLine =
    snapshot.ramUsedGB != null && snapshot.ramTotalGB != null
      ? `${formatStorageGB(snapshot.ramUsedGB)} / ${formatStorageGB(snapshot.ramTotalGB)} Go`
      : null;
  const storageLine =
    usedStorageGB > 0 && totalStorageGB > 0
      ? `${formatStorageGB(usedStorageGB)} / ${formatStorageGB(totalStorageGB)} Go`
      : totalStorageGB > 0
        ? `${formatStorageGB(totalStorageGB)} Go`
        : null;
  const firstModule = ramModules[0] || null;
  const ramSpeed = firstModule?.speedMHz != null ? `${firstModule.speedMHz} MHz` : null;
  const coresLabel =
    hardware.cores != null
      ? `${hardware.cores}${hardware.logicalProcessors != null ? ` / ${hardware.logicalProcessors}` : ""}`
      : null;
  const showChassis = Boolean(chassis.manufacturer || chassis.model || chassis.serial);
  const showBattery = Boolean(sensor.battery?.present);
  const infoRowClass = showChassis ? styles.infoRow : `${styles.infoRow} ${styles.infoRow_3}`;
  const showResources = variant === "full" || variant === "resources";
  const showIdentity = variant === "full" || variant === "identity";
  const showBatteryPanel = showBattery && (variant === "full" || variant === "identity");

  const resourcesPanel = (
    <article className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>
          <Icon icon="mdi:gauge" className={styles.panelTitleIcon} aria-hidden />
          {ov.resourcesTitle}
        </h3>
      </div>
      <div className={styles.resourceRow}>
        <ResourceCell
          icon={cpuIcon}
          accent="cpu"
          label={ov.cpu}
          value={snapshot.cpuPct != null ? formatPct(snapshot.cpuPct) : ov.unknown}
          sub={[cpuName, coresLabel, hardware.currentClockMHz != null ? `${hardware.currentClockMHz} MHz` : null, perf.processCount != null ? `${perf.processCount} ${ov.appsRunning}` : null]
            .filter(Boolean)
            .join(" · ")}
          meterPct={snapshot.cpuPct}
          meterTone={toneForPct(snapshot.cpuPct)}
        />
        <ResourceCell
          icon={ramIcon}
          accent="ram"
          label={ov.memory}
          value={snapshot.ramPct != null ? formatPct(snapshot.ramPct) : ov.unknown}
          sub={[ramLine, ramSpeed].filter(Boolean).join(" · ") || null}
          meterPct={snapshot.ramPct}
          meterTone={toneForPct(snapshot.ramPct, 70, 90)}
          trailing={<RamSlotsInline modules={ramModules} slotCount={ramSlotCount} copy={ov} />}
        />
        <ResourceCell
          icon={storageIcon}
          accent="storage"
          label={ov.storage}
          value={storagePct != null ? formatPct(storagePct) : ov.unknown}
          sub={[
            storageLine,
            drives.length ? `${drives.length} ${ov.driveCount}` : null,
            drives
              .slice(0, 2)
              .map(d => `${d.label}${d.pct != null ? ` ${formatPct(d.pct)}` : ""}`)
              .join(" · ") || null
          ]
            .filter(Boolean)
            .join(" · ")}
          meterPct={storagePct}
          meterTone={toneForPct(storagePct, 75, 90)}
        />
      </div>
    </article>
  );

  if (variant === "resources") {
    return (
      <section className={styles.root} aria-label={ov.aria}>
        {resourcesPanel}
      </section>
    );
  }

  return (
    <section className={styles.root} aria-label={ov.aria}>
      {showResources ? resourcesPanel : null}

      {showIdentity ? (
      <article className={styles.panel}>
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle}>
            <Icon icon="mdi:desktop-classic" className={styles.panelTitleIcon} aria-hidden />
            {ov.identityTitle}
          </h3>
        </div>
        <div className={infoRowClass}>
          <InfoCell
            icon="mdi:microsoft-windows"
            label={ov.system}
            headline={osEdition.edition || osEdition.osCaption || ov.unknown}
            items={[
              { label: ov.whoUses, value: inventory.loggedUser || inventory.session?.user || null },
              { label: ov.pcName, value: getRmmNetbiosName(equipment) },
              { label: ov.domainShort, value: domainLabel },
              { label: ov.uptime, value: uptimeLabel }
            ]}
          />
          {showChassis ? (
            <InfoCell
              icon="mdi:desktop-classic"
              label={ov.chassis}
              headline={chassis.model || chassis.manufacturer || ov.unknown}
              items={[
                { label: ov.serialShort, value: chassis.serial || null },
                {
                  label: ov.brand,
                  value: chassis.manufacturer && chassis.model ? chassis.manufacturer : null
                },
                { label: ov.heat, value: sensor.maxTempLabel || null }
              ]}
            />
          ) : null}
          <InfoCell
            icon="mdi:expansion-card-variant"
            label={ov.gpu}
            headline={primaryGpu?.name || ov.gpuMissing}
            items={
              primaryGpu
                ? [
                    { label: ov.driver, value: primaryGpu.driver || null },
                    { label: ov.vram, value: primaryGpu.ramMB != null ? `${primaryGpu.ramMB} Mo` : null },
                    {
                      label: ov.otherGpus,
                      value: gpus.length > 1 ? gpus.slice(1).map(g => g.name).filter(Boolean).join(", ") : null
                    }
                  ]
                : []
            }
          />
          <InfoCell
            icon="mdi:lan"
            label={ov.network}
            headline={ip || ov.unknown}
            items={[
              { label: ov.macShort, value: mac },
              { label: ov.gatewayShort, value: network.gateway || null },
              { label: "DNS", value: network.dns || null }
            ]}
          />
        </div>
      </article>
      ) : null}

      {showBatteryPanel ? (
        <article className={styles.panel}>
          <div className={styles.resourceRow} style={{ gridTemplateColumns: "1fr" }}>
            <ResourceCell
              icon="mdi:battery-medium"
              label={ov.battery}
              value={sensor.battery.chargePct != null ? `${sensor.battery.chargePct}%` : ov.unknown}
              sub={sensor.battery.status || null}
              meterPct={sensor.battery.chargePct}
              meterTone={toneForPct(100 - (sensor.battery.chargePct ?? 100), 40, 70)}
            />
          </div>
        </article>
      ) : null}
    </section>
  );
}
