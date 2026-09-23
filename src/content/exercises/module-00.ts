import type { ExerciseDef } from '../../r/checker';

// Module 0 exercises check values only, never files they create: webR's file
// system outlives every attempt, so a check that looked for a file the
// solution writes would pass the next student's empty submission.
export const module00: ExerciseDef[] = [
  {
    id: 'm0-2-a',
    prompt:
      'The data folder in your working directory holds workplace.csv. Use file.path() to build the relative path to that file and store it in path, then store whether R can find it in found.',
    starterCode:
      '# file.path() joins folder and file names with a /.\npath <- \nfound <- ',
    solution: 'path <- file.path("data", "workplace.csv")\nfound <- file.exists(path)',
    wrongAnswers: [
      // The folder left out: R looks for the file in the working directory itself.
      'path <- file.path("workplace.csv")\nfound <- file.exists(path)',
      // A capital letter: Data and data are different folders here.
      'path <- file.path("Data", "workplace.csv")\nfound <- file.exists(path)',
      // The extension dropped. It is part of the file name.
      'path <- file.path("data", "workplace")\nfound <- file.exists(path)',
      // An absolute path copied from someone else's computer.
      'path <- "C:/Users/sam/Documents/statlab/data/workplace.csv"\nfound <- file.exists(path)',
    ],
    alternateSolutions: [
      // Typed out by hand. file.path() is tidier, but the path is the same.
      'path <- "data/workplace.csv"\nfound <- file.exists(path)',
      // Glued together with paste().
      'path <- paste("data", "workplace.csv", sep = "/")\nfound <- file.exists(path)',
      // The ./ some people write for "here".
      'path <- "./data/workplace.csv"\nfound <- file.exists(path)',
    ],
    check: `
      if (!has_answer("path") || !has_answer("found")) {
        list(pass = FALSE, message = "I need both path (the text of the path) and found (whether the file exists).")
      } else {
        path <- answer("path")
        found <- answer("found")
        if (!is.character(path) || length(path) != 1L) {
          list(pass = FALSE, message = "path should be one piece of text, such as the result of file.path(\\"data\\", \\"workplace.csv\\"). Without quotation marks R looks for objects called data and workplace.")
        } else if (startsWith(path, "/") || startsWith(path, "~") || grepl(":", path, fixed = TRUE)) {
          list(pass = FALSE, message = "That is an absolute path: it starts from the top of one particular computer. Start from the working directory instead, so the path works for anyone who opens the project.")
        } else if (!file.exists(path)) {
          bare <- if (startsWith(path, "./")) substring(path, 3) else path
          if (tolower(bare) == "data/workplace.csv") {
            list(pass = FALSE, message = "Nearly: check the capital letters. The folder is data and the file is workplace.csv, and on many computers Data is a different folder from data.")
          } else if (!grepl("/", bare, fixed = TRUE)) {
            list(pass = FALSE, message = paste0("\\"", path, "\\" looks in the working directory itself, but the file sits inside the data folder. Give file.path() the folder name first."))
          } else if (!endsWith(bare, ".csv")) {
            list(pass = FALSE, message = "The file name needs its extension: workplace.csv, not workplace. The extension is part of the name.")
          } else {
            list(pass = FALSE, message = paste0("R cannot find \\"", path, "\\". list.files(\\"data\\") shows exactly what is in the data folder."))
          }
        } else if (normalizePath(path) != normalizePath("data/workplace.csv")) {
          list(pass = FALSE, message = "That path points at something that exists, but not at workplace.csv in the data folder.")
        } else if (!is.logical(found) || length(found) != 1L || is.na(found)) {
          list(pass = FALSE, message = "found should be a single TRUE or FALSE: the answer file.exists(path) gives.")
        } else if (!isTRUE(found)) {
          list(pass = FALSE, message = "Your path is right, but found says FALSE. Let file.exists(path) answer instead of typing it yourself.")
        } else {
          list(pass = TRUE, message = "Correct: data/workplace.csv, and R can see it. The path starts from the working directory, so the same line works on every computer that opens the project.")
        }
      }
    `,
    hints: [
      'file.path("data", "workplace.csv") gives the text "data/workplace.csv".',
      'A relative path starts from the working directory, which getwd() shows.',
      'file.exists() takes a path and answers TRUE or FALSE: found <- file.exists(path).',
    ],
  },
  {
    id: 'm0-2-b',
    prompt:
      'A classmate\'s script reads its data from "C:/Users/sam/Documents/thesis/data/survey.csv", which works only on Sam\'s laptop. The script lives in an RStudio Project whose folder is thesis. Store the path to survey.csv relative to the project in rel_path.',
    starterCode:
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\n\n# In the project, R already starts inside the thesis folder. What is left of the path?\nrel_path <- ',
    solution:
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- "data/survey.csv"',
    wrongAnswers: [
      // The project folder named again, though R is already inside it.
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- "thesis/data/survey.csv"',
      // The data folder forgotten.
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- "survey.csv"',
      // A Windows backslash, which R reads as the start of a special character.
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- "data\\\\survey.csv"',
      // Left as it was.
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- old_path',
    ],
    alternateSolutions: [
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- file.path("data", "survey.csv")',
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- "./data/survey.csv"',
      // Cutting the machine-specific start off the old path.
      'old_path <- "C:/Users/sam/Documents/thesis/data/survey.csv"\nrel_path <- sub("C:/Users/sam/Documents/thesis/", "", old_path, fixed = TRUE)',
    ],
    check: `
      if (!has_answer("rel_path")) {
        list(pass = FALSE, message = "I need rel_path: the path to survey.csv, starting from the project folder.")
      } else {
        rel_path <- answer("rel_path")
        if (!is.character(rel_path) || length(rel_path) != 1L) {
          list(pass = FALSE, message = "rel_path should be one piece of text in quotation marks.")
        } else {
          bare <- if (startsWith(rel_path, "./")) substring(rel_path, 3) else rel_path
          if (grepl("\\\\", bare, fixed = TRUE)) {
            list(pass = FALSE, message = "R paths use forward slashes on every computer, Windows included. Inside R text a backslash starts a special character, so write data/survey.csv with a /.")
          } else if (grepl(":", bare, fixed = TRUE) || startsWith(bare, "/")) {
            list(pass = FALSE, message = "That is still an absolute path: it names a drive and Sam's own folders, so it breaks on every other computer. Keep only the part after the project folder.")
          } else if (startsWith(bare, "thesis/")) {
            list(pass = FALSE, message = "Nearly. R is already inside the thesis folder, so thesis/ would send it looking for a second thesis folder inside the first. Drop it.")
          } else if (bare == "survey.csv") {
            list(pass = FALSE, message = "That looks for survey.csv in the thesis folder itself, but the file sits inside the data folder.")
          } else if (bare != "data/survey.csv") {
            list(pass = FALSE, message = paste0("rel_path is \\"", rel_path, "\\". Start from the thesis folder and name each folder on the way down to the file."))
          } else {
            list(pass = TRUE, message = "Correct: data/survey.csv. Send the whole thesis folder to your supervisor and this line still finds the data, because it never says whose computer it is on.")
          }
        }
      }
    `,
    hints: [
      'In a project, the working directory is the project folder: here, thesis.',
      'Keep only what comes after thesis/ in the old path.',
      'Paths in R use forward slashes: rel_path <- "data/survey.csv".',
    ],
  },
  {
    id: 'm0-3-a',
    prompt:
      'ages holds the ages of eight participants. Store how many of them are in their twenties, 20 to 29 with both ends included, in n_twenties.',
    starterCode:
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\n\n# Two conditions that must both be TRUE: at least 20, and at most 29.\nn_twenties <- ',
    solution:
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- sum(ages >= 20 & ages <= 29)',
    wrongAnswers: [
      // Both boundaries dropped: 20 and 29 are left out.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- sum(ages > 20 & ages < 29)',
      // One boundary dropped: 29 is left out.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- sum(ages >= 20 & ages < 29)',
      // Or instead of and: every age is at least 20 or at most 29.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- sum(ages >= 20 | ages <= 29)',
      // length() counts the comparisons, not the TRUEs.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- length(ages >= 20 & ages <= 29)',
    ],
    alternateSolutions: [
      // Below 30 is the same as at most 29 for whole-number ages.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- sum(ages >= 20 & ages < 30)',
      // Membership in the sequence 20 to 29.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- sum(ages %in% 20:29)',
      // Pick the ages out with [ ], then count them.
      'ages <- c(19, 24, 31, 22, 45, 20, 29, 33)\nn_twenties <- length(ages[ages >= 20 & ages <= 29])',
    ],
    check: `
      if (!has_answer("n_twenties")) {
        list(pass = FALSE, message = "I need n_twenties: how many of the eight ages are from 20 to 29.")
      } else {
        n <- as.vector(answer("n_twenties"))
        ages <- c(19, 24, 31, 22, 45, 20, 29, 33)
        expected <- sum(ages >= 20 & ages <= 29)
        if (is.logical(n) && length(n) == length(ages)) {
          list(pass = FALSE, message = "n_twenties holds eight TRUE and FALSE values, one per person. That is the right question; now count the TRUEs by wrapping it in sum().")
        } else if (!is.numeric(n) || length(n) != 1L || is.na(n)) {
          list(pass = FALSE, message = "n_twenties should be a single number: a count.")
        } else if (n == length(ages)) {
          list(pass = FALSE, message = "That counts all eight people. Either | (or) crept in, which is TRUE for everyone because every age is at least 20 or at most 29, or length() counted the comparisons instead of the TRUEs. Use & and sum().")
        } else if (n == sum(ages > 20 & ages < 29)) {
          list(pass = FALSE, message = "Both ends went missing: > and < leave out the person aged 20 and the person aged 29. Both included means >= and <=.")
        } else if (n == sum(ages >= 20 & ages < 29) || n == sum(ages > 20 & ages <= 29)) {
          list(pass = FALSE, message = "One end went missing. Look at your two comparisons: one of them needs its = sign, so that 20 and 29 both count.")
        } else if (n != expected) {
          list(pass = FALSE, message = paste0("n_twenties is ", n, ", but ", expected, " of the eight ages are from 20 to 29."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", expected, " people, aged 24, 22, 20 and 29. & asked both questions of every age at once, and sum() counted where both answers were TRUE."))
        }
      }
    `,
    hints: [
      'ages >= 20 asks one question of every age; ages <= 29 asks the other.',
      '& joins them: TRUE only where both are TRUE.',
      'sum() counts the TRUEs: n_twenties <- sum(ages >= 20 & ages <= 29).',
    ],
  },
  {
    id: 'm0-3-b',
    prompt:
      'depts holds the department of six employees. Using %in%, store how many of them work in Sales or Support in n_front.',
    starterCode:
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\n\n# %in% asks of each element: is it one of these?\nn_front <- ',
    solution:
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- sum(depts %in% c("Sales", "Support"))',
    wrongAnswers: [
      // == against two values recycles: it compares element by element, alternating.
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- sum(depts == c("Sales", "Support"))',
      // Only one of the two departments.
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- sum(depts == "Sales")',
      // And instead of or: nobody is in two departments at once.
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- sum(depts == "Sales" & depts == "Support")',
      // Lower case: text has to match exactly.
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- sum(depts %in% c("sales", "support"))',
    ],
    alternateSolutions: [
      // Two comparisons joined with or: correct, just longer.
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- sum(depts == "Sales" | depts == "Support")',
      // Pick them out, then count.
      'depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")\nn_front <- length(depts[depts %in% c("Sales", "Support")])',
    ],
    check: `
      if (!has_answer("n_front")) {
        list(pass = FALSE, message = "I need n_front: how many of the six work in Sales or Support.")
      } else {
        n <- as.vector(answer("n_front"))
        depts <- c("Sales", "Support", "Engineering", "Sales", "Marketing", "Support")
        expected <- sum(depts %in% c("Sales", "Support"))
        if (is.logical(n) && length(n) == length(depts)) {
          list(pass = FALSE, message = "n_front holds six TRUE and FALSE values. Count the TRUEs with sum().")
        } else if (!is.numeric(n) || length(n) != 1L || is.na(n)) {
          list(pass = FALSE, message = "n_front should be a single number: a count.")
        } else if (n == sum(depts == c("Sales", "Support"))) {
          list(pass = FALSE, message = "depts == c(\\"Sales\\", \\"Support\\") does not ask whether each person is in one of the two. R lines the vectors up and recycles the shorter one: it compares the 1st person with Sales, the 2nd with Support, the 3rd with Sales again, and so on. %in% asks the question you meant.")
        } else if (n == sum(depts == "Sales") || n == sum(depts == "Support")) {
          list(pass = FALSE, message = "That counts only one of the two departments. Put both inside c() on the right of %in%.")
        } else if (n == 0) {
          list(pass = FALSE, message = "Nobody matched. Either & asked for people in Sales and Support at the same time, which is nobody, or the names do not match exactly: text in R is case sensitive, so \\"sales\\" is not \\"Sales\\".")
        } else if (n != expected) {
          list(pass = FALSE, message = paste0("n_front is ", n, ", but ", expected, " of the six work in Sales or Support."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", expected, ". %in% asks each element whether it appears anywhere on the right, which is exactly the question == cannot ask of two values at once."))
        }
      }
    `,
    hints: [
      'depts %in% c("Sales", "Support") gives six TRUE or FALSE answers.',
      'Text must match exactly, capital letters included.',
      'sum() counts the TRUEs: n_front <- sum(depts %in% c("Sales", "Support")).',
    ],
  },
  {
    id: 'm0-4-a',
    prompt:
      'The data frame team is in your environment, with a name and an hours column. Store the hours of the third person in third_hours, and the names of everyone who worked more than 40 hours in long_names.',
    setupCode:
      'team <- data.frame(\n  name = c("Ada", "Bram", "Chen", "Dana", "Eva", "Finn"),\n  hours = c(32, 41, 38, 40, 35, 44)\n)',
    starterCode:
      '# $ takes one column; [ ] picks elements out of it.\nthird_hours <- \nlong_names <- ',
    solution: 'third_hours <- team$hours[3]\nlong_names <- team$name[team$hours > 40]',
    wrongAnswers: [
      // The right people, but their hours instead of their names.
      'third_hours <- team$hours[3]\nlong_names <- team$hours[team$hours > 40]',
      // Dana worked exactly 40, which is not more than 40.
      'third_hours <- team$hours[3]\nlong_names <- team$name[team$hours >= 40]',
      // A whole row, not one number.
      'third_hours <- team[3, ]\nlong_names <- team$name[team$hours > 40]',
      // Counting from zero, as some other languages do.
      'third_hours <- team$hours[2]\nlong_names <- team$name[team$hours > 40]',
    ],
    alternateSolutions: [
      // Row and column inside one pair of brackets.
      'third_hours <- team[3, "hours"]\nlong_names <- team[team$hours > 40, "name"]',
      // Double brackets, and which() to turn the TRUEs into positions.
      'third_hours <- team[["hours"]][3]\nlong_names <- team$name[which(team$hours > 40)]',
    ],
    check: `
      if (!has_answer("third_hours") || !has_answer("long_names")) {
        list(pass = FALSE, message = "I need both third_hours and long_names.")
      } else {
        third <- answer("third_hours")
        long <- answer("long_names")
        if (is.data.frame(third)) {
          list(pass = FALSE, message = "third_hours is a whole row of team, because team[3, ] keeps every column. Ask for the hours column first: team$hours[3].")
        } else if (!is.numeric(third) || length(third) != 1L) {
          list(pass = FALSE, message = "third_hours should be one number.")
        } else if (!isTRUE(all.equal(as.vector(third), 38))) {
          list(pass = FALSE, message = paste0("third_hours is ", as.vector(third), ", but the third person, Chen, worked 38 hours. R counts positions from 1, so the third element is [3]."))
        } else if (is.data.frame(long)) {
          list(pass = FALSE, message = "long_names holds whole rows of team. Take just the name column: team$name[...].")
        } else if (is.numeric(long)) {
          list(pass = FALSE, message = "long_names holds numbers: those are the hours. Keep the condition on hours inside the brackets, but take the elements from team$name.")
        } else {
          long <- sort(as.character(long))
          if (identical(long, c("Bram", "Dana", "Finn"))) {
            list(pass = FALSE, message = "Dana worked exactly 40 hours, which is not more than 40. > leaves 40 itself out; >= lets it in.")
          } else if (!identical(long, c("Bram", "Finn"))) {
            list(pass = FALSE, message = "long_names should hold the names of the people above 40 hours, and only their names.")
          } else {
            list(pass = TRUE, message = "Correct: Chen's 38 hours, and Bram and Finn. The condition inside [ ] was about hours while the names came from another column: rows line up across a data frame, so that just works.")
          }
        }
      }
    `,
    hints: [
      'team$hours is one column, a plain vector of six numbers.',
      'Square brackets pick elements: team$hours[3] is the third.',
      'A TRUE/FALSE condition works inside [ ] too: team$name[team$hours > 40].',
    ],
  },
  {
    id: 'm0-4-b',
    prompt:
      'scores holds eight ratings on a 1 to 5 scale, and one is missing. Using the pipe |>, take their mean without the missing value, round it to two decimals, and store the result in avg.',
    starterCode:
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\n\n# Read |> as "and then": scores, and then the mean, and then round.\navg <- scores |> ',
    solution:
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\navg <- scores |> mean(na.rm = TRUE) |> round(2)',
    wrongAnswers: [
      // The missing value left in, so the mean is NA.
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\navg <- scores |> mean() |> round(2)',
      // The steps in the wrong order: rounding ratings that already have one decimal.
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\navg <- scores |> round(2) |> mean(na.rm = TRUE)',
      // round() without its second argument rounds to a whole number.
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\navg <- scores |> mean(na.rm = TRUE) |> round()',
    ],
    alternateSolutions: [
      // The nested version: the same steps, written inside out.
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\navg <- round(mean(scores, na.rm = TRUE), 2)',
      // Dropping the NA as its own step.
      'scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)\navg <- scores |> na.omit() |> mean() |> round(digits = 2)',
    ],
    check: `
      if (!has_answer("avg")) {
        list(pass = FALSE, message = "I need avg: the rounded mean of the ratings.")
      } else {
        avg <- as.vector(answer("avg"))
        scores <- c(4.2, 3.8, NA, 4.5, 3.9, 4.1, 4.4, 3.6)
        exact <- mean(scores, na.rm = TRUE)
        if (!(is.numeric(avg) || is.logical(avg)) || length(avg) != 1L) {
          list(pass = FALSE, message = "avg should be one number.")
        } else if (is.na(avg)) {
          list(pass = FALSE, message = "avg is NA: the missing rating made the whole mean missing. mean() needs na.rm = TRUE, and in a pipe it still goes inside the brackets: mean(na.rm = TRUE).")
        } else if (isTRUE(all.equal(avg, exact, tolerance = 1e-9))) {
          list(pass = FALSE, message = "That is the mean, but not rounded. Order matters in a pipe: rounding the ratings first changes nothing, because they already have one decimal. Round the mean, as the last step.")
        } else if (isTRUE(all.equal(avg, round(exact), tolerance = 1e-9))) {
          list(pass = FALSE, message = "round() with no second argument rounds to a whole number. round(2) keeps two decimals.")
        } else if (!isTRUE(all.equal(avg, round(exact, 2), tolerance = 1e-9))) {
          list(pass = FALSE, message = paste0("avg is ", avg, ", but the mean of the seven ratings, to two decimals, is ", round(exact, 2), "."))
        } else {
          list(pass = TRUE, message = "Correct: 4.07. Read it back left to right: scores, and then the mean without the NA, and then round to two decimals. round(mean(scores, na.rm = TRUE), 2) says the same thing inside out.")
        }
      }
    `,
    hints: [
      'x |> f() means f(x): the left side goes in as the first argument.',
      'Extra arguments stay in the brackets: scores |> mean(na.rm = TRUE).',
      'Add one more step at the end: |> round(2).',
    ],
  },
];
