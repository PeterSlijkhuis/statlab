import { SIMULATIONS } from '../sims/registry';

export default function Simulation({ name }: { name: string }) {
  const Component = SIMULATIONS[name];
  if (!Component) {
    return <p className="exercise-missing">Simulation “{name}” is not registered.</p>;
  }
  return <Component />;
}
