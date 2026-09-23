// @vitest-environment node
import { WebR, type RCharacter } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createLessonEnv, destroyEnv } from '../r/environments';
import { evaluateR } from '../r/evaluate';
import { ensurePackages, installCoursePackages, ON_DEMAND_PACKAGES } from '../r/session';
import { allAnswers, packagesMissingHere } from './modelTree';

/**
 * Every snippet in the model chooser, run in real R against data made to fit
 * it. A snippet that runs in the R Workspace runs here with exactly the
 * packages the R Workspace has. A snippet marked "Needs RStudio" runs too,
 * after installing the packages it names, so its code is checked even though
 * students run it elsewhere.
 */

/** Two-factor questionnaire items: each factor drives its items plus noise. */
const ITEMS = `make_items <- function(n, factors, per_factor, prefix = "item") {
  f <- matrix(rnorm(n * factors), n, factors)
  out <- list()
  for (k in seq_len(factors)) for (j in seq_len(per_factor)) {
    out[[paste0(prefix, (k - 1) * per_factor + j)]] <- 0.8 * f[, k] + rnorm(n, sd = 0.6)
  }
  as.data.frame(out)
}`;

/** R that creates the d (and long_d) each snippet expects. */
const FIXTURES: Record<string, string> = {
  'mean-vs-value': `d <- data.frame(outcome = rnorm(40, 72, 8))`,
  'simple-regression': `d <- data.frame(predictor = rnorm(60))
d$outcome <- 2 + 0.5 * d$predictor + rnorm(60)`,
  'multiple-regression': `d <- data.frame(predictor1 = rnorm(80), predictor2 = rnorm(80))
d$outcome <- 1 + 0.4 * d$predictor1 - 0.3 * d$predictor2 + rnorm(80)`,
  'curved-relationship': `d <- data.frame(predictor = runif(80, 0, 10))
d$outcome <- 2 + d$predictor - 0.1 * d$predictor^2 + rnorm(80)`,
  'continuous-moderation': `d <- data.frame(predictor = rnorm(120, 5), moderator = rnorm(120, 3))
d$outcome <- 1 + 0.5 * d$predictor + 0.2 * d$moderator + 0.3 * d$predictor * d$moderator + rnorm(120)`,
  'two-groups': `d <- data.frame(group = factor(rep(c("control", "treatment"), each = 30)))
d$outcome <- rnorm(60, ifelse(d$group == "treatment", 12, 10), 2)`,
  'several-groups': `d <- data.frame(group = factor(rep(c("a", "b", "c"), each = 25)))
d$outcome <- rnorm(75, c(a = 10, b = 11, c = 13)[as.character(d$group)], 2)`,
  'groups-with-covariate': `d <- data.frame(group = factor(rep(c("a", "b", "c"), each = 25)), covariate = rnorm(75, 50, 10))
d$outcome <- 0.3 * d$covariate + c(a = 0, b = 1, c = 3)[as.character(d$group)] + rnorm(75)`,
  factorial: `d <- expand.grid(factor1 = c("no", "yes"), factor2 = c("no", "yes"), rep = 1:20)
d$factor1 <- factor(d$factor1)
d$factor2 <- factor(d$factor2)
d$outcome <- rnorm(nrow(d), 10 + (d$factor1 == "yes") + (d$factor2 == "yes") + 2 * (d$factor1 == "yes") * (d$factor2 == "yes"), 2)`,
  'several-outcomes': `d <- data.frame(group = factor(rep(c("a", "b", "c"), each = 30)))
shift <- c(a = 0, b = 0.5, c = 1)[as.character(d$group)]
common <- rnorm(90)
d$outcome1 <- shift + common + rnorm(90)
d$outcome2 <- shift + common + rnorm(90)
d$outcome3 <- common + rnorm(90)`,
  'before-after': `d <- data.frame(id = 1:40, before = rnorm(40, 50, 10))
d$after <- d$before + rnorm(40, 3, 4)`,
  'repeated-measures': `d <- data.frame(id = 1:40, time1 = rnorm(40, 50, 10))
d$time2 <- d$time1 + rnorm(40, 2, 4)
d$time3 <- d$time1 + rnorm(40, 4, 4)`,
  'time-by-group': `long_d <- expand.grid(id = 1:60, time = c("before", "after"))
long_d$group <- ifelse(long_d$id <= 30, "control", "treatment")
person <- rnorm(60, 0, 3)
long_d$score <- 50 + person[long_d$id] + 4 * (long_d$time == "after" & long_d$group == "treatment") + rnorm(nrow(long_d), 0, 2)
long_d$time <- factor(long_d$time, levels = c("before", "after"))
long_d$group <- factor(long_d$group)`,
  'growth-curve': `long_d <- expand.grid(id = 1:60, time = 0:4)
start <- rnorm(60, 50, 5)
rate <- rnorm(60, 2, 1)
long_d$score <- start[long_d$id] + rate[long_d$id] * long_d$time + rnorm(nrow(long_d), 0, 1)`,
  'crossed-random-effects': `long_d <- expand.grid(participant = 1:30, item = 1:20)
long_d$condition <- factor(ifelse(long_d$item %% 2 == 0, "easy", "hard"))
long_d$outcome <- 600 + 40 * (long_d$condition == "hard") + rnorm(30, 0, 50)[long_d$participant] +
  rnorm(20, 0, 30)[long_d$item] + rnorm(nrow(long_d), 0, 40)`,
  'nested-groups': `d <- data.frame(site = factor(rep(1:20, each = 15)), predictor = rnorm(300))
d$outcome <- 5 + 0.4 * d$predictor + rnorm(20)[d$site] + rnorm(300)`,
  'logistic-regression': `d <- data.frame(predictor = rnorm(200))
d$outcome <- rbinom(200, 1, plogis(-0.5 + 0.8 * d$predictor))`,
  'cross-table': `d <- data.frame(predictor = factor(sample(c("sales", "support", "tech"), 200, replace = TRUE)))
d$outcome <- factor(ifelse(runif(200) < ifelse(d$predictor == "tech", 0.4, 0.2), "left", "stayed"))`,
  'proportion-vs-value': `d <- data.frame(outcome = sample(c("yes", "no"), 80, replace = TRUE, prob = c(0.6, 0.4)))`,
  'repeated-binary': `long_d <- expand.grid(id = 1:100, time = c("t1", "t2", "t3"))
long_d$time <- factor(long_d$time)
person <- rnorm(100, 0, 1)
long_d$outcome <- rbinom(nrow(long_d), 1, plogis(-0.5 + 0.5 * as.numeric(long_d$time) + person[long_d$id]))`,
  'successes-of-trials': `d <- data.frame(predictor = rnorm(50), trials = 10)
d$correct <- rbinom(50, d$trials, plogis(0.3 + 0.7 * d$predictor))`,
  'ordinal-regression': `d <- data.frame(predictor = rnorm(200))
latent <- 0.8 * d$predictor + rlogis(200)
d$outcome <- as.character(cut(latent, c(-Inf, -0.5, 0.8, Inf), labels = c("low", "medium", "high")))`,
  'multinomial-regression': `d <- data.frame(predictor = rnorm(300))
p_bus <- exp(0.5 * d$predictor)
p_walk <- exp(-0.5 * d$predictor)
total <- 1 + p_bus + p_walk
d$outcome <- sapply(seq_len(300), function(i) sample(c("bike", "bus", "walk"), 1, prob = c(1, p_bus[i], p_walk[i]) / total[i]))`,
  'goodness-of-fit': `d <- data.frame(outcome = sample(c("a", "b", "c"), 120, replace = TRUE, prob = c(0.5, 0.3, 0.2)))`,
  'poisson-regression': `d <- data.frame(predictor = rnorm(150))
d$count <- rpois(150, exp(0.5 + 0.4 * d$predictor))`,
  'negative-binomial': `d <- data.frame(predictor = rnorm(200))
d$count <- rnbinom(200, mu = exp(1 + 0.4 * d$predictor), size = 1.5)`,
  'zero-inflated': `d <- data.frame(predictor = rnorm(300))
never <- runif(300) < plogis(-0.5 + 0.8 * d$predictor)
d$count <- ifelse(never, 0, rnbinom(300, mu = exp(1 + 0.3 * d$predictor), size = 2))`,
  'survival-curves': `d <- data.frame(group = factor(rep(c("a", "b"), each = 60)))
event_time <- rexp(120, ifelse(d$group == "b", 0.15, 0.08))
censor_time <- runif(120, 5, 25)
d$time <- pmin(event_time, censor_time)
d$event <- as.numeric(event_time <= censor_time)`,
  'cox-regression': `d <- data.frame(group = factor(rep(c("a", "b"), each = 80)), predictor = rnorm(160))
event_time <- rexp(160, 0.1 * exp(0.4 * d$predictor + 0.5 * (d$group == "b")))
censor_time <- runif(160, 5, 25)
d$time <- pmin(event_time, censor_time)
d$event <- as.numeric(event_time <= censor_time)`,
  mediation: `d <- data.frame(predictor = rnorm(200))
d$mediator <- 0.5 * d$predictor + rnorm(200)
d$outcome <- 0.4 * d$mediator + 0.2 * d$predictor + rnorm(200)`,
  'scale-reliability': `${ITEMS}
d <- make_items(200, 1, 5)`,
  'confirmatory-factors': `${ITEMS}
d <- make_items(300, 2, 3)`,
  'structural-equation-model': `${ITEMS}
x <- make_items(300, 1, 3, "x")
y <- make_items(300, 1, 3, "y")
d <- cbind(x, y)
d$covariate <- rnorm(300)
d[c("y1", "y2", "y3")] <- d[c("y1", "y2", "y3")] + 0.5 * rowMeans(d[c("x1", "x2", "x3")])`,
  'principal-components': `${ITEMS}
d <- make_items(150, 2, 3)`,
  'exploratory-factors': `${ITEMS}
d <- make_items(300, 3, 3)`,
  'cluster-analysis': `centres <- rep(c(-2, 0, 2), each = 40)
d <- data.frame(a = centres + rnorm(120, sd = 0.5), b = -centres + rnorm(120, sd = 0.5), c = rnorm(120))`,
  'forecast-series': `d <- data.frame(value = 100 + as.numeric(arima.sim(list(ar = 0.6), n = 60)))`,
  'interrupted-time-series': `d <- data.frame(time = 1:48)
d$value <- 20 + 0.2 * d$time + ifelse(d$time >= 25, 3 + 0.3 * (d$time - 25), 0) + rnorm(48)`,
  lasso: `d <- as.data.frame(matrix(rnorm(100 * 20), 100, 20))
d$outcome <- 2 * d$V1 - 1.5 * d$V2 + d$V3 + rnorm(100)`,
  'random-forest': `d <- as.data.frame(matrix(rnorm(200 * 6), 200, 6))
d$outcome <- sin(d$V1) + d$V2^2 + rnorm(200, sd = 0.3)`,
};

