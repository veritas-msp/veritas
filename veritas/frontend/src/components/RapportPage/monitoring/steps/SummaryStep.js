import React, { useMemo } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import ReportSummaryInfrastructure from "../ReportSummary/ReportSummaryInfrastructure";
import ReportSummaryCybersecurity from "../ReportSummary/ReportSummaryCybersecurity";
import ReportSummaryServices from "../ReportSummary/ReportSummaryServices";
import ReportSummarySupport from "../ReportSummary/ReportSummarySupport";
import styles from "../RapportMonitoringBuilder.module.css";
import { isMonitoringStepEnabled } from "../MonitoringSteps";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function renderTextWithLinks(value) {
  const text = String(value || "");
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function SummaryChapter({ id, kicker, title, subtitle, tone, children }) {
  return (
    <section id={id} className={`${styles.summaryChapter} ${tone || ""}`.trim()}>
      <header className={styles.summaryChapterHead}>
        <span className={styles.summaryChapterKicker}>{kicker}</span>
        <div>
          <h3 className={styles.summaryChapterTitle}>{title}</h3>
          {subtitle ? <p className={styles.summaryChapterSubtitle}>{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export default function SummaryStep({
  client,
  equipmentCheckMKData = {},
  allComments = [],
  equipmentComments = {},
  equipmentCommentCounts = {},
  equipmentTicketCounts = {},
  stockageReportState = null,
  summaryContentRef = null
}) {
  const chapters = useMemo(() => {
    if (!client) return [];
    const items = [];
    if (["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"].some(stepKey => isMonitoringStepEnabled(client, stepKey))) {
      items.push({
        id: "rapport-infrastructure",
        kicker: "01",
        title: "Infrastructure",
        subtitle: "Liaisons, serveurs, stockage, switchs et Wi-Fi — état du parc sur la période.",
        tone: styles.summaryChapterInfra,
        tocIcon: "mdi:lan"
      });
    }
    if (["Backup", "Antivirus", "Antispam"].some(stepKey => isMonitoringStepEnabled(client, stepKey))) {
      items.push({
        id: "rapport-cybersecurite",
        kicker: String(items.length + 1).padStart(2, "0"),
        title: "Cybersécurité",
        subtitle: "Sauvegardes, antivirus et antispam — couverture et activité.",
        tone: styles.summaryChapterCyber,
        tocIcon: "mdi:shield-lock-outline"
      });
    }
    if (["Office365", "NDD"].some(stepKey => isMonitoringStepEnabled(client, stepKey))) {
      items.push({
        id: "rapport-services",
        kicker: String(items.length + 1).padStart(2, "0"),
        title: "Services",
        subtitle: "Microsoft 365 et noms de domaine — licences, usage et échéances.",
        tone: styles.summaryChapterServices,
        tocIcon: "mdi:cloud-outline"
      });
    }
    items.push({
      id: "rapport-support",
      kicker: String(items.length + 1).padStart(2, "0"),
      title: "Support technique",
      subtitle: "Tickets de la période, catégories, matériel concerné, contrat et SLA.",
      tone: styles.summaryChapterSupport,
      tocIcon: "mdi:headset"
    });
    items.push({
      id: "rapport-notes",
      kicker: String(items.length + 1).padStart(2, "0"),
      title: "Notes du rapport",
      subtitle: "Commentaires ajoutés pendant la construction du rapport.",
      tone: styles.summaryChapterNotes,
      tocIcon: "mdi:comment-text-multiple-outline"
    });
    return items;
  }, [client]);

  if (!client) {
    return (
      <div className={styles.summaryDocument}>
        <p>Sélectionnez un client pour afficher le rapport.</p>
      </div>
    );
  }

  const startLabel = formatDate(client.reportStartDate);
  const endLabel = formatDate(client.reportEndDate);
  const periodLabel = startLabel && endLabel ? `Du ${startLabel} au ${endLabel}` : "";
  const clientNumber = client?.code || client?.numeroClient || client?.id;
  const rawLabel = client?.name || client?.nom || clientNumber || "";
  const match = rawLabel.match(/^(\d{2,})-\s*(.*)$/);
  const clientPrefix = match ? match[1] : "";
  const clientMainLabel = match ? match[2] || rawLabel : rawLabel;
  const comments = Array.isArray(allComments) ? allComments : [];

  const hasInfra = chapters.some(c => c.id === "rapport-infrastructure");
  const hasCyber = chapters.some(c => c.id === "rapport-cybersecurite");
  const hasServices = chapters.some(c => c.id === "rapport-services");

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    const root = summaryContentRef?.current || null;
    window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollingElement = document.scrollingElement || document.documentElement || document.body;
    if (scrollingElement && typeof scrollingElement.scrollTo === "function") {
      scrollingElement.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (root && root.parentElement) {
      let parent = root.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style?.overflowY || "";
        const isScrollable = (overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight;
        if (isScrollable) {
          parent.scrollTo({ top: 0, behavior: "smooth" });
          break;
        }
        parent = parent.parentElement;
      }
    }
  };

  return (
    <div className={styles.summaryDocument}>
      <header className={styles.summaryCover} data-export-hide="true">
        <p className={styles.summaryCoverBrand}>Rapport de supervision</p>
        <h2 className={styles.summaryClientTitle}>
          {clientPrefix ? <span className={styles.summaryClientNumber}>{clientPrefix}&nbsp;</span> : null}
          {clientMainLabel}
        </h2>
        {periodLabel ? <p className={styles.summaryPeriodSubtitle}>{periodLabel}</p> : null}
        <p className={styles.summaryCoverLead}>
          Document unique destiné au client : infrastructure, cybersécurité, services cloud et activité support sur la période.
        </p>
      </header>

      <div ref={summaryContentRef} className={styles.summaryExportRoot}>
        <nav className={styles.summaryToc} aria-label="Sommaire du rapport">
          {chapters.map(chapter => (
            <a key={chapter.id} className={styles.summaryTocLink} href={`#${chapter.id}`}>
              <IconifyIcon icon={chapter.tocIcon} width={16} height={16} aria-hidden />
              <span>{chapter.title}</span>
            </a>
          ))}
        </nav>

        {hasInfra ? (
          <SummaryChapter
            id="rapport-infrastructure"
            kicker={chapters.find(c => c.id === "rapport-infrastructure")?.kicker}
            title="Infrastructure"
            subtitle="Liaisons, serveurs, stockage, switchs et Wi-Fi — état du parc sur la période."
            tone={styles.summaryChapterInfra}
          >
            <ReportSummaryInfrastructure
              client={client}
              equipmentCheckMKData={equipmentCheckMKData}
              equipmentComments={equipmentComments}
              equipmentCommentCounts={equipmentCommentCounts}
              equipmentTicketCounts={equipmentTicketCounts}
              stockageReportState={stockageReportState}
            />
          </SummaryChapter>
        ) : null}

        {hasCyber ? (
          <SummaryChapter
            id="rapport-cybersecurite"
            kicker={chapters.find(c => c.id === "rapport-cybersecurite")?.kicker}
            title="Cybersécurité"
            subtitle="Sauvegardes, antivirus et antispam — couverture et activité."
            tone={styles.summaryChapterCyber}
          >
            <ReportSummaryCybersecurity
              client={client}
              equipmentCheckMKData={equipmentCheckMKData}
              equipmentComments={equipmentComments}
              equipmentCommentCounts={equipmentCommentCounts}
              equipmentTicketCounts={equipmentTicketCounts}
            />
          </SummaryChapter>
        ) : null}

        {hasServices ? (
          <SummaryChapter
            id="rapport-services"
            kicker={chapters.find(c => c.id === "rapport-services")?.kicker}
            title="Services"
            subtitle="Microsoft 365 et noms de domaine — licences, usage et échéances."
            tone={styles.summaryChapterServices}
          >
            <ReportSummaryServices
              client={client}
              equipmentComments={equipmentComments}
              equipmentCommentCounts={equipmentCommentCounts}
              equipmentTicketCounts={equipmentTicketCounts}
            />
          </SummaryChapter>
        ) : null}

        <SummaryChapter
          id="rapport-support"
          kicker={chapters.find(c => c.id === "rapport-support")?.kicker}
          title="Support technique"
          subtitle="Tickets de la période, catégories, matériel concerné, contrat et SLA."
          tone={styles.summaryChapterSupport}
        >
          <ReportSummarySupport client={client} />
        </SummaryChapter>

        <section id="rapport-notes" className={`${styles.summaryChapter} ${styles.summaryChapterNotes}`} data-export-comments="true">
          <header className={styles.summaryChapterHead}>
            <span className={styles.summaryChapterKicker}>{chapters.find(c => c.id === "rapport-notes")?.kicker}</span>
            <div>
              <h3 className={styles.summaryChapterTitle}>Notes du rapport</h3>
              <p className={styles.summaryChapterSubtitle}>Commentaires ajoutés pendant la construction du rapport.</p>
            </div>
          </header>
          {comments.length > 0 ? (
            <div className={styles.reportCommentsList}>
              {comments.map(comment => {
                const isEquipment = comment.scope === "equipment";
                let moduleLabel = "";
                let equipmentLabel = "";
                if (isEquipment && comment.moduleKey) moduleLabel = `[${comment.moduleKey}]`;
                if (isEquipment && comment.referenceLabel) {
                  const parts = String(comment.referenceLabel).split("·");
                  equipmentLabel = parts[parts.length - 1].trim();
                }
                const linkedLabel = isEquipment
                  ? [moduleLabel, equipmentLabel].filter(Boolean).join(" ") || "Équipement"
                  : "Note générale";
                const dateLabel = comment.createdAt ? new Date(comment.createdAt).toLocaleString("fr-FR") : "";
                return (
                  <article
                    key={isEquipment ? `eq-${comment.equipmentKey}-${comment.id}` : `gen-${comment.id}`}
                    className={styles.reportCommentCard}
                  >
                    <div className={styles.reportCommentMeta}>
                      {dateLabel ? `${dateLabel} — ${linkedLabel}` : linkedLabel}
                    </div>
                    <div className={styles.reportCommentBody}>
                      {renderTextWithLinks(comment.text || comment.content || "")}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.reportCommentsEmpty}>Aucune note ajoutée pour cette période.</div>
          )}
        </section>
      </div>

      <button type="button" className={styles.scrollTopButton} data-export-hide="true" onClick={scrollToTop} aria-label="Haut du rapport">
        ↑
      </button>
    </div>
  );
}
