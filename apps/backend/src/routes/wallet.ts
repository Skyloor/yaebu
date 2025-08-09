/**
 * Эндпоинты кошелька.  Подпуть `/api/wallet`.  Пока реализован только
 * эндпоинт `/session`, который возвращает статус подключения TON‑кошелька
 * для авторизованного пользователя.  В будущем здесь можно реализовать
 * привязку/отвязку TonConnect.
 */
import { FastifyPluginAsync } from 'fastify';

const walletRoutes: FastifyPluginAsync = async (app) => {
  // Returns current wallet session status for the authenticated user
  app.post('/session', { preValidation: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).userId;
    const client = await app.getPgClient();
    try {
      const res = await client.query('SELECT ton_address, is_connected FROM wallets WHERE user_id = $1', [userId]);
      if (res.rowCount > 0) {
        const row = res.rows[0];
        reply.send({ isConnected: row.is_connected, address: row.ton_address });
      } else {
        reply.send({ isConnected: false });
      }
    } finally {
      client.release();
    }
  });
};

export default walletRoutes;