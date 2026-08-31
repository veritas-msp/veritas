import React, { useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import ReportSummaryInfrastructure from "../ReportSummary/ReportSummaryInfrastructure";
import ReportSummaryCybersecurity from "../ReportSummary/ReportSummaryCybersecurity";
import ReportSummaryServices from "../ReportSummary/ReportSummaryServices";
import ReportSummarySupport from "../ReportSummary/ReportSummarySupport";
import styles from "../RapportMonitoringBuilder.module.css";
import { isMonitoringStepEnabled } from "../MonitoringSteps";
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
  const [activeTab, setActiveTab] = useState("overview");
  const renderTextWithLinks = value => {
    const text = String(value || "");
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0;
        return <a key={idx} href={part} target="_blank" rel="noopener noreferrer" style={{
          textDecoration: "underline"
        }}>
            {part}
          </a>;
      }
      return <span key={idx}>{part}</span>;
    });
  };
  if (!client) {
    return <div style={{
      marginTop: "1.5rem"
    }}>
        <p>Select a client to display the report summary.</p>
      </div>;
  }
  const formatDate = value => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("fr-FR");
  };
  const startLabel = formatDate(client.reportStartDate);
  const endLabel = formatDate(client.reportEndDate);
  const periodLabel = startLabel && endLabel ? `Période du rapport : ${startLabel} → ${endLabel}` : "";
  const clientNumber = client?.code || client?.numeroClient || client?.id;
  const rawLabel = client?.name || client?.nom || clientNumber || "";
  const match = rawLabel.match(/^(\d{2,})-\s*(.*)$/);
  const clientPrefix = match ? match[1] : "";
  const clientMainLabel = match ? match[2] || rawLabel : rawLabel;
  const hasInfra = ["Internet", "Firewall", "Servers", "Storage", "Switch", "BorneWifi", "TOIP"].some(stepKey => isMonitoringStepEnabled(client, stepKey));
  const hasCyber = ["Backup", "Antivirus", "Antispam"].some(stepKey => isMonitoringStepEnabled(client, stepKey));
  const hasServices = ["Office365", "NDD"].some(stepKey => isMonitoringStepEnabled(client, stepKey));
  const availableTabs = ["overview"];
  if (hasInfra) availableTabs.push("infra");
  if (hasCyber) availableTabs.push("cyber");
  if (hasServices) availableTabs.push("services");
  availableTabs.push("support");
  const fallbackTab = availableTabs[0] || null;
  const currentTab = availableTabs.includes(activeTab) ? activeTab : fallbackTab;
  return <div style={{
    marginTop: "1.5rem"
  }}>
      <div className={styles.summaryHeader}>
        <h2 className={styles.summaryClientTitle}>
          {clientPrefix && <span className={styles.summaryClientNumber}>{clientPrefix}&nbsp;</span>}
          {clientMainLabel}
        </h2>
        {periodLabel && <p className={styles.summaryPeriodSubtitle}>{periodLabel}</p>}
      </div>

      <div className={styles.summaryReportWrapper}>
        <div className={styles.summaryReportSeparator} />
        {availableTabs.length > 0 && <div className={styles.summaryTabs}>
            <button type="button" className={`${styles.summaryTab} ${styles.summaryTabInfra} ${currentTab === "overview" ? styles.summaryTabActive : ""}`} onClick={() => setActiveTab("overview")}>
                RAPPORT DE SUPERVISION
              </button>
            {hasInfra && <button type="button" className={`${styles.summaryTab} ${styles.summaryTabInfra} ${currentTab === "infra" ? styles.summaryTabActive : ""}`} onClick={() => setActiveTab("infra")}>
                INFRASTRUCTURE
              </button>}
            {hasCyber && <button type="button" className={`${styles.summaryTab} ${styles.summaryTabCyber} ${currentTab === "cyber" ? styles.summaryTabActive : ""}`} onClick={() => setActiveTab("cyber")}>
                CYBERSÉCURITÉ
              </button>}
            {hasServices && <button type="button" className={`${styles.summaryTab} ${styles.summaryTabServices} ${currentTab === "services" ? styles.summaryTabActive : ""}`} onClick={() => setActiveTab("services")}>
                SERVICES
              </button>}
            <button type="button" className={`${styles.summaryTab} ${styles.summaryTabSupport} ${currentTab === "support" ? styles.summaryTabActive : ""}`} onClick={() => setActiveTab("support")}>
                SUPPORT
              </button>
          </div>}
        <div className={`${styles.summaryReportTitle} ${currentTab === "cyber" ? styles.summaryReportCyber : currentTab === "services" ? styles.summaryReportServices : currentTab === "support" ? styles.summaryReportSupport : styles.summaryReportInfra}`}>
          {currentTab === "overview" && "RAPPORT DE SUPERVISION"}
          {currentTab === "infra" && "RAPPORT INFRASTRUCTURE"}
          {currentTab === "cyber" && "RAPPORT CYBERSÉCURITÉ"}
          {currentTab === "services" && "RAPPORT SERVICES"}
          {currentTab === "support" && "RAPPORT SUPPORT"}
        </div>
      </div>

      <div style={{
      marginTop: "1.5rem"
    }} ref={summaryContentRef}>
        <div data-export-section="supervision" style={{
        display: currentTab === "overview" ? "block" : "none"
      }}>
          <p style={{
          margin: "0 0 1rem",
          color: "#4b5563",
          fontSize: "0.95rem"
        }}>
            Synthèse unique couvrant l’infrastructure, la continuité, la cybersécurité, les services cloud,
            les tickets support et les alertes de supervision sur la période sélectionnée.
          </p>
          {hasInfra && <ReportSummaryInfrastructure client={client} equipmentCheckMKData={equipmentCheckMKData} equipmentComments={equipmentComments} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} stockageReportState={stockageReportState} />}
          {hasCyber && <div style={{
          marginTop: "1.5rem"
        }}>
              <ReportSummaryCybersecurity client={client} equipmentCheckMKData={equipmentCheckMKData} equipmentComments={equipmentComments} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} />
            </div>}
          {hasServices && <div style={{
          marginTop: "1.5rem"
        }}>
              <ReportSummaryServices client={client} equipmentComments={equipmentComments} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} />
            </div>}
        </div>
        {hasInfra && <div data-export-section="infrastructure" style={{
        display: currentTab === "infra" ? "block" : "none"
      }}>
            <ReportSummaryInfrastructure client={client} equipmentCheckMKData={equipmentCheckMKData} equipmentComments={equipmentComments} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} stockageReportState={stockageReportState} />
          </div>}
        {hasCyber && <div data-export-section="cybersecurite" style={{
        display: currentTab === "cyber" ? "block" : "none"
      }}>
            <ReportSummaryCybersecurity client={client} equipmentCheckMKData={equipmentCheckMKData} equipmentComments={equipmentComments} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} />
          </div>}
        {hasServices && <div data-export-section="services" style={{
        display: currentTab === "services" ? "block" : "none"
      }}>
            <ReportSummaryServices client={client} equipmentComments={equipmentComments} equipmentCommentCounts={equipmentCommentCounts} equipmentTicketCounts={equipmentTicketCounts} />
          </div>}
        <div data-export-section="support" style={{
        display: currentTab === "support" ? "block" : "none"
      }}>
            <ReportSummarySupport client={client} />
          </div>

        <section className={styles.reportCommentsContainer} data-export-comments="true">
          <div className={styles.reportCommentsHeader}>
            <IconifyIcon icon="mdi:comment-text-multiple-outline" width={20} height={20} />
            <h4 className={styles.reportCommentsTitle}>Commentaires du rapport</h4>
          </div>

          {Array.isArray(allComments) && allComments.length > 0 ? <div className={styles.reportCommentsList}>
              {allComments.map(comment => {
            const isEquipment = comment.scope === "equipment";
            let moduleLabel = "";
            let equipmentLabel = "";
            if (isEquipment && comment.moduleKey) {
              moduleLabel = `[${comment.moduleKey}]`;
            }
            if (isEquipment && comment.referenceLabel) {
              const ref = String(comment.referenceLabel);
              const parts = ref.split("·");
              equipmentLabel = parts[parts.length - 1].trim();
            }
            const contextLabel = [moduleLabel, equipmentLabel].filter(Boolean).join(" ");
            const linkedLabel = isEquipment ? contextLabel || "Périphérique" : "Commentaire général";
            const dateLabel = comment.createdAt ? new Date(comment.createdAt).toLocaleString("fr-FR") : "";
            return <article key={isEquipment ? `eq-${comment.equipmentKey}-${comment.id}` : `gen-${comment.id}`} className={styles.reportCommentCard}>
                    <div className={styles.reportCommentMeta}>
                      {dateLabel} - {linkedLabel}
                    </div>
                    <div className={styles.reportCommentBody}>
                      {renderTextWithLinks(comment.text || comment.content || "")}
                    </div>
                  </article>;
          })}
            </div> : <div className={styles.reportCommentsEmpty}>
              Aucun commentaire ajouté pour cette période.
            </div>}
        </section>
      </div>

      <button type="button" className={styles.scrollTopButton} onClick={() => {
      if (typeof window === "undefined") return;
      const root = summaryContentRef?.current || null;
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      const scrollingElement = document.scrollingElement || document.documentElement || document.body;
      if (scrollingElement && typeof scrollingElement.scrollTo === "function") {
        scrollingElement.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
      if (root && root.parentElement) {
        let parent = root.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          const overflowY = style?.overflowY || "";
          const isScrollable = (overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight;
          if (isScrollable) {
            parent.scrollTo({
              top: 0,
              behavior: "smooth"
            });
            break;
          }
          parent = parent.parentElement;
        }
      }
    }} aria-label="Back to top of report">
        ↑
      </button>
    </div>;
}
