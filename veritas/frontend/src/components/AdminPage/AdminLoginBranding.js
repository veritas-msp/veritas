import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAdminPageCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { deleteLoginBrandingAsset, fetchLoginBrandingAdmin, updateLoginBranding, uploadLoginBrandingAsset } from "../../api/loginBranding";
import { sanitizeLoginBrandingHtml } from "../../utils/sanitizeHtml";
import {
  DEFAULT_CANVAS_POSITIONS,
  DEFAULT_SIDE_COLORS,
  LOGIN_BRANDING_MAX_UPLOAD_BYTES,
  LOGIN_CANVAS_ELEMENTS,
  LOGIN_SIDES,
  LOGIN_TYPO_DEFAULTS,
  LOGIN_TYPO_OPTIONS,
  buildLoginAdminPreviewStyleVars,
  canvasElementStyle,
  flatToSideForm,
  normalizeCanvasPositions,
  resolveBrandingText,
  resolveLoginAssetUrl,
  sideFormToFlat
} from "../../utils/loginBrandingUtils";
import { Page, Card, Field, Input, Textarea, Btn, Switch, FormGrid, SubTabs } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import s from "./AdminLoginBranding.module.css";

const EMPTY_SIDE = {
  enabled: false,
  headlineLine1: "",
  headlineLine2: "",
  sub: "",
  features: "",
  brandName: "",
  logoPath: "",
  logoTransparent: false,
  logoBgColor: "",
  bgImagePath: "",
  bgColorStart: "",
  bgColorEnd: "",
  accentColor: "",
  rightBgColor: "",
  rightBgImagePath: "",
  footerText: "",
  ...LOGIN_TYPO_DEFAULTS,
  canvasPositions: { ...DEFAULT_CANVAS_POSITIONS },
  htmlBlock: "",
  formHtml: ""
};

const DEFAULT_OPEN_SECTIONS = {
  content: true,
  layout: true,
  canvas: true,
  typo: true,
  html: false,
  visual: true
};

function ColorField({ label, hint, value, onChange, fallback }) {
  const display = value || fallback || "#000000";
  return <Field label={label} hint={hint}>
      <div className={s.colorRow}>
        <input type="color" className={s.colorInput} value={display} onChange={e => onChange(e.target.value)} aria-label={label} />
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={fallback} />
        {value ? <button type="button" className={s.colorReset} onClick={() => onChange("")}>×</button> : null}
      </div>
    </Field>;
}

function SelectField({ label, hint, value, onChange, options, optionLabels }) {
  return <Field label={label} hint={hint}>
      <select className={s.select} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(opt => <option key={opt} value={opt}>{optionLabels?.[opt] || opt}</option>)}
      </select>
    </Field>;
}

function AssetUploadField({
  label,
  hint,
  path,
  onUpload,
  onDelete,
  uploading,
  chooseLabel,
  removeLabel,
  previewBackground
}) {
  const inputRef = useRef(null);
  const previewUrl = resolveLoginAssetUrl(path);
  return <Field label={label} hint={hint}>
      <div className={s.assetBox}>
        {previewUrl ? <div className={s.assetPreview} style={previewBackground ? { background: previewBackground } : undefined}>
            <img src={previewUrl} alt="" />
          </div> : <div className={s.assetPlaceholder}>-</div>}
        <div className={s.assetActions}>
          <Btn variant="secondary" icon="mdi:upload" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "…" : chooseLabel}
          </Btn>
          {path ? <Btn variant="ghost" disabled={uploading} onClick={onDelete}>
              {removeLabel}
            </Btn> : null}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className={s.hiddenFile} onChange={e => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onUpload(file);
      }} />
      </div>
    </Field>;
}

function CollapsibleSection({
  title,
  description,
  open,
  onToggle,
  children
}) {
  return <section className={s.section}>
      <button type="button" className={s.sectionToggle} onClick={onToggle} aria-expanded={open}>
        <div className={s.sectionToggleText}>
          <span className={s.sectionTitle}>{title}</span>
          {description ? <span className={s.sectionDesc}>{description}</span> : null}
        </div>
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} className={s.sectionChevron} aria-hidden />
      </button>
      {open ? <div className={s.sectionBody}>{children}</div> : null}
    </section>;
}

