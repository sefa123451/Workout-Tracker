export const STORAGE_KEY = 'workout-tracker-data-v1';
export const STORAGE_VERSION = 1;
export const DEFAULT_WEEKLY_WORKOUT_GOAL = 4;
export const MAX_WEEKLY_WORKOUT_GOAL = 14;

const dashboardDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function createId() {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSet() {
  return {
    id: createId(),
    weight: '',
    reps: '',
    completed: false,
  };
}

export function createWorkoutEntry(exerciseId = '', setCount = 1) {
  return {
    id: createId(),
    exerciseId,
    sets: Array.from({ length: Math.max(1, setCount) }, () => createSet()),
  };
}

export function createSetFromValues(weight, reps) {
  return {
    id: createId(),
    weight: String(weight),
    reps: String(reps),
    completed: false,
  };
}

export function parseInputDate(value) {
  if (typeof value !== 'string') {
    return new Date(Number.NaN);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return new Date(Number.NaN);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return parsedDate;
}

export function getInputValueFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayInputValue() {
  return getInputValueFromDate(new Date());
}

export function createWorkoutForm() {
  return {
    date: getTodayInputValue(),
    splitId: '',
    notes: '',
    mood: '',
    effort: '',
    entries: [createWorkoutEntry()],
    skippedEntries: [],
  };
}

export function normalizeWeeklyWorkoutGoal(value) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    return DEFAULT_WEEKLY_WORKOUT_GOAL;
  }

  return Math.min(MAX_WEEKLY_WORKOUT_GOAL, Math.max(1, parsedValue));
}

export function normalizePositiveNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function normalizePositiveInteger(value) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function normalizeWeightStep(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 2.5;
}

export function normalizeWeeklySplitTarget(value) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? Math.min(parsedValue, 7) : 1;
}

export function createWorkoutFormFromTemplate(template) {
  return {
    date: getTodayInputValue(),
    splitId: typeof template.splitId === 'string' ? template.splitId : '',
    notes: typeof template.notes === 'string' ? template.notes : '',
    mood: '',
    effort: '',
    entries: template.entries.map((entry) => ({
      id: createId(),
      exerciseId: entry.exerciseId,
      sets:
        entry.sets.length > 0
          ? entry.sets.map((set) => ({
              id: createId(),
              weight: String(set.weight),
              reps: String(set.reps),
              completed: false,
            }))
          : [createSet()],
    })),
    skippedEntries: [],
  };
}

export function createWorkoutFormFromWorkout(workout) {
  return {
    date: workout.date,
    splitId: typeof workout.splitId === 'string' ? workout.splitId : '',
    notes: typeof workout.notes === 'string' ? workout.notes : '',
    mood: typeof workout.mood === 'string' ? workout.mood : '',
    effort: typeof workout.effort === 'string' ? workout.effort : '',
    entries: workout.entries.map((entry) => ({
      id: createId(),
      exerciseId: entry.exerciseId,
      sets:
        entry.sets.length > 0
          ? entry.sets.map((set) => ({
              id: createId(),
              weight: String(set.weight),
              reps: String(set.reps),
              completed: false,
            }))
          : [createSet()],
    })),
    skippedEntries: [],
  };
}

export function createSplitExercise(exerciseId = '', defaultSets = 3) {
  return {
    id: createId(),
    exerciseId,
    defaultSets: String(defaultSets),
  };
}

export function createSplitForm() {
  return {
    name: '',
    weeklyTarget: '1',
    exercises: [createSplitExercise()],
  };
}

export function createSplitFormFromSplit(split) {
  return {
    name: split.name,
    weeklyTarget: String(split.weeklyTarget ?? 1),
    exercises:
      split.exercises.length > 0
        ? split.exercises.map((exercise) => ({
            id: createId(),
            exerciseId: exercise.exerciseId,
            defaultSets: String(exercise.defaultSets),
          }))
        : [createSplitExercise()],
  };
}

export function buildWorkoutEntriesFromSplit(split) {
  if (!split) {
    return [createWorkoutEntry()];
  }

  if (!split.exercises.length) {
    return [];
  }

  return split.exercises.map((exercise) =>
    createWorkoutEntry(exercise.exerciseId, exercise.defaultSets),
  );
}

export function getNormalizedName(value, fallback = '') {
  return (typeof value === 'string' ? value.trim() : fallback).toLowerCase();
}

export function hasDuplicateIds(items) {
  const ids = new Set();

  for (const item of items) {
    if (ids.has(item.id)) {
      return true;
    }

    ids.add(item.id);
  }

  return false;
}

export function sortBodyweightEntries(entries) {
  return [...entries].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt),
  );
}

