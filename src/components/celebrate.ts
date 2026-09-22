/**
 * Small rewards for finishing things: a toast, and a burst of confetti from
 * the button that earned it. Both are decoration. Nothing waits on them, and
 * with reduced motion requested the confetti is skipped entirely.
 */

export type Toast = { id: number; title: string; detail?: string; tone: 'success' | 'milestone' };

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(toasts);
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn);
  fn(toasts);
  return () => listeners.delete(fn);
}

export function showToast(title: string, detail?: string, tone: Toast['tone'] = 'success'): void {
  const toast = { id: nextId++, title, detail, tone };
  // Three at most: a student clearing several quick wins should not get a wall.
  toasts = [...toasts, toast].slice(-3);
  emit();
  setTimeout(() => dismissToast(toast.id), tone === 'milestone' ? 5000 : 3200);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

const COLOURS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

/** Confetti from the centre of `origin`, or the middle of the screen. */
export function confetti(origin?: Element | null, pieces = 28): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const box = origin?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
  const y = box ? box.top + box.height / 2 : window.innerHeight / 3;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.5;
    const distance = 60 + Math.random() * 90;
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = COLOURS[i % COLOURS.length];
    piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * distance - 40}px`);
    piece.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    piece.style.animationDelay = `${Math.random() * 60}ms`;
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1200);
}
