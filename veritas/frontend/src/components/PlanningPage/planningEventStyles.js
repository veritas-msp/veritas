import { getPlanningEventColors } from "./planningAgentColors";
export { getPlanningEventColors } from "./planningAgentColors";
export function planningEventStyleGetter(event) {
  const {
    backgroundColor,
    borderColor
  } = getPlanningEventColors(event);
  return {
    style: {
      backgroundColor,
      borderColor,
      borderWidth: "1px",
      borderLeftWidth: "4px",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
      color: "#fff"
    }
  };
}
