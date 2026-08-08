import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import sidebarStyles from "../Misc/Sidebar/Sidebar.module.css";
import SidebarTooltip from "../Misc/Sidebar/SidebarTooltip";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import { useTheme } from "../../hooks/useTheme";
import { useAppLocale, setUserLocaleOverride } from "../../hooks/useAppGeneralSettings";
import { APP_LOCALES } from "../../i18n/locales";
import portalStyles from "./ClientPortalSidebar.module.css";
const NAV_ITEMS = [{
  to: "/client",
  end: true,
  icon: "mdi:view-dashboard-outline",
  labelKey: "navDashboard"
}, {
  to: "/client/tickets",
  icon: "mdi:ticket-outline",
  labelKey: "navSupport",
  badgeKey: "actionRequired"
}, {
  to: "/client/devices",
  icon: "mdi:devices",
  labelKey: "navDevices"
}, {
  to: "/client/services",
  icon: "mdi:cloud-outline",
  labelKey: "navServices"
}, {
  to: "/client/contract",
  icon: "mdi:file-document-outline",
  labelKey: "navContract"
}, {
  to: "/client/documents",
  icon: "mdi:safe-square-outline",
  labelKey: "navVault"
}];
function PortalNavItem({
  item,
  t,
  showTooltip,
  isCollapsed,
  isMobile,
  badge,
  onNavigate
}) {
  const label = t[item.labelKey];
  const linkClass = ({
    isActive
  }) => `${sidebarStyles.navItem} ${portalStyles.navLink} ${isActive ? `${sidebarStyles.active} ${portalStyles.navLinkActive}` : ""}`.trim();
  const content = <>
      <Icon icon={item.icon} className={sidebarStyles.itemIcon} aria-hidden />
      {(!isCollapsed || isMobile) && <span className={portalStyles.navLabel}>{label}</span>}
      {badge > 0 ? <span className={portalStyles.navBadge}>{badge > 99 ? "99+" : badge}</span> : null}
    </>;
  const closeMobile = () => {
    if (isMobile) onNavigate();
  };
  if (showTooltip) {
    return <li style={{
      listStyle: "none"
    }}>
        <SidebarTooltip as={NavLink} content={label} to={item.to} end={item.end} className={linkClass} onClick={closeMobile}>
          {content}
        </SidebarTooltip>
      </li>;
  }
  return <li style={{
    listStyle: "none"
  }}>
      <NavLink to={item.to} end={item.end} className={linkClass} onClick={closeMobile}>
        {content}
      </NavLink>
    </li>;
}
export default function ClientPortalSidebar({
  copy,
  user,
  clientName,
  actionRequiredCount,
  onLogout
}) {
  const t = copy.layout;
  const location = useLocation();
  const navigate = useNavigate();
  const locale = useAppLocale();
  const {
    theme,
    toggleTheme
  } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuFixedStyle, setUserMenuFixedStyle] = useState(null);
  const [langMenuFixedStyle, setLangMenuFixedStyle] = useState(null);
  const userMenuRef = useRef(null);
  const userMenuDropdownRef = useRef(null);
  const langMenuRef = useRef(null);
  const langMenuDropdownRef = useRef(null);
  const isCollapsed = false;
  const showIconTooltip = false;
  const openMenuToRight = false;
  const isDarkTheme = theme === "dark";
  const themeTooltip = isDarkTheme ? t.themeSwitchLight : t.themeSwitchDark;
  const themeMenuIcon = isDarkTheme ? "mdi:weather-sunny" : "mdi:weather-night";
  const currentLocale = useMemo(() => APP_LOCALES.find(entry => entry.code === locale) ?? APP_LOCALES[0], [locale]);
  const isProfileActive = location.pathname.startsWith("/client/profile");
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 1024);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  const closeLangMenu = useCallback(() => setLangMenuOpen(false), []);
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocMouseDown = e => {
      if (userMenuRef.current?.contains(e.target) || userMenuDropdownRef.current?.contains(e.target)) return;
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
  useEffect(() => {
    if (!langMenuOpen) return;
    const onDocMouseDown = e => {
      if (langMenuRef.current?.contains(e.target) || langMenuDropdownRef.current?.contains(e.target)) return;
      setLangMenuOpen(false);
    };
    const onKeyDown = e => {
      if (e.key === "Escape") setLangMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [langMenuOpen]);
  const updateFloatingMenuPosition = useCallback((open, rootRef, dropdownRef, setStyle) => {
    const root = rootRef.current;
    if (!root || !open) return;
    const rect = root.getBoundingClientRect();
    const gap = 10;
    if (openMenuToRight) {
      const menuEl = dropdownRef.current;
      const menuH = menuEl?.offsetHeight || 300;
      const pad = 8;
      const centerY = rect.top + rect.height / 2;
      const minCenter = pad + menuH / 2;
      const maxCenter = window.innerHeight - pad - menuH / 2;
      const clampedCenter = maxCenter >= minCenter ? Math.max(minCenter, Math.min(maxCenter, centerY)) : window.innerHeight / 2;
      setStyle({
        position: "fixed",
        top: clampedCenter,
        left: rect.right + gap,
        transform: "translateY(-50%)"
      });
    } else {
      const estH = dropdownRef.current?.offsetHeight ?? 280;
      const top = Math.min(rect.top - gap - estH, window.innerHeight - estH - 8);
      setStyle({
        position: "fixed",
        top: Math.max(8, top),
        left: Math.min(rect.left, window.innerWidth - 228),
        transform: "none"
      });
    }
  }, [openMenuToRight]);
  useLayoutEffect(() => {
    if (!userMenuOpen) {
      setUserMenuFixedStyle(null);
      return;
    }
    const update = () => updateFloatingMenuPosition(userMenuOpen, userMenuRef, userMenuDropdownRef, setUserMenuFixedStyle);
    update();
    const id = requestAnimationFrame(update);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [userMenuOpen, updateFloatingMenuPosition, isCollapsed, isMobile]);
  useLayoutEffect(() => {
    if (!langMenuOpen) {
      setLangMenuFixedStyle(null);
      return;
    }
    const update = () => updateFloatingMenuPosition(langMenuOpen, langMenuRef, langMenuDropdownRef, setLangMenuFixedStyle);
    update();
    const id = requestAnimationFrame(update);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [langMenuOpen, updateFloatingMenuPosition, isCollapsed, isMobile]);
  const closeMobileMenu = () => {
    if (isMobile) setShowMenu(false);
  };
  const runUserMenuAction = fn => {
    fn();
    closeUserMenu();
    closeMobileMenu();
  };
  const selectLocale = code => {
    if (code !== locale) setUserLocaleOverride(code);
    closeLangMenu();
    closeMobileMenu();
  };
  const renderPreferencesSection = () => {
    const renderThemeToggleBtn = () => {
      const btn = <button type="button" className={portalStyles.settingsSquareBtn} onClick={toggleTheme} aria-label={themeTooltip}>
          <Icon icon={themeMenuIcon} className={portalStyles.settingsSquareBtnIcon} aria-hidden />
        </button>;
      if (showIconTooltip) {
        return <SidebarTooltip as="span" content={themeTooltip}>
            {btn}
          </SidebarTooltip>;
      }
      return btn;
    };
    const renderLangBtn = () => {
      const btn = <button type="button" className={`${portalStyles.settingsSquareBtn} ${langMenuOpen ? portalStyles.settingsSquareBtnActive : ""}`.trim()} onClick={() => {
        setLangMenuOpen(open => !open);
        closeUserMenu();
      }} aria-expanded={langMenuOpen} aria-haspopup="listbox" aria-label={t.languageAria}>
          <span className={portalStyles.settingsSquareBtnFlag} aria-hidden>
            {currentLocale.flag}
          </span>
        </button>;
      if (showIconTooltip) {
        return <SidebarTooltip as="span" content={t.languageTitle}>
            {btn}
          </SidebarTooltip>;
      }
      return btn;
    };
    return <div className={portalStyles.settingsSection} ref={langMenuRef}>
        <div className={portalStyles.settingsBtnRow} role="group" aria-label={t.themeAria}>
          {renderThemeToggleBtn()}
          {renderLangBtn()}
        </div>
      </div>;
  };
  return <>
      {isMobile ? <button type="button" className={sidebarStyles.burgerButton} onClick={() => setShowMenu(prev => !prev)}>
          ☰
        </button> : null}

      {(showMenu || !isMobile) && <motion.nav className={`${sidebarStyles.sidebar} ${portalStyles.portalSidebar} ${isMobile ? sidebarStyles.mobileSidebar : ""}`.trim()} initial={{
      x: isMobile ? "-100%" : 0,
      opacity: 1
    }} animate={{
      x: 0,
      opacity: 1
    }} exit={{
      x: isMobile ? "-100%" : -50,
      opacity: isMobile ? 1 : 0
    }} transition={{
      duration: 0.4,
      ease: "easeOut"
    }} aria-label={t.navAria}>
          <div className={sidebarStyles.sidebarContent}>
            <div className={sidebarStyles.logoHeader}>
              {showIconTooltip ? <SidebarTooltip as="span" content={t.brandSub} className={sidebarStyles.sidebarTooltipHost}>
                  <NavLink to="/client" end className={sidebarStyles.logoWrapper} onClick={closeMobileMenu}>
                    <div className={sidebarStyles.brandMark}>V</div>
                    {!isCollapsed && <span className={sidebarStyles.logoText}>Veritas</span>}
                  </NavLink>
                </SidebarTooltip> : <NavLink to="/client" end className={sidebarStyles.logoWrapper} onClick={closeMobileMenu}>
                  <div className={sidebarStyles.brandMark}>V</div>
                  {!isCollapsed && <span className={sidebarStyles.logoText}>Veritas</span>}
                </NavLink>}
              {(!isCollapsed || isMobile) && clientName ? <div className={sidebarStyles.userMenuLabelSubtitle} style={{
            textAlign: "center",
            padding: "0 4px"
          }}>
                  {clientName}
                </div> : null}
            </div>

            {isMobile ? <button type="button" className={sidebarStyles.closeButton} onClick={() => setShowMenu(false)}>
                ✖
              </button> : null}

            <hr className={sidebarStyles.separator} />

            <ul className={sidebarStyles.navList}>
              {NAV_ITEMS.map(item => <PortalNavItem key={item.to} item={item} t={t} showTooltip={showIconTooltip} isCollapsed={isCollapsed} isMobile={isMobile} badge={item.badgeKey === "actionRequired" ? actionRequiredCount : 0} onNavigate={closeMobileMenu} />)}
            </ul>

            <div className={portalStyles.navSpacer} aria-hidden />

            {renderPreferencesSection()}

            <div className={sidebarStyles.userSection} ref={userMenuRef}>
              <div className={`${sidebarStyles.userMenuTriggerRow} ${isCollapsed && !isMobile ? sidebarStyles.userMenuTriggerRowCollapsed : ""}`}>
                {showIconTooltip ? <SidebarTooltip as="span" content={t.accountMenu} className={sidebarStyles.userAvatarTooltipHost}>
                    <button type="button" className={`${sidebarStyles.userAvatarButton} ${userMenuOpen ? sidebarStyles.userAvatarButtonOpen : ""} ${isProfileActive ? sidebarStyles.userAvatarButtonActive : ""}`} onClick={() => {
                closeLangMenu();
                setUserMenuOpen(o => !o);
              }} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={t.accountMenuAria}>
                      <UserAvatar user={user} name={user?.username || user?.email} size={32} variant="client" />
                    </button>
                  </SidebarTooltip> : <button type="button" className={`${sidebarStyles.userAvatarButton} ${userMenuOpen ? sidebarStyles.userAvatarButtonOpen : ""} ${isProfileActive ? sidebarStyles.userAvatarButtonActive : ""}`} onClick={() => {
              closeLangMenu();
              setUserMenuOpen(o => !o);
            }} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={t.accountMenuAria}>
                    <UserAvatar user={user} name={user?.username || user?.email} size={32} variant="client" />
                  </button>}
                {!isCollapsed && <button type="button" className={sidebarStyles.userMenuLabelButton} onClick={() => {
              closeLangMenu();
              setUserMenuOpen(o => !o);
            }} aria-expanded={userMenuOpen} aria-haspopup="menu">
                    <span className={sidebarStyles.userMenuLabelTitle}>{t.navProfile}</span>
                    {user?.email ? <span className={sidebarStyles.userMenuLabelSubtitle} title={user.email}>
                        {user.email}
                      </span> : null}
                  </button>}
              </div>

              {userMenuOpen && userMenuFixedStyle && createPortal(<div ref={userMenuDropdownRef} className={sidebarStyles.userMenuDropdown} style={userMenuFixedStyle} role="menu">
                    <div className={sidebarStyles.userMenuDropdownTitle}>{t.accountMenu}</div>
                    <button type="button" role="menuitem" className={`${sidebarStyles.userMenuItem} ${isProfileActive ? sidebarStyles.userMenuItemActive : ""}`} onClick={() => runUserMenuAction(() => navigate("/client/profile"))}>
                      <Icon icon="mdi:account-circle-outline" className={sidebarStyles.userMenuItemIcon} />
                      {t.navProfile}
                    </button>
                    <div className={sidebarStyles.userMenuDivider} role="separator" />
                    <button type="button" role="menuitem" className={`${sidebarStyles.userMenuItem} ${sidebarStyles.userMenuItemDanger}`} onClick={() => runUserMenuAction(onLogout)}>
                      <Icon icon="mingcute:exit-fill" className={sidebarStyles.userMenuItemIcon} />
                      {t.logout}
                    </button>
                  </div>, document.body)}
            </div>
          </div>
        </motion.nav>}

      {langMenuOpen && langMenuFixedStyle && createPortal(<div ref={langMenuDropdownRef} className={portalStyles.langMenuDropdown} style={langMenuFixedStyle} role="listbox" aria-label={t.languageAria}>
            <div className={portalStyles.langMenuDropdownTitle}>{t.languageTitle}</div>
            {APP_LOCALES.map(({
        code,
        flag,
        label
      }) => <button key={code} type="button" role="option" aria-selected={locale === code} className={`${portalStyles.langMenuItem} ${locale === code ? portalStyles.langMenuItemActive : ""}`.trim()} onClick={() => selectLocale(code)}>
                <span className={portalStyles.langFlag} aria-hidden>
                  {flag}
                </span>
                <span>{label}</span>
              </button>)}
          </div>, document.body)}

      {isMobile && showMenu ? <div className={sidebarStyles.overlay} onClick={() => setShowMenu(false)} aria-hidden /> : null}
    </>;
}
