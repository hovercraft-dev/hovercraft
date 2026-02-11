/* ══════════════════════════════════════════════
   THEME MANAGEMENT
   ══════════════════════════════════════════════ */
function initTheme() {
    const savedTheme = localStorage.getItem('atr72_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').innerText = '☀️';
        document.querySelector('meta[name="theme-color"]').setAttribute('content', '#000000');
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('themeToggle');
    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (isDark) {
        btn.innerText = '☀️';
        localStorage.setItem('atr72_theme', 'dark');
        themeColor.setAttribute('content', '#000000');
    } else {
        btn.innerText = '🌙';
        localStorage.setItem('atr72_theme', 'light');
        themeColor.setAttribute('content', '#0a1628');
    }
}

/* ══════════════════════════════════════════════
   TAB SWITCHING
   ══════════════════════════════════════════════ */
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (tab === 'bags' ? i === 0 : i === 1));
    });
    document.getElementById('panelBags').classList.toggle('active', tab === 'bags');
    document.getElementById('panelWind').classList.toggle('active', tab === 'wind');
    if (tab === 'wind') drawWind();
}

/* ══════════════════════════════════════════════
   BAGGAGE SPLITTER
   ══════════════════════════════════════════════ */
function calcBags(source) {
    const totalBagsInput = document.getElementById('totalBags').value;
    const totalWeightInput = document.getElementById('totalWeight').value;
    const totalBags = parseInt(totalBagsInput) || 0;
    const totalWeight = parseFloat(totalWeightInput) || 0;

    if (totalBags <= 0 || isNaN(totalBags)) {
        resetBagResults();
        return;
    }

    const avg = totalBags > 0 ? (totalWeight / totalBags) : 0;
    document.getElementById('avgWeightDisp').innerText = 'Avg: ' + avg.toFixed(1) + ' kg/bag';

    let fwdBags = 0;
    if (source === 'bags') {
        document.getElementById('fwdWeightTarget').value = '';
        fwdBags = parseInt(document.getElementById('fwdBagTarget').value) || 0;
    } else {
        document.getElementById('fwdBagTarget').value = '';
        const wt = parseFloat(document.getElementById('fwdWeightTarget').value) || 0;
        fwdBags = avg > 0 ? Math.round(wt / avg) : 0;
    }

    fwdBags = Math.max(0, Math.min(fwdBags, totalBags));
    const aftBags = Math.max(0, totalBags - fwdBags);
    const fwdWeight = fwdBags * avg;
    const aftWeight = totalWeight - fwdWeight;

    document.getElementById('fwdBagsRes').innerText = fwdBags + ' Bags';
    document.getElementById('aftBagsRes').innerText = aftBags + ' Bags';
    document.getElementById('fwdWeightRes').innerText = Math.round(fwdWeight) + ' kg';
    document.getElementById('aftWeightRes').innerText = Math.round(aftWeight) + ' kg';
}

function resetBagResults() {
    document.getElementById('fwdBagsRes').innerHTML = '&ndash;';
    document.getElementById('aftBagsRes').innerHTML = '&ndash;';
    document.getElementById('fwdWeightRes').innerText = '0 kg';
    document.getElementById('aftWeightRes').innerText = '0 kg';
    document.getElementById('avgWeightDisp').innerText = '';
}

function clearBags() {
    ['totalBags','totalWeight','fwdBagTarget','fwdWeightTarget'].forEach(id => document.getElementById(id).value = '');
    resetBagResults();
}

/* ══════════════════════════════════════════════
   RUNWAY QUICK-SELECT
   ══════════════════════════════════════════════ */
const DEFAULT_RWYS = [
    { name: 'EGNS 26', hdg: 261 },
    { name: 'EGNS 08', hdg: 83 }
];

