<h1 align="center">StatLab</h1>

<p align="center">
  <strong>Hands-on data analysis in R, running entirely in the browser.</strong><br>
  Built for psychology and business students at the University of Twente.<br>
  Made by dr. P.J.H. Slijkhuis and dr. V.d.C. Resendez Gomez, based on materials provided by dr. S.J. Watson.
</p>

<p align="center">
  <a href="https://peterslijkhuis.github.io/statlab/"><strong>Open StatLab</strong></a>
  &nbsp;·&nbsp;
  <a href="#a-look-inside">Screenshots</a>
  &nbsp;·&nbsp;
  <a href="#whats-in-the-course">The course</a>
  &nbsp;·&nbsp;
  <a href="#run-it-locally">Run it locally</a>
  &nbsp;·&nbsp;
  <a href="#credits">Credits</a>
  &nbsp;·&nbsp;
  <a href="docs/specs/2026-09-14-statlab-r-statistics-webapp-design.md">Design spec</a>
</p>

<p align="center">
  <a href="https://github.com/PeterSlijkhuis/statlab/actions/workflows/deploy.yml"><img alt="Deploy status" src="https://github.com/PeterSlijkhuis/statlab/actions/workflows/deploy.yml/badge.svg?branch=main"></a>
  <img alt="webR version" src="https://img.shields.io/github/package-json/dependency-version/PeterSlijkhuis/statlab/webr?label=webR&logo=r&logoColor=white&color=276DC3">
  <img alt="React 18 and TypeScript" src="https://img.shields.io/badge/React_18-TypeScript-3178C6?logo=typescript&logoColor=white">
</p>

