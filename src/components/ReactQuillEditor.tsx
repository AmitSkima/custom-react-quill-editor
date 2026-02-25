import React from "react";
import { Delta, type EmitterSource, type Range } from "quill";
import "quill/dist/quill.snow.css";

import { ReactQuillWrapper } from "@/utils/editor/ReactQuillWrapper";
import { QuillPlaceholderBlot } from "@/utils/editor/QuillPlaceholderBlot";
ReactQuillWrapper.register(QuillPlaceholderBlot);

import {
  DEFAULT_EDITOR_BLOTS,
  deserializer,
  initializeEditorContent,
} from "@/utils/editor/initializeEditorContent";

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

export type { EditorBlotConfig } from "@/utils/editor/initializeEditorContent";

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
  /**
   * Whether to auto correct the editor content on load
   */
  autoCorrectOnLoad?: boolean;
}

/**
 * The React Quill Editor component
 * @param props - The props for the component
 * @param ref - The ref to the Quill instance
 * @returns A React component that renders a Quill editor
 */
export const ReactQuillEditor = React.forwardRef<
  ReactQuillWrapper,
  ReactQuillEditorProps
>(
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
      autoCorrectOnLoad = true,
    },
    ref,
  ) => {
    const editorBlotConfig = React.useMemo(() => {
      return {
        ...DEFAULT_EDITOR_BLOTS,
        ...(editorBlots.enablePlaceholderBlot && {
          enablePlaceholderBlot: editorBlots.enablePlaceholderBlot,
        }),
      };
    }, [editorBlots.enablePlaceholderBlot]);

    const quillRef = ref as React.RefObject<ReactQuillWrapper | null>;
    const containerRef = React.useRef<HTMLDivElement>(null);
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
      const quill = new ReactQuillWrapper(
        editorContainer,
        {
          theme: "snow",
        },
        editorBlotConfig,
      );

      quillRef.current = quill;

      initializeEditorContent(quill, defaultValue, editorBlotConfig);

      // Text change event
      quill.on(ReactQuillWrapper.events.TEXT_CHANGE, _onTextChange);

      // Selection change event
      quill.on(ReactQuillWrapper.events.SELECTION_CHANGE, _onSelectionChange);

      onLengthChangeRef.current?.(quill.getContents().length());

      onMount?.();

      if (autoCorrectOnLoad) {
        console.warn("[ReactQuillEditor] Auto correcting editor content");
        // We need to call the text change event to auto correct the editor content
        // Because there is no guarantee that the default value is valid HTML
        _onTextChange(quill.getContents(), new Delta(), "silent");
      }

      ReactQuillWrapper.debug(debug);

      return () => {
        quillRef.current = null;
        container.innerHTML = "";

        quill.off(ReactQuillWrapper.events.TEXT_CHANGE, _onTextChange);
        quill.off(
          ReactQuillWrapper.events.SELECTION_CHANGE,
          _onSelectionChange,
        );
        ReactQuillWrapper.debug(false);
      };
    }, [
      quillRef,
      _onTextChange,
      _onSelectionChange,
      onMount,
      debug,
      editorBlotConfig,
      defaultValue,
      autoCorrectOnLoad,
    ]);

    return <div ref={containerRef}></div>;
  },
);

ReactQuillEditor.displayName = "ReactQuillEditor";
