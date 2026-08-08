import React from "react";
import { letterToBackground, percentageToLetter } from "../../../utils/gradeUtils";
const MetricLetter = ({
  value,
  higherIsBetter = true,
  precision = 1,
  showValue = true,
  fallback = "N/A",
  theme = "light"
}) => {
  if (value === null || value === undefined || value === "N/A") {
    return <span style={{
      color: theme === "dark" ? "#9ca3af" : "#6b7280"
    }}>{fallback}</span>;
  }
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(numeric)) {
    return <span style={{
      color: theme === "dark" ? "#9ca3af" : "#6b7280"
    }}>{fallback}</span>;
  }
  const letter = percentageToLetter(numeric, higherIsBetter);
  if (!letter) {
    return <span style={{
      color: theme === "dark" ? "#9ca3af" : "#6b7280"
    }}>{fallback}</span>;
  }
  const backgroundColor = letterToBackground(letter);
  return <span style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem"
  }}>
            <span style={{
      minWidth: "20px",
      padding: "0.15rem 0.4rem",
      borderRadius: "4px",
      textAlign: "center",
      fontWeight: 600,
      color: "#ffffff",
      backgroundColor
    }}>
                {letter}
            </span>
            {showValue && <span style={{
      fontSize: "0.75rem",
      color: theme === "dark" ? "#d1d5db" : "#374151"
    }}>
                    {numeric.toFixed(precision)}%
                </span>}
        </span>;
};
export default MetricLetter;
