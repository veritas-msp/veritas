import DOMPurify from "dompurify";
const BASE_ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "span", "div"];
const BASE_ALLOWED_ATTR = ["href", "target", "rel", "alt", "title", "class"];
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: BASE_ALLOWED_TAGS,
  ALLOWED_ATTR: BASE_ALLOWED_ATTR
};
export const TICKET_COMMENT_CONFIG = {
  ALLOWED_TAGS: [...BASE_ALLOWED_TAGS, "img"],
  ALLOWED_ATTR: [...BASE_ALLOWED_ATTR, "src", "width", "height", "style"]
};
function convertLegacyFontTags(html) {
  return String(html || "")
    .replace(/<font\b([^>]*)>/gi, (_match, attrs) => {
      const colorMatch = String(attrs || "").match(/\bcolor\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i);
      const color = String(colorMatch?.[1] || colorMatch?.[2] || "").trim();
      if (color && /^(#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]{3,20})$/i.test(color)) {
        return `<span style="color: ${color}">`;
      }
      return "<span>";
    })
    .replace(/<\/font>/gi, "</span>");
}

function postProcessLinks(html) {
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("a[href]").forEach(anchor => {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });
  tmp.querySelectorAll("img:not([alt])").forEach(img => {
    img.setAttribute("alt", "Image");
  });
  return tmp.innerHTML;
}
export function sanitizeHtml(raw, config = DEFAULT_CONFIG) {
  const source = convertLegacyFontTags(String(raw ?? ""));
  if (typeof window === "undefined") {
    return source;
  }
  const clean = DOMPurify.sanitize(source, config);
  return postProcessLinks(clean);
}
export function sanitizeTicketCommentHtml(raw) {
  return sanitizeHtml(raw, TICKET_COMMENT_CONFIG);
}
/** Detect real HTML markup without treating <user@domain.com> as HTML. */
export function contentLooksLikeHtml(content) {
  const raw = String(content || "");
  if (!raw.trim()) return false;
  const withoutEmails = raw.replace(/<[^>\s<>]+@[^>\s<>]+>/g, "");
  return /<\/?(?:p|div|br|span|table|tr|td|th|ul|ol|li|a|b|i|em|strong|u|s|h[1-6]|blockquote|pre|code|img|html|body|head|style|font|center|hr)\b[^>]*>/i.test(withoutEmails);
}
/** Render template/comment HTML for preview: keep rich markup, convert plain text newlines. */
export function toRichPreviewHtml(raw) {
  const content = String(raw ?? "");
  if (!content.trim()) return "";
  const asHtml = contentLooksLikeHtml(content) ? content : content.replace(/\n/g, "<br>");
  return sanitizeTicketCommentHtml(asHtml);
}
export const REMEDIATION_HTML_CONFIG = {
  ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "br", "p", "a", "ul", "ol", "li", "span", "div"],
  ALLOWED_ATTR: ["href", "target", "rel", "class"]
};
export function sanitizeRemediationHtml(raw) {
  return sanitizeHtml(raw, REMEDIATION_HTML_CONFIG);
}
export function authFetchInit(init = {}) {
  const {
    credentials,
    ...rest
  } = init;
  return {
    credentials: credentials ?? "include",
    ...rest
  };
}
