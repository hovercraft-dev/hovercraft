import { initTheme } from './ui/theme.js';
import { initTabs } from './ui/tabs.js';
import { initBagsPanel } from './ui/bags-panel.js';
import { initWindPanel } from './ui/wind-panel.js';

const windPanel = initWindPanel();
initBagsPanel();

/* The diagram animates only while its tab is visible; a redraw on
   theme change keeps the canvas palette in sync with CSS variables. */
initTheme({ onChange: () => windPanel.redraw() });
initTabs({ onChange: tab => {
    windPanel.setActive(tab === 'wind');
    if (tab === 'wind') windPanel.redraw();
} });

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
