import React, { useCallback, useEffect, useRef, useState } from "react";
import { FormCheck, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";

import _ from "lodash";
import { axiosInstance } from "@/services";
import { useAppDispatch } from "@/stores/hooks";

interface MultiSearchBarProps {
  onSearch: (terms: string[]) => void;
  onSearchSelect?: () => void;
  searchTerms: string[];
  setSearchTerms: (terms: string[]) => void;
  placeHolder?: string;
  url: string | string[];
  getOptionKey: string | string[];
  queryKey?: string;
  isRadioInput?: boolean;
  getValueKey?: string | string[];
  urlQueryKey?: string;
  onSearchChange?: any;
  isSingle?: boolean;
  isAll?: boolean;
  searchPoponents?: boolean;
  fieldLabel?: string; // New prop for field label
  showPills?: boolean; // New prop to control pill display
  onSelectionChange?: (
    selected: Array<{ label: string; value: string | number }>
  ) => void;
}

type SearchOption = string | { label: string; value: string | number };

// type FetchedOptionType = {
//   value: string;
//   label: string;
// };

const MultiSearchBar: React.FC<MultiSearchBarProps> = ({
  onSearch,
  onSearchSelect,
  searchTerms,
  setSearchTerms,
  placeHolder,
  url,
  isSingle,
  getOptionKey,
  isRadioInput,
  queryKey,
  getValueKey,
  onSearchChange,
  urlQueryKey,
  isAll,
  searchPoponents = false, // New prop to control the search popover
  fieldLabel, // New prop for field label
  showPills = true, // New prop to control pill display, default true for backward compatibility
  onSelectionChange,
}) => {
  const dispatch = useAppDispatch();
  const isInitialMount = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<
    Array<{ label: string; value: string | number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [msg, setMsg] = useState("");

  async function fetchOptions(query: string): Promise<any> {
    setIsLoading(true);
    // When getOptionKey is an array, use only the first element as the URL query key
    const searchParamKey = queryKey || (Array.isArray(getOptionKey) ? getOptionKey[0] : getOptionKey);
    try {
      const responses = await Promise.all(
        Array.isArray(url)
          ? url?.map((u) =>
            axiosInstance.get(
              `${u}${u.includes("?") ? "&" : "?"}${searchParamKey}=${query}&all=true`
            )
          )
          : isRadioInput
            ? [
              axiosInstance.get(
                `${url}${url.includes("?") ? "&" : "?"}${urlQueryKey}=${query}&all=true`
              ),
            ]
            : [
              axiosInstance.get(
                `${url}${url.includes("?") ? "&" : "?"}${searchParamKey}=${query}${searchPoponents ? "" : "&all=true"} `
              ),
            ]
      );
     
      return responses.flatMap((response) => {
        if (isAll) {
          return (
            response.data.institution?.map(
              (item: any) => item[getOptionKey as string]
            ) || []
          );
        }
        if (isRadioInput) {
          return response.data?.map((item: any) => item) || [];
        }
        if (searchPoponents) {
          return (
            response.data?.results?.map((item: any) => {
              // support getOptionKey as string or array of keys (e.g. ["institution_name","region"])
              let label: string;
              if (Array.isArray(getOptionKey)) {
                const nameKey = getOptionKey[0];
                const regionKey = getOptionKey[1];
                const name = item[nameKey] ?? item.institution ?? "";
                const region = regionKey ? item[regionKey] : undefined;
                // only show region when it's EMEA as requested
                label = region && String(region).toUpperCase() === "EMEA" ? `${name} (${region})` : name;
              } else {
                label = item[getOptionKey as string] ?? item.institution ?? "";
              }

              const value = getValueKey
                ? item[getValueKey as string]
                : (Array.isArray(getOptionKey) ? (item[getOptionKey[0]] ?? item.institution) : (item[getOptionKey as string] ?? item.institution));

              return { label, value };
            }) || []
          );
        }

        else {
          return (
            response.data?.results?.map(
              (item: any) => item[getOptionKey as string]
            ) ||
            response.data?.institution?.map(
              (item: any) => item[getOptionKey as string]
            ) ||
            response.data?.map((item: any) => item[getOptionKey as string]) ||
            []
          );
        }
      });
    } catch (error) {
      console.error("Error fetching options:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  const debouncedFetchResults = useCallback(
    _.debounce(async (query: string) => {
      const options = await fetchOptions(query);
      if (options.length === 0) {
        setMsg("No results found for ");
      }
          
      if (Array.isArray(options)) {
        const uniqueOptions = _.uniqBy(options as any[], (item: any) => {
          if (typeof item === "string") {
            return item;
          }
          return `${item?.label}-${item?.value}`;
        });
        setOptions(uniqueOptions as SearchOption[]);
      } else {
        setOptions([]);
      }
    }, 900),
    [url]
  );

  const normalizeOption = (
    item: SearchOption
  ): { label: string; value: string | number } => {
    if (typeof item === "string") {
      return { label: item, value: item };
    }
    return item;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (msg) setMsg("");
    setSearchValue(e.target.value);
    setOptions([]); // Clear stale options so old results don't show while the new debounced fetch is pending
    debouncedFetchResults(e.target.value);

    if (onSearchChange) {
      dispatch(onSearchChange());
    }
  };

  const handleSearch = (item: SearchOption, isChecked: boolean) => {
    const normalized = normalizeOption(item);
    const label = normalized.label;

    if (isChecked === false) {
      const newTerms = searchTerms.filter((institute) => institute !== label);
      setOptions((prev) => [...prev, item]);
      if (newTerms?.length === 0 && onSearchSelect) {
        onSearchSelect();
      }
      setSearchTerms(newTerms);
      setSelectedOptions((prev) => prev.filter((opt) => opt.label !== label));
      return;
    } else {
      if (isRadioInput) {
        const compareValue = typeof item === "string" ? item : item.label;
        const data = (options as any[])?.find((x: any) => x?.name === compareValue)?.id;
        onSearch([data]);
        // setSearchTerms([item]);
        setSearchValue("");
        setIsOpen(false);
      } else {
        if (isSingle) {
          setSearchTerms([label]);
          setSelectedOptions([normalized]);
          setIsOpen(false);
        } else {
          setSearchTerms([...new Set([...searchTerms, label])]);
          setSelectedOptions((prev) => {
            const exists = prev.some((opt) => opt.label === normalized.label);
            if (exists) {
              return prev;
            }
            return [...prev, normalized];
          });
        }

        setSearchValue("");
      }
    }
  };

  useEffect(() => {
    onSearch([...searchTerms]);
  }, [searchTerms]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (onSelectionChange) {
      onSelectionChange(selectedOptions);
    }
  }, [selectedOptions, onSelectionChange]);

  useEffect(() => {
    if (searchTerms.length === 0) {
      setSelectedOptions([]);
    }
  }, [searchTerms]);

  useEffect(() => {
    if (searchValue.length > 0) {
      setIsOpen(true);
    } else if (searchValue.length === 0 && searchTerms?.length === 0) {
      setIsOpen(false);
    }
  }, [searchValue, searchTerms]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef}>
      <div className="relative mr-3 w-full sm:w-auto">
        <Lucide
          icon="Search"
          className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500"
        />

        <div className="search-container">
          <div className="relative w-full sm:w-96">
            <FormInput
              type="text"
              placeholder={placeHolder ?? "Search Institution Name"}
              className="pl-9 w-full rounded-[0.5rem]"
              value={
                !isOpen && isRadioInput && searchTerms
                  ? searchTerms[0]
                  : searchValue
              }
              onChange={handleChange}
            />
            {(options?.length > 0 || searchTerms.length > 0) && (
              <Lucide
                icon={isOpen ? "ChevronUp" : "ChevronDown"}
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer absolute inset-y-0 right-3 z-10 w-4 h-4 my-auto stroke-[1.3] text-slate-500 hover:text-red-500"
              />
            )}
          </div>

          {isOpen && (
            <>
              <div className="search-terms-box bg-white mt-2  border rounded absolute z-50 left-0 right-0">
                <div className=" text-md font-medium">
                  {searchValue.length > 0 && isLoading && (
                    <span className="flex items-center">
                      <span className="m-2">Searching</span>
                      {isLoading && (
                        <Lucide
                          icon="Loader"
                          className={`w-4 h-4 mr-1.5 stroke-[1.3] ${isLoading ? "animate-spin" : ""
                            }`}
                        />
                      )}
                    </span>
                  )}
                  {isLoading === false && options?.length === 0 && msg && (
                    <div className=" mt-3 leading-relaxed text-center text-slate-500">
                      {msg}
                      <span className="italic font-medium">
                        "{searchValue}"
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative z-10 pb-1 mt-1  bg-white rounded-lg shadow-lg  ">
                  {options?.length > 0 && (
                    <div>
                      <div>
                        <div className="flex flex-col gap-1 mt-3.5 max-h-[200px] overflow-y-auto">
                          {options?.length > 0 &&
                            options?.map((item: any, key: number) => {
                              const normalizedItem = normalizeOption(item);
                              return (
                                <div
                                  key={key}
                                  className="flex items-center cursor-pointer py-1 px-2 hover:bg-gray-100 rounded-md"
                                  onClick={() => {
                                    if (onSearchSelect) {
                                      onSearchSelect();
                                    }
                                  }}
                                >
                                  {!isRadioInput && (
                                    <FormCheck className="mr-2">
                                      <FormCheck.Input
                                        id={`checkbox-switch-${key}`}
                                        type="checkbox"
                                        checked={searchTerms.includes(normalizedItem.label)}
                                        onChange={(e) => {
                                          handleSearch(item, e.target.checked);
                                        }}
                                      />
                                      <label
                                        htmlFor={`checkbox-switch-${key}`}
                                        className="cursor-pointer pl-2"
                                      >
                                        <span>{normalizedItem.label}</span>
                                      </label>
                                    </FormCheck>
                                  )}

                                  {isRadioInput && (
                                    <FormCheck className="mr-2">
                                      <FormCheck.Input
                                        id={`radio-switch`}
                                        type="radio"
                                        name="id"
                                        checked={searchTerms.includes(
                                          item[getOptionKey as string]
                                        )}
                                        onChange={(e) => {
                                          handleSearch(
                                            item[getOptionKey as string],
                                            e.target.checked
                                          );
                                        }}
                                      />
                                      <label
                                        htmlFor={`radio-switch`}
                                        className="cursor-pointer pl-2"
                                      >
                                        <span>
                                          {item[getOptionKey as string]}
                                        </span>
                                      </label>
                                    </FormCheck>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {showPills && (
        <div className="flex  flex-wrap gap-2 py-2 pb-4 overflow-y-auto max-w-full w-full no-scrollbar">
          {searchTerms.map((term, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              <span className="term-text mr-2 text-nowrap">
                {fieldLabel ? `${fieldLabel}: ${term}` : term}
              </span>
              <button
                className="remove-btn font-bold"
                onClick={() => handleSearch(term, false)}
              >
                <Lucide icon="X" className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSearchBar;
