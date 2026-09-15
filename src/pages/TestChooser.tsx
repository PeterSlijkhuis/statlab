import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export type Node =
  | { kind: 'question'; text: string; options: { label: string; next: Node }[] }
  | { kind: 'answer'; test: string; rFunction: string; note: string; lessonId?: string };

export const TREE: Node = {
  kind: 'question',
  text: 'What kind of outcome are you analysing?',
  options: [
    {
      label: 'A number (score, time, rating)',
      next: {
        kind: 'question',
        text: 'How many groups or measurements are you comparing?',
        options: [
          {
            label: 'One group against a known value',
            next: {
              kind: 'answer',
              test: 'One-sample t-test',
              rFunction: 't.test(x, mu = 0)',
              note: 'Compares your sample mean against a value you specify.',
            },
          },
          {
            label: 'Two groups',
            next: {
              kind: 'question',
              text: 'Are the two sets of scores from the same people or different people?',
              options: [
                {
                  label: 'Different people',
                  next: {
                    kind: 'answer',
                    test: 'Independent-samples t-test',
                    rFunction: 't.test(outcome ~ group, data = d)',
                    note: 'Each person contributes one score to one group.',
                  },
                },
                {
                  label: 'The same people, twice',
                  next: {
                    kind: 'answer',
                    test: 'Paired-samples t-test',
                    rFunction: 't.test(before, after, paired = TRUE)',
                    note: 'Each person contributes two scores, so the scores are linked.',
                  },
                },
              ],
            },
          },
          {
            label: 'Three or more groups',
            next: {
              kind: 'answer',
              test: 'One-way ANOVA',
              rFunction: 'aov(outcome ~ group, data = d)',
              note: 'Follow a significant result with a post-hoc test such as TukeyHSD().',
            },
          },
          {
            label: 'No groups — two numbers per person',
            next: {
              kind: 'answer',
              test: 'Correlation or simple regression',
              rFunction: 'cor.test(x, y)  /  lm(y ~ x, data = d)',
              note: 'Use correlation to describe strength, regression to predict one from the other.',
            },
          },
        ],
      },
    },
    {
      label: 'A category (yes/no, choice, group membership)',
      next: {
        kind: 'question',
        text: 'How many categorical variables are involved?',
        options: [
          {
            label: 'One variable',
            next: {
              kind: 'answer',
              test: 'Chi-square goodness-of-fit test',
              rFunction: 'chisq.test(table(x))',
              note: 'Compares observed frequencies against expected proportions.',
            },
          },
          {
            label: 'Two variables',
            next: {
              kind: 'answer',
              test: 'Chi-square test of independence',
              rFunction: 'chisq.test(table(x, y))',
              note: 'Asks whether the two categorical variables are related.',
            },
          },
        ],
      },
    },
  ],
};

export default function TestChooser() {
  const [node, setNode] = useState<Node>(TREE);
  const [trail, setTrail] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set by choose() and restart(): both unmount the button that was clicked, so
  // focus would otherwise fall to <body>. Never set on mount, so landing on the
  // page does not steal focus (also under StrictMode's double effect run).
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    headingRef.current?.focus();
  }, [node]);

  function choose(label: string, next: Node) {
    moveFocus.current = true;
    setTrail((current) => [...current, label]);
    setNode(next);
  }

  function restart() {
    moveFocus.current = true;
    setTrail([]);
    setNode(TREE);
  }

  return (
    <div className="test-chooser">
      <h1>Which test should I use?</h1>
      <p>
        Work down from your research question. This is the same chain every lesson uses: question →
        assumptions → choice of test → computation → interpretation → report.
      </p>

      {trail.length > 0 && (
        <p className="test-chooser-trail">
          {trail.join(' → ')}{' '}
          <button type="button" onClick={restart} className="link-button">
            Start over
          </button>
        </p>
      )}

      {node.kind === 'question' ? (
        <>
          <h2 ref={headingRef} tabIndex={-1}>
            {node.text}
          </h2>
          <ul className="test-chooser-options">
            {node.options.map((option) => (
              <li key={option.label}>
                <button type="button" onClick={() => choose(option.label, option.next)}>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="test-chooser-answer">
          <h2 ref={headingRef} tabIndex={-1}>
            {node.test}
          </h2>
          <pre>
            <code>{node.rFunction}</code>
          </pre>
          <p>{node.note}</p>
          {node.lessonId && <Link to={`/lesson/${node.lessonId}`}>Go to the lesson</Link>}
        </div>
      )}
    </div>
  );
}
