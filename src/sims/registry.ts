import type { ComponentType } from 'react';
import CI from './CI';
import CLT from './CLT';
import Correlation from './Correlation';
import Distribution from './Distribution';
import LeastSquares from './LeastSquares';
import PValue from './PValue';

export const SIMULATIONS: Record<string, ComponentType> = {
  ci: CI,
  clt: CLT,
  correlation: Correlation,
  distribution: Distribution,
  leastsquares: LeastSquares,
  pvalue: PValue,
};

export const SIMULATION_NAMES = Object.keys(SIMULATIONS);
