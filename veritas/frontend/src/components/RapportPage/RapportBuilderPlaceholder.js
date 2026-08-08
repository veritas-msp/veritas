import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./RapportBuilderPlaceholder.module.css";
export default function ReportBuilderPlaceholder({
  copy,
  reportType,
  client,
  onBack
}) {
  const steps = useMemo(() => reportType?.steps || [], [reportType?.steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex] || steps[0] || copy.wizard.stepBuild;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= steps.length - 1;
  const clientLabel = client?.name || client?.nom || (client?.id ? copy.create.getClientLabel(client.id) : "-");
  return <div className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <Icon icon="mdi:arrow-left" aria-hidden />
          {copy.wizard.backToSelection}
        </button>

        <div className={styles.headerMain}>
          <div className={styles.headerIcon}>
            <Icon icon={reportType?.icon || "mdi:file-chart-outline"} aria-hidden />
          </div>
          <div className={styles.headerCopy}>
            <span className={styles.headerEyebrow}>{clientLabel}</span>
            <h1 className={styles.headerTitle}>{reportType?.title}</h1>
            <p className={styles.headerSubtitle}>{reportType?.description}</p>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.stepNav} aria-label={copy.wizard.stepNavAria}>
          {steps.map((label, index) => {
          const isActive = index === stepIndex;
          const isDone = index < stepIndex;
          return <button key={label} type="button" className={`${styles.stepNavItem} ${isActive ? styles.stepNavItemActive : ""} ${isDone ? styles.stepNavItemDone : ""}`} onClick={() => setStepIndex(index)}>
                <span className={styles.stepNavIndex}>{index + 1}</span>
                <span className={styles.stepNavLabel}>{label}</span>
              </button>;
        })}
        </aside>

        <section className={styles.stepPanel}>
          <div className={styles.stepPanelHead}>
            <h2 className={styles.stepPanelTitle}>{currentStep}</h2>
            <span className={styles.stepPanelMeta}>
              {copy.wizard.formatStepOf(stepIndex + 1, steps.length)}
            </span>
          </div>

          <div className={styles.placeholder}>
            <Icon icon="mdi:hammer-wrench" className={styles.placeholderIcon} aria-hidden />
            <p className={styles.placeholderTitle}>{copy.wizard.placeholderTitle}</p>
            <p className={styles.placeholderHint}>{copy.wizard.placeholderHint}</p>
            <span className={styles.placeholderBadge}>{copy.wizard.placeholderBadge}</span>
          </div>

          <div className={styles.stepActions}>
            <button type="button" className={styles.secondaryBtn} disabled={isFirst} onClick={() => setStepIndex(value => Math.max(0, value - 1))}>
              <Icon icon="mdi:arrow-left" aria-hidden />
              {copy.wizard.back}
            </button>
            {!isLast ? <button type="button" className={styles.primaryBtn} onClick={() => setStepIndex(value => Math.min(steps.length - 1, value + 1))}>
                {copy.wizard.continue}
                <Icon icon="mdi:arrow-right" aria-hidden />
              </button> : <button type="button" className={styles.primaryBtn} disabled title={copy.wizard.finishSoon}>
                {copy.wizard.finishSoon}
              </button>}
          </div>
        </section>
      </div>
    </div>;
}
