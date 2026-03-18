import React, { useMemo, useState } from 'react';
import EmptyState from './EmptyState.jsx';

export default function HistoryView({
  sortedWorkouts,
  historyHeatmap,
  historyPrTimeline,
  getExerciseName,
  getSplitName,
  formatDisplayDate,
  formatNumber,
  getEntryMetrics,
  startEditingWorkout,
  duplicateWorkout,
  saveWorkoutAsTemplate,
  createSplitFromWorkout,
  deleteWorkout,
}) {
  const activeDays = historyHeatmap.filter((day) => day.count > 0).length;
  const totalSessions = historyHeatmap.reduce((sum, day) => sum + day.count, 0);
  const peakVolume = historyHeatmap.reduce((peak, day) => Math.max(peak, day.volume), 0);
  const initialSelectedDate =
    [...historyHeatmap].reverse().find((day) => day.count > 0)?.date ?? '';
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(initialSelectedDate);
  const selectedDayWorkouts = useMemo(
    () => sortedWorkouts.filter((workout) => workout.date === selectedHistoryDate),
    [selectedHistoryDate, sortedWorkouts],
  );

  return (
    <main className="content-grid history-layout">
      <section className="panel panel-wide panel-highlight">
        <div className="section-heading">
          <div>
            <p className="section-label">Workout history</p>
            <h2>Past sessions</h2>
          </div>
        </div>
        {sortedWorkouts.length ? (
          <div className="history-list timeline-list">
            <div className="history-insight-grid">
              <article className="history-insight-card history-insight-card-primary">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">Training calendar</p>
                    <h2>Last 12 weeks</h2>
                  </div>
                  <div className="dashboard-heatmap-meta history-heatmap-meta">
                    <span>{activeDays} active days</span>
                    <span>{totalSessions} sessions</span>
                    <span>{peakVolume ? `${formatNumber(peakVolume)} peak` : 'No peak yet'}</span>
                  </div>
                </div>
                <div className="history-heatmap-grid" aria-label="History training calendar">
                  {historyHeatmap.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      className={
                        day.date === selectedHistoryDate
                          ? `dashboard-heatmap-cell level-${day.level} history-heatmap-cell active`
                          : `dashboard-heatmap-cell level-${day.level} history-heatmap-cell`
                      }
                      title={`${formatDisplayDate(day.date)} • ${day.count} ${day.count === 1 ? 'session' : 'sessions'} • ${formatNumber(day.volume)} volume`}
                      aria-label={`${formatDisplayDate(day.date)} with ${day.count} ${day.count === 1 ? 'session' : 'sessions'}`}
                      onClick={() => setSelectedHistoryDate(day.date)}
                    />
                  ))}
                </div>
                <div className="dashboard-heatmap-legend">
                  <span>Light</span>
                  <div className="dashboard-heatmap-scale" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span key={level} className={`dashboard-heatmap-cell level-${level}`} />
                    ))}
                  </div>
                  <span>Heavy</span>
                </div>
              </article>

              <article className="history-insight-card">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">PR timeline</p>
                    <h2>Recent wins</h2>
                  </div>
                </div>
                {historyPrTimeline.length ? (
                  <div className="history-pr-feed">
                    {historyPrTimeline.map((record) => (
                      <article
                        key={`${record.exerciseId}-${record.date}-${record.labels.join('-')}`}
                        className="dashboard-win-card history-pr-card"
                      >
                        <div>
                          <strong>{getExerciseName(record.exerciseId)}</strong>
                          <p>{formatDisplayDate(record.date)}</p>
                        </div>
                        <div className="tag-row">
                          {record.labels.map((label) => (
                            <span key={label} className="tag pr-tag">
                              {label}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No PRs yet"
                    body="Keep logging sessions to build your first PR timeline."
                  />
                )}
              </article>
            </div>

            {selectedHistoryDate && (
              <article className="history-insight-card history-day-card">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">Selected day</p>
                    <h2>{formatDisplayDate(selectedHistoryDate)}</h2>
                  </div>
                  <div className="dashboard-heatmap-meta history-heatmap-meta">
                    <span>
                      {selectedDayWorkouts.length} {selectedDayWorkouts.length === 1 ? 'session' : 'sessions'}
                    </span>
                    <span>
                      {formatNumber(
                        selectedDayWorkouts.reduce(
                          (sum, workout) =>
                            sum +
                            workout.entries.reduce(
                              (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
                              0,
                            ),
                          0,
                        ),
                      )}{' '}
                      volume
                    </span>
                  </div>
                </div>
                {selectedDayWorkouts.length ? (
                  <div className="history-day-workouts">
                    {selectedDayWorkouts.map((workout) => {
                      const sessionVolume = workout.entries.reduce(
                        (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
                        0,
                      );

                      return (
                        <article key={`selected-${workout.id}`} className="history-day-workout-card">
                          <div>
                            <strong>{workout.splitId ? getSplitName(workout.splitId) : 'Custom workout'}</strong>
                            <p>
                              {workout.entries.length} {workout.entries.length === 1 ? 'exercise' : 'exercises'}
                            </p>
                          </div>
                          <div className="activity-metrics history-entry-metrics">
                            <span>Vol {formatNumber(sessionVolume)}</span>
                            <span>Sets {workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0)}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No sessions on this day"
                    body="Pick a highlighted training day to inspect its workouts."
                  />
                )}
              </article>
            )}

            {sortedWorkouts.map((workout) => {
              const sessionVolume = workout.entries.reduce(
                (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
                0,
              );
              const sessionSets = workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0);

              return (
                <article key={workout.id} className="workout-card history-workout-card">
                  <div className="workout-card-header">
                    <div className="workout-card-title history-card-title">
                      <strong>{formatDisplayDate(workout.date)}</strong>
                      {workout.splitId ? <span>{getSplitName(workout.splitId)}</span> : null}
                      <span>{workout.entries.length} exercises</span>
                    </div>
                    <div className="history-actions">
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Edit workout from ${formatDisplayDate(workout.date)}`}
                        onClick={() => startEditingWorkout(workout.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Duplicate workout from ${formatDisplayDate(workout.date)}`}
                        onClick={() => duplicateWorkout(workout.id)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Save workout from ${formatDisplayDate(workout.date)} as a template`}
                        onClick={() => saveWorkoutAsTemplate(workout.id)}
                      >
                        Save template
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        aria-label={`Use workout from ${formatDisplayDate(workout.date)} as a split template`}
                        onClick={() => createSplitFromWorkout(workout.id)}
                      >
                        Use as split
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button danger-button"
                        aria-label={`Delete workout from ${formatDisplayDate(workout.date)}`}
                        onClick={() => deleteWorkout(workout.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="history-session-stats">
                    <div className="history-session-stat history-session-stat-primary">
                      <span>Volume</span>
                      <strong>{formatNumber(sessionVolume)}</strong>
                    </div>
                    <div className="history-session-stat">
                      <span>Sets</span>
                      <strong>{sessionSets}</strong>
                    </div>
                    <div className="history-session-stat">
                      <span>Moves</span>
                      <strong>{workout.entries.length}</strong>
                    </div>
                  </div>
                  {(workout.mood || workout.effort) && (
                    <div className="library-card-meta">
                      {workout.mood ? <span className="library-meta-pill">Mood {workout.mood}</span> : null}
                      {workout.effort ? <span className="library-meta-pill">Effort {workout.effort}</span> : null}
                    </div>
                  )}
                  {workout.notes ? (
                    <div className="history-session-note">
                      <span className="section-label">Session note</span>
                      <p>{workout.notes}</p>
                    </div>
                  ) : null}
                  <div className="workout-entry-list">
                    {workout.entries.map((entry) => {
                      const metrics = getEntryMetrics(entry);

                      return (
                        <div key={`${workout.id}-${entry.exerciseId}`} className="history-entry">
                          <div className="history-entry-header">
                            <div>
                              <h3>{getExerciseName(entry.exerciseId)}</h3>
                              <p>{entry.sets.length} sets logged</p>
                            </div>
                            <div className="activity-metrics history-entry-metrics">
                              <span>Wt {formatNumber(metrics.bestWeight)}</span>
                              <span>Rp {formatNumber(metrics.bestReps)}</span>
                              <span>Vol {formatNumber(metrics.totalVolume)}</span>
                            </div>
                          </div>
                          <ul className="set-list">
                            {entry.sets.map((set, index) => (
                              <li key={`${workout.id}-${entry.exerciseId}-${index}`}>
                                Set {index + 1}: {formatNumber(set.weight)} × {formatNumber(set.reps)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Workout history is empty"
            body="Save a workout to start your timeline."
          />
        )}
      </section>
    </main>
  );
}
