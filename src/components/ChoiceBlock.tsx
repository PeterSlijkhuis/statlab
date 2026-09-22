import { useState } from 'react';
import { useLesson } from '../content/LessonContext';
import { markQuiz } from '../state/progress';
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
      <p className="choice-label">{LABELS[kind]}</p>
      <p className="choice-question">{question}</p>
      <ul className="choice-options">
        {choices.map((choice, index) => (
          <li key={choice.text}>
            <button
              type="button"
              onClick={() => choose(index)}
              disabled={chosen !== null}
              className={chosen === index ? 'chosen' : undefined}
            >
              {choice.text}
            </button>
          </li>
        ))}
      </ul>
      {selection && (
        <div className={`choice-response ${selection.correct ? 'right' : 'wrong'}`}>
          {kind !== 'predict' && <strong>{selection.correct ? 'Correct. ' : 'Not quite. '}</strong>}
          {selection.response}
        </div>
      )}
    </section>
  );
}
