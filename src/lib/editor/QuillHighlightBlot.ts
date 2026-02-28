import Inline from "quill/blots/inline";
import {
  htmlWithHighlightText,
  htmlWithHighlightTokensToHtml,
  semanticHtmlToHighlightTokens,
} from "@/lib/editor/highlightTokens";
import type { HighlightTextItem } from "@/lib/editor/highlightTokens";

export type QuillHighlightBlotTooltipPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right";

/** Inline CSS for HTML; keys are CSS property names (e.g. "background-color", "color"). */
export type CssStyleObject = Record<string, string>;

function applyStyles(
  node: HTMLElement,
  styles: CssStyleObject | undefined,
): void {
  if (!styles) return;
  for (const key of Object.keys(styles)) {
    node.style.setProperty(key, styles[key]);
  }
}

export interface QuillHighlightBlotValue {
  /** Optional id for this highlight (e.g. filter id). Emitted in quill-highlight-hover event on hover. */
  highlightId?: string;
  hoverTextTooltip?: string;
  hoverTooltipPlacement?: QuillHighlightBlotTooltipPlacement;
  /** Inline CSS for the ql-highlight span (e.g. { "background-color": "#E6F7FF", "color": "#096DD9" }). Not used for identification or token serialize/deserialize. */
  styles?: CssStyleObject;
}

/** Custom event detail when user hovers a highlight that has highlightId. */
export interface QuillHighlightHoverEventDetail {
  highlightId: string;
}

/** Event name to listen for; fired when user hovers a highlight span that has data-highlight-id. */
export const QUILL_HIGHLIGHT_HOVER_EVENT = "quill-highlight-hover";

const TOOLTIP_PLACEMENT_ATTR = "data-tooltip-placement";
const TOOLTIP_TEXT_ATTR = "data-hover-tooltip";
const HIGHLIGHT_ID_ATTR = "data-highlight-id";
const TOOLTIP_OFFSET = 8;
const TOOLTIP_CLASS = "ql-editor-highlight-tooltip";

