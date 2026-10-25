import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { addClientCustomEquipment, deleteClientCustomEquipment, updateClientCustomEquipment } from "../../api/clients";
import { getSiteLocationValue, normalizeClientSites } from "../../utils/clientSites";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import styles from "./EnterpriseFormModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { interpolate } from "../../i18n/translate";
import { getSharedEquipmentFieldDefs, getSharedEquipmentFieldLabel, mergeCustomEquipmentFamilyFields } from "../EquipementPage/sharedEquipmentFields";
import { getFormFields, getEquipmentModalsCopy } from "../EquipementPage/equipmentModalsI18n";
import FormNumberStepper from "../EquipementPage/FormNumberStepper";
import SiteSuggestInput from "../EquipementPage/SiteSuggestInput";
import EquipmentSectionNavIcon, { useSectionIconHover } from "../EquipementPage/EquipmentSectionNavIcon";
import { getEquipmentFieldSelectOptions, groupEquipmentFieldsBySection, isEquipmentLayoutField } from "../../utils/equipmentFamilyFieldUtils";
import { buildAvailableSites, groupEquipmentFormSections, readEquipmentIsActive } from "../EquipementPage/equipmentFormConfig";
import { UiKitButton, uiKitLayoutsStyles as kit, useFinderNavIndicator } from "../UiKit";

const STATUS_FIELD_KEYS = new Set(["actif", "active", "is_active", "isActive"]);
const LOCATION_FIELD_KEYS = new Set(["location", "lieu", "site", "emplacement", "localisation"]);

const BASE_SECTIONS = [
  {
    id: "identity",
    label: "Identity",
    description: "Name and site",
    icon: "mdi:tag-outline"
  },
  {
    id: "common",
    label: "Facturation et installation",
    description: "Champs communs",
    icon: "mdi:file-document-outline"
  },
  {
    id: "details",
    label: "Details",
    description: "Specific information",
    icon: "mdi:tune-variant"
  }
];

