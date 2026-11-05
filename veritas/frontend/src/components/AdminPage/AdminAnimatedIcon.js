import { useRef } from "react";
import EquipmentHoverIcon from "../EquipementPage/EquipmentHoverIcon";
import {
  BellIcon,
  BookTextIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ChartColumnIncreasingIcon,
  CircleHelpIcon,
  CloudUploadIcon,
  DatabaseIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  LaptopMinimalCheckIcon,
  MessageSquareIcon,
  MonitorIcon,
  NetworkIcon,
  PlugIcon,
  RadioIcon,
  RefreshCCWIcon,
  ServerIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SquarePenIcon,
  SunIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
  VaultIcon,
  ZapIcon
} from "../Misc/Sidebar/lucideAnimated";

/** Clés menu admin → Lucide animé (même framework que la sidebar) */
export const ADMIN_NAV_ANIMATED = {
  general: SlidersHorizontalIcon,
  "login-branding": SunIcon,
  reports: FileTextIcon,
  "tech-news-feeds": RadioIcon,
  users: UsersIcon,
  permissions: ShieldCheckIcon,
  clients: BriefcaseBusinessIcon,
  "client-portal": MonitorIcon,
  "fiche-config": SlidersHorizontalIcon,
  sla: CalendarDaysIcon,
  "support-credits": TicketIcon,
  tickets: TicketIcon,
  "service-settings": BriefcaseBusinessIcon,
  "mail-collect": MessageSquareIcon,
  notifications: BellIcon,
  injection: DatabaseIcon,
  "equipment-purge": RefreshCCWIcon,
  maintenance: BellIcon,
  rmm: LaptopMinimalCheckIcon,
  integrations: PlugIcon,
  license: VaultIcon
};

/** Titres de sections du menu admin */
export const ADMIN_SECTION_ANIMATED = {
  general: SlidersHorizontalIcon,
  organization: UsersIcon,
  clients: BriefcaseBusinessIcon,
  tickets: TicketIcon,
  operations: ZapIcon,
  platform: ServerIcon
};

/** Onglets / sections courants (clés locales) */
export const ADMIN_TAB_ANIMATED = {
  locale: CircleHelpIcon,
  appearance: SunIcon,
  organization: BriefcaseBusinessIcon,
  support: HeartHandshakeIcon,
  email: MessageSquareIcon,
  smtp: MessageSquareIcon,
  database: DatabaseIcon,
  general: SlidersHorizontalIcon,
  content: FileTextIcon,
  media: SunIcon,
  typography: BookTextIcon,
  layout: SlidersHorizontalIcon,
  html: SquarePenIcon,
  identity: TagIcon,
  logos: MonitorIcon,
  header: FileTextIcon,
  footer: FileTextIcon,
  contact: UsersIcon,
  socials: HeartHandshakeIcon,
  colors: SunIcon,
  fonts: BookTextIcon,
  sizes: SlidersHorizontalIcon,
  settings: SlidersHorizontalIcon,
  all: RadioIcon,
  deploy: CloudUploadIcon,
  tokens: TagIcon,
  agents: LaptopMinimalCheckIcon,
  consumptions: ChartColumnIncreasingIcon,
  "contract-modules": TagIcon,
  "equipment-families": LaptopMinimalCheckIcon,
  collectors: DatabaseIcon,
  rules: NetworkIcon,
  options: SlidersHorizontalIcon,
  system: BellIcon,
  catalog: SlidersHorizontalIcon,
  templates: FileTextIcon,
  "in-app": BellIcon,
  links: PlugIcon,
  logs: RefreshCCWIcon,
  "sales-forms": BriefcaseBusinessIcon,
  categories: TagIcon,
  "ticket-views": MonitorIcon,
  companies: BriefcaseBusinessIcon,
  contacts: UsersIcon,
  documents: FileTextIcon,
  equipment: ServerIcon,
  tickets_support: HeartHandshakeIcon,
  tickets_sales: BriefcaseBusinessIcon,
  tickets: TicketIcon
};

