import { useMemo } from "react";
import { getCommonCopy } from "../i18n/commonI18n";
import { useAppLocale } from "./useAppGeneralSettings";
export function useCommonCopy() {
  const locale = useAppLocale();
  return useMemo(() => getCommonCopy(locale), [locale]);
}
