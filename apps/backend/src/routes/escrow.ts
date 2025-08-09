/**
 * Эндпоинты для взаимодействия с эскроу‑контрактом.  Подпуть `/api/escrow`.
 *
 * POST `/:match/create-intent` – сформировать параметры для sendTransaction
 *     TonConnect.  Возвращает адрес контракта, сумму и payload.
 * POST `/:match/resolve` – отметить матч как завершённый и выплаченный.
 * POST `/:match/refund` – отметить матч как возвращённый (рефанд).
 */
import { FastifyPluginAsync } from 'fastify';

const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || 'EQ...';

const escrowRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/escrow/:match/create-intent
   * Create a transfer intent for a match.  Returns the parameters that the
   * frontend should feed into TonConnect’s sendTransaction call.  The stake
   * amount is read from the rooms table and multiplied by two (both players).
   */
  app.post('/:match/create-intent', { preValidation: [app.authenticate] }, async (request, reply) => {
    const matchId = Number((request.params as any).match);
    const client = await app.getPgClient();
    try {
      // Get stake from the match’s room
      const res = await client.query(
        'SELECT r.stake_ton FROM matches m JOIN rooms r ON m.room_id = r.id WHERE m.id = $1',
        [matchId]
      );
      if (res.rowCount === 0) {
        reply.status(404).send({ error: 'Match not found' });
        return;
      }
      const stakeTon = Number(res.rows[0].stake_ton);
      // Insert escrow record
      await client.query(
        'INSERT INTO escrow (match_id, admin_fee_bps, pot_ton, state, created_at) VALUES ($1, $2, $3, $4, now()) ON CONFLICT (match_id) DO NOTHING',
        [matchId, 100, stakeTon * 2, 'initialized']
      );
      // Build TonConnect transaction details.  Note: value is expressed in nanoTON.
      const nanoTon = (stakeTon * 1e9).toString();
      reply.send({ to: ESCROW_CONTRACT_ADDRESS, value: nanoTon, payload: '' });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/escrow/:match/resolve
   * Mark an escrow as resolved and process payout.  In a full implementation
   * this would trigger an on‑chain call.  Here we simply update the record.
   */
  app.post('/:match/resolve', { preValidation: [app.authenticate] }, async (request, reply) => {
    const matchId = Number((request.params as any).match);
    const { winnerUserId } = request.body as any;
    if (!winnerUserId) {
      reply.status(400).send({ error: 'Missing winnerUserId' });
      return;
    }
    const client = await app.getPgClient();
    try {
      await client.query('UPDATE escrow SET state = $1, tx_hash_payout = $2 WHERE match_id = $3', ['resolved', 'tx_placeholder', matchId]);
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });

  /**
   * POST /api/escrow/:match/refund
   * Refund the pot to both players.  This just updates the escrow state.
   */
  app.post('/:match/refund', { preValidation: [app.authenticate] }, async (request, reply) => {
    const matchId = Number((request.params as any).match);
    const client = await app.getPgClient();
    try {
      await client.query('UPDATE escrow SET state = $1, tx_hash_refund = $2 WHERE match_id = $3', ['refunded', 'tx_placeholder', matchId]);
      reply.send({ success: true });
    } finally {
      client.release();
    }
  });
};

export default escrowRoutes;