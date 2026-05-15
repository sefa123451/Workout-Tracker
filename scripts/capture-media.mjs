import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const STORAGE_KEY = 'workout-tracker-data-v1';
const MEDIA_DIR = path.resolve(process.cwd(), 'docs/media');
const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 1000;

const seedData = {
  exercises: [
    { id: 'bench', name: 'Bench Press', targetWeight: 100, createdAt: '2026-03-20T10:00:00.000Z' },
    { id: 'squat', name: 'Back Squat', targetWeight: 140, createdAt: '2026-03-20T10:00:00.000Z' },
    { id: 'row', name: 'Barbell Row', targetWeight: 90, createdAt: '2026-03-20T10:00:00.000Z' },
  ],
  splits: [
    {
      id: 'push-day',
      name: 'Push Day',
      weeklyTarget: 2,
      createdAt: '2026-03-21T10:00:00.000Z',
      exercises: [
        { id: 'split-ex-1', exerciseId: 'bench', defaultSets: 3 },
        { id: 'split-ex-2', exerciseId: 'row', defaultSets: 3 },
      ],
    },
  ],
  templates: [
    {
      id: 'template-push',
      name: 'Push Template',
      splitId: 'push-day',
      notes: 'Keep rest to 2 minutes.',
      createdAt: '2026-03-22T10:00:00.000Z',
      entries: [
        {
          exerciseId: 'bench',
          sets: [
            { weight: 80, reps: 8 },
            { weight: 82.5, reps: 6 },
          ],
        },
        {
          exerciseId: 'row',
          sets: [
            { weight: 65, reps: 10 },
            { weight: 70, reps: 8 },
          ],
        },
      ],
    },
  ],
  workouts: [
    {
      id: 'w-1',
      date: '2026-04-06',
      splitId: 'push-day',
      notes: 'Felt strong today.',
      mood: 'Great',
      effort: 'Hard',
      createdAt: '2026-04-06T10:00:00.000Z',
      entries: [
        {
          exerciseId: 'bench',
          sets: [
            { weight: 80, reps: 8 },
            { weight: 85, reps: 6 },
          ],
        },
        {
          exerciseId: 'row',
          sets: [
            { weight: 65, reps: 10 },
            { weight: 72.5, reps: 8 },
          ],
        },
      ],
    },
    {
      id: 'w-2',
      date: '2026-04-10',
      splitId: 'push-day',
      notes: 'Bench moved well.',
      mood: 'Good',
      effort: 'Hard',
      createdAt: '2026-04-10T10:00:00.000Z',
      entries: [
        {
          exerciseId: 'bench',
          sets: [
            { weight: 82.5, reps: 8 },
            { weight: 87.5, reps: 6 },
          ],
        },
        {
          exerciseId: 'row',
          sets: [
            { weight: 70, reps: 10 },
            { weight: 75, reps: 8 },
          ],
        },
      ],
    },
    {
      id: 'w-3',
      date: '2026-04-13',
      splitId: '',
      notes: 'Quick custom session.',
      mood: 'Okay',
      effort: 'Moderate',
      createdAt: '2026-04-13T10:00:00.000Z',
      entries: [
        {
          exerciseId: 'squat',
          sets: [
            { weight: 110, reps: 5 },
            { weight: 115, reps: 4 },
          ],
        },
      ],
    },
  ],
  bodyweightEntries: [
    { id: 'bw-1', date: '2026-03-28', weight: 82.9, createdAt: '2026-03-28T07:00:00.000Z' },
    { id: 'bw-2', date: '2026-04-04', weight: 82.5, createdAt: '2026-04-04T07:00:00.000Z' },
    { id: 'bw-3', date: '2026-04-11', weight: 82.1, createdAt: '2026-04-11T07:00:00.000Z' },
  ],
  weeklyWorkoutGoal: 4,
};

function ensureMediaDir() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build command failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

