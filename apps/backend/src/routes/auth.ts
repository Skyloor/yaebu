/**
 * Маршруты аутентификации.  Подпуть `/api/auth`.  Основной эндпоинт
 * `/validate-init` принимает строку `initData`, пришедшую из Telegram
 * Mini‑App, валидирует её (подпись, срок действия) и возвращает
 * информацию о пользователе вместе с JWT.  Если пользователь впервые,
 * запись создаётся в базе.
 */
import { FastifyPluginAsync } from 'fastify';
import { validateInitData } from '../utils/validateInitData';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { initData: string } }>('/validate-init', async (request, reply) => {
    const rawInitData = request.body?.initData;
    if (!rawInitData) {
      reply.status(400).send({ error: 'Missing initData' });
      return;
    }
    try {
      const unsafe = validateInitData(rawInitData, process.env.BOT_TOKEN || '');
      const tgUser = unsafe.user;
      if (!tgUser) {
        reply.status(400).send({ error: 'Missing user in initData' });
        return;
      }
      // Determine language – default to ru if code starts with 'ru'
      const lang = tgUser.language_code?.startsWith('ru') ? 'ru' : 'en';
      // Upsert user in DB
      const client = await app.getPgClient();
      let userId: number;
      try {
        const sel = await client.query('SELECT id, lang FROM users WHERE tg_id = $1', [tgUser.id]);
        if (sel.rowCount > 0) {
          userId = sel.rows[0].id;
        } else {
          const ins = await client.query(
            'INSERT INTO users (tg_id, username, lang, created_at) VALUES ($1, $2, $3, now()) RETURNING id',
            [tgUser.id, tgUser.username || null, lang]
          );
          userId = ins.rows[0].id;
        }
      } finally {
        client.release();
      }
      // Sign JWT
      const token = app.jwt.sign({ userId });
      reply.send({ userId, lang, tgUser, jwt: token });
    } catch (err: any) {
      reply.status(401).send({ error: err.message });
    }
  });
};

export default authRoutes;