import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getMaintenanceStatus, toggleMaintenance } from "../../api/maintenance";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { Page, Card, Field, Textarea, Btn, Switch, FormGrid, Select, NumberStepper } from "./AdminUi";
import ui from "./AdminUi.module.css";
import s from "./AdminMaintenance.module.css";
const COLOR_KEYS = [{
  key: "blue",
  value: "#2b5fab"
}, {
  key: "orange",
  value: "#d97706"
}, {
  key: "red",
  value: "#dc2626"
}, {
  key: "gray",
  value: "#6b7280"
}];
export default function AdminMaintenance() {
  const copy = useAdminPageCopy("maintenance");
  const adminCopy = useAdminCommonCopy();
  const commonCopy = useCommonCopy();
  const colorPresets = useMemo(() => COLOR_KEYS.map(preset => ({
    ...preset,
    label: adminCopy.colors[preset.key]
  })), [adminCopy.colors]);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [speed, setSpeed] = useState(22);
  const [direction, setDirection] = useState("left");
  const [color, setColor] = useState("#d97706");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getMaintenanceStatus().then(data => {
      setEnabled(Boolean(data?.enabled || data?.maintenanceMode));
      setMessage(data?.message || "");
      setSpeed(Number.isFinite(Number(data?.tickerSpeed)) ? Number(data.tickerSpeed) : 22);
      setDirection(data?.tickerDirection === "right" ? "right" : "left");
      const c = /^#([0-9a-fA-F]{6})$/.test(data?.tickerColor || "") ? data.tickerColor : "#d97706";
      setColor(c);
    }).catch(() => toast.error(copy.loadError));
  }, [copy.loadError]);
  const dispatchUpdate = (nextEnabled, nextMessage, opts) => {
    window.dispatchEvent(new CustomEvent("maintenanceStatusUpdated", {
      detail: {
        enabled: nextEnabled,
        message: nextMessage,
        tickerSpeed: opts.tickerSpeed,
        tickerDirection: opts.tickerDirection,
        tickerColor: opts.tickerColor
      }
    }));
  };
  const tickerOptions = {
    tickerSpeed: speed,
    tickerDirection: direction,
    tickerColor: color
  };
  const save = async (nextEnabled = enabled) => {
    setSaving(true);
    try {
      await toggleMaintenance(nextEnabled, message, tickerOptions);
      setEnabled(nextEnabled);
      dispatchUpdate(nextEnabled, message, tickerOptions);
      toast.success(copy.saveSuccess);
    } catch (e) {
      toast.error(e.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleToggle = async on => {
    setEnabled(on);
    setSaving(true);
    try {
      await toggleMaintenance(on, message, tickerOptions);
      dispatchUpdate(on, message, tickerOptions);
      toast.success(on ? copy.bannerEnabled : copy.bannerDisabled);
    } catch (e) {
      setEnabled(!on);
      toast.error(e.message || copy.error);
    } finally {
      setSaving(false);
    }
  };
  const previewText = message.trim() || copy.previewFallback;
  return <Page>
      <Card fill>
        <div className={ui.toolRow}>
          <div className={ui.toolLeft}>
            <Switch checked={enabled} onChange={handleToggle} label={enabled ? copy.switchEnabled : copy.switchDisabled} />
          </div>
          <Btn icon="mdi:content-save-outline" onClick={() => save()} disabled={saving}>
            {saving ? commonCopy.saving : commonCopy.save}
          </Btn>
        </div>

        <div className={s.formLayout}>
          <Field label={copy.messageLabel} spanFull hint={copy.messageHint}>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={copy.messagePlaceholder} rows={3} />
          </Field>

          <FormGrid cols={3}>
            <Field label={copy.speedLabel} hint={copy.speedHint}>
              <NumberStepper block value={speed} onChange={setSpeed} min={5} max={60} suffix="s" ariaLabel={copy.speedAria} />
            </Field>
            <Field label={copy.directionLabel}>
              <Select value={direction} onChange={e => setDirection(e.target.value)}>
                <option value="left">{adminCopy.directions.left}</option>
                <option value="right">{adminCopy.directions.right}</option>
              </Select>
            </Field>
            <Field label={copy.colorLabel}>
              <div className={s.colorRow}>
                {colorPresets.map(preset => <button key={preset.key} type="button" title={preset.label} aria-label={preset.label} aria-pressed={color === preset.value} onClick={() => setColor(preset.value)} className={`${s.colorPresetBtn} ${color === preset.value ? s.colorPresetBtnSelected : ""}`} style={{
                background: preset.value
              }} />)}
                <label className={s.colorCustom} title={adminCopy.colors.custom}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label={adminCopy.colors.custom} />
                </label>
              </div>
            </Field>
          </FormGrid>

          <div className={s.previewSection}>
            <span className={s.previewLabel}>{copy.previewLabel}</span>
            <div className={s.previewFrame}>
              <div className={s.previewBanner} style={{
              background: color
            }}>
                <span className={s.previewText}>{previewText}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Page>;
}
