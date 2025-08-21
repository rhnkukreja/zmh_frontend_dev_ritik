import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
  convertToTitleCase,
  countValidFilters,
  createDynamicURL,
  generateFilterChips,
  downloadFileFromAPI,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  fetchNpxProxyDashboard,
  resetPage,
  setPage,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";
import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import {
  FormInput,
} from "@/components/Base/Form";
import { dashboardService } from "@/services/dashboard";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import { toast } from "react-toastify";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import CompanySelect from "@/components/ReactSelectAsync";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "@/components/Base/LoadingIcon";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import CreatableInputSelect from "@/components/Base/CreatableInputSelect";
import Pill from "@/components/Pill";
import { FaSearch, FaTimes, FaBuilding, FaUniversity, FaCalendarAlt, FaCheckCircle, FaLayerGroup, FaTags, FaUserTie, FaHandshake, FaListUl, FaGlobe } from "react-icons/fa";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { MdOutlineClear } from "react-icons/md";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import Litepicker from "@/components/Base/Litepicker";
import React, { useCallback } from "react";

const index = () => {

  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const { npxProxyDetails, npxProxyLoading, tempSearch, page, totalNPXCount } =
    useAppSelector((state) => state.dashboard);
  const totalPages = Math.ceil(totalNPXCount / 10);
  const [searchParams] = useSearchParams();

  const {
    companyGlobalSearchName,
    companyGlobalSearchTicker,
    isCompanySelected,
  } = useAppSelector((state: RootState) => state.authentiction);

  const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  const searchTicker = searchParams.get("ticker");

  const [filter, setFilter] = useState("");
  const [allApplyFilter, setallApplyFilter] = useState<any>({});
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
  const [dropdownValues, setDropdownValues] = useState<any>({
    institution_name: [],
    fund_name: [],
  });

  const [getDynamicDropdownLoader, setGetDynamicDropdownLoader] =
    useState<boolean>(false);
  const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] =
    useState<boolean>(false);
  const [showFundName, setShowFundName] = useState<boolean>(false);
  const [apiFundNameDropdown, setApiFundNameDropdown] = useState<any>({
    fund_name: [],
  });
  const [meetingDate, setMeetingDate] = useState('');
  const [apiDependentDropdownOptions, setApiDependentDropdownOptions] =
    useState<any>({
      proposal: [],
      vote: [],
      vote_category: [],
    });


  const getFundNameDependentDropdown = async (value: any) => {
    if (value !== "") {
      const paramFilter = {
        global_search: companyGlobalSearchName,
        institution_name: [value],
      };
      try {
        setGetFundNameDropdownLoader(true);
        const res = await dashboardService.getDynamicNPXDropdownValues(
          paramFilter
        );
        if (res.result) {
          setMeetingDate(res.result?.meeting_date);
          setShowFundName(res.result?.is_institution);
          setApiFundNameDropdown({ ...res.result });
        }
      } catch (error) {
        return error;
      } finally {
        setGetFundNameDropdownLoader(false);
      }
    }
  };

  const getMeetingDateAPI = async () => {
    const paramFilter = {
      global_search: companyGlobalSearchName,
    };
    try {
      const res = await dashboardService.getDynamicNPXDropdownValues(paramFilter);
      if (res.result) {
        setMeetingDate(res.result?.meeting_date);
      }
    } catch (error) {
      return error;
    } finally {
    }
  };

  useEffect(() => {
    setMeetingDate('');
    getMeetingDateAPI();
  }, [companyGlobalSearchName])


  const getDependentDropdown = async () => {
    const paramFilter = {
      global_search: companyGlobalSearchName,
      institution_name:
        dropdownValues?.institution_name !== ""
          ? [dropdownValues?.institution_name]
          : [],
      fund_name: dropdownValues?.fund_name,
    };

    try {
      setGetDynamicDropdownLoader(true);
      const res = await dashboardService.getDynamicNPXDropdownValues(
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

  const handleDropdownChange = (key: string, value: any) => {
    setDropdownValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    getDependentDropdown();
  }, [dropdownValues]);

  useEffect(() => {
    if (allApplyFilter) {
      if (isCompanySelected) {
        reset();
        setShowFundName(false);
        dispatch(
          fetchNpxProxyDashboard(
            createDynamicURL(
              `${baseURL}/npx/detail/`,
              undefined,
              undefined,
              page
            )
          )
        );
        dispatch(setIsCompanySelected(false));
      } else {
        dispatch(
          fetchNpxProxyDashboard(
            createDynamicURL(
              `${baseURL}/npx/detail/`,
              allApplyFilter,
              undefined,
              page
            )
          )
        );
      }
      dispatch(setTempSearch(companyGlobalSearchName));
    }
  }, [companyGlobalSearchTicker, searchTicker, filter, allApplyFilter, page]);

  const isObject = (item: any) => {
    if (typeof item === "object") {
      return true;
    } else {
      false;
    }
  };

  const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(true);
  const [filtersLength, setFiltersLength] = useState<number>(0);

  const handleCollapseFilter = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsFilterCollapse(!isFilterCollapse);
  };

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    defaultValues: {
      institution_name: "Select",
      fund_name: [],
      proposal: [],
      vote: [],
      vote_category: [],
      meeting_date: ''
    },
  });

  const handleRemoveChip = (removeKey: any, removeValue: any) => {
    const updatedFilters = { ...allApplyFilter };

    if (Array.isArray(updatedFilters[removeKey])) {
      updatedFilters[removeKey] = updatedFilters[removeKey].filter(
        (item) => item !== removeValue
      );
    } else if (updatedFilters[removeKey] === removeValue) {
      updatedFilters[removeKey] = "";
    }

    // Create filter object for chips (exclude global_search)
    const filterObjForChips = {
      institution_name: updatedFilters.institution_name,
      fund_name: updatedFilters.fund_name,
      proposal: updatedFilters.proposal,
      vote: updatedFilters.vote,
      vote_category: updatedFilters.vote_category,
      keyword: updatedFilters.keyword,
    };

    setallApplyFilter(updatedFilters);
    setSelectedChipFilters(generateFilterChips(filterObjForChips));
    setFiltersLength(countValidFilters(filterObjForChips));
  };

  const onSubmit = async (npxFilter: any) => {
    if (npxFilter?.institution_name === "Select") {
      toast.warning("Please select Institution");
      return;
    }

    const filterObj = {
      global_search: companyGlobalSearchName,
      institution_name:
        "Select" === npxFilter?.institution_name?.label
          ? ""
          : [npxFilter?.institution_name?.label],
      fund_name: "Select" === npxFilter?.fund_name ? "" : npxFilter?.fund_name,
      proposal: "Select" === npxFilter?.proposal ? "" : npxFilter?.proposal,
      vote: "Select" === npxFilter?.vote ? "" : npxFilter?.vote,
      vote_category:
        "Select" === npxFilter?.vote_category ? "" : npxFilter?.vote_category,
      keyword: npxFilter?.keyword,
    };

    // Create filter object for chips (exclude global_search)
    const filterObjForChips = {
      institution_name: filterObj.institution_name,
      fund_name: filterObj.fund_name,
      proposal: filterObj.proposal,
      vote: filterObj.vote,
      vote_category: filterObj.vote_category,
      keyword: filterObj.keyword,
    };

    setallApplyFilter(filterObj);
    setSelectedChipFilters(generateFilterChips(filterObjForChips));
    setFiltersLength(countValidFilters(filterObjForChips));
    dispatch(resetPage());
    setIsFilterCollapse(false);
  };

  const onFilterClear = () => {
    setSelectedChipFilters([]);
    setFiltersLength(0);
    setShowFundName(false);
    resetFormValues();
    setallApplyFilter({});
    dispatch(resetPage());
    dispatch(
      fetchNpxProxyDashboard(
        createDynamicURL(`${baseURL}/npx/detail/`, undefined, undefined, page)
      )
    );
  };

  const resetFormValues: any = () => {
    // setApiDropdownOptions({ institution: [] });
    // setApiDependentDropdownOptions({ fund_name: [], proposal: [], vote: [] });
    setValue("institution_name", "Select");
    setValue("fund_name", []);
    setValue("proposal", []);
    setValue("vote", []);
    setValue("vote_category", []);
    setValue("keyword", "");
  };

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

  return (
    <>
      {/* {npxProxyDetails?.npx_report?.length === 0 &&
        !npxProxyLoading &&
        location.pathname !== "/" && ( */}
      <Button
        onClick={() => {
          navigate("/");
        }}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-1"
      >
        <ChevronLeft
          className="group-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        Back
      </Button>
      {/* )} */}

      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5  sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold flex items-center gap-2">
                N-PX Voting 2024
              </h1>
              {
                meetingDate &&
                <p className=" italic"> Meeting Date: {meetingDate} </p>
              }
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            {npxProxyDetails?.length > 0 && (
              <h2 className="flex items-end font-semibold justify-end text-[13px] md:ml-auto mx-5">
                Count: {totalNPXCount.toLocaleString()}
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
            {/* Filter Content */}
            <div className="flex justify-between items-center mb-6">
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
            {/* Filter Toggle and Advanced Filters Button */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* First row: Institution, Fund, Category */}
              <div className="grid gap-6 md:grid-cols-3 grid-cols-1">
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
                      <CompanySelect
                        isInstitution={true}
                        companyGlobalSearchName={companyGlobalSearchName}
                        value={field.value}
                        onChange={(value: any) => {
                          field.onChange(value);
                          handleDropdownChange(
                            "institution_name",
                            value?.label
                          );
                          getFundNameDependentDropdown(value?.label);
                        }}
                      />
                    )}
                  />
                </div>

                {/* Fund */}
                {showFundName && (
                  <div>
                    <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                      <FaBuilding className="text-gray-400" /> Fund
                    </label>
                    <Controller
                      name="fund_name"
                      control={control}
                      defaultValue={[]}
                      render={({ field }) => (
                        <TomSelect
                          value={field.value || []}
                          onChange={(value) => {
                            handleDropdownChange(
                              "fund_name",
                              value?.target?.value
                            );
                            field.onChange(value);
                          }}
                          options={{ placeholder: "Select Fund" }}
                          className="w-full"
                          multiple
                        >
                          {getFundNameDropdownLoader ? (
                            <option disabled>Loading...</option>
                          ) : (
                            apiFundNameDropdown?.fund_name?.map((fund: any) => (
                              <option key={fund} value={fund}>
                                {fund}
                              </option>
                            ))
                          )}
                        </TomSelect>
                      )}
                    />
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaTags className="text-gray-400" /> Category
                  </label>
                  <Controller
                    name="vote_category"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        options={{ placeholder: "Select Vote Category" }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.vote_category?.map(
                            (vote_category: any) => (
                              <option key={vote_category} value={vote_category}>
                                {convertToTitleCase(vote_category)}
                              </option>
                            )
                          )
                        )}
                      </TomSelect>
                    )}
                  />
                </div>
              </div>

              {/* Second row: Proposal, Vote, Keyword */}
              <div className="grid gap-6 md:grid-cols-3 grid-cols-1 mt-6">
                {/* Proposal */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaListUl className="text-gray-400" /> Proposal
                  </label>
                  <Controller
                    name="proposal"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        options={{ placeholder: "Select Proposal" }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.proposal?.map(
                            (proposal: any) => (
                              <option key={proposal} value={proposal}>
                                {proposal}
                              </option>
                            )
                          )
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

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
                      <TomSelect
                        value={field.value || []}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        options={{ placeholder: "Select Vote" }}
                        className="w-full"
                        multiple
                      >
                        {getDynamicDropdownLoader ? (
                          <option disabled>Loading...</option>
                        ) : (
                          apiDependentDropdownOptions?.vote?.map(
                            (vote: any) => (
                              <option key={vote} value={vote}>
                                {convertToTitleCase(vote)}
                              </option>
                            )
                          )
                        )}
                      </TomSelect>
                    )}
                  />
                </div>

                {/* Keyword */}
                <div>
                  <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                    <FaSearch className="text-gray-400" /> Keyword
                  </label>
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
            </form>
          </div>
        )}

        {/* TABLE SECTION (with skeleton loader, sticky headers, zebra striping, pill badges, tooltips, and empty state) */}
        {npxProxyDetails?.length > 0 ? (
          <TableWrapper isLoading={allApplyFilter && npxProxyLoading}>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
              <Table>
                <Table.Thead>
                  <Table.Tr className="bg-primary text-white text-sm">
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "30%" }}>Proposal</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "17.5%" }}>Category</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "17.5%" }}>Vote</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "17.5%" }}>Shares Voted</Table.Td>
                    <Table.Td className="border-b dark:border-darkmode-300 px-4 py-2 font-semibold" style={{ width: "17.5%" }}>Fund Name</Table.Td>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {npxProxyLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <Table.Tr key={i} className="animate-pulse">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Table.Td key={j}><Skeleton height={24} /></Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : npxProxyDetails?.length > 0 ? (
                    (() => {
                      let toggle = false;
                      return npxProxyDetails.map((noAction: any, index: number) => {
                        toggle = !toggle;
                        return (
                          <Table.Tr
                            key={noAction?.id}
                            className={clsx(
                              "[&_td]:last:border-b-0 transition-all hover:bg-primary/5 cursor-pointer",
                              toggle ? "bg-white" : "bg-gray-50"
                            )}
                          >
                            <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                              {noAction?.vote_description}
                            </Table.Td>
                            <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                              {convertToTitleCase(noAction?.vote_category)}
                            </Table.Td>
                            <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                              {convertToTitleCase(noAction?.vote)}
                            </Table.Td>
                            <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                              {noAction?.shares_voted
                                ?.split(" ")
                                .map((num: string) =>
                                  new Intl.NumberFormat("en-US").format(
                                    Math.floor(Number(num))
                                  )
                                )
                                .join(" ")}
                            </Table.Td>
                            <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 border-dashed">
                              {noAction?.fund_name}
                            </Table.Td>
                          </Table.Tr>
                        );
                      });
                    })()
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={5} className="text-center py-10 text-gray-400 text-lg font-semibold">
                        <FaCheckCircle className="mx-auto mb-2 text-4xl text-primary/60" />
                        No NPX records available. Try adjusting your filters!
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        ) : (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <div className="text-center text-gray-400 text-lg font-semibold">
              <FaCheckCircle className="mx-auto mb-2 text-4xl text-primary/60" />
              Select an institution to get started.
            </div>
          </div>
        )}

        {npxProxyDetails?.length > 0 && (
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

export default index;
