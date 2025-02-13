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

interface VotingRationaleProps {
  filter?: any;
}
const VotingRationale: React.FC<VotingRationaleProps> = ({ filter }) => {
  const dispatch = useAppDispatch();
  const { companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );

  const { getProxyVotingRationaleLoading, votingRationale, tab } =
    useAppSelector((state) => state.dashboard);

  const [groupVotingRationale, setGroupVotingRationale] = useState<any>([]);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const groupedQuestions = votingRationale?.reduce(
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
  }, [votingRationale]);

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

  useEffect(() => {
    if (companyGlobalSearchTicker && tab === "Top-20") {
      dispatch(
        getProxyVotingRationale(
          createDynamicURL(`/vds_proxy_voting_rationale/`, {
            ticker: companyGlobalSearchTicker,
          })
        )
      );
    }
  }, [companyGlobalSearchTicker, tab]);

  return (
    <div className="mt-6">
      <div className="flex justify-between mb-4 mt-1">
        <h1 className="text-lg font-bold mb-6 ">Voting Rationale</h1>
        {votingRationale?.length > 0 && (
          <div className="flex justify-end items-center gap-4 xs:mt-4 md:mt-0">
            <Tippy content="Download Excel" options={{ theme: "light" }}>
              <div
                className="box p-[5px] cursor-pointer"
                onClick={() =>
                  downloadXlsxFile({
                    data: votingRationale,
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

      {votingRationale?.length > 0 && (
        <>
          <TableWrapper isLoading={getProxyVotingRationaleLoading}>
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
                {groupVotingRationale?.length === 0 && (
                  <div className="w-full">
                    <h1 className="mt-3">No Records Found..</h1>
                  </div>
                )}
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

      {votingRationale?.length === 0 && getProxyVotingRationaleLoading && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <LoadingIcon
            color="#800000"
            icon="three-dots"
            className="w-16 h-16"
          />
        </div>
      )}

      {tab === "Top-20" &&
        votingRationale?.length === 0 &&
        !getProxyVotingRationaleLoading && (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <h1 className="font-semibold">
              Voting Rationale Records Not Found..
            </h1>
          </div>
        )}

      {votingRationale?.length === 0 && filter && filter?.length === 0 && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <h1 className="font-semibold"></h1>
        </div>
      )}

      {votingRationale?.length === 0 && filter?.length > 0 && (
        <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
          <h1 className="font-semibold">
            {" "}
            Voting Rationale Records Not Found..
          </h1>
        </div>
      )}
    </div>
  );
};

export default VotingRationale;
