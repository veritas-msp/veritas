import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
import styles from "./RmmEnrollmentTokenCreatedModal.module.css";
export default function RmmEnrollmentTokenCreatedModal({
  open,
  copy,
  token,
  onClose,
  onCopy
}) {
  const tc = copy.tokenCreated;
  if (!open || !token) return null;
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(640px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rmm-token-created-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:content-copy" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{tc.eyebrow}</p>
              <h2 className={layout.title} id="rmm-token-created-title">
                {tc.title}
              </h2>
              <p className={layout.subtitle}>{tc.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body} style={{
        gridTemplateColumns: "1fr"
      }}>
          <div className={layout.content}>
            <div className={formStyles.statusRow}>
              <div>
                <div className={formStyles.statusLabel}>{tc.usageTitle}</div>
                <p className={formStyles.statusHint}>{tc.usageHint}</p>
              </div>
              <Icon icon="mdi:information-outline" style={{
              fontSize: "1.35rem",
              color: "var(--msp-muted)"
            }} aria-hidden />
            </div>
            <div className={styles.tokenFieldWrap}>
              <input className={styles.tokenInput} readOnly value={token} onFocus={e => e.target.select()} aria-label={tc.tokenAria} />
              <button type="button" className={styles.copyBtn} onClick={onCopy} title={tc.copyTitle}>
                <Icon icon="mdi:content-copy" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{tc.footerHint}</span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose}>
              {copy.common.close}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onCopy}>
              <Icon icon="mdi:content-copy" aria-hidden />
              {tc.copy}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
