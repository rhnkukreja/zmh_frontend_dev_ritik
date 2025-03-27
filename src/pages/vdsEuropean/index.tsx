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
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import CompanySelect from "@/components/ReactSelectAsync";
import { fetchVdsEuropeans, resetPage, setAllFilters, setPage } from "@/stores/vdsEuropeanSlice";
import { vdsEuropeanService } from "@/services/vdsEuropean";
import { setTempSearch } from "@/stores/dashboardSlice";
import FilterChips from "@/components/FilterChips";
import { Tooltip } from "react-tooltip";
import Tippy from "@/components/Base/Tippy";
import clsx from "clsx";

const index = () => {
    const dispatch: AppDispatch = useAppDispatch();
    const { VdsEuropeans, loading, page, totalPages, count } =
        useAppSelector((state) => state.vdsEuropean);

    const {
        companyGlobalSearchName,
        companyGlobalSearchTicker,
    } = useAppSelector((state: RootState) => state.authentiction);

    const [searchParams] = useSearchParams();
    const searchTicker = searchParams.get("ticker");
    const [allApplyFilter, setallApplyFilter] = useState<any>("");
    const [meetingDate, setMeetingDate] = useState<any>("");

    const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
    const [getFundNameDropdownLoader, setGetFundNameDropdownLoader] =
        useState<boolean>(false);
    const [showFundName, setShowFundName] = useState<boolean>(false);
    const [apiFundNameDropdown, setApiFundNameDropdown] = useState<any>({
        institution: [],
    });

    const [dropdownValues, setDropdownValues] = useState<any>({
        company_name: [],
        institution: [],
    });

    const [getDynamicDropdownLoader, setGetDynamicDropdownLoader] =
        useState<boolean>(false);

    const [apiDependentDropdownOptions, setApiDependentDropdownOptions] =
        useState<any>({
            institution: [],
            vote: [],
            category: [],
            year: [],
        });


    const getDependentDropdown = async () => {
        const paramFilter = {
            company_name: dropdownValues?.company_name !== "" ? [dropdownValues?.company_name] : [],
            institution_name: dropdownValues?.institution_name,
            year: dropdownValues?.institution_name && dropdownValues?.company_name ? [2024] : []
        };
        if(dropdownValues?.institution_name && dropdownValues?.company_name){
            setValue("year", [2024]);
        }
        try {
            setGetDynamicDropdownLoader(true);
            const res = await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues(paramFilter);
            if (res.result) {
                setApiDependentDropdownOptions({ ...res.result });
            }
        } catch (error) {
            return error;
        } finally {
            setGetDynamicDropdownLoader(false);
        }
    };

    const getFundNameDependentDropdown = async (value: any) => {
        if (value !== "") {
            const paramFilter = {
                company_name: [value],
            };
            try {
                setGetFundNameDropdownLoader(true);
                const res = await vdsEuropeanService.getDynamicVDSEuropeanDropdownValues(
                    paramFilter
                );
                if (res.result) {
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
            dispatch(
                fetchVdsEuropeans(
                    createDynamicURL(
                        `${baseURL}/vds_european/`,
                        allApplyFilter,
                        undefined,
                        page
                    )
                )
            );

            setFiltersLength(
                countValidFilters(
                    allApplyFilter
                )
            );
            setSelectedChipFilters(generateFilterChips(allApplyFilter));
            dispatch(setTempSearch(companyGlobalSearchName));
        }

        // return () => {
        //     onFilterClear();
        //   }
    }, [companyGlobalSearchTicker, searchTicker, allApplyFilter, page]);


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
            institution_name: [],
            vote: [],
            category: [],
            year: [],
        },
    });

    const onSubmit = async (npxFilter: any) => {
        if (npxFilter?.company_name?.length === 0 || !npxFilter?.company_name?.label) {
            toast.warning("Please Select Company Name");
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
    };

    const onFilterClear = () => {
        resetFormValues();
        setallApplyFilter({});

        dispatch(resetPage());
        dispatch(
            fetchVdsEuropeans(
                createDynamicURL(`${baseURL}/vds_european/`, undefined, undefined, page)
            )
        );

        setApiDependentDropdownOptions({
            institution: [],
            vote: [],
            category: [],
            year: [],
        })
        setApiFundNameDropdown({
            institution: [],
        })

    };

    const resetFormValues: any = () => {
        setValue("company_name", []);
        setValue("institution_name", []);
        setValue("vote", []);
        setValue("category", []);
        setValue("year", []);
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
        // dispatch(setAllFilters(updatedFilters));
        setallApplyFilter(updatedFilters);
    }

    const isObject = (item: any) => {
        if (typeof item === "object") {
            return true;
        } else {
            false;
        }
    };

    const getSplitContents = (items: any) => {
        const resultString = Object.entries(items)
            .map(([key, value]) => `${convertToTitleCase(key)}: ${value}`)
            .join(", ");
        return resultString;
    };


    return (
        <>
            <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
            </div>
            <div className="p-5 mt-1 box">
                <div className="flex flex-col p-5  sm:flex-row gap-y-2">
                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                        <span>
                            <h1 className="text-lg font-bold">Proxy Voting</h1>
                            {
                                VdsEuropeans?.length > 0 &&
                                <p className=" italic"> Meeting Date: {VdsEuropeans[0]?.meeting_date} </p>
                            }
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
                                        Company*
                                    </div>
                                    <Controller
                                        name="company_name"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <CompanySelect
                                                exactUrl={"get_vds_european_dropdown_values/?company_name="}
                                                value={field.value}
                                                onChange={(value: any) => {
                                                    field.onChange(value);
                                                    handleDropdownChange(
                                                        "company_name",
                                                        value?.label
                                                    );
                                                    getFundNameDependentDropdown(value?.label);
                                                }}
                                            />

                                        )}
                                    />
                                </div>

                                <div className="w-full">
                                    <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                                        Institution Name
                                    </div>
                                    <Controller
                                        name="institution_name"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <TomSelect
                                                value={field.value || []}
                                                onChange={(value: any) => {
                                                    field.onChange(value);
                                                    handleDropdownChange(
                                                        "institution_name",
                                                        value?.target?.value
                                                    );
                                                }}
                                                options={{ placeholder: "Select Institution Name" }}
                                                className="w-full"
                                                multiple
                                            >
                                                {getFundNameDropdownLoader ? (
                                                    <option disabled>Loading...</option>
                                                ) : (
                                                    apiFundNameDropdown?.institution?.map(
                                                        (institution: any) => (
                                                            <option key={institution} value={institution}>
                                                                {/* {convertToTitleCase(institution)} */}
                                                                {institution}
                                                            </option>
                                                        )
                                                    )
                                                )}
                                            </TomSelect>
                                        )}
                                    />
                                </div>

                                <div className="w-full">
                                    <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                                        Year
                                    </div>
                                    <Controller
                                        name="year"
                                        control={control}
                                        defaultValue={[]}
                                        render={({ field }) => (
                                            <TomSelect
                                                value={field.value || []}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                options={{ placeholder: "Select Year" }}
                                                className="w-full"
                                                multiple
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

                                {/* <div className="w-full">
                                    <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                                        Category
                                    </div>
                                    <Controller
                                        name="category"
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
                                                    apiDependentDropdownOptions?.category?.map(
                                                        (category: any) => (
                                                            <option key={category} value={category}>
                                                                {convertToTitleCase(category)}
                                                            </option>
                                                        )
                                                    )
                                                )}
                                            </TomSelect>
                                        )}
                                    />
                                </div> */}



                                <div className="w-full">
                                    <div className="text-left text-slate-500 flex justify-between mb-1 font-semibold">
                                        Vote
                                    </div>
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

                                <div className="w-full">
                                    <div className="text-left text-slate-500 font-semibold">Keyword</div>
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
                        </div>
                    </form>
                )}

                {VdsEuropeans?.length > 0 ? (
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
                                                            Institution Name
                                                        </Table.Td>
                                                        <Table.Td
                                                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                                            style={{ width: "17.5%" }} // Remaining columns have equal widths
                                                        >
                                                            Meeting Type
                                                        </Table.Td>
                                                        <Table.Td
                                                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                                            style={{ width: "5%" }}
                                                        >
                                                            Proposal No.
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

                                                        {/* <Table.Td
                                                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                                            style={{ width: "30%" }}
                                                        >
                                                           Company Name

                                                        </Table.Td>

                                                        <Table.Td
                                                            className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]"
                                                            style={{ width: "17.5%" }} // Proposal gets more width
                                                        >
                                                            Meeting Date
                                                        </Table.Td> */}
                                                    </Table.Tr>
                                                </Table.Thead>

                                                <Table.Tbody>
                                                    {VdsEuropeans?.length > 0 &&
                                                        VdsEuropeans?.map((vds: any) => (
                                                            <Table.Tr
                                                                key={vds?.id}
                                                                className="[&_td]:last:border-b-0"
                                                            >
                                                                <Table.Td
                                                                    className="whitespace-nowrap overflow-hidden text-ellipsis"
                                                                    style={{ width: "17.5%" }}
                                                                >
                                                                    {vds?.excel_institution_name}
                                                                    {/* {convertToTitleCase(vds?.excel_institution_name)} */}

                                                                </Table.Td>

                                                                {/* <Table.Td
                                                                    className="py-2 border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "30%" }}
                                                                >
                                                                    { vds?.company_name ?  vds?.company_name : vds?.excel_company_name}
                                                                    
                                                                </Table.Td> */}

                                                                <Table.Td
                                                                    className="py-2 border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "17.5%" }}
                                                                >
                                                                    <div className="flex">
                                                                        {convertToTitleCase(vds?.meeting_type)}

                                                                    </div>
                                                                </Table.Td>

                                                                <Table.Td
                                                                    className="py-2  border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "5%" }}
                                                                >
                                                                    {convertToTitleCase(vds?.proposal_num)}

                                                                </Table.Td>

                                                                <Table.Td
                                                                    className="py-2 border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "25%" }}
                                                                >
                                                                    {convertToTitleCase(vds?.proposal)}
                                                                </Table.Td>

                                                                <Table.Td
                                                                    className="py-2 border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "10%" }}
                                                                >
                                                                    {convertToTitleCase(vds?.mgt_rec)}
                                                                </Table.Td>

                                                                <Table.Td
                                                                    className="py-2 border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "30%" }}
                                                                >
                                                                    <div className="flex">
                                                                    {vds?.vote === "Split Vote" ? (
                                                                        <Tippy
                                                                            content={
                                                                                getSplitContents(
                                                                                    vds?.split_vote_counts
                                                                                )
                                                                            }
                                                                            // content={
                                                                            //     vds?.split_vote_counts
                                                                            // }
                                                                            options={{ theme: "light" }}
                                                                        >
                                                                            {
                                                                                vds?.vote
                                                                            }
                                                                        </Tippy>
                                                                    ) : (
                                                                        <span className={clsx([
                                                                            (vds?.vote?.includes("Against") ||
                                                                                vds.vote?.includes(
                                                                                    "Withhold"
                                                                                )) &&
                                                                            "text-red-700 font-semibold ",
                                                                        ])}>
                                                                            {
                                                                                vds?.vote
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    {vds?.notes
                                                                        &&
                                                                        <span
                                                                            data-tooltip-id="my-tooltip-data-html"
                                                                            data-tooltip-html={vds?.notes}>
                                                                            <Lucide
                                                                                icon="Info"
                                                                                className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800 cursor-pointer"
                                                                            />
                                                                        </span>
                                                                    }
                                                                    </div>

                                                                </Table.Td>

                                                                {/* <Table.Td
                                                                    className="py-2 border-dashed dark:bg-darkmode-600"
                                                                    style={{ width: "17.5%" }}
                                                                >
                                                                    {convertToTitleCase(vds?.meeting_date)}
                                                                    
                                                                </Table.Td> */}










                                                            </Table.Tr>
                                                        ))}
                                                </Table.Tbody>

                                                {VdsEuropeans?.length === 0 && (
                                                    <div className="w-full">
                                                        <h1 className="mt-3">No NPX records available</h1>
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
                        <h1 className="font-semibold"></h1>
                    </div>
                )}

                {VdsEuropeans?.npx_report?.length === 0 &&
                    !loading &&
                    allApplyFilter && (
                        <div className="h-52 p-5 mt-3.5 flex items-center justify-center">
                            <h1 className="font-semibold"> Proxy Records Not Found..</h1>
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
