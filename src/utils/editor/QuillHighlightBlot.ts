import Inline from "quill/blots/inline";

export interface HighlightBlotValue {
  textColor: string;
  highlightColor: string;
}

/**
 * Inline blot for highlighted text. The text remains editable; only styling is applied.
 * Value: { textColor, highlightColor }.
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
    }
    return node;
  }

  static formats(node: HTMLElement): HighlightBlotValue {
    return {
      textColor: node.style.color || "",
      highlightColor: node.style.backgroundColor || "",
    };
  }

  format(name: string, value: HighlightBlotValue) {
    if (
      name === (this.constructor as typeof QuillHighlightBlot).blotName &&
      value
    ) {
      (this.domNode as HTMLElement).style.backgroundColor =
        value.highlightColor ?? "";
      (this.domNode as HTMLElement).style.color = value.textColor ?? "";
    } else {
      super.format(name, value);
    }
  }
}
