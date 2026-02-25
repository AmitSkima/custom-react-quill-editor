import Quill, { Delta, type QuillOptions } from "quill";

import { QuillHighlightBlot } from "@/utils/editor/QuillHighlightBlot";
import { QuillPlaceholderBlot } from "@/utils/editor/QuillPlaceholderBlot";
import { findTextRangesInDelta } from "@/utils/editor/highlightUtils";

export interface ReactQuillWrapperEditorBlotConfig {
  enablePlaceholderBlot?: boolean;
  enableHighlightBlot?: boolean;
}

export interface ReactQuillWrapperInsertPlaceholderOptions {
  key: string;
  label?: string;
}

export type HighlightTooltipPlacement = "top" | "bottom" | "left" | "right";

export interface ReactQuillWrapperHighlightTextItem {
  text: string;
  textColor: string;
  highlightColor: string;
  hoverTextTooltip?: string;
  /** Placement of the custom tooltip relative to the highlight. Default: "top".
   * The blot flips placement (e.g. top → bottom) or clamps position if the tooltip would go outside the viewport.
   */
  hoverTooltipPlacement?: HighlightTooltipPlacement;
}

/**
 * The default editor blot configuration.
 */
export const DEFAULT_EDITOR_BLOTS: ReactQuillWrapperEditorBlotConfig = {
  enablePlaceholderBlot: true,
  enableHighlightBlot: true,
};

/**
 * Quill subclass that adds insertPlaceholder() so callers don't need
 * to reference the blot name or use insertEmbed directly.
 */
export class ReactQuillWrapper extends Quill {
  private editorBlotConfig: ReactQuillWrapperEditorBlotConfig;
  private highlightText: ReactQuillWrapperHighlightTextItem[] = [];
  constructor(
    container: HTMLElement,
    options: QuillOptions,
    editorBlotConfig: ReactQuillWrapperEditorBlotConfig = DEFAULT_EDITOR_BLOTS,
    highlightText?: ReactQuillWrapperHighlightTextItem[],
  ) {
    super(container, options);
    this.editorBlotConfig = editorBlotConfig;
    this.highlightText = highlightText ?? [];
  }

  /**
   * Serialize storage HTML into editor-ready HTML. Each enabled blot converts its own token/markup
   * via static editorHtmlFromStorage (placeholders → {{KEY}} to span; highlights → data-highlight + highlightText wrap).
   */
  public serialize(html: string): string {
    if (!html) return "";
    let out = html;
    if (this.editorBlotConfig.enablePlaceholderBlot) {
      out = QuillPlaceholderBlot.editorHtmlFromStorage(out);
    }
    if (this.editorBlotConfig.enableHighlightBlot) {
      out = QuillHighlightBlot.editorHtmlFromStorage(out, {
        highlightText: this.highlightText,
      });
    }
    return out;
  }

  /**
   * Deserialize editor HTML for storage. Each enabled blot converts its own markup to storage form
   * via static storageFromEditorHtml (placeholder span → {{KEY}}; highlight span → plain text).
   * Normalizes &nbsp; to space.
   */
  public deserialize(html?: string): string {
    let out = html ?? this.getSemanticHTML();
    if (this.editorBlotConfig.enablePlaceholderBlot) {
      out = QuillPlaceholderBlot.storageFromEditorHtml(out);
    }
    if (this.editorBlotConfig.enableHighlightBlot) {
      out = QuillHighlightBlot.storageFromEditorHtml(out);
    }
    out = out.replace(/&nbsp;/g, " ");
    return out;
  }

  /**
   * Load HTML into the editor. Serialize does all work (placeholders, highlight tokens, highlightText).
   */
  public loadHtml(html: string): void {
    const serialized = this.serialize(html);
    const delta = this.clipboard.convert({ html: serialized });
    this.setContents(delta);
  }

  /**
   * Set the highlight text for the editor.
   * @param highlightText - The highlight text to set.
   *
   * @example
   * ```ts
   * const highlightText: HighlightTextItem[] = [
   *   { text: "Hello", textColor: "red", highlightColor: "yellow" },
   *   { text: "World", textColor: "blue", highlightColor: "green" },
   * ];
   * quill.setHighlightText(highlightText);
   * ```
   */
  public setHighlightText(
    highlightText: ReactQuillWrapperHighlightTextItem[],
  ): void {
    this.highlightText = highlightText ?? [];
  }

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

  /**
   * Find all occurrences of each item's text and apply the highlight blot (editable styled text).
   * Apply in reverse order by index so earlier ranges are not shifted.
   */
  public applyHighlights(
    highlightText: ReactQuillWrapperHighlightTextItem[],
  ): void {
    if (!this.editorBlotConfig.enableHighlightBlot || !highlightText?.length)
      return;

    const delta = this.getContents();
    const rangesByIndex: Array<{
      index: number;
      length: number;
      value: {
        textColor: string;
        highlightColor: string;
        hoverTextTooltip?: string;
        hoverTooltipPlacement?: HighlightTooltipPlacement;
      };
    }> = [];

    for (const item of highlightText) {
      if (!item.text?.trim()) continue;
      const matches = findTextRangesInDelta(delta, item.text);
      for (const { index, length } of matches) {
        rangesByIndex.push({
          index,
          length,
          value: {
            textColor: item.textColor,
            highlightColor: item.highlightColor,
            hoverTextTooltip: item.hoverTextTooltip,
            hoverTooltipPlacement: item.hoverTooltipPlacement,
          },
        });
      }
    }

    // Sort by index descending so applying format doesn't affect subsequent indices
    rangesByIndex.sort((a, b) => b.index - a.index);

    for (const { index, length, value } of rangesByIndex) {
      this.formatText(
        index,
        length,
        QuillHighlightBlot.blotName,
        value,
        "silent",
      );
    }
  }

  public renderEditor() {
    const html = this.getSemanticHTML();
    this.loadHtml(html);
  }
}
