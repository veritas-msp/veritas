import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import { getRmmInventoryFromEquipment } from "./rmmMonitoringUtils";
import styles from "./RmmHardwareOverview.module.css";

export default function RmmInventoryOverview({ equipment }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const inv = copy.rmm.inventoryOverview;
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const shares = inventory.shares || {};
  const mappedDrives = Array.isArray(shares.mappedDrives) ? shares.mappedDrives : [];
  const localShares = Array.isArray(shares.localShares) ? shares.localShares : [];
  const peripherals = inventory.peripherals || {};
  const monitors = Array.isArray(peripherals.monitors) ? peripherals.monitors : [];
  const usbDevices = Array.isArray(peripherals.usbDevices)
    ? peripherals.usbDevices
    : Array.isArray(peripherals.usb)
      ? peripherals.usb
      : [];
  const softwareItems = useMemo(() => {
    const raw = Array.isArray(inventory.software?.items)
      ? inventory.software.items
      : Array.isArray(inventory.software)
        ? inventory.software
        : [];
    return [...raw].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" })
    );
  }, [inventory.software]);
  const softwareTotal = inventory.software?.count ?? softwareItems.length;
  const shareRows = [
    ...mappedDrives.map(drive => ({
      label: drive.drive || inv.mappedDrive,
      value: drive.remotePath || drive.provider || "—"
    })),
    ...localShares.map(share => ({
      label: share.name || inv.localShare,
      value: share.path || "—"
    }))
  ];
  const displayRows = [
    ...monitors.map((monitor, index) => ({
      label: `${inv.screen} ${index + 1}`,
      value: [monitor.name || monitor.manufacturer, monitor.resolution || monitor.serial]
        .filter(Boolean)
        .join(" · ") || "—"
    })),
    ...usbDevices.map(device => ({
      label: device.class || "USB",
      value: device.name || device.manufacturer || "—"
    }))
  ];

  return (
    <section className={styles.root} aria-label={inv.aria}>
      <div className={styles.inventorySplit}>
        <article className={`${styles.panel} ${styles.softwarePanel}`}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>
              <Icon icon="mdi:application" className={styles.panelTitleIcon} aria-hidden />
              {inv.software}
            </h3>
            <span className={styles.panelMeta}>
              {softwareTotal
                ? inv.softwareHeadline.replace("{count}", String(softwareTotal))
                : inv.softwareEmpty}
            </span>
          </div>
          {softwareItems.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th className={styles.colName} scope="col">{inv.colName}</th>
                    <th className={styles.colVersion} scope="col">{inv.colVersion}</th>
                    <th className={styles.colPublisher} scope="col">{inv.colPublisher}</th>
                  </tr>
                </thead>
                <tbody>
                  {softwareItems.map((item, index) => (
                    <tr key={`${item.name || "app"}-${item.version || ""}-${index}`}>
                      <td className={styles.colName} title={item.name || ""}>
                        {item.name || "—"}
                      </td>
                      <td className={styles.colVersion} title={item.version || ""}>
                        {item.version || "—"}
                      </td>
                      <td className={styles.colPublisher} title={item.publisher || ""}>
                        {item.publisher || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.emptyHint}>{inv.softwareEmpty}</p>
          )}
        </article>

        <div className={styles.sideStack}>
          <article className={`${styles.panel} ${styles.sidePanel}`}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>
                <Icon icon="mdi:folder-network" className={styles.panelTitleIcon} aria-hidden />
                {inv.shares}
              </h3>
              <span className={styles.panelMeta}>
                {mappedDrives.length || localShares.length
                  ? inv.sharesHeadline
                      .replace("{mapped}", String(mappedDrives.length))
                      .replace("{local}", String(localShares.length))
                  : inv.sharesEmpty}
              </span>
            </div>
            {shareRows.length ? (
              <ul className={styles.sideList}>
                {shareRows.map((row, index) => (
                  <li key={`${row.label}-${index}`}>
                    <span className={styles.kvLabel}>{row.label}</span>
                    <span className={styles.kvValue} title={row.value}>{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sideEmpty}>{inv.sharesEmpty}</p>
            )}
          </article>

          <article className={`${styles.panel} ${styles.sidePanel}`}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>
                <Icon icon="mdi:monitor" className={styles.panelTitleIcon} aria-hidden />
                {inv.displays}
              </h3>
              <span className={styles.panelMeta}>
                {monitors.length || usbDevices.length
                  ? inv.displaysHeadline
                      .replace("{monitors}", String(monitors.length))
                      .replace("{usb}", String(usbDevices.length))
                  : inv.displaysEmpty}
              </span>
            </div>
            {displayRows.length ? (
              <ul className={styles.sideList}>
                {displayRows.map((row, index) => (
                  <li key={`${row.label}-${index}`}>
                    <span className={styles.kvLabel}>{row.label}</span>
                    <span className={styles.kvValue} title={row.value}>{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sideEmpty}>{inv.displaysEmpty}</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
