export const scoreToLetter = score => {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  if (score >= 91) return "A";
  if (score >= 76) return "B";
  if (score >= 61) return "C";
  if (score >= 41) return "D";
  if (score >= 21) return "E";
  return "F";
};
export const letterToColor = letter => {
  if (!letter) return "#6b7280";
  if (letter === "A") return "#10b981";
  if (letter === "B") return "#84cc16";
  if (letter === "C") return "#f59e0b";
  if (letter === "D") return "#f59e0b";
  if (letter === "E") return "#ef4444";
  return "#ef4444";
};
export const letterToLabel = letter => {
  if (!letter) return "N/A";
  switch (letter) {
    case "A":
      return "Excellent";
    case "B":
      return "Good";
    case "C":
      return "Average";
    case "D":
      return "Weak";
    case "E":
      return "Insufficient";
    default:
      return "Critical";
  }
};
const LETTER_BACKGROUND = {
  A: "#10b981",
  B: "#84cc16",
  C: "#f59e0b",
  D: "#f59e0b",
  E: "#ef4444",
  F: "#ef4444"
};
export const letterToBackground = letter => LETTER_BACKGROUND[letter] || "#9ca3af";
export const scoreToColor = score => letterToColor(scoreToLetter(score));
export const scoreToLabel = score => letterToLabel(scoreToLetter(score));
export const letterToScore = letter => {
  if (!letter) return null;
  const mapping = {
    A: 95,
    B: 83,
    C: 70,
    D: 55,
    E: 35,
    F: 15
  };
  return mapping[letter] ?? null;
};
export const percentageToLetter = (value, higherIsBetter = true) => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(numeric)) return null;
  const clamped = Math.max(0, Math.min(100, numeric));
  const normalized = higherIsBetter ? clamped : 100 - clamped;
  return scoreToLetter(normalized);
};
export const percentageToColor = (value, higherIsBetter = true) => letterToColor(percentageToLetter(value, higherIsBetter));
