import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchCurrentUser, resetPassword, updateUsername } from "../../api/users";
import { setupMfa, verifyMfa } from "../../api/mfa";
import { fetchPortalContact, updatePortalContact } from "../../api/clientPortalProfile";
import AvatarEditor from "../shared/UserAvatar/AvatarEditor";
import UserAvatar from "../shared/UserAvatar/UserAvatar";
import ContactCommunicationsEditor from "../ContactsPage/ContactCommunicationsEditor";
import { Modal, ModalFooter, ModalForm, IconField, Input, BtnIcon, Btn } from "../AdminPage/AdminUi";
import { enforcePrimaryCommunications, getPrimaryCommunicationValue, hasIncompleteCommunications, normalizeContactCommunications, sortCommunicationsByType, syncLegacyContactFields } from "../../utils/contactCommunications";
import { getCommunicationTypeDefLocalized } from "../ContactsPage/contactFormModalI18n";
import { validateContactCommunicationsLocalized } from "../ContactsPage/contactFormModalI18n";
import { getClientPortalCopy } from "./clientPortalI18n";
import portalLayout from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import contactStyles from "../ContactsPage/ContactDetailPage.module.css";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
function normalizePhone(value) {
  let normalized = String(value || "").trim();
  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }
  return normalized.replace(/[^\d+]/g, "");
}
function toTelHref(value) {
  const normalized = normalizePhone(value);
  return normalized ? `tel:${normalized}` : "";
}
function toMailtoHref(value) {
  const email = String(value || "").trim();
  return email ? `mailto:${encodeURIComponent(email)}` : "";
}
function resolvePrimaryEmail(source) {
  return getPrimaryCommunicationValue(normalizeContactCommunications(source || {}), "email");
}
export default function ClientProfilePage() {
  const {
    user: authUser,
    patchUser,
    setMfaEnabledFlag
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.profile;
  const [profile, setProfile] = useState(null);
  const [contact, setContact] = useState(null);
  const [contactUnavailable, setContactUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usernameModal, setUsernameModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");
  const [draftPwd1, setDraftPwd1] = useState("");
  const [draftPwd2, setDraftPwd2] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [draftCommunications, setDraftCommunications] = useState([]);
  const [portalEmailConfirm, setPortalEmailConfirm] = useState(null);
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const mfaStatus = useMemo(() => copy.getMfaStatus(profile), [copy, profile]);
  const loadProfile = useCallback(async () => {
    try {
      const userData = await fetchCurrentUser();
      setProfile(userData);
      try {
        const payload = await fetchPortalContact();
        setContact(payload.contact || null);
        setContactUnavailable(false);
      } catch {
        setContact(null);
        setContactUnavailable(true);
      }
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  const displayCommunications = useMemo(() => sortCommunicationsByType(normalizeContactCommunications(contact || {})), [contact]);
  const handleAvatarUpdated = avatar => {
    setProfile(prev => ({
      ...(prev || {}),
      avatar: avatar || undefined
    }));
    patchUser?.({
      avatar: avatar || undefined
    });
  };
  const displayName = profile?.username?.trim() || profile?.email || authUser?.email || "-";
  const openUsernameModal = () => {
    setDraftUsername("");
    setUsernameModal(true);
  };
  const openPasswordModal = () => {
    setDraftPwd1("");
    setDraftPwd2("");
    setPasswordModal(true);
  };
  const startEditContact = () => {
    setDraftCommunications(normalizeContactCommunications(contact || {}));
    setEditingContact(true);
  };
  const cancelEditContact = () => {
    setEditingContact(false);
    setDraftCommunications([]);
  };
  const handleSaveUsername = async () => {
    const value = draftUsername.trim();
    if (value.length < 2) {
      toast.error(t.toast.usernameTooShort);
      return;
    }
    setSaving(true);
    try {
      await updateUsername(profile.id, value);
      setProfile(prev => ({
        ...(prev || {}),
        username: value
      }));
      patchUser?.({
        username: value
      });
      toast.success(t.toast.usernameUpdated);
      setUsernameModal(false);
    } catch (err) {
      toast.error(err.message || t.toast.usernameError);
    } finally {
      setSaving(false);
    }
  };
  const handleSavePassword = async () => {
    if (draftPwd1.length < 6) {
      toast.error(t.toast.passwordTooShort);
      return;
    }
    if (draftPwd1 !== draftPwd2) {
      toast.error(t.toast.passwordMismatch);
      return;
    }
    setSaving(true);
    try {
      await resetPassword(profile.id, draftPwd1);
      toast.success(t.toast.passwordUpdated);
      setPasswordModal(false);
    } catch (err) {
      toast.error(err.message || t.toast.passwordError);
    } finally {
      setSaving(false);
    }
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
      setMfaEnabledFlag?.(true);
      await loadProfile();
    } catch (err) {
      toast.error(err.message || t.toast.mfaInvalidCode);
    } finally {
      setMfaBusy(false);
    }
  };
  const performSaveContact = async communications => {
    setSaving(true);
    try {
      const payload = await updatePortalContact(communications);
      const updated = payload.contact;
      setContact(updated);
      setEditingContact(false);
      setDraftCommunications([]);
      setPortalEmailConfirm(null);
      const nextEmail = String(updated?.email || "").trim();
      if (nextEmail) {
        setProfile(prev => ({
          ...(prev || {}),
          email: nextEmail
        }));
        patchUser?.({
          email: nextEmail
        });
      }
      toast.success(t.toast.contactSaved);
    } catch (err) {
      toast.error(err.message || t.toast.contactError);
    } finally {
      setSaving(false);
    }
  };
  const handleSaveContact = async () => {
    if (hasIncompleteCommunications(draftCommunications)) {
      toast.error(t.toast.contactIncomplete);
      return;
    }
    const commError = validateContactCommunicationsLocalized(draftCommunications, locale);
    if (commError) {
      toast.error(commError);
      return;
    }
    const prepared = enforcePrimaryCommunications(draftCommunications.filter(entry => String(entry.value ?? "").trim()));
    const synced = syncLegacyContactFields(prepared);
    const previousPrimaryEmail = resolvePrimaryEmail(contact);
    const nextPrimaryEmail = String(synced.email || "").trim();
    const primaryEmailChanged = previousPrimaryEmail && nextPrimaryEmail && previousPrimaryEmail.toLowerCase() !== nextPrimaryEmail.toLowerCase();
    if (primaryEmailChanged) {
      setPortalEmailConfirm({
        communications: synced.communications,
        previousPrimaryEmail,
        nextPrimaryEmail
      });
      return;
    }
    await performSaveContact(synced.communications);
  };
  const handleConfirmPortalEmailChange = async () => {
    if (!portalEmailConfirm) return;
    await performSaveContact(portalEmailConfirm.communications);
  };
  return <div className={`${portalLayout.mainScrollFill} ${layout.page}`}>
      <div className={`${portalLayout.portalShell} ${tableStyles.ticketShell}`}>
        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:account-circle-outline" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={layout.pageTitle}>{t.pageTitle}</h1>
            <p className={layout.pageSubtitle}>
              {loading ? copy.common.loading : displayName}
            </p>
          </div>
          {!loading ? <div className={pageStyles.profileHeroAvatar}>
              <UserAvatar user={profile || authUser} name={displayName} size={72} variant="client" />
            </div> : null}
        </header>

        <div className={tableStyles.mainColumn}>
          {loading ? <div className={layout.stateBox}>
              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
              <span>{t.loadingProfile}</span>
            </div> : <div className={tableStyles.tablePanel}>
              <div className={pageStyles.panelContent}>
                <div className={pageStyles.profileStack}>
                  <section className={pageStyles.profileSection}>
                    <h2 className={pageStyles.profileSectionTitle}>{t.photoSectionTitle}</h2>
                    <p className={pageStyles.profileSectionDesc}>{t.photoSectionDesc}</p>
                    <AvatarEditor user={profile || authUser} displayName={displayName} onUpdated={handleAvatarUpdated} />
                  </section>

                  {!contactUnavailable ? <section className={pageStyles.profileSection}>
                      <div className={pageStyles.profileSectionHead}>
                        <div>
                          <h2 className={pageStyles.profileSectionTitle}>{t.coordinatesTitle}</h2>
                          <p className={pageStyles.profileSectionDesc}>{t.coordinatesDesc}</p>
                        </div>
                        {!editingContact ? <Btn icon="mdi:pencil-outline" variant="ghost" onClick={startEditContact}>
                            {t.editCoordinates}
                          </Btn> : null}
                      </div>

                      {editingContact ? <>
                          <ContactCommunicationsEditor communications={draftCommunications} onChange={setDraftCommunications} />
                          <div className={pageStyles.profileContactActions}>
                            <Btn variant="ghost" onClick={cancelEditContact} disabled={saving}>
                              {t.cancelEdit}
                            </Btn>
                            <Btn icon="mdi:content-save-outline" onClick={handleSaveContact} disabled={saving || hasIncompleteCommunications(draftCommunications)}>
                              {saving ? copy.common.saving : t.saveCoordinates}
                            </Btn>
                          </div>
                        </> : displayCommunications.length > 0 ? <div className={contactStyles.coordGrid}>
                          {displayCommunications.map(entry => {
                    const typeDef = getCommunicationTypeDefLocalized(entry.type, locale);
                    const href = entry.type === "email" ? toMailtoHref(entry.value) : entry.type === "telephone" ? toTelHref(entry.value) : null;
                    return <div key={entry.id} className={contactStyles.coordCard}>
                                <span className={contactStyles.coordIconWrap}>
                                  <Icon icon={typeDef.icon} aria-hidden />
                                </span>
                                <span className={contactStyles.coordText}>
                                  <span className={contactStyles.coordLabelRow}>
                                    <span className={contactStyles.coordLabel}>{typeDef.label}</span>
                                    {entry.isPrimary ? <Icon icon="mdi:star" className={contactStyles.coordFavoriteStar} title={t.coordFavorite} aria-label={t.coordFavorite} /> : null}
                                  </span>
                                  {href ? <a href={href} className={contactStyles.coordValueLink}>
                                      {entry.value}
                                    </a> : <span className={contactStyles.coordValue}>{entry.value}</span>}
                                </span>
                              </div>;
                  })}
                        </div> : <p className={pageStyles.profileEmptyHint}>{t.coordinatesEmpty}</p>}
                    </section> : null}

                  <section className={pageStyles.profileSection}>
                    <h2 className={pageStyles.profileSectionTitle}>{t.identityTitle}</h2>
                    <p className={pageStyles.profileSectionDesc}>{t.identityDesc}</p>

                    <div className={pageStyles.profileSettingRow}>
                      <div className={pageStyles.profileSettingInfo}>
                        <span className={pageStyles.profileSettingLabel}>{t.displayName}</span>
                        <span className={pageStyles.profileSettingHint}>{t.displayNameHint}</span>
                        <span className={pageStyles.profileSettingValue}>{profile?.username || "-"}</span>
                      </div>
                      <div className={pageStyles.profileSettingAction}>
                        <BtnIcon icon="mdi:pencil-outline" title={t.editDisplayName} onClick={openUsernameModal} />
                      </div>
                    </div>

                    <div className={pageStyles.profileSettingRow}>
                      <div className={pageStyles.profileSettingInfo}>
                        <span className={pageStyles.profileSettingLabel}>{t.loginEmail}</span>
                        <span className={pageStyles.profileSettingHint}>{t.loginEmailHint}</span>
                        <span className={pageStyles.profileSettingValue}>
                          {profile?.email || authUser?.email || "-"}
                        </span>
                      </div>
                    </div>

                    <div className={pageStyles.profileSettingRow}>
                      <div className={pageStyles.profileSettingInfo}>
                        <span className={pageStyles.profileSettingLabel}>{t.password}</span>
                        <span className={pageStyles.profileSettingHint}>{t.passwordHint}</span>
                        <span className={pageStyles.profileSettingValue}>••••••••••••</span>
                      </div>
                      <div className={pageStyles.profileSettingAction}>
                        <BtnIcon icon="mdi:key-outline" title={t.changePassword} onClick={openPasswordModal} />
                      </div>
                    </div>
                  </section>

                  <section className={pageStyles.profileSection}>
                    <h2 className={pageStyles.profileSectionTitle}>{t.mfaSectionTitle}</h2>
                    <p className={pageStyles.profileSectionDesc}>{t.mfaSectionDesc}</p>
                    {mfaStatus ? <div className={`${pageStyles.mfaBanner} ${pageStyles[`mfaBanner_${mfaStatus.key}`] || ""}`.trim()}>
                        <Icon icon={mfaStatus.icon} className={`${pageStyles.mfaIcon} ${pageStyles[`mfaIcon_${mfaStatus.key}`] || ""}`.trim()} aria-hidden />
                        <div className={pageStyles.mfaBody}>
                          <h3 className={pageStyles.mfaTitle}>{mfaStatus.label}</h3>
                          <p className={pageStyles.mfaDesc}>{mfaStatus.desc}</p>
                          {mfaStatus.key !== "enabled" ? <div className={pageStyles.mfaActions}>
                              <Btn icon="mdi:shield-key-outline" onClick={startMfaSetup} disabled={mfaBusy}>
                                {mfaStatus.key === "pending" ? t.mfa.continueSetup : t.mfa.enable}
                              </Btn>
                            </div> : null}
                        </div>
                      </div> : null}
                  </section>
                </div>
              </div>
            </div>}
        </div>
      </div>

      <Modal open={usernameModal} onClose={() => setUsernameModal(false)} title={t.modals.displayName.title} icon="mdi:account-edit-outline" width="440px" footer={<ModalFooter onCancel={() => setUsernameModal(false)} onConfirm={handleSaveUsername} confirmLabel={t.modals.save} confirmLoading={saving} confirmDisabled={!draftUsername.trim()} />}>
        <ModalForm>
          <IconField icon="mdi:account" label={t.modals.displayName.label} hint={t.modals.displayName.hint}>
            <Input value={draftUsername} onChange={e => setDraftUsername(e.target.value)} placeholder={profile?.username || t.modals.displayName.placeholder} autoFocus maxLength={50} />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={passwordModal} onClose={() => setPasswordModal(false)} title={t.modals.password.title} icon="mdi:lock-reset" width="440px" footer={<ModalFooter onCancel={() => setPasswordModal(false)} onConfirm={handleSavePassword} confirmLabel={t.modals.password.confirmAction} confirmLoading={saving} confirmDisabled={!draftPwd1 || !draftPwd2} />}>
        <ModalForm>
          <IconField icon="mdi:lock-outline" label={t.modals.password.label} hint={t.modals.password.hint}>
            <Input type="password" value={draftPwd1} onChange={e => setDraftPwd1(e.target.value)} autoComplete="new-password" autoFocus />
          </IconField>
          <IconField icon="mdi:lock-check-outline" label={t.modals.password.confirmLabel}>
            <Input type="password" value={draftPwd2} onChange={e => setDraftPwd2(e.target.value)} autoComplete="new-password" />
          </IconField>
        </ModalForm>
      </Modal>

      <Modal open={Boolean(portalEmailConfirm)} onClose={() => !saving && setPortalEmailConfirm(null)} title={t.modals.portalEmail.title} icon="mdi:email-sync-outline" width="480px" footer={<ModalFooter onCancel={() => setPortalEmailConfirm(null)} onConfirm={handleConfirmPortalEmailChange} confirmLabel={t.modals.portalEmail.confirmAction} confirmLoading={saving} />}>
        <ModalForm>
          <p className={formStyles.hint}>{t.modals.portalEmail.desc}</p>
          <div className={pageStyles.portalEmailChange}>
            <div>
              <span className={pageStyles.portalEmailLabel}>{t.modals.portalEmail.previous}</span>
              <span className={pageStyles.portalEmailValue}>{portalEmailConfirm?.previousPrimaryEmail || "-"}</span>
            </div>
            <Icon icon="mdi:arrow-down" aria-hidden />
            <div>
              <span className={pageStyles.portalEmailLabel}>{t.modals.portalEmail.next}</span>
              <span className={`${pageStyles.portalEmailValue} ${pageStyles.portalEmailValueNew}`}>
                <Icon icon="mdi:star" aria-hidden />
                {portalEmailConfirm?.nextPrimaryEmail || "-"}
              </span>
            </div>
          </div>
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
        {mfaSetup ? <ModalForm>
            <p className={pageStyles.mfaDesc}>{t.modals.mfa.desc}</p>
            <div className={pageStyles.mfaQrWrap}>
              <img src={mfaSetup.qrCodeDataUrl} alt={t.modals.mfa.qrAlt} className={pageStyles.mfaQr} />
            </div>
            <p className={pageStyles.mfaSecret}>
              {t.modals.mfa.manualKey} <code>{mfaSetup.secret}</code>
            </p>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={t.modals.mfa.codePlaceholder} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))} className={pageStyles.mfaCodeInput} disabled={mfaBusy} />
          </ModalForm> : null}
      </Modal>
    </div>;
}
