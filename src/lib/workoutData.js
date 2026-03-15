export const STORAGE_KEY = 'workout-tracker-data-v1';
export const STORAGE_VERSION = 1;

const dashboardDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
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

export function createWorkoutEntry() {
  return {
    id: createId(),
    exerciseId: '',
    sets: [createSet()],
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
    entries: [createWorkoutEntry()],
  };
}

export function createWorkoutFormFromWorkout(workout) {
  return {
    date: workout.date,
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
    createdAt:
      typeof rawExercise.createdAt === 'string' && rawExercise.createdAt
        ? rawExercise.createdAt
        : new Date().toISOString(),
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
    return { exercises: [], workouts: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { exercises: [], workouts: [] };
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
      workouts: Array.isArray(payload.workouts)
        ? sortWorkouts(payload.workouts.map(normalizeWorkout).filter(Boolean))
        : [],
    };
  } catch {
    return { exercises: [], workouts: [] };
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
  const normalizedWorkouts = collections.workouts.map(normalizeWorkout);

  if (normalizedExercises.some((exercise) => exercise === null)) {
    return { error: 'Imported exercises contain empty or invalid items.' };
  }

  if (normalizedWorkouts.some((workout) => workout === null)) {
    return { error: 'Imported workouts contain invalid dates, entries, or set values.' };
  }

  const exerciseNames = new Set();

  for (const exercise of normalizedExercises) {
    const normalizedName = exercise.name.trim().toLowerCase();

    if (exerciseNames.has(normalizedName)) {
      return { error: 'Imported exercises contain duplicate names.' };
    }

    exerciseNames.add(normalizedName);
  }

  return {
    value: {
      exercises: normalizedExercises,
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

export function getStartOfCurrentWeek() {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);

  return start;
}

export function isDateInCurrentWeek(dateValue) {
  const workoutDate = parseInputDate(dateValue);
  const weekStart = getStartOfCurrentWeek();
  const nextWeekStart = new Date(weekStart);

  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  return workoutDate >= weekStart && workoutDate < nextWeekStart;
}

export function getDashboardSummary(workouts) {
  const weeklyWorkouts = workouts.filter((workout) => isDateInCurrentWeek(workout.date));
  const exerciseCounts = new Map();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
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

  return {
    lastTrainingDay: workouts[0]?.date ?? '',
    workoutsThisWeek: weeklyWorkouts.length,
    totalVolumeThisWeek: weeklyWorkouts.reduce(
      (sum, workout) =>
        sum +
        workout.entries.reduce((entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume, 0),
      0,
    ),
    mostTrainedExercise,
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
  const bestVolume = chronologicalHistory.reduce(
    (max, session) => Math.max(max, session.metrics.totalVolume),
    0,
  );

  return {
    sessionCount: history.length,
    bestVolume,
    latestVolume: latestSession.metrics.totalVolume,
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
