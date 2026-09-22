import React from "react";
import clsx from "clsx";
import { Control, Controller } from "react-hook-form";
import FormCheck from "@/components/Base/Form/FormCheck";
import Error from "@/components/Error";
import { DomainNote } from "@/types/domainNotes";

interface CategoryFieldProps {
  control: Control<DomainNote, any>;
  rules?: object;
}

const categories = ["Social", "Governance", "Environmental", "Proxy Engagement", "Shareholder Engagement", "Other"];

const CategoryField: React.FC<CategoryFieldProps> = ({ control, rules }) => {
  return (
    <div className="w-full">
      <FormCheck.Label className="block text-left font-semibold text-gray-800 mb-2 !ml-0">
        Category
      </FormCheck.Label>
      <Controller
        name="category"
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <select
              {...field}
              className={clsx(
                "w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:bg-gray-800",
                field.value ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-400"
              )}
            >
              <option value="" style={{ color: "#9CA3AF" }}>
                Select Category
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat} style={{ color: "#111827" }}>
                  {cat}
                </option>
              ))}
            </select>

            {error && <Error className="text-red-600">{error.message}</Error>}
          </>
        )}
      />
    </div>
  );
};

export default CategoryField;
