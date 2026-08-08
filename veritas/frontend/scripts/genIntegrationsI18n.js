const fs = require("fs");
const path = require("path");
const catalogPath = path.join(__dirname, "../src/components/AdminPage/integrationsCatalog.js");
const outPath = path.join(__dirname, "../src/components/AdminPage/integrationsCatalogI18nContent.js");
const src = fs.readFileSync(catalogPath, "utf8");
const categories = [];
const catBlock = src.match(/export const INTEGRATION_CATEGORIES = \[([\s\S]*?)\];/)?.[1];
if (catBlock) {
  for (const m of catBlock.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)) {
    categories.push({
      id: m[1],
      label: m[2]
    });
  }
}
const integrations = {};
const fieldLabels = {};
const catalogBlock = src.match(/export const INTEGRATIONS_CATALOG = \[([\s\S]*?)\];/)?.[1];
const idRegex = /^\s*\{\s*\n\s*id:\s*"([^"]+)"/gm;
const positions = [];
let match;
while ((match = idRegex.exec(catalogBlock)) !== null) {
  positions.push({
    id: match[1],
    start: match.index
  });
}
for (let i = 0; i < positions.length; i += 1) {
  const {
    id,
    start
  } = positions[i];
  const end = positions[i + 1]?.start ?? catalogBlock.length;
  const block = catalogBlock.slice(start, end);
  const descMatch = block.match(/description:\s*(?:"([^"]*)"|`([^`]*)`|\n\s*"([^"]*)")/);
  let description = "";
  if (descMatch) {
    description = descMatch[1] || descMatch[2] || descMatch[3] || "";
  }
  if (!description) {
    const multi = block.match(/description:\s*\n\s*"([^"]*)"/);
    description = multi?.[1] || "";
  }
  integrations[id] = {
    description
  };
  const fields = [];
  for (const fm of block.matchAll(/\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)) {
    fields.push({
      key: fm[1],
      label: fm[2]
    });
  }
  if (fields.length) fieldLabels[id] = fields;
}
const enDescriptions = {
  ai: "LLM provider for ticket copilots, runbooks and briefings.",
  checkmk: "Host, service and monitoring report supervision.",
  prtg: "PRTG Network Monitor sensor and alert reporting.",
  zabbix: "Zabbix host and metrics synchronization.",
  datadog: "Infrastructure observability and APM.",
  bitdefender: "GravityZone company and endpoint inventory.",
  sentinelone: "SentinelOne EDR, agents and protection status.",
  crowdstrike: "Falcon EDR/XDR · endpoints, detections and response.",
  sophos: "Sophos Central antivirus, MDR and policies.",
  "defender-endpoint": "Microsoft EDR · alerts, incidents and endpoint posture.",
  "cortex-xdr": "Palo Alto XDR · correlation and investigation.",
  eset: "ESET antivirus and EDR for endpoints.",
  "trend-micro": "Trend Micro XDR and threat reporting.",
  kaspersky: "Kaspersky endpoint protection and KSC console.",
  trellix: "Trellix ePO and endpoint protection status.",
  withsecure: "WithSecure EDR (ex-F-Secure) for endpoints and servers.",
  harfanglab: "French EDR · agents, alerts and investigation.",
  malwarebytes: "Malwarebytes Nebula console and protection status.",
  huntress: "Managed MSP EDR · persistence, incidents and remediation.",
  mailinblack: "Email protection antispam, anti-phishing and anti-malware · Protect module partner API.",
  vade: "Vade cloud filtering · advanced threats and phishing.",
  proofpoint: "Proofpoint email protection for MSPs.",
  "defender-office365": "Exchange Online and Microsoft 365 security.",
  hornetsecurity: "Hornetsecurity email protection and backup suite.",
  spamtitan: "TitanHQ antispam and anti-phishing filtering.",
  fortimail: "Fortinet email gateway · antispam and DLP.",
  "trend-email": "Trend Micro messaging protection.",
  mimecast: "Mimecast email security and continuity.",
  "azure-ad": "Microsoft 365 identity via Microsoft Graph · Entra ID users, MFA and applications.",
  "google-workspace": "Google Workspace accounts and services.",
  email: "Email notifications and report delivery via SMTP.",
  teams: "Webhooks and alerts in Teams channels.",
  slack: "MSP notifications to Slack channels.",
  whatsapp: "WhatsApp Business message intake, automatic support ticket creation and replies from Veritas.",
  ovh: "OVH domain tracking and renewal dates.",
  gandi: "Gandi domain name management.",
  cloudflare: "Cloudflare DNS, certificates and zones.",
  ionos: "IONOS (1&1) registrar and hosting.",
  godaddy: "GoDaddy domain management.",
  namecheap: "Namecheap registrar and DNS zones.",
  veeam: "Veeam backup jobs and status.",
  acronis: "Acronis protection plans and alerts."
};
const enCategories = {
  ai: "AI & copilote",
  monitoring: "Monitoring & supervision",
  "endpoint-security": "Antivirus, EDR & XDR",
  "email-security": "Antispam & email protection",
  cloud: "Cloud & identity",
  email: "Notifications",
  dns: "DNS & domains",
  backup: "Backup"
};
const deCategories = {
  ai: "KI & Copilot",
  monitoring: "Monitoring & Überwachung",
  "endpoint-security": "Antivirus, EDR & XDR",
  "email-security": "Antispam & E-Mail-Schutz",
  cloud: "Cloud & Identität",
  email: "Notifications",
  dns: "DNS & Domains",
  backup: "Backup"
};
const itCategories = {
  ai: "IA & copilota",
  monitoring: "Monitoraggio & supervisione",
  "endpoint-security": "Antivirus, EDR & XDR",
  "email-security": "Antispam & protezione email",
  cloud: "Cloud & identità",
  email: "Notifiche",
  dns: "DNS & domini",
  backup: "Backup"
};
const esCategories = {
  ai: "IA y copiloto",
  monitoring: "Monitorización y supervisión",
  "endpoint-security": "Antivirus, EDR y XDR",
  "email-security": "Antispam y protección de correo",
  cloud: "Cloud e identidad",
  email: "Notificaciones",
  dns: "DNS y dominios",
  backup: "Copia de seguridad"
};
const enFieldLabels = {
  ai: {
    AI_PROVIDER: "Provider",
    AI_API_KEY: "API key",
    AI_MODEL: "Model (optional)"
  },
  checkmk: {
    CHECKMK_API_URL: "Checkmk API URL",
    CHECKMK_USERNAME: "Username",
    CHECKMK_PASSWORD: "Password",
    CHECKMK_SITE: "Default site (optional)"
  },
  bitdefender: {
    BITDEFENDER_API_URL: "API URL",
    BITDEFENDER_API_KEY: "API key"
  },
  mailinblack: {
    MAILINBLACK_API_URL: "Mailinblack API URL",
    MAILINBLACK_API_KEY: "Mailinblack API key"
  },
  email: {
    BUG_REPORT_EMAIL: "Bug report email",
    SMTP_HOST: "SMTP server",
    SMTP_PORT: "SMTP port"
  },
  whatsapp: {
    WHATSAPP_PHONE_NUMBER_ID: "Phone Number ID (Meta)",
    WHATSAPP_ACCESS_TOKEN: "Permanent access token",
    WHATSAPP_APP_SECRET: "Meta application secret",
    WHATSAPP_VERIFY_TOKEN: "Webhook verification token",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "Business account ID (optional)",
    WHATSAPP_API_VERSION: "Graph API version (e.g. v21.0)"
  },
  ovh: {
    OVH_APPLICATION_KEY: "Application Key",
    OVH_APPLICATION_SECRET: "Application Secret",
    OVH_CONSUMER_KEY: "Consumer Key"
  }
};
function buildLocaleDescriptions(localeMap) {
  const out = {};
  for (const [id, {
    description
  }] of Object.entries(integrations)) {
    out[id] = {
      description: localeMap[id] || description
    };
  }
  return out;
}
function buildLocaleCategories(map) {
  const out = {};
  for (const cat of categories) {
    out[cat.id] = map[cat.id] || cat.label;
  }
  return out;
}
function buildLocaleFields(localeMap) {
  const out = {};
  for (const [id, fields] of Object.entries(fieldLabels)) {
    out[id] = {};
    for (const f of fields) {
      out[id][f.key] = localeMap[id]?.[f.key] || f.label;
    }
  }
  return out;
}
const content = {
  fr: {
    categories: buildLocaleCategories(Object.fromEntries(categories.map(c => [c.id, c.label]))),
    descriptions: buildLocaleDescriptions({}),
    fieldLabels: buildLocaleFields({})
  },
  en: {
    categories: buildLocaleCategories(enCategories),
    descriptions: buildLocaleDescriptions(enDescriptions),
    fieldLabels: buildLocaleFields(enFieldLabels)
  },
  de: {
    categories: buildLocaleCategories(deCategories),
    descriptions: buildLocaleDescriptions({}),
    fieldLabels: buildLocaleFields(enFieldLabels)
  },
  it: {
    categories: buildLocaleCategories(itCategories),
    descriptions: buildLocaleDescriptions({}),
    fieldLabels: buildLocaleFields(enFieldLabels)
  },
  es: {
    categories: buildLocaleCategories(esCategories),
    descriptions: buildLocaleDescriptions({}),
    fieldLabels: buildLocaleFields(enFieldLabels)
  }
};
const fileContent = `/** Auto-generated catalog i18n overlays — edit integrationsCatalog.js then re-run scripts/genIntegrationsI18n.js */
export const INTEGRATIONS_CATALOG_I18N = ${JSON.stringify(content, null, 2)};
`;
fs.writeFileSync(outPath, fileContent, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`Categories: ${categories.length}, integrations: ${Object.keys(integrations).length}`);
