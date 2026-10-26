import React, { useRef } from "react";
import { Icon } from "@iconify/react";
import { COMPUTER_TYPE_OPTIONS, canonicalizeComputerType } from "./equipmentFormConfig";
import { localizeTypeOptions } from "./equipmentModalsI18n";
import EquipmentHoverIcon, { COMPUTER_TYPE_ANIMATED } from "./EquipmentHoverIcon";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import pickerStyles from "./EquipmentAddFlowModal.module.css";

function ComputerTypeTile({
  optionValue,
  optionLabel,
  icon,
  description,
  selected,
  disabled,
  compact,
  index = 0,
  onSelect,
}) {
  const animRef = useRef(null);
  const Animated = COMPUTER_TYPE_ANIMATED[optionValue] || null;

  return (
    <button
      type="button"
      role="option"
      className={`${pickerStyles.categoryTile} ${selected ? pickerStyles.categoryTileActive : ""}`}
      onClick={() => onSelect(selected ? "" : optionValue)}
      onMouseEnter={() => animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
      disabled={disabled}
      aria-pressed={selected}
      aria-selected={selected}
      title={description}
      style={{
        animationDelay: `${Math.min(index, 12) * 28}ms`,
        ...(compact ? { minHeight: "5.5rem", minWidth: 0, padding: "0.55rem 0.4rem" } : null),
      }}
    >
      {selected ? <Icon icon="mdi:check-circle" className={pickerStyles.categoryCheck} aria-hidden /> : null}
      <span
        className={pickerStyles.categoryIconWrap}
        aria-hidden
        style={compact ? { width: "2.1rem", height: "2.1rem" } : undefined}
      >
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={icon}
          size={compact ? 22 : 26}
          className={pickerStyles.categoryIcon}
          animRef={animRef}
        />
      </span>
      <span className={pickerStyles.categoryLabel}>{optionLabel}</span>
    </button>
  );
}

export default function ComputerTypePicker({
  value,
  onChange,
  locale,
  label,
  required = false,
  disabled = false,
  compact = false,
}) {
  const selected = canonicalizeComputerType(value);
  return (
    <div className={`${styles.field} ${styles.fieldFull}`}>
      {label ? (
        <span className={`${styles.label} ${required ? styles.labelRequired : ""}`}>
          {label}
        </span>
      ) : null}
      <div
        className={`${pickerStyles.categoryGrid} ${pickerStyles.computerTypeGrid}`}
        style={compact ? { marginTop: 0, gap: "0.5rem" } : { marginTop: "0.35rem" }}
        role="listbox"
        aria-label={label || "Type"}
      >
        {localizeTypeOptions(COMPUTER_TYPE_OPTIONS, locale, "computer").map(({
          value: optionValue,
          label: optionLabel,
          icon,
          description,
        }, index) => (
          <ComputerTypeTile
            key={optionValue}
            optionValue={optionValue}
            optionLabel={optionLabel}
            icon={icon}
            description={description}
            selected={selected === optionValue}
            disabled={disabled}
            compact={compact}
            index={index}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  );
}
