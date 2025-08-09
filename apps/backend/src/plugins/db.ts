/**
 * Плагин Fastify для инициализации пула соединений с PostgreSQL.  Добавляет
 * свойства `pg` и `getPgClient()` в экземпляр Fastify, чтобы другие части
 * приложения могли выполнять SQL‑запросы.  Строка подключения берётся из
 * переменной окружения POSTGRES_URL.
 */
import fp from 'fastify-plugin';
import { Pool, PoolClient } from 'pg';
import fastify from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
    getPgClient: () => Promise<PoolClient>;
  }
}

/**
 * Fastify plugin that initializes a PostgreSQL connection pool and decorates
 * the Fastify instance with helpers for acquiring a client.  The connection
 * string is read from the POSTGRES_URL environment variable.
 */
export default fp(async (app: fastify.FastifyInstance) => {
  const connectionString = process.env.POSTGRES_URL || 'postgres://postgres:postgres@localhost:5432/miniapp';
  const pool = new Pool({ connectionString });

  // Decorate the instance with the pool and a helper to get a client
  app.decorate('pg', pool);
  app.decorate('getPgClient', async () => {
    const client = await pool.connect();
    return client;
  });

  // Clean up when the server closes
  app.addHook('onClose', async () => {
    await pool.end();
  });
});