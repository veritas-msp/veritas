import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  deleteReportBrandingAsset,
  fetchReportBrandingAdmin,
  updateReportBranding,
  uploadReportBrandingAsset
} from "../../api/reportBranding";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { createLocaleGetter } from "../../i18n/translate";
import { resolveLoginAssetUrl } from "../../utils/loginBrandingUtils";
import { Page, Card, Field, Input, Textarea, Btn, FormGrid, Switch, SubTabs, SegmentField } from "./AdminUi";
import s from "./AdminReports.module.css";
import { UiKitPageHero } from "../UiKit";
import { getAdminPanelCopy } from "./adminPanelI18n";

const REPORT_SIZE_PRESETS = {
  report_brand_size: { sm: "0.62", md: "0.72", lg: "0.88" },
  report_company_size: { sm: "0.9", md: "1.05", lg: "1.25" },
  report_client_size: { sm: "1.7", md: "2.1", lg: "2.6" },
  report_footer_brand_size: { sm: "0.8", md: "0.95", lg: "1.15" },
  report_footer_note_size: { sm: "0.65", md: "0.78", lg: "0.92" }
};

const REPORT_SIZE_ICONS = {
  sm: "mdi:format-font-size-decrease",
  md: "mdi:format-size",
  lg: "mdi:format-font-size-increase"
};

function nearestReportSizePreset(key, rawValue) {
  const presets = REPORT_SIZE_PRESETS[key];
  if (!presets) return "md";
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return "md";
  let best = "md";
  let bestDist = Infinity;
  Object.entries(presets).forEach(([id, rem]) => {
    const dist = Math.abs(num - Number(rem));
    if (dist < bestDist) {
      best = id;
      bestDist = dist;
    }
  });
  return best;
}

function reportSizeSegmentOptions(copy) {
  return [
    { value: "sm", icon: REPORT_SIZE_ICONS.sm, title: copy.sizeSmall || "Petit" },
    { value: "md", icon: REPORT_SIZE_ICONS.md, title: copy.sizeMedium || "Moyen" },
    { value: "lg", icon: REPORT_SIZE_ICONS.lg, title: copy.sizeLarge || "Grand" }
  ];
}

const REPORT_TABS = [
  { key: "identity", icon: "mdi:badge-account-horizontal-outline" },
  { key: "header", icon: "mdi:page-layout-header" },
  { key: "footer", icon: "mdi:page-layout-footer" },
  { key: "appearance", icon: "mdi:palette-outline" }
];

const EMPTY = {
  report_company_name: "",
  report_brand_label: "",
  report_logo_path: "",
  report_footer_logo_path: "",
  report_support_email: "",
  report_support_phone: "",
  report_website: "",
  report_address: "",
  report_footer_note: "",
  report_social_linkedin: "",
  report_social_facebook: "",
  report_social_x: "",
  report_social_youtube: "",
  report_social_display: "icons",
  report_show_generated_at: "true",
  report_show_header_logo: "true",
  report_show_header_brand: "true",
  report_show_header_company: "true",
  report_show_header_client: "true",
  report_show_header_period: "true",
  report_show_header_pill: "true",
  report_show_header_generated_at: "true",
  report_show_footer_logo: "true",
  report_show_footer_company: "true",
  report_show_footer_brand: "true",
  report_show_footer_email: "true",
  report_show_footer_phone: "true",
  report_show_footer_website: "true",
  report_show_footer_address: "true",
  report_show_footer_socials: "true",
  report_show_footer_note: "true",
  report_font_sans: "source_sans",
  report_font_serif: "source_serif",
  report_header_bg: "#0b3d4a",
  report_header_bg_end: "#0f766e",
  report_header_text: "#f8fafc",
  report_header_brand_color: "#99f6e4",
  report_header_accent_bar: "#99f6e4",
  report_header_accent_bar_end: "#fbbf24",
  report_footer_bg: "#ffffff",
  report_footer_text: "#1e3a5f",
  report_footer_muted: "#64748b",
  report_footer_link: "#115e59",
  report_accent: "#0f766e",
  report_navy: "#1e3a5f",
  report_brand_size: "0.72",
  report_company_size: "1.05",
  report_client_size: "2.1",
  report_footer_brand_size: "0.95",
  report_footer_note_size: "0.78"
};

const SANS_FALLBACK = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", Times, serif';

function sansOpt(id, label, family, google) {
  return { id, label, stack: `"${family}", ${SANS_FALLBACK}`, google };
}

function serifOpt(id, label, family, google) {
  return { id, label, stack: `"${family}", ${SERIF_FALLBACK}`, google };
}

