import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import modalLayout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { DashboardDistributionBars } from "./DashboardCharts";
import styles from "./DashboardDistributionModal.module.css";
export default function DashboardDistributionModal({
  open,
  title,
  icon,
  subtitle,
  items = [],
  emptyLabel,
  closeLabel,
  onClose
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = event => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(<div className={modalLayout.overlay} onClick={onClose} role="presentation">
      <div className={`${modalLayout.shell} ${modalLayout.shellMedium} ${styles.shell}`} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dashboard-distribution-modal-title">
        <div className={modalLayout.accentBar} aria-hidden />
        <header className={modalLayout.header}>
          <div className={modalLayout.headerMain}>
            <div className={modalLayout.headerIconWrap} aria-hidden>
              <Icon icon={icon || "mdi:chart-bar"} />
            </div>
            <div className={modalLayout.headerText}>
              <h2 className={modalLayout.title} id="dashboard-distribution-modal-title">
                {title}
              </h2>
              {subtitle ? <p className={modalLayout.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className={modalLayout.closeBtn} onClick={onClose} aria-label={closeLabel}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <DashboardDistributionBars items={items} emptyLabel={emptyLabel} />
        </div>
      </div>
    </div>, document.body);
}
