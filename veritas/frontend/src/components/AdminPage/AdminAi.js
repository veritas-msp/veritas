import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchAiStatus, fetchAiUsage, updateAiPolicy } from "../../api/ai";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { createLocaleGetter } from "../../i18n/translate";
import { Page, Card, Btn, Switch, NumberStepper } from "./AdminUi";
import ui from "./AdminUi.module.css";
import styles from "./AdminAi.module.css";

const DEFAULT_LIMITS = {
  suggestReply: 100,
  suggestResolve: 50,
  generateRunbook: 30,
  enrichMonitoringAlerts: 100,
  helpMe: 50,
  ticketRunbook: 50,
  dashboardBriefing: 40,
  supervisionBriefing: 40,
  enterpriseSummary: 40
};

const FEATURE_KEYS = Object.keys(DEFAULT_LIMITS);

const ADMIN_AI_COPY = {
  fr: {
    title: "IA · Copilote",
    description: "Activez chaque usage IA et fixez un plafond journalier (nombre d’actions). La clé API se configure dans Intégrations → Veritas AI.",
    inactiveTitle: "IA non configurée",
    inactiveHint: "Activez Veritas AI dans Intégrations, ajoutez votre clé API, puis revenez ici pour gérer les limites.",
    openIntegrations: "Ouvrir Intégrations",
    active: "Actif",
    inactive: "Inactif",
    provider: "Fournisseur",
    model: "Modèle",
    apiKey: "Clé API",
    apiKeySet: "Configurée",
    apiKeyMissing: "Manquante",
    actionsToday: "{count} actions IA aujourd’hui",
    savePolicy: "Enregistrer",
    saving: "Enregistrement…",
    featuresTitle: "Usages & plafonds journaliers",
    featuresHint: "Chaque action compte pour 1. Ex. 50 = 50 rédactions de réponse max par jour.",
    limitPerDay: "max / jour",
    usedToday: "{used} / {limit} aujourd’hui",
    featureSuggestReply: "Rédaction de réponses tickets",
    featureSuggestResolve: "Brouillons de résolution",
    featureGenerateRunbook: "Génération de runbooks",
    featureEnrichAlerts: "Enrichissement des alertes",
    featureHelpMe: "Help Me (diagnostic)",
    featureTicketRunbook: "Runbooks tickets support",
    featureDashboardBriefing: "Briefing dashboard",
    featureSupervisionBriefing: "Briefing supervision",
    featureEnterpriseSummary: "Résumé entreprise",
    journalTitle: "Historique d’usage",
    journalEmpty: "Aucun appel IA enregistré pour le moment.",
    colWhen: "Quand",
    colFeature: "Action",
    colUser: "Utilisateur",
    colStatus: "Statut",
    ok: "OK",
    fail: "Erreur",
    system: "Système",
    saveOk: "Limites IA enregistrées",
    saveError: "Impossible d’enregistrer",
    loadError: "Impossible de charger le statut IA",
    refresh: "Actualiser"
  },
  en: {
    title: "AI · Copilot",
    description: "Enable each AI action and set a daily cap (number of uses). API keys stay in Integrations → Veritas AI.",
    inactiveTitle: "AI not configured",
    inactiveHint: "Enable Veritas AI in Integrations, add your API key, then come back here to manage limits.",
    openIntegrations: "Open Integrations",
    active: "Active",
    inactive: "Inactive",
    provider: "Provider",
    model: "Model",
    apiKey: "API key",
    apiKeySet: "Configured",
    apiKeyMissing: "Missing",
    actionsToday: "{count} AI actions today",
    savePolicy: "Save",
    saving: "Saving…",
    featuresTitle: "Actions & daily caps",
    featuresHint: "Each use counts as 1. E.g. 50 = up to 50 reply drafts per day.",
    limitPerDay: "max / day",
    usedToday: "{used} / {limit} today",
    featureSuggestReply: "Ticket reply drafts",
    featureSuggestResolve: "Resolution drafts",
    featureGenerateRunbook: "Runbook generation",
    featureEnrichAlerts: "Alert enrichment",
    featureHelpMe: "Help Me (diagnosis)",
    featureTicketRunbook: "Support ticket runbooks",
    featureDashboardBriefing: "Dashboard briefing",
    featureSupervisionBriefing: "Supervision briefing",
    featureEnterpriseSummary: "Enterprise summary",
    journalTitle: "Usage history",
    journalEmpty: "No AI calls recorded yet.",
    colWhen: "When",
    colFeature: "Action",
    colUser: "User",
    colStatus: "Status",
    ok: "OK",
    fail: "Error",
    system: "System",
    saveOk: "AI limits saved",
    saveError: "Unable to save",
    loadError: "Unable to load AI status",
    refresh: "Refresh"
  },
  de: {
    title: "KI · Copilot",
    description: "Aktivieren Sie jede KI-Aktion und setzen Sie ein Tageslimit (Anzahl). API-Schlüssel unter Integrationen → Veritas AI.",
    inactiveTitle: "KI nicht konfiguriert",
    inactiveHint: "Aktivieren Sie Veritas AI unter Integrationen und hinterlegen Sie den API-Schlüssel.",
    openIntegrations: "Integrationen öffnen",
    active: "Aktiv",
    inactive: "Inaktiv",
    provider: "Anbieter",
    model: "Modell",
    apiKey: "API-Schlüssel",
    apiKeySet: "Konfiguriert",
    apiKeyMissing: "Fehlt",
    actionsToday: "{count} KI-Aktionen heute",
    savePolicy: "Speichern",
    saving: "Speichern…",
    featuresTitle: "Aktionen & Tageslimits",
    featuresHint: "Jede Nutzung zählt als 1. z. B. 50 = max. 50 Antwortentwürfe pro Tag.",
    limitPerDay: "max / Tag",
    usedToday: "{used} / {limit} heute",
    featureSuggestReply: "Ticket-Antwortentwürfe",
    featureSuggestResolve: "Abschlussentwürfe",
    featureGenerateRunbook: "Runbook-Erstellung",
    featureEnrichAlerts: "Alarm-Anreicherung",
    featureHelpMe: "Help Me (Diagnose)",
    featureTicketRunbook: "Support-Ticket-Runbooks",
    featureDashboardBriefing: "Dashboard-Briefing",
    featureSupervisionBriefing: "Supervision-Briefing",
    featureEnterpriseSummary: "Unternehmensübersicht",
    journalTitle: "Nutzungsverlauf",
    journalEmpty: "Noch keine KI-Aufrufe erfasst.",
    colWhen: "Wann",
    colFeature: "Aktion",
    colUser: "Benutzer",
    colStatus: "Status",
    ok: "OK",
    fail: "Fehler",
    system: "System",
    saveOk: "KI-Limits gespeichert",
    saveError: "Speichern fehlgeschlagen",
    loadError: "KI-Status konnte nicht geladen werden",
    refresh: "Aktualisieren"
  },
  it: {
    title: "IA · Copilota",
    description: "Attivate ogni azione IA e impostate un tetto giornaliero (numero di usi). Chiave API in Integrazioni → Veritas AI.",
    inactiveTitle: "IA non configurata",
    inactiveHint: "Attivate Veritas AI in Integrazioni e aggiungete la chiave API.",
    openIntegrations: "Apri Integrazioni",
    active: "Attivo",
    inactive: "Inattivo",
    provider: "Provider",
    model: "Modello",
    apiKey: "Chiave API",
    apiKeySet: "Configurata",
    apiKeyMissing: "Mancante",
    actionsToday: "{count} azioni IA oggi",
    savePolicy: "Salva",
    saving: "Salvataggio…",
    featuresTitle: "Azioni e limiti giornalieri",
    featuresHint: "Ogni uso conta 1. Es. 50 = max 50 bozze di risposta al giorno.",
    limitPerDay: "max / giorno",
    usedToday: "{used} / {limit} oggi",
    featureSuggestReply: "Bozze di risposta ticket",
    featureSuggestResolve: "Bozze di risoluzione",
    featureGenerateRunbook: "Generazione runbook",
    featureEnrichAlerts: "Arricchimento alert",
    featureHelpMe: "Help Me (diagnosi)",
    featureTicketRunbook: "Runbook ticket support",
    featureDashboardBriefing: "Briefing dashboard",
    featureSupervisionBriefing: "Briefing supervisione",
    featureEnterpriseSummary: "Riepilogo azienda",
    journalTitle: "Cronologia d’uso",
    journalEmpty: "Nessuna chiamata IA registrata.",
    colWhen: "Quando",
    colFeature: "Azione",
    colUser: "Utente",
    colStatus: "Stato",
    ok: "OK",
    fail: "Errore",
    system: "Sistema",
    saveOk: "Limiti IA salvati",
    saveError: "Salvataggio non riuscito",
    loadError: "Impossibile caricare lo stato IA",
    refresh: "Aggiorna"
  },
  es: {
    title: "IA · Copiloto",
    description: "Active cada acción de IA y fije un tope diario (número de usos). Clave API en Integraciones → Veritas AI.",
    inactiveTitle: "IA no configurada",
    inactiveHint: "Active Veritas AI en Integraciones y añada su clave API.",
    openIntegrations: "Abrir Integraciones",
    active: "Activo",
    inactive: "Inactivo",
    provider: "Proveedor",
    model: "Modelo",
    apiKey: "Clave API",
    apiKeySet: "Configurada",
    apiKeyMissing: "Falta",
    actionsToday: "{count} acciones IA hoy",
    savePolicy: "Guardar",
    saving: "Guardando…",
    featuresTitle: "Acciones y topes diarios",
    featuresHint: "Cada uso cuenta como 1. Ej. 50 = máximo 50 borradores de respuesta al día.",
    limitPerDay: "máx / día",
    usedToday: "{used} / {limit} hoy",
    featureSuggestReply: "Borradores de respuesta",
    featureSuggestResolve: "Borradores de resolución",
    featureGenerateRunbook: "Generación de runbooks",
    featureEnrichAlerts: "Enriquecer alertas",
    featureHelpMe: "Help Me (diagnóstico)",
    featureTicketRunbook: "Runbooks de tickets",
    featureDashboardBriefing: "Briefing dashboard",
    featureSupervisionBriefing: "Briefing supervisión",
    featureEnterpriseSummary: "Resumen empresa",
    journalTitle: "Historial de uso",
    journalEmpty: "Aún no hay llamadas de IA.",
    colWhen: "Cuándo",
    colFeature: "Acción",
    colUser: "Usuario",
    colStatus: "Estado",
    ok: "OK",
    fail: "Error",
    system: "Sistema",
    saveOk: "Límites de IA guardados",
    saveError: "No se pudo guardar",
    loadError: "No se pudo cargar el estado de IA",
    refresh: "Actualizar"
  }
};

