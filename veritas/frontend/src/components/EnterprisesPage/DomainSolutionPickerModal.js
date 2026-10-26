import React, { useCallback, useMemo, useState } from "react";
import dnsStyles from "./DomainsConfigModal.module.css";
import pickerStyles from "./AntivirusSolutionPickerModal.module.css";
import ManagedSolutionPickerModal from "./ManagedSolutionPickerModal";
import { getDnsProvider } from "./dnsFormConfig";
import { formatDomainSummary, formatRenewalModeLabel, normalizeDomainItem, refreshMonitoredDomainsFromOvh } from "./domainSolutionUtils";
import { getProviderPresentation } from "./SolutionProviderIcon";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { showError, showSuccess } from "../../utils/toast";

const DOMAIN_TABLE_COLUMNS = [{
  key: "domain",
  label: "Nom de domaine",
  cellClassName: pickerStyles.tableDomainName
}, {
  key: "registrar",
  label: "Registrar"
}, {
  key: "expiry",
  label: "Expiration"
}, {
  key: "renewal",
  label: "Renouvellement"
}, {
  key: "dnsZone",
  label: "Zone DNS"
}, {
  key: "status",
  label: "Statut"
}];

function formatLinkedDomainsLabel(count) {
  if (count <= 1) return "1 domaine surveillé";
  return `${count} domaines surveillés`;
}

