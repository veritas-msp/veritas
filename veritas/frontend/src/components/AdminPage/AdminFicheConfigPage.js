import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminPanelCopy } from "./adminPanelI18n";
import AdminPlatformShell from "./AdminPlatformShell";
import AdminContractModuleOptions from "./AdminContractModuleOptions";
import AdminEquipmentFamilies from "./AdminEquipmentFamilies";
import hubStyles from "./AdminNotificationsHub.module.css";

const HUB_VIEW_DEFS = [
  { key: "contract-modules", icon: "mdi:puzzle-outline" },
  { key: "equipment-families", icon: "mdi:devices" }
];

function normalizeView(view) {
  if (view === "equipment-families") return "equipment-families";
  if (view === "contract-modules") return "contract-modules";
  if (view === "infrastructure-map") return "contract-modules";
  return "contract-modules";
}

export default function AdminFicheConfigPage({ initialView = "contract-modules" }) {
  const locale = useAppLocale();
  const panelCopy = useMemo(() => getAdminPanelCopy(locale), [locale]);
  const [activeView, setActiveView] = useState(() => normalizeView(initialView));

  const tabs = useMemo(
    () =>
      HUB_VIEW_DEFS.map(def => ({
        key: def.key,
        label: panelCopy.items[def.key]?.label || def.key,
        icon: def.icon
      })),
    [panelCopy]
  );

  useEffect(() => {
    setActiveView(normalizeView(initialView));
  }, [initialView]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("veritas_admin_hub_view");
      if (!raw) return;
      sessionStorage.removeItem("veritas_admin_hub_view");
      const parsed = JSON.parse(raw);
      if (parsed?.hub !== "fiche-config" || !parsed?.view) return;
      setActiveView(normalizeView(parsed.view));
    } catch {}
  }, []);

  return (
    <AdminPlatformShell
      tabs={tabs}
      activeTab={activeView}
      onTabChange={setActiveView}
      tabsAriaLabel={panelCopy.items["fiche-config"]?.label || panelCopy.items["nav-client-config"]?.label}
      fill
    >
      <div className={hubStyles.panel} data-page-fill>
        {activeView === "contract-modules" ? <AdminContractModuleOptions embedded /> : null}
        {activeView === "equipment-families" ? <AdminEquipmentFamilies embedded /> : null}
      </div>
    </AdminPlatformShell>
  );
}
