import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
/** Toutes les icônes du UI Kit : Iconify uniquement (`prefix:name`). */
import { Icon } from "@iconify/react";
import {
  CONTRACT_MODULE_ICON_CHOICES,
  EQUIPMENT_FAMILY_ICON_CHOICES,
  SALES_FORM_ICON_CHOICES
} from "../AdminPage/IconPicker";
import { PLANNING_EVENT_TYPE_ICON_CHOICES } from "../AdminPage/planningEventTypeConstants";
import { ENTERPRISE_ICON_CHOICES } from "../EnterprisesPage/enterpriseIconChoices";
import { showError, showInfo, showSuccess, showWarning } from "../../utils/toast";
import {
  getToastPosition,
  setToastPosition,
  subscribeToastPosition
} from "../../utils/toastPosition";
import { getAvatarPath } from "../../utils/assetHelper";
import { PRESET_AVATARS } from "../../utils/userAvatarUtils";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import UiKitEventsWeek from "./components/UiKitEventsWeek";
import UiKitKpiStrip from "./components/UiKitKpiStrip";
import UiKitNewsPanel, { UiKitNewsItem } from "./components/UiKitNewsPanel";
import { uiKitTableStyles as tableKit } from "./components/UiKitTable";
import UiKitScrollFadeShell from "./components/UiKitScrollFadeShell";
import "./uiKitTokens.css";
import styles from "./UiKitPage.module.css";

const TOAST_POSITIONS = [
  { value: "top-left", label: "Haut gauche" },
  { value: "top-center", label: "Haut centre" },
  { value: "top-right", label: "Haut droite" },
  { value: "bottom-left", label: "Bas gauche" },
  { value: "bottom-center", label: "Bas centre" },
  { value: "bottom-right", label: "Bas droite" }
];

/** Pack UI kit = fusion des catalogues app (entreprises, équipements, sales, contrats, planning). */
const UI_KIT_ICON_PACK = Array.from(
  new Set([
    ...ENTERPRISE_ICON_CHOICES,
    ...EQUIPMENT_FAMILY_ICON_CHOICES,
    ...SALES_FORM_ICON_CHOICES,
    ...CONTRACT_MODULE_ICON_CHOICES,
    ...PLANNING_EVENT_TYPE_ICON_CHOICES,
    // Compléments UI / actions fréquents
    "mdi:plus",
    "mdi:minus",
    "mdi:close",
    "mdi:check",
    "mdi:pencil-outline",
    "mdi:trash-can-outline",
    "mdi:content-copy",
    "mdi:content-save-outline",
    "mdi:download-outline",
    "mdi:upload-outline",
    "mdi:open-in-new",
    "mdi:dots-horizontal",
    "mdi:dots-vertical",
    "mdi:menu",
    "mdi:magnify",
    "mdi:filter-variant",
    "mdi:sort",
    "mdi:refresh",
    "mdi:sync",
    "mdi:arrow-left",
    "mdi:arrow-right",
    "mdi:chevron-down",
    "mdi:chevron-up",
    "mdi:chevron-left",
    "mdi:chevron-right",
    "mdi:home-outline",
    "mdi:cog-outline",
    "mdi:account-outline",
    "mdi:account-group-outline",
    "mdi:bell-outline",
    "mdi:email-outline",
    "mdi:calendar-outline",
    "mdi:clock-outline",
    "mdi:map-marker-outline",
    "mdi:link-variant",
    "mdi:paperclip",
    "mdi:image-outline",
    "mdi:file-outline",
    "mdi:folder-outline",
    "mdi:star-outline",
    "mdi:heart-outline",
    "mdi:thumb-up-outline",
    "mdi:share-variant-outline",
    "mdi:printer-outline",
    "mdi:qrcode",
    "mdi:barcode",
    "mdi:palette-outline",
    "mdi:eyedropper",
    "mdi:format-bold",
    "mdi:format-italic",
    "mdi:code-tags",
    "mdi:console",
    "mdi:api",
    "mdi:graphql",
    "mdi:docker",
    "mdi:kubernetes",
    "mdi:github",
    "mdi:microsoft",
    "mdi:google",
    "mdi:apple",
    "mdi:android",
    "mdi:linux",
    "mdi:windows"
  ])
).sort((a, b) => a.localeCompare(b));

const COLOR_TOKENS = [
  { name: "Accent", varName: "--msp-accent", hex: "#2b5fab", cssVar: "var(--msp-accent)" },
  { name: "Accent dark", varName: "--msp-accent-dark", hex: "#234f91", cssVar: "var(--msp-accent-dark)" },
  { name: "Accent soft", varName: "--msp-accent-soft", hex: "rgba(43,95,171,.10)", cssVar: "var(--msp-accent-soft)" },
  { name: "Fond page", varName: "--msp-bg", hex: "#e8eef6", cssVar: "var(--msp-bg)" },
  { name: "Surface", varName: "--msp-surface", hex: "#ffffff", cssVar: "var(--msp-surface)" },
  { name: "Surface 2", varName: "--msp-surface-2", hex: "#f4f7fb", cssVar: "var(--msp-surface-2)" },
  { name: "Surface 3", varName: "--msp-surface-3", hex: "#e8eef5", cssVar: "var(--msp-surface-3)" },
  { name: "Bordure", varName: "--msp-border", hex: "#d0dae8", cssVar: "var(--msp-border)" },
  { name: "Bordure light", varName: "--msp-border-light", hex: "#e2e8f0", cssVar: "var(--msp-border-light)" },
  { name: "Texte", varName: "--msp-text", hex: "#0f172a", cssVar: "var(--msp-text)" },
  { name: "Muted", varName: "--msp-muted", hex: "#5c6b82", cssVar: "var(--msp-muted)" },
  { name: "Muted light", varName: "--msp-muted-light", hex: "#7a8aa3", cssVar: "var(--msp-muted-light)" },
  { name: "Success", varName: "--msp-success", hex: "#3d8f6a", cssVar: "var(--msp-success)" },
  { name: "Warn", varName: "--msp-warn", hex: "#c47a2b", cssVar: "var(--msp-warn)" },
  { name: "Danger", varName: "--msp-danger", hex: "#c45a5a", cssVar: "var(--msp-danger)" }
];

const FINDER_PRIMARY = [
  { id: "overview", label: "Vue d’ensemble", icon: "mdi:view-dashboard-outline" },
  { id: "equipment", label: "Équipements", icon: "mdi:server" },
  { id: "cyber", label: "Cyber & Cloud", icon: "mdi:shield-check-outline" },
  { id: "activity", label: "Activité", icon: "mdi:ticket-outline" },
  { id: "vault", label: "Coffre", icon: "mdi:folder-lock-outline" }
];

const FINDER_SECONDARY = [
  { id: "servers", label: "Serveurs", icon: "mdi:server" },
  { id: "network", label: "Réseau", icon: "mdi:lan" },
  { id: "wifi", label: "Wi‑Fi", icon: "mdi:wifi" },
  { id: "storage", label: "Stockage", icon: "mdi:harddisk" },
  { id: "firewall", label: "Pare-feu", icon: "mdi:firewall" },
  { id: "toip", label: "ToIP", icon: "mdi:phone-voip" },
  { id: "ups", label: "Alimentation", icon: "mdi:battery-charging" },
  { id: "print", label: "Imprimantes", icon: "mdi:printer" }
];

/** Menu administration (AdminPanel) — sections + items / groupes */
const ADMIN_MENU_SECTIONS = [
  {
    id: "general",
    title: "Général",
    items: [
      {
        key: "general",
        icon: "mdi:cog-outline",
        label: "Paramètres généraux",
        description: "Locale, fuseau, options globales"
      },
      {
        key: "login-branding",
        icon: "mdi:palette-outline",
        label: "Marque & connexion",
        description: "Logo, couleurs, écran de login"
      },
      {
        key: "reports",
        icon: "mdi:file-document-outline",
        label: "Rapports",
        description: "Modèles et exports"
      }
    ]
  },
  {
    id: "organization",
    title: "Organisation",
    items: [
      {
        key: "users",
        icon: "mdi:account-group-outline",
        label: "Utilisateurs",
        description: "Comptes agents et profils"
      },
      {
        key: "permissions",
        icon: "mdi:shield-key-outline",
        label: "Permissions",
        description: "Droits par module"
      },
      {
        key: "teams",
        icon: "mdi:account-multiple-outline",
        label: "Équipes",
        description: "Groupes et assignations"
      }
    ]
  },
  {
    id: "clients",
    title: "Clients",
    items: [
      {
        key: "clients",
        icon: "mdi:office-building-outline",
        label: "Entreprises",
        description: "Fiches clients MSP"
      },
      {
        key: "nav-client-config",
        icon: "mdi:tune-variant",
        label: "Configuration client",
        description: "Modules, familles, cartographie",
        children: [
          {
            key: "contract-modules",
            label: "Modules contrat",
            description: "Options contractuelles"
          },
          {
            key: "equipment-families",
            label: "Familles d’équipements",
            description: "Taxonomie parc"
          },
          {
            key: "infrastructure-map",
            label: "Cartographie",
            description: "Vue infrastructure"
          }
        ]
      }
    ]
  },
  {
    id: "tickets",
    title: "Tickets",
    items: [
      {
        key: "tickets",
        icon: "mdi:ticket-outline",
        label: "Paramètres tickets",
        description: "Catégories, priorités, vues"
      },
      {
        key: "notifications",
        icon: "mdi:bell-badge-outline",
        label: "Notifications",
        description: "In-app, mail, connecteurs"
      }
    ]
  }
];

const TABLE_ROWS = [
  { name: "SRV-DC01", type: "Serveur", ip: "10.0.1.10", mapped: true },
  { name: "FW-EDGE", type: "Firewall", ip: "10.0.0.1", mapped: true },
  { name: "SW-CORE", type: "Switch", ip: "10.0.0.2", mapped: false },
  { name: "NAS-01", type: "Stockage", ip: "10.0.1.50", mapped: true },
  { name: "AP-SALON", type: "Wi‑Fi", ip: "10.0.2.11", mapped: false },
  { name: "SRV-FILE", type: "Serveur", ip: "10.0.1.12", mapped: true },
  { name: "SW-ACC01", type: "Switch", ip: "10.0.0.12", mapped: true },
  { name: "UPS-01", type: "Alimentation", ip: "10.0.0.90", mapped: false },
  { name: "SRV-SQL", type: "Serveur", ip: "10.0.1.20", mapped: true },
  { name: "FW-DMZ", type: "Firewall", ip: "10.0.0.5", mapped: true },
  { name: "AP-ETAGE2", type: "Wi‑Fi", ip: "10.0.2.22", mapped: false },
  { name: "NAS-BACKUP", type: "Stockage", ip: "10.0.1.51", mapped: true },
  { name: "SW-ACC02", type: "Switch", ip: "10.0.0.13", mapped: true },
  { name: "PRT-SIEGE", type: "Imprimante", ip: "10.0.3.10", mapped: false },
  { name: "SRV-MONITOR", type: "Serveur", ip: "10.0.1.30", mapped: true },
  { name: "UPS-02", type: "Alimentation", ip: "10.0.0.91", mapped: false }
];

const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 25];

const DEMO_FILTERS = [
  { id: "server", label: "Serveur", icon: "mdi:server" },
  { id: "firewall", label: "Firewall", icon: "mdi:firewall" },
  { id: "mapped", label: "Mappé", icon: "mdi:link-variant" },
  { id: "critical", label: "Critique", icon: "mdi:alert-outline" },
  { id: "offline", label: "Hors ligne", icon: "mdi:lan-disconnect" }
];

const DEMO_CONTACTS = [
  {
    id: "c1",
    name: "Alice Martin",
    role: "Direction",
    primary: true,
    meta: [
      { icon: "mdi:email-outline", value: "alice@demo.fr" },
      { icon: "mdi:phone-outline", value: "+33 1 23 45 67 89" }
    ]
  },
  {
    id: "c2",
    name: "Bob Dupont",
    role: "IT Manager",
    primary: false,
    meta: [
      { icon: "mdi:email-outline", value: "bob@demo.fr" },
      { icon: "mdi:cellphone", value: "+33 6 12 34 56 78" }
    ]
  }
];

const DEMO_SITES = [
  {
    id: "s1",
    name: "Siège — Paris",
    role: "12 rue de la Démo, 75001 Paris",
    primary: true,
    kind: "site"
  },
  {
    id: "s2",
    name: "Agence — Lyon",
    role: "8 place Bellecour, 69002 Lyon",
    primary: false,
    kind: "site"
  }
];

const DEMO_PRESTATAIRES = [
  {
    id: "p1",
    name: "NetSecure SARL",
    role: "Cybersécurité",
    primary: false,
    meta: [
      { icon: "mdi:email-outline", value: "contact@netsecure.fr" },
      { icon: "mdi:phone-outline", value: "+33 4 56 78 90 12" }
    ]
  },
  {
    id: "p2",
    name: "CloudOps Partner",
    role: "Infogérance cloud",
    primary: false,
    meta: [{ icon: "mdi:web", value: "cloudops.example" }]
  }
];

const SECTION_GROUPS = [
  {
    label: "Fondations",
    items: [
      { id: "tokens", label: "Couleurs" },
      { id: "buttons", label: "Boutons" },
      { id: "badges", label: "Badges" },
      { id: "icons", label: "Icônes" }
    ]
  },
  {
    label: "Formulaires",
    items: [{ id: "forms", label: "Champs & filtres" }]
  },
  {
    label: "Feedback",
    items: [
      { id: "tooltips", label: "Tooltips" },
      { id: "feedback", label: "Alertes & empty" }
    ]
  },
  {
    label: "Données",
    items: [
      { id: "table", label: "Table" },
      { id: "cards", label: "Cartes" },
      { id: "profile", label: "Mon profil" }
    ]
  },
  {
    label: "Accueil",
    items: [{ id: "home", label: "KPI · frise · actus" }]
  },
  {
    label: "Layouts",
    items: [
      { id: "header", label: "Header" },
      { id: "finder", label: "Menu gauche" },
      { id: "admin-menu", label: "Menu admin" },
      { id: "aside", label: "Colonne droite" },
      { id: "modal", label: "Modale" },
      { id: "ticket", label: "Ticket" }
    ]
  }
];

