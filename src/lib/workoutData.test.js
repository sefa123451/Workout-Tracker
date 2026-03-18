import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProgressHistory,
  buildSplitProgressHistory,
  buildWorkoutHistoryCsv,
  filterProgressHistoryByDays,
  getEntryMetrics,
  getDashboardSummary,
  getProgressWindowSummary,
  getSplitProgressWindowSummary,
  isValidDateInput,
  parseSet,
  validateImportedData,
} from './workoutData.js';

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

    expect(csv).toContain('Date,Split,Exercise,Set,Weight,Reps,Volume,Notes');
    expect(csv).toContain('2024-01-12,Push,Bench press,1,80,8,640,Top set felt easy');
    expect(csv).toContain('2024-01-12,Push,Bench press,2,82.5,6,495,Top set felt easy');
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

  it('normalizes valid imported data', () => {
    const result = validateImportedData({
      exercises: [{ id: '1', name: 'Squat' }],
      workouts: [
        {
          id: 'w1',
          date: '2024-01-12',
          splitId: '',
          notes: 'Felt sharp and steady.',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: '1', sets: [{ weight: 100, reps: 5 }] }],
        },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      exercises: [
        {
          id: '1',
          name: 'Squat',
          createdAt: expect.any(String),
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
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: '1', sets: [{ weight: 100, reps: 5 }] }],
        },
      ],
    });
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

afterEach(() => {
  vi.useRealTimers();
});
