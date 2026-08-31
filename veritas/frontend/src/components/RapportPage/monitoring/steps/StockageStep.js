import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import styles from "../RapportMonitoringBuilder.module.css";
import { getExpirationStatus, getExpirationStatusColor } from "../../../EquipementPage/constants/firewallLicenceUtils";
import { formatCapacityHint, sanitizeDiskCapacity } from "../../../EquipementPage/storageDiskUtils";
function parseCapacityGb(raw) {
  const digits = sanitizeDiskCapacity(raw);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}
function formatGbLabel(raw) {
  const n = parseCapacityGb(raw);
  if (n == null) return raw ? String(raw) : "";
  return formatCapacityHint(n) || `${n} Go`;
}
function formatDateFr(value) {
  if (!value) return "-";
  try {
    const iso = String(value).trim();
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(value);
  }
}
function ExpirationDateCell({
  value,
  formatFn = formatDateFr
}) {
  const label = formatFn(value);
  if (!label || label === "-") return "-";
  const status = getExpirationStatus(value);
  const color = getExpirationStatusColor(status);
  if (!color) return label;
  return <span style={{
    color,
    fontWeight: 500
  }}>{label}</span>;
}
function formatLuns(luns) {
  if (!Array.isArray(luns) || luns.length === 0) return "-";
  return luns.map(l => l.nom || l.iqn || "-").filter(s => s !== "-").join(", ") || "-";
}
export default function StorageStep({
  client,
  onOpenComments,
  onTicketCreatedForEquipment,
  onOpenCheckMKDetail,
  onSyncCheckMK,
  onEditEquipment,
  commentCounts,
  ticketCounts,
  alertCounts,
  highlightedEquipmentKey,
  reportPeriod,
  monitoringSyncStatus,
  equipmentCheckMKData,
  syncingEquipmentKey,
  persistedState,
  onPersistState
}) {
  const nas = Array.isArray(client?.equipements?.NAS) ? client.equipements.NAS : [];
  const san = Array.isArray(client?.equipements?.SAN) ? client.equipements.SAN : [];
  const stockages = [...nas, ...san];
  const [localUsage, setLocalUsage] = useState(() => persistedState && persistedState.usage || {});
  const [localDiskStates, setLocalDiskStates] = useState(() => persistedState && persistedState.diskStates || {});
  useEffect(() => {
    if (typeof onPersistState === "function") {
      onPersistState({
        usage: localUsage,
        diskStates: localDiskStates
      });
    }
  }, [localUsage, localDiskStates, onPersistState]);
  const getKey = st => String(st.id ?? st.uuid ?? st.nom ?? st.name ?? st.numeroSerie ?? "");
  const getDiskStates = st => {
    const max = parseInt(st.nbDisquesMax ?? st.disquesMax ?? st.nbDisquesActuels ?? (Array.isArray(st.disques) ? st.disques.length : 0), 10) || 0;
    if (!max || max <= 0) return [];
    let states = st.etatDisques;
    if (!Array.isArray(states)) {
      if (typeof states === "string" && states.trim()) {
        states = states.split(/[;,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
      } else {
        states = [];
      }
    }
    const usedCount = parseInt(st.nbDisquesActuels ?? (Array.isArray(st.disques) ? st.disques.length : 0), 10) || 0;
    const normalized = [];
    for (let i = 0; i < max; i += 1) {
      if (i < usedCount) {
        normalized.push(states[i] || "ok");
      } else {
        normalized.push("unused");
      }
    }
    return normalized;
  };
  const columns = [{
    id: "name",
    label: "Name",
    render: st => <div className={equipmentStyles.nameCell}>
          <Icon icon="mdi:harddisk" className={equipmentStyles.typeIconSmall} width={16} height={16} />
          <span className={equipmentStyles.internetCellBold}>
            {st.nom || st.name || "Unnamed storage"}
          </span>
        </div>
  }, {
    id: "location",
    label: "Site",
    render: st => st.site || st.location || "-"
  }, {
    id: "ip",
    label: "IP address",
    render: st => st.ip || st.fqdn || "-"
  }, {
    id: "raid",
    label: "RAID",
    render: st => <span className={equipmentStyles.internetCellBold}>{st.raid || "-"}</span>
  }, {
    id: "capacite",
    label: "Capacité",
    render: st => st.capacite ?? st.capacity ?? "-"
  }, {
    id: "slots",
    label: "Slots (utilisés / max)",
    render: st => {
      const used = st.nbDisquesActuels ?? (Array.isArray(st.disques) ? st.disques.length : null);
      const max = st.nbDisquesMax ?? st.disquesMax ?? null;
      if (used == null && max == null) return "-";
      return <span className={equipmentStyles.internetCellBold}>{used ?? "—"} / {max ?? "—"}</span>;
    }
  }, {
    id: "expirationGarantie",
    label: "Garantie",
    render: st => <ExpirationDateCell value={st.expirationGarantie || st.garantie} />
  }, {
    id: "espace",
    label: "Espace utilisé / restant",
    render: st => {
      const key = getKey(st);
      const totalRaw = st.capacite ?? st.capacity ?? "";
      const totalNumeric = parseCapacityGb(totalRaw);
      const rawUsed = st.capaciteUtilisee ?? st.espaceUtilise ?? st.capacityUsed ?? "";
      const value = localUsage[key] ?? sanitizeDiskCapacity(rawUsed);
      const usedNumeric = parseCapacityGb(value);
      if (!totalRaw && (value === "" || value == null)) return "-";
      const remaining = totalNumeric != null && usedNumeric != null ? Math.max(0, totalNumeric - usedNumeric) : null;
      const usagePercent = totalNumeric > 0 && usedNumeric != null ? Math.max(0, Math.min(100, usedNumeric / totalNumeric * 100)) : null;
      const remainTone = usagePercent == null ? "" : usagePercent >= 90 ? styles.storageUsageRemainCrit : usagePercent >= 75 ? styles.storageUsageRemainWarn : "";
      const fillColor = usagePercent == null ? "#16a34a" : usagePercent >= 90 ? "#dc2626" : usagePercent >= 75 ? "#d97706" : "#16a34a";
      return <div className={styles.storageUsageCell} onClick={event => event.stopPropagation()}>
            <div className={styles.storageUsageShell}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={styles.storageUsageInput}
                value={value}
                placeholder="0"
                aria-label="Espace utilisé"
                onChange={e => {
                  let next = sanitizeDiskCapacity(e.target.value);
                  if (totalNumeric != null && next) {
                    const n = Number(next);
                    if (!Number.isNaN(n) && n > totalNumeric) next = String(totalNumeric);
                  }
                  setLocalUsage(prev => ({
                    ...prev,
                    [key]: next
                  }));
                }}
              />
              <div className={styles.storageUsageSuffix}>Go</div>
            </div>
            <div className={styles.storageUsageMeta}>
              <div className={styles.storageUsageTotal}>
                {totalRaw ? `/ ${formatGbLabel(totalRaw)}` : ""}
                {remaining != null ? <div className={`${styles.storageUsageRemain} ${remainTone}`}>reste {formatGbLabel(remaining)}</div> : null}
              </div>
              {usagePercent != null ? <div className={styles.storageUsageBar} aria-hidden>
                  <div className={styles.storageUsageFill} style={{ width: `${usagePercent}%`, background: fillColor }} />
                </div> : null}
            </div>
          </div>;
    }
  }, {
    id: "etatDisques",
    label: "Disk status",
    render: st => {
      const key = getKey(st);
      const baseStates = getDiskStates(st);
      const states = localDiskStates[key] || baseStates;
      if (!states.length) return "-";
      const usedCount = parseInt(st.nbDisquesActuels ?? (Array.isArray(st.disques) ? st.disques.length : 0), 10) || 0;
      return <div style={{
        display: "flex",
        gap: 4
      }}>
            {states.map((state, idx) => {
          let bg = "#9ca3af";
          switch (state) {
            case "ok":
              bg = "#16a34a";
              break;
            case "warn":
            case "degrade":
            case "dégradé":
              bg = "#f97316";
              break;
            case "critical":
            case "hs":
              bg = "#ef4444";
              break;
            default:
              bg = "#9ca3af";
          }
          const isFreeSlot = idx >= usedCount;
          if (isFreeSlot) {
            return (<span key={idx} style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                backgroundColor: bg,
                border: "1px solid #e5e7eb"
              }} title={`Slot libre ${idx + 1}`} />
            );
          }
          return <button key={idx} type="button" onClick={() => {
            const current = localDiskStates[key] || getDiskStates(st);
            const next = [...current];
            const currentState = next[idx] || "unused";
            const cycle = ["ok", "warn", "critical"];
            const currentIndex = cycle.indexOf(currentState);
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % cycle.length;
            const nextState = cycle[nextIndex];
            next[idx] = nextState;
            setLocalDiskStates(prev => ({
              ...prev,
              [key]: next
            }));
          }} style={{
            width: 10,
            height: 10,
            borderRadius: "999px",
            backgroundColor: bg,
            border: "1px solid #e5e7eb",
            padding: 0,
            cursor: "pointer"
          }} title={`Disque ${idx + 1}`} />;
        })}
          </div>;
    }
  }, {
    id: "luns",
    label: "Luns",
    render: st => formatLuns(st.luns)
  }, {
    id: "role",
    label: "Role",
    render: st => st.role || "-"
  }];
  return <InfrastructureEquipmentTable title="Storage (NAS / SAN)" moduleKey="Storage" equipments={stockages} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} onOpenCheckMKDetail={onOpenCheckMKDetail} clientId={client?.id ?? client?.uuid} onSyncCheckMK={onSyncCheckMK} syncingEquipmentKey={syncingEquipmentKey} commentCounts={commentCounts} ticketCounts={ticketCounts} alertCounts={alertCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} monitoringSyncStatus={monitoringSyncStatus} equipmentCheckMKData={equipmentCheckMKData} onEditEquipment={onEditEquipment} />;
}
