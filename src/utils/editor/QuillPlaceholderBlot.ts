import Embed from "quill/blots/embed";

/**
 * The placeholder blot for the Quill editor
 */
export class QuillPlaceholderBlot extends Embed {
  static blotName = "placeholder";
  static tagName = "span";
  static className = "ql-placeholder";

  static create(value: { key: string; label?: string }) {
    const node = super.create() as HTMLElement;

    node.setAttribute("data-key", value.key);
    const _formattedLabel = value.label ?? value.key;
    node.setAttribute("data-label", _formattedLabel);
    node.setAttribute("contenteditable", "false");
    node.textContent = _formattedLabel;

    return node;
  }

  static value(node: HTMLElement) {
    return {
      key: node.getAttribute("data-key")!,
      label: node.getAttribute("data-label") || node.textContent || "",
    };
  }
}
