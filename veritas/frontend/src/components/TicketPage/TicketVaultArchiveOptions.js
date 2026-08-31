import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import ReportSaveVisibilitySwitch from "../shared/ReportSaveVisibilitySwitch";
import {
  getTicketVaultArchiveCopy,
  TICKET_VAULT_CATEGORY_KEYS,
  TICKET_VAULT_DEFAULT_CATEGORY
} from "./ticketVaultArchiveI18n";
import styles from "./TicketVaultArchiveOptions.module.css";

export { TICKET_VAULT_DEFAULT_CATEGORY, TICKET_VAULT_CATEGORY_KEYS };

export function getAttachmentFileKey(file) {
  if (!file) return "";
  return `${file.name}-${file.size}-${file.lastModified || 0}`;
}

export function createDefaultVaultFileOptions() {
  return {
    enabled: false,
    category: TICKET_VAULT_DEFAULT_CATEGORY,
    description: "",
    visibleToClient: false
  };
}

/** Build vault upload entries for files that are checked for archiving. */
export function collectVaultArchiveEntries(files = [], optionsByKey = {}) {
  return (Array.isArray(files) ? files : [])
    .map(file => {
      const key = getAttachmentFileKey(file);
      const opts = optionsByKey?.[key];
      if (!opts?.enabled) return null;
      return {
        file,
        category: opts.category || TICKET_VAULT_DEFAULT_CATEGORY,
        description: opts.description || "",
        visibleToClient: Boolean(opts.visibleToClient)
      };
    })
    .filter(Boolean);
}

