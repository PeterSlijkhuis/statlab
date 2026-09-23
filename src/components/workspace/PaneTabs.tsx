import type { KeyboardEvent, ReactNode } from 'react';

export type Tab<T extends string> = { id: T; label: string; onClose?: () => void };

type Props<T extends string> = {
  /** Names the pane, and prefixes the ids that tie each tab to its panel. */
  pane: string;
  tabs: Tab<T>[];
  active: T;
  onSelect: (id: T) => void;
  /** Shown at the right-hand end of the strip, as RStudio shows a busy console. */
  aside?: ReactNode;
};

export const tabId = (pane: string, id: string) => `ide-${pane}-tab-${id}`;
export const panelId = (pane: string, id: string) => `ide-${pane}-panel-${id}`;

/** The strip of tabs along the top of an RStudio pane. */
export default function PaneTabs<T extends string>({ pane, tabs, active, onSelect, aside }: Props<T>) {
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    event.preventDefault();
    onSelect(next.id);
    document.getElementById(tabId(pane, next.id))?.focus();
  }

  return (
    <div className="ide-tabs">
      <div role="tablist" aria-label={pane} className="ide-tablist" onKeyDown={key}>
        {tabs.map((tab) => (
          <span key={tab.id} className={`ide-tab${tab.id === active ? ' active' : ''}`}>
            <button
              type="button"
              role="tab"
              id={tabId(pane, tab.id)}
              aria-selected={tab.id === active}
              aria-controls={panelId(pane, tab.id)}
              tabIndex={tab.id === active ? 0 : -1}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
            {tab.onClose && (
              <button type="button" className="ide-tab-close" aria-label={`Close ${tab.label}`} onClick={tab.onClose}>
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {aside}
    </div>
  );
}
