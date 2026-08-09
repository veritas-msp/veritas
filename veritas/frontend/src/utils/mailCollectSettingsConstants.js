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

export const ORPHAN_REPLY_BEHAVIOR_OPTIONS = [
  {
    value: "refuse",
    label: "Refuse",
    subtitle: "Move to the collector refused folder"
  },
  {
    value: "ignore",
    label: "Leave in inbox",
    subtitle: "Do not create a ticket; leave the message in place"
  },
  {
    value: "create_ticket",
    label: "Create ticket",
    subtitle: "Create a new ticket even if no thread is found"
  }
];

export const UNMATCHED_BEHAVIOR_OPTIONS = [
  {
    value: "leave",
    label: "Leave",
    subtitle: "Keep in the inbox for the next poll"
  },
  {
    value: "mark_seen",
    label: "Mark as read",
    subtitle: "Leave in the inbox but mark as read"
  },
  {
    value: "refuse",
    label: "Refuse",
    subtitle: "Move to the collector refused folder"
  }
];

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