function loadRunways() {
    try {
        const saved = localStorage.getItem('atr72_runways');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return DEFAULT_RWYS.slice();
}
function saveRunways(rwys) {
    try { localStorage.setItem('atr72_runways', JSON.stringify(rwys)); } catch(e) {}
}

let runways = loadRunways();
let editorOpen = false;
let activeRwy = -1;

function renderRwyBar() {
    const bar = document.getElementById('rwyBar');
    let html = '';
    runways.forEach((r, i) => {
        html += '<button class="rwy-btn' + (activeRwy === i ? ' active' : '') + '" onclick="selectRwy(' + i + ')">'
              + r.name + ' (' + r.hdg + '&deg;)</button>';
    });
    html += '<button class="rwy-btn edit-btn' + (editorOpen ? ' active' : '') + '" onclick="toggleRwyEditor()">'
          + (editorOpen ? 'Done' : 'Edit') + '</button>';
    bar.innerHTML = html;
}

function selectRwy(i) {
    activeRwy = (activeRwy === i) ? -1 : i;
    if (activeRwy >= 0) {
        document.getElementById('rwyHdg').value = runways[i].hdg;
        calcWind();
    }
    renderRwyBar();
}

function toggleRwyEditor() {
    editorOpen = !editorOpen;
    renderRwyBar();
    renderRwyEditor();
}

function renderRwyEditor() {
    const el = document.getElementById('rwyEditor');
    if (!editorOpen) { el.classList.remove('open'); return; }
    el.classList.add('open');
    let html = '';
    runways.forEach((r, i) => {
        html += '<div class="rwy-editor-row">'
              + '<input class="rwy-name" type="text" value="' + r.name + '" placeholder="Name" onchange="updateRwy(' + i + ',this.value,null)">'
              + '<input class="rwy-hdg" type="number" inputmode="numeric" value="' + r.hdg + '" placeholder="Hdg" onchange="updateRwy(' + i + ',null,this.value)">'
              + '<button class="rwy-del-btn" onclick="deleteRwy(' + i + ')">&#x2715;</button>'
              + '</div>';
    });
    html += '<button class="rwy-add-btn" onclick="addRwy()">+ Add Runway</button>';
    el.innerHTML = html;
}

function updateRwy(i, name, hdg) {
    if (name !== null) runways[i].name = name;
    if (hdg !== null) runways[i].hdg = parseInt(hdg) || 0;
    saveRunways(runways);
    renderRwyBar();
}

function deleteRwy(i) {
    runways.splice(i, 1);
    if (activeRwy === i) activeRwy = -1;
    else if (activeRwy > i) activeRwy--;
    saveRunways(runways);
    renderRwyBar();
    renderRwyEditor();
}

function addRwy() {
    runways.push({ name: 'RWY', hdg: 0 });
    saveRunways(runways);
    renderRwyBar();
    renderRwyEditor();
}

/* ══════════════════════════════════════════════
   CROSSWIND CALCULATOR
   ══════════════════════════════════════════════ */
const T_LIMIT = 10;
const H_LIMIT = 55;

function windComponents(rwy, dir, spd) {
    let diff = Math.abs(dir - rwy);
    if (diff > 180) diff = 360 - diff;
    const rad = diff * (Math.PI / 180);

    /* Determine sign for head/tail: need to know if wind is from ahead or behind */
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

function calcWind() {
    const rwyVal = document.getElementById('rwyHdg').value;
    const dirVal = document.getElementById('windDir').value;
    const spdVal = document.getElementById('windSpd').value;

    if (rwyVal === '' || spdVal === '') {
        document.getElementById('xWindRes').innerText = '0 KT';
        document.getElementById('hWindRes').innerText = '0 KT';
        document.getElementById('xWindGust').innerText = '';
        document.getElementById('hWindGust').innerText = '';
        document.getElementById('windStatus').innerText = 'WAITING FOR INPUT';
        document.getElementById('windStatus').className = 'status-pill status-pass';
        drawWind();
        return;
    }

    const rwy = parseFloat(rwyVal) || 0;
    const dir = parseFloat(dirVal) || 0;
    const spd = parseFloat(spdVal) || 0;
    const gust = parseFloat(document.getElementById('gustSpd').value) || 0;
    const xLimit = parseFloat(document.getElementById('rwyCond').value);

    const sustained = windComponents(rwy, dir, spd);
    const gustComp = (gust > spd) ? windComponents(rwy, dir, gust) : null;

    /* Display sustained */
    document.getElementById('xWindRes').innerText = Math.round(sustained.xWind) + ' KT';
    document.getElementById('hWindRes').innerText = Math.round(Math.abs(sustained.hWind)) + ' KT';
    document.getElementById('windLabel').innerText = sustained.hWind >= 0 ? 'HEADWIND' : 'TAILWIND';

    /* Display gust line */
    const xGustEl = document.getElementById('xWindGust');
    const hGustEl = document.getElementById('hWindGust');
    if (gustComp && gust > spd) {
        xGustEl.innerText = 'Gust: ' + Math.round(gustComp.xWind) + ' KT';
        hGustEl.innerText = 'Gust: ' + Math.round(Math.abs(gustComp.hWind)) + ' KT';
    } else {
        xGustEl.innerText = '';
        hGustEl.innerText = '';
    }

    /* Limit check uses higher value (gust if present) */
    const checkX = gustComp && gust > spd ? gustComp.xWind : sustained.xWind;
    const checkH = gustComp && gust > spd ? gustComp.hWind : sustained.hWind;

    const xSafe = checkX <= xLimit;
    const tSafe = checkH >= -T_LIMIT;
    const hSafe = checkH <= H_LIMIT;

    const status = document.getElementById('windStatus');
    if (xSafe && tSafe && hSafe) {
        status.innerText = 'WITHIN LIMITS';
        status.className = 'status-pill status-pass';
    } else {
        if (!xSafe) status.innerText = 'EXCEEDS CROSSWIND (' + xLimit + ' KT)';
        else if (!tSafe) status.innerText = 'EXCEEDS TAILWIND (' + T_LIMIT + ' KT)';
        else status.innerText = 'EXCEEDS HEADWIND (' + H_LIMIT + ' KT)';
        status.className = 'status-pill status-fail';
    }

    drawWind();
}

function clearWind() {
    ['rwyHdg','windDir','windSpd','gustSpd'].forEach(id => document.getElementById(id).value = '');
    activeRwy = -1;
    renderRwyBar();
    calcWind();
}

/* ══════════════════════════════════════════════
   WIND DIAGRAM (Canvas)
   ══════════════════════════════════════════════ */

/* Runway number from heading: 261° → "26", 83° → "08" */
function rwyNum(hdg) {
    const n = Math.round(((hdg % 360) + 360) % 360 / 10) % 36;
    return n === 0 ? '36' : String(n).padStart(2, '0');
}

function drawWind() {
    const canvas = document.getElementById('windDiagram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = (Math.min(W, H) / 2) - 36;

    ctx.clearRect(0, 0, W, H);

    const rwy = parseFloat(document.getElementById('rwyHdg').value) || 0;
    const dir = parseFloat(document.getElementById('windDir').value) || 0;
    const spd = parseFloat(document.getElementById('windSpd').value) || 0;

    const rwyRad = (rwy - 90) * Math.PI / 180;
    const cosR = Math.cos(rwyRad);
    const sinR = Math.sin(rwyRad);
    /* Perpendicular unit vector (90° CW) */
    const pCos = Math.cos(rwyRad + Math.PI / 2);
    const pSin = Math.sin(rwyRad + Math.PI / 2);

    /* ── Compass ring ── */
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#cdd3dc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* ── Tick marks every 10° ── */
    for (let d = 0; d < 360; d += 10) {
        const a = (d - 90) * Math.PI / 180;
        const major = d % 30 === 0;
        const cardinal = d % 90 === 0;
        const inner = cardinal ? R - 14 : major ? R - 10 : R - 6;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
        ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
        ctx.strokeStyle = cardinal ? '#8899aa' : '#c0c8d0';
        ctx.lineWidth = cardinal ? 2 : 1;
        ctx.stroke();
    }

    /* ── Cardinal labels ── */
    ctx.fillStyle = '#778899';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [{t:'N',a:0},{t:'E',a:90},{t:'S',a:180},{t:'W',a:270}].forEach(l => {
        const a = (l.a - 90) * Math.PI / 180;
        ctx.fillStyle = l.t === 'N' ? '#c0392b' : '#8899aa';
        ctx.fillText(l.t, cx + (R + 20) * Math.cos(a), cy + (R + 20) * Math.sin(a));
    });

    /* ══════════════════════════════════════
       RUNWAY TARMAC
       ══════════════════════════════════════ */
    const rwyHalf = R * 0.82;   /* half-length of runway strip */
    const rwyW = 28;            /* half-width of tarmac */

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rwyRad);

    /* Tarmac surface */
    const tarmacGrad = ctx.createLinearGradient(-rwyHalf, 0, rwyHalf, 0);
    tarmacGrad.addColorStop(0, '#3a3f4a');
    tarmacGrad.addColorStop(0.5, '#4a5060');
    tarmacGrad.addColorStop(1, '#3a3f4a');
    ctx.fillStyle = tarmacGrad;
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

    /* ── Threshold markings (approach end = +rwyHalf direction) ── */
    drawThreshold(ctx, rwyHalf - 12, rwyW);   /* approach end */
    drawThreshold(ctx, -rwyHalf + 12, rwyW);  /* reciprocal end */

    /* ── Runway numbers ──
       Runway 26 (hdg 261°): "26" painted at the OPPOSITE end to the heading
       direction, so approaching pilots see it. rwyRad points toward the
       heading (west-ish for 261°), so "26" goes at -rwyHalf (east end). */
    const numApproach = rwyNum(rwy);
    const numRecip = rwyNum((rwy + 180) % 360);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* Approach-end number at -rwyHalf (reads along +x = heading dir) */
    ctx.save();
    ctx.translate(-rwyHalf + 38, 0);
    ctx.fillText(numApproach, 0, 0);
    ctx.restore();

    /* Reciprocal number at +rwyHalf (reads along -x = reciprocal dir) */
    ctx.save();
    ctx.translate(rwyHalf - 38, 0);
    ctx.rotate(Math.PI);
    ctx.fillText(numRecip, 0, 0);
    ctx.restore();

    ctx.restore(); /* un-rotate from runway drawing */

    /* ══════════════════════════════════════
       AIRPLANE on short final
       — sits beyond the approach threshold (opposite to heading direction)
       — points toward the runway (in the heading direction)
       ══════════════════════════════════════ */
    const planeDist = rwyHalf + 30;
    const px = cx - planeDist * cosR;
    const py = cy - planeDist * sinR;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rwyRad); /* nose points in heading direction (toward runway) */
    drawAirplane(ctx, 0.55);
    ctx.restore();

    /* ══════════════════════════════════════
       WIND ARROW
       ══════════════════════════════════════ */
    if (spd > 0) {
        const windRad = (dir - 90) * Math.PI / 180;
        const wCos = Math.cos(windRad);
        const wSin = Math.sin(windRad);

        /* Arrow starts at compass edge, points inward (wind blows FROM this direction) */
        const arrowStart = R - 2;
        const arrowLen = Math.min(R * 0.55, 28 + spd * 1.8);
        const sx = cx + arrowStart * wCos;
        const sy = cy + arrowStart * wSin;
        const ex = sx - arrowLen * wCos;
        const ey = sy - arrowLen * wSin;

        /* Shaft */
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        /* Filled arrowhead */
        const headLen = 16;
        const headW = 8;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + headLen * wCos + headW * wSin, ey + headLen * wSin - headW * wCos);
        ctx.lineTo(ex + headLen * wCos - headW * wSin, ey + headLen * wSin + headW * wCos);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        /* Wind speed label near arrow origin */
        ctx.save();
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lblDist = arrowStart + 18;
        ctx.fillText(Math.round(spd) + '', cx + lblDist * wCos, cy + lblDist * wSin);
        ctx.restore();

        /* ── Component vectors ── */
        const comp = windComponents(rwy, dir, spd);
        const maxVec = R * 0.45;
        const xLen = Math.min(maxVec, comp.xWind * 2);
        const hLen = Math.min(maxVec, Math.abs(comp.hWind) * 2);

        /* Determine crosswind side */
        let rawDiff = dir - rwy;
        if (rawDiff > 180) rawDiff -= 360;
        if (rawDiff < -180) rawDiff += 360;
        const xSign = rawDiff > 0 ? 1 : -1;
        const perpAngle = rwyRad + (Math.PI / 2) * xSign;

        /* Crosswind component */
        if (xLen > 4) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + xLen * Math.cos(perpAngle), cy + xLen * Math.sin(perpAngle));
            ctx.strokeStyle = '#e67e22';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#e67e22';
            ctx.font = 'bold 16px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(comp.xWind) + ' X',
                cx + (xLen + 20) * Math.cos(perpAngle),
                cy + (xLen + 20) * Math.sin(perpAngle));
        }

        /* Headwind / tailwind component */
        if (hLen > 4) {
            const hSign = comp.hWind >= 0 ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + hLen * cosR * hSign, cy + hLen * sinR * hSign);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#27ae60';
            ctx.font = 'bold 16px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const hLabel = Math.round(Math.abs(comp.hWind)) + (comp.hWind >= 0 ? ' H' : ' T');
            ctx.fillText(hLabel,
                cx + (hLen + 22) * cosR * hSign,
                cy + (hLen + 22) * sinR * hSign);
        }
    }
}

