import { getUserInitials, resolveUserAvatarSrc } from "../../../utils/userAvatarUtils";
import styles from "./UserAvatar.module.css";
const SIZE_CLASS = {
  32: styles.size32,
  36: styles.size36,
  40: styles.size40,
  48: styles.size48,
  64: styles.size64,
  80: styles.size80
};
export default function UserAvatar({
  user,
  name,
  avatar,
  size = 36,
  variant = "neutral",
  className = "",
  title
}) {
  const displayName = name || user?.ticket_helpdesk_display_name || user?.username || user?.email || "";
  const src = resolveUserAvatarSrc({
    avatar: avatar ?? user?.avatar
  });
  const sizeClass = SIZE_CLASS[size] || styles.size36;
  const variantClass = variant === "agent" ? styles.avatarAgent : variant === "client" ? styles.avatarClient : styles.avatarNeutral;
  return <span className={`${styles.avatar} ${sizeClass} ${variantClass} ${className}`.trim()} title={title || displayName || undefined} aria-hidden={!title}>
      {src ? <img src={src} alt="" className={styles.avatarImage} /> : getUserInitials(displayName)}
    </span>;
}
