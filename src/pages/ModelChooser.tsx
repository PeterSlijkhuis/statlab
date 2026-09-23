import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { findLesson } from '../content/manifest';
import { allAnswers, follow, GROUPS, packagesDownloaded, packagesMissingHere, pathTo, SHIPS_WITH_R, type Answer } from './modelTree';

export { TREE, type Answer, type Node } from './modelTree';

/**
 * The link to a lesson. findLesson reads MODULES, which holds only modules
 * whose lesson files all exist, so a lessonId added before its module is
 * written resolves to undefined. The link still works in that case, since the
 * route renders its own not-found state, but it loses its title, which is
 * what ModelChooser.test.tsx watches for.
 */
function LessonLink({ lessonId, lead }: { lessonId: string; lead: string }) {
  const lesson = findLesson(lessonId);
  return <Link to={`/lesson/${lessonId}`}>{lesson ? `${lead}: ${lesson.title}` : lead}</Link>;
}

function Badges({ answer }: { answer: Answer }) {
  const runsHere = packagesMissingHere(answer).length === 0;
  return (
    <p className="model-chooser-badges">
      <span className={`model-badge ${answer.lessonId ? 'taught' : 'beyond'}`}>
        {answer.lessonId ? 'Taught in this course' : 'Beyond this course'}
      </span>
      <span className={`model-badge ${runsHere ? 'runs-here' : 'rstudio'}`}>{runsHere ? 'Runs in the R Workspace' : 'Needs RStudio'}</span>
    </p>
  );
}

function list(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Where the snippet runs, and what it takes to get there. */
export function WhereItRuns({ answer }: { answer: Answer }) {
  const missing = packagesMissingHere(answer);
  if (missing.length === 0) {
    const installs = packagesDownloaded(answer);
    return (
      <p>
        <strong>Where to run it:</strong> in the <Link to="/workspace">R Workspace</Link>, once d holds your data.
        {installs.length > 0 && ` The first run downloads ${list(installs)}, which takes a moment.`}
      </p>
    );
  }
  const bundled = missing.filter((name) => SHIPS_WITH_R.includes(name));
  const toInstall = missing.filter((name) => !SHIPS_WITH_R.includes(name));
  return (
    <p>
      <strong>Where to run it:</strong> in RStudio, because this site does not have {list(missing)}.
      {bundled.length > 0 && ` ${list(bundled)} ${bundled.length > 1 ? 'come' : 'comes'} with R, so RStudio already has ${bundled.length > 1 ? 'them' : 'it'}.`}
      {toInstall.length > 0 && (
        <>
          {' '}
          Install {toInstall.length > 1 ? 'them' : 'it'} once with{' '}
          <code>install.packages({toInstall.length > 1 ? `c(${toInstall.map((name) => `"${name}"`).join(', ')})` : `"${toInstall[0]}"`})</code>.
        </>
      )}
    </p>
  );
}

function AnswerCard({ answer }: { answer: Answer }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(answer.rCode);
      setCopied(true);
    } catch {
      // No clipboard permission: the code is on screen to copy by hand.
    }
  }
  useEffect(() => setCopied(false), [answer]);

  return (
    <>
      <Badges answer={answer} />
      <p>
        <strong>When to use it:</strong> {answer.when}
      </p>
      <div className="model-chooser-code">
        <pre>
          <code>{answer.rCode}</code>
        </pre>
        <button type="button" className="button-secondary" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <p>
        <strong>Check first:</strong> {answer.check}
      </p>
      {answer.traditional && (
        <p>
          <strong>Traditional name:</strong> {answer.traditional}
        </p>
      )}
      <p>
        <strong>How to read it:</strong> {answer.note}
      </p>
      <WhereItRuns answer={answer} />
      {answer.lessonId ? (
        <p className="model-chooser-lesson">
          <LessonLink lessonId={answer.lessonId} lead="Go to the lesson" />
        </p>
      ) : (
        <>
          {answer.further && (
            <p>
              <strong>Learn more:</strong> {answer.further}
            </p>
          )}
          {answer.buildsOn && (
            <p className="model-chooser-lesson">
              <LessonLink lessonId={answer.buildsOn} lead="Builds on the lesson" />
            </p>
          )}
        </>
      )}
    </>
  );
}

type Filter = 'all' | 'taught' | 'beyond';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'taught', label: 'Taught in this course' },
  { id: 'beyond', label: 'Beyond this course' },
];

/** Lowercase and without accents, so "Kaplan" finds "Kaplan-Meier" and "cronbach" finds "Cronbach's". */
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Every answer as a card, in sections that follow the order of the questions,
 * so a student who already knows what they need can go straight to it.
 */
