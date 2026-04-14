import React, { useEffect, useRef, useState } from 'react';

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return Array.from(container.querySelectorAll(focusableSelectors.join(','))).filter(
    (element) => element instanceof HTMLElement && !element.hasAttribute('aria-hidden'),
  );
}

export default function AppDialog({ dialog, onConfirm, onCancel }) {
  const [promptValue, setPromptValue] = useState('');
  const surfaceRef = useRef(null);
  const promptInputRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!dialog) {
      return;
    }

    setPromptValue(dialog.kind === 'prompt' ? (dialog.defaultValue ?? '') : '');
  }, [dialog]);

  useEffect(() => {
    if (!dialog) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTarget =
      dialog.kind === 'prompt'
        ? promptInputRef.current
        : surfaceRef.current?.querySelector('[data-dialog-confirm]');

    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }

    function handleKeydown(event) {
      if (!surfaceRef.current) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(surfaceRef.current);

      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);

      if (restoreFocusRef.current instanceof HTMLElement) {
        restoreFocusRef.current.focus();
      }
    };
  }, [dialog, onCancel]);

  if (!dialog) {
    return null;
  }

  const confirmButtonClass =
    dialog.tone === 'danger'
      ? 'primary-button dialog-confirm-button dialog-confirm-button-danger'
      : 'primary-button dialog-confirm-button';

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog-surface panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby={dialog.description ? 'app-dialog-description' : undefined}
        ref={surfaceRef}
      >
        <div className="dialog-copy">
          <h2 id="app-dialog-title">{dialog.title}</h2>
          {dialog.description ? <p id="app-dialog-description">{dialog.description}</p> : null}
        </div>

        {dialog.kind === 'prompt' ? (
          <form
            className="stack dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm(promptValue);
            }}
          >
            <label className="field field-compact">
              <span>{dialog.inputLabel ?? 'Name'}</span>
              <input
                ref={promptInputRef}
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
              />
            </label>
            <div className="actions dialog-actions">
              <button type="button" className="ghost-button" onClick={onCancel}>
                {dialog.cancelLabel ?? 'Cancel'}
              </button>
              <button type="submit" className={confirmButtonClass} data-dialog-confirm>
                {dialog.confirmLabel ?? 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="actions dialog-actions">
            <button type="button" className="ghost-button" onClick={onCancel}>
              {dialog.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              className={confirmButtonClass}
              data-dialog-confirm
              onClick={() => onConfirm('')}
            >
              {dialog.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
