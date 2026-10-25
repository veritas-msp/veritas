import { Icon } from "@iconify/react";
import {
  AudioLinesIcon,
  BellIcon,
  BookTextIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CloudIcon,
  CloudUploadIcon,
  DatabaseIcon,
  EllipsisIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  LaptopMinimalCheckIcon,
  MonitorIcon,
  NetworkIcon,
  PlugIcon,
  RadioIcon,
  RefreshCCWIcon,
  ServerIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SquareArrowUpIcon,
  SquarePenIcon,
  TabletIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
  VaultIcon,
  ZapIcon,
} from "../Misc/Sidebar/lucideAnimated";

/** Types d’ordinateur → icône Lucide animée */
export const COMPUTER_TYPE_ANIMATED = {
  laptop: LaptopMinimalCheckIcon,
  desktop: MonitorIcon,
  "all-in-one": MonitorIcon,
  "mini-pc": ServerIcon,
  tablet: TabletIcon,
  other: EllipsisIcon,
};

/** Sections formulaire équipement → icône Lucide animée */
export const SECTION_ANIMATED = {
  general: FileTextIcon,
  schedule: CalendarDaysIcon,
  dates: CalendarDaysIcon,
  assignees: UsersIcon,
  objects: DatabaseIcon,
  inventory: TagIcon,
  form: SquarePenIcon,
  add: TagIcon,
  ssl: ShieldCheckIcon,
  identity: TagIcon,
  common: FileTextIcon,
  network: NetworkIcon,
  connection: CloudUploadIcon,
  internetType: CloudUploadIcon,
  internetLink: HeartHandshakeIcon,
  internetNetwork: RadioIcon,
  internetContract: FileTextIcon,
  internetNotes: BookTextIcon,
  hardware: ServerIcon,
  system: SlidersHorizontalIcon,
  roles: TagIcon,
  details: SlidersHorizontalIcon,
  extra: TagIcon,
  storage: DatabaseIcon,
  ha: ShieldCheckIcon,
  licences: FileTextIcon,
  maintenance: CalendarDaysIcon,
  notes: BookTextIcon,
  remote: LaptopMinimalCheckIcon,
  management: SlidersHorizontalIcon,
  wifi: RadioIcon,
  power: ZapIcon,
  voip: AudioLinesIcon,
  category: TagIcon,
  client: BriefcaseBusinessIcon,
};

/** Marques alimentation (UPS / PDU) → icône Lucide animée */
export const ALIMENTATION_BRAND_ANIMATED = {
  APC: PlugIcon,
  Eaton: PlugIcon,
  CyberPower: PlugIcon,
  Schneider: ZapIcon,
  Legrand: PlugIcon,
  Vertiv: ShieldCheckIcon,
  Raritan: PlugIcon,
  __other__: EllipsisIcon,
};

/** Types de déploiement / contenu de section (toutes familles) */
export const SERVER_TYPE_ANIMATED = {
  physique: ServerIcon,
  virtuel: CloudIcon,
};

export const FIREWALL_TYPE_ANIMATED = {
  materiel: ShieldCheckIcon,
  virtuel: CloudIcon,
  cloud: CloudUploadIcon,
  logiciel: FileTextIcon,
  autre: EllipsisIcon,
};

export const STORAGE_TYPE_ANIMATED = {
  nas: DatabaseIcon,
  san: NetworkIcon,
  virtuel: CloudIcon,
  cloud: CloudUploadIcon,
  robot: RefreshCCWIcon,
  externe: DatabaseIcon,
};

export const ALIMENTATION_TYPE_ANIMATED = {
  Onduleur: PlugIcon,
  UPS: PlugIcon,
  PDU: ZapIcon,
};

export const ROUTEUR_TYPE_ANIMATED = {
  Routeur: RadioIcon,
  "SD-WAN": NetworkIcon,
};

export const TOIP_TYPE_ANIMATED = {
  "IP-PBX": AudioLinesIcon,
  Passerelle: NetworkIcon,
  SBC: ShieldCheckIcon,
  "Phone IP": AudioLinesIcon,
  Autre: EllipsisIcon,
};

export const MANAGEABLE_ANIMATED = {
  true: NetworkIcon,
  false: RadioIcon,
};

export const INTERNET_TYPE_ANIMATED = {
  Fibre: ZapIcon,
  ADSL: NetworkIcon,
  SDSL: NetworkIcon,
  VDSL: NetworkIcon,
  "4G": RadioIcon,
  "5G": RadioIcon,
  Satellite: CloudIcon,
  "Câble": NetworkIcon,
  Radio: RadioIcon,
  "SD-WAN": NetworkIcon,
  Autre: EllipsisIcon,
};

/** Catégories / familles matériel */
export const CATEGORY_ANIMATED = {
  Internet: CloudUploadIcon,
  Firewalls: ShieldCheckIcon,
  Servers: ServerIcon,
  Storage: DatabaseIcon,
  NAS: DatabaseIcon,
  Ordinateurs: LaptopMinimalCheckIcon,
  BorneWifi: RadioIcon,
  Routeur: RadioIcon,
  TOIP: AudioLinesIcon,
  Switch: NetworkIcon,
  Alimentation: ZapIcon,
  Backup: CloudUploadIcon,
  "Security camera": MonitorIcon,
};

/** Bricks Cyber & Cloud (panneau détail) */
export const CYBER_BRICK_ANIMATED = {
  Antivirus: ShieldCheckIcon,
  Antispam: HeartHandshakeIcon,
  TenantMicrosoft: CloudIcon,
  GoogleWorkspace: CloudIcon,
  Backup: DatabaseIcon,
  NDD: NetworkIcon,
  CertificatsSSL: FileTextIcon,
  LicensesAbonnements: TagIcon,
};

/** Onglets principaux fiche entreprise */
export const OVERVIEW_TAB_ANIMATED = {
  map: NetworkIcon,
  cyber: ShieldCheckIcon,
  backup: DatabaseIcon,
  activity: TicketIcon,
  events: CalendarDaysIcon,
  vault: VaultIcon,
  logs: RefreshCCWIcon,
};

/** Actions rapides (sidebar fiche entreprise) */
export const QUICK_ACTION_ANIMATED = {
  edit: SquarePenIcon,
  ticket: TicketIcon,
  schedule: CalendarDaysIcon,
  subscribe: BellIcon,
  export: SquareArrowUpIcon,
};

/**
 * Icône qui s’anime au hover du parent (via ref.startAnimation / stopAnimation).
 */
export default function EquipmentHoverIcon({
  Animated = null,
  iconify = "mdi:cube-outline",
  size = 22,
  className,
  animRef,
}) {
  if (Animated) {
    return <Animated ref={animRef} size={size} className={className} />;
  }
  return <Icon icon={iconify} className={className} width={size} height={size} aria-hidden />;
}
