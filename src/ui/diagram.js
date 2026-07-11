import { windComponents, runwayNumber, reciprocalHeading } from '../lib/wind.js';

/* All geometry is authored in a fixed 520x520 design space; the canvas
   backing store is scaled to the element's CSS size * devicePixelRatio
   so the diagram stays sharp on any screen. */
const DESIGN = 520;

/* Colors come from CSS custom properties so the diagram follows the theme. */
function palette(canvas) {
    const styles = getComputedStyle(canvas);
    const get = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
        ring: get('--dg-ring', '#cdd3dc'),
        tick: get('--dg-tick', '#c0c8d0'),
        tickMajor: get('--dg-tick-major', '#8899aa'),
        label: get('--dg-label', '#8899aa'),
        north: get('--dg-north', '#c0392b'),
        plane: get('--dg-plane', '#1a2d4a'),
        wind: get('--dg-wind', '#e74c3c'),
        cross: get('--dg-cross', '#e67e22'),
        head: get('--dg-head', '#27ae60'),
    };
}

export function drawWindDiagram(canvas, { runwayHdg, windDir, speedKt }) {
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
    drawRunway(ctx, cx, cy, R, rwyRad, runwayHdg);

    /* Airplane on short final: beyond the approach threshold, nose toward the runway */
    const planeDist = R * 0.82 + 30;
    ctx.save();
    ctx.translate(cx - planeDist * cosR, cy - planeDist * sinR);
    ctx.rotate(rwyRad);
    drawAirplane(ctx, 0.55, colors.plane);
    ctx.restore();

    if (speedKt > 0) {
        drawWindArrow(ctx, cx, cy, R, windDir, speedKt, colors);
        drawComponentVectors(ctx, cx, cy, R, { runwayHdg, windDir, speedKt, rwyRad, cosR, sinR }, colors);
    }
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

    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const { t, a } of [{ t: 'N', a: 0 }, { t: 'E', a: 90 }, { t: 'S', a: 180 }, { t: 'W', a: 270 }]) {
        const rad = (a - 90) * (Math.PI / 180);
        ctx.fillStyle = t === 'N' ? colors.north : colors.label;
        ctx.fillText(t, cx + (R + 20) * Math.cos(rad), cy + (R + 20) * Math.sin(rad));
    }
}

function drawRunway(ctx, cx, cy, R, rwyRad, runwayHdg) {
    const rwyHalf = R * 0.82; /* half-length of the strip */
    const rwyW = 28;          /* half-width of the tarmac */

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rwyRad);

    const tarmac = ctx.createLinearGradient(-rwyHalf, 0, rwyHalf, 0);
    tarmac.addColorStop(0, '#3a3f4a');
    tarmac.addColorStop(0.5, '#4a5060');
    tarmac.addColorStop(1, '#3a3f4a');
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
