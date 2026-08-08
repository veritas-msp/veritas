import React from "react";
import { createPortal } from "react-dom";
import { Icon as IconifyIcon } from "@iconify/react";
import addStyles from "../EquipementPage/AddEquipmentModal.module.css";
export default function CenteredFormModal({
  isOpen,
  title,
  icon,
  onClose,
  closeOnOverlayClick = true,
  children
}) {
  if (!isOpen) return null;
  const handleOverlayClick = () => {
    if (closeOnOverlayClick && onClose) onClose();
  };
  const handleContentClick = e => {
    e.stopPropagation();
  };
  const modalContent = <div className={addStyles.overlay} onClick={handleOverlayClick}>
      <div className={addStyles.modal} onClick={handleContentClick}>
        <div className={addStyles.header}>
          <h2 className={addStyles.title}>
            {icon && <IconifyIcon icon={icon} className={addStyles.titleIcon} />}
            {title}
          </h2>
          <button type="button" className={addStyles.closeBtn} onClick={onClose} title="Close" aria-label="Close">
            ×
          </button>
        </div>

        {children}
      </div>
    </div>;
  return createPortal(modalContent, document.body);
}
