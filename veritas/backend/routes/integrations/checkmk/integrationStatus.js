import express from 'express';
import verifyJWT from '../../../middleware/auth.js';
import { isCheckmkIntegrationEnabled } from '../../../utils/checkmkIntegrationStatus.js';
import { getCheckmkMonitoringSettings } from '../../../utils/checkmkMonitoringSettings.js';

const router = express.Router();

/**
 * Read-only flag for the UI: any authenticated user must be able to know whether
 * supervision is available, without reading the admin-only settings endpoint.
 */
router.get('/integration-status', verifyJWT, async (req, res) => {
  const [enabled, monitoring] = await Promise.all([
    isCheckmkIntegrationEnabled(),
    getCheckmkMonitoringSettings()
  ]);
  res.json({
    enabled,
    syncIntervalMinutes: monitoring.syncIntervalMinutes,
    syncIntervalMs: monitoring.syncIntervalMs,
    staleAfterMinutes: monitoring.staleAfterMinutes,
    syncSuspended: monitoring.syncSuspended,
    surveillanceSuspended: monitoring.surveillanceSuspended
  });
});

export default router;
