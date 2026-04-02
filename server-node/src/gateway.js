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

  // 验证 userId 有效性
  if (!userId || (typeof userId !== 'string' && typeof userId !== 'number')) {
    console.error('[gateway] Invalid userId in broadcastAlert:', userId);
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
    // 限制日志输出频率，避免终端刷屏
    let lastLogTime = 0;
    const LOG_INTERVAL = 5000; // 每5秒最多输出一次日志

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

        // 只在有风险或间隔足够时输出日志
        const now = Date.now();
        if (riskLevelNum >= 2) {
          console.log(`[gateway] ⚠️ 检测到风险! 用户: ${userId}, 等级: ${result.risk_level}`);
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
        } else if (now - lastLogTime > LOG_INTERVAL) {
          // 安全状态，限制日志频率
          console.log(`[gateway] 实时检测中... 用户: ${userId}, 状态: ${result.risk_level}`);
          lastLogTime = now;
        }

        // Send result back to the caller
        if (typeof ack === 'function') {
          ack({ success: true, result });
        }
        socket.emit('DETECTION_RESULT', result);
      } catch (err) {
        // 限制错误日志频率
        const now = Date.now();
        if (now - lastLogTime > LOG_INTERVAL) {
          console.error('[gateway] monitor_data detection error:', err.message);
          lastLogTime = now;
        }
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
