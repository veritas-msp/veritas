const SKIP_MIME_TYPES = new Set([
  "application/pkcs7-signature",
  "application/x-pkcs7-signature",
  "application/pkcs7-mime",
  "application/x-pkcs7-mime",
  "application/ms-tnef",
  "application/vnd.ms-tnef"
]);
const BODY_TEXT_TYPES = new Set(["text/plain", "text/html"]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
  ".doc", ".docx", ".csv", ".xls", ".xlsx", ".txt", ".rtf", ".ics",
  ".mp4", ".3gp", ".mp3", ".mpeg", ".ogg", ".aac", ".amr", ".m4a"
]);
const MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/csv": ".csv",
  "text/plain": ".txt",
  "text/calendar": ".ics",
  "application/rtf": ".rtf",
  "text/rtf": ".rtf",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "video/mp4": ".mp4",
  "video/3gpp": ".3gp",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "audio/amr": ".amr",
  "audio/ogg": ".ogg"
};

function normalizeCharset(charset) {
  const raw = String(charset || "utf-8").trim().toLowerCase().replace(/^["']|["']$/g, "");
  const compact = raw.replace(/[_\s-]/g, "");
  if (!compact || compact === "utf8" || compact === "unicode11utf8" || compact === "unicode") return "utf-8";
  if (["iso88591", "latin1", "latin", "l1", "usascii", "ascii"].includes(compact)) return "iso-8859-1";
  if (["windows1252", "cp1252", "winlatin1", "ansi"].includes(compact)) return "windows-1252";
  return raw;
}

function decodeBytes(buffer, charset) {
  const normalized = normalizeCharset(charset);
  try {
    return new TextDecoder(normalized, { fatal: false }).decode(buffer);
  } catch {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    } catch {
      return Buffer.from(buffer).toString("utf8");
    }
  }
}

function countReplacementChars(text) {
  let count = 0;
  for (const ch of String(text || "")) {
    if (ch === "\uFFFD") count += 1;
  }
  return count;
}

function decodeWithCharsetFallback(buffer, charset) {
  let text = decodeBytes(buffer, charset);
  const primary = normalizeCharset(charset);
  if (primary === "utf-8" && countReplacementChars(text) > 0) {
    for (const fallback of ["windows-1252", "iso-8859-1"]) {
      const candidate = decodeBytes(buffer, fallback);
      if (countReplacementChars(candidate) < countReplacementChars(text)) text = candidate;
    }
  }
  return text;
}

function extractCharset(headers) {
  const match = String(headers || "").match(/charset\s*=\s*["']?([^"'\s;]+)/i);
  return normalizeCharset(match?.[1] || "utf-8");
}

export function decodeQuotedPrintableToBuffer(value) {
  const softUnwrapped = String(value || "").replace(/=\n/g, "");
  const bytes = [];
  for (let i = 0; i < softUnwrapped.length; i += 1) {
    const ch = softUnwrapped[i];
    if (ch === "=" && i + 2 < softUnwrapped.length && /^[0-9A-Fa-f]{2}$/.test(softUnwrapped.slice(i + 1, i + 3))) {
      bytes.push(parseInt(softUnwrapped.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    bytes.push(softUnwrapped.charCodeAt(i) & 0xff);
  }
  return Buffer.from(bytes);
}

function decodePartBuffer(headers, bodyLatin1) {
  const headersLower = String(headers || "").toLowerCase();
  const body = String(bodyLatin1 || "");
  if (/content-transfer-encoding:\s*base64/i.test(headersLower) || /(?:^|\n)content-transfer-encoding:\s*base64/i.test(headersLower)) {
    const cleaned = body.replace(/[^A-Za-z0-9+/=]/g, "");
    try {
      return Buffer.from(cleaned, "base64");
    } catch {
      return Buffer.from(body, "latin1");
    }
  }
  if (/content-transfer-encoding:\s*quoted-printable/i.test(headersLower)) {
    return decodeQuotedPrintableToBuffer(body);
  }
  return Buffer.from(body, "latin1");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&agrave;/gi, "à")
    .replace(/&aacute;/gi, "á")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&ucirc;/gi, "û")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&iuml;/gi, "ï")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&euro;/gi, "€")
    .replace(/&#(\d+);/g, (_m, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function htmlToText(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6|table|blockquote)>/gi, "\n")
      .replace(/<(p|div|li|tr|h1|h2|h3|h4|h5|h6|blockquote)(?:\s[^>]*)?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function unfoldHeaders(raw) {
  return String(raw || "").replace(/\n[ \t]+/g, " ");
}

function parseHeaderMap(headersRaw) {
  const map = {};
  for (const line of unfoldHeaders(headersRaw).split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    map[key] = map[key] ? `${map[key]} ${value}` : value;
  }
  return map;
}

function headerParam(headerValue, paramName) {
  const re = new RegExp(`${paramName}\\s*=\\s*("([^"]*)"|([^;\\s]+))`, "i");
  const match = String(headerValue || "").match(re);
  return String(match?.[2] ?? match?.[3] ?? "").trim();
}

function splitHeadersAndBody(raw) {
  const text = String(raw || "").replace(/^\n+/, "");
  const idx = text.indexOf("\n\n");
  if (idx < 0) {
    return { headers: text, body: "" };
  }
  return {
    headers: text.slice(0, idx),
    body: text.slice(idx + 2)
  };
}

function splitMultipartBody(body, boundary) {
  const token = String(boundary || "").trim();
  if (!token) return [];
  const delim = `\n--${token}`;
  const work = `\n${body}`;
  const closeIdx = work.indexOf(`${delim}--`);
  const sliced = closeIdx >= 0 ? work.slice(0, closeIdx) : work;
  return sliced
    .split(delim)
    .slice(1)
    .map(part => part.replace(/^\n/, ""))
    .filter(part => part.trim());
}

function decodeMimeWords(value) {
  return String(value || "").replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_m, charset, encoding, data) => {
    try {
      const buf = String(encoding).toLowerCase() === "b"
        ? Buffer.from(String(data).replace(/\s+/g, ""), "base64")
        : decodeQuotedPrintableToBuffer(String(data).replace(/_/g, " "));
      return decodeWithCharsetFallback(buf, charset);
    } catch {
      return data;
    }
  });
}

function decodeRfc2231(value) {
  const match = String(value || "").match(/^([^']*)''(.+)$/);
  if (!match) return decodeMimeWords(value);
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

function partFilename(headerMap, mimeType) {
  const disposition = headerMap["content-disposition"] || "";
  const contentType = headerMap["content-type"] || "";
  const encodedName = headerParam(disposition, "filename*") || headerParam(contentType, "name*");
  if (encodedName) return decodeRfc2231(encodedName);
  const plainName = headerParam(disposition, "filename") || headerParam(contentType, "name");
  return decodeMimeWords(plainName);
}

export function normalizeCid(value) {
  return String(value || "")
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/^cid:/i, "")
    .trim()
    .toLowerCase();
}

function headerLooksLike(headers, field, value) {
  const raw = String(headers?.[field] || "").toLowerCase();
  return raw.includes(String(value).toLowerCase());
}

function walkMimeParts(headersRaw, bodyLatin1) {
  const headerMap = parseHeaderMap(headersRaw);
  const contentTypeRaw = headerMap["content-type"] || "text/plain";
  const mimeType = contentTypeRaw.split(";")[0].trim().toLowerCase() || "text/plain";
  if (mimeType.startsWith("multipart/")) {
    const boundary = headerParam(contentTypeRaw, "boundary");
    return splitMultipartBody(bodyLatin1, boundary).flatMap(partRaw => {
      const { headers, body } = splitHeadersAndBody(partRaw);
      return walkMimeParts(headers, body);
    });
  }
  return [{
    headerMap,
    mimeType,
    headersRaw,
    bodyLatin1
  }];
}

function isSkippedMime(mimeType) {
  return SKIP_MIME_TYPES.has(String(mimeType || "").split(";")[0].trim().toLowerCase());
}

function inferExtension(mimeType, filename) {
  const ext = String(filename || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  if (ext && ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) return ext;
  const mime = String(mimeType || "").split(";")[0].trim().toLowerCase();
  return MIME_EXTENSION_MAP[mime] || "";
}

export function isAllowedMailAttachment(mimeType, filename) {
  if (isSkippedMime(mimeType)) return false;
  if (String(mimeType || "").toLowerCase().startsWith("image/")) return true;
  return Boolean(inferExtension(mimeType, filename));
}

export function rewriteCidReferences(html, cidMap) {
  if (!html || !cidMap || cidMap.size === 0) return String(html || "");
  const resolve = rawCid => {
    const decoded = (() => {
      try {
        return decodeURIComponent(String(rawCid || "").trim());
      } catch {
        return String(rawCid || "").trim();
      }
    })();
    const key = normalizeCid(decoded);
    if (!key) return "";
    return cidMap.get(key) || cidMap.get(key.split("@")[0]) || "";
  };
  return String(html)
    .replace(/((?:src|href)\s*=\s*)(["']?)cid:([^"'\s>]+)\2/gi, (full, attr, quote, cid) => {
      const url = resolve(cid);
      if (!url) return full;
      const q = quote || '"';
      return `${attr}${q}${url}${q}`;
    })
    .replace(/url\(\s*(['"]?)cid:([^)'"]+)\1\s*\)/gi, (full, quote, cid) => {
      const url = resolve(cid);
      if (!url) return full;
      return `url(${quote}${url}${quote})`;
    });
}

export function registerCidMapping(cidMap, contentId, url) {
  const key = normalizeCid(contentId);
  if (!key || !url) return;
  cidMap.set(key, url);
  const local = key.split("@")[0];
  if (local && local !== key && !cidMap.has(local)) cidMap.set(local, url);
}

export function extractEmailContentFromRfc822(sourceValue) {
  const rawBuffer = Buffer.isBuffer(sourceValue) ? sourceValue : Buffer.from(String(sourceValue || ""), "utf8");
  const normalizedRaw = rawBuffer.toString("latin1").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const { headers, body } = splitHeadersAndBody(normalizedRaw);
  const leaves = walkMimeParts(headers, body);
  let plainPart = "";
  let htmlPart = "";
  const attachments = [];
  for (const leaf of leaves) {
    const mimeType = String(leaf.mimeType || "application/octet-stream").split(";")[0].trim().toLowerCase();
    if (mimeType.startsWith("multipart/") || mimeType === "message/rfc822") continue;
    const disposition = String(leaf.headerMap["content-disposition"] || "").toLowerCase();
    const isAttachment = disposition.includes("attachment");
    const contentId = String(leaf.headerMap["content-id"] || "").trim();
    const filename = partFilename(leaf.headerMap, mimeType);
    const buffer = decodePartBuffer(
      Object.entries(leaf.headerMap).map(([key, value]) => `${key}: ${value}`).join("\n"),
      leaf.bodyLatin1
    );
    const treatAsBody = BODY_TEXT_TYPES.has(mimeType) && !isAttachment;
    if (treatAsBody) {
      const charset = extractCharset(Object.entries(leaf.headerMap).map(([key, value]) => `${key}: ${value}`).join("\n"));
      const text = decodeWithCharsetFallback(buffer, charset).trim();
      if (mimeType === "text/html" && !htmlPart) htmlPart = text;
      if (mimeType === "text/plain" && !plainPart) plainPart = text;
      continue;
    }
    if (!buffer.length || isSkippedMime(mimeType)) continue;
    if (!isAllowedMailAttachment(mimeType, filename)) continue;
    attachments.push({
      filename: filename || "",
      mimeType,
      contentId: normalizeCid(contentId),
      disposition: isAttachment ? "attachment" : headerLooksLike(leaf.headerMap, "content-disposition", "inline") ? "inline" : "inline",
      buffer
    });
  }
  if (!plainPart && !htmlPart) {
    const charset = extractCharset(headers);
    const fallbackBody = body || normalizedRaw;
    const decoded = decodeWithCharsetFallback(Buffer.from(fallbackBody, "latin1"), charset).trim();
    return {
      text: decoded.slice(0, 10000),
      html: "",
      attachments
    };
  }
  return {
    text: (plainPart || htmlToText(htmlPart)).slice(0, 10000),
    html: htmlPart ? htmlPart.slice(0, 200000) : "",
    attachments
  };
}
