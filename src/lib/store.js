/* localStorage persistence. Keys are unchanged from v1 so existing
   installs keep their saved runways and theme. */

const THEME_KEY = 'atr72_theme';
const RUNWAYS_KEY = 'atr72_runways';

export const DEFAULT_RUNWAYS = [
    { name: 'EGNS 26', hdg: 261 },
    { name: 'EGNS 08', hdg: 83 },
];

function read(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* storage unavailable (private mode / quota) — run without persistence */
    }
}

export function loadTheme() {
    return read(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function saveTheme(theme) {
    write(THEME_KEY, theme);
}

export function loadRunways() {
    const raw = read(RUNWAYS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(r => r && typeof r.name === 'string')
                    .map(r => ({ name: r.name, hdg: Number(r.hdg) || 0 }));
            }
        } catch {
            /* corrupt entry — fall through to defaults */
        }
    }
    return DEFAULT_RUNWAYS.map(r => ({ ...r }));
}

export function saveRunways(runways) {
    write(RUNWAYS_KEY, JSON.stringify(runways));
}
