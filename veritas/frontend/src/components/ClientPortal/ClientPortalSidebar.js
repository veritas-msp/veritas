import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import sidebarStyles from "../Misc/Sidebar/Sidebar.module.css";
import SidebarTooltip from "../Misc/Sidebar/SidebarTooltip";
import {
  BookTextIcon,
  ChartColumnIncreasingIcon,
  CircleHelpIcon,
  CloudIcon,
  FileTextIcon,
  LaptopMinimalCheckIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  TicketIcon,
  VaultIcon
} from "../Misc/Sidebar/lucideAnimated";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import PageGuideTour from "../PageGuide/PageGuideTour";
import { buildClientPortalGuideSteps } from "../PageGuide/clientPortalGuideI18n";
import { useTheme } from "../../hooks/useTheme";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useSidebarGuide } from "../../hooks/useSidebarGuide";
import { useAppLocale, setUserLocaleOverride } from "../../hooks/useAppGeneralSettings";
import { APP_LOCALES } from "../../i18n/locales";
import portalStyles from "./ClientPortalSidebar.module.css";

const PORTAL_RAIL_COLLAPSED_KEY = "veritas_portal_sidebar_rail_collapsed";
const PORTAL_RAIL_COLLAPSED_EVENT = "veritas-portal-sidebar-rail-collapsed-change";

