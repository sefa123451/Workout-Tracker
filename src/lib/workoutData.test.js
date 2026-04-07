import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProgressHistory,
  buildSplitProgressHistory,
  buildWorkoutHistoryCsv,
  estimateOneRepMax,
  filterProgressHistoryByDays,
  getBodyweightSummary,
  getEntryMetrics,
  getDashboardSummary,
  getProgressWindowSummary,
  getSplitProgressWindowSummary,
  isValidDateInput,
  mergeImportedData,
  parseSet,
  readStoredData,
  STORAGE_KEY,
  suggestNextSets,
  validateImportedData,
} from './workoutData.js';

function createMockLocalStorage() {
  const storage = new Map();

  return {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };
}

describe('validation helpers', () => {
  it('rejects invalid dates', () => {
    expect(isValidDateInput('2024-02-30')).toBe(false);
    expect(isValidDateInput('2024/02/20')).toBe(false);
    expect(isValidDateInput('')).toBe(false);
  });

  it('rejects invalid set values', () => {
    expect(parseSet({ weight: '-5', reps: '10' })).toEqual({
      error: 'Weight and reps cannot be negative.',
    });
    expect(parseSet({ weight: '50', reps: '' })).toEqual({
      error: 'Each set needs both a weight and a reps value.',
    });
    expect(parseSet({ weight: '40', reps: '8.5' })).toEqual({
      error: 'Reps must be a whole number.',
    });
  });
});

describe('stored data bootstrap', () => {
  it('returns realistic demo data when storage is empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));
    vi.stubGlobal('window', { localStorage: createMockLocalStorage() });

    const data = readStoredData();

    expect(data.exercises.length).toBeGreaterThanOrEqual(16);
    expect(data.splits.length).toBe(4);
    expect(data.templates.length).toBe(3);
    expect(data.workouts.length).toBeGreaterThanOrEqual(28);
    expect(data.workouts.length).toBeLessThanOrEqual(32);
    expect(data.workouts[0].date).toBe('2026-04-02');
  });

  it('falls back to demo data when stored collections are present but empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));
    const localStorage = createMockLocalStorage();
    vi.stubGlobal('window', { localStorage });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          exercises: [],
          splits: [],
          templates: [],
          workouts: [],
        },
      }),
    );

    const data = readStoredData();

    expect(data.exercises.length).toBeGreaterThan(0);
    expect(data.workouts.length).toBeGreaterThan(0);
    expect(data.workouts[0].date).toBe('2026-04-02');
  });

  it('preserves explicit stored data instead of replacing it with demo content', () => {
    const localStorage = createMockLocalStorage();
    vi.stubGlobal('window', { localStorage });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          exercises: [{ id: 'exercise-1', name: 'Custom squat' }],
          splits: [],
          templates: [],
          workouts: [
            {
              id: 'workout-1',
              date: '2026-03-01',
              splitId: '',
              notes: '',
              mood: '',
              effort: '',
              createdAt: '2026-03-01T08:00:00.000Z',
              entries: [{ exerciseId: 'exercise-1', sets: [{ weight: 100, reps: 5 }] }],
            },
          ],
        },
      }),
    );

    const data = readStoredData();

    expect(data.exercises).toEqual([
      {
        id: 'exercise-1',
        name: 'Custom squat',
        createdAt: expect.any(String),
        targetWeight: null,
        targetRepMin: null,
        targetRepMax: null,
        weightStep: 2.5,
      },
    ]);
    expect(data.workouts).toHaveLength(1);
    expect(data.workouts[0].id).toBe('workout-1');
  });

  it('normalizes a stored weekly workout goal', () => {
    const localStorage = createMockLocalStorage();
    vi.stubGlobal('window', { localStorage });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          weeklyWorkoutGoal: 9,
          exercises: [{ id: 'exercise-1', name: 'Custom squat' }],
          splits: [],
          templates: [],
          workouts: [],
        },
      }),
    );

    const data = readStoredData();

    expect(data.weeklyWorkoutGoal).toBe(7);
  });
});

