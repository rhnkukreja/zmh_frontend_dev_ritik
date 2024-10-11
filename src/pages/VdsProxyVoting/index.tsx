import TableWrapper from '../../components/TableWrapper';
import Table from "@/components/Base/Table";
import { createDynamicURL, downloadCSV } from '@/utils/helper';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchAGMSummaryDashboard, fetchVdsProxyDashboard } from '@/stores/dashboardSlice';
import { baseURL } from '@/constant';
import LoadingIcon from '../../components/Base/LoadingIcon';
import { AppDispatch, RootState } from "@/stores/store";


const index = () => {

    const location = useLocation();
    const locationPathName = location?.pathname;
    const dispatch: AppDispatch = useAppDispatch();
    const { vdsProxyDetails, vdsProxyLoading, page } = useAppSelector(
        (state) => state.dashboard
    );
    const [searchParams] = useSearchParams();
    
    const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
        (state: RootState) => state.authentiction
    );

    // const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;


    useEffect(() => {
        dispatch(fetchVdsProxyDashboard(
            createDynamicURL(`${baseURL}/vds_proxy_voting/?ticker=${companyGlobalSearchTicker}`, undefined, undefined)
        )
        );
    }, [companyGlobalSearchTicker]);

    return (
        <>
            <div className="p-y-5 mb-1 font-semibold text-xl ">
                {companyGlobalSearchName}
            </div>
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
    <div className="overflow-x-auto">
        <Table className="table_2 w-full">
            <Table.Thead className="sticky top-0 z-10">
                <Table.Tr className="row_2">
                    {vdsProxyDetails?.vds_report_headers?.length > 0 &&
                        vdsProxyDetails?.vds_report_headers?.map((vdsHeader: any, headerIndex: number) => (
                            <Table.Td
                                key={headerIndex}
                                className={clsx([
                                    "cell_2 py-2 font-semibold h-[50px] bg-header first:rounded-tl-[0.6rem] last:rounded-tr-[0.6rem] border-[#0000000D] text-[#000000B2] w-[150px] text-left",
                                    headerIndex === 0 && "sticky left-0 bg-header z-20", // Fix first column
                                    headerIndex === 1 && "sticky left-[50px] bg-header z-20", // Fix second column (adjust 'left' value according to width)
                                ])}
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
                                        className={clsx([
                                            "cell_2 py-2 border-dashed dark:bg-darkmode-600 w-[150px] text-left",
                                            headerIndex === 0 && "sticky left-0 bg-white  z-10", // Fix first column
                                            headerIndex === 1 && "sticky left-[50px] bg-white z-10", // Fix second column
                                        ])}
                                    >
                                        <h1 className={clsx([vdsProxy[vdsHeader?.field].includes('Against') && 'text-red-700 font-semibold'])}>
                                            {vdsProxy[vdsHeader?.field]}
                                        </h1>
                                    </Table.Td>
                                ))}
                        </Table.Tr>
                    ))}
            </Table.Tbody>
        </Table>
    </div>
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