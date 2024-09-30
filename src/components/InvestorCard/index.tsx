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
import { useEffect, useState } from 'react';
import { createDynamicURL, downloadCSV } from '@/utils/helper';
import { baseURL } from '@/constant';
import Tippy from '../Base/Tippy';
import clsx from 'clsx';
import LoadingIcon from '../Base/LoadingIcon';

const index = () => {
    const location = useLocation();
    const locationPathName = location?.pathname;
    const dispatch: AppDispatch = useAppDispatch();

    const [searchParams] = useSearchParams();
    const ticker = searchParams.get("ticker") ?? "AAPL";
    const { dashboardDataList, loading, page, totalPages, } = useAppSelector(
        (state) => state.dashboard
    );
    const { company_Global_Search } = useAppSelector((state) => state.dashboard);
    const navigate = useNavigate();


    useEffect(() => {
        if (ticker) {
            dispatch(fetchCompanyDashboard(
                createDynamicURL(`${baseURL}/company-dashboard/?ticker=${ticker}`, undefined, undefined)
            )
            );
        }
    }, [ticker, page]);


    const checkImageUrl = async (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
  
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    };

  const [validImages, setValidImages] = useState<{ [key: string]: string }>({});

  
  useEffect(() => {
    const validateImages = async () => {
      const tempValidImages: { [key: string]: string } = {};
      for (const dashbboard of dashboardDataList || []) {
        const isValid = await checkImageUrl(dashbboard?.institution_logo_url);
        tempValidImages[dashbboard?.institution_name] = isValid ? dashbboard?.institution_logo_url : userLinkedinImage;
      }

      setValidImages(tempValidImages);
    };

    validateImages();
  }, [dashboardDataList]);


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
            {
                // dashboardDataList?.length > 0 &&
                <>
                    <div className="p-5 mt-3.5 box">
                        <div className="w-full">
                            {/* {dashboardDataList?.length > 0 && */}
                                <div className='flex justify-between items-center xs:flex-col sm:flex-row py-3'>
                                    <h1 className='text-lg font-bold'>Top {dashboardDataList?.length || 20} Investor</h1>
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
                            {/* } */}

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
                                                                {
                                                                    dashboard?.institution_name &&
                                                                    <>
                                                                        <Table.Td className="flex items-center">
                                                                            <div className="w-9 h-9 mr-3 overflow-hidden rounded-full image-fit border-[3px] border-slate-200/70">
                                                                                <img
                                                                                    alt="Tailwise - Admin Dashboard Template"
                                                                                    
                                                                                    src= {validImages[dashboard.institution_name] ||
                                                                                      userLinkedinImage}
                                                                                    
                                                                                    // {dashboard?.institution_logo_url ?? userLinkedinImage}
                                                                                />
                                                                            </div>

                                                                            <div className='flex justify-between items-center w-[220px]'>
                                                                                <div className='flex items-center font-semibold '>
                                                                                    <h1 className='cell underline whitespace-nowrap capitalize max-w-[150px] text-wrap'>
                                                                                        {dashboard?.institution_name?.toLowerCase().replace(/\b\w/g, s => s.toUpperCase())}</h1>
                                                                                    {
                                                                                        dashboard?.flag_13d === true && <img className='w-3 ml-2'
                                                                                            alt="flag-icon"
                                                                                            src={flagIcon}
                                                                                        />
                                                                                    }

                                                                                </div>

                                                                                <div 
                                                                                onClick={()=> navigate(`/investor-profile/investor/${dashboard?.investor_profile_id}`) } 
                                                                                className='bg-red-900 hover:bg-red-700 font-semibold flex items-center cursor-pointer justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                                    P
                                                                                </div>
                                                                            </div>


                                                                        </Table.Td>
                                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                                            <div className="whitespace-nowrap ">
                                                                                {dashboard?.percent_ownership}
                                                                            </div>
                                                                        </Table.Td>
                                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                                            <div className="whitespace-nowrap ">
                                                                                {dashboard.proxy_advisor_influence || '-'}
                                                                            </div>
                                                                        </Table.Td>
                                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                                            <div className="whitespace-nowrap ">
                                                                                {
                                                                                    dashboard?.esg_integration === true && <div className="whitespace-nowrap flex items-center justify-center">
                                                                                        <div className='bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                                            ✔
                                                                                        </div>
                                                                                    </div>
                                                                                }
                                                                            </div>
                                                                        </Table.Td>

                                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                                            {
                                                                                dashboard?.company_engaged === true && <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className='bg-[#0DDE7B] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                                        ✔
                                                                                    </div>
                                                                                </div>
                                                                            }
                                                                        </Table.Td>
                                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                                            <div className="whitespace-nowrap flex items-center justify-center">
                                                                                <div className={clsx([dashboard?.engagement_topic?.toLowerCase() === 's' && 'bg-[#F5A623] ',
                                                                                dashboard?.engagement_topic?.toLowerCase() === 'e' && 'bg-[#05703E] ',
                                                                                dashboard?.engagement_topic?.toLowerCase() === 'g' && 'bg-[#115096] ', 'font-semibold flex items-center justify-center rounded-full w-6 h-6 text-[13px] text-white '])}>
                                                                                    {dashboard?.engagement_topic}
                                                                                </div>
                                                                            </div>
                                                                        </Table.Td>
                                                                        <Table.Td className="cell py-2 h-[50px] border-dashed dark:bg-darkmode-600">
                                                                            {
                                                                                dashboard?.voted_against_directors === true && <div className="whitespace-nowrap flex items-center justify-center">
                                                                                    <div className='bg-[#FF2A2A] font-semibold flex items-center justify-center rounded-full w-5 h-5 text-[10px] text-white '>
                                                                                        ✔
                                                                                    </div>
                                                                                </div>
                                                                            }
                                                                        </Table.Td></>
                                                                }
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
            }

            {
                !dashboardDataList && loading &&
                <div className='h-52'>
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <LoadingIcon color="red" icon="puff" className="w-16 h-16" />
                    </div>
                </div>
            }

            {
                !dashboardDataList && !loading &&
                <div className='h-52'>
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <h1 className='font-semibold'> Investors Records Not Found..</h1>
                    </div>
                </div>
            }
        </>
    )
}

export default index;