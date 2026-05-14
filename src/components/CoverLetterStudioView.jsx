import React, { useMemo, useState } from 'react';

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatGermanDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getDisplayValue(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function sanitizeFilePart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCoverLetterText(form) {
  const senderName = getDisplayValue(form.senderName, '[Vorname Nachname]');
  const senderStreet = getDisplayValue(form.senderStreet, '[Straße Hausnummer]');
  const senderPostalCity = getDisplayValue(form.senderPostalCity, '[PLZ Ort]');
  const senderEmail = getDisplayValue(form.senderEmail, '[E-Mail]');
  const senderPhone = getDisplayValue(form.senderPhone, '[Telefon]');
  const recipientCompany = getDisplayValue(form.recipientCompany, '[Unternehmen]');
  const recipientStreet = getDisplayValue(form.recipientStreet, '[Adresse]');
  const recipientPostalCity = getDisplayValue(form.recipientPostalCity, '[PLZ Ort]');
  const city = getDisplayValue(form.city, '[Ort]');
  const formattedDate = getDisplayValue(formatGermanDate(form.letterDate), '[Datum]');
  const positionTitle = getDisplayValue(form.positionTitle, '[Positionsname]');
  const jobId = form.jobId.trim();
  const startDate = getDisplayValue(form.startDate, '[Startdatum]');
  const studyField = getDisplayValue(form.studyField, '[Studiengang]');
  const skills = getDisplayValue(form.skills, '[Skills]');
  const introParagraph = getDisplayValue(
    form.introParagraph,
    'mit großem Interesse bewerbe ich mich auf die ausgeschriebene Position.',
  );
  const motivationParagraph = getDisplayValue(
    form.motivationParagraph,
    'Ich arbeite eigenständig, strukturiert und freue mich darauf, mich schnell in neue Themen einzuarbeiten.',
  );

  const subject = jobId
    ? `Bewerbung als ${positionTitle} (Stellen-ID: ${jobId})`
    : `Bewerbung als ${positionTitle}`;

  return `${senderName}
${senderStreet}
${senderPostalCity}
${senderEmail}
${senderPhone}

${recipientCompany}
${recipientStreet}
${recipientPostalCity}

${city}, ${formattedDate}

Betreff: ${subject}

Sehr geehrte Damen und Herren,

${introParagraph}

Derzeit studiere ich ${studyField} und habe praktische Kenntnisse in ${skills}. Besonders reizvoll finde ich die Möglichkeit, in einem agilen Team an der Konzeption, Umsetzung und Integration von Software-Komponenten mitzuwirken.

${motivationParagraph}

Ein Einstieg ist für mich ${startDate} möglich. Über die Einladung zu einem persönlichen Gespräch freue ich mich sehr.

Mit freundlichen Grüßen

${senderName}`;
}

const INITIAL_FORM = {
  senderName: '',
  senderStreet: '',
  senderPostalCity: '',
  senderEmail: '',
  senderPhone: '',
  recipientCompany: 'ARAG SE',
  recipientStreet: 'ARAG-Platz 1',
  recipientPostalCity: '40472 Düsseldorf',
  city: 'Düsseldorf',
  letterDate: getTodayInputValue(),
  positionTitle: 'Werkstudent Softwareentwicklung',
  jobId: 'HR_DUS01946',
  startDate: 'ab sofort',
  studyField: 'Informatik',
  skills: 'Java, SQL, IntelliJ, Git, Gradle, JUnit5 und Python',
  introParagraph:
    'mit großem Interesse bewerbe ich mich auf die Werkstudentenstelle in der Softwareentwicklung. Besonders spannend finde ich die Mitarbeit bei Cloud-nativen Applikationen mit Spring-Frameworks sowie die Integration von Code-Änderungen mit Jenkins.',
  motivationParagraph:
    'Meine Begeisterung für moderne Software-Lösungen, neue Technologien und sauberes Teamwork bringe ich aktiv in die tägliche Zusammenarbeit ein.',
};

async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this environment.');
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.append(textArea);
  textArea.select();
  const didCopy = document.execCommand('copy');
  textArea.remove();

  if (!didCopy) {
    throw new Error('Copy command failed.');
  }
}

