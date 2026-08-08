import { getHomePageCopy } from "../HomePage/homePageI18n";
export function getHomePageGuideSteps({
  isCommunity = false,
  locale = "fr"
} = {}) {
  return getHomePageCopy(locale).buildGuideSteps(isCommunity);
}
