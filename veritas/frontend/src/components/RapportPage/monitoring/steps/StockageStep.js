import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import InfrastructureEquipmentTable from "../InfrastructureEquipmentTable";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import styles from "../RapportMonitoringBuilder.module.css";
import { getExpirationStatus, getExpirationStatusColor } from "../../../EquipementPage/constants/firewallLicenceUtils";
import { formatCapacityHint, sanitizeDiskCapacity } from "../../../EquipementPage/storageDiskUtils";
import { buildHaColumn } from "../reportHaColumn";
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
  useEffect(() => {
    if (typeof onPersistState === "function") {
      onPersistState({
        usage: localUsage
      });
    }
  }, [localUsage, onPersistState]);
  const getKey = st => String(st.id ?? st.uuid ?? st.nom ?? st.name ?? st.numeroSerie ?? "");
  const columns = [{
    id: "name",
    label: "Nom",
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
    label: "IP",
    render: st => st.ip || st.fqdn || "-"
  }, {
    id: "raid",
    label: "RAID",
    render: st => <span className={equipmentStyles.internetCellBold}>{st.raid || "-"}</span>
  }, buildHaColumn(stockages, "Storage"), {
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
    id: "expirationGarantie",
    label: "Garantie",
    render: st => <ExpirationDateCell value={st.expirationGarantie || st.garantie} />
  }, {
    id: "role",
    label: "Rôle",
    render: st => st.role || "-"
  }];
  return <InfrastructureEquipmentTable title="Storage (NAS / SAN)" moduleKey="Storage" equipments={stockages} columns={columns} onOpenComments={onOpenComments} onCreateTicket={onTicketCreatedForEquipment} onOpenCheckMKDetail={onOpenCheckMKDetail} clientId={client?.id ?? client?.uuid} onSyncCheckMK={onSyncCheckMK} syncingEquipmentKey={syncingEquipmentKey} commentCounts={commentCounts} ticketCounts={ticketCounts} alertCounts={alertCounts} highlightedEquipmentKey={highlightedEquipmentKey} reportPeriod={reportPeriod} monitoringSyncStatus={monitoringSyncStatus} equipmentCheckMKData={equipmentCheckMKData} onEditEquipment={onEditEquipment} />;
}
