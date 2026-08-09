export const DEFAULT_MAIL_COLLECT_SETTINGS = {
  threadRepliesEnabled: true,
  orphanReplyBehavior: "refuse",
  deduplicateByMessageId: true,
  maxLogEntriesPerCollector: 300,
  moveOnSuccess: true,
  moveOnReject: true,
  markSeenAfterProcess: true,
  unmatchedBehavior: "leave"
};

const ORPHAN_REPLY_BEHAVIORS = new Set(["ignore", "refuse", "create_ticket"]);
const UNMATCHED_BEHAVIORS = new Set(["leave", "mark_seen", "refuse"]);

function asBool(value, defaultValue) {
  if (value === undefined || value === null) return defaultValue;
  return value !== false;
}

export function normalizeMailCollectSettings(input = {}) {
  const rawMaxLogs = Number(input?.maxLogEntriesPerCollector);
  const orphanReplyBehavior = String(input?.orphanReplyBehavior || DEFAULT_MAIL_COLLECT_SETTINGS.orphanReplyBehavior)
    .trim()
    .toLowerCase();
  const unmatchedBehavior = String(input?.unmatchedBehavior || DEFAULT_MAIL_COLLECT_SETTINGS.unmatchedBehavior)
    .trim()
    .toLowerCase();
  return {
    threadRepliesEnabled: asBool(input?.threadRepliesEnabled, true),
    orphanReplyBehavior: ORPHAN_REPLY_BEHAVIORS.has(orphanReplyBehavior)
      ? orphanReplyBehavior
      : DEFAULT_MAIL_COLLECT_SETTINGS.orphanReplyBehavior,
    deduplicateByMessageId: asBool(input?.deduplicateByMessageId, true),
    maxLogEntriesPerCollector: Number.isFinite(rawMaxLogs)
      ? Math.min(2000, Math.max(50, Math.round(rawMaxLogs)))
      : DEFAULT_MAIL_COLLECT_SETTINGS.maxLogEntriesPerCollector,
    moveOnSuccess: asBool(input?.moveOnSuccess, true),
    moveOnReject: asBool(input?.moveOnReject, true),
    markSeenAfterProcess: asBool(input?.markSeenAfterProcess, true),
    unmatchedBehavior: UNMATCHED_BEHAVIORS.has(unmatchedBehavior)
      ? unmatchedBehavior
      : DEFAULT_MAIL_COLLECT_SETTINGS.unmatchedBehavior
  };
}
