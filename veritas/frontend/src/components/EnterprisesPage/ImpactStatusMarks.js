import React from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import styles from "./ImpactStatusMarks.module.css";

function supervisionLabel(supervision, copy) {
  if (!supervision) return "";
  if (supervision.level === "critical") return supervision.title || copy.supervisionCritical;
  if (supervision.level === "warning") return supervision.title || copy.supervisionWarning;
  return copy.supervisionOk;
}

function agentLabel(agent, copy) {
  if (agent === "online") return copy.agentOnline;
  if (agent === "offline") return copy.agentOffline;
  return copy.agentUnknown;
}

export default function ImpactStatusMarks({
  supervision = null,
  agent = null,
  backups = [],
  copy,
  onOpenAlert,
  pinAgent = false
}) {
  const backupTitle = (backups || []).map(job => job.name).filter(Boolean).join(", ");
  return (
    <>
      {supervision ? (
        <button
          type="button"
          className={styles.dot}
          data-level={supervision.level}
          title={supervisionLabel(supervision, copy)}
          aria-label={supervisionLabel(supervision, copy)}
          onClick={event => {
            event.stopPropagation();
            onOpenAlert?.(supervision);
          }}
        />
      ) : null}
      {agent ? (
        <span className={`${styles.agent} ${pinAgent ? styles.agentPin : ""}`.trim()} data-state={agent} title={agentLabel(agent, copy)} aria-label={agentLabel(agent, copy)} />
      ) : null}
      {backups?.length ? (
        <span
          className={styles.backup}
          title={backupTitle || interpolate(copy.backupJobsMany, { count: backups.length })}
        >
          <Icon icon="mdi:backup-restore" />
          {backups.length}
        </span>
      ) : null}
    </>
  );
}
