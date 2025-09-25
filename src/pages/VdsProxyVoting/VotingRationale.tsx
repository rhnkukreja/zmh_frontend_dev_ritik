import LoadingIcon from "@/components/Base/LoadingIcon";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import Tippy from "@/components/Base/Tippy";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { getProxyVotingRationale } from "@/stores/dashboardSlice";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { createDynamicURL, downloadXlsxFile } from "@/utils/helper";
import { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useSearchParams } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";

interface VotingRationaleProps {
  filter?: any;
  meetingDate?: string;
  tabType?: "top20" | "allInvestors";
  parentLoading?: boolean; // Add parent loading state prop
}
const VotingRationale: React.FC<VotingRationaleProps> = ({ filter, meetingDate, tabType, parentLoading }) => {
  const dispatch = useAppDispatch();
  const { companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );

  const { getProxyVotingRationaleLoading, votingRationale, votingRationaleTop20, votingRationaleAllInvestors, tab } =
    useAppSelector((state) => state.dashboard);
  const [searchParams] = useSearchParams();
  const [groupVotingRationale, setGroupVotingRationale] = useState<any>([]);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const yearTicker = searchParams.get("year");

  // Select the correct voting rationale data based on tab type
  const currentVotingRationale = tabType === "top20" ? votingRationaleTop20 : votingRationaleAllInvestors;

  useEffect(() => {
    const groupedQuestions = currentVotingRationale?.reduce(
      (acc: any, question: any) => {
        const investorName = question?.investor_name;
        if (!acc[investorName]) {
          acc[investorName] = [];
        }
        acc[investorName].push(question);
        return acc;
      },
      {}
    );

    setGroupVotingRationale(groupedQuestions);
  }, [currentVotingRationale]);

  useEffect(() => {
    if (groupVotingRationale) {
      const initialOpenGroups = Object.keys(groupVotingRationale).reduce(
        (acc, investorName) => {
          acc[investorName] = openGroups[investorName] ?? false;
          return acc;
        },
        {} as { [key: string]: boolean }
      );
      setOpenGroups(initialOpenGroups);
    }
  }, [groupVotingRationale]);

  const toggleGroup = (investorName: string) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [investorName]: !prevState[investorName],
    }));
  };

  // NOTE: All API calls for voting rationale are now handled by the parent component
  // This component only displays the data from Redux store
  // No useEffect for API calls needed here

  // State management is now handled entirely by the parent component


  return (
    <div className="mt-8">
      <div className="flex justify-between mb-4 mt-1">
        <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
          <div>
            <h1 className="text-lg font-bold">
              Voting Rationale
            </h1>
            {filter?.length === 0 && tab === "Top-20" && (
              <p className="text-sm text-slate-500 mt-1 italic">
                Showing Top 10 institutions
              </p>
            )}
            {
              meetingDate &&
              <p className="text-sm italic text-slate-600 dark:text-slate-400 mt-1"> Meeting Date: {meetingDate} </p>
            }
          </div>
        </div>
        {currentVotingRationale?.length > 0 && (
          <div className="flex justify-end items-center gap-4 xs:mt-4 md:mt-0">
            <Tippy content="Download Excel" options={{ theme: "light" }}>
              <div
                className="box p-[5px] cursor-pointer"
                onClick={() =>
                  downloadXlsxFile({
                    data: currentVotingRationale,
                    fileName: `Voting_Rational_${companyGlobalSearchTicker}.xlsx`,
                  })
                }
              >
                <img alt="download-icon" src={downloadIcon} />
              </div>
            </Tippy>
          </div>
        )}
      </div>

      {/* Show loading state when either parent loading or rationale loading */}
      {(parentLoading || getProxyVotingRationaleLoading) && !currentVotingRationale?.length && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}

      {currentVotingRationale?.length > 0 && (
        <>
          <TableWrapper isLoading={getProxyVotingRationaleLoading || parentLoading}>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                      Investor Name
                    </Table.Td>

                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                      Proposal
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                      Voting Rationale
                    </Table.Td>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody className="!max-h-400px overflow-auto">
                  <>
                    {groupVotingRationale ? (
                      Object.entries(groupVotingRationale).map(
                        ([investorName, institutionQuestions]: [
                          string,
                          any
                        ]) => (
                          <>
                            <Table.Tr
                              className="bg-gray-100 dark:bg-darkmode-700 cursor-pointer sticky top-12 z-10"
                              onClick={() => toggleGroup(investorName)}
                            >
                              <Table.Td
                                colSpan={5}
                                className="font-semibold py-2 "
                              >
                                <div className="flex flex-row justify-start items-center">
                                  {investorName}
                                  <button className="ml-2 text-blue-500">
                                    {openGroups[investorName] ? (
                                      <Lucide
                                        icon="ChevronUp"
                                        className="w-6 h-6 mr-2"
                                      />
                                    ) : (
                                      <Lucide
                                        icon="ChevronDown"
                                        className="w-6 h-6 mr-2"
                                      />
                                    )}
                                  </button>
                                </div>
                              </Table.Td>
                            </Table.Tr>

                            {openGroups[investorName] &&
                              Array.isArray(institutionQuestions) &&
                              institutionQuestions.map((question: any) => (
                                <Table.Tr
                                  key={question?.id}
                                  className="[&_td]:last:border-b-0"
                                >
                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600  !w-[200px] "></Table.Td>

                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600 !min-w-[150px] ">
                                    {question?.proposal}
                                  </Table.Td>

                                  <Table.Td className="py-2 border-dashed dark:bg-darkmode-600">
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: question?.voting_rationale,
                                      }}
                                      data-tooltip-id="tooltip-for-question"
                                      data-tooltip-html={
                                        question?.voting_rationale
                                      }
                                      className="whitespace-normal capitalize  overflow-hidden text-ellipsis line-clamp-2"
                                    ></div>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                          </>
                        )
                      )
                    ) : (
                      <Table.Tr>
                        <Table.Td
                          colSpan={5}
                          className="py-10 text-center text-slate-500"
                        >
                          No Voting Rationale.
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </>
                </Table.Tbody>
              </Table>
            </div>
          </TableWrapper>
        </>
      )}

      <Tooltip
        id="tooltip-for-question"
        className="!max-w-[700px] !bg-white !text-black !text-sm"
        place="top-start"
        style={{
          boxShadow: "2px 4px 6px rgba(0, 0, 0, 0.2)",
        }}
      />

      {/* Single loading indicator for all scenarios - only show when no data yet AND parent is not loading */}
      {getProxyVotingRationaleLoading && !currentVotingRationale?.length && !parentLoading && (
        <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}
        
      {/* Only show "No Voting Rationale" when not loading - handle null/undefined case */}
      {tab === "Top-20" &&
        (!currentVotingRationale || currentVotingRationale?.length === 0) &&
        !getProxyVotingRationaleLoading && 
        !parentLoading && (
          <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-medium mb-2">No Voting Rationale Available</h3>
              <p className="text-sm">Voting rationale data may not be available for this company or time period.</p>
            </div>
          </div>
        )}

      {/* Handle null/undefined case for filter condition */}
      {(!currentVotingRationale || currentVotingRationale?.length === 0) && filter && filter?.length === 0 && !getProxyVotingRationaleLoading && !parentLoading && (
        <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium mb-2">No Top 10 Voting Rationale Available</h3>
            <p className="text-sm">Voting rationale data may not be available for the top 10 institutions.</p>
          </div>
        </div>
      )}

      {/* Removed duplicate loading indicator for All-Investor tab with filter */}

      {/* Handle null/undefined case for filter length > 0 */}
      {(!currentVotingRationale || currentVotingRationale?.length === 0) && filter?.length > 0 && !getProxyVotingRationaleLoading && !parentLoading && (
        <div className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium mb-2">No Voting Rationale Available</h3>
            <p className="text-sm">Try adjusting your filters or selecting different institutions.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingRationale;
