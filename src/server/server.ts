/// <reference lib="dom" />
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Что-то пошло не так!');
});

app.use(express.static(join(__dirname, '../../public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../../public/index.html'));
});

interface Room {
  users: string[];
}

const rooms: Map<string, Room> = new Map();

io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('join-room', (roomId: string) => {
    const room = rooms.get(roomId) || { users: [] };

    if (room.users.length >= 2 && !room.users.includes(socket.id)) {
      socket.emit('room-full');
      return;
    }

    if (!room.users.includes(socket.id)) {
      socket.join(roomId);
      room.users.push(socket.id);
      rooms.set(roomId, room);
    }

    if (room.users.length === 2) {
      io.to(roomId).emit('ready', {
        initiator: room.users[0],
        receiver: room.users[1],
      });
    }

    console.log(`Комната ${roomId}:`, room.users);
  });

  socket.on('offer', (offer: RTCSessionDescriptionInit, roomId: string) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', (answer: RTCSessionDescriptionInit, roomId: string) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate: RTCIceCandidate, roomId: string) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const index = room.users.indexOf(socket.id);
      if (index !== -1) {
        room.users.splice(index, 1);
        console.log(`Пользователь ${socket.id} покинул комнату ${roomId}`);

        if (room.users.length === 1) {
          io.to(roomId).emit('user-disconnected');
        }

        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`Комната ${roomId} удалена`);
        }
      }
    });
  });
});

const PORT = Number(process.env.PORT) || 3000;

httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже используется. Попробуйте другой порт.`);
    process.exit(1);
  } else {
    console.error('Ошибка сервера:', error);
  }
});

function startServer(port: number) {
  httpServer
    .listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    })
    .on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Порт ${port} занят, пробуем порт ${port + 1}`);
        startServer(port + 1);
      }
    });
}

startServer(PORT);