const DEMO_USERS = [
  {
    id: "u1",
    name: "Lucas Goulinet",
    role: "Administrateur",
    email: "lucas.goulinet@veritas.demo",
    status: "active",
    avatar: { type: "preset", presetId: "blue" }
  },
  {
    id: "u2",
    name: "Alice Martin",
    role: "Agent support",
    email: "alice.martin@veritas.demo",
    status: "active",
    avatar: { type: "preset", presetId: "rose" }
  },
  {
    id: "u3",
    name: "Hugo Bernard",
    role: "Technicien",
    email: "hugo.bernard@veritas.demo",
    status: "inactive",
    avatar: null
  }
];

const DEMO_KPI_CARDS = [
  { key: "total", value: 24, label: "Mes tickets", icon: "mdi:ticket-account" },
  { key: "progress", value: 8, label: "En cours", icon: "mdi:progress-clock" },
  { key: "pending", value: 5, label: "En attente", icon: "mdi:timer-sand" },
  { key: "validate", value: 3, label: "À valider", icon: "mdi:clipboard-check-outline" }
];

const DEMO_KPI_SALES = [
  { key: "s-total", value: 12, label: "Opportunités", icon: "mdi:handshake-outline" },
  { key: "s-progress", value: 4, label: "En cours", icon: "mdi:progress-clock" },
  { key: "s-pending", value: 2, label: "En attente", icon: "mdi:timer-sand" }
];

const DEMO_CHART_DONUT = [
  { key: "open", label: "Ouverts", value: 42, color: "var(--msp-accent)" },
  { key: "progress", label: "En cours", value: 28, color: "var(--msp-warn)" },
  { key: "done", label: "Résolus", value: 22, color: "var(--msp-success)" },
  { key: "wait", label: "En attente", value: 8, color: "var(--msp-muted-light)" }
];

const DEMO_CHART_BARS = [
  { key: "lun", label: "Lun", value: 12 },
  { key: "mar", label: "Mar", value: 18 },
  { key: "mer", label: "Mer", value: 9 },
  { key: "jeu", label: "Jeu", value: 22 },
  { key: "ven", label: "Ven", value: 16 },
  { key: "sam", label: "Sam", value: 7 },
  { key: "dim", label: "Dim", value: 4 }
];

