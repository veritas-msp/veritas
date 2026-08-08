import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { createUser } from "../../api/users";
import API_BASE_URL from "../../config";
import { buildDefaultAgentDraft, resolveAgentProfileName } from "../AdminPage/adminOrgFormConstants";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import styles from "./OnboardingWizard.module.css";
const AVATAR_GRADIENTS = ["linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)", "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)", "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)", "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)"];
function hashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function getAgentDisplayName(user) {
  const username = String(user?.username || "").trim();
  if (username) return username;
  const email = String(user?.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return "?";
}
function getAgentInitials(user) {
  const name = getAgentDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@";
  let password = "";
  for (let i = 0; i < 12; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}
async function fetchProfilesList() {
  const res = await fetch(`${API_BASE_URL}/profiles`, {
    credentials: "include"
  });
  if (!res.ok) throw new Error("profiles");
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.profiles || [];
  return raw.map(profile => {
    if (profile.name === "responsable") return {
      ...profile,
      label: "Responsable"
    };
    if (profile.name === "tech_hd") return {
      ...profile,
      label: "Helpdesk"
    };
    return profile;
  });
}
export default function OnboardingAgentsStep({
  labels,
  teamAgents = [],
  agentCount,
  maxMspAgents,
  agentAtLimit,
  onCreated,
  disabled
}) {
  const [draft, setDraft] = useState(() => buildDefaultAgentDraft());
  const [defaultProfile, setDefaultProfile] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [celebration, setCelebration] = useState(null);
  useEffect(() => {
    fetchProfilesList().then(rows => setDefaultProfile(resolveAgentProfileName(rows))).catch(() => setDefaultProfile(resolveAgentProfileName([])));
  }, []);
  useEffect(() => {
    if (!celebration) return undefined;
    const timer = window.setTimeout(() => setCelebration(null), 3200);
    return () => window.clearTimeout(timer);
  }, [celebration]);
  const progressPercent = useMemo(() => {
    if (maxMspAgents == null || agentCount == null || maxMspAgents <= 0) return 0;
    return Math.min(100, Math.round(agentCount / maxMspAgents * 100));
  }, [agentCount, maxMspAgents]);
  const emptySlots = useMemo(() => {
    if (maxMspAgents == null || agentCount == null) return 0;
    return Math.max(0, maxMspAgents - teamAgents.length);
  }, [agentCount, maxMspAgents, teamAgents.length]);
  const resetDraft = useCallback(() => {
    setDraft(buildDefaultAgentDraft(defaultProfile));
    setShowPassword(false);
  }, [defaultProfile]);
  const handleGeneratePassword = () => {
    const password = generateTempPassword();
    setDraft(prev => ({
      ...prev,
      password,
      password2: password
    }));
    setShowPassword(true);
  };
  const handleSubmit = async event => {
    event.preventDefault();
    if (disabled || creating || agentAtLimit) return;
    const email = String(draft.email || "").trim();
    const username = String(draft.username || "").trim();
    const password = String(draft.password || "");
    if (!email.includes("@")) {
      toast.error(labels.invalidEmail);
      return;
    }
    if (password.length < 6) {
      toast.error(labels.passwordTooShort);
      return;
    }
    setCreating(true);
    try {
      await createUser({
        email,
        username: username || email.split("@")[0],
        password,
        profile: draft.profile || defaultProfile,
        is_active: true
      });
      const displayName = username || email.split("@")[0];
      setCelebration(displayName);
      toast.success(labels.inviteSuccess(displayName));
      resetDraft();
      onCreated?.();
    } catch (err) {
      toast.error(err.message || labels.createError);
    } finally {
      setCreating(false);
    }
  };
  return <div className={styles.teamStep}>
      <div className={styles.teamBoard}>
        <div className={styles.teamHeaderCopy}>
          {agentCount != null && <p className={styles.teamCount}>{labels.countLabel(agentCount, maxMspAgents)}</p>}
          {maxMspAgents != null && <div className={styles.teamProgressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={maxMspAgents} aria-valuenow={agentCount ?? 0} aria-label={labels.progressAria(maxMspAgents)}>
              <motion.div className={styles.teamProgressFill} initial={false} animate={{
            width: `${progressPercent}%`
          }} transition={{
            type: "spring",
            stiffness: 120,
            damping: 18
          }} />
            </div>}
        </div>

        <div className={styles.teamRoster} aria-label={labels.rosterAria}>
        <AnimatePresence initial={false}>
          {teamAgents.map((agent, index) => <motion.div key={agent.id ?? `${agent.email}-${index}`} className={styles.teamMember} initial={{
            opacity: 0,
            scale: 0.72,
            y: 8
          }} animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }} exit={{
            opacity: 0,
            scale: 0.9
          }} transition={{
            type: "spring",
            stiffness: 260,
            damping: 22
          }}>
              <div className={styles.teamAvatar} style={{
              background: AVATAR_GRADIENTS[hashString(agent.email || agent.id) % AVATAR_GRADIENTS.length]
            }}>
                {getAgentInitials(agent)}
              </div>
              <span className={styles.teamMemberName}>{getAgentDisplayName(agent)}</span>
            </motion.div>)}
        </AnimatePresence>

        {emptySlots > 0 && Array.from({
          length: emptySlots
        }, (_, index) => <div key={`slot-${index}`} className={styles.teamSlotEmpty} aria-hidden={index > 0} aria-label={index === 0 ? labels.slotEmpty : undefined}>
              <Icon icon="mdi:plus" />
            </div>)}
      </div>
      </div>

      <AnimatePresence>
        {celebration && <motion.p className={styles.teamCelebration} initial={{
        opacity: 0,
        y: 6
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: -4
      }}>
            <Icon icon="mdi:party-popper" aria-hidden />
            {labels.inviteSuccess(celebration)}
          </motion.p>}
      </AnimatePresence>

      {agentAtLimit ? <p className={styles.teamLimitBanner}>
          {labels.limitReachedBefore(maxMspAgents)}
          <ProFeatureBadge variant="inline" className={styles.teamLimitProBadge} />
          {labels.limitReachedAfter}
        </p> : <form className={styles.teamInviteCard} onSubmit={handleSubmit}>
          <div className={styles.teamInviteHeader}>
            <span className={styles.teamInviteBadge} aria-hidden>
              <Icon icon="mdi:account-plus-outline" />
            </span>
            <div>
              <h3 className={styles.teamInviteTitle}>{labels.inviteTitle}</h3>
              <p className={styles.teamInviteLead}>{labels.inviteLead}</p>
            </div>
          </div>

          <div className={styles.teamInviteFields}>
            <div className={styles.inlineFormField}>
              <label className={styles.inlineFormLabel} htmlFor="onboarding-agent-name">
                {labels.nameLabel}
              </label>
              <input id="onboarding-agent-name" type="text" className={styles.inlineFormInput} value={draft.username} onChange={e => setDraft(prev => ({
            ...prev,
            username: e.target.value
          }))} placeholder={labels.namePlaceholder} maxLength={80} disabled={disabled || creating} autoComplete="off" />
            </div>
            <div className={styles.inlineFormField}>
              <label className={styles.inlineFormLabel} htmlFor="onboarding-agent-email">
                {labels.emailLabel}
              </label>
              <input id="onboarding-agent-email" type="email" className={styles.inlineFormInput} value={draft.email} onChange={e => setDraft(prev => ({
            ...prev,
            email: e.target.value
          }))} placeholder={labels.emailPlaceholder} disabled={disabled || creating} autoComplete="off" />
            </div>
          </div>

          <div className={styles.teamPasswordRow}>
            <div className={styles.inlineFormField}>
              <label className={styles.inlineFormLabel} htmlFor="onboarding-agent-password">
                {labels.passwordLabel}
              </label>
              <input id="onboarding-agent-password" type={showPassword ? "text" : "password"} className={styles.inlineFormInput} value={draft.password} onChange={e => setDraft(prev => ({
            ...prev,
            password: e.target.value,
            password2: e.target.value
          }))} placeholder={labels.passwordPlaceholder} disabled={disabled || creating} autoComplete="new-password" />
            </div>
            <div className={styles.teamPasswordActions}>
              <button type="button" className={styles.teamGhostBtn} onClick={handleGeneratePassword} disabled={disabled || creating} title={labels.generatePassword}>
                <Icon icon="mdi:dice-multiple-outline" aria-hidden />
                {labels.generatePassword}
              </button>
              <button type="button" className={styles.teamIconBtn} onClick={() => setShowPassword(value => !value)} disabled={disabled || creating} aria-label={showPassword ? labels.hidePassword : labels.showPassword}>
                <Icon icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"} />
              </button>
            </div>
          </div>

          <button type="submit" className={styles.teamInviteSubmit} disabled={disabled || creating}>
            <Icon icon="mdi:rocket-launch-outline" aria-hidden />
            {creating ? labels.inviting : labels.inviteButton}
          </button>
        </form>}

    </div>;
}
