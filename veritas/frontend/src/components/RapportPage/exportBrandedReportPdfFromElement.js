import { jsPDF } from "jspdf";

const PDF_CAPTURE_WIDTH = 794;
/** Seuil (mm) sous lequel on n'ajoute pas de page quasi vide. */
const BLANK_PAGE_SLACK_MM = 3;

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
        try {
          img.crossOrigin = "anonymous";
        } catch {
          // ignore
        }
      }
    })
  );
  await waitForImages(root);
}

function prepareCloneForPdf(clone) {
  clone.style.width = `${PDF_CAPTURE_WIDTH}px`;
  clone.style.maxWidth = `${PDF_CAPTURE_WIDTH}px`;
  clone.style.margin = "0";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  clone.style.background = "#ffffff";
  clone.style.color = "#0f172a";

  // Évite les fonds imbriqués moche (gris puis blanc) sur les lignes de champs.
  clone.querySelectorAll('[class*="previewBox"] > *, [class*="previewSignatureBox"] > *').forEach(el => {
    el.style.background = "transparent";
    el.style.backgroundColor = "transparent";
    el.style.boxShadow = "none";
  });

  // Les images de signature gardent un fond blanc propre.
  clone.querySelectorAll('[class*="previewSignatureImage"], [class*="previewSignatureEmpty"]').forEach(el => {
    el.style.background = "#ffffff";
    el.style.backgroundColor = "#ffffff";
  });

  const body = clone.querySelector('[class*="body"]');
  if (body) {
    body.style.background = "#ffffff";
    body.style.color = "#0f172a";
  }

  const footer = clone.querySelector("footer");
  if (footer) {
    footer.style.textAlign = "center";
    const inner = footer.firstElementChild;
    if (inner) {
      inner.style.display = "flex";
      inner.style.flexDirection = "column";
      inner.style.alignItems = "center";
      inner.style.textAlign = "center";
    }
  }
}

/** Coupe le bas blanc du canvas pour éviter une 2e page vide. */
function trimCanvasBottom(canvas) {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return canvas;
    const { width, height } = canvas;
    if (!width || !height) return canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    let bottom = height - 1;
    outer: for (; bottom >= 0; bottom -= 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (bottom * width + x) * 4;
        const a = data[i + 3];
        if (a < 8) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r < 250 || g < 250 || b < 250) break outer;
      }
    }
    const trimmedH = Math.min(height, Math.max(1, bottom + 4));
    if (trimmedH >= height - 2) return canvas;
    const out = document.createElement("canvas");
    out.width = width;
    out.height = trimmedH;
    out.getContext("2d").drawImage(canvas, 0, 0, width, trimmedH, 0, 0, width, trimmedH);
    return out;
  } catch {
    return canvas;
  }
}

function canvasToPdf(sourceCanvas, { asBlob, fileName }) {
  const canvas = trimCanvasBottom(sourceCanvas);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let imgData;
  try {
    imgData = canvas.toDataURL("image/png");
  } catch (err) {
    throw new Error(
      err?.message
        ? `Export PDF bloqué (image): ${err.message}`
        : "Export PDF bloqué (canvas sécurisé)"
    );
  }

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > BLANK_PAGE_SLACK_MM) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  if (asBlob) return pdf.output("blob");
  pdf.save(fileName);
  return null;
}

/**
 * Capture simple de la preview brandée → PDF A4 (même mise en page).
 */
export async function exportBrandedReportPdfFromElement(
  sourceEl,
  { asBlob = false, fileName = "rapport.pdf" } = {}
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
  const { default: html2canvas } = await import("html2canvas");
  await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

  const wrap = document.createElement("div");
  wrap.setAttribute("data-report-pdf-capture", "true");
  wrap.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${PDF_CAPTURE_WIDTH}px`,
    "background:#ffffff",
    "color:#0f172a",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
    "overflow:visible"
  ].join(";");

  const clone = sourceEl.cloneNode(true);
  prepareCloneForPdf(clone);
  await inlineImagesAsDataUrls(clone);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);

  try {
    await waitForImages(wrap);
    // Laisser le layout se stabiliser à largeur A4.
    await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: PDF_CAPTURE_WIDTH,
      windowWidth: PDF_CAPTURE_WIDTH,
      onclone: (_doc, el) => {
        el.style.width = `${PDF_CAPTURE_WIDTH}px`;
        el.style.maxWidth = `${PDF_CAPTURE_WIDTH}px`;
        el.style.opacity = "1";
        prepareCloneForPdf(el);
      }
    });
    return canvasToPdf(canvas, { asBlob, fileName });
  } finally {
    wrap.remove();
  }
}
