# Portfolio Media Assets

This folder contains real captures generated from the app:

- `dashboard-desktop.png` (1600x1000)
- `exercises-desktop.png` (1600x1000)
- `log-workout-desktop.png` (1600x1000)
- `history-desktop.png` (1600x1000)
- `progress-desktop.png` (1600x1000)
- `settings-desktop.png` (1600x1000)
- `exercise-details-mobile.png` (390x844)
- `workout-flow.gif` (1200x760)

## Regenerate Media

```bash
npm run capture:media
```

The script builds the app, loads the production bundle through a local Playwright route, waits for the Stitch iframe and icon fonts, then captures screenshots/GIF with seeded local data for consistent portfolio output.
