import { useState } from "react";
import AdminEnterpriseModels from "./AdminEnterpriseModels";
import { Page, Card, Btn } from "./AdminUi";
import { useAdminClientsCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { UiKitPageHero } from "../UiKit";
import { getAdminPanelCopy } from "./adminPanelI18n";
export default function AdminClients() {
  const locale = useAppLocale();
  const copy = useAdminClientsCopy();
  const heroCopy = getAdminPanelCopy(locale).items.clients;
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(false);
  return <Page>
      <UiKitPageHero title={heroCopy.label} subtitle={heroCopy.description} icon="mdi:office-building-outline" />
      <Card title={copy.page.title} description={copy.page.description} action={<Btn icon="mdi:refresh" onClick={() => setRefreshToken(token => token + 1)} disabled={loading}>
            {copy.page.refresh}
          </Btn>} noPadding fill>
        <AdminEnterpriseModels refreshToken={refreshToken} onLoadingChange={setLoading} />
      </Card>
    </Page>;
}
