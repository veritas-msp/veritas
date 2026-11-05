import { useState } from "react";
import AdminEnterpriseModels from "./AdminEnterpriseModels";
import { Btn } from "./AdminUi";
import { useAdminClientsCopy } from "../../hooks/useAdminCopy";
import AdminPlatformShell, { adminPlatformStyles as platform } from "./AdminPlatformShell";
import SettingsSection from "./AdminGeneralSettingsSection";

export default function AdminClients() {
  const copy = useAdminClientsCopy();
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <AdminPlatformShell>
      <SettingsSection
        title={copy.page.title}
        description={copy.page.description}
        icon="mdi:office-building-outline"
        action={
          <Btn icon="mdi:refresh" onClick={() => setRefreshToken(token => token + 1)} disabled={loading}>
            {copy.page.refresh}
          </Btn>
        }
      >
        <div className={platform.sectionBodyFlush || undefined} style={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column" }}>
          <AdminEnterpriseModels refreshToken={refreshToken} onLoadingChange={setLoading} />
        </div>
      </SettingsSection>
    </AdminPlatformShell>
  );
}
