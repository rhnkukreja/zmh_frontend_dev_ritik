import { useEffect, useState } from "react";
import _, { head } from "lodash";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  CompanyDashboard,
  fetchCompanyByName,
  fetchCompanyDashboard,
  fetchCompanyOverview,
  fetchCompanyOverviewGPT,
  fetchAGMSummaryDashboard,
  getBoardDirectorMembers,
  setPage,
  setTempSearch,
} from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch, RootState } from "@/stores/store";
import { Helmet } from "react-helmet-async";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import InvestorCard from "@/components/InvestorCard";
import CaseStudiesCard from "@/components/CaseStudiesCard";
import AGMSummaryCard from "@/components/AGMSummaryCard";
import CompanyOverview from "@/components/CompanyOverview";
import CompanyOverviewGPT from "@/components/CompanyOverviewGPT";
import { setIsCompanySelected } from "@/stores/authenticationSlice";
import BoardDirectorMembers from "@/components/BoardDirectorMembers";
import LoadingIcon from "@/components/Base/LoadingIcon";
import TableWrapper from "@/components/TableWrapper";
import Table from "@/components/Base/Table";
import { dashboardService } from "@/services/dashboard";
import useCompanySearch from "@/hooks/useCompanySearch";
import { CompanyData } from "@/types/company";
import { ModulesCount } from "@/types/dashboard";
import Pill from "@/components/Pill";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { FileText, Building2, Users, Vote } from "lucide-react";

