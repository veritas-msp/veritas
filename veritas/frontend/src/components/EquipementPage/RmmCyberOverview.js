import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import {
  formatRmmDateTime,
  getRmmInventoryFromEquipment,
  getSecuritySummary,
  getUpdatesDetail,
  formatPendingKb
} from "./rmmMonitoringUtils";
import styles from "./RmmHardwareOverview.module.css";

function cyberTone(ok) {
  if (ok === true) return "ok";
  if (ok === false) return "bad";
  return "warn";
}

function CyberTile({ icon, title, headline, hint, tone = "ok" }) {
  const iconClass =
    tone === "bad" ? styles.cyberIcon_bad : tone === "warn" ? styles.cyberIcon_warn : "";
  return (
    <div className={styles.cyberTile}>
      <div className={`${styles.cyberIcon} ${iconClass}`} aria-hidden>
        <Icon icon={icon} />
      </div>
      <div className={styles.cyberBody}>
        <p className={styles.cyberLabel}>{title}</p>
        <p className={styles.cyberHeadline}>{headline}</p>
        {hint ? <p className={styles.cyberHint} title={hint}>{hint}</p> : null}
      </div>
    </div>
  );
}

export default function RmmCyberOverview({
  equipment,
  syncPending = false,
  expectedCollectionLabel = null
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const cy = copy.rmm.cyber;
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const security = useMemo(() => getSecuritySummary(inventory), [inventory]);
  const updates = useMemo(() => getUpdatesDetail(inventory), [inventory]);
  const services = inventory.services || {};
  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const stoppedCount =
    Number(services.stoppedCount) ||
    serviceItems.filter(s => String(s.status || "").toLowerCase() !== "running").length;
  const runningCount = Math.max(0, serviceItems.length - stoppedCount);
  const pending = Number(updates.pendingCount) || updates.pendingItems?.length || 0;
  const firewallOn = (security.firewall || []).length
    ? (security.firewall || []).every(p => p.enabled)
    : null;
  const bitLocker = security.bitLocker || [];
  const bitProtected = bitLocker.filter(v =>
    /on|enabled|encrypt|chiff/i.test(String(v.protection || ""))
  ).length;
  const defenderOk = security.defender?.enabled && security.defender?.realTimeProtection;
  const updatesOk = updates.hasPendingScan && pending === 0 && !updates.rebootRequired;
  const updatesHeadline = !updates.hasPendingScan
    ? cy.updatesUnknown
    : pending === 0 && !updates.rebootRequired
      ? cy.updatesOk
      : updates.rebootRequired && pending === 0
        ? cy.rebootNeeded
        : cy.updatesPending.replace("{count}", String(pending));
  const updatesHint = !updates.hasPendingScan
    ? syncPending
      ? cy.updatesScanPending.replace("{when}", expectedCollectionLabel || "…")
      : null
    : [
        updates.hasPendingScan ? `${cy.pendingCount}: ${pending}` : null,
        updates.latestInstalledHotfix?.kb || updates.recentHotfixes?.[0]?.kb
          ? `${cy.latestKb}: ${updates.latestInstalledHotfix?.kb || updates.recentHotfixes?.[0]?.kb}`
          : null,
        inventory.lastFullInventoryAt
          ? `${cy.lastSync}: ${formatRmmDateTime(inventory.lastFullInventoryAt)}`
          : null
      ]
        .filter(Boolean)
        .join(" · ") || null;

  const defenderHint = [
    security.defender?.realTimeProtection == null
      ? null
      : `${cy.realtime}: ${security.defender.realTimeProtection ? cy.yes : cy.no}`,
    security.defender?.productVersion ? `${cy.signatures}: ${security.defender.productVersion}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  const firewallHint = (security.firewall || [])
    .slice(0, 3)
    .map(p => `${p.profile || "?"}: ${p.enabled ? cy.on : cy.off}`)
    .join(" · ");

  const bitlockerHeadline = !bitLocker.length
    ? cy.bitlockerUnknown
    : bitProtected === bitLocker.length
      ? cy.bitlockerOn
      : cy.bitlockerPartial.replace("{ok}", String(bitProtected)).replace("{total}", String(bitLocker.length));

  const bitlockerHint = bitLocker
    .slice(0, 3)
    .map(vol => `${vol.mountPoint || "Vol"}: ${vol.protection || vol.encryption || "—"}`)
    .join(" · ");

  const servicesHeadline = serviceItems.length
    ? cy.servicesHeadline.replace("{running}", String(runningCount)).replace("{total}", String(serviceItems.length))
    : cy.servicesUnknown;
  const servicesHint =
    stoppedCount > 0
      ? cy.servicesBad.replace("{count}", String(stoppedCount))
      : serviceItems
          .slice(0, 3)
          .map(svc => svc.display || svc.displayName || svc.name)
          .filter(Boolean)
          .join(" · ");

  const pendingHeadline =
    pending > 0 ? cy.pendingListHeadline.replace("{count}", String(pending)) : cy.pendingListEmpty;
  const pendingHint = (updates.pendingItems || [])
    .slice(0, 3)
    .map(item => formatPendingKb(item.kb) || item.title)
    .filter(Boolean)
    .join(" · ");

  return (
    <section className={styles.root} aria-label={cy.aria}>
      <article className={styles.panel}>
        <div className={styles.cyberRow}>
          <CyberTile
            icon="mdi:shield-check"
            title={cy.defender}
            headline={
              defenderOk ? cy.defenderOn : security.defender?.enabled === false ? cy.defenderOff : cy.unknown
            }
            hint={defenderHint}
            tone={cyberTone(defenderOk === true ? true : security.defender?.enabled === false ? false : null)}
          />
          <CyberTile
            icon="mdi:wall-fire"
            title={cy.firewall}
            headline={firewallOn === true ? cy.firewallOn : firewallOn === false ? cy.firewallOff : cy.unknown}
            hint={firewallHint}
            tone={cyberTone(firewallOn)}
          />
          <CyberTile
            icon="mdi:shield-lock"
            title={cy.bitlocker}
            headline={bitlockerHeadline}
            hint={bitlockerHint}
            tone={cyberTone(
              !bitLocker.length ? null : bitProtected === bitLocker.length ? true : bitProtected > 0 ? null : false
            )}
          />
          <CyberTile
            icon="mdi:cellphone-arrow-down"
            title={cy.updates}
            headline={updatesHeadline}
            hint={updatesHint}
            tone={cyberTone(!updates.hasPendingScan ? null : updatesOk ? true : false)}
          />
          <CyberTile
            icon="mdi:cog-play"
            title={cy.services}
            headline={servicesHeadline}
            hint={servicesHint}
            tone={cyberTone(!serviceItems.length ? null : stoppedCount === 0)}
          />
          <CyberTile
            icon="mdi:list-status"
            title={cy.pendingList}
            headline={pendingHeadline}
            hint={pendingHint}
            tone={cyberTone(!updates.hasPendingScan ? null : pending === 0)}
          />
        </div>
      </article>
    </section>
  );
}
