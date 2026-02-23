import React from "react";
import Quill, { Delta, type EmitterSource, type Range } from "quill";
import "quill/dist/quill.snow.css";

import { QuillPlaceholderBlot } from "@/utils/editor/QuillPlaceholderBlot";
Quill.register(QuillPlaceholderBlot);

import {
  htmlWithPlaceholderTokensToHtml,
  semanticHtmlToPlaceholderTokens,
} from "@/utils/editor/placeholderTokens";

function deserializer(html: string, editorBlotConfig: EditorBlotConfig) {
  if (!html) return "";
  let deserializedHtml = html;
  if (editorBlotConfig.enablePlaceholderBlot) {
    deserializedHtml = semanticHtmlToPlaceholderTokens(deserializedHtml);
  }
  return deserializedHtml;
}

function serializer(html: string, editorBlotConfig: EditorBlotConfig) {
  if (!html) return "";
  let serializedHtml = html;
  if (editorBlotConfig.enablePlaceholderBlot) {
    serializedHtml = htmlWithPlaceholderTokensToHtml(serializedHtml);
  }
  return serializedHtml;
}

export function initializeEditorContent(
  quill: Quill,
  defaultValue: string,
  editorBlotConfig: EditorBlotConfig = DEFAULT_EDITOR_BLOTS,
) {
  // Set initial content: convert {{XXX}} in HTML to placeholder blot spans so they become embeds
  const initialHtml = defaultValue;
  const initialDelta = initialHtml
    ? quill.clipboard.convert({
        html: serializer(initialHtml, editorBlotConfig),
      })
    : new Delta();
  quill.setContents(initialDelta);
}

/**
 * The arguments for the text change event
 */
export type OnTextChangeArgs = [
  delta: Delta,
  oldContent: Delta,
  source: EmitterSource,
];

/**
 * The arguments for the selection change event
 */
export type OnSelectionChangeArgs = [
  range: Range,
  oldRange: Range,
  source: EmitterSource,
];

/**
 * The configuration for the editor blots
 */
export interface EditorBlotConfig {
  enablePlaceholderBlot?: boolean;
}

/**
 * The props for the React Quill Editor component
 */
export interface ReactQuillEditorProps {
  debug?: boolean | "error" | "warn" | "info" | "log";
  /**
   * Whether the editor is read only
   */
  readOnly?: boolean;
  /**
   * The default value of the editor
   */
  defaultValue?: string;
  /**
   * The function to call when the content of the editor changes
   */
  onChange?: (html: string) => void;
  /**
   * The function to call when the text of the editor changes
   */
  onTextChange?: (...args: OnTextChangeArgs) => void;
  /**
   * The function to call when the selection of the editor changes
   */
  onSelectionChange?: (...args: OnSelectionChangeArgs) => void;
  /**
   * The function to call when the length of the editor changes
   */
  onLengthChange?: (length: number) => void;
  /**
   * The function to call when the editor is mounted
   */
  onMount?: () => void;
  /**
   * The function to call when the editor is unmounted
   */
  editorBlots?: {
    enablePlaceholderBlot?: boolean;
  };
}

const DEFAULT_EDITOR_BLOTS = {
  enablePlaceholderBlot: true,
};

/**
 * The React Quill Editor component
 * @param props - The props for the component
 * @param ref - The ref to the Quill instance
 * @returns A React component that renders a Quill editor
 */
export const ReactQuillEditor = React.forwardRef<Quill, ReactQuillEditorProps>(
  (
    {
      debug = false,
      readOnly = false,
      defaultValue = "",
      onChange,
      onTextChange,
      onSelectionChange,
      onLengthChange,
      onMount,
      editorBlots = DEFAULT_EDITOR_BLOTS,
    },
    ref,
  ) => {
    const editorBlotConfig = React.useMemo(() => {
      return {
        ...DEFAULT_EDITOR_BLOTS,
        ...editorBlots,
      };
    }, [editorBlots]);

    const quillRef = ref as React.RefObject<Quill | null>;
    const containerRef = React.useRef<HTMLDivElement>(null);
    const defaultValueRef = React.useRef(defaultValue ?? "");
    const onChangeRef = React.useRef(onChange);
    const onTextChangeRef = React.useRef(onTextChange);
    const onSelectionChangeRef = React.useRef(onSelectionChange);
    const onLengthChangeRef = React.useRef(onLengthChange);

    React.useLayoutEffect(() => {
      onChangeRef.current = onChange;
      onTextChangeRef.current = onTextChange;
      onSelectionChangeRef.current = onSelectionChange;
      onLengthChangeRef.current = onLengthChange;
    });

    React.useEffect(() => {
      quillRef.current?.enable(!readOnly);
    }, [readOnly, quillRef]);

    const _onTextChange = React.useCallback(
      (...args: OnTextChangeArgs) => {
        if (!quillRef.current) return;
        onTextChangeRef.current?.(...args);
        const rawHtml = quillRef.current?.getSemanticHTML();
        const htmlWithTokens = deserializer(rawHtml, editorBlotConfig);
        onChangeRef.current?.(htmlWithTokens);
        onLengthChangeRef.current?.(
          quillRef.current?.getContents().length() ?? 0,
        );
      },
      [quillRef, editorBlotConfig],
    );

    const _onSelectionChange = React.useCallback(
      (...args: OnSelectionChangeArgs) => {
        if (!quillRef.current) return;
        onSelectionChangeRef.current?.(...args);
      },
      [quillRef],
    );

    React.useEffect(() => {
      console.log("init editor");
      const container = containerRef.current;
      if (!container) return;

      const editorContainer = container.appendChild(
        container.ownerDocument.createElement("div"),
      );
      const quill = new Quill(editorContainer, {
        theme: "snow",
      });

      quillRef.current = quill;

      initializeEditorContent(quill, defaultValueRef.current, editorBlotConfig);

      // Text change event
      quill.on(Quill.events.TEXT_CHANGE, _onTextChange);

      // Selection change event
      quill.on(Quill.events.SELECTION_CHANGE, _onSelectionChange);

      onLengthChangeRef.current?.(quill.getContents().length());

      onMount?.();

      Quill.debug(debug);

      return () => {
        quillRef.current = null;
        container.innerHTML = "";

        quill.off(Quill.events.TEXT_CHANGE, _onTextChange);
        quill.off(Quill.events.SELECTION_CHANGE, _onSelectionChange);
        Quill.debug(false);
      };
    }, [
      quillRef,
      _onTextChange,
      _onSelectionChange,
      onMount,
      debug,
      editorBlotConfig,
    ]);

    return <div ref={containerRef}></div>;
  },
);

ReactQuillEditor.displayName = "ReactQuillEditor";
