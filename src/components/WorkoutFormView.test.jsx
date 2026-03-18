// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkoutFormView from './WorkoutFormView.jsx';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function renderWorkoutFormView(overrides = {}) {
  const props = {
    exercises: [],
    splits: [],
    templates: [],
    workouts: [],
    workoutForm: {
      date: '2024-01-12',
      splitId: '',
      notes: '',
      mood: '',
      effort: '',
      skippedEntries: [],
      entries: [
        {
          id: 'entry-1',
          exerciseId: '',
          sets: [{ id: 'set-1', weight: '', reps: '', completed: false }],
        },
      ],
    },
    selectedWorkoutTemplateId: '',
    editingTemplateId: null,
    templateDraftName: '',
    editingWorkoutId: null,
    workoutMessage: { type: '', text: '' },
    setWorkoutForm: vi.fn(),
    setSelectedWorkoutTemplateId: vi.fn(),
    setTemplateDraftName: vi.fn(),
    updateWorkoutEntry: vi.fn(),
    applyLatestWorkoutToEntry: vi.fn(),
    handleWorkoutSplitChange: vi.fn(),
    loadWorkoutTemplate: vi.fn(),
    saveCurrentWorkoutAsTemplate: vi.fn(),
    updateSelectedWorkoutTemplate: vi.fn(),
    handleTemplateEditorSubmit: vi.fn((event) => event.preventDefault()),
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
        notes: '',
        mood: '',
        effort: '',
        skippedEntries: [],
        entries: [
          {
            id: 'entry-1',
            exerciseId: 'squat',
            sets: [{ id: 'set-1', weight: '', reps: '', completed: false }],
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
        notes: '',
        mood: '',
        effort: '',
        skippedEntries: [
          {
            id: 'entry-skipped',
            exerciseId: 'squat',
            sets: [{ id: 'set-1', weight: '', reps: '', completed: false }],
          },
        ],
        entries: [],
      },
    });

    expect(screen.getByText('Skipped today')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Restore Back squat' }));

    expect(props.setWorkoutForm).toHaveBeenCalledTimes(1);
  });

  it('lets you type workout notes', async () => {
    const user = userEvent.setup();
    const props = renderWorkoutFormView({
      exercises: [{ id: 'bench', name: 'Bench press' }],
    });

    const notesField = screen.getAllByLabelText('Notes').at(-1);
    await user.type(notesField, 'Felt strong today');

    expect(props.setWorkoutForm).toHaveBeenCalled();
  });

  it('shows session context fields, quick progression actions, and a rest timer', async () => {
    vi.useFakeTimers();
    const props = renderWorkoutFormView({
      exercises: [{ id: 'bench', name: 'Bench press' }],
      workoutForm: {
        date: '2024-01-12',
        splitId: '',
        notes: '',
        mood: '',
        effort: '',
        skippedEntries: [],
        entries: [
          {
            id: 'entry-1',
            exerciseId: 'bench',
            sets: [{ id: 'set-1', weight: '80', reps: '8', completed: false }],
          },
        ],
      },
    });

    expect(screen.getByLabelText('Mood')).toBeTruthy();
    expect(screen.getByLabelText('Effort')).toBeTruthy();
    expect(screen.getByText('Rest timer')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add 2.5 kilograms to set 1 for Bench press' }));
    expect(props.updateWorkoutEntry).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(props.updateWorkoutEntry).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Start 60 second rest timer for set 1 of Bench press' }));
    expect(screen.getByText('01:00')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:59')).toBeTruthy();
  });

  it('shows update template action when a template is selected', async () => {
    const user = userEvent.setup();
    const props = renderWorkoutFormView({
      exercises: [{ id: 'bench', name: 'Bench press' }],
      templates: [{ id: 'template-1', name: 'Push template' }],
      selectedWorkoutTemplateId: 'template-1',
    });

    await user.click(screen.getByRole('button', { name: 'Update template' }));

    expect(props.updateSelectedWorkoutTemplate).toHaveBeenCalledTimes(1);
  });

  it('shows dedicated template editor controls when editing a template', async () => {
    const user = userEvent.setup();
    const props = renderWorkoutFormView({
      exercises: [{ id: 'bench', name: 'Bench press' }],
      editingTemplateId: 'template-1',
      templateDraftName: 'Upper A',
    });

    expect(screen.getByRole('heading', { name: 'Edit template' })).toBeTruthy();
    expect(screen.getByLabelText('Template name')).toBeTruthy();
    expect(screen.queryByLabelText('Workout date')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Save template' }));

    expect(props.handleTemplateEditorSubmit).toHaveBeenCalledTimes(1);
  });
});
