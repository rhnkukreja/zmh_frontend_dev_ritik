import { useEffect } from "react";
import { useParams } from "react-router-dom";
import LoadingWrapper from "@/components/LoadingWrapper";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { getSingleCompany } from "@/stores/companySlice";
import { AppDispatch } from "@/stores/store";
import dayjs from "dayjs";

const DetailCompany = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const params = useParams();

  const { singleCompany, loading } = useAppSelector((state) => state.company);

  useEffect(() => {
    dispatch(getSingleCompany(Number(params.id!)));
  }, [params.id]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center pb-3 mb-2 border-b border-gray-200">
        <h1 className="text-xl font-semibold">Company Details</h1>
        {/* You can add any status-related UI here if needed */}
      </div>

      {loading ? (
        <LoadingWrapper height={200} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Company ID
              </h2>
              <p className="text-gray-500">
                {singleCompany?.company_id || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">Symbol</h2>
              <p className="text-gray-500">{singleCompany?.symbol || "N/A"}</p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">Name</h2>
              <p className="text-gray-500">{singleCompany?.name || "N/A"}</p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Company V1
              </h2>
              <p className="text-gray-500">
                {singleCompany?.company_v1 || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Stock Exchange
              </h2>
              <p className="text-gray-500">
                {singleCompany?.stock_exchange || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                RBICS Economy
              </h2>
              <p className="text-gray-500">
                {singleCompany?.rbics_economy || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Closing Price
              </h2>
              <p className="text-gray-500">
                {singleCompany?.closing_price || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Market Value
              </h2>
              <p className="text-gray-500">
                {singleCompany?.market_value || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">Sales</h2>
              <p className="text-gray-500">{singleCompany?.sales || "N/A"}</p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Exchange Ticker
              </h2>
              <p className="text-gray-500">
                {singleCompany?.exchng_ticker || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Factset Industry
              </h2>
              <p className="text-gray-500">
                {singleCompany?.factset_ind || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                GICS Sector Name
              </h2>
              <p className="text-gray-500">
                {singleCompany?.gics_sector_name || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">
                Sector Name
              </h2>
              <p className="text-gray-500">
                {singleCompany?.sector_name || "N/A"}
              </p>
            </div>
            <div className="flex flex-col">
              <h2 className="text-md font-medium text-gray-700 mb-1">CUSIP</h2>
              <p className="text-gray-500">{singleCompany?.cusip || "N/A"}</p>
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="text-md font-medium text-gray-700 mb-1">
              Date Created
            </h2>
            <p className="text-gray-500">
              {dayjs(singleCompany?.date_created).format("MMMM DD, YYYY") ||
                "N/A"}
            </p>
          </div>

          <div className="flex flex-col">
            <h2 className="text-md font-medium text-gray-700 mb-1">
              Date Updated
            </h2>
            <p className="text-gray-500">
              {dayjs(singleCompany?.date_updated).format("MMMM DD, YYYY") ||
                "N/A"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailCompany;
