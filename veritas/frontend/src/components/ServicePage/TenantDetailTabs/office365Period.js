function parseActivityDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveReportPeriodBounds(reportPeriod, client = null) {
  const startRaw = reportPeriod?.startTime || reportPeriod?.start || reportPeriod?.startDate || reportPeriod?.from || client?.reportStartDate;
  const endRaw = reportPeriod?.endTime || reportPeriod?.end || reportPeriod?.endDate || reportPeriod?.to || client?.reportEndDate;
  if (!startRaw || !endRaw) return null;
  const startDate = parseActivityDate(startRaw);
  const endDate = parseActivityDate(endRaw);
  if (!startDate || !endDate) return null;
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

function getActivityDayDate(day) {
  if (!day || typeof day !== "object") return null;
  return parseActivityDate(day.date || day.reportDate || day.ReportDate || day["Report Date"] || day.ReportRefreshDate);
}

export function filterDailyActivityByPeriod(daily, bounds) {
  if (!Array.isArray(daily)) return [];
  if (!bounds) return daily;
  const startTs = bounds.startDate.getTime();
  const endTs = bounds.endDate.getTime();
  return daily.filter(day => {
    const d = getActivityDayDate(day);
    if (!d) return false;
    const t = d.getTime();
    return t >= startTs && t <= endTs;
  });
}

function buildWeeklyStats(daily) {
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const buckets = keys.reduce((acc, key) => {
    acc[key] = { sent: 0, received: 0, read: 0, count: 0 };
    return acc;
  }, {});
  (daily || []).forEach(day => {
    const date = getActivityDayDate(day);
    if (!date) return;
    const bucket = buckets[keys[date.getDay()]];
    if (!bucket) return;
    bucket.sent += Number(day.sent) || 0;
    bucket.received += Number(day.received) || 0;
    bucket.read += Number(day.read) || 0;
    bucket.count += 1;
  });
  const avg = bucket => ({
    sent: bucket.count > 0 ? Math.round(bucket.sent / bucket.count) : 0,
    received: bucket.count > 0 ? Math.round(bucket.received / bucket.count) : 0,
    read: bucket.count > 0 ? Math.round(bucket.read / bucket.count) : 0
  });
  return {
    lundi: avg(buckets.monday),
    mardi: avg(buckets.tuesday),
    mercredi: avg(buckets.wednesday),
    jeudi: avg(buckets.thursday),
    vendredi: avg(buckets.friday),
    samedi: avg(buckets.saturday),
    dimanche: avg(buckets.sunday)
  };
}

export function filterExchangeDataByPeriod(exchange, reportPeriod, client = null) {
  if (!exchange) return exchange;
  const bounds = resolveReportPeriodBounds(reportPeriod, client);
  if (!bounds) return exchange;
  const daily = Array.isArray(exchange.emailActivity?.dailyActivity) ? exchange.emailActivity.dailyActivity : [];
  const filteredDaily = filterDailyActivityByPeriod(daily, bounds);
  const sent = filteredDaily.reduce((sum, d) => sum + (Number(d.sent) || 0), 0);
  const received = filteredDaily.reduce((sum, d) => sum + (Number(d.received) || 0), 0);
  const read = filteredDaily.reduce((sum, d) => sum + (Number(d.read) || 0), 0);
  const daysCount = filteredDaily.length;
  return {
    ...exchange,
    topUsers: [],
    emailActivity: {
      ...(exchange.emailActivity || {}),
      dailyActivity: filteredDaily,
      sent,
      received,
      read,
      averages: {
        sent: daysCount > 0 ? Math.round(sent / daysCount) : 0,
        received: daysCount > 0 ? Math.round(received / daysCount) : 0,
        read: daysCount > 0 ? Math.round(read / daysCount) : 0
      },
      readRate: received > 0 ? read / received * 100 : 0,
      weeklyStats: buildWeeklyStats(filteredDaily)
    }
  };
}

export function filterTeamsDataByPeriod(teams, reportPeriod, client = null) {
  if (!teams) return teams;
  const bounds = resolveReportPeriodBounds(reportPeriod, client);
  if (!bounds) return teams;
  const originalDaily = Array.isArray(teams.licensedActivity?.dailyActivity)
    ? teams.licensedActivity.dailyActivity
    : Array.isArray(teams.activity?.dailyActivity)
      ? teams.activity.dailyActivity
      : Array.isArray(teams.dailyActivity)
        ? teams.dailyActivity
        : [];
  const filteredDaily = filterDailyActivityByPeriod(originalDaily, bounds);
  const channelMessages = filteredDaily.reduce((sum, d) => sum + (Number(d.channelMessages) || 0), 0);
  const chatMessages = filteredDaily.reduce((sum, d) => sum + (Number(d.chatMessages) || 0), 0);
  const oneOnOneCalls = filteredDaily.reduce((sum, d) => sum + (Number(d.oneOnOneCalls) || Number(d.calls) || 0), 0);
  const totalMeetings = filteredDaily.reduce((sum, d) => sum + (Number(d.totalMeetings) || Number(d.meetings) || 0), 0);
  const prevActivity = teams.activity && typeof teams.activity === "object" ? teams.activity : {};
  const prevMessages = prevActivity.messages && typeof prevActivity.messages === "object" ? prevActivity.messages : {};
  const prevMeetings = prevActivity.meetings && typeof prevActivity.meetings === "object" ? prevActivity.meetings : {};
  const prevCalls = prevActivity.calls && typeof prevActivity.calls === "object" ? prevActivity.calls : {};
  return {
    ...teams,
    licensedActivity: {
      ...(teams.licensedActivity || {}),
      dailyActivity: filteredDaily,
      totalChannelMessages: channelMessages,
      totalChatMessages: chatMessages,
      totalMeetings,
      totalCalls: oneOnOneCalls
    },
    activity: {
      ...prevActivity,
      messages: {
        ...prevMessages,
        total: channelMessages + chatMessages,
        teamChat: channelMessages,
        privateChat: chatMessages,
        urgent: 0
      },
      meetings: {
        ...prevMeetings,
        total: totalMeetings,
        organized: 0,
        attended: 0,
        adHoc: { organized: 0, attended: 0 }
      },
      calls: {
        ...prevCalls,
        total: oneOnOneCalls
      }
    }
  };
}
