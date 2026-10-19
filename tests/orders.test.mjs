import test from 'node:test';
import assert from 'node:assert/strict';
import { canCancelOrder, normalizeCancellationReason } from '../lib/order-status.js';

test('only placed orders can be cancelled',()=>{
  assert.equal(canCancelOrder('placed'),true);
  assert.equal(canCancelOrder('received'),false);
  assert.equal(canCancelOrder('cancelled'),false);
  assert.equal(canCancelOrder('unknown'),false);
});

test('cancellation reason accepts optional and trimmed strings',()=>{
  assert.equal(normalizeCancellationReason(undefined),null);
  assert.equal(normalizeCancellationReason('   '),null);
  assert.equal(normalizeCancellationReason('  Duplicate order  '),'Duplicate order');
  assert.equal(normalizeCancellationReason('a'.repeat(240)).length,240);
  assert.throws(()=>normalizeCancellationReason('a'.repeat(241)),/240/);
  assert.throws(()=>normalizeCancellationReason({reason:'bad'}),/text/);
});
