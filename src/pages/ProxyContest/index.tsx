import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { convertToTitleCase, createDynamicURL, downloadCSV } from "@/utils/helper";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
    fetchAGMProxyAllContestDashboard,
    fetchAGMProxyContestDashboard,
    fetchCaseStudiesAllProxyContext,
    fetchCaseStudiesTopProxyContext,
    fetchProxyContestReleaseDashboard,
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
import CaseProxyModal from "./CaseProxyModal";
import LoadingIcon from "@/components/Base/LoadingIcon";
import PdfViewer from "@/components/PdfView";

const index = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch: AppDispatch = useAppDispatch();
    const { proxyContestReleaseLoading, proxyContestReleaseDetails, proxyContestTopFiveDetails, agmSummaryProxyContest, loading,
        proxyContestTopFiveLoading, tab, proxyContestTopFilter, caseStudiesTopProxy, agmSummaryAllProxyContest,
        page, totalCaseStudiesTopProxyPages, } = useAppSelector(
            (state) => state.dashboard
        );
    const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
        (state: RootState) => state.authentiction
    );
    const [pdfVisible, setPdfVisible] = useState<boolean>(false);
    const [currentPdfDoc, setCurrentPdfDoc] = useState<string>("");
    const [currentPdfName, setCurrentPdfName] = useState<string>("");
    const [modifyActicismData, setmodifyActicismData] = useState<any[]>([]);


    const [companyHeaderName, setCompanyHeaderName] = useState<string | null>(null);
    const [companyAllHeaderName, setCompanyAllHeaderName] = useState<string | null>(null);
    const [caseProxyModalVisible, setCaseProxyModalVisible] =
        useState<boolean>(false);
    const [caseProxyModalData, setCaseProxyModalData] = useState<any>(null);
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

