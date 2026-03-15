# Workout Tracker

A polished local-first workout tracker built with React and Vite.

It combines split-based workout planning, fast daily logging, exercise progress, JSON import/export, and a premium dashboard-style UI in one small app.

## Highlights

- Premium dashboard UI with dark mode, light mode, and system theme support
- Exercise library with create, rename, and delete flows
- Split planner for routines like `Push`, `Pull`, and `Legs`
- Fast workout logging with prebuilt set rows from a selected split
- Workout history with edit and delete support
- Progress tracking with charts, PR markers, and 7 / 30 / 90 day filters
- Local JSON export/import for backup and restore

## Core Flows

### 1. Build your exercise library

- Add exercises
- Rename or delete exercises later
- Keep workout history even if an exercise is deleted

### 2. Create reusable workout splits

- Create splits such as `Push`, `Pull`, or `Legs`
- Assign existing exercises to each split
- Define a default number of sets per exercise
- Keep the split flexible enough for day-to-day changes

### 3. Log workouts quickly

- Pick a date
- Choose a split or log a custom workout
- Auto-load exercises and default set rows from the split
- Fill only weights and reps
- Skip individual exercises for that session without changing the split itself

### 4. Review and improve

- Browse full workout history
- Track progress per exercise over time
- See PRs for weight, reps, and total volume
- Compare recent ranges with simple charts

## Data Model

All app data is stored locally in the browser via `localStorage`.

The app currently stores:

- `exercises`
- `splits`
- `workouts`

Workouts may include a `splitId`, and splits reference exercises by `exerciseId`.

If an exercise or split is deleted later, linked workout history is preserved rather than removed.

## Tech Stack

- React 18
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

Open the local URL shown in the terminal, usually:

```bash
http://localhost:5173
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test -- --run
```

## Manual Test Checklist

- Create a few exercises and confirm duplicate names are rejected
- Create a split and assign exercises with different default set counts
- Log a workout from that split and verify set rows are created automatically
- Skip one split exercise, restore it, and save the workout
- Edit and delete a workout from history
- Check exercise progress, PR tags, and 7 / 30 / 90 day filters
- Export all data as JSON, then import it back
- Switch between `System`, `Light`, and `Dark` themes

## Current Scope

This project is intentionally simple and local-first.

There is currently:

- no backend
- no user accounts
- no cloud sync

That makes it easy to run locally, iterate quickly, and extend later.
