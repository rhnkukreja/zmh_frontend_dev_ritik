import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import TomSelectServer from "@/components/Base/TomSelect/ServerComponent";
import Error from "@/components/Error";
import { Note } from "@/types/notes";

interface FolderFieldProps {
  control: Control<Note, any>;
  rules?: object;
}

const FolderField: React.FC<FolderFieldProps> = ({ control, rules }) => {
  return (
    <div>
      <FormCheck.Label className="block text-[1rem] font-semibold text-gray-800 mb-2 text-left">
        Folder
      </FormCheck.Label>
      <Controller
        name="folder"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <TomSelectServer
              url="/user/folder/"
              valueKey="id"
              labelKey="folder"
              value={field?.value?.toString() || ""}
              onChange={(value) => field.onChange(value)}
              options={{ placeholder: "Select Folder" }}
              className="w-full"
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

export default FolderField;
