import { forwardRef, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchReportBranding } from "../../api/reportBranding";
import { resolveLoginAssetUrl } from "../../utils/loginBrandingUtils";
import { REPORT_META } from "./exportRapportHtmlTemplate";
import styles from "./ReportBrandingChrome.module.css";

function buildChromeCssVars(branding) {
  const style = branding?.style || {};
  return {
    "--vex-font-sans": style.fontSans || '"Source Sans 3", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    "--vex-font-serif": style.fontSerif || '"Source Serif 4", Georgia, "Times New Roman", serif',
    "--vex-header-bg": style.headerBg || "#0b3d4a",
    "--vex-header-text": style.headerText || "#f8fafc",
    "--vex-header-brand": style.headerBrandColor || "#99f6e4",
    "--vex-header-bar": style.headerAccentBar || "#99f6e4",
    "--vex-footer-bg": style.footerBg || "#ffffff",
    "--vex-footer-text": style.footerText || "#1e3a5f",
    "--vex-footer-muted": style.footerMuted || "#64748b",
    "--vex-footer-link": style.footerLink || "#115e59",
    "--vex-brand-size": style.brandSize || "0.72rem",
    "--vex-company-size": style.companySize || "1.05rem",
    "--vex-client-size": style.clientSize || "2.1rem",
    "--vex-footer-brand-size": style.footerBrandSize || "0.95rem",
    "--vex-footer-note-size": style.footerNoteSize || "0.78rem",
    "--vex-accent": style.accent || "#0f766e",
    "--vex-navy": style.navy || "#1e3a5f"
  };
}

