import React from 'react';
import EmptyState from './EmptyState.jsx';
import StatCard from './StatCard.jsx';

export default function DashboardView({
  exercises,
  workouts,
  totalSetsLogged,
  dashboardSummary,
  latestWorkout,
  getExerciseName,
  formatDisplayDate,
  formatNumber,
  getEntryMetrics,
  dataMessage,
  exportAppData,
  fileInputRef,
  handleImportFile,
}) {
  return (
    <main className="content-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Dashboard</p>
            <h2>Your training snapshot</h2>
          </div>
        </div>
        <div className="stats-grid">
          <StatCard
            label="Exercises"
            value={String(exercises.length)}
            helper={exercises.length ? 'Custom movements ready to log' : 'Start by adding one'}
          />
          <StatCard
            label="Workouts"
            value={String(workouts.length)}
            helper={workouts.length ? 'Saved by workout date' : 'No sessions recorded yet'}
          />
          <StatCard
            label="Sets logged"
            value={String(totalSetsLogged)}
            helper={totalSetsLogged ? 'Volume builds over time' : 'Sets will appear here'}
          />
          <StatCard
            label="Last training day"
            value={
              dashboardSummary.lastTrainingDay
                ? formatDisplayDate(dashboardSummary.lastTrainingDay)
                : '--'
            }
            helper={
              dashboardSummary.lastTrainingDay ? 'Most recent logged workout' : 'No workouts yet'
            }
          />
          <StatCard
            label="Most trained exercise"
            value={
              dashboardSummary.mostTrainedExercise
                ? getExerciseName(dashboardSummary.mostTrainedExercise.exerciseId)
                : '--'
            }
            helper={
              dashboardSummary.mostTrainedExercise
                ? `${dashboardSummary.mostTrainedExercise.count} workout entries`
                : 'No exercise history yet'
            }
          />
          <StatCard
            label="Volume this week"
            value={formatNumber(dashboardSummary.totalVolumeThisWeek)}
            helper={
              dashboardSummary.workoutsThisWeek
                ? 'Sum of weight × reps across this week'
                : 'No workouts in the current week'
            }
          />
          <StatCard
            label="Workouts this week"
            value={String(dashboardSummary.workoutsThisWeek)}
            helper={
              dashboardSummary.workoutsThisWeek
                ? 'Logged in the current week'
                : 'No workouts in the current week'
            }
          />
        </div>
        <div className="data-actions">
          <button type="button" className="secondary-button" onClick={exportAppData}>
            Export JSON
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden-input"
            onChange={handleImportFile}
          />
        </div>
        {dataMessage.text && (
          <p
            className={
              dataMessage.type === 'error'
                ? 'feedback error'
                : dataMessage.type === 'warning'
                  ? 'feedback warning'
                  : 'feedback success'
            }
            role={dataMessage.type === 'error' ? 'alert' : 'status'}
            aria-live={dataMessage.type === 'error' ? 'assertive' : 'polite'}
          >
            {dataMessage.text}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-label">Recent activity</p>
            <h2>Latest workout</h2>
          </div>
        </div>
        {latestWorkout ? (
          <article className="workout-card">
            <div className="workout-card-header">
              <strong>{formatDisplayDate(latestWorkout.date)}</strong>
              <span>{latestWorkout.entries.length} exercises</span>
            </div>
            <div className="workout-entry-list">
              {latestWorkout.entries.map((entry) => {
                const metrics = getEntryMetrics(entry);

                return (
                  <div key={`${latestWorkout.id}-${entry.exerciseId}`} className="history-entry">
                    <div>
                      <h3>{getExerciseName(entry.exerciseId)}</h3>
                      <p>
                        Best weight {formatNumber(metrics.bestWeight)} • Best reps{' '}
                        {formatNumber(metrics.bestReps)} • Volume {formatNumber(metrics.totalVolume)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ) : (
          <EmptyState
            title="No workouts yet"
            body="Add a few exercises, then log your first session to populate the dashboard."
          />
        )}
      </section>
    </main>
  );
}
