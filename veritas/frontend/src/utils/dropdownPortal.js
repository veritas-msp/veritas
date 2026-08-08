export function getModalDropdownZIndex() {
  if (typeof window === "undefined") return 11250;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue("--modal-dropdown-z-index").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 11250;
}
