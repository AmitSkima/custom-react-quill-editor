/**
 * Render the HTML with escaped spaces.
 *
 * Used to show the HTML preview in a readable format.
 *
 * @param html - The HTML to render.
 * @returns The HTML with escaped spaces.
 *
 * @example
 * ```ts
 * const html = "<p>Hello world</p>";
 * const escapedHtml = renderHtmlWithEscapedSpaces(html);
 * console.log(escapedHtml); // <p>Hello&nbsp;world</p>
 * ```
 */
export function renderHtmlWithEscapedSpaces(html: string): string {
  return html.replaceAll(" ", "&nbsp;");
}
