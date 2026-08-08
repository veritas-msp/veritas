import { useCallback, useEffect, useState } from "react";

export function useModalCloseGuard({
  open = true,
  onClose,
  hasUnsavedChanges,
  blocked = false
}) {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  useEffect(() => {
    if (!open) setDiscardConfirmOpen(false);
  }, [open]);
  const requestClose = useCallback(() => {
    if (blocked) return;
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [blocked, hasUnsavedChanges, onClose]);
  const cancelDiscard = useCallback(() => {
    setDiscardConfirmOpen(false);
  }, []);
  const confirmDiscard = useCallback(() => {
    setDiscardConfirmOpen(false);
    onClose();
  }, [onClose]);
  return {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  };
}
