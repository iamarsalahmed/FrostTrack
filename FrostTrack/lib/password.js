import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 32;
const MAXMEM = 64 * 1024 * 1024;

/** One-way salted password hash. Never store the raw password. */
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) {
    throw new Error('Password must contain 12–1024 characters.');
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, {
    N: COST, r: BLOCK_SIZE, p: PARALLELISM, maxmem: MAXMEM
  });
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELISM}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || password.length > 1024 || typeof storedHash !== 'string') return false;
  const fields = storedHash.split('$');
  if (fields.length !== 6 || fields[0] !== 'scrypt') return false;
  const [_, N, r, p, saltHex, hashHex] = fields;
  if (N !== String(COST) || r !== String(BLOCK_SIZE) || p !== String(PARALLELISM)) return false;
  if (!/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{64}$/.test(hashHex)) return false;
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH, {
    N: COST, r: BLOCK_SIZE, p: PARALLELISM, maxmem: MAXMEM
  });
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
