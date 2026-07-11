export function initTabs({ onChange } = {}) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

    function select(index) {
        tabs.forEach((tab, i) => {
            const active = i === index;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
            panels[i].classList.toggle('active', active);
        });
        onChange?.(panels[index].dataset.tab);
    }

    tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
}
