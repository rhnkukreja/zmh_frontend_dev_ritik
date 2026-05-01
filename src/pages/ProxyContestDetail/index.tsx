import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { toast } from "react-toastify";
import Button from "@/components/Base/Button";
import Table from "@/components/Base/Table";
import TableWrapper from "@/components/TableWrapper";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Tippy from "@/components/Base/Tippy";
import Lucide from "@/components/Base/Lucide";
import { ChevronLeft } from "lucide-react";
import { baseURL } from "@/constant";
import axios from "axios";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import CaseProxyModal from "../ProxyContest/components/CaseProxyModal";
import PdfViewer from "@/components/PdfView";

const ProxyContestDetail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { companyId } = useParams();

    // Get global search state
    const { companyGlobalSearchName } = useAppSelector((state: RootState) => state.authentiction);

    // Get company data from navigation state
    const { company, companyName, year, meetingDate, fromProxyContest } = location.state || {};

    // Check if we came from global search by checking URL params
    const urlParams = new URLSearchParams(location.search);
    const globalCompanyParam = urlParams.get('globalCompany');
    const isFromGlobalSearch = globalCompanyParam && companyGlobalSearchName;

    // State for all data
    const [loading, setLoading] = useState(false);
    const [documentsData, setDocumentsData] = useState<any>(null);
    const [meetingDetailsData, setMeetingDetailsData] = useState<any>(null);
    const [caseStudiesData, setCaseStudiesData] = useState<any[]>([]);
    const [proxyAdvisoryData, setProxyAdvisoryData] = useState<any[]>([]);
    const [proxyVotingData, setProxyVotingData] = useState<any>(null);
    const [resolvedYear, setResolvedYear] = useState<string>(company?.year || year || "");

    // Modal states
    const [caseProxyModalVisible, setCaseProxyModalVisible] = useState<boolean>(false);
    const [caseProxyModalData, setCaseProxyModalData] = useState<any>(null);
    const [pdfVisible, setPdfVisible] = useState<boolean>(false);
    const [currentPdfDoc, setCurrentPdfDoc] = useState<string>("");
    const [currentPdfName, setCurrentPdfName] = useState<string>("");

    const gotoDetailPage = (pdf: string, pdf_name: string) => {
        setCurrentPdfDoc(pdf);
        setCurrentPdfName(pdf_name);
    };

    // Create a custom axios instance without global error interceptor
    const customAxios = useMemo(() => {
        return axios.create({
            baseURL: baseURL,
            headers: {
                'Authorization': `JWT ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            }
        });
    }, []);

    // Fetch all data
    const fetchAllData = async () => {
        if (!company?.company_name) {
            console.log("Company information not available");
            return;
        }

        setLoading(true);

        const companyName = encodeURIComponent(company.company_name);
        const yearForActivismTables = resolvedYear || company.year;
        const encodedYearParam = yearForActivismTables
            ? encodeURIComponent(JSON.stringify([String(yearForActivismTables)]))
            : "";

        // Create a promise array for all API calls
        const apiCalls = [
            // Fetch Documents (Activism Tables)
            customAxios.get(
                `/activism_tables/?company_name=${companyName}${
                    encodedYearParam ? `&year=${encodedYearParam}` : ""
                }`
            )
                .then(response => {
                    setDocumentsData(response.data);
                    setProxyAdvisoryData(response.data?.Activism_ISS_GL || []);
                })
                .catch(error => {
                    console.log("Documents API error - this is normal if no data exists");
                    setDocumentsData(null);
                    setProxyAdvisoryData([]);
                }),

            // Fetch Meeting Details
            customAxios.get(`/voting_report_8k/?company_name=${encodeURIComponent(JSON.stringify([company.company_name]))}&year=${encodeURIComponent(company.year)}`)
                .then(response => {
                    setMeetingDetailsData(response.data);
                })
                .catch(error => {
                    console.log("Meeting details API error - this is normal if no data exists");
                    setMeetingDetailsData(null);
                }),

            // Fetch Case Studies
            customAxios.get(`/case_studies/?company_name=${encodeURIComponent(JSON.stringify([company.company_name]))}&themes=${encodeURIComponent(JSON.stringify(['Proxy Contest/M&A']))}`)
                .then(response => {
                    setCaseStudiesData(response.data?.results || []);
                })
                .catch(error => {
                    console.log("Case studies API error - this is normal if no data exists");
                    setCaseStudiesData([]);
                }),

            // Fetch Proxy Voting Data
            customAxios.get(`/vds_proxy_voting/?year=${company.year}&company_name=[%27${encodeURIComponent(company.company_name)}%27]&top=true`)
                .then(response => {
                    setProxyVotingData(response.data);
                })
                .catch(error => {
                    console.log("Proxy voting API error - this is normal if no data exists");
                    setProxyVotingData(null);
                })
        ];

        // Execute all API calls and wait for completion
        try {
            await Promise.allSettled(apiCalls);
        } catch (error) {
            console.error("Error in API calls:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchYearIfMissing = async () => {
            if (resolvedYear || !companyId) return;

            try {
                const pageSize = 200;
                let url: string | null = `/api/proxy-contest-companies/?page=1&page_size=${pageSize}`;
                const targetId = Number(companyId);

                while (url) {
                    const res = await customAxios.get(url);
                    const results = Array.isArray(res?.data?.results) ? res.data.results : [];
                    const match = results.find((r: any) => r?.company_id === targetId);
                    if (match?.year) {
                        setResolvedYear(String(match.year));
                        return;
                    }
                    url = typeof res?.data?.next === "string" ? res.data.next.replace(baseURL, "") : null;
                }
            } catch (e) {
                console.error("Failed to resolve proxy contest year:", e);
            }
        };

        fetchYearIfMissing();
    }, [companyId, resolvedYear]);

    useEffect(() => {
        fetchAllData();
    }, [company?.company_name, resolvedYear]);

    if (!company) {
        return (
            <div className="p-5 mt-1 box">
                <div className="text-center py-12">
                    <Lucide icon="AlertCircle" className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Company Data</h3>
                    <p className="text-gray-500">Company information is not available.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-5 mt-1 box">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {/* Only show back button if NOT from global search */}
                        {!isFromGlobalSearch && (
                            <Button
                                onClick={() => {
                                    navigate('/proxy-contest', {
                                        replace: true,
                                        state: { preventAutoNavigation: true }
                                    });
                                }}
                                variant="primary"
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft size={18} />
                                Back
                            </Button>
                        )}
                        <div>
                            <div className="font-bold text-2xl pt-4">
                                {company.company_name}
                            </div>
                            <p className="text-gray-600 mt-2">
                                Meeting Date: {company.meeting_date}
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <LoadingIcon icon="three-dots" className="w-12 h-12" />
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Proxy Advisory Firm Recommendations */}
                        {proxyAdvisoryData.length > 0 && (
                            <div className="box p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold">Proxy Advisory Firm Recommendations</h2>
                                </div>
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
                                                    const companies = [...new Set(proxyAdvisoryData.map((item: any) => item.company_tent))];

                                                    return companies.map((companyName: string, index: number) => {
                                                        const issData = proxyAdvisoryData.find((item: any) => item.type === 'ISS' && item.company_tent === companyName);
                                                        const glData = proxyAdvisoryData.find((item: any) => item.type === 'GL' && item.company_tent === companyName);

                                                        return (
                                                            <Table.Tr key={index} className="hover:bg-gray-50 border-b border-gray-100">
                                                                <Table.Td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100">
                                                                    {companyName || companyName || 'N/A'}
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
                            </div>
                        )}
                        {/* Case Studies */}
                        {caseStudiesData.length > 0 && (
                            <div className="box p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold">Case Studies</h2>
                                </div>
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
                                                    <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]">
                                                        Industry
                                                    </Table.Td>
                                                    <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center w-20">
                                                        View
                                                    </Table.Td>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {caseStudiesData.map((item: any, index: number) => (
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
                                                            {item?.esg_themes && item?.esg_themes !== 'N/A' ? item?.esg_themes : (item?.esg_themes === 'N/A' ? '' : 'Proxy Contest/M&A')}
                                                        </Table.Td>
                                                        <Table.Td className="py-2 border-dashed">
                                                            {item?.industry || 'N/A'}
                                                        </Table.Td>
                                                        <Table.Td className="py-2 border-dashed text-center">
                                                            <Tippy content="View Details" options={{ theme: "light" }}>
                                                                <Lucide
                                                                    onClick={() => {
                                                                        setCaseProxyModalVisible(true);
                                                                        setCaseProxyModalData({
                                                                            ...item,
                                                                            company_name: company.company_name,
                                                                            company_id: company.company_id,
                                                                            showDetailedView: true
                                                                        });
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
                            </div>
                        )}
                        {/* Documents Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Company and Investor Presentations */}
                            {documentsData?.Activism_Presentation?.length > 0 && (
                                <div className="box p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold">Company and Investor Presentations</h2>
                                    </div>
                                    <TableWrapper>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]">
                                                            Document Name
                                                        </Table.Td>
                                                        <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center w-20">
                                                            View
                                                        </Table.Td>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {documentsData.Activism_Presentation.map((item: any, index: number) => (
                                                        <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                            <Table.Td className="py-2 border-dashed">
                                                                <h1
                                                                    onClick={() => {
                                                                        if (item?.document_url) {
                                                                            gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                            setPdfVisible(true);
                                                                        }
                                                                    }}
                                                                    className={`font-medium ${item?.document_url ? 'cursor-pointer hover:underline text-blue-600' : 'text-gray-700'}`}
                                                                >
                                                                    {item?.document_name || 'Unnamed Document'}
                                                                </h1>
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed text-center">
                                                                {item?.document_url && (
                                                                    <Tippy content="View Document" options={{ theme: "light" }}>
                                                                        <Lucide
                                                                            onClick={() => {
                                                                                gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                setPdfVisible(true);
                                                                            }}
                                                                            icon="Eye"
                                                                            className="w-4 h-4 stroke-[1.3] cursor-pointer text-gray-600 hover:text-gray-800"
                                                                        />
                                                                    </Tippy>
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

                            {/* Press Releases */}
                            {documentsData?.Activism_Press_Release?.length > 0 && (
                                <div className="box p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold">Press Releases</h2>
                                    </div>
                                    <TableWrapper>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2]">
                                                            Document Name
                                                        </Table.Td>
                                                        <Table.Td className="py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] text-center w-20">
                                                            View
                                                        </Table.Td>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {documentsData.Activism_Press_Release.map((item: any, index: number) => (
                                                        <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                            <Table.Td className="py-2 border-dashed">
                                                                <h1
                                                                    onClick={() => {
                                                                        if (item?.document_url) {
                                                                            gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                            setPdfVisible(true);
                                                                        }
                                                                    }}
                                                                    className={`font-medium ${item?.document_url ? 'cursor-pointer hover:underline text-blue-600' : 'text-gray-700'}`}
                                                                >
                                                                    {item?.document_name || 'Unnamed Document'}
                                                                </h1>
                                                            </Table.Td>
                                                            <Table.Td className="py-2 border-dashed text-center">
                                                                {item?.document_url && (
                                                                    <Tippy content="View Document" options={{ theme: "light" }}>
                                                                        <Lucide
                                                                            onClick={() => {
                                                                                gotoDetailPage(item.document_url, item.document_name || 'Document');
                                                                                setPdfVisible(true);
                                                                            }}
                                                                            icon="Eye"
                                                                            className="w-4 h-4 stroke-[1.3] cursor-pointer text-gray-600 hover:text-gray-800"
                                                                        />
                                                                    </Tippy>
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
                        </div>

                        {/* Meeting Details */}
                        {meetingDetailsData && (meetingDetailsData.company || meetingDetailsData.nominees || meetingDetailsData.proposals) && (
                            <div className="box p-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold">Meeting Details</h2>
                                </div>
                                <div className="space-y-6">
                                    {/* Company Information */}
                                    {meetingDetailsData.company && meetingDetailsData.company.length > 0 && (
                                        <div>
                                            <h3 className="mb-3 border-b border-gray-200 pb-2">
                                                Company Information
                                            </h3>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                {meetingDetailsData.company.map((companyInfo: any, index: number) => {
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
                                    {meetingDetailsData.nominees && meetingDetailsData.nominees.length > 0 && (
                                        <div>
                                            <h3 className="mb-3 border-b border-gray-200 pb-2">
                                                Nominees
                                            </h3>
                                            <TableWrapper>
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <Table.Thead>
                                                            <Table.Tr>
                                                                {meetingDetailsData.nominees_headers?.map((header: any, index: number) => (
                                                                    <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] ${index === 0 ? 'min-w-[250px] max-w-[300px]' : ''}`}>
                                                                        {header.header}
                                                                    </Table.Td>
                                                                ))}
                                                            </Table.Tr>
                                                        </Table.Thead>
                                                        <Table.Tbody>
                                                            {meetingDetailsData.nominees.map((nominee: any, index: number) => (
                                                                <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                    {meetingDetailsData.nominees_headers?.map((header: any, headerIndex: number) => (
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
                                    {meetingDetailsData.proposals && meetingDetailsData.proposals.length > 0 && (
                                        <div>
                                            <h3 className="mb-3 border-b border-gray-200 pb-2">
                                                Proposals
                                            </h3>
                                            <TableWrapper>
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <Table.Thead>
                                                            <Table.Tr>
                                                                {meetingDetailsData.proposals_headers?.map((header: any, index: number) => (
                                                                    <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-header border-header text-[#000000B2] ${index === 0 ? 'min-w-[250px] max-w-[300px]' : ''}`}>
                                                                        {header.header}
                                                                    </Table.Td>
                                                                ))}
                                                            </Table.Tr>
                                                        </Table.Thead>
                                                        <Table.Tbody>
                                                            {meetingDetailsData.proposals.map((proposal: any, index: number) => (
                                                                <Table.Tr key={index} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                                    {meetingDetailsData.proposals_headers?.map((header: any, headerIndex: number) => (
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
                            </div>
                        )}

                        {/* Proxy Voting (Top 5) */}
                        {/* {proxyVotingData && proxyVotingData.vds_report && proxyVotingData.vds_report.length > 0 && (
                            <div className="box p-5 mt-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold">Proxy Voting (Top 5)</h2>
                                </div>

                                <TableWrapper>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    {proxyVotingData.vds_report_headers?.map((header: any, index: number) => (
                                                        <Table.Td key={index} className={`py-2 font-semibold h-[40px] bg-gray-50 border-gray-200 text-gray-700 ${index === 0 ? 'min-w-[80px]' : index === 1 ? 'min-w-[300px]' : 'min-w-[150px]'}`}>
                                                            {header.header}
                                                        </Table.Td>
                                                    ))}
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {proxyVotingData.vds_report.map((item: any, rowIndex: number) => (
                                                    <Table.Tr key={rowIndex} className="[&_td]:last:border-b-0 hover:bg-gray-50">
                                                        {proxyVotingData.vds_report_headers?.map((header: any, colIndex: number) => (
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
                                                                                <span className={`text-sm ${item[header.field].vote === 'Withhold' || item[header.field].vote === 'Against'
                                                                                        ? 'text-red-700 font-semibold '
                                                                                        : 'text-gray-900'
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
                            </div>
                        )} */}



                        {/* No Data Message */}
                        {!loading &&
                            proxyAdvisoryData.length === 0 &&
                            (!documentsData?.Activism_Presentation?.length) &&
                            (!documentsData?.Activism_Press_Release?.length) &&
                            (!meetingDetailsData || (!meetingDetailsData.company && !meetingDetailsData.nominees && !meetingDetailsData.proposals)) &&
                            caseStudiesData.length === 0 && (
                                <div className="box p-5">
                                    <div className="text-center py-12">
                                        <Lucide icon="FileX" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">No Data Available</h3>
                                        <p className="text-gray-500">No information found for {company.company_name}.</p>
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <CaseProxyModal
                caseProxyModalVisible={caseProxyModalVisible}
                setCaseProxyModalVisible={setCaseProxyModalVisible}
                caseProxyModalData={caseProxyModalData}
            />

            {pdfVisible && (
                <PdfViewer
                    pdfVisible={pdfVisible}
                    setPdfVisible={setPdfVisible}
                    currentPdfDoc={currentPdfDoc}
                    currentPdfName={currentPdfName}
                />
            )}
        </>
    );
};

export default ProxyContestDetail;