const MALFORMED_MATERIAL_SYMBOL_FILL_STYLE =
  /<span\b(?=[^>]*\bmaterial-symbols-outlined\b)[^>]*\bstyle="font-variation-settings:\s*"[^>]*>/gi;

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

export function findStitchHtmlIssues(html, filePath = '') {
  if (typeof html !== 'string') {
    return [
      {
        filePath,
        line: 1,
        message: 'Stitch HTML content must be a string.',
      },
    ];
  }

  return [...html.matchAll(MALFORMED_MATERIAL_SYMBOL_FILL_STYLE)].map((match) => ({
    filePath,
    line: getLineNumber(html, match.index ?? 0),
    message: 'Material Symbols fill style attribute is malformed.',
  }));
}
