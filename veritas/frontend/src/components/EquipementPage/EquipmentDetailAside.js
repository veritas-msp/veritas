import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import { EnterpriseQuickActionButton } from "../EnterprisesPage/EnterpriseFinderTabIcon";
import { isRmmManagedEquipment } from "./rmmMonitoringUtils";
import EquipmentNotesPanel from "./EquipmentNotesPanel";
import styles from "./EquipmentDetailAside.module.css";

const MORE_MENU_GAP = 6;
const MORE_MENU_VIEWPORT_PAD = 8;

function getMoreMenuPosition(triggerEl, menuEl) {
  if (!triggerEl) return null;
  const triggerRect = triggerEl.getBoundingClientRect();
  const menuWidth = menuEl?.offsetWidth || 220;
  const menuHeight = menuEl?.offsetHeight || 120;
  let top = triggerRect.bottom + MORE_MENU_GAP;
  let left = triggerRect.right - menuWidth;
  if (left < MORE_MENU_VIEWPORT_PAD) left = MORE_MENU_VIEWPORT_PAD;
  if (left + menuWidth > window.innerWidth - MORE_MENU_VIEWPORT_PAD) {
    left = window.innerWidth - menuWidth - MORE_MENU_VIEWPORT_PAD;
  }
  if (top + menuHeight > window.innerHeight - MORE_MENU_VIEWPORT_PAD) {
    top = triggerRect.top - menuHeight - MORE_MENU_GAP;
  }
  return {
    position: "fixed",
    top: Math.max(MORE_MENU_VIEWPORT_PAD, top),
    left: Math.max(MORE_MENU_VIEWPORT_PAD, left),
    zIndex: 10050
  };
}

function SidebarSectionHeader({
  title,
  icon = null,
  count = null,
  expanded = false,
  onToggle,
  controlsId,
  actions = null,
  panelStyles
}) {
  return (
    <div className={panelStyles.sidebarCollapseHeader}>
      <button
        type="button"
        className={panelStyles.sidebarCollapseMain}
        onClick={() => onToggle?.()}
        aria-expanded={expanded}
        aria-controls={controlsId || undefined}
      >
        <span className={panelStyles.sidebarInfoTitle}>
          {icon ? <Icon icon={icon} className={panelStyles.sidebarSectionTitleIcon} aria-hidden /> : null}
          <span className={panelStyles.sidebarSectionTitleText}>{title}</span>
          {count != null ? <span className={panelStyles.sidebarSectionCount}>{count}</span> : null}
        </span>
      </button>
      {actions ? <div className={panelStyles.sidebarHeaderActions}>{actions}</div> : null}
      <button
        type="button"
        className={panelStyles.sidebarCollapseChevronBtn}
        onClick={() => onToggle?.()}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Icon
          icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          className={panelStyles.sidebarCollapseChevron}
        />
      </button>
    </div>
  );
}

const ACTION_ANIM_IDS = {
  ticket: "ticket",
  event: "schedule",
  subscribe: "subscribe",
  edit: "edit"
};