const getAdminAiCopy = createLocaleGetter(ADMIN_AI_COPY);

function formatWhen(iso, locale = "fr") {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const localeTag = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "en-GB";
  return d.toLocaleString(localeTag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function featureLabel(feature, copy) {
  const map = {
    suggest_reply: copy.featureSuggestReply,
    suggest_internal_note: copy.featureSuggestReply,
    suggest_resolve: copy.featureSuggestResolve,
    generate_runbook: copy.featureGenerateRunbook,
    enrich_alert_runbook: copy.featureEnrichAlerts,
    help_me: copy.featureHelpMe,
    ticket_runbook: copy.featureTicketRunbook,
    dashboard_briefing: copy.featureDashboardBriefing,
    supervision_briefing: copy.featureSupervisionBriefing,
    enterprise_summary: copy.featureEnterpriseSummary
  };
  return map[feature] || feature;
}

export default function AdminAi({
  onNavigate
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminAiCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [usageRows, setUsageRows] = useState([]);
  const [features, setFeatures] = useState(() => Object.fromEntries(FEATURE_KEYS.map(k => [k, true])));
  const [featureLimits, setFeatureLimits] = useState(() => ({
    ...DEFAULT_LIMITS
  }));
  const [featureUsage, setFeatureUsage] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, usageData] = await Promise.all([fetchAiStatus(), fetchAiUsage({
        limit: 40
      }).catch(() => ({
        rows: []
      }))]);
      setStatus(statusData);
      setFeatures(Object.fromEntries(FEATURE_KEYS.map(key => [key, statusData?.features?.[key] !== false])));
      setFeatureLimits(Object.fromEntries(FEATURE_KEYS.map(key => [key, Number(statusData?.featureLimits?.[key]) || DEFAULT_LIMITS[key]])));
      setFeatureUsage(statusData?.featureUsage || {});
      setUsageRows(usageData?.rows || []);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const configured = Boolean(status?.configured);
  const actionsToday = status?.usage?.usedToday || 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAiPolicy({
        features,
        featureLimits
      });
      toast.success(copy.saveOk);
      await load();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const goIntegrations = () => {
    if (typeof onNavigate === "function") onNavigate("integrations");
  };

  const featureItems = [["suggestReply", copy.featureSuggestReply], ["suggestResolve", copy.featureSuggestResolve], ["generateRunbook", copy.featureGenerateRunbook], ["enrichMonitoringAlerts", copy.featureEnrichAlerts], ["helpMe", copy.featureHelpMe], ["ticketRunbook", copy.featureTicketRunbook], ["dashboardBriefing", copy.featureDashboardBriefing], ["supervisionBriefing", copy.featureSupervisionBriefing], ["enterpriseSummary", copy.featureEnterpriseSummary]];

  return <Page>
      <div className={styles.toolbar}>
        <div>
          <h2 className={styles.pageTitle}>{copy.title}</h2>
          <p className={styles.pageDesc}>{copy.description}</p>
        </div>
        <div className={styles.toolbarActions}>
          <Btn icon="mdi:refresh" variant="secondary" onClick={load} disabled={loading}>
            {copy.refresh}
          </Btn>
          <Btn icon="mdi:link-variant" variant="secondary" onClick={goIntegrations}>
            {copy.openIntegrations}
          </Btn>
        </div>
      </div>

      {loading ? <p className={ui.adminMutedText}>…</p> : !configured ? <Card title={copy.inactiveTitle} description={copy.inactiveHint}>
          <Btn icon="mdi:robot-outline" onClick={goIntegrations}>
            {copy.openIntegrations}
          </Btn>
        </Card> : <div className={styles.layout}>
          <Card noPadding>
            <div className={styles.statusQuotaBar}>
              <div className={styles.metaRow}>
                <span className={`${styles.pill} ${status.enabled ? styles.pillOk : styles.pillBad}`}>
                  {status.enabled ? copy.active : copy.inactive}
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>{copy.provider}</span>
                  <strong>{status.provider}</strong>
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>{copy.model}</span>
                  <strong className={styles.mono}>{status.model}</strong>
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>{copy.apiKey}</span>
                  <strong>{status.hasApiKey ? copy.apiKeySet : copy.apiKeyMissing}</strong>
                </span>
                <span className={styles.metaItem}>
                  <strong>{copy.actionsToday.replace("{count}", String(actionsToday))}</strong>
                </span>
                <div className={styles.metaActions}>
                  <Btn icon="mdi:content-save-outline" onClick={handleSave} disabled={saving}>
                    {saving ? copy.saving : copy.savePolicy}
                  </Btn>
                </div>
              </div>
            </div>
          </Card>

          <div className={styles.columns}>
            <div className={styles.columnCard}>
              <Card title={copy.featuresTitle} description={copy.featuresHint} action={<Btn icon="mdi:content-save-outline" onClick={handleSave} disabled={saving}>
                    {saving ? copy.saving : copy.savePolicy}
                  </Btn>}>
                <div className={styles.featureList}>
                  {featureItems.map(([key, label]) => {
                const used = Number(featureUsage?.[key]?.used) || 0;
                const limit = Number(featureLimits[key]) || DEFAULT_LIMITS[key];
                return <div key={key} className={styles.featureRow}>
                        <div className={styles.featureMain}>
                          <span className={styles.featureLabel}>{label}</span>
                          <span className={styles.featureUsage}>
                            {copy.usedToday.replace("{used}", String(used)).replace("{limit}", String(limit))}
                          </span>
                        </div>
                        <div className={styles.featureControls}>
                          <span className={styles.limitLabel}>{copy.limitPerDay}</span>
                          <NumberStepper value={limit} onChange={value => setFeatureLimits(prev => ({
                      ...prev,
                      [key]: value
                    }))} min={1} max={10000} step={1} disabled={!features[key] || saving} />
                          <Switch checked={Boolean(features[key])} onChange={checked => setFeatures(prev => ({
                      ...prev,
                      [key]: checked
                    }))} />
                        </div>
                      </div>;
              })}
                </div>
              </Card>
            </div>

            <div className={styles.columnCard}>
              <Card title={copy.journalTitle} fill>
                {usageRows.length === 0 ? <p className={ui.adminMutedText}>{copy.journalEmpty}</p> : <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>{copy.colWhen}</th>
                          <th>{copy.colFeature}</th>
                          <th>{copy.colUser}</th>
                          <th>{copy.colStatus}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageRows.map(row => <tr key={row.id}>
                            <td>{formatWhen(row.used_at, locale)}</td>
                            <td>{featureLabel(row.feature, copy)}</td>
                            <td>{row.user_name || copy.system}</td>
                            <td>
                              <span className={row.success ? styles.ok : styles.bad}>
                                {row.success ? copy.ok : copy.fail}
                              </span>
                              {!row.success && row.error_message ? <span className={styles.errHint} title={row.error_message}>
                                  <Icon icon="mdi:alert-circle-outline" aria-hidden />
                                </span> : null}
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>}
              </Card>
            </div>
          </div>
        </div>}
    </Page>;
}
