import React from "react";
import { ConfirmModal } from "../AdminPage/AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
export default function ModalDiscardConfirm({
  open,
  onConfirm,
  onClose,
  loading = false,
  title,
  message,
  confirmLabel
}) {
  const copy = useCommonCopy();
  return <ConfirmModal open={open} title={title ?? copy.discardCloseTitle} icon="mdi:alert-outline" message={message ?? copy.discardCloseMessage} confirmLabel={confirmLabel ?? copy.discardCloseConfirm} confirmVariant="dangerSolid" confirmLoading={loading} onConfirm={onConfirm} onClose={onClose} />;
}
