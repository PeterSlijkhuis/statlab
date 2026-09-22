import { useState } from 'react';
import { useLesson } from '../content/LessonContext';
import { markQuiz } from '../state/progress';
import { POINTS } from '../state/stats';
import './ChoiceBlock.css';

export type Choice = {
  text: string;
  correct?: boolean;
  response: string;
};

export type ChoiceKind = 'predict' | 'quiz' | 'interpret';

type Props = {
  id: string;
  kind: ChoiceKind;
  question: string;
  choices: Choice[];
};

const LABELS: Record<ChoiceKind, string> = {
  predict: 'Predict first',
  quiz: 'Check your understanding',
  interpret: 'Interpret and report',
};

const ICONS: Record<ChoiceKind, string> = { predict: '🔮', quiz: '💡', interpret: '📝' };

export default function ChoiceBlock({ id, kind, question, choices }: Props) {
  const { lessonId } = useLesson();
  const [chosen, setChosen] = useState<number | null>(null);

  function choose(index: number) {
    if (chosen !== null) return;
    setChosen(index);
    // Predictions are deliberately not scored: commitment, not assessment.
    if (kind !== 'predict') markQuiz(lessonId, id, choices[index].correct === true);
  }

  const selection = chosen === null ? null : choices[chosen];

  return (
    <section className={`choice-block choice-${kind}`}>
      <p className="choice-label"><span aria-hidden="true">{ICONS[kind]}</span> {LABELS[kind]}</p>
      <p className="choice-question">{question}</p>
      <ul className="choice-options">
        {choices.map((choice, index) => (
          <li key={choice.text}>
            <button
              type="button"
              onClick={() => choose(index)}
              disabled={chosen !== null}
              className={[
                chosen === index ? 'chosen' : '',
                // After answering, the right option lights up too, so a wrong
                // pick still ends on the correct answer in view.
                chosen !== null && kind !== 'predict' && choice.correct ? 'is-correct' : '',
                chosen === index && kind !== 'predict' && !choice.correct ? 'is-wrong' : '',
              ].filter(Boolean).join(' ') || undefined}
            >
              <span className="choice-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              <span className="choice-text">{choice.text}</span>
            </button>
          </li>
        ))}
      </ul>
      {selection && (
        <div className={`choice-response ${selection.correct ? 'right' : 'wrong'}`}>
          {kind !== 'predict' && <strong>{selection.correct ? 'Correct. ' : 'Not quite. '}</strong>}
          {selection.response}
          {kind !== 'predict' && selection.correct && <span className="points-pop" aria-hidden="true">+{POINTS.quiz}</span>}
        </div>
      )}
    </section>
  );
}
