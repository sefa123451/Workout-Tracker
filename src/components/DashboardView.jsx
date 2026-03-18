import React from 'react';
import EmptyState from './EmptyState.jsx';
import StatCard from './StatCard.jsx';

export default function DashboardView({
  exercises,
  splits,
  templates,
  workouts,
  totalSetsLogged,
  dashboardSummary,
  latestWorkout,
  getSplitName,
  getExerciseName,
  formatDisplayDate,
  formatNumber,
  getEntryMetrics,
  dataMessage,
  exportAppData,
  fileInputRef,
  handleImportFile,
  startWorkoutFromSplit,
  repeatLatestWorkout,
  loadWorkoutTemplate,
  lastUsedTemplate,
  startWorkoutFromLastUsedTemplate,
}) {
  const focusTitle = latestWorkout ? getSplitName(latestWorkout.splitId) : 'Next session';
  const focusSubtitle = latestWorkout
    ? `${latestWorkout.entries.length} ${latestWorkout.entries.length === 1 ? 'exercise' : 'exercises'}`
    : 'Build your next workout';
  const focusMeta = latestWorkout
    ? formatDisplayDate(latestWorkout.date)
    : dashboardSummary.lastTrainingDay
      ? formatDisplayDate(dashboardSummary.lastTrainingDay)
      : 'No recent session';
  const currentSplitName = latestWorkout ? getSplitName(latestWorkout.splitId) : '--';
  const latestWorkoutVolume = latestWorkout
    ? latestWorkout.entries.reduce(
        (sum, entry) => sum + getEntryMetrics(entry).totalVolume,
        0,
      )
    : 0;
  const weeklyTrendMax = Math.max(
    ...dashboardSummary.weeklyVolumeTrend.map((day) => day.volume),
    1,
  );
  const suggestedSplitId =
    latestWorkout?.splitId && latestWorkout.splitId !== ''
      ? latestWorkout.splitId
      : splits[0]?.id ?? '';
  const suggestedSplitName = suggestedSplitId ? getSplitName(suggestedSplitId) : '';
  const volumeDeltaPositive = dashboardSummary.volumeDeltaVsLastWeek >= 0;
  const workoutDeltaPositive = dashboardSummary.workoutDeltaVsLastWeek >= 0;
  const heatmapActiveDays = dashboardSummary.trainingHeatmap.filter((day) => day.count > 0).length;
  const heatmapSessionCount = dashboardSummary.trainingHeatmap.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const heatmapPeakVolume = dashboardSummary.trainingHeatmap.reduce(
    (peak, day) => Math.max(peak, day.volume),
    0,
  );
  const splitInsightPrimary = dashboardSummary.topSplitThisMonth
    ? {
        title: getSplitName(dashboardSummary.topSplitThisMonth.splitId),
        value: `${formatNumber(dashboardSummary.topSplitThisMonth.volume)}`,
        helper: `${dashboardSummary.topSplitThisMonth.count} ${dashboardSummary.topSplitThisMonth.count === 1 ? 'session' : 'sessions'} this month`,
      }
    : null;
  const splitInsightSecondary = dashboardSummary.mostUsedSplit
    ? {
        title: getSplitName(dashboardSummary.mostUsedSplit.splitId),
        value: String(dashboardSummary.mostUsedSplit.count),
        helper: 'Most logged split',
      }
    : null;

  return (
    <main className="content-grid dashboard-grid">
      <section className="panel dashboard-panel dashboard-main-panel">
        <div className="dashboard-hero-card">
          <div className="dashboard-hero-copy">
            <p className="section-label">Weekly focus</p>
            <h2 className="dashboard-hero-title">
              {dashboardSummary.workoutsThisWeek
                ? (
                  <>
                    <span>
                      {dashboardSummary.workoutsThisWeek} workout
                      {dashboardSummary.workoutsThisWeek === 1 ? '' : 's'}
                    </span>
                    <span>in motion</span>
                  </>
                )
                : 'Ready for a fresh week'}
            </h2>
            <p className="dashboard-hero-text">
              {dashboardSummary.totalVolumeThisWeek
                ? `${formatNumber(dashboardSummary.totalVolumeThisWeek)} total volume so far`
                : 'Log a session to bring this dashboard to life'}
            </p>
          </div>
          <div className="dashboard-hero-metrics">
            <div className="hero-mini-stat">
              <span>Volume</span>
              <strong>{formatNumber(dashboardSummary.totalVolumeThisWeek)}</strong>
            </div>
            <div className="hero-mini-stat">
              <span>Avg session</span>
              <strong>
                {dashboardSummary.workoutsThisWeek
                  ? formatNumber(dashboardSummary.averageVolumeThisWeek)
                  : '--'}
              </strong>
            </div>
          </div>
        </div>
        <div className="weekly-trend-card">
          <div className="weekly-trend-header">
            <div>
              <p className="section-label">Weekly trend</p>
              <h3>Volume by day</h3>
            </div>
            <span>{formatNumber(dashboardSummary.totalVolumeThisWeek)}</span>
          </div>
          <div className="weekly-trend-bars" aria-label="Weekly volume trend">
            {dashboardSummary.weeklyVolumeTrend.map((day) => (
              <div key={day.date} className="weekly-trend-bar-group">
                <div className="weekly-trend-rail">
                  <div
                    className="weekly-trend-bar"
                    style={{ height: `${Math.max((day.volume / weeklyTrendMax) * 100, day.volume ? 14 : 6)}%` }}
                  />
                </div>
                <strong>{formatNumber(day.volume)}</strong>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-heatmap-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-label">Training calendar</p>
              <h2>Last 28 days</h2>
            </div>
            <div className="dashboard-heatmap-meta">
              <span>{heatmapActiveDays} active days</span>
              <span>{heatmapSessionCount} sessions</span>
              <span>{heatmapPeakVolume ? `${formatNumber(heatmapPeakVolume)} peak` : 'No peak yet'}</span>
            </div>
          </div>
          <div className="dashboard-heatmap-grid" aria-label="Training heatmap">
            {dashboardSummary.trainingHeatmap.map((day) => (
              <div
                key={day.date}
                className={`dashboard-heatmap-cell level-${day.level}`}
                title={`${formatDisplayDate(day.date)} • ${day.count} ${day.count === 1 ? 'session' : 'sessions'} • ${formatNumber(day.volume)} volume`}
                aria-label={`${formatDisplayDate(day.date)} with ${day.count} ${day.count === 1 ? 'session' : 'sessions'}`}
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
        </div>

        <div className="dashboard-stat-stack">
          <div className="dashboard-lower-grid">
            <div className="stats-grid stats-grid-featured">
              <StatCard
                label="Volume this week"
                value={formatNumber(dashboardSummary.totalVolumeThisWeek)}
                className="stat-card-hero stat-card-accent"
                helper={dashboardSummary.workoutsThisWeek ? 'This week' : 'No workouts yet'}
              />
              <StatCard
                label="Workouts this week"
                value={String(dashboardSummary.workoutsThisWeek)}
                className="stat-card-hero"
                helper={dashboardSummary.workoutsThisWeek ? 'This week' : 'No workouts yet'}
              />
            </div>

            <div className="stats-grid stats-grid-support">
              <StatCard
                label="Last training day"
                className="stat-card-support"
                value={
                  dashboardSummary.lastTrainingDay
                    ? formatDisplayDate(dashboardSummary.lastTrainingDay)
                    : '--'
                }
                helper={dashboardSummary.lastTrainingDay ? 'Latest' : 'No workouts yet'}
              />
              <StatCard
                label="Most trained exercise"
                className="stat-card-support"
                value={
                  dashboardSummary.mostTrainedExercise
                    ? getExerciseName(dashboardSummary.mostTrainedExercise.exerciseId)
                    : '--'
                }
                helper={
                  dashboardSummary.mostTrainedExercise
                    ? `${dashboardSummary.mostTrainedExercise.count} entries`
                    : 'No history yet'
                }
              />
              <StatCard
                label="Current split"
                className="stat-card-support"
                value={currentSplitName}
                helper={latestWorkout ? 'Latest session' : 'No split yet'}
              />
            </div>

            <div className="stats-grid stats-grid-secondary">
              <StatCard
                label="Exercises"
                className="stat-card-compact"
                value={String(exercises.length)}
                helper={exercises.length ? 'Library' : 'Empty'}
              />
              <StatCard
                label="Workouts"
                className="stat-card-compact"
                value={String(workouts.length)}
                helper={workouts.length ? 'All time' : 'Empty'}
              />
              <StatCard
                label="Sets logged"
                className="stat-card-compact"
                value={String(totalSetsLogged)}
                helper={totalSetsLogged ? 'All time' : 'Empty'}
              />
              <StatCard
                label="PR hits"
                className="stat-card-compact"
                value={String(dashboardSummary.recentPrHits)}
                helper={dashboardSummary.recentPrHits ? 'Last 30 days' : 'No recent PRs'}
              />
            </div>
          </div>

        </div>
        <div className="data-actions dashboard-actions">
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

      <div className="dashboard-side-stack">
        <section className="panel panel-highlight dashboard-focus-panel">
          <div className="dashboard-focus-card">
            <div className="dashboard-focus-topline">
              <p className="section-label">Current focus</p>
              <span className="dashboard-focus-badge">{focusMeta}</span>
            </div>
            <h2>{focusTitle}</h2>
            <p className="dashboard-focus-copy">{focusSubtitle}</p>
            <div className="dashboard-focus-stats">
              <div>
                <span>Exercises</span>
                <strong>{latestWorkout ? latestWorkout.entries.length : exercises.length}</strong>
              </div>
              <div>
                <span>Workouts</span>
                <strong>{workouts.length}</strong>
              </div>
              <div>
                <span>Sets</span>
                <strong>{totalSetsLogged}</strong>
              </div>
            </div>
            <div className="actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => startWorkoutFromSplit(suggestedSplitId)}
              >
                {suggestedSplitId ? `Start ${suggestedSplitName}` : 'Start custom workout'}
              </button>
              {latestWorkout && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={repeatLatestWorkout}
                >
                  Repeat last workout
                </button>
              )}
              {lastUsedTemplate && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={startWorkoutFromLastUsedTemplate}
                >
                  Start last template
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="panel panel-highlight">
          <div className="section-heading">
            <div>
              <p className="section-label">Momentum</p>
              <h2>This week vs last</h2>
            </div>
          </div>
          <div className="dashboard-momentum-card">
            <div className="dashboard-momentum-grid">
              <div className="dashboard-momentum-stat">
                <span>Volume</span>
                <strong>
                  {volumeDeltaPositive ? '+' : ''}
                  {formatNumber(dashboardSummary.volumeDeltaVsLastWeek)}
                </strong>
                <p>
                  {formatNumber(dashboardSummary.totalVolumeThisWeek)} this week
                  {' • '}
                  {formatNumber(dashboardSummary.totalVolumeLastWeek)} last week
                </p>
              </div>
              <div className="dashboard-momentum-stat">
                <span>Sessions</span>
                <strong>
                  {workoutDeltaPositive ? '+' : ''}
                  {dashboardSummary.workoutDeltaVsLastWeek}
                </strong>
                <p>
                  {dashboardSummary.workoutsThisWeek} this week
                  {' • '}
                  {dashboardSummary.workoutsLastWeek} last week
                </p>
              </div>
            </div>
            <div className="dashboard-momentum-meta">
              <span>
                PRs this week <strong>{dashboardSummary.currentWeekPrHits}</strong>
              </span>
              <span>
                Best day{' '}
                <strong>
                  {dashboardSummary.bestTrainingDayLabel || '--'}
                  {dashboardSummary.bestTrainingDayVolume
                    ? ` • ${formatNumber(dashboardSummary.bestTrainingDayVolume)}`
                    : ''}
                </strong>
              </span>
            </div>
          </div>
        </section>

        <section className="panel panel-highlight">
          <div className="section-heading">
            <div>
              <p className="section-label">Consistency</p>
              <h2>Keep the rhythm</h2>
            </div>
          </div>
          <div className="dashboard-consistency-card">
            <div className="dashboard-consistency-top">
              <div className="dashboard-consistency-stat">
                <span>Active weeks</span>
                <strong>{dashboardSummary.activeWeekStreak}</strong>
                <p>{dashboardSummary.activeWeekStreak === 1 ? 'week in a row' : 'weeks in a row'}</p>
              </div>
              <div className="dashboard-consistency-stat">
                <span>Best run</span>
                <strong>{dashboardSummary.longestActiveWeekStreak}</strong>
                <p>{dashboardSummary.longestActiveWeekStreak === 1 ? 'week best' : 'weeks best'}</p>
              </div>
            </div>
            <div className="dashboard-consistency-meta">
              <span>
                This month <strong>{dashboardSummary.workoutsThisMonth} workouts</strong>
              </span>
              <span>
                Month volume <strong>{formatNumber(dashboardSummary.totalVolumeThisMonth)}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="panel panel-highlight">
          <div className="section-heading">
            <div>
              <p className="section-label">Split insights</p>
              <h2>Templates that carry you</h2>
            </div>
          </div>
          <div className="dashboard-split-insights-card">
            <div className="dashboard-split-insight dashboard-split-insight-primary">
              <div className="dashboard-split-insight-top">
                <span className="metric-label">Top split this month</span>
                <span className="dashboard-split-insight-value">
                  {splitInsightPrimary ? splitInsightPrimary.value : '--'}
                </span>
              </div>
              <strong>{splitInsightPrimary ? splitInsightPrimary.title : '--'}</strong>
              <p>
                {splitInsightPrimary
                  ? `${splitInsightPrimary.helper}`
                  : 'Log more split-based workouts to surface a monthly leader.'}
              </p>
            </div>
            <div className="dashboard-split-insight dashboard-split-insight-secondary">
              <div className="dashboard-split-insight-top">
                <span className="metric-label">Most used overall</span>
                <span className="dashboard-split-insight-value">
                  {splitInsightSecondary ? splitInsightSecondary.value : '--'}
                </span>
              </div>
              <strong>{splitInsightSecondary ? splitInsightSecondary.title : '--'}</strong>
              <p>
                {splitInsightSecondary
                  ? 'Logged more often than every other split'
                  : 'Your history has no recurring split yet.'}
              </p>
            </div>
          </div>
        </section>

        <section className="panel panel-highlight">
          <div className="section-heading">
            <div>
              <p className="section-label">Quick templates</p>
              <h2>Reuse a session</h2>
            </div>
          </div>
          {templates.length ? (
            <div className="dashboard-template-list">
              {templates.slice(0, 3).map((template) => (
                <article key={template.id} className="dashboard-template-card">
                  <div>
                    <strong>{template.name}</strong>
                    <p>
                      {template.entries.length} {template.entries.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                    {lastUsedTemplate?.id === template.id && <p>Last used</p>}
                  </div>
                  <button
                    type="button"
                    className="ghost-button action-button"
                    onClick={() => loadWorkoutTemplate(template.id)}
                  >
                    Use template
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No templates yet"
              body="Save one workout as a template to reuse it here."
            />
          )}
        </section>

        <section className="panel panel-highlight">
          <div className="section-heading">
            <div>
              <p className="section-label">Recent wins</p>
              <h2>Latest PRs</h2>
            </div>
          </div>
          {dashboardSummary.latestPersonalRecords.length ? (
            <div className="dashboard-wins-list">
              {dashboardSummary.latestPersonalRecords.map((record) => (
                <article
                  key={`${record.exerciseId}-${record.date}-${record.labels.join('-')}`}
                  className="dashboard-win-card"
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
              title="No recent PRs"
              body="Keep logging to surface fresh wins here."
            />
          )}
        </section>

        <section className="panel panel-highlight">
          <div className="section-heading">
            <div>
              <p className="section-label">Recent activity</p>
              <h2>Latest session</h2>
            </div>
          </div>
          {latestWorkout ? (
            <article className="workout-card latest-workout-card">
              <div className="workout-card-header">
                <div>
                  <strong>{formatDisplayDate(latestWorkout.date)}</strong>
                  <p className="activity-subtitle">Recent session</p>
                </div>
                <div className="workout-card-title">
                  {latestWorkout.splitId ? <span>{getSplitName(latestWorkout.splitId)}</span> : null}
                  <span>{latestWorkout.entries.length} exercises</span>
                </div>
              </div>
              <div className="activity-highlight-row">
                <div className="activity-highlight-stat">
                  <span>Volume</span>
                  <strong>{formatNumber(latestWorkoutVolume)}</strong>
                </div>
                <div className="activity-highlight-stat">
                  <span>Moves</span>
                  <strong>{latestWorkout.entries.length}</strong>
                </div>
              </div>
              <div className="workout-entry-list latest-workout-list">
                {latestWorkout.entries.map((entry) => {
                  const metrics = getEntryMetrics(entry);

                  return (
                    <div
                      key={`${latestWorkout.id}-${entry.exerciseId}`}
                      className="history-entry latest-activity-entry"
                    >
                      <div>
                        <h3>{getExerciseName(entry.exerciseId)}</h3>
                        <div className="activity-metrics">
                          <span>Wt {formatNumber(metrics.bestWeight)}</span>
                          <span>Rp {formatNumber(metrics.bestReps)}</span>
                          <span>Vol {formatNumber(metrics.totalVolume)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : (
            <EmptyState
              title="No workouts yet"
              body="Log your first session to fill the dashboard."
            />
          )}
        </section>
      </div>
    </main>
  );
}
