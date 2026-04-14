import React, { useEffect, useState } from 'react';
import EmptyState from './EmptyState.jsx';
import { getLatestExerciseSession, suggestNextSets } from '../lib/workoutData.js';

const SESSION_MOODS = ['Great', 'Good', 'Steady', 'Low'];
const SESSION_EFFORTS = ['Easy', 'Moderate', 'Hard', 'Max'];

function formatTimerLabel(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatExerciseGoal(exercise, formatNumber) {
  if (!exercise) {
    return null;
  }

  const hasExplicitGoal =
    exercise.targetRepMin || exercise.targetRepMax || exercise.targetWeight;

  if (!hasExplicitGoal) {
    return null;
  }

  const parts = [];

  if (exercise.targetRepMin || exercise.targetRepMax) {
    parts.push(`Reps ${exercise.targetRepMin ?? '--'}-${exercise.targetRepMax ?? '--'}`);
  }

  if (exercise.targetWeight) {
    parts.push(`Target ${formatNumber(exercise.targetWeight)} kg`);
  }

  if (exercise.weightStep) {
    parts.push(`Step ${formatNumber(exercise.weightStep)} kg`);
  }

  return parts.length ? parts.join(' • ') : null;
}

function getWorkoutModeMeta({
  editingTemplateId,
  editingWorkoutId,
  selectedWorkoutTemplateId,
  splitId,
  skippedCount,
}) {
  if (editingTemplateId) {
    return {
      flowTitle: 'Shape a reusable template',
      flowBody:
        'Review the structure, keep the working sets clean, and save a version you can load in one tap later.',
      setupBadge: 'Template editing',
      finishTitle: 'Save template changes',
      finishBody: 'This updates the reusable template, not a logged workout session.',
    };
  }

  if (editingWorkoutId) {
    return {
      flowTitle: 'Review and update this logged workout',
      flowBody:
        'Double-check the session details, refine the set data, and save changes with confidence.',
      setupBadge: 'Workout editing',
      finishTitle: 'Save workout changes',
      finishBody: 'These edits will replace the existing logged session in your history.',
    };
  }

  if (selectedWorkoutTemplateId) {
    return {
      flowTitle: 'Start from a template and make it yours',
      flowBody:
        'Your template is loaded as a starting point. Adjust today’s sets, notes, or context before saving the session.',
      setupBadge: 'Template loaded',
      finishTitle: 'Finish today’s workout',
      finishBody:
        'Saving now creates a new workout entry. Use “Update template” only when you want to revise the reusable version too.',
    };
  }

  if (splitId) {
    return {
      flowTitle: 'Log a split-based session with less friction',
      flowBody: skippedCount
        ? 'Your split seeded the workout. Keep what you need, skip what is not happening today, and save once the session is complete.'
        : 'Your split seeded the workout. Fill in the sets, use the last-session cues when helpful, and finish with a quick review.',
      setupBadge: 'Split loaded',
      finishTitle: 'Finish today’s split session',
      finishBody: skippedCount
        ? 'Skipped exercises stay out of this saved session unless you restore them before saving.'
        : 'Review the draft summary, then save this session to history.',
    };
  }

  return {
    flowTitle: 'Build a custom workout without losing momentum',
    flowBody:
      'Choose a split or template if you want a head start, or add exercises manually and move straight into logging.',
    setupBadge: 'Custom session',
    finishTitle: 'Save this custom workout',
    finishBody: 'Review the draft summary, then save the workout once your sets and notes look right.',
  };
}

function LoggingActiveRail({
  draftTitle,
  draftMeta,
  entryCount,
  plannedSetCount,
  splitId,
  editingTemplateId,
  getSplitName,
  restTimer,
  setRestTimer,
  nextMoveTitle,
  nextMoveBody,
}) {
  return (
    <div className="logging-active-rail" aria-label="Ready to log summary">
      <div className="logging-active-summary">
        <span className="metric-label">{editingTemplateId ? 'Template draft' : 'Active session'}</span>
        <strong>{draftTitle}</strong>
        <p>{draftMeta}</p>
        <div className="logging-active-pills">
          <span className="logging-active-pill">
            {entryCount} {entryCount === 1 ? 'exercise' : 'exercises'}
          </span>
          <span className="logging-active-pill">
            {plannedSetCount} {plannedSetCount === 1 ? 'set' : 'sets'}
          </span>
          <span className="logging-active-pill">
            {splitId ? `${getSplitName(splitId)} loaded` : 'Custom session'}
          </span>
        </div>
        {!editingTemplateId && (
          <div className="logging-next-move">
            <span className="metric-label">Recommended next step</span>
            <strong>{nextMoveTitle}</strong>
            <p>{nextMoveBody}</p>
          </div>
        )}
      </div>
      {!editingTemplateId && (
        <RestTimerCard restTimer={restTimer} setRestTimer={setRestTimer} />
      )}
    </div>
  );
}

function getEntryDisplayName(entry, entryIndex, exercises) {
  return exercises.find((exercise) => exercise.id === entry.exerciseId)?.name ?? `exercise ${entryIndex + 1}`;
}

function getNextLoggingMove(workoutForm, exercises) {
  if (!workoutForm.entries.length) {
    return {
      title: 'Add the first exercise',
      body: 'Build the active list with one movement so you can start logging right away.',
    };
  }

  const emptyEntry = workoutForm.entries.findIndex((entry) => !entry.exerciseId);
  if (emptyEntry >= 0) {
    return {
      title: `Choose exercise ${emptyEntry + 1}`,
      body: 'Pick the movement for that slot, then move straight into the first working set.',
    };
  }

  for (let entryIndex = 0; entryIndex < workoutForm.entries.length; entryIndex += 1) {
    const entry = workoutForm.entries[entryIndex];
    const exerciseName = getEntryDisplayName(entry, entryIndex, exercises);
    const nextSetIndex = entry.sets.findIndex((set) => {
      const missingWeight = String(set.weight ?? '').trim() === '';
      const missingReps = String(set.reps ?? '').trim() === '';
      return missingWeight || missingReps || !set.completed;
    });

    if (nextSetIndex >= 0) {
      const nextSet = entry.sets[nextSetIndex];
      const missingWeight = String(nextSet.weight ?? '').trim() === '';
      const missingReps = String(nextSet.reps ?? '').trim() === '';

      if (missingWeight || missingReps) {
        const missingParts = [missingWeight ? 'weight' : null, missingReps ? 'reps' : null].filter(Boolean);
        return {
          title: `Log set ${nextSetIndex + 1} for ${exerciseName}`,
          body: `Add ${missingParts.join(' and ')} so this set is ready to complete.`,
        };
      }

      return {
        title: `Finish set ${nextSetIndex + 1} for ${exerciseName}`,
        body: 'Weight and reps are in. Mark it done, then continue with the next working set.',
      };
    }
  }

  return {
    title: 'Review and save this workout',
    body: 'All active sets look complete. Save once the summary matches what you actually did.',
  };
}

function WorkoutEntryInsights({
  latestSession,
  suggestion,
  exerciseGoal,
  selectedExerciseName,
  entryIndex,
  formatDisplayDate,
  formatNumber,
  applyLatestWorkoutToEntry,
  entryId,
  updateWorkoutEntry,
  createSetFromValues,
}) {
  const [proofOpen, setProofOpen] = useState(false);
  const hasReferenceInsights = Boolean(latestSession || suggestion);

  if (!hasReferenceInsights && !exerciseGoal) {
    return null;
  }

  let recommendationTitle = 'Keep this exercise on target';
  let recommendationBody = exerciseGoal;
  let recommendationLabel = 'Best starting point';
  let suggestionActionLabel = 'Load suggested sets';
  let latestActionLabel = 'Load last sets';

  if (suggestion) {
    recommendationTitle = `Start ${selectedExerciseName || `exercise ${entryIndex + 1}`} at the suggested working sets`;
    recommendationBody = `${suggestion.reason} Apply this when you want the quickest credible starting point for today.`;
  } else if (latestSession) {
    recommendationTitle = `Open ${selectedExerciseName || `exercise ${entryIndex + 1}`} from your last logged baseline`;
    recommendationBody = `Last logged ${formatDisplayDate(latestSession.date)}. Reuse it when today should feel close to that session.`;
  } else if (exerciseGoal) {
    recommendationBody = `${exerciseGoal} Use this target to choose your opening set, then adjust as the session settles in.`;
  }

  return (
    <div className="entry-insight-shell">
      <div className="entry-insight-strip">
        <div className="entry-insight-copy">
          <span className="metric-label">{recommendationLabel}</span>
          <strong>{recommendationTitle}</strong>
          <p>{recommendationBody}</p>
          {exerciseGoal && hasReferenceInsights ? (
            <div className="logging-active-pills">
              <span className="logging-active-pill">Goal active</span>
            </div>
          ) : null}
        </div>
        <div className="entry-insight-actions">
          {latestSession && (
            <button
              type="button"
              className="ghost-button action-button"
              aria-label={`Use last workout values for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
              onClick={() => applyLatestWorkoutToEntry(entryId, latestSession)}
            >
              {latestActionLabel}
            </button>
          )}
          {suggestion && (
            <button
              type="button"
              className="primary-button action-button"
              aria-label={`Apply progressive overload suggestion for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
              onClick={() =>
                updateWorkoutEntry(entryId, (currentEntry) => ({
                  ...currentEntry,
                  sets: suggestion.sets.map((set) =>
                    createSetFromValues(set.weight, set.reps),
                  ),
                }))
              }
            >
              {suggestionActionLabel}
            </button>
          )}
          {hasReferenceInsights && (
            <button
              type="button"
              className="ghost-button action-button"
              aria-expanded={proofOpen}
              onClick={() => setProofOpen((current) => !current)}
            >
              {proofOpen ? 'Hide proof' : 'Show proof'}
            </button>
          )}
        </div>
      </div>

      {hasReferenceInsights && proofOpen && (
        <div className="entry-insight-details">
          {suggestion && (
            <div className="suggestion-preview-card">
              <span className="metric-label">Suggested next sets</span>
              <p className="suggestion-note">{suggestion.reason}</p>
              <ul className="set-list compact-set-list">
                {suggestion.sets.map((set, index) => (
                  <li key={`suggestion-${index}`}>
                    → Set {index + 1}: {formatNumber(set.weight)} × {set.reps}
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {exerciseGoal && (
            <div className="suggestion-card">
              <div className="suggestion-header">
                <div>
                  <span className="metric-label">Exercise goal</span>
                  <p>{exerciseGoal}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkoutSetRow({
  set,
  setIndex,
  entry,
  entryId,
  entryIndex,
  selectedExerciseName,
  updateWorkoutEntry,
  adjustSetValue,
  toggleSetCompleted,
  startRestTimer,
  createSet,
  createSetFromValues,
}) {
  const [timerOpen, setTimerOpen] = useState(false);
  const hasWeight = String(set.weight ?? '').trim() !== '';
  const hasReps = String(set.reps ?? '').trim() !== '';
  const setStatusCopy = set.completed
    ? 'Completed'
    : hasWeight && hasReps
      ? 'Ready to mark complete'
      : 'Add weight and reps';

  return (
    <div className={set.completed ? 'set-row set-row-complete' : 'set-row'}>
      <div className="set-row-main">
        <div className="set-row-top">
          <div className="set-row-label-wrap">
            <label className="set-standard-checkbox">
              <input
                type="checkbox"
                checked={Boolean(set.completed)}
                onChange={(event) =>
                  toggleSetCompleted(entryId, set.id, event.target.checked)
                }
              />
              <span className="set-row-label">Set {setIndex + 1}</span>
            </label>
          </div>
          <div className="set-actions-primary">
            <button
              type="button"
              className="ghost-button action-button set-step-button"
              aria-label={`Add 2.5 kilograms to set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
              onClick={() => adjustSetValue(entryId, set.id, 'weight', 2.5)}
            >
              +2.5 kg
            </button>
            <button
              type="button"
              className="ghost-button action-button set-step-button"
              aria-label={`Add one rep to set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
              onClick={() => adjustSetValue(entryId, set.id, 'reps', 1)}
            >
              +1 rep
            </button>
          </div>
        </div>
        <div className="set-input-grid set-input-grid-compact">
          <label className="field">
            <span className="set-field-label">Weight</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={set.weight}
              onChange={(event) =>
                updateWorkoutEntry(entryId, (currentEntry) => ({
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
                updateWorkoutEntry(entryId, (currentEntry) => ({
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
          <div className="set-secondary-cluster">
            <button
              type="button"
              className="ghost-button action-button set-timer-toggle"
              aria-expanded={timerOpen}
              onClick={() => setTimerOpen((current) => !current)}
            >
              {timerOpen ? 'Hide timer' : 'Timer'}
            </button>
            <p className="set-row-hint">{setStatusCopy}</p>
          </div>
        </div>
        {timerOpen && (
          <div
            className="set-timer-buttons"
            aria-label={`Rest timer shortcuts for set ${setIndex + 1}`}
          >
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
        )}
        <div className="set-actions-secondary">
          <button
            type="button"
            className="ghost-button set-inline-button"
            aria-label={`Copy set ${setIndex + 1} for ${selectedExerciseName || `exercise ${entryIndex + 1}`}`}
            onClick={() =>
              updateWorkoutEntry(entryId, (currentEntry) => ({
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
              updateWorkoutEntry(entryId, (currentEntry) => ({
                ...currentEntry,
                sets:
                  currentEntry.sets.length === 1
                    ? [createSet()]
                    : currentEntry.sets.filter(
                        (currentSet) => currentSet.id !== set.id,
                      ),
              }))
            }
          >
            {entry.sets.length === 1 && setIndex === 0 ? 'Clear set' : 'Remove set'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoggingFlowCard({ modeMeta }) {
  return (
    <section className="logging-flow-card">
      <div>
        <p className="section-label">Session flow</p>
        <h3>{modeMeta.flowTitle}</h3>
        <p>{modeMeta.flowBody}</p>
      </div>
      <div className="logging-flow-steps" aria-label="Workout logging flow">
        <div className="logging-flow-step">
          <span className="logging-flow-step-index">1</span>
          <div>
            <strong>Setup</strong>
            <p>Pick the source and confirm today’s session.</p>
          </div>
        </div>
        <div className="logging-flow-step">
          <span className="logging-flow-step-index">2</span>
          <div>
            <strong>Log</strong>
            <p>Log the active list and use cues only when they help.</p>
          </div>
        </div>
        <div className="logging-flow-step">
          <span className="logging-flow-step-index">3</span>
          <div>
            <strong>Finish</strong>
            <p>Review the summary, then save the session.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RestTimerCard({ restTimer, setRestTimer }) {
  return (
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
                : {
                    duration: 30,
                    remaining: 30,
                    label: 'Quick 30s reset',
                    running: true,
                  },
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
  );
}

function LoggingStageHeader({ eyebrow, title, body, badge }) {
  return (
    <div className="logging-stage-header">
      <div>
        <p className="section-label">{eyebrow}</p>
        <h3>{title}</h3>
        {body ? <p>{body}</p> : null}
      </div>
      {badge ? <span className="logging-stage-badge">{badge}</span> : null}
    </div>
  );
}

function WorkoutFinishPanel({
  modeMeta,
  workoutForm,
  plannedSetCount,
  selectedWorkoutTemplateId,
  editingTemplateId,
  editingWorkoutId,
  saveCurrentWorkoutAsTemplate,
  updateSelectedWorkoutTemplate,
  resetWorkoutForm,
  setWorkoutForm,
  createWorkoutEntry,
  workoutMessage,
}) {
  return (
    <section className="logging-finish-card logging-finish-card-linked">
      <LoggingStageHeader
        eyebrow="3. Finish"
        title={modeMeta.finishTitle}
        body={`Save from here when the active list is done. ${modeMeta.finishBody}`}
        badge="Ready to save"
      />

      <div className="logging-finish-summary" aria-label="Workout finish summary">
        <div className="logging-finish-metric logging-finish-metric-primary">
          <span className="metric-label">Draft</span>
          <strong>{plannedSetCount}</strong>
          <p>{plannedSetCount === 1 ? 'planned set' : 'planned sets'} ready to save</p>
        </div>
        <div className="logging-finish-metric">
          <span className="metric-label">Active exercises</span>
          <strong>{workoutForm.entries.length}</strong>
          <p>{workoutForm.splitId ? 'Loaded for today' : 'Built manually right now'}</p>
        </div>
        <div className="logging-finish-metric">
          <span className="metric-label">Skipped today</span>
          <strong>{workoutForm.skippedEntries?.length ?? 0}</strong>
          <p>{workoutForm.splitId ? 'Excluded from this saved session' : 'No split items skipped'}</p>
        </div>
      </div>

      <div className="logging-finish-primary">
        <div className="logging-finish-primary-copy">
          <span className="metric-label">Final step</span>
          <strong>
            {editingTemplateId
              ? 'Commit template changes'
              : editingWorkoutId
                ? 'Commit workout edits'
                : 'Save this workout now'}
          </strong>
          <p>
            {editingTemplateId
              ? 'This updates the reusable template.'
              : editingWorkoutId
                ? 'This replaces the saved workout in history.'
                : 'This creates the final workout entry in history.'}
          </p>
        </div>
        <button type="submit" className="primary-button logging-finish-submit">
          {editingTemplateId
            ? 'Save template'
            : editingWorkoutId
              ? 'Save changes'
              : 'Save workout'}
        </button>
      </div>

      <div className="logging-finish-secondary">
        <span className="metric-label">Keep editing</span>
        <p className="logging-finish-secondary-copy">
          Only use these if you still want to change the draft before saving.
        </p>
        <div className="actions workout-actions logging-finish-actions">
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
        </div>
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
    </section>
  );
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
  const nextMove = getNextLoggingMove(workoutForm, exercises);
  const modeMeta = getWorkoutModeMeta({
    editingTemplateId,
    editingWorkoutId,
    selectedWorkoutTemplateId,
    splitId: workoutForm.splitId,
    skippedCount: skippedEntries.length,
  });
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
            <LoggingFlowCard modeMeta={modeMeta} />

            <section className="logging-stage-card">
              <LoggingStageHeader
                eyebrow="1. Setup"
                title="Session setup"
                body="Choose the source, confirm the date, and go straight to logging."
                badge={modeMeta.setupBadge}
              />

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

            </section>

            <section className="logging-stage-card logging-stage-card-primary">
              <LoggingStageHeader
                eyebrow="2. Log"
                title="Active exercises"
                body="Log the active list first and only open extra cues when you need them."
                badge={`${workoutForm.entries.length} active`}
              />

              <LoggingActiveRail
                draftTitle={draftTitle}
                draftMeta={draftMeta}
                entryCount={workoutForm.entries.length}
                plannedSetCount={plannedSetCount}
                splitId={workoutForm.splitId}
                editingTemplateId={editingTemplateId}
                getSplitName={getSplitName}
                restTimer={restTimer}
                setRestTimer={setRestTimer}
                nextMoveTitle={nextMove.title}
                nextMoveBody={nextMove.body}
              />

              <div className="stack entry-stack">
                {workoutForm.entries.map((entry, entryIndex) => {
                  const selectedExercise =
                    exercises.find((exercise) => exercise.id === entry.exerciseId) ?? null;
                  const latestSession = getLatestExerciseSession(workouts, entry.exerciseId);
                  const suggestion = suggestNextSets(workouts, entry.exerciseId, selectedExercise);
                  const selectedExerciseName = selectedExercise?.name ?? '';
                  const exerciseGoal = formatExerciseGoal(selectedExercise, formatNumber);

                  return (
                    <article key={entry.id} className="entry-card workout-entry-card">
                      <div className="entry-card-header">
                        <div>
                          <h3>{selectedExerciseName || `Exercise ${entryIndex + 1}`}</h3>
                          <p className="entry-card-meta">
                            Exercise {entryIndex + 1} of {workoutForm.entries.length} • {entry.sets.length}{' '}
                            planned {entry.sets.length === 1 ? 'set' : 'sets'}
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

                      <div className="entry-config-row">
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
                      </div>

                      <WorkoutEntryInsights
                        latestSession={latestSession}
                        suggestion={suggestion}
                        exerciseGoal={exerciseGoal}
                        selectedExerciseName={selectedExerciseName}
                        entryIndex={entryIndex}
                        formatDisplayDate={formatDisplayDate}
                        formatNumber={formatNumber}
                        applyLatestWorkoutToEntry={applyLatestWorkoutToEntry}
                        entryId={entry.id}
                        updateWorkoutEntry={updateWorkoutEntry}
                        createSetFromValues={createSetFromValues}
                      />

                      <div className="sets-stack">
                        {entry.sets.map((set, setIndex) => (
                          <WorkoutSetRow
                            key={set.id}
                            set={set}
                            setIndex={setIndex}
                            entry={entry}
                            entryId={entry.id}
                            entryIndex={entryIndex}
                            selectedExerciseName={selectedExerciseName}
                            updateWorkoutEntry={updateWorkoutEntry}
                            adjustSetValue={adjustSetValue}
                            toggleSetCompleted={toggleSetCompleted}
                            startRestTimer={startRestTimer}
                            createSet={createSet}
                            createSetFromValues={createSetFromValues}
                          />
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
                  <p>
                    No exercises were added from this split yet. Use the button below to add one
                    manually if needed.
                  </p>
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
            </section>

            <section className="logging-stage-card logging-stage-card-support">
              <LoggingStageHeader
                eyebrow="Support"
                title="Session details"
                body="Optional notes and context stay nearby, but out of the way of fast set entry."
                badge="Optional"
              />

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
                              setWorkoutForm((current) => ({
                                ...current,
                                effort: event.target.value,
                              }))
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
                          <p>
                            This split is empty. Add exercises in the planner or build today manually.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <WorkoutFinishPanel
              modeMeta={modeMeta}
              workoutForm={workoutForm}
              plannedSetCount={plannedSetCount}
              selectedWorkoutTemplateId={selectedWorkoutTemplateId}
              editingTemplateId={editingTemplateId}
              editingWorkoutId={editingWorkoutId}
              saveCurrentWorkoutAsTemplate={saveCurrentWorkoutAsTemplate}
              updateSelectedWorkoutTemplate={updateSelectedWorkoutTemplate}
              resetWorkoutForm={resetWorkoutForm}
              setWorkoutForm={setWorkoutForm}
              createWorkoutEntry={createWorkoutEntry}
              workoutMessage={workoutMessage}
            />
          </form>
        )}
      </section>
    </main>
  );
}
