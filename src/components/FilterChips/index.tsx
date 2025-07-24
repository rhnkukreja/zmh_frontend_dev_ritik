import React from "react";
import clsx from "clsx";
import { convertToTitleCase } from "@/utils/helper";
import Lucide from "../Base/Lucide";
import { useAppSelector } from "@/stores/hooks";

interface FilterChipsProps {
  filters: { key: string; value: string | number }[];
  onRemove: (key: string, value: string | number) => void;
  showProxyYear?: boolean; // true only for ShareHolder page
}

const FilterChips: React.FC<FilterChipsProps> = ({ filters, onRemove, showProxyYear }) => {
  if (!filters.length) return null;
  // Only use tab for ShareHolder page, otherwise ignore
  const { tab } = useAppSelector((state) => state.sharedHolderNoAction);
  const changeCase = (str: string) => {
    if (
      str === "institution_name" ||
      str === "proponent_type" ||
      str === "proposal_type"
    ) {
      return false;
    } else return true;
  };
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
          <span className="font-semibold text-gray-600">
            {filter.key === "outcome_percentage"
              ? "Shareholder Meeting Held"
              : (filter.key === "proxy_season" || filter.key === "year") && showProxyYear && tab !== "withdrawn"
              ? "Proxy Year"
              : (filter.key === "proxy_season" || filter.key === "year") && showProxyYear && tab == "withdrawn"
              ? "Year"
              : (filter.key === "proxy_season" || filter.key === "year") && !showProxyYear
              ? "Year"
              : convertToTitleCase(filter.key)}
            :
          </span>
          <span className="font-bold">
            {filter.value === undefined || filter.value === null || filter.value === "" || (Array.isArray(filter.value) && filter.value.length === 0)
              ? "-"
              : changeCase(filter.key)
                ? String(filter.value)
                : filter.value}
          </span>
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
