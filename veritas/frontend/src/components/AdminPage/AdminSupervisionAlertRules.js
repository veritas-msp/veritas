import { useMemo } from "react";
import { Page } from "./AdminUi";
import ui from "./AdminUi.module.css";
import MonitoringAlertRulesPanel from "../EquipementPage/SupervisionAlertRulesPanel";
import { useSupervisionAlertRules } from "../../hooks/useSupervisionAlertRules";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { isAdminOrSuperAdminProfile } from "../../utils/profileProtection";
import { getAdminSupervisionAlertRulesCopy } from "./adminSupervisionAlertRulesI18n";

export default function AdminSupervisionAlertRules() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminSupervisionAlertRulesCopy(locale), [locale]);
  const { user } = useAuthContext();
  const { isAdmin } = usePermissions();
  const canManage = isAdmin || isAdminOrSuperAdminProfile(user?.profile);
  const {
    rules,
    catalog,
    applyRules,
    loading
  } = useSupervisionAlertRules();

  return (
    <Page>
      {loading && !catalog ? (
        <p className={ui.adminMutedText}>{copy.loading}</p>
      ) : (
        <MonitoringAlertRulesPanel
          catalog={catalog}
          rules={rules}
          isAdmin={canManage}
          onSaved={applyRules}
        />
      )}
    </Page>
  );
}
