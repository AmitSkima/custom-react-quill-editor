import Quill, { Delta } from "quill";

import {
  htmlWithPlaceholderTokensToHtml,
  semanticHtmlToPlaceholderTokens,
} from "./placeholderTokens";

export interface EditorBlotConfig {
  enablePlaceholderBlot?: boolean;
}

export const DEFAULT_EDITOR_BLOTS: EditorBlotConfig = {
  enablePlaceholderBlot: true,
};

function serializer(html: string, editorBlotConfig: EditorBlotConfig) {
  if (!html) return "";
  let serializedHtml = html;
  if (editorBlotConfig.enablePlaceholderBlot) {
    serializedHtml = htmlWithPlaceholderTokensToHtml(serializedHtml);
  }
  return serializedHtml;
}

export function deserializer(
  html: string,
  editorBlotConfig: EditorBlotConfig,
): string {
  if (!html) return "";
  let deserializedHtml = html;
  if (editorBlotConfig.enablePlaceholderBlot) {
    deserializedHtml = semanticHtmlToPlaceholderTokens(deserializedHtml);
  }
  return deserializedHtml;
}

export function initializeEditorContent(
  quill: Quill,
  defaultValue: string,
  editorBlotConfig: EditorBlotConfig = DEFAULT_EDITOR_BLOTS,
): void {
  const initialHtml = defaultValue;
  const initialDelta = initialHtml
    ? quill.clipboard.convert({
        html: serializer(initialHtml, editorBlotConfig),
      })
    : new Delta();
  quill.setContents(initialDelta);
}
