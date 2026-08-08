export default function PlanningMonthDateHeader({
  label,
  isOffRange
}) {
  if (isOffRange) return null;
  return <span>{label}</span>;
}
