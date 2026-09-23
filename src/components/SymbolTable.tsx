import './Primer.css';

export type SymbolRow = {
  /** Each symbol as typed. content.test.ts checks every one is taught in Module 0. */
  symbols: string[];
  /** How to say it out loud. */
  read: string;
  meaning: string;
  example: string;
};

export const SYMBOLS: SymbolRow[] = [
  { symbols: ['<-'], read: 'gets', meaning: 'Store the value on the right under the name on the left.', example: 'marks <- c(68, 74, 59)' },
  { symbols: ['='], read: 'is set to', meaning: 'Give an argument its value, inside a function call.', example: 'mean(x, na.rm = TRUE)' },
  { symbols: ['#'], read: 'comment', meaning: 'R ignores the rest of the line. It is a note for people.', example: '# weekly pay, before tax' },
  { symbols: ['"'], read: 'quote', meaning: 'Text, as opposed to the name of an object.', example: '"Sales"' },
  { symbols: ['+', '-', '*', '/', '^'], read: 'plus, minus, times, divided by, to the power', meaning: 'Arithmetic, applied to every element of a vector.', example: 'marks / 90 * 100' },
  { symbols: ['=='], read: 'is equal to?', meaning: 'A question with a TRUE or FALSE answer. Not the same as =.', example: 'hours == 40' },
  { symbols: ['!='], read: 'is not equal to?', meaning: 'TRUE where the two sides differ.', example: 'dept != "Sales"' },
  { symbols: ['<', '>', '<=', '>='], read: 'less, more, at most, at least', meaning: 'Comparisons, one answer per element.', example: 'age >= 18' },
  { symbols: ['&'], read: 'and', meaning: 'TRUE only where both conditions are TRUE.', example: 'age >= 20 & age <= 29' },
  { symbols: ['|'], read: 'or', meaning: 'TRUE where at least one condition is TRUE.', example: 'dept == "Sales" | dept == "Support"' },
  { symbols: ['!'], read: 'not', meaning: 'Turns TRUE into FALSE and back.', example: '!is.na(scores)' },
  { symbols: ['%in%'], read: 'is one of', meaning: 'TRUE where the value appears anywhere in the list on the right.', example: 'dept %in% c("Sales", "Support")' },
  { symbols: ['NA'], read: 'not available', meaning: 'A missing value. Anything computed from it is also NA.', example: 'mean(x, na.rm = TRUE)' },
  { symbols: ['( )'], read: 'call', meaning: 'Run a function on what is inside, or group arithmetic.', example: 'round((a + b) / 2, 1)' },
  { symbols: ['c()'], read: 'combine', meaning: 'Put several values into one vector.', example: 'c(4, 8, 15)' },
  { symbols: [':'], read: 'to', meaning: 'Every whole number from the left to the right.', example: '1:5' },
  { symbols: ['[ ]'], read: 'element', meaning: 'Pick elements by position or by a TRUE/FALSE condition.', example: 'marks[marks > 70]' },
  { symbols: ['[[ ]]'], read: 'the one element', meaning: 'Pull out exactly one element, such as one column.', example: 'team[["hours"]]' },
  { symbols: ['$'], read: 'column', meaning: 'One column of a data frame, by name.', example: 'team$hours' },
  { symbols: ['{ }'], read: 'block', meaning: 'Group several lines into one, as in a function body.', example: 'function(x) { x * 2 }' },
  { symbols: ['::'], read: 'from package', meaning: 'Use one function from a package without attaching it.', example: 'dplyr::filter()' },
  { symbols: ['|>'], read: 'and then', meaning: 'Pass the left side in as the first argument of the right side. Built into R.', example: 'scores |> mean()' },
  { symbols: ['%>%'], read: 'and then', meaning: 'The same idea from dplyr. This course uses it after library(dplyr).', example: 'team %>% filter(hours > 35)' },
  { symbols: ['~'], read: 'is modelled by', meaning: 'Builds a formula: the outcome on the left, predictors on the right.', example: 'lm(wellbeing ~ workload)' },
];

/** Every symbol in Module 0 in one place, for students to come back to. */
export default function SymbolTable() {
  return (
    <table className="symbol-table">
      <thead>
        <tr>
          <th scope="col">Symbol</th>
          <th scope="col">Say it as</th>
          <th scope="col">What it does</th>
          <th scope="col">Example</th>
        </tr>
      </thead>
      <tbody>
        {SYMBOLS.map((row) => (
          <tr key={row.symbols.join(' ')}>
            <td>
              {row.symbols.map((symbol, index) => (
                <span key={symbol}>{index > 0 && ' '}<code>{symbol}</code></span>
              ))}
            </td>
            <td>{row.read}</td>
            <td>{row.meaning}</td>
            <td><code>{row.example}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
