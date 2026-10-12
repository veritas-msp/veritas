import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageSkeleton from "../Misc/Skeleton/PageSkeleton";
import styles from "./RapportCreateWizard.module.css";

function getClientName(client, copy) {
  return client?.name || client?.nom || copy.create.getClientLabel(client?.id);
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
  selectedReportTypeId,
  onSelectType,
  onStartReport
}) {
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const selectedType = reportTypes.find(type => type.id === selectedReportTypeId) || null;
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

  useEffect(() => {
    if (step === "client" && !selectedReportTypeId) onStepChange("type");
  }, [onStepChange, selectedReportTypeId, step]);

  const wizard = copy.wizard;

  const handlePickType = type => {
    if (type.comingSoon) return;
    onSelectType?.(type.id);
    setEnterpriseSearch("");
    onStepChange("client");
  };

  const handlePickClient = client => {
    const clientId = String(client.id);
    onSelectClient(clientId);
    setEnterpriseSearch("");
    if (selectedReportTypeId) onStartReport(selectedReportTypeId, clientId);
  };

  return <div className={styles.picker} data-guide="report-wizard">
      <nav className={styles.steps} aria-label={wizard.progressAria} data-guide="report-steps">
        <span className={`${styles.step} ${step === "type" ? styles.stepActive : styles.stepDone}`}>
          <span className={styles.stepIndex}>1</span>
          {wizard.stepType}
        </span>
        <span className={styles.stepRule} aria-hidden />
        <span className={`${styles.step} ${step === "client" ? styles.stepActive : ""}`}>
          <span className={styles.stepIndex}>2</span>
          {wizard.stepClient}
        </span>
      </nav>

      {step === "type" ? <section className={styles.stage} data-guide="report-types">
          <header className={styles.stageHeader}>
            <h2 className={styles.stageTitle}>{wizard.typeTitle}</h2>
            <p className={styles.stageHint}>{wizard.typeHint}</p>
          </header>

          <div className={styles.typeGrid} role="list">
            {reportTypes.map(type => {
          const comingSoon = Boolean(type.comingSoon);
          const selected = type.id === selectedReportTypeId;
          return <button key={type.id} type="button" role="listitem" className={`${styles.typeCard} ${comingSoon ? styles.typeCardSoon : ""} ${selected ? styles.typeCardSelected : ""}`.trim()} disabled={comingSoon} aria-disabled={comingSoon || undefined} aria-pressed={selected || undefined} onClick={() => handlePickType(type)}>
                {comingSoon ? <span className={styles.typeSoonBadge}>{copy.create.badgeSoon}</span> : null}
                <span className={styles.typeIcon} aria-hidden>
                  <Icon icon={type.icon || "mdi:file-document-outline"} />
                </span>
                <span className={styles.typeBody}>
                  <span className={styles.typeTitle}>{type.title}</span>
                  {type.description ? <span className={styles.typeDesc}>{type.description}</span> : null}
                </span>
                {!comingSoon ? <Icon icon="mdi:chevron-right" className={styles.typeChevron} aria-hidden /> : null}
              </button>;
        })}
          </div>
        </section> : null}

      {step === "client" ? <section className={styles.stage} data-guide="report-client">
          <header className={styles.stageHeader}>
            <h2 className={styles.stageTitle}>{wizard.clientTitle}</h2>
            <p className={styles.stageHint}>{wizard.clientHint}</p>
            {selectedType ? <button type="button" className={styles.clientChip} onClick={() => onStepChange("type")}>
                <Icon icon={selectedType.icon || "mdi:file-document-outline"} className={styles.clientChipIcon} aria-hidden />
                <span className={styles.clientChipName}>{selectedType.title}</span>
                <span className={styles.clientChipAction}>{wizard.changeType || wizard.changeClient}</span>
              </button> : null}
          </header>

          <label className={styles.search} htmlFor="rapport-enterprise-search">
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input id="rapport-enterprise-search" type="search" className={styles.searchInput} placeholder={copy.create.enterpriseSearch} autoComplete="off" value={enterpriseSearch} onChange={event => setEnterpriseSearch(event.target.value)} disabled={loading} />
            {enterpriseSearch ? <button type="button" className={styles.searchClear} onClick={() => setEnterpriseSearch("")} aria-label={wizard.clearSearchAria}>
                <Icon icon="mdi:close" aria-hidden />
              </button> : null}
          </label>

          {loading ? (
            <PageSkeleton variant="list" rows={8} label={copy.loadingClients || wizard?.loadingClients} />
          ) : filteredClients.length === 0 ? <div className={styles.empty}>
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
                    <span className={styles.rowName}>{name}</span>
                    {clientNumber ? <span className={styles.rowNumber}>{clientNumber}</span> : null}
                    <Icon icon="mdi:chevron-right" className={styles.rowChevron} aria-hidden />
                  </button>;
          })}
            </div>}

          <button type="button" className={styles.backBtn} onClick={() => onStepChange("type")}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {wizard.back}
          </button>
        </section> : null}
    </div>;
}
