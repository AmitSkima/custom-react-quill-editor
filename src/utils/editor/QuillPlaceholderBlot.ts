import Embed from "quill/blots/embed";
import {
  htmlWithPlaceholderTokensToHtml,
  semanticHtmlToPlaceholderTokens,
} from "@/utils/editor/placeholderTokens";

/**
 * Placeholder blot for the Quill editor.
 * Defines how it is stored ({{KEY}}) and how storage is converted back for the editor.
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

  /** Editor HTML (blot markup) → storage HTML ({{KEY}} tokens). */
  static storageFromEditorHtml(html: string): string {
    return semanticHtmlToPlaceholderTokens(html);
  }

  /** Storage HTML ({{KEY}} tokens) → editor HTML (blot markup) for clipboard.convert. */
  static editorHtmlFromStorage(html: string): string {
    return htmlWithPlaceholderTokensToHtml(html);
  }
}
