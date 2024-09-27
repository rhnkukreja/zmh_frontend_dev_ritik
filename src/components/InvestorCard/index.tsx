import Lucide from '../Base/Lucide';
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
import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { createDynamicURL, downloadCSV } from '@/utils/helper';
import { baseURL } from '@/constant';
import Tippy from '../Base/Tippy';

const index = () => {
    const location = useLocation();
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
                    {dashboardDataList?.length > 0 && <div className='flex justify-between items-center sm:flex-col md:flex-row'>
                        <h1 className='text-lg font-bold'>Top {dashboardDataList?.length} Investor</h1>
                        <div className='flex justify-between items-center gap-4 sm:flex-col md:flex-row'>
                            <div className='flex justify-between items-center gap-2'>
                                <img
                                    alt="flag-icon"
                                    src={flagIcon}
                                />
                                <h4 className='font-semibold'>Some text</h4>
                            </div>
                            <Tippy
                                content='Download CSV'
                                options={{ theme: "light" }}
                            >
                                <div className='box p-[5px] cursor-pointer' onClick={convertDivTableToCSV}>
                                    <img
                                        alt="download-icon"
                                        src={downloadIcon}
                                    />
                                </div>
                            </Tippy>
                            <div className='box p-2'>
                                <img
                                    alt="tab-icon"
                                    src={tabIcon}
                                />
                            </div>
                        </div>
                    </div>
                    }

                    <div className='mt-5'>
                        <div className="min-h-[300px] max-h-[300px] overflow-y-scroll">
                            <TableWrapper isLoading={loading}>
                                <Table className="table">
                                    <Table.Thead>
                                        <Table.Tr className="row">
                                            <Table.Td className="cell py-2 font-medium h-[50px] bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                                Investor
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                                Ownership
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                                Eng Priorities
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                                Proxy Advisor Influence
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                                Investor Engaged with Company
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
                                                Engagements Disclosed
                                            </Table.Td>
                                            <Table.Td className="cell py-2 font-medium h-[50px]  bg-slate-50 first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-slate-200/80 text-slate-500">
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
                                                        <Table.Td className="cell flex items-center gap-x-2">
                                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                                <img
                                                                    alt="Tailwise - Admin Dashboard Template"
                                                                    src={userLinkedinImage}
                                                                />

                                                            </div>

                                                            <Tippy
                                                                content={dashboard?.filer_name}
                                                                options={{ theme: "light" }}
                                                            >
                                                                <div className='flex items-center font-semibold gap-2 min-w-[250px]'>
                                                                    <h1 className='underline whitespace-nowrap capitalize  max-w-[180px] overflow-hidden text-ellipsis '>{dashboard?.filer_name}</h1>
                                                                    <img className='w-3'
                                                                        alt="flag-icon"
                                                                        src={flagIcon}
                                                                    />
                                                                    <div className='bg-red-900 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                        {dashboard?.filer_name.charAt(0)}
                                                                    </div>
                                                                </div>
                                                            </Tippy>


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
                                                                <div className='bg-green-400 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                    ✔
                                                                </div>
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                                <div className='bg-yellow-400 font-semibold flex items-center justify-center rounded-full w-6 h-6 text-[13px] text-white '>
                                                                    S
                                                                </div>
                                                            </div>
                                                        </Table.Td>
                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                                <div className='bg-red-600 font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
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