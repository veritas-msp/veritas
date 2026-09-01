import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../../hooks/useAppLocale";
import equipmentStyles from "../../EquipementPage/EquipmentPage.module.css";
import {
  getReportRemoteAccessAction,
  getReportRemoteAccessAriaLabel,
  getReportRemoteAccessTitle
} from "./reportEquipmentRemoteAccess";

export default function ReportEquipmentRemoteAccessButton({
  equipment,
  moduleKey
}) {
  const locale = useAppLocale();
  const action = useMemo(() => getReportRemoteAccessAction(equipment, moduleKey), [equipment, moduleKey]);
  if (!action) return null;
  const title = getReportRemoteAccessTitle(action, locale);
  const ariaLabel = getReportRemoteAccessAriaLabel(action, locale);
  return <button type="button" className={`${equipmentStyles.mappingActionButton} ${equipmentStyles.mappingActionButtonRemoteActive}`} title={title} aria-label={ariaLabel} onClick={event => {
    event.preventDefault();
    event.stopPropagation();
    action.onClick();
  }}>
      <Icon icon={action.icon} width={16} height={16} />
    </button>;
}
