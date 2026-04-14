// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { STORAGE_KEY, getInputValueFromDate } from './lib/workoutData.js';

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
    renderAppWithStoredData({
      exercises: [
        {
          id: 'existing-exercise',
          name: 'Existing exercise',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    const exerciseNameInput = screen.getByLabelText('Exercise name');
    const exerciseForm = exerciseNameInput.closest('form');
    await user.type(exerciseNameInput, 'Back squat');
    await user.click(within(exerciseForm).getByRole('button', { name: 'Add exercise' }));

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
    await user.click(screen.getByRole('button', { name: /Show details for workout from/i }));
    expect(screen.getByText('Set 1: 100 × 5')).toBeTruthy();
  });

  it('saves workout notes and shows them in history', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Log workout' }));
    await user.type(screen.getByLabelText('Notes'), 'Felt strong on the top sets.');
    await user.selectOptions(screen.getByLabelText('Exercise'), 'bench');
    await user.type(screen.getByLabelText('Weight'), '80');
    await user.type(screen.getByLabelText('Reps'), '8');
    await user.click(screen.getByRole('button', { name: 'Save workout' }));

    await user.click(screen.getByRole('button', { name: /Show details for workout from/i }));
    expect(screen.getByText('Session note')).toBeTruthy();
    expect(screen.getByText('Felt strong on the top sets.')).toBeTruthy();
  });

  it('saves workout mood and effort and shows them in history', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Log workout' }));
    await user.selectOptions(screen.getByLabelText('Mood'), 'Great');
    await user.selectOptions(screen.getByLabelText('Effort'), 'Hard');
    await user.selectOptions(screen.getByLabelText('Exercise'), 'bench');
    await user.type(screen.getByLabelText('Weight'), '80');
    await user.type(screen.getByLabelText('Reps'), '8');
    await user.click(screen.getByRole('button', { name: 'Save workout' }));

    expect(screen.getByText('Mood Great')).toBeTruthy();
    expect(screen.getByText('Effort Hard')).toBeTruthy();
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

    expect(screen.getAllByText('Push').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shoulder press').length).toBeGreaterThan(0);
  });

  it('starts a split workout directly from the dashboard', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      splits: [
        {
          id: 'push',
          name: 'Push',
          createdAt: '2024-01-02T10:00:00.000Z',
          exercises: [{ id: 'split-1', exerciseId: 'bench', defaultSets: 2 }],
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          splitId: 'push',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Start Push' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Split').value).toBe('push');
    expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
  });

  it('repeats the latest workout from the dashboard', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          notes: 'Old note',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Repeat last workout' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Weight').value).toBe('80');
    expect(screen.getByLabelText('Reps').value).toBe('8');
    expect(screen.getByLabelText('Notes').value).toBe('');
  });

  it('updates the weekly goal and reflects it on the dashboard', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
    renderAppWithStoredData({
      weeklyWorkoutGoal: 4,
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-04-06',
          createdAt: '2026-04-06T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'settings' }));
    fireEvent.change(screen.getByLabelText('Target sessions'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'dashboard' }));

    expect(screen.getByRole('heading', { name: 'Week in progress' })).toBeTruthy();
    const weeklyGoalProgress = screen.getByRole('progressbar', { name: 'Weekly goal progress' });
    expect(weeklyGoalProgress.getAttribute('aria-valuenow')).toBe('1');
    expect(weeklyGoalProgress.getAttribute('aria-valuemax')).toBe('5');
    expect(screen.getByText('Behind pace')).toBeTruthy();
    expect(screen.getByText('5d')).toBeTruthy();
    expect(screen.getByText('Remaining')).toBeTruthy();
  });

  it('saves a bodyweight check-in in settings and shows it on the dashboard', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      bodyweightEntries: [],
      exercises: [],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'settings' }));
    await user.type(screen.getByLabelText('Bodyweight (kg)'), '82.4');
    await user.click(screen.getByRole('button', { name: 'Save bodyweight' }));

    expect(screen.getByText(/Saved bodyweight check-in/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'dashboard' }));
    const bodyweightSection = screen.getByText('Bodyweight').closest('section');

    expect(bodyweightSection).toBeTruthy();
    expect(within(bodyweightSection).getByRole('heading', { name: /82[.,]4 kg/i })).toBeTruthy();
  });

  it('uses a local calendar default for the bodyweight check-in date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T12:00:00.000Z'));
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('1999-12-31T23:59:59.000Z');

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    fireEvent.click(screen.getByRole('button', { name: 'settings' }));

    expect(screen.getByLabelText('Check-in date').value).toBe(
      getInputValueFromDate(new Date('2026-04-14T12:00:00.000Z')),
    );
  });

  it('shows best set, estimated one rep max, and best session in progress', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-03-30',
          createdAt: '2026-03-30T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 95, reps: 5 }] }],
        },
        {
          id: 'workout-2',
          date: '2026-04-04',
          createdAt: '2026-04-04T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'bench',
              sets: [
                { weight: 100, reps: 5 },
                { weight: 90, reps: 8 },
              ],
            },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'progress' }));

    expect(await screen.findByText('Best set')).toBeTruthy();
    expect(await screen.findByText('100 x 5')).toBeTruthy();
    expect(screen.getByText('Est. 1RM')).toBeTruthy();
    expect(screen.getByText(/116[.,]67/)).toBeTruthy();
    const bestSessionCard = screen.getByText('Best session').closest('.stat-card');
    expect(bestSessionCard).toBeTruthy();
    expect(within(bestSessionCard).getByText(/1[.,]220/)).toBeTruthy();
  });

  it('loads a workout into the split planner as a new template', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
        {
          id: 'fly',
          name: 'Cable fly',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      splits: [
        {
          id: 'push',
          name: 'Push',
          createdAt: '2024-01-02T10:00:00.000Z',
          exercises: [{ id: 'split-1', exerciseId: 'bench', defaultSets: 3 }],
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          splitId: 'push',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'bench',
              sets: [
                { weight: 80, reps: 8 },
                { weight: 82.5, reps: 6 },
              ],
            },
            {
              exerciseId: 'fly',
              sets: [{ weight: 20, reps: 12 }],
            },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'history' }));
    await user.click(screen.getByRole('button', { name: /More actions for workout from/i }));
    await user.click(
      screen.getByRole('button', { name: /Use workout from .* as a split template/ }),
    );

    expect(screen.getByRole('heading', { name: 'Split planner' })).toBeTruthy();
    expect(screen.getByDisplayValue('Push copy')).toBeTruthy();
    expect(screen.getByLabelText('Exercise 1').value).toBe('bench');
    expect(screen.getByLabelText('Exercise 2').value).toBe('fly');
    expect(screen.getAllByLabelText('Default sets')[0].value).toBe('2');
    expect(screen.getAllByLabelText('Default sets')[1].value).toBe('1');
    expect(screen.getByText('Loaded workout as a new split template.')).toBeTruthy();
  });

  it('saves a workout as a reusable template and loads it into the log form', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      splits: [
        {
          id: 'push',
          name: 'Push',
          createdAt: '2024-01-02T10:00:00.000Z',
          exercises: [{ id: 'split-1', exerciseId: 'bench', defaultSets: 2 }],
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          splitId: 'push',
          notes: 'Top sets first',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'history' }));
    await user.click(screen.getByRole('button', { name: /More actions for workout from/i }));
    await user.click(screen.getByRole('button', { name: /Save workout from .* as a template/ }));

    expect(screen.getByText('Saved Push template.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Push template' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Use template Push template' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Template').value).toBeTruthy();
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Split').value).toBe('push');
    expect(screen.getByLabelText('Weight').value).toBe('80');
    expect(screen.getByLabelText('Reps').value).toBe('8');
    expect(screen.getByLabelText('Notes').value).toBe('Top sets first');
  });

  it('starts a workout template directly from the dashboard', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Keep rest short',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Use template' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Template').value).toBe('template-1');
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Weight').value).toBe('80');
    expect(screen.getByLabelText('Reps').value).toBe('8');
    expect(screen.getByLabelText('Notes').value).toBe('Keep rest short');
  });

  it('starts a workout from the last used template on the dashboard', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    window.localStorage.setItem('workout-tracker-last-template-id', 'template-1');

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Keep rest short',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Start last template' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Template').value).toBe('template-1');
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Weight').value).toBe('80');
    expect(screen.getByLabelText('Notes').value).toBe('Keep rest short');
  });

  it('saves the current workout form as a new template', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Log workout' }));
    await user.selectOptions(screen.getByLabelText('Exercise'), 'bench');
    await user.type(screen.getByLabelText('Weight'), '80');
    await user.type(screen.getByLabelText('Reps'), '8');
    await user.type(screen.getByLabelText('Notes'), 'Keep the setup tight');
    await user.click(screen.getByRole('button', { name: 'Save as template' }));
    const saveTemplateDialog = screen.getByRole('dialog', { name: 'Save template' });
    await user.clear(within(saveTemplateDialog).getByLabelText('Template name'));
    await user.type(within(saveTemplateDialog).getByLabelText('Template name'), 'Upper day');
    await user.click(within(saveTemplateDialog).getByRole('button', { name: 'Save template' }));

    expect(screen.getByText('Saved Upper day.')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Upper day' }).selected).toBe(true);

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    expect(screen.getByRole('heading', { name: 'Upper day' })).toBeTruthy();
  });

  it('renames a workout template from the library', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      exercises: [{ id: 'bench', name: 'Bench press', createdAt: '2024-01-01T10:00:00.000Z' }],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: '',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(screen.getByRole('button', { name: 'Rename template Push template' }));
    const renameTemplateDialog = screen.getByRole('dialog', { name: 'Rename template' });
    await user.clear(within(renameTemplateDialog).getByLabelText('Template name'));
    await user.type(within(renameTemplateDialog).getByLabelText('Template name'), 'Upper A');
    await user.click(within(renameTemplateDialog).getByRole('button', { name: 'Rename template' }));

    expect(screen.getByText('Renamed template to Upper A.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Upper A' })).toBeTruthy();
  });

  it('updates a selected workout template from the current log form', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    renderAppWithStoredData({
      exercises: [{ id: 'bench', name: 'Bench press', createdAt: '2024-01-01T10:00:00.000Z' }],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Old note',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'Use template' }));
    await user.clear(screen.getByLabelText('Weight'));
    await user.type(screen.getByLabelText('Weight'), '85');
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Updated note');
    await user.click(screen.getByRole('button', { name: 'Update template' }));

    expect(screen.getByText('Updated Push template.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'dashboard' }));
    await user.click(screen.getByRole('button', { name: 'Use template' }));

    expect(screen.getByLabelText('Template').value).toBe('template-1');
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Weight').value).toBe('85');
    expect(screen.getByLabelText('Notes').value).toBe('Updated note');
  });

  it('edits a workout template in the dedicated template editor', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    renderAppWithStoredData({
      exercises: [{ id: 'bench', name: 'Bench press', createdAt: '2024-01-01T10:00:00.000Z' }],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Old note',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(screen.getByRole('button', { name: 'Edit template Push template' }));

    expect(screen.getByRole('heading', { name: 'Edit template' })).toBeTruthy();
    expect(screen.queryByLabelText('Workout date')).toBeNull();

    await user.clear(screen.getByLabelText('Template name'));
    await user.type(screen.getByLabelText('Template name'), 'Upper A');
    await user.clear(screen.getByLabelText('Weight'));
    await user.type(screen.getByLabelText('Weight'), '85');
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Updated in editor');
    await user.click(screen.getByRole('button', { name: 'Save template' }));

    expect(screen.getByText('Updated Upper A.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Upper A' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Use template Upper A' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Template').value).toBe('template-1');
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Weight').value).toBe('85');
    expect(screen.getByLabelText('Notes').value).toBe('Updated in editor');
  });

  it('duplicates a workout template from the library', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      exercises: [{ id: 'bench', name: 'Bench press', createdAt: '2024-01-01T10:00:00.000Z' }],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Original notes',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(screen.getByRole('button', { name: 'Duplicate template Push template' }));

    expect(screen.getByText('Duplicated Push template.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Push template copy' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Use template Push template copy' }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(screen.getByLabelText('Weight').value).toBe('80');
    expect(screen.getByLabelText('Notes').value).toBe('Original notes');
  });

  it('loads a workout template into the split planner', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      exercises: [
        { id: 'bench', name: 'Bench press', createdAt: '2024-01-01T10:00:00.000Z' },
        { id: 'fly', name: 'Cable fly', createdAt: '2024-01-01T10:00:00.000Z' },
      ],
      templates: [
        {
          id: 'template-1',
          name: 'Push template',
          splitId: '',
          notes: 'Template note',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'bench',
              sets: [
                { weight: 80, reps: 8 },
                { weight: 82.5, reps: 6 },
              ],
            },
            {
              exerciseId: 'fly',
              sets: [{ weight: 20, reps: 12 }],
            },
          ],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(
      screen.getByRole('button', { name: 'Use template Push template as a split template' }),
    );

    expect(screen.getByRole('heading', { name: 'Split planner' })).toBeTruthy();
    expect(screen.getByDisplayValue('Push split')).toBeTruthy();
    expect(screen.getByLabelText('Exercise 1').value).toBe('bench');
    expect(screen.getByLabelText('Exercise 2').value).toBe('fly');
    expect(screen.getAllByLabelText('Default sets')[0].value).toBe('2');
    expect(screen.getAllByLabelText('Default sets')[1].value).toBe('1');
    expect(screen.getByText('Loaded template into the split planner.')).toBeTruthy();
  });

  it('lets you skip and restore a split exercise while logging', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Skip Bench press for today' }));

    expect(screen.getByRole('heading', { name: 'Skipped' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restore Bench press' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Restore Bench press' }));

    expect(screen.getAllByText(/Bench press|Shoulder press/).length).toBeGreaterThan(1);
  });

  it('keeps current data when a valid import is canceled', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('button', { name: 'settings' }));

    const fileInput = document.querySelector('input[type="file"]');
    const file = createJsonFile({
      exercises: [{ id: 'imported', name: 'Imported exercise' }],
      workouts: [],
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      await screen.findByText(
        'Review the import preview below before replacing or merging your current data.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Review the import preview below before replacing or merging your current data.',
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancel import' }));

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    expect(screen.getByRole('heading', { name: 'Existing exercise' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Imported exercise' })).toBeNull();
  });

  it('replaces current data when a valid import is confirmed', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('button', { name: 'settings' }));

    const fileInput = document.querySelector('input[type="file"]');
    const file = createJsonFile({
      exercises: [{ id: 'imported', name: 'Imported exercise' }],
      workouts: [],
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      await screen.findByText(
        'Review the import preview below before replacing or merging your current data.',
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Replace data' }));

    expect(
      await screen.findByText(
        'Imported 1 exercises, 0 splits, 0 templates, 0 workouts, and 0 bodyweight check-ins.',
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'exercises' }));
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
    renderAppWithStoredData({
      exercises: [
        {
          id: 'existing-exercise',
          name: 'Existing exercise',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [],
    });

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['{'], 'broken.json', { type: 'application/json' });
    file.text = vi.fn().mockResolvedValue('{');

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Selected file is not valid JSON.')).toBeTruthy();
  });

  it('merges imported data into the current library and history', async () => {
    const user = userEvent.setup();
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench-existing',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      templates: [
        {
          id: 'template-existing',
          name: 'Upper A',
          splitId: '',
          notes: '',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench-existing', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
      workouts: [],
    });

    await user.click(screen.getByRole('button', { name: 'settings' }));

    const fileInput = document.querySelector('input[type="file"]');
    const file = createJsonFile({
      exercises: [
        { id: 'bench-imported', name: 'Bench press' },
        { id: 'row-imported', name: 'Cable row' },
      ],
      templates: [
        {
          id: 'template-imported',
          name: 'Pull A',
          splitId: '',
          notes: 'Imported template',
          entries: [{ exerciseId: 'row-imported', sets: [{ weight: 60, reps: 10 }] }],
        },
      ],
      workouts: [
        {
          id: 'workout-imported',
          date: '2024-01-12',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'row-imported', sets: [{ weight: 60, reps: 10 }] }],
        },
      ],
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      await screen.findByText(
        'Review the import preview below before replacing or merging your current data.',
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Merge data' }));

    expect(
      await screen.findByText(
        'Merged import. You now have 2 exercises, 0 splits, 2 templates, 1 workouts, and 0 bodyweight check-ins.',
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    expect(screen.getByRole('heading', { name: 'Bench press' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cable row' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Upper A' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pull A' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'history' }));
    expect(screen.getByRole('heading', { name: 'Cable row' })).toBeTruthy();
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
      splits: [
        {
          id: 'push',
          name: 'Push',
          weeklyTarget: 2,
          createdAt: '2024-01-02T10:00:00.000Z',
          exercises: [{ id: 'split-1', exerciseId: 'squat', defaultSets: 1 }],
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-03-10',
          splitId: 'push',
          createdAt: '2026-03-10T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }],
        },
        {
          id: 'workout-2',
          date: '2026-03-14',
          splitId: 'push',
          createdAt: '2026-03-14T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 110, reps: 5 }] }],
        },
        {
          id: 'workout-3',
          date: '2026-03-01',
          splitId: 'push',
          createdAt: '2026-03-01T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 90, reps: 5 }] }],
        },
      ],
    });

    expect(screen.getByText('How this week is going')).toBeTruthy();
    expect(screen.getByText('Week plan')).toBeTruthy();
    expect(screen.getByText('Training snapshot')).toBeTruthy();
    expect(screen.getByText('Splits and templates')).toBeTruthy();
    expect(screen.getByText('Recommended next workout')).toBeTruthy();
    expect(screen.getByText('Training calendar')).toBeTruthy();
    expect(screen.getByText('Last 28 days')).toBeTruthy();
    expect(screen.getByText('This week vs last')).toBeTruthy();
    expect(screen.getByLabelText('Training heatmap')).toBeTruthy();
    expect(screen.getByText('2 / 2 completed')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Split insights')).toBeTruthy();
    expect(screen.getByText('Reuse a session')).toBeTruthy();
    expect(screen.getByText('Top this month')).toBeTruthy();
    expect(screen.getByText('Best week')).toBeTruthy();
    expect(screen.getByText('Best month')).toBeTruthy();
    expect(screen.getAllByText('Push').length).toBeGreaterThan(0);
  });

  it('shows guided empty dashboard states when no activity exists', () => {
    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      splits: [],
      templates: [],
      workouts: [],
    });

    expect(screen.getByRole('heading', { name: 'Start your first workout' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Week just started' })).toBeTruthy();
    expect(screen.getByText('Start with one complete session')).toBeTruthy();
    expect(screen.getByText('Your first training block sets the baseline')).toBeTruthy();
    expect(screen.getByText('No templates yet')).toBeTruthy();
    expect(screen.getByText('No bodyweight trend yet')).toBeTruthy();
    expect(screen.getByText('Get your month started')).toBeTruthy();
    expect(screen.getByText('Your calendar starts with the first session')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Nothing logged yet' })).toBeTruthy();
  });

  it('edits and then deletes a workout from history', async () => {
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
    await user.click(screen.getByRole('button', { name: /Edit workout from/i }));

    const weightInput = screen.getByLabelText('Weight');
    await user.clear(weightInput);
    await user.type(weightInput, '110');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await user.click(screen.getByRole('button', { name: /Show details for workout from/i }));
    expect(screen.getByText('Set 1: 110 × 5')).toBeTruthy();
    expect(screen.getByText('Wt 110')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /More actions for workout from/i }));
    await user.click(screen.getByRole('button', { name: /Delete workout from/i }));
    await user.click(screen.getByRole('button', { name: 'Delete workout' }));

    expect(screen.getByText('Workout history is empty')).toBeTruthy();
  });

  it('restores a deleted workout when undo is used', async () => {
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
    await user.click(screen.getByRole('button', { name: /More actions for workout from/i }));
    await user.click(screen.getByRole('button', { name: /Delete workout from/i }));
    await user.click(screen.getByRole('button', { name: 'Delete workout' }));

    expect(screen.getByText('Workout history is empty')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Undo delete' }));

    expect(screen.getByRole('heading', { name: 'Back squat' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Show details for workout from/i }));
    expect(screen.getByText('Set 1: 100 × 5')).toBeTruthy();
  });

  it('duplicates a workout into the log form as a new workout', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2024-01-12',
          notes: 'Keep elbows tucked.',
          createdAt: '2024-01-12T10:00:00.000Z',
          entries: [
            {
              exerciseId: 'bench',
              sets: [{ weight: 80, reps: 8 }],
            },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'history' }));
    await user.click(screen.getByRole('button', { name: /Duplicate workout from/i }));

    expect(screen.getByRole('heading', { name: 'Log workout' })).toBeTruthy();
    expect(
      screen.getByText('Loaded a copy of Jan 12, 2024. Save it as a new workout when ready.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Workout date').value).toBe(expectedDate);
    expect(screen.getByLabelText('Weight').value).toBe('80');
    expect(screen.getByLabelText('Reps').value).toBe('8');
    expect(screen.getByLabelText('Notes').value).toBe('');
    expect(screen.getByRole('button', { name: 'Save workout' })).toBeTruthy();
  });

  it('preserves workout history as unknown exercise when deleting an exercise', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Delete Back squat' }));
    await user.click(screen.getByRole('button', { name: 'Delete exercise' }));

    expect(
      screen.getByText('Deleted Back squat. Linked workout history was preserved.'),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'history' }));
    expect(screen.getByText('Unknown exercise (deleted)')).toBeTruthy();
  });

  it('restores a deleted exercise when undo is used', async () => {
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

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(screen.getByRole('button', { name: 'Delete Back squat' }));
    await user.click(screen.getByRole('button', { name: 'Delete exercise' }));

    expect(screen.getByText('No exercises yet')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Undo delete' }));

    expect(screen.getByRole('heading', { name: 'Back squat' })).toBeTruthy();
  });

  it('shows a training calendar and pr timeline in history', async () => {
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

    await user.click(screen.getByRole('button', { name: 'history' }));

    expect(screen.getByText('Training calendar')).toBeTruthy();
    expect(screen.getByText('Last 12 weeks')).toBeTruthy();
    expect(screen.getByLabelText('History training calendar')).toBeTruthy();
    expect(screen.getByText('Selected day')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'History detail panel' })).toBeTruthy();

    await user.click(screen.getByLabelText('Mar 14, 2026 with 1 session'));
    expect(screen.getByText('Selected day')).toBeTruthy();
    expect(screen.getAllByText('Custom workout').length).toBeGreaterThan(0);

    await user.click(
      within(screen.getByRole('group', { name: 'History detail panel' })).getByRole('button', {
        name: 'PRs',
      }),
    );
    expect(screen.getByText('PR timeline')).toBeTruthy();
    expect(screen.getByText('Recent wins')).toBeTruthy();
    expect(screen.getAllByText('Weight PR').length).toBeGreaterThan(0);
  });

  it('shows a safe day-review state when no heatmap day is selectable', async () => {
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
          id: 'workout-legacy',
          date: '2020-01-12',
          createdAt: '2020-01-12T10:00:00.000Z',
          entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'history' }));
    await user.click(screen.getByRole('button', { name: 'Review selected day' }));

    expect(screen.getByRole('heading', { name: 'Select a day' })).toBeTruthy();
    expect(screen.getByText('No sessions on this day')).toBeTruthy();
  });

  it('falls back to exercise progress when the last split is deleted', async () => {
    const user = userEvent.setup();

    renderAppWithStoredData({
      exercises: [
        {
          id: 'bench',
          name: 'Bench press',
          createdAt: '2024-01-01T10:00:00.000Z',
        },
      ],
      splits: [
        {
          id: 'push',
          name: 'Push',
          createdAt: '2024-01-02T10:00:00.000Z',
          exercises: [{ id: 'split-1', exerciseId: 'bench', defaultSets: 2 }],
        },
      ],
      workouts: [
        {
          id: 'workout-1',
          date: '2026-04-12',
          splitId: 'push',
          createdAt: '2026-04-12T10:00:00.000Z',
          entries: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'progress' }));
    await user.click(screen.getByRole('button', { name: 'Splits' }));
    expect(screen.getByRole('heading', { name: 'Split progress' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    await user.click(screen.getByRole('button', { name: 'Delete split Push' }));
    await user.click(screen.getByRole('button', { name: 'Delete split' }));

    await user.click(screen.getByRole('button', { name: 'progress' }));

    expect(screen.getByRole('heading', { name: 'Exercise progress' })).toBeTruthy();
  });

  it('shows progress markers for an exercise with multiple workouts', async () => {
    const user = userEvent.setup();
    const recentDate = new Date();
    recentDate.setHours(12, 0, 0, 0);
    recentDate.setDate(recentDate.getDate() - 1);
    const olderDate = new Date(recentDate);
    olderDate.setDate(olderDate.getDate() - 4);
    const recentDateValue = recentDate.toISOString().slice(0, 10);
    const olderDateValue = olderDate.toISOString().slice(0, 10);

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
          date: olderDateValue,
          createdAt: olderDate.toISOString(),
          entries: [
            {
              exerciseId: 'squat',
              sets: [{ weight: 100, reps: 5 }],
            },
          ],
        },
        {
          id: 'workout-2',
          date: recentDateValue,
          createdAt: recentDate.toISOString(),
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
    expect(screen.getByText(/PR hits|Latest signal focus/i)).toBeTruthy();
    expect(screen.getAllByText('PR center').length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole('group', { name: 'Exercise PR filter' })).getByRole('button', {
        name: 'Weight',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Improvement story')).toBeTruthy();
    expect(screen.getByText('Range change')).toBeTruthy();
    expect(screen.getByText('Latest signal')).toBeTruthy();
    expect(screen.getAllByText('PR session').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Weight PR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Weight up').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/vs/).length).toBeGreaterThan(0);
  });

  it('switches the progress chart metric between volume, weight, and reps', async () => {
    const user = userEvent.setup();
    const recentDate = new Date();
    recentDate.setHours(12, 0, 0, 0);
    recentDate.setDate(recentDate.getDate() - 1);
    const olderDate = new Date(recentDate);
    olderDate.setDate(olderDate.getDate() - 4);
    const recentDateValue = recentDate.toISOString().slice(0, 10);
    const olderDateValue = olderDate.toISOString().slice(0, 10);

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
          date: olderDateValue,
          createdAt: olderDate.toISOString(),
          entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }],
        },
        {
          id: 'workout-2',
          date: recentDateValue,
          createdAt: recentDate.toISOString(),
          entries: [{ exerciseId: 'squat', sets: [{ weight: 110, reps: 6 }] }],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'progress' }));
    expect(screen.getByText('Volume trend')).toBeTruthy();

    await user.click(
      within(screen.getByRole('group', { name: 'Progress metric' })).getByRole('button', {
        name: 'Weight',
      }),
    );
    expect(screen.getByText('Weight trend')).toBeTruthy();
    expect(screen.getAllByText('Best weight').length).toBeGreaterThan(0);

    await user.click(
      within(screen.getByRole('group', { name: 'Progress metric' })).getByRole('button', {
        name: 'Reps',
      }),
    );
    expect(screen.getByText('Reps trend')).toBeTruthy();
    expect(screen.getAllByText('Best reps').length).toBeGreaterThan(0);
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

    expect(screen.getAllByText(/7 days/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No entries in the last 7 days/)).toBeNull();
  });

  it('shows split progress for logged split workouts', async () => {
    const user = userEvent.setup();
    const recentDate = new Date();
    recentDate.setHours(12, 0, 0, 0);
    recentDate.setDate(recentDate.getDate() - 1);
    const olderDate = new Date(recentDate);
    olderDate.setDate(olderDate.getDate() - 4);
    const recentDateValue = recentDate.toISOString().slice(0, 10);
    const olderDateValue = olderDate.toISOString().slice(0, 10);

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
      workouts: [
        {
          id: 'workout-1',
          date: olderDateValue,
          splitId: 'push',
          createdAt: olderDate.toISOString(),
          entries: [
            { exerciseId: 'bench', sets: [{ weight: 80, reps: 8 }] },
            { exerciseId: 'press', sets: [{ weight: 40, reps: 10 }] },
          ],
        },
        {
          id: 'workout-2',
          date: recentDateValue,
          splitId: 'push',
          notes: 'Strong push day.',
          createdAt: recentDate.toISOString(),
          entries: [
            { exerciseId: 'bench', sets: [{ weight: 85, reps: 8 }] },
            { exerciseId: 'press', sets: [{ weight: 42.5, reps: 10 }] },
          ],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'progress' }));
    await user.click(screen.getByRole('button', { name: 'Splits' }));

    expect(screen.getByText('Push trend')).toBeTruthy();
    expect(screen.getByText('Avg sets')).toBeTruthy();
    expect(screen.getByText('Improvement story')).toBeTruthy();
    expect(screen.getByText('Range change')).toBeTruthy();
    expect(screen.getByText('Latest signal')).toBeTruthy();
    expect(screen.getAllByText('PR session').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Volume PR').length).toBeGreaterThan(0);
    expect(screen.getByText('Strong push day.')).toBeTruthy();
  });
});
