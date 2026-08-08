import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import { buildMetricSnapshot, formatPct, formatStorageGB, resolveInstantDiskDrives } from "./rmmMetricDashboardUtils";
import { buildRmmAgentRowFromEquipment, getRmmChassisInfo, getRmmInventoryFromEquipment, getRmmNetbiosName, getPerformanceSummary, getRmmOsEditionInfo, getSensorSummary, resolveRmmUptimeLabel } from "./rmmMonitoringUtils";
import styles from "./RmmHardwareOverview.module.css";

function toneForPct(pct, warn = 70, critical = 90) {
  if (pct == null) return "neutral";
  if (pct >= critical) return "critical";
  if (pct >= warn) return "warn";
  return "good";
}

function HardwareCard({
  icon,
  title,
  accent = "default",
  headline,
  headlineHint,
  meterPct,
  meterTone,
  facts = [],
  board = null
}) {
  const visibleFacts = facts.filter(fact => fact?.value != null && fact.value !== "");
  return <article className={`${styles.card} ${styles[`card_${accent}`] || ""}`}>
      <div className={styles.cardVisual} aria-hidden>
        <Icon icon={icon} className={styles.cardIcon} />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardEyebrow}>{title}</p>
        {headline != null && headline !== "" ? <p className={styles.cardHeadline}>{headline}</p> : null}
        {headlineHint ? <p className={styles.cardHint}>{headlineHint}</p> : null}
        {meterPct != null && Number.isFinite(Number(meterPct)) ? <div className={styles.meter} aria-hidden>
            <div className={`${styles.meterFill} ${styles[`meter_${meterTone}`] || ""}`} style={{
          width: `${Math.max(0, Math.min(100, Number(meterPct)))}%`
        }} />
          </div> : null}
        {board}
        {visibleFacts.length > 0 ? <ul className={styles.factList}>
            {visibleFacts.map(fact => <li key={`${fact.label}-${fact.value}`}>
                <span className={styles.factLabel}>{fact.label}</span>
                <strong className={styles.factValue}>{fact.value}</strong>
              </li>)}
          </ul> : null}
      </div>
    </article>;
}

function RamSlotsBoard({
  modules = [],
  slotCount,
  copy
}) {
  const used = modules.length;
  const slots = Math.max(Number(slotCount) || 0, used, used > 0 ? used : 0);
  if (!slots && !used) {
    return <p className={styles.ramSlotsMissing}>{copy.ramSlotsMissing}</p>;
  }
  const total = Math.max(slots, used, 1);
  const items = Array.from({
    length: total
  }, (_, index) => {
    const module = modules[index] || null;
    return {
      index,
      filled: Boolean(module),
      module
    };
  });
  return <div className={styles.ramBoard}>
      <div className={styles.ramSlots} role="list" aria-label={copy.ramSlotsAria}>
        {items.map(item => {
        const gb = item.module?.capacityGB != null ? formatStorageGB(item.module.capacityGB) : null;
        const tip = item.filled ? [item.module?.locator || item.module?.bank || `DIMM ${item.index + 1}`, gb != null ? `${gb} Go` : null, item.module?.speedMHz != null ? `${item.module.speedMHz} MHz` : null, item.module?.manufacturer, item.module?.partNumber].filter(Boolean).join(" · ") : copy.ramSlotEmpty;
        return <div key={item.index} className={`${styles.ramSlot} ${item.filled ? styles.ramSlotFilled : styles.ramSlotEmpty}`} role="listitem" title={tip}>
              <span className={styles.ramSlotChip} aria-hidden />
              <span className={styles.ramSlotLabel}>{item.filled && gb != null ? `${gb}` : `${item.index + 1}`}</span>
            </div>;
      })}
      </div>
      <p className={styles.ramSlotsCaption}>
        <strong>{used}</strong>
        <span> / {total}</span>
        <span className={styles.ramSlotsCaptionMuted}> {copy.ramSlotsUsed}</span>
      </p>
    </div>;
}

function detectDiskKind(disk) {
  const hay = `${disk?.model || ""} ${disk?.interface || ""}`.toLowerCase();
  if (hay.includes("nvme") || hay.includes("ssd") || hay.includes("solid")) return "ssd";
  if (hay.includes("usb") || hay.includes("external")) return "external";
  return "hdd";
}

