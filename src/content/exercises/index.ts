import type { ExerciseDef } from '../../r/checker';
import { module01 } from './module-01';
import { module02 } from './module-02';
import { module03 } from './module-03';
import { module04 } from './module-04';
import { module05 } from './module-05';
import { module06 } from './module-06';
import { module07 } from './module-07';
import { module08 } from './module-08';
import { module09 } from './module-09';
import { module10 } from './module-10';
import { module11 } from './module-11';
import { module12 } from './module-12';
import { module13 } from './module-13';
import { module14 } from './module-14';

export const ALL_EXERCISES: ExerciseDef[] = [
  ...module01, ...module02, ...module03, ...module04, ...module05,
  ...module06, ...module07, ...module08, ...module09, ...module10,
  ...module11, ...module12, ...module13, ...module14,
];

const byId = new Map(ALL_EXERCISES.map((exercise) => [exercise.id, exercise]));

export function getExercise(id: string): ExerciseDef | undefined {
  return byId.get(id);
}
