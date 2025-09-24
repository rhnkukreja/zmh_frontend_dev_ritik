import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Error from "@/components/Error";
import { DomainNote } from "@/types/domainNotes";

interface NameFieldProps {
  control: Control<DomainNote, any>;
  rules?: object;
}

const NameField: React.FC<NameFieldProps> = ({ control, rules }) => {
  return (
    <div className="w-full">
      <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2 !ml-0">
        Attendees
      </FormCheck.Label>
      <Controller
        name="attendees"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <FormInput placeholder="Enter attendees name" {...field} />
            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default NameField;
