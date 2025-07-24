import Button from "@/components/Base/Button";
import { useCallback, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchPeerAnalysis,
  resetFilter,
  resetPage,
  selectUnSelectAllCompany,
  setAllFilters,
  setFilter,
  setPage,
} from "@/stores/peerAnalysisSlice";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";

import AddNewInvesterProfile from "../InvestorProfiles/components/AddNewInvester";
import Table from "@/components/Base/Table";
import { TypesPeerAnalysis } from "@/types/peerAnalysis";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import Lucide from "@/components/Base/Lucide";

import { Popover } from "@/components/Base/Headless";
import { FormCheck, FormSwitch } from "@/components/Base/Form";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import { modifyRoute } from "@/stores/themeSlice";
import { peerAnalysisService } from "@/services/peerAnalysis";
import clsx from "clsx";
import ChartComponent from "@/components/EnagementDetailsDialog";
import FilterChips from "@/components/FilterChips";
import MultiSelectDropdown from "@/components/Base/MultiSelect";


interface PeerAnalysisFilter {
  category: string[];
  year: string[];
  institution_name?: string[];
  global_search?: string[];
  country: string[];
  sector: string[];
  institutes?: any[];
  index?: string;
}

function PeerAnalysis() {
  const dispatch: AppDispatch = useAppDispatch();

  const [addNewInvesterModalVisible, setAddNewInvesterModalVisible] =
    useState<boolean>(false);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState(false);

  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<any>({
      category: ["Social", "Governance", "Environment"],
      year: [],
      country: [],
      sector: [],
      institutes: [],
      index: []
    });

  const {
    loading,
    peerAnalysisData,
    investorData,
    pieChartDataPeerAnalysis,
    topEngagementTopics,
    page,
    totalPages,
    filters,
    count,
    isAllCompanySelected,
  } = useAppSelector((state) => state.peerAnalysis);
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PeerAnalysisFilter>({
    defaultValues: {
      year: filters?.year,
      sector: filters?.sector,
      institution_name: filters?.institution_name,
      global_search:
        filters?.global_search?.map((item: string) => ({
          value: item,
          label: item,
        })) || [],
      category: filters.category,
      country: filters.country,
      institutes: filters?.institutes,
      index: filters?.index ?? " "
    },
  });
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };
  const [selectedInstitution, setSelectedInstitution] = useState<string[]>([""]);

  const getAllCaseStudyDropdowns = async () => {
    try {
      setGetDropdownLoader(true);
      const res = await peerAnalysisService.getPeerAnalysisDropdownValues();
      if (res.result) {
        setApiDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    getAllCaseStudyDropdowns();
  }, []);
  const resetFormValues = () => {
    setValue("year", []);
    setValue("sector", []);
    setValue("category", []);
    setValue("country", []);
    setValue("global_search", []);
    // setValue("institutes", []);
    setValue("index", " ");
  };

  useEffect(() => {
    dispatch(
      setFilter({
        key: "global_search",
        value: isAllCompanySelected ? [] : [companyGlobalSearchName],
      })
    );

    dispatch(
      modifyRoute({
        route: "engagement-detail",
        type: isAllCompanySelected === true ? true : false,
      })
    );
  }, [companyGlobalSearchName, isAllCompanySelected]);

  useEffect(() => {
    if (isAllCompanySelected === false && filters?.global_search.length === 0) {
      return;
    }

    // if (isAllCompanySelected === true && filters?.global_search.length > 0) {

    //     const { institution_name, global_search, ...restFilters } = filters;
    //     const dynamicURL = createDynamicURL(
    //       `${baseURL}/peer_analysis/`,
    //       restFilters,
    //       undefined,
    //       page
    //     );
    //     dispatch(fetchPeerAnalysis(dynamicURL));

    //     setFiltersLength(
    //       countValidFilters(
    //         isAllCompanySelected === false
    //           ? restFilters
    //           : { ...restFilters }
    //       )
    //     );
    //     setSelectedChipFilters(generateFilterChips(restFilters));
    //     console.log("inner one")
    //     return;
    // }
    const { global_search, ...restFilters } = filters;
    const dynamicURL = createDynamicURL(
      `${baseURL}/peer_analysis/`,
      filters,
      undefined,
      page
    );
    dispatch(fetchPeerAnalysis(dynamicURL));

    const { institution_name, ...chipFilters } = restFilters;
    setFiltersLength(
      countValidFilters(
        isAllCompanySelected === false
          ? chipFilters
          : { ...chipFilters }
      )
    );
    setSelectedChipFilters(generateFilterChips(chipFilters));
  }, [page, filters]);



  const handleNextPage = () => {
    if (page < totalPages) {
      dispatch(setPage(page + 1));
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      dispatch(setPage(page - 1));
    }
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  const onFilterClear = () => {
    reset();
    resetFormValues();
    dispatch(resetFilter());
    dispatch(resetPage());
    setValue("institution_name", filters?.institution_name);
    setTimeout(() => {
      dispatch(
        setAllFilters({
          institution_name: filters?.institution_name,
        })
      );
    }, 1000);

  };

  const clearInstitutionFilter = () => {
    setSelectedInstitution([""]);
    setSearchTerms([]);
    if (isAllCompanySelected) {
      dispatch(
        setFilter({ key: "global_search", value: [] })
      );
    }
    else {
      dispatch(
        setFilter({ key: "global_search", value: [companyGlobalSearchName] })
      );
    }

    dispatch(resetPage());
    setValue("institution_name", []);
    setTimeout(() => {
      dispatch(
        setAllFilters({
          institution_name: [],
        })
      );
    }, 1000);
  };

  const handleSearch = (searchTerms: string[]) => {
    setSelectedInstitution(searchTerms);
    dispatch(setFilter({ key: "institution_name", value: searchTerms }));
  };

  const getSavedSearches = () => {
    setSearchTerms([...user?.saved_search["Peer Analysis"]?.institution]);
    setSelectedInstitution([...user?.saved_search["Peer Analysis"]?.institution]);
    setValue("year", user?.saved_search?.year || []);
    setValue("category", user?.saved_search?.category || []);
    setValue("country", user?.saved_search?.country || []);
    setValue("sector", user?.saved_search?.sector || []);
    setValue("institutes", user?.saved_search?.institutes || []);
    setValue("index", user?.saved_search?.index || "");


    dispatch(
      setAllFilters({
        year: user?.saved_search?.year || [],
        category: user?.saved_search?.category || [],
        country: user?.saved_search?.country || [],
        global_search: user?.saved_search?.global_search,
        institutes: user?.saved_search?.institutes,
        index: user?.saved_search?.index,
      })
    );
    setIsFilterCollapse(true);

  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Peer Analysis",
      institution: selectedInstitution,
      global_search: filters["global_search"],
      year: watch("year") || [],
      sector: watch("sector") || [],
      category: watch("category") || [],
      country: watch("country") || [],
      index: watch("index") || "",
    });

    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Peer Analysis",
          value: {
            institution: selectedInstitution,
            global_search: filters["global_search"],
            year: watch("year") || [],
            category: watch("category") || [],
            country: watch("country") || [],
            sector: watch("sector") || [],
            index: watch("index") || "",
          },
        })
      );
      // toast.success(res?.user_id || "Search saved successfully");
    }
  };

  const onSubmit = async (peerAnalysisFilters: PeerAnalysisFilter) => {
    // Remove index if empty or blank
    const filtersToApply = { ...peerAnalysisFilters };
    if (!filtersToApply.index || filtersToApply.index === " " || filtersToApply.index === "") {
      delete filtersToApply.index;
    }
    dispatch(
      setAllFilters({
        ...filtersToApply,
        institution_name: selectedInstitution,
        global_search: isAllCompanySelected
          ? Array.isArray(peerAnalysisFilters?.global_search) &&
            peerAnalysisFilters?.global_search.length > 0
            ? peerAnalysisFilters?.global_search.map((item: any) => item.label)
            : []
          : [companyGlobalSearchName],
      })
    );
    setIsFilterCollapse(!isFilterCollapse);
    dispatch(resetPage());
  };

  const multSearchUrl = useMemo(() => {
    if (isAllCompanySelected) {
      return `/get_engagement_question_dropdown_values/`;
    } else {
      return `/get_engagement_question_dropdown_values/?global_search=${companyGlobalSearchName || filters?.global_search?.[0]
        }`;
    }
  }, [isAllCompanySelected, companyGlobalSearchName, filters]);

  const handleViewAllChange = async (event: any) => {
    if (event?.target?.checked) {
      setViewAll(true)
      setValue("year", ["2024"]);
      setValue("country", ["USA"]);
      dispatch(
        setAllFilters({
          year: [2024],
          country: ["USA"],
        })
      );

    }
    else {
      setViewAll(false)
      setValue("year", []);
      setValue("country", []);
      dispatch(
        setAllFilters({
          country: [],
          year: [],
          global_search: [],
        })
      );

    }
    try {
      dispatch(selectUnSelectAllCompany(!isAllCompanySelected));
    } catch (error) { }
  }
  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...filters };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      if (removeKey === "index") {
        // Remove index completely if empty or blank
        delete updatedFilters[removeKey];
        setValue(removeKey, undefined);
      } else {
        updatedFilters[removeKey] = "";
        setValue(removeKey, "");
      }
    } else {
      setValue(removeKey, updatedFilters[removeKey]);
    }

    dispatch(setAllFilters(updatedFilters));
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">

        <div className="col-span-12">
          <div className="flex  flex-row justify-between md:h-10  gap-y-3 items-center">
            {isAllCompanySelected === true ? (
              <div className="font-semibold text-xl">
                All Engagement Details
              </div>
            ) : (
              <div className="font-semibold text-xl">Engagement Detail</div>
            )}

            <div className="flex items-center">
              <Tippy
                content="All Companies"
                options={{
                  theme: "light",
                }}
              >
                <div className="mt-2">
                  <FormSwitch>
                    <label className="text-md mr-3 font-semibold">
                      View All
                    </label>
                    <FormSwitch.Input
                      id="checkbox-switch-7"
                      type="checkbox"
                      checked={isAllCompanySelected}
                      onChange={async (e) => {
                        handleViewAllChange(e);
                      }}
                    />
                    <FormSwitch.Label htmlFor="checkbox-switch-7"></FormSwitch.Label>
                  </FormSwitch>
                </div>
              </Tippy>
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex flex-col box box--stacked">

              <div className="grid grid-cols-6 xs:grid-cols-1 gap-4 md:grid-cols-3 p-4">
                <div className="mx-2">
                  <TomSelect
                    value={selectedInstitution}
                    onChange={(event: any) => handleSearch(event?.target?.value)}
                    options={{
                      placeholder: "Select Institution", closeAfterSelect: true,
                      render: {
                        option: (data: any, escape: any) => {
                          // text-red-600
                          // ${escape(data.value)} ${data.label ? '*' : ''}
                          return `
                            <div class="p-2 ${data.label ? '' : 'font-bold'}">
                              ${escape(data.value)} 
                              <span class=" ${data.label ? 'text-black font-bold' : ''}">${data.label ? '*' : ''}<span/>
                            </div>
                          `;
                        }
                      }
                    }}
                    className="w-full"
                    multiple
                  >
                    {getDropdownLoader ? (
                      <option value="--" disabled>
                        Loading...
                      </option>
                    ) : (
                      <>
                        {apiDropdownOptions?.institutes?.map(
                          (inst: any) => {
                            return (
                              <option
                                key={inst?.institution_name}
                                value={inst?.institution_name}
                                disabled={inst?.label}
                                data-label={inst?.label ? "*" : ""}
                                className={inst?.label ? "" : ""}
                                onClick={() => {
                                  inst?.label ?
                                    window.scrollBy({
                                      top: 350,
                                      behavior: "smooth",
                                    }) : "";
                                }}
                              >
                                {inst?.institution_name} {inst?.label ? "*" : ""}
                              </option>
                            );
                          }
                        )}
                      </>
                    )}
                  </TomSelect>
                </div>
                <div className="flex">
                  <div className="hover:bg-slate-50">
                    <Button onClick={clearInstitutionFilter}>
                      <Tippy
                        content="Clear Filters"
                        options={{ theme: "light" }}
                      >
                        <FilterX
                          size={17}
                          strokeWidth={1}
                          className="text-slate-500 cursor-pointer	"
                        />
                      </Tippy>
                    </Button>
                  </div>

                  <div className="hover:bg-slate-50 ml-2">
                    <Button onClick={saveSearch}>
                      <Tippy
                        content="Save Searches"
                        options={{ theme: "light" }}
                      >
                        <SaveAll
                          size={17}
                          strokeWidth={1}
                          className="text-slate-500 cursor-pointer	"
                        />
                      </Tippy>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
                  <FormSwitch>
                    <label className="text-md mr-3 font-semibold">Analytics</label>
                    <FormSwitch.Input
                      id="view-analysis-switch"
                      type="checkbox"
                      checked={isViewAnalysis}
                      onChange={(e) => setIsViewAnalysis(e.target.checked)}
                    />
                    <FormSwitch.Label htmlFor="view-analysis-switch"></FormSwitch.Label>
                  </FormSwitch>
                  <Popover className="inline-block">
                    {({ close }) => (
                      <>
                        <Popover.Button
                          as={Button}
                          variant="outline-secondary"
                          className="w-full sm:w-auto"
                          onClick={handleCollapseFilter}
                        >
                          <Lucide
                            icon="ArrowDownWideNarrow"
                            className="stroke-[1.3] w-4 h-4 mr-2"
                          />
                          Filter
                          <div className="flex items-center justify-center h-5 px-1.5 ml-2 text-xs font-medium border rounded-full bg-slate-100">
                            {filtersLength}
                          </div>
                        </Popover.Button>
                      </>
                    )}
                  </Popover>
                </div>
              </div>

              {
                selectedChipFilters?.length > 0 &&
                <>
                  <FilterChips filters={selectedChipFilters} onRemove={handleRemoveChip} />
                </>
              }

              {count > 0 && (
                <h2 className="flex items-end font-semibold justify-end my-2 text-[13px] md:ml-auto mx-5 mb-1">
                  Count: {count.toLocaleString()}
                </h2>
              )}


              {isFilterCollapse && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="filter-section mb-5">
                    <div className="flex items-center justify-end mt-2 mb-4">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          onFilterClear();
                        }}
                        className="w-32 mx-2"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="primary"
                        className="w-32 mx-2"
                        type="submit"
                      >
                        Apply
                      </Button>
                    </div>
                    <div className={clsx(["grid grid-cols-1 xs:grid-cols-1 gap-4 mb-3 ", isAllCompanySelected ? 'md:grid-cols-3' : 'md:grid-cols-3'])}>
                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Year</span>
                          {apiDropdownOptions?.year?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>
                                  Select All
                                </FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id={`year`}
                                  checked={
                                    apiDropdownOptions?.year
                                      ?.length ===
                                    watch("year")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      setValue(
                                        "year",
                                        apiDropdownOptions?.year
                                      );
                                    } else {
                                      setValue("year", []);
                                    }
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="year"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDropdownOptions?.year?.map(String) || []}
                              placeholder="Select Year"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                              }}
                              selectedOption={field.value || []}

                            />
                            // <TomSelect
                            //   value={field.value || []}
                            //   onChange={(value) => {
                            //     field.onChange(value);
                            //   }}
                            //   options={{
                            //     placeholder: "Select Year",
                            //   }}
                            //   className="w-full"
                            //   multiple
                            // >
                            //   {getDropdownLoader ? (
                            //     <option value="--" disabled>
                            //       Loading...
                            //     </option>
                            //   ) : (
                            //     <>
                            //       {apiDropdownOptions?.year?.map(
                            //         (year: string) => {
                            //           return (
                            //             <option value={year}>
                            //               {year}
                            //             </option>
                            //           );
                            //         }
                            //       )}
                            //     </>
                            //   )}
                            // </TomSelect>
                          )}
                        />
                      </div>

                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Category</span>


                          {apiDropdownOptions?.category?.length >
                            0 && (
                              <div>
                                <FormCheck className="mr-2">
                                  <FormCheck.Label>
                                    Select All
                                  </FormCheck.Label>
                                  <FormCheck.Input
                                    className="ml-1"
                                    id={`category`}
                                    checked={
                                      apiDropdownOptions?.category
                                        ?.length ===
                                      watch("category")?.length
                                    }
                                    type="checkbox"
                                    onChange={(e) => {
                                      if (e.target.checked === true) {
                                        setValue(
                                          "category",
                                          apiDropdownOptions?.category
                                        );
                                      } else {
                                        setValue("category", []);
                                      }
                                    }}
                                  />
                                </FormCheck>
                              </div>
                            )}
                        </div>
                        <Controller
                          name="category"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDropdownOptions?.category}
                              placeholder="Select Category"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);



                              }}
                              selectedOption={field.value || []}

                            />
                            // <TomSelect
                            //   value={field.value || []}
                            //   onChange={(value) => {
                            //     field.onChange(value);
                            //   }}
                            //   options={{
                            //     placeholder: "Select Category",
                            //   }}
                            //   className="w-full"
                            //   multiple
                            // >
                            //   {getDropdownLoader ? (
                            //     <option value="--" disabled>
                            //       Loading...
                            //     </option>
                            //   ) : (
                            //     <>
                            //       {apiDropdownOptions?.category
                            //         ?.length > 0 &&
                            //         apiDropdownOptions?.category?.map(
                            //           (category: string) => {
                            //             return (
                            //               <option value={category}>
                            //                 {category}
                            //               </option>
                            //             );
                            //           }
                            //         )}
                            //     </>
                            //   )}
                            // </TomSelect>
                          )}
                        />
                      </div>

                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className=" font-semibold">Country</span>


                          {apiDropdownOptions?.country?.length >
                            0 && (
                              <div>
                                <FormCheck className="mr-2">
                                  <FormCheck.Label>
                                    Select All
                                  </FormCheck.Label>
                                  <FormCheck.Input
                                    className="ml-1"
                                    id={`country`}
                                    checked={
                                      apiDropdownOptions?.country
                                        ?.length ===
                                      watch("country")?.length
                                    }
                                    type="checkbox"
                                    onChange={(e) => {
                                      if (e.target.checked === true) {
                                        setValue(
                                          "country",
                                          apiDropdownOptions?.country
                                        );
                                      } else {
                                        setValue("country", []);
                                      }
                                    }}
                                  />
                                </FormCheck>
                              </div>
                            )}
                        </div>
                        <Controller
                          name="country"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDropdownOptions?.country}
                              placeholder="Select Country"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);



                              }}
                              selectedOption={field.value || []}

                            />
                            // <TomSelect
                            //   value={field.value || []}
                            //   onChange={(value) => {
                            //     field.onChange(value);
                            //   }}
                            //   options={{
                            //     placeholder: "Select Country",
                            //   }}
                            //   className="w-full"
                            //   multiple
                            // >
                            //   {getDropdownLoader ? (
                            //     <option value="--" disabled>
                            //       Loading...
                            //     </option>
                            //   ) : (
                            //     <>
                            //       {apiDropdownOptions?.country
                            //         ?.length > 0 &&
                            //         apiDropdownOptions?.country?.map(
                            //           (country: string) => {
                            //             return (
                            //               <option value={country}>
                            //                 {country}
                            //               </option>
                            //             );
                            //           }
                            //         )}
                            //     </>
                            //   )}
                            // </TomSelect>
                          )}
                        />
                      </div>

                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Index</span>
                        </div>
                        <Controller
                          name="index"
                          control={control}
                          defaultValue={""}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || ""}
                              onChange={(value) => {
                                field.onChange(value);
                              }}
                              options={{
                                placeholder: "Select Index",
                              }}
                              className="w-full"
                              multiple={false}
                            >
                              {getDropdownLoader ? (
                                <option value="--" disabled>
                                  Loading...
                                </option>
                              ) : (
                                <>
                                  {apiDropdownOptions?.index?.map(
                                    (index: string) => {
                                      return (
                                        <option value={index}>
                                          {index}
                                        </option>
                                      );
                                    }
                                  )}
                                </>
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>
                      {
                        isAllCompanySelected === true &&
                        <div className="mx-2">
                          <div className="text-left text-slate-500 flex justify-between mb-1">
                            <span className="font-semibold">Sector</span>
                            {apiDropdownOptions?.sector?.length >
                              0 && (
                                <div>
                                  <FormCheck className="mr-2">
                                    <FormCheck.Label>
                                      Select All
                                    </FormCheck.Label>
                                    <FormCheck.Input
                                      className="ml-1"
                                      id={`sector`}
                                      checked={
                                        apiDropdownOptions?.sector
                                          ?.length ===
                                        watch("sector")?.length
                                      }
                                      type="checkbox"
                                      onChange={(e) => {
                                        if (e.target.checked === true) {
                                          setValue(
                                            "sector",
                                            apiDropdownOptions?.sector
                                          );
                                        } else {
                                          setValue("sector", []);
                                        }
                                      }}
                                    />
                                  </FormCheck>
                                </div>
                              )}
                          </div>
                          <Controller
                            name="sector"
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => (
                              <MultiSelectDropdown
                                data={apiDropdownOptions?.sector}
                                placeholder="Select Sector"
                                loading={getDropdownLoader}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions.map((option) => option.value);
                                  field.onChange(selectedValues);

                                }}
                                selectedOption={field.value || []}
                              />
                              // <TomSelect
                              //   value={field.value || []}
                              //   onChange={(value) => {
                              //     field.onChange(value);
                              //   }}
                              //   options={{
                              //     placeholder: "Select Sector",
                              //   }}
                              //   className="w-full"
                              //   multiple
                              // >
                              //   {getDropdownLoader ? (
                              //     <option value="--" disabled>
                              //       Loading...
                              //     </option>
                              //   ) : (
                              //     <>
                              //       {apiDropdownOptions?.sector
                              //         ?.length > 0 &&
                              //         apiDropdownOptions?.sector?.map(
                              //           (sector: string) => {
                              //             return (
                              //               <option value={sector}>
                              //                 {sector}
                              //               </option>
                              //             );
                              //           }
                              //         )}
                              //     </>
                              //   )}
                              // </TomSelect>
                            )}
                          />
                        </div>
                      }
                    </div>
                  </div>
                </form>
              )}

              {isViewAnalysis && <ChartComponent investorData={investorData} pieChartDataPeerAnalysis={pieChartDataPeerAnalysis} handleSearch={handleSearch} topEngagementTopics={topEngagementTopics} />}

              <div className=" px-5">
                <TableWrapper isLoading={loading}>
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                            Institution
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Year
                          </Table.Td>
                          {isAllCompanySelected && (
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                              Company
                            </Table.Td>
                          )}
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Country
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Sector
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Environmental
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Social
                          </Table.Td>
                          <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                            Governance
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody>
                        {peerAnalysisData?.length > 0 &&
                          peerAnalysisData?.map((peer: TypesPeerAnalysis) => (
                            <Table.Tr key={peer?.id}>
                              <Table.Td>
                                <div className=" flex flex-row justify-start items-center ">
                                  {peer?.institution_logo_url ? (
                                    <>

                                      <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default  rounded-full
                                shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]">
                                        <img
                                          alt="Institution Logo"
                                          className="w-8 h-8 image-fit zoom-in object-contain !cursor-default  rounded-full
                                shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                          src={peer?.institution_logo_url}
                                          content={
                                            peer?.institution_name || ""
                                          }
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div className=" flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                      <img
                                        alt="ZMH Analytics"
                                        className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                        src={investorIcon}
                                      />
                                      <a className="absolute bottom-0 right-0 flex items-center justify-center rounded-full  w-7 h-7"
                                      ></a>
                                    </div>
                                  )}

                                  <div className="ml-4">
                                    <p className="font-medium text-wrap w-[150px]">
                                      {peer?.institution_name}
                                    </p>
                                  </div>
                                </div>
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600 w-[100px] text-wrap">
                                {peer?.year}
                              </Table.Td>
                              {isAllCompanySelected && (
                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px] text-wrap">
                                  {peer?.company_name}
                                </Table.Td>
                              )}
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600 w-[100px] text-wrap">
                                {peer?.company_country}
                              </Table.Td>

                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[100px] text-wrap">
                                {peer?.company_sector}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600 w-[100px] text-wrap">
                                {peer?.env_list}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600 w-[100px] text-wrap">
                                {peer?.soc_list}
                              </Table.Td>
                              <Table.Td className="py-2  border-dashed dark:bg-darkmode-600 w-[200px] text-wrap">
                                {peer?.gov_list}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </div>
                </TableWrapper>
              </div>
              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                <CPagination
                  page={page}
                  totalPages={totalPages}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />

                <footer className="!pt-3 flex items-start flex-col">
                  <span className="!pt-3 flex items-center relative">
                    <sup
                      className="bold-sup cursor-pointer ml-1"
                      style={{ fontSize: "0.8em" }}
                    >
                      *
                    </sup>
                    <p id="footnote" className="">
                      Investor does not disclose engagement details. (Dimensional does not disclose engagement topics)
                    </p>

                  </span>
                </footer>


                {/* <FormSelect className="sm:w-20 rounded-[0.5rem]">
                <option>10</option>
                <option>25</option>
                <option>35</option>
                <option>50</option>
              </FormSelect> */}
              </div>
            </div>
          </div>


          {addNewInvesterModalVisible && (
            <AddNewInvesterProfile
              addNewInvesterModalVisible={addNewInvesterModalVisible}
              setAddNewInvesterModalVisible={setAddNewInvesterModalVisible}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default PeerAnalysis;
