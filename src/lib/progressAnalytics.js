export const ANALYTICS_TERMS = {
  changeSignal: 'Change signal',
  whyItMatters: 'Why it matters',
  latestSignal: 'Latest signal',
  baseline: 'Baseline',
  nextMove: 'Next move',
  decisionSummary: 'Decision summary',
};

const STRONG_SIGNAL_THRESHOLD = 12;
const MODERATE_SIGNAL_THRESHOLD = 5;
const HIGH_CONFIDENCE_SESSION_COUNT = 4;

export function getSignalConfidenceLabel(sessionCount) {
  return sessionCount >= HIGH_CONFIDENCE_SESSION_COUNT ? 'higher confidence' : 'early signal';
}

export function formatSignalPercent(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function getSignalDirectionAndIntensity(delta, absolutePercent) {
  if (delta > 0) {
    if (absolutePercent !== null && absolutePercent >= STRONG_SIGNAL_THRESHOLD) {
      return { direction: 'up', intensity: 'strong', label: 'Strong upward signal' };
    }
    if (absolutePercent !== null && absolutePercent >= MODERATE_SIGNAL_THRESHOLD) {
      return { direction: 'up', intensity: 'moderate', label: 'Steady upward signal' };
    }
    return { direction: 'up', intensity: 'light', label: 'Light upward signal' };
  }

  if (delta < 0) {
    if (absolutePercent !== null && absolutePercent >= STRONG_SIGNAL_THRESHOLD) {
      return { direction: 'down', intensity: 'strong', label: 'Strong downward signal' };
    }
    if (absolutePercent !== null && absolutePercent >= MODERATE_SIGNAL_THRESHOLD) {
      return { direction: 'down', intensity: 'moderate', label: 'Moderate downward signal' };
    }
    return { direction: 'down', intensity: 'light', label: 'Light downward signal' };
  }

  return { direction: 'flat', intensity: 'flat', label: 'Flat signal' };
}

export function getSignalTone(direction, intensity) {
  if (!direction || !intensity) {
    return 'neutral';
  }

  if (direction === 'up') {
    return `up-${intensity}`;
  }

  if (direction === 'down') {
    return `down-${intensity}`;
  }

  return direction === 'flat' ? 'flat' : 'neutral';
}

export function getSignalProfile(baselineValue, latestValue) {
  if (!Number.isFinite(baselineValue) || !Number.isFinite(latestValue)) {
    return {
      delta: null,
      deltaPercent: null,
      direction: 'neutral',
      intensity: 'baseline',
      label: 'Baseline building',
      tone: 'neutral',
    };
  }

  const delta = latestValue - baselineValue;
  const deltaPercent =
    Math.abs(baselineValue) > 0.0001 ? (delta / Math.abs(baselineValue)) * 100 : null;
  const absolutePercent = Number.isFinite(deltaPercent) ? Math.abs(deltaPercent) : null;
  const signal = getSignalDirectionAndIntensity(delta, absolutePercent);

  return {
    delta,
    deltaPercent,
    direction: signal.direction,
    intensity: signal.intensity,
    label: signal.label,
    tone: getSignalTone(signal.direction, signal.intensity),
  };
}

export function buildChangeSignalCopy({
  signalProfile,
  formatDelta,
  baselineDateLabel,
  noComparisonCopy,
}) {
  if (!signalProfile || !Number.isFinite(signalProfile.delta)) {
    return noComparisonCopy;
  }

  const deltaPercent = formatSignalPercent(signalProfile.deltaPercent);
  const deltaText = formatDelta(signalProfile.delta);
  const baselineSuffix = baselineDateLabel ? ` vs ${baselineDateLabel}` : '';

  return `${signalProfile.label} • ${deltaText}${deltaPercent ? ` (${deltaPercent})` : ''}${baselineSuffix}`;
}

export function buildWhyItMattersCopy({
  metricLabel,
  signalProfile,
  confidenceLabel,
  noComparisonCopy,
}) {
  if (!signalProfile || !Number.isFinite(signalProfile.delta)) {
    return noComparisonCopy;
  }

  if (signalProfile.direction === 'up') {
    return `${metricLabel} is rising with ${confidenceLabel}. Your current setup is converting into measurable progress.`;
  }

  if (signalProfile.direction === 'down') {
    return `${metricLabel} is below baseline with ${confidenceLabel}. Treat this as a reset signal and rebuild consistency first.`;
  }

  return `${metricLabel} is flat with ${confidenceLabel}. Stability is good, but a deliberate overload step is needed for a clearer trend.`;
}

export function buildNextMoveGuidance({
  signalProfile,
  confidenceLabel,
  noComparisonCopy,
}) {
  if (!signalProfile || !Number.isFinite(signalProfile.delta)) {
    return noComparisonCopy;
  }

  if (signalProfile.direction === 'up') {
    return `Momentum is positive with ${confidenceLabel}. Keep execution quality high and apply a small planned overload next session.`;
  }

  if (signalProfile.direction === 'down') {
    return `Signal is down with ${confidenceLabel}. Rebuild around consistent quality sets before pushing aggressive jumps.`;
  }

  return `Signal is stable with ${confidenceLabel}. Introduce one controlled change next session to create a clearer direction.`;
}
