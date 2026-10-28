import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { fetchClientSupportCredits } from "../../../../api/clients";
import { isDateWithinPeriod } from "../supervisionReportBuilder";
import { buildSummarySnapshot } from "./summaryData";
import { fetchSupportSummary } from "./summarySupport";
import ReportSummarySupervision from "../ReportSummary/ReportSummarySupervision";
import ReportSummaryBackup from "../ReportSummary/ReportSummaryBackup";
import ReportSummaryServicesCyber from "../ReportSummary/ReportSummaryServicesCyber";
import { useFinderNavIndicator } from "../../../UiKit";
import styles from "./SummaryStep.module.css";

const REPORT_TABS = [
  { id: "supervision", title: "Supervision" },
  { id: "sauvegarde", title: "Sauvegardes" },
  { id: "services", title: "Services" }
];

function creditsConsumedInPeriod(ledger = [], start, end) {
  if (!Array.isArray(ledger) || !ledger.length) return 0;
  return ledger.reduce((sum, entry) => {
    const kind = String(entry?.kind || "").toLowerCase();
    if (kind !== "debit") return sum;
    if (!isDateWithinPeriod(entry?.created_at || entry?.createdAt, start, end)) return sum;
    const delta = Number(entry?.delta);
    if (!Number.isFinite(delta)) return sum;
    return sum + Math.abs(delta);
  }, 0);
}

