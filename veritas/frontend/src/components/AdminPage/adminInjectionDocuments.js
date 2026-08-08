/** Collect files from a FileList / input (files or webkitdirectory). */
export function filesFromFileList(fileList) {
  return Array.from(fileList || []).filter(Boolean).map(file => {
    const relativePath = file.webkitRelativePath || file.relativePath || file.name;
    return attachRelativePath(file, relativePath);
  });
}

function attachRelativePath(file, relativePath) {
  if (file.relativePath === relativePath) return file;
  try {
    Object.defineProperty(file, "relativePath", {
      value: relativePath,
      configurable: true
    });
  } catch {
    /* ignore */
  }
  return file;
}

async function readAllDirectoryEntries(reader) {
  const all = [];
  for (;;) {
    const batch = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

async function walkEntry(entry, out, prefix = "") {
  if (!entry) return;
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });
    out.push(attachRelativePath(file, `${prefix}${file.name}`));
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    const nextPrefix = `${prefix}${entry.name}/`;
    for (const child of entries) {
      await walkEntry(child, out, nextPrefix);
    }
  }
}

/** Collect files from a drag-and-drop DataTransfer, including folders. */
export async function filesFromDataTransfer(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []);
  if (items.some(item => typeof item.webkitGetAsEntry === "function")) {
    const out = [];
    const jobs = [];
    for (const item of items) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        jobs.push(walkEntry(entry, out));
      } else {
        const file = item.getAsFile();
        if (file) out.push(attachRelativePath(file, file.name));
      }
    }
    await Promise.all(jobs);
    if (out.length) return out;
  }
  return filesFromFileList(dataTransfer?.files);
}

export function createDocumentDraft(file, id) {
  const relativePath = file.relativePath || file.webkitRelativePath || file.name;
  return {
    id,
    file,
    fileName: file.name,
    relativePath,
    clientId: "",
    category: "Autre",
    description: "",
    visibleToClient: false
  };
}

/** Guess company from first folder segment of relative path. */
export function guessClientIdFromPath(relativePath, clients) {
  const segment = String(relativePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .map(s => s.trim())
    .filter(Boolean)[0];
  if (!segment || !clients?.length) return "";
  const needle = segment.toLowerCase();
  const exact = clients.find(c => String(c.name || "").trim().toLowerCase() === needle);
  if (exact) return String(exact.id);
  const partial = clients.find(c => {
    const name = String(c.name || "").trim().toLowerCase();
    return name && (name.includes(needle) || needle.includes(name));
  });
  return partial ? String(partial.id) : "";
}

export function formatFileSize(bytes, locale = "fr") {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "-";
  const tag = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) {
    return `${(value / 1024).toLocaleString(tag, { maximumFractionDigits: 1 })} KB`;
  }
  return `${(value / (1024 * 1024)).toLocaleString(tag, { maximumFractionDigits: 1 })} MB`;
}
