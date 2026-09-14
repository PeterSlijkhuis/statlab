import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library registers its own afterEach(cleanup) only when Vitest
// runs with globals enabled. This project keeps globals off, so unmounting
// between tests has to be wired up explicitly — without it every render leaks
// into the next test and queries fail with "found multiple elements".
afterEach(cleanup);
