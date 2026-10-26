import React, { useMemo } from "react";
import msStyles from "./MicrosoftTenantConfigModal.module.css";
import ManagedSolutionPickerModal from "./ManagedSolutionPickerModal";
import { formatMicrosoftTenantSummary } from "./microsoftTenantSolutionUtils";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";

function formatLinkedTenantsLabel(count) {
  if (count <= 1) return "1 tenant lié";
  return `${count} tenants liés`;
}

function buildTenantKey(tenant, index) {
  if (tenant?.id != null) return `id:${tenant.id}`;
  if (tenant?.tenantId) return `tenant:${tenant.tenantId}`;
  return `idx:${index}`;
}

export default function MicrosoftTenantSolutionPickerModal({
  open,
  client,
  tenants = [],
  onClose,
  onSelectTenant,
  onAddTenant,
  onEditTenant,
  onDeleteTenant
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  return (
    <ManagedSolutionPickerModal
      open={open}
      client={client}
      items={tenants}
      onClose={onClose}
      dialogId="microsoft-tenant-picker-title"
      eyebrow="Services"
      viewTitle="Tenant Microsoft"
      manageTitle="Tenant Microsoft"
      headerIcon="hugeicons:office-365"
      headerIconClassName={msStyles.headerIconMicrosoft}
      formatCountLabel={formatLinkedTenantsLabel}
      getViewIntro={count =>
        count === 1
          ? "Un tenant Microsoft est configuré pour ce client. Sélectionnez-le pour l’ouvrir, ou ajoutez-en un autre."
          : `${count} tenants Microsoft sont configurés. Sélectionnez-en un pour le consulter.`
      }
      getManageIntro={() =>
        "Modifiez ou supprimez les tenants Microsoft enregistrés pour ce client."
      }
      getItemKey={buildTenantKey}
      getItemPresentation={tenant => {
        const { label, mode, providerName, shortTenantId } = formatMicrosoftTenantSummary(
          tenant,
          client
        );
        return {
          icon: "hugeicons:office-365",
          label,
          meta: [providerName, mode, shortTenantId].filter(Boolean).join(" · "),
          trailingIcon: "mdi:chart-box-outline"
        };
      }}
      deleteConfirmTitle={
        configCopy.confirm.deleteMicrosoftTenant?.title ||
        configCopy.confirm.deleteConfiguration.title
      }
      getDeleteConfirmMessage={label =>
        interpolate(
          configCopy.confirm.deleteMicrosoftTenant?.message ||
            configCopy.confirm.deleteConfiguration.message,
          { label }
        )
      }
      onSelectItem={onSelectTenant}
      onAddItem={onAddTenant}
      onEditItem={onEditTenant}
      onDeleteItem={onDeleteTenant}
      addAriaLabel="Ajouter un tenant"
      addTitle="Ajouter un tenant"
    />
  );
}
