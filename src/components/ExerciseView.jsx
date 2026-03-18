import React from 'react';
import EmptyState from './EmptyState.jsx';
import SplitManagerSection from './SplitManagerSection.jsx';

export default function ExerciseView({
  editingExerciseId,
  exerciseName,
  setExerciseName,
  handleExerciseSubmit,
  resetExerciseForm,
  exerciseMessage,
  exercises,
  formatCalendarDate,
  startEditingExercise,
  deleteExercise,
  moveExercise,
  splits,
  templates,
  splitForm,
  setSplitForm,
  editingSplitId,
  splitMessage,
  handleSplitSubmit,
  resetSplitForm,
  startEditingSplit,
  deleteSplit,
  createSplitExercise,
  getExerciseName,
  loadWorkoutTemplate,
  deleteWorkoutTemplate,
  moveWorkoutTemplate,
  renameWorkoutTemplate,
  duplicateWorkoutTemplate,
  createSplitFromTemplate,
  startEditingWorkoutTemplate,
}) {
  return (
    <main className="content-grid library-layout">
      <section className="library-overview-grid" aria-label="Library overview">
        <article className="library-overview-card library-overview-card-primary">
          <span className="section-label">Exercise library</span>
          <strong>{exercises.length}</strong>
          <p>{exercises.length ? 'Movements ready to use' : 'Start with your first exercise'}</p>
        </article>
        <article className="library-overview-card">
          <span className="section-label">Saved splits</span>
          <strong>{splits.length}</strong>
          <p>{splits.length ? 'Templates for faster logging' : 'No split templates yet'}</p>
        </article>
      </section>

      <section className="panel panel-form">
        <div className="section-heading">
          <div>
            <p className="section-label">Exercise library</p>
            <h2>{editingExerciseId ? 'Edit exercise' : 'Exercises'}</h2>
          </div>
        </div>
        <form className="stack form-stack" onSubmit={handleExerciseSubmit}>
          <label className="field">
            <span>Exercise name</span>
            <input
              type="text"
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
              placeholder="e.g. Barbell squat"
            />
          </label>
          <div className="actions">
            <button type="submit" className="primary-button">
              {editingExerciseId ? 'Save exercise' : 'Add exercise'}
            </button>
            {editingExerciseId && (
              <button type="button" className="ghost-button" onClick={() => resetExerciseForm()}>
                Cancel editing
              </button>
            )}
          </div>
          {exerciseMessage.text && (
            <p
              className={exerciseMessage.type === 'error' ? 'feedback error' : 'feedback success'}
              role={exerciseMessage.type === 'error' ? 'alert' : 'status'}
              aria-live={exerciseMessage.type === 'error' ? 'assertive' : 'polite'}
            >
              {exerciseMessage.text}
            </p>
          )}
        </form>
      </section>

      <section className="panel panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Saved exercises</p>
            <h2>Library</h2>
          </div>
        </div>
        {exercises.length ? (
          <div className="exercise-grid library-grid">
            {exercises.map((exercise) => (
              <article key={exercise.id} className="exercise-card library-card">
                <div className="exercise-card-header">
                  <div>
                    <h3>{exercise.name}</h3>
                    <p>Created {formatCalendarDate(exercise.createdAt)}</p>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Move ${exercise.name} up`}
                      onClick={() => moveExercise(exercise.id, 'up')}
                      disabled={exercises[0]?.id === exercise.id}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Move ${exercise.name} down`}
                      onClick={() => moveExercise(exercise.id, 'down')}
                      disabled={exercises[exercises.length - 1]?.id === exercise.id}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Edit ${exercise.name}`}
                      onClick={() => startEditingExercise(exercise.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      aria-label={`Delete ${exercise.name}`}
                      onClick={() => deleteExercise(exercise.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="library-card-meta">
                  <span className="library-meta-pill">Ready to log</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No exercises yet"
            body="Add your first movement to start logging."
          />
        )}
      </section>

      <section className="panel panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout templates</p>
            <h2>Templates</h2>
          </div>
        </div>
        {templates.length ? (
          <div className="exercise-grid library-grid">
            {templates.map((template) => (
              <article key={template.id} className="exercise-card library-card">
                <div className="exercise-card-header">
                  <div>
                    <h3>{template.name}</h3>
                    <p>
                      {template.entries.length} {template.entries.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Move template ${template.name} up`}
                      onClick={() => moveWorkoutTemplate(template.id, 'up')}
                      disabled={templates[0]?.id === template.id}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Move template ${template.name} down`}
                      onClick={() => moveWorkoutTemplate(template.id, 'down')}
                      disabled={templates[templates.length - 1]?.id === template.id}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Edit template ${template.name}`}
                      onClick={() => startEditingWorkoutTemplate(template.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Use template ${template.name}`}
                      onClick={() => loadWorkoutTemplate(template.id)}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Duplicate template ${template.name}`}
                      onClick={() => duplicateWorkoutTemplate(template.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Use template ${template.name} as a split template`}
                      onClick={() => createSplitFromTemplate(template.id)}
                    >
                      To split
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`Rename template ${template.name}`}
                      onClick={() => renameWorkoutTemplate(template.id)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => deleteWorkoutTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="library-card-meta">
                  <span className="library-meta-pill">
                    {template.splitId ? 'Split linked' : 'Custom template'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No templates yet"
            body="Save a workout as a template to reuse full sessions quickly."
          />
        )}
      </section>

      <SplitManagerSection
        exercises={exercises}
        splits={splits}
        splitForm={splitForm}
        setSplitForm={setSplitForm}
        editingSplitId={editingSplitId}
        splitMessage={splitMessage}
        handleSplitSubmit={handleSplitSubmit}
        resetSplitForm={resetSplitForm}
        startEditingSplit={startEditingSplit}
        deleteSplit={deleteSplit}
        createSplitExercise={createSplitExercise}
        getExerciseName={getExerciseName}
      />
    </main>
  );
}
