import React from "react";
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
              className="w-full border border-gray-300 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-400 dark:text-white"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
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
