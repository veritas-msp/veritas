import { useMemo } from "react";
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

/**
 * Per-file company vault options for ticket reply attachments.
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

  if (list.length === 0) return null;

  return (
    <div className={styles.list}>
      {list.map((file, index) => {
        const fileKey = getAttachmentFileKey(file);
        const opts = {
          ...createDefaultVaultFileOptions(),
          ...(optionsByKey?.[fileKey] || {})
        };
        const enabled = Boolean(opts.enabled) && hasClient;
        const fieldId = `ticket-vault-${index}-${fileKey}`.replace(/[^a-zA-Z0-9_-]/g, "_");
        const patch = next => onOptionsChange?.(fileKey, next);

        return (
          <div key={fileKey} className={styles.wrap}>
            <div className={styles.fileRow}>
              <div className={styles.fileMeta}>
                <Icon icon="mdi:file-document-outline" className={styles.fileIcon} aria-hidden />
                <span className={styles.fileName} title={file.name}>
                  {file.name}
                </span>
              </div>
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

            <label className={`${styles.enableRow} ${!hasClient ? styles.enableRowMuted : ""}`.trim()}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={enabled}
                onChange={e => patch({ enabled: e.target.checked })}
                disabled={disabled || !hasClient}
              />
              <span className={styles.enableCopy}>
                <span className={styles.enableTitle}>
                  <Icon icon="mdi:safe-square-outline" aria-hidden />
                  {copy.enable}
                </span>
                <span className={styles.enableHint}>{hasClient ? copy.enableHint : copy.noClient}</span>
              </span>
            </label>

            {enabled ? (
              <div className={styles.options}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${fieldId}-category`}>
                    {copy.categoryLabel}
                  </label>
                  <select
                    id={`${fieldId}-category`}
                    className={styles.select}
                    value={opts.category || TICKET_VAULT_DEFAULT_CATEGORY}
                    onChange={e => patch({ category: e.target.value })}
                    disabled={disabled}
                  >
                    {TICKET_VAULT_CATEGORY_KEYS.map(key => (
                      <option key={key} value={key}>
                        {copy.getCategoryLabel(key)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${fieldId}-description`}>
                    {copy.descriptionLabel}
                  </label>
                  <input
                    id={`${fieldId}-description`}
                    className={styles.input}
                    type="text"
                    value={opts.description || ""}
                    placeholder={copy.descriptionPlaceholder}
                    onChange={e => patch({ description: e.target.value })}
                    disabled={disabled}
                  />
                </div>

                <ReportSaveVisibilitySwitch
                  visibleToClient={Boolean(opts.visibleToClient)}
                  onChange={value => patch({ visibleToClient: value })}
                  disabled={disabled}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
