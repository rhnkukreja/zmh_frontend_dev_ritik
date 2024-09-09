import React, { useCallback, useEffect, useState } from "react";
import { FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { axiosInstance } from "@/services";
import { investersProfileService } from "@/services/investersProfile";
import _ from "lodash";

interface MultiSearchBarProps {
  onSearch: (terms: string[]) => void;
  searchTerms: string[];
  setSearchTerms: (terms: string[]) => void;
}

// type FetchedOptionType = {
//   value: string;
//   label: string;
// };

const MultiSearchBar: React.FC<MultiSearchBarProps> = ({
  onSearch,
  searchTerms,
  setSearchTerms,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function fetchOptions(query: string): Promise<any> {
    setIsLoading(true);
    const response = await investersProfileService.getInstitutionByName(
      query,
      "profiles"
    );
    setIsLoading(false);
    return response.results?.map((item: any) => item.institution_name);
  }

  const debouncedFetchResults = useCallback(
    _.debounce(async (query: string) => {
      const options = await fetchOptions(query);
      setOptions(options);
    }, 900),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    debouncedFetchResults(e.target.value);
  };

  const removeTerm = (term: string) => {
    const newTerms = searchTerms.filter((institute) => institute !== term);
    setOptions((prev) => [...prev, term]);
    setSearchTerms(newTerms);
  };

  const handleSend = (item: string) => {
    setOptions((prev) => prev.filter((option) => option !== item));
    onSearch([...searchTerms, item]);
    setSearchTerms([...searchTerms, item]);
    setSearchValue("");
  };
  useEffect(() => {
    if (
      options?.length > 0 ||
      searchValue.length > 0 ||
      searchTerms.length > 0
    ) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [options, searchValue]);

  return (
    <div className="relative mr-3 w-full sm:w-auto">
      <Lucide
        icon="Search"
        className="absolute inset-y-0 left-0 z-10 w-4 h-4 my-auto ml-3 stroke-[1.3] text-slate-500"
      />

      <div className="search-container">
        <FormInput
          type="text"
          placeholder="Search Institute Name"
          className="pl-9 w-full sm:w-80 rounded-[0.5rem] relative"
          value={searchValue}
          onChange={handleChange}
        />
        {isOpen && (
          <>
            <div className="search-terms-box bg-white mt-2 p-2 border rounded absolute z-50 left-0 right-0">
              <div className="flex flex-nowrap gap-2 py-2 pb-4 overflow-hidden overflow-x-auto  scrollbar-hide">
                {searchTerms.map((term, index) => (
                  <div
                    key={index}
                    className="bg-gray-100 px-4 py-1 rounded-full flex items-center shadow-lg "
                  >
                    <span className="term-text mr-2 text-nowrap ">{term}</span>
                    <button
                      className="remove-btn text-red-500 font-bold"
                      onClick={() => removeTerm(term)}
                    >
                      <Lucide icon="X" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className=" text-md font-medium">
                {searchValue.length > 0 && isLoading && (
                  <span className="flex items-center">
                    <span>Search Institutes</span>
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
                          options?.map((item: string, key: number) => {
                            return (
                              <div
                                key={key}
                                onClick={() => handleSend(item)}
                                className="flex items-center cursor-pointer py-1 px-2 hover:bg-gray-100 rounded-md"
                              >
                                <span>{item}</span>
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
