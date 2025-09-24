import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
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
                        <input
                            {...field}
                            type="date"
                            className="w-full h-10 text-sm p-1.5 border border-[#E5EAF0] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Enter Date"
                        />
                        {error && <Error className="text-red-600">{error.message}</Error>}
                    </>
                )}
            />
        </div>
    );
};

export default DateField;
