import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getSslModalCopy } from "./sslCertificatesModalI18n";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import layout from "./EnterpriseFormModal.module.css";

export default function SslBulkIntervalModal({
  open,
  items = [],
  onClose,
  onSubmit
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getSslModalCopy(locale), [locale]);
  const common = useCommonCopy();
  const [intervalHours, setIntervalHours] = useState("24");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const first = Number(items[0]?.checkIntervalHours ?? items[0]?.check_interval_hours);
    setIntervalHours(String(Number.isFinite(first) && first > 0 ? first : 24));
    setSaving(false);
    setError("");
  }, [open, items]);

  if (!open) return null;

  const handleSubmit = async () => {
    const value = Number(intervalHours);
    if (!Number.isFinite(value) || value < 1) {
      setError(copy.add.interval);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit?.(Math.trunc(value));
      onClose?.();
    } catch (err) {
      setError(err?.message || copy.toasts?.saveError || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={layout.shell}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ssl-bulk-interval-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 className={layout.title} id="ssl-bulk-interval-title">
                {copy.meta?.interval || copy.add.interval}
              </h2>
              <p className={layout.subtitle}>
                {items.length > 1
                  ? `${items.length} certificats sélectionnés`
                  : "1 certificat sélectionné"}
              </p>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={layout.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={common.close}
            icon="mdi:close"
          />
        </header>

        <div className={layout.bodySingle}>
          <div className={layout.content}>
            <div className={kit.contentFadeUp}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="ssl-bulk-interval-input">
                  {copy.add.interval}
                </label>
                <NumberStepperInput
                  id="ssl-bulk-interval-input"
                  min={1}
                  max={8760}
                  inputClassName={layout.input}
                  value={intervalHours}
                  onChange={setIntervalHours}
                  increaseAriaLabel={copy.add.intervalIncrease}
                  decreaseAriaLabel={copy.add.intervalDecrease}
                />
              </div>
              {error ? (
                <p className={layout.footerHint} role="alert" style={{ color: "#b42318" }}>
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{copy.add.interval}</span>
          <div className={layout.footerActions}>
            <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {common.cancel}
            </UiKitButton>
            <UiKitButton
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              icon={saving ? "mdi:loading" : "mdi:content-save-outline"}
            >
              {saving ? common.saving : "Appliquer"}
            </UiKitButton>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
