import { createLocaleGetter, interpolate } from "../../i18n/translate";
const FR = {
  catalogTitle: "Référentiel SSID du client",
  catalogLead: "Définissez ici les SSID une seule fois. Ils seront réutilisables sur toutes les bornes WiFi du client.",
  addSsid: "Ajouter un SSID",
  emptyCatalog: "Aucun SSID dans le référentiel.",
  addFirstSsid: "Ajouter le premier SSID",
  ssidIndex: "SSID {index}",
  removeSsidAria: "Retirer SSID {index} du référentiel",
  ssidName: "Nom du SSID",
  ssidNamePlaceholder: "WiFi-Entreprise",
  vlan: "VLAN",
  vlanPlaceholder: "20",
  band: "Bande",
  type: "Type",
  captivePortal: "Portail captif",
  broadcastTitle: "Diffusés par cette borne",
  broadcastLead: "Cochez les SSID que cette borne doit émettre. Les autres bornes du client pourront réutiliser le même référentiel.",
  emptyAssign: "Ajoutez et nommez au moins un SSID dans le référentiel pour l'assigner.",
  typePublic: "Public",
  typePrivate: "Privé",
  vlanMeta: "VLAN {vlan}",
  selectedSummary: "{count} SSID sélectionné",
  selectedSummaryPlural: "{count} SSID sélectionnés",
  bands: {
    dual: "Dual (2,4 + 5 GHz)",
    "2.4": "2,4 GHz",
    "5": "5 GHz",
    "6": "6 GHz"
  },
  types: {
    prive: "Privé (entreprise)",
    public: "Public / invité"
  }
};
const EN = {
  catalogTitle: "Client SSID catalog",
  catalogLead: "Define SSIDs here once. They can be reused across all of the client's WiFi access points.",
  addSsid: "Add SSID",
  emptyCatalog: "No SSIDs in the catalog.",
  addFirstSsid: "Add the first SSID",
  ssidIndex: "SSID {index}",
  removeSsidAria: "Remove SSID {index} from catalog",
  ssidName: "SSID name",
  ssidNamePlaceholder: "WiFi-Corporate",
  vlan: "VLAN",
  vlanPlaceholder: "20",
  band: "Band",
  type: "Type",
  captivePortal: "Captive portal",
  broadcastTitle: "Broadcast by this AP",
  broadcastLead: "Check the SSIDs this access point should broadcast. Other client APs can reuse the same catalog.",
  emptyAssign: "Add and name at least one SSID in the catalog to assign it.",
  typePublic: "Public",
  typePrivate: "Private",
  vlanMeta: "VLAN {vlan}",
  selectedSummary: "{count} SSID selected",
  selectedSummaryPlural: "{count} SSIDs selected",
  bands: {
    dual: "Dual (2.4 + 5 GHz)",
    "2.4": "2.4 GHz",
    "5": "5 GHz",
    "6": "6 GHz"
  },
  types: {
    prive: "Private (corporate)",
    public: "Public / guest"
  }
};
const DE = {
  ...EN,
  catalogTitle: "Client-SSID-Katalog",
  catalogLead: "Definieren Sie SSIDs hier einmal. Sie können auf allen WLAN-APs des Clients wiederverwendet werden.",
  addSsid: "SSID hinzufügen",
  emptyCatalog: "Keine SSIDs im Katalog.",
  addFirstSsid: "Erste SSID hinzufügen",
  removeSsidAria: "SSID {index} aus Katalog entfernen",
  ssidName: "SSID-Name",
  vlan: "VLAN",
  band: "Band",
  type: "Typ",
  captivePortal: "Captive Portal",
  broadcastTitle: "Von diesem AP ausgestrahlt",
  broadcastLead: "Wählen Sie die SSIDs, die dieser Access Point senden soll. Andere APs des Clients können denselben Katalog nutzen.",
  emptyAssign: "Fügen Sie mindestens eine benannte SSID im Katalog hinzu, um sie zuzuweisen.",
  typePublic: "Öffentlich",
  typePrivate: "Privat",
  selectedSummary: "{count} SSID ausgewählt",
  selectedSummaryPlural: "{count} SSIDs ausgewählt",
  types: {
    prive: "Privat (Unternehmen)",
    public: "Öffentlich / Gast"
  }
};
const IT = {
  ...EN,
  catalogTitle: "Catalogo SSID cliente",
  catalogLead: "Definite qui gli SSID una sola volta. Saranno riutilizzabili su tutti gli AP WiFi del cliente.",
  addSsid: "Aggiungi SSID",
  emptyCatalog: "Nessun SSID nel catalogo.",
  addFirstSsid: "Aggiungi il primo SSID",
  removeSsidAria: "Rimuovi SSID {index} dal catalogo",
  ssidName: "Nome SSID",
  vlan: "VLAN",
  band: "Banda",
  type: "Tipo",
  captivePortal: "Portale captive",
  broadcastTitle: "Trasmessi da questo AP",
  broadcastLead: "Seleziona gli SSID che questo access point deve emettere. Gli altri AP del cliente possono riutilizzare lo stesso catalogo.",
  emptyAssign: "Aggiungi e denomina almeno un SSID nel catalogo per assegnarlo.",
  typePublic: "Pubblico",
  typePrivate: "Privato",
  selectedSummary: "{count} SSID selezionato",
  selectedSummaryPlural: "{count} SSID selezionati",
  types: {
    prive: "Privato (aziendale)",
    public: "Pubblico / ospite"
  }
};
const ES = {
  ...EN,
  catalogTitle: "Catálogo SSID del cliente",
  catalogLead: "Defina los SSID aquí una sola vez. Se reutilizarán en todos los AP WiFi del cliente.",
  addSsid: "Añadir SSID",
  emptyCatalog: "No hay SSID en el catálogo.",
  addFirstSsid: "Añadir el primer SSID",
  removeSsidAria: "Quitar SSID {index} del catálogo",
  ssidName: "Nombre del SSID",
  vlan: "VLAN",
  band: "Banda",
  type: "Tipo",
  captivePortal: "Portal cautivo",
  broadcastTitle: "Emitidos por este AP",
  broadcastLead: "Marque los SSID que este punto de acceso debe emitir. Los demás AP del cliente pueden reutilizar el mismo catálogo.",
  emptyAssign: "Añada y nombre al menos un SSID en el catálogo para asignarlo.",
  typePublic: "Público",
  typePrivate: "Privado",
  selectedSummary: "{count} SSID seleccionado",
  selectedSummaryPlural: "{count} SSID seleccionados",
  types: {
    prive: "Privado (empresa)",
    public: "Público / invitado"
  }
};
const COPY = {
  fr: FR,
  en: EN,
  de: DE,
  it: IT,
  es: ES
};
export const getWifiApSsidCopy = createLocaleGetter(COPY);
export function getWifiBandLabel(locale, value) {
  const copy = getWifiApSsidCopy(locale);
  return copy.bands?.[value] ?? value;
}
export function getWifiTypeLabel(locale, value) {
  const copy = getWifiApSsidCopy(locale);
  return copy.types?.[value] ?? value;
}
export function formatSelectedSummary(locale, count, names) {
  const copy = getWifiApSsidCopy(locale);
  const label = interpolate(count > 1 ? copy.selectedSummaryPlural : copy.selectedSummary, {
    count
  });
  if (!names.length) return label;
  return `${label} : ${names.join(", ")}`;
}
