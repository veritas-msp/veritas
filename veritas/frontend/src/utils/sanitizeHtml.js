import DOMPurify from "dompurify";
const BASE_ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "span", "div"];
const BASE_ALLOWED_ATTR = ["href", "target", "rel", "alt", "title", "class"];
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: BASE_ALLOWED_TAGS,
  ALLOWED_ATTR: BASE_ALLOWED_ATTR
};
export const TICKET_COMMENT_CONFIG = {
  ALLOWED_TAGS: [...BASE_ALLOWED_TAGS, "img"],
  ALLOWED_ATTR: [...BASE_ALLOWED_ATTR, "src", "width", "height"]
};
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
  if (typeof window === "undefined") {
    return String(raw ?? "");
  }
  const clean = DOMPurify.sanitize(String(raw ?? ""), config);
  return postProcessLinks(clean);
}
export function sanitizeTicketCommentHtml(raw) {
  return sanitizeHtml(raw, TICKET_COMMENT_CONFIG);
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
