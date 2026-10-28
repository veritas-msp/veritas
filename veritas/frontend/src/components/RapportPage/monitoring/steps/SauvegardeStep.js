import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { getIconPath } from "../../../../utils/assetHelper";
import BackupConfigModal from "../../../EnterprisesPage/BackupConfigModal";
import equipmentStyles from "../../../EquipementPage/EquipmentPage.module.css";
import { runMappedBackupJobsSyncForClient } from "../supervisionReportSync";
import styles from "../RapportMonitoringBuilder.module.css";
import { MonitoringStepShell, MonitoringStepSection, MonitoringStepTableWrap, MonitoringPagedBlock, MonitoringTextCell } from "../MonitoringStepLayout";
import { formatServeurLieLabel, pickBackupJobType, pickBackupJobDestination } from "../../../EnterprisesPage/backupJobUtils";
import { getBackupJobStatus, getBackupJobStatusLabel, getBackupJobStatusTitle, getBackupJobRowClassName, getBackupJobRowStyle, normalizeBackupJobForStatus } from "../../../CybersecuritePage/backupJobStatusUtils";
import { formatTableDate, formatTableDateTime } from "../../../../utils/tableDateFormat";

function formatDate(raw) {
  if (!raw) return "-";
  return formatTableDate(raw) || "-";
}
function formatDateTime(raw) {
  if (!raw) return "-";
  return formatTableDateTime(raw) || "-";
}
function renderInstanceIcon(inst) {
  if (inst.logiciel === "Veeam") {
    return <img src={getIconPath("veeam.png")} alt="Veeam" style={{
      width: 20,
      height: 20,
      borderRadius: 4,
      marginRight: "0.5rem",
      verticalAlign: "middle"
    }} />;
  }
  if (inst.logiciel === "HYCU Backup") {
    return <img src={getIconPath("hycu.png")} alt="HYCU Backup" style={{
      width: 20,
      height: 20,
      borderRadius: 4,
      marginRight: "0.5rem",
      verticalAlign: "middle"
    }} />;
  }
  return <Icon icon="mdi:database-sync-outline" width={20} height={20} style={{
    marginRight: "0.5rem",
    verticalAlign: "middle"
  }} />;
}
function getBackupInstanceEquipmentKey(inst, instances = []) {
  const idx = Array.isArray(instances) ? instances.indexOf(inst) : -1;
  const instanceName = inst?.nom || inst?.logiciel || (idx >= 0 ? `instance-${idx}` : inst?.id || "instance");
  return inst?.commentKey || (inst?.id != null ? `Backup:instance:${inst.id}` : `Backup:instance:${instanceName}`);
}
export default function BackupStep({
  client,
  reportPeriod = {},
  onRefreshClient,
  onOpenComments,
  onTicketCreatedForEquipment,
  commentCounts = {},
  ticketCounts = {},
  highlightedEquipmentKey
}) {
  const rawBackup = client?.equipements?.Sauvegarde || client?.equipements?.Backup;
  const instances = Array.isArray(rawBackup?.instances) ? rawBackup.instances : [];
  const clientId = client?.id ?? client?.uuid;
  const standardInstances = instances.filter(inst => inst.logiciel !== "Active Backup for Microsoft 365" && inst.logiciel !== "HyperBackup");
  const activeBackupInstances = instances.filter(inst => inst.logiciel === "Active Backup for Microsoft 365");
  const hyperBackupInstances = instances.filter(inst => inst.logiciel === "HyperBackup");
  const [jobsSyncLoading, setJobsSyncLoading] = useState(false);
  const [backupConfigModal, setBackupConfigModal] = useState({
    open: false,
    instance: null,
    job: null
  });
  const openBackupConfig = (instance = null, job = null) => {
    setBackupConfigModal({
      open: true,
      instance: instance || job?._instance || null,
      job: job || null
    });
  };
  const closeBackupConfig = () => {
    setBackupConfigModal({
      open: false,
      instance: null,
      job: null
    });
  };
  const syncJobsFromCheckMK = async () => {
    try {
      setJobsSyncLoading(true);
      const data = await runMappedBackupJobsSyncForClient(clientId, client?.equipements);
      toast.success(data.message && data.updated != null ? `${data.message} (${data.updated} updated)` : "Synchronization complete");
      if (typeof onRefreshClient === "function") await onRefreshClient();
    } catch (err) {
      console.error("Sync jobs CheckMK:", err);
      toast.error(err?.message || "Error synchronizing jobs");
    } finally {
      setJobsSyncLoading(false);
    }
  };
  const allJobs = instances.flatMap((inst, idx) => {
    const instanceName = inst.nom || inst.logiciel || `instance-${idx}`;
    const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
    const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
    return jobs.map(job => ({
      ...job,
      _instanceKey: instanceName,
      _instanceLabel: instanceLabel,
      _instanceLogiciel: inst.logiciel,
      _instance: inst
    }));
  });
  const ACTIVE_BACKUP_MODULES = [{
    key: "oneDrive",
    label: "OneDrive",
    icon: "mdi:microsoft-onedrive"
  }, {
    key: "sharePoint",
    label: "SharePoint",
    icon: "mdi:microsoft-sharepoint"
  }, {
    key: "exchange",
    label: "Exchange",
    icon: "mdi:email-outline"
  }, {
    key: "teams",
    label: "Teams",
    icon: "mdi:microsoft-teams"
  }, {
    key: "calendar",
    label: "Calendar",
    icon: "mdi:calendar"
  }, {
    key: "contacts",
    label: "Contacts",
    icon: "mdi:contacts-outline"
  }];
  const renderInstanceActions = inst => {
    const instanceLabel = inst.nom || inst.logiciel || "Instance";
    const equipmentKey = getBackupInstanceEquipmentKey(inst, instances);
    const commentCount = commentCounts?.[equipmentKey] ?? 0;
    const item = {
      ...inst,
      nom: instanceLabel,
      name: instanceLabel,
      commentKey: equipmentKey
    };
    return <div className={equipmentStyles.mappingActions}>
        <div className={equipmentStyles.mappingActionsGroup}>
          {typeof onOpenComments === "function" ? <span className={styles.infraActionBadgeWrap}>
              <button type="button" className={equipmentStyles.mappingActionButton} title={commentCount > 0 ? "Voir / ajouter une note au rapport" : "Commenter dans le rapport"} onClick={() => onOpenComments(item, {
            moduleKey: "Backup",
            equipmentKey
          })}>
                <Icon icon="mdi:comment-text-outline" width={16} height={16} />
              </button>
              {commentCount > 0 ? <span className={styles.infraCommentBadge}>{commentCount}</span> : null}
            </span> : null}
          <button type="button" className={equipmentStyles.mappingActionButton} title="Modifier l’instance" onClick={() => openBackupConfig(inst)}>
            <Icon icon="mdi:pencil" width={16} height={16} />
          </button>
        </div>
      </div>;
  };
  const renderStandardInstanceTable = (list, title) => {
    if (!list || list.length === 0) return null;
    return <MonitoringStepSection title={title} count={list.length}>
        <MonitoringPagedBlock items={list} resetDeps={[title, list.length]}>
          {pageItems => <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTableEmbedded}>
            <thead>
              <tr>
                {["Solution", "Nom", "Serveur", "Expiration", "Nb jobs", "Actions"].map(label => <th key={label}>
                      <span className={equipmentStyles.thContent}>{label}</span>
                    </th>)}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((inst, idx) => {
              const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
              const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
              const server = inst.server || inst.serveur || inst.serveurLie || "-";
              const equipmentKey = getBackupInstanceEquipmentKey(inst, instances);
              const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
              return <tr key={inst.id || idx} className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}>
                    <MonitoringTextCell title={inst.logiciel || undefined}>
                      <span style={{
                    display: "inline-flex",
                    alignItems: "center"
                  }}>
                        {renderInstanceIcon(inst)}
                        {inst.logiciel || "-"}
                      </span>
                    </MonitoringTextCell>
                    <MonitoringTextCell>{instanceLabel}</MonitoringTextCell>
                    <MonitoringTextCell>{server}</MonitoringTextCell>
                    <MonitoringTextCell>{inst.expiration ? formatDate(inst.expiration) : "-"}</MonitoringTextCell>
                    <MonitoringTextCell>{jobs.length}</MonitoringTextCell>
                    <td onClick={e => e.stopPropagation()}>
                      {renderInstanceActions(inst)}
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </MonitoringStepTableWrap>}
        </MonitoringPagedBlock>
      </MonitoringStepSection>;
  };
  const renderActiveBackupInstanceTable = (list, title) => {
    if (!list || list.length === 0) return null;
    return <MonitoringStepSection title={title} count={list.length}>
        <MonitoringPagedBlock items={list} resetDeps={[title, list.length]}>
          {pageItems => <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTableEmbedded}>
            <thead>
              <tr>
                {["Nom", "Modules activés", "Stockage destination", "Actions"].map(label => <th key={label}>
                    <span className={equipmentStyles.thContent}>{label}</span>
                  </th>)}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((inst, idx) => {
              const modules = inst.activeBackupModules || {};
              const storage = inst.activeBackupStorage || "-";
              const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
              const equipmentKey = getBackupInstanceEquipmentKey(inst, instances);
              const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
              return <tr key={inst.id || idx} className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}>
                    <MonitoringTextCell>{instanceLabel}</MonitoringTextCell>
                    <td>
                      <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    flexWrap: "wrap"
                  }}>
                        {ACTIVE_BACKUP_MODULES.map(m => {
                      const isActive = !!modules[m.key];
                      return <span key={m.key} title={`${m.label} : ${isActive ? "activé" : "inactif"}`} style={{
                        opacity: isActive ? 1 : 0.35,
                        display: "inline-flex"
                      }}>
                              <Icon icon={m.icon} width={18} height={18} />
                            </span>;
                    })}
                      </span>
                    </td>
                    <MonitoringTextCell>{storage}</MonitoringTextCell>
                    <td onClick={e => e.stopPropagation()}>
                      {renderInstanceActions(inst)}
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </MonitoringStepTableWrap>}
        </MonitoringPagedBlock>
      </MonitoringStepSection>;
  };
  const renderHyperBackupInstanceTable = (list, title) => {
    if (!list || list.length === 0) return null;
    const formatNas = v => {
      if (!v || typeof v !== "string") return "-";
      return v.replace(/^(NAS|SAN|DISQUE)-/, "").replace(/-\d+$/, "") || v;
    };
    return <MonitoringStepSection title={title} count={list.length}>
        <MonitoringPagedBlock items={list} resetDeps={[title, list.length]}>
          {pageItems => <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTableEmbedded}>
            <thead>
              <tr>
                {["Nom", "NAS source", "NAS destination", "Nb jobs", "Actions"].map(label => <th key={label}>
                      <span className={equipmentStyles.thContent}>{label}</span>
                    </th>)}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((inst, idx) => {
              const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
              const instanceLabel = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
              const source = formatNas(inst.hyperbackupSource);
              const dest = formatNas(inst.hyperbackupDestination);
              const equipmentKey = getBackupInstanceEquipmentKey(inst, instances);
              const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
              return <tr key={inst.id || idx} className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded} ${isHighlighted ? styles.infraTableRowHighlight : ""}`}>
                    <MonitoringTextCell>{instanceLabel}</MonitoringTextCell>
                    <MonitoringTextCell>{source}</MonitoringTextCell>
                    <MonitoringTextCell>{dest}</MonitoringTextCell>
                    <MonitoringTextCell>{jobs.length}</MonitoringTextCell>
                    <td onClick={e => e.stopPropagation()}>
                      {renderInstanceActions(inst)}
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </MonitoringStepTableWrap>}
        </MonitoringPagedBlock>
      </MonitoringStepSection>;
  };
  return <MonitoringStepShell>
      {standardInstances.length > 0 && renderStandardInstanceTable(standardInstances, "Instances")}
      {instances.length === 0 && <MonitoringStepSection title="Instances" isEmpty emptyMessage="Aucune instance de sauvegarde." />}

      {renderActiveBackupInstanceTable(activeBackupInstances, "Active Backup for Microsoft 365")}

      {renderHyperBackupInstanceTable(hyperBackupInstances, "HyperBackup")}

      <MonitoringStepSection title="Jobs" count={allJobs.length} isEmpty={allJobs.length === 0} emptyMessage="Aucun job de sauvegarde.">
        <MonitoringPagedBlock items={allJobs} resetDeps={[allJobs.length]}>
          {pageItems => <MonitoringStepTableWrap scrollable>
          <table className={equipmentStyles.equipmentTableEmbedded}>
            <thead>
              <tr>
                {["Nom", "Type", "Instance", "Serveur", "Destination", "Fréquence", "Horaires", "Rétention", "Dernière sauvegarde", "Dernière sync", "Statut", "Actions"].map(label => <th key={label}>
                    <span className={equipmentStyles.thContent}>{label}</span>
                  </th>)}
              </tr>
            </thead>
            <tbody>
                {pageItems.map((job, index) => {
              const jobName = job.nom || job.jobName || `job-${index}`;
              const instanceName = job._instanceKey;
              const equipmentKey = `Backup:job:${instanceName}:${jobName}`;
              const commentCount = commentCounts?.[equipmentKey] ?? 0;
              const ticketCount = ticketCounts?.[equipmentKey] ?? 0;
              const isHighlighted = highlightedEquipmentKey != null && String(highlightedEquipmentKey) === String(equipmentKey);
              const item = {
                nom: jobName,
                name: jobName,
                ...job
              };
              const lastBackupStart = job.last_backup_start ?? job.lastBackupStart ?? job.last_backup_date ?? job.lastBackupDate;
              const lastBackupSync = job.last_backup_date ?? job.lastBackupDate;
              const typeBackup = pickBackupJobType(job);
              const typeLabel = typeBackup ? typeBackup.charAt(0).toUpperCase() + typeBackup.slice(1) : "-";
              const destination = pickBackupJobDestination(job, job._instance || { logiciel: job._instanceLogiciel }, "-");
              const statusJob = normalizeBackupJobForStatus(job, job._instance || { logiciel: job._instanceLogiciel });
              const jobStatus = getBackupJobStatus(statusJob);
              const rowStatusClass = getBackupJobRowClassName(jobStatus);
              const rowAlertStyle = getBackupJobRowStyle(jobStatus);
              const serverLabel = formatServeurLieLabel(job.serveurLie || job.source, "-");
              const lastBackupStartLabel = lastBackupStart ? (() => {
                try {
                  return formatDateTime(lastBackupStart);
                } catch {
                  return String(lastBackupStart);
                }
              })() : "-";
              const lastBackupSyncLabel = lastBackupSync ? (() => {
                try {
                  return formatDateTime(lastBackupSync);
                } catch {
                  return String(lastBackupSync);
                }
              })() : "-";
              const statusLabel = getBackupJobStatusLabel(jobStatus);
              return <tr key={`${instanceName}-${jobName}-${index}`} className={`${equipmentStyles.equipmentRow} ${equipmentStyles.equipmentRowEmbedded} ${rowStatusClass ? styles[rowStatusClass] || "" : ""} ${isHighlighted ? styles.infraTableRowHighlight : ""}`.trim()} style={rowAlertStyle}>
                      <MonitoringTextCell>{jobName}</MonitoringTextCell>
                      <MonitoringTextCell>{typeLabel}</MonitoringTextCell>
                      <MonitoringTextCell>{job._instanceLabel}</MonitoringTextCell>
                      <MonitoringTextCell>{serverLabel}</MonitoringTextCell>
                      <MonitoringTextCell>{destination}</MonitoringTextCell>
                      <MonitoringTextCell>{job.regularite || "-"}</MonitoringTextCell>
                      <MonitoringTextCell>{job.horaire || "-"}</MonitoringTextCell>
                      <MonitoringTextCell>{job.retention || "-"}</MonitoringTextCell>
                      <MonitoringTextCell>{lastBackupStartLabel}</MonitoringTextCell>
                      <MonitoringTextCell>{lastBackupSyncLabel}</MonitoringTextCell>
                      <MonitoringTextCell title={getBackupJobStatusTitle(jobStatus) || statusLabel}>{statusLabel}</MonitoringTextCell>
                      <td onClick={e => e.stopPropagation()}>
                        <div className={equipmentStyles.mappingActions}>
                          <div className={equipmentStyles.mappingActionsGroup}>
                        {typeof onOpenComments === "function" && <span className={styles.infraActionBadgeWrap}>
                            <button type="button" className={equipmentStyles.mappingActionButton} title={commentCount > 0 ? "Voir / ajouter une note au rapport" : "Commenter dans le rapport"} onClick={() => onOpenComments(item, {
                          moduleKey: "Backup",
                          equipmentKey
                        })}>
                              <Icon icon="mdi:comment-text-outline" width={16} height={16} />
                            </button>
                            {commentCount > 0 && <span className={styles.infraCommentBadge}>
                                {commentCount}
                              </span>}
                          </span>}
                        {typeof onTicketCreatedForEquipment === "function" && clientId && <span className={styles.infraActionBadgeWrap}>
                            
                            {ticketCount > 0 && <span className={styles.infraTicketBadge}>
                                {ticketCount}
                              </span>}
                          </span>}
                        <button type="button" className={equipmentStyles.mappingActionButton} title="Modifier le job" onClick={() => openBackupConfig(job._instance, job)}>
                          <Icon icon="mdi:pencil" width={16} height={16} />
                        </button>
                          </div>
                        </div>
                      </td>
                    </tr>;
            })}
              </tbody>
          </table>
        </MonitoringStepTableWrap>}
        </MonitoringPagedBlock>
      </MonitoringStepSection>

      {backupConfigModal.open && clientId ? <BackupConfigModal
        client={client}
        initialInstance={backupConfigModal.instance}
        initialJob={backupConfigModal.job}
        onClose={closeBackupConfig}
        onSaved={() => {
          if (typeof onRefreshClient === "function") onRefreshClient();
        }}
      /> : null}
    </MonitoringStepShell>;
}