const ReportBrandingChrome = forwardRef(function ReportBrandingChrome(
  {
    branding: brandingProp = null,
    clientName = "",
    periodLabel = "",
    reportType = "intervention",
    reportLabel = "",
    children,
    className = ""
  },
  ref
) {
  const [branding, setBranding] = useState(brandingProp);
  const [loading, setLoading] = useState(!brandingProp);

  useEffect(() => {
    if (brandingProp) {
      setBranding(brandingProp);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchReportBranding()
      .then(data => {
        if (!cancelled) setBranding(data || null);
      })
      .catch(() => {
        if (!cancelled) setBranding(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brandingProp]);

  useEffect(() => {
    const href = branding?.style?.googleFontsHref;
    if (!href || typeof document === "undefined") return undefined;
    const id = "veritas-report-branding-fonts";
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    return undefined;
  }, [branding?.style?.googleFontsHref]);

  const cssVars = useMemo(() => buildChromeCssVars(branding), [branding]);
  const brandLabel = String(branding?.brandLabel || "").trim();
  const companyName = String(branding?.companyName || "").trim();
  const showFooterGeneratedAt = branding?.showGeneratedAt !== false;
  const showHeaderLogo = branding?.showHeaderLogo !== false;
  const showHeaderBrand = branding?.showHeaderBrand !== false;
  const showHeaderCompany = branding?.showHeaderCompany !== false;
  const showHeaderClient = branding?.showHeaderClient !== false;
  const showHeaderPeriod = branding?.showHeaderPeriod !== false;
  const showHeaderPill = branding?.showHeaderPill !== false;
  const showHeaderGeneratedAt = branding?.showHeaderGeneratedAt !== false;
  const showFooterLogo = branding?.showFooterLogo !== false;
  const showFooterCompany = branding?.showFooterCompany !== false;
  const showFooterBrand = branding?.showFooterBrand !== false;
  const showFooterEmail = branding?.showFooterEmail !== false;
  const showFooterPhone = branding?.showFooterPhone !== false;
  const showFooterWebsite = branding?.showFooterWebsite !== false;
  const showFooterAddress = branding?.showFooterAddress !== false;
  const showFooterSocials = branding?.showFooterSocials !== false;
  const showFooterNote = branding?.showFooterNote !== false;
  const generatedAt = useMemo(() => new Date().toLocaleString("fr-FR"), []);
  const pillLabel =
    reportLabel ||
    REPORT_META[reportType]?.label ||
    "Rapport";
  const footerMain =
    showFooterCompany && companyName
      ? companyName
      : showFooterBrand && brandLabel
        ? brandLabel
        : "";
  const footerBrandAlt =
    showFooterCompany &&
    companyName &&
    showFooterBrand &&
    brandLabel &&
    brandLabel.toLowerCase() !== companyName.toLowerCase()
      ? brandLabel
      : "";
  const supportEmail = String(branding?.supportEmail || "").trim();
  const supportPhone = String(branding?.supportPhone || "").trim();
  const website = String(branding?.website || "").trim();
  const address = String(branding?.address || "").trim();
  const footerNote = String(branding?.footerNote || "").trim();
  const socials = Array.isArray(branding?.socials) ? branding.socials : [];
  const socialDisplay = ["icons", "links", "both"].includes(branding?.socialDisplay)
    ? branding.socialDisplay
    : "icons";
  const noteParts = [];
  if (showFooterGeneratedAt) noteParts.push(`Document généré le ${generatedAt}`);
  if (showFooterNote && footerNote) noteParts.push(footerNote);
  const logoUrl = resolveLoginAssetUrl(branding?.logoPath);
  const footerLogoUrl = resolveLoginAssetUrl(branding?.footerLogoPath) || logoUrl;

  return (
    <div
      ref={ref}
      className={`${styles.chrome} ${className}`.trim()}
      style={cssVars}
      data-loading={loading ? "true" : undefined}
    >
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandRow}>
            <div className={styles.brandIdentity}>
              {showHeaderLogo && logoUrl ? <img src={logoUrl} alt="" className={styles.logo} /> : null}
              <div>
                {showHeaderBrand && brandLabel ? <p className={styles.brand}>{brandLabel}</p> : null}
                {showHeaderCompany &&
                companyName &&
                (!showHeaderBrand || !brandLabel || companyName.toLowerCase() !== brandLabel.toLowerCase()) ? (
                  <p className={styles.company}>{companyName}</p>
                ) : null}
              </div>
            </div>
            {showHeaderGeneratedAt ? <p className={styles.generated}>Généré le {generatedAt}</p> : null}
          </div>
          {showHeaderClient ? <h1 className={styles.client}>{clientName || "—"}</h1> : null}
          {showHeaderPeriod && periodLabel ? <p className={styles.period}>{periodLabel}</p> : null}
          {showHeaderPill ? <span className={styles.pill}>{pillLabel}</span> : null}
        </div>
      </header>

      <div className={styles.body}>{children}</div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          {showFooterLogo && footerLogoUrl ? (
            <img src={footerLogoUrl} alt="" className={styles.footerLogo} />
          ) : null}
          {footerMain ? <div className={styles.footerBrand}>{footerMain}</div> : null}
          {footerBrandAlt ? <div className={styles.footerBrandAlt}>{footerBrandAlt}</div> : null}
          {(showFooterEmail && supportEmail) ||
          (showFooterPhone && supportPhone) ||
          (showFooterWebsite && website) ||
          (showFooterAddress && address) ? (
            <div className={styles.footerContacts}>
              {showFooterEmail && supportEmail ? (
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
              ) : null}
              {showFooterPhone && supportPhone ? (
                <a href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}>{supportPhone}</a>
              ) : null}
              {showFooterWebsite && website ? (
                <a href={website} target="_blank" rel="noreferrer">
                  {website.replace(/^https?:\/\//i, "")}
                </a>
              ) : null}
              {showFooterAddress && address ? <span>{address}</span> : null}
            </div>
          ) : null}
          {showFooterSocials && socials.length ? (
            <div
              className={[
                styles.footerSocial,
                socialDisplay === "links"
                  ? styles.footerSocialLinks
                  : socialDisplay === "both"
                    ? styles.footerSocialBoth
                    : styles.footerSocialIcons
              ].join(" ")}
            >
              {socials.map(item => (
                <a
                  key={`${item.url}-${item.icon}-${item.id || item.title}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title={item.title || ""}
                  aria-label={item.title || "Social"}
                  className={styles.footerSocialItem}
                >
                  {socialDisplay !== "links" ? (
                    <Icon icon={item.icon || "mdi:link"} width={18} height={18} aria-hidden />
                  ) : null}
                  {socialDisplay !== "icons" ? <span>{item.title || item.url}</span> : null}
                </a>
              ))}
            </div>
          ) : null}
          {noteParts.length ? <p className={styles.footerNote}>{noteParts.join(" · ")}</p> : null}
        </div>
      </footer>
    </div>
  );
});

export default ReportBrandingChrome;