describe('metric helpers', () => {
  it('calculates volume, best weight, and best reps', () => {
    expect(
      getEntryMetrics({
        sets: [
          { weight: 50, reps: 5 },
          { weight: 60, reps: 3 },
          { weight: 55, reps: 8 },
        ],
      }),
    ).toEqual({
      bestWeight: 60,
      bestReps: 8,
      totalVolume: 870,
    });
  });

  it('builds workout history CSV rows with split and notes data', () => {
    const csv = buildWorkoutHistoryCsv(
      [
        {
          id: 'w1',
          date: '2024-01-12',
          splitId: 'push',
          mood: 'Great',
          effort: 'Hard',
          notes: 'Top set felt easy',
          entries: [
            {
              exerciseId: 'bench',
              sets: [
                { weight: 80, reps: 8 },
                { weight: 82.5, reps: 6 },
              ],
            },
          ],
        },
      ],
      [{ id: 'bench', name: 'Bench press' }],
      [{ id: 'push', name: 'Push' }],
    );

    expect(csv).toContain('Date,Split,Exercise,Set,Weight,Reps,Volume,Mood,Effort,Notes');
    expect(csv).toContain('2024-01-12,Push,Bench press,1,80,8,640,Great,Hard,Top set felt easy');
    expect(csv).toContain('2024-01-12,Push,Bench press,2,82.5,6,495,Great,Hard,Top set felt easy');
  });

  it('estimates one rep max from a set', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1);
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(0, 5)).toBe(0);
  });

  it('builds a progress summary with best set and estimated one rep max', () => {
    const summary = getProgressWindowSummary([
      {
        workoutId: 'w2',
        date: '2024-01-19',
        sets: [
          { weight: 100, reps: 5 },
          { weight: 90, reps: 8 },
        ],
        metrics: {
          bestWeight: 100,
          bestReps: 8,
          totalVolume: 1220,
        },
        personalRecords: { weight: true, reps: false, volume: true },
        improvements: { weight: true, reps: false, volume: true },
      },
      {
        workoutId: 'w1',
        date: '2024-01-12',
        sets: [{ weight: 95, reps: 5 }],
        metrics: {
          bestWeight: 95,
          bestReps: 5,
          totalVolume: 475,
        },
        personalRecords: { weight: true, reps: true, volume: true },
        improvements: { weight: false, reps: false, volume: false },
      },
    ]);

    expect(summary.bestSetWeight).toBe(100);
    expect(summary.bestSetReps).toBe(5);
    expect(summary.bestSetDate).toBe('2024-01-19');
    expect(summary.estimatedOneRepMax).toBeCloseTo(116.67, 1);
    expect(summary.bestSessionVolume).toBe(1220);
    expect(summary.bestSessionVolumeDate).toBe('2024-01-19');
  });

  it('builds a dashboard summary with weekly goal progress', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T12:00:00.000Z'));

    const summary = getDashboardSummary(
      [
        {
          id: 'w1',
          date: '2026-04-06',
          splitId: '',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
        {
          id: 'w2',
          date: '2026-04-08',
          splitId: '',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 82.5, reps: 8 }] }],
        },
      ],
      4,
    );

    expect(summary.weeklyWorkoutGoal).toBe(4);
    expect(summary.workoutsThisWeek).toBe(2);
    expect(summary.weeklyGoalRemaining).toBe(2);
    expect(summary.weeklyGoalProgress).toBe(0.5);
    expect(summary.weeklyGoalReached).toBe(false);
    expect(summary.daysElapsedThisWeek).toBe(1);
    expect(summary.daysRemainingThisWeek).toBe(6);
    expect(summary.weeklyGoalStatus).toBe('On pace');
  });

  it('builds weekly split plan progress for the dashboard', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));

    const summary = getDashboardSummary(
      [
        {
          id: 'w1',
          date: '2026-04-06',
          splitId: 'push',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      4,
      [
        { id: 'push', name: 'Push', weeklyTarget: 2, exercises: [] },
        { id: 'pull', name: 'Pull', weeklyTarget: 1, exercises: [] },
      ],
    );

    expect(summary.weeklySplitPlan).toEqual([
      { splitId: 'push', target: 2, completed: 1, remaining: 1, reached: false },
      { splitId: 'pull', target: 1, completed: 0, remaining: 1, reached: false },
    ]);
  });
});