/**
 * Keeps the bootstrap in the mediation snippet short enough for a test run.
 * The number of resamples changes the intervals' precision, not whether the
 * code works.
 */
/**
 * WebAssembly R cannot count CPU cores, so parallel::detectCores() returns NA
 * and lavaan's option check stops on it. The shim runs before library(lavaan),
 * so lavaan sees the patched function however it imports it. A desktop R, where students run
 * lavaan, returns a number, so the snippet itself needs nothing.
 */
const LAVAAN_SHIM = `if (is.na(parallel::detectCores())) local({
  ns <- asNamespace("parallel")
  unlockBinding("detectCores", ns)
  assign("detectCores", function(...) 1L, envir = ns)
  lockBinding("detectCores", ns)
})
`;

function forTest(rCode: string): string {
  const shim = /library\(lavaan\)/.test(rCode) ? LAVAAN_SHIM : '';
  return shim + rCode.replace('bootstrap = 1000', 'bootstrap = 50');
}

/**
 * Detaches every package attached since boot. Each snippet should run as it
 * would in a fresh session: MASS, attached by an earlier snippet, masks
 * dplyr's select() and would break later ones for a reason no student sees.
 */
const DETACH_ADDED = (boot: string[]) => `for (name in setdiff(search(), c(${boot.map((name) => JSON.stringify(name)).join(', ')}))) {
  if (startsWith(name, "package:")) detach(name, character.only = TRUE)
}`;

