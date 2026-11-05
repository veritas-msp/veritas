import { useMemo } from "react";
import MonitoringAlertRulesPanel from "../EquipementPage/SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { isAdminOrSuperAdminProfile } from "../../utils/profileProtection";
import { getAdminSupervisionAlertRulesCopy } from "./adminSupervisionAlertRulesI18n";
import AdminPlatformShell from "./AdminPlatformShell";
import AdminGeneralSettingsLoading from "./AdminGeneralSettingsLoading";

export default function AdminSupervisionAlertRules() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminSupervisionAlertRulesCopy(locale), [locale]);
  const { user } = useAuthContext();
  const { isAdmin, realIsAdmin, can } = usePermissions();
  const canManage =
    Boolean(realIsAdmin) ||
    Boolean(isAdmin) ||
    isAdminOrSuperAdminProfile(user?.profile) ||
    can("supervision.manage") ||
    can("admin_panel.supervision_alerts");
  const {
    rules,
    catalog,
    applyRules,
    loading
  } = useSupervisionAlertRules();

  return (
    <AdminPlatformShell fill loading={loading && !catalog} loadingMessage={copy.loading}>
      <MonitoringAlertRulesPanel
        catalog={catalog}
        rules={rules}
        isAdmin={canManage}
        onSaved={applyRules}
        flat
        pageTitle={copy.title}
        pageDescription={copy.subtitle}
        pageIcon="mdi:bell-alert-outline"
      />
    </AdminPlatformShell>
  );
}
