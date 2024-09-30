import Lucide from "../Base/Lucide";
import TableWrapper from "../TableWrapper";
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
<<<<<<< Updated upstream
import FormSelect from '../Base/Form/FormSelect';
import Tippy from '../Base/Tippy';
import { createDynamicURL, downloadCSV } from '@/utils/helper';
import { useEffect, useState } from 'react';
import summary from "@/assets/json/brhc10049413_8k.json";
import { useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchAGMSummaryDashboard } from '@/stores/dashboardSlice';
import { baseURL } from '@/constant';
import { AppDispatch } from '@/stores/store';
import { Nominee } from '@/types/AGMSummary';
import LoadingIcon from '../Base/LoadingIcon';

=======
import FormSelect from "../Base/Form/FormSelect";
import Tippy from "../Base/Tippy";
import { downloadCSV } from "@/utils/helper";
import { useState } from "react";
import summary from "@/assets/json/brhc10049413_8k.json";
import { useLocation } from "react-router-dom";
import clsx from "clsx";
>>>>>>> Stashed changes

const index = () => {
  const location = useLocation();
  const locationPathName = location?.pathname;

<<<<<<< Updated upstream
    const location = useLocation();
    const locationPathName = location?.pathname;
    const dispatch: AppDispatch = useAppDispatch();
    const { agmSummaryDetails, loading, page } = useAppSelector(
        (state) => state.dashboard
    );
    const [searchParams] = useSearchParams();
    const ticker = searchParams.get("ticker") ?? "AAPL";
    const { company_Global_Search } = useAppSelector((state) => state.dashboard);
    
    const convertDivTableToCSV = () => {
        // Get the table element
        const table = document.querySelector(".table_2");
        const rows = table?.querySelectorAll(".row_2");
        const tableProposal = document.querySelector(".table_3");
        const rowsProposal = tableProposal?.querySelectorAll(".row_3");
        let csvContent = "";
        let csvContentProposal = "";

=======
  const convertDivTableToCSV = () => {
    // Get the table element
    const table = document.querySelector(".table_2");
    const rows = table?.querySelectorAll(".row_2");
    let csvContent = "";
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
        rowsProposal?.forEach((row) => {
            const cells = row.querySelectorAll(".cell_3");
            let rowData: any = [];

            // Iterate over each cell and get the text content
            cells.forEach((cell) => {
                rowData.push(cell.textContent);
            });

            // Join cells with commas to form a CSV row
            csvContentProposal += rowData.join(",") + "\n";
        });
        let concatContent = csvContent + csvContentProposal;
        downloadCSV(concatContent, 'Agm-Summary');
    };

    useEffect(() => {
        dispatch(fetchAGMSummaryDashboard(
            createDynamicURL(`${baseURL}/voting_report_8k/?ticker=${ticker}`, undefined, undefined)
        )
        );
    }, [ticker]);

    return (
        <>
            <div className="p-5 mt-3.5 box ">
                <div className="w-full">
                    {
                        agmSummaryDetails?.Year &&
                        <>
                            <div className='flex justify-between items-center xs:flex-col md:flex-row py-3'>
                                <div className='flex justify-between items-center gap-4 xs:flex-col md:flex-row'>
                                    <h1 className='text-lg font-bold'>Previous AGM Summary {agmSummaryDetails?.Year}</h1>
                                    {/* <div className=''>
=======
    downloadCSV(csvContent, "Agm-Summary");
  };

  return (
    <div className="p-5 mt-3.5 box ">
      <div className="w-full">
        <div className="flex justify-between items-center xs:flex-col md:flex-row py-3">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <h1 className="text-lg font-bold">Previous AGM Summary 2024</h1>
            {/* <div className=''>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                                </div>
                                <div className='flex justify-between items-center gap-4 xs:mt-4 md:mt-0'>
                                    <Tippy
                                        content='Download Excel'
                                        options={{ theme: "light" }}
                                    >
                                        <div className='box p-[5px] cursor-pointer' onClick={convertDivTableToCSV}>
                                            <img
                                                alt="download-icon"
                                                src={downloadIcon}
                                            />
                                        </div>
                                    </Tippy>
                                    {
                                        locationPathName === '/' &&
                                        <Tippy
                                            content='Expand'
                                            options={{ theme: "light" }}
                                        >
                                            <div className='box p-2 cursor-pointer' onClick={() =>
                                                window.open("summary-details", "_blank")
                                            }>
                                                <img
                                                    alt="tab-icon"
                                                    src={tabIcon}
                                                />
                                            </div>
                                        </Tippy>
                                    }
                                </div>
                            </div>

                            <div className='mt-5'>
                                <div className={clsx([locationPathName === '/' && 'min-h-[400px] max-h-[400px] overflow-y-scroll'])}>

                                    <TableWrapper isLoading={loading}>
                                        <Table className="table_2 w-full">
                                            <Table.Thead className="sticky top-0 z-10">
                                                <Table.Tr className="row_2">
                                                    {agmSummaryDetails?.nominees_headers?.length > 0 &&
                                                        agmSummaryDetails?.nominees_headers.map((nomineeHeader: any, headerIndex: number) => (
                                                            <Table.Td
                                                                key={headerIndex}
                                                                className="cell_2 py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left"
                                                            >
                                                                {nomineeHeader.header}
                                                            </Table.Td>
                                                        ))}
                                                </Table.Tr>
                                            </Table.Thead>

                                            <Table.Tbody>
                                                {agmSummaryDetails?.nominees?.length > 0 &&
                                                    agmSummaryDetails?.nominees.map((nominee: any, nomineeIndex: number) => (
                                                        <Table.Tr key={nomineeIndex} className="row_2 [&_td]:last:border-b-0">
                                                            {agmSummaryDetails?.nominees_headers?.length > 0 &&
                                                                agmSummaryDetails?.nominees_headers.map((nomineeHeader: any, headerIndex: number) => (
                                                                    <Table.Td
                                                                        key={headerIndex}
                                                                        className="cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left"
                                                                    >
                                                                        <h1 className={clsx([headerIndex === 0 && 'font-semibold'])}>{nominee[nomineeHeader?.field]}</h1>

                                                                    </Table.Td>
                                                                ))}
                                                        </Table.Tr>
                                                    ))}
                                            </Table.Tbody>
                                        </Table>
                                    </TableWrapper>

                                    <br />
                                    <TableWrapper isLoading={loading}>
                                        <Table className="table_3 w-full">
                                            <Table.Thead className="sticky top-0 z-10">
                                                <Table.Tr className="row_3">
                                                    {agmSummaryDetails?.proposal_headers?.length > 0 &&
                                                        agmSummaryDetails?.proposal_headers.map((proposalHeader: any, headerIndex: number) => (
                                                            <Table.Td
                                                                key={headerIndex}
                                                                className="cell_3 py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left"
                                                            >
                                                                {proposalHeader?.header}
                                                            </Table.Td>
                                                        ))}
                                                </Table.Tr>
                                            </Table.Thead>

                                            <Table.Tbody>
                                                {agmSummaryDetails?.proposals?.length > 0 &&
                                                    agmSummaryDetails?.proposals.map((proposal: any, nomineeIndex: number) => (
                                                        <Table.Tr key={nomineeIndex} className="row_3 [&_td]:last:border-b-0">
                                                            {agmSummaryDetails?.proposal_headers?.length > 0 &&
                                                                agmSummaryDetails?.proposal_headers.map((proposalHeader: any, headerIndex: number) => (
                                                                    <Table.Td
                                                                        key={headerIndex}
                                                                        className="cell_3 py-2 border-dashed dark:bg-darkmode-600  text-left"
                                                                    >
                                                                        <h1 className={clsx([headerIndex === 0 && 'font-semibold w-[180px]'])}>{proposal[proposalHeader?.field]}</h1>

                                                                    </Table.Td>
                                                                ))}
                                                        </Table.Tr>
                                                    ))}
                                            </Table.Tbody>
                                        </Table>
                                    </TableWrapper>



                                </div>

                            </div>
                        </>
                    }
                    {
                        !agmSummaryDetails && loading &&
                        <div className='h-52'>
                            <div className="absolute inset-0 flex items-center justify-center bg-white">
                                <LoadingIcon color="red" icon="puff" className="w-16 h-16" />
                            </div>
                        </div>
                    }
                    {
                        !agmSummaryDetails?.Year && !loading &&
                        <div className='h-52'>
                            <div className="absolute inset-0 flex items-center justify-center bg-white">
                           <h1 className='font-semibold'> Previous AGM Summary Records Not Found..</h1>
                            </div>
                        </div>
                    }

                </div>
            </div>
        </>
    )
}
=======
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
>>>>>>> Stashed changes

        <div className="mt-5">
          <div className={clsx([locationPathName === "/" && "min-h-[350px] "])}>
            <TableWrapper>
              <div className="overflow-auto max-h-[350px]">
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
                  </Table.Tbody>
                </Table>
              </div>
            </TableWrapper>

            <TableWrapper>
              <div className="overflow-auto max-h-[350px]">
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
