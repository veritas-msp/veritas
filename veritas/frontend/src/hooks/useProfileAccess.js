import { useEffect, useState } from "react";
import { DOCUMENTS_CONFIG } from "../utils/constants";
import API_BASE_URL from "../config";

const PAGES_ACCESS_CONFIG = [{
  key: "Dashboard",
  label: "KPI dashboard",
  accessKey: "dashboard_enabled"
}, {
  key: "Hardware",
  label: "Monitoring center",
  accessKey: "infrastructure_enabled"
}, {
  key: "EquipmentInventory",
  label: "Device inventory",
  accessKey: "equipment_inventory_enabled"
}, {
  key: "Cybersecurite",
  label: "Cybersecurity",
  accessKey: "cybersecurite_enabled"
}, {
  key: "Planning",
  label: "Planning",
  accessKey: "planning_enabled"
}, {
  key: "Ticket",
  label: "Support",
  accessKey: "tickets_enabled"
}, {
  key: "TicketSales",
  label: "Services and installations",
  accessKey: "sales_enabled"
}, {
  key: "Service",
  label: "Cloud IT & Services",
  accessKey: "service_enabled"
}, {
  key: "Contrat",
  label: "Enterprise",
  accessKey: "contrat_enabled"
}, {
  key: "Contact",
  label: "Contact",
  accessKey: "contact_enabled"
}, {
  key: "Admin",
  label: "Administration",
  accessKey: "administration_enabled"
}];

function mapProfileToAccess(data) {
  const access = {};
  DOCUMENTS_CONFIG.forEach(doc => {
    access[doc.key] = !!data[doc.accessKey];
  });
  PAGES_ACCESS_CONFIG.forEach(page => {
    access[page.key] = !!data[page.accessKey];
  });
  return access;
}

export function useProfileAccess(profileName, refreshTrigger) {
  const [access, setAccess] = useState({});
  useEffect(() => {
    const fetchAccess = async () => {
      const normalizedProfile = String(profileName || "").trim();
      if (!normalizedProfile) {
        setAccess({});
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(normalizedProfile)}`, {
          credentials: "include"
        });
        if (!res.ok) throw new Error("Profile not found");
        const data = await res.json();
        setAccess(mapProfileToAccess(data));
      } catch (err) {
        console.warn("Error loading profile access", err);
        setAccess({});
      }
    };
    fetchAccess();
  }, [profileName, refreshTrigger]);
  return access;
}
