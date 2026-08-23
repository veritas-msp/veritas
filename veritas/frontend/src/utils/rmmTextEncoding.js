const MOJIBAKE_MARK = /Ã[\u0080-\u00ff\u2030]|Â[\u0080-\u00ff]|â€|\uFFFD/;
const BROKEN_ACCENT = /[\uFFFD\uFF1F?ýÿỳÝŸ]/;
const OS_CAPTION_HINT = /windows|microsoft|macos|mac\s*os|ubuntu|debian|linux|education|professionnel|professionn|syst[eè]?me|[\u00c9\u00e9]dition|edition|famille|entreprise/i;
function countEncodingArtifacts(text) {
  if (typeof text !== "string" || !text) return 0;
  return (text.match(/\uFFFD/g) || []).length + (text.match(/Ã./g) || []).length;
}
export function repairRmmTextEncoding(value) {
  if (value == null || value === "") return value;
  if (typeof value !== "string") return value;
  let best = value;
  let bestScore = countEncodingArtifacts(value);
  const tryDecode = encoding => {
    try {
      const bytes = Uint8Array.from(value, char => char.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder(encoding, {
        fatal: false
      }).decode(bytes);
      if (!decoded || decoded === value) return;
      const score = countEncodingArtifacts(decoded);
      if (score < bestScore) {
        best = decoded;
        bestScore = score;
      }
    } catch {}
  };
  if (MOJIBAKE_MARK.test(value)) {
    tryDecode("utf-8");
    tryDecode("windows-1252");
  }
  return repairOsAccentLookalikes(repairKnownWindowsOsWords(best));
}
function repairOsAccentLookalikes(text) {
  if (typeof text !== "string" || !text || !OS_CAPTION_HINT.test(text)) return text;
  return text.replace(/[ýÿỳ]/g, "é").replace(/[ÝŸ]/g, "É");
}
function repairKnownWindowsOsWords(text) {
  if (typeof text !== "string" || !text) return text;
  return text
    .replace(/Ã‰/g, "É")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ãª/g, "ê")
    .replace(/Ã /g, "à")
    .replace(/Ã§/g, "ç")
    .replace(/Ã®/g, "î")
    .replace(/Ã´/g, "ô")
    .replace(/Ã»/g, "û")
    .replace(new RegExp(`${BROKEN_ACCENT.source}(?=[Dd]ucation)`, "g"), "É")
    .replace(new RegExp(`${BROKEN_ACCENT.source}(?=[Dd]ition)`, "g"), "É")
    .replace(new RegExp(`Prof${BROKEN_ACCENT.source}ssionnel`, "gi"), "Professionnel")
    .replace(new RegExp(`Professionn${BROKEN_ACCENT.source}l`, "gi"), "Professionnel")
    .replace(new RegExp(`Syst${BROKEN_ACCENT.source}me`, "gi"), "Système")
    .replace(new RegExp(`g${BROKEN_ACCENT.source}n${BROKEN_ACCENT.source}ral`, "gi"), "général");
}
export function repairRmmInventoryTextFields(value) {
  if (value == null) return value;
  if (typeof value === "string") return repairRmmTextEncoding(value);
  if (Array.isArray(value)) return value.map(repairRmmInventoryTextFields);
  if (typeof value === "object") {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = repairRmmInventoryTextFields(entry);
    }
    return next;
  }
  return value;
}
