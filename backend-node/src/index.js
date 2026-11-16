const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const config = require('./config');

const app = express();
app.use(cors({ origin: config.clientOrigins }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'node-realtime' });
});

const server = http.createServer(app);

// Socket.IO server for notifications and live chat (handlers added in Phase 5)
const io = new Server(server, {
  cors: { origin: config.clientOrigins },
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

server.listen(config.port, () => {
  console.log(`Node realtime server running on http://localhost:${config.port}`);
});
