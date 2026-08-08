import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaSync, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { updateEquipment } from "../../api/equipment";
import { getUnifiApiConfig, isUnifiUdmGateway } from "./unifiEquipmentUtils";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "./UnifiApiConfigModal.module.css";
const modalRoot = document.getElementById("modal-root");
export default function UnifiApiConfigModal({
  isOpen,
  onClose,
  equipment,
  onSaved
}) {
  const existing = getUnifiApiConfig(equipment);
  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rejectUnauthorized, setRejectUnauthorized] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState({
    host: "",
    apiKey: "",
    rejectUnauthorized: false
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isOpen || !equipment) return;
    const config = getUnifiApiConfig(equipment);
    const snapshot = {
      host: config.host || equipment.ip || "",
      apiKey: config.apiKey || "",
      rejectUnauthorized: config.rejectUnauthorized === true
    };
    setHost(snapshot.host);
    setApiKey(snapshot.apiKey);
    setRejectUnauthorized(snapshot.rejectUnauthorized);
    setInitialSnapshot(snapshot);
  }, [isOpen, equipment]);
  const hasUnsavedChanges = host !== initialSnapshot.host || apiKey !== initialSnapshot.apiKey || rejectUnauthorized !== initialSnapshot.rejectUnauthorized;
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges,
    blocked: saving || testing
  });
  if (!isOpen || !equipment || !modalRoot || !isUnifiUdmGateway(equipment)) return null;
  const handleTest = async () => {
    if (!host.trim() || !apiKey.trim()) {
      toast.warning("Enter the URL and API key before testing");
      return;
    }
    setTesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unifi/equipment-test`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          host: host.trim(),
          apiKey: apiKey.trim(),
          rejectUnauthorized
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || "Connection test failed");
      }
      toast.success(data.message || "UniFi API connection successful");
    } catch (err) {
      toast.error(err.message || "Unable to reach the UniFi API");
    } finally {
      setTesting(false);
    }
  };
  const handleSave = async () => {
    if (!host.trim() || !apiKey.trim()) {
      toast.warning("URL and API key are required");
      return;
    }
    setSaving(true);
    try {
      await updateEquipment(equipment.id, {
        name: equipment.name,
        model: equipment.model || equipment.modele,
        manufacturer: equipment.manufacturer || equipment.fabricant,
        unifiApiHost: host.trim(),
        unifiApiKey: apiKey.trim(),
        unifiApiRejectUnauthorized: rejectUnauthorized,
        unifiApiConfiguredAt: new Date().toISOString()
      }, equipment);
      toast.success("UniFi API connection saved");
      onSaved?.({
        unifiApiHost: host.trim(),
        unifiApiKey: apiKey.trim(),
        unifiApiRejectUnauthorized: rejectUnauthorized,
        unifiApiConfiguredAt: new Date().toISOString()
      });
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<>
    <div className={styles.overlay} onClick={requestClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Icon icon="simple-icons:ubiquiti" className={styles.titleIcon} />
            API UniFi · {equipment.name}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={requestClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.subtitle}>
            Configure the connection to the controller's local API (UDM Pro / UDM Pro Max) to automatically
            synchronize device data.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>Controller URL</span>
            <input type="text" className={styles.input} placeholder="https://192.168.1.1" value={host} onChange={e => setHost(e.target.value)} />
            <span className={styles.hint}>UDM Pro IP address or hostname (HTTPS)</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Local API key</span>
            <input type="password" className={styles.input} placeholder="API key generated in UniFi Network" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="off" />
            <span className={styles.hint}>UniFi OS → Settings → Control Plane → Integrations → API Keys</span>
          </label>

          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={rejectUnauthorized} onChange={e => setRejectUnauthorized(e.target.checked)} />
            Verify SSL certificate (uncheck for a self-signed certificate)
          </label>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnTest} onClick={handleTest} disabled={testing || saving}>
            <FaSync className={testing ? styles.spin : undefined} />
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button type="button" className={styles.btnSecondary} onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving || testing}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
    <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, modalRoot);
}
