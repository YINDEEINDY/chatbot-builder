import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user message content to prevent XSS
 * Removes all HTML tags
 */
export function sanitizeMessage(text: string): string {
  if (!text) return '';

  return sanitizeHtml(text, {
    allowedTags: [], // No HTML allowed
    allowedAttributes: {},
  });
}

/**
 * Escape template syntax to prevent template injection
 * Converts {{ to { { so user input can't inject variables
 */
export function escapeForTemplate(text: string): string {
  if (!text) return '';

  return text
    .replace(/\{\{/g, '{ {')
    .replace(/\}\}/g, '} }');
}
