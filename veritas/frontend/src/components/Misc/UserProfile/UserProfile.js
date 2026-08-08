import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchCurrentUser, resetPassword, updateEmail, updateUsername } from "../../../api/users";
import { saveUserSetting } from "../../../api/userSettings";
import { fetchNotificationPreferences, saveNotificationPreferences } from "../../../api/notifications";
import { setupMfa, verifyMfa } from "../../../api/mfa";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import AvatarEditor from "../../shared/UserAvatar/AvatarEditor";
import UserAvatar from "../../shared/UserAvatar/UserAvatar";
import { DEFAULT_TICKET_CHAT_UI_SETTINGS, TICKET_CHAT_UI_SETTINGS_KEY, normalizeTicketChatUiSettings } from "../../../utils/ticketChatUiSettings";
import { DEFAULT_USER_IN_APP_PREFERENCES, normalizeUserInAppPreferences } from "../../../utils/inAppNotificationSettings";
import { Modal, ModalFooter, ModalForm, IconField, Input, Btn, BtnIcon, FieldRow, Switch } from "../../AdminPage/AdminUi";
import layout from "../../EnterprisesPage/EnterprisesPage.module.css";
import account from "../AccountPage/AccountPage.module.css";
import s from "./UserProfile.module.css";
import { formatProfileDate, getLocalizedNotifEventOptions, getMfaStatus, getMspModules, getNotificationsSectionDescription, getUserProfileCopy } from "./userProfileI18n";
function getMfaKpiTone(key) {
  if (key === "enabled") return "green";
  if (key === "pending") return "amber";
  return "orange";
}
function SectionPanel({
  title,
  description,
  children,
  full
}) {
  return <section className={`${account.sectionPanel} ${full ? account.sectionPanelFull : ""}`}>
      <header className={account.sectionHeader}>
        <h2 className={account.sectionTitle}>{title}</h2>
        {description && <p className={account.sectionDesc}>{description}</p>}
      </header>
      <div className={account.sectionBody}>{children}</div>
    </section>;
}
export default function UserProfile() {
  const locale = useAppLocale();
  const t = useMemo(() => getUserProfileCopy(locale), [locale]);
  const notifEventOptions = useMemo(() => getLocalizedNotifEventOptions(locale), [locale]);
  const mspModules = useMemo(() => getMspModules(locale), [locale]);
  const {
    patchUser
  } = useAuthContext();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usernameModal, setUsernameModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [mfaModal, setMfaModal] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPwd1, setDraftPwd1] = useState("");
  const [draftPwd2, setDraftPwd2] = useState("");
  const [helpdeskName, setHelpdeskName] = useState("");
  const [savingHelpdesk, setSavingHelpdesk] = useState(false);
  const [chatUiSettings, setChatUiSettings] = useState(DEFAULT_TICKET_CHAT_UI_SETTINGS);
  const [savingChatUi, setSavingChatUi] = useState(false);
  const [notifAdminDefaults, setNotifAdminDefaults] = useState(null);
  const [notifPreferences, setNotifPreferences] = useState(DEFAULT_USER_IN_APP_PREFERENCES);
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const loadUser = useCallback(async () => {
    try {
      const [data, notifPayload] = await Promise.all([fetchCurrentUser(), fetchNotificationPreferences().catch(() => null)]);
      setUser(data);
      setHelpdeskName(data.ticket_helpdesk_display_name || "");
      setChatUiSettings(normalizeTicketChatUiSettings(data.ticket_chat_ui_settings));
      if (notifPayload) {
        setNotifAdminDefaults(notifPayload.adminDefaults || null);
        setNotifPreferences(normalizeUserInAppPreferences(notifPayload.userPreferences));
      }
    } catch {
      toast.error(t.toast.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.toast.loadError]);
  useEffect(() => {
    loadUser();
  }, [loadUser]);
  const mfaStatus = useMemo(() => {
    const status = getMfaStatus(user, locale);
    return {
      ...status,
      className: s[status.className],
      desc: status.key === "enabled" ? t.mfa.enabledDesc : status.key === "pending" ? t.mfa.pendingDesc : t.mfa.offDesc
    };
  }, [user, locale, t.mfa]);
  const displayName = user?.username?.trim() || user?.email || "-";
  const roleLabel = t.roles[user?.role] || user?.role || "-";
  const profileName = user?.profile || "-";
  const profileLabel = user?.profile_label || user?.profile || "-";
  const handleAvatarUpdated = avatar => {
    setUser(prev => ({
      ...(prev || {}),
      avatar: avatar || undefined
    }));
    patchUser?.({
      avatar: avatar || undefined
    });
  };
  const openUsernameModal = () => {
    setDraftUsername("");
    setUsernameModal(true);
  };
  const openEmailModal = () => {
    setDraftEmail("");
    setEmailModal(true);
  };
  const openPasswordModal = () => {
    setDraftPwd1("");
    setDraftPwd2("");
    setPasswordModal(true);
  };
  const handleSaveUsername = async () => {
    const value = draftUsername.trim();
    if (value.length < 2) return toast.error(t.toast.usernameTooShort);
    setSavingIdentity(true);
    try {
      await updateUsername(user.id, value);
      toast.success(t.toast.usernameUpdated);
      setUsernameModal(false);
      await loadUser();
    } catch {
      toast.error(t.toast.usernameError);
    } finally {
      setSavingIdentity(false);
    }
  };
  const handleSaveEmail = async () => {
    const value = draftEmail.trim();
    if (!value.includes("@")) return toast.error(t.toast.emailInvalid);
    setSavingIdentity(true);
    try {
      await updateEmail(user.id, value);
      toast.success(t.toast.emailUpdated);
      setEmailModal(false);
      await loadUser();
    } catch {
      toast.error(t.toast.emailError);
    } finally {
      setSavingIdentity(false);
    }
  };
  const handleSavePassword = async () => {
    if (draftPwd1.length < 6) return toast.error(t.toast.passwordTooShort);
    if (draftPwd1 !== draftPwd2) return toast.error(t.toast.passwordMismatch);
    setSavingIdentity(true);
    try {
      await resetPassword(user.id, draftPwd1);
      toast.success(t.toast.passwordUpdated);
      setPasswordModal(false);
    } catch {
      toast.error(t.toast.passwordError);
    } finally {
      setSavingIdentity(false);
    }
  };
  const handleSaveHelpdeskName = async () => {
    setSavingHelpdesk(true);
    try {
      const value = helpdeskName.trim() || null;
      await saveUserSetting("ticket_helpdesk_display_name", value);
      toast.success(t.toast.helpdeskSaved);
      await loadUser();
    } catch {
      toast.error(t.toast.helpdeskError);
    } finally {
      setSavingHelpdesk(false);
    }
  };
  const handleSaveChatUiSettings = async () => {
    setSavingChatUi(true);
    try {
      const payload = normalizeTicketChatUiSettings(chatUiSettings);
      await saveUserSetting(TICKET_CHAT_UI_SETTINGS_KEY, payload);
      setChatUiSettings(payload);
      toast.success(t.toast.chatUiSaved);
      await loadUser();
    } catch {
      toast.error(t.toast.chatUiError);
    } finally {
      setSavingChatUi(false);
    }
  };
  const handleSaveNotifPreferences = async () => {
    setSavingNotifPrefs(true);
    try {
      const payload = normalizeUserInAppPreferences(notifPreferences);
      const saved = await saveNotificationPreferences(payload);
      setNotifPreferences(normalizeUserInAppPreferences(saved.userPreferences || payload));
      setNotifAdminDefaults(saved.adminDefaults || notifAdminDefaults);
      toast.success(t.toast.notifSaved);
    } catch {
      toast.error(t.toast.notifError);
    } finally {
      setSavingNotifPrefs(false);
    }
  };
  const handleResetNotifPreferences = () => {
    setNotifPreferences(normalizeUserInAppPreferences(DEFAULT_USER_IN_APP_PREFERENCES));
  };
  const updateNotifEvent = (eventKey, enabled) => {
    setNotifPreferences(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [eventKey]: {
          enabled
        }
      }
    }));
  };
  const startMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const data = await setupMfa();
      setMfaSetup(data);
      setMfaCode("");
      setMfaModal(true);
    } catch (err) {
      toast.error(err.message || t.toast.mfaSetupError);
    } finally {
      setMfaBusy(false);
    }
  };
  const handleVerifyMfa = async () => {
    if (mfaCode.trim().length < 6) return;
    setMfaBusy(true);
    try {
      await verifyMfa(mfaCode.trim());
      toast.success(t.toast.mfaEnabled);
      setMfaModal(false);
      setMfaSetup(null);
      setMfaCode("");
      await loadUser();
    } catch (err) {
      toast.error(err.message || t.toast.mfaInvalidCode);
    } finally {
      setMfaBusy(false);
    }
  };
  if (loading) {
    return <div className={layout.page}>
        <div className={`${layout.shell} ${layout.shellFluid}`}>
          <div className={layout.stateBox}>
            <Icon icon="mdi:loading" className={layout.spinning} />
            <span>{t.loading}</span>
          </div>
        </div>
      </div>;
  }
  if (!user) {
    return <div className={layout.page}>
        <div className={`${layout.shell} ${layout.shellFluid}`}>
          <div className={`${layout.stateBox} ${layout.stateBoxError}`}>
            <Icon icon="mdi:alert-circle-outline" />
            <span>{t.loadProfileError}</span>
          </div>
        </div>
      </div>;
  }
  const helpdeskPreview = helpdeskName.trim() || user.username || user.email || t.defaultAgent;
  const notifGloballyDisabled = notifAdminDefaults?.enabled === false;
  const notifUserEnabled = notifPreferences.enabled !== false;
  const activeNotifEventsCount = notifEventOptions.filter(option => {
    if (!notifUserEnabled || notifGloballyDisabled) return false;
    if (notifAdminDefaults?.events?.[option.key]?.enabled === false) return false;
    return notifPreferences.events?.[option.key]?.enabled !== false;
  }).length;
  return <div className={layout.page}>
      <div className={`${layout.shell} ${layout.shellFluid}`}>
        {user.is_active === false && <div className={account.alertBanner}>
            <Icon icon="mdi:alert-circle-outline" className={account.alertIcon} />
            {t.accountDisabled}
          </div>}

        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:account-circle-outline" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={layout.pageTitle}>{t.pageTitle}</h1>
            <p className={layout.pageSubtitle}>
              {displayName} · {user.email}
            </p>
          </div>
          <div className={layout.heroActions}>
            <UserAvatar user={user} name={displayName} size={80} variant="agent" />
          </div>
        </header>

        <div className={`${layout.kpiRow} ${account.kpiRow3}`}>
          <div className={`${layout.kpiCard} ${account.kpiStatic}`}>
            <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_blue}`}>
              <Icon icon="mdi:account-key" />
            </div>
            <div className={layout.kpiBody}>
              <span className={layout.kpiValue}>{roleLabel}</span>
              <span className={layout.kpiLabel}>{t.kpi.role}</span>
            </div>
          </div>
          <div className={`${layout.kpiCard} ${account.kpiStatic}`}>
            <div className={`${layout.kpiIconWrap} ${mfaStatus.key === "enabled" ? account.kpiIcon_green : layout[`kpiIcon_${getMfaKpiTone(mfaStatus.key)}`]}`}>
              <Icon icon={mfaStatus.icon} />
            </div>
            <div className={layout.kpiBody}>
              <span className={layout.kpiValue}>{mfaStatus.label}</span>
              <span className={layout.kpiLabel}>{t.kpi.mfa}</span>
            </div>
          </div>
          <div className={`${layout.kpiCard} ${account.kpiStatic}`}>
            <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_blue}`}>
              <Icon icon="mdi:shield-account-outline" />
            </div>
            <div className={layout.kpiBody}>
              <span className={layout.kpiValue}>{profileName}</span>
              <span className={layout.kpiLabel}>{t.kpi.mspProfile}</span>
            </div>
          </div>
        </div>

        <div className={account.contentScroll}>
          <div className={account.contentGrid}>
            <SectionPanel title={t.sections.identity.title} description={t.sections.identity.description}>
              <div className={s.settingRow}>
                <div className={s.settingInfo}>
                  <span className={s.settingLabel}>{t.identity.username}</span>
                  <span className={s.settingHint}>{t.identity.usernameHint}</span>
                  <span className={s.settingValue}>{user.username || "-"}</span>
                </div>
                <div className={s.settingAction}>
                  <BtnIcon icon="mdi:pencil-outline" title={t.identity.editUsername} onClick={openUsernameModal} />
                </div>
              </div>
              <div className={s.settingRow}>
                <div className={s.settingInfo}>
                  <span className={s.settingLabel}>{t.identity.email}</span>
                  <span className={s.settingHint}>{t.identity.emailHint}</span>
                  <span className={s.settingValue}>{user.email}</span>
                </div>
                <div className={s.settingAction}>
                  <BtnIcon icon="mdi:pencil-outline" title={t.identity.editEmail} onClick={openEmailModal} />
                </div>
              </div>
              <div className={s.settingRow}>
                <div className={s.settingInfo}>
                  <span className={s.settingLabel}>{t.identity.password}</span>
                  <span className={s.settingHint}>{t.identity.passwordHint}</span>
                  <span className={s.settingValue}>••••••••••••</span>
                </div>
                <div className={s.settingAction}>
                  <BtnIcon icon="mdi:key-outline" title={t.identity.changePassword} onClick={openPasswordModal} />
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title={t.sections.photo.title} description={t.sections.photo.description}>
              <AvatarEditor user={user} displayName={displayName} onUpdated={handleAvatarUpdated} />
            </SectionPanel>

            <SectionPanel title={t.sections.security.title} description={t.sections.security.description}>
              <div className={`${s.mfaBanner} ${mfaStatus.className}`}>
                <Icon icon={mfaStatus.icon} className={`${s.mfaIcon} ${s[`mfaIcon_${mfaStatus.key}`]}`} />
                <div className={s.mfaBody}>
                  <h3 className={s.mfaTitle}>{mfaStatus.label}</h3>
                  <p className={s.mfaDesc}>{mfaStatus.desc}</p>
                  {mfaStatus.key !== "enabled" && <div className={s.mfaActions}>
                      <Btn icon="mdi:shield-key-outline" onClick={startMfaSetup} disabled={mfaBusy}>
                        {mfaStatus.key === "pending" ? t.mfa.continueSetup : t.mfa.enable}
                      </Btn>
                    </div>}
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title={t.sections.helpdesk.title} description={t.sections.helpdesk.description}>
              <div className={s.helpdeskForm}>
                <IconField icon="mdi:badge-account-outline" label={t.helpdesk.label} hint={t.helpdesk.hint}>
                  <Input value={helpdeskName} onChange={e => setHelpdeskName(e.target.value)} placeholder={user.username || t.helpdesk.placeholder} maxLength={80} />
                </IconField>
                <div className={s.helpdeskPreview}>
                  {t.helpdesk.preview} <strong>{helpdeskPreview}</strong>
                </div>
                <div>
                  <Btn icon="mdi:content-save-outline" onClick={handleSaveHelpdeskName} disabled={savingHelpdesk}>
                    {savingHelpdesk ? t.helpdesk.saving : t.helpdesk.save}
                  </Btn>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title={t.sections.accessibility.title} description={t.sections.accessibility.description}>
              <div className={s.chatAccessibility}>
                <label className={s.chatPreviewLabel}>{t.chat.previewLabel}</label>
                <div className={s.chatPreview} style={{
                gap: `${Number(chatUiSettings.messageSpacingPx)}px`
              }}>
                  <article className={s.chatBubble}>
                    <div className={s.chatBubbleMeta}>
                      <UserAvatar user={user} name={helpdeskPreview} size={32} variant="agent" />
                      <strong className={s.chatAuthor}>{helpdeskPreview}</strong>
                      <span className={s.chatTime}>10:21</span>
                    </div>
                    <div className={s.chatMessage} style={{
                    fontSize: `${Number(chatUiSettings.textSizePx)}px`
                  }}>
                      {t.chat.agentMessage}
                    </div>
                  </article>
                  <article className={s.chatBubble}>
                    <div className={s.chatBubbleMeta}>
                      <div className={`${s.chatAvatar} ${s.chatAvatarClient}`}>CL</div>
                      <strong className={s.chatAuthor}>{t.chat.clientLabel}</strong>
                      <span className={s.chatTime}>10:23</span>
                    </div>
                    <div className={s.chatMessage} style={{
                    fontSize: `${Number(chatUiSettings.textSizePx)}px`
                  }}>
                      {t.chat.clientMessage}
                    </div>
                  </article>
                </div>

                <div className={s.rangeField}>
                  <label className={s.rangeLabel} htmlFor="chat-text-size">
                    {t.chat.textSize}
                  </label>
                  <input id="chat-text-size" type="range" className={s.rangeInput} min="12" max="24" step="1" value={Number(chatUiSettings.textSizePx)} onChange={e => setChatUiSettings(prev => ({
                  ...prev,
                  textSizePx: Number(e.target.value || 16)
                }))} />
                  <span className={s.rangeHint}>{Number(chatUiSettings.textSizePx)} px</span>
                </div>

                <div className={s.rangeField}>
                  <label className={s.rangeLabel} htmlFor="chat-message-spacing">
                    {t.chat.messageSpacing}
                  </label>
                  <input id="chat-message-spacing" type="range" className={s.rangeInput} min="0" max="24" step="1" value={Number(chatUiSettings.messageSpacingPx)} onChange={e => setChatUiSettings(prev => ({
                  ...prev,
                  messageSpacingPx: Number(e.target.value || 10)
                }))} />
                  <span className={s.rangeHint}>{Number(chatUiSettings.messageSpacingPx)} px</span>
                </div>

                <div>
                  <Btn icon="mdi:content-save-outline" onClick={handleSaveChatUiSettings} disabled={savingChatUi}>
                    {savingChatUi ? t.chat.saving : t.chat.savePrefs}
                  </Btn>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title={t.sections.notifications.title} description={getNotificationsSectionDescription(t, {
            notifGloballyDisabled,
            notifUserEnabled,
            activeCount: activeNotifEventsCount,
            total: notifEventOptions.length
          })}>
              {notifGloballyDisabled ? <div className={s.notifAdminBanner}>
                  <Icon icon="mdi:bell-off-outline" className={s.notifAdminBannerIcon} aria-hidden />
                  <p className={s.notifAdminBannerText}>{t.notifications.adminBanner}</p>
                </div> : <div className={s.notifPrefs}>
                  <FieldRow icon="mdi:bell-ring-outline" label={t.notifications.masterLabel} hint={t.notifications.masterHint} className={s.notifMasterRow}>
                    <Switch checked={notifUserEnabled} onChange={value => setNotifPreferences(prev => ({
                  ...prev,
                  enabled: value
                }))} />
                  </FieldRow>

                  <div className={`${s.notifEvents} ${!notifUserEnabled ? s.notifEventsDisabled : ""}`}>
                    {notifEventOptions.map(option => {
                  const adminEnabled = notifAdminDefaults?.events?.[option.key]?.enabled !== false;
                  const checked = notifPreferences.events?.[option.key]?.enabled !== false;
                  return <FieldRow key={option.key} icon={option.icon} label={option.label} hint={adminEnabled ? option.description : t.notifications.adminDisabledHint} className={s.notifEventRow}>
                          <Switch checked={adminEnabled && checked} disabled={!adminEnabled || !notifUserEnabled} onChange={value => updateNotifEvent(option.key, value)} />
                        </FieldRow>;
                })}
                  </div>

                  <p className={s.notifHint}>{t.notifications.hint}</p>

                  <div className={s.notifActions}>
                    <Btn variant="ghost" onClick={handleResetNotifPreferences} disabled={savingNotifPrefs}>
                      {t.notifications.reset}
                    </Btn>
                    <Btn icon="mdi:content-save-outline" onClick={handleSaveNotifPreferences} disabled={savingNotifPrefs}>
                      {savingNotifPrefs ? t.notifications.saving : t.notifications.save}
                    </Btn>
                  </div>
                </div>}
            </SectionPanel>

            <SectionPanel title={t.sections.mspProfile.title} description={t.sections.mspProfile.description}>
              <p className={s.profileDesc}>{profileLabel}</p>
              <div className={s.modulesGrid}>
                {mspModules.map(mod => {
                const enabled = Boolean(user[mod.key]);
                return <div key={mod.key} className={`${s.moduleChip} ${enabled ? s.moduleChip_on : s.moduleChip_off}`} title={enabled ? mod.accessGranted : mod.accessDenied}>
                      <Icon icon={enabled ? mod.icon : "mdi:lock-outline"} className={s.moduleIcon} />
                      {mod.label}
                    </div>;
              })}
              </div>
            </SectionPanel>

            <SectionPanel title={t.sections.activity.title} description={t.sections.activity.description}>
              <div className={s.settingRow}>
                <div className={s.settingInfo}>
                  <span className={s.settingLabel}>{t.activity.created}</span>
                  <span className={s.settingValue}>{formatProfileDate(user.created_at, locale)}</span>
                </div>
              </div>
              <div className={s.settingRow}>
                <div className={s.settingInfo}>
                  <span className={s.settingLabel}>{t.activity.lastLogin}</span>
                  <span className={s.settingValue}>{formatProfileDate(user.last_login_at, locale)}</span>
                </div>
              </div>
            </SectionPanel>
          </div>
        </div>
      </div>

      <Modal open={usernameModal} onClose={() => setUsernameModal(false)} title={t.modals.username.title} icon="mdi:account-edit-outline" width="440px" footer={<ModalFooter onCancel={() => setUsernameModal(false)} onConfirm={handleSaveUsername} confirmLabel={t.modals.save} confirmLoading={savingIdentity} confirmDisabled={!draftUsername.trim()} />}>
        <ModalForm>
          <IconField icon="mdi:account" label={t.modals.username.label} hint={t.modals.username.hint}>
            <Input value={draftUsername} onChange={e => setDraftUsername(e.target.value)} placeholder={user.username || t.modals.username.placeholder} autoFocus maxLength={50} />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} title={t.modals.email.title} icon="mdi:email-edit-outline" width="440px" footer={<ModalFooter onCancel={() => setEmailModal(false)} onConfirm={handleSaveEmail} confirmLabel={t.modals.save} confirmLoading={savingIdentity} confirmDisabled={!draftEmail.trim()} />}>
        <ModalForm>
          <IconField icon="mdi:email-outline" label={t.modals.email.label}>
            <Input type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} placeholder={user.email} autoFocus />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={passwordModal} onClose={() => setPasswordModal(false)} title={t.modals.password.title} icon="mdi:lock-reset" width="440px" footer={<ModalFooter onCancel={() => setPasswordModal(false)} onConfirm={handleSavePassword} confirmLabel={t.modals.password.confirmAction} confirmLoading={savingIdentity} confirmDisabled={!draftPwd1 || !draftPwd2} />}>
        <ModalForm>
          <IconField icon="mdi:lock-outline" label={t.modals.password.label} hint={t.modals.password.hint}>
            <Input type="password" value={draftPwd1} onChange={e => setDraftPwd1(e.target.value)} autoFocus />
          </IconField>
          <IconField icon="mdi:lock-check-outline" label={t.modals.password.confirm}>
            <Input type="password" value={draftPwd2} onChange={e => setDraftPwd2(e.target.value)} />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={mfaModal} onClose={() => {
      setMfaModal(false);
      setMfaSetup(null);
      setMfaCode("");
    }} title={t.modals.mfa.title} icon="mdi:shield-key-outline" width="480px" footer={<ModalFooter onCancel={() => {
      setMfaModal(false);
      setMfaSetup(null);
      setMfaCode("");
    }} onConfirm={handleVerifyMfa} confirmLabel={t.modals.mfa.enable} confirmLoading={mfaBusy} confirmDisabled={mfaCode.length < 6} />}>
        {mfaSetup && <>
            <p className={s.mfaDesc}>{t.modals.mfa.desc}</p>
            <div className={s.qrWrap}>
              <img src={mfaSetup.qrCodeDataUrl} alt={t.modals.mfa.qrAlt} className={s.qr} />
            </div>
            <p className={s.secret}>
              {t.modals.mfa.manualKey} <code>{mfaSetup.secret}</code>
            </p>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))} className={s.codeInput} disabled={mfaBusy} />
          </>}
      </Modal>
    </div>;
}
