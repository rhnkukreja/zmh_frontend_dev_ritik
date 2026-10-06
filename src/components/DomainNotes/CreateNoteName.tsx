import React from "react";
import { Control, Controller, FieldPath } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Error from "@/components/Error";
import { DomainNote } from "@/types/domainNotes";

interface NameFieldProps {
  control: Control<DomainNote, any>;
  rules?: object;
  name?: FieldPath<DomainNote>;
  label?: string;
  placeholder?: string;
}

const NameField: React.FC<NameFieldProps> = ({
  control,
  rules,
  name = "attendees_company",
  label = "Attendees (Company)",
  placeholder = "Enter attendees name",
}) => {
  return (
    <div className="w-full">
      <FormCheck.Label className="mb-2 block whitespace-nowrap text-left font-semibold text-gray-800 !ml-0">
        {label}
      </FormCheck.Label>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <FormInput placeholder={placeholder} {...field} value={field.value || ""} />
            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default NameField;