/** Iconify → Lucide animé (fallback Iconify si absent) */
export const ADMIN_ICONIFY_ANIMATED = {
  "mdi:cog-outline": SlidersHorizontalIcon,
  "mdi:cog": SlidersHorizontalIcon,
  "mdi:palette-outline": SunIcon,
  "mdi:file-document-outline": FileTextIcon,
  "mdi:rss": RadioIcon,
  "mdi:account-group-outline": UsersIcon,
  "mdi:account-group": UsersIcon,
  "mdi:shield-key-outline": ShieldCheckIcon,
  "mdi:office-building-outline": BriefcaseBusinessIcon,
  "mdi:monitor-dashboard": MonitorIcon,
  "mdi:tune-variant": SlidersHorizontalIcon,
  "mdi:timer-cog-outline": CalendarDaysIcon,
  "mdi:ticket-confirmation-outline": TicketIcon,
  "mdi:ticket-outline": TicketIcon,
  "mdi:ticket-percent-outline": TicketIcon,
  "mdi:briefcase-edit-outline": BriefcaseBusinessIcon,
  "mdi:briefcase-outline": BriefcaseBusinessIcon,
  "mdi:email-outline": MessageSquareIcon,
  "mdi:email-edit-outline": MessageSquareIcon,
  "mdi:email-fast-outline": MessageSquareIcon,
  "mdi:bell-badge-outline": BellIcon,
  "mdi:bell-outline": BellIcon,
  "mdi:bell-ring-outline": BellIcon,
  "mdi:database-import-outline": DatabaseIcon,
  "mdi:database-import": DatabaseIcon,
  "mdi:database-outline": DatabaseIcon,
  "mdi:delete-sweep-outline": RefreshCCWIcon,
  "mdi:bullhorn-outline": BellIcon,
  "mdi:laptop-account": LaptopMinimalCheckIcon,
  "mdi:laptop": LaptopMinimalCheckIcon,
  "mdi:link-variant": PlugIcon,
  "mdi:key-variant": VaultIcon,
  "mdi:key-outline": TagIcon,
  "mdi:key-chain-variant": TagIcon,
  "mdi:translate": CircleHelpIcon,
  "mdi:calendar-clock": CalendarDaysIcon,
  "mdi:calendar-clock-outline": CalendarDaysIcon,
  "mdi:calendar-week": CalendarDaysIcon,
  "mdi:clock-outline": CalendarDaysIcon,
  "mdi:information-outline": CircleHelpIcon,
  "mdi:devices": LaptopMinimalCheckIcon,
  "mdi:puzzle-outline": TagIcon,
  "mdi:connection": NetworkIcon,
  "mdi:download-outline": CloudUploadIcon,
  "mdi:chart-box-outline": ChartColumnIncreasingIcon,
  "mdi:robot-outline": ZapIcon,
  "mdi:clipboard-text-clock-outline": FileTextIcon,
  "mdi:help-circle-outline": CircleHelpIcon,
  "mdi:lifebuoy": HeartHandshakeIcon,
  "mdi:book-open-page-variant-outline": BookTextIcon,
  "mdi:format-list-numbered": SlidersHorizontalIcon,
  "mdi:format-font": BookTextIcon,
  "mdi:format-size": SlidersHorizontalIcon,
  "mdi:format-color-fill": SunIcon,
  "mdi:eyedropper-variant": SunIcon,
  "mdi:image-outline": MonitorIcon,
  "mdi:image-frame": MonitorIcon,
  "mdi:page-layout-header": FileTextIcon,
  "mdi:page-layout-footer": FileTextIcon,
  "mdi:page-layout-sidebar-left": SlidersHorizontalIcon,
  "mdi:card-account-phone-outline": UsersIcon,
  "mdi:share-variant-outline": HeartHandshakeIcon,
  "mdi:badge-account-horizontal-outline": TagIcon,
  "mdi:text-box-outline": FileTextIcon,
  "mdi:eye-outline": MonitorIcon,
  "mdi:code-tags": SquarePenIcon,
  "mdi:toggle-switch-outline": SlidersHorizontalIcon,
  "mdi:file-document-edit-outline": SquarePenIcon,
  "mdi:form-select": FileTextIcon,
  "mdi:shape-outline": TagIcon,
  "mdi:view-dashboard-outline": MonitorIcon,
  "mdi:inbox-multiple-outline": DatabaseIcon,
  "mdi:filter-variant": SlidersHorizontalIcon,
  "mdi:hammer-wrench": ZapIcon,
  "mdi:server-outline": ServerIcon,
  "mdi:headset": HeartHandshakeIcon,
  "mdi:account-cog-outline": UsersIcon,
  "mdi:account-multiple-outline": UsersIcon
};

export function resolveAdminAnimated({ key, icon, animated } = {}) {
  if (animated && typeof animated !== "string") return animated;
  if (typeof animated === "string") {
    return (
      ADMIN_NAV_ANIMATED[animated] ||
      ADMIN_SECTION_ANIMATED[animated] ||
      ADMIN_TAB_ANIMATED[animated] ||
      ADMIN_ICONIFY_ANIMATED[animated] ||
      null
    );
  }
  return (
    (key && (ADMIN_NAV_ANIMATED[key] || ADMIN_SECTION_ANIMATED[key] || ADMIN_TAB_ANIMATED[key])) ||
    (icon && ADMIN_ICONIFY_ANIMATED[icon]) ||
    null
  );
}

/**
 * Icône admin animée (lucideAnimated + fallback Iconify), comme la sidebar / fiche entreprise.
 */
export default function AdminAnimatedIcon({
  iconKey = null,
  iconify = null,
  animated = null,
  size = 18,
  className,
  animRef
}) {
  const localRef = useRef(null);
  const ref = animRef || localRef;
  const Animated = resolveAdminAnimated({ key: iconKey, icon: iconify, animated });

  return (
    <EquipmentHoverIcon
      Animated={Animated}
      iconify={iconify || "mdi:circle-outline"}
      size={size}
      className={className}
      animRef={ref}
    />
  );
}

export function useAdminIconHover() {
  const animRef = useRef(null);
  return {
    animRef,
    onMouseEnter: () => animRef.current?.startAnimation?.(),
    onMouseLeave: () => animRef.current?.stopAnimation?.()
  };
}
