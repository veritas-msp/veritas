import tls from "tls";

/**
 * Parse hostname + port from a host, host:port, or full URL.
 * Explicit port in the string wins over fallbackPort (e.g. pasted https://host:7002/...).
 */
export function parseSslTarget(raw, fallbackPort = 443) {
  const input = String(raw || "").trim();
  const defaultPort = Number(fallbackPort);
  const safeFallback = Number.isFinite(defaultPort) && defaultPort > 0 && defaultPort <= 65535 ? defaultPort : 443;
  if (!input) {
    return {
      hostname: "",
      port: safeFallback
    };
  }

  const fromUrl = (() => {
    try {
      const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
      const url = new URL(hasScheme ? input : `https://${input}`);
      const hostname = String(url.hostname || "").replace(/^\[|\]$/g, "").trim().toLowerCase();
      if (!hostname) return null;
      const explicitPort = url.port ? Number(url.port) : null;
      return {
        hostname,
        port: Number.isFinite(explicitPort) && explicitPort > 0 ? explicitPort : safeFallback,
        hasExplicitPort: Boolean(url.port)
      };
    } catch {
      return null;
    }
  })();

  if (fromUrl?.hostname) {
    return {
      hostname: fromUrl.hostname,
      port: fromUrl.port
    };
  }

  let hostPart = input.replace(/^https?:\/\//i, "").split("/")[0].split("?")[0].trim();
  const ipv6 = hostPart.match(/^\[([^\]]+)\](?::(\d{1,5}))?$/);
  if (ipv6) {
    const portNum = Number(ipv6[2]);
    return {
      hostname: String(ipv6[1] || "").toLowerCase(),
      port: Number.isFinite(portNum) && portNum > 0 ? portNum : safeFallback
    };
  }

  const colonIdx = hostPart.lastIndexOf(":");
  if (colonIdx > 0 && /^\d{1,5}$/.test(hostPart.slice(colonIdx + 1))) {
    const portNum = Number(hostPart.slice(colonIdx + 1));
    return {
      hostname: hostPart.slice(0, colonIdx).toLowerCase(),
      port: Number.isFinite(portNum) && portNum > 0 ? portNum : safeFallback
    };
  }

  return {
    hostname: hostPart.toLowerCase(),
    port: safeFallback
  };
}

function normalizeHost(raw) {
  return parseSslTarget(raw).hostname;
}

export function checkSslCertificate(host, port = 443, timeoutMs = 12000) {
  const parsed = parseSslTarget(host, port);
  const hostname = parsed.hostname;
  if (!hostname) {
    return Promise.reject(new Error("Invalid hostname"));
  }
  const numericPort = parsed.port || 443;
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: hostname,
      port: numericPort,
      servername: hostname,
      rejectUnauthorized: false
    }, () => {
      try {
        const cert = socket.getPeerCertificate(true);
        socket.end();
        if (!cert || Object.keys(cert).length === 0 || !cert.valid_to) {
          resolve({
            hostname,
            port: numericPort,
            valid: false,
            error: "Certificate not found",
            lastChecked: new Date().toISOString()
          });
          return;
        }
        const expiration = new Date(cert.valid_to);
        const daysRemaining = Number.isNaN(expiration.getTime())
          ? null
          : Math.ceil((expiration.getTime() - Date.now()) / 86400000);
        const protocol = typeof socket.getProtocol === "function" ? socket.getProtocol() : null;
        resolve({
          hostname,
          port: numericPort,
          valid: socket.authorized !== false && daysRemaining != null && daysRemaining >= 0,
          subject: cert.subject?.CN || cert.subjectaltname || hostname,
          subjectCN: cert.subject?.CN || null,
          subjectO: cert.subject?.O || null,
          issuer: cert.issuer?.O || cert.issuer?.CN || null,
          issuerCN: cert.issuer?.CN || null,
          issuerO: cert.issuer?.O || null,
          validFrom: cert.valid_from ? new Date(cert.valid_from).toISOString() : null,
          expiration: Number.isNaN(expiration.getTime()) ? null : expiration.toISOString(),
          daysRemaining,
          serialNumber: cert.serialNumber || null,
          fingerprint: cert.fingerprint256 || cert.fingerprint || null,
          subjectAltNames: cert.subjectaltname || null,
          protocol,
          authorized: socket.authorized,
          authorizationError: socket.authorizationError?.message || null,
          lastChecked: new Date().toISOString()
        });
      } catch (err) {
        socket.destroy();
        reject(err);
      }
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error(`Timeout exceeded for ${hostname}:${numericPort}`));
    });
    socket.on("error", err => {
      reject(err);
    });
  });
}
export function getSslExpiryStatus(expiration, warnDays = 30) {
  if (!expiration) return "unknown";
  const expiry = new Date(expiration);
  if (Number.isNaN(expiry.getTime())) return "unknown";
  const now = new Date();
  if (expiry < now) return "expired";
  const warnDate = new Date(now);
  warnDate.setDate(warnDate.getDate() + warnDays);
  if (expiry <= warnDate) return "expiring_soon";
  return "valid";
}
export const DEFAULT_SSL_CHECK_INTERVAL_HOURS = 24;
export function resolveSslCheckIntervalHours(data) {
  const hours = Number(data?.checkIntervalHours);
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SSL_CHECK_INTERVAL_HOURS;
}
export function isSslCheckStale(data) {
  if (!data?.lastChecked) return true;
  const last = new Date(data.lastChecked);
  if (Number.isNaN(last.getTime())) return true;
  const intervalMs = resolveSslCheckIntervalHours(data) * 3600000;
  return Date.now() - last.getTime() >= intervalMs;
}

export { normalizeHost };
