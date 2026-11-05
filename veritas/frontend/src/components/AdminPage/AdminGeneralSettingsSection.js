import AdminAnimatedIcon, { useAdminIconHover } from "./AdminAnimatedIcon";
import s from "./AdminGeneralSettingsPlatform.module.css";

export default function SettingsSection({ title, description, icon, iconKey = null, action = null, children, className = "" }) {
  const { animRef, onMouseEnter, onMouseLeave } = useAdminIconHover();

  return (
    <section className={`${s.section}${className ? ` ${className}` : ""}`}>
      {(title || description || icon || action) && (
        <header
          className={s.sectionHeader}
          onMouseEnter={icon ? onMouseEnter : undefined}
          onMouseLeave={icon ? onMouseLeave : undefined}
        >
          {icon ? (
            <span className={s.sectionIcon} aria-hidden>
              <AdminAnimatedIcon
                iconKey={iconKey}
                iconify={icon}
                size={15}
                animRef={animRef}
              />
            </span>
          ) : null}
          <div className={s.sectionTitleBlock}>
            {title ? <h3 className={s.sectionTitle}>{title}</h3> : null}
            {description ? <p className={s.sectionDesc}>{description}</p> : null}
          </div>
          {action ? <div className={s.sectionHeaderAction}>{action}</div> : null}
        </header>
      )}
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}
