import { useCallback, useEffect, useState } from "react";
import { clearOnboardingState, getOnboardingStorageKey, ONBOARDING_RELAUNCH_EVENT } from "../components/Onboarding/onboardingStorage";
function storageKey(userId) {
  return getOnboardingStorageKey(userId);
}
function readState(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeState(userId, patch) {
  const prev = readState(userId) || {};
  localStorage.setItem(storageKey(userId), JSON.stringify({
    ...prev,
    ...patch
  }));
}
export function useOnboarding(user, userRole) {
  const [showWizard, setShowWizard] = useState(false);
  const [showResumeFab, setShowResumeFab] = useState(false);
  const [step, setStep] = useState(1);
  useEffect(() => {
    if (!user?.id || userRole === "client") {
      setShowWizard(false);
      setShowResumeFab(false);
      return;
    }
    const saved = readState(user.id);
    if (saved?.completed) {
      setShowWizard(false);
      setShowResumeFab(false);
      return;
    }
    if (saved?.pausedAtStep) {
      setStep(saved.pausedAtStep);
      setShowResumeFab(true);
      setShowWizard(false);
      return;
    }
    setStep(1);
    setShowWizard(true);
    setShowResumeFab(false);
  }, [user?.id, userRole]);
  const complete = useCallback(() => {
    if (!user?.id) return;
    writeState(user.id, {
      completed: true,
      pausedAtStep: null
    });
    setShowWizard(false);
    setShowResumeFab(false);
  }, [user?.id]);
  const pauseAtStep = useCallback(nextStep => {
    if (!user?.id) return;
    writeState(user.id, {
      pausedAtStep: nextStep
    });
    setShowWizard(false);
    setShowResumeFab(true);
  }, [user?.id]);
  const resume = useCallback(() => {
    setShowWizard(true);
    setShowResumeFab(false);
  }, []);
  const goToStep = useCallback(nextStep => {
    setStep(nextStep);
    if (user?.id) {
      writeState(user.id, {
        pausedAtStep: null
      });
    }
  }, [user?.id]);
  const restart = useCallback(() => {
    if (!user?.id || userRole === "client") return;
    clearOnboardingState(user.id);
    setStep(1);
    setShowWizard(true);
    setShowResumeFab(false);
  }, [user?.id, userRole]);
  useEffect(() => {
    const onRelaunch = () => restart();
    window.addEventListener(ONBOARDING_RELAUNCH_EVENT, onRelaunch);
    return () => window.removeEventListener(ONBOARDING_RELAUNCH_EVENT, onRelaunch);
  }, [restart]);
  return {
    showWizard,
    showResumeFab,
    step,
    setStep: goToStep,
    complete,
    pauseAtStep,
    resume,
    restart
  };
}
