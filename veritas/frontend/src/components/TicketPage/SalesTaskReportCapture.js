import { createPortal } from "react-dom";
import ReportBrandingChrome from "../RapportPage/ReportBrandingChrome";
import { interpolate } from "../../i18n/translate";
import styles from "./SalesTaskReportCapture.module.css";

function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${Math.round(size)} o`;
  if (size < 1024 * 1024) {
    const ko = size / 1024;
    return `${ko >= 10 ? Math.round(ko) : ko.toFixed(1)} Ko`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function joinPeople(people, emptyLabel) {
  const labels = (people || []).map(entry => entry.label).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : emptyLabel;
}

function Field({ label, value, wide = false }) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`.trim()}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function SalesTaskReportCapture({
  captureRef,
  branding = null,
  model,
  copy,
  formatDateTime,
  formatDurationMs
}) {
  if (!model || typeof document === "undefined") return null;
  const none = copy.report.noValue;
  const tasksCopy = copy.tasks || {};
  const statsCopy = copy.taskStats || {};
  const stats = model.stats || null;
  const doneCount = model.rows.filter(row => row.done).length;

  const body = (
    <div className={styles.host} aria-hidden="true">
      <ReportBrandingChrome
        ref={captureRef}
        branding={branding}
        clientName={model.clientName || none}
        periodLabel={model.periodLabel}
        reportLabel={copy.report.documentTitle}
      >
        <p className={styles.identity}>
          {[model.ticketNumberLabel, model.ticketTitle, model.clientName].filter(Boolean).join(" · ") || none}
        </p>
        <p className={styles.summary}>
          {interpolate(copy.report.summary, {
            done: String(doneCount),
            total: String(model.rows.length)
          })}
        </p>

        {stats ? (
          <section className={styles.stats}>
            <h2 className={styles.statsTitle}>
              {statsCopy.title || "Statistiques des tâches"}
              <span className={styles.statsCount}>{stats.total}</span>
            </h2>
            {stats.total === 0 ? (
              <p className={styles.statsEmpty}>{statsCopy.empty}</p>
            ) : (
              <>
                {statsCopy.hoursHint ? <p className={styles.statsHint}>{statsCopy.hoursHint}</p> : null}
                <div className={styles.statsHero}>
                  <span className={styles.statsHeroLabel}>{statsCopy.hoursPlanned}</span>
                  <span className={styles.statsHeroValue}>{formatDurationMs(stats.plannedMs)}</span>
                  <span className={styles.statsHeroSub}>
                    {statsCopy.hoursDone}: {formatDurationMs(stats.doneMs)}
                    {" · "}
                    {statsCopy.hoursRemaining}: {formatDurationMs(stats.remainingMs)}
                  </span>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statsCard}>
                    <span className={styles.statsCardLabel}>{statsCopy.progress}</span>
                    <span className={styles.statsCardValue}>{stats.progress}%</span>
                  </div>
                  <div className={styles.statsCard}>
                    <span className={styles.statsCardLabel}>{statsCopy.done}</span>
                    <span className={styles.statsCardValue}>
                      {stats.done}/{stats.total}
                    </span>
                  </div>
                  <div className={styles.statsCard}>
                    <span className={styles.statsCardLabel}>{statsCopy.todo}</span>
                    <span className={styles.statsCardValue}>{stats.todo}</span>
                  </div>
                  <div className={`${styles.statsCard} ${stats.overdue > 0 ? styles.statsCardWarn : ""}`.trim()}>
                    <span className={styles.statsCardLabel}>{statsCopy.overdue}</span>
                    <span className={styles.statsCardValue}>{stats.overdue}</span>
                  </div>
                  <div className={styles.statsCard}>
                    <span className={styles.statsCardLabel}>{statsCopy.unassigned}</span>
                    <span className={styles.statsCardValue}>{stats.unassigned}</span>
                  </div>
                  <div className={styles.statsCard}>
                    <span className={styles.statsCardLabel}>{statsCopy.unscheduled}</span>
                    <span className={styles.statsCardValue}>{stats.unscheduled}</span>
                  </div>
                </div>
                {Array.isArray(stats.byAssignee) && stats.byAssignee.length > 0 ? (
                  <>
                    <h3 className={styles.statsSectionTitle}>{statsCopy.byAssignee}</h3>
                    <ul className={styles.statsAssigneeList}>
                      {stats.byAssignee.map(row => (
                        <li key={row.key} className={styles.statsAssigneeItem}>
                          <div>
                            <div className={styles.statsAssigneeName}>
                              {row.key === "__none__" ? statsCopy.noAssignee : row.label || statsCopy.noAssignee}
                            </div>
                            <div className={styles.statsAssigneeMeta}>
                              {interpolate(statsCopy.tasksCount || "{done}/{total}", {
                                done: String(row.done),
                                total: String(row.total)
                              })}
                            </div>
                          </div>
                          <span className={styles.statsAssigneeHours}>{formatDurationMs(row.plannedMs)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {model.rows.length === 0 ? (
          <p className={styles.empty}>{copy.report.empty}</p>
        ) : (
          <div className={styles.list}>
            {model.rows.map(row => {
              const schedule = row.startAt || row.endAt
                ? [formatDateTime(row.startAt), formatDateTime(row.endAt)].filter(value => value && value !== none).join(` ${tasksCopy.rangeJoiner || "→"} `)
                : tasksCopy.unscheduled || none;
              const scheduleText = row.durationMs != null && formatDurationMs
                ? `${schedule} (${formatDurationMs(row.durationMs)})`
                : schedule;
              const creditsText = row.creditsTotal > 0
                ? [
                    interpolate(tasksCopy.creditsDebitedCount || "{count}", { count: String(row.creditsTotal) }),
                    ...row.creditsPacks.map(pack => `${pack.label || pack.packId || "—"} × ${pack.amount}`)
                  ].join(" · ")
                : copy.report.creditsNone;
              const created = [formatDateTime(row.createdAt), row.createdByLabel].filter(value => value && value !== none);
              const updated = [formatDateTime(row.updatedAt), row.updatedByLabel].filter(value => value && value !== none);
              return (
                <article key={row.id || row.index} className={styles.card}>
                  <header className={styles.cardHead}>
                    <span className={styles.index}>{row.index}</span>
                    <h3 className={styles.title}>{row.label || none}</h3>
                    <span className={`${styles.badge} ${row.done ? styles.badgeDone : styles.badgeTodo}`}>
                      {row.done ? copy.report.statusDone : copy.report.statusTodo}
                    </span>
                  </header>
                  <dl className={styles.grid}>
                    <Field wide label={tasksCopy.description || "Description"} value={row.description || none} />
                    <Field label={tasksCopy.eventType || "Type"} value={row.eventTypeLabel || none} />
                    <Field label={tasksCopy.assignee || "Assignés"} value={joinPeople(row.assignees, tasksCopy.assigneeNone || none)} />
                    <Field label={tasksCopy.range || "Planning"} value={scheduleText} />
                    <Field label={tasksCopy.equipment || "Périphérique"} value={row.equipmentLabel || tasksCopy.equipmentNone || none} />
                    <Field label={copy.report.planningEvent} value={row.planningEventId ? copy.report.planningLinked : copy.report.planningNone} />
                    <Field label={copy.report.credits} value={creditsText} />
                    <Field
                      wide
                      label={tasksCopy.documents || "Documents"}
                      value={
                        row.documents.length === 0 ? (
                          tasksCopy.documentsEmpty || none
                        ) : (
                          <ul className={styles.docs}>
                            {row.documents.map(doc => {
                              const size = formatBytes(doc.fileSize);
                              const when = doc.createdAt ? formatDateTime(doc.createdAt) : "";
                              return (
                                <li key={doc.id || doc.filePath || doc.fileName}>
                                  {[doc.fileName || none, size, when && when !== none ? when : ""].filter(Boolean).join(" · ")}
                                </li>
                              );
                            })}
                          </ul>
                        )
                      }
                    />
                    <Field
                      label={tasksCopy.createdBy || "Créée"}
                      value={created.length ? created.join(` ${tasksCopy.byAuthor || "·"} `) : none}
                    />
                    <Field
                      label={tasksCopy.updatedBy || "Mise à jour"}
                      value={updated.length ? updated.join(` ${tasksCopy.byAuthor || "·"} `) : none}
                    />
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </ReportBrandingChrome>
    </div>
  );

  return createPortal(body, document.body);
}