export default function CoverLetterStudioView() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [message, setMessage] = useState({ type: '', text: '' });
  const letterText = useMemo(() => buildCoverLetterText(form), [form]);

  function updateField(fieldName, value) {
    setForm((current) => ({
      ...current,
      [fieldName]: value,
    }));
  }

  async function handleCopyClick() {
    try {
      await copyTextToClipboard(letterText);
      setMessage({ type: 'success', text: 'Anschreiben in die Zwischenablage kopiert.' });
    } catch {
      setMessage({
        type: 'error',
        text: 'Kopieren war nicht möglich. Du kannst den Text aus der Vorschau manuell übernehmen.',
      });
    }
  }

  function handleDownloadClick() {
    const timestamp = getTodayInputValue();
    const rolePart = sanitizeFilePart(form.positionTitle.trim() || 'anschreiben');
    const blob = new Blob([letterText], { type: 'text/plain;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = `anschreiben-${rolePart}-${timestamp}.txt`;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
    setMessage({ type: 'success', text: 'Anschreiben als .txt exportiert.' });
  }

  return (
    <main className="content-grid cover-letter-layout">
      <section className="panel panel-highlight cover-letter-hero" aria-label="Bewerbungsstudio">
        <div className="section-heading">
          <div>
            <p className="section-label">Bewerbungsstudio</p>
            <h2>Klassisches Anschreiben im deutschen Stil</h2>
            <p className="section-body">
              Trage deine Daten ein, passe den Text an und exportiere das Ergebnis direkt als
              kopierfertiges Anschreiben.
            </p>
          </div>
        </div>
      </section>

      <section className="cover-letter-grid" aria-label="Anschreiben Builder">
        <article className="panel panel-highlight cover-letter-form-panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Formular</p>
              <h2>Angaben</h2>
            </div>
          </div>

          <div className="cover-letter-form-grid">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={form.senderName}
                onChange={(event) => updateField('senderName', event.target.value)}
                placeholder="Max Mustermann"
              />
            </label>
            <label className="field">
              <span>E-Mail</span>
              <input
                type="email"
                value={form.senderEmail}
                onChange={(event) => updateField('senderEmail', event.target.value)}
                placeholder="max@email.de"
              />
            </label>
            <label className="field">
              <span>Straße und Hausnummer</span>
              <input
                type="text"
                value={form.senderStreet}
                onChange={(event) => updateField('senderStreet', event.target.value)}
                placeholder="Musterstraße 12"
              />
            </label>
            <label className="field">
              <span>PLZ und Ort</span>
              <input
                type="text"
                value={form.senderPostalCity}
                onChange={(event) => updateField('senderPostalCity', event.target.value)}
                placeholder="12345 Musterstadt"
              />
            </label>
            <label className="field">
              <span>Telefon</span>
              <input
                type="text"
                value={form.senderPhone}
                onChange={(event) => updateField('senderPhone', event.target.value)}
                placeholder="0151 23456789"
              />
            </label>
            <label className="field">
              <span>Ort im Datumsblock</span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                placeholder="Düsseldorf"
              />
            </label>
            <label className="field">
              <span>Unternehmen</span>
              <input
                type="text"
                value={form.recipientCompany}
                onChange={(event) => updateField('recipientCompany', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Unternehmensadresse</span>
              <input
                type="text"
                value={form.recipientStreet}
                onChange={(event) => updateField('recipientStreet', event.target.value)}
              />
            </label>
            <label className="field">
              <span>PLZ und Ort (Unternehmen)</span>
              <input
                type="text"
                value={form.recipientPostalCity}
                onChange={(event) => updateField('recipientPostalCity', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Datum</span>
              <input
                type="date"
                value={form.letterDate}
                onChange={(event) => updateField('letterDate', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Position</span>
              <input
                type="text"
                value={form.positionTitle}
                onChange={(event) => updateField('positionTitle', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Stellen-ID</span>
              <input
                type="text"
                value={form.jobId}
                onChange={(event) => updateField('jobId', event.target.value)}
                placeholder="HR_DUS01946"
              />
            </label>
            <label className="field">
              <span>Startdatum</span>
              <input
                type="text"
                value={form.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                placeholder="ab sofort"
              />
            </label>
            <label className="field">
              <span>Studiengang</span>
              <input
                type="text"
                value={form.studyField}
                onChange={(event) => updateField('studyField', event.target.value)}
                placeholder="Informatik"
              />
            </label>
            <label className="field cover-letter-field-full">
              <span>Technische Skills</span>
              <input
                type="text"
                value={form.skills}
                onChange={(event) => updateField('skills', event.target.value)}
                placeholder="Java, SQL, IntelliJ, Git, Gradle, JUnit5, Python"
              />
            </label>
            <label className="field cover-letter-field-full">
              <span>Einleitung</span>
              <textarea
                value={form.introParagraph}
                onChange={(event) => updateField('introParagraph', event.target.value)}
              />
            </label>
            <label className="field cover-letter-field-full">
              <span>Motivationsabsatz</span>
              <textarea
                value={form.motivationParagraph}
                onChange={(event) => updateField('motivationParagraph', event.target.value)}
              />
            </label>
          </div>
        </article>

        <article className="panel panel-highlight cover-letter-preview-panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Live-Vorschau</p>
              <h2>Anschreiben</h2>
            </div>
          </div>

          <div className="cover-letter-preview-card">
            <pre className="cover-letter-preview-text">{letterText}</pre>
          </div>

          <div className="actions cover-letter-actions">
            <button type="button" className="primary-button" onClick={handleCopyClick}>
              Anschreiben kopieren
            </button>
            <button type="button" className="secondary-button" onClick={handleDownloadClick}>
              Als .txt exportieren
            </button>
          </div>

          {message.text && (
            <p
              className={message.type === 'error' ? 'feedback error' : 'feedback success'}
              role={message.type === 'error' ? 'alert' : 'status'}
              aria-live={message.type === 'error' ? 'assertive' : 'polite'}
            >
              {message.text}
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
