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
import axios from "axios";
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
import { getProxyContestDropdownValues } from "@/services/proxyContestDropdown";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { FaBuilding, FaCalendarAlt, FaTimes } from "react-icons/fa";
import { Popover } from "@/components/Base/Headless";
import { countValidFilters, generateFilterChips } from "@/utils/helper";

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

    // New state for proxy contest companies table
    const [proxyContestCompanies, setProxyContestCompanies] = useState<any[]>([]);
    const [proxyContestLoading, setProxyContestLoading] = useState<boolean>(false);
    const [proxyContestPage, setProxyContestPage] = useState<number>(1);
    const [proxyContestTotal, setProxyContestTotal] = useState<number>(0);
    const pageSize = 30;

    // Modal states for different icon clicks
    const [detailsModalVisible, setDetailsModalVisible] = useState<boolean>(false);
    const [modalType, setModalType] = useState<string>('');
    const [modalTitle, setModalTitle] = useState<string>('');
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [modalLoading, setModalLoading] = useState<boolean>(false);


    // Filter states
    const [isFilterCollapse, setIsFilterCollapse] = useState<boolean>(false);
    const [filtersLength, setFiltersLength] = useState<number>(0);
    const [selectedChipFilters, setSelectedChipFilters] = useState<any>([]);
    const [allApplyFilter, setAllApplyFilter] = useState<any>({});
    const [companyOptions, setCompanyOptions] = useState<string[]>([]);
    const [yearOptions, setYearOptions] = useState<string[]>([]);
    const [dropdownLoading, setDropdownLoading] = useState<boolean>(false);

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
                company: [],
                year: [],
            },
        });

    // Fetch dropdown values
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                setDropdownLoading(true);
                const data = await getProxyContestDropdownValues();
                console.log("Proxy Contest Dropdown API Response:", data); // Debug log

                // Extract companies from proxy_companies if available
                const companies: any[] = data.proxy_companies ?
                    [...new Set(data.proxy_companies.map((company: any) => company.company_name).filter(Boolean))] :
                    [];
                console.log("Extracted companies:", companies); // Debug log
                console.log("Years from API:", data.years); // Debug log

                setCompanyOptions(companies);
                setYearOptions((data.years || []) as string[]);
            } catch (error) {
                console.error("Error fetching dropdown data:", error);
                setCompanyOptions([]);
                setYearOptions([]);
            } finally {
                setDropdownLoading(false);
            }
        };
        fetchDropdownData();
    }, []);

    // Fetch initial data
    useEffect(() => {
        fetchProxyContestCompanies(1);
    }, []);


    const gotoDetailPage = (pdf: string, pdf_name: string) => {
        setCurrentPdfDoc(pdf);
        setCurrentPdfName(pdf_name);
    };

    const getModulesCount = async () => {
        try {
            const res = await dashboardService.getModulesCount({ global_search: companyGlobalSearchName });
            if (res?.result) {
                if (res?.result?.proxy_contest) {
                    setValue("company_name", companyGlobalSearchName);
                    const applyFilter = { company_name: [companyGlobalSearchName], top: 'true', institution_clear: false };
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

    const fetchProxyContestCompanies = async (page: number = 1, filters: any = {}) => {
        setProxyContestLoading(true);
        try {
            console.log(`Fetching proxy contest companies for page: ${page}`); // Debug log

            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('page_size', pageSize.toString());

            // Add filters to params
            if (filters.company && filters.company.length > 0) {
                params.append('company_name', JSON.stringify(filters.company));
            }
            if (filters.year && filters.year.length > 0) {
                params.append('year', JSON.stringify(filters.year));
            }

            const response = await fetch(`${baseURL}/api/proxy-contest-companies/?${params.toString()}`, {
                headers: {
                    'Authorization': `JWT ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`API Response for page ${page}:`, data); // Debug log
            setProxyContestCompanies(data.results || []);
            setProxyContestTotal(data.count || 0);
        } catch (error) {
            toast.error("Failed to fetch proxy contest companies");
            console.error("Error fetching proxy contest companies:", error);
        } finally {
            setProxyContestLoading(false);
        }
    };

    const handleProxyContestNextPage = () => {
        if (proxyContestPage < Math.ceil(proxyContestTotal / pageSize)) {
            const nextPage = proxyContestPage + 1;
            setProxyContestPage(nextPage);
            fetchProxyContestCompanies(nextPage, allApplyFilter);
        }
    };

    const handleProxyContestPreviousPage = () => {
        if (proxyContestPage > 1) {
            const prevPage = proxyContestPage - 1;
            setProxyContestPage(prevPage);
            fetchProxyContestCompanies(prevPage, allApplyFilter);
        }
    };

    const handleProxyContestPageChange = (newPage: number) => {
        setProxyContestPage(newPage);
        fetchProxyContestCompanies(newPage, allApplyFilter);
    };

    // Filter functions
    const handleCollapseFilter = () => {
        setIsFilterCollapse(!isFilterCollapse);
    };

    const onFilterSubmit = (data: any) => {
        const filterObj = {
            company: data?.company || [],
            year: data?.year || [],
        };

        setAllApplyFilter(filterObj);
        setFiltersLength(countValidFilters(filterObj));
        setSelectedChipFilters(generateFilterChips(filterObj));
        setProxyContestPage(1);
        fetchProxyContestCompanies(1, filterObj);
        setIsFilterCollapse(false);
    };

    const onFilterClear = () => {
        setSelectedChipFilters([]);
        setFiltersLength(0);
        setAllApplyFilter({});
        reset({
            company: [],
            year: [],
        });
        setProxyContestPage(1);
        fetchProxyContestCompanies(1, {});
    };

    const handleRemoveChip = (removeKey: any, removeValue: any) => {
        const currentFilters = { ...allApplyFilter };

        if (currentFilters[removeKey]) {
            if (Array.isArray(currentFilters[removeKey])) {
                currentFilters[removeKey] = currentFilters[removeKey].filter(
                    (item: any) => item !== removeValue
                );
                if (currentFilters[removeKey].length === 0) {
                    delete currentFilters[removeKey];
                }
            } else {
                delete currentFilters[removeKey];
            }
        }

        setAllApplyFilter(currentFilters);
        setFiltersLength(countValidFilters(currentFilters));
        setSelectedChipFilters(generateFilterChips(currentFilters));

        // Update form values
        setValue(removeKey, currentFilters[removeKey] || []);

        setProxyContestPage(1);
        fetchProxyContestCompanies(1, currentFilters);
    };

    // Handle icon clicks to open modals with different content
    const handleIconClick = async (company: any, type: string) => {
        setSelectedCompany(company);
        setModalType(type);
        setModalLoading(true);
        setDetailsModalVisible(true);

        try {
            let apiUrl = '';
            const encodedCompanyArray = encodeURIComponent(JSON.stringify([company.company_name]));
            const encodedYear = encodeURIComponent(company.year);
            switch (type) {
                case 'documents':
                    setModalTitle('Documents');
                    apiUrl = `/activism_tables/?company_name=${encodeURIComponent(company.company_name)}`;
                    break;

                case 'meeting_details':
                    setModalTitle('Meeting Details');
                    apiUrl = `/voting_report_8k/?company_name=${encodedCompanyArray}&year=${encodedYear}`;
                    break;

                case 'case_studies':
                    setModalTitle('Case Studies');
                    apiUrl = `/case_studies/?company_name=${encodeURIComponent(company.company_name)}`;
                    break;

                case 'proxy_advisory_firm_recommendation':
                    setModalTitle('Proxy Advisory Firm Recommendation');
                    apiUrl = `/activism_tables/?company_name=${encodeURIComponent(company.company_name)}`;
                    break;

                default:
                    break;
            }

            // Create custom axios instance to avoid global error interceptor
            const customAxios = axios.create({
                baseURL: baseURL,
                headers: {
                    'Authorization': `JWT ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });

            const response = await customAxios.get(apiUrl);
            const data = response.data;
            console.log(`Modal API Response for ${type}:`, data);

            // Set the appropriate data based on type
            switch (type) {
                case 'documents':
                    // The /activism_tables/ API returns the full response object with Activism_Presentation and Activism_Press_Release
                    setModalData(data);
                    break;
                case 'meeting_details':
                    // Set the full response data for meeting details
                    setModalData(data);
                    break;
                case 'case_studies':
                    setModalData(data?.results || []);
                    break;
                case 'proxy_advisory_firm_recommendation':
                    // Extract Activism_ISS_GL from the response
                    setModalData(data?.Activism_ISS_GL || []);
                    break;
                default:
                    setModalData([]);
            }

        } catch (error) {
            console.log(`No data available for ${type} - this is normal`);
            setModalData([]);
        } finally {
            setModalLoading(false);
        }
    };


    useEffect(() => {
        getModulesCount();
        fetchProxyContestCompanies(1);
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

            if (((proxyContestTopFilter?.institution_name?.length === 0 || !proxyContestTopFilter?.institution_name) && (proxyContestTopFilter?.institution_clear === false))) {
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


    const transformData = (data: any) => {
        const groupedData: any = {};

        data?.forEach((entry: any) => {
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
        const applyFilter = { company_name: proxyContestTopFilter?.company_name, institution_name: proxyFilter?.institution_name, top: null, institution_clear: false };
        Object.entries(applyFilter).forEach(([key, value]) => {
            dispatch(setProxyTopFilter({ key: key as any, value }));
        });
    };

    const onInstitutionFilterClear = () => {
        resetFormValues();
        const applyFilter = { institution_name: [], top: 'true', institution_clear: true };
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
        const applyFilter = { company_name: [proxyFilter?.company_name], top: 'true', institution_clear: false };
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

            <div className="p-5 pt-0 mt-1 box">

                <div className="w-full">
                    <>
                        <Tab.Group selectedIndex={getSelectedTabIndex()}>
                            <Tab.List variant="link-tabs">
                            </Tab.List>

                            <Tab.Panels className="mt-5">
                                <Tab.Panel className="leading-relaxed">
                                    {/* Filter Section */}

                                    {/* Proxy Contest Companies Table */}
                                    <div className="p-5 mt-1 box">
                                        <div>
                                            <div className="flex flex-col p-5 sm:flex-row gap-y-2">
                                                <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                    <span>
                                                        <h1 className="text-lg font-bold flex items-center gap-2">
                                                            Voting Data

                                                        </h1>
                                                    </span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
                                                    {proxyContestTotal > 0 && (
                                                        <h2 className="flex items-end font-semibold justify-end text-[13px] md:ml-auto mx-5">
                                                            Count: {proxyContestTotal.toLocaleString()}
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

                                            {/* Filter Pills */}
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

                                            {/* Filter Card */}
                                            {isFilterCollapse && (
                                                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">
                                                    <form onSubmit={handleSubmit(onFilterSubmit)}>
                                                        <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
                                                            {/* Company Filter */}
                                                            <div>
                                                                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                                                                    <FaBuilding className="text-gray-400" /> Company
                                                                </label>
                                                                <Controller
                                                                    name="company"
                                                                    control={control}
                                                                    defaultValue={[]}
                                                                    render={({ field }) => (
                                                                        <MultiSelectDropdown
                                                                            data={companyOptions.map(option => ({
                                                                                value: option,
                                                                                label: option
                                                                            }))}
                                                                            placeholder="Select Company"
                                                                            loading={dropdownLoading}
                                                                            onChange={(selectedOptions) => {
                                                                                const selectedValues = selectedOptions.map((option) => option.value);
                                                                                field.onChange(selectedValues);
                                                                            }}
                                                                            selectedOption={field.value || []}
                                                                        />
                                                                    )}
                                                                />
                                                            </div>

                                                            {/* Year Filter */}
                                                            <div>
                                                                <label className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
                                                                    <FaCalendarAlt className="text-gray-400" /> Year
                                                                </label>
                                                                <Controller
                                                                    name="year"
                                                                    control={control}
                                                                    defaultValue={[]}
                                                                    render={({ field }) => (
                                                                        <MultiSelectDropdown
                                                                            data={yearOptions.map(option => ({
                                                                                value: option,
                                                                                label: option
                                                                            }))}
                                                                            placeholder="Select Year"
                                                                            loading={dropdownLoading}
                                                                            onChange={(selectedOptions) => {
                                                                                const selectedValues = selectedOptions.map((option) => option.value);
                                                                                field.onChange(selectedValues);
                                                                            }}
                                                                            selectedOption={field.value || []}
                                                                        />
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Buttons */}
                                                        <div className="flex justify-end gap-3 mt-6">
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                onClick={onFilterClear}
                                                                className="w-24"
                                                            >
                                                                Clear
                                                            </Button>
                                                            <Button
                                                                variant="primary"
                                                                className="w-24"
                                                                type="submit"
                                                            >
                                                                Apply
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            {proxyContestLoading ? (
                                                <div className="h-52 flex items-center justify-center">
                                                    <LoadingIcon icon="three-dots" className="w-8 h-8" />
                                                </div>
                                            ) : (
                                                <>
                                                    <TableWrapper isLoading={proxyContestLoading}>
                                                        <div className="overflow-x-auto min-h-[70vh] max-h-[80vh] overflow-y-scroll">
                                                            <Table>
                                                                <Table.Thead>
                                                                    <Table.Tr className="bg-primary text-white text-sm">
                                                                        <Table.Td className="px-4 py-2 font-semibold">Year</Table.Td>
                                                                        <Table.Td className="px-4 py-2 font-semibold">Company Name</Table.Td>
                                                                        <Table.Td className="px-4 py-2 font-semibold">Meeting Date</Table.Td>
                                                                        <Table.Td className="px-4 py-2 font-semibold">Actions</Table.Td>
                                                                    </Table.Tr>
                                                                </Table.Thead>
                                                                <Table.Tbody>
                                                                    {proxyContestCompanies?.length > 0 ? (
                                                                        proxyContestCompanies.map((company, index) => (
                                                                            <Table.Tr
                                                                                key={`${company.company_id}-${index}`}
                                                                                className="[&_td]:last:border-b-0 transition-all hover:bg-primary/5"
                                                                            >
                                                                                <Table.Td className="py-2 border-dashed">
                                                                                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                                                        {company.year}
                                                                                    </span>
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 border-dashed">
                                                                                    <div
                                                                                        className="font-semibold cursor-pointer hover:underline transition-colors"
                                                                                        onClick={() => {
                                                                                            navigate(`/proxy-contest-detail/${company.company_id}`, {
                                                                                                state: {
                                                                                                    company: company,
                                                                                                    companyName: company.company_name,
                                                                                                    year: company.year,
                                                                                                    meetingDate: company.meeting_date
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        {company.company_name}
                                                                                    </div>
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 border-dashed">
                                                                                    {company.meeting_date ? (
                                                                                        <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                                                                                            {company.meeting_date}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-xs">-</span>
                                                                                    )}
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 border-dashed">
                                                                                    <div className="flex gap-2">
                                                                                        {/* Documents Icon - Always visible */}
                                                                                        {company.is_documents ? (
                                                                                            <Tippy content="Documents" options={{ theme: "light" }}>
                                                                                                <div
                                                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                                                                                                    onClick={() => handleIconClick({ ...company, year: company.year }, 'documents')}
                                                                                                >
                                                                                                    <Lucide icon="FileText" className="w-4 h-4" />
                                                                                                </div>
                                                                                            </Tippy>
                                                                                        ) : (
                                                                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-50 text-gray-300 cursor-not-allowed">
                                                                                                <Lucide icon="FileText" className="w-4 h-4" />
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Proxy Advisory Firm Recommendation Icon - Always visible */}
                                                                                        {company.is_proxy_advisory_firm_recommendation ? (
                                                                                            <Tippy content="Proxy Advisory Firm Recommendation" options={{ theme: "light" }}>
                                                                                                <div
                                                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                                                                                                    onClick={() => handleIconClick({ ...company, year: company.year }, 'proxy_advisory_firm_recommendation')}
                                                                                                >
                                                                                                    <Lucide icon="Shield" className="w-4 h-4" />
                                                                                                </div>
                                                                                            </Tippy>
                                                                                        ) : (
                                                                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-50 text-gray-300 cursor-not-allowed">
                                                                                                <Lucide icon="Shield" className="w-4 h-4" />
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Meeting Details Icon - Always visible */}
                                                                                        {company.is_meeting_details ? (
                                                                                            <Tippy content="Meeting Details" options={{ theme: "light" }}>
                                                                                                <div
                                                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                                                                                                    onClick={() => handleIconClick({ ...company, year: company.year }, 'meeting_details')}
                                                                                                >
                                                                                                    <Lucide icon="Calendar" className="w-4 h-4" />
                                                                                                </div>
                                                                                            </Tippy>
                                                                                        ) : (
                                                                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-50 text-gray-300 cursor-not-allowed">
                                                                                                <Lucide icon="Calendar" className="w-4 h-4" />
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Case Studies Icon - Always visible */}
                                                                                        {company.is_case_studies ? (
                                                                                            <Tippy content="Case Studies" options={{ theme: "light" }}>
                                                                                                <div
                                                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                                                                                                    onClick={() => handleIconClick({ ...company, year: company.year }, 'case_studies')}
                                                                                                >
                                                                                                    <Lucide icon="BookOpen" className="w-4 h-4" />
                                                                                                </div>
                                                                                            </Tippy>
                                                                                        ) : (
                                                                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-50 text-gray-300 cursor-not-allowed">
                                                                                                <Lucide icon="BookOpen" className="w-4 h-4" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </Table.Td>
                                                                            </Table.Tr>
                                                                        ))
                                                                    ) : (
                                                                        <Table.Tr>
                                                                            <Table.Td colSpan={4} className="text-center py-10 text-gray-400 text-lg font-semibold">
                                                                                <Lucide icon="Search" className="mx-auto mb-2 text-4xl text-primary/60" />
                                                                                No Proxy Contest Companies available.
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    )}
                                                                </Table.Tbody>
                                                            </Table>
                                                        </div>
                                                    </TableWrapper>

                                                    {proxyContestTotal > pageSize && (
                                                        <div className="flex flex-col-reverse flex-wrap items-center p-5 flex-reverse gap-y-2 sm:flex-row">
                                                            <CPagination
                                                                page={proxyContestPage}
                                                                totalPages={Math.ceil(proxyContestTotal / pageSize)}
                                                                handleNextPage={handleProxyContestNextPage}
                                                                handlePageChange={handleProxyContestPageChange}
                                                                handlePreviousPage={handleProxyContestPreviousPage}
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* <section >
                                        {!loading && proxyContestTopFilter?.company_name?.length > 0 && proxyContestReleaseDetails?.Activism_Presentation?.[0]?.year != "2023" && proxyContestReleaseDetails?.Activism_ISS_GL?.[0]?.year != "2023" &&
                                            <section className="box p-5 mt-3.5">
                                                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                                                    <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                                                        <span>
                                                            <h1 className="text-lg font-bold">
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
                                                                            options={{ placeholder: "Institution", maxItems: 3, closeAfterSelect: true }}
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
                                                                        onInstitutionFilterClear();
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
                                                                                                            <div data-tooltip-id="my-tooltip-data-html"

                                                                                                                data-tooltip-html={vdsProxy[vdsHeader?.field]?.notes}>
                                                                                                                <Lucide
                                                                                                                    icon="Info"
                                                                                                                    className=" w-4 h-4 ml-1.5 stroke-[1.3] text-blue-800"
                                                                                                                />
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
                                    </section> */}



                                    {/* Proxy Contest Table */}






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

            {/* Details Modal - Smaller and Better Design */}
            {detailsModalVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-white">
                            <div>
                                <h2 className="text-lg font-semibold">{modalTitle}</h2>
                                <p className="text-sm text-white/80 mt-1">
                                    {selectedCompany?.company_name} - {selectedCompany?.year}
                                </p>
                            </div>
                            <button
                                onClick={() => setDetailsModalVisible(false)}
                                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
                            >
                                <Lucide icon="X" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                            {modalLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <LoadingIcon icon="three-dots" className="w-8 h-8" />
                                </div>
                            ) : (
                                <div>
                                    {modalData && (
                                        modalData.Activism_Presentation?.length > 0 ||
                                        modalData.Activism_Press_Release?.length > 0 ||
                                        (Array.isArray(modalData) && modalData.length > 0) ||
                                        (modalType === 'meeting_details' && (modalData.company || modalData.nominees || modalData.proposals))
                                    ) ? (
                                        <div className="space-y-6">
                                            {/* Handle documents modal with structured data */}
                                            {modalType === 'documents' && modalData.Activism_Presentation && (
                                                <>
                                                    {/* Activism Presentation Section */}
                                                    {modalData.Activism_Presentation?.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Activism Presentation
                                                            </h3>
                                                            <TableWrapper>
                                                                <div className="overflow-x-auto">
                                                                    <Table>
                                                                        <Table.Thead>
                                                                            <Table.Tr>
                                                                                <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]" style={{ width: '66.67%' }}>
                                                                                    Document Name
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center" style={{ width: '16.67%' }}>
                                                                                    Type
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center" style={{ width: '16.67%' }}>
                                                                                    View
                                                                                </Table.Td>
                                                                            </Table.Tr>
                                                                        </Table.Thead>
                                                                        <Table.Tbody>
                                                                            {modalData.Activism_Presentation.map((item: any, index: number) => (
                                                                                <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                    <Table.Td className="py-2 border-dashed" style={{ width: '66.67%' }}>
                                                                                        <h1
                                                                                            onClick={() => {
                                                                                                if (item?.document_url) {
                                                                                                    gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                                    setPdfVisible(true);
                                                                                                    setDetailsModalVisible(false);
                                                                                                }
                                                                                            }}
                                                                                            className={`font-medium ${item?.document_url ? 'cursor-pointer hover:underline text-blue-600' : 'text-gray-700'}`}
                                                                                        >
                                                                                            {item?.document_name || 'Unnamed Document'}
                                                                                        </h1>
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed text-center" style={{ width: '16.67%' }}>
                                                                                        Presentation
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed" style={{ width: '16.67%' }}>
                                                                                        {item?.document_url && (
                                                                                            <div className="flex justify-center items-center">
                                                                                                <Tippy content="View Document" options={{ theme: "light" }}>
                                                                                                    <Lucide
                                                                                                        onClick={() => {
                                                                                                            gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                                            setPdfVisible(true);
                                                                                                            setDetailsModalVisible(false);
                                                                                                        }}
                                                                                                        icon="Eye"
                                                                                                        className="w-4 h-4 stroke-[1.3] cursor-pointer text-gray-600 hover:text-gray-800"
                                                                                                    />
                                                                                                </Tippy>
                                                                                            </div>
                                                                                        )}
                                                                                    </Table.Td>
                                                                                </Table.Tr>
                                                                            ))}
                                                                        </Table.Tbody>
                                                                    </Table>
                                                                </div>
                                                            </TableWrapper>
                                                        </div>
                                                    )}

                                                    {/* Activism Press Release Section */}
                                                    {modalData.Activism_Press_Release?.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Activism Press Release
                                                            </h3>
                                                            <TableWrapper>
                                                                <div className="overflow-x-auto">
                                                                    <Table>
                                                                        <Table.Thead>
                                                                            <Table.Tr>
                                                                                <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]" style={{ width: '66.67%' }}>
                                                                                    Document Name
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center" style={{ width: '16.67%' }}>
                                                                                    Type
                                                                                </Table.Td>
                                                                                <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center" style={{ width: '16.67%' }}>
                                                                                    View
                                                                                </Table.Td>
                                                                            </Table.Tr>
                                                                        </Table.Thead>
                                                                        <Table.Tbody>
                                                                            {modalData.Activism_Press_Release.map((item: any, index: number) => (
                                                                                <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                    <Table.Td className="py-2 border-dashed" style={{ width: '66.67%' }}>
                                                                                        <h1
                                                                                            onClick={() => {
                                                                                                if (item?.document_url) {
                                                                                                    gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                                    setPdfVisible(true);
                                                                                                    setDetailsModalVisible(false);
                                                                                                }
                                                                                            }}
                                                                                            className={`font-medium ${item?.document_url ? 'cursor-pointer hover:underline text-blue-600' : 'text-gray-700'}`}
                                                                                        >
                                                                                            {item?.document_name || 'Unnamed Document'}
                                                                                        </h1>
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed text-center" style={{ width: '16.67%' }}>
                                                                                        Press Release
                                                                                    </Table.Td>
                                                                                    <Table.Td className="py-2 border-dashed" style={{ width: '16.67%' }}>
                                                                                        {item?.document_url && (
                                                                                            <div className="flex justify-center items-center">
                                                                                                <Tippy content="View Document" options={{ theme: "light" }}>
                                                                                                    <Lucide
                                                                                                        onClick={() => {
                                                                                                            gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                                            setPdfVisible(true);
                                                                                                            setDetailsModalVisible(false);
                                                                                                        }}
                                                                                                        icon="Eye"
                                                                                                        className="w-4 h-4 stroke-[1.3] cursor-pointer text-gray-600 hover:text-gray-800"
                                                                                                    />
                                                                                                </Tippy>
                                                                                            </div>
                                                                                        )}
                                                                                    </Table.Td>
                                                                                </Table.Tr>
                                                                            ))}
                                                                        </Table.Tbody>
                                                                    </Table>
                                                                </div>
                                                            </TableWrapper>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Handle proxy advisory firm recommendation modal */}
                                            {modalType === 'proxy_advisory_firm_recommendation' && Array.isArray(modalData) && (
                                                <TableWrapper>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <Table.Thead>
                                                                <Table.Tr>
                                                                    <Table.Td
                                                                        rowSpan={2}
                                                                        className="px-6 py-3 font-semibold h-[60px] border-r border-gray-300 bg-gray-50 text-gray-700 text-left"
                                                                    >
                                                                        Company
                                                                    </Table.Td>
                                                                    <Table.Td
                                                                        colSpan={3}
                                                                        className="px-6 py-3 font-semibold h-[30px] border-r border-gray-300 bg-gray-50 text-gray-700 text-center"
                                                                    >
                                                                        ISS
                                                                    </Table.Td>
                                                                    <Table.Td
                                                                        colSpan={3}
                                                                        className="px-6 py-3 font-semibold h-[30px] bg-gray-50 text-gray-700 text-center"
                                                                    >
                                                                        GL
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                                <Table.Tr>
                                                                    <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-300 bg-gray-50 text-gray-600 text-center text-sm">
                                                                        Management
                                                                    </Table.Td>
                                                                    <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-300 bg-gray-50 text-gray-600 text-center text-sm">
                                                                        Activist
                                                                    </Table.Td>
                                                                    <Table.Td className="px-4 py-2 font-medium h-[30px] border-r border-gray-300 bg-gray-50 text-gray-600 text-center text-sm">
                                                                        Split
                                                                    </Table.Td>
                                                                    <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-300 bg-gray-50 text-gray-600 text-center text-sm">
                                                                        Management
                                                                    </Table.Td>
                                                                    <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-300 bg-gray-50 text-gray-600 text-center text-sm">
                                                                        Activist
                                                                    </Table.Td>
                                                                    <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-300 bg-gray-50 text-gray-600 text-center text-sm">
                                                                        Split
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {(() => {
                                                                    // Group data by company_tent to show all unique companies
                                                                    const companies = [...new Set(modalData.map((item: any) => item.company_tent))];

                                                                    return companies.map((companyName: string, index: number) => {
                                                                        const issData = modalData.find((item: any) => item.type === 'ISS' && item.company_tent === companyName);
                                                                        const glData = modalData.find((item: any) => item.type === 'GL' && item.company_tent === companyName);

                                                                        return (
                                                                            <Table.Tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
                                                                                <Table.Td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-200">
                                                                                    {companyName || 'N/A'}
                                                                                </Table.Td>
                                                                                {/* ISS columns */}
                                                                                <Table.Td className="px-4 py-4 text-center">
                                                                                    {issData?.management && (
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
                                                                                                &#10004;
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Table.Td>
                                                                                <Table.Td className="px-4 py-4 text-center">
                                                                                    {issData?.activist && (
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
                                                                                                &#10004;
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Table.Td>
                                                                                <Table.Td className="px-4 py-4 text-center border-r border-gray-200">
                                                                                    {issData?.split && (
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
                                                                                                &#10004;
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Table.Td>
                                                                                {/* GL columns */}
                                                                                <Table.Td className="px-4 py-4 text-center">
                                                                                    {glData?.management && (
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
                                                                                                &#10004;
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Table.Td>
                                                                                <Table.Td className="px-4 py-4 text-center">
                                                                                    {glData?.activist && (
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
                                                                                                &#10004;
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Table.Td>
                                                                                <Table.Td className="px-4 py-4 text-center">
                                                                                    {glData?.split && (
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="bg-green-500 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white">
                                                                                                &#10004;
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Table.Td>
                                                                            </Table.Tr>
                                                                        );
                                                                    });
                                                                })()}
                                                            </Table.Tbody>
                                                        </Table>
                                                    </div>
                                                </TableWrapper>
                                            )}

                                            {/* Handle meeting details modal with special structure */}
                                            {modalType === 'meeting_details' && modalData && (
                                                <div className="space-y-6">
                                                    {/* Company Information */}
                                                    {modalData.company && modalData.company.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Company Information
                                                            </h3>
                                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                                {modalData.company.map((companyInfo: any, index: number) => {
                                                                    const companyName = Object.keys(companyInfo)[0];
                                                                    const meetingInfo = companyInfo[companyName];
                                                                    return (
                                                                        <div key={index} className="text-sm">
                                                                            <p><strong>Company:</strong> {companyName}</p>
                                                                            <p><strong>Meeting:</strong> {meetingInfo}</p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Nominees Section */}
                                                    {modalData.nominees && modalData.nominees.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Nominees
                                                            </h3>
                                                            <TableWrapper>
                                                                <div className="overflow-x-auto">
                                                                    <Table>
                                                                        <Table.Thead>
                                                                            <Table.Tr>
                                                                                {modalData.nominees_headers?.map((header: any, index: number) => (
                                                                                    <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] ${index === 0 ? 'min-w-[250px] max-w-[300px]' : ''}`}>
                                                                                        {header.header}
                                                                                    </Table.Td>
                                                                                ))}
                                                                            </Table.Tr>
                                                                        </Table.Thead>
                                                                        <Table.Tbody>
                                                                            {modalData.nominees.map((nominee: any, index: number) => (
                                                                                <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                    {modalData.nominees_headers?.map((header: any, headerIndex: number) => (
                                                                                        <Table.Td key={headerIndex} className={`py-2 border-dashed ${headerIndex === 0 ? 'min-w-[250px] max-w-[300px]' : ''}`}>
                                                                                            {nominee[header.field] || 'N/A'}
                                                                                        </Table.Td>
                                                                                    ))}
                                                                                </Table.Tr>
                                                                            ))}
                                                                        </Table.Tbody>
                                                                    </Table>
                                                                </div>
                                                            </TableWrapper>
                                                        </div>
                                                    )}

                                                    {/* Proposals Section */}
                                                    {modalData.proposals && modalData.proposals.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Proposals
                                                            </h3>
                                                            <TableWrapper>
                                                                <div className="overflow-x-auto">
                                                                    <Table>
                                                                        <Table.Thead>
                                                                            <Table.Tr>
                                                                                {modalData.proposals_headers?.map((header: any, index: number) => (
                                                                                    <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] ${index === 0 ? 'min-w-[250px] max-w-[300px]' : ''}`}>
                                                                                        {header.header}
                                                                                    </Table.Td>
                                                                                ))}
                                                                            </Table.Tr>
                                                                        </Table.Thead>
                                                                        <Table.Tbody>
                                                                            {modalData.proposals.map((proposal: any, index: number) => (
                                                                                <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                    {modalData.proposals_headers?.map((header: any, headerIndex: number) => (
                                                                                        <Table.Td key={headerIndex} className={`py-2 border-dashed ${headerIndex === 0 ? 'min-w-[250px] max-w-[300px]' : ''}`}>
                                                                                            {proposal[header.field] || 'N/A'}
                                                                                        </Table.Td>
                                                                                    ))}
                                                                                </Table.Tr>
                                                                            ))}
                                                                        </Table.Tbody>
                                                                    </Table>
                                                                </div>
                                                            </TableWrapper>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Handle case studies modal with array data */}
                                            {modalType === 'case_studies' && Array.isArray(modalData) && (
                                                <TableWrapper>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <Table.Thead>
                                                                <Table.Tr>
                                                                    <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]">
                                                                        Institution
                                                                    </Table.Td>
                                                                    <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]">
                                                                        Year
                                                                    </Table.Td>
                                                                    <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]">
                                                                        Theme
                                                                    </Table.Td>
                                                                    <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center w-20">
                                                                        View
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {modalData.map((item: any, index: number) => (
                                                                    <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                        <Table.Td className="py-2 border-dashed">
                                                                            <div className="flex items-center">
                                                                                {item?.institution_logo_url ? (
                                                                                    <img
                                                                                        alt="Institution Logo"
                                                                                        className="w-6 h-6 rounded-full object-contain mr-3"
                                                                                        src={item?.institution_logo_url}
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-6 h-6 rounded-full bg-gray-200 mr-3"></div>
                                                                                )}
                                                                                <span>{item?.institution_name || 'N/A'}</span>
                                                                            </div>
                                                                        </Table.Td>
                                                                        <Table.Td className="py-2 border-dashed">
                                                                            {item?.year || 'N/A'}
                                                                        </Table.Td>
                                                                        <Table.Td className="py-2 border-dashed">
                                                                            {item?.esg_themes || 'N/A'}
                                                                        </Table.Td>
                                                                        <Table.Td className="py-2 border-dashed text-center">
                                                                            <Tippy content="View Details" options={{ theme: "light" }}>
                                                                                <Lucide
                                                                                    onClick={() => {
                                                                                        setCaseProxyModalVisible(true);
                                                                                        setCaseProxyModalData(item);
                                                                                    }}
                                                                                    icon="Eye"
                                                                                    className="w-4 h-4 stroke-[1.3] cursor-pointer text-gray-600 hover:text-gray-800"
                                                                                />
                                                                            </Tippy>
                                                                        </Table.Td>
                                                                    </Table.Tr>
                                                                ))}
                                                            </Table.Tbody>
                                                        </Table>
                                                    </div>
                                                </TableWrapper>
                                            )}
                                        </div>
                                    ) : (
                                        !modalLoading && (
                                            <div className="text-center py-12">
                                                <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
                                                <p className="text-gray-500">No {modalTitle.toLowerCase()} found for {selectedCompany?.company_name}.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Tooltip id="my-tooltip-data-html" style={{ zIndex: 10, backgroundColor: "#ffffff", color: "#000000", width: 400, boxShadow: '2px 4px 6px rgba(0, 0, 0, 0.2)' }} />
        </>
    );
};

export default index;
