/**
 * Parse @mentions from ticket comment HTML.
 * Expected chip:
 *   <span ... data-mention-type="user|team" data-mention-id="{uuid}">@Label</span>
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readAttr(attrs, name) {
  const quoted = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  if (quoted) return String(quoted[2] || "").trim();
  const bare = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? String(bare[1] || "").trim() : "";
}

export function extractTicketMentionsFromHtml(html) {
  const source = String(html || "");
  const userIds = new Set();
  const teamIds = new Set();
  if (!source) {
    return { userIds: [], teamIds: [] };
  }
  const tagRe = /<span\b([^>]*)>/gi;
  let match;
  while ((match = tagRe.exec(source))) {
    const attrs = match[1] || "";
    const type = readAttr(attrs, "data-mention-type").toLowerCase();
    const id = readAttr(attrs, "data-mention-id");
    if (!UUID_RE.test(id)) continue;
    if (type === "user") userIds.add(id);
    else if (type === "team") teamIds.add(id);
  }
  return {
    userIds: [...userIds],
    teamIds: [...teamIds]
  };
}
