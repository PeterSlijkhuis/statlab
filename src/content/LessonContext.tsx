import { createContext, useContext, type ReactNode } from 'react';
import type { RObject, WebR } from 'webr';

export type LessonContextValue = {
  lessonId: string;
  webR: WebR | null;
  env: RObject | null;
  ready: boolean;
};

const LessonContext = createContext<LessonContextValue>({
  lessonId: 'unknown',
  webR: null,
  env: null,
  ready: false,
});

export function LessonProvider({ value, children }: { value: LessonContextValue; children: ReactNode }) {
  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}

export function useLesson(): LessonContextValue {
  return useContext(LessonContext);
}
