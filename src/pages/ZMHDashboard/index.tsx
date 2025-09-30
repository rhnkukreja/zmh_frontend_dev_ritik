import { useEffect, useState } from "react";
import _, { head } from "lodash";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  CompanyDashboard,
  fetchCompanyByName,
  fetchCompanyDashboard,
  getBoardDirectorMembers,
  getGraphQLBoardData,
  setPage,
} from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch, RootState } from "@/stores/store";
import { Helmet } from "react-helmet-async";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import InvestorCard from "@/components/InvestorCard";
import CaseStudiesCard from "@/components/CaseStudiesCard";
import AGMSummaryCard from "@/components/AGMSummaryCard";
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

function Main() {
  const dispatch: AppDispatch = useAppDispatch();

  // Active tab state
  const [activeTab, setActiveTab] = useState('ownership');

  // Modules count state
  const [modulesCount, setModulesCount] = useState<ModulesCount | null>(null);

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

  const { isCompanySelected } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const [searchParams] = useSearchParams();

  const { companyGlobalSearchName, companyGlobalSearchBoardName, companyGlobalSearchTicker, user } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const { companySearchAndUpdate } = useCompanySearch();
  const { tempSearch, graphQLBoardData, graphQLBoardDataLoading } =
    useAppSelector((state) => state.dashboard);
  const searchTicker = searchParams.get("ticker");

  useEffect(() => {
    dispatch(setIsCompanySelected(false));
  }, [isCompanySelected]);

  useEffect(() => {
    // Use board_name if available, otherwise fallback to company name
    const searchValue = companyGlobalSearchBoardName || companyGlobalSearchName;
    if (searchValue) {
      // Clean the search value by removing "Class A", "Class B", etc.
      const cleanSearchValue = searchValue.replace(/\s+(Class\s+[A-Z]|Common\s+Stock).*$/i, '').trim();
      console.log('Making API call with clean search value:', cleanSearchValue);
      dispatch(getGraphQLBoardData(cleanSearchValue));
    }
  }, [companyGlobalSearchBoardName, companyGlobalSearchName, dispatch]);

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

  // Scroll-based tab update
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'ownership', tab: 'ownership' },
        { id: 'shareholder-meeting-results', tab: 'shareholder-meeting-results' },
        { id: 'board-composition', tab: 'board-composition' }
      ];

      const scrollPosition = window.scrollY + 250; // Increased offset for sticky header

      // Check from bottom to top to get the most visible section
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionBottom = sectionTop + section.offsetHeight;

          // If scroll position is within this section
          if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            setActiveTab(sections[i].tab);
            break;
          }
          // If we're past all sections, activate the last one
          else if (i === sections.length - 1 && scrollPosition >= sectionTop) {
            setActiveTab(sections[i].tab);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check on mount
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


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
      <section >
        {/* Tabs - Top Level Navigation */}
        <div className="w-full sticky z-30 header-card transition-[margin,width,opacity] duration-1000 ease-in-out bg-white" style={{ top: "8.3rem" }}>
          <div className="bg-white mb-4 flex flex-col md:flex-row items-center justify-between">
            <div className="border-b border-gray-200 w-full">
              <nav className="grid grid-cols-3 w-full">
                <button
                  onClick={() => {
                    setActiveTab('ownership');
                    const element = document.getElementById('ownership');
                    if (element) {
                      const offsetTop = element.offsetTop - 200; // Increased offset for better spacing
                      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                    }
                  }}
                  className={`flex-1 py-4 px-6 border-b-2 font-medium text-sm text-center transition-all duration-200 ${activeTab === 'ownership'
                    ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-transparent bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Ownership
                </button>
                <button
                  onClick={() => {
                    setActiveTab('shareholder-meeting-results');
                    const element = document.getElementById('shareholder-meeting-results');
                    if (element) {
                      const offsetTop = element.offsetTop - 200; // Increased offset for better spacing
                      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                    }
                  }}
                  className={`flex-1 py-4 px-6 border-b-2 font-medium text-sm text-center transition-all duration-200 ${activeTab === 'shareholder-meeting-results'
                    ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-transparent bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Shareholder Meeting Results
                </button>
                <button
                  onClick={() => {
                    setActiveTab('board-composition');
                    const element = document.getElementById('board-composition');
                    if (element) {
                      const offsetTop = element.offsetTop - 200; // Increased offset for better spacing
                      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                    }
                  }}
                  className={`flex-1 py-4 px-6 border-b-2 font-medium text-sm text-center transition-all duration-200 ${activeTab === 'board-composition'
                    ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-transparent bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Board Composition (Beta)
                </button>
              </nav>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
          <div id="ownership" className="col-span-12 xl:col-span-12">
            <InvestorCard />
          </div>

          {/* <BoardDirectorMembers /> */}

          <div id="shareholder-meeting-results" className="col-span-12 xl:col-span-12">
            <AGMSummaryCard
              companyGlobalSearchTicker={companyGlobalSearchTicker}
              companyGlobalSearchName={companyGlobalSearchName}
              isMeetingModal={false}
              proxyContest={modulesCount?.proxy_contest || false}
              proxyContest2024={modulesCount?.proxy_contest_2024 || false}
              proxyContest2025={modulesCount?.proxy_contest_2025 || false}
            />
          </div>

          <div id="board-composition" className="col-span-12 xl:col-span-12">
            <div className="p-5 mt-3.5 box">
              <div className="w-full">
                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                    <span>
                      <h1 className="text-lg font-bold">Board Composition <Pill text="Beta"></Pill></h1>
                    </span>
                  </div>
                </div>

                {/* Board Composition Section */}
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
                              // Filter out members with end dates or without start dates, and sort by tenure (highest to lowest)
                              const activeMembers = boardItems
                                .filter((member: any) =>
                                  !member.endDate?.displayDate && // Hide members with end dates
                                  member.startDate?.displayDate   // Hide members without start dates
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
                                .sort((a: any, b: any) => b.tenureValue - a.tenureValue); // Sort highest to lowest

                              return activeMembers.map((member: any, index: number) => (
                                <Table.Tr key={index} className="[&_td]:last:border-b-0">
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px] text-left">
                                    <h1 className="font-semibold">{member.person?.name || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left">
                                    <h1>{member.title || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[100px] text-left">
                                    <h1>{member.person?.age ?? '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-left">
                                    <h1>{formatDate(member.startDate?.displayDate) || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-center">
                                    <h1>{calculateTenure(member.startDate?.displayDate, member.endDate?.displayDate)}</h1>
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

                  {/* Source at bottom of table */}
                  <div className="mt-3">
                    <p className="text-sm italic text-gray-500">Source: Altrata</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
