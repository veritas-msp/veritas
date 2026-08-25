import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./RapportBuilderPlaceholder.module.css";
import { getDefaultSupervisionPeriod } from "./monitoring/supervisionReportBuilder";

export default function SupervisionPeriodGate({
  copy,
  reportType,
  client,
  onBack,
  onConfirm,
  confirming = false
}) {
  const defaults = useMemo(() => getDefaultSupervisionPeriod(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const clientLabel = client?.name || client?.nom || (client?.id ? copy.create.getClientLabel(client.id) : "—");
  const periodCopy = copy.supervisionBuilder || {};
  const isValid = Boolean(startDate && endDate && startDate <= endDate);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack} disabled={confirming}>
          <Icon icon="mdi:arrow-left" aria-hidden />
          {copy.wizard.backToSelection}
        </button>

        <div className={styles.headerMain}>
          <div className={styles.headerIcon}>
            <Icon icon={reportType?.icon || "mdi:radar"} aria-hidden />
          </div>
          <div className={styles.headerCopy}>
            <span className={styles.headerEyebrow}>{clientLabel}</span>
            <h1 className={styles.headerTitle}>{reportType?.title}</h1>
            <p className={styles.headerSubtitle}>
              {periodCopy.periodGateSubtitle || reportType?.description}
            </p>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.stepPanel} style={{ gridColumn: "1 / -1", maxWidth: 560 }}>
          <div className={styles.stepPanelHead}>
            <h2 className={styles.stepPanelTitle}>
              {periodCopy.periodTitle || "Période du rapport"}
            </h2>
          </div>

          <p style={{ margin: "0 0 1.25rem", color: "var(--text-muted, #6b7280)", fontSize: "0.95rem" }}>
            {periodCopy.periodHint ||
              "Choisissez la fenêtre d’analyse : tickets, alertes de supervision et disponibilité seront calculés sur cette période."}
          </p>

          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              {periodCopy.startLabel || "Date de début"}
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  padding: "0.55rem 0.65rem",
                  borderRadius: 8,
                  border: "1px solid var(--border-primary, #e5e7eb)",
                  fontSize: "0.95rem"
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              {periodCopy.endLabel || "Date de fin"}
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  padding: "0.55rem 0.65rem",
                  borderRadius: 8,
                  border: "1px solid var(--border-primary, #e5e7eb)",
                  fontSize: "0.95rem"
                }}
              />
            </label>
          </div>

          <div className={styles.stepActions} style={{ marginTop: "1.75rem" }}>
            <button type="button" className={styles.secondaryBtn} onClick={onBack} disabled={confirming}>
              <Icon icon="mdi:arrow-left" aria-hidden />
              {copy.wizard.back}
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!isValid || confirming}
              onClick={() => onConfirm?.({ startDate, endDate })}
            >
              {confirming ? (
                <>
                  <Icon icon="mdi:loading" className={styles.placeholderIcon} style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} aria-hidden />
                  {periodCopy.loading || "Chargement…"}
                </>
              ) : (
                <>
                  {periodCopy.startBuilder || copy.wizard.startReport}
                  <Icon icon="mdi:arrow-right" aria-hidden />
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
