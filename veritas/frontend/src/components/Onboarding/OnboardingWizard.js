import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import SetupWizardLayout from "../Setup/SetupWizardLayout";
import { getOnboardingContent } from "./onboardingTranslations";
import { useOnboardingLocale } from "../../hooks/useOnboardingLocale";
import { setUserLocaleOverride } from "../../hooks/useAppGeneralSettings";
import OnboardingIdentityForm from "./OnboardingIdentityForm";
import OnboardingSupportForm from "./OnboardingSupportForm";
import OnboardingHoursForm from "./OnboardingHoursForm";
import OnboardingLicenseForm from "./OnboardingLicenseForm";
import OnboardingAgentsStep from "./OnboardingAgentsStep";
import { useOnboardingSetup } from "./useOnboardingSetup";
import { activateLicense, getLicenseStatus } from "../../api/license";
import { showError } from "../../utils/toast";
import { ONBOARDING_SAVE_STEP_KEYS, ONBOARDING_WIDE_CARD_KEYS, countActiveMspAgents, filterActiveMspAgents } from "./onboardingSetupShared";
import { getEmployeeRangeOptions } from "../../constants/organizationEmployeeRanges";
import { fetchUsers } from "../../api/users";
import { useTheme } from "../../hooks/useTheme";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunityMspAgentsLimit } from "../../config/edition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import WizardAnimatedBackground from "../Setup/WizardAnimatedBackground";
import setupStyles from "../Setup/SetupWizard.module.css";
import styles from "./OnboardingWizard.module.css";
const SAVE_HANDLERS = {
  identity: "saveIdentity",
  support: "saveSupport",
  hours: "saveHours"
};
export default function OnboardingWizard({
  step,
  onStepChange,
  onComplete
}) {
  const {
    theme: appTheme,
    toggleTheme
  } = useTheme();
  const [wizardTheme, setWizardTheme] = useState(() => appTheme === "dark" ? "dark" : "light");
  const locale = useOnboardingLocale();
  const {
    isCommunity,
    limits
  } = useVeritasEdition();
  const maxMspAgents = isCommunity ? getCommunityMspAgentsLimit(limits) : null;
  const [teamAgents, setTeamAgents] = useState([]);
  const [agentCount, setAgentCount] = useState(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseValid, setLicenseValid] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [displayStep, setDisplayStep] = useState(step);
  const [layoutStep, setLayoutStep] = useState(step);
  const [contentVisible, setContentVisible] = useState(true);
  const [panelMinHeight, setPanelMinHeight] = useState(null);
  const stepPanelRef = useRef(null);
  const pendingStepRef = useRef(null);
  const licenseActivatedRef = useRef(false);
  const content = useMemo(() => getOnboardingContent(locale), [locale]);
  const {
    layout,
    ui,
    steps,
    forms
  } = content;
  const setup = useOnboardingSetup(forms, locale);
  const {
    draft,
    loading,
    saving,
    patchGeneral,
    setWeekSchedule
  } = setup;
  const total = steps.length;
  const current = steps[displayStep - 1];
  const layoutCurrent = steps[layoutStep - 1];
  const isLast = displayStep === total;
  useEffect(() => {
    if (pendingStepRef.current != null) return;
    setDisplayStep(step);
    setLayoutStep(step);
    setContentVisible(true);
    setPanelMinHeight(null);
  }, [step]);
  const finishStepTransition = useCallback(nextStep => {
    pendingStepRef.current = null;
    setPanelMinHeight(null);
    setLayoutStep(nextStep);
  }, []);
  const requestStepChange = useCallback(nextStep => {
    if (nextStep === displayStep || pendingStepRef.current != null) return;
    if (nextStep < 1 || nextStep > total) return;
    pendingStepRef.current = nextStep;
    if (stepPanelRef.current) {
      setPanelMinHeight(stepPanelRef.current.offsetHeight);
    }
    setContentVisible(false);
  }, [displayStep, total]);
  const handleExitComplete = useCallback(() => {
    const next = pendingStepRef.current;
    if (next == null) return;
    setDisplayStep(next);
    onStepChange(next);
    setContentVisible(true);
    finishStepTransition(next);
  }, [onStepChange, finishStepTransition]);
  const handleEnterComplete = useCallback(() => {
    setPanelMinHeight(null);
  }, []);
  const employeeRangeOptions = useMemo(() => getEmployeeRangeOptions(locale), [locale]);
  const refreshAgents = useCallback(() => {
    fetchUsers().then(rows => {
      const list = Array.isArray(rows) ? rows : [];
      setTeamAgents(filterActiveMspAgents(list));
      setAgentCount(countActiveMspAgents(list));
    }).catch(() => {
      setTeamAgents([]);
      setAgentCount(null);
    });
  }, []);
  const agentAtLimit = maxMspAgents != null && agentCount != null && agentCount >= maxMspAgents;
  useEffect(() => {
    if (current?.key !== "agents") return;
    refreshAgents();
  }, [current?.key, refreshAgents]);
  useEffect(() => {
    if (current?.key !== "license") return;
    let cancelled = false;
    setLicenseLoading(true);
    getLicenseStatus().then(info => {
      if (cancelled) return;
      setLicenseValid(Boolean(info?.license?.valid));
    }).catch(() => {
      if (!cancelled) setLicenseValid(false);
    }).finally(() => {
      if (!cancelled) setLicenseLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [current?.key]);
  const stepMeta = useMemo(() => steps.map(s => ({
    id: s.id,
    key: s.key,
    label: s.label
  })), [steps]);
  const stepsDone = useMemo(() => {
    const map = {};
    steps.forEach(s => {
      map[s.key] = s.id < displayStep;
    });
    map[steps[displayStep - 1].key] = false;
    return map;
  }, [displayStep, steps]);
  const patchDay = useCallback((day, patch) => {
    setWeekSchedule(prev => prev.map(row => row.day === day ? {
      ...row,
      ...patch
    } : row));
  }, [setWeekSchedule]);
  const applyWeekdaysTemplate = useCallback(() => {
    setWeekSchedule(prev => prev.map(row => ({
      ...row,
      enabled: row.day >= 1 && row.day <= 5,
      open: row.open || "09:00",
      close: row.close || "18:00"
    })));
  }, [setWeekSchedule]);
  const handleContinue = async () => {
    if (ONBOARDING_SAVE_STEP_KEYS.has(current.key)) {
      const handlerName = SAVE_HANDLERS[current.key];
      const saved = await setup[handlerName]?.();
      if (!saved) return;
    }
    if (current.key === "license") {
      if (licenseValid) {
        requestStepChange(displayStep + 1);
        return;
      }
      const key = licenseKey.trim();
      if (!key) {
        requestStepChange(displayStep + 1);
        return;
      }
      setActivatingLicense(true);
      try {
        await activateLicense(key);
        licenseActivatedRef.current = true;
        setLicenseValid(true);
        requestStepChange(displayStep + 1);
      } catch (err) {
        showError(err.message || forms.license.activateError);
      } finally {
        setActivatingLicense(false);
      }
      return;
    }
    requestStepChange(displayStep + 1);
  };
  const handleFinish = () => {
    onComplete();
    if (licenseActivatedRef.current) {
      window.setTimeout(() => window.location.reload(), 800);
    }
  };
  const handleSkip = () => {
    if (current.key === "license") {
      requestStepChange(displayStep + 1);
      return;
    }
    onComplete();
  };
  const primaryActionLabel = () => {
    if (current.key === "license" && !isLast) {
      if (activatingLicense) return forms.license.activating;
      if (licenseValid) return ui.continue;
      if (licenseKey.trim()) return ui.activateAndContinue;
      return ui.continue;
    }
    if (!isLast) {
      return saving ? ui.saving : ui.continue;
    }
    return ui.complete;
  };
  const isBusy = saving || activatingLicense;
  const handleThemeChange = nextTheme => {
    setWizardTheme(nextTheme);
    if (appTheme === "dark" !== (nextTheme === "dark")) {
      toggleTheme();
    }
  };
  const renderStepForm = () => {
    if (loading) {
      return <p className={styles.inlineFormHint}>{forms.shared.loading}</p>;
    }
    if (!draft) {
      return null;
    }
    if (current.key === "identity") {
      return <OnboardingIdentityForm labels={forms.identity} general={draft.general} employeeRangeOptions={employeeRangeOptions} onChange={patchGeneral} disabled={saving} />;
    }
    if (current.key === "support") {
      return <OnboardingSupportForm labels={forms.support} general={draft.general} onChange={patchGeneral} disabled={saving} />;
    }
    if (current.key === "hours") {
      return <OnboardingHoursForm labels={forms.hours} weekSchedule={draft.weekSchedule} onPatchDay={patchDay} onApplyWeekdaysTemplate={applyWeekdaysTemplate} disabled={saving} />;
    }
    if (current.key === "agents") {
      return <OnboardingAgentsStep labels={forms.agents} teamAgents={teamAgents} agentCount={agentCount} maxMspAgents={maxMspAgents} agentAtLimit={agentAtLimit} onCreated={refreshAgents} disabled={saving} />;
    }
    if (current.key === "license") {
      if (licenseLoading) {
        return <p className={styles.inlineFormHint}>{forms.shared.loading}</p>;
      }
      return <OnboardingLicenseForm labels={forms.license} licenseKey={licenseKey} onChange={setLicenseKey} disabled={isBusy || licenseValid} alreadyActive={licenseValid} />;
    }
    return null;
  };
  return <motion.div className={`${styles.overlay} ${styles[`overlay${wizardTheme === "dark" ? "Dark" : "Light"}`]}`} data-wizard-theme={wizardTheme} initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} transition={{
    duration: 0.35
  }}>
      <WizardAnimatedBackground theme={wizardTheme} />
      <div className={styles.wizardShell}>
        <SetupWizardLayout step={displayStep} steps={stepsDone} stepMeta={stepMeta} onStepClick={requestStepChange} locale={locale} onLocaleChange={setUserLocaleOverride} theme={wizardTheme} onThemeChange={handleThemeChange} themeAriaLabel={wizardTheme === "dark" ? ui.themeUseLight : ui.themeUseDark} wideCard={ONBOARDING_WIDE_CARD_KEYS.has(layoutCurrent?.key)} layoutText={layout}>
          <div ref={stepPanelRef} className={styles.stepPanel} style={panelMinHeight != null ? {
          minHeight: panelMinHeight
        } : undefined}>
            <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
              {contentVisible ? <motion.div key={`${locale}-${current.key}`} className={`${styles.stepBody} ${current.key === "agents" ? styles.stepBodyAgents : ""}`} initial={{
              opacity: 0,
              x: 16
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -12
            }} transition={{
              duration: 0.28,
              ease: "easeOut"
            }} onAnimationComplete={definition => {
              if (definition === "animate") handleEnterComplete();
            }}>
              <div className={styles.stepHeader}>
                <span className={styles.stepIconWrap} aria-hidden>
                  <Icon icon={current.icon} />
                </span>
                <div>
                  <p className={styles.stepKicker}>{ui.stepKicker(displayStep, total)}</p>
                  <h2 className={setupStyles.title}>{current.title}</h2>
                </div>
              </div>

              <p className={`${setupStyles.subtitle} ${current.key === "agents" ? styles.stepLeadCompact : ""} ${current.leadBefore ? styles.stepSubtitleWithBadge : ""}`}>
                {current.leadBefore ? <>
                    {current.leadBefore}
                    <ProFeatureBadge variant="inline" className={styles.stepInlineProBadge} />
                    {current.leadAfter}
                  </> : current.lead}
              </p>

              {current.pillars?.length > 0 && <div className={styles.pillarGrid}>
                  {current.pillars.map((pillar, index) => <article key={`${current.key}-pillar-${index}`} className={styles.pillarCard}>
                      <span className={styles.pillarIconWrap} aria-hidden>
                        <Icon icon={pillar.icon} />
                      </span>
                      <div className={styles.pillarBody}>
                        <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                        <p className={styles.pillarText}>{pillar.text}</p>
                      </div>
                    </article>)}
                </div>}

              {current.paragraphs?.length > 0 && <div className={styles.stepNarrative}>
                  {current.paragraphs.map((paragraph, index) => <p key={`${current.key}-p-${index}`}>{paragraph}</p>)}
                </div>}

              {current.bullets?.length > 0 && <ul className={current.key === "agents" ? styles.bulletListCompact : styles.bulletList}>
                  {current.bullets.map((item, index) => <li key={`${current.key}-${index}`} className={styles.bulletItem}>
                      <Icon icon="mdi:check-circle-outline" className={styles.bulletIcon} aria-hidden />
                      <span>{item}</span>
                    </li>)}
                </ul>}

              {current.key === "agents" ? <div className={styles.agentsStepPanel}>{renderStepForm()}</div> : renderStepForm()}

              {current.tip && <p className={styles.tip}>{current.tip}</p>}

              <div className={`${setupStyles.actions} ${styles.stepActions} ${current.key === "agents" ? styles.stepActionsAgents : ""}`}>
                {displayStep > 1 && <button type="button" className={setupStyles.btnSecondary} onClick={() => requestStepChange(displayStep - 1)} disabled={isBusy}>
                    {ui.previous}
                  </button>}

                {isLast ? <button type="button" className={setupStyles.btnPrimary} onClick={handleFinish} disabled={isBusy}>
                    {primaryActionLabel()}
                  </button> : <button type="button" className={setupStyles.btnPrimary} onClick={handleContinue} disabled={isBusy}>
                    {primaryActionLabel()}
                  </button>}
              </div>
                </motion.div> : null}
            </AnimatePresence>
          </div>
        </SetupWizardLayout>
      </div>

      <button type="button" className={styles.skipGuideFixed} onClick={handleSkip} disabled={isBusy}>
        {current.key === "license" ? ui.skipLicenseStep : ui.skip}
      </button>
    </motion.div>;
}
