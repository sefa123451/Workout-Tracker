// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { STORAGE_KEY } from './lib/workoutData.js';

describe('App stitch screen rendering', () => {
  beforeEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('loads the desktop dashboard screen by default', () => {
    window.innerWidth = 1280;

    render(<App />);

    const frame = screen.getByTitle('Stitch dashboard');
    expect(frame.getAttribute('src')).toBe('/stitch/dashboard.html');
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('defaults new visitors to the dark visual theme', async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    expect(window.localStorage.getItem('workout-tracker-theme')).toBe('dark');
  });

  it('switches to the selected stitch screen when nav is used', async () => {
    window.innerWidth = 1280;
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Log workout' }));

    const frame = screen.getByTitle('Stitch log');
    expect(frame.getAttribute('src')).toBe('/stitch/log.html');
    expect(window.location.hash).toBe('#/log');
  });

  it('loads the exercises stitch screen when exercises nav is used', async () => {
    window.innerWidth = 1280;
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'exercises' }));

    const frame = screen.getByTitle('Stitch exercises');
    expect(frame.getAttribute('src')).toBe('/stitch/exercises.html');
    expect(window.location.hash).toBe('#/exercises');
  });

  it('loads mobile stitch screens on small viewport', () => {
    window.innerWidth = 390;

    render(<App />);

    const frame = screen.getByTitle('Stitch dashboard');
    expect(frame.getAttribute('src')).toBe('/stitch/dashboard-mobile.html');
  });

  it('honors a route hash on first render', async () => {
    window.innerWidth = 1280;
    window.location.hash = '#/history';

    render(<App />);

    await waitFor(() => {
      const frame = screen.getByTitle('Stitch history');
      expect(frame.getAttribute('src')).toBe('/stitch/history.html');
    });
    expect(window.location.hash).toBe('#/history');
  });

  it('surfaces local storage persistence failures', async () => {
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === STORAGE_KEY) {
        throw new Error('quota exceeded');
      }

      return originalSetItem.call(this, key, value);
    });

    render(<App />);

    expect(
      await screen.findByText(
        'Changes could not be saved locally. Refreshing may restore older data.',
      ),
    ).toBeTruthy();
  });

  it('does not advertise CSV import without CSV support', () => {
    const settingsHtml = readFileSync('public/stitch/settings.html', 'utf8');

    expect(settingsHtml).not.toContain('Import CSV');
    expect(settingsHtml).toContain('Import JSON');
  });

  it('shows apply controls after choosing a valid JSON import', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'settings' }));
    const frame = screen.getByTitle('Stitch settings');
    const doc = frame.contentDocument;
    doc.open();
    doc.write('<main><section><h3>Data Management</h3></section></main>');
    doc.close();
    fireEvent.load(frame);

    const importPayload = {
      exercises: [{ id: 'exercise-imported', name: 'Imported bench' }],
      splits: [],
      templates: [],
      workouts: [],
      bodyweightEntries: [],
    };
    const file = new File([JSON.stringify(importPayload)], 'backup.json', {
      type: 'application/json',
    });
    file.text = vi.fn().mockResolvedValue(JSON.stringify(importPayload));

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(doc.querySelector('[data-codex-import-decision]')).toBeTruthy();
    });
    expect(doc.querySelector('[data-codex-action="settings-import-replace"]')).toBeTruthy();
    expect(doc.querySelector('[data-codex-action="settings-import-merge"]')).toBeTruthy();
  });

  it('uses current iframe handlers for repeated custom exercise saves', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    const frame = screen.getByTitle('Stitch exercises');
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`
      <main>
        <div class="grid">
          <div data-codex-exercise-card>
            <h3>Bench press</h3>
            <p>chest</p>
          </div>
        </div>
        <button>Add Custom</button>
      </main>
    `);
    doc.close();
    fireEvent.load(frame);

    const getCustomExerciseCount = () => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return (
        parsed.exercises?.filter((exercise) => exercise.name === 'Cable Fly Smoke').length ?? 0
      );
    };
    const addCustomExercise = () => {
      fireEvent.click(doc.querySelector('[data-codex-action="exercise-add-custom"]'));
      fireEvent.change(doc.querySelector('[data-codex-custom-exercise-name]'), {
        target: { value: 'Cable Fly Smoke' },
      });
      fireEvent.click(doc.querySelector('[data-codex-action="exercise-save-custom"]'));
    };

    addCustomExercise();
    await waitFor(() => {
      expect(getCustomExerciseCount()).toBe(1);
    });

    addCustomExercise();
    await waitFor(() => {
      expect(getCustomExerciseCount()).toBe(1);
    });
    expect(doc.querySelector('[data-codex-custom-exercise-error]')?.textContent).toBe(
      'Exercise names should be unique.',
    );
  });

  it('opens exercise details when an exercise card body is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    const frame = screen.getByTitle('Stitch exercises');
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`
      <main>
        <div class="grid">
          <div class="rounded-xl hover:border-primary">
            <h3>Bench press</h3>
            <p>Fundamental chest lift.</p>
          </div>
        </div>
      </main>
    `);
    doc.close();
    fireEvent.load(frame);

    const card = doc.querySelector('[data-codex-exercise-card]');
    expect(card).toBeTruthy();

    fireEvent.click(card.querySelector('h3'));

    await waitFor(() => {
      expect(doc.querySelector('[data-codex-exercise-modal]:not(.hidden) h3')?.textContent).toBe(
        'Bench press',
      );
    });
  });

  it('opens exercise details from a focused exercise card', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'exercises' }));
    const frame = screen.getByTitle('Stitch exercises');
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`
      <main>
        <div class="grid">
          <div class="rounded-xl hover:border-primary">
            <h3>Romanian deadlift</h3>
            <p>Hamstrings and posterior chain.</p>
          </div>
        </div>
      </main>
    `);
    doc.close();
    fireEvent.load(frame);

    const card = doc.querySelector('[data-codex-exercise-card]');
    expect(card?.getAttribute('role')).toBe('button');
    expect(card?.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(card, { key: 'Enter' });

    await waitFor(() => {
      expect(doc.querySelector('[data-codex-exercise-modal]:not(.hidden) h3')?.textContent).toBe(
        'Romanian deadlift',
      );
    });
  });

  it('adds practical mobile workout logging controls on iframe load', async () => {
    window.innerWidth = 390;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        exercises: [{ id: 'bench', name: 'Bench Press', createdAt: '2026-04-01T10:00:00.000Z' }],
        splits: [],
        templates: [],
        workouts: [
          {
            id: 'workout-previous',
            date: '2026-04-10',
            createdAt: '2026-04-10T10:00:00.000Z',
            entries: [{ exerciseId: 'bench', sets: [{ weight: 90, reps: 5 }] }],
          },
        ],
        bodyweightEntries: [],
        weeklyWorkoutGoal: 4,
      }),
    );

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Log workout' }));
    const frame = screen.getByTitle('Stitch log');
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`
      <body class="max-w-[390px]">
        <main>
          <section>
            <h2>Bench Press</h2>
            <p>Primary lift</p>
            <div class="space-y-4">
              <div class="grid grid-cols-12">
                <div class="col-span-2 text-center font-bold">1</div>
                <input type="number" />
                <input type="number" />
                <button><span class="material-symbols-outlined">check</span></button>
              </div>
              <button>+ Add Set</button>
            </div>
          </section>
          <button>Add Exercise</button>
        </main>
        <nav class="md:hidden"></nav>
        <div data-codex-rest-sheet><button>15mp</button></div>
      </body>
    `);
    doc.close();
    fireEvent.load(frame);

    await waitFor(() => {
      expect(doc.querySelector('[data-codex-log-mobile-dock]')).toBeTruthy();
    });
    expect(doc.querySelector('[data-codex-rest-sheet]')?.hasAttribute('hidden')).toBe(true);
    expect(doc.querySelector('[data-codex-action="log-rest-timer"]')).toBeTruthy();
    expect(doc.querySelector('[data-codex-action="log-add-exercise"]')).toBeTruthy();
    expect(doc.querySelector('[data-codex-action="log-finish-workout"]')).toBeTruthy();

    const inputs = doc.querySelectorAll('input[type="number"]');
    expect(inputs[0].placeholder).toBe('90');
    expect(inputs[0].inputMode).toBe('decimal');
    expect(inputs[1].placeholder).toBe('5');
    expect(inputs[1].inputMode).toBe('numeric');
  });
});
