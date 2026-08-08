import { useEffect, useMemo, useState } from "react";
import ProFeaturePromoModal from "../Misc/ProFeature/ProFeaturePromoModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { Page, SubTabs } from "./AdminUi";
import AdminNotificationsSettings from "./AdminNotificationsSettings";
import AdminWebhooksSettings from "./AdminWebhooksSettings";
import AdminInAppNotificationsSettings from "./AdminInAppNotificationsSettings";
import { getAdminNotificationsHubCopy } from "./adminNotificationsHubI18n";
const HUB_VIEW_DEFS = [{
  key: "inapp",
  icon: "mdi:bell-badge-outline",
  promoKey: "adminNotifications",
  proOnly: false
}, {
  key: "events",
  icon: "mdi:flash-outline",
  promoKey: "adminNotifications",
  proOnly: true
}, {
  key: "webhooks",
  icon: "mdi:link-variant",
  promoKey: "adminWebhooks",
  proOnly: true
}];
export default function AdminNotificationsHub({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const hubCopy = useMemo(() => getAdminNotificationsHubCopy(locale), [locale]);
  const [activeView, setActiveView] = useState("inapp");
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
      const view = parsed.view === "webhooks" ? "webhooks" : parsed.view === "events" ? "events" : "inapp";
      setActiveView(view);
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
      {activeView === "events" ? <AdminNotificationsSettings isCommunity={isCommunity} /> : null}
      {activeView === "inapp" ? <AdminInAppNotificationsSettings /> : null}
      {activeView === "webhooks" ? <AdminWebhooksSettings isCommunity={isCommunity} /> : null}
      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />
    </Page>;
}
