import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchGlobalSearch } from "../../../api/globalSearch";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { useVeritasEdition } from "../../../hooks/useVeritasEdition";
import { isProOnlyDocType } from "../../../config/edition";
import { TAB_LAUNCHER_SECTIONS, getTabLauncherCopy } from "../../TabLauncher/tabLauncherI18n";
import { buildAdminNavSections, flattenNavItems } from "../../AdminPage/adminPanelI18n";
import { RESULT_TYPE_ICONS, RESULT_TYPE_ORDER, getGlobalSearchCopy } from "./globalSearchI18n";
import styles from "./GlobalSearchPalette.module.css";

const MIN_QUERY = 2;
const GROUP_ORDER = RESULT_TYPE_ORDER;

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesQuery(haystack, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(haystack);
  return q.split(/\s+/).filter(Boolean).every(token => hay.includes(token));
}

function isPageVisible(item, { access, isCommunity, userRole }) {
  if (item.adminOnly && userRole !== "admin") return false;
  if (item.accessKey && access?.[item.accessKey] === false) return false;
  if (item.proOnly && isCommunity && isProOnlyDocType(item.docType)) return false;
  return true;
}

function mapEquipmentNavigate(navigate) {
  if (!navigate || navigate.docType !== "EquipmentDetail") return navigate;
  const type = navigate.payload?.type;
  const mapped =
    type === "Serveurs"
      ? "Servers"
      : type === "Stockage"
        ? "Storage"
        : type === "Videosurveillance"
          ? "Security camera"
          : type;
  return {
    ...navigate,
    payload: {
      ...navigate.payload,
      type: mapped
    }
  };
}

function groupResults(items) {
  const buckets = new Map();
  for (const item of items) {
    const type = item.type || "page";
    if (!buckets.has(type)) buckets.set(type, []);
    buckets.get(type).push(item);
  }
  return GROUP_ORDER.filter(type => buckets.has(type)).map(type => ({
    type,
    items: buckets.get(type)
  }));
}

function isModK(event) {
  if (event.key !== "k" && event.key !== "K") return false;
  return event.ctrlKey || event.metaKey;
}

export default function GlobalSearchPalette({
  open,
  onClose,
  onNavigate,
  access = {},
  userRole
}) {
  const locale = useAppLocale();
  const { isCommunity } = useVeritasEdition();
  const copy = useMemo(() => getGlobalSearchCopy(locale), [locale]);
  const launcherCopy = useMemo(() => getTabLauncherCopy(locale), [locale]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const pageResults = useMemo(() => {
    const items = TAB_LAUNCHER_SECTIONS.flatMap(section =>
      section.items
        .filter(item => isPageVisible(item, { access, isCommunity, userRole }))
        .map(item => ({
          id: `page:${item.docType}`,
          type: "page",
          title: launcherCopy.items[item.labelKey],
          subtitle: launcherCopy.items[item.descKey],
          icon: item.icon,
          navigate: { docType: item.docType, payload: null }
        }))
    );
    return items.filter(item => matchesQuery(`${item.title} ${item.subtitle} ${item.navigate.docType}`, query));
  }, [access, isCommunity, userRole, launcherCopy, query]);

  const adminResults = useMemo(() => {
    if (userRole !== "admin" || access?.Admin === false) return [];
    return buildAdminNavSections(locale)
      .flatMap(section =>
        flattenNavItems(section.items).map(item => ({
          id: `admin:${item.key}`,
          type: "admin",
          title: item.label,
          subtitle: [section.title, item.description].filter(Boolean).join(" · "),
          icon: item.icon || RESULT_TYPE_ICONS.admin,
          navigate: {
            docType: "Admin",
            payload: { tab: item.key },
            options: { adminTab: item.key }
          }
        }))
      )
      .filter(item => matchesQuery(`${item.title} ${item.subtitle} ${item.id}`, query));
  }, [access, locale, query, userRole]);

  const localResults = useMemo(() => {
    const maxLocal = query.trim() ? 8 : 12;
    return [...pageResults.slice(0, maxLocal), ...adminResults.slice(0, query.trim() ? 8 : 0)];
  }, [adminResults, pageResults, query]);

  const allResults = useMemo(() => {
    const seen = new Set(localResults.map(item => item.id));
    const remote = remoteResults.filter(item => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return [...localResults, ...remote];
  }, [localResults, remoteResults]);

  const groups = useMemo(() => groupResults(allResults), [allResults]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    setRemoteResults([]);
    setActiveIndex(0);
    setLoading(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusId = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusId);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setRemoteResults([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const payload = await fetchGlobalSearch(q, { signal: controller.signal });
        setRemoteResults(payload.results || []);
      } catch (err) {
        if (err?.name !== "AbortError") setRemoteResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, remoteResults]);

  useEffect(() => {
    if (!open) return;
    const node = resultsRef.current?.querySelector("[data-search-active='true']");
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, allResults]);

  const activate = useCallback(
    result => {
      if (!result?.navigate?.docType || !onNavigate) return;
      const navigate = mapEquipmentNavigate(result.navigate);
      onNavigate(navigate.docType, navigate.payload || null, navigate.options || undefined);
      onClose?.();
    },
    [onClose, onNavigate]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (!allResults.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex(index => (index + 1) % allResults.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(index => (index - 1 + allResults.length) % allResults.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        activate(allResults[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activate, activeIndex, allResults, onClose, open]);

  if (!open) return null;

  let runningIndex = -1;
  const showEmptyHint = !query.trim();
  const showNoResults = query.trim().length >= MIN_QUERY && !loading && allResults.length === 0;
  const showShortQuery = query.trim().length > 0 && query.trim().length < MIN_QUERY && allResults.length === 0;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.shell}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={copy.buttonAria}
      >
        <div className={styles.searchRow}>
          <Icon icon={loading ? "mdi:loading" : "mdi:magnify"} className={`${styles.searchIcon} ${loading ? styles.spinning : ""}`} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.buttonAria}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className={styles.clearBtn} onClick={() => setQuery("")} aria-label={copy.clear}>
              <FaTimes />
            </button>
          ) : (
            <kbd className={styles.kbd}>esc</kbd>
          )}
        </div>
        <div className={styles.results} role="listbox" ref={resultsRef}>
          {showEmptyHint && allResults.length === 0 ? <p className={styles.hint}>{copy.emptyHint}</p> : null}
          {showShortQuery ? <p className={styles.hint}>{copy.emptyHint}</p> : null}
          {showNoResults ? <p className={styles.hint}>{copy.noResults}</p> : null}
          {groups.map(group => (
            <div key={group.type} className={styles.group}>
              <div className={styles.groupLabel}>{copy.groups[group.type] || group.type}</div>
              {group.items.map(result => {
                runningIndex += 1;
                const index = runningIndex;
                const selected = index === activeIndex;
                return (
                  <button
                    key={result.id}
                    type="button"
                    className={`${styles.item} ${selected ? styles.itemActive : ""}`}
                    data-search-active={selected ? "true" : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activate(result)}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className={styles.itemIcon} aria-hidden>
                      <Icon icon={result.icon || RESULT_TYPE_ICONS[result.type] || "mdi:magnify"} />
                    </span>
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>{result.title}</span>
                      {result.subtitle ? <span className={styles.itemSubtitle}>{result.subtitle}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <span>{copy.shortcutHint}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useGlobalSearchHotkey(onOpen) {
  useEffect(() => {
    const onKeyDown = event => {
      if (!isModK(event) || event.altKey) return;
      event.preventDefault();
      onOpen?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

export function getSearchShortcutLabel() {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "")) {
    return "⌘K";
  }
  return "Ctrl+K";
}
