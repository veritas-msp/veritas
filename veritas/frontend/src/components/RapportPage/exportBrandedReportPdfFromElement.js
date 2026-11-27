import { jsPDF } from "jspdf";

const PDF_CAPTURE_WIDTH_PORTRAIT = 794;
const PDF_CAPTURE_WIDTH_LANDSCAPE = 1123;
/** Seuil (mm) sous lequel on n'ajoute pas de page quasi vide. */
const BLANK_PAGE_SLACK_MM = 3;
/** Échelle html2canvas : 1.5 ≈ 144 dpi sur A4 — lisible sans canvas monstrueux. */
const DEFAULT_CAPTURE_SCALE = 1.5;
/** JPEG : quasi imperceptible sur UI/texte, bien plus léger que PNG. */
const DEFAULT_JPEG_QUALITY = 0.86;

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

/**
 * Découpe le canvas en bandes = 1 page PDF, JPEG compressé.
 * Évite d’embarquer une unique image PNG géante (cause des PDF à 100+ Mo).
 */
function canvasToPdf(
  sourceCanvas,
  {
    asBlob,
    fileName,
    orientation = "portrait",
    jpegQuality = DEFAULT_JPEG_QUALITY
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
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageHeightPx = (pageHeight / imgWidth) * canvas.width;
  const quality = Math.min(0.95, Math.max(0.5, Number(jpegQuality) || DEFAULT_JPEG_QUALITY));

  let heightLeft = imgHeight;
  let sourceY = 0;
  let pageIndex = 0;

  while (heightLeft > BLANK_PAGE_SLACK_MM || pageIndex === 0) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);
    if (sliceHeightPx <= 0) break;
    const sliceHeightMm = (sliceHeightPx * imgWidth) / canvas.width;
    if (pageIndex > 0 && sliceHeightMm <= BLANK_PAGE_SLACK_MM) break;

    let imgData;
    try {
      imgData = canvasSliceToJpeg(canvas, 0, sourceY, canvas.width, sliceHeightPx, quality);
    } catch (err) {
      throw new Error(
        err?.message
          ? `Export PDF bloqué (image): ${err.message}`
          : "Export PDF bloqué (canvas sécurisé)"
      );
    }

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, sliceHeightMm, undefined, "FAST");

    sourceY += sliceHeightPx;
    heightLeft -= sliceHeightMm;
    pageIndex += 1;

    // Garde-fou : une capture aberrante ne doit pas boucler.
    if (pageIndex > 80) break;
  }

  if (asBlob) return pdf.output("blob");
  pdf.save(fileName);
  return null;
}

/** 2× et JPEG 0.82 : texte plus net, poids tenu parce que chaque page est une image à part. */
const TASK_PDF_SCALE = 2;
const TASK_PDF_JPEG_QUALITY = 0.82;

function a4HeightPx(widthPx) {
  return Math.round((widthPx * 297) / 210);
}

function parsedPx(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.ceil(n) : fallback;
}

