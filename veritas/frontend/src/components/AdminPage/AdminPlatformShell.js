import { useRef } from "react";
import { Page } from "./AdminUi";
import { useFinderNavIndicator } from "../UiKit";
import platform from "./AdminGeneralSettingsPlatform.module.css";
import AdminGeneralSettingsLoading from "./AdminGeneralSettingsLoading";
import AdminAnimatedIcon from "./AdminAnimatedIcon";

function AdminShellTab({ item, isActive, onSelect, disabled }) {
  const animRef = useRef(null);
  const hasIcon = Boolean(item.icon || item.animated || item.key);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-current={isActive ? "true" : undefined}
      className={`${platform.tab}${isActive ? ` ${platform.tabActive}` : ""}`}
      onClick={() => onSelect?.(item.key)}
      disabled={disabled || item.disabled}
      onMouseEnter={() => hasIcon && animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
    >
      {hasIcon ? (
        <span className={platform.tabIcon} aria-hidden>
          <AdminAnimatedIcon
            iconKey={item.key}
            iconify={item.icon}
            animated={item.animated}
            size={17}
            animRef={animRef}
          />
        </span>
      ) : null}
      <span className={platform.tabLabel}>{item.label}</span>
      {item.badge || null}
    </button>
  );
}

/**
 * Carte globale admin (même chrome que Paramètres généraux) :
 * onglets animés optionnels + pane fade-in.
 */
export default function AdminPlatformShell({
  tabs = null,
  activeTab = "main",
  onTabChange,
  tabsAriaLabel = "",
  tabsDisabled = false,
  loading = false,
  loadingMessage = "",
  children,
  className = "",
  paneClassName = "",
  fill = true
}) {
  const tabList = Array.isArray(tabs) && tabs.length > 0 ? tabs : null;
  const { trackRef, indicator } = useFinderNavIndicator([activeTab, tabList?.length]);
  const content = typeof children === "function" ? children(activeTab) : children;
  const paneKey = loading ? "pane-loading" : `pane-${activeTab}`;

  return (
    <Page>
      <div
        className={`${platform.shell}${className ? ` ${className}` : ""}`}
        {...(fill ? { "data-page-fill": true } : {})}
      >
        {tabList ? (
          <div
            className={platform.tabs}
            ref={trackRef}
            role="tablist"
            aria-label={tabsAriaLabel || tabList.map(tab => tab.label).join(" / ")}
          >
            {indicator.ready ? (
              <span
                className={platform.tabIndicator}
                style={{
                  transform: `translate3d(${indicator.left}px, 0, 0)`,
                  width: indicator.width,
                  height: indicator.height
                }}
                aria-hidden
              />
            ) : null}
            {tabList.map(item => (
              <AdminShellTab
                key={item.key}
                item={item}
                isActive={activeTab === item.key}
                onSelect={onTabChange}
                disabled={tabsDisabled || loading}
              />
            ))}
          </div>
        ) : null}

        <div className={platform.shellBody}>
          <div className={`${platform.shellPane}${paneClassName ? ` ${paneClassName}` : ""}`} key={paneKey}>
            {loading ? <AdminGeneralSettingsLoading message={loadingMessage} /> : content}
          </div>
        </div>
      </div>
    </Page>
  );
}

export { platform as adminPlatformStyles };
export { default as AdminPlatformLoading } from "./AdminGeneralSettingsLoading";
export { AdminShellTab };
