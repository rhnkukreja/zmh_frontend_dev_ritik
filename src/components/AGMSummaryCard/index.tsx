import Lucide from "../Base/Lucide";
import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";

import Tippy from "../Base/Tippy";
import { downloadCSV } from "@/utils/helper";

import summary from "@/assets/json/brhc10049413_8k.json";
import { useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAppSelector } from "@/stores/hooks";

const index = () => {
  const location = useLocation();
  const { loading } = useAppSelector((state) => state.dashboard);
  const locationPathName = location?.pathname;

  const convertDivTableToCSV = () => {
    // Get the table element
    const table = document.querySelector(".table_2");
    const rows = table?.querySelectorAll(".row_2");
    let csvContent = "";

    // Iterate over each row
    rows?.forEach((row) => {
      const cells = row.querySelectorAll(".cell_2");
      let rowData: any = [];

      // Iterate over each cell and get the text content
      cells.forEach((cell) => {
        rowData.push(cell.textContent);
      });

      // Join cells with commas to form a CSV row
      csvContent += rowData.join(",") + "\n";
    });

    downloadCSV(csvContent, "Agm-Summary");
  };

  return (
    <div className="p-5 mt-3.5 box ">
      <div className="w-full">
        <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <h1 className="text-lg font-bold">Previous AGM Summary 2024</h1>
            {/* <div className=''>
                            <FormSelect
                                defaultValue={"Select Year"}
                                className="flex-1 xs:w-[240px] md:w-auto">
                                <option >
                                    2024
                                </option>
                                <option >
                                    2023
                                </option>
                            </FormSelect>
                        </div>
                        <div className='p-2 bg-white rounded-md xs:w-[240px] md:w-auto flex items-center justify-center border-red-800 border-2 font-semibold text-red-800 border-solid'>
                            View More
                        </div> */}
          </div>
          <div className="flex justify-between items-center gap-4 xs:mt-4 md:mt-0">
            <Tippy content="Download Excel" options={{ theme: "light" }}>
              <div
                className="box p-[5px] cursor-pointer"
                onClick={convertDivTableToCSV}
              >
                <img alt="download-icon" src={downloadIcon} />
              </div>
            </Tippy>
            {locationPathName === "/" && (
              <Tippy content="Expand" options={{ theme: "light" }}>
                <div
                  className="box p-2 cursor-pointer"
                  onClick={() => window.open("summary-details", "_blank")}
                >
                  <img alt="tab-icon" src={tabIcon} />
                </div>
              </Tippy>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className={clsx([locationPathName === "/" && "min-h-[350px] "])}>
            <TableWrapper isLoading={loading}>
              <div className="overflow-auto max-h-[400px]">
                <Table className="table_2">
                  <Table.Thead className="sticky">
                    <Table.Tr className="row_2 sticky top-0 z-10">
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Nominee
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        For
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Against
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Abstained
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Broker Non-Vote
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody className="">
                    {!loading ? (
                      <>
                        {summary.nominees?.length > 0 &&
                          summary.nominees?.map((nominee: any) => (
                            <Table.Tr
                              key={nominee?.id}
                              className="row_2 [&_td]:last:border-b-0"
                            >
                              <Table.Td className="cell_2 flex w-[260px] flex-row justify-start items-center py-2 border-dashed dark:bg-darkmode-600">
                                <div className="flex items-center font-semibold gap-2">
                                  <h1 className=" ">{nominee?.Nominee}</h1>
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {nominee?.For}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {nominee?.Against}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {nominee?.Abstained}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {nominee?.Broker_non}
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </>
                    ) : (
                      <div className="min-h-[350px]"></div>
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </TableWrapper>

            <TableWrapper isLoading={loading}>
              <div className="overflow-auto max-h-[400px]">
                <Table className="table_2">
                  <Table.Thead className="sticky">
                    <Table.Tr className="row_2 sticky top-0 z-10">
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Proposal
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        For
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Against
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Abstained
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        Broker Non-Vote
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        1 Year
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        2 Year
                      </Table.Td>
                      <Table.Td className="cell_2 py-2 font-semibold h-[50px]  bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-header text-[#000000B2]">
                        3 Year
                      </Table.Td>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody className="">
                    {!loading ? (
                      <>
                        {summary.proposals?.length > 0 &&
                          summary.proposals?.map((proposal: any) => (
                            <Table.Tr
                              key={proposal?.id}
                              className="row_2 [&_td]:last:border-b-0"
                            >
                              <Table.Td className="cell_2 flex w-[260px] flex-row justify-start items-center py-2 border-dashed dark:bg-darkmode-600">
                                <div className="flex items-center font-semibold gap-2">
                                  <h1 className=" ">{proposal?.Proposal}</h1>
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.For}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.Against}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.Abstained}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.Broker_non}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.Year_1}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.Year_2}
                                </div>
                              </Table.Td>
                              <Table.Td className="cell_2 py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                <div className="whitespace-nowrap ">
                                  {proposal?.Year_3}
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </>
                    ) : (
                      <div className="min-h-[350px]"></div>
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            </TableWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
