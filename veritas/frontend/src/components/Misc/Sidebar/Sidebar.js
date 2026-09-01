import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import styles from "./Sidebar.module.css";
import { DOCUMENTS_CONFIG } from "../../../utils/constants";
import SidebarTooltip from "./SidebarTooltip";
import SidebarAccessNavItem from "./SidebarAccessNavItem";
import UserAvatar from "../../shared/UserAvatar/UserAvatar";
import { Icon } from "@iconify/react";
import { useTheme } from "../../../hooks/useTheme";
import { useVeritasEdition } from "../../../hooks/useVeritasEdition";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getRoleLabel } from "../../../i18n/commonI18n";
import { getSidebarCopy, localizeDocumentLabel } from "./sidebarI18n";
import ProFeaturePromoModal from "../ProFeature/ProFeaturePromoModal";
import ProFeatureBadge from "../ProFeature/ProFeatureBadge";
import NotificationBell from "../../Notifications/NotificationBell";
import PageGuideTour from "../../PageGuide/PageGuideTour";
import { buildSidebarGuideSteps } from "../../PageGuide/sidebarGuideI18n";
import { useSidebarGuide } from "../../../hooks/useSidebarGuide";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { hasRegisteredPageGuide, openRegisteredPageGuide, subscribePageGuideRegistry } from "../../PageGuide/pageGuideRegistry";
import { isSuperAdminProtectedProfile } from "../../../utils/profileProtection";
import GlobalSearchPalette, { getSearchShortcutLabel, useGlobalSearchHotkey } from "../GlobalSearch/GlobalSearchPalette";
function normalizeProfileLabel(profile) {
  if (profile == null) return "";
  return String(profile).replace(/\s+$/, "").trim();
}
function getUserInitials(user) {
  if (!user) return "?";
  const name = (user.name || user.displayName || "").toString().trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const local = (user.email || "").split("@")[0] || "";
  const segments = local.split(/[._-]+/).filter(Boolean);
  if (segments.length >= 2) {
    return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
  }
  return (local.slice(0, 2) || "?").toUpperCase();
}
function SectionDivider({
  show,
  isCollapsed
}) {
  if (!show) return null;
  return (
    <hr
      className={isCollapsed ? styles.sectionDividerCollapsed : styles.separator}
      aria-hidden
    />
  );
}
export default function Sidebar({
  current,
  onSelect,
  onNavigate,
  onLogout,
  user,
  userRole,
  profile,
  drafts,
  access,
  onCollapseChange,
  updateAvailable = false,
  updateLatestVersion = null,
  /** When false, defer auto "Bienvenue" menu tour until premiers pas are done. */
  sidebarGuideAutoStart = true
}) {
  const { isMobile } = useBreakpoint();
  const [showMenu, setShowMenu] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuFixedStyle, setUserMenuFixedStyle] = useState(null);
  const userMenuRef = useRef(null);
  const userMenuDropdownRef = useRef(null);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  const {
    theme,
    toggleTheme
  } = useTheme();
  const {
    isCommunity
  } = useVeritasEdition();
  const locale = useAppLocale();
  const copy = useMemo(() => getSidebarCopy(locale), [locale]);
  const [proPromoFeature, setProPromoFeature] = useState(null);
  const {
    open: sidebarGuideOpen,
    close: closeSidebarGuide,
    start: startSidebarGuide
  } = useSidebarGuide(user?.id, {
    autoStartAllowed: sidebarGuideAutoStart
  });
  const [pageGuideAvailable, setPageGuideAvailable] = useState(() => hasRegisteredPageGuide());
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useGlobalSearchHotkey(openSearch);
  useEffect(() => subscribePageGuideRegistry(() => {
    setPageGuideAvailable(hasRegisteredPageGuide());
  }), []);
  const startHelp = useCallback(() => {
    if (openRegisteredPageGuide()) return;
    startSidebarGuide();
  }, [startSidebarGuide]);
  const isDarkTheme = theme === "dark";
  const themeTooltip = isDarkTheme ? copy.theme.lightMode : copy.theme.darkMode;
  const themeMenuIcon = isDarkTheme ? "mdi:weather-sunny" : "mdi:weather-night";
  // Desktop stays a 64px icon rail. Compact screens expand the drawer with labels.
  const isCollapsed = !isMobile;
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(true);
    }
  }, [onCollapseChange]);
  useEffect(() => {
    if (!isMobile) setShowMenu(false);
  }, [isMobile]);
  useEffect(() => {
    if (!isMobile || !showMenu) return;
    const onKeyDown = e => {
      if (e.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, showMenu]);
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocMouseDown = e => {
      if (userMenuRef.current?.contains(e.target) || userMenuDropdownRef.current?.contains(e.target)) {
        return;
      }
      setUserMenuOpen(false);
    };
    const onKeyDown = e => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);
  const showIconTooltip = isCollapsed || isMobile;
  const userInitials = getUserInitials(user);
  const profileLabel = normalizeProfileLabel(profile);
  const openUserMenuToRight = isCollapsed;
  const showCrmSection = !!(access["Contrat"] || access["Contact"]);
  const showExploitationSection = !!(access["Ticket"] || access["TicketSales"] || access["Planning"]);
  const showManagedSection = !!(access["Hardware"] || access["EquipmentInventory"] || access["Cybersecurite"] || access["Service"]);
  const showPilotageSection = !!(access["Dashboard"] || access["KnowledgeBase"] || DOCUMENTS_CONFIG.some(doc => access[doc.key] && doc.key !== "Mon" && !(doc.key === "DocumentsHub" && isCommunity)) || !!access["Mon"] && !isCommunity);
  const sidebarGuide = useMemo(() => buildSidebarGuideSteps({
    locale,
    showCrmSection,
    showExploitationSection,
    showManagedSection,
    showPilotageSection
  }), [locale, showCrmSection, showExploitationSection, showManagedSection, showPilotageSection]);
  const helpAria = pageGuideAvailable ? sidebarGuide.pageHelpAria || sidebarGuide.helpAria : sidebarGuide.helpAria;
  const searchAria = copy.search?.aria || "Recherche globale";
  const searchTooltip = `${copy.search?.tooltip || "Recherche"} (${getSearchShortcutLabel()})`;
  const updateUserMenuPosition = useCallback(() => {
    const root = userMenuRef.current;
    if (!root || !userMenuOpen) return;
    const rect = root.getBoundingClientRect();
    const gap = 10;
    if (openUserMenuToRight) {
      const menuEl = userMenuDropdownRef.current;
      const menuH = menuEl?.offsetHeight || 300;
      const pad = 8;
      const centerY = rect.top + rect.height / 2;
      const minCenter = pad + menuH / 2;
      const maxCenter = window.innerHeight - pad - menuH / 2;
      const clampedCenter = maxCenter >= minCenter ? Math.max(minCenter, Math.min(maxCenter, centerY)) : window.innerHeight / 2;
      setUserMenuFixedStyle({
        position: "fixed",
        top: clampedCenter,
        left: rect.right + gap,
        transform: "translateY(-50%)"
      });
    } else {
      const estH = userMenuDropdownRef.current?.offsetHeight ?? 280;
      const top = Math.min(rect.top - gap - estH, window.innerHeight - estH - 8);
      setUserMenuFixedStyle({
        position: "fixed",
        top: Math.max(8, top),
        left: Math.min(rect.left, window.innerWidth - 228),
        transform: "none"
      });
    }
  }, [userMenuOpen, openUserMenuToRight]);
  useLayoutEffect(() => {
    if (!userMenuOpen) {
      setUserMenuFixedStyle(null);
      return;
    }
    updateUserMenuPosition();
    const id = requestAnimationFrame(() => updateUserMenuPosition());
    const onResize = () => updateUserMenuPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [userMenuOpen, updateUserMenuPosition, isCollapsed, isMobile]);
  const runUserMenuAction = fn => {
    fn();
    closeUserMenu();
    if (isMobile) setShowMenu(false);
  };
  const openModulesPromo = () => {
    setProPromoFeature("sidebarModules");
    if (isMobile) setShowMenu(false);
  };
  return <>
      {}
      {isMobile && !showMenu && <button type="button" className={styles.burgerButton} onClick={() => setShowMenu(true)} aria-expanded={false} aria-label={copy.chrome?.openMenu || "Ouvrir le menu"}>
          ☰
        </button>}

      {}
      {(showMenu || !isMobile) && <motion.nav className={`${styles.sidebar} ${isMobile ? styles.mobileSidebar : styles.sidebarCollapsed}`} data-sidebar-guide="sidebar-root" initial={{
      x: isMobile ? '-100%' : 0,
      opacity: 1
    }} animate={{
      x: 0,
      opacity: 1
    }} exit={{
      x: isMobile ? '-100%' : -50,
      opacity: isMobile ? 1 : 0
    }} transition={{
      duration: 0.4,
      ease: "easeOut"
    }}>
          <div className={styles.sidebarContent}>
            <div className={styles.logoHeader} data-sidebar-guide="brand">
              {showIconTooltip ? <SidebarTooltip as="span" content={copy.home} className={styles.sidebarTooltipHost}>
                  <div className={styles.logoWrapper} onClick={() => {
                onSelect("Home");
                if (isMobile) setShowMenu(false);
              }}>
                    <div className={styles.brandMark}>V</div>
                    {!isCollapsed && <span className={styles.logoText}>Veritas</span>}
                  </div>
                </SidebarTooltip> : <div className={styles.logoWrapper} onClick={() => {
                onSelect("Home");
                if (isMobile) setShowMenu(false);
              }}>
                  <div className={styles.brandMark}>V</div>
                  {!isCollapsed && <span className={styles.logoText}>Veritas</span>}
                </div>}
            </div>

            <div className={styles.sidebarHeader}>
              <hr className={styles.separator} />
            </div>

            <div className={styles.sidebarNavScroll}>
            {}
            <AnimatePresence initial={false}>
              {showCrmSection && <motion.div key="nav-section-crm" data-sidebar-guide="crm" initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: "auto"
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: 0.22,
            ease: "easeOut"
          }} style={{
            overflow: "hidden"
          }}>
                  {!isCollapsed && <div className={styles.sectionTitle}>{copy.sections.crm}</div>}
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-crm">
                    <AnimatePresence initial={false} mode="popLayout">
                      {!!access["Contrat"] && <SidebarAccessNavItem key="Contrat" itemKey="Contrat" showTooltip={showIconTooltip} tooltip={copy.nav.enterprises} className={`${styles.navItem} ${current === "Contrat" || current === "ContratDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Contrat");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:building-1-fill" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.enterprises : null} />}
                      {!!access["Contact"] && <SidebarAccessNavItem key="Contact" itemKey="Contact" showTooltip={showIconTooltip} tooltip={copy.nav.contact} className={`${styles.navItem} ${current === "Contact" || current === "ContactDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Contact");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:contacts-3-fill" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.contact : null} />}
                    </AnimatePresence>
                    </LayoutGroup>
                  </ul>
                </motion.div>}
            </AnimatePresence>
            <SectionDivider show={showCrmSection && (showExploitationSection || showManagedSection || showPilotageSection)} isCollapsed={isCollapsed} />

            <AnimatePresence initial={false}>
              {showExploitationSection && <motion.div key="nav-section-exploitation" data-sidebar-guide="exploitation" initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: "auto"
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: 0.22,
            ease: "easeOut"
          }} style={{
            overflow: "hidden"
          }}>
                  {!isCollapsed && <div className={styles.sectionTitle}>{copy.sections.exploitation}</div>}
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-exploitation">
                    <AnimatePresence initial={false} mode="popLayout">
                      {!!access["Ticket"] && <SidebarAccessNavItem key="Ticket" itemKey="Ticket" showTooltip={showIconTooltip} tooltip={copy.nav.support} className={`${styles.navItem} ${current === "Ticket" || current === "TicketCreate" ? styles.active : ""}`} onClick={() => {
                    onSelect("Ticket");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:message-processing-outline" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.support : null} />}
                      {!!access["TicketSales"] && <SidebarAccessNavItem key="TicketSales" itemKey="TicketSales" showTooltip={showIconTooltip} tooltip={copy.nav.sales} className={`${styles.navItem} ${current === "TicketSales" || current === "TicketSalesCreate" || current === "TicketSalesDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("TicketSales");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:briefcase-edit-outline" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.sales : null} />}
                      {!!access["Planning"] && <SidebarAccessNavItem key="Planning" itemKey="Planning" showTooltip={showIconTooltip} tooltip={copy.nav.planning} className={`${styles.navItem} ${current === "Planning" ? styles.active : ""}`} onClick={() => {
                    onSelect("Planning");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:calendar-time-add-fill" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.planning : null} />}
                    </AnimatePresence>
                    </LayoutGroup>
                  </ul>
                </motion.div>}
            </AnimatePresence>
            <SectionDivider show={showExploitationSection && (showManagedSection || showPilotageSection)} isCollapsed={isCollapsed} />

            {}
            <AnimatePresence initial={false}>
              {showManagedSection && <motion.div key="nav-section-managed" data-sidebar-guide="managed" initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: "auto"
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: 0.22,
            ease: "easeOut"
          }} style={{
            overflow: "hidden"
          }}>
                  {!isCollapsed && <div className={styles.sectionTitle}>{copy.sections.managed}</div>}
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-managed">
                    <AnimatePresence initial={false} mode="popLayout">
                      {!!access["Hardware"] && <SidebarAccessNavItem key="Hardware" itemKey="Hardware" showTooltip={showIconTooltip} tooltip={copy.nav.supervision} className={`${styles.navItem} ${current === "Hardware" || current === "Equipment" ? styles.active : ""}`} onClick={() => {
                    onSelect("Hardware");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:radar" className={`${styles.itemIcon} ${styles.itemIconInfra}`} />} label={!isCollapsed ? copy.nav.supervision : null} />}
                      {!!access["EquipmentInventory"] && <SidebarAccessNavItem key="EquipmentInventory" itemKey="EquipmentInventory" showTooltip={showIconTooltip} tooltip={copy.nav.inventory} className={`${styles.navItem} ${current === "EquipmentInventory" ? styles.active : ""}`} onClick={() => {
                    onSelect("EquipmentInventory");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:devices" className={`${styles.itemIcon} ${styles.itemIconInventory}`} />} label={!isCollapsed ? copy.nav.inventory : null} />}
                      {!!access["Cybersecurite"] && <SidebarAccessNavItem key="Cybersecurite" itemKey="Cybersecurite" showTooltip={showIconTooltip} tooltip={copy.nav.cyber} className={`${styles.navItem} ${current === "Cybersecurite" || current === "CampaignDetail" || current === "AntivirusDetail" || current === "AntispamDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Cybersecurite");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:shield-lock" className={`${styles.itemIcon} ${styles.itemIconCyber}`} />} label={!isCollapsed ? copy.nav.cyber : null} />}
                      {!!access["Service"] && <SidebarAccessNavItem key="Service" itemKey="Service" showTooltip={showIconTooltip} tooltip={copy.nav.cloud} className={`${styles.navItem} ${current === "Service" || current === "TenantDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Service");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:cloud-outline" className={`${styles.itemIcon} ${styles.itemIconService}`} />} label={!isCollapsed ? copy.nav.cloud : null} />}
                    </AnimatePresence>
                    </LayoutGroup>
                  </ul>
                </motion.div>}
            </AnimatePresence>
            <SectionDivider show={showManagedSection && showPilotageSection} isCollapsed={isCollapsed} />

            {}
            <AnimatePresence initial={false}>
              {showPilotageSection && <motion.div key="nav-section-pilotage" data-sidebar-guide="pilotage" initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: "auto"
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: 0.22,
            ease: "easeOut"
          }} style={{
            overflow: "hidden"
          }}>
                  {!isCollapsed && <div className={styles.sectionTitle}>{copy.sections.pilotage}</div>}
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-pilotage-access">
                    <AnimatePresence initial={false} mode="popLayout">
                    {!!access["Dashboard"] && <SidebarAccessNavItem key="Dashboard" itemKey="Dashboard" showTooltip={showIconTooltip} tooltip={copy.nav.dashboard} className={`${styles.navItem} ${current === "Dashboard" ? styles.active : ""}`} onClick={() => {
                    onSelect("Dashboard");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:chart-box-outline" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.dashboard : null} />}
                    {!!access["KnowledgeBase"] && <SidebarAccessNavItem key="KnowledgeBase" itemKey="KnowledgeBase" showTooltip={showIconTooltip} tooltip={copy.nav.knowledgeBase} className={`${styles.navItem} ${current === "KnowledgeBase" ? styles.active : ""}`} onClick={() => {
                    onSelect("KnowledgeBase");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:book-open-page-variant-outline" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.knowledgeBase : null} />}
                    {DOCUMENTS_CONFIG.filter(doc => {
                    if (doc.key === "Mon") return false;
                    if (doc.key === "DocumentsHub" && isCommunity) return false;
                    return access[doc.key];
                  }).map(doc => {
                    const iconName = doc.icon?.startsWith("mdi:") || doc.icon?.startsWith("material-symbols:") ? doc.icon : doc.key === "Synth" ? "material-symbols:home" : "";
                    const isActive = current === doc.key;
                    return <SidebarAccessNavItem key={doc.key} itemKey={doc.key} showTooltip={showIconTooltip} tooltip={localizeDocumentLabel(doc.key, doc.label, locale)} className={`${styles.navItem} ${isActive ? styles.active : ""}`} onClick={() => {
                      onSelect(doc.key);
                      if (isMobile) setShowMenu(false);
                    }} icon={iconName ? <Icon icon={iconName} className={styles.itemIcon} /> : null} label={!isCollapsed ? <span className={styles.labelWithDot}>
                                <span>{localizeDocumentLabel(doc.key, doc.label, locale)}</span>
                                {drafts?.[doc.key] && <span className={styles.draftDot}>⬤</span>}
                              </span> : drafts?.[doc.key] ? <span className={styles.draftDot}>⬤</span> : null} />;
                  })}

                      {!!access["Mon"] && !isCommunity && <SidebarAccessNavItem key="Report" itemKey="Report" showTooltip={showIconTooltip} tooltip={copy.nav.reports} className={`${styles.navItem} ${current === "Report" ? styles.active : ""}`} onClick={() => {
                    onSelect("Report");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:report-forms-fill" className={styles.itemIcon} />} label={!isCollapsed ? copy.nav.reports : null} />}
                    </AnimatePresence>
                    </LayoutGroup>
                  </ul>
                </motion.div>}
            </AnimatePresence>
            <SectionDivider show={showPilotageSection} isCollapsed={isCollapsed} />

            {isCommunity ? <div className={styles.upgradeSection}>
              {!isCollapsed && <div className={styles.sectionTitle}>{copy.sections.modules}</div>}
              <div className={styles.upgradeAddBtnWrap}>
                {showIconTooltip ? <SidebarTooltip as="button" type="button" content={copy.modules.addModule} className={styles.upgradeAddBtn} onClick={openModulesPromo} aria-label={copy.modules.addModuleAria}>
                    <Icon icon="mdi:plus" className={styles.upgradeIcon} aria-hidden />
                  </SidebarTooltip> : <button type="button" className={styles.upgradeAddBtn} onClick={openModulesPromo} aria-label={copy.modules.addModuleAria}>
                    <Icon icon="mdi:plus" className={styles.upgradeIcon} aria-hidden />
                  </button>}
                <ProFeatureBadge variant="inline" className={styles.upgradeProBadge} />
              </div>
            </div> : null}

            </div>

            <div className={styles.sidebarFooter}>
            <div className={styles.utilitiesSection} data-sidebar-guide="utilities">
              {!isCollapsed && <div className={styles.sectionTitle}>{copy.sections.appearance}</div>}
              <div className={styles.utilitiesBtnRow}>
                {showIconTooltip ? <SidebarTooltip as="button" type="button" content={searchTooltip} className={`${styles.squareBtn} ${searchOpen ? styles.squareBtnActive : ""}`} onClick={() => {
                    setSearchOpen(true);
                    if (isMobile) setShowMenu(false);
                  }} aria-label={searchAria}>
                    <Icon icon="mdi:magnify" className={styles.squareBtnIcon} aria-hidden />
                  </SidebarTooltip> : <button type="button" className={`${styles.squareBtn} ${searchOpen ? styles.squareBtnActive : ""}`} onClick={() => {
                    setSearchOpen(true);
                    if (isMobile) setShowMenu(false);
                  }} aria-label={searchAria}>
                    <Icon icon="mdi:magnify" className={styles.squareBtnIcon} aria-hidden />
                  </button>}

                {showIconTooltip ? <SidebarTooltip as="button" type="button" content={helpAria} className={`${styles.squareBtn} ${sidebarGuideOpen ? styles.squareBtnActive : ""}`} onClick={startHelp} aria-label={helpAria}>
                    <span className={styles.helpBtnLabel} aria-hidden>
                      ?
                    </span>
                  </SidebarTooltip> : <button type="button" className={`${styles.squareBtn} ${sidebarGuideOpen ? styles.squareBtnActive : ""}`} onClick={startHelp} aria-label={helpAria}>
                    <span className={styles.helpBtnLabel} aria-hidden>
                      ?
                    </span>
                  </button>}

                {showIconTooltip ? <SidebarTooltip as="button" type="button" content={themeTooltip} className={styles.squareBtn} onClick={toggleTheme} aria-label={themeTooltip}>
                    <Icon icon={themeMenuIcon} className={styles.squareBtnIcon} aria-hidden />
                  </SidebarTooltip> : <button type="button" className={styles.squareBtn} onClick={toggleTheme} aria-label={themeTooltip}>
                    <Icon icon={themeMenuIcon} className={styles.squareBtnIcon} aria-hidden />
                  </button>}

                <NotificationBell onNavigate={onNavigate || onSelect} isCollapsed={isCollapsed} isMobile={isMobile} showIconTooltip={showIconTooltip} TooltipComponent={SidebarTooltip} triggerClassName={styles.squareBtn} triggerIconClassName={styles.squareBtnIcon} rootClassName={styles.notificationBellRoot} />
              </div>
            </div>

            {}
            <div className={styles.userSection} ref={userMenuRef} data-sidebar-guide="account">
<div className={`${styles.userMenuTriggerRow} ${isCollapsed ? styles.userMenuTriggerRowCollapsed : ""}`}>
                {showIconTooltip ? <SidebarTooltip as="span" content={copy.account.menu} className={styles.userAvatarTooltipHost}>
                    <button type="button" className={`${styles.userAvatarButton} ${userMenuOpen ? styles.userAvatarButtonOpen : ""} ${["MyDocs", "ReportBug", "Admin", "User", "Updates"].includes(current) ? styles.userAvatarButtonActive : ""}`} onClick={() => setUserMenuOpen(o => !o)} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={copy.account.menuAria}>
                      {user ? <UserAvatar user={user} name={user.username || user.email} size={32} variant="agent" /> : userInitials}
                    </button>
                  </SidebarTooltip> : <button type="button" className={`${styles.userAvatarButton} ${userMenuOpen ? styles.userAvatarButtonOpen : ""} ${["MyDocs", "ReportBug", "Admin", "User", "Updates"].includes(current) ? styles.userAvatarButtonActive : ""}`} onClick={() => setUserMenuOpen(o => !o)} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={copy.account.menuAria}>
                    {user ? <UserAvatar user={user} name={user.username || user.email} size={32} variant="agent" /> : userInitials}
                  </button>}
                {!isCollapsed && <button type="button" className={styles.userMenuLabelButton} onClick={() => setUserMenuOpen(o => !o)} aria-expanded={userMenuOpen} aria-haspopup="menu">
                    <span className={styles.userMenuLabelTitle}>{getRoleLabel(userRole, locale)}</span>
                    {profileLabel ? <span className={styles.userMenuLabelSubtitle} title={profileLabel}>
                        {profileLabel}
                      </span> : null}
                  </button>}
              </div>

              {userMenuOpen && userMenuFixedStyle && createPortal(<div ref={userMenuDropdownRef} className={styles.userMenuDropdown} style={userMenuFixedStyle} role="menu" aria-labelledby="sidebar-user-menu-title">
                    <div className={styles.userMenuDropdownTitle} id="sidebar-user-menu-title">
                      {copy.account.menu}
                    </div>
                    <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "User" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("User"))}>
                      <Icon icon="mingcute:contacts-4-fill" className={styles.userMenuItemIcon} />
                      {copy.account.myAccount}
                    </button>
                    {isSuperAdminProtectedProfile(profile) && <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "Updates" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("Updates"))}>
                        <Icon icon="mdi:update" className={styles.userMenuItemIcon} />
                        <span className={styles.userMenuItemLabel}>
                          {copy.account.updates}
                          {updateAvailable ? <span className={styles.userMenuBadge} title={updateLatestVersion ? `v${updateLatestVersion}` : undefined}>
                              {updateLatestVersion ? `v${updateLatestVersion}` : "!"}
                            </span> : null}
                        </span>
                      </button>}
                    {userRole === "admin" && access?.Admin !== false && <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "Admin" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("Admin"))}>
                        <Icon icon="mingcute:settings-6-fill" className={styles.userMenuItemIcon} />
                        {copy.account.admin}
                      </button>}
                    <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "ReportBug" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("ReportBug"))}>
                      <Icon icon="mingcute:bug-fill" className={styles.userMenuItemIcon} />
                      {copy.account.support}
                    </button>
                    <div className={styles.userMenuDivider} role="separator" />
                    <button type="button" role="menuitem" className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`} onClick={() => runUserMenuAction(() => onLogout())}>
                      <Icon icon="mingcute:exit-fill" className={styles.userMenuItemIcon} />
                      {copy.account.logout}
                    </button>
                  </div>, document.body)}
            </div>
            </div>
          </div>
        </motion.nav>}

      {isMobile && showMenu && <div className={styles.overlay} onClick={() => setShowMenu(false)}></div>}

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      <PageGuideTour open={sidebarGuideOpen} steps={sidebarGuide.steps} title={sidebarGuide.tourTitle} locale={locale} onClose={closeSidebarGuide} />
      <GlobalSearchPalette open={searchOpen} onClose={closeSearch} onNavigate={onNavigate || onSelect} access={access} userRole={userRole} />
    </>;
}
