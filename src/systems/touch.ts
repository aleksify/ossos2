import { toggleFs } from './fullscreen';

// Held movement/action flags polled by the Game scene, plus a one-shot `pause`
// edge the Game consumes and clears. Overlay only shows on coarse pointers.
export const touch = { left: false, right: false, jump: false, attack: false, pause: false };

export function initTouchControls(container: HTMLElement): void {
    const div = document.createElement('div');
    div.id = 'touch-controls';
    div.innerHTML = `
<style>
#touch-controls {
    position: fixed; inset: 0; pointer-events: none; z-index: 1000; display: none;
}
@media (pointer: coarse) { #touch-controls { display: block; } }
#touch-controls .row {
    position: absolute; bottom: 16px; display: flex; gap: 10px; align-items: flex-end;
}
#touch-controls .row.left { left: 16px; }
#touch-controls .row.right { right: 16px; }
#touch-controls .top { position: absolute; top: 14px; right: 16px; display: flex; gap: 10px; }
.t-btn {
    width: 60px; height: 60px; background: rgba(255,255,255,0.14);
    border: 2px solid rgba(255,255,255,0.34); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; color: #fff; user-select: none;
    pointer-events: all; touch-action: none; -webkit-tap-highlight-color: transparent;
}
.t-btn.small { width: 44px; height: 44px; font-size: 16px; }
</style>
<div class="row left">
    <div class="t-btn" data-key="left">◀</div>
    <div class="t-btn" data-key="right">▶</div>
</div>
<div class="row right">
    <div class="t-btn" data-key="attack">✶</div>
    <div class="t-btn" data-key="jump">⤒</div>
</div>
<div class="top">
    <div class="t-btn small" data-key="pause">❚❚</div>
    <div class="t-btn small" data-act="fs">⛶</div>
</div>`;
    (container.parentElement ?? document.body).appendChild(div);

    div.querySelectorAll<HTMLElement>('.t-btn[data-key]').forEach((btn) => {
        const key = btn.dataset['key'] as keyof typeof touch;
        const on = (e: Event): void => {
            e.preventDefault();
            touch[key] = true;
        };
        const off = (e: Event): void => {
            e.preventDefault();
            // pause is a one-shot the Game clears; don't reset it on pointerup
            if (key !== 'pause') touch[key] = false;
        };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
    });

    div.querySelector<HTMLElement>('.t-btn[data-act="fs"]')?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        toggleFs();
    });
}
