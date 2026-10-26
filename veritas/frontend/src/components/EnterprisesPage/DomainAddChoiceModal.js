import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import pickerStyles from "../EquipementPage/EquipmentAddFlowModal.module.css";
import layout from "./EnterpriseFormModal.module.css";
import dnsStyles from "./DomainsConfigModal.module.css";
import styles from "./ChoicePairModal.module.css";

export default function DomainAddChoiceModal({
  open,
  copy,
  onClose,
  onChooseManual,
  onChooseIntegration,
  integrationAvailable = false
}) {
  const common = useCommonCopy();
  if (!open) return null;

  const choice = copy.addChoice || {};

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
        aria-labelledby="domain-add-choice-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={`${layout.headerIconWrap} ${dnsStyles.headerIconDns}`} aria-hidden>
              <Icon icon="mdi:plus-circle-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="domain-add-choice-title" className={layout.title}>
                {choice.title || "Ajouter un nom de domaine"}
              </h2>
              {choice.description ? (
                <p className={layout.subtitle}>{choice.description}</p>
              ) : null}
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
            aria-label={choice.title || "Mode d'ajout"}
          >
            <button
              type="button"
              role="option"
              className={`${pickerStyles.categoryTile} ${styles.choiceTile}`}
              style={{ animationDelay: "40ms" }}
              onClick={onChooseManual}
            >
              <span className={pickerStyles.categoryIconWrap} aria-hidden>
                <Icon icon="mdi:form-textbox" className={pickerStyles.categoryIcon} />
              </span>
              <span className={pickerStyles.categoryLabel}>
                {choice.manualTitle || "Ajout manuel"}
              </span>
              <span className={styles.choiceTileDesc}>
                {choice.manualDesc || "Saisir le nom, le registrar et la date d'expiration."}
              </span>
            </button>

            <button
              type="button"
              role="option"
              className={`${pickerStyles.categoryTile} ${styles.choiceTile}`}
              style={{ animationDelay: "110ms" }}
              onClick={() => {
                if (!integrationAvailable) return;
                onChooseIntegration?.();
              }}
              disabled={!integrationAvailable}
              aria-disabled={!integrationAvailable}
              title={
                integrationAvailable
                  ? choice.integrationDesc
                  : copy.provider?.globalNotActive ||
                    "Activez une intégration registrar en administration"
              }
            >
              <span className={pickerStyles.categoryIconWrap} aria-hidden>
                <Icon icon="mdi:cloud-sync-outline" className={pickerStyles.categoryIcon} />
              </span>
              <span className={pickerStyles.categoryLabel}>
                {choice.integrationTitle || "Via une intégration"}
              </span>
              <span className={styles.choiceTileDesc}>
                {integrationAvailable
                  ? choice.integrationDesc ||
                    "Importer depuis un registrar connecté (OVH…)."
                  : copy.provider?.activateInAdmin || "À activer en administration"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
