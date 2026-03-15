// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WorkoutFormView from './WorkoutFormView.jsx';

function renderWorkoutFormView(overrides = {}) {
  const props = {
    exercises: [],
    splits: [],
    workouts: [],
    workoutForm: {
      date: '2024-01-12',
      splitId: '',
      skippedEntries: [],
      entries: [
        {
          id: 'entry-1',
          exerciseId: '',
          sets: [{ id: 'set-1', weight: '', reps: '' }],
        },
      ],
    },
    editingWorkoutId: null,
    workoutMessage: { type: '', text: '' },
    setWorkoutForm: vi.fn(),
    updateWorkoutEntry: vi.fn(),
    applyLatestWorkoutToEntry: vi.fn(),
    handleWorkoutSplitChange: vi.fn(),
    handleWorkoutSubmit: vi.fn((event) => event.preventDefault()),
    resetWorkoutForm: vi.fn(),
    createSet: vi.fn(() => ({ id: 'new-set', weight: '', reps: '' })),
    createSetFromValues: vi.fn((weight, reps) => ({ id: 'copy-set', weight, reps })),
    createWorkoutEntry: vi.fn(() => ({ id: 'new-entry', exerciseId: '', sets: [] })),
    formatDisplayDate: vi.fn(() => 'Jan 12, 2024'),
    formatNumber: vi.fn((value) => String(value)),
    getSplitName: vi.fn(() => 'Push'),
    ...overrides,
  };

  render(<WorkoutFormView {...props} />);
  return props;
}

describe('WorkoutFormView', () => {
  it('shows an empty state when no exercises exist', () => {
    renderWorkoutFormView();

    expect(screen.getByText('Create exercises first')).toBeTruthy();
  });

  it('shows the latest workout suggestion and triggers apply on click', async () => {
    const user = userEvent.setup();
    const props = renderWorkoutFormView({
      exercises: [{ id: 'squat', name: 'Back squat' }],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-10',
          createdAt: '2024-01-10T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'squat',
              sets: [{ weight: 100, reps: 5 }],
            },
          ],
        },
      ],
      workoutForm: {
        date: '2024-01-12',
        splitId: '',
        skippedEntries: [],
        entries: [
          {
            id: 'entry-1',
            exerciseId: 'squat',
            sets: [{ id: 'set-1', weight: '', reps: '' }],
          },
        ],
      },
    });

    expect(screen.getByText('Last workout')).toBeTruthy();
    expect(screen.getByText('Set 1: 100 × 5')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Use last workout values for Back squat' }));

    expect(props.applyLatestWorkoutToEntry).toHaveBeenCalledTimes(1);
    expect(props.applyLatestWorkoutToEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({
        workoutId: 'workout-1',
        date: '2024-01-10',
      }),
    );
  });

  it('shows skipped split exercises and restores them', async () => {
    const user = userEvent.setup();
    const props = renderWorkoutFormView({
      exercises: [{ id: 'squat', name: 'Back squat' }],
      splits: [{ id: 'legs', name: 'Leg day', exercises: [] }],
      workoutForm: {
        date: '2024-01-12',
        splitId: 'legs',
        skippedEntries: [
          {
            id: 'entry-skipped',
            exerciseId: 'squat',
            sets: [{ id: 'set-1', weight: '', reps: '' }],
          },
        ],
        entries: [],
      },
    });

    expect(screen.getByText('Skipped today')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Restore Back squat' }));

    expect(props.setWorkoutForm).toHaveBeenCalledTimes(1);
  });
});
