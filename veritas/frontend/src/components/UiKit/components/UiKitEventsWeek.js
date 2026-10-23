import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { getLocaleTag } from "../../../i18n/locales";
import { interpolate } from "../../../i18n/translate";
import UiKitArticleModal from "./UiKitArticleModal";
import styles from "../uiKitHome.module.css";

const DEFAULT_DAYS = 7;

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(date = new Date()) {
  const d = startOfLocalDay(date);
  const weekday = d.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + delta);
  return d;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function eventOverlapsLocalDay(event, dayStart) {
  if (!event?.start) return false;
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return false;
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  let end = event.end ? new Date(event.end) : start;
  if (Number.isNaN(end.getTime())) end = start;
  if (end.getTime() === start.getTime()) {
    return start >= dayStart && start < dayEnd;
  }
  return start < dayEnd && end > dayStart;
}

export function buildEventsWeekStrip(events, locale, weekOffset = 0) {
  const localeTag = getLocaleTag(locale);
  const list = Array.isArray(events) ? events : [];
  const today = startOfLocalDay();
  const todayKey = dayKey(today);
  const weekStart = startOfWeekMonday(today);
  weekStart.setDate(weekStart.getDate() + Number(weekOffset || 0) * 7);
  const daysOut = [];
  for (let i = 0; i < DEFAULT_DAYS; i += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayEvents = list.filter(event => eventOverlapsLocalDay(event, day));
    const dd = String(day.getDate()).padStart(2, "0");
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    const key = dayKey(day);
    daysOut.push({
      key,
      date: day,
      isToday: key === todayKey,
      count: dayEvents.length,
      events: dayEvents,
      dateLabel: `${dd}/${mm}`,
      weekday: day.toLocaleDateString(localeTag || undefined, { weekday: "short" }),
      dayNum: dd
    });
  }
  return daysOut;
}

