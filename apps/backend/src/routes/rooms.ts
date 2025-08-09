/**
 * Эндпоинты управления комнатами (лобби).  Подпуть `/api/rooms`.
 *
 * GET `/` – получить список комнат с фильтрами (игра, ставка, статус).
 * POST `/` – создать новую комнату.  Требуется авторизация.
 * POST `/:id/join` – присоединиться к комнате.  Требуется авторизация.
 * POST `/:id/leave` – покинуть комнату.  Требуется авторизация.
 */
import { FastifyPluginAsync } from 'fastify';
import { RoomStatus } from '@shared';

const roomsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/rooms
   * List rooms with optional filters: game, stake, status, page, limit
   */
  app.get('/', async (request, reply) => {
    const { game, stake, status, page = 1, limit = 10 } = request.query as any;
    const client = await app.getPgClient();
    try {
      const whereClauses: string[] = [];
      const params: any[] = [];
      let idx = 1;
      if (game) {
        whereClauses.push(`game = $${idx++}`);
        params.push(game);
      }
      if (stake) {
        whereClauses.push(`stake_ton = $${idx++}`);
        params.push(Number(stake));
      }
      if (status) {
        whereClauses.push(`status = $${idx++}`);
        params.push(status);
      }
      const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const offset = (Number(page) - 1) * Number(limit);
      const query = `SELECT id, game, stake_ton, preset, privacy, status, owner_id, created_at FROM rooms ${where} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(Number(limit), offset);
      const res = await client.query(query, params);
      reply.send({ rooms: res.rows });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/rooms
   * Create a new room.  Requires authentication.
   */
  app.post('/', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId as number;
    const { game, rules, timeFormat, stake, privacy, pin } = request.body as any;
    if (!game || !stake || !privacy) {
      reply.status(400).send({ error: 'Missing required fields' });
      return;
    }
    const client = await app.getPgClient();
    try {
      // Insert room
      const insertRoom = await client.query(
        'INSERT INTO rooms (game, rules_json, stake_ton, preset, privacy, status, owner_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING id',
        [game, JSON.stringify(rules || {}), Number(stake), null, privacy, RoomStatus.WAITING, userId]
      );
      const roomId = insertRoom.rows[0].id;
      // Insert room member (owner)
      await client.query('INSERT INTO room_members (room_id, user_id, joined_at) VALUES ($1, $2, now())', [roomId, userId]);
      reply.send({ id: roomId });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/rooms/:id/join
   * Join a waiting room.  Requires authentication.
   */
  app.post('/:id/join', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId as number;
    const roomId = Number((request.params as any).id);
    const client = await app.getPgClient();
    try {
      // Check if user already a member
      const exists = await client.query('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
      if (exists.rowCount > 0) {
        reply.status(400).send({ error: 'Already joined' });
        return;
      }
      // Check room status
      const roomRes = await client.query('SELECT status FROM rooms WHERE id = $1', [roomId]);
      if (roomRes.rowCount === 0) {
        reply.status(404).send({ error: 'Room not found' });
        return;
      }
      const statusVal = roomRes.rows[0].status as RoomStatus;
      if (statusVal !== RoomStatus.WAITING) {
        reply.status(400).send({ error: 'Room is not accepting players' });
        return;
      }
      // Insert member
      await client.query('INSERT INTO room_members (room_id, user_id, joined_at) VALUES ($1, $2, now())', [roomId, userId]);
      // Count members to update status
      const members = await client.query('SELECT COUNT(*)::int AS count FROM room_members WHERE room_id = $1', [roomId]);
      if (Number(members.rows[0].count) >= 2) {
        await client.query('UPDATE rooms SET status = $1 WHERE id = $2', [RoomStatus.FULL, roomId]);
      }
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/rooms/:id/leave
   * Leave a room.  Requires authentication.
   */
  app.post('/:id/leave', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId as number;
    const roomId = Number((request.params as any).id);
    const client = await app.getPgClient();
    try {
      const del = await client.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
      if (del.rowCount === 0) {
        reply.status(400).send({ error: 'Not in room' });
        return;
      }
      // Update status to WAITING if previously full
      await client.query('UPDATE rooms SET status = $1 WHERE id = $2', [RoomStatus.WAITING, roomId]);
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });
};

export default roomsRoutes;