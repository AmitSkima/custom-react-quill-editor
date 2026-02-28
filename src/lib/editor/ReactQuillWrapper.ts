import Quill, { Delta, type QuillOptions } from "quill";

import { QuillHighlightBlot } from "@/lib/editor/QuillHighlightBlot";
import { QuillPlaceholderBlot } from "@/lib/editor/QuillPlaceholderBlot";
import { findTextRangesInDelta } from "@/lib/editor/highlightUtils";

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
  /** The text to highlight. Matching is case sensitive unless caseInsensitive is true. */
  text: string;
  /** When true, matches text regardless of case (e.g. "hello" matches "Hello", "HELLO"). Default: false. */
  caseInsensitive?: boolean;
  hoverTextTooltip?: string;
  /** Placement of the custom tooltip relative to the highlight. Default: "top".
   * The blot flips placement (e.g. top → bottom) or clamps position if the tooltip would go outside the viewport.
   */
  hoverTooltipPlacement?: HighlightTooltipPlacement;
  /** Optional id for this highlight (e.g. filter id). Emitted in quill-highlight-hover event on hover so you can scroll/flash the corresponding row. */
  highlightId?: string;
  /** Inline CSS for the ql-highlight span (e.g. { "background-color": "#E6F7FF", "color": "#096DD9" }). Not used for identification or serialize/deserialize. */
  styles?: Record<string, string>;
}

/**
 * The default editor blot configuration.
 */
export const DEFAULT_EDITOR_BLOTS: ReactQuillWrapperEditorBlotConfig = {
  enablePlaceholderBlot: true,
  enableHighlightBlot: true,
};

/**
 * The React Quill Wrapper class.
 *
 * Has extra features for inserting placeholders and highlights.
 * @example
 * ```ts
 * const quill = new ReactQuillWrapper(container, options, editorBlotConfig, highlightText);
 * quill.insertPlaceholder({ key: "CANDIDATE_NAME" });
 * quill.applyHighlights(highlightText);
 * ```
 */
export class ReactQuillWrapper extends Quill {
  private editorBlotConfig: ReactQuillWrapperEditorBlotConfig;
  private highlightText: ReactQuillWrapperHighlightTextItem[] = [];
  constructor(
    container: HTMLElement,
    options: QuillOptions,
    editorBlotConfig: ReactQuillWrapperEditorBlotConfig = DEFAULT_EDITOR_BLOTS,
  ) {
    super(container, options);
    this.editorBlotConfig = editorBlotConfig;
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
    out = out.replaceAll("&nbsp;", " ");
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
   * @param highlightText

   * ```
   */
  public setHighlightText(
    highlightText: ReactQuillWrapperHighlightTextItem[],
  ): void {
    this.highlightText = highlightText ?? [];
  }

  /**
   * Get the highlight text for the editor.
   * @returns The highlight text.
   */
  public getHighlightText(): ReactQuillWrapperHighlightTextItem[] {
    return this.highlightText;
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

    this.setHighlightText(highlightText);

    const delta = this.getContents();
    const rangesByIndex: Array<{
      index: number;
      length: number;
      value: {
        hoverTextTooltip?: string;
        hoverTooltipPlacement?: HighlightTooltipPlacement;
        highlightId?: string;
        styles?: Record<string, string>;
      };
    }> = [];

    for (const item of highlightText) {
      if (!item.text?.trim()) continue;
      const matches = findTextRangesInDelta(delta, item.text, {
        caseInsensitive: item.caseInsensitive,
      });
      for (const { index, length } of matches) {
        rangesByIndex.push({
          index,
          length,
          value: {
            hoverTextTooltip: item.hoverTextTooltip,
            hoverTooltipPlacement: item.hoverTooltipPlacement,
            highlightId: item.highlightId,
            styles: item.styles,
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

  /**
   * Remove all highlight formatting from the editor.
   * Only applies when the highlight blot is enabled; otherwise no-op.
   */
  public removeAllHighlights(): void {
    if (!this.editorBlotConfig.enableHighlightBlot) return;

    const ranges = this.getHighlightRanges();
    // Sort by index descending so removing doesn't shift subsequent indices
    ranges.sort((a, b) => b.index - a.index);

    const formatName = QuillHighlightBlot.blotName;
    for (const { index: at, length: len } of ranges) {
      // Quill formatText(index, length, formats) – pass false to remove the format
      this.formatText(at, len, { [formatName]: false });
    }
  }

  /**
   * Collect all [index, length] ranges that have the highlight format.
   * Uses the editor delta from getContents(); each op with the highlight attribute is one range.
   */
  private getHighlightRanges(): { index: number; length: number }[] {
    const formatName = QuillHighlightBlot.blotName;
    const delta = this.getContents();
    const ranges: Array<{ index: number; length: number }> = [];
    let index = 0;
    for (const op of delta.ops ?? []) {
      const length = typeof op.insert === "string" ? op.insert.length : 1;
      if (op.attributes && formatName in op.attributes) {
        ranges.push({ index, length });
      }
      index += length;
    }
    return ranges;
  }

  /**
   * Refresh the content of the editor.
   * Run serialize() and deserialize() to ensure the content is up to date.
   */
  public refreshContent() {
    const html = this.getSemanticHTML();
    this.loadHtml(html);
  }

  /**
   * Append HTML to the existing content of the after the current content.
   *
   * @example
   * ```ts
   * const html = "<p>Hello world 1</p>";
   * quill.appendHtml(html);
   *
   * // Before:
   * <p>Hello world 0</p>
   * // After:
   * <p>Hello world 0</p>
   * <p>Hello world 1</p>
   * ```
   * @param html - The HTML to append.
   */
  public appendHtml(html: string): void {
    const serialized = this.serialize(html);
    const delta = this.clipboard.convert({ html: serialized });
    const currentDelta = this.getContents();
    const newDelta = currentDelta.concat(delta);
    this.setContents(newDelta);
  }
}
