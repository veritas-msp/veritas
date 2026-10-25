import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { UiKitButton } from "../UiKit";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { formatTableDateTime } from "../../utils/tableDateFormat";
import { getActivityJournalCopy } from "../shared/ActivityJournalPanel/activityJournalI18n";
import { buildLogDetailRows, parseLogDetails } from "./equipmentLogUtils";
import localStyles from "./EquipmentLogDetailModal.module.css";

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function formatReadableValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map(item => formatReadableValue(item)).join(", ");
  }
  if (typeof value === "object") {
    if (("old" in value || "oldValue" in value || "before" in value) && ("new" in value || "newValue" in value || "after" in value)) {
      const oldVal = value.old ?? value.oldValue ?? value.before;
      const newVal = value.new ?? value.newValue ?? value.after;
      return `${formatReadableValue(oldVal)} → ${formatReadableValue(newVal)}`;
    }
    const entries = Object.entries(value).filter(([, v]) => v != null && v !== "");
    if (!entries.length) return "—";
    return entries.map(([k, v]) => `${humanizeKey(k)} : ${formatReadableValue(v)}`).join(" · ");
  }
  const text = String(value).trim();
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return formatReadableValue(JSON.parse(text));
    } catch {
      /* plain text */
    }
  }
  return text.replace(/\s+/g, " ");
}

function flattenRows(obj, prefix = "", skipKeys = new Set(["kind"])) {
  if (obj == null) return [];
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [{ label: prefix || "Valeur", value: formatReadableValue(obj) }];
  }
  const rows = [];
  for (const [key, value] of Object.entries(obj)) {
    if (skipKeys.has(key) || value == null || value === "") continue;
    const label = prefix ? `${prefix} · ${humanizeKey(key)}` : humanizeKey(key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (("old" in value || "oldValue" in value || "before" in value) && ("new" in value || "newValue" in value || "after" in value)) {
        rows.push({ label, value: formatReadableValue(value) });
        continue;
      }
      const nested = flattenRows(value, label, skipKeys);
      if (nested.length) {
        rows.push(...nested);
        continue;
      }
    }
    rows.push({ label, value: formatReadableValue(value) });
  }
  return rows;
}

export default function EquipmentLogDetailModal({ log, onClose, copy: copyOverride = null }) {
  const locale = useAppLocale();
  const baseCopy = useMemo(() => getActivityJournalCopy(locale), [locale]);
  const copy = useMemo(
    () => ({
      ...baseCopy,
      ...(copyOverride || {}),
      detailModal: {
        ...baseCopy.detailModal,
        ...(copyOverride?.detailModal || {})
      }
    }),
    [baseCopy, copyOverride]
  );
  const modal = copy.detailModal || {};

  const detailRows = useMemo(() => {
    if (!log) return [];
    const parsed = parseLogDetails(log);
    const built = buildLogDetailRows(parsed, log.details);
    if (built && built.length > 0) {
      return built.map(row => ({
        label: row.label,
        value: formatReadableValue(row.value)
      }));
    }
    let source = log.details;
    if (typeof source === "string") {
      try {
        source = JSON.parse(source);
      } catch {
        const text = source.trim();
        return text ? [{ label: modal.detailsLabel || "Détails", value: text }] : [];
      }
    }
    if (source && typeof source === "object") {
      return flattenRows(source);
    }
    return [];
  }, [log, modal.detailsLabel]);

  if (!log) return null;

  const timestamp = log.timestamp || log.created_at;
  const userLabel = log.user_name || log.user || copy.systemUser || "—";
  const actionLabel = log.action || "—";

  return createPortal(
    <div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${formStyles.shellMedium} ${localStyles.shell}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-log-detail-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:history" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{modal.eyebrow || copy.title}</p>
              <h2 className={formStyles.title} id="equipment-log-detail-title">
                {modal.title || copy.detailTitle}
              </h2>
              <p className={formStyles.subtitle}>{actionLabel}</p>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={formStyles.closeBtn}
            onClick={onClose}
            aria-label={modal.closeAria || "Close"}
            icon="mdi:close"
          />
        </header>

        <div className={`${formStyles.bodySingle} ${localStyles.body}`}>
          <div className={`${formStyles.content} ${localStyles.content}`}>
            <div className={localStyles.scroll}>
              <div className={localStyles.fields}>
                <div className={localStyles.field}>
                  <span className={localStyles.label}>{modal.actionLabel || "Action"}</span>
                  <span className={localStyles.value}>{actionLabel}</span>
                </div>
                <div className={localStyles.row2}>
                  <div className={localStyles.field}>
                    <span className={localStyles.label}>{modal.userLabel || "Utilisateur"}</span>
                    <span className={localStyles.value}>{userLabel}</span>
                  </div>
                  <div className={localStyles.field}>
                    <span className={localStyles.label}>{modal.dateLabel || "Date et heure"}</span>
                    <span className={localStyles.value}>
                      {timestamp ? formatTableDateTime(timestamp) : "—"}
                    </span>
                  </div>
                </div>

                {log.description ? (
                  <div className={localStyles.field}>
                    <span className={localStyles.label}>{modal.descriptionLabel || "Description"}</span>
                    <span className={localStyles.value}>{log.description}</span>
                  </div>
                ) : null}

                {detailRows.length > 0 ? (
                  <>
                    <div className={localStyles.divider} aria-hidden />
                    {detailRows.map(row => (
                      <div key={`${row.label}-${row.value}`} className={localStyles.field}>
                        <span className={localStyles.label}>{row.label}</span>
                        <span className={localStyles.value}>{row.value}</span>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint} />
          <div className={formStyles.footerActions}>
            <UiKitButton type="button" variant="primary" onClick={onClose}>
              {modal.close || "Fermer"}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
