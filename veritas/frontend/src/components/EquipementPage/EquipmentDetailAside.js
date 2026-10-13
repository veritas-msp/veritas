import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import enterpriseDetailStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import { findClientSiteByLocation, getSiteDisplayName } from "../../utils/clientSites";
import { getClientNameWithoutCode, getClientNumber } from "../../utils/clientDisplay";
import { getEquipmentClientId } from "../../utils/equipmentIdentity";
import {
  getRmmChassisInfo,
  getRmmInventoryFromEquipment,
  getRmmOsEditionInfo,
  isRmmManagedEquipment
} from "./rmmMonitoringUtils";
import EquipmentNotesPanel from "./EquipmentNotesPanel";
import styles from "./EquipmentDetailAside.module.css";

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

export default function EquipmentDetailAside({
  equipment,
  formData = {},
  clientSites = [],
  modalClient = null,
  copy,
  checkmkMapping = null,
  remoteAccessAction = null,
  showQuickConnect = false,
  onEdit,
  onCreateEvent,
  onCreateTicket,
  onOpenEnterprise,
  onRemoteAccess,
  onQuickConnect,
  onOpenSupervision,
  onRefreshCheckmk,
  onOpenCheckmkMapping,
  onRmmSync,
  onRmmAgentUpdate,
  onRmmCancelAgentUpdate,
  rmmSyncPending = false,
  rmmUpdateRequested = false,
  rmmSyncRequesting = false,
  rmmUpdateRequesting = false,
  loadingCheckMK = false,
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
  showAlerts = false
}) {
  const s = enterpriseDetailStyles;
  const aside = copy.aside || {};
  const hero = copy.hero || {};
  const subscribeCopy = copy.subscribe || {};
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [assocExpanded, setAssocExpanded] = useState(true);
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const osInfo = useMemo(() => getRmmOsEditionInfo(inventory, equipment), [inventory, equipment]);
  const chassis = useMemo(() => getRmmChassisInfo(inventory), [inventory]);
  const site = findClientSiteByLocation(clientSites, formData.location || equipment?.location);
  const siteLabel = getSiteDisplayName(site) || formData.location || equipment?.location || null;
  const ip = equipment?.ip || formData.ip || inventory?.network?.ip || null;
  const name = equipment?.name || formData.name || "—";
  const enterpriseId = getEquipmentClientId(equipment) || equipment?.clientId;
  const enterpriseName = equipment?.clientName || modalClient?.name || "";
  const enterpriseClient =
    modalClient && String(modalClient.id) === String(enterpriseId)
      ? modalClient
      : {
          id: enterpriseId,
          name: enterpriseName,
          client_number: equipment?.clientNumber ?? equipment?.client_number,
          clientNumber: equipment?.clientNumber ?? equipment?.client_number
        };
  const enterpriseCode = getClientNumber(enterpriseClient);
  const enterpriseLabel = getClientNameWithoutCode(enterpriseClient) || enterpriseName || null;
  const rmmManaged = isRmmManagedEquipment(equipment);
  const reason = String(maintenanceReason || "").trim();

  const detailRows = [
    { key: "name", label: aside.fieldName || "Nom", value: name },
    inMaintenance
      ? {
          key: "maintenance",
          label: aside.fieldMaintenance || hero.maintenanceBadge || "En maintenance",
          value: maintenanceUntilLabel
            ? `Jusqu’au ${maintenanceUntilLabel}`
            : hero.maintenanceBadge || "En maintenance"
        }
      : null,
    inMaintenance && reason
      ? {
          key: "maintenanceReason",
          label: aside.fieldMaintenanceReason || hero.maintenanceReasonLabel || "Motif",
          value: reason
        }
      : null,
    ip ? { key: "ip", label: aside.fieldIp || "IP", value: ip, mono: true } : null,
    siteLabel ? { key: "site", label: aside.fieldSite || "Site", value: siteLabel } : null,
    enterpriseLabel
      ? {
          key: "enterprise",
          label: aside.fieldEnterprise || "Entreprise",
          value: enterpriseCode ? `${enterpriseCode} · ${enterpriseLabel}` : enterpriseLabel,
          onClick: enterpriseId && onOpenEnterprise ? onOpenEnterprise : null
        }
      : null,
    osInfo.osCaption || formData.systeme
      ? {
          key: "os",
          label: aside.fieldOs || "OS",
          value: osInfo.osCaption || formData.systeme
        }
      : null,
    chassis.manufacturer || formData.manufacturer
      ? {
          key: "mfr",
          label: aside.fieldManufacturer || "Fabricant",
          value: chassis.manufacturer || formData.manufacturer
        }
      : null,
    chassis.model || formData.model
      ? {
          key: "model",
          label: aside.fieldModel || "Modèle",
          value: chassis.model || formData.model
        }
      : null,
    chassis.serial || formData.serial
      ? {
          key: "serial",
          label: aside.fieldSerial || "N° de série",
          value: chassis.serial || formData.serial,
          mono: true
        }
      : null
  ].filter(Boolean);

  const primaryActions = [
    onCreateTicket
      ? {
          key: "ticket",
          icon: "mdi:ticket-outline",
          label: aside.actionTicket || "Ouvrir un ticket",
          onClick: onCreateTicket
        }
      : null,
    onCreateEvent
      ? {
          key: "event",
          icon: "mdi:calendar-plus-outline",
          label: aside.actionEvent || "Planifier une intervention",
          onClick: onCreateEvent
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
          icon: subscribed ? "mdi:bell-ring" : "mdi:bell-outline",
          label: subscribed
            ? subscribeCopy.unsubscribe || "Se désabonner"
            : subscribeCopy.subscribe || "S’abonner aux notifications",
          onClick: onSubscribe,
          disabled: subscribeLoading || subscribeSaving,
          pressed: subscribed
        }
      : null,
    onEdit
      ? {
          key: "edit",
          icon: "mdi:pencil-outline",
          label: aside.actionEdit || "Modifier la fiche",
          onClick: onEdit
        }
      : null
  ].filter(Boolean);

  const secondaryActions = [
    showMaintenance && onMaintenance
      ? {
          key: "maintenance",
          icon: "mdi:traffic-cone",
          label: inMaintenance
            ? aside.actionEndMaintenance || hero.maintenanceEnd || "Terminer la maintenance"
            : aside.actionMaintenance || hero.maintenanceTooltip || "Mettre en maintenance",
          onClick: onMaintenance,
          disabled: maintenanceBusy,
          pressed: inMaintenance
        }
      : null,
    showAlerts && onAlerts
      ? {
          key: "alerts",
          icon: "mdi:alarm-light",
          label: aside.actionAlerts || hero.alertsAria || "Alertes",
          onClick: onAlerts
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
    checkmkMapping?.checkmk_host_name && onRefreshCheckmk
      ? {
          key: "checkmk",
          icon: "mdi:radar",
          label: aside.actionRefreshCheckmk || "Actualiser CheckMK",
          onClick: onRefreshCheckmk,
          disabled: loadingCheckMK
        }
      : null,
    onOpenCheckmkMapping
      ? {
          key: "checkmkMap",
          icon: "simple-icons:checkmk",
          label: checkmkMapping?.checkmk_host_name
            ? aside.actionMappingCheckmk || hero.mappingCheckmk || "Mapping CheckMK"
            : aside.actionMapCheckmk || hero.mapCheckmk || "Mapper CheckMK",
          onClick: onOpenCheckmkMapping
        }
      : null,
    onOpenSupervision && checkmkMapping?.checkmk_host_name
      ? {
          key: "supervision",
          icon: "mdi:monitor-eye",
          label: aside.actionSupervision || "Voir la supervision",
          onClick: onOpenSupervision
        }
      : null
  ].filter(Boolean);

  const visibleActions = actionsExpanded ? [...primaryActions, ...secondaryActions] : primaryActions;
  const hasSecondary = secondaryActions.length > 0;

  const associatedItems = associated.length
    ? associated
    : [
        checkmkMapping?.checkmk_host_name
          ? {
              key: "supervision",
              icon: "mdi:radar",
              title: aside.assocSupervision || "Supervision",
              subtitle: checkmkMapping.checkmk_host_name,
              status: "ok",
              onClick: onOpenSupervision
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

  return (
    <div className={s.asideStack}>
      <section
        className={s.quickActionsCard}
        data-guide="equipment-quick-actions"
        aria-label={aside.actionsTitle || "Actions rapides"}
      >
        <h3 className={s.quickActionsTitle}>{aside.actionsTitle || "Actions rapides"}</h3>
        <ul className={s.quickActionsList}>
          {visibleActions.map(action => (
            <li key={action.key}>
              <button
                type="button"
                className={s.quickActionItem}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-pressed={action.pressed}
              >
                <span className={s.quickActionIcon} aria-hidden>
                  <Icon icon={action.icon} />
                </span>
                <span className={s.quickActionLabel}>{action.label}</span>
                <Icon icon="mdi:chevron-right" className={s.quickActionChevron} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {hasSecondary ? (
          <button
            type="button"
            className={s.quickActionsSeeAll}
            onClick={() => setActionsExpanded(prev => !prev)}
          >
            {aside.seeAll || "Voir toutes les actions"}
            <Icon icon={actionsExpanded ? "mdi:chevron-up" : "mdi:arrow-right"} aria-hidden />
          </button>
        ) : null}
      </section>

      <aside className={s.asidePanel}>
        <div className={s.rightSidebarContent}>
          <section className={s.sidebarSection} data-guide="equipment-sidebar-info">
            <SidebarSectionHeader
              title={aside.infoTitle || "Informations détaillées"}
              icon="mdi:information-outline"
              expanded={infoExpanded}
              onToggle={() => setInfoExpanded(prev => !prev)}
              controlsId="equipment-sidebar-info"
              panelStyles={s}
            />
            {infoExpanded ? (
              <div className={s.sidebarSummaryList} id="equipment-sidebar-info">
                {detailRows.map(row => (
                  <div key={row.key} className={s.sidebarSummaryItem}>
                    <span className={s.sidebarSummaryLabel}>{row.label}</span>
                    {row.onClick ? (
                      <button
                        type="button"
                        className={`${s.sidebarSummaryValue} ${styles.summaryLink} ${row.mono ? styles.mono : ""}`.trim()}
                        onClick={row.onClick}
                      >
                        {row.value}
                      </button>
                    ) : (
                      <span
                        className={`${s.sidebarSummaryValue} ${row.mono ? styles.mono : ""}`.trim()}
                      >
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {associatedItems.length ? (
            <section className={s.sidebarSection} data-guide="equipment-sidebar-associated">
              <SidebarSectionHeader
                title={aside.assocTitle || "Équipements associés"}
                icon="mdi:lan-connect"
                count={associatedItems.length}
                expanded={assocExpanded}
                onToggle={() => setAssocExpanded(prev => !prev)}
                controlsId="equipment-sidebar-associated"
                panelStyles={s}
              />
              {assocExpanded ? (
                <div className={s.sidebarBody} id="equipment-sidebar-associated">
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
                                  ? aside.statusWarn || "Warn"
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
                </div>
              ) : null}
            </section>
          ) : null}

          <EquipmentNotesPanel equipment={equipment} variant="sidebar" defaultExpanded={false} />
        </div>
      </aside>
    </div>
  );
}
