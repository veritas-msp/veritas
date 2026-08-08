import { useMemo } from "react";
import { getAdminCommonCopy } from "../components/AdminPage/adminCommonI18n";
import { getAdminPageCopy } from "../components/AdminPage/adminPagesI18n";
import { getAdminModalCopy } from "../components/AdminPage/adminModalsI18n";
import { getAdminUsersCopy } from "../components/AdminPage/adminUsersI18n";
import { getAdminClientsCopy } from "../components/AdminPage/adminClientsI18n";
import { getAdminClientPortalCopy } from "../components/AdminPage/adminClientPortalI18n";
import { getAdminSupportCreditsCopy } from "../components/AdminPage/adminSupportCreditsI18n";
import { getAdminSupportSettingsCopy } from "../components/AdminPage/adminSupportSettingsI18n";
import { useAppLocale } from "./useAppGeneralSettings";
export function useAdminCommonCopy() {
  const locale = useAppLocale();
  return useMemo(() => getAdminCommonCopy(locale), [locale]);
}
export function useAdminPageCopy(pageKey) {
  const locale = useAppLocale();
  return useMemo(() => getAdminPageCopy(locale, pageKey), [locale, pageKey]);
}
export function useAdminModalCopy(modalKey) {
  const locale = useAppLocale();
  return useMemo(() => getAdminModalCopy(locale, modalKey), [locale, modalKey]);
}
export function useAdminUsersCopy() {
  const locale = useAppLocale();
  return useMemo(() => getAdminUsersCopy(locale), [locale]);
}
export function useAdminClientsCopy() {
  const locale = useAppLocale();
  return useMemo(() => getAdminClientsCopy(locale), [locale]);
}
export function useAdminClientPortalCopy() {
  const locale = useAppLocale();
  return useMemo(() => getAdminClientPortalCopy(locale), [locale]);
}
export function useAdminSupportCreditsCopy() {
  const locale = useAppLocale();
  return useMemo(() => getAdminSupportCreditsCopy(locale), [locale]);
}
export function useAdminSupportSettingsCopy() {
  const locale = useAppLocale();
  return useMemo(() => getAdminSupportSettingsCopy(locale), [locale]);
}
