import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunitySitesLimit } from "../../config/edition";
import { interpolate } from "../../i18n/translate";
import { buildSiteAddress, getSiteDisplayName } from "../../utils/clientSites";
import { getSitesModalCopy } from "./sitesModalI18n";
import { buildSitesCsvPreview, downloadSitesCsvTemplate, getSelectedImportSites, parseSitesCsvFile } from "./sitesCsvImport";
import { UiKitButton } from "../UiKit";
import { CloudUploadIcon, FileTextIcon } from "../Misc/Sidebar/lucideAnimated";
import modalStyles from "./SitesModal.module.css";
import styles from "./SitesCsvImportModal.module.css";

export default function SitesCsvImportModal({
  existingSites = [],
  maxSites = null,
  defaultCountry,
  onConfirm,
  onClose
}) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getSitesModalCopy(locale), [locale]);
  const csv = copy.csvImport;
  const { isCommunity, limits } = useVeritasEdition();
  const resolvedMaxSites = maxSites != null ? maxSites : isCommunity ? getCommunitySitesLimit(limits) : null;
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const remainingSlots = resolvedMaxSites == null ? null : Math.max(0, resolvedMaxSites - existingSites.length);
  const hasPreview = items.length > 0;

  const stats = useMemo(() => {
    const ready = items.filter(item => item.status === "ready").length;
    const selected = items.filter(item => item.selected && item.status === "ready").length;
    const duplicate = items.filter(item => item.status === "duplicate").length;
    const invalid = items.filter(item => item.status === "invalid").length;
    const limit = items.filter(item => item.status === "limit").length;
    return { ready, selected, duplicate, invalid, limit };
  }, [items]);

  const clearFile = () => {
    setFileName("");
    setItems([]);
  };

  const applyFile = async file => {
    if (!file) return;
    try {
      const parsed = await parseSitesCsvFile(file);
      if (!parsed.rows.length) {
        toast.error(csv.emptyFile);
        clearFile();
        return;
      }
      const preview = buildSitesCsvPreview(parsed.rows, existingSites, {
        maxSites: resolvedMaxSites,
        defaultCountry: defaultCountry || copy.defaultSiteCountry
      });
      if (!preview.headerMap.name) {
        toast.error(csv.missingNameColumn);
        setFileName(file.name);
        setItems([]);
        return;
      }
      setFileName(file.name);
      setItems(preview.items);
    } catch (error) {
      console.error(error);
      toast.error(csv.parseError);
      clearFile();
    }
  };

  const handleFileChange = event => {
    const file = event.target.files?.[0];
    applyFile(file);
    event.target.value = "";
  };

  const handleDrop = event => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) applyFile(file);
  };

  const openPicker = () => fileInputRef.current?.click();

  const toggleItem = id => {
    setItems(prev => {
      const target = prev.find(item => item.id === id);
      if (!target || target.status !== "ready") return prev;
      const selectedCount = prev.filter(item => item.selected && item.status === "ready" && item.id !== id).length;
      if (!target.selected && remainingSlots != null && selectedCount >= remainingSlots) {
        toast.warn(copy.formatLimitReached(resolvedMaxSites));
        return prev;
      }
      return prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item));
    });
  };

  const handleConfirm = async () => {
    const sites = getSelectedImportSites(items);
    if (!sites.length) {
      toast.error(csv.noneSelected);
      return;
    }
    setSaving(true);
    try {
      await onConfirm?.(sites);
    } catch (error) {
      toast.error(error?.message || copy.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = status => csv.status?.[status] || status;

  return createPortal(
    <div className={`${modalStyles.overlay} ${styles.stackedOverlay}`} onClick={saving ? undefined : onClose}>
      <div
        className={`${modalStyles.shell} ${styles.shell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sites-csv-import-title"
      >
        <div className={modalStyles.accentBar} />
        <header className={modalStyles.header}>
          <div className={modalStyles.headerMain}>
            <div className={modalStyles.headerIconWrap}>
              <Icon icon="mdi:file-delimited-outline" aria-hidden />
            </div>
            <div>
              <h2 id="sites-csv-import-title" className={modalStyles.title}>
                {csv.title}
              </h2>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={modalStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={common.close}
            icon="mdi:close"
          />
        </header>

        <div className={styles.body}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarActions}>
              <UiKitButton type="button" variant="secondary" onClick={() => downloadSitesCsvTemplate(locale)} title={csv.templateHint}>
                <FileTextIcon className={styles.toolbarIcon} size={16} aria-hidden />
                {csv.downloadTemplate}
              </UiKitButton>
              {fileName ? (
                <span className={styles.fileChip}>
                  <span className={styles.fileChipName}>{fileName}</span>
                  <button type="button" className={styles.fileChipClear} onClick={clearFile} aria-label={common.close} disabled={saving}>
                    <Icon icon="mdi:close" aria-hidden />
                  </button>
                </span>
              ) : null}
            </div>
          </div>

          <div className={styles.content}>
            <div
              className={`${styles.dropzone}${hasPreview ? ` ${styles.dropzoneCompact}` : ""}${dragOver ? ` ${styles.dropzoneActive}` : ""}`}
              role={hasPreview ? undefined : "button"}
              tabIndex={hasPreview ? undefined : 0}
              onClick={hasPreview ? undefined : openPicker}
              onKeyDown={
                hasPreview
                  ? undefined
                  : event => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openPicker();
                      }
                    }
              }
              onDragEnter={event => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragOver={event => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={event => {
                event.preventDefault();
                setDragOver(false);
              }}
              onDrop={handleDrop}
            >
              <CloudUploadIcon className={styles.dropzoneIcon} size={hasPreview ? 18 : 36} aria-hidden />
              <div className={styles.dropzoneCopy}>
                <p className={styles.dropzoneTitle}>{hasPreview ? fileName || csv.dropTitle : csv.dropTitle}</p>
                <p className={styles.dropzoneHint}>{hasPreview ? csv.dropHint : csv.dropHint}</p>
              </div>
              {hasPreview ? (
                <UiKitButton type="button" variant="secondary" onClick={openPicker} disabled={saving}>
                  {csv.pickFile}
                </UiKitButton>
              ) : null}
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileChange} />
            </div>

            {remainingSlots === 0 ? (
              <div className={modalStyles.sitesLimitHint} role="note">
                <span className={modalStyles.sitesLimitProBadge}>Pro</span>
                <p className={modalStyles.sitesLimitHintText}>{copy.formatLimitReached(resolvedMaxSites)}</p>
              </div>
            ) : null}

            {hasPreview ? (
              <>
                <div className={styles.summary}>
                  <span className={`${styles.summaryChip} ${styles.summaryChipReady}`}>
                    {interpolate(csv.summaryReady, { count: String(stats.ready) })}
                  </span>
                  {stats.duplicate > 0 ? (
                    <span className={`${styles.summaryChip} ${styles.summaryChipDuplicate}`}>
                      {interpolate(csv.summaryDuplicate, { count: String(stats.duplicate) })}
                    </span>
                  ) : null}
                  {stats.invalid > 0 ? (
                    <span className={`${styles.summaryChip} ${styles.summaryChipInvalid}`}>
                      {interpolate(csv.summaryInvalid, { count: String(stats.invalid) })}
                    </span>
                  ) : null}
                  {stats.limit > 0 ? (
                    <span className={`${styles.summaryChip} ${styles.summaryChipLimit}`}>
                      {interpolate(csv.summaryLimit, { count: String(stats.limit) })}
                    </span>
                  ) : null}
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.checkCol} />
                        <th>{csv.columns.name}</th>
                        <th>{csv.columns.address}</th>
                        <th>{csv.columns.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const address = buildSiteAddress(item.site);
                        const selectable = item.status === "ready";
                        return (
                          <tr key={item.id} className={item.selected ? styles.rowSelected : undefined}>
                            <td>
                              <input
                                type="checkbox"
                                checked={Boolean(item.selected)}
                                disabled={!selectable}
                                onChange={() => toggleItem(item.id)}
                                aria-label={getSiteDisplayName(item.site) || csv.columns.name}
                              />
                            </td>
                            <td>
                              <strong>{getSiteDisplayName(item.site) || "—"}</strong>
                              {item.site.isPrimary ? <span className={styles.primaryBadge}>{copy.primary}</span> : null}
                            </td>
                            <td className={styles.addressCell}>{address || "—"}</td>
                            <td>
                              <span className={`${styles.badge} ${styles[`badge_${item.status}`] || ""}`}>{statusLabel(item.status)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <footer className={styles.footer}>
          <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {common.cancel}
          </UiKitButton>
          <UiKitButton type="button" variant="primary" onClick={handleConfirm} disabled={saving || stats.selected === 0}>
            {saving ? common.saving : interpolate(csv.confirm, { count: String(stats.selected) })}
          </UiKitButton>
        </footer>
      </div>
    </div>,
    document.body
  );
}
