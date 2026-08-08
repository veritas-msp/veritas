export async function readApiErrorPayload(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
export function createApiError(message, {
  code,
  status,
  ...rest
} = {}) {
  const err = new Error(message);
  if (code) err.code = code;
  if (status) err.status = status;
  Object.assign(err, rest);
  return err;
}
export async function throwIfNotOk(res, fallbackMessage) {
  if (res.ok) return;
  const data = await readApiErrorPayload(res);
  throw createApiError(data.error || data.details || fallbackMessage, {
    code: data.code,
    status: res.status,
    blockers: data.blockers
  });
}
export function isCommunityLimitError(error) {
  return String(error?.code || "").startsWith("COMMUNITY_");
}
