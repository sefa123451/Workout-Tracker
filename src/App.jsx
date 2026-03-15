import React, { useEffect, useRef, useState } from 'react';
import DashboardView from './components/DashboardView.jsx';
import ExerciseView from './components/ExerciseView.jsx';
import HistoryView from './components/HistoryView.jsx';
import ProgressView from './components/ProgressView.jsx';
import WorkoutFormView from './components/WorkoutFormView.jsx';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  buildProgressHistory,
  createId,
  createSet,
  createSetFromValues,
  createWorkoutEntry,
  createWorkoutForm,
  createWorkoutFormFromWorkout,
  filterProgressHistoryByDays,
  formatCalendarDate,
  formatDelta,
  formatDisplayDate,
  formatNumber,
  getDashboardSummary,
  getEntryMetrics,
  getProgressWindowSummary,
  hasImprovement,
  hasPersonalRecord,
  isValidDateInput,
  parseSet,
  readStoredData,
  sortWorkouts,
  validateImportedData,
} from './lib/workoutData.js';

const VIEW_OPTIONS = ['dashboard', 'exercises', 'log', 'history', 'progress'];
const PROGRESS_WINDOWS = [7, 30, 90];
const THEME_STORAGE_KEY = 'workout-tracker-theme';
const THEME_OPTIONS = ['system', 'light', 'dark'];

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialThemeMode() {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (THEME_OPTIONS.includes(storedTheme)) {
    return storedTheme;
  }

  return 'system';
}

