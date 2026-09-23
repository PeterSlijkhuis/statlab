import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

type Props = {
  /** "vertical" is a bar standing upright between two columns; "horizontal" lies between two stacked panes. */
  orientation: 'vertical' | 'horizontal';
  /** The first pane's share of the parent, in percent. */
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
  label: string;
};

export const MIN_SHARE = 15;
export const MAX_SHARE = 85;
const STEP = 5;

export const clampShare = (value: number) => Math.min(MAX_SHARE, Math.max(MIN_SHARE, Math.round(value * 10) / 10));

/**
 * The border between two panes, dragged with a mouse or finger as in RStudio,
 * or moved with the arrow keys once focused. Double-click puts it back.
 */
export default function Splitter({ orientation, value, onChange, onReset, label }: Props) {
  const dragging = useRef(false);
  const vertical = orientation === 'vertical';

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    const box = parent.getBoundingClientRect();
    const share = vertical
      ? ((event.clientX - box.left) / box.width) * 100
      : ((event.clientY - box.top) / box.height) * 100;
    if (Number.isFinite(share)) onChange(clampShare(share));
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.body.classList.add('ide-dragging', vertical ? 'ide-dragging-x' : 'ide-dragging-y');
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    document.body.classList.remove('ide-dragging', 'ide-dragging-x', 'ide-dragging-y');
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const less = vertical ? 'ArrowLeft' : 'ArrowUp';
    const more = vertical ? 'ArrowRight' : 'ArrowDown';
    let next: number | null = null;
    if (event.key === less) next = value - STEP;
    else if (event.key === more) next = value + STEP;
    else if (event.key === 'Home') next = MIN_SHARE;
    else if (event.key === 'End') next = MAX_SHARE;
    if (next === null) return;
    event.preventDefault();
    onChange(clampShare(next));
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={Math.round(value)}
      aria-valuemin={MIN_SHARE}
      aria-valuemax={MAX_SHARE}
      title="Drag to resize. Double-click to reset."
      className={`ide-splitter ide-splitter-${orientation}`}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
      onDoubleClick={onReset}
      onKeyDown={key}
    />
  );
}
