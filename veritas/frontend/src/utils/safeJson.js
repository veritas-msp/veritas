function createJsonReplacer() {
  const seen = new WeakSet();
  return (_key, value) => {
    if (typeof value === "function") return undefined;
    if (typeof Element !== "undefined" && value instanceof Element) return undefined;
    if (typeof Node !== "undefined" && value instanceof Node) return undefined;
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return undefined;
      seen.add(value);
    }
    return value;
  };
}
export function safeJsonStringify(value) {
  return JSON.stringify(value, createJsonReplacer());
}
export function safeJsonClone(value) {
  return JSON.parse(safeJsonStringify(value));
}
