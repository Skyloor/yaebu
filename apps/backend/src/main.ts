/**
 * Точка входа для backend‑сервера.  Запускает Fastify, настраивает CORS,
 * JWT‑аутентификацию, подключает Postgres и Redis, регистрирует маршруты и
 * инициализирует Socket.IO для real‑time игр.  Все конфигурации читаются
 * из переменных окружения (.env).
 */
import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') });

import dbPlugin from './plugins/db';
import redisPlugin from './plugins/redis';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import roomsRoutes from './routes/rooms';
import matchesRoutes from './routes/matches';
import escrowRoutes from './routes/escrow';
import serviceRoutes from './routes/service';
import registerMatchSockets from './sockets/matches';

// Instantiate the Fastify server
const app = fastify({ logger: true });

// Register CORS – restrict to the MiniApp origin in development
app.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = [process.env.MINIAPP_URL ?? 'http://localhost:5173'];
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed'), false);
    }
  }
});

// Register JWT plugin
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'CHANGE_ME'
});

// Decorate authenticate hook.  This helper can be used as a preValidation
// handler to ensure that a valid JWT is present on the request.  If
// verification fails the request is aborted.
app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// Register database and redis plugins
app.register(dbPlugin);
app.register(redisPlugin);

// Register routes under /api
app.register(authRoutes, { prefix: '/api/auth' });
app.register(walletRoutes, { prefix: '/api/wallet' });
app.register(roomsRoutes, { prefix: '/api/rooms' });
app.register(matchesRoutes, { prefix: '/api/matches' });
app.register(escrowRoutes, { prefix: '/api/escrow' });
app.register(serviceRoutes, { prefix: '/api' });

// Initialise Socket.IO on top of the native Node server
const io = new SocketIOServer(app.server, {
  cors: {
    origin: process.env.MINIAPP_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Attach io instance to Fastify instance for use in routes
app.decorate('io', io);

// Register real‑time namespaces
registerMatchSockets(io);

// Health check route at root
app.get('/', async () => {
  return { status: 'ok' };
});

// Start the server
const start = async () => {
  try {
    const port = parseInt(process.env.BACKEND_PORT || '4000', 10);
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Backend listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();