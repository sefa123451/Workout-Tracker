import {
  createId,
  DEFAULT_WEEKLY_WORKOUT_GOAL,
  getInputValueFromDate,
  getNormalizedName,
  hasDuplicateIds,
  normalizeBodyweightEntry,
  normalizeExercise,
  normalizeSplit,
  normalizeWeeklyWorkoutGoal,
  normalizeWorkout,
  normalizeWorkoutTemplate,
  parseInputDate,
  sortBodyweightEntries,
  sortWorkouts,
  STORAGE_KEY,
  STORAGE_VERSION,
} from './workoutShared.js';

const DEMO_EXERCISES = [
  ['exercise-bench-press', 'Bench press'],
  ['exercise-incline-db-press', 'Incline dumbbell press'],
  ['exercise-overhead-press', 'Overhead press'],
  ['exercise-lateral-raise', 'Lateral raise'],
  ['exercise-triceps-pushdown', 'Cable triceps pushdown'],
  ['exercise-lat-pulldown', 'Lat pulldown'],
  ['exercise-barbell-row', 'Barbell row'],
  ['exercise-seated-row', 'Seated cable row'],
  ['exercise-face-pull', 'Face pull'],
  ['exercise-db-curl', 'Dumbbell curl'],
  ['exercise-back-squat', 'Back squat'],
  ['exercise-rdl', 'Romanian deadlift'],
  ['exercise-leg-press', 'Leg press'],
  ['exercise-leg-curl', 'Leg curl'],
  ['exercise-calf-raise', 'Standing calf raise'],
  ['exercise-seated-db-press', 'Seated dumbbell press'],
  ['exercise-chest-row', 'Chest-supported row'],
  ['exercise-hammer-curl', 'Hammer curl'],
];

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toIsoAt(date, hour) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    0,
    0,
    0,
  ).toISOString();
}

