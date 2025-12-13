/**
 * Neon Postgres database helper
 * Provides connection and query utilities
 */

import { neon } from '@neondatabase/serverless';

let sql = null;

/**
 * Initialize database connection
 */
function getDb() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(connectionString);
  }
  return sql;
}

/**
 * Execute a query and return results
 */
export async function query(text, params = []) {
  const db = getDb();
  return await db(text, params);
}

/**
 * Execute a query and return first row
 */
export async function queryOne(text, params = []) {
  const results = await query(text, params);
  return results[0] || null;
}

/**
 * Execute a query and return all rows
 */
export async function queryAll(text, params = []) {
  return await query(text, params);
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const db = getDb();
  // Neon serverless doesn't support explicit transactions in the same way
  // For now, we'll execute queries sequentially
  // In production, consider using Neon's transaction support when available
  return await callback(db);
}

