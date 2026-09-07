import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { generateTicketRunbookAi } from "../../api/ai";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import styles from "./TicketAiRunbookPanel.module.css";

const PANEL_COPY = {
  fr: {
    title: "Aide technicien",
    subtitle: "Diagnostic, causes probables et plan d’action pour ce ticket",
    generate: "Générer",
    regenerate: "Régénérer",
    generating: "Génération…",
    empty: "Générez une analyse technique approfondie à partir du ticket et de la conversation.",
    error: "Impossible de générer l’aide technicien",
    steps: "{count} étape",
    stepsPlural: "{count} étapes",
    generatedAt: "Généré le {date}",
    diagnosis: "Diagnostic",
    causes: "Causes probables",
    tools: "Outils & commandes",
    checklist: "Plan d’action"
  },
  en: {
    title: "Technician assist",
    subtitle: "Diagnosis, likely causes and action plan for this ticket",
    generate: "Generate",
    regenerate: "Regenerate",
    generating: "Generating…",
    empty: "Generate an in-depth technical analysis from the ticket and conversation.",
    error: "Unable to generate technician assist",
    steps: "{count} step",
    stepsPlural: "{count} steps",
    generatedAt: "Generated on {date}",
    diagnosis: "Diagnosis",
    causes: "Likely causes",
    tools: "Tools & commands",
    checklist: "Action plan"
  },
  de: {
    title: "Technikerhilfe",
    subtitle: "Diagnose, wahrscheinliche Ursachen und Aktionsplan",
    generate: "Erzeugen",
    regenerate: "Neu erzeugen",
    generating: "Wird erzeugt…",
    empty: "Erzeugen Sie eine technische Analyse aus Ticket und Konversation.",
    error: "Technikerhilfe konnte nicht erzeugt werden",
    steps: "{count} Schritt",
    stepsPlural: "{count} Schritte",
    generatedAt: "Erzeugt am {date}",
    diagnosis: "Diagnose",
    causes: "Wahrscheinliche Ursachen",
    tools: "Tools & Befehle",
    checklist: "Aktionsplan"
  },
  it: {
    title: "Aiuto tecnico",
    subtitle: "Diagnosi, cause probabili e piano d’azione",
    generate: "Genera",
    regenerate: "Rigenera",
    generating: "Generazione…",
    empty: "Genera un’analisi tecnica approfondita dal ticket e dalla conversazione.",
    error: "Impossibile generare l’aiuto tecnico",
    steps: "{count} passo",
    stepsPlural: "{count} passi",
    generatedAt: "Generato il {date}",
    diagnosis: "Diagnosi",
    causes: "Cause probabili",
    tools: "Strumenti e comandi",
    checklist: "Piano d’azione"
  },
  es: {
    title: "Ayuda al técnico",
    subtitle: "Diagnóstico, causas probables y plan de acción",
    generate: "Generar",
    regenerate: "Regenerar",
    generating: "Generando…",
    empty: "Genere un análisis técnico profundo a partir del ticket y la conversación.",
    error: "No se pudo generar la ayuda al técnico",
    steps: "{count} paso",
    stepsPlural: "{count} pasos",
    generatedAt: "Generado el {date}",
    diagnosis: "Diagnóstico",
    causes: "Causas probables",
    tools: "Herramientas y comandos",
    checklist: "Plan de acción"
  }
};

function getCopy(locale) {
  const code = String(locale || "fr").toLowerCase().slice(0, 2);
  return PANEL_COPY[code] || PANEL_COPY.fr;
}

function normalizeList(value) {
  return (Array.isArray(value) ? value : []).map(item => String(item || "").trim()).filter(Boolean);
}

function normalizeRunbook(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw.ai_runbook && typeof raw.ai_runbook === "object" ? raw.ai_runbook : raw;
  const checklist = normalizeList(source.checklist);
  const summary = String(source.summary || source.diagnosis || "").trim();
  const hypotheses = normalizeList(source.hypotheses || source.causes || source.probableCauses);
  const tools = normalizeList(source.tools || source.commands);
  if (checklist.length === 0 && !source.title && !summary && hypotheses.length === 0 && tools.length === 0) return null;
  const checked = source.checked && typeof source.checked === "object" ? {
    ...source.checked
  } : {};
  checklist.forEach((_, idx) => {
    const key = `step-${idx}`;
    if (checked[key] === undefined) checked[key] = false;
  });
  return {
    title: String(source.title || "").trim() || "Runbook",
    summary,
    hypotheses,
    tools,
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
          {runbook.summary ? <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.diagnosis}</h4>
              <p className={styles.sectionText}>{runbook.summary}</p>
            </div> : null}
          {runbook.hypotheses?.length ? <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.causes}</h4>
              <ul className={styles.bulletList}>
                {runbook.hypotheses.map((item, idx) => <li key={`cause-${idx}`}>{item}</li>)}
              </ul>
            </div> : null}
          {runbook.tools?.length ? <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{copy.tools}</h4>
              <ul className={styles.bulletList}>
                {runbook.tools.map((item, idx) => <li key={`tool-${idx}`}><code className={styles.toolCode}>{item}</code></li>)}
              </ul>
            </div> : null}
          {stepCount > 0 ? <>
              <div className={styles.stepsMeta}>{copy.checklist} · {stepsLabel}</div>
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
            </> : null}
        </div>}
    </section>;
}
