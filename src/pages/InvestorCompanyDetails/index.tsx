import TopBar from '@/components/TopBar';
import DocumentationMenu from '@/components/DocumentationMenu';
import ContactCard from '@/components/ContactCard';
import PDFCard from '@/components/PDFCard';
import MasterCardGrid from '@/components/MasterCardGrid';
import { engagement_questions_gridHeaders, case_studies_gridHeaders, companies_engaged_gridHeaders } from '@/assets/json/grid-data.json';
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from '@/stores/store';
import { useEffect, useState } from 'react';
import { fetchInvestorProfileDetails } from '@/stores/dashboardSlice';
import { createDynamicURL } from '@/utils/helper';
import { baseURL } from '@/constant';
import { useParams } from 'react-router-dom';
import LoadingIcon from '@/components/Base/LoadingIcon';



const index = () => {

    const dispatch: AppDispatch = useAppDispatch();
    const { investorProfileLoading, investorProfileDetails } = useAppSelector((state) => state.dashboard);
    const { company_Global_Search } = useAppSelector((state) => state.dashboard);
    const { id } = useParams();
    useEffect(() => {
        if (id && company_Global_Search) {
            dispatch(fetchInvestorProfileDetails(
                createDynamicURL(`${baseURL}/investor_profile_detail_page/?investor_profile_id=${id}&global_search=${company_Global_Search}`)
            )
            );
        }

    }, [id, company_Global_Search]);

    return (
        <>
            {!investorProfileLoading && investorProfileDetails?.institution_name &&
                <div>
                    <TopBar logoUrl={investorProfileDetails?.institution_logo_url} companyName={investorProfileDetails?.institution_name} />

                    <div className='flex justify-between '>
                        <div className='w-[300px] '>
                            <DocumentationMenu menu={investorProfileDetails}/>
                        </div>
                        <div className='w-[1000px]'>
                            <div className='flex justify-between w-[1000px] '>
                                <div className='w-[495px] '>
                                    <ContactCard contacts={investorProfileDetails?.contacts} />
                                </div>

                                <div className='w-[495px]'>
                                    <PDFCard pdfDocuments={investorProfileDetails?.documents} />
                                </div>
                            </div>

                            {
                                investorProfileDetails?.companies_engaged?.length > 0 &&
                                <div className='w-[1000px]'>
                                    <MasterCardGrid gridHeaders={companies_engaged_gridHeaders} gridRecords={investorProfileDetails?.companies_engaged} gridTitle="Companies Engaged" />
                                </div>
                            }

                            {
                                investorProfileDetails?.case_studies?.length > 0 &&
                                <div className='w-[1000px]'>
                                    <MasterCardGrid gridHeaders={case_studies_gridHeaders} gridRecords={investorProfileDetails?.case_studies} gridTitle="Case Studies" />
                                </div>
                            }

                            {
                                investorProfileDetails?.engagement_questions?.length > 0 &&
                                <div className='w-[1000px]'>
                                    <MasterCardGrid gridHeaders={engagement_questions_gridHeaders} gridRecords={investorProfileDetails?.engagement_questions} gridTitle="Engagement Questions" />
                                </div>
                            }

                        </div>


                    </div>
                </div>
            }


            {
                /* dashboardDataList.length === 0 &&  */investorProfileLoading &&
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                    <LoadingIcon color="#800000" icon="three-dots" className="w-16 h-16" />
                </div>
            }
        </>
    )
}

export default index    