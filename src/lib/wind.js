/* Pure wind/limit calculations — no DOM. Covered by test/wind.test.js. */

/* ATR 72-600 operational limits (kt) */
export const TAILWIND_LIMIT_KT = 10;
export const HEADWIND_LIMIT_KT = 55;

/* RCAM runway condition codes and the crosswind limit for each */
export const RUNWAY_CONDITIONS = [
    { code: 6, label: 'Dry', crosswindLimitKt: 35 },
    { code: 5, label: 'Wet / Good', crosswindLimitKt: 28 },
    { code: 4, label: 'Good to Medium', crosswindLimitKt: 22 },
    { code: 3, label: 'Medium', crosswindLimitKt: 16 },
    { code: 2, label: 'Medium to Poor', crosswindLimitKt: 16 },
    { code: 1, label: 'Poor', crosswindLimitKt: 10 },
];

export function crosswindLimitForCode(code) {
    const cond = RUNWAY_CONDITIONS.find(c => c.code === code);
    return cond ? cond.crosswindLimitKt : null;
}

/* Signed shortest angle from `fromDeg` to `toDeg`, in (-180, 180] */
export function angleDifference(fromDeg, toDeg) {
    let diff = (((toDeg - fromDeg) % 360) + 360) % 360;
    if (diff > 180) diff -= 360;
    return diff;
}

/*
 * Decompose wind into runway-relative components.
 * Returns crosswind (always >= 0), headwind (negative = tailwind),
 * and the side the wind blows from ('left' | 'right' | null when aligned).
 */
export function windComponents(runwayHdg, windDir, speedKt) {
    const diff = angleDifference(runwayHdg, windDir);
    const rad = diff * (Math.PI / 180);
    const cross = speedKt * Math.sin(rad);
    return {
        crosswindKt: Math.abs(cross),
        headwindKt: speedKt * Math.cos(rad),
        side: cross > 0 ? 'right' : cross < 0 ? 'left' : null,
    };
}

/*
 * Check components against limits. Violation priority matches the
 * original tool: crosswind, then tailwind, then headwind.
 * Returns { withinLimits, violation: 'crosswind'|'tailwind'|'headwind'|null }
 */
export function checkLimits(components, crosswindLimitKt) {
    const { crosswindKt, headwindKt } = components;
    if (crosswindKt > crosswindLimitKt) {
        return { withinLimits: false, violation: 'crosswind' };
    }
    if (headwindKt < -TAILWIND_LIMIT_KT) {
        return { withinLimits: false, violation: 'tailwind' };
    }
    if (headwindKt > HEADWIND_LIMIT_KT) {
        return { withinLimits: false, violation: 'headwind' };
    }
    return { withinLimits: true, violation: null };
}

/*
 * Full assessment for one wind report. Gust components are computed
 * when gust exceeds the sustained speed, and the limit check always
 * uses the worst case (gust when present).
 */
export function assessWind({ runwayHdg, windDir, speedKt, gustKt = 0, crosswindLimitKt }) {
    const sustained = windComponents(runwayHdg, windDir, speedKt);
    const gust = gustKt > speedKt ? windComponents(runwayHdg, windDir, gustKt) : null;
    return {
        sustained,
        gust,
        ...checkLimits(gust ?? sustained, crosswindLimitKt),
        crosswindLimitKt,
    };
}

/* Runway designator from a magnetic heading: 261 -> "26", 83 -> "08", 356 -> "36" */
export function runwayNumber(hdg) {
    const n = Math.round((((hdg % 360) + 360) % 360) / 10) % 36;
    return n === 0 ? '36' : String(n).padStart(2, '0');
}

export function reciprocalHeading(hdg) {
    return (hdg + 180) % 360;
}
