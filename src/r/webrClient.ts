import { WebR } from 'webr';

export const WEBR_VERSION = 'v0.6.0';
export const WEBR_BASE_URL = `https://webr.r-wasm.org/${WEBR_VERSION}/`;

export type RStatus = {
  phase: 'idle' | 'booting' | 'installing' | 'ready' | 'error';
  detail?: string;
};

let instance: WebR | null = null;
let booting: Promise<WebR> | null = null;
let status: RStatus = { phase: 'idle' };
const listeners = new Set<(s: RStatus) => void>();

export function getStatus(): RStatus {
  return status;
}

export function setStatus(next: RStatus): void {
  status = next;
  for (const fn of listeners) fn(status);
}

export function onStatus(fn: (s: RStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getWebR(): Promise<WebR> {
  if (instance) return Promise.resolve(instance);
  if (booting) return booting;

  setStatus({ phase: 'booting' });
  booting = (async () => {
    const webR = new WebR({ baseUrl: WEBR_BASE_URL });
    try {
      await webR.init();
    } catch (err) {
      booting = null;
      setStatus({ phase: 'error', detail: String(err) });
      throw err;
    }
    instance = webR;
    return webR;
  })();

  return booting;
}

