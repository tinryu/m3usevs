import express from 'express';
import cors from 'cors';
import http from 'http'; // Import HTTP module
import { Server } from 'socket.io'; // Import Socket.IO
import videoRouter from './routes/video.js';

const app = express();
const PORT = 5050;

// Middleware to parse JSON
app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Set up the HTTP server
const server = http.createServer(app);
// Initialize Socket.IO with the HTTP server
const io = new Server(server, { cors: {origin: 'http://localhost:3000', methods: ['GET', 'POST']}});

// Store the io instance in the Express app object for access in routes
app.set('io', io);

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Example event handling
  socket.on('startConversion', (msg) => {
    console.log('Message received:', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use('/api/video', videoRouter);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});