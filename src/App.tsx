import React from "react";

import * as Yup from "yup";
import { useFormik } from "formik";
import type Quill from "quill";

import {
  initializeEditorContent,
  ReactQuillEditor,
} from "@/components/ReactQuillEditor";
import { QuillPlaceholderBlot } from "@/utils/editor/QuillPlaceholderBlot";

const formValidation = Yup.object().shape({
  html: Yup.string().trim().required("HTML is required"),
  subject: Yup.string().trim().required("Subject is required"),
});

const DEFAULT_VALUE = `<h1>Hello,&nbsp;world!</h1><p></p><p>Sunny&nbsp;{{CANDIDATE_NAME}}﻿</span>aafasdfa&nbsp;<a href="amitchauhan.me" rel="noopener noreferrer" target="_blank">dsadfasd</a>&nbsp;</p><p></p><p>This&nbsp;is&nbsp;a&nbsp;paragraph&nbsp;with&nbsp;a&nbsp;placeholder&nbsp;{{CANDIDATE_NAME}}﻿</span>&nbsp;&nbsp;&nbsp;{{HELLO_MY_NAME_IS_Amit}}﻿</span></p>`;

const DEFAULT_EDITOR_BLOTS = {
  enablePlaceholderBlot: true,
};

export function App() {
  const quillRef = React.useRef<Quill | null>(null);

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

  const handleInsertPlaceholder = () => {
    if (quillRef.current) {
      const lastTextBlock = quillRef.current.getSelection()?.index ?? 0;
      quillRef.current.insertEmbed(
        lastTextBlock,
        QuillPlaceholderBlot.blotName,
        {
          key: "CANDIDATE_NAME",
        },
      );
    }
  };

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (quillRef.current) {
        initializeEditorContent(
          quillRef.current,
          DEFAULT_VALUE,
          DEFAULT_EDITOR_BLOTS,
        );
      }
      formik.setValues({
        html: DEFAULT_VALUE,
        subject: "Hello, world!",
      });
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [formik.setValues]);

  const handleChange = React.useCallback(
    (html: string) => {
      // form.setFieldValue("html", html);
      console.log("html", html);
      formik.setFieldValue("html", html);
    },
    [formik],
  );

  return (
    <div className="flex flex-col gap-4 p-4 space-y-4">
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
        <ReactQuillEditor
          ref={quillRef}
          defaultValue={formik.values.html}
          onChange={handleChange}
          editorBlots={DEFAULT_EDITOR_BLOTS}
        />
        <div className="flex items-center justify-end">
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
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
        <div className="border border-gray-300 p-4 space-y-2">
          <span>Form HTML Value:</span>
          <div>{formik.values.html}</div>
        </div>
        <div className="border border-gray-300 p-4 space-y-2">
          <span>Rendered HTML:</span>
          <div dangerouslySetInnerHTML={{ __html: formik.values.html }} />
        </div>
      </div>
    </div>
  );
}
