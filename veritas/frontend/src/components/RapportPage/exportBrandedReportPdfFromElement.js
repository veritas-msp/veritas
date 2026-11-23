import { jsPDF } from "jspdf";

const PDF_CAPTURE_WIDTH_PORTRAIT = 794;
const PDF_CAPTURE_WIDTH_LANDSCAPE = 1123;
/** Seuil (mm) sous lequel on n'ajoute pas de page quasi vide. */
const BLANK_PAGE_SLACK_MM = 3;
/** Échelle html2canvas : 1.5 ≈ 144 dpi sur A4 — lisible sans canvas monstrueux. */
const DEFAULT_CAPTURE_SCALE = 1.5;
/** JPEG : quasi imperceptible sur UI/texte, bien plus léger que PNG. */
const DEFAULT_JPEG_QUALITY = 0.86;
/** Marge mini (px canvas) avant de considérer qu'on peut pousser un bloc à la page suivante. */
const MIN_PAGE_CONTENT_PX = 48;

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

function prepareCloneForPdf(clone, width = PDF_CAPTURE_WIDTH_PORTRAIT) {
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.margin = "0";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  clone.style.background = "#ffffff";
  clone.style.color = "#0f172a";

  clone.querySelectorAll('[class*="previewBox"] > *, [class*="previewSignatureBox"] > *').forEach(el => {
    el.style.background = "transparent";
    el.style.backgroundColor = "transparent";
    el.style.boxShadow = "none";
  });

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
    const xStep = width > 1200 ? 4 : 2;
    let bottom = height - 1;
    outer: for (; bottom >= 0; bottom -= 1) {
      for (let x = 0; x < width; x += xStep) {
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

function canvasSliceToJpeg(source, sx, sy, sw, sh, quality) {
  const slice = document.createElement("canvas");
  slice.width = Math.max(1, Math.floor(sw));
  slice.height = Math.max(1, Math.floor(sh));
  const ctx = slice.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, slice.width, slice.height);
  return slice.toDataURL("image/jpeg", quality);
}

function measureLayoutRanges(root, scale) {
  if (!root || typeof root.getBoundingClientRect !== "function") {
    return { keeps: [], footer: null };
  }
  const rootRect = root.getBoundingClientRect();
  const toRange = el => {
    const rect = el.getBoundingClientRect();
    return {
      top: Math.max(0, (rect.top - rootRect.top) * scale),
      bottom: Math.max(0, (rect.bottom - rootRect.top) * scale)
    };
  };

  const keeps = Array.from(root.querySelectorAll("[data-pdf-keep-together='true']"))
    .map(toRange)
    .filter(range => range.bottom > range.top + 1)
    .sort((a, b) => a.top - b.top);

  const footerEl =
    root.querySelector("[data-pdf-footer='true']") ||
    root.querySelector("footer");
  const footer = footerEl ? toRange(footerEl) : null;

  return { keeps, footer };
}

/**
 * Fin de bande sans couper un bloc keep-together (cartes tâches, etc.).
 */
function findSliceEnd(startY, pageHeightPx, limitY, keeps = []) {
  const hardEnd = Math.min(startY + pageHeightPx, limitY);
  if (hardEnd <= startY) return startY;

  let end = hardEnd;
  for (const keep of keeps) {
    if (keep.bottom <= startY + 1 || keep.top >= hardEnd - 1) continue;
    // La bande coupe ce bloc.
    if (keep.top >= startY + MIN_PAGE_CONTENT_PX) {
      // Assez de contenu avant : on termine avant la carte.
      end = Math.min(end, keep.top);
      continue;
    }
    // La carte a déjà commencé sur cette page.
    if (keep.bottom - startY <= pageHeightPx + 0.5) {
      // Elle tient entière → on l’inclut.
      end = Math.max(end, Math.min(keep.bottom, limitY));
    }
    // Sinon carte plus haute qu’une page : coupe dure (cas rare).
  }
  return Math.max(startY + 1, Math.min(end, limitY));
}

function composePageWithFooterAtBottom(source, {
  contentStart,
  contentEnd,
  footerStart,
  footerEnd,
  pageHeightPx,
  quality
}) {
  const width = source.width;
  const page = document.createElement("canvas");
  page.width = width;
  page.height = Math.max(1, Math.floor(pageHeightPx));
  const ctx = page.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, page.width, page.height);

  const contentH = Math.max(0, contentEnd - contentStart);
  if (contentH > 0.5) {
    ctx.drawImage(
      source,
      0,
      contentStart,
      width,
      contentH,
      0,
      0,
      width,
      contentH
    );
  }

  const footerH = Math.max(0, footerEnd - footerStart);
  if (footerH > 0.5) {
    const destY = Math.max(0, page.height - footerH);
    ctx.drawImage(
      source,
      0,
      footerStart,
      width,
      footerH,
      0,
      destY,
      width,
      footerH
    );
  }

  return page.toDataURL("image/jpeg", quality);
}

/**
 * Découpe le canvas en pages JPEG.
 * - Respecte data-pdf-keep-together (pas de cartes coupées).
 * - Place le footer (data-pdf-footer) en bas de la dernière page.
 */
function canvasToPdf(
  sourceCanvas,
  {
    asBlob,
    fileName,
    orientation = "portrait",
    jpegQuality = DEFAULT_JPEG_QUALITY,
    layout = null
  } = {}
) {
  const canvas = trimCanvasBottom(sourceCanvas);
  const pdf = new jsPDF({
    orientation: orientation === "landscape" ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const pageHeightPx = (pageHeight / imgWidth) * canvas.width;
  const quality = Math.min(0.95, Math.max(0.5, Number(jpegQuality) || DEFAULT_JPEG_QUALITY));
  const keeps = Array.isArray(layout?.keeps) ? layout.keeps : [];
  const footer = layout?.footer && layout.footer.bottom > layout.footer.top
    ? {
        top: Math.min(layout.footer.top, canvas.height),
        bottom: Math.min(layout.footer.bottom, canvas.height)
      }
    : null;
  const contentLimit = footer ? Math.max(0, footer.top) : canvas.height;

  let sourceY = 0;
  let pageIndex = 0;

  const addJpegPage = (imgData, heightMm) => {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, heightMm, undefined, "FAST");
    pageIndex += 1;
  };

  while (sourceY < canvas.height - 1 && pageIndex < 80) {
    // Page footer seule (contenu déjà paginé).
    if (footer && sourceY >= contentLimit - 0.5) {
      const footerH = footer.bottom - footer.top;
      if (footerH <= 1) break;
      const imgData = composePageWithFooterAtBottom(canvas, {
        contentStart: sourceY,
        contentEnd: sourceY,
        footerStart: footer.top,
        footerEnd: footer.bottom,
        pageHeightPx,
        quality
      });
      addJpegPage(imgData, pageHeight);
      break;
    }

    const remainingContent = contentLimit - sourceY;
    const footerH = footer ? footer.bottom - footer.top : 0;

    // Dernière page : contenu restant + footer collé en bas.
    if (footer && remainingContent + footerH <= pageHeightPx + 0.5) {
      const imgData = composePageWithFooterAtBottom(canvas, {
        contentStart: sourceY,
        contentEnd: contentLimit,
        footerStart: footer.top,
        footerEnd: footer.bottom,
        pageHeightPx,
        quality
      });
      addJpegPage(imgData, pageHeight);
      break;
    }

    const sliceEnd = findSliceEnd(
      sourceY,
      pageHeightPx,
      footer ? contentLimit : canvas.height,
      keeps
    );
    const sliceHeightPx = Math.max(1, sliceEnd - sourceY);
    const sliceHeightMm = (sliceHeightPx * imgWidth) / canvas.width;
    if (pageIndex > 0 && sliceHeightMm <= BLANK_PAGE_SLACK_MM) break;

    const imgData = canvasSliceToJpeg(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeightPx,
      quality
    );
    addJpegPage(imgData, sliceHeightMm);
    sourceY = sliceEnd;

    if (!footer && sourceY >= canvas.height - 1) break;
  }

  if (asBlob) return pdf.output("blob");
  pdf.save(fileName);
  return null;
}

/**
 * Capture simple de la preview brandée → PDF A4 (même mise en page).
 * @param {{
 *   asBlob?: boolean,
 *   fileName?: string,
 *   orientation?: "portrait"|"landscape",
 *   scale?: number,
 *   jpegQuality?: number
 * }} [options]
 */
export async function exportBrandedReportPdfFromElement(
  sourceEl,
  {
    asBlob = false,
    fileName = "rapport.pdf",
    orientation = "portrait",
    scale = DEFAULT_CAPTURE_SCALE,
    jpegQuality = DEFAULT_JPEG_QUALITY
  } = {}
) {
  if (!sourceEl || typeof document === "undefined") {
    throw new Error("Preview element missing");
  }
  const captureWidth =
    orientation === "landscape" ? PDF_CAPTURE_WIDTH_LANDSCAPE : PDF_CAPTURE_WIDTH_PORTRAIT;
  const captureScale = Math.min(2, Math.max(1, Number(scale) || DEFAULT_CAPTURE_SCALE));
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
    `width:${captureWidth}px`,
    "background:#ffffff",
    "color:#0f172a",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
    "overflow:visible"
  ].join(";");

  const clone = sourceEl.cloneNode(true);
  prepareCloneForPdf(clone, captureWidth);
  clone.style.width = `${captureWidth}px`;
  clone.style.maxWidth = `${captureWidth}px`;
  await inlineImagesAsDataUrls(clone);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);

  try {
    await waitForImages(wrap);
    await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

    const layout = measureLayoutRanges(clone, captureScale);

    const canvas = await html2canvas(clone, {
      scale: captureScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: captureWidth,
      windowWidth: captureWidth,
      onclone: (_doc, el) => {
        el.style.width = `${captureWidth}px`;
        el.style.maxWidth = `${captureWidth}px`;
        el.style.opacity = "1";
        prepareCloneForPdf(el, captureWidth);
      }
    });
    return canvasToPdf(canvas, { asBlob, fileName, orientation, jpegQuality, layout });
  } finally {
    wrap.remove();
  }
}
