import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
    cleanObject,
    countValidFilters,
    createDynamicURL,
    generateFilterChips,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { baseURL } from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";
import { Controller, useForm } from "react-hook-form";
import {
    FormInput,
} from "@/components/Base/Form";
import TomSelect from "@/components/Base/TomSelect";
import CPagination from "@/components/Pagination";
import CompanySelect from "@/components/ReactSelectAsync";
import { setTempSearch } from "@/stores/dashboardSlice";
import FilterChips from "@/components/FilterChips";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { fetchRealTimes, resetPage, setPage } from "@/stores/realTimeDataSlice";
import { realTimeService } from "@/services/realTimeData";
import Litepicker from "@/components/Base/Litepicker";

const index = () => {
    const dispatch: AppDispatch = useAppDispatch();
    const { realTimeData, loading, page, totalPages, count } =
        useAppSelector((state) => state.realTime);

    const {
        companyGlobalSearchName,
        companyGlobalSearchTicker,
    } = useAppSelector((state: RootState) => state.authentiction);

    const [searchParams] = useSearchParams();
    const searchTicker = searchParams.get("ticker");
    const [allApplyFilter, setallApplyFilter] = useState<any>("");
    const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
    const [getDropdownLoader, setGetDropdownLoader] =
        useState<boolean>(false);
   
    const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(true);
    const [filtersLength, setFiltersLength] = useState<number>(0);
    const [dropdownValues, setDropdownValues] = useState<any>({
        index: [],
    });
    const [dropdownInstitutionValues, setDropdownInstitutionValues] = useState<any>({
        instututes: [],
    });

    const [dropdownVotesValues, setDropdownVotesValues] = useState<any>({
        votes: [],
    });

    const [companyName , setCompanyName] = useState<any>('');

    useEffect(() => {
        getRealTimeDropdownData({year: 2025});
        getInstitutionDropdownData({year: 2025});
        getVotesDropdownData({year: 2025});
        onSubmit({});
    }, [])


    useEffect(() => {
        const fetchData = async () => {
            if (allApplyFilter) {
                const {year, ...restFilter} = allApplyFilter;
                await dispatch(
                    fetchRealTimes(
                        createDynamicURL(
                            `${baseURL}/vds/`,
                            allApplyFilter,
                            undefined,
                            page
                        )
                    )
                );

                setFiltersLength(countValidFilters(restFilter));
                setSelectedChipFilters(generateFilterChips(restFilter));
                dispatch(setTempSearch(companyGlobalSearchName));
            }
        };

        fetchData();
    }, [companyGlobalSearchTicker, searchTicker, allApplyFilter, page]);

    const {
        handleSubmit,
        control,
        reset,
        formState: { errors },
        setValue,
        watch,
    } = useForm<any>({
        defaultValues: {
            index: " ",
            from_date: "",
            date_range: "",
            institution_name: "",
            vote: "",

        },
    });


    const getRealTimeDropdownData = async (filter:any) => {
        try {
            setGetDropdownLoader(true);
            const res = await realTimeService.getDynamicrealTimeDropdownValues(filter);
            if (res.result) {
                setDropdownValues({ ...res.result });
            }
        } catch (error) {
            return error;
        } finally {
            setGetDropdownLoader(false);
        }
    };

    const getInstitutionDropdownData = async (filter:any) => {
        try {
            const res = await realTimeService.getDynamicrealTimeDropdownValues(filter);
            if (res.result) {
                setDropdownInstitutionValues({ ...res.result });
            }
        } catch (error) {
            return error;
        } finally {
        }
    };

    const getVotesDropdownData = async (filter:any) => {
        try {
            const res = await realTimeService.getDynamicrealTimeDropdownValues(filter);
            if (res.result) {
                setDropdownVotesValues({ ...res.result });
            }
        } catch (error) {
            return error;
        } finally {
        }
    };

    const handleCollapseFilter = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsFilterCollapse(!isFilterCollapse);
    };

    const onSubmit = async (realTimeFilter: any) => {
        const cleanFilter = cleanObject(realTimeFilter);
        
        setallApplyFilter({
            year: "2025",
            index: cleanFilter?.index,
            date_range: cleanFilter?.date_range ?? null,
            institution_name: cleanFilter?.institution_name ? [cleanFilter?.institution_name] : null,
            vote: cleanFilter?.vote ? [cleanFilter?.vote] : null,
            company_name: cleanFilter?.company_name?.value ? [cleanFilter?.company_name?.value] : null,
            keyword: cleanFilter?.keyword,
        });
        dispatch(resetPage());
    };

    

    const onFilterClear = () => {
        resetFormValues();
        // reset();
        setallApplyFilter({year:"2025"});
        dispatch(resetPage());
        // getVotesDropdownData({year:"2025"})
        // getInstitutionDropdownData({year:"2025"})

    };

    const resetFormValues: any = () => {
        setValue("index", " ");
        setValue("date_range","");
        setValue("institution_name"," ");
        setValue("vote"," ");
        setValue("company_name", []);
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

    const handleRemoveChip = (removeKey: any, removeValue: any) => {
        const updatedFilters = { ...allApplyFilter };

        if (Array.isArray(updatedFilters[removeKey])) {
            // updatedFilters[removeKey] = updatedFilters[removeKey].filter(
            //     (item) => item !== removeValue
            // );
            updatedFilters[removeKey] = " ";
        } else if (updatedFilters[removeKey] === removeValue) {
            if (removeKey === "vote" || removeKey === "institution_name" || removeKey === "index") {
                updatedFilters[removeKey] = " ";
            } else {
                updatedFilters[removeKey] = "";
            }
        }

        setValue(removeKey, updatedFilters[removeKey]);
        setallApplyFilter( {year: "2025", ...updatedFilters});
    }

    const [groupedQuestions, setGroupedQuestions] = useState<any>([]);
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

     useEffect(() => {
        const groupedQuestions = realTimeData?.reduce((acc: any, question: any) => {
          const company_name = question?.company_name;
          const meeting_date = question?.meeting_date;
          if (!acc[company_name + ' (' + meeting_date + ')']) {
            acc[company_name + ' (' + meeting_date + ')'] = [];
          }
          acc[company_name + ' (' + meeting_date + ')'].push(question);
          return acc;
        }, {});
    
        setGroupedQuestions(groupedQuestions);
      }, [realTimeData]);
    
      useEffect(() => {
        if (groupedQuestions) {
          const initialOpenGroups = Object.keys(groupedQuestions).reduce(
            (acc, company_name) => {
              acc[company_name] = openGroups[company_name] ?? true;
              return acc;
            },
            {} as { [key: string]: boolean }
          );
          setOpenGroups(initialOpenGroups);
        }
      }, [groupedQuestions]);
    
      const toggleGroup = (company_name: string) => {
        setOpenGroups((prevState) => ({
          ...prevState,
          [company_name]: !prevState[company_name],
        }));
      };

    return (
        <>
            <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
            </div>
            <div className="p-5 mt-1 box">
                <div className="flex flex-col p-5  sm:flex-row gap-y-2">
                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                        <span>
                            <h1 className="text-lg font-bold">2025 Shareholder Meetings</h1>
                            {/* {
                                realTimeData?.length > 0 &&
                                <p className=" italic"> Meeting Date: {realTimeData[0]?.meeting_date
                                    ? new Intl.DateTimeFormat("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    }).format(new Date(realTimeData[0].meeting_date))
                                    : ""} </p>
                            } */}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto">
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
                        Count: {count}
                    </h2>
                )}

                {isFilterCollapse && (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="filter-section mb-5">
                            <div className="flex items-center justify-end mt-2 mb-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        onFilterClear();
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

                                <div className="w-full">
                                    <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                                        Company
                                    </div>
                                    <Controller
                                        name="company_name"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <CompanySelect
                                                isClearable={true}
                                                arrayKeyName={"companies"}
                                                exactUrl={"get_vds_dropdown_values/?year=2025&company_name="}
                                                value={field.value}
                                                onChange={(value: any) => {
                                                    field.onChange(value);
                                                        getInstitutionDropdownData({ year: 2025, company_name: value?.label != null ? [value?.label] : '' });
                                                        getVotesDropdownData({ year: 2025, company_name: value?.label != null ? [value?.label] : '' });
                                                        setCompanyName(value?.label);
                                                }}
                                            />

                                        )}
                                    />
                                </div>
                                <div className="mx-2">
                                    <div className="text-left text-slate-500 flex justify-between mb-1">
                                        <span className="font-semibold">Institution</span>
                                    </div>
                                    <Controller
                                        name="institution_name"
                                        control={control}
                                        defaultValue={""}
                                        render={({ field }) => (
                                            <TomSelect
                                                value={field.value || ""}
                                                onChange={(event) => {
                                                    getVotesDropdownData({year: 2025, institutes: [event?.target?.value]})
                                                    field.onChange(event);
                                                }}
                                                options={{
                                                    placeholder: "Select Institution",
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
                                                        {dropdownInstitutionValues?.institutes?.map(
                                                            (institutes: string) => {
                                                                return (
                                                                    <option value={institutes}>{institutes}</option>
                                                                );
                                                            }
                                                        )}
                                                    </>
                                                )}
                                            </TomSelect>
                                        )}
                                    />
                                </div>

                                <div className="mx-2">
                                    <div className="text-left text-slate-500 flex justify-between mb-1">
                                        <span className="font-semibold">Vote</span>
                                    </div>
                                    <Controller
                                        name="vote"
                                        control={control}
                                        defaultValue={""}
                                        render={({ field }) => (
                                            <TomSelect
                                                value={field.value || ""}
                                                onChange={(event) => {
                                                    getInstitutionDropdownData({year: 2025, votes: [event?.target?.value]})
                                                    field.onChange(event);
                                                }}
                                                options={{
                                                    placeholder: "Select Vote",
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
                                                        {dropdownVotesValues?.votes?.map(
                                                            (votes: string) => {
                                                                return (
                                                                    <option value={votes}>{votes}</option>
                                                                );
                                                            }
                                                        )}
                                                    </>
                                                )}
                                            </TomSelect>
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
                                                        {dropdownValues?.index?.map(
                                                            (index: string) => {
                                                                return (
                                                                    <option value={index}>{index}</option>
                                                                );
                                                            }
                                                        )}
                                                    </>
                                                )}
                                            </TomSelect>
                                        )}
                                    />
                                </div>


                                <div className="mx-2">
                                    <div className="text-left text-slate-500 flex justify-between mb-1">
                                        <span className="font-semibold">Date Range</span>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                                            <Lucide icon="Calendar" className="w-4 h-4" />
                                        </div>
                                        <Controller
                                            name="date_range"
                                            control={control}
                                            defaultValue=""
                                            render={({ field }) => (
                                                <Litepicker value={field.value} 
                                                 onChange={(date) => field.onChange(date)}
                                                 placeholder="Select Date Range"
                                                    options={{

                                                                  autoApply: false,
                                                                  singleMode: false,
                                                                  numberOfColumns: 2,
                                                                  numberOfMonths: 2,
                                                                  showWeekNumbers: true,
                                                                  dropdowns: {
                                                                    minYear: 1990,
                                                                    maxYear: null,
                                                                    months: true,
                                                                    years: true,
                                                                  },
                                                                maxDate: new Date().toISOString().split('T')[0],
                                                                minDate: '2025-01-01',     
                                                                }}
                                                    className="pl-12"
                                                    />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="w-full">
                                    <div className="text-left text-slate-500  font-semibold">Keyword</div>
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
                                {/* <div className="mx-2">
                                    <div className="text-left text-slate-500 flex justify-between mb-1">
                                        <span className="font-semibold">To Date</span>
                                    </div>
                                   <div className="relative">
                                   <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                                            <Lucide icon="Calendar" className="w-4 h-4" />
                                        </div>
                                   <Controller
                                        name="to_date"
                                        control={control}
                                        defaultValue=""
                                        render={({ field }) => (
                                            <Litepicker
                                                placeholder="Select To Date"
                                                value={field.value}
                                                onChange={(date) => field.onChange(date)}
                                                options={{
                                                    autoApply: false,
                                                    showWeekNumbers: true,
                                                    dropdowns: {
                                                        minYear: 2025,
                                                        maxYear: 2025,
                                                        months: true,
                                                        years: true,
                                                    },
                                                    position: 'top',
                                                    maxDate: new Date().toISOString().split('T')[0],
                                                    minDate: '2025-01-01',
                                                }}
                                                className="pl-12"
                                            />
                                        )}
                                    />
                                   </div>
                                </div> */}
                            </div>
                        </div>
                    </form>
                )}
                
                {realTimeData?.length > 0 ? (
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
                                                            Company
                                                        </Table.Td>
                                                        <Table.Td
                                                            className="py-2 font-semibold h-[50px] min-w-[150px] bg-header border-header text-[#000000B2]"
                                                            
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
                                                            style={{ width: "10%" }}
                                                        >
                                                            Vote Cast
                                                        </Table.Td>
                                                        <Table.Td
                                                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                                            style={{ width: "17.5%" }}
                                                        >
                                                            Institution
                                                        </Table.Td>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody className="!max-h-400px overflow-auto">
                                                                      <>
                                                                        {groupedQuestions ? (
                                                                          Object.entries(groupedQuestions).map(
                                                                            ([company_name, institutionQuestions]: [
                                                                              string,
                                                                              any
                                                                            ]) => (
                                                                              <>
                                                                                <Table.Tr
                                                                                  className="bg-gray-100 dark:bg-darkmode-700 cursor-pointer"
                                                                                  onClick={() => toggleGroup(company_name)}
                                                                                >
                                                                                  <Table.Td
                                                                                    colSpan={8}
                                                                                    className="font-semibold py-2"
                                                                                  >
                                                                                    <div className="flex flex-row justify-start items-center">
                                                                                      {company_name}
                                                                                      <button className="ml-2 text-blue-500">
                                                                                        {openGroups[company_name] ? (
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
                                                                                  </Table.Td>
                                                                                </Table.Tr>
                                                
                                                                                {openGroups[company_name] &&
                                                                                  Array.isArray(institutionQuestions) &&
                                                                                  institutionQuestions.map((question: any) => (
                                                                                    <Table.Tr
                                                                                      key={question?.id}
                                                                                      className="[&_td]:last:border-b-0"
                                                                                    >
                                                                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600"></Table.Td>
                                                
                                                                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                        <div className="whitespace-nowrap min-w-[150px]">
                                                                                          {question?.meeting_type}
                                                                                        </div>
                                                                                      </Table.Td>
                                                
                                                                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                        <div className="whitespace-normal  max-w-[200px] overflow-hidden text-ellipsis line-clamp-2">
                                                                                          {question?.proposal_num}
                                                                                        </div>
                                                                                      </Table.Td>
                                                
                                                                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                        <div className=" text-wrap max max-w-[200px]">
                                                                                          {question?.proposal}
                                                                                        </div>
                                                                                      </Table.Td>

                                                                                      <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                                        <div className="whitespace-nowrap  max-w-[200px]">
                                                                                          {question?.mgt_rec}
                                                                                        </div>
                                                                                      </Table.Td>

                                                                                          <Table.Td className="py-2 border-dashed dark:bg-transparent" style={{ width: "10%" }}>
                                                                                              <div className="flex">
                                                                                                  {question?.vote === "Split Vote" ? (
                                                                                                      <Tippy
                                                                                                          content={question?.split_vote_counts}
                                                                                                          options={{ theme: "light" }}
                                                                                                      >
                                                                                                          {question?.vote}
                                                                                                      </Tippy>
                                                                                                  ) : (
                                                                                                      <span
                                                                                                          className={clsx([
                                                                                                              (question?.vote?.includes("Against") ||
                                                                                                                  question.vote?.includes("Withhold")) &&
                                                                                                              "text-red-700 font-semibold ",
                                                                                                          ])}
                                                                                                      >
                                                                                                          {question?.vote}
                                                                                                      </span>
                                                                                                  )}
                                                                                                  {question?.notes && question.notes.toLowerCase() !== "nan" && (
                                                                                                      <span
                                                                                                          data-tooltip-id="my-tooltip-data-html"
                                                                                                          data-tooltip-html={question?.notes}
                                                                                                      >
                                                                                                          <Lucide
                                                                                                              icon="Info"
                                                                                                              className="w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800 cursor-pointer"
                                                                                                          />
                                                                                                      </span>
                                                                                                  )}
                                                                                              </div>
                                                                                          </Table.Td>
                                                                                          <Table.Td
                                                                                              className="py-2 border-dashed dark:bg-transparent"
                                                                                              style={{ width: "17.5%" }}
                                                                                          >
                                                                                              {question?.institution_name}
                                                                                          </Table.Td>
                                                
                                                                                      
                                                                                    </Table.Tr>
                                                                                  ))}
                                                                              </>
                                                                            )
                                                                          )
                                                                        ) : (
                                                                          <Table.Tr>
                                                                            <Table.Td
                                                                              colSpan={5}
                                                                              className="py-10 text-center text-slate-500"
                                                                            >
                                                                              No engagement questions.
                                                                            </Table.Td>
                                                                          </Table.Tr>
                                                                        )}
                                                                      </>
                                                                    </Table.Tbody>
                                                                    {groupedQuestions?.length === 0 && (
                                                                      <div className="w-full">
                                                                        <h1 className="mt-3">No Records Found..</h1>
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
                        {
                            loading && <LoadingIcon
                                color="#800000"
                                icon="three-dots"
                                className="w-16 h-16"
                            />
                        }
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
                    cursor: "pointer"
                }}
            />
        </>
    );
};

export default index;
