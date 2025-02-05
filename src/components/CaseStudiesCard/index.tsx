import { useSearchParams } from "react-router-dom";
import investorIcon from "../../assets/images/zmh-images/investor-icon.png";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { useEffect, useState } from "react";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { fetchCaseStudyDashboard } from "@/stores/dashboardSlice";
import { AppDispatch } from "@/stores/store";
import LoadingIcon from "../Base/LoadingIcon";

const index = () => {
    const [searchParams] = useSearchParams();
    const dispatch: AppDispatch = useAppDispatch();

    const pageNumber = 1;
    const { caseStudyDetails, caseStudyLoading, page, totalPages } = useAppSelector((state) => state.dashboard);
    const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector((state) => state.authentiction);
    
    const ticker = searchParams.get("ticker") ?? companyGlobalSearchTicker;
  
    useEffect(() => {
        if (companyGlobalSearchName) {
            // Check if "Company" or "Corporation" exists in the name
            const hasKeywords = /\b(Company|Corporation)\b/i.test(companyGlobalSearchName);
    
            // If keywords exist, replace them with "Co"
            const companyGlobalSearchNamev2 = hasKeywords
                ? companyGlobalSearchName.replace(/\b(Company|Corporation)\b/gi, "Co")
                : null;
    
            // Construct the URL based on the condition
            const url = hasKeywords
                ? `https://www.googleapis.com/customsearch/v1?key=AIzaSyDoznJMDY10gGNzYtPIHipC2u6fpeyrcqA&cx=860f2a6398fa1457c&q="${companyGlobalSearchName}" OR "${companyGlobalSearchNamev2}"&dateRestrict=y1&start=${pageNumber}&sort=date`
                : `https://www.googleapis.com/customsearch/v1?key=AIzaSyDoznJMDY10gGNzYtPIHipC2u6fpeyrcqA&cx=860f2a6398fa1457c&q="${companyGlobalSearchName}"&dateRestrict=y1&start=${pageNumber}&sort=date`;
    
            // Dispatch the action with the constructed URL
            dispatch(fetchCaseStudyDashboard(createDynamicURL(url)));
        }
    }, [companyGlobalSearchName]);
    
    



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
            for (const caseStudyItem of caseStudyDetails?.items || []) {
                const isValid = await checkImageUrl(caseStudyItem?.pagemap?.cse_thumbnail?.length > 0 && caseStudyItem?.pagemap?.cse_thumbnail[0]?.src);
                tempValidImages[caseStudyItem?.title] = isValid ? caseStudyItem?.pagemap?.cse_thumbnail?.length > 0 && caseStudyItem?.pagemap?.cse_thumbnail[0]?.src : investorIcon;
            }

            setValidImages(tempValidImages);
        };

        validateImages();
    }, [caseStudyDetails]);


    return (
        <>
            {
                caseStudyDetails?.items && <div className="p-5 mt-3.5 box ">
                    <div className="w-full">
                        <div className='flex justify-between items-center px-3'>
                            <h1 className='text-lg font-bold'>Recent Investor Mentions</h1>
                        </div>

                        <div className=''>
                            <div className="min-h-[300px] max-h-[400px] overflow-y-scroll p-3">
                                <hr />
                                {caseStudyDetails?.items?.length > 0 &&
                                    caseStudyDetails?.items.map(
                                        (caseStudy: any, key: any) => (
                                            <div key={key} className='flex items-center justify-between py-3'>
                                                <div className='flex items-center justify-between gap-4'>
                                                    <div className='w-[50px]'>
                                                        <img src={validImages[caseStudy?.title]} />
                                                    </div>
                                                    <div className=' flex flex-col justify-between gap-y-2'>

                                                        <h1 onClick={() => window.open(caseStudy?.link, "_blank")}
                                                            className='font-semibold cursor-pointer underline text-md w-[900px] font-wrap hover:text-[#9F1239]'>{caseStudy?.title}</h1>
                                                        <span className='font-regular w-[900px] font-wrap text-xs' dangerouslySetInnerHTML={{ __html: caseStudy?.htmlSnippet }}>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* <div>
                                                    <h2 className='font-semibold'>30-Aug-2024</h2>
                                                </div> */}
                                            </div>
                                        ))}

                            </div>

                        </div>

                    </div>
                </div>
            }

            {
                caseStudyDetails?.items?.length === 0 && caseStudyLoading &&
                <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
                    <LoadingIcon color="#800000" icon="three-dots" className="w-16 h-16" />
                </div>
            }
        </>

    )
}

export default index