function App() {
  const [storedData] = useState(readStoredData);
  const [activeView, setActiveView] = useState('dashboard');
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [exercises, setExercises] = useState(storedData.exercises);
  const [workouts, setWorkouts] = useState(storedData.workouts);
  const fileInputRef = useRef(null);
  const [storageWarning, setStorageWarning] = useState('');
  const [dataMessage, setDataMessage] = useState({ type: '', text: '' });
  const [exerciseName, setExerciseName] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseMessage, setExerciseMessage] = useState({ type: '', text: '' });
  const [workoutMessage, setWorkoutMessage] = useState({ type: '', text: '' });
  const [workoutForm, setWorkoutForm] = useState(createWorkoutForm);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [selectedProgressWindow, setSelectedProgressWindow] = useState(30);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          exercises,
          workouts,
        }),
      );
      setStorageWarning('');
    } catch {
      setStorageWarning('Changes could not be saved locally. Refreshing may restore older data.');
    }
  }, [exercises, workouts]);

  useEffect(() => {
    if (!selectedExerciseId && exercises.length > 0) {
      setSelectedExerciseId(exercises[0].id);
    }

    if (selectedExerciseId && !exercises.some((exercise) => exercise.id === selectedExerciseId)) {
      setSelectedExerciseId(exercises[0]?.id ?? '');
    }
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themeMode = themeMode;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }
  }, [resolvedTheme, themeMode]);

  const sortedWorkouts = sortWorkouts(workouts);
  const selectedExerciseHistory = selectedExerciseId
    ? buildProgressHistory(workouts, selectedExerciseId)
    : [];
  const selectedExerciseWindowHistory = filterProgressHistoryByDays(
    selectedExerciseHistory,
    selectedProgressWindow,
  );
  const selectedExerciseWindowSummary = getProgressWindowSummary(selectedExerciseWindowHistory);
  const totalSetsLogged = workouts.reduce(
    (sum, workout) => sum + workout.entries.reduce((entrySum, entry) => entrySum + entry.sets.length, 0),
    0,
  );
  const latestWorkout = sortedWorkouts[0] ?? null;
  const dashboardSummary = getDashboardSummary(sortedWorkouts);

  function getExerciseName(exerciseId) {
    return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Unknown exercise (deleted)';
  }

  function exportAppData() {
    const exportPayload = {
      version: STORAGE_VERSION,
      exercises,
      workouts,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);

    downloadLink.href = objectUrl;
    downloadLink.download = `workout-tracker-${timestamp}.json`;
    downloadLink.click();
    window.URL.revokeObjectURL(objectUrl);
    setDataMessage({ type: 'success', text: 'Exported all app data as JSON.' });
  }

  function resetAppEditingState() {
    resetExerciseForm();
    resetWorkoutForm();
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      let parsed;

      try {
        parsed = JSON.parse(fileText);
      } catch {
        setDataMessage({ type: 'error', text: 'Selected file is not valid JSON.' });
        return;
      }

      const validatedImport = validateImportedData(parsed);

      if (validatedImport.error) {
        setDataMessage({ type: 'error', text: validatedImport.error });
        return;
      }

      const confirmed = window.confirm(
        `Import ${validatedImport.value.exercises.length} exercises and ${validatedImport.value.workouts.length} workouts? This will replace your current local data.`,
      );

      if (!confirmed) {
        setDataMessage({ type: 'warning', text: 'Import canceled. Your current data was kept.' });
        return;
      }

      setExercises(validatedImport.value.exercises);
      setWorkouts(validatedImport.value.workouts);
      resetAppEditingState();
      setSelectedExerciseId(validatedImport.value.exercises[0]?.id ?? '');
      setActiveView('dashboard');
      setDataMessage({
        type: 'success',
        text: `Imported ${validatedImport.value.exercises.length} exercises and ${validatedImport.value.workouts.length} workouts.`,
      });
    } catch {
      setDataMessage({ type: 'error', text: 'Unable to read the selected file.' });
    } finally {
      event.target.value = '';
    }
  }

  function resetExerciseForm(clearMessage = true) {
    setExerciseName('');
    setEditingExerciseId(null);
    if (clearMessage) {
      setExerciseMessage({ type: '', text: '' });
    }
  }

  function getLinkedWorkoutCount(exerciseId) {
    return workouts.reduce(
      (count, workout) =>
        count + workout.entries.filter((entry) => entry.exerciseId === exerciseId).length,
      0,
    );
  }

  function handleExerciseSubmit(event) {
    event.preventDefault();
    const normalizedName = exerciseName.trim();

    if (!normalizedName) {
      setExerciseMessage({ type: 'error', text: 'Exercise name cannot be empty.' });
      return;
    }

    if (
      exercises.some(
        (exercise) =>
          exercise.id !== editingExerciseId &&
          exercise.name.trim().toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setExerciseMessage({ type: 'error', text: 'Exercise names should be unique.' });
      return;
    }

    if (editingExerciseId) {
      setExercises((current) =>
        current.map((exercise) =>
          exercise.id === editingExerciseId ? { ...exercise, name: normalizedName } : exercise,
        ),
      );
      resetExerciseForm(false);
      setExerciseMessage({ type: 'success', text: `Renamed to ${normalizedName}.` });
    } else {
      const newExercise = {
        id: createId(),
        name: normalizedName,
        createdAt: new Date().toISOString(),
      };

      setExercises((current) => [...current, newExercise]);
      resetExerciseForm(false);
      setExerciseMessage({ type: 'success', text: `Added ${normalizedName}.` });
    }

    setActiveView('exercises');
  }

  function startEditingExercise(exerciseId) {
    const exercise = exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      setExerciseMessage({ type: 'error', text: 'Exercise not found.' });
      return;
    }

    setEditingExerciseId(exercise.id);
    setExerciseName(exercise.name);
    setExerciseMessage({ type: '', text: '' });
    setActiveView('exercises');
  }

  function deleteExercise(exerciseId) {
    const exercise = exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      return;
    }

    const linkedWorkoutCount = getLinkedWorkoutCount(exerciseId);
    const historyMessage =
      linkedWorkoutCount > 0
        ? ` Existing workout history will be kept and shown as "Unknown exercise (deleted)".`
        : '';
    const confirmed = window.confirm(
      `Delete ${exercise.name}?${historyMessage}`,
    );

    if (!confirmed) {
      return;
    }

    setExercises((current) => current.filter((item) => item.id !== exerciseId));
    setWorkoutForm((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              exerciseId: '',
            }
          : entry,
      ),
    }));

    if (editingExerciseId === exerciseId) {
      resetExerciseForm();
    } else {
      setExerciseMessage({
        type: 'success',
        text:
          linkedWorkoutCount > 0
            ? `Deleted ${exercise.name}. Linked workout history was preserved.`
            : `Deleted ${exercise.name}.`,
      });
    }
  }

  function updateWorkoutEntry(entryId, updater) {
    setWorkoutForm((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === entryId ? updater(entry) : entry)),
    }));
  }

  function applyLatestWorkoutToEntry(entryId, latestSession) {
    updateWorkoutEntry(entryId, (currentEntry) => ({
      ...currentEntry,
      sets: latestSession.sets.map((set) => createSetFromValues(set.weight, set.reps)),
    }));
  }

  function resetWorkoutForm(clearMessage = true) {
    setWorkoutForm(createWorkoutForm());
    setEditingWorkoutId(null);
    if (clearMessage) {
      setWorkoutMessage({ type: '', text: '' });
    }
  }

  function normalizeWorkoutEntries(form) {
    if (!isValidDateInput(form.date)) {
      return { error: 'Please enter a valid workout date.' };
    }

    const chosenExerciseIds = form.entries
      .map((entry) => entry.exerciseId)
      .filter(Boolean);

    if (new Set(chosenExerciseIds).size !== chosenExerciseIds.length) {
      return { error: 'Use each exercise only once per workout entry.' };
    }

    const normalizedEntries = [];

    for (const entry of form.entries) {
      if (!entry.exerciseId) {
        return {
          error: `Exercise ${normalizedEntries.length + 1}: choose an exercise for this workout section.`,
        };
      }

      const normalizedSets = [];

      for (const [setIndex, set] of entry.sets.entries()) {
        const parsedSet = parseSet(set);

        if (parsedSet.error) {
          return {
            error: `Exercise ${normalizedEntries.length + 1}, set ${setIndex + 1}: ${parsedSet.error}`,
          };
        }

        if (parsedSet.empty) {
          continue;
        }

        normalizedSets.push(parsedSet.value);
      }

      if (normalizedSets.length === 0) {
        return {
          error: `Exercise ${normalizedEntries.length + 1}: add at least one completed set.`,
        };
      }

      normalizedEntries.push({
        exerciseId: entry.exerciseId,
        sets: normalizedSets,
      });
    }

    return {
      value: {
        date: form.date,
        entries: normalizedEntries,
      },
    };
  }

  function startEditingWorkout(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      setWorkoutMessage({ type: 'error', text: 'Workout not found.' });
      return;
    }

    setEditingWorkoutId(workout.id);
    setWorkoutForm(createWorkoutFormFromWorkout(workout));
    setWorkoutMessage({ type: '', text: '' });
    setActiveView('log');
  }

  function deleteWorkout(workoutId) {
    const workout = workouts.find((item) => item.id === workoutId);

    if (!workout) {
      return;
    }

    const confirmed = window.confirm(`Delete workout from ${formatDisplayDate(workout.date)}?`);

    if (!confirmed) {
      return;
    }

    setWorkouts((current) => sortWorkouts(current.filter((item) => item.id !== workoutId)));

    if (editingWorkoutId === workoutId) {
      resetWorkoutForm();
    }
  }

  function handleWorkoutSubmit(event) {
    event.preventDefault();
    setWorkoutMessage({ type: '', text: '' });

    const normalizedWorkout = normalizeWorkoutEntries(workoutForm);

    if (normalizedWorkout.error) {
      setWorkoutMessage({ type: 'error', text: normalizedWorkout.error });
      return;
    }

    if (editingWorkoutId) {
      if (!workouts.some((workout) => workout.id === editingWorkoutId)) {
        resetWorkoutForm(false);
        setWorkoutMessage({ type: 'error', text: 'This workout is no longer available.' });
        return;
      }

      setWorkouts((current) =>
        sortWorkouts(
          current.map((workout) =>
            workout.id === editingWorkoutId
              ? {
                  ...workout,
                  date: normalizedWorkout.value.date,
                  entries: normalizedWorkout.value.entries,
                }
              : workout,
          ),
        ),
      );
      resetWorkoutForm();
      setWorkoutMessage({ type: 'success', text: 'Workout updated.' });
    } else {
      const newWorkout = {
        id: createId(),
        date: normalizedWorkout.value.date,
        createdAt: new Date().toISOString(),
        entries: normalizedWorkout.value.entries,
      };

      setWorkouts((current) => sortWorkouts([...current, newWorkout]));
      setWorkoutForm(createWorkoutForm());
      setWorkoutMessage({ type: 'success', text: 'Workout saved.' });
    }

    setActiveView('history');
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Workout Tracker MVP</p>
          <h1>Track exercises, log sessions, and spot progress at a glance.</h1>
          <p className="hero-copy">
            Everything stays local in your browser so the app is simple to use and easy to extend.
          </p>
        </div>
        <div className="hero-controls">
          <div className="theme-switcher" role="group" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={option === themeMode ? 'view-button active theme-button' : 'view-button theme-button'}
                onClick={() => setThemeMode(option)}
                aria-pressed={option === themeMode}
              >
                {option}
              </button>
            ))}
          </div>
          <nav className="view-switcher" aria-label="Primary">
            {VIEW_OPTIONS.map((view) => (
              <button
                key={view}
                type="button"
                className={view === activeView ? 'view-button active' : 'view-button'}
                onClick={() => setActiveView(view)}
              >
                {view === 'log' ? 'Log workout' : view}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {storageWarning && (
        <p className="feedback warning" role="status" aria-live="polite">
          {storageWarning}
        </p>
      )}

      {activeView === 'dashboard' && (
        <DashboardView
          exercises={exercises}
          workouts={workouts}
          totalSetsLogged={totalSetsLogged}
          dashboardSummary={dashboardSummary}
          latestWorkout={latestWorkout}
          getExerciseName={getExerciseName}
          formatDisplayDate={formatDisplayDate}
          formatNumber={formatNumber}
          getEntryMetrics={getEntryMetrics}
          dataMessage={dataMessage}
          exportAppData={exportAppData}
          fileInputRef={fileInputRef}
          handleImportFile={handleImportFile}
        />
      )}

      {activeView === 'exercises' && (
        <ExerciseView
          editingExerciseId={editingExerciseId}
          exerciseName={exerciseName}
          setExerciseName={setExerciseName}
          handleExerciseSubmit={handleExerciseSubmit}
          resetExerciseForm={resetExerciseForm}
          exerciseMessage={exerciseMessage}
          exercises={exercises}
          formatCalendarDate={formatCalendarDate}
          startEditingExercise={startEditingExercise}
          deleteExercise={deleteExercise}
        />
      )}

      {activeView === 'log' && (
        <WorkoutFormView
          exercises={exercises}
          workouts={workouts}
          workoutForm={workoutForm}
          editingWorkoutId={editingWorkoutId}
          workoutMessage={workoutMessage}
          setWorkoutForm={setWorkoutForm}
          updateWorkoutEntry={updateWorkoutEntry}
          applyLatestWorkoutToEntry={applyLatestWorkoutToEntry}
          handleWorkoutSubmit={handleWorkoutSubmit}
          resetWorkoutForm={resetWorkoutForm}
          createSet={createSet}
          createSetFromValues={createSetFromValues}
          createWorkoutEntry={createWorkoutEntry}
          formatDisplayDate={formatDisplayDate}
          formatNumber={formatNumber}
        />
      )}

      {activeView === 'history' && (
        <HistoryView
          sortedWorkouts={sortedWorkouts}
          getExerciseName={getExerciseName}
          formatDisplayDate={formatDisplayDate}
          formatNumber={formatNumber}
          getEntryMetrics={getEntryMetrics}
          startEditingWorkout={startEditingWorkout}
          deleteWorkout={deleteWorkout}
        />
      )}

      {activeView === 'progress' && (
        <ProgressView
          exercises={exercises}
          selectedExerciseId={selectedExerciseId}
          setSelectedExerciseId={setSelectedExerciseId}
          progressWindows={PROGRESS_WINDOWS}
          selectedProgressWindow={selectedProgressWindow}
          setSelectedProgressWindow={setSelectedProgressWindow}
          selectedExerciseHistory={selectedExerciseHistory}
          selectedExerciseWindowHistory={selectedExerciseWindowHistory}
          selectedExerciseWindowSummary={selectedExerciseWindowSummary}
          formatDisplayDate={formatDisplayDate}
          formatDelta={formatDelta}
          formatNumber={formatNumber}
          hasPersonalRecord={hasPersonalRecord}
          hasImprovement={hasImprovement}
        />
      )}
    </div>
  );
}

export default App;
