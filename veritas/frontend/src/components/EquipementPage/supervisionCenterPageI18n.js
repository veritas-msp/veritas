import { interpolate, pickLocaleMessages } from "../../i18n/translate";
const TAB_IDS = ["operations", "history", "settings"];
const LICENSE_MODULE_KEYS = ["antivirus", "antispam", "domain", "ssl", "licences", "o365", "backup", "firewall", "toip"];
const SUPERVISION_COPY = {
  fr: {
    eyebrow: "Services managés",
    pageTitle: "Centre de supervision",
    subtitle: "Alertes actives et historique · périphériques, sauvegardes, contrats et RMM.",
    loading: "Balayage en cours…",
    tabSectionsAria: "Sections supervision",
    tabs: {
      operations: "Alertes",
      history: "Historique",
      settings: "Règles"
    },
    guide: {
      fabLabel: "Guide du centre de supervision",
      tourTitle: "Centre de supervision",
      steps: {
        hero: {
          title: "Centre de notifications",
          content: "Cette page regroupe toutes les alertes d'infrastructure : périphériques, sauvegardes, contrats et agents RMM. Consultez-les et agissez depuis une file unique."
        },
        tabs: {
          title: "Vues principales",
          content: "Alertes = table des alertes actives. Historique = alertes prises en charge ou closes, avec timeline. Règles (admin) = critères de surveillance."
        },
        kpis: {
          title: "Filtres",
          content: "Une seule barre de filtres : domaine (Tout, Périphériques…), sévérité (Critiques, Warnings) et statut (Ouvertes, Prises en charge, Liées). Cliquez à nouveau pour retirer un filtre."
        },
        filters: {
          title: "Recherche",
          content: "Recherchez une alerte ou un client. Les filtres ci-dessous affinent la même file."
        },
        queue: {
          title: "Table d'alertes",
          content: "Chaque ligne affiche l'alerte, l'entreprise, le domaine et le statut. Survolez les icônes d'actions pour voir ce qu'elles font : prise en charge, ticket, planning, résolution."
        },
        history: {
          title: "Historique",
          content: "Retrouvez les alertes closes ou liées à une remédiation, avec leur timeline d'événements."
        }
      }
    },
    ops: {
      kpi: {
        aria: "Indicateurs d'alertes",
        critical: "Critiques",
        warning: "Warnings",
        devices: "Périphériques",
        backups: "Sauvegardes",
        contracts: "Contrats",
        rmm: "RMM offline"
      },
      domainAria: "Filtrer par domaine",
      domains: {
        all: "Tout",
        devices: "Périphériques",
        backups: "Sauvegardes",
        contracts: "Contrats",
        rmm: "RMM"
      },
      workflow: {
        aria: "Filtrer par statut",
        all: "Actives",
        open: "Ouvertes",
        acked: "Prises en charge",
        linked: "Liées",
        closed: "Closes"
      },
      searchPlaceholder: "Rechercher une alerte, un client…",
      emptyTitle: "Rien à traiter",
      emptyText: "Aucune alerte active sur les périphériques, sauvegardes, contrats ou agents RMM.",
      actionsAria: "Actions sur l'alerte",
      severityInfo: "Info",
      collab: {
        handledBy: "Pris en charge par {name}",
        ticketSupport: "Ticket Support lié",
        ticketPresta: "Ticket Presta lié",
        planning: "Événement planifié",
        remediation: "Remédiation liée"
      },
      actions: {
        support: "Ticket Support",
        presta: "Ticket Presta",
        plan: "Planifier",
        open: "Ouvrir",
        ack: "Prendre en charge",
        resolve: "Résoudre",
        dismiss: "Ignorer"
      },
      actionHints: {
        ack: "Prendre en charge cette alerte",
        support: "Créer un ticket Support lié à cette alerte",
        presta: "Créer un ticket Presta lié à cette alerte",
        plan: "Planifier un événement lié à cette alerte",
        resolve: "Marquer comme résolue et envoyer dans l'historique",
        dismiss: "Ignorer l'alerte et l'envoyer dans l'historique",
        open: "Ouvrir la fiche ou le détail lié"
      },
      columns: {
        alert: "Alerte",
        company: "Entreprise",
        domain: "Domaine",
        severity: "Sévérité",
        status: "Statut",
        when: "Date",
        actions: "Actions"
      },
      toasts: {
        acked: "Alerte prise en charge",
        resolved: "Alerte résolue — déplacée dans l'historique",
        dismissed: "Alerte ignorée — déplacée dans l'historique",
        linked: "Remédiation liée à l'alerte",
        actionFailed: "Action impossible sur l'alerte"
      },
      detailBackups: "Détail sauvegardes",
      detailContracts: "Détail contrats & licences",
      detailRmm: "Détail agents RMM",
      offline: "Hors ligne"
    },
    history: {
      searchPlaceholder: "Rechercher dans l'historique…",
      loading: "Chargement de l'historique…",
      loadingEvents: "Chargement de la timeline…",
      emptyTitle: "Aucun historique",
      emptyText: "Les alertes prises en charge, liées ou closes apparaîtront ici.",
      noEvents: "Aucun événement",
      reopen: "Réouvrir",
      timelineTitle: "Timeline",
      filterAria: "Filtres historique",
      systemActor: "Système",
      unknownActor: "Utilisateur inconnu",
      domains: {
        all: "Tout",
        devices: "Périphériques",
        backups: "Sauvegardes",
        contracts: "Contrats",
        rmm: "RMM"
      },
      status: {
        all: "Tous statuts",
        closed: "Closes",
        acked: "Prises en charge",
        linked: "Liées",
        open: "Ouvertes"
      },
      actions: {
        opened: "Ouverte",
        ack: "Prise en charge",
        unack: "Ack annulé",
        link: "Remédiation liée",
        resolved: "Résolue",
        dismissed: "Ignorée",
        reopen: "Réouverte",
        note: "Note"
      },
      columns: {
        alert: "Alerte",
        company: "Entreprise",
        domain: "Domaine",
        status: "Statut",
        when: "Date",
        actions: "Actions"
      },
      actionHints: {
        reopen: "Réouvrir cette alerte et la renvoyer dans la table active",
        expand: "Afficher la timeline de l'alerte",
        collapse: "Replier la timeline"
      }
    },
    fleet: {
      remediationSupport: "Ticket Support",
      remediationPresta: "Ticket Presta",
      remediationPlan: "Planifier"
    },
    contractStatus: {
      expired: "Expiré",
      expiring: "Expire bientôt",
      suspended: "Suspendu"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Noms de domaine",
      ssl: "Certificats SSL",
      licences: "Licences & abonnements",
      o365: "Microsoft 365",
      backup: "Sauvegarde",
      firewall: "Firewall",
      toip: "TOIP / VoIP"
    },
    contractType: {
      msp: "Contrat MSP",
      enterprise: "Contrat entreprise",
      license: "Licence"
    },
    table: {
      name: "Nom",
      type: "Type",
      status: "Statut",
      expiration: "Expiration",
      actions: "Actions",
      sortBy: "Trier par {label}"
    },
    contracts: {
      okTitle: "Contrats et licences OK",
      okText: "Aucune échéance expirée ou à renouveler dans les 60 prochains jours (contrats, antivirus, antispam, domaines, SSL, licences).",
      alertCount: "{count} alerte",
      alertCountPlural: "{count} alertes",
      expiredCount: "{count} expirée",
      expiredCountPlural: "{count} expirées",
      expiringCount: "{count} à renouveler",
      viewEnterprise: "Voir l'entreprise",
      panelTitle: "Contrats & licences à traiter"
    },
    priority: {
      emptyTitle: "Aucune alerte périphérique",
      emptyText: "Tous les équipements supervisés sont dans un état nominal.",
      intervene: "Intervenir",
      analyze: "Analyser",
      treat: "Traiter",
      noName: "Sans nom",
      storage: "Stockage",
      hints: {
        monitor_critical: "Intervenir sur l'alerte CheckMK et rétablir le service.",
        monitor_warning: "Analyser le warning CheckMK avant dégradation.",
        agent_offline: "Contrôler alimentation, réseau et service agent RMM (hors ligne depuis plus de 48 h).",
        unmapped: "Mapper l'équipement à un hôte CheckMK depuis la fiche matériel.",
        no_data: "Vérifier le mapping CheckMK et la remontée des métriques.",
        warranty_expired: "Renouveler ou mettre à jour la garantie constructeur.",
        warranty_soon: "Planifier le renouvellement de garantie.",
        maintenance_expired: "Renouveler la licence de maintenance firewall.",
        maintenance_soon: "Anticiper le renouvellement de la licence maintenance.",
        battery_expired: "Remplacer la batterie onduleur / PDU.",
        battery_soon: "Commander ou planifier le remplacement batterie.",
        updates_pending: "Planifier l'installation des mises à jour Windows.",
        disk_critical: "Libérer ou étendre l'espace disque en urgence.",
        disk_warn: "Surveiller l'espace disque et planifier un nettoyage.",
        missing_ip: "Compléter l'adresse IP dans la fiche matériel."
      },
      statusHints: {
        critical: "Alerte supervision critique · intervention immédiate.",
        offline: "Agent RMM hors ligne · vérifier connectivité du poste.",
        warning: "Warning supervision · analyser avant dégradation.",
        unmapped: "Équipement non mappé CheckMK · activer la supervision.",
        no_data: "Aucune donnée de supervision · vérifier le mapping.",
        default: "Point de vigilance à traiter depuis la fiche matériel."
      }
    },
    familyStats: {
      emptyTitle: "Aucun équipement trouvé",
      emptyText: "Les statistiques par famille apparaîtront dès que du matériel sera renseigné.",
      monitored: "Supervisé",
      uncovered: "Non couvert",
      supervisedLabel: "supervisé",
      tooltip: "{label} · {monitored}/{total} supervisés",
      openFamily: "Voir les périphériques {label}"
    },
    overview: {
      hexTitle: "Vue d'ensemble",
      hexKpi: {
        todo: "À traiter",
        devices: "Périphériques",
        issues: "Alertes",
        critical: "Critiques",
        offline: "Hors ligne",
        backups: "Sauvegardes",
        supervised: "Supervisé"
      },
      priorityTitle: "À traiter en priorité",
      viewAll: "Voir tout",
      familyTitle: "Supervision par type de périphérique"
    },
    search: {
      devices: "Rechercher un périphérique, client, IP…",
      rmm: "Rechercher un poste, client, IP, OS…",
      clients: "Clients",
      clearFilters: "Effacer ({count})",
      agentCount: "{count} agent",
      agentCountPlural: "{count} agents"
    },
    rmm: {
      online: "En ligne",
      offline: "Hors ligne",
      workstation: "Poste",
      viewWorkstation: "Voir le poste",
      panelTitle: "Agents RMM",
      offlineCount: "{count} hors ligne",
      syncRequested: "Sync demandée",
      lastActivity: "Dernière activité",
      notLinked: "Poste non lié",
      sortBy: "Trier par {label}",
      summary: {
        workstation: "{count} poste",
        workstationPlural: "{count} postes",
        offline: "hors ligne",
        pendingUpdates: "MAJ en attente",
        diskAlert: "disque > 85%",
        diskAlertPlural: "disques > 85%"
      },
      table: {
        hostname: "Poste",
        client: "Client",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "MAJ Windows",
        agent: "Agent",
        lastSeen: "Dernière activité",
        actions: "Actions"
      },
      empty: {
        noMatchTitle: "Aucun agent ne correspond",
        allOnlineTitle: "Tous les agents sont en ligne",
        noAgentsTitle: "Aucun agent RMM",
        noMatchText: "Ajustez la recherche (poste, client, IP, OS, domaine…).",
        allOnlineText: "Aucun poste n'est actuellement hors ligne.",
        noAgentsText: "Déployez l'agent Veritas sur les postes clients pour la supervision RMM."
      },
      menu: {
        viewEnterprise: "Voir l'entreprise",
        cancelSync: "Annuler sync complet",
        fullSync: "Sync complet",
        metricsHistory: "Historique métriques",
        copyHost: "Copier le nom du poste",
        copyIp: "Copier l'adresse IP",
        revoke: "Révoquer l'agent"
      },
      clipboard: {
        hostName: "Nom du poste",
        ipAddress: "Adresse IP",
        copied: "{label} copié",
        copyFailed: "Impossible de copier"
      },
      toasts: {
        syncRequested: "Sync complet demandé pour {hostname}. L'inventaire sera mis à jour au prochain passage de l'agent.",
        syncRequestFailed: "Impossible de demander la synchronisation",
        syncCancelled: "Demande de sync complet annulée pour {hostname}.",
        syncCancelFailed: "Impossible d'annuler la synchronisation",
        revokeFailed: "Poste introuvable pour révoquer cet agent",
        metricsNoEquipment: "Aucun équipement lié à cet agent pour afficher les métriques"
      }
    },
    time: {
      never: "Jamais"
    },
    error: {
      title: "Erreur de chargement"
    }
  },
  en: {
    eyebrow: "Managed services",
    pageTitle: "Monitoring center",
    subtitle: "Notification center · device, backup, contract, and RMM alerts.",
    loading: "Scanning…",
    tabSectionsAria: "Monitoring sections",
    tabs: {
      operations: "Alerts",
      history: "History",
      settings: "Rules"
    },
    guide: {
      fabLabel: "Monitoring center guide",
      tourTitle: "Monitoring center",
      steps: {
        hero: {
          title: "Notification center",
          content: "This page gathers all infrastructure alerts: devices, backups, contracts, and RMM agents. Review and act from a single queue."
        },
        tabs: {
          title: "Main views",
          content: "Alerts = active alert table. History = acknowledged or closed alerts with timeline. Rules (admin) = monitoring criteria."
        },
        kpis: {
          title: "Filters",
          content: "One filter bar: domain (All, Devices…), severity (Critical, Warnings), and status (Open, Acknowledged, Linked). Click again to clear a filter."
        },
        filters: {
          title: "Search",
          content: "Search an alert or client. The filters below narrow the same queue."
        },
        queue: {
          title: "Alert queue",
          content: "Every card shares the same format: title, domain, status. Acknowledge, open a Support or Service ticket, schedule, resolve, or dismiss."
        },
        fleet: {
          title: "Fleet",
          content: "Client device listing for remediation outside the alert queue (ticket, planning)."
        },
        history: {
          title: "History",
          content: "Find closed alerts or those linked to a remediation, with their event timeline."
        }
      }
    },
    ops: {
      kpi: {
        aria: "Alert indicators",
        critical: "Critical",
        warning: "Warnings",
        devices: "Devices",
        backups: "Backups",
        contracts: "Contracts",
        rmm: "RMM offline"
      },
      domainAria: "Filter by domain",
      domains: {
        all: "All",
        devices: "Devices",
        backups: "Backups",
        contracts: "Contracts",
        rmm: "RMM"
      },
      workflow: {
        aria: "Filter by status",
        all: "Active",
        open: "Open",
        acked: "Acknowledged",
        linked: "Linked",
        closed: "Closed"
      },
      searchPlaceholder: "Search an alert, a client…",
      emptyTitle: "Nothing to handle",
      emptyText: "No active alerts on devices, backups, contracts or RMM agents.",
      actionsAria: "Alert actions",
      severityInfo: "Info",
      collab: {
        handledBy: "Handled by {name}",
        ticketSupport: "Support ticket linked",
        ticketPresta: "Service ticket linked",
        planning: "Planning event linked",
        remediation: "Remediation linked"
      },
      actions: {
        support: "Support ticket",
        presta: "Service ticket",
        plan: "Schedule",
        open: "Open",
        ack: "Acknowledge",
        resolve: "Resolve",
        dismiss: "Dismiss"
      },
      actionHints: {
        ack: "Acknowledge this alert — mark that you are handling it",
        support: "Create a Support ticket linked to this alert",
        presta: "Create a Service ticket linked to this alert",
        plan: "Schedule a planning event linked to this alert",
        resolve: "Mark as resolved and move to history",
        dismiss: "Dismiss the alert and move it to history",
        open: "Open the related record or details"
      },
      columns: {
        alert: "Alert",
        company: "Company",
        domain: "Domain",
        severity: "Severity",
        status: "Status",
        when: "Date",
        actions: "Actions"
      },
      toasts: {
        acked: "Alert acknowledged",
        resolved: "Alert resolved — moved to history",
        dismissed: "Alert dismissed — moved to history",
        linked: "Remediation linked to alert",
        actionFailed: "Could not update alert"
      },
      detailBackups: "Backup details",
      detailContracts: "Contracts & licenses details",
      detailRmm: "RMM agents details",
      offline: "Offline"
    },
    history: {
      searchPlaceholder: "Search history…",
      loading: "Loading history…",
      loadingEvents: "Loading timeline…",
      emptyTitle: "No history yet",
      emptyText: "Acknowledged, linked or closed alerts will appear here.",
      noEvents: "No events",
      reopen: "Reopen",
      timelineTitle: "Timeline",
      filterAria: "History filters",
      systemActor: "System",
      unknownActor: "Unknown user",
      domains: {
        all: "All",
        devices: "Devices",
        backups: "Backups",
        contracts: "Contracts",
        rmm: "RMM"
      },
      status: {
        all: "All statuses",
        closed: "Closed",
        acked: "Acknowledged",
        linked: "Linked",
        open: "Open"
      },
      actions: {
        opened: "Opened",
        ack: "Acknowledged",
        unack: "Unacknowledged",
        link: "Remediation linked",
        resolved: "Resolved",
        dismissed: "Dismissed",
        reopen: "Reopened",
        note: "Note"
      },
      columns: {
        alert: "Alert",
        company: "Company",
        domain: "Domain",
        status: "Status",
        when: "Date",
        actions: "Actions"
      },
      actionHints: {
        reopen: "Reopen this alert and send it back to the active table",
        expand: "Show the alert timeline",
        collapse: "Collapse the timeline"
      }
    },
    fleet: {
      remediationSupport: "Support ticket",
      remediationPresta: "Service ticket",
      remediationPlan: "Schedule"
    },
    contractStatus: {
      expired: "Expired",
      expiring: "Expiring soon",
      suspended: "Suspended"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Domain names",
      ssl: "SSL certificates",
      licences: "Licenses & subscriptions",
      o365: "Microsoft 365",
      backup: "Backup",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "MSP contract",
      enterprise: "Company contract",
      license: "License"
    },
    table: {
      name: "Name",
      type: "Type",
      status: "Status",
      expiration: "Expiration",
      actions: "Actions",
      sortBy: "Sort by {label}"
    },
    contracts: {
      okTitle: "Contracts and licenses OK",
      okText: "No expired or upcoming renewals within the next 60 days (contracts, antivirus, antispam, domains, SSL, licenses).",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alerts",
      expiredCount: "{count} expired",
      expiredCountPlural: "{count} expired",
      expiringCount: "{count} to renew",
      viewEnterprise: "View company",
      panelTitle: "Contracts & licenses to review"
    },
    priority: {
      emptyTitle: "No device alerts",
      emptyText: "All supervised equipment is in a nominal state.",
      intervene: "Intervene",
      analyze: "Analyze",
      treat: "Handle",
      noName: "Unnamed",
      storage: "Storage",
      hints: {
        monitor_critical: "Address the CheckMK alert and restore the service.",
        monitor_warning: "Analyze the CheckMK warning before degradation.",
        agent_offline: "Check power, network, and RMM agent service (offline for more than 48 h).",
        unmapped: "Map the equipment to a CheckMK host from the hardware record.",
        no_data: "Verify CheckMK mapping and metric collection.",
        warranty_expired: "Renew or update the manufacturer warranty.",
        warranty_soon: "Plan warranty renewal.",
        maintenance_expired: "Renew the firewall maintenance license.",
        maintenance_soon: "Anticipate maintenance license renewal.",
        battery_expired: "Replace the UPS/PDU battery.",
        battery_soon: "Order or plan battery replacement.",
        updates_pending: "Schedule Windows update installation.",
        disk_critical: "Free or extend disk space urgently.",
        disk_warn: "Monitor disk space and plan cleanup.",
        missing_ip: "Complete the IP address in the hardware record."
      },
      statusHints: {
        critical: "Critical supervision alert · immediate action required.",
        offline: "RMM agent offline · check endpoint connectivity.",
        warning: "Monitoring warning · analyze before degradation.",
        unmapped: "Equipment not mapped to CheckMK · enable supervision.",
        no_data: "No supervision data · verify mapping.",
        default: "Item to handle from the hardware record."
      }
    },
    familyStats: {
      emptyTitle: "No equipment found",
      emptyText: "Family statistics will appear once hardware is recorded.",
      monitored: "Monitored",
      uncovered: "Not covered",
      supervisedLabel: "monitored",
      tooltip: "{label} · {monitored}/{total} monitored",
      openFamily: "View {label} devices"
    },
    overview: {
      hexTitle: "Overview",
      hexKpi: {
        todo: "To do",
        devices: "Devices",
        issues: "Alerts",
        critical: "Critical",
        offline: "Offline",
        backups: "Backups",
        supervised: "Monitored"
      },
      priorityTitle: "Priority items",
      viewAll: "View all",
      familyTitle: "Monitoring by device type"
    },
    search: {
      devices: "Search device, client, IP…",
      rmm: "Search workstation, client, IP, OS…",
      clients: "Clients",
      clearFilters: "Clear ({count})",
      agentCount: "{count} agent",
      agentCountPlural: "{count} agents"
    },
    rmm: {
      online: "Online",
      offline: "Offline",
      workstation: "Workstation",
      viewWorkstation: "View workstation",
      panelTitle: "RMM agents",
      offlineCount: "{count} offline",
      syncRequested: "Sync requested",
      lastActivity: "Last activity",
      notLinked: "Workstation not linked",
      sortBy: "Sort by {label}",
      summary: {
        workstation: "{count} workstation",
        workstationPlural: "{count} workstations",
        offline: "offline",
        pendingUpdates: "pending updates",
        diskAlert: "disk > 85%",
        diskAlertPlural: "disks > 85%"
      },
      table: {
        hostname: "Workstation",
        client: "Client",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "Windows updates",
        agent: "Agent",
        lastSeen: "Last activity",
        actions: "Actions"
      },
      empty: {
        noMatchTitle: "No matching agents",
        allOnlineTitle: "All agents are online",
        noAgentsTitle: "No RMM agents",
        noMatchText: "Adjust your search (workstation, client, IP, OS, domain…).",
        allOnlineText: "No workstations are currently offline.",
        noAgentsText: "Deploy the Veritas agent on client workstations for RMM supervision."
      },
      menu: {
        viewEnterprise: "View company",
        cancelSync: "Cancel full sync",
        fullSync: "Full sync",
        metricsHistory: "Metrics history",
        copyHost: "Copy workstation name",
        copyIp: "Copy IP address",
        revoke: "Revoke agent"
      },
      clipboard: {
        hostName: "Workstation name",
        ipAddress: "IP address",
        copied: "{label} copied",
        copyFailed: "Unable to copy"
      },
      toasts: {
        syncRequested: "Full sync requested for {hostname}. Inventory will update on the agent's next run.",
        syncRequestFailed: "Unable to request synchronization",
        syncCancelled: "Full sync request cancelled for {hostname}.",
        syncCancelFailed: "Unable to cancel synchronization",
        revokeFailed: "Workstation not found to revoke this agent",
        metricsNoEquipment: "No equipment linked to this agent to show metrics"
      }
    },
    time: {
      never: "Never"
    },
    error: {
      title: "Loading error"
    }
  },
  de: {
    eyebrow: "Managed Services",
    pageTitle: "Überwachungszentrum",
    subtitle: "Benachrichtigungszentrum · Geräte-, Backup-, Vertrags- und RMM-Alarme.",
    loading: "Abtastung läuft…",
    tabSectionsAria: "Überwachungsbereiche",
    tabs: {
      operations: "Alarme",
      history: "Verlauf",
      settings: "Regeln"
    },
    guide: {
      fabLabel: "Leitfaden Überwachungszentrum",
      tourTitle: "Überwachungszentrum",
      steps: {
        hero: {
          title: "Benachrichtigungszentrum",
          content: "Diese Seite bündelt alle Infrastruktur-Alarme: Geräte, Backups, Verträge und RMM-Agenten. Prüfen und handeln Sie in einer gemeinsamen Warteschlange."
        },
        tabs: {
          title: "Hauptansichten",
          content: "Alarme = aktive Alarmtabelle. Verlauf = bestätigte oder geschlossene Alarme mit Timeline. Regeln (Admin) = Überwachungskriterien."
        },
        kpis: {
          title: "Kennzahlen",
          content: "Kritisch / Warnung filtern nach Schweregrad. Geräte, Backups, Verträge und RMM filtern dieselbe Warteschlange — ohne anderes Kartenlayout."
        },
        filters: {
          title: "Suche und Bereiche",
          content: "Suchen Sie einen Alarm oder Kunden, dann nach Bereich eingrenzen. Filter ändern nur die angezeigte Liste."
        },
        queue: {
          title: "Alarmwarteschlange",
          content: "Jede Karte hat dasselbe Format: Titel, Bereich, Status. Bestätigen, Support-/Service-Ticket, planen, lösen oder ignorieren."
        },
        fleet: {
          title: "Park",
          content: "Geräteliste der Kunden für Maßnahmen außerhalb der Alarmwarteschlange."
        },
        history: {
          title: "Verlauf",
          content: "Geschlossene oder mit einer Maßnahme verknüpfte Alarme inkl. Timeline."
        }
      }
    },
    ops: {
      kpi: {
        aria: "Alarmindikatoren",
        critical: "Kritisch",
        warning: "Warnungen",
        devices: "Geräte",
        backups: "Backups",
        contracts: "Verträge",
        rmm: "RMM offline"
      },
      domainAria: "Nach Bereich filtern",
      domains: {
        all: "Alle",
        devices: "Geräte",
        backups: "Backups",
        contracts: "Verträge",
        rmm: "RMM"
      },
      workflow: {
        aria: "Nach Status filtern",
        all: "Aktiv",
        open: "Offen",
        acked: "Bestätigt",
        linked: "Verknüpft",
        closed: "Geschlossen"
      },
      searchPlaceholder: "Alarm oder Kunde suchen…",
      emptyTitle: "Nichts zu erledigen",
      emptyText: "Keine aktiven Alarme für Geräte, Backups, Verträge oder RMM-Agenten.",
      actionsAria: "Alarmaktionen",
      severityInfo: "Info",
      collab: {
        handledBy: "Übernommen von {name}",
        ticketSupport: "Support-Ticket verknüpft",
        ticketPresta: "Service-Ticket verknüpft",
        planning: "Termin verknüpft",
        remediation: "Maßnahme verknüpft"
      },
      actions: {
        support: "Support-Ticket",
        presta: "Service-Ticket",
        plan: "Planen",
        open: "Öffnen",
        ack: "Bestätigen",
        resolve: "Lösen",
        dismiss: "Ignorieren"
      },
      actionHints: {
        ack: "Diesen Alarm bestätigen (übernehmen)",
        support: "Support-Ticket zu diesem Alarm erstellen",
        presta: "Service-Ticket zu diesem Alarm erstellen",
        plan: "Termin zu diesem Alarm planen",
        resolve: "Als gelöst markieren und in den Verlauf verschieben",
        dismiss: "Alarm ignorieren und in den Verlauf verschieben",
        open: "Zugehörigen Datensatz oder Details öffnen"
      },
      columns: {
        alert: "Alarm",
        company: "Unternehmen",
        domain: "Bereich",
        severity: "Schweregrad",
        status: "Status",
        when: "Datum",
        actions: "Aktionen"
      },
      toasts: {
        acked: "Alarm bestätigt",
        resolved: "Alarm gelöst — in den Verlauf verschoben",
        dismissed: "Alarm ignoriert — in den Verlauf verschoben",
        linked: "Maßnahme mit Alarm verknüpft",
        actionFailed: "Alarm konnte nicht aktualisiert werden"
      },
      detailBackups: "Backup-Details",
      detailContracts: "Verträge & Lizenzen",
      detailRmm: "RMM-Agenten",
      offline: "Offline"
    },
    history: {
      searchPlaceholder: "Verlauf durchsuchen…",
      loading: "Verlauf wird geladen…",
      loadingEvents: "Timeline wird geladen…",
      emptyTitle: "Kein Verlauf",
      emptyText: "Bestätigte, verknüpfte oder geschlossene Alarme erscheinen hier.",
      noEvents: "Keine Ereignisse",
      reopen: "Erneut öffnen",
      timelineTitle: "Timeline",
      filterAria: "Verlaufsfilter",
      systemActor: "System",
      unknownActor: "Unbekannter Benutzer",
      domains: {
        all: "Alle",
        devices: "Geräte",
        backups: "Backups",
        contracts: "Verträge",
        rmm: "RMM"
      },
      status: {
        all: "Alle Status",
        closed: "Geschlossen",
        acked: "Bestätigt",
        linked: "Verknüpft",
        open: "Offen"
      },
      actions: {
        opened: "Geöffnet",
        ack: "Bestätigt",
        unack: "Bestätigung aufgehoben",
        link: "Maßnahme verknüpft",
        resolved: "Gelöst",
        dismissed: "Ignoriert",
        reopen: "Erneut geöffnet",
        note: "Notiz"
      },
      columns: {
        alert: "Alarm",
        company: "Unternehmen",
        domain: "Bereich",
        status: "Status",
        when: "Datum",
        actions: "Aktionen"
      },
      actionHints: {
        reopen: "Diesen Alarm wieder öffnen und in die aktive Tabelle zurücksetzen",
        expand: "Timeline des Alarms anzeigen",
        collapse: "Timeline einklappen"
      }
    },
    fleet: {
      remediationSupport: "Support-Ticket",
      remediationPresta: "Service-Ticket",
      remediationPlan: "Planen"
    },
    contractStatus: {
      expired: "Abgelaufen",
      expiring: "Läuft bald ab",
      suspended: "Ausgesetzt"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Domainnamen",
      ssl: "SSL-Zertifikate",
      licences: "Lizenzen & Abonnements",
      o365: "Microsoft 365",
      backup: "Backup",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "MSP-Vertrag",
      enterprise: "Unternehmensvertrag",
      license: "Lizenz"
    },
    table: {
      name: "Name",
      type: "Typ",
      status: "Status",
      expiration: "Ablauf",
      actions: "Aktionen",
      sortBy: "Sortieren nach {label}"
    },
    contracts: {
      okTitle: "Verträge und Lizenzen OK",
      okText: "Keine abgelaufenen oder bald fälligen Verlängerungen in den nächsten 60 Tagen.",
      alertCount: "{count} Alarm",
      alertCountPlural: "{count} Alarme",
      expiredCount: "{count} abgelaufen",
      expiredCountPlural: "{count} abgelaufen",
      expiringCount: "{count} zu erneuern",
      viewEnterprise: "Unternehmen anzeigen",
      panelTitle: "Verträge & Lizenzen zu bearbeiten"
    },
    priority: {
      emptyTitle: "Keine Gerätealarme",
      emptyText: "Alle überwachten Geräte sind im Normalzustand.",
      intervene: "Eingreifen",
      analyze: "Analysieren",
      treat: "Bearbeiten",
      noName: "Ohne Name",
      storage: "Speicher",
      hints: {
        monitor_critical: "CheckMK-Alarm bearbeiten und Dienst wiederherstellen.",
        monitor_warning: "CheckMK-Warnung vor Verschlechterung analysieren.",
        agent_offline: "Strom, Netzwerk und RMM-Agent prüfen (offline seit über 48 h).",
        unmapped: "Gerät in der Hardware-Akte einem CheckMK-Host zuordnen.",
        no_data: "CheckMK-Mapping und Metriken prüfen.",
        warranty_expired: "Herstellergarantie erneuern oder aktualisieren.",
        warranty_soon: "Garantieverlängerung planen.",
        maintenance_expired: "Firewall-Wartungslizenz erneuern.",
        maintenance_soon: "Wartungslizenz rechtzeitig erneuern.",
        battery_expired: "USV-/PDU-Batterie ersetzen.",
        battery_soon: "Batterieersatz planen oder bestellen.",
        updates_pending: "Windows-Updates einplanen.",
        disk_critical: "Speicherplatz dringend freigeben oder erweitern.",
        disk_warn: "Speicherplatz überwachen und Bereinigung planen.",
        missing_ip: "IP-Adresse in der Hardware-Akte ergänzen."
      },
      statusHints: {
        critical: "Kritischer Überwachungsalarm · sofort handeln.",
        offline: "RMM-Agent offline · Konnektivität prüfen.",
        warning: "Überwachungswarnung · vor Verschlechterung analysieren.",
        unmapped: "Gerät nicht CheckMK zugeordnet · Überwachung aktivieren.",
        no_data: "Keine Überwachungsdaten · Mapping prüfen.",
        default: "Punkt aus der Hardware-Akte bearbeiten."
      }
    },
    familyStats: {
      emptyTitle: "Keine inventarisierten Geräte",
      emptyText: "Familienstatistiken erscheinen, sobald Hardware erfasst ist.",
      monitored: "Überwacht",
      uncovered: "Nicht abgedeckt",
      supervisedLabel: "überwacht",
      tooltip: "{label} · {monitored}/{total} überwacht",
      openFamily: "Geräte {label} anzeigen"
    },
    overview: {
      hexTitle: "Übersicht",
      hexKpi: {
        todo: "Zu erledigen",
        devices: "Geräte",
        issues: "Alarme",
        critical: "Kritisch",
        offline: "Offline",
        backups: "Backups",
        supervised: "Überwacht"
      },
      priorityTitle: "Priorität",
      viewAll: "Alle anzeigen",
      familyTitle: "Überwachung nach Gerätetyp"
    },
    search: {
      devices: "Gerät, Kunde, IP suchen…",
      rmm: "Arbeitsplatz, Kunde, IP, OS suchen…",
      clients: "Kunden",
      clearFilters: "Löschen ({count})",
      agentCount: "{count} Agent",
      agentCountPlural: "{count} Agenten"
    },
    rmm: {
      online: "Online",
      offline: "Offline",
      workstation: "Arbeitsplatz",
      viewWorkstation: "Arbeitsplatz anzeigen",
      panelTitle: "RMM-Agenten",
      offlineCount: "{count} offline",
      syncRequested: "Sync angefordert",
      lastActivity: "Letzte Aktivität",
      notLinked: "Arbeitsplatz nicht verknüpft",
      sortBy: "Sortieren nach {label}",
      summary: {
        workstation: "{count} Arbeitsplatz",
        workstationPlural: "{count} Arbeitsplätze",
        offline: "offline",
        pendingUpdates: "Updates ausstehend",
        diskAlert: "Festplatte > 85%",
        diskAlertPlural: "Festplatten > 85%"
      },
      table: {
        hostname: "Arbeitsplatz",
        client: "Kunde",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "Windows-Updates",
        agent: "Agent",
        lastSeen: "Letzte Aktivität",
        actions: "Aktionen"
      },
      empty: {
        noMatchTitle: "Kein passender Agent",
        allOnlineTitle: "Alle Agenten sind online",
        noAgentsTitle: "Keine RMM-Agenten",
        noMatchText: "Suche anpassen (Arbeitsplatz, Kunde, IP, OS, Domäne…).",
        allOnlineText: "Derzeit sind keine Arbeitsplätze offline.",
        noAgentsText: "Veritas-Agent auf Kunden-Arbeitsplätzen für RMM-Überwachung bereitstellen."
      },
      menu: {
        viewEnterprise: "Unternehmen anzeigen",
        cancelSync: "Vollsync abbrechen",
        fullSync: "Vollsync",
        metricsHistory: "Metrik-Verlauf",
        copyHost: "Arbeitsplatzname kopieren",
        copyIp: "IP-Adresse kopieren",
        revoke: "Agent widerrufen"
      },
      clipboard: {
        hostName: "Arbeitsplatzname",
        ipAddress: "IP-Adresse",
        copied: "{label} kopiert",
        copyFailed: "Kopieren nicht möglich"
      },
      toasts: {
        syncRequested: "Vollsync für {hostname} angefordert. Inventar wird beim nächsten Agentenlauf aktualisiert.",
        syncRequestFailed: "Synchronisation konnte nicht angefordert werden",
        syncCancelled: "Vollsync-Anfrage für {hostname} abgebrochen.",
        syncCancelFailed: "Synchronisation konnte nicht abgebrochen werden",
        revokeFailed: "Arbeitsplatz zum Widerruf dieses Agenten nicht gefunden",
        metricsNoEquipment: "Kein mit diesem Agenten verknüpftes Gerät für Metriken"
      }
    },
    time: {
      never: "Nie"
    },
    error: {
      title: "Ladefehler"
    }
  },
  it: {
    eyebrow: "Servizi gestiti",
    pageTitle: "Centro di supervisione",
    subtitle: "Centro notifiche · allarmi dispositivi, backup, contratti e RMM.",
    loading: "Scansione in corso…",
    tabSectionsAria: "Sezioni supervisione",
    tabs: {
      operations: "Allarmi",
      history: "Cronologia",
      settings: "Regole"
    },
    guide: {
      fabLabel: "Guida al centro di supervisione",
      tourTitle: "Centro di supervisione",
      steps: {
        hero: {
          title: "Centro notifiche",
          content: "Questa pagina raccoglie tutti gli allarmi infrastruttura: dispositivi, backup, contratti e agenti RMM. Consultali e agisci da una coda unica."
        },
        tabs: {
          title: "Viste principali",
          content: "Allarmi = tabella allarmi attivi. Cronologia = allarmi presi in carico o chiusi, con timeline. Regole (admin) = criteri di monitoraggio."
        },
        kpis: {
          title: "Indicatori",
          content: "Critici / Warning filtrano per severità. Dispositivi, Backup, Contratti e RMM filtrano la stessa coda — senza cambiare tipo di scheda."
        },
        filters: {
          title: "Ricerca e domini",
          content: "Cerca un allarme o un cliente, poi restringi per dominio. I filtri cambiano solo l'elenco mostrato."
        },
        queue: {
          title: "Coda allarmi",
          content: "Ogni scheda ha lo stesso formato: titolo, dominio, stato. Prendi in carico, ticket Support o Presta, pianifica, risolvi o ignora."
        },
        fleet: {
          title: "Parco",
          content: "Elenco dispositivi clienti per azioni fuori dalla coda allarmi."
        },
        history: {
          title: "Cronologia",
          content: "Trova allarmi chiusi o collegati a un rimedio, con timeline degli eventi."
        }
      }
    },
    ops: {
      kpi: {
        aria: "Indicatori allarmi",
        critical: "Critici",
        warning: "Warning",
        devices: "Dispositivi",
        backups: "Backup",
        contracts: "Contratti",
        rmm: "RMM offline"
      },
      domainAria: "Filtra per dominio",
      domains: {
        all: "Tutto",
        devices: "Dispositivi",
        backups: "Backup",
        contracts: "Contratti",
        rmm: "RMM"
      },
      workflow: {
        aria: "Filtra per stato",
        all: "Attive",
        open: "Aperte",
        acked: "Prese in carico",
        linked: "Collegate",
        closed: "Chiuse"
      },
      searchPlaceholder: "Cerca un allarme, un cliente…",
      emptyTitle: "Niente da trattare",
      emptyText: "Nessun allarme attivo su dispositivi, backup, contratti o agenti RMM.",
      actionsAria: "Azioni sull'allarme",
      severityInfo: "Info",
      collab: {
        handledBy: "Preso in carico da {name}",
        ticketSupport: "Ticket Support collegato",
        ticketPresta: "Ticket Presta collegato",
        planning: "Evento pianificato",
        remediation: "Rimedio collegato"
      },
      actions: {
        support: "Ticket Support",
        presta: "Ticket Presta",
        plan: "Pianifica",
        open: "Apri",
        ack: "Prendi in carico",
        resolve: "Risolvi",
        dismiss: "Ignora"
      },
      actionHints: {
        ack: "Prendi in carico questo allarme (ack)",
        support: "Crea un ticket Support collegato a questo allarme",
        presta: "Crea un ticket Presta collegato a questo allarme",
        plan: "Pianifica un evento collegato a questo allarme",
        resolve: "Segna come risolto e sposta in cronologia",
        dismiss: "Ignora l'allarme e spostalo in cronologia",
        open: "Apri la scheda o il dettaglio collegato"
      },
      columns: {
        alert: "Allarme",
        company: "Azienda",
        domain: "Dominio",
        severity: "Severità",
        status: "Stato",
        when: "Data",
        actions: "Azioni"
      },
      toasts: {
        acked: "Allarme preso in carico",
        resolved: "Allarme risolto — spostato in cronologia",
        dismissed: "Allarme ignorato — spostato in cronologia",
        linked: "Rimedio collegato all'allarme",
        actionFailed: "Impossibile aggiornare l'allarme"
      },
      detailBackups: "Dettaglio backup",
      detailContracts: "Dettaglio contratti e licenze",
      detailRmm: "Dettaglio agenti RMM",
      offline: "Offline"
    },
    history: {
      searchPlaceholder: "Cerca nella cronologia…",
      loading: "Caricamento cronologia…",
      loadingEvents: "Caricamento timeline…",
      emptyTitle: "Nessuna cronologia",
      emptyText: "Gli allarmi presi in carico, collegati o chiusi appariranno qui.",
      noEvents: "Nessun evento",
      reopen: "Riapri",
      timelineTitle: "Timeline",
      filterAria: "Filtri cronologia",
      systemActor: "Sistema",
      unknownActor: "Utente sconosciuto",
      domains: {
        all: "Tutto",
        devices: "Dispositivi",
        backups: "Backup",
        contracts: "Contratti",
        rmm: "RMM"
      },
      status: {
        all: "Tutti gli stati",
        closed: "Chiuse",
        acked: "Prese in carico",
        linked: "Collegate",
        open: "Aperte"
      },
      actions: {
        opened: "Aperto",
        ack: "Preso in carico",
        unack: "Ack annullato",
        link: "Rimedio collegato",
        resolved: "Risolto",
        dismissed: "Ignorato",
        reopen: "Riaperto",
        note: "Nota"
      },
      columns: {
        alert: "Allarme",
        company: "Azienda",
        domain: "Dominio",
        status: "Stato",
        when: "Data",
        actions: "Azioni"
      },
      actionHints: {
        reopen: "Riapri questo allarme e riportalo nella tabella attiva",
        expand: "Mostra la timeline dell'allarme",
        collapse: "Chiudi la timeline"
      }
    },
    fleet: {
      remediationPresta: "Ticket Presta",
      remediationPlan: "Pianifica"
    },
    contractStatus: {
      expired: "Scaduto",
      expiring: "In scadenza",
      suspended: "Sospeso"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Domini",
      ssl: "Certificati SSL",
      licences: "Licenze e abbonamenti",
      o365: "Microsoft 365",
      backup: "Backup",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "Contratto MSP",
      enterprise: "Contratto azienda",
      license: "Licenza"
    },
    table: {
      name: "Nome",
      type: "Tipo",
      status: "Stato",
      expiration: "Scadenza",
      actions: "Azioni",
      sortBy: "Ordina per {label}"
    },
    contracts: {
      okTitle: "Contratti e licenze OK",
      okText: "Nessuna scadenza o rinnovo entro i prossimi 60 giorni.",
      alertCount: "{count} alert",
      alertCountPlural: "{count} alert",
      expiredCount: "{count} scaduto",
      expiredCountPlural: "{count} scaduti",
      expiringCount: "{count} da rinnovare",
      viewEnterprise: "Vedi azienda",
      panelTitle: "Contratti e licenze da trattare"
    },
    priority: {
      emptyTitle: "Nessun alert dispositivo",
      emptyText: "Tutti gli equipaggiamenti supervisionati sono nominali.",
      intervene: "Intervenire",
      analyze: "Analizzare",
      treat: "Trattare",
      noName: "Senza nome",
      storage: "Storage",
      hints: {
        monitor_critical: "Intervenire sull'alert CheckMK e ripristinare il servizio.",
        monitor_warning: "Analizzare il warning CheckMK prima del degrado.",
        agent_offline: "Controllare alimentazione, rete e agente RMM (offline da oltre 48 h).",
        unmapped: "Associare l'equipaggiamento a un host CheckMK dalla scheda hardware.",
        no_data: "Verificare mapping CheckMK e metriche.",
        warranty_expired: "Rinnovare o aggiornare la garanzia costruttore.",
        warranty_soon: "Pianificare il rinnovo garanzia.",
        maintenance_expired: "Rinnovare la licenza manutenzione firewall.",
        maintenance_soon: "Anticipare il rinnovo licenza manutenzione.",
        battery_expired: "Sostituire la batteria UPS/PDU.",
        battery_soon: "Ordinare o pianificare sostituzione batteria.",
        updates_pending: "Pianificare installazione aggiornamenti Windows.",
        disk_critical: "Liberare o estendere spazio disco urgentemente.",
        disk_warn: "Monitorare spazio disco e pianificare pulizia.",
        missing_ip: "Completare l'indirizzo IP nella scheda hardware."
      },
      statusHints: {
        critical: "Alert supervisione critico · intervento immediato.",
        offline: "Agente RMM offline · verificare connettività.",
        warning: "Warning supervisione · analizzare prima del degrado.",
        unmapped: "Equipaggiamento non mappato CheckMK · attivare supervisione.",
        no_data: "Nessun dato supervisione · verificare mapping.",
        default: "Punto da trattare dalla scheda hardware."
      }
    },
    familyStats: {
      emptyTitle: "Nessun dispositivo inventariato",
      emptyText: "Le statistiche per famiglia appariranno con hardware registrato.",
      monitored: "Supervisionato",
      uncovered: "Non coperto",
      supervisedLabel: "supervisionato",
      tooltip: "{label} · {monitored}/{total} supervisionati",
      openFamily: "Vedi dispositivi {label}"
    },
    overview: {
      hexTitle: "Panoramica",
      hexKpi: {
        todo: "Da trattare",
        devices: "Dispositivi",
        issues: "Avvisi",
        critical: "Critici",
        offline: "Offline",
        backups: "Backup",
        supervised: "Supervisionato"
      },
      priorityTitle: "Da trattare in priorità",
      viewAll: "Vedi tutto",
      familyTitle: "Supervisione per tipo di dispositivo"
    },
    search: {
      devices: "Cerca dispositivo, cliente, IP…",
      rmm: "Cerca postazione, cliente, IP, OS…",
      clients: "Clienti",
      clearFilters: "Cancella ({count})",
      agentCount: "{count} agente",
      agentCountPlural: "{count} agenti"
    },
    rmm: {
      online: "Online",
      offline: "Offline",
      workstation: "Postazione",
      viewWorkstation: "Vedi postazione",
      panelTitle: "Agenti RMM",
      offlineCount: "{count} offline",
      syncRequested: "Sync richiesta",
      lastActivity: "Ultima attività",
      notLinked: "Postazione non collegata",
      sortBy: "Ordina per {label}",
      summary: {
        workstation: "{count} postazione",
        workstationPlural: "{count} postazioni",
        offline: "offline",
        pendingUpdates: "aggiornamenti in attesa",
        diskAlert: "disco > 85%",
        diskAlertPlural: "dischi > 85%"
      },
      table: {
        hostname: "Postazione",
        client: "Cliente",
        os: "OS",
        build: "Build",
        ip: "IP",
        updates: "Aggiornamenti Windows",
        agent: "Agente",
        lastSeen: "Ultima attività",
        actions: "Azioni"
      },
      empty: {
        noMatchTitle: "Nessun agente corrispondente",
        allOnlineTitle: "Tutti gli agenti sono online",
        noAgentsTitle: "Nessun agente RMM",
        noMatchText: "Modifica la ricerca (postazione, cliente, IP, OS, dominio…).",
        allOnlineText: "Nessuna postazione è attualmente offline.",
        noAgentsText: "Distribuisci l'agente Veritas sulle postazioni clienti per la supervisione RMM."
      },
      menu: {
        viewEnterprise: "Vedi azienda",
        cancelSync: "Annulla sync completo",
        fullSync: "Sync completo",
        metricsHistory: "Storico metriche",
        copyHost: "Copia nome postazione",
        copyIp: "Copia indirizzo IP",
        revoke: "Revoca agente"
      },
      clipboard: {
        hostName: "Nome postazione",
        ipAddress: "Indirizzo IP",
        copied: "{label} copiato",
        copyFailed: "Impossibile copiare"
      },
      toasts: {
        syncRequested: "Sync completo richiesto per {hostname}. L'inventario sarà aggiornato al prossimo passaggio dell'agente.",
        syncRequestFailed: "Impossibile richiedere la sincronizzazione",
        syncCancelled: "Richiesta sync completo annullata per {hostname}.",
        syncCancelFailed: "Impossibile annullare la sincronizzazione",
        revokeFailed: "Postazione non trovata per revocare questo agente",
        metricsNoEquipment: "Nessuna apparecchiatura collegata a questo agente per le metriche"
      }
    },
    time: {
      never: "Mai"
    },
    error: {
      title: "Errore di caricamento"
    }
  },
  es: {
    eyebrow: "Servicios gestionados",
    pageTitle: "Centro de supervisión",
    subtitle: "Centro de notificaciones · alertas de dispositivos, backups, contratos y RMM.",
    loading: "Escaneo en curso…",
    tabSectionsAria: "Secciones de supervisión",
    tabs: {
      operations: "Alertas",
      history: "Historial",
      settings: "Reglas"
    },
    guide: {
      fabLabel: "Guía del centro de supervisión",
      tourTitle: "Centro de supervisión",
      steps: {
        hero: {
          title: "Centro de notificaciones",
          content: "Esta página reúne todas las alertas de infraestructura: dispositivos, backups, contratos y agentes RMM. Consúltelas y actúe desde una cola única."
        },
        tabs: {
          title: "Vistas principales",
          content: "Alertas = tabla de alertas activas. Historial = alertas acusadas o cerradas, con cronología. Reglas (admin) = criterios de monitorización."
        },
        kpis: {
          title: "Indicadores",
          content: "Críticas / Warnings filtran por severidad. Dispositivos, Backups, Contratos y RMM filtran la misma cola — sin cambiar el tipo de tarjeta."
        },
        filters: {
          title: "Búsqueda y dominios",
          content: "Busque una alerta o un cliente, luego acote por dominio. Los filtros solo cambian la lista mostrada."
        },
        queue: {
          title: "Cola de alertas",
          content: "Cada tarjeta tiene el mismo formato: título, dominio, estado. Acuse, ticket Soporte o Presta, planifique, resuelva o ignore."
        },
        fleet: {
          title: "Parque",
          content: "Listado de dispositivos de clientes para actuar fuera de la cola de alertas."
        },
        history: {
          title: "Historial",
          content: "Encuentre alertas cerradas o vinculadas a una remediación, con su timeline de eventos."
        }
      }
    },
    ops: {
      kpi: {
        aria: "Indicadores de alertas",
        critical: "Críticas",
        warning: "Warnings",
        devices: "Dispositivos",
        backups: "Backups",
        contracts: "Contratos",
        rmm: "RMM offline"
      },
      domainAria: "Filtrar por dominio",
      domains: {
        all: "Todo",
        devices: "Dispositivos",
        backups: "Backups",
        contracts: "Contratos",
        rmm: "RMM"
      },
      workflow: {
        aria: "Filtrar por estado",
        all: "Activas",
        open: "Abiertas",
        acked: "Acusadas",
        linked: "Vinculadas",
        closed: "Cerradas"
      },
      searchPlaceholder: "Buscar una alerta, un cliente…",
      emptyTitle: "Nada que tratar",
      emptyText: "No hay alertas activas en dispositivos, backups, contratos o agentes RMM.",
      actionsAria: "Acciones sobre la alerta",
      severityInfo: "Info",
      collab: {
        handledBy: "A cargo de {name}",
        ticketSupport: "Ticket Soporte vinculado",
        ticketPresta: "Ticket Presta vinculado",
        planning: "Evento planificado",
        remediation: "Remediación vinculada"
      },
      actions: {
        support: "Ticket Soporte",
        presta: "Ticket Presta",
        plan: "Planificar",
        open: "Abrir",
        ack: "Acusar recibo",
        resolve: "Resolver",
        dismiss: "Ignorar"
      },
      actionHints: {
        ack: "Acusar recibo de esta alerta (tomar cargo)",
        support: "Crear un ticket Soporte vinculado a esta alerta",
        presta: "Crear un ticket Presta vinculado a esta alerta",
        plan: "Planificar un evento vinculado a esta alerta",
        resolve: "Marcar como resuelta y enviar al historial",
        dismiss: "Ignorar la alerta y enviarla al historial",
        open: "Abrir la ficha o el detalle vinculado"
      },
      columns: {
        alert: "Alerta",
        company: "Empresa",
        domain: "Dominio",
        severity: "Severidad",
        status: "Estado",
        when: "Fecha",
        actions: "Acciones"
      },
      toasts: {
        acked: "Alerta acusada",
        resolved: "Alerta resuelta — movida al historial",
        dismissed: "Alerta ignorada — movida al historial",
        linked: "Remediación vinculada a la alerta",
        actionFailed: "No se pudo actualizar la alerta"
      },
      detailBackups: "Detalle backups",
      detailContracts: "Detalle contratos y licencias",
      detailRmm: "Detalle agentes RMM",
      offline: "Fuera de línea"
    },
    history: {
      searchPlaceholder: "Buscar en el historial…",
      loading: "Cargando historial…",
      loadingEvents: "Cargando timeline…",
      emptyTitle: "Sin historial",
      emptyText: "Las alertas acusadas, vinculadas o cerradas aparecerán aquí.",
      noEvents: "Sin eventos",
      reopen: "Reabrir",
      timelineTitle: "Timeline",
      filterAria: "Filtros del historial",
      systemActor: "Sistema",
      unknownActor: "Usuario desconocido",
      domains: {
        all: "Todo",
        devices: "Dispositivos",
        backups: "Backups",
        contracts: "Contratos",
        rmm: "RMM"
      },
      status: {
        all: "Todos los estados",
        closed: "Cerradas",
        acked: "Acusadas",
        linked: "Vinculadas",
        open: "Abiertas"
      },
      actions: {
        opened: "Abierta",
        ack: "Acusada",
        unack: "Ack anulado",
        link: "Remediación vinculada",
        resolved: "Resuelta",
        dismissed: "Ignorada",
        reopen: "Reabierta",
        note: "Nota"
      },
      columns: {
        alert: "Alerta",
        company: "Empresa",
        domain: "Dominio",
        status: "Estado",
        when: "Fecha",
        actions: "Acciones"
      },
      actionHints: {
        reopen: "Reabrir esta alerta y devolverla a la tabla activa",
        expand: "Mostrar la cronología de la alerta",
        collapse: "Ocultar la cronología"
      }
    },
    fleet: {
      remediationSupport: "Ticket Soporte",
      remediationPresta: "Ticket Presta",
      remediationPlan: "Planificar"
    },
    contractStatus: {
      expired: "Expirado",
      expiring: "Expira pronto",
      suspended: "Suspendido"
    },
    licenseModules: {
      antivirus: "Antivirus",
      antispam: "Antispam",
      domain: "Dominios",
      ssl: "Certificados SSL",
      licences: "Licencias y suscripciones",
      o365: "Microsoft 365",
      backup: "Copia de seguridad",
      firewall: "Firewall",
      toip: "VoIP"
    },
    contractType: {
      msp: "Contrato MSP",
      enterprise: "Contrato empresa",
      license: "Licencia"
    },
    table: {
      name: "Nombre",
      type: "Tipo",
      status: "Estado",
      expiration: "Expiración",
      actions: "Acciones",
      sortBy: "Ordenar por {label}"
    },
    contracts: {
      okTitle: "Contratos y licencias OK",
      okText: "Ningún vencimiento o renovación en los próximos 60 días.",
      alertCount: "{count} alerta",
      alertCountPlural: "{count} alertas",
      expiredCount: "{count} expirado",
      expiredCountPlural: "{count} expirados",
      expiringCount: "{count} por renovar",
      viewEnterprise: "Ver empresa",
      panelTitle: "Contratos y licencias por tratar"
    },
    priority: {
      emptyTitle: "Ninguna alerta de dispositivo",
      emptyText: "Todos los equipos supervisados están en estado nominal.",
      intervene: "Intervenir",
      analyze: "Analizar",
      treat: "Tratar",
      noName: "Sin nombre",
      storage: "Almacenamiento",
      hints: {
        monitor_critical: "Actuar sobre la alerta CheckMK y restablecer el servicio.",
        monitor_warning: "Analizar el warning CheckMK antes de la degradación.",
        agent_offline: "Comprobar alimentación, red y agente RMM (offline más de 48 h).",
        unmapped: "Asociar el equipo a un host CheckMK desde la ficha hardware.",
        no_data: "Verificar mapping CheckMK y métricas.",
        warranty_expired: "Renovar o actualizar la garantía del fabricante.",
        warranty_soon: "Planificar renovación de garantía.",
        maintenance_expired: "Renovar licencia de mantenimiento firewall.",
        maintenance_soon: "Anticipar renovación de licencia de mantenimiento.",
        battery_expired: "Reemplazar batería SAI/PDU.",
        battery_soon: "Pedir o planificar reemplazo de batería.",
        updates_pending: "Planificar instalación de actualizaciones Windows.",
        disk_critical: "Liberar o ampliar espacio en disco urgentemente.",
        disk_warn: "Supervisar espacio en disco y planificar limpieza.",
        missing_ip: "Completar la dirección IP en la ficha hardware."
      },
      statusHints: {
        critical: "Alerta crítica de supervisión · intervención inmediata.",
        offline: "Agente RMM offline · verificar conectividad.",
        warning: "Warning de supervisión · analizar antes de degradación.",
        unmapped: "Equipo no mapeado CheckMK · activar supervisión.",
        no_data: "Sin datos de supervisión · verificar mapping.",
        default: "Punto a tratar desde la ficha hardware."
      }
    },
    familyStats: {
      emptyTitle: "Ningún dispositivo inventariado",
      emptyText: "Las estadísticas por familia aparecerán al registrar hardware.",
      monitored: "Supervisado",
      uncovered: "No cubierto",
      supervisedLabel: "supervisado",
      tooltip: "{label} · {monitored}/{total} supervisados",
      openFamily: "Ver dispositivos {label}"
    },
    overview: {
      hexTitle: "Resumen",
      hexKpi: {
        todo: "Por tratar",
        devices: "Dispositivos",
        issues: "Alertas",
        critical: "Críticos",
        offline: "Desconectados",
        backups: "Copias",
        supervised: "Supervisado"
      },
      priorityTitle: "Prioridad",
      viewAll: "Ver todo",
      familyTitle: "Supervisión por tipo de dispositivo"
    },
    search: {
      devices: "Buscar dispositivo, cliente, IP…",
      rmm: "Buscar equipo, cliente, IP, SO…",
      clients: "Clientes",
      clearFilters: "Borrar ({count})",
      agentCount: "{count} agente",
      agentCountPlural: "{count} agentes"
    },
    rmm: {
      online: "En línea",
      offline: "Desconectado",
      workstation: "Equipo",
      viewWorkstation: "Ver equipo",
      panelTitle: "Agentes RMM",
      offlineCount: "{count} desconectados",
      syncRequested: "Sync solicitada",
      lastActivity: "Última actividad",
      notLinked: "Equipo no vinculado",
      sortBy: "Ordenar por {label}",
      summary: {
        workstation: "{count} equipo",
        workstationPlural: "{count} equipos",
        offline: "desconectados",
        pendingUpdates: "actualizaciones pendientes",
        diskAlert: "disco > 85%",
        diskAlertPlural: "discos > 85%"
      },
      table: {
        hostname: "Equipo",
        client: "Cliente",
        os: "SO",
        build: "Build",
        ip: "IP",
        updates: "Actualizaciones Windows",
        agent: "Agente",
        lastSeen: "Última actividad",
        actions: "Acciones"
      },
      empty: {
        noMatchTitle: "Ningún agente coincide",
        allOnlineTitle: "Todos los agentes están en línea",
        noAgentsTitle: "Ningún agente RMM",
        noMatchText: "Ajusta la búsqueda (equipo, cliente, IP, SO, dominio…).",
        allOnlineText: "Ningún equipo está desconectado actualmente.",
        noAgentsText: "Despliega el agente Veritas en los equipos clientes para la supervisión RMM."
      },
      menu: {
        viewEnterprise: "Ver empresa",
        cancelSync: "Cancelar sync completo",
        fullSync: "Sync completo",
        metricsHistory: "Historial de métricas",
        copyHost: "Copiar nombre del equipo",
        copyIp: "Copiar dirección IP",
        revoke: "Revocar agente"
      },
      clipboard: {
        hostName: "Nombre del equipo",
        ipAddress: "Dirección IP",
        copied: "{label} copiado",
        copyFailed: "No se puede copiar"
      },
      toasts: {
        syncRequested: "Sync completo solicitado para {hostname}. El inventario se actualizará en el próximo paso del agente.",
        syncRequestFailed: "No se puede solicitar la sincronización",
        syncCancelled: "Solicitud de sync completo cancelada para {hostname}.",
        syncCancelFailed: "No se puede cancelar la sincronización",
        revokeFailed: "Equipo no encontrado para revocar este agente",
        metricsNoEquipment: "Ningún equipo vinculado a este agente para mostrar métricas"
      }
    },
    time: {
      never: "Nunca"
    },
    error: {
      title: "Error de carga"
    }
  }
};
const TAB_ICONS = {
  operations: "mdi:lightning-bolt",
  history: "mdi:history",
  settings: "mdi:bell-cog-outline"
};
const LICENSE_MODULE_ICONS = {
  antivirus: "mdi:shield-search",
  antispam: "mdi:email-secure-outline",
  domain: "mdi:web",
  ssl: "mdi:certificate-outline",
  licences: "mdi:license",
  o365: "mdi:microsoft",
  backup: "mdi:backup-restore",
  firewall: "mdi:shield-outline",
  toip: "mdi:phone-voip"
};
export function getSupervisionCenterCopy(locale) {
  const t = pickLocaleMessages(SUPERVISION_COPY, locale);
  return {
    ...t,
    tabs: TAB_IDS.map(id => ({
      id,
      label: t.tabs[id],
      icon: TAB_ICONS[id]
    })),
    licenseModuleSections: LICENSE_MODULE_KEYS.map(module => ({
      module,
      label: t.licenseModules[module],
      icon: LICENSE_MODULE_ICONS[module]
    })),
    contractStatusMeta: {
      expired: {
        label: t.contractStatus.expired,
        classKey: "expired"
      },
      expiring: {
        label: t.contractStatus.expiring,
        classKey: "expiring"
      },
      suspended: {
        label: t.contractStatus.suspended,
        classKey: "suspended"
      }
    },
    tableColumns: [{
      key: "name",
      label: t.table.name,
      sortable: true
    }, {
      key: "type",
      label: t.table.type,
      sortable: true
    }, {
      key: "status",
      label: t.table.status,
      sortable: true
    }, {
      key: "expiration",
      label: t.table.expiration,
      sortable: true
    }],
    formatAlertCount: count => interpolate(count === 1 ? t.contracts.alertCount : t.contracts.alertCountPlural, {
      count: String(count)
    }),
    formatExpiredCount: count => interpolate(count === 1 ? t.contracts.expiredCount : t.contracts.expiredCountPlural, {
      count: String(count)
    }),
    formatExpiringCount: count => interpolate(t.contracts.expiringCount, {
      count: String(count)
    }),
    formatAgentCount: count => interpolate(count === 1 ? t.search.agentCount : t.search.agentCountPlural, {
      count: String(count)
    }),
    formatSortBy: label => interpolate(t.table.sortBy, {
      label
    }),
    formatRmmSortBy: label => interpolate(t.rmm.sortBy, {
      label
    }),
    formatRmmOfflineCount: count => interpolate(t.rmm.offlineCount, {
      count: String(count)
    }),
    formatRmmWorkstationCount: count => interpolate(count === 1 ? t.rmm.summary.workstation : t.rmm.summary.workstationPlural, {
      count: String(count)
    }),
    formatRmmDiskAlerts: count => interpolate(count === 1 ? t.rmm.summary.diskAlert : t.rmm.summary.diskAlertPlural, {
      count: String(count)
    }),
    formatRmmSyncToast: hostname => interpolate(t.rmm.toasts.syncRequested, {
      hostname: hostname || t.rmm.workstation
    }),
    formatRmmSyncCancelledToast: hostname => interpolate(t.rmm.toasts.syncCancelled, {
      hostname: hostname || t.rmm.workstation
    }),
    formatClipboardCopied: label => interpolate(t.rmm.clipboard.copied, {
      label
    }),
    rmmTableColumns: [{
      key: "hostname",
      label: t.rmm.table.hostname,
      sortable: true
    }, {
      key: "client_name",
      label: t.rmm.table.client,
      sortable: true
    }, {
      key: "os",
      label: t.rmm.table.os,
      sortable: true
    }, {
      key: "os_build",
      label: t.rmm.table.build,
      sortable: true
    }, {
      key: "ip",
      label: t.rmm.table.ip,
      sortable: true
    }, {
      key: "updates_pending",
      label: t.rmm.table.updates,
      sortable: true
    }, {
      key: "agent_version",
      label: t.rmm.table.agent,
      sortable: true
    }, {
      key: "last_seen_at",
      label: t.rmm.table.lastSeen,
      sortable: true
    }],
    getPriorityHint: key => t.priority.hints[key] || null,
    getPriorityStatusHint: status => t.priority.statusHints[status] || t.priority.statusHints.default,
    getLicenseModuleLabel: module => t.licenseModules[module] || module
  };
}
