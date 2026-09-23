import Workspace from '../components/workspace/Workspace';
import { useLessonSession, type SessionLesson } from '../r/useLessonSession';

/**
 * Module-level so its identity is stable across renders. The id is the page's
 * old name, kept because it scopes the scripts and layout already saved in
 * students' browsers.
 */
const WORKSPACE: SessionLesson = { id: 'playground' };

const STARTER = `# Run a line with Ctrl+Enter (Cmd+Enter on a Mac), or the whole script with Source.
population <- read.csv("data/wellbeing-population.csv")

summary(population)`;

export default function RWorkspace() {
  // No packages: the workspace gets the core set from prepareSession, and
  // library() fetches anything else the moment a script asks for it.
  const { webR, env } = useLessonSession(WORKSPACE);

  return (
    <>
      <h1>R Workspace</h1>
      <p className="workspace-intro">
        R and RStudio's four panes, in your browser, with nothing to install. Write in Source, run it in the Console, and
        find your objects, files, plots, packages and help on the right. Upload your own data and use it for a real analysis.
      </p>
      <details className="workspace-limits">
        <summary>How this differs from RStudio on your computer</summary>
        <ul>
          <li>R runs inside this browser tab. Your data never leaves your computer.</li>
          <li>
            Your scripts, uploaded files and layout stay in this browser. Files R creates, such as a CSV from{' '}
            <code>write.csv()</code>, are gone after a reload: download them from Files first. Save a plot with Export in
            the Plots pane.
          </li>
          <li>
            Packages download the first time you use them, and again after a reload. A few cannot run in a browser; the
            Packages pane lists them.
          </li>
          <li>R Markdown and Quarto documents cannot be rendered here.</li>
          <li>Very large datasets can run out of the memory a browser allows.</li>
          <li>Clearing this browser's site data removes your scripts and uploads, so download anything you want to keep.</li>
        </ul>
      </details>
      <Workspace id="playground" starter={STARTER} webR={webR} env={env} />
    </>
  );
}
