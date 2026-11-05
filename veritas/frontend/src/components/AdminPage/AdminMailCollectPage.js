import { useEffect, useMemo, useState } from "react";
import AdminCollectorsSettings from "./AdminCollectorsSettings";
import AdminEmailIngestionSettings from "./AdminEmailIngestionSettings";
import AdminMailCollectOptionsSettings from "./AdminMailCollectOptionsSettings";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminMailCollectCopy } from "./adminMailCollectI18n";
import AdminPlatformShell from "./AdminPlatformShell";
import hubStyles from "./AdminNotificationsHub.module.css";

const HUB_VIEW_DEFS = [{
  key: "collectors",
  icon: "mdi:inbox-multiple-outline"
}, {
  key: "email-ingestion",
  icon: "mdi:filter-variant"
}, {
  key: "mail-collect-options",
  icon: "mdi:cog-outline"
}];

export default function AdminMailCollectPage({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminMailCollectCopy(locale), [locale]);
  const hubViews = useMemo(() => HUB_VIEW_DEFS.map(def => ({
    key: def.key,
    label: copy.tabs[def.key],
    icon: def.icon
  })), [copy.tabs]);
  const [activeView, setActiveView] = useState("collectors");
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("veritas_admin_hub_view");
      if (!raw) return;
      sessionStorage.removeItem("veritas_admin_hub_view");
      const parsed = JSON.parse(raw);
      if (parsed?.hub !== "mail-collect" || !parsed?.view) return;
      const allowed = new Set(HUB_VIEW_DEFS.map(item => item.key));
      setActiveView(allowed.has(parsed.view) ? parsed.view : "collectors");
    } catch {}
  }, []);

  return <AdminPlatformShell tabs={hubViews} activeTab={activeView} onTabChange={setActiveView} tabsAriaLabel={copy.tabs.collectors}>
      <div className={hubStyles.panel} data-page-fill>
        {activeView === "collectors" ? <AdminCollectorsSettings isCommunity={isCommunity} /> : null}
        {activeView === "email-ingestion" ? <AdminEmailIngestionSettings isCommunity={isCommunity} /> : null}
        {activeView === "mail-collect-options" ? <AdminMailCollectOptionsSettings /> : null}
      </div>
    </AdminPlatformShell>;
}
