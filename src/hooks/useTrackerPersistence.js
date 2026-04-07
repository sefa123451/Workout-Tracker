import { useEffect, useState } from 'react';
import { STORAGE_KEY, STORAGE_VERSION } from '../lib/workoutShared.js';

export function useTrackerPersistence({
  bodyweightEntries,
  exercises,
  splits,
  templates,
  workouts,
  weeklyWorkoutGoal,
}) {
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          bodyweightEntries,
          exercises,
          splits,
          templates,
          workouts,
          weeklyWorkoutGoal,
        }),
      );
      setStorageWarning('');
    } catch {
      setStorageWarning('Changes could not be saved locally. Refreshing may restore older data.');
    }
  }, [bodyweightEntries, exercises, splits, templates, workouts, weeklyWorkoutGoal]);

  return storageWarning;
}
