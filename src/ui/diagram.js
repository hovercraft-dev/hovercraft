import { windComponents, driftAngleDeg, runwayNumber, reciprocalHeading } from '../lib/wind.js';

/* All geometry is authored in a fixed 520x520 design space; the canvas
   backing store is scaled to the element's CSS size * devicePixelRatio
   so the diagram stays sharp on any screen. */
const DESIGN = 520;

/* Approach animation: one pass down final, from beyond the compass
   ring to just past the threshold. */
const APPROACH_PERIOD_MS = 7000;
const APPROACH_START = 244;  /* distance from centre at the start of final */
const APPROACH_END = 152;    /* just past the threshold */
const APPROACH_STATIC = 216; /* parked position when not animating */

/* Colors come from CSS custom properties (instrument palette, same in
   both themes) so they stay tunable from styles.css. */
function palette(canvas) {
    const styles = getComputedStyle(canvas);
    const get = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
        ring: get('--dg-ring', '#3c5170'),
        tick: get('--dg-tick', '#2c3d54'),
        tickMajor: get('--dg-tick-major', '#64809e'),
        label: get('--dg-label', '#93a7bf'),
        numeral: get('--dg-numeral', '#64809e'),
        north: get('--dg-north', '#ff7070'),
        plane: get('--dg-plane', '#eef3f9'),
        wind: get('--dg-wind', '#ff6259'),
        cross: get('--dg-cross', '#ffa94d'),
        head: get('--dg-head', '#56d178'),
        approach: get('--dg-approach', 'rgba(238,243,249,0.22)'),
    };
}

/*
 * Create the diagram controller for a canvas.
 *  - update(state) redraws with new wind data
 *  - setActive(bool) starts/stops the approach animation (run it only
 *    while the wind panel is visible)
 * The animation also pauses when the document is hidden and respects
 * prefers-reduced-motion.
 */
export function initDiagram(canvas) {
    let state = { runwayHdg: 0, windDir: 0, speedKt: 0 };
    let active = false;
    let rafId = null;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;

    const animating = () => active && !document.hidden && !reduceMotion?.matches;

    function frame(now) {
        rafId = null;
        draw(canvas, state, (now % APPROACH_PERIOD_MS) / APPROACH_PERIOD_MS);
        if (animating()) rafId = requestAnimationFrame(frame);
    }

    function sync() {
        if (animating()) {
            if (rafId === null) rafId = requestAnimationFrame(frame);
        } else {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            draw(canvas, state, null);
        }
    }

    document.addEventListener('visibilitychange', sync);
    reduceMotion?.addEventListener?.('change', sync);

    return {
        update(next) {
            state = next;
            if (!animating()) draw(canvas, state, null);
        },
        setActive(on) {
            active = on;
            sync();
        },
    };
}

/* phase: [0,1) animation progress, or null for a static frame */
function draw(canvas, { runwayHdg, windDir, speedKt }, phase) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssSize = canvas.clientWidth;
    if (cssSize > 0) {
        const px = Math.round(cssSize * (window.devicePixelRatio || 1));
        if (canvas.width !== px) {
            canvas.width = px;
            canvas.height = px;
        }
    }
    const scale = canvas.width / DESIGN;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, DESIGN, DESIGN);

    const colors = palette(canvas);
    const cx = DESIGN / 2;
    const cy = DESIGN / 2;
    const R = DESIGN / 2 - 36;

    const rwyRad = (runwayHdg - 90) * (Math.PI / 180);
    const cosR = Math.cos(rwyRad);
    const sinR = Math.sin(rwyRad);

    drawCompass(ctx, cx, cy, R, colors);
    drawApproachTrack(ctx, cx, cy, R, cosR, sinR, colors);
    drawRunway(ctx, cx, cy, R, rwyRad, runwayHdg);

    if (speedKt > 0) {
        drawComponentVectors(ctx, cx, cy, R, { runwayHdg, windDir, speedKt, rwyRad, cosR, sinR }, colors);
        drawWindArrow(ctx, cx, cy, R, windDir, speedKt, colors);
    }

    drawApproachingAircraft(ctx, cx, cy, { runwayHdg, windDir, speedKt, rwyRad, cosR, sinR }, phase, colors);
}

/* Aircraft on final: tracks the extended centreline, nose crabbed into
   wind by the actual drift angle at approach speed. */
