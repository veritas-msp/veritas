import React, { useMemo } from "react";
import asStyles from "./AntispamConfigModal.module.css";
import ManagedSolutionPickerModal from "./ManagedSolutionPickerModal";
import { getAntispamProvider } from "./antispamFormConfig";
import { formatAntispamSolutionSummary } from "./antispamSolutionUtils";
import { getProviderPresentation } from "./SolutionProviderIcon";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";

function formatLinkedSolutionsLabel(count) {
  if (count <= 1) return "1 solution liée";
  return `${count} solutions liées`;
}

function buildSolutionKey(solution, index) {
  if (solution.id != null) return `id:${solution.id}`;
  if (solution.item_key) return `key:${solution.item_key}`;
  return `idx:${index}`;
}

export default function AntispamSolutionPickerModal({
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
  return (
    <ManagedSolutionPickerModal
      open={open}
      client={client}
      items={solutions}
      onClose={onClose}
      dialogId="antispam-picker-title"
      eyebrow="Cybersécurité"
      viewTitle="Antispam"
      manageTitle="Antispam"
      headerIcon="mdi:email-search-outline"
      headerIconClassName={asStyles.headerIconAntispam}
      formatCountLabel={formatLinkedSolutionsLabel}
      getViewIntro={count =>
        count === 1
          ? "Une solution antispam est configurée pour ce client. Sélectionnez-la pour l’ouvrir, ou ajoutez-en une autre."
          : `${count} solutions antispam sont configurées. Sélectionnez-en une pour la consulter.`
      }
      getManageIntro={() =>
        "Réordonnez, modifiez ou supprimez les solutions antispam enregistrées pour ce client."
      }
      getItemKey={buildSolutionKey}
      getItemPresentation={solution => {
        const { label, mode, providerName, providerId } =
          formatAntispamSolutionSummary(solution);
        const isManual = !solution?.customerId && !solution?.mailinblackTenantId;
        const provider = getAntispamProvider(providerId);
        const visual = getProviderPresentation(provider, "mdi:email-secure-outline");
        const metaParts =
          providerId === "mailinblack" && label === providerName
            ? [mode]
            : [providerName, mode];
        return {
          ...visual,
          image: providerId === "mailinblack" ? "mailinblack.png" : visual.image,
          label,
          meta: metaParts.filter(Boolean).join(" · "),
          trailingIcon: isManual ? "mdi:cog-outline" : "mdi:chart-box-outline"
        };
      }}
      deleteConfirmTitle={configCopy.confirm.deleteConfiguration.title}
      getDeleteConfirmMessage={label =>
        interpolate(configCopy.confirm.deleteConfiguration.message, { label })
      }
      onSelectItem={onSelectSolution}
      onAddItem={onAddSolution}
      onEditItem={onEditSolution}
      onDeleteItem={onDeleteSolution}
      onReorderItems={onReorderSolutions}
      addAriaLabel="Ajouter une solution"
      addTitle="Ajouter une solution"
    />
  );
}
