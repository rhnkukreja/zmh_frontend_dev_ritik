import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";

import {
  convertToTitleCase,
  countValidFilters,
  createDynamicURL,
  generateFilterChips,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  baseURL,
  proponent_type,
  proposal_type,
  meeting_type,
} from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import { FormInput } from "@/components/Base/Form";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import CompanySelect from "@/components/ReactSelectAsync";
import {
  fetchVdsEuropeans,
  resetPage,
  setPage,
} from "@/stores/vdsEuropeanSlice";
import { vdsEuropeanService } from "@/services/vdsEuropean";
import { setTempSearch } from "@/stores/dashboardSlice";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "@/components/Base/LoadingIcon";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { peerAnalysisService } from "@/services/peerAnalysis";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import Pill from "@/components/Pill";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import { getVdsEuropeanDropdownValues } from "@/services/vdsEuropeanDropdown";
import React from "react";

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
  const [vdsEuropeansAnalytics, setVdsEuropeansAnalytics] = useState<any>({});
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [dropdownValues, setDropdownValues] = useState<any>({
    company_name: [],
    institution: [],
    index: [],
  });
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState<boolean>(true);
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
      company_name: [],
    });
  const [institutionOptions, setInstitutionOptions] = useState<string[]>([]);
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

  // Restore filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("vdsEuropeanFilters");
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setallApplyFilter(parsed);
        // Set form values as well
        Object.entries(parsed).forEach(([key, value]) => {
          setValue(key, value);
        });
      } catch (e) {}
    }
  }, []);

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

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const data = await getVdsEuropeanDropdownValues();
        setInstitutionOptions(data.institution || []);
      } catch (error) {
        setInstitutionOptions([]);
      }
    };
    fetchInstitutions();
  }, []);

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
      company_name: [],
    },
  });

  const getDependentDropdown = async () => {
    const paramFilter = {
      company_name: Array.isArray(dropdownValues?.company_name)
        ? dropdownValues?.company_name
        : dropdownValues?.company_name
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
      if (!paramFilter.company_name.length) return;
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
      setIsFilterCollapse(false); // Ensure filter panel collapses in analytics mode
      return;
    }
    if (!npxFilter?.company_name || npxFilter?.company_name.length === 0) {
      toast.warning("Please Select Company Name");
      return;
    }
    if (npxFilter?.year === " " || npxFilter?.year === "") {
      toast.warning("Please Select Year");
      return;
    }
    const filterObj = {
      company_name: npxFilter?.company_name, // Already a flat array
      institution_name: npxFilter?.institution_name,
      vote_type: npxFilter?.vote,
      category: npxFilter?.category,
      year: npxFilter?.year,
      keyword: npxFilter?.keyword,
    };
    setallApplyFilter(filterObj);
    // Save to localStorage
    localStorage.setItem("vdsEuropeanFilters", JSON.stringify(filterObj));
    dispatch(resetPage());
    setIsFilterCollapse(false);
  };

  const onAnalyticsSubmit = async (data: any) => {
    if (isViewAnalysis && !data?.institution_name?.length) {
      toast.warning("Please Select Institution Name");
      return;
    }
    const analyticsObj = {
      ...data,
      company_name: data?.company_name || [], // Always a flat array
      vote_type: data?.vote || [], // always set vote_types
    };
    setAllAnalyticsFilter(analyticsObj);
    // Save analytics filters to localStorage
    localStorage.setItem("vdsEuropeanAnalyticsFilters", JSON.stringify(analyticsObj));
  };

  const onFilterClear = (onAnalyticsTab) => {
    setSelectedChipFilters([]);
    setFiltersLength(0);
    reset();
    resetFormValues();
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
    if (onAnalyticsTab) {
      setAllAnalyticsFilter({
        institution_name: ["BlackRock, Inc."],
        index_name: ["S&P 500"],
      });
      setValue("institution_name", ["BlackRock, Inc."]);
      setValue("index_name", ["S&P 500"]);
      setVdsEuropeansAnalytics({});
      localStorage.removeItem("vdsEuropeanAnalyticsFilters");
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
      localStorage.removeItem("vdsEuropeanFilters");
    }
  };

  const resetFormValues: any = () => {
    setValue("company_name", []);
    setValue("institution_name", []);
    setValue("vote", []);
    setValue("category", []);
    setValue("year", "");
    setValue("keyword", "");
    setValue("analyticsYear", []);
    setValue("index_name", []);
    setValue("proponent_type", []);
    setValue("proposal_type", []);
    setValue("custom_keywords", []);
    setValue("meeting_type", []);
    setDropdownValues({
      company_name: [],
      institution: [],
      index: [],
    });
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

      // Special handling for vote_type <-> vote field
      if (removeKey === "vote_type") {
        updatedFilters[removeKey] = (updatedFilters[removeKey] || []).filter(
          (item: any) => item !== removeValue
        );
        // Also update the form field "vote"
        setValue("vote", updatedFilters[removeKey]);
      } else if (Array.isArray(updatedFilters[removeKey])) {
        updatedFilters[removeKey] = updatedFilters[removeKey].filter(
          (item) => item !== removeValue
        );
        setValue(removeKey, updatedFilters[removeKey]);
      } else if (updatedFilters[removeKey] === removeValue) {
        if (removeKey === "year") {
          updatedFilters[removeKey] = " ";
        } else {
          updatedFilters[removeKey] = "";
        }
        setValue(removeKey, updatedFilters[removeKey]);
      }
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
    let isMounted = true;
    const fetchAnalytics = async () => {
      if (isViewAnalysis && allAnalyticsFilter?.institution_name && allAnalyticsFilter.institution_name.length > 0) {
        setIsAnalyticsLoading(true);
        try {
          const response = await vdsEuropeanService.getVDSEuropeanAnalytics(
            `${baseURL}/api/proposal-voting-stats`,
            {
              investor_company: allAnalyticsFilter?.institution_name?.length
                ? allAnalyticsFilter.institution_name
                : allAnalyticsFilter.company_name || [],
              year:
                allAnalyticsFilter?.analyticsYear?.length > 0
                  ? allAnalyticsFilter?.analyticsYear
                  : [],
              proponent_type: allAnalyticsFilter?.proponent_type
                ? allAnalyticsFilter?.proponent_type
                : [],
              proposal_type: allAnalyticsFilter?.proposal_type
                ? allAnalyticsFilter?.proposal_type.map((item: any) =>
                  item.toLowerCase()
                )
                : [],
              index_name:
                allAnalyticsFilter?.index_name?.length > 0
                  ? allAnalyticsFilter.index_name
                  : [],
              custom_keywords:
                allAnalyticsFilter?.custom_keywords?.length > 0
                  ? allAnalyticsFilter.custom_keywords
                  : [],
              meeting_type: allAnalyticsFilter?.meeting_type?.length > 0
                ? allAnalyticsFilter.meeting_type
                : [],
              vote_type: allAnalyticsFilter?.vote_type || [],
              country: ["USA"],
              page: analyticsPage || 1,
            }
          );
          if (isMounted) {
            setVdsEuropeansAnalytics(response.response);
            setIsAnalyticsLoading(false); // Move here for instant UI update
          }
        } catch (error) {
          if (isMounted) {
            setIsAnalyticsLoading(false);
          }
        }
      }
    };
    fetchAnalytics();
    let filterForChips = allAnalyticsFilter;
    if (isViewAnalysis && filterForChips.vote) {
      const { vote, ...rest } = filterForChips;
      filterForChips = rest;
    }
    setFiltersLength(countValidFilters(filterForChips));
    setSelectedChipFilters(generateFilterChips(filterForChips));
    return () => { isMounted = false; };
  }, [allAnalyticsFilter, analyticsPage]);

  // On initial mount, set default analytics filter to BlackRock and S&P 500, or restore from localStorage
  useEffect(() => {
    if (isViewAnalysis && Object.keys(allAnalyticsFilter).length === 0) {
      const savedAnalytics = localStorage.getItem("vdsEuropeanAnalyticsFilters");
      if (savedAnalytics) {
        try {
          const parsed = JSON.parse(savedAnalytics);
          setAllAnalyticsFilter(parsed);
          Object.entries(parsed).forEach(([key, value]) => {
            setValue(key, value);
          });
          return;
        } catch (e) {}
      }
      setAllAnalyticsFilter({
        institution_name: ["BlackRock, Inc."],
        index_name: ["S&P 500"],
        analyticsYear: ["2025"],
      });
      setValue("institution_name", ["BlackRock, Inc."]);
      setValue("index_name", ["S&P 500"]);
      setValue("analyticsYear", ["2025"]);
    }
    // eslint-disable-next-line
  }, [isViewAnalysis]);

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


  // Debug: Log analytics state before render
  console.log('vdsEuropeansAnalytics:', vdsEuropeansAnalytics);
  console.log('isAnalyticsLoading:', isAnalyticsLoading);

  return (
    <>
      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold flex items-center gap-2">
                Voting Data
                <Pill text="Beta" />
              </h1>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            {!isViewAnalysis && count > 0 && (
              <h2 className="flex items-end font-semibold justify-end text-[13px] md:ml-auto mx-5">
                Count: {count.toLocaleString()}
              </h2>
            )}

            <div className="flex items-center gap-2">
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
        </div>

        {/* Filter Pills immediately after filter card, before data */}
        {selectedChipFilters?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedChipFilters.map((chip, idx) => (
              <span key={idx} className="flex items-center bg-primary/10 text-primary font-medium px-3 py-1 rounded-full shadow-sm transition-all hover:bg-primary/20">
                {chip.label}
                <button
                  type="button"
                  className="ml-2 text-primary hover:text-red-600 transition-colors"
                  onClick={() => handleRemoveChip(chip.key, chip.value)}
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Filter Card directly below heading, above pills and data */}
        {isFilterCollapse && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
            {/* Filter Toggle and Advanced Filters Button */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* All filters in multiple rows */}
              <div className="grid gap-6 md:grid-cols-4 grid-cols-1">
                {/* Institution */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaUniversity className="text-gray-400" /> Institution*
                  </label>
                  <Controller
                    name="institution_name"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={institutionOptions.map(option => ({
                          value: option,
                          label: option,
                          isDisabled: field.value?.length >= 3 && !field.value.includes(option)
                        }))}
                        placeholder="Select Institutions"
                        loading={getFundNameDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                          handleDropdownChange("institution_name", selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Year */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaCalendarAlt className="text-gray-400" /> Year
                  </label>
                  <Controller
                    name="analyticsYear"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={["2024", "2025"]}
                        placeholder="Select Year"
                        loading={getDynamicDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Index */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaLayerGroup className="text-gray-400" /> Index
                  </label>
                  <Controller
                    name="index_name"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={apiDependentDropdownOptions?.index?.map((item: any) => item)}
                        placeholder="Select Index"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Proposal Type */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaListUl className="text-gray-400" /> Proposal Type
                  </label>
                  <Controller
                    name="proposal_type"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={proposal_type.map((item: any) => convertToTitleCase(item))}
                        placeholder="Select Proposal Type"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => convertToTitleCase(option.value));
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
              </div>
              {/* Second row with 3 columns */}
              <div className="grid gap-6 md:grid-cols-3 grid-cols-1 mt-6">
                {/* Vote */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaHandshake className="text-gray-400" /> Vote
                  </label>
                  <Controller
                    name="vote"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={["For", "Against", "Abstain"]}
                        placeholder="Select Vote"
                        loading={getDynamicDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Proponent Type */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaUserTie className="text-gray-400" /> Proponent Type
                  </label>
                  <Controller
                    name="proponent_type"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={proponent_type.map((item: any) => convertToTitleCase(item))}
                        placeholder="Select Proponent Type"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => convertToTitleCase(option.value));
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
                {/* Meeting Type */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaTags className="text-gray-400" /> Meeting Type
                  </label>
                  <Controller
                    name="meeting_type"
                    control={control}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={meeting_type.map((item: any) => convertToTitleCase(item))}
                        placeholder="Select Meeting Type"
                        loading={false}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => convertToTitleCase(option.value));
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                      />
                    )}
                  />
                </div>
              </div>
              {/* Company Name and Keywords in separate row with 2 columns */}
              <div className="grid gap-6 md:grid-cols-2 grid-cols-1 mt-6">
                {/* Company Name */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaBuilding className="text-gray-400" /> Company Name
                  </label>
                  <Controller
                    name="company_name"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <MultiSelectDropdown
                        data={institutionOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        placeholder="Select Companies"
                        loading={getFundNameDropdownLoader}
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions.map((option) => option.value);
                          field.onChange(selectedValues);
                        }}
                        selectedOption={field.value || []}
                        isSearchable={true}
                      />
                    )}
                  />
                </div>
                {/* Keywords */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaTags className="text-gray-400" /> Keywords
                  </label>
                  <Controller
                    name="custom_keywords"
                    control={control}
                    render={({ field }) => (
                      <CreatableInputSelect
                        value={field.value || []}
                        onChange={(val) => field.onChange(val)}
                      />
                    )}
                  />
                </div>
              </div>
              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="primary"
                  className="w-36 flex items-center gap-2 text-base font-semibold shadow-md hover:bg-primary/90 transition-all"
                  type="submit"
                >
                  <FaSearch className="text-lg" /> Apply
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ANALYTICS TABLE (by_institution) and COLLAPSIBLE COMPANY LIST (by_company) with loader */}
        {isViewAnalysis && isAnalyticsLoading && (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="rounded-2xl shadow-lg bg-white p-8 border border-gray-100 flex flex-col items-center">
              <LoadingIcon icon="three-dots" className="w-12 h-12 text-primary" />
            </div>
          </div>
        )}
        {isViewAnalysis && !isAnalyticsLoading && vdsEuropeansAnalytics && typeof vdsEuropeansAnalytics === 'object' && vdsEuropeansAnalytics.by_institution && Object.keys(vdsEuropeansAnalytics.by_institution).length > 0 && (
          <AnalyticsTableMemo vdsEuropeansAnalytics={vdsEuropeansAnalytics} openGroups={openGroups} toggleGroup={toggleGroup} />
        )}
        {isViewAnalysis && !isAnalyticsLoading && vdsEuropeansAnalytics && typeof vdsEuropeansAnalytics === 'object' && vdsEuropeansAnalytics.by_company && Array.isArray(vdsEuropeansAnalytics.by_company) && vdsEuropeansAnalytics.by_company.length > 0 && (
          <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100 mt-8">
            <div className="divide-y divide-gray-100">
              {vdsEuropeansAnalytics.by_company.map((yearEntry, yearIdx) => (
                Array.isArray(yearEntry.companies)
                  ? yearEntry.companies.map((ele, index) => (
                    <div key={ele.company_id || `${yearIdx}-${index}`} className="py-2">
                      <div
                        className="flex flex-row justify-between items-center cursor-pointer px-4 py-3 rounded-lg bg-gray-50 hover:bg-primary/5 transition font-semibold text-base"
                        onClick={() => toggleGroup(ele.company_name)}
                      >
                        <span>{`${ele.meeting_date}  - ${ele.company_name}  (${ele.meeting_type})`}</span>
                        <span className="ml-2 text-primary font-bold">{openGroups[ele.company_name] ? '▲' : '▼'}</span>
                      </div>
                      {openGroups[ele.company_name] && Array.isArray(ele.sample_proposals) && (
                        <div className="mt-2 mb-4 bg-gray-50 rounded-lg overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-primary text-white text-sm">
                                <th className="px-4 py-2 text-left font-semibold">Proposal No.</th>
                                <th className="px-4 py-2 text-left font-semibold">Proposal</th>
                                <th className="px-4 py-2 text-left font-semibold">Mgmt Rec</th>
                                <th className="px-4 py-2 text-left font-semibold">Vote Cast</th>
                                <th className="px-4 py-2 text-left font-semibold">Institution Name</th>
                              </tr>
                            </thead>
                            <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
                              {ele.sample_proposals.map((vds, vdsIdx) => (
                                <tr key={vds.proposal_id || vdsIdx} className="hover:bg-primary/10">
                                  <td className="px-4 py-2">{vds?.proposal_num}</td>
                                  <td className="px-4 py-2">
                                    {vds?.proposal}
                                  </td>
                                  <td className="px-4 py-2">{convertToTitleCase(vds?.mgt_rec)}</td>
                                  <td className="px-4 py-2 flex items-center">
                                    <span className={clsx([
                                      (vds?.vote?.includes("Against") || vds.vote?.includes("Withhold")) &&
                                      "text-red-700 font-semibold",
                                    ])}>
                                      {vds?.vote}
                                    </span>
                                    {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
                                      <span
                                        data-tooltip-id="my-tooltip-data-html"
                                        data-tooltip-html={vds?.notes}
                                        className="ml-2 inline-flex items-center justify-center rounded-full bg-transparent cursor-pointer"
                                      >
                                        <Lucide icon="Info" className="w-4 h-4" />
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">{vds?.institution_name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                  : null
              ))}
            </div>
            {vdsEuropeansAnalytics?.by_company?.length > 0 && (
              <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                <CPagination
                  page={vdsEuropeansAnalytics?.pagination?.current_page || 1}
                  totalPages={vdsEuropeansAnalytics?.pagination?.total_pages || 1}
                  handleNextPage={handleNextPage}
                  handlePageChange={handlePageChange}
                  handlePreviousPage={handlePreviousPage}
                />
              </div>
            )}
          </div>
        )}
        {isViewAnalysis && !isAnalyticsLoading && vdsEuropeansAnalytics && typeof vdsEuropeansAnalytics === 'object' && (!vdsEuropeansAnalytics.by_institution || Object.keys(vdsEuropeansAnalytics.by_institution).length === 0) && (
          <div className="text-center text-gray-500 py-8">No analytics data available for the selected filters.</div>
        )}
        {/* TABLE SECTION (with skeleton loader, sticky headers, zebra striping, pill badges, tooltips, and empty state) */}
        {!isViewAnalysis && (
          <TableWrapper isLoading={allApplyFilter && loading}>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
              <Table>
                <Table.Thead>
                  <Table.Tr className="sticky top-0 z-20 bg-primary/90 text-white shadow-md">
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "17.5%" }}>Institution</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "17.5%" }}>Meeting Type</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "5%" }}>No.</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "25%" }}>Proposal</Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]" style={{ width: "30%" }}>Vote Cast</Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <Table.Tr key={i} className="animate-pulse">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <Table.Td key={j}><Skeleton height={24} /></Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : VdsEuropeans?.length > 0 ? (
                    (() => {
                      let lastInstitutionName = "";
                      let toggle = false;
                      return VdsEuropeans.map((vds: any, index: number) => {
                        const currentInstitution = vds?.excel_institution_name;
                        if (currentInstitution !== lastInstitutionName) {
                          toggle = !toggle;
                          lastInstitutionName = currentInstitution;
                        }
                        return (
                          <Table.Tr
                            key={vds?.id}
                            className={clsx(
                              "[&_td]:last:border-b-0 transition-all hover:bg-primary/5 cursor-pointer",
                              toggle ? "bg-white" : "bg-gray-50"
                            )}
                          >
                            <Table.Td className="whitespace-nowrap overflow-hidden text-ellipsis font-semibold text-primary/80">
                              {vds?.excel_institution_name}
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                {convertToTitleCase(vds?.meeting_type)}
                              </span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="inline-block px-2 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-bold">
                                {vds?.proposal_num}
                              </span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="block truncate" title={vds?.proposal}>{vds?.proposal}</span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                {convertToTitleCase(vds?.mgt_rec)}
                              </span>
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              <div className="flex items-center gap-2">
                                {vds?.vote === "Split Vote" ? (
                                  <Tippy content={vds?.split_vote_counts} options={{ theme: "light" }}>
                                    <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">{vds?.vote}</span>
                                  </Tippy>
                                ) : (
                                  <span className={clsx(
                                    "inline-block px-2 py-1 rounded-full text-xs font-bold",
                                    (vds?.vote?.includes("Against") || vds.vote?.includes("Withhold")) ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
                                  )}>
                                    {vds?.vote}
                                  </span>
                                )}
                                {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
                                  <span data-tooltip-id="my-tooltip-data-html" data-tooltip-html={vds?.notes}>
                                    <Lucide icon="Info" className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800 cursor-pointer" />
                                  </span>
                                )}
                              </div>
                            </Table.Td>
                          </Table.Tr>
                        );
                      });
                    })()
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={6} className="text-center py-10 text-gray-400 text-lg font-semibold">
                        <FaCheckCircle className="mx-auto mb-2 text-4xl text-primary/60" />
                        No Voting Data available. Try adjusting your filters!
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        )}

        {VdsEuropeans?.length > 0 && (
          <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
            <CPagination
              page={page}
              totalPages={totalPages}
              handleNextPage={handleNextPage}
              handlePageChange={handlePageChange}
              handlePreviousPage={handlePreviousPage}
            />
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

const AnalyticsTable = ({ vdsEuropeansAnalytics, openGroups, toggleGroup }) => {
  // Get all institutions and years
  const institutions = vdsEuropeansAnalytics.by_institution || [];

  // Get all unique years across all institutions
  const allYears = new Set();
  institutions.forEach(inst => {
    Object.keys(inst.years).forEach(year => allYears.add(year));
  });
  const years = Array.from(allYears).sort();

  return (
    <div className="mb-8">
      <div className="rounded-2xl shadow-lg bg-white p-0 md:p-4 border border-gray-100">
        <table className="w-[100%] mx-auto rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-primary text-white text-base">
              <th className="px-6 py-3 text-left font-semibold rounded-tl-2xl" rowSpan={2}>Summary</th>
              {institutions.map((institution) => (
                <th key={institution.institution_id} colSpan={years.length} className="px-6 py-3 text-center font-semibold">
                  {institution.institution_name}
                </th>
              ))}
            </tr>
            <tr className="bg-primary text-white text-base">
              {institutions.map((institution) => (
                years.map((year) => (
                  <th key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center font-semibold">
                    {String(year)}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-700 text-base divide-y divide-gray-100">
            {/* <tr>
              <td className="px-6 py-3 font-medium">No. of unique companies</td>
              {institutions.map((institution) => (
                years.map((year) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData && yearData.total_companies ? yearData.total_companies.toLocaleString() : '-'}
                    </td>
                  );
                })
              ))}
            </tr> */}
            <tr>
              <td className="px-6 py-3 font-medium">No of proposals</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? yearData.total_proposals.toLocaleString() : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">No. of FOR votes</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? `${yearData.for_votes.toLocaleString()} (${yearData.for_percentage}%)` : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">No. of AGAINST/WITHHOLD votes</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? `${yearData.against_votes.toLocaleString()} (${yearData.against_percentage}%)` : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">Alignment with management</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? yearData.aligned_with_mgmt : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
            <tr>
              <td className="px-6 py-3 font-medium">Alignment percentage</td>
              {institutions.map((institution) => (
                years.map((year: any) => {
                  const yearData = institution.years[year];
                  return (
                    <td key={`${institution.institution_id}-${year}`} className="px-6 py-3 text-center">
                      {yearData ? `${yearData.alignment_percentage}%` : '-'}
                    </td>
                  );
                })
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AnalyticsTableMemo = React.memo(AnalyticsTable);

export default index;
