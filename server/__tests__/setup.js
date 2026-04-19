/**
 * Jest global setup — wires environment variables before modules load.
 * Tests prefer a dedicated TEST_DATABASE_URL; falls back to DATABASE_URL.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-prod';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
