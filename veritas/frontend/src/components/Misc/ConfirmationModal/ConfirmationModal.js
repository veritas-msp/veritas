import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import adminStyles from "../../AdminPage/AdminPanel.module.css";
const ConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Confirmation",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "danger"
}) => {
  const handleOverlayClick = e => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };
  const getConfirmButtonStyle = () => {
    const baseStyle = {
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '6px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      outline: 'none',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    };
    switch (confirmColor) {
      case "danger":
        return {
          ...baseStyle,
          backgroundColor: '#dc2626',
          color: 'white'
        };
      case "warning":
        return {
          ...baseStyle,
          backgroundColor: '#d97706',
          color: 'white'
        };
      case "success":
        return {
          ...baseStyle,
          backgroundColor: '#059669',
          color: 'white'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#dc2626',
          color: 'white'
        };
    }
  };
  const getConfirmIcon = () => {
    if (confirmColor === "danger" || confirmColor === "warning") {
      return "mdi:check";
    }
    return "mdi:check";
  };
  const getConfirmIconColor = () => {
    if (confirmColor === "danger") {
      return "#13BA8E";
    } else if (confirmColor === "warning") {
      return "#13BA8E";
    }
    return "#13BA8E";
  };
  const getConfirmButtonColor = () => {
    if (confirmColor === "danger" || confirmColor === "warning") {
      return "#ef4444";
    }
    return "#13BA8E";
  };
  return <AnimatePresence>
      {isOpen && <motion.div className={adminStyles.modalOverlay} initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} transition={{
      duration: 0.2
    }} onClick={handleOverlayClick}>
          <motion.div className={adminStyles.modalContent} style={{
        maxWidth: '500px'
      }} initial={{
        opacity: 0,
        scale: 0.95,
        y: 10
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.95,
        y: 10
      }} transition={{
        duration: 0.2,
        ease: "easeOut"
      }} onClick={e => e.stopPropagation()}>
            {}
            <div className={adminStyles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon={getConfirmIcon()} className={adminStyles.modalIcon} style={{
              color: getConfirmIconColor()
            }} />
                <h3>{title}</h3>
              </div>
              <button className={adminStyles.closeButton} onClick={onCancel} title="Close">
                <Icon icon="mdi:close" />
              </button>
            </div>

            {}
            <div className={adminStyles.modalBody}>
              <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
                {message}
              </p>
            </div>

            {}
            <div className={adminStyles.modalActions} style={{
          justifyContent: 'flex-end'
        }}>
              <button onClick={onConfirm} className={adminStyles.actionButton} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            backgroundColor: getConfirmButtonColor(),
            border: 'none',
            color: 'white'
          }} onMouseEnter={e => {
            if (confirmColor === "danger" || confirmColor === "warning") {
              e.target.style.backgroundColor = '#dc2626';
            } else {
              e.target.style.backgroundColor = '#0fa578';
            }
          }} onMouseLeave={e => {
            if (confirmColor === "danger" || confirmColor === "warning") {
              e.target.style.backgroundColor = '#ef4444';
            } else {
              e.target.style.backgroundColor = '#13BA8E';
            }
          }} title={confirmLabel}>
                <Icon icon="mdi:check" style={{
              fontSize: '16px'
            }} />
              </button>
            </div>
          </motion.div>
        </motion.div>}
    </AnimatePresence>;
};
export default ConfirmationModal;
