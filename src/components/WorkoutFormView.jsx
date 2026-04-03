import React, { useEffect, useState } from 'react';
import EmptyState from './EmptyState.jsx';
import { getLatestExerciseSession } from '../lib/workoutData.js';

const SESSION_MOODS = ['Great', 'Good', 'Steady', 'Low'];
const SESSION_EFFORTS = ['Easy', 'Moderate', 'Hard', 'Max'];

function formatTimerLabel(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function WorkoutFormView({
  exercises,
  splits,
  templates,
  workouts,
  workoutForm,
  selectedWorkoutTemplateId,
  editingTemplateId,
  templateDraftName,
  editingWorkoutId,
  workoutMessage,
  setWorkoutForm,
  setSelectedWorkoutTemplateId,
  setTemplateDraftName,
  updateWorkoutEntry,
  applyLatestWorkoutToEntry,
  handleWorkoutSplitChange,
  loadWorkoutTemplate,
  saveCurrentWorkoutAsTemplate,
  updateSelectedWorkoutTemplate,
  handleTemplateEditorSubmit,
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
  const plannedSetCount = workoutForm.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
  const draftTitle = editingTemplateId
    ? templateDraftName || 'Untitled template'
    : workoutForm.splitId
      ? getSplitName(workoutForm.splitId)
      : 'Custom workout';
  const draftMeta = `${workoutForm.entries.length} ${
    workoutForm.entries.length === 1 ? 'exercise' : 'exercises'
  } • ${plannedSetCount} ${plannedSetCount === 1 ? 'set' : 'sets'}`;
  const [restTimer, setRestTimer] = useState(null);

  useEffect(() => {
    if (!restTimer?.running) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRestTimer((current) => {
        if (!current?.running) {
          return current;
        }

        if (current.remaining <= 1) {
          return { ...current, remaining: 0, running: false };
        }

        return { ...current, remaining: current.remaining - 1 };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [restTimer?.running]);

  function adjustSetValue(entryId, setId, field, amount) {
    updateWorkoutEntry(entryId, (currentEntry) => ({
      ...currentEntry,
      sets: currentEntry.sets.map((currentSet) => {
        if (currentSet.id !== setId) {
          return currentSet;
        }

        const baseValue = Number.parseFloat(String(currentSet[field] ?? '').trim());
        const nextValue = Number.isFinite(baseValue) ? baseValue + amount : amount;

        return {
          ...currentSet,
          [field]:
            field === 'reps'
              ? String(Math.max(0, Math.round(nextValue)))
              : String(Math.max(0, Number(nextValue.toFixed(2)))),
        };
      }),
    }));
  }

  function toggleSetCompleted(entryId, setId, checked) {
    updateWorkoutEntry(entryId, (currentEntry) => ({
      ...currentEntry,
      sets: currentEntry.sets.map((currentSet) =>
        currentSet.id === setId ? { ...currentSet, completed: checked } : currentSet,
      ),
    }));
  }

  function startRestTimer(duration, label) {
    setRestTimer({
      duration,
      remaining: duration,
      label,
      running: true,
    });
  }

  return (
    <main className="content-grid logging-layout">
      <section className="panel panel-wide panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout logging</p>
            <h2>
              {editingTemplateId ? 'Edit template' : editingWorkoutId ? 'Edit workout' : 'Log workout'}
            </h2>
          </div>
        </div>
        {!exercises.length ? (
          <EmptyState
            title="Create exercises first"
            body="Add one movement to start logging."
          />
        ) : (
          <form
            className="stack workout-form logging-form"
            onSubmit={editingTemplateId ? handleTemplateEditorSubmit : handleWorkoutSubmit}
          >
            <div className="form-toolbar form-toolbar-highlight">
              {editingTemplateId ? (
                <label className="field">
                  <span>Template name</span>
                  <input
                    type="text"
                    value={templateDraftName}
                    onChange={(event) => setTemplateDraftName(event.target.value)}
                    placeholder="e.g. Upper day"
                  />
                </label>
              ) : (
                <>
                  <label className="field">
                    <span>Template</span>
                    <select
                      value={selectedWorkoutTemplateId}
                      onChange={(event) => {
                        const nextTemplateId = event.target.value;

                        if (!nextTemplateId) {
                          setSelectedWorkoutTemplateId('');
                          return;
                        }

                        loadWorkoutTemplate(nextTemplateId);
                      }}
                    >
                      <option value="">No template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
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
                </>
              )}
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

            <div className="logging-overview-row" aria-label="Workout draft overview">
              <div className="logging-overview-card logging-overview-card-primary">
                <span className="metric-label">{editingTemplateId ? 'Template draft' : 'Workout draft'}</span>
                <strong>{draftTitle}</strong>
                <p>{draftMeta}</p>
              </div>
              <div className="logging-overview-card">
                <span className="metric-label">Exercises</span>
                <strong>{workoutForm.entries.length}</strong>
                <p>{workoutForm.splitId ? 'Loaded for today' : 'Planned right now'}</p>
              </div>
              <div className="logging-overview-card">
                <span className="metric-label">Sets</span>
                <strong>{plannedSetCount}</strong>
                <p>{plannedSetCount ? 'Ready to log' : 'Add one to begin'}</p>
              </div>
            </div>

            <div className="logging-support-grid">
              <label className="field logging-notes-field">
                <span>Notes</span>
                <textarea
                  value={workoutForm.notes ?? ''}
                  onChange={(event) =>
                    setWorkoutForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Optional notes about how the session felt, effort, or anything worth remembering"
                  rows="3"
                />
              </label>

              <div className="logging-support-stack">
                {!editingTemplateId && (
                  <div className="session-context-card">
                    <div className="session-context-grid">
                      <label className="field field-compact">
                        <span>Mood</span>
                        <select
                          value={workoutForm.mood ?? ''}
                          onChange={(event) =>
                            setWorkoutForm((current) => ({ ...current, mood: event.target.value }))
                          }
                        >
                          <option value="">Optional mood</option>
                          {SESSION_MOODS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field field-compact">
                        <span>Effort</span>
                        <select
                          value={workoutForm.effort ?? ''}
                          onChange={(event) =>
                            setWorkoutForm((current) => ({ ...current, effort: event.target.value }))
                          }
                        >
                          <option value="">Optional effort</option>
                          {SESSION_EFFORTS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="rest-timer-card" role="status" aria-live="polite">
                      <span className="metric-label">Rest timer</span>
                      <strong>{formatTimerLabel(restTimer?.remaining ?? 0)}</strong>
                      <p>{restTimer?.label ?? 'Start a timer from any set row'}</p>
                      <div className="rest-timer-actions">
                        <button
                          type="button"
                          className="ghost-button action-button"
                          onClick={() =>
                            setRestTimer((current) =>
                              current
                                ? { ...current, remaining: current.remaining + 30, running: true }
                                : { duration: 30, remaining: 30, label: 'Quick 30s reset', running: true },
                            )
                          }
                        >
                          +30s
                        </button>
                        <button
                          type="button"
                          className="ghost-button action-button"
                          onClick={() => setRestTimer(null)}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
              </div>
            </div>

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

                    <div className={latestSession ? 'entry-support-grid entry-support-grid-with-reference' : 'entry-support-grid'}>
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
                    </div>

                    <div className="set-grid-head" aria-hidden="true">
                      <span>Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span>Actions</span>
                    </div>

                    <div className="sets-stack">
                      {entry.sets.map((set, setIndex) => (
                        <div key={set.id} className={set.completed ? 'set-row set-row-complete' : 'set-row'}>
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
                            <div className="set-actions-primary">
                              <label className="set-done-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(set.completed)}
                                  onChange={(event) =>
                                    toggleSetCompleted(entry.id, set.id, event.target.checked)
                                  }
                                />
                                <span>{set.completed ? 'Done' : 'Open'}</span>
                              </label>
                              <button
                                type="button"
                                className="ghost-button action-button set-step-button"
                                aria-label={`Add 2.5 kilograms to set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                                onClick={() => adjustSetValue(entry.id, set.id, 'weight', 2.5)}
                              >
                                +2.5 kg
                              </button>
                              <button
                                type="button"
                                className="ghost-button action-button set-step-button"
                                aria-label={`Add 5 kilograms to set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                                onClick={() => adjustSetValue(entry.id, set.id, 'weight', 5)}
                              >
                                +5 kg
                              </button>
                              <button
                                type="button"
                                className="ghost-button action-button set-step-button"
                                aria-label={`Add one rep to set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                                onClick={() => adjustSetValue(entry.id, set.id, 'reps', 1)}
                              >
                                +1 rep
                              </button>
                            </div>
                            <div className="set-actions-secondary">
                              <div className="set-timer-buttons" aria-label={`Rest timer shortcuts for set ${setIndex + 1}`}>
                                {[60, 90, 120].map((duration) => (
                                  <button
                                    key={duration}
                                    type="button"
                                    className="ghost-button action-button set-timer-button"
                                    aria-label={`Start ${duration} second rest timer for set ${setIndex + 1} of ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
                                    onClick={() =>
                                      startRestTimer(
                                        duration,
                                        `${selectedExerciseName || `Exercise ${entryIndex + 1}`} • Set ${setIndex + 1}`,
                                      )
                                    }
                                  >
                                    {duration}s
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                className="ghost-button set-inline-button"
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
                                className="ghost-button set-inline-button"
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
                        </div>
                      ))}
                    </div>

                    <div className="entry-card-footer">
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
                    </div>
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
              {!editingTemplateId && (
                <button type="button" className="ghost-button" onClick={saveCurrentWorkoutAsTemplate}>
                  Save as template
                </button>
              )}
              {selectedWorkoutTemplateId && !editingTemplateId && (
                <button type="button" className="ghost-button" onClick={updateSelectedWorkoutTemplate}>
                  Update template
                </button>
              )}
              {editingTemplateId && (
                <button type="button" className="ghost-button" onClick={resetWorkoutForm}>
                  Cancel template
                </button>
              )}
              {editingWorkoutId && (
                <button type="button" className="ghost-button" onClick={resetWorkoutForm}>
                  Cancel editing
                </button>
              )}
              <button type="submit" className="primary-button">
                {editingTemplateId ? 'Save template' : editingWorkoutId ? 'Save changes' : 'Save workout'}
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
