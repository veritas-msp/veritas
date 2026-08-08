import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { generateTicketRunbookAi } from "../../api/ai";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./TicketAiRunbookPanel.module.css";

const PANEL_COPY = {
  fr: {
    title: "Runbook IA",
    subtitle: "Troubleshooting checklist for this ticket",
    generate: "Generate",
    regenerate: "Regenerate",
    generating: "Generating…",
    empty: "Generate a troubleshooting runbook from the ticket and conversation.",
    error: "Unable to generate the runbook",
    steps: "{count} step",
    stepsPlural: "{count} steps",
    generatedAt: "Generated on {date}"
  },
  en: {
    title: "AI runbook",
    subtitle: "Troubleshooting checklist for this ticket",
    generate: "Generate",
    regenerate: "Regenerate",
    generating: "Generating…",
    empty: "Generate a troubleshooting runbook from the ticket and conversation.",
    error: "Unable to generate the runbook",
    steps: "{count} step",
    stepsPlural: "{count} steps",
    generatedAt: "Generated on {date}"
  },
  de: {
    title: "KI-Runbook",
    subtitle: "Fehlerbehebungs-Checkliste für dieses Ticket",
    generate: "Erzeugen",
    regenerate: "Neu erzeugen",
    generating: "Wird erzeugt…",
    empty: "Erzeugen Sie ein Runbook aus Ticket und Konversation.",
    error: "Runbook konnte nicht erzeugt werden",
    steps: "{count} Schritt",
    stepsPlural: "{count} Schritte",
    generatedAt: "Erzeugt am {date}"
  },
  it: {
    title: "Runbook IA",
    subtitle: "Checklist di risoluzione per questo ticket",
    generate: "Genera",
    regenerate: "Rigenera",
    generating: "Generazione…",
    empty: "Genera un runbook di risoluzione dal ticket e dalla conversazione.",
    error: "Impossibile generare il runbook",
    steps: "{count} passo",
    stepsPlural: "{count} passi",
    generatedAt: "Generato il {date}"
  },
  es: {
    title: "Runbook IA",
    subtitle: "Lista de comprobación de resolución para este ticket",
    generate: "Generar",
    regenerate: "Regenerar",
    generating: "Generando…",
    empty: "Genere un runbook de resolución a partir del ticket y la conversación.",
    error: "No se pudo generar el runbook",
    steps: "{count} paso",
    stepsPlural: "{count} pasos",
    generatedAt: "Generado el {date}"
  }
};

function getCopy(locale) {
  const code = String(locale || "fr").toLowerCase().slice(0, 2);
  return PANEL_COPY[code] || PANEL_COPY.fr;
}

function normalizeRunbook(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw.ai_runbook && typeof raw.ai_runbook === "object" ? raw.ai_runbook : raw;
  const checklist = Array.isArray(source.checklist) ? source.checklist.map(item => String(item || "").trim()).filter(Boolean) : [];
  if (checklist.length === 0 && !source.title) return null;
  const checked = source.checked && typeof source.checked === "object" ? {
    ...source.checked
  } : {};
  checklist.forEach((_, idx) => {
    const key = `step-${idx}`;
    if (checked[key] === undefined) checked[key] = false;
  });
  return {
    title: String(source.title || "").trim() || "Runbook",
    checklist,
    checked,
    generatedAt: source.generatedAt || null
  };
}

export default function TicketAiRunbookPanel({
  ticketId,
  initialRunbook = null,
  onRunbookChange,
  className = ""
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [runbook, setRunbook] = useState(() => normalizeRunbook(initialRunbook));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRunbook(normalizeRunbook(initialRunbook));
  }, [ticketId, initialRunbook]);

  const handleGenerate = useCallback(async () => {
    if (!ticketId || loading) return;
    setLoading(true);
    try {
      const data = await generateTicketRunbookAi({
        ticketId,
        locale
      });
      const next = normalizeRunbook(data);
      setRunbook(next);
      if (typeof onRunbookChange === "function") onRunbookChange(next);
    } catch (err) {
      toast.error(err.message || copy.error);
    } finally {
      setLoading(false);
    }
  }, [ticketId, loading, locale, onRunbookChange, copy.error]);

  const toggleStep = useCallback(stepKey => {
    setRunbook(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        checked: {
          ...prev.checked,
          [stepKey]: !prev.checked?.[stepKey]
        },
        updatedAt: new Date().toISOString()
      };
      if (typeof onRunbookChange === "function") onRunbookChange(next);
      return next;
    });
  }, [onRunbookChange]);

  const stepCount = runbook?.checklist?.length || 0;
  const stepsLabel = stepCount === 1 ? copy.steps.replace("{count}", String(stepCount)) : copy.stepsPlural.replace("{count}", String(stepCount));
  const generatedLabel = runbook?.generatedAt ? copy.generatedAt.replace("{date}", new Date(runbook.generatedAt).toLocaleString(locale)) : null;

  return <section className={`${styles.panel} ${className}`.trim()} aria-label={copy.title}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <Icon icon="mdi:robot-outline" className={styles.titleIcon} aria-hidden />
          <div>
            <h3 className={styles.title}>{runbook?.title || copy.title}</h3>
            <p className={styles.meta}>{generatedLabel || copy.subtitle}</p>
          </div>
        </div>
        <button type="button" className={styles.generateBtn} onClick={handleGenerate} disabled={loading || !ticketId}>
          {loading ? <>
              <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
              {copy.generating}
            </> : <>
              <Icon icon="mdi:auto-fix" aria-hidden />
              {runbook ? copy.regenerate : copy.generate}
            </>}
        </button>
      </header>

      {!runbook ? <p className={styles.empty}>{copy.empty}</p> : <div className={styles.body}>
          <div className={styles.stepsMeta}>{stepsLabel}</div>
          <ul className={styles.checklist}>
            {runbook.checklist.map((step, idx) => {
            const key = `step-${idx}`;
            const done = Boolean(runbook.checked?.[key]);
            return <li key={key} className={`${styles.step} ${done ? styles.stepDone : ""}`.trim()}>
                  <label className={styles.stepLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={done} onChange={() => toggleStep(key)} />
                    <span className={styles.stepText}>{step}</span>
                  </label>
                </li>;
          })}
          </ul>
        </div>}
    </section>;
}