function buildDomainKey(domain, index) {
  const nom = (domain?.nom || domain?.name || "").trim().toLowerCase();
  return nom || `idx:${index}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("fr-FR");
  } catch {
    return "—";
  }
}

function getDomainStatus(expiration) {
  if (!expiration) {
    return {
      text: "Inconnu",
      className: pickerStyles.statusUnknown
    };
  }
  const expiryDate = new Date(expiration);
  if (Number.isNaN(expiryDate.getTime())) {
    return {
      text: "Inconnu",
      className: pickerStyles.statusUnknown
    };
  }
  const isExpired = expiryDate < new Date();
  return {
    text: isExpired ? "Expiré" : "Actif",
    className: isExpired ? pickerStyles.statusExpired : pickerStyles.statusActive
  };
}

function getDomainRenewal(domain) {
  if (domain?.renewalMode) {
    return {
      text: formatRenewalModeLabel(domain.renewalMode),
      className: domain.renewalMode === "automatic" ? pickerStyles.statusActive : pickerStyles.statusExpired
    };
  }
  const value = domain?.autoRenew ?? domain?.auto_renewal;
  if (value == null) {
    return {
      text: "—",
      className: pickerStyles.statusUnknown
    };
  }
  return {
    text: value ? "Auto" : "Manuel",
    className: value ? pickerStyles.statusActive : pickerStyles.statusExpired
  };
}

function buildDomainTableCells(domain) {
  const normalized = normalizeDomainItem(domain) || domain || {};
  const status = getDomainStatus(normalized.expiration || normalized.expirationDate || normalized.expirityDate);
  const renew = getDomainRenewal(normalized);
  const hasDns = Boolean(normalized.hasDnsZone || normalized.dnsZone);
  return {
    domain: normalized.nom || normalized.name || normalized.domain || "—",
    registrar: normalized.registrar || "—",
    expiry: formatDate(normalized.expiration || normalized.expirationDate || normalized.expirityDate),
    renewal: <span className={`${pickerStyles.statusBadge} ${renew.className}`}>{renew.text}</span>,
    dnsZone: hasDns ? <span className={`${pickerStyles.statusBadge} ${pickerStyles.statusActive}`}>OVH</span> : "—",
    status: <span className={`${pickerStyles.statusBadge} ${status.className}`}>{status.text}</span>
  };
}

function getDomainTableSortValue(domain, columnKey) {
  const normalized = normalizeDomainItem(domain) || domain || {};
  const expiration = normalized.expiration || normalized.expirationDate || normalized.expirityDate || null;
  switch (columnKey) {
    case "domain":
      return (normalized.nom || normalized.name || normalized.domain || "").toLowerCase();
    case "registrar":
      return (normalized.registrar || "").toLowerCase();
    case "expiry":
      {
        if (!expiration) return null;
        const date = new Date(expiration);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    case "renewal":
      return getDomainRenewal(normalized).text.toLowerCase();
    case "dnsZone":
      return Boolean(normalized.hasDnsZone || normalized.dnsZone) ? 1 : 0;
    case "status":
      return getDomainStatus(expiration).text.toLowerCase();
    default:
      return undefined;
  }
}

function isIntegrationLinkedDomain(domain) {
  const normalized = normalizeDomainItem(domain);
  return normalized?.providerId === "ovh";
}

export default function DomainSolutionPickerModal({
  open,
  client,
  domains = [],
  onClose,
  onSelectDomain,
  onAddDomain,
  onEditDomain,
  onDeleteDomain,
  onReorderDomains,
  onDomainsSynced
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  const [syncing, setSyncing] = useState(false);
  const canRefreshFromIntegration = useMemo(() => (domains || []).some(isIntegrationLinkedDomain), [domains]);
  const handleRefreshFromIntegration = useCallback(async () => {
    if (!client?.id || !canRefreshFromIntegration || syncing) return;
    setSyncing(true);
    try {
      const updated = await refreshMonitoredDomainsFromOvh(client.id);
      showSuccess("Noms de domaine synchronisés depuis OVH.");
      await onDomainsSynced?.(updated);
    } catch (error) {
      showError(error?.message || "Échec de la synchronisation OVH.");
    } finally {
      setSyncing(false);
    }
  }, [canRefreshFromIntegration, client?.id, onDomainsSynced, syncing]);
  return (
    <ManagedSolutionPickerModal
      open={open}
      client={client}
      items={domains}
      onClose={onClose}
      dialogId="domain-picker-title"
      eyebrow="Services · Domaines"
      viewTitle="Noms de domaine"
      manageTitle="Noms de domaine"
      headerIcon="stash:domain"
      headerIconClassName={dnsStyles.headerIconDns}
      layout="table"
      tableColumns={DOMAIN_TABLE_COLUMNS}
      getTableCells={buildDomainTableCells}
      getTableSortValue={getDomainTableSortValue}
      formatCountLabel={formatLinkedDomainsLabel}
      getViewIntro={count =>
        count === 1
          ? "Un nom de domaine est surveillé pour ce client. Ouvrez-le pour consulter le tableau de bord, ou ajoutez-en d’autres."
          : `${count} noms de domaine sont surveillés. Sélectionnez-en un pour le consulter.`
      }
      getManageIntro={() =>
        "Réordonnez, modifiez ou retirez les noms de domaine enregistrés pour ce client."
      }
      getItemKey={buildDomainKey}
      getItemPresentation={domain => {
        const { label, meta, providerId } = formatDomainSummary(domain);
        const provider = getDnsProvider(providerId);
        const visual = getProviderPresentation(provider, "stash:domain");
        return {
          ...visual,
          label,
          meta,
          trailingIcon: "mdi:chart-box-outline"
        };
      }}
      deleteConfirmTitle={configCopy.confirm.removeMonitoring.title}
      confirmDeleteLabel={common.remove}
      getDeleteConfirmMessage={label =>
        interpolate(configCopy.confirm.removeMonitoringReversible.message, { label })
      }
      onSelectItem={onSelectDomain}
      onAddItem={onAddDomain}
      onEditItem={onEditDomain}
      onDeleteItem={onDeleteDomain}
      onReorderItems={onReorderDomains}
      onRefreshIntegration={handleRefreshFromIntegration}
      canRefreshIntegration={canRefreshFromIntegration}
      refreshIntegrationBusy={syncing}
      refreshIntegrationLabel="Synchroniser avec OVH"
      refreshIntegrationTitle="Actualiser les domaines depuis l’intégration OVH"
      addAriaLabel="Ajouter un domaine"
      addTitle="Ajouter un domaine"
    />
  );
}
