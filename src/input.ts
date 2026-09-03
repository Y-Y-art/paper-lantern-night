export class Input {
  x = 0;
  y = 0;
  keys = new Set<string>();
  burstQueued = false;
  restartQueued = false;
  pauseQueued = false;
  muteQueued = false;
  pointerDown = false;
  private touchOrigin: { x: number; y: number } | null = null;

  constructor(private el: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  sample(): { x: number; y: number } {
    let x = this.x;
    let y = this.y;
    if (this.keys.has('keya') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('keyd') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('keyw') || this.keys.has('arrowup')) y += 1;
    if (this.keys.has('keys') || this.keys.has('arrowdown')) y -= 1;
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    return { x, y };
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.code.toLowerCase();
    this.keys.add(k);
    if (e.code === 'Space') {
      e.preventDefault();
      this.burstQueued = true;
    }
    if (e.code === 'KeyR') this.restartQueued = true;
    if (e.code === 'KeyP' || e.code === 'Escape') this.pauseQueued = true;
    if (e.code === 'KeyM') this.muteQueued = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code.toLowerCase());
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || this.pointerDown) {
      if (this.touchOrigin) {
        const dx = (e.clientX - this.touchOrigin.x) / (window.innerWidth * 0.28);
        const dy = (this.touchOrigin.y - e.clientY) / (window.innerHeight * 0.28);
        this.x = Math.max(-1, Math.min(1, dx));
        this.y = Math.max(-1, Math.min(1, dy));
        return;
      }
    }
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    this.x = Math.max(-1, Math.min(1, nx * 1.15));
    this.y = Math.max(-1, Math.min(1, ny * 1.15));
  };

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDown = true;
    this.touchOrigin = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'touch') {
      this.x = 0;
      this.y = 0;
    }
  };

  private onPointerUp = () => {
    this.pointerDown = false;
    this.touchOrigin = null;
  };
}
