import TableWrapper from '../../components/TableWrapper';
import Table from "@/components/Base/Table";
import { createDynamicURL, downloadCSV } from '@/utils/helper';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchAGMSummaryDashboard, fetchVdsProxyDashboard } from '@/stores/dashboardSlice';
import { baseURL } from '@/constant';
import { AppDispatch } from '@/stores/store';
import LoadingIcon from '../../components/Base/LoadingIcon';


const index = () => {

    const location = useLocation();
    const locationPathName = location?.pathname;
    const dispatch: AppDispatch = useAppDispatch();
    const { vdsProxyDetails, vdsProxyLoading, page } = useAppSelector(
        (state) => state.dashboard
    );
    const [searchParams] = useSearchParams();
    const ticker = searchParams.get("ticker") ?? "AAPL";
    const { company_Global_Search } = useAppSelector((state) => state.dashboard);
    

    useEffect(() => {
        dispatch(fetchVdsProxyDashboard(
            createDynamicURL(`${baseURL}/vds_proxy_voting/?ticker=${ticker}`, undefined, undefined)
        )
        );
    }, [ticker]);

    return (
        <>
            {
                vdsProxyDetails?.vds_report?.length > 0 && <div className="p-5 mt-3.5 box ">
                    <div className="w-full">
                        <div className='flex justify-between items-center xs:flex-col sm:flex-row py-3'>
                            <h1 className='text-lg font-bold'>Proxy Voting</h1>
                        </div>
                        <>
                            <div className='mt-5'>
                                <div >

                                    <TableWrapper>
                                        <Table className="table_2 w-full">
                                            <Table.Thead className="sticky top-0 z-10">
                                                <Table.Tr className="row_2">
                                                    {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                                                        vdsProxyDetails?.vds_report_headers?.map((vdsHeader: any, headerIndex: number) => (
                                                            <Table.Td
                                                                key={headerIndex}
                                                                className="cell_2 py-2 font-semibold h-[50px] bg-[#0000000D] first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left"
                                                            >
                                                                {vdsHeader?.header}
                                                            </Table.Td>
                                                        ))}
                                                </Table.Tr>
                                            </Table.Thead>

                                            <Table.Tbody>
                                                {vdsProxyDetails?.vds_report?.length > 0 &&
                                                    vdsProxyDetails?.vds_report?.map((vdsProxy: any, vdsProxyIndex: number) => (
                                                        <Table.Tr key={vdsProxyIndex} className="row_2 [&_td]:last:border-b-0">
                                                            {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                                                                vdsProxyDetails?.vds_report_headers?.map((vdsHeader: any, headerIndex: number) => (
                                                                    <Table.Td
                                                                        key={headerIndex}
                                                                        className="cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left"
                                                                    >
                                                                        <h1 className={clsx([vdsProxy[vdsHeader?.field].includes('Against') && 'text-red-700 font-semibold'])}
                                                                        >{vdsProxy[vdsHeader?.field]}</h1>

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
                    </div>
                </div>
            }

            {
                !vdsProxyDetails && vdsProxyLoading &&
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                   <LoadingIcon color="#800000" icon="three-dots" className="w-16 h-16" />
                </div>
            }
            
            {
                vdsProxyDetails?.vds_report?.length === 0 && !vdsProxyLoading &&
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                    <h1 className='font-semibold'> Proxy Records Not Found..</h1>
                </div>
            }
        </>
    )
}

export default index;