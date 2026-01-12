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
import { countValidFilters, countIndividualFilters, createDynamicURL, downloadFileFromAPI, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { ArrowDown, FilterX, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";

import AddNewInvesterProfile from "../InvestorProfiles/components/AddNewInvester";
import Table from "@/components/Base/Table";
import { TypesPeerAnalysis } from "@/types/peerAnalysis";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { toast } from "react-toastify";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";

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
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl, FaGlobe } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import Pill from "@/components/Pill";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import AddEngagementDetailsModal from "./components/AddEngagementDetailsModal";

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
  const [addEngagementDetailsModalVisible, setAddEngagementDetailsModalVisible] =
    useState<boolean>(false);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState(true);

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
  const [loadingDownload, setLoadingDownload] = useState(false);
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
      countIndividualFilters(
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
    // Clear the filter chips immediately
    setSelectedChipFilters([]);
    setFiltersLength(0);
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
    // Update filter chips and count immediately
    const updatedFilters = { ...filters, institution_name: [] };
    const { global_search, institution_name, ...chipFilters } = updatedFilters;
    setSelectedChipFilters(generateFilterChips(chipFilters));
    setFiltersLength(countIndividualFilters(chipFilters));
    
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
      // Switching to "View for All Companies" mode
      setViewAll(true);
      
      // Clear all form values first
      resetFormValues();
      setSelectedInstitution([""]);
      setSearchTerms([]);
      
      // Get sector from current peerAnalysisData (from global search)
      const sectorFromData = peerAnalysisData?.[0]?.company_sector;
      const sectorFilter = sectorFromData ? [sectorFromData] : [];
      
      // Set default filters for "View All" mode - current year and previous year
      const currentYear = new Date().getFullYear();
      const defaultYears = [(currentYear - 1).toString(), currentYear.toString()];
      setValue("year", defaultYears);
      setValue("country", ["USA"]);
      setValue("sector", sectorFilter);
      
      // Clear filter chips and count
      setSelectedChipFilters([]);
      setFiltersLength(0);
      
      // Reset Redux state with only the default filters
      dispatch(
        setAllFilters({
          year: defaultYears,
          country: ["USA"],
          category: [],
          sector: sectorFilter,
          index: undefined,
          institution_name: [],
          global_search: [],
        })
      );
    }
    else {
      // Switching to "Default/Company" mode
      setViewAll(false);
      
      // Clear all form values first
      resetFormValues();
      setSelectedInstitution([""]);
      setSearchTerms([]);
      
      // Clear filter chips and count
      setSelectedChipFilters([]);
      setFiltersLength(0);
      
      // Reset Redux state completely for company mode
      dispatch(
        setAllFilters({
          year: [],
          country: [],
          category: [],
          sector: [],
          index: undefined,
          institution_name: [],
          global_search: [companyGlobalSearchName],
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
      setValue(removeKey, updatedFilters[removeKey]);
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

    // Update filter chips and count immediately after removing a chip
    const { global_search, institution_name, ...chipFilters } = updatedFilters;
    setSelectedChipFilters(generateFilterChips(chipFilters));
    setFiltersLength(countIndividualFilters(chipFilters));

    dispatch(setAllFilters(updatedFilters));
  }
  const handleDownload = async () => {
    downloadFileFromAPI({
      url: createDynamicURL(`${baseURL}/peer_analysis/`, filters, undefined, page),
      fileName: "engagement-details.xlsx",
      setLoading: setLoadingDownload,
      serviceMethod: shareHolderProposalService.getAllShareholderAPIFile
    });
  };

  const handleDocumentClick = (institutionName: string) => {
  console.log("Clicked:", institutionName);
};
  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          {/* Sticky Header OUTSIDE scrollable content */}
          <div className="flex justify-between items-center bg-white px-4 pl-6 bg-white shadow sticky top-16 z-40">
            {isAllCompanySelected === true ? (
              <h1 className="font-semibold text-lg">
                All Engagement Details
              </h1>
            ) : (
              <div className="font-semibold text-lg">Engagement Details</div>
            )}
            <div className="flex gap-3 px-4 py-4">
              <button
                className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${isAllCompanySelected === false
                  ? "bg-primary text-white shadow"
                  : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                  }`}
                onClick={async (e) => {
                  if (isAllCompanySelected) {
                    handleViewAllChange({ target: { checked: false } });
                  }
                }}
              >
                {companyGlobalSearchName || "Company"}
              </button>
              <button
                className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${isAllCompanySelected === true
                  ? "bg-primary text-white shadow"
                  : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                  }`}
                onClick={async (e) => {
                  if (!isAllCompanySelected) {
                    handleViewAllChange({ target: { checked: true } });
                  }
                }}
              >
                View For All Companies
              </button>
            </div>
          </div>
          {/* Scrollable Content BELOW sticky header */}
          <div className="mt-3.5 relative">
            <div className="flex flex-col box box--stacked bg-white p-5">
              <div className="grid grid-cols-6 xs:grid-cols-1 gap-4 md:grid-cols-3 p-4">
                <div className="mx-2">
                  <TomSelect
                    value={selectedInstitution}
                    onChange={(event: any) => handleSearch(event?.target?.value)}
                    options={{
                      placeholder: "Select Institution", closeAfterSelect: true,
                      render: {
                        option: (data: any, escape: any) => {
                          return `
                            <div class="p-2">
                              ${escape(data.value)}
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
                              >
                                {inst?.institution_name}
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
                  {/* <FormSwitch>
                    <label className="text-md mr-3 font-semibold">Analytics</label>
                    <FormSwitch.Input
                      id="view-analysis-switch"
                      type="checkbox"
                      checked={isViewAnalysis}
                      onChange={(e) => setIsViewAnalysis(e.target.checked)}
                    />
                    <FormSwitch.Label htmlFor="view-analysis-switch"></FormSwitch.Label>
                  </FormSwitch> */}
                  {user?.user_type === "Admin" && (
                    <Button
                      onClick={() => setAddEngagementDetailsModalVisible(true)}
                      variant="primary"
                      className="bg-theme-2 border-bg-theme-2"
                    >
                      <Lucide icon="Plus" className="stroke-[1.3] w-4 h-4 mr-2" />
                      Add Engagement Details
                    </Button>
                  )}
                  <button
                    onClick={() => {
                      const element = document.querySelector('#data-listing');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-2 rounded flex gap-2 items-center border border-primary text-primary"
                  >
                    Source Data
                    <ArrowDown size={16} />
                  </button>
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
                  <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
                    <div className="flex justify-between items-center gap-2 mb-6">
                      <h3 className="text-lg fontxg-semibold text-slate-700">Filters</h3>
                      <div className="flex gap-2 items-center">
                        <Button
                          variant="outline-secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            onFilterClear();
                            setIsFilterCollapse(false);
                          }}
                          className="w-36"
                          type="button"
                        >
                          <MdOutlineClear className="text-lg mr-1" /> Clear
                        </Button>
                        <Button
                          variant="primary"
                          className="w-36 flex items-center gap-2 text-base font-semibold shadow-md hover:bg-primary/90 transition-all"
                          type="submit"
                        >
                          <FaSearch className="text-lg" /> Apply
                        </Button>
                      </div>
                    </div>
                    <div className={clsx(["grid grid-cols-1 xs:grid-cols-1 gap-4 mb-3 ", isAllCompanySelected ? 'md:grid-cols-3' : 'md:grid-cols-3'])}>
                      <div className="mx-2">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaCalendarAlt className="text-gray-400" /> Year
                          </span>
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
                                      ?.filter(year => year !== null && year !== undefined && year !== "")?.length ===
                                    watch("year")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked === true) {
                                      const filteredYears = apiDropdownOptions?.year?.filter(year => year !== null && year !== undefined && year !== "").map(String) || [];
                                      setValue(
                                        "year",
                                        filteredYears
                                      );
                                      dispatch(setFilter({ key: "year", value: filteredYears }));
                                    } else {
                                      setValue("year", []);
                                      dispatch(setFilter({ key: "year", value: [] }));
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
                              data={apiDropdownOptions?.year?.filter(year => year !== null && year !== undefined && year !== "").map(String) || []}
                              placeholder="Select Year"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                                dispatch(setFilter({ key: "year", value: selectedValues }));
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
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaTags className="text-gray-400" /> Category
                          </span>


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
                                        ?.filter(category => category !== null && category !== undefined && category !== "")?.length ===
                                      watch("category")?.length
                                    }
                                    type="checkbox"
                                    onChange={(e) => {
                                      if (e.target.checked === true) {
                                        const filteredCategories = apiDropdownOptions?.category?.filter(category => category !== null && category !== undefined && category !== "") || [];
                                        setValue(
                                          "category",
                                          filteredCategories
                                        );
                                        dispatch(setFilter({ key: "category", value: filteredCategories }));
                                      } else {
                                        setValue("category", []);
                                        dispatch(setFilter({ key: "category", value: [] }));
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
                              data={apiDropdownOptions?.category?.filter(category => category !== null && category !== undefined && category !== "") || []}
                              placeholder="Select Category"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                                dispatch(setFilter({ key: "category", value: selectedValues }));



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
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaGlobe className="text-gray-400" /> Country
                          </span>
                        </div>
                        <Controller
                          name="country"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDropdownOptions?.country?.filter(country => country !== null && country !== undefined && country !== "") || []}
                              placeholder="Select Country"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                                dispatch(setFilter({ key: "country", value: selectedValues }));



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
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaLayerGroup className="text-gray-400" /> Index
                          </span>
                        </div>
                        <Controller
                          name="index"
                          control={control}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDropdownOptions?.index?.filter(index => index !== null && index !== undefined && index !== "") || []}
                              placeholder="Select Index"
                              loading={false}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                                dispatch(setFilter({ key: "index", value: selectedValues }));
                              }}
                              selectedOption={field.value || []}
                            />
                          )}
                        />
                      </div>
                      {
                        isAllCompanySelected === true &&
                        <div className="mx-2">
                          <div className="text-left text-slate-500 flex justify-between mb-1">
                            <span className="flex items-center gap-2 text-slate-600 font-semibold">
                              <FaBuilding className="text-gray-400" /> Sector
                            </span>
                          </div>
                          <Controller
                            name="sector"
                            control={control}
                            defaultValue={[]}
                            render={({ field }) => (
                              <MultiSelectDropdown
                                data={apiDropdownOptions?.sector?.filter(sector => sector !== null && sector !== undefined && sector !== "") || []}
                                placeholder="Select Sector"
                                loading={getDropdownLoader}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions.map((option) => option.value);
                                  field.onChange(selectedValues);
                                  dispatch(setFilter({ key: "sector", value: selectedValues }));
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

              {isViewAnalysis && (
                loading ? (
                  <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                    <LoadingIcon
                      color="#800000"
                      icon="three-dots"
                      className="w-16 h-16"
                    />
                  </div>
                ) : peerAnalysisData?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Lucide
                      icon="BarChart3"
                      className="w-12 h-12 text-gray-300 mb-2"
                    />
                    <div className="text-lg font-medium">No Analytics found</div>
                  </div>
                ) : (
                  <ChartComponent 
                    investorData={investorData} 
                    pieChartDataPeerAnalysis={pieChartDataPeerAnalysis} 
                    handleSearch={handleSearch} 
                    topEngagementTopics={topEngagementTopics}
                    onDocumentClick={handleDocumentClick}
                    isAllCompanySelected={isAllCompanySelected}
                  />
                )
              )}

              <div id="data-listing" className="flex justify-between items-center mb-4 px-5">
                <h3 className="text-lg font-semibold mb-4">Engagement Details</h3>
                <Tippy content="Download Excel" options={{ theme: "light" }}>
                  <div
                    className="box p-[5px] cursor-pointer"
                    onClick={() => !loadingDownload && handleDownload()}
                  >
                    {loadingDownload ? <Lucide
                      icon="Loader"
                      className="w-6 h-7  stroke-[1.3]  animate-spin
"
                    /> : <img alt="download-icon" src={downloadIcon} />}
                  </div>
                </Tippy>
              </div>
              <div className="px-5">
                <TableWrapper isLoading={loading}>
                  <div className="overflow-auto max-h-[400px] rounded-lg">
                    <Table>
                      <Table.Thead>
                        <Table.Tr className="bg-primary text-white">
                          <Table.Td className="py-3 px-4 text-center font-medium border-0 w-[70px]" style={{fontSize: '14px'}}>
                            Year
                          </Table.Td>
                          <Table.Td className="py-3 px-4 text-left font-medium border-0 w-[220px]" style={{fontSize: '14px'}}>
                            Institution
                          </Table.Td>
                          {isAllCompanySelected && (
                            <Table.Td className="py-3 px-4 text-left font-medium border-0" style={{fontSize: '14px'}}>
                              Company
                            </Table.Td>
                          )}
                          <Table.Td className="py-3 px-4 text-left font-medium border-0 w-[80px]" style={{fontSize: '14px'}}>
                            Country
                          </Table.Td>
                          <Table.Td className="py-3 px-4 text-left font-medium border-0 w-[90px]" style={{fontSize: '14px'}}>
                            Sector
                          </Table.Td>
                          <Table.Td className="py-3 px-4 text-left font-medium border-0 w-[180px]" style={{fontSize: '14px'}}>
                            Environmental
                          </Table.Td>
                          <Table.Td className="py-3 px-4 text-left font-medium border-0 w-[180px]" style={{fontSize: '14px'}}>
                            Social
                          </Table.Td>
                          <Table.Td className="py-3 px-4 text-left font-medium border-0 w-[180px]" style={{fontSize: '14px'}}>
                            Governance
                          </Table.Td>
                        </Table.Tr>
                      </Table.Thead>

                      <Table.Tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                        {peerAnalysisData?.length > 0 &&
                          peerAnalysisData?.map((peer: TypesPeerAnalysis, index) => (
                            <Table.Tr key={peer?.id} className={`[&_td]:last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} transition-all hover:bg-primary/5 cursor-pointer`}>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[70px] text-center">
                                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                  {peer?.year}
                                </span>
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[220px] text-wrap">
                                <p className="font-medium text-wrap">
                                  {peer?.institution_name}
                                </p>
                              </Table.Td>

                              {isAllCompanySelected && (
                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 text-wrap font-medium">
                                  {peer?.company_name}
                                </Table.Td>
                              )}
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[80px] text-wrap font-medium">
                                {peer?.company_country}
                              </Table.Td>

                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[90px] text-wrap font-medium">
                                {peer?.company_sector}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[180px] text-wrap font-medium">
                                {peer?.env_list}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[180px] text-wrap font-medium">
                                {peer?.soc_list}
                              </Table.Td>
                              <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[180px] text-wrap font-medium">
                                {peer?.gov_list}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                      {peerAnalysisData?.length === 0 && (
                        <Table.Tbody>
                          <Table.Tr>
                            <Table.Td colSpan={isAllCompanySelected ? 8 : 7} className="text-center py-12">
                              <div className="flex flex-col items-center justify-center">
                                <Lucide
                                  icon="FileSearch"
                                  className="w-12 h-12 text-gray-300 mb-2"
                                />
                                <div className="text-lg font-medium">No data found</div>
                                <div className="text-sm text-gray-500 mt-1">
                                  Try adjusting your filters or search criteria
                                </div>
                              </div>
                            </Table.Td>
                          </Table.Tr>
                        </Table.Tbody>
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

                <footer className="!pt-3 flex items-start flex-col">
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

          {addEngagementDetailsModalVisible && (
            <AddEngagementDetailsModal
              visible={addEngagementDetailsModalVisible}
              setVisible={setAddEngagementDetailsModalVisible}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default PeerAnalysis;
