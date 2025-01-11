import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { convertToTitleCase, createDynamicURL } from "@/utils/helper";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
    fetchAGMProxyAllContestDashboard,
    fetchAGMProxyContestDashboard,
    fetchCaseStudiesAllProxyContext,
    fetchCaseStudiesTopProxyContext,
    fetchProxyContestDashboard,
    fetchProxyTopFiveContestDashboard,
    setPage,
    setProxyContestInvestorFilter,
    setProxyTopFilter,
    setTabs,
} from "@/stores/dashboardSlice";
import { baseURL } from "@/constant";
import { AppDispatch, RootState } from "@/stores/store";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { Tooltip } from 'react-tooltip';
import { Tab } from "@/components/Base/Headless";
import { dashboardService } from "@/services/dashboard";
import { Controller, useForm } from "react-hook-form";
import TomSelect from "@/components/Base/TomSelect";
import { toast } from "react-toastify";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import CPagination from "@/components/Pagination";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";

const index = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch: AppDispatch = useAppDispatch();
    const { proxyContestAllInvestorLoading, proxyContestAllInvestorDetails, proxyContestTopFiveDetails, agmSummaryProxyContest, loading,
        proxyContestTopFiveLoading, tab, proxyContestinvestorFilter, proxyContestTopFilter, caseStudiesTopProxy, agmSummaryAllProxyContest, caseStudiesAllProxy, totalCaseStudiesAllProxyPages,
        page, totalCaseStudiesTopProxyPages, } = useAppSelector(
        (state) => state.dashboard
    );
    const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
        (state: RootState) => state.authentiction
    );

    const [companyHeaderName, setCompanyHeaderName] = useState<string | null>(null);
    const [companyAllHeaderName, setCompanyAllHeaderName] = useState<string | null>(null);

    const companyDetails = agmSummaryProxyContest?.company ? agmSummaryProxyContest?.company[0] : "";
    const companyName = Object.keys(companyDetails)[0];
    const meetingDetails = companyDetails[companyName];
    const meetingDate = meetingDetails?.split(" - ").pop();

    const companyAllDetails = agmSummaryAllProxyContest?.company ? agmSummaryAllProxyContest?.company[0] : "";
    const companyAllName = Object.keys(companyAllDetails)[0];
    const meetingAllDetails = companyAllDetails[companyAllName];
    const meetingAllDate = meetingAllDetails?.split(" - ").pop();

    const { handleSubmit, control, reset, setValue, watch } =
        useForm<any>({
            defaultValues: {
                company_name: 'Select',
                institution_name: [],
            },
        });


    useEffect(() => {

        if (tab === 'Top-20') {
            dispatch(
                fetchProxyTopFiveContestDashboard(
                    createDynamicURL(`${baseURL}/vds_proxy_voting/`, { ...proxyContestTopFilter }))
            );
            
            if (proxyContestTopFilter?.company_name?.length > 0) {
                dispatch(
                    fetchAGMProxyContestDashboard(
                        createDynamicURL(
                            `${baseURL}/voting_report_8k/`, { ...proxyContestTopFilter, ticker: companyGlobalSearchTicker })
                    )
                );
                dispatch(
                    fetchCaseStudiesTopProxyContext(
                        createDynamicURL(
                            `${baseURL}/case_studies/`, { company_name: proxyContestTopFilter?.company_name, themes: ['Proxy Contest/M&A'] },undefined,
                            page )
                    )
                );
            }
            else {
                dispatch(
                    fetchAGMProxyContestDashboard(
                        createDynamicURL(
                            `${baseURL}/voting_report_8k/`, {ticker: ''})
                    )
                );
            }
            setCompanyHeaderName(proxyContestTopFilter?.company_name[0]);
        }
    }, [proxyContestTopFilter, tab])

    useEffect(() => {

        if (tab === 'All-Investor') {
            dispatch(
                fetchProxyContestDashboard(
                    createDynamicURL(
                        `${baseURL}/vds_proxy_voting/`, { ...proxyContestinvestorFilter }

                    )
                )
            );
            if (proxyContestinvestorFilter?.company_name?.length > 0) {
                dispatch(
                    fetchAGMProxyAllContestDashboard(
                        createDynamicURL(
                            `${baseURL}/voting_report_8k/`, { ...proxyContestinvestorFilter, ticker: companyGlobalSearchTicker })
                    )
                );
                dispatch(
                    fetchCaseStudiesAllProxyContext(
                        createDynamicURL(
                            `${baseURL}/case_studies/`, { company_name: proxyContestinvestorFilter?.company_name, themes: ['Proxy Contest/M&A'] },undefined,
                            page )
                    )
                );
            }
            else {
                dispatch(
                    fetchAGMProxyAllContestDashboard(
                        createDynamicURL(
                            `${baseURL}/voting_report_8k/`, {ticker: ''})
                    )
                );
            }
            setCompanyAllHeaderName(proxyContestinvestorFilter?.company_name[0]);


        }
    }, [proxyContestinvestorFilter, tab])


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


    const [apiDropdownOptions, setApiDropdownOptions] = useState<{ institution: [], company: [] }>({
        institution: [],
        company: []
    });

    const getAllInstitutionDropdown = async (params?:any) => {
        try {
            const res = await dashboardService.getInstitution(params);
            if (res.result?.institution) {
                setApiDropdownOptions(res.result);
            }
        } catch (error) {
            return error;
        } finally {
            // setGetDropdownLoader(false);
        }
    };

    useEffect(() => {
        getAllInstitutionDropdown();
    }, [companyGlobalSearchTicker])

    const handleNextPage = () => {
        if (page < totalCaseStudiesTopProxyPages) {
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



    const onSubmit = async (proxyFilter: any) => {

        if (proxyFilter?.company_name === "Select") {
            toast.warning("Please select Company");
            return;
        }
        const applyFilter = { company_name: [proxyFilter?.company_name], institution_name: proxyFilter?.institution_name };

        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyContestInvestorFilter({ key: key as any, value }));
        });
    };

    const onFilterClear = () => {
        resetFormValues();
        const applyFilter = {institution_name: [], company_name: []};
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyContestInvestorFilter({ key: key as any, value }));
        });

      };
    
    const resetFormValues: any = () => {
        setValue("institution_name", []);
        setValue("company_name", 'Select');
    };

    const onSubmitTopFive = async (proxyFilter: any) => {

        if (proxyFilter?.company_name === "Select") {
            toast.warning("Please select Company");
            return;
        }
        const applyFilter = {company_name: [proxyFilter?.company_name], top: 'true'};
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
        // setProxyTopFilter({company_name: [proxyFilter?.company_name], top: 'true'})
    };

    const onTopFiveFilterClear = () => {
        resetTopFiveFormValues();
        // setCompanyFilter({company_name: [], top: false})
        const applyFilter = {company_name: [], top: 'false'};
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
        setCompanyHeaderName('');
      };
    
    const resetTopFiveFormValues: any = () => {
        setValue("company_name", 'Select');
    };

    const getSelectedTabIndex = () => {
        const tabIndex =
            tab === "Top-20"
                ? 0
                : tab === "All-Investor"
                    ? 1
                    : -1;
        return tabIndex;
    };
      
    return (
        <>
            {/* <div className="p-y-5 mb-1 font-semibold text-xl ">
        {companyGlobalSearchName}
      </div> */}

            {proxyContestAllInvestorDetails?.vds_report?.length === 0 &&
                !proxyContestAllInvestorLoading &&
                location.pathname !== "/" && (
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
                )}

            <div className="p-5 mt-1 box">
        
                <div className="w-full">
                    <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                        {/* <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                            <span>
                                <h1 className="text-lg font-bold">Proxy Contest 2024 (Beta) </h1>
                            </span>
                        </div> */}

                    </div>
                    <>
                        <Tab.Group selectedIndex={getSelectedTabIndex()}>
                            <Tab.List variant="link-tabs">
                                <Tab>
                                    <Tab.Button
                                        className="w-full py-2"
                                        as="button"
                                        onClick={() => {
                                            dispatch(setTabs("Top-20"));
                                            setValue("company_name", 'Select');
                                            
                                        }}>
                                        <div className="flex items-center justify-center ">
                                            Top 5
                                        </div>
                                    </Tab.Button>
                                </Tab>

                                <Tab>
                                    <Tab.Button
                                        className="w-full py-2"
                                        as="button"
                                        onClick={() => {
                                            dispatch(setTabs("All-Investor"));
                                            setValue("company_name", 'Select');
                                        }}
                                    >
                                        <div className="flex items-center justify-center ">
                                            All Investors
                                        </div>
                                    </Tab.Button>
                                </Tab>

                            </Tab.List>

                            <Tab.Panels className="mt-5">
                                <Tab.Panel className="leading-relaxed">
                                    <div className="">
                                        <div className="p-2">

                                        <div className="font-semibold text-xl py-4">{companyHeaderName}</div>

                                            <form onSubmit={handleSubmit(onSubmitTopFive)}>

                                                <div className="flex items-end gap-4">
                                                    <div className="w-4/12">
                                                        <div className="text-left text-slate-500 flex justify-between mb-1">
                                                            Select Company
                                                        </div>
                                                        <Controller
                                                            name="company_name"
                                                            control={control}
                                                            defaultValue={[]}
                                                            render={({ field }) => (
                                                                <TomSelect
                                                                    value={field.value || []}
                                                                    onChange={(event) => {
                                                                        field.onChange(event);
                                                                        // setCompanyHeaderName(event?.target?.value);
                                                                    }}
                                                                    options={{ placeholder: "Company" }}
                                                                    className="w-full"

                                                                >
                                                                    {
                                                                        apiDropdownOptions.company?.map((company: any) => (
                                                                            <option key={company} value={company}>
                                                                                {company}
                                                                            </option>
                                                                        ))
                                                                    }
                                                                </TomSelect>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="flex items-center mt-7">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                onTopFiveFilterClear();
                                                            }}
                                                            className="w-32 ml-auto"
                                                        >
                                                            Clear
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            variant="primary"
                                                            className="w-32 ml-2"
                                                        >
                                                            Apply
                                                        </Button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                    {/* AGM Summary Table */}
                                    
                                    <section >
                                        {!loading && agmSummaryProxyContest?.nominees_headers?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                Meeting Details
                                                            </h1>
                                                            <p className=" italic"> Meeting Date: {meetingDate}</p>
                                                        </span>
                                                    </div>
                                                    {/* <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                                                        <Tippy content="Download Excel" options={{ theme: "light" }}>
                                                            <div
                                                                className="box p-[5px] cursor-pointer"
                                                            onClick={convertDivTableToCSV}
                                                            >
                                                                <img alt="download-icon" src={downloadIcon} />
                                                            </div>
                                                        </Tippy>
                                                    </div> */}
                                                </div>
                                                <div className="">
                                                    <TableWrapper>
                                                        <div className="max-h-[30vh] overflow-y-scroll">
                                                            <Table className="table_2 w-full">
                                                                <Table.Thead className="sticky top-0 z-10">
                                                                    <Table.Tr className="row_2">
                                                                        {agmSummaryProxyContest?.nominees_headers?.length > 0 &&
                                                                            agmSummaryProxyContest?.nominees_headers?.map(
                                                                                (nomineeHeader: any, headerIndex: number) => (
                                                                                    <Table.Td
                                                                                        key={headerIndex}
                                                                                        className={clsx([
                                                                                            "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[150px] text-right",
                                                                                            headerIndex === 0 && "text-left",
                                                                                        ])}
                                                                                    >
                                                                                        {nomineeHeader.header}
                                                                                    </Table.Td>
                                                                                )
                                                                            )}
                                                                    </Table.Tr>
                                                                </Table.Thead>

                                                                <Table.Tbody>
                                                                    {agmSummaryProxyContest?.nominees?.length > 0 &&
                                                                        agmSummaryProxyContest?.nominees?.map(
                                                                            (nominee: any, nomineeIndex: number) => (
                                                                                <Table.Tr
                                                                                    key={nomineeIndex}
                                                                                    className="row_2 [&_td]:last:border-b-0"
                                                                                >
                                                                                    {agmSummaryProxyContest?.nominees_headers?.length >
                                                                                        0 &&
                                                                                        agmSummaryProxyContest?.nominees_headers?.map(
                                                                                            (
                                                                                                nomineeHeader: any,
                                                                                                headerIndex: number
                                                                                            ) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-right",
                                                                                                        headerIndex === 0 && "text-left ",
                                                                                                    ])}
                                                                                                >
                                                                                                    <h1
                                                                                                        className={clsx([
                                                                                                            headerIndex === 0 &&
                                                                                                            "font-semibold ",
                                                                                                            headerIndex ===
                                                                                                            agmSummaryProxyContest
                                                                                                                ?.nominees_headers?.length -
                                                                                                            1 &&
                                                                                                            parseFloat(
                                                                                                                nominee[nomineeHeader?.field]
                                                                                                            ) < 85 &&
                                                                                                            "text-red-700 font-semibold",
                                                                                                        ])}
                                                                                                    >
                                                                                                        {nominee[nomineeHeader?.field]}
                                                                                                    </h1>
                                                                                                </Table.Td>
                                                                                            )
                                                                                        )}
                                                                                </Table.Tr>
                                                                            )
                                                                        )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>
                                                    </TableWrapper>

                                                    <br />
                                                    <TableWrapper >
                                                        <div className="max-h-[30vh] overflow-y-scroll">
                                                            <Table className="table_3 w-full">
                                                                <Table.Thead className="sticky top-0 z-10">
                                                                    <Table.Tr className="row_3">
                                                                        {agmSummaryProxyContest?.proposals_headers?.map(
                                                                            (proposalHeader: any, headerIndex: number) => (
                                                                                <Table.Td
                                                                                    key={headerIndex}
                                                                                    className={clsx([
                                                                                        "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[150px] text-right",
                                                                                        headerIndex === 0 && "text-left",
                                                                                    ])}
                                                                                >
                                                                                    {proposalHeader?.header}
                                                                                </Table.Td>
                                                                            )
                                                                        )}
                                                                    </Table.Tr>
                                                                </Table.Thead>

                                                                <Table.Tbody>
                                                                    {agmSummaryProxyContest?.proposals?.length > 0 &&
                                                                        agmSummaryProxyContest?.proposals?.map(
                                                                            (proposal: any, proposalIndex: number) => (
                                                                                <Table.Tr
                                                                                    key={proposalIndex}
                                                                                    className="row_3 [&_td]:last:border-b-0"
                                                                                >
                                                                                    {agmSummaryProxyContest?.proposals_headers?.length >
                                                                                        0 &&
                                                                                        agmSummaryProxyContest?.proposals_headers?.map(
                                                                                            (
                                                                                                proposalHeader: any,
                                                                                                headerIndex: number
                                                                                            ) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_3 py-2 border-dashed dark:bg-darkmode-600 text-right",
                                                                                                        headerIndex === 0 && "text-left",
                                                                                                    ])}
                                                                                                >
                                                                                                    <h1
                                                                                                        className={clsx([
                                                                                                            headerIndex === 0 &&
                                                                                                            "font-semibold ",
                                                                                                            headerIndex ===
                                                                                                            agmSummaryProxyContest
                                                                                                                ?.proposals_headers?.length -
                                                                                                            1 &&
                                                                                                            parseFloat(
                                                                                                                proposal[proposalHeader?.field]
                                                                                                            ) < 85 &&
                                                                                                            "text-red-700 font-semibold",
                                                                                                        ])}
                                                                                                    >
                                                                                                        {proposal[proposalHeader?.field]}
                                                                                                    </h1>
                                                                                                </Table.Td>
                                                                                            )
                                                                                        )}
                                                                                </Table.Tr>
                                                                            )
                                                                        )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>
                                                    </TableWrapper>
                                                </div>
                                            </section>
                                        }

                                        {!loading && agmSummaryProxyContest?.nominees_headers?.length === 0 && (proxyContestTopFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Meeting Details Not Found</h1>
                                            </div>
                                        }

                                    </section>
                                    {/* AGM Summary Table */}

                                    <br />

                                    {/* Case Studies Table */}
                                   
                                    <section >
                                        {!loading && proxyContestTopFiveDetails?.vds_report_headers?.length > 0 && caseStudiesTopProxy?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                Case Studies
                                                            </h1>
                                                        </span>
                                                    </div>
                                                  
                                                </div>
                                                    <span>
                                                        <div className="">
                                                            <TableWrapper isLoading={loading}>
                                                                <div className="overflow-auto max-h-[400px]">
                                                                    <Table>
                                                                        <Table.Thead>
                                                                            <Table.Tr>
                                                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                                                    Institution Name
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                    Year
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                    Company
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                    Theme
                                                                                </Table.Td>

                                                                                <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                    Industry
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 flex items-center justify-center font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                                                    Details
                                                                                </Table.Td>
                                                                            </Table.Tr>
                                                                        </Table.Thead>

                                                                        <Table.Tbody>
                                                                            {caseStudiesTopProxy?.length > 0 &&
                                                                                caseStudiesTopProxy?.map((item: any) => (
                                                                                    <Table.Tr
                                                                                        key={item?.id}
                                                                                        className="[&_td]:last:border-b-0"
                                                                                    >
                                                                                        <Table.Td className="flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                                                                            {item?.institution_logo_url ? (
                                                                                                <>
                                                                                                    <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                                                                                        <img
                                                                                                            alt="Institution Logo"
                                                                                                            className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                                                                                            src={item?.institution_logo_url}
                                                                                                            content={item?.institution_name || ""}
                                                                                                        />
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                <div className="flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                                                                                    <img
                                                                                                        alt="ZMH Analytics"
                                                                                                        className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                                                                                        src={investorIcon}
                                                                                                    />
                                                                                                    <a
                                                                                                        href=""
                                                                                                        className="absolute bottom-0 right-0 flex items-center justify-center rounded-full w-7 h-7"
                                                                                                    ></a>
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="ml-4 max-w-[150px]">
                                                                                                <p className="font-medium whitespace-normal line-clamp-2">
                                                                                                    {item?.institution_name}
                                                                                                </p>
                                                                                            </div>
                                                                                        </Table.Td>
                                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                            {item?.year}
                                                                                        </Table.Td>
                                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                            {item?.company_name}
                                                                                        </Table.Td>
                                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                            {item?.esg_themes}
                                                                                        </Table.Td>

                                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                            {item?.industry}
                                                                                        </Table.Td>
                                                                                        <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 ">
                                                                                            <div className="flex gap-3 justify-center">
                                                                                                <Tippy
                                                                                                    content="See Details"
                                                                                                    options={{ theme: "light" }}
                                                                                                >
                                                                                                    <Lucide
                                                                                                        onClick={() => {
                                                                                                            navigate(`/case-studies/${item?.id}`);
                                                                                                        }}
                                                                                                        icon="Eye"
                                                                                                        className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                                                                                    />
                                                                                                </Tippy>
                                                                                            </div>
                                                                                        </Table.Td>
                                                                                    </Table.Tr>
                                                                                ))}
                                                                        </Table.Tbody>
                                                                        {caseStudiesTopProxy?.length === 0 && (
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
                                                                totalPages={totalCaseStudiesTopProxyPages}
                                                                handleNextPage={handleNextPage}
                                                                handlePageChange={handlePageChange}
                                                                handlePreviousPage={handlePreviousPage}
                                                            />
                                                        </div>
                                                    </span>

                                            </section>
                                        }

                                        {!loading && caseStudiesTopProxy?.length === 0 && (proxyContestTopFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Case Studies Records Not Found.</h1>
                                            </div>
                                        }

                                    </section>
                                    
                                   {/* Case Studies Table */}

                                   {/* Proxy Contest Table */}
                                   
                                   <section >
                                        {!loading && proxyContestTopFiveDetails?.vds_report_headers?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                Proxy Contest
                                                            </h1>
                                                        </span>
                                                    </div>
                                                    
                                                </div>

                                                <div>
                                                    <TableWrapper isLoading={proxyContestTopFiveLoading && (proxyContestTopFilter.company_name?.length > 0)}>
                                                        <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                                                            <Table className="table_2 w-full">
                                                                <Table.Thead className="sticky top-50 z-10">
                                                                    <Table.Tr className="row_2">
                                                                        {proxyContestTopFiveDetails?.vds_report_headers?.length > 0 &&
                                                                            proxyContestTopFiveDetails?.vds_report_headers?.map(
                                                                                (vdsHeader: any, headerIndex: number) => (
                                                                                    <Table.Td
                                                                                        key={headerIndex}
                                                                                        className={clsx([
                                                                                            "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]  text-left",
                                                                                            "sticky top-0", // Ensure the header remains sticky at the top
                                                                                            headerIndex === 0 &&
                                                                                            "sticky left-0 bg-header z-[5000] ", // Fix first column
                                                                                            headerIndex === 1 &&
                                                                                            "sticky left-[50px] min-w-[200px] max-w-[250px] bg-header z-[5000] ", // Fix second column (adjust 'left' value according to width)
                                                                                            headerIndex !== 0 && headerIndex !== 1 &&
                                                                                            "min-w-[150px] max-w-[170px] ",
                                                                                        ])}
                                                                                    >
                                                                                        {vdsHeader?.header}
                                                                                    </Table.Td>
                                                                                )
                                                                            )}
                                                                    </Table.Tr>
                                                                </Table.Thead>

                                                                <Table.Tbody>
                                                                    {proxyContestTopFiveDetails?.vds_report?.length > 0 &&
                                                                        proxyContestTopFiveDetails?.vds_report?.map(
                                                                            (vdsProxy: any, vdsProxyIndex: number) => (
                                                                                <Table.Tr
                                                                                    key={vdsProxyIndex}
                                                                                    className="row_2 [&_td]:last:border-b-0"
                                                                                >
                                                                                    {proxyContestTopFiveDetails?.vds_report_headers?.length >
                                                                                        0 &&
                                                                                        proxyContestTopFiveDetails?.vds_report_headers?.map(
                                                                                            (vdsHeader: any, headerIndex: number) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_2 py-2 border-dashed dark:bg-darkmode-600text-left",
                                                                                                        headerIndex === 0 &&
                                                                                                        "sticky left-0 bg-white z-[9]", // Fix first column
                                                                                                        headerIndex === 1 &&
                                                                                                        "sticky left-[50px] min-w-[200px] max-w-[250px]  bg-white z-[9]", // Fix second column
                                                                                                        headerIndex !== 0 && headerIndex !== 1 &&
                                                                                                        "min-w-[150px] max-w-[170px] "
                                                                                                    ])}
                                                                                                >
                                                                                                    {isObject(
                                                                                                        vdsProxy[vdsHeader?.field]
                                                                                                    ) &&
                                                                                                        vdsProxy[vdsHeader?.field]?.notes !==
                                                                                                        null ? (
                                                                                                        <h1
                                                                                                            className={clsx([
                                                                                                                (vdsProxy[
                                                                                                                    vdsHeader?.field
                                                                                                                ]?.vote?.includes("Against") ||
                                                                                                                    vdsProxy[
                                                                                                                        vdsHeader?.field
                                                                                                                    ]?.vote?.includes(
                                                                                                                        "Withhold"
                                                                                                                    )) &&
                                                                                                                "text-red-700 font-semibold",
                                                                                                                "flex items-center",
                                                                                                            ])}
                                                                                                        >
                                                                                                            {
                                                                                                                vdsProxy[vdsHeader?.field]
                                                                                                                    ?.vote === "Split Vote" ? (
                                                                                                                    <Tippy
                                                                                                                        content={
                                                                                                                            isObject(
                                                                                                                                vdsProxy[vdsHeader?.field]
                                                                                                                            ) &&
                                                                                                                            getSplitContents(
                                                                                                                                vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                                                                                            )
                                                                                                                        }
                                                                                                                        options={{ theme: "light" }}
                                                                                                                    >
                                                                                                                        {
                                                                                                                            vdsProxy[vdsHeader?.field]
                                                                                                                                ?.vote
                                                                                                                        }
                                                                                                                    </Tippy>
                                                                                                                ) : (
                                                                                                                    <span className="for">{vdsProxy[vdsHeader?.field]?.vote}</span>
                                                                                                                )}

                                                                                                            {/* <Tippy content={<span dangerouslySetInnerHTML={{ __html: getContent(vdsProxy[vdsHeader?.field]?.notes) ?? '' }}/>}> */}
                                                                                                            <div data-tooltip-id="my-tooltip-data-html"

                                                                                                                data-tooltip-html={vdsProxy[vdsHeader?.field]?.notes}>
                                                                                                                <Lucide
                                                                                                                    icon="Info"
                                                                                                                    className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                                                                                />
                                                                                                                {/* <span className="tooltiptext shadow-md" >
      </span> */}
                                                                                                                {/* </Tippy> */}
                                                                                                            </div>
                                                                                                        </h1>
                                                                                                    ) :
                                                                                                        isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.notes === null ? (
                                                                                                            <h1
                                                                                                                className={clsx([
                                                                                                                    (vdsProxy[
                                                                                                                        vdsHeader?.field
                                                                                                                    ]?.vote?.includes("Against") ||
                                                                                                                        vdsProxy[
                                                                                                                            vdsHeader?.field
                                                                                                                        ]?.vote?.includes("Withhold")) &&
                                                                                                                    "text-red-700 font-semibold",
                                                                                                                ])}
                                                                                                            >
                                                                                                                {vdsProxy[vdsHeader?.field]?.vote !== "Split Vote" ? vdsProxy[vdsHeader?.field]?.vote : ''}
                                                                                                            </h1>
                                                                                                        ) : (
                                                                                                            <h1 className="check">
                                                                                                                {vdsProxy[vdsHeader?.field]}
                                                                                                            </h1>
                                                                                                        )}


                                                                                                    {
                                                                                                        isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.notes === null && vdsProxy[vdsHeader?.field]
                                                                                                            ?.vote === "Split Vote" && (
                                                                                                            <Tippy
                                                                                                                content={
                                                                                                                    isObject(
                                                                                                                        vdsProxy[vdsHeader?.field]
                                                                                                                    ) &&
                                                                                                                    getSplitContents(
                                                                                                                        vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                                                                                    )
                                                                                                                }
                                                                                                                options={{ theme: "light" }}
                                                                                                            >
                                                                                                                {
                                                                                                                    vdsProxy[vdsHeader?.field]
                                                                                                                        ?.vote
                                                                                                                }
                                                                                                            </Tippy>
                                                                                                        )}
                                                                                                </Table.Td>
                                                                                            )
                                                                                        )}
                                                                                </Table.Tr>
                                                                            )
                                                                        )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>

                                                    </TableWrapper>

                                                </div>

                                            </section>
                                        }

                                        {!loading && proxyContestTopFiveDetails?.vds_report_headers?.length === 0 && (proxyContestTopFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Top 5 Proxy Contest Records Not Found.</h1>
                                            </div>
                                        }

                                    </section>
                                    
                                   {/* Proxy Contest Table */}


                                   {/* No Filters Record */}

                                    {(proxyContestTopFilter.company_name?.length === 0) && (
                                        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                            <h1 className="font-semibold"> Select Company (Required)</h1>
                                        </div>
                                    )}

                                   {/* No Filters Record */}


                                    
                                </Tab.Panel>
                            </Tab.Panels>

                            <Tab.Panels className="mt-5">
                                <Tab.Panel className="leading-relaxed">
                                    <div className="">
                                        <div className="p-2">
                                        <div className="font-semibold text-xl py-4">{companyAllHeaderName}</div>
                                            <form onSubmit={handleSubmit(onSubmit)}>

                                                <div className="flex items-end gap-4">
                                                    <div className="w-5/12">
                                                        <div className="text-left text-slate-500 flex justify-between mb-1">
                                                        Select Company
                                                        </div>
                                                        <Controller
                                                            name="company_name"
                                                            control={control}
                                                            defaultValue={[]}
                                                            render={({ field }) => (
                                                                <TomSelect
                                                                    value={field.value || []}

                                                                    onChange={(value) => {
                                                                        field.onChange(value);
                                                                        getAllInstitutionDropdown({"company_name": [value?.target?.value]});
                                                                      }}
                                                                    options={{ placeholder: "Company" }}
                                                                    className="w-full"

                                                                >
                                                                    {
                                                                        apiDropdownOptions.company?.map((company: any) => (
                                                                            <option key={company} value={company}>
                                                                                {company}
                                                                            </option>
                                                                        ))
                                                                    }
                                                                </TomSelect>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className=" w-5/12">
                                                        <div className="text-left text-slate-500 flex justify-between mb-1">
                                                           Select Institution
                                                            
                                                        </div>
                                                        <Controller
                                                            name="institution_name"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <TomSelect
                                                                    value={field.value || []}
                                                                    onChange={(value) => {
                                                                        field.onChange(value);
                                                                    }}
                                                                    options={{
                                                                        placeholder: "Institution",
                                                                    }}
                                                                    className="w-full"
                                                                    multiple
                                                                >
                                                                    <>
                                                                        {apiDropdownOptions?.institution?.length > 0 &&
                                                                            apiDropdownOptions?.institution?.map(
                                                                                (institution: string) => {
                                                                                    return (
                                                                                        <option value={institution}>
                                                                                            {institution}
                                                                                        </option>
                                                                                    );
                                                                                }
                                                                            )}
                                                                    </>
                                                                </TomSelect>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="flex items-center mt-7">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                onFilterClear();
                                                            }}
                                                            className="w-32 ml-auto"
                                                        >
                                                            Clear
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            variant="primary"
                                                            className="w-32 ml-2"
                                                        >
                                                            Apply
                                                        </Button>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                     {/* AGM Summary Table */}
                                    
                                    <section >
                                        {!loading && agmSummaryAllProxyContest?.nominees_headers?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                Meeting Details
                                                            </h1>
                                                            <p className=" italic"> Meeting Date: {meetingAllDate}</p>
                                                        </span>
                                                    </div>
                                                    {/* <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                                                        <Tippy content="Download Excel" options={{ theme: "light" }}>
                                                            <div
                                                                className="box p-[5px] cursor-pointer"
                                                            onClick={convertDivTableToCSV}
                                                            >
                                                                <img alt="download-icon" src={downloadIcon} />
                                                            </div>
                                                        </Tippy>
                                                    </div> */}
                                                </div>
                                                <div className="">
                                                    <TableWrapper>
                                                        <div className="max-h-[30vh] overflow-y-scroll">
                                                            <Table className="table_2 w-full">
                                                                <Table.Thead className="sticky top-0 z-10">
                                                                    <Table.Tr className="row_2">
                                                                        {agmSummaryAllProxyContest?.nominees_headers?.length > 0 &&
                                                                            agmSummaryAllProxyContest?.nominees_headers?.map(
                                                                                (nomineeHeader: any, headerIndex: number) => (
                                                                                    <Table.Td
                                                                                        key={headerIndex}
                                                                                        className={clsx([
                                                                                            "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[150px] text-right",
                                                                                            headerIndex === 0 && "text-left",
                                                                                        ])}
                                                                                    >
                                                                                        {nomineeHeader.header}
                                                                                    </Table.Td>
                                                                                )
                                                                            )}
                                                                    </Table.Tr>
                                                                </Table.Thead>

                                                                <Table.Tbody>
                                                                    {agmSummaryAllProxyContest?.nominees?.length > 0 &&
                                                                        agmSummaryAllProxyContest?.nominees?.map(
                                                                            (nominee: any, nomineeIndex: number) => (
                                                                                <Table.Tr
                                                                                    key={nomineeIndex}
                                                                                    className="row_2 [&_td]:last:border-b-0"
                                                                                >
                                                                                    {agmSummaryAllProxyContest?.nominees_headers?.length >
                                                                                        0 &&
                                                                                        agmSummaryAllProxyContest?.nominees_headers?.map(
                                                                                            (
                                                                                                nomineeHeader: any,
                                                                                                headerIndex: number
                                                                                            ) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-right",
                                                                                                        headerIndex === 0 && "text-left ",
                                                                                                    ])}
                                                                                                >
                                                                                                    <h1
                                                                                                        className={clsx([
                                                                                                            headerIndex === 0 &&
                                                                                                            "font-semibold ",
                                                                                                            headerIndex ===
                                                                                                            agmSummaryAllProxyContest
                                                                                                                ?.nominees_headers?.length -
                                                                                                            1 &&
                                                                                                            parseFloat(
                                                                                                                nominee[nomineeHeader?.field]
                                                                                                            ) < 85 &&
                                                                                                            "text-red-700 font-semibold",
                                                                                                        ])}
                                                                                                    >
                                                                                                        {nominee[nomineeHeader?.field]}
                                                                                                    </h1>
                                                                                                </Table.Td>
                                                                                            )
                                                                                        )}
                                                                                </Table.Tr>
                                                                            )
                                                                        )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>
                                                    </TableWrapper>

                                                    <br />
                                                    <TableWrapper >
                                                        <div className="max-h-[30vh] overflow-y-scroll">
                                                            <Table className="table_3 w-full">
                                                                <Table.Thead className="sticky top-0 z-10">
                                                                    <Table.Tr className="row_3">
                                                                        {agmSummaryAllProxyContest?.proposals_headers?.map(
                                                                            (proposalHeader: any, headerIndex: number) => (
                                                                                <Table.Td
                                                                                    key={headerIndex}
                                                                                    className={clsx([
                                                                                        "cell_3 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[150px] text-right",
                                                                                        headerIndex === 0 && "text-left",
                                                                                    ])}
                                                                                >
                                                                                    {proposalHeader?.header}
                                                                                </Table.Td>
                                                                            )
                                                                        )}
                                                                    </Table.Tr>
                                                                </Table.Thead>

                                                                <Table.Tbody>
                                                                    {agmSummaryAllProxyContest?.proposals?.length > 0 &&
                                                                        agmSummaryAllProxyContest?.proposals?.map(
                                                                            (proposal: any, proposalIndex: number) => (
                                                                                <Table.Tr
                                                                                    key={proposalIndex}
                                                                                    className="row_3 [&_td]:last:border-b-0"
                                                                                >
                                                                                    {agmSummaryAllProxyContest?.proposals_headers?.length >
                                                                                        0 &&
                                                                                        agmSummaryAllProxyContest?.proposals_headers?.map(
                                                                                            (
                                                                                                proposalHeader: any,
                                                                                                headerIndex: number
                                                                                            ) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_3 py-2 border-dashed dark:bg-darkmode-600 text-right",
                                                                                                        headerIndex === 0 && "text-left",
                                                                                                    ])}
                                                                                                >
                                                                                                    <h1
                                                                                                        className={clsx([
                                                                                                            headerIndex === 0 &&
                                                                                                            "font-semibold ",
                                                                                                            headerIndex ===
                                                                                                            agmSummaryAllProxyContest
                                                                                                                ?.proposals_headers?.length -
                                                                                                            1 &&
                                                                                                            parseFloat(
                                                                                                                proposal[proposalHeader?.field]
                                                                                                            ) < 85 &&
                                                                                                            "text-red-700 font-semibold",
                                                                                                        ])}
                                                                                                    >
                                                                                                        {proposal[proposalHeader?.field]}
                                                                                                    </h1>
                                                                                                </Table.Td>
                                                                                            )
                                                                                        )}
                                                                                </Table.Tr>
                                                                            )
                                                                        )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>
                                                    </TableWrapper>
                                                </div>
                                            </section>
                                        }

                                        {!loading && agmSummaryAllProxyContest?.nominees_headers?.length === 0 && (proxyContestinvestorFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Meeting Details Not Found</h1>
                                            </div>
                                        }

                                    </section>
                                    {/* AGM Summary Table */}

                                    <br />

                                    {/* Case Studies Table */}

                                    <section >
                                        {!loading && caseStudiesAllProxy?.vds_report_headers?.length > 0 && caseStudiesTopProxy?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                Case Studies
                                                            </h1>
                                                        </span>
                                                    </div>
                                                    
                                                </div>
                                                <span>
                                                    <div className="">
                                                        <TableWrapper isLoading={loading}>
                                                            <div className="overflow-auto max-h-[400px]">
                                                                <Table>
                                                                    <Table.Thead>
                                                                        <Table.Tr>
                                                                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                                                Institution Name
                                                                            </Table.Td>
                                                                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                Year
                                                                            </Table.Td>
                                                                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                Company
                                                                            </Table.Td>
                                                                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                Theme
                                                                            </Table.Td>

                                                                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[200px]">
                                                                                Industry
                                                                            </Table.Td>
                                                                            <Table.Td className="py-2 flex items-center justify-center font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                                                                                Details
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    </Table.Thead>

                                                                    <Table.Tbody>
                                                                        {caseStudiesAllProxy?.length > 0 &&
                                                                            caseStudiesAllProxy?.map((item: any) => (
                                                                                <Table.Tr
                                                                                    key={item?.id}
                                                                                    className="[&_td]:last:border-b-0"
                                                                                >
                                                                                    <Table.Td className="flex flex-row justify-start items-center py-2 text-nowrap border-dashed dark:bg-darkmode-600">
                                                                                        {item?.institution_logo_url ? (
                                                                                            <>
                                                                                                <div className="w-8 h-8 image-fit zoom-in object-contain !cursor-default">
                                                                                                    <img
                                                                                                        alt="Institution Logo"
                                                                                                        className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                                                                                        src={item?.institution_logo_url}
                                                                                                        content={item?.institution_name || ""}
                                                                                                    />
                                                                                                </div>
                                                                                            </>
                                                                                        ) : (
                                                                                            <div className="flex justify-center items-center w-8 h-8 border rounded-full bg-primary/5 border-primary/10">
                                                                                                <img
                                                                                                    alt="ZMH Analytics"
                                                                                                    className="rounded-full object-contain shadow-[0px_0px_0px_2px_#fff,_1px_1px_5px_rgba(0,0,0,0.32)] dark:shadow-[0px_0px_0px_2px_#3f4865,_1px_1px_5px_rgba(0,0,0,0.32)]"
                                                                                                    src={investorIcon}
                                                                                                />
                                                                                                <a
                                                                                                    href=""
                                                                                                    className="absolute bottom-0 right-0 flex items-center justify-center rounded-full w-7 h-7"
                                                                                                ></a>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="ml-4 max-w-[150px]">
                                                                                            <p className="font-medium whitespace-normal line-clamp-2">
                                                                                                {item?.institution_name}
                                                                                            </p>
                                                                                        </div>
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                        {item?.year}
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                        {item?.company_name}
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                        {item?.esg_themes}
                                                                                    </Table.Td>

                                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px]">
                                                                                        {item?.industry}
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 ">
                                                                                        <div className="flex gap-3 justify-center">
                                                                                            <Tippy
                                                                                                content="See Details"
                                                                                                options={{ theme: "light" }}
                                                                                            >
                                                                                                <Lucide
                                                                                                    onClick={() => {
                                                                                                        navigate(`/case-studies/${item?.id}`);
                                                                                                    }}
                                                                                                    icon="Eye"
                                                                                                    className="w-4 h-4 mr-1.5 stroke-[1.3]"
                                                                                                />
                                                                                            </Tippy>
                                                                                        </div>
                                                                                    </Table.Td>
                                                                                </Table.Tr>
                                                                            ))}
                                                                    </Table.Tbody>
                                                                    {caseStudiesAllProxy?.length === 0 && (
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
                                                            totalPages={totalCaseStudiesTopProxyPages}
                                                            handleNextPage={handleNextPage}
                                                            handlePageChange={handlePageChange}
                                                            handlePreviousPage={handlePreviousPage}
                                                        />
                                                    </div>
                                                </span>

                                            </section>
                                        }

                                        {!loading && caseStudiesAllProxy?.length === 0 && (proxyContestinvestorFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Case Studies Records Not Found.</h1>
                                            </div>
                                        }

                                    </section>

                                    {/* Case Studies Table */}

                                    {/* Proxy Contest Table */}

                                    <section >
                                        {!loading && proxyContestAllInvestorDetails?.vds_report_headers?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                Proxy Contest
                                                            </h1>
                                                        </span>
                                                    </div>
                                                    
                                                </div>

                                                <div>
                                                    <TableWrapper isLoading={proxyContestAllInvestorLoading && (proxyContestinvestorFilter.institution_name?.length > 0 || proxyContestinvestorFilter.company_name?.length > 0)}>
                                                        <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                                                            <Table className="table_2 w-full">
                                                                <Table.Thead className="sticky top-50 z-10">
                                                                    <Table.Tr className="row_2">
                                                                        {proxyContestAllInvestorDetails?.vds_report_headers?.length > 0 &&
                                                                            proxyContestAllInvestorDetails?.vds_report_headers?.map(
                                                                                (vdsHeader: any, headerIndex: number) => (
                                                                                    <Table.Td
                                                                                        key={headerIndex}
                                                                                        className={clsx([
                                                                                            "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]  text-left",
                                                                                            "sticky top-0", // Ensure the header remains sticky at the top
                                                                                            headerIndex === 0 &&
                                                                                            "sticky left-0 bg-header z-[5000] ", // Fix first column
                                                                                            headerIndex === 1 &&
                                                                                            "sticky left-[50px] min-w-[200px] max-w-[250px] bg-header z-[5000] ", // Fix second column (adjust 'left' value according to width)
                                                                                            headerIndex !== 0 && headerIndex !== 1 &&
                                                                                            "min-w-[150px] max-w-[170px] ",
                                                                                        ])}
                                                                                    >
                                                                                        {vdsHeader?.header}
                                                                                    </Table.Td>
                                                                                )
                                                                            )}
                                                                    </Table.Tr>
                                                                </Table.Thead>

                                                                <Table.Tbody>
                                                                    {proxyContestAllInvestorDetails?.vds_report?.length > 0 &&
                                                                        proxyContestAllInvestorDetails?.vds_report?.map(
                                                                            (vdsProxy: any, vdsProxyIndex: number) => (
                                                                                <Table.Tr
                                                                                    key={vdsProxyIndex}
                                                                                    className="row_2 [&_td]:last:border-b-0"
                                                                                >
                                                                                    {proxyContestAllInvestorDetails?.vds_report_headers?.length >
                                                                                        0 &&
                                                                                        proxyContestAllInvestorDetails?.vds_report_headers?.map(
                                                                                            (vdsHeader: any, headerIndex: number) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_2 py-2 border-dashed dark:bg-darkmode-600text-left",
                                                                                                        headerIndex === 0 &&
                                                                                                        "sticky left-0 bg-white z-[9]", // Fix first column
                                                                                                        headerIndex === 1 &&
                                                                                                        "sticky left-[50px] min-w-[200px] max-w-[250px]  bg-white z-[9]", // Fix second column
                                                                                                        headerIndex !== 0 && headerIndex !== 1 &&
                                                                                                        "min-w-[150px] max-w-[170px] "
                                                                                                    ])}
                                                                                                >
                                                                                                    {isObject(
                                                                                                        vdsProxy[vdsHeader?.field]
                                                                                                    ) &&
                                                                                                        vdsProxy[vdsHeader?.field]?.notes !==
                                                                                                        null ? (
                                                                                                        <h1
                                                                                                            className={clsx([
                                                                                                                (vdsProxy[
                                                                                                                    vdsHeader?.field
                                                                                                                ]?.vote?.includes("Against") ||
                                                                                                                    vdsProxy[
                                                                                                                        vdsHeader?.field
                                                                                                                    ]?.vote?.includes(
                                                                                                                        "Withhold"
                                                                                                                    )) &&
                                                                                                                "text-red-700 font-semibold",
                                                                                                                "flex items-center",
                                                                                                            ])}
                                                                                                        >
                                                                                                            {
                                                                                                                vdsProxy[vdsHeader?.field]
                                                                                                                    ?.vote === "Split Vote" ? (
                                                                                                                    <Tippy
                                                                                                                        content={
                                                                                                                            isObject(
                                                                                                                                vdsProxy[vdsHeader?.field]
                                                                                                                            ) &&
                                                                                                                            getSplitContents(
                                                                                                                                vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                                                                                            )
                                                                                                                        }
                                                                                                                        options={{ theme: "light" }}
                                                                                                                    >
                                                                                                                        {
                                                                                                                            vdsProxy[vdsHeader?.field]
                                                                                                                                ?.vote
                                                                                                                        }
                                                                                                                    </Tippy>
                                                                                                                ) : (
                                                                                                                    <span className="for">{vdsProxy[vdsHeader?.field]?.vote}</span>
                                                                                                                )}

                                                                                                            {/* <Tippy content={<span dangerouslySetInnerHTML={{ __html: getContent(vdsProxy[vdsHeader?.field]?.notes) ?? '' }}/>}> */}
                                                                                                            <div data-tooltip-id="my-tooltip-data-html"

                                                                                                                data-tooltip-html={vdsProxy[vdsHeader?.field]?.notes}>
                                                                                                                <Lucide
                                                                                                                    icon="Info"
                                                                                                                    className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                                                                                />
                                                                                                                {/* <span className="tooltiptext shadow-md" >
      </span> */}
                                                                                                                {/* </Tippy> */}
                                                                                                            </div>
                                                                                                        </h1>
                                                                                                    ) :
                                                                                                        isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.notes === null ? (
                                                                                                            <h1
                                                                                                                className={clsx([
                                                                                                                    (vdsProxy[
                                                                                                                        vdsHeader?.field
                                                                                                                    ]?.vote?.includes("Against") ||
                                                                                                                        vdsProxy[
                                                                                                                            vdsHeader?.field
                                                                                                                        ]?.vote?.includes("Withhold")) &&
                                                                                                                    "text-red-700 font-semibold",
                                                                                                                ])}
                                                                                                            >
                                                                                                                {vdsProxy[vdsHeader?.field]?.vote !== "Split Vote" ? vdsProxy[vdsHeader?.field]?.vote : ''}
                                                                                                            </h1>
                                                                                                        ) : (
                                                                                                            <h1 className="check">
                                                                                                                {vdsProxy[vdsHeader?.field]}
                                                                                                            </h1>
                                                                                                        )}


                                                                                                    {
                                                                                                        isObject(vdsProxy[vdsHeader?.field]) && vdsProxy[vdsHeader?.field]?.notes === null && vdsProxy[vdsHeader?.field]
                                                                                                            ?.vote === "Split Vote" && (
                                                                                                            <Tippy
                                                                                                                content={
                                                                                                                    isObject(
                                                                                                                        vdsProxy[vdsHeader?.field]
                                                                                                                    ) &&
                                                                                                                    getSplitContents(
                                                                                                                        vdsProxy[vdsHeader?.field]?.split_vote_counts
                                                                                                                    )
                                                                                                                }
                                                                                                                options={{ theme: "light" }}
                                                                                                            >
                                                                                                                {
                                                                                                                    vdsProxy[vdsHeader?.field]
                                                                                                                        ?.vote
                                                                                                                }
                                                                                                            </Tippy>
                                                                                                        )}
                                                                                                </Table.Td>
                                                                                            )
                                                                                        )}
                                                                                </Table.Tr>
                                                                            )
                                                                        )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>

                                                    </TableWrapper>

                                                </div>

                                            </section>
                                        }

                                        {!loading && proxyContestAllInvestorDetails?.vds_report_headers?.length === 0 && (proxyContestinvestorFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">All Proxy Contest Records Not Found.</h1>
                                            </div>
                                        }

                                    </section>

                                    {/* Proxy Contest Table */}


                                    {/* No Filters Record */}

                                    {(proxyContestinvestorFilter.company_name?.length === 0) && (
                                        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                            <h1 className="font-semibold"> Select Company (Required)</h1>
                                        </div>
                                    )}

                                    {/* No Filters Record */}
                                    

                                </Tab.Panel>
                            </Tab.Panels>
                        </Tab.Group>
                    </>
                </div>
            </div>
            {/* )} */}

            <Tooltip id="my-tooltip-data-html" style={{ zIndex: 10, backgroundColor: "#ffffff", color: "#000000", width: 400, boxShadow: '2px 4px 6px rgba(0, 0, 0, 0.2)' }} />
        </>
    );
};

export default index;
