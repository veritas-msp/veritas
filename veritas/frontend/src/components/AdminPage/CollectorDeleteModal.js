import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import deleteStyles from "../EnterprisesPage/EnterpriseDeleteModal.module.css";
export default function CollectorDeleteModal({
  open,
  collectorName,
  saving = false,
  onClose,
  onConfirm
}) {
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("collectorDelete");
  const resolvedName = collectorName || adminCopy.thisCollector;
  if (!open) return null;
  return createPortal(<div className={deleteStyles.overlay} onClick={onClose} role="presentation">
      <div className={deleteStyles.shell} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="collector-delete-modal-title" aria-describedby="collector-delete-modal-desc">
        <div className={deleteStyles.accentBar} aria-hidden />
        <header className={deleteStyles.header}>
          <div className={deleteStyles.headerMain}>
            <div className={deleteStyles.iconWrap} aria-hidden>
              <Icon icon="mdi:delete-alert-outline" />
            </div>
            <div>
              <h2 className={deleteStyles.title} id="collector-delete-modal-title">
                {modalCopy.title}
              </h2>
              <p className={deleteStyles.subtitle} id="collector-delete-modal-desc">
                {adminCopy.irreversibleSubtitle}
              </p>
            </div>
          </div>
          <button type="button" className={deleteStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={deleteStyles.body}>
          <div className={deleteStyles.clientName}>{resolvedName}</div>
          <div className={deleteStyles.warningBox}>
            <p className={deleteStyles.warningTitle}>{adminCopy.consequences}</p>
            <ul className={deleteStyles.warningList}>
              {(modalCopy.bullets || []).map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        <footer className={deleteStyles.footer}>
          <button type="button" className={deleteStyles.ghostBtn} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={deleteStyles.dangerBtn} onClick={onConfirm} disabled={saving}>
            {saving ? <>
                <Icon icon="mdi:loading" className={deleteStyles.spinning} aria-hidden />
                {adminCopy.deleting}
              </> : <>
                <Icon icon="mdi:trash-can-outline" aria-hidden />
                {adminCopy.deletePermanently}
              </>}
          </button>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
