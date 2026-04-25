import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch, RootState } from "@/stores/store";
// import { getGraphQLBoardData } from "@/stores/dashboardSlice";
import TableWrapper from "@/components/TableWrapper";
import Table from "@/components/Base/Table";

function BoardMembers() {
  const dispatch: AppDispatch = useAppDispatch();
  
  const { companyGlobalSearchName } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const { graphQLBoardData, graphQLBoardDataLoading } =
    useAppSelector((state) => state.dashboard);

  // useEffect(() => {
  //   if (companyGlobalSearchName) {
  //     dispatch(getGraphQLBoardData(companyGlobalSearchName));
  //   }
  // }, [companyGlobalSearchName, dispatch]);

  return (
    <>
      <div className="p-5 mt-3.5 box">
        <div className="w-full">
          <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
            <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
              <span>
                <h1 className="text-lg font-bold">Board Members</h1>
                {companyGlobalSearchName && (
                  <p className="italic text-sm text-gray-600">
                    Company: {companyGlobalSearchName}
                  </p>
                )}
              </span>
            </div>
          </div>
          
          <div className="mt-5">
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const boardItems = graphQLBoardData?.data?.data?.organizationKeywordSearch?.items?.[0]?.rolesBoard?.items;
                    
                    if (boardItems && boardItems.length > 0) {
                      return boardItems.map((member: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {member.person?.name || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {member.title || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {member.type || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {member.startDate?.displayDate || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              member.endDate?.displayDate 
                                ? 'bg-gray-100 text-gray-600' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {member.endDate?.displayDate ? `Ended ${member.endDate.displayDate}` : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ));
                    } else if (!graphQLBoardDataLoading) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <p className="text-lg font-medium text-gray-900 mb-1">No Board Members Found</p>
                              <p className="text-sm text-gray-500">
                                {companyGlobalSearchName 
                                  ? "No board members data available for this company"
                                  : "Please select a company to view board members"
                                }
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BoardMembers;
