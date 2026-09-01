import crypto from "crypto";
import { signSessionToken } from "./authSession.js";
import { getPrimaryFrontendBaseUrl } from "./envFile.js";
import { sendSystemNotification } from "../services/systemNotificationService.js";
export function passwordFingerprint(passwordHash) {
  return crypto.createHash("sha256").update(String(passwordHash || "")).digest("hex").slice(0, 16);
}
export function buildPortalInviteLink(userId, email, passwordHash) {
  const token = signSessionToken({
    id: userId,
    email,
    purpose: "portal_invite",
    fp: passwordFingerprint(passwordHash)
  }, "72h");
  return `${getPrimaryFrontendBaseUrl()}/activate-portal#token=${token}`;
}
export async function sendPortalInviteEmail({
  userId,
  email,
  contactName,
  passwordHash
}) {
  const activateLink = buildPortalInviteLink(userId, email, passwordHash);
  const [prenom, ...nomParts] = String(contactName || "").trim().split(/\s+/);
  await sendSystemNotification("auth.portal_invite", {
    emails: [email],
    requireSend: true,
    context: {
      activateLink,
      contact: {
        prenom: prenom || "",
        nom: nomParts.join(" "),
        email
      }
    }
  });
}
