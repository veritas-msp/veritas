import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./CollectorFormModal.module.css";
export default function CollectorFoldersModal({
  open,
  copy,
  loading = false,
  folders = [],
  onClose,
  onSelect
}) {
  const cf = copy.collectorFolders;
  if (!open) return null;
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(560px, 100%)",
      maxHeight: "min(80vh, 560px)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="collector-folders-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:folder-search-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{cf.eyebrow}</p>
              <h2 className={layout.title} id="collector-folders-modal-title">
                {cf.title}
              </h2>
              <p className={layout.subtitle}>{cf.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div style={{
        overflowY: "auto",
        padding: "1.1rem 1.35rem 1.25rem",
        minHeight: "180px"
      }}>
          {loading ? <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--msp-muted)"
        }}>
              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
              {cf.loading}
            </div> : folders.length === 0 ? <p style={{
          margin: 0,
          fontSize: "0.875rem",
          color: "var(--msp-muted)"
        }}>{cf.empty}</p> : <div style={{
          display: "grid",
          gap: "0.4rem"
        }}>
              {folders.map(folder => <button key={folder} type="button" className={styles.secondaryBtn} style={{
            justifyContent: "flex-start",
            width: "100%"
          }} onClick={() => onSelect(folder)}>
                  <Icon icon="mdi:folder-outline" aria-hidden />
                  {folder}
                </button>)}
            </div>}
        </div>

        <footer className={layout.footer}>
          <div className={layout.footerActions} style={{
          marginLeft: 0,
          width: "100%",
          justifyContent: "flex-end"
        }}>
            <button type="button" className={layout.ghostBtn} onClick={onClose}>
              {copy.common.close}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
