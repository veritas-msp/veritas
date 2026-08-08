import { buildMetricSnapshot, resolveInstantDiskDrives } from "./rmmMetricDashboardUtils";
import { buildRmmAgentRowFromEquipment, getRmmInventoryFromEquipment, getSecuritySummary, getUpdatesDetail, resolveRmmAgentOnline } from "./rmmMonitoringUtils";

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isBitLockerProtected(volume) {
  const text = `${volume?.protection || ""} ${volume?.encryption || ""}`.toLowerCase();
  if (!text.trim()) return null;
  if (/(protection on|on|enabled|encrypt|chiff|locked)/i.test(text) && !/(protection off|off|disabled|unencrypt|déchif)/i.test(text)) {
    return true;
  }
  if (/(protection off|off|disabled|unprotect)/i.test(text)) return false;
  return null;
}

function gradeFromScore(score) {
  if (score >= 90) return {
    grade: "A",
    tone: "good"
  };
  if (score >= 75) return {
    grade: "B",
    tone: "good"
  };
  if (score >= 60) return {
    grade: "C",
    tone: "warn"
  };
  if (score >= 40) return {
    grade: "D",
    tone: "warn"
  };
  return {
    grade: "E",
    tone: "critical"
  };
}

/**
 * Device health / cybersecurity score (0–100) from agent inventory.
 */
export function computeRmmDeviceHealth(equipment) {
  const inventory = getRmmInventoryFromEquipment(equipment);
  const security = getSecuritySummary(inventory);
  const updates = getUpdatesDetail(inventory);
  const services = inventory.services || {};
  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const stoppedCount = Number(services.stoppedCount) || serviceItems.filter(s => String(s.status || "").toLowerCase() !== "running").length;
  const online = resolveRmmAgentOnline(equipment);
  const snapshot = buildMetricSnapshot(buildRmmAgentRowFromEquipment(equipment));
  const drives = resolveInstantDiskDrives(snapshot);

  let score = 100;
  const checks = [];

  const defenderOn = security.defender?.enabled === true;
  const defenderOff = security.defender?.enabled === false;
  const realtimeOn = security.defender?.realTimeProtection === true;
  if (defenderOn && realtimeOn) {
    checks.push({
      key: "defender",
      ok: true,
      weight: 20
    });
  } else if (defenderOn && !realtimeOn) {
    score -= 12;
    checks.push({
      key: "defender",
      ok: false,
      weight: 12
    });
  } else if (defenderOff) {
    score -= 22;
    checks.push({
      key: "defender",
      ok: false,
      weight: 22
    });
  } else {
    score -= 6;
    checks.push({
      key: "defender",
      ok: null,
      weight: 6
    });
  }

  const firewall = Array.isArray(security.firewall) ? security.firewall : [];
  if (firewall.length) {
    const disabled = firewall.filter(profile => !profile.enabled).length;
    if (disabled === 0) {
      checks.push({
        key: "firewall",
        ok: true,
        weight: 12
      });
    } else {
      const penalty = Math.min(15, disabled * 5);
      score -= penalty;
      checks.push({
        key: "firewall",
        ok: false,
        weight: penalty
      });
    }
  } else {
    score -= 4;
    checks.push({
      key: "firewall",
      ok: null,
      weight: 4
    });
  }

  const bitLocker = Array.isArray(security.bitLocker) ? security.bitLocker : [];
  if (bitLocker.length) {
    const states = bitLocker.map(isBitLockerProtected);
    const knownBad = states.filter(v => v === false).length;
    const knownGood = states.filter(v => v === true).length;
    if (knownBad === 0 && knownGood > 0) {
      checks.push({
        key: "bitlocker",
        ok: true,
        weight: 18
      });
    } else if (knownBad > 0) {
      const penalty = Math.min(20, 8 + knownBad * 4);
      score -= penalty;
      checks.push({
        key: "bitlocker",
        ok: false,
        weight: penalty
      });
    } else {
      score -= 5;
      checks.push({
        key: "bitlocker",
        ok: null,
        weight: 5
      });
    }
  } else {
    score -= 8;
    checks.push({
      key: "bitlocker",
      ok: false,
      weight: 8
    });
  }

  if (updates.hasPendingScan) {
    const pending = Number(updates.pendingCount) || updates.pendingItems?.length || 0;
    const securityPending = Number(updates.securityPendingCount) || 0;
    if (pending === 0 && !updates.rebootRequired) {
      checks.push({
        key: "updates",
        ok: true,
        weight: 20
      });
    } else {
      let penalty = Math.min(28, 6 + pending * 2 + securityPending * 3);
      if (updates.rebootRequired) penalty += 8;
      score -= penalty;
      checks.push({
        key: "updates",
        ok: false,
        weight: penalty
      });
    }
  } else {
    score -= 10;
    checks.push({
      key: "updates",
      ok: null,
      weight: 10
    });
  }

  if (serviceItems.length) {
    if (stoppedCount === 0) {
      checks.push({
        key: "services",
        ok: true,
        weight: 10
      });
    } else {
      const penalty = Math.min(15, stoppedCount * 5);
      score -= penalty;
      checks.push({
        key: "services",
        ok: false,
        weight: penalty
      });
    }
  }

  if (online === false) {
    score -= 12;
    checks.push({
      key: "online",
      ok: false,
      weight: 12
    });
  } else if (online === true) {
    checks.push({
      key: "online",
      ok: true,
      weight: 8
    });
  }

  const criticalDisks = drives.filter(d => d.pct != null && d.pct >= 90).length;
  const warnDisks = drives.filter(d => d.pct != null && d.pct >= 80 && d.pct < 90).length;
  if (criticalDisks > 0) {
    const penalty = Math.min(15, criticalDisks * 8);
    score -= penalty;
    checks.push({
      key: "disk",
      ok: false,
      weight: penalty
    });
  } else if (warnDisks > 0) {
    score -= 5;
    checks.push({
      key: "disk",
      ok: false,
      weight: 5
    });
  } else if (drives.length) {
    checks.push({
      key: "disk",
      ok: true,
      weight: 5
    });
  }

  const finalScore = clampScore(score);
  const {
    grade,
    tone
  } = gradeFromScore(finalScore);
  const okCount = checks.filter(c => c.ok === true).length;
  const badCount = checks.filter(c => c.ok === false).length;

  return {
    score: finalScore,
    grade,
    tone,
    checks,
    okCount,
    badCount,
    pendingUpdates: Number(updates.pendingCount) || updates.pendingItems?.length || 0,
    rebootRequired: Boolean(updates.rebootRequired),
    defenderOk: defenderOn && realtimeOn,
    bitLockerVolumes: bitLocker.length,
    stoppedServices: stoppedCount,
    online
  };
}
