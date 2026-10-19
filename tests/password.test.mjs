import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../lib/password.js';

test('scrypt hashes passwords with a unique salt', async ()=>{
  const a=await hashPassword('A strong demo password 234!');
  const b=await hashPassword('A strong demo password 234!');
  assert.notEqual(a,b);
  assert.ok(!a.includes('A strong demo password'));
  assert.equal(await verifyPassword('A strong demo password 234!',a),true);
  assert.equal(await verifyPassword('IncorrectPassword!',a),false);
});
test('rejects bad passwords and malformed hashes', async ()=>{
  await assert.rejects(hashPassword('short'));
  assert.equal(await verifyPassword('anything','plain-text-password'),false);
  assert.equal(await verifyPassword(null,'scrypt$32768$8$1$abc$def'),false);
});
