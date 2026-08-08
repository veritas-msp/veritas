import React, { useMemo } from "react";
import dnsStyles from "./DomainsConfigModal.module.css";
import ManagedSolutionPickerModal from "./ManagedSolutionPickerModal";
import { getDnsProvider } from "./dnsFormConfig";
import { formatDomainSummary } from "./domainSolutionUtils";
import { getProviderPresentation } from "./SolutionProviderIcon";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
function formatLinkedDomainsLabel(count) {
  if (count <= 1) return "1 monitored domain";
  return `${count} monitored domains`;
}
function buildDomainKey(domain, index) {
  const nom = (domain?.nom || domain?.name || "").trim().toLowerCase();
  return nom || `idx:${index}`;
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
  onReorderDomains
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const common = useCommonCopy();
  return <ManagedSolutionPickerModal open={open} client={client} items={domains} onClose={onClose} dialogId="domain-picker-title" eyebrow="Licenses & abonnements" viewTitle="Domain Names" manageTitle="Domain Names" headerIcon="stash:domain" headerIconClassName={dnsStyles.headerIconDns} formatCountLabel={formatLinkedDomainsLabel} getViewIntro={count => count === 1 ? "One domain name is monitored for this client. Open it to view the dashboard, or add more." : `${count} domain names are monitored. Select one to view.`} getManageIntro={() => "Reorder, edit or remove the domain names saved for this client."} getItemKey={buildDomainKey} getItemPresentation={domain => {
    const {
      label,
      meta,
      providerId
    } = formatDomainSummary(domain);
    const provider = getDnsProvider(providerId);
    const visual = getProviderPresentation(provider, "stash:domain");
    return {
      ...visual,
      label,
      meta,
      trailingIcon: "mdi:chart-box-outline"
    };
  }} deleteConfirmTitle={configCopy.confirm.removeMonitoring.title} confirmDeleteLabel={common.remove} getDeleteConfirmMessage={label => interpolate(configCopy.confirm.removeMonitoringReversible.message, {
    label
  })} onSelectItem={onSelectDomain} onAddItem={onAddDomain} onEditItem={onEditDomain} onDeleteItem={onDeleteDomain} onReorderItems={onReorderDomains} addAriaLabel="Add a domain" addTitle="Add a domain" />;
}
