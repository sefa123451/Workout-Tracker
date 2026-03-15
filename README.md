# Workout Tracker

A polished React workout tracker with local storage, progress tracking, import/export, dark mode, and split-based workout planning.

## Features

- Create, rename, and delete exercises
- Create, edit, and delete workouts
- Log sets with weight and reps
- View workout history
- Track exercise progress with PR markers and charts
- Import and export all local data as JSON
- Switch between system, light, and dark mode

## Split-Based Planning

- Create workout splits such as `Push`, `Pull`, or `Legs`
- Assign existing exercises to each split
- Set a default number of sets per split exercise
- Start a workout by choosing a date and a split
- Automatically generate workout entries and set rows from the selected split
- Skip an exercise for a day without removing it from the split
- Store the selected split together with the workout
- Show the split label in workout history

If a split is deleted later, linked workout history is preserved and shown with an `Unknown split (deleted)` label.

## Tech

- React
- Vite
- Vitest
- Testing Library
- Local browser storage (`localStorage`)

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test -- --run
```

## Data Storage

All data is stored locally in the browser. The app currently stores:

- `exercises`
- `splits`
- `workouts`

Workouts can optionally include a `splitId`, and splits reference exercises by `exerciseId`.

## Manual Test Ideas

- Create exercises and then build a split from them
- Log a workout by selecting a split and filling only weights/reps
- Skip one split exercise and save the workout
- Delete a split that already has workout history and confirm history is preserved
- Export the data and import it again
- Check both light and dark mode

## Notes

This project is intentionally local-first and simple to extend. There is no backend or account system yet.