describe('import validation', () => {
  it('rejects malformed or incomplete payloads', () => {
    expect(validateImportedData(null)).toEqual({
      error: 'Imported file must contain a JSON object.',
    });

    expect(validateImportedData({ exercises: [] })).toEqual({
      error: 'Imported file must include both exercises and workouts arrays.',
    });
  });

  it('rejects duplicate exercises and invalid workouts', () => {
    expect(
      validateImportedData({
        exercises: [
          { id: '1', name: 'Squat' },
          { id: '2', name: ' squat ' },
        ],
        workouts: [],
      }),
    ).toEqual({
      error: 'Imported exercises contain duplicate names.',
    });

    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Squat' }],
        workouts: [
          {
            id: 'w1',
            date: '2024-02-30',
            entries: [{ exerciseId: '1', sets: [{ weight: 100, reps: 5 }] }],
          },
        ],
      }),
    ).toEqual({
      error: 'Imported workouts contain invalid dates, entries, or set values.',
    });
  });

  it('rejects duplicate IDs in imported collections', () => {
    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Squat' }],
        workouts: [
          {
            id: 'w1',
            date: '2024-01-12',
            entries: [{ exerciseId: '1', sets: [{ weight: 100, reps: 5 }] }],
          },
          {
            id: 'w1',
            date: '2024-01-13',
            entries: [{ exerciseId: '1', sets: [{ weight: 102.5, reps: 5 }] }],
          },
        ],
      }),
    ).toEqual({
      error: 'Imported workouts contain duplicate IDs.',
    });

    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Squat' }],
        splits: [
          { id: 'split-1', name: 'Push', exercises: [] },
          { id: 'split-1', name: 'Pull', exercises: [] },
        ],
        workouts: [],
      }),
    ).toEqual({
      error: 'Imported splits contain duplicate IDs.',
    });
  });

  it('normalizes valid imported data', () => {
    const result = validateImportedData({
      bodyweightEntries: [{ id: 'bw-1', date: '2024-01-10', weight: 82.4 }],
      exercises: [{ id: '1', name: 'Squat' }],
      workouts: [
        {
          id: 'w1',
          date: '2024-01-12',
          splitId: '',
          notes: 'Felt sharp and steady.',
          mood: 'Good',
          effort: 'Moderate',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: '1', sets: [{ weight: 100, reps: 5 }] }],
        },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      weeklyWorkoutGoal: 4,
      bodyweightEntries: [
        {
          id: 'bw-1',
          date: '2024-01-10',
          weight: 82.4,
          createdAt: expect.any(String),
        },
      ],
      exercises: [
        {
          id: '1',
          name: 'Squat',
          createdAt: expect.any(String),
          targetWeight: null,
          targetRepMin: null,
          targetRepMax: null,
          weightStep: 2.5,
        },
      ],
      splits: [],
      templates: [],
      workouts: [
        {
          id: 'w1',
          date: '2024-01-12',
          splitId: '',
          notes: 'Felt sharp and steady.',
          mood: 'Good',
          effort: 'Moderate',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: '1', sets: [{ weight: 100, reps: 5 }] }],
        },
      ],
    });
  });

  it('summarizes bodyweight trends over the recent window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-06T12:00:00.000Z'));

    const summary = getBodyweightSummary([
      { id: 'bw-1', date: '2026-03-10', weight: 84.5, createdAt: '2026-03-10T07:00:00.000Z' },
      { id: 'bw-2', date: '2026-03-24', weight: 83.8, createdAt: '2026-03-24T07:00:00.000Z' },
      { id: 'bw-3', date: '2026-04-05', weight: 83.1, createdAt: '2026-04-05T07:00:00.000Z' },
    ]);

    expect(summary.latestWeight).toBe(83.1);
    expect(summary.deltaInRange).toBe(-1.4);
    expect(summary.entryCount).toBe(3);
    expect(summary.recentEntries).toHaveLength(3);
  });

  it('normalizes imported exercise goals', () => {
    const result = validateImportedData({
      exercises: [
        {
          id: '1',
          name: 'Bench press',
          targetWeight: '100',
          targetRepMin: '6',
          targetRepMax: '8',
          weightStep: '1.25',
        },
      ],
      workouts: [],
    });

    expect(result.error).toBeUndefined();
    expect(result.value.exercises).toEqual([
      {
        id: '1',
        name: 'Bench press',
        createdAt: expect.any(String),
        targetWeight: 100,
        targetRepMin: 6,
        targetRepMax: 8,
        weightStep: 1.25,
      },
    ]);
  });

  it('accepts valid splits and rejects duplicate split names', () => {
    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Squat' }],
        splits: [
          { id: 'split-1', name: 'Push', exercises: [] },
          { id: 'split-2', name: ' push ', exercises: [] },
        ],
        workouts: [],
      }),
    ).toEqual({
      error: 'Imported splits contain duplicate names.',
    });

    const result = validateImportedData({
      exercises: [{ id: '1', name: 'Squat' }],
      splits: [
        {
          id: 'split-1',
          name: 'Leg day',
          createdAt: '2024-01-12T10:00:00.000Z',
          exercises: [{ exerciseId: '1', defaultSets: 4 }],
        },
      ],
      workouts: [],
    });

    expect(result.error).toBeUndefined();
    expect(result.value.splits).toEqual([
      {
        id: 'split-1',
        name: 'Leg day',
        createdAt: '2024-01-12T10:00:00.000Z',
        weeklyTarget: 1,
        exercises: [
          {
            id: expect.any(String),
            exerciseId: '1',
            defaultSets: 4,
          },
        ],
      },
    ]);
  });

  it('accepts valid templates and rejects duplicate template names', () => {
    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Bench press' }],
        templates: [
          {
            id: 'template-1',
            name: 'Push template',
            entries: [{ exerciseId: '1', sets: [{ weight: 80, reps: 8 }] }],
          },
          {
            id: 'template-2',
            name: ' push template ',
            entries: [{ exerciseId: '1', sets: [{ weight: 82.5, reps: 6 }] }],
          },
        ],
        workouts: [],
      }),
    ).toEqual({
      error: 'Imported templates contain duplicate names.',
    });

    const result = validateImportedData({
      exercises: [{ id: '1', name: 'Bench press' }],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Top sets first',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: '1', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    expect(result.error).toBeUndefined();
    expect(result.value.templates).toEqual([
      {
        id: 'template-1',
        name: 'Push template',
        splitId: '',
        notes: 'Top sets first',
        createdAt: '2024-01-12T10:00:00.000Z',
        entries: [{ exerciseId: '1', sets: [{ weight: 80, reps: 8 }] }],
      },
    ]);
  });

  it('rejects imported workouts and templates with duplicate exercise entries', () => {
    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Bench press' }],
        templates: [
          {
            id: 'template-1',
            name: 'Push template',
            entries: [
              { exerciseId: '1', sets: [{ weight: 80, reps: 8 }] },
              { exerciseId: '1', sets: [{ weight: 82.5, reps: 6 }] },
            ],
          },
        ],
        workouts: [],
      }),
    ).toEqual({
      error: 'Imported templates contain empty names, invalid entries, or invalid set values.',
    });

    expect(
      validateImportedData({
        exercises: [{ id: '1', name: 'Bench press' }],
        workouts: [
          {
            id: 'w1',
            date: '2024-01-12',
            entries: [
              { exerciseId: '1', sets: [{ weight: 80, reps: 8 }] },
              { exerciseId: '1', sets: [{ weight: 82.5, reps: 6 }] },
            ],
          },
        ],
      }),
    ).toEqual({
      error: 'Imported workouts contain invalid dates, entries, or set values.',
    });
  });
});

