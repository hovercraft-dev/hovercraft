/**
 * Simple test suite for ATR 72-600 Flight Tools core logic.
 *
 * To run these tests, ensure you have Node.js installed and execute:
 * node test_logic.js
 */

function windComponents(rwy, dir, spd) {
    let diff = Math.abs(dir - rwy);
    if (diff > 180) diff = 360 - diff;
    const rad = diff * (Math.PI / 180);

    let rawDiff = dir - rwy;
    if (rawDiff > 180) rawDiff -= 360;
    if (rawDiff < -180) rawDiff += 360;
    const radSigned = rawDiff * (Math.PI / 180);
    const hWind = spd * Math.cos(radSigned);

    return {
        xWind: Math.abs(spd * Math.sin(rad)),
        hWind: hWind
    };
}

function calcBagsMath(totalBags, totalWeight, fwdBagTarget, fwdWeightTarget, source) {
    if (totalBags <= 0) return null;
    const avg = totalWeight / totalBags;
    let fwdBags = 0;
    if (source === 'bags') {
        fwdBags = fwdBagTarget || 0;
    } else {
        fwdBags = avg > 0 ? Math.round(fwdWeightTarget / avg) : 0;
    }
    fwdBags = Math.max(0, Math.min(fwdBags, totalBags));
    const aftBags = totalBags - fwdBags;
    return { fwdBags, aftBags, fwdWeight: fwdBags * avg, aftWeight: aftBags * avg };
}

function assert(condition, message) {
    if (!condition) {
        console.error('FAILED:', message);
        process.exit(1);
    }
    console.log('PASSED:', message);
}

// Test windComponents
console.log('Testing windComponents...');
const w1 = windComponents(260, 260, 20);
assert(Math.round(w1.xWind) === 0, 'Headwind 260/261 should have 0 crosswind');
assert(Math.round(w1.hWind) === 20, 'Headwind 260/261 should have 20 headwind');

const w2 = windComponents(260, 350, 20); // 90 deg crosswind
assert(Math.round(w2.xWind) === 20, 'Direct crosswind should match speed');
assert(Math.round(w2.hWind) === 0, 'Direct crosswind should have 0 headwind');

const w3 = windComponents(90, 270, 10); // Tailwind
assert(Math.round(w3.hWind) === -10, 'Wind from 270 on RWY 09 should be -10 headwind (tailwind)');

// Test calcBagsMath
console.log('\nTesting calcBagsMath...');
const b1 = calcBagsMath(10, 200, 5, 0, 'bags');
assert(b1.fwdBags === 5 && b1.aftBags === 5, 'Split 10 bags equally');
assert(b1.fwdWeight === 100 && b1.aftWeight === 100, 'Split 200kg equally');

const b2 = calcBagsMath(10, 200, 0, 120, 'weight');
assert(b2.fwdBags === 6, 'Target 120kg should result in 6 bags (20kg/bag)');

const b3 = calcBagsMath(0, 100, 0, 0, 'bags');
assert(b3 === null, 'Zero bags should return null');

console.log('\nAll logic tests passed!');