export default function EquipmentDetailAside({
  equipment,
  formData: _formData = {},
  clientSites: _clientSites = [],
  modalClient: _modalClient = null,
  copy,
  checkmkMapping = null,
  remoteAccessAction = null,
  showQuickConnect = false,
  onEdit,
  onCreateEvent,
  onCreateTicket,
  onOpenEnterprise: _onOpenEnterprise,
  onRemoteAccess,
  onQuickConnect,
  onOpenSupervision,
  onRefreshCheckmk: _onRefreshCheckmk,
  onOpenCheckmkMapping,
  onRmmSync,
  onRmmAgentUpdate,
  onRmmCancelAgentUpdate,
  rmmSyncPending = false,
  rmmUpdateRequested = false,
  rmmSyncRequesting = false,
  rmmUpdateRequesting = false,
  loadingCheckMK: _loadingCheckMK = false,
  associated = [],
  onSubscribe,
  subscribed = false,
  subscribeLoading = false,
  subscribeSaving = false,
  onMaintenance,
  inMaintenance = false,
  showMaintenance = false,
  maintenanceBusy = false,
  maintenanceReason = "",
  maintenanceUntilLabel = "",
  onAlerts,
  showAlerts = false,
  alertsSuspended = false,
  alertsSuspensionType = null,
  alertsStatusLabel = "",
  variant = "full",
  fill = false
}) {
  const s = enterpriseDetailStyles;
  const alertsTone =
    alertsSuspended && alertsSuspensionType === "permanent"
      ? "danger"
      : alertsSuspended
        ? "warning"
        : null;
  const aside = copy.aside || {};
  const hero = copy.hero || {};
  const subscribeCopy = copy.subscribe || {};
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuStyle, setMoreMenuStyle] = useState(null);
  const [assocExpanded, setAssocExpanded] = useState(true);
  const moreMenuRef = useRef(null);
  const morePortalMenuRef = useRef(null);
  const rmmManaged = isRmmManagedEquipment(equipment);

  const toolbarActions = [
    onEdit
      ? {
          key: "edit",
          icon: "mdi:square-edit-outline",
          label: aside.actionEdit || "Modifier la fiche",
          onClick: onEdit
        }
      : null,
    remoteAccessAction && onRemoteAccess
      ? {
          key: "remote",
          icon: remoteAccessAction.icon || "mdi:remote-desktop",
          label: remoteAccessAction.label || aside.actionRemote || "Accéder à distance",
          onClick: onRemoteAccess
        }
      : null,
    showQuickConnect && onQuickConnect
      ? {
          key: "qc",
          icon: "mdi:link-variant",
          label: aside.actionQuickConnect || "Ouvrir QuickConnect",
          onClick: onQuickConnect
        }
      : null,
    onSubscribe
      ? {
          key: "subscribe",
          icon: subscribed ? "mdi:bell-ring-outline" : "mdi:bell-outline",
          label: subscribed
            ? subscribeCopy.unsubscribe || "Se désabonner"
            : subscribeCopy.subscribe || "S’abonner aux notifications",
          onClick: onSubscribe,
          disabled: subscribeLoading || subscribeSaving,
          pressed: subscribed
        }
      : null,
    showAlerts && onAlerts
      ? {
          key: "alerts",
          icon: "mdi:alarm-light",
          label:
            alertsSuspended && alertsStatusLabel
              ? `${aside.actionAlerts || hero.alertsAria || "Alertes"} — ${alertsStatusLabel}`
              : aside.actionAlerts || hero.alertsAria || "Alertes",
          onClick: onAlerts,
          tone: alertsTone,
          pressed: Boolean(alertsSuspended)
        }
      : null,
    rmmManaged && onRmmSync
      ? {
          key: "rmm",
          icon: rmmSyncPending ? "mdi:sync-off" : "mdi:sync",
          label: rmmSyncPending
            ? aside.actionCancelSync || "Annuler sync"
            : aside.actionSync || "Sync complet RMM",
          onClick: onRmmSync,
          disabled: rmmSyncRequesting
        }
      : null,
    rmmManaged && (rmmUpdateRequested ? onRmmCancelAgentUpdate : onRmmAgentUpdate)
      ? {
          key: "rmmUpdate",
          icon: rmmUpdateRequested ? "mdi:cloud-download-off-outline" : "mdi:cloud-download-outline",
          label: rmmUpdateRequested
            ? aside.actionCancelAgentUpdate || hero.cancelAgentUpdate || "Annuler MAJ agent"
            : aside.actionUpdateAgent || hero.updateAgent || "Mettre à jour l'agent",
          onClick: rmmUpdateRequested ? onRmmCancelAgentUpdate : onRmmAgentUpdate,
          disabled: rmmUpdateRequesting
        }
      : null,
  ].filter(Boolean);

  const contextMenuActions = [
    onCreateTicket
      ? {
          key: "ticket",
          icon: "mdi:ticket-outline",
          label: aside.actionTicket || "Créer un ticket",
          onClick: onCreateTicket
        }
      : null,
    onCreateEvent
      ? {
          key: "event",
          icon: "mdi:calendar-check-outline",
          label: aside.actionEvent || "Créer un événement",
          onClick: onCreateEvent
        }
      : null,
    showMaintenance && onMaintenance
      ? {
          key: "maintenance",
          icon: "mdi:traffic-cone",
          label: inMaintenance
            ? aside.actionEndMaintenance || hero.maintenanceEnd || "Terminer la maintenance"
            : aside.actionMaintenance || hero.maintenanceTooltip || "Mettre en maintenance",
          onClick: onMaintenance,
          disabled: maintenanceBusy
        }
      : null
  ].filter(Boolean);

  useLayoutEffect(() => {
    if (!moreMenuOpen) {
      setMoreMenuStyle(null);
      return undefined;
    }
    const updateMoreMenuPosition = () => {
      const nextStyle = getMoreMenuPosition(moreMenuRef.current, morePortalMenuRef.current);
      if (nextStyle) setMoreMenuStyle(nextStyle);
    };
    updateMoreMenuPosition();
    const raf = window.requestAnimationFrame(updateMoreMenuPosition);
    return () => window.cancelAnimationFrame(raf);
  }, [moreMenuOpen, contextMenuActions.length]);

  useEffect(() => {
    if (!moreMenuOpen) return undefined;
    const onPointerDown = event => {
      const target = event.target;
      if (moreMenuRef.current?.contains(target) || morePortalMenuRef.current?.contains(target)) return;
      setMoreMenuOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === "Escape") setMoreMenuOpen(false);
    };
    const onCloseOnMove = () => setMoreMenuOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onCloseOnMove);
    window.addEventListener("scroll", onCloseOnMove, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onCloseOnMove);
      window.removeEventListener("scroll", onCloseOnMove, true);
    };
  }, [moreMenuOpen]);

  const checkmkMapped = Boolean(checkmkMapping?.checkmk_host_name);
  const associatedItems = associated.length
    ? associated
    : [
        onOpenCheckmkMapping
          ? {
              key: "supervision",
              icon: checkmkMapped ? "mdi:radar" : "mdi:link-variant-plus",
              title: aside.assocSupervision || "Supervision",
              subtitle: checkmkMapped
                ? checkmkMapping.checkmk_host_name
                : aside.assocSupervisionUnmapped || "Non mappé — cliquer pour configurer",
              status: checkmkMapped ? "ok" : "warn",
              onClick: checkmkMapped && onOpenSupervision ? onOpenSupervision : onOpenCheckmkMapping
            }
          : null,
        rmmManaged
          ? {
              key: "rmm",
              icon: "mdi:remote-desktop",
              title: aside.assocRmm || "Agent RMM",
              subtitle: aside.assocRmmHint || "Inventaire & métriques",
              status: "ok"
            }
          : null
      ].filter(Boolean);

  const assocHeaderActions = onOpenCheckmkMapping ? (
    <button
      type="button"
      className={styles.assocMappingBtn}
      onClick={e => {
        e.stopPropagation();
        onOpenCheckmkMapping();
      }}
      title={
        checkmkMapped
          ? aside.actionMappingCheckmk || hero.mappingCheckmk || "Mapping CheckMK"
          : aside.actionMapCheckmk || hero.mapCheckmk || "Mapper CheckMK"
      }
      aria-label={
        checkmkMapped
          ? aside.actionMappingCheckmk || hero.mappingCheckmk || "Mapping CheckMK"
          : aside.actionMapCheckmk || hero.mapCheckmk || "Mapper CheckMK"
      }
    >
      <Icon icon="simple-icons:checkmk" aria-hidden />
    </button>
  ) : null;

  const renderActionButton = action => (
    <EnterpriseQuickActionButton
      key={action.key}
      actionId={ACTION_ANIM_IDS[action.key] || action.key}
      iconify={action.icon}
      className={[
        s.sidebarActionIconBtn,
        action.pressed && action.key !== "alerts" ? s.sidebarActionIconBtnActive : "",
        action.tone === "warning" ? styles.sidebarActionIconBtnWarning : "",
        action.tone === "danger" ? styles.sidebarActionIconBtnDanger : ""
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-pressed={action.pressed}
      aria-label={action.label}
      title={action.label}
      loading={Boolean(action.loading)}
      loadingClassName={s.spinning}
    />
  );

  const quickActionsSection = (
    <section
      className={`${s.sidebarSection} ${s.sidebarActionToolbarSection}`}
      data-guide="equipment-quick-actions"
      aria-label={aside.actionsTitle || "Actions rapides"}
    >
      <div className={s.sidebarActionToolbar}>
        {toolbarActions.map(renderActionButton)}
        {contextMenuActions.length ? (
          <div className={`${s.exportMenuWrap} ${styles.moreMenuWrap}`.trim()} ref={moreMenuRef}>
            <EnterpriseQuickActionButton
              actionId="more"
              iconify="mdi:dots-horizontal"
              className={s.sidebarActionIconBtn}
              onClick={() => setMoreMenuOpen(open => !open)}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              aria-label={aside.moreActions || "Plus d'actions"}
              title={aside.moreActions || "Plus d'actions"}
            />
            {moreMenuOpen && typeof document !== "undefined"
              ? createPortal(
                  <div
                    ref={morePortalMenuRef}
                    className={`${s.exportMenu} ${styles.moreMenuPortal}`.trim()}
                    style={moreMenuStyle || undefined}
                    role="menu"
                  >
                    {contextMenuActions.map(action => (
                      <button
                        key={action.key}
                        type="button"
                        role="menuitem"
                        className={s.exportMenuItem}
                        disabled={action.disabled}
                        onClick={() => {
                          setMoreMenuOpen(false);
                          action.onClick?.();
                        }}
                      >
                        <Icon icon={action.icon} className={s.exportMenuItemIcon} aria-hidden />
                        {action.label}
                      </button>
                    ))}
                  </div>,
                  document.body
                )
              : null}
          </div>
        ) : null}
      </div>
    </section>
  );

  const showNotes = variant !== "associatedOnly" && variant !== "quickActionsOnly";
  const maintenanceSection =
    inMaintenance && variant !== "quickActionsOnly" ? (
      <section
        className={`${s.sidebarSection} ${styles.asideSectionFixed} ${styles.maintenanceSection}`.trim()}
        data-guide="equipment-sidebar-maintenance"
        aria-label={aside.maintenanceTitle || hero.maintenanceBadge || "Maintenance"}
      >
        <div className={`${s.sidebarCollapseHeader} ${styles.maintenanceHeader}`.trim()}>
          <div className={styles.maintenanceHeaderMain}>
            <span className={s.sidebarInfoTitle}>
              <Icon icon="mdi:traffic-cone" className={`${s.sidebarSectionTitleIcon} ${styles.maintenanceSectionIcon}`.trim()} aria-hidden />
              <span className={s.sidebarSectionTitleText}>
                {aside.maintenanceTitle || hero.maintenanceBadge || "Maintenance"}
              </span>
            </span>
          </div>
          {onMaintenance ? (
            <div className={s.sidebarHeaderActions}>
              <button
                type="button"
                className={styles.maintenanceEndBtn}
                onClick={onMaintenance}
                disabled={maintenanceBusy}
                title={aside.actionEndMaintenance || "Terminer la maintenance"}
              >
                <Icon icon="mdi:check-circle-outline" aria-hidden />
                <span>{aside.actionEndMaintenanceShort || "Terminer"}</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className={`${s.sidebarBody} ${styles.maintenanceBody}`.trim()}>
          <div className={s.sidebarInfoFields}>
            <div className={s.sidebarInfoField}>
              <span className={s.sidebarInfoFieldLabel}>
                {aside.maintenanceReason || hero.maintenanceReasonLabel || "Motif"}
              </span>
              <span className={s.sidebarInfoFieldValue} title={maintenanceReason || undefined}>
                {maintenanceReason || aside.maintenanceReasonNone || "Non renseigné"}
              </span>
            </div>
            <div className={s.sidebarInfoField}>
              <span className={s.sidebarInfoFieldLabel}>
                {aside.maintenanceUntil || "Fin de maintenance"}
              </span>
              <span className={`${s.sidebarInfoFieldValue} ${styles.maintenanceUntilValue}`.trim()}>
                {maintenanceUntilLabel ? (
                  <>
                    <Icon icon="mdi:calendar-clock" className={styles.maintenanceUntilIcon} aria-hidden />
                    {maintenanceUntilLabel}
                  </>
                ) : (
                  aside.maintenanceUntilNone || "Non définie"
                )}
              </span>
            </div>
          </div>
        </div>
      </section>
    ) : null;
  const associatedSection =
    associatedItems.length || assocHeaderActions ? (
      <section className={`${s.sidebarSection} ${styles.asideSectionFixed}`.trim()} data-guide="equipment-sidebar-associated">
        <SidebarSectionHeader
          title={aside.assocTitle || "Associations"}
          icon="mdi:lan-connect"
          count={associatedItems.length || null}
          expanded={assocExpanded}
          onToggle={() => setAssocExpanded(prev => !prev)}
          controlsId="equipment-sidebar-associated"
          actions={assocHeaderActions}
          panelStyles={s}
        />
        {assocExpanded ? (
          <div className={`${s.sidebarBody} ${styles.assocBody}`.trim()} id="equipment-sidebar-associated">
            {associatedItems.length ? (
              <ul className={s.sidebarContactsList}>
                {associatedItems.map(item => {
                  const body = (
                    <>
                      <div className={s.sidebarContactAvatar} aria-hidden>
                        <Icon icon={item.icon} />
                      </div>
                      <div className={s.sidebarContactBody}>
                        <div className={s.sidebarContactTop}>
                          <div className={s.sidebarContactIdentity}>
                            <span className={s.sidebarContactName}>{item.title}</span>
                            {item.subtitle ? (
                              <span className={s.sidebarContactRole}>{item.subtitle}</span>
                            ) : null}
                          </div>
                          <span
                            className={`${styles.assocStatus} ${styles[`assocStatus_${item.status || "ok"}`] || ""}`.trim()}
                          >
                            {item.status === "warn"
                              ? aside.statusUnmapped || aside.statusWarn || "À mapper"
                              : item.status === "down"
                                ? aside.statusDown || "KO"
                                : aside.statusOk || "OK"}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                  return (
                    <li key={item.key}>
                      {item.onClick ? (
                        <button type="button" className={s.sidebarContactItem} onClick={item.onClick}>
                          {body}
                        </button>
                      ) : (
                        <div className={`${s.sidebarContactItem} ${styles.assocStatic}`.trim()}>
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.assocEmpty}>
                {aside.assocEmpty || "Aucune association pour ce matériel."}
              </p>
            )}
          </div>
        ) : null}
      </section>
    ) : null;

  if (variant === "quickActionsOnly") {
    return (
      <aside className={`${s.asideStack} ${s.asidePanel} ${fill ? styles.asideStackFill : ""}`.trim()}>
        <div className={s.rightSidebarContent}>{quickActionsSection}</div>
      </aside>
    );
  }

  if (variant === "associatedAndNotes" || variant === "associatedOnly") {
    if (!maintenanceSection && !associatedSection && !showNotes) return null;
    return (
      <aside className={`${s.asideStack} ${s.asidePanel} ${fill ? `${styles.asideStackFill} ${styles.asidePanelFill}` : ""}`.trim()}>
        <div className={`${s.rightSidebarContent} ${fill ? styles.asideContentFill : ""}`.trim()}>
          {maintenanceSection}
          {associatedSection}
          {showNotes ? (
            <div className={styles.notesFill}>
              <EquipmentNotesPanel equipment={equipment} variant="sidebar" defaultExpanded />
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className={`${s.asideStack} ${s.asidePanel}`} aria-label={aside.sidebarInfo || "Informations"}>
      <div className={s.rightSidebarContent}>
        {quickActionsSection}
        {maintenanceSection}
        {associatedSection}
        {showNotes ? (
          <div className={styles.notesFill}>
            <EquipmentNotesPanel equipment={equipment} variant="sidebar" defaultExpanded />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
