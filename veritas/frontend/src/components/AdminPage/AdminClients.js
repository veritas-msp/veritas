import { useState } from "react";
import AdminEnterpriseModels from "./AdminEnterpriseModels";
import { Page, Card, Btn } from "./AdminUi";
import { useAdminClientsCopy } from "../../hooks/useAdminCopy";
export default function AdminClients() {
  const copy = useAdminClientsCopy();
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(false);
  return <Page>
      <Card title={copy.page.title} description={copy.page.description} action={<Btn icon="mdi:refresh" onClick={() => setRefreshToken(token => token + 1)} disabled={loading}>
            {copy.page.refresh}
          </Btn>} noPadding fill>
        <AdminEnterpriseModels refreshToken={refreshToken} onLoadingChange={setLoading} />
      </Card>
    </Page>;
}
