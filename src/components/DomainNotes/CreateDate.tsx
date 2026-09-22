import React from "react";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import Error from "@/components/Error";
import Lucide from "@/components/Base/Lucide";
import Litepicker from "@/components/Base/Litepicker";
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
                        <div className="relative">
                            <div className="pointer-events-none absolute left-0 top-0 flex h-full w-11 items-center justify-center rounded-l-md border border-r-0 border-[#E5EAF0] bg-slate-50 text-slate-500 dark:border-darkmode-800 dark:bg-darkmode-700 dark:text-slate-400">
                                <Lucide icon="Calendar" className="h-4 w-4" />
                            </div>
                            <Litepicker
                                placeholder="Select Date"
                                value={field.value || ""}
                                onChange={(event) => field.onChange(event.target.value)}
                                options={{
                                    autoApply: true,
                                    singleMode: true,
                                    showWeekNumbers: false,
                                    format: "YYYY-MM-DD",
                                    dropdowns: {
                                        minYear: 1990,
                                        maxYear: null,
                                        months: true,
                                        years: true,
                                    },
                                }}
                                className="h-10 rounded-md border-[#E5EAF0] bg-white pl-12 text-sm text-gray-900 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        {error && <Error className="text-red-600">{error.message}</Error>}
                    </>
                )}
            />
        </div>
    );
};

export default DateField;
