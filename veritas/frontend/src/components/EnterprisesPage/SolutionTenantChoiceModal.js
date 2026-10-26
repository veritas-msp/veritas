import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import pickerStyles from "../EquipementPage/EquipmentAddFlowModal.module.css";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./ChoicePairModal.module.css";

export default function SolutionTenantChoiceModal({
  open,
  providerLabel = "",
  eyebrow = "",
  title,
  subtitle,
  globalConfigured = false,
  modeGlobal,
  modeDedicated,
  onChooseGlobal,
  onChooseDedicated,
  onClose
}) {
  const common = useCommonCopy();
  if (!open) return null;

  const resolvedTitle =
    title || (providerLabel ? `Connexion ${providerLabel}` : "Choisir le type de tenant");
  const globalCopy = modeGlobal || {};
  const dedicatedCopy = modeDedicated || {};

  return createPortal(
    <div
      className={`${layout.overlay} ${layout.overlayStacked}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${layout.shell} ${styles.choiceShell}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="solution-tenant-choice-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:shield-key-outline" />
            </div>
            <div className={layout.headerText}>
              {eyebrow ? <p className={layout.eyebrow}>{eyebrow}</p> : null}
              <h2 id="solution-tenant-choice-title" className={layout.title}>
                {resolvedTitle}
              </h2>
              {subtitle ? <p className={layout.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          <UiKitButton
            type="button"
            square
            variant="secondary"
            className={layout.closeBtn}
            onClick={onClose}
            aria-label={common.close}
            icon="mdi:close"
          />
        </header>

        <div className={styles.choiceBody}>
          <div
            className={`${kit.contentFadeUp} ${pickerStyles.categoryGrid} ${pickerStyles.computerTypeGrid} ${styles.choiceGrid}`}
            role="listbox"
            aria-label={resolvedTitle}
          >
            <button
              type="button"
              role="option"
              className={`${pickerStyles.categoryTile} ${styles.choiceTile}`}
              style={{ animationDelay: "40ms" }}
              onClick={() => {
                if (!globalConfigured) return;
                onChooseGlobal?.();
              }}
              disabled={!globalConfigured}
              aria-disabled={!globalConfigured}
              title={
                globalConfigured
                  ? globalCopy.descConfigured
                  : globalCopy.descNotConfigured
              }
            >
              <span className={pickerStyles.categoryIconWrap} aria-hidden>
                <Icon icon="mdi:store-cog-outline" className={pickerStyles.categoryIcon} />
              </span>
              <span className={pickerStyles.categoryLabel}>
                {globalCopy.title || "Tenant global"}
              </span>
              <span className={styles.choiceTileDesc}>
                {globalConfigured
                  ? globalCopy.descConfigured
                  : globalCopy.actionNotConfigured ||
                    globalCopy.descNotConfigured ||
                    "À activer en administration"}
              </span>
            </button>

            <button
              type="button"
              role="option"
              className={`${pickerStyles.categoryTile} ${styles.choiceTile}`}
              style={{ animationDelay: "110ms" }}
              onClick={() => onChooseDedicated?.()}
            >
              <span className={pickerStyles.categoryIconWrap} aria-hidden>
                <Icon icon="mdi:shield-key-outline" className={pickerStyles.categoryIcon} />
              </span>
              <span className={pickerStyles.categoryLabel}>
                {dedicatedCopy.title || "Tenant dédié"}
              </span>
              <span className={styles.choiceTileDesc}>
                {dedicatedCopy.description}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
