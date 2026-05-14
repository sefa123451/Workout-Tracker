import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryBase = '/Workout-Tracker/';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? repositoryBase : '/',
  plugins: [react()],
});
