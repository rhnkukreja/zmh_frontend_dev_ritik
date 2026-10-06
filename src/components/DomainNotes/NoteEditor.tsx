import React, { useEffect, useRef } from "react";
import { Control, Controller, FieldPath, RegisterOptions } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import Error from "@/components/Error";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { DomainNote } from "@/types/domainNotes";

interface NoteFieldProps {
  control: Control<DomainNote, any>;
  rules?: RegisterOptions<DomainNote, FieldPath<DomainNote>>;
  name?: FieldPath<DomainNote>;
  label?: React.ReactNode;
  helperText?: string;
  compact?: boolean;
}

const NoteField: React.FC<NoteFieldProps> = ({
  control,
  rules,
  name = "notes",
  label = "Notes",
  helperText,
  compact = false,
}) => {
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
        editorShell.style.height = compact ? "110px" : "230px";
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
  }, [compact]);

  return (
    <div>
      <FormCheck.Label className="mb-2 block text-left text-[0.95rem] font-semibold text-slate-800 !ml-0">
        {label}
      </FormCheck.Label>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <div
              ref={editorWrapperRef}
              className={`${compact ? "h-[110px]" : "h-[230px]"} overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10`}
            >
              <ClassicEditor
                value={field.value || ""}
                onChange={(event) => {
                  field.onChange(event);
                }}
              />
            </div>
            {helperText && !error && (
              <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
            )}
            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default NoteField;
