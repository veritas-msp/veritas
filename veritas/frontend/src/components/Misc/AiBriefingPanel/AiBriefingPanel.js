import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchAiBriefings, fetchAiStatus } from "../../../api/ai";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getUserSetting } from "../../../api/userSettings";
import modalLayout from "../../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./AiBriefingPanel.module.css";

const PANEL_COPY = {
  fr: {
    title: "Analyse IA",
    generate: "Nouvelle analyse",
    regenerating: "Analyse…",
    unavailable: "IA non configurée ou fonctionnalité désactivée.",
    empty: "Générez un briefing à partir des indicateurs actuels.",
    selectHint: "Sélectionnez une analyse dans l’historique, ou générez-en une nouvelle.",
    history: "Historique",
    historyEmpty: "Aucune analyse enregistrée pour le moment.",
    requester: "Demandeur",
    unknownRequester: "Inconnu",
    summary: "Synthèse",
    insights: "Insights",
    priorities: "Priorités",
    watchpoints: "Points d'attention",
    critical: "Critique",
    strengths: "Points forts",
    risks: "Risques",
    nextActions: "Actions suivantes",
    error: "Impossible de générer l'analyse",
    loadError: "Impossible de charger l’historique",
    cached: "Dernière analyse",
    openAria: "Ouvrir l'analyse IA",
    closeAria: "Fermer l'analyse IA"
  },
  en: {
    title: "AI analysis",
    generate: "New analysis",
    regenerating: "Analyzing…",
    unavailable: "AI is not configured or this feature is disabled.",
    empty: "Generate a briefing from the current KPIs.",
    selectHint: "Select an analysis from the history, or generate a new one.",
    history: "History",
    historyEmpty: "No saved analysis yet.",
    requester: "Requested by",
    unknownRequester: "Unknown",
    summary: "Summary",
    insights: "Insights",
    priorities: "Priorities",
    watchpoints: "Watchpoints",
    critical: "Critical",
    strengths: "Strengths",
    risks: "Risks",
    nextActions: "Next actions",
    error: "Unable to generate analysis",
    loadError: "Unable to load history",
    cached: "Last analysis",
    openAria: "Open AI analysis",
    closeAria: "Close AI analysis"
  },
  de: {
    title: "KI-Analyse",
    generate: "Neue Analyse",
    regenerating: "Analyse…",
    unavailable: "KI nicht konfiguriert oder Funktion deaktiviert.",
    empty: "Erzeugen Sie ein Briefing aus den aktuellen Kennzahlen.",
    selectHint: "Wählen Sie eine Analyse aus dem Verlauf oder erzeugen Sie eine neue.",
    history: "Verlauf",
    historyEmpty: "Noch keine gespeicherte Analyse.",
    requester: "Angefordert von",
    unknownRequester: "Unbekannt",
    summary: "Zusammenfassung",
    insights: "Erkenntnisse",
    priorities: "Prioritäten",
    watchpoints: "Beobachtungspunkte",
    critical: "Kritisch",
    strengths: "Stärken",
    risks: "Risiken",
    nextActions: "Nächste Schritte",
    error: "Analyse konnte nicht erzeugt werden",
    loadError: "Verlauf konnte nicht geladen werden",
    cached: "Letzte Analyse",
    openAria: "KI-Analyse öffnen",
    closeAria: "KI-Analyse schließen"
  },
  it: {
    title: "Analisi IA",
    generate: "Nuova analisi",
    regenerating: "Analisi…",
    unavailable: "IA non configurata o funzionalità disattivata.",
    empty: "Genera un briefing dagli indicatori attuali.",
    selectHint: "Seleziona un’analisi dallo storico oppure generane una nuova.",
    history: "Storico",
    historyEmpty: "Nessuna analisi salvata.",
    requester: "Richiedente",
    unknownRequester: "Sconosciuto",
    summary: "Sintesi",
    insights: "Insight",
    priorities: "Priorità",
    watchpoints: "Punti di attenzione",
    critical: "Critico",
    strengths: "Punti di forza",
    risks: "Rischi",
    nextActions: "Prossime azioni",
    error: "Impossibile generare l'analisi",
    loadError: "Impossibile caricare lo storico",
    cached: "Ultima analisi",
    openAria: "Apri analisi IA",
    closeAria: "Chiudi analisi IA"
  },
  es: {
    title: "Análisis IA",
    generate: "Nuevo análisis",
    regenerating: "Analizando…",
    unavailable: "IA no configurada o función desactivada.",
    empty: "Genere un briefing a partir de los indicadores actuales.",
    selectHint: "Seleccione un análisis del historial o genere uno nuevo.",
    history: "Historial",
    historyEmpty: "Todavía no hay análisis guardados.",
    requester: "Solicitante",
    unknownRequester: "Desconocido",
    summary: "Resumen",
    insights: "Insights",
    priorities: "Prioridades",
    watchpoints: "Puntos de atención",
    critical: "Crítico",
    strengths: "Fortalezas",
    risks: "Riesgos",
    nextActions: "Próximas acciones",
    error: "No se pudo generar el análisis",
    loadError: "No se pudo cargar el historial",
    cached: "Último análisis",
    openAria: "Abrir análisis IA",
    closeAria: "Cerrar análisis IA"
  }
};

