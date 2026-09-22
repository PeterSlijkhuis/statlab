import ChoiceBlock, { type Choice } from './ChoiceBlock';

export default function Interpret(props: { id: string; question: string; choices: Choice[] }) {
  return <ChoiceBlock {...props} kind="interpret" />;
}
