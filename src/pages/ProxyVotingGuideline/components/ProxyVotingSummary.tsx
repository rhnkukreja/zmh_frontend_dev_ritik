import Lucide from "@/components/Base/Lucide";
import { Popover } from "@/components/Base/Headless";

import Tippy from "@/components/Base/Tippy";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { AppDispatch } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
    fetchProxyVotingGuidelines,
    resetFilter,
    resetPage,
    setPage,
    setFilter,
    setSummaryFilters,
    fetchProxyVotingSummary,
    setSummaryPage,
    resetSummaryFilter,
    resetSummaryPage,
} from "@/stores/proxyVotingGuidelineSlice";
import TomSelect from "@/components/Base/TomSelect";

import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { ProxyVotingSummaryType } from "@/types/proxyVotingGuideline";
import { countValidFilters, createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { ChevronLeft, FilterX, SaveAll } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { FormCheck, FormInput } from "@/components/Base/Form";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { proxyVotingGuidelineService } from "@/services/proxyVotingGuideline";

interface ProxySummaryFilter {
    category: string[];
    sub_category: string[];
    keyword: string;
}

function ProxyVotingSummary() {
    const dispatch: AppDispatch = useAppDispatch();

    const params = useParams();
    const location = useLocation();
    const data = location.state;

    const {
        summaryLoading,
        proxyVotingSummary,
        summaryPage,
        summaryTotalPages,
        summaryFilters,
    } = useAppSelector((state) => state.proxyVotingGuideline);
    const { user } = useAppSelector((state) => state.authentiction);
    // console.log("sumaaryyy", proxyVotingSummary[0])

    useEffect(() => {
        const dynamicURL = createDynamicURL(
            `${baseURL}/proxy_voting_guidelines_pdf_summary/`,
            { proxy_voting_guidelines_id: params?.id, ...summaryFilters },
            undefined,
            summaryPage
        );
        dispatch(fetchProxyVotingSummary(dynamicURL));

        setFiltersLength(
            countValidFilters(
                summaryFilters
            )
        );
    }, [params.id, summaryFilters, summaryPage]);

    const { handleSubmit, reset, setValue, watch, control } =
        useForm<ProxySummaryFilter>({
            defaultValues: {
                category: summaryFilters.category,
                sub_category: summaryFilters.sub_category,
                keyword: summaryFilters.keyword,
            },
        });

    const resetFormValues = () => {
        setValue("category", []);
        setValue("keyword", "");
        setValue("sub_category", []);
    };


    const [searchTerms, setSearchTerms] = useState<string[]>([]);
    const [filtersLength, setFiltersLength] = useState<number>(0);

    const navigate = useNavigate();
    const handleNextPage = () => {
        if (summaryPage < summaryTotalPages) {
            dispatch(setSummaryPage(summaryPage + 1));
        }
    };

    const handlePreviousPage = () => {
        if (summaryPage > 1) {
            dispatch(setSummaryPage(summaryPage - 1));
        }
    };

    const handlePageChange = (newPage: number) => {
        dispatch(setSummaryPage(newPage));
    };

    const handleSearch = (searchTerms: string[]) => {
        dispatch(
            setFilter({
                key: "institution_name",
                value: searchTerms,
            })
        );
    };

    const onFilterClear = () => {
        resetFormValues();
        dispatch(resetFilter());
        dispatch(resetSummaryPage());
        reset();
    };

    const onSubmit = async (ProxyGuideline: ProxySummaryFilter) => {
        dispatch(
            setSummaryFilters({ ...ProxyGuideline })
        );

        dispatch(resetSummaryPage());
    };

    const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);

    const handleCollapseFilter = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsFilterCollapse(!isFilterCollapse);
    };

    const [getDropdownLoader, setGetDropdownLoader] = useState<boolean>(false);
    const [apiDropdownOptions, setApiDropdownOptions] =
        useState<any>({
            category: [],
            sub_category: [],
        });

    const [apiSubCategoryDropdown, setapiSubCategoryDropdown] = useState<any>({
        sub_category: [],
    });

    useEffect(() => {
        getAllProxyVotinSummaryDropdowns();
        getSubCategoryDropdown();
    }, []);


    const getAllProxyVotinSummaryDropdowns = async () => {
        try {
            setGetDropdownLoader(true);
            const res = await proxyVotingGuidelineService.getProxyVotingSumamryDropdownValues({ proxy_voting_guidelines_id: params?.id });
            if (res.result) {
                setApiDropdownOptions({ ...res.result });
            }
        } catch (error) {
            return error;
        } finally {
            setGetDropdownLoader(false);
        }
    };
    const getSubCategoryDropdown = async (value?: any) => {
        if (value !== "") {
            const paramFilter = { category: value, proxy_voting_guidelines_id: params?.id };
            try {
                const res =
                    await proxyVotingGuidelineService.getProxyVotingSumamryDropdownValues(
                        paramFilter
                    );
                if (res.result) {
                    setapiSubCategoryDropdown({ sub_category: res.result?.sub_category });
                }
            } catch (error) {
                return error;
            } finally {
            }
        }
    };

    const backToPreviousPage = () => {
        navigate(`/proxy-voting-guideline`);
        countValidFilters({});
        onFilterClear();
        dispatch(resetSummaryFilter());
    };
    return (
        <>
            <div className="grid grid-cols-12 gap-y-10 gap-x-6">
                <div className="col-span-12">
                    <Button
                        onClick={backToPreviousPage}
                        variant="primary"
                        className="bg-theme-2 border-bg-theme-2 mb-4"
                    >
                        <ChevronLeft
                            className="roup-[.mode--light]:text-white text-white"
                            size={18}
                            strokeWidth={1.5}
                        />
                        Back
                    </Button>
                    <div className="">
                        <div className="flex flex-col box box--stacked">
                            <div className="flex flex-col p-5 sm:flex-row gap-y-2">
                                <div className="flex flex-col md:h-10 gap-y-3 md:items-center md:flex-row">
                                    <div className="font-semibold text-xl">
                                        {data?.name} ({data?.year})
                                    </div>

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
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
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
                                                                apiDropdownOptions.category?.map((cat: any) => (
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

                                            <div className="w-full">
                                                <div className="text-left text-slate-500 font-semibold">Keyword</div>
                                                <Controller
                                                    name="keyword"
                                                    control={control}
                                                    defaultValue=""
                                                    render={({ field }) => (
                                                        <FormInput
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
                            <div className="overflow-auto xl:overflow-visible px-5">
                                <TableWrapper isLoading={summaryLoading}>
                                    <div className="overflow-auto max-h-[400px]">
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    {/* <Table.Td className=" py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Investor
                                                    </Table.Td> */}
                                                    {/* {user?.user_type === "Admin" && ( */}
                                                    <Table.Td className=" py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Categories
                                                    </Table.Td>
                                                    {/* )} */}
                                                    {/* {user?.user_type === "Admin" && ( */}
                                                    <Table.Td className=" py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Sub Categories
                                                    </Table.Td>
                                                    {/* )} */}
                                                    {/* {user?.user_type === "Admin" && ( */}
                                                    <Table.Td className=" py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                        Extracted Paragraph
                                                    </Table.Td>
                                                    {/* )} */}
                                                    {/* {user?.user_type === "Admin" && ( */}
                                                    <Table.Td className=" py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                    Mitigating Factors
                                                    </Table.Td>
                                                    {/* )} */}

                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {proxyVotingSummary?.length > 0 &&
                                                    proxyVotingSummary?.map(
                                                        (summary: ProxyVotingSummaryType) => (
                                                            <Table.Tr
                                                                key={summary?.id}
                                                                className="[&_td]:last:border-b-0"
                                                            >
                                                                {/* <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                    {summary?.institution_name}

                                                                </Table.Td> */}
                                                                {/* {user?.user_type === "Admin" && ( */}
                                                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                    {summary?.category && (
                                                                        <div className="whitespace-nowrap capitalize max-w-[250px] overflow-hidden text-ellipsis">
                                                                            {summary?.category}
                                                                        </div>
                                                                    )}
                                                                </Table.Td>
                                                                {/* )} */}

                                                                {/* {user?.user_type === "Admin" && ( */}
                                                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                                                    {summary?.sub_category && (
                                                                        <>{summary?.sub_category}</>
                                                                    )}
                                                                </Table.Td>
                                                                {/* )} */}

                                                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[500px]">
                                                                    {summary?.paragraph && (
                                                                        <> {summary?.paragraph}</>
                                                                    )}
                                                                </Table.Td>
                                                                <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[350px]">
                                                                    {summary?.mitigating_factors && (
                                                                        <> {summary?.mitigating_factors}</>
                                                                    )}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        )
                                                    )}
                                            </Table.Tbody>
                                            {proxyVotingSummary?.length === 0 && (
                                                <div className="w-full">
                                                    <h1 className="mt-3">No Records Found..</h1>
                                                </div>
                                            )}
                                        </Table>
                                    </div>
                                </TableWrapper>
                            </div>
                            {/* {summaryTotalPages > 1 && ( */}
                            <div className="px-5 pb-5 mt-5">
                                <CPagination
                                    page={summaryPage}
                                    totalPages={summaryTotalPages}
                                    handleNextPage={handleNextPage}
                                    handlePageChange={handlePageChange}
                                    handlePreviousPage={handlePreviousPage}
                                />
                            </div>
                            {/* )} */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ProxyVotingSummary;
