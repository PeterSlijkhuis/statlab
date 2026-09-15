import CodeBlock from '../components/CodeBlock';
import { LessonProvider } from '../content/LessonContext';
import { useLessonSession } from '../r/useLessonSession';

export default function Playground() {
  const { webR, env } = useLessonSession('playground');

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
