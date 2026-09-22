import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library registers its own afterEach(cleanup) only when Vitest
// runs with globals enabled. This project keeps globals off, so unmounting
// between tests has to be wired up explicitly — without it every render leaks
// into the next test and queries fail with "found multiple elements".
afterEach(cleanup);

// jsdom defines window.scrollTo but only to report "Not implemented". App calls
// it on every route change, so a silent stub keeps that noise out of the log.
if (typeof window !== 'undefined') window.scrollTo = () => {};
