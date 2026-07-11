import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    angleDifference,
    windComponents,
    checkLimits,
    assessWind,
    runwayNumber,
    reciprocalHeading,
    crosswindLimitForCode,
    TAILWIND_LIMIT_KT,
    HEADWIND_LIMIT_KT,
} from '../src/lib/wind.js';

test('angleDifference takes the shortest path across north', () => {
    assert.equal(angleDifference(10, 350), -20);
    assert.equal(angleDifference(350, 10), 20);
    assert.equal(angleDifference(90, 270), 180);
    assert.equal(angleDifference(261, 261), 0);
});

test('wind straight down the runway is pure headwind', () => {
    const w = windComponents(260, 260, 20);
    assert.equal(Math.round(w.crosswindKt), 0);
    assert.equal(Math.round(w.headwindKt), 20);
    assert.equal(w.side, null);
});

test('wind at 90 degrees is pure crosswind', () => {
    const w = windComponents(260, 350, 20);
    assert.equal(Math.round(w.crosswindKt), 20);
    assert.equal(Math.round(w.headwindKt), 0);
    assert.equal(w.side, 'right');
});

test('wind from behind is a tailwind (negative headwind)', () => {
    const w = windComponents(90, 270, 10);
    assert.equal(Math.round(w.headwindKt), -10);
});

test('components handle the 360/0 wrap-around', () => {
    const w = windComponents(10, 350, 10);
    assert.equal(w.side, 'left');
    assert.equal(Math.round(w.crosswindKt), 3);
    assert.equal(Math.round(w.headwindKt), 9);
});

test('checkLimits passes winds inside all limits', () => {
    const result = checkLimits({ crosswindKt: 20, headwindKt: 30 }, 35);
    assert.equal(result.withinLimits, true);
    assert.equal(result.violation, null);
});

test('checkLimits flags crosswind above the RCAM limit', () => {
    const result = checkLimits({ crosswindKt: 12, headwindKt: 5 }, 10);
    assert.deepEqual(result, { withinLimits: false, violation: 'crosswind' });
});

test('checkLimits flags tailwind beyond the limit', () => {
    const result = checkLimits({ crosswindKt: 0, headwindKt: -(TAILWIND_LIMIT_KT + 1) }, 35);
    assert.deepEqual(result, { withinLimits: false, violation: 'tailwind' });
});

test('checkLimits flags headwind beyond the limit', () => {
    const result = checkLimits({ crosswindKt: 0, headwindKt: HEADWIND_LIMIT_KT + 1 }, 35);
    assert.deepEqual(result, { withinLimits: false, violation: 'headwind' });
});

test('checkLimits allows winds exactly at the limits', () => {
    assert.equal(checkLimits({ crosswindKt: 35, headwindKt: 0 }, 35).withinLimits, true);
    assert.equal(checkLimits({ crosswindKt: 0, headwindKt: -TAILWIND_LIMIT_KT }, 35).withinLimits, true);
    assert.equal(checkLimits({ crosswindKt: 0, headwindKt: HEADWIND_LIMIT_KT }, 35).withinLimits, true);
});

test('assessWind checks limits against the gust when it exceeds sustained', () => {
    /* 90-degree crosswind on RWY 26: 20 kt sustained, gusting 30 kt, dry limit 35 */
    const within = assessWind({ runwayHdg: 260, windDir: 350, speedKt: 20, gustKt: 30, crosswindLimitKt: 35 });
    assert.equal(within.withinLimits, true);
    assert.equal(Math.round(within.gust.crosswindKt), 30);

    /* Same wind against a wet limit of 28: sustained is fine, gust is not */
    const gustBust = assessWind({ runwayHdg: 260, windDir: 350, speedKt: 20, gustKt: 30, crosswindLimitKt: 28 });
    assert.deepEqual(
        { withinLimits: gustBust.withinLimits, violation: gustBust.violation },
        { withinLimits: false, violation: 'crosswind' },
    );
});

test('assessWind ignores a gust at or below the sustained speed', () => {
    const result = assessWind({ runwayHdg: 260, windDir: 350, speedKt: 20, gustKt: 15, crosswindLimitKt: 35 });
    assert.equal(result.gust, null);
});

test('runwayNumber maps headings to designators', () => {
    assert.equal(runwayNumber(261), '26');
    assert.equal(runwayNumber(83), '08');
    assert.equal(runwayNumber(356), '36');
    assert.equal(runwayNumber(4), '36');
    assert.equal(runwayNumber(175), '18');
});

test('reciprocalHeading flips 180 degrees', () => {
    assert.equal(reciprocalHeading(261), 81);
    assert.equal(reciprocalHeading(83), 263);
});

test('crosswindLimitForCode matches the RCAM table', () => {
    assert.equal(crosswindLimitForCode(6), 35);
    assert.equal(crosswindLimitForCode(5), 28);
    assert.equal(crosswindLimitForCode(4), 22);
    assert.equal(crosswindLimitForCode(3), 16);
    assert.equal(crosswindLimitForCode(2), 16);
    assert.equal(crosswindLimitForCode(1), 10);
    assert.equal(crosswindLimitForCode(0), null);
});
