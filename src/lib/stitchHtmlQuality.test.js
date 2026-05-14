import { readdirSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { findStitchHtmlIssues } from './stitchHtmlQuality.js';

const STITCH_DIRECTORY = new URL('../../public/stitch/', import.meta.url);

function readStitchFiles() {
  return readdirSync(STITCH_DIRECTORY)
    .filter((fileName) => fileName.endsWith('.html'))
    .sort()
    .map((fileName) => ({
      fileName,
      html: readFileSync(new URL(fileName, STITCH_DIRECTORY), 'utf8'),
    }));
}

describe('stitch HTML quality checks', () => {
  it('detects broken Material Symbols fill style attributes', () => {
    const html = `<span class="material-symbols-outlined" style="font-variation-settings: " fill'="" 1;'="">fitness_center</span>`;

    expect(findStitchHtmlIssues(html, 'broken.html')).toEqual([
      {
        filePath: 'broken.html',
        line: 1,
        message: 'Material Symbols fill style attribute is malformed.',
      },
    ]);
  });

  it('keeps every stitched screen free of malformed Material Symbols fill styles', () => {
    const issues = readStitchFiles().flatMap(({ fileName, html }) => {
      new JSDOM(html);
      return findStitchHtmlIssues(html, `public/stitch/${fileName}`);
    });

    expect(issues).toEqual([]);
  });
});
