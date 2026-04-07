import React from 'react';

function DashboardGuidanceState({
  label,
  title,
  body,
  points = [],
  compact = false,
  variant = 'accent',
}) {
  return (
    <div
      className={[
        'db-guidance-state',
        `db-guidance-state-${variant}`,
        compact ? 'db-guidance-state-compact' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="db-guidance-label">{label}</span>
      <strong>{title}</strong>
      <p>{body}</p>
      {points.length ? (
        <div className="db-guidance-points">
          {points.map((point) => (
            <span key={point} className="db-guidance-pill">{point}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DashboardHeroPath({
  latestWorkout,
  suggestedSplitId,
  suggestedSplitName,
  weeklyWorkoutGoal,
  dashboardSummary,
  formatDisplayDate,
  startWorkoutFromSplit,
  repeatLatestWorkout,
  lastUsedTemplate,
  startWorkoutFromLastUsedTemplate,
  latestWorkoutSplitName,
  hasAnyTemplates,
  hasAnySplits,
}) {
  const isFirstSession = !latestWorkout;
  const heroTitle = isFirstSession
    ? suggestedSplitId
      ? `Start ${suggestedSplitName} as your first session`
      : lastUsedTemplate
        ? 'Start with your saved template'
        : 'Start your first workout'
    : suggestedSplitId
      ? `Start ${suggestedSplitName} now`
      : lastUsedTemplate
        ? 'Jump back into training'
        : 'Start your next workout';
  const recommendedPathLabel = suggestedSplitId
    ? suggestedSplitName
    : lastUsedTemplate
      ? lastUsedTemplate.name
      : 'Custom workout';
  const recommendationBody = suggestedSplitId
    ? `Stay on your recent split rotation and keep this week moving with ${suggestedSplitName}.`
    : lastUsedTemplate
      ? 'Reuse your last saved template for the fastest way back into training.'
      : 'No split or template is leading right now, so a clean custom session is the fastest path.';
  const heroBody = latestWorkout
    ? `${formatDisplayDate(latestWorkout.date)} was your last session${latestWorkoutSplitName ? ` on ${latestWorkoutSplitName}` : ''}. ${recommendationBody}`
    : hasAnySplits
      ? `${recommendationBody} One complete session is enough to turn this into a real training week.`
      : hasAnyTemplates
        ? `${recommendationBody} Your saved template is the easiest way to put the first session on the board.`
        : 'Start with a simple custom workout. One complete session is enough to turn this dashboard into a real training week.';
  const weekFocusLabel = dashboardSummary.weeklyGoalReached
    ? 'Goal complete'
    : `${dashboardSummary.weeklyGoalRemaining} session${dashboardSummary.weeklyGoalRemaining === 1 ? '' : 's'} left`;
  const weekFocusBody = dashboardSummary.bestTrainingDayLabel
    ? `Best day: ${dashboardSummary.bestTrainingDayLabel}`
    : isFirstSession
      ? 'Use today to set the pace'
      : 'Keep the streak moving';
  const weekStatusTitle = dashboardSummary.weeklyGoalReached
    ? 'Week goal complete'
    : dashboardSummary.workoutsThisWeek === 0
      ? 'Week just started'
      : 'Week in progress';
  const weekStatusBody = dashboardSummary.weeklyGoalReached
    ? 'You already hit the weekly target. Any extra session this week is a bonus.'
    : dashboardSummary.workoutsThisWeek === 0
      ? `${dashboardSummary.daysRemainingThisWeek} day${dashboardSummary.daysRemainingThisWeek === 1 ? '' : 's'} left to get this week moving toward ${weeklyWorkoutGoal} sessions.`
      : `Need ${dashboardSummary.weeklyGoalRemaining} more session${dashboardSummary.weeklyGoalRemaining === 1 ? '' : 's'} across ${dashboardSummary.daysRemainingThisWeek === 0 ? 'today' : `${dashboardSummary.daysRemainingThisWeek} day${dashboardSummary.daysRemainingThisWeek === 1 ? '' : 's'} left`}.`;

  return (
    <section className="db-hero-path">
      <article className="db-card db-card-hero db-hero-surface">
        <div className="db-hero-main">
          <div className="db-hero-action">
            <div className="db-card-hero-top">
              <div>
                <span className="db-label">Recommended next workout</span>
                <h2 className="db-card-hero-title">{heroTitle}</h2>
              </div>
              <span className="db-badge">{isFirstSession ? 'First step' : 'Recommended'}</span>
            </div>
            <p className="db-card-hero-sub">{heroBody}</p>
            <div className="db-action-buttons db-hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => startWorkoutFromSplit(suggestedSplitId)}
              >
                {suggestedSplitId ? `Start ${suggestedSplitName}` : 'Start workout'}
              </button>
              {latestWorkout && (
                <button type="button" className="ghost-button" onClick={repeatLatestWorkout}>
                  Repeat last workout
                </button>
              )}
              {lastUsedTemplate && (
                <button type="button" className="ghost-button" onClick={startWorkoutFromLastUsedTemplate}>
                  Start last template
                </button>
              )}
            </div>
          </div>

          <div className="db-hero-status-panel">
            <div className="db-card-header">
              <div>
                <span className="db-label">This week</span>
                <h3 className="db-card-title">{weekStatusTitle}</h3>
              </div>
              <span className="db-meta-pill">
                {dashboardSummary.weeklyGoalStatus}
              </span>
            </div>
            <p className="db-card-sub">{weekStatusBody}</p>
            <div
              className="db-goal-progress"
              role="progressbar"
              aria-label="Weekly goal progress"
              aria-valuemin="0"
              aria-valuemax={weeklyWorkoutGoal}
              aria-valuenow={Math.min(dashboardSummary.workoutsThisWeek, weeklyWorkoutGoal)}
            >
              <div
                className="db-goal-progress-fill"
                style={{ width: `${dashboardSummary.weeklyGoalProgress * 100}%` }}
              />
            </div>
            <div className="db-goal-meta-grid">
              <div className="db-goal-meta-item">
                <span>Completed</span>
                <strong>{dashboardSummary.workoutsThisWeek}</strong>
              </div>
              <div className="db-goal-meta-item">
                <span>Remaining</span>
                <strong>{dashboardSummary.weeklyGoalRemaining}</strong>
              </div>
              <div className="db-goal-meta-item">
                <span>Week left</span>
                <strong>{dashboardSummary.daysRemainingThisWeek}d</strong>
              </div>
            </div>
            <div className="db-hero-cues db-hero-cues-compact">
              <div>
                <span>Recommended path</span>
                <strong>{recommendedPathLabel}</strong>
                <p>{suggestedSplitId ? 'Best match for your current rotation' : lastUsedTemplate ? 'Fastest saved setup' : 'Build fresh from scratch'}</p>
              </div>
              <div>
                <span>{isFirstSession ? 'What unlocks' : 'Last session'}</span>
                <strong>{latestWorkout ? formatDisplayDate(latestWorkout.date) : 'Session recap'}</strong>
                <p>{latestWorkout ? latestWorkoutSplitName || 'Custom workout' : 'Exercises, top sets, and total volume land here after workout 1.'}</p>
              </div>
              <div>
                <span>Week focus</span>
                <strong>{weekFocusLabel}</strong>
                <p>{weekFocusBody}</p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function DashboardWeekSupportCard({
  dashboardSummary,
  weeklyWorkoutGoal,
  suggestedSplitName,
  lastUsedTemplate,
  hasWeeklySplitPlan,
  getSplitName,
  formatNumber,
}) {
  const weekSupportTitle = dashboardSummary.weeklyGoalReached
    ? 'Goal locked in'
    : dashboardSummary.workoutsThisWeek === 0
      ? 'Week still open'
      : 'Keep the week on track';
  const weekSupportBody = dashboardSummary.weeklyGoalReached
    ? 'You already hit your weekly session goal. Use the rest of the week for quality sessions or recovery.'
    : dashboardSummary.workoutsThisWeek === 0
      ? `Pick one workout path and get the week on the board.`
      : `You still need ${dashboardSummary.weeklyGoalRemaining} session${dashboardSummary.weeklyGoalRemaining === 1 ? '' : 's'} to reach ${weeklyWorkoutGoal}.`;

  return (
    <section className="db-card db-card-priority-support">
      <div className="db-card-header">
        <div>
          <span className="db-label">Week plan</span>
          <h3 className="db-card-title">{weekSupportTitle}</h3>
        </div>
        <span className="db-meta-pill">
          {dashboardSummary.daysRemainingThisWeek === 0
            ? 'Last day'
            : `${dashboardSummary.daysRemainingThisWeek}d left`}
        </span>
      </div>
      <p className="db-card-sub">{weekSupportBody}</p>

      {hasWeeklySplitPlan ? (
        <div className="db-split-plan-list">
          {dashboardSummary.weeklySplitPlan.map((item) => (
            <div key={item.splitId} className="db-split-plan-item">
              <div>
                <strong>{getSplitName(item.splitId)}</strong>
                <p>
                  {item.completed} / {item.target} completed
                </p>
              </div>
              <span className={item.reached ? 'db-meta-pill db-pill-accent' : 'db-meta-pill'}>
                {item.reached ? 'Done' : `${item.remaining} left`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="db-support-stack">
          <div className="db-support-item">
            <span>{dashboardSummary.workoutsThisWeek === 0 ? 'Best first move' : 'Suggested path'}</span>
            <strong>{suggestedSplitName || lastUsedTemplate?.name || 'Custom workout'}</strong>
            <p>{suggestedSplitName ? 'Stay with your recent split rotation.' : lastUsedTemplate ? 'Reuse your last template for the fastest start.' : 'No split targets yet. Start a clean session.'}</p>
          </div>
          <div className="db-support-item">
            <span>{dashboardSummary.workoutsThisWeek === 0 ? 'Target pace' : 'Volume pace'}</span>
            <strong>
              {dashboardSummary.workoutsThisWeek === 0
                ? `${weeklyWorkoutGoal} sessions`
                : `${dashboardSummary.volumeDeltaVsLastWeek >= 0 ? '+' : ''}${formatNumber(dashboardSummary.volumeDeltaVsLastWeek)}`}
            </strong>
            <p>
              {dashboardSummary.workoutsThisWeek === 0
                ? `${dashboardSummary.daysRemainingThisWeek} day${dashboardSummary.daysRemainingThisWeek === 1 ? '' : 's'} left this week.`
                : `${formatNumber(dashboardSummary.totalVolumeThisWeek)} vs ${formatNumber(dashboardSummary.totalVolumeLastWeek)} last week`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardPerformanceSnapshot({
  dashboardSummary,
  formatNumber,
  mostImprovedExerciseName,
  getExerciseName,
  formatDisplayDate,
}) {
  return (
    <section className="db-card">
      <div className="db-card-header">
        <div>
          <span className="db-label">Performance</span>
          <h3 className="db-card-title">Training snapshot</h3>
        </div>
      </div>

      <div className="db-card-section">
        <div className="db-kpi-grid">
          <div className="db-kpi db-kpi-featured">
            <span>Best week</span>
            <strong>{dashboardSummary.bestWeekLabel || '--'}</strong>
            <p>
              {dashboardSummary.bestWeek
                ? `${formatNumber(dashboardSummary.bestWeek.volume)} vol · ${dashboardSummary.bestWeek.count} sessions`
                : 'No data yet'}
            </p>
          </div>
          <div className="db-kpi">
            <span>Best month</span>
            <strong>{dashboardSummary.bestMonthLabel || '--'}</strong>
            <p>
              {dashboardSummary.bestMonth
                ? `${formatNumber(dashboardSummary.bestMonth.volume)} vol · ${dashboardSummary.bestMonth.count} sessions`
                : 'No data yet'}
            </p>
          </div>
        </div>
      </div>

      <div className="db-card-section db-card-section-divider">
        <div className="db-section-heading">
          <span className="db-section-label">Momentum</span>
          <strong>This week vs last</strong>
        </div>
        <div className="db-momentum-grid">
          <div className="db-momentum-item db-momentum-primary">
            <span>Volume delta</span>
            <strong>
              {dashboardSummary.volumeDeltaVsLastWeek >= 0 ? '+' : ''}
              {formatNumber(dashboardSummary.volumeDeltaVsLastWeek)}
            </strong>
            <p>{formatNumber(dashboardSummary.totalVolumeThisWeek)} vs {formatNumber(dashboardSummary.totalVolumeLastWeek)}</p>
          </div>
          <div className="db-momentum-item">
            <span>Sessions delta</span>
            <strong>
              {dashboardSummary.workoutDeltaVsLastWeek >= 0 ? '+' : ''}
              {dashboardSummary.workoutDeltaVsLastWeek}
            </strong>
            <p>{dashboardSummary.workoutsThisWeek} vs {dashboardSummary.workoutsLastWeek}</p>
          </div>
        </div>
      </div>

      <div className="db-pill-row">
        <span className="db-meta-pill">
          Longest streak: <strong>{dashboardSummary.longestActiveWeekStreak} weeks</strong>
        </span>
        <span className="db-meta-pill">
          PRs this week: <strong>{dashboardSummary.currentWeekPrHits}</strong>
        </span>
        {mostImprovedExerciseName && (
          <span className="db-meta-pill">
            Most improved: <strong>{mostImprovedExerciseName}</strong>
          </span>
        )}
      </div>

      <div className="db-card-section db-card-section-divider">
        <div className="db-section-heading">
          <span className="db-section-label">Recent wins</span>
          <strong>Latest PRs</strong>
        </div>
        {dashboardSummary.latestPersonalRecords.length ? (
          <div className="db-wins-list db-wins-list-compact">
            {dashboardSummary.latestPersonalRecords.slice(0, 3).map((record) => (
              <div
                key={`${record.exerciseId}-${record.date}-${record.labels.join('-')}`}
                className="db-win-row db-win-row-compact"
              >
                <div>
                  <strong>{getExerciseName(record.exerciseId)}</strong>
                  <p>{formatDisplayDate(record.date)}</p>
                </div>
                <div className="tag-row">
                  {record.labels.slice(0, 2).map((label) => (
                    <span key={label} className="tag pr-tag">{label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DashboardGuidanceState
            label="Recent wins"
            title="No recent PRs yet"
            body="Keep logging good sessions and this snapshot will start surfacing fresh PR signals."
            points={['Weight PRs', 'Rep PRs', 'Volume PRs']}
            compact
            variant="inline"
          />
        )}
      </div>
    </section>
  );
}

function DashboardWorkoutSetup({
  dashboardSummary,
  templates,
  getSplitName,
  lastUsedTemplate,
  loadWorkoutTemplate,
  formatNumber,
}) {
  return (
    <section className="db-card">
      <div className="db-card-header">
        <div>
          <span className="db-label">Workout setup</span>
          <h3 className="db-card-title">Splits and templates</h3>
        </div>
      </div>

      <div className="db-card-section">
        <div className="db-section-heading">
          <span className="db-section-label">Split insights</span>
          <strong>Your go-to splits</strong>
        </div>
        {(dashboardSummary.topSplitThisMonth || dashboardSummary.mostUsedSplit) ? (
          <div className="db-split-list">
            {dashboardSummary.topSplitThisMonth && (
              <div className="db-split-row db-split-primary">
                <div>
                  <span>Top this month</span>
                  <strong>{getSplitName(dashboardSummary.topSplitThisMonth.splitId)}</strong>
                </div>
                <span className="db-meta-pill">
                  {formatNumber(dashboardSummary.topSplitThisMonth.volume)} vol · {dashboardSummary.topSplitThisMonth.count} sessions
                </span>
              </div>
            )}
            {dashboardSummary.mostUsedSplit && (
              <div className="db-split-row">
                <div>
                  <span>Most used overall</span>
                  <strong>{getSplitName(dashboardSummary.mostUsedSplit.splitId)}</strong>
                </div>
                <span className="db-meta-pill">{dashboardSummary.mostUsedSplit.count} sessions</span>
              </div>
            )}
          </div>
        ) : (
          <DashboardGuidanceState
            label="Split insights"
            title="No split pattern yet"
            body="Once you repeat saved splits a few times, this area starts showing your clearest training rotation."
            points={['Top split this month', 'Most used overall']}
            compact
            variant="subtle"
          />
        )}
      </div>

      <div className="db-card-section db-card-section-divider">
        <div className="db-section-heading">
          <span className="db-section-label">Templates</span>
          <strong>Reuse a session</strong>
        </div>
        {templates.length ? (
          <div className="db-template-list">
            {templates.slice(0, 3).map((template) => (
              <div key={template.id} className="db-template-row">
                <div>
                  <strong>{template.name}</strong>
                  <p>
                    {template.entries.length} exercise{template.entries.length === 1 ? '' : 's'}
                    {lastUsedTemplate?.id === template.id ? ' · Last used' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost-button action-button"
                  onClick={() => loadWorkoutTemplate(template.id)}
                >
                  Use template
                </button>
              </div>
            ))}
          </div>
        ) : (
          <DashboardGuidanceState
            label="Templates"
            title="No templates yet"
            body="Save a session as a template once you find a workout you want to reuse quickly."
            points={['Fast repeat starts', 'Keeps exercise order']}
            compact
            variant="subtle"
          />
        )}
      </div>
    </section>
  );
}

function DashboardCalendarState({
  dashboardSummary,
  weeklyWorkoutGoal,
}) {
  return (
    <div className="db-calendar-state">
      <div className="db-calendar-preview" aria-hidden="true">
        {dashboardSummary.weeklyVolumeTrend.map((day) => (
          <div key={day.date} className="db-calendar-preview-day">
            <span>{day.label}</span>
          </div>
        ))}
      </div>
      <div className="db-calendar-state-copy">
        <span className="db-guidance-label">Low activity</span>
        <strong>Your calendar starts with the first session</strong>
        <p>This space turns into a real training calendar once you put one workout on the board.</p>
        <div className="db-guidance-points">
          <span className="db-guidance-pill">{weeklyWorkoutGoal} session goal</span>
          <span className="db-guidance-pill">{dashboardSummary.daysRemainingThisWeek}d left this week</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardView({
  bodyweightSummary,
  splits,
  templates,
  weeklyWorkoutGoal,
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
  const suggestedSplitId =
    latestWorkout?.splitId && latestWorkout.splitId !== ''
      ? latestWorkout.splitId
      : splits[0]?.id ?? '';
  const suggestedSplitName = suggestedSplitId ? getSplitName(suggestedSplitId) : '';
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
  const heatmapActiveDays = dashboardSummary.trainingHeatmap.filter((day) => day.count > 0).length;
  const mostImprovedExerciseName = dashboardSummary.mostImprovedExercise
    ? getExerciseName(dashboardSummary.mostImprovedExercise.exerciseId)
    : null;
  const bodyweightValues = bodyweightSummary.recentEntries.map((entry) => entry.weight);
  const bodyweightMin = bodyweightValues.length ? Math.min(...bodyweightValues) : 0;
  const bodyweightRange = bodyweightValues.length ? Math.max(...bodyweightValues) - bodyweightMin || 1 : 1;
  const hasWeeklySplitPlan = dashboardSummary.weeklySplitPlan.length > 0;
  const latestWorkoutSplitName = latestWorkout?.splitId ? getSplitName(latestWorkout.splitId) : '';
  const isEmptyWeek = dashboardSummary.workoutsThisWeek === 0;
  const hasPerformanceBaseline =
    Boolean(dashboardSummary.bestWeek)
    || Boolean(dashboardSummary.bestMonth)
    || dashboardSummary.latestPersonalRecords.length > 0
    || dashboardSummary.totalVolumeThisMonth > 0;

  return (
    <main className="db">
      <DashboardHeroPath
        latestWorkout={latestWorkout}
        suggestedSplitId={suggestedSplitId}
        suggestedSplitName={suggestedSplitName}
        weeklyWorkoutGoal={weeklyWorkoutGoal}
        dashboardSummary={dashboardSummary}
        formatDisplayDate={formatDisplayDate}
        startWorkoutFromSplit={startWorkoutFromSplit}
        repeatLatestWorkout={repeatLatestWorkout}
        lastUsedTemplate={lastUsedTemplate}
        startWorkoutFromLastUsedTemplate={startWorkoutFromLastUsedTemplate}
        latestWorkoutSplitName={latestWorkoutSplitName}
        hasAnyTemplates={templates.length > 0}
        hasAnySplits={splits.length > 0}
      />

      <div className="db-priority-grid">
        <section className="db-card">
          <div className="db-card-header">
            <div>
              <span className="db-label">Weekly support</span>
              <h3 className="db-card-title">How this week is going</h3>
            </div>
            <strong className="db-card-header-value">{formatNumber(dashboardSummary.totalVolumeThisWeek)}</strong>
          </div>
          <p className="db-card-sub">
            {dashboardSummary.totalVolumeThisWeek
              ? `${formatNumber(dashboardSummary.totalVolumeThisWeek)} total volume with ${dashboardSummary.workoutsThisWeek} session${dashboardSummary.workoutsThisWeek === 1 ? '' : 's'} so far.`
              : 'No volume logged yet this week.'}
          </p>
          {isEmptyWeek ? (
            <DashboardGuidanceState
              label="Weekly rhythm"
              title="Start with one complete session"
              body="Use the first session to set the pace for this week."
              points={[`${weeklyWorkoutGoal} session goal`, `${dashboardSummary.daysRemainingThisWeek}d left this week`]}
              variant="accent"
            />
          ) : (
            <div className="db-bars" aria-label="Weekly volume trend">
              {dashboardSummary.weeklyVolumeTrend.map((day) => (
                <div key={day.date} className="db-bar-col">
                  <div className="db-bar-track">
                    <div
                      className="db-bar-fill"
                      style={{ height: `${Math.max((day.volume / weeklyTrendMax) * 100, day.volume ? 14 : 4)}%` }}
                    />
                  </div>
                  <span className="db-bar-value">{formatNumber(day.volume)}</span>
                  <span className="db-bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <DashboardWeekSupportCard
          dashboardSummary={dashboardSummary}
          weeklyWorkoutGoal={weeklyWorkoutGoal}
          suggestedSplitName={suggestedSplitName}
          lastUsedTemplate={lastUsedTemplate}
          hasWeeklySplitPlan={hasWeeklySplitPlan}
          getSplitName={getSplitName}
          formatNumber={formatNumber}
        />
      </div>

      <div className="db-grid db-grid-secondary">
        <div className="db-col-primary">
          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Training calendar</span>
                <h3 className="db-card-title">{heatmapActiveDays ? 'Last 28 days' : 'Get your month started'}</h3>
              </div>
              <span className="db-meta-pill">{heatmapActiveDays} active days</span>
            </div>
            {heatmapActiveDays === 0 ? (
              <DashboardCalendarState
                dashboardSummary={dashboardSummary}
                weeklyWorkoutGoal={weeklyWorkoutGoal}
              />
            ) : (
              <>
                <div className="db-heatmap" aria-label="Training heatmap">
                  {dashboardSummary.trainingHeatmap.map((day) => (
                    <div
                      key={day.date}
                      className={`db-heatmap-cell level-${day.level}`}
                      title={`${formatDisplayDate(day.date)} · ${day.count} session${day.count === 1 ? '' : 's'} · ${formatNumber(day.volume)} vol`}
                    />
                  ))}
                </div>
                <div className="db-heatmap-legend">
                  <span>Less</span>
                  <div className="db-heatmap-scale">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span key={level} className={`db-heatmap-cell level-${level}`} />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </>
            )}
          </section>

          <DashboardPerformanceSnapshot
            dashboardSummary={dashboardSummary}
            formatNumber={formatNumber}
            mostImprovedExerciseName={mostImprovedExerciseName}
            getExerciseName={getExerciseName}
            formatDisplayDate={formatDisplayDate}
          />
          {!hasPerformanceBaseline && (
            <section className="db-card db-card-supportive">
              <DashboardGuidanceState
                label="Performance baseline"
                title="Your first training block sets the baseline"
                body="After a few logged sessions, this dashboard starts surfacing best periods, momentum, and PR context instead of starter guidance."
                points={['Best week', 'Momentum', 'Recent PRs']}
                variant="surface"
              />
            </section>
          )}

          <section className="db-card">
            <div className="db-card-header">
              <div>
                <span className="db-label">Bodyweight</span>
                <h3 className="db-card-title">
                  {bodyweightSummary.latestWeight !== null ? `${formatNumber(bodyweightSummary.latestWeight)} kg` : 'Bodyweight tracking'}
                </h3>
              </div>
              <span className="db-meta-pill">
                {bodyweightSummary.latestEntry
                  ? formatDisplayDate(bodyweightSummary.latestEntry.date)
                  : 'Optional'}
              </span>
            </div>
            <p className="db-card-sub">
              {bodyweightSummary.deltaInRange !== null
                ? `${bodyweightSummary.deltaInRange > 0 ? '+' : ''}${formatNumber(bodyweightSummary.deltaInRange)} kg over the last 30 days`
                : 'Add a check-in from settings if you want bodyweight context alongside training progress.'}
            </p>
            {bodyweightSummary.recentEntries.length ? (
              <div className="db-bodyweight-trend" aria-label="Recent bodyweight trend">
                {bodyweightSummary.recentEntries.map((entry) => (
                  <div key={entry.id} className="db-bodyweight-point">
                    <div className="db-bodyweight-rail">
                      <span
                        className="db-bodyweight-fill"
                        style={{
                          height: `${Math.max(((entry.weight - bodyweightMin) / bodyweightRange) * 100, 14)}%`,
                        }}
                      />
                    </div>
                    <span className="db-bodyweight-value">{formatNumber(entry.weight)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <DashboardGuidanceState
                label="Optional tracking"
                title="No bodyweight trend yet"
                body="A couple of check-ins are enough to unlock short-term weight direction in this slot."
                points={['Add in settings', 'Shows 30-day change']}
                compact
                variant="subtle"
              />
            )}
          </section>
        </div>

        <div className="db-col-secondary">
          <DashboardWorkoutSetup
            dashboardSummary={dashboardSummary}
            templates={templates}
            getSplitName={getSplitName}
            lastUsedTemplate={lastUsedTemplate}
            loadWorkoutTemplate={loadWorkoutTemplate}
            formatNumber={formatNumber}
          />
        </div>
      </div>

      {latestWorkout && (
        <section className="db-card db-latest">
          <div className="db-card-header">
            <div>
              <span className="db-label">Latest session</span>
              <h3 className="db-card-title">{formatDisplayDate(latestWorkout.date)}</h3>
            </div>
            <div className="db-latest-meta">
              {latestWorkout.splitId && <span className="db-meta-pill db-pill-accent">{getSplitName(latestWorkout.splitId)}</span>}
              <span className="db-meta-pill">{latestWorkout.entries.length} exercises</span>
              <span className="db-meta-pill">{formatNumber(latestWorkoutVolume)} vol</span>
            </div>
          </div>
          <div className="db-latest-entries timeline-container">
            {latestWorkout.entries.map((entry) => {
              const metrics = getEntryMetrics(entry);
              return (
                <div key={`${latestWorkout.id}-${entry.exerciseId}`} className="db-latest-entry timeline-item">
                  <div className="timeline-node"></div>
                  <div className="timeline-content">
                    <strong>{getExerciseName(entry.exerciseId)}</strong>
                    <div className="db-latest-entry-metrics">
                      <span>{formatNumber(metrics.bestWeight)} kg</span>
                      <span className="timeline-pipe">|</span>
                      <span>{formatNumber(metrics.bestReps)} reps</span>
                      <span className="timeline-pipe">|</span>
                      <span>{formatNumber(metrics.totalVolume)} vol</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!latestWorkout && (
        <section className="db-card db-latest db-card-supportive">
          <div className="db-card-header">
            <div>
              <span className="db-label">Latest session</span>
              <h3 className="db-card-title">Nothing logged yet</h3>
            </div>
            <span className="db-meta-pill">Starts after workout 1</span>
          </div>
          <DashboardGuidanceState
            label="Session recap"
            title="Your first workout will show up here"
            body="Once you save a session, this area becomes your quick recap for exercises, top sets, and total volume."
            points={['Exercise list', 'Top set highlights', 'Session volume']}
            variant="surface"
          />
        </section>
      )}

      {/* ---- DATA ACTIONS ---- */}
      <div className="db-footer-actions">
        <button type="button" className="ghost-button" onClick={exportAppData}>Export JSON</button>
        <button type="button" className="ghost-button" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden-input" onChange={handleImportFile} />
      </div>
      {dataMessage.text && (
        <p
          className={dataMessage.type === 'error' ? 'feedback error' : dataMessage.type === 'warning' ? 'feedback warning' : 'feedback success'}
          role={dataMessage.type === 'error' ? 'alert' : 'status'}
          aria-live={dataMessage.type === 'error' ? 'assertive' : 'polite'}
        >
          {dataMessage.text}
        </p>
      )}
    </main>
  );
}
