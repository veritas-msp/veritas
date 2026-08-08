import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styles from './ModalV2.module.css';
const modalRoot = document.getElementById('modal-root');
export default function ModalV2({
  isOpen,
  onClose,
  children,
  closeOnOverlayClick = true
}) {
  const elRef = useRef(null);
  if (!elRef.current) {
    elRef.current = document.createElement('div');
  }
  useEffect(() => {
    const el = elRef.current;
    modalRoot.appendChild(el);
    return () => {
      modalRoot.removeChild(el);
    };
  }, []);
  if (!isOpen) return null;
  const handleOverlayClick = () => {
    if (closeOnOverlayClick && onClose) onClose();
  };
  return ReactDOM.createPortal(<div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>, elRef.current);
}
