import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import {
  extractAlertServiceMeta,
  resolveExclusionUntil,
  toDatetimeLocalValue
} from "./supervisionTriageUtils";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import { CalendarDaysIcon } from "../Misc/Sidebar/lucideAnimated";
import EquipmentHoverIcon from "./EquipmentHoverIcon";
import styles from "./SupervisionMaintenanceModal.module.css";

function defaultCustomUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

export default function SupervisionMaintenanceModal({
  open,
  item,
  copy,
  busy = false,
  deviceOnly = false,
  onConfirm,
  onClose
}) {
  const t = copy?.maintenanceModal || {};
  const [scope, setScope] = useState(deviceOnly ? "device" : "service");
  const [durationId, setDurationId] = useState("1h");
  const [customUntilLocal, setCustomUntilLocal] = useState(defaultCustomUntil);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setScope(deviceOnly ? "device" : "service");
    setDurationId("1h");
    setCustomUntilLocal(defaultCustomUntil());
    setReason("");
  }, [open, item?.id, deviceOnly]);

  const durationOptions = useMemo(
    () => [
      ["1h", t.h1 || "1 heure"],
      ["4h", t.h4 || "4 heures"],
      ["8h", t.h8 || "8 heures"],
      ["1d", t.d1 || "1 jour"],
      ["3d", t.d3 || "3 jours"],
      ["7d", t.d7 || "7 jours"],
      ["1m", t.m1 || "1 mois"],
      ["3m", t.m3 || "3 mois"],
      ["custom", t.custom || "Jusqu’à une date/heure"],
      ["forever", t.forever || "Indéterminée"]
    ],
    [t]
  );

  if (!open || !item) return null;

  const serviceMeta = extractAlertServiceMeta(item);
  const canUseServiceScope = !deviceOnly && Boolean(serviceMeta.serviceKey);
  const effectiveScope = canUseServiceScope ? scope : "device";
  const untilInfo = resolveExclusionUntil(durationId, customUntilLocal);
  const canSubmit = Boolean(String(reason || "").trim()) && !untilInfo.invalid && !busy;

  const handleSubmit = event => {
    event?.preventDefault?.();
    if (!canSubmit) return;
    onConfirm?.({
      exclusion: {
        scope: effectiveScope,
        kind: "maintenance",
        excludedUntil: untilInfo.excludedUntil,
        reason: String(reason).trim(),
        ...serviceMeta,
        family: serviceMeta.family || item.family || null,
        equipmentId: serviceMeta.equipmentId || item.equipmentId || null,
        clientId: serviceMeta.clientId || item.clientId || null,
        equipmentName: serviceMeta.equipmentName || item.equipmentName || item.subtitle || null
      },
      dismissAlert: !deviceOnly
    });
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={busy ? undefined : onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.shell}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervision-maintenance-title"
      >
        <div className={formStyles.accentBar} aria-hidden />

        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <EquipmentHoverIcon Animated={CalendarDaysIcon} iconify="mdi:wrench-clock" size={22} />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{t.eyebrow || "Maintenance"}</p>
              <h2 className={formStyles.title} id="supervision-maintenance-title">
                {t.title || "Mettre en maintenance"}
              </h2>
              <p className={formStyles.subtitle}>
                {t.subtitle || "Suspend les alertes et masque le périphérique du centre de supervision."}
              </p>
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={formStyles.closeBtn}
            onClick={onClose}
            disabled={busy}
            aria-label={t.cancel || "Annuler"}
            icon="mdi:close"
          />
        </header>

        <form className={formStyles.bodySingle} onSubmit={handleSubmit}>
          <div className={`${formStyles.content} ${styles.content}`}>
            <div className={`${kit.contentFadeUp} ${styles.fade}`} key={`maint-${item?.id || "new"}-${open}`}>
              <p className={styles.hint}>
                {t.hint ||
                  t.subtitle ||
                  "Les alertes sont suspendues pendant la durée choisie. Indiquez un motif obligatoire."}
              </p>

              {!deviceOnly ? (
                <div className={styles.section}>
                  <p className={formStyles.label}>{t.scope || "Portée"}</p>
                  <div className={styles.radioList}>
                    {canUseServiceScope ? (
                      <label
                        className={`${styles.radioRow} ${scope === "service" ? styles.radioRowActive : ""}`.trim()}
                      >
                        <input
                          type="radio"
                          name="maint-scope"
                          checked={scope === "service"}
                          disabled={busy}
                          onChange={() => setScope("service")}
                        />
                        <span>{t.scopeService || "Ce service uniquement"}</span>
                      </label>
                    ) : null}
                    <label
                      className={`${styles.radioRow} ${effectiveScope === "device" ? styles.radioRowActive : ""}`.trim()}
                    >
                      <input
                        type="radio"
                        name="maint-scope"
                        checked={effectiveScope === "device"}
                        disabled={busy || !canUseServiceScope}
                        onChange={() => setScope("device")}
                      />
                      <span>{t.scopeDevice || "Tous les services de ce périphérique"}</span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className={styles.section}>
                <p className={formStyles.label}>{t.duration || "Durée"}</p>
                <div className={styles.chipGrid} role="radiogroup" aria-label={t.duration || "Durée"}>
                  {durationOptions.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={durationId === id}
                      className={`${styles.chip} ${durationId === id ? styles.chipActive : ""}`.trim()}
                      disabled={busy}
                      onClick={() => setDurationId(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {durationId === "custom" ? (
                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="maint-until">
                    {t.untilLabel || "Jusqu’à"}
                  </label>
                  <input
                    id="maint-until"
                    type="datetime-local"
                    className={formStyles.input}
                    value={customUntilLocal}
                    min={toDatetimeLocalValue(new Date())}
                    disabled={busy}
                    onChange={e => setCustomUntilLocal(e.target.value)}
                  />
                  {untilInfo.invalid ? (
                    <p className={styles.fieldError}>{t.untilInvalid || "Choisissez une date/heure dans le futur"}</p>
                  ) : null}
                </div>
              ) : null}

              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="maint-reason">
                  {t.reason || "Motif (obligatoire)"}
                </label>
                <textarea
                  id="maint-reason"
                  className={`${formStyles.input} ${styles.textarea}`.trim()}
                  value={reason}
                  disabled={busy}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t.reasonPlaceholder || "Maintenance serveur planifiée par le client…"}
                />
              </div>
            </div>
          </div>

          <footer className={formStyles.footer}>
            <span className={formStyles.footerHint}>{t.footerHint || "Les champs marqués * sont obligatoires"}</span>
            <div className={formStyles.footerActions}>
              <UiKitButton type="button" variant="secondary" disabled={busy} onClick={onClose}>
                {t.cancel || "Annuler"}
              </UiKitButton>
              <UiKitButton type="submit" variant="primary" disabled={!canSubmit}>
                {busy ? (
                  <>
                    <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                    {t.working || "En cours…"}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:traffic-cone" aria-hidden />
                    {t.confirm || "Mettre en maintenance"}
                  </>
                )}
              </UiKitButton>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
