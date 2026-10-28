import React, { useMemo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import {
  formatServeurLieLabel,
  normalizeServeurLieList,
  pickBackupJobDestination,
  pickBackupJobType
} from "../../../EnterprisesPage/backupJobUtils";
import {
  getBackupJobStatus,
  getBackupJobStatusLabel,
  normalizeBackupJobForStatus
} from "../../../CybersecuritePage/backupJobStatusUtils";
import { ReportTableBlock } from "./ReportSummaryBlocks";
import ReportSynthesisEditor from "./ReportSynthesisEditor";
import execStyles from "./ReportSummarySupervision.module.css";
import styles from "./ReportSummaryBackup.module.css";

function listBackupInstances(client) {
  const raw = client?.equipements?.Sauvegarde || client?.equipements?.Backup;
  if (!raw) return [];
  return Array.isArray(raw.instances) ? raw.instances : [];
}

function getBackupInstanceEquipmentKey(inst, instances = []) {
  const idx = Array.isArray(instances) ? instances.indexOf(inst) : -1;
  const instanceName = inst?.nom || inst?.logiciel || (idx >= 0 ? `instance-${idx}` : inst?.id || "instance");
  return inst?.commentKey || (inst?.id != null ? `Backup:instance:${inst.id}` : `Backup:instance:${instanceName}`);
}

function formatCommentsPreview(items = []) {
  const texts = items.map(item => String(item?.text || "").trim()).filter(Boolean);
  return texts.length ? texts.join(" · ") : "—";
}

function CommentCell({ value }) {
  const hasComment = Boolean(value) && value !== "—";
  return (
    <span
      className={hasComment ? execStyles.eqComment : execStyles.eqCommentEmpty}
      title={hasComment ? value : undefined}
    >
      {value || "—"}
    </span>
  );
}

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatDateTimeFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function statusLabelFr(status) {
  const s = String(status || "").toLowerCase();
  if (s === "ok" || s === "success") return "OK";
  if (s === "warning") return "Retard";
  if (s === "critical" || s === "fail" || s === "failed" || s === "error") return "Erreur";
  if (s === "unmapped") return "Non mappé";
  if (s === "inactive") return "Inactif";
  if (s === "running") return "En cours";
  return status ? String(status) : "—";
}

function statusToneClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "ok" || s === "success") return styles.statusOk;
  if (s === "warning") return styles.statusWarn;
  if (s === "critical" || s === "fail" || s === "failed" || s === "error") return styles.statusError;
  return styles.statusNeutral;
}

function isIssueStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "warning" || s === "critical" || s === "fail" || s === "failed" || s === "error";
}

