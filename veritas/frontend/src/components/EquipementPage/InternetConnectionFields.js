import React from "react";
import { Icon } from "@iconify/react";
import { INTERNET_CATEGORIE_OPTIONS } from "./equipmentFormConfig";
import { INTERNET_DEBIT_PRESETS, INTERNET_DEBIT_QUICK } from "./internetConnectionUtils";
import SiteSuggestInput from "./SiteSuggestInput";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./InternetConnectionForm.module.css";
const CATEGORIE_ICONS = {
  Principale: "mdi:star-circle-outline",
  Backup: "mdi:backup-restore"
};
const inputStyle = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  border: "1px solid var(--msp-border, #e0e0e0)",
  borderRadius: "8px",
  background: "var(--msp-surface, #ffffff)",
  color: "var(--msp-text, #1a1a1a)",
  fontSize: "0.9rem",
  boxSizing: "border-box"
};
const labelStyle = {
  display: "block",
  marginBottom: "0.5rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--msp-text, #1a1a1a)"
};
function DebitQuickChips({
  presets,
  activeValue,
  onPick
}) {
  return <div className={styles.chipRow}>
      {presets.map(preset => <button key={preset} type="button" className={`${styles.chip} ${activeValue === preset ? styles.chipActive : ""}`} onClick={() => onPick(preset)}>
          {preset}
        </button>)}
    </div>;
}
export default function InternetConnectionFields({
  values = {},
  onChange,
  idPrefix = "internet-conn",
  section = "all",
  showSite = false,
  sites = [],
  useFormStyles = false,
  formCopy = {}
}) {
  const f = formCopy.fields || {};
  const internetCategories = formCopy.internetCategories || {};
  const update = (field, value) => {
    if (typeof onChange !== "function") return;
    onChange({
      ...values,
      [field]: value
    });
  };
  const gridClass = useFormStyles ? formStyles.fieldGrid2 : undefined;
  const fieldClass = useFormStyles ? formStyles.field : undefined;
  const fieldFullClass = useFormStyles ? `${formStyles.field} ${formStyles.fieldFull}` : undefined;
  const labelClass = useFormStyles ? formStyles.label : undefined;
  const inputClass = useFormStyles ? formStyles.input : undefined;
  const textareaClass = useFormStyles ? formStyles.textarea : undefined;
  const showLink = section === "all" || section === "internetLink";
  const showNetwork = section === "all" || section === "internetNetwork";
  const showContract = section === "all" || section === "internetContract";
  const showNotes = section === "all" || section === "internetNotes";
  const renderLabel = (htmlFor, text, required = false) => <label htmlFor={htmlFor} className={labelClass} style={useFormStyles ? undefined : labelStyle}>
      {text}
      {required ? <span style={{
      color: "#ef4444"
    }}> *</span> : null}
    </label>;
  const renderInput = ({
    className: extraClassName,
    style: extraStyle,
    ...props
  }) => <input {...props} className={[inputClass, extraClassName].filter(Boolean).join(" ")} style={useFormStyles ? extraStyle : {
    ...inputStyle,
    ...(extraStyle || {})
  }} />;
  const renderTextarea = props => <textarea {...props} className={textareaClass || inputClass} style={useFormStyles ? undefined : {
    ...inputStyle,
    minHeight: "4.5rem",
    resize: "vertical"
  }} />;
  const gridStyle = useFormStyles ? undefined : {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem"
  };
  const fieldWrap = (className, children, fullWidth = false) => <div className={className} style={useFormStyles ? undefined : {
    gridColumn: fullWidth ? "1 / -1" : undefined
  }}>
      {children}
    </div>;
  return <div className={gridClass} style={gridStyle}>
      {showLink && showSite ? fieldWrap(fieldFullClass || fieldClass, <>
              {renderLabel(`${idPrefix}-site`, f.location)}
              <SiteSuggestInput id={`${idPrefix}-site`} value={values.site ?? values.location ?? ""} onChange={nextValue => update("site", nextValue)} sites={sites} placeholder={f.locationPlaceholder} inputClassName={inputClass} inputStyle={useFormStyles ? undefined : inputStyle} />
            </>, true) : null}

      {showLink && fieldWrap(fieldFullClass || fieldClass, <div className={styles.linkProviderRow}>
          <div className={styles.linkProviderField}>
            {renderLabel(`${idPrefix}-fournisseur`, f.provider, true)}
            {renderInput({
          id: `${idPrefix}-fournisseur`,
          type: "text",
          value: values.fournisseur ?? "",
          onChange: e => update("fournisseur", e.target.value),
          placeholder: f.providerPlaceholder
        })}
          </div>
          <div className={styles.linkCategoryField}>
            {renderLabel(`${idPrefix}-categorie`, f.category)}
            <div className={`${styles.choiceRow} ${styles.choiceRowInline}`} role="radiogroup" aria-label={f.categoryLinkAria}>
              {INTERNET_CATEGORIE_OPTIONS.map(option => {
            const selected = (values.categorie ?? "Primary") === option;
            return <button key={option} type="button" role="radio" aria-checked={selected} className={`${styles.choiceBtn} ${styles.choiceBtnCompact} ${selected ? styles.choiceBtnActive : ""}`} onClick={() => update("categorie", option)}>
                    <Icon icon={CATEGORIE_ICONS[option] || "mdi:tag-outline"} aria-hidden />
                    {internetCategories[option] || option}
                  </button>;
          })}
            </div>
          </div>
        </div>, true)}

      {showLink && fieldWrap(fieldClass, <>
          {renderLabel(`${idPrefix}-debit-download`, f.downloadSpeed)}
          {renderInput({
        id: `${idPrefix}-debit-download`,
        type: "text",
        list: `${idPrefix}-debit-presets`,
        value: values.debitDownload ?? "",
        onChange: e => update("debitDownload", e.target.value),
        placeholder: f.speedPlaceholder
      })}
          <DebitQuickChips presets={INTERNET_DEBIT_QUICK} activeValue={values.debitDownload ?? ""} onPick={preset => update("debitDownload", preset)} />
        </>)}

      {showLink && fieldWrap(fieldClass, <>
          {renderLabel(`${idPrefix}-debit-upload`, f.uploadSpeed)}
          {renderInput({
        id: `${idPrefix}-debit-upload`,
        type: "text",
        list: `${idPrefix}-debit-presets`,
        value: values.debitUpload ?? "",
        onChange: e => update("debitUpload", e.target.value),
        placeholder: f.speedPlaceholder
      })}
          <DebitQuickChips presets={INTERNET_DEBIT_QUICK} activeValue={values.debitUpload ?? ""} onPick={preset => update("debitUpload", preset)} />
        </>)}

      {showLink ? <datalist id={`${idPrefix}-debit-presets`}>
          {INTERNET_DEBIT_PRESETS.map(preset => <option key={preset} value={preset} />)}
        </datalist> : null}

      {showNetwork && fieldWrap(fieldFullClass || fieldClass, <>
          {renderLabel(`${idPrefix}-ip-mode`, f.publicIp, true)}
          <div className={styles.choiceRow} style={{
        marginBottom: "0.65rem"
      }}>
            <button type="button" className={`${styles.choiceBtn} ${!values.ipNonFixe ? styles.choiceBtnActive : ""}`} onClick={() => {
          const lastFixedIp = values._lastFixedIp ?? values.ip ?? "";
          onChange({
            ...values,
            ipNonFixe: false,
            ip: lastFixedIp
          });
        }}>
              <Icon icon="mdi:ip" aria-hidden />
              {f.fixedIp}
            </button>
            <button type="button" className={`${styles.choiceBtn} ${values.ipNonFixe ? styles.choiceBtnActive : ""}`} onClick={() => {
          const lastFixedIp = values._lastFixedIp ?? values.ip ?? "";
          onChange({
            ...values,
            _lastFixedIp: lastFixedIp,
            ipNonFixe: true,
            ip: ""
          });
        }}>
              <Icon icon="mdi:ip-network-outline" aria-hidden />
              {f.nonFixedIp}
            </button>
          </div>
          {!values.ipNonFixe ? renderInput({
        id: `${idPrefix}-ip`,
        type: "text",
        value: values.ip ?? "",
        onChange: e => update("ip", e.target.value),
        placeholder: f.publicIpPlaceholder
      }) : <p style={{
        margin: 0,
        fontSize: "0.8125rem",
        color: "var(--msp-muted, #5c6b82)"
      }}>
              {f.nonFixedIpHint}
            </p>}
        </>, true)}

      {showNetwork && fieldWrap(fieldClass, <>
          {renderLabel(`${idPrefix}-gateway`, f.gateway)}
          {renderInput({
        id: `${idPrefix}-gateway`,
        type: "text",
        value: values.gateway ?? "",
        onChange: e => update("gateway", e.target.value),
        placeholder: f.gatewayPlaceholder
      })}
        </>)}

      {showContract && fieldWrap(fieldClass, <>
          {renderLabel(`${idPrefix}-numero-ligne`, f.lineIdentifier)}
          {renderInput({
        id: `${idPrefix}-numero-ligne`,
        type: "text",
        value: values.numeroLigne ?? "",
        onChange: e => update("numeroLigne", e.target.value),
        placeholder: f.lineIdentifierPlaceholder
      })}
        </>)}

      {showContract && fieldWrap(fieldClass, <>
          {renderLabel(`${idPrefix}-reference-contrat`, f.contractNumber)}
          {renderInput({
        id: `${idPrefix}-reference-contrat`,
        type: "text",
        value: values.referenceContrat ?? "",
        onChange: e => update("referenceContrat", e.target.value),
        placeholder: f.contractNumberPlaceholder
      })}
        </>)}

      {showContract && fieldWrap(fieldFullClass || fieldClass, <div className={styles.inlineIconRow}>
          <div className={styles.inlineIconField}>
            {renderLabel(`${idPrefix}-support`, f.operatorSupport)}
            {renderInput({
          id: `${idPrefix}-support`,
          type: "tel",
          value: values.supportTelephone ?? "",
          onChange: e => update("supportTelephone", e.target.value),
          placeholder: f.operatorSupportPlaceholder
        })}
          </div>
          <div className={styles.inlineIconField}>
            {renderLabel(`${idPrefix}-box`, f.boxModem)}
            {renderInput({
          id: `${idPrefix}-box`,
          type: "text",
          value: values.boxModele ?? "",
          onChange: e => update("boxModele", e.target.value),
          placeholder: f.boxModemPlaceholder
        })}
          </div>
        </div>, true)}

      {showContract && fieldWrap(fieldClass, <>
          {renderLabel(`${idPrefix}-date-mes`, f.serviceStartDate)}
          {renderInput({
        id: `${idPrefix}-date-mes`,
        type: "date",
        value: values.dateMiseEnService ?? "",
        onChange: e => update("dateMiseEnService", e.target.value)
      })}
        </>)}

      {showNotes && fieldWrap(fieldFullClass || fieldClass, <>
          {renderLabel(`${idPrefix}-commentaire`, f.notes)}
          {renderTextarea({
        id: `${idPrefix}-commentaire`,
        value: values.commentaire ?? "",
        onChange: e => update("commentaire", e.target.value),
        placeholder: f.internetNotesPlaceholder,
        rows: 4
      })}
        </>, true)}
    </div>;
}