describe('progress history', () => {
  const workouts = [
    {
      id: 'w1',
      date: '2024-01-05',
      createdAt: '2024-01-05T08:00:00.000Z',
      entries: [
        {
          exerciseId: 'squat',
          sets: [{ weight: 100, reps: 5 }],
        },
      ],
    },
    {
      id: 'w2',
      date: '2024-01-12',
      createdAt: '2024-01-12T08:00:00.000Z',
      entries: [
        {
          exerciseId: 'squat',
          sets: [{ weight: 110, reps: 5 }],
        },
      ],
    },
  ];

  it('marks improvements against the previous entry and all-time PRs', () => {
    const history = buildProgressHistory(workouts, 'squat');

    expect(history).toHaveLength(2);

    expect(history[0].workoutId).toBe('w2');
    expect(history[0].improvements).toEqual({
      weight: true,
      reps: false,
      volume: true,
    });
    expect(history[0].personalRecords).toEqual({
      weight: true,
      reps: false,
      volume: true,
    });

    expect(history[1].workoutId).toBe('w1');
    expect(history[1].previousMetrics).toBeNull();
    expect(history[1].personalRecords).toEqual({
      weight: true,
      reps: true,
      volume: true,
    });
  });

  it('filters history by the selected day window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-12T12:00:00.000Z'));

    const history = buildProgressHistory(workouts, 'squat');

    expect(filterProgressHistoryByDays(history, 7).map((session) => session.workoutId)).toEqual(['w2']);
    expect(filterProgressHistoryByDays(history, 30).map((session) => session.workoutId)).toEqual(['w2', 'w1']);
  });

  it('summarizes progress windows with PR count and average volume', () => {
    const history = buildProgressHistory(workouts, 'squat');
    const summary = getProgressWindowSummary(history);

    expect(summary).toMatchObject({
      sessionCount: 2,
      personalRecordCount: 2,
      averageVolume: 525,
      bestWeight: 110,
      latestWeight: 110,
    });
  });
});