function CustomNavSectionButton({
  section,
  active,
  done,
  incomplete,
  onSelect,
}) {
  const { animRef, onMouseEnter, onMouseLeave } = useSectionIconHover(section.id);
  return (
    <button
      type="button"
      className={`${kit.finderItem} ${active ? kit.finderItemActive : ""}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-current={active ? "page" : undefined}
    >
      <EquipmentSectionNavIcon
        sectionId={section.id}
        iconify={section.icon}
        className={kit.finderItemIcon}
        size={18}
        animRef={animRef}
      />
      <span className={`${kit.finderItemLabel} ${incomplete ? styles.navItemLabelRequired : ""}`}>
        {section.label}
      </span>
      {done ? <span className={styles.navBadge}>✓</span> : null}
    </button>
  );
}

function readItemIsActive(item) {
  return readEquipmentIsActive(item);
}

function resolveItemSiteValue(item) {
  const layers = [item, item?.fields, item?.data, item?.rawData, item?.rawData?.data];
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    for (const key of ["site", "location", "lieu", "emplacement", "localisation"]) {
      const value = layer[key];
      if (value != null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
  }
  return "";
}

function applySiteToForm(form, siteValue) {
  const next = {
    ...form,
    site: siteValue
  };
  LOCATION_FIELD_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      next[key] = siteValue;
    }
  });
  return next;
}

function buildEmptyForm(fields = [], defaultSite = "") {
  const form = {
    name: "",
    site: "",
    is_active: true
  };
  fields.forEach(field => {
    if (STATUS_FIELD_KEYS.has(field.fieldKey)) return;
    if (field.fieldType === "section") return;
    form[field.fieldKey] = field.fieldType === "boolean" ? false : "";
  });
  return applySiteToForm(form, String(defaultSite || "").trim());
}

function buildFormFromItem(item, fields = []) {
  const form = buildEmptyForm(fields);
  form.name = item?.name || "";
  form.is_active = readItemIsActive(item);
  fields.forEach(field => {
    if (field.fieldType === "section") return;
    const value = item?.fields?.[field.fieldKey] ?? item?.data?.[field.fieldKey];
    if (field.fieldType === "boolean") {
      form[field.fieldKey] = Boolean(value);
    } else if (field.fieldType === "number") {
      if (value === false) form[field.fieldKey] = "0";
      else if (value === true) form[field.fieldKey] = "1";
      else if (value != null && value !== "") form[field.fieldKey] = String(value);
    } else if (value != null) {
      form[field.fieldKey] = field.fieldType === "date" ? String(value).slice(0, 10) : String(value);
    }
  });
  return applySiteToForm(form, resolveItemSiteValue(item) || form.site || "");
}

function cloneFormSnapshot(form) {
  return JSON.parse(JSON.stringify(form));
}

function formsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isLocationField(field) {
  return LOCATION_FIELD_KEYS.has(String(field?.fieldKey || "").toLowerCase());
}

export default function CustomEquipmentModal({
  isOpen,
  onClose,
  family,
  item = null,
  client = null,
  clientId,
  defaultSite = null,
  onRefresh
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getEquipmentModalsCopy(locale), [locale]);
  const formCopy = copy.form || {};
  const sectionCopy = copy.sections || {};
  const formFields = useMemo(() => getFormFields(locale).fields || {}, [locale]);
  const [activeSection, setActiveSection] = useState("identity");
  const [form, setForm] = useState(() => buildEmptyForm(mergeCustomEquipmentFamilyFields(family?.fields || []), defaultSite));
  const [initialSnapshot, setInitialSnapshot] = useState(() => buildEmptyForm(mergeCustomEquipmentFamilyFields(family?.fields || []), defaultSite));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fields = useMemo(() => mergeCustomEquipmentFamilyFields(family?.fields || []), [family?.fields]);
  const fieldsSignature = useMemo(
    () => (fields || []).map(field => `${field.fieldKey}:${field.fieldType}:${field.label}:${field.required ? 1 : 0}`).join("|"),
    [fields]
  );
  const sharedFieldKeys = useMemo(() => new Set(getSharedEquipmentFieldDefs().map(field => field.key)), []);
  const commonFields = useMemo(
    () => fields.filter(field => sharedFieldKeys.has(field.fieldKey) && !STATUS_FIELD_KEYS.has(field.fieldKey) && !isLocationField(field)),
    [fields, sharedFieldKeys]
  );
  const detailFields = useMemo(
    () => fields.filter(field => !sharedFieldKeys.has(field.fieldKey) && !STATUS_FIELD_KEYS.has(field.fieldKey) && !isLocationField(field)),
    [fields, sharedFieldKeys]
  );
  const detailInputFields = useMemo(() => detailFields.filter(field => !isEquipmentLayoutField(field)), [detailFields]);
  const detailFieldGroups = useMemo(() => groupEquipmentFieldsBySection(detailFields), [detailFields]);
  const isAddMode = !item?.id;
  const itemId = item?.id ?? null;
  const familyKey = family?.familyKey || "";
  const availableSites = useMemo(() => {
    const sites = buildAvailableSites(client, item);
    const current = String(form.site || "").trim();
    if (current && current !== "Sans site" && !sites.includes(current)) {
      return [...sites, current].sort((a, b) => a.localeCompare(b, "fr"));
    }
    return sites;
  }, [client, item, form.site]);
  const siteOptions = useMemo(
    () => normalizeClientSites(client?.sites || []).map(site => getSiteLocationValue(site)).filter(Boolean),
    [client?.sites]
  );

  const sections = useMemo(() => BASE_SECTIONS.map(section => {
    const localized = sectionCopy[section.id] || {};
    return {
      ...section,
      label: localized.label || section.label,
      description: localized.description || section.description
    };
  }), [sectionCopy]);

  const navGroups = useMemo(() => groupEquipmentFormSections(sections), [sections]);
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, navGroups]);

  useEffect(() => {
    if (!isOpen || !family) return;
    const nextForm = item
      ? buildFormFromItem(item, fields)
      : buildEmptyForm(fields, defaultSite || "");
    setForm(nextForm);
    setInitialSnapshot(cloneFormSnapshot(nextForm));
    setActiveSection("identity");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally ignore unstable item/family object identity
  }, [isOpen, familyKey, itemId, fieldsSignature, defaultSite]);

  const patchForm = useCallback(patch => {
    setForm(prev => {
      if (Object.prototype.hasOwnProperty.call(patch, "site")) {
        return applySiteToForm({
          ...prev,
          ...patch
        }, String(patch.site || "").trim());
      }
      return {
        ...prev,
        ...patch
      };
    });
  }, []);

  const hasChanges = useMemo(() => !formsEqual(form, initialSnapshot), [form, initialSnapshot]);
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges: hasChanges,
    blocked: saving || deleting
  });

  const sectionMeta = useMemo(() => {
    const identityDone = Boolean(String(form.name || "").trim());
    const commonDone = commonFields.every(field => {
      if (!field.required) return true;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") return true;
      return value != null && String(value).trim() !== "";
    });
    const detailsDone = detailInputFields.every(field => {
      if (!field.required) return true;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") return true;
      return value != null && String(value).trim() !== "";
    });
    return {
      identity: identityDone,
      common: commonDone,
      details: detailsDone
    };
  }, [form, commonFields, detailInputFields]);

  const isRequiredSectionIncomplete = useCallback(sectionId => {
    if (sectionId === "identity") return !String(form.name || "").trim();
    return false;
  }, [form.name]);

  const handleSubmit = async () => {
    if (!clientId || !family?.familyKey) return;
    const name = String(form.name || "").trim();
    if (!name) {
      toast.warning(copy.validation?.nameRequired || (locale === "fr" ? "Le nom est obligatoire" : "Name is required"));
      setActiveSection("identity");
      return;
    }
    for (const field of fields) {
      if (isEquipmentLayoutField(field)) continue;
      if (isLocationField(field)) continue;
      if (!field.required) continue;
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") continue;
      if (value == null || String(value).trim() === "") {
        toast.warning(interpolate(copy.validation?.extraFieldRequired || "{field} is required", { field: field.label }));
        setActiveSection(sharedFieldKeys.has(field.fieldKey) ? "common" : "details");
        return;
      }
    }
    const siteValue = String(form.site || "").trim();
    const payloadFields = {};
    fields.forEach(field => {
      if (isEquipmentLayoutField(field)) return;
      if (STATUS_FIELD_KEYS.has(field.fieldKey)) return;
      if (isLocationField(field)) {
        payloadFields[field.fieldKey] = siteValue || null;
        return;
      }
      const value = form[field.fieldKey];
      if (field.fieldType === "boolean") {
        payloadFields[field.fieldKey] = Boolean(value);
      } else if (field.fieldType === "number") {
        if (value === false) payloadFields[field.fieldKey] = 0;
        else if (value === true) payloadFields[field.fieldKey] = 1;
        else if (value != null && String(value).trim() !== "") {
          const amount = Number(value);
          payloadFields[field.fieldKey] = Number.isFinite(amount) ? amount : null;
        } else {
          payloadFields[field.fieldKey] = null;
        }
      } else if (value != null && String(value).trim() !== "") {
        payloadFields[field.fieldKey] = value;
      } else {
        payloadFields[field.fieldKey] = null;
      }
    });
    payloadFields.site = siteValue || null;
    payloadFields.location = siteValue || null;
    payloadFields.emplacement = siteValue || null;
    payloadFields.lieu = siteValue || null;
    setSaving(true);
    try {
      const payload = {
        name,
        fields: payloadFields,
        is_active: form.is_active !== false
      };
      if (isAddMode) {
        const saved = await addClientCustomEquipment(clientId, family.familyKey, payload);
        toast.success(formCopy.toastAdded);
        await onRefresh?.(saved);
      } else {
        const saved = await updateClientCustomEquipment(clientId, family.familyKey, item.id, payload);
        toast.success(formCopy.toastUpdated);
        await onRefresh?.(saved);
      }
      onClose();
    } catch (error) {
      toast.error(error.message || formCopy.toastSaveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !item?.id || !family?.familyKey) return;
    const confirmMessage = interpolate(configCopy.confirm.deleteCustomEquipment.message, {
      name: item.name || form.name || configCopy.confirm.deleteCustomEquipment.fallbackName
    });
    if (!window.confirm(confirmMessage)) return;
    setDeleting(true);
    try {
      await deleteClientCustomEquipment(clientId, family.familyKey, item.id);
      toast.success(formCopy.toastDeleted);
      await onRefresh?.(null);
      onClose();
    } catch (error) {
      toast.error(error.message || formCopy.toastDeleteError);
    } finally {
      setDeleting(false);
    }
  };

  const renderFieldInput = field => {
    const value = form[field.fieldKey];
    const id = `custom-equipment-${field.fieldKey}`;
    const labelClass = field.required ? `${styles.label} ${styles.labelRequired}` : styles.label;
    if (isLocationField(field)) {
      return (
        <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label || formFields.location || "Lieux"}</label>
          <SiteSuggestInput
            id={id}
            value={value || ""}
            onChange={nextValue => patchForm({ site: nextValue })}
            sites={availableSites}
            placeholder={formFields.locationPlaceholder || ""}
          />
        </div>
      );
    }
    if (field.fieldType === "textarea") {
      return (
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <textarea
            id={id}
            className={styles.input}
            rows={4}
            value={value || ""}
            onChange={e => patchForm({ [field.fieldKey]: e.target.value })}
          />
        </div>
      );
    }
    if (field.fieldType === "boolean") {
      return (
        <div className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          <label style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8125rem",
            color: "var(--msp-muted, #5c6b82)",
            cursor: "pointer"
          }}>
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={e => patchForm({ [field.fieldKey]: e.target.checked })}
            />
            {formFields.yes || "Oui"}
          </label>
        </div>
      );
    }
    if (field.fieldType === "number") {
      return (
        <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <FormNumberStepper
            id={id}
            value={value ?? ""}
            onChange={next => patchForm({ [field.fieldKey]: next })}
          />
        </div>
      );
    }
    if (field.fieldType === "select") {
      const options = getEquipmentFieldSelectOptions(field);
      return (
        <div className={styles.field}>
          <label className={labelClass} htmlFor={id}>{field.label}</label>
          <select
            id={id}
            className={styles.input}
            value={value ?? ""}
            onChange={e => patchForm({ [field.fieldKey]: e.target.value })}
          >
            <option value="">-</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className={styles.field}>
        <label className={labelClass} htmlFor={id}>{field.label}</label>
        <input
          id={id}
          type={field.fieldType === "date" ? "date" : "text"}
          className={styles.input}
          value={value ?? ""}
          onChange={e => patchForm({ [field.fieldKey]: e.target.value })}
        />
      </div>
    );
  };

  if (!isOpen || !family) return null;

  const familyLabel = family.label || "Equipment";
  const equipmentName = item?.name || form.name || "";
  const modalTitle = isAddMode
    ? interpolate(formCopy.addModuleTitle || "Ajouter un {module}", { module: familyLabel.toLowerCase() })
    : interpolate(formCopy.editEquipmentTitle || "Modifier {name}", {
      name: equipmentName || formCopy.editEquipmentFallback || familyLabel
    });
  const modalSubtitle = isAddMode
    ? (formCopy.addEquipmentSubtitle || "")
    : interpolate(formCopy.editEquipmentSubtitle || "{module} · Mettez à jour les champs par section.", { module: familyLabel });
  const submitDisabled = saving || deleting || !isAddMode && !hasChanges;
  const activeSectionMeta = sections.find(section => section.id === activeSection);
  const sectionIncomplete = isAddMode && isRequiredSectionIncomplete(activeSection);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={requestClose} role="presentation">
        <div className={`${styles.shell} ${styles.shellEquipment}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="custom-equipment-modal-title">
          <div className={styles.accentBar} aria-hidden />
          <header className={styles.header}>
            <div className={styles.headerMain}>
              <div className={styles.headerIconWrap} aria-hidden>
                <Icon icon={isAddMode ? family.icon || "mdi:plus-circle-outline" : "mdi:pencil-outline"} />
              </div>
              <div className={styles.headerText}>
                <p className={styles.eyebrow}>{formCopy.eyebrowEquipment || "Fiche matériel"}</p>
                <h2 className={styles.title} id="custom-equipment-modal-title">
                  {modalTitle}
                </h2>
                <p className={styles.subtitle}>{modalSubtitle}</p>
              </div>
            </div>
            <div className={styles.headerTrailing}>
              <label className={styles.headerStatusToggle}>
                <span className={styles.headerStatusLabel}>
                  {form.is_active === false
                    ? (formFields.inactive || "Inactif")
                    : (formFields.active || "Actif")}
                </span>
                <span className={styles.switchWrap}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={form.is_active !== false}
                    onChange={e => patchForm({ is_active: e.target.checked })}
                    role="switch"
                    aria-checked={form.is_active !== false}
                    disabled={saving || deleting}
                  />
                  <span className={styles.switchTrack} aria-hidden="true">
                    <span className={styles.switchThumb} />
                  </span>
                </span>
              </label>
              <UiKitButton
                type="button"
                square
                variant="secondary"
                className={styles.closeBtn}
                onClick={requestClose}
                disabled={saving || deleting}
                aria-label={formCopy.close || "Fermer"}
                icon="mdi:close"
              />
            </div>
          </header>

          <div className={styles.body}>
            <aside className={`${kit.finderSidebar} ${styles.modalNav}`} aria-label={formCopy.navAria || "Sections du formulaire"}>
              <nav
                ref={navTrackRef}
                className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${styles.modalNavTrack}`}
              >
                <div
                  className={kit.finderNavIndicator}
                  style={{
                    transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                    height: navIndicator.height,
                    opacity: navIndicator.ready ? 1 : 0
                  }}
                  aria-hidden
                />
                {navGroups.map(group => (
                  <div
                    key={group.id}
                    className={kit.finderNavGroup}
                    role="group"
                    aria-label={!group.hideTitle ? (formCopy.navGroups?.[group.id] || group.id) : undefined}
                  >
                    {!group.hideTitle ? (
                      <p className={kit.finderNavGroupTitle}>{formCopy.navGroups?.[group.id] || group.id}</p>
                    ) : null}
                    {group.sections.map(section => (
                      <CustomNavSectionButton
                        key={section.id}
                        section={section}
                        active={activeSection === section.id}
                        incomplete={isRequiredSectionIncomplete(section.id)}
                        done={Boolean(sectionMeta[section.id])}
                        onSelect={() => setActiveSection(section.id)}
                      />
                    ))}
                  </div>
                ))}
              </nav>
            </aside>

            <div className={styles.content} key={activeSection}>
              <div className={kit.contentFadeUp}>
                <div className={styles.sectionFill}>
                  <div className={`${styles.sectionHead} ${styles.sectionPinned}`}>
                    <h3 className={`${styles.sectionTitle} ${sectionIncomplete ? styles.navItemLabelRequired : ""}`}>
                      {activeSectionMeta?.label}
                    </h3>
                    <p className={styles.sectionDesc}>{activeSectionMeta?.description}</p>
                  </div>
                  <div className={styles.sectionScroll}>
                    {activeSection === "identity" ? (
                      <div className={styles.fieldGrid2}>
                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="custom-equipment-name">
                            {formFields.name || "Name"}
                          </label>
                          <input
                            id="custom-equipment-name"
                            type="text"
                            className={styles.input}
                            value={form.name}
                            onChange={e => patchForm({ name: e.target.value })}
                            placeholder={formFields.namePlaceholder || ""}
                            required
                          />
                        </div>
                        <div className={`${styles.field} ${styles.fieldFull}`}>
                          <label className={styles.label} htmlFor="custom-equipment-site">
                            {formFields.location || "Site"}
                          </label>
                          <SiteSuggestInput
                            id="custom-equipment-site"
                            value={form.site || ""}
                            onChange={nextValue => patchForm({ site: nextValue })}
                            sites={availableSites.length ? availableSites : siteOptions}
                            placeholder={formFields.locationPlaceholder || ""}
                          />
                        </div>
                      </div>
                    ) : null}

                    {activeSection === "common" ? (
                      commonFields.length === 0 ? (
                        <p className={styles.hint}>{locale === "fr" ? "Aucun champ partagé." : "No shared fields."}</p>
                      ) : (
                        <div className={styles.fieldGrid2}>
                          {commonFields.map(field => renderFieldInput({
                            ...field,
                            label: field.label || getSharedEquipmentFieldLabel(field.fieldKey, locale)
                          }))}
                        </div>
                      )
                    ) : null}

                    {activeSection === "details" ? (
                      detailInputFields.length === 0 ? (
                        <p className={styles.hint}>
                          {locale === "fr"
                            ? "Aucun champ spécifique configuré pour cette famille."
                            : "No specific fields configured for this family."}
                        </p>
                      ) : (
                        detailFieldGroups.map((group, groupIndex) => {
                          const groupKey = group.section?.fieldKey || group.section?.clientId || `group-${groupIndex}`;
                          const sectionLabel = String(group.section?.label || "").trim();
                          return (
                            <div key={groupKey} className={styles.fieldGroupBlock}>
                              {sectionLabel ? <h4 className={styles.fieldGroupTitle}>{sectionLabel}</h4> : null}
                              <div className={styles.fieldGrid2}>
                                {(group.fields || []).map(field => renderFieldInput(field))}
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <span className={styles.footerHint}>
              {isAddMode
                ? (formCopy.footerRequired || "Les champs marqués * sont obligatoires")
                : hasChanges
                  ? (formCopy.footerUnsaved || "Modifications non enregistrées")
                  : (formCopy.footerNoChanges || "Aucune modification")}
            </span>
            <div className={styles.footerActions}>
              {!isAddMode ? (
                <UiKitButton
                  type="button"
                  variant="ghost"
                  className={styles.footerDeleteBtn}
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  icon="mdi:delete-outline"
                >
                  {deleting ? (formCopy.deleting || "Suppression…") : (formCopy.delete || "Supprimer")}
                </UiKitButton>
              ) : null}
              <UiKitButton type="button" variant="secondary" onClick={requestClose} disabled={saving || deleting}>
                {formCopy.cancel || "Annuler"}
              </UiKitButton>
              <UiKitButton
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={submitDisabled}
                icon={saving ? undefined : isAddMode ? "mdi:check" : "mdi:content-save-outline"}
              >
                {saving ? (
                  <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {formCopy.saving || "Enregistrement…"}
                  </>
                ) : isAddMode ? (
                  formCopy.createEquipment || "Créer l'équipement"
                ) : (
                  formCopy.save || "Enregistrer"
                )}
              </UiKitButton>
            </div>
          </footer>
        </div>
      </div>
      <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>,
    document.getElementById("modal-root") || document.body
  );
}