const SECTION_KEYS = [
  ["critical", "critical"],
  ["insights", "insights"],
  ["priorities", "priorities"],
  ["watchpoints", "watchpoints"],
  ["strengths", "strengths"],
  ["risks", "risks"],
  ["nextActions", "nextActions"]
];

function getCopy(locale) {
  const code = String(locale || "fr").toLowerCase().slice(0, 2);
  return PANEL_COPY[code] || PANEL_COPY.fr;
}

function asList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function normalizeBriefing(data, fallbackId = null) {
  if (!data || typeof data !== "object") return null;
  const summary = String(data.summary || "").trim();
  const lists = SECTION_KEYS.reduce((acc, [key]) => {
    acc[key] = asList(data[key]);
    return acc;
  }, {});
  const hasContent = Boolean(summary) || SECTION_KEYS.some(([key]) => lists[key].length > 0);
  if (!hasContent) return null;
  return {
    id: data.id || fallbackId || `local-${data.generatedAt || Date.now()}`,
    generatedAt: data.generatedAt || null,
    generatedBy: data.generatedBy || null,
    requesterName: String(data.requesterName || "").trim(),
    summary,
    ...lists
  };
}

function formatBriefingDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function BriefingBody({ briefing, copy, loading }) {
  if (loading && !briefing) {
    return (
      <div className={styles.placeholder}>
        <Icon icon="mdi:loading" className={styles.spin} aria-hidden />
        <p>{copy.regenerating}</p>
      </div>
    );
  }
  if (!briefing) {
    return (
      <div className={styles.placeholder}>
        <Icon icon="mdi:text-box-search-outline" aria-hidden />
        <p>{copy.selectHint}</p>
      </div>
    );
  }
  const sections = SECTION_KEYS.map(([key, copyKey]) => ({
    key,
    label: copy[copyKey],
    items: Array.isArray(briefing[key]) ? briefing[key] : []
  })).filter((section) => section.items.length > 0);
  return (
    <div className={styles.body}>
      {briefing.summary ? (
        <div className={styles.summaryBlock}>
          <span className={styles.sectionLabel}>{copy.summary}</span>
          <p className={styles.summary}>{briefing.summary}</p>
        </div>
      ) : null}
      {sections.length > 0 ? (
        <div className={styles.sections}>
          {sections.map((section) => (
            <div key={section.key} className={styles.section}>
              <span className={styles.sectionLabel}>{section.label}</span>
              <ul className={styles.list}>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AiBriefingPanel({
  featureKey,
  cacheKey = null,
  buildPayload,
  onGenerate,
  className = "",
  compact = false,
  variant = "inline"
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const scopeKey = cacheKey || featureKey || "";
  const [aiReady, setAiReady] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(false);

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
    if (!aiReady || !featureKey) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAiBriefings({ featureKey, scopeKey });
        if (cancelled) return;
        let next = Array.isArray(data?.items) ? data.items.map((row) => normalizeBriefing(row)).filter(Boolean) : [];
        if (next.length === 0 && cacheKey) {
          try {
            const { value } = await getUserSetting(cacheKey);
            const cached = normalizeBriefing(value, "local-cached");
            if (cached) next = [cached];
          } catch {}
        }
        if (cancelled) return;
        setItems(next);
        setSelectedId((current) => {
          if (current && next.some((item) => item.id === current)) return current;
          return next[0]?.id || null;
        });
      } catch {
        /* keep current history if reload fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aiReady, featureKey, scopeKey, cacheKey]);

  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeModal]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  const handleGenerate = useCallback(async () => {
    if (!aiReady || loading) return;
    setLoading(true);
    try {
      const payload = typeof buildPayload === "function" ? buildPayload() : {};
      const data = await onGenerate(payload, locale);
      const nextItem = normalizeBriefing(data, `generated-${Date.now()}`);
      if (!nextItem) throw new Error(copy.error);
      setItems((prev) => [nextItem, ...prev.filter((item) => item.id !== nextItem.id && !String(item.id).startsWith("local-"))]);
      setSelectedId(nextItem.id);
      if (!open && variant === "fab") setOpen(true);
    } catch (err) {
      toast.error(err.message || copy.error);
    } finally {
      setLoading(false);
    }
  }, [aiReady, loading, buildPayload, onGenerate, locale, copy.error, open, variant]);

  if (aiReady === false || aiReady === null) return null;

  const generateButton = (
    <button type="button" className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
      <Icon icon={loading ? "mdi:loading" : "mdi:auto-fix"} className={loading ? styles.spin : undefined} />
      {loading ? copy.regenerating : copy.generate}
    </button>
  );

  const historyList = (
    <aside className={styles.historyPane} aria-label={copy.history}>
      <div className={styles.historyHead}>
        <span className={styles.historyTitle}>{copy.history}</span>
        <span className={styles.historyCount}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className={styles.historyEmpty}>{copy.historyEmpty}</p>
      ) : (
        <ul className={styles.historyList}>
          {items.map((item) => {
            const active = item.id === (selected?.id || selectedId);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.historyItem}${active ? ` ${styles.historyItemActive}` : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.historyDate}>{formatBriefingDate(item.generatedAt, locale)}</span>
                  <span className={styles.historyRequester}>
                    {item.requesterName || copy.unknownRequester}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );

  if (variant === "fab") {
    return (
      <>
        <button type="button" className={styles.fab} onClick={() => setOpen(true)} aria-label={copy.openAria} title={copy.title}>
          {items.length === 0 ? <span className={styles.fabPulse} aria-hidden /> : null}
          <Icon icon="mdi:sparkles" className={styles.fabIcon} />
          {items.length > 0 ? <span className={styles.fabBadge} aria-hidden /> : null}
        </button>
        {open
          ? createPortal(
              <div className={modalLayout.overlay} onClick={closeModal} role="presentation">
                <div
                  className={`${modalLayout.shell} ${styles.modalShell}`}
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ai-briefing-modal-title"
                >
                  <div className={modalLayout.accentBar} aria-hidden />
                  <header className={modalLayout.header}>
                    <div className={modalLayout.headerMain}>
                      <div className={modalLayout.headerIconWrap} aria-hidden>
                        <Icon icon="mdi:sparkles" />
                      </div>
                      <div className={modalLayout.headerText}>
                        <h2 className={modalLayout.title} id="ai-briefing-modal-title">
                          {copy.title}
                        </h2>
                        <p className={modalLayout.subtitle}>
                          {selected?.generatedAt
                            ? `${formatBriefingDate(selected.generatedAt, locale)} · ${selected.requesterName || copy.unknownRequester}`
                            : copy.selectHint}
                        </p>
                      </div>
                    </div>
                    <div className={styles.modalHeaderActions}>
                      {generateButton}
                      <button type="button" className={modalLayout.closeBtn} onClick={closeModal} aria-label={copy.closeAria}>
                        <FaTimes />
                      </button>
                    </div>
                  </header>
                  <div className={styles.modalSplit}>
                    {historyList}
                    <div className={styles.detailPane}>
                      {loading ? <div className={styles.generatingMask} aria-hidden /> : null}
                      <BriefingBody briefing={selected} copy={copy} loading={loading} />
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </>
    );
  }

  return (
    <section className={`${styles.panel} ${compact ? styles.panelCompact : ""} ${className}`.trim()} aria-label={copy.title}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <Icon icon="mdi:sparkles" className={styles.titleIcon} aria-hidden />
          <div>
            <h3 className={styles.title}>{copy.title}</h3>
            {selected?.generatedAt ? (
              <p className={styles.meta}>
                {formatBriefingDate(selected.generatedAt, locale)}
                {selected.requesterName ? ` · ${selected.requesterName}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        {generateButton}
      </header>
      <BriefingBody briefing={selected} copy={copy} loading={loading} />
    </section>
  );
}