function Index({ onPick }: { onPick: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const entries = useMemo(() => allAnswers(), []);

  const words = fold(query).split(/\s+/).filter(Boolean);
  const shown = entries.filter(({ answer }) => {
    if (filter === 'taught' && !answer.lessonId) return false;
    if (filter === 'beyond' && answer.lessonId) return false;
    const haystack = fold(`${answer.model} ${answer.when} ${answer.traditional ?? ''} ${answer.check}`);
    return words.every((word) => haystack.includes(word));
  });
  const sections = GROUPS.map((group) => ({ ...group, answers: shown.filter((entry) => entry.group === group.name).map((entry) => entry.answer) })).filter(
    (section) => section.answers.length > 0,
  );

  return (
    <section className="model-index" aria-labelledby="model-index-title">
      <div className="model-index-head">
        <h2 id="model-index-title">Browse all {entries.length} models</h2>
        <p>Already know what you need? Search by name, or by the test you know it as.</p>
      </div>
      <div className="model-index-tools">
        <label className="model-index-search">
          <span className="visually-hidden">Search the models</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search, for example t-test or mediation" />
        </label>
        <div className="model-index-filters" role="group" aria-label="Show">
          {FILTERS.map((option) => (
            <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 && <p className="model-index-empty">No model matches. Try another word, or answer the questions above.</p>}

      {sections.map((section) => (
        <div key={section.name} className="model-index-section">
          <h3>
            {section.name} <span className="model-index-count">{section.answers.length}</span>
          </h3>
          <p className="model-index-blurb">{section.blurb}</p>
          <ul className="model-cards">
            {section.answers.map((answer) => (
              <li key={answer.id} className={`model-card ${answer.lessonId ? 'taught' : 'beyond'}`}>
                <button type="button" onClick={() => onPick(answer.id)}>
                  {answer.model}
                </button>
                <span className="model-card-when">{answer.when}</span>
                <span className="model-card-tags">
                  <span className={`model-badge ${answer.lessonId ? 'taught' : 'beyond'}`}>
                    {answer.lessonId ? `Taught, lesson ${answer.lessonId}` : 'Beyond the course'}
                  </span>
                  {packagesMissingHere(answer).length > 0 && <span className="model-badge rstudio">Needs RStudio</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function ModelChooser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [path, setPath] = useState<string[]>(() => pathTo(searchParams.get('model') ?? '') ?? []);
  const { node } = follow(path);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set by every control that replaces the button that was clicked, so focus
  // would otherwise fall to <body>. Never set on mount, so landing on the page
  // does not steal focus (also under StrictMode's double effect run).
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    headingRef.current?.focus();
  }, [path]);

  function go(next: string[]) {
    moveFocus.current = true;
    setPath(next);
    const reached = follow(next).node;
    setSearchParams(reached.kind === 'answer' ? { model: reached.id } : {}, { replace: true });
  }

  function pick(id: string) {
    go(pathTo(id) ?? []);
  }

  return (
    <div className="model-chooser">
      <h1>Which model should I use?</h1>
      <p>
        Work down from the question you want your data to answer. Almost every analysis in this course is one of three
        models, lm(), lmer() or glm(), and the chain is always the same: question, assumptions, choice of model,
        computation, interpretation, report. The chooser also covers methods beyond the course, and says so.
      </p>
      <p className="model-chooser-legend">
        The code uses placeholder names: d is your data frame, and outcome, predictor and group are its columns. Replace
        them with yours.
      </p>

      {path.length > 0 && (
        <nav className="model-chooser-trail" aria-label="Your answers so far">
          <ol>
            {path.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
          <div className="model-chooser-trail-actions">
            <button type="button" onClick={() => go(path.slice(0, -1))}>
              Back
            </button>
            <button type="button" onClick={() => go([])}>
              Start over
            </button>
          </div>
        </nav>
      )}

      {node.kind === 'question' ? (
        <>
          <p className="model-chooser-step">Question {path.length + 1}</p>
          <h2 ref={headingRef} tabIndex={-1}>
            {node.text}
          </h2>
          {node.help && <p className="model-chooser-help">{node.help}</p>}
          <ul className="model-chooser-options">
            {node.options.map((option) => (
              <li key={option.label}>
                <button type="button" onClick={() => go([...path, option.label])}>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="model-chooser-answer">
          <h2 ref={headingRef} tabIndex={-1}>
            {node.model}
          </h2>
          <AnswerCard answer={node} />
        </div>
      )}

      <Index onPick={pick} />
    </div>
  );
}
