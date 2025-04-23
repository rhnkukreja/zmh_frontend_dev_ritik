import Lucide from "@/components/Base/Lucide";
import { Popover, Tab } from "@/components/Base/Headless";
import {
  FormCheck,
  FormInput,
  FormSwitch,
} from "@/components/Base/Form";
import Button from "@/components/Base/Button";

import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { useNavigate } from "react-router-dom";
import { countValidFilters, createDynamicURL, generateFilterChips } from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import { FilterX, Grid3X3, MegaphoneOff, SaveAll } from "lucide-react";
import MultiSearchBar from "@/components/MultiSearch";
import Table from "@/components/Base/Table";
import { Controller, useForm } from "react-hook-form";
import {
  fetchShareHolderProposal,
  setAllFilters,
  setFilter,
  resetFilter,
  setPage,
  setTabs,
  resetPage,
  selectUnSelectAllCompany,
} from "@/stores/shareholderProposalSlice";

import TomSelect from "@/components/Base/TomSelect";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import {
  AddNoActionType,
  AddShareholderType,
  AddWithdrawnType,
  ShareHolderDropdown,
} from "@/types/shareHolder";
import clsx from "clsx";
import { commonService } from "@/services/common";
import { setSavedSearch } from "@/stores/authenticationSlice";
import { ShareHolderFilter } from "@/types/ShareholdeFilter";
import AddNewShareholder from "./components/AddNewShareholder";
import AddNewWithdrawn from "./components/AddNewWithdrawn";
import AddNewNoAction from "./components/AddNewNoAction";
import CompanySelect from "@/components/ReactSelectAsync";
import DetailDialog from "./components/DetailDialog";
import { modifyRoute } from "@/stores/themeSlice";
import FilterChips from "@/components/FilterChips";
import ShareHolderProposalAnalyticsComponent from "@/components/ShareHolderProposalsAnalytics";
import ProponentsAnalyticsComponent from "@/components/ProponentsAnalytics";

