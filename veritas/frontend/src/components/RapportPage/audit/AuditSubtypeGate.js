import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import shellStyles from "../RapportBuilderPlaceholder.module.css";
import { getAuditReportCopy, getAuditSubtypeOptions } from "./auditReportI18n";
import { AUDIT_SUBTYPE_IDS } from "./auditReportConstants";
import styles from "./AuditSubtypeGate.module.css";

export default function AuditSubtypeGate({
  locale = "fr",
  reportType,
  client,
  onBack,
  onConfirm,
  confirming = false,
  initialSubtypeId = AUDIT_SUBTYPE_IDS.INFRASTRUCTURE
}) {
  const copy = useMemo(() => getAuditReportCopy(locale), [locale]);
  const options = useMemo(() => getAuditSubtypeOptions(copy), [copy]);
  const [selectedId, setSelectedId] = useState(initialSubtypeId || AUDIT_SUBTYPE_IDS.INFRASTRUCTURE);
  const clientLabel = client?.name || client?.nom || "—";

  return (
    <div className={styles.page}>
      <div className={shellStyles.builderToolbar}>
        <div className={shellStyles.builderToolbarMeta}>
          <h1 className={shellStyles.builderToolbarTitle}>{copy.gateTitle}</h1>
          <p className={shellStyles.builderToolbarSubtitle}>
            {[clientLabel, copy.gateHint].filter(Boolean).join(" — ")}
          </p>
        </div>
        <div className={shellStyles.heroActions}>
          <button type="button" className={shellStyles.heroBtn} onClick={onBack} disabled={confirming}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {copy.gateBack}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>{reportType?.title || copy.gateTitle}</h2>
              <p className={styles.cardHint}>{copy.gateHint}</p>
            </div>
          </div>
          <div className={styles.grid} role="listbox" aria-label={copy.gateTitle}>
            {options.map(option => {
              const selected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`${styles.option} ${selected ? styles.optionSelected : ""}`.trim()}
                  onClick={() => setSelectedId(option.id)}
                  disabled={confirming}
                >
                  <span className={styles.optionIcon} aria-hidden>
                    <Icon icon={option.icon} />
                  </span>
                  <span className={styles.optionBody}>
                    <span className={styles.optionTitle}>{option.title}</span>
                    {option.description ? <span className={styles.optionDesc}>{option.description}</span> : null}
                  </span>
                  <Icon
                    icon={selected ? "mdi:check-circle" : "mdi:circle-outline"}
                    className={styles.optionCheck}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span />
        <div className={styles.actions}>
          <button type="button" className={shellStyles.secondaryBtn} onClick={onBack} disabled={confirming}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {copy.gateBack}
          </button>
          <button
            type="button"
            className={shellStyles.primaryBtn}
            disabled={confirming || !selectedId}
            onClick={() => onConfirm?.({ subtypeId: selectedId })}
          >
            {confirming ? "…" : copy.gateConfirm}
            <Icon icon="mdi:arrow-right" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}
