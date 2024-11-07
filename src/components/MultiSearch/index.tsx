import React, { useCallback, useEffect, useState } from "react";
import { FormCheck, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";

import _ from "lodash";
import { axiosInstance } from "@/services";
import { useAppDispatch } from "@/stores/hooks";

interface MultiSearchBarProps {
  onSearch: (terms: string[]) => void;
  searchTerms: string[];
  setSearchTerms: (terms: string[]) => void;
  placeHolder?: string;
  url: string | string[];
  getOptionKey: string | string[];
  isRadioInput?: boolean;
  getValueKey?: string | string[];
  urlQueryKey?: string;
  onSearchChange?: any;
}

// type FetchedOptionType = {
//   value: string;
//   label: string;
// };

const MultiSearchBar: React.FC<MultiSearchBarProps> = ({
  onSearch,
  searchTerms,
  setSearchTerms,
  placeHolder,
  url,
  getOptionKey,
  isRadioInput,
  getValueKey,
  onSearchChange,
  urlQueryKey,
}) => {
  const dispatch = useAppDispatch();
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function fetchOptions(query: string): Promise<any> {
    setIsLoading(true);
    try {
      const responses = await Promise.all(
        Array.isArray(url)
          ? url?.map((u) =>
              axiosInstance.get(
                `${u}${u.includes("?") ? "&" : "?"}${getOptionKey}=${query}`
              )
            )
          : isRadioInput
          ? [
              axiosInstance.get(
                `${url}${
                  url.includes("?") ? "&" : "?"
                }${urlQueryKey}=${query}&all=true`
              ),
            ]
          : [
              axiosInstance.get(
                `${url}${url.includes("?") ? "&" : "?"}${getOptionKey}=${query}`
              ),
            ]
      );
      return responses.flatMap((response) => {
        if (isRadioInput) {
          return response.data.map((item: any) => item) || [];
        } else {
          return (
            response.data.results?.map(
              (item: any) => item[getOptionKey as string]
            ) || []
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
      setOptions(Array.isArray(options) ? [...new Set(options)] : []);
    }, 900),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    debouncedFetchResults(e.target.value);

    if (onSearchChange) {
      dispatch(onSearchChange());
    }
  };

  const removeTerm = (term: string) => {
    const newTerms = searchTerms.filter((institute) => institute !== term);
    setOptions((prev) => [...new Set([...prev, term])]);
    setSearchTerms(newTerms);
  };

  const handleSearch = (item: string, isChecked: boolean) => {
    if (isChecked === false) {
      return removeTerm(item);
    } else {
      if (isRadioInput) {
        const data = options?.find((x:any)=> x?.name === item )?.id;
        onSearch([data]);
        // setSearchTerms([item]);
        setSearchValue("");
      } else {
        setSearchTerms([...new Set([...searchTerms, item])]);
        setSearchValue("");
      }
    }
  };

  useEffect(() => {
    onSearch([...searchTerms]);
  }, [searchTerms]);

  useEffect(() => {
    if (searchValue.length > 0) {
      setIsOpen(true);
    } else if (searchValue.length === 0 && searchTerms?.length === 0) {
      setIsOpen(false);
    }
  }, [searchValue, searchTerms]);

  return (
    <div className="relative mr-3 w-full sm:w-auto">
      <Lucide
        icon="Search"
        className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500"
      />

      <div className="search-container">
        <FormInput
          type="text"
          placeholder={placeHolder ?? "Search Institution Name"}
          className="pl-9 w-full sm:w-96 rounded-[0.5rem] relative"
          value={
            !isOpen && isRadioInput && searchTerms
              ? searchTerms[0]
              : searchValue
          }
          onChange={handleChange}
        />
        {isOpen && (
          <>
            <div className="search-terms-box bg-white mt-2 p-2 border rounded absolute z-50 left-0 right-0">
              {
                <div className="flex flex-nowrap gap-2 py-2 pb-4 overflow-hidden overflow-x-auto  scrollbar-hide">
                  {searchTerms.map((term, index) => (
                    <div
                      key={index}
                      className="bg-gray-100 px-4 py-1 rounded-full flex items-center shadow-lg "
                    >
                      <span className="term-text mr-2 text-nowrap ">
                        {term}
                      </span>
                      <button
                        className="remove-btn text-red-500 font-bold"
                        onClick={() => handleSearch(term, false)}
                      >
                        <Lucide icon="X" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              }

              <div className=" text-md font-medium">
                {searchValue.length > 0 && isLoading && (
                  <span className="flex items-center">
                    <span>Searching</span>
                    {isLoading && (
                      <Lucide
                        icon="Loader"
                        className={`ml-2 w-4 h-4 mr-1.5 stroke-[1.3] ${
                          isLoading ? "animate-spin" : ""
                        }`}
                      />
                    )}
                  </span>
                )}
              </div>

              <div className="relative z-10 pb-1 mt-1  bg-white rounded-lg shadow-lg  ">
                {options?.length === 0 ? (
                  <div className="flex flex-col items-center  max-h-[200px] justify-center pt-20 pb-28">
                    <Lucide
                      icon="SearchX"
                      className="w-20 h-20 text-theme-1/20 fill-theme-1/5 stroke-[0.5]"
                    />

                    {searchValue.length > 0 && isLoading === false && (
                      <div className="w-2/3 mt-3 leading-relaxed text-center text-slate-500">
                        No results found for
                        <span className="italic font-medium">
                          "{searchValue}"
                        </span>
                      </div>
                    )}

                    {searchValue.length === 0 &&
                      isLoading === false &&
                      searchTerms.length > 0 && (
                        <div className="w-2/3 mt-3 leading-relaxed text-center text-slate-500">
                          <span className=" font-medium">
                            No Institute Found
                          </span>
                        </div>
                      )}
                  </div>
                ) : (
                  <div>
                    <div className="  border-t border-dashed">
                      <div className="flex flex-col gap-1 mt-3.5 max-h-[200px] overflow-y-auto">
                        {options?.length > 0 &&
                          options?.map((item: any, key: number) => {
                            return (
                              <div
                                key={key}
                                className="flex items-center cursor-pointer py-1 px-2 hover:bg-gray-100 rounded-md"
                              >
                                {!isRadioInput && (
                                  <FormCheck className="mr-2">
                                    <FormCheck.Input
                                      id={`checkbox-switch-${key}`}
                                      type="checkbox"
                                      checked={searchTerms.includes(item)}
                                      onChange={(e) => {
                                        handleSearch(item, e.target.checked);
                                      }}
                                    />
                                    <label
                                      htmlFor={`checkbox-switch-${key}`}
                                      className="cursor-pointer pl-2"
                                    >
                                      <span>{item}</span>
                                    </label>
                                  </FormCheck>
                                )}

                                {isRadioInput && (
                                  <FormCheck className="mr-2">
                                    <FormCheck.Input
                                      id={`radio-switch`}
                                      type="radio"
                                      name="id"
                                      checked={searchTerms.includes(item[getOptionKey as string])}
                                      onChange={(e) => {
                                        handleSearch(item[getOptionKey as string], e.target.checked);
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

      {(options?.length > 0 || searchTerms.length > 0) && (
        <Lucide
          icon={isOpen ? "ChevronUp" : "ChevronDown"}
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer absolute inset-y-0 right-3 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500 hover:text-red-500"
        />
      )}
    </div>
  );
};

export default MultiSearchBar;