function ShareHolderProposal() {
  const dispatch: AppDispatch = useAppDispatch();
  const { user, companyGlobalSearchName } = useAppSelector(
    (state) => state.authentiction
  );

  const {
    loading,
    shareHolderProposal,
    page,
    totalPages,
    tab,
    filters,
    isAllCompanySelected,
    topCategories,
    topSubcategories,
    yearlySummary,
    proposalCounts,
    topProponents,
    pieChartOutcome
  } = useAppSelector((state) => state.sharedHolderNoAction);

  const [searchTerms, setSearchTerms] = useState<string[]>([
    ...filters?.proponent_name,
  ]);
  const [isViewAnalysis, setIsViewAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<"shareholders" | "proponents">("shareholders");
  const [tempTab, setTempTab] = useState<"" | "proposal" | "no-action" | "withdrawn">("proposal");

  const month = [
    {
      id: 1,
      month: "January",
    },
    {
      id: 2,
      month: "February",
    },
    {
      id: 3,
      month: "March",
    },
    {
      id: 4,
      month: "April",
    },
    {
      id: 5,
      month: "May",
    },
    {
      id: 6,
      month: "June",
    },
    {
      id: 7,
      month: "July",
    },
    {
      id: 8,
      month: "August",
    },
    {
      id: 9,
      month: "September",
    },
    {
      id: 10,
      month: "October",
    },
    {
      id: 11,
      month: "November",
    },
    {
      id: 12,
      month: "December",
    },
  ];
  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
  const [filtersLength, setFiltersLength] = useState<number>(0);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
  const [apiDropdownOptions, setApiDropdownOptions] =
    useState<ShareHolderDropdown>({
      status: [],
      proponent: [],
      category: [],
      sub_category: [],
      year: [],
      index: [],
    });

  const [monthDropdownOption, setMonthDropdownOption] = useState<any>(month);

  const [addNewShareholderModalVisible, setAddNewShareholderModalVisible] =
    useState<boolean>(false);
  const [addNewWithdrawnModalVisible, setAddNewWithdrawnModalVisible] =
    useState<boolean>(false);
  const [addNewNoActionModalVisible, setAddNewNoActionModalVisible] =
    useState<boolean>(false);
  const [shareholderDetailModalVisible, setShareholderDetailModalVisible] =
    useState<boolean>(false);

  const [actionType, setActionType] = useState<"edit" | "duplicate">("edit");

  const [proposalCount, setProposalCount] = useState<number>(0);
  const [withdrawnCount, setWithdrawnCount] = useState<number>(0);
  const [noActionCount, setNoActionCount] = useState<number>(0);

  const [selectedShareholderDetail, setselectedShareholderDetail] = useState<
    any | null
  >(null);

  const [selectedShareholderProposal, setSelectedShareholderProposal] =
    useState<AddShareholderType | null>(null);
  const [selectedShareholderWithdrawn, setSelectedShareholderWithdrawn] =
    useState<AddWithdrawnType | null>(null);
  const [selectedShareholderNoAction, setSelectedShareholderNoAction] =
    useState<AddNoActionType | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    defaultValues: {
      category: filters.category,
      sub_category: filters.sub_category,
      status: filters.status,
      keyword: filters.keyword,
      year: filters.year,
      proponent_name: filters?.proponent_name,
      ready_for_review: filters?.ready_for_review,
      check_status: filters?.check_status,
      no_shareholder_proposal: filters?.no_shareholder_proposal,
      approved: filters?.approved,
      is_correct: filters?.is_correct,
      company_status: filters?.company_status,
      nl_exist: filters?.nl_exist,
      index: filters?.index ?? " ",
      global_search:
        filters?.global_search?.map((item: string) => ({
          value: item,
          label: item,
        })) || [],
    },
  });

  const resetFormValues: any = () => {
    setValue("category", []);
    setValue("keyword", "");
    setValue("sub_category", []);
    setValue("status", []);
    setValue("year", []);
    setValue("global_search", []);
    setValue("ready_for_review", null);
    setValue("check_status", null);
    setValue("no_shareholder_proposal", null);
    setValue("approved", null);
    setValue("is_correct", null);
    setValue("company_status", null);
    setValue("nl_exist", null);
    setValue("index", " ");
  };

  const navigate = useNavigate();

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const onEditProposalClickHandler = (
    proposal: AddShareholderType,
    actionType: "edit" | "duplicate"
  ) => {
    setSelectedShareholderProposal(proposal);
    setAddNewShareholderModalVisible(true);
    setActionType(actionType);
  };

  const onEditWithdrawnClickHandler = (withdrawn: AddWithdrawnType) => {
    setSelectedShareholderWithdrawn(withdrawn);
    setAddNewWithdrawnModalVisible(true);
  };

  const onEditNoActionClickHandler = (noAction: AddNoActionType) => {
    setSelectedShareholderNoAction(noAction);
    setAddNewNoActionModalVisible(true);
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
        route: "share-holder-proposal",
        type: isAllCompanySelected === true ? true : false,
      })
    );
  }, [companyGlobalSearchName, isAllCompanySelected]);

  const tabUrls: { [key: string]: string } = {
    proposal: `${baseURL}/shareholder_proposal/def14a/`,
    "no-action": `${baseURL}/shareholder_proposal/no_action/`,
    withdrawn: `${baseURL}/shareholder_proposal/withdrawn/`,
  };

  useEffect(() => {
    if (isAllCompanySelected === false && filters?.global_search.length === 0) {
      return;
    }

    const dynamicURL = createDynamicURL(tabUrls[tab], filters, undefined, page);
    dispatch(fetchShareHolderProposal(dynamicURL));

    if (tab === "no-action") {
      var { institution_name, global_search, ...restFilters } = filters;
    } else {
      var {
        is_correct,
        company_status,
        approved,
        institution_name,
        global_search,
        ...restFilters
      } = filters;
    }
    setFiltersLength(
      countValidFilters(
        isAllCompanySelected === false
          ? restFilters
          : { ...restFilters, global_search: filters.global_search }
      )
    );
    const { proponent_name, ...chipFilters } = restFilters;
    setSelectedChipFilters(generateFilterChips(chipFilters));

  }, [page, tab, filters]);

  useEffect(() => {
    if (isAllCompanySelected === false && filters?.global_search.length === 0) {
      return;
    }
    getAllShareholderAPI();

  }, [filters]);

  const getAllShareholderAPI = async () => {
    try {
      const proposalResponse =
        await shareHolderProposalService.getAllShareholderAPI(
          createDynamicURL(
            `${baseURL}/shareholder_proposal/def14a/`,
            filters,
            undefined,
            page
          )
        );
      if (proposalResponse?.result) {
        setProposalCount(proposalResponse?.result?.count);
      }

      const noActionResponse =
        await shareHolderProposalService.getAllShareholderAPI(
          createDynamicURL(
            `${baseURL}/shareholder_proposal/no_action/`,
            filters,
            undefined,
            page
          )
        );
      if (noActionResponse?.result) {
        setNoActionCount(noActionResponse?.result?.count);
      }

      const withdrawnResponse =
        await shareHolderProposalService.getAllShareholderAPI(
          createDynamicURL(
            `${baseURL}/shareholder_proposal/withdrawn/`,
            filters,
            undefined,
            page
          )
        );
      if (withdrawnResponse?.result) {
        setWithdrawnCount(withdrawnResponse?.result?.count ?? 0);
      }

      if (proposalResponse?.result?.count > 0) {
        dispatch(setTabs("proposal"));
      }
      else if (noActionResponse?.result?.count > 0) {
        dispatch(setTabs("no-action"));

      }
      else if (withdrawnResponse?.result?.count > 0) {
        dispatch(setTabs("withdrawn"));
      }
    } catch (error) {
      return error;
    }
  };
  const getAllShareholderDropdowns = async () => {
    try {
      setGetDropdownLoader(true);
      const res =
        await shareHolderProposalService.getShareHolderDropdownValues();
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
    if (tab == "proposal" && proposalCount == 0) {
      setIsViewAnalysis(false);
    }
    if (tab == "no-action" && noActionCount == 0) {
      setIsViewAnalysis(false);
    }

    if (tempTab !== tab) {
      dispatch(setTabs(tempTab));
    }

  }, [tab]);



  // useEffect(() => {
  //   if(proposalCount > 0){
  //     dispatch(setTabs("proposal"));
  //   }
  //   else if(noActionCount > 0){
  //     dispatch(setTabs("no-action"));

  //   }
  //   else if(withdrawnCount > 0){
  //     dispatch(setTabs("withdrawn"));

  //   }
  // }, []);

  useEffect(() => {
    getAllShareholderDropdowns();
    getSubCategoryDropdown();
  }, []);

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
    if (!isAllCompanySelected) {
      dispatch(
        setFilter({ key: "global_search", value: [companyGlobalSearchName] })
      );
    }
  };
  const handleClearAllFilter = () => {
    setSearchTerms([]);
    reset();
    resetFormValues();
    dispatch(resetFilter());
    dispatch(resetPage());
    if (!isAllCompanySelected) {
      dispatch(
        setFilter({ key: "global_search", value: [companyGlobalSearchName] })
      );
    }
  };

  const handleSearch = (searchTerms: string[]) => {
    dispatch(setFilter({ key: "proponent_name", value: searchTerms }));
  };

  useEffect(() => {
    if (addNewShareholderModalVisible === false) {
      setSelectedShareholderProposal(null);
    }
    if (addNewNoActionModalVisible === false) {
      setSelectedShareholderNoAction(null);
    }
    if (addNewWithdrawnModalVisible === false) {
      setSelectedShareholderWithdrawn(null);
    }
  }, [
    addNewNoActionModalVisible,
    addNewNoActionModalVisible,
    addNewWithdrawnModalVisible,
  ]);

  const onSubmit = async (shareHolderFilters: ShareHolderFilter) => {
    dispatch(
      setAllFilters({
        ...shareHolderFilters,
        proponent_name: searchTerms,
        global_search: isAllCompanySelected
          ? Array.isArray(shareHolderFilters?.global_search)
            ? shareHolderFilters?.global_search.map((item: any) => item.label)
            : []
          : [companyGlobalSearchName],
      })
    );
    setIsFilterCollapse(!isFilterCollapse);

    dispatch(resetPage());
  };

  const getSelectedTabIndex = () => {
    const tabIndex =
      tab === "proposal"
        ? 0
        : tab === "no-action"
          ? 1
          : tab === "withdrawn"
            ? 2
            : -1;
    return tabIndex;
  };

  const [apiSubCategoryDropdown, setapiSubCategoryDropdown] = useState<any>({
    sub_category: [],
  });

  const getSubCategoryDropdown = async (value?: any) => {
    if (value !== "") {
      const paramFilter = {
        // global_search: companyGlobalSearchName,
        category: value,
      };
      try {
        // setGetFundNameDropdownLoader(true);
        const res =
          await shareHolderProposalService.getShareHolderDropdownValues(
            paramFilter
          );
        if (res.result) {
          setapiSubCategoryDropdown({ sub_category: res.result?.sub_category });
        }
      } catch (error) {
        return error;
      } finally {
        // setGetFundNameDropdownLoader(false);
      }
    }
  };

  const getSavedSearches = () => {
    if (user?.saved_search["Shareholder Proposal"]) {
      const savedSearch = user.saved_search["Shareholder Proposal"];
      setSearchTerms([...savedSearch.proponent_name]);
      setValue("keyword", savedSearch.keyword || "");
      setValue("proponent_name", savedSearch.proponent_name || []);
      setValue("category", savedSearch.category || []);
      setValue("sub_category", savedSearch.sub_category || []);
      setValue("year", savedSearch.year || []);
      setValue("status", savedSearch.status || []);
      setValue("index", savedSearch?.index || "");
      dispatch(
        setAllFilters({
          proponent_name: savedSearch.proponent_name || [],
          keyword: savedSearch.keyword || "",
          category: savedSearch.category || [],
          sub_category: savedSearch.sub_category || [],
          year: savedSearch.year || [],
          status: savedSearch.status || [],
          index: savedSearch.index || "",
          global_search: savedSearch?.global_search,
        })
      );
      setIsFilterCollapse(true);
    }
  };

  const saveSearch = async () => {
    const res = await commonService.saveSearches({
      module: "Shareholder Proposal",
      proponent_name: searchTerms,
      category: filters?.category || [],
      sub_category: filters?.sub_category || [],
      year: filters?.year || [],
      status: filters?.status || [],
      keyword: filters?.keyword || "",
      global_search: filters?.global_search,
      no_shareholder_proposal: filters?.no_shareholder_proposal,
      approved: filters?.approved,
      is_correct: filters?.is_correct,
      company_status: filters?.company_status,
      nl_exist: filters?.nl_exist,
      index: filters?.index,
    });
    if (res?.user_id) {
      dispatch(
        setSavedSearch({
          key: "Shareholder Proposal",
          value: {
            proponent_name: searchTerms,
            category: filters?.category || [],
            sub_category: filters?.sub_category || [],
            year: filters?.year || [],
            status: filters?.status || [],
            keyword: filters?.keyword || "",
            index: filters?.index || "",
            global_search: filters?.global_search,
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  const onVisibleDetail = (detail: any) => {
    setselectedShareholderDetail(detail);
    setShareholderDetailModalVisible(true);
  };

  const multSearchUrls = useMemo(() => {
    const baseUrls = [
      "/shareholder_proposal/withdrawn/",
      "/shareholder_proposal/no_action/",
      "/shareholder_proposal/def14a/",
    ];

    if (isAllCompanySelected) {
      return baseUrls.map((baseUrl) => baseUrl);
    } else {
      const queryParam = `?global_search=${companyGlobalSearchName || filters?.global_search?.[0]
        }`;
      return baseUrls.map((baseUrl) => `${baseUrl}${queryParam}`);
    }
  }, [isAllCompanySelected, companyGlobalSearchName, filters]);

  const clearNoActionFilter = () => {
    // setValue("is_correct", null);
    // setValue("company_status", null);
    // setValue("approved", null);

    const { is_correct, company_status, approved, ...restFilters } = filters;
    setFiltersLength(
      countValidFilters(
        isAllCompanySelected === false
          ? restFilters
          : { ...restFilters, global_search: filters.global_search }
      )
    );
  };

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...filters };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      if (removeKey === "index") {
        updatedFilters[removeKey] = " ";
      } else {
        updatedFilters[removeKey] = "";
      }
    }

    setValue(removeKey, updatedFilters[removeKey]);
    dispatch(setAllFilters(updatedFilters));
  }


  const getDefaultTabIndex = () => {
    if (proposalCount > 0 && proposalCount >= noActionCount && proposalCount >= withdrawnCount) return 0;
    if (noActionCount > 0 && noActionCount >= proposalCount && noActionCount >= withdrawnCount) return 1;
    if (withdrawnCount > 0) return 2;
    return 0;
  };

  const defaultTabIndex = getDefaultTabIndex();


  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="flex  flex-row justify-between md:h-10  gap-y-3 items-center">
            {isAllCompanySelected === true ? (
              <div className="font-semibold text-xl">
                All Shareholder Proposals
              </div>
            ) : (
              <div className="font-semibold text-xl">Shareholder Proposals</div>
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
                        try {
                          dispatch(
                            selectUnSelectAllCompany(!isAllCompanySelected)
                          );
                          dispatch(
                            modifyRoute({
                              route: "share-holder-proposal",
                              type: e.target.checked,
                            })
                          );
                        } catch (error) { }
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
              <div className="flex flex-col p-5  sm:flex-row gap-y-2">
                <div className="flex  ">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url={[...multSearchUrls]}
                    getOptionKey="proponent_name"
                    placeHolder="Search Proponent"
                    onSearchChange={resetPage}
                    isSingle={true}
                  />
                  <div className="hover:bg-slate-50">
                    <Button onClick={handleClearAllFilter}>
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
                  {user?.saved_search?.["Shareholder Proposal"] !==
                    undefined && (
                      <div className="hover:bg-slate-50 ">
                        <Button onClick={getSavedSearches}>
                          Previous Search
                        </Button>
                      </div>
                    )}
                  {(tab == "proposal" && proposalCount > 0) &&
                    <div className="mt-2">
                      <FormSwitch className="mb-6">
                        <label className="text-md mr-3 font-semibold">Analytics</label>
                        <FormSwitch.Input
                          id="view-analysis-switch"
                          type="checkbox"
                          checked={isViewAnalysis}
                          onChange={(e) => setIsViewAnalysis(e.target.checked)}
                        />
                        <FormSwitch.Label htmlFor="view-analysis-switch"></FormSwitch.Label>
                      </FormSwitch>
                    </div>

                  }
                  {(tab == "no-action" && noActionCount > 0) &&
                    <div className="mt-2">
                      <FormSwitch className="mb-6">
                        <label className="text-md mr-3 font-semibold">Analytics</label>
                        <FormSwitch.Input
                          id="view-analysis-switch"
                          type="checkbox"
                          checked={isViewAnalysis}
                          onChange={(e) => setIsViewAnalysis(e.target.checked)}
                        />
                        <FormSwitch.Label htmlFor="view-analysis-switch"></FormSwitch.Label>
                      </FormSwitch>
                    </div>

                  }
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

              {isFilterCollapse && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="filter-section mb-5">
                    <div className="flex items-center justify-end mt-2 mb-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          onFilterClear();
                          close();
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
                    <div
                      className={clsx([
                        "grid grid-cols-1 xs:grid-cols-1 gap-4 mb-3 md:grid-cols-4",
                      ])}
                    >
                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Year</span>
                          {apiDropdownOptions?.year?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="year"
                                  checked={
                                    apiDropdownOptions.year.length ===
                                    watch("year")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    setValue(
                                      "year",
                                      e.target.checked
                                        ? apiDropdownOptions.year
                                        : []
                                    );
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
                            <TomSelect
                              value={field.value || []}
                              onChange={field.onChange}
                              options={{ placeholder: "Select Year" }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader ? (
                                <option disabled>Loading...</option>
                              ) : (
                                apiDropdownOptions.year?.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Category</span>
                          {apiDropdownOptions.category?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="category"
                                  checked={
                                    apiDropdownOptions.category.length ===
                                    watch("category")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    setValue(
                                      "category",
                                      e.target.checked
                                        ? apiDropdownOptions.category
                                        : []
                                    );
                                    getSubCategoryDropdown(
                                      apiDropdownOptions.category
                                    );
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
                            <TomSelect
                              value={field.value || []}
                              // onChange={field.onChange}
                              onChange={(value) => {
                                field.onChange(value);
                                getSubCategoryDropdown(value?.target?.value);
                              }}
                              options={{ placeholder: "Select Category" }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader ? (
                                <option disabled>Loading...</option>
                              ) : (
                                apiDropdownOptions.category?.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Sub Category</span>
                          {apiSubCategoryDropdown.sub_category?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="sub_category"
                                  checked={
                                    apiSubCategoryDropdown.sub_category
                                      .length === watch("sub_category")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    setValue(
                                      "sub_category",
                                      e.target.checked
                                        ? apiSubCategoryDropdown.sub_category
                                        : []
                                    );
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="sub_category"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={field.onChange}
                              options={{ placeholder: "Select Sub Category" }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader ? (
                                <option disabled>Loading...</option>
                              ) : (
                                apiSubCategoryDropdown.sub_category?.map(
                                  (subCat: any) => (
                                    <option key={subCat} value={subCat}>
                                      {subCat}
                                    </option>
                                  )
                                )
                              )}
                            </TomSelect>
                          )}
                        />
                      </div>

                      {/* <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="font-semibold">Status</span>
                          {apiDropdownOptions.status?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="status"
                                  checked={
                                    apiDropdownOptions.status.length ===
                                    watch("status")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    setValue(
                                      "status",
                                      e.target.checked
                                        ? apiDropdownOptions.status
                                        : []
                                    );
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name="status"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <TomSelect
                              value={field.value || []}
                              onChange={field.onChange}
                              options={{ placeholder: "Select Status" }}
                              className="w-full"
                              multiple
                            >
                              {getDropdownLoader ? (
                                <option disabled>Loading...</option>
                              ) : (
                                apiDropdownOptions.status?.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))
                              )}
                            </TomSelect>
                          )}
                        />
                      </div> */}

                      <div className="w-full">
                        <div className="text-left text-slate-500 font-semibold">
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

                      {isAllCompanySelected && (
                        <div className="w-full">
                          <div className="text-left text-slate-500 font-semibold">
                            Companies
                          </div>
                          <Controller
                            name="global_search"
                            control={control}
                            render={({ field }) => (
                              <CompanySelect
                                value={field.value}
                                onChange={field.onChange}
                                isMulti
                                className="mt-1"
                              />
                            )}
                          />
                        </div>
                      )}

                      {
                        (tab === "proposal" || tab === "no-action") && (
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
                        )
                      }

                      {user?.user_type === "Admin" && (
                        <>
                          <div className="w-full">
                            <div className="text-left text-slate-500 flex justify-between mb-1">
                              <span className="font-semibold">Month</span>
                            </div>
                            <Controller
                              name="month"
                              control={control}
                              defaultValue={[]}
                              render={({ field }) => (
                                <TomSelect
                                  value={field.value || []}
                                  onChange={(event) => {
                                    const values = event.target.value;
                                    field.onChange(
                                      values.map((value: string) =>
                                        parseInt(value, 10)
                                      )
                                    );
                                  }}
                                  options={{ placeholder: "Select Month" }}
                                  className="w-full"
                                  multiple
                                >
                                  {getDropdownLoader ? (
                                    <option disabled>Loading...</option>
                                  ) : (
                                    monthDropdownOption?.map((item: any) => (
                                      <option key={item?.id} value={item?.id}>
                                        {item?.month}
                                      </option>
                                    ))
                                  )}
                                </TomSelect>
                              )}
                            />
                          </div>



                          {tab === "proposal" && (
                            <>
                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  Ready For Review
                                </div>
                                <Controller
                                  name="ready_for_review"
                                  control={control}
                                  defaultValue={null} // Ensure it starts as null (neither true nor false)
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>

                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  Admin Status
                                </div>
                                <Controller
                                  name="check_status"
                                  control={control}
                                  defaultValue={null} // Ensure it starts as null (neither true nor false)
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>

                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  No Shareholder Proposal
                                </div>
                                <Controller
                                  name="no_shareholder_proposal"
                                  control={control}
                                  defaultValue={null} // Default as null to allow toggling
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>

                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  NL Exist
                                </div>
                                <Controller
                                  name="nl_exist"
                                  control={control}
                                  defaultValue={null} // Default as null to allow toggling
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>
                            </>
                          )}

                          {tab === "no-action" && (
                            <>
                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  Approved
                                </div>
                                <Controller
                                  name="approved"
                                  control={control}
                                  defaultValue={null} // Default as null to allow toggling
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>

                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  Is Correct
                                </div>
                                <Controller
                                  name="is_correct"
                                  control={control}
                                  defaultValue={null} // Default as null to allow toggling
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>

                              <div className="w-full">
                                <div className="text-left text-slate-500 font-semibold">
                                  Company Status
                                </div>
                                <Controller
                                  name="company_status"
                                  control={control}
                                  defaultValue={null} // Default as null to allow toggling
                                  render={({ field }) => (
                                    <div className="flex flex-row mt-[10px]">
                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-true"
                                          type="checkbox"
                                          checked={field.value === true} // Check for true value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === true
                                                  ? null
                                                  : true
                                              ) // Toggle true/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-true"
                                          className="ml-2 text-left"
                                        >
                                          True
                                        </FormCheck.Label>
                                      </FormCheck>

                                      <FormCheck className="flex items-center mr-2">
                                        <FormCheck.Input
                                          id="checkbox-switch-false"
                                          type="checkbox"
                                          checked={field.value === false} // Check for false value
                                          onChange={
                                            () =>
                                              field.onChange(
                                                field.value === false
                                                  ? null
                                                  : false
                                              ) // Toggle false/null
                                          }
                                        />
                                        <FormCheck.Label
                                          htmlFor="checkbox-switch-false"
                                          className="ml-2 text-left"
                                        >
                                          False
                                        </FormCheck.Label>
                                      </FormCheck>
                                    </div>
                                  )}
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </form>
              )}



              <div className="overflow-auto xl:overflow-visible px-5">
                <Tab.Group selectedIndex={getSelectedTabIndex()} defaultIndex={defaultTabIndex}>
                  <Tab.List variant="link-tabs">
                    <Tab>
                      <Tab.Button
                        className="w-full py-2"
                        as="button"
                        onClick={() => {
                          dispatch(setTabs("proposal"));
                          dispatch(resetPage());
                          clearNoActionFilter();
                          setTempTab("proposal");
                        }}
                      >
                        <div className="flex items-center justify-center ">
                          Shareholder Proposals
                          <span
                            className="bg-[#ab123d] rounded-lg h-7 w-10 p-3 
                          font-semibold text-white text-[11px] ml-2
                           flex items-center justify-center"
                          >
                            {proposalCount}
                          </span>
                        </div>
                      </Tab.Button>
                    </Tab>

                    <Tab>
                      <Tab.Button
                        className="w-full py-2"
                        as="button"
                        onClick={() => {
                          dispatch(setTabs("no-action"));
                          dispatch(resetPage());
                          setTempTab("no-action");
                        }}
                      >
                        <div className="flex items-center justify-center ">
                          No Action Letter
                          <span
                            className="bg-[#ab123d] rounded-lg h-7 w-10 p-3 
                          font-semibold text-white text-[11px] ml-2
                           flex items-center justify-center"
                          >
                            {noActionCount}
                          </span>
                        </div>
                      </Tab.Button>
                    </Tab>

                    <Tab>
                      <Tab.Button
                        className="w-full py-2"
                        as="button"
                        onClick={() => {
                          dispatch(setTabs("withdrawn"));
                          dispatch(resetPage());
                          clearNoActionFilter();
                          setIsViewAnalysis(false);
                          setTempTab("withdrawn");

                        }}
                      >
                        <div className="flex items-center justify-center ">
                          Withdrawn (Proponent Disclosure)
                          <span
                            className="bg-[#ab123d] rounded-lg h-7 w-10 p-3 
                          font-semibold text-white text-[11px] ml-2
                           flex items-center justify-center"
                          >
                            {withdrawnCount}
                          </span>
                        </div>
                      </Tab.Button>
                    </Tab>
                  </Tab.List>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      {user?.user_type === "Admin" && (
                        <div className="flex justify-end my-3">
                          <Button
                            onClick={() => {
                              setSelectedShareholderProposal(null);
                              setAddNewShareholderModalVisible(true);
                            }}
                            variant="primary"
                            className="bg-theme-2 border-bg-theme-2 "
                          >
                            <Lucide
                              icon="PenLine"
                              className="stroke-[1.3] w-4 h-4 mr-2"
                            />
                            Add New Shareholder
                          </Button>
                        </div>
                      )}
                      {isViewAnalysis &&
                        <div className="w-full pt-5">
                          <div className="flex gap-4 mb-6 px-4">
                            <button
                              className={`px-5 py-2 rounded-lg font-medium transition-all ${activeTab === "shareholders"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("shareholders")}
                            >
                              All Shareholder Proposals
                            </button>
                            <button
                              className={`px-5 py-2 rounded-lg font-medium transition-all ${activeTab === "proponents"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("proponents")}
                            >
                              Shareholder Proposals: Proponent Analytics
                            </button>
                          </div>

                          {/* Content */}
                          <div >
                            {activeTab === "shareholders" ? (
                              <ShareHolderProposalAnalyticsComponent
                                proposalCounts={proposalCounts}
                                topSubcategories={topSubcategories}
                                topCategories={topCategories}
                                yearlySummary={yearlySummary}
                                tab={tab}
                                isAllCompanySelected={isAllCompanySelected}
                              />
                            ) : (
                              <ProponentsAnalyticsComponent
                                topProponents={topProponents}
                                handleSearch={handleSearch}
                                setSearchTerms={setSearchTerms}
                                tab={tab}
                              />
                            )}
                          </div>
                        </div>}
                      <TableWrapper isLoading={loading}>
                        <div className="overflow-auto max-h-[400px]">
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Td className="py-2 text-left w-1/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Year
                                </Table.Td>
                                {isAllCompanySelected && (
                                  <Table.Td className="py-2  w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                    Company
                                  </Table.Td>
                                )}
                                <Table.Td className="py-2 w-4/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Proponent
                                </Table.Td>
                                <Table.Td
                                  onClick={() => {
                                    window.scrollBy({
                                      top: 650,
                                      behavior: "smooth",
                                    });
                                  }}
                                  className="py-2 cursor-pointer w-2/12 font-semibold h-[50px] text-center bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  % Support*
                                </Table.Td>
                                <Table.Td className="py-2  w-2/12 font-semibold h-[50px] text-center bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Vote Details
                                </Table.Td>
                                <Table.Td className="py-2  w-2/12 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  No Action Letters
                                </Table.Td>
                                <Table.Td className="py-2  w-2/12 odd:pl-[40px] font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Details
                                </Table.Td>
                              </Table.Tr>
                            </Table.Thead>

                            <Table.Tbody>
                              {shareHolderProposal?.length > 0 &&
                                shareHolderProposal?.map((noAction: any) => (
                                  <Table.Tr
                                    key={noAction?.id}
                                    className="[&_td]:last:border-b-0"
                                  >
                                    <Table.Td className="py-2 text-left border-dashed dark:bg-darkmode-600">
                                      {noAction?.year}
                                    </Table.Td>
                                    {isAllCompanySelected && (
                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                        {noAction?.company_name}
                                      </Table.Td>
                                    )}
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[300px] overflow-hidden text-ellipsis text-wrap">
                                      {
                                        noAction?.proponent === "Not Disclosed" &&
                                          (!noAction?.proponent_name || noAction?.proponent_name.trim() === "")
                                          ? noAction?.proponent
                                          : noAction?.proponent === "Not Disclosed"
                                            ? noAction?.proponent_name
                                            : noAction?.proponent
                                      }
                                    </Table.Td>
                                    <Table.Td
                                      className={clsx([`py-2 border-dashed dark:bg-darkmode-600 text-wrap font-bold ${noAction?.color_name} text-center`])}>
                                      {noAction?.outcome_percentage}
                                    </Table.Td>
                                    <Table.Td className="py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      {noAction?.vote_details?.length > 0 && (
                                        <div className="flex items-center justify-center cursor-pointer hover:opacity-80 transition duration-150">
                                          <Grid3X3
                                            strokeWidth={1.25}
                                            onClick={() => onVisibleDetail(noAction)}
                                          />
                                        </div>

                                      )}

                                      {!noAction?.vote_details && noAction?.year?.toString() === "2025" && (
                                        <div className="whitespace-nowrap flex items-center justify-center">
                                          <div className="flex items-center justify-center w-full h-full text-primary mr-2">
                                            <Tippy content="Not Disclose" options={{ theme: "light" }}>
                                              <MegaphoneOff size={22} strokeWidth={1.2} absoluteStrokeWidth />
                                            </Tippy>
                                          </div>
                                        </div>
                                      )}
                                    </Table.Td>
                                    <Table.Td
                                      className={clsx([
                                        "py-2 font-semibold border-dashed dark:bg-darkmode-600",
                                        noAction?.nl_exist &&
                                        "text-blue-600 underline cursor-pointer",
                                      ])}
                                      onClick={() => {
                                        const id =
                                          noAction?.nl_exist === true
                                            ? noAction?.no_action_link
                                              ?.split("/")
                                              .filter(Boolean)
                                              .pop()
                                            : 0;
                                        noAction?.nl_exist === true &&
                                          navigate(
                                            `/share-holder-proposal/${id}?url=shareholder_proposal/no_action`
                                          );
                                      }}
                                    >
                                      <div className="flex items-center justify-center">
                                        {noAction?.nl_exist === true
                                          ? "Yes"
                                          : ""}
                                      </div>
                                    </Table.Td>

                                    <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex gap-3 justify-center">
                                        {user?.user_type === "Admin" && (
                                          <Tippy
                                            content="Duplicate"
                                            options={{ theme: "light" }}
                                          >
                                            <Lucide
                                              onClick={() =>
                                                onEditProposalClickHandler(
                                                  noAction,
                                                  "duplicate"
                                                )
                                              }
                                              icon="Copy"
                                              className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                            />
                                          </Tippy>
                                        )}

                                        <Lucide
                                          onClick={() =>
                                            navigate(
                                              `/share-holder-proposal/${noAction?.id}?url=shareholder_proposal/def14a`
                                            )
                                          }
                                          icon="Eye"
                                          className="w-4 h-4 mr-1.5 stroke-[1.3] cursor-pointer hover:opacity-80 transition duration-150"
                                        />

                                        {user?.user_type === "Admin" && (
                                          <Tippy
                                            content="Edit"
                                            options={{ theme: "light" }}
                                          >
                                            <Lucide
                                              onClick={() =>
                                                onEditProposalClickHandler(
                                                  noAction,
                                                  "edit"
                                                )
                                              }
                                              icon="PenLine"
                                              className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                            />
                                          </Tippy>
                                        )}
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                            </Table.Tbody>
                            {shareHolderProposal?.length === 0 && (
                              <div className="w-full">
                                <h1 className="mt-3">No Records Found..</h1>
                              </div>
                            )}
                          </Table>
                        </div>
                      </TableWrapper>

                    </Tab.Panel>
                  </Tab.Panels>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      {user?.user_type === "Admin" && (
                        <div className="flex justify-end my-3">
                          <Button
                            onClick={() => {
                              setSelectedShareholderNoAction(null);
                              setAddNewNoActionModalVisible(true);
                            }}
                            variant="primary"
                            className="bg-theme-2 border-bg-theme-2 "
                          >
                            <Lucide
                              icon="PenLine"
                              className="stroke-[1.3] w-4 h-4 mr-2"
                            />
                            Add New No Action
                          </Button>
                        </div>
                      )}
                      {isViewAnalysis &&
                        <div className="w-full pt-5">
                          <div className="flex gap-4 mb-6 px-4 ">
                            <button
                              className={`px-5 py-2 rounded-lg font-medium transition-all ${activeTab === "shareholders"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("shareholders")}
                            >
                              All No Action Letters
                            </button>
                            <button
                              className={`px-5 py-2 rounded-lg font-medium transition-all ${activeTab === "proponents"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("proponents")}
                            >
                              No Action Letters: Proponent Analytics
                            </button>
                          </div>

                          {/* Content */}
                          <div>
                            {activeTab === "shareholders" ? (
                              <ShareHolderProposalAnalyticsComponent
                                proposalCounts={proposalCounts}
                                topSubcategories={topSubcategories}
                                topCategories={topCategories}
                                yearlySummary={yearlySummary}
                                tab={tab}
                                pieChartOutcome={pieChartOutcome}
                                isAllCompanySelected={isAllCompanySelected}
                              />
                            ) : (
                              <ProponentsAnalyticsComponent
                                topProponents={topProponents}
                                handleSearch={handleSearch}
                                setSearchTerms={setSearchTerms}
                                tab={tab}
                              />
                            )}
                          </div>
                        </div>}
                      <TableWrapper isLoading={loading}>
                        <div className="overflow-auto max-h-[400px]">
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Td className="py-2  w-1/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Year
                                </Table.Td>
                                {isAllCompanySelected && (
                                  <Table.Td className="py-2  w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                    Company
                                  </Table.Td>
                                )}
                                <Table.Td className="py-2  w-4/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Proponent
                                </Table.Td>
                                <Table.Td className="py-2  w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Category
                                </Table.Td>
                                <Table.Td className="py-2  w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Sub Category
                                </Table.Td>
                                <Table.Td className="py-2  w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Outcome
                                </Table.Td>
                                <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 w-2/12 font-semibold h-[50px] text-center bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Details
                                </Table.Td>
                              </Table.Tr>
                            </Table.Thead>

                            <Table.Tbody>
                              {shareHolderProposal?.length > 0 &&
                                shareHolderProposal?.map((noAction: any) => (
                                  <Table.Tr
                                    key={noAction?.id}
                                    className="[&_td]:last:border-b-0"
                                  >
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.year}
                                    </Table.Td>
                                    {isAllCompanySelected && (
                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                        {noAction?.company_name}
                                      </Table.Td>
                                    )}
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.proponent || "-"}
                                    </Table.Td>
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.category}
                                    </Table.Td>
                                    <Table.Td className="py-2  border-dashed dark:bg-darkmode-600">
                                      {noAction?.sub_category}
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[150px] overflow-hidden text-ellipsis">
                                      {noAction?.staff_response}
                                    </Table.Td>
                                    <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex gap-3 justify-center">
                                        <Tippy
                                          content=" See Details"
                                          options={{ theme: "light" }}
                                        >
                                          <Lucide
                                            onClick={() =>
                                              navigate(
                                                `/share-holder-proposal/${noAction?.id}?url=shareholder_proposal/no_action`
                                              )
                                            }
                                            icon="Eye"
                                            className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                          />
                                        </Tippy>
                                        {user?.user_type === "Admin" && (
                                          <Tippy
                                            content="Edit"
                                            options={{ theme: "light" }}
                                          >
                                            <Lucide
                                              onClick={() => {
                                                onEditNoActionClickHandler(
                                                  noAction
                                                );
                                              }}
                                              icon="PenLine"
                                              className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                            />
                                          </Tippy>
                                        )}
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                            </Table.Tbody>
                            {shareHolderProposal?.length === 0 && (
                              <div className="w-full">
                                <h1 className="mt-3">No Records Found..</h1>
                              </div>
                            )}
                          </Table>
                        </div>
                      </TableWrapper>
                    </Tab.Panel>
                  </Tab.Panels>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      {user?.user_type === "Admin" && (
                        <div className="flex justify-end my-3">
                          <Button
                            onClick={() => {
                              setSelectedShareholderWithdrawn(null);
                              setAddNewWithdrawnModalVisible(true);
                            }}
                            variant="primary"
                            className="bg-theme-2 border-bg-theme-2 "
                          >
                            <Lucide
                              icon="PenLine"
                              className="stroke-[1.3] w-4 h-4 mr-2"
                            />
                            Add New Withdrawn
                          </Button>
                        </div>
                      )}
                      <TableWrapper isLoading={loading}>
                        <div className="overflow-auto max-h-[400px]">
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Td className="py-2 w-1/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Year
                                </Table.Td>
                                {isAllCompanySelected && (
                                  <Table.Td className="py-2  w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                    Company
                                  </Table.Td>
                                )}
                                <Table.Td className="py-2 w-4/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Proponent
                                </Table.Td>
                                <Table.Td className="py-2 w-2/12 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Outcome
                                </Table.Td>
                                <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 w-2/12 font-semibold h-[50px] text-center bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                  Details
                                </Table.Td>
                              </Table.Tr>
                            </Table.Thead>

                            <Table.Tbody>
                              {shareHolderProposal?.length > 0 &&
                                shareHolderProposal?.map((noAction: any) => (
                                  <Table.Tr
                                    key={noAction?.id}
                                    className="[&_td]:last:border-b-0"
                                  >
                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                      {noAction?.year}
                                    </Table.Td>
                                    {isAllCompanySelected && (
                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                        {noAction?.company_name}
                                      </Table.Td>
                                    )}
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[300px] overflow-hidden text-ellipsis">
                                      {noAction?.proponent}
                                    </Table.Td>
                                    <Table.Td className="whitespace-nowrap capitalize max-w-[150px] overflow-hidden text-ellipsis">
                                      {noAction?.status}
                                    </Table.Td>
                                    <Table.Td className=" py-2 relative  w-[150px] box shadow-[5px_3px_5px_#00000005] first:border-l last:border-r first:rounded-l-[0.6rem] last:rounded-r-[0.6rem] rounded-l-none rounded-r-none border-x-0 dark:bg-darkmode-600">
                                      <div className="flex gap-3 justify-center">
                                        <Tippy
                                          content=" See Details"
                                          options={{ theme: "light" }}
                                        >
                                          <Lucide
                                            onClick={() =>
                                              navigate(
                                                `/share-holder-proposal/${noAction?.id}?url=shareholder_proposal/withdrawn`
                                              )
                                            }
                                            icon="Eye"
                                            className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                          />
                                        </Tippy>
                                        {user?.user_type === "Admin" && (
                                          <Tippy
                                            content="Edit"
                                            options={{ theme: "light" }}
                                          >
                                            <Lucide
                                              onClick={() =>
                                                onEditWithdrawnClickHandler(
                                                  noAction
                                                )
                                              }
                                              icon="PenLine"
                                              className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                            />
                                          </Tippy>
                                        )}
                                      </div>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                            </Table.Tbody>
                            {shareHolderProposal?.length === 0 && (
                              <div className="w-full">
                                <h1 className="mt-3">No Records Found..</h1>
                              </div>
                            )}
                          </Table>
                        </div>
                      </TableWrapper>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
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
              <footer className="!pt-3 flex items-start flex-col">
                <span className="!pt-3 flex items-center p-2">
                  <sup
                    className="bold-sup cursor-pointer ml-1"
                    style={{ fontSize: "0.8em" }}
                  >*</sup>
                  <p id="footnote " className="">
                    [For/(For + Against or Withhold + Abstain)]
                  </p>
                </span>
              </footer>
            </div>
          </div>
          {addNewShareholderModalVisible && (
            <AddNewShareholder
              addNewShareholderModalVisible={addNewShareholderModalVisible}
              setAddNewShareholderModalVisible={
                setAddNewShareholderModalVisible
              }
              selectedShareholderProposal={selectedShareholderProposal}
              type={actionType}
            />
          )}

          {addNewNoActionModalVisible && (
            <AddNewNoAction
              addNewNoActionModalVisible={addNewNoActionModalVisible}
              setAddNewNoActionModalVisible={setAddNewNoActionModalVisible}
              selectedShareholderNoAction={selectedShareholderNoAction}
            />
          )}

          {addNewWithdrawnModalVisible && (
            <AddNewWithdrawn
              addNewWithdrawnModalVisible={addNewWithdrawnModalVisible}
              setAddNewWithdrawnModalVisible={setAddNewWithdrawnModalVisible}
              selectedShareholderWithdrawn={selectedShareholderWithdrawn}
            />
          )}

          {shareholderDetailModalVisible && (
            <DetailDialog
              shareholderDetailModalVisible={shareholderDetailModalVisible}
              setShareholderDetailModalVisible={
                setShareholderDetailModalVisible
              }
              selectedShareholderDetail={selectedShareholderDetail}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default ShareHolderProposal;
