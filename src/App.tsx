import React from "react";

import { useQuery } from "@tanstack/react-query";
import * as Yup from "yup";
import { useFormik } from "formik";
import type { ReactQuill } from "@/utils/editor/ReactQuill";

const ReactQuillEditor = React.lazy(async () => {
  const { ReactQuillEditor } = await import("@/components/ReactQuillEditor");
  return { default: ReactQuillEditor };
});

const formValidation = Yup.object().shape({
  html: Yup.string().trim().required("HTML is required"),
  subject: Yup.string().trim().required("Subject is required"),
});

const DEFAULT_VALUE = `<div>Hello,&nbsp;world!</div><p></p><p>Sunny&nbsp;{{CANDIDATE_NAME}}</span>aafasdfa&nbsp;<a href="amitchauhan.me" rel="noopener noreferrer" target="_blank">dsadfasd</a>&nbsp;</p><p></p><p>This&nbsp;is&nbsp;a&nbsp;paragraph&nbsp;with&nbsp;a&nbsp;placeholder&nbsp;{{CANDIDATE_NAME}}</span>&nbsp;&nbsp;&nbsp;{{HELLO_MY_NAME_IS_Amit}} </span></p>`;

const DEFAULT_VALUE_TWO = `<h1>Hello,&nbsp;world!</h1><p></p><p>Amit&nbsp;{{CANDIDATE_NAME}}</span>aafasdfa&nbsp;<a href="amitchauhan.me" rel="noopener noreferrer" target="_blank">dsadfasd</a>&nbsp;</p><p></p><p>This&nbsp;is&nbsp;a&nbsp;paragraph&nbsp;with&nbsp;a&nbsp;placeholder&nbsp;{{CANDIDATE_NAME}}</span>&nbsp;&nbsp;&nbsp;{{HELLO_MY_NAME_IS_Amit}} </span></p>`;

const DEFAULT_EDITOR_BLOTS = {
  enablePlaceholderBlot: true,
};

export function App() {
  const quillRef = React.useRef<ReactQuill | null>(null);
  const [defaultValue, setDefaultValue] = React.useState("");

  const { data: editorContent } = useQuery({
    queryKey: ["editor-content"],
    queryFn: async (): Promise<string> => {
      return await new Promise((resolve) => {
        setTimeout(() => {
          resolve(DEFAULT_VALUE);
        }, 1000);
      });
    },
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      html: "",
      subject: "",
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

  const formSetValues = formik.setValues;

  React.useEffect(() => {
    if (!editorContent) return;
    formSetValues({ html: editorContent, subject: "Hello, world!" });
    setDefaultValue(editorContent);
  }, [editorContent, formSetValues]);

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
          Set Default Value
        </button>
        <button
          type="button"
          onClick={() => setDefaultValue(DEFAULT_VALUE_TWO)}
          className="rounded-md border px-2 py-1 text-xs"
        >
          Set Default Value Two
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
            editorBlots={DEFAULT_EDITOR_BLOTS}
          />
        </React.Suspense>

        <div className="flex items-center justify-end">
          <button type="submit" className="rounded bg-blue-500 p-2 text-white">
            Submit
          </button>
        </div>
      </form>

      <div className="flex flex-col space-y-4">
        <div>
          <button type="button" onClick={handleInsertPlaceholder}>
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
