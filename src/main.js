import { initTheme } from './ui/theme.js';
import { initTabs } from './ui/tabs.js';
import { initBagsPanel } from './ui/bags-panel.js';
import { initWindPanel } from './ui/wind-panel.js';

const windPanel = initWindPanel();
initBagsPanel();

/* Redraw the diagram whenever theme or visibility changes: the canvas
   palette follows CSS variables, and a hidden canvas can't be sized. */
initTheme({ onChange: () => windPanel.redraw() });
initTabs({ onChange: tab => { if (tab === 'wind') windPanel.redraw(); } });

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
