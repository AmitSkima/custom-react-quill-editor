import {
  htmlWithPlaceholderTokensToHtml,
  semanticHtmlToPlaceholderTokens,
} from "@/utils/editor/placeholderTokens";
import type { ReactQuillWrapper } from "@/utils/editor/ReactQuillWrapper";

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
  quill: ReactQuillWrapper,
  htmlValue: string,
  editorBlotConfig: EditorBlotConfig = DEFAULT_EDITOR_BLOTS,
): void {
  const initialDelta = quill.clipboard.convert({
    html: serializer(htmlValue, editorBlotConfig),
  });
  quill.setContents(initialDelta);
}
