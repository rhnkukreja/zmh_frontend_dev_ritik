import LoadingWrapper from "@/components/LoadingWrapper";
import { getSingleEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

const DetailEngagementQuestion = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();

  const { getSingleQuestion, loading } = useAppSelector(
    (state) => state.engagementQuestions
  );

  useEffect(() => {
    dispatch(getSingleEngagementQuestions(Number(params.id!)));
  }, [params.id]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="flex flex-row  justify-between items-center pb-3 mb-2 border-b border-gray-200">
        <h1 className="text-xl font-semibold">Engagement Question Details</h1>
        {!loading && getSingleQuestion?.active === true ? (
          <div className=" items-center justify-start text-sm font-medium rounded-md text-success bg-success/10 border border-success/10 px-1.5 py-px mt-2 sm:mt-0">
            <span className="-mt-px">Active</span>
          </div>
        ) : (
          <div className=" items-center justify-start text-sm font-medium rounded-md text-danger bg-danger/10 border border-danger/10 px-1.5 py-px mt-2 sm:mt-0">
            <span className="-mt-px">Inactive</span>
          </div>
        )}
      </div>

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
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Company
              </h2>
              <p className="text-gray-500">{getSingleQuestion?.company_name}</p>
            </div>
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
                {dayjs(getSingleQuestion?.engagement_date).format(
                  "MMMM , YYYY"
                )}
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
  );
};

export default DetailEngagementQuestion;
