import Inline from "quill/blots/inline";

export type HighlightTooltipPlacement = "top" | "bottom" | "left" | "right";

export interface HighlightBlotValue {
  textColor: string;
  highlightColor: string;
  hoverTextTooltip?: string;
  hoverTooltipPlacement?: HighlightTooltipPlacement;
}

const TOOLTIP_PLACEMENT_ATTR = "data-tooltip-placement";
const TOOLTIP_TEXT_ATTR = "data-hover-tooltip";
const TOOLTIP_OFFSET = 8;
const TOOLTIP_CLASS = "ql-editor-highlight-tooltip";

function getTooltipStyles(
  placement: HighlightTooltipPlacement,
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
  HighlightTooltipPlacement,
  HighlightTooltipPlacement
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
  let placement: HighlightTooltipPlacement =
    (node.getAttribute(TOOLTIP_PLACEMENT_ATTR) as HighlightTooltipPlacement) ||
    "top";
  const rect = node.getBoundingClientRect();
  const doc = node.ownerDocument;
  const el = doc.createElement("div");
  el.className = TOOLTIP_CLASS;
  el.setAttribute("role", "tooltip");
  el.textContent = text;
  doc.body.appendChild(el);
  (node as HTMLElement & { _tooltipEl?: HTMLDivElement })._tooltipEl = el;

  let styles = getTooltipStyles(placement, rect);
  Object.assign(el.style, styles);
  if (!isTooltipInViewport(el, doc)) {
    placement = PLACEMENT_OPPOSITE[placement];
    styles = getTooltipStyles(placement, rect);
    Object.assign(el.style, styles);
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

/**
 * Inline blot for highlighted text. The text remains editable; only styling is applied.
 * Tooltip is shown on hover via a div appended to body (data-hover-tooltip, data-tooltip-placement).
 */
export class QuillHighlightBlot extends Inline {
  static blotName = "highlight";
  static tagName = "span";
  static className = "ql-highlight";

  static create(value: HighlightBlotValue) {
    const node = super.create() as HTMLElement;
    if (value && typeof value === "object") {
      node.style.backgroundColor = value.highlightColor ?? "";
      node.style.color = value.textColor ?? "";
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

  static formats(node: HTMLElement): HighlightBlotValue {
    const placement = node.getAttribute(TOOLTIP_PLACEMENT_ATTR);
    return {
      textColor: node.style.color || "",
      highlightColor: node.style.backgroundColor || "",
      hoverTextTooltip: node.getAttribute(TOOLTIP_TEXT_ATTR) ?? undefined,
      hoverTooltipPlacement: placement as HighlightTooltipPlacement | undefined,
    };
  }

  format(name: string, value: HighlightBlotValue) {
    if (
      name === (this.constructor as typeof QuillHighlightBlot).blotName &&
      value
    ) {
      const el = this.domNode as HTMLElement;
      el.style.backgroundColor = value.highlightColor ?? "";
      el.style.color = value.textColor ?? "";
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
      super.format(name, value);
    }
  }
}
