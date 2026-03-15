// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ExerciseView from './ExerciseView.jsx';

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
    ...overrides,
  };

  render(<ExerciseView {...props} />);
  return props;
}

describe('ExerciseView', () => {
  it('shows a clean empty state when no exercises exist', () => {
    renderExerciseView();

    expect(screen.getByText('No exercises yet')).toBeTruthy();
    expect(
      screen.getByText('Create your first exercise to unlock workout logging and progress tracking.'),
    ).toBeTruthy();
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

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(props.startEditingExercise).toHaveBeenCalledWith('squat');
    expect(props.deleteExercise).toHaveBeenCalledWith('squat');
  });
});