function formatFileSize(bytes, locale = "fr") {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  const mo = n / (1024 * 1024);
  return `${mo.toLocaleString(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

function resolveFileOptions(optionsByKey, fileKey) {
  return {
    ...createDefaultVaultFileOptions(),
    ...(optionsByKey?.[fileKey] || {})
  };
}

/**
 * Compact per-file company vault options for ticket reply attachments.
 */
export default function TicketVaultArchiveOptions({
  files = [],
  optionsByKey = {},
  onOptionsChange,
  onRemoveFile,
  getRemoveAria,
  hasClient = false,
  disabled = false,
  copy: copyProp
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => copyProp || getTicketVaultArchiveCopy(locale), [copyProp, locale]);
  const list = Array.isArray(files) ? files : [];
  const [expandedKey, setExpandedKey] = useState(null);

  const rows = useMemo(
    () =>
      list.map(file => {
        const fileKey = getAttachmentFileKey(file);
        const opts = resolveFileOptions(optionsByKey, fileKey);
        return {
          file,
          fileKey,
          opts,
          enabled: Boolean(opts.enabled) && hasClient
        };
      }),
    [list, optionsByKey, hasClient]
  );

  const enabledCount = rows.filter(row => row.enabled).length;
  const allEnabled = hasClient && list.length > 0 && enabledCount === list.length;
  const someEnabled = enabledCount > 0 && !allEnabled;

  const bulkCategory = useMemo(() => {
    const enabledRows = rows.filter(row => row.enabled);
    if (enabledRows.length === 0) return TICKET_VAULT_DEFAULT_CATEGORY;
    const first = enabledRows[0].opts.category || TICKET_VAULT_DEFAULT_CATEGORY;
    return enabledRows.every(row => (row.opts.category || TICKET_VAULT_DEFAULT_CATEGORY) === first) ? first : "";
  }, [rows]);

  const bulkVisible = enabledCount > 0 && rows.filter(row => row.enabled).every(row => row.opts.visibleToClient);

  if (list.length === 0) return null;

  const patch = (fileKey, next) => onOptionsChange?.(fileKey, next);
  const patchAll = next => {
    rows.forEach(row => patch(row.fileKey, next));
  };

  const showBulk = list.length >= 2;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>
          <Icon icon="mdi:safe-square-outline" aria-hidden />
          <span>{copy.panelTitle}</span>
          {list.length > 1 ? <span className={styles.countBadge}>{list.length}</span> : null}
        </div>
        <p className={styles.panelHint}>{hasClient ? copy.enableHint : copy.noClient}</p>
      </div>

      {showBulk && hasClient ? (
        <div className={styles.bulkBar}>
          <label className={styles.bulkEnable}>
            <input
              ref={el => {
                if (el) el.indeterminate = someEnabled;
              }}
              type="checkbox"
              className={styles.checkbox}
              checked={allEnabled}
              onChange={e => patchAll({ enabled: e.target.checked })}
              disabled={disabled}
            />
            <span>{copy.bulkEnable}</span>
            <span className={styles.bulkMeta}>{copy.formatEnabledCount(enabledCount, list.length)}</span>
          </label>
          <select
            className={styles.bulkSelect}
            value={bulkCategory}
            onChange={e => {
              const category = e.target.value;
              rows.filter(row => row.enabled).forEach(row => patch(row.fileKey, { category }));
            }}
            disabled={disabled || enabledCount === 0}
            title={copy.categoryLabel}
            aria-label={copy.bulkCategoryAria}
          >
            {bulkCategory === "" ? <option value="">{copy.mixedCategories}</option> : null}
            {TICKET_VAULT_CATEGORY_KEYS.map(key => (
              <option key={key} value={key}>
                {copy.getCategoryLabel(key)}
              </option>
            ))}
          </select>
          <ReportSaveVisibilitySwitch
            compact
            visibleToClient={bulkVisible}
            onChange={value => {
              rows.filter(row => row.enabled).forEach(row => patch(row.fileKey, { visibleToClient: value }));
            }}
            disabled={disabled || enabledCount === 0}
          />
        </div>
      ) : null}

      <ul className={styles.fileList}>
        {rows.map(row => {
          const { file, fileKey, opts, enabled } = row;
          const expanded = expandedKey === fileKey;
          const fieldId = `ticket-vault-${fileKey}`.replace(/[^a-zA-Z0-9_-]/g, "_");
          return (
            <li key={fileKey} className={`${styles.fileItem} ${enabled ? styles.fileItemOn : ""}`.trim()}>
              <div className={styles.fileMain}>
                <label className={`${styles.vaultToggle} ${!hasClient ? styles.vaultToggleMuted : ""}`.trim()} title={hasClient ? copy.formatVaultToggleAria(file.name) : copy.noClient}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={enabled}
                    onChange={e => patch(fileKey, { enabled: e.target.checked })}
                    disabled={disabled || !hasClient}
                    aria-label={copy.formatVaultToggleAria(file.name)}
                  />
                  <Icon icon="mdi:safe-square-outline" aria-hidden />
                </label>
                <div className={styles.fileMeta}>
                  <Icon icon="mdi:file-document-outline" className={styles.fileIcon} aria-hidden />
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  <span className={styles.fileSize}>{formatFileSize(file.size, locale)}</span>
                </div>
                {enabled ? (
                  <>
                    <select
                      id={`${fieldId}-category`}
                      className={styles.rowSelect}
                      value={opts.category || TICKET_VAULT_DEFAULT_CATEGORY}
                      onChange={e => patch(fileKey, { category: e.target.value })}
                      disabled={disabled}
                      aria-label={copy.categoryLabel}
                      title={copy.categoryLabel}
                    >
                      {TICKET_VAULT_CATEGORY_KEYS.map(key => (
                        <option key={key} value={key}>
                          {copy.getCategoryLabel(key)}
                        </option>
                      ))}
                    </select>
                    <ReportSaveVisibilitySwitch
                      compact
                      visibleToClient={Boolean(opts.visibleToClient)}
                      onChange={value => patch(fileKey, { visibleToClient: value })}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      className={`${styles.expandBtn} ${expanded ? styles.expandBtnOpen : ""}`.trim()}
                      onClick={() => setExpandedKey(current => (current === fileKey ? null : fileKey))}
                      aria-expanded={expanded}
                      aria-label={copy.descriptionToggleAria}
                      title={copy.descriptionLabel}
                    >
                      <Icon icon="mdi:text-short" aria-hidden />
                    </button>
                  </>
                ) : null}
                {onRemoveFile ? (
                  <button
                    type="button"
                    className={styles.fileRemove}
                    onClick={() => onRemoveFile(fileKey)}
                    aria-label={getRemoveAria?.(file.name) || `Remove ${file.name}`}
                    disabled={disabled}
                  >
                    <Icon icon="mdi:close" aria-hidden />
                  </button>
                ) : null}
              </div>
              {enabled && expanded ? (
                <div className={styles.fileExtra}>
                  <label className={styles.extraLabel} htmlFor={`${fieldId}-description`}>
                    {copy.descriptionLabel}
                  </label>
                  <input
                    id={`${fieldId}-description`}
                    className={styles.input}
                    type="text"
                    value={opts.description || ""}
                    placeholder={copy.descriptionPlaceholder}
                    onChange={e => patch(fileKey, { description: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
