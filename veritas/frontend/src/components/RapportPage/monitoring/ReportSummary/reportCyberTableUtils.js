export function extractPoliciesList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.policies)) return raw.policies;
  return [];
}
export function getAntivirusSolutionName(sol, fallbackIndex = 0) {
  return sol?.solution || sol?.logiciel || sol?.nom || sol?.name || `Solution ${fallbackIndex + 1}`;
}
export function getAntivirusSolutionEndpoints(sol) {
  const list = sol?.syncData?.endpoints?.list ?? sol?.endpoints ?? (Array.isArray(sol?.data?.endpoints) ? sol.data.endpoints : sol?.data?.endpoints?.list ?? []);
  return Array.isArray(list) ? list : [];
}
export function buildClientPolicyTableRows(policiesList, enrichedEndpoints) {
  const policyUsage = new Map();
  const endpointOnlyNames = new Map();
  enrichedEndpoints.forEach(ep => {
    const policyId = ep.policy?.id;
    if (policyId != null) {
      const key = String(policyId);
      const current = policyUsage.get(key) || {
        count: 0,
        applied: 0
      };
      current.count += 1;
      if (ep.policy?.applied) current.applied += 1;
      policyUsage.set(key, current);
      return;
    }
    const name = ep.policy?.name || ep.policyName || "Sans politique";
    endpointOnlyNames.set(name, (endpointOnlyNames.get(name) || 0) + 1);
  });
  const allPolicies = extractPoliciesList(policiesList);
  if (allPolicies.length > 0) {
    const usedIds = new Set(policyUsage.keys());
    const visiblePolicies = usedIds.size > 0 ? allPolicies.filter(p => p?.id != null && usedIds.has(String(p.id))) : [];
    return visiblePolicies.map(policy => {
      const usage = policyUsage.get(String(policy.id)) || {
        count: 0,
        applied: 0
      };
      const endpoints = usage.count > 0 ? usage.count : policy.endpointsCount ?? 0;
      return {
        key: String(policy.id),
        name: policy.name || policy.policyName || "Sans nom",
        type: policy.type || policy.policyType || "-",
        endpoints,
        applied: usage.applied,
        totalForApplied: usage.count || endpoints
      };
    });
  }
  if (endpointOnlyNames.size > 0) {
    return Array.from(endpointOnlyNames.entries()).map(([name, count]) => ({
      key: name,
      name,
      type: "-",
      endpoints: count,
      applied: null,
      totalForApplied: count
    }));
  }
  return [];
}
export function buildAntivirusPolicyRowsForClient(antivirusSolutions) {
  if (!Array.isArray(antivirusSolutions)) return [];
  return antivirusSolutions.flatMap((sol, solIdx) => {
    const solutionName = getAntivirusSolutionName(sol, solIdx);
    const endpoints = getAntivirusSolutionEndpoints(sol);
    const policies = sol.syncData?.policies || sol.data?.policies || sol.policies || [];
    return buildClientPolicyTableRows(policies, endpoints).map(row => ({
      ...row,
      solutionName
    }));
  });
}
export function buildAntivirusEndpointRowsForClient(antivirusSolutions) {
  if (!Array.isArray(antivirusSolutions)) return [];
  return antivirusSolutions.flatMap((sol, solIdx) => {
    const solutionName = getAntivirusSolutionName(sol, solIdx);
    const endpoints = getAntivirusSolutionEndpoints(sol);
    return endpoints.map((ep, epIdx) => ({
      ...ep,
      _solutionName: solutionName,
      _rowKey: `${solutionName}-${ep.id ?? ep.name ?? epIdx}-${epIdx}`
    }));
  });
}
