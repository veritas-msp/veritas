import React from "react";
import { Icon } from "@iconify/react";
import { COMPUTER_TYPE_OPTIONS, canonicalizeComputerType } from "./equipmentFormConfig";
import { localizeTypeOptions } from "./equipmentModalsI18n";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";

export default function ComputerTypePicker({
  value,
  onChange,
  locale,
  label,
  required = false,
  disabled = false,
  compact = false
}) {
  const selected = canonicalizeComputerType(value);
  return <div className={`${styles.field} ${styles.fieldFull}`}>
      {label ? <span className={`${styles.label} ${required ? styles.labelRequired : ""}`}>
          {label}
        </span> : null}
      <div className={styles.modulesGrid} style={compact ? {
      marginTop: 0
    } : undefined}>
        {localizeTypeOptions(COMPUTER_TYPE_OPTIONS, locale, "computer").map(({
        value: optionValue,
        label: optionLabel,
        icon,
        description
      }) => <button key={optionValue} type="button" className={`${styles.moduleTile} ${selected === optionValue ? styles.moduleTileActive : ""}`} onClick={() => onChange(optionValue)} disabled={disabled} aria-pressed={selected === optionValue} title={description} style={compact ? {
        minHeight: 72,
        padding: "0.5rem 0.4rem"
      } : undefined}>
            {selected === optionValue && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
            <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
            <span className={styles.moduleTileLabel}>{optionLabel}</span>
          </button>)}
      </div>
    </div>;
}
