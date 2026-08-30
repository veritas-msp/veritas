import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentFamilyFormSections, getEquipmentFieldTypes } from "./adminFormModalsI18n";
import { interpolate } from "../../i18n/translate";
import IconPicker, { EQUIPMENT_FAMILY_ICON_CHOICES } from "./IconPicker";
import { slugifyEquipmentFieldKey } from "./equipmentFamilyConstants";
import { getSystemFamilyBuiltinFields } from "./systemFamilyBuiltinFields";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./EquipmentFamilyFormModal.module.css";
export default function EquipmentFamilyFormModal({
  open,
  mode = "create",
  variant = "custom",
  draft,
  setDraft,
  saving = false,
  onClose,
  onSave
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("equipmentFamilyForm");
  const formSections = useMemo(() => getEquipmentFamilyFormSections(locale), [locale]);
  const fieldTypes = useMemo(() => getEquipmentFieldTypes(locale), [locale]);
  const isCreate = mode === "create";
  const isSystem = variant === "system";
  const visibleSections = useMemo(
    () => (isSystem ? formSections.filter(section => section.id === "fields") : formSections),
    [formSections, isSystem]
  );
  const builtinFields = useMemo(
    () => (isSystem ? getSystemFamilyBuiltinFields(draft?.familyKey, locale) : []),
    [isSystem, draft?.familyKey, locale]
  );
  const [activeSection, setActiveSection] = useState("identity");
  useEffect(() => {
    if (!open) return;
    setActiveSection(isSystem ? "fields" : "identity");
  }, [open, isSystem]);
  const sectionMeta = useMemo(() => ({
    identity: Boolean(String(draft?.label || "").trim()),
    fields: isSystem || (draft?.fields || []).some(field => String(field.label || "").trim()),
    map: true
  }), [draft, isSystem]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const updateField = (index, patch) => {
    setDraft(prev => {
      const fields = [...(prev.fields || [])];
      const previous = fields[index] || {};
      fields[index] = {
        ...previous,
        ...patch
      };
      if (patch.label !== undefined) {
        fields[index].fieldKey = slugifyEquipmentFieldKey(fields[index].label) || "champ";
      }
      return {
        ...prev,
        fields
      };
    });
  };
  const addField = () => {
    setDraft(prev => ({
      ...prev,
      fields: [...(prev.fields || []), {
        fieldKey: "",
        label: "",
        fieldType: "text",
        required: false
      }]
    }));
  };
  const removeField = index => {
    setDraft(prev => ({
      ...prev,
      fields: (prev.fields || []).filter((_, i) => i !== index)
    }));
  };
  const renderSectionContent = () => {
    switch (activeSection) {
      case "identity":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.identityTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.identityDesc}</p>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="family-label">
                  {adminCopy.label}
                </label>
                <input id="family-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={modalCopy.labelPlaceholder} />
              </div>
              {isCreate ? <div className={styles.formField}>
                  <label className={layout.label} htmlFor="family-key">
                    {modalCopy.familyKeyLabel}
                  </label>
                  <input id="family-key" type="text" className={layout.input} value={draft.familyKey || ""} onChange={e => patchDraft({
                familyKey: e.target.value
              })} placeholder={modalCopy.familyKeyPlaceholder} />
                </div> : <div className={styles.formField}>
                  <label className={layout.label}>{modalCopy.familyKeyLabel}</label>
                  <input type="text" className={layout.input} value={draft.familyKey || ""} disabled />
                </div>}
              <div className={styles.formFieldCompact}>
                <label className={layout.label} htmlFor="family-sort">
                  {modalCopy.sortOrderLabel}
                </label>
                <input id="family-sort" type="number" className={layout.input} value={draft.sortOrder || ""} onChange={e => patchDraft({
                sortOrder: e.target.value
              })} />
              </div>
              <div className={styles.formField}>
                <label className={layout.label}>{modalCopy.enabledLabel}</label>
                <div className={styles.switchWrap}>
                  <Switch checked={draft.enabled !== false} onChange={enabled => patchDraft({
                enabled
              })} label={draft.enabled !== false ? adminCopy.visible : adminCopy.hidden} />
                </div>
              </div>
            </div>
          </>;
      case "fields":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.fieldsTitle}</h3>
              <p className={layout.sectionDesc}>{isSystem ? modalCopy.systemFieldsDesc : modalCopy.fieldsDesc}</p>
            </div>
            {isSystem && builtinFields.length > 0 ? <>
                <h4 className={styles.subTitle}>{modalCopy.builtinFieldsTitle}</h4>
                <p className={layout.sectionDesc}>{modalCopy.builtinFieldsDesc}</p>
                <div className={styles.fieldsList}>
                  <div className={styles.fieldRowHead} aria-hidden>
                    <span>{adminCopy.label}</span>
                    <span>{modalCopy.fieldTypeCol}</span>
                    <span>{adminCopy.required}</span>
                    <span />
                  </div>
                  {builtinFields.map(field => <div key={`builtin-${field.fieldKey}`} className={`${styles.fieldRow} ${styles.fieldRowReadonly}`}>
                      <input type="text" className={layout.input} value={field.label || ""} disabled />
                      <input type="text" className={`${layout.input} ${styles.typeSelect}`} value={fieldTypes.find(type => type.value === field.fieldType)?.label || field.fieldType} disabled />
                      <label className={styles.requiredToggle}>
                        <input type="checkbox" checked={Boolean(field.required)} disabled />
                        <span>{adminCopy.required}</span>
                      </label>
                      <span className={styles.builtinBadge}>{modalCopy.builtinFieldBadge}</span>
                    </div>)}
                </div>
                <h4 className={styles.subTitle}>{modalCopy.extraFieldsTitle}</h4>
              </> : null}
            <div className={styles.fieldsList}>
              {(draft.fields || []).length === 0 ? <p className={styles.emptyFields}>{modalCopy.noFields}</p> : <>
                  <div className={styles.fieldRowHead} aria-hidden>
                    <span>{adminCopy.label}</span>
                    <span>{modalCopy.fieldTypeCol}</span>
                    <span>{adminCopy.required}</span>
                    <span />
                  </div>
                  {(draft.fields || []).map((field, index) => <div key={`field-${index}`} className={styles.fieldRow}>
                    <input type="text" className={layout.input} value={field.label || ""} onChange={e => updateField(index, {
                label: e.target.value
              })} placeholder={modalCopy.fieldLabelPlaceholder} />
                    <select className={`${layout.input} ${styles.typeSelect}`} value={field.fieldType || "text"} onChange={e => updateField(index, {
                fieldType: e.target.value
              })}>
                      {fieldTypes.map(type => <option key={type.value} value={type.value}>
                          {type.label}
                        </option>)}
                    </select>
                    <label className={styles.requiredToggle}>
                      <input type="checkbox" checked={Boolean(field.required)} onChange={e => updateField(index, {
                  required: e.target.checked
                })} />
                      <span>{adminCopy.required}</span>
                    </label>
                    <button type="button" className={styles.removeFieldBtn} onClick={() => removeField(index)} aria-label={adminCopy.removeField}>
                      <FaTimes />
                    </button>
                  </div>)}
                </>}
            </div>
            <button type="button" className={styles.addFieldBtn} onClick={addField}>
              <FaPlus /> {adminCopy.addField}
            </button>
          </>;
      case "map":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.mapTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.mapDesc}</p>
            </div>
            <div className={styles.mapIconField}>
              <label className={layout.label}>{adminCopy.icon}</label>
              <IconPicker value={draft.icon || "mdi:devices"} onChange={icon => patchDraft({
                icon
              })} choices={EQUIPMENT_FAMILY_ICON_CHOICES} variant="equipment" searchable popover searchPlaceholder={modalCopy.iconSearchPlaceholder} searchAria={modalCopy.iconSearchAria} clearSearchLabel={modalCopy.iconClearSearch} changeLabel={modalCopy.iconChangeLabel} pickerAria={modalCopy.iconPickerAria} />
            </div>
            <p className={styles.hintCard}>{modalCopy.mapManagedElsewhere}</p>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {isCreate ? modalCopy.createTitle : interpolate(modalCopy.editTitle, {
              name: draft.label || modalCopy.editFallback
            })}
            </h2>
            <p className={styles.subtitle}>{isSystem ? modalCopy.systemSubtitle : modalCopy.subtitle}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav}>
            {visibleSections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)}>
                <Icon icon={section.icon} aria-hidden />
                <span>{section.label}</span>
                {sectionMeta[section.id] ? <span className={styles.navDot} aria-hidden /> : null}
              </button>)}
          </nav>
          <div className={styles.sectionBody}>{renderSectionContent()}</div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            {commonCopy.cancel}
          </button>
          <button type="button" className={styles.saveBtn} onClick={onSave} disabled={saving}>
            {saving ? commonCopy.saving : commonCopy.save}
          </button>
        </footer>
      </div>
    </div>, document.body);
}