export default function RmmHardwareOverview({
  equipment
}) {
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
  const domainLabel = equipment?.domaine || inventory.domaine || (domain.joined ? domain.name : domain.workgroup || domain.name) || null;
  const totalStorageGB = drives.reduce((sum, d) => sum + (Number(d.sizeGB) || 0), 0);
  const usedStorageGB = drives.reduce((sum, d) => sum + (Number(d.usedGB) || 0), 0);
  const storagePct = totalStorageGB > 0 ? Math.round(usedStorageGB / totalStorageGB * 100) : snapshot.diskPct;
  const primaryGpu = gpus[0] || null;
  const ramModules = Array.isArray(hardware.ramModules) ? hardware.ramModules.map(module => ({
    ...module,
    capacityGB: module?.capacityGB ?? module?.capacityGb ?? null
  })).filter(module => module.capacityGB != null && Number(module.capacityGB) > 0) : [];
  const ramSlotCount = Number(hardware.ramSlotCount) > 0 ? Number(hardware.ramSlotCount) : ramModules.length || null;
  const diskKinds = physicalDisks.length ? physicalDisks.map(detectDiskKind) : ["hdd"];
  const hasSsd = diskKinds.includes("ssd");
  const hasHdd = diskKinds.includes("hdd") || diskKinds.includes("external");
  const storageIcon = hasSsd && !hasHdd ? "mdi:harddisk-plus" : "mdi:harddisk";
  const cpuName = hardware.cpu || inventory.processeur || ov.unknown;
  const ramLine = snapshot.ramUsedGB != null && snapshot.ramTotalGB != null ? `${formatStorageGB(snapshot.ramUsedGB)} / ${formatStorageGB(snapshot.ramTotalGB)} Go` : null;
  const storageLine = usedStorageGB > 0 && totalStorageGB > 0 ? `${formatStorageGB(usedStorageGB)} / ${formatStorageGB(totalStorageGB)} Go` : totalStorageGB > 0 ? `${formatStorageGB(totalStorageGB)} Go` : null;
  const firstModule = ramModules[0] || null;
  const ramSpeed = firstModule?.speedMHz != null ? `${firstModule.speedMHz} MHz` : null;

  return <section className={styles.root} aria-label={ov.aria}>
      <div className={styles.grid}>
        <HardwareCard icon="mdi:microsoft-windows" title={ov.system} accent="system" headline={osEdition.edition || osEdition.osCaption || ov.unknown} headlineHint={[osEdition.displayVersion, uptimeLabel].filter(Boolean).join(" · ") || null} facts={[{
        label: ov.whoUses,
        value: inventory.loggedUser || inventory.session?.user || null
      }, {
        label: ov.pcName,
        value: getRmmNetbiosName(equipment)
      }, {
        label: ov.domainShort,
        value: domainLabel
      }]} />

        <HardwareCard icon="mdi:chip" title={ov.cpu} accent="cpu" headline={snapshot.cpuPct != null ? formatPct(snapshot.cpuPct) : ov.unknown} meterPct={snapshot.cpuPct} meterTone={toneForPct(snapshot.cpuPct)} facts={[{
        label: ov.whichCpu,
        value: cpuName
      }, {
        label: ov.coresShort,
        value: hardware.cores != null ? `${hardware.cores}${hardware.logicalProcessors != null ? ` / ${hardware.logicalProcessors}` : ""}` : null
      }, {
        label: ov.speedShort,
        value: hardware.currentClockMHz != null ? `${hardware.currentClockMHz} MHz` : null
      }, {
        label: ov.appsRunning,
        value: perf.processCount != null ? String(perf.processCount) : null
      }]} />

        <HardwareCard icon="mdi:memory" title={ov.memory} accent="ram" headline={snapshot.ramPct != null ? formatPct(snapshot.ramPct) : ov.unknown} meterPct={snapshot.ramPct} meterTone={toneForPct(snapshot.ramPct, 70, 90)} board={<RamSlotsBoard modules={ramModules} slotCount={ramSlotCount} copy={ov} />} facts={[{
        label: ov.filledWith,
        value: ramLine
      }, {
        label: ov.totalRam,
        value: snapshot.ramTotalGB != null ? `${formatStorageGB(snapshot.ramTotalGB)} Go` : inventory.memoire || null
      }, {
        label: ov.ramSpeed,
        value: ramSpeed
      }]} />

        <HardwareCard icon={storageIcon} title={ov.storage} accent="storage" headline={storagePct != null ? formatPct(storagePct) : ov.unknown} meterPct={storagePct} meterTone={toneForPct(storagePct, 75, 90)} facts={[{
        label: ov.filledWith,
        value: storageLine
      }, {
        label: ov.driveCount,
        value: drives.length ? String(drives.length) : null
      }, {
        label: ov.mainDrives,
        value: drives.slice(0, 3).map(d => `${d.label}${d.pct != null ? ` ${formatPct(d.pct)}` : ""}`).join(" · ") || null
      }]} />

        <HardwareCard icon="mdi:expansion-card-variant" title={ov.gpu} accent="gpu" headline={primaryGpu?.name || ov.gpuMissing} headlineHint={primaryGpu?.resolution || (gpus.length > 1 ? `${gpus.length} ${ov.gpus}` : null)} facts={primaryGpu ? [{
        label: ov.driver,
        value: primaryGpu.driver || null
      }, {
        label: ov.vram,
        value: primaryGpu.ramMB != null ? `${primaryGpu.ramMB} Mo` : null
      }, {
        label: ov.otherGpus,
        value: gpus.length > 1 ? gpus.slice(1).map(g => g.name).filter(Boolean).join(", ") : null
      }] : []} />

        <HardwareCard icon="mdi:lan" title={ov.network} accent="network" headline={ip || ov.unknown} facts={[{
        label: ov.macShort,
        value: mac
      }, {
        label: ov.gatewayShort,
        value: network.gateway || null
      }, {
        label: "DNS",
        value: network.dns || null
      }]} />

        {(chassis.manufacturer || chassis.model || chassis.serial) && <HardwareCard icon="mdi:desktop-classic" title={ov.chassis} accent="chassis" headline={chassis.model || chassis.manufacturer || ov.unknown} headlineHint={[chassis.manufacturer, chassis.model].filter(Boolean).join(" · ") || null} facts={[{
        label: ov.serialShort,
        value: chassis.serial || null
      }, {
        label: ov.heat,
        value: sensor.maxTempLabel || null
      }]} />}

        {sensor.battery?.present ? <HardwareCard icon="mdi:battery-medium" title={ov.battery} accent="battery" headline={sensor.battery.chargePct != null ? `${sensor.battery.chargePct}%` : ov.unknown} headlineHint={sensor.battery.status || null} meterPct={sensor.battery.chargePct} meterTone={toneForPct(100 - (sensor.battery.chargePct ?? 100), 40, 70)} facts={[]} /> : null}
      </div>
    </section>;
}
