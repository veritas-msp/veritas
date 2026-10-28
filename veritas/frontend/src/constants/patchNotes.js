/**
 * Changelog affiché dans Compte → Patch notes.
 * À chaque commit+push : bump package.json (root/frontend/backend) + ajouter une entrée ici.
 * Les notes sont rédigées en français (UI de page traduite via i18n).
 */
export const PATCH_NOTES = [
  {
    version: "2.0.2",
    date: "2026-10-27",
    highlights: [
      "Rapports de supervision : tables arrondies avec fondu haut/bas, fade au changement d’étape, colonnes et dates en français.",
      "Tenant Microsoft (Office 365) dans le builder : une carte, onglets animés, KPI plats, recherche et tables unifiées.",
      "Modal CheckMK et panneau commentaires du builder modernisés ; tickets équipement cliquables avec modal dédié.",
      "Sauvegarde / jobs : libellés de statut clarifiés ; cartographie et aperçu sauvegarde entreprise peaufinés.",
      "Fiches contact, matériel et planning : polish UI (modals, documents, préselection matériel)."
    ]
  },
  {
    version: "2.0.1",
    date: "2026-10-27",
    highlights: [
      "Fiche matériel : navigation RMM / Supervision aplatie, fade des sous-sections, aside Associations avec mapping CheckMK.",
      "Fiche matériel : menu « plus » en portal (plus de découpe), section Maintenance aérée, typo IP/VLAN unifiée.",
      "Modals maintenance et ajout de document alignés sur le style Enterprise (animations, icônes animées, hauteur adaptée).",
      "Planning : préselection automatique du matériel lié quand on planifie depuis une fiche.",
      "Documents et activité : placeholder recherche « Rechercher » ; plage personnalisée sans décalage de layout."
    ]
  },
  {
    version: "2.0.0",
    date: "2026-10-27",
    highlights: [
      "Version majeure 2.0.0 — refonte UX des hubs Documents, rapports de supervision et vues tickets.",
      "Coffre / Documents : filtre type en pastilles, visibilité en icônes œil, dates avec heure, édition de masse reconstruite.",
      "Rapports supervision : sujets par catégories (on/off), retour wizard vers l’étape client, Entra ID + modules bientôt (SSL, Licences, Google Workspace).",
      "Modals confirmation et sync rapport : style plat thématisé, en-tête compact et animations progressives.",
      "Écrans de disponibilité : greyscale + melting face ; écrans indisponibles plus clairs.",
      "Tickets Support / Prestations : vues personnalisées enrichies (overrides builtin, règles SQL), listes et modals de vues modernisés.",
      "Fiches contact et prestataire alignées ; boot gate pages et polish sidebar / UiKit."
    ]
  },
  {
    version: "1.0.101",
    date: "2026-10-15",
    highlights: [
      "Tickets support : correction de l’écran blanc (variable isReadOnly lue trop tôt au montage).",
      "Tickets support et prestation : glisser-déposer depuis l’Explorateur (docs, e-mails .eml/.msg, ZIP, etc.).",
      "Zone de dépôt élargie à toute la discussion ; documents de tâches prestation aussi."
    ]
  },
  {
    version: "1.0.100",
    date: "2026-10-15",
    highlights: [
      "Notifications : les tickets prestation s’ouvrent sur la bonne page (/sales) au lieu du détail support.",
      "Correction de l’écran blanc au clic notif (dépendance circulaire prise en main distante / journal matériel)."
    ]
  },
  {
    version: "1.0.99",
    date: "2026-10-15",
    highlights: [
      "Administration SLA : horaires toujours éditables, heures travaillées / semaine, décompte SLA en temps ouvré.",
      "Prestations : stats tâches exprimées en jours selon la journée standard (heures / semaine).",
      "Inventaire matériel et fiche entreprise : colonnes RMM (pastille) et Version agent.",
      "Notifications tickets : ouverture via le numéro de ticket (URL correcte)."
    ]
  },
  {
    version: "1.0.98",
    date: "2026-10-14",
    highlights: [
      "Campagnes : suppression via un vrai modal de confirmation ; liste rafraîchie après création / édition / suppression.",
      "Fiche périphérique : notes remises dans la colonne droite, avec espacement sous le titre de section.",
      "Liste matériel (ordinateurs) : colonne RMM avec pastille verte (agent installé) ou grise (absent).",
      "Administration RMM · Agents : mise à jour par sélection, par entreprise ou par vague."
    ]
  },
  {
    version: "1.0.97",
    date: "2026-10-14",
    highlights: [
      "Tickets : correction de l’écran blanc dû à une dépendance circulaire des formulaires équipement.",
      "Prise en main à distance serveur : journalisation chargée à la demande pour éviter les cycles d’import."
    ]
  },
  {
    version: "1.0.96",
    date: "2026-10-14",
    highlights: [
      "Tickets : mention @agent ou @équipe dans une réponse, avec notification in-app aux personnes concernées.",
      "Campagnes : correction de la liste globale vide (campagnes clients à nouveau visibles)."
    ]
  },
  {
    version: "1.0.95",
    date: "2026-10-14",
    highlights: [
      "Instance sauvegarde / jobs : les jobs non synchronisés s’affichent en « En attente » au lieu d’« Error ».",
      "Tickets prestation : à l’upload d’un document de tâche, option coffre-fort client et visibilité portail."
    ]
  },
  {
    version: "1.0.94",
    date: "2026-10-14",
    highlights: [
      "Tickets : images collées dans une réponse restent à leur place dans le message publié.",
      "Tickets : correction de l’affichage « -> » (plus de « -&gt; ») dans les messages postés.",
      "Tickets : suppression du cadenas en double / superposé sur les réponses internes.",
      "Fiche périphérique : onglets regroupés (Informations, Activité–Documents–Logs, RMM, Supervision) et Synthèse RMM enrichie (CPU, mémoire, stockage, réseau).",
      "Fiche périphérique : mise en page densifiée, note appareil dans le hero, états vides unifiés.",
      "Journal d’activité : bouton Purge déplacé dans la barre d’outils (à droite de la recherche)."
    ]
  },
  {
    version: "1.0.93",
    date: "2026-10-13",
    highlights: [
      "Fiche campagne MFA : layout 3 colonnes (propriétés type ticket, onglets, actions rapides).",
      "Gestion unifiée : création des phases, planning/assignations et suivi du temps passé.",
      "Nouvel onglet Documents pour la documentation portail client ; checklist et notes retirées de Gestion.",
      "KPIs Microsoft Security sur une ligne, adoption j-1, et dropdown d’assignation des phases corrigé.",
      "Fiche périphérique : états vides unifiés sur les panneaux (notes, docs, supervision, etc.)."
    ]
  },
  {
    version: "1.0.92",
    date: "2026-10-13",
    highlights: [
      "Fiche périphérique : Synthèse et Informations matériel en onglets dédiés (Dashboard retiré).",
      "Activité : statistiques à gauche, événements liés à droite ; Documents : glisser-déposer ; Logs en table pleine hauteur.",
      "Supervision Main : header CheckMK clarifié (identité hôte + KPIs Santé / Disponibilité / Événements).",
      "Journal d’activité ajouté aux fiches entreprise, contact et prestataire, avec plus d’actions tracées."
    ]
  },
  {
    version: "1.0.91",
    date: "2026-10-13",
    highlights: [
      "Fiche entreprise : client en onboarding avec badge et header teinté, comme un périphérique en maintenance."
    ]
  },
  {
    version: "1.0.90",
    date: "2026-10-13",
    highlights: [
      "Fiche périphérique : onglets réordonnés (Dashboard, Supervision, Activité, Documents, Logs).",
      "Supervision : sous-onglets Main / Historique ; Historique retiré de la barre principale.",
      "Vue d’ensemble : Synthèse et Informations matériel en pleine hauteur ; libellés clarifiés.",
      "Actions rapides : prise en main à distance et QuickConnect en tête ; bouton événement retiré de la carte événements liés."
    ]
  },
  {
    version: "1.0.89",
    date: "2026-10-13",
    highlights: [
      "Fiche périphérique : toutes les cartes des onglets alignées sur le style du Journal d’activité (typo, en-têtes, ombres)."
    ]
  },
  {
    version: "1.0.88",
    date: "2026-10-13",
    highlights: [
      "Fiche périphérique : vue d’ensemble densifiée (cartes seules, sans cadre Fiche matériel) pour tenir sans scroll.",
      "Nouvel onglet Historique : alertes récentes et périodes de maintenance côte à côte.",
      "Colonne droite périphérique : styles strictement alignés sur les fiches entreprise / contact."
    ]
  },
  {
    version: "1.0.87",
    date: "2026-10-12",
    highlights: [
      "Fiche périphérique : onglets en pleine hauteur, colonne droite type CRM, notes dans la sidebar.",
      "Vue d’ensemble périphérique : sous-onglets Fiche / RMM / Supervision selon le suivi.",
      "Activité périphérique : Interventions, Maintenance et Métriques séparés pour mieux tenir en hauteur.",
      "Fiches entreprise / contact : cache et onglets plus stables à la navigation.",
      "Documents périphérique : état vide aligné sur celui des tickets de l’accueil."
    ]
  },
  {
    version: "1.0.86",
    date: "2026-10-12",
    highlights: [
      "Fiche entreprise : espacement sous l’en-tête de la section Notes."
    ]
  },
  {
    version: "1.0.85",
    date: "2026-10-12",
    highlights: [
      "Supervision : panneau maintenance enrichi (entreprise, icônes, recherche, tri par date).",
      "Fiche / sites équipement : cône de maintenance, motif visible, tooltip clarifié.",
      "Coffre-fort entreprise : renommage à l’ajout/édition et colonne Description."
    ]
  },
  {
    version: "1.0.84",
    date: "2026-10-12",
    highlights: [
      "Fiche périphérique : historique de maintenance dans la colonne RMM, KPIs CheckMK condensés.",
      "Matériel : colonne OS au filtre Serveurs / Ordinateurs ; filtres, page et scroll mémorisés à la navigation.",
      "Correction du saut de colonnes des tableaux (scrollbar) et de l’historique de maintenance."
    ]
  },
  {
    version: "1.0.83",
    date: "2026-10-12",
    highlights: [
      "Fiche périphérique : historique des périodes de maintenance.",
      "Tickets support / prestations : URLs avec le numéro (#1042) au lieu de l’UUID.",
      "Vue d’ensemble : cartes RMM d’un côté, supervision CheckMK de l’autre.",
      "Correction du mapping CheckMK pour les serveurs (enregistrement et suppression)."
    ]
  },
  {
    version: "1.0.82",
    date: "2026-10-12",
    highlights: [
      "Centre de supervision : lien Ticket #… depuis le statut d’une alerte liée.",
      "Centre de supervision : clic sur le périphérique (à traiter / en cours / en attente) ouvre la fiche ; le reste de la ligne ne navigue plus.",
      "Historique : timeline avec lien vers le ticket associé et son numéro."
    ]
  },
  {
    version: "1.0.81",
    date: "2026-10-12",
    highlights: [
      "Fiche entreprise : signal fort pour les clients inactifs (bandeau, header teinté, badge renforcé)."
    ]
  },
  {
    version: "1.0.80",
    date: "2026-10-12",
    highlights: [
      "Centre de supervision : panneau maintenance affiche aussi les maintenances par service.",
      "Centre de supervision : clic molette sur une alerte ouvre la fiche périphérique en nouvel onglet.",
      "Centre de supervision : correction du bouton Terminer (onglet En attente)."
    ]
  },
  {
    version: "1.0.79",
    date: "2026-10-12",
    highlights: [
      "Instance de sauvegarde : layout type antivirus (sections à gauche, contenu scrollable), sync si mapping, sans boutons Retour / Entreprise."
    ]
  },
  {
    version: "1.0.78",
    date: "2026-10-12",
    highlights: [
      "Fiche équipement : indicateur maintenance visible (bandeau + badge), header sans crop.",
      "Supervision : vue allégée, events Centre vs CheckMK, boutons mapping/refresh retirés du bandeau.",
      "Vue d’ensemble : dates des derniers événements et type capitalisé (sans colonne statut redondante).",
      "Activité RMM : KPI CPU / RAM / Disque en 3 colonnes ; température et Windows Update retirés."
    ]
  },
  {
    version: "1.0.77",
    date: "2026-10-12",
    highlights: [
      "Centre de supervision : correction du crash page blanche (FAMILY_COVERAGE_KEY manquant)."
    ]
  },
  {
    version: "1.0.76",
    date: "2026-10-12",
    highlights: [
      "Centre de supervision : correction page blanche (hauteur flex / layout ops)."
    ]
  },
  {
    version: "1.0.75",
    date: "2026-10-12",
    highlights: [
      "Rapports intervention & audit : branding admin (couleurs plates), aperçu fidèle et téléchargement HTML.",
      "Centre de supervision : triage (ignorer, maintenance, historiser) et snapshots d’état du parc.",
      "Tickets : conversations latérales (side conversations) pour les échanges parallèles.",
      "Fiches entreprise / équipement : vue d’ensemble enrichie, skeletons et icônes client.",
      "Admin : branding login & rapports, campagnes, et nombreux raffinements UI / i18n."
    ]
  },
  {
    version: "1.0.74",
    date: "2026-10-08",
    highlights: [
      "Accueil — Mes événements : frise horizontale 7 jours (compteurs) et carte plus compacte."
    ]
  },
  {
    version: "1.0.73",
    date: "2026-10-08",
    highlights: [
      "Sidebar : libellés des pages visibles par défaut, avec bouton pour plier/déplier le mode icônes."
    ]
  },
  {
    version: "1.0.72",
    date: "2026-10-08",
    highlights: [
      "Accueil : bloc Centre de supervision sous Mes événements (KPI alertes + état du parc + évolution 7 jours)."
    ]
  },
  {
    version: "1.0.71",
    date: "2026-10-08",
    highlights: [
      "Fiche entreprise — État global du parc : tous les statuts restent visibles à droite (y compris à 0).",
      "Vue d'ensemble : Alertes par priorité basées sur le statut supervision des périphériques (Critique / Warning / OK).",
      "Vue d'ensemble : évolution 7 jours alimentée uniquement par l'historique des alertes en base.",
      "Fiche entreprise : Contrats & Services en section latérale pliable (icône, libellé, Actif/Inactif).",
      "Fiche périphérique : onglet Supervision affiché dès qu'un mapping CheckMK existe (aliases FR / types mappables).",
      "Vue d'ensemble : évolution 7 jours basée sur les events/notifications CheckMK (Critique / Warning)."
    ]
  },
  {
    version: "1.0.70",
    date: "2026-10-06",
    highlights: [
      "Règles d’alertes : garantie, licence de maintenance et batterie réglables par famille de périphérique.",
      "File du centre : ces alertes n’apparaissent plus si la règle est désactivée.",
      "Recherche alertes / historique : titre, entreprise, IP, hôte et autres champs du matériel."
    ]
  },
  {
    version: "1.0.69",
    date: "2026-10-06",
    highlights: [
      "Centre de supervision : suppression du critère « IP non renseignée » (aligné sur les règles critique / warning / sans données).",
      "Titres d’alertes corrigés (libellés FR propres, plus de textes mélangés type expirede / Since le).",
      "Cartes de statut sync / poller du centre : hauteur et style uniformisés."
    ]
  },
  {
    version: "1.0.68",
    date: "2026-10-06",
    highlights: [
      "Centre de supervision : titres d’alertes condensés (badge sur la même ligne).",
      "Règles d’alertes : section Contrats (MSP expiré / bientôt / suspendu et licences) avec reconcile automatique.",
      "Historique : sélection multiple et actions de masse (corbeille, restauration, suppression, réouverture)."
    ]
  },
  {
    version: "1.0.67",
    date: "2026-10-05",
    highlights: [
      "Tickets et formulaires : association entreprise + lieu (site), avec champ Lieu dans les formulaires support/vente.",
      "Tableau de bord KPI : activité par famille de matériel (tickets, résolutions, catégories, alertes) filtrable par entreprise et lieu.",
      "Centre de supervision : correction du rognage des actions et du menu Suspendre masqué."
    ]
  },
  {
    version: "1.0.66",
    date: "2026-10-05",
    highlights: [
      "Centre de supervision : indicateur de fraîcheur des données CheckMK et resync d’un hôte depuis une alerte.",
      "Mute temporaire / désactivation des alertes depuis le centre (même réglage que la fiche périphérique).",
      "Diagnostic admin d’une alerte : service, sync, règle, fingerprint et motif d’ouverture/fermeture."
    ]
  },
  {
    version: "1.0.65",
    date: "2026-10-05",
    highlights: [
      "Centre de supervision : une alerte par service CheckMK en warning ou critique, créée à chaque sync (poller ou manuelle).",
      "Retour à OK : l’alerte disparaît automatiquement et passe en historique (résolue).",
      "Règles du centre limitées au monitoring : critique, warning et absence de données."
    ]
  },
  {
    version: "1.0.64",
    date: "2026-10-05",
    highlights: [
      "Supervision : sync auto CheckMK réactivée selon le réglage Administration → Intégrations → CheckMK.",
      "Centre de supervision : statut du poller (actif/suspendu), dernière sync auto et dernière sync manuelle.",
      "Périphériques : correction du mapping CheckMK (démappage) et du statut actif/inactif synchronisés entre les vues."
    ]
  },
  {
    version: "1.0.63",
    date: "2026-10-05",
    highlights: [
      "Supervision : la date des alertes reprend le last_state_change CheckMK du service (alignée sur Events & notifications).",
      "Coffre-fort documentaire : type « Facture » à la place de « Facture matériel »."
    ]
  },
  {
    version: "1.0.62",
    date: "2026-10-02",
    highlights: [
      "Supervision : sync flotte CheckMK plus rapide (état live), anti-doublons et apparition en fondu des alertes.",
      "Fiche entreprise : filtres périphériques sans scroll (types présents uniquement) et tableau qui s’adapte à la largeur.",
      "Fiche entreprise : espacement corrigé au-dessus des carnets de crédits.",
      "Satisfaction tickets : libellés traduits ; mode aléatoire limité aux tickets support."
    ]
  },
  {
    version: "1.0.61",
    date: "2026-10-02",
    highlights: [
      "Portail client : choix du type de déclaration (incident, demande, problème, changement) avec formulaires adaptés.",
      "Portail client : description initiale affichée avec les initiales du demandeur et le nom de l’entreprise.",
      "Tickets agent : désactivation simple du mode aléatoire (clic sur le bandeau ou le dé).",
      "Satisfaction portail : avis débloqué lorsque le ticket est clos avec une validation obsolète."
    ]
  },
  {
    version: "1.0.60",
    date: "2026-10-02",
    highlights: [
      "Liste des tickets : colonnes Demandeur et Client sur une seule ligne avec ellipsis."
    ]
  },
  {
    version: "1.0.59",
    date: "2026-10-02",
    highlights: [
      "Portail client : détail ticket remplit correctement l’écran ; cibles formulaire (assignés, catégorie) appliquées à la création.",
      "Tickets agent : panneau Formulaire retiré ; suggestions base de connaissances alignées sur le style des autres sections."
    ]
  },
  {
    version: "1.0.58",
    date: "2026-10-02",
    highlights: [
      "Tickets : titre issu du formulaire corrigé ; champs redondants masqués dans le panneau Formulaire.",
      "Assignation d’équipes conservée comme équipes (sans éclater tous les membres).",
      "Matériel lié affiché en cartes pleine largeur ; menu Compte : profils repliables.",
      "Supervision : sync CheckMK manuelle uniquement ; bouton Réduire retiré du bas de la modal."
    ]
  },
  {
    version: "1.0.57",
    date: "2026-10-01",
    highlights: [
      "Optimisation de l’UI : listes cyber et services allégées (recherche, filtres et table, sans bandes KPI).",
      "Harmonisation des barres de filtres, pagination dans les tableaux et squelettes de chargement plus cohérents.",
      "Création de tickets support : panneaux affichés progressivement selon le formulaire choisi.",
      "Supervision : recherche/filtres type entreprises, libellés d’expiration corrigés et polish de l’historique.",
      "Polish général des fiches entreprises, contacts, prestataires et accueil."
    ]
  },
  {
    version: "1.0.56",
    date: "2026-10-01",
    highlights: [
      "Centre de supervision : la colonne Entreprise affiche bien le client rattaché au périphérique.",
      "Sync globale : modal réductible, barre de progression dans l’en-tête, alertes qui apparaissent en direct avec animation.",
      "Historique : réouverture des alertes « Ticket associé », chevron pour déplier la timeline, corbeille (restaurer / supprimer définitivement)."
    ]
  },
  {
    version: "1.0.55",
    date: "2026-10-01",
    highlights: [
      "Fiche RMM · Général : les cartes d’infos (facturation, identité, champs perso) s’affichent sur une même ligne (3 par rangée)."
    ]
  },
  {
    version: "1.0.54",
    date: "2026-09-30",
    highlights: [
      "Supervision → ticket support : le préremplissage formulaire n’est plus effacé par la synchronisation d’URL."
    ]
  },
  {
    version: "1.0.53",
    date: "2026-09-30",
    highlights: [
      "Supervision : préremplissage objet / description du formulaire support depuis une alerte (plus d’écrasement au chargement).",
      "Fiche RMM · Général : infos regroupées en cartes (facturation, identité, champs perso) + CPU / RAM / stockage avec jauges.",
      "Icônes CPU / RAM / stockage plus lisibles, dans le style habituels des fiches RMM."
    ]
  },
  {
    version: "1.0.52",
    date: "2026-09-30",
    highlights: [
      "Notifications admin : le contenu email (sujet / corps) se sauvegarde correctement à nouveau.",
      "Aperçu email : envoi avec l’adresse expéditeur des paramètres généraux SMTP."
    ]
  },
  {
    version: "1.0.51",
    date: "2026-09-30",
    highlights: [
      "Coffre-fort documentaire : arborescence, déplacement de dossiers/documents, renommage, et visibilité portail (dossier ou document).",
      "Fiche entreprise : un seul squelette de chargement sur la carte ; coffre-fort en explorateur plus clair.",
      "Équipements : défilement horizontal des périphériques, pagination par 50, en-tête de fiche aligné contacts / entreprises.",
      "RMM : marque, modèle, numéro de série et type d’ordinateur mieux remontés (agent + inventaire)."
    ]
  },
  {
    version: "1.0.50",
    date: "2026-09-30",
    highlights: [
      "Création presta / installation : plus de champs génériques (sujet, matériel hors formulaire) ; détails uniquement via le formulaire sélectionné."
    ]
  },
  {
    version: "1.0.49",
    date: "2026-09-30",
    highlights: [
      "Formulaires : champ Oui / Non traduit avec preview ; pièces jointes en zone glisser-déposer.",
      "Champ Contact configurable : filtrer par entreprise, agents ou profils d’agents.",
      "Création ticket support : formulaires obligatoires (plus de champs génériques) ; prefill supervision sans saut d’écran.",
      "Centre de supervision : action directe Ticket Support sur une alerte (plus de choix événement / presta)."
    ]
  },
  {
    version: "1.0.48",
    date: "2026-09-30",
    highlights: [
      "Fiche poste RMM : onglets Général, Cybersécurité et Software refaits en bandes denses ; applications en table scrollable.",
      "Formulaires support : champ Matériel / périphérique ; côté portail, entreprises et équipements limités au client.",
      "Création de ticket : avec formulaires, seuls les champs du formulaire (plus de sujet / description / documents hors form).",
      "Règles de supervision : choix du formulaire support et mapping objet / description pour les tickets créés depuis le centre."
    ]
  },
  {
    version: "1.0.47",
    date: "2026-09-30",
    highlights: [
      "Fiche poste RMM : onglets Général / Cybersécurité / Software reconstruits (contenu réaffiché, grille plus dense).",
      "Centre de supervision : synchronisation CheckMK globale à la demande, avec modal de progression."
    ]
  },
  {
    version: "1.0.46",
    date: "2026-09-30",
    highlights: [
      "Fiche poste RMM : onglets Général, Cybersécurité et Software plus condensés, typo allégée, hauteur d’écran mieux utilisée.",
      "Métriques Activité : mesure CPU plus fiable (agent 1.0.14) — fin des historiques à 0 % dus à WMI."
    ]
  },
  {
    version: "1.0.45",
    date: "2026-09-30",
    highlights: [
      "CheckMK : option pour accepter les certificats TLS auto-signés (connexion lab / monitoring interne)."
    ]
  },
  {
    version: "1.0.44",
    date: "2026-09-29",
    highlights: [
      "Navigation plus fluide : la vérif licence ne bloque plus chaque appel API.",
      "Message de maintenance : espace jusqu’à 100, défilement corrigé sur toute la largeur, aperçu synchronisé (couleur, vitesse, espace, direction)."
    ]
  },
  {
    version: "1.0.43",
    date: "2026-09-29",
    highlights: [
      "Message de maintenance : réglage de l’espace entre deux passages du texte défilant."
    ]
  },
  {
    version: "1.0.42",
    date: "2026-09-29",
    highlights: [
      "Administration > Notifications : liste aérée et modal de configuration en sections (activation, email, centre).",
      "Éditeur d’email : images (URL ou upload), aperçu du rendu Veritas, envoi d’un aperçu de test par mail.",
      "Fiche contact — Portail client : mise en page plus claire sur deux colonnes.",
      "Tickets clôturés : le SLA affiche le retard réel au lieu de « Exp. »."
    ]
  },
  {
    version: "1.0.41",
    date: "2026-09-29",
    highlights: [
      "Centre de supervision : alertes Filesystem explicites (plus de Critical - /).",
      "Antivirus / Antispam : pagination et recherche sur les tableaux détail ; sync globale alignée sur la page détail.",
      "Mapping CheckMK : fenêtre plus grande et aérée, filtres famille sur une seule ligne."
    ]
  },
  {
    version: "1.0.40",
    date: "2026-09-28",
    highlights: [
      "Inventaire périphériques : recherche et filtre par famille (stockage, serveurs, etc.) dans le panneau latéral."
    ]
  },
  {
    version: "1.0.39",
    date: "2026-09-28",
    highlights: [
      "Antispam Mail in Black : licences plus plafonnées à 20 ; statut et date d’expiration mieux récupérés (resync recommandée).",
      "KPI : filtre 12 mois / Tout corrigé (plus de zéros) ; volume des tickets redessiné ; cockpit Périphériques stable sur « Tout ».",
      "Fiches entreprise et contact : onglets centrés, cartographie / périphériques et portail contact condensé."
    ]
  },
  {
    version: "1.0.38",
    date: "2026-09-28",
    highlights: [
      "Centre de supervision : pagination Alertes/Historique et libellés d’alertes explicites (ex. Warning - Filesystem E:/).",
      "Certificats SSL : le port des URL (ex. :7002) est respecté — plus de jours de renouvellement erronés.",
      "Coffre-fort documentaire : accents correctement affichés dans les noms de fichiers.",
      "Planning : le calendrier ne passe plus au-dessus de la barre de recherche au scroll.",
      "Cybersécurité / Cloud IT & Services : 50 lignes par page par défaut ; multi-profils agents et améliorations tickets / cartographie."
    ]
  },
  {
    version: "1.0.37",
    date: "2026-09-24",
    highlights: [
      "Mail in Black : choix de l’URL (portail partenaire ou instance dédiée) avec région et n° d’instance (mibc-fr, mibc-en, autre) — Admin Intégrations et antispam entreprise."
    ]
  },
  {
    version: "1.0.36",
    date: "2026-09-22",
    highlights: [
      "Centre de supervision : alertes CheckMK avec le détail du service (ex. Warning - Memory), lignes de règles cliquables et barre d’enregistrement simplifiée.",
      "Tickets support : résolution possible sans validation client (clôture immédiate).",
      "Prestations : la vue Mes tickets n’affiche plus que les tickets ouverts.",
      "Admin : catalogue Solutions en deux colonnes ; aperçu page de connexion en pleine hauteur."
    ]
  },
  {
    version: "1.0.35",
    date: "2026-09-22",
    highlights: [
      "Page de connexion : en mode Flux, logo/titre en haut et points forts + HTML collés en bas du panneau gauche.",
      "Admin → Page de connexion : aperçu et libellés mis à jour pour ce layout « footer en bas »."
    ]
  },
  {
    version: "1.0.34",
    date: "2026-09-22",
    highlights: [
      "Centre de supervision : les règles d’alerte se sauvegardent correctement et sont communes à tous les utilisateurs.",
      "Correctif d’affichage du toggle TLS dans le modal de lien UniFi (entreprise)."
    ]
  },
  {
    version: "1.0.33",
    date: "2026-09-21",
    highlights: [
      "Admin → Page de connexion : mode Canvas pour placer titre, sous-titre, points forts, HTML et formulaire au pixel près (agent & client), avec glisser-déposer dans l’aperçu.",
      "Admin → Intégrations → Checkmk : section Surveillance soignée (titre en capitales, sous-titre, stepper d’intervalle), texte « minimum 5 minutes » retiré."
    ]
  },
  {
    version: "1.0.32",
    date: "2026-09-21",
    highlights: [
      "Super Admin / Administrateur : reconnaissance correcte (onglet Règles supervision, suppression en masse des tickets Support).",
      "Supervision : plus de création automatique de tickets Support — uniquement via l’action manuelle.",
      "Admin → Page de connexion : layout 2 colonnes avec aperçu live (typo), sections pliables et champs mieux espacés."
    ]
  },
  {
    version: "1.0.31",
    date: "2026-09-21",
    highlights: [
      "Centre de supervision : KPI couverture en pleine largeur, ordre Firewall → Routeur → Serveur → Stockage → Switch → Borne Wi‑Fi.",
      "Internet et TOIP retirés des KPI et des alertes du centre de supervision."
    ]
  },
  {
    version: "1.0.30",
    date: "2026-09-21",
    highlights: [
      "Centre de supervision : icône de sévérité / domaine à gauche de chaque alerte (file et historique).",
      "KPI de couverture et filtres de sévérité : teintes grises plus discrètes.",
      "CheckMK : correctif sync (import evaluateMonitoringAlert manquant → erreur 500)."
    ]
  },
  {
    version: "1.0.29",
    date: "2026-09-21",
    highlights: [
      "Page de connexion (agent & client) : blocs HTML (ex. boutons de téléchargement), typographie avancée et options de positionnement."
    ]
  },
  {
    version: "1.0.28",
    date: "2026-09-21",
    highlights: [
      "Centre de supervision : KPI de couverture en cartes pleine largeur, limitées aux familles surveillables CheckMK (sans ENI, projecteurs, etc.)."
    ]
  },
  {
    version: "1.0.27",
    date: "2026-09-21",
    highlights: [
      "CheckMK : les hôtes DOWN / UNREACHABLE remontent correctement en critique dans le centre de supervision.",
      "Actualiser CheckMK : sync forcée complète (fenêtre 90 j), historique events plafonné, toast succès/échec.",
      "Inventaire : statut « pas de données » distinct du faux « ok » pour les équipements mappés sans sync."
    ]
  },
  {
    version: "1.0.26",
    date: "2026-09-21",
    highlights: [
      "CheckMK (Admin → Intégrations) : intervalle de rafraîchissement configurable dès 5 min, suspension de la sync auto et de la surveillance.",
      "Supervision : poller d’alertes cadencé sur cet intervalle ; sync obsolète remonte en « pas de données » ; critère no_data réactivé.",
      "Fiche équipement : lien cliquable vers l’entreprise (clic molette pour ouvrir en arrière-plan).",
      "Inventaire périphériques : clic molette ouvre la fiche en arrière-plan."
    ]
  },
  {
    version: "1.0.25",
    date: "2026-09-21",
    highlights: [
      "Tags périphériques : catalogue dédié (séparé des tags clients/contacts), édition sur la fiche et filtre inventaire.",
      "Alertes supervision : activées par défaut sur tous les périphériques ; icône distincte de la cloche d’abonnement.",
      "Centre de supervision : KPI de couverture par famille (supervisés / total) au-dessus de la table d’alertes."
    ]
  },
  {
    version: "1.0.24",
    date: "2026-09-18",
    highlights: [
      "Cloud IT · Tenant Microsoft : pagination et tri de l’onglet Utilisateurs nettement plus rapides sur les gros volumes."
    ]
  },
  {
    version: "1.0.23",
    date: "2026-09-18",
    highlights: [
      "Correctif critique : le backend redémarre (export UniFi listCarrierSubscribers manquant → 502).",
      "Plus de faux assistant d’installation : écran dédié si API ou base de données injoignable.",
      "La configuration initiale ne s’affiche que lorsque l’installation est réellement incomplète."
    ]
  },
  {
    version: "1.0.22",
    date: "2026-09-18",
    highlights: [
      "UniFi : choix tenant global (Site Manager) ou dédié (Network API / UDM) par entreprise.",
      "Import matériel UniFi depuis le tenant choisi (fiche entreprise et ajout d’équipement).",
      "Schéma et API client UniFi étendus pour les credentials Network dédiés (chiffrement)."
    ]
  },
  {
    version: "1.0.21",
    date: "2026-09-17",
    highlights: [
      "Admin → Rapports : personnalisation avancée de l’identité et de l’apparence (polices, couleurs header/footer, tailles) avec aperçu en direct.",
      "Exports HTML : mise en forme renforcée (titres, cartes KPI Vue d’ensemble, sections, synthèse, points à surveiller).",
      "UniFi : correctif de l’import matériel vide après liaison d’un site (fallback Site Manager, classification Network, filtre site).",
      "NDD OVH : correctif du refresh « Unable to save NDD » (UUID / item_key)."
    ]
  },
  {
    version: "1.0.20",
    date: "2026-09-17",
    highlights: [
      "Intégration UniFi (Site Manager, Network, Carrier Fabric) : tenant global en Admin, lien host/site par entreprise, import switches / gateways / bornes Wi‑Fi.",
      "Rapports : assistant de création simplifié (listes client/type) ; section « Derniers rapports » retirée des pages.",
      "Supervision CheckMK : remontée correcte des hôtes critical/warning (unwrap d’état + host_details) et réouverture d’alertes résolues.",
      "Admin & auth : onglets sticky, branding login (fond panneau droit), fiches profil/permissions allégées, crédits tickets prestation."
    ]
  },
  {
    version: "1.0.19",
    date: "2026-09-17",
    highlights: [
      "Coffre documentaire client : création et navigation de dossiers sur la fiche entreprise.",
      "Rapports de supervision : modal d’enregistrement revue ; archivage en dossier avec les 3 HTML (plus de ZIP) ; correction du 413 à l’enregistrement.",
      "Inventaire périphériques : correction du chargement (mappings CheckMK sur tables sans colonnes dédiées)."
    ]
  },
  {
    version: "1.0.18",
    date: "2026-09-17",
    highlights: [
      "Base de connaissances : modal dossier en panneau latéral avec sélecteur d’icône, drag & drop des collections et articles (réordonner / déplacer).",
      "Base de connaissances : bouton emoji retiré à côté du « + » dans COLLECTIONS.",
      "Rapports de supervision : archivage du ZIP dans le coffre client corrigé après génération."
    ]
  },
  {
    version: "1.0.17",
    date: "2026-09-17",
    highlights: [
      "Rapports de supervision : parcours latéral et typographie allégés, synthèses pleine largeur, natures d’alertes, cartes cyber/cloud, licences M365 nommées et libellé Mailinblack corrigé.",
      "Tickets prestation : onglets Formulaire/Tâches/Discussion, panneau droit repliable, to-dos avec périphérique, documents et crédits.",
      "Supervision : voyants inventaire alignés CheckMK et centre de supervision qui remonte bien les alertes mappées.",
      "Base de connaissances : création de dossier depuis le « + », passage lecture → édition, modal emojis revue."
    ]
  },
  {
    version: "1.0.16",
    date: "2026-09-16",
    highlights: [
      "Base de connaissances : menu latéral type Outline, emojis personnalisés (:nom:) pour articles, titres et icônes de page.",
      "Tickets : suivis en bulles cadrées (style GLPI) côté agent et portail client.",
      "Rapports : fiche entreprise plus fine à la création (contrat, lieux, périphériques, antivirus, antispam, NDD, tenant Microsoft, SSL, abonnements, campagnes).",
      "Documents : filtre entreprise en champ de suggestion (plus de liste complète d’un coup)."
    ]
  },
  {
    version: "1.0.15",
    date: "2026-09-16",
    highlights: [
      "Abonnements : cloche sur fiches entreprise/contact/périphérique, gestion dans Mon profil, notifications in-app/email via le pipeline existant.",
      "Statut actif/inactif unifié (pastille verte/grise) sur les listes et fiches entreprise, contact et prestataire.",
      "Lieux entreprise : renommer un lieu met à jour les périphériques rattachés (plus d'ancien nom orphelin).",
      "Injection : un agent avec le droit Injection peut charger les familles custom sans le droit Familles matériel."
    ]
  },
  {
    version: "1.0.14",
    date: "2026-09-09",
    highlights: [
      "Bitdefender GravityZone : pagination complète de getAccountsList (au-delà des 30 premiers comptes) pour lister toutes les sociétés."
    ]
  },
  {
    version: "1.0.13",
    date: "2026-09-09",
    highlights: [
      "Tables périphériques : les sections de familles custom ne s'affichent plus comme colonnes (titres de regroupement uniquement)."
    ]
  },
  {
    version: "1.0.12",
    date: "2026-09-09",
    highlights: [
      "Fiche équipement : champs Oui/Non affichés en libellé traduit (plus true/false).",
      "Édition équipement custom : correctif du reset intempestif du formulaire pendant la saisie."
    ]
  },
  {
    version: "1.0.11",
    date: "2026-09-09",
    highlights: [
      "Injection CSV : détection d'encodage (UTF-8 / Windows-1252) pour afficher correctement les accents dans l'aperçu et à l'import."
    ]
  },
  {
    version: "1.0.10",
    date: "2026-09-09",
    highlights: [
      "Familles matériel (admin) : regroupement des champs du formulaire par sections, repris sur la fiche équipement et à l'édition."
    ]
  },
  {
    version: "1.0.9",
    date: "2026-09-09",
    highlights: [
      "Correctif : résolution avec validation client (erreur 500) — contrainte d'unicité ticket manquante sur certaines bases."
    ]
  },
  {
    version: "1.0.8",
    date: "2026-09-09",
    highlights: [
      "Réponse ticket : collage d'image en miniature dans l'éditeur, envoi corrigé (sans trombone), aperçu agrandi au clic.",
      "Listes tickets : la colonne Étiquettes se sauvegarde correctement dans le sélecteur de colonnes.",
      "Tickets prestation : journal d'activité lors de l'édition des champs du formulaire."
    ]
  },
  {
    version: "1.0.7",
    date: "2026-09-08",
    highlights: [
      "Tickets prestation : champs liés du formulaire (entreprise, contact) cliquables ; téléphone et e-mail du contact pour appeler ou écrire depuis le ticket.",
      "Onglet Formulaire : édition des champs renseignés avec enregistrement (fichiers joints en lecture seule).",
      "Listes tickets (services et support) : nouvelle colonne Étiquettes avec pastilles colorées, export CSV et sélecteur de colonnes."
    ]
  },
  {
    version: "1.0.6",
    date: "2026-09-07",
    highlights: [
      "Module Prestataires : liste, fiche, multi-contacts, favoris, rattachement depuis une entreprise, et permissions Agents → Permissions.",
      "Side conversation ticket : cible « Prestataire externe » avec sélection du prestataire/contact et préremplissage destinataire/copie.",
      "Menu : disposition horizontale (barre du haut) configurable dans Mon compte, avec tooltips, séparateurs et avatar corrigés.",
      "IA : suggestion de priorité automatique à la création/édition de ticket, et libellés admin des fonctions IA clarifiés.",
      "Administration générale : carte Support/Knowledge Base retirée ; guide Premiers pas en pleine largeur."
    ]
  },
  {
    version: "1.0.5",
    date: "2026-09-07",
    highlights: [
      "Formulaires support : création/édition en admin, utilisation à la création de ticket et page publique avec captcha.",
      "Création presta : ordre des champs respecté (dont texte long), listes agents/entreprises/contacts en mode recherche, infos commerciales retirées du formulaire fixe.",
      "Administration : onglets Catégories (support et services) en deux colonnes pour voir sections et catégories ensemble.",
      "Correctif build frontend : import du panneau de satisfaction clients aligné sur l'API."
    ]
  },
  {
    version: "1.0.4",
    date: "2026-09-07",
    highlights: [
      "Tickets prestation/installation : décompte des crédits entreprise au niveau du ticket ou à la clôture d'une tâche.",
      "Fiche entreprise / Administration : correction du modal de création de carnets qui se réinitialisait, et affichage fiable des carnets après création.",
      "Statut des carnets (dates) corrigé pour le listing et le décompte depuis les tickets support et prestation."
    ]
  },
  {
    version: "1.0.3",
    date: "2026-09-04",
    highlights: [
      "Création d'une demande prestation/installation : header aligné sur les autres pages et champ Sujet optionnel (sinon titre généré automatiquement).",
      "Tickets prestation : les assignés et suiveurs affichent désormais les noms pour tous les profils ; les agents peuvent assigner des collaborateurs sur les todos.",
      "Todos prestation : assignation multi-agents, date de planning optionnelle, liaison périphérique synchronisée avec le planning.",
      "Portail client : bouton « Prendre le contrôle » (impersonation) rétabli et accessible à tous les agents.",
      "Planning : défilement de la colonne principale et vues multi-mois corrigés."
    ]
  },
  {
    version: "1.0.2",
    date: "2026-09-03",
    highlights: [
      "Administration > Agents : les profils Administrateur et Super Admin peuvent désormais modifier un agent et lui attribuer un profil Administrateur ou Super Admin.",
      "L'attribution d'un accès administrateur reste réservée aux profils administrateurs, pour éviter toute élévation de privilèges."
    ]
  },
  {
    version: "1.0.1",
    date: "2026-09-03",
    highlights: [
      "Fiche périphérique RMM condensée : cartes système, processeur, mémoire et stockage plus compactes.",
      "Création d'un ticket support depuis le centre de supervision : contact principal, périphérique, description détaillée et catégorie « monitoring » préremplis.",
      "Onglet Supervision désormais visible par tous les profils, sans droits d'administration.",
      "Pages Mon compte et Patch notes alignées sur le header standard de l'application."
    ]
  },
  {
    version: "1.0.0",
    date: "2026-09-02",
    highlights: [
      "Version initiale de référence pour le suivi des patch notes Veritas."
    ]
  }
];
