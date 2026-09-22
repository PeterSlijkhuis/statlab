import CodeBlock from '../components/CodeBlock';
import { LessonProvider } from '../content/LessonContext';
import { useLessonSession, type SessionLesson } from '../r/useLessonSession';

/** Module-level so its identity is stable across renders. */
const PLAYGROUND: SessionLesson = { id: 'playground' };

export default function Playground() {
  // No packages: the playground gets the core set from prepareSession and
  // nothing more. A student experimenting here has not opened a lesson that
  // justifies a 20 MB modelling-package download.
  const { webR, env } = useLessonSession(PLAYGROUND);

  return (
    <LessonProvider value={{ lessonId: 'playground', webR, env, ready: Boolean(webR && env) }}>
      <h1>R playground</h1>
      <p>
        A scratch space where the course datasets are available to read in. Nothing here is marked or
        saved beyond this browser.
      </p>
      <CodeBlock
        id="playground"
        code={`population <- read.csv("data/wellbeing-population.csv")

summary(population)`}
      />
    </LessonProvider>
  );
}
