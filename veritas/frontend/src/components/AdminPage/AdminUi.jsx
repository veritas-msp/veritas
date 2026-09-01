import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy } from "../../hooks/useAdminCopy";
import { formatPageInfo } from "../../i18n/commonI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import s from "./AdminUi.module.css";
export function Page({
  children
}) {
  return <div className={s.page}>{children}</div>;
}
export function SubTabs({
  items,
  active,
  onChange,
  fullWidth
}) {
  return <div className={`${s.subTabs} ${fullWidth ? s.subTabsFull : ""}`} role="tablist">
      {items.map(item => {
      const tabKey = item.key ?? item.id;
      const isLocked = Boolean(item.proOnly);
      const isActive = active === tabKey && !isLocked;
      return <button key={tabKey} type="button" role="tab" aria-selected={isActive} aria-disabled={isLocked || undefined} className={`${s.subTab} ${isActive ? s.subTabActive : ""} ${isLocked ? s.subTabProLocked : ""}`} onClick={() => onChange(tabKey)}>
          {item.icon && <Icon icon={item.icon} className={s.subTabIcon} />}
          <span className={s.subTabLabel}>{item.label}</span>
          {isLocked ? <ProFeatureBadge variant="inline" className={s.subTabProBadge} /> : null}
        </button>;
    })}
    </div>;
}
export function Card({
  title,
  description,
  action,
  children,
  noPadding,
  fill,
  fillNoScroll,
  overflowVisible
}) {
  return <section className={`${s.card} ${fill ? s.cardFill : ""} ${fillNoScroll ? s.cardFillNoScroll : ""} ${overflowVisible ? s.cardOverflowVisible : ""}`}>
      {(title || action) && <header className={s.cardHeader}>
          <div>
            {title && <h2 className={s.cardTitle}>{title}</h2>}
            {description && <p className={s.cardDesc}>{description}</p>}
          </div>
          {action && <div className={s.cardAction}>{action}</div>}
        </header>}
      <div className={noPadding ? s.cardBodyFlush : s.cardBody}>{children}</div>
    </section>;
}
export function Toolbar({
  search,
  searchPlaceholder,
  onSearchChange,
  meta,
  action
}) {
  const copy = useCommonCopy();
  const placeholder = searchPlaceholder || copy.searchPlaceholder;
  return <div className={s.toolRow}>
      <div className={s.toolLeft}>
        {search !== undefined && <input type="search" className={s.fieldSearch} placeholder={placeholder} value={search} onChange={e => onSearchChange?.(e.target.value)} aria-label={placeholder || copy.searchAria} />}
        {meta && <span className={s.count}>{meta}</span>}
      </div>
      {action && <div className={s.toolbarRight}>{action}</div>}
    </div>;
}
export function Btn({
  children,
  variant = "primary",
  size,
  icon,
  onClick,
  disabled,
  type = "button",
  title
}) {
  return <button type={type} title={title} disabled={disabled} onClick={onClick} className={`${s.btn} ${s[`btn_${variant}`]} ${size === "sm" ? s.btnSm : ""}`}>
      {icon && <Icon icon={icon} />}
      {children}
    </button>;
}
export function BtnIcon({
  icon,
  onClick,
  disabled,
  title,
  variant = "ghost"
}) {
  return <button type="button" title={title} disabled={disabled} onClick={onClick} className={`${s.btnIcon} ${s[`btnIcon_${variant}`]}`}>
      <Icon icon={icon} />
    </button>;
}
export function Table({
  columns,
  rows,
  emptyMessage,
  onRowClick
}) {
  const copy = useCommonCopy();
  return <div className={s.tableSection}>
      <div className={s.tableWrap}>
        <table className={s.table}>
        <thead>
          <tr>
            {columns.map(col => <th key={col.key} style={col.width ? {
              width: col.width
            } : undefined}>
                {col.sortable ? <button type="button" className={s.thSort} onClick={col.onSort}>
                    {col.label}
                    {col.sortIndicator}
                  </button> : col.label}
              </th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr>
              <td colSpan={columns.length} className={s.emptyCell}>
                {emptyMessage || copy.emptyTable}
              </td>
            </tr> : rows.map(row => <tr key={row.id} className={onRowClick ? s.clickableRow : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map(col => <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>)}
              </tr>)}
        </tbody>
      </table>
      </div>
    </div>;
}
export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  rangeLabel,
  pageSizeOptions = [10, 25, 50, 100, 200]
}) {
  const copy = useCommonCopy();
  const locale = useAppLocale();
  const sizes = Array.isArray(pageSizeOptions) && pageSizeOptions.length ? pageSizeOptions : [10, 25, 50, 100, 200];
  return <div className={s.pagination}>
      <div className={s.paginationLeft}>
        {onPageSizeChange && <>
            <span className={s.paginationLabel}>{copy.perPage}</span>
            <select className={s.paginationSelect} value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
              {sizes.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </>}
        {rangeLabel && <span className={s.paginationRange}>{rangeLabel}</span>}
      </div>
      <div className={s.paginationRight}>
        <BtnIcon icon="mdi:chevron-left" onClick={() => onPageChange(page - 1)} disabled={page <= 1} title={copy.prevPage} />
        <span className={s.paginationInfo}>{formatPageInfo(locale, page, totalPages)}</span>
        <BtnIcon icon="mdi:chevron-right" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} title={copy.nextPage} />
      </div>
    </div>;
}
export function ModalFooter({
  onCancel,
  onConfirm,
  cancelLabel,
  confirmLabel,
  confirmVariant = "primary",
  confirmDisabled = false,
  confirmLoading = false
}) {
  const copy = useCommonCopy();
  const resolvedCancel = cancelLabel || copy.cancel;
  const resolvedConfirm = confirmLabel || copy.save;
  return <>
      <Btn variant="secondary" onClick={onCancel} disabled={confirmLoading}>
        {resolvedCancel}
      </Btn>
      <Btn variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled || confirmLoading}>
        {confirmLoading ? copy.loading : resolvedConfirm}
      </Btn>
    </>;
}
export function ModalFooterBar({
  onCancel,
  onConfirm,
  cancelLabel,
  confirmLabel,
  confirmVariant = "primary",
  confirmDisabled = false,
  confirmLoading = false,
  dangerAction
}) {
  const copy = useCommonCopy();
  const resolvedCancel = cancelLabel || copy.cancel;
  const resolvedConfirm = confirmLabel || copy.save;
  return <div className={s.modalFooterBar}>
      <div className={s.modalFooterLeft}>{dangerAction}</div>
      <div className={s.modalFooterRight}>
        <Btn variant="secondary" onClick={onCancel} disabled={confirmLoading}>
          {resolvedCancel}
        </Btn>
        <Btn variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled || confirmLoading}>
          {confirmLoading ? copy.loading : resolvedConfirm}
        </Btn>
      </div>
    </div>;
}
export function ModalEntityHeader({
  icon,
  initials,
  title,
  subtitle,
  badge,
  action
}) {
  return <div className={s.modalEntityHeader}>
      <div className={s.modalEntityAvatar}>
        {initials ? initials : icon ? <Icon icon={icon} className={s.modalEntityAvatarIcon} /> : null}
      </div>
      <div className={s.modalEntityMeta}>
        <div className={s.modalEntityTitle}>{title}</div>
        {subtitle && <div className={s.modalEntitySub}>{subtitle}</div>}
      </div>
      {action && <div className={s.modalEntityAction}>{action}</div>}
      {!action && badge && <div className={s.modalEntityBadge}>{badge}</div>}
    </div>;
}
export function ModalDangerZone({
  title,
  description,
  actionLabel,
  onAction,
  disabled
}) {
  return <div className={s.modalDangerZone}>
      <div className={s.modalDangerText}>
        <p className={s.modalDangerTitle}>{title}</p>
        {description && <p className={s.modalDangerDesc}>{description}</p>}
      </div>
      <Btn variant="danger" size="sm" icon="mdi:trash-can-outline" onClick={onAction} disabled={disabled}>
        {actionLabel}
      </Btn>
    </div>;
}
export function ModalDivider() {
  return <div className={s.modalDivider} />;
}
export function ModalForm({
  children
}) {
  return <div className={s.modalForm}>{children}</div>;
}
export function ModalFormSection({
  title,
  icon,
  children
}) {
  return <section className={s.modalFormSection}>
      {title && <h4 className={s.modalFormSectionTitle}>
          {icon && <Icon icon={icon} className={s.modalFormSectionIcon} />}
          {title}
        </h4>}
      <div className={s.modalFormFields}>{children}</div>
    </section>;
}
export function IconField({
  icon,
  label,
  hint,
  children
}) {
  return <label className={`${s.field} ${s.iconField}`}>
      <span className={s.fieldLabel}>{label}</span>
      <div className={s.iconFieldRow}>
        {icon && <div className={s.iconFieldBadge} aria-hidden="true">
            <Icon icon={icon} />
          </div>}
        <div className={s.iconFieldInput}>{children}</div>
      </div>
      {hint && <span className={s.fieldHint}>{hint}</span>}
    </label>;
}
export function FieldRow({
  icon,
  label,
  hint,
  children,
  className
}) {
  return <div className={`${s.fieldRow} ${icon ? s.fieldRow_withIcon : ""} ${className || ""}`.trim()}>
      {icon && <div className={s.fieldRowIcon}>
          <Icon icon={icon} />
        </div>}
      <div className={s.fieldRowBody}>
        <div className={s.fieldRowText}>
          <span className={s.fieldRowLabel}>{label}</span>
          {hint && <span className={s.fieldRowHint}>{hint}</span>}
        </div>
        <div className={s.fieldRowControl}>{children}</div>
      </div>
    </div>;
}
export function ModalEntityStatus({
  active,
  onChange
}) {
  const copy = useAdminCommonCopy();
  return <div className={s.modalEntityStatus}>
      <span className={`${s.modalEntityStatusLabel} ${active ? s.modalEntityStatusLabel_on : s.modalEntityStatusLabel_off}`}>
        {active ? copy.active : copy.inactive}
      </span>
      <Switch checked={active} onChange={onChange} />
    </div>;
}
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  icon = "mdi:alert-circle-outline",
  confirmLabel,
  confirmVariant = "dangerSolid",
  width = "440px",
  confirmLoading = false
}) {
  const copy = useCommonCopy();
  return <Modal open={open} onClose={onClose} title={title} icon={icon} width={width} stacked footer={<ModalFooter onCancel={onClose} onConfirm={onConfirm} confirmLabel={confirmLabel || copy.confirm} confirmVariant={confirmVariant} confirmLoading={confirmLoading} />}>
      {typeof message === "string" ? <p className={s.modalMessage}>{message}</p> : <div className={s.modalMessage}>{message}</div>}
    </Modal>;
}
export function Modal({
  open,
  onClose,
  title,
  icon,
  eyebrow,
  subtitle,
  children,
  footer,
  width,
  footerBar,
  stacked = false
}) {
  const copy = useCommonCopy();
  if (!open) return null;
  return createPortal(<div className={`${s.modalOverlay} ${stacked ? s.modalOverlayStacked : ""}`} onClick={onClose} role="presentation">
      <div className={s.modal} style={width ? {
      maxWidth: width
    } : undefined} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <div className={s.modalAccentBar} aria-hidden />
        <header className={s.modalHeader}>
          <div className={s.modalHeaderMain}>
            {icon && <div className={s.modalHeaderIconWrap} aria-hidden>
                <Icon icon={icon} />
              </div>}
            <div className={s.modalHeaderText}>
              {eyebrow && <p className={s.modalEyebrow}>{eyebrow}</p>}
              <h3 className={s.modalTitle} id="admin-modal-title">
                {title}
              </h3>
              {subtitle && <p className={s.modalSubtitle}>{subtitle}</p>}
            </div>
          </div>
          <button type="button" className={s.modalClose} onClick={onClose} aria-label={copy.close}>
            <Icon icon="mdi:close" />
          </button>
        </header>
        <div className={s.modalBody}>{children}</div>
        {footer && (footerBar ? footer : <footer className={s.modalFooter}>{footer}</footer>)}
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
export function Field({
  label,
  hint,
  children,
  spanFull
}) {
  return <div className={`${s.field} ${spanFull ? s.fieldSpanFull : ""}`}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={s.fieldHint}>{hint}</span>}
    </div>;
}
export function Input(props) {
  return <input className={s.input} {...props} />;
}
export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix,
  disabled = false,
  ariaLabel,
  block = false
}) {
  const adminCopy = useAdminCommonCopy();
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : min;
  const clamp = next => Math.min(max, Math.max(min, next));
  const handleInput = event => {
    const raw = event.target.value.replace(/\D/g, "");
    if (raw === "") {
      onChange(min);
      return;
    }
    onChange(clamp(Number(raw)));
  };
  return <div className={`${s.numberStepper} ${block ? s.numberStepperBlock : ""} ${disabled ? s.numberStepperDisabled : ""}`} role="group" aria-label={ariaLabel}>
      <div className={s.numberStepperCenter}>
        <input type="text" inputMode="numeric" pattern="[0-9]*" className={s.numberStepperInput} value={safeValue} onChange={handleInput} disabled={disabled} aria-label={ariaLabel || adminCopy.value} />
        {suffix ? <span className={s.numberStepperSuffix}>{suffix}</span> : null}
      </div>
      <div className={s.numberStepperBtns}>
        <button type="button" className={s.numberStepperBtn} onClick={() => onChange(clamp(safeValue + step))} disabled={disabled || safeValue >= max} aria-label={adminCopy.increase}>
          <Icon icon="mdi:chevron-up" aria-hidden />
        </button>
        <button type="button" className={s.numberStepperBtn} onClick={() => onChange(clamp(safeValue - step))} disabled={disabled || safeValue <= min} aria-label={adminCopy.decrease}>
          <Icon icon="mdi:chevron-down" aria-hidden />
        </button>
      </div>
    </div>;
}
export function Select(props) {
  return <select className={s.select} {...props} />;
}
export function Textarea(props) {
  return <textarea className={s.textarea} {...props} />;
}
export function FormGrid({
  children,
  cols = 2,
  className
}) {
  return <div className={`${s.formGrid} ${className || ""}`.trim()} style={{
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
  }}>
      {children}
    </div>;
}
export function ChoiceGroup({
  value,
  onChange,
  options,
  variant = "cards",
  ariaLabel
}) {
  const groupClass = [s.choiceGroup, variant === "segment" ? s.choiceGroupSegment : "", variant === "pills" ? s.choiceGroupPills : "", variant === "locale" ? s.choiceGroupLocale : "", variant === "theme" ? s.choiceGroupTheme : ""].filter(Boolean).join(" ");
  return <div className={groupClass} role="radiogroup" aria-label={ariaLabel}>
      {options.map(option => {
      const active = value === option.value;
      const btnClass = [s.choiceBtn, active ? s.choiceBtnActive : "", variant === "segment" ? s.choiceBtnSegment : "", variant === "pills" ? s.choiceBtnPill : "", variant === "locale" ? s.choiceBtnLocale : "", variant === "theme" ? s.choiceBtnTheme : ""].filter(Boolean).join(" ");
      return <button key={option.value} type="button" role="radio" aria-checked={active} className={btnClass} onClick={() => onChange(option.value)} title={option.title || option.label}>
            {option.flagIcon ? <Icon icon={option.flagIcon} className={s.choiceBtnFlagIcon} aria-hidden /> : option.flag ? <span className={s.choiceBtnFlag} aria-hidden>{option.flag}</span> : null}
            {option.icon ? <Icon icon={option.icon} className={s.choiceBtnIcon} aria-hidden /> : null}
            {option.label ? <span className={s.choiceBtnLabel}>{option.label}</span> : null}
            {option.subtitle ? <span className={s.choiceBtnSubtitle}>{option.subtitle}</span> : null}
          </button>;
    })}
    </div>;
}
export function Badge({
  children,
  variant = "default"
}) {
  return <span className={`${s.badge} ${s[`badge_${variant}`]}`}>{children}</span>;
}
export function EntityStatus({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive"
}) {
  return <span className={`${s.entityStatus} ${active ? s.entityStatusActive : s.entityStatusInactive}`}>
      <span className={s.entityStatusDot} />
      {active ? activeLabel : inactiveLabel}
    </span>;
}
export function Switch({
  checked,
  onChange,
  label,
  disabled = false
}) {
  return <label className={`${s.switch} ${disabled ? s.switchDisabled : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className={s.switchInput} />
      <span className={s.switchTrack} />
      {label && <span className={s.switchLabel}>{label}</span>}
    </label>;
}
export function ListItem({
  title,
  subtitle,
  actions
}) {
  return <div className={s.listItem}>
      <div className={s.listItemText}>
        <div className={s.listItemTitle}>{title}</div>
        {subtitle && <div className={s.listItemSub}>{subtitle}</div>}
      </div>
      {actions && <div className={s.listItemActions}>{actions}</div>}
    </div>;
}
export function IntegrationGrid({
  items,
  onSelect,
  isActive,
  getImageSrc
}) {
  return <div className={s.integrationGrid}>
      {items.map(item => <button key={item.id} type="button" className={s.integrationCard} onClick={() => onSelect(item)}>
          {item.image && getImageSrc ? <img src={getImageSrc(item.image)} alt="" className={s.integrationCardImg} /> : <Icon icon={item.icon} className={s.integrationCardIcon} style={item.iconColor ? {
        color: item.iconColor
      } : undefined} />}
          <span className={s.integrationCardName}>{item.name}</span>
          <Badge variant={isActive(item) ? "success" : "muted"}>
            {isActive(item) ? "Active" : "Inactive"}
          </Badge>
        </button>)}
    </div>;
}
