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
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { SkeletonCard, SkeletonTable, SkeletonText } from "@/components/Base/Skeletons";
import Button from "@/components/Base/Button";
import { ChevronLeft } from "lucide-react";

const index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromTab = searchParams.get('from') || location.state?.from;
  const { handleBack } = useNavigationHistory();
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
            `${baseURL}/investor_profile_detail_page/?institution_id=${id}`
          )
        )
      );
    }
  }, [id, companyGlobalSearchName]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      {location.pathname !== "/" && (
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <Button
            onClick={() => {
              if (fromTab === 'ownership' || fromTab === '/') {
                navigate('/', { state: { activeTab: 'ownership' } });
              } else {
                handleBack();
              }
            }}
            className="flex items-center gap-2 text-slate-700 hover:text-primary hover:bg-slate-100 border border-slate-300 bg-white"
          >
            <ChevronLeft size={18} strokeWidth={2} />
            Back
          </Button>
        </div>
      )}

      {!investorProfileLoading && investorProfileDetails?.institution_name && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
              {investorProfileDetails?.institution_name}
            </h1>
            <p className="text-[15px] text-slate-600">Investor documents and contact information</p>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-6">
            <div className="w-full">
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
      )}

      {investorProfileLoading && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <SkeletonText lines={1} height="h-8" className="max-w-[420px] mb-3" />
            <SkeletonText lines={1} height="h-5" className="max-w-[320px]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <SkeletonTable rows={7} columns={4} cellHeight="h-10" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default index;
