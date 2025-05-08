import React from "react";
import clsx from "clsx";
import { convertToTitleCase } from "@/utils/helper";
import Lucide from "../Base/Lucide";

interface FilterChipsProps {
  filters: { key: string; value: string | number }[];
  onRemove: (key: string, value: string | number) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ filters, onRemove }) => {
  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap gap-2.5 px-5 py-2">
      {filters.map((filter, index) => (
        <div
          key={index}
          className={clsx([
            "flex gap-2.5 items-center px-3.5 py-1.5 border rounded-lg border-slate-300 bg-slate-50/70",
            "[&.active]:bg-primary/5 [&.active]:border-primary/50 [&.active]:text-primary [&:not(.active)_a]:hidden",
          ])}
        >
          <span className="font-semibold text-gray-600">{filter.key === "outcome_percentage" ? "Percentage Support" :convertToTitleCase(filter.key)}:</span>
          <span className="font-bold">{filter.value}</span>
          <Lucide
            icon="X"
            className="w-4 h-4 text-red-500 -mr-1 cursor-pointer"
            onClick={() => onRemove(filter.key, filter.value)}
          />
        </div>
      ))}
    </div>
  );
};

export default FilterChips;
