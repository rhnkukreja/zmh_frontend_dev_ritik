import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import Error from "@/components/Error";
import { ClassicEditor } from "@/components/Base/Ckeditor";
import { Note } from "@/types/notes";

interface NoteFieldProps {
  control: Control<Note, any>;
  rules?: object;
}

const NoteField: React.FC<NoteFieldProps> = ({ control, rules }) => {
  return (
    <div>
      <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left !ml-0">
        Note
      </FormCheck.Label>
      <Controller
        name="text"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <ClassicEditor
              value={field.value}
              onChange={(event) => {
                field.onChange(event);
              }}
            />
            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default NoteField;
