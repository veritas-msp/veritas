import { useEffect, useMemo, useState } from "react";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { Page, SubTabs } from "./AdminUi";
import AdminSystemNotifications from "./AdminSystemNotifications";
import AdminNotificationCatalog from "./AdminNotificationCatalog";
import AdminNotificationTemplates from "./AdminNotificationTemplates";
import AdminNotificationLogs from "./AdminNotificationLogs";
import AdminWebhooksSettings from "./AdminWebhooksSettings";
import { getAdminNotificationCenterCopy } from "./adminNotificationCenterI18n";
import hubStyles from "./AdminNotificationsHub.module.css";

const HUB_VIEW_DEFS = [{
  key: "system",
  icon: "mdi:email-edit-outline",
  promoKey: "adminNotifications",
  proOnly: false
}, {
  key: "catalog",
  icon: "mdi:tune-variant",
  promoKey: "adminNotifications",
  proOnly: false
}, {
  key: "templates",
  icon: "mdi:file-document-edit-outline",
  promoKey: "adminNotifications",
  proOnly: false
}, {
  key: "connectors",
  icon: "mdi:link-variant",
  promoKey: "adminWebhooks",
  proOnly: true
}, {
  key: "logs",
  icon: "mdi:clipboard-text-clock-outline",
  promoKey: "adminNotifications",
  proOnly: false
}];

function normalizeHubView(view) {
  if (view === "webhooks") return "connectors";
  if (view === "events" || view === "inapp") return "system";
  if (view === "templates" || view === "connectors" || view === "logs" || view === "catalog" || view === "system") return view;
  return "system";
}

export default function AdminNotificationsHub({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const hubCopy = useMemo(() => getAdminNotificationCenterCopy(locale), [locale]);
  const [activeView, setActiveView] = useState("system");
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const views = useMemo(() => HUB_VIEW_DEFS.map(view => ({
    ...view,
    label: hubCopy.tabs[view.key],
    proOnly: isCommunity && Boolean(view.proOnly)
  })), [hubCopy, isCommunity]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("veritas_admin_hub_view");
      if (!raw) return;
      sessionStorage.removeItem("veritas_admin_hub_view");
      const parsed = JSON.parse(raw);
      if (parsed?.hub !== "notifications" || !parsed?.view) return;
      setActiveView(normalizeHubView(parsed.view));
    } catch {}
  }, []);
  const handleViewChange = key => {
    const view = HUB_VIEW_DEFS.find(item => item.key === key);
    if (isCommunity && view?.proOnly) {
      setProPromoFeature(view.promoKey);
      return;
    }
    setActiveView(key);
  };
  return <Page>
      <SubTabs items={views} active={activeView} onChange={handleViewChange} fullWidth />
      <div className={hubStyles.panel} data-page-fill>
        {activeView === "system" ? <AdminSystemNotifications /> : null}
        {activeView === "catalog" ? <AdminNotificationCatalog /> : null}
        {activeView === "templates" ? <AdminNotificationTemplates /> : null}
        {activeView === "connectors" ? <AdminWebhooksSettings isCommunity={isCommunity} /> : null}
        {activeView === "logs" ? <AdminNotificationLogs /> : null}
      </div>
      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </Page>;
}
