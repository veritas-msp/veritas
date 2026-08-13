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
    const subjectLine = lines[1] || "";
    if (/^\s*Subject\s*:\s*/i.test(subjectLine)) {
      subject = String(subjectLine).replace(/^\s*Subject\s*:\s*/i, "").trim();
      bodyStart = 2;
      if (lines[2] === "") bodyStart = 3;
    } else {
      const collapsed = sender.match(/^(.*?)\s+Subject\s*:\s*(.*)$/i);
      if (collapsed) {
        sender = collapsed[1].trim();
        subject = collapsed[2].trim();
      }
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

export function splitIncomingEmailSender(sender) {
  const raw = String(sender || "").trim();
  if (!raw) return { name: "", email: "" };
  const angled = raw.match(/^(.*?)\s*<([^>]+@[^>]+)>\s*$/);
  if (angled) {
    return {
      name: angled[1].trim(),
      email: angled[2].trim()
    };
  }
  const emailMatch = raw.match(/([^\s<>]+@[^\s<>]+)/);
  if (!emailMatch) return { name: raw, email: "" };
  const email = emailMatch[1];
  const name = raw.replace(email, "").replace(/[<>]/g, "").trim();
  return { name, email };
}

function stripMarkup(value) {
  return String(value || "").replace(/<!--veritas-email-html-->[\s\S]*$/i, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}

export function excerptCollapsedText(text, maxLength = 180) {
  const clean = stripMarkup(text);
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}…`;
}

export function getTicketDescriptionPreview(description, {
  maxChars = 180,
  maxLines = 4
} = {}) {
  if (isIncomingEmailContent(description)) {
    const parsed = buildIncomingEmailPreview(description, {
      maxChars,
      maxLines
    });
    const sender = splitIncomingEmailSender(parsed.sender);
    return {
      kind: "email",
      senderName: sender.name,
      senderEmail: sender.email,
      subject: parsed.subject || "",
      body: parsed.preview && parsed.preview !== "(empty message)" ? parsed.preview : ""
    };
  }
  return {
    kind: "text",
    body: excerptCollapsedText(description, maxChars)
  };
}
