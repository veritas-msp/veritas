import {
  bulkDeleteClientFiles,
  createClientFileFolder,
  deleteClientFile,
  fetchClientFiles,
  getDownloadUrl,
  uploadClientFile
} from "../api/clientFiles";

export const VERITAS_BUILDER_STATE_FILENAME = "_veritas-builder-state.json";

function toZipFile(blob, fileName) {
  const baseName = String(fileName || "monitoring-report").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const zipName = baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`;
  return new File([blob], zipName, {
    type: "application/zip"
  });
}

function sanitizeFolderName(name) {
  return String(name || "Rapport")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160) || "Rapport";
}

function sanitizeFileName(name, fallback = "rapport.html") {
  return String(name || fallback).replace(/[<>:"/\\|?*]+/g, " ").trim() || fallback;
}

export function isVeritasInternalVaultFile(file) {
  const name = String(file?.file_name || file?.fileName || file?.name || "");
  return name.startsWith("_veritas-");
}

function buildVaultFileIdMap(files = []) {
  const map = {};
  (Array.isArray(files) ? files : []).forEach(file => {
    const name = file?.file_name || file?.fileName || file?.name;
    if (name && file?.id != null) map[name] = file.id;
  });
  return map;
}

async function uploadHtmlRows({
  list,
  clientId,
  clientName,
  description,
  visibleToClient,
  folderId
}) {
  const uploaded = [];
  for (const row of list) {
    const fileName = sanitizeFileName(row.fileName || "rapport.html");
    const htmlName = fileName.toLowerCase().endsWith(".html") ? fileName : `${fileName}.html`;
    const blob = row.blob || new Blob([row.html || ""], { type: "text/html;charset=utf-8" });
    const file = new File([blob], htmlName, { type: "text/html" });
    const saved = await uploadClientFile({
      clientId,
      clientName,
      category: "Rapport",
      description,
      file,
      visibleToClient: Boolean(visibleToClient),
      folderId
    });
    uploaded.push(saved);
  }
  return uploaded;
}

async function uploadBuilderStateSidecar({
  builderState,
  clientId,
  clientName,
  folderId,
  description = ""
}) {
  if (!builderState || !folderId) return null;
  const json = typeof builderState === "string"
    ? builderState
    : JSON.stringify(builderState);
  const file = new File([json], VERITAS_BUILDER_STATE_FILENAME, {
    type: "application/json"
  });
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description: description || "État builder Veritas (interne)",
    file,
    visibleToClient: false,
    folderId
  });
}

/** @deprecated Prefer uploadReportHtmlFolderToClientVault (HTML files in a folder). */
export async function uploadReportArchiveToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  folderId = null
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file: toZipFile(blob, fileName),
    visibleToClient: Boolean(visibleToClient),
    folderId
  });
}

/**
 * Creates a vault folder and uploads each HTML report file into it.
 * Optionally uploads an internal builder-state sidecar (never visible to client portal).
 */
export async function uploadReportHtmlFolderToClientVault({
  files,
  folderName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  parentFolderId = null,
  builderState = null
}) {
  if (!clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  const list = Array.isArray(files) ? files.filter(row => row?.blob || row?.html) : [];
  if (!list.length) {
    throw new Error("Aucun fichier HTML à archiver.");
  }

  const folder = await createClientFileFolder({
    clientId,
    name: sanitizeFolderName(folderName),
    parentId: parentFolderId || null,
    visibleToClient: Boolean(visibleToClient)
  });

  const uploaded = await uploadHtmlRows({
    list,
    clientId,
    clientName,
    description,
    visibleToClient,
    folderId: folder.id
  });

  const sidecar = await uploadBuilderStateSidecar({
    builderState,
    clientId,
    clientName,
    folderId: folder.id,
    description
  });
  if (sidecar) uploaded.push(sidecar);

  return {
    folder,
    files: uploaded,
    vaultFolderId: folder.id,
    vaultFileIds: buildVaultFileIdMap(uploaded)
  };
}

/**
 * Replaces HTML (+ sidecar) inside an existing vault folder. Does not create a new folder.
 */
export async function replaceReportHtmlFolderInClientVault({
  folderId,
  files,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  builderState = null
}) {
  if (!clientId || !folderId) {
    throw new Error("Données insuffisantes pour remplacer le rapport dans le coffre.");
  }
  const list = Array.isArray(files) ? files.filter(row => row?.blob || row?.html) : [];
  if (!list.length) {
    throw new Error("Aucun fichier HTML à archiver.");
  }

  const existing = await fetchClientFiles({ clientId, folderId });
  const rows = Array.isArray(existing) ? existing : existing?.files || [];
  const toRemove = rows.filter(file => {
    const name = String(file?.file_name || file?.fileName || "");
    const mime = String(file?.mime_type || file?.mimeType || "");
    return (
      isVeritasInternalVaultFile(file)
      || name.toLowerCase().endsWith(".html")
      || mime.includes("html")
    );
  });
  if (toRemove.length) {
    await bulkDeleteClientFiles(toRemove);
  }

  const uploaded = await uploadHtmlRows({
    list,
    clientId,
    clientName,
    description,
    visibleToClient,
    folderId
  });

  const sidecar = await uploadBuilderStateSidecar({
    builderState,
    clientId,
    clientName,
    folderId,
    description
  });
  if (sidecar) uploaded.push(sidecar);

  return {
    folder: { id: folderId },
    files: uploaded,
    vaultFolderId: folderId,
    vaultFileIds: buildVaultFileIdMap(uploaded)
  };
}

export async function fetchVaultBuilderState({ clientId, folderId, signal } = {}) {
  if (!clientId || !folderId) return null;
  const existing = await fetchClientFiles({ clientId, folderId, signal });
  const rows = Array.isArray(existing) ? existing : existing?.files || [];
  const sidecar = rows.find(
    file => String(file?.file_name || file?.fileName || "") === VERITAS_BUILDER_STATE_FILENAME
  );
  if (!sidecar?.id) return null;
  const res = await fetch(getDownloadUrl(sidecar.id), {
    credentials: "include",
    signal
  });
  if (!res.ok) {
    throw new Error(`Impossible de charger l’état builder (${res.status}).`);
  }
  return res.json();
}

/**
 * Upload or replace a single HTML report file in the vault (intervention / audit).
 */
export async function replaceOrUploadReportHtmlToClientVault({
  existingFileId = null,
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  folderId = null
}) {
  if (existingFileId) {
    try {
      await deleteClientFile(existingFileId);
    } catch (err) {
      console.warn("Impossible de supprimer l’ancien HTML coffre:", err);
    }
  }
  return uploadReportHtmlToClientVault({
    blob,
    fileName,
    clientId,
    clientName,
    description,
    visibleToClient,
    folderId
  });
}

export async function uploadReportPdfToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  folderId = null
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  const baseName = String(fileName || "rapport").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const pdfName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
  const file = new File([blob], pdfName, {
    type: "application/pdf"
  });
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient),
    folderId
  });
}

export async function uploadReportHtmlToClientVault({
  blob,
  fileName,
  clientId,
  clientName,
  description = "",
  visibleToClient = false,
  folderId = null
}) {
  if (!blob || !clientId) {
    throw new Error("Données insuffisantes pour archiver le rapport.");
  }
  const baseName = String(fileName || "rapport").replace(/[<>:"/\\|?*]+/g, " ").trim().replace(/\s+/g, " ");
  const htmlName = baseName.toLowerCase().endsWith(".html") ? baseName : `${baseName}.html`;
  const file = new File([blob], htmlName, {
    type: "text/html"
  });
  return uploadClientFile({
    clientId,
    clientName,
    category: "Rapport",
    description,
    file,
    visibleToClient: Boolean(visibleToClient),
    folderId
  });
}

/** @deprecated Prefer uploadReportPdfToClientVault */
export const uploadInterventionPdfToClientVault = uploadReportPdfToClientVault;
export const uploadInterventionHtmlToClientVault = uploadReportHtmlToClientVault;
