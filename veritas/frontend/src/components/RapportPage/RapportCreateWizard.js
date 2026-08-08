import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { REPORT_TYPE_IDS } from "./reportTypeConstants";
import styles from "./RapportCreateWizard.module.css";
function getClientName(client, copy) {
  return client?.name || client?.nom || copy.create.getClientLabel(client?.id);
}
function getClientInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}
function getEquipmentTotal(client) {
  const counts = client?.equipmentCounts || {};
  return Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
}
function getMonitoringServicesCount(client) {
  const modules = client?.modules_monitoring || {};
  return Object.values(modules).filter(Boolean).length;
}
function getContractBadge(client, copy) {
  const recap = copy.recap;
  const suspended = client?.contrat?.suspendu;
  const expiration = client?.contrat?.expiration;
  if (suspended) {
    return {
      label: recap.contractSuspended,
      tone: "warn"
    };
  }
  if (!expiration) {
    return {
      label: recap.contractUnknown,
      tone: "muted"
    };
  }
  const exp = new Date(expiration);
  if (Number.isNaN(exp.getTime())) {
    return {
      label: recap.contractUnknown,
      tone: "muted"
    };
  }
  const now = new Date();
  if (exp < now) {
    return {
      label: recap.contractExpired,
      tone: "danger"
    };
  }
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (days <= 30) {
    return {
      label: recap.contractExpiringSoon,
      tone: "warn"
    };
  }
  return {
    label: recap.contractActive,
    tone: "ok"
  };
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
  onSelectReportType,
  onStartReport
}) {
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
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
      const commercial = String(client.commercial || "").toLowerCase();
      return name.includes(query) || number.includes(query) || commercial.includes(query);
    });
  }, [clients, copy, enterpriseSearch]);
  useEffect(() => {
    if (!selectedClientId) return;
    const stillVisible = filteredClients.some(client => String(client.id) === String(selectedClientId));
    if (!stillVisible) onSelectClient("");
  }, [filteredClients, onSelectClient, selectedClientId]);
  const wizard = copy.wizard;
  const handlePickClient = client => {
    onSelectClient(String(client.id), getClientName(client, copy));
    onStepChange("type");
  };
  const handlePickReportType = typeId => {
    if (typeId !== REPORT_TYPE_IDS.INTERVENTION) return;
    onSelectReportType(typeId);
    onStartReport(typeId);
  };
  return <div className={styles.wizard}>
      {step === "client" ? <section className={`${styles.panel} ${styles.clientStepPanel}`}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>{wizard.clientTitle}</h2>
            <p className={styles.panelHint}>{wizard.clientHint}</p>
          </header>

          <div className={styles.clientSearchBar}>
            <Icon icon="mdi:magnify" className={styles.clientSearchIcon} aria-hidden />
            <input id="rapport-enterprise-search" type="search" className={styles.clientSearchInput} placeholder={copy.create.enterpriseSearch} autoComplete="off" value={enterpriseSearch} onChange={event => setEnterpriseSearch(event.target.value)} disabled={loading} />
            {enterpriseSearch ? <button type="button" className={styles.clientSearchClear} onClick={() => setEnterpriseSearch("")} aria-label={wizard.clearSearchAria}>
                <Icon icon="mdi:close" aria-hidden />
              </button> : null}
            <span className={styles.clientSearchMeta}>
              {loading ? wizard.loadingClients : wizard.formatResultsCount(filteredClients.length, clients.length)}
            </span>
          </div>

          {loading ? <div className={styles.clientGridSkeleton} aria-hidden>
              {Array.from({
          length: 6
        }).map((_, index) => <div key={index} className={styles.clientCardSkeleton} />)}
            </div> : filteredClients.length === 0 ? <div className={styles.clientEmptyState}>
              <Icon icon="mdi:office-building-remove-outline" aria-hidden />
              <p>{copy.create.noEnterprise}</p>
              {enterpriseSearch ? <button type="button" className={styles.clientEmptyReset} onClick={() => setEnterpriseSearch("")}>
                  {wizard.clearSearch}
                </button> : null}
            </div> : <div className={styles.clientGrid} role="listbox" aria-label={wizard.clientGridAria}>
              {filteredClients.map(client => {
          const name = getClientName(client, copy);
          const clientNumber = client.client_number || client.clientNumber;
          const contractBadge = getContractBadge(client, copy);
          const equipmentTotal = getEquipmentTotal(client);
          const servicesCount = getMonitoringServicesCount(client);
          return <button key={client.id} type="button" role="option" className={styles.clientCard} onClick={() => handlePickClient(client)}>
                    <div className={styles.clientCardTop}>
                      <div className={styles.clientAvatar} aria-hidden>
                        {getClientInitials(name)}
                      </div>
                      <span className={`${styles.clientContractBadge} ${styles[`clientContractBadge_${contractBadge.tone}`]}`}>
                        {contractBadge.label}
                      </span>
                    </div>

                    <div className={styles.clientCardBody}>
                      <h3 className={styles.clientCardName}>{name}</h3>
                      {clientNumber ? <p className={styles.clientCardNumber}>
                          {copy.recap.clientNumber} · {clientNumber}
                        </p> : null}
                      {client.commercial ? <p className={styles.clientCardCommercial}>{client.commercial}</p> : null}
                    </div>

                    <div className={styles.clientCardStats}>
                      <span className={styles.clientCardStat}>
                        <Icon icon="mdi:devices" aria-hidden />
                        {wizard.formatDevices(equipmentTotal)}
                      </span>
                      <span className={styles.clientCardStat}>
                        <Icon icon="mdi:chart-timeline-variant" aria-hidden />
                        {wizard.formatServices(servicesCount)}
                      </span>
                    </div>
                  </button>;
        })}
            </div>}
        </section> : null}

      {step === "type" ? <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div className={styles.typeHeaderRow}>
              <div>
                <h2 className={styles.panelTitle}>{wizard.typeTitle}</h2>
                <p className={styles.panelHint}>{wizard.typeHint}</p>
              </div>
              {selectedClient ? <div className={styles.selectedClientChip}>
                  <Icon icon="mdi:briefcase-outline" aria-hidden />
                  <span>{getClientName(selectedClient, copy)}</span>
                </div> : null}
            </div>
          </header>

          <div className={styles.typeGrid}>
            {reportTypes.map(type => {
          const isAvailable = type.id === REPORT_TYPE_IDS.INTERVENTION;
          return <button key={type.id} type="button" className={`${styles.typeCard} ${!isAvailable ? styles.typeCardDisabled : ""}`.trim()} disabled={!isAvailable} onClick={() => handlePickReportType(type.id)}>
                  <div className={styles.typeCardIcon}>
                    <Icon icon={type.icon} />
                  </div>
                  <span className={styles.typeCardTitle}>{type.title}</span>
                  <p className={styles.typeCardDescription}>{type.description}</p>
                  {!isAvailable ? <span className={styles.typeCardBadge}>{copy.create.badgeSoon}</span> : null}
                </button>;
        })}
          </div>

          <div className={`${styles.panelActions} ${styles.panelActionsStart}`}>
            <button type="button" className={styles.secondaryBtn} onClick={() => onStepChange("client")}>
              <Icon icon="mdi:arrow-left" aria-hidden />
              {wizard.back}
            </button>
          </div>
        </section> : null}
    </div>;
}
