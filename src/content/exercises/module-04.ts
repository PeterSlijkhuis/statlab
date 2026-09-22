import type { ExerciseDef } from '../../r/checker';

export const module04: ExerciseDef[] = [
  {
    id: 'm4-1-a',
    prompt:
      'Draw the distribution of wellbeing: a histogram with 20 bins, stored in wellbeing_plot.',
    starterCode:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  ',
    solution:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  geom_histogram(bins = 20)',
    wrongAnswers: [
      // The setup with no layer: axes, no bars.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing))',
      // The wrong column binned.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = workload)) +\n  geom_histogram(bins = 20)',
      // A density curve, which is a different picture of the same column.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  geom_density()',
      // The default 30 bins, with the argument forgotten.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  geom_histogram()',
    ],
    alternateSolutions: [
      // The mapping declared in the layer rather than in ggplot().
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees) +\n  geom_histogram(aes(x = wellbeing), bins = 20)',
      // Positional arguments throughout.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(data = employees, mapping = aes(wellbeing)) +\n  geom_histogram(bins = 20)',
    ],
    check: `
      if (!has_answer("wellbeing_plot")) {
        list(pass = FALSE, message = "I could not find an object called wellbeing_plot.")
      } else {
        p <- answer("wellbeing_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "wellbeing_plot should be the plot object itself - what ggplot() plus a layer returns.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers, so it draws an empty panel with axes and nothing in them. ggplot() sets up the data and the mapping; a geom_ layer is what puts ink on the page.")
        } else if (!inherits(p$layers[[1]]$stat, "StatBin")) {
          list(pass = FALSE, message = "The first layer is not a histogram. geom_histogram() cuts the values into bins and draws a bar per bin; geom_density() smooths them into a curve instead, which is a different picture with different choices behind it.")
        } else {
          ld <- ggplot2::layer_data(p, 1)
          if ("flipped_aes" %in% names(ld) && isTRUE(ld$flipped_aes[1])) {
            list(pass = FALSE, message = "Your histogram is drawn sideways, which happens when the variable is mapped to y. A histogram puts the variable on x; the counts it computes go on y.")
          } else if (nrow(ld) != 20L) {
            list(pass = FALSE, message = paste0("Your histogram has ", nrow(ld), " bins rather than 20. geom_histogram() defaults to 30, so the number has to be asked for: geom_histogram(bins = 20)."))
          } else if (!isTRUE(all.equal(sum(ld$count), nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("The bars account for ", sum(ld$count), " observations, but the file holds ", nrow(d), " employees."))
          } else {
            centre <- sum(ld$count * ld$x) / sum(ld$count)
            binw <- ld$xmax[1] - ld$xmin[1]
            candidates <- c("tenure_years", "workload", "autonomy", "wellbeing", "engagement_t1", "engagement_t2", "performance")
            gaps <- sapply(candidates, function(nm) abs(centre - mean(d[[nm]])))
            if (abs(centre - mean(d$wellbeing)) > binw) {
              list(pass = FALSE, message = paste0("The values you binned average about ", round(centre, 1), ", which is not wellbeing - it looks like ", names(which.min(gaps)), ". Check the variable inside aes()."))
            } else {
              list(pass = TRUE, message = paste0("Correct: 20 bins holding all ", nrow(d), " employees. Now change bins to 5, run it, and change it to 80. The data never moves; the shape you would describe in a report does. That is why the number of bins is a decision and not a default."))
            }
          }
        }
      }
    `,
    hints: [
      'ggplot(employees, aes(x = wellbeing)) sets up the data and says which column goes on x.',
      'A layer is added with a plus sign on the end of the line: + geom_histogram().',
      'geom_histogram() takes bins as an argument: geom_histogram(bins = 20).',
    ],
  },
  {
    id: 'm4-2-a',
    prompt:
      'Compare the four departments: a boxplot of wellbeing by department, stored in department_plot.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ndepartment_plot <- ggplot(employees, aes(x = department, y = wellbeing)) +\n  ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = department, y = wellbeing)) +\n  geom_boxplot()',
    wrongAnswers: [
      // The two axes the other way round: one box per wellbeing value is not the plot.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = wellbeing, y = department)) +\n  geom_boxplot()',
      // Bars of summed wellbeing, which is a number with no meaning.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = department, y = wellbeing)) +\n  geom_col()',
      // The wrong grouping variable.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = site, y = wellbeing)) +\n  geom_boxplot()',
    ],
    alternateSolutions: [
      // Positional aes, which is how most published code writes it.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(department, wellbeing)) +\n  geom_boxplot()',
      // Piped into ggplot(), with the mapping on the layer.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- employees %>%\n  ggplot() +\n  geom_boxplot(aes(x = department, y = wellbeing))',
    ],
    check: `
      if (!has_answer("department_plot")) {
        list(pass = FALSE, message = "I could not find an object called department_plot.")
      } else {
        p <- answer("department_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "department_plot should be the plot object itself.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers. Add + geom_boxplot().")
        } else if (!inherits(p$layers[[1]]$stat, "StatBoxplot")) {
          list(pass = FALSE, message = "The layer is not a boxplot. geom_col() draws a bar whose height is the total of the column, which for wellbeing scores is a number nobody wants; geom_boxplot() summarises each group by its quartiles.")
        } else {
          ld <- ggplot2::layer_data(p, 1)
          medians <- sort(as.vector(tapply(d$wellbeing, d$department, median)))
          if (!("middle" %in% names(ld))) {
            list(pass = FALSE, message = "Your boxes are drawn horizontally, which means wellbeing ended up on x. Put the grouping variable on x and the numbers on y.")
          } else if (nrow(ld) != nlevels(d$department)) {
            list(pass = FALSE, message = paste0("Your plot draws ", nrow(ld), " boxes, but there are ", nlevels(d$department), " departments. Check which variable is on x."))
          } else if (!isTRUE(all.equal(sort(as.vector(ld$middle)), medians, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "The lines inside the boxes are not the departments' median wellbeing. Check that wellbeing is the variable on y and department the one on x.")
          } else {
            list(pass = TRUE, message = paste0("Correct. The line in each box is the median you computed in Module 3, the box is the middle half of the department, and the dots beyond the whiskers are the tail you had to infer from numbers last module. The department with the highest line is not the one with the highest mean - here it is visible in one glance."))
          }
        }
      }
    `,
    hints: [
      'A boxplot needs a grouping variable and a number: aes(x = department, y = wellbeing).',
      'The layer is geom_boxplot(), with no arguments needed.',
      'If the boxes come out horizontal, the two variables are the wrong way round.',
    ],
  },
  {
    id: 'm4-2-b',
    prompt:
      'Compare performance in Sales and Engineering only, one panel each: filter to those two departments, then draw a histogram of performance with 15 bins and facet_wrap() by department. Store it in facet_plot.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ntwo_departments <- employees %>%\n  \nfacet_plot <- ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department %in% c("Sales", "Engineering"))\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(~ department)',
    wrongAnswers: [
      // No filter: all four departments get a panel.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(~ department)',
      // Colour instead of panels: everything overlaps in one picture.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department %in% c("Sales", "Engineering"))\nfacet_plot <- ggplot(two_departments, aes(x = performance, fill = department)) +\n  geom_histogram(bins = 15)',
      // Two panels, but not the two departments that were asked for.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department %in% c("Sales", "Support"))\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(~ department)',
    ],
    alternateSolutions: [
      // vars() instead of a formula.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department == "Sales" | department == "Engineering")\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(vars(department))',
      // Base subsetting, and the mapping declared on the layer.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees[employees$department %in% c("Sales", "Engineering"), ]\nfacet_plot <- ggplot(two_departments) +\n  geom_histogram(aes(x = performance), bins = 15) +\n  facet_wrap(~ department)',
    ],
    check: `
      if (!has_answer("facet_plot")) {
        list(pass = FALSE, message = "I could not find an object called facet_plot.")
      } else {
        p <- answer("facet_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        wanted <- c("Sales", "Engineering")
        expected_counts <- sort(as.vector(table(d$department)[wanted]))
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "facet_plot should be the plot object itself.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers. Add + geom_histogram(bins = 15).")
        } else if (!inherits(p$layers[[1]]$stat, "StatBin")) {
          list(pass = FALSE, message = "The first layer is not a histogram.")
        } else {
          ld <- ggplot2::layer_data(p, 1)
          panels <- droplevels(factor(ld$PANEL))
          per_panel <- sort(as.vector(tapply(ld$count, panels, sum)))
          if (nlevels(panels) == 1L) {
            list(pass = FALSE, message = "Everything is in one panel. Mapping department to fill or colour puts both departments in the same picture, where the bars sit on top of each other; facet_wrap(~ department) gives each department a panel of its own with the same axes.")
          } else if (nlevels(panels) != 2L) {
            list(pass = FALSE, message = paste0("Your plot has ", nlevels(panels), " panels. Only Sales and Engineering were asked for, so filter() before plotting - facet_wrap() draws a panel for every value it is given."))
          } else if (!isTRUE(all.equal(per_panel, expected_counts, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("Two panels, but they hold ", paste(per_panel, collapse = " and "), " employees rather than ", paste(expected_counts, collapse = " and "), ". Check which two departments you kept."))
          } else if (nrow(ld) != 30L) {
            list(pass = FALSE, message = paste0("Each panel should have 15 bins, so the layer should have 30 rows in total; it has ", nrow(ld), ". Set bins = 15 inside geom_histogram()."))
          } else {
            centre <- sum(ld$count * ld$x) / sum(ld$count)
            kept <- d[d$department %in% wanted, ]
            binw <- ld$xmax[1] - ld$xmin[1]
            if (abs(centre - mean(kept$performance)) > binw) {
              list(pass = FALSE, message = paste0("The binned values average about ", round(centre, 1), ", but performance in those two departments averages ", round(mean(kept$performance), 1), ". Check the variable inside aes()."))
            } else {
              list(pass = TRUE, message = "Correct. Both panels share an x axis and a y axis, which is what makes them comparable - two histograms drawn separately, each with its own scale, would not be.")
            }
          }
        }
      }
    `,
    hints: [
      'filter(department %in% c("Sales", "Engineering")) keeps two departments in one condition.',
      'facet_wrap(~ department) gives every remaining department its own panel.',
      'The panels only exist for values still in the data, so filter first and facet afterwards.',
    ],
  },
  {
    id: 'm4-3-a',
    prompt:
      'Build one figure you could paste into a report: wellbeing against autonomy as points, with a straight-line fit from geom_smooth(method = lm), axis labels written for a reader, and theme_classic(). Store it in apa_plot.',
    starterCode:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  ',
    solution:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth(method = lm) +\n  labs(\n    x = "Autonomy (self-reported, 1 to 10)",\n    y = "Wellbeing (0 to 100)"\n  ) +\n  theme_classic()',
    wrongAnswers: [
      // No labs(): the axes still carry the raw column names.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth(method = lm) +\n  theme_classic()',
      // geom_smooth() with no method: a loess curve, not a linear fit.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth() +\n  labs(x = "Autonomy (self-reported, 1 to 10)", y = "Wellbeing (0 to 100)") +\n  theme_classic()',
      // The default grey theme left in place.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth(method = lm) +\n  labs(x = "Autonomy (self-reported, 1 to 10)", y = "Wellbeing (0 to 100)")',
      // geom_line() joins the points instead of fitting anything.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_line() +\n  labs(x = "Autonomy (self-reported, 1 to 10)", y = "Wellbeing (0 to 100)") +\n  theme_classic()',
    ],
    alternateSolutions: [
      // method as a string, the band switched off, and the layers in the other order.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_smooth(method = "lm", se = FALSE) +\n  geom_point() +\n  labs(x = "Autonomy (1 to 10)", y = "Wellbeing (0 to 100)") +\n  theme_classic()',
      // xlab() and ylab() instead of labs().
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point() +\n  geom_smooth(method = lm) +\n  xlab("Autonomy rating") +\n  ylab("Wellbeing score") +\n  theme_classic()',
    ],
    check: `
      if (!has_answer("apa_plot")) {
        list(pass = FALSE, message = "I could not find an object called apa_plot.")
      } else {
        p <- answer("apa_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "apa_plot should be the plot object itself.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers.")
        } else {
          point_i <- which(vapply(p$layers, function(l) inherits(l$geom, "GeomPoint"), logical(1)))
          smooth_i <- which(vapply(p$layers, function(l) inherits(l$stat, "StatSmooth"), logical(1)))
          if (length(point_i) == 0L) {
            list(pass = FALSE, message = "There is no layer of points. geom_point() draws one point per employee, and a scatterplot without the points is a line with nothing to explain it.")
          } else {
            pd <- ggplot2::layer_data(p, point_i[1])
            if (nrow(pd) != nrow(d)) {
              list(pass = FALSE, message = paste0("The point layer draws ", nrow(pd), " points, but there are ", nrow(d), " employees."))
            } else if (!isTRUE(all.equal(sort(as.vector(pd$x)), sort(d$autonomy), tolerance = 1e-6, check.attributes = FALSE))) {
              list(pass = FALSE, message = "The variable on x is not autonomy.")
            } else if (!isTRUE(all.equal(sort(as.vector(pd$y)), sort(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
              list(pass = FALSE, message = "The variable on y is not wellbeing. The outcome - the thing you think is being affected - goes on y.")
            } else if (length(smooth_i) == 0L) {
              list(pass = FALSE, message = "There is no fitted line. geom_line() joins the points in the order they appear, which for 480 unordered employees is a scribble; geom_smooth() fits a model and draws that.")
            } else {
              sd_layer <- ggplot2::layer_data(p, smooth_i[1])
              steps <- diff(as.vector(sd_layer$y))
              spread <- max(1, diff(range(as.vector(sd_layer$y))))
              straight <- length(steps) > 2L && max(abs(diff(steps))) <= 1e-6 * spread
              labels <- p$labels
              if (is.null(labels$x) || is.null(labels$y)) labels <- ggplot2::ggplot_build(p)$plot$labels
              if (!straight) {
                list(pass = FALSE, message = "The fitted line bends, so it is not a linear fit. Left to itself geom_smooth() fits a loess curve, which is useful for looking but is not a model you can report a slope from. Ask for the linear model: geom_smooth(method = lm).")
              } else if (is.null(labels$x) || is.null(labels$y) ||
                         identical(labels$x, "autonomy") || identical(labels$y, "wellbeing")) {
                list(pass = FALSE, message = "The axes are still labelled with the column names. A figure has to be readable on its own, by someone who has never seen your data frame: labs(x = \\"Autonomy (1 to 10)\\", y = \\"Wellbeing (0 to 100)\\").")
              } else if (!inherits(p$theme$panel.grid, "element_blank")) {
                list(pass = FALSE, message = "The grey panel and its grid lines are still there. APA figures are drawn on white, with axis lines and no grid: add + theme_classic().")
              } else {
                list(pass = TRUE, message = "That figure could go in a report as it stands: the points show every employee, the line shows the model, the axes say what they mean, and nothing is drawn that carries no information. Module 9 fits exactly this line with lm() and tells you whether its slope is worth believing.")
              }
            }
          }
        }
      }
    `,
    hints: [
      'Two layers: geom_point() for the employees and geom_smooth(method = lm) for the line.',
      'labs(x = "...", y = "...") replaces the column names with something a reader understands.',
      'theme_classic() removes the grey panel and the grid, leaving the two axis lines.',
    ],
  },
];
