let observer = null;
let screenStream = null;
let frameTimer = null;
let currentToken = null;

function postToPage(type, payload) {
  window.postMessage({ type, payload }, window.location.origin);
}

function startDomObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    const texts = [];

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent?.trim();
            if (t) texts.push(t);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const t = node.textContent?.trim();
            if (t) texts.push(t.slice(0, 300));
          }
        });
      } else if (mutation.type === "characterData") {
        const t = mutation.target.textContent?.trim();
        if (t) texts.push(t.slice(0, 300));
      }
    }

    if (texts.length > 0) {
      const textPayload = texts.join(" ").slice(0, 1500);
      chrome.runtime.sendMessage({
        type: "AF_FORWARD_DATA",
        payload: {
          token: currentToken,
          text: textPayload,
          source: "dom-mutation",
          url: location.href,
          ts: Date.now()
        }
      });

      postToPage("AF_PLUGIN_DATA", { text: textPayload });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function stopDomObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

async function startScreenCapture() {
  if (screenStream) return;

  screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 1 },
    audio: false
  });

  const video = document.createElement("video");
  video.srcObject = screenStream;
  video.muted = true;
  await video.play();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  frameTimer = setInterval(() => {
    if (!ctx || !video.videoWidth || !video.videoHeight) return;

    canvas.width = Math.min(video.videoWidth, 960);
    canvas.height = Math.min(video.videoHeight, 540);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameBase64 = canvas.toDataURL("image/jpeg", 0.65);

    chrome.runtime.sendMessage({
      type: "AF_FORWARD_DATA",
      payload: {
        token: currentToken,
        text: "SCREEN_FRAME_CAPTURED",
        image_frame: frameBase64,
        source: "screen-capture",
        url: location.href,
        ts: Date.now()
      }
    });
  }, 2000);
}

function stopScreenCapture() {
  if (frameTimer) {
    clearInterval(frameTimer);
    frameTimer = null;
  }

  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
    screenStream = null;
  }
}

async function startMonitoring(payload) {
  currentToken = payload?.token || null;

  try {
    startDomObserver();
    await startScreenCapture();
    postToPage("AF_PLUGIN_STATUS", { status: "started", message: "插件监控已启动" });
  } catch (err) {
    postToPage("AF_PLUGIN_STATUS", { status: "error", message: "插件无法启动屏幕采集，请检查授权" });
  }
}

function stopMonitoring() {
  stopDomObserver();
  stopScreenCapture();
  currentToken = null;
  postToPage("AF_PLUGIN_STATUS", { status: "stopped", message: "插件监控已停止" });
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "AF_PING_PLUGIN") {
    postToPage("AF_PLUGIN_READY", { ready: true });
    return;
  }

  if (data.type === "AF_START_MONITORING") {
    chrome.runtime.sendMessage(data);
    startMonitoring(data.payload || {});
    return;
  }

  if (data.type === "AF_STOP_MONITORING") {
    chrome.runtime.sendMessage(data);
    stopMonitoring();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== "object") return;
  if (message.type === "AF_PLUGIN_STATUS") {
    postToPage("AF_PLUGIN_STATUS", message.payload);
  }
});

postToPage("AF_PLUGIN_READY", { ready: true });
