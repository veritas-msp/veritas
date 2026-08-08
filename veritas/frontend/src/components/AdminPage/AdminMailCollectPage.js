import { useEffect, useMemo, useState } from "react";
import { Page, SubTabs } from "./AdminUi";
import AdminCollectorsSettings from "./AdminCollectorsSettings";
import AdminEmailIngestionSettings from "./AdminEmailIngestionSettings";
import AdminMailCollectOptionsSettings from "./AdminMailCollectOptionsSettings";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminMailCollectCopy } from "./adminMailCollectI18n";
const HUB_VIEW_KEYS = ["collectors", "email-ingestion", "mail-collect-options"];
export default function AdminMailCollectPage({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminMailCollectCopy(locale), [locale]);
  const hubViews = useMemo(() => HUB_VIEW_KEYS.map(key => ({
    key,
    label: copy.tabs[key]
  })), [copy.tabs]);
  const [activeView, setActiveView] = useState("collectors");
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("veritas_admin_hub_view");
      if (!raw) return;
      sessionStorage.removeItem("veritas_admin_hub_view");
      const parsed = JSON.parse(raw);
      if (parsed?.hub !== "mail-collect" || !parsed?.view) return;
      const allowed = new Set(HUB_VIEW_KEYS);
      setActiveView(allowed.has(parsed.view) ? parsed.view : "collectors");
    } catch {}
  }, []);
  return <Page>
      <SubTabs items={hubViews} active={activeView} onChange={setActiveView} />
      {activeView === "collectors" ? <AdminCollectorsSettings isCommunity={isCommunity} /> : null}
      {activeView === "email-ingestion" ? <AdminEmailIngestionSettings isCommunity={isCommunity} /> : null}
      {activeView === "mail-collect-options" ? <AdminMailCollectOptionsSettings /> : null}
    </Page>;
}
