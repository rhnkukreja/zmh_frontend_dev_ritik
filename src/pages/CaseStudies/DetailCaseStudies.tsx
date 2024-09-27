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
        type="button"
        variant="outline-secondary"
        className=" border-none sm:w-fit"
        onClick={backToPreviousPage}
      >
        <ChevronLeft
          className="roup-[.mode--light]:text-white text-white"
          size={18}
          strokeWidth={1.5}
        />
        <div className=" group-[.mode--light]:text-white">Back</div>
      </Button>
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <div className="flex flex-row  justify-between items-center pb-3 mb-2 border-b border-gray-200">
          <h1 className="text-xl font-semibold">Case Studies</h1>
          {loading === false && (
            <Button
              type="button"
              variant="outline-primary"
              className=" border-none sm:w-fit "
              onClick={() => {}}
            >
              {false ? (
                <Lucide
                  icon="Loader"
                  className={`w-4 h-4 mr-1.5 stroke-[1.3] group-[.mode--dark]:text-white ${
                    false ? "animate-spin" : ""
                  }`}
                />
              ) : (
                <Lucide
                  icon="Download"
                  className="w-4 h-4 mr-1.5 stroke-[1.3] group-[.mode--dark]:text-white "
                />
              )}

              <div className=" group-[.mode--dark]:text-white">
                Download PDF
              </div>
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingWrapper height={200} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 border-b-2  pb-6">
              <div>
                <h3 className="font-semibold">Institution Name</h3>
                <p>{singleCaseStudy?.institution_name}</p>
              </div>
              <div>
                <h3 className="font-semibold">Theme</h3>
                <p>{singleCaseStudy?.esg_themes}</p>
              </div>
              <div>
                <h3 className="font-semibold">Industry</h3>
                <p>{singleCaseStudy?.industry}</p>
              </div>
             
            </div>
            <div className="grid grid-cols-3 gap-4 border-b-2  pb-6">
              <div>
                <h3 className="font-semibold">Company</h3>
                <p>{singleCaseStudy?.company_name}</p>
              </div>
              <div>
                <h3 className="font-semibold">Company Ticker</h3>
                <p>{singleCaseStudy?.company_ticker}</p>
              </div>
              <div>
                <h3 className="font-semibold">Company Sector</h3>
                <p>{singleCaseStudy?.company_sector}</p>
              </div>
              <div>
                <h3 className="font-semibold">Year</h3>
                <p>{singleCaseStudy?.year}</p>
              </div>
              <div>
                <h3 className="font-semibold">Market</h3>
                <p>{singleCaseStudy?.market}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold ">Engagement/Voting Details</h3>
                <p className="mb-4">{singleCaseStudy?.engagement_details}</p>
              </div>

              <div className="flex flex-col">

                <div className="mt-2 flex gap-4 ">
                  <p className="font-semibold min-w-[100px]">Proponent</p>
                  <p>{singleCaseStudy?.proposal_type}</p>
                </div>

                <div className="mt-2 flex  gap-4">
                  <p className="font-semibold min-w-[100px]">Resolution</p>
                  <p className="text-muted-foreground">
                    {singleCaseStudy?.resolution_engagement_topic}
                  </p>
                </div>

                <div className="mt-2 flex  gap-4">
                  <p className="font-semibold min-w-[100px]">Vote</p>
                  <p className="text-destructive">{singleCaseStudy?.vote}</p>
                </div>

                <div className="mt-2 flex  gap-4">
                  <p className="font-semibold min-w-[100px]">Rationale</p>
                  <p className="text-muted-foreground">
                    {singleCaseStudy?.voting_rationale}
                  </p>
                </div>

                <div className="mt-2 flex  gap-4 ">
                  <p className="font-semibold min-w-[100px]">Details</p>
                  <p className="text-muted-foreground">{singleCaseStudy?.voting_details}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
               
                <div>
                  <h3 className="font-semibold">Proxy Statement</h3>
                  <p className="mb-4">
                    {singleCaseStudy?.urls_def14 ? (
                      <a
                        href={singleCaseStudy?.urls_def14}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {singleCaseStudy.urls_def14}
                      </a>
                    ) : (
                      null
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Vote Report</h3>
                  <p className="mb-4">
                    {singleCaseStudy?.urls_8k ? (
                      <a
                        href={singleCaseStudy.urls_8k}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        {singleCaseStudy.urls_8k}
                      </a>
                    ) : (
                      null
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DetailCaseStudies;
