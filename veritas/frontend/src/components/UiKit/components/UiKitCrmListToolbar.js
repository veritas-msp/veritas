import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../../SmartTooltip";
import kit from "../uiKitLayouts.module.css";
import layout from "../../EnterprisesPage/EnterprisesPage.module.css";
import equipStyles from "../../EquipementPage/EquipmentPage.module.css";

/**
 * Barre d’outils liste CRM — même structure que Entreprises / Contacts / Prestataires.
 * Titre optionnel + recherche UiKit (ou style embedded EnterpriseDetail) + filtres + menu ⋯ + création.
 */
export default function UiKitCrmListToolbar({
  title,
  titleIcon = "mdi:view-list-outline",
  titleAs = "h1",
  searchValue = "",
  onSearchChange,
  onSearchClear,
  searchPlaceholder = "",
  searchAriaLabel = "",
  clearSearchLabel = "Effacer la recherche",
  searchPending = false,
  /** "default" = kit.searchBox | "embedded" = pill EnterpriseDetail / périphériques */
  searchVariant = "default",
  filters = null,
  filtersAriaLabel,
  leading = null,
  moreActionsLabel = "Plus d'actions",
  moreMenuItems = [],
  createAction = null,
  extraActions = null,
  searchInputRef = null,
  className = "",
  /** Désactive les SmartTooltip (ex. Support / Prestations) */
  disableTooltips = false
}) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const TitleTag = titleAs === "h2" ? "h2" : "h1";
  const visibleMenuItems = (Array.isArray(moreMenuItems) ? moreMenuItems : []).filter(
    item => item && !item.hidden
  );
  const showMoreMenu = visibleMenuItems.length > 0;
  const showCreate =
    createAction && !createAction.hidden && typeof createAction.onClick === "function";
  const useEmbeddedSearch = searchVariant === "embedded";

  useEffect(() => {
    if (!moreMenuOpen) return undefined;
    const onPointerDown = event => {
      if (!moreMenuRef.current?.contains(event.target)) setMoreMenuOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreMenuOpen]);

  const searchBox = typeof onSearchChange === "function" ? (
    useEmbeddedSearch ? (
      /* Wrapper tokens only — display:contents keeps horizontal toolbar layout */
      <div className={equipStyles.hardwarePageEmbedded} style={{ display: "contents" }}>
        <div className={equipStyles.embeddedSearchBox}>
          <Icon
            icon={searchPending ? "mdi:loading" : "mdi:magnify"}
            className={`${equipStyles.embeddedSearchIcon}${searchPending ? ` ${layout.spinning}` : ""}`}
            aria-hidden
          />
          <input
            ref={searchInputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={event => onSearchChange(event.target.value)}
            className={equipStyles.embeddedSearchInput}
            aria-label={searchAriaLabel || searchPlaceholder}
          />
          {searchValue && !searchPending ? (
            <button
              type="button"
              className={equipStyles.embeddedSearchClear}
              onClick={() => (onSearchClear ? onSearchClear() : onSearchChange(""))}
              aria-label={clearSearchLabel}
            >
              <Icon icon="mdi:close" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    ) : (
      <div className={kit.searchBox}>
        <Icon
          icon={searchPending ? "mdi:loading" : "mdi:magnify"}
          className={`${kit.searchIcon}${searchPending ? ` ${layout.spinning}` : ""}`}
          aria-hidden
        />
        <input
          ref={searchInputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={event => onSearchChange(event.target.value)}
          className={kit.searchInput}
          aria-label={searchAriaLabel || searchPlaceholder}
        />
        {searchValue && !searchPending ? (
          <button
            type="button"
            className={kit.searchClear}
            onClick={() => (onSearchClear ? onSearchClear() : onSearchChange(""))}
            aria-label={clearSearchLabel}
          >
            <Icon icon="mdi:close" aria-hidden />
          </button>
        ) : null}
      </div>
    )
  ) : null;

  return (
    <div className={`${layout.tableSearchBar}${className ? ` ${className}` : ""}`}>
      {leading}
      {title ? (
        <header className={layout.cardHead}>
          {titleIcon ? (
            <span className={layout.cardHeadIcon} aria-hidden>
              <Icon icon={titleIcon} />
            </span>
          ) : null}
          <TitleTag className={layout.cardTitle}>{title}</TitleTag>
        </header>
      ) : null}

      {searchBox}

      <div className={layout.toolbarActions}>
        {filters ? (
          <div className={layout.statusChips} role="group" aria-label={filtersAriaLabel || title}>
            {filters}
          </div>
        ) : null}

        <div className={layout.toolbarGroupedActions}>
          {extraActions}

          {showMoreMenu ? (
            <div className={layout.exportMenuWrap} ref={moreMenuRef}>
              {(() => {
                const moreBtn = (
                  <button
                    type="button"
                    className={`${kit.btnSquare} ${kit.btnSquareSecondary}`}
                    onClick={() => setMoreMenuOpen(open => !open)}
                    aria-expanded={moreMenuOpen}
                    aria-haspopup="menu"
                    aria-label={moreActionsLabel}
                  >
                    <Icon icon="mdi:dots-horizontal" width={16} height={16} aria-hidden />
                  </button>
                );
                return disableTooltips ? moreBtn : <SmartTooltip content={moreActionsLabel}>{moreBtn}</SmartTooltip>;
              })()}
              {moreMenuOpen ? (
                <div className={layout.exportMenu} role="menu">
                  {visibleMenuItems.map(item => (
                    <button
                      key={item.key || item.label}
                      type="button"
                      role="menuitem"
                      className={layout.exportMenuItem}
                      disabled={item.disabled}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        item.onClick?.();
                      }}
                    >
                      {item.icon ? (
                        <Icon icon={item.icon} className={layout.exportMenuItemIcon} aria-hidden />
                      ) : null}
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {showCreate ? (() => {
            const createBtn = (
              <button
                type="button"
                className={`${kit.btnSquare} ${kit.btnSquarePrimary}`}
                onClick={createAction.onClick}
                disabled={createAction.disabled}
                aria-label={createAction.ariaLabel || createAction.label}
              >
                <Icon icon={createAction.icon || "mdi:plus"} aria-hidden />
              </button>
            );
            return disableTooltips ? createBtn : <SmartTooltip content={createAction.label}>{createBtn}</SmartTooltip>;
          })() : null}
        </div>
      </div>
    </div>
  );
}

export function CrmStatusChip({
  active = false,
  disabled = false,
  icon,
  label,
  count,
  onClick,
  title
}) {
  return (
    <button
      type="button"
      className={`${layout.statusChip}${active ? ` ${layout.statusChipActive}` : ""}${
        disabled ? ` ${layout.statusChipDisabled}` : ""
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon ? (
        <span className={layout.statusChipIcon}>
          <Icon icon={icon} aria-hidden />
        </span>
      ) : null}
      {label ? <span className={layout.statusChipLabel}>{label}</span> : null}
      {count != null ? <span className={layout.statusChipCount}>{count}</span> : null}
    </button>
  );
}

export function CrmStatusChipSeparator() {
  return <span className={layout.statusChipSeparator} aria-hidden />;
}
