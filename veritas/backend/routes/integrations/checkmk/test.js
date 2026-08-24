import express from 'express';
import fetch from 'node-fetch';
import verifyJWT from '../../../middleware/auth.js';
import { authenticateCheckMK, getCheckMKCredentialsFromRequest } from './utils.js';

const router = express.Router();

function countHosts(data) {
  const hosts = Array.isArray(data) ? data : data?.hosts || data?.value || [];
  return Array.isArray(hosts) ? hosts.length : 0;
}

async function fetchHostsCount(apiUrl, authHeader) {
  const possibleEndpoints = [
    `${apiUrl}/domain-types/host_config/collections/all`,
    `${apiUrl}/objects/host`,
    `${apiUrl}/objects/host_config`,
    `${apiUrl}/hosts`
  ];
  for (const endpoint of possibleEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: authHeader
        }
      });
      if (!response.ok) {
        if (response.status === 404) continue;
        return 0;
      }
      const data = await response.json().catch(() => null);
      if (!data) return 0;
      return countHosts(data);
    } catch {
      continue;
    }
  }
  return 0;
}

router.post('/test', verifyJWT, async (req, res) => {
  try {
    const credentials = await getCheckMKCredentialsFromRequest(req);
    const authData = await authenticateCheckMK(credentials.apiUrl, credentials.username, credentials.password);
    const hostsCount = await fetchHostsCount(credentials.apiUrl, authData.auth_header);
    res.json({
      success: true,
      message: 'Checkmk connection OK',
      hostsCount,
      testedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error.message || 'Checkmk connection error';
    const isConfig = /incomplete|required|not configured/i.test(message);
    const isAuth = /invalid|401|403|credentials/i.test(message);
    res.status(isConfig ? 400 : isAuth ? 401 : 500).json({
      success: false,
      error: message,
      details: message
    });
  }
});

export default router;