const ALL_FONT_OPTIONS = [
  sansOpt("source_sans", "Source Sans 3", "Source Sans 3", "Source+Sans+3:wght@400;500;600;700"),
  sansOpt("inter", "Inter", "Inter", "Inter:wght@400;500;600;700"),
  sansOpt("ibm_plex", "IBM Plex Sans", "IBM Plex Sans", "IBM+Plex+Sans:wght@400;500;600;700"),
  sansOpt("nunito", "Nunito Sans", "Nunito Sans", "Nunito+Sans:wght@400;500;600;700"),
  sansOpt("roboto", "Roboto", "Roboto", "Roboto:wght@400;500;600;700"),
  sansOpt("open_sans", "Open Sans", "Open Sans", "Open+Sans:wght@400;500;600;700"),
  sansOpt("lato", "Lato", "Lato", "Lato:wght@400;700"),
  sansOpt("montserrat", "Montserrat", "Montserrat", "Montserrat:wght@400;500;600;700"),
  sansOpt("poppins", "Poppins", "Poppins", "Poppins:wght@400;500;600;700"),
  sansOpt("raleway", "Raleway", "Raleway", "Raleway:wght@400;500;600;700"),
  sansOpt("work_sans", "Work Sans", "Work Sans", "Work+Sans:wght@400;500;600;700"),
  sansOpt("dm_sans", "DM Sans", "DM Sans", "DM+Sans:wght@400;500;600;700"),
  sansOpt("manrope", "Manrope", "Manrope", "Manrope:wght@400;500;600;700"),
  sansOpt("outfit", "Outfit", "Outfit", "Outfit:wght@400;500;600;700"),
  sansOpt("figtree", "Figtree", "Figtree", "Figtree:wght@400;500;600;700"),
  sansOpt("plus_jakarta", "Plus Jakarta Sans", "Plus Jakarta Sans", "Plus+Jakarta+Sans:wght@400;500;600;700"),
  sansOpt("space_grotesk", "Space Grotesk", "Space Grotesk", "Space+Grotesk:wght@400;500;600;700"),
  sansOpt("rubik", "Rubik", "Rubik", "Rubik:wght@400;500;600;700"),
  sansOpt("ubuntu", "Ubuntu", "Ubuntu", "Ubuntu:wght@400;500;700"),
  sansOpt("fira_sans", "Fira Sans", "Fira Sans", "Fira+Sans:wght@400;500;600;700"),
  sansOpt("noto_sans", "Noto Sans", "Noto Sans", "Noto+Sans:wght@400;500;600;700"),
  sansOpt("karla", "Karla", "Karla", "Karla:wght@400;500;600;700"),
  sansOpt("mulish", "Mulish", "Mulish", "Mulish:wght@400;500;600;700"),
  sansOpt("cabin", "Cabin", "Cabin", "Cabin:wght@400;500;600;700"),
  sansOpt("barlow", "Barlow", "Barlow", "Barlow:wght@400;500;600;700"),
  sansOpt("lexend", "Lexend", "Lexend", "Lexend:wght@400;500;600;700"),
  sansOpt("sora", "Sora", "Sora", "Sora:wght@400;500;600;700"),
  sansOpt("public_sans", "Public Sans", "Public Sans", "Public+Sans:wght@400;500;600;700"),
  sansOpt("atkinson", "Atkinson Hyperlegible", "Atkinson Hyperlegible", "Atkinson+Hyperlegible:wght@400;700"),
  sansOpt("geist", "Geist", "Geist", "Geist:wght@400;500;600;700"),
  sansOpt("albert_sans", "Albert Sans", "Albert Sans", "Albert+Sans:wght@400;500;600;700"),
  sansOpt("red_hat", "Red Hat Text", "Red Hat Text", "Red+Hat+Text:wght@400;500;600;700"),
  { id: "system", label: "Système", stack: `system-ui, -apple-system, ${SANS_FALLBACK}`, google: null },
  serifOpt("source_serif", "Source Serif 4", "Source Serif 4", "Source+Serif+4:opsz,wght@8..60,600;8..60,700"),
  serifOpt("libre_baskerville", "Libre Baskerville", "Libre Baskerville", "Libre+Baskerville:wght@400;700"),
  serifOpt("merriweather", "Merriweather", "Merriweather", "Merriweather:wght@400;700"),
  serifOpt("playfair", "Playfair Display", "Playfair Display", "Playfair+Display:wght@400;600;700"),
  serifOpt("lora", "Lora", "Lora", "Lora:wght@400;600;700"),
  serifOpt("pt_serif", "PT Serif", "PT Serif", "PT+Serif:wght@400;700"),
  serifOpt("cormorant", "Cormorant Garamond", "Cormorant Garamond", "Cormorant+Garamond:wght@400;600;700"),
  serifOpt("eb_garamond", "EB Garamond", "EB Garamond", "EB+Garamond:wght@400;600;700"),
  serifOpt("crimson_text", "Crimson Text", "Crimson Text", "Crimson+Text:wght@400;600;700"),
  serifOpt("literata", "Literata", "Literata", "Literata:opsz,wght@7..72,400;7..72,600;7..72,700"),
  serifOpt("spectral", "Spectral", "Spectral", "Spectral:wght@400;600;700"),
  serifOpt("bitter", "Bitter", "Bitter", "Bitter:wght@400;600;700"),
  serifOpt("domine", "Domine", "Domine", "Domine:wght@400;600;700"),
  serifOpt("newsreader", "Newsreader", "Newsreader", "Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700"),
  serifOpt("fraunces", "Fraunces", "Fraunces", "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700"),
  serifOpt("instrument_serif", "Instrument Serif", "Instrument Serif", "Instrument+Serif:wght@400"),
  serifOpt("noto_serif", "Noto Serif", "Noto Serif", "Noto+Serif:wght@400;600;700"),
  serifOpt("roboto_serif", "Roboto Serif", "Roboto Serif", "Roboto+Serif:opsz,wght@8..144,400;8..144,600;8..144,700"),
  serifOpt("alegreya", "Alegreya", "Alegreya", "Alegreya:wght@400;600;700"),
  serifOpt("cardo", "Cardo", "Cardo", "Cardo:wght@400;700"),
  serifOpt("vollkorn", "Vollkorn", "Vollkorn", "Vollkorn:wght@400;600;700"),
  serifOpt("ibm_plex_serif", "IBM Plex Serif", "IBM Plex Serif", "IBM+Plex+Serif:wght@400;600;700"),
  serifOpt("libre_caslon", "Libre Caslon Text", "Libre Caslon Text", "Libre+Caslon+Text:wght@400;700"),
  serifOpt("crimson_pro", "Crimson Pro", "Crimson Pro", "Crimson+Pro:wght@400;600;700"),
  { id: "georgia", label: "Georgia", stack: SERIF_FALLBACK, google: null },
  { id: "times", label: "Times New Roman", stack: '"Times New Roman", Times, serif', google: null }
];

const FONT_STACKS = Object.fromEntries(ALL_FONT_OPTIONS.map(opt => [opt.id, opt.stack]));
const FONT_GOOGLE = Object.fromEntries(ALL_FONT_OPTIONS.filter(opt => opt.google).map(opt => [opt.id, opt.google]));
const FONT_LABELS = Object.fromEntries(ALL_FONT_OPTIONS.map(opt => [opt.id, opt.label]));

