/**
 * Sample context + lightweight {{var}} / {{#var}}…{{/var}} rendering for email previews.
 * Mirrors backend renderSystemTemplate for admin preview / test send.
 */

export const NOTIFICATION_EMAIL_SAMPLE_CONTEXT = {
  resetLink: "https://veritas.example/reset?token=demo",
  activateLink: "https://veritas.example/portal/activate?token=demo",
  portalLink: "https://veritas.example/portal/documents",
  changedFields: "statut, priorité",
  user: {
    username: "j.dupont",
    email: "j.dupont@example.com"
  },
  contact: {
    prenom: "Marie",
    nom: "Martin",
    email: "marie.martin@client.example"
  },
  requester: {
    prenom: "Marie",
    nom: "Martin",
    email: "marie.martin@client.example"
  },
  agent: {
    username: "a.tech"
  },
  ticket: {
    ticket_number: "1042",
    title: "Impossible de se connecter au VPN",
    status: "Ouvert",
    priority: "Haute"
  },
  entreprise: {
    nom: "Acme SAS"
  },
  comment: {
    author: "a.tech",
    preview: "Nous avons redémarré le tunnel VPN, pouvez-vous retester ?"
  },
  satisfaction: {
    author: "Marie Martin",
    rating: "5",
    message: "Intervention rapide, merci !"
  },
  validation: {
    message: "Merci de valider la résolution proposée.",
    validator: "j.dupont",
    decision: "approuvé"
  },
  event: {
    title: "Intervention sur site",
    type: "Intervention",
    start: "15/04/2026 09:00",
    end: "15/04/2026 12:00",
    description: "Remplacement du switch cœur."
  },
  document: {
    file_name: "Contrat_maintenance.pdf",
    category: "Contrats",
    description: "Contrat 2026"
  },
  secret: {
    title: "Accès firewall",
    description: "Identifiants admin firewall site principal",
    expires_at: "30/04/2026",
    max_views: "3"
  }
};

function getByPath(source, path) {
  return String(path || "").split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), source);
}

export function renderNotificationTemplate(content = "", context = NOTIFICATION_EMAIL_SAMPLE_CONTEXT) {
  const src = String(content || "");
  const withConditionals = src.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, token, inner) => {
    const value = getByPath(context, token);
    if (value === null || value === undefined || value === false || String(value).trim() === "") return "";
    return inner;
  });
  return withConditionals.replace(/\{\{\s*([^}#/][^}]*)\s*\}\}/g, (_m, tokenRaw) => {
    const token = String(tokenRaw || "").trim();
    const value = getByPath(context, token);
    if (value === null || value === undefined || String(value) === "") return "";
    return String(value);
  });
}

/** Visual shell close to backend veritasTemplate (for iframe / panel preview). */
export function wrapVeritasEmailPreview({ title = "Notification", content = "" } = {}) {
  const safeTitle = String(title || "Notification");
  const body = String(content || "");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle.replace(/</g, "&lt;")}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6fa;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="background:linear-gradient(160deg,#0f1c2e 0%,#162641 60%,#1a3060 100%);border-radius:12px 12px 0 0;padding:24px 28px;">
              <div style="width:38px;height:38px;line-height:38px;background-color:#2b5fab;border-radius:8px;font-size:18px;font-weight:800;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0 auto;">V</div>
              <div style="padding-top:10px;font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#e8edf5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Veritas</div>
            </td>
          </tr>
          <tr>
            <td style="background:#fff;border:1px solid #dde3ed;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <h1 style="margin:0 0 16px;font-size:17px;font-weight:700;color:#10233c;line-height:1.35;">${safeTitle.replace(/</g, "&lt;")}</h1>
              <div style="font-size:14px;color:#374a5e;line-height:1.6;">${body}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 12px 0;font-size:11px;color:#6b7a90;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              Aperçu — cet e-mail est envoyé automatiquement depuis Veritas.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
