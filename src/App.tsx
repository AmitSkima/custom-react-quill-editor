import React from "react";

import * as Yup from "yup";
import { useFormik } from "formik";
import type {
  ReactQuillWrapper,
  ReactQuillWrapperHighlightTextItem,
} from "@/utils/editor/ReactQuillWrapper";
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

const DEFAULT_EDITOR_BLOTS = {
  enablePlaceholderBlot: true,
  enableHighlightBlot: true,
};

const EXAMPLE_HIGHLIGHT_TEXT: ReactQuillWrapperHighlightTextItem[] = [
  {
    text: "highlight",
    textColor: "#1e3a5f",
    highlightColor: "#93c5fd",
  },
  {
    text: "Hello",
    textColor: "#14532d",
    highlightColor: "#bbf7d0",
  },
];

export function App() {
  const quillRef = React.useRef<ReactQuillWrapper | null>(null);
  const [lastChange, setLastChange] = React.useState<Range | null>(null);
  const [defaultValue, setDefaultValue] = React.useState(DEFAULT_VALUE);

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
      formik.setFieldValue("html", html);
    },
    [formik],
  );

  return (
    <div className="flex flex-col gap-4 space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setDefaultValue(DEFAULT_VALUE)}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Reset
        </button>
      </div>
      <form
        onSubmit={formik.handleSubmit}
        className="flex flex-col gap-4 space-y-2"
      >
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
            defaultValue={defaultValue}
            onChange={handleChange}
            onSelectionChange={setLastChange}
            editorBlots={DEFAULT_EDITOR_BLOTS}
            highlightText={EXAMPLE_HIGHLIGHT_TEXT}
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
          <span>Form HTML Value:</span>
          <div>{formik.values.html}</div>
        </div>
        <div className="space-y-2 border border-gray-300 p-4">
          <span>Rendered HTML:</span>
          <div dangerouslySetInnerHTML={{ __html: formik.values.html }} />
        </div>
      </div>
    </div>
  );
}
