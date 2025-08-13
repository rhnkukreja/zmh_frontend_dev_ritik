import Button from "@/components/Base/Button";
import LoadingWrapper from "@/components/LoadingWrapper";
import { getSingleEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import dayjs from "dayjs";
import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const DetailEngagementQuestion = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.authentiction);

  const { getSingleQuestion, loading } = useAppSelector(
    (state) => state.engagementQuestions
  );

  useEffect(() => {
    dispatch(getSingleEngagementQuestions(Number(params.id!)));
  }, [params.id]);

  const backToPreviousPage = () => {
    navigate(`/engagement-question`);
  };

  return (
    <>
      <div className="flex justify-between items-center xs:flex-col md:flex-row py-3"></div>
      <div className="p-5 mt-1 box">
        <div className="flex flex-col p-5 sm:flex-row gap-y-2">
          <div className="flex justify-between items-center gap-4 xs:flex-col md:flex-row">
            <span>
              <h1 className="text-lg font-bold flex items-center gap-2">
                Engagement Question Details
              </h1>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-3 gap-y-2 sm:ml-auto items-center">
            <Button
              onClick={backToPreviousPage}
              variant="primary"
              className="bg-theme-2 border-bg-theme-2"
            >
              <ChevronLeft
                className="roup-[.mode--light]:text-white text-white"
                size={18}
                strokeWidth={1.5}
              />
              Back
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 transition-all duration-300">

        {loading ? (
          <LoadingWrapper height={200} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <h2 className="text-md font-medium text-gray-700 mb-1">
                  Institution
                </h2>
                <p className="text-gray-500">
                  {getSingleQuestion?.institution_name}
                </p>
              </div>
              {user?.role === "admin" && (
                <div className="flex flex-col">
                  <h2 className="text-md font-medium text-gray-700 mb-1">
                    Company
                  </h2>
                  <p className="text-gray-500">
                    {getSingleQuestion?.company_name}
                  </p>
                </div>
              )}
              {/* <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Type of Engagement
              </h2>
              <p className="text-gray-500">
                {getSingleQuestion?.type_of_engagement}
              </p>
            </div> */}
              <div className="flex flex-col">
                <h2 className="text-md font-medium text-gray-700 mb-1">
                  Engagement Date
                </h2>

                <p className="text-gray-500">
                  {getSingleQuestion?.formatted_engagement_date}
                </p>
              </div>
              {/* <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">Source</h2>
              <p className="text-gray-500">{getSingleQuestion?.source}</p>
            </div> */}
              <div className="flex flex-col">
                <h2 className="text-md font-medium text-gray-700 mb-1">
                  Category
                </h2>
                <p className="text-gray-500">
                  {getSingleQuestion?.engagement_with_category}
                </p>
              </div>
            </div>

            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Engagement Question
              </h2>
              <p className="text-gray-500">
                {getSingleQuestion?.engagement_question}
              </p>
            </div>

            {getSingleQuestion?.other_comments && (
              <div className="flex flex-col">
                <h2 className="text-md font-medium text-gray-700 mb-1">
                  Other Comments
                </h2>
                <p className="text-gray-500">
                  {getSingleQuestion?.other_comments}
                </p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default DetailEngagementQuestion;
