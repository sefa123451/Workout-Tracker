import React, { useMemo, useState } from 'react';
import EmptyState from './EmptyState.jsx';

function getSessionSignal(workout, sessionVolume, averageSessionVolume, isLatest) {
  if (isLatest) {
    return { label: 'Latest review', tone: 'accent' };
  }

  if (averageSessionVolume > 0 && sessionVolume >= averageSessionVolume * 1.2) {
    return { label: 'Standout output', tone: 'accent' };
  }

  if (workout.notes) {
    return { label: 'Notes captured', tone: 'support' };
  }

  if (workout.mood === 'Great' || workout.effort === 'Max') {
    return { label: 'High effort', tone: 'accent' };
  }

  if (workout.splitId) {
    return { label: 'Split session', tone: 'default' };
  }

  return { label: 'Logged session', tone: 'default' };
}

function getSessionStory({
  workout,
  sessionVolume,
  sessionSets,
  topEntryName,
  topEntryVolume,
  topEntryShare,
  averageSessionVolume,
  isLatest,
  formatNumber,
  getSplitName,
}) {
  if (isLatest) {
    return {
      title: 'This is your newest session to review',
      body: `${formatNumber(sessionVolume)} volume across ${sessionSets} ${
        sessionSets === 1 ? 'set' : 'sets'
      }. ${topEntryName} carried ${formatNumber(topEntryVolume)} volume, so it is the fastest place to start.`,
    };
  }

  if (averageSessionVolume > 0 && sessionVolume >= averageSessionVolume * 1.2) {
    return {
      title: 'Higher-output than your recent baseline',
      body: `${formatNumber(sessionVolume)} volume pushed this workout above your recent session average. ${topEntryName} drove ${Math.round(topEntryShare * 100)}% of the session load.`,
    };
  }

  if (topEntryShare >= 0.55) {
    return {
      title: `${topEntryName} clearly carried this session`,
      body: `${formatNumber(topEntryVolume)} volume came from that movement alone, making it the clearest drill-in point for this workout.`,
    };
  }

  if (workout.notes) {
    return {
      title: 'There is useful context saved with this session',
      body: `Open details to revisit the note and see how ${topEntryName} fit into the rest of the workout.`,
    };
  }

  if (workout.mood || workout.effort) {
    const contextParts = [workout.mood ? `Mood ${workout.mood}` : null, workout.effort ? `Effort ${workout.effort}` : null].filter(Boolean);
    return {
      title: 'Session context was logged here',
      body: `${contextParts.join(' • ')}. Review ${topEntryName} first if you want the clearest feel for how the day went.`,
    };
  }

  if (workout.splitId) {
    return {
      title: `${getSplitName(workout.splitId)} was completed cleanly`,
      body: `${workout.entries.length} ${workout.entries.length === 1 ? 'movement' : 'movements'} logged with ${topEntryName} as the clearest starting point for review.`,
    };
  }

  return {
    title: 'Clean custom session with a straightforward review path',
    body: `Open ${topEntryName} first, then scan the rest of the workout if you want the quick version.`,
  };
}

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
  const latestWorkout = sortedWorkouts[0] ?? null;
  const latestPrRecord = historyPrTimeline[0] ?? null;
  const initialSelectedDate =
    [...historyHeatmap].reverse().find((day) => day.count > 0)?.date ?? '';
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(initialSelectedDate);
  const [selectedHistoryPanel, setSelectedHistoryPanel] = useState(
    initialSelectedDate ? 'day' : 'prs',
  );
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState([]);
  const [openWorkoutActionId, setOpenWorkoutActionId] = useState('');
  const selectedDayWorkouts = useMemo(
    () => sortedWorkouts.filter((workout) => workout.date === selectedHistoryDate),
    [selectedHistoryDate, sortedWorkouts],
  );
  const latestWorkoutVolume = latestWorkout
    ? latestWorkout.entries.reduce((sum, entry) => sum + getEntryMetrics(entry).totalVolume, 0)
    : 0;
  const latestWorkoutSets = latestWorkout
    ? latestWorkout.entries.reduce((sum, entry) => sum + entry.sets.length, 0)
    : 0;
  const averageSessionVolume = useMemo(() => {
    if (!sortedWorkouts.length) {
      return 0;
    }

    const totalVolume = sortedWorkouts.reduce(
      (sum, workout) =>
        sum +
        workout.entries.reduce(
          (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
          0,
        ),
      0,
    );

    return totalVolume / sortedWorkouts.length;
  }, [getEntryMetrics, sortedWorkouts]);
  const selectedDayVolume = selectedDayWorkouts.reduce(
    (sum, workout) =>
      sum +
      workout.entries.reduce((entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume, 0),
    0,
  );
  const selectedDaySessionCount = selectedDayWorkouts.length;
  const groupedWorkouts = useMemo(() => {
    const groups = [];

    sortedWorkouts.forEach((workout) => {
      const existingGroup = groups.find((group) => group.date === workout.date);
      if (existingGroup) {
        existingGroup.workouts.push(workout);
        return;
      }

      groups.push({ date: workout.date, workouts: [workout] });
    });

    return groups.map((group) => {
      const dayVolume = group.workouts.reduce(
        (sum, workout) =>
          sum +
          workout.entries.reduce(
            (entrySum, entry) => entrySum + getEntryMetrics(entry).totalVolume,
            0,
          ),
        0,
      );
      const daySets = group.workouts.reduce(
        (sum, workout) =>
          sum + workout.entries.reduce((entrySum, entry) => entrySum + entry.sets.length, 0),
        0,
      );

      return {
        ...group,
        dayVolume,
        daySets,
      };
    });
  }, [getEntryMetrics, sortedWorkouts]);

  function toggleWorkoutDetails(workoutId) {
    setExpandedWorkoutIds((current) =>
      current.includes(workoutId)
        ? current.filter((id) => id !== workoutId)
        : [...current, workoutId],
    );
  }

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
            <div className="history-review-grid">
              <article className="history-review-card history-review-card-primary">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">Recent focus</p>
                    <h2>Latest session</h2>
                  </div>
                  {latestWorkout ? (
                    <span className="history-review-date">{formatDisplayDate(latestWorkout.date)}</span>
                  ) : null}
                </div>
                {latestWorkout ? (
                  <>
                    <div className="history-review-copy">
                      <strong>
                        {latestWorkout.splitId ? getSplitName(latestWorkout.splitId) : 'Custom workout'}
                      </strong>
                      <p>
                        {latestWorkout.entries.length}{' '}
                        {latestWorkout.entries.length === 1 ? 'exercise' : 'exercises'} logged across{' '}
                        {latestWorkoutSets} {latestWorkoutSets === 1 ? 'set' : 'sets'}.
                      </p>
                    </div>
                    <div className="history-review-metrics">
                      <div className="history-review-metric">
                        <span className="metric-label">Volume</span>
                        <strong>{formatNumber(latestWorkoutVolume)}</strong>
                        <p>Most recent session output</p>
                      </div>
                      <div className="history-review-metric">
                        <span className="metric-label">Moves</span>
                        <strong>{latestWorkout.entries.length}</strong>
                        <p>Active exercise list completed</p>
                      </div>
                      <div className="history-review-metric">
                        <span className="metric-label">Drill in</span>
                        <strong>
                          {latestWorkout.entries[0]
                            ? `Start at ${getExerciseName(latestWorkout.entries[0].exerciseId)}`
                            : 'Session details'}
                        </strong>
                        <p>Start with the first logged movement</p>
                      </div>
                    </div>
                    <div className="history-review-preview">
                      <span className="metric-label">At a glance</span>
                      <div className="tag-row">
                        {latestWorkout.entries.slice(0, 4).map((entry, index) => (
                          <span key={`latest-${latestWorkout.id}-${entry.exerciseId}-${index}`} className="history-meta-pill">
                            Move {index + 1}: {getExerciseName(entry.exerciseId)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="history-review-actions">
                      <button
                        type="button"
                        className="primary-button action-button"
                        onClick={() => {
                          setSelectedHistoryDate(latestWorkout.date);
                          setSelectedHistoryPanel('day');
                          setExpandedWorkoutIds((current) =>
                            current.includes(latestWorkout.id) ? current : [latestWorkout.id, ...current],
                          );
                        }}
                      >
                        Review latest session
                      </button>
                      <button
                        type="button"
                        className="ghost-button action-button"
                        onClick={() => startEditingWorkout(latestWorkout.id)}
                      >
                        Edit latest session
                      </button>
                    </div>
                  </>
                ) : null}
              </article>

              <article className="history-review-card history-review-card-compact">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">Review cues</p>
                    <h2>What matters next</h2>
                  </div>
                </div>
                <div className="history-review-section">
                  <div>
                    <p className="section-label">What mattered</p>
                    <h2>{latestPrRecord ? 'Recent win' : 'Recent rhythm'}</h2>
                  </div>
                  {latestPrRecord ? (
                    <div className="history-review-copy">
                      <strong>{getExerciseName(latestPrRecord.exerciseId)}</strong>
                      <p>
                        {latestPrRecord.labels.join(' • ')} on {formatDisplayDate(latestPrRecord.date)}.
                      </p>
                    </div>
                  ) : (
                    <div className="history-review-copy">
                      <strong>{activeDays} active days in the last 12 weeks</strong>
                      <p>
                        {totalSessions} sessions logged with a peak day of {formatNumber(peakVolume)} volume.
                      </p>
                    </div>
                  )}
                  <div className="history-review-compact-list">
                    {latestPrRecord ? (
                      <div className="tag-row">
                        {latestPrRecord.labels.map((label) => (
                          <span key={`latest-pr-${label}`} className="tag pr-tag">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className="history-meta-pill history-meta-pill-primary">{activeDays} active days</span>
                        <span className="history-meta-pill">{totalSessions} sessions</span>
                        <span className="history-meta-pill">
                          Peak {peakVolume ? formatNumber(peakVolume) : '0'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="history-review-section history-review-section-divided">
                  <div className="section-heading compact-heading">
                    <div>
                      <p className="section-label">Drill in next</p>
                      <h2>Review paths</h2>
                    </div>
                  </div>
                  <div className="history-review-copy">
                    <strong>
                      {selectedHistoryPanel === 'day'
                        ? selectedHistoryDate
                          ? formatDisplayDate(selectedHistoryDate)
                          : 'Pick a training day'
                        : 'Open recent wins'}
                    </strong>
                    <p>
                      Jump into one day for session review, or switch to PRs when you want the biggest changes first.
                    </p>
                  </div>
                  <div className="history-review-actions history-review-actions-stacked">
                    <button
                      type="button"
                      className="ghost-button action-button"
                      onClick={() => setSelectedHistoryPanel('day')}
                    >
                      Review selected day
                    </button>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      onClick={() => setSelectedHistoryPanel('prs')}
                    >
                      Open PR timeline
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div className="history-focus-grid">
              <article
                className={
                  selectedHistoryPanel === 'day'
                    ? 'history-insight-card history-insight-card-primary history-detail-card'
                    : 'history-insight-card history-detail-card history-detail-card-prs'
                }
              >
                <div className="section-heading compact-heading">
                  <div>
                    <p className="section-label">
                      {selectedHistoryPanel === 'day' ? 'Selected day' : 'PR timeline'}
                    </p>
                    <h2>{selectedHistoryPanel === 'day' ? formatDisplayDate(selectedHistoryDate) : 'Recent wins'}</h2>
                  </div>
                  <div className="history-panel-switcher" role="group" aria-label="History detail panel">
                    <button
                      type="button"
                      className={
                        selectedHistoryPanel === 'day'
                          ? 'view-button active range-button'
                          : 'view-button range-button'
                      }
                      onClick={() => setSelectedHistoryPanel('day')}
                    >
                      Day
                    </button>
                    <button
                      type="button"
                      className={
                        selectedHistoryPanel === 'prs'
                          ? 'view-button active range-button'
                          : 'view-button range-button'
                      }
                      onClick={() => setSelectedHistoryPanel('prs')}
                    >
                      PRs
                    </button>
                  </div>
                </div>
                <div className="history-detail-hero">
                  {selectedHistoryPanel === 'day' ? (
                    selectedHistoryDate && selectedDayWorkouts.length ? (
                      <>
                        <div className="history-detail-copy">
                          <span className="metric-label">Review lens</span>
                          <strong>{selectedDaySessionCount} {selectedDaySessionCount === 1 ? 'session' : 'sessions'} on this day</strong>
                          <p>
                            {formatNumber(selectedDayVolume)} total volume. Start with the highest-output workout if you want the quickest recap.
                          </p>
                        </div>
                        <div className="history-review-compact-list">
                          <span className="history-meta-pill history-meta-pill-primary">
                            {selectedDaySessionCount} {selectedDaySessionCount === 1 ? 'session' : 'sessions'}
                          </span>
                          <span className="history-meta-pill">Vol {formatNumber(selectedDayVolume)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="history-detail-copy">
                        <span className="metric-label">Review lens</span>
                        <strong>Choose a highlighted day</strong>
                        <p>Pick a training day in the calendar to open its workouts and session summaries.</p>
                      </div>
                    )
                  ) : latestPrRecord ? (
                    <>
                      <div className="history-detail-copy">
                        <span className="metric-label">Review lens</span>
                        <strong>{getExerciseName(latestPrRecord.exerciseId)} leads the latest wins</strong>
                        <p>
                          Start here when you want the biggest meaningful changes before scanning the rest of the timeline.
                        </p>
                      </div>
                      <div className="history-review-compact-list">
                        {latestPrRecord.labels.slice(0, 2).map((label) => (
                          <span key={`detail-${label}`} className="tag pr-tag">
                            {label}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="history-detail-copy">
                      <span className="metric-label">Review lens</span>
                      <strong>No PR timeline yet</strong>
                      <p>Keep logging sessions and this panel will surface the biggest changes first.</p>
                    </div>
                  )}
                </div>
                {selectedHistoryPanel === 'day' ? (
                  selectedHistoryDate && selectedDayWorkouts.length ? (
                    <div className="history-day-workouts">
                      {selectedDayWorkouts
                        .slice()
                        .sort((a, b) => {
                          const volumeA = a.entries.reduce(
                            (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
                            0,
                          );
                          const volumeB = b.entries.reduce(
                            (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
                            0,
                          );

                          return volumeB - volumeA;
                        })
                        .map((workout) => {
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
                  )
                ) : historyPrTimeline.length ? (
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

              <article className="history-insight-card history-calendar-card">
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
                      onClick={() => {
                        setSelectedHistoryDate(day.date);
                        setSelectedHistoryPanel('day');
                      }}
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
            </div>

            {groupedWorkouts.map((group) => {
              return (
                <section key={group.date} className="history-day-group">
                  <div className="history-day-group-header">
                    <div>
                      <p className="section-label">Day review</p>
                      <h3>{formatDisplayDate(group.date)}</h3>
                    </div>
                    <div className="history-review-compact-list">
                      <span className="history-meta-pill history-meta-pill-primary">
                        {group.workouts.length} {group.workouts.length === 1 ? 'session' : 'sessions'}
                      </span>
                      <span className="history-meta-pill">Vol {formatNumber(group.dayVolume)}</span>
                      <span className="history-meta-pill">Sets {group.daySets}</span>
                    </div>
                  </div>

                  <div className="history-day-group-list">
                    {group.workouts.map((workout) => {
              const sessionVolume = workout.entries.reduce(
                (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
                0,
              );
              const sessionSets = workout.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
              const isExpanded = expandedWorkoutIds.includes(workout.id);
              const visibleEntries = isExpanded ? workout.entries : workout.entries.slice(0, 2);
              const hiddenEntryCount = workout.entries.length - visibleEntries.length;
              const sessionPreview = workout.entries
                .slice(0, 3)
                .map((entry) => getExerciseName(entry.exerciseId))
                .join(' • ');
              const topEntry = workout.entries.reduce((bestEntry, entry) => {
                if (!bestEntry) {
                  return entry;
                }

                return getEntryMetrics(entry).totalVolume > getEntryMetrics(bestEntry).totalVolume
                  ? entry
                  : bestEntry;
              }, null);
              const topEntryName = topEntry ? getExerciseName(topEntry.exerciseId) : 'the first movement';
              const topEntryVolume = topEntry ? getEntryMetrics(topEntry).totalVolume : 0;
              const topEntryShare = sessionVolume > 0 ? topEntryVolume / sessionVolume : 0;
              const isLatestWorkout = latestWorkout?.id === workout.id;
              const sessionSignal = getSessionSignal(
                workout,
                sessionVolume,
                averageSessionVolume,
                isLatestWorkout,
              );
              const sessionStory = getSessionStory({
                workout,
                sessionVolume,
                sessionSets,
                topEntryName,
                topEntryVolume,
                topEntryShare,
                averageSessionVolume,
                isLatest: isLatestWorkout,
                formatNumber,
                getSplitName,
              });
              const sessionCardClassName = [
                'workout-card',
                'history-workout-card',
                sessionSignal.tone === 'accent' ? 'history-workout-card-featured' : '',
                sessionSignal.tone === 'support' ? 'history-workout-card-support' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <article key={workout.id} className={sessionCardClassName}>
                  <div className="workout-card-header">
                    <div className="workout-card-title history-card-title">
                      <strong>{formatDisplayDate(workout.date)}</strong>
                      {workout.splitId ? <span>{getSplitName(workout.splitId)}</span> : null}
                      <span>{workout.entries.length} exercises</span>
                    </div>
                    <div className="history-actions">
                      <span className={`history-session-signal history-session-signal-${sessionSignal.tone}`}>
                        {sessionSignal.label}
                      </span>
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
                        aria-label={`More actions for workout from ${formatDisplayDate(workout.date)}`}
                        aria-expanded={openWorkoutActionId === workout.id}
                        onClick={() =>
                          setOpenWorkoutActionId((current) => (current === workout.id ? '' : workout.id))
                        }
                      >
                        More
                      </button>
                      {openWorkoutActionId === workout.id ? (
                        <div className="history-more-actions">
                          <button
                            type="button"
                            className="ghost-button action-button"
                            aria-label={`Save workout from ${formatDisplayDate(workout.date)} as a template`}
                            onClick={() => {
                              setOpenWorkoutActionId('');
                              saveWorkoutAsTemplate(workout.id);
                            }}
                          >
                            Save template
                          </button>
                          <button
                            type="button"
                            className="ghost-button action-button"
                            aria-label={`Use workout from ${formatDisplayDate(workout.date)} as a split template`}
                            onClick={() => {
                              setOpenWorkoutActionId('');
                              createSplitFromWorkout(workout.id);
                            }}
                          >
                            Use as split
                          </button>
                          <button
                            type="button"
                            className="ghost-button action-button danger-button"
                            aria-label={`Delete workout from ${formatDisplayDate(workout.date)}`}
                            onClick={() => {
                              setOpenWorkoutActionId('');
                              deleteWorkout(workout.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="history-meta-row">
                    <span className="history-meta-pill history-meta-pill-primary">
                      Volume {formatNumber(sessionVolume)}
                    </span>
                    <span className="history-meta-pill">Sets {sessionSets}</span>
                    <span className="history-meta-pill">Moves {workout.entries.length}</span>
                    {workout.mood ? <span className="history-meta-pill">Mood {workout.mood}</span> : null}
                    {workout.effort ? <span className="history-meta-pill">Effort {workout.effort}</span> : null}
                  </div>
                  <div className="history-session-story">
                    <div className="history-session-story-copy">
                      <span className="metric-label">What mattered</span>
                      <strong>{sessionStory.title}</strong>
                      <p>{sessionStory.body}</p>
                    </div>
                      <div className="history-review-compact-list">
                        <span className="history-meta-pill history-meta-pill-primary">Top move {topEntryName}</span>
                        {topEntryShare >= 0.55 ? (
                          <span className="history-meta-pill">Focus {Math.round(topEntryShare * 100)}%</span>
                        ) : null}
                        {workout.notes ? <span className="history-meta-pill">Note saved</span> : null}
                      </div>
                  </div>
                  <div className="history-session-overview">
                    <div className="history-session-overview-copy">
                      <span className="metric-label">{isExpanded ? 'Expanded review' : 'Review path'}</span>
                      <p>
                        {workout.entries.length === 1
                          ? `Start with ${getExerciseName(workout.entries[0].exerciseId)}`
                          : `${sessionPreview}${workout.entries.length > 3 ? ' • More in details' : ''}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ghost-button action-button"
                      aria-label={`${isExpanded ? 'Hide' : 'Show'} details for workout from ${formatDisplayDate(workout.date)}`}
                      onClick={() => toggleWorkoutDetails(workout.id)}
                    >
                      {isExpanded ? 'Hide details' : 'Details'}
                    </button>
                  </div>
                  {isExpanded && workout.notes ? (
                    <div className="history-session-note">
                      <span className="section-label">Session note</span>
                      <p>{workout.notes}</p>
                    </div>
                  ) : null}
                  <div className="workout-entry-list">
                    {visibleEntries.map((entry) => {
                      const metrics = getEntryMetrics(entry);

                      return (
                        <div key={`${workout.id}-${entry.exerciseId}`} className="history-entry">
                          <div className="history-entry-header">
                            <div>
                              <h3>{getExerciseName(entry.exerciseId)}</h3>
                              <p>
                                {entry.sets.length} sets logged
                                {isExpanded ? ` • ${formatNumber(metrics.totalVolume)} volume from this movement` : ''}
                              </p>
                            </div>
                            <div className="activity-metrics history-entry-metrics">
                              <span>Wt {formatNumber(metrics.bestWeight)}</span>
                              <span>Rp {formatNumber(metrics.bestReps)}</span>
                              <span>Vol {formatNumber(metrics.totalVolume)}</span>
                            </div>
                          </div>
                          {isExpanded ? (
                            <>
                              <div className="history-entry-story">
                                <span className="metric-label">Exercise review</span>
                                <p>
                                  Best weight {formatNumber(metrics.bestWeight)} • Best reps {formatNumber(metrics.bestReps)} • Total volume {formatNumber(metrics.totalVolume)}.
                                </p>
                              </div>
                              <ul className="set-list compact-set-list history-set-inline-list">
                                {entry.sets.map((set, index) => (
                                  <li key={`${workout.id}-${entry.exerciseId}-${index}`}>
                                    Set {index + 1}: {formatNumber(set.weight)} × {formatNumber(set.reps)}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                    {!isExpanded && hiddenEntryCount > 0 ? (
                      <div className="history-entry history-entry-more">
                        <p>
                          +{hiddenEntryCount} more {hiddenEntryCount === 1 ? 'movement' : 'movements'} hidden until you open details.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
                    })}
                  </div>
                </section>
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