export function normalizeWorkoutTemplate(rawTemplate) {
  if (!rawTemplate || typeof rawTemplate !== 'object') {
    return null;
  }

  const name = typeof rawTemplate.name === 'string' ? rawTemplate.name.trim() : '';

  if (!name) {
    return null;
  }

  const entries = Array.isArray(rawTemplate.entries)
    ? rawTemplate.entries
        .map((rawEntry) => {
          if (
            !rawEntry ||
            typeof rawEntry !== 'object' ||
            typeof rawEntry.exerciseId !== 'string'
          ) {
            return null;
          }

          const sets = Array.isArray(rawEntry.sets)
            ? rawEntry.sets.map(normalizeSet).filter(Boolean)
            : [];

          if (!rawEntry.exerciseId || sets.length === 0) {
            return null;
          }

          return {
            exerciseId: rawEntry.exerciseId,
            sets,
          };
        })
        .filter(Boolean)
    : [];

  if (entries.length === 0) {
    return null;
  }

  const chosenExerciseIds = entries.map((entry) => entry.exerciseId);

  if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
    return null;
  }

  return {
    id: typeof rawTemplate.id === 'string' && rawTemplate.id ? rawTemplate.id : createId(),
    name,
    splitId: typeof rawTemplate.splitId === 'string' ? rawTemplate.splitId : '',
    notes: typeof rawTemplate.notes === 'string' ? rawTemplate.notes.trim() : '',
    createdAt:
      typeof rawTemplate.createdAt === 'string' && rawTemplate.createdAt
        ? rawTemplate.createdAt
        : new Date().toISOString(),
    entries,
  };
}

export function normalizeExercise(rawExercise) {
  if (!rawExercise || typeof rawExercise !== 'object') {
    return null;
  }

  const name = typeof rawExercise.name === 'string' ? rawExercise.name.trim() : '';

  if (!name) {
    return null;
  }

  return {
    id: typeof rawExercise.id === 'string' && rawExercise.id ? rawExercise.id : createId(),
    name,
    targetWeight: normalizePositiveNumber(rawExercise.targetWeight),
    targetRepMin: normalizePositiveInteger(rawExercise.targetRepMin),
    targetRepMax: normalizePositiveInteger(rawExercise.targetRepMax),
    weightStep: normalizeWeightStep(rawExercise.weightStep),
    createdAt:
      typeof rawExercise.createdAt === 'string' && rawExercise.createdAt
        ? rawExercise.createdAt
        : new Date().toISOString(),
  };
}

export function normalizeSplit(rawSplit) {
  if (!rawSplit || typeof rawSplit !== 'object') {
    return null;
  }

  const name = typeof rawSplit.name === 'string' ? rawSplit.name.trim() : '';

  if (!name) {
    return null;
  }

  const exercises = Array.isArray(rawSplit.exercises)
    ? rawSplit.exercises
        .map((rawExercise) => {
          if (
            !rawExercise ||
            typeof rawExercise !== 'object' ||
            typeof rawExercise.exerciseId !== 'string' ||
            !rawExercise.exerciseId
          ) {
            return null;
          }

          const defaultSets = Number(rawExercise.defaultSets);

          if (!Number.isInteger(defaultSets) || defaultSets < 1) {
            return null;
          }

          return {
            id: typeof rawExercise.id === 'string' && rawExercise.id ? rawExercise.id : createId(),
            exerciseId: rawExercise.exerciseId,
            defaultSets,
          };
        })
        .filter(Boolean)
    : [];

  if (
    Array.isArray(rawSplit.exercises) &&
    rawSplit.exercises.length > 0 &&
    exercises.length === 0
  ) {
    return null;
  }

  const chosenExerciseIds = exercises.map((exercise) => exercise.exerciseId);

  if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
    return null;
  }

  return {
    id: typeof rawSplit.id === 'string' && rawSplit.id ? rawSplit.id : createId(),
    name,
    weeklyTarget: normalizeWeeklySplitTarget(rawSplit.weeklyTarget),
    createdAt:
      typeof rawSplit.createdAt === 'string' && rawSplit.createdAt
        ? rawSplit.createdAt
        : new Date().toISOString(),
    exercises,
  };
}

export function normalizeSet(rawSet) {
  if (!rawSet || typeof rawSet !== 'object') {
    return null;
  }

  const weight = Number(rawSet.weight);
  const reps = Number(rawSet.reps);

  if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
    return null;
  }

  if (weight < 0 || reps < 0 || !Number.isInteger(reps)) {
    return null;
  }

  return { weight, reps };
}

export function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = parseInputDate(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function normalizeBodyweightEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== 'object') {
    return null;
  }

  const date = typeof rawEntry.date === 'string' ? rawEntry.date : '';
  const weight = Number(rawEntry.weight);

  if (!isValidDateInput(date) || !Number.isFinite(weight) || weight <= 0) {
    return null;
  }

  return {
    id: typeof rawEntry.id === 'string' && rawEntry.id ? rawEntry.id : createId(),
    date,
    weight: Number(weight.toFixed(1)),
    createdAt:
      typeof rawEntry.createdAt === 'string' && rawEntry.createdAt
        ? rawEntry.createdAt
        : new Date().toISOString(),
  };
}

