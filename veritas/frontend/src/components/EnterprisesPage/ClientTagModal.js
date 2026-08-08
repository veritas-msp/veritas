import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { fetchTagCatalog } from "../../api/clients";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { CLIENT_TAG_COLORS, DEFAULT_CLIENT_TAG_COLOR, getTagChipStyle, isPresetTagColor, normalizeTagColor } from "./clientTagColors";
import { getClientTagColorLabel, getClientTagModalCopy } from "./clientTagModalI18n";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./ClientTagModal.module.css";
const TAG_SECTION_IDS = [{
  id: "catalog",
  icon: "mdi:tag-multiple-outline"
}, {
  id: "create",
  icon: "mdi:tag-plus-outline"
}];
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
  const [activeSection, setActiveSection] = useState("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTags, setCatalogTags] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(DEFAULT_CLIENT_TAG_COLOR);
  const [customColorInput, setCustomColorInput] = useState(DEFAULT_CLIENT_TAG_COLOR);
  const initialSectionChosenRef = useRef(false);
  const availableTags = useMemo(() => {
    const assigned = new Set(assignedTags.map(tag => tag.label));
    const query = catalogSearch.trim().toLowerCase();
    return catalogTags.filter(tag => !assigned.has(tag.label)).filter(tag => !query || tag.label.toLowerCase().includes(query)).sort((a, b) => a.label.localeCompare(b.label));
  }, [catalogTags, assignedTags, catalogSearch]);
  useEffect(() => {
    if (!open) return;
    initialSectionChosenRef.current = false;
    setCatalogSearch("");
    setLabel("");
    setColor(DEFAULT_CLIENT_TAG_COLOR);
    setCustomColorInput(DEFAULT_CLIENT_TAG_COLOR);
    setActiveSection("catalog");
    let cancelled = false;
    setLoadingCatalog(true);
    fetchTagCatalog().then(data => {
      if (cancelled) return;
      const tags = Array.isArray(data) ? data : [];
      setCatalogTags(tags);
      if (!initialSectionChosenRef.current) {
        const assigned = new Set(assignedTags.map(tag => tag.label));
        const available = tags.filter(tag => !assigned.has(tag.label));
        setActiveSection(available.length > 0 ? "catalog" : "create");
        initialSectionChosenRef.current = true;
      }
    }).catch(() => {
      if (!cancelled) {
        setCatalogTags([]);
        if (!initialSectionChosenRef.current) {
          setActiveSection("create");
          initialSectionChosenRef.current = true;
        }
      }
    }).finally(() => {
      if (!cancelled) setLoadingCatalog(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const previewLabel = label.trim() || copy.create.previewDefault;
  const previewColor = normalizeTagColor(color) || DEFAULT_CLIENT_TAG_COLOR;
  const normalizedCustomInput = normalizeTagColor(customColorInput);
  const customColorInvalid = customColorInput.trim() !== "" && !normalizedCustomInput;
  const isCustomColor = !isPresetTagColor(previewColor);
  if (!open) return null;
  const handleCreate = event => {
    event?.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || saving) return;
    onSubmit({
      label: trimmed,
      color: previewColor
    });
  };
  const handlePickExisting = tag => {
    if (saving) return;
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
    if (normalized) {
      setColor(normalized);
    }
  };
  const footerHint = activeSection === "catalog" ? availableTags.length > 0 ? copy.footer.pickTag : copy.footer.noTags : copy.footer.requiredFields;
  const entityKindLabel = copy.entityKind[entityKind] || copy.entityKind.client;
  const subtitle = entityName ? interpolate(copy.subtitleWithName, {
    name: entityName
  }) : copy.subtitleDefault;
  const renderCatalogSection = () => <div className={styles.sectionStack}>
      <div className={`${formStyles.sectionHead} ${styles.sectionHeadCompact}`}>
        <h3 className={formStyles.sectionTitle}>{copy.catalog.title}</h3>
        <p className={`${formStyles.sectionDesc} ${styles.sectionDescCompact}`}>
          {copy.catalog.description}
        </p>
      </div>

      <div className={`${formStyles.field} ${styles.fieldCompact}`}>
        <label className={formStyles.label} htmlFor="client-tag-catalog-search">
          {copy.catalog.search}
        </label>
        <input id="client-tag-catalog-search" type="search" className={formStyles.input} placeholder={copy.catalog.searchPlaceholder} value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} disabled={saving || loadingCatalog} />
      </div>

      {loadingCatalog ? <div className={styles.catalogLoading}>
          <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
          <span>{copy.catalog.loading}</span>
        </div> : availableTags.length === 0 ? <div className={styles.emptyCatalog}>
          <Icon icon="mdi:tag-off-outline" className={styles.emptyCatalogIcon} aria-hidden />
          <p>{copy.catalog.empty}</p>
          <button type="button" className={formStyles.ghostBtn} onClick={() => setActiveSection("create")}>
            {copy.catalog.createBtn}
          </button>
        </div> : <div className={styles.existingTags}>
          {availableTags.map(tag => <button key={tag.id} type="button" className={styles.existingTagBtn} style={getTagChipStyle(tag.color)} onClick={() => handlePickExisting(tag)} disabled={saving}>
              {tag.label}
            </button>)}
        </div>}
    </div>;
  const renderCreateSection = () => <div className={styles.sectionStack}>
      <div className={`${formStyles.sectionHead} ${styles.sectionHeadCompact}`}>
        <h3 className={formStyles.sectionTitle}>{copy.create.title}</h3>
        <p className={`${formStyles.sectionDesc} ${styles.sectionDescCompact}`}>
          {copy.create.description}
        </p>
      </div>

      <div className={formStyles.field}>
        <label className={`${formStyles.label} ${formStyles.labelRequired}`} htmlFor="client-tag-label">
          {copy.create.label}
        </label>
        <input id="client-tag-label" type="text" className={formStyles.input} placeholder={copy.create.labelPlaceholder} value={label} onChange={event => setLabel(event.target.value)} maxLength={64} autoFocus disabled={saving} />
      </div>

      <div className={formStyles.field}>
        <span className={formStyles.label}>{copy.create.color}</span>
        <div className={styles.colorPickerRow} role="radiogroup" aria-label={copy.create.colorAria}>
          {CLIENT_TAG_COLORS.map(entry => {
          const selected = previewColor === entry.value;
          return <button key={entry.value} type="button" role="radio" aria-checked={selected} aria-label={getClientTagColorLabel(locale, entry.value)} className={`${styles.colorSwatch} ${selected ? styles.colorSwatchActive : ""}`} style={{
            "--tag-color": entry.value
          }} onClick={() => applyColor(entry.value)} disabled={saving}>
                {selected ? <Icon icon="mdi:check" aria-hidden /> : null}
              </button>;
        })}

          <label className={`${styles.colorSwatch} ${styles.colorSwatchCustom} ${isCustomColor ? styles.colorSwatchActive : ""}`} style={{
          "--tag-color": previewColor
        }} title={copy.create.customColorTitle}>
            <input type="color" className={styles.nativeColorInputHidden} value={previewColor} onChange={event => applyColor(event.target.value)} disabled={saving} aria-label={copy.create.pickCustomColorAria} />
            {isCustomColor ? <Icon icon="mdi:check" aria-hidden /> : <Icon icon="mdi:palette-outline" aria-hidden />}
          </label>

          <input type="text" className={`${styles.hexInputInline} ${customColorInvalid ? styles.inputInvalid : ""}`} value={customColorInput} onChange={event => handleCustomColorInputChange(event.target.value)} placeholder="#2b5fab" spellCheck={false} maxLength={7} disabled={saving} aria-label={copy.create.hexAria} aria-invalid={customColorInvalid} />
        </div>
        {customColorInvalid ? <p className={styles.fieldHintError}>{copy.create.hexFormatError}</p> : null}
      </div>

      <div className={`${formStyles.field} ${styles.previewField}`}>
        <span className={formStyles.label}>{copy.create.preview}</span>
        <span className={styles.previewChip} style={getTagChipStyle(previewColor)}>
          {previewLabel}
        </span>
      </div>
    </div>;
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="client-tag-modal-title">
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
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.body}>
          <nav className={formStyles.nav} aria-label={copy.navAria}>
            {TAG_SECTION_IDS.map(section => {
            const sectionCopy = copy.sections[section.id];
            return <button key={section.id} type="button" className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                  <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                  <span className={formStyles.navItemText}>
                    <span className={`${formStyles.navItemLabel} ${section.id === "create" && !label.trim() ? formStyles.navItemLabelRequired : ""}`}>
                      {sectionCopy.label}
                    </span>
                    <span className={formStyles.navItemHint}>{sectionCopy.description}</span>
                  </span>
                  {section.id === "catalog" && availableTags.length > 0 ? <span className={formStyles.navBadge}>{availableTags.length}</span> : null}
                  {section.id === "create" && label.trim() ? <span className={formStyles.navBadge}>✓</span> : null}
                </button>;
          })}
          </nav>

          <div className={formStyles.content}>
            <form onSubmit={handleCreate}>
              {activeSection === "catalog" ? renderCatalogSection() : renderCreateSection()}
            </form>
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{footerHint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {copy.cancel}
            </button>
            {activeSection === "create" ? <button type="button" className={formStyles.primaryBtn} onClick={handleCreate} disabled={!label.trim() || saving || customColorInvalid}>
                {saving ? <>
                    <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                    {copy.adding}
                  </> : <>
                    <Icon icon="mdi:plus" aria-hidden />
                    {copy.addTag}
                  </>}
              </button> : null}
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
