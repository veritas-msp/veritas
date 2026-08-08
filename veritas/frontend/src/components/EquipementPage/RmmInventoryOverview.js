import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import { getRmmInventoryFromEquipment } from "./rmmMonitoringUtils";
import styles from "./RmmHardwareOverview.module.css";

function VulgarCard({
  icon,
  title,
  accent = "default",
  headline,
  headlineHint,
  facts = [],
  scrollable = false,
  className = ""
}) {
  const visibleFacts = facts.filter(fact => fact?.value != null && fact.value !== "");
  return <article className={`${styles.card} ${styles[`card_${accent}`] || ""} ${scrollable ? styles.cardScrollable : ""} ${className}`.trim()}>
      <div className={styles.cardVisual} aria-hidden>
        <Icon icon={icon} className={styles.cardIcon} />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardEyebrow}>{title}</p>
        {headline != null && headline !== "" ? <p className={styles.cardHeadline}>{headline}</p> : null}
        {headlineHint ? <p className={styles.cardHint}>{headlineHint}</p> : null}
        {visibleFacts.length > 0 ? <ul className={`${styles.factList} ${scrollable ? styles.factListScroll : ""}`}>
            {visibleFacts.map((fact, index) => <li key={`${fact.label}-${index}`}>
                <span className={styles.factLabel}>{fact.label}</span>
                <strong className={styles.factValue}>{fact.value}</strong>
              </li>)}
          </ul> : null}
      </div>
    </article>;
}

export default function RmmInventoryOverview({
  equipment
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const inv = copy.rmm.inventoryOverview;
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const shares = inventory.shares || {};
  const mappedDrives = Array.isArray(shares.mappedDrives) ? shares.mappedDrives : [];
  const localShares = Array.isArray(shares.localShares) ? shares.localShares : [];
  const peripherals = inventory.peripherals || {};
  const monitors = Array.isArray(peripherals.monitors) ? peripherals.monitors : [];
  const usbDevices = Array.isArray(peripherals.usbDevices) ? peripherals.usbDevices : Array.isArray(peripherals.usb) ? peripherals.usb : [];
  const softwareItems = useMemo(() => {
    const raw = Array.isArray(inventory.software?.items) ? inventory.software.items : Array.isArray(inventory.software) ? inventory.software : [];
    return [...raw].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
      sensitivity: "base"
    }));
  }, [inventory.software]);
  const softwareTotal = inventory.software?.count ?? softwareItems.length;
  const displayUsbCount = monitors.length + usbDevices.length;

  return <section className={styles.root} aria-label={inv.aria}>
      <div className={styles.inventorySplit}>
        <VulgarCard icon="mdi:application" title={inv.software} accent="chassis" headline={softwareTotal ? inv.softwareHeadline.replace("{count}", String(softwareTotal)) : inv.softwareEmpty} scrollable className={styles.inventorySoftwareCard} facts={softwareItems.map(item => ({
        label: item.name || "App",
        value: [item.version, item.publisher].filter(Boolean).join(" · ") || "—"
      }))} />

        <div className={styles.inventorySide}>
          <VulgarCard icon="mdi:folder-network" title={inv.shares} accent="network" headline={mappedDrives.length || localShares.length ? inv.sharesHeadline.replace("{mapped}", String(mappedDrives.length)).replace("{local}", String(localShares.length)) : inv.sharesEmpty} facts={[...mappedDrives.map(drive => ({
          label: drive.drive || inv.mappedDrive,
          value: drive.remotePath || drive.provider || "—"
        })), ...localShares.map(share => ({
          label: share.name || inv.localShare,
          value: share.path || "—"
        }))]} />

          <VulgarCard icon="mdi:monitor" title={inv.displays} accent="ram" headline={displayUsbCount ? inv.displaysHeadline.replace("{monitors}", String(monitors.length)).replace("{usb}", String(usbDevices.length)) : inv.displaysEmpty} facts={[...monitors.map((monitor, index) => ({
          label: `${inv.screen} ${index + 1}`,
          value: [monitor.name || monitor.manufacturer, monitor.resolution || monitor.serial].filter(Boolean).join(" · ") || "—"
        })), ...usbDevices.map(device => ({
          label: device.class || "USB",
          value: device.name || device.manufacturer || "—"
        }))]} />
        </div>
      </div>
    </section>;
}
