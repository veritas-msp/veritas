import styles from "../uiKitPrimitives.module.css";

const VARIANT_CLASS = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger
};

const SQUARE_VARIANT_CLASS = {
  primary: styles.btnSquarePrimary,
  secondary: styles.btnSquareSecondary
};

export default function UiKitButton({
  variant = "secondary",
  square = false,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const base = square ? styles.btnSquare : styles.btn;
  const tone = square
    ? SQUARE_VARIANT_CLASS[variant] || SQUARE_VARIANT_CLASS.secondary
    : VARIANT_CLASS[variant] || VARIANT_CLASS.secondary;
  return (
    <button
      type={type}
      className={`${base} ${tone}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