/** On failure, the calls that led to the error, so a CI log says where it came from. */
function traced(code: string): string {
  return `withCallingHandlers({
${code}
}, error = function(e) {
  calls <- vapply(sys.calls(), function(call) paste(deparse(call, nlines = 1L), collapse = ""), "")
  cat("CALLS:", paste(tail(calls, 12), collapse = "\n  <- "), "\n")
})`;
}

let webR: WebR;
/** search() at boot, before any package is attached. */
let bootSearch: string[];

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  const search = await webR.evalR('search()');
  bootSearch = (await (search as RCharacter).toArray()) as string[];
  await webR.destroy(search);
  // What the R Workspace has: the core set at boot, the rest on demand.
  await installCoursePackages(webR);
  await ensurePackages(webR, ON_DEMAND_PACKAGES);
}, 1_800_000);

afterAll(async () => {
  await webR.close();
});

const ANSWERS = allAnswers().map((entry) => entry.answer);

test('every answer has a fixture, and every fixture an answer', () => {
  expect(Object.keys(FIXTURES).sort()).toEqual(ANSWERS.map((answer) => answer.id).sort());
});

describe.each(ANSWERS.map((answer) => [answer.id, answer] as const))('%s', (id, answer) => {
  test('runs without an error in real R', async () => {
    const missing = packagesMissingHere(answer);
    if (missing.length) await ensurePackages(webR, missing);
    await webR.evalRVoid(DETACH_ADDED(bootSearch));
    const env = await createLessonEnv(webR);
    try {
      const code = `set.seed(1)\n${FIXTURES[id]}\n${forTest(answer.rCode)}`;
      const result = await evaluateR(webR, code, { env });
      const errors = result.output.filter((line) => line.type === 'error').map((line) => line.data);
      let log = result.output.map((line) => line.data).join('\n');
      if (errors.length) {
        const rerun = await evaluateR(webR, traced(code), { env });
        log += `\n--- traced rerun ---\n${rerun.output.map((line) => line.data).join('\n')}`;
      }
      expect(errors, `${id}:\n${log}`).toEqual([]);
    } finally {
      await destroyEnv(webR, env);
    }
  }, 600_000);
});
