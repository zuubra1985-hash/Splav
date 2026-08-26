/**
 * Markdown escaping utilities for Telegram bot integration and text rendering.
 * Prevents injection of markdown control characters from untrusted user inputs.
 */

/**
 * Escapes characters for Telegram legacy Markdown mode: _ * ` [ ] ( )
 */
export function escapeMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  return String(text).replace(/([_*`\[\]()])/g, '\\$1');
}

/**
 * Escapes characters for Telegram MarkdownV2 mode: _ * [ ] ( ) ~ ` > # + - = | { } . ! \
 */
export function escapeMarkdownV2(text: string | null | undefined): string {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
