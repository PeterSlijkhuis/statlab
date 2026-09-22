import ChoiceBlock, { type Choice } from './ChoiceBlock';

export default function Predict(props: { id: string; question: string; choices: Choice[] }) {
  return <ChoiceBlock {...props} kind="predict" />;
}
