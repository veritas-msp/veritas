import { SkeletonBone } from "./PageSkeleton";
import sk from "./CrmListTableSkeleton.module.css";

function Text({ width }) {
  return (
    <span className={sk.cell}>
      <SkeletonBone className={sk.text} style={width ? { width } : undefined} />
    </span>
  );
}

/** Skeleton tbody rows that reuse the real CRM list table cell classes. */
export default function CrmListTableSkeleton({
  layout,
  pageStyles = null,
  columns = [],
  rows = 50,
  showCheckbox = false,
  checkboxClassName = "",
  /** "enterprises" | "contacts" | "prestataires" */
  preset = "enterprises",
  showActions = false,
  actionsClassName = "",
  showFavorite = true,
  favoriteClassName = "",
  showChevron = true
}) {
  const count = Math.max(1, Number(rows) || 50);

  const renderCell = columnId => {
    if (preset === "enterprises") {
      if (columnId === "client_number") {
        return (
          <td key={columnId} className={layout.colClientNumber}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.num} />
            </span>
          </td>
        );
      }
      if (columnId === "company") {
        return (
          <td key={columnId} className={layout.colCompany}>
            <div className={`${layout.companyCell} ${sk.cellBlock}`.trim()}>
              <SkeletonBone className={sk.companyIcon} />
              <SkeletonBone className={sk.companyName} />
            </div>
          </td>
        );
      }
      if (columnId === "company_status") {
        return (
          <td key={columnId} className={layout.colCompanyStatus}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusPill} />
            </span>
          </td>
        );
      }
      if (columnId === "primary_contact") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${layout.colContact || ""}`.trim()}>
            <Text width="7.5rem" />
          </td>
        );
      }
      if (columnId === "commercial") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${layout.colCommercial || ""}`.trim()}>
            <Text width="7rem" />
          </td>
        );
      }
      if (columnId === "modules") {
        return (
          <td key={columnId} className={layout.colModules}>
            <div className={`${layout.tableModules || ""} ${sk.pillsRow}`.trim()}>
              <SkeletonBone className={sk.modulePill} />
              <SkeletonBone className={`${sk.modulePill} ${sk.modulePillSm}`} />
            </div>
          </td>
        );
      }
      if (columnId === "expiration") {
        return (
          <td key={columnId} className={layout.colExpiry}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.date} />
            </span>
          </td>
        );
      }
      if (columnId === "tags") {
        return (
          <td key={columnId} className={layout.colTags}>
            <div className={`${layout.tableTags || ""} ${sk.pillsRow}`.trim()}>
              <SkeletonBone className={sk.tag} />
            </div>
          </td>
        );
      }
    }

    if (preset === "contacts") {
      if (columnId === "contact") {
        return (
          <td key={columnId} className={`${layout.colCompany} ${pageStyles?.colContactName || ""}`.trim()}>
            <div className={`${layout.tableIdentity} ${sk.cellBlock}`.trim()}>
              <div className={layout.tableIdentityText}>
                <SkeletonBone className={sk.companyName} />
              </div>
            </div>
          </td>
        );
      }
      if (columnId === "gender") {
        return (
          <td key={columnId} className={`${pageStyles?.colGender || ""} ${pageStyles?.colContactGender || ""} ${layout.colMuted}`.trim()}>
            <Text width="2.4rem" />
          </td>
        );
      }
      if (columnId === "status") {
        return (
          <td key={columnId} className={`${pageStyles?.portalCell || ""} ${pageStyles?.colContactStatus || ""}`.trim()}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusPill} />
            </span>
          </td>
        );
      }
      if (columnId === "enterprise") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colContactEnterprise || ""}`.trim()}>
            <Text width="8.5rem" />
          </td>
        );
      }
      if (columnId === "role") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colContactRole || ""}`.trim()}>
            <Text width="6.5rem" />
          </td>
        );
      }
      if (columnId === "email") {
        return (
          <td key={columnId} className={pageStyles?.colContactEmail || undefined}>
            <Text width="11rem" />
          </td>
        );
      }
      if (columnId === "phone") {
        return (
          <td key={columnId} className={pageStyles?.colContactPhone || undefined}>
            <Text width="7rem" />
          </td>
        );
      }
      if (columnId === "portal") {
        return (
          <td key={columnId} className={`${pageStyles?.portalCell || ""} ${pageStyles?.colContactPortal || ""}`.trim()}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusPill} />
            </span>
          </td>
        );
      }
      if (columnId === "support_tickets_total" || columnId === "support_tickets_in_progress") {
        return (
          <td key={columnId} className={`${pageStyles?.colContactTickets || ""} ${layout.colMuted}`.trim()}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.num} />
            </span>
          </td>
        );
      }
    }

    if (preset === "prestataires") {
      if (columnId === "name") {
        return (
          <td key={columnId} className={`${layout.colCompany} ${pageStyles?.colName || ""}`.trim()}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.companyName} />
            </span>
          </td>
        );
      }
      if (columnId === "type") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colType || ""}`.trim()}>
            <Text width="5.5rem" />
          </td>
        );
      }
      if (columnId === "status") {
        return (
          <td key={columnId} className={pageStyles?.colStatus || undefined}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusPill} />
            </span>
          </td>
        );
      }
      if (columnId === "contact") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colContact || ""}`.trim()}>
            <Text width="7.5rem" />
          </td>
        );
      }
      if (columnId === "email") {
        return (
          <td key={columnId} className={pageStyles?.colEmail || undefined}>
            <Text width="11rem" />
          </td>
        );
      }
      if (columnId === "phone") {
        return (
          <td key={columnId} className={pageStyles?.colPhone || undefined}>
            <Text width="7rem" />
          </td>
        );
      }
      if (columnId === "enterprises" || columnId === "companies") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colEnterprises || pageStyles?.colCompanies || ""}`.trim()}>
            <Text width="8.5rem" />
          </td>
        );
      }
    }

    return (
      <td key={columnId}>
        <Text />
      </td>
    );
  };

  return Array.from({ length: count }, (_, index) => (
    <tr key={`crm-skel-${index}`} className={`${layout.dataTableRow} ${sk.skelRow}`.trim()} aria-hidden>
      {showCheckbox ? (
        <td className={`${layout.checkboxCell} ${checkboxClassName}`.trim()}>
          <SkeletonBone className={sk.checkbox} />
        </td>
      ) : null}
      {columns.map(renderCell)}
      {showActions ? (
        <td className={`${pageStyles?.actionsCell || ""} ${actionsClassName}`.trim()}>
          <div className={sk.actionsRow}>
            <SkeletonBone className={sk.action} />
            <SkeletonBone className={sk.action} />
            <SkeletonBone className={sk.action} />
            <SkeletonBone className={sk.action} />
          </div>
        </td>
      ) : null}
      {showFavorite ? (
        <td className={`${layout.favoriteCell} ${favoriteClassName}`.trim()}>
          <SkeletonBone className={sk.fav} />
        </td>
      ) : null}
      {showChevron ? (
        <td className={layout.chevronCell}>
          <SkeletonBone className={sk.chevron} />
        </td>
      ) : null}
    </tr>
  ));
}
