import { useRef } from "react";
import { Icon } from "@iconify/react";
import {
  BugIcon,
  CircleHelpIcon,
  HeartHandshakeIcon,
  RefreshCCWIcon,
  TicketIcon,
  ZapIcon
} from "../Misc/Sidebar/lucideAnimated";
import styles from "./TicketCreateWizard.module.css";

const TICKET_TYPE_ANIMATED_ICONS = {
  incident: ZapIcon,
  demande: HeartHandshakeIcon,
  probleme: BugIcon,
  changement: RefreshCCWIcon
};

function WizardTypeCard({ item, index, selected, disabled, onPick, fallbackIcon }) {
  const iconRef = useRef(null);
  const AnimatedIcon = TICKET_TYPE_ANIMATED_ICONS[item.key] || null;

  return (
    <button
      type="button"
      role="listitem"
      className={`${styles.typeCard} ${selected ? styles.typeCardSelected : ""}`.trim()}
      style={{ "--card-i": index }}
      disabled={disabled}
      aria-pressed={selected || undefined}
      onClick={() => onPick(item)}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <span className={styles.typeIcon} aria-hidden>
        {AnimatedIcon ? (
          <AnimatedIcon ref={iconRef} className={styles.typeIconGlyph} size={28} />
        ) : (
          <Icon icon={item.icon || fallbackIcon} className={styles.typeIconGlyph} aria-hidden />
        )}
      </span>
      <span className={styles.typeBody}>
        <span className={styles.typeTitle}>{item.label}</span>
        {item.hint ? <span className={styles.typeDesc}>{item.hint}</span> : null}
      </span>
    </button>
  );
}

function WizardFormCard({ form, index, selected, disabled, onPick }) {
  return (
    <button
      type="button"
      role="listitem"
      className={`${styles.typeCard} ${selected ? styles.typeCardSelected : ""}`.trim()}
      style={{ "--card-i": index }}
      disabled={disabled}
      aria-pressed={selected || undefined}
      onClick={() => onPick(form)}
    >
      <span className={styles.typeIcon} aria-hidden>
        <Icon icon={form.icon || "mdi:file-document-outline"} className={styles.typeIconGlyph} />
      </span>
      <span className={styles.typeBody}>
        <span className={styles.typeTitle}>{form.label}</span>
        {form.description ? <span className={styles.typeDesc}>{form.description}</span> : null}
      </span>
    </button>
  );
}

export default function TicketCreateWizard({
  copy,
  step,
  ticketTypes,
  forms,
  loading,
  selectedTypeKey,
  selectedFormId,
  formLocked,
  onPickType,
  onPickForm,
  onBackToType,
  onExit
}) {
  const wizard = copy.wizard || {};
  const selectedType = (ticketTypes || []).find(item => item.key === selectedTypeKey) || null;
  const SelectedTypeIcon = selectedType
    ? TICKET_TYPE_ANIMATED_ICONS[selectedType.key] || CircleHelpIcon
    : null;

  if (step === "type") {
    return (
      <div className={styles.picker} data-guide="ticket-wizard">
        <section key="type" className={`${styles.stage} ${styles.typeStage} ${styles.stageFade}`} data-guide="ticket-types">
          <header className={styles.typeHero}>
            <h2 className={styles.typeHeroTitle}>
              <span className={styles.typeHeroTitleText}>{wizard.typeTitle}</span>
              <img
                className={styles.typeHeroEmoji}
                src="/assets/emoji/ticket.webp"
                alt=""
                draggable={false}
                onError={event => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </h2>
            {wizard.typeHint ? <p className={styles.typeHeroHint}>{wizard.typeHint}</p> : null}
          </header>

          <div className={styles.typeGrid} role="list">
            {(ticketTypes || []).map((item, index) => (
              <WizardTypeCard
                key={item.key}
                item={item}
                index={index}
                selected={item.key === selectedTypeKey}
                disabled={formLocked && item.key !== selectedTypeKey}
                onPick={onPickType}
                fallbackIcon="mdi:ticket-outline"
              />
            ))}
          </div>

          {typeof onExit === "function" ? (
            <button type="button" className={styles.backBtn} onClick={onExit}>
              <Icon icon="mdi:arrow-left" aria-hidden />
              {wizard.back || copy.back}
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.picker} data-guide="ticket-wizard">
      <section key="form" className={`${styles.stage} ${styles.typeStage} ${styles.stageFade}`} data-guide="ticket-forms">
        <header className={styles.typeHero}>
          <h2 className={styles.typeHeroTitle}>
            <span className={styles.typeHeroTitleText}>{wizard.formTitle}</span>
            <img
              className={styles.typeHeroEmoji}
              src="/assets/emoji/clipboard.webp"
              alt=""
              draggable={false}
              onError={event => {
                event.currentTarget.style.display = "none";
              }}
            />
          </h2>
          {wizard.formHint ? <p className={styles.typeHeroHint}>{wizard.formHint}</p> : null}
          {selectedType ? (
            <span className={styles.contextChip}>
              <span className={styles.contextChipIcon} aria-hidden>
                {SelectedTypeIcon ? <SelectedTypeIcon size={16} /> : <TicketIcon size={16} />}
              </span>
              <span>{selectedType.label}</span>
            </span>
          ) : null}
        </header>

        {loading ? (
          <div className={styles.emptyState}>
            <p>{wizard.loadingForms || copy.loadingForms}</p>
          </div>
        ) : !forms?.length ? (
          <div className={styles.emptyState}>
            <p>{wizard.noForms || copy.noFormsForKind || copy.noForms}</p>
          </div>
        ) : (
          <div className={styles.typeGrid} role="list">
            {forms.map((form, index) => (
              <WizardFormCard
                key={form.id}
                form={form}
                index={index}
                selected={String(selectedFormId) === String(form.id)}
                disabled={formLocked && String(form.id) !== String(selectedFormId)}
                onPick={onPickForm}
              />
            ))}
          </div>
        )}

        {!formLocked ? (
          <button type="button" className={styles.backBtn} onClick={onBackToType}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {wizard.back || copy.back}
          </button>
        ) : null}
      </section>
    </div>
  );
}
