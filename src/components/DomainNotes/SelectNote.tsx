import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import Error from "@/components/Error";
import { Note } from "@/types/notes";

interface NoteFieldProps {
  control: Control<Note, any>;
  rules?: object;
  folder: number;
}

const SelectNoteField: React.FC<NoteFieldProps> = ({
  control,
  rules,
  folder,
}) => {
  return (
    <div className="w-full">
      <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
        Note
      </FormCheck.Label>
      <Controller
        name="name"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <TomSelectServer
              url={`/user/notes/?folder=${folder}`}
              valueKey="id"
              labelKey="name"
              value={field?.value?.toString() || ""}
              onChange={(value) => field.onChange(value)}
              options={{ placeholder: "Select Note" }}
              className="w-full"
              fetchAll={false}
            />
            {error && (
              <Error className="text-red-600 mt-2">{error.message}</Error>
            )}
          </>
        )}
      />
    </div>
  );
};

export default SelectNoteField;