describe('split progress history', () => {
  const workouts = [
    {
      id: 'w1',
      date: '2024-01-05',
      splitId: 'push',
      createdAt: '2024-01-05T08:00:00.000Z',
      entries: [
        {
          exerciseId: 'bench',
          sets: [{ weight: 80, reps: 8 }],
        },
      ],
    },
    {
      id: 'w2',
      date: '2024-01-12',
      splitId: 'push',
      notes: 'Felt stronger this week.',
      createdAt: '2024-01-12T08:00:00.000Z',
      entries: [
        {
          exerciseId: 'bench',
          sets: [{ weight: 85, reps: 8 }],
        },
        {
          exerciseId: 'press',
          sets: [{ weight: 40, reps: 10 }],
        },
      ],
    },
  ];

  it('builds split history with split-level comparisons and volume prs', () => {
    const history = buildSplitProgressHistory(workouts, 'push');

    expect(history).toHaveLength(2);
    expect(history[0].metrics).toEqual({
      totalVolume: 1080,
      totalSets: 2,
      totalExercises: 2,
    });
    expect(history[0].notes).toBe('Felt stronger this week.');
    expect(history[0].improvements).toEqual({
      volume: true,
      sets: true,
      exercises: true,
    });
    expect(history[0].personalRecords).toEqual({
      volume: true,
    });
  });

  it('summarizes split windows with average sets and volume deltas', () => {
    const history = buildSplitProgressHistory(workouts, 'push');
    const summary = getSplitProgressWindowSummary(history);

    expect(summary).toMatchObject({
      sessionCount: 2,
      personalRecordCount: 2,
      averageVolume: 860,
      averageSets: 1.5,
      bestVolume: 1080,
      latestSets: 2,
      latestExercises: 2,
    });
    expect(summary.comparison).toMatchObject({
      volumeDelta: 440,
      setsDelta: 1,
      exerciseDelta: 1,
    });
  });
});

describe('dashboard insights', () => {
  it('calculates recent pr hits and average weekly volume', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

    const summary = getDashboardSummary([
      {
        id: 'w1',
        date: '2026-03-10',
        createdAt: '2026-03-10T08:00:00.000Z',
        entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
      },
      {
        id: 'w2',
        date: '2026-03-12',
        createdAt: '2026-03-12T08:00:00.000Z',
        entries: [{ exerciseId: 'bench', sets: [{ weight: 85, reps: 8 }] }],
      },
    ]);

    expect(summary.totalVolumeThisWeek).toBe(1320);
    expect(summary.averageVolumeThisWeek).toBe(660);
    expect(summary.recentPrHits).toBe(2);
    expect(summary.latestPersonalRecords).toEqual([
      {
        exerciseId: 'bench',
        date: '2026-03-12',
        labels: ['Weight PR', 'Volume PR'],
      },
      {
        exerciseId: 'bench',
        date: '2026-03-10',
        labels: ['Weight PR', 'Reps PR', 'Volume PR'],
      },
    ]);
    expect(summary.weeklyVolumeTrend).toHaveLength(7);
  });
});

describe('merge import', () => {
  it('does not append duplicate imported workout IDs more than once', () => {
    const merged = mergeImportedData(
      {
        exercises: [{ id: 'bench', name: 'Bench press', createdAt: '2024-01-01T00:00:00.000Z' }],
        splits: [],
        templates: [],
        workouts: [],
      },
      {
        exercises: [{ id: 'bench', name: 'Bench press', createdAt: '2024-01-01T00:00:00.000Z' }],
        splits: [],
        templates: [],
        workouts: [
          {
            id: 'w1',
            date: '2024-01-12',
            splitId: '',
            notes: '',
            mood: '',
            effort: '',
            createdAt: '2024-01-12T08:00:00.000Z',
            entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
          },
          {
            id: 'w1',
            date: '2024-01-13',
            splitId: '',
            notes: '',
            mood: '',
            effort: '',
            createdAt: '2024-01-13T08:00:00.000Z',
            entries: [{ exerciseId: 'bench', sets: [{ weight: 82.5, reps: 8 }] }],
          },
        ],
      },
    );

    expect(merged.workouts).toHaveLength(1);
    expect(merged.workouts[0].id).toBe('w1');
  });
});

