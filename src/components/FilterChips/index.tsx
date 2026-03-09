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
  currentPage?: string; // to identify which page is using the component
}


const FilterChips: React.FC<FilterChipsProps> = ({ filters, onRemove, showProxyYear, currentPage }) => {

  if (!filters.length) return null;
  // Only use tab for ShareHolder page, otherwise ignore
  const { tab } = useAppSelector((state) => 
    currentPage === "shareHolder" ? state.sharedHolderNoAction : { tab: null }
  );
  const changeCase = (str: string) => {
    if (
      str === "institution_name" ||
      str === "proponent_type" ||
      str === "proposal_type"
    ) {
      return false;
    } else return true;
  };

  const getFilterLabel = (key: string) => {
    const mapping: Record<string, string> = {
      company_name: "Company",
      company_names: "Company",
      institution_name: "Institution",
      year: "Year",
      vote: "Vote",
      vote_type: "Vote",
      category: "Category",
      keyword: "Keyword",
      index: "Index",
      index_name: "Index",
      proposal_type: "Proposal Category",
      proponent_type: "Proponent",
      proponent_name: "Proponent",
      meeting_type: "Meeting Type",
      proposal_keyword: "Keywords",
      country: "Country",
      analyticsYear: "Year",
      date_range: "Date Range",
      themes: "Themes",
      market: "Country",
      sector: "Sector",
      region: "Region",
      sub_category: "Sub Category",
      anti_category: "Proposal Screen",
    };
    
    return mapping[key] || convertToTitleCase(key);
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

              : (filter.key === "proxy_season" || filter.key === "year") && showProxyYear && tab !== "withdrawn"
                ? "Proxy Year"
                : (filter.key === "proxy_season" || filter.key === "year") && showProxyYear && tab == "withdrawn"
                  ? "Year"
                  : (filter.key === "proxy_season" || filter.key === "year") && !showProxyYear
                    ? "Year"
                    : getFilterLabel(filter.key)}
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
