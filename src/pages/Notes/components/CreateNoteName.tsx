import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Error from "@/components/Error";
import { Note } from "@/types/notes";

interface NameFieldProps {
  control: Control<Note, any>;
  rules?: object;
  isQuestionDialog?: boolean
}

const NameField: React.FC<NameFieldProps> = ({ control, rules, isQuestionDialog }) => {
  return (
    <div className="w-full">
      <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2 !ml-0">
        {isQuestionDialog ? "Attendees" : "Note Name"}
      </FormCheck.Label>
      <Controller
        name="name"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <FormInput placeholder={isQuestionDialog ? "" : "Enter Note Name"} {...field} />
            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default NameField;