function LoginPreview({ side, form, copy, onCanvasPosChange }) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const defaults = DEFAULT_SIDE_COLORS[side];
  const isCanvas = form.layoutMode === "canvas";
  const canvasPos = normalizeCanvasPositions(form.canvasPositions);
  const bgStart = form.bgColorStart || defaults.bgColorStart;
  const bgEnd = form.bgColorEnd || defaults.bgColorEnd;
  const accent = form.accentColor || defaults.accentColor;
  const logoUrl = resolveLoginAssetUrl(form.logoPath);
  const bgImageUrl = resolveLoginAssetUrl(form.bgImagePath);
  const rightBgImageUrl = resolveLoginAssetUrl(form.rightBgImagePath);
  const logoBg = form.logoBgColor || defaults.logoBgColor;
  const features = String(form.features || "").split("\n").map(line => line.trim()).filter(Boolean).slice(0, 3);
  const htmlSafe = form.htmlBlock ? sanitizeLoginBrandingHtml(form.htmlBlock) : "";
  const typoStyle = buildLoginAdminPreviewStyleVars(form);
  const panelStyle = {
    ...typoStyle,
    background: bgImageUrl
      ? `linear-gradient(160deg, ${bgStart}dd 0%, ${bgEnd}dd 100%), url("${bgImageUrl}") center/cover`
      : `linear-gradient(160deg, ${bgStart} 0%, ${bgEnd} 100%)`,
    ...(isCanvas ? {
      textAlign: "left",
      justifyContent: "flex-start",
      alignItems: "stretch"
    } : {
      textAlign: form.contentAlign === "center" ? "center" : "left",
      justifyContent: form.contentValign === "center" ? "center" : form.contentValign === "bottom" ? "flex-end" : "flex-start",
      alignItems: form.contentAlign === "center" ? "center" : "stretch"
    })
  };
  const rightPanelStyle = {
    ...(rightBgImageUrl ? {
      backgroundColor: form.rightBgColor || defaults.rightBgColor,
      backgroundImage: `url("${rightBgImageUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    } : {
      background: form.rightBgColor || defaults.rightBgColor
    }),
    ...(isCanvas ? { position: "relative", alignItems: "stretch", justifyContent: "stretch" } : {})
  };
  const headline1 = resolveBrandingText(form.headlineLine1, copy.previewHeadline1);
  const headline2 = resolveBrandingText(form.headlineLine2, copy.previewHeadline2);
  const sub = resolveBrandingText(form.sub, copy.previewSub);
  const brandName = form.brandName === "" ? "Veritas" : String(form.brandName || "").trim() || "";
  const htmlBlock = htmlSafe ? <div className={s.previewHtml} dangerouslySetInnerHTML={{ __html: htmlSafe }} /> : null;

  const startDrag = (key, panelRef) => e => {
    if (!isCanvas || !onCanvasPosChange || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const onMove = ev => {
      const x = Math.min(95, Math.max(0, Math.round((ev.clientX - rect.left) / rect.width * 1000) / 10));
      const y = Math.min(95, Math.max(0, Math.round((ev.clientY - rect.top) / rect.height * 1000) / 10));
      onCanvasPosChange(key, { x, y });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const canvasItem = (key, panelRef, className, children, Tag = "div") => {
    if (!isCanvas) return <Tag className={className}>{children}</Tag>;
    return <Tag
      className={`${className} ${s.canvasDraggable}`}
      style={canvasElementStyle(canvasPos[key])}
      onPointerDown={startDrag(key, panelRef)}
      role="button"
      tabIndex={0}
      title={copy.canvasDragHint || "Drag to move"}
    >{children}</Tag>;
  };

  return <div className={s.previewShell}>
      <p className={s.previewLabel}>{copy.previewLabel}{isCanvas ? <span className={s.previewCanvasHint}> · {copy.canvasDragHint || "Drag elements"}</span> : null}</p>
      <div className={s.previewFrame}>
        <aside ref={leftRef} className={`${s.previewLeft}${isCanvas ? ` ${s.previewLeftCanvas}` : ""}`} style={panelStyle}>
          {isCanvas ? <>
              {canvasItem("brand", leftRef, s.previewBrand, <>
                  {logoUrl ? <img src={logoUrl} alt="" className={s.previewLogo} style={form.logoTransparent ? { background: logoBg } : { background: "transparent" }} /> : <div className={s.previewBrandIcon} style={{ background: accent }}>V</div>}
                  <span className={s.previewBrandName}>{brandName || "\u00A0"}</span>
                </>)}
              {canvasItem("headline", leftRef, s.previewHeadline, <>
                  {headline1}
                  {headline1 || headline2 ? <br /> : null}
                  {headline2}
                </>, "h3")}
              {canvasItem("sub", leftRef, s.previewSub, sub, "p")}
              {canvasItem("features", leftRef, s.previewFeatures, features.map(item => <li key={item}>
                  <span style={{ background: accent }} />
                  {item}
                </li>), "ul")}
              {htmlSafe ? canvasItem("html", leftRef, s.previewHtml, <span dangerouslySetInnerHTML={{ __html: htmlSafe }} />) : null}
            </> : <>
              <div className={s.previewTop}>
                {form.htmlPosition === "before_headline" ? htmlBlock : null}
                <div className={s.previewBrand} style={form.logoAlign === "center" ? { justifyContent: "center" } : undefined}>
                  {logoUrl ? <img src={logoUrl} alt="" className={s.previewLogo} style={form.logoTransparent ? { background: logoBg } : { background: "transparent" }} /> : <div className={s.previewBrandIcon} style={{ background: accent }}>V</div>}
                  <span className={s.previewBrandName}>{brandName || "\u00A0"}</span>
                </div>
                <h3 className={s.previewHeadline}>
                  {headline1}
                  {headline1 || headline2 ? <br /> : null}
                  {headline2}
                </h3>
                <p className={s.previewSub}>{sub}</p>
                {form.htmlPosition === "after_sub" ? htmlBlock : null}
              </div>
              <div className={`${s.previewBottom}${form.contentValign === "center" || form.contentValign === "bottom" ? ` ${s.previewBottomInline}` : ""}`}>
                {features.length > 0 ? <ul className={s.previewFeatures} style={form.contentAlign === "center" ? { alignItems: "center" } : undefined}>
                    {features.map(item => <li key={item}>
                        <span style={{ background: accent }} />
                        {item}
                      </li>)}
                  </ul> : null}
                {form.htmlPosition === "after_features" || !form.htmlPosition ? htmlBlock : null}
                {form.htmlPosition === "bottom" ? htmlBlock : null}
              </div>
            </>}
        </aside>
        <div ref={rightRef} className={`${s.previewRight}${isCanvas ? ` ${s.previewRightCanvas}` : ""}`} style={rightPanelStyle}>
          {isCanvas ? <div
              className={`${s.previewCard} ${s.canvasDraggable}`}
              style={canvasElementStyle(canvasPos.formCard)}
              onPointerDown={startDrag("formCard", rightRef)}
              role="button"
              tabIndex={0}
              title={copy.canvasDragHint || "Drag to move"}
            >
              <div className={s.previewToggle} />
              <div className={s.previewField} />
              <div className={s.previewField} />
              <button type="button" className={s.previewBtn} style={{ background: accent }}>
                {copy.previewButton}
              </button>
            </div> : <div className={s.previewCard}>
              <div className={s.previewToggle} />
              <div className={s.previewField} />
              <div className={s.previewField} />
              <button type="button" className={s.previewBtn} style={{ background: accent }}>
                {copy.previewButton}
              </button>
            </div>}
        </div>
      </div>
    </div>;
}

export default function AdminLoginBranding({ isCommunity = false }) {
  const copy = useAdminPageCopy("loginBranding");
  const common = useCommonCopy();
  const [activeSide, setActiveSide] = useState("agent");
  const [forms, setForms] = useState({
    agent: { ...EMPTY_SIDE },
    client: { ...EMPTY_SIDE }
  });
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const FALLBACK_OPTIONS = {
    align: { left: "Left", center: "Center" },
    valign: { top: "Top · footer bottom", center: "Middle", bottom: "Bottom" },
    fontFamily: {
      default: "System",
      geometric: "Geometric",
      humanist: "Humanist / serif",
      slab: "Slab",
      mono: "Monospace"
    },
    size: { sm: "Small", md: "Medium", lg: "Large", xl: "Extra large" },
    weight: { "400": "Regular", "500": "Medium", "600": "Semibold", "700": "Bold", "800": "Extra bold" },
    tracking: { tight: "Tight", normal: "Normal", wide: "Wide" },
    lineHeight: { tight: "Tight", normal: "Normal", relaxed: "Relaxed" },
    htmlPosition: {
      before_headline: "Before headline",
      after_sub: "After subtitle",
      after_features: "With highlights (bottom)",
      bottom: "Bottom of panel"
    },
    layoutMode: { flow: "Flow (auto)", canvas: "Canvas (pixel)" },
    canvasElements: {
      brand: "Logo / brand",
      headline: "Headline",
      sub: "Subtitle",
      features: "Highlights",
      html: "HTML block",
      formCard: "Login form"
    }
  };
  const opt = { ...FALLBACK_OPTIONS, ...(copy.options || {}) };
  const sideTabs = useMemo(() => LOGIN_SIDES.map(side => ({
    key: side,
    label: copy.tabs[side],
    icon: side === "agent" ? "mdi:account-tie-outline" : "mdi:domain",
    proOnly: isCommunity
  })), [copy.tabs, isCommunity]);
  const toggleSection = key => {
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const load = useCallback(async () => {
    if (isCommunity) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchLoginBrandingAdmin();
      const settings = data.settings || {};
      setForms({
        agent: flatToSideForm(settings, "agent"),
        client: flatToSideForm(settings, "client")
      });
    } catch (err) {
      toast.error(err.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, isCommunity]);
  useEffect(() => {
    load();
  }, [load]);
  const form = forms[activeSide];
  const defaults = DEFAULT_SIDE_COLORS[activeSide];
  const setField = (key, value) => {
    setForms(prev => ({
      ...prev,
      [activeSide]: {
        ...prev[activeSide],
        [key]: value
      }
    }));
  };
  const setCanvasPos = (key, pos) => {
    setForms(prev => {
      const current = normalizeCanvasPositions(prev[activeSide].canvasPositions);
      return {
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          canvasPositions: {
            ...current,
            [key]: { x: pos.x, y: pos.y }
          }
        }
      };
    });
  };
  const setCanvasAxis = (key, axis, raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(95, Math.max(0, Math.round(n * 10) / 10));
    setCanvasPos(key, {
      ...(normalizeCanvasPositions(form.canvasPositions)[key] || DEFAULT_CANVAS_POSITIONS[key]),
      [axis]: clamped
    });
  };
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...sideFormToFlat("agent", forms.agent),
        ...sideFormToFlat("client", forms.client)
      };
      const { settings } = await updateLoginBranding(payload);
      setForms({
        agent: flatToSideForm(settings, "agent"),
        client: flatToSideForm(settings, "client")
      });
      toast.success(copy.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleUpload = async (kind, file) => {
    if (file.size > LOGIN_BRANDING_MAX_UPLOAD_BYTES) {
      toast.error(copy.uploadTooLarge);
      return;
    }
    const allowed = /image\/(png|jpe?g|webp)/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name || "");
    if (file.type && !allowed && file.type !== "application/octet-stream") {
      toast.error(copy.uploadBadFormat);
      return;
    }
    setUploading(kind);
    try {
      const { path, key } = await uploadLoginBrandingAsset(activeSide, kind, file);
      const field = key.includes("right_bg_image") ? "rightBgImagePath" : key.includes("bg_image") ? "bgImagePath" : "logoPath";
      setField(field, path);
      toast.success(copy.uploadSuccess);
    } catch (err) {
      toast.error(err.message || copy.uploadError);
    } finally {
      setUploading(null);
    }
  };
  const handleDeleteAsset = async kind => {
    setUploading(kind);
    try {
      await deleteLoginBrandingAsset(activeSide, kind);
      const field = kind === "right-background" ? "rightBgImagePath" : kind === "background" ? "bgImagePath" : "logoPath";
      setField(field, "");
      toast.success(copy.deleteSuccess);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setUploading(null);
    }
  };
  if (loading) {
    return <Page>
        <p className={adminUi.adminMutedText}>{copy.loading}</p>
      </Page>;
  }
  if (isCommunity) {
    return <Page>
        <Card title={copy.title} description={copy.communityLocked}>
          <p className={adminUi.adminMutedText}>{copy.communityHint}</p>
        </Card>
      </Page>;
  }
  return <Page>
      <SubTabs items={sideTabs} active={activeSide} onChange={setActiveSide} fullWidth />

      <div className={s.workspace}>
        <div className={s.editor}>
          <Card>
            <div className={s.enabledBlock}>
              <Switch checked={form.enabled} onChange={checked => setField("enabled", checked)} label={copy.enabledLabel} />
              <p className={s.enabledHint}>{copy.enabledHint}</p>
            </div>
          </Card>

          <CollapsibleSection
            title={copy.contentTitle || "Contenu"}
            description={copy.contentDescription || copy.description}
            open={openSections.content}
            onToggle={() => toggleSection("content")}
          >
            <FormGrid cols={2}>
              <Field label={copy.headline1Label} hint={copy.blankFieldHint}>
                <Input value={form.headlineLine1} onChange={e => setField("headlineLine1", e.target.value)} placeholder={copy.previewHeadline1} />
              </Field>
              <Field label={copy.headline2Label} hint={copy.blankFieldHint}>
                <Input value={form.headlineLine2} onChange={e => setField("headlineLine2", e.target.value)} placeholder={copy.previewHeadline2} />
              </Field>
              <Field label={copy.subLabel} spanFull hint={copy.blankFieldHint}>
                <Textarea value={form.sub} onChange={e => setField("sub", e.target.value)} rows={2} placeholder={copy.previewSub} />
              </Field>
              <Field label={copy.featuresLabel} spanFull hint={copy.featuresHint}>
                <Textarea value={form.features} onChange={e => setField("features", e.target.value)} rows={4} placeholder={copy.featuresPlaceholder} />
              </Field>
              <Field label={copy.brandNameLabel} hint={copy.blankFieldHint}>
                <Input value={form.brandName} onChange={e => setField("brandName", e.target.value)} placeholder="Veritas" />
              </Field>
              <Field label={copy.footerLabel} hint={copy.blankFieldHint}>
                <Input value={form.footerText} onChange={e => setField("footerText", e.target.value)} placeholder={copy.footerPlaceholder} />
              </Field>
            </FormGrid>
          </CollapsibleSection>

          <CollapsibleSection
            title={copy.layoutTitle}
            description={copy.layoutDescription}
            open={openSections.layout}
            onToggle={() => toggleSection("layout")}
          >
            <FormGrid cols={2}>
              <SelectField label={copy.layoutModeLabel || "Layout mode"} hint={copy.layoutModeHint} value={form.layoutMode || "flow"} onChange={v => setField("layoutMode", v)} options={LOGIN_TYPO_OPTIONS.layoutMode} optionLabels={opt.layoutMode} />
            </FormGrid>
            {form.layoutMode !== "canvas" ? <FormGrid cols={3}>
              <SelectField label={copy.contentAlignLabel} value={form.contentAlign} onChange={v => setField("contentAlign", v)} options={LOGIN_TYPO_OPTIONS.contentAlign} optionLabels={opt.align} />
              <SelectField label={copy.contentValignLabel} hint={copy.contentValignHint} value={form.contentValign} onChange={v => setField("contentValign", v)} options={LOGIN_TYPO_OPTIONS.contentValign} optionLabels={opt.valign} />
              <SelectField label={copy.logoAlignLabel} value={form.logoAlign} onChange={v => setField("logoAlign", v)} options={LOGIN_TYPO_OPTIONS.logoAlign} optionLabels={opt.align} />
            </FormGrid> : null}
          </CollapsibleSection>

          {form.layoutMode === "canvas" ? <CollapsibleSection
            title={copy.canvasTitle || "Positioning"}
            description={copy.canvasDescription || "Place each element with X/Y (%) or drag in the preview."}
            open={openSections.canvas}
            onToggle={() => toggleSection("canvas")}
          >
            <p className={s.canvasHint}>{copy.canvasHint || "Coordinates are percentages of each panel (0–95). Drag elements in the live preview."}</p>
            <div className={s.canvasGrid}>
              {LOGIN_CANVAS_ELEMENTS.map(key => {
                const pos = normalizeCanvasPositions(form.canvasPositions)[key];
                const label = opt.canvasElements?.[key] || key;
                return <div key={key} className={s.canvasRow}>
                    <span className={s.canvasRowLabel}>{label}</span>
                    <label className={s.canvasAxis}>
                      <span>X</span>
                      <Input type="number" min={0} max={95} step={0.1} value={pos.x} onChange={e => setCanvasAxis(key, "x", e.target.value)} />
                    </label>
                    <label className={s.canvasAxis}>
                      <span>Y</span>
                      <Input type="number" min={0} max={95} step={0.1} value={pos.y} onChange={e => setCanvasAxis(key, "y", e.target.value)} />
                    </label>
                  </div>;
              })}
            </div>
            <div className={s.canvasActions}>
              <Btn variant="secondary" icon="mdi:restore" onClick={() => setField("canvasPositions", { ...DEFAULT_CANVAS_POSITIONS })}>
                {copy.canvasReset || "Reset positions"}
              </Btn>
            </div>
          </CollapsibleSection> : null}

          <CollapsibleSection
            title={copy.typoTitle}
            description={copy.typoDescription}
            open={openSections.typo}
            onToggle={() => toggleSection("typo")}
          >
            <FormGrid cols={2}>
              <SelectField label={copy.fontFamilyLabel} value={form.fontFamily} onChange={v => setField("fontFamily", v)} options={LOGIN_TYPO_OPTIONS.fontFamily} optionLabels={opt.fontFamily} />
              <SelectField label={copy.brandNameSizeLabel} value={form.brandNameSize} onChange={v => setField("brandNameSize", v)} options={LOGIN_TYPO_OPTIONS.brandNameSize} optionLabels={opt.size} />
              <SelectField label={copy.headlineSizeLabel} value={form.headlineSize} onChange={v => setField("headlineSize", v)} options={LOGIN_TYPO_OPTIONS.headlineSize} optionLabels={opt.size} />
              <SelectField label={copy.headlineWeightLabel} value={form.headlineWeight} onChange={v => setField("headlineWeight", v)} options={LOGIN_TYPO_OPTIONS.headlineWeight} optionLabels={opt.weight} />
              <SelectField label={copy.headlineTrackingLabel} value={form.headlineTracking} onChange={v => setField("headlineTracking", v)} options={LOGIN_TYPO_OPTIONS.headlineTracking} optionLabels={opt.tracking} />
              <SelectField label={copy.subSizeLabel} value={form.subSize} onChange={v => setField("subSize", v)} options={LOGIN_TYPO_OPTIONS.subSize} optionLabels={opt.size} />
              <SelectField label={copy.subWeightLabel} value={form.subWeight} onChange={v => setField("subWeight", v)} options={LOGIN_TYPO_OPTIONS.subWeight} optionLabels={opt.weight} />
              <SelectField label={copy.subLineHeightLabel} value={form.subLineHeight} onChange={v => setField("subLineHeight", v)} options={LOGIN_TYPO_OPTIONS.subLineHeight} optionLabels={opt.lineHeight} />
              <SelectField label={copy.featuresSizeLabel} value={form.featuresSize} onChange={v => setField("featuresSize", v)} options={LOGIN_TYPO_OPTIONS.featuresSize} optionLabels={opt.size} />
            </FormGrid>
          </CollapsibleSection>

          <CollapsibleSection
            title={copy.htmlTitle}
            description={copy.htmlDescription}
            open={openSections.html}
            onToggle={() => toggleSection("html")}
          >
            <FormGrid cols={1}>
              {form.layoutMode !== "canvas" ? <SelectField label={copy.htmlPositionLabel} hint={copy.htmlPositionHint} value={form.htmlPosition} onChange={v => setField("htmlPosition", v)} options={LOGIN_TYPO_OPTIONS.htmlPosition} optionLabels={opt.htmlPosition} /> : null}
              <Field label={copy.htmlBlockLabel} hint={copy.htmlBlockHint}>
                <Textarea value={form.htmlBlock} onChange={e => setField("htmlBlock", e.target.value)} rows={6} placeholder={copy.htmlBlockPlaceholder} className={s.codeArea} />
              </Field>
              <Field label={copy.formHtmlLabel} hint={copy.formHtmlHint}>
                <Textarea value={form.formHtml} onChange={e => setField("formHtml", e.target.value)} rows={4} placeholder={copy.formHtmlPlaceholder} className={s.codeArea} />
              </Field>
            </FormGrid>
          </CollapsibleSection>

          <CollapsibleSection
            title={copy.visualTitle}
            description={copy.visualDescription}
            open={openSections.visual}
            onToggle={() => toggleSection("visual")}
          >
            <FormGrid cols={2}>
              <ColorField label={copy.bgStartLabel} value={form.bgColorStart} fallback={defaults.bgColorStart} onChange={value => setField("bgColorStart", value)} />
              <ColorField label={copy.bgEndLabel} value={form.bgColorEnd} fallback={defaults.bgColorEnd} onChange={value => setField("bgColorEnd", value)} />
              <ColorField label={copy.accentLabel} value={form.accentColor} fallback={defaults.accentColor} onChange={value => setField("accentColor", value)} />
              <ColorField label={copy.rightBgLabel} value={form.rightBgColor} fallback={defaults.rightBgColor} onChange={value => setField("rightBgColor", value)} />
            </FormGrid>

            <div className={s.visualAssets}>
              <AssetUploadField label={copy.logoLabel} hint={copy.logoHint} path={form.logoPath} uploading={uploading === "logo"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} previewBackground={form.logoPath && form.logoTransparent ? form.logoBgColor || defaults.logoBgColor : undefined} onUpload={file => handleUpload("logo", file)} onDelete={() => handleDeleteAsset("logo")} />
              <AssetUploadField label={copy.bgImageLabel} hint={copy.bgImageHint} path={form.bgImagePath} uploading={uploading === "background"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} onUpload={file => handleUpload("background", file)} onDelete={() => handleDeleteAsset("background")} />
              <AssetUploadField label={copy.rightBgImageLabel} hint={copy.rightBgImageHint} path={form.rightBgImagePath} uploading={uploading === "right-background"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} onUpload={file => handleUpload("right-background", file)} onDelete={() => handleDeleteAsset("right-background")} />
            </div>

            {form.logoPath ? <div className={s.switchBlock}>
                <Field label={copy.logoTransparentLabel} hint={copy.logoTransparentHint}>
                  <div className={s.switchRow}>
                    <Switch checked={form.logoTransparent} onChange={checked => setField("logoTransparent", checked)} label={copy.logoTransparentSwitch} />
                  </div>
                </Field>
                {form.logoTransparent ? <ColorField label={copy.logoBgLabel} hint={copy.logoBgHint} value={form.logoBgColor} fallback={defaults.logoBgColor} onChange={value => setField("logoBgColor", value)} /> : null}
              </div> : null}
          </CollapsibleSection>
        </div>

        <aside className={s.previewColumn}>
          <div className={s.previewSticky}>
            <Card title={copy.previewTitle} description={copy.previewDescription} noPadding fill fillNoScroll>
              <LoginPreview side={activeSide} form={form} copy={copy} onCanvasPosChange={setCanvasPos} />
            </Card>
          </div>
        </aside>
      </div>

      <div className={s.footerBar}>
        <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
          {saving ? common.saving : common.save}
        </Btn>
      </div>
    </Page>;
}
