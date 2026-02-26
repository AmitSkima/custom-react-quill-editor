/**
 * Highlight token format: normalized spans with data-highlight, data-text-color, data-highlight-color.
 * Converts semantic HTML from the editor (ql-highlight spans with inline styles) into this
 * storage-friendly form so the saved value doesn't depend on Quill's exact style serialization.
 */

/** Matches ql-highlight span with style attribute; captures style and inner content. */
const HIGHLIGHT_BLOT_REGEX =
  /<span(?=[^>]*\bclass="[^"]*ql-highlight[^"]*")(?=[^>]*\bstyle="([^"]*)")[^>]*>([\s\S]*?)<\/span>/g;

/**
 * Matches a span with style attribute that does not have data-highlight.
 * Used to strip Quill's style-only wrapper around an inner data-highlight span,
 * or to convert a style-only highlight span to our token form.
 */
const HIGHLIGHT_STYLE_ONLY_REGEX =
  /<span(?=[^>]*\bstyle="([^"]*)")(?![^>]*\bdata-highlight\b)[^>]*>([\s\S]*?)<\/span>/g;

function parseColorFromStyle(style: string): {
  textColor: string;
  highlightColor: string;
} {
  let textColor = "";
  let highlightColor = "";
  const colorMatch = style.match(/\bcolor\s*:\s*([^;]+)/i);
  const bgMatch = style.match(/\bbackground(?:-color)?\s*:\s*([^;]+)/i);
  if (colorMatch) textColor = colorMatch[1].trim();
  if (bgMatch) highlightColor = bgMatch[1].trim();
  return { textColor, highlightColor };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Matches token span with data-highlight and color attributes (any order). */
const HIGHLIGHT_TOKEN_REGEX =
  /<span(?=[^>]*\bdata-highlight\b)(?=[^>]*\bdata-text-color="([^"]*)")(?=[^>]*\bdata-highlight-color="([^"]*)")[^>]*>([\s\S]*?)<\/span>/g;

/**
 * Converts highlight token spans (data-highlight, data-text-color, data-highlight-color)
 * into ql-highlight spans with inline styles so clipboard.convert produces highlight blots.
 */
export function htmlWithHighlightTokensToHtml(html: string): string {
  return html.replace(
    HIGHLIGHT_TOKEN_REGEX,
    (_, textColorAttr, highlightColorAttr, innerContent) => {
      const textColor = unescapeAttr(textColorAttr);
      const highlightColor = unescapeAttr(highlightColorAttr);
      const style = [
        textColor && `color: ${textColor}`,
        highlightColor && `background-color: ${highlightColor}`,
      ]
        .filter(Boolean)
        .join("; ");
      return `<span class="ql-highlight" style="${escapeAttr(style)}">${innerContent}</span>`;
    },
  );
}

/** True if style string has both color and background. */
function styleHasHighlightColors(style: string): boolean {
  const { textColor, highlightColor } = parseColorFromStyle(style);
  return Boolean(textColor && highlightColor);
}

/**
 * Strips all highlight markup from semantic HTML and returns the inner text only.
 * Deserialized value matches the original: no data-highlight, no style spans – just plain HTML.
 * (Like placeholder: we replace the blot with the "stored" form; for highlights the stored form is the bare text.)
 */
export function semanticHtmlToHighlightTokens(html: string): string {
  let out = html;
  let prev: string;
  do {
    prev = out;
    // Unwrap ql-highlight span → inner content only
    out = out.replace(
      HIGHLIGHT_BLOT_REGEX,
      (_, _styleAttr, innerContent) => innerContent,
    );
    // Unwrap data-highlight span → inner content only
    out = out.replace(
      /<span(?=[^>]*\bdata-highlight\b)[^>]*>([\s\S]*?)<\/span>/g,
      (_, innerContent) => innerContent,
    );
    // Unwrap style-only highlight wrapper → inner content only
    out = out.replace(
      HIGHLIGHT_STYLE_ONLY_REGEX,
      (_, styleAttr: string, innerContent: string) =>
        styleHasHighlightColors(styleAttr) ? innerContent : _,
    );
  } while (out !== prev);
  return out;
}

export type HighlightTooltipPlacement = "top" | "bottom" | "left" | "right";

export interface HighlightTextItem {
  text: string;
  textColor: string;
  highlightColor: string;
  hoverTextTooltip?: string;
  hoverTooltipPlacement?: HighlightTooltipPlacement;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wraps each occurrence of item.text in the HTML with a ql-highlight span.
 * Used during serialize when loading raw HTML with a highlightText list.
 * Longer strings are replaced first to avoid overlapping matches.
 */
export function htmlWithHighlightText(
  html: string,
  highlightText: HighlightTextItem[],
): string {
  if (!highlightText?.length) return html;
  const sorted = [...highlightText].filter(
    (item) => item.text?.trim().length > 0,
  );
  if (sorted.length === 0) return html;
  // Replace longer strings first so "Hello world" is wrapped before "Hello"
  sorted.sort((a, b) => b.text.length - a.text.length);

  let out = html;
  for (const item of sorted) {
    const pattern = new RegExp(escapeRegex(item.text), "g");
    const style = [
      item.textColor && `color: ${item.textColor}`,
      item.highlightColor && `background-color: ${item.highlightColor}`,
    ]
      .filter(Boolean)
      .join("; ");
    const tooltipAttrs = [];
    if (item.hoverTextTooltip != null && item.hoverTextTooltip !== "") {
      tooltipAttrs.push(
        `data-hover-tooltip="${escapeAttr(item.hoverTextTooltip)}"`,
      );
      if (item.hoverTooltipPlacement) {
        tooltipAttrs.push(
          `data-tooltip-placement="${escapeAttr(item.hoverTooltipPlacement)}"`,
        );
      }
    }
    const tooltipAttrStr = tooltipAttrs.length
      ? " " + tooltipAttrs.join(" ")
      : "";
    const replacement = `<span class="ql-highlight" style="${escapeAttr(style)}"${tooltipAttrStr}>${escapeHtml(item.text)}</span>`;
    out = out.replace(pattern, replacement);
  }
  return out;
}
