import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAdminCommonCopy, useAdminModalCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDisplayModes, getEquipmentFamilyFormSections, getEquipmentFieldTypes } from "./adminFormModalsI18n";
import { interpolate } from "../../i18n/translate";
import IconPicker, { EQUIPMENT_FAMILY_ICON_CHOICES } from "./IconPicker";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./EquipmentFamilyFormModal.module.css";
function slugifyFieldKey(label) {
  return String(label || "champ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 72);
}
export default function EquipmentFamilyFormModal({
  open,
  mode = "create",
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
  const displayModes = useMemo(() => getEquipmentDisplayModes(locale), [locale]);
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("identity");
  useEffect(() => {
    if (!open) return;
    setActiveSection("identity");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    identity: Boolean(String(draft?.label || "").trim()),
    fields: (draft?.fields || []).some(field => String(field.label || "").trim()),
    map: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const updateField = (index, patch) => {
    setDraft(prev => {
      const fields = [...(prev.fields || [])];
      fields[index] = {
        ...fields[index],
        ...patch
      };
      if (patch.label && (!fields[index].fieldKey || fields[index].fieldKey === slugifyFieldKey(fields[index].label))) {
        fields[index].fieldKey = slugifyFieldKey(patch.label);
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
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="family-label">
                  {adminCopy.label}
                </label>
                <input id="family-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={modalCopy.labelPlaceholder} />
              </div>
              {isCreate ? <div className={`${layout.field} ${layout.fieldFull}`}>
                  <label className={layout.label} htmlFor="family-key">
                    {modalCopy.familyKeyLabel}
                  </label>
                  <input id="family-key" type="text" className={layout.input} value={draft.familyKey || ""} onChange={e => patchDraft({
                familyKey: e.target.value
              })} placeholder={modalCopy.familyKeyPlaceholder} />
              </div> : <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label}>{modalCopy.familyKeyLabel}</label>
                  <input type="text" className={layout.input} value={draft.familyKey || ""} disabled />
                </div>}
              <div className={layout.field}>
                <label className={layout.label} htmlFor="family-sort">
                  {modalCopy.sortOrderLabel}
                </label>
                <input id="family-sort" type="number" className={layout.input} value={draft.sortOrder || ""} onChange={e => patchDraft({
                sortOrder: e.target.value
              })} />
              </div>
              <div className={layout.field}>
                <label className={layout.label}>{modalCopy.enabledLabel}</label>
                <Switch checked={draft.enabled !== false} onChange={enabled => patchDraft({
                enabled
              })} label={draft.enabled !== false ? adminCopy.visible : adminCopy.hidden} />
              </div>
            </div>
          </>;
      case "fields":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{modalCopy.fieldsTitle}</h3>
              <p className={layout.sectionDesc}>{modalCopy.fieldsDesc}</p>
            </div>
            <div className={styles.fieldsList}>
              {(draft.fields || []).length === 0 ? <p className={layout.sectionDesc}>{modalCopy.noFields}</p> : (draft.fields || []).map((field, index) => <div key={`field-${index}`} className={styles.fieldRow}>
                    <input type="text" className={layout.input} value={field.label || ""} onChange={e => updateField(index, {
                label: e.target.value
              })} placeholder={modalCopy.fieldLabelPlaceholder} />
                    <select className={layout.input} value={field.fieldType || "text"} onChange={e => updateField(index, {
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
                      {adminCopy.required}
                    </label>
                    <button type="button" className={styles.removeFieldBtn} onClick={() => removeField(index)} aria-label={adminCopy.removeField}>
                      <FaTimes />
                    </button>
                  </div>)}
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
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="family-display-mode">
                  {modalCopy.displayModeLabel}
                </label>
                <select id="family-display-mode" className={layout.input} value={draft.displayMode || "hexagon"} onChange={e => patchDraft({
                displayMode: e.target.value
              })}>
                  {displayModes.map(mode => <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>)}
                </select>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="family-icon">
                  {adminCopy.icon}
                </label>
                <IconPicker value={draft.icon || "mdi:devices"} onChange={icon => patchDraft({
                icon
              })} choices={EQUIPMENT_FAMILY_ICON_CHOICES} variant="equipment" searchable />
              </div>
              <div className={layout.field}>
                <label className={layout.label}>{adminCopy.preview}</label>
                <div className={styles.iconPreview}>
                  <Icon icon={draft.icon || "mdi:devices"} aria-hidden />
                </div>
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="family-q">
                  {modalCopy.positionQLabel}
                </label>
                <input id="family-q" type="number" className={layout.input} value={draft.honeycombQ || ""} onChange={e => patchDraft({
                honeycombQ: e.target.value
              })} placeholder={adminCopy.auto} />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="family-r">
                  {modalCopy.positionRLabel}
                </label>
                <input id="family-r" type="number" className={layout.input} value={draft.honeycombR || ""} onChange={e => patchDraft({
                honeycombR: e.target.value
              })} placeholder={adminCopy.auto} />
              </div>
            </div>
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
            <p className={styles.subtitle}>{modalCopy.subtitle}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav}>
            {formSections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)}>
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
