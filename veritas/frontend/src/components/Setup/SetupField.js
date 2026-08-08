import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import styles from "./SetupWizard.module.css";
export default function SetupField({
  id,
  label,
  hint,
  example,
  children
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const tooltipId = useId();
  const hasHelp = Boolean(hint || example);
  const fieldControl = Children.map(children, child => {
    if (!isValidElement(child) || !hasHelp) return child;
    const existing = child.props["aria-describedby"];
    const describedBy = [existing, tooltipId].filter(Boolean).join(" ");
    return cloneElement(child, {
      "aria-describedby": describedBy || undefined
    });
  });
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
  return <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id}>{label}</label>
        {hasHelp && <span ref={wrapRef} className={`${styles.fieldHelpWrap} ${open ? styles.fieldHelpOpen : ""}`}>
            <button type="button" className={styles.fieldHelpBtn} tabIndex={-1} aria-label={label} aria-describedby={tooltipId} aria-expanded={open} onClick={() => setOpen(v => !v)}>
              <Icon icon="mdi:information-outline" width={16} height={16} />
            </button>
            <span id={tooltipId} className={styles.fieldTooltip} role="tooltip">
              {hint && <span className={styles.fieldTooltipText}>{hint}</span>}
              {example && <span className={styles.fieldTooltipExample}>{example}</span>}
            </span>
          </span>}
      </div>
      {fieldControl}
    </div>;
}
