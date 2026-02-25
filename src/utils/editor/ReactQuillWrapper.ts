import Quill, { Delta, type QuillOptions } from "quill";

import { QuillPlaceholderBlot } from "@/utils/editor/QuillPlaceholderBlot";
import type { EditorBlotConfig } from "@/components/ReactQuillEditor";
import { initializeEditorContent } from "./initializeEditorContent";

export interface ReactQuillWrapperInsertPlaceholderOptions {
  key: string;
  label?: string;
}

/**
 * Quill subclass that adds insertPlaceholder() so callers don't need
 * to reference the blot name or use insertEmbed directly.
 */
export class ReactQuillWrapper extends Quill {
  constructor(
    container: HTMLElement,
    options: QuillOptions,
    editorBlotConfig: EditorBlotConfig,
  ) {
    super(container, options);
    this.editorBlotConfig = editorBlotConfig;
  }
  private editorBlotConfig: EditorBlotConfig;
  /**
   * Insert a placeholder embed at the given index (or at the current selection).
   * @param options - { key } required; { label } optional (defaults to key)
   * @param index - Optional index; if omitted, uses current selection index or end of document
   * @returns The delta resulting from the insert
   */
  public insertPlaceholder(
    options: ReactQuillWrapperInsertPlaceholderOptions,
    index?: number,
  ): Delta {
    const at = index ?? this.getSelection()?.index ?? this.getLength();
    const value = {
      key: options.key,
      label: options.label ?? options.key,
    };
    // +1 is to move the cursor after the placeholder token.
    // [Note]: Whole blot is considered as 1 token.
    this.setSelection(at + 1);
    return this.insertEmbed(at, QuillPlaceholderBlot.blotName, value);
  }

  public loadHtml(html: string) {
    initializeEditorContent(this, html, this.editorBlotConfig);
  }
}
