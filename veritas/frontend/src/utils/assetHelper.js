export const getAssetPath = path => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  if (!publicUrl || publicUrl === '.') {
    return `/${cleanPath}`;
  }
  const prefix = publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`;
  return `${prefix}/${cleanPath}`;
};
export const getAvatarPath = filename => getAssetPath(`assets/avatars/${filename}`);
export const getIconPath = filename => getAssetPath(`assets/icons/${filename}`);
export const getLogoPath = filename => getAssetPath(`assets/logo/${filename}`);
