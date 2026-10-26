import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchTagCatalog } from "../../api/clients";
import { fetchEquipmentTagCatalog } from "../../api/equipment";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { uiKitLayoutsStyles as kit } from "../UiKit";
import {
  CLIENT_TAG_COLORS,
  DEFAULT_CLIENT_TAG_COLOR,
  getTagChipStyle,
  isPresetTagColor,
  normalizeTagColor
} from "./clientTagColors";
import { getClientTagColorLabel, getClientTagModalCopy } from "./clientTagModalI18n";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./ClientTagModal.module.css";

export default function ClientTagModal({
  open = false,
  entityName = "",
  entityKind = "client",
  assignedTags = [],
  saving = false,
  onClose,
  onSubmit
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientTagModalCopy(locale), [locale]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTags, setCatalogTags] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(DEFAULT_CLIENT_TAG_COLOR);
  const [customColorInput, setCustomColorInput] = useState(DEFAULT_CLIENT_TAG_COLOR);

  const assignedLabels = useMemo(
    () => new Set(assignedTags.map(tag => String(tag.label || "").trim().toLowerCase()).filter(Boolean)),
    [assignedTags]
  );

  const cloudTags = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return catalogTags
      .filter(tag => !query || String(tag.label || "").toLowerCase().includes(query))
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }, [catalogTags, catalogSearch]);

  useEffect(() => {
    if (!open) return undefined;
    setCatalogSearch("");
    setLabel("");
    setColor(DEFAULT_CLIENT_TAG_COLOR);
    setCustomColorInput(DEFAULT_CLIENT_TAG_COLOR);
    let cancelled = false;
    setLoadingCatalog(true);
    const loadCatalog = entityKind === "equipment" ? fetchEquipmentTagCatalog : fetchTagCatalog;
    loadCatalog()
      .then(data => {
        if (!cancelled) setCatalogTags(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCatalogTags([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entityKind]);

  const previewLabel = label.trim() || copy.create.previewDefault;
  const previewColor = normalizeTagColor(color) || DEFAULT_CLIENT_TAG_COLOR;
  const normalizedCustomInput = normalizeTagColor(customColorInput);
  const customColorInvalid = customColorInput.trim() !== "" && !normalizedCustomInput;
  const isCustomColor = !isPresetTagColor(previewColor);

  if (!open) return null;

  const handleCreate = event => {
    event?.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || saving || customColorInvalid) return;
    onSubmit({
      label: trimmed,
      color: previewColor
    });
  };

  const handlePickExisting = tag => {
    if (saving) return;
    const key = String(tag.label || "").trim().toLowerCase();
    if (assignedLabels.has(key)) return;
    onSubmit({
      label: tag.label,
      color: tag.color || DEFAULT_CLIENT_TAG_COLOR
    });
  };

  const applyColor = nextColor => {
    const normalized = normalizeTagColor(nextColor) || DEFAULT_CLIENT_TAG_COLOR;
    setColor(normalized);
    setCustomColorInput(normalized);
  };

  const handleCustomColorInputChange = value => {
    setCustomColorInput(value);
    const normalized = normalizeTagColor(value);
    if (normalized) setColor(normalized);
  };

  const entityKindLabel = copy.entityKind[entityKind] || copy.entityKind.client;
  const subtitle = entityName
    ? interpolate(copy.subtitleWithName, { name: entityName })
    : copy.subtitleDefault;
  const footerHint =
    cloudTags.length > 0 || loadingCatalog ? copy.footer.pickOrCreate : copy.footer.createOnly;

  return createPortal(
    <div className={formStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={`${formStyles.shell} ${formStyles.shellMedium} ${styles.shell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-tag-modal-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:tag-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{entityKindLabel}</p>
              <h2 className={formStyles.title} id="client-tag-modal-title">
                {copy.title}
              </h2>
              <p className={formStyles.subtitle}>{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={formStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label={copy.close}
          >
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.bodySingle}>
          <div className={`${formStyles.content} ${styles.content}`}>
            <div className={`${kit.contentFadeUp} ${styles.contentFadeRight}`} key="tag-modal-body">
              <section className={styles.section} aria-labelledby="client-tag-cloud-title">
                <div className={formStyles.sectionHead}>
                  <h3 id="client-tag-cloud-title" className={formStyles.sectionTitle}>
                    {copy.catalog.title}
                  </h3>
                </div>

                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="client-tag-catalog-search">
                    {copy.catalog.search}
                  </label>
                  <input
                    id="client-tag-catalog-search"
                    type="search"
                    className={formStyles.input}
                    placeholder={copy.catalog.searchPlaceholder}
                    value={catalogSearch}
                    onChange={event => setCatalogSearch(event.target.value)}
                    disabled={saving || loadingCatalog}
                  />
                </div>

                {loadingCatalog ? (
                  <div className={styles.catalogLoading}>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    <span>{copy.catalog.loading}</span>
                  </div>
                ) : cloudTags.length === 0 ? (
                  <div className={styles.emptyCatalog}>
                    <Icon icon="mdi:tag-off-outline" className={styles.emptyCatalogIcon} aria-hidden />
                    <p>{copy.catalog.empty}</p>
                  </div>
                ) : (
                  <div className={styles.tagCloud} role="list" aria-label={copy.catalog.title}>
                    {cloudTags.map(tag => {
                      const key = String(tag.label || "").trim().toLowerCase();
                      const alreadyAssigned = assignedLabels.has(key);
                      return (
                        <button
                          key={tag.id || tag.label}
                          type="button"
                          role="listitem"
                          className={`${styles.tagChip} ${alreadyAssigned ? styles.tagChipAssigned : ""}`}
                          style={getTagChipStyle(tag.color)}
                          onClick={() => handlePickExisting(tag)}
                          disabled={saving || alreadyAssigned}
                          title={
                            alreadyAssigned
                              ? copy.catalog.alreadyAssigned || tag.label
                              : tag.label
                          }
                          aria-label={
                            alreadyAssigned
                              ? interpolate(copy.catalog.alreadyAssignedAria || "{label} déjà associée", {
                                  label: tag.label
                                })
                              : tag.label
                          }
                        >
                          {alreadyAssigned ? (
                            <Icon icon="mdi:check" className={styles.tagChipCheck} aria-hidden />
                          ) : null}
                          <span>{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className={styles.divider} aria-hidden />

              <section className={styles.section} aria-labelledby="client-tag-create-title">
                <div className={formStyles.sectionHead}>
                  <h3 id="client-tag-create-title" className={formStyles.sectionTitle}>
                    {copy.create.title}
                  </h3>
                </div>

                <form className={styles.createForm} onSubmit={handleCreate}>
                  <div className={formStyles.field}>
                    <label
                      className={`${formStyles.label} ${formStyles.labelRequired}`}
                      htmlFor="client-tag-label"
                    >
                      {copy.create.label}
                    </label>
                    <input
                      id="client-tag-label"
                      type="text"
                      className={formStyles.input}
                      placeholder={copy.create.labelPlaceholder}
                      value={label}
                      onChange={event => setLabel(event.target.value)}
                      maxLength={64}
                      disabled={saving}
                    />
                  </div>

                  <div className={formStyles.field}>
                    <span className={formStyles.label}>{copy.create.color}</span>
                    <div className={styles.colorPickerRow} role="radiogroup" aria-label={copy.create.colorAria}>
                      {CLIENT_TAG_COLORS.map(entry => {
                        const selected = previewColor === entry.value;
                        return (
                          <button
                            key={entry.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={getClientTagColorLabel(locale, entry.value)}
                            className={`${styles.colorSwatch} ${selected ? styles.colorSwatchActive : ""}`}
                            style={{ "--tag-color": entry.value }}
                            onClick={() => applyColor(entry.value)}
                            disabled={saving}
                          >
                            {selected ? <Icon icon="mdi:check" aria-hidden /> : null}
                          </button>
                        );
                      })}

                      <label
                        className={`${styles.colorSwatch} ${styles.colorSwatchCustom} ${
                          isCustomColor ? styles.colorSwatchActive : ""
                        }`}
                        style={{ "--tag-color": previewColor }}
                        title={copy.create.customColorTitle}
                      >
                        <input
                          type="color"
                          className={styles.nativeColorInputHidden}
                          value={previewColor}
                          onChange={event => applyColor(event.target.value)}
                          disabled={saving}
                          aria-label={copy.create.pickCustomColorAria}
                        />
                        {isCustomColor ? (
                          <Icon icon="mdi:check" aria-hidden />
                        ) : (
                          <Icon icon="mdi:palette-outline" aria-hidden />
                        )}
                      </label>

                      <input
                        type="text"
                        className={`${styles.hexInputInline} ${customColorInvalid ? styles.inputInvalid : ""}`}
                        value={customColorInput}
                        onChange={event => handleCustomColorInputChange(event.target.value)}
                        placeholder="#2b5fab"
                        spellCheck={false}
                        maxLength={7}
                        disabled={saving}
                        aria-label={copy.create.hexAria}
                        aria-invalid={customColorInvalid}
                      />
                    </div>
                    {customColorInvalid ? (
                      <p className={styles.fieldHintError}>{copy.create.hexFormatError}</p>
                    ) : null}
                  </div>

                  <div className={`${formStyles.field} ${styles.previewField}`}>
                    <span className={formStyles.label}>{copy.create.preview}</span>
                    <span className={styles.previewChip} style={getTagChipStyle(previewColor)}>
                      {previewLabel}
                    </span>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{footerHint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {copy.cancel}
            </button>
            <button
              type="button"
              className={formStyles.primaryBtn}
              onClick={handleCreate}
              disabled={!label.trim() || saving || customColorInvalid}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {copy.adding}
                </>
              ) : (
                <>
                  <Icon icon="mdi:plus" aria-hidden />
                  {copy.addTag}
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
