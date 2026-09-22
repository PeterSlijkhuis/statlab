import type { ComponentType } from 'react';
import CLT from './CLT';

export const SIMULATIONS: Record<string, ComponentType> = {
  clt: CLT,
};

export const SIMULATION_NAMES = Object.keys(SIMULATIONS);
