import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProgressHistory,
  filterProgressHistoryByDays,
  getEntryMetrics,
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
      workouts: [
        {
          id: 'w1',
          date: '2024-01-12',
          splitId: '',
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
});

afterEach(() => {
  vi.useRealTimers();
});
