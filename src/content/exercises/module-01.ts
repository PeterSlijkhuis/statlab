import type { ExerciseDef } from '../../r/checker';

export const module01: ExerciseDef[] = [
  {
    id: 'm1-1-a',
    prompt:
      'A tutor recorded five marks: 68, 74, 59, 81 and 77. Store them in a vector called marks, and store their mean in mark_mean.',
    starterCode:
      '# Put the five marks in one vector, then take their mean.\nmarks <- \nmark_mean <- ',
    solution: 'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- mean(marks)',
    wrongAnswers: [
      // One mark dropped while typing: four values, and a mean of the four.
      'marks <- c(68, 74, 59, 81)\nmark_mean <- mean(marks)',
      // The middle value instead of the average.
      'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- median(marks)',
      // Divided by the wrong n, counted by hand.
      'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- sum(marks) / 4',
    ],
    alternateSolutions: [
      // The mean written out. Correct, and worth accepting: it is how the mean is defined.
      'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- sum(marks) / length(marks)',
      // Growing the vector in two steps, which is what a student who types slowly does.
      'marks <- c(68, 74)\nmarks <- c(marks, 59, 81, 77)\nmark_mean <- mean(marks)',
    ],
    check: `
      if (!has_answer("marks") || !has_answer("mark_mean")) {
        list(pass = FALSE, message = "I need both marks (the five numbers) and mark_mean (their mean).")
      } else {
        marks <- answer("marks")
        mark_mean <- answer("mark_mean")
        expected <- c(68, 74, 59, 81, 77)
        if (!is.numeric(marks)) {
          list(pass = FALSE, message = "marks is not numeric. Quotation marks turn a number into text: write c(68, 74, 59, 81, 77), not c(\\"68\\", \\"74\\", ...).")
        } else if (length(marks) != 5L) {
          list(pass = FALSE, message = paste0("marks holds ", length(marks), " values, but the tutor recorded five. Check for a missing or repeated number."))
        } else if (!isTRUE(all.equal(sort(as.vector(marks)), sort(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "marks holds five numbers, but not the five marks in the prompt: 68, 74, 59, 81, 77.")
        } else if (!is.numeric(mark_mean) || length(as.vector(mark_mean)) != 1L) {
          list(pass = FALSE, message = "mark_mean should be a single number - the mean of all five marks.")
        } else if (isTRUE(all.equal(as.vector(mark_mean), median(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the median: the middle mark once they are sorted. The mean adds them up and divides by how many there are.")
        } else if (isTRUE(all.equal(as.vector(mark_mean), sum(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the total of the five marks. Divide it by 5 - or let mean() do both steps.")
        } else if (!isTRUE(all.equal(as.vector(mark_mean), mean(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mark_mean is ", round(as.vector(mark_mean), 3), ", but the mean of those five marks is ", round(mean(expected), 2), ". Check what you divided by."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", round(mean(expected), 2), ". Notice that mean(marks) needed the vector, not the five numbers again - that is what storing them bought you."))
        }
      }
    `,
    hints: [
      'c() combines values into one vector: c(68, 74, 59, 81, 77).',
      'The arrow stores a result under a name: marks <- c(...).',
      'mean() takes the whole vector at once: mark_mean <- mean(marks).',
    ],
  },
  {
    id: 'm1-1-b',
    prompt:
      'Those five marks were out of 90. Store them as percentages in percent, in one line and without a loop, and store how many of them are above 85 percent in n_high.',
    starterCode:
      'marks <- c(68, 74, 59, 81, 77)\n\n# Turn the marks into percentages of 90, then count the ones above 85.\npercent <- \nn_high <- ',
    solution:
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90 * 100\nn_high <- sum(percent > 85)',
    wrongAnswers: [
      // Divided, but never scaled to 100: every "percentage" is under 1.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90\nn_high <- sum(percent > 85)',
      // length() counts the comparisons, not the TRUEs.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90 * 100\nn_high <- length(percent > 85)',
      // Compared on the raw scale instead of the percentage scale.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90 * 100\nn_high <- sum(marks > 85)',
    ],
    alternateSolutions: [
      // which() then length(): the route a student who thinks in positions takes.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- 100 * marks / 90\nn_high <- length(which(percent > 85))',
      // Scaling by a single factor, and counting with ifelse().
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks * (100 / 90)\nn_high <- sum(ifelse(percent > 85, 1, 0))',
    ],
    check: `
      if (!has_answer("percent") || !has_answer("n_high")) {
        list(pass = FALSE, message = "I need both percent (the five percentages) and n_high (how many are above 85).")
      } else {
        percent <- as.vector(answer("percent"))
        n_high <- as.vector(answer("n_high"))
        marks <- c(68, 74, 59, 81, 77)
        expected_percent <- marks / 90 * 100
        expected_n <- sum(expected_percent > 85)
        if (!is.numeric(percent) || length(percent) != 5L) {
          list(pass = FALSE, message = "percent should hold five numbers, one per mark. Dividing a vector divides every element at once, so no loop is needed.")
        } else if (isTRUE(all.equal(percent, marks / 90, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You divided by 90 but stopped there, so percent holds proportions under 1. Multiply by 100 to get percentages.")
        } else if (!isTRUE(all.equal(percent, expected_percent, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "percent is not marks / 90 * 100. Each mark is out of 90, so divide by 90 and scale to 100.")
        } else if (!is.numeric(n_high) || length(n_high) != 1L) {
          list(pass = FALSE, message = "n_high should be a single number: a count.")
        } else if (isTRUE(all.equal(n_high, 5, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You counted the comparisons, not the TRUEs. percent > 85 has five elements whatever the answer is; length() reports five. sum() adds the TRUEs, because R counts TRUE as 1.")
        } else if (isTRUE(all.equal(n_high, sum(marks > 85), tolerance = 1e-6, check.attributes = FALSE)) && expected_n != sum(marks > 85)) {
          list(pass = FALSE, message = "You compared the raw marks with 85, not the percentages. 85 percent of 90 is 76.5, so the two comparisons give different answers.")
        } else if (!isTRUE(all.equal(n_high, expected_n, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_high is ", n_high, ", but ", expected_n, " of the five percentages are above 85."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", expected_n, " of the five are above 85 percent. You did it without writing a single loop - compare, then sum."))
        }
      }
    `,
    hints: [
      'An operation on a vector happens to every element: marks / 90 gives five results.',
      'percent > 85 gives five TRUE or FALSE values, one per student.',
      'sum() of TRUE and FALSE counts the TRUEs, because R treats TRUE as 1.',
    ],
  },
  {
    id: 'm1-2-a',
    prompt:
      'Eight employees were asked for a wellbeing score, but one skipped the question: scores <- c(62, 58, NA, 71, 66, 60, 64, 57). Store the mean of the scores that were given in mean_score, and that mean rounded to one decimal place in mean_rounded.',
    starterCode:
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\n\n# mean() has an argument for missing values. Find it, then round to one decimal.\nmean_score <- \nmean_rounded <- ',
    solution:
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores, na.rm = TRUE)\nmean_rounded <- round(mean_score, 1)',
    wrongAnswers: [
      // The default: one NA makes the whole mean NA.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores)\nmean_rounded <- round(mean_score, 1)',
      // round()'s second argument left out, so it rounds to whole numbers.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores, na.rm = TRUE)\nmean_rounded <- round(mean_score)',
      // Dropped the NA from the total but not from the denominator.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- sum(scores, na.rm = TRUE) / length(scores)\nmean_rounded <- round(mean_score, 1)',
    ],
    alternateSolutions: [
      // Removing the missing value first, then using the default mean().
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores[!is.na(scores)])\nmean_rounded <- round(mean_score, digits = 1)',
      // The arithmetic written out, with the right denominator.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- sum(scores, na.rm = TRUE) / sum(!is.na(scores))\nmean_rounded <- round(mean_score, 1)',
    ],
    check: `
      if (!has_answer("mean_score") || !has_answer("mean_rounded")) {
        list(pass = FALSE, message = "I need both mean_score and mean_rounded.")
      } else {
        mean_score <- as.vector(answer("mean_score"))
        mean_rounded <- as.vector(answer("mean_rounded"))
        scores <- c(62, 58, NA, 71, 66, 60, 64, 57)
        expected <- mean(scores, na.rm = TRUE)
        if (length(mean_score) != 1L || length(mean_rounded) != 1L) {
          list(pass = FALSE, message = "Both answers should be single numbers.")
        } else if (is.na(mean_score)) {
          list(pass = FALSE, message = "mean_score is NA. That is R being careful: with one value missing, it cannot know the true mean, so it refuses to guess. Tell it to drop the missing value with na.rm = TRUE.")
        } else if (isTRUE(all.equal(mean_score, sum(scores, na.rm = TRUE) / length(scores), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You added the seven scores that exist but divided by eight. Seven people answered, so the denominator is seven.")
        } else if (!isTRUE(all.equal(mean_score, expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_score is ", round(mean_score, 4), ", but the mean of the seven scores given is ", round(expected, 4), "."))
        } else if (isTRUE(all.equal(mean_rounded, round(expected, 0), tolerance = 1e-6, check.attributes = FALSE)) &&
                   !isTRUE(all.equal(round(expected, 0), round(expected, 1), tolerance = 1e-6))) {
          list(pass = FALSE, message = paste0("mean_rounded is ", round(expected, 0), ", which is rounded to a whole number. round() has a second argument, digits, and its default is 0: round(mean_score, 1)."))
        } else if (!isTRUE(all.equal(mean_rounded, round(expected, 1), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_rounded should be ", round(expected, 1), "."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", round(expected, 4), ", reported as ", round(expected, 1), ". na.rm = TRUE is an argument you will type for the rest of your life - real data always has holes in it."))
        }
      }
    `,
    hints: [
      'args(mean) shows the arguments mean() accepts. One of them is about missing values.',
      'mean(scores, na.rm = TRUE) drops the NA and averages what is left.',
      'round() takes a second argument: round(mean_score, 1) keeps one decimal.',
    ],
  },
  {
    id: 'm1-2-b',
    prompt:
      'A questionnaire is scored from 0 to 100 in steps of 10. Use seq() to build that vector of scale points in scale_points, and store how many points it has in n_points.',
    starterCode:
      '# seq() builds a regular sequence. Check its arguments with args(seq).\nscale_points <- \nn_points <- ',
    solution:
      'scale_points <- seq(from = 0, to = 100, by = 10)\nn_points <- length(scale_points)',
    wrongAnswers: [
      // by and length.out confused: ten evenly spaced points, not steps of ten.
      'scale_points <- seq(from = 0, to = 100, length.out = 10)\nn_points <- length(scale_points)',
      // The colon operator always steps by one.
      'scale_points <- 0:100\nn_points <- length(scale_points)',
      // The classic fencepost: counted the steps, not the points.
      'scale_points <- seq(from = 0, to = 100, by = 10)\nn_points <- 10',
    ],
    alternateSolutions: [
      // Positional arguments, in seq()'s documented order.
      'scale_points <- seq(0, 100, 10)\nn_points <- length(scale_points)',
      // No seq() at all: eleven integers, scaled.
      'scale_points <- (0:10) * 10\nn_points <- length(scale_points)',
    ],
    check: `
      if (!has_answer("scale_points") || !has_answer("n_points")) {
        list(pass = FALSE, message = "I need both scale_points and n_points.")
      } else {
        scale_points <- as.vector(answer("scale_points"))
        n_points <- as.vector(answer("n_points"))
        expected <- seq(from = 0, to = 100, by = 10)
        if (!is.numeric(scale_points)) {
          list(pass = FALSE, message = "scale_points should be numbers.")
        } else if (length(scale_points) == 101L) {
          list(pass = FALSE, message = "0:100 steps by one, so you built 101 points. seq() lets you choose the step: by = 10.")
        } else if (length(scale_points) == 10L) {
          list(pass = FALSE, message = "length.out = 10 asks for ten evenly spaced points, which lands on 0, 11.1, 22.2 and so on. You want a step of ten: by = 10.")
        } else if (!isTRUE(all.equal(scale_points, expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "scale_points should be 0, 10, 20, ... , 100.")
        } else if (!is.numeric(n_points) || length(n_points) != 1L) {
          list(pass = FALSE, message = "n_points should be a single number.")
        } else if (isTRUE(all.equal(n_points, 10, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "There are ten steps of ten, but eleven points, because 0 is one of them. Do not count by hand - length(scale_points) always tells the truth.")
        } else if (!isTRUE(all.equal(n_points, length(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_points is ", n_points, ", but scale_points has ", length(expected), " values."))
        } else {
          list(pass = TRUE, message = "Correct: eleven points, 0 to 100 in tens. Naming arguments (from, to, by) makes a call like this readable a month later.")
        }
      }
    `,
    hints: [
      'args(seq) lists the arguments: from, to, by and length.out among them.',
      'by = 10 sets the step size; length.out sets how many values you get. You want the step.',
      'length() counts the values in a vector, so you never have to count them yourself.',
    ],
  },
  {
    id: 'm1-3-a',
    prompt:
      'The data frame team is already in your environment, with a name column and an hours column. Attach dplyr and use filter() to keep only the people who worked more than 35 hours. Store the result in busy and its number of rows in n_busy.',
    starterCode:
      'library(dplyr)\n\n# team is already here. Keep the rows where hours is above 35.\nbusy <- \nn_busy <- ',
    setupCode:
      'team <- data.frame(\n  name = c("Ada", "Bram", "Chen", "Dana", "Eva", "Finn"),\n  hours = c(32, 41, 38, 29, 35, 44),\n  stringsAsFactors = TRUE\n)',
    solution:
      'library(dplyr)\nbusy <- team %>% filter(hours > 35)\nn_busy <- nrow(busy)',
    wrongAnswers: [
      // The boundary: Eva worked exactly 35 hours, which is not more than 35.
      'library(dplyr)\nbusy <- team %>% filter(hours >= 35)\nn_busy <- nrow(busy)',
      // select() chooses columns, not rows: all six people survive.
      'library(dplyr)\nbusy <- team %>% select(hours)\nn_busy <- nrow(busy)',
      // length() of a data frame counts its columns.
      'library(dplyr)\nbusy <- team %>% filter(hours > 35)\nn_busy <- length(busy)',
    ],
    alternateSolutions: [
      // Base R subsetting: the route Module 1 says dplyr is an alternative to.
      'busy <- team[team$hours > 35, ]\nn_busy <- nrow(busy)',
      // Same rows, different order. The people are what matters, not their order.
      'library(dplyr)\nbusy <- team %>% filter(hours > 35) %>% arrange(name)\nn_busy <- nrow(busy)',
    ],
    check: `
      if (!has_answer("busy") || !has_answer("n_busy")) {
        list(pass = FALSE, message = "I need both busy (the filtered data frame) and n_busy (how many rows it has).")
      } else {
        busy <- answer("busy")
        n_busy <- as.vector(answer("n_busy"))
        expected_hours <- sort(c(41, 38, 44))
        if (!is.data.frame(busy)) {
          list(pass = FALSE, message = "busy should be a data frame - the rows of team that survived the filter.")
        } else if (!("hours" %in% names(busy))) {
          list(pass = FALSE, message = "busy has no hours column. filter() keeps every column and drops rows; it is select() that drops columns.")
        } else if (nrow(busy) == 6L) {
          list(pass = FALSE, message = "busy still has all six people. filter() chooses rows and select() chooses columns - only one of them can answer this question.")
        } else if (nrow(busy) == 4L) {
          list(pass = FALSE, message = "You kept four people, which means Eva is in there on exactly 35 hours. More than 35 is hours > 35, not hours >= 35.")
        } else if (!isTRUE(all.equal(sort(as.vector(busy$hours)), expected_hours, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("busy holds ", nrow(busy), " row(s), but the people above 35 hours are the ones on 38, 41 and 44."))
        } else if (!is.numeric(n_busy) || length(n_busy) != 1L) {
          list(pass = FALSE, message = "n_busy should be a single number.")
        } else if (isTRUE(all.equal(n_busy, ncol(busy), tolerance = 1e-6, check.attributes = FALSE)) && ncol(busy) != nrow(busy)) {
          list(pass = FALSE, message = paste0("n_busy is ", n_busy, ", which is how many columns busy has. A data frame is a list of columns, so length() counts columns; nrow() counts rows."))
        } else if (!isTRUE(all.equal(n_busy, 3, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_busy is ", n_busy, ", but busy has ", nrow(busy), " rows."))
        } else {
          list(pass = TRUE, message = "Correct: Bram, Chen and Finn. filter() takes a condition about a row and keeps the rows where it is TRUE - and it knew what hours meant without you writing team$hours.")
        }
      }
    `,
    hints: [
      'library(dplyr) attaches the package; the verbs only exist afterwards.',
      'filter() keeps rows: team %>% filter(hours > 35). Note that "more than 35" excludes 35 itself.',
      'nrow() counts the rows of a data frame; length() would count its columns.',
    ],
  },
];
