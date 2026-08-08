import { createPortal } from "react-dom";
import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import ProFeatureBadge from "./ProFeatureBadge";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getLocalizedProFeaturePromo, getProFeaturePromoModalCopy } from "./proFeaturePromoI18n";
import styles from "./ProFeaturePromoModal.module.css";
export default function ProFeaturePromoModal({
  open = false,
  featureKey = null,
  promoOverride = null,
  stacked = false,
  onClose
}) {
  const locale = useAppLocale();
  const modalCopy = useMemo(() => getProFeaturePromoModalCopy(locale), [locale]);
  const promo = promoOverride || (featureKey ? getLocalizedProFeaturePromo(featureKey, locale) : null);
  if (!open || !promo) return null;
  return createPortal(<div className={`${styles.overlay} ${stacked ? styles.overlayStacked : ""}`} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pro-feature-promo-title" aria-describedby="pro-feature-promo-desc">
        <div className={styles.accentBar} aria-hidden />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrap} aria-hidden>
              <Icon icon={promo.icon} />
            </div>
            <div>
              <div className={styles.titleRow}>
                <h2 className={styles.title} id="pro-feature-promo-title">
                  {promo.title}
                </h2>
                <ProFeatureBadge />
              </div>
              <p className={styles.subtitle}>{promo.subtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={modalCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.description} id="pro-feature-promo-desc">
            {promo.description}
          </p>
          {promo.proPages?.length ? <div className={styles.pagesSection}>
              <p className={styles.pagesHeading}>{modalCopy.pagesHeading}</p>
              <ul className={styles.pagesList}>
                {promo.proPages.map(page => <li key={page.label} className={styles.pageItem}>
                    {page.icon ? <Icon icon={page.icon} className={styles.pageIcon} aria-hidden /> : null}
                    <span className={styles.pageText}>
                      <span className={styles.pageLabel}>{page.label}</span>
                      <span className={styles.pageDesc}>{page.description}</span>
                    </span>
                  </li>)}
              </ul>
            </div> : null}
          <ul className={styles.bulletList}>
            {promo.bullets.map(item => <li key={item}>
                <Icon icon="mdi:check-circle" className={styles.bulletIcon} aria-hidden />
                <span>{item}</span>
              </li>)}
          </ul>
          <p className={styles.proNote}>
            {modalCopy.proNoteBefore}
            <strong>Veritas Pro</strong>
            {modalCopy.proNoteAfter}
          </p>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.primaryBtn} onClick={onClose}>
            {modalCopy.understand}
          </button>
        </footer>
      </div>
    </div>, document.body);
}
