import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageBagWeight, splitByCount, splitByWeight } from '../src/lib/baggage.js';

test('averageBagWeight divides weight over bags', () => {
    assert.equal(averageBagWeight(10, 200), 20);
    assert.equal(averageBagWeight(0, 200), 0);
});

test('splitByCount splits bags and weight', () => {
    const s = splitByCount(10, 200, 5);
    assert.deepEqual(s, { fwdBags: 5, aftBags: 5, fwdWeightKg: 100, aftWeightKg: 100, avgKg: 20 });
});

test('splitByCount clamps the FWD count into range', () => {
    assert.equal(splitByCount(10, 200, 15).fwdBags, 10);
    assert.equal(splitByCount(10, 200, -3).fwdBags, 0);
});

test('splitByCount returns null when there is nothing to split', () => {
    assert.equal(splitByCount(0, 100, 5), null);
    assert.equal(splitByCount(NaN, 100, 5), null);
});

test('hold weights always sum to the total', () => {
    /* 7 bags of 143 kg: avg is not a round number */
    const s = splitByCount(7, 143, 3);
    assert.ok(Math.abs(s.fwdWeightKg + s.aftWeightKg - 143) < 1e-9);
});

test('splitByWeight converts a target weight to the nearest bag count', () => {
    /* 10 bags, 200 kg -> 20 kg/bag; 120 kg target -> 6 bags */
    const s = splitByWeight(10, 200, 120);
    assert.equal(s.fwdBags, 6);
    assert.equal(s.fwdWeightKg, 120);
});

test('splitByWeight rounds to the closest whole bag', () => {
    /* 20 kg/bag, 128 kg target -> 6.4 bags -> 6 bags */
    assert.equal(splitByWeight(10, 200, 128).fwdBags, 6);
    /* 132 kg target -> 6.6 bags -> 7 bags */
    assert.equal(splitByWeight(10, 200, 132).fwdBags, 7);
});

test('splitByWeight clamps a target above the total', () => {
    const s = splitByWeight(10, 200, 500);
    assert.equal(s.fwdBags, 10);
    assert.equal(s.aftBags, 0);
});

test('splitByWeight with zero total weight sends nothing forward', () => {
    const s = splitByWeight(10, 0, 50);
    assert.equal(s.fwdBags, 0);
    assert.equal(s.aftBags, 10);
});
