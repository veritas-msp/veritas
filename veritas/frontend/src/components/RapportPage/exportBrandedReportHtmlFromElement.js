import { saveAs } from "file-saver";

const MAX_COLLECTED_CSS_CHARS = 350_000;

function ensureHtmlFileName(fileName) {
  const base = String(fileName || "rapport")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .trim()
    .replace(/\s+/g, " ") || "rapport";
  return base.toLowerCase().endsWith(".html") ? base : `${base}.html`;
}

function collectDocumentCSS() {
  let css = "";
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of sheet.cssRules) {
          const text = rule.cssText || "";
          if (!text || text.length > 8_000) continue;
          css += `${text}\n`;
          if (css.length >= MAX_COLLECTED_CSS_CHARS) return css;
        }
      } catch {
        /* Cross-origin stylesheets are not readable. */
      }
    }
  } catch (err) {
    console.warn("Report HTML export: CSS collection", err);
  }
  return css;
}

function waitForImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map(
      img =>
        new Promise(resolve => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  );
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("readAsDataURL failed"));
    reader.readAsDataURL(blob);
  });
}

async function inlineImagesAsDataUrls(root) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async img => {
      const src = String(img.getAttribute("src") || img.currentSrc || "").trim();
      if (!src || src.startsWith("data:")) return;
      try {
        const res = await fetch(src, { credentials: "include", mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const dataUrl = await blobToDataUrl(await res.blob());
        if (dataUrl) {
          img.setAttribute("src", dataUrl);
          img.removeAttribute("srcset");
        }
      } catch {
        // garde l’URL d’origine si l’inline échoue
      }
    })
  );
  await waitForImages(root);
}

function readGoogleFontsHref() {
  try {
    const link = document.getElementById("veritas-report-branding-fonts");
    return link?.href || "";
  } catch {
    return "";
  }
}

function prepareClone(sourceEl) {
  const clone = sourceEl.cloneNode(true);
  clone.removeAttribute("data-loading");
  clone.style.maxWidth = "860px";
  clone.style.margin = "0 auto";
  clone.style.borderRadius = "14px";
  return clone;
}

function buildStandaloneHtml({ title, bodyHtml, collectedCss, fontsHref }) {
  const fontLink = fontsHref
    ? `<link rel="stylesheet" href="${String(fontsHref).replace(/"/g, "&quot;")}" />`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${String(title || "Rapport").replace(/</g, "&lt;")}</title>
  ${fontLink}
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #0f172a;
    }
    body {
      padding: 1.25rem 1rem 2rem;
      -webkit-font-smoothing: antialiased;
    }
    img, svg { max-width: 100%; }
    ${collectedCss || ""}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Exporte la preview brandée telle quelle en fichier HTML autonome.
 */
export async function exportBrandedReportHtmlFromElement(
  sourceEl,
  { asBlob = false, fileName = "rapport.html", documentTitle = "" } = {}
) {
  if (!sourceEl || typeof document === "undefined") {
    throw new Error("Preview element missing");
  }
  if (sourceEl.getAttribute("data-loading") === "true") {
    await new Promise(resolve => {
      const started = Date.now();
      const tick = () => {
        if (sourceEl.getAttribute("data-loading") !== "true" || Date.now() - started > 4000) {
          resolve();
          return;
        }
        window.requestAnimationFrame(tick);
      };
      tick();
    });
  }

  await waitForImages(sourceEl);
  const clone = prepareClone(sourceEl);
  await inlineImagesAsDataUrls(clone);

  const safeName = ensureHtmlFileName(fileName);
  const html = buildStandaloneHtml({
    title: documentTitle || safeName.replace(/\.html$/i, ""),
    bodyHtml: clone.outerHTML,
    collectedCss: collectDocumentCSS(),
    fontsHref: readGoogleFontsHref()
  });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  if (asBlob) return blob;
  saveAs(blob, safeName);
  return null;
}