function formatEventClock(event, localeTag) {
  if (!event?.start) return "";
  if (event.allDay) return "";
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return "";
  try {
    return start.toLocaleTimeString(localeTag || undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Frise 7 jours UI Kit (.eventsCalendar).
 * @param {boolean} bare — sans chrome / carte
 * @param {boolean} selectable — clic sélectionne un jour
 */
export default function UiKitEventsWeek({
  events = [],
  locale = "fr",
  copy = null,
  title = null,
  icon = "mdi:calendar-month-outline",
  onOpen,
  onSelectDay = null,
  bare = false,
  showHint = false,
  selectable = false,
  className = ""
}) {
  const labels = copy?.panels?.events || {};
  const localeTag = getLocaleTag(locale);
  const [nextWeek, setNextWeek] = useState(false);
  const days = useMemo(
    () => buildEventsWeekStrip(events, locale, nextWeek ? 1 : 0),
    [events, locale, nextWeek]
  );
  const [selectedKey, setSelectedKey] = useState(() => days.find(d => d.isToday)?.key || days[0]?.key || "");

  useEffect(() => {
    setSelectedKey(prev => {
      if (days.some(day => day.key === prev)) return prev;
      return days.find(day => day.isToday)?.key || days[0]?.key || "";
    });
  }, [days]);

  const selected = days.find(d => d.key === selectedKey) || days[0];
  const chromeTitle = title || labels.title || labels.stripAria || null;
  const canSelect = selectable || showHint;
  const [zoomEvent, setZoomEvent] = useState(null);
  const [zoomOrigin, setZoomOrigin] = useState(null);

  return (
    <div
      className={`${styles.eventsCalendar}${bare ? ` ${styles.eventsCalendarBare}` : ""}${className ? ` ${className}` : ""}`}
    >
      {chromeTitle && !bare ? (
        <div className={styles.eventsCalChrome}>
          {icon ? (
            <span className={styles.eventsCalChromeIcon} aria-hidden>
              <Icon icon={icon} />
            </span>
          ) : null}
          <h2 className={styles.eventsCalChromeTitle}>{chromeTitle}</h2>
          <button
            type="button"
            className={`${styles.eventsWeekToggle}${nextWeek ? ` ${styles.eventsWeekToggleOn}` : ""}`}
            aria-pressed={nextWeek}
            aria-label={labels.nextWeekAria || labels.nextWeek || "S+1"}
            onClick={() => {
              const current = days.find(day => day.key === selectedKey) || days[0];
              const shifted = current?.date ? new Date(current.date) : startOfWeekMonday();
              shifted.setDate(shifted.getDate() + (nextWeek ? -7 : 7));
              setSelectedKey(dayKey(shifted));
              setNextWeek(on => !on);
            }}
          >
            {labels.nextWeek || "S+1"}
          </button>
        </div>
      ) : null}
      <div
        className={styles.eventsCalWeek}
        role="group"
        aria-label={labels.stripAria || labels.title || chromeTitle || undefined}
      >
        {days.map(day => {
          const dayLabel = day.isToday
            ? `${labels.today || day.weekday} ${day.dateLabel}`
            : `${day.weekday} ${day.dateLabel}`;
          const aria = interpolate(labels.dayAria || "{day}: {count}", {
            day: dayLabel,
            count: day.count
          });
          const isSelected = canSelect && day.key === selectedKey;
          return (
            <button
              key={day.key}
              type="button"
              className={[
                styles.eventsCalDay,
                day.isToday ? styles.eventsCalDayToday : "",
                day.count > 0 ? styles.eventsCalDayBusy : "",
                isSelected ? styles.eventsCalDaySelected : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (canSelect) {
                  setSelectedKey(day.key);
                  onSelectDay?.(day);
                } else {
                  onOpen?.(day);
                }
              }}
              aria-pressed={canSelect ? isSelected : undefined}
              aria-label={aria}
            >
              <span className={styles.eventsCalWeekday}>{day.weekday}</span>
              <span className={styles.eventsCalNum}>{day.dayNum}</span>
              <span className={styles.eventsCalDots} aria-hidden>
                {day.count > 0 ? <span className={styles.eventsCalDot} /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {showHint && selected ? (
        <div className={`${styles.eventsCalBody}${selected.count ? ` ${styles.eventsCalBodyList}` : ""}`}>
          <div key={selected.key} className={styles.eventsCalBodyMotion}>
          {selected.count ? (
            <ul className={styles.eventsCalList}>
              {selected.events.map(event => {
                const clock = formatEventClock(event, localeTag);
                return (
                  <li key={event.id || `${event.start}-${event.title}`}>
                    <button
                      type="button"
                      className={styles.eventsCalItem}
                      onClick={clickEvent => {
                        const rect = clickEvent.currentTarget.getBoundingClientRect();
                        setZoomOrigin({
                          top: rect.top,
                          left: rect.left,
                          width: rect.width,
                          height: rect.height
                        });
                        setZoomEvent(event);
                      }}
                    >
                      {clock ? <span className={styles.eventsCalItemTime}>{clock}</span> : null}
                      <span className={styles.eventsCalItemTitle}>{event.title || labels.untitled || "Événement"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <button
              type="button"
              className={styles.eventsCalEmpty}
              onClick={() => onOpen?.(selected)}
              aria-label={interpolate(labels.dayAria || "{day}: {count}", {
                day: selected.dateLabel,
                count: selected.count
              })}
            >
              <Icon icon="mdi:calendar-blank-outline" className={styles.eventsCalHintIcon} aria-hidden />
              <span className={styles.eventsCalHintCount}>
                0 {labels.eventSingular || "événement"}
              </span>
              <span className={styles.eventsCalHintDate}>{selected.dateLabel}</span>
            </button>
          )}
          </div>
        </div>
      ) : null}
      <UiKitArticleModal
        article={
          zoomEvent
            ? {
                title: zoomEvent.title || labels.untitled || "Événement",
                source: zoomEvent.clientName || "",
                snippet: [formatEventClock(zoomEvent, localeTag), selected?.dateLabel, zoomEvent.typeLabel]
                  .filter(Boolean)
                  .join(" · "),
                publishedAt: zoomEvent.start,
                category: "news"
              }
            : null
        }
        origin={zoomOrigin}
        open={!!zoomEvent}
        onClose={() => setZoomEvent(null)}
        categoryLabel={labels.title || "Événement"}
        closeLabel="Fermer"
        emptySnippet=""
      />
    </div>
  );
}
