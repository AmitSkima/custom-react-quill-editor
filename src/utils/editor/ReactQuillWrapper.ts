import Quill, { Delta } from "quill";

import { QuillPlaceholderBlot } from "@/utils/editor/QuillPlaceholderBlot";

export interface ReactQuillWrapperInsertPlaceholderOptions {
  key: string;
  label?: string;
}

/**
 * Quill subclass that adds insertPlaceholder() so callers don't need
 * to reference the blot name or use insertEmbed directly.
 */
export class ReactQuillWrapper extends Quill {
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
    return this.insertEmbed(at, QuillPlaceholderBlot.blotName, value);
  }
}
