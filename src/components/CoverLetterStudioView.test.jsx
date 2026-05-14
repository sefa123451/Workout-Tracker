// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoverLetterStudioView from './CoverLetterStudioView.jsx';

describe('CoverLetterStudioView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('updates the live preview when form values change', async () => {
    const user = userEvent.setup();
    render(<CoverLetterStudioView />);

    await user.type(screen.getByLabelText('Name'), 'Max Mustermann');
    await user.type(screen.getByLabelText('PLZ und Ort'), '12345 Musterstadt');

    const previewNode = document.querySelector('.cover-letter-preview-text');
    expect(previewNode?.textContent ?? '').toContain('Max Mustermann');
    expect(previewNode?.textContent ?? '').toContain('12345 Musterstadt');
    expect(screen.getByText(/Bewerbung als Werkstudent Softwareentwicklung/)).toBeTruthy();
  });

  it('copies the generated letter text to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<CoverLetterStudioView />);
    await user.click(screen.getByRole('button', { name: 'Anschreiben kopieren' }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Sehr geehrte Damen und Herren');
    expect(screen.getByText('Anschreiben in die Zwischenablage kopiert.')).toBeTruthy();
  });

  it('exports the generated letter as txt', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<CoverLetterStudioView />);
    await user.click(screen.getByRole('button', { name: 'Als .txt exportieren' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Anschreiben als .txt exportiert.')).toBeTruthy();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