const gotoDetailPage = (pdf: string, pdf_name: string) => {
    setCurrentPdfDoc(pdf);
    setCurrentPdfName(pdf_name);
  };

  const getModulesCount = async () => {
    try {
      const res = await dashboardService.getModulesCount({global_search:companyGlobalSearchName});
      if (res?.result) {
          if (res?.result?.proxy_contest) {
            setValue("company_name", companyGlobalSearchName);
            const applyFilter = { company_name: [companyGlobalSearchName], top: 'true', institution_clear: false  };
            Object.entries(applyFilter).forEach(([key, value]) => {
                dispatch(setProxyTopFilter({ key: key as any, value }));
            });
          }
        
      }
    } catch (error) {
      return error;
    } finally {
    }
  };

 
    useEffect(() => {
        getModulesCount();
        return () => {
            setValue("company_name", []);
            const applyFilter = { company_name: [], top: 'true', institution_clear: false };
            Object.entries(applyFilter).forEach(([key, value]) => {
                dispatch(setProxyTopFilter({ key: key as any, value }));
            });
        }
    }, [])

    useEffect(() => {

        // if (tab === 'Top-20') {
        if (proxyContestTopFilter?.company_name?.length > 0) {
            let { institution_clear, ...restFilter } = proxyContestTopFilter;
            dispatch(
                fetchProxyTopFiveContestDashboard(
                    createDynamicURL(`${baseURL}/vds_proxy_voting/`, { ...restFilter }))
            );
        } else {
            dispatch(
                fetchProxyTopFiveContestDashboard(
                    createDynamicURL(`${baseURL}/vds_proxy_voting/`))
            );
        }

        if (proxyContestTopFilter?.company_name?.length > 0) {

            if (((proxyContestTopFilter?.institution_name?.length === 0 || !proxyContestTopFilter?.institution_name) && (proxyContestTopFilter?.institution_clear === false) )) {
                dispatch(
                    fetchAGMProxyContestDashboard(
                        createDynamicURL(
                            `${baseURL}/voting_report_8k/`, { company_name: proxyContestTopFilter?.company_name })
                    )
                );
                dispatch(
                    fetchCaseStudiesTopProxyContext(
                        createDynamicURL(
                            `${baseURL}/case_studies/`, { company_name: proxyContestTopFilter?.company_name, themes: ['Proxy Contest/M&A'] }, undefined,
                            page)
                    )
                );
                dispatch(
                    fetchProxyContestReleaseDashboard(
                        createDynamicURL(
                            `${baseURL}/activism_tables/`, { company_name: proxyContestTopFilter?.company_name[0] })
                    )
                );
            }
        }

        else {
            dispatch(
                fetchAGMProxyContestDashboard(
                    createDynamicURL(
                        `${baseURL}/voting_report_8k/`, { ticker: '' })
                )
            );
            dispatch(
                fetchCaseStudiesTopProxyContext(
                    createDynamicURL(
                        `${baseURL}/case_studies/`, { company_name: [""] })
                )
            );
            dispatch(
                fetchProxyContestReleaseDashboard(
                    createDynamicURL(
                        `${baseURL}/activism_tables/`, { company_name: "" })
                )
            );
            setmodifyActicismData([]);

        }
        setCompanyHeaderName(proxyContestTopFilter?.company_name[0]);
        // }
    }, [proxyContestTopFilter, tab])


    useEffect(() => {
        const transformedData = transformData(proxyContestReleaseDetails?.Activism_ISS_GL);
        setmodifyActicismData(transformedData);

    }, [proxyContestTopFilter, proxyContestReleaseDetails])

    
    const transformData = (data:any) => {
        const groupedData: any = {};

        data?.forEach((entry:any) => {
            const { company_id, type, management, activist, split, company_tent, id } = entry;

            if (!groupedData[company_tent]) {
                groupedData[company_tent] = {
                    company: company_tent,
                    iss: { management: "", activist: "", split: "" },
                    gl: { management: "", activist: "", split: "" }
                };
            }

            const typeKey = type.toLowerCase();
            groupedData[company_tent][typeKey] = {
                management: management ? true : false,
                activist: activist ? true : false,
                split: split ? true : false,
            };
        });

        return Object.values(groupedData);
    };

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

    const getAllInstitutionDropdown = async (params?: any) => {
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

        if (proxyFilter?.institution_name?.length === 0) {
            toast.warning("Please select Institution");
            return;
        }
        const applyFilter = { company_name: proxyContestTopFilter?.company_name, institution_name: proxyFilter?.institution_name, top: null, institution_clear: false};
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
    };

    const onFilterClear = () => {
        resetFormValues();
        const applyFilter = {institution_name: [], top: 'true', institution_clear: true};
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
    };

    const resetFormValues: any = () => {
        setValue("institution_name", []);
        // setValue("company_name", 'Select');
    };

    const onSubmitTopFive = async (proxyFilter: any) => {

        if (proxyFilter?.company_name === "Select") {
            toast.warning("Please select Company");
            return;
        }
        resetFormValues();
        const instituteFilter = { institution_name: [], institution_clear: false };
        Object.entries(instituteFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
        const applyFilter = { company_name: [proxyFilter?.company_name], top: 'true', institution_clear: false  };
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
        // setProxyTopFilter({company_name: [proxyFilter?.company_name], top: 'true'})
    };

    const onTopFiveFilterClear = () => {
        resetTopFiveFormValues();
        // setCompanyFilter({company_name: [], top: false})
        const applyFilter = { company_name: [], top: 'false', institution_clear: false };
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

    const convertDivTableToCSV = () => {
        const table = document.querySelector(".table_2");
        const rows = table?.querySelectorAll(".row_2");
        const tableProposal = document.querySelector(".table_3");
        const rowsProposal = tableProposal?.querySelectorAll(".row_3");
        let csvContent = "\uFEFF"; // Add BOM for UTF-8 encoding
    
        // Iterate over each row in the first table
        rows?.forEach((row) => {
          const cells = row.querySelectorAll(".cell_2");
          let rowData: any = [];
    
          // Iterate over each cell and get the text content
          cells.forEach((cell) => {
            let cellText = cell.textContent?.trim(); // Get text content and trim any extra spaces
    
            // Check if the cell contains a comma, wrap it in double quotes
            if (cellText?.includes(",")) {
              cellText = `"${cellText}"`;
            }
    
            rowData.push(cellText);
          });
    
          // Join cells with commas to form a CSV row
          csvContent += rowData.join(",") + "\n";
        });
    
        // Iterate over each row in the second table
        rowsProposal?.forEach((row) => {
          const cells = row.querySelectorAll(".cell_3");
          let rowData: any = [];
    
          // Iterate over each cell and get the text content
          cells.forEach((cell) => {
            let cellText = cell.textContent?.trim();
    
            // Check if the cell contains a comma, wrap it in double quotes
            if (cellText?.includes(",")) {
              cellText = `"${cellText}"`;
            }
    
            rowData.push(cellText);
          });
    
          csvContent += rowData.join(",") + "\n";
        });

        downloadCSV(csvContent, `Meeting-Details-${proxyContestTopFilter?.company_name}`);
    };

    const convertVotingDivTableToCSV = (tabName: string) => {
        const table = document.querySelector(".table_voting");
        const rows = table?.querySelectorAll(".row_voting");
        const tooltip = document.querySelectorAll(".my-tooltip-data-html");
        
        let csvContent = "\uFEFF";        
        rows?.forEach((row) => {
          const cells = row.querySelectorAll(".cell_voting");
          let rowData: any = [];
    
          cells.forEach((cell) => {
              let cellText = cell.textContent?.trim();
              if (cellText?.includes(",")) {
                  cellText = `"${cellText}"`;
              }
    
              const tooltip = cell.querySelector('[data-tooltip-html]');
              const tooltipText = tooltip?.getAttribute("data-tooltip-html")?.trim();
              
              if (tooltipText) {
                  cellText += ` (voting rationale: ${tooltipText})`;
              }
    
            if (cellText) {
              cellText = `"${cellText.replace(/"/g, '""')}"`;
            }
    
              rowData.push(cellText);
          });
    
          csvContent += rowData.join(",") + "\n";
      });
    
        downloadCSV(csvContent, `${tabName}-${proxyContestTopFilter?.company_name}`);
      };


    return (
        <>
            {/* <Button
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
            </Button> */}

            <div className="p-5 mt-1 box">

                <div className="w-full">
                    <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                    </div>
                    <>
                        <Tab.Group selectedIndex={getSelectedTabIndex()}>
                            <Tab.List variant="link-tabs">
                            </Tab.List>

                            <Tab.Panels className="mt-5">
                                <Tab.Panel className="leading-relaxed">
                                    <div className="">
                                        <div className="p-2">

                                            <form onSubmit={handleSubmit(onSubmitTopFive)}>

                                                <div className="flex items-end gap-4">
                                                    <div className="w-4/12">
                                                        <div className="text-left text-slate-500 flex justify-between mb-1">
                                                            Select Company*
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
                                                                        getAllInstitutionDropdown({"company_name": [event?.target?.value]});
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

                                        <div className="font-bold text-2xl pt-4">{companyHeaderName}</div>

                                    </div>

                                    {/* AGM Summary Table */}

                                    <section >
                                        {!loading && modifyActicismData?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                            Proxy Advisory Firm Recommendation
                                                            </h1>
                                                        </span>
                                                    </div>
                                                </div>
                                                <TableWrapper>
                                                    <div>
                                                        <Table className="table">
                                                            <Table.Thead>
                                                                <Table.Tr className="row">
                                                                    <Table.Td
                                                                        rowSpan={2}
                                                                        className="px-5  dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500 border-r-2 bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem]  text-[#000000B2]"
                                                                    >
                                                                        {/* Company */}
                                                                    </Table.Td>
                                                                    <Table.Td
                                                                        colSpan={3}
                                                                        className="px-5 min-w-[150px] max-w-[170px] dark:border-darkmode-300 py-2 font-semibold h-[50px] bg-header border-gray-500 border-r-2 text-[#000000B2] text-center"
                                                                    >
                                                                        ISS
                                                                    </Table.Td>
                                                                    <Table.Td
                                                                        colSpan={3}
                                                                        className="px-5  dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500  bg-header text-[#000000B2] text-center"
                                                                    >
                                                                        GL
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                                <Table.Tr className="row">
                                                                    {/* px-5 border-b dark:border-darkmode-300 cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] text-left sticky top-0 min-w-[150px] max-w-[170px] */}
                                                                    <Table.Td className="px-5 min-w-[100px] max-w-[120px]  dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500  bg-header  text-[#000000B2] text-center">
                                                                        Management
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5  min-w-[100px] max-w-[120px]  dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500  bg-header  text-[#000000B2] text-center">
                                                                        Activist
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5  min-w-[100px] max-w-[120px] dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500 border-r-2 bg-header  text-[#000000B2] text-center">
                                                                        Split
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5  min-w-[100px] max-w-[120px] dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500  bg-header  text-[#000000B2] text-center">
                                                                        Management
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5 min-w-[100px] max-w-[120px]  dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500  bg-header  text-[#000000B2] text-center">
                                                                        Activist
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5  min-w-[100px] max-w-[120px] dark:border-darkmode-300 py-2 font-semibold h-[50px] border-gray-500  bg-header  text-[#000000B2] text-center">
                                                                        Split
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {modifyActicismData?.map((row: any, index: any) => (
                                                                    <Table.Tr
                                                                        key={index}
                                                                        // className={`row [&_td]:last:border-b-0 ${row.highlighted ? "highlighted-row" : ""
                                                                        //     }`}
                                                                    >
                                                                        <Table.Td className="px-5 border-b-0 font-bold dark:border-darkmode-300 agm_cell_2 py-2 border-dashed dark:bg-darkmode-600 text-left">
                                                                            {row.company}
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-l-2 border-gray-500 border-b-0 dark:border-darkmode-300 py-2 text-center">
                                                                        {row.iss.management === true && (
                                                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                                                        &#10004;
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-b-0 dark:border-darkmode-300 py-2 text-center">
                                                                            {row.iss.activist === true && (
                                                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                                                        &#10004;
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-r-2 border-b-0 border-gray-500 dark:border-darkmode-300 py-2 text-center">
                                                                        {row.iss.split === true && (
                                                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                                                        &#10004;
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-b-0 dark:border-darkmode-300 py-2 text-center">
                                                                        {row.gl.management === true && (
                                                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                                                        &#10004;
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-b-0 dark:border-darkmode-300 py-2 text-center">
                                                                        {row.gl.activist === true && (
                                                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                                                        &#10004;
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-b-0 dark:border-darkmode-300 py-2 text-center">
                                                                        {row.gl.split === true && (
                                                                                <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className="bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white ">
                                                                                        &#10004;
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Table.Td>
                                                                    </Table.Tr>
                                                                ))}
                                                            </Table.Tbody>
                                                        </Table>
                                                    </div>
                                                </TableWrapper>

                                            </section>
                                        }

                                    </section>

                                    {/* Case Studies Table */}

                                    <section >
                                        {!loading && caseStudiesTopProxy?.length > 0 &&

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
                                                                                                        setCaseProxyModalVisible(true);
                                                                                                        setCaseProxyModalData(item);
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
                                                                            <h1 className="mt-3">No case study available</h1>
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

                                        {/* {!loading && caseStudiesTopProxy?.length === 0 && (proxyContestTopFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Case Studies Records Not Found.</h1>
                                            </div>
                                        } */}

                                    </section>

                                    {/* Case Studies Table */}

                                    <div className="flex items-start gap-4 justify-center xs:flex-col md:flex-row">
                                    <section className="flex-1" >
                                        {!loading && proxyContestReleaseDetails?.Activism_Presentation?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                            Company and Investor Presentations
                                                            </h1>
                                                        </span>
                                                    </div>
                                                </div>
                                                <TableWrapper>
                                                    <div>
                                                        <Table className="table">
                                                            <Table.Thead>
                                                                <Table.Tr className="row">
                                                                    <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] min-w-[120px] max-w-[140px] ">
                                                                        {/* Document Name */}
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] text-center min-w-[20px] max-w-[40px]">
                                                                        View
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {proxyContestReleaseDetails?.Activism_Presentation?.length > 0 &&
                                                                    proxyContestReleaseDetails?.Activism_Presentation?.map((document: any) => (
                                                                        <Table.Tr
                                                                            key={document.name}
                                                                            className="row [&_td]:last:border-b-0"
                                                                        >
                                                                            <Table.Td className="px-5 border-b dark:border-darkmode-300 agm_cell_2 py-2 border-dashed dark:bg-darkmode-600 text-left">
                                                                                <div className="flex justify-between items-center ">
                                                                                    <div>
                                                                                        <h1
                                                                                            onClick={() => {
                                                                                                gotoDetailPage(
                                                                                                    document?.document_url!,
                                                                                                    document?.document_name!
                                                                                                );

                                                                                                setPdfVisible(true);
                                                                                            }}
                                                                                            className="font-semibold cursor-pointer hover:underline"
                                                                                        >
                                                                                            {document?.document_name}
                                                                                        </h1>
                                                                                    </div>
                                                                                </div>
                                                                            </Table.Td>
                                                                            <Table.Td className="px-5 border-b dark:border-darkmode-300 agm_cell_2 py-2 border-dashed dark:bg-darkmode-600 text-left">
                                                                                <div className="flex justify-center items-center h-full">
                                                                                    <Tippy
                                                                                        content="See Details"
                                                                                        options={{
                                                                                            theme: "light",
                                                                                        }}
                                                                                    >
                                                                                        <Lucide
                                                                                            onClick={() => {
                                                                                                gotoDetailPage(
                                                                                                    document?.document_url!,
                                                                                                    document?.document_name!
                                                                                                );

                                                                                                setPdfVisible(true);
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
                                                        </Table>
                                                    </div>
                                                </TableWrapper>
                                            </section>
                                        }

                                    </section>

                                    <section className="flex-1"  >
                                        {!loading && proxyContestReleaseDetails?.Activism_Press_Release?.length > 0 &&

                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                            Press Releases Mentioning ISS and GL Recommendations
                                                            </h1>
                                                        </span>
                                                    </div>
                                                </div>
                                                <TableWrapper>
                                                    <div>
                                                        <Table className="table">
                                                            <Table.Thead>
                                                            <Table.Tr className="row">
                                                                    <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] min-w-[120px] max-w-[140px] ">
                                                                        {/* Document Name */}
                                                                    </Table.Td>
                                                                    <Table.Td className="px-5 border-b dark:border-darkmode-300 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2] text-center min-w-[20px] max-w-[40px]">
                                                                        View
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {proxyContestReleaseDetails?.Activism_Press_Release?.length > 0 &&
                                                                    proxyContestReleaseDetails?.Activism_Press_Release?.map((document: any) => (
                                                                        <Table.Tr
                                                                        key={document.name}
                                                                        className="row [&_td]:last:border-b-0"
                                                                    >
                                                                        <Table.Td className="px-5 border-b dark:border-darkmode-300 agm_cell_2 py-2 border-dashed dark:bg-darkmode-600 text-left">
                                                                            <div className="flex justify-between items-center ">
                                                                                <div>
                                                                                    <h1
                                                                                        onClick={() => {
                                                                                            gotoDetailPage(
                                                                                                document?.document_url!,
                                                                                                document?.document_name!
                                                                                            );

                                                                                            setPdfVisible(true);
                                                                                        }}
                                                                                        className="font-semibold cursor-pointer hover:underline"
                                                                                    >
                                                                                        {document?.document_name}
                                                                                    </h1>
                                                                                </div>
                                                                            </div>
                                                                        </Table.Td>
                                                                        <Table.Td className="px-5 border-b dark:border-darkmode-300 agm_cell_2 py-2 border-dashed dark:bg-darkmode-600 text-left">
                                                                            <div className="flex justify-center items-center h-full">
                                                                                <Tippy
                                                                                    content="See Details"
                                                                                    options={{
                                                                                        theme: "light",
                                                                                    }}
                                                                                >
                                                                                    <Lucide
                                                                                        onClick={() => {
                                                                                            gotoDetailPage(
                                                                                                document?.document_url!,
                                                                                                document?.document_name!
                                                                                            );

                                                                                            setPdfVisible(true);
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
                                                        </Table>
                                                    </div>
                                                </TableWrapper>
                                            </section>
                                        }

                                    </section>
                                    </div>

                                    {/* AGM Summary Table */}

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
                                                    <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
                                                        <Tippy content="Download Excel" options={{ theme: "light" }}>
                                                            <div
                                                                className="box p-[5px] cursor-pointer"
                                                                onClick={convertDivTableToCSV}
                                                            >
                                                                <img alt="download-icon" src={downloadIcon} />
                                                            </div>
                                                        </Tippy>
                                                    </div>
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

                                        {/* {!loading && agmSummaryProxyContest?.nominees_headers?.length === 0 && (proxyContestTopFilter.company_name?.length > 0) &&
                                            <div className=" h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                <h1 className="font-semibold">Meeting Details Not Found</h1>
                                            </div>
                                        } */}

                                    </section>
                                    {/* AGM Summary Table */}

                                    <br />

                                    {/* Proxy Contest Table */}

                                    <section >
                                        {!loading && proxyContestTopFilter?.company_name?.length > 0 &&
                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
                                                                {/* Proxy Contest */}
                                                                Director Voting Details 
                                                                {proxyContestTopFilter?.institution_name?.length > 0 ? "" : ' (Top 5)'}
                                                            </h1>
                                                            
                                                        </span>
                                                    </div>
                                                    
                                                </div>

                                                <div className="py-2">

                                                        <form onSubmit={handleSubmit(onSubmit)}>

                                                            <div className="flex items-end gap-4">
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
                                                                                // selectedLimit={3}
                                                                            options={{placeholder: "Institution", maxItems: 3, closeAfterSelect: true}}
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

                                                        <div className="flex items-center justify-end">
                                                        <Tippy content="Download Excel" options={{ theme: "light" }}>
                                                            <div
                                                                className="box p-[5px] cursor-pointer"
                                                                onClick={() => convertVotingDivTableToCSV('Voting-Details')}
                                                            >
                                                                <img alt="download-icon" src={downloadIcon} />
                                                            </div>
                                                        </Tippy>
                                                        </div>

                                                </div>

                                                {(proxyContestTopFiveDetails === "" && proxyContestTopFiveLoading) && (
                                                    <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                                        {/* <h1 className="font-semibold">Loading...</h1> */}
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                                                            <LoadingIcon
                                                                color="#800000"
                                                                icon="three-dots"
                                                                className="w-16 h-16"
                                                            />
                                                        </div>
                                                    </div>
                                                )}


                                                <div>
                                                    <TableWrapper isLoading={false}>
                                                        <div className="overflow-x-auto max-h-[60vh] overflow-y-scroll">
                                                            <Table className="table_voting w-full">
                                                                <Table.Thead className="sticky top-50 z-10">
                                                                    <Table.Tr className="row_voting">
                                                                        {proxyContestTopFiveDetails?.vds_report_headers?.length > 0 &&
                                                                            proxyContestTopFiveDetails?.vds_report_headers?.map(
                                                                                (vdsHeader: any, headerIndex: number) => (
                                                                                    <Table.Td
                                                                                        key={headerIndex}
                                                                                        className={clsx([
                                                                                            "cell_voting py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]  text-left",
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
                                                                                    className="row_voting [&_td]:last:border-b-0"
                                                                                >
                                                                                    {proxyContestTopFiveDetails?.vds_report_headers?.length >
                                                                                        0 &&
                                                                                        proxyContestTopFiveDetails?.vds_report_headers?.map(
                                                                                            (vdsHeader: any, headerIndex: number) => (
                                                                                                <Table.Td
                                                                                                    key={headerIndex}
                                                                                                    className={clsx([
                                                                                                        "cell_voting py-2 border-dashed dark:bg-darkmode-600text-left",
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
                                                                {proxyContestTopFiveDetails?.vds_report_headers?.length === 0 && (
                                                                    <div className="w-full">
                                                                        <h1 className="mt-3">No voting details available</h1>
                                                                    </div>
                                                                )}
                                                            </Table>
                                                        </div>

                                                    </TableWrapper>

                                                </div>

                                            </section>
                                        }
                                    </section>

                                    

                                    {/* Proxy Contest Table */}


                                    {/* No Filters Record */}

                                    {(proxyContestTopFilter.company_name?.length === 0 && !proxyContestTopFiveLoading) && (
                                        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                                            <h1 className="font-semibold"></h1>
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

            {caseProxyModalVisible && (
                <CaseProxyModal
                    caseProxyModalVisible={caseProxyModalVisible}
                    setCaseProxyModalVisible={setCaseProxyModalVisible}
                    caseProxyModalData={caseProxyModalData}
                />
            )}

            {pdfVisible && (
                <PdfViewer
                    setPdfVisible={setPdfVisible}
                    pdfVisible={pdfVisible}
                    file={currentPdfDoc}
                    file_name={currentPdfName}
                />
            )}
            <Tooltip id="my-tooltip-data-html" style={{ zIndex: 10, backgroundColor: "#ffffff", color: "#000000", width: 400, boxShadow: '2px 4px 6px rgba(0, 0, 0, 0.2)' }} />
        </>
    );
};

export default index;
