import React from 'react';
import EmptyState from './EmptyState.jsx';

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
}) {
  return (
    <main className="content-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Exercise library</p>
            <h2>{editingExerciseId ? 'Edit exercise' : 'Create exercises'}</h2>
          </div>
        </div>
        <form className="stack" onSubmit={handleExerciseSubmit}>
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

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Saved exercises</p>
            <h2>Ready for future workouts</h2>
          </div>
        </div>
        {exercises.length ? (
          <div className="exercise-grid">
            {exercises.map((exercise) => (
              <article key={exercise.id} className="exercise-card">
                <div className="exercise-card-header">
                  <div>
                    <h3>{exercise.name}</h3>
                    <p>Created {formatCalendarDate(exercise.createdAt)}</p>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      onClick={() => startEditingExercise(exercise.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button danger-button"
                      onClick={() => deleteExercise(exercise.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No exercises yet"
            body="Create your first exercise to unlock workout logging and progress tracking."
          />
        )}
      </section>
    </main>
  );
}
