/* Camera-aware loading: prioritize visible tiles, bound concurrency and resident images. */
(function (root) {
  'use strict';
  function tilePlan({ width, tileWidth, left, right, margin = 1 }) {
    const count = Math.ceil(width / tileWidth);
    const first = Math.max(0, Math.min(count - 1, Math.floor(left / tileWidth)));
    const last = Math.max(first, Math.min(count - 1, Math.ceil(right / tileWidth) - 1));
    const visible = Array.from({ length: last - first + 1 }, (_, i) => first + i);
    const nearby = [];
    for (let n = 1; n <= margin; n++) {
      if (first - n >= 0) nearby.push(first - n);
      if (last + n < count) nearby.push(last + n);
    }
    return { visible, wanted: [...visible, ...nearby] };
  }

  function createTileLoader({ images, width, tileWidth = 2000, concurrency = 2,
    maxResident = 6, margin = 1, onStatus = () => {} }) {
    const states = images.map(() => 'idle');
    let plan = { visible: [], wanted: [] }, active = 0, disposed = false;
    function report() {
      if (!disposed) onStatus({ failed: plan.visible.filter(i => states[i] === 'error').length,
        pending: plan.visible.filter(i => states[i] !== 'ready').length });
    }
    function evict() {
      const ready = states.map((s, i) => s === 'ready' ? i : -1).filter(i => i >= 0);
      const center = (plan.visible[0] + plan.visible.at(-1)) / 2;
      const outside = ready.filter(i => !plan.wanted.includes(i))
        .sort((a, b) => Math.abs(b - center) - Math.abs(a - center));
      while (ready.length > maxResident && outside.length) {
        const i = outside.shift();
        images[i].classList.remove('ready');
        images[i].removeAttribute('src');
        states[i] = 'idle';
        ready.pop();
      }
    }
    function pump() {
      if (disposed) return;
      for (const i of plan.wanted) {
        if (active >= concurrency) break;
        if (states[i] !== 'idle') continue;
        states[i] = 'loading'; active++;
        const image = images[i];
        const complete = success => {
          if (disposed || states[i] !== 'loading') return;
          image.onload = image.onerror = null;
          states[i] = success ? 'ready' : 'error'; active--;
          image.classList.toggle('ready', success);
          evict(); report(); pump();
        };
        image.onload = () => complete(true);
        image.onerror = () => complete(false);
        image.fetchPriority = plan.visible.includes(i) ? 'high' : 'low';
        image.src = `assets/tile-${String(i).padStart(2, '0')}.jpg`;
      }
    }
    return {
      update(left, right) {
        const next = tilePlan({ width, tileWidth, left, right, margin });
        if (next.visible.join() === plan.visible.join()) return;
        plan = next; evict(); report(); pump();
      },
      retry() {
        for (const i of plan.wanted) if (states[i] === 'error') states[i] = 'idle';
        report(); pump();
      },
      dispose() { disposed = true; images.forEach(i => { i.onload = i.onerror = null; }); }
    };
  }
  const api = { tilePlan, createTileLoader };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QianliImages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
