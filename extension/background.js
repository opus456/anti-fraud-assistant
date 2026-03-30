let gatewaySocket = null;
let isConnected = false;
let isAuthed = false;
let latestConfig = {
  token: null,
  gatewayWsUrl: "http://localhost:3001"
};

function emitStatusToPage(tabId, status, message) {
  chrome.tabs.sendMessage(tabId, {
    type: "AF_PLUGIN_STATUS",
    payload: { status, message }
  }).catch(() => {
    // Ignore tabs that no longer exist.
  });
}

function normalizeWsUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/$/, "");
  if (normalized.startsWith("https://")) {
    return normalized.replace("https://", "wss://");
  }
  if (normalized.startsWith("http://")) {
    return normalized.replace("http://", "ws://");
  }
  return normalized;
}

function connectGatewaySocket(tabId) {
  if (!latestConfig.token) {
    emitStatusToPage(tabId, "error", "Token missing for WebSocket auth.");
    return;
  }

  if (gatewaySocket && (gatewaySocket.readyState === WebSocket.OPEN || gatewaySocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsBase = normalizeWsUrl(latestConfig.gatewayWsUrl || "http://localhost:3001");
  const wsUrl = `${wsBase}/socket.io/?EIO=4&transport=websocket`;

  gatewaySocket = new WebSocket(wsUrl);

  gatewaySocket.onopen = () => {
    isConnected = true;
    isAuthed = false;
  };

  gatewaySocket.onmessage = (event) => {
    const payload = String(event.data || "");

    // Engine.IO handshake packet.
    if (payload.startsWith("0") && !isAuthed) {
      gatewaySocket.send(`40${JSON.stringify({ token: latestConfig.token })}`);
      // Do not set isAuthed yet – wait for server ack.
      return;
    }

    // Socket.IO CONNECT ack (server confirms authentication).
    if (payload.startsWith("40") && !isAuthed) {
      isAuthed = true;
      emitStatusToPage(tabId, "started", "Gateway connected.");
      return;
    }

    // Engine.IO ping -> pong.
    if (payload === "2") {
      gatewaySocket.send("3");
      return;
    }
  };

  gatewaySocket.onclose = () => {
    isConnected = false;
    isAuthed = false;
  };

  gatewaySocket.onerror = () => {
    emitStatusToPage(tabId, "error", "WebSocket connection failed.");
  };
}

function sendMonitorData(data) {
  if (!gatewaySocket || gatewaySocket.readyState !== WebSocket.OPEN || !isConnected || !isAuthed) return;

  // Socket.IO protocol message:
  // 42["monitor_data", {...}]
  const packet = ["monitor_data", data];
  gatewaySocket.send(`42${JSON.stringify(packet)}`);
}

function stopGatewaySocket() {
  if (gatewaySocket) {
    gatewaySocket.close();
    gatewaySocket = null;
  }
  isConnected = false;
  isAuthed = false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "AF_START_MONITORING") {
    latestConfig = {
      token: message.payload?.token || null,
      gatewayWsUrl: message.payload?.gatewayWsUrl || "http://localhost:3001"
    };

    const tabId = sender.tab?.id;
    if (typeof tabId === "number") {
      connectGatewaySocket(tabId);
    }

    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "AF_STOP_MONITORING") {
    stopGatewaySocket();
    const tabId = sender.tab?.id;
    if (typeof tabId === "number") {
      emitStatusToPage(tabId, "stopped", "Monitoring stopped.");
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "AF_FORWARD_DATA") {
    sendMonitorData(message.payload || {});
    sendResponse({ ok: true });
    return true;
  }
});
