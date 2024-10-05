import { useEffect } from "react";
import _ from "lodash";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  CompanyDashboard,
  fetchCompanyDashboard,
  setPage,
} from "@/stores/dashboardSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AppDispatch } from "@/stores/store";
import { Helmet } from "react-helmet-async";
import { createDynamicURL } from "@/utils/helper";
import { baseURL } from "@/constant";
import InvestorCard from "@/components/InvestorCard";
import CaseStudiesCard from "@/components/CaseStudiesCard";
import AGMSummaryCard from "@/components/AGMSummaryCard";

function Main() {
  const location = useLocation();
  const dispatch: AppDispatch = useAppDispatch();

  const [searchParams] = useSearchParams();
  const ticker = searchParams.get("ticker") ?? "";
  const { dashboardDataList, loading, investorCardLoader, page, totalPages, } = useAppSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    if(ticker){
      dispatch(fetchCompanyDashboard(
        createDynamicURL(`${baseURL}/company-dashboard/?ticker=${ticker}&`, undefined,undefined, page)
      )
      );
    }
  }, [ticker, page]);


  const handleNextPage = () => {
    if (page < totalPages) {
      dispatch(setPage(page + 1));
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      dispatch(setPage(page - 1));
    }
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  return (
    <>
      <Helmet>
        <title>Investor Dashboard - ZMH Analytics</title>
      </Helmet>

    <div className="grid grid-cols-12 gap-y-10 gap-x-6">
      <div className="col-span-12 xl:col-span-12">
         <InvestorCard />
      </div>

      <div className="col-span-12 xl:col-span-12">
         <AGMSummaryCard />
      </div>

      <div className="col-span-12 xl:col-span-12">
          
      
        <CaseStudiesCard />
      </div>
    </div>
    </>
  );
}

export default Main;
