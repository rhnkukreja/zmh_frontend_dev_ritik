import TableWrapper from '../TableWrapper';
import Table from "@/components/Base/Table";
import userLinkedinImage from "../../assets/images/logo/linkedin-profile.png";
import downloadIcon from "../../assets/images/zmh-images/download-icon.png";
import tabIcon from "../../assets/images/zmh-images/new-tab-icon.png";
import flagIcon from "../../assets/images/zmh-images/flag-icon.png";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
    CompanyDashboard,
    fetchCompanyDashboard,
    setPage,
} from "@/stores/dashboardSlice";
import { AppDispatch } from "@/stores/store";
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { createDynamicURL, downloadCSV } from '@/utils/helper';
import { baseURL } from '@/constant';
import Tippy from '../Base/Tippy';
import clsx from 'clsx';

const index = () => {
    const location = useLocation();
    const locationPathName = location?.pathname;
    const dispatch: AppDispatch = useAppDispatch();

    const [searchParams] = useSearchParams();
    const ticker = searchParams.get("ticker") ?? "AMZN";
    const { dashboardDataList, loading, page, totalPages, } = useAppSelector(
        (state) => state.dashboard
    );
    const { company_Global_Search } = useAppSelector((state) => state.dashboard);


    useEffect(() => {
        if (ticker) {
            dispatch(fetchCompanyDashboard(
                createDynamicURL(`${baseURL}/company-dashboard/?ticker=${ticker}&`, undefined, undefined, page)
            )
            );
        }
    }, [ticker, page]);


    const handleNextPage = () => {
        if (page < totalPages) {
            dispatch(setPage(page + 1));
        }
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            dispatch(setPage(page - 1));
        }
    };

    const handlePageChange = (newPage: number) => {
        dispatch(setPage(newPage));
    };


    const convertDivTableToCSV = () => {
        // Get the table element
        const table = document.querySelector(".table");
        const rows = table?.querySelectorAll(".row");
        let csvContent = "";

        // Iterate over each row
        rows?.forEach((row) => {
            const cells = row.querySelectorAll(".cell");
            let rowData: any = [];

            // Iterate over each cell and get the text content
            cells.forEach((cell) => {
                rowData.push(cell.textContent);
            });

            // Join cells with commas to form a CSV row
            csvContent += rowData.join(",") + "\n";
        });

        downloadCSV(csvContent, 'Investor');
    };



    return (
        <>
            <div className="p-y-5 mb-1 font-semibold text-lg text-white" >
                {company_Global_Search}
            </div>
            <div className="p-5 mt-3.5 box">
                <div className="w-full">
                    {dashboardDataList?.length > 0 &&
                        <div className='flex justify-between items-center xs:flex-col sm:flex-row py-3'>
                            <h1 className='text-lg font-bold'>Top {dashboardDataList?.length} Investor</h1>
                            <div className='flex justify-between items-center gap-4 sm:flex-row'>
                                <div className='flex justify-between items-center gap-2'>
                                    <img
                                        alt="flag-icon"
                                        src={flagIcon}
                                    />
                                    <h4 className='font-semibold'>History of Schedule 13D Filing</h4>
                                </div>
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
                                            window.open("investor-details", "_blank")
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
                    }

                    <div className='mt-5'>
                        <div className={clsx([locationPathName === '/' && 'min-h-[300px] max-h-[300px] overflow-y-scroll'])}>
                            <TableWrapper isLoading={loading}>
                                <Table className="table">
                                    <Table.Thead>
                                        <Table.Tr className="row">
                                            <Table.Td className="cell py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                            Shareholder
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-semibold w-[150px] h-[50px]  bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                            % Ownership
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-semibold  h-[50px]  bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                            Proxy Advisory Influence
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                            ESG Integration
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                                Engaged with Company
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                                Engagement Topic
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-semibold h-[50px]  bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2]">
                                                Voted Against Directors
                                            </Table.Td>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {dashboardDataList?.length > 0 &&
                                            dashboardDataList.map(
                                                (dashboard: CompanyDashboard) => (
                                                    <Table.Tr
                                                        key={dashboard.filer_id}
                                                        className="row [&_td]:last:border-b-0">
                                                        <Table.Td className="cell flex items-center">
                                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                                <img
                                                                    alt="Tailwise - Admin Dashboard Template"
                                                                    src={userLinkedinImage}
                                                                />
                                                            </div>

                                                            <div className='flex justify-between items-center w-[220px]'>
                                                                <div className='flex items-center font-semibold '>
                                                                    <h1 className='underline whitespace-nowrap capitalize max-w-[150px] text-wrap'>
                                                                        {dashboard?.filer_name?.toLowerCase().replace(/\b\w/g, s => s.toUpperCase())}</h1>
                                                                    <img className='w-3 ml-2'
                                                                        alt="flag-icon"
                                                                        src={flagIcon}
                                                                    />

                                                                </div>

                                                                <div className='bg-red-900 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                    P
                                                                </div>
                                                            </div>


                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap ">
                                                                11.43%
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap ">
                                                                {dashboard.proxy_advisor_influence || '-'}
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap ">
                                                                ISS, GL
                                                            </div>
                                                        </Table.Td>

                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                                <div className='bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                    ✔
                                                                </div>
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                                <div className='bg-[#F5A623] font-semibold flex items-center justify-center rounded-full w-6 h-6 text-[13px] text-white '>
                                                                    S
                                                                </div>
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                                <div className='bg-[#FF2A2A] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                    ✔
                                                                </div>
                                                            </div>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                )
                                            )}
                                    </Table.Tbody>
                                </Table>
                            </TableWrapper>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}

export default index;