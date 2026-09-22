import { describe, expect, test } from 'vitest';
import { ALL_EXERCISES, getExercise } from './index';
import { ALL_LESSONS } from '../manifest';

describe('exercise definitions', () => {
  test('ids are unique', () => {
    const ids = ALL_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every exercise carries at least one wrong answer', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.wrongAnswers.length, `${exercise.id} has no wrong answers`).toBeGreaterThan(0);
    }
  });

  test('every exercise carries at least one hint and a solution', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.hints.length, `${exercise.id} has no hints`).toBeGreaterThan(0);
      expect(exercise.solution.trim().length, `${exercise.id} has no solution`).toBeGreaterThan(0);
    }
  });

  test('no exercise uses a function that hangs on the PostMessage channel', () => {
    const forbidden = /\b(readline|scan|menu|browser)\s*\(/;
    for (const exercise of ALL_EXERCISES) {
      const sources = [
        exercise.starterCode,
        exercise.setupCode ?? '',
        exercise.solution,
        exercise.check,
        // The validator runs these in real R too, so a blocking call in one of
        // them hangs CI until the job times out rather than failing it here.
        ...exercise.wrongAnswers,
        ...(exercise.alternateSolutions ?? []),
      ];
      for (const source of sources) {
        expect(forbidden.test(source), `${exercise.id} uses a blocking function`).toBe(false);
      }
    }
  });

  test('every defined exercise can be looked up, and unknown ids return undefined', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(getExercise(exercise.id)).toBe(exercise);
    }
    expect(getExercise('no-such-exercise')).toBeUndefined();
  });

  test('every exercise belongs to a lesson, and every lesson exercise is defined', () => {
    // An orphan is never shown to a student, so nothing else would notice it.
    const inLessons = new Set(ALL_LESSONS.flatMap((lesson) => lesson.exercises));
    expect([...inLessons].sort(), 'manifest lesson exercises and ALL_EXERCISES disagree').toEqual(ALL_EXERCISES.map((exercise) => exercise.id).sort());
  });

  test('checks read student objects only through has_answer() and answer()', () => {
    // exists()/get() inherit from the lesson environment, where lesson code has
    // already created the objects an exercise asks for (spec §5.1).
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.check, `${exercise.id} calls exists(), get() or get0() directly`).not.toMatch(
        /\b(exists|get|get0)\s*\(/,
      );
    }
  });

  test('Module 6 defines its exercises', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThanOrEqual(3);
  });
});

/**
 * Every `all.equal(...)` call in `check`, with its arguments intact. Written by
 * hand because the obvious regex cannot match nested parentheses, and R checks
 * are full of them: abs(), coef(), as.vector().
 */
