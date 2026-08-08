import { getAppRegionalSettings, formatAppDate, formatAppDateTime, formatAppDateRange, formatAppEventRange, formatAppLongDate } from "./appRegionalSettings";
export function formatTableDate(value) {
  return formatAppDate(value, getAppRegionalSettings());
}
export function formatTableDateTime(value) {
  return formatAppDateTime(value, getAppRegionalSettings());
}
export function formatTableEventRange(start, end) {
  return formatAppEventRange(start, end, getAppRegionalSettings());
}
export function formatTableLongDate(value) {
  return formatAppLongDate(value, getAppRegionalSettings());
}
export function formatTableDateRange(start, end) {
  return formatAppDateRange(start, end, getAppRegionalSettings());
}
