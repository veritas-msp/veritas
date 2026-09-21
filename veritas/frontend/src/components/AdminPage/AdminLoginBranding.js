import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAdminPageCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { deleteLoginBrandingAsset, fetchLoginBrandingAdmin, updateLoginBranding, uploadLoginBrandingAsset } from "../../api/loginBranding";
import { sanitizeLoginBrandingHtml } from "../../utils/sanitizeHtml";
import {
  DEFAULT_SIDE_COLORS,
  LOGIN_BRANDING_MAX_UPLOAD_BYTES,
  LOGIN_SIDES,
  LOGIN_TYPO_DEFAULTS,
  LOGIN_TYPO_OPTIONS,
  flatToSideForm,
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
  htmlBlock: "",
  formHtml: ""
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

function LoginPreview({ side, form, copy }) {
  const defaults = DEFAULT_SIDE_COLORS[side];
  const bgStart = form.bgColorStart || defaults.bgColorStart;
  const bgEnd = form.bgColorEnd || defaults.bgColorEnd;
  const accent = form.accentColor || defaults.accentColor;
  const logoUrl = resolveLoginAssetUrl(form.logoPath);
  const bgImageUrl = resolveLoginAssetUrl(form.bgImagePath);
  const rightBgImageUrl = resolveLoginAssetUrl(form.rightBgImagePath);
  const logoBg = form.logoBgColor || defaults.logoBgColor;
  const features = String(form.features || "").split("\n").map(line => line.trim()).filter(Boolean).slice(0, 3);
  const htmlSafe = form.htmlBlock ? sanitizeLoginBrandingHtml(form.htmlBlock) : "";
  const panelStyle = {
    background: bgImageUrl
      ? `linear-gradient(160deg, ${bgStart}dd 0%, ${bgEnd}dd 100%), url("${bgImageUrl}") center/cover`
      : `linear-gradient(160deg, ${bgStart} 0%, ${bgEnd} 100%)`,
    textAlign: form.contentAlign === "center" ? "center" : "left",
    justifyContent: form.contentValign === "center" ? "center" : form.contentValign === "bottom" ? "flex-end" : "flex-start",
    alignItems: form.contentAlign === "center" ? "center" : "stretch"
  };
  const rightPanelStyle = rightBgImageUrl ? {
    backgroundColor: form.rightBgColor || defaults.rightBgColor,
    backgroundImage: `url("${rightBgImageUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center"
  } : {
    background: form.rightBgColor || defaults.rightBgColor
  };
  const headline1 = resolveBrandingText(form.headlineLine1, copy.previewHeadline1);
  const headline2 = resolveBrandingText(form.headlineLine2, copy.previewHeadline2);
  const sub = resolveBrandingText(form.sub, copy.previewSub);
  const brandName = form.brandName === "" ? "Veritas" : String(form.brandName || "").trim() || "";
  const htmlBlock = htmlSafe ? <div className={s.previewHtml} dangerouslySetInnerHTML={{ __html: htmlSafe }} /> : null;
  return <div className={s.previewShell}>
      <p className={s.previewLabel}>{copy.previewLabel}</p>
      <div className={s.previewFrame}>
        <aside className={s.previewLeft} style={panelStyle}>
          {form.htmlPosition === "before_headline" ? htmlBlock : null}
          <div className={s.previewBrand} style={form.logoAlign === "center" ? { justifyContent: "center" } : undefined}>
            {logoUrl ? <img src={logoUrl} alt="" className={s.previewLogo} style={form.logoTransparent ? { background: logoBg } : { background: "transparent" }} /> : <div className={s.previewBrandIcon} style={{ background: accent }}>V</div>}
            <span>{brandName || "\u00A0"}</span>
          </div>
          <h3 className={s.previewHeadline}>
            {headline1}
            {headline1 || headline2 ? <br /> : null}
            {headline2}
          </h3>
          <p className={s.previewSub}>{sub}</p>
          {form.htmlPosition === "after_sub" ? htmlBlock : null}
          <ul className={s.previewFeatures} style={form.contentAlign === "center" ? { alignItems: "center" } : undefined}>
            {features.map(item => <li key={item}>
                <span style={{ background: accent }} />
                {item}
              </li>)}
          </ul>
          {form.htmlPosition === "after_features" || !form.htmlPosition ? htmlBlock : null}
          {form.htmlPosition === "bottom" ? htmlBlock : null}
        </aside>
        <div className={s.previewRight} style={rightPanelStyle}>
          <div className={s.previewCard}>
            <div className={s.previewToggle} />
            <div className={s.previewField} />
            <div className={s.previewField} />
            <button type="button" className={s.previewBtn} style={{ background: accent }}>
              {copy.previewButton}
            </button>
          </div>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const FALLBACK_OPTIONS = {
    align: { left: "Left", center: "Center" },
    valign: { top: "Top", center: "Middle", bottom: "Bottom" },
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
      after_features: "After highlights",
      bottom: "Bottom of panel"
    }
  };
  const opt = { ...FALLBACK_OPTIONS, ...(copy.options || {}) };
  const sideTabs = useMemo(() => LOGIN_SIDES.map(side => ({
    key: side,
    label: copy.tabs[side],
    icon: side === "agent" ? "mdi:account-tie-outline" : "mdi:domain",
    proOnly: isCommunity
  })), [copy.tabs, isCommunity]);
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

      <Card>
        <div className={s.enabledRow}>
          <Switch checked={form.enabled} onChange={checked => setField("enabled", checked)} label={copy.enabledLabel} />
          <span className={adminUi.adminMutedText}>{copy.enabledHint}</span>
        </div>

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
      </Card>

      <Card title={copy.layoutTitle} description={copy.layoutDescription}>
        <FormGrid cols={3}>
          <SelectField label={copy.contentAlignLabel} value={form.contentAlign} onChange={v => setField("contentAlign", v)} options={LOGIN_TYPO_OPTIONS.contentAlign} optionLabels={opt.align} />
          <SelectField label={copy.contentValignLabel} value={form.contentValign} onChange={v => setField("contentValign", v)} options={LOGIN_TYPO_OPTIONS.contentValign} optionLabels={opt.valign} />
          <SelectField label={copy.logoAlignLabel} value={form.logoAlign} onChange={v => setField("logoAlign", v)} options={LOGIN_TYPO_OPTIONS.logoAlign} optionLabels={opt.align} />
        </FormGrid>
      </Card>

      <Card title={copy.typoTitle} description={copy.typoDescription}>
        <FormGrid cols={3}>
          <SelectField label={copy.fontFamilyLabel} value={form.fontFamily} onChange={v => setField("fontFamily", v)} options={LOGIN_TYPO_OPTIONS.fontFamily} optionLabels={opt.fontFamily} />
          <SelectField label={copy.headlineSizeLabel} value={form.headlineSize} onChange={v => setField("headlineSize", v)} options={LOGIN_TYPO_OPTIONS.headlineSize} optionLabels={opt.size} />
          <SelectField label={copy.headlineWeightLabel} value={form.headlineWeight} onChange={v => setField("headlineWeight", v)} options={LOGIN_TYPO_OPTIONS.headlineWeight} optionLabels={opt.weight} />
          <SelectField label={copy.headlineTrackingLabel} value={form.headlineTracking} onChange={v => setField("headlineTracking", v)} options={LOGIN_TYPO_OPTIONS.headlineTracking} optionLabels={opt.tracking} />
          <SelectField label={copy.subSizeLabel} value={form.subSize} onChange={v => setField("subSize", v)} options={LOGIN_TYPO_OPTIONS.subSize} optionLabels={opt.size} />
          <SelectField label={copy.subWeightLabel} value={form.subWeight} onChange={v => setField("subWeight", v)} options={LOGIN_TYPO_OPTIONS.subWeight} optionLabels={opt.weight} />
          <SelectField label={copy.subLineHeightLabel} value={form.subLineHeight} onChange={v => setField("subLineHeight", v)} options={LOGIN_TYPO_OPTIONS.subLineHeight} optionLabels={opt.lineHeight} />
          <SelectField label={copy.featuresSizeLabel} value={form.featuresSize} onChange={v => setField("featuresSize", v)} options={LOGIN_TYPO_OPTIONS.featuresSize} optionLabels={opt.size} />
          <SelectField label={copy.brandNameSizeLabel} value={form.brandNameSize} onChange={v => setField("brandNameSize", v)} options={LOGIN_TYPO_OPTIONS.brandNameSize} optionLabels={opt.size} />
        </FormGrid>
      </Card>

      <Card title={copy.htmlTitle} description={copy.htmlDescription}>
        <FormGrid cols={2}>
          <SelectField label={copy.htmlPositionLabel} hint={copy.htmlPositionHint} value={form.htmlPosition} onChange={v => setField("htmlPosition", v)} options={LOGIN_TYPO_OPTIONS.htmlPosition} optionLabels={opt.htmlPosition} />
          <Field label={copy.htmlBlockLabel} spanFull hint={copy.htmlBlockHint}>
            <Textarea value={form.htmlBlock} onChange={e => setField("htmlBlock", e.target.value)} rows={6} placeholder={copy.htmlBlockPlaceholder} style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.8rem", lineHeight: 1.45 }} />
          </Field>
          <Field label={copy.formHtmlLabel} spanFull hint={copy.formHtmlHint}>
            <Textarea value={form.formHtml} onChange={e => setField("formHtml", e.target.value)} rows={4} placeholder={copy.formHtmlPlaceholder} style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.8rem", lineHeight: 1.45 }} />
          </Field>
        </FormGrid>
      </Card>

      <FormGrid cols={2} className={s.cardRow}>
        <Card title={copy.visualTitle} description={copy.visualDescription}>
          <FormGrid cols={2}>
            <ColorField label={copy.bgStartLabel} value={form.bgColorStart} fallback={defaults.bgColorStart} onChange={value => setField("bgColorStart", value)} />
            <ColorField label={copy.bgEndLabel} value={form.bgColorEnd} fallback={defaults.bgColorEnd} onChange={value => setField("bgColorEnd", value)} />
            <ColorField label={copy.accentLabel} value={form.accentColor} fallback={defaults.accentColor} onChange={value => setField("accentColor", value)} />
            <ColorField label={copy.rightBgLabel} value={form.rightBgColor} fallback={defaults.rightBgColor} onChange={value => setField("rightBgColor", value)} />
            <AssetUploadField label={copy.logoLabel} hint={copy.logoHint} path={form.logoPath} uploading={uploading === "logo"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} previewBackground={form.logoPath && form.logoTransparent ? form.logoBgColor || defaults.logoBgColor : undefined} onUpload={file => handleUpload("logo", file)} onDelete={() => handleDeleteAsset("logo")} />
            <AssetUploadField label={copy.bgImageLabel} hint={copy.bgImageHint} path={form.bgImagePath} uploading={uploading === "background"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} onUpload={file => handleUpload("background", file)} onDelete={() => handleDeleteAsset("background")} />
            <AssetUploadField label={copy.rightBgImageLabel} hint={copy.rightBgImageHint} path={form.rightBgImagePath} uploading={uploading === "right-background"} chooseLabel={copy.chooseFile} removeLabel={copy.removeFile} onUpload={file => handleUpload("right-background", file)} onDelete={() => handleDeleteAsset("right-background")} />
            {form.logoPath ? <>
                <Field label={copy.logoTransparentLabel} spanFull hint={copy.logoTransparentHint}>
                  <Switch checked={form.logoTransparent} onChange={checked => setField("logoTransparent", checked)} label={copy.logoTransparentSwitch} />
                </Field>
                {form.logoTransparent ? <ColorField label={copy.logoBgLabel} hint={copy.logoBgHint} value={form.logoBgColor} fallback={defaults.logoBgColor} onChange={value => setField("logoBgColor", value)} /> : null}
              </> : null}
          </FormGrid>
        </Card>

        <Card title={copy.previewTitle} description={copy.previewDescription} noPadding>
          <LoginPreview side={activeSide} form={form} copy={copy} />
        </Card>
      </FormGrid>

      <div className={s.footerBar}>
        <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
          {saving ? common.saving : common.save}
        </Btn>
      </div>
    </Page>;
}
