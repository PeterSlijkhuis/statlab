import Workspace from '../components/workspace/Workspace';
import { useLessonSession, type SessionLesson } from '../r/useLessonSession';

/** Module-level so its identity is stable across renders. */
const PLAYGROUND: SessionLesson = { id: 'playground' };

const STARTER = `# Run a line with Ctrl+Enter (Cmd+Enter on a Mac), or the whole script with Source.
population <- read.csv("data/wellbeing-population.csv")

summary(population)`;

export default function Playground() {
  // No packages: the playground gets the core set from prepareSession and
  // nothing more. A student experimenting here has not opened a lesson that
  // justifies a 20 MB modelling-package download.
  const { webR, env } = useLessonSession(PLAYGROUND);

  return (
    <>
      <h1>R playground</h1>
      <p className="playground-intro">
        RStudio's four panes, in your browser: write in Source, run it in the Console, and find your objects, files, plots and
        help pages on the right. Your script, uploads and layout stay in this browser, and nothing here is marked.
      </p>
      <Workspace id="playground" starter={STARTER} webR={webR} env={env} />
    </>
  );
}
