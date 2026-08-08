import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchAiStatus } from "../../../api/ai";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getUserSetting, saveUserSetting } from "../../../api/userSettings";
import styles from "./AiBriefingPanel.module.css";
const PANEL_COPY = {
  fr: {
    title: "Analyse IA",
    generate: "Analyser",
    regenerating: "Analyse…",
    unavailable: "IA non configurée ou fonctionnalité désactivée.",
    empty: "Générez un briefing à partir des indicateurs actuels.",
    summary: "Synthèse",
    insights: "Insights",
    priorities: "Prioritys",
    watchpoints: "Points d'attention",
    critical: "Critical",
    strengths: "Points forts",
    risks: "Risques",
    nextActions: "Actions suivantes",
    error: "Unable to générer l'analyse",
    cached: "Dernière analyse"
  },
  en: {
    title: "AI analysis",
    generate: "Analyze",
    regenerating: "Analyzing…",
    unavailable: "AI is not configured or this feature is disabled.",
    empty: "Generate a briefing from the current KPIs.",
    summary: "Summary",
    insights: "Insights",
    priorities: "Priorities",
    watchpoints: "Watchpoints",
    critical: "Critical",
    strengths: "Strengths",
    risks: "Risks",
    nextActions: "Next actions",
    error: "Unable to generate analysis",
    cached: "Last analysis"
  },
  de: {
    title: "KI-Analyse",
    generate: "Analysieren",
    regenerating: "Analyse…",
    unavailable: "KI nicht konfiguriert oder Funktion deaktiviert.",
    empty: "Erzeugen Sie ein Briefing aus den aktuellen Kennzahlen.",
    summary: "Zusammenfassung",
    insights: "Erkenntnisse",
    priorities: "Prioritäten",
    watchpoints: "Beobachtungspunkte",
    critical: "Kritisch",
    strengths: "Stärken",
    risks: "Risiken",
    nextActions: "Nächste Schritte",
    error: "Analyse konnte nicht erzeugt werden",
    cached: "Letzte Analyse"
  },
  it: {
    title: "Analisi IA",
    generate: "Analizza",
    regenerating: "Analisi…",
    unavailable: "IA non configurata o funzionalità disattivata.",
    empty: "Genera un briefing dagli indicatori attuali.",
    summary: "Sintesi",
    insights: "Insight",
    priorities: "Priorità",
    watchpoints: "Punti di attenzione",
    critical: "Critico",
    strengths: "Punti di forza",
    risks: "Rischi",
    nextActions: "Prossime azioni",
    error: "Impossibile generare l'analisi",
    cached: "Ultima analisi"
  },
  es: {
    title: "Análisis IA",
    generate: "Analizar",
    regenerating: "Analizando…",
    unavailable: "IA no configurada o función desactivada.",
    empty: "Genere un briefing a partir de los indicadores actuales.",
    summary: "Resumen",
    insights: "Insights",
    priorities: "Prioridades",
    watchpoints: "Puntos de atención",
    critical: "Crítico",
    strengths: "Fortalezas",
    risks: "Riesgos",
    nextActions: "Próximas acciones",
    error: "No se pudo generar el análisis",
    cached: "Último análisis"
  }
};
function getCopy(locale) {
  const code = String(locale || "fr").toLowerCase().slice(0, 2);
  return PANEL_COPY[code] || PANEL_COPY.fr;
}
const SECTION_KEYS = [["critical", "critical"], ["insights", "insights"], ["priorities", "priorities"], ["watchpoints", "watchpoints"], ["strengths", "strengths"], ["risks", "risks"], ["nextActions", "nextActions"]];
export default function AiBriefingPanel({
  featureKey,
  cacheKey = null,
  buildPayload,
  onGenerate,
  className = "",
  compact = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [aiReady, setAiReady] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchAiStatus();
        if (cancelled) return;
        const enabled = Boolean(status?.configured) && status?.features?.[featureKey] !== false;
        setAiReady(enabled);
      } catch {
        if (!cancelled) setAiReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featureKey]);
  useEffect(() => {
    if (!cacheKey || !aiReady) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const {
          value
        } = await getUserSetting(cacheKey);
        if (cancelled || !value || typeof value !== "object") return;
        if (value.summary) setResult(value);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, aiReady]);
  const handleGenerate = useCallback(async () => {
    if (!aiReady || loading) return;
    setLoading(true);
    try {
      const payload = typeof buildPayload === "function" ? buildPayload() : {};
      const data = await onGenerate(payload, locale);
      const next = {
        summary: data.summary || "",
        insights: data.insights || [],
        priorities: data.priorities || [],
        watchpoints: data.watchpoints || [],
        critical: data.critical || [],
        strengths: data.strengths || [],
        risks: data.risks || [],
        nextActions: data.nextActions || [],
        generatedAt: new Date().toISOString()
      };
      setResult(next);
      if (cacheKey) {
        saveUserSetting(cacheKey, next).catch(() => {});
      }
    } catch (err) {
      toast.error(err.message || copy.error);
    } finally {
      setLoading(false);
    }
  }, [aiReady, loading, buildPayload, onGenerate, locale, cacheKey, copy.error]);
  if (aiReady === false) return null;
  if (aiReady === null) return null;
  const sections = SECTION_KEYS.map(([key, copyKey]) => ({
    key,
    label: copy[copyKey],
    items: Array.isArray(result?.[key]) ? result[key] : []
  })).filter(section => section.items.length > 0);
  return <section className={`${styles.panel} ${compact ? styles.panelCompact : ""} ${className}`.trim()} aria-label={copy.title}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <Icon icon="mdi:sparkles" className={styles.titleIcon} aria-hidden />
          <div>
            <h3 className={styles.title}>{copy.title}</h3>
            {result?.generatedAt ? <p className={styles.meta}>
                {copy.cached} · {new Date(result.generatedAt).toLocaleString(locale)}
              </p> : null}
          </div>
        </div>
        <button type="button" className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
          <Icon icon={loading ? "mdi:loading" : "mdi:auto-fix"} className={loading ? styles.spin : undefined} />
          {loading ? copy.regenerating : copy.generate}
        </button>
      </header>

      {!result ? <p className={styles.empty}>{copy.empty}</p> : <div className={styles.body}>
          {result.summary ? <div className={styles.summaryBlock}>
              <span className={styles.sectionLabel}>{copy.summary}</span>
              <p className={styles.summary}>{result.summary}</p>
            </div> : null}
          {sections.length > 0 ? <div className={styles.sections}>
              {sections.map(section => <div key={section.key} className={styles.section}>
                  <span className={styles.sectionLabel}>{section.label}</span>
                  <ul className={styles.list}>
                    {section.items.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>)}
            </div> : null}
        </div>}
    </section>;
}
