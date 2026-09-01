import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTabTooltip } from "../../../utils/tabLabels";
import { getFleetFamilyIcon } from "../../../utils/equipmentFamilyStats";
import { groupTabsIntoFolders, shouldUseFolderMode } from "../../../utils/tabSort";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../../hooks/useCommonCopy";
import { interpolate } from "../../../i18n/translate";
import styles from "./TabsBar.module.css";
function getTabIcon(type, tabData) {
  switch (type) {
    case "Contrat":
      return "mdi:office-building-outline";
    case "Contact":
      return "mdi:account-group-outline";
    case "Ticket":
    case "TicketCreate":
    case "TicketDetail":
      return "mdi:message-processing-outline";
    case "TicketSales":
    case "TicketSalesCreate":
    case "TicketSalesDetail":
      return "mdi:briefcase-edit-outline";
    case "Hardware":
      return "mdi:monitor-dashboard";
    case "Mon":
      return "mdi:chart-line";
    case "ContratDetail":
      return "mdi:office-building";
    case "ContactDetail":
      return "mdi:phone";
    case "Equipment":
      return "material-symbols:devices";
    case "MonitoringDetail":
      return "mdi:chart-line";
    case "EquipmentDetail":
      if (tabData?.type) {
        const equipmentType = tabData.type;
        if (equipmentType === "Servers") {
          const serverType = tabData.typeServer || tabData.rawData?.type || "";
          if (serverType === "virtuel" || serverType === "Virtuel") {
            return "mdi:cube";
          }
          return "mdi:server";
        }
        if (equipmentType === "NAS" || equipmentType === "Storage") {
          const storageType = tabData?.rawData?.type || tabData?.type || "";
          const typeLower = String(storageType).toLowerCase();
          if (typeLower.includes("san")) return "mdi:server-network-outline";
          if (typeLower.includes("robot")) return "mdi:vhs";
          if (typeLower.includes("disque")) return "mdi:harddisk";
          return "mdi:nas";
        }
        if (equipmentType === "Firewalls") return "mdi:shield-outline";
        if (equipmentType === "Switch") return "mdi:lan";
        if (equipmentType === "BorneWifi") return "mdi:wifi";
        if (equipmentType === "Internet") {
          const connType = (tabData?.rawData?.type || tabData?.type || "").toLowerCase();
          const nom = (tabData?.name || tabData?.rawData?.nom || "").toLowerCase();
          const fournisseur = (tabData?.rawData?.fournisseur || tabData?.fournisseur || "").toLowerCase();
          const combined = `${connType} ${nom} ${fournisseur}`;
          if (connType.includes("fibre") || connType.includes("fiber") || combined.includes("fibre") || combined.includes("fiber")) {
            return "streamline-ultimate:fiber-access-1";
          }
          if (connType.includes("5g") || combined.includes("5g")) return "material-symbols:5g-mobiledata-badge";
          if (connType.includes("4g") || combined.includes("4g") || connType.includes("lte") || combined.includes("lte")) {
            return "material-symbols:4g-mobiledata-badge";
          }
          if (connType.includes("adsl") || combined.includes("adsl") || connType.includes("dsl") || combined.includes("dsl")) {
            return "mdi:ethernet-cable";
          }
          if (connType.includes("satellite") || combined.includes("satellite")) return "tabler:satellite";
          if (connType.includes("wifi") || combined.includes("wifi") || connType.includes("wireless") || combined.includes("wireless")) {
            return "mdi:wifi";
          }
          if (connType.includes("ethernet") || combined.includes("ethernet") || connType.includes("cable") || combined.includes("cable")) {
            return "mdi:network";
          }
          return "mdi:router-wireless";
        }
        if (equipmentType === "Caméra de sécurité") return "mdi:cctv";
      }
      return "mdi:server";
    case "CampaignDetail":
      return "mdi:shield-check";
    case "AntivirusDetail":
      return "mdi:shield-search";
    case "AntispamDetail":
      return "mdi:email-secure";
    case "TenantDetail":
      return "mdi:microsoft-azure";
    case "ComputerFleetStats":
      return getFleetFamilyIcon(tabData?.equipmentType, tabData?.familyIcon);
    default:
      return "mdi:file-document";
  }
}
function SortableTab({
  tab,
  isActive,
  onTabClick,
  onTabClose,
  draggable = true
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: tab.id,
    disabled: !draggable
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const handleMouseDown = e => {
    if (e.button === 1) {
      if (e.target.closest(`.${styles.closeButton}`)) return;
      e.preventDefault();
      e.stopPropagation();
      onTabClose(tab.id);
      return;
    }
    if (e.target.closest(`.${styles.closeButton}`)) return;
    if (listeners?.onMouseDown && e.button !== 1) {
      listeners.onMouseDown(e);
    }
  };
  const handleAuxClick = e => {
    if (e.button === 1) {
      if (e.target.closest(`.${styles.closeButton}`)) return;
      e.preventDefault();
      e.stopPropagation();
      onTabClose(tab.id);
    }
  };
  const dragListeners = draggable ? {
    ...listeners,
    onMouseDown: undefined,
    onTouchStart: e => {
      if (e.target.closest(`.${styles.closeButton}`)) return;
      if (listeners?.onTouchStart) listeners.onTouchStart(e);
    }
  } : {};
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const tooltip = getTabTooltip(tab.type, tab.title, locale);
  return <div ref={draggable ? setNodeRef : undefined} style={draggable ? style : undefined} className={`${styles.tab} ${isActive ? styles.active : ""} ${isDragging ? styles.dragging : ""} ${!draggable ? styles.tabStatic : ""}`.trim()} onClick={() => onTabClick(tab)} onMouseDown={handleMouseDown} onAuxClick={handleAuxClick} title={tooltip} role="tab" aria-selected={isActive} aria-label={tooltip} {...draggable ? attributes : {}} {...dragListeners}>
      <Icon icon={getTabIcon(tab.type, tab.data)} className={styles.tabIcon} width={13} height={13} />
      <span className={styles.tabLabel}>{tab.title}</span>
      <button type="button" className={styles.closeButton} onClick={e => {
      e.stopPropagation();
      e.preventDefault();
      onTabClose(tab.id);
    }} onMouseDown={e => {
      e.stopPropagation();
      e.preventDefault();
    }} onTouchStart={e => e.stopPropagation()} title={commonCopy.closeTab}>
        <FaTimes size={10} />
      </button>
    </div>;
}
function TabFolderDropdownItem({
  tab,
  onTabClick,
  onTabClose
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const tooltip = getTabTooltip(tab.type, tab.title, locale);
  const closeOnMiddleClick = event => {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    onTabClose(tab.id);
  };
  return <div className={styles.folderTabItem} role="presentation" onMouseDown={closeOnMiddleClick} onAuxClick={closeOnMiddleClick}>
      <button type="button" className={styles.folderTabItemBtn} onMouseDown={event => {
      if (event.button === 1) {
        closeOnMiddleClick(event);
        return;
      }
      if (event.button !== 0) return;
      event.preventDefault();
      onTabClick(tab);
    }} onAuxClick={closeOnMiddleClick} title={tooltip}>
        <Icon icon={getTabIcon(tab.type, tab.data)} className={styles.folderTabItemIcon} width={14} height={14} />
        <span className={styles.folderTabItemLabel}>{tab.title}</span>
      </button>
      <button type="button" className={styles.folderTabItemClose} onClick={e => {
      e.stopPropagation();
      onTabClose(tab.id);
    }} onMouseDown={closeOnMiddleClick} onAuxClick={closeOnMiddleClick} title={commonCopy.closeTab} aria-label={commonCopy.closeTab}>
        <FaTimes size={10} />
      </button>
    </div>;
}
function TabFolderGroup({
  group,
  folderLabel,
  activeTabId,
  launcherActive,
  isOpen,
  onToggle,
  onTabClick,
  onTabClose,
  useFolderUi
}) {
  const commonCopy = useCommonCopy();
  const activeTab = group.tabs.find(tab => tab.id === activeTabId);
  const inactiveTabs = group.tabs.filter(tab => tab.id !== activeTabId);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const menuTabs = activeTab ? inactiveTabs : group.tabs;
  const menuCount = menuTabs.length;
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setDropdownStyle(null);
      return undefined;
    }
    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 1,
        left: rect.left,
        minWidth: Math.max(rect.width, 240),
        zIndex: 1100
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, menuCount, folderLabel]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = event => {
      if (wrapRef.current?.contains(event.target) || dropdownRef.current?.contains(event.target)) return;
      onToggle(null);
    };
    const handleKeyDown = event => {
      if (event.key === "Escape") onToggle(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onToggle]);
  if (!useFolderUi || group.tabs.length === 1) {
    return <>
        {group.tabs.map(tab => {
        const isActive = !launcherActive && tab.id === activeTabId;
        return <SortableTab key={tab.id} tab={tab} isActive={isActive} onTabClick={onTabClick} onTabClose={onTabClose} />;
      })}
      </>;
  }
  return <div className={styles.folderGroup} ref={wrapRef}>
      {activeTab ? <SortableTab tab={activeTab} isActive={!launcherActive} onTabClick={onTabClick} onTabClose={onTabClose} /> : null}
      {menuCount > 0 ? <div className={styles.folderWrap}>
          <button ref={buttonRef} type="button" className={`${styles.folderButton} ${isOpen ? styles.folderButtonOpen : ""} ${activeTab ? styles.folderButtonCompact : ""}`.trim()} onClick={() => onToggle(isOpen ? null : group.key)} aria-expanded={isOpen} aria-haspopup="menu" title={activeTab ? interpolate(commonCopy.tabFolderMore, {
        count: String(menuCount)
      }) : interpolate(commonCopy.tabFolderOpen, {
        label: folderLabel,
        count: String(menuCount)
      })}>
            <Icon icon={group.icon} className={styles.folderButtonIcon} width={13} height={13} />
            {!activeTab ? <span className={styles.folderButtonLabel}>{folderLabel}</span> : null}
            <span className={styles.folderCount}>{activeTab ? `+${menuCount}` : menuCount}</span>
            <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className={styles.folderChevron} width={14} height={14} aria-hidden />
          </button>
          {isOpen && dropdownStyle ? createPortal(<div ref={dropdownRef} className={styles.folderDropdown} style={dropdownStyle} role="menu">
                  <div className={styles.folderDropdownHeader}>{folderLabel}</div>
                  {menuTabs.map(tab => <TabFolderDropdownItem key={tab.id} tab={tab} onTabClick={selected => {
          onToggle(null);
          onTabClick(selected);
        }} onTabClose={onTabClose} />)}
                </div>, document.body) : null}
        </div> : null}
    </div>;
}
export default function TabsBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabReorder,
  onSortTabs,
  onNewTab,
  launcherActive = false,
  sidebarCollapsed = false
}) {
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const [openFolderKey, setOpenFolderKey] = useState(null);
  const folderMode = shouldUseFolderMode(tabs);
  const folderGroups = useMemo(() => folderMode ? groupTabsIntoFolders(tabs, locale) : [], [folderMode, tabs, locale]);
  const getFolderLabel = useCallback(key => commonCopy.tabFolders[key] || commonCopy.tabFolders.other, [commonCopy]);
  useEffect(() => {
    if (!folderMode) setOpenFolderKey(null);
  }, [folderMode]);
  useEffect(() => {
    if (!openFolderKey) return;
    const stillExists = folderGroups.some(g => g.key === openFolderKey);
    if (!stillExists) setOpenFolderKey(null);
  }, [folderGroups, openFolderKey]);
  if ((!tabs || tabs.length === 0) && !onNewTab && !onSortTabs) {
    return null;
  }
  const handleDragEnd = event => {
    if (folderMode) return;
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const tabList = tabs || [];
      const oldIndex = tabList.findIndex(tab => tab.id === active.id);
      const newIndex = tabList.findIndex(tab => tab.id === over.id);
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      if (onTabReorder) onTabReorder(newTabs);
    }
  };
  const renderTabs = () => {
    if (folderMode) {
      return folderGroups.map(group => <TabFolderGroup key={group.key} group={group} folderLabel={getFolderLabel(group.key)} activeTabId={activeTabId} launcherActive={launcherActive} isOpen={openFolderKey === group.key} onToggle={setOpenFolderKey} onTabClick={onTabClick} onTabClose={onTabClose} useFolderUi={group.tabs.length > 1} />);
    }
    return (tabs || []).map(tab => {
      const isActive = !launcherActive && tab.id === activeTabId;
      return <SortableTab key={tab.id} tab={tab} isActive={isActive} onTabClick={onTabClick} onTabClose={onTabClose} />;
    });
  };
  return <div className={`${styles.tabsBar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""} ${folderMode ? styles.tabsBarFolderMode : ""}`.trim()}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={(tabs || []).map(tab => tab.id)} strategy={horizontalListSortingStrategy}>
          <div className={styles.tabsContainer}>
            {renderTabs()}
          </div>
        </SortableContext>
      </DndContext>
      {onSortTabs || onNewTab ? <div className={styles.tabsActions}>
          {onSortTabs ? <button type="button" className={styles.sortTabsButton} onClick={onSortTabs} title={commonCopy.sortTabs} aria-label={commonCopy.sortTabs}>
              <Icon icon="mdi:sort-variant" width={16} height={16} aria-hidden />
            </button> : null}
          {onNewTab ? <button type="button" className={`${styles.newTabButton} ${launcherActive ? styles.newTabButtonActive : ""}`} onClick={onNewTab} title={commonCopy.newTab} aria-label={commonCopy.newTab}>
              <Icon icon="mdi:plus" width={16} height={16} aria-hidden />
            </button> : null}
        </div> : null}
    </div>;
}
