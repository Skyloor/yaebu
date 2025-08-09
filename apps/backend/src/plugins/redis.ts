/**
 * Плагин Fastify для подключения к Redis.  Создаёт клиента ioredis и
 * сохраняет его в `app.redis`.  Подключение закрывается при завершении
 * работы сервера.
 */
import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import fastify from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

/**
 * Fastify plugin that initializes a Redis client and decorates the Fastify
 * instance with it.  The connection string is read from the REDIS_URL
 * environment variable.
 */
export default fp(async (app: fastify.FastifyInstance) => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(url);

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
});