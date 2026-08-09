import { ONBOARDING_VERSION } from "./onboardingContent";
import { updateGeneralSettings } from "../../api/generalSettings";

/** Instance-scoped key (once per deployment / browser). */
export function getOnboardingStorageKey() {
  return `veritas_onboarding_${ONBOARDING_VERSION}`;
}

/** Legacy per-user key — kept for migration only. */
export function getLegacyOnboardingStorageKey(userId) {
  if (!userId) return null;
  return `veritas_onboarding_${ONBOARDING_VERSION}_${userId}`;
}

function readJson(key) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readOnboardingLocalState(userId) {
  const instance = readJson(getOnboardingStorageKey()) || {};
  const legacy = readJson(getLegacyOnboardingStorageKey(userId)) || {};
  return {
    completed: Boolean(instance.completed || legacy.completed),
    pausedAtStep: instance.pausedAtStep ?? legacy.pausedAtStep ?? null
  };
}

export function writeOnboardingLocalState(patch) {
  const key = getOnboardingStorageKey();
  const prev = readJson(key) || {};
  try {
    localStorage.setItem(key, JSON.stringify({
      ...prev,
      ...patch
    }));
  } catch {}
}

export function clearOnboardingState(userId) {
  try {
    localStorage.removeItem(getOnboardingStorageKey());
  } catch {}
  const legacyKey = getLegacyOnboardingStorageKey(userId);
  if (legacyKey) {
    try {
      localStorage.removeItem(legacyKey);
    } catch {}
  }
}

export const ONBOARDING_RELAUNCH_EVENT = "veritas-relaunch-onboarding";

export async function requestOnboardingRelaunch(userId) {
  try {
    const {
      settings
    } = await updateGeneralSettings({
      app_onboarding_completed: "false"
    });
    window.dispatchEvent(new CustomEvent("appGeneralSettingsUpdated", {
      detail: settings
    }));
  } catch (err) {
    console.error("Failed to reset instance onboarding flag", err);
  }
  clearOnboardingState(userId);
  window.dispatchEvent(new CustomEvent(ONBOARDING_RELAUNCH_EVENT));
}

export async function persistOnboardingCompleted() {
  const {
    settings
  } = await updateGeneralSettings({
    app_onboarding_completed: "true"
  });
  writeOnboardingLocalState({
    completed: true,
    pausedAtStep: null
  });
  window.dispatchEvent(new CustomEvent("appGeneralSettingsUpdated", {
    detail: settings
  }));
  return settings;
}
