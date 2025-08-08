import React from "react";
import clsx from "clsx";
import { convertToTitleCase } from "@/utils/helper";
import Lucide from "../Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import { FaTimes } from "react-icons/fa";

interface FilterChipsProps {
  filters: { key: string; value: string | number }[];
  onRemove: (key: string, value: string | number) => void;
  showProxyYear?: boolean; // true only for ShareHolder page
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemove,
  showProxyYear,
}) => {
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
          className={
            "flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20"
          }
        >
          <span>
            {filter.key === "outcome_percentage"
              ? "Shareholder Meeting Held"
              : (filter.key === "proxy_season" || filter.key === "year") &&
                showProxyYear &&
                tab !== "withdrawn"
              ? "Proxy Year"
              : (filter.key === "proxy_season" || filter.key === "year") &&
                showProxyYear &&
                tab == "withdrawn"
              ? "Year"
              : (filter.key === "proxy_season" || filter.key === "year") &&
                !showProxyYear
              ? "Year"
              : convertToTitleCase(filter.key)}
            :
          </span>
          <span className="ml-2">
            {filter.value === undefined ||
            filter.value === null ||
            filter.value === "" ||
            (Array.isArray(filter.value) && filter.value.length === 0)
              ? "-"
              : filter.value === "no" || filter.value === "yes"
              ? convertToTitleCase(filter.value)
              : changeCase(filter.key)
              ? String(filter.value)
              : filter.value}
          </span>
          <FaTimes
            className="text-xs ml-2"
            onClick={() => onRemove(filter.key, filter.value)}
          />
        </div>
      ))}
    </div>
  );
};

export default FilterChips;
