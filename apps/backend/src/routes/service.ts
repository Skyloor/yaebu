/**
 * Служебные эндпоинты.  Подпуть `/api`.  Сейчас реализован только `/health`,
 * который возвращает статус `ok` и может использоваться для мониторинга.
 */
import { FastifyPluginAsync } from 'fastify';

const serviceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    return { status: 'ok' };
  });
};

export default serviceRoutes;