import React from "react";
import { letterToColor, letterToBackground } from "../../../utils/gradeUtils";
const LETTERS = ["F", "E", "D", "C", "B", "A"];
const LetterScale = ({
  activeLetter,
  theme = "light",
  letters = LETTERS,
  size = "normal",
  onSelect,
  highlightLetter
}) => {
  const normalizedLetter = letters.includes(activeLetter) ? activeLetter : null;
  const normalizedHighlight = letters.includes(highlightLetter) ? highlightLetter : null;
  const hasActiveLetter = normalizedLetter !== null;
  const isClickable = typeof onSelect === "function";
  const isSmall = size === "small";
  const largeWidth = isSmall ? "32px" : "44px";
  const largeHeight = isSmall ? "40px" : "56px";
  const smallWidth = isSmall ? "26px" : "36px";
  const smallHeight = isSmall ? "32px" : "44px";
  const largePadding = isSmall ? "0.4rem 0.5rem" : "0.6rem 0.75rem";
  const smallPadding = isSmall ? "0.2rem 0.35rem" : "0.3rem 0.5rem";
  const largeFontSize = isSmall ? "1rem" : "1.35rem";
  const smallFontSize = isSmall ? "0.85rem" : "1.05rem";
  return <div style={{
    display: "flex",
    gap: isSmall ? "0.25rem" : "0.35rem",
    alignItems: "center"
  }}>
            {letters.map(letter => {
      const isActive = normalizedLetter === letter;
      const isHighlighted = normalizedHighlight === letter;
      const isLarge = !hasActiveLetter || isActive || isHighlighted;
      const baseColor = theme === "dark" ? "#9ca3af" : "#9ca3af";
      const letterColor = isActive ? "#ffffff" : isHighlighted ? baseColor : baseColor;
      const backgroundColor = isActive ? letterToBackground(letter) : isHighlighted ? theme === "dark" ? "rgba(255,255,255,0.12)" : "#e5e7eb" : theme === "dark" ? "rgba(255,255,255,0.05)" : "#f3f4f6";
      const borderStyle = isActive ? `2px solid ${letterToColor(letter)}` : isHighlighted ? `2px dashed ${theme === "dark" ? "#d1d5db" : "#4b5563"}` : "1px solid transparent";
      return <div key={letter} onClick={() => {
        if (isClickable) {
          onSelect(letter);
        }
      }} style={{
        minWidth: isLarge ? largeWidth : smallWidth,
        height: isLarge ? largeHeight : smallHeight,
        padding: isLarge ? largePadding : smallPadding,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: isActive ? 700 : isHighlighted ? 700 : 600,
        color: letterColor,
        backgroundColor,
        fontSize: isLarge ? largeFontSize : smallFontSize,
        lineHeight: "1",
        transition: "all 0.2s ease",
        boxShadow: isActive ? "0 6px 16px rgba(0,0,0,0.15)" : isHighlighted ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
        transform: isActive ? "translateY(-2px)" : "translateY(0)",
        border: borderStyle,
        cursor: isClickable ? "pointer" : "default"
      }}>
                        {letter}
                    </div>;
    })}
        </div>;
};
export default LetterScale;
