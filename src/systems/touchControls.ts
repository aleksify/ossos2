import { touchState } from './input';

export function initTouchControls(container: HTMLElement): void {
    const div = document.createElement('div');
    div.id = 'touch-controls';
    div.innerHTML = `
<style>
#touch-controls {
    position: fixed; bottom: 0; left: 0; width: 100%; height: 120px;
    display: none; justify-content: space-between; align-items: flex-end;
    padding: 10px 14px; box-sizing: border-box; pointer-events: none; z-index: 1000;
}
@media (pointer: coarse) { #touch-controls { display: flex; } }
.t-btn {
    width: 58px; height: 58px; background: rgba(255,255,255,0.15);
    border: 2px solid rgba(255,255,255,0.35); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: #fff; user-select: none;
    pointer-events: all; touch-action: none; -webkit-tap-highlight-color: transparent;
}
.t-group { display: flex; gap: 8px; align-items: flex-end; }
</style>
<div class="t-group">
    <div class="t-btn" data-key="left">◀</div>
    <div class="t-btn" data-key="right">▶</div>
</div>
<div class="t-group">
    <div class="t-btn" data-key="attack">✶</div>
    <div class="t-btn" data-key="jump">⤒</div>
</div>`;
    (container.parentElement ?? document.body).appendChild(div);

    div.querySelectorAll<HTMLElement>('.t-btn').forEach(btn => {
        const key = btn.dataset['key'] as keyof typeof touchState;
        const on = (e: Event) => { e.preventDefault(); touchState[key] = true; };
        const off = (e: Event) => { e.preventDefault(); touchState[key] = false; };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
    });
}
