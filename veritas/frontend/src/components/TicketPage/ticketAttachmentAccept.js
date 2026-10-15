/** Shared allow-list for ticket comment / task attachment uploads (support + sales). */

export const MAX_TICKET_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export const ALLOWED_TICKET_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".xls",
  ".xlsx",
  ".ods",
  ".csv",
  ".ppt",
  ".pptx",
  ".eml",
  ".msg",
  ".ics",
  ".zip",
  ".mp4",
  ".3gp",
  ".mp3",
  ".mpeg",
  ".ogg",
  ".aac",
  ".amr",
  ".m4a"
];

const ALLOWED_SET = new Set(ALLOWED_TICKET_ATTACHMENT_EXTENSIONS);

export const ATTACHMENT_ACCEPT = ALLOWED_TICKET_ATTACHMENT_EXTENSIONS.join(",");

export const ATTACHMENT_FORMATS_LABEL =
  "PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, EML, MSG, ZIP, CSV, ICS, MP4, MP3";

export function getTicketAttachmentExtension(fileName) {
  const name = String(fileName || "");
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx).toLowerCase();
}

export function isAllowedTicketAttachmentExtension(fileName) {
  return ALLOWED_SET.has(getTicketAttachmentExtension(fileName));
}

/**
 * @throws {Error} when a file is rejected
 */
export function assertTicketAttachmentFiles(files = [], {
  typeError,
  sizeError,
  formatsLabel = ATTACHMENT_FORMATS_LABEL,
  maxBytes = MAX_TICKET_ATTACHMENT_BYTES,
  interpolate: interpolateFn
} = {}) {
  const interpolateSafe =
    typeof interpolateFn === "function"
      ? interpolateFn
      : (template, vars = {}) =>
          String(template || "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ""));

  for (const file of files) {
    const name = String(file?.name || "");
    if (!isAllowedTicketAttachmentExtension(name)) {
      throw new Error(
        interpolateSafe(typeError || "File type not allowed. Accepted formats: {formats}.", {
          formats: formatsLabel
        })
      );
    }
    if (Number(file?.size || 0) > maxBytes) {
      throw new Error(
        interpolateSafe(sizeError || 'File "{name}" exceeds size limit.', {
          name: name || "file"
        })
      );
    }
  }
}
