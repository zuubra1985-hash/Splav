import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import fs from 'fs';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

function resolveSqlHost(): string | undefined {
  const host = process.env.SQL_HOST;
  if (!host) return undefined;
  if (host.startsWith('/')) {
    if (fs.existsSync(host)) return host;
    if (host.startsWith('/cloudsql/') && fs.existsSync(`/app${host}`)) {
      return `/app${host}`;
    }
    if (host.startsWith('/app/cloudsql/') && fs.existsSync(host.replace('/app', ''))) {
      return host.replace('/app', '');
    }
  }
  return host;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const host = resolveSqlHost();
    global._postgresPool = new Pool({
      host,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err.message);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

