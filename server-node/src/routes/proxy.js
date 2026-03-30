const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || process.env.SECRET_KEY || 'anti-fraud-change-this-in-production';

/**
 * Mount the API proxy and the internal alert endpoint onto the Express app.
 *
 * @param {import('express').Express} app
 * @param {Function} broadcastAlert – function(userId, alertData)
 */
function mountProxy(app, broadcastAlert) {
  // ------------------------------------------------------------------
  // POST /internal/alert
  // Called by the Python backend when it detects high risk (level >= 2).
  // Body: { user_id, alert_type, risk_level, message, details, ... }
  // ------------------------------------------------------------------
  app.post('/internal/alert', express.json(), (req, res) => {
    // Verify internal shared secret to prevent unauthorized alert broadcasts
    const secret = req.headers['x-internal-secret'];
    if (secret !== INTERNAL_SECRET) {
      return res.status(403).json({ detail: 'Forbidden: invalid internal secret' });
    }

    const { user_id, userId } = req.body || {};
    const targetUserId = user_id || userId;

    if (!targetUserId) {
      return res.status(400).json({ detail: 'user_id is required' });
    }

    try {
      broadcastAlert(targetUserId, req.body);
      return res.json({ success: true, message: 'Alert broadcast sent' });
    } catch (err) {
      console.error('[proxy] broadcastAlert error:', err.message);
      return res.status(500).json({ detail: 'Failed to broadcast alert' });
    }
  });

  // ------------------------------------------------------------------
  // Proxy all /api/* requests to the Python FastAPI backend
  // ------------------------------------------------------------------
  const apiProxy = createProxyMiddleware({
    target: PYTHON_API,
    changeOrigin: true,
    // Express mount at /api strips the prefix from req.url; add it back for FastAPI routes.
    pathRewrite: (path) => `/api${path}`,
    // Forward WebSocket upgrade requests if any sub-path needs it
    ws: false,
    // Logging
    on: {
      proxyReq: (proxyReq, req) => {
        console.log(`[proxy] ${req.method} ${req.originalUrl} -> ${PYTHON_API}${req.originalUrl}`);
      },
      error: (err, req, res) => {
        console.error('[proxy] Proxy error:', err.message);
        if (res && typeof res.status === 'function') {
          res.status(502).json({ detail: 'Python backend unavailable' });
        }
      },
    },
  });

  app.use('/api', apiProxy);
}

module.exports = { mountProxy };
