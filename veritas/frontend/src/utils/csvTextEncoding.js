/**
 * Decode CSV file bytes with encoding auto-detection.
 * Excel (FR/Windows) often saves CSV as Windows-1252 without a BOM; reading as UTF-8
 * turns accented characters into U+FFFD ().
 */

function countReplacementChars(text) {
  if (typeof text !== "string" || !text) return 0;
  return (text.match(/\uFFFD/g) || []).length;
}

function stripBomBytes(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: "utf-8", bytes: bytes.subarray(3) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { encoding: "utf-16le", bytes: bytes.subarray(2) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { encoding: "utf-16be", bytes: bytes.subarray(2) };
  }
  return { encoding: null, bytes };
}

/**
 * Pick the best string decoding for CSV content.
 * Prefer UTF-8 when valid; fall back to Windows-1252 when UTF-8 yields replacement chars.
 */
export function decodeCsvBytes(bytesInput) {
  const source = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput || []);
  const { encoding: bomEncoding, bytes } = stripBomBytes(source);
  if (bomEncoding) {
    return new TextDecoder(bomEncoding, { fatal: false }).decode(bytes);
  }

  let utf8 = "";
  try {
    utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return utf8;
  } catch {
    utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  const win1252 = new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
  const utf8Score = countReplacementChars(utf8);
  const winScore = countReplacementChars(win1252);
  if (utf8Score === 0) return utf8;
  if (winScore < utf8Score) return win1252;
  return utf8;
}

export async function readCsvFileAsText(file) {
  if (!file) return "";
  if (typeof file === "string") return file;
  const buffer = await file.arrayBuffer();
  return decodeCsvBytes(new Uint8Array(buffer));
}
