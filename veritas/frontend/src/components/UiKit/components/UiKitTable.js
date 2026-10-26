import UiKitScrollFadeShell from "./UiKitScrollFadeShell";
import styles from "../uiKitTable.module.css";

/**
 * Table UI Kit — même shell / fade / typo que la démo `/ui-kit`.
 * @param {boolean} fill — occupe la hauteur dispo (panneaux Accueil)
 * @param {boolean} inset — sans cadre (déjà dans une carte parent)
 */
export default function UiKitTable({
  children,
  fill = false,
  inset = false,
  className = "",
  deps = [],
  empty = null,
  fadeTop = true,
  /** Sous thead sticky — typiquement hauteur ligne en-tête tableList (2.85rem) */
  fadeTopInset = null,
  header = null,
  stableScrollbar = false
}) {
  const shellClass = [
    styles.tableShell,
    fill ? styles.tableShellFill : "",
    inset ? styles.tableShellInset : ""
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={`${styles.tableBlock}${fill ? ` ${styles.tableBlockFill}` : ""}${className ? ` ${className}` : ""}`}>
      <UiKitScrollFadeShell
        className={shellClass}
        deps={deps}
        fadeTop={fadeTop}
        fadeTopInset={fadeTopInset}
        header={header}
        stableScrollbar={stableScrollbar}
      >
        {children}
        {empty}
      </UiKitScrollFadeShell>
    </div>
  );
}

export { styles as uiKitTableStyles };
