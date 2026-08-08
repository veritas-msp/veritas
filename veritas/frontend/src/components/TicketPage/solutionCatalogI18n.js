const SUPPORTED_LOCALES = ["fr", "en", "de", "it", "es"];
const CATALOG_ENTRIES = [{
  category: "intervention",
  labels: {
    fr: "À distance",
    en: "Remote",
    de: "Remote",
    it: "Da remoto",
    es: "A distancia"
  }
}, {
  category: "intervention",
  labels: {
    fr: "Sur site",
    en: "On-site",
    de: "Vor Ort",
    it: "In sede",
    es: "In situ"
  }
}, {
  category: "intervention",
  labels: {
    fr: "En atelier",
    en: "In workshop",
    de: "In der Werkstatt",
    it: "In laboratorio",
    es: "En taller"
  }
}, {
  category: "intervention",
  labels: {
    fr: "Commerce",
    en: "Sales",
    de: "Vertrieb",
    it: "Commerciale",
    es: "Comercial"
  }
}, {
  category: "action",
  labels: {
    fr: "Branchement",
    en: "Connection",
    de: "Anschluss",
    it: "Collegamento",
    es: "Conexión"
  }
}, {
  category: "action",
  labels: {
    fr: "Configuration",
    en: "Configuration",
    de: "Konfiguration",
    it: "Configurazione",
    es: "Configuración"
  }
}, {
  category: "action",
  labels: {
    fr: "Mise à jour",
    en: "Update",
    de: "Update",
    it: "Aggiornamento",
    es: "Actualización"
  }
}, {
  category: "action",
  labels: {
    fr: "Demande de devis",
    en: "Quote request",
    de: "Angebotsanfrage",
    it: "Richiesta di preventivo",
    es: "Solicitud de presupuesto"
  }
}, {
  category: "action",
  labels: {
    fr: "Remplacement de matériel",
    en: "Hardware replacement",
    de: "Hardware-Austausch",
    it: "Sostituzione hardware",
    es: "Sustitución de hardware"
  }
}, {
  category: "action",
  labels: {
    fr: "Remplacement d'une pièce",
    en: "Part replacement",
    de: "Teileaustausch",
    it: "Sostituzione componente",
    es: "Sustitución de pieza"
  }
}, {
  category: "action",
  labels: {
    fr: "Réparation",
    en: "Repair",
    de: "Reparatur",
    it: "Riparazione",
    es: "Reparación"
  }
}, {
  category: "action",
  labels: {
    fr: "Diagnostic",
    en: "Diagnostics",
    de: "Diagnose",
    it: "Diagnostica",
    es: "Diagnóstico"
  }
}, {
  category: "action",
  labels: {
    fr: "Installation",
    en: "Installation",
    de: "Installation",
    it: "Installazione",
    es: "Instalación"
  }
}, {
  category: "action",
  labels: {
    fr: "Désinstallation",
    en: "Uninstallation",
    de: "Deinstallation",
    it: "Disinstallazione",
    es: "Desinstalación"
  }
}, {
  category: "action",
  labels: {
    fr: "Migration de données",
    en: "Data migration",
    de: "Datenmigration",
    it: "Migrazione dati",
    es: "Migración de datos"
  }
}, {
  category: "action",
  labels: {
    fr: "Sauvegarde / restauration",
    en: "Backup / restore",
    de: "Backup / Wiederherstellung",
    it: "Backup / ripristino",
    es: "Copia de seguridad / restauración"
  }
}, {
  category: "action",
  labels: {
    fr: "Nettoyage / maintenance",
    en: "Cleaning / maintenance",
    de: "Reinigung / Wartung",
    it: "Pulizia / manutenzione",
    es: "Limpieza / mantenimiento"
  }
}, {
  category: "action",
  labels: {
    fr: "Formation utilisateur",
    en: "User training",
    de: "Benutzerschulung",
    it: "Formazione utente",
    es: "Formación de usuario"
  }
}, {
  category: "action",
  labels: {
    fr: "Paramétrage logiciel",
    en: "Software setup",
    de: "Software-Einrichtung",
    it: "Configurazione software",
    es: "Configuración de software"
  }
}, {
  category: "action",
  labels: {
    fr: "Paramétrage réseau",
    en: "Network setup",
    de: "Netzwerk-Einrichtung",
    it: "Configurazione rete",
    es: "Configuración de red"
  }
}, {
  category: "action",
  labels: {
    fr: "Création de compte",
    en: "Account creation",
    de: "Kontoerstellung",
    it: "Creazione account",
    es: "Creación de cuenta"
  }
}, {
  category: "action",
  labels: {
    fr: "Réinitialisation mot de passe",
    en: "Password reset",
    de: "Passwort zurücksetzen",
    it: "Reimpostazione password",
    es: "Restablecimiento de contraseña"
  }
}, {
  category: "action",
  labels: {
    fr: "Restauration de service",
    en: "Service restoration",
    de: "Dienstwiederherstellung",
    it: "Ripristino servizio",
    es: "Restauración del servicio"
  }
}, {
  category: "action",
  labels: {
    fr: "Analyse de logs",
    en: "Log analysis",
    de: "Log-Analyse",
    it: "Analisi log",
    es: "Análisis de logs"
  }
}, {
  category: "action",
  labels: {
    fr: "Mise en conformité",
    en: "Compliance alignment",
    de: "Compliance-Herstellung",
    it: "Adeguamento conformità",
    es: "Adecuación de cumplimiento"
  }
}, {
  category: "action",
  labels: {
    fr: "Audit",
    en: "Audit",
    de: "Audit",
    it: "Audit",
    es: "Auditoría"
  }
}, {
  category: "action",
  labels: {
    fr: "Conseil / recommandation",
    en: "Advice / recommendation",
    de: "Beratung / Empfehlung",
    it: "Consulenza / raccomandazione",
    es: "Asesoramiento / recomendación"
  }
}, {
  category: "action",
  labels: {
    fr: "Livraison matériel",
    en: "Hardware delivery",
    de: "Hardware-Lieferung",
    it: "Consegna hardware",
    es: "Entrega de hardware"
  }
}, {
  category: "action",
  labels: {
    fr: "Récupération matériel",
    en: "Hardware pickup",
    de: "Hardware-Abholung",
    it: "Ritiro hardware",
    es: "Recogida de hardware"
  }
}, {
  category: "action",
  labels: {
    fr: "Test et validation",
    en: "Testing and validation",
    de: "Test und Validierung",
    it: "Test e validazione",
    es: "Prueba y validación"
  }
}, {
  category: "action",
  labels: {
    fr: "Escalade fournisseur",
    en: "Vendor escalation",
    de: "Hersteller-Eskalation",
    it: "Escalation fornitore",
    es: "Escalada a proveedor"
  }
}, {
  category: "action",
  labels: {
    fr: "Intervention annulée (client absent)",
    en: "Cancelled intervention (client absent)",
    de: "Einsatz abgesagt (Kunde abwesend)",
    it: "Intervento annullato (cliente assente)",
    es: "Intervención cancelada (cliente ausente)"
  }
}, {
  category: "action",
  labels: {
    fr: "Accès refusé",
    en: "Access denied",
    de: "Zugriff verweigert",
    it: "Accesso negato",
    es: "Acceso denegado"
  }
}];
function normalizeLocale(locale) {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(code) ? code : "fr";
}
function normalizeLabel(value) {
  return String(value || "").trim().toLowerCase();
}
const LABEL_INDEX = new Map();
for (const entry of CATALOG_ENTRIES) {
  for (const label of Object.values(entry.labels)) {
    LABEL_INDEX.set(normalizeLabel(label), entry);
  }
}
function findSolutionCatalogEntry(label) {
  return LABEL_INDEX.get(normalizeLabel(label)) || null;
}
export function getLocalizedSolutionCatalogLabel(label, locale) {
  const raw = String(label || "").trim();
  if (!raw) return "";
  const entry = findSolutionCatalogEntry(raw);
  if (!entry) return raw;
  const code = normalizeLocale(locale);
  return entry.labels[code] || entry.labels.fr || raw;
}
export function getCanonicalSolutionCatalogLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return "";
  const entry = findSolutionCatalogEntry(raw);
  if (!entry) return raw;
  return entry.labels.fr || raw;
}
export function localizeSolutionCatalogOptions(options, locale) {
  return (options || []).map(option => {
    const rawLabel = String(option?.label || option || "").trim();
    if (!rawLabel) return null;
    return getLocalizedSolutionCatalogLabel(rawLabel, locale);
  }).filter(Boolean);
}