function ensureGoogleFontLoaded(fontId) {
  if (typeof document === "undefined") return;
  const family = FONT_GOOGLE[fontId];
  if (!family) return;
  const id = `admin-reports-font-${fontId}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  document.head.appendChild(link);
}

const COPY = {
  fr: {
    title: "Rapports",
    subtitle: "En-tête et pied de page globaux appliqués à tous les rapports (intervention, audit, supervision, etc.).",
    identity: "Identité",
    identityHint: "Contenus repris dans les rapports. Si un champ est vide, Veritas peut reprendre les paramètres généraux de l’organisation.",
    companyName: "Nom de la société",
    companyNameHint: "Affiché dans l’en-tête et le pied de page (sinon nom d’organisation général).",
    brandLabel: "Marque / signature",
    brandLabelHint: "Petite ligne type « PSI × Veritas ».",
    logos: "Logos",
    logoHeader: "Logo en-tête",
    logoHeaderHint: "Affiché en haut à gauche des rapports (PNG, JPG ou WebP, max 8 Mo).",
    logoFooter: "Logo pied de page",
    logoFooterHint: "Optionnel — affiché dans le pied de page. Sinon le logo d’en-tête est repris.",
    chooseLogo: "Choisir un fichier",
    removeLogo: "Retirer",
    logoUploading: "Envoi…",
    logoUploadError: "Impossible d’envoyer le logo.",
    logoDeleteError: "Impossible de retirer le logo.",
    contact: "Coordonnées",
    supportEmail: "E-mail support",
    supportPhone: "Téléphone",
    website: "Site web",
    address: "Adresse",
    socials: "Réseaux sociaux",
    socialsHint: "Seules les URLs renseignées apparaissent dans le pied de page.",
    socialDisplay: "Affichage des réseaux",
    socialDisplayIcons: "Icônes",
    socialDisplayLinks: "Liens",
    socialDisplayBoth: "Icônes + liens",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    x: "X",
    youtube: "YouTube",
    header: "En-tête",
    headerVisibilityHint: "Choisissez ce qui apparaît dans l’en-tête des rapports.",
    showHeaderLogo: "Logo",
    showHeaderBrand: "Marque / signature",
    showHeaderCompany: "Nom de la société",
    showHeaderClient: "Nom du client",
    showHeaderPeriod: "Période / référence",
    showHeaderPill: "Type de rapport",
    showHeaderGeneratedAt: "Date de génération",
    footer: "Pied de page",
    footerNote: "Mention légale / note",
    footerVisibility: "Éléments visibles",
    footerVisibilityHint: "Choisissez ce qui apparaît dans le pied de page des rapports.",
    showFooterLogo: "Logo",
    showFooterCompany: "Nom de la société",
    showFooterBrand: "Marque / signature",
    showFooterEmail: "E-mail support",
    showFooterPhone: "Téléphone",
    showFooterWebsite: "Site web",
    showFooterAddress: "Adresse",
    showFooterSocials: "Réseaux sociaux",
    showFooterNote: "Mention légale / note",
    showGeneratedAt: "Date de génération",
    generatedAtPrefix: "Document généré le",
    generatedAtHeader: "Généré le",
    appearance: "Apparence",
    appearanceHint: "Polices, couleurs et tailles de l’en-tête et du pied de page pour tous les rapports.",
    fonts: "Polices",
    fontSans: "Police du corps / footer",
    fontSerif: "Police des titres (header)",
    fontSearchPlaceholder: "Rechercher une police…",
    fontEmpty: "Aucune police trouvée",
    headerColors: "Couleurs de l’en-tête",
    headerBg: "Fond",
    headerText: "Texte",
    headerBrandColor: "Marque / signature",
    headerAccentBar: "Barre d’accent",
    footerColors: "Couleurs du pied de page",
    footerBg: "Fond",
    footerText: "Titre / marque",
    footerMuted: "Texte secondaire",
    footerLink: "Liens",
    themeColors: "Couleurs du document",
    accent: "Accent",
    navy: "Titres / navy",
    sizes: "Tailles",
    brandSize: "Signature header",
    companySize: "Nom société header",
    clientSize: "Nom client (titre)",
    footerBrandSize: "Marque footer",
    footerNoteSize: "Note footer",
    sizeSmall: "Petit",
    sizeMedium: "Moyen",
    sizeLarge: "Grand",
    resetAppearance: "Réinitialiser l’apparence",
    livePreview: "Aperçu en direct",
    previewClient: "Entreprise exemple",
    previewPeriod: "Exemple de période ou référence",
    previewPill: "Rapport",
    previewBodyTitle: "Contenu du rapport",
    previewBodyLine: "Aperçu générique — l’en-tête et le pied de page s’appliquent à tous les types de rapports.",
    previewBodyCardTitle: "Sections",
    previewBodyCardLine: "Contexte · Opérations · Validation",
    save: "Enregistrer",
    saving: "Enregistrement…",
    loadError: "Impossible de charger les paramètres rapports.",
    saveSuccess: "Paramètres rapports enregistrés.",
    saveError: "Enregistrement impossible.",
    communityLocked: "Fonctionnalité Pro",
    communityHint: "La personnalisation des rapports (identité, contacts, réseaux sociaux, apparence) est réservée à l’édition Pro."
  },
  en: {
    title: "Reports",
    subtitle: "Global header and footer applied to all reports (intervention, audit, supervision, etc.).",
    identity: "Identity",
    identityHint: "Content reused across reports. Empty fields may fall back to general organization settings.",
    companyName: "Company name",
    companyNameHint: "Shown in the header and footer (falls back to general organization name).",
    brandLabel: "Brand / signature",
    brandLabelHint: "Small line such as “PSI × Veritas”.",
    logos: "Logos",
    logoHeader: "Header logo",
    logoHeaderHint: "Shown top-left on reports (PNG, JPG or WebP, max 8 MB).",
    logoFooter: "Footer logo",
    logoFooterHint: "Optional — shown in the footer. Falls back to the header logo.",
    chooseLogo: "Choose file",
    removeLogo: "Remove",
    logoUploading: "Uploading…",
    logoUploadError: "Unable to upload logo.",
    logoDeleteError: "Unable to remove logo.",
    contact: "Contact details",
    supportEmail: "Support email",
    supportPhone: "Phone",
    website: "Website",
    address: "Address",
    socials: "Social networks",
    socialsHint: "Only filled URLs appear in the footer.",
    socialDisplay: "Social display",
    socialDisplayIcons: "Icons",
    socialDisplayLinks: "Links",
    socialDisplayBoth: "Icons + links",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    x: "X",
    youtube: "YouTube",
    header: "Header",
    headerVisibilityHint: "Choose what appears in the report header.",
    showHeaderLogo: "Logo",
    showHeaderBrand: "Brand / signature",
    showHeaderCompany: "Company name",
    showHeaderClient: "Client name",
    showHeaderPeriod: "Period / reference",
    showHeaderPill: "Report type",
    showHeaderGeneratedAt: "Generation date",
    footer: "Footer",
    footerNote: "Legal / footer note",
    footerVisibility: "Visible elements",
    footerVisibilityHint: "Choose what appears in the report footer.",
    showFooterLogo: "Logo",
    showFooterCompany: "Company name",
    showFooterBrand: "Brand / signature",
    showFooterEmail: "Support email",
    showFooterPhone: "Phone",
    showFooterWebsite: "Website",
    showFooterAddress: "Address",
    showFooterSocials: "Social networks",
    showFooterNote: "Legal / footer note",
    showGeneratedAt: "Generation date",
    generatedAtPrefix: "Document generated on",
    generatedAtHeader: "Generated on",
    appearance: "Appearance",
    appearanceHint: "Fonts, colors and sizes for the header and footer across all reports.",
    fonts: "Fonts",
    fontSans: "Body / footer font",
    fontSerif: "Title font (header)",
    fontSearchPlaceholder: "Search a font…",
    fontEmpty: "No font found",
    headerColors: "Header colors",
    headerBg: "Background",
    headerText: "Text",
    headerBrandColor: "Brand / signature",
    headerAccentBar: "Accent bar",
    footerColors: "Footer colors",
    footerBg: "Background",
    footerText: "Brand / title",
    footerMuted: "Muted text",
    footerLink: "Links",
    themeColors: "Document colors",
    accent: "Accent",
    navy: "Titles / navy",
    sizes: "Sizes",
    brandSize: "Header signature",
    companySize: "Header company name",
    clientSize: "Client title",
    footerBrandSize: "Footer brand",
    footerNoteSize: "Footer note",
    sizeSmall: "Small",
    sizeMedium: "Medium",
    sizeLarge: "Large",
    resetAppearance: "Reset appearance",
    livePreview: "Live preview",
    previewClient: "Sample company",
    previewPeriod: "Sample period or reference",
    previewPill: "Report",
    previewBodyTitle: "Report content",
    previewBodyLine: "Generic preview — header and footer apply to every report type.",
    previewBodyCardTitle: "Sections",
    previewBodyCardLine: "Context · Operations · Validation",
    save: "Save",
    saving: "Saving…",
    loadError: "Unable to load report settings.",
    saveSuccess: "Report settings saved.",
    saveError: "Unable to save.",
    communityLocked: "Pro feature",
    communityHint: "Report branding (identity, contacts, social networks, appearance) is available in the Pro edition."
  }
};

const getCopy = createLocaleGetter(COPY);

const APPEARANCE_KEYS = [
  "report_font_sans",
  "report_font_serif",
  "report_header_bg",
  "report_header_bg_end",
  "report_header_text",
  "report_header_brand_color",
  "report_header_accent_bar",
  "report_header_accent_bar_end",
  "report_footer_bg",
  "report_footer_text",
  "report_footer_muted",
  "report_footer_link",
  "report_accent",
  "report_navy",
  "report_brand_size",
  "report_company_size",
  "report_client_size",
  "report_footer_brand_size",
  "report_footer_note_size"
];

function LogoUploadField({ label, hint, path, disabled, uploading, chooseLabel, removeLabel, onUpload, onDelete }) {
  const inputRef = useRef(null);
  const previewUrl = resolveLoginAssetUrl(path);
  return (
    <Field label={label} hint={hint}>
      <div className={s.logoBox}>
        {previewUrl ? (
          <div className={s.logoPreview}>
            <img src={previewUrl} alt="" />
          </div>
        ) : (
          <div className={s.logoPlaceholder}>—</div>
        )}
        <div className={s.logoActions}>
          <Btn
            variant="secondary"
            icon="mdi:upload"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "…" : chooseLabel}
          </Btn>
          {path ? (
            <Btn variant="ghost" disabled={disabled || uploading} onClick={onDelete}>
              {removeLabel}
            </Btn>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className={s.hiddenFile}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload?.(file);
          }}
        />
      </div>
    </Field>
  );
}

function ColorField({ label, value, onChange, disabled }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? String(value) : "#000000";
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="color"
          value={hex}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          style={{
            width: 42,
            height: 36,
            padding: 0,
            border: "1px solid var(--msp-border-light, #e2e8f0)",
            borderRadius: 8,
            background: "transparent",
            cursor: disabled ? "default" : "pointer"
          }}
        />
        <Input
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          disabled={disabled}
          style={{ flex: 1 }}
        />
      </div>
    </Field>
  );
}

function FontPicker({
  value,
  options,
  disabled,
  placeholder,
  emptyLabel,
  onChange,
  onHover,
  onHoverEnd
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedLabel = FONT_LABELS[value] || value || "";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(q) || opt.id.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = e => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery("");
        onHoverEnd?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onHoverEnd]);

  return (
    <div className={s.fontPicker} ref={rootRef}>
      <button
        type="button"
        className={s.fontPickerTrigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen(prev => !prev);
          setQuery("");
        }}
        style={{ fontFamily: FONT_STACKS[value] || undefined }}
      >
        <span>{selectedLabel || placeholder}</span>
        <span className={s.fontPickerCaret} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className={s.fontPickerDropdown}>
          <input
            type="search"
            className={s.fontPickerSearch}
            value={query}
            autoFocus
            placeholder={placeholder}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
                onHoverEnd?.();
              }
            }}
          />
          <ul className={s.fontPickerList} role="listbox">
            {filtered.length === 0 ? (
              <li className={s.fontPickerEmpty}>{emptyLabel}</li>
            ) : (
              filtered.map(opt => {
                const active = opt.id === value;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`${s.fontPickerOption} ${active ? s.fontPickerOptionActive : ""}`}
                      style={{ fontFamily: FONT_STACKS[opt.id] || undefined }}
                      onMouseEnter={() => {
                        ensureGoogleFontLoaded(opt.id);
                        onHover?.(opt.id);
                      }}
                      onMouseLeave={() => onHoverEnd?.()}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                        setQuery("");
                        onHoverEnd?.();
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const PREVIEW_SOCIALS = [
  { key: "report_social_linkedin", icon: "simple-icons:linkedin", title: "LinkedIn" },
  { key: "report_social_facebook", icon: "simple-icons:facebook", title: "Facebook" },
  { key: "report_social_x", icon: "simple-icons:x", title: "X" },
  { key: "report_social_youtube", icon: "simple-icons:youtube", title: "YouTube" }
];

function resolveFormOrPreview(formValue, previewValue) {
  const fromForm = String(formValue || "").trim();
  if (fromForm) return fromForm;
  return String(previewValue || "").trim();
}

function formFlagOn(form, key) {
  const value = form?.[key];
  if (value === undefined || value === null || value === "") return true;
  return String(value).toLowerCase() === "true";
}

function LivePreview({ form, preview, copy, hoverFont = null }) {
  const brand = String(form.report_brand_label || "").trim();
  const company = resolveFormOrPreview(form.report_company_name, preview?.companyName);
  const supportEmail = resolveFormOrPreview(form.report_support_email, preview?.supportEmail);
  const supportPhone = resolveFormOrPreview(form.report_support_phone, preview?.supportPhone);
  const website = resolveFormOrPreview(form.report_website, preview?.website);
  const address = resolveFormOrPreview(form.report_address, preview?.address);
  const footerNote = String(form.report_footer_note || "").trim();
  const showFooterGeneratedAt = formFlagOn(form, "report_show_generated_at");
  const showHeaderLogo = formFlagOn(form, "report_show_header_logo");
  const showHeaderBrand = formFlagOn(form, "report_show_header_brand");
  const showHeaderCompany = formFlagOn(form, "report_show_header_company");
  const showHeaderClient = formFlagOn(form, "report_show_header_client");
  const showHeaderPeriod = formFlagOn(form, "report_show_header_period");
  const showHeaderPill = formFlagOn(form, "report_show_header_pill");
  const showHeaderGeneratedAt = formFlagOn(form, "report_show_header_generated_at");
  const showFooterLogo = formFlagOn(form, "report_show_footer_logo");
  const showFooterCompany = formFlagOn(form, "report_show_footer_company");
  const showFooterBrand = formFlagOn(form, "report_show_footer_brand");
  const showFooterEmail = formFlagOn(form, "report_show_footer_email");
  const showFooterPhone = formFlagOn(form, "report_show_footer_phone");
  const showFooterWebsite = formFlagOn(form, "report_show_footer_website");
  const showFooterAddress = formFlagOn(form, "report_show_footer_address");
  const showFooterSocials = formFlagOn(form, "report_show_footer_socials");
  const showFooterNote = formFlagOn(form, "report_show_footer_note");
  const footerMain =
    showFooterCompany && company ? company : showFooterBrand && brand ? brand : "";
  const footerBrandAlt =
    showFooterCompany &&
    company &&
    showFooterBrand &&
    brand &&
    brand.toLowerCase() !== company.toLowerCase()
      ? brand
      : "";
  const socialDisplay = ["icons", "links", "both"].includes(form.report_social_display)
    ? form.report_social_display
    : "icons";
  const generatedAt = useMemo(() => new Date().toLocaleString("fr-FR"), []);
  const socials = PREVIEW_SOCIALS.map(item => ({
    ...item,
    url: String(form[item.key] || "").trim()
  })).filter(item => item.url);
  const noteParts = [];
  if (showFooterGeneratedAt) noteParts.push(`${copy.generatedAtPrefix} ${generatedAt}`);
  if (showFooterNote && footerNote) noteParts.push(footerNote);

  const sansId = hoverFont?.role === "sans" ? hoverFont.id : form.report_font_sans;
  const serifId = hoverFont?.role === "serif" ? hoverFont.id : form.report_font_serif;
  const fontSans = FONT_STACKS[sansId] || FONT_STACKS.source_sans;
  const fontSerif = FONT_STACKS[serifId] || FONT_STACKS.source_serif;
  const headerBg = form.report_header_bg || EMPTY.report_header_bg;
  const headerText = form.report_header_text || EMPTY.report_header_text;
  const headerBrand = form.report_header_brand_color || EMPTY.report_header_brand_color;
  const barStart = form.report_header_accent_bar || EMPTY.report_header_accent_bar;
  const footerBg = form.report_footer_bg || EMPTY.report_footer_bg;
  const footerText = form.report_footer_text || EMPTY.report_footer_text;
  const footerMuted = form.report_footer_muted || EMPTY.report_footer_muted;
  const footerLink = form.report_footer_link || EMPTY.report_footer_link;
  const accent = form.report_accent || EMPTY.report_accent;
  const navy = form.report_navy || EMPTY.report_navy;
  const logoUrl = resolveLoginAssetUrl(form.report_logo_path || preview?.logoPath);
  const footerLogoUrl =
    resolveLoginAssetUrl(form.report_footer_logo_path || preview?.footerLogoPath) || logoUrl;

  return (
    <div className={s.previewShell}>
      <div
        className={s.previewHeader}
        style={{
          background: headerBg,
          color: headerText,
          fontFamily: fontSans
        }}
      >
        <div className={s.previewAccentBar} style={{ background: barStart }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", minWidth: 0 }}>
            {showHeaderLogo && logoUrl ? <img src={logoUrl} alt="" className={s.previewLogo} /> : null}
            <div style={{ minWidth: 0 }}>
              {showHeaderBrand && brand ? (
                <div
                  style={{
                    fontSize: `${form.report_brand_size || 0.72}rem`,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: headerBrand
                  }}
                >
                  {brand}
                </div>
              ) : null}
              {showHeaderCompany &&
              company &&
              (!showHeaderBrand || !brand || company.toLowerCase() !== brand.toLowerCase()) ? (
                <div
                  style={{
                    marginTop: showHeaderBrand && brand ? 4 : 0,
                    fontFamily: fontSerif,
                    fontSize: `${form.report_company_size || 1.05}rem`,
                    fontWeight: 600
                  }}
                >
                  {company}
                </div>
              ) : null}
            </div>
          </div>
          {showHeaderGeneratedAt ? (
            <div style={{ fontSize: "0.75rem", opacity: 0.75, textAlign: "right", flexShrink: 0 }}>
              {copy.generatedAtHeader} {generatedAt}
            </div>
          ) : null}
        </div>
        {showHeaderClient ? (
          <div
            style={{
              fontFamily: fontSerif,
              fontSize: `${form.report_client_size || 2.1}rem`,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em"
            }}
          >
            {copy.previewClient}
          </div>
        ) : null}
        {showHeaderPeriod ? (
          <div style={{ marginTop: 6, fontSize: "0.9rem", opacity: 0.85 }}>{copy.previewPeriod}</div>
        ) : null}
        {showHeaderPill ? (
          <span
            style={{
              display: "inline-flex",
              marginTop: 12,
              padding: "0.3rem 0.75rem",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.12)",
              fontSize: "0.75rem",
              fontWeight: 650
            }}
          >
            {copy.previewPill}
          </span>
        ) : null}
      </div>

      <div className={s.previewBody} style={{ fontFamily: fontSans }}>
        <div className={s.previewBodyCard}>
          <p className={s.previewBodyTitle} style={{ color: navy, fontFamily: fontSerif }}>
            {copy.previewBodyTitle}
          </p>
          <p className={s.previewBodyLine}>{copy.previewBodyLine}</p>
          <div
            style={{
              marginTop: 10,
              height: 6,
              borderRadius: 999,
              background: accent
            }}
          />
        </div>
        <div className={s.previewBodyCard}>
          <p className={s.previewBodyTitle} style={{ color: navy, fontFamily: fontSerif }}>
            {copy.previewBodyCardTitle}
          </p>
          <p className={s.previewBodyLine}>{copy.previewBodyCardLine}</p>
        </div>
      </div>

      <div
        className={s.previewFooter}
        style={{
          background: footerBg,
          color: footerText,
          fontFamily: fontSans
        }}
      >
        {showFooterLogo && footerLogoUrl ? (
          <img src={footerLogoUrl} alt="" className={s.previewFooterLogo} />
        ) : null}
        {footerMain ? (
          <div
            style={{
              fontSize: `${form.report_footer_brand_size || 0.95}rem`,
              fontWeight: 750,
              letterSpacing: "0.14em",
              textTransform: "uppercase"
            }}
          >
            {footerMain}
          </div>
        ) : null}
        {footerBrandAlt ? <div className={s.previewFooterBrandAlt}>{footerBrandAlt}</div> : null}
        {(showFooterEmail && supportEmail) ||
        (showFooterPhone && supportPhone) ||
        (showFooterWebsite && website) ||
        (showFooterAddress && address) ? (
          <div className={s.previewFooterContacts} style={{ color: footerLink }}>
            {showFooterEmail && supportEmail ? <span>{supportEmail}</span> : null}
            {showFooterPhone && supportPhone ? <span>{supportPhone}</span> : null}
            {showFooterWebsite && website ? <span>{website.replace(/^https?:\/\//i, "")}</span> : null}
            {showFooterAddress && address ? <span>{address}</span> : null}
          </div>
        ) : null}
        {showFooterSocials && socials.length ? (
          <div
            className={`${s.previewFooterSocial} ${
              socialDisplay === "links"
                ? s.previewFooterSocialLinks
                : socialDisplay === "both"
                  ? s.previewFooterSocialBoth
                  : s.previewFooterSocialIcons
            }`}
            style={{ color: footerLink }}
          >
            {socials.map(item => (
              <a
                key={`${item.key}-${item.url}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                title={item.title}
                aria-label={item.title}
                className={s.previewFooterSocialItem}
              >
                {socialDisplay !== "links" ? (
                  <Icon icon={item.icon} width={16} height={16} aria-hidden />
                ) : null}
                {socialDisplay !== "icons" ? <span>{item.title}</span> : null}
              </a>
            ))}
          </div>
        ) : null}
        {noteParts.length ? (
          <div
            className={s.previewFooterNote}
            style={{ fontSize: `${form.report_footer_note_size || 0.78}rem`, color: footerMuted }}
          >
            {noteParts.join(" · ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminReports({ isCommunity = false }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [fontOptions, setFontOptions] = useState(ALL_FONT_OPTIONS);
  const [hoverFont, setHoverFont] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(null);
  const [activeTab, setActiveTab] = useState("identity");
  const tabItems = useMemo(() => {
    const labels = {
      identity: copy.identity,
      header: copy.header,
      footer: copy.footer,
      appearance: copy.appearance
    };
    return REPORT_TABS.map(tab => ({ ...tab, label: labels[tab.key] }));
  }, [copy]);

  const setField = (key, value) =>
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Couleurs plates : synchronise les anciennes clés “fin de dégradé”.
      if (key === "report_header_bg") next.report_header_bg_end = value;
      if (key === "report_header_accent_bar") next.report_header_accent_bar_end = value;
      return next;
    });
  const clearHoverFont = () => setHoverFont(null);

  const handleLogoUpload = async (kind, file) => {
    setUploadingLogo(kind);
    try {
      const data = await uploadReportBrandingAsset(kind, file);
      if (data.settings) setForm({ ...EMPTY, ...data.settings });
      if (data.branding) setPreview(data.branding);
      else if (data.path && data.key) setField(data.key, data.path);
    } catch (err) {
      toast.error(err.message || copy.logoUploadError);
    } finally {
      setUploadingLogo(null);
    }
  };

  const handleLogoDelete = async kind => {
    setUploadingLogo(kind);
    try {
      const data = await deleteReportBrandingAsset(kind);
      if (data.settings) setForm({ ...EMPTY, ...data.settings });
      if (data.branding) setPreview(data.branding);
    } catch (err) {
      toast.error(err.message || copy.logoDeleteError);
    } finally {
      setUploadingLogo(null);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const ids = [form.report_font_sans, form.report_font_serif, hoverFont?.id].filter(Boolean);
    ids.forEach(ensureGoogleFontLoaded);
    return undefined;
  }, [form.report_font_sans, form.report_font_serif, hoverFont?.id]);

  useEffect(() => {
    if (isCommunity) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchReportBrandingAdmin()
      .then(data => {
        if (cancelled) return;
        setForm({ ...EMPTY, ...(data.settings || {}) });
        setPreview(data.branding || null);
        const apiList = data.fontPresets?.all || data.fontPresets?.sans;
        if (Array.isArray(apiList) && apiList.length) {
          const byId = new Map(ALL_FONT_OPTIONS.map(opt => [opt.id, opt]));
          setFontOptions(
            apiList
              .map(item => byId.get(item.id) || { id: item.id, label: item.label, stack: FONT_STACKS[item.id], google: FONT_GOOGLE[item.id] || null })
              .filter(opt => opt.stack)
          );
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(copy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadError, isCommunity]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateReportBranding(form);
      setForm({ ...EMPTY, ...(data.settings || {}) });
      setPreview(data.branding || null);
      toast.success(copy.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const resetAppearance = () => {
    setForm(prev => {
      const next = { ...prev };
      APPEARANCE_KEYS.forEach(key => {
        next[key] = EMPTY[key];
      });
      return next;
    });
  };

  const heroCopy = getAdminPanelCopy(locale).items.reports;
  const hero = (
    <UiKitPageHero title={heroCopy.label} subtitle={heroCopy.description} icon="mdi:file-document-outline" />
  );

  if (isCommunity) {
    return (
      <Page>
        {hero}
        <Card title={copy.title} description={copy.communityLocked}>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--msp-muted, #5c6b82)" }}>{copy.communityHint}</p>
        </Card>
      </Page>
    );
  }

  const saveBtn = (
    <Btn icon="mdi:content-save-outline" disabled={loading || saving} onClick={handleSave}>
      {saving ? copy.saving : copy.save}
    </Btn>
  );

  const disabled = loading || saving;

  return (
    <Page>
      {hero}
      <SubTabs items={tabItems} active={activeTab} onChange={setActiveTab} fullWidth action={saveBtn} />

      <div className={s.workspace} data-page-fill>
        <div className={s.editor}>
          {activeTab === "identity" ? (
            <Card title={copy.identity} description={copy.identityHint}>
              <FormGrid>
                <Field label={copy.companyName} hint={copy.companyNameHint}>
                  <Input
                    value={form.report_company_name}
                    onChange={e => setField("report_company_name", e.target.value)}
                    placeholder={preview?.companyName || "Veritas"}
                    maxLength={120}
                    disabled={disabled}
                  />
                </Field>
                <Field label={copy.brandLabel} hint={copy.brandLabelHint}>
                  <Input
                    value={form.report_brand_label}
                    onChange={e => setField("report_brand_label", e.target.value)}
                    placeholder="PSI × Veritas"
                    maxLength={80}
                    disabled={disabled}
                  />
                </Field>
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.logos}</h3>
              <FormGrid>
                <LogoUploadField
                  label={copy.logoHeader}
                  hint={copy.logoHeaderHint}
                  path={form.report_logo_path}
                  disabled={disabled}
                  uploading={uploadingLogo === "logo"}
                  chooseLabel={copy.chooseLogo}
                  removeLabel={copy.removeLogo}
                  onUpload={file => handleLogoUpload("logo", file)}
                  onDelete={() => handleLogoDelete("logo")}
                />
                <LogoUploadField
                  label={copy.logoFooter}
                  hint={copy.logoFooterHint}
                  path={form.report_footer_logo_path}
                  disabled={disabled}
                  uploading={uploadingLogo === "footer-logo"}
                  chooseLabel={copy.chooseLogo}
                  removeLabel={copy.removeLogo}
                  onUpload={file => handleLogoUpload("footer-logo", file)}
                  onDelete={() => handleLogoDelete("footer-logo")}
                />
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.contact}</h3>
              <FormGrid>
                <Field label={copy.supportEmail}>
                  <Input type="email" value={form.report_support_email} onChange={e => setField("report_support_email", e.target.value)} placeholder="support@exemple.fr" maxLength={200} disabled={disabled} />
                </Field>
                <Field label={copy.supportPhone}>
                  <Input value={form.report_support_phone} onChange={e => setField("report_support_phone", e.target.value)} placeholder="09 00 00 00 00" maxLength={40} disabled={disabled} />
                </Field>
                <Field label={copy.website}>
                  <Input type="url" value={form.report_website} onChange={e => setField("report_website", e.target.value)} placeholder="https://www.exemple.fr" maxLength={200} disabled={disabled} />
                </Field>
                <Field label={copy.address}>
                  <Input value={form.report_address} onChange={e => setField("report_address", e.target.value)} placeholder="10 rue Example, 33000 Bordeaux" maxLength={300} disabled={disabled} />
                </Field>
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.socials}</h3>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--msp-muted, #5c6b82)" }}>{copy.socialsHint}</p>
              <div style={{ marginBottom: "0.9rem" }}>
                <SegmentField
                  label={copy.socialDisplay}
                  value={["icons", "links", "both"].includes(form.report_social_display) ? form.report_social_display : "icons"}
                  onChange={value => setField("report_social_display", value)}
                  disabled={disabled}
                  options={[
                    { value: "icons", icon: "mdi:emoticon-outline", title: copy.socialDisplayIcons, label: copy.socialDisplayIcons },
                    { value: "links", icon: "mdi:link-variant", title: copy.socialDisplayLinks, label: copy.socialDisplayLinks },
                    { value: "both", icon: "mdi:multimedia", title: copy.socialDisplayBoth, label: copy.socialDisplayBoth }
                  ]}
                />
              </div>
              <FormGrid>
                <Field label={copy.linkedin}>
                  <Input type="url" value={form.report_social_linkedin} onChange={e => setField("report_social_linkedin", e.target.value)} placeholder="https://www.linkedin.com/company/…" disabled={disabled} />
                </Field>
                <Field label={copy.facebook}>
                  <Input type="url" value={form.report_social_facebook} onChange={e => setField("report_social_facebook", e.target.value)} placeholder="https://www.facebook.com/…" disabled={disabled} />
                </Field>
                <Field label={copy.x}>
                  <Input type="url" value={form.report_social_x} onChange={e => setField("report_social_x", e.target.value)} placeholder="https://x.com/…" disabled={disabled} />
                </Field>
                <Field label={copy.youtube}>
                  <Input type="url" value={form.report_social_youtube} onChange={e => setField("report_social_youtube", e.target.value)} placeholder="https://www.youtube.com/…" disabled={disabled} />
                </Field>
              </FormGrid>
            </Card>
          ) : null}

          {activeTab === "header" ? (
            <Card title={copy.header} description={copy.headerVisibilityHint}>
              <FormGrid>
                <Field label={copy.showHeaderLogo}>
                  <Switch checked={formFlagOn(form, "report_show_header_logo")} onChange={on => setField("report_show_header_logo", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showHeaderBrand}>
                  <Switch checked={formFlagOn(form, "report_show_header_brand")} onChange={on => setField("report_show_header_brand", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showHeaderCompany}>
                  <Switch checked={formFlagOn(form, "report_show_header_company")} onChange={on => setField("report_show_header_company", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showHeaderClient}>
                  <Switch checked={formFlagOn(form, "report_show_header_client")} onChange={on => setField("report_show_header_client", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showHeaderPeriod}>
                  <Switch checked={formFlagOn(form, "report_show_header_period")} onChange={on => setField("report_show_header_period", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showHeaderPill}>
                  <Switch checked={formFlagOn(form, "report_show_header_pill")} onChange={on => setField("report_show_header_pill", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showHeaderGeneratedAt}>
                  <Switch checked={formFlagOn(form, "report_show_header_generated_at")} onChange={on => setField("report_show_header_generated_at", on ? "true" : "false")} disabled={disabled} />
                </Field>
              </FormGrid>
            </Card>
          ) : null}

          {activeTab === "footer" ? (
            <Card title={copy.footer} description={copy.footerVisibilityHint}>
              <Field label={copy.footerNote}>
                <Textarea value={form.report_footer_note} onChange={e => setField("report_footer_note", e.target.value)} rows={3} maxLength={200} disabled={disabled} />
              </Field>
              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.footerVisibility}</h3>
              <FormGrid>
                <Field label={copy.showFooterLogo}>
                  <Switch checked={formFlagOn(form, "report_show_footer_logo")} onChange={on => setField("report_show_footer_logo", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterCompany}>
                  <Switch checked={formFlagOn(form, "report_show_footer_company")} onChange={on => setField("report_show_footer_company", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterBrand}>
                  <Switch checked={formFlagOn(form, "report_show_footer_brand")} onChange={on => setField("report_show_footer_brand", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterEmail}>
                  <Switch checked={formFlagOn(form, "report_show_footer_email")} onChange={on => setField("report_show_footer_email", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterPhone}>
                  <Switch checked={formFlagOn(form, "report_show_footer_phone")} onChange={on => setField("report_show_footer_phone", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterWebsite}>
                  <Switch checked={formFlagOn(form, "report_show_footer_website")} onChange={on => setField("report_show_footer_website", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterAddress}>
                  <Switch checked={formFlagOn(form, "report_show_footer_address")} onChange={on => setField("report_show_footer_address", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterSocials}>
                  <Switch checked={formFlagOn(form, "report_show_footer_socials")} onChange={on => setField("report_show_footer_socials", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showFooterNote}>
                  <Switch checked={formFlagOn(form, "report_show_footer_note")} onChange={on => setField("report_show_footer_note", on ? "true" : "false")} disabled={disabled} />
                </Field>
                <Field label={copy.showGeneratedAt}>
                  <Switch checked={formFlagOn(form, "report_show_generated_at")} onChange={on => setField("report_show_generated_at", on ? "true" : "false")} disabled={disabled} />
                </Field>
              </FormGrid>
            </Card>
          ) : null}

          {activeTab === "appearance" ? (
            <Card
              title={copy.appearance}
              description={copy.appearanceHint}
              action={
                <Btn variant="ghost" icon="mdi:restore" disabled={disabled} onClick={resetAppearance}>
                  {copy.resetAppearance}
                </Btn>
              }
            >
              <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.92rem" }}>{copy.fonts}</h3>
              <FormGrid>
                <Field label={copy.fontSans}>
                  <FontPicker
                    value={form.report_font_sans}
                    options={fontOptions}
                    disabled={disabled}
                    placeholder={copy.fontSearchPlaceholder}
                    emptyLabel={copy.fontEmpty}
                    onChange={id => setField("report_font_sans", id)}
                    onHover={id => setHoverFont({ role: "sans", id })}
                    onHoverEnd={clearHoverFont}
                  />
                </Field>
                <Field label={copy.fontSerif}>
                  <FontPicker
                    value={form.report_font_serif}
                    options={fontOptions}
                    disabled={disabled}
                    placeholder={copy.fontSearchPlaceholder}
                    emptyLabel={copy.fontEmpty}
                    onChange={id => setField("report_font_serif", id)}
                    onHover={id => setHoverFont({ role: "serif", id })}
                    onHoverEnd={clearHoverFont}
                  />
                </Field>
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.headerColors}</h3>
              <FormGrid>
                <ColorField label={copy.headerBg} value={form.report_header_bg} onChange={v => setField("report_header_bg", v)} disabled={disabled} />
                <ColorField label={copy.headerText} value={form.report_header_text} onChange={v => setField("report_header_text", v)} disabled={disabled} />
                <ColorField label={copy.headerBrandColor} value={form.report_header_brand_color} onChange={v => setField("report_header_brand_color", v)} disabled={disabled} />
                <ColorField label={copy.headerAccentBar} value={form.report_header_accent_bar} onChange={v => setField("report_header_accent_bar", v)} disabled={disabled} />
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.footerColors}</h3>
              <FormGrid>
                <ColorField label={copy.footerBg} value={form.report_footer_bg} onChange={v => setField("report_footer_bg", v)} disabled={disabled} />
                <ColorField label={copy.footerText} value={form.report_footer_text} onChange={v => setField("report_footer_text", v)} disabled={disabled} />
                <ColorField label={copy.footerMuted} value={form.report_footer_muted} onChange={v => setField("report_footer_muted", v)} disabled={disabled} />
                <ColorField label={copy.footerLink} value={form.report_footer_link} onChange={v => setField("report_footer_link", v)} disabled={disabled} />
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.themeColors}</h3>
              <FormGrid>
                <ColorField label={copy.accent} value={form.report_accent} onChange={v => setField("report_accent", v)} disabled={disabled} />
                <ColorField label={copy.navy} value={form.report_navy} onChange={v => setField("report_navy", v)} disabled={disabled} />
              </FormGrid>

              <h3 style={{ margin: "1.25rem 0 0.65rem", fontSize: "0.92rem" }}>{copy.sizes}</h3>
              <FormGrid>
                {[
                  ["report_brand_size", copy.brandSize],
                  ["report_company_size", copy.companySize],
                  ["report_client_size", copy.clientSize],
                  ["report_footer_brand_size", copy.footerBrandSize],
                  ["report_footer_note_size", copy.footerNoteSize]
                ].map(([key, label]) => (
                  <SegmentField
                    key={key}
                    label={label}
                    value={nearestReportSizePreset(key, form[key])}
                    onChange={preset => setField(key, REPORT_SIZE_PRESETS[key][preset])}
                    options={reportSizeSegmentOptions(copy)}
                    disabled={disabled}
                  />
                ))}
              </FormGrid>
            </Card>
          ) : null}
        </div>

        <aside className={s.previewColumn}>
          <div className={s.previewSticky}>
            <Card title={copy.livePreview} noPadding fill fillNoScroll>
              <LivePreview form={form} preview={preview} copy={copy} hoverFont={hoverFont} />
            </Card>
          </div>
        </aside>
      </div>

    </Page>
  );
}
