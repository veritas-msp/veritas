import { isIncomingEmailContent } from "./incomingEmailContent";

export function isClientResponseComment(comment) {
  if (!comment || comment.is_internal || comment.isInternal) return false;
  const content = String(comment.content || comment.body || "").trim();
  if (content.startsWith("[WhatsApp]")) return true;
  if (content.startsWith("[Email entrant]")) return true;
  if (isIncomingEmailContent(content)) return true;
  const authorRole = String(comment.author_role || comment.authorRole || "").toLowerCase();
  if (authorRole === "client" || authorRole === "contact") return true;
  return false;
}

/** Agent / outbound messages render on the right; client / inbound on the left. */
export function isChatOutboundComment(comment, { users = [], currentUserId = null } = {}) {
  if (!comment) return true;
  if (comment.is_internal || comment.isInternal) return true;
  if (isClientResponseComment(comment)) return false;

  const authorId = comment.author_user_id || comment.authorUserId || comment.user_id || comment.userId || null;
  if (currentUserId && authorId && String(authorId) === String(currentUserId)) return true;

  if (
    authorId &&
    Array.isArray(users) &&
    users.some(
      user =>
        String(user?.id) === String(authorId) ||
        String(user?.uuid) === String(authorId) ||
        String(user?.user_id) === String(authorId)
    )
  ) {
    return true;
  }

  return Boolean(authorId);
}
