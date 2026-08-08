import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import { formatRmmDateTime, getRmmInventoryFromEquipment, getSecuritySummary, getUpdatesDetail, formatPendingKb } from "./rmmMonitoringUtils";
import styles from "./RmmHardwareOverview.module.css";

function VulgarCard({
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
  const stoppedCount = Number(services.stoppedCount) || serviceItems.filter(s => String(s.status || "").toLowerCase() !== "running").length;
  const runningCount = Math.max(0, serviceItems.length - stoppedCount);
  const pending = Number(updates.pendingCount) || updates.pendingItems?.length || 0;
  const firewallOn = (security.firewall || []).length ? (security.firewall || []).every(p => p.enabled) : null;
  const bitLocker = security.bitLocker || [];
  const bitProtected = bitLocker.filter(v => /on|enabled|encrypt|chiff/i.test(String(v.protection || ""))).length;
  const defenderOk = security.defender?.enabled && security.defender?.realTimeProtection;
  const updatesHeadline = !updates.hasPendingScan ? cy.updatesUnknown : pending === 0 && !updates.rebootRequired ? cy.updatesOk : updates.rebootRequired && pending === 0 ? cy.rebootNeeded : cy.updatesPending.replace("{count}", String(pending));
  const updatesHint = !updates.hasPendingScan ? syncPending ? cy.updatesScanPending.replace("{when}", expectedCollectionLabel || "…") : null : null;
  const latestKb = updates.latestInstalledHotfix?.kb || updates.recentHotfixes?.[0]?.kb || null;

  return <section className={styles.root} aria-label={cy.aria}>
      <div className={styles.grid}>
        <VulgarCard icon="mdi:shield-check" title={cy.defender} accent={defenderOk ? "ram" : "storage"} headline={defenderOk ? cy.defenderOn : security.defender?.enabled === false ? cy.defenderOff : cy.unknown} facts={[{
        label: cy.realtime,
        value: security.defender?.realTimeProtection == null ? null : security.defender.realTimeProtection ? cy.yes : cy.no
      }, {
        label: cy.signatures,
        value: security.defender?.productVersion || null
      }]} />

        <VulgarCard icon="mdi:wall-fire" title={cy.firewall} accent={firewallOn ? "network" : "storage"} headline={firewallOn === true ? cy.firewallOn : firewallOn === false ? cy.firewallOff : cy.unknown} facts={(security.firewall || []).slice(0, 4).map(profile => ({
        label: profile.profile || "Profile",
        value: profile.enabled ? cy.on : cy.off
      }))} />

        <VulgarCard icon="mdi:shield-lock" title={cy.bitlocker} accent={bitLocker.length && bitProtected === bitLocker.length ? "ram" : "cpu"} headline={!bitLocker.length ? cy.bitlockerUnknown : bitProtected === bitLocker.length ? cy.bitlockerOn : cy.bitlockerPartial.replace("{ok}", String(bitProtected)).replace("{total}", String(bitLocker.length))} facts={bitLocker.map(vol => ({
        label: vol.mountPoint || "Volume",
        value: vol.protection || vol.encryption || "—"
      }))} />

        <VulgarCard icon="mdi:cellphone-arrow-down" title={cy.updates} accent={pending === 0 && updates.hasPendingScan && !updates.rebootRequired ? "ram" : "storage"} headline={updatesHeadline} headlineHint={updatesHint} meterPct={updates.hasPendingScan ? Math.max(0, 100 - pending * 8) : null} meterTone={pending === 0 ? "good" : pending >= 5 ? "critical" : "warn"} facts={[{
        label: cy.pendingCount,
        value: updates.hasPendingScan ? String(pending) : null
      }, {
        label: cy.latestKb,
        value: latestKb
      }, {
        label: cy.drivers,
        value: updates.driverCount ? String(updates.driverCount) : null
      }, {
        label: cy.lastSync,
        value: inventory.lastFullInventoryAt ? formatRmmDateTime(inventory.lastFullInventoryAt) : null
      }]} />

        <VulgarCard icon="mdi:cog-play" title={cy.services} accent={stoppedCount === 0 ? "system" : "storage"} headline={serviceItems.length ? cy.servicesHeadline.replace("{running}", String(runningCount)).replace("{total}", String(serviceItems.length)) : cy.servicesUnknown} headlineHint={stoppedCount > 0 ? cy.servicesBad.replace("{count}", String(stoppedCount)) : null} facts={serviceItems.slice(0, 5).map(svc => ({
        label: svc.display || svc.displayName || svc.name,
        value: svc.status === "Running" || svc.state === "Running" ? cy.running : svc.status || svc.state || "—"
      }))} />

        <VulgarCard icon="mdi:list-status" title={cy.pendingList} accent="gpu" headline={pending > 0 ? cy.pendingListHeadline.replace("{count}", String(pending)) : cy.pendingListEmpty} facts={(updates.pendingItems || []).slice(0, 5).map(item => ({
        label: formatPendingKb(item.kb) || "KB",
        value: item.title || "—"
      }))} />
      </div>
    </section>;
}
