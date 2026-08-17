import { Icon } from "@iconify/react";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";

export default function CyberBulkBar({
  copy,
  selectedCount,
  allSelected,
  filteredCount,
  busy = false,
  onSelectAll,
  onEdit,
  onRefresh,
  onDelete,
  onClear
}) {
  if (selectedCount <= 0) return null;
  return <div className={layout.bulkBar}>
      <div className={layout.bulkInfo}>
        <strong>{selectedCount}</strong>
        <span>{selectedCount > 1 ? copy.bulk.selectedPlural : copy.bulk.selected}</span>
      </div>
      <div className={layout.bulkActions}>
        {!allSelected && filteredCount > selectedCount ? <button type="button" className={layout.bulkBtnGhost} onClick={onSelectAll} disabled={busy}>
            {copy.formatBulkSelectAllFiltered(filteredCount)}
          </button> : null}
        {onEdit ? <button type="button" className={layout.bulkBtn} onClick={onEdit} disabled={busy}>
            <Icon icon="mdi:pencil-outline" />
            {copy.bulk.edit}
          </button> : null}
        {onRefresh ? <button type="button" className={layout.bulkBtn} onClick={onRefresh} disabled={busy}>
            <Icon icon={busy ? "mdi:loading" : "mdi:refresh"} className={busy ? layout.spinning : undefined} />
            {busy ? copy.bulk.refreshing : copy.bulk.refresh}
          </button> : null}
        {onDelete ? <button type="button" className={layout.bulkBtnDanger} onClick={onDelete} disabled={busy}>
            <Icon icon="mdi:delete-outline" />
            {copy.bulk.delete}
          </button> : null}
        <button type="button" className={layout.bulkBtnGhost} onClick={onClear} disabled={busy}>
          {copy.bulk.clearSelection}
        </button>
      </div>
    </div>;
}