StatLab teaches data analysis with R, from reading a first data file to
fitting linear, mixed and logistic models. All the R code runs in the student's
browser via [webR](https://docs.r-wasm.org/webr/latest/). A student reads a
lesson, commits to a prediction, edits and runs R, and has their answers checked
on the spot. They can also upload their own CSV or Excel file and analyse it in
the same place. There is nothing to install, no backend, no account, and no data
leaves the student's machine.

The statistics is taught the way the course team's own R workshops teach it: in
tidyverse style, and through the linear model. `lm`, `lmer` and `glm` do the
work, and the t-test, ANOVA and chi-square appear as those same models under
their traditional names.

<p align="center">
  <img src="docs/screenshots/home.png" alt="The StatLab home page: a blue banner reading 'Data analysis and statistics in R for psychology and business students', a 37% progress ring, tiles for a 7-day streak, 600 points, 17 of 46 lessons and 26 of 67 exercises, and the module list in the sidebar." width="100%">
</p>

## A look inside

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/lesson-code.png" alt="A lesson on reading data: an editable R block that reads workplace.csv and prints nrow, ncol and the column names, with the output below it, then a head() block showing the first rows of the table."></td>
    <td width="50%"><img src="docs/screenshots/exercise-checked.png" alt="An exercise asking for a relative path to survey.csv inside the survey-analysis project. The answer data/survey.csv has been checked in R and a green panel explains why it is correct."></td>
  </tr>
  <tr>
    <td align="center"><sub>Every code block is real R: edit it, run it, read the output.</sub></td>
    <td align="center"><sub>Exercises are checked in R, with feedback on the specific mistake.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/workspace-own-data.png" alt="The R Workspace laid out like RStudio: a Source pane with a script that reads an uploaded my_survey.csv and fits lm(score ~ condition), the Console showing the coefficient table, the Environment listing my_survey and model, and the Files pane listing the uploaded file next to the course datasets."></td>
    <td width="50%"><img src="docs/screenshots/model-chooser.png" alt="The 'Which model should I use?' guide after three choices, recommending multiple linear regression with the lm() code, what to check first, and a link to the lesson."></td>
  </tr>
  <tr>
    <td align="center"><sub>The R Workspace works like RStudio, with your own uploaded data.</sub></td>
    <td align="center"><sub>"Which model should I use?" walks from the question to lm, lmer or glm.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/simulation-clt.png" alt="The Central Limit Theorem simulation: a strongly skewed population above, and below it 2000 sample means with n = 30 forming a near-normal histogram."></td>
    <td width="50%"><img src="docs/screenshots/simulation-power.png" alt="The p-value and power simulation: 4000 simulated differences under the null with the tails beyond the observed difference shaded red, giving p = 0.553."></td>
  </tr>
  <tr>
    <td align="center"><sub>Module 6: skewed data, and means that still come out normal.</sub></td>
    <td align="center"><sub>Module 8: what a p-value is, drawn from four thousand studies.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/images/least-squares.png" alt="The least-squares simulation: a scatter of points, a line the student drags with intercept and slope sliders, and orange squares showing each squared residual."></td>
    <td width="50%"><img src="docs/images/confidence-intervals.png" alt="The confidence interval simulation: a hundred intervals drawn from repeated samples, with the ones that miss the true mean shown in red."></td>
  </tr>
  <tr>
    <td align="center"><sub>Module 9: drag a line and watch the squared residuals shrink.</sub></td>
    <td align="center"><sub>Module 7: what "95% confidence" means across a hundred samples.</sub></td>
  </tr>
</table>

<img align="right" width="220" src="docs/screenshots/mobile-home.png" alt="StatLab on a phone: the same banner, progress tiles in a two-by-two grid, and a Lessons button that opens the module list.">

It works on a phone too. The sidebar folds into a **Lessons** button, and the
streak, points and progress tiles stack into a grid.

Progress, streaks and points are kept in the browser, and can be exported to a
file and imported on another computer.

<br clear="right">

## What's in the course

**15 modules, 46 lessons, 67 checked exercises and 6 interactive simulations**,
in three parts. Module 0 comes first and sets students up for R on their own
computer.

| | Module | What it covers | Simulation |
|---|---|---|---|
| **Foundations** | | | |
| 0 | Before you start | RStudio Projects, files, folders and paths, and what R's symbols mean, with a cheat sheet | |
| 1 | First steps in R | Objects, functions, help, packages and `library()` | |
| 2 | Working with data | `read.csv`, factors, the pipe, `select`, `filter`, `mutate`, wide and long data | |
| 3 | Describing data | `group_by` and `summarise`, mean versus median, surprises in a summary | |
| 4 | Visualising data | ggplot2 as layers, facets, and an APA-ready figure | |
| **Inference** | | | |
| 5 | The normal distribution | Density, z-scores and probabilities | Distribution |
| 6 | Sampling | Sampling error, sampling distributions, the Central Limit Theorem | Central Limit Theorem |
| 7 | Estimation | Standard errors, confidence intervals, SD, SE and CI error bars | Confidence intervals |
| 8 | Hypothesis testing | Null distributions, p-values, Type I and II errors, power | p-values and power |
| **The linear model** | | | |
| 9 | Correlation and simple regression | `lm(y ~ x)`, reading model output with `tidy()` and `glance()` | Correlation, least squares |
| 10 | Multiple regression | Several predictors, each slope holding the others constant, reporting R² and F | |
| 11 | Categorical predictors | The t-test as `lm`, dummy coding, `emmeans` pairwise comparisons | |
| 12 | Interactions and factorial designs | `a * b`, sum-to-zero contrasts, Type III tests with `car`, interaction plots | |
| 13 | Repeated measures and nested data | `lmer` with `(1 \| id)`, fixed and random effects, the paired t-test | |
| 14 | Binary outcomes | `glm(..., family = binomial)`, log odds, odds ratios and reporting | |

Each lesson is written in MDX from a small set of blocks:

- **Predict** asks the student to commit to an answer before the code or
  simulation that settles it.
- **CodeBlock** is an editable R editor with console output, warnings, errors
  and plots.
- **Exercise** is a task whose answer is checked in R.
- **Quiz** is a conceptual multiple-choice question with an explanation.
- **Interpret** closes inferential lessons: pick the right reading of the output
  and the right APA-style sentence.
- **Simulation** embeds one of the six simulations.

Alongside the lessons there is an **R Workspace** at `/workspace` (the old
`/playground` address redirects there) and a **"Which model should I use?"**
guide at `/which-model` (the old `/which-test` address redirects there), which
walks from the design of a study to `lm`, `lmer` or `glm` and links to the
lesson that covers each case.

The R Workspace has RStudio's panes, so a student without R on their own
computer, on a Chromebook for example, can do a whole analysis in it: several
script tabs kept in the browser, their own uploaded data, and Download for
anything R writes. `install.packages()` and `library()` fetch any package from
webR's repository (most of CRAN, built for the browser), the Packages pane lists
recommended packages and the few that cannot run in a browser, and the script
editor has RStudio's Tab completion and shortcuts.

Progress is kept in the browser's `localStorage` and can be exported and
imported as JSON from the home page.

Two fictional, generated datasets carry the course: a population of 5000
students (`wellbeing-population.csv`) for the sampling modules, and a workplace
study of 480 employees (`workplace.csv`) built so that every model in the
linear-model part has a real effect to find.

## Credits

StatLab was made by **dr. P.J.H. Slijkhuis** and **dr. V.d.C. Resendez Gomez**,
based on materials provided by **dr. S.J. Watson**.

<p>
  <a href="https://www.utwente.nl/en/"><img src="src/assets/logos/utwente.png" alt="University of Twente" height="56"></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://bmslab.utwente.nl/"><img src="src/assets/logos/bmslab.png" alt="The BMS Lab" height="56"></a>
</p>

It is a project of the [University of Twente](https://www.utwente.nl/en/) and
[The BMS Lab](https://bmslab.utwente.nl/). The same credit shows at the foot of
the sidebar on every page of the site and at the bottom of the home page. The
partner logos are in `src/assets/logos/`, picked up by file name;
see the README there to replace one.
