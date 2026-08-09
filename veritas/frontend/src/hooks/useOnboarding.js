import { useCallback, useEffect, useRef, useState } from "react";
import { useAppGeneralSettings } from "./useAppGeneralSettings";
import { clearOnboardingState, ONBOARDING_RELAUNCH_EVENT, persistOnboardingCompleted, readOnboardingLocalState, writeOnboardingLocalState } from "../components/Onboarding/onboardingStorage";

function isOnboardingCompletedFlag(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

/**
 * Premiers pas = once per instance deployment (server flag), not per user.
 * Never shown while impersonating. Only admins run the wizard.
 */
export function useOnboarding(user, userRole, {
  impersonating = false
} = {}) {
  const {
    settings,
    loaded: settingsLoaded
  } = useAppGeneralSettings();
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showResumeFab, setShowResumeFab] = useState(false);
  const [step, setStep] = useState(1);
  const migrationAttemptedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !settingsLoaded) {
      if (!user?.id) {
        setReady(false);
        setCompleted(false);
        setShowWizard(false);
        setShowResumeFab(false);
      }
      return;
    }

    // Clients, non-admins, and impersonation never run instance setup.
    if (userRole === "client" || userRole !== "admin" || impersonating) {
      setReady(true);
      setCompleted(true);
      setShowWizard(false);
      setShowResumeFab(false);
      return;
    }

    const local = readOnboardingLocalState(user.id);
    const serverCompleted = isOnboardingCompletedFlag(settings.app_onboarding_completed);

    if (serverCompleted) {
      setReady(true);
      setCompleted(true);
      setShowWizard(false);
      setShowResumeFab(false);
      if (!local.completed) {
        writeOnboardingLocalState({
          completed: true,
          pausedAtStep: null
        });
      }
      return;
    }

    // Migrate legacy per-user completion → instance flag (existing installs).
    if (local.completed && !migrationAttemptedRef.current) {
      migrationAttemptedRef.current = true;
      persistOnboardingCompleted().then(() => {
        setReady(true);
        setCompleted(true);
        setShowWizard(false);
        setShowResumeFab(false);
      }).catch(() => {
        setReady(true);
        setCompleted(true);
        setShowWizard(false);
        setShowResumeFab(false);
      });
      return;
    }

    if (local.completed) {
      setReady(true);
      setCompleted(true);
      setShowWizard(false);
      setShowResumeFab(false);
      return;
    }

    setReady(true);
    setCompleted(false);
    if (local.pausedAtStep) {
      setStep(local.pausedAtStep);
      setShowResumeFab(true);
      setShowWizard(false);
      return;
    }
    setStep(1);
    setShowWizard(true);
    setShowResumeFab(false);
  }, [user?.id, userRole, impersonating, settingsLoaded, settings.app_onboarding_completed]);

  const complete = useCallback(async () => {
    if (!user?.id) return;
    try {
      await persistOnboardingCompleted();
    } catch (err) {
      console.error("Failed to persist onboarding completion", err);
      writeOnboardingLocalState({
        completed: true,
        pausedAtStep: null
      });
    }
    setCompleted(true);
    setShowWizard(false);
    setShowResumeFab(false);
  }, [user?.id]);

  const pauseAtStep = useCallback(nextStep => {
    if (!user?.id) return;
    writeOnboardingLocalState({
      pausedAtStep: nextStep
    });
    setCompleted(false);
    setShowWizard(false);
    setShowResumeFab(true);
  }, [user?.id]);

  const resume = useCallback(() => {
    setShowWizard(true);
    setShowResumeFab(false);
  }, []);

  const goToStep = useCallback(nextStep => {
    setStep(nextStep);
    writeOnboardingLocalState({
      pausedAtStep: null
    });
  }, []);

  const restart = useCallback(() => {
    if (!user?.id || userRole !== "admin" || impersonating) return;
    migrationAttemptedRef.current = false;
    clearOnboardingState(user.id);
    setCompleted(false);
    setReady(true);
    setStep(1);
    setShowWizard(true);
    setShowResumeFab(false);
  }, [user?.id, userRole, impersonating]);

  useEffect(() => {
    const onRelaunch = () => restart();
    window.addEventListener(ONBOARDING_RELAUNCH_EVENT, onRelaunch);
    return () => window.removeEventListener(ONBOARDING_RELAUNCH_EVENT, onRelaunch);
  }, [restart]);

  return {
    ready,
    completed,
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
