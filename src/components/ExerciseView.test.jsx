// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExerciseView from './ExerciseView.jsx';

afterEach(() => {
  cleanup();
});

function renderExerciseView(overrides = {}) {
  const props = {
    editingExerciseId: null,
    exerciseName: '',
    setExerciseName: vi.fn(),
    handleExerciseSubmit: vi.fn((event) => event.preventDefault()),
    resetExerciseForm: vi.fn(),
    exerciseMessage: { type: '', text: '' },
    exercises: [],
    formatCalendarDate: vi.fn(() => 'Jan 1, 2024'),
    startEditingExercise: vi.fn(),
    deleteExercise: vi.fn(),
    moveExercise: vi.fn(),
    splits: [],
    templates: [],
    splitForm: { name: '', exercises: [] },
    setSplitForm: vi.fn(),
    editingSplitId: null,
    splitMessage: { type: '', text: '' },
    handleSplitSubmit: vi.fn((event) => event.preventDefault()),
    resetSplitForm: vi.fn(),
    startEditingSplit: vi.fn(),
    deleteSplit: vi.fn(),
    createSplitExercise: vi.fn(() => ({ id: 'split-exercise-1', exerciseId: '', defaultSets: '3' })),
    getExerciseName: vi.fn(() => 'Back squat'),
    loadWorkoutTemplate: vi.fn(),
    deleteWorkoutTemplate: vi.fn(),
    moveWorkoutTemplate: vi.fn(),
    renameWorkoutTemplate: vi.fn(),
    duplicateWorkoutTemplate: vi.fn(),
    createSplitFromTemplate: vi.fn(),
    startEditingWorkoutTemplate: vi.fn(),
    ...overrides,
  };

  render(<ExerciseView {...props} />);
  return props;
}

describe('ExerciseView', () => {
  it('shows a clean empty state when no exercises exist', () => {
    renderExerciseView();

    expect(screen.getByText('No exercises yet')).toBeTruthy();
    expect(screen.getByText('Add your first movement to start logging.')).toBeTruthy();
  });

  it('calls edit and delete handlers for saved exercises', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Edit Back squat' }));
    await user.click(screen.getByRole('button', { name: 'Delete Back squat' }));

    expect(props.startEditingExercise).toHaveBeenCalledWith('squat');
    expect(props.deleteExercise).toHaveBeenCalledWith('squat');
  });

  it('calls move handlers for saved exercises', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
    });

    await user.click(screen.getAllByRole('button', { name: 'Move Back squat up' }).at(-1));
    await user.click(screen.getAllByRole('button', { name: 'Move Bench press down' }).at(-1));

    expect(props.moveExercise).toHaveBeenCalledWith('squat', 'up');
    expect(props.moveExercise).toHaveBeenCalledWith('bench', 'down');
  });

  it('calls move handlers for workout templates', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
        {
          id: 'template-2',
          name: 'Pull template',
          entries: [{ exerciseId: 'row', sets: [{ weight: 60, reps: 10 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Move template Pull template up' }));
    await user.click(screen.getByRole('button', { name: 'Move template Push template down' }));

    expect(props.moveWorkoutTemplate).toHaveBeenCalledWith('template-2', 'up');
    expect(props.moveWorkoutTemplate).toHaveBeenCalledWith('template-1', 'down');
  });

  it('calls rename handler for workout templates', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getAllByRole('button', { name: 'Rename template Push template' }).at(-1));

    expect(props.renameWorkoutTemplate).toHaveBeenCalledWith('template-1');
  });

  it('calls edit handler for workout templates', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Edit template Push template' }));

    expect(props.startEditingWorkoutTemplate).toHaveBeenCalledWith('template-1');
  });

  it('calls duplicate handler for workout templates', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Duplicate template Push template' }));

    expect(props.duplicateWorkoutTemplate).toHaveBeenCalledWith('template-1');
  });

  it('calls split conversion handler for workout templates', async () => {
    const user = userEvent.setup();
    const props = renderExerciseView({
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Use template Push template as a split template' }));

    expect(props.createSplitFromTemplate).toHaveBeenCalledWith('template-1');
  });
});
