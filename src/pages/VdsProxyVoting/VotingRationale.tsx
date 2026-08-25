import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import Tippy from "@/components/Base/Tippy";
import CPagination from "@/components/Pagination";
import TableWrapper from "@/components/TableWrapper";
import { getProxyVotingRationale } from "@/stores/dashboardSlice";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { createDynamicURL, downloadXlsxFile } from "@/utils/helper";
import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useSearchParams } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";

interface VotingRationaleProps {
  filter?: any;
  meetingDate?: string;
  tabType?: "top20" | "allInvestors";
  parentLoading?: boolean; // Add parent loading state prop
  expandAllSignal?: number; // Parent can bump this to force expand all
}
const VotingRationale: React.FC<VotingRationaleProps> = ({
  filter,
  meetingDate,
  tabType,
  parentLoading,
  expandAllSignal,
}) => {
  const dispatch = useAppDispatch();
  const { companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );

  const {
    getProxyVotingRationaleLoading,
    votingRationale,
    votingRationaleTop20,
    votingRationaleAllInvestors,
    tab,
  } = useAppSelector((state) => state.dashboard);
  const [searchParams] = useSearchParams();
  const [groupVotingRationale, setGroupVotingRationale] = useState<any>([]);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const yearTicker = searchParams.get("year");

  const emptyStateAnimationStyle: React.CSSProperties = {
    animationDelay: "120ms",
    animationFillMode: "both",
  };

  // Select the correct voting rationale data based on tab type
  const currentVotingRationale =
    tabType === "top20" ? votingRationaleTop20 : votingRationaleAllInvestors;

  useEffect(() => {
    // 1. Safely ensure currentVotingRationale is an array before trying to reduce it
    const safeRationale = Array.isArray(currentVotingRationale) ? currentVotingRationale : [];

    // 2. Run the reduce function on the guaranteed array
    const groupedQuestions = safeRationale.reduce(
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

  // When parent bumps expandAllSignal, expand all currently grouped investors
  useEffect(() => {
    if (!expandAllSignal) return;
    if (!groupVotingRationale) return;

    const allInvestorNames = Object.keys(groupVotingRationale);
    if (allInvestorNames.length === 0) return;

    const newOpenGroups: { [key: string]: boolean } = {};
    allInvestorNames.forEach((name) => {
      newOpenGroups[name] = true;
    });
    setOpenGroups(newOpenGroups);
  }, [expandAllSignal, groupVotingRationale]);

  const toggleGroup = (investorName: string) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [investorName]: !prevState[investorName],
    }));
  };

  const expandAllGroups = () => {
    if (!groupVotingRationale) return;

    const allInvestorNames = Object.keys(groupVotingRationale);
    const allExpanded = allInvestorNames.every((name) => openGroups[name]);

    if (allExpanded) {
      // Collapse all
      setOpenGroups({});
    } else {
      // Expand all
      const newOpenGroups: { [key: string]: boolean } = {};
      allInvestorNames.forEach((name) => {
        newOpenGroups[name] = true;
      });
      setOpenGroups(newOpenGroups);
    }
  };

  const areAllGroupsExpanded = () => {
    if (!groupVotingRationale) return false;
    const allInvestorNames = Object.keys(groupVotingRationale);
    return (
      allInvestorNames.length > 0 &&
      allInvestorNames.every((name) => openGroups[name])
    );
  };

  // NOTE: All API calls for voting rationale are now handled by the parent component
  // This component only displays the data from Redux store
  // No useEffect for API calls needed here

  // State management is now handled entirely by the parent component

  return (
    <div className="mt-4">
      {currentVotingRationale?.length > 0 && (
        <div className="flex justify-end items-center gap-2 mb-3 xs:mt-4 md:mt-0">
            {/* Expand All Button */}
            {Object.keys(groupVotingRationale || {}).length > 0 && (
              <>
                <span
                  className="cursor-pointer"
                  onClick={() => {
                    // Prepare expanded data - all accordions should be open
                    const expandedData: Record<string, any[]> = {};

                    // Copy all data with all accordions expanded
                    Object.keys(groupVotingRationale || {}).forEach(
                      (investorName) => {
                        expandedData[investorName] =
                          groupVotingRationale[investorName] || [];
                      }
                    );

                    // Store data temporarily in sessionStorage
                    const votingRationaleData = {
                      ticker: companyGlobalSearchTicker || "",
                      meetingDate: meetingDate || "",
                      data: expandedData,
                      expandAll: true, // Flag to indicate all should be expanded
                    };

                    // Store in sessionStorage with unique key
                    const storageKey = `voting-rationale-${Date.now()}`;
                    sessionStorage.setItem(
                      storageKey,
                      JSON.stringify(votingRationaleData)
                    );

                    // Open in new tab with just the storage key
                    const url = `/voting-rationale?key=${storageKey}`;
                    window.open(url, "_blank");
                  }}
                  // title="Open in New Tab"
                >
                  <Tippy content="Open in New Tab" options={{ theme: "light" }}>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 cursor-pointer hover:border-primary transition-colors"
                      // onClick={() => window.open("summary-details", "_blank")}
                      // onClick={() => window.open("summary-details", "_blank")}
                    >
                      <img alt="tab-icon" src={tabIcon} />
                    </div>
                  </Tippy>
                </span>

                <button
                  onClick={expandAllGroups}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary/90"
                >
                  <span className="text-sm font-medium">
                    {areAllGroupsExpanded() ? "Collapse All" : "Expand All"}
                  </span>
                  <Lucide
                    icon={areAllGroupsExpanded() ? "ChevronUp" : "ChevronDown"}
                    className="w-4 h-4"
                  />
                </button>
              </>
            )}
            <Tippy content="Download Excel" options={{ theme: "light" }}>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 cursor-pointer hover:border-primary transition-colors"
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

      {/* TableWrapper handles loading state - show when loading or when data exists */}
      {(parentLoading ||
        getProxyVotingRationaleLoading ||
        currentVotingRationale?.length > 0) && (
        <>
          <TableWrapper
            isLoading={getProxyVotingRationaleLoading || parentLoading}
            rows={6}
            columns={4}
          >
            <div className="overflow-auto max-h-[520px] rounded-lg border border-slate-200">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                      Investor Name
                    </Table.Td>

                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                      Proposal
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                      Vote
                    </Table.Td>
                    <Table.Td className="py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                      <div className="flex items-center gap-2">
                        <span>Voting Rationale</span>
                        {Object.values(openGroups).some((isOpen) => isOpen) && (
                          <Lucide
                            icon="ChevronUp"
                            className="w-4 h-4 text-primary"
                          />
                        )}
                      </div>
                    </Table.Td>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody className="!max-h-400px overflow-auto">
                  <>
                    {groupVotingRationale ? (
                      Object.entries(groupVotingRationale).map(
                        (
                          [investorName, institutionQuestions]: [string, any],
                          index: number
                        ) => (
                          <React.Fragment key={investorName}>
                            {/* Accordion Header - Always visible */}
                            <Table.Tr
                              className={`${
                                "bg-white"
                              } dark:bg-darkmode-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-darkmode-600 transition-all duration-200 border-b border-slate-200 dark:border-darkmode-500 ${
                                openGroups[investorName] ? "sticky top-0 z-10" : ""
                              }`}
                              onClick={() => toggleGroup(investorName)}
                            >
                              <Table.Td
                                colSpan={4}
                                className="font-semibold py-4 px-4"
                              >
                                <div className="flex flex-row justify-between items-center gap-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                                      {investorName}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                      {Array.isArray(institutionQuestions) ? institutionQuestions.length : 0} {Array.isArray(institutionQuestions) && institutionQuestions.length === 1 ? "proposal" : "proposals"}
                                    </span>
                                  </div>
                                  <Lucide
                                    icon={
                                      openGroups[investorName]
                                        ? "ChevronUp"
                                        : "ChevronDown"
                                    }
                                    className="w-5 h-5 text-primary transition-transform duration-200"
                                  />
                                </div>
                              </Table.Td>
                            </Table.Tr>

                            {/* Accordion Content - Only visible when expanded */}
                            {openGroups[investorName] &&
                              Array.isArray(institutionQuestions) &&
                              institutionQuestions.map(
                                (question: any, questionIndex: number) => (
                                  <Table.Tr
                                    key={`${investorName}-${questionIndex}`}
                                    className={`[&_td]:last:border-b-0 ${
                                      questionIndex % 2 === 0
                                        ? "bg-white"
                                        : "bg-slate-50"
                                    } dark:bg-darkmode-800 hover:bg-slate-100 dark:hover:bg-darkmode-600 transition-colors duration-200`}
                                  >
                                    <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 w-[200px] bg-inherit align-top" style={{ verticalAlign: 'top' }}>
                                      <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                        {investorName}
                                      </div>
                                    </Table.Td>

                                    <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 min-w-[200px] bg-inherit align-top" style={{ verticalAlign: 'top' }}>
                                      <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                        {question?.proposal}
                                      </div>
                                    </Table.Td>

                                    <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 min-w-[120px] bg-inherit align-top" style={{ verticalAlign: 'top' }}>
                                      <div className={`font-medium text-sm ${["Against", "Withhold", "Withheld", "Withold"].includes(question?.vote) ? "text-red-700" : "text-gray-800 dark:text-gray-200"}`}>
                                        {question?.vote}
                                      </div>
                                    </Table.Td>

                                    <Table.Td className="py-3 border-dashed dark:bg-darkmode-600 bg-inherit align-top" style={{ verticalAlign: 'top' }}>
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: question?.voting_rationale,
                                        }}
                                        className="whitespace-normal text-slate-700 dark:text-gray-300 leading-7 text-sm"
                                      ></div>
                                    </Table.Td>
                                  </Table.Tr>
                                )
                              )}
                          </React.Fragment>
                        )
                      )
                    ) : (
                      <Table.Tr>
                        <Table.Td
                          colSpan={4}
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

      {/* Only show "No Voting Rationale" when not loading - handle null/undefined case */}
      {tab === "Top-20" &&
        (!currentVotingRationale || currentVotingRationale?.length === 0) &&
        !getProxyVotingRationaleLoading &&
        !parentLoading && (
          <div
            className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400 animate-fade-in"
            style={emptyStateAnimationStyle}
          >
            <div className="text-center text-slate-500 dark:text-slate-400">
              <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-medium mb-2">
                No Voting Rationale Available
              </h3>
              <p className="text-sm">
                Voting rationale data may not be available for this company or
                time period.
              </p>
            </div>
          </div>
        )}

      {/* Handle null/undefined case for filter condition */}
      {(!currentVotingRationale || currentVotingRationale?.length === 0) &&
        filter &&
        filter?.length === 0 &&
        !getProxyVotingRationaleLoading &&
        !parentLoading && (
          <div
            className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400 animate-fade-in"
            style={emptyStateAnimationStyle}
          >
            <div className="text-center text-slate-500 dark:text-slate-400">
              <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-medium mb-2">
                No Top 10 Voting Rationale Available
              </h3>
              <p className="text-sm">
                Voting rationale data may not be available for the top 10
                institutions.
              </p>
            </div>
          </div>
        )}

      {/* Removed duplicate loading indicator for All-Investor tab with filter */}

      {/* Handle null/undefined case for filter length > 0 */}
      {(!currentVotingRationale || currentVotingRationale?.length === 0) &&
        filter?.length > 0 &&
        !getProxyVotingRationaleLoading &&
        !parentLoading && (
          <div
            className="h-60 p-6 mt-4 box bg-white dark:bg-darkmode-600 flex items-center justify-center rounded-lg border border-slate-200 dark:border-darkmode-400 animate-fade-in"
            style={emptyStateAnimationStyle}
          >
            <div className="text-center text-slate-500 dark:text-slate-400">
              <FaCheckCircle className="mx-auto mb-3 text-5xl text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-medium mb-2">
                No Voting Rationale Available
              </h3>
              <p className="text-sm">
                Try adjusting your filters or selecting different institutions.
              </p>
            </div>
          </div>
        )}
    </div>
  );
};

export default VotingRationale;
