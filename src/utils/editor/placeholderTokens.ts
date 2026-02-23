/**
 * Placeholder token format: {{KEY}} in HTML strings.
 * In the editor these render as placeholder blots; in the value they stay as {{KEY}}.
 */

const PLACEHOLDER_TOKEN_REGEX = /\{\{([^}]+)\}\}/g;

/** HTML pattern for placeholder blot span (data-key in any order). */
const PLACEHOLDER_BLOT_REGEX =
  /<span(?=[^>]*\bclass="[^"]*ql-placeholder[^"]*")(?=[^>]*\bdata-key="([^"]*)")[^>]*>[\s\S]*?<\/span>/g;

/**
 * Preprocesses HTML containing {{KEY}} tokens into HTML that uses
 * the placeholder blot span so clipboard.convert produces placeholder embeds.
 */
export function htmlWithPlaceholderTokensToHtml(html: string): string {
  return html.replace(PLACEHOLDER_TOKEN_REGEX, (_, key) => {
    const k = key.trim();
    return `<span class="ql-placeholder" data-key="${k}" data-label="${k}" contenteditable="false">${k}</span>`;
  });
}

/**
 * Replaces placeholder blot spans in semantic HTML with {{KEY}} tokens.
 * Use this so the stored value uses {{XXX}} instead of blot markup.
 */
export function semanticHtmlToPlaceholderTokens(html: string): string {
  return html.replace(PLACEHOLDER_BLOT_REGEX, "{{$1}}");
}
