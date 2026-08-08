export function resolveLicenseStatusMessage({
  isValid,
  status,
  copy
}) {
  if (isValid) return copy.validMessage;
  if (status === "missing") return copy.missingMessage;
  if (status === "past_due") return copy.pastDueMessage;
  const mapped = copy.statusMessages?.[status];
  if (mapped) return mapped;
  return copy.defaultMessage;
}
export function resolveLicenseApiError(error, copy, fallbackKey = "loadError") {
  const payload = error?.payload || error;
  const code = payload?.error || payload?.code || error?.code;
  if (code && copy.apiErrors?.[code]) return copy.apiErrors[code];
  return copy[fallbackKey] || copy.loadError;
}
