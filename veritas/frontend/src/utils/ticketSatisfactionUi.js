export const SATISFACTION_SENTIMENT_FILTERS = [{
  key: "",
  label: "All",
  icon: "mdi:filter-variant"
}, {
  key: "positive",
  label: "Positive",
  icon: "mdi:emoticon-happy-outline",
  tone: "green"
}, {
  key: "neutral",
  label: "Neutral",
  icon: "mdi:emoticon-neutral-outline",
  tone: "amber"
}, {
  key: "negative",
  label: "Negative",
  icon: "mdi:emoticon-sad-outline",
  tone: "red"
}];
export function getSatisfactionSentiment(averageRating) {
  const avg = Number(averageRating) || 0;
  if (avg >= 4) return {
    key: "positive",
    label: "Positive",
    tone: "green"
  };
  if (avg <= 2.5) return {
    key: "negative",
    label: "Negative",
    tone: "red"
  };
  return {
    key: "neutral",
    label: "Neutral",
    tone: "amber"
  };
}
export function formatSatisfactionDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
