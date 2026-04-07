import { useMemo } from 'react';
import {
  buildProgressHistory,
  buildSplitProgressHistory,
  buildTrainingHeatmap,
  filterProgressHistoryByDays,
  getBodyweightSummary,
  getDashboardSummary,
  getProgressWindowSummary,
  getRecentPersonalRecords,
  getSplitProgressWindowSummary,
} from '../lib/workoutAnalytics.js';
import { sortWorkouts } from '../lib/workoutShared.js';

export function useTrackerDerivedData({
  exercises,
  splits,
  templates,
  workouts,
  bodyweightEntries,
  weeklyWorkoutGoal,
  lastUsedTemplateId,
  selectedExerciseId,
  selectedSplitProgressId,
  selectedProgressWindow,
}) {
  return useMemo(() => {
    const sortedWorkouts = sortWorkouts(workouts);
    const selectedExerciseHistory = selectedExerciseId
      ? buildProgressHistory(workouts, selectedExerciseId)
      : [];
    const selectedExerciseWindowHistory = filterProgressHistoryByDays(
      selectedExerciseHistory,
      selectedProgressWindow,
    );
    const selectedSplitHistory = selectedSplitProgressId
      ? buildSplitProgressHistory(workouts, selectedSplitProgressId)
      : [];
    const selectedSplitWindowHistory = filterProgressHistoryByDays(
      selectedSplitHistory,
      selectedProgressWindow,
    );
    const totalSetsLogged = workouts.reduce(
      (sum, workout) =>
        sum + workout.entries.reduce((entrySum, entry) => entrySum + entry.sets.length, 0),
      0,
    );
    const exerciseNameMap = new Map(
      exercises.map((exercise) => [exercise.id, exercise.name]),
    );
    const splitNameMap = new Map(splits.map((split) => [split.id, split.name]));

    return {
      sortedWorkouts,
      selectedExerciseHistory,
      selectedExerciseWindowHistory,
      selectedExerciseWindowSummary: getProgressWindowSummary(selectedExerciseWindowHistory),
      selectedSplitHistory,
      selectedSplitWindowHistory,
      selectedSplitWindowSummary: getSplitProgressWindowSummary(selectedSplitWindowHistory),
      totalSetsLogged,
      latestWorkout: sortedWorkouts[0] ?? null,
      lastUsedTemplate: templates.find((template) => template.id === lastUsedTemplateId) ?? null,
      dashboardSummary: getDashboardSummary(sortedWorkouts, weeklyWorkoutGoal, splits),
      bodyweightSummary: getBodyweightSummary(bodyweightEntries),
      historyHeatmap: buildTrainingHeatmap(sortedWorkouts, 84),
      historyPrTimeline: getRecentPersonalRecords(sortedWorkouts, 90, 8),
      getExerciseName(exerciseId) {
        return exerciseNameMap.get(exerciseId) ?? 'Unknown exercise (deleted)';
      },
      getSplitName(splitId) {
        if (!splitId) {
          return 'Custom workout';
        }

        return splitNameMap.get(splitId) ?? 'Unknown split (deleted)';
      },
    };
  }, [
    bodyweightEntries,
    exercises,
    lastUsedTemplateId,
    selectedExerciseId,
    selectedProgressWindow,
    selectedSplitProgressId,
    splits,
    templates,
    weeklyWorkoutGoal,
    workouts,
  ]);
}
