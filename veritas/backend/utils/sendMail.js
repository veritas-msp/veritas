import { getTransporter, isSmtpConfigured, veritasTemplate } from "../routes/utils/mailer.js";
import { getSettingsMap } from "./settingsHelper.js";

/** Adresse From = « Adresse expéditeur » (BUG_REPORT_EMAIL), sinon identifiant SMTP. */
export async function resolveSmtpFromAddress() {
  const settings = await getSettingsMap(["BUG_REPORT_EMAIL", "SMTP_USER"]);
  const fromEmail = String(settings.BUG_REPORT_EMAIL || settings.SMTP_USER || process.env.BUG_REPORT_EMAIL || process.env.SMTP_USER || "").trim();
  return fromEmail;
}

export const sendMail = async ({
  to,
  cc = undefined,
  subject,
  title,
  htmlContent,
  attachments = []
}) => {
  const smtpReady = await isSmtpConfigured();
  const transporter = await getTransporter();
  let fromEmail = await resolveSmtpFromAddress();
  if (!fromEmail) {
    if (smtpReady || process.env.NODE_ENV === "production") {
      throw new Error("Adresse expéditeur manquante (Administration → Paramètres généraux → SMTP)");
    }
    fromEmail = "noreply@localhost";
  }
  const info = await transporter.sendMail({
    from: fromEmail,
    to,
    cc,
    subject,
    html: veritasTemplate({
      title,
      content: htmlContent
    }),
    attachments
  });
  if (!smtpReady) {
    console.info(`[mail:dev] ${subject} → ${to} (from: ${fromEmail})`);
    if (typeof info?.message === "string") {
      try {
        const parsed = JSON.parse(info.message);
        const href = String(parsed.html || "").match(/href="(https?:[^"]+)"/i)?.[1];
        if (href) console.info(`[mail:dev] link: ${href}`);
      } catch {}
    }
  }
  return {
    ...info,
    from: fromEmail,
    skipped: !smtpReady
  };
};
