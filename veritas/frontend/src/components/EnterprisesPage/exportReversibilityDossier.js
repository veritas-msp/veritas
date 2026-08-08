import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchClientModules } from "../../api/clients";
import { fetchClientFiles, getDownloadUrl } from "../../api/clientFiles";
import { buildSiteAddress, getSiteDisplayName, normalizeClientSites } from "../../utils/clientSites";
const TICKET_STATUS_LABELS = {
  open: "Open",
  new: "New",
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed"
};
const EVENT_TYPE_LABELS = {
  intervention: "Intervention",
  presentation: "Presentation",
  maintenance: "Maintenance",
  maintenance_preventive: "Preventive maintenance",
  mise_a_jour: "Update",
  integration_monitoring: "Monitoring integration",
  other: "Other"
};
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function slugify(value) {
  return String(value || "client").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "client";
}
function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}
function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB");
}
function objectsToCsv(rows, columns) {
  const escapeCell = raw => {
    const value = raw == null ? "" : String(raw);
    if (/[;"\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  const header = columns.map(col => escapeCell(col.label)).join(";");
  const lines = rows.map(row => columns.map(col => escapeCell(col.get(row))).join(";"));
  return `\uFEFF${header}\n${lines.join("\n")}`;
}
function flattenEquipmentRows(equipements = {}) {
  const rows = [];
  const pushRow = (type, item, index = 0) => {
    if (!item || typeof item !== "object") return;
    rows.push({
      categorie: type,
      nom: item.name || item.nom || item.logiciel || item.solution || item.host || item.hostname || `Item ${index + 1}`,
      ip: item.ip || item.adresseIP || item.adresse_ip || "",
      modele: item.modele || item.model || "",
      serial: item.serial || item.numeroSerie || "",
      statut: item.statut || (item.is_active === false ? "inactive" : "active"),
      details: JSON.stringify(item)
    });
  };
  for (const [type, payload] of Object.entries(equipements || {})) {
    if (!payload) continue;
    if (Array.isArray(payload)) {
      payload.forEach((item, index) => pushRow(type, item, index));
      continue;
    }
    if (typeof payload !== "object") continue;
    if (Array.isArray(payload.instances)) {
      payload.instances.forEach((item, index) => pushRow(type, item, index));
    }
    if (Array.isArray(payload.solutions)) {
      payload.solutions.forEach((item, index) => pushRow(type, item, index));
    }
    if (Array.isArray(payload.jobs)) {
      payload.jobs.forEach((item, index) => pushRow(type, item, index));
    }
    if (Array.isArray(payload.items)) {
      payload.items.forEach((item, index) => pushRow(type, item, index));
    }
    const looksLikeRecord = payload.name || payload.nom || payload.logiciel || payload.solution || payload.ip;
    if (looksLikeRecord) {
      pushRow(type, payload, 0);
    }
  }
  return rows;
}
function buildReadme(clientName, generatedAt) {
  return `REVERSIBILITY PACK · ${clientName}
Generated on ${generatedAt} via Veritas MSP

This pack gathers the information required for client reversibility
(transfer, takeover or end of service).

Contents:
- summary.html           Browser-readable overview
- data/                  Structured exports (JSON and CSV)
- attached_documents/    Copies of files saved on the client record

JSON files keep the full technical data.
CSV files are Excel-compatible (semicolon separator, UTF-8).

Document generated automatically · complete with your internal procedures
(passwords, vendor access, escalation procedures, etc.).
`;
}
function buildSyntheseHtml({
  client,
  formData,
  commercialLabel,
  contractModules,
  contacts,
  equipmentRows,
  supportTickets,
  prestationTickets,
  events,
  campaigns,
  notes,
  tags,
  files,
  generatedAt
}) {
  const moduleLines = Object.entries(contractModules || {}).filter(([, enabled]) => enabled).map(([key]) => `<li>${escapeHtml(key)}</li>`).join("");
  const contactRows = (contacts || []).map(c => `<tr>
        <td>${escapeHtml(`${c.prenom || ""} ${c.nom || ""}`.trim())}</td>
        <td>${escapeHtml(c.poste || "-")}</td>
        <td>${escapeHtml(c.email || "-")}</td>
        <td>${escapeHtml(c.telephone || "-")}</td>
        <td>${escapeHtml(c.statut || "-")}</td>
      </tr>`).join("");
  const equipmentTable = (equipmentRows || []).slice(0, 200).map(row => `<tr>
        <td>${escapeHtml(row.categorie)}</td>
        <td>${escapeHtml(row.nom)}</td>
        <td>${escapeHtml(row.ip || "-")}</td>
        <td>${escapeHtml(row.statut || "-")}</td>
      </tr>`).join("");
  const ticketRows = [...(supportTickets || []), ...(prestationTickets || [])].slice(0, 50).map(t => `<tr>
        <td>#${escapeHtml(t.ticket_number || t.id)}</td>
        <td>${escapeHtml(t.title || "-")}</td>
        <td>${escapeHtml(TICKET_STATUS_LABELS[t.status] || t.status || "-")}</td>
        <td>${escapeHtml(formatDateTime(t.updated_at || t.created_at))}</td>
      </tr>`).join("");
  const sites = normalizeClientSites(formData?.sites || client?.sites || []).map(site => {
    const name = getSiteDisplayName(site);
    const address = buildSiteAddress(site);
    const label = address && address !== name ? `${name} · ${address}` : name;
    return `<span class="chip">${escapeHtml(label)}</span>`;
  }).join("");
  const tagChips = (tags || []).map(tag => `<span class="chip tag">${escapeHtml(tag.label)}</span>`).join("");
  const noteBlocks = (notes || []).slice(0, 30).map(note => `<article class="note">
        <header>${escapeHtml(note.username || note.email || "User")} · ${escapeHtml(formatDateTime(note.created_at))}</header>
        <p>${escapeHtml(note.content || "").replace(/\n/g, "<br>")}</p>
      </article>`).join("");
  const fileList = (files || []).map(file => `<li>${escapeHtml(file.file_name)} (${escapeHtml(file.category || "Autre")}, ${escapeHtml(formatDateTime(file.created_at))})</li>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Reversibility pack · ${escapeHtml(client?.name || "Client")}</title>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; margin: 0; background: #eef2f8; color: #0f1c2e; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 3rem; }
    .hero { background: linear-gradient(135deg, #1a3d75, #2b5fab); color: #fff; border-radius: 16px; padding: 1.75rem; margin-bottom: 1.25rem; }
    .hero h1 { margin: 0 0 0.35rem; font-size: 1.65rem; }
    .hero p { margin: 0; opacity: 0.9; }
    section { background: #fff; border: 1px solid #dde3ed; border-radius: 14px; padding: 1.1rem 1.25rem; margin-bottom: 1rem; }
    h2 { margin: 0 0 0.75rem; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; color: #2b5fab; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem 1rem; }
    .label { font-size: 0.72rem; text-transform: uppercase; color: #6b7a90; }
    .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border-bottom: 1px solid #e8edf4; padding: 0.45rem 0.35rem; text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; color: #6b7a90; }
    .chip { display: inline-block; margin: 0.15rem 0.25rem 0.15rem 0; padding: 0.2rem 0.55rem; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 0.78rem; }
    .chip.tag { background: #f0fdfa; color: #0f766e; }
    .note { border: 1px solid #e8edf4; border-radius: 10px; padding: 0.65rem 0.75rem; margin-bottom: 0.5rem; }
    .note header { font-size: 0.75rem; color: #6b7a90; margin-bottom: 0.35rem; }
    .note p { margin: 0; white-space: pre-wrap; font-size: 0.88rem; }
    ul.files { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }
    @media print { body { background: #fff; } section { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>Reversibility pack</h1>
      <p>${escapeHtml(client?.name || "Client")} · generated on ${escapeHtml(generatedAt)}</p>
    </header>

    <section>
      <h2>Identity & contract</h2>
      <div class="grid">
        <div><div class="label">Company</div><div class="value">${escapeHtml(formData?.name || client?.name || "-")}</div></div>
        <div><div class="label">Legal ID</div><div class="value">${escapeHtml(formData?.siret || client?.siret || "-")}</div></div>
        <div><div class="label">Sector</div><div class="value">${escapeHtml(formData?.secteur || client?.secteur || "-")}</div></div>
        <div><div class="label">Account manager</div><div class="value">${escapeHtml(commercialLabel || "-")}</div></div>
        <div><div class="label">Address</div><div class="value">${escapeHtml(formData?.address || client?.address || "-")}</div></div>
        <div><div class="label">Contract</div><div class="value">${escapeHtml(formatDate(formData?.contrat?.debut || client?.contrat?.debut))} → ${escapeHtml(formatDate(formData?.contrat?.expiration || client?.contrat?.expiration))}</div></div>
      </div>
      ${sites ? `<div style="margin-top:0.75rem"><div class="label">Sites</div>${sites}</div>` : ""}
      ${moduleLines ? `<div style="margin-top:0.75rem"><div class="label">Contract options</div><ul>${moduleLines}</ul></div>` : ""}
      ${tagChips ? `<div style="margin-top:0.75rem"><div class="label">Tags</div>${tagChips}</div>` : ""}
    </section>

    <section>
      <h2>Contacts (${(contacts || []).length})</h2>
      <table>
        <thead><tr><th>Name</th><th>Job title</th><th>E-mail</th><th>Phone</th><th>Status</th></tr></thead>
        <tbody>${contactRows || "<tr><td colspan='5'>No contact</td></tr>"}</tbody>
      </table>
    </section>

    <section>
      <h2>Technical inventory (${(equipmentRows || []).length})</h2>
      <table>
        <thead><tr><th>Category</th><th>Name</th><th>IP</th><th>Status</th></tr></thead>
        <tbody>${equipmentTable || "<tr><td colspan='4'>No equipment</td></tr>"}</tbody>
      </table>
    </section>

    <section>
      <h2>Recent tickets</h2>
      <table>
        <thead><tr><th>No.</th><th>Title</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>${ticketRows || "<tr><td colspan='4'>No ticket</td></tr>"}</tbody>
      </table>
    </section>

    ${noteBlocks ? `<section><h2>Internal notes</h2>${noteBlocks}</section>` : ""}

    ${fileList ? `<section><h2>Attached documents</h2><ul class="files">${fileList}</ul></section>` : ""}
  </div>
</body>
</html>`;
}
async function appendClientFiles(zip, clientId) {
  let files = [];
  try {
    files = await fetchClientFiles({
      clientId
    });
  } catch {
    return files;
  }
  if (!Array.isArray(files) || files.length === 0) return files;
  const folder = zip.folder("attached_documents");
  for (const file of files) {
    try {
      const response = await fetch(getDownloadUrl(file.id), {
        credentials: "include"
      });
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const safeName = String(file.file_name || `fichier_${file.id}`).replace(/[/\\]/g, "_");
      folder.file(safeName, buffer);
    } catch {}
  }
  return files;
}
export async function exportReversibilityFolder({
  client,
  formData,
  contacts = [],
  supportTickets = [],
  prestationTickets = [],
  upcomingEvents = [],
  campaigns = [],
  notes = [],
  clientTags = [],
  commercialLabel = "",
  contractModules = {},
  modulesData = null
}) {
  if (!client?.id) {
    throw new Error("Client not found for export.");
  }
  const generatedAt = new Date().toLocaleString("en-US");
  const zip = new JSZip();
  const dataFolder = zip.folder("donnees");
  let modulesPayload = modulesData;
  if (!modulesPayload?.equipements) {
    modulesPayload = await fetchClientModules(client.id);
  }
  const equipmentRows = flattenEquipmentRows(modulesPayload?.equipements || {});
  const clientFiles = await appendClientFiles(zip, client.id);
  const enterprisePayload = {
    id: client.id,
    name: formData?.name || client.name,
    siret: formData?.siret || client.siret || null,
    secteur: formData?.secteur || client.secteur || null,
    address: formData?.address || client.address || null,
    sites: formData?.sites || client.sites || [],
    commercial: commercialLabel || null,
    contrat: formData?.contrat || client.contrat || {},
    modules: contractModules,
    generatedAt
  };
  dataFolder.file("company.json", JSON.stringify(enterprisePayload, null, 2));
  dataFolder.file("contacts.json", JSON.stringify(contacts, null, 2));
  dataFolder.file("equipements.json", JSON.stringify(modulesPayload?.equipements || {}, null, 2));
  dataFolder.file("tickets_support.json", JSON.stringify(supportTickets, null, 2));
  dataFolder.file("demandes_prestations.json", JSON.stringify(prestationTickets, null, 2));
  dataFolder.file("planning_events.json", JSON.stringify(upcomingEvents, null, 2));
  dataFolder.file("campagnes.json", JSON.stringify(campaigns, null, 2));
  dataFolder.file("notes.json", JSON.stringify(notes, null, 2));
  dataFolder.file("tags.json", JSON.stringify(clientTags, null, 2));
  dataFolder.file("documents.json", JSON.stringify(clientFiles.map(f => ({
    id: f.id,
    file_name: f.file_name,
    category: f.category,
    mime_type: f.mime_type,
    size_bytes: f.size_bytes,
    created_at: f.created_at
  })), null, 2));
  dataFolder.file("contacts.csv", objectsToCsv(contacts, [{
    label: "Last name",
    get: c => c.nom || ""
  }, {
    label: "First name",
    get: c => c.prenom || ""
  }, {
    label: "Job title",
    get: c => c.poste || ""
  }, {
    label: "E-mail",
    get: c => c.email || ""
  }, {
    label: "Phone",
    get: c => c.telephone || ""
  }, {
    label: "Status",
    get: c => c.statut || ""
  }]));
  dataFolder.file("equipements.csv", objectsToCsv(equipmentRows, [{
    label: "Category",
    get: r => r.categorie
  }, {
    label: "Name",
    get: r => r.nom
  }, {
    label: "IP",
    get: r => r.ip
  }, {
    label: "Model",
    get: r => r.modele
  }, {
    label: "Serial no.",
    get: r => r.serial
  }, {
    label: "Status",
    get: r => r.statut
  }]));
  dataFolder.file("tickets.csv", objectsToCsv([...supportTickets, ...prestationTickets], [{
    label: "No.",
    get: t => t.ticket_number || t.id
  }, {
    label: "Title",
    get: t => t.title || ""
  }, {
    label: "Type",
    get: t => t.type || ""
  }, {
    label: "Category",
    get: t => t.category || ""
  }, {
    label: "Status",
    get: t => TICKET_STATUS_LABELS[t.status] || t.status || ""
  }, {
    label: "Priority",
    get: t => t.priority || ""
  }, {
    label: "Created on",
    get: t => formatDateTime(t.created_at)
  }, {
    label: "Updated",
    get: t => formatDateTime(t.updated_at)
  }]));
  dataFolder.file("events.csv", objectsToCsv(upcomingEvents, [{
    label: "Type",
    get: e => EVENT_TYPE_LABELS[e.type] || e.type || ""
  }, {
    label: "Title",
    get: e => e.title || ""
  }, {
    label: "Start",
    get: e => formatDateTime(e.start)
  }, {
    label: "End",
    get: e => formatDateTime(e.end)
  }]));
  zip.file("summary.html", buildSyntheseHtml({
    client,
    formData,
    commercialLabel,
    contractModules,
    contacts,
    equipmentRows,
    supportTickets,
    prestationTickets,
    events: upcomingEvents,
    campaigns,
    notes,
    tags: clientTags,
    files: clientFiles,
    generatedAt
  }));
  zip.file("README.txt", buildReadme(formData?.name || client.name || "Client", generatedAt));
  const blob = await zip.generateAsync({
    type: "blob"
  });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `reversibility_dossier_${slugify(formData?.name || client.name)}_${dateStamp}.zip`;
  saveAs(blob, fileName);
}
