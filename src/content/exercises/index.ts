import type { ExerciseDef } from '../../r/checker';
import { module06 } from './module-06';

export const ALL_EXERCISES: ExerciseDef[] = [...module06];

const byId = new Map(ALL_EXERCISES.map((exercise) => [exercise.id, exercise]));

export function getExercise(id: string): ExerciseDef | undefined {
  return byId.get(id);
}
