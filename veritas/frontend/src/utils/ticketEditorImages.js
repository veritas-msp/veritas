/**
 * Helpers for ticket reply editors: clipboard paste images → File attachments,
 * keeping inline <img> positions via placeholders rewritten to uploaded URLs.
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

function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readAttr(tag, name) {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  if (quoted) return String(quoted[2] || "").trim();
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? String(bare[1] || "").trim() : "";
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
 * Convert inline data:image <img> tags into File attachments while keeping
 * positional placeholders (data-inline-upload) so the server can rewrite src URLs.
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
    const src = readAttr(tag, "src");
    if (!/^data:image\//i.test(src)) return tag;
    index += 1;
    try {
      const file = dataUrlToFile(src, `pasted-image-${index}`);
      files.push(file);
      const alt = readAttr(tag, "alt") || file.name;
      return `<img src="" alt="${escapeHtmlAttr(alt)}" data-inline-upload="${escapeHtmlAttr(file.name)}">`;
    } catch {
      // Drop broken data URLs from the draft.
      return "";
    }
  });
  return { html: cleaned, files };
}

/**
 * Replace data-inline-upload placeholders with uploaded attachment URLs.
 * Matching is by file name (pasted-image-N.ext).
 */
export function rewriteInlineUploadPlaceholders(html, attachments = []) {
  const source = String(html || "");
  if (!source || !/data-inline-upload=/i.test(source)) return source;
  const byName = new Map();
  (Array.isArray(attachments) ? attachments : []).forEach(attachment => {
    const name = String(attachment?.filename || attachment?.name || attachment?.file_name || "").trim().toLowerCase();
    const url = String(attachment?.url || attachment?.path || attachment?.file_path || "").trim();
    if (name && url) byName.set(name, url);
  });
  if (byName.size === 0) return source;
  return source.replace(/<img\b[^>]*>/gi, tag => {
    const key = readAttr(tag, "data-inline-upload");
    if (!key) return tag;
    const url = byName.get(key.toLowerCase());
    if (!url) return tag;
    const alt = readAttr(tag, "alt") || key;
    return `<img src="${escapeHtmlAttr(url)}" alt="${escapeHtmlAttr(alt)}">`;
  });
}

/** Hide attachment-bar previews for images already rendered inline in the HTML body. */
export function filterAttachmentsNotInlinedInHtml(attachments = [], html = "") {
  const source = String(html || "");
  const list = Array.isArray(attachments) ? attachments : [];
  if (!source || list.length === 0) return list;
  return list.filter(attachment => {
    const url = String(attachment?.url || attachment?.path || attachment?.file_path || "").trim();
    if (!url) return true;
    if (source.includes(url)) return false;
    const uploadsIndex = url.toLowerCase().indexOf("/uploads/");
    if (uploadsIndex >= 0 && source.includes(url.slice(uploadsIndex))) return false;
    return true;
  });
}

export function htmlContainsInlineImage(html) {
  return /<img\b/i.test(String(html || "")) || /data:image\//i.test(String(html || ""));
}
