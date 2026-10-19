import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPARTMENTS,finiteNumber,reorderQty,HIGH_TEMP_C} from '../lib/config.js';
test('only four configured compartments',()=>assert.deepEqual(COMPARTMENTS,['chicken','beef','mutton','mince']));
test('reorder exactly fills to full capacity',()=>{assert.equal(reorderQty(25,3),22);assert.equal(reorderQty(25,25),0);assert.equal(reorderQty(20,50),0);assert.equal(reorderQty(25,3.333),21.67)});
test('rejects invalid measurements',()=>{assert.equal(finiteNumber(-1,0,100),null);assert.equal(finiteNumber('5',0,100),null);assert.equal(finiteNumber(NaN,0,100),null);assert.equal(finiteNumber(12.5,0,100),12.5);assert.equal(HIGH_TEMP_C,4)});

