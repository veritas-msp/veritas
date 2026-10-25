import { Icon } from "@iconify/react";
import styles from "../uiKitForms.module.css";

export function UiKitInput({
  className = "",
  size = "l",
  ...rest
}) {
  const sizeClass =
    size === "s" ? styles.inputS : size === "m" ? styles.inputM : size === "xl" ? styles.inputXl : "";
  return (
    <input
      className={`${styles.input}${sizeClass ? ` ${sizeClass}` : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}

export function UiKitTextarea({ className = "", ...rest }) {
  return <textarea className={`${styles.textarea}${className ? ` ${className}` : ""}`} {...rest} />;
}

export default function UiKitField({
  label,
  hint,
  error,
  required = false,
  icon = null,
  htmlFor,
  children,
  className = "",
  full = false
}) {
  return (
    <div
      className={`${styles.formField}${full ? ` ${styles.formFieldFull}` : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {label ? (
        <label
          className={`${styles.fieldLabel}${required ? ` ${styles.fieldLabelRequired}` : ""}`}
          htmlFor={htmlFor}
        >
          {label}
        </label>
      ) : null}
      {icon ? (
        <div className={styles.iconField}>
          <span className={styles.iconFieldLead} aria-hidden>
            <Icon icon={icon} />
          </span>
          {children}
        </div>
      ) : (
        children
      )}
      {hint && !error ? <p className={styles.fieldHint}>{hint}</p> : null}
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}

export function UiKitPreviewBox({ children, className = "" }) {
  return <div className={`${styles.previewBox}${className ? ` ${className}` : ""}`}>{children}</div>;
}
