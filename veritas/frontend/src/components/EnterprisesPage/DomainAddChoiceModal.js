import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import {
  UiKitButton,
  uiKitLayoutsStyles as kit
} from "../UiKit";
import layout from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import styles from "./DomainsConfigModal.module.css";

export default function DomainAddChoiceModal({ open, copy, onClose, onChooseManual, onChooseIntegration }) {
  const common = useCommonCopy();
  if (!open) return null;

  const choice = copy.addChoice || {};

  return createPortal(
    <div className={`${layout.overlay} ${layout.overlayStacked}`} onClick={onClose} role="presentation">
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
            <div className={`${layout.headerIconWrap} ${styles.headerIconDns}`} aria-hidden>
              <Icon icon="mdi:plus-circle-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="domain-add-choice-title" className={layout.title}>
                {choice.title}
              </h2>
              <p className={layout.subtitle}>{choice.description}</p>
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

        <div className={`${layout.content} ${styles.choiceBody}`}>
          <div className={`${kit.contentFadeUp} ${avStyles.modeGrid} ${styles.choiceGrid}`}>
            <button type="button" className={avStyles.modeCard} onClick={onChooseManual}>
              <span className={avStyles.modeCardIcon} aria-hidden>
                <Icon icon="mdi:form-textbox" />
              </span>
              <span className={avStyles.modeCardTitle}>{choice.manualTitle}</span>
              <span className={avStyles.modeCardDesc}>{choice.manualDesc}</span>
              <span className={avStyles.modeCardAction}>
                {choice.manualAction}
                <Icon icon="mdi:chevron-right" aria-hidden />
              </span>
            </button>
            <button type="button" className={avStyles.modeCard} onClick={onChooseIntegration}>
              <span className={avStyles.modeCardIcon} aria-hidden>
                <Icon icon="mdi:cloud-sync-outline" />
              </span>
              <span className={avStyles.modeCardTitle}>{choice.integrationTitle}</span>
              <span className={avStyles.modeCardDesc}>{choice.integrationDesc}</span>
              <span className={avStyles.modeCardAction}>
                {choice.integrationAction}
                <Icon icon="mdi:chevron-right" aria-hidden />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
