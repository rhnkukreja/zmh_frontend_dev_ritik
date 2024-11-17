import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import LoadingWrapper from "@/components/LoadingWrapper";
import { getSingleSingleCaseStudy } from "@/stores/caseStudySlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const DetailCaseStudies = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();
  const navigate = useNavigate();

  const { singleCaseStudy, loading } = useAppSelector(
    (state) => state.caseStudies
  );

  useEffect(() => {
    dispatch(getSingleSingleCaseStudy(Number(params.id!)));
  }, [params.id]);

  const backToPreviousPage = () => {
    navigate(`/case-studies`);
  };

  return (
    <>
      <Button
        onClick={backToPreviousPage}
        variant="primary"
        className="bg-theme-2 border-bg-theme-2 mb-4"
      >
        <ChevronLeft
          className="roup-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        Back
      </Button>
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <div className="flex flex-row  justify-between items-center pb-3 mb-2 border-b border-gray-200">
          <h1 className="text-xl font-semibold">Case Studies</h1>
        </div>

        {loading ? (
          <LoadingWrapper height={200} />
        ) : (
          <div className="space-y-4">
            <div className="space-y-4 border-b-2 pb-6">
              {singleCaseStudy?.institution_name && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Institution Name
                  </h3>
                  <p>{singleCaseStudy.institution_name}</p>
                </div>
              )}
              {singleCaseStudy?.esg_themes && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">Theme</h3>
                  <p>{singleCaseStudy.esg_themes}</p>
                </div>
              )}
              {singleCaseStudy?.industry && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Industry
                  </h3>
                  <p>{singleCaseStudy.industry}</p>
                </div>
              )}
            </div>

            <div className="space-y-4 border-b-2 pb-6">
              {singleCaseStudy?.company_name && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Company
                  </h3>
                  <p>{singleCaseStudy.company_name}</p>
                </div>
              )}
              {singleCaseStudy?.company_ticker && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Company Ticker
                  </h3>
                  <p>{singleCaseStudy.company_ticker}</p>
                </div>
              )}
              {singleCaseStudy?.company_sector && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Company Sector
                  </h3>
                  <p>{singleCaseStudy.company_sector}</p>
                </div>
              )}
              {singleCaseStudy?.year && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">Year</h3>
                  <p>{singleCaseStudy.year}</p>
                </div>
              )}
              {singleCaseStudy?.market && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Market
                  </h3>
                  <p>{singleCaseStudy.market}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {singleCaseStudy?.engagement_details && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Engagement/Voting Details
                  </h3>
                  <p>{singleCaseStudy.engagement_details}</p>
                </div>
              )}
              {singleCaseStudy?.proposal_type && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Proponent
                  </h3>
                  <p>{singleCaseStudy.proposal_type}</p>
                </div>
              )}
              {singleCaseStudy?.resolution_engagement_topic && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Resolution
                  </h3>
                  <p>{singleCaseStudy.resolution_engagement_topic}</p>
                </div>
              )}
              {singleCaseStudy?.vote && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">Vote</h3>
                  <p className="text-destructive">{singleCaseStudy.vote}</p>
                </div>
              )}
              {singleCaseStudy?.voting_rationale && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Rationale
                  </h3>
                  <p>{singleCaseStudy.voting_rationale}</p>
                </div>
              )}
              {singleCaseStudy?.voting_details && (
                <div className="flex flex-col sm:flex-row">
                  <h3 className="font-semibold min-w-[150px] sm:mr-8">
                    Details
                  </h3>
                  <p>{singleCaseStudy.voting_details}</p>
                </div>
              )}
            </div>

            <div>
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                {singleCaseStudy?.urls_def14 && (
                  <div>
                    <h3 className="font-semibold">Proxy Statement</h3>
                    <p className="mb-4">
                      <a
                        href={singleCaseStudy.urls_def14}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {singleCaseStudy.urls_def14}
                      </a>
                    </p>
                  </div>
                )}
                {singleCaseStudy?.urls_8k && (
                  <div>
                    <h3 className="font-semibold">Vote Report</h3>
                    <p className="mb-4">
                      <a
                        href={singleCaseStudy.urls_8k}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {singleCaseStudy.urls_8k}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DetailCaseStudies;
