import TopBar from "@/components/TopBar";
import DocumentationMenu from "@/components/DocumentationMenu";
import ContactCard from "@/components/ContactCard";
import PDFCard from "@/components/PDFCard";
import MasterCardGrid from "@/components/MastergridList";
import {
  engagement_questions_gridHeaders,
  case_studies_gridHeaders,
  companies_engaged_gridHeaders,
} from "@/assets/json/grid-data.json";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { useEffect, useState } from "react";
import { fetchInvestorProfileDetails } from "@/stores/dashboardSlice";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import { useNavigate, useParams } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";

const index = () => {
  const navigate = useNavigate()
  const dispatch: AppDispatch = useAppDispatch();
  const { investorProfileLoading, investorProfileDetails } = useAppSelector(
    (state) => state.dashboard
  );
  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state) => state.authentiction
  );

  const { id } = useParams();
  useEffect(() => {
    if (id && companyGlobalSearchTicker) {
      dispatch(
        fetchInvestorProfileDetails(
          createDynamicURL(
            `${baseURL}/investor_profile_detail_page/?investor_profile_id=${id}`
          )
        )
      );
    }
  }, [id, companyGlobalSearchName]);

  return (
    <>
      {location.pathname !== "/" && (
        <Button
          onClick={() => {
            navigate("/");
          }}
          variant="primary"
          className="bg-theme-2 border-bg-theme-2 mb-4"
        >
          <ChevronLeft
            className="group-[.mode--light]:text-white text-white"
            size={18}
            strokeWidth={1.5}
          />
          Back
        </Button>
      )}
      {!investorProfileLoading && investorProfileDetails?.institution_name && (
        <div>
          <TopBar
            logoUrl={investorProfileDetails?.institution_logo_url}
            companyName={investorProfileDetails?.institution_name}
          />

          <div className="flex justify-between ">
            {/* <div className='w-[300px] '>
                            <DocumentationMenu menu={investorProfileDetails}/>
                        </div> */}
            <div className="">
              <div className="flex justify-between items-center xs:flex-col lg:flex-row">
                <div className=" mr-4">
                  <ContactCard contacts={investorProfileDetails?.contacts} />
                </div>

                <div className="">
                  <PDFCard pdfDocuments={investorProfileDetails?.documents} />
                </div>
              </div>

              {/* {
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
                            } */}
            </div>
          </div>
        </div>
      )}

      {
        /* dashboardDataList.length === 0 &&  */ investorProfileLoading && (
          <div className="h-52 p-5 mt-3.5 box bg-white flex items-center justify-center">
            <LoadingIcon
              color="#800000"
              icon="three-dots"
              className="w-16 h-16"
            />
          </div>
        )
      }
    </>
  );
};

export default index;
