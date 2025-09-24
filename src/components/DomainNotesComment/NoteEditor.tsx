import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import Error from "@/components/Error";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { DomainNote, DomainNoteComment } from "@/types/domainNotes";

interface NoteFieldProps {
  control: Control<DomainNoteComment, any>;
  rules?: object;
}

const NoteField: React.FC<NoteFieldProps> = ({ control, rules }) => {
  return (
    <div>
      <Controller
        name="comments"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <div className="min-h-[150px] max-h-[200px] overflow-y-auto">
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
