import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunitySitesLimit } from "../../config/edition";
import { interpolate } from "../../i18n/translate";
import { buildSiteAddress, getSiteDisplayName } from "../../utils/clientSites";
import { getSitesModalCopy } from "./sitesModalI18n";
import { buildSitesCsvPreview, downloadSitesCsvTemplate, getSelectedImportSites, parseSitesCsvFile } from "./sitesCsvImport";
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
  const {
    isCommunity,
    limits
  } = useVeritasEdition();
  const resolvedMaxSites = maxSites != null ? maxSites : isCommunity ? getCommunitySitesLimit(limits) : null;
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const remainingSlots = resolvedMaxSites == null ? null : Math.max(0, resolvedMaxSites - existingSites.length);

  const stats = useMemo(() => {
    const ready = items.filter(item => item.status === "ready").length;
    const selected = items.filter(item => item.selected && item.status === "ready").length;
    const duplicate = items.filter(item => item.status === "duplicate").length;
    const invalid = items.filter(item => item.status === "invalid").length;
    const limit = items.filter(item => item.status === "limit").length;
    return { ready, selected, duplicate, invalid, limit };
  }, [items]);

  const applyFile = async file => {
    if (!file) return;
    try {
      const parsed = await parseSitesCsvFile(file);
      if (!parsed.rows.length) {
        toast.error(csv.emptyFile);
        setFileName("");
        setItems([]);
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
      setItems([]);
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

  const toggleItem = id => {
    setItems(prev => {
      const target = prev.find(item => item.id === id);
      if (!target || target.status !== "ready") return prev;
      const selectedCount = prev.filter(item => item.selected && item.status === "ready" && item.id !== id).length;
      if (!target.selected && remainingSlots != null && selectedCount >= remainingSlots) {
        toast.warn(copy.formatLimitReached(resolvedMaxSites));
        return prev;
      }
      return prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item);
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

  return createPortal(<div className={`${modalStyles.overlay} ${styles.stackedOverlay}`} onClick={saving ? undefined : onClose}>
      <div className={`${modalStyles.shell} ${styles.shell}`} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sites-csv-import-title">
        <div className={modalStyles.accentBar} />
        <header className={modalStyles.header}>
          <div className={modalStyles.headerMain}>
            <div className={modalStyles.headerIconWrap}>
              <Icon icon="mdi:file-delimited-outline" aria-hidden />
            </div>
            <div>
              <h2 id="sites-csv-import-title" className={modalStyles.title}>{csv.title}</h2>
              <p className={modalStyles.subtitle}>{csv.subtitle}</p>
            </div>
          </div>
          <button type="button" className={modalStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.toolbar}>
            <button type="button" className={modalStyles.ghostBtn} onClick={() => downloadSitesCsvTemplate(locale)}>
              <Icon icon="mdi:download-outline" aria-hidden />
              {csv.downloadTemplate}
            </button>
            <p className={styles.hint}>{csv.templateHint}</p>
          </div>

          <div
            className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""}`}
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
            <Icon icon="mdi:cloud-upload-outline" className={styles.dropzoneIcon} aria-hidden />
            <p className={styles.dropzoneTitle}>{csv.dropTitle}</p>
            <p className={styles.dropzoneHint}>{csv.dropHint}</p>
            <button type="button" className={modalStyles.addBtn} onClick={() => fileInputRef.current?.click()}>
              <Icon icon="mdi:file-plus-outline" aria-hidden />
              {fileName || csv.pickFile}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileChange} />
          </div>

          {remainingSlots === 0 ? <div className={modalStyles.sitesLimitHint} role="note">
              <span className={modalStyles.sitesLimitProBadge}>Pro</span>
              <p className={modalStyles.sitesLimitHintText}>{copy.formatLimitReached(resolvedMaxSites)}</p>
            </div> : null}

          {items.length > 0 ? <>
              <div className={styles.summary}>
                <span>{interpolate(csv.summaryReady, { count: String(stats.ready) })}</span>
                {stats.duplicate > 0 ? <span>{interpolate(csv.summaryDuplicate, { count: String(stats.duplicate) })}</span> : null}
                {stats.invalid > 0 ? <span>{interpolate(csv.summaryInvalid, { count: String(stats.invalid) })}</span> : null}
                {stats.limit > 0 ? <span>{interpolate(csv.summaryLimit, { count: String(stats.limit) })}</span> : null}
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
                      return <tr key={item.id} className={item.selected ? styles.rowSelected : undefined}>
                          <td>
                            <input type="checkbox" checked={Boolean(item.selected)} disabled={!selectable} onChange={() => toggleItem(item.id)} aria-label={getSiteDisplayName(item.site) || csv.columns.name} />
                          </td>
                          <td>
                            <strong>{getSiteDisplayName(item.site) || "—"}</strong>
                            {item.site.isPrimary ? <span className={styles.primaryBadge}>{copy.primary}</span> : null}
                          </td>
                          <td className={styles.addressCell}>{address || "—"}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[`badge_${item.status}`] || ""}`}>{statusLabel(item.status)}</span>
                          </td>
                        </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </> : null}
        </div>

        <footer className={modalStyles.footer}>
          <button type="button" className={modalStyles.cancelBtn} onClick={onClose} disabled={saving}>
            {common.cancel}
          </button>
          <button type="button" className={modalStyles.saveBtn} onClick={handleConfirm} disabled={saving || stats.selected === 0}>
            {saving ? common.saving : interpolate(csv.confirm, { count: String(stats.selected) })}
          </button>
        </footer>
      </div>
    </div>, document.body);
}
