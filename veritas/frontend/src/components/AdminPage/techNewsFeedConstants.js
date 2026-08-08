export const TECH_NEWS_FEED_FORM_SECTIONS = [{
  id: "source",
  label: "Source",
  description: "Feed name and URL",
  icon: "mdi:newspaper-variant-outline"
}, {
  id: "display",
  label: "Display",
  description: "Language, category and order",
  icon: "mdi:tune-variant"
}];
export const DEFAULT_TECH_NEWS_FEED_CATEGORIES = ["cve", "security", "news", "tech"];
export const DEFAULT_TECH_NEWS_FEED_LOCALE = "en";
export function buildDefaultTechNewsFeedDraft() {
  return {
    locale: DEFAULT_TECH_NEWS_FEED_LOCALE,
    source: "",
    url: "",
    category: "news",
    enabled: true,
    sortOrder: ""
  };
}
export function buildTechNewsFeedDraftFromFeed(feed) {
  return {
    locale: feed.locale || DEFAULT_TECH_NEWS_FEED_LOCALE,
    source: feed.source || "",
    url: feed.url || "",
    category: feed.category || "news",
    enabled: feed.enabled !== false,
    sortOrder: String(feed.sortOrder ?? "")
  };
}
