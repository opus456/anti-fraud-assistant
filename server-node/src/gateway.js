const axios = require('axios');
const { verifyToken } = require('./middleware/auth');

const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// broadcastAlert – callable from the /internal/alert route
// ---------------------------------------------------------------------------
let _io = null;

function normalizeRiskLevel(value) {
  if (typeof value === 'number') {
    return value;
  }
  const riskLevelMap = {
    safe: 0,
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  return riskLevelMap[value] ?? 0;
}

/**
 * Broadcast an alert to the affected user AND their guardians.
 *
 * @param {string|number} userId  – the user who is at risk
 * @param {object}        alertData – arbitrary alert payload from Python
 */
function broadcastAlert(userId, alertData) {
  if (!_io) {
    console.error('[gateway] broadcastAlert called before io is initialised');
    return;
  }

  const riskLevel = normalizeRiskLevel(alertData?.risk_level ?? alertData?.risk_level_label);
  const normalizedPayload = {
    ...alertData,
    risk_level: riskLevel,
    risk_level_label: alertData?.risk_level_label || alertData?.risk_level,
  };

  // Notify the user themselves
  _io.to(`user:${userId}`).emit('SHOW_WARNING', normalizedPayload);
  // Notify any guardians watching this user
  _io.to(`guardian:${userId}`).emit('GUARDIAN_ALERT', normalizedPayload);

  console.log(`[gateway] Alert broadcast for user ${userId}`);
}

// ---------------------------------------------------------------------------
// setupGateway – attach auth middleware & event handlers to Socket.io
// ---------------------------------------------------------------------------
function setupGateway(io) {
  _io = io;

  // ---- Auth middleware – runs once per connection attempt ----
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: token missing'));
    }
    try {
      const payload = verifyToken(token);
      socket.user = payload; // attach decoded user info to the socket
      next();
    } catch (err) {
      return next(new Error('Authentication error: ' + err.message));
    }
  });

  // ---- Connection handler ----
  io.on('connection', async (socket) => {
    const userId = socket.user.userId || socket.user.sub || socket.user.id;
    console.log(`[gateway] Socket connected – user ${userId} (${socket.id})`);

    // Join the user's own room
    socket.join(`user:${userId}`);

    // If this user is a guardian, join the rooms of users they are guarding
    try {
      const resp = await axios.get(`${PYTHON_API}/api/guardians/charges`, {
        headers: { Authorization: `Bearer ${socket.handshake.auth.token}` },
      });
      const charges = resp.data; // expected: array of objects with a user_id field
      if (Array.isArray(charges)) {
        charges.forEach((charge) => {
          const chargeUserId = charge.user_id || charge.userId;
          if (chargeUserId) {
            socket.join(`guardian:${chargeUserId}`);
            console.log(`[gateway] User ${userId} joined guardian:${chargeUserId}`);
          }
        });
      }
    } catch (err) {
      // If the endpoint doesn't exist yet or the user has no charges, that's OK.
      if (err.response && err.response.status === 404) {
        // silently ignore – guardians feature may not be enabled
      } else {
        console.warn('[gateway] Failed to fetch guardian charges:', err.message);
      }
    }

    // ---- monitor_data event ----
    // The frontend sends text/content to be analysed by the Python detection API.
    socket.on('monitor_data', async (data, ack) => {
      try {
        const hasMultimodalPayload = Boolean(
          data.image_frame || data.image_ocr || data.audio_transcript || data.video_description
        );

        const endpoint = hasMultimodalPayload
          ? `${PYTHON_API}/api/detection/multimodal`
          : `${PYTHON_API}/api/detection/text`;

        const payload = hasMultimodalPayload
          ? {
              text: data.text || data.content || '',
              image_ocr: data.image_ocr || (data.image_frame ? 'SCREEN_FRAME_CAPTURED' : ''),
              audio_transcript: data.audio_transcript || '',
              video_description: data.video_description || '',
              image_frame: data.image_frame || '',
              context: data.context || data.url || '',
            }
          : {
              content: data.text || data.content || '',
              context: data.context || '',
            };

        const resp = await axios.post(endpoint, payload, {
          headers: { Authorization: `Bearer ${socket.handshake.auth.token}` },
        });
        const result = resp.data;

        const riskLevelNum = normalizeRiskLevel(result.risk_level);

        if (riskLevelNum >= 2) {
          const alertPayload = {
            ...result,
            risk_level: riskLevelNum,
            risk_level_label: result.risk_level,
            user_id: userId,
            screenshot: data.image_frame || '',
            image_frame: data.image_frame || '',
            source: data.source || 'plugin',
          };
          _io.to(`user:${userId}`).emit('SHOW_WARNING', alertPayload);
          _io.to(`guardian:${userId}`).emit('GUARDIAN_ALERT', alertPayload);
        }

        // Send result back to the caller
        if (typeof ack === 'function') {
          ack({ success: true, result });
        }
        socket.emit('DETECTION_RESULT', result);
      } catch (err) {
        console.error('[gateway] monitor_data detection error:', err.message);
        if (typeof ack === 'function') {
          ack({ success: false, error: err.message });
        }
        socket.emit('DETECTION_ERROR', { error: err.message });
      }
    });

    // ---- join_guardian_room event ----
    // Allows a guardian to dynamically start watching a specific user.
    socket.on('join_guardian_room', (data) => {
      const targetUserId = data.userId || data.user_id;
      if (targetUserId) {
        socket.join(`guardian:${targetUserId}`);
        console.log(`[gateway] User ${userId} joined guardian:${targetUserId} (dynamic)`);
      }
    });

    // ---- disconnect ----
    socket.on('disconnect', (reason) => {
      console.log(`[gateway] Socket disconnected – user ${userId} (${reason})`);
      // Socket.io automatically removes the socket from all rooms on disconnect,
      // so no manual cleanup is required.
    });
  });
}

module.exports = { setupGateway, broadcastAlert };
