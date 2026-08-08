export const TICKET_CHAT_UI_SETTINGS_KEY = "ticket_chat_ui_settings";
export const DEFAULT_TICKET_CHAT_UI_SETTINGS = {
  textSizePx: 16,
  messageSpacingPx: 10
};
export function normalizeTicketChatUiSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const textSizePx = Number(source.textSizePx);
  const messageSpacingPx = Number(source.messageSpacingPx);
  return {
    textSizePx: Number.isFinite(textSizePx) ? Math.min(24, Math.max(12, textSizePx)) : 16,
    messageSpacingPx: Number.isFinite(messageSpacingPx) ? Math.min(24, Math.max(0, messageSpacingPx)) : 10
  };
}
