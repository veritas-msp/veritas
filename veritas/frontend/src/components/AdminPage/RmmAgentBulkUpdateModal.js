import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Btn, Modal, ModalFooter } from "./AdminUi";
import { interpolate } from "./adminRmmI18n";
import { isRmmAgentVersionAtLeast } from "../EquipementPage/rmmMonitoringUtils";
import styles from "./AdminRmm.module.css";

export function agentNeedsManualUpdate(agent, latestVersion) {
  if (!agent || agent.update_requested_at) return false;
  const latest = latestVersion || agent.latest_agent_version;
  if (!latest) return true;
  const current = agent.agent_version;
  if (!current) return true;
  return !isRmmAgentVersionAtLeast(current, latest);
}

const WAVE_PRESETS = [5, 10, 25, 50];

export default function RmmAgentBulkUpdateModal({
  open,
  mode = "selection",
  copy,
  agents = [],
  selectedIds = new Set(),
  latestVersion = null,
  saving = false,
  onClose,
  onConfirm
}) {
  const updateCopy = copy?.agents?.update || {};
  const [clientId, setClientId] = useState("");
  const [waveSize, setWaveSize] = useState(10);

  useEffect(() => {
    if (!open) return;
    setClientId("");
    setWaveSize(10);
  }, [open, mode]);

  const companyOptions = useMemo(() => {
    const map = new Map();
    for (const agent of agents) {
      if (!agent?.client_id) continue;
      if (!map.has(agent.client_id)) {
        map.set(agent.client_id, agent.client_name || String(agent.client_id));
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }));
  }, [agents]);

  const outdatedPool = useMemo(() => {
    let pool = agents.filter(agent => agentNeedsManualUpdate(agent, latestVersion));
    if (mode === "company" && clientId) {
      pool = pool.filter(agent => String(agent.client_id) === String(clientId));
    }
    if (mode === "selection") {
      pool = agents.filter(agent => selectedIds.has(agent.id));
    }
    return pool;
  }, [agents, clientId, latestVersion, mode, selectedIds]);

  const targets = useMemo(() => {
    if (mode === "wave") {
      return outdatedPool.slice(0, Math.max(1, Number(waveSize) || 10));
    }
    if (mode === "company") {
      return outdatedPool;
    }
    return outdatedPool;
  }, [mode, outdatedPool, waveSize]);

  const title =
    mode === "company"
      ? updateCopy.byCompanyTitle || "Mettre à jour par entreprise"
      : mode === "wave"
        ? updateCopy.byWaveTitle || "Mettre à jour par vague"
        : updateCopy.bySelectionTitle || "Mettre à jour la sélection";

  const canConfirm =
    targets.length > 0 &&
    (mode !== "company" || Boolean(clientId)) &&
    !saving;

  if (!open) return null;

  const handleClose = () => {
    if (!saving) onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      icon="mdi:cloud-download-outline"
      width="520px"
      footer={
        <ModalFooter
          onCancel={handleClose}
          onConfirm={() => onConfirm(targets)}
          confirmLabel={interpolate(updateCopy.confirmLabel || "Lancer la mise à jour ({count})", {
            count: String(targets.length)
          })}
          confirmVariant="primary"
          confirmDisabled={!canConfirm}
          confirmLoading={saving}
        />
      }
    >
      <div className={styles.bulkUpdateBody}>
        {latestVersion ? (
          <p className={styles.bulkUpdateHint}>
            {interpolate(updateCopy.latestVersionHint || "Version cible : {version}", {
              version: latestVersion
            })}
          </p>
        ) : null}

        {mode === "company" ? (
          <label className={styles.bulkUpdateField}>
            <span>{updateCopy.companyLabel || "Entreprise"}</span>
            <select
              className={styles.bulkUpdateSelect}
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              disabled={saving}
            >
              <option value="">{updateCopy.companyPlaceholder || "Sélectionner une entreprise"}</option>
              {companyOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "wave" ? (
          <div className={styles.bulkUpdateField}>
            <span>{updateCopy.waveSizeLabel || "Taille de la vague"}</span>
            <div className={styles.bulkUpdateWavePresets}>
              {WAVE_PRESETS.map(size => (
                <Btn
                  key={size}
                  variant={Number(waveSize) === size ? "primary" : "secondary"}
                  onClick={() => setWaveSize(size)}
                  disabled={saving}
                >
                  {size}
                </Btn>
              ))}
              <input
                type="number"
                min={1}
                max={500}
                className={styles.bulkUpdateWaveInput}
                value={waveSize}
                onChange={e => setWaveSize(Math.max(1, Number(e.target.value) || 1))}
                disabled={saving}
                aria-label={updateCopy.waveSizeLabel || "Taille de la vague"}
              />
            </div>
            <p className={styles.bulkUpdateHint}>
              {interpolate(
                updateCopy.wavePoolHint ||
                  "{eligible} agent(s) en retard (hors mises à jour déjà demandées).",
                { eligible: String(outdatedPool.length) }
              )}
            </p>
          </div>
        ) : null}

        {mode === "selection" ? (
          <p className={styles.bulkUpdateHint}>
            {interpolate(
              updateCopy.selectionHint || "{count} agent(s) sélectionné(s) seront mis à jour.",
              { count: String(targets.length) }
            )}
          </p>
        ) : null}

        {mode === "company" && clientId ? (
          <p className={styles.bulkUpdateHint}>
            {interpolate(
              updateCopy.companyHint ||
                "{count} agent(s) de cette entreprise seront mis à jour (versions en retard).",
              { count: String(targets.length) }
            )}
          </p>
        ) : null}

        <div className={styles.bulkUpdateSummary}>
          <Icon icon="mdi:information-outline" aria-hidden />
          <span>
            {interpolate(updateCopy.summary || "{count} demande(s) de mise à jour seront envoyées.", {
              count: String(targets.length)
            })}
          </span>
        </div>

        {targets.length === 0 ? (
          <p className={styles.bulkUpdateEmpty}>
            {mode === "company" && !clientId
              ? updateCopy.pickCompany || "Choisissez une entreprise."
              : updateCopy.noneEligible || "Aucun agent éligible à la mise à jour."}
          </p>
        ) : (
          <ul className={styles.bulkUpdatePreview}>
            {targets.slice(0, 8).map(agent => (
              <li key={agent.id}>
                <strong>{agent.hostname || agent.machine_id || agent.id}</strong>
                <span>
                  {(agent.client_name || "—") +
                    " · " +
                    (agent.agent_version || "?") +
                    (latestVersion ? ` → ${latestVersion}` : "")}
                </span>
              </li>
            ))}
            {targets.length > 8 ? (
              <li className={styles.bulkUpdateMore}>
                {interpolate(updateCopy.andMore || "… et {count} autre(s)", {
                  count: String(targets.length - 8)
                })}
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </Modal>
  );
}
