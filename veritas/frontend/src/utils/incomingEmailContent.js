export const INCOMING_EMAIL_HTML_MARKER = "<!--veritas-email-html-->";

export function isIncomingEmailContent(content) {
  return /^\s*\[Incoming email\]/i.test(String(content || ""));
}

/** Detect real HTML markup without treating <user@domain.com> as HTML. */
export function contentLooksLikeHtml(content) {
  const raw = String(content || "");
  if (!raw.trim()) return false;
  const withoutEmails = raw.replace(/<[^>\s<>]+@[^>\s<>]+>/g, "");
  return /<\/?(?:p|div|br|span|table|tr|td|th|ul|ol|li|a|b|i|em|strong|u|s|h[1-6]|blockquote|pre|code|img|html|body|head|style|font|center|hr)\b[^>]*>/i.test(withoutEmails);
}

export function parseIncomingEmailContent(content) {
  const raw = String(content || "");
  const markerIdx = raw.indexOf(INCOMING_EMAIL_HTML_MARKER);
  const plainPart = markerIdx >= 0 ? raw.slice(0, markerIdx).trimEnd() : raw;
  const htmlPart = markerIdx >= 0 ? raw.slice(markerIdx + INCOMING_EMAIL_HTML_MARKER.length).trim() : "";
  const lines = plainPart.split(/\r?\n/);
  let sender = "";
  let subject = "";
  let bodyStart = 0;
  if (/^\s*\[Incoming email\]/i.test(lines[0] || "")) {
    sender = String(lines[0]).replace(/^\s*\[Incoming email\]\s*/i, "").trim();
    bodyStart = 1;
    if (/^\s*Subject:\s*/i.test(lines[1] || "")) {
      subject = String(lines[1]).replace(/^\s*Subject:\s*/i, "").trim();
      bodyStart = 2;
      if (lines[2] === "") bodyStart = 3;
    }
  }
  const bodyText = lines.slice(bodyStart).join("\n").trim();
  return {
    isIncomingEmail: isIncomingEmailContent(raw),
    sender,
    subject,
    bodyText,
    plainText: plainPart,
    html: htmlPart,
    hasHtml: Boolean(htmlPart)
  };
}

export function buildIncomingEmailPreview(content, {
  maxChars = 420,
  maxLines = 8
} = {}) {
  const parsed = parseIncomingEmailContent(content);
  const source = parsed.bodyText || parsed.plainText || String(content || "");
  const lines = source.split(/\r?\n/).slice(0, maxLines);
  let preview = lines.join("\n").trim();
  let truncated = source.split(/\r?\n/).length > maxLines || source.length > maxChars;
  if (preview.length > maxChars) {
    preview = `${preview.slice(0, maxChars - 1).trimEnd()}…`;
    truncated = true;
  }
  return {
    ...parsed,
    preview,
    truncated: truncated || parsed.hasHtml
  };
}
