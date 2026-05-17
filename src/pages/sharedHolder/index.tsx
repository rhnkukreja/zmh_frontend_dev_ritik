import Lucide from "@/components/Base/Lucide";
import { Dialog, Popover, Tab } from "@/components/Base/Headless";
import { toast } from "react-toastify";
import { FormCheck, FormInput, FormSwitch } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import { useEffect, useMemo, useState, useCallback } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { Link, useLocation, useNavigate } from "react-router-dom";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import {
  countValidFilters,
  countIndividualFilters,
  createDynamicURL,
  downloadFileByServer,
  downloadFileFromAPI,
  downloadXlsxFile,
  generateFilterChips,
} from "@/utils/helper";
import { baseURL } from "@/constant";
import Tippy from "@/components/Base/Tippy";
import {
  ArrowDown,
  Download,
  FilterX,
  Grid3X3,
  MegaphoneOff,
  SaveAll,
} from "lucide-react";
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
import { axiosInstance } from "@/services";
import {
  setIsCompanySelected,
  setSavedSearch,
} from "@/stores/authenticationSlice";
import { ShareHolderFilter } from "@/types/ShareholdeFilter";
import AddNewShareholder from "./components/AddNewShareholder";
import AddNewWithdrawn from "./components/AddNewWithdrawn";
import AddNewNoAction from "./components/AddNewNoAction";
import CompanySelect from "@/components/ReactSelectAsync";
import DetailDialog from "./components/DetailDialog";
import ProposalDetailsTableView from "./components/ProposalDetailsTableView";
import { modifyRoute } from "@/stores/themeSlice";
import FilterChips from "@/components/FilterChips";
import StandardizedFilterPills from "@/components/StandardizedFilterPills";
import StandardizedTable from "@/components/StandardizedTable";
import ShareHolderProposalAnalyticsComponent from "@/components/ShareHolderProposalsAnalytics";
import ProponentsAnalyticsComponent from "@/components/ProponentsAnalytics";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonText,
} from "@/components/Base/Skeletons";
import Pill from "@/components/Pill";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";

