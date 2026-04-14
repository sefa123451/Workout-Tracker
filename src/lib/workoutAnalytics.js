import {
  DEFAULT_WEEKLY_WORKOUT_GOAL,
  formatDisplayDate,
  getEntryMetrics,
  getInputValueFromDate,
  parseInputDate,
  sortBodyweightEntries,
  sortWorkouts,
} from './workoutShared.js';

const weekdayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  year: 'numeric',
});

export function estimateOneRepMax(weight, reps) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
    return 0;
  }

  if (reps === 1) {
    return weight;
  }

  return weight * (1 + reps / 30);
}

function getBestSetFromSession(session) {
  if (!session?.sets?.length) {
    return null;
  }

  let bestSet = null;

  for (const set of session.sets) {
    const estimatedOneRepMax = estimateOneRepMax(set.weight, set.reps);

    if (
      !bestSet ||
      estimatedOneRepMax > bestSet.estimatedOneRepMax ||
      (estimatedOneRepMax === bestSet.estimatedOneRepMax && set.weight > bestSet.weight) ||
      (estimatedOneRepMax === bestSet.estimatedOneRepMax &&
        set.weight === bestSet.weight &&
        set.reps > bestSet.reps)
    ) {
      bestSet = {
        weight: set.weight,
        reps: set.reps,
        estimatedOneRepMax,
      };
    }
  }

  return bestSet;
}

export function getLatestExerciseSession(workouts, exerciseId) {
  if (!exerciseId) {
    return null;
  }

  for (const workout of sortWorkouts(workouts)) {
    const entry = workout.entries.find((item) => item.exerciseId === exerciseId);

    if (!entry) {
      continue;
    }

    return {
      workoutId: workout.id,
      date: workout.date,
      sets: entry.sets,
      metrics: getEntryMetrics(entry),
    };
  }

  return null;
}

export function suggestNextSets(workouts, exerciseId, exercise = null) {
  const latest = getLatestExerciseSession(workouts, exerciseId);

  if (!latest || !latest.sets.length) {
    return null;
  }

  const sets = latest.sets;
  const targetRepMin = exercise?.targetRepMin ?? null;
  const targetRepMax = exercise?.targetRepMax ?? null;
  const weightStep = exercise?.weightStep ?? 2.5;
  const hasGoal = targetRepMin || targetRepMax;

  if (hasGoal) {
    const allSetsAtGoalTop = targetRepMax ? sets.every((set) => set.reps >= targetRepMax) : false;
    const hasSetsBelowGoalFloor = targetRepMin
      ? sets.some((set) => set.reps < targetRepMin)
      : false;

    if (allSetsAtGoalTop) {
      return {
        sets: sets.map((set) => ({
          weight: Number((set.weight + weightStep).toFixed(2)),
          reps: targetRepMin ?? set.reps,
        })),
        reason: 'Weight up',
      };
    }

    if (hasSetsBelowGoalFloor) {
      return {
        sets: sets.map((set) => ({
          weight: set.weight,
          reps: set.reps < targetRepMin ? set.reps + 1 : set.reps,
        })),
        reason: 'Build reps',
      };
    }

    return {
      sets: sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
      })),
      reason: 'Hold target',
    };
  }

  const firstRepsAtWeight = new Map();
  let repsDropped = false;

  for (const set of sets) {
    if (!firstRepsAtWeight.has(set.weight)) {
      firstRepsAtWeight.set(set.weight, set.reps);
    } else if (set.reps < firstRepsAtWeight.get(set.weight)) {
      repsDropped = true;
    }
  }

  if (!repsDropped) {
    return {
      sets: sets.map((set) => ({
        weight: set.weight + 2.5,
        reps: set.reps,
      })),
      reason: 'Weight up',
    };
  }

  return {
    sets: sets.map((set) => ({
      weight: set.weight,
      reps: set.reps < firstRepsAtWeight.get(set.weight) ? set.reps + 1 : set.reps,
    })),
    reason: 'Reps up',
  };
}

export function getStartOfWeek(dateValue = new Date()) {
  const start = new Date(dateValue);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);

  return start;
}

export function getStartOfCurrentWeek() {
  return getStartOfWeek(new Date());
}

function getStartOfMonth(dateValue = new Date()) {
  const start = new Date(dateValue);
  start.setHours(0, 0, 0, 0);
  start.setDate(1);
  return start;
}

