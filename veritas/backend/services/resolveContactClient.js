import { resolveClientIdForContact } from "./contactClientLinks.js";

/**
 * Resolve ticket client from explicit clientId and/or requester contact memberships.
 * Explicit clientId always wins. Without it, use contact memberships (null if ambiguous).
 */
export async function resolveClientIdForTicket({
  clientId,
  requesterContactId
} = {}) {
  if (clientId != null && clientId !== "") {
    const preferred = Number(clientId);
    if (Number.isInteger(preferred) && preferred > 0) return preferred;
  }
  if (!requesterContactId) return null;
  return resolveClientIdForContact(requesterContactId, null);
}

export { resolveClientIdForContact };
