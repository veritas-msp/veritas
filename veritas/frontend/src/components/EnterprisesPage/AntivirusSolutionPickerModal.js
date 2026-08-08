import React, { useMemo } from "react";
import avStyles from "./AntivirusConfigModal.module.css";
import ManagedSolutionPickerModal from "./ManagedSolutionPickerModal";
import { getAntivirusProvider } from "./antivirusFormConfig";
import { formatAntivirusSolutionSummary } from "./antivirusSolutionUtils";
import { getProviderPresentation } from "./SolutionProviderIcon";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
function formatLinkedSolutionsLabel(count) {
  if (count <= 1) return "1 linked solution";
  return `${count} linked solutions`;
}
function buildSolutionKey(solution, index) {
  if (solution.companyId) {
    return `${solution.companyId}|${solution.mappingMode || "reseller"}|${solution.bitdefenderTenantId || ""}`;
  }
  return `manual-${solution.id ?? index}-${solution.solution || solution.nom || ""}`;
}
export default function AntivirusSolutionPickerModal({
  open,
  client,
  solutions = [],
  onClose,
  onSelectSolution,
  onAddSolution,
  onEditSolution,
  onDeleteSolution,
  onReorderSolutions
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  return <ManagedSolutionPickerModal open={open} client={client} items={solutions} onClose={onClose} dialogId="antivirus-picker-title" eyebrow="Cybersecurity" viewTitle="Antivirus" manageTitle="Antivirus" headerIcon="mdi:shield-search" headerIconClassName={avStyles.headerIconAntivirus} formatCountLabel={formatLinkedSolutionsLabel} getViewIntro={count => count === 1 ? "An antivirus solution is configured for this client. Select it to open, or add another." : `${count} antivirus solutions are configured. Select one to view.`} getManageIntro={() => "Reorder, edit or delete the saved antivirus solutions for this client."} getItemKey={buildSolutionKey} getItemPresentation={solution => {
    const {
      label,
      mode,
      providerName,
      providerId
    } = formatAntivirusSolutionSummary(solution);
    const isManual = providerId === "manual" || !solution?.companyId;
    const provider = getAntivirusProvider(providerId);
    const visual = getProviderPresentation(provider, "mdi:shield-bug-outline");
    return {
      ...visual,
      label,
      meta: `${providerName} · ${mode}`,
      trailingIcon: isManual ? "mdi:cog-outline" : "mdi:chart-box-outline"
    };
  }} deleteConfirmTitle={configCopy.confirm.deleteConfiguration.title} getDeleteConfirmMessage={label => interpolate(configCopy.confirm.deleteConfiguration.message, {
    label
  })} onSelectItem={onSelectSolution} onAddItem={onAddSolution} onEditItem={onEditSolution} onDeleteItem={onDeleteSolution} onReorderItems={onReorderSolutions} addAriaLabel="Add a solution" addTitle="Add a solution" />;
}