function drawApproachingAircraft(ctx, cx, cy, wind, phase, colors) {
    let dist;
    let alpha = 1;
    if (phase === null) {
        dist = APPROACH_STATIC;
    } else {
        dist = APPROACH_START + (APPROACH_END - APPROACH_START) * phase;
        /* fade in off the ring, fade out over the touchdown zone */
        alpha = Math.min(1, phase / 0.12) * Math.min(1, (1 - phase) / 0.1);
    }

    const crabRad = wind.speedKt > 0
        ? driftAngleDeg(wind.runwayHdg, wind.windDir, wind.speedKt) * (Math.PI / 180)
        : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx - dist * wind.cosR, cy - dist * wind.sinR);
    ctx.rotate(wind.rwyRad + crabRad);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    drawAirplane(ctx, 0.62, colors.plane);
    ctx.restore();
}

function drawCompass(ctx, cx, cy, R, colors) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = colors.ring;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let d = 0; d < 360; d += 10) {
        const a = (d - 90) * (Math.PI / 180);
        const major = d % 30 === 0;
        const cardinal = d % 90 === 0;
        const inner = cardinal ? R - 14 : major ? R - 10 : R - 6;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
        ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
        ctx.strokeStyle = cardinal ? colors.tickMajor : colors.tick;
        ctx.lineWidth = cardinal ? 2 : 1;
        ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* compass-rose numerals every 30 degrees (skipping the cardinals) */
    ctx.font = '600 13px -apple-system, sans-serif';
    ctx.fillStyle = colors.numeral;
    for (let d = 30; d < 360; d += 30) {
        if (d % 90 === 0) continue;
        const a = (d - 90) * (Math.PI / 180);
        ctx.fillText(String(d / 10), cx + (R - 27) * Math.cos(a), cy + (R - 27) * Math.sin(a));
    }

    ctx.font = 'bold 20px -apple-system, sans-serif';
    for (const { t, a } of [{ t: 'N', a: 0 }, { t: 'E', a: 90 }, { t: 'S', a: 180 }, { t: 'W', a: 270 }]) {
        const rad = (a - 90) * (Math.PI / 180);
        ctx.fillStyle = t === 'N' ? colors.north : colors.label;
        ctx.fillText(t, cx + (R + 20) * Math.cos(rad), cy + (R + 20) * Math.sin(rad));
    }
}

