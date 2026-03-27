import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { useEffect } from "react";
import TableWrapper from "../TableWrapper";
import { getBoardDirectorMembers } from "@/stores/dashboardSlice";
import Table from "../Base/Table";
import { BoardDirectorMembers as TypesBoardDirectorMembers } from "@/types/dashboard";

const BoardDirectorMembers = () => {
  const dispatch = useAppDispatch();
  const { companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );

  const { getBoardDirectorMembersLoading, boardDirectorMembers } =
    useAppSelector((state) => state.dashboard);

  useEffect(() => {
    if (companyGlobalSearchTicker) {
      dispatch(getBoardDirectorMembers(companyGlobalSearchTicker));
    }
  }, [companyGlobalSearchTicker]);
  return (
    <>
      {boardDirectorMembers?.length > 0 && (
        <div className="col-span-12 xl:col-span-12">
          <div className="p-5 mt-3.5 box ">
            <h1 className="text-lg font-bold mb-2">Board Director Members</h1>

            <TableWrapper 
              isLoading={getBoardDirectorMembersLoading}
              rows={5}
              columns={6}
            >
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]">
                        Name
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]">
                        Position
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[80px]">
                        Age
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]">
                        Date First Elected
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2] w-[80px]">
                        Board Tenure
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]">
                        Board Committee(s)
                      </Table.Td>
                      <Table.Td className="py-2 font-semibold h-[50px] bg-header border-header text-[#000000B2]">
                        Qualifications and Experience
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {boardDirectorMembers?.length > 0 ? (
                      boardDirectorMembers.map(
                        (member: TypesBoardDirectorMembers) => (
                          <Table.Tr
                            key={member?.name + member?.age}
                            className="[&_td]:last:border-b-0"
                          >
                            <Table.Td className="py-2 border-dashed">
                              {member?.name}
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              {member?.position}
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              {member?.age}
                            </Table.Td>

                            <Table.Td className="py-2 border-dashed">
                              {member?.dateFirstElected}
                            </Table.Td>
                            <Table.Td
                              className={`py-2 border-dashed text-nowrap ${
                                member?.is_Color ? "text-red-500" : ""
                              }`}
                            >
                              {member?.tenure}
                            </Table.Td>
                            <Table.Td className="py-2 border-dashed">
                              {member?.committeeMemberships?.length > 0
                                ? member?.committeeMemberships?.map(
                                    (committee, index) => (
                                      <div
                                        key={index}
                                        className="bg-gray-100 px-4 py-1 rounded-full flex items-center shadow-sm text-nowrap mb-1 !w-max"
                                      >
                                        {committee}
                                      </div>
                                    )
                                  )
                                : "No Committees"}
                            </Table.Td>

                            <Table.Td className="py-2 border-dashed">
                              {member?.qualificationsAndExperience?.length > 0
                                ? member.qualificationsAndExperience.map(
                                    (qualification, index) => (
                                      <div
                                        key={index}
                                        className="bg-gray-100 px-4 py-1 rounded-full flex items-center shadow-sm text-nowrap mb-1 !w-max"
                                      >
                                        {qualification}
                                      </div>
                                    )
                                  )
                                : "No Qualifications"}
                            </Table.Td>
                          </Table.Tr>
                        )
                      )
                    ) : (
                      <div className="w-full">
                        <h1 className="mt-3">No Records Found...</h1>
                      </div>
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </TableWrapper>
          </div>
        </div>
      )}
    </>
  );
};

export default BoardDirectorMembers;