function svgMarkupToPng(markup, width, height, ratio) {
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 1500);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width * ratio);
        canvas.height = Math.max(1, height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/png"));
      } catch {
        finish(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

/**
 * html2canvas ne peint pas les SVG Iconify (currentColor / masque CSS) :
 * on les remplace par des PNG, et on retire les pastilles vides si l'icône manque.
 */
async function materializeSocialIcons(root) {
  const hosts = Array.from(root.querySelectorAll("[data-social-icon]"));
  const rows = Array.from(root.querySelectorAll("[data-social-row]"));
  if (!hosts.length) {
    rows.forEach(row => row.remove());
    return;
  }
  let iconify = null;
  try {
    iconify = await import("@iconify/react");
  } catch {
    iconify = null;
  }
  const names = [...new Set(hosts.map(el => el.getAttribute("data-social-icon")).filter(Boolean))];
  if (iconify && names.length) {
    await Promise.race([
      new Promise(resolve => {
        try {
          iconify.loadIcons(names, () => resolve());
        } catch {
          resolve();
        }
      }),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  }

  await Promise.all(hosts.map(async host => {
    const display = host.getAttribute("data-social-display") || "icons";
    if (display === "links") return;
    const iconNode = [...host.children].find(el => {
      if (el.tagName === "SVG") return true;
      return el.tagName === "SPAN" && !(el.textContent || "").trim();
    });
    const dropHost = () => {
      iconNode?.remove();
      if (display !== "both" || !(host.textContent || "").trim()) host.remove();
    };
    try {
      const name = host.getAttribute("data-social-icon");
      const data = name && iconify?.getIcon ? iconify.getIcon(name) : null;
      if (!data || !iconify?.buildIcon) {
        dropHost();
        return;
      }
      const built = iconify.buildIcon(data, { width: 18, height: 18 });
      const color = getComputedStyle(host).color || "#115e59";
      const viewBox = built?.attributes?.viewBox || "0 0 24 24";
      const body = String(built?.body || "").replace(/currentColor/gi, color);
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="${viewBox}" fill="${color}">${body}</svg>`;
      const png = await svgMarkupToPng(markup, 18, 18, 4);
      if (!png) {
        dropHost();
        return;
      }
      const img = document.createElement("img");
      img.src = png;
      img.alt = "";
      img.width = 18;
      img.height = 18;
      img.style.cssText = "width:18px;height:18px;display:block;";
      if (iconNode) iconNode.replaceWith(img);
      else host.prepend(img);
    } catch {
      dropHost();
    }
  }));

  rows.forEach(row => {
    if (!row.querySelector("[data-social-icon]")) row.remove();
  });
}

function flowedHeight(page) {
  let total = 0;
  for (const child of page.children) {
    if (child.getAttribute("data-pdf-spacer") === "true") continue;
    if (child.tagName === "FOOTER") continue;
    total += child.offsetHeight;
  }
  return total;
}

function placeFooterAtBottom(page, footer, pageH) {
  let spacer = page.querySelector("[data-pdf-spacer]");
  if (!spacer) {
    spacer = document.createElement("div");
    spacer.setAttribute("data-pdf-spacer", "true");
    page.appendChild(spacer);
  }
  spacer.style.cssText = "width:100%;margin:0;padding:0;background:#ffffff;";
  footer.style.margin = "0";
  footer.style.width = "100%";
  footer.style.boxSizing = "border-box";
  if (footer.parentElement !== page) page.appendChild(footer);
  const used = flowedHeight(page);
  const footerHeight = footer.offsetHeight;
  let spacerH = Math.max(0, pageH - used - footerHeight);
  spacer.style.height = `${spacerH}px`;
  const stacked = [...page.children].reduce((sum, child) => sum + child.offsetHeight, 0);
  const drift = pageH - stacked;
  if (drift !== 0 && spacerH + drift >= 0) {
    spacerH += drift;
    spacer.style.height = `${spacerH}px`;
  }
}

/**
 * PDF des tâches de prestation :
 * page 1 = en-tête + KPI seulement, puis des pages de cartes entières,
 * pied de page collé en bas de la dernière page.
 */
export async function exportTaskReportPdfFromElement(
  sourceEl,
  {
    asBlob = false,
    fileName = "rapport-taches.pdf",
    scale = TASK_PDF_SCALE,
    jpegQuality = TASK_PDF_JPEG_QUALITY
  } = {}
) {
  if (!sourceEl || typeof document === "undefined") {
    throw new Error("Preview element missing");
  }
  const pageW = PDF_CAPTURE_WIDTH_PORTRAIT;
  const pageH = a4HeightPx(pageW);
  const captureScale = Math.min(2, Math.max(1, Number(scale) || TASK_PDF_SCALE));
  const quality = Math.min(0.95, Math.max(0.5, Number(jpegQuality) || TASK_PDF_JPEG_QUALITY));

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

  const wrap = document.createElement("div");
  wrap.setAttribute("data-report-pdf-capture", "true");
  wrap.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${pageW}px`,
    "background:#ffffff",
    "color:#0f172a",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
    "overflow:visible"
  ].join(";");

  const clone = sourceEl.cloneNode(true);
  prepareCloneForPdf(clone, pageW);
  await inlineImagesAsDataUrls(clone);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);

  try {
    await materializeSocialIcons(clone);
    await waitForImages(wrap);
    await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

    const makePage = () => {
      const page = document.createElement("div");
      page.setAttribute("data-pdf-page", "true");
      const sourceStyle = clone.getAttribute("style");
      if (sourceStyle) page.setAttribute("style", sourceStyle);
      const fontFamily = getComputedStyle(clone).fontFamily;
      page.style.boxSizing = "border-box";
      page.style.width = `${pageW}px`;
      page.style.height = `${pageH}px`;
      page.style.maxWidth = `${pageW}px`;
      page.style.margin = "0";
      page.style.padding = "0";
      page.style.border = "none";
      page.style.borderRadius = "0";
      page.style.boxShadow = "none";
      page.style.overflow = "visible";
      page.style.background = "#ffffff";
      page.style.color = "#0f172a";
      page.style.position = "relative";
      page.style.opacity = "1";
      if (fontFamily) page.style.fontFamily = fontFamily;
      wrap.appendChild(page);
      return page;
    };

    const header = clone.querySelector(":scope > header");
    const footer = clone.querySelector(":scope > footer");
    const body = clone.querySelector(':scope > [class*="body"]');
    const list = clone.querySelector("[data-task-list]");
    const cards = list ? [...list.querySelectorAll("[data-task-card]")] : [];
    const listCs = list ? getComputedStyle(list) : null;
    const gapPx = listCs ? parsedPx(listCs.rowGap, parsedPx(listCs.gap, 12)) : 12;
    const bodyCs = body ? getComputedStyle(body) : null;
    const taskPad = bodyCs
      ? `${parsedPx(bodyCs.paddingTop, 18)}px ${parsedPx(bodyCs.paddingRight, 20)}px ${parsedPx(bodyCs.paddingBottom, 22)}px ${parsedPx(bodyCs.paddingLeft, 20)}px`
      : "18px 20px 22px";
    const footerH = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    const footerReserve = footer ? footerH + 2 : 0;
    if (list) list.remove();

    const coverBlocks = body ? [...body.children] : [];
    const bodyClassName = body ? body.className : "";

    const coverPages = [];
    const openCoverPage = withHeader => {
      const page = makePage();
      const inner = document.createElement("div");
      inner.className = bodyClassName;
      inner.style.background = "#ffffff";
      inner.style.color = "#0f172a";
      inner.style.margin = "0";
      inner.style.boxSizing = "border-box";
      inner.style.overflow = "visible";
      page.appendChild(inner);
      if (withHeader && header) page.insertBefore(header, inner);
      const entry = { page, inner };
      coverPages.push(entry);
      return entry;
    };

    let cover = openCoverPage(true);
    const splitAssignees = (entry, section) => {
      const assigneeList = section.querySelector("[data-pdf-assignees]");
      if (!assigneeList) return entry;
      const items = [...assigneeList.children];
      if (items.length < 2) return entry;
      items.forEach(item => item.remove());
      if (flowedHeight(entry.page) > pageH) {
        items.forEach(item => assigneeList.appendChild(item));
        return entry;
      }
      let current = entry;
      let currentList = assigneeList;
      for (const item of items) {
        currentList.appendChild(item);
        if (flowedHeight(current.page) <= pageH) continue;
        currentList.removeChild(item);
        const pageKeepsContent = currentList.childElementCount > 0 || current.page.contains(header) || current.inner.childElementCount > 1;
        if (!pageKeepsContent) {
          currentList.appendChild(item);
          continue;
        }
        if (!currentList.childElementCount) {
          currentList.remove();
          const heading = [...section.children].find(el => el.tagName === "H3");
          heading?.remove();
        }
        current = openCoverPage(false);
        const shell = section.cloneNode(false);
        shell.style.marginTop = "0";
        const nextList = assigneeList.cloneNode(false);
        shell.appendChild(nextList);
        current.inner.appendChild(shell);
        nextList.appendChild(item);
        currentList = nextList;
      }
      if (assigneeList.isConnected && !assigneeList.children.length) {
        assigneeList.remove();
        const heading = [...section.children].find(el => el.tagName === "H3");
        heading?.remove();
      }
      return current;
    };

    coverBlocks.forEach(block => {
      cover.inner.appendChild(block);
      const pieces = (cover.page.contains(header) ? 1 : 0) + cover.inner.childElementCount;
      if (flowedHeight(cover.page) > pageH && pieces > 1) {
        cover.inner.removeChild(block);
        cover = openCoverPage(false);
        cover.inner.appendChild(block);
      }
      if (block.getAttribute("data-pdf-stats") === "true" && flowedHeight(cover.page) > pageH) {
        cover = splitAssignees(cover, block);
      }
    });

    const taskPages = [];
    const openTaskPage = () => {
      const page = makePage();
      const content = document.createElement("div");
      content.style.cssText = `box-sizing:border-box;width:100%;margin:0;padding:${taskPad};background:#ffffff;color:#0f172a;`;
      page.appendChild(content);
      const entry = { page, content };
      taskPages.push(entry);
      return entry;
    };
    const placeCard = (content, card) => {
      card.style.boxSizing = "border-box";
      card.style.width = "100%";
      card.style.maxWidth = "100%";
      card.style.margin = content.childElementCount ? `${gapPx}px 0 0` : "0";
      content.appendChild(card);
    };

    let task = null;
    cards.forEach(card => {
      if (!task) task = openTaskPage();
      placeCard(task.content, card);
      if (task.content.offsetHeight > pageH && task.content.childElementCount > 1) {
        task.content.removeChild(card);
        task = openTaskPage();
        placeCard(task.content, card);
      }
    });

    if (footer) {
      if (!cards.length) {
        const lastCover = coverPages[coverPages.length - 1];
        if (lastCover && flowedHeight(lastCover.page) + footerReserve <= pageH) {
          placeFooterAtBottom(lastCover.page, footer, pageH);
        } else {
          const footerPage = makePage();
          placeFooterAtBottom(footerPage, footer, pageH);
        }
      } else {
        let footerPlaced = false;
        let guard = 0;
        while (taskPages.length && guard++ < cards.length + 3) {
          const last = taskPages[taskPages.length - 1];
          if (last.content.offsetHeight + footerReserve <= pageH) {
            placeFooterAtBottom(last.page, footer, pageH);
            footerPlaced = true;
            break;
          }
          if (last.content.childElementCount <= 1) {
            const footerPage = makePage();
            placeFooterAtBottom(footerPage, footer, pageH);
            footerPlaced = true;
            break;
          }
          const moved = last.content.lastElementChild;
          moved.remove();
          task = openTaskPage();
          placeCard(task.content, moved);
        }
        if (!footerPlaced && taskPages.length) {
          placeFooterAtBottom(taskPages[taskPages.length - 1].page, footer, pageH);
        }
      }
    }

    clone.remove();
    const pageNodes = [...wrap.querySelectorAll("[data-pdf-page]")];
    if (!pageNodes.length) throw new Error("Export PDF bloqué (mise en page)");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageNodes.length; i += 1) {
      pageNodes.forEach((node, index) => {
        const active = index === i;
        node.style.display = active ? "block" : "none";
        if (active) {
          node.style.overflow = "hidden";
          node.style.height = `${pageH}px`;
        }
      });
      const canvas = await html2canvas(pageNodes[i], {
        scale: captureScale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: pageW,
        height: pageH,
        windowWidth: pageW,
        windowHeight: pageH,
        scrollX: 0,
        scrollY: 0,
        onclone: (_doc, el) => {
          el.style.opacity = "1";
          el.style.width = `${pageW}px`;
          el.style.height = `${pageH}px`;
          el.style.maxWidth = `${pageW}px`;
          el.style.overflow = "hidden";
          el.style.background = "#ffffff";
          prepareCloneForPdf(el, pageW);
        }
      });
      let imgData;
      try {
        imgData = canvas.toDataURL("image/jpeg", quality);
      } catch (err) {
        throw new Error(
          err?.message
            ? `Export PDF bloqué (image): ${err.message}`
            : "Export PDF bloqué (canvas sécurisé)"
        );
      }
      canvas.width = 0;
      canvas.height = 0;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "MEDIUM");
    }

    if (asBlob) return pdf.output("blob");
    pdf.save(fileName);
    return null;
  } finally {
    wrap.remove();
  }
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
    // Laisser le layout se stabiliser à largeur A4.
    await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

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
    return canvasToPdf(canvas, { asBlob, fileName, orientation, jpegQuality });
  } finally {
    wrap.remove();
  }
}