export default function SummaryStep({
  client,
  equipmentCheckMKData = {},
  monitoringSyncStatus = {},
  allComments = [],
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  equipmentAlertCounts = {},
  summaryContentRef = null
}) {
  const [supportStats, setSupportStats] = useState(null);
  const [credits, setCredits] = useState(null);
  const [activeReport, setActiveReport] = useState("supervision");
  const [contentEnter, setContentEnter] = useState(true);
  const [indicatorMotion, setIndicatorMotion] = useState(false);
  const [customSynthesis, setCustomSynthesis] = useState({
    supervision: null,
    sauvegarde: null,
    microsoft: null,
    antispam: null,
    antivirus: null,
    domains: null
  });

  const clientKey = client?.id ?? client?.uuid ?? "";

  useEffect(() => {
    setCustomSynthesis({
      supervision: null,
      sauvegarde: null,
      microsoft: null,
      antispam: null,
      antivirus: null,
      domains: null
    });
  }, [clientKey]);

  const { trackRef: toggleTrackRef, indicator: toggleIndicator } = useFinderNavIndicator([
    activeReport,
    REPORT_TABS.length
  ]);

  const indicatorReady =
    toggleIndicator.ready && toggleIndicator.width >= 48 && toggleIndicator.height >= 20;

  useEffect(() => {
    if (!indicatorReady) {
      setIndicatorMotion(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setIndicatorMotion(true));
    return () => cancelAnimationFrame(id);
  }, [indicatorReady]);

  useLayoutEffect(() => {
    setContentEnter(false);
  }, [activeReport]);

  useEffect(() => {
    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      // Double rAF : commit opacity:0 avant le fade (comme MonitoringSteps).
      innerId = requestAnimationFrame(() => {
        if (cancelled) return;
        setContentEnter(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [activeReport]);

  useEffect(() => {
    if (!client) {
      setSupportStats(null);
      setCredits(null);
      return undefined;
    }
    const controller = new AbortController();
    const clientId = client?.id ?? client?.uuid;
    fetchSupportSummary(client, controller.signal).then(setSupportStats);
    if (clientId) {
      fetchClientSupportCredits(clientId, { signal: controller.signal })
        .then(setCredits)
        .catch(() => setCredits(null));
    }
    return () => controller.abort();
  }, [client]);

  const snapshot = useMemo(
    () =>
      buildSummarySnapshot({
        client,
        equipmentCheckMKData,
        monitoringSyncStatus,
        equipmentCommentCounts,
        equipmentTicketCounts,
        equipmentAlertCounts,
        allComments
      }),
    [
      client,
      equipmentCheckMKData,
      monitoringSyncStatus,
      equipmentCommentCounts,
      equipmentTicketCounts,
      equipmentAlertCounts,
      allComments
    ]
  );

  if (!client) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>Sélectionnez un client pour afficher la synthèse.</p>
      </div>
    );
  }

  const consumedOnPeriod = creditsConsumedInPeriod(
    credits?.ledger,
    client?.reportStartDate,
    client?.reportEndDate
  );

  return (
    <div className={styles.root} ref={summaryContentRef}>
      <div
        ref={toggleTrackRef}
        className={`${styles.reportToggle}${indicatorMotion ? ` ${styles.reportToggleAnimated}` : ""}`}
        role="tablist"
        aria-label="Rapports de synthèse"
        data-export-hide="true"
      >
        {indicatorReady ? (
          <div
            className={styles.reportToggleIndicator}
            style={{
              transform: `translate3d(${toggleIndicator.left}px, ${toggleIndicator.top}px, 0)`,
              width: toggleIndicator.width || undefined,
              height: toggleIndicator.height || undefined
            }}
            aria-hidden
          />
        ) : null}
        {REPORT_TABS.map(tab => {
          const active = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={`${styles.reportToggleBtn} ${active ? styles.reportToggleBtnActive : ""}`.trim()}
              onClick={() => setActiveReport(tab.id)}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      <div className={styles.reportStack}>
        <div
          className={`${styles.reportFade} ${
            contentEnter ? styles.reportFadeIn : styles.reportFadePending
          }`.trim()}
        >
          <article
            className={`${styles.reportDoc} ${activeReport === "supervision" ? styles.reportDocActive : styles.reportDocHidden}`.trim()}
            data-report-export="supervision"
            data-report-title="Rapport de supervision"
            aria-hidden={activeReport !== "supervision"}
          >
            <div className={styles.exportRoot}>
              <ReportSummarySupervision
                snapshot={snapshot}
                supportStats={supportStats}
                credits={credits}
                consumedOnPeriod={consumedOnPeriod}
                reportStartDate={client?.reportStartDate}
                reportEndDate={client?.reportEndDate}
                synthesisHtml={customSynthesis.supervision}
                onSynthesisChange={html =>
                  setCustomSynthesis(prev => ({ ...prev, supervision: html }))
                }
              />
            </div>
          </article>

          <article
            className={`${styles.reportDoc} ${activeReport === "sauvegarde" ? styles.reportDocActive : styles.reportDocHidden}`.trim()}
            data-report-export="sauvegarde"
            data-report-title="Rapport sauvegardes"
            aria-hidden={activeReport !== "sauvegarde"}
          >
            <div className={styles.exportRoot}>
            <ReportSummaryBackup
              client={client}
              comments={snapshot?.comments || []}
              synthesisHtml={customSynthesis.sauvegarde}
              onSynthesisChange={html =>
                setCustomSynthesis(prev => ({ ...prev, sauvegarde: html }))
              }
            />
            </div>
          </article>

          <article
            className={`${styles.reportDoc} ${activeReport === "services" ? styles.reportDocActive : styles.reportDocHidden}`.trim()}
            data-report-export="services"
            data-report-title="Rapport services"
            aria-hidden={activeReport !== "services"}
          >
            <div className={styles.exportRoot}>
              <ReportSummaryServicesCyber
                client={client}
                reportStartDate={client?.reportStartDate}
                reportEndDate={client?.reportEndDate}
                synthesisByService={{
                  microsoft: customSynthesis.microsoft,
                  antispam: customSynthesis.antispam,
                  antivirus: customSynthesis.antivirus,
                  domains: customSynthesis.domains
                }}
                onSynthesisChange={(serviceKey, html) =>
                  setCustomSynthesis(prev => ({ ...prev, [serviceKey]: html }))
                }
              />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
