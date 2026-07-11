import { splitByCount, splitByWeight } from '../lib/baggage.js';

export function initBagsPanel() {
    const el = {
        totalBags: document.getElementById('totalBags'),
        totalWeight: document.getElementById('totalWeight'),
        fwdBagTarget: document.getElementById('fwdBagTarget'),
        fwdWeightTarget: document.getElementById('fwdWeightTarget'),
        avg: document.getElementById('avgWeightDisp'),
        fwdBagsRes: document.getElementById('fwdBagsRes'),
        aftBagsRes: document.getElementById('aftBagsRes'),
        fwdWeightRes: document.getElementById('fwdWeightRes'),
        aftWeightRes: document.getElementById('aftWeightRes'),
        clearBtn: document.getElementById('clearBagsBtn'),
    };

    function render(split) {
        if (!split) {
            el.fwdBagsRes.textContent = '–';
            el.aftBagsRes.textContent = '–';
            el.fwdWeightRes.textContent = '0 kg';
            el.aftWeightRes.textContent = '0 kg';
            el.avg.textContent = '';
            return;
        }
        el.avg.textContent = `Avg: ${split.avgKg.toFixed(1)} kg/bag`;
        el.fwdBagsRes.textContent = `${split.fwdBags} Bags`;
        el.aftBagsRes.textContent = `${split.aftBags} Bags`;
        el.fwdWeightRes.textContent = `${Math.round(split.fwdWeightKg)} kg`;
        el.aftWeightRes.textContent = `${Math.round(split.aftWeightKg)} kg`;
    }

    /*
     * source: 'count' | 'weight' | 'totals'. The two split options are
     * mutually exclusive — typing in one clears the other. Editing the
     * totals recalculates with whichever option still holds a value.
     */
    function recalc(source) {
        if (source === 'count') el.fwdWeightTarget.value = '';
        if (source === 'weight') el.fwdBagTarget.value = '';

        const totalBags = parseInt(el.totalBags.value, 10) || 0;
        const totalWeightKg = parseFloat(el.totalWeight.value) || 0;
        if (totalBags <= 0) {
            render(null);
            return;
        }

        const byWeight = el.fwdWeightTarget.value !== '';
        const split = byWeight
            ? splitByWeight(totalBags, totalWeightKg, parseFloat(el.fwdWeightTarget.value) || 0)
            : splitByCount(totalBags, totalWeightKg, parseInt(el.fwdBagTarget.value, 10) || 0);
        render(split);
    }

    el.totalBags.addEventListener('input', () => recalc('totals'));
    el.totalWeight.addEventListener('input', () => recalc('totals'));
    el.fwdBagTarget.addEventListener('input', () => recalc('count'));
    el.fwdWeightTarget.addEventListener('input', () => recalc('weight'));

    el.clearBtn.addEventListener('click', () => {
        [el.totalBags, el.totalWeight, el.fwdBagTarget, el.fwdWeightTarget]
            .forEach(input => { input.value = ''; });
        render(null);
    });
}