function getMonday(date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  monday.setDate(monday.getDate() + offset);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function buildDemoEntry(exerciseId, sets) {
  return { exerciseId, sets };
}

function buildDemoWorkout(id, date, splitId, notes, mood, effort, entries) {
  return {
    id,
    date: getInputValueFromDate(date),
    splitId,
    notes,
    mood,
    effort,
    createdAt: toIsoAt(date, 18),
    entries,
  };
}

function buildPushWorkout(weekIndex, sessionDate, workoutIndex) {
  const bench = 72.5 + weekIndex * 1.25;
  const incline = 24 + weekIndex * 0.5;
  const press = 40 + weekIndex * 1.25;
  const lateralRaise = 9 + Math.floor(weekIndex / 2);
  const pushdown = 25 + weekIndex * 2;

  return buildDemoWorkout(
    `workout-push-${workoutIndex}`,
    sessionDate,
    'split-push',
    workoutIndex % 3 === 0 ? 'Bench moved well, kept the top sets controlled.' : '',
    weekIndex >= 5 ? 'Focused' : 'Good',
    weekIndex >= 6 ? 'Hard' : 'Moderate',
    [
      buildDemoEntry('exercise-bench-press', [
        { weight: bench, reps: 8 },
        { weight: bench, reps: 8 },
        { weight: bench + 2.5, reps: 6 },
        { weight: bench + 2.5, reps: 6 },
      ]),
      buildDemoEntry('exercise-incline-db-press', [
        { weight: incline, reps: 10 },
        { weight: incline, reps: 10 },
        { weight: incline + 2, reps: 8 },
      ]),
      buildDemoEntry('exercise-overhead-press', [
        { weight: press, reps: 8 },
        { weight: press, reps: 8 },
        { weight: press + 2.5, reps: 6 },
      ]),
      buildDemoEntry('exercise-lateral-raise', [
        { weight: lateralRaise, reps: 15 },
        { weight: lateralRaise, reps: 14 },
        { weight: lateralRaise, reps: 14 },
      ]),
      buildDemoEntry('exercise-triceps-pushdown', [
        { weight: pushdown, reps: 12 },
        { weight: pushdown, reps: 12 },
        { weight: pushdown + 2.5, reps: 10 },
      ]),
    ],
  );
}

function buildPullWorkout(weekIndex, sessionDate, workoutIndex) {
  const pulldown = 55 + weekIndex * 2.5;
  const barbellRow = 60 + weekIndex * 2.5;
  const seatedRow = 50 + weekIndex * 2;
  const facePull = 22.5 + weekIndex * 1.25;
  const curl = 14 + weekIndex * 0.5;

  return buildDemoWorkout(
    `workout-pull-${workoutIndex}`,
    sessionDate,
    'split-pull',
    workoutIndex % 4 === 0 ? 'Added one rep on the last pulldown set.' : '',
    weekIndex >= 4 ? 'Good' : 'Steady',
    weekIndex >= 6 ? 'Hard' : 'Moderate',
    [
      buildDemoEntry('exercise-lat-pulldown', [
        { weight: pulldown, reps: 10 },
        { weight: pulldown, reps: 10 },
        { weight: pulldown + 2.5, reps: 8 },
        { weight: pulldown + 2.5, reps: 8 },
      ]),
      buildDemoEntry('exercise-barbell-row', [
        { weight: barbellRow, reps: 8 },
        { weight: barbellRow, reps: 8 },
        { weight: barbellRow + 2.5, reps: 6 },
        { weight: barbellRow + 2.5, reps: 6 },
      ]),
      buildDemoEntry('exercise-seated-row', [
        { weight: seatedRow, reps: 12 },
        { weight: seatedRow, reps: 12 },
        { weight: seatedRow + 2.5, reps: 10 },
      ]),
      buildDemoEntry('exercise-face-pull', [
        { weight: facePull, reps: 15 },
        { weight: facePull, reps: 15 },
        { weight: facePull, reps: 14 },
      ]),
      buildDemoEntry('exercise-db-curl', [
        { weight: curl, reps: 12 },
        { weight: curl, reps: 12 },
        { weight: curl + 1, reps: 10 },
      ]),
    ],
  );
}

function buildLegWorkout(weekIndex, sessionDate, workoutIndex) {
  const squat = 100 + weekIndex * 2.5;
  const rdl = 90 + weekIndex * 2.5;
  const legPress = 180 + weekIndex * 5;
  const legCurl = 40 + weekIndex * 2.5;
  const calfRaise = 70 + weekIndex * 5;

  return buildDemoWorkout(
    `workout-legs-${workoutIndex}`,
    sessionDate,
    'split-legs',
    workoutIndex % 3 === 1 ? 'Squat depth felt solid, kept the RDLs smooth.' : '',
    weekIndex >= 5 ? 'Locked in' : 'Good',
    weekIndex >= 5 ? 'Hard' : 'Moderate',
    [
      buildDemoEntry('exercise-back-squat', [
        { weight: squat, reps: 6 },
        { weight: squat, reps: 6 },
        { weight: squat + 2.5, reps: 5 },
        { weight: squat + 2.5, reps: 5 },
      ]),
      buildDemoEntry('exercise-rdl', [
        { weight: rdl, reps: 8 },
        { weight: rdl, reps: 8 },
        { weight: rdl + 2.5, reps: 6 },
      ]),
      buildDemoEntry('exercise-leg-press', [
        { weight: legPress, reps: 12 },
        { weight: legPress, reps: 12 },
        { weight: legPress + 10, reps: 10 },
      ]),
      buildDemoEntry('exercise-leg-curl', [
        { weight: legCurl, reps: 12 },
        { weight: legCurl, reps: 12 },
        { weight: legCurl + 2.5, reps: 10 },
      ]),
      buildDemoEntry('exercise-calf-raise', [
        { weight: calfRaise, reps: 15 },
        { weight: calfRaise, reps: 15 },
        { weight: calfRaise + 10, reps: 12 },
        { weight: calfRaise + 10, reps: 12 },
      ]),
    ],
  );
}

function buildUpperWorkout(weekIndex, sessionDate, workoutIndex) {
  const bench = 70 + weekIndex * 1.25;
  const pulldown = 52.5 + weekIndex * 2.5;
  const seatedPress = 22 + weekIndex * 0.5;
  const chestRow = 48 + weekIndex * 2;
  const hammerCurl = 12 + weekIndex * 0.5;

  return buildDemoWorkout(
    `workout-upper-${workoutIndex}`,
    sessionDate,
    'split-upper',
    workoutIndex % 5 === 0 ? 'Quick upper session, kept everything one rep shy of failure.' : '',
    'Good',
    weekIndex >= 6 ? 'Moderate+' : 'Moderate',
    [
      buildDemoEntry('exercise-bench-press', [
        { weight: bench, reps: 8 },
        { weight: bench, reps: 8 },
        { weight: bench + 2.5, reps: 6 },
      ]),
      buildDemoEntry('exercise-lat-pulldown', [
        { weight: pulldown, reps: 10 },
        { weight: pulldown, reps: 10 },
        { weight: pulldown + 2.5, reps: 8 },
      ]),
      buildDemoEntry('exercise-seated-db-press', [
        { weight: seatedPress, reps: 10 },
        { weight: seatedPress, reps: 10 },
        { weight: seatedPress + 2, reps: 8 },
      ]),
      buildDemoEntry('exercise-chest-row', [
        { weight: chestRow, reps: 12 },
        { weight: chestRow, reps: 12 },
        { weight: chestRow + 2, reps: 10 },
      ]),
      buildDemoEntry('exercise-hammer-curl', [
        { weight: hammerCurl, reps: 12 },
        { weight: hammerCurl, reps: 12 },
      ]),
    ],
  );
}

function buildDemoData() {
  const today = new Date();
  const currentWeekMonday = getMonday(today);
  const firstWeekMonday = addDays(currentWeekMonday, -7 * 7);
  const exercises = DEMO_EXERCISES.map(([id, name], index) => ({
    id,
    name,
    createdAt: toIsoAt(addDays(firstWeekMonday, -index), 9),
  }));
  const splits = [
    {
      id: 'split-push',
      name: 'Push day',
      weeklyTarget: 1,
      createdAt: toIsoAt(addDays(firstWeekMonday, -3), 9),
      exercises: [
        { id: 'split-push-1', exerciseId: 'exercise-bench-press', defaultSets: 4 },
        { id: 'split-push-2', exerciseId: 'exercise-incline-db-press', defaultSets: 3 },
        { id: 'split-push-3', exerciseId: 'exercise-overhead-press', defaultSets: 3 },
        { id: 'split-push-4', exerciseId: 'exercise-lateral-raise', defaultSets: 3 },
        { id: 'split-push-5', exerciseId: 'exercise-triceps-pushdown', defaultSets: 3 },
      ],
    },
    {
      id: 'split-pull',
      name: 'Pull day',
      weeklyTarget: 1,
      createdAt: toIsoAt(addDays(firstWeekMonday, -2), 9),
      exercises: [
        { id: 'split-pull-1', exerciseId: 'exercise-lat-pulldown', defaultSets: 4 },
        { id: 'split-pull-2', exerciseId: 'exercise-barbell-row', defaultSets: 4 },
        { id: 'split-pull-3', exerciseId: 'exercise-seated-row', defaultSets: 3 },
        { id: 'split-pull-4', exerciseId: 'exercise-face-pull', defaultSets: 3 },
        { id: 'split-pull-5', exerciseId: 'exercise-db-curl', defaultSets: 3 },
      ],
    },
    {
      id: 'split-legs',
      name: 'Leg day',
      weeklyTarget: 1,
      createdAt: toIsoAt(addDays(firstWeekMonday, -1), 9),
      exercises: [
        { id: 'split-legs-1', exerciseId: 'exercise-back-squat', defaultSets: 4 },
        { id: 'split-legs-2', exerciseId: 'exercise-rdl', defaultSets: 3 },
        { id: 'split-legs-3', exerciseId: 'exercise-leg-press', defaultSets: 3 },
        { id: 'split-legs-4', exerciseId: 'exercise-leg-curl', defaultSets: 3 },
        { id: 'split-legs-5', exerciseId: 'exercise-calf-raise', defaultSets: 4 },
      ],
    },
    {
      id: 'split-upper',
      name: 'Upper blend',
      weeklyTarget: 1,
      createdAt: toIsoAt(firstWeekMonday, 9),
      exercises: [
        { id: 'split-upper-1', exerciseId: 'exercise-bench-press', defaultSets: 3 },
        { id: 'split-upper-2', exerciseId: 'exercise-lat-pulldown', defaultSets: 3 },
        { id: 'split-upper-3', exerciseId: 'exercise-seated-db-press', defaultSets: 3 },
        { id: 'split-upper-4', exerciseId: 'exercise-chest-row', defaultSets: 3 },
        { id: 'split-upper-5', exerciseId: 'exercise-hammer-curl', defaultSets: 2 },
      ],
    },
  ];
  const templates = [
    {
      id: 'template-push-steady',
      name: 'Push steady',
      splitId: 'split-push',
      notes: 'Keep 1 to 2 reps in reserve on the pressing sets.',
      createdAt: toIsoAt(addDays(firstWeekMonday, 2), 7),
      entries: [
        { exerciseId: 'exercise-bench-press', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 82.5, reps: 6 }, { weight: 82.5, reps: 6 }] },
        { exerciseId: 'exercise-incline-db-press', sets: [{ weight: 27, reps: 10 }, { weight: 27, reps: 10 }, { weight: 29, reps: 8 }] },
        { exerciseId: 'exercise-overhead-press', sets: [{ weight: 47.5, reps: 8 }, { weight: 47.5, reps: 8 }, { weight: 50, reps: 6 }] },
      ],
    },
    {
      id: 'template-pull-builder',
      name: 'Pull builder',
      splitId: 'split-pull',
      notes: 'Pause the first rep on rows and keep the last set honest.',
      createdAt: toIsoAt(addDays(firstWeekMonday, 3), 7),
      entries: [
        { exerciseId: 'exercise-lat-pulldown', sets: [{ weight: 67.5, reps: 10 }, { weight: 67.5, reps: 10 }, { weight: 70, reps: 8 }] },
        { exerciseId: 'exercise-barbell-row', sets: [{ weight: 72.5, reps: 8 }, { weight: 72.5, reps: 8 }, { weight: 75, reps: 6 }] },
        { exerciseId: 'exercise-db-curl', sets: [{ weight: 15, reps: 12 }, { weight: 15, reps: 12 }, { weight: 16, reps: 10 }] },
      ],
    },
    {
      id: 'template-legs-volume',
      name: 'Leg volume',
      splitId: 'split-legs',
      notes: 'Stay smooth on the eccentrics and keep one clean rep in reserve.',
      createdAt: toIsoAt(addDays(firstWeekMonday, 4), 7),
      entries: [
        { exerciseId: 'exercise-back-squat', sets: [{ weight: 112.5, reps: 6 }, { weight: 112.5, reps: 6 }, { weight: 115, reps: 5 }, { weight: 115, reps: 5 }] },
        { exerciseId: 'exercise-rdl', sets: [{ weight: 102.5, reps: 8 }, { weight: 102.5, reps: 8 }, { weight: 105, reps: 6 }] },
        { exerciseId: 'exercise-leg-press', sets: [{ weight: 205, reps: 12 }, { weight: 205, reps: 12 }, { weight: 215, reps: 10 }] },
      ],
    },
  ];
  const workouts = [];
  const workoutFactories = [
    buildPushWorkout,
    buildPullWorkout,
    buildLegWorkout,
    buildUpperWorkout,
  ];
  const workoutDayOffsets = [0, 1, 3, 5];
  let workoutIndex = 1;

  for (let weekIndex = 0; weekIndex < 8; weekIndex += 1) {
    const weekStart = addDays(firstWeekMonday, weekIndex * 7);

    workoutDayOffsets.forEach((offset, splitIndex) => {
      const sessionDate = addDays(weekStart, offset);

      if (sessionDate > today) {
        return;
      }

      workouts.push(workoutFactories[splitIndex](weekIndex, sessionDate, workoutIndex));
      workoutIndex += 1;
    });
  }

  const bodyweightEntries = Array.from({ length: 8 }, (_, index) => {
    const entryDate = addDays(firstWeekMonday, index * 7 + 1);
    const baselineWeight = 86.4 - index * 0.28;
    const fluctuation = index % 3 === 0 ? 0.2 : index % 3 === 1 ? -0.1 : 0;

    return {
      id: `bodyweight-${index + 1}`,
      date: getInputValueFromDate(entryDate),
      weight: Number((baselineWeight + fluctuation).toFixed(1)),
      createdAt: toIsoAt(entryDate, 7),
    };
  }).filter((entry) => parseInputDate(entry.date) <= today);

  return {
    bodyweightEntries: sortBodyweightEntries(bodyweightEntries),
    exercises,
    splits,
    templates,
    workouts: sortWorkouts(workouts),
  };
}

