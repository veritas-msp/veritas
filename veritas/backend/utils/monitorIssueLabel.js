function isBareSeverityToken(value) {
  return /^(warning|critical|crit|warn|info|ok|unknown)$/i.test(String(value || "").trim());
}

/** Restore readable CheckMK filesystem labels mangled by colon stripping ("E:/" → "/") or bare mounts. */
function enrichMonitorServiceLabel(name) {
  const raw = String(name || "").trim();
  if (!raw) return raw;
  if (/^filesystem\b/i.test(raw)) return raw;
  if (raw === "/" || /^\/[\w./-]*$/.test(raw) || /^[A-Za-z]:([\\/].*)?$/.test(raw)) {
    return `Filesystem ${raw}`;
  }
  return raw;
}

function hostIsDown(hostState) {
  return hostState === "DOWN" || hostState === "UNREACHABLE" || hostState === "2";
}

/**
 * Explicit monitor alert label: "Warning - Filesystem E:/" (never severity alone when detail exists).
 */
export function formatMonitorIssueLabel(severityLabel, detail) {
  const base = String(severityLabel || "").trim() || "Alert";
  const fromPrimary = enrichMonitorServiceLabel(
    detail?.primaryService || detail?.serviceName || detail?.service || detail?.serviceDescription || ""
  );
  if (fromPrimary && !isBareSeverityToken(fromPrimary)) return `${base} - ${fromPrimary}`;

  const fromList = Array.isArray(detail?.failingServices)
    ? detail.failingServices
        .map(name => enrichMonitorServiceLabel(name))
        .filter(name => name && !isBareSeverityToken(name))
    : [];
  if (fromList.length) return `${base} - ${fromList.slice(0, 2).join(" · ")}`;

  const plugin = String(detail?.pluginOutput || detail?.plugin_output || detail?.description || "").trim();
  if (plugin && !isBareSeverityToken(plugin)) {
    if (/^(warning|critical)\s*[-–—]/i.test(plugin)) return plugin;
    return `${base} - ${plugin}`;
  }

  const host = String(detail?.hostName || detail?.hostname || detail?.host || "").trim();
  const hostState = String(detail?.hostState || detail?.host_state || "").toUpperCase();
  if (hostIsDown(hostState) || hostState === "DOWN") {
    return host ? `${base} - Host DOWN (${host})` : `${base} - Host DOWN`;
  }
  if (host) return `${base} - ${host}`;

  const crit = Number(detail?.critServices) || 0;
  const warn = Number(detail?.warnServices) || 0;
  if (crit > 0) return `${base} - ${crit} service${crit > 1 ? "s" : ""}`;
  if (warn > 0) return `${base} - ${warn} service${warn > 1 ? "s" : ""}`;
  return base;
}
