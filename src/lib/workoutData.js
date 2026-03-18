export const STORAGE_KEY = 'workout-tracker-data-v1';
export const STORAGE_VERSION = 1;

const dashboardDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});
const weekdayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

export function createId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSet() {
  return {
    id: createId(),
    weight: '',
    reps: '',
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
  };
}

export function parseInputDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function createWorkoutForm() {
  return {
    date: getTodayInputValue(),
    splitId: '',
    notes: '',
    entries: [createWorkoutEntry()],
    skippedEntries: [],
  };
}

export function createWorkoutFormFromTemplate(template) {
  return {
    date: getTodayInputValue(),
    splitId: typeof template.splitId === 'string' ? template.splitId : '',
    notes: typeof template.notes === 'string' ? template.notes : '',
    entries: template.entries.map((entry) => ({
      id: createId(),
      exerciseId: entry.exerciseId,
      sets:
        entry.sets.length > 0
          ? entry.sets.map((set) => ({
              id: createId(),
              weight: String(set.weight),
              reps: String(set.reps),
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
    entries: workout.entries.map((entry) => ({
      id: createId(),
      exerciseId: entry.exerciseId,
      sets:
        entry.sets.length > 0
          ? entry.sets.map((set) => ({
              id: createId(),
              weight: String(set.weight),
              reps: String(set.reps),
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
    exercises: [createSplitExercise()],
  };
}

export function createSplitFormFromSplit(split) {
  return {
    name: split.name,
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

function getNormalizedName(value, fallback = '') {
  return (typeof value === 'string' ? value.trim() : fallback).toLowerCase();
}

export function mergeImportedData(currentData, importedData) {
  const mergedExercises = [...currentData.exercises];
  const mergedSplits = [...currentData.splits];
  const mergedTemplates = [...currentData.templates];
  const existingWorkoutIds = new Set(currentData.workouts.map((workout) => workout.id));
  const existingExerciseIds = new Set(currentData.exercises.map((exercise) => exercise.id));
  const existingSplitIds = new Set(currentData.splits.map((split) => split.id));
  const existingTemplateIds = new Set(currentData.templates.map((template) => template.id));
  const exerciseIdMap = new Map();
  const splitIdMap = new Map();

  const existingExerciseIdsByName = new Map(
    currentData.exercises.map((exercise) => [getNormalizedName(exercise.name), exercise.id]),
  );

  for (const exercise of importedData.exercises) {
    const normalizedName = getNormalizedName(exercise.name);
    const existingId = existingExerciseIdsByName.get(normalizedName);

    if (existingId) {
      exerciseIdMap.set(exercise.id, existingId);
      continue;
    }

    const nextExerciseId = existingExerciseIds.has(exercise.id) ? createId() : exercise.id;
    mergedExercises.push({ ...exercise, id: nextExerciseId });
    existingExerciseIds.add(nextExerciseId);
    existingExerciseIdsByName.set(normalizedName, nextExerciseId);
    exerciseIdMap.set(exercise.id, nextExerciseId);
  }

  const existingSplitIdsByName = new Map(
    currentData.splits.map((split) => [getNormalizedName(split.name), split.id]),
  );

  for (const split of importedData.splits) {
    const normalizedName = getNormalizedName(split.name);
    const existingId = existingSplitIdsByName.get(normalizedName);

    if (existingId) {
      splitIdMap.set(split.id, existingId);
      continue;
    }

    const nextSplitId = existingSplitIds.has(split.id) ? createId() : split.id;
    const remappedSplit = {
      ...split,
      id: nextSplitId,
      exercises: split.exercises
        .map((exercise) => ({
          ...exercise,
          exerciseId: exerciseIdMap.get(exercise.exerciseId) ?? exercise.exerciseId,
        }))
        .filter((exercise) => exercise.exerciseId),
    };

    mergedSplits.push(remappedSplit);
    existingSplitIds.add(remappedSplit.id);
    existingSplitIdsByName.set(normalizedName, remappedSplit.id);
    splitIdMap.set(split.id, remappedSplit.id);
  }

  const existingTemplateNames = new Set(
    currentData.templates.map((template) => getNormalizedName(template.name)),
  );

  for (const template of importedData.templates ?? []) {
    const normalizedName = getNormalizedName(template.name);

    if (existingTemplateNames.has(normalizedName)) {
      continue;
    }

    const nextTemplateId = existingTemplateIds.has(template.id) ? createId() : template.id;
    mergedTemplates.push({
      ...template,
      id: nextTemplateId,
      splitId: template.splitId ? splitIdMap.get(template.splitId) ?? '' : '',
      entries: template.entries.map((entry) => ({
        ...entry,
        exerciseId: exerciseIdMap.get(entry.exerciseId) ?? entry.exerciseId,
      })),
    });
    existingTemplateIds.add(nextTemplateId);
    existingTemplateNames.add(normalizedName);
  }

  const mergedWorkouts = [
    ...currentData.workouts,
    ...importedData.workouts
      .filter((workout) => !existingWorkoutIds.has(workout.id))
      .map((workout) => ({
        ...workout,
        splitId: workout.splitId ? splitIdMap.get(workout.splitId) ?? '' : '',
        entries: workout.entries.map((entry) => ({
          ...entry,
          exerciseId: exerciseIdMap.get(entry.exerciseId) ?? entry.exerciseId,
        })),
      })),
  ];

  return {
    exercises: mergedExercises,
    splits: mergedSplits,
    templates: mergedTemplates,
    workouts: sortWorkouts(mergedWorkouts),
  };
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
          if (!rawEntry || typeof rawEntry !== 'object' || typeof rawEntry.exerciseId !== 'string') {
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

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildWorkoutHistoryCsv(workouts, exercises, splits) {
  const exerciseNameMap = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const splitNameMap = new Map(splits.map((split) => [split.id, split.name]));
  const rows = [
    ['Date', 'Split', 'Exercise', 'Set', 'Weight', 'Reps', 'Volume', 'Notes'],
  ];

  workouts.forEach((workout) => {
    const splitName = workout.splitId
      ? splitNameMap.get(workout.splitId) ?? 'Unknown split (deleted)'
      : 'Custom workout';
    const notes = typeof workout.notes === 'string' ? workout.notes.trim() : '';

    workout.entries.forEach((entry) => {
      const exerciseName = exerciseNameMap.get(entry.exerciseId) ?? 'Unknown exercise (deleted)';

      entry.sets.forEach((set, index) => {
        rows.push([
          workout.date,
          splitName,
          exerciseName,
          index + 1,
          set.weight,
          set.reps,
          Number(set.weight) * Number(set.reps),
          notes,
        ]);
      });
    });
  });

  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
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
            id:
              typeof rawExercise.id === 'string' && rawExercise.id ? rawExercise.id : createId(),
            exerciseId: rawExercise.exerciseId,
            defaultSets,
          };
        })
        .filter(Boolean)
    : [];

  if (Array.isArray(rawSplit.exercises) && rawSplit.exercises.length > 0 && exercises.length === 0) {
    return null;
  }

  const chosenExerciseIds = exercises.map((exercise) => exercise.exerciseId);

  if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
    return null;
  }

  return {
    id: typeof rawSplit.id === 'string' && rawSplit.id ? rawSplit.id : createId(),
    name,
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
          if (!rawEntry || typeof rawEntry !== 'object' || typeof rawEntry.exerciseId !== 'string') {
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

  return {
    id: typeof rawWorkout.id === 'string' && rawWorkout.id ? rawWorkout.id : createId(),
    date,
    splitId: typeof rawWorkout.splitId === 'string' ? rawWorkout.splitId : '',
    notes: typeof rawWorkout.notes === 'string' ? rawWorkout.notes.trim() : '',
    createdAt:
      typeof rawWorkout.createdAt === 'string' && rawWorkout.createdAt
        ? rawWorkout.createdAt
        : new Date().toISOString(),
    entries,
  };
}

export function sortWorkouts(workouts) {
  return [...workouts].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function readStoredData() {
  if (typeof window === 'undefined') {
    return { exercises: [], splits: [], templates: [], workouts: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { exercises: [], splits: [], templates: [], workouts: [] };
    }

    const parsed = JSON.parse(raw);
    const payload =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.data
        ? parsed.data
        : parsed;

    return {
      exercises: Array.isArray(payload.exercises)
        ? payload.exercises.map(normalizeExercise).filter(Boolean)
        : [],
      splits: Array.isArray(payload.splits) ? payload.splits.map(normalizeSplit).filter(Boolean) : [],
      templates: Array.isArray(payload.templates)
        ? payload.templates.map(normalizeWorkoutTemplate).filter(Boolean)
        : [],
      workouts: Array.isArray(payload.workouts)
        ? sortWorkouts(payload.workouts.map(normalizeWorkout).filter(Boolean))
        : [],
    };
  } catch {
    return { exercises: [], splits: [], templates: [], workouts: [] };
  }
}

export function validateImportedData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Imported file must contain a JSON object.' };
  }

  if (typeof payload.version === 'number' && payload.version > STORAGE_VERSION) {
    return { error: 'Imported file was created by a newer app version.' };
  }

  const collections =
    payload && typeof payload === 'object' && !Array.isArray(payload) && payload.data
      ? payload.data
      : payload;

  if (!Array.isArray(collections.exercises) || !Array.isArray(collections.workouts)) {
    return { error: 'Imported file must include both exercises and workouts arrays.' };
  }

  const normalizedExercises = collections.exercises.map(normalizeExercise);
  const normalizedSplits = Array.isArray(collections.splits)
    ? collections.splits.map(normalizeSplit)
    : [];
  const normalizedTemplates = Array.isArray(collections.templates)
    ? collections.templates.map(normalizeWorkoutTemplate)
    : [];
  const normalizedWorkouts = collections.workouts.map(normalizeWorkout);

  if (normalizedExercises.some((exercise) => exercise === null)) {
    return { error: 'Imported exercises contain empty or invalid items.' };
  }

  if (normalizedSplits.some((split) => split === null)) {
    return { error: 'Imported splits contain empty names, missing exercises, or invalid default sets.' };
  }

  if (normalizedWorkouts.some((workout) => workout === null)) {
    return { error: 'Imported workouts contain invalid dates, entries, or set values.' };
  }

  if (normalizedTemplates.some((template) => template === null)) {
    return { error: 'Imported templates contain empty names, invalid entries, or invalid set values.' };
  }

  const exerciseNames = new Set();

  for (const exercise of normalizedExercises) {
    const normalizedName = exercise.name.trim().toLowerCase();

    if (exerciseNames.has(normalizedName)) {
      return { error: 'Imported exercises contain duplicate names.' };
    }

    exerciseNames.add(normalizedName);
  }

  const splitNames = new Set();
  const templateNames = new Set();
  const exerciseIds = new Set(normalizedExercises.map((exercise) => exercise.id));
  const splitIds = new Set(normalizedSplits.map((split) => split.id));

  for (const split of normalizedSplits) {
    const normalizedName = split.name.trim().toLowerCase();

    if (splitNames.has(normalizedName)) {
      return { error: 'Imported splits contain duplicate names.' };
    }

    if (split.exercises.some((exercise) => !exerciseIds.has(exercise.exerciseId))) {
      return { error: 'Imported splits reference exercises that do not exist.' };
    }

    splitNames.add(normalizedName);
  }

  for (const template of normalizedTemplates) {
    const normalizedName = template.name.trim().toLowerCase();

    if (templateNames.has(normalizedName)) {
      return { error: 'Imported templates contain duplicate names.' };
    }

    if (template.entries.some((entry) => !exerciseIds.has(entry.exerciseId))) {
      return { error: 'Imported templates reference exercises that do not exist.' };
    }

    if (template.splitId && !splitIds.has(template.splitId)) {
      return { error: 'Imported templates reference splits that do not exist.' };
    }

    templateNames.add(normalizedName);
  }

  return {
    value: {
      exercises: normalizedExercises,
      splits: normalizedSplits,
      templates: normalizedTemplates,
      workouts: sortWorkouts(normalizedWorkouts),
    },
  };
}

export function formatDisplayDate(value) {
  return dashboardDateFormatter.format(parseInputDate(value));
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
  const totalVolume = entry.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);

  return {
    bestWeight,
    bestReps,
    totalVolume,
  };
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
    ...heatmapDays.map((date) => recentActivityByDate.get(getInputValueFromDate(date))?.volume ?? 0),
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

export function getDashboardSummary(workouts) {
  const currentWeekStart = getStartOfCurrentWeek();
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const currentMonthStart = getStartOfMonth(new Date());
  const weeklyWorkouts = workouts.filter((workout) => isDateInWeekRange(workout.date, currentWeekStart));
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

  for (const workout of workouts) {
    if (workout.splitId) {
      splitCounts.set(workout.splitId, (splitCounts.get(workout.splitId) ?? 0) + 1);
    }

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

    weeklyVolumeByDate.set(workout.date, (weeklyVolumeByDate.get(workout.date) ?? 0) + workoutVolume);
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
    const recentHistory = filterProgressHistoryByDays(buildProgressHistory(workouts, exerciseId), 30);

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
  const uniqueWeekKeys = Array.from(new Set(workouts.map((workout) => getWeekKey(workout.date)))).sort(
    (left, right) => right.localeCompare(left),
  );
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
      currentRun =
        getInputValueFromDate(previousWeekStartDate) === weekKey
          ? currentRun + 1
          : 1;
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

  const trainingHeatmap = buildTrainingHeatmap(workouts, 28);
  const latestPersonalRecords = getRecentPersonalRecords(workouts, 30, 3);

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
    workoutsLastWeek: previousWeekWorkouts.length,
    workoutsThisMonth: monthlyWorkouts.length,
    volumeDeltaVsLastWeek: totalVolumeThisWeek - totalVolumeLastWeek,
    workoutDeltaVsLastWeek: weeklyWorkouts.length - previousWeekWorkouts.length,
    activeWeekStreak,
    longestActiveWeekStreak,
    mostUsedSplit,
    topSplitThisMonth,
    trainingHeatmap,
    bestTrainingDayLabel: bestDay.volume ? bestDay.label : '',
    bestTrainingDayVolume: bestDay.volume,
    weeklyVolumeTrend: weeklyTrend,
  };
}

function getInputValueFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
        session.improvements.weight ||
        session.improvements.reps ||
        session.improvements.volume,
    ).length,
    bestVolume,
    bestVolumeDate: bestVolumeSession.date,
    latestVolume: latestSession.metrics.totalVolume,
    bestWeight,
    bestWeightDate: bestWeightSession.date,
    latestWeight: latestSession.metrics.bestWeight,
    bestReps,
    bestRepsDate: bestRepsSession.date,
    latestReps: latestSession.metrics.bestReps,
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
      (session) => session.improvements.volume || session.improvements.sets || session.improvements.exercises,
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

export function formatDelta(value) {
  if (value === 0) {
    return '0';
  }

  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

export function hasPersonalRecord(personalRecords) {
  return personalRecords.weight || personalRecords.reps || personalRecords.volume;
}

export function hasImprovement(improvements) {
  return improvements.weight || improvements.reps || improvements.volume;
}
