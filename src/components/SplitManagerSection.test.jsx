// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SplitManagerSection from './SplitManagerSection.jsx';

function renderSplitManagerSection(overrides = {}) {
  const props = {
    exercises: [
      { id: 'bench', name: 'Bench press' },
      { id: 'press', name: 'Shoulder press' },
    ],
    splits: [],
    splitForm: {
      name: 'Push',
      exercises: [
        { id: 'split-1', exerciseId: 'bench', defaultSets: '3' },
        { id: 'split-2', exerciseId: 'press', defaultSets: '2' },
      ],
    },
    setSplitForm: vi.fn(),
    editingSplitId: null,
    splitMessage: { type: '', text: '' },
    handleSplitSubmit: vi.fn((event) => event.preventDefault()),
    resetSplitForm: vi.fn(),
    startEditingSplit: vi.fn(),
    deleteSplit: vi.fn(),
    createSplitExercise: vi.fn(() => ({ id: 'split-3', exerciseId: '', defaultSets: '3' })),
    getExerciseName: vi.fn((exerciseId) =>
      exerciseId === 'bench' ? 'Bench press' : 'Shoulder press',
    ),
    ...overrides,
  };

  render(<SplitManagerSection {...props} />);
  return props;
}

describe('SplitManagerSection', () => {
  it('reorders split exercises when moving one down', async () => {
    const user = userEvent.setup();
    const props = renderSplitManagerSection();

    await user.click(screen.getByRole('button', { name: 'Move split exercise 1 down' }));

    expect(props.setSplitForm).toHaveBeenCalledTimes(1);

    const reorderUpdater = props.setSplitForm.mock.calls[0][0];
    const result = reorderUpdater({
      name: 'Push',
      exercises: [
        { id: 'split-1', exerciseId: 'bench', defaultSets: '3' },
        { id: 'split-2', exerciseId: 'press', defaultSets: '2' },
      ],
    });

    expect(result.exercises.map((entry) => entry.id)).toEqual(['split-2', 'split-1']);
  });
});
