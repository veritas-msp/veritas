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
import styles from "./EquipmentDetailAside.module.css";

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
  const aside = copy.aside || {};
  const hero = copy.hero || {};
  const subscribeCopy = copy.subscribe || {};
  const [expanded, setExpanded] = useState(false);
  const inventory = useMemo(() => getRmmInventoryFromEquipment(equipment), [equipment]);
  const osInfo = useMemo(() => getRmmOsEditionInfo(inventory, equipment), [inventory, equipment]);
  const chassis = useMemo(() => getRmmChassisInfo(inventory), [inventory]);
  const site = findClientSiteByLocation(clientSites, formData.location || equipment?.location);
  const siteLabel = getSiteDisplayName(site) || formData.location || equipment?.location || null;
  const ip = equipment?.ip || formData.ip || inventory?.network?.ip || null;
  const name = equipment?.name || formData.name || "—";
  const enterpriseId = getEquipmentClientId(equipment) || equipment?.clientId;
  const enterpriseName = equipment?.clientName || modalClient?.name || "";
  const enterpriseClient = modalClient && String(modalClient.id) === String(enterpriseId) ? modalClient : {
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
    enterpriseLabel ? {
      key: "enterprise",
      label: aside.fieldEnterprise || "Entreprise",
      value: enterpriseCode ? `${enterpriseCode} · ${enterpriseLabel}` : enterpriseLabel,
      onClick: enterpriseId && onOpenEnterprise ? onOpenEnterprise : null
    } : null,
    (osInfo.osCaption || formData.systeme) ? {
      key: "os",
      label: aside.fieldOs || "OS",
      value: osInfo.osCaption || formData.systeme
    } : null,
    (chassis.manufacturer || formData.manufacturer) ? {
      key: "mfr",
      label: aside.fieldManufacturer || "Fabricant",
      value: chassis.manufacturer || formData.manufacturer
    } : null,
    (chassis.model || formData.model) ? {
      key: "model",
      label: aside.fieldModel || "Modèle",
      value: chassis.model || formData.model
    } : null,
    (chassis.serial || formData.serial) ? {
      key: "serial",
      label: aside.fieldSerial || "N° de série",
      value: chassis.serial || formData.serial,
      mono: true
    } : null
  ].filter(Boolean);

  const primaryActions = [
    onCreateTicket ? {
      key: "ticket",
      icon: "mdi:ticket-outline",
      label: aside.actionTicket || "Ouvrir un ticket",
      onClick: onCreateTicket
    } : null,
    onCreateEvent ? {
      key: "event",
      icon: "mdi:calendar-plus-outline",
      label: aside.actionEvent || "Planifier une intervention",
      onClick: onCreateEvent
    } : null,
    remoteAccessAction && onRemoteAccess ? {
      key: "remote",
      icon: remoteAccessAction.icon || "mdi:remote-desktop",
      label: remoteAccessAction.label || aside.actionRemote || "Accéder à distance",
      onClick: onRemoteAccess
    } : null,
    onSubscribe ? {
      key: "subscribe",
      icon: subscribed ? "mdi:bell-ring" : "mdi:bell-outline",
      label: subscribed
        ? subscribeCopy.unsubscribe || "Se désabonner"
        : subscribeCopy.subscribe || "S’abonner aux notifications",
      onClick: onSubscribe,
      disabled: subscribeLoading || subscribeSaving,
      pressed: subscribed
    } : null,
    onEdit ? {
      key: "edit",
      icon: "mdi:pencil-outline",
      label: aside.actionEdit || "Modifier la fiche",
      onClick: onEdit
    } : null
  ].filter(Boolean);

  const secondaryActions = [
    showQuickConnect && onQuickConnect ? {
      key: "qc",
      icon: "mdi:link-variant",
      label: aside.actionQuickConnect || "Ouvrir QuickConnect",
      onClick: onQuickConnect
    } : null,
    showMaintenance && onMaintenance ? {
      key: "maintenance",
      icon: "mdi:traffic-cone",
      label: inMaintenance
        ? aside.actionEndMaintenance || hero.maintenanceEnd || "Terminer la maintenance"
        : aside.actionMaintenance || hero.maintenanceTooltip || "Mettre en maintenance",
      onClick: onMaintenance,
      disabled: maintenanceBusy,
      pressed: inMaintenance
    } : null,
    showAlerts && onAlerts ? {
      key: "alerts",
      icon: "mdi:alarm-light",
      label: aside.actionAlerts || hero.alertsAria || "Alertes",
      onClick: onAlerts
    } : null,
    rmmManaged && onRmmSync ? {
      key: "rmm",
      icon: rmmSyncPending ? "mdi:sync-off" : "mdi:sync",
      label: rmmSyncPending
        ? aside.actionCancelSync || "Annuler sync"
        : aside.actionSync || "Sync complet RMM",
      onClick: onRmmSync,
      disabled: rmmSyncRequesting
    } : null,
    rmmManaged && (rmmUpdateRequested ? onRmmCancelAgentUpdate : onRmmAgentUpdate) ? {
      key: "rmmUpdate",
      icon: rmmUpdateRequested ? "mdi:cloud-download-off-outline" : "mdi:cloud-download-outline",
      label: rmmUpdateRequested
        ? aside.actionCancelAgentUpdate || hero.cancelAgentUpdate || "Annuler MAJ agent"
        : aside.actionUpdateAgent || hero.updateAgent || "Mettre à jour l'agent",
      onClick: rmmUpdateRequested ? onRmmCancelAgentUpdate : onRmmAgentUpdate,
      disabled: rmmUpdateRequesting
    } : null,
    checkmkMapping?.checkmk_host_name && onRefreshCheckmk ? {
      key: "checkmk",
      icon: "mdi:radar",
      label: aside.actionRefreshCheckmk || "Actualiser CheckMK",
      onClick: onRefreshCheckmk,
      disabled: loadingCheckMK
    } : null,
    onOpenCheckmkMapping ? {
      key: "checkmkMap",
      icon: "simple-icons:checkmk",
      label: checkmkMapping?.checkmk_host_name
        ? aside.actionMappingCheckmk || hero.mappingCheckmk || "Mapping CheckMK"
        : aside.actionMapCheckmk || hero.mapCheckmk || "Mapper CheckMK",
      onClick: onOpenCheckmkMapping
    } : null,
    onOpenSupervision && checkmkMapping?.checkmk_host_name ? {
      key: "supervision",
      icon: "mdi:monitor-eye",
      label: aside.actionSupervision || "Voir la supervision",
      onClick: onOpenSupervision
    } : null
  ].filter(Boolean);

  const visibleActions = expanded ? [...primaryActions, ...secondaryActions] : primaryActions;
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
    <div className={`${enterpriseDetailStyles.asideStack} ${styles.asideStack}`}>
      <section
        className={`${enterpriseDetailStyles.quickActionsCard} ${styles.quickCard}`}
        data-guide="equipment-quick-actions"
        aria-label={aside.actionsTitle || "Actions rapides"}
      >
        <h3 className={enterpriseDetailStyles.quickActionsTitle}>
          {aside.actionsTitle || "Actions rapides"}
        </h3>
        <ul className={enterpriseDetailStyles.quickActionsList}>
          {visibleActions.map(action => (
            <li key={action.key}>
              <button
                type="button"
                className={enterpriseDetailStyles.quickActionItem}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-pressed={action.pressed}
              >
                <span className={enterpriseDetailStyles.quickActionIcon} aria-hidden>
                  <Icon icon={action.icon} />
                </span>
                <span className={enterpriseDetailStyles.quickActionLabel}>{action.label}</span>
                <Icon icon="mdi:chevron-right" className={enterpriseDetailStyles.quickActionChevron} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {hasSecondary ? (
          <button
            type="button"
            className={enterpriseDetailStyles.quickActionsSeeAll}
            onClick={() => setExpanded(prev => !prev)}
          >
            {aside.seeAll || "Voir toutes les actions"}
            <Icon icon={expanded ? "mdi:chevron-up" : "mdi:arrow-right"} aria-hidden />
          </button>
        ) : null}
      </section>

      <section className={styles.card} aria-label={aside.infoTitle || "Informations détaillées"}>
        <header className={styles.cardHead}>
          <h3 className={styles.cardTitle}>{aside.infoTitle || "Informations détaillées"}</h3>
        </header>
        <dl className={styles.kvList}>
          {detailRows.map(row => (
            <div key={row.key} className={styles.kvRow}>
              <dt>{row.label}</dt>
              <dd>
                {row.onClick ? (
                  <button type="button" className={`${styles.kvLink} ${row.mono ? styles.mono : ""}`} onClick={row.onClick}>
                    {row.value}
                  </button>
                ) : (
                  <span className={row.mono ? styles.mono : undefined}>{row.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {associatedItems.length ? (
        <section className={styles.card} aria-label={aside.assocTitle || "Équipements associés"}>
          <header className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{aside.assocTitle || "Équipements associés"}</h3>
          </header>
          <ul className={styles.assocList}>
            {associatedItems.map(item => {
              const body = (
                <>
                  <span className={styles.assocIcon} aria-hidden>
                    <Icon icon={item.icon} />
                  </span>
                  <span className={styles.assocText}>
                    <span className={styles.assocTitle}>{item.title}</span>
                    {item.subtitle ? <span className={styles.assocSub}>{item.subtitle}</span> : null}
                  </span>
                  <span className={`${styles.assocStatus} ${styles[`assocStatus_${item.status || "ok"}`] || ""}`}>
                    {item.status === "warn"
                      ? aside.statusWarn || "Warn"
                      : item.status === "down"
                        ? aside.statusDown || "KO"
                        : aside.statusOk || "OK"}
                  </span>
                </>
              );
              return (
                <li key={item.key}>
                  {item.onClick ? (
                    <button type="button" className={styles.assocItem} onClick={item.onClick}>
                      {body}
                    </button>
                  ) : (
                    <div className={styles.assocItemStatic}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