export function normalizeWorkout(rawWorkout) {
  if (!rawWorkout || typeof rawWorkout !== 'object') {
    return null;
  }

  const date = typeof rawWorkout.date === 'string' ? rawWorkout.date : '';

  if (!isValidDateInput(date)) {
    return null;
  }

  const entries = Array.isArray(rawWorkout.entries)
    ? rawWorkout.entries
        .map((rawEntry) => {
          if (
            !rawEntry ||
            typeof rawEntry !== 'object' ||
            typeof rawEntry.exerciseId !== 'string'
          ) {
            return null;
          }

          const sets = Array.isArray(rawEntry.sets)
            ? rawEntry.sets.map(normalizeSet).filter(Boolean)
            : [];

          if (!rawEntry.exerciseId || sets.length === 0) {
            return null;
          }

          return {
            exerciseId: rawEntry.exerciseId,
            sets,
          };
        })
        .filter(Boolean)
    : [];

  if (entries.length === 0) {
    return null;
  }

  const chosenExerciseIds = entries.map((entry) => entry.exerciseId);

  if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
    return null;
  }

  const mood = typeof rawWorkout.mood === 'string' ? rawWorkout.mood.trim() : '';
  const effort = typeof rawWorkout.effort === 'string' ? rawWorkout.effort.trim() : '';

  return {
    id: typeof rawWorkout.id === 'string' && rawWorkout.id ? rawWorkout.id : createId(),
    date,
    splitId: typeof rawWorkout.splitId === 'string' ? rawWorkout.splitId : '',
    notes: typeof rawWorkout.notes === 'string' ? rawWorkout.notes.trim() : '',
    mood,
    effort,
    createdAt:
      typeof rawWorkout.createdAt === 'string' && rawWorkout.createdAt
        ? rawWorkout.createdAt
        : new Date().toISOString(),
    entries,
  };
}

export function sortWorkouts(workouts) {
  function parseTimestamp(value) {
    if (typeof value !== 'string' || !value) {
      return Number.NaN;
    }

    return Date.parse(value);
  }

  function parseWorkoutDate(value) {
    const parsedDate = parseInputDate(value);
    return parsedDate.getTime();
  }

  return [...workouts].sort((left, right) => {
    const leftDateTimestamp = parseWorkoutDate(left?.date);
    const rightDateTimestamp = parseWorkoutDate(right?.date);

    if (Number.isFinite(leftDateTimestamp) && Number.isFinite(rightDateTimestamp)) {
      const dateTimestampCompare = rightDateTimestamp - leftDateTimestamp;
      if (dateTimestampCompare !== 0) {
        return dateTimestampCompare;
      }
    } else if (Number.isFinite(leftDateTimestamp) || Number.isFinite(rightDateTimestamp)) {
      return Number.isFinite(leftDateTimestamp) ? -1 : 1;
    }

    const dateCompare = String(right?.date ?? '').localeCompare(String(left?.date ?? ''));

    if (dateCompare !== 0) {
      return dateCompare;
    }

    const leftCreatedTimestamp = parseTimestamp(left?.createdAt);
    const rightCreatedTimestamp = parseTimestamp(right?.createdAt);

    if (Number.isFinite(leftCreatedTimestamp) && Number.isFinite(rightCreatedTimestamp)) {
      const createdTimestampCompare = rightCreatedTimestamp - leftCreatedTimestamp;
      if (createdTimestampCompare !== 0) {
        return createdTimestampCompare;
      }
    } else if (Number.isFinite(leftCreatedTimestamp) || Number.isFinite(rightCreatedTimestamp)) {
      return Number.isFinite(leftCreatedTimestamp) ? -1 : 1;
    }

    const createdAtCompare = String(right?.createdAt ?? '').localeCompare(
      String(left?.createdAt ?? ''),
    );

    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return String(right?.id ?? '').localeCompare(String(left?.id ?? ''));
  });
}

export function formatDisplayDate(value) {
  const date = parseInputDate(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return dashboardDateFormatter.format(date);
}

export function formatCalendarDate(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return dashboardDateFormatter.format(date);
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDelta(value) {
  if (value === 0) {
    return '0';
  }

  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

export function parseSet(set) {
  const weightValue = String(set.weight).trim();
  const repsValue = String(set.reps).trim();

  if (!weightValue && !repsValue) {
    return { empty: true };
  }

  if (!weightValue || !repsValue) {
    return { error: 'Each set needs both a weight and a reps value.' };
  }

  const weight = Number(weightValue);
  const reps = Number(repsValue);

  if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
    return { error: 'Weight and reps must be valid numbers.' };
  }

  if (weight < 0 || reps < 0) {
    return { error: 'Weight and reps cannot be negative.' };
  }

  if (!Number.isInteger(reps)) {
    return { error: 'Reps must be a whole number.' };
  }

  return {
    value: {
      weight,
      reps,
    },
  };
}

export function getEntryMetrics(entry) {
  const bestWeight = entry.sets.reduce((max, set) => Math.max(max, set.weight), 0);
  const bestReps = entry.sets.reduce((max, set) => Math.max(max, set.reps), 0);
  const totalVolume = entry.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);

  return {
    bestWeight,
    bestReps,
    totalVolume,
  };
}

export function hasPersonalRecord(personalRecords) {
  return personalRecords.weight || personalRecords.reps || personalRecords.volume;
}

export function hasImprovement(improvements) {
  return improvements.weight || improvements.reps || improvements.volume;
}
