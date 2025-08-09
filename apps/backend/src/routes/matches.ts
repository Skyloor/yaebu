/**
 * Эндпоинты для матчей (игровые сессии).  Подпуть `/api/matches`.
 *
 * GET `/:id` – получить детали матча.
 * POST `/:id/move` – отправить ход.  Требуется авторизация.
 * POST `/:id/commit` – отправить хэш хода в RPS.
 * POST `/:id/reveal` – раскрыть ход в RPS.
 *
 * Реальная логика определения победителя и таймеров должна
 * реализовываться на стороне сервера и сигнализироваться клиентам через
 * Socket.IO.
 */
import { FastifyPluginAsync } from 'fastify';

const matchesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/matches/:id
   * Return match details
   */
  app.get('/:id', async (request, reply) => {
    const matchId = Number((request.params as any).id);
    const client = await app.getPgClient();
    try {
      const res = await client.query('SELECT * FROM matches WHERE id = $1', [matchId]);
      if (res.rowCount === 0) {
        reply.status(404).send({ error: 'Match not found' });
        return;
      }
      reply.send(res.rows[0]);
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/matches/:id/move
   * Submit a move for a match.  Requires authentication.  The move is saved to
   * the database and broadcast via Socket.IO to the other participant.  The
   * business logic for validating the move should reside on the backend.
   */
  app.post('/:id/move', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId as number;
    const matchId = Number((request.params as any).id);
    const { move } = request.body as any;
    if (!move) {
      reply.status(400).send({ error: 'Move missing' });
      return;
    }
    const client = await app.getPgClient();
    try {
      // Insert move
      await client.query('INSERT INTO moves (match_id, user_id, move_json, created_at) VALUES ($1, $2, $3, now())', [matchId, userId, JSON.stringify(move)]);
      // Broadcast via Socket.IO
      app.io.to(`match_${matchId}`).emit('move', { userId, move });
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/matches/:id/commit
   * Commit hash for RPS.  Requires authentication.
   */
  app.post('/:id/commit', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId as number;
    const matchId = Number((request.params as any).id);
    const { commitHash } = request.body as any;
    if (!commitHash) {
      reply.status(400).send({ error: 'Missing commitHash' });
      return;
    }
    const client = await app.getPgClient();
    try {
      await client.query('INSERT INTO rps_commits (match_id, user_id, commit_hash, created_at) VALUES ($1, $2, $3, now())', [matchId, userId, commitHash]);
      app.io.to(`match_${matchId}`).emit('commit', { userId });
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/matches/:id/reveal
   * Reveal move for RPS.  Requires authentication.  The backend should
   * determine the winner after both reveals, but this example only records
   * the reveal and broadcasts it.
   */
  app.post('/:id/reveal', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId as number;
    const matchId = Number((request.params as any).id);
    const { move, salt } = request.body as any;
    if (!move || !salt) {
      reply.status(400).send({ error: 'Missing move or salt' });
      return;
    }
    const client = await app.getPgClient();
    try {
      await client.query('UPDATE rps_commits SET revealed_move = $1, revealed_salt = $2 WHERE match_id = $3 AND user_id = $4', [move, salt, matchId, userId]);
      app.io.to(`match_${matchId}`).emit('reveal', { userId, move });
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });
};

export default matchesRoutes;