const DEMO_CHART_LINE = [8, 11, 9, 14, 13, 18, 16, 21, 19, 24, 22, 27];
const DEMO_CHART_LINE_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSlice(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const o0 = polarToCartesian(cx, cy, rOuter, startAngle);
  const i1 = polarToCartesian(cx, cy, rInner, endAngle);
  const i0 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i0.x} ${i0.y}`,
    "Z"
  ].join(" ");
}

function DonutChart({ items, title = "Répartition" }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 68;
  const rInner = 42;
  let angle = 0;
  const slices = items.map(item => {
    const sweep = (item.value / total) * 360;
    const start = angle;
    const end = angle + Math.max(sweep, 0.8);
    angle += sweep;
    return { ...item, d: describeDonutSlice(cx, cy, rOuter, rInner, start, end) };
  });

  return (
    <article className={styles.chartCard}>
      <header className={styles.chartCardHead}>
        <h3 className={styles.chartCardTitle}>{title}</h3>
        <p className={styles.chartCardHint}>Camembert</p>
      </header>
      <div className={styles.chartDonutLayout}>
        <svg className={styles.chartDonutSvg} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
          {slices.map(slice => (
            <path key={slice.key} d={slice.d} fill={slice.color} className={styles.chartDonutSlice} />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" className={styles.chartDonutTotal}>
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className={styles.chartDonutTotalLabel}>
            tickets
          </text>
        </svg>
        <ul className={styles.chartLegend}>
          {items.map(item => (
            <li key={item.key} className={styles.chartLegendItem}>
              <span className={styles.chartLegendSwatch} style={{ background: item.color }} />
              <span className={styles.chartLegendLabel}>{item.label}</span>
              <span className={styles.chartLegendValue}>{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function BarChart({ items, title = "Activité" }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <article className={styles.chartCard}>
      <header className={styles.chartCardHead}>
        <h3 className={styles.chartCardTitle}>{title}</h3>
        <p className={styles.chartCardHint}>Barres</p>
      </header>
      <div className={styles.chartBars} role="img" aria-label={title}>
        {items.map(item => (
          <div key={item.key} className={styles.chartBarCol}>
            <div className={styles.chartBarTrack}>
              <div
                className={styles.chartBarFill}
                style={{ height: `${Math.round((item.value / max) * 100)}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span className={styles.chartBarLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function LineChart({ series, labels, title = "Tendance" }) {
  const width = 640;
  const height = 160;
  const padX = 12;
  const padY = 16;
  const { line, area, points } = useMemo(() => {
    if (!series?.length) return { line: "", area: "", points: [] };
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = Math.max(max - min, 1);
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const pts = series.map((v, i) => {
      const x = padX + (i / Math.max(series.length - 1, 1)) * innerW;
      const y = padY + innerH - ((v - min) / span) * innerH;
      return { x, y, v };
    });
    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)} ${(height - padY).toFixed(1)} L${pts[0].x.toFixed(1)} ${(height - padY).toFixed(1)} Z`;
    return { line: linePath, area: areaPath, points: pts };
  }, [series]);

  return (
    <article className={`${styles.chartCard} ${styles.chartCardWide}`}>
      <header className={styles.chartCardHead}>
        <h3 className={styles.chartCardTitle}>{title}</h3>
        <p className={styles.chartCardHint}>Courbe</p>
      </header>
      <svg className={styles.chartLineSvg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <path d={area} className={styles.chartLineArea} />
        <path d={line} className={styles.chartLinePath} fill="none" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" className={styles.chartLineDot} />
        ))}
      </svg>
      {labels?.length ? (
        <div className={styles.chartLineLabels}>
          {labels.filter((_, i) => i % 2 === 0 || i === labels.length - 1).map(label => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function UiKitTooltip({ content, children, position = "top", delay = 280 }) {
  const triggerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const clearTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    let top = 0;
    let left = 0;
    let transform = "translate(-50%, -100%)";
    switch (position) {
      case "bottom":
        top = r.bottom + gap;
        left = r.left + r.width / 2;
        transform = "translate(-50%, 0)";
        break;
      case "left":
        top = r.top + r.height / 2;
        left = r.left - gap;
        transform = "translate(-100%, -50%)";
        break;
      case "right":
        top = r.top + r.height / 2;
        left = r.right + gap;
        transform = "translate(0, -50%)";
        break;
      default:
        top = r.top - gap;
        left = r.left + r.width / 2;
        transform = "translate(-50%, -100%)";
    }
    setCoords({ top, left, transform });
  }, [position]);

  const show = () => {
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      place();
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => setVisible(false), 60);
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!visible) return undefined;
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [visible, place]);

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.tooltipTrigger}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              className={[
                styles.tooltipBubble,
                position === "bottom"
                  ? styles.tooltipBubble_bottom
                  : position === "left"
                    ? styles.tooltipBubble_left
                    : position === "right"
                      ? styles.tooltipBubble_right
                      : styles.tooltipBubble_top
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ top: coords.top, left: coords.left, transform: coords.transform }}
              role="tooltip"
            >
              {content}
              <span className={styles.tooltipArrow} aria-hidden />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function getScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if (oy === "auto" || oy === "scroll" || oy === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function readScrollTop(scroller) {
  if (!scroller) return window.scrollY || document.documentElement.scrollTop || 0;
  if (scroller === document.documentElement || scroller === document.body || scroller === document.scrollingElement) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return scroller.scrollTop || 0;
}

/** Meilleur candidat : scroller de la page, ou le plus « bas » parmi les ancêtres qui scrollent. */
function resolveUiKitScroller(pageEl) {
  if (!pageEl) return document.scrollingElement || document.documentElement;
  const direct = getScrollParent(pageEl);
  if (direct && readScrollTop(direct) > 0) return direct;
  // contentWrapper > * (pattern app Veritas)
  const fromClosest = pageEl.closest?.(".contentWrapper > *") || pageEl.parentElement;
  if (fromClosest && fromClosest !== document.body) return fromClosest;
  return direct;
}

function buildDemoEventsWeek(days = 7) {
  const counts = [2, 0, 1, 3, 0, 1, 0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekday = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const dd = String(day.getDate()).padStart(2, "0");
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    return {
      key: `${day.getFullYear()}-${mm}-${dd}`,
      date: day,
      dateLabel: `${dd}/${mm}`,
      weekday: weekday[day.getDay()],
      isToday: i === 0,
      count: counts[i] ?? 0
    };
  });
}

const DEMO_EVENTS_WEEK = buildDemoEventsWeek();
const DEMO_EVENTS_AS_CALENDAR = DEMO_EVENTS_WEEK.flatMap(d =>
  Array.from({ length: d.count }, (_, i) => ({
    id: `${d.key}-${i}`,
    start: d.date,
    end: d.date
  }))
);

const DEMO_NEWS_ITEMS = [
  {
    id: "n1",
    category: "cve",
    categoryLabel: "CVE",
    source: "NVD",
    time: "Il y a 2 h",
    title: "CVE-2026-4421 — exécution de code à distance sur OpenSSL",
    snippet: "Une faille critique permet l’exécution de code via un handshake TLS malformé."
  },
  {
    id: "n2",
    category: "security",
    categoryLabel: "Sécurité",
    source: "ANSSI",
    time: "Il y a 5 h",
    title: "Alerte ransomware — campagne ciblant les MSP",
    snippet: "Renforcer les sauvegardes immuables et vérifier les accès RDP exposés."
  },
  {
    id: "n3",
    category: "tech",
    categoryLabel: "Tech",
    source: "Microsoft",
    time: "Hier",
    title: "Windows Server — correctifs cumulatifs d’octobre",
    snippet: "Mises à jour de sécurité et correctifs réseau pour 2019 / 2022."
  },
  {
    id: "n4",
    category: "news",
    categoryLabel: "Actualités",
    source: "IT Pro",
    time: "Hier",
    title: "CheckMK 2.4 : nouvelles règles de supervision cloud",
    snippet: "Découverte automatique améliorée pour les instances Azure et AWS."
  }
];

const TICKET_CHAT = [
  {
    id: "m1",
    outbound: false,
    author: "Alice Martin",
    time: "09:12",
    text: "Bonjour, l’imprimante du siège ne répond plus depuis ce matin."
  },
  {
    id: "m2",
    outbound: true,
    author: "Vous",
    time: "09:18",
    text: "Bien reçu. Je vérifie le service d’impression et je reviens vers vous."
  },
  {
    id: "m3",
    outbound: false,
    author: "Alice Martin",
    time: "09:21",
    text: "Merci — c’est urgent pour la facturation du mois."
  }
];

const FILTER_OPTIONS = [
  { value: "all", label: "Tous les types" },
  { value: "invoice", label: "Facture" },
  { value: "image", label: "Image client" },
  { value: "rack", label: "Baie de brassage" },
  { value: "network", label: "Plan de réseau" },
  { value: "procedure", label: "Procédure" },
  { value: "contract", label: "Contrat" }
];

const TYPE_OPTIONS = [
  { value: "server", label: "Serveur" },
  { value: "firewall", label: "Firewall" },
  { value: "switch", label: "Switch" },
  { value: "storage", label: "Stockage" },
  { value: "wifi", label: "Wi‑Fi" }
];

/** Longue liste pour démo combobox (recherche dans les options). */
const COMBOBOX_OPTIONS = [
  "SRV-DC01",
  "SRV-DC02",
  "SRV-FILE-01",
  "SRV-FILE-02",
  "SRV-SQL-PROD",
  "SRV-SQL-STAGING",
  "SRV-APP-WEB",
  "SRV-APP-API",
  "SRV-BACKUP-01",
  "SRV-MONITOR",
  "FW-EDGE-PARIS",
  "FW-EDGE-LYON",
  "SW-CORE-01",
  "SW-CORE-02",
  "SW-ACCESS-A1",
  "SW-ACCESS-A2",
  "SW-ACCESS-B1",
  "AP-WIFI-SALON",
  "AP-WIFI-ETAGE2",
  "AP-WIFI-ENTREPOT",
  "NAS-01",
  "NAS-02",
  "UPS-SALLE-INFO",
  "PRN-COMPTA",
  "PRN-ACCUEIL",
  "VM-DOCKER-01",
  "VM-DOCKER-02",
  "VM-GITLAB",
  "VM-JENKINS",
  "RTR-WAN-PRIMAIRE",
  "RTR-WAN-SECOURS",
  "VPN-GATEWAY",
  "PROXY-OUT",
  "LDAP-AD-01",
  "LDAP-AD-02",
  "MAIL-MX01",
  "MAIL-MX02",
  "STORAGE-SAN-A",
  "STORAGE-SAN-B",
  "CAM-ENTREE",
  "CAM-PARKING",
  "BADGE-CTRL-01",
  "PHONE-TOIP-CENTRAL",
  "PHONE-TOIP-ACCUEIL"
].map(name => ({ value: name.toLowerCase(), label: name }));

const TICKET_STATUS_OPTIONS = [
  { value: "open", label: "Ouvert" },
  { value: "progress", label: "En cours" },
  { value: "resolved", label: "Résolu" }
];

const TICKET_PRIORITY_OPTIONS = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" }
];

const TICKET_CATEGORY_OPTIONS = [
  { value: "print", label: "Impression" },
  { value: "network", label: "Réseau" },
  { value: "hardware", label: "Matériel" }
];

const COLOR_SWATCHES = ["#2b5fab", "#3d8f6a", "#e8a04a", "#e08a8a", "#8b5cf6", "#64748b"];

/** True si l’élément a quitté le viewport ou un ancêtre scrollable (cadre). */
function isPopupOutOfFrame(el) {
  if (!el) return true;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return true;

  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const margin = 4;
  if (rect.bottom < margin || rect.top > vh - margin || rect.right < margin || rect.left > vw - margin) {
    return true;
  }

  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const clips =
      oy === "auto" ||
      oy === "scroll" ||
      oy === "hidden" ||
      ox === "auto" ||
      ox === "scroll" ||
      ox === "hidden";
    if (clips) {
      const prect = parent.getBoundingClientRect();
      if (
        rect.bottom < prect.top + margin ||
        rect.top > prect.bottom - margin ||
        rect.right < prect.left + margin ||
        rect.left > prect.right - margin
      ) {
        return true;
      }
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Ferme un popup : clic / touch hors zone, Escape, autre popup UI kit.
 * Le scroll ne ferme PAS (y compris scroll dans la liste / portal).
 * Exception : si le scroll fait sortir le champ du cadre visible → fermeture.
 * @param {React.RefObject} [portalRef] menu rendu hors du root (createPortal)
 */
function usePopupDismiss(open, onClose, rootRef, portalRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const close = () => onCloseRef.current();
    const token = Symbol("uikit-popup");

    const onOtherPopup = e => {
      if (e.detail !== token) close();
    };
    window.dispatchEvent(new CustomEvent("uikit-popup-open", { detail: token }));
    window.addEventListener("uikit-popup-open", onOtherPopup);

    const isInside = target => {
      const root = rootRef.current;
      const portal = portalRef?.current;
      if (root?.contains(target)) return true;
      if (portal?.contains(target)) return true;
      return false;
    };

    const onPointerDown = e => {
      if (!isInside(e.target)) close();
    };

    const onScroll = e => {
      const root = rootRef.current;
      if (!root) return;
      if (isInside(e.target)) return;
      if (isPopupOutOfFrame(root)) close();
    };

    const onKeyDown = e => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("uikit-popup-open", onOtherPopup);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef, portalRef]);
}

/** Ancre un menu en position:fixed sous le trigger (sort des cadres overflow). */
function useAnchoredMenuCoords(open, anchorRef, gap = 6) {
  const [coords, setCoords] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({
        top: Math.round(r.bottom + gap),
        left: Math.round(r.left),
        width: Math.round(r.width)
      });
    };
    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, gap]);

  return coords;
}

function getKitPortalRoot(fromEl) {
  if (typeof document === "undefined") return null;
  return fromEl?.closest("[data-theme]") || document.body;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex) {
  const raw = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return { r: 43, g: 95, b: 171 };
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const to = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsv(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255)
  };
}

function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

const MODAL_NAV = [
  { id: "identity", label: "Identité", icon: "mdi:badge-account-outline" },
  { id: "location", label: "Localisation", icon: "mdi:map-marker-outline" },
  { id: "modules", label: "Modules", icon: "mdi:puzzle-outline" },
  { id: "contract", label: "Contrat", icon: "mdi:file-document-outline" }
];

const MODAL_CONTENT = {
  identity: {
    title: "Identité",
    desc: "Informations principales de l’entreprise."
  },
  location: {
    title: "Localisation",
    desc: "Sites rattachés et adresse principale."
  },
  modules: {
    title: "Modules",
    desc: "Activez les briques Cyber, Cloud et Supervision."
  },
  contract: {
    title: "Contrat",
    desc: "Paramètres contractuels et niveau de service."
  }
};

function ColorPicker({ value, onChange, swatches = COLOR_SWATCHES, showSwatches = true }) {
  const rootRef = useRef(null);
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);
  const [eyeDropperOk, setEyeDropperOk] = useState(false);
  const rgb = useMemo(() => hexToRgb(value), [value]);
  const hsv = useMemo(() => rgbToHsv(rgb.r, rgb.g, rgb.b), [rgb.r, rgb.g, rgb.b]);
  const hueColor = useMemo(() => hsvToHex(hsv.h, 1, 1), [hsv.h]);

  usePopupDismiss(open, () => setOpen(false), rootRef);

  useEffect(() => {
    setHexDraft(value);
  }, [value]);

  useEffect(() => {
    setEyeDropperOk(typeof window !== "undefined" && Boolean(window.EyeDropper));
  }, []);

  const commitHsv = (h, s, v) => onChange(hsvToHex(h, s, v));

  const pickSv = (clientX, clientY) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    commitHsv(hsv.h, s, v);
  };

  const pickHue = clientX => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.999);
    commitHsv(h, hsv.s, hsv.v);
  };

  const startDrag = (moveFn, endEvents = ["mouseup", "touchend"]) => {
    const onMove = e => {
      const point = e.touches?.[0] || e;
      moveFn(point);
    };
    const onEnd = () => {
      endEvents.forEach(ev => window.removeEventListener(ev, onEnd));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    endEvents.forEach(ev => window.addEventListener(ev, onEnd));
  };

  const setChannel = (channel, raw) => {
    const n = Number.parseInt(String(raw).replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) return;
    const next = { ...rgb, [channel]: clamp(n, 0, 255) };
    onChange(rgbToHex(next.r, next.g, next.b));
  };

  const useEyedropper = async () => {
    if (!eyeDropperOk) return;
    try {
      const result = await new window.EyeDropper().open();
      if (result?.sRGBHex) onChange(result.sRGBHex.toLowerCase());
    } catch {
      /* annulé */
    }
  };

  return (
    <div className={styles.colorRow} ref={rootRef}>
      <div className={styles.colorPickerWrap}>
        <button
          type="button"
          className={`${styles.colorWheel} ${open ? styles.colorWheelOpen : ""}`}
          onClick={() => setOpen(prev => !prev)}
          aria-label="Ouvrir la color wheel"
          aria-expanded={open}
          aria-haspopup="dialog"
          title="Color wheel"
        />
        {open ? (
          <div className={styles.colorPopover} role="dialog" aria-label="Sélecteur de couleur">
            <div
              ref={svRef}
              className={styles.colorSv}
              style={{ backgroundColor: hueColor }}
              onMouseDown={e => {
                e.preventDefault();
                pickSv(e.clientX, e.clientY);
                startDrag(p => pickSv(p.clientX, p.clientY));
              }}
              onTouchStart={e => {
                const t = e.touches[0];
                if (!t) return;
                pickSv(t.clientX, t.clientY);
                startDrag(p => pickSv(p.clientX, p.clientY));
              }}
              role="presentation"
            >
              <span
                className={styles.colorSvThumb}
                style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
              />
            </div>

            <div className={styles.colorTools}>
              <button
                type="button"
                className={styles.colorEyedrop}
                onClick={useEyedropper}
                aria-label="Pipette"
                title={eyeDropperOk ? "Pipette" : "Pipette non supportée"}
                disabled={!eyeDropperOk}
              >
                <Icon icon="mdi:eyedropper" aria-hidden />
              </button>
              <span className={styles.colorPreview} style={{ background: value }} aria-hidden />
              <div
                ref={hueRef}
                className={styles.colorHue}
                onMouseDown={e => {
                  e.preventDefault();
                  pickHue(e.clientX);
                  startDrag(p => pickHue(p.clientX));
                }}
                onTouchStart={e => {
                  const t = e.touches[0];
                  if (!t) return;
                  pickHue(t.clientX);
                  startDrag(p => pickHue(p.clientX));
                }}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(hsv.h)}
                aria-label="Teinte"
                tabIndex={0}
              >
                <span className={styles.colorHueThumb} style={{ left: `${(hsv.h / 360) * 100}%` }} />
              </div>
            </div>

            <div className={styles.colorRgbRow}>
              {[
                { key: "r", label: "R", val: rgb.r },
                { key: "g", label: "G", val: rgb.g },
                { key: "b", label: "B", val: rgb.b }
              ].map(ch => (
                <label key={ch.key} className={styles.colorRgbField}>
                  <input
                    className={styles.colorRgbInput}
                    type="text"
                    inputMode="numeric"
                    value={ch.val}
                    onChange={e => setChannel(ch.key, e.target.value)}
                    aria-label={ch.label}
                  />
                  <span className={styles.colorRgbLabel}>{ch.label}</span>
                </label>
              ))}
              <span className={styles.colorRgbMode} aria-hidden>
                <Icon icon="mdi:unfold-more-horizontal" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {showSwatches
        ? swatches.map(hex => (
            <button
              key={hex}
              type="button"
              className={`${styles.colorSwatch} ${value.toLowerCase() === hex.toLowerCase() ? styles.colorSwatchActive : ""}`}
              style={{ "--swatch-color": hex }}
              onClick={() => onChange(hex)}
              aria-label={hex}
            />
          ))
        : null}

      <input
        type="text"
        className={styles.colorHex}
        value={hexDraft}
        onChange={e => {
          const next = e.target.value;
          if (!/^#([0-9a-fA-F]{0,6})$/.test(next)) return;
          setHexDraft(next);
          if (next.length === 7) onChange(next.toLowerCase());
        }}
        onBlur={() => {
          if (/^#[0-9a-fA-F]{6}$/.test(hexDraft)) onChange(hexDraft.toLowerCase());
          else setHexDraft(value);
        }}
        spellCheck={false}
        maxLength={7}
        aria-label="Couleur hex"
      />
    </div>
  );
}

const INPUT_SIZE_CLASS = {
  s: styles.inputS,
  m: styles.inputM,
  l: styles.inputL,
  xl: styles.inputXl
};

/** À partir de N options : hauteur fixe + fade. En dessous : hauteur au contenu. */
const DROPDOWN_FIXED_HEIGHT_FROM = 6;

function dropdownMenuShellClass(sizeClass, optionCount, extra = "") {
  const fixed = optionCount >= DROPDOWN_FIXED_HEIGHT_FROM;
  return [
    styles.fieldSelectMenuShell,
    sizeClass,
    fixed ? "" : styles.fieldSelectMenuShellAuto,
    extra
  ]
    .filter(Boolean)
    .join(" ");
}

function FieldSelect({ options, value, onChange, ariaLabel, size = "xl" }) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const label = options.find(o => o.value === value)?.label || options[0]?.label || "";
  const sizeClass = INPUT_SIZE_CLASS[size] || INPUT_SIZE_CLASS.xl;
  const coords = useAnchoredMenuCoords(open, rootRef);

  usePopupDismiss(open, () => setOpen(false), rootRef, menuRef);

  const portalRoot = open ? getKitPortalRoot(rootRef.current) : null;
  const menu =
    open && coords && portalRoot
      ? createPortal(
          <ScrollFadeShell
            shellRef={menuRef}
            className={`${dropdownMenuShellClass(sizeClass, options.length)} ${styles.dropdownMenuFixed}`}
            deps={[options.length, size]}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <ul className={`${styles.fieldSelectMenu} ${sizeClass}`} role="listbox" aria-label={ariaLabel}>
              {options.map(option => (
                <li key={option.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    className={`${styles.fieldSelectOption} ${sizeClass} ${value === option.value ? styles.fieldSelectOptionActive : ""}`}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollFadeShell>,
          portalRoot
        )
      : null;

  return (
    <div
      className={`${styles.fieldSelectWrap} ${open ? styles.fieldSelectWrapOpen : ""}`}
      ref={rootRef}
      data-size={size}
    >
      <button
        type="button"
        className={`${styles.fieldSelectTrigger} ${sizeClass} ${open ? styles.fieldSelectTriggerOpen : ""}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={styles.fieldSelectValue}>{label}</span>
        <Icon
          icon="mdi:chevron-down"
          className={`${styles.fieldSelectChevron} ${open ? styles.fieldSelectChevronOpen : ""}`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}

/** Select filtrable : champ input + liste, on tape pour filtrer les options. */
function ComboboxSelect({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = "Sélectionner…",
  size = "xl",
  emptyLabel = "Aucun résultat"
}) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sizeClass = INPUT_SIZE_CLASS[size] || INPUT_SIZE_CLASS.xl;
  const selected = options.find(o => o.value === value);
  const coords = useAnchoredMenuCoords(open, rootRef);

  usePopupDismiss(open, () => setOpen(false), rootRef, menuRef);

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label || "");
    }
  }, [open, selected?.label]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      option =>
        option.label.toLowerCase().includes(q) ||
        String(option.value).toLowerCase().includes(q)
    );
  }, [options, query]);

  const openMenu = () => {
    setOpen(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pick = option => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <div
      className={`${styles.fieldSelectWrap} ${styles.comboboxWrap} ${open ? styles.fieldSelectWrapOpen : ""}`}
      ref={rootRef}
      data-size={size}
    >
      <div
        className={`${styles.comboboxControl} ${sizeClass} ${open ? styles.comboboxControlOpen : ""}`}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.comboboxInput}
          value={open ? query : selected?.label || query}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
          onFocus={openMenu}
          onClick={openMenu}
          onChange={e => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              pick(filtered[0]);
            }
          }}
        />
        {selected && !open ? (
          <button
            type="button"
            className={styles.comboboxClear}
            onClick={e => {
              e.stopPropagation();
              onChange("");
              setQuery("");
              setOpen(false);
            }}
            aria-label="Effacer"
          >
            <Icon icon="mdi:close" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          className={styles.comboboxChevronBtn}
          tabIndex={-1}
          aria-label={open ? "Fermer la liste" : "Ouvrir la liste"}
          onClick={() => {
            if (open) {
              setOpen(false);
            } else {
              openMenu();
            }
          }}
        >
          <Icon
            icon="mdi:chevron-down"
            className={`${styles.fieldSelectChevron} ${open ? styles.fieldSelectChevronOpen : ""}`}
            aria-hidden
          />
        </button>
      </div>
      {open && coords && getKitPortalRoot(rootRef.current)
        ? createPortal(
            <ScrollFadeShell
              shellRef={menuRef}
              className={`${dropdownMenuShellClass(sizeClass, filtered.length)} ${styles.dropdownMenuFixed}`}
              deps={[filtered.length, size, query]}
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              <ul className={`${styles.fieldSelectMenu} ${sizeClass}`} role="listbox" aria-label={ariaLabel}>
                {filtered.length === 0 ? (
                  <li className={styles.comboboxEmpty} role="presentation">
                    {emptyLabel}
                  </li>
                ) : (
                  filtered.map(option => (
                    <li key={option.value} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === option.value}
                        className={`${styles.fieldSelectOption} ${sizeClass} ${value === option.value ? styles.fieldSelectOptionActive : ""}`}
                        onClick={() => pick(option)}
                      >
                        {option.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </ScrollFadeShell>,
            getKitPortalRoot(rootRef.current)
          )
        : null}
    </div>
  );
}

function IconFieldSelect({
  value,
  onChange,
  color = "#2b5fab",
  onColorChange,
  choices = UI_KIT_ICON_PACK,
  size = "xl"
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sizeClass = INPUT_SIZE_CLASS[size] || INPUT_SIZE_CLASS.xl;

  usePopupDismiss(open, () => setOpen(false), rootRef);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return choices;
    return choices.filter(icon => icon.toLowerCase().includes(q));
  }, [choices, query]);

  return (
    <div className={`${styles.iconField} ${open ? styles.iconFieldOpen : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`${styles.iconFieldBtn} ${sizeClass} ${open ? styles.iconFieldBtnOpen : ""}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choisir une icône"
        title={value || "Choisir une icône"}
        style={{ color }}
      >
        <Icon icon={value || "mdi:emoticon-outline"} aria-hidden />
      </button>
      {open ? (
        <div className={styles.iconFieldPopover} role="dialog" aria-label="Sélection d’icône">
          <div className={`${styles.searchBox} ${styles.searchBoxFluid}`}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher une icône"
              autoFocus
            />
            {query ? (
              <button type="button" className={styles.searchClear} onClick={() => setQuery("")} aria-label="Effacer">
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
          {typeof onColorChange === "function" ? (
            <div className={styles.iconColorRow}>
              <span className={styles.iconColorLabel}>Couleur</span>
              <div className={styles.colorRow}>
                {COLOR_SWATCHES.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    className={`${styles.colorSwatch} ${color.toLowerCase() === hex.toLowerCase() ? styles.colorSwatchActive : ""}`}
                    style={{ "--swatch-color": hex }}
                    onClick={() => onColorChange(hex)}
                    aria-label={hex}
                  />
                ))}
                <input
                  type="text"
                  className={styles.colorHex}
                  value={color}
                  onChange={e => {
                    const next = e.target.value;
                    if (/^#([0-9a-fA-F]{0,6})$/.test(next) && next.length === 7) {
                      onColorChange(next.toLowerCase());
                    }
                  }}
                  spellCheck={false}
                  maxLength={7}
                  aria-label="Couleur hex icône"
                />
              </div>
            </div>
          ) : null}
          <ScrollFadeShell className={styles.iconFieldGridShell} deps={[filtered.length, query]}>
            <div className={styles.iconPackGrid} role="listbox" aria-label="Icônes" style={{ color }}>
              {filtered.map(icon => {
                const active = icon === value;
                return (
                  <button
                    key={icon}
                    type="button"
                    role="option"
                    aria-selected={active}
                    title={icon}
                    className={`${styles.iconPackTile} ${active ? styles.iconPackTileActive : ""}`}
                    onClick={() => {
                      onChange(icon);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Icon icon={icon} aria-hidden />
                  </button>
                );
              })}
            </div>
          </ScrollFadeShell>
          <p className={styles.iconPackCount}>
            {filtered.length} icône{filtered.length > 1 ? "s" : ""}
            {query ? ` · filtre « ${query} »` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PillSelect({ options, value, onChange, ariaLabel, icon = "mdi:filter-variant" }) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const label = options.find(o => o.value === value)?.label || options[0]?.label || "";
  const coords = useAnchoredMenuCoords(open, rootRef);

  usePopupDismiss(open, () => setOpen(false), rootRef, menuRef);

  return (
    <div className={`${styles.pillSelectWrap} ${open ? styles.pillSelectWrapOpen : ""}`} ref={rootRef}>
      <button
        type="button"
        className={styles.pillSelectTrigger}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <Icon icon={icon} className={styles.pillSelectIcon} aria-hidden />
        <span className={styles.pillSelectValue}>{label}</span>
        <Icon
          icon="mdi:chevron-down"
          className={`${styles.pillSelectChevron} ${open ? styles.pillSelectChevronOpen : ""}`}
          aria-hidden
        />
      </button>
      {open && coords && getKitPortalRoot(rootRef.current)
        ? createPortal(
            <ScrollFadeShell
              shellRef={menuRef}
              className={`${styles.pillSelectMenuShell} ${options.length >= DROPDOWN_FIXED_HEIGHT_FROM ? "" : styles.pillSelectMenuShellAuto} ${styles.dropdownMenuFixed}`.trim()}
              deps={[options.length]}
              style={{ top: coords.top, left: coords.left, width: coords.width }}
            >
              <ul className={styles.pillSelectMenu} role="listbox" aria-label={ariaLabel}>
                {options.map(option => (
                  <li key={option.value} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === option.value}
                      className={`${styles.pillSelectOption} ${value === option.value ? styles.pillSelectOptionActive : ""}`}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollFadeShell>,
            getKitPortalRoot(rootRef.current)
          )
        : null}
    </div>
  );
}

function KitCheckbox({ checked, onChange, children }) {
  return (
    <label className={styles.checkItem}>
      <span className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ""}`} aria-hidden>
        <Icon icon="mdi:check" className={styles.checkboxTick} />
      </span>
      <input
        type="checkbox"
        className={styles.checkboxNative}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

function ModalCheckRow() {
  const [supervision, setSupervision] = useState(true);
  const [backup, setBackup] = useState(true);
  const [cyber, setCyber] = useState(false);
  return (
    <div className={styles.checkRow}>
      <KitCheckbox checked={supervision} onChange={setSupervision}>
        Supervision
      </KitCheckbox>
      <KitCheckbox checked={backup} onChange={setBackup}>
        Sauvegarde
      </KitCheckbox>
      <KitCheckbox checked={cyber} onChange={setCyber}>
        Cybersécurité
      </KitCheckbox>
    </div>
  );
}

function SectionedModalFields({ sectionId, pickedColor, onColorChange }) {
  const [pack, setPack] = useState("msp");
  const [offer, setOffer] = useState("essentiel");
  const [sla, setSla] = useState("standard");
  const [status, setStatus] = useState("active");

  if (sectionId === "location") {
    return (
      <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span className={styles.fieldLabel}>Siège</span>
          <input className={styles.input} type="text" defaultValue="Paris" />
        </label>
        <label className={styles.formField}>
          <span className={styles.fieldLabel}>Agence</span>
          <input className={styles.input} type="text" defaultValue="Lyon" />
        </label>
        <label className={`${styles.formField} ${styles.formFieldFull}`}>
          <span className={styles.fieldLabel}>Rechercher un site</span>
          <div className={`${styles.searchBox} ${styles.searchBoxFluid}`}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input type="search" className={styles.searchInput} placeholder="Rechercher" aria-label="Rechercher un site" />
          </div>
        </label>
        <label className={`${styles.formField} ${styles.formFieldFull}`}>
          <span className={styles.fieldLabel}>Adresse</span>
          <textarea className={styles.textarea} rows={3} defaultValue="12 rue de la Démo, 75001 Paris" />
        </label>
      </div>
    );
  }

  if (sectionId === "modules") {
    return (
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <span className={styles.fieldLabel}>Pack</span>
          <FieldSelect
            ariaLabel="Pack"
            options={[
              { value: "msp", label: "MSP Essentiel" },
              { value: "pro", label: "MSP Pro" }
            ]}
            value={pack}
            onChange={setPack}
          />
        </div>
        <div className={styles.formField}>
          <span className={styles.fieldLabel}>Couleur module</span>
          <ColorPicker value={pickedColor} onChange={onColorChange} showSwatches={false} />
        </div>
        <div className={`${styles.formField} ${styles.formFieldFull}`}>
          <span className={styles.fieldLabel}>Activation</span>
          <ModalCheckRow />
        </div>
      </div>
    );
  }

  if (sectionId === "contract") {
    return (
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <span className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>Offre</span>
          <FieldSelect
            ariaLabel="Offre"
            options={[
              { value: "essentiel", label: "MSP Essentiel" },
              { value: "premium", label: "MSP Premium" }
            ]}
            value={offer}
            onChange={setOffer}
          />
        </div>
        <div className={styles.formField}>
          <span className={styles.fieldLabel}>SLA</span>
          <FieldSelect
            ariaLabel="SLA"
            options={[
              { value: "standard", label: "Standard" },
              { value: "gold", label: "Gold" }
            ]}
            value={sla}
            onChange={setSla}
          />
        </div>
        <label className={`${styles.formField} ${styles.formFieldFull}`}>
          <span className={styles.fieldLabel}>Notes contractuelles</span>
          <textarea className={styles.textarea} rows={3} placeholder="Clauses particulières…" />
        </label>
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <label className={styles.formField}>
        <span className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>Raison sociale</span>
        <input className={styles.input} type="text" defaultValue="Entreprise Démo SAS" />
      </label>
      <label className={styles.formField}>
        <span className={styles.fieldLabel}>Code client</span>
        <input className={styles.input} type="text" defaultValue="CL-1042" />
      </label>
      <div className={styles.formField}>
        <span className={styles.fieldLabel}>Statut</span>
        <FieldSelect
          ariaLabel="Statut"
          options={[
            { value: "active", label: "Actif" },
            { value: "inactive", label: "Inactif" }
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>
      <label className={`${styles.formField} ${styles.formFieldFull}`}>
        <span className={styles.fieldLabel}>Description</span>
        <textarea className={styles.textarea} rows={3} placeholder="Notes libres…" />
      </label>
    </div>
  );
}

function SectionedModal({
  activeSection,
  onSectionChange,
  onClose,
  embedded = false,
  showClose = true,
  pickedColor = "#2b5fab",
  onColorChange,
  exiting = false,
  onExited
}) {
  const content = MODAL_CONTENT[activeSection] || MODAL_CONTENT.identity;
  const modalNavRef = useRef(null);
  const [navIndicator, setNavIndicator] = useState({ top: 0, height: 0 });

  useEffect(() => {
    if (!exiting || embedded) return undefined;
    const timer = window.setTimeout(() => onExited?.(), 260);
    return () => window.clearTimeout(timer);
  }, [exiting, embedded, onExited]);

  useLayoutEffect(() => {
    const root = modalNavRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-current="page"]');
      if (!active) return;
      setNavIndicator({ top: active.offsetTop, height: active.offsetHeight });
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    return () => ro?.disconnect();
  }, [activeSection]);

  const shell = (
    <div
      className={`${styles.modalShell} ${embedded ? "" : exiting ? styles.modalShellOut : styles.modalShellIn}`}
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-labelledby={embedded ? undefined : "uikit-modal-title"}
    >
      <div className={styles.modalAccentBar} aria-hidden />
      <header className={styles.modalHeader}>
        <div className={styles.modalHeaderMain}>
          <span className={styles.modalHeaderIcon} aria-hidden>
            <Icon icon="mdi:office-building-cog-outline" />
          </span>
          <div>
            <p className={styles.modalEyebrow}>Configuration</p>
            <h3 className={styles.modalTitle} id={embedded ? undefined : "uikit-modal-title"}>
              Modifier l’entreprise
            </h3>
            <p className={styles.modalSubtitle}>Création / édition</p>
          </div>
        </div>
        {showClose ? (
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <Icon icon="mdi:close" aria-hidden />
          </button>
        ) : null}
      </header>

      <div className={styles.modalBody}>
        <aside className={`${styles.finderSidebar} ${styles.modalFinderSidebar}`} aria-label="Sections">
          <nav className={`${styles.finderPrimary} ${styles.finderPrimaryAnimated}`} ref={modalNavRef}>
            <span
              className={styles.finderNavIndicator}
              style={{
                transform: `translateY(${navIndicator.top}px)`,
                height: navIndicator.height
              }}
              aria-hidden
            />
            {MODAL_NAV.map(item => (
              <button
                key={item.id}
                type="button"
                className={`${styles.finderItem} ${activeSection === item.id ? styles.finderItemActive : ""}`}
                onClick={() => onSectionChange(item.id)}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                <Icon icon={item.icon} className={styles.finderItemIcon} aria-hidden />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className={styles.modalContent} key={activeSection}>
          <div className={styles.modalContentAnim}>
            <div className={styles.modalSectionHead}>
              <h4 className={styles.modalSectionTitle}>{content.title}</h4>
              <p className={styles.modalSectionDesc}>{content.desc}</p>
            </div>
            <SectionedModalFields
              sectionId={activeSection}
              pickedColor={pickedColor}
              onColorChange={onColorChange || (() => {})}
            />
          </div>
        </div>
      </div>

      <footer className={styles.modalFooter}>
        <span className={styles.modalFooterHint}>* Champs obligatoires</span>
        <div className={styles.modalFooterActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
            <Icon icon="mdi:check" aria-hidden />
            Enregistrer
          </button>
        </div>
      </footer>
    </div>
  );

  if (embedded) {
    return <div className={styles.modalPreview}>{shell}</div>;
  }

  return (
    <div
      className={`${styles.modalOverlay} ${exiting ? styles.modalOverlayOut : styles.modalOverlayIn}`}
      onClick={onClose}
      role="presentation"
    >
      <div onClick={e => e.stopPropagation()} role="presentation">
        {shell}
      </div>
    </div>
  );
}

function EntityCard({ name, role, meta = [], primary = false, kind = "person", badge }) {
  const isSite = kind === "site";
  const label = badge || (primary ? "Principal" : null);
  return (
    <button
      type="button"
      className={`${styles.entityCard} ${primary ? styles.entityCardPrimary : ""} ${isSite ? styles.entityCardSite : ""}`.trim()}
    >
      <div className={styles.entityCardMain}>
        <div className={styles.entityCardTop}>
          <div className={styles.entityCardIdentity}>
            <span className={styles.entityCardName}>{name}</span>
            {role ? <span className={styles.entityCardRole}>{role}</span> : null}
          </div>
          {label ? <span className={styles.entityCardBadge}>{label}</span> : null}
        </div>
        {!isSite && meta.length > 0 ? (
          <div className={styles.entityCardMeta}>
            {meta.map(row => (
              <span key={`${row.icon}-${row.value}`} className={styles.entityCardMetaRow}>
                <Icon icon={row.icon} className={styles.entityCardMetaIcon} aria-hidden />
                <span className={styles.entityCardMetaValue}>{row.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {isSite ? (
        <span className={styles.entityCardMapPlaceholder} aria-hidden>
          <Icon icon="mdi:map-outline" />
        </span>
      ) : null}
    </button>
  );
}

function KitAvatar({ name, avatar, size = 48, variant = "agent" }) {
  if (avatar?.type === "upload" && avatar.url) {
    return (
      <span
        className={styles.kitAvatarUpload}
        style={{ width: size, height: size, fontSize: `${Math.max(0.7, size / 48)}rem` }}
        title={name || undefined}
        aria-hidden
      >
        <img src={avatar.url} alt="" />
      </span>
    );
  }
  return <UserAvatar user={{ avatar }} name={name} size={size} variant={variant} />;
}

function UserCard({ name, role, email, status = "active", avatar, compact = false, selected = false, onClick }) {
  const active = status === "active";
  return (
    <button
      type="button"
      className={`${styles.userCard} ${compact ? styles.userCardCompact : ""} ${selected ? styles.userCardSelected : ""}`.trim()}
      onClick={onClick}
    >
      <KitAvatar name={name} avatar={avatar} size={compact ? 40 : 48} />
      <div className={styles.userCardBody}>
        <div className={styles.userCardTop}>
          <span className={styles.userCardName}>{name}</span>
          <span className={`${styles.userCardStatus} ${active ? styles.userCardStatusActive : styles.userCardStatusInactive}`}>
            <span className={styles.userCardStatusDot} aria-hidden />
            {active ? "Actif" : "Inactif"}
          </span>
        </div>
        {role ? <span className={styles.userCardRole}>{role}</span> : null}
        {email ? (
          <span className={styles.userCardEmail}>
            <Icon icon="mdi:email-outline" aria-hidden />
            {email}
          </span>
        ) : null}
      </div>
    </button>
  );
}

/** Sélecteur photo de profil (démo locale, sans API) — pattern AvatarEditor */
function ProfilePhotoPicker({ name, avatar, onChange }) {
  const fileRef = useRef(null);
  const activePresetId = avatar?.type === "preset" ? avatar.presetId : null;
  const hasCustom = avatar?.type === "upload";

  return (
    <div className={styles.profilePhotoPicker}>
      <div className={styles.profilePhotoCurrent}>
        <KitAvatar name={name} avatar={avatar} size={80} />
        <div className={styles.profilePhotoMeta}>
          <span className={styles.profilePhotoLabel}>Photo actuelle</span>
          <span className={styles.profilePhotoHint}>Presets, import JPEG / PNG / WebP (max 2 Mo)</span>
        </div>
      </div>
      <div className={styles.profilePresetGrid} role="listbox" aria-label="Avatars prédéfinis">
        {PRESET_AVATARS.map(preset => (
          <button
            key={preset.id}
            type="button"
            role="option"
            aria-selected={activePresetId === preset.id}
            title={preset.label}
            className={`${styles.profilePresetBtn} ${activePresetId === preset.id ? styles.profilePresetBtnActive : ""}`}
            onClick={() => onChange({ type: "preset", presetId: preset.id })}
          >
            <img src={getAvatarPath(`${preset.id}.svg`)} alt="" width={48} height={48} />
          </button>
        ))}
      </div>
      <div className={styles.profilePhotoActions}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.profilePhotoFile}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
              showWarning("Format invalide (JPEG, PNG ou WebP)");
              return;
            }
            if (file.size > 2 * 1024 * 1024) {
              showWarning("Fichier trop volumineux (max 2 Mo)");
              return;
            }
            const url = URL.createObjectURL(file);
            onChange({ type: "upload", url });
            showSuccess("Photo sélectionnée (démo locale)");
          }}
        />
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => fileRef.current?.click()}>
          <Icon icon="mdi:upload" aria-hidden />
          Importer
        </button>
        {avatar ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary} ${styles.profilePhotoReset}`}
            onClick={() => {
              onChange(null);
              showInfo("Photo réinitialisée");
            }}
          >
            <Icon icon="mdi:account-off-outline" aria-hidden />
            Réinitialiser
          </button>
        ) : null}
        {hasCustom ? <span className={styles.profilePhotoCustomTag}>Import local</span> : null}
      </div>
    </div>
  );
}

function ScrollFadeShell({ className = "", children, deps = [], stickToBottom = false, style, shellRef }) {
  const scrollRef = useRef(null);
  const [fadeVisible, setFadeVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const updateFade = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      setFadeVisible(remaining > 4);
    };
    updateFade();
    const raf = requestAnimationFrame(() => {
      updateFade();
      requestAnimationFrame(updateFade);
    });
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFade) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateFade);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps explicites pour recalcul (liste / hauteur)
  }, deps);

  const depsKey = deps.join("|");
  useLayoutEffect(() => {
    if (!stickToBottom) return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;
    const snap = () => {
      el.scrollTop = el.scrollHeight;
    };
    snap();
    const raf = requestAnimationFrame(() => {
      snap();
      requestAnimationFrame(snap);
    });
    return () => cancelAnimationFrame(raf);
  }, [stickToBottom, depsKey]);

  return (
    <div ref={shellRef} className={`${styles.scrollShell} ${className}`.trim()} style={style}>
      <div ref={scrollRef} className={styles.scrollViewport}>
        {children}
      </div>
      <div
        className={`${styles.scrollFade} ${fadeVisible ? styles.scrollFadeVisible : ""}`}
        aria-hidden
      />
    </div>
  );
}

export default function UiKitPage() {
  const [finderPrimary, setFinderPrimary] = useState("equipment");
  const [finderSecondary, setFinderSecondary] = useState("servers");
  const [adminNavTab, setAdminNavTab] = useState("users");
  const [adminNavSearch, setAdminNavSearch] = useState("");
  const [adminNavGroups, setAdminNavGroups] = useState(() => new Set(["nav-client-config"]));
  const [search, setSearch] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [typeValue, setTypeValue] = useState("server");
  const [comboValue, setComboValue] = useState("srv-dc01");
  const [pickedColor, setPickedColor] = useState("#2b5fab");
  const [pickedIcon, setPickedIcon] = useState("mdi:office-building-outline");
  const [pickedIconColor, setPickedIconColor] = useState("#2b5fab");
  const [iconPackQuery, setIconPackQuery] = useState("");
  const [tab, setTab] = useState("overview");
  const [toggleOn, setToggleOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [modalSection, setModalSection] = useState("identity");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalExiting, setModalExiting] = useState(false);
  const tabsRef = useRef(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const finderNavRef = useRef(null);
  const [finderNavIndicator, setFinderNavIndicator] = useState({ top: 0, height: 0 });
  const finderSecNavRef = useRef(null);
  const [finderSecIndicator, setFinderSecIndicator] = useState({ top: 0, height: 0 });
  const adminNavRef = useRef(null);
  const [adminNavIndicator, setAdminNavIndicator] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    ready: false
  });
  const [ticketStatus, setTicketStatus] = useState("progress");
  const [ticketPriority, setTicketPriority] = useState("high");
  const [ticketCategory, setTicketCategory] = useState("print");
  const [ticketRequester, setTicketRequester] = useState("Alice Martin");
  const [ticketMessages, setTicketMessages] = useState(TICKET_CHAT);
  const [ticketDraft, setTicketDraft] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const ticketComposerRef = useRef(null);
  const [toastPos, setToastPos] = useState(getToastPosition);
  const [activeFilters, setActiveFilters] = useState(() => new Set(["server", "mapped"]));
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(5);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [kitDark, setKitDark] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("uikit-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [asideOpen, setAsideOpen] = useState({
    contacts: true,
    sites: true,
    prestataires: true
  });
  const [profileAvatar, setProfileAvatar] = useState({ type: "preset", presetId: "blue" });
  const [selectedUserId, setSelectedUserId] = useState(DEMO_USERS[0].id);
  const pageRef = useRef(null);
  const scrollParentRef = useRef(null);

  const toggleAsideSection = key => {
    setAsideOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => subscribeToastPosition(setToastPos), []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-uikit-theme", kitDark ? "dark" : "light");
    try {
      window.localStorage.setItem("uikit-theme", kitDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
    return () => {
      root.removeAttribute("data-uikit-theme");
    };
  }, [kitDark]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash?.startsWith("#uikit-")) return undefined;
    const id = hash.slice(1);
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const refreshScroller = () => {
      const next = resolveUiKitScroller(page);
      scrollParentRef.current = next;
      return next;
    };

    refreshScroller();

    const onScroll = () => {
      // Re-résout au cas où le layout change ; lit aussi le scroller courant
      const scroller = refreshScroller();
      const top = Math.max(
        readScrollTop(scroller),
        readScrollTop(page.parentElement),
        window.scrollY || 0
      );
      setShowBackToTop(top > 200);
    };

    // Capture : intercepte le scroll du contentWrapper même si ce n’est pas window
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const retryId = window.setTimeout(onScroll, 150);

    return () => {
      window.clearTimeout(retryId);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollToTop = () => {
    const scroller = scrollParentRef.current || resolveUiKitScroller(pageRef.current);
    if (!scroller || scroller === document.documentElement || scroller === document.body || scroller === document.scrollingElement) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      scroller.scrollTop = 0;
    }
    // Sécurité si un parent scroll aussi
    if (pageRef.current?.parentElement && pageRef.current.parentElement !== scroller) {
      pageRef.current.parentElement.scrollTop = 0;
    }
  };

  const toggleFilter = id => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tableTotalPages = Math.max(1, Math.ceil(TABLE_ROWS.length / tablePageSize));
  const tableSafePage = Math.min(tablePage, tableTotalPages);
  const tableRangeStart = TABLE_ROWS.length === 0 ? 0 : (tableSafePage - 1) * tablePageSize + 1;
  const tableRangeEnd = Math.min(tableSafePage * tablePageSize, TABLE_ROWS.length);
  const tablePageRows = useMemo(
    () => TABLE_ROWS.slice((tableSafePage - 1) * tablePageSize, tableSafePage * tablePageSize),
    [tableSafePage, tablePageSize]
  );

  const ticketStatusLabel = useMemo(
    () => TICKET_STATUS_OPTIONS.find(o => o.value === ticketStatus)?.label || "En cours",
    [ticketStatus]
  );
  const ticketPriorityLabel = useMemo(
    () => TICKET_PRIORITY_OPTIONS.find(o => o.value === ticketPriority)?.label || "Haute",
    [ticketPriority]
  );

  const activePrimaryLabel = useMemo(
    () => FINDER_PRIMARY.find(item => item.id === finderPrimary)?.label || "—",
    [finderPrimary]
  );

  const adminNavSearchTokens = useMemo(() => {
    const q = String(adminNavSearch || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return q ? q.split(/\s+/).filter(Boolean) : [];
  }, [adminNavSearch]);

  const filteredAdminSections = useMemo(() => {
    if (adminNavSearchTokens.length === 0) return ADMIN_MENU_SECTIONS;
    const match = (parts) => {
      const hay = String(parts.join(" "))
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return adminNavSearchTokens.every(t => hay.includes(t));
    };
    return ADMIN_MENU_SECTIONS.map(section => ({
      ...section,
      items: section.items.flatMap(item => {
        if (!item.children) {
          return match([section.title, item.label, item.description, item.key]) ? [item] : [];
        }
        const groupMatch = match([section.title, item.label, item.description, item.key]);
        const children = item.children.filter(child =>
          match([section.title, item.label, child.label, child.description, child.key])
        );
        if (groupMatch) return [item];
        if (children.length) return [{ ...item, children }];
        return [];
      })
    })).filter(section => section.items.length > 0);
  }, [adminNavSearchTokens]);

  const adminActiveLabel = useMemo(() => {
    for (const section of ADMIN_MENU_SECTIONS) {
      for (const item of section.items) {
        if (item.key === adminNavTab) return item.label;
        const child = item.children?.find(c => c.key === adminNavTab);
        if (child) return `${item.label} · ${child.label}`;
      }
    }
    return "—";
  }, [adminNavTab]);

  const toggleAdminNavGroup = key => {
    setAdminNavGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isAdminGroupExpanded = key => adminNavGroups.has(key) || adminNavSearchTokens.length > 0;

  const filteredIconPack = useMemo(() => {
    const q = iconPackQuery.trim().toLowerCase();
    if (!q) return UI_KIT_ICON_PACK;
    return UI_KIT_ICON_PACK.filter(icon => icon.toLowerCase().includes(q));
  }, [iconPackQuery]);

  useLayoutEffect(() => {
    const root = tabsRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-selected="true"]');
      if (!active) return;
      setTabIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [tab]);

  useLayoutEffect(() => {
    const root = finderNavRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-current="page"]');
      if (!active) return;
      setFinderNavIndicator({ top: active.offsetTop, height: active.offsetHeight });
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [finderPrimary]);

  useLayoutEffect(() => {
    const root = finderSecNavRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-current="true"]');
      if (!active) return;
      setFinderSecIndicator({ top: active.offsetTop, height: active.offsetHeight });
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [finderSecondary, finderPrimary]);

  const adminNavGroupsKey = Array.from(adminNavGroups).sort().join("|");

  useLayoutEffect(() => {
    const root = adminNavRef.current;
    if (!root) return undefined;
    const update = () => {
      const active = root.querySelector('[aria-current="page"]');
      if (!active) {
        setAdminNavIndicator(prev => ({ ...prev, ready: false, height: 0 }));
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      setAdminNavIndicator({
        top: Math.round(r.top - rootRect.top),
        left: Math.round(r.left - rootRect.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        ready: true
      });
    };
    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [adminNavTab, adminNavSearch, adminNavGroupsKey, filteredAdminSections]);

  const openModal = () => {
    setModalExiting(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (modalExiting) return;
    setModalExiting(true);
  };

  const formatTicketTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const sendTicketMessage = () => {
    const text = ticketDraft.trim();
    if (!text || ticketSending) return;
    setTicketSending(true);
    const id = `m-${Date.now()}`;
    setTicketMessages(prev => [
      ...prev,
      {
        id,
        outbound: true,
        author: "Vous",
        time: formatTicketTime(),
        text,
        appear: true
      }
    ]);
    setTicketDraft("");
    window.setTimeout(() => setTicketSending(false), 640);
    ticketComposerRef.current?.focus();
  };

  const scrollToSection = (sectionId, event) => {
    event?.preventDefault();
    const el = document.getElementById(`uikit-${sectionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", `#uikit-${sectionId}`);
    }
  };

  return (
    <div className={`${styles.page} ${kitDark ? styles.pageDark : ""}`} ref={pageRef} data-theme={kitDark ? "dark" : "light"}>
      <header className={`${styles.pageHero} ${styles.pageHeroSticky}`}>
        <div className={styles.pageHeroInner}>
          <div className={styles.pageHeroBrand}>
            <span className={styles.pageHeroIcon} aria-hidden>
              <Icon icon="mdi:palette-swatch-outline" />
            </span>
            <div className={styles.pageHeroText}>
              <h1 className={styles.pageHeroTitle}>UI Kit Veritas</h1>
              <p className={styles.pageHeroSubtitle}>Design system</p>
            </div>
          </div>
          <div className={styles.pageHeroActions}>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={() => setKitDark(prev => !prev)}
              aria-label={kitDark ? "Passer en mode clair" : "Passer en mode sombre"}
              title={kitDark ? "Mode clair" : "Mode sombre"}
            >
              <Icon icon={kitDark ? "mdi:white-balance-sunny" : "mdi:weather-night"} aria-hidden />
              <span>{kitDark ? "Light" : "Dark"}</span>
            </button>
            <span className={styles.devBadge}>
              <Icon icon="mdi:flask-outline" aria-hidden />
              Dev only
            </span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.toc} aria-label="Sections du kit">
          {SECTION_GROUPS.map(group => (
            <div key={group.label} className={styles.tocGroup}>
              <span className={styles.tocGroupLabel}>{group.label}</span>
              <div className={styles.tocGroupLinks}>
                {group.items.map(section => (
                  <a
                    key={section.id}
                    className={styles.tocLink}
                    href={`#uikit-${section.id}`}
                    onClick={e => scrollToSection(section.id, e)}
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <section id="uikit-tokens" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Couleurs</h2>
              <p className={styles.sectionHint}>Tokens de couleur</p>
            </div>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.swatchGrid}>
              {COLOR_TOKENS.map(token => (
                <article key={token.varName} className={styles.swatch}>
                  <div className={styles.swatchChip} style={{ background: token.cssVar }} />
                  <div className={styles.swatchMeta}>
                    <span className={styles.swatchName}>{token.name}</span>
                    <span className={styles.swatchVar}>{token.varName}</span>
                    <span className={styles.swatchHex}>{token.hex}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="uikit-buttons" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Boutons</h2>
              <p className={styles.sectionHint}>Icône et texte</p>
            </div>
            <code className={styles.metaCode}>.btnSquare*</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.demoStack}>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Boutons icône</p>
                <div className={styles.btnRow}>
                  <UiKitTooltip content="Configurer">
                    <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Configurer">
                      <Icon icon="mdi:pencil-outline" aria-hidden />
                    </button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Ouvrir">
                    <button type="button" className={`${styles.btnSquare} ${styles.btnSquarePrimary}`} aria-label="Ouvrir">
                      <Icon icon="mdi:open-in-new" aria-hidden />
                    </button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Ajouter">
                    <button type="button" className={`${styles.btnSquare} ${styles.btnSquarePrimary}`} aria-label="Ajouter">
                      <Icon icon="mdi:plus" aria-hidden />
                    </button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Action désactivée">
                    <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} disabled aria-label="Désactivé">
                      <Icon icon="mdi:cog-outline" aria-hidden />
                    </button>
                  </UiKitTooltip>
                  <span className={styles.btnCaption}>28×28</span>
                </div>
              </div>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Boutons texte</p>
                <div className={styles.btnTextRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
                    <Icon icon="mdi:check" aria-hidden />
                    Enregistrer
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>Annuler</button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`}>Plus d’options</button>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`}>Supprimer</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-badges" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Badges & statut</h2>
              <p className={styles.sectionHint}>Badges et pastilles de statut</p>
            </div>
            <code className={styles.metaCode}>.badge*</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>Neutre</span>
              <span className={`${styles.badge} ${styles.badgeAccent}`}>Accent</span>
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>OK</span>
              <span className={`${styles.badge} ${styles.badgeWarn}`}>Avertissement</span>
              <span className={`${styles.badge} ${styles.badgeDanger}`}>Critique</span>
              <span className={styles.statusDot + " " + styles.statusOn} title="Actif" aria-label="Actif" />
              <span className={styles.statusDot + " " + styles.statusOff} title="Inactif" aria-label="Inactif" />
            </div>
          </div>
        </section>

        <section id="uikit-icons" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Pack d’icônes</h2>
              <p className={styles.sectionHint}>
                {UI_KIT_ICON_PACK.length} icônes Iconify
              </p>
            </div>
            <code className={styles.metaCode}>.iconPack* · IconFieldSelect</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.iconPackToolbar}>
              <div className={`${styles.searchBox} ${styles.searchBoxFluid} ${styles.iconPackSearch}`}>
                <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
                <input
                  type="search"
                  className={styles.searchInput}
                  value={iconPackQuery}
                  onChange={e => setIconPackQuery(e.target.value)}
                  placeholder="Rechercher"
                  aria-label="Rechercher une icône"
                />
                {iconPackQuery ? (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setIconPackQuery("")}
                    aria-label="Effacer"
                  >
                    <Icon icon="mdi:close" aria-hidden />
                  </button>
                ) : null}
              </div>
              <div className={styles.iconPackSelected}>
                <button
                  type="button"
                  className={styles.iconFieldBtn}
                  style={{ color: pickedIconColor }}
                  aria-label="Aperçu icône"
                  title={pickedIcon}
                >
                  <Icon icon={pickedIcon} aria-hidden />
                </button>
                <div className={styles.iconPackSelectedMeta}>
                  <strong>Sélection</strong>
                  <code>{pickedIcon}</code>
                </div>
              </div>
            </div>
            <div className={styles.iconColorBlock}>
              <p className={styles.demoLabel}>Couleur de l’icône</p>
              <ColorPicker value={pickedIconColor} onChange={setPickedIconColor} />
            </div>
            <ScrollFadeShell className={styles.iconPackShell} deps={[filteredIconPack.length, iconPackQuery, pickedIconColor]}>
              <div className={styles.iconPackGrid} role="listbox" aria-label="Pack d’icônes" style={{ color: pickedIconColor }}>
                {filteredIconPack.map(icon => {
                  const active = icon === pickedIcon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      role="option"
                      aria-selected={active}
                      title={icon}
                      className={`${styles.iconPackTile} ${active ? styles.iconPackTileActive : ""}`}
                      onClick={() => setPickedIcon(icon)}
                    >
                      <Icon icon={icon} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </ScrollFadeShell>
            <p className={styles.iconPackCount}>
              {filteredIconPack.length} / {UI_KIT_ICON_PACK.length}
            </p>
          </div>
        </section>

        <section id="uikit-forms" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Champs & filtres</h2>
              <p className={styles.sectionHint}>Inputs, selects, filtres, choix, onglets</p>
            </div>
            <code className={styles.metaCode}>.input* · .filterChip · .tabs</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.demoStack}>
            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Recherche & filtre liste</p>
              <div className={styles.inputsToolbar}>
                <div className={styles.searchBox}>
                  <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
                  <input
                    type="search"
                    className={styles.searchInput}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher"
                    aria-label="Rechercher"
                  />
                  {search ? (
                    <button type="button" className={styles.searchClear} onClick={() => setSearch("")} aria-label="Effacer">
                      <Icon icon="mdi:close" aria-hidden />
                    </button>
                  ) : null}
                </div>

                <PillSelect
                  options={FILTER_OPTIONS}
                  value={filterValue}
                  onChange={setFilterValue}
                  ariaLabel="Filtrer par type"
                />
              </div>
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Filtres ON / OFF</p>
              <div className={styles.filterChipRow} role="group" aria-label="Filtres">
                {DEMO_FILTERS.map(filter => {
                  const on = activeFilters.has(filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`${styles.filterChip} ${on ? styles.filterChipOn : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleFilter(filter.id)}
                    >
                      <Icon icon={filter.icon} className={styles.filterChipIcon} aria-hidden />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Tailles S / M / L / XL</p>
              <div className={styles.sizeRow}>
                {[
                  { key: "s", label: "S", cls: styles.inputS },
                  { key: "m", label: "M", cls: styles.inputM },
                  { key: "l", label: "L", cls: styles.inputL },
                  { key: "xl", label: "XL", cls: styles.inputXl }
                ].map(item => (
                  <div key={item.key} className={styles.formField}>
                    <p className={styles.sizeCaption}>{item.label}</p>
                    <input
                      className={`${styles.input} ${item.cls}`}
                      type="text"
                      defaultValue={`Champ ${item.label}`}
                      aria-label={`Input taille ${item.label}`}
                    />
                    <FieldSelect
                      options={TYPE_OPTIONS}
                      value={typeValue}
                      onChange={setTypeValue}
                      ariaLabel={`Type ${item.label}`}
                      size={item.key}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Combobox</p>
              <div className={styles.formField}>
                <span className={styles.fieldLabel}>Équipement ({COMBOBOX_OPTIONS.length} choix)</span>
                <ComboboxSelect
                  options={COMBOBOX_OPTIONS}
                  value={comboValue}
                  onChange={setComboValue}
                  ariaLabel="Équipement"
                  placeholder="Sélectionner…"
                  size="xl"
                />
              </div>
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Formulaire</p>
              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}>Nom</span>
                  <input className={`${styles.input} ${styles.inputXl}`} type="text" placeholder="Ex. Serveur DC01" defaultValue="SRV-DC01" />
                </label>
                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>Type</span>
                  <FieldSelect
                    options={TYPE_OPTIONS}
                    value={typeValue}
                    onChange={setTypeValue}
                    ariaLabel="Type"
                    size="xl"
                  />
                </div>
                <label className={styles.formField}>
                  <span className={styles.fieldLabel}>Champ en erreur</span>
                  <input className={`${styles.input} ${styles.inputXl} ${styles.inputError}`} type="text" defaultValue="valeur invalide" aria-invalid />
                  <span className={styles.fieldError}>Ce champ est obligatoire.</span>
                </label>
                <label className={styles.formField}>
                  <span className={styles.fieldLabel}>Désactivé</span>
                  <input className={`${styles.input} ${styles.inputXl}`} type="text" value="Lecture seule" disabled readOnly />
                  <span className={styles.fieldHint}>Non modifiable</span>
                </label>
                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>Icône</span>
                  <IconFieldSelect
                    value={pickedIcon}
                    onChange={setPickedIcon}
                    color={pickedIconColor}
                    onColorChange={setPickedIconColor}
                    size="xl"
                  />
                </div>
                <label className={`${styles.formField} ${styles.formFieldFull}`}>
                  <span className={styles.fieldLabel}>Description</span>
                  <textarea className={`${styles.textarea} ${styles.inputXl}`} placeholder="Notes libres…" defaultValue="" rows={3} />
                </label>
              </div>
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Sélecteur de couleur</p>
              <ColorPicker value={pickedColor} onChange={setPickedColor} />
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Checkbox & toggle</p>
              <div className={styles.checkRow}>
                <KitCheckbox checked={checked} onChange={setChecked}>
                  Notification par e-mail
                </KitCheckbox>
                <label className={styles.checkItem}>
                  <button
                    type="button"
                    className={`${styles.toggle} ${toggleOn ? styles.toggleOn : ""}`}
                    role="switch"
                    aria-checked={toggleOn}
                    onClick={() => setToggleOn(v => !v)}
                  >
                    <span className={styles.toggleKnob} aria-hidden />
                  </button>
                  Supervision active
                </label>
              </div>
            </div>

            <div className={styles.demoBlock}>
              <p className={styles.demoLabel}>Onglets</p>
              <div className={styles.tabs} ref={tabsRef} role="tablist" aria-label="Exemple d’onglets">
                <span
                  className={styles.tabIndicator}
                  style={{
                    transform: `translateX(${tabIndicator.left}px)`,
                    width: tabIndicator.width
                  }}
                  aria-hidden
                />
                {[
                  { id: "overview", label: "Vue d’ensemble" },
                  { id: "details", label: "Détails" },
                  { id: "history", label: "Historique" }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    className={`${styles.tab} ${tab === item.id ? styles.tabActive : ""}`}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            </div>
          </div>
        </section>

        <section id="uikit-tooltips" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Tooltips</h2>
              <p className={styles.sectionHint}>Survol / focus — positions top, bottom, left, right</p>
            </div>
            <code className={styles.metaCode}>.tooltipBubble</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.demoStack}>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Positions</p>
                <div className={styles.tooltipDemoRow}>
                  <UiKitTooltip content="Tooltip en haut" position="top">
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>Haut</button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Tooltip en bas" position="bottom">
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>Bas</button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Tooltip à gauche" position="left">
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>Gauche</button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Tooltip à droite" position="right">
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`}>Droite</button>
                  </UiKitTooltip>
                </div>
              </div>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Sur actions</p>
                <div className={styles.btnRow}>
                  <UiKitTooltip content="Enregistrer les modifications">
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
                      <Icon icon="mdi:content-save-outline" aria-hidden />
                      Enregistrer
                    </button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Actualiser la liste">
                    <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Actualiser">
                      <Icon icon="mdi:refresh" aria-hidden />
                    </button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Supprimer définitivement">
                    <button type="button" className={`${styles.btn} ${styles.btnDanger}`}>
                      <Icon icon="mdi:trash-can-outline" aria-hidden />
                      Supprimer
                    </button>
                  </UiKitTooltip>
                  <UiKitTooltip content="Statut synchronisé avec CheckMK">
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>OK</span>
                  </UiKitTooltip>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-feedback" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Alertes & empty</h2>
              <p className={styles.sectionHint}>Callouts, toasts et état vide</p>
            </div>
            <code className={styles.metaCode}>.alert* · .emptyState · toast</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.demoStack}>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Callouts</p>
                <div className={styles.alertStack}>
                  <div className={`${styles.alert} ${styles.alertInfo}`}>
                    <Icon icon="mdi:information-outline" className={styles.alertIcon} aria-hidden />
                    <span>Information — synchronisation CheckMK en cours.</span>
                  </div>
                  <div className={`${styles.alert} ${styles.alertSuccess}`}>
                    <Icon icon="mdi:check-circle-outline" className={styles.alertIcon} aria-hidden />
                    <span>Succès — configuration enregistrée.</span>
                  </div>
                  <div className={`${styles.alert} ${styles.alertWarn}`}>
                    <Icon icon="mdi:alert-outline" className={styles.alertIcon} aria-hidden />
                    <span>Avertissement — licence bientôt expirée.</span>
                  </div>
                  <div className={`${styles.alert} ${styles.alertDanger}`}>
                    <Icon icon="mdi:alert-circle-outline" className={styles.alertIcon} aria-hidden />
                    <span>Erreur — impossible de joindre l’hôte distant.</span>
                  </div>
                </div>
              </div>

              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Toasts</p>
                <div className={styles.btnTextRow}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => showInfo("Information — synchronisation CheckMK en cours.")}
                  >
                    <Icon icon="mdi:information-outline" aria-hidden />
                    Info
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => showSuccess("Succès — configuration enregistrée.")}
                  >
                    <Icon icon="mdi:check-circle-outline" aria-hidden />
                    Succès
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => showWarning("Avertissement — licence bientôt expirée.")}
                  >
                    <Icon icon="mdi:alert-outline" aria-hidden />
                    Warning
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={() => showError("Erreur — impossible de joindre l’hôte distant.")}
                  >
                    <Icon icon="mdi:alert-circle-outline" aria-hidden />
                    Erreur
                  </button>
                </div>
              </div>

              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Position · {toastPos}</p>
                <div className={styles.toastPosGrid} role="group" aria-label="Position des toasts">
                  {TOAST_POSITIONS.map(pos => (
                    <button
                      key={pos.value}
                      type="button"
                      className={`${styles.toastPosBtn} ${toastPos === pos.value ? styles.toastPosBtnActive : ""}`}
                      aria-pressed={toastPos === pos.value}
                      onClick={() => {
                        setToastPosition(pos.value);
                        showInfo(`Position : ${pos.label}`);
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Empty state</p>
                <div className={styles.emptyState}>
                  <Icon icon="mdi:inbox-outline" className={styles.emptyIcon} aria-hidden />
                  <h3 className={styles.emptyTitle}>Aucun élément</h3>
                  <p className={styles.emptyText}>Ajoutez un périphérique ou une instance pour commencer.</p>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
                    <Icon icon="mdi:plus" aria-hidden />
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-table" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Table</h2>
              <p className={styles.sectionHint}>Tableau, actions et pagination</p>
            </div>
            <code className={styles.metaCode}>UiKitTable · .pagination</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={tableKit.tableBlock}>
              <UiKitScrollFadeShell
                className={tableKit.tableShell}
                deps={[tablePageRows.length, tablePageSize, tableSafePage]}
              >
                <table className={tableKit.table}>
                  <thead>
                    <tr>
                      <th scope="col">Nom</th>
                      <th scope="col">Type</th>
                      <th scope="col">IP</th>
                      <th scope="col">Mappé</th>
                      <th scope="col" className={tableKit.tableActionsHead}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablePageRows.map(row => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.type}</td>
                        <td>{row.ip}</td>
                        <td>
                          <span
                            className={`${tableKit.statusDot} ${row.mapped ? tableKit.statusOn : tableKit.statusOff}`}
                            title={row.mapped ? "Mappé" : "Non mappé"}
                            aria-label={row.mapped ? "Mappé" : "Non mappé"}
                          />
                        </td>
                        <td className={tableKit.tableActionsCell}>
                          <div className={tableKit.rowActions}>
                            <button
                              type="button"
                              className={`${styles.btnSquare} ${styles.btnSquareSecondary} ${styles.btnSquareTable}`}
                              aria-label={`Éditer ${row.name}`}
                              title="Éditer"
                            >
                              <Icon icon="mdi:pencil-outline" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className={`${styles.btnSquare} ${styles.btnSquareSecondary} ${styles.btnSquareTable}`}
                              aria-label={`Ouvrir ${row.name}`}
                              title="Ouvrir"
                            >
                              <Icon icon="mdi:open-in-new" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </UiKitScrollFadeShell>
              <div className={styles.pagination}>
                <div className={styles.paginationLeft}>
                  <span className={styles.paginationLabel}>Par page</span>
                  <select
                    className={styles.paginationSelect}
                    value={tablePageSize}
                    onChange={e => {
                      setTablePageSize(Number(e.target.value));
                      setTablePage(1);
                    }}
                    aria-label="Par page"
                  >
                    {TABLE_PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span className={styles.paginationInfo}>
                    {tableRangeStart}–{tableRangeEnd} sur {TABLE_ROWS.length}
                  </span>
                </div>
                <div className={styles.paginationRight}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setTablePage(p => Math.max(1, Math.min(p, tableTotalPages) - 1))}
                    disabled={tableSafePage <= 1}
                    aria-label="Page précédente"
                  >
                    <Icon icon="mdi:chevron-left" aria-hidden />
                  </button>
                  <span className={styles.paginationInfo}>
                    Page {tableSafePage} / {tableTotalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setTablePage(p => Math.min(tableTotalPages, Math.max(1, p) + 1))}
                    disabled={tableSafePage >= tableTotalPages}
                    aria-label="Page suivante"
                  >
                    <Icon icon="mdi:chevron-right" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-cards" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Cartes entité</h2>
              <p className={styles.sectionHint}>Contact, site, prestataire</p>
            </div>
            <code className={styles.metaCode}>.entityCard</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.entityVariantsGrid}>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Contact</p>
                <div className={styles.entityCardList}>
                  {DEMO_CONTACTS.map(item => (
                    <EntityCard key={item.id} {...item} />
                  ))}
                </div>
              </div>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Site</p>
                <div className={styles.entityCardList}>
                  {DEMO_SITES.map(item => (
                    <EntityCard key={item.id} {...item} />
                  ))}
                </div>
              </div>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Prestataire</p>
                <div className={styles.entityCardList}>
                  {DEMO_PRESTATAIRES.map(item => (
                    <EntityCard key={item.id} {...item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-profile" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Mon profil</h2>
              <p className={styles.sectionHint}>Cartes utilisateur · sélecteur de photo</p>
            </div>
            <code className={styles.metaCode}>.userCard · .profilePhotoPicker</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.profileDemoGrid}>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Cartes utilisateur</p>
                <div className={styles.userCardList}>
                  {DEMO_USERS.map(user => (
                    <UserCard
                      key={user.id}
                      {...user}
                      selected={selectedUserId === user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        if (user.avatar) setProfileAvatar(user.avatar);
                      }}
                    />
                  ))}
                </div>
                <p className={styles.demoLabel} style={{ marginTop: "1rem" }}>
                  Variante compacte
                </p>
                <div className={styles.userCardList}>
                  <UserCard {...DEMO_USERS[0]} compact avatar={profileAvatar} />
                  <UserCard {...DEMO_USERS[2]} compact />
                </div>
              </div>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Photo de profil</p>
                <div className={styles.profilePhotoPanel}>
                  <ProfilePhotoPicker
                    name={DEMO_USERS.find(u => u.id === selectedUserId)?.name || DEMO_USERS[0].name}
                    avatar={profileAvatar}
                    onChange={setProfileAvatar}
                  />
                </div>
                <div className={styles.profileAvatarSizes}>
                  <p className={styles.demoLabel}>Tailles avatar</p>
                  <div className={styles.profileAvatarSizeRow}>
                    {[32, 36, 40, 48, 64, 80].map(size => (
                      <div key={size} className={styles.profileAvatarSizeItem}>
                        <KitAvatar name="Demo" avatar={profileAvatar} size={size} />
                        <span>{size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-home" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Accueil</h2>
              <p className={styles.sectionHint}>KPI, graphiques, frise et actus</p>
            </div>
            <code className={styles.metaCode}>UiKitKpiStrip · UiKitEventsWeek · UiKitNewsPanel</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.macosStage}>
              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>KPI</p>
                <UiKitKpiStrip variant="widgets" cards={DEMO_KPI_CARDS} ariaLabel="KPI" />
                <div style={{ marginTop: "0.65rem" }}>
                  <UiKitKpiStrip
                    variant="segments"
                    showSupport
                    showSales
                    supportCards={DEMO_KPI_CARDS}
                    salesCards={DEMO_KPI_SALES}
                    supportGroupLabel="Support"
                    salesGroupLabel="Services"
                  />
                </div>
              </div>

              <div className={styles.demoBlock}>
                <p className={styles.demoLabel}>Graphiques</p>
                <div className={styles.chartsGrid}>
                  <DonutChart items={DEMO_CHART_DONUT} title="Statut des tickets" />
                  <BarChart items={DEMO_CHART_BARS} title="Tickets cette semaine" />
                  <LineChart
                    series={DEMO_CHART_LINE}
                    labels={DEMO_CHART_LINE_LABELS}
                    title="Volume mensuel"
                  />
                </div>
              </div>

              <div className={styles.macosHomeSplit}>
                <div className={styles.demoBlock}>
                  <p className={styles.demoLabel}>Frise d’événements</p>
                  <UiKitEventsWeek
                    events={DEMO_EVENTS_AS_CALENDAR}
                    title="Mes événements"
                    icon="mdi:calendar-month-outline"
                    showHint
                    selectable
                    copy={{
                      panels: {
                        events: {
                          today: "Aujourd’hui",
                          todayShort: "Auj.",
                          dayAria: "{day}: {count}",
                          eventSingular: "événement",
                          eventsPlural: "événements"
                        }
                      }
                    }}
                  />
                </div>

                <div className={styles.demoBlock}>
                  <p className={styles.demoLabel}>Fil d’actualité</p>
                  <UiKitNewsPanel
                    title="Fil tech & cybersécurité"
                    subtitle="CVE, alertes et actualités IT"
                    icon="mdi:rss"
                    layout="grid"
                    refreshLabel="Actualiser"
                    onRefresh={() => {}}
                  >
                    {DEMO_NEWS_ITEMS.map(item => (
                      <UiKitNewsItem
                        key={item.id}
                        item={{
                          ...item,
                          publishedAt: undefined
                        }}
                        categoryLabel={item.categoryLabel}
                        relativeTime={item.time}
                        openLabel={item.title}
                      />
                    ))}
                  </UiKitNewsPanel>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-header" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Header</h2>
              <p className={styles.sectionHint}>En-tête de page</p>
            </div>
            <code className={styles.metaCode}>.pageHero</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={`${styles.pageHero} ${styles.pageHeroDemo}`}>
              <div className={styles.pageHeroInner} style={{ maxWidth: "none", margin: 0 }}>
                <div className={styles.pageHeroBrand}>
                  <span className={styles.pageHeroIcon} aria-hidden>
                    <Icon icon="mdi:office-building" />
                  </span>
                  <div className={styles.pageHeroText}>
                    <h3 className={styles.pageHeroTitle} style={{ fontSize: "1.05rem" }}>
                      Entreprise démo
                    </h3>
                    <p className={styles.pageHeroSubtitle}>Fiche client</p>
                  </div>
                </div>
                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Éditer">
                    <Icon icon="mdi:pencil-outline" aria-hidden />
                  </button>
                  <button type="button" className={`${styles.btnSquare} ${styles.btnSquarePrimary}`} aria-label="Ouvrir">
                    <Icon icon="mdi:open-in-new" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-finder" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Menu gauche (Finder)</h2>
              <p className={styles.sectionHint}>Navigation primaire et secondaire</p>
            </div>
            <code className={styles.metaCode}>.finderDemo + .scrollFade</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.finderDemo}>
              <aside className={styles.finderSidebar} aria-label="Navigation Finder">
                <nav className={`${styles.finderPrimary} ${styles.finderPrimaryAnimated}`} ref={finderNavRef}>
                  <span
                    className={styles.finderNavIndicator}
                    style={{
                      transform: `translateY(${finderNavIndicator.top}px)`,
                      height: finderNavIndicator.height
                    }}
                    aria-hidden
                  />
                  {FINDER_PRIMARY.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.finderItem} ${finderPrimary === item.id ? styles.finderItemActive : ""}`}
                      onClick={() => setFinderPrimary(item.id)}
                      aria-current={finderPrimary === item.id ? "page" : undefined}
                    >
                      <Icon icon={item.icon} className={styles.finderItemIcon} aria-hidden />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
                <ScrollFadeShell className={styles.finderSecondaryShell} deps={[FINDER_SECONDARY.length, finderPrimary]}>
                  <nav
                    className={`${styles.finderSecondary} ${styles.finderSecondaryAnimated}`}
                    ref={finderSecNavRef}
                    aria-label="Navigation secondaire"
                  >
                    <span
                      className={styles.finderNavIndicator}
                      style={{
                        transform: `translateY(${finderSecIndicator.top}px)`,
                        height: finderSecIndicator.height
                      }}
                      aria-hidden
                    />
                    {FINDER_SECONDARY.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.finderSecItem} ${finderSecondary === item.id ? styles.finderSecItemActive : ""}`}
                        onClick={() => setFinderSecondary(item.id)}
                        aria-current={finderSecondary === item.id ? "true" : undefined}
                      >
                        <Icon icon={item.icon} className={styles.finderSecItemIcon} aria-hidden />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </ScrollFadeShell>
              </aside>
              <div className={styles.finderContent}>
                <div
                  key={`${finderPrimary}-${finderSecondary}`}
                  className={styles.contentFadeUp}
                >
                  {activePrimaryLabel} · {FINDER_SECONDARY.find(i => i.id === finderSecondary)?.label}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-admin-menu" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Menu administration</h2>
              <p className={styles.sectionHint}>Sidebar AdminPanel · recherche, sections, groupes</p>
            </div>
            <code className={styles.metaCode}>.adminMenu + .adminNavItem</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.adminMenuDemo}>
              <aside className={styles.adminMenu} aria-label="Navigation administration">
                <div className={styles.adminMenuTop}>
                  <label className={styles.adminMenuSearch}>
                    <Icon icon="mdi:magnify" className={styles.adminMenuSearchIcon} aria-hidden />
                    <input
                      type="search"
                      className={styles.adminMenuSearchInput}
                      value={adminNavSearch}
                      onChange={e => setAdminNavSearch(e.target.value)}
                      placeholder="Rechercher un menu…"
                      aria-label="Rechercher un menu"
                    />
                    {adminNavSearch ? (
                      <button
                        type="button"
                        className={styles.adminMenuSearchClear}
                        onClick={() => setAdminNavSearch("")}
                        aria-label="Effacer la recherche"
                      >
                        <Icon icon="mdi:close" aria-hidden />
                      </button>
                    ) : null}
                  </label>
                </div>
                <ScrollFadeShell
                  className={styles.adminMenuNav}
                  deps={[filteredAdminSections.length, adminNavSearch, adminNavTab, adminNavGroupsKey]}
                >
                  <div className={styles.adminNavTrack} ref={adminNavRef}>
                    {adminNavIndicator.ready ? (
                      <span
                        className={styles.adminNavIndicator}
                        style={{
                          transform: `translate3d(${adminNavIndicator.left}px, ${adminNavIndicator.top}px, 0)`,
                          width: adminNavIndicator.width,
                          height: adminNavIndicator.height
                        }}
                        aria-hidden
                      />
                    ) : null}
                    {filteredAdminSections.length === 0 ? (
                      <p className={styles.adminNavEmpty}>Aucun menu ne correspond à « {adminNavSearch.trim()} ».</p>
                    ) : (
                      filteredAdminSections.map(section => (
                        <div key={section.id} className={styles.adminNavSection}>
                          {section.title ? <div className={styles.adminNavSectionTitle}>{section.title}</div> : null}
                          <ul className={styles.adminNavList}>
                            {section.items.map(item => {
                              if (item.children) {
                                const expanded = isAdminGroupExpanded(item.key);
                                const hasActiveChild = item.children.some(child => child.key === adminNavTab);
                                return (
                                  <li key={item.key} className={styles.adminNavGroup}>
                                    <button
                                      type="button"
                                      className={`${styles.adminNavItem} ${styles.adminNavGroupToggle} ${hasActiveChild ? styles.adminNavGroupActive : ""}`}
                                      onClick={() => toggleAdminNavGroup(item.key)}
                                      aria-expanded={expanded}
                                    >
                                      <Icon icon={item.icon} className={styles.adminNavIcon} aria-hidden />
                                      <span className={styles.adminNavItemText}>
                                        <span className={styles.adminNavItemLabel}>{item.label}</span>
                                        <span className={styles.adminNavItemDesc}>{item.description}</span>
                                      </span>
                                      <Icon
                                        icon="mdi:chevron-down"
                                        className={`${styles.adminNavGroupChevron} ${expanded ? styles.adminNavGroupChevronOpen : ""}`}
                                        aria-hidden
                                      />
                                    </button>
                                    {expanded ? (
                                      <ul className={`${styles.adminNavSubList} ${styles.adminNavSubListOpen}`}>
                                        {item.children.map(child => (
                                          <li key={child.key}>
                                            <button
                                              type="button"
                                              className={`${styles.adminNavItem} ${styles.adminNavSubItem} ${adminNavTab === child.key ? styles.adminNavItemActive : ""}`}
                                              onClick={() => setAdminNavTab(child.key)}
                                              aria-current={adminNavTab === child.key ? "page" : undefined}
                                            >
                                              <span className={styles.adminNavItemText}>
                                                <span className={styles.adminNavItemLabel}>{child.label}</span>
                                                <span className={styles.adminNavItemDesc}>{child.description}</span>
                                              </span>
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </li>
                                );
                              }
                              return (
                                <li key={item.key}>
                                  <button
                                    type="button"
                                    className={`${styles.adminNavItem} ${adminNavTab === item.key ? styles.adminNavItemActive : ""}`}
                                    onClick={() => setAdminNavTab(item.key)}
                                    aria-current={adminNavTab === item.key ? "page" : undefined}
                                  >
                                    <Icon icon={item.icon} className={styles.adminNavIcon} aria-hidden />
                                    <span className={styles.adminNavItemText}>
                                      <span className={styles.adminNavItemLabel}>{item.label}</span>
                                      <span className={styles.adminNavItemDesc}>{item.description}</span>
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollFadeShell>
              </aside>
              <div className={styles.adminMenuContent}>
                <div key={adminNavTab} className={styles.contentFadeUp}>
                  <p className={styles.adminMenuContentTitle}>{adminActiveLabel}</p>
                  <p className={styles.adminMenuContentHint}>Zone de contenu administration</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="uikit-aside" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Colonne droite (sections)</h2>
              <p className={styles.sectionHint}>Zone gauche pleine hauteur · sections pliables à droite</p>
            </div>
            <code className={styles.metaCode}>.asidePanel + .entityCard</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.asideDemo}>
              <div className={`${styles.asideMain} ${styles.contentFadeUp}`}>Zone principale (cartes, tables, map…)</div>
              <ScrollFadeShell
                className={styles.asidePanel}
                deps={[
                  DEMO_CONTACTS.length,
                  DEMO_SITES.length,
                  DEMO_PRESTATAIRES.length,
                  asideOpen.contacts,
                  asideOpen.sites,
                  asideOpen.prestataires
                ]}
              >
                <aside aria-label="Colonne droite">
                  <section className={`${styles.asideSection} ${asideOpen.contacts ? "" : styles.asideSectionCollapsed}`}>
                    <header className={styles.asideSectionHeader}>
                      <button
                        type="button"
                        className={styles.asideSectionToggle}
                        onClick={() => toggleAsideSection("contacts")}
                        aria-expanded={asideOpen.contacts}
                      >
                        <Icon icon="mdi:chevron-down" className={styles.asideSectionChevron} aria-hidden />
                        <h3 className={styles.asideSectionTitle}>Contacts</h3>
                        <span className={styles.asideSectionCount} aria-label={`${DEMO_CONTACTS.length} contacts`}>
                          {DEMO_CONTACTS.length}
                        </span>
                      </button>
                      <div className={styles.asideSectionActions}>
                        <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Ajouter contact">
                          <Icon icon="mdi:plus" aria-hidden />
                        </button>
                      </div>
                    </header>
                    <div
                      className={`${styles.asideSectionBodyCards} ${asideOpen.contacts ? styles.contentFadeUp : ""}`}
                      aria-hidden={!asideOpen.contacts}
                    >
                      {DEMO_CONTACTS.map(item => (
                        <EntityCard key={item.id} {...item} />
                      ))}
                    </div>
                  </section>
                  <section className={`${styles.asideSection} ${asideOpen.sites ? "" : styles.asideSectionCollapsed}`}>
                    <header className={styles.asideSectionHeader}>
                      <button
                        type="button"
                        className={styles.asideSectionToggle}
                        onClick={() => toggleAsideSection("sites")}
                        aria-expanded={asideOpen.sites}
                      >
                        <Icon icon="mdi:chevron-down" className={styles.asideSectionChevron} aria-hidden />
                        <h3 className={styles.asideSectionTitle}>Sites</h3>
                        <span className={styles.asideSectionCount} aria-label={`${DEMO_SITES.length} sites`}>
                          {DEMO_SITES.length}
                        </span>
                      </button>
                      <div className={styles.asideSectionActions}>
                        <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Gérer les sites">
                          <Icon icon="mdi:pencil-outline" aria-hidden />
                        </button>
                      </div>
                    </header>
                    <div
                      className={`${styles.asideSectionBodyCards} ${asideOpen.sites ? styles.contentFadeUp : ""}`}
                      aria-hidden={!asideOpen.sites}
                    >
                      {DEMO_SITES.map(item => (
                        <EntityCard key={item.id} {...item} />
                      ))}
                    </div>
                  </section>
                  <section className={`${styles.asideSection} ${asideOpen.prestataires ? "" : styles.asideSectionCollapsed}`}>
                    <header className={styles.asideSectionHeader}>
                      <button
                        type="button"
                        className={styles.asideSectionToggle}
                        onClick={() => toggleAsideSection("prestataires")}
                        aria-expanded={asideOpen.prestataires}
                      >
                        <Icon icon="mdi:chevron-down" className={styles.asideSectionChevron} aria-hidden />
                        <h3 className={styles.asideSectionTitle}>Prestataires</h3>
                        <span className={styles.asideSectionCount} aria-label={`${DEMO_PRESTATAIRES.length} prestataires`}>
                          {DEMO_PRESTATAIRES.length}
                        </span>
                      </button>
                      <div className={styles.asideSectionActions}>
                        <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Ajouter prestataire">
                          <Icon icon="mdi:plus" aria-hidden />
                        </button>
                      </div>
                    </header>
                    <div
                      className={`${styles.asideSectionBodyCards} ${asideOpen.prestataires ? styles.contentFadeUp : ""}`}
                      aria-hidden={!asideOpen.prestataires}
                    >
                      {DEMO_PRESTATAIRES.map(item => (
                        <EntityCard key={item.id} {...item} />
                      ))}
                    </div>
                  </section>
                </aside>
              </ScrollFadeShell>
            </div>
          </div>
        </section>

        <section id="uikit-modal" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Modale à sections</h2>
              <p className={styles.sectionHint}>Modale avec navigation latérale</p>
            </div>
            <code className={styles.metaCode}>.modalShell</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.btnTextRow} style={{ marginBottom: "0.85rem" }}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={openModal}>
                <Icon icon="mdi:open-in-new" aria-hidden />
                Ouvrir en overlay
              </button>
            </div>
            <SectionedModal
              embedded
              showClose={false}
              activeSection={modalSection}
              onSectionChange={setModalSection}
              onClose={() => {}}
              pickedColor={pickedColor}
              onColorChange={setPickedColor}
            />
          </div>
        </section>

        <section id="uikit-ticket" className={styles.section}>
          <header className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Ticket support</h2>
              <p className={styles.sectionHint}>Propriétés, conversation et contexte</p>
            </div>
            <code className={styles.metaCode}>.ticketLayout</code>
          </header>
          <div className={styles.sectionBody}>
            <div className={styles.ticketWorkspace}>
              <div className={styles.ticketTopBar}>
                <div className={styles.ticketTopMain}>
                  <span className={`${styles.badge} ${styles.badgeAccent}`}>#1042</span>
                  <h3 className={styles.ticketTopTitle}>Imprimante siège hors ligne</h3>
                  <span className={`${styles.badge} ${ticketStatus === "resolved" ? styles.badgeAccent : styles.badgeWarn}`}>
                    {ticketStatusLabel}
                  </span>
                  <span className={`${styles.badge} ${ticketPriority === "high" ? styles.badgeDanger : styles.badgeNeutral}`}>
                    {ticketPriorityLabel}
                  </span>
                </div>
                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Plus">
                    <Icon icon="mdi:dots-horizontal" aria-hidden />
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>Résoudre</button>
                </div>
              </div>

              <div className={styles.ticketLayout}>
                <aside className={styles.ticketPane} aria-label="Propriétés">
                  <div className={styles.ticketPaneSection}>
                    <p className={styles.ticketPaneTitle}>Propriétés</p>
                    <div className={styles.ticketFieldStack}>
                      <label className={styles.formField}>
                        <span className={styles.fieldLabel}>Demandeur</span>
                        <div className={`${styles.searchBox} ${styles.searchBoxFluid}`}>
                          <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
                          <input
                            className={styles.searchInput}
                            type="search"
                            value={ticketRequester}
                            onChange={e => setTicketRequester(e.target.value)}
                            placeholder="Rechercher"
                            aria-label="Demandeur"
                          />
                          {ticketRequester ? (
                            <button
                              type="button"
                              className={styles.searchClear}
                              onClick={() => setTicketRequester("")}
                              aria-label="Effacer"
                            >
                              <Icon icon="mdi:close" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </label>
                      <label className={styles.formField}>
                        <span className={styles.fieldLabel}>Entreprise</span>
                        <input className={styles.input} type="text" defaultValue="Entreprise Démo SAS" />
                      </label>
                      <label className={styles.formField}>
                        <span className={styles.fieldLabel}>Assigné</span>
                        <input className={styles.input} type="text" defaultValue="Lucas G." />
                      </label>
                      <div className={styles.formField}>
                        <span className={styles.fieldLabel}>Statut</span>
                        <FieldSelect
                          ariaLabel="Statut"
                          options={TICKET_STATUS_OPTIONS}
                          value={ticketStatus}
                          onChange={setTicketStatus}
                        />
                      </div>
                      <div className={styles.formField}>
                        <span className={styles.fieldLabel}>Priorité</span>
                        <FieldSelect
                          ariaLabel="Priorité"
                          options={TICKET_PRIORITY_OPTIONS}
                          value={ticketPriority}
                          onChange={setTicketPriority}
                        />
                      </div>
                      <div className={styles.formField}>
                        <span className={styles.fieldLabel}>Catégorie</span>
                        <FieldSelect
                          ariaLabel="Catégorie"
                          options={TICKET_CATEGORY_OPTIONS}
                          value={ticketCategory}
                          onChange={setTicketCategory}
                        />
                      </div>
                    </div>
                  </div>
                </aside>

                <section className={`${styles.ticketPane} ${styles.ticketChatPane}`} aria-label="Conversation">
                  <header className={styles.ticketChatHeader}>
                    <div>
                      <p className={styles.ticketChatHeaderTitle}>Conversation</p>
                      <p className={styles.ticketChatHeaderMeta}>Support · Canal e-mail</p>
                    </div>
                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                      {ticketMessages.length} message{ticketMessages.length > 1 ? "s" : ""}
                    </span>
                  </header>
                  <ScrollFadeShell
                    className={styles.ticketChatScroll}
                    deps={[ticketMessages.length]}
                    stickToBottom
                  >
                    <div className={styles.ticketChatThread}>
                      {ticketMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={[
                            styles.ticketBubbleRow,
                            msg.outbound ? styles.ticketBubbleRowOut : styles.ticketBubbleRowIn,
                            msg.appear ? styles.ticketBubbleRowAppear : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className={`${styles.ticketBubble} ${msg.outbound ? styles.ticketBubbleOut : styles.ticketBubbleIn}`}>
                            <div className={styles.ticketBubbleMeta}>
                              <strong>{msg.author}</strong>
                              <span>{msg.time}</span>
                            </div>
                            <p className={styles.ticketBubbleText}>{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollFadeShell>
                  <div className={`${styles.ticketComposer} ${ticketSending ? styles.ticketComposerSending : ""}`}>
                    <label className={styles.formField}>
                      <span className={styles.fieldLabel}>Réponse</span>
                      <textarea
                        ref={ticketComposerRef}
                        className={styles.textarea}
                        rows={3}
                        placeholder="Écrire une réponse…"
                        value={ticketDraft}
                        onChange={e => setTicketDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendTicketMessage();
                          }
                        }}
                      />
                    </label>
                    <div className={styles.ticketComposerActions}>
                      <button type="button" className={`${styles.btnSquare} ${styles.btnSquareSecondary}`} aria-label="Joindre">
                        <Icon icon="mdi:paperclip" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={sendTicketMessage}
                        disabled={!ticketDraft.trim() || ticketSending}
                      >
                        <Icon icon="mdi:send" aria-hidden />
                        Envoyer
                      </button>
                    </div>
                  </div>
                </section>

                <aside className={styles.ticketPane} aria-label="Contexte">
                  <div className={styles.ticketPaneSection}>
                    <p className={styles.ticketPaneTitle}>Contact</p>
                    <div className={styles.entityCardList}>
                      <EntityCard {...DEMO_CONTACTS[0]} />
                    </div>
                  </div>
                  <div className={styles.ticketPaneSection}>
                    <p className={styles.ticketPaneTitle}>Site</p>
                    <div className={styles.entityCardList}>
                      <EntityCard {...DEMO_SITES[0]} />
                    </div>
                  </div>
                  <div className={styles.ticketPaneSection}>
                    <p className={styles.ticketPaneTitle}>Ticket</p>
                    <div className={styles.ticketContextLines}>
                      <div><strong>Créé</strong> 22/10/2026 09:10</div>
                      <div><strong>Mis à jour</strong> 22/10/2026 09:21</div>
                      <div><strong>Canal</strong> E-mail</div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </div>

      {modalOpen ? (
        <SectionedModal
          activeSection={modalSection}
          onSectionChange={setModalSection}
          onClose={closeModal}
          exiting={modalExiting}
          onExited={() => {
            setModalOpen(false);
            setModalExiting(false);
          }}
          pickedColor={pickedColor}
          onColorChange={setPickedColor}
        />
      ) : null}

      {typeof document !== "undefined"
        ? createPortal(
            <button
              type="button"
              className={`${styles.backToTop} ${showBackToTop ? styles.backToTopVisible : ""}`}
              onClick={scrollToTop}
              aria-label="Remonter en haut de la page"
              title="Remonter en haut"
              tabIndex={showBackToTop ? 0 : -1}
            >
              <Icon icon="mdi:chevron-up" aria-hidden />
            </button>,
            document.body
          )
        : null}
    </div>
  );
}
