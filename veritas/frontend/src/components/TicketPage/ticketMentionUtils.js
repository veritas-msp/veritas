/**
 * ContentEditable @mention helpers for ticket reply editors.
 * Chips: <span class="ticket-mention" data-mention-type="user|team" data-mention-id="uuid">@Label</span>
 */

export function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildMentionChipHtml({ kind, id, label }) {
  const safeKind = kind === "team" ? "team" : "user";
  const safeId = escapeHtmlAttr(id);
  const safeLabel = escapeHtmlText(String(label || "").replace(/^@/, "") || "mention");
  return `<span class="ticket-mention" data-mention-type="${safeKind}" data-mention-id="${safeId}" contenteditable="false">@${safeLabel}</span>\u00A0`;
}

/**
 * Detect an active @query just before the caret in a contentEditable.
 * Returns null when no mention trigger is active.
 */
export function getMentionQueryAtCaret() {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const textBefore = String(node.textContent || "").slice(0, range.startOffset);
  const match = textBefore.match(/(^|[\s\u00A0])@([^\s@]*)$/);
  if (!match) return null;
  const query = match[2] || "";
  const atIndex = range.startOffset - query.length - 1;
  if (atIndex < 0) return null;
  return {
    query,
    textNode: node,
    atIndex,
    endOffset: range.startOffset
  };
}

export function insertMentionChip(mentionState, item) {
  if (!mentionState?.textNode || !item?.id) return false;
  if (typeof window === "undefined") return false;
  const { textNode, atIndex, endOffset } = mentionState;
  const selection = window.getSelection?.();
  if (!selection) return false;

  const range = document.createRange();
  range.setStart(textNode, atIndex);
  range.setEnd(textNode, endOffset);
  selection.removeAllRanges();
  selection.addRange(range);

  const html = buildMentionChipHtml(item);
  const ok = document.execCommand("insertHTML", false, html);
  return Boolean(ok);
}

export function buildMentionCandidates({ users = [], teams = [], query = "", excludeUserId = null } = {}) {
  const q = String(query || "").trim().toLowerCase();
  const exclude = excludeUserId ? String(excludeUserId) : null;
  const userItems = (Array.isArray(users) ? users : [])
    .map(user => {
      const id = String(user?.id || user?.uuid || user?.user_id || "").trim();
      if (!id || (exclude && id === exclude)) return null;
      const label =
        user?.ticket_helpdesk_display_name ||
        user?.name ||
        user?.username ||
        user?.email ||
        id;
      const hay = `${label} ${user?.email || ""} ${user?.username || ""}`.toLowerCase();
      if (q && !hay.includes(q)) return null;
      return {
        kind: "user",
        id,
        label: String(label).trim(),
        hint: user?.email || "",
        icon: "mdi:account-outline"
      };
    })
    .filter(Boolean);

  const teamItems = (Array.isArray(teams) ? teams : [])
    .map(team => {
      const id = String(team?.id || "").trim();
      if (!id) return null;
      const label = team?.name || id;
      const hay = String(label).toLowerCase();
      if (q && !hay.includes(q)) return null;
      const memberCount = Array.isArray(team?.memberUserIds)
        ? team.memberUserIds.length
        : Number(team?.memberCount || 0);
      return {
        kind: "team",
        id,
        label: String(label).trim(),
        hint: memberCount > 0 ? `${memberCount}` : "",
        icon: team?.icon || "mdi:account-group-outline",
        color: team?.color || null
      };
    })
    .filter(Boolean);

  return [...userItems, ...teamItems].slice(0, 12);
}

/** Approximate caret viewport rect for positioning the mention menu. */
export function getCaretClientRect() {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();
  if (rects.length > 0) return rects[0];
  // Fallback: insert a temp marker
  const span = document.createElement("span");
  span.appendChild(document.createTextNode("\u200b"));
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  const parent = span.parentNode;
  parent?.removeChild(span);
  parent?.normalize?.();
  return rect;
}