describe('progressive overload suggestions', () => {
  it('returns null when there is no previous workout for the exercise', () => {
    expect(suggestNextSets([], 'squat')).toBeNull();
    expect(suggestNextSets([], '')).toBeNull();
  });

  it('suggests weight increase when reps were consistent within each weight group', () => {
    const workouts = [
      {
        id: 'w1',
        date: '2024-01-12',
        createdAt: '2024-01-12T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'bench',
            sets: [
              { weight: 80, reps: 8 },
              { weight: 80, reps: 8 },
              { weight: 82.5, reps: 6 },
              { weight: 82.5, reps: 6 },
            ],
          },
        ],
      },
    ];

    const suggestion = suggestNextSets(workouts, 'bench');

    expect(suggestion).toEqual({
      sets: [
        { weight: 82.5, reps: 8 },
        { weight: 82.5, reps: 8 },
        { weight: 85, reps: 6 },
        { weight: 85, reps: 6 },
      ],
      reason: 'Weight up',
    });
  });

  it('suggests rep increase when reps dropped at the same weight', () => {
    const workouts = [
      {
        id: 'w1',
        date: '2024-01-12',
        createdAt: '2024-01-12T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'bench',
            sets: [
              { weight: 80, reps: 8 },
              { weight: 80, reps: 7 },
              { weight: 80, reps: 6 },
            ],
          },
        ],
      },
    ];

    const suggestion = suggestNextSets(workouts, 'bench');

    expect(suggestion).toEqual({
      sets: [
        { weight: 80, reps: 8 },
        { weight: 80, reps: 8 },
        { weight: 80, reps: 7 },
      ],
      reason: 'Reps up',
    });
  });

  it('suggests weight increase for a single set', () => {
    const workouts = [
      {
        id: 'w1',
        date: '2024-01-12',
        createdAt: '2024-01-12T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'squat',
            sets: [{ weight: 100, reps: 5 }],
          },
        ],
      },
    ];

    const suggestion = suggestNextSets(workouts, 'squat');

    expect(suggestion).toEqual({
      sets: [{ weight: 102.5, reps: 5 }],
      reason: 'Weight up',
    });
  });

  it('uses the latest workout when multiple workouts exist', () => {
    const workouts = [
      {
        id: 'w1',
        date: '2024-01-05',
        createdAt: '2024-01-05T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'squat',
            sets: [{ weight: 100, reps: 5 }],
          },
        ],
      },
      {
        id: 'w2',
        date: '2024-01-12',
        createdAt: '2024-01-12T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'squat',
            sets: [{ weight: 110, reps: 5 }],
          },
        ],
      },
    ];

    const suggestion = suggestNextSets(workouts, 'squat');

    expect(suggestion).toEqual({
      sets: [{ weight: 112.5, reps: 5 }],
      reason: 'Weight up',
    });
  });

  it('uses exercise goals to suggest a weight increase from the target range', () => {
    const workouts = [
      {
        id: 'w1',
        date: '2024-01-12',
        createdAt: '2024-01-12T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'bench',
            sets: [
              { weight: 80, reps: 8 },
              { weight: 80, reps: 8 },
            ],
          },
        ],
      },
    ];

    const suggestion = suggestNextSets(workouts, 'bench', {
      targetRepMin: 6,
      targetRepMax: 8,
      weightStep: 1.25,
    });

    expect(suggestion).toEqual({
      sets: [
        { weight: 81.25, reps: 6 },
        { weight: 81.25, reps: 6 },
      ],
      reason: 'Weight up',
    });
  });

  it('uses exercise goals to suggest building reps before adding weight', () => {
    const workouts = [
      {
        id: 'w1',
        date: '2024-01-12',
        createdAt: '2024-01-12T08:00:00.000Z',
        entries: [
          {
            exerciseId: 'bench',
            sets: [
              { weight: 80, reps: 6 },
              { weight: 80, reps: 5 },
            ],
          },
        ],
      },
    ];

    const suggestion = suggestNextSets(workouts, 'bench', {
      targetRepMin: 6,
      targetRepMax: 8,
      weightStep: 2.5,
    });

    expect(suggestion).toEqual({
      sets: [
        { weight: 80, reps: 6 },
        { weight: 80, reps: 6 },
      ],
      reason: 'Build reps',
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
