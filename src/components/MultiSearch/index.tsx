import React, { useCallback, useEffect, useRef, useState } from "react";
import { FormCheck, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";

import _, { set } from "lodash";
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
  isRadioInput?: boolean;
  getValueKey?: string | string[];
  urlQueryKey?: string;
  onSearchChange?: any;
  isSingle?: boolean;
  isAll?: boolean;
}

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
  getValueKey,
  onSearchChange,
  urlQueryKey,
  isAll,
}) => {
  const dispatch = useAppDispatch();
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [msg, setMsg] = useState("");

  async function fetchOptions(query: string): Promise<any> {
    setIsLoading(true);
    try {
      const responses = await Promise.all(
        Array.isArray(url)
          ? url?.map((u) =>
              axiosInstance.get(
                `${u}${
                  u.includes("?") ? "&" : "?"
                }${getOptionKey}=${query}&all=true`
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
                `${url}${
                  url.includes("?") ? "&" : "?"
                }${getOptionKey}=${query}&all=true`
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
          return response.data.map((item: any) => item) || [];
        } else {
          return (
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
      setOptions(Array.isArray(options) ? [...new Set(options)] : []);
    }, 900),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (msg) setMsg("");
    setSearchValue(e.target.value);

    debouncedFetchResults(e.target.value);

    if (onSearchChange) {
      dispatch(onSearchChange());
    }
  };

  const removeTerm = (term: string) => {
    const newTerms = searchTerms.filter((institute) => institute !== term);
    setOptions((prev) => [...new Set([...prev, term])]);
    if (newTerms?.length === 0 && onSearchSelect) {
      onSearchSelect();
    }
    setSearchTerms(newTerms);

    setIsOpen(false);
  };

  const handleSearch = (item: string, isChecked: boolean) => {
    if (isChecked === false) {
      return removeTerm(item);
    } else {
      if (isRadioInput) {
        const data = options?.find((x: any) => x?.name === item)?.id;
        onSearch([data]);
        // setSearchTerms([item]);
        setSearchValue("");
      } else {
        if (isSingle) {
          setSearchTerms([item]);
        } else {
          setSearchTerms([...new Set([...searchTerms, item])]);
        }

        setSearchValue("");
      }
    }

    setIsOpen(false);
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
    <div>
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
                          className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                            isLoading ? "animate-spin" : ""
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
      <div className="flex  flex-wrap gap-2 py-2 pb-4 overflow-y-auto max-w-full w-full no-scrollbar">
        {searchTerms.map((term, index) => (
          <div
            key={index}
            className="bg-gray-100 px-4 py-1 rounded-full flex items-center shadow-sm "
          >
            <span className="term-text mr-2 text-nowrap ">{term}</span>
            <button
              className="remove-btn text-red-500 font-bold"
              onClick={() => handleSearch(term, false)}
            >
              <Lucide icon="X" className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiSearchBar;