function parseRetentionDays(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw).trim().toLowerCase();
  const match = text.match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function formatRetentionLabel(raw) {
  if (!raw && raw !== 0) return "—";
  const days = parseRetentionDays(raw);
  if (days == null) return String(raw);
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function StatusBadge({ status, label }) {
  return (
    <span className={`${styles.statusBadge} ${statusToneClass(status)}`}>
      {label || statusLabelFr(status)}
    </span>
  );
}

const INSTANCE_COLUMNS = [
  {
    id: "name",
    label: "Instance",
    render: row => <span className={execStyles.equipmentChip}>{row.name || "—"}</span>
  },
  { id: "logiciel", label: "Solution" },
  { id: "server", label: "Serveur" },
  { id: "jobsCount", label: "Jobs" },
  {
    id: "expiration",
    label: "Expiration licence",
    render: row => formatDateFr(row.expiration)
  },
  {
    id: "commentPreview",
    label: "Commentaires",
    render: row => <CommentCell value={row.commentPreview} />
  }
];

const JOB_COLUMNS = [
  {
    id: "name",
    label: "Nom",
    render: row => <span className={execStyles.equipmentChip}>{row.name || "—"}</span>
  },
  { id: "typeLabel", label: "Type" },
  { id: "instanceName", label: "Instance" },
  { id: "serveurLie", label: "Serveur" },
  { id: "destination", label: "Destination" },
  { id: "regularite", label: "Fréquence" },
  { id: "horaire", label: "Horaires" },
  { id: "retention", label: "Rétention", render: row => formatRetentionLabel(row.retention) },
  {
    id: "lastBackupStart",
    label: "Dernière sauvegarde",
    render: row => formatDateTimeFr(row.lastBackupStart)
  },
  {
    id: "lastBackupSync",
    label: "Dernière sync",
    render: row => formatDateTimeFr(row.lastBackupSync)
  },
  {
    id: "lastStatus",
    label: "Statut",
    render: row => <StatusBadge status={row.lastStatus} label={row.statusLabel} />
  },
  {
    id: "commentPreview",
    label: "Commentaires",
    render: row => <CommentCell value={row.commentPreview} />
  }
];

function buildBackupSynthesis({ totalJobs, issueCount, criticalCount, instanceCount }) {
  if (instanceCount === 0 && totalJobs === 0) {
    return "Aucune solution de sauvegarde n'est référencée pour ce client.";
  }
  if (totalJobs === 0) {
    return "Des instances sont présentes, mais aucun job de sauvegarde n'est suivi.";
  }
  if (criticalCount > 0) {
    return `Les sauvegardes présentent ${criticalCount} job${criticalCount > 1 ? "s" : ""} en erreur.`;
  }
  if (issueCount > 0) {
    return "Les sauvegardes sont globalement opérationnelles, avec des points à vérifier.";
  }
  return "Les jobs de sauvegarde suivis sont en bon état.";
}

export default function ReportSummaryBackup({
  client,
  comments = [],
  synthesisHtml = null,
  onSynthesisChange = null
}) {
  const instances = useMemo(() => listBackupInstances(client), [client]);
  const standardInstances = useMemo(
    () => instances.filter(inst => Boolean(String(inst?.logiciel || "").trim())),
    [instances]
  );

  const reportComments = useMemo(
    () =>
      (Array.isArray(comments) ? comments : []).filter(comment => {
        if (!String(comment?.text || "").trim()) return false;
        const key = String(comment.equipmentKey || "");
        return (
          comment.moduleKey === "Backup" ||
          key === "Backup" ||
          key.startsWith("Backup:")
        );
      }),
    [comments]
  );

  const commentsByEquipmentKey = useMemo(() => {
    const map = {};
    reportComments.forEach(comment => {
      const key = comment.equipmentKey ? String(comment.equipmentKey) : "";
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(comment);
    });
    return map;
  }, [reportComments]);

  const jobRows = useMemo(() => {
    const source = standardInstances.length ? standardInstances : instances;
    return source.flatMap((inst, idx) => {
      const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
      const instanceName = inst.nom || inst.logiciel || `Instance ${idx + 1}`;
      return jobs.map((job, jobIdx) => {
        const statusJob = normalizeBackupJobForStatus(job, inst);
        const lastStatus = getBackupJobStatus(statusJob);
        const typeBackup = pickBackupJobType(job);
        const typeLabel = typeBackup
          ? typeBackup.charAt(0).toUpperCase() + typeBackup.slice(1)
          : "—";
        const lastBackupStart =
          job.last_backup_start ??
          job.lastBackupStart ??
          job.last_backup_date ??
          job.lastBackupDate ??
          null;
        const lastBackupSync = job.last_backup_date ?? job.lastBackupDate ?? null;
        const jobName = job.nom || job.jobName || `Job ${jobIdx + 1}`;
        const equipmentKey = `Backup:job:${instanceName}:${jobName}`;
        return {
          _rowKey: `${instanceName}-${job.id || jobName}-${jobIdx}`,
          equipmentKey,
          instanceName,
          logiciel: inst.logiciel || "",
          server: inst.server || inst.serveur || inst.serveurLie || "",
          expiration: inst.expiration || null,
          name: jobName,
          typeLabel,
          serveurLie: formatServeurLieLabel(job.serveurLie || job.source, "—"),
          serveurList: normalizeServeurLieList(job.serveurLie || job.source),
          destination: pickBackupJobDestination(job, inst, "—"),
          regularite: job.regularite || "—",
          horaire: job.horaire || "—",
          retention: job.retention || "",
          lastBackupStart,
          lastBackupSync,
          lastStatus,
          statusLabel: getBackupJobStatusLabel(lastStatus) || statusLabelFr(lastStatus),
          commentPreview: formatCommentsPreview(commentsByEquipmentKey[equipmentKey])
        };
      });
    });
  }, [instances, standardInstances, commentsByEquipmentKey]);

  const activeJobs = useMemo(
    () => jobRows.filter(job => String(job.lastStatus).toLowerCase() !== "inactive"),
    [jobRows]
  );
  const evaluatedJobs = useMemo(
    () => activeJobs.filter(job => String(job.lastStatus).toLowerCase() !== "unmapped"),
    [activeJobs]
  );
  const issueJobs = useMemo(() => evaluatedJobs.filter(job => isIssueStatus(job.lastStatus)), [evaluatedJobs]);

  const totalJobs = activeJobs.length;

  const instanceRows = useMemo(() => {
    const source = standardInstances.length ? standardInstances : instances;
    return source.map((inst, idx) => {
      const jobs = Array.isArray(inst.jobs) ? inst.jobs : [];
      const activeCount = jobs.filter(job => {
        const status = getBackupJobStatus(normalizeBackupJobForStatus(job, inst));
        return String(status).toLowerCase() !== "inactive";
      }).length;
      const equipmentKey = getBackupInstanceEquipmentKey(inst, instances);
      return {
        _rowKey: inst.id || `${inst.nom || inst.logiciel || "inst"}-${idx}`,
        equipmentKey,
        name: inst.nom || inst.logiciel || `Instance ${idx + 1}`,
        logiciel: inst.logiciel || "—",
        server: inst.server || inst.serveur || inst.serveurLie || "—",
        jobsCount: activeCount || jobs.length,
        expiration: inst.expiration || null,
        commentPreview: formatCommentsPreview(commentsByEquipmentKey[equipmentKey])
      };
    });
  }, [instances, standardInstances, commentsByEquipmentKey]);

  const instanceCount = (standardInstances.length ? standardInstances : instances).length;

  const licenseRows = useMemo(() => {
    const rows = [];
    (standardInstances.length ? standardInstances : instances).forEach((inst, idx) => {
      if (!inst?.expiration) return;
      rows.push({
        key: inst.id || `${inst.nom || inst.logiciel || "lic"}-${idx}`,
        label: `Expiration de la licence ${inst.logiciel || "sauvegarde"}`,
        server: inst.server || inst.serveur || inst.nom || "—",
        expiration: inst.expiration
      });
    });
    return rows;
  }, [instances, standardInstances]);

  const licenseExpiration = useMemo(() => {
    let earliest = null;
    licenseRows.forEach(row => {
      if (!row.expiration) return;
      const ts = new Date(row.expiration).getTime();
      if (Number.isNaN(ts)) return;
      if (earliest == null || ts < earliest) earliest = ts;
    });
    if (earliest != null) return new Date(earliest).toISOString();
    const primary = standardInstances[0] || instances[0];
    return primary?.expiration || null;
  }, [licenseRows, standardInstances, instances]);

  const criticalCount = useMemo(
    () =>
      issueJobs.filter(job => {
        const s = String(job.lastStatus || "").toLowerCase();
        return s === "critical" || s === "fail" || s === "failed" || s === "error";
      }).length,
    [issueJobs]
  );

  const synthesis = useMemo(
    () =>
      buildBackupSynthesis({
        totalJobs,
        issueCount: issueJobs.length,
        criticalCount,
        instanceCount
      }),
    [totalJobs, issueJobs.length, criticalCount, instanceCount]
  );

  return (
    <div className={execStyles.executiveRoot}>
      <section className={execStyles.sectionBlock}>
        <div className={`${execStyles.kpiStrip} ${execStyles.kpiStripTriple}`} role="list" aria-label="Indicateurs sauvegarde">
          <div className={execStyles.kpiItem} role="listitem">
            <span className={execStyles.kpiLabel}>Instances</span>
            <span className={execStyles.kpiValue}>{instanceCount}</span>
            <span className={execStyles.kpiHint}>solutions de sauvegarde</span>
          </div>
          <div className={execStyles.kpiItem} role="listitem">
            <span className={execStyles.kpiLabel}>Jobs</span>
            <span className={execStyles.kpiValue}>{totalJobs}</span>
            <span className={execStyles.kpiHint}>configurés et suivis</span>
          </div>
          <div className={execStyles.kpiItem} role="listitem">
            <span className={execStyles.kpiLabel}>Expiration licence</span>
            <span className={execStyles.kpiValue}>{formatDateFr(licenseExpiration)}</span>
            <span className={execStyles.kpiHint}>
              {licenseRows.length > 1 ? `${licenseRows.length} licences suivies` : "licence sauvegarde"}
            </span>
          </div>
        </div>
      </section>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Synthèse</h4>
        <div
          className={
            typeof onSynthesisChange === "function"
              ? execStyles.synthesisEditorHost
              : execStyles.synthesisPanel
          }
        >
          {typeof onSynthesisChange === "function" ? (
            <ReportSynthesisEditor
              value={synthesisHtml != null ? synthesisHtml : synthesis}
              onChange={onSynthesisChange}
              placeholder="Rédigez la synthèse des sauvegardes…"
            />
          ) : (
            <p className={execStyles.synthesis}>{synthesis}</p>
          )}
        </div>
      </section>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Instances</h4>
        <ReportTableBlock
          title={null}
          columns={INSTANCE_COLUMNS}
          rows={instanceRows}
          emptyMessage="Aucune instance de sauvegarde."
        />
      </section>

      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Jobs de sauvegarde</h4>
        <ReportTableBlock
          title={null}
          columns={JOB_COLUMNS}
          rows={activeJobs}
          emptyMessage="Aucun job de sauvegarde à afficher."
        />
      </section>

      <section className={execStyles.sectionBlock} data-export-comments="true">
        <div className={execStyles.commentsHeader}>
          <IconifyIcon icon="mdi:comment-text-outline" width={18} height={18} aria-hidden />
          <h4 className={execStyles.sectionHeading}>Commentaires</h4>
          {reportComments.length > 0 ? (
            <span className={execStyles.commentsCount}>{reportComments.length}</span>
          ) : null}
        </div>
        {reportComments.length === 0 ? (
          <p className={execStyles.commentsEmpty}>Aucun commentaire ajouté sur ce rapport.</p>
        ) : (
          <ul className={execStyles.commentsList}>
            {reportComments.map(comment => (
              <li key={comment.id || `${comment.linkedLabel}-${comment.createdAt}`} className={execStyles.commentCard}>
                <div className={execStyles.commentMeta}>
                  <span className={execStyles.commentLink}>{comment.linkedLabel || "Note"}</span>
                  {comment.dateLabel ? <span className={execStyles.commentDate}>{comment.dateLabel}</span> : null}
                </div>
                <p className={execStyles.commentBody}>{comment.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
