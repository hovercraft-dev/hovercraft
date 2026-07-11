/* Pure baggage split calculations — no DOM. Covered by test/baggage.test.js. */

export function averageBagWeight(totalBags, totalWeightKg) {
    return totalBags > 0 ? totalWeightKg / totalBags : 0;
}

/*
 * Split by FWD bag count. The FWD count is clamped to [0, totalBags];
 * AFT weight is the remainder of the total so the two holds always sum
 * to the loaded weight. Returns null when there is nothing to split.
 */
export function splitByCount(totalBags, totalWeightKg, fwdBags) {
    if (!Number.isFinite(totalBags) || totalBags <= 0) return null;
    const avgKg = averageBagWeight(totalBags, totalWeightKg);
    const fwd = Math.max(0, Math.min(Math.trunc(fwdBags) || 0, totalBags));
    const fwdWeightKg = fwd * avgKg;
    return {
        fwdBags: fwd,
        aftBags: totalBags - fwd,
        fwdWeightKg,
        aftWeightKg: totalWeightKg - fwdWeightKg,
        avgKg,
    };
}

/* Split by target FWD weight: converts the target to the nearest whole bag count. */
export function splitByWeight(totalBags, totalWeightKg, fwdTargetKg) {
    if (!Number.isFinite(totalBags) || totalBags <= 0) return null;
    const avgKg = averageBagWeight(totalBags, totalWeightKg);
    const fwdBags = avgKg > 0 ? Math.round(fwdTargetKg / avgKg) : 0;
    return splitByCount(totalBags, totalWeightKg, fwdBags);
}
