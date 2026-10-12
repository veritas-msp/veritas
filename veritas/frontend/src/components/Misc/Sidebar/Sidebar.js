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
import { SIDEBAR_FLYOUT_GAP_PX } from "../../../utils/sidebarFlyoutPosition";
import PageGuideTour from "../../PageGuide/PageGuideTour";
import { buildSidebarGuideSteps } from "../../PageGuide/sidebarGuideI18n";
import { useSidebarGuide } from "../../../hooks/useSidebarGuide";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { hasRegisteredPageGuide, openRegisteredPageGuide, subscribePageGuideRegistry } from "../../PageGuide/pageGuideRegistry";
import GlobalSearchPalette, { getSearchShortcutLabel, useGlobalSearchHotkey } from "../GlobalSearch/GlobalSearchPalette";
import { usePermissions } from "../../../contexts/PermissionsContext";
import { useAuthContext } from "../../../contexts/AuthContext";
import { switchActiveProfile } from "../../../api/users";
import { toast } from "react-toastify";
import { canAccessAdminPanel } from "../../../utils/adminPanelPermissions";
import {
  applySidebarRailCollapsedPreference,
  readStoredSidebarRailCollapsed,
  SIDEBAR_RAIL_COLLAPSED_EVENT
} from "../../../utils/sidebarLayoutPreferences";
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
  assignedProfiles = [],
  drafts,
  access,
  onCollapseChange,
  /** When false, defer auto "Bienvenue" menu tour until premiers pas are done. */
  sidebarGuideAutoStart = true,
  /** "vertical" (rail) | "horizontal" (top bar). Mobile always uses the drawer. */
  layout = "vertical"
}) {
  const { isMobile } = useBreakpoint();
  const isHorizontalDesktop = !isMobile && layout === "horizontal";
  const {
    canAny,
    isAdmin,
    refresh: refreshPermissions
  } = usePermissions();
  const {
    refreshSession,
    patchUser
  } = useAuthContext() || {};
  const showAdminMenu = canAccessAdminPanel(canAny, isAdmin);
  const [showMenu, setShowMenu] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuFixedStyle, setUserMenuFixedStyle] = useState(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuFixedStyle, setMoreMenuFixedStyle] = useState(null);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [profilesMenuOpen, setProfilesMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const userMenuTriggerRef = useRef(null);
  const userMenuDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreMenuTriggerRef = useRef(null);
  const moreMenuDropdownRef = useRef(null);
  const closeUserMenu = useCallback(() => {
    setUserMenuOpen(false);
    setProfilesMenuOpen(false);
  }, []);
  const closeMoreMenu = useCallback(() => {
    setMoreMenuOpen(false);
  }, []);
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
  // Desktop vertical : rail icônes ou sidebar étendue avec libellés (préférence persistée).
  // Barre horizontale : icônes + tooltips. Mobile : drawer (libellés masqués en CSS).
  const [railCollapsed, setRailCollapsed] = useState(() => readStoredSidebarRailCollapsed());
  useEffect(() => {
    const onPrefChange = event => {
      if (typeof event?.detail?.collapsed === "boolean") {
        setRailCollapsed(event.detail.collapsed);
      } else {
        setRailCollapsed(readStoredSidebarRailCollapsed());
      }
    };
    window.addEventListener(SIDEBAR_RAIL_COLLAPSED_EVENT, onPrefChange);
    return () => window.removeEventListener(SIDEBAR_RAIL_COLLAPSED_EVENT, onPrefChange);
  }, []);
  const toggleRailCollapsed = useCallback(() => {
    // Disparition instantanée avant le changement de largeur (évite le saut visuel).
    setFooterIconsReady(false);
    setRailCollapsed(prev => applySidebarRailCollapsedPreference(!prev));
  }, []);
  const isCollapsed = isMobile ? false : isHorizontalDesktop ? true : railCollapsed;
  const showRailToggle = !isMobile && !isHorizontalDesktop;
  const [footerIconsReady, setFooterIconsReady] = useState(true);
  const prevRailCollapsedRef = useRef(isCollapsed);
  useLayoutEffect(() => {
    if (isMobile || isHorizontalDesktop) {
      setFooterIconsReady(true);
      prevRailCollapsedRef.current = isCollapsed;
      return undefined;
    }
    if (prevRailCollapsedRef.current === isCollapsed) return undefined;
    prevRailCollapsedRef.current = isCollapsed;
    // Masquer avant paint pendant l’animation de largeur, puis fade-in.
    setFooterIconsReady(false);
    const showTimer = window.setTimeout(() => setFooterIconsReady(true), 320);
    return () => window.clearTimeout(showTimer);
  }, [isCollapsed, isMobile, isHorizontalDesktop]);
  useEffect(() => {
    if (!onCollapseChange) return;
    if (isHorizontalDesktop) {
      onCollapseChange(false);
      return;
    }
    onCollapseChange(isCollapsed);
  }, [onCollapseChange, isHorizontalDesktop, isCollapsed]);
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
      closeUserMenu();
    };
    const onKeyDown = e => {
      if (e.key === "Escape") closeUserMenu();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen, closeUserMenu]);
  useEffect(() => {
    if (!moreMenuOpen) return;
    const onDocMouseDown = e => {
      if (moreMenuRef.current?.contains(e.target) || moreMenuDropdownRef.current?.contains(e.target)) {
        return;
      }
      closeMoreMenu();
    };
    const onKeyDown = e => {
      if (e.key === "Escape") closeMoreMenu();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreMenuOpen, closeMoreMenu]);
  const showIconTooltip = isCollapsed || isMobile || isHorizontalDesktop;
  /* Libellés toujours montés en vertical : révélés par clip pendant l’animation de largeur */
  const showSidebarLabels = !isHorizontalDesktop;
  const userInitials = getUserInitials(user);
  const profileLabel = normalizeProfileLabel(profile);
  const switchableProfiles = useMemo(() => {
    const list = Array.isArray(assignedProfiles)
      ? assignedProfiles.map(p => String(p || "").trim()).filter(Boolean)
      : [];
    const active = normalizeProfileLabel(profile);
    if (active && !list.includes(active)) list.unshift(active);
    return [...new Set(list)];
  }, [assignedProfiles, profile]);
  const handleSwitchProfile = useCallback(async nextProfile => {
    const name = String(nextProfile || "").trim();
    if (!name || name === normalizeProfileLabel(profile) || switchingProfile) return;
    setSwitchingProfile(true);
    try {
      const data = await switchActiveProfile(name);
      if (typeof patchUser === "function") {
        patchUser({
          profile: data.profile || name
        });
      }
      if (typeof refreshSession === "function") {
        await refreshSession();
      }
      window.refreshProfile?.();
      window.dispatchEvent(new Event("refreshProfileAccess"));
      if (typeof refreshPermissions === "function") {
        await refreshPermissions();
      }
      closeUserMenu();
    } catch (err) {
      toast.error(err?.message || copy.account.profileSwitchError);
    } finally {
      setSwitchingProfile(false);
    }
  }, [profile, switchingProfile, patchUser, refreshSession, refreshPermissions, closeUserMenu, copy.account.profileSwitchError]);
  const openUserMenuToRight = !isMobile && !isHorizontalDesktop;
  const showCrmSection = !!(access["Contrat"] || access["Contact"] || access["Prestataire"]);
  const showExploitationSection = !!(access["Ticket"] || access["TicketSales"] || access["Planning"]);
  const showManagedSection = !!(access["Hardware"] || access["Campaigns"] || access["EquipmentInventory"] || access["Cybersecurite"] || access["Service"]);
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
  const moreAria = copy.more?.aria || "Recherche et aide";
  const moreTooltip = copy.more?.tooltip || "Plus";
  const updateMoreMenuPosition = useCallback(() => {
    const trigger = moreMenuTriggerRef.current;
    if (!trigger || !moreMenuOpen) return;
    const rect = trigger.getBoundingClientRect();
    const gap = SIDEBAR_FLYOUT_GAP_PX;
    const menuEl = moreMenuDropdownRef.current;
    const menuH = menuEl?.offsetHeight || 120;
    const menuW = menuEl?.offsetWidth || 220;
    const pad = 8;
    if (openUserMenuToRight) {
      let top = rect.top;
      top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));
      let left = Math.round(rect.right + gap);
      left = Math.min(left, window.innerWidth - menuW - pad);
      left = Math.max(pad, left);
      setMoreMenuFixedStyle({
        position: "fixed",
        top,
        left,
        transform: "none"
      });
    } else if (isHorizontalDesktop) {
      setMoreMenuFixedStyle({
        position: "fixed",
        top: rect.bottom + gap,
        left: Math.min(Math.max(pad, rect.right - menuW), window.innerWidth - menuW - pad),
        transform: "none"
      });
    } else {
      const top = Math.min(rect.top - gap - menuH, window.innerHeight - menuH - pad);
      setMoreMenuFixedStyle({
        position: "fixed",
        top: Math.max(pad, top),
        left: Math.min(rect.left, window.innerWidth - menuW - pad),
        transform: "none"
      });
    }
  }, [moreMenuOpen, openUserMenuToRight, isHorizontalDesktop]);
  useLayoutEffect(() => {
    if (!moreMenuOpen) {
      setMoreMenuFixedStyle(null);
      return;
    }
    updateMoreMenuPosition();
    const id = requestAnimationFrame(() => updateMoreMenuPosition());
    const onResize = () => updateMoreMenuPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [moreMenuOpen, updateMoreMenuPosition, isCollapsed, isMobile, isHorizontalDesktop]);
  const updateUserMenuPosition = useCallback(() => {
    const row = userMenuTriggerRef.current || userMenuRef.current;
    if (!row || !userMenuOpen) return;
    // Ancrer sur l'avatar (pas la rangée pleine largeur), pour coller au bouton.
    const avatarBtn = row.querySelector?.("button");
    const trigger = avatarBtn || row;
    const rect = trigger.getBoundingClientRect();
    const gap = SIDEBAR_FLYOUT_GAP_PX;
    if (openUserMenuToRight) {
      const menuEl = userMenuDropdownRef.current;
      const menuH = menuEl?.offsetHeight || 300;
      const menuW = menuEl?.offsetWidth || 220;
      const pad = 8;
      let top = rect.bottom - menuH;
      top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));
      let left = Math.round(rect.right + gap);
      left = Math.min(left, window.innerWidth - menuW - pad);
      left = Math.max(pad, left);
      setUserMenuFixedStyle({
        position: "fixed",
        top,
        left,
        transform: "none"
      });
    } else if (isHorizontalDesktop) {
      const menuEl = userMenuDropdownRef.current;
      const menuW = menuEl?.offsetWidth || 220;
      setUserMenuFixedStyle({
        position: "fixed",
        top: rect.bottom + gap,
        left: Math.min(Math.max(8, rect.right - menuW), window.innerWidth - menuW - 8),
        transform: "none"
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
  }, [userMenuOpen, openUserMenuToRight, isHorizontalDesktop]);
  useLayoutEffect(() => {
    if (!userMenuOpen) {
      setUserMenuFixedStyle(null);
      setProfilesMenuOpen(false);
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
  }, [userMenuOpen, updateUserMenuPosition, isCollapsed, isMobile, isHorizontalDesktop]);
  useLayoutEffect(() => {
    if (!userMenuOpen || !profilesMenuOpen) return;
    updateUserMenuPosition();
  }, [profilesMenuOpen, userMenuOpen, updateUserMenuPosition]);
  const runUserMenuAction = fn => {
    fn();
    closeUserMenu();
    if (isMobile) setShowMenu(false);
  };
  const runMoreMenuAction = fn => {
    fn();
    closeMoreMenu();
    if (isMobile) setShowMenu(false);
  };
  const toggleMoreMenu = () => {
    setMoreMenuOpen(open => {
      if (!open) closeUserMenu();
      return !open;
    });
  };
  const toggleUserMenu = () => {
    setUserMenuOpen(open => {
      if (!open) closeMoreMenu();
      return !open;
    });
  };
  const openModulesPromo = () => {
    setProPromoFeature("sidebarModules");
    if (isMobile) setShowMenu(false);
  };
  const sidebarClassName = [
    styles.sidebar,
    isMobile ? styles.mobileSidebar : isHorizontalDesktop ? styles.sidebarHorizontal : isCollapsed ? styles.sidebarCollapsed : "",
    isHorizontalDesktop ? styles.sidebarTop : ""
  ].filter(Boolean).join(" ");
  const collapseToggleLabel = isCollapsed
    ? copy.chrome?.expandSidebar || "Afficher les noms"
    : copy.chrome?.collapseSidebar || "Réduire le menu";
  return <>
      {}
      {isMobile && !showMenu && <button type="button" className={styles.burgerButton} onClick={() => setShowMenu(true)} aria-expanded={false} aria-label={copy.chrome?.openMenu || "Ouvrir le menu"}>
          ☰
        </button>}

      {}
      {(showMenu || !isMobile) && <motion.nav
        className={sidebarClassName}
        data-sidebar-rail="1"
        data-sidebar-guide="sidebar-root"
        initial={{
      x: isMobile ? '-100%' : 0,
      y: isHorizontalDesktop ? -12 : 0,
      opacity: isHorizontalDesktop ? 0.96 : 1
    }} animate={{
      x: 0,
      y: 0,
      opacity: 1
    }} exit={{
      x: isMobile ? '-100%' : isHorizontalDesktop ? 0 : -50,
      y: isHorizontalDesktop ? -8 : 0,
      opacity: isMobile ? 1 : 0
    }} transition={{
      duration: 0.35,
      ease: "easeOut"
    }}>
          <div className={styles.sidebarContent}>
            <div className={styles.logoHeader} data-sidebar-guide="brand">
              <div className={`${styles.logoHeaderRow} ${isCollapsed ? styles.logoHeaderRowCollapsed : ""}`}>
                {showIconTooltip ? <SidebarTooltip as="span" content={copy.home} className={styles.sidebarTooltipHost}>
                    <div className={styles.logoWrapper} onClick={() => {
                  onSelect("Home");
                  if (isMobile) setShowMenu(false);
                }}>
                      <div className={styles.brandMark}>V</div>
                      {showSidebarLabels ? <span className={styles.logoText}>Veritas</span> : null}
                    </div>
                  </SidebarTooltip> : <div className={styles.logoWrapper} onClick={() => {
                  onSelect("Home");
                  if (isMobile) setShowMenu(false);
                }}>
                    <div className={styles.brandMark}>V</div>
                    {showSidebarLabels ? <span className={styles.logoText}>Veritas</span> : null}
                  </div>}
              </div>
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
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-crm">
                    <AnimatePresence initial={false} mode="popLayout">
                      {!!access["Contrat"] && <SidebarAccessNavItem key="Contrat" itemKey="Contrat" showTooltip={showIconTooltip} tooltip={copy.nav.enterprises} className={`${styles.navItem} ${current === "Contrat" || current === "ContratDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Contrat");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:building-1-fill" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.enterprises : null} />}
                      {!!access["Contact"] && <SidebarAccessNavItem key="Contact" itemKey="Contact" showTooltip={showIconTooltip} tooltip={copy.nav.contact} className={`${styles.navItem} ${current === "Contact" || current === "ContactDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Contact");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:contacts-3-fill" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.contact : null} />}
                      {!!access["Prestataire"] && <SidebarAccessNavItem key="Prestataire" itemKey="Prestataire" showTooltip={showIconTooltip} tooltip={copy.nav.prestataire} className={`${styles.navItem} ${current === "Prestataire" || current === "PrestataireDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Prestataire");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:handshake-outline" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.prestataire : null} />}
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
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-exploitation">
                    <AnimatePresence initial={false} mode="popLayout">
                      {!!access["Ticket"] && <SidebarAccessNavItem key="Ticket" itemKey="Ticket" showTooltip={showIconTooltip} tooltip={copy.nav.support} className={`${styles.navItem} ${current === "Ticket" || current === "TicketCreate" ? styles.active : ""}`} onClick={() => {
                    onSelect("Ticket");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:message-processing-outline" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.support : null} />}
                      {!!access["TicketSales"] && <SidebarAccessNavItem key="TicketSales" itemKey="TicketSales" showTooltip={showIconTooltip} tooltip={copy.nav.sales} className={`${styles.navItem} ${current === "TicketSales" || current === "TicketSalesCreate" || current === "TicketSalesDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("TicketSales");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:briefcase-outline" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.sales : null} />}
                      {!!access["Planning"] && <SidebarAccessNavItem key="Planning" itemKey="Planning" showTooltip={showIconTooltip} tooltip={copy.nav.planning} className={`${styles.navItem} ${current === "Planning" ? styles.active : ""}`} onClick={() => {
                    onSelect("Planning");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:calendar-time-add-fill" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.planning : null} />}
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
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-managed">
                    <AnimatePresence initial={false} mode="popLayout">
                      {!!access["Hardware"] && <SidebarAccessNavItem key="Hardware" itemKey="Hardware" showTooltip={showIconTooltip} tooltip={copy.nav.supervision} className={`${styles.navItem} ${current === "Hardware" || current === "Equipment" ? styles.active : ""}`} onClick={() => {
                    onSelect("Hardware");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:radar" className={`${styles.itemIcon} ${styles.itemIconInfra}`} />} label={showSidebarLabels ? copy.nav.supervision : null} />}
                      {!!access["Campaigns"] && <SidebarAccessNavItem key="Campaigns" itemKey="Campaigns" showTooltip={showIconTooltip} tooltip={copy.nav.campaigns} className={`${styles.navItem} ${current === "Campaigns" || current === "CampaignDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Campaigns");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:bullhorn-outline" className={`${styles.itemIcon} ${styles.itemIconCyber}`} />} label={showSidebarLabels ? copy.nav.campaigns : null} />}
                      {!!access["EquipmentInventory"] && <SidebarAccessNavItem key="EquipmentInventory" itemKey="EquipmentInventory" showTooltip={showIconTooltip} tooltip={copy.nav.inventory} className={`${styles.navItem} ${current === "EquipmentInventory" ? styles.active : ""}`} onClick={() => {
                    onSelect("EquipmentInventory");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:devices" className={`${styles.itemIcon} ${styles.itemIconInventory}`} />} label={showSidebarLabels ? copy.nav.inventory : null} />}
                      {!!access["Cybersecurite"] && <SidebarAccessNavItem key="Cybersecurite" itemKey="Cybersecurite" showTooltip={showIconTooltip} tooltip={copy.nav.cyber} className={`${styles.navItem} ${current === "Cybersecurite" || current === "AntivirusDetail" || current === "AntispamDetail" || current === "InstanceDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Cybersecurite");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:shield-lock" className={`${styles.itemIcon} ${styles.itemIconCyber}`} />} label={showSidebarLabels ? copy.nav.cyber : null} />}
                      {!!access["Service"] && <SidebarAccessNavItem key="Service" itemKey="Service" showTooltip={showIconTooltip} tooltip={copy.nav.cloud} className={`${styles.navItem} ${current === "Service" || current === "TenantDetail" ? styles.active : ""}`} onClick={() => {
                    onSelect("Service");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:cloud-outline" className={`${styles.itemIcon} ${styles.itemIconService}`} />} label={showSidebarLabels ? copy.nav.cloud : null} />}
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
                  <ul className={styles.navList}>
                    <LayoutGroup id="sidebar-pilotage-access">
                    <AnimatePresence initial={false} mode="popLayout">
                    {!!access["Dashboard"] && <SidebarAccessNavItem key="Dashboard" itemKey="Dashboard" showTooltip={showIconTooltip} tooltip={copy.nav.dashboard} className={`${styles.navItem} ${current === "Dashboard" ? styles.active : ""}`} onClick={() => {
                    onSelect("Dashboard");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:chart-box-outline" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.dashboard : null} />}
                    {!!access["KnowledgeBase"] && <SidebarAccessNavItem key="KnowledgeBase" itemKey="KnowledgeBase" showTooltip={showIconTooltip} tooltip={copy.nav.knowledgeBase} className={`${styles.navItem} ${current === "KnowledgeBase" ? styles.active : ""}`} onClick={() => {
                    onSelect("KnowledgeBase");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mdi:book-open-page-variant-outline" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.knowledgeBase : null} />}
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
                    }} icon={iconName ? <Icon icon={iconName} className={styles.itemIcon} /> : null} label={showSidebarLabels ? <span className={styles.labelWithDot}>
                                <span>{localizeDocumentLabel(doc.key, doc.label, locale)}</span>
                                {drafts?.[doc.key] && <span className={styles.draftDot}>⬤</span>}
                              </span> : drafts?.[doc.key] ? <span className={styles.draftDot}>⬤</span> : null} />;
                  })}

                      {!!access["Mon"] && !isCommunity && <SidebarAccessNavItem key="Report" itemKey="Report" showTooltip={showIconTooltip} tooltip={copy.nav.reports} className={`${styles.navItem} ${current === "Report" ? styles.active : ""}`} onClick={() => {
                    onSelect("Report");
                    if (isMobile) setShowMenu(false);
                  }} icon={<Icon icon="mingcute:report-forms-fill" className={styles.itemIcon} />} label={showSidebarLabels ? copy.nav.reports : null} />}
                    </AnimatePresence>
                    </LayoutGroup>
                  </ul>
                </motion.div>}
            </AnimatePresence>
            <SectionDivider show={showPilotageSection && (isCommunity || !isHorizontalDesktop)} isCollapsed={isCollapsed} />

            {isCommunity ? <div className={styles.upgradeSection}>
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

            {showRailToggle ? (
              <div className={styles.railCollapseSlot}>
                {showIconTooltip ? (
                  <SidebarTooltip
                    as="button"
                    type="button"
                    content={collapseToggleLabel}
                    className={styles.railCollapseToggle}
                    onClick={toggleRailCollapsed}
                    aria-label={collapseToggleLabel}
                    aria-expanded={!isCollapsed}
                  >
                    <Icon
                      icon={isCollapsed ? "mdi:chevron-double-right" : "mdi:chevron-double-left"}
                      className={styles.railCollapseChevron}
                      aria-hidden
                    />
                  </SidebarTooltip>
                ) : (
                  <button
                    type="button"
                    className={styles.railCollapseToggle}
                    onClick={toggleRailCollapsed}
                    aria-label={collapseToggleLabel}
                    aria-expanded={!isCollapsed}
                    title={collapseToggleLabel}
                  >
                    <Icon
                      icon={isCollapsed ? "mdi:chevron-double-right" : "mdi:chevron-double-left"}
                      className={styles.railCollapseChevron}
                      aria-hidden
                    />
                  </button>
                )}
              </div>
            ) : null}

            <div
              className={`${styles.sidebarFooter} ${footerIconsReady ? styles.sidebarFooterReady : styles.sidebarFooterHidden}`.trim()}
            >
            <div className={styles.utilitiesSection} data-sidebar-guide="utilities">
              <div className={styles.utilitiesBtnRow}>
                <div className={styles.moreMenuHost} ref={moreMenuRef}>
                  {showIconTooltip ? (
                    <SidebarTooltip as="span" content={moreTooltip} className={styles.moreMenuTooltipHost}>
                      <button
                        type="button"
                        ref={moreMenuTriggerRef}
                        className={`${styles.squareBtn} ${moreMenuOpen || searchOpen || sidebarGuideOpen ? styles.squareBtnActive : ""}`}
                        onClick={toggleMoreMenu}
                        aria-expanded={moreMenuOpen}
                        aria-haspopup="menu"
                        aria-label={moreAria}
                      >
                        <Icon icon="mdi:dots-horizontal" className={styles.squareBtnIcon} aria-hidden />
                      </button>
                    </SidebarTooltip>
                  ) : (
                    <button
                      type="button"
                      ref={moreMenuTriggerRef}
                      className={`${styles.squareBtn} ${moreMenuOpen || searchOpen || sidebarGuideOpen ? styles.squareBtnActive : ""}`}
                      onClick={toggleMoreMenu}
                      aria-expanded={moreMenuOpen}
                      aria-haspopup="menu"
                      aria-label={moreAria}
                    >
                      <Icon icon="mdi:dots-horizontal" className={styles.squareBtnIcon} aria-hidden />
                    </button>
                  )}
                  {moreMenuOpen && moreMenuFixedStyle && createPortal(<div ref={moreMenuDropdownRef} className={styles.userMenuDropdown} style={moreMenuFixedStyle} role="menu" aria-label={copy.more?.menu || moreTooltip}>
                    <div className={styles.userMenuDropdownTitle}>
                      {copy.more?.menu || moreTooltip}
                    </div>
                    <button type="button" role="menuitem" className={styles.userMenuItem} aria-label={searchAria} onClick={() => runMoreMenuAction(() => setSearchOpen(true))}>
                      <Icon icon="mdi:magnify" className={styles.userMenuItemIcon} />
                      {searchTooltip}
                    </button>
                    <button type="button" role="menuitem" className={styles.userMenuItem} aria-label={helpAria} onClick={() => runMoreMenuAction(startHelp)}>
                      <Icon icon="mdi:help-circle-outline" className={styles.userMenuItemIcon} />
                      {helpAria}
                    </button>
                  </div>, document.body)}
                </div>

                <NotificationBell onNavigate={onNavigate || onSelect} isCollapsed={isCollapsed} isMobile={isMobile} isHorizontal={isHorizontalDesktop} showIconTooltip={showIconTooltip} TooltipComponent={SidebarTooltip} triggerClassName={styles.squareBtn} triggerIconClassName={styles.squareBtnIcon} rootClassName={styles.notificationBellRoot} />

                <div className={styles.userSection} ref={userMenuRef} data-sidebar-guide="account">
                  <div
                    ref={userMenuTriggerRef}
                    className={`${styles.userMenuTriggerRow} ${isCollapsed ? styles.userMenuTriggerRowCollapsed : ""}`}
                  >
                    {showIconTooltip ? <SidebarTooltip as="span" content={copy.account.menu} className={styles.userAvatarTooltipHost}>
                        <button type="button" className={`${styles.userAvatarButton} ${userMenuOpen ? styles.userAvatarButtonOpen : ""} ${["MyDocs", "ReportBug", "Admin", "User", "PatchNotes"].includes(current) ? styles.userAvatarButtonActive : ""}`} onClick={toggleUserMenu} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={copy.account.menuAria}>
                          {user ? <UserAvatar user={user} name={user.username || user.email} size={34} variant="agent" /> : userInitials}
                        </button>
                      </SidebarTooltip> : <button type="button" className={`${styles.userAvatarButton} ${userMenuOpen ? styles.userAvatarButtonOpen : ""} ${["MyDocs", "ReportBug", "Admin", "User", "PatchNotes"].includes(current) ? styles.userAvatarButtonActive : ""}`} onClick={toggleUserMenu} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={copy.account.menuAria}>
                        {user ? <UserAvatar user={user} name={user.username || user.email} size={34} variant="agent" /> : userInitials}
                      </button>}
                    {isMobile ? (
                      <button type="button" className={styles.userMenuLabelButton} onClick={toggleUserMenu} aria-expanded={userMenuOpen} aria-haspopup="menu">
                        <span className={styles.userMenuLabelTitle}>{getRoleLabel(userRole, locale)}</span>
                        {profileLabel ? <span className={styles.userMenuLabelSubtitle} title={profileLabel}>
                            {profileLabel}
                          </span> : null}
                      </button>
                    ) : null}
                  </div>

                  {userMenuOpen && userMenuFixedStyle && createPortal(<div ref={userMenuDropdownRef} className={styles.userMenuDropdown} style={userMenuFixedStyle} role="menu" aria-labelledby="sidebar-user-menu-title">
                    <div className={styles.userMenuDropdownTitle} id="sidebar-user-menu-title">
                      {copy.account.menu}
                    </div>

                    <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "User" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("User"))}>
                      <Icon icon="mingcute:contacts-4-fill" className={styles.userMenuItemIcon} />
                      {copy.account.myAccount}
                    </button>
                    {showAdminMenu ? (
                      <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "Admin" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("Admin"))}>
                        <Icon icon="mingcute:settings-6-fill" className={styles.userMenuItemIcon} />
                        {copy.account.admin}
                      </button>
                    ) : null}
                    {switchableProfiles.length > 1 ? <>
                        <button
                          type="button"
                          role="menuitem"
                          aria-expanded={profilesMenuOpen}
                          aria-haspopup="menu"
                          className={`${styles.userMenuItem} ${styles.userMenuSubmenuTrigger} ${profilesMenuOpen ? styles.userMenuSubmenuTriggerOpen : ""}`}
                          onClick={() => setProfilesMenuOpen(open => !open)}
                        >
                          <Icon icon="mdi:account-badge-outline" className={styles.userMenuItemIcon} />
                          <span className={styles.userMenuItemLabelStack}>
                            <span className={styles.userMenuItemLabel}>{copy.account.profilesSection}</span>
                            {profileLabel ? <span className={styles.userMenuItemMeta}>{profileLabel}</span> : null}
                          </span>
                          <Icon
                            icon={profilesMenuOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
                            className={styles.userMenuChevron}
                            aria-hidden
                          />
                        </button>
                        {profilesMenuOpen ? <div className={styles.userMenuSubmenu} role="group" aria-label={copy.account.profilesSection}>
                            {switchableProfiles.map(name => {
                      const isActive = name === profileLabel;
                      const switchLabel = String(copy.account.switchProfile || "{profile}").replace("{profile}", name);
                      return <button
                        key={name}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        disabled={switchingProfile || isActive}
                        className={`${styles.userMenuItem} ${styles.userMenuSubmenuItem} ${isActive ? styles.userMenuItemActive : ""}`}
                        title={switchLabel}
                        onClick={() => {
                          if (!isActive) handleSwitchProfile(name);
                        }}
                      >
                          <Icon
                            icon={isActive ? "mdi:check-circle" : "mdi:account-outline"}
                            className={styles.userMenuItemIcon}
                          />
                          <span className={styles.userMenuItemLabel}>{name}</span>
                        </button>;
                    })}
                          </div> : null}
                      </> : null}

                    <div className={styles.userMenuDivider} role="separator" />

                    <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "PatchNotes" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("PatchNotes"))}>
                      <Icon icon="mdi:notebook-outline" className={styles.userMenuItemIcon} />
                      {copy.account.patchNotes}
                    </button>
                    <button type="button" role="menuitem" className={`${styles.userMenuItem} ${current === "ReportBug" ? styles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => onSelect("ReportBug"))}>
                      <Icon icon="mingcute:bug-fill" className={styles.userMenuItemIcon} />
                      {copy.account.support}
                    </button>

                    <div className={styles.userMenuDivider} role="separator" />

                    <button type="button" role="menuitem" className={styles.userMenuItem} onClick={() => toggleTheme()} aria-label={themeTooltip}>
                      <Icon icon={themeMenuIcon} className={styles.userMenuItemIcon} />
                      {themeTooltip}
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
            </div>
          </div>
        </motion.nav>}

      {isMobile && showMenu && <div className={styles.overlay} onClick={() => setShowMenu(false)}></div>}

      <ProFeaturePromoModal open={Boolean(proPromoFeature)} featureKey={proPromoFeature} onClose={() => setProPromoFeature(null)} />

      <PageGuideTour open={sidebarGuideOpen} steps={sidebarGuide.steps} title={sidebarGuide.tourTitle} locale={locale} onClose={closeSidebarGuide} />
      <GlobalSearchPalette open={searchOpen} onClose={closeSearch} onNavigate={onNavigate || onSelect} access={access} userRole={userRole} />
    </>;
}