function findInstalledChromiumShell() {
  const cacheDir = path.join(process.env.HOME ?? '', 'Library/Caches/ms-playwright');

  if (!cacheDir || !fs.existsSync(cacheDir)) {
    return null;
  }

  const entries = fs
    .readdirSync(cacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium_headless_shell-'))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const entryName of entries) {
    const executablePath = path.join(
      cacheDir,
      entryName,
      'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    );

    if (fs.existsSync(executablePath)) {
      return executablePath;
    }
  }

  return null;
}

function getDistDirectory() {
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html was not found after build.');
  }

  return distDir;
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

async function waitForStitchFrame(page) {
  const frameHandle = await page.waitForSelector('iframe.stitch-frame');
  const frame = await frameHandle.contentFrame();

  if (!frame) {
    throw new Error('Stitch iframe was not available for media capture.');
  }

  await frame.waitForSelector('body');
  await frame.evaluate(() => document.fonts?.ready?.then(() => true) ?? true);
  await page.waitForTimeout(400);
  return frame;
}

async function preparePage(page, distDir, route = 'dashboard') {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: STORAGE_KEY,
      value: JSON.stringify(seedData),
    },
  );

  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.hostname !== 'app.local') {
      await route.continue();
      return;
    }

    const pathname = requestUrl.pathname.replace(/^\/Workout-Tracker(?=\/|$)/, '') || '/';
    const normalizedPath = pathname === '/' ? '/index.html' : pathname.replace(/\/{2,}/g, '/');
    const safeRelativePath = normalizedPath.replace(/^\/+/, '');
    const filePath = path.join(distDir, safeRelativePath);

    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: 'Not found' });
      return;
    }

    const body = fs.readFileSync(filePath);
    await route.fulfill({
      status: 200,
      body,
      contentType: getContentType(filePath),
    });
  });

  await page.goto(`http://app.local/#/${route}`, { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
}

async function captureRoute(page, route, fileName) {
  await page.goto(`http://app.local/#/${route}`, { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
  await page.screenshot({
    path: path.join(MEDIA_DIR, fileName),
    fullPage: false,
  });
}

async function captureScreenshots(browser, distDir) {
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });
  const page = await context.newPage();
  await preparePage(page, distDir);

  await captureRoute(page, 'dashboard', 'dashboard-desktop.png');
  await captureRoute(page, 'exercises', 'exercises-desktop.png');
  await captureRoute(page, 'log', 'log-workout-desktop.png');
  await captureRoute(page, 'history', 'history-desktop.png');
  await captureRoute(page, 'progress', 'progress-desktop.png');
  await captureRoute(page, 'settings', 'settings-desktop.png');

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await preparePage(mobilePage, distDir, 'exercises');
  const frame = await waitForStitchFrame(mobilePage);
  await frame.getByText('BARBELL BENCH PRESS', { exact: true }).click();
  await frame.locator('[data-codex-exercise-modal]:not(.hidden)').waitFor({ state: 'visible' });
  await mobilePage.screenshot({
    path: path.join(MEDIA_DIR, 'exercise-details-mobile.png'),
    fullPage: false,
  });

  await mobileContext.close();
  await context.close();
}

function appendGifFrame(frameBuffer, encoder, delayMs) {
  const png = PNG.sync.read(frameBuffer);
  const palette = quantize(png.data, 256);
  const frame = applyPalette(png.data, palette);
  encoder.writeFrame(frame, png.width, png.height, { palette, delay: delayMs });
}

async function captureGif(browser, distDir) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 760 },
  });
  const page = await context.newPage();
  await preparePage(page, distDir);

  const frames = [];
  frames.push(await page.screenshot({ fullPage: false }));

  await page.goto('http://app.local/#/exercises', { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
  frames.push(await page.screenshot({ fullPage: false }));

  await page.goto('http://app.local/#/log', { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
  frames.push(await page.screenshot({ fullPage: false }));

  await page.goto('http://app.local/#/history', { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
  frames.push(await page.screenshot({ fullPage: false }));

  await page.goto('http://app.local/#/progress', { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
  frames.push(await page.screenshot({ fullPage: false }));

  await page.goto('http://app.local/#/settings', { waitUntil: 'networkidle' });
  await waitForStitchFrame(page);
  frames.push(await page.screenshot({ fullPage: false }));

  const firstFrame = PNG.sync.read(frames[0]);
  const encoder = GIFEncoder();

  appendGifFrame(frames[0], encoder, 1200);
  for (let index = 1; index < frames.length; index += 1) {
    appendGifFrame(frames[index], encoder, 900);
  }
  appendGifFrame(frames[frames.length - 1], encoder, 1200);

  encoder.finish();
  fs.writeFileSync(path.join(MEDIA_DIR, 'workout-flow.gif'), Buffer.from(encoder.bytes()));

  if (firstFrame.width !== 1200) {
    throw new Error('Unexpected GIF frame width. Update viewport/capture settings.');
  }

  await context.close();
}

async function run() {
  ensureMediaDir();
  await runBuild();
  const distDir = getDistDirectory();
  const executablePath = findInstalledChromiumShell() ?? undefined;

  const browser = await chromium.launch({ headless: true, executablePath });
  await captureScreenshots(browser, distDir);
  await captureGif(browser, distDir);
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
