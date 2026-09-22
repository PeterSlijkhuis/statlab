import ChoiceBlock, { type Choice } from './ChoiceBlock';

export default function Quiz(props: { id: string; question: string; choices: Choice[] }) {
  return <ChoiceBlock {...props} kind="quiz" />;
}
