import React, { useEffect, useRef } from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import Error from "@/components/Error";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { DomainNote } from "@/types/domainNotes";

interface NoteFieldProps {
  control: Control<DomainNote, any>;
  rules?: object;
}

const NoteField: React.FC<NoteFieldProps> = ({ control, rules }) => {
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const applyEditorLayout = () => {
      const editorShell = wrapper.querySelector(".ck.ck-editor") as HTMLElement | null;
      const toolbar = wrapper.querySelector(".ck.ck-toolbar") as HTMLElement | null;
      const editorMain = wrapper.querySelector(".ck.ck-editor__main") as HTMLElement | null;
      const editor = wrapper.querySelector(".ck-editor__editable_inline") as HTMLElement | null;

      if (editorShell) {
        editorShell.style.display = "flex";
        editorShell.style.flexDirection = "column";
        editorShell.style.height = "230px";
      }

      if (toolbar) {
        toolbar.style.position = "sticky";
        toolbar.style.top = "0";
        toolbar.style.zIndex = "5";
        toolbar.style.background = "#ffffff";
        toolbar.style.flexShrink = "0";
      }

      if (editorMain) {
        editorMain.style.flex = "1";
        editorMain.style.minHeight = "0";
        editorMain.style.overflow = "hidden";
      }

      if (editor) {
        editor.style.height = "100%";
        editor.style.minHeight = "100%";
        editor.style.maxHeight = "100%";
        editor.style.overflowY = "scroll";
        editor.style.overflowX = "hidden";
      }
    };

    const timeoutId = window.setTimeout(applyEditorLayout, 0);
    const observer = new MutationObserver(applyEditorLayout);
    observer.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left !ml-0">
        Notes
      </FormCheck.Label>
      <Controller
        name="notes"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <div ref={editorWrapperRef} className="h-[230px] overflow-hidden rounded-md border border-slate-200 bg-white">
              <ClassicEditor
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                }}
              />
            </div>
            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default NoteField;
