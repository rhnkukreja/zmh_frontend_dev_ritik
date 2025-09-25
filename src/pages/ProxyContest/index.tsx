import TableWrapper from "../../components/TableWrapper";
import Table from "@/components/Base/Table";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { baseURL } from "@/constant";
import Button from "@/components/Base/Button";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { Tooltip } from 'react-tooltip';
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import CPagination from "@/components/Pagination";
import CaseProxyModal from "./CaseProxyModal";
import LoadingIcon from "@/components/Base/LoadingIcon";
import PdfViewer from "@/components/PdfView";
import { getProxyContestDropdownValues } from "@/services/proxyContestDropdown";
import MultiSelectDropdown from "@/components/Base/MultiSelect";
import { FaBuilding, FaCalendarAlt, FaTimes, FaSearch } from "react-icons/fa";
import { MdOutlineClear } from "react-icons/md";
import { Popover } from "@/components/Base/Headless";

const index = () => {
    const navigate = useNavigate();

    // PDF viewer states
    const [pdfVisible, setPdfVisible] = useState<boolean>(false);
    const [currentPdfDoc, setCurrentPdfDoc] = useState<string>("");
    const [currentPdfName, setCurrentPdfName] = useState<string>("");

    // Case proxy modal states
    const [caseProxyModalVisible, setCaseProxyModalVisible] = useState<boolean>(false);
    const [caseProxyModalData, setCaseProxyModalData] = useState<any>(null);

    // Table states
    const [proxyContestCompanies, setProxyContestCompanies] = useState<any[]>([]);
    const [proxyContestLoading, setProxyContestLoading] = useState<boolean>(false);
    const [proxyContestPage, setProxyContestPage] = useState<number>(1);
    const [proxyContestTotal, setProxyContestTotal] = useState<number>(0);
    const pageSize = 30;

    // Modal states for icon clicks
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

    const { handleSubmit, control, reset } = useForm<any>({
        defaultValues: {
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
                const companies: any[] = data.proxy_companies ?
                    [...new Set(data.proxy_companies.map((company: any) => company.company_name).filter(Boolean))] :
                    [];
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const gotoDetailPage = (pdf: string, pdf_name: string) => {
        setCurrentPdfDoc(pdf);
        setCurrentPdfName(pdf_name);
    };

    const fetchProxyContestCompanies = useCallback(async (page: number = 1, filters: any = {}) => {
        setProxyContestLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('page_size', pageSize.toString());

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
            setProxyContestCompanies(data.results || []);
            setProxyContestTotal(data.count || 0);
        } catch (error) {
            toast.error("Failed to fetch proxy contest companies");
            console.error("Error fetching proxy contest companies:", error);
        } finally {
            setProxyContestLoading(false);
        }
    }, [pageSize]);

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

    // Helper functions for filters
    const countValidFilters = (filters: any) => {
        let count = 0;
        Object.values(filters).forEach((value: any) => {
            if (Array.isArray(value) && value.length > 0) count++;
        });
        return count;
    };

    const generateFilterChips = (filters: any) => {
        const chips: any[] = [];
        Object.entries(filters).forEach(([key, values]: [string, any]) => {
            if (Array.isArray(values) && values.length > 0) {
                values.forEach((value: any) => {
                    chips.push({
                        key,
                        value,
                        label: `${key === 'company' ? 'Company' : 'Year'}: ${value}`
                    });
                });
            }
        });
        return chips;
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
                currentFilters[removeKey] = currentFilters[removeKey].filter((item: any) => item !== removeValue);
                if (currentFilters[removeKey].length === 0) {
                    delete currentFilters[removeKey];
                }
            }
        }

        const updatedFilters = { ...currentFilters };
        setAllApplyFilter(updatedFilters);
        setFiltersLength(countValidFilters(updatedFilters));
        setSelectedChipFilters(generateFilterChips(updatedFilters));
        setProxyContestPage(1);
        fetchProxyContestCompanies(1, updatedFilters);
    };

    // Handle icon clicks for modal data
    const handleIconClick = async (company: any, type: string) => {
        if (type === 'case_studies') {
            // For case studies, we need to fetch case studies by company name
            setCaseProxyModalVisible(true);
            setCaseProxyModalData({
                company_name: company.company_name,
                company_id: company.company_id
            });
            return;
        }

        setSelectedCompany(company);
        setModalType(type);
        setModalLoading(true);
        setDetailsModalVisible(true);

        const titles = {
            'documents': 'Documents',
            'proxy_advisory_firm_recommendation': 'Proxy Advisory Firm Recommendation',
            'meeting_details': 'Meeting Details',
            'case_studies': 'Case Studies',
            'proxy_voting': 'Proxy Voting (Top 5)'
        };
        setModalTitle(titles[type as keyof typeof titles] || 'Details');

        try {
            let apiUrl = '';
            const companyName = encodeURIComponent(company.company_name);

            // Use the correct API endpoints based on type
            switch (type) {
                case 'documents':
                case 'proxy_advisory_firm_recommendation':
                    apiUrl = `${baseURL}/activism_tables/?company_name=${companyName}`;
                    break;
                case 'meeting_details':
                    apiUrl = `${baseURL}/voting_report_8k/?company_name=${encodeURIComponent(JSON.stringify([company.company_name]))}&year=${encodeURIComponent(company.year)}`;
                    break;
                case 'proxy_voting':
                    apiUrl = `${baseURL}/vds_proxy_voting/?year=${company.year}&company_name=[%27${encodeURIComponent(company.company_name)}%27]&top=true`;
                    break;
                default:
                    throw new Error(`Unknown modal type: ${type}`);
            }

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `JWT ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Process data based on type
            let processedData = data;
            if (type === 'documents') {
                processedData = {
                    presentations: data?.Activism_Presentation || [],
                    press_releases: data?.Activism_Press_Release || []
                };
            } else if (type === 'proxy_advisory_firm_recommendation') {
                processedData = {
                    recommendations: data?.Activism_ISS_GL || []
                };
            } else if (type === 'proxy_voting') {
                processedData = {
                    vds_report: data?.vds_report || [],
                    vds_report_headers: data?.vds_report_headers || []
                };
            }

            setModalData(processedData);
        } catch (error) {
            console.error('Error fetching modal data:', error);
            toast.error('Failed to fetch details');
            setModalData(null);
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <>
            <div className="box p-5 mt-3.5">
                <div>
                    <div className="flex flex-col p-5 sm:flex-row gap-y-2">
                        <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                            <span>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    Proxy Contest
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
                                {/* Clear and Apply buttons outside filter */}
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
                                <div className="mb-6 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-slate-700">Filters</h3>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={onFilterClear}
                                            className="w-full sm:w-auto flex items-center gap-2"
                                            type="button"
                                        >
                                            <MdOutlineClear className="text-lg" />
                                            Clear
                                        </Button>

                                        <Button
                                            variant="primary"
                                            onClick={handleSubmit(onFilterSubmit)}
                                            className="w-full sm:w-auto flex items-center gap-2"
                                        >
                                            <FaSearch className="text-sm" />
                                            Apply
                                        </Button>
                                    </div>
                                </div>
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

                                {/* Filter Content */}
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
                                                        className={`[&_td]:last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}
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
                                                                            meetingDate: company.meeting_date,
                                                                            fromProxyContest: true
                                                                        }
                                                                    });
                                                                }}
                                                            >
                                                                {company.company_name}
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="py-2 border-dashed">
                                                            {company.meeting_date && (
                                                                <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                                                                    {company.meeting_date}
                                                                </span>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td className="py-2 border-dashed">
                                                            <div className="flex gap-2">
                                                                {/* Documents Icon */}
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

                                                                {/* Proxy Advisory Firm Recommendation Icon */}
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

                                                                {/* Meeting Details Icon */}
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

                                                                {/* Case Studies Icon */}
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

                                                                {/* Proxy Voting Icon */}
                                                                {company.is_voting ? (
                                                                    <Tippy content="Proxy Voting (Top 5)" options={{ theme: "light" }}>
                                                                        <div
                                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                                                                            onClick={() => handleIconClick({ ...company, year: company.year }, 'proxy_voting')}
                                                                        >
                                                                            <Lucide icon="Vote" className="w-4 h-4" />
                                                                        </div>
                                                                    </Tippy>
                                                                ) : (
                                                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-gray-50 text-gray-300 cursor-not-allowed">
                                                                        <Lucide icon="Vote" className="w-4 h-4" />
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

            {/* Case Proxy Modal */}
            <CaseProxyModal
                caseProxyModalVisible={caseProxyModalVisible}
                setCaseProxyModalVisible={setCaseProxyModalVisible}
                caseProxyModalData={caseProxyModalData}
            />

            {/* PDF Viewer */}
            {pdfVisible && (
                <PdfViewer
                    pdfVisible={pdfVisible}
                    setPdfVisible={setPdfVisible}
                    file={currentPdfDoc}
                    file_name={currentPdfName}
                />
            )}

            {/* Details Modal */}
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
                                    {modalData ? (
                                        <div>
                                            {modalType === 'documents' && (
                                                <div className="space-y-6">
                                                    {modalData.presentations?.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Company and Investor Presentations
                                                            </h3>
                                                            <div className="space-y-2">
                                                                {modalData.presentations.map((item: any, index: number) => (
                                                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                        <span className="font-medium">{item.document_name || 'Unnamed Document'}</span>
                                                                        {item.document_url && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                    setPdfVisible(true);
                                                                                    setDetailsModalVisible(false);
                                                                                }}
                                                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                                            >
                                                                                View PDF
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {modalData.press_releases?.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-3 text-primary border-b border-gray-200 pb-2">
                                                                Press Releases
                                                            </h3>
                                                            <div className="space-y-2">
                                                                {modalData.press_releases.map((item: any, index: number) => (
                                                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                        <span className="font-medium">{item.document_name || 'Unnamed Document'}</span>
                                                                        {item.document_url && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                    setPdfVisible(true);
                                                                                    setDetailsModalVisible(false);
                                                                                }}
                                                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                                            >
                                                                                View PDF
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(!modalData.presentations?.length && !modalData.press_releases?.length) && (
                                                        <div className="text-center py-12">
                                                            <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Documents Available</h3>
                                                            <p className="text-gray-500">No documents found for {selectedCompany?.company_name}.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {modalType === 'proxy_advisory_firm_recommendation' && (
                                                <div>
                                                    {modalData.recommendations?.length > 0 ? (
                                                        <TableWrapper>
                                                            <div className="overflow-x-auto">
                                                                <Table>
                                                                    <Table.Thead>
                                                                        <Table.Tr>
                                                                            <Table.Td
                                                                                rowSpan={2}
                                                                                className="px-6 py-3 font-semibold h-[60px] border-r border-gray-200 bg-gray-50 text-gray-700 text-left"
                                                                            >
                                                                                Company
                                                                            </Table.Td>
                                                                            <Table.Td
                                                                                colSpan={3}
                                                                                className="px-6 py-3 font-semibold h-[30px] border-r border-gray-200 bg-gray-50 text-gray-700 text-center"
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
                                                                            <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">
                                                                                Management
                                                                            </Table.Td>
                                                                            <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">
                                                                                Activist
                                                                            </Table.Td>
                                                                            <Table.Td className="px-4 py-2 font-medium h-[30px] border-r border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">
                                                                                Split
                                                                            </Table.Td>
                                                                            <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">
                                                                                Management
                                                                            </Table.Td>
                                                                            <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">
                                                                                Activist
                                                                            </Table.Td>
                                                                            <Table.Td className="px-4 py-2 font-medium h-[30px] border-gray-200 bg-gray-50 text-gray-600 text-center text-sm">
                                                                                Split
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    </Table.Thead>
                                                                    <Table.Tbody>
                                                                        {(() => {
                                                                            // Group data by company_tent to show all unique companies
                                                                            const companies = [...new Set(modalData.recommendations.map((item: any) => item.company_tent))];

                                                                            return companies.map((companyName: string, index: number) => {
                                                                                const issData = modalData.recommendations.find((item: any) => item.type === 'ISS' && item.company_tent === companyName);
                                                                                const glData = modalData.recommendations.find((item: any) => item.type === 'GL' && item.company_tent === companyName);

                                                                                return (
                                                                                    <Table.Tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                                                                                        <Table.Td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100">
                                                                                            {companyName || ""}
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
                                                                                        <Table.Td className="px-4 py-4 text-center border-r border-gray-100">
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
                                                    ) : (
                                                        <div className="text-center py-12">
                                                            <Lucide icon="Shield" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Recommendations Available</h3>
                                                            <p className="text-gray-500">No proxy advisory firm recommendations found for {selectedCompany?.company_name}.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {modalType === 'meeting_details' && (
                                                <div>
                                                    {modalData && (modalData.company || modalData.nominees || modalData.proposals) ? (
                                                        <div className="space-y-6">
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
                                                                                            <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 ${index === 0 ? 'min-w-[200px]' : ''}`}>
                                                                                                {header.header}
                                                                                            </Table.Td>
                                                                                        ))}
                                                                                    </Table.Tr>
                                                                                </Table.Thead>
                                                                                <Table.Tbody>
                                                                                    {modalData.nominees.map((nominee: any, index: number) => (
                                                                                        <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                            {modalData.nominees_headers?.map((header: any, headerIndex: number) => (
                                                                                                <Table.Td key={headerIndex} className={`py-2 border-dashed text-sm ${headerIndex === 0 ? 'min-w-[200px]' : ''}`}>
                                                                                                    {nominee[header.field] || ''}
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
                                                                                            <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 ${index === 0 ? 'min-w-[200px]' : ''}`}>
                                                                                                {header.header}
                                                                                            </Table.Td>
                                                                                        ))}
                                                                                    </Table.Tr>
                                                                                </Table.Thead>
                                                                                <Table.Tbody>
                                                                                    {modalData.proposals.map((proposal: any, index: number) => (
                                                                                        <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                            {modalData.proposals_headers?.map((header: any, headerIndex: number) => (
                                                                                                <Table.Td key={headerIndex} className={`py-2 border-dashed text-sm ${headerIndex === 0 ? 'min-w-[200px]' : ''}`}>
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
                                                    ) : (
                                                        <div className="text-center py-12">
                                                            <Lucide icon="Calendar" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Meeting Details Available</h3>
                                                            <p className="text-gray-500">No meeting details found for {selectedCompany?.company_name}.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {modalType === 'proxy_voting' && (
                                                <div>
                                                    {modalData?.vds_report && modalData.vds_report.length > 0 && modalData?.vds_report_headers && modalData.vds_report_headers.length > 0 ? (
                                                        <TableWrapper>
                                                            <div className="overflow-x-auto">
                                                                <Table>
                                                                    <Table.Thead>
                                                                        <Table.Tr>
                                                                            {modalData.vds_report_headers.map((header: any, index: number) => (
                                                                                <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 ${index === 0 ? 'min-w-[80px]' : index === 1 ? 'min-w-[300px]' : 'min-w-[150px]'}`}>
                                                                                    {header.header}
                                                                                </Table.Td>
                                                                            ))}
                                                                        </Table.Tr>
                                                                    </Table.Thead>
                                                                    <Table.Tbody>
                                                                        {modalData.vds_report.map((item: any, rowIndex: number) => (
                                                                            <Table.Tr key={rowIndex} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                                {modalData.vds_report_headers.map((header: any, colIndex: number) => (
                                                                                    <Table.Td key={colIndex} className={`py-2 border-dashed text-sm ${colIndex === 0 ? 'min-w-[80px]' : colIndex === 1 ? 'min-w-[300px]' : 'min-w-[150px]'}`}>
                                                                                        {colIndex === 0 ? (
                                                                                            // Proposal number column
                                                                                            <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium">
                                                                                                {item[header.field] || 'N/A'}
                                                                                            </span>
                                                                                        ) : colIndex === 1 ? (
                                                                                            // Proposal title column
                                                                                            <div className="text-left">
                                                                                                <span className="text-gray-900 font-medium text-sm">
                                                                                                    {item[header.field] || 'N/A'}
                                                                                                </span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            // Institution vote columns
                                                                                            <div className="text-left">
                                                                                                {item[header.field] ? (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className={`text-sm ${
                                                                                                            item[header.field].vote === 'Withhold' || item[header.field].vote === 'Against' 
                                                                                                                ? 'text-red-700 font-semibold' 
                                                                                                                : 'text-gray-900 font-medium'
                                                                                                        }`}>
                                                                                                            {item[header.field].vote || 'N/A'}
                                                                                                        </span>
                                                                                                        {item[header.field].notes && (
                                                                                                            <Tippy 
                                                                                                                content={item[header.field].notes} 
                                                                                                                options={{ theme: "light", placement: "top" }}
                                                                                                            >
                                                                                                                <div className="inline-flex items-center justify-center w-4 h-4 rounded-full cursor-help">
                                                                                                                    <Lucide icon="Info" className="w-4 h-4 text-blue-800" />
                                                                                                                </div>
                                                                                                            </Tippy>
                                                                                                        )}
                                                                                                        {item[header.field].vote === 'Split Vote' && item[header.field].split_vote_counts && (
                                                                                                            <div className="text-xs text-gray-600 ml-2">
                                                                                                                (For: {item[header.field].split_vote_counts.for} | Against: {item[header.field].split_vote_counts.against})
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <span className="text-gray-400 text-sm">N/A</span>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </Table.Td>
                                                                                ))}
                                                                            </Table.Tr>
                                                                        ))}
                                                                    </Table.Tbody>
                                                                </Table>
                                                            </div>
                                                        </TableWrapper>
                                                    ) : (
                                                        <div className="text-center py-12">
                                                            <Lucide icon="Vote" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Proxy Voting Data Available</h3>
                                                            <p className="text-gray-500">No proxy voting data found for {selectedCompany?.company_name}.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
                                            <p className="text-gray-500">No {modalTitle.toLowerCase()} found for {selectedCompany?.company_name}.</p>
                                        </div>
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