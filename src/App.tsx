import React from "react";

import * as Yup from "yup";
import { useFormik } from "formik";
import { renderHtmlWithEscapedSpaces } from "@/lib/editor/renderHtmlWithEscapedSpaces";
import type {
  ReactQuillWrapper,
  ReactQuillWrapperHighlightTextItem,
} from "@/lib/editor/ReactQuillWrapper";
import type { Range } from "quill";

const ReactQuillEditor = React.lazy(async () => {
  const { ReactQuillEditor } = await import("@/components/ReactQuillEditor");
  return { default: ReactQuillEditor };
});

const formValidation = Yup.object().shape({
  html: Yup.string().trim().required("HTML is required"),
  subject: Yup.string().trim().required("Subject is required"),
});

const DEFAULT_VALUE = `<h1>Hello, world!</h1><p>This is a paragraph with a placeholder {{CANDIDATE_NAME}}</p><p></p><p>This is a paragraph with a highlight</p>`;

const DEFAULT_VALUE_TWO = `<h1>TWO, world!</h1><p>This is a paragraph with a placeholder {{CANDIDATE_NAME}}</p><p></p><p>This is a paragraph with a highlight</p>`;

const EXAMPLE_HIGHLIGHT_TEXT: ReactQuillWrapperHighlightTextItem[] = [
  {
    highlightId: "1",
    text: "highlight",
    hoverTextTooltip: "This is a tooltip shown on hover of the highlight",
    styles: {
      color: "#1e3a5f",
      "background-color": "#93c5fd",
      "border-bottom": "1px solid #1e3a5f",
    },
  },
  {
    highlightId: "2",
    text: "Hello",
    hoverTextTooltip: "Amit Chauhan",
    styles: {
      color: "#14532d",
      "background-color": "#bbf7d0",
      "border-bottom": "2px solid #14532d",
      "border-right": "2px solid #14532d",
      "border-radius": "0.375rem",
    },
  },
];

export function App() {
  const quillRef = React.useRef<ReactQuillWrapper | null>(null);
  const [lastChange, setLastChange] = React.useState<Range | null>(null);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      html: DEFAULT_VALUE,
      subject: "Test Subject for React Quill Editor",
    },
    validationSchema: formValidation,
    onSubmit: (values) => {
      console.log(values);
    },
  });

  const handleInsertPlaceholder = React.useCallback(() => {
    if (!quillRef.current) return;
    quillRef.current.insertPlaceholder({ key: "CANDIDATE_NAME" });
  }, [quillRef]);

  const handleChange = React.useCallback(
    (html: string) => {
      console.log("html", html);
      formik.setFieldValue("html", html);
    },
    [formik],
  );

  const handleReset = React.useCallback(() => {
    if (!quillRef.current) return;
    quillRef.current.loadHtml(DEFAULT_VALUE);
  }, []);

  const handleApplyHighlights = React.useCallback(() => {
    if (!quillRef.current) return;
    quillRef.current.removeAllHighlights();
    quillRef.current.applyHighlights(EXAMPLE_HIGHLIGHT_TEXT);
  }, []);

  const handleRemoveHighlightContent = React.useCallback(() => {
    if (!quillRef.current) return;
    quillRef.current.removeAllHighlights();
  }, []);

  const handleLoadDefaultTwo = React.useCallback(() => {
    if (!quillRef.current) return;
    quillRef.current.loadHtml(DEFAULT_VALUE_TWO);
  }, []);

  const handleAppendHtml = React.useCallback(() => {
    if (!quillRef.current) return;
    quillRef.current.appendHtml(DEFAULT_VALUE_TWO);
  }, []);

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleLoadDefaultTwo}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Load Default Two
        </button>
        <button
          type="button"
          onClick={handleApplyHighlights}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Apply Highlights
        </button>
        <button
          type="button"
          onClick={handleRemoveHighlightContent}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Remove highlight content
        </button>
        <button
          type="button"
          onClick={handleAppendHtml}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Append HTML
        </button>
      </div>
      <form onSubmit={formik.handleSubmit} className="flex flex-col space-y-2">
        <input
          {...formik.getFieldProps("subject")}
          type="text"
          name="subject"
          className="border border-gray-300 p-2"
        />
        <React.Suspense
          fallback={
            <div className="flex min-h-10 items-center justify-center border border-gray-300 p-2">
              Loading Editor...
            </div>
          }
        >
          <ReactQuillEditor
            ref={quillRef}
            defaultValue={DEFAULT_VALUE}
            onChange={handleChange}
            onSelectionChange={setLastChange}
          />
        </React.Suspense>

        <div className="flex items-center justify-end">
          <button type="submit" className="rounded bg-blue-500 p-2 text-white">
            Submit
          </button>
        </div>
      </form>

      <div className="flex flex-col space-y-4">
        <div className="state">
          <div className="state-title">Current Range:</div>
          {lastChange ? JSON.stringify(lastChange) : "Empty"}
        </div>
        <div>
          <button
            type="button"
            onClick={handleInsertPlaceholder}
            className="rounded-md border px-2 py-1 text-xs"
          >
            Insert Placeholder
          </button>
        </div>
        <div className="space-y-2 border border-gray-300 p-4">
          <span>Rendered HTML:</span>
          <div
            dangerouslySetInnerHTML={{
              __html: renderHtmlWithEscapedSpaces(formik.values.html),
            }}
          />
        </div>
      </div>
    </div>
  );
}
