import { useEffect } from "react";
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

function Main() {
  const dispatch: AppDispatch = useAppDispatch();
  const { isCompanySelected } = useAppSelector(
    (state: RootState) => state.authentiction
  );
  const [searchParams] = useSearchParams();

  const { companyGlobalSearchName, companyGlobalSearchTicker, user } = useAppSelector(
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
    if (companyGlobalSearchName) {
      dispatch(getGraphQLBoardData(companyGlobalSearchName));
    }
  }, [companyGlobalSearchName, dispatch]);


  if (window.clarity && user?.user_id) {
    window.clarity("identify", user?.user_id.toString(), {
      email: user.email,
      name: user.first_name,
    });
  }


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
        <div className="grid grid-cols-12 gap-y-10 gap-x-6">
          <div className="col-span-12 xl:col-span-12">
            <InvestorCard />
          </div>

          {/* <BoardDirectorMembers /> */}

          <div className="col-span-12 xl:col-span-12">
            <AGMSummaryCard companyGlobalSearchTicker={companyGlobalSearchTicker} companyGlobalSearchName={companyGlobalSearchName} isMeetingModal={false}  />
          </div>

          <div className="col-span-12 xl:col-span-12">
            <div className="p-5 mt-3.5 box">
              <div className="w-full">
                <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
                  <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
                    <span>
                      <h1 className="text-lg font-bold">Board Members</h1>
                    </span>
                  </div>
                </div>
                
                <div className="mt-5">
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
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[130px] text-left">
                              Type
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[130px] text-left">
                              Start Date
                            </Table.Td>
                            <Table.Td className="py-2 font-semibold h-[50px] bg-header last:rounded-tr-[0.6rem] border-header text-[#000000B2] w-[130px] text-left">
                              End Date
                            </Table.Td>
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {(() => {
                            const boardItems = graphQLBoardData?.data?.data?.organizationKeywordSearch?.items?.[0]?.rolesBoard?.items;
                            
                            if (boardItems && boardItems.length > 0) {
                              return boardItems.map((member: any, index: number) => (
                                <Table.Tr key={index} className="[&_td]:last:border-b-0">
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[200px] text-left">
                                    <h1 className="font-semibold">{member.person?.name || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left">
                                    <h1>{member.title || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-left">
                                    <h1>{member.type || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-left">
                                    <h1>{member.startDate?.displayDate || '-'}</h1>
                                  </Table.Td>
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 w-[130px] text-left">
                                    <h1>{member.endDate?.displayDate || 'Current'}</h1>
                                  </Table.Td>
                                </Table.Tr>
                              ));
                            } else {
                              return !graphQLBoardDataLoading ? (
                                <Table.Tr>
                                  <Table.Td colSpan={5} className="py-4 text-center text-gray-500">
                                    No board members data available
                                  </Table.Td>
                                </Table.Tr>
                              ) : null;
                            }
                          })()}
                        </Table.Tbody>
                      </Table>
                    </div>
                  </TableWrapper>
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
