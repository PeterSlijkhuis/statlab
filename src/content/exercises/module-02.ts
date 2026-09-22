import type { ExerciseDef } from '../../r/checker';

export const module02: ExerciseDef[] = [
  {
    id: 'm2-1-a',
    prompt:
      'Read data/workplace.csv into employees, with the text columns as factors. Store the number of employees in n_employees and the number of departments in n_departments.',
    starterCode:
      '# Read the file, then count the rows and the departments.\nemployees <- \nn_employees <- \nn_departments <- ',
    solution:
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- nrow(employees)\nn_departments <- nlevels(employees$department)',
    wrongAnswers: [
      // Without stringsAsFactors the text columns stay character, so they have no levels.
      'employees <- read.csv("data/workplace.csv")\nn_employees <- nrow(employees)\nn_departments <- nlevels(employees$department)',
      // ncol() counts the columns of the codebook, not the people.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- ncol(employees)\nn_departments <- nlevels(employees$department)',
      // length() of a column gives one entry per employee, not the number of distinct departments.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- nrow(employees)\nn_departments <- length(employees$department)',
    ],
    alternateSolutions: [
      // levels() then length(): what nlevels() is short for.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- nrow(employees)\nn_departments <- length(levels(employees$department))',
      // unique() works whether the column is a factor or not.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- length(employees$employee_id)\nn_departments <- length(unique(employees$department))',
    ],
    check: `
      if (!has_answer("employees") || !has_answer("n_employees") || !has_answer("n_departments")) {
        list(pass = FALSE, message = "I need employees (the data frame), n_employees and n_departments.")
      } else {
        employees <- answer("employees")
        n_employees <- as.vector(answer("n_employees"))
        n_departments <- as.vector(answer("n_departments"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!is.data.frame(employees)) {
          list(pass = FALSE, message = "employees should be the data frame that read.csv() returns.")
        } else if (!("department" %in% names(employees))) {
          list(pass = FALSE, message = "employees has no department column. Read the whole file - the columns are the codebook.")
        } else if (nrow(employees) != nrow(d)) {
          list(pass = FALSE, message = paste0("employees has ", nrow(employees), " rows, but data/workplace.csv has ", nrow(d), "."))
        } else if (!is.factor(employees$department)) {
          list(pass = FALSE, message = "department arrived as plain text, so it has no levels for nlevels() to count. Add stringsAsFactors = TRUE to your read.csv() call and it becomes a factor.")
        } else if (isTRUE(all.equal(n_employees, ncol(d), tolerance = 1e-6, check.attributes = FALSE)) && ncol(d) != nrow(d)) {
          list(pass = FALSE, message = paste0("n_employees is ", n_employees, ", which is the number of columns. Each row is one employee, so you want nrow()."))
        } else if (!isTRUE(all.equal(n_employees, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_employees is ", n_employees, ", but the file holds ", nrow(d), " employees."))
        } else if (isTRUE(all.equal(n_departments, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "length(employees$department) gives one entry per employee - the whole column. The number of departments is the number of distinct values it can take: nlevels().")
        } else if (!isTRUE(all.equal(n_departments, nlevels(d$department), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_departments is ", n_departments, ", but there are ", nlevels(d$department), " departments."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", nrow(d), " employees in ", nlevels(d$department), " departments (", paste(levels(d$department), collapse = ", "), "). Those four names are the levels of the factor, and R will keep them in that order everywhere - in tables, in plots, and in every model you fit from Module 9 on."))
        }
      }
    `,
    hints: [
      'read.csv("data/workplace.csv", stringsAsFactors = TRUE) reads the file and turns the text columns into factors.',
      'Each row is one employee, so nrow() counts employees.',
      'A factor stores its possible values as levels; nlevels() counts them.',
    ],
  },
  {
    id: 'm2-1-b',
    prompt:
      'How many people work remotely? Store the counts of the remote column in remote_counts, and the number of remote employees alone in n_remote.',
    starterCode:
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Count the two kinds of employee, then pull out the remote one.\nremote_counts <- \nn_remote <- ',
    solution:
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- remote_counts[["Yes"]]',
    wrongAnswers: [
      // The first level is No, not Yes: factor levels are alphabetical.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- remote_counts[[1]]',
      // length() of a comparison counts the employees, not the TRUEs.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- length(employees$remote == "Yes")',
      // Proportions where counts were asked for.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote) / nrow(employees)\nn_remote <- remote_counts[["Yes"]]',
    ],
    alternateSolutions: [
      // Single brackets keep the name; the value is the same.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- remote_counts["Yes"]',
      // Compare then sum, without touching the table at all.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- sum(employees$remote == "Yes")',
    ],
    check: `
      if (!has_answer("remote_counts") || !has_answer("n_remote")) {
        list(pass = FALSE, message = "I need remote_counts (the two counts) and n_remote (how many work remotely).")
      } else {
        remote_counts <- answer("remote_counts")
        n_remote <- as.vector(answer("n_remote"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected <- table(d$remote)
        if (length(remote_counts) != 2L) {
          list(pass = FALSE, message = paste0("remote_counts has ", length(remote_counts), " entries. remote has two levels, No and Yes, so counting it gives two numbers."))
        } else if (!setequal(names(remote_counts), names(expected))) {
          list(pass = FALSE, message = "remote_counts should be labelled No and Yes. Count the remote column, not another one.")
        } else if (isTRUE(all.equal(sum(as.vector(remote_counts)), 1, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your two numbers add up to 1, so they are proportions. The question asks for counts - how many people, not what share of them.")
        } else if (!isTRUE(all.equal(as.vector(remote_counts[names(expected)]), as.vector(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("The counts do not match the file, which has ", expected[["No"]], " office-based and ", expected[["Yes"]], " remote employees."))
        } else if (!is.numeric(n_remote) || length(n_remote) != 1L) {
          list(pass = FALSE, message = "n_remote should be a single number.")
        } else if (isTRUE(all.equal(n_remote, as.vector(expected[["No"]]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the office-based count. Factor levels are alphabetical, so No comes first and position 1 is not the one you want. Ask for it by name instead: remote_counts[[\\"Yes\\"]].")
        } else if (isTRUE(all.equal(n_remote, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is everybody. employees$remote == \\"Yes\\" gives one TRUE or FALSE per person, so length() reports all of them; sum() counts the TRUEs.")
        } else if (!isTRUE(all.equal(n_remote, as.vector(expected[["Yes"]]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_remote is ", n_remote, ", but ", expected[["Yes"]], " employees work remotely."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", expected[["Yes"]], " of ", nrow(d), " work remotely. Indexing a table by name rather than by position is a habit worth forming - the order of the levels is not something you chose."))
        }
      }
    `,
    hints: [
      'table() counts how often each level of a factor appears: table(employees$remote).',
      'A table can be indexed by the name of a level, with double square brackets.',
      'Levels are alphabetical, so No is first and Yes is second. Ask for the name, not the position.',
    ],
  },
  {
    id: 'm2-2-a',
    prompt:
      'Build sales_remote: the employees in Sales who work remotely, keeping only the columns employee_id, tenure_years and wellbeing. Store its number of rows in n_sales_remote.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Two conditions, then three columns.\nsales_remote <- employees %>%\n  \nn_sales_remote <- ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales", remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
    wrongAnswers: [
      // A vertical bar is OR: everyone in Sales plus everyone remote.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales" | remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
      // The filtering columns kept as well, which was not asked for.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales", remote == "Yes") %>%\n  select(employee_id, department, remote, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
      // The count taken from the table that was never filtered.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales", remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(employees)',
    ],
    alternateSolutions: [
      // Two filters in a row mean the same as one filter with two conditions.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales") %>%\n  filter(remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
      // Base R subsetting: rows before the comma, columns after it.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees[employees$department == "Sales" & employees$remote == "Yes", c("employee_id", "tenure_years", "wellbeing")]\nn_sales_remote <- nrow(sales_remote)',
    ],
    check: `
      if (!has_answer("sales_remote") || !has_answer("n_sales_remote")) {
        list(pass = FALSE, message = "I need sales_remote (the filtered table) and n_sales_remote (its row count).")
      } else {
        sales_remote <- answer("sales_remote")
        n_sales_remote <- as.vector(answer("n_sales_remote"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        keep <- d$department == "Sales" & d$remote == "Yes"
        expected_ids <- sort(as.vector(d$employee_id[keep]))
        either <- sum(d$department == "Sales" | d$remote == "Yes")
        wanted <- c("employee_id", "tenure_years", "wellbeing")
        if (!is.data.frame(sales_remote)) {
          list(pass = FALSE, message = "sales_remote should be a data frame.")
        } else if (!all(wanted %in% names(sales_remote))) {
          list(pass = FALSE, message = "sales_remote should keep employee_id, tenure_years and wellbeing. At least one of them is missing.")
        } else if (nrow(sales_remote) == either) {
          list(pass = FALSE, message = paste0("You have ", either, " rows, which is everyone who is in Sales OR works remotely. A comma between two conditions in filter() means AND; a vertical bar means OR."))
        } else if (nrow(sales_remote) == nrow(d)) {
          list(pass = FALSE, message = "sales_remote still holds every employee. filter() returns a new table - make sure you assigned its result.")
        } else if (!isTRUE(all.equal(sort(as.vector(sales_remote$employee_id)), expected_ids, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sales_remote holds ", nrow(sales_remote), " employees, but ", length(expected_ids), " people are in Sales and remote. Check both conditions."))
        } else if (ncol(sales_remote) != 3L) {
          list(pass = FALSE, message = paste0("The right people, but ", ncol(sales_remote), " columns instead of three. select() lists what you keep; the columns you filtered on do not have to be among them, because filtering already happened."))
        } else if (!is.numeric(n_sales_remote) || length(n_sales_remote) != 1L) {
          list(pass = FALSE, message = "n_sales_remote should be a single number.")
        } else if (isTRUE(all.equal(n_sales_remote, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You counted the rows of employees, not of sales_remote. Count the table you built.")
        } else if (!isTRUE(all.equal(n_sales_remote, length(expected_ids), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_sales_remote is ", n_sales_remote, ", but sales_remote has ", nrow(sales_remote), " rows."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", length(expected_ids), " remote employees in Sales. Note how the pipe reads in the order the work happens - take the employees, then keep some rows, then keep some columns."))
        }
      }
    `,
    hints: [
      'filter() chooses rows. Two conditions separated by a comma both have to hold.',
      'select() chooses columns, and you name them without quotes: select(employee_id, tenure_years, wellbeing).',
      'Chain them with the pipe, then count with nrow(sales_remote).',
    ],
  },
  {
    id: 'm2-2-b',
    prompt:
      'Every employee was measured twice. Add a column engagement_change holding engagement_t2 minus engagement_t1, store the whole table in with_change, and store the mean change in mean_change.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Add a column, keep every row, then average the new column.\nwith_change <- \nmean_change <- ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  mutate(engagement_change = engagement_t2 - engagement_t1)\nmean_change <- mean(with_change$engagement_change)',
    wrongAnswers: [
      // The result of mutate() never assigned: with_change is the untouched table.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nemployees %>% mutate(engagement_change = engagement_t2 - engagement_t1)\nwith_change <- employees\nmean_change <- mean(employees$engagement_t2 - employees$engagement_t1)',
      // Subtracted the other way round: the change comes out negative.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  mutate(engagement_change = engagement_t1 - engagement_t2)\nmean_change <- mean(with_change$engagement_change)',
      // summarise() where mutate() was meant: 480 rows collapse to one.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  summarise(engagement_change = mean(engagement_t2 - engagement_t1))\nmean_change <- with_change$engagement_change',
    ],
    alternateSolutions: [
      // Base R: assign into a new column by name.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees\nwith_change$engagement_change <- with_change$engagement_t2 - with_change$engagement_t1\nmean_change <- mean(with_change$engagement_change)',
      // The mean taken with a dplyr summary rather than mean() on the column.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  mutate(engagement_change = engagement_t2 - engagement_t1)\nmean_change <- with_change %>% summarise(m = mean(engagement_change)) %>% pull(m)',
    ],
    check: `
      if (!has_answer("with_change") || !has_answer("mean_change")) {
        list(pass = FALSE, message = "I need with_change (the table with the new column) and mean_change (the average change).")
      } else {
        with_change <- answer("with_change")
        mean_change <- as.vector(answer("mean_change"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected <- d$engagement_t2 - d$engagement_t1
        if (!is.data.frame(with_change)) {
          list(pass = FALSE, message = "with_change should be a data frame: the employees, with one extra column.")
        } else if (nrow(with_change) == 1L) {
          list(pass = FALSE, message = "with_change has a single row. summarise() collapses a table to one row per group; mutate() adds a column and keeps every row. You want mutate().")
        } else if (nrow(with_change) != nrow(d)) {
          list(pass = FALSE, message = paste0("with_change has ", nrow(with_change), " rows, but nobody was supposed to be dropped: the file has ", nrow(d), "."))
        } else if (!("engagement_change" %in% names(with_change))) {
          list(pass = FALSE, message = "There is no engagement_change column. mutate() does not modify a table in place - it returns a new one, and you have to store it with the arrow.")
        } else if (isTRUE(all.equal(as.vector(with_change$engagement_change), -expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You subtracted the other way round: that is time 1 minus time 2. Change means where they ended up minus where they started, engagement_t2 - engagement_t1.")
        } else if (!isTRUE(all.equal(as.vector(with_change$engagement_change), expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "engagement_change should be each employee's engagement_t2 minus their own engagement_t1, row by row.")
        } else if (!is.numeric(mean_change) || length(mean_change) != 1L) {
          list(pass = FALSE, message = "mean_change should be a single number.")
        } else if (!isTRUE(all.equal(mean_change, mean(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_change is ", round(mean_change, 3), ", but the mean of engagement_change is ", round(mean(expected), 3), "."))
        } else {
          list(pass = TRUE, message = paste0("Correct: engagement rose by ", round(mean(expected), 2), " points on average. Hold on to that number - Module 12 asks which of the two interventions earned it, and the answer is not what the two main effects suggest."))
        }
      }
    `,
    hints: [
      'mutate() adds or changes a column and returns the whole table: employees %>% mutate(new = a - b).',
      'The result has to be assigned, or it is printed and thrown away.',
      'Change is where they ended up minus where they started, so engagement_t2 comes first.',
    ],
  },
  {
    id: 'm2-3-a',
    prompt:
      'Reshape the two engagement columns into long form. Keep employee_id and department, put the column names into a column called time and the scores into one called engagement, store the result in long, and store its number of rows in n_long.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  \nn_long <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement")\nn_long <- nrow(long)',
    wrongAnswers: [
      // Only one of the two measurements moved, so nothing was really stacked.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = engagement_t1, names_to = "time", values_to = "engagement")\nn_long <- nrow(long)',
      // names_to and values_to swapped: the scores land in time and the labels in engagement.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "engagement", values_to = "time")\nn_long <- nrow(long)',
      // The row count taken from the wide table.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement")\nn_long <- nrow(employees)',
    ],
    alternateSolutions: [
      // A selection helper instead of naming both columns.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = starts_with("engagement"), names_to = "time", values_to = "engagement")\nn_long <- nrow(long)',
      // A range of adjacent columns, and no select() step at all.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  pivot_longer(cols = engagement_t1:engagement_t2, names_to = "time", values_to = "engagement") %>%\n  select(employee_id, department, time, engagement)\nn_long <- nrow(long)',
    ],
    check: `
      if (!has_answer("long") || !has_answer("n_long")) {
        list(pass = FALSE, message = "I need long (the reshaped table) and n_long (its row count).")
      } else {
        long <- answer("long")
        n_long <- as.vector(answer("n_long"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected_rows <- 2L * nrow(d)
        if (!is.data.frame(long)) {
          list(pass = FALSE, message = "long should be a data frame.")
        } else if (!all(c("time", "engagement") %in% names(long))) {
          list(pass = FALSE, message = "long needs a column called time and one called engagement. Those names come from names_to and values_to.")
        } else if (!is.numeric(long$engagement)) {
          list(pass = FALSE, message = "engagement holds text rather than numbers, which means the old column names ended up there. names_to names the column that receives the old NAMES; values_to names the column that receives the VALUES.")
        } else if (nrow(long) == nrow(d)) {
          list(pass = FALSE, message = paste0("long has ", nrow(d), " rows, the same as the wide table, so only one measurement moved. Both engagement columns have to go into cols."))
        } else if (nrow(long) != expected_rows) {
          list(pass = FALSE, message = paste0("long has ", nrow(long), " rows. Each of the ", nrow(d), " employees contributes two rows, one per time point, so there should be ", expected_rows, "."))
        } else if (length(unique(as.character(long$time))) != 2L) {
          list(pass = FALSE, message = paste0("time takes ", length(unique(as.character(long$time))), " distinct values, but there are two time points."))
        } else if (!isTRUE(all.equal(sum(long$engagement), sum(d$engagement_t1) + sum(d$engagement_t2), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "The numbers in engagement are not the two engagement columns stacked on top of one another.")
        } else if (!isTRUE(all.equal(n_long, expected_rows, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_long is ", n_long, ", but long has ", nrow(long), " rows. Count the long table, not the wide one."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", nrow(d), " employees times 2 time points is ", expected_rows, " rows. Every observation now has its own row, which is the shape ggplot2 wants in Module 4 and lmer() wants in Module 13."))
        }
      }
    `,
    hints: [
      'pivot_longer() takes cols (which columns to stack), names_to and values_to.',
      'Both engagement columns move: cols = c(engagement_t1, engagement_t2).',
      'names_to is the column that will hold engagement_t1 and engagement_t2 as labels; values_to holds the scores.',
    ],
  },
];