function allEqualCalls(check: string): string[] {
  const calls: string[] = [];
  for (let i = check.indexOf('all.equal('); i !== -1; i = check.indexOf('all.equal(', i + 1)) {
    let depth = 0;
    for (let j = i + 'all.equal'.length; j < check.length; j += 1) {
      if (check[j] === '(') depth += 1;
      else if (check[j] === ')') {
        depth -= 1;
        if (depth === 0) {
          calls.push(check.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return calls;
}

describe('Module 9', () => {
  const module9 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m9-'));

  test('defines all five exercises', () => {
    expect(module9.map((exercise) => exercise.id)).toEqual([
      'm9-1-a', 'm9-2-a', 'm9-2-b', 'm9-3-a', 'm9-3-b',
    ]);
  });

  test('every check reads the workplace dataset rather than hard-coding its values', () => {
    // The CSV is generated (content-platform P2). A check holding a literal from
    // it silently starts failing the day the generator is reseeded.
    for (const exercise of module9) {
      expect(exercise.check, `${exercise.id}`).toContain('read.csv("data/workplace.csv"');
    }
  });

  test('every check that inspects a model verifies its class first', () => {
    for (const exercise of module9) {
      if (!/answer\("model/.test(exercise.check)) continue;
      expect(exercise.check, `${exercise.id} reads a model without an inherits() guard`)
        .toMatch(/inherits\([^,]+, "lm"\)/);
    }
  });

  test('every numeric comparison drops attributes', () => {
    // coef(m)["autonomy"] is named, summary()$coefficients[...] can be a matrix,
    // and summarise() without pull() is a one-cell tibble. All three are correct.
    //
    // Balanced rather than /all\.equal\([^)]*\)/: that regex stops at the first
    // nested close paren, so all.equal(r, abs(x), check.attributes = FALSE) is
    // read as "all.equal(r, abs(x)" and reported as missing the argument that
    // is in fact right there. It would also pass a call whose real arguments it
    // never saw, which is the worse half of the bug.
    for (const exercise of module9) {
      for (const call of allEqualCalls(exercise.check)) {
        expect(call, `${exercise.id}: ${call}`).toContain('check.attributes = FALSE');
      }
    }
  });
});

describe('Module 10', () => {
  const module10 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m10-'));

  test('defines all four exercises', () => {
    expect(module10.map((exercise) => exercise.id)).toEqual([
      'm10-1-a', 'm10-2-a', 'm10-2-b', 'm10-3-a',
    ]);
  });

  test('every solution fits a model with more than one predictor', () => {
    // A Module 10 exercise that can be answered from a simple regression is a
    // Module 9 exercise with a different id.
    for (const exercise of module10) {
      expect(exercise.solution, `${exercise.id}`).toMatch(/lm\([^)]*~[^)]*\+/);
    }
  });

  test('at least one exercise pairs a coefficient with group descriptives', () => {
    // Spec 7.1: every model lesson shows the means beside the model.
    const withMeans = module10.filter((exercise) => /group_by\(/.test(exercise.solution));
    expect(withMeans.map((exercise) => exercise.id)).toContain('m10-2-b');
  });
});

describe('Module 11', () => {
  const module11 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m11-'));

  test('defines all five exercises', () => {
    expect(module11.map((exercise) => exercise.id)).toEqual([
      'm11-1-a', 'm11-1-b', 'm11-2-a', 'm11-2-b', 'm11-3-a',
    ]);
  });

  test('the t-test equivalence exercise pools the variances', () => {
    // Welch is t.test()'s default and does not reproduce the linear model, so a
    // solution without var.equal = TRUE would be teaching the wrong equivalence.
    const equivalence = module11.find((exercise) => exercise.id === 'm11-1-b')!;
    expect(equivalence.solution).toContain('var.equal = TRUE');
    expect(equivalence.wrongAnswers.some((code) => /t\.test\([^)]*\)\$statistic/.test(code) && !code.includes('var.equal'))).toBe(true);
  });

  test('the pairwise exercise asks for a Tukey adjustment and rejects none', () => {
    const pairwise = module11.find((exercise) => exercise.id === 'm11-3-a')!;
    expect(pairwise.solution).toContain('adjust = "tukey"');
    expect(pairwise.wrongAnswers.some((code) => code.includes('adjust = "none"'))).toBe(true);
  });

  test('no check assumes a particular reference level', () => {
    // department sorts Engineering, Marketing, Sales, Support - but a check that
    // hard-codes that breaks the moment a level is renamed.
    const dummy = module11.find((exercise) => exercise.id === 'm11-2-a')!;
    expect(dummy.check).toContain('levels(d$department)[1]');
  });
});

describe('Module 12', () => {
  const module12 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m12-'));

  test('defines all four exercises', () => {
    expect(module12.map((exercise) => exercise.id)).toEqual([
      'm12-1-a', 'm12-2-a', 'm12-2-b', 'm12-3-a',
    ]);
  });

  test('the type III exercise sets sum-to-zero contrasts and rejects the fit without them', () => {
    // Without contr.sum the type III main-effect rows test simple effects. The
    // interaction row is unchanged either way, which is why the negative fixture
    // has to target a main effect.
    const typeThree = module12.find((exercise) => exercise.id === 'm12-2-b')!;
    expect(typeThree.solution).toContain('contrasts = list(training = contr.sum, mentoring = contr.sum)');
    expect(typeThree.wrongAnswers.some((code) => !code.includes('contr.sum'))).toBe(true);
    expect(typeThree.wrongAnswers.some((code) => code.includes('type = "II"'))).toBe(true);
  });

  test('the interaction exercise rejects a model fitted with a plus sign', () => {
    const interaction = module12.find((exercise) => exercise.id === 'm12-1-a')!;
    expect(interaction.solution).toMatch(/training \* mentoring/);
    expect(interaction.wrongAnswers.some((code) => /change ~ training \+ mentoring/.test(code))).toBe(true);
  });

  test('every solution builds the change score the same way', () => {
    // engagement_t1 - engagement_t2 would flip every sign in the module, so the
    // direction is what matters, not the spelling: some solutions subtract the
    // columns inside mutate() and some as d$engagement_t2 - d$engagement_t1.
    for (const exercise of module12) {
      expect(exercise.solution, `${exercise.id} does not build the change score`)
        .toMatch(/(d\$)?engagement_t2 - (d\$)?engagement_t1/);
      expect(exercise.solution, `${exercise.id} subtracts the time points the wrong way round`)
        .not.toMatch(/(d\$)?engagement_t1 - (d\$)?engagement_t2/);
    }
  });
});

describe('Module 13', () => {
  const module13 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m13-'));

  test('defines all four exercises', () => {
    expect(module13.map((exercise) => exercise.id)).toEqual([
      'm13-1-a', 'm13-2-a', 'm13-2-b', 'm13-3-a',
    ]);
  });

  test('every mixed-model check guards on merMod before reading the fit', () => {
    // An lm() on the long data is the headline wrong answer of this module, and
    // it has the same coefficient. Only the class tells them apart.
    //
    // Conditioned on the check reading the student's model rather than on the
    // solution mentioning lmer(): m13-2-b's solution fits one, but its check
    // grades three variance numbers against its own reference fit and never
    // touches the student's model object, so there is nothing to guard.
    for (const exercise of module13) {
      if (!/answer\("m_/.test(exercise.check)) continue;
      expect(exercise.check, `${exercise.id}`).toContain('inherits(m_time, "merMod")');
    }
  });

  test('the mixed-model exercises rehearse an lm as a wrong answer', () => {
    const fit = module13.find((exercise) => exercise.id === 'm13-2-a')!;
    expect(fit.wrongAnswers.some((code) => /m_time <- lm\(/.test(code))).toBe(true);
  });

  test('the paired equivalence exercise rejects the unpaired test', () => {
    const paired = module13.find((exercise) => exercise.id === 'm13-3-a')!;
    expect(paired.solution).toContain('paired = TRUE');
    expect(paired.wrongAnswers.some((code) => /t\.test\(d\$engagement_t2, d\$engagement_t1\)\$statistic/.test(code))).toBe(true);
  });

  test('the loosened tolerances carry their reason', () => {
    // Spec 5.2 allows a looser tolerance where a legitimate route differs
    // slightly, provided the check says why.
    const paired = module13.find((exercise) => exercise.id === 'm13-3-a')!;
    expect(paired.check).toMatch(/#[^\n]*REML/);
  });
});

describe('Module 14', () => {
  const module14 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m14-'));

  test('defines all four exercises', () => {
    expect(module14.map((exercise) => exercise.id)).toEqual([
      'm14-1-a', 'm14-2-a', 'm14-2-b', 'm14-3-a',
    ]);
  });

  test('every check catches a glm fitted without the binomial family', () => {
    // glm() without family = binomial runs, prints a plausible table, and is an
    // ordinary linear model. A check that reads the student's model can only
    // tell by asking family(). A check that grades numbers instead has to rule
    // the mistake out by value, by fitting the gaussian model itself and
    // recognising its answer. Both are acceptable; neither being present is not.
    for (const exercise of module14) {
      if (!/family = binomial/.test(exercise.solution)) continue;
      const guarded = /family\(/.test(exercise.check);
      const byValue = /glm\([^`]*data = d\)/.test(exercise.check);
      expect(guarded || byValue, `${exercise.id} cannot tell a gaussian fit from a logistic one`).toBe(true);
    }
  });

  test('the logistic exercises rehearse a missing family as a wrong answer', () => {
    const fit = module14.find((exercise) => exercise.id === 'm14-2-a')!;
    expect(fit.wrongAnswers.some((code) => /glm\([^)]*data = d\)/.test(code))).toBe(true);
  });

  test('the odds-ratio exercises rehearse exponentiating the wrong thing', () => {
    const ors = module14.find((exercise) => exercise.id === 'm14-2-b')!;
    const table = module14.find((exercise) => exercise.id === 'm14-3-a')!;
    expect(ors.wrongAnswers.some((code) => code.includes('Std. Error'))).toBe(true);
    expect(table.wrongAnswers.some((code) => /^(?!.*exp\().*cbind\(OR/s.test(code))).toBe(true);
  });

  test('the profile-interval tolerance carries its reason', () => {
    const table = module14.find((exercise) => exercise.id === 'm14-3-a')!;
    expect(table.check).toMatch(/#[^\n]*profile-likelihood/);
  });
});
