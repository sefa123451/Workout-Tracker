// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { STORAGE_KEY } from './lib/workoutData.js';

function renderAppWithStoredData(data = { exercises: [], workouts: [] }) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render(<App />);
}

function createJsonFile(payload) {
  const file = new File([JSON.stringify(payload)], 'import.json', {
    type: 'application/json',
  });

  file.text = vi.fn().mockResolvedValue(JSON.stringify(payload));

  return file;
}

describe('App integration flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('creates an exercise from the exercise view', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData();

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.type(screen.getByLabelText('Exercise name'), 'Back squat');
    await user.click(screen.getByRole('button', { name: 'Add exercise' }));

    expect(screen.getByText('Added Back squat.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Back squat' })).toBeTruthy();
  });

  it('saves a workout and shows it in history', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Log workout' }));
    await user.selectOptions(screen.getByLabelText('Exercise'), 'squat');
    await user.type(screen.getByLabelText('Weight'), '100');
    await user.type(screen.getByLabelText('Reps'), '5');
    await user.click(screen.getByRole('button', { name: 'Save workout' }));

    expect(screen.getByText('Past sessions')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Back squat' })).toBeTruthy();
    expect(screen.getByText('Set 1: 100 × 5')).toBeTruthy();
  });

  it('creates a workout from a split and shows the split in history', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
        {
          id: 'press',
          name: 'Shoulder press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      splits: [
        {
          id: 'push',
          name: 'Push',
          createdAt: '2024-01-02T10:00:00.000Z',
          exercises: [
            { id: 'split-1', exerciseId: 'bench', defaultSets: 1 },
            { id: 'split-2', exerciseId: 'press', defaultSets: 1 },
          ],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Log workout' }));
    await user.selectOptions(screen.getByLabelText('Split'), 'push');

    const weightInputs = screen.getAllByLabelText('Weight');
    const repInputs = screen.getAllByLabelText('Reps');

    await user.type(weightInputs[0], '80');
    await user.type(repInputs[0], '8');
    await user.type(weightInputs[1], '40');
    await user.type(repInputs[1], '10');
    await user.click(screen.getByRole('button', { name: 'Save workout' }));

    expect(screen.getByText('Push')).toBeTruthy();
    expect(screen.getByText('Bench press')).toBeTruthy();
    expect(screen.getByText('Shoulder press')).toBeTruthy();
  });

  it('keeps current data when a valid import is canceled', async () => {
    renderAppWithStoredData({
      exercises: [
        {
          id: 'existing',
          name: 'Existing exercise',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fileInput = document.querySelector('input[type="file"]');
    const file = createJsonFile({
      exercises: [{ id: 'imported', name: 'Imported exercise' }],
      workouts: [],
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Import canceled. Your current data was kept.')).toBeTruthy();
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    await userEvent.setup().click(screen.getByRole('button', { name: 'exercises' }));
    expect(screen.getByRole('heading', { name: 'Existing exercise' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Imported exercise' })).toBeNull();
  });

  it('replaces current data when a valid import is confirmed', async () => {
    renderAppWithStoredData({
      exercises: [
        {
          id: 'existing',
          name: 'Existing exercise',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fileInput = document.querySelector('input[type="file"]');
    const file = createJsonFile({
      exercises: [{ id: 'imported', name: 'Imported exercise' }],
      workouts: [],
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Imported 1 exercises, 0 splits, and 0 workouts.')).toBeTruthy();

    await userEvent.setup().click(screen.getByRole('button', { name: 'exercises' }));
    expect(screen.getByRole('heading', { name: 'Imported exercise' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Existing exercise' })).toBeNull();

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toMatchObject({
        version: 1,
        exercises: [{ id: 'imported', name: 'Imported exercise' }],
      });
    });
  });

  it('shows an error for invalid JSON imports', async () => {
    renderAppWithStoredData();

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['{'], 'broken.json', { type: 'application/json' });
    file.text = vi.fn().mockResolvedValue('{');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Selected file is not valid JSON.')).toBeTruthy();
  });

  it('shows dashboard weekly summary based on current-week workouts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

    renderAppWithStoredData({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-03-10',
          createdAt: '2026-03-10T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }],
        },
        {
          id: 'workout-2',
          date: '2026-03-14',
          createdAt: '2026-03-14T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 110, reps: 5 }] }],
        },
        {
          id: 'workout-3',
          date: '2026-03-01',
          createdAt: '2026-03-01T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 90, reps: 5 }] }],
        },
      ],
    });

    const workoutsThisWeekCard = screen.getByText('Workouts this week').closest('.stat-card');
    const mostTrainedCard = screen.getByText('Most trained exercise').closest('.stat-card');

    expect(workoutsThisWeekCard.textContent).toContain('2');
    expect(mostTrainedCard.textContent).toContain('Back squat');
    expect(mostTrainedCard.textContent).toContain('3 workout entries');
  });

  it('edits and then deletes a workout from history', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAppWithStoredData({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'squat',
              sets: [{ weight: 100, reps: 5 }],
            },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'history' }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const weightInput = screen.getByLabelText('Weight');
    await user.clear(weightInput);
    await user.type(weightInput, '110');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText('Set 1: 110 × 5')).toBeTruthy();
    expect(screen.getByText(/Best weight 110/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByText('Workout history is empty')).toBeTruthy();
  });

  it('preserves workout history as unknown exercise when deleting an exercise', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAppWithStoredData({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'squat',
              sets: [{ weight: 100, reps: 5 }],
            },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByText('Deleted Back squat. Linked workout history was preserved.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'history' }));
    expect(screen.getByText('Unknown exercise (deleted)')).toBeTruthy();
  });

  it('shows progress markers for an exercise with multiple workouts', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-03-10',
          createdAt: '2026-03-10T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'squat',
              sets: [{ weight: 100, reps: 5 }],
            },
          ],
        },
        {
          id: 'workout-2',
          date: '2026-03-14',
          createdAt: '2026-03-14T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'squat',
              sets: [{ weight: 110, reps: 5 }],
            },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'progress' }));

    expect(screen.getByText('Volume trend')).toBeTruthy();
    expect(screen.getAllByText('Weight PR').length).toBeGreaterThan(0);
    expect(screen.getByText('Weight up')).toBeTruthy();
    expect(screen.getByText(/Compared with/)).toBeTruthy();
  });

  it('updates the progress range when switching to 7d', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

    renderAppWithStoredData({
      exercises: [
        {
          id: 'squat',
          name: 'Back squat',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-02-20',
          createdAt: '2026-02-20T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }],
        },
        {
          id: 'workout-2',
          date: '2026-03-14',
          createdAt: '2026-03-14T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 110, reps: 5 }] }],
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'progress' }));
    fireEvent.click(screen.getByRole('button', { name: '7d' }));

    expect(screen.getByText('Entries in the last 7 days')).toBeTruthy();
    expect(screen.queryByText(/No entries in the last 7 days/)).toBeNull();
  });
});
