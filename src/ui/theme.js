import { loadTheme, saveTheme } from '../lib/store.js';

/* theme-color meta values matching the header gradient in each mode */
const META_LIGHT = '#0a1628';
const META_DARK = '#000000';

export function initTheme({ onChange } = {}) {
    const btn = document.getElementById('themeToggle');
    const meta = document.querySelector('meta[name="theme-color"]');

    function apply(theme) {
        const dark = theme === 'dark';
        document.body.classList.toggle('dark-mode', dark);
        btn.textContent = dark ? '☀️' : '🌙';
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        meta.setAttribute('content', dark ? META_DARK : META_LIGHT);
        onChange?.(theme);
    }

    apply(loadTheme());

    btn.addEventListener('click', () => {
        const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        saveTheme(next);
        apply(next);
    });
}
