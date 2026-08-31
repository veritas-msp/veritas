import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchTickets } from "../../api/tickets";
import { fetchMonitoringDocuments } from "../../api/monitoringDocuments";
import { fetchClientGeneral } from "../../api/clients";
import { normalizeClientSites } from "../../utils/clientSites";
import { getReportTypeLabel } from "./rapportPageI18n";
import ReportEnterpriseRecap from "./RapportEnterpriseRecap";
import styles from "./RapportCreateWizard.module.css";

function getClientName(client, copy) {
  return client?.name || client?.nom || copy.create.getClientLabel(client?.id);
}

function isActiveDocument(doc) {
  return !doc?.is_trashed && !doc?.isTrashed && !doc?.trashed && !doc?.deleted;
}

function formatDateTime(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(locale || undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDocumentAuthor(doc) {
  return doc?.username || doc?.user_email || "";
}

function getDocumentReportType(doc) {
  const data = doc?.data && typeof doc.data === "object" ? doc.data : {};
  const config = doc?.config && typeof doc.config === "object" ? doc.config : {};
  return data.reportType || config.reportType || data.type || config.type || "";
}

export default function ReportCreateWizard({
  copy,
  reportTypes,
  clients,
  loading,
  step,
  onStepChange,
  selectedClientId,
  onSelectClient,
  onStartReport
}) {
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [openTicketCount, setOpenTicketCount] = useState(null);
  const [openTicketLoading, setOpenTicketLoading] = useState(false);
  const [clientSites, setClientSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [recentDocs, setRecentDocs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const selectedClient = clients.find(client => String(client.id) === String(selectedClientId)) || null;
  const filteredClients = useMemo(() => {
    const query = enterpriseSearch.trim().toLowerCase();
    const sorted = [...clients].sort((left, right) => getClientName(left, copy).localeCompare(getClientName(right, copy), undefined, {
      sensitivity: "base"
    }));
    if (!query) return sorted;
    return sorted.filter(client => {
      const name = getClientName(client, copy).toLowerCase();
      const number = String(client.client_number || client.clientNumber || "").toLowerCase();
      return name.includes(query) || number.includes(query);
    });
  }, [clients, copy, enterpriseSearch]);
  const showClientList = !selectedClient || Boolean(enterpriseSearch.trim());
  const selectedClientName = selectedClient ? getClientName(selectedClient, copy) : "";
  const visibleDocs = useMemo(() => {
    if (!selectedClientName) return recentDocs;
    const needle = selectedClientName.trim().toLowerCase();
    return recentDocs.filter(doc => String(doc.client_name || "").trim().toLowerCase() === needle);
  }, [recentDocs, selectedClientName]);
  useEffect(() => {
    if (step === "type" && !selectedClientId) onStepChange("client");
  }, [onStepChange, selectedClientId, step]);
  useEffect(() => {
    const ac = new AbortController();
    setRecentLoading(true);
    fetchMonitoringDocuments({
      signal: ac.signal
    }).then(docs => {
      if (ac.signal.aborted) return;
      setRecentDocs((Array.isArray(docs) ? docs : []).filter(isActiveDocument));
    }).catch(err => {
      if (err?.name === "AbortError") return;
      setRecentDocs([]);
    }).finally(() => {
      if (!ac.signal.aborted) setRecentLoading(false);
    });
    return () => ac.abort();
  }, []);
  useEffect(() => {
    if (!selectedClientId) {
      setOpenTicketCount(null);
      setOpenTicketLoading(false);
      setClientSites([]);
      setSitesLoading(false);
      return;
    }
    const ac = new AbortController();
    setOpenTicketLoading(true);
    setSitesLoading(true);
    fetchTickets({
      clientId: selectedClientId,
      includeClosed: false,
      limit: 200
    }, {
      signal: ac.signal
    }).then(rows => {
      if (ac.signal.aborted) return;
      const list = Array.isArray(rows) ? rows : rows?.tickets || [];
      setOpenTicketCount(list.length);
    }).catch(err => {
      if (err?.name === "AbortError") return;
      setOpenTicketCount(null);
    }).finally(() => {
      if (!ac.signal.aborted) setOpenTicketLoading(false);
    });
    fetchClientGeneral(selectedClientId, {
      signal: ac.signal
    }).then(general => {
      if (ac.signal.aborted) return;
      setClientSites(normalizeClientSites(general?.sites));
    }).catch(err => {
      if (err?.name === "AbortError") return;
      setClientSites([]);
    }).finally(() => {
      if (!ac.signal.aborted) setSitesLoading(false);
    });
    return () => ac.abort();
  }, [selectedClientId]);
  const wizard = copy.wizard;
  const recentCopy = copy.recent || {};
  const handlePickClient = client => {
    onSelectClient(String(client.id));
    setEnterpriseSearch("");
  };
  const handleChangeClient = () => {
    onSelectClient("");
    onStepChange("client");
    setEnterpriseSearch("");
  };
  const handleContinue = () => {
    if (!selectedClientId) return;
    onStepChange("type");
  };
  const handleRecentClick = doc => {
    const needle = String(doc?.client_name || "").trim().toLowerCase();
    if (!needle) return;
    const match = clients.find(client => getClientName(client, copy).trim().toLowerCase() === needle);
    if (!match) return;
    onSelectClient(String(match.id));
    setEnterpriseSearch("");
    onStepChange("client");
  };
  return <div className={styles.picker} data-guide="report-wizard">
      <nav className={styles.steps} aria-label={wizard.progressAria} data-guide="report-steps">
        <span className={`${styles.step} ${step === "client" ? styles.stepActive : styles.stepDone}`}>
          <span className={styles.stepIndex}>1</span>
          {wizard.stepClient}
        </span>
        <span className={styles.stepRule} aria-hidden />
        <span className={`${styles.step} ${step === "type" ? styles.stepActive : ""}`}>
          <span className={styles.stepIndex}>2</span>
          {wizard.stepType}
        </span>
      </nav>

      {step === "client" ? <section className={styles.stageSplit} data-guide="report-client">
          <div className={styles.stageLeft}>
            <header className={styles.stageHeader}>
              <h2 className={styles.stageTitle}>{wizard.clientTitle}</h2>
              <p className={styles.stageHint}>{wizard.clientHint}</p>
            </header>

            <label className={styles.search} htmlFor="rapport-enterprise-search">
              <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
              <input id="rapport-enterprise-search" type="search" className={styles.searchInput} placeholder={copy.create.enterpriseSearch} autoComplete="off" value={enterpriseSearch} onChange={event => setEnterpriseSearch(event.target.value)} disabled={loading} />
              {enterpriseSearch ? <button type="button" className={styles.searchClear} onClick={() => setEnterpriseSearch("")} aria-label={wizard.clearSearchAria}>
                  <Icon icon="mdi:close" aria-hidden />
                </button> : null}
            </label>

            {showClientList ? loading ? <div className={styles.list} aria-hidden>
                  {Array.from({
            length: 6
          }).map((_, index) => <div key={index} className={styles.rowSkeleton} />)}
                </div> : filteredClients.length === 0 ? <div className={styles.empty}>
                  <p>{copy.create.noEnterprise}</p>
                  {enterpriseSearch ? <button type="button" className={styles.textBtn} onClick={() => setEnterpriseSearch("")}>
                      {wizard.clearSearch}
                    </button> : null}
                </div> : <div className={styles.list} role="listbox" aria-label={wizard.clientGridAria}>
                  {filteredClients.map(client => {
            const name = getClientName(client, copy);
            const clientNumber = client.client_number || client.clientNumber;
            const selected = String(client.id) === String(selectedClientId);
            return <button key={client.id} type="button" role="option" aria-selected={selected} className={`${styles.row} ${selected ? styles.rowSelected : ""}`.trim()} onClick={() => handlePickClient(client)}>
                        <span className={styles.rowMain}>
                          <span className={styles.rowName}>{name}</span>
                          {clientNumber ? <span className={styles.rowMeta}>{clientNumber}</span> : null}
                        </span>
                        <Icon icon="mdi:chevron-right" className={styles.rowChevron} aria-hidden />
                      </button>;
          })}
                </div> : null}

            {selectedClient && !showClientList ? <>
                <div className={styles.recapScroll}>
                  <ReportEnterpriseRecap client={selectedClient} copy={copy} openTicketCount={openTicketCount} openTicketLoading={openTicketLoading} sites={clientSites} sitesLoading={sitesLoading} embedded onChangeClient={handleChangeClient} changeLabel={wizard.changeClient} />
                </div>
                <button type="button" className={styles.continueBtn} onClick={handleContinue}>
                  {wizard.formatContinueWith(selectedClientName)}
                  <Icon icon="mdi:arrow-right" aria-hidden />
                </button>
              </> : null}
          </div>

          <aside className={styles.stageRight} data-guide="report-recent">
            <header className={styles.recentHeader}>
              <h2 className={styles.recentTitle}>{recentCopy.title}</h2>
              <p className={styles.recentHint}>{selectedClient ? recentCopy.hintClient : recentCopy.hint}</p>
            </header>
            {recentLoading ? <div className={styles.recentList} aria-hidden>
                {Array.from({
            length: 5
          }).map((_, index) => <div key={index} className={styles.recentSkeleton} />)}
              </div> : visibleDocs.length === 0 ? <div className={styles.recentEmpty}>
                <Icon icon="mdi:file-document-outline" aria-hidden />
                <p>{selectedClient ? recentCopy.emptyClient : recentCopy.empty}</p>
              </div> : <ul className={styles.recentList}>
                {visibleDocs.slice(0, 12).map(doc => {
            const author = getDocumentAuthor(doc);
            const typeLabel = getReportTypeLabel(copy, getDocumentReportType(doc));
            const hasTypedReport = Boolean(getDocumentReportType(doc));
            return <li key={doc.id}>
                      <button type="button" className={styles.recentItem} onClick={() => handleRecentClick(doc)} aria-label={recentCopy.openAria}>
                        <span className={styles.recentItemTop}>
                          <span className={styles.recentName}>{doc.name || "—"}</span>
                          {hasTypedReport ? <span className={styles.recentType}>{typeLabel}</span> : null}
                        </span>
                        <span className={styles.recentMeta}>
                          {!selectedClient && doc.client_name ? <span>{doc.client_name}</span> : null}
                          {author ? <span>{recentCopy.author} {author}</span> : null}
                          <span>{recentCopy.created} {formatDateTime(doc.created_at, copy.bcp47)}</span>
                          {doc.report_period ? <span>{doc.report_period}</span> : null}
                        </span>
                      </button>
                    </li>;
          })}
              </ul>}
          </aside>
        </section> : null}

      {step === "type" ? <section className={`${styles.stage} ${styles.stageTypes}`} data-guide="report-types">
          <header className={styles.stageHeaderRow}>
            <div className={styles.stageHeader}>
              <h2 className={styles.stageTitle}>{wizard.typeTitle}</h2>
              <p className={styles.stageHint}>{wizard.typeHint}</p>
            </div>
            {selectedClient ? <button type="button" className={styles.clientChip} onClick={handleChangeClient}>
                <span>{getClientName(selectedClient, copy)}</span>
                <span className={styles.clientChipAction}>{wizard.changeClient}</span>
              </button> : null}
          </header>

          <div className={styles.typeGrid} role="list">
            {reportTypes.map(type => {
              const comingSoon = Boolean(type.comingSoon);
              return <button
                  key={type.id}
                  type="button"
                  role="listitem"
                  className={`${styles.typeCard} ${comingSoon ? styles.typeCardSoon : ""}`}
                  disabled={comingSoon}
                  aria-disabled={comingSoon || undefined}
                  onClick={() => {
                    if (!comingSoon) onStartReport(type.id);
                  }}
                >
                <span className={styles.typeCardTop}>
                  <span className={`${styles.typeCardIcon} ${comingSoon ? styles.typeCardIconSoon : ""}`} aria-hidden>
                    <Icon icon={type.icon} />
                  </span>
                  {comingSoon ? <span className={styles.typeCardBadge}>{copy.create.badgeSoon}</span> : null}
                </span>
                <span className={styles.typeCardTitle}>{type.title}</span>
                <span className={styles.typeCardDescription}>{type.description}</span>
                {Array.isArray(type.steps) && type.steps.length > 0 ? <span className={styles.typeCardSteps}>
                    {type.steps.map(stepLabel => <span key={stepLabel}>{stepLabel}</span>)}
                  </span> : null}
                <span className={`${styles.typeCardAction} ${comingSoon ? styles.typeCardActionSoon : ""}`}>
                  {comingSoon ? copy.create.badgeSoon : wizard.startReport}
                  {comingSoon ? null : <Icon icon="mdi:arrow-right" aria-hidden />}
                </span>
              </button>;
            })}
          </div>

          <button type="button" className={styles.backBtn} onClick={() => onStepChange("client")}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {wizard.back}
          </button>
        </section> : null}
    </div>;
}
