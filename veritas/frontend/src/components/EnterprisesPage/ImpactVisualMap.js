import React from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import ImpactHaBadge from "./ImpactHaBadge";
import { isRoutingNodeType, resolveImpactIcon } from "./impactMapModel";
import styles from "./ImpactVisualMap.module.css";

function vlanTone(id) {
  const hue = (Number(id) * 47) % 360;
  return {
    "--zone": `hsl(${hue} 42% 42%)`,
    "--zone-soft": `hsl(${hue} 70% 96%)`
  };
}

function buildZones(nodes, copy) {
  const shared = [];
  const byVlan = new Map();
  const unassigned = [];
  const manual = [];

  nodes.forEach(node => {
    if (node.data?.kind === "manual") {
      manual.push(node);
      return;
    }
    const vlans = node.data?.vlans || [];
    if (isRoutingNodeType(node.data?.nodeType) || vlans.length > 1) {
      shared.push(node);
      return;
    }
    if (vlans.length === 1) {
      const list = byVlan.get(vlans[0]) || [];
      list.push(node);
      byVlan.set(vlans[0], list);
      return;
    }
    unassigned.push(node);
  });

  const zones = [];
  if (shared.length) {
    zones.push({ id: "shared", title: copy.visualShared, wide: true, items: shared });
  }
  [...byVlan.keys()]
    .sort((left, right) => Number(left) - Number(right))
    .forEach(id => {
      zones.push({
        id: `vlan-${id}`,
        title: `VLAN ${id}`,
        vlan: id,
        items: byVlan.get(id)
      });
    });
  if (unassigned.length) {
    zones.push({ id: "none", title: copy.visualUnassigned, items: unassigned });
  }
  if (manual.length) {
    zones.push({ id: "manual", title: copy.visualManual, items: manual });
  }
  return zones;
}

function haRank(node) {
  const ha = node.data?.ha;
  if (!ha?.pairKey) return "z";
  return `${ha.pairKey}|${ha.role === "Secondary" ? "1" : "0"}`;
}

function sortZoneItems(items) {
  return [...items].sort((left, right) => {
    const rank = haRank(left).localeCompare(haRank(right));
    if (rank) return rank;
    return String(left.data?.label || "").localeCompare(String(right.data?.label || ""), "fr");
  });
}

function Tile({ node, typeLabel, copy }) {
  const vlans = node.data?.vlans || [];
  return (
    <article
      className={`${styles.tile} ${node.data?.ha ? styles.tileHa : ""}`.trim()}
      style={node.data?.ha?.color ? { borderLeftColor: node.data.ha.color } : undefined}
    >
      <span className={styles.tileIcon} aria-hidden>
        <Icon icon={node.data?.icon || resolveImpactIcon(node.data?.nodeType)} />
      </span>
      <span className={styles.tileBody}>
        <strong className={styles.tileName}>{node.data?.label || "—"}</strong>
        <span className={styles.tileMeta}>{[typeLabel, node.data?.subtitle].filter(Boolean).join(" · ")}</span>
        {vlans.length > 1 ? <span className={styles.tileVlans}>{vlans.map(id => `VLAN ${id}`).join(" · ")}</span> : null}
        {node.data?.inactive ? <span className={styles.tileFlag}>{node.data.inactiveLabel}</span> : null}
      </span>
      {node.data?.ha ? <ImpactHaBadge ha={node.data.ha} copy={copy} className={styles.tileHaBadge} /> : null}
    </article>
  );
}

export default function ImpactVisualMap({
  nodes,
  clientName,
  copy,
  locale,
  typeLabelFor,
  sheetRef
}) {
  const zones = buildZones(nodes, copy);
  const printedAt = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const total = nodes.length;

  return (
    <div className={styles.scroll}>
      <div className={styles.sheet} ref={sheetRef}>
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>{copy.visualKicker}</p>
            <h2 className={styles.title}>{clientName || copy.visualKicker}</h2>
          </div>
          <p className={styles.date}>{printedAt}</p>
        </header>
        {total ? (
          <p className={styles.summary}>
            {total > 1 ? interpolate(copy.visualCountMany, { count: total }) : interpolate(copy.visualCountOne, { count: total })}
          </p>
        ) : (
          <p className={styles.empty}>{copy.visualEmpty}</p>
        )}
        <div className={styles.zones}>
          {zones.map(zone => (
            <section
              key={zone.id}
              className={`${styles.zone} ${zone.wide ? styles.zoneWide : ""}`.trim()}
              style={zone.vlan ? vlanTone(zone.vlan) : undefined}
            >
              <header className={styles.zoneHead}>
                <h3>{zone.title}</h3>
                <span>{zone.items.length}</span>
              </header>
              <div className={zone.wide ? styles.tileRow : styles.tileGrid}>
                {sortZoneItems(zone.items).map(node => (
                  <Tile
                    key={node.id}
                    node={{ ...node, data: { ...node.data, inactiveLabel: copy.inactive } }}
                    typeLabel={typeLabelFor(node)}
                    copy={copy}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
