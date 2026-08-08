export const ADMIN_PASSWORD_MIN_LENGTH = 12;
const RULES = [{
  code: "length",
  test: password => String(password || "").length >= ADMIN_PASSWORD_MIN_LENGTH
}, {
  code: "lowercase",
  test: password => /[a-z]/.test(password)
}, {
  code: "uppercase",
  test: password => /[A-Z]/.test(password)
}, {
  code: "digit",
  test: password => /[0-9]/.test(password)
}, {
  code: "special",
  test: password => /[^A-Za-z0-9]/.test(password)
}];
export function getPasswordRuleStatuses(password) {
  return RULES.map(rule => ({
    code: rule.code,
    met: rule.test(password)
  }));
}
export function isStrongPassword(password) {
  return getPasswordRuleStatuses(password).every(rule => rule.met);
}
export function getPasswordStrength(password) {
  const metCount = getPasswordRuleStatuses(password).filter(rule => rule.met).length;
  if (!password) return "empty";
  if (metCount <= 2) return "weak";
  if (metCount <= 4) return "fair";
  return "strong";
}
