import { SkeletonBone } from "./PageSkeleton";
import sk from "./CrmListTableSkeleton.module.css";

const WIDTH_STEPS = ["42%", "55%", "68%", "78%", "88%", "62%", "48%", "72%"];

function boneWidth(rowIndex, columnKey = "") {
  const seed = (String(columnKey).length * 3 + rowIndex * 5) % WIDTH_STEPS.length;
  return WIDTH_STEPS[seed];
}

function Text({ width, delay }) {
  return (
    <span className={sk.cell}>
      <SkeletonBone
        className={sk.text}
        style={{
          width: width || undefined,
          animationDelay: delay
        }}
      />
    </span>
  );
}

function delayFor(rowIndex) {
  return `${Math.min(rowIndex, 18) * 28}ms`;
}

/** Skeleton tbody — miroir des lignes CRM Entreprises / Contacts / Prestataires. */
export default function CrmListTableSkeleton({
  layout,
  pageStyles = null,
  columns = [],
  rows = 12,
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
  const count = Math.max(1, Math.min(Number(rows) || 12, 60));

  const renderCell = (columnId, rowIndex) => {
    const delay = delayFor(rowIndex);
    const w = boneWidth(rowIndex, columnId);

    if (preset === "enterprises") {
      if (columnId === "client_number") {
        return (
          <td key={columnId} className={layout.colClientNumber}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.num} style={{ animationDelay: delay }} />
            </span>
          </td>
        );
      }
      if (columnId === "company") {
        return (
          <td key={columnId} className={layout.colCompany}>
            <div className={`${layout.companyCell} ${sk.companyBlock}`.trim()}>
              <SkeletonBone className={sk.companyIcon} style={{ animationDelay: delay }} />
              <SkeletonBone
                className={sk.companyName}
                style={{ width: w, animationDelay: delay }}
              />
            </div>
          </td>
        );
      }
      if (columnId === "company_status" || columnId === "status") {
        return (
          <td key={columnId} className={layout.colCompanyStatus || layout.colMuted}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusDot} style={{ animationDelay: delay }} />
            </span>
          </td>
        );
      }
      if (columnId === "primary_contact") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${layout.colContact || ""}`.trim()}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "commercial") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${layout.colCommercial || ""}`.trim()}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "modules") {
        return (
          <td key={columnId} className={layout.colModules}>
            <div className={`${layout.tableModules || ""} ${sk.pillsRow}`.trim()}>
              <SkeletonBone className={sk.modulePill} style={{ animationDelay: delay }} />
              <SkeletonBone
                className={`${sk.modulePill} ${sk.modulePillSm}`}
                style={{ animationDelay: delay }}
              />
            </div>
          </td>
        );
      }
      if (columnId === "expiration") {
        return (
          <td key={columnId} className={layout.colExpiry}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.date} style={{ animationDelay: delay }} />
            </span>
          </td>
        );
      }
      if (columnId === "tags") {
        return (
          <td key={columnId} className={layout.colTags}>
            <div className={`${layout.tableTags || ""} ${sk.pillsRow}`.trim()}>
              <SkeletonBone className={sk.tag} style={{ animationDelay: delay }} />
              {rowIndex % 3 === 0 ? (
                <SkeletonBone
                  className={`${sk.tag} ${sk.tagSm}`}
                  style={{ animationDelay: delay }}
                />
              ) : null}
            </div>
          </td>
        );
      }
    }

    if (preset === "contacts") {
      if (columnId === "contact") {
        return (
          <td
            key={columnId}
            className={`${layout.colCompany} ${pageStyles?.colContactName || ""}`.trim()}
          >
            <div className={`${layout.tableIdentity || ""} ${sk.companyBlock}`.trim()}>
              <div className={layout.tableIdentityText || sk.identityText}>
                <SkeletonBone
                  className={sk.companyName}
                  style={{ width: w, animationDelay: delay }}
                />
              </div>
            </div>
          </td>
        );
      }
      if (columnId === "gender") {
        return (
          <td
            key={columnId}
            className={`${pageStyles?.colGender || ""} ${pageStyles?.colContactGender || ""} ${layout.colMuted}`.trim()}
          >
            <Text width="2.2rem" delay={delay} />
          </td>
        );
      }
      if (columnId === "status" || columnId === "portal") {
        return (
          <td
            key={columnId}
            className={`${pageStyles?.portalCell || ""} ${
              columnId === "status" ? pageStyles?.colContactStatus || "" : pageStyles?.colContactPortal || ""
            }`.trim()}
          >
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusPill} style={{ animationDelay: delay }} />
            </span>
          </td>
        );
      }
      if (columnId === "enterprise") {
        return (
          <td
            key={columnId}
            className={`${layout.colMuted} ${pageStyles?.colContactEnterprise || ""}`.trim()}
          >
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "role") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colContactRole || ""}`.trim()}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "email") {
        return (
          <td key={columnId} className={pageStyles?.colContactEmail || undefined}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "phone") {
        return (
          <td key={columnId} className={pageStyles?.colContactPhone || undefined}>
            <Text width="6.5rem" delay={delay} />
          </td>
        );
      }
      if (columnId === "support_tickets_total" || columnId === "support_tickets_in_progress") {
        return (
          <td
            key={columnId}
            className={`${pageStyles?.colContactTickets || ""} ${layout.colMuted}`.trim()}
          >
            <span className={sk.cell}>
              <SkeletonBone className={sk.num} style={{ animationDelay: delay }} />
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
              <SkeletonBone
                className={sk.companyName}
                style={{ width: w, animationDelay: delay }}
              />
            </span>
          </td>
        );
      }
      if (columnId === "type") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colType || ""}`.trim()}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "status") {
        return (
          <td key={columnId} className={pageStyles?.colStatus || undefined}>
            <span className={sk.cell}>
              <SkeletonBone className={sk.statusPill} style={{ animationDelay: delay }} />
            </span>
          </td>
        );
      }
      if (columnId === "contact") {
        return (
          <td key={columnId} className={`${layout.colMuted} ${pageStyles?.colContact || ""}`.trim()}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "email") {
        return (
          <td key={columnId} className={pageStyles?.colEmail || undefined}>
            <Text width={w} delay={delay} />
          </td>
        );
      }
      if (columnId === "phone") {
        return (
          <td key={columnId} className={pageStyles?.colPhone || undefined}>
            <Text width="6.5rem" delay={delay} />
          </td>
        );
      }
      if (columnId === "enterprises" || columnId === "companies") {
        return (
          <td
            key={columnId}
            className={`${layout.colMuted} ${pageStyles?.colEnterprises || pageStyles?.colCompanies || ""}`.trim()}
          >
            <Text width={w} delay={delay} />
          </td>
        );
      }
    }

    return (
      <td key={columnId}>
        <Text width={w} delay={delay} />
      </td>
    );
  };

  return Array.from({ length: count }, (_, index) => {
    const delay = delayFor(index);
    return (
      <tr
        key={`crm-skel-${index}`}
        className={`${layout.dataTableRow} ${sk.skelRow}`.trim()}
        style={{ "--skel-row-delay": delay }}
        aria-hidden
      >
        {showCheckbox ? (
          <td className={`${layout.checkboxCell} ${checkboxClassName}`.trim()}>
            <SkeletonBone className={sk.checkbox} style={{ animationDelay: delay }} />
          </td>
        ) : null}
        {columns.map(columnId => renderCell(columnId, index))}
        {showActions ? (
          <td className={`${pageStyles?.actionsCell || ""} ${actionsClassName}`.trim()}>
            <div className={sk.actionsRow}>
              <SkeletonBone className={sk.action} style={{ animationDelay: delay }} />
              <SkeletonBone className={sk.action} style={{ animationDelay: delay }} />
              <SkeletonBone className={sk.action} style={{ animationDelay: delay }} />
            </div>
          </td>
        ) : null}
        {showFavorite ? (
          <td className={`${layout.favoriteCell} ${favoriteClassName}`.trim()}>
            <SkeletonBone className={sk.fav} style={{ animationDelay: delay }} />
          </td>
        ) : null}
        {showChevron ? (
          <td className={layout.chevronCell}>
            <SkeletonBone className={sk.chevron} style={{ animationDelay: delay }} />
          </td>
        ) : null}
      </tr>
    );
  });
}
