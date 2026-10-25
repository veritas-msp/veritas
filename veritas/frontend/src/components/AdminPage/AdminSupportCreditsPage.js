import { Page } from "./AdminUi";
import AdminSupportCredits from "./AdminSupportCredits";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { UiKitPageHero } from "../UiKit";
import { getAdminPanelCopy } from "./adminPanelI18n";
export default function AdminSupportCreditsPage() {
  const locale = useAppLocale();
  const heroCopy = getAdminPanelCopy(locale).items["support-credits"];
  return <Page>
      <UiKitPageHero title={heroCopy.label} subtitle={heroCopy.description} icon="mdi:ticket-confirmation-outline" />
      <AdminSupportCredits />
    </Page>;
}