function ShareHolderProposal() {
  const dispatch: AppDispatch = useAppDispatch();
  const { user, companyGlobalSearchName, isCompanySelected, finhub, companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );
  const location = useLocation();
  const { isBackToShareholderPage } = location.state || {};

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewParam = searchParams.get("view");
    const gsParam = searchParams.get("global_search");
    const urlParam = searchParams.get("url");
    const pageParam = searchParams.get("page");

    if (viewParam === "table-only") {
      setTableOnlyView(true);
    }

    if (gsParam) {
      try {
        const decoded = decodeURIComponent(gsParam);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch(setFilter({ key: "global_search", value: parsed }));
        }
      } catch {
        dispatch(setFilter({ key: "global_search", value: [gsParam] }));
      }
    }

    if (urlParam) {
      if (urlParam.includes("no_action")) {
        dispatch(setTabs("no-action"));
        setTempTab("no-action");
      } else if (urlParam.includes("withdrawn")) {
        dispatch(setTabs("withdrawn"));
        setTempTab("withdrawn");
      } else {
        dispatch(setTabs("proposal"));
        setTempTab("proposal");
      }
    }

    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        dispatch(setPage(parsedPage));
      }
    }
  }, [dispatch, location.search]);

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
    pieChartOutcome,
  } = useAppSelector((state) => state.sharedHolderNoAction);

  const [searchTerms, setSearchTerms] = useState<string[]>([
    ...filters?.proponent_name,
  ]);
  const [proposalsAnalytics, setProposalsAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [isViewAnalysis, setIsViewAnalysis] = useState(true);
  const [activeTab, setActiveTab] = useState<"shareholders" | "proponents">(
    "shareholders"
  );
  const [tempTab, setTempTab] = useState<
    "" | "proposal" | "no-action" | "withdrawn"
  >("proposal");

  const [tableOnlyView, setTableOnlyView] = useState<boolean>(false);

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
  const [keywordDropdownOptions, setKeywordDropdownOptions] = useState<string[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      keyword: filters.keyword || [],
      // Ensure year is always an array of strings
      year: filters.year ? filters.year.map(String) : [],
      proponent_name: filters?.proponent_name,
      ready_for_review: filters?.ready_for_review,
      check_status: filters?.check_status,
      no_shareholder_proposal: filters?.no_shareholder_proposal,
      approved: filters?.approved,
      is_correct: filters?.is_correct,
      company_status: filters?.company_status,
      head_support: filters?.head_support,
      nl_exist: filters?.nl_exist,
      index: filters?.index ?? undefined,
      anti_category: filters?.anti_category || [],
      global_search:
        filters?.global_search?.map((item: string) => ({
          value: item,
          label: item,
        })) || [],
    },
  });

  const resetFormValues: any = () => {
    setValue("category", []);
    setValue("keyword", []);
    setValue("sub_category", []);
    setValue("status", []);
    setValue("year", []);
    setValue("proxy_season", []);
    setValue("proponent_name", []);
    setValue("global_search", []);
    setValue("ready_for_review", null);
    setValue("check_status", null);
    setValue("no_shareholder_proposal", null);
    setValue("approved", null);
    setValue("is_correct", null);
    setValue("company_status", null);
    setValue("head_support", null);
    setValue("nl_exist", null);
    setValue("index", undefined);
  };

  const navigate = useNavigate();

  // Helper function to check if analytics data is available
  const isAnalyticsDataAvailable = () => {
    if (tab === "proposal") {
      // For proposal tab, check if there's actual meaningful data
      const hasProposalCount = proposalsAnalytics?.total_proposals?.total_proposals && proposalsAnalytics.total_proposals.total_proposals > 0;
      const hasCategories = proposalsAnalytics?.topCategories && Array.isArray(proposalsAnalytics.topCategories) && proposalsAnalytics.topCategories.length > 0;
      const hasSubcategories = proposalsAnalytics?.topSubcategories && typeof proposalsAnalytics.topSubcategories === 'object' && Object.keys(proposalsAnalytics.topSubcategories).length > 0;
      const hasYearlySummary = proposalsAnalytics?.yearlySummary && Array.isArray(proposalsAnalytics.yearlySummary) && proposalsAnalytics.yearlySummary.length > 0;
      const hasProponents = proposalsAnalytics?.topProponents && Array.isArray(proposalsAnalytics.topProponents) && proposalsAnalytics.topProponents.length > 0;

      return hasProposalCount || hasCategories || hasSubcategories || hasYearlySummary || hasProponents;
    } else {
      // For no-action/withdrawn tabs, check regular data
      const hasProposalCount = proposalCounts?.total_proposals && proposalCounts.total_proposals > 0;
      const hasCategories = topCategories && Array.isArray(topCategories) && topCategories.length > 0;
      const hasSubcategories = topSubcategories && typeof topSubcategories === 'object' && Object.keys(topSubcategories).length > 0;
      const hasYearlySummary = yearlySummary && Array.isArray(yearlySummary) && yearlySummary.length > 0;
      const hasProponents = topProponents && Array.isArray(topProponents) && topProponents.length > 0;

      return hasProposalCount || hasCategories || hasSubcategories || hasYearlySummary || hasProponents;
    }
  };

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
        route: "shareholder-proposal",
        type: true,
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
    const updatedFilters = tab === "withdrawn"
      ? {
        ...filters,
        ...(filters.proxy_season?.length > 0 && { year: filters.proxy_season, proxy_season: [] })
      }
      : {
        ...filters,
        ...(filters.year?.length > 0 && { proxy_season: filters.year, year: [] })
      };

    // Create a copy of filters and ensure index is not transformed to index_name
    const shareholderFilters = { ...updatedFilters };
    if (shareholderFilters.index_name && !shareholderFilters.index) {
      shareholderFilters.index = shareholderFilters.index_name;
      delete shareholderFilters.index_name;
    }

    const dynamicURL = createDynamicURL(tabUrls[tab], shareholderFilters, undefined, page);
    dispatch(fetchShareHolderProposal(dynamicURL));


    if (tab === "no-action") {
      var { institution_name, global_search, ...restFilters } = filters;
    } else {
      var {
        is_correct,
        company_status,
        institution_name,
        global_search,
        ...restFilters
      } = filters;
    }

    setFiltersLength(
      countIndividualFilters(
        isAllCompanySelected === false
          ? restFilters
          : { ...restFilters, global_search: filters.global_search }
      )
    );
    var { proponent_name, ...chipFilters } = restFilters;

    setSelectedChipFilters(
      generateFilterChips(
        isAllCompanySelected === false
          ? chipFilters
          : { ...chipFilters, global_search: filters.global_search }
      )
    );
  }, [page, tab, filters]);

  useEffect(() => {
    if (isCompanySelected) {
      dispatch(selectUnSelectAllCompany(false));
      dispatch(setIsCompanySelected(false));
      setIsViewAnalysis(true);
    }
  }, [isCompanySelected]);
  useEffect(() => {
    const fetchData = async () => {
      // For company view, need global_search; for all companies view, it's optional
      if (!isAllCompanySelected && filters?.global_search.length === 0) {
        return;
      }

      try {
        setLoadingAnalytics(true);

        const updatedFilters = {
          ...filters,
          ...(filters.year?.length > 0 && { proxy_season: filters.year, year: [] }),
        };

        // Create a copy of filters and ensure index is not transformed to index_name
        const shareholderFilters = { ...updatedFilters };
        if (shareholderFilters.index_name && !shareholderFilters.index) {
          shareholderFilters.index = shareholderFilters.index_name;
          delete shareholderFilters.index_name;
        }

        const dynamicURL =
          createDynamicURL(tabUrls[tab], shareholderFilters, undefined, page) +
          (isViewAnalysis && tab === "proposal" ? "&analytics_data=true" : "");

        const response = await shareHolderProposalService.getShareHolderProposal(dynamicURL);

        if (response) {
          setProposalsAnalytics(response);
        }
      } catch (error) {
        console.error("Error fetching shareholder proposals:", error);
        setProposalsAnalytics(null);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    if (isViewAnalysis) {
      fetchData();
    }
  }, [page, tab, filters, isViewAnalysis, isAllCompanySelected]);


  useEffect(() => {
    if (isAllCompanySelected === false && filters?.global_search.length === 0) {
      return;
    }
    getAllShareholderAPI();
  }, [filters]);

  const getAllShareholderAPI = async () => {
    try {
      const updatedFilters = tab === "withdrawn"
        ? {
          ...filters,
          ...(filters.proxy_season?.length > 0 && { year: filters.proxy_season, proxy_season: [] })
        }
        : {
          ...filters,
          ...(filters.year?.length > 0 && { proxy_season: filters.year, year: [] })
        };
      // Create a copy of filters and ensure index is not transformed to index_name
      const shareholderFilters = { ...updatedFilters };
      if (shareholderFilters.index_name && !shareholderFilters.index) {
        shareholderFilters.index = shareholderFilters.index_name;
        delete shareholderFilters.index_name;
      }

      const proposalResponse =
        await shareHolderProposalService.getAllShareholderAPI(
          createDynamicURL(
            `${baseURL}/shareholder_proposal/def14a/`,
            shareholderFilters,
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
            shareholderFilters,
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
            shareholderFilters,
            undefined,
            page
          )
        );
      if (withdrawnResponse?.result) {
        setWithdrawnCount(withdrawnResponse?.result?.count ?? 0);
      }

      // if (!isBackToShareholderPage) {
      //   if (proposalResponse?.result?.count > 0 &&  filters?.proponent_name?.length >= 0) {
      //     dispatch(setTabs("proposal"));

      //   } else if (noActionResponse?.result?.count > 0) {
      //     dispatch(setTabs("no-action"));
      //   } else if (withdrawnResponse?.result?.count > 0) {
      //     dispatch(setTabs("withdrawn"));
      //   }
      // }
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
      setIsViewAnalysis(true);
    }
    if (tab == "no-action" && noActionCount == 0) {
      setIsViewAnalysis(true);
    }

    // if (tempTab !== tab) {
    //   dispatch(setTabs(tempTab));
    // }
  }, [tab]);

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

  const handleDelete = async () => {
    if (!proposalToDelete) return;

    try {
      setIsDeleting(true);
      await shareHolderProposalService.deleteShareHolderProposal(proposalToDelete.id);

      toast.success("Proposal deleted successfully");
      setIsDeleteModalOpen(false);
      setProposalToDelete(null);

    } catch (error: any) {
      // console.error("Delete error:", error);
      // toast.error(error?.response?.data?.message || "Failed to delete proposal");
    } finally {
      setIsDeleting(false);
    }
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
      setValue("keyword", savedSearch.keyword || []);
      setValue("proponent_name", savedSearch.proponent_name || []);
      setValue("category", savedSearch.category || []);
      setValue("sub_category", savedSearch.sub_category || []);
      setValue("year", savedSearch.year || []);
      setValue("status", savedSearch.status || []);
      setValue("index", savedSearch?.index || "");
      dispatch(
        setAllFilters({
          proponent_name: savedSearch.proponent_name || [],
          keyword: savedSearch.keyword || [],
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
      keyword: filters?.keyword || [],
      global_search: filters?.global_search,
      no_shareholder_proposal: filters?.no_shareholder_proposal,
      approved: filters?.approved,
      is_correct: filters?.is_correct,
      company_status: filters?.company_status,
      head_support: filters?.head_support,
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
            keyword: filters?.keyword || [],
            index: filters?.index || "",
            global_search: filters?.global_search,
          },
        })
      );
      // toast.success("Searched saved successfully");
    }
  };

  // Debounced keyword search function using Lodash (same as global search)
  const debouncedFetchKeywordSuggestions = useCallback(
    _.debounce(async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setKeywordDropdownOptions([]);
        setKeywordLoading(false);
        return;
      }

      setKeywordLoading(true);

      try {
        const dynamicURL = createDynamicURL(
          '/get_shareholder_dropdown_values/',
          null,
          { keyword: searchTerm },
          null
        );

        const response = await axiosInstance.get(dynamicURL);

        // Extract synonyms from the response
        const synonyms = response.data.synonyms || [];
        console.log('Received synonyms:', synonyms); // Debug log
        setKeywordDropdownOptions(synonyms); // Set strings directly, not objects
      } catch (error) {
        console.error('Error fetching keyword suggestions:', error);
        setKeywordDropdownOptions([]);
      } finally {
        setKeywordLoading(false);
      }
    }, 500), // 500ms debounce like global search
    []
  );

  const fetchKeywordSuggestions = (searchTerm: string) => {
    debouncedFetchKeywordSuggestions(searchTerm);
  };

  const sortData = (data: any) => {
    return [...data].sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }

      const isPercentageA = !!a.outcome_percentage?.match(/^(\d+(\.\d+)?)%$/);
      const isPercentageB = !!b.outcome_percentage?.match(/^(\d+(\.\d+)?)%$/);
      if (isPercentageA && !isPercentageB) {
        return -1;
      }
      if (!isPercentageA && isPercentageB) {
        return 1;
      }
      return 0;
    });
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

  const mergeVoteDetails = (data: any[]) => {
    return data.map((item) => {
      const result: any = {
        year: item.year,
        proponent: item.proponent_name,
        support: item.outcome_percentage,
        no_action_letters: item.nl_exist ? "Yes" : "",
      };
      if (item?.vote_details?.length > 0) {
        const mergedDetails = item.vote_details.reduce((acc, detail) => {
          let [key, value] = Object.entries(detail)[0];

          key = key.replace(/^\d+\.\s*/, "");

          acc[key] = value;
          return acc;
        }, {});

        Object.assign(result, mergedDetails);
      }
      return result;
    });
  };

  const clearNoActionFilter = () => {
    // setValue("is_correct", null);
    // setValue("company_status", null);
    // setValue("approved", null);

    const { is_correct, company_status, approved, ...restFilters } = filters;
    setFiltersLength(
      countIndividualFilters(
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
    } else if (
      removeKey === "head_support" ||
      removeKey === "nl_exist" ||
      removeKey === "ready_for_review" ||
      removeKey === "check_status" ||
      removeKey === "no_shareholder_proposal" ||
      removeKey === "approved" ||
      removeKey === "is_correct" ||
      removeKey === "company_status"
    ) {
      // For boolean filters, set to null
      updatedFilters[removeKey] = null;
    } else if (updatedFilters[removeKey]?.toString() === removeValue) {
      if (removeKey === "index") {
        updatedFilters[removeKey] = " ";
      } else {
        updatedFilters[removeKey] = "";
      }
    }

    setValue(removeKey, updatedFilters[removeKey]);
    dispatch(setAllFilters(updatedFilters));
  };

  const getDefaultTabIndex = () => {
    if (
      proposalCount > 0 &&
      proposalCount >= noActionCount &&
      proposalCount >= withdrawnCount
    )
      return 0;
    if (
      noActionCount > 0 &&
      noActionCount >= proposalCount &&
      noActionCount >= withdrawnCount
    )
      return 1;
    if (withdrawnCount > 0) return 2;
    return 0;
  };

  const defaultTabIndex = getDefaultTabIndex();

  const handleDownload = () => {
    let tabURL = "";
    let fileName = "";

    switch (tab) {
      case "proposal":
        tabURL = "/shareholder_proposal/def14a/";
        fileName = "shareholder_proposals.xlsx";
        break;
      case "no-action":
        tabURL = "/shareholder_proposal/no_action/";
        fileName = "no_action_letters.xlsx";
        break;
      case "withdrawn":
        tabURL = "/shareholder_proposal/withdrawn/";
        fileName = "withdrawn.xlsx";
        break;
    }

    // Convert year to proxy_season for proposal/no-action tabs, keep year for withdrawn
    const downloadFilters = tab === "withdrawn"
      ? {
        ...filters,
        ...(filters.proxy_season?.length > 0 && { year: filters.proxy_season, proxy_season: [] })
      }
      : {
        ...filters,
        ...(filters.year?.length > 0 && { proxy_season: filters.year, year: [] })
      };

    downloadFileFromAPI({
      url: createDynamicURL(`${baseURL}${tabURL}`, downloadFilters, undefined, page),
      fileName,
      setLoading: setLoadingDownload,
      serviceMethod: shareHolderProposalService.getAllShareholderAPIFile
    });
  };

  if (tableOnlyView) {
    return (
      <ProposalDetailsTableView
        loading={loading}
        loadingDownload={loadingDownload}
        shareHolderProposal={shareHolderProposal}
        isAllCompanySelected={isAllCompanySelected}
        user={user}
        companyGlobalSearchName={companyGlobalSearchName || filters?.global_search?.[0]}
        handleDownload={handleDownload}
        onVisibleDetail={onVisibleDetail}
        onEditProposalClickHandler={onEditProposalClickHandler}
        setProposalToDelete={setProposalToDelete}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        setTableOnlyView={setTableOnlyView}
        tableOnlyView
        page={page}
        totalPages={totalPages}
        handleNextPage={handleNextPage}
        handlePreviousPage={handlePreviousPage}
        handlePageChange={handlePageChange}
      />
    );
  }



  return (
    <>
      <div className="grid grid-cols-12 gap-y-10 gap-x-6">
        <div className="col-span-12">
          <div className="w-full sticky z-30 header-card transition-[margin,width,opacity] duration-1000 ease-in-out bg-white" style={{ top: '4rem', minHeight: '64px' }}>
            <div className="bg-white px-4 mb-4 flex flex-col md:flex-row items-center justify-between shadow">
              {isAllCompanySelected === true ? (
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  All Shareholder Proposals
                </h1>
              ) : (
                tab === "proposal" ? (
                  <h1 className="text-xl font-semibold flex items-center gap-2 my-2">
                    Shareholder Proposals
                  </h1>
                ) : tab === "no-action" ? (
                  <h1 className="text-xl font-semibold flex items-center gap-2 my-2">
                    No Action Letters
                  </h1>
                ) : tab === "withdrawn" ? (
                  <h1 className="text-xl font-semibold flex items-center gap-2 my-2">
                    Withdrawn Proposals
                  </h1>
                ) : null
              )}
              <div className="flex gap-3 px-4 py-4 dark:bg-darkmode-800">
                <button
                  className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${isAllCompanySelected === false
                    ? "bg-primary text-white shadow"
                    : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                    }`}
                  onClick={async (e) => {
                    try {
                      // Clear year filters and reset form when switching to company view
                      setValue("year", []);
                      resetFormValues();
                      dispatch(resetFilter());
                      setProposalsAnalytics(null);

                      dispatch(selectUnSelectAllCompany(false));
                      dispatch(
                        modifyRoute({
                          route: "shareholder-proposal",
                          type: true,
                        })
                      );
                    } catch (error) { }
                  }}
                >

                  {finhub?.name || companyGlobalSearchName} {" "}
                  {finhub?.ticker ? `(${finhub?.ticker})` : `(${companyGlobalSearchTicker})`}
                </button>
                <button
                  className={`px-5 py-2 rounded-t-lg font-semibold transition-all ${isAllCompanySelected === true
                    ? "bg-primary text-white shadow"
                    : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                    }`}
                  onClick={async (e) => {
                    try {
                      // Set default years (current year and previous year) when switching to View All
                      const currentYear = new Date().getFullYear();
                      const defaultYears = [(currentYear - 1).toString(), currentYear.toString()];

                      // Reset analytics state first
                      setProposalsAnalytics(null);

                      // Clear other filters and set default years
                      resetFormValues();
                      setValue("year", defaultYears);
                      dispatch(resetFilter());
                      dispatch(setAllFilters({ year: defaultYears }));

                      dispatch(selectUnSelectAllCompany(true));
                      dispatch(
                        modifyRoute({
                          route: "shareholder-proposal",
                          type: true,
                        })
                      );
                    } catch (error) { }
                  }}
                >
                  View for All Companies
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3.5 relative">
            <div className="flex flex-col box box--stacked bg-white p-5">
              <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row mb-4">

              </div>
              <div className="flex items-center bg-white mb-4">
                <div className="flex">
                  <MultiSearchBar
                    onSearch={handleSearch}
                    searchTerms={searchTerms}
                    setSearchTerms={setSearchTerms}
                    url={"/institute/?type=Proponent"}
                    getOptionKey="institution_name"
                    placeHolder="Search Proponent"
                    onSearchChange={resetPage}
                    isSingle={true}
                    searchPoponents={true}
                    fieldLabel="Proponent"
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
                          className="text-slate-500 cursor-pointer"
                        />
                      </Tippy>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center mb-7">
                  {/* {user?.saved_search?.["Shareholder Proposal"] !==
                    undefined && (
                      <div className="hover:bg-slate-50 ">
                        <Button onClick={getSavedSearches}>
                          Previous Search
                        </Button>
                      </div>
                    )} */}
                  {/* Clear and Apply buttons outside filter */}
                  {/* {tab == "proposal" && proposalCount > 0 && (
                    <div>
                      <FormSwitch>
                        <label className="text-md mr-3 font-semibold">
                          Analytics{" "}
                        </label>
                        <FormSwitch.Input
                          id="view-analysis-switch"
                          type="checkbox"
                          checked={isViewAnalysis}
                          onChange={(e) => setIsViewAnalysis(e.target.checked)}
                        />
                        <FormSwitch.Label htmlFor="view-analysis-switch"></FormSwitch.Label>
                      </FormSwitch>
                    </div>
                  )}
                  {tab == "no-action" && noActionCount > 0 && (
                    <div className="mt-2">
                      <FormSwitch className="mb-6">
                        <label className="text-md mr-3 font-semibold">
                          Analytics
                        </label>
                        <FormSwitch.Input
                          id="view-analysis-switch"
                          type="checkbox"
                          checked={isViewAnalysis}
                          onChange={(e) => setIsViewAnalysis(e.target.checked)}
                        />
                        <FormSwitch.Label htmlFor="view-analysis-switch"></FormSwitch.Label>
                      </FormSwitch>
                    </div>
                  )} */}
                  {tab !== "withdrawn" && (
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
                <FilterChips
                  filters={selectedChipFilters.map(chip => ({
                    key: chip.key,
                    value: chip.value
                  }))}
                  onRemove={handleRemoveChip}
                  showProxyYear={true}
                  currentPage="shareHolder"
                />
              )}

              {isFilterCollapse && (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
                    {/* Filter Content */}
                    <div className="mb-6 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline-secondary"
                          onClick={() => {
                            onFilterClear();
                          }}
                          className="w-full sm:w-auto flex items-center gap-2"
                          type="button"
                        >
                          <MdOutlineClear className="text-lg mr-1" /> Clear
                        </Button>

                        <Button
                          variant="primary"
                          onClick={handleSubmit(onSubmit)}
                          className="w-full sm:w-auto flex items-center gap-2"
                        >
                          <FaSearch className="text-lg" /> Apply
                        </Button>
                      </div>
                    </div>
                    <div
                      className={clsx([
                        "grid grid-cols-1 xs:grid-cols-1 gap-4 mb-3 md:grid-cols-4",
                      ])}
                    >
                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaCalendarAlt className="text-gray-400" /> {tab === "withdrawn" ? null : "Proxy "}Year
                          </span>
                          {apiDropdownOptions?.year?.length > 0 && (
                            <div>
                              <FormCheck className="mr-2">
                                <FormCheck.Label>Select All</FormCheck.Label>
                                <FormCheck.Input
                                  className="ml-1"
                                  id="year"
                                  checked={
                                    apiDropdownOptions.year.length ===
                                    watch(tab === "withdrawn" ? "year" : "proxy_season")?.length
                                  }
                                  type="checkbox"
                                  onChange={(e) => {
                                    setValue(
                                      tab === "withdrawn" ? "year" : "proxy_season",
                                      e.target.checked
                                        ? apiDropdownOptions.year.map((item: any) => item.value || item)
                                        : []
                                    );
                                  }}
                                />
                              </FormCheck>
                            </div>
                          )}
                        </div>
                        <Controller
                          name={"proxy_season"}
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={apiDropdownOptions.year?.map(String) || []}
                              placeholder={`Select ${tab === "withdrawn" ? "" : "Proxy"} Year`}
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                // Always convert to string
                                const selectedValues = selectedOptions.map((option) => String(option.value));
                                field.onChange(selectedValues);
                              }}
                              selectedOption={field.value || []}
                            />
                          )}
                        />
                      </div>

                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaTags className="text-gray-400" /> Category
                          </span>
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
                                        ? apiDropdownOptions.category.map((item: any) => item.value || item)
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
                            <MultiSelectDropdown
                              data={apiDropdownOptions?.category}
                              placeholder="Select Category"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                                getSubCategoryDropdown(selectedValues);



                              }}
                              selectedOption={field.value || []}

                            />


                            // <TomSelect
                            //   value={field.value || []}
                            //   // onChange={field.onChange}
                            //   onChange={(value) => {
                            //     field.onChange(value);
                            //     getSubCategoryDropdown(value?.target?.value);
                            //   }}
                            //   options={{ placeholder: "Select Category" }}
                            //   className="w-full"
                            //   multiple
                            // >
                            //   {getDropdownLoader ? (
                            //     <option disabled>Loading...</option>
                            //   ) : (
                            //     apiDropdownOptions.category?.map((cat) => (
                            //       <option key={cat} value={cat}>
                            //         {cat}
                            //       </option>
                            //     ))
                            //   )}
                            // </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaListUl className="text-gray-400" /> Sub Category
                          </span>
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
                                        ? apiSubCategoryDropdown.sub_category.map((item: any) => item.value || item)
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
                            <MultiSelectDropdown
                              data={apiSubCategoryDropdown.sub_category}
                              placeholder="Select Sub Category"
                              loading={getDropdownLoader}
                              onChange={(selectedOptions) => {
                                const selectedValues = selectedOptions.map((option) => option.value);
                                field.onChange(selectedValues);
                              }
                              }
                              selectedOption={field.value || []}
                            />

                            // <TomSelect
                            //   value={field.value || []}
                            //   onChange={field.onChange}
                            //   options={{ placeholder: "Select Sub Category" }}
                            //   className="w-full"
                            //   multiple
                            // >
                            //   {getDropdownLoader ? (
                            //     <option disabled>Loading...</option>
                            //   ) : (
                            //     apiSubCategoryDropdown.sub_category?.map(
                            //       (subCat: any) => (
                            //         <option key={subCat} value={subCat}>
                            //           {subCat}
                            //         </option>
                            //       )
                            //     )
                            //   )}
                            // </TomSelect>
                          )}
                        />
                      </div>

                      <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaTags className="text-gray-400" /> Proposal Screen (e.g. anti-DEI)
                          </span>
                        </div>
                        <Controller
                          name="anti_category"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <MultiSelectDropdown
                              data={["DEI", "China", "Human Rights", "Climate"]}
                              placeholder="Select Proposal Screen"
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

                      {/* <div className="w-full">
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaCheckCircle className="text-gray-400" /> Status
                          </span>
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
                                        ? apiDropdownOptions.status.map((item: any) => item.value || item)
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
                        <div className="text-left text-slate-500 flex justify-between mb-1">
                          <span className="flex items-center gap-2 text-slate-600 font-semibold">
                            <FaTags className="text-gray-400" /> Keyword
                          </span>
                          {keywordDropdownOptions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentField = control._getWatch("keyword") || [];
                                const allKeywords = [...new Set([...currentField, ...keywordDropdownOptions])];
                                control._formState.defaultValues = {
                                  ...control._formState.defaultValues,
                                  keyword: allKeywords
                                };
                                control._reset(control._formState.defaultValues);
                              }}
                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                        <Controller
                          name="keyword"
                          control={control}
                          defaultValue={[]}
                          render={({ field }) => (
                            <CreatableInputSelect
                              placeholder="Type and press Enter to add keywords"
                              value={field.value || []}
                              onChange={(values: string[]) => {
                                field.onChange(values);
                              }}
                              onInputChange={(inputValue: string) => {
                                fetchKeywordSuggestions(inputValue);
                              }}
                              options={keywordDropdownOptions}
                              loading={keywordLoading}
                            />
                          )}
                        />
                      </div>

                      {isAllCompanySelected && (
                        <div className="w-full">
                          <div className="text-left text-slate-500 flex justify-between mb-1">
                            <span className="flex items-center gap-2 text-slate-600 font-semibold">
                              <FaBuilding className="text-gray-400" /> Companies
                            </span>
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
                                isHideCurrentCompany={true}
                                currentCompany={finhub?.name || companyGlobalSearchName}
                              />
                            )}
                          />
                        </div>
                      )}

                      {isAllCompanySelected && ((tab === "proposal" || tab === "no-action") && (
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
                                data={apiDropdownOptions?.index?.map((item: any) => item)}
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
                      ))}
                      {tab === "proposal" && (
                        <div className="me-2">
                          <div className="text-left text-slate-500 flex justify-between mb-1">
                            <span className="flex items-center gap-2 text-slate-600 font-semibold">
                              <FaCalendarAlt className="text-gray-400" /> Shareholder Meeting Held
                            </span>
                          </div>

                          <div className="mt-3">
                            <Controller
                              name="outcome_percentage"
                              control={control}
                              defaultValue=""
                              render={({ field }) => (
                                <FormCheck>
                                  <FormCheck.Input
                                    id="radio-switch-1"
                                    type="radio"
                                    value="yes"
                                    checked={
                                      field.value ===
                                      "yes"
                                    }
                                    onChange={(e) =>
                                      field.onChange(e.target.value)
                                    }
                                  />
                                  <FormCheck.Label htmlFor="radio-switch-1">
                                    Yes
                                  </FormCheck.Label>
                                  <FormCheck.Input
                                    id="radio-switch-2"
                                    type="radio"
                                    value="no"
                                    className="d-inline-block ms-4"
                                    checked={
                                      field.value === "no"
                                    }
                                    onChange={(e) =>
                                      field.onChange(e.target.value)
                                    }
                                  />
                                  <FormCheck.Label htmlFor="radio-switch-2">
                                    No
                                  </FormCheck.Label>
                                </FormCheck>
                              )}
                            />
                          </div>
                        </div>
                      )}
                      {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
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
                              {/* 
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
                            */}

                              {/* 
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
                            */}

                              {/* 
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
                            */}

                              <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-8 sm:gap-16">
                                <div className="w-full flex-1">
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

                                <div className="w-full flex-1">
                                  <div className="text-left text-slate-500 font-semibold">
                                    Approved
                                  </div>
                                  <Controller
                                    name="approved"
                                    control={control}
                                    defaultValue={null}
                                    render={({ field }) => (
                                      <div className="flex flex-row mt-[10px]">
                                        <FormCheck className="flex items-center mr-2">
                                          <FormCheck.Input
                                            id="checkbox-approved-true"
                                            type="checkbox"
                                            checked={field.value === true}
                                            onChange={
                                              () =>
                                                field.onChange(
                                                  field.value === true
                                                    ? null
                                                    : true
                                                )
                                            }
                                          />
                                          <FormCheck.Label
                                            htmlFor="checkbox-approved-true"
                                            className="ml-2 text-left"
                                          >
                                            True
                                          </FormCheck.Label>
                                        </FormCheck>
                                        <FormCheck className="flex items-center mr-2">
                                          <FormCheck.Input
                                            id="checkbox-approved-false"
                                            type="checkbox"
                                            checked={field.value === false}
                                            onChange={
                                              () =>
                                                field.onChange(
                                                  field.value === false
                                                    ? null
                                                    : false
                                                )
                                            }
                                          />
                                          <FormCheck.Label
                                            htmlFor="checkbox-approved-false"
                                            className="ml-2 text-left"
                                          >
                                            False
                                          </FormCheck.Label>
                                        </FormCheck>
                                      </div>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* 
                            <div className="w-full">
                              <div className="text-left text-slate-500 font-semibold">
                                Head Support
                              </div>
                              <Controller
                                name="head_support"
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
                            */}
                            </>
                          )}

                          {tab === "no-action" && (
                            <>
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

              <div className="overflow-auto xl:overflow-visible">
                <Tab.Group
                  selectedIndex={getSelectedTabIndex()}
                  defaultIndex={defaultTabIndex}
                >
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
                          All Proposals
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
                          setIsViewAnalysis(true);
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
                      {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
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
                      {isViewAnalysis && (
                        <div className="w-full pt-5">
                          <div className="flex gap-4 mb-6">
                            <button
                              className={`px-5 py-2 rounded font-medium transition-all ${activeTab === "shareholders"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("shareholders")}
                            >
                              Analytics
                            </button>
                            <button
                              className={`px-5 py-2 rounded font-medium transition-all ${activeTab === "proponents"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("proponents")}
                            >
                              Proponent Analytics
                            </button>
                          </div>

                          {/* Content */}
                          <div>
                            {loadingAnalytics ? (
                              <div className="p-5 mt-3.5 space-y-8">
                                {activeTab === "shareholders" ? (
                                  <>
                                    {/* Shareholder Analytics Skeleton */}
                                    <div className={`grid grid-cols-1 ${tab !== "proposal" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
                                      <SkeletonChart type="bar" className="h-[350px]" />
                                      <SkeletonChart type="pie" className="h-[350px]" />
                                      {tab !== "proposal" && <SkeletonChart type="pie" className="h-[350px]" />}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                      {[1, 2, 3, 4].map((idx) => (
                                        <div key={idx} className="rounded-2xl shadow-lg bg-white p-4 border border-gray-100">
                                          <SkeletonText lines={1} className="mb-4 w-32" />
                                          <SkeletonTable rows={2} columns={2} />
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Proponent Analytics Skeleton */}
                                    <div className="space-y-6">
                                      <SkeletonText lines={1} className="w-1/4" />
                                      <div className="grid grid-cols-12 gap-6">
                                        <div className="col-span-12 lg:col-span-8">
                                          <SkeletonTable rows={10} columns={6} className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100" />
                                        </div>
                                        <div className="col-span-12 lg:col-span-4">
                                          <SkeletonChart type="pie" className="h-[400px]" />
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : !isAnalyticsDataAvailable() ? (
                              <div className="flex flex-col items-center justify-center py-12">
                                <Lucide
                                  icon="BarChart3"
                                  className="w-12 h-12 text-gray-300 mb-2"
                                />
                                <div className="text-lg font-medium">No Analytics found</div>
                              </div>
                            ) : activeTab === "shareholders" ? (
                              <ShareHolderProposalAnalyticsComponent
                                proposalCounts={proposalsAnalytics?.total_proposals}
                                topSubcategories={proposalsAnalytics?.topSubcategories}
                                topCategories={proposalsAnalytics?.topCategories}
                                yearlySummary={proposalsAnalytics?.yearlySummary}
                                tab={tab}
                                isAllCompanySelected={isAllCompanySelected}
                                loading={loadingAnalytics}
                              />
                            ) : (
                              <ProponentsAnalyticsComponent
                                topProponents={proposalsAnalytics?.topProponents}
                                handleSearch={handleSearch}
                                setSearchTerms={setSearchTerms}
                                tab={tab}
                                loading={loadingAnalytics}
                                pieChartOutcome={proposalsAnalytics?.pieChartOutcome}
                                filters={filters}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      <ProposalDetailsTableView
                        loading={loading}
                        loadingDownload={loadingDownload}
                        shareHolderProposal={shareHolderProposal}
                        isAllCompanySelected={isAllCompanySelected}
                        user={user}
                        companyGlobalSearchName={companyGlobalSearchName || filters?.global_search?.[0]}
                        handleDownload={handleDownload}
                        onVisibleDetail={onVisibleDetail}
                        onEditProposalClickHandler={onEditProposalClickHandler}
                        setProposalToDelete={setProposalToDelete}
                        setIsDeleteModalOpen={setIsDeleteModalOpen}
                        setTableOnlyView={setTableOnlyView}
                        page={page}
                        totalPages={totalPages}
                        handleNextPage={handleNextPage}
                        handlePreviousPage={handlePreviousPage}
                        handlePageChange={handlePageChange}
                      />
                    </Tab.Panel>
                  </Tab.Panels>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
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
                      {isViewAnalysis && (
                        <div className="w-full pt-5">
                          <div className="flex gap-4 mb-6">
                            <button
                              className={`px-5 py-2 rounded font-medium transition-all ${activeTab === "shareholders"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("shareholders")}
                            >
                              Analytics
                            </button>
                            <button
                              className={`px-5 py-2 rounded font-medium transition-all ${activeTab === "proponents"
                                ? "bg-primary text-white shadow"
                                : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                }`}
                              onClick={() => setActiveTab("proponents")}
                            >
                              Proponent Analytics
                            </button>
                          </div>

                          {/* Content */}
                          <div>
                            {loading ? (
                              <div className="p-5 mt-3.5 space-y-8">
                                {/* Top Charts Skeleton */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <SkeletonChart type="bar" className="h-[350px]" />
                                  <SkeletonChart type="pie" className="h-[350px]" />
                                  <SkeletonChart type="pie" className="h-[350px]" />
                                </div>

                                {/* Bottom Tables Skeleton */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                  {[1, 2, 3, 4].map((idx) => (
                                    <div key={idx} className="rounded-2xl shadow-lg bg-white p-4 border border-gray-100">
                                      <SkeletonText lines={1} className="mb-4 w-32" />
                                      <SkeletonTable rows={2} columns={2} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : !isAnalyticsDataAvailable() ? (
                              <div className="flex flex-col items-center justify-center py-12">
                                <Lucide
                                  icon="BarChart3"
                                  className="w-12 h-12 text-gray-300 mb-2"
                                />
                                <div className="text-lg font-medium">No Analytics found</div>
                              </div>
                            ) : activeTab === "shareholders" ? (
                              <ShareHolderProposalAnalyticsComponent
                                proposalCounts={proposalCounts}
                                topSubcategories={topSubcategories}
                                topCategories={topCategories}
                                yearlySummary={yearlySummary}
                                tab={tab}
                                pieChartOutcome={pieChartOutcome}
                                  isAllCompanySelected={isAllCompanySelected}
                                loading={loading}
                              />
                            ) : (
                              <ProponentsAnalyticsComponent
                                topProponents={topProponents}
                                handleSearch={handleSearch}
                                setSearchTerms={setSearchTerms}
                                tab={tab}
                                loading={loading}
                                pieChartOutcome={pieChartOutcome}
                                filters={filters}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      <ProposalDetailsTableView
                        loading={loading}
                        loadingDownload={loadingDownload}
                        shareHolderProposal={shareHolderProposal}
                        isAllCompanySelected={isAllCompanySelected}
                        user={user}
                        companyGlobalSearchName={companyGlobalSearchName || filters?.global_search?.[0]}
                        handleDownload={handleDownload}
                        onVisibleDetail={onVisibleDetail}
                        onEditProposalClickHandler={onEditProposalClickHandler}
                        setProposalToDelete={setProposalToDelete}
                        setIsDeleteModalOpen={setIsDeleteModalOpen}
                        setTableOnlyView={setTableOnlyView}
                        page={page}
                        totalPages={totalPages}
                        handleNextPage={handleNextPage}
                        handlePreviousPage={handlePreviousPage}
                        handlePageChange={handlePageChange}
                      />
                    </Tab.Panel>
                  </Tab.Panels>

                  <Tab.Panels className="mt-5">
                    <Tab.Panel className="leading-relaxed">
                      {(user?.user_type === "Analyst" || user?.user_type === "Admin") && (
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
                      <ProposalDetailsTableView
                        loading={loading}
                        loadingDownload={loadingDownload}
                        shareHolderProposal={shareHolderProposal}
                        isAllCompanySelected={isAllCompanySelected}
                        user={user}
                        companyGlobalSearchName={companyGlobalSearchName || filters?.global_search?.[0]}
                        handleDownload={handleDownload}
                        onVisibleDetail={onVisibleDetail}
                        onEditProposalClickHandler={onEditProposalClickHandler}
                        setProposalToDelete={setProposalToDelete}
                        setIsDeleteModalOpen={setIsDeleteModalOpen}
                        setTableOnlyView={setTableOnlyView}
                      />
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
                  >
                    *
                  </sup>
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

          {isDeleteModalOpen && (
            <Dialog
              size="md"
              open={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false);
              }}
            >
              <Dialog.Panel className="p-0 text-center">
                <div className="p-5 text-center">
                  <Lucide
                    icon="XCircle"
                    className="w-16 h-16 mx-auto mt-3 text-danger"
                  />
                  <div className="mt-5 text-3xl">Are you sure?</div>
                  <div className="mt-2 text-slate-500">
                    Do you really want to delete this proposal? <br />
                    This action cannot be undone.
                  </div>
                </div>
                <div className="px-5 pb-8 text-center">
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                    }}
                    className="w-24 mr-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="w-24"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
}

export default ShareHolderProposal;
