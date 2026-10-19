import { neon } from '@neondatabase/serverless';

let query;
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing. Connect Neon PostgreSQL and run sql/schema.sql.');
  if (!query) query = neon(url);
  return query;
}
