import { io } from 'socket.io-client';

// Socket.IO client for the Node.js real-time server.
// autoConnect is off so we connect only when needed (e.g. after login).
const socket = io(import.meta.env.VITE_NODE_SERVER_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
});

export default socket;