function getTooltipStyles(
  placement: QuillHighlightBlotTooltipPlacement,
  rect: DOMRect,
): Partial<CSSStyleDeclaration> {
  const base: Partial<CSSStyleDeclaration> = {
    position: "fixed",
    zIndex: "9999",
    pointerEvents: "none",
  };
  switch (placement) {
    case "top":
      return {
        ...base,
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top}px`,
        transform: `translate(-50%, calc(-100% - ${TOOLTIP_OFFSET}px))`,
      };
    case "bottom":
      return {
        ...base,
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom}px`,
        transform: `translate(-50%, ${TOOLTIP_OFFSET}px)`,
      };
    case "left":
      return {
        ...base,
        left: `${rect.left}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: `translate(calc(-100% - ${TOOLTIP_OFFSET}px), -50%)`,
      };
    case "right":
      return {
        ...base,
        left: `${rect.right}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: `translate(${TOOLTIP_OFFSET}px, -50%)`,
      };
    default:
      return {
        ...base,
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top}px`,
        transform: `translate(-50%, calc(-100% - ${TOOLTIP_OFFSET}px))`,
      };
  }
}

const PLACEMENT_OPPOSITE: Record<
  QuillHighlightBlotTooltipPlacement,
  QuillHighlightBlotTooltipPlacement
> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function isTooltipInViewport(el: HTMLElement, doc: Document): boolean {
  const rect = el.getBoundingClientRect();
  const vw = doc.documentElement.clientWidth;
  const vh = doc.documentElement.clientHeight;
  const pad = 4;
  return (
    rect.left >= pad &&
    rect.right <= vw - pad &&
    rect.top >= pad &&
    rect.bottom <= vh - pad
  );
}

function showTooltip(node: HTMLElement): void {
  const text = node.getAttribute(TOOLTIP_TEXT_ATTR);
  if (!text) return;
  hideTooltip(node);
  const highlightId = node.getAttribute(HIGHLIGHT_ID_ATTR);
  if (highlightId) {
    document.dispatchEvent(
      new CustomEvent(QUILL_HIGHLIGHT_HOVER_EVENT, {
        bubbles: true,
        detail: { highlightId, node } as QuillHighlightHoverEventDetail,
      }),
    );
  }
  let placement: QuillHighlightBlotTooltipPlacement =
    (node.getAttribute(
      TOOLTIP_PLACEMENT_ATTR,
    ) as QuillHighlightBlotTooltipPlacement) || "top";
  const rect = node.getBoundingClientRect();
  const doc = node.ownerDocument;
  const el = doc.createElement("div");
  el.className = TOOLTIP_CLASS;
  el.setAttribute("role", "tooltip");
  el.setAttribute("data-placement", placement);
  el.textContent = text;
  doc.body.appendChild(el);
  (node as HTMLElement & { _tooltipEl?: HTMLDivElement })._tooltipEl = el;

  let styles = getTooltipStyles(placement, rect);
  Object.assign(el.style, styles);
  el.setAttribute("data-placement", placement);
  if (!isTooltipInViewport(el, doc)) {
    placement = PLACEMENT_OPPOSITE[placement];
    styles = getTooltipStyles(placement, rect);
    Object.assign(el.style, styles);
    el.setAttribute("data-placement", placement);
  }
  if (!isTooltipInViewport(el, doc)) {
    const tooltipRect = el.getBoundingClientRect();
    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    const left = Math.max(
      4,
      Math.min(tooltipRect.left, vw - tooltipRect.width - 4),
    );
    const top = Math.max(
      4,
      Math.min(tooltipRect.top, vh - tooltipRect.height - 4),
    );
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.transform = "none";
    /* Arrow hidden when position is clamped (no clear target) */
    el.removeAttribute("data-placement");
  }

  const scrollEl = node.closest(".ql-editor");
  scrollEl?.addEventListener("scroll", () => hideTooltip(node), { once: true });
}

function hideTooltip(node: HTMLElement): void {
  const el = (node as HTMLElement & { _tooltipEl?: HTMLDivElement })._tooltipEl;
  if (el?.parentNode) {
    el.parentNode.removeChild(el);
  }
  (node as HTMLElement & { _tooltipEl?: HTMLDivElement })._tooltipEl =
    undefined;
}

/** Context passed when converting storage HTML to editor HTML (e.g. highlightText for wrapping). */
export interface HighlightStorageContext {
  highlightText?: HighlightTextItem[];
}

/**
 * Inline blot for highlighted text. The text remains editable; only styling is applied.
 * Tooltip is shown on hover via a div appended to body (data-hover-tooltip, data-tooltip-placement).
 * Defines how it is stored (plain text, no highlight markup) and how storage is converted for the editor.
 */
export class QuillHighlightBlot extends Inline {
  static blotName = "highlight";
  static tagName = "span";
  static className = "ql-highlight";

  /** Editor HTML (blot markup) → storage HTML (highlight spans stripped to inner text). */
  static storageFromEditorHtml(html: string): string {
    return semanticHtmlToHighlightTokens(html);
  }

  /** Storage HTML → editor HTML (data-highlight tokens → blot markup; optional highlightText wrap). */
  static editorHtmlFromStorage(
    html: string,
    context?: HighlightStorageContext,
  ): string {
    let out = htmlWithHighlightTokensToHtml(html);
    if (context?.highlightText?.length) {
      out = htmlWithHighlightText(out, context.highlightText);
    }
    return out;
  }

  static create(value: QuillHighlightBlotValue) {
    const node = super.create() as HTMLElement;
    if (value && typeof value === "object") {
      applyStyles(node, value.styles);
      if (value.highlightId != null && value.highlightId !== "") {
        node.setAttribute(HIGHLIGHT_ID_ATTR, value.highlightId);
      }
      if (value.hoverTextTooltip != null && value.hoverTextTooltip !== "") {
        node.setAttribute(TOOLTIP_TEXT_ATTR, value.hoverTextTooltip);
        if (value.hoverTooltipPlacement) {
          node.setAttribute(
            TOOLTIP_PLACEMENT_ATTR,
            value.hoverTooltipPlacement,
          );
        }
        node.addEventListener("mouseenter", () => showTooltip(node));
        node.addEventListener("mouseleave", () => hideTooltip(node));
      }
    }

    return node;
  }

  static formats(node: HTMLElement): QuillHighlightBlotValue {
    const placement = node.getAttribute(TOOLTIP_PLACEMENT_ATTR);
    const highlightId = node.getAttribute(HIGHLIGHT_ID_ATTR);
    return {
      highlightId: highlightId ?? undefined,
      hoverTextTooltip: node.getAttribute(TOOLTIP_TEXT_ATTR) ?? undefined,
      hoverTooltipPlacement: placement as
        | QuillHighlightBlotTooltipPlacement
        | undefined,
    };
  }

  format(name: string, value: QuillHighlightBlotValue) {
    const self = this.constructor as typeof QuillHighlightBlot;
    if (name !== self.blotName) {
      super.format(name, value);
      return;
    }
    const el = this.domNode as HTMLElement;
    if (value) {
      applyStyles(el, value.styles);
      if (value.highlightId != null && value.highlightId !== "") {
        el.setAttribute(HIGHLIGHT_ID_ATTR, value.highlightId);
      } else {
        el.removeAttribute(HIGHLIGHT_ID_ATTR);
      }
      if (value.hoverTextTooltip != null && value.hoverTextTooltip !== "") {
        el.setAttribute(TOOLTIP_TEXT_ATTR, value.hoverTextTooltip);
        if (value.hoverTooltipPlacement) {
          el.setAttribute(TOOLTIP_PLACEMENT_ATTR, value.hoverTooltipPlacement);
        } else {
          el.removeAttribute(TOOLTIP_PLACEMENT_ATTR);
        }
      } else {
        el.removeAttribute(TOOLTIP_TEXT_ATTR);
        el.removeAttribute(TOOLTIP_PLACEMENT_ATTR);
      }
    } else {
      // Removing highlight: clear styles and tooltip attrs
      el.style.cssText = "";
      el.removeAttribute(HIGHLIGHT_ID_ATTR);
      el.removeAttribute(TOOLTIP_TEXT_ATTR);
      el.removeAttribute(TOOLTIP_PLACEMENT_ATTR);
    }
    super.format(name, value);
  }

  /**
   * Ensure any active tooltip is removed when the blot is detached
   * (e.g. when the highlighted text is deleted or the inline is removed).
   */
  detach() {
    hideTooltip(this.domNode as HTMLElement);
    // Call the base implementation to complete detachment.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - detach exists on the underlying Inline/Parchment blot at runtime.
    super.detach();
  }
}
