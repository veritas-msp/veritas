export const SATISFACTION_SENTIMENT_KEYS = ["", "positive", "neutral", "negative"];

export const SATISFACTION_SENTIMENT_META = {
  "": { icon: "mdi:filter-variant" },
  positive: { icon: "mdi:emoticon-happy-outline", tone: "green" },
  neutral: { icon: "mdi:emoticon-neutral-outline", tone: "amber" },
  negative: { icon: "mdi:emoticon-sad-outline", tone: "red" }
};

export function getSatisfactionSentimentKey(averageRating) {
  const avg = Number(averageRating) || 0;
  if (avg >= 4) return "positive";
  if (avg <= 2.5) return "negative";
  return "neutral";
}

export function getSatisfactionSentiment(averageRating, sentimentLabels = {}) {
  const key = getSatisfactionSentimentKey(averageRating);
  const meta = SATISFACTION_SENTIMENT_META[key] || SATISFACTION_SENTIMENT_META.neutral;
  return {
    key,
    label: sentimentLabels[key] || key,
    tone: meta.tone
  };
}

export function getSatisfactionSentimentFilters(sentimentLabels = {}) {
  return SATISFACTION_SENTIMENT_KEYS.map(key => ({
    key,
    label: key === "" ? sentimentLabels.all || "All" : sentimentLabels[key] || key,
    icon: SATISFACTION_SENTIMENT_META[key]?.icon,
    tone: SATISFACTION_SENTIMENT_META[key]?.tone
  }));
}

export function formatSatisfactionDate(value, locale = "fr-FR") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