function readPortalRailCollapsed() {
  try {
    const raw = localStorage.getItem(PORTAL_RAIL_COLLAPSED_KEY);
    if (raw == null) return false;
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function applyPortalRailCollapsed(collapsed) {
  const next = Boolean(collapsed);
  try {
    localStorage.setItem(PORTAL_RAIL_COLLAPSED_KEY, next ? "1" : "0");
  } catch {}
  window.dispatchEvent(
    new CustomEvent(PORTAL_RAIL_COLLAPSED_EVENT, {
      detail: { collapsed: next }
    })
  );
  return next;
}

const NAV_ITEMS = [
  {
    to: "/client",
    end: true,
    Icon: ChartColumnIncreasingIcon,
    labelKey: "navDashboard"
  },
  {
    to: "/client/tickets",
    Icon: TicketIcon,
    labelKey: "navSupport",
    badgeKey: "actionRequired"
  },
  {
    to: "/client/devices",
    Icon: LaptopMinimalCheckIcon,
    labelKey: "navDevices"
  },
  {
    to: "/client/services",
    Icon: CloudIcon,
    labelKey: "navServices"
  },
  {
    to: "/client/cybersecurity",
    Icon: ShieldCheckIcon,
    labelKey: "navCybersecurity"
  },
  {
    to: "/client/contract",
    Icon: FileTextIcon,
    labelKey: "navContract"
  },
  {
    to: "/client/knowledge-base",
    Icon: BookTextIcon,
    labelKey: "navKnowledgeBase"
  },
  {
    to: "/client/documents",
    Icon: VaultIcon,
    labelKey: "navVault"
  }
];

function PortalNavItem({ item, t, showTooltip, isCollapsed, isMobile, badge, onNavigate }) {
  const iconRef = useRef(null);
  const label = t[item.labelKey];
  const AnimatedIcon = item.Icon;
  const linkClass = ({ isActive }) =>
    `${sidebarStyles.navItem} ${portalStyles.navLink} ${
      isActive ? `${sidebarStyles.active} ${portalStyles.navLinkActive}` : ""
    }`.trim();
  const content = (
    <>
      <span className={sidebarStyles.accessNavIcon}>
        <AnimatedIcon ref={iconRef} className={sidebarStyles.itemIcon} size={22} />
      </span>
      {(!isCollapsed || isMobile) && <span className={portalStyles.navLabel}>{label}</span>}
      {badge > 0 ? <span className={portalStyles.navBadge}>{badge > 99 ? "99+" : badge}</span> : null}
    </>
  );
  const closeMobile = () => {
    if (isMobile) onNavigate();
  };
  const hoverProps = {
    onMouseEnter: () => iconRef.current?.startAnimation?.(),
    onMouseLeave: () => iconRef.current?.stopAnimation?.()
  };
  if (showTooltip) {
    return (
      <li style={{ listStyle: "none" }}>
        <SidebarTooltip
          as={NavLink}
          content={label}
          to={item.to}
          end={item.end}
          className={linkClass}
          onClick={closeMobile}
          {...hoverProps}
        >
          {content}
        </SidebarTooltip>
      </li>
    );
  }
  return (
    <li style={{ listStyle: "none" }}>
      <NavLink to={item.to} end={item.end} className={linkClass} onClick={closeMobile} {...hoverProps}>
        {content}
      </NavLink>
    </li>
  );
}

export default function ClientPortalSidebar({
  copy,
  user,
  clientName,
  companies = [],
  activeClientId,
  sites = [],
  siteFilter = null,
  onSwitchSite,
  switching = false,
  onSwitchCompany,
  actionRequiredCount,
  onLogout,
  onCollapseChange
}) {
  const t = copy.layout;
  const location = useLocation();
  const navigate = useNavigate();
  const locale = useAppLocale();
  const {
    theme,
    toggleTheme
  } = useTheme();
  const { isMobile } = useBreakpoint();
  const {
    open: portalGuideOpen,
    close: closePortalGuide,
    start: startPortalGuide
  } = useSidebarGuide(user?.id, {
    scope: "portal"
  });
  const showContextGuide = companies.length > 0 || Boolean(clientName) || sites.length > 0;
  const portalGuide = useMemo(
    () => buildClientPortalGuideSteps({
      locale,
      showContext: showContextGuide
    }),
    [locale, showContextGuide]
  );
  const [showMenu, setShowMenu] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuFixedStyle, setUserMenuFixedStyle] = useState(null);
  const [langMenuFixedStyle, setLangMenuFixedStyle] = useState(null);
  const userMenuRef = useRef(null);
  const userMenuDropdownRef = useRef(null);
  const langMenuRef = useRef(null);
  const langMenuDropdownRef = useRef(null);
  const themeIconRef = useRef(null);
  const helpIconRef = useRef(null);
  const [railCollapsed, setRailCollapsed] = useState(() => readPortalRailCollapsed());
  const [footerIconsReady, setFooterIconsReady] = useState(true);
  const prevRailCollapsedRef = useRef(railCollapsed);
  const isCollapsed = isMobile ? false : railCollapsed;
  const showRailToggle = !isMobile;
  const showIconTooltip = isCollapsed || isMobile;
  const openMenuToRight = isCollapsed && !isMobile;
  const isDarkTheme = theme === "dark";
  const themeTooltip = isDarkTheme ? t.themeSwitchLight : t.themeSwitchDark;
  const ThemeMenuIcon = isDarkTheme ? SunIcon : MoonIcon;
  const currentLocale = useMemo(() => APP_LOCALES.find(entry => entry.code === locale) ?? APP_LOCALES[0], [locale]);
  const isProfileActive = location.pathname.startsWith("/client/profile");
  const collapseToggleLabel = isCollapsed
    ? t.expandSidebar || "Afficher les noms"
    : t.collapseSidebar || "Réduire le menu";

  useEffect(() => {
    const onPrefChange = event => {
      if (typeof event?.detail?.collapsed === "boolean") {
        setRailCollapsed(event.detail.collapsed);
      } else {
        setRailCollapsed(readPortalRailCollapsed());
      }
    };
    window.addEventListener(PORTAL_RAIL_COLLAPSED_EVENT, onPrefChange);
    return () => window.removeEventListener(PORTAL_RAIL_COLLAPSED_EVENT, onPrefChange);
  }, []);

  const toggleRailCollapsed = useCallback(() => {
    setFooterIconsReady(false);
    setRailCollapsed(prev => applyPortalRailCollapsed(!prev));
  }, []);

  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [onCollapseChange, isCollapsed]);

  useLayoutEffect(() => {
    if (isMobile) {
      setFooterIconsReady(true);
      prevRailCollapsedRef.current = isCollapsed;
      return undefined;
    }
    if (prevRailCollapsedRef.current === isCollapsed) return undefined;
    prevRailCollapsedRef.current = isCollapsed;
    setFooterIconsReady(false);
    const showTimer = window.setTimeout(() => setFooterIconsReady(true), 320);
    return () => window.clearTimeout(showTimer);
  }, [isCollapsed, isMobile]);

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
  const renderThemeToggleBtn = () => {
    const btn = (
      <button
        type="button"
        className={portalStyles.settingsSquareBtn}
        onClick={toggleTheme}
        aria-label={themeTooltip}
        onMouseEnter={() => themeIconRef.current?.startAnimation?.()}
        onMouseLeave={() => themeIconRef.current?.stopAnimation?.()}
      >
        <ThemeMenuIcon ref={themeIconRef} className={portalStyles.settingsSquareBtnIcon} size={20} />
      </button>
    );
    if (showIconTooltip) {
      return (
        <SidebarTooltip as="span" content={themeTooltip}>
          {btn}
        </SidebarTooltip>
      );
    }
    return btn;
  };

  const renderLangBtn = () => {
    const btn = (
      <button
        type="button"
        className={`${portalStyles.settingsSquareBtn} ${langMenuOpen ? portalStyles.settingsSquareBtnActive : ""}`.trim()}
        onClick={() => {
          setLangMenuOpen(open => !open);
          closeUserMenu();
        }}
        aria-expanded={langMenuOpen}
        aria-haspopup="listbox"
        aria-label={t.languageAria}
      >
        <span className={portalStyles.settingsSquareBtnFlag} aria-hidden>
          {currentLocale.flag}
        </span>
      </button>
    );
    if (showIconTooltip) {
      return (
        <SidebarTooltip as="span" content={t.languageTitle}>
          {btn}
        </SidebarTooltip>
      );
    }
    return btn;
  };

  const renderHelpBtn = () => {
    const helpAria = portalGuide.helpAria;
    const btn = (
      <button
        type="button"
        className={`${portalStyles.settingsSquareBtn} ${portalGuideOpen ? portalStyles.settingsSquareBtnActive : ""}`.trim()}
        onClick={startPortalGuide}
        aria-label={helpAria}
        onMouseEnter={() => helpIconRef.current?.startAnimation?.()}
        onMouseLeave={() => helpIconRef.current?.stopAnimation?.()}
      >
        <CircleHelpIcon ref={helpIconRef} className={portalStyles.settingsSquareBtnIcon} size={20} />
      </button>
    );
    if (showIconTooltip) {
      return (
        <SidebarTooltip as="span" content={helpAria}>
          {btn}
        </SidebarTooltip>
      );
    }
    return btn;
  };

  const renderAccountBtn = () => {
    const btn = (
      <button
        type="button"
        className={`${portalStyles.settingsSquareBtn} ${portalStyles.accountBtn} ${userMenuOpen ? portalStyles.settingsSquareBtnActive : ""} ${isProfileActive ? portalStyles.accountBtnActive : ""}`.trim()}
        onClick={() => {
          closeLangMenu();
          setUserMenuOpen(o => !o);
        }}
        aria-expanded={userMenuOpen}
        aria-haspopup="menu"
        aria-label={t.accountMenuAria}
      >
        <UserAvatar user={user} name={user?.username || user?.email} size={28} variant="client" />
      </button>
    );
    if (showIconTooltip) {
      return (
        <SidebarTooltip as="span" content={t.accountMenu}>
          {btn}
        </SidebarTooltip>
      );
    }
    return btn;
  };
  return <>
      {isMobile && !showMenu ? <button type="button" className={sidebarStyles.burgerButton} onClick={() => setShowMenu(true)} aria-expanded={false} aria-label={t.openMenu || "Ouvrir le menu"}>
          ☰
        </button> : null}

      {(showMenu || !isMobile) && <motion.nav
        className={[
          sidebarStyles.sidebar,
          portalStyles.portalSidebar,
          isMobile ? sidebarStyles.mobileSidebar : "",
          !isMobile && isCollapsed ? `${sidebarStyles.sidebarCollapsed} ${portalStyles.portalSidebarCollapsed}` : ""
        ].filter(Boolean).join(" ")}
        data-portal-guide="sidebar-root"
        data-sidebar-rail="1"
        initial={{
          x: isMobile ? "-100%" : 0,
          opacity: 1
        }}
        animate={{
          x: 0,
          opacity: 1
        }}
        exit={{
          x: isMobile ? "-100%" : -50,
          opacity: isMobile ? 1 : 0
        }}
        transition={{
          duration: 0.35,
          ease: "easeOut"
        }}
        aria-label={t.navAria}
      >
          <div className={sidebarStyles.sidebarContent}>
            <div className={sidebarStyles.logoHeader} data-portal-guide="brand">
              <div className={`${sidebarStyles.logoHeaderRow} ${isCollapsed ? sidebarStyles.logoHeaderRowCollapsed : ""}`.trim()}>
                {showIconTooltip ? (
                  <SidebarTooltip as="span" content={t.brandSub} className={sidebarStyles.sidebarTooltipHost}>
                    <NavLink to="/client" end className={sidebarStyles.logoWrapper} onClick={closeMobileMenu}>
                      <div className={sidebarStyles.brandMark}>V</div>
                      {!isCollapsed ? <span className={sidebarStyles.logoText}>Veritas</span> : null}
                    </NavLink>
                  </SidebarTooltip>
                ) : (
                  <NavLink to="/client" end className={sidebarStyles.logoWrapper} onClick={closeMobileMenu}>
                    <div className={sidebarStyles.brandMark}>V</div>
                    {!isCollapsed ? <span className={sidebarStyles.logoText}>Veritas</span> : null}
                  </NavLink>
                )}
              </div>
              {(!isCollapsed || isMobile) && (companies.length > 0 || clientName || sites.length > 0) ? (
                <div className={portalStyles.contextFilters} data-portal-guide="context">
                  {(companies.length > 0 || clientName) ? (
                    <div className={portalStyles.companySwitch}>
                      <label className={portalStyles.companySwitchLabel} htmlFor="portal-company-switch">
                        {t.switchCompanyLabel || "Entreprise"}
                      </label>
                      <div className={portalStyles.companySwitchSelectWrap}>
                        <Icon icon="mdi:office-building-outline" className={portalStyles.companySwitchIcon} aria-hidden />
                        <select
                          id="portal-company-switch"
                          className={portalStyles.companySwitchSelect}
                          value={String(activeClientId || companies[0]?.client_id || companies[0]?.id || "")}
                          disabled={switching || !onSwitchCompany}
                          aria-label={t.switchCompanyAria || t.switchCompanyLabel || "Entreprise"}
                          onChange={e => onSwitchCompany?.(e.target.value)}
                        >
                          {(companies.length > 0 ? companies : [{ id: activeClientId, name: clientName }]).map(company => {
                            const id = company.client_id ?? company.id;
                            return (
                              <option key={id} value={String(id)}>
                                {company.name || `#${id}`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  ) : null}
                  {sites.length > 0 ? (
                    <div className={portalStyles.companySwitch}>
                      <label className={portalStyles.companySwitchLabel} htmlFor="portal-site-switch">
                        {t.switchSiteLabel || "Site"}
                      </label>
                      <div className={portalStyles.companySwitchSelectWrap}>
                        <Icon icon="mdi:map-marker-outline" className={portalStyles.companySwitchIcon} aria-hidden />
                        <select
                          id="portal-site-switch"
                          className={portalStyles.companySwitchSelect}
                          value={siteFilter || ""}
                          disabled={switching || !onSwitchSite}
                          aria-label={t.switchSiteAria || t.switchSiteLabel || "Site"}
                          onChange={e => onSwitchSite?.(e.target.value || null)}
                        >
                          <option value="">{t.allSites || "Tous les sites"}</option>
                          {sites.map(site => {
                            const name = site.name || site.label;
                            const city = site.addressCity || site.city;
                            const label = city && city !== name ? `${name} · ${city}` : name;
                            return (
                              <option key={site.id || name} value={name}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <hr className={isCollapsed ? sidebarStyles.sectionDividerCollapsed : sidebarStyles.separator} />

            <ul className={sidebarStyles.navList} data-portal-guide="nav">
              {NAV_ITEMS.map(item => (
                <PortalNavItem
                  key={item.to}
                  item={item}
                  t={t}
                  showTooltip={showIconTooltip}
                  isCollapsed={isCollapsed}
                  isMobile={isMobile}
                  badge={item.badgeKey === "actionRequired" ? actionRequiredCount : 0}
                  onNavigate={closeMobileMenu}
                />
              ))}
            </ul>

            <div className={portalStyles.navSpacer} aria-hidden />

            {showRailToggle ? (
              <div className={sidebarStyles.railCollapseSlot}>
                {showIconTooltip ? (
                  <SidebarTooltip
                    as="button"
                    type="button"
                    content={collapseToggleLabel}
                    className={sidebarStyles.railCollapseToggle}
                    onClick={toggleRailCollapsed}
                    aria-label={collapseToggleLabel}
                    aria-expanded={!isCollapsed}
                  >
                    <Icon
                      icon={isCollapsed ? "mdi:chevron-double-right" : "mdi:chevron-double-left"}
                      className={sidebarStyles.railCollapseChevron}
                      aria-hidden
                    />
                  </SidebarTooltip>
                ) : (
                  <button
                    type="button"
                    className={sidebarStyles.railCollapseToggle}
                    onClick={toggleRailCollapsed}
                    aria-label={collapseToggleLabel}
                    aria-expanded={!isCollapsed}
                    title={collapseToggleLabel}
                  >
                    <Icon
                      icon={isCollapsed ? "mdi:chevron-double-right" : "mdi:chevron-double-left"}
                      className={sidebarStyles.railCollapseChevron}
                      aria-hidden
                    />
                  </button>
                )}
              </div>
            ) : null}

            <div
              className={`${sidebarStyles.sidebarFooter} ${portalStyles.portalFooter} ${
                footerIconsReady ? sidebarStyles.sidebarFooterReady : sidebarStyles.sidebarFooterHidden
              }`.trim()}
            >
              <div className={portalStyles.settingsSection} data-portal-guide="utilities">
                <div className={portalStyles.settingsBtnRow} role="group" aria-label={t.themeAria}>
                  {renderThemeToggleBtn()}
                  <span ref={langMenuRef} className={portalStyles.settingsBtnSlot}>
                    {renderLangBtn()}
                  </span>
                  {renderHelpBtn()}
                  <span ref={userMenuRef} className={portalStyles.settingsBtnSlot} data-portal-guide="account">
                    {renderAccountBtn()}
                  </span>
                </div>
              </div>

              {userMenuOpen && userMenuFixedStyle && createPortal(
                <div ref={userMenuDropdownRef} className={sidebarStyles.userMenuDropdown} style={userMenuFixedStyle} role="menu">
                  <div className={sidebarStyles.userMenuDropdownTitle}>{t.accountMenu}</div>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${sidebarStyles.userMenuItem} ${isProfileActive ? sidebarStyles.userMenuItemActive : ""}`}
                    onClick={() => runUserMenuAction(() => navigate("/client/profile"))}
                  >
                    <Icon icon="mdi:account-circle-outline" className={sidebarStyles.userMenuItemIcon} />
                    {t.navProfile}
                  </button>
                  {user?.email ? (
                    <div className={portalStyles.userMenuEmail} title={user.email}>
                      {user.email}
                    </div>
                  ) : null}
                  <div className={sidebarStyles.userMenuDivider} role="separator" />
                  <button
                    type="button"
                    role="menuitem"
                    className={`${sidebarStyles.userMenuItem} ${sidebarStyles.userMenuItemDanger}`}
                    onClick={() => runUserMenuAction(onLogout)}
                  >
                    <Icon icon="mingcute:exit-fill" className={sidebarStyles.userMenuItemIcon} />
                    {t.logout}
                  </button>
                </div>,
                document.body
              )}
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

      <PageGuideTour open={portalGuideOpen} steps={portalGuide.steps} title={portalGuide.tourTitle} locale={locale} onClose={closePortalGuide} />
    </>;
}
