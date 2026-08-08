import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../config";
import { fetchUsers } from "../../api/users";
import { fetchTeams } from "../../api/teams";
import { Page, SubTabs } from "./AdminUi";
import SalesFormsAdmin from "./SalesFormsAdmin";
import SalesCategoriesAdmin from "./SalesCategoriesAdmin";
import AdminTicketViews from "./AdminTicketViews";
import styles from "./AdminTickets.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { pickLocaleMessages } from "../../i18n/translate";

const SERVICE_SETTINGS_TABS = {
  fr: {
    "sales-forms": "Formulaires ventes",
    "sales-categories": "Catégories",
    "sales-ticket-views": "Vues services"
  },
  en: {
    "sales-forms": "Sales forms",
    "sales-categories": "Categories",
    "sales-ticket-views": "Service views"
  },
  de: {
    "sales-forms": "Vertriebsformulare",
    "sales-categories": "Kategorien",
    "sales-ticket-views": "Service-Ansichten"
  },
  it: {
    "sales-forms": "Moduli vendite",
    "sales-categories": "Categorie",
    "sales-ticket-views": "Viste servizi"
  },
  es: {
    "sales-forms": "Formularios de ventas",
    "sales-categories": "Categorías",
    "sales-ticket-views": "Vistas de servicios"
  }
};

const TAB_KEYS = ["sales-forms", "sales-categories", "sales-ticket-views"];

function readInitialSubView() {
  try {
    const raw = sessionStorage.getItem("veritas_admin_service_view");
    if (raw && TAB_KEYS.includes(raw)) {
      sessionStorage.removeItem("veritas_admin_service_view");
      return raw;
    }
  } catch {}
  return "sales-forms";
}

export default function AdminServiceSettingsPage() {
  const locale = useAppLocale();
  const tabLabels = pickLocaleMessages(SERVICE_SETTINGS_TABS, locale);
  const tabItems = useMemo(() => TAB_KEYS.map(key => ({
    key,
    label: tabLabels[key] || key
  })), [tabLabels]);
  const [activeView, setActiveView] = useState(readInitialSubView);
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE_URL}/profiles`, {
      credentials: "include"
    }).then(res => res.ok ? res.json() : []).then(data => {
      if (!mounted) return;
      const raw = Array.isArray(data) ? data : data.profiles || [];
      setProfiles(raw);
    }).catch(() => {
      if (mounted) setProfiles([]);
    });
    fetchTeams().then(rows => {
      if (!mounted) return;
      setTeams(Array.isArray(rows) ? rows : []);
    }).catch(() => {
      if (mounted) setTeams([]);
    });
    fetchUsers().then(rows => {
      if (!mounted) return;
      const normalized = Array.isArray(rows) ? rows.filter(user => user?.is_active !== false).map(user => ({
        id: String(user?.id || "").trim(),
        label: String(user?.username || "").trim() || String(user?.email || "").trim() || String(user?.id || "").trim()
      })).filter(user => user.id) : [];
      setUsers(normalized);
    }).catch(() => {
      if (mounted) setUsers([]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return <Page>
      <SubTabs items={tabItems} active={activeView} onChange={setActiveView} fullWidth />
      <div className={styles.content}>
        {activeView === "sales-forms" ? <SalesFormsAdmin /> : null}
        {activeView === "sales-categories" ? <SalesCategoriesAdmin /> : null}
        {activeView === "sales-ticket-views" ? <AdminTicketViews pageScope="ticket_sales" profiles={profiles} users={users} teams={teams} /> : null}
      </div>
    </Page>;
}