/* Dashed extended centreline on the approach side */
function drawApproachTrack(ctx, cx, cy, R, cosR, sinR, colors) {
    const from = R * 0.82; /* threshold */
    const to = R + 4;
    ctx.beginPath();
    ctx.moveTo(cx - from * cosR, cy - from * sinR);
    ctx.lineTo(cx - to * cosR, cy - to * sinR);
    ctx.strokeStyle = colors.approach;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawRunway(ctx, cx, cy, R, rwyRad, runwayHdg) {
    const rwyHalf = R * 0.82; /* half-length of the strip */
    const rwyW = 28;          /* half-width of the tarmac */

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rwyRad);

    const tarmac = ctx.createLinearGradient(-rwyHalf, 0, rwyHalf, 0);
    tarmac.addColorStop(0, '#39404d');
    tarmac.addColorStop(0.5, '#4b5464');
    tarmac.addColorStop(1, '#39404d');
    ctx.fillStyle = tarmac;
    roundRect(ctx, -rwyHalf, -rwyW, rwyHalf * 2, rwyW * 2, 6);
    ctx.fill();

    /* Edge lines */
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-rwyHalf + 6, -rwyW + 2);
    ctx.lineTo(rwyHalf - 6, -rwyW + 2);
    ctx.moveTo(-rwyHalf + 6, rwyW - 2);
    ctx.lineTo(rwyHalf - 6, rwyW - 2);
    ctx.stroke();

    /* Centre-line dashes */
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(-rwyHalf + 50, 0);
    ctx.lineTo(rwyHalf - 50, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    drawThreshold(ctx, rwyHalf - 12, rwyW);
    drawThreshold(ctx, -rwyHalf + 12, rwyW);

    /* Green threshold lights on the approach end */
    ctx.fillStyle = '#4ade80';
    for (let i = 0; i < 6; i++) {
        const y = -rwyW + 4 + i * ((rwyW * 2 - 8) / 5);
        ctx.beginPath();
        ctx.arc(-rwyHalf - 5, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /* Runway numbers: the designator is painted at the end the aircraft
       approaches from, so it reads along the direction of the heading. */
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.translate(-rwyHalf + 38, 0);
    ctx.fillText(runwayNumber(runwayHdg), 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(rwyHalf - 38, 0);
    ctx.rotate(Math.PI);
    ctx.fillText(runwayNumber(reciprocalHeading(runwayHdg)), 0, 0);
    ctx.restore();

    ctx.restore();
}

function drawWindArrow(ctx, cx, cy, R, windDir, speedKt, colors) {
    const windRad = (windDir - 90) * (Math.PI / 180);
    const wCos = Math.cos(windRad);
    const wSin = Math.sin(windRad);

    /* Arrow starts at the compass edge and points inward: wind blows FROM there */
    const arrowStart = R - 2;
    const arrowLen = Math.min(R * 0.55, 28 + speedKt * 1.8);
    const sx = cx + arrowStart * wCos;
    const sy = cy + arrowStart * wSin;
    const ex = sx - arrowLen * wCos;
    const ey = sy - arrowLen * wSin;

    ctx.save();
    ctx.shadowColor = colors.wind;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = colors.wind;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    const headLen = 16;
    const headW = 8;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + headLen * wCos + headW * wSin, ey + headLen * wSin - headW * wCos);
    ctx.lineTo(ex + headLen * wCos - headW * wSin, ey + headLen * wSin + headW * wCos);
    ctx.closePath();
    ctx.fillStyle = colors.wind;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = colors.wind;
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lblDist = arrowStart + 18;
    ctx.fillText(String(Math.round(speedKt)), cx + lblDist * wCos, cy + lblDist * wSin);
}

function drawComponentVectors(ctx, cx, cy, R, wind, colors) {
    const comp = windComponents(wind.runwayHdg, wind.windDir, wind.speedKt);
    const maxVec = R * 0.45;
    const xLen = Math.min(maxVec, comp.crosswindKt * 2);
    const hLen = Math.min(maxVec, Math.abs(comp.headwindKt) * 2);

    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (xLen > 4) {
        const xSign = comp.side === 'right' ? 1 : -1;
        const perpAngle = wind.rwyRad + (Math.PI / 2) * xSign;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + xLen * Math.cos(perpAngle), cy + xLen * Math.sin(perpAngle));
        ctx.strokeStyle = colors.cross;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = colors.cross;
        ctx.fillText(`${Math.round(comp.crosswindKt)} X`,
            cx + (xLen + 20) * Math.cos(perpAngle),
            cy + (xLen + 20) * Math.sin(perpAngle));
    }

    if (hLen > 4) {
        const hSign = comp.headwindKt >= 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + hLen * wind.cosR * hSign, cy + hLen * wind.sinR * hSign);
        ctx.strokeStyle = colors.head;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = colors.head;
        const label = `${Math.round(Math.abs(comp.headwindKt))} ${comp.headwindKt >= 0 ? 'H' : 'T'}`;
        ctx.fillText(label,
            cx + (hLen + 22) * wind.cosR * hSign,
            cy + (hLen + 22) * wind.sinR * hSign);
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawThreshold(ctx, xPos, rwyW) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const stripes = 4;
    const gap = (rwyW * 2 - 8) / (stripes * 2 - 1);
    for (let i = 0; i < stripes; i++) {
        const sy = -rwyW + 4 + i * gap * 2;
        ctx.fillRect(xPos - 10, sy, 20, gap);
    }
}

/* Top-down airplane silhouette at the origin, nose pointing +x.
   Scale 1.0 is roughly a 56px-long aircraft. */
function drawAirplane(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(28 * s, 0);           /* nose */
    ctx.lineTo(10 * s, 3 * s);
    ctx.lineTo(6 * s, 3 * s);        /* right wing */
    ctx.lineTo(-2 * s, 28 * s);
    ctx.lineTo(-8 * s, 28 * s);
    ctx.lineTo(-4 * s, 3.5 * s);
    ctx.lineTo(-18 * s, 4 * s);      /* right fuselage aft */
    ctx.lineTo(-22 * s, 14 * s);     /* right tailplane */
    ctx.lineTo(-26 * s, 14 * s);
    ctx.lineTo(-24 * s, 4 * s);
    ctx.lineTo(-28 * s, 4 * s);      /* tail */
    ctx.lineTo(-28 * s, -4 * s);
    ctx.lineTo(-24 * s, -4 * s);     /* left tailplane */
    ctx.lineTo(-26 * s, -14 * s);
    ctx.lineTo(-22 * s, -14 * s);
    ctx.lineTo(-18 * s, -4 * s);
    ctx.lineTo(-4 * s, -3.5 * s);    /* left fuselage aft */
    ctx.lineTo(-8 * s, -28 * s);     /* left wing */
    ctx.lineTo(-2 * s, -28 * s);
    ctx.lineTo(6 * s, -3 * s);
    ctx.lineTo(10 * s, -3 * s);
    ctx.closePath();
    ctx.fill();
}
