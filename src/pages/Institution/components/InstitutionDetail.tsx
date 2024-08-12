import { useEffect } from "react";
import { useParams } from "react-router-dom";
import LoadingWrapper from "@/components/LoadingWrapper";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { getSingleInstitution } from "@/stores/institutionSlice";
import { AppDispatch } from "@/stores/store";
import dayjs from "dayjs";

const DetailInstitution = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();

  const { singleInstitution, loading } = useAppSelector(
    (state) => state.institutions
  );

  useEffect(() => {
    dispatch(getSingleInstitution(Number(params.id!)));
  }, [params.id]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="flex flex-row justify-between items-center pb-3 mb-2 border-b border-gray-200">
        <h1 className="text-xl font-semibold">Institution Details</h1>

        {!loading && singleInstitution?.active === true ? (
          <div className="flex items-center justify-start text-sm font-medium rounded-md text-success bg-success/10 border border-success/10 px-1.5 py-px mt-2 sm:mt-0">
            <span className="-mt-px">Active</span>
          </div>
        ) : (
          <div className="flex items-center justify-start text-sm font-medium rounded-md text-danger bg-danger/10 border border-danger/10 px-1.5 py-px mt-2 sm:mt-0">
            <span className="-mt-px">In active</span>
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
                Institution Name
              </h2>
              <p className="text-gray-500">
                {singleInstitution?.institution || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Institution ID
              </h2>
              <p className="text-gray-500">
                {singleInstitution?.institution_id || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">Region</h2>
              <p className="text-gray-500">
                {singleInstitution?.region || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Investor Type
              </h2>
              <p className="text-gray-500">
                {singleInstitution?.investor_type || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Contact Person
              </h2>
              <p className="text-gray-500">
                {singleInstitution?.contact || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">Email</h2>
              <p className="text-gray-500">
                {singleInstitution?.email || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Uploaded Time
              </h2>
              <p className="text-gray-500">
                {dayjs(singleInstitution?.uploaded_time).format(
                  "MMMM DD, YYYY"
                ) || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="text-md font-medium text-gray-700 mb-1">Logo</h2>
            {singleInstitution?.logo_url &&
            singleInstitution?.logo_url !== "null" ? (
              <img
                src={singleInstitution?.logo_url}
                alt="Institution Logo"
                className="h-20 w-20 object-cover"
              />
            ) : (
              <p className="text-gray-500">No logo available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailInstitution;
