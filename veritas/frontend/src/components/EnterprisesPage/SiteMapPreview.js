import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { buildOsmEmbedUrl } from "../../utils/clientSites";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getSitesModalCopy } from "./sitesModalI18n";
import SiteMapModal from "./SiteMapModal";
import styles from "./SiteMapPreview.module.css";
export default function SiteMapPreview({
  latitude,
  longitude,
  label = "",
  address = "",
  compact = false,
  onLocate,
  locating = false,
  className = ""
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSitesModalCopy(locale), [locale]);
  const editor = copy.editor;
  const mapLabel = label || copy.primary;
  const mapFrameTitle = interpolate(editor.mapFrameTitle, {
    label: mapLabel
  });
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const embedUrl = hasCoords ? buildOsmEmbedUrl(latitude, longitude) : null;
  const openMapModal = event => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setMapModalOpen(true);
  };
  if (hasCoords && embedUrl) {
    if (compact) {
      return <>
          <button type="button" className={`${styles.preview} ${styles.previewCompact} ${styles.previewCompactButton} ${className}`} onClick={openMapModal} aria-label={`${editor.openMap} · ${mapLabel}`} title={editor.openMap}>
            <iframe title={mapFrameTitle} src={embedUrl} className={styles.mapFrameCompact} loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
          </button>
          {mapModalOpen ? <SiteMapModal latitude={latitude} longitude={longitude} label={mapLabel} address={address} onClose={() => setMapModalOpen(false)} /> : null}
        </>;
    }
    return <>
        <div className={`${styles.preview} ${className}`}>
          <iframe title={mapFrameTitle} src={embedUrl} className={styles.mapFrame} loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex={-1} />
          <button type="button" className={styles.mapOverlay} onClick={openMapModal} aria-label={`${editor.openMap} · ${mapLabel}`}>
            <Icon icon="mdi:map-search-outline" aria-hidden />
            {editor.enlargeMap}
          </button>
        </div>
        {mapModalOpen ? <SiteMapModal latitude={latitude} longitude={longitude} label={mapLabel} address={address} onClose={() => setMapModalOpen(false)} /> : null}
      </>;
  }
  return <div className={`${styles.placeholder} ${compact ? styles.placeholderCompact : ""} ${className}`}>
      <Icon icon="mdi:map-marker-question-outline" className={styles.placeholderIcon} aria-hidden />
      <span className={styles.placeholderText}>{editor.mapUnavailable}</span>
      {onLocate ? <button type="button" className={styles.locateBtn} onClick={onLocate} disabled={locating}>
          <Icon icon={locating ? "mdi:loading" : "mdi:crosshairs-gps"} aria-hidden />
          {locating ? editor.locating : editor.locateAddress}
        </button> : null}
    </div>;
}