function hasMeaningfulStoredData(data) {
  return (
    (data.bodyweightEntries?.length ?? 0) > 0 ||
    data.exercises.length > 0 ||
    data.splits.length > 0 ||
    data.templates.length > 0 ||
    data.workouts.length > 0
  );
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function mergeImportedData(currentData, importedData) {
  const mergedExercises = [...currentData.exercises];
  const mergedSplits = [...currentData.splits];
  const mergedTemplates = [...currentData.templates];
  const mergedBodyweightEntries = [...(currentData.bodyweightEntries ?? [])];
  const existingWorkoutIds = new Set(currentData.workouts.map((workout) => workout.id));
  const existingExerciseIds = new Set(currentData.exercises.map((exercise) => exercise.id));
  const existingSplitIds = new Set(currentData.splits.map((split) => split.id));
  const existingTemplateIds = new Set(currentData.templates.map((template) => template.id));
  const existingBodyweightIds = new Set(mergedBodyweightEntries.map((entry) => entry.id));
  const existingBodyweightDates = new Set(mergedBodyweightEntries.map((entry) => entry.date));
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

  const mergedWorkouts = [...currentData.workouts];

  for (const workout of importedData.workouts) {
    if (existingWorkoutIds.has(workout.id)) {
      continue;
    }

    mergedWorkouts.push({
      ...workout,
      splitId: workout.splitId ? splitIdMap.get(workout.splitId) ?? '' : '',
      entries: workout.entries.map((entry) => ({
        ...entry,
        exerciseId: exerciseIdMap.get(entry.exerciseId) ?? exerciseIdMap.get(entry.exerciseId) ?? entry.exerciseId,
      })),
    });
    existingWorkoutIds.add(workout.id);
  }

  for (const entry of importedData.bodyweightEntries ?? []) {
    if (existingBodyweightDates.has(entry.date)) {
      continue;
    }

    const nextId = existingBodyweightIds.has(entry.id) ? createId() : entry.id;
    mergedBodyweightEntries.push({ ...entry, id: nextId });
    existingBodyweightIds.add(nextId);
    existingBodyweightDates.add(entry.date);
  }

  return {
    weeklyWorkoutGoal: currentData.weeklyWorkoutGoal ?? DEFAULT_WEEKLY_WORKOUT_GOAL,
    bodyweightEntries: sortBodyweightEntries(mergedBodyweightEntries),
    exercises: mergedExercises,
    splits: mergedSplits,
    templates: mergedTemplates,
    workouts: sortWorkouts(mergedWorkouts),
  };
}

export function buildWorkoutHistoryCsv(workouts, exercises, splits) {
  const exerciseNameMap = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const splitNameMap = new Map(splits.map((split) => [split.id, split.name]));
  const rows = [
    ['Date', 'Split', 'Exercise', 'Set', 'Weight', 'Reps', 'Volume', 'Mood', 'Effort', 'Notes'],
  ];

  workouts.forEach((workout) => {
    const splitName = workout.splitId
      ? splitNameMap.get(workout.splitId) ?? 'Unknown split (deleted)'
      : 'Custom workout';
    const notes = typeof workout.notes === 'string' ? workout.notes.trim() : '';
    const mood = typeof workout.mood === 'string' ? workout.mood.trim() : '';
    const effort = typeof workout.effort === 'string' ? workout.effort.trim() : '';

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
          mood,
          effort,
          notes,
        ]);
      });
    });
  });

  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function readStoredData() {
  if (typeof window === 'undefined') {
    return {
      ...buildDemoData(),
      weeklyWorkoutGoal: DEFAULT_WEEKLY_WORKOUT_GOAL,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        ...buildDemoData(),
        weeklyWorkoutGoal: DEFAULT_WEEKLY_WORKOUT_GOAL,
      };
    }

    const parsed = JSON.parse(raw);
    const payload =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.data
        ? parsed.data
        : parsed;

    const normalizedData = {
      weeklyWorkoutGoal: normalizeWeeklyWorkoutGoal(payload.weeklyWorkoutGoal),
      bodyweightEntries: Array.isArray(payload.bodyweightEntries)
        ? sortBodyweightEntries(payload.bodyweightEntries.map(normalizeBodyweightEntry).filter(Boolean))
        : [],
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

    return hasMeaningfulStoredData(normalizedData)
      ? normalizedData
      : {
          ...buildDemoData(),
          weeklyWorkoutGoal: DEFAULT_WEEKLY_WORKOUT_GOAL,
        };
  } catch {
    return {
      ...buildDemoData(),
      weeklyWorkoutGoal: DEFAULT_WEEKLY_WORKOUT_GOAL,
    };
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
  const normalizedBodyweightEntries = Array.isArray(collections.bodyweightEntries)
    ? collections.bodyweightEntries.map(normalizeBodyweightEntry)
    : [];
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

  if (normalizedBodyweightEntries.some((entry) => entry === null)) {
    return { error: 'Imported bodyweight entries contain invalid dates or weights.' };
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

  if (hasDuplicateIds(normalizedExercises)) {
    return { error: 'Imported exercises contain duplicate IDs.' };
  }

  if (hasDuplicateIds(normalizedBodyweightEntries)) {
    return { error: 'Imported bodyweight entries contain duplicate IDs.' };
  }

  if (hasDuplicateIds(normalizedSplits)) {
    return { error: 'Imported splits contain duplicate IDs.' };
  }

  if (hasDuplicateIds(normalizedTemplates)) {
    return { error: 'Imported templates contain duplicate IDs.' };
  }

  if (hasDuplicateIds(normalizedWorkouts)) {
    return { error: 'Imported workouts contain duplicate IDs.' };
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
      weeklyWorkoutGoal: normalizeWeeklyWorkoutGoal(collections.weeklyWorkoutGoal),
      bodyweightEntries: sortBodyweightEntries(normalizedBodyweightEntries),
      exercises: normalizedExercises,
      splits: normalizedSplits,
      templates: normalizedTemplates,
      workouts: sortWorkouts(normalizedWorkouts),
    },
  };
}
