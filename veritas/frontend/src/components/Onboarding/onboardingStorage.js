import { ONBOARDING_VERSION } from "./onboardingContent";
export function getOnboardingStorageKey(userId) {
  return `veritas_onboarding_${ONBOARDING_VERSION}_${userId}`;
}
export function clearOnboardingState(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(getOnboardingStorageKey(userId));
  } catch {}
}
export const ONBOARDING_RELAUNCH_EVENT = "veritas-relaunch-onboarding";
export function requestOnboardingRelaunch() {
  window.dispatchEvent(new CustomEvent(ONBOARDING_RELAUNCH_EVENT));
}
