import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import equipmentStyles from "../../EquipementPage/EquipmentPage.module.css";
import styles from "./RapportMonitoringBuilder.module.css";
import { MonitoringStepHeader } from "./MonitoringStepLayout";
export default function InfrastructureEquipmentTable({
  title,
  equipments,
  columns,
  moduleKey,
  onOpenComments,
  onCreateTicket,
  onSyncCheckMK,
  onOpenCheckMKDetail,
  clientId,
  commentCounts,
  ticketCounts,
  highlightedEquipmentKey,
  reportPeriod,
  monitoringSyncStatus = {},
  syncingEquipmentKey = null,
  externalLink = null,
  forceSyncButton = false,
  renderExtraActions = null,
  headerActions = null,
  showSearch = true,
  onEditEquipment = null,
  showActions = true,
  emptyMessage = null,
  totalCountLabel = null
}) {
  const [search, setSearch] = useState("");
  const safeEquipments = Array.isArray(equipments) ? equipments : [];
  const filteredEquipments = useMemo(() => {
    if (!search.trim()) {
      return safeEquipments;
    }
    const q = search.trim().toLowerCase();
    return safeEquipments.filter(item => {
      const candidate = `${item.nom || item.name || item.solution || item.logiciel || ""} ${item.site || item.location || ""} ${item.ip || ""}`.toLowerCase();
      return candidate.includes(q);
    });
  }, [safeEquipments, search]);
  const getMonitoringButtonClass = (isMappedForMonitoring, syncStatus) => {
    const base = equipmentStyles.mappingActionButton;
    if (!isMappedForMonitoring) return base;
    if (syncStatus === "ok") return `${base} ${equipmentStyles.mappingActionButtonActive}`;
    if (syncStatus === "warn") return `${base} ${styles.monitoringBtnWarn}`;
    if (syncStatus === "critical") return `${base} ${styles.monitoringBtnCritical}`;
    return `${base} ${styles.monitoringBtnUnsynced}`;
  };
  const countLabel = safeEquipments.length === 0 ? emptyMessage || "No equipment found for this module." : totalCountLabel || `${safeEquipments.length} equipment item(s) in total`;
  return <section className={styles.infraTableSection}>
      <MonitoringStepHeader title={title} countLabel={countLabel} showSearch={showSearch && safeEquipments.length > 0} searchValue={search} onSearchChange={setSearch} onSearchClear={() => setSearch("")} headerActions={headerActions} />

      {safeEquipments.length === 0 ? <div className={styles.infraTableEmpty}>
          {emptyMessage || "No equipment recorded for this client on this module."}
        </div> : <div className={equipmentStyles.hardwarePageEmbedded}>
          <div className={equipmentStyles.tableWrapper}>
            <table className={equipmentStyles.equipmentTable}>
              <thead>
                <tr>
                  {columns.map(col => <th key={col.id || col.accessor}>
                      <span className={equipmentStyles.thContent}>{col.label}</span>
                    </th>)}
                  {showActions && <th>
                      <span className={equipmentStyles.thContent}>Action</span>
                    </th>}
                </tr>
              </thead>
              <tbody>
                {filteredEquipments.map((item, index) => {
              const nameForKey = item.nom || item.name || item.logiciel || `#${index}`;
              const equipmentKey = item.commentKey || item.id || item.uuid || item.glpi_id || `${moduleKey || "module"}:${nameForKey}`;
              const commentCount = commentCounts && commentCounts[equipmentKey] || 0;
              const ticketCount = ticketCounts && ticketCounts[equipmentKey] || 0;
              const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
              const hostName = item?.checkmk_host_name ?? item?.data?.checkmk_host_name ?? null;
              const isMappedForMonitoring = !!(hostName && typeof hostName === "string" && hostName.trim() !== "" && item?.is_active !== false);
              const statusKey = String(item?.id ?? equipmentKey);
              const syncStatus = monitoringSyncStatus[statusKey];
              const hasMonitoringAction = typeof onOpenCheckMKDetail === "function";
              const hasSyncAction = typeof onSyncCheckMK === "function" && (isMappedForMonitoring || forceSyncButton);
              const hasCommentsAction = typeof onOpenComments === "function";
              const hasTicketAction = typeof onCreateTicket === "function" && !!clientId;
              const hasExtraActions = typeof renderExtraActions === "function";
              const hasExternalLink = !!externalLink?.url;
              const hasEditAction = typeof onEditEquipment === "function";
              const hasMainActions = hasMonitoringAction || hasSyncAction || hasCommentsAction || hasTicketAction || hasExtraActions || hasExternalLink;
              return <tr key={equipmentKey} className={`${equipmentStyles.equipmentRow} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}>
                      {columns.map(col => {
                  const value = typeof col.render === "function" ? col.render(item, {
                    moduleKey,
                    equipmentKey
                  }) : col.accessor ? item[col.accessor] : null;
                  return <td key={col.id || col.accessor}>
                            {value ?? "-"}
                          </td>;
                })}
                      {showActions && <td onClick={e => e.stopPropagation()}>
                        <div className={equipmentStyles.mappingActions}>
                          <div className={equipmentStyles.mappingActionsGroup}>
                            {hasSyncAction && <button type="button" className={equipmentStyles.mappingActionButton} title={syncingEquipmentKey === equipmentKey ? "Synchronization in progress..." : "Synchronize data"} disabled={syncingEquipmentKey === equipmentKey} onClick={() => onSyncCheckMK(item, {
                        moduleKey,
                        equipmentKey
                      })}>
                                <Icon icon="mdi:refresh" width={16} height={16} />
                              </button>}
                            {hasMonitoringAction && <button type="button" className={getMonitoringButtonClass(isMappedForMonitoring, syncStatus)} title={isMappedForMonitoring ? "View CheckMK monitoring details" : "No CheckMK mapping for this device"} disabled={!isMappedForMonitoring} onClick={() => onOpenCheckMKDetail(item, {
                        moduleKey,
                        equipmentKey,
                        reportPeriod
                      })}>
                                <Icon icon="simple-icons:checkmk" width={16} height={16} />
                              </button>}
                            {hasCommentsAction && <span className={styles.infraActionBadgeWrap}>
                                <button type="button" className={equipmentStyles.mappingActionButton} title="Comments" onClick={() => onOpenComments(item, {
                          moduleKey,
                          equipmentKey
                        })}>
                                  <Icon icon="mdi:comment-text-outline" width={16} height={16} />
                                </button>
                                {commentCount > 0 && <span className={styles.infraCommentBadge}>
                                    {commentCount}
                                  </span>}
                              </span>}
                            {hasTicketAction && <span className={styles.infraActionBadgeWrap}>
                                
                                {ticketCount > 0 && <span className={styles.infraTicketBadge}>
                                    {ticketCount}
                                  </span>}
                              </span>}
                            {hasExtraActions ? renderExtraActions(item, {
                        moduleKey,
                        equipmentKey
                      }) : null}
                            {hasExternalLink && <a href={externalLink.url} target="_blank" rel="noopener noreferrer" className={equipmentStyles.mappingActionButton} title={externalLink.title || "Open dans un nouvel onglet"} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none"
                      }}>
                                <Icon icon="mdi:open-in-new" width={16} height={16} />
                              </a>}
                          </div>
                          {hasEditAction && <div className={equipmentStyles.mappingActionsEdit}>
                              {hasMainActions && <span className={equipmentStyles.mappingActionsSeparator} aria-hidden="true" />}
                              <button type="button" className={equipmentStyles.mappingActionButton} title="Edit equipment" onClick={() => onEditEquipment(item, {
                        moduleKey,
                        equipmentKey
                      })}>
                                <Icon icon="mdi:pencil" width={16} height={16} />
                              </button>
                            </div>}
                        </div>
                      </td>}
                    </tr>;
            })}
              </tbody>
            </table>
          </div>
        </div>}
    </section>;
}
