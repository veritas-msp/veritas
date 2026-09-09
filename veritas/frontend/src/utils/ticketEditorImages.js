/**
 * Helpers for ticket reply editors: clipboard paste images → File attachments,
 * and stripping leftover base64 <img> from HTML before submit.
 */

function extensionFromMime(mime) {
  const type = String(mime || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("bmp")) return "bmp";
  return "png";
}

export function dataUrlToFile(dataUrl, filenameHint = "pasted-image") {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const mime = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = extensionFromMime(mime);
  const base = String(filenameHint || "pasted-image").replace(/\.[a-z0-9]+$/i, "");
  return new File([bytes], `${base}.${ext}`, { type: mime });
}

/** Image files present on the clipboard (browser paste of screenshots / files). */
export function extractClipboardImageFiles(clipboardData) {
  const items = Array.from(clipboardData?.items || []);
  const files = [];
  items.forEach((item, index) => {
    if (item?.kind !== "file") return;
    if (!String(item.type || "").startsWith("image/")) return;
    const file = item.getAsFile();
    if (!file) return;
    const hasName = Boolean(file.name && file.name.trim());
    if (hasName) {
      files.push(file);
      return;
    }
    const ext = extensionFromMime(file.type);
    files.push(new File([file], `pasted-image-${index + 1}.${ext}`, { type: file.type || "image/png" }));
  });
  return files;
}

/**
 * Remove inline data:image <img> tags from HTML and return File objects instead.
 * Keeps non-data images (http/https) untouched.
 */
export function extractInlineDataImagesFromHtml(html) {
  const source = String(html || "");
  if (!source || !/data:image\//i.test(source)) {
    return { html: source, files: [] };
  }
  const files = [];
  let index = 0;
  const cleaned = source.replace(/<img\b[^>]*>/gi, tag => {
    const srcMatch = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i) || tag.match(/\bsrc\s*=\s*([^\s>]+)/i);
    const src = srcMatch ? String(srcMatch[2] || srcMatch[1] || "").trim() : "";
    if (!/^data:image\//i.test(src)) return tag;
    index += 1;
    try {
      files.push(dataUrlToFile(src, `pasted-image-${index}`));
    } catch {
      // Drop broken data URLs from the draft.
    }
    return "";
  });
  return { html: cleaned, files };
}

export function htmlContainsInlineImage(html) {
  return /<img\b/i.test(String(html || "")) || /data:image\//i.test(String(html || ""));
}
