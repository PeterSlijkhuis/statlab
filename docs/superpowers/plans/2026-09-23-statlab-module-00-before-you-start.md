# StatLab: Module 0 (Before you start) Implementation Plan

**Goal:** Add a Module 0 ahead of Module 1 that teaches what students were
missing on day one: how to set up an R project on their own computer (RStudio,
Projects, files, folders, the working directory and paths) and what R's symbols
and operators mean.

**Requested:** by the course owner on 2026-09-23: "Explain also how to set up a
R project, set the file, folder etc and students also don't know why what symbol
like operators etc. Perhaps a module 0?"

**Spec:** `docs/superpowers/specs/2026-09-14-statlab-r-statistics-webapp-design.md`
§7 now lists Module 0 in the Foundations part.

**Status (2026-09-23):** Implemented. Four lessons and six checked exercises are
live. All six exercises and every Module 0 code block that needs no package were
graded in real R locally, 48 of 48; the full validator runs in CI.

## Decisions

1. **Module 0, not Module 1 expanded.** Module 1 already has three lessons with
   frozen ids and exercises. A separate module keeps every existing lesson id,
   exercise id and saved progress valid, and lets a student who already knows
   RStudio skip it. Its id is `module-00` and its lessons are `00-1` to `00-4`,
   so the existing "number matches id" rule holds without change.
2. **It sits in Foundations**, as `modules: [0, 1, 2, 3, 4]` in `parts.ts`,
   rather than in a fourth part. A new part would renumber "Part 1" to "Part 3"
   on the home page for no teaching gain.
3. **Project setup is guided reading.** webR has no RStudio, no `.Rproj` and no
   desktop file system, so lesson `00-1` runs no R. It draws RStudio's four panes
   (`RStudioPanes`) and a project folder (`FolderTree`) instead of using
   screenshots, which would go stale with every RStudio release and could not be
   taken from this environment. With no exercises it completes on a visit, as
   `lessonStatus` already allows.
4. **Paths are interactive after all.** webR does have a working directory
   (`/home/web_user`) with the course `data/` folder mounted in it, so `00-2`
   runs `getwd()`, `list.files()`, `file.exists()`, `file.path()`,
   `dir.create()` and `write.csv()` for real.
5. **Symbols are split in two lessons.** `00-3` covers the symbols that store and
   compare (`<-`, `=`, quotes, `#`, arithmetic, `==`, `!=`, `<`, `>`, `<=`, `>=`,
   `&`, `|`, `!`, `%in%`, `NA`). `00-4` covers the ones that pick and pipe
   (`( )`, `c()`, `:`, `[ ]`, `[[ ]]`, `$`, `{ }`, `::`, `|>`, `%>%`, `~`) and
   closes with a cheat sheet of all of them (`SymbolTable`).
6. **Both pipes are taught.** `|>` is shown first because it needs no package.
   `%>%` follows after `library(dplyr)`, because Modules 2 to 14 use it.
7. **Exercises check values, never files.** webR's file system outlives every
   attempt and every lesson, so a check that looked for a file the solution
   wrote would pass the next empty submission.

## File structure

```
src/components/
  RStudioPanes.tsx        the four panes, drawn
  FolderTree.tsx          a project folder as text
  SymbolTable.tsx         the cheat sheet, and the SYMBOLS list the tests read
  Primer.css              styles for the three above
src/content/
  manifest.ts             module-00 with four lessons
  parts.ts                Foundations now holds modules 0 to 4
  mdxComponents.tsx       registers the three components
  exercises/module-00.ts  m0-2-a, m0-2-b, m0-3-a, m0-3-b, m0-4-a, m0-4-b
  lessons/00-1-rstudio-and-projects.mdx
  lessons/00-2-files-and-paths.mdx
  lessons/00-3-symbols-store-and-compare.mdx
  lessons/00-4-symbols-pick-and-pipe.mdx
```

## Tasks

- [x] Add `module-00` to `PLANNED_MODULES` and Module 0 to the Foundations part.
- [x] Write `00-1`: R versus RStudio, installing both, the four panes, scripts
  versus console, why a project, creating one step by step, a folder layout,
  turning off `.RData`, and how StatLab relates. Quiz on why a script fails on
  a supervisor's computer.
- [x] Write `00-2`: the working directory, `list.files()`, relative and absolute
  paths, `file.exists()`, `file.path()`, writing into a folder, and three things
  to avoid: backslashes, `setwd()`, and paths measured from the script.
- [x] Exercise `m0-2-a`: build `data/workplace.csv` with `file.path()` and
  confirm it exists. Fixtures: folder left out, wrong capital, no extension,
  absolute path.
- [x] Exercise `m0-2-b`: rewrite an absolute path relative to the project.
  Fixtures: project folder repeated, data folder dropped, backslash, unchanged.
- [x] Write `00-3` and its exercises: `m0-3-a` counts ages from 20 to 29 with
  `&` (fixtures for each boundary, for `|` and for `length()`), and `m0-3-b`
  counts two departments with `%in%` (fixtures include the recycling bug in
  `depts == c("Sales", "Support")`).
- [x] Write `00-4` and its exercises: `m0-4-a` picks with `$` and `[ ]`
  (fixtures for hours instead of names, `>=`, a whole row, counting from zero),
  and `m0-4-b` pipes `mean(na.rm = TRUE)` into `round(2)` (fixtures for the NA,
  the wrong order and a missing `digits`).
- [x] Tests in `content.test.ts`: Module 0 opens the course, its exercises match
  the manifest, `00-1` runs no R, no dataset is read, no exercise writes a file,
  and every symbol on the cheat sheet is taught in `00-3` or `00-4`. Course-wide:
  no lesson code or exercise calls `setwd()`.
- [x] Narrow the "dataset exists" rule to lesson code, since Module 0 names
  `data/survey.csv` in prose as a file in the student's own project.
- [x] Let the "checks read objects only through `answer()`" rules accept
  `file.exists()`, which asks about a file rather than an object.
- [x] Update the spec's §7 table and the README counts.
- [x] Add `00-1` and `00-4` to the responsive end-to-end pages: the folder tree
  and the cheat sheet are the widest things in Module 0.
- [ ] Open `00-2` in a browser with R running and press Run on every block.
  This environment cannot reach the webR CDN; CI's validator runs the same code.

## Verification

- `npm run validate:static` and `npm test`: pass, except the two suites that
  need the webR package repository, which this environment cannot reach.
- A local copy of the R validator, restricted to Module 0 and without package
  installs, graded every solution, alternate and wrong answer and ran every
  code block except `library(dplyr)`: 48 of 48.
- `npm run build`: passes.
- The three figures were screenshotted at 1280 and 390 pixels wide; neither
  width scrolls sideways.