/* ── Helper: rounded rectangle ── */
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

/* ── Helper: threshold stripes ── */
function drawThreshold(ctx, xPos, rwyW) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const stripes = 4;
    const stripeW = 3;
    const gap = (rwyW * 2 - 8) / (stripes * 2 - 1);
    for (let i = 0; i < stripes; i++) {
        const sy = -rwyW + 4 + i * gap * 2;
        ctx.fillRect(xPos - 10, sy, 20, gap);
    }
}

/* ── Helper: airplane silhouette ── */
/* Draws a top-down airplane at origin, pointing right (+x).
   Scale ~1.0 gives a ~50px long aircraft. */
function drawAirplane(ctx, scale) {
    const s = scale;
    ctx.fillStyle = '#1a2d4a';
    ctx.strokeStyle = '#1a2d4a';
    ctx.lineWidth = 1;

    ctx.beginPath();
    /* Nose */
    ctx.moveTo(28 * s, 0);
    /* Right fuselage to wing */
    ctx.lineTo(10 * s, 3 * s);
    /* Right wing */
    ctx.lineTo(6 * s, 3 * s);
    ctx.lineTo(-2 * s, 28 * s);
    ctx.lineTo(-8 * s, 28 * s);
    ctx.lineTo(-4 * s, 3.5 * s);
    /* Right fuselage aft */
    ctx.lineTo(-18 * s, 4 * s);
    /* Right tailplane */
    ctx.lineTo(-22 * s, 14 * s);
    ctx.lineTo(-26 * s, 14 * s);
    ctx.lineTo(-24 * s, 4 * s);
    /* Tail */
    ctx.lineTo(-28 * s, 4 * s);
    ctx.lineTo(-28 * s, -4 * s);
    /* Left tailplane */
    ctx.lineTo(-24 * s, -4 * s);
    ctx.lineTo(-26 * s, -14 * s);
    ctx.lineTo(-22 * s, -14 * s);
    ctx.lineTo(-18 * s, -4 * s);
    /* Left fuselage aft */
    ctx.lineTo(-4 * s, -3.5 * s);
    /* Left wing */
    ctx.lineTo(-8 * s, -28 * s);
    ctx.lineTo(-2 * s, -28 * s);
    ctx.lineTo(6 * s, -3 * s);
    ctx.lineTo(10 * s, -3 * s);
    ctx.closePath();
    ctx.fill();
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderRwyBar();

    /* ── Service Worker ── */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function(){});
    }
});
