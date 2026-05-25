let gameEl: HTMLElement | null = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function inNativeFs(): boolean {
    return !!(document.fullscreenElement || (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement);
}

function inPseudoFs(): boolean {
    return !!gameEl?.classList.contains('pseudo-fs');
}

function tryLockLandscape(): void {
    // why: ScreenOrientation.lock is not in stable TypeScript lib yet
    const orient = screen.orientation as { lock?: (o: string) => Promise<void> };
    orient.lock?.('landscape').catch(() => { /* unsupported */ });
}

function enterPseudoFs(): void {
    document.body.classList.add('pseudo-fs');
    gameEl?.classList.add('pseudo-fs');
    tryLockLandscape();
}

function exitPseudoFs(): void {
    document.body.classList.remove('pseudo-fs');
    gameEl?.classList.remove('pseudo-fs');
    try { (screen.orientation as { unlock?: () => void }).unlock?.(); } catch (_) { /* noop */ }
}

export function toggleFs(): void {
    if (inNativeFs()) {
        void (document.exitFullscreen || (document as { webkitExitFullscreen?: () => void }).webkitExitFullscreen)?.call(document);
        return;
    }
    if (inPseudoFs()) { exitPseudoFs(); return; }

    const el = gameEl;
    if (!el) return;
    const req = el.requestFullscreen || (el as { webkitRequestFullscreen?: (opts: object) => Promise<void> }).webkitRequestFullscreen;
    if (req && !isIOS) {
        const p = req.call(el, { navigationUI: 'hide' }) as Promise<void> | undefined;
        if (p?.then) { p.then(tryLockLandscape).catch(() => enterPseudoFs()); }
        else { tryLockLandscape(); }
    } else {
        enterPseudoFs();
    }
}

export function initFullscreen(container: HTMLElement): void {
    gameEl = container;
}