function Main() {
  const dispatch: AppDispatch = useAppDispatch();

  const { user } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  // Check if user is admin
  const isAdmin = user?.user_type === 'Admin';

  // Active tab state - default based on user role
  const [activeTab, setActiveTab] = useState(isAdmin ? 'company-overview' : 'ownership');

  // Modules count state
  const [modulesCount, setModulesCount] = useState<ModulesCount | null>(null);

  // Loading states for both components
  const [isOwnershipLoaded, setIsOwnershipLoaded] = useState(false);
  const [isMeetingLoaded, setIsMeetingLoaded] = useState(false);

  // Handle generate report
  const handleGenerateReport = () => {
    if (companyGlobalSearchTicker) {
      window.open(`/company-report?ticker=${encodeURIComponent(companyGlobalSearchTicker)}`, "_blank");
    }
  };

  // Format date function - Month and Year only
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Calculate tenure function
  const calculateTenure = (startDateString: string, endDateString?: string) => {
    if (!startDateString) return '-';

    let startDate = new Date(startDateString);

    // If month is missing, assume January
    if (startDateString.length === 4) {
      startDate = new Date(`${startDateString}-01-01`);
    }

    let endDate = endDateString ? new Date(endDateString) : new Date();

    // If end date month is missing, assume January
    if (endDateString && endDateString.length === 4) {
      endDate = new Date(`${endDateString}-01-01`);
    }

    const diffInMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    if (diffInMonths < 12) {
      return '<1 year';
    } else {
      const years = Math.floor(diffInMonths / 12);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  const { isCompanySelected, companyGlobalSearchName, companyGlobalSearchBoardName, companyGlobalSearchTicker, companyGlobalSearchId } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const [searchParams] = useSearchParams();

  const { companySearchAndUpdate } = useCompanySearch();
  const { tempSearch, graphQLBoardData, graphQLBoardDataLoading } =
    useAppSelector((state) => state.dashboard);
  const searchTicker = searchParams.get("ticker");

  useEffect(() => {
    dispatch(setIsCompanySelected(false));
  }, [isCompanySelected]);

  // useEffect(() => {
  //   // Use board_name if available, otherwise fallback to company name
  //   const searchValue = companyGlobalSearchBoardName || companyGlobalSearchName;
  //   if (searchValue) {
  //     // Clean the search value by removing "Class A", "Class B", etc.
  //     const cleanSearchValue = searchValue.replace(/\s+(Class\s+[A-Z]|Common\s+Stock).*$/i, '').trim();
  //     console.log('Making API call with clean search value:', cleanSearchValue);
  //     dispatch(getGraphQLBoardData(cleanSearchValue));
  //   }
  // }, [companyGlobalSearchBoardName, companyGlobalSearchName, dispatch]);

  // Fetch modules count when company changes
  useEffect(() => {
    const fetchModulesCount = async () => {
      if (companyGlobalSearchName) {
        try {
          const response = await dashboardService.getModulesCount({
            global_search: companyGlobalSearchName
          });
          setModulesCount(response.result);
        } catch (error) {
          console.error('Error fetching modules count:', error);
        }
      }
    };

    fetchModulesCount();
  }, [companyGlobalSearchName]);

  // Fetch all tab data on initial load
  useEffect(() => {
    if (companyGlobalSearchTicker && companyGlobalSearchId) {
      // Only fetch if data doesn't exist (first load or company changed)
      if (companyGlobalSearchTicker !== tempSearch) {
        // 1. Fetch Ownership data
        dispatch(
          fetchCompanyDashboard(
            createDynamicURL(
              `${baseURL}/company-dashboard/?ticker=${companyGlobalSearchTicker}`
            )
          )
        );

        // 2. Fetch Company Overview data (for admins only)
        if (isAdmin) {
          dispatch(
            fetchCompanyOverview(
              `${baseURL}/company_report/key_findings/?company_id=${companyGlobalSearchId}`
            )
          );

          // 3. Fetch Company Overview GPT data (for admins only)
          dispatch(
            fetchCompanyOverviewGPT(
              `${baseURL}/company_report/key_findings_gpt/?company_id=${companyGlobalSearchId}`
            )
          );
        }

        // 4. Fetch Shareholder Meeting Results data
        dispatch(
          fetchAGMSummaryDashboard(
            createDynamicURL(
              `${baseURL}/voting_report_8k/`,
              { ticker: companyGlobalSearchTicker }
            )
          )
        );

        // Set tempSearch to mark data as loaded for this company
        dispatch(setTempSearch(companyGlobalSearchTicker));
      }
    }
  }, [companyGlobalSearchTicker, companyGlobalSearchId, tempSearch, dispatch, isAdmin]);

  // No scroll-based tab update - tabs now show/hide content instead


  if (window.clarity && user?.user_id) {
    window.clarity("identify", user?.user_id.toString(), {
      email: user.email,
      name: user.first_name,
    });
  }

  console.log("modulesCount:", modulesCount)


  // useEffect(() => {
  //   if (companyGlobalSearchTicker === tempSearch) {
  //     getCompanyHeader();
  //   }
  // }, [companyGlobalSearchTicker]);


  // const getCompanyHeader = async () => {
  //   try {
  //     const res = await dashboardService.getCompanyName(searchTicker);
  //     if (res.result) {
  //       const data = res.result[0];
  //       const companyData: CompanyData = {id: data?.id, name: data?.name, symbol: data?.symbol};
  //       if (companyData?.id) {
  //         await companySearchAndUpdate(companyData);
  //       }
  //       console.log(res.result);
  //     }
  //   } catch (error) {
  //     return error;
  //   } finally {
  //   }

  // };


  return (
    <>
      <section>
        {/* Tabs - Top Level Navigation */}
        <div className="w-full sticky z-30 header-card transition-all duration-300 ease-in-out bg-white shadow-md" style={{ top: "9.3rem" }}>
          <div className="bg-gradient-to-r from-white to-gray-50 flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="bg-white rounded-xl p-1.5 flex items-center gap-1.5 shadow-sm border border-gray-200">
              {/* Company Overview - Admin Only */}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('company-overview')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'company-overview'
                      ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Company Overview
                </button>
              )}

              {/* Company Overview GPT - Admin Only */}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('company-overview-gpt')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'company-overview-gpt'
                      ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Company Overview
                </button>
              )}

              {/* Ownership - All Users */}
              <button
                onClick={() => setActiveTab('ownership')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'ownership'
                    ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Ownership
              </button>

              {/* Shareholder Meeting Results - All Users */}
              <button
                onClick={() => setActiveTab('shareholder-meeting-results')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'shareholder-meeting-results'
                    ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Vote className="w-4 h-4" />
                Shareholder Meeting Results
              </button>
            </div>
            {companyGlobalSearchTicker && isAdmin && (
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold text-sm rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md flex items-center gap-2.5 border border-primary/20"
                onClick={handleGenerateReport}
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
          {activeTab === 'company-overview' && isAdmin && (
            <div id="company-overview" className="col-span-12 xl:col-span-12">
              <CompanyOverview />
            </div>
          )}

          {activeTab === 'company-overview-gpt' && isAdmin && (
            <div id="company-overview-gpt" className="col-span-12 xl:col-span-12">
              <CompanyOverviewGPT />
            </div>
          )}

          {activeTab === 'ownership' && (
            <div id="ownership" className="col-span-12 xl:col-span-12">
              <InvestorCard onLoaded={() => setIsOwnershipLoaded(true)} />
            </div>
          )}

          {activeTab === 'shareholder-meeting-results' && (
            <div id="shareholder-meeting-results" className="col-span-12 xl:col-span-12">
              <AGMSummaryCard
                companyGlobalSearchTicker={companyGlobalSearchTicker}
                companyGlobalSearchName={companyGlobalSearchName}
                isMeetingModal={false}
                proxyContest={modulesCount?.proxy_contest || false}
                proxyContest2024={modulesCount?.proxy_contest_2024 || false}
                proxyContest2025={modulesCount?.proxy_contest_2025 || false}
                onLoaded={() => setIsMeetingLoaded(true)}
              />
            </div>
          )}

          {/* <div id="board-composition" className="col-span-12 xl:col-span-12">
            <div className="p-5 mt-3.5 box">
              <div className="w-full">
                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                    <span>
                      <h1 className="text-lg font-bold">Board Composition <Pill text="Beta"></Pill></h1>
                    </span>
                  </div>
                </div>

                <div id="board-composition" className="mt-5">
                  <TableWrapper isLoading={graphQLBoardDataLoading}>
                    <div>
                      <Table className="w-full">
                        <Table.Thead className="sticky top-0 z-10">
                          <Table.Tr>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] border-header text-[#000000B2] w-[200px] text-left">
                              Person Name
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[150px] text-left">
                              Title
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[100px] text-left">
                              Age
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[130px] text-left">
                              Start Date
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[130px] text-center">
                              Tenure (years)
                            </Table.Td>
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {(() => {
                            const boardItems = graphQLBoardData?.data?.data?.organizationKeywordSearch?.items?.[0]?.rolesBoard?.items;

                            console.log('GraphQL Response:', graphQLBoardData);
                            console.log('Board Items:', boardItems);

                            if (boardItems && boardItems.length > 0) {
                              const activeMembers = boardItems
                                .filter((member: any) =>
                                  !member.endDate?.displayDate &&
                                  member.startDate?.displayDate 
                                )
                                .map((member: any) => ({
                                  ...member,
                                  tenureValue: (() => {
                                    if (!member.startDate?.displayDate) return 0;
                                    let startDate = new Date(member.startDate.displayDate);
                                    if (member.startDate.displayDate.length === 4) {
                                      startDate = new Date(`${member.startDate.displayDate}-01-01`);
                                    }
                                    const diffInMonths = (new Date().getFullYear() - startDate.getFullYear()) * 12 +
                                      (new Date().getMonth() - startDate.getMonth());
                                    return Math.floor(diffInMonths / 12);
                                  })()
                                }))
                                .sort((a: any, b: any) => b.tenureValue - a.tenureValue);

                              return activeMembers.map((member: any, index: number) => (
                                <Table.Tr key={index} className="[&_td]:last:border-b-0">
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px] text-left">
                                    <h1 className="font-semibold">{member.person?.name || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left">
                                    <h1>{member.title || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[100px] text-left">
                                    <h1>{member.person?.age}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-left">
                                    <h1>{formatDate(member.startDate?.displayDate) || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-center">
                                    <h1 className={(() => {
                                      const tenure = calculateTenure(member.startDate?.displayDate, member.endDate?.displayDate);
                                      const tenureMatch = tenure.match(/(\d+)\s+year/);
                                      const years = tenureMatch ? parseInt(tenureMatch[1]) : 0;
                                      return years > 10 ? "text-red-700 font-semibold" : "";
                                    })()}>
                                      {calculateTenure(member.startDate?.displayDate, member.endDate?.displayDate)}
                                    </h1>
                                  </Table.Td>
                                </Table.Tr>
                              ));
                            } else {
                              console.log('No board items found. Loading:', graphQLBoardDataLoading, 'Company:', companyGlobalSearchName);
                              return !graphQLBoardDataLoading ? (
                                <Table.Tr>
                                  <Table.Td colSpan={4} className="py-4 text-center text-gray-500">
                                    {companyGlobalSearchName
                                      ? `No board members data available for ${companyGlobalSearchName}`
                                      : "Please select a company to view board members"
                                    }
                                  </Table.Td>
                                </Table.Tr>
                              ) : null;
                            }
                          })()}
                        </Table.Tbody>
                      </Table>
                    </div>
                  </TableWrapper>

                  <div className="mt-3">
                    <p className="text-sm italic text-gray-500">Source: Altrata</p>
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* <div className="col-span-12 xl:col-span-12">
            <CaseStudiesCard />
          </div> */}
        </div>
      </section>
      {/* </>
      } */}
    </>
  );
}

export default Main;
