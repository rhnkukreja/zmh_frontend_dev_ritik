import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
  convertToTitleCase,
  countValidFilters,
  createDynamicURL,
  generateFilterChips,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  baseURL,
  proponent_type,
  proposal_type,
  proposal_keywords,
} from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import { FormCheck, FormInput, FormSwitch } from "@/components/Base/Form";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";
import {
  fetchVdsEuropeans,
  resetPage,
  setAllFilters,
  setPage,
} from "@/stores/vdsEuropeanSlice";
import { vdsEuropeanService } from "@/services/vdsEuropean";
import { setTempSearch } from "@/stores/dashboardSlice";
import FilterChips from "@/components/FilterChips";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "@/components/Base/LoadingIcon";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { peerAnalysisService } from "@/services/peerAnalysis";
import { i } from "vite/dist/node/types.d-aGj9QkWt";

const index = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const { VdsEuropeans, loading, page, totalPages, count } = useAppSelector(
    (state) => state.vdsEuropean
  );

  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const [searchParams] = useSearchParams();
  const searchTicker = searchParams.get("ticker");
  const [allApplyFilter, setallApplyFilter] = useState<any>({});
  const [allAnalyticsFilter, setAllAnalyticsFilter] = useState<any>({});
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] =
    useState<boolean>(false);
  const [apiInstitutionDropdown, setApiInstitutionDropdown] = useState<any>({
    institution: [],
  });
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [vdsEuropeansAnalytics, setVdsEuropeansAnalytics] = useState<any>([]);
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(true);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [dropdownValues, setDropdownValues] = useState<any>({
    company_name: [],
    institution: [],
    index: [],
  });
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState<boolean>(false);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const [analyticsPage, setAnalyticsPage] = useState<number>(1);
  const [getDynamicDropdownLoader, setGetDynamicDropdownLoader] =
    useState<boolean>(false);
  const [apiDependentDropdownOptions, setApiDependentDropdownOptions] =
    useState<any>({
      institution: [],
      vote: [],
      category: [],
      year: [],
      index: [],
    });
  const formatNumberWithCommas = (num: number): string => num.toLocaleString();
  const toggleExpand = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };
  const toggleGroup = (company_name: string) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [company_name]: !prevState[company_name],
    }));
  };
  const hasAnyValidFilter = (filterObj: Record<string, any>): boolean => {
    return Object.values(filterObj || {}).some((val) => {
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "string") return val.trim() !== "";
      if (typeof val === "number") return !isNaN(val);
      return !!val;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (hasAnyValidFilter(allApplyFilter)) {
        setIsLoading(true);

        await dispatch(
          fetchVdsEuropeans(
            createDynamicURL(
              `${baseURL}/vds_european/`,
              allApplyFilter,
              undefined,
              page
            )
          )
        );

        setFiltersLength(countValidFilters(allApplyFilter));
        setSelectedChipFilters(generateFilterChips(allApplyFilter));
        dispatch(setTempSearch(companyGlobalSearchName));

        setIsLoading(false);
      }
    };

    fetchData();
    // console.log(watch("year"));
  }, [companyGlobalSearchTicker, searchTicker, allApplyFilter, page]);

  useEffect(() => {
    getDependentDropdown();
  }, [dropdownValues?.company_name]);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    defaultValues: {
      institution_name: [],
      vote: [],
      category: [],
      year: "",
    },
  });

  const getDependentDropdown = async () => {
    const paramFilter = {
      company_name:
        dropdownValues?.company_name !== ""
          ? [dropdownValues?.company_name]
          : [],
      institution_name: dropdownValues?.institution_name,
      year:
        dropdownValues?.institution_name && dropdownValues?.company_name
          ? 2024
          : null,
    };
    if (dropdownValues?.institution_name && dropdownValues?.company_name) {
      setValue("year", 2024);
    }
    try {
      if (
        dropdownValues?.company_name?.length === 0 ||
        dropdownValues?.company_name === ""
      )
        return;
      setGetDynamicDropdownLoader(true);
      const res = await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues(
        paramFilter
      );
      if (res.result) {
        setApiDependentDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDynamicDropdownLoader(false);
    }
  };

  const getInstituionDependentDropdown = async (value: any) => {
    if (value !== "") {
      const paramFilter = {
        company_name: [value],
      };
      try {
        setGetFundNameDropdownLoader(true);
        const res =
          await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues(
            paramFilter
          );
        if (res.result) {
          setApiInstitutionDropdown({ ...res.result });
        }
      } catch (error) {
        return error;
      } finally {
        setGetFundNameDropdownLoader(false);
      }
    }
  };

  const handleDropdownChange = (key: string, value: any) => {
    setDropdownValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const onSubmit = async (npxFilter: any) => {
    if (isViewAnalysis) {
      onAnalyticsSubmit(npxFilter);
      return;
    }

    if (
      npxFilter?.company_name?.length === 0 ||
      !npxFilter?.company_name?.label
    ) {
      toast.warning("Please Select Company Name");
      return;
    }
    if (npxFilter?.year === " " || npxFilter?.year === "") {
      toast.warning("Please Select Year");
      return;
    }
    setallApplyFilter({
      company_name: [npxFilter?.company_name?.label],
      institution_name: npxFilter?.institution_name,
      vote: npxFilter?.vote,
      category: npxFilter?.category,
      year: npxFilter?.year,
      keyword: npxFilter?.keyword,
    });
    dispatch(resetPage());
    setIsFilterCollapse(false);
  };

  const onAnalyticsSubmit = async (data: any) => {
    if (isViewAnalysis && !data?.institution_name?.length) {
      toast.warning("Please Select Institution Name");
      return;
    }

    setAllAnalyticsFilter({
      ...data,
      ...(data?.company_name?.label && {
        company_name: [data.company_name.label],
      }),
    });
  };

  const onFilterClear = (onAnalyticsTab) => {
    setSelectedChipFilters([]);
    setFiltersLength(0);
    reset();
    resetFormValues();
    if (onAnalyticsTab) {
      setAllAnalyticsFilter({});
      setVdsEuropeansAnalytics({})
    } else {
      setallApplyFilter({});
      dispatch(resetPage());
      dispatch(
        fetchVdsEuropeans(
          createDynamicURL(
            `${baseURL}/vds_european/`,
            undefined,
            undefined,
            page
          )
        )
      );

      setApiDependentDropdownOptions({
        institution: [],
        vote: [],
        category: [],
        year: [],
      });
      setApiInstitutionDropdown({
        institution: [],
      });
    }
  };

  const resetFormValues: any = () => {
    setValue("company_name", []);
    setValue("institution_name", []);
    setValue("vote", []);
    setValue("category", []);
    setValue("year", "");
    setValue("keyword", "");
  };

  const handleNextPage = () => {
    if (isViewAnalysis) {
      const currentPage = vdsEuropeansAnalytics?.pagination?.current_page;
      const totalPages = vdsEuropeansAnalytics?.pagination?.total_pages;
      if (currentPage < totalPages) {
        setAnalyticsPage(currentPage + 1);
      }
    } else {
      if (page < totalPages) {
        dispatch(setPage(page + 1));
      }
    }
  };

  const handlePreviousPage = () => {
    if (isViewAnalysis) {
      const currentPage = vdsEuropeansAnalytics?.pagination?.current_page;
      if (currentPage > 1) {
        setAnalyticsPage(currentPage - 1);
      }
    } else {
      if (page > 1) {
        dispatch(setPage(page - 1));
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isViewAnalysis) {
      setAnalyticsPage(newPage);
    } else {
      dispatch(setPage(newPage));
    }
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    if (isViewAnalysis) {
      const updatedFilters = { ...allAnalyticsFilter };

      if (Array.isArray(updatedFilters[removeKey])) {
        updatedFilters[removeKey] = updatedFilters[removeKey].filter(
          (item) => item !== removeValue
        );
      } else if (updatedFilters[removeKey] === removeValue) {
        if (removeKey === "year") {
          updatedFilters[removeKey] = " ";
        } else {
          updatedFilters[removeKey] = "";
        }
      }
      setValue(removeKey, updatedFilters[removeKey]);
      setAllAnalyticsFilter(updatedFilters);
      return;
    }

    const updatedFilters = { ...allApplyFilter };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      if (removeKey === "year") {
        updatedFilters[removeKey] = " ";
      } else {
        updatedFilters[removeKey] = "";
      }
    }

    setValue(removeKey, updatedFilters[removeKey]);
    // dispatch(setAllFilters(updatedFilters));
    setallApplyFilter(updatedFilters);
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (hasAnyValidFilter(allAnalyticsFilter)) {
        console.log("Fetching analytics with filters:", allAnalyticsFilter);
        const body = {
          investor_company: allAnalyticsFilter?.institution_name
            ? allAnalyticsFilter?.institution_name
            : [],
          year:
            allAnalyticsFilter?.analyticsYear.length > 0
              ? allAnalyticsFilter?.analyticsYear
              : [],
          proponent_type: allAnalyticsFilter?.proponent_type
            ? allAnalyticsFilter?.proponent_type
            : [],
          proposal_type: allAnalyticsFilter?.proposal_type
            ? allAnalyticsFilter?.proposal_type
            : [],
          index_name:
            allAnalyticsFilter?.index_name.length > 0
              ? allAnalyticsFilter.index_name
              : [],
          country: ["USA"],
          page: analyticsPage || 1,
        };

        try {
          setIsAnalyticsLoading(true);
          const response = await vdsEuropeanService.getVDSEuropeanAnalytics(
            `${baseURL}/api/proposal-voting-stats`,
            body
          );

          setVdsEuropeansAnalytics(response.response);
        } catch (error) {
          console.error("Error fetching analytics:", error);
        } finally {
          setIsAnalyticsLoading(false);
        }
      }else{
        setVdsEuropeansAnalytics({});
      }
    };
    if (isViewAnalysis) {
      fetchAnalytics();
      setFiltersLength(countValidFilters(allAnalyticsFilter));
      setSelectedChipFilters(generateFilterChips(allAnalyticsFilter));
    }
  }, [allAnalyticsFilter, analyticsPage]);

  const getAllCaseStudyDropdowns = async () => {
    try {
      setGetDropdownLoader(true);
      const res = await peerAnalysisService.getPeerAnalysisDropdownValues();
      if (res.result) {
        setApiDependentDropdownOptions({ ...res.result });
      }
    } catch (error) {
      return error;
    } finally {
      setGetDropdownLoader(false);
    }
  };

  useEffect(() => {
    if (isViewAnalysis) {
      getAllCaseStudyDropdowns();
    }
  }, [isViewAnalysis]);

  return (
    <>
      <div className="w-full flex gap-3 px-4 py-6 bg-white dark:bg-darkmode-800">
        <button
          className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${
            isViewAnalysis === false
              ? "bg-primary text-white shadow"
              : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
          }`}
          onClick={() => {
            setIsViewAnalysis(false);
            onFilterClear(false);
           
          }}
        >
          Voting Data
        </button>
        <button
          className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${
            isViewAnalysis === true
              ? "bg-primary text-white shadow"
              : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
          }`}
          onClick={() => {
            setIsViewAnalysis(true);
            setIsFilterCollapse(true);
            onFilterClear(true);
          }}
        >
          Analytics
        </button>
      </div>

      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold">Voting Data (Beta)</h1>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            {!isViewAnalysis && count > 0 && (
              <h2 className="flex items-end font-semibold justify-end text-[13px] md:ml-auto mx-5">
                Count: {count.toLocaleString()}
              </h2>
            )}

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

        {selectedChipFilters?.length > 0 && (
          <>
            <FilterChips
              filters={selectedChipFilters}
              onRemove={handleRemoveChip}
            />
          </>
        )}

        {isFilterCollapse && (
          <div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="filter-section mb-5">
                <div className="flex items-center justify-end mt-2 mb-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsFilterCollapse(false);
                      onFilterClear(isViewAnalysis);
                    }}
                    type="button"
                    className="w-32 mx-2"
                  >
                    Clear
                  </Button>
                  <Button variant="primary" className="w-32 mx-2" type="submit">
                    Apply
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  {!isViewAnalysis && (
                    <div className="w-full">
                      <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                        Company*
                      </div>
                      <Controller
                        name="company_name"
                        control={control}
                        defaultValue={[]}
                        render={({ field }) => (
                          <CompanySelect
                            isClearable={true}
                            exactUrl={
                              "get_vds_european_dropdown_values/?company_name="
                            }
                            value={field.value}
                            onChange={(value: any) => {
                              field.onChange(value);
                              !isViewAnalysis &&
                                handleDropdownChange(
                                  "company_name",
                                  value?.label
                                );
                              !isViewAnalysis &&
                                getInstituionDependentDropdown(value?.label);
                            }}
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="w-full">
                    <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                      Institution{isViewAnalysis && "*"}
                      <div>
                        {" "}
                        <FormCheck.Label>Select All</FormCheck.Label>
                        <FormCheck.Input
                          className="ml-1"
                          id="year"
                          checked={(() => {
                            const institutionDropdown = isViewAnalysis
                              ? apiDependentDropdownOptions?.institutes?.map(
                                  (item: any) => item.institution_name
                                )
                              : apiInstitutionDropdown?.institution;

                            return (
                              Array.isArray(institutionDropdown) &&
                              institutionDropdown.length > 0 &&
                              institutionDropdown.length ===
                                watch("institution_name")?.length
                            );
                          })()}
                          type="checkbox"
                          onChange={(e) => {
                            const institutionDropdown = isViewAnalysis
                              ? apiDependentDropdownOptions?.institutes?.map(
                                  (item: any) => item.institution_name
                                )
                              : apiInstitutionDropdown?.institution;
                            setValue(
                              "institution_name",
                              e.target.checked ? institutionDropdown : []
                            );
                          }}
                        />
                      </div>
                    </div>
                    <Controller
                      name="institution_name"
                      control={control}
                      defaultValue={[]}
                      render={({ field }) => (
                        <MultiSelectDropdown
                          data={
                            isViewAnalysis
                              ? apiDependentDropdownOptions?.institutes?.map(
                                  (item: any) => item.institution_name
                                )
                              : apiInstitutionDropdown?.institution
                          }
                          placeholder="Select Institutions"
                          loading={getFundNameDropdownLoader}
                          onChange={(selectedOptions) => {
                            const selectedValues = selectedOptions.map(
                              (option) => option.value
                            );
                            field.onChange(selectedValues);
                            handleDropdownChange(
                              "institution_name",
                              selectedValues
                            );
                          }}
                          selectedOption={field.value || []}
                        />
                      )}
                    />
                  </div>

                  {isViewAnalysis ? null : (
                    <div className="w-full">
                      <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                        <div>Year</div>
                      </div>

                      <Controller
                        name="year"
                        control={control}
                        defaultValue={""} // Default should be an empty string instead of an array
                        render={({ field }) => (
                          <TomSelect
                            value={field.value || ""} // Ensure value is a string
                            onChange={(value) => {
                              field.onChange(value); // Set a string value instead of an array
                            }}
                            options={{
                              placeholder: "Select Year",
                              allowEmptyOption: true,
                            }}
                            className="w-full"
                            // multiple
                          >
                            {getDynamicDropdownLoader ? (
                              <option disabled>Loading...</option>
                            ) : (
                              apiDependentDropdownOptions?.year?.map(
                                (year: any) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                )
                              )
                            )}
                          </TomSelect>
                        )}
                      />
                    </div>
                  )}
                  {isViewAnalysis ? (
                    <div className="w-full">
                      <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                        <div>Year</div>
                        <div>
                          {" "}
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="analyticsYear"
                            checked={
                              apiDependentDropdownOptions?.year?.length > 0 &&
                              apiDependentDropdownOptions?.year?.length ===
                                watch("analyticsYear")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "analyticsYear",
                                e.target.checked
                                  ? apiDependentDropdownOptions?.year
                                  : []
                              );
                            }}
                          />
                        </div>
                      </div>

                      {isViewAnalysis && (
                        <Controller
                          name="analyticsYear"
                          control={control}
                          defaultValue={""} // Default should be an empty string instead of an array
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDependentDropdownOptions?.year}
                              placeholder="Select Year"
                              loading={getDynamicDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map(
                                  (option) => option.value
                                );
                                field.onChange(selectedValues);
                              }}
                              selectedOption={field.value || []}
                            />
                          )}
                        />
                      )}
                    </div>
                  ) : (
                    ""
                  )}
                  {isViewAnalysis ? (
                    <div className="w-full me-2">
                      <div className="text-left text-slate-500 flex justify-between mb-1">
                        <span className="font-semibold">Index </span>
                        <div>
                          {" "}
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="index_name"
                            checked={
                              apiDependentDropdownOptions?.index?.length > 0 &&
                              apiDependentDropdownOptions?.index?.length ===
                                watch("index_name")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "index_name",
                                e.target.checked
                                  ? apiDependentDropdownOptions?.index
                                  : []
                              );
                            }}
                          />
                        </div>
                      </div>
                      {isViewAnalysis && (
                        <div>
                          {" "}
                          <Controller
                            name="index_name"
                            control={control}
                            render={({ field }) => (
                              <MultiSelectDropdown
                                data={apiDependentDropdownOptions?.index?.map(
                                  (item: any) => item
                                )}
                                placeholder="Select Index"
                                loading={false}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions.map(
                                    (option) => option.value
                                  );
                                  field.onChange(selectedValues);
                                }}
                                selectedOption={field.value || []}
                              />
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    ""
                  )}
                </div>

                {isViewAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="w-full me-2">
                      <div className="text-left text-slate-500 flex justify-between mb-1">
                        <span className="font-semibold">Proposal Type</span>
                        <div>
                          {" "}
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="proposal_type"
                            checked={
                              proposal_type?.length > 0 &&
                              proposal_type?.length ===
                                watch("proposal_type")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "proposal_type",
                                e.target.checked ? proposal_type : []
                              );
                            }}
                          />
                        </div>
                      </div>
                      {isViewAnalysis && (
                        <div>
                          <Controller
                            name="proposal_type"
                            control={control}
                            render={({ field }) => (
                              <MultiSelectDropdown
                                data={proposal_type.map((item: any) =>
                                  item
                                )}
                                placeholder="Select Proposal Type"
                                loading={false}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions.map(
                                    (option) => option.value
                                  );
                                  field.onChange(selectedValues);
                                }}
                                selectedOption={field.value || []}
                              />
                             
                            )}
                          />
                        </div>
                      )}
                    </div>
                    <div className="w-full me-2">
                      <div className="text-left text-slate-500 flex justify-between mb-1">
                        <span className="font-semibold">Proponent Type </span>
                        <div>
                          {" "}
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="proponent_type"
                            checked={
                              proponent_type?.length > 0 &&
                              proponent_type?.length ===
                                watch("proponent_type")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "proponent_type",
                                e.target.checked ? proponent_type : []
                              );
                            }}
                          />
                        </div>
                      </div>
                      <Controller
                        name="proponent_type"
                        control={control}
                        render={({ field }) => (
                          <MultiSelectDropdown
                            data={proponent_type?.map((item: any) =>
                              item
                            )}
                            placeholder="Select Proponent Type"
                            loading={false}
                            onChange={(selectedOptions) => {
                              const selectedValues = selectedOptions.map(
                                (option) => option.value
                              );
                              field.onChange(selectedValues);
                            }}
                            selectedOption={field.value || []}
                          />
                          
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="w-full">
                      <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                        Vote{" "}
                        <div>
                          {" "}
                          <FormCheck.Label>Select All</FormCheck.Label>
                          <FormCheck.Input
                            className="ml-1"
                            id="vote"
                            checked={
                              apiDependentDropdownOptions?.vote?.length > 0 &&
                              apiDependentDropdownOptions?.vote.length ===
                                watch("vote")?.length
                            }
                            type="checkbox"
                            onChange={(e) => {
                              setValue(
                                "vote",
                                e.target.checked
                                  ? apiDependentDropdownOptions?.vote
                                  : []
                              );
                            }}
                          />
                        </div>
                      </div>
                      <Controller
                        name="vote"
                        control={control}
                        defaultValue={[]}
                        render={({ field }) => (
                          <MultiSelectDropdown
                            data={apiDependentDropdownOptions?.vote}
                            placeholder="Select Vote"
                            loading={getDynamicDropdownLoader}
                            onChange={(selectedOptions) => {
                              const selectedValues = selectedOptions.map(
                                (option) => option.value
                              );
                              field.onChange(selectedValues);
                            }}
                            selectedOption={field.value || []}
                          />
                        )}
                      />
                    </div>
                    <div className="w-full">
                      <div className="text-left text-slate-500  font-semibold">
                        Keyword
                      </div>
                      <Controller
                        name="keyword"
                        control={control}
                        defaultValue=""
                        render={({ field }) => (
                          <FormInput
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSubmit(onSubmit)();
                              }
                            }}
                            value={field.value?.toString() || ""}
                            onChange={field.onChange}
                            type="text"
                            className="mt-1"
                            placeholder="Search Keyword"
                          />
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
        {isLoading && (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        )}

        {isViewAnalysis ? (
          <div className="mb-7">
            {vdsEuropeansAnalytics?.by_institution?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2  gap-6 mb-6">
                {vdsEuropeansAnalytics?.by_institution.map((institution) => (
                  <div
                    key={institution.institution_id}
                    className="bg-gray-100 p-4 rounded-lg shadow-md"
                  >
                    <h4 className="text-md font-semibold mb-2">
                      {institution.institution_name}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="border p-2 text-left">Metric</th>
                            <th className="border p-2 text-center">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border p-2">Total Proposals</td>
                            <td className="border p-2 text-center">
                              {formatNumberWithCommas(
                                institution.total_proposals
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2">For Votes</td>
                            <td className="border p-2 text-center">
                              {formatNumberWithCommas(institution.for_votes)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2">Against Votes</td>
                            <td className="border p-2 text-center">
                              {formatNumberWithCommas(
                                institution.against_votes
                              )}
                            </td>
                          </tr>

                          <tr>
                            <td className="border p-2">
                              Aligned with Management
                            </td>
                            <td className="border p-2 text-center">
                              {formatNumberWithCommas(
                                institution.aligned_with_mgmt
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2">Alignment Percentage</td>
                            <td className="border p-2 text-center">
                              {institution.alignment_percentage}%
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-2">Support Percentage</td>
                            <td className="border p-2 text-center">
                              {institution.support_percentage}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <TableWrapper isLoading={isAnalyticsLoading}>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative">
                <Table>
                  {vdsEuropeansAnalytics?.by_company?.length > 0 && (
                    <Table.Thead className="relative">
                      <Table.Tr className="sticky z-30" style={{ top: 0 }}>
                        <Table.Td
                          className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                          style={{ width: "35%" }}
                          colSpan={8}
                        >
                          Company
                        </Table.Td>
                      </Table.Tr>
                    </Table.Thead>
                  )}
                  <Table.Tbody className="!max-h-400px overflow-auto position-relative">
                    <>
                      {vdsEuropeansAnalytics?.by_company?.length > 0 &&
                        vdsEuropeansAnalytics?.by_company.map((ele, index) => {
                          return (
                            <>
                              <Table.Tr
                                className={`bg-gray-100 dark:bg-darkmode-700 sticky z-10 my-10`}
                                style={{ top: 50 }}
                              >
                                <Table.Td
                                  colSpan={8}
                                  className="font-semibold py-2  "
                                >
                                  <div className="flex flex-row justify-between items-center">
                                    <div
                                      className=" cursor-pointer flex flex-row items-center"
                                      onClick={() =>
                                        toggleGroup(ele.company_name)
                                      }
                                    >
                                      {" "}
                                      {ele.company_name}
                                      <button className="ml-2 text-blue-500">
                                        {openGroups[ele.company_name] ? (
                                          <Lucide
                                            icon="ChevronUp"
                                            className=" w-6 h-6 mr-2 "
                                          />
                                        ) : (
                                          <Lucide
                                            icon="ChevronDown"
                                            className=" w-6 h-6 mr-2 "
                                          />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </Table.Td>
                              </Table.Tr>

                              {openGroups[ele.company_name] &&
                                Array.isArray(ele.sample_proposals) && (
                                  <>
                                    <Table.Tr
                                      className="sticky z-10"
                                      style={{ top: 87 }}
                                    >
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "17.5%" }}
                                      >
                                        Proposal
                                      </Table.Td>
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "17.5%" }}
                                      >
                                        Meeting Date
                                      </Table.Td>
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "5%" }}
                                      >
                                        Meeting type
                                      </Table.Td>
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "25%" }}
                                      >
                                        Company Name
                                      </Table.Td>

                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "30%" }}
                                      >
                                        Vote
                                      </Table.Td>
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "30%" }}
                                      >
                                        Management Recommendation
                                      </Table.Td>
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "30%" }}
                                      >
                                        Proposal No
                                      </Table.Td>
                                      <Table.Td
                                        className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                        style={{ width: "30%" }}
                                      >
                                        Country
                                      </Table.Td>
                                    </Table.Tr>

                                    {ele.sample_proposals?.length > 0 &&
                                      (() => {
                                        return ele.sample_proposals.map(
                                          (vds) => {
                                            return (
                                              <Table.Tr
                                                key={index}
                                                className={clsx(
                                                  "[&_td]:last:border-b-0",
                                                  "bg-white dark:bg-darkmode-600"
                                                )}
                                              >
                                                <Table.Td
                                                  className="whitespace-nowrap overflow-hidden text-ellipsis"
                                                  style={{ width: "17.5%" }}
                                                >
                                                  {vds?.proposal.length > 50 ? (
                                                    <span>
                                                      {expandedRows[index]
                                                        ? vds?.proposal
                                                        : vds?.proposal.slice(
                                                            0,
                                                            50
                                                          ) + "..."}
                                                      <button
                                                        onClick={() =>
                                                          toggleExpand(index)
                                                        }
                                                        className="ml-1 text-blue-500 flex-shrink-0 inline-flex items-center"
                                                      >
                                                        <Lucide
                                                          icon={
                                                            expandedRows[index]
                                                              ? "ChevronUp"
                                                              : "ChevronDown"
                                                          }
                                                          className="w-4 h-4"
                                                        />
                                                      </button>
                                                    </span>
                                                  ) : (
                                                    vds?.proposal
                                                  )}
                                                </Table.Td>
                                                <Table.Td className="whitespace-nowrap overflow-hidden text-ellipsis">
                                                  {vds?.meeting_date}
                                                </Table.Td>

                                                <Table.Td className="py-2 border-dashed dark:bg-transparent">
                                                  <div className="flex">
                                                    {convertToTitleCase(
                                                      vds?.meeting_type
                                                    )}
                                                  </div>
                                                </Table.Td>

                                                <Table.Td className="py-2 border-dashed dark:bg-transparent">
                                                  {vds?.company__name}
                                                </Table.Td>

                                                <Table.Td className="py-2 border-dashed dark:bg-transparent">
                                                  <div className="flex">
                                                    {vds?.vote ===
                                                    "Split Vote" ? (
                                                      <Tippy
                                                        content={
                                                          vds?.split_vote_counts
                                                        }
                                                        options={{
                                                          theme: "light",
                                                        }}
                                                      >
                                                        {vds?.vote}
                                                      </Tippy>
                                                    ) : (
                                                      <span
                                                        className={clsx([
                                                          (vds?.vote?.includes(
                                                            "Against"
                                                          ) ||
                                                            vds.vote?.includes(
                                                              "Withhold"
                                                            )) &&
                                                            "text-red-700 font-semibold ",
                                                        ])}
                                                      >
                                                        {vds?.vote}
                                                      </span>
                                                    )}
                                                    {vds?.notes &&
                                                      vds.notes.toLowerCase() !==
                                                        "nan" && (
                                                        <span
                                                          data-tooltip-id="my-tooltip-data-html"
                                                          data-tooltip-html={
                                                            vds?.notes
                                                          }
                                                        >
                                                          <Lucide
                                                            icon="Info"
                                                            className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800 cursor-pointer"
                                                          />
                                                        </span>
                                                      )}
                                                  </div>
                                                </Table.Td>
                                                <Table.Td className="py-2 border-dashed dark:bg-transparent">
                                                  {convertToTitleCase(
                                                    vds?.mgt_rec
                                                  )}
                                                </Table.Td>
                                                <Table.Td className="py-2 border-dashed dark:bg-transparent">
                                                  {vds?.proposal_num}
                                                </Table.Td>

                                                <Table.Td className="py-2 border-dashed dark:bg-transparent">
                                                  {vds?.country}
                                                </Table.Td>
                                              </Table.Tr>
                                            );
                                          }
                                        );
                                      })()}
                                  </>
                                )}
                            </>
                          );
                        })}
                    </>
                  </Table.Tbody>
                </Table>
              </div>
              {vdsEuropeansAnalytics?.by_company?.length > 0 && (
                <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                  <CPagination
                    page={vdsEuropeansAnalytics?.pagination?.current_page || 1}
                    totalPages={
                      vdsEuropeansAnalytics?.pagination?.total_pages || 1
                    }
                    handleNextPage={handleNextPage}
                    handlePageChange={handlePageChange}
                    handlePreviousPage={handlePreviousPage}
                  />
                </div>
              )}
            </TableWrapper>

            {(!vdsEuropeansAnalytics?.by_company ||
              (vdsEuropeansAnalytics?.by_company?.length === 0 &&
                !isAnalyticsLoading)) && (
              <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center"></div>
            )}

            {/* {isAnalyticsLoading && (
                    <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                  <LoadingIcon
                    color="#800000"
                    icon="three-dots"
                    className="w-16 h-16"
                  />
                  </div>
                )} */}
          </div>
        ) : VdsEuropeans?.length > 0 ? (
          <div className="w-full">
            <>
              <div className="">
                <div>
                  <TableWrapper isLoading={allApplyFilter && loading}>
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Td
                              className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                              style={{ width: "17.5%" }}
                            >
                              Institution
                            </Table.Td>
                            <Table.Td
                              className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                              style={{ width: "17.5%" }}
                            >
                              Meeting Type
                            </Table.Td>
                            <Table.Td
                              className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                              style={{ width: "5%" }}
                            >
                              No.
                            </Table.Td>
                            <Table.Td
                              className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                              style={{ width: "25%" }}
                            >
                              Proposal
                            </Table.Td>
                            <Table.Td
                              className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                              style={{ width: "10%" }}
                            >
                              Management Recommendation
                            </Table.Td>
                            <Table.Td
                              className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                              style={{ width: "30%" }}
                            >
                              Vote Cast
                            </Table.Td>
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {VdsEuropeans?.length > 0 &&
                            (() => {
                              let lastInstitutionName = "";
                              let toggle = false;

                              return VdsEuropeans.map(
                                (vds: any, index: number) => {
                                  const currentInstitution =
                                    vds?.excel_institution_name;

                                  if (
                                    currentInstitution !== lastInstitutionName
                                  ) {
                                    toggle = !toggle;
                                    lastInstitutionName = currentInstitution;
                                  }

                                  return (
                                    <Table.Tr
                                      key={vds?.id}
                                      className={clsx(
                                        "[&_td]:last:border-b-0",
                                        toggle
                                          ? "bg-white dark:bg-darkmode-600"
                                          : "bg-gray-200 dark:bg-darkmode-900"
                                      )}
                                    >
                                      <Table.Td
                                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                                        style={{ width: "17.5%" }}
                                      >
                                        {vds?.excel_institution_name}
                                      </Table.Td>

                                      <Table.Td
                                        className="py-2 border-dashed dark:bg-transparent"
                                        style={{ width: "17.5%" }}
                                      >
                                        <div className="flex">
                                          {convertToTitleCase(
                                            vds?.meeting_type
                                          )}
                                        </div>
                                      </Table.Td>

                                      <Table.Td
                                        className="py-2 border-dashed dark:bg-transparent"
                                        style={{ width: "5%" }}
                                      >
                                        {vds?.proposal_num}
                                      </Table.Td>

                                      <Table.Td
                                        className="py-2 border-dashed dark:bg-transparent"
                                        style={{ width: "25%" }}
                                      >
                                        {vds?.proposal}
                                      </Table.Td>

                                      <Table.Td
                                        className="py-2 border-dashed dark:bg-transparent"
                                        style={{ width: "10%" }}
                                      >
                                        {convertToTitleCase(vds?.mgt_rec)}
                                      </Table.Td>

                                      <Table.Td
                                        className="py-2 border-dashed dark:bg-transparent"
                                        style={{ width: "30%" }}
                                      >
                                        <div className="flex">
                                          {vds?.vote === "Split Vote" ? (
                                            <Tippy
                                              content={vds?.split_vote_counts}
                                              options={{ theme: "light" }}
                                            >
                                              {vds?.vote}
                                            </Tippy>
                                          ) : (
                                            <span
                                              className={clsx([
                                                (vds?.vote?.includes(
                                                  "Against"
                                                ) ||
                                                  vds.vote?.includes(
                                                    "Withhold"
                                                  )) &&
                                                  "text-red-700 font-semibold ",
                                              ])}
                                            >
                                              {vds?.vote}
                                            </span>
                                          )}
                                          {vds?.notes &&
                                            vds.notes.toLowerCase() !==
                                              "nan" && (
                                              <span
                                                data-tooltip-id="my-tooltip-data-html"
                                                data-tooltip-html={vds?.notes}
                                              >
                                                <Lucide
                                                  icon="Info"
                                                  className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800 cursor-pointer"
                                                />
                                              </span>
                                            )}
                                        </div>
                                      </Table.Td>
                                    </Table.Tr>
                                  );
                                }
                              );
                            })()}
                        </Table.Tbody>
                        {VdsEuropeans?.length === 0 && (
                          <div className="w-full">
                            <h1 className="mt-3">No Voting Data available</h1>
                          </div>
                        )}
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
                </div>
              </div>
            </>
          </div>
        ) : (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            {loading && (
              <LoadingIcon
                color="#800000"
                icon="three-dots"
                className="w-16 h-16"
              />
            )}
            {/* <h1 className="font-semibold"></h1> */}
          </div>
        )}
      </div>

      <Tooltip
        id="my-tooltip-data-html"
        style={{
          zIndex: 10,
          backgroundColor: "white",
          color: "#000000",
          width: "maxContent",
          maxWidth: 700,
          boxShadow: "2px 4px 6px rgba(0, 0, 0, 0.2)",
          cursor: "pointer",
        }}
      />
    </>
  );
};

export default index;
