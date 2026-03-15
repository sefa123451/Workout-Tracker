import React from 'react';
import EmptyState from './EmptyState.jsx';
import { getLatestExerciseSession } from '../lib/workoutData.js';

export default function WorkoutFormView({
  exercises,
  splits,
  workouts,
  workoutForm,
  editingWorkoutId,
  workoutMessage,
  setWorkoutForm,
  updateWorkoutEntry,
  applyLatestWorkoutToEntry,
  handleWorkoutSplitChange,
  handleWorkoutSubmit,
  resetWorkoutForm,
  createSet,
  createSetFromValues,
  createWorkoutEntry,
  formatDisplayDate,
  formatNumber,
  getSplitName,
}) {
  const selectedSplit = splits.find((split) => split.id === workoutForm.splitId) ?? null;
  const skippedEntries = workoutForm.skippedEntries ?? [];

  return (
    <main className="content-grid logging-layout">
      <section className="panel panel-wide panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout logging</p>
            <h2>{editingWorkoutId ? 'Edit workout' : 'Log workout'}</h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="Create exercises first"
            body="Add one movement to start logging."
          />
        ) : (
          <form className="stack workout-form logging-form" onSubmit={handleWorkoutSubmit}>
            <div className="form-toolbar form-toolbar-highlight">
              <label className="field field-compact">
                <span>Workout date</span>
                <input
                  type="date"
                  value={workoutForm.date}
                  onChange={(event) =>
                    setWorkoutForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Split</span>
                <select
                  value={workoutForm.splitId}
                  onChange={(event) => handleWorkoutSplitChange(event.target.value)}
                >
                  <option value="">Custom workout</option>
                  {workoutForm.splitId &&
                    !splits.some((split) => split.id === workoutForm.splitId) && (
                      <option value={workoutForm.splitId}>{getSplitName(workoutForm.splitId)}</option>
                    )}
                  {splits.map((split) => (
                    <option key={split.id} value={split.id}>
                      {split.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {workoutForm.splitId && (
              <div className="suggestion-card split-summary-card">
                <div className="suggestion-header">
                  <div>
                    <span className="metric-label">Selected split</span>
                    <p>
                      {getSplitName(workoutForm.splitId)}
                      {selectedSplit
                        ? ` • ${selectedSplit.exercises.length} ${
                            selectedSplit.exercises.length === 1 ? 'exercise' : 'exercises'
                          }`
                        : ' • Split removed from the planner'}
                    </p>
                  </div>
                </div>
                {selectedSplit && selectedSplit.exercises.length === 0 && (
                  <div className="empty-inline">
                    <p>This split is empty. Add exercises in the planner or build today manually.</p>
                  </div>
                )}
              </div>
            )}

            <div className="stack entry-stack">
              {workoutForm.entries.map((entry, entryIndex) => {
                const latestSession = getLatestExerciseSession(workouts, entry.exerciseId);
                const selectedExerciseName =
                  exercises.find((exercise) => exercise.id === entry.exerciseId)?.name ?? '';

                return (
                  <article key={entry.id} className="entry-card workout-entry-card">
                    <div className="entry-card-header">
                      <div>
                        <h3>{selectedExerciseName || `Exercise ${entryIndex + 1}`}</h3>
                        <p className="entry-card-meta">
                          {entry.sets.length} planned {entry.sets.length === 1 ? 'set' : 'sets'}
                        </p>
                      </div>
                      {workoutForm.entries.length > 1 && (
                        <button
                          type="button"
                          className="ghost-button"
                          aria-label={
                            workoutForm.splitId
                              ? `Skip ${selectedExerciseName || `exercise ${entryIndex + 1}`} for today`
                              : `Remove ${selectedExerciseName || `exercise ${entryIndex + 1}`}`
                          }
                          onClick={() =>
                            setWorkoutForm((current) => ({
                              ...current,
                              entries: current.entries.filter((item) => item.id !== entry.id),
                              skippedEntries: workoutForm.splitId
                                ? [...(current.skippedEntries ?? []), entry]
                                : current.skippedEntries ?? [],
                            }))
                          }
                        >
                          {workoutForm.splitId ? 'Skip today' : 'Remove exercise'}
                        </button>
                      )}
                    </div>

                    <label className="field">
                      <span>Exercise</span>
                      <select
                        value={entry.exerciseId}
                        onChange={(event) =>
                          updateWorkoutEntry(entry.id, (currentEntry) => ({
                            ...currentEntry,
                            exerciseId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select an exercise</option>
                        {entry.exerciseId &&
                          !exercises.some((exercise) => exercise.id === entry.exerciseId) && (
                            <option value={entry.exerciseId}>Unknown exercise (deleted)</option>
                          )}
                        {exercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {latestSession && (
                      <div className="suggestion-card session-reference-card">
                        <div className="suggestion-header">
                          <div>
                            <span className="metric-label">Last workout</span>
                            <p>
                              {formatDisplayDate(latestSession.date)} • Vol{' '}
                              {formatNumber(latestSession.metrics.totalVolume)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="ghost-button action-button"
                            aria-label={`Use last workout values for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                            onClick={() => applyLatestWorkoutToEntry(entry.id, latestSession)}
                          >
                            Use last
                          </button>
                        </div>
                        <div className="last-session-metrics">
                          <span>Wt {formatNumber(latestSession.metrics.bestWeight)}</span>
                          <span>Reps {formatNumber(latestSession.metrics.bestReps)}</span>
                          <span>
                            {latestSession.sets.length}{' '}
                            {latestSession.sets.length === 1 ? 'set' : 'sets'}
                          </span>
                        </div>
                        <ul className="set-list compact-set-list">
                          {latestSession.sets.map((set, index) => (
                            <li key={`${latestSession.workoutId}-${index}`}>
                              Set {index + 1}: {formatNumber(set.weight)} × {formatNumber(set.reps)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="set-grid-head" aria-hidden="true">
                      <span>Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span>Actions</span>
                    </div>

                    <div className="sets-stack">
                      {entry.sets.map((set, setIndex) => (
                        <div key={set.id} className="set-row">
                          <div className="set-row-label">Set {setIndex + 1}</div>
                          <label className="field">
                            <span className="set-field-label">Weight</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={set.weight}
                              onChange={(event) =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets: currentEntry.sets.map((currentSet) =>
                                    currentSet.id === set.id
                                      ? { ...currentSet, weight: event.target.value }
                                      : currentSet,
                                  ),
                                }))
                              }
                              placeholder="kg"
                            />
                          </label>
                          <label className="field">
                            <span className="set-field-label">Reps</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={set.reps}
                              onChange={(event) =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets: currentEntry.sets.map((currentSet) =>
                                    currentSet.id === set.id
                                      ? { ...currentSet, reps: event.target.value }
                                      : currentSet,
                                  ),
                                }))
                              }
                              placeholder="reps"
                            />
                          </label>
                          <div className="set-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              aria-label={`Copy set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                              onClick={() =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets: [
                                    ...currentEntry.sets,
                                    createSetFromValues(set.weight, set.reps),
                                  ],
                                }))
                              }
                            >
                              Copy set
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              aria-label={
                                entry.sets.length === 1 && setIndex === 0
                                  ? `Clear set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`
                                  : `Remove set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`
                              }
                              onClick={() =>
                                updateWorkoutEntry(entry.id, (currentEntry) => ({
                                  ...currentEntry,
                                  sets:
                                    currentEntry.sets.length === 1
                                      ? [createSet()]
                                      : currentEntry.sets.filter((currentSet) => currentSet.id !== set.id),
                                }))
                              }
                            >
                              {entry.sets.length === 1 && setIndex === 0 ? 'Clear set' : 'Remove set'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      aria-label={`Add a set for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                      onClick={() =>
                        updateWorkoutEntry(entry.id, (currentEntry) => ({
                          ...currentEntry,
                          sets: [...currentEntry.sets, createSet()],
                        }))
                      }
                    >
                      Add set
                    </button>
                  </article>
                );
              })}
            </div>

            {workoutForm.splitId && workoutForm.entries.length === 0 && (
              <div className="empty-inline">
                <p>No exercises were added from this split yet. Use the button below to add one manually if needed.</p>
              </div>
            )}

            {workoutForm.splitId && skippedEntries.length > 0 && (
              <div className="skipped-section">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">Skipped today</p>
                    <h2>Skipped</h2>
                  </div>
                </div>
                <div className="skipped-grid">
                  {skippedEntries.map((entry, index) => (
                    <article key={entry.id} className="skipped-card">
                      <div>
                        <h3>
                          {exercises.find((exercise) => exercise.id === entry.exerciseId)?.name ??
                            `Exercise ${index + 1}`}
                        </h3>
                        <p>
                          {entry.sets.length} {entry.sets.length === 1 ? 'set' : 'sets'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Restore ${exercises.find((exercise) => exercise.id === entry.exerciseId)?.name ?? `exercise ${index + 1}`}`}
                        onClick={() =>
                          setWorkoutForm((current) => ({
                            ...current,
                            entries: [...current.entries, entry],
                            skippedEntries: (current.skippedEntries ?? []).filter(
                              (item) => item.id !== entry.id,
                            ),
                          }))
                        }
                      >
                        Restore
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="actions workout-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setWorkoutForm((current) => ({
                    ...current,
                    entries: [...current.entries, createWorkoutEntry()],
                  }))
                }
              >
                Add exercise
              </button>
              {editingWorkoutId && (
                <button type="button" className="ghost-button" onClick={resetWorkoutForm}>
                  Cancel editing
                </button>
              )}
              <button type="submit" className="primary-button">
                {editingWorkoutId ? 'Save changes' : 'Save workout'}
              </button>
            </div>

            {workoutMessage.text && (
              <p
                className={workoutMessage.type === 'error' ? 'feedback error' : 'feedback success'}
                role={workoutMessage.type === 'error' ? 'alert' : 'status'}
                aria-live={workoutMessage.type === 'error' ? 'assertive' : 'polite'}
              >
                {workoutMessage.text}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
