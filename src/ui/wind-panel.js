import {
    assessWind,
    crosswindLimitForCode,
    RUNWAY_CONDITIONS,
    TAILWIND_LIMIT_KT,
    HEADWIND_LIMIT_KT,
} from '../lib/wind.js';
import { loadRunways, saveRunways } from '../lib/store.js';
import { drawWindDiagram } from './diagram.js';

export function initWindPanel() {
    const el = {
        rwyHdg: document.getElementById('rwyHdg'),
        windDir: document.getElementById('windDir'),
        windSpd: document.getElementById('windSpd'),
        gustSpd: document.getElementById('gustSpd'),
        rwyCond: document.getElementById('rwyCond'),
        xWindRes: document.getElementById('xWindRes'),
        xWindGust: document.getElementById('xWindGust'),
        hWindRes: document.getElementById('hWindRes'),
        hWindGust: document.getElementById('hWindGust'),
        windLabel: document.getElementById('windLabel'),
        windStatus: document.getElementById('windStatus'),
        canvas: document.getElementById('windDiagram'),
        rwyBar: document.getElementById('rwyBar'),
        rwyEditor: document.getElementById('rwyEditor'),
        clearBtn: document.getElementById('clearWindBtn'),
    };

    let runways = loadRunways();
    let activeRunway = -1;
    let editorOpen = false;

    /* ── Runway condition select, built from the single source of truth ── */
    for (const cond of RUNWAY_CONDITIONS) {
        const opt = document.createElement('option');
        opt.value = String(cond.code);
        opt.textContent = `${cond.code} — ${cond.label} (${cond.crosswindLimitKt} kt)`;
        el.rwyCond.appendChild(opt);
    }

    /* ── Runway quick-select bar ── */
    function renderRunwayBar() {
        el.rwyBar.replaceChildren();
        runways.forEach((rwy, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rwy-btn' + (activeRunway === i ? ' active' : '');
            btn.textContent = `${rwy.name} (${rwy.hdg}°)`;
            btn.addEventListener('click', () => selectRunway(i));
            el.rwyBar.appendChild(btn);
        });
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'rwy-btn edit-btn' + (editorOpen ? ' active' : '');
        edit.textContent = editorOpen ? 'Done' : 'Edit';
        edit.addEventListener('click', toggleEditor);
        el.rwyBar.appendChild(edit);
    }

    function selectRunway(i) {
        activeRunway = activeRunway === i ? -1 : i;
        if (activeRunway >= 0) {
            el.rwyHdg.value = runways[i].hdg;
            recalc();
        }
        renderRunwayBar();
    }

    function toggleEditor() {
        editorOpen = !editorOpen;
        renderRunwayBar();
        renderEditor();
    }

    /* ── Runway editor (add / rename / re-heading / delete) ── */
    function renderEditor() {
        el.rwyEditor.classList.toggle('open', editorOpen);
        el.rwyEditor.replaceChildren();
        if (!editorOpen) return;

        runways.forEach((rwy, i) => {
            const row = document.createElement('div');
            row.className = 'rwy-editor-row';

            const name = document.createElement('input');
            name.type = 'text';
            name.className = 'rwy-name';
            name.placeholder = 'Name';
            name.value = rwy.name;
            name.addEventListener('change', () => {
                runways[i].name = name.value;
                saveRunways(runways);
                renderRunwayBar();
            });

            const hdg = document.createElement('input');
            hdg.type = 'number';
            hdg.inputMode = 'numeric';
            hdg.className = 'rwy-hdg';
            hdg.placeholder = 'Hdg';
            hdg.value = rwy.hdg;
            hdg.addEventListener('change', () => {
                runways[i].hdg = parseInt(hdg.value, 10) || 0;
                saveRunways(runways);
                renderRunwayBar();
            });

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'rwy-del-btn';
            del.textContent = '✕';
            del.setAttribute('aria-label', `Delete ${rwy.name}`);
            del.addEventListener('click', () => {
                runways.splice(i, 1);
                if (activeRunway === i) activeRunway = -1;
                else if (activeRunway > i) activeRunway--;
                saveRunways(runways);
                renderRunwayBar();
                renderEditor();
            });

            row.append(name, hdg, del);
            el.rwyEditor.appendChild(row);
        });

        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'rwy-add-btn';
        add.textContent = '+ Add Runway';
        add.addEventListener('click', () => {
            runways.push({ name: 'RWY', hdg: 0 });
            saveRunways(runways);
            renderRunwayBar();
            renderEditor();
        });
        el.rwyEditor.appendChild(add);
    }

    /* ── Calculator ── */
    function numberOrNull(input) {
        return input.value === '' ? null : parseFloat(input.value) || 0;
    }

    function showWaiting() {
        el.xWindRes.textContent = '0 KT';
        el.hWindRes.textContent = '0 KT';
        el.windLabel.textContent = 'HEADWIND';
        el.xWindGust.textContent = '';
        el.hWindGust.textContent = '';
        el.windStatus.textContent = 'WAITING FOR INPUT';
        el.windStatus.className = 'status-pill status-pass';
    }

    function statusText(result) {
        if (result.withinLimits) return 'WITHIN LIMITS';
        switch (result.violation) {
            case 'crosswind': return `EXCEEDS CROSSWIND (${result.crosswindLimitKt} KT)`;
            case 'tailwind': return `EXCEEDS TAILWIND (${TAILWIND_LIMIT_KT} KT)`;
            default: return `EXCEEDS HEADWIND (${HEADWIND_LIMIT_KT} KT)`;
        }
    }

    function recalc() {
        const runwayHdg = numberOrNull(el.rwyHdg);
        const windDir = numberOrNull(el.windDir);
        const speedKt = numberOrNull(el.windSpd);

        if (runwayHdg === null || windDir === null || speedKt === null) {
            showWaiting();
            redraw();
            return;
        }

        const result = assessWind({
            runwayHdg,
            windDir,
            speedKt,
            gustKt: parseFloat(el.gustSpd.value) || 0,
            crosswindLimitKt: crosswindLimitForCode(parseInt(el.rwyCond.value, 10)),
        });

        el.xWindRes.textContent = `${Math.round(result.sustained.crosswindKt)} KT`;
        el.hWindRes.textContent = `${Math.round(Math.abs(result.sustained.headwindKt))} KT`;
        el.windLabel.textContent = result.sustained.headwindKt >= 0 ? 'HEADWIND' : 'TAILWIND';
        el.xWindGust.textContent = result.gust ? `Gust: ${Math.round(result.gust.crosswindKt)} KT` : '';
        el.hWindGust.textContent = result.gust ? `Gust: ${Math.round(Math.abs(result.gust.headwindKt))} KT` : '';

        el.windStatus.textContent = statusText(result);
        el.windStatus.className = `status-pill ${result.withinLimits ? 'status-pass' : 'status-fail'}`;

        redraw();
    }

    function redraw() {
        drawWindDiagram(el.canvas, {
            runwayHdg: parseFloat(el.rwyHdg.value) || 0,
            windDir: parseFloat(el.windDir.value) || 0,
            speedKt: parseFloat(el.windSpd.value) || 0,
        });
    }

    [el.rwyHdg, el.windDir, el.windSpd, el.gustSpd].forEach(input => {
        input.addEventListener('input', () => {
            if (input === el.rwyHdg) {
                activeRunway = -1;
                renderRunwayBar();
            }
            recalc();
        });
    });
    el.rwyCond.addEventListener('change', recalc);

    el.clearBtn.addEventListener('click', () => {
        [el.rwyHdg, el.windDir, el.windSpd, el.gustSpd].forEach(input => { input.value = ''; });
        activeRunway = -1;
        renderRunwayBar();
        recalc();
    });

    renderRunwayBar();
    recalc();

    return { redraw };
}
