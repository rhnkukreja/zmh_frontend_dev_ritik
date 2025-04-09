import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import FormInput from "@/components/Base/Form/FormInput";
import Error from "@/components/Error";
import { DomainNote } from "@/types/domainNotes";

interface DateFieldProps {
    control: Control<DomainNote, any>;
    rules?: object;
}

const DateField: React.FC<DateFieldProps> = ({ control, rules }) => {
    return (
        <div className="w-full">
            <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2 !ml-0">
                Date
            </FormCheck.Label>
            <Controller
                name="date"
                control={control}
                rules={rules}
                render={({ field, fieldState: { error } }) => (
                    <>
                        <FormInput placeholder={"Enter Date"} {...field} />
                        {error && <Error className="text-red-600">{error.message}</Error>}
                    </>
                )}
            />
        </div>
    );
};

export default DateField;
