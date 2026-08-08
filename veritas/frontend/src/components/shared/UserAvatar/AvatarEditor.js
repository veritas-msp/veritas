import { useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { clearUserAvatar, saveUserAvatarPreset, uploadUserAvatar } from "../../../api/users";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { PRESET_AVATARS } from "../../../utils/userAvatarUtils";
import { getAvatarPath } from "../../../utils/assetHelper";
import { getAvatarEditorCopy } from "./avatarEditorI18n";
import UserAvatar from "./UserAvatar";
import styles from "./AvatarEditor.module.css";
export default function AvatarEditor({
  user,
  displayName,
  onUpdated
}) {
  const locale = useAppLocale();
  const t = useMemo(() => getAvatarEditorCopy(locale), [locale]);
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const avatar = user?.avatar || null;
  const activePresetId = avatar?.type === "preset" ? avatar.presetId : null;
  const handlePreset = async presetId => {
    setSaving(true);
    try {
      const result = await saveUserAvatarPreset(presetId);
      onUpdated?.(result.avatar);
      toast.success(t.toast.presetUpdated);
    } catch {
      toast.error(t.toast.presetError);
    } finally {
      setSaving(false);
    }
  };
  const handleUpload = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(t.toast.invalidFormat);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t.toast.tooLarge);
      return;
    }
    setSaving(true);
    try {
      const result = await uploadUserAvatar(file);
      onUpdated?.(result.avatar);
      toast.success(t.toast.photoSaved);
    } catch {
      toast.error(t.toast.uploadError);
    } finally {
      setSaving(false);
    }
  };
  const handleClear = async () => {
    setSaving(true);
    try {
      await clearUserAvatar();
      onUpdated?.(null);
      toast.success(t.toast.cleared);
    } catch {
      toast.error(t.toast.clearError);
    } finally {
      setSaving(false);
    }
  };
  return <div className={styles.editor}>
      <div className={styles.currentRow}>
        <UserAvatar user={user} name={displayName} size={80} />
        <div className={styles.currentMeta}>
          <span className={styles.currentLabel}>{t.currentLabel}</span>
          <span className={styles.currentHint}>{t.currentHint}</span>
        </div>
      </div>

      <div className={styles.presetGrid}>
        {PRESET_AVATARS.map(preset => <button key={preset.id} type="button" className={`${styles.presetBtn} ${activePresetId === preset.id ? styles.presetBtnActive : ""}`} title={preset.label} disabled={saving} onClick={() => handlePreset(preset.id)}>
            <img src={getAvatarPath(`${preset.id}.svg`)} alt={preset.label} width={48} height={48} />
          </button>)}
      </div>

      <div className={styles.uploadRow}>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className={styles.uploadInput} onChange={handleUpload} />
        <button type="button" className={styles.uploadBtn} disabled={saving} onClick={() => fileInputRef.current?.click()}>
          <Icon icon="mdi:upload" aria-hidden />
          {t.upload}
        </button>
        {avatar ? <button type="button" className={styles.clearBtn} disabled={saving} onClick={handleClear}>
            <Icon icon="mdi:account-off-outline" aria-hidden />
            {t.reset}
          </button> : null}
      </div>
    </div>;
}
