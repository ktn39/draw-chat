import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ChatMessage, ClientToServerEvents, DrawStroke, ServerSnapshot, ServerToClientEvents } from './shared/types.js';

const PORT = Number(process.env.PORT ?? 3001);
const MAX_CHAT_MESSAGES = 100;
const MAX_STROKES = 5000;

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' },
});

const strokes: DrawStroke[] = [];
const messages: ChatMessage[] = [];
const users = new Map<string, string>();

const createMessage = (userName: string, text: string, type: ChatMessage['type']): ChatMessage => ({
  id: randomUUID(),
  userName,
  text,
  type,
  createdAt: new Date().toISOString(),
});

const pushMessage = (message: ChatMessage) => {
  messages.push(message);
  if (messages.length > MAX_CHAT_MESSAGES) messages.splice(0, messages.length - MAX_CHAT_MESSAGES);
  io.emit('chat:message', message);
};

const snapshot = (): ServerSnapshot => ({
  strokes,
  messages,
  users: [...users.values()],
});

const emitUsers = () => io.emit('users:update', [...users.values()]);

io.on('connection', (socket) => {
  socket.on('user:join', (rawName, callback) => {
    const userName = rawName.trim().slice(0, 24) || '名無し';
    users.set(socket.id, userName);
    callback(snapshot());
    emitUsers();
    pushMessage(createMessage('system', `${userName} さんが参加しました`, 'system'));
  });

  socket.on('draw:stroke', (stroke) => {
    const userName = users.get(socket.id);
    if (!userName || stroke.points.length < 2) return;
    const safeStroke: DrawStroke = {
      ...stroke,
      id: stroke.id || randomUUID(),
      userName,
      points: stroke.points.slice(0, 1000),
      size: Math.min(Math.max(stroke.size, 1), 80),
    };
    strokes.push(safeStroke);
    if (strokes.length > MAX_STROKES) strokes.splice(0, strokes.length - MAX_STROKES);
    socket.broadcast.emit('draw:stroke', safeStroke);
  });

  socket.on('canvas:clear', () => {
    if (!users.has(socket.id)) return;
    strokes.length = 0;
    io.emit('canvas:clear');
    pushMessage(createMessage('system', `${users.get(socket.id)} さんがキャンバスを全消ししました`, 'system'));
  });

  socket.on('chat:message', (text) => {
    const userName = users.get(socket.id);
    const trimmed = text.trim().slice(0, 500);
    if (!userName || !trimmed) return;
    pushMessage(createMessage(userName, trimmed, 'user'));
  });

  socket.on('disconnect', () => {
    const userName = users.get(socket.id);
    if (!userName) return;
    users.delete(socket.id);
    emitUsers();
    pushMessage(createMessage('system', `${userName} さんが退出しました`, 'system'));
  });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../client');
app.use(express.static(clientDist));
app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

httpServer.listen(PORT, () => {
  console.log(`Draw chat server listening on http://localhost:${PORT}`);
});
