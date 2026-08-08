import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { buildOpenStreetMapUrl, buildOsmEmbedUrl } from "../../utils/clientSites";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getSitesModalCopy } from "./sitesModalI18n";
import styles from "./SiteMapModal.module.css";
export default function SiteMapModal({
  latitude,
  longitude,
  label = "",
  address = "",
  onClose
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSitesModalCopy(locale), [locale]);
  const editor = copy.editor;
  const mapLabel = label || copy.primary;
  const interactiveMapTitle = interpolate(editor.interactiveMapTitle, {
    label: mapLabel
  });
  const embedUrl = buildOsmEmbedUrl(latitude, longitude, {
    zoom: 16
  });
  const osmUrl = buildOpenStreetMapUrl(latitude, longitude, 16);
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="site-map-modal-title">
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:map-marker-radius" />
            </div>
            <div>
              <h2 id="site-map-modal-title" className={styles.title}>
                {mapLabel}
              </h2>
              {address ? <p className={styles.subtitle}>{address}</p> : null}
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={editor.closeMap}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <iframe title={interactiveMapTitle} src={embedUrl} className={styles.mapFrame} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>

        <footer className={styles.footer}>
          <a href={osmUrl} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
            <Icon icon="mdi:open-in-new" aria-hidden />
            {editor.openInOsm}
          </a>
        </footer>
      </div>
    </div>, document.body);
}
