import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import { generateCompanyReport, clearReportData } from "@/stores/companyReportSlice";
import CompanyReport from "@/components/CompanyReport";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";

const CompanyReportPage = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const ticker = searchParams.get("ticker");

  const { reportData, loading, error } = useAppSelector(
    (state: RootState) => state.companyReport
  );

  useEffect(() => {
    if (ticker) {
      // Clear previous report data before fetching new one
      dispatch(clearReportData());
      dispatch(generateCompanyReport(ticker));
    }

    // Cleanup on unmount
    return () => {
      dispatch(clearReportData());
    };
  }, [ticker, dispatch]);

  // Update document title when report data is available
  useEffect(() => {
    if (reportData?.finnhub_data?.company_name) {
      document.title = `Company Report - ${reportData.finnhub_data.company_name}`;
    }
    return () => {
      document.title = 'ZMH Analytics';
    };
  }, [reportData]);

  if (!ticker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <Lucide icon="AlertTriangle" className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Ticker Specified
        </h2>
        <p className="text-gray-500 mb-4">
          Please provide a ticker symbol to generate the report.
        </p>
        <Button
          variant="primary"
          onClick={() => window.close()}
        >
          Close
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingIcon
          color="#800000"
          icon="three-dots"
          className="w-20 h-20"
        />
        <p className="mt-6 text-lg font-medium text-gray-700">
          Generating Report for {ticker}...
        </p>
        <p className="text-sm text-gray-400 mt-2">
          This may take a few moments
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lucide icon="AlertCircle" className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to Generate Report
        </h2>
        <p className="text-gray-500 mb-4 text-center max-w-md">
          {error}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline-primary"
            onClick={() => dispatch(generateCompanyReport(ticker))}
          >
            <Lucide icon="RefreshCw" className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.close()}
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Lucide icon="FileQuestion" className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Report Data
        </h2>
        <p className="text-gray-500">
          No data available for ticker: {ticker}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 bg-white min-h-screen">
      <CompanyReport data={reportData} />
    </div>
  );
};

export default CompanyReportPage;
