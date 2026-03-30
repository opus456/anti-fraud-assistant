const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// ---------------------------------------------------------------------------
// Load environment variables
// ---------------------------------------------------------------------------
dotenv.config();

const PORT = process.env.PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// CORS – allow the configured origins for both REST and pre-flight requests
app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);

// Keep global middlewares lean; JSON parsing is attached only to specific routes

// ---------------------------------------------------------------------------
// HTTP server + Socket.io
// ---------------------------------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
});

// ---------------------------------------------------------------------------
// Socket.io gateway (real-time connection management)
// ---------------------------------------------------------------------------
const { setupGateway, broadcastAlert } = require('./gateway');
setupGateway(io);

// ---------------------------------------------------------------------------
// Routes – API proxy + internal alert endpoint
// ---------------------------------------------------------------------------
const { mountProxy } = require('./routes/proxy');
mountProxy(app, broadcastAlert);

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[gateway] Port ${PORT} is already in use.`);
    console.error('[gateway] Try: npx kill-port 3001');
    process.exit(1);
  }

  console.error('[gateway] Failed to start server:', err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[gateway] Node.js gateway listening on port ${PORT}`);
  console.log(`[gateway] Proxying /api/* -> ${process.env.PYTHON_API || 'http://localhost:8000'}`);
  console.log(`[gateway] Allowed CORS origins: ${CORS_ORIGINS.join(', ')}`);
});