function getCurrentWeekDays() {
  const weekStart = getStartOfCurrentWeek();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function getRecentDays(count) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return date;
  });
}

export function isDateInCurrentWeek(dateValue) {
  const weekStart = getStartOfCurrentWeek();
  return isDateInWeekRange(dateValue, weekStart);
}

function isDateInWeekRange(dateValue, weekStart) {
  const workoutDate = parseInputDate(dateValue);
  const nextWeekStart = new Date(weekStart);

  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  return workoutDate >= weekStart && workoutDate < nextWeekStart;
}

function getWeekKey(dateValue) {
  return getInputValueFromDate(getStartOfWeek(parseInputDate(dateValue)));
}

function getMonthKey(dateValue) {
  const date = parseInputDate(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentTrainingDayStreak(workouts) {
  const uniqueWorkoutDays = Array.from(new Set(workouts.map((workout) => workout.date))).sort(
    (left, right) => right.localeCompare(left),
  );

  if (!uniqueWorkoutDays.length) {
    return 0;
  }

  let streak = 1;
  let cursor = parseInputDate(uniqueWorkoutDays[0]);
  cursor.setHours(0, 0, 0, 0);

  for (let index = 1; index < uniqueWorkoutDays.length; index += 1) {
    const previousDay = new Date(cursor);
    previousDay.setDate(previousDay.getDate() - 1);

    if (getInputValueFromDate(previousDay) !== uniqueWorkoutDays[index]) {
      break;
    }

    streak += 1;
    cursor = previousDay;
  }

  return streak;
}

export function buildTrainingHeatmap(workouts, days = 28) {
  const recentActivityByDate = new Map();

  for (const workout of workouts) {
    recentActivityByDate.set(workout.date, {
      count: (recentActivityByDate.get(workout.date)?.count ?? 0) + 1,
      volume:
        (recentActivityByDate.get(workout.date)?.volume ?? 0) +
        workout.entries.reduce(
          (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
          0,
        ),
    });
  }

  const heatmapDays = getRecentDays(days);
  const heatmapMaxVolume = Math.max(
    ...heatmapDays.map(
      (date) => recentActivityByDate.get(getInputValueFromDate(date))?.volume ?? 0,
    ),
    1,
  );

  return heatmapDays.map((date) => {
    const dateValue = getInputValueFromDate(date);
    const dayActivity = recentActivityByDate.get(dateValue) ?? { count: 0, volume: 0 };
    const normalizedVolume = dayActivity.volume / heatmapMaxVolume;

    return {
      date: dateValue,
      label: weekdayLabelFormatter.format(date),
      count: dayActivity.count,
      volume: dayActivity.volume,
      level:
        dayActivity.count === 0
          ? 0
          : normalizedVolume < 0.25
            ? 1
            : normalizedVolume < 0.5
              ? 2
              : normalizedVolume < 0.75
                ? 3
                : 4,
    };
  });
}

export function getRecentPersonalRecords(workouts, days = 30, limit = 3) {
  const exerciseIds = new Set();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      exerciseIds.add(entry.exerciseId);
    }
  }

  return Array.from(exerciseIds)
    .flatMap((exerciseId) =>
      filterProgressHistoryByDays(buildProgressHistory(workouts, exerciseId), days)
        .filter(
          (session) =>
            session.personalRecords.weight ||
            session.personalRecords.reps ||
            session.personalRecords.volume,
        )
        .map((session) => ({
          exerciseId,
          date: session.date,
          labels: [
            session.personalRecords.weight ? 'Weight PR' : null,
            session.personalRecords.reps ? 'Reps PR' : null,
            session.personalRecords.volume ? 'Volume PR' : null,
          ].filter(Boolean),
        })),
    )
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
}

export function getBodyweightSummary(entries, days = 30) {
  const sortedEntries = sortBodyweightEntries(entries ?? []);
  const latestEntry = sortedEntries[0] ?? null;

  if (!latestEntry) {
    return {
      latestEntry: null,
      latestWeight: null,
      deltaInRange: null,
      recentEntries: [],
      entryCount: 0,
    };
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  const recentWindow = sortedEntries.filter((entry) => parseInputDate(entry.date) >= cutoff);
  const oldestInRange = recentWindow[recentWindow.length - 1] ?? null;
  const deltaInRange =
    recentWindow.length >= 2 && oldestInRange
      ? Number((latestEntry.weight - oldestInRange.weight).toFixed(1))
      : null;

  return {
    latestEntry,
    latestWeight: latestEntry.weight,
    deltaInRange,
    recentEntries: [...sortedEntries.slice(0, 6)].reverse(),
    entryCount: sortedEntries.length,
  };
}

export function getDashboardSummary(
  workouts,
  weeklyWorkoutGoal = DEFAULT_WEEKLY_WORKOUT_GOAL,
  splits = [],
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getStartOfCurrentWeek();
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const currentMonthStart = getStartOfMonth(new Date());
  const weeklyWorkouts = workouts.filter((workout) =>
    isDateInWeekRange(workout.date, currentWeekStart),
  );
  const previousWeekWorkouts = workouts.filter((workout) =>
    isDateInWeekRange(workout.date, previousWeekStart),
  );
  const monthlyWorkouts = workouts.filter(
    (workout) => parseInputDate(workout.date) >= currentMonthStart,
  );
  const exerciseCounts = new Map();
  const exerciseIds = new Set();
  const splitCounts = new Map();
  const splitMonthlyCounts = new Map();
  const splitMonthlyVolumes = new Map();
  const weekSummaries = new Map();
  const monthSummaries = new Map();

  for (const workout of workouts) {
    if (workout.splitId) {
      splitCounts.set(workout.splitId, (splitCounts.get(workout.splitId) ?? 0) + 1);
    }

    const workoutVolume = workout.entries.reduce(
      (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
      0,
    );
    const weekKey = getWeekKey(workout.date);
    const monthKey = getMonthKey(workout.date);
    const weekSummary = weekSummaries.get(weekKey) ?? { volume: 0, count: 0 };
    const monthSummary = monthSummaries.get(monthKey) ?? { volume: 0, count: 0 };

    weekSummaries.set(weekKey, {
      volume: weekSummary.volume + workoutVolume,
      count: weekSummary.count + 1,
    });
    monthSummaries.set(monthKey, {
      volume: monthSummary.volume + workoutVolume,
      count: monthSummary.count + 1,
    });

    for (const entry of workout.entries) {
      exerciseIds.add(entry.exerciseId);
      const current = exerciseCounts.get(entry.exerciseId) ?? {
        count: 0,
        latestDate: '',
      };

      exerciseCounts.set(entry.exerciseId, {
        count: current.count + 1,
        latestDate: workout.date > current.latestDate ? workout.date : current.latestDate,
      });
    }
  }

  let mostTrainedExercise = null;

  for (const [exerciseId, info] of exerciseCounts.entries()) {
    if (
      !mostTrainedExercise ||
      info.count > mostTrainedExercise.count ||
      (info.count === mostTrainedExercise.count && info.latestDate > mostTrainedExercise.latestDate)
    ) {
      mostTrainedExercise = {
        exerciseId,
        count: info.count,
        latestDate: info.latestDate,
      };
    }
  }

  const weeklyVolumeByDate = new Map();

  for (const workout of weeklyWorkouts) {
    const workoutVolume = workout.entries.reduce(
      (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
      0,
    );

    weeklyVolumeByDate.set(
      workout.date,
      (weeklyVolumeByDate.get(workout.date) ?? 0) + workoutVolume,
    );
  }

  for (const workout of monthlyWorkouts) {
    if (!workout.splitId) {
      continue;
    }

    const workoutVolume = workout.entries.reduce(
      (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
      0,
    );

    splitMonthlyCounts.set(workout.splitId, (splitMonthlyCounts.get(workout.splitId) ?? 0) + 1);
    splitMonthlyVolumes.set(
      workout.splitId,
      (splitMonthlyVolumes.get(workout.splitId) ?? 0) + workoutVolume,
    );
  }

  const recentPrHits = Array.from(exerciseIds).reduce((count, exerciseId) => {
    const recentHistory = filterProgressHistoryByDays(
      buildProgressHistory(workouts, exerciseId),
      30,
    );

    return (
      count +
      recentHistory.filter(
        (session) =>
          session.personalRecords.weight ||
          session.personalRecords.reps ||
          session.personalRecords.volume,
      ).length
    );
  }, 0);

  const totalVolumeThisWeek = weeklyWorkouts.reduce(
    (sum, workout) =>
      sum +
      workout.entries.reduce((entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume, 0),
    0,
  );
  const totalVolumeLastWeek = previousWeekWorkouts.reduce(
    (sum, workout) =>
      sum +
      workout.entries.reduce((entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume, 0),
    0,
  );
  const totalVolumeThisMonth = monthlyWorkouts.reduce(
    (sum, workout) =>
      sum +
      workout.entries.reduce((entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume, 0),
    0,
  );
  const currentWeekPrHits = Array.from(exerciseIds).reduce((count, exerciseId) => {
    const exerciseHistory = buildProgressHistory(workouts, exerciseId);

    return (
      count +
      exerciseHistory.filter(
        (session) =>
          isDateInWeekRange(session.date, currentWeekStart) &&
          (session.personalRecords.weight ||
            session.personalRecords.reps ||
            session.personalRecords.volume),
      ).length
    );
  }, 0);
  const weeklyTrend = getCurrentWeekDays().map((date) => {
    const dateValue = getInputValueFromDate(date);
    return {
      date: dateValue,
      label: weekdayLabelFormatter.format(date),
      volume: weeklyVolumeByDate.get(dateValue) ?? 0,
    };
  });
  const bestDay = weeklyTrend.reduce(
    (currentBest, day) => (day.volume > currentBest.volume ? day : currentBest),
    { label: '', volume: 0 },
  );
  const uniqueWeekKeys = Array.from(
    new Set(workouts.map((workout) => getWeekKey(workout.date))),
  ).sort((left, right) => right.localeCompare(left));
  let activeWeekStreak = 0;

  if (uniqueWeekKeys.length > 0) {
    let cursor = getStartOfWeek(parseInputDate(uniqueWeekKeys[0]));

    while (uniqueWeekKeys.includes(getInputValueFromDate(cursor))) {
      activeWeekStreak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
  }

  let longestActiveWeekStreak = 0;
  let currentRun = 0;
  let previousWeekKey = null;

  for (const weekKey of [...uniqueWeekKeys].reverse()) {
    if (!previousWeekKey) {
      currentRun = 1;
    } else {
      const previousWeekStartDate = getStartOfWeek(parseInputDate(previousWeekKey));
      previousWeekStartDate.setDate(previousWeekStartDate.getDate() + 7);
      currentRun = getInputValueFromDate(previousWeekStartDate) === weekKey ? currentRun + 1 : 1;
    }

    longestActiveWeekStreak = Math.max(longestActiveWeekStreak, currentRun);
    previousWeekKey = weekKey;
  }

  let mostUsedSplit = null;

  for (const [splitId, count] of splitCounts.entries()) {
    if (!mostUsedSplit || count > mostUsedSplit.count) {
      mostUsedSplit = { splitId, count };
    }
  }

  let topSplitThisMonth = null;

  for (const [splitId, count] of splitMonthlyCounts.entries()) {
    const volume = splitMonthlyVolumes.get(splitId) ?? 0;

    if (
      !topSplitThisMonth ||
      volume > topSplitThisMonth.volume ||
      (volume === topSplitThisMonth.volume && count > topSplitThisMonth.count)
    ) {
      topSplitThisMonth = { splitId, count, volume };
    }
  }

  const recentSplitHistory = workouts.filter((workout) => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 29);
    return parseInputDate(workout.date) >= cutoff && workout.splitId;
  });
  const recentSplitStats = new Map();

  for (const workout of recentSplitHistory) {
    const workoutVolume = workout.entries.reduce(
      (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
      0,
    );
    const current = recentSplitStats.get(workout.splitId) ?? {
      volume: 0,
      count: 0,
      latestDate: '',
    };

    recentSplitStats.set(workout.splitId, {
      volume: current.volume + workoutVolume,
      count: current.count + 1,
      latestDate: workout.date > current.latestDate ? workout.date : current.latestDate,
    });
  }

  let strongestRecentSplit = null;

  for (const [splitId, info] of recentSplitStats.entries()) {
    const averageVolume = info.volume / info.count;

    if (
      !strongestRecentSplit ||
      averageVolume > strongestRecentSplit.averageVolume ||
      (averageVolume === strongestRecentSplit.averageVolume &&
        info.latestDate > strongestRecentSplit.latestDate)
    ) {
      strongestRecentSplit = { splitId, ...info, averageVolume };
    }
  }

  let bestWeek = null;

  for (const [weekKey, info] of weekSummaries.entries()) {
    if (!bestWeek || info.volume > bestWeek.volume) {
      bestWeek = { key: weekKey, ...info };
    }
  }

  let bestMonth = null;

  for (const [monthKey, info] of monthSummaries.entries()) {
    if (!bestMonth || info.volume > bestMonth.volume) {
      bestMonth = { key: monthKey, ...info };
    }
  }

  let mostImprovedExercise = null;

  for (const exerciseId of exerciseIds) {
    const recentHistory = filterProgressHistoryByDays(
      buildProgressHistory(workouts, exerciseId),
      90,
    );
    const summary = getProgressWindowSummary(recentHistory);

    if (!summary?.comparison) {
      continue;
    }

    if (
      !mostImprovedExercise ||
      summary.comparison.volumeDelta > mostImprovedExercise.volumeDelta
    ) {
      mostImprovedExercise = {
        exerciseId,
        volumeDelta: summary.comparison.volumeDelta,
        weightDelta: summary.comparison.weightDelta,
        repsDelta: summary.comparison.repsDelta,
        sessionCount: summary.sessionCount,
      };
    }
  }

  const trainingHeatmap = buildTrainingHeatmap(workouts, 28);
  const latestPersonalRecords = getRecentPersonalRecords(workouts, 30, 3);
  const weeklySplitPlan = splits
    .filter((split) => (split.weeklyTarget ?? 1) > 0)
    .map((split) => {
      const completed = weeklyWorkouts.filter((workout) => workout.splitId === split.id).length;
      const target = split.weeklyTarget ?? 1;

      return {
        splitId: split.id,
        target,
        completed,
        remaining: Math.max(target - completed, 0),
        reached: completed >= target,
      };
    });
  const daysElapsedThisWeek = Math.min(
    7,
    Math.max(
      1,
      Math.floor((today.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    ),
  );
  const daysRemainingThisWeek = Math.max(7 - daysElapsedThisWeek, 0);
  const weeklyGoalRemaining = Math.max(weeklyWorkoutGoal - weeklyWorkouts.length, 0);
  const expectedSessionsByNow = weeklyWorkoutGoal * (daysElapsedThisWeek / 7);
  const weeklyGoalStatus =
    weeklyWorkouts.length >= weeklyWorkoutGoal
      ? 'Goal reached'
      : weeklyWorkouts.length >= expectedSessionsByNow
        ? 'On pace'
        : daysRemainingThisWeek === 0
          ? 'Last day'
          : 'Behind pace';

  return {
    lastTrainingDay: workouts[0]?.date ?? '',
    workoutsThisWeek: weeklyWorkouts.length,
    totalVolumeThisWeek,
    averageVolumeThisWeek: weeklyWorkouts.length ? totalVolumeThisWeek / weeklyWorkouts.length : 0,
    mostTrainedExercise,
    recentPrHits,
    currentWeekPrHits,
    latestPersonalRecords,
    totalVolumeLastWeek,
    totalVolumeThisMonth,
    weeklyWorkoutGoal,
    weeklyGoalRemaining,
    weeklyGoalProgress: Math.min(weeklyWorkouts.length / weeklyWorkoutGoal, 1),
    weeklyGoalReached: weeklyWorkouts.length >= weeklyWorkoutGoal,
    daysElapsedThisWeek,
    daysRemainingThisWeek,
    expectedSessionsByNow,
    weeklyGoalStatus,
    workoutsLastWeek: previousWeekWorkouts.length,
    workoutsThisMonth: monthlyWorkouts.length,
    volumeDeltaVsLastWeek: totalVolumeThisWeek - totalVolumeLastWeek,
    workoutDeltaVsLastWeek: weeklyWorkouts.length - previousWeekWorkouts.length,
    activeWeekStreak,
    longestActiveWeekStreak,
    mostUsedSplit,
    topSplitThisMonth,
    strongestRecentSplit,
    bestWeek,
    bestMonth,
    mostImprovedExercise,
    currentTrainingDayStreak: getCurrentTrainingDayStreak(workouts),
    trainingHeatmap,
    weeklySplitPlan,
    bestTrainingDayLabel: bestDay.volume ? bestDay.label : '',
    bestTrainingDayVolume: bestDay.volume,
    bestWeekLabel: bestWeek ? formatDisplayDate(bestWeek.key) : '',
    bestMonthLabel: bestMonth
      ? monthLabelFormatter.format(new Date(`${bestMonth.key}-01T00:00:00`))
      : '',
    weeklyVolumeTrend: weeklyTrend,
  };
}

export function buildProgressHistory(workouts, exerciseId) {
  const history = [];
  let recordBestWeight = 0;
  let recordBestReps = 0;
  let recordTotalVolume = 0;

  for (const workout of sortWorkouts(workouts).reverse()) {
    const entry = workout.entries.find((item) => item.exerciseId === exerciseId);

    if (!entry) {
      continue;
    }

    const metrics = getEntryMetrics(entry);
    const previous = history[history.length - 1];

    history.push({
      workoutId: workout.id,
      date: workout.date,
      sets: entry.sets,
      metrics,
      previousMetrics: previous ? previous.metrics : null,
      improvements: {
        weight: previous ? metrics.bestWeight > previous.metrics.bestWeight : false,
        reps: previous ? metrics.bestReps > previous.metrics.bestReps : false,
        volume: previous ? metrics.totalVolume > previous.metrics.totalVolume : false,
      },
      personalRecords: {
        weight: previous ? metrics.bestWeight > recordBestWeight : true,
        reps: previous ? metrics.bestReps > recordBestReps : true,
        volume: previous ? metrics.totalVolume > recordTotalVolume : true,
      },
    });

    recordBestWeight = Math.max(recordBestWeight, metrics.bestWeight);
    recordBestReps = Math.max(recordBestReps, metrics.bestReps);
    recordTotalVolume = Math.max(recordTotalVolume, metrics.totalVolume);
  }

  return history.reverse();
}

export function buildSplitProgressHistory(workouts, splitId) {
  const history = [];
  let recordTotalVolume = 0;

  for (const workout of sortWorkouts(workouts).reverse()) {
    if (workout.splitId !== splitId) {
      continue;
    }

    const metrics = {
      totalVolume: workout.entries.reduce(
        (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
        0,
      ),
      totalSets: workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0),
      totalExercises: workout.entries.length,
    };
    const previous = history[history.length - 1];

    history.push({
      workoutId: workout.id,
      date: workout.date,
      splitId,
      notes: workout.notes ?? '',
      metrics,
      previousMetrics: previous ? previous.metrics : null,
      improvements: {
        volume: previous ? metrics.totalVolume > previous.metrics.totalVolume : false,
        sets: previous ? metrics.totalSets > previous.metrics.totalSets : false,
        exercises: previous ? metrics.totalExercises > previous.metrics.totalExercises : false,
      },
      personalRecords: {
        volume: previous ? metrics.totalVolume > recordTotalVolume : true,
      },
    });

    recordTotalVolume = Math.max(recordTotalVolume, metrics.totalVolume);
  }

  return history.reverse();
}

export function filterProgressHistoryByDays(history, days) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return history.filter((session) => parseInputDate(session.date) >= cutoff);
}

export function getProgressWindowSummary(history) {
  if (!history.length) {
    return null;
  }

  const chronologicalHistory = [...history].reverse();
  const firstSession = chronologicalHistory[0];
  const latestSession = chronologicalHistory[chronologicalHistory.length - 1];
  const totalVolume = chronologicalHistory.reduce(
    (sum, session) => sum + session.metrics.totalVolume,
    0,
  );
  const bestVolume = chronologicalHistory.reduce(
    (max, session) => Math.max(max, session.metrics.totalVolume),
    0,
  );
  const bestWeight = chronologicalHistory.reduce(
    (max, session) => Math.max(max, session.metrics.bestWeight),
    0,
  );
  const bestReps = chronologicalHistory.reduce(
    (max, session) => Math.max(max, session.metrics.bestReps),
    0,
  );
  const bestVolumeSession = chronologicalHistory.reduce(
    (best, session) => (session.metrics.totalVolume > best.metrics.totalVolume ? session : best),
    chronologicalHistory[0],
  );
  const bestWeightSession = chronologicalHistory.reduce(
    (best, session) => (session.metrics.bestWeight > best.metrics.bestWeight ? session : best),
    chronologicalHistory[0],
  );
  const bestRepsSession = chronologicalHistory.reduce(
    (best, session) => (session.metrics.bestReps > best.metrics.bestReps ? session : best),
    chronologicalHistory[0],
  );
  const bestSet = chronologicalHistory.reduce((best, session) => {
    const sessionBestSet = getBestSetFromSession(session);

    if (!sessionBestSet) {
      return best;
    }

    if (
      !best ||
      sessionBestSet.estimatedOneRepMax > best.estimatedOneRepMax ||
      (sessionBestSet.estimatedOneRepMax === best.estimatedOneRepMax &&
        sessionBestSet.weight > best.weight) ||
      (sessionBestSet.estimatedOneRepMax === best.estimatedOneRepMax &&
        sessionBestSet.weight === best.weight &&
        sessionBestSet.reps > best.reps)
    ) {
      return {
        ...sessionBestSet,
        date: session.date,
      };
    }

    return best;
  }, null);

  return {
    sessionCount: history.length,
    personalRecordCount: chronologicalHistory.filter(
      (session) =>
        session.personalRecords.weight ||
        session.personalRecords.reps ||
        session.personalRecords.volume,
    ).length,
    averageVolume: totalVolume / chronologicalHistory.length,
    recentImprovementCount: chronologicalHistory.filter(
      (session) =>
        session.improvements.weight || session.improvements.reps || session.improvements.volume,
    ).length,
    bestVolume,
    bestVolumeDate: bestVolumeSession.date,
    bestSessionVolume: bestVolumeSession.metrics.totalVolume,
    bestSessionVolumeDate: bestVolumeSession.date,
    latestVolume: latestSession.metrics.totalVolume,
    bestWeight,
    bestWeightDate: bestWeightSession.date,
    latestWeight: latestSession.metrics.bestWeight,
    bestReps,
    bestRepsDate: bestRepsSession.date,
    latestReps: latestSession.metrics.bestReps,
    bestSetWeight: bestSet?.weight ?? 0,
    bestSetReps: bestSet?.reps ?? 0,
    bestSetDate: bestSet?.date ?? '',
    estimatedOneRepMax: bestSet?.estimatedOneRepMax ?? 0,
    comparison:
      chronologicalHistory.length > 1
        ? {
            firstDate: firstSession.date,
            weightDelta: latestSession.metrics.bestWeight - firstSession.metrics.bestWeight,
            repsDelta: latestSession.metrics.bestReps - firstSession.metrics.bestReps,
            volumeDelta: latestSession.metrics.totalVolume - firstSession.metrics.totalVolume,
          }
        : null,
  };
}

export function getSplitProgressWindowSummary(history) {
  if (!history.length) {
    return null;
  }

  const chronologicalHistory = [...history].reverse();
  const firstSession = chronologicalHistory[0];
  const latestSession = chronologicalHistory[chronologicalHistory.length - 1];
  const totalVolume = chronologicalHistory.reduce(
    (sum, session) => sum + session.metrics.totalVolume,
    0,
  );
  const totalSets = chronologicalHistory.reduce(
    (sum, session) => sum + session.metrics.totalSets,
    0,
  );
  const bestVolume = chronologicalHistory.reduce(
    (max, session) => Math.max(max, session.metrics.totalVolume),
    0,
  );
  const bestVolumeSession = chronologicalHistory.reduce(
    (best, session) => (session.metrics.totalVolume > best.metrics.totalVolume ? session : best),
    chronologicalHistory[0],
  );

  return {
    sessionCount: history.length,
    personalRecordCount: chronologicalHistory.filter((session) => session.personalRecords.volume)
      .length,
    recentImprovementCount: chronologicalHistory.filter(
      (session) =>
        session.improvements.volume || session.improvements.sets || session.improvements.exercises,
    ).length,
    averageVolume: totalVolume / chronologicalHistory.length,
    averageSets: totalSets / chronologicalHistory.length,
    bestVolume,
    bestVolumeDate: bestVolumeSession.date,
    latestVolume: latestSession.metrics.totalVolume,
    latestSets: latestSession.metrics.totalSets,
    latestExercises: latestSession.metrics.totalExercises,
    comparison:
      chronologicalHistory.length > 1
        ? {
            firstDate: firstSession.date,
            volumeDelta: latestSession.metrics.totalVolume - firstSession.metrics.totalVolume,
            setsDelta: latestSession.metrics.totalSets - firstSession.metrics.totalSets,
            exerciseDelta:
              latestSession.metrics.totalExercises - firstSession.metrics.totalExercises,
          }
        : null,
  };
}
