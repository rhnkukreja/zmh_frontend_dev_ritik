import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import {
    convertToTitleCase,
    countValidFilters,
    createDynamicURL,
    formatedDate,
    generateFilterChips,
    getDateWithoutTime,
} from "@/utils/helper";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { toast } from "react-toastify";
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

    useEffect(() => {
        getRealTimeDropdownData();
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
            to_date: "",
        },
    });


    const getRealTimeDropdownData = async () => {
        try {
            setGetDropdownLoader(true);
            const res = await realTimeService.getDynamicrealTimeDropdownValues();
            if (res.result) {
                setDropdownValues({ ...res.result });
            }
        } catch (error) {
            return error;
        } finally {
            setGetDropdownLoader(false);
        }
    };

    const handleCollapseFilter = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsFilterCollapse(!isFilterCollapse);
    };

    const onSubmit = async (npxFilter: any) => {
        setallApplyFilter({
            year: "2025",
            index: npxFilter?.index,
            from_date:npxFilter?.from_date ? getDateWithoutTime(npxFilter?.from_date) : null,
            to_date: npxFilter?.to_date ? getDateWithoutTime(npxFilter?.to_date) : null
        });
        dispatch(resetPage());
    };

    const onFilterClear = () => {
        resetFormValues();
        reset();
        setallApplyFilter({year:"2025"});
        dispatch(resetPage());
    };

    const resetFormValues: any = () => {
        setValue("index", " ");
        setValue("from_date","");
        setValue("to_date","");
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
        setallApplyFilter( {year: "2025", ...updatedFilters});
    }

    return (
        <>
            <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
            </div>
            <div className="p-5 mt-1 box">
                <div className="flex flex-col p-5  sm:flex-row gap-y-2">
                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                        <span>
                            <h1 className="text-lg font-bold">Real Time Data 2025</h1>
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
                                        <span className="font-semibold">From Date</span>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute flex items-center justify-center w-10 h-full border rounded-l bg-slate-100 text-slate-500 dark:bg-darkmode-700 dark:border-darkmode-800 dark:text-slate-400">
                                            <Lucide icon="Calendar" className="w-4 h-4" />
                                        </div>
                                        <Controller
                                            name="from_date"
                                            control={control}
                                            defaultValue=""

                                            render={({ field }) => (
                                                <Litepicker
                                                    placeholder="Select From Date"
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
                                                        minDate: '2025-01-01',                                                    }}
                                                    className="pl-12"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="mx-2">
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
                                </div>
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
                                                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                                            style={{ width: "12%" }}
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

                                                <Table.Tbody>
                                                    {realTimeData?.length > 0 && (() => {
                                                        let lastInstitutionName = '';
                                                        let toggle = false;

                                                        return realTimeData.map((vds: any, index: number) => {
                                                            const currentInstitution = vds?.excel_institution_name;
                                                            if (currentInstitution !== lastInstitutionName) {
                                                                toggle = !toggle;
                                                                lastInstitutionName = currentInstitution;
                                                            }

                                                            return (
                                                                <Table.Tr
                                                                    key={vds?.id}
                                                                    className={clsx(
                                                                        "[&_td]:last:border-b-0",
                                                                        toggle ? "bg-white dark:bg-darkmode-600" : "bg-gray-200 dark:bg-darkmode-900"
                                                                    )}
                                                                >
                                                                    <Table.Td
                                                                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                                                                        style={{ width: "17.5%" }}
                                                                    >
                                                                        {vds?.company_name}
                                                                    </Table.Td>

                                                                    <Table.Td className="py-2 border-dashed dark:bg-transparent" style={{ width: "12%" }}>
                                                                        <div className="flex">{convertToTitleCase(vds?.meeting_type)}</div>
                                                                    </Table.Td>

                                                                    <Table.Td className="py-2 border-dashed dark:bg-transparent" style={{ width: "5%" }}>
                                                                        {vds?.proposal_num}
                                                                    </Table.Td>

                                                                    <Table.Td className="py-2 border-dashed dark:bg-transparent" style={{ width: "25%" }}>
                                                                        {vds?.proposal}
                                                                    </Table.Td>

                                                                    <Table.Td className="py-2 border-dashed dark:bg-transparent" style={{ width: "10%" }}>
                                                                        {convertToTitleCase(vds?.mgt_rec)}
                                                                    </Table.Td>

                                                                    <Table.Td className="py-2 border-dashed dark:bg-transparent" style={{ width: "10%" }}>
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
                                                                                        (vds?.vote?.includes("Against") ||
                                                                                            vds.vote?.includes("Withhold")) &&
                                                                                        "text-red-700 font-semibold ",
                                                                                    ])}
                                                                                >
                                                                                    {vds?.vote}
                                                                                </span>
                                                                            )}
                                                                            {vds?.notes && vds.notes.toLowerCase() !== "nan" && (
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
                                                                    <Table.Td
                                                                        className="py-2 border-dashed dark:bg-transparent"
                                                                        style={{ width: "17.5%" }}
                                                                    >
                                                                        {vds?.institution_name}
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            );
                                                        });
                                                    })()}
                                                </Table.Tbody>
                                                {realTimeData?.length === 0 && (
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